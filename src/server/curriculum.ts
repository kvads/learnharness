import { randomUUID } from "node:crypto";
import type {
	AssessmentFormat,
	CurriculumAssessment,
	CurriculumLesson,
	CurriculumModule,
	CurriculumPlan,
	CurriculumSnapshot,
} from "../core/contracts.ts";
import { stores } from "./stores.ts";

const formats = new Set<AssessmentFormat>(["quiz", "free-response", "coding", "project", "mixed", "custom"]);

export class CurriculumError extends Error {
	constructor(message: string, readonly status = 400) {
		super(message);
	}
}

function assessment(id: string, title: string, format: AssessmentFormat, instructions: string): CurriculumAssessment {
	return { id, title, format, customFormat: "", instructions };
}

function lesson(id: string, title: string, objective: string): CurriculumLesson {
	return { id, title, objective, knowledgeNodeIds: [] };
}

function module(
	id: string,
	title: string,
	description: string,
	lessons: CurriculumLesson[],
	format: AssessmentFormat,
): CurriculumModule {
	return {
		id,
		title,
		description,
		lessons,
		assessment: assessment(`${id}-check`, `Контроль: ${title}`, format, "Проверь понимание ключевых идей модуля и попроси объяснить ход решения."),
	};
}

export function defaultCurriculum(now = new Date().toISOString()): CurriculumPlan {
	return {
		version: 1,
		title: "Python и Computer Science: от основ до проекта",
		goal: "Научиться уверенно читать, проектировать, проверять и улучшать реальный код, понимая фундаментальные идеи computer science.",
		createdAt: now,
		updatedAt: now,
		modules: [
			module("environment", "Среда разработки и чтение кода", "Как устроен проект и как безопасно в нём работать.", [
				lesson("environment-structure", "Структура проекта", "Находить точки входа, зависимости, конфигурацию и тесты."),
				lesson("environment-git", "Git и история изменений", "Делать небольшие проверяемые изменения и понимать diff."),
				lesson("environment-debug", "Диагностика", "Читать traceback, воспроизводить ошибку и проверять гипотезу."),
			], "free-response"),
			module("python", "Python: фундамент", "Синтаксис, модель данных и ясные функции.", [
				lesson("python-values", "Типы и значения", "Понимать изменяемость, области видимости и преобразования типов."),
				lesson("python-control", "Управление выполнением", "Применять условия, циклы, исключения и ранний возврат."),
				lesson("python-functions", "Функции и контракты", "Проектировать сигнатуры, инварианты и понятные границы ответственности."),
			], "coding"),
			module("data", "Структуры данных и алгоритмы", "Выбор представления данных и оценка стоимости операций.", [
				lesson("data-collections", "Коллекции", "Выбирать list, tuple, dict и set по требуемым операциям."),
				lesson("data-complexity", "Сложность", "Оценивать время и память через Big O на практических примерах."),
				lesson("data-algorithms", "Базовые алгоритмы", "Реализовывать поиск, сортировку, обход и агрегацию."),
			], "mixed"),
			module("design", "Проектирование программ", "От функций к объектам, модулям и устойчивой архитектуре.", [
				lesson("design-oop", "Объекты и протоколы", "Применять композицию, классы и структурную типизацию осознанно."),
				lesson("design-boundaries", "Границы модулей", "Разделять доменную логику, ввод-вывод и инфраструктуру."),
				lesson("design-patterns", "Паттерны без догм", "Распознавать повторяющиеся решения и цену абстракций."),
			], "project"),
			module("quality", "Тестирование и качество", "Автоматическая проверка поведения, стиля и типов.", [
				lesson("quality-pytest", "pytest", "Писать тесты нормальных, граничных и ошибочных сценариев."),
				lesson("quality-types", "Типы и mypy", "Использовать типы как исполняемую документацию границ."),
				lesson("quality-ruff", "Ruff и рефакторинг", "Устранять дефекты небольшими изменениями с быстрой обратной связью."),
			], "coding"),
			module("systems", "Данные, сеть и параллелизм", "Как программа взаимодействует с файлами, базами и внешним миром.", [
				lesson("systems-files", "Файлы и форматы", "Безопасно читать и валидировать JSON, CSV и текстовые данные."),
				lesson("systems-http", "HTTP и API", "Понимать запросы, ответы, ошибки и границы доверия."),
				lesson("systems-concurrency", "Параллелизм и async", "Отличать конкурентность от параллелизма и избегать гонок."),
			], "mixed"),
			module("capstone", "Текущий проект: итоговая работа", "Применение всего маршрута к настоящей кодовой базе.", [
				lesson("capstone-map", "Карта архитектуры", "Объяснить основные компоненты проекта и потоки данных."),
				lesson("capstone-feature", "Самостоятельная функция", "Спроектировать, реализовать и проверить законченное улучшение."),
				lesson("capstone-review", "Защита решения", "Обосновать компромиссы, риски, тесты и дальнейшие улучшения."),
			], "project"),
		],
		finalAssessment: assessment(
			"final-assessment",
			"Итоговая аттестация",
			"mixed",
			"Составь комплексную проверку: объяснение понятий, разбор незнакомого кода, практическая задача и защита решения. Для задач обработки данных заранее дай готовый fixture-файл или полный блок входных данных.",
		),
	};
}

