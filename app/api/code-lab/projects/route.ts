import { addCodeLabProject, CodeLabError, codeLabSnapshot } from "@/src/server";

export async function POST(request: Request) {
	const body = await request.json().catch(() => ({})) as { path?: unknown; label?: unknown };
	try {
		addCodeLabProject(body.path, body.label);
		return Response.json(codeLabSnapshot(), { status: 201 });
	} catch (error) {
		if (error instanceof CodeLabError) return Response.json({ error: error.message }, { status: error.status });
		return Response.json({ error: "The Code Lab project could not be saved." }, { status: 500 });
	}
}
