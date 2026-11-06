import * as fs from "node:fs";
import * as path from "node:path";
import { PATHS } from "../../config.ts";
import type { CurriculumPlan } from "../core/contracts.ts";
import type { CurriculumStore } from "../core/ports.ts";
import { writeFileAtomicSync } from "./atomic-write.ts";

const LIBRARY_FILE = path.join(PATHS.curriculum, "programs.json");
const LEGACY_FILE = path.join(PATHS.curriculum, "plan.json");

interface CurriculumLibraryFile {
	version: 1;
	programs: CurriculumPlan[];
}

export function createCurriculumStore(file = LIBRARY_FILE, legacyFile = file === LIBRARY_FILE ? LEGACY_FILE : `${file}.legacy`): CurriculumStore {
	const readLibrary = (): CurriculumLibraryFile => {
		try {
			const value = JSON.parse(fs.readFileSync(file, "utf8")) as CurriculumLibraryFile;
			return value?.version === 1 && Array.isArray(value.programs) ? value : { version: 1, programs: [] };
		} catch {
			try {
				const legacy = JSON.parse(fs.readFileSync(legacyFile, "utf8")) as CurriculumPlan;
				if (legacy && typeof legacy === "object" && !legacy.id) legacy.id = "program_legacy";
				return legacy && typeof legacy === "object" ? { version: 1, programs: [legacy] } : { version: 1, programs: [] };
			} catch {
				return { version: 1, programs: [] };
			}
		}
	};
	const writeLibrary = (library: CurriculumLibraryFile) => {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		writeFileAtomicSync(file, `${JSON.stringify(library, null, "\t")}\n`, { allowInPlaceFallback: true });
	};
	return {
		list() {
			return readLibrary().programs;
		},
		read(id) {
			return readLibrary().programs.find((program) => program.id === id) ?? null;
		},
		write(plan) {
			const library = readLibrary();
			const existing = library.programs.findIndex((program) => program.id === plan.id);
			if (existing >= 0) library.programs[existing] = plan;
			else library.programs.push(plan);
			writeLibrary(library);
		},
		delete(id) {
			const library = readLibrary();
			const next = library.programs.filter((program) => program.id !== id);
			if (next.length === library.programs.length) return false;
			writeLibrary({ version: 1, programs: next });
			return true;
		},
	};
}

export const curriculumStore = createCurriculumStore();