function text(value: unknown, field: string, max: number, allowEmpty = false): string {
	if (typeof value !== "string") throw new CurriculumError(`Поле «${field}» должно быть текстом.`);
	const result = value.trim();
	if (!allowEmpty && !result) throw new CurriculumError(`Заполните поле «${field}».`);
	if (result.length > max) throw new CurriculumError(`Поле «${field}» слишком длинное.`);
	return result;
}

function id(value: unknown): string {
	return typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : `item_${randomUUID()}`;
}

function sanitizeAssessment(value: unknown, fallbackTitle: string): CurriculumAssessment {
	if (!value || typeof value !== "object") throw new CurriculumError(`Добавьте проверку для «${fallbackTitle}».`);
	const raw = value as Record<string, unknown>;
	const format = formats.has(raw.format as AssessmentFormat) ? raw.format as AssessmentFormat : "free-response";
	return {
		id: id(raw.id),
		title: text(raw.title ?? fallbackTitle, "название проверки", 140),
		format,
		customFormat: text(raw.customFormat ?? "", "свой формат", 160, true),
		instructions: text(raw.instructions ?? "", "условия проверки", 3000, true),
	};
}

export function sanitizeCurriculum(value: unknown, previous?: CurriculumPlan | null, touchUpdatedAt = true): CurriculumPlan {
	if (!value || typeof value !== "object") throw new CurriculumError("Учебная программа имеет неверный формат.");
	const raw = value as Record<string, unknown>;
	if (!Array.isArray(raw.modules) || raw.modules.length > 40) throw new CurriculumError("Программа может содержать не более 40 модулей.");
	const modules = raw.modules.map((entry, moduleIndex): CurriculumModule => {
		if (!entry || typeof entry !== "object") throw new CurriculumError(`Модуль ${moduleIndex + 1} имеет неверный формат.`);
		const moduleRaw = entry as Record<string, unknown>;
		if (!Array.isArray(moduleRaw.lessons) || moduleRaw.lessons.length > 100) throw new CurriculumError("В одном модуле может быть не более 100 уроков.");
		const moduleTitle = text(moduleRaw.title, `модуль ${moduleIndex + 1}`, 160);
		return {
			id: id(moduleRaw.id),
			title: moduleTitle,
			description: text(moduleRaw.description ?? "", "описание модуля", 1000, true),
			lessons: moduleRaw.lessons.map((entry, lessonIndex) => {
				if (!entry || typeof entry !== "object") throw new CurriculumError(`Урок ${lessonIndex + 1} имеет неверный формат.`);
				const lessonRaw = entry as Record<string, unknown>;
				return {
					id: id(lessonRaw.id),
					title: text(lessonRaw.title, `урок ${lessonIndex + 1}`, 160),
					objective: text(lessonRaw.objective ?? "", "цель урока", 1000, true),
					knowledgeNodeIds: Array.isArray(lessonRaw.knowledgeNodeIds)
						? lessonRaw.knowledgeNodeIds.filter((nodeId): nodeId is string => typeof nodeId === "string").slice(0, 100)
						: [],
				};
			}),
			assessment: sanitizeAssessment(moduleRaw.assessment, `Контроль: ${moduleTitle}`),
		};
	});
	const now = new Date().toISOString();
	return {
		version: 1,
		title: text(raw.title, "название программы", 200),
		goal: text(raw.goal, "цель программы", 2000),
		createdAt: previous?.createdAt ?? (typeof raw.createdAt === "string" ? raw.createdAt : now),
		updatedAt: touchUpdatedAt ? now : (typeof raw.updatedAt === "string" ? raw.updatedAt : now),
		modules,
		finalAssessment: sanitizeAssessment(raw.finalAssessment, "Итоговая аттестация"),
	};
}

export function curriculumSnapshot(): CurriculumSnapshot {
	const stored = stores.curriculumStore.read();
	let plan: CurriculumPlan;
	try {
		plan = stored ? sanitizeCurriculum(stored, stored, false) : defaultCurriculum();
	} catch {
		plan = defaultCurriculum();
	}
	if (!stored) stores.curriculumStore.write(plan);
	const topics = new Map(stores.graphStore.readNodes().map((node) => [node.id, { id: node.id, name: node.name, statement: node.statement }]));
	return { plan, graphTopics: [...topics.values()] };
}

export function saveCurriculum(value: unknown): CurriculumSnapshot {
	const current = stores.curriculumStore.read();
	const plan = sanitizeCurriculum(value, current);
	stores.curriculumStore.write(plan);
	return curriculumSnapshot();
}
