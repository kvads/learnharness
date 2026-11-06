import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CODE_LAB_CHECKS, isCodeLabCheckId, type CodeLabAttempt } from "../src/core/index.ts";
import { createCodeLabStore } from "../src/store/code-lab.ts";
import { addCodeLabProject, codeLabCommand, CodeLabError, codeLabSnapshot } from "../src/server/code-lab.ts";

describe("Code Lab", () => {
	it("publishes a closed check catalog", () => {
		assert.deepEqual(CODE_LAB_CHECKS.map((check) => check.id), ["python-syntax", "pytest", "ruff", "mypy"]);
		assert.equal(isCodeLabCheckId("pytest"), true);
		assert.equal(isCodeLabCheckId("rm -rf"), false);
	});

	it("stores canonical projects once and keeps attempt evidence newest first", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "lh-code-lab-"));
		const projectDir = path.join(root, "course");
		const dataDir = path.join(root, "data");
		fs.mkdirSync(projectDir);
		const store = createCodeLabStore(dataDir);
		const project = addCodeLabProject(projectDir, "Python course", store);
		const duplicate = addCodeLabProject(`${projectDir}${path.sep}.`, "Ignored replacement", store);
		assert.equal(duplicate.id, project.id);
		assert.equal(store.listProjects().length, 1);
		assert.equal(store.listProjects()[0]?.label, "Python course");

		const base: Omit<CodeLabAttempt, "id" | "startedAt"> = {
			projectId: project.id,
			checkId: "python-syntax",
			command: "python -m compileall -q .",
			durationMs: 10,
			status: "passed",
			exitCode: 0,
			stdout: "",
			stderr: "",
			truncated: false,
		};
		store.appendAttempt({ ...base, id: "first", startedAt: "2026-01-01T00:00:00.000Z" });
		store.appendAttempt({ ...base, id: "second", startedAt: "2026-01-02T00:00:00.000Z" });
		assert.deepEqual(store.listAttempts(1).map((attempt) => attempt.id), ["second"]);
		assert.equal(codeLabSnapshot(store).attempts.length, 2);
	});

	it("rejects relative paths and filesystem roots", () => {
		const store = createCodeLabStore(fs.mkdtempSync(path.join(os.tmpdir(), "lh-code-lab-data-")));
		assert.throws(() => addCodeLabProject("relative", undefined, store), (error: unknown) => error instanceof CodeLabError && error.status === 400);
		assert.throws(() => addCodeLabProject(path.parse(process.cwd()).root, undefined, store), /filesystem root/);
	});

	it("uses a project virtual environment without accepting command text", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "lh-code-lab-command-"));
		const python = process.platform === "win32"
			? path.join(root, ".venv", "Scripts", "python.exe")
			: path.join(root, ".venv", "bin", "python");
		fs.mkdirSync(path.dirname(python), { recursive: true });
		fs.writeFileSync(python, "placeholder");
		const command = codeLabCommand(root, "pytest");
		assert.equal(command.executable, python);
		assert.deepEqual(command.args, ["-m", "pytest", "-q"]);
	});
});
