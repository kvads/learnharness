import { clampThinkingLevel, getSupportedThinkingLevels, type Api, type Model } from "@earendil-works/pi-ai";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";

import { CODEX_MODEL, CODEX_PROVIDER } from "../core/contracts/codex.ts";
import { piModels } from "../agent/models.ts";
import type { ChatSettings } from "../core/contracts/chat.ts";
import type { CatalogDefaults, CatalogProvider, ModelCatalogEntry, ModelCatalogResponse, RolePins, SlotPins } from "../core/contracts/models.ts";
import { BACKGROUND_MODEL_ROLES, MODEL_SLOTS, type BackgroundModelRole, type ModelsSettings } from "../core/settings.ts";
import type { EffectiveModelSpec, EffectiveSlot } from "../core/settings-resolution.ts";

function codexModel(): Model<Api> {
	const model = piModels().getModel(CODEX_PROVIDER, CODEX_MODEL);
	if (!model) throw new Error("Codex model is unavailable");
	return model;
}

export async function refreshConnectionCatalog(_provider?: string): Promise<void> {}

export type ModelDto = ModelCatalogEntry;

export function catalogDefaultsFor(strong: EffectiveSlot | null): CatalogDefaults | null {
	return {
		model: { provider: CODEX_PROVIDER, id: CODEX_MODEL },
		...(strong?.thinkingLevel !== undefined ? { thinkingLevel: strong.thinkingLevel } : {}),
	};
}

export function catalogDefaults(): CatalogDefaults {
	return catalogDefaultsFor(null)!;
}

export function rolePinsFor(models: Record<BackgroundModelRole, EffectiveModelSpec | undefined>): RolePins {
	const pins = {} as RolePins;
	for (const role of BACKGROUND_MODEL_ROLES) {
		pins[role] = {
			model: { provider: CODEX_PROVIDER, id: CODEX_MODEL },
			...(models[role]?.thinkingLevel !== undefined ? { thinkingLevel: models[role]!.thinkingLevel } : {}),
		};
	}
	return pins;
}

export function catalogRolePins(): RolePins {
	const specs = Object.fromEntries(BACKGROUND_MODEL_ROLES.map((role) => [role, { provider: CODEX_PROVIDER, id: CODEX_MODEL }])) as Record<BackgroundModelRole, EffectiveModelSpec>;
	return rolePinsFor(specs);
}

export function catalogSlots(): SlotPins {
	const pin = { model: { provider: CODEX_PROVIDER, id: CODEX_MODEL } };
	return { strong: pin, cheap: pin, vision: pin };
}

export function catalogProviders(): CatalogProvider[] {
	return [{ id: CODEX_PROVIDER, envVar: "", keyPresent: true }];
}

export function toModelDto(model: Model<Api>): ModelDto {
	return {
		id: model.id,
		name: model.name,
		provider: model.provider,
		reasoning: model.reasoning,
		input: [...model.input],
		supportedLevels: getSupportedThinkingLevels(model),
		cost: null,
		contextWindow: model.contextWindow,
		maxTokens: model.maxTokens,
	};
}

export function catalogContextLimits(): Map<string, number> {
	const model = codexModel();
	return new Map([[`${CODEX_PROVIDER}:${CODEX_MODEL}`, model.contextWindow]]);
}

export function modelCatalog(): ModelCatalogResponse {
	return {
		models: [toModelDto(codexModel())],
		defaults: catalogDefaults(),
		rolePins: catalogRolePins(),
		slots: catalogSlots(),
		providers: catalogProviders(),
	};
}

export type SettingsValidation = { ok: true } | { ok: false; error: string; supported?: ThinkingLevel[] };

function isCodex(model: { provider: string; id: string } | undefined): boolean {
	return !model || (model.provider === CODEX_PROVIDER && model.id === CODEX_MODEL);
}

export function validateChatSettings(settings: ChatSettings): SettingsValidation {
	return isCodex(settings.model) ? { ok: true } : { ok: false, error: "LearnHarness uses Codex only" };
}

export function validateModelsSettings(settings: ModelsSettings, _stored?: ModelsSettings): SettingsValidation {
	for (const slot of MODEL_SLOTS) {
		if (!isCodex(settings[slot]?.model)) return { ok: false, error: "LearnHarness uses Codex only" };
	}
	return { ok: true };
}

function clampLevel(level: ThinkingLevel): ThinkingLevel {
	return clampThinkingLevel(codexModel(), level);
}

export function clampModelsLevels(settings: ModelsSettings): ModelsSettings {
	const out: ModelsSettings = {};
	for (const name of MODEL_SLOTS) {
		const slot = settings[name];
		if (!slot) continue;
		out[name] = {
			...slot,
			model: { provider: CODEX_PROVIDER, id: CODEX_MODEL },
			...(slot.thinkingLevel !== undefined ? { thinkingLevel: clampLevel(slot.thinkingLevel) } : {}),
		};
	}
	return out;
}

export function clampChatLevel(settings: ChatSettings, _strong: EffectiveSlot | null): ChatSettings {
	return {
		model: { provider: CODEX_PROVIDER, id: CODEX_MODEL },
		...(settings.thinkingLevel !== undefined ? { thinkingLevel: clampLevel(settings.thinkingLevel) } : {}),
	};
}
