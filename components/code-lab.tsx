"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2Icon, Clock3Icon, Code2Icon, FolderOpenIcon, PlayIcon, XCircleIcon } from "lucide-react";
import { SidebarToggle } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CodeLabAttempt, CodeLabCheckId, CodeLabSnapshot } from "@/src/core";
import { cn } from "@/lib/utils";

const empty: CodeLabSnapshot = { projects: [], checks: [], attempts: [] };

function attemptTone(status: CodeLabAttempt["status"]): string {
	if (status === "passed") return "text-emerald-400";
	if (status === "timed_out") return "text-amber-400";
	return "text-destructive";
}

function AttemptIcon({ status }: { status: CodeLabAttempt["status"] }) {
	if (status === "passed") return <CheckCircle2Icon className="size-4" aria-hidden="true" />;
	if (status === "timed_out") return <Clock3Icon className="size-4" aria-hidden="true" />;
	return <XCircleIcon className="size-4" aria-hidden="true" />;
}

export function CodeLab() {
	const [snapshot, setSnapshot] = useState<CodeLabSnapshot>(empty);
	const [selectedProjectId, setSelectedProjectId] = useState("");
	const [projectPath, setProjectPath] = useState("");
	const [projectLabel, setProjectLabel] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [running, setRunning] = useState<CodeLabCheckId | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		void fetch("/api/code-lab", { cache: "no-store" })
			.then(async (response) => {
				if (!response.ok) throw new Error();
				return response.json() as Promise<CodeLabSnapshot>;
			})
			.then((next) => {
				setSnapshot(next);
				setSelectedProjectId((current) => current || next.projects[0]?.id || "");
			})
			.catch(() => setError("Code Lab data could not be loaded."))
			.finally(() => setLoading(false));
	}, []);

	const selectedProject = snapshot.projects.find((project) => project.id === selectedProjectId);
	const attempts = useMemo(
		() => snapshot.attempts.filter((attempt) => !selectedProjectId || attempt.projectId === selectedProjectId),
		[snapshot.attempts, selectedProjectId],
	);

	const chooseFolder = async () => {
		const chosen = await window.lh?.chooseAttachmentFolder?.();
		if (chosen) setProjectPath(chosen.replace(/[\\/]$/, ""));
	};

	const addProject = async (event: FormEvent) => {
		event.preventDefault();
		if (!projectPath.trim() || saving) return;
		setSaving(true);
		setError(null);
		try {
			const response = await fetch("/api/code-lab/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: projectPath.trim(), label: projectLabel.trim() }),
			});
			const next = await response.json() as CodeLabSnapshot & { error?: string };
			if (!response.ok) throw new Error(next.error || "The project could not be added.");
			setSnapshot(next);
			const added = next.projects.find((project) => project.path === projectPath.trim()) ?? next.projects.at(-1);
			if (added) setSelectedProjectId(added.id);
			setProjectPath("");
			setProjectLabel("");
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "The project could not be added.");
		} finally {
			setSaving(false);
		}
	};

	const runCheck = async (checkId: CodeLabCheckId) => {
		if (!selectedProject || running) return;
		setRunning(checkId);
		setError(null);
		try {
			const response = await fetch("/api/code-lab/checks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ projectId: selectedProject.id, checkId }),
			});
			const result = await response.json() as { attempt?: CodeLabAttempt; error?: string };
			if (!response.ok || !result.attempt) throw new Error(result.error || "The check could not be completed.");
			setSnapshot((current) => ({ ...current, attempts: [result.attempt!, ...current.attempts] }));
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "The check could not be completed.");
		} finally {
			setRunning(null);
		}
	};

	return (
		<main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
			<div className="lh-drag absolute inset-x-0 top-0 h-13" aria-hidden="true" />
			<header className="lh-no-drag sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur">
				<SidebarToggle />
				<Code2Icon className="size-4 text-cyan-400" aria-hidden="true" />
				<div className="min-w-0">
					<h1 className="font-ui text-sm font-semibold text-foreground">Code Lab</h1>
					<p className="truncate text-xs text-muted-foreground">Run bounded checks and keep evidence from each attempt.</p>
				</div>
			</header>

			<div className="mx-auto grid w-full max-w-6xl gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)] lg:p-6">
				<section className="space-y-6" aria-labelledby="workspace-heading">
					<div className="rounded-xl border bg-card p-4 shadow-sm">
						<div className="mb-4 flex items-start justify-between gap-4">
							<div>
								<h2 id="workspace-heading" className="font-ui text-sm font-semibold text-foreground">Workspace</h2>
								<p className="mt-1 text-sm leading-6 text-muted-foreground">Connect a folder once. Checks always use predefined commands and never invoke a shell.</p>
							</div>
							{snapshot.projects.length > 0 && (
								<select
									aria-label="Active Code Lab project"
									value={selectedProjectId}
									onChange={(event) => setSelectedProjectId(event.target.value)}
									className="max-w-64 rounded-md border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									{snapshot.projects.map((project) => <option key={project.id} value={project.id}>{project.label}</option>)}
								</select>
							)}
						</div>

						<form onSubmit={addProject} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
							<label className="grid gap-1 text-xs text-muted-foreground">
								Project folder
								<div className="flex gap-2">
									<Input value={projectPath} onChange={(event) => setProjectPath(event.target.value)} placeholder="/absolute/path/to/project" aria-describedby="project-path-help" />
									{typeof window !== "undefined" && window.lh?.chooseAttachmentFolder && <Button type="button" variant="outline" size="icon" aria-label="Choose project folder" onClick={() => void chooseFolder()}><FolderOpenIcon className="size-4" /></Button>}
								</div>
							</label>
							<label className="grid gap-1 text-xs text-muted-foreground">
								Label <span className="sr-only">optional</span>
								<Input value={projectLabel} onChange={(event) => setProjectLabel(event.target.value)} placeholder="Optional" />
							</label>
							<Button type="submit" disabled={!projectPath.trim() || saving} className="self-end">{saving ? "Adding…" : "Add project"}</Button>
						</form>
						<p id="project-path-help" className="mt-3 text-xs leading-5 text-muted-foreground">Running tests executes code from the selected project as your local user. Review unfamiliar projects before running them.</p>
					</div>

					<div className="rounded-xl border bg-card p-4 shadow-sm">
						<h2 className="font-ui text-sm font-semibold text-foreground">Checks</h2>
						<p className="mt-1 text-sm text-muted-foreground">Start with syntax, then use the project tools that are installed in its Python environment.</p>
						<div className="mt-4 grid gap-3 sm:grid-cols-2">
							{snapshot.checks.map((check) => (
								<div key={check.id} className="flex min-h-32 flex-col rounded-lg border bg-background p-3">
									<div className="flex items-start justify-between gap-3">
										<div>
											<h3 className="text-sm font-medium text-foreground">{check.label}</h3>
											<p className="mt-1 text-xs leading-5 text-muted-foreground">{check.description}</p>
										</div>
										<Button size="sm" variant="outline" disabled={!selectedProject || running !== null} onClick={() => void runCheck(check.id)} aria-label={`Run ${check.label}`}>
											<PlayIcon className="size-3.5" /> {running === check.id ? "Running…" : "Run"}
										</Button>
									</div>
									<code className="mt-auto block truncate pt-3 font-mono text-[11px] text-muted-foreground">{check.command}</code>
								</div>
							))}
						</div>
						{loading && <p className="mt-4 text-sm text-muted-foreground" role="status">Loading Code Lab…</p>}
						{error && <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
					</div>
				</section>

				<section className="rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="attempts-heading">
					<div className="flex items-center justify-between gap-3">
						<div>
							<h2 id="attempts-heading" className="font-ui text-sm font-semibold text-foreground">Attempts</h2>
							<p className="mt-1 text-xs text-muted-foreground">Evidence stays local with the rest of your learning data.</p>
						</div>
						{selectedProject && <span className="max-w-44 truncate rounded-full border px-2.5 py-1 text-xs text-muted-foreground" title={selectedProject.path}>{selectedProject.label}</span>}
					</div>

					<div className="mt-4 space-y-3">
						{attempts.length === 0 && !loading && (
							<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Run a check to create the first piece of evidence.</div>
						)}
						{attempts.map((attempt) => (
							<article key={attempt.id} className="overflow-hidden rounded-lg border bg-background">
								<header className="flex items-center justify-between gap-3 border-b px-3 py-2">
									<div className={cn("flex items-center gap-2 text-xs font-medium", attemptTone(attempt.status))}>
										<AttemptIcon status={attempt.status} />
										<span className="capitalize">{attempt.status.replace("_", " ")}</span>
									</div>
									<span className="text-[11px] tabular-nums text-muted-foreground">{(attempt.durationMs / 1000).toFixed(2)}s</span>
								</header>
								<div className="p-3">
									<code className="block break-all font-mono text-[11px] text-muted-foreground">{attempt.command}</code>
									{(attempt.stdout || attempt.stderr) && (
										<pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-black/40 p-3 font-mono text-xs leading-5 text-foreground" tabIndex={0}>{attempt.stdout}{attempt.stdout && attempt.stderr ? "\n" : ""}{attempt.stderr}{attempt.truncated ? "\n… output truncated" : ""}</pre>
									)}
								</div>
							</article>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
