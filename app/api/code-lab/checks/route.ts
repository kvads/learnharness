import { CodeLabError, runCodeLabCheck } from "@/src/server";

export async function POST(request: Request) {
	const body = await request.json().catch(() => ({})) as { projectId?: unknown; checkId?: unknown };
	try {
		return Response.json({ attempt: await runCodeLabCheck(body.projectId, body.checkId) }, { status: 201 });
	} catch (error) {
		if (error instanceof CodeLabError) return Response.json({ error: error.message }, { status: error.status });
		return Response.json({ error: "Не удалось выполнить проверку Code Lab." }, { status: 500 });
	}
}
