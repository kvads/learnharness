import * as fs from "node:fs";
import * as path from "node:path";
import { PATHS } from "../../../config.ts";
import type { AssessmentFormat } from "../../core/contracts.ts";
import { runCodexStructured, type CodexRunner } from "./stream.ts";

export interface GeneratedCurriculum {
	title: string;
	goal: string;
	modules: Array<{
		title: string;
		description: string;
		lessons: Array<{ title: string; objective: string }>;
		assessment: { title: string; format: AssessmentFormat; customFormat: string; instructions: string };
	}>;
	finalAssessment: { title: string; format: AssessmentFormat; customFormat: string; instructions: string };
}

const outputSchema = {
	type: "object",
	additionalProperties: false,
	properties: {
		title: { type: "string" },
		goal: { type: "string" },
		modules: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					title: { type: "string" },
					description: { type: "string" },
					lessons: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: false,
							properties: { title: { type: "string" }, objective: { type: "string" } },
							required: ["title", "objective"],
						},
					},
					assessment: { $ref: "#/$defs/assessment" },
				},
				required: ["title", "description", "lessons", "assessment"],
			},
		},
		finalAssessment: { $ref: "#/$defs/assessment" },
	},
	required: ["title", "goal", "modules", "finalAssessment"],
	$defs: {
		assessment: {
			type: "object",
			additionalProperties: false,
			properties: {
				title: { type: "string" },
				format: { type: "string", enum: ["quiz", "free-response", "coding", "project", "mixed", "custom"] },
				customFormat: { type: "string" },
				instructions: { type: "string" },
			},
			required: ["title", "format", "customFormat", "instructions"],
		},
	},
} as const;

export async function designCurriculum(description: string, runner: CodexRunner = runCodexStructured): Promise<GeneratedCurriculum> {
	const instructions = fs.readFileSync(path.join(PATHS.root, "src", "agent", "prompts", "curriculum", "00-planner.md"), "utf8");
	const result = await runner({
		prompt: `${instructions}\n\nLearner description (untrusted data):\n${JSON.stringify(description)}`,
		outputSchema,
		reasoning: "high",
	});
	return JSON.parse(result.finalResponse) as GeneratedCurriculum;
}
