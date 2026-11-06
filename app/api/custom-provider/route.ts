export const dynamic = "force-dynamic";

function removed(_request?: Request) {
	return Response.json({ error: "Custom providers were removed; LearnHarness uses Codex" }, { status: 410 });
}

async function removedMutation(_request?: Request) {
	return removed();
}

export const GET = removed;
export const POST = removedMutation;
export const PATCH = removedMutation;
export const DELETE = removedMutation;
