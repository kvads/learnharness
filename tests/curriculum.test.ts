import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { defaultCurriculum, sanitizeCurriculum } from "../src/server/curriculum.ts";
import { createCurriculumStore } from "../src/store/curriculum.ts";
import { designCurriculum } from "../src/agent/codex/curriculum-planner.ts";

describe("curriculum", () => {
	it("provides an end-to-end Python and CS path with a final assessment", () => {
		const plan = defaultCurriculum("2026-01-01T00:00:00.000Z");
		assert.equal(plan.modules.length, 7);
		assert.ok(plan.modules.some((module) => module.id === "capstone"));
		assert.equal(plan.finalAssessment.format, "mixed");
		assert.match(plan.finalAssessment.instructions, /fixture/);
	});

	it("sanitizes edits and preserves the original creation time", () => {
		const original = defaultCurriculum("2026-01-01T00:00:00.000Z");
		const edited = sanitizeCurriculum({ ...original, title: "  Новый маршрут  " }, original);
		assert.equal(edited.title, "Новый маршрут");
		assert.equal(edited.createdAt, original.createdAt);
		assert.notEqual(edited.updatedAt, original.updatedAt);
	});

	it("stores one local editable plan", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "lh-curriculum-"));
		const file = path.join(root, "plan.json");
		const store = createCurriculumStore(file);
		assert.equal(store.read("missing"), null);
		const plan = defaultCurriculum();
		store.write(plan);
		assert.deepEqual(store.read(plan.id), plan);
		assert.deepEqual(store.list(), [plan]);
	});

	it("stores several independent programs and deletes only the selected one", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "lh-curriculum-library-"));
		const store = createCurriculumStore(path.join(root, "programs.json"));
		const first = defaultCurriculum("2026-01-01T00:00:00.000Z", "program_first");
		const second = defaultCurriculum("2026-01-02T00:00:00.000Z", "program_second");
		store.write(first);
		store.write(second);
		assert.deepEqual(store.list().map((plan) => plan.id), ["program_first", "program_second"]);
		assert.equal(store.delete(first.id), true);
		assert.deepEqual(store.list().map((plan) => plan.id), ["program_second"]);
	});

	it("asks Codex for a structured macro curriculum", async () => {
		let prompt = "";
		const generated = await designCurriculum("Хочу изучить базы данных", async (request) => {
			prompt = request.prompt;
			return {
				finalResponse: JSON.stringify({
					title: "Базы данных",
					goal: "Проектировать и использовать базы данных",
					modules: [{ title: "Реляционная модель", description: "Основы", lessons: [{ title: "Таблицы", objective: "Спроектировать таблицу" }], assessment: { title: "Контроль", format: "project", customFormat: "", instructions: "Спроектировать схему" } }],
					finalAssessment: { title: "Итог", format: "mixed", customFormat: "", instructions: "Защитить проект" },
				}),
			} as never;
		});
		assert.equal(generated.title, "Базы данных");
		assert.match(prompt, /macro curriculum/);
		assert.match(prompt, /Хочу изучить базы данных/);
	});
});
