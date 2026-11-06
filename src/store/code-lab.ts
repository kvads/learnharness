import * as fs from "node:fs";
import * as path from "node:path";
import { PATHS } from "../../config.ts";
import type { CodeLabStore } from "../core/ports.ts";
import type { CodeLabAttempt, CodeLabProject } from "../core/contracts.ts";
import { writeFileAtomicSync } from "./atomic-write.ts";

const PROJECTS_FILE = path.join(PATHS.codeLab, "projects.json");
const ATTEMPTS_FILE = path.join(PATHS.codeLab, "attempts.jsonl");

export function createCodeLabStore(root = PATHS.codeLab): CodeLabStore {
	const projectsFile = root === PATHS.codeLab ? PROJECTS_FILE : path.join(root, "projects.json");
	const attemptsFile = root === PATHS.codeLab ? ATTEMPTS_FILE : path.join(root, "attempts.jsonl");

	const listProjects = (): CodeLabProject[] => {
		try {
			const parsed: unknown = JSON.parse(fs.readFileSync(projectsFile, "utf8"));
			return Array.isArray(parsed) ? parsed as CodeLabProject[] : [];
		} catch {
			return [];
		}
	};

	return {
		listProjects,
		getProject(id) {
			return listProjects().find((project) => project.id === id) ?? null;
		},
		saveProject(project) {
			const projects = listProjects();
			const existing = projects.findIndex((candidate) => candidate.id === project.id);
			if (existing >= 0) projects[existing] = project;
			else projects.push(project);
			fs.mkdirSync(root, { recursive: true });
			writeFileAtomicSync(projectsFile, JSON.stringify(projects, null, "\t"), { allowInPlaceFallback: true });
		},
		listAttempts(limit = 50) {
			try {
				return fs.readFileSync(attemptsFile, "utf8")
					.split("\n")
					.filter(Boolean)
					.map((line) => JSON.parse(line) as CodeLabAttempt)
					.slice(-Math.max(0, limit))
					.reverse();
			} catch {
				return [];
			}
		},
		appendAttempt(attempt) {
			fs.mkdirSync(root, { recursive: true });
			fs.appendFileSync(attemptsFile, `${JSON.stringify(attempt)}\n`, { encoding: "utf8", mode: 0o600 });
		},
	};
}

export const codeLabStore = createCodeLabStore();
