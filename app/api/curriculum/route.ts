import { createCurriculum, CurriculumError, curriculumSnapshot, deleteCurriculum, generateCurriculum, saveCurriculum } from "@/src/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	return Response.json(curriculumSnapshot(new URL(request.url).searchParams.get("id")));
}

export async function POST(request: Request) {
	const body = await request.json().catch(() => ({})) as { action?: unknown; description?: unknown };
	try {
		if (body.action === "generate") return Response.json(await generateCurriculum(body.description), { status: 201 });
		if (body.action === "create") return Response.json(createCurriculum(), { status: 201 });
		throw new CurriculumError("Неизвестное действие с учебной программой.");
	} catch (error) {
		if (error instanceof CurriculumError) return Response.json({ error: error.message }, { status: error.status });
		return Response.json({ error: `Codex не смог составить программу: ${error instanceof Error ? error.message : "неизвестная ошибка"}` }, { status: 502 });
	}
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

export async function DELETE(request: Request) {
	try {
		return Response.json(deleteCurriculum(new URL(request.url).searchParams.get("id")));
	} catch (error) {
		if (error instanceof CurriculumError) return Response.json({ error: error.message }, { status: error.status });
		return Response.json({ error: "Не удалось удалить учебную программу." }, { status: 500 });
	}
}
