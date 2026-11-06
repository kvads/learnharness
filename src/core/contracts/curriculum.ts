export type AssessmentFormat = "quiz" | "free-response" | "coding" | "project" | "mixed" | "custom";

export interface CurriculumLesson {
	id: string;
	title: string;
	objective: string;
	knowledgeNodeIds: string[];
}

export interface CurriculumAssessment {
	id: string;
	title: string;
	format: AssessmentFormat;
	customFormat: string;
	instructions: string;
}

export interface CurriculumModule {
	id: string;
	title: string;
	description: string;
	lessons: CurriculumLesson[];
	assessment: CurriculumAssessment;
}

export interface CurriculumPlan {
	version: 1;
	title: string;
	goal: string;
	createdAt: string;
	updatedAt: string;
	modules: CurriculumModule[];
	finalAssessment: CurriculumAssessment;
}

export interface CurriculumGraphTopic {
	id: string;
	name: string;
	statement: string;
}

export interface CurriculumSnapshot {
	plan: CurriculumPlan;
	graphTopics: CurriculumGraphTopic[];
}
