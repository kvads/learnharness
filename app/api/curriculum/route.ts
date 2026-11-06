import { CurriculumError, curriculumSnapshot, saveCurriculum } from "@/src/server";

export const dynamic = "force-dynamic";

export async function GET() {
	return Response.json(curriculumSnapshot());
}

export async function PUT(request: Request) {
	const body = await request.json().catch(() => null);
	try {
		return Response.json(saveCurriculum(body));
	} catch (error) {
		if (error instanceof CurriculumError) return Response.json({ error: error.message }, { status: error.status });
		return Response.json({ error: "Не удалось сохранить учебную программу." }, { status: 500 });
	}
}
