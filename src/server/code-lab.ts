import * as fs from "node:fs";
import * as path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { CODE_LAB_CHECKS, isCodeLabCheckId } from "../core/code-lab.ts";
import type { CodeLabAttempt, CodeLabCheckId, CodeLabProject, CodeLabSnapshot } from "../core/contracts.ts";
import type { CodeLabStore } from "../core/ports.ts";
import { stores } from "./stores.ts";

const OUTPUT_LIMIT = 64 * 1024;
const RUN_TIMEOUT_MS = 30_000;
const runningProjects = new Set<string>();

export class CodeLabError extends Error {
	constructor(message: string, readonly status: number) {
		super(message);
	}
}

function defaultStore(): CodeLabStore {
	return stores.codeLabStore;
}

export function codeLabSnapshot(targetStore: CodeLabStore = defaultStore()): CodeLabSnapshot {
	return {
		projects: targetStore.listProjects(),
		checks: [...CODE_LAB_CHECKS],
		attempts: targetStore.listAttempts(),
	};
}

export function addCodeLabProject(rawPath: unknown, rawLabel?: unknown, targetStore: CodeLabStore = defaultStore()): CodeLabProject {
	if (typeof rawPath !== "string" || !rawPath.trim() || rawPath.length > 4096 || rawPath.includes("\0")) {
		throw new CodeLabError("Укажите абсолютный путь к папке проекта.", 400);
	}
	if (!path.isAbsolute(rawPath)) throw new CodeLabError("Путь к проекту должен быть абсолютным.", 400);
	let real: string;
	try {
		real = fs.realpathSync(rawPath);
		if (!fs.statSync(real).isDirectory()) throw new Error("not a directory");
	} catch {
		throw new CodeLabError("Папка проекта не существует или недоступна для чтения.", 400);
	}
	if (path.parse(real).root === real) throw new CodeLabError("Корень файловой системы нельзя подключить как проект Code Lab.", 400);
	const supplied = typeof rawLabel === "string" ? rawLabel.trim() : "";
	if (supplied.length > 80) throw new CodeLabError("Название проекта не должно превышать 80 символов.", 400);
	const project: CodeLabProject = {
		id: `lab_${createHash("sha256").update(real).digest("hex").slice(0, 16)}`,
		label: supplied || path.basename(real),
		path: real,
		createdAt: new Date().toISOString(),
	};
	const existing = targetStore.getProject(project.id);
	if (existing) return existing;
	targetStore.saveProject(project);
	return project;
}

type CheckCommand = { executable: string; args: string[]; display: string };

function pythonExecutable(projectPath: string): string {
	const local = process.platform === "win32"
		? [path.join(projectPath, ".venv", "Scripts", "python.exe"), path.join(projectPath, "venv", "Scripts", "python.exe")]
		: [path.join(projectPath, ".venv", "bin", "python"), path.join(projectPath, "venv", "bin", "python")];
	return local.find((candidate) => {
		try { return fs.statSync(candidate).isFile(); } catch { return false; }
	}) ?? (process.platform === "win32" ? "python" : "python3");
}

export function codeLabCommand(projectPath: string, checkId: CodeLabCheckId): CheckCommand {
	const executable = pythonExecutable(projectPath);
	const argsByCheck: Record<CodeLabCheckId, string[]> = {
		"python-syntax": ["-m", "compileall", "-q", "."],
		pytest: ["-m", "pytest", "-q"],
		ruff: ["-m", "ruff", "check", "."],
		mypy: ["-m", "mypy", "."],
	};
	const args = argsByCheck[checkId];
	return { executable, args, display: `python ${args.join(" ")}` };
}

function childEnvironment(): NodeJS.ProcessEnv {
	const allowed = ["PATH", "Path", "SYSTEMROOT", "WINDIR", "HOME", "USERPROFILE", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL"];
	const env = { NODE_ENV: process.env.NODE_ENV, NO_COLOR: "1", PYTHONUNBUFFERED: "1" } as NodeJS.ProcessEnv;
	for (const key of allowed) if (process.env[key] !== undefined) env[key] = process.env[key];
	return env;
}

export async function runCodeLabCheck(rawProjectId: unknown, rawCheckId: unknown, targetStore: CodeLabStore = defaultStore()): Promise<CodeLabAttempt> {
	if (typeof rawProjectId !== "string") throw new CodeLabError("Выберите проект Code Lab.", 400);
	if (!isCodeLabCheckId(rawCheckId)) throw new CodeLabError("Выберите доступную проверку Code Lab.", 400);
	const project = targetStore.getProject(rawProjectId);
	if (!project) throw new CodeLabError("Проект Code Lab больше не существует.", 404);
	if (runningProjects.has(project.id)) throw new CodeLabError("Для этого проекта уже выполняется проверка.", 409);

	const command = codeLabCommand(project.path, rawCheckId);
	const started = Date.now();
	runningProjects.add(project.id);
	try {
		const result = await new Promise<Pick<CodeLabAttempt, "status" | "exitCode" | "stdout" | "stderr" | "truncated">>((resolve) => {
			let stdout = "", stderr = "", captured = 0, truncated = false, settled = false, timedOut = false;
			const append = (target: "stdout" | "stderr", chunk: Buffer) => {
				const text = chunk.toString("utf8");
				const room = Math.max(0, OUTPUT_LIMIT - captured);
				const kept = text.slice(0, room);
				captured += Buffer.byteLength(kept);
				if (kept.length < text.length) truncated = true;
				if (target === "stdout") stdout += kept;
				else stderr += kept;
			};
			const child = spawn(command.executable, command.args, {
				cwd: project.path,
				env: childEnvironment(),
				stdio: ["ignore", "pipe", "pipe"],
				shell: false,
				windowsHide: true,
			});
			child.stdout.on("data", (chunk: Buffer) => append("stdout", chunk));
			child.stderr.on("data", (chunk: Buffer) => append("stderr", chunk));
			const timer = setTimeout(() => {
				timedOut = true;
				child.kill("SIGTERM");
				setTimeout(() => child.kill("SIGKILL"), 1_000).unref();
			}, RUN_TIMEOUT_MS);
			const finish = (status: CodeLabAttempt["status"], exitCode: number | null, extraError?: string) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				if (extraError) stderr += `${stderr ? "\n" : ""}${extraError}`;
				resolve({ status, exitCode, stdout, stderr, truncated });
			};
			child.on("error", (error) => finish("error", null, error.message));
			child.on("close", (code) => finish(timedOut ? "timed_out" : code === 0 ? "passed" : "failed", code));
		});
		const attempt: CodeLabAttempt = {
			id: `attempt_${randomUUID()}`,
			projectId: project.id,
			checkId: rawCheckId,
			command: command.display,
			startedAt: new Date(started).toISOString(),
			durationMs: Date.now() - started,
			...result,
		};
		targetStore.appendAttempt(attempt);
		return attempt;
	} finally {
		runningProjects.delete(project.id);
	}
}
