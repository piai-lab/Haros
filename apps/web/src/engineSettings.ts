// FILE: engineSettings.ts
// Purpose: Project authoritative ServerSettings engine fields for Web consumers.
// Layer: Credential-blind Web presentation helpers

import type {
  EngineKind,
  EngineStartOptions,
  ServerSettingsPatch,
  ServerSettingsView,
} from "@harnessos/contracts";
import { DEFAULT_SERVER_SETTINGS_VIEW } from "@harnessos/contracts";
import { engineStartOptionsFromServerSettings } from "@harnessos/shared/serverSettings";
import {
  getDefaultModel,
  getModelOptions,
  normalizeModelSlug,
  resolveSelectableModel,
} from "@harnessos/shared/model";
import { normalizeCursorModelVariantBaseId } from "./cursorModelVariants";
import { formatEngineModelOptionName, type EngineModelOption } from "./engineModelOptions";

const MAX_CUSTOM_MODEL_COUNT = 32;
export const MAX_CUSTOM_MODEL_LENGTH = 256;

type CustomModelEngine = Exclude<EngineKind, "oa">;

export type EngineCustomModelConfig = {
  readonly engine: CustomModelEngine;
  readonly title: string;
  readonly description: string;
  readonly placeholder: string;
  readonly example: string;
};

const BUILT_IN_MODEL_SLUGS_BY_PROVIDER: Record<EngineKind, ReadonlySet<string>> = {
  oa: new Set(getModelOptions("oa").map((option) => option.slug)),
  codex: new Set(getModelOptions("codex").map((option) => option.slug)),
  claude: new Set(getModelOptions("claude").map((option) => option.slug)),
  cursor: new Set(getModelOptions("cursor").map((option) => option.slug)),
  antigravity: new Set(getModelOptions("antigravity").map((option) => option.slug)),
  grok: new Set(getModelOptions("grok").map((option) => option.slug)),
  droid: new Set(getModelOptions("droid").map((option) => option.slug)),
  kilo: new Set(getModelOptions("kilo").map((option) => option.slug)),
  opencode: new Set(getModelOptions("opencode").map((option) => option.slug)),
  pi: new Set(getModelOptions("pi").map((option) => option.slug)),
};

export const MODEL_PROVIDER_SETTINGS: readonly EngineCustomModelConfig[] = [
  {
    engine: "codex",
    title: "Codex",
    description: "Save additional Codex model slugs for the picker and `/model` command.",
    placeholder: "your-codex-model-slug",
    example: "gpt-6.7-codex-ultra-preview",
  },
  {
    engine: "claude",
    title: "Claude",
    description: "Save additional Claude model slugs for the picker and `/model` command.",
    placeholder: "your-claude-model-slug",
    example: "claude-custom-model",
  },
  {
    engine: "cursor",
    title: "Cursor",
    description: "Save additional Cursor model slugs for the picker and engine runtime.",
    placeholder: "cursor-model-slug",
    example: "composer-2",
  },
  {
    engine: "antigravity",
    title: "Antigravity",
    description: "Save additional Antigravity CLI base model names for the picker.",
    placeholder: "Model Name",
    example: "Gemini 4 Pro",
  },
  {
    engine: "grok",
    title: "Grok",
    description: "Save additional Grok model slugs for the picker and `/model` command.",
    placeholder: "your-grok-model-slug",
    example: "grok-4.6",
  },
  {
    engine: "droid",
    title: "Droid",
    description: "Save additional Droid model slugs for the picker and engine runtime.",
    placeholder: "your-droid-model-slug",
    example: "claude-opus-4-8",
  },
  {
    engine: "kilo",
    title: "Kilo",
    description: "Save additional Kilo model slugs for the picker and engine runtime.",
    placeholder: "engine/model",
    example: "kilo/kilo-auto/free",
  },
  {
    engine: "opencode",
    title: "OpenCode",
    description: "Save additional OpenCode model slugs for the picker and engine runtime.",
    placeholder: "engine/model",
    example: "openai/gpt-5",
  },
  {
    engine: "pi",
    title: "Pi",
    description: "Save additional Pi model slugs for the picker and engine runtime.",
    placeholder: "engine/model",
    example: "anthropic/claude-sonnet-4-5",
  },
];

