import { addCodeLabProject, CodeLabError, codeLabSnapshot, prepareCodeLabProject } from "@/src/server";

export async function POST(request: Request) {
	const body = await request.json().catch(() => ({})) as { path?: unknown; label?: unknown };
	try {
		const project = addCodeLabProject(body.path, body.label);
		await prepareCodeLabProject(project);
		return Response.json(codeLabSnapshot(), { status: 201 });
	} catch (error) {
		if (error instanceof CodeLabError) return Response.json({ error: error.message }, { status: error.status });
		return Response.json({ error: "Не удалось сохранить проект Code Lab." }, { status: 500 });
	}
}
