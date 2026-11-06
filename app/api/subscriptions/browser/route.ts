export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function removed(_request?: Request) {
	return Response.json({ error: "External subscriptions were removed; LearnHarness uses Codex" }, { status: 410 });
}

export const GET = removed;
export const POST = removed;
