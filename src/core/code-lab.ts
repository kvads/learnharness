import type { CodeLabCheck, CodeLabCheckId } from "./contracts/code-lab.ts";

export const CODE_LAB_CHECKS: readonly CodeLabCheck[] = [
	{
		id: "python-syntax",
		label: "Синтаксис",
		description: "Проверяет синтаксис всех Python-модулей без запуска приложения.",
		command: "python -m compileall -q .",
	},
	{
		id: "pytest",
		label: "Тесты",
		description: "Запускает тесты проекта через pytest с кратким выводом.",
		command: "python -m pytest -q",
	},
	{
		id: "ruff",
		label: "Ruff",
		description: "Проверяет стиль и находит распространённые ошибки в коде.",
		command: "python -m ruff check .",
	},
	{
		id: "mypy",
		label: "Типы",
		description: "Проверяет типы с настройками mypy из проекта.",
		command: "python -m mypy .",
	},
] as const;

const CHECK_IDS = new Set<CodeLabCheckId>(CODE_LAB_CHECKS.map((check) => check.id));

export function isCodeLabCheckId(value: unknown): value is CodeLabCheckId {
	return typeof value === "string" && CHECK_IDS.has(value as CodeLabCheckId);
}
