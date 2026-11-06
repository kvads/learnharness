import { CodeLabError, runCodeLabCheck } from "@/src/server";

export async function POST(request: Request) {
	const body = await request.json().catch(() => ({})) as { projectId?: unknown; checkId?: unknown };
	try {
		return Response.json({ attempt: await runCodeLabCheck(body.projectId, body.checkId) }, { status: 201 });
	} catch (error) {
		if (error instanceof CodeLabError) return Response.json({ error: error.message }, { status: error.status });
		return Response.json({ error: "The Code Lab check could not be completed." }, { status: 500 });
	}
}
