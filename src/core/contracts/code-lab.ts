/** Browser-safe contracts for the local Code Lab workspace. */

export type CodeLabCheckId = "python-syntax" | "pytest" | "ruff" | "mypy";
export type CodeLabAttemptStatus = "passed" | "failed" | "timed_out" | "error";

export interface CodeLabProject {
	id: string;
	label: string;
	path: string;
	createdAt: string;
}

export interface CodeLabCheck {
	id: CodeLabCheckId;
	label: string;
	description: string;
	command: string;
}

export interface CodeLabAttempt {
	id: string;
	projectId: string;
	checkId: CodeLabCheckId;
	command: string;
	startedAt: string;
	durationMs: number;
	status: CodeLabAttemptStatus;
	exitCode: number | null;
	stdout: string;
	stderr: string;
	truncated: boolean;
}

export interface CodeLabSnapshot {
	projects: CodeLabProject[];
	checks: CodeLabCheck[];
	attempts: CodeLabAttempt[];
}
