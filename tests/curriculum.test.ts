import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { defaultCurriculum, sanitizeCurriculum } from "../src/server/curriculum.ts";
import { createCurriculumStore } from "../src/store/curriculum.ts";

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
		assert.equal(store.read(), null);
		const plan = defaultCurriculum();
		store.write(plan);
		assert.deepEqual(store.read(), plan);
	});
});
