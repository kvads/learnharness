export async function GET(_request?: Request) {
	return Response.json({ error: "Provider removed; LearnHarness uses Codex" }, { status: 410 });
}
