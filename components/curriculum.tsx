"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
	BookOpenCheckIcon,
	CheckCircle2Icon,
	ChevronDownIcon,
	Code2Icon,
	FileQuestionIcon,
	GraduationCapIcon,
	ListPlusIcon,
	PlayIcon,
	PlusIcon,
	SaveIcon,
	Trash2Icon,
} from "lucide-react";
import { SidebarToggle } from "@/components/sidebar";
import { SessionStarter } from "@/components/start-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
	AssessmentFormat,
	CurriculumAssessment,
	CurriculumGraphTopic,
	CurriculumLesson,
	CurriculumModule,
	CurriculumPlan,
	CurriculumSnapshot,
} from "@/src/core";
import { cn } from "@/lib/utils";

const formatLabels: Record<AssessmentFormat, string> = {
	quiz: "Тест с вариантами",
	"free-response": "Свободный ответ",
	coding: "Задача с кодом",
	project: "Мини-проект и защита",
	mixed: "Смешанный формат",
	custom: "Свой формат",
};

const starter = new SessionStarter();

function newAssessment(title: string): CurriculumAssessment {
	return { id: `assessment_${crypto.randomUUID()}`, title, format: "free-response", customFormat: "", instructions: "" };
}

function newLesson(): CurriculumLesson {
	return { id: `lesson_${crypto.randomUUID()}`, title: "Новый урок", objective: "", knowledgeNodeIds: [] };
}

function newModule(): CurriculumModule {
	const id = `module_${crypto.randomUUID()}`;
	return { id, title: "Новый модуль", description: "", lessons: [newLesson()], assessment: newAssessment("Контроль модуля") };
}

function assessmentFormat(assessment: CurriculumAssessment): string {
	return assessment.format === "custom" ? assessment.customFormat.trim() || "свой формат" : formatLabels[assessment.format];
}

