import {
	clampThinkingLevel,
	createModels,
	getSupportedThinkingLevels,
	type Api,
	type CacheRetention,
	type Model,
	type StreamFunction,
} from "@earendil-works/pi-ai";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import type { ModelRole } from "../../config.ts";
import packageMetadata from "../../package.json" with { type: "json" };
import { DEFAULT_THINKING_ORDER } from "../core/settings.ts";
import type { ChatGPTDispatchLifecycle } from "./chatgpt-request-cycle.ts";
import { CODEX_MODEL, CODEX_PROVIDER } from "./codex/constants.ts";
import { createCodexProvider } from "./codex/provider.ts";
import { streamCodex } from "./codex/stream.ts";

export const APP_IDENTITY = Object.freeze({
	userAgent: Object.freeze({ custom: `learnharness/${packageMetadata.version}` }),
	attribution: Object.freeze({ name: packageMetadata.name, url: packageMetadata.homepage }),
});

export interface PiEngine {
	model: Model<Api>;
	streamFn: StreamFunction;
	level?: ThinkingLevel;
}

export type { ThinkingLevel };

export interface ResolvedModelSpec {
	provider: string;
	id: string;
	thinkingLevel?: ThinkingLevel;
}

let collection: ReturnType<typeof createModels> | undefined;

/** Compatibility no-op while old settings records are migrated away. */
export function configureProviderSource(_source?: {
	sync(models: ReturnType<typeof createModels>): void;
	isCustom(id: string): boolean;
}): void {}

/** The sole runtime model collection. Codex owns authentication and inference. */
export function piModels() {
	if (!collection) {
		collection = createModels({ identity: APP_IDENTITY });
		collection.setProvider(createCodexProvider(streamCodex));
	}
	return collection;
}

/** Kept for older callers; Codex uses the desktop session, never an API key. */
export function openRouterApiKey(): undefined {
	return undefined;
}

function defaultThinkingLevel(model: Model<Api>): ThinkingLevel {
	const supported = getSupportedThinkingLevels(model);
	for (const level of DEFAULT_THINKING_ORDER) if (supported.includes(level)) return level;
	return supported[0] ?? "low";
}

export function piEngineForSpec(
	spec: ResolvedModelSpec,
	_background: boolean | (() => boolean) = true,
	_lifecycle?: ChatGPTDispatchLifecycle,
	_cacheRetention?: () => CacheRetention | undefined,
): PiEngine {
	const model = piModels().getModel(CODEX_PROVIDER, CODEX_MODEL);
	if (!model) throw new Error("Codex model is unavailable");
	const level = spec.thinkingLevel ? clampThinkingLevel(model, spec.thinkingLevel) : defaultThinkingLevel(model);
	return {
		model,
		level,
		streamFn: (requestModel, context, options) => streamCodex(requestModel, context, {
			...options,
			reasoning: level === "off" ? "low" : level,
		}),
	};
}

export function piEngineFor(_role: ModelRole): PiEngine {
	return piEngineForSpec({ provider: CODEX_PROVIDER, id: CODEX_MODEL });
}
