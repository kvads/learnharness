import { createProvider, type Api, type Model, type Provider, type SimpleStreamOptions, type StreamFunction } from "@earendil-works/pi-ai";

import { CODEX_API, CODEX_MODEL, CODEX_PROVIDER } from "./constants.ts";

export const CODEX_MODELS: readonly Model<Api>[] = [{
	id: CODEX_MODEL,
	name: "Codex",
	api: CODEX_API,
	provider: CODEX_PROVIDER,
	baseUrl: "",
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	reasoning: true,
	thinkingLevelMap: { off: "low", minimal: "minimal", low: "low", medium: "medium", high: "high", xhigh: "xhigh", max: "max" },
	contextWindow: 200_000,
	maxTokens: 32_000,
}];

export function createCodexProvider(streamSimple: StreamFunction<Api, SimpleStreamOptions>): Provider {
	return createProvider({
		id: CODEX_PROVIDER,
		name: "Codex",
		auth: { apiKey: { name: "Codex app session", resolve: async () => ({ auth: {}, source: "Codex app session" }) } },
		models: CODEX_MODELS,
		api: { stream: streamSimple, streamSimple },
	});
}