export const CUSTOM_MODEL_EDITOR_PROVIDER_SETTINGS = MODEL_PROVIDER_SETTINGS.filter(
  (config) => config.engine !== "pi" && config.engine !== "droid",
);

export interface AppModelOption extends EngineModelOption {
  engine: EngineKind;
  isCustom: boolean;
}

export function isGitTextGenerationSettingsDirty(
  settings: ServerSettingsView,
  defaults: ServerSettingsView,
): boolean {
  return (
    settings.textGenerationEngineSelection.engine !==
      defaults.textGenerationEngineSelection.engine ||
    settings.textGenerationEngineSelection.model !== defaults.textGenerationEngineSelection.model
  );
}

export function normalizeCustomModelSlugs(
  models: Iterable<string | null | undefined>,
  engine: EngineKind = "codex",
): string[] {
  const normalizedModels: string[] = [];
  const seen = new Set<string>();
  for (const candidate of models) {
    const normalized = normalizeModelSlug(candidate, engine);
    if (
      !normalized ||
      normalized.length > MAX_CUSTOM_MODEL_LENGTH ||
      BUILT_IN_MODEL_SLUGS_BY_PROVIDER[engine].has(normalized) ||
      seen.has(normalized)
    )
      continue;
    seen.add(normalized);
    normalizedModels.push(normalized);
    if (normalizedModels.length >= MAX_CUSTOM_MODEL_COUNT) break;
  }
  return normalizedModels;
}

export function getCustomModelsForEngine(
  settings: ServerSettingsView,
  engine: CustomModelEngine,
): readonly string[] {
  return settings.engines[engine].customModels;
}

export function getDefaultCustomModelsForEngine(engine: CustomModelEngine): readonly string[] {
  return DEFAULT_SERVER_SETTINGS_VIEW.engines[engine].customModels;
}

export function patchCustomModels(
  engine: CustomModelEngine,
  models: readonly string[],
): ServerSettingsPatch {
  return { engines: { [engine]: { customModels: [...models] } } };
}

export function getCustomModelsByEngine(
  settings: ServerSettingsView,
): Record<EngineKind, readonly string[]> {
  return {
    oa: [],
    codex: settings.engines.codex?.customModels ?? [],
    claude: settings.engines.claude?.customModels ?? [],
    cursor: settings.engines.cursor?.customModels ?? [],
    antigravity: settings.engines.antigravity?.customModels ?? [],
    grok: settings.engines.grok?.customModels ?? [],
    droid: settings.engines.droid?.customModels ?? [],
    kilo: settings.engines.kilo?.customModels ?? [],
    opencode: settings.engines.opencode?.customModels ?? [],
    pi: settings.engines.pi?.customModels ?? [],
  };
}

export function getAppModelOptions(
  engine: EngineKind,
  customModels: readonly string[],
  selectedModel?: string | null,
): AppModelOption[] {
  const options: AppModelOption[] = getModelOptions(engine).map(({ slug, name }) => ({
    engine,
    slug,
    name,
    isCustom: false,
  }));
  const seen = new Set(options.map((option) => option.slug));
  const trimmedSelectedModel = selectedModel?.trim().toLowerCase();
  for (const slug of normalizeCustomModelSlugs(customModels, engine)) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    options.push({
      engine,
      slug,
      name: formatEngineModelOptionName({ engine, slug }),
      isCustom: true,
    });
  }
  const normalizedSelectedModel =
    engine === "cursor"
      ? normalizeCursorModelVariantBaseId(selectedModel)
      : normalizeModelSlug(selectedModel, engine);
  const matchesExistingName =
    typeof trimmedSelectedModel === "string" &&
    options.some((option) => option.name.toLowerCase() === trimmedSelectedModel);
  if (normalizedSelectedModel && !seen.has(normalizedSelectedModel) && !matchesExistingName) {
    options.push({
      engine,
      slug: normalizedSelectedModel,
      name: formatEngineModelOptionName({ engine, slug: normalizedSelectedModel }),
      isCustom: true,
    });
  }
  return options;
}