function AssessmentEditor({ value, onChange, onStart, busy, final = false }: {
	value: CurriculumAssessment;
	onChange: (value: CurriculumAssessment) => void;
	onStart: () => void;
	busy: boolean;
	final?: boolean;
}) {
	return (
		<section className={cn("rounded-xl border p-4", final ? "border-cyan-500/30 bg-cyan-500/5" : "bg-background")} aria-labelledby={`${value.id}-heading`}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						{final ? <GraduationCapIcon className="size-4 text-cyan-400" aria-hidden="true" /> : <FileQuestionIcon className="size-4 text-amber-400" aria-hidden="true" />}
						<h3 id={`${value.id}-heading`} className="font-ui text-sm font-semibold text-foreground">{final ? "Итоговая аттестация" : "Контроль модуля"}</h3>
					</div>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">Формат можно менять перед каждым запуском — он не связан с отметкой «изучено».</p>
				</div>
				<Button type="button" size="sm" onClick={onStart} disabled={busy} aria-busy={busy}>
					<PlayIcon className="size-3.5" aria-hidden="true" /> {busy ? "Создаём…" : "Начать проверку"}
				</Button>
			</div>
			<div className="mt-4 grid gap-3 sm:grid-cols-2">
				<label className="grid gap-1.5 text-xs text-muted-foreground">
					Название
					<Input value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} />
				</label>
				<label className="grid gap-1.5 text-xs text-muted-foreground">
					Формат
					<div className="relative">
						<select value={value.format} onChange={(event) => onChange({ ...value, format: event.target.value as AssessmentFormat })} className="h-9 w-full appearance-none rounded-md border bg-background px-3 pr-9 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
							{Object.entries(formatLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
						</select>
						<ChevronDownIcon className="pointer-events-none absolute right-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
					</div>
				</label>
			</div>
			{value.format === "custom" && (
				<label className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
					Опишите свой формат
					<Input value={value.customFormat} onChange={(event) => onChange({ ...value, customFormat: event.target.value })} placeholder="Например: устный разбор с демонстрацией экрана" />
				</label>
			)}
			<label className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
				Условия и акценты
				<Textarea value={value.instructions} onChange={(event) => onChange({ ...value, instructions: event.target.value })} placeholder="Что именно проверить, сколько вопросов, какие ограничения учесть…" className="min-h-24" />
			</label>
		</section>
	);
}

export function Curriculum() {
	const router = useRouter();
	const [plan, setPlan] = useState<CurriculumPlan | null>(null);
	const [topics, setTopics] = useState<CurriculumGraphTopic[]>([]);
	const [selectedId, setSelectedId] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [launching, setLaunching] = useState("");
	const [dirty, setDirty] = useState(false);
	const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

	useEffect(() => {
		void fetch("/api/curriculum", { cache: "no-store" })
			.then(async (response) => {
				if (!response.ok) throw new Error();
				return response.json() as Promise<CurriculumSnapshot>;
			})
			.then((snapshot) => {
				setPlan(snapshot.plan);
				setTopics(snapshot.graphTopics);
				setSelectedId(snapshot.plan.modules[0]?.id ?? "");
			})
			.catch(() => setMessage({ tone: "error", text: "Не удалось загрузить учебную программу. Обновите страницу и попробуйте снова." }))
			.finally(() => setLoading(false));
	}, []);

	const selected = plan?.modules.find((module) => module.id === selectedId) ?? null;
	const lessonCount = useMemo(() => plan?.modules.reduce((sum, module) => sum + module.lessons.length, 0) ?? 0, [plan]);

	const changePlan = (update: (current: CurriculumPlan) => CurriculumPlan) => {
		setPlan((current) => current ? update(current) : current);
		setDirty(true);
		setMessage(null);
	};

	const changeModule = (moduleId: string, update: (module: CurriculumModule) => CurriculumModule) => {
		changePlan((current) => ({ ...current, modules: current.modules.map((module) => module.id === moduleId ? update(module) : module) }));
	};

	const save = async () => {
		if (!plan || saving) return;
		setSaving(true);
		setMessage(null);
		try {
			const response = await fetch("/api/curriculum", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) });
			const result = await response.json() as CurriculumSnapshot & { error?: string };
			if (!response.ok) throw new Error(result.error || "Не удалось сохранить программу.");
			setPlan(result.plan);
			setTopics(result.graphTopics);
			setDirty(false);
			setMessage({ tone: "ok", text: "Программа сохранена локально." });
		} catch (error) {
			setMessage({ tone: "error", text: error instanceof Error ? error.message : "Не удалось сохранить программу." });
		} finally {
			setSaving(false);
		}
	};

	const addModule = () => {
		const created = newModule();
		changePlan((current) => ({ ...current, modules: [...current.modules, created] }));
		setSelectedId(created.id);
	};

	const importGraph = () => {
		if (topics.length === 0) {
			setMessage({ tone: "error", text: "Граф знаний пока пуст. Проведите урок или импортируйте заметки, затем повторите." });
			return;
		}
		const used = new Set(plan?.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.knowledgeNodeIds)) ?? []);
		const fresh = topics.filter((topic) => !used.has(topic.id));
		if (fresh.length === 0) {
			setMessage({ tone: "ok", text: "Все темы из графа уже добавлены в программу." });
			return;
		}
		const created: CurriculumModule = {
			id: `graph_${crypto.randomUUID()}`,
			title: "Темы из текущего графа знаний",
			description: "Темы собраны из учебных сессий. Их порядок и формулировки можно изменить.",
			lessons: fresh.map((topic) => ({ id: `graph_lesson_${crypto.randomUUID()}`, title: topic.name, objective: topic.statement, knowledgeNodeIds: [topic.id] })),
			assessment: newAssessment("Контроль по темам графа"),
		};
		changePlan((current) => ({ ...current, modules: [...current.modules, created] }));
		setSelectedId(created.id);
		setMessage({ tone: "ok", text: `Добавлено тем из графа: ${fresh.length}.` });
	};

	const launch = async (key: string, prompt: string, mode?: "practice", knowledgeNodeIds: string[] = []) => {
		if (launching) return;
		setLaunching(key);
		setMessage(null);
		try {
			const picks = knowledgeNodeIds.map((nodeId) => topics.find((topic) => topic.id === nodeId)).filter((topic): topic is CurriculumGraphTopic => topic !== undefined);
			const target = await starter.start(
				{ title: prompt, ...(mode ? { kind: mode } : {}), ...(picks.length > 0 ? { graphContext: { propositions: picks } } : {}) },
				fetch,
				`curriculum:${key}`,
			);
			router.push(target);
		} catch {
			setMessage({ tone: "error", text: "Не удалось создать учебную сессию. Попробуйте ещё раз." });
			setLaunching("");
		}
	};

	const launchLesson = (module: CurriculumModule, lesson: CurriculumLesson) => launch(
		lesson.id,
		`Проведи полноценный урок «${lesson.title}» в рамках модуля «${module.title}». Цель урока: ${lesson.objective || "сформировать практическое понимание темы"}. Сначала кратко определи исходный уровень вопросами, затем объясни материал, дай примеры и практику. Если практика требует обработки данных, заранее предоставь готовый fixture-файл или полный блок входных данных — ученик должен реализовать алгоритм, а не вручную составлять заготовки.`,
		undefined,
		lesson.knowledgeNodeIds,
	);

	const launchAssessment = (assessment: CurriculumAssessment, scope: string, knowledgeNodeIds: string[]) => launch(
		assessment.id,
		`Проведи контрольное тестирование по теме «${scope}». Формат: ${assessmentFormat(assessment)}. ${assessment.instructions || "Проверь понимание, применение и способность объяснить решение."} Не подсказывай ответ до попытки ученика. Для любой задачи обработки данных заранее дай готовый fixture-файл или полный блок входных данных. В конце дай разбор сильных сторон, пробелов и следующий шаг.`,
		"practice",
		knowledgeNodeIds,
	);

	if (loading || !plan) {
		return <main className="flex min-w-0 flex-1 items-center justify-center bg-background text-sm text-muted-foreground" aria-busy="true">Загружаем учебную программу…</main>;
	}

	return (
		<main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
			<div className="lh-drag absolute inset-x-0 top-0 h-13" aria-hidden="true" />
			<header className="lh-no-drag sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur">
				<SidebarToggle />
				<BookOpenCheckIcon className="size-4 text-cyan-400" aria-hidden="true" />
				<div className="min-w-0 flex-1">
					<h1 className="font-ui text-sm font-semibold text-foreground">Учебная программа</h1>
					<p className="truncate text-xs text-muted-foreground">Маршрут от основ до итоговой аттестации — независимо от статуса знаний в графе.</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={importGraph}><ListPlusIcon className="size-3.5" aria-hidden="true" /> Темы из графа</Button>
				<Button type="button" size="sm" onClick={() => void save()} disabled={!dirty || saving} aria-busy={saving}><SaveIcon className="size-3.5" aria-hidden="true" /> {saving ? "Сохраняем…" : dirty ? "Сохранить" : "Сохранено"}</Button>
			</header>

			<div className="mx-auto w-full max-w-7xl p-4 lg:p-6">
				<section className="rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="program-heading">
					<h2 id="program-heading" className="sr-only">Параметры учебной программы</h2>
					<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)]">
						<div className="grid gap-3">
							<label className="grid gap-1.5 text-xs text-muted-foreground">Название программы<Input value={plan.title} onChange={(event) => changePlan((current) => ({ ...current, title: event.target.value }))} className="text-base font-semibold" /></label>
							<label className="grid gap-1.5 text-xs text-muted-foreground">Главная цель<Textarea value={plan.goal} onChange={(event) => changePlan((current) => ({ ...current, goal: event.target.value }))} className="min-h-20" /></label>
						</div>
						<div className="grid grid-cols-2 gap-3 self-start">
							<div className="rounded-lg border bg-background p-3"><span className="text-2xl font-semibold tabular-nums text-foreground">{plan.modules.length}</span><p className="mt-1 text-xs text-muted-foreground">модулей</p></div>
							<div className="rounded-lg border bg-background p-3"><span className="text-2xl font-semibold tabular-nums text-foreground">{lessonCount}</span><p className="mt-1 text-xs text-muted-foreground">уроков</p></div>
							<div className="col-span-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs leading-5 text-muted-foreground"><CheckCircle2Icon className="mr-1.5 inline size-3.5 text-cyan-400" aria-hidden="true" />Программа описывает порядок обучения. Прогресс и «изученность» здесь намеренно не оцениваются.</div>
						</div>
					</div>
				</section>

				{message && <div className={cn("mt-4 rounded-lg border px-3 py-2 text-sm", message.tone === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300")} role={message.tone === "error" ? "alert" : "status"}>{message.text}</div>}

				<div className="mt-6 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
					<nav className="self-start rounded-xl border bg-card p-3 shadow-sm lg:sticky lg:top-20" aria-label="Модули программы">
						<div className="flex items-center justify-between gap-3 px-1 pb-2">
							<h2 className="font-ui text-sm font-semibold text-foreground">Маршрут</h2>
							<Button type="button" variant="ghost" size="icon" onClick={addModule} aria-label="Добавить модуль"><PlusIcon className="size-4" /></Button>
						</div>
						<ol className="space-y-1">
							{plan.modules.map((module, index) => (
								<li key={module.id}>
									<button type="button" onClick={() => setSelectedId(module.id)} aria-current={selectedId === module.id ? "step" : undefined} className={cn("flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selectedId === module.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}>
										<span className="mt-0.5 text-xs tabular-nums opacity-70">{String(index + 1).padStart(2, "0")}</span>
										<span className="min-w-0"><span className="block text-sm font-medium leading-5">{module.title}</span><span className="mt-0.5 block text-[11px]">{module.lessons.length} уроков</span></span>
									</button>
								</li>
							))}
						</ol>
						<Button type="button" variant="outline" className="mt-3 w-full" onClick={addModule}><PlusIcon className="size-3.5" aria-hidden="true" /> Добавить модуль</Button>
					</nav>

					<div className="min-w-0 space-y-6">
						{selected ? (
							<section className="rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="selected-module-heading">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="min-w-0 flex-1 space-y-3">
										<label className="grid gap-1.5 text-xs text-muted-foreground">Название модуля<Input id="selected-module-heading" value={selected.title} onChange={(event) => changeModule(selected.id, (module) => ({ ...module, title: event.target.value }))} className="text-base font-semibold" /></label>
										<label className="grid gap-1.5 text-xs text-muted-foreground">Зачем он нужен<Textarea value={selected.description} onChange={(event) => changeModule(selected.id, (module) => ({ ...module, description: event.target.value }))} className="min-h-16" /></label>
									</div>
									<Button type="button" variant="ghost" size="icon" aria-label={`Удалить модуль «${selected.title}»`} onClick={() => {
										const next = plan.modules.filter((module) => module.id !== selected.id);
										changePlan((current) => ({ ...current, modules: next }));
										setSelectedId(next[0]?.id ?? "");
									}}><Trash2Icon className="size-4 text-destructive" /></Button>
								</div>

								<div className="mt-6 flex items-center justify-between gap-3">
									<div><h3 className="font-ui text-sm font-semibold text-foreground">Уроки</h3><p className="mt-1 text-xs text-muted-foreground">Каждый урок запускается как отдельная сессия с преподавателем.</p></div>
									<Button type="button" variant="outline" size="sm" onClick={() => changeModule(selected.id, (module) => ({ ...module, lessons: [...module.lessons, newLesson()] }))}><PlusIcon className="size-3.5" aria-hidden="true" /> Добавить урок</Button>
								</div>
								<div className="mt-3 space-y-3">
									{selected.lessons.map((lesson, index) => (
										<article key={lesson.id} className="rounded-xl border bg-background p-3">
											<div className="flex items-center justify-between gap-3">
												<span className="text-xs font-medium tabular-nums text-muted-foreground">Урок {index + 1}</span>
												<div className="flex gap-2">
													<Button type="button" size="sm" variant="outline" onClick={() => void launchLesson(selected, lesson)} disabled={Boolean(launching)} aria-busy={launching === lesson.id}><PlayIcon className="size-3.5" aria-hidden="true" /> {launching === lesson.id ? "Создаём…" : "Начать урок"}</Button>
													<Button type="button" size="icon" variant="ghost" aria-label={`Удалить урок «${lesson.title}»`} onClick={() => changeModule(selected.id, (module) => ({ ...module, lessons: module.lessons.filter((item) => item.id !== lesson.id) }))}><Trash2Icon className="size-4 text-muted-foreground" /></Button>
												</div>
											</div>
											<div className="mt-3 grid gap-3 sm:grid-cols-2">
												<label className="grid gap-1.5 text-xs text-muted-foreground">Тема<Input value={lesson.title} onChange={(event) => changeModule(selected.id, (module) => ({ ...module, lessons: module.lessons.map((item) => item.id === lesson.id ? { ...item, title: event.target.value } : item) }))} /></label>
												<label className="grid gap-1.5 text-xs text-muted-foreground">Результат урока<Input value={lesson.objective} onChange={(event) => changeModule(selected.id, (module) => ({ ...module, lessons: module.lessons.map((item) => item.id === lesson.id ? { ...item, objective: event.target.value } : item) }))} /></label>
											</div>
											{lesson.knowledgeNodeIds.length > 0 && <p className="mt-2 text-[11px] text-cyan-300">Связано с графом: {lesson.knowledgeNodeIds.length}</p>}
										</article>
									))}
								</div>

								<div className="mt-6">
									<AssessmentEditor value={selected.assessment} onChange={(assessment) => changeModule(selected.id, (module) => ({ ...module, assessment }))} onStart={() => void launchAssessment(selected.assessment, selected.title, selected.lessons.flatMap((lesson) => lesson.knowledgeNodeIds))} busy={launching === selected.assessment.id} />
								</div>
							</section>
						) : (
							<div className="rounded-xl border border-dashed bg-card p-10 text-center"><Code2Icon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" /><h2 className="mt-3 text-sm font-semibold text-foreground">Добавьте первый модуль</h2><p className="mt-1 text-sm text-muted-foreground">Или импортируйте темы из текущего графа знаний.</p><Button type="button" className="mt-4" onClick={addModule}><PlusIcon className="size-4" aria-hidden="true" /> Добавить модуль</Button></div>
						)}

						<AssessmentEditor value={plan.finalAssessment} onChange={(finalAssessment) => changePlan((current) => ({ ...current, finalAssessment }))} onStart={() => void launchAssessment(plan.finalAssessment, plan.title, plan.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.knowledgeNodeIds)))} busy={launching === plan.finalAssessment.id} final />
					</div>
				</div>
			</div>
		</main>
	);
}
