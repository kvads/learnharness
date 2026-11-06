import * as fs from "node:fs";
import * as path from "node:path";
import { PATHS } from "../../config.ts";
import type { CurriculumPlan } from "../core/contracts.ts";
import type { CurriculumStore } from "../core/ports.ts";
import { writeFileAtomicSync } from "./atomic-write.ts";

const CURRICULUM_FILE = path.join(PATHS.curriculum, "plan.json");

export function createCurriculumStore(file = CURRICULUM_FILE): CurriculumStore {
	return {
		read() {
			try {
				return JSON.parse(fs.readFileSync(file, "utf8")) as CurriculumPlan;
			} catch {
				return null;
			}
		},
		write(plan) {
			fs.mkdirSync(path.dirname(file), { recursive: true });
			writeFileAtomicSync(file, `${JSON.stringify(plan, null, "\t")}\n`, { allowInPlaceFallback: true });
		},
	};
}

export const curriculumStore = createCurriculumStore();