type GitTextGenerationDiscoveredEngine = "codex" | "kilo" | "opencode";

export function mapCatalogModelOptionsToAppModelOptions(
  engine: GitTextGenerationDiscoveredEngine,
  options: ReadonlyArray<EngineModelOption & { isCustom?: boolean }>,
): AppModelOption[] {
  return options.map((option) => ({ ...option, engine, isCustom: option.isCustom ?? false }));
}

export function getGitTextGenerationModelOptions(
  settings: ServerSettingsView,
  discoveredOptionsByEngine?: Partial<
    Record<
      GitTextGenerationDiscoveredEngine,
      ReadonlyArray<EngineModelOption & { isCustom?: boolean }>
    >
  >,
): AppModelOption[] {
  const options = [
    ...(discoveredOptionsByEngine?.codex
      ? mapCatalogModelOptionsToAppModelOptions("codex", discoveredOptionsByEngine.codex)
      : getAppModelOptions("codex", settings.engines.codex.customModels)),
    ...(discoveredOptionsByEngine?.kilo
      ? mapCatalogModelOptionsToAppModelOptions("kilo", discoveredOptionsByEngine.kilo)
      : getAppModelOptions("kilo", settings.engines.kilo.customModels)),
    ...(discoveredOptionsByEngine?.opencode
      ? mapCatalogModelOptionsToAppModelOptions("opencode", discoveredOptionsByEngine.opencode)
      : getAppModelOptions("opencode", settings.engines.opencode.customModels)),
  ];
  const deduped: AppModelOption[] = [];
  const seen = new Set<string>();
  for (const option of options) {
    const key = `${option.engine}:${option.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(option);
  }
  const selection = settings.textGenerationEngineSelection;
  if (selection.model && !seen.has(`${selection.engine}:${selection.model}`)) {
    deduped.push({
      engine: selection.engine,
      slug: selection.model,
      name: formatEngineModelOptionName({ engine: selection.engine, slug: selection.model }),
      isCustom: true,
    });
  }
  return deduped;
}

export function resolveAppEngineSelection(
  engine: EngineKind,
  customModels: Partial<Record<EngineKind, readonly string[]>>,
  selectedModel: string | null | undefined,
): string | null {
  const options = getAppModelOptions(engine, customModels[engine] ?? [], selectedModel);
  return resolveSelectableModel(engine, selectedModel, options) ?? getDefaultModel(engine);
}

export function getCustomModelOptionsByEngine(
  settings: ServerSettingsView,
): Record<EngineKind, ReadonlyArray<EngineModelOption>> {
  const custom = getCustomModelsByEngine(settings);
  return {
    oa: getAppModelOptions("oa", []),
    codex: getAppModelOptions("codex", custom.codex),
    claude: getAppModelOptions("claude", custom.claude),
    cursor: getAppModelOptions("cursor", custom.cursor),
    antigravity: getAppModelOptions("antigravity", custom.antigravity),
    grok: getAppModelOptions("grok", custom.grok),
    droid: getAppModelOptions("droid", custom.droid),
    kilo: getAppModelOptions("kilo", custom.kilo),
    opencode: getAppModelOptions("opencode", custom.opencode),
    pi: getAppModelOptions("pi", custom.pi),
  };
}

export function getEngineStartOptions(settings: ServerSettingsView): EngineStartOptions {
  return engineStartOptionsFromServerSettings(settings);
}

export function getCustomBinaryPathForEngine(
  settings: ServerSettingsView,
  engine: EngineKind,
): string {
  if (engine === "oa") return "";
  const configured = settings.engines[engine].binaryPath.trim();
  const bundledDefault = DEFAULT_SERVER_SETTINGS_VIEW.engines[engine].binaryPath.trim();
  return configured === bundledDefault ? "" : configured;
}

export function resolveAssistantDeliveryMode(
  settings: Pick<ServerSettingsView, "enableAssistantStreaming">,
): "streaming" | "buffered" {
  return settings.enableAssistantStreaming ? "streaming" : "buffered";
}
