import type { CodeLabCheck, CodeLabCheckId } from "./contracts/code-lab.ts";

export const CODE_LAB_CHECKS: readonly CodeLabCheck[] = [
	{
		id: "python-syntax",
		label: "Syntax",
		description: "Compile every Python module without running the application.",
		command: "python -m compileall -q .",
	},
	{
		id: "pytest",
		label: "Tests",
		description: "Run the project's pytest suite with concise output.",
		command: "python -m pytest -q",
	},
	{
		id: "ruff",
		label: "Ruff",
		description: "Check style and common correctness problems.",
		command: "python -m ruff check .",
	},
	{
		id: "mypy",
		label: "Types",
		description: "Run static type checks with the project's mypy configuration.",
		command: "python -m mypy .",
	},
] as const;

const CHECK_IDS = new Set<CodeLabCheckId>(CODE_LAB_CHECKS.map((check) => check.id));

export function isCodeLabCheckId(value: unknown): value is CodeLabCheckId {
	return typeof value === "string" && CHECK_IDS.has(value as CodeLabCheckId);
}
