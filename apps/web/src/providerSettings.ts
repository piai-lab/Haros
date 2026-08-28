// FILE: providerSettings.ts
// Purpose: Project authoritative ServerSettings provider fields for Web consumers.
// Layer: Credential-blind Web presentation helpers

import type {
  EngineKind,
  ProviderStartOptions,
  ServerSettingsPatch,
  ServerSettingsView,
} from "@harnessos/contracts";
import { DEFAULT_SERVER_SETTINGS_VIEW } from "@harnessos/contracts";
import { providerStartOptionsFromServerSettings } from "@harnessos/shared/serverSettings";
import {
  getDefaultModel,
  getModelOptions,
  normalizeModelSlug,
  resolveSelectableModel,
} from "@harnessos/shared/model";
import { normalizeCursorModelVariantBaseId } from "./cursorModelVariants";
import { formatProviderModelOptionName, type ProviderModelOption } from "./providerModelOptions";

const MAX_CUSTOM_MODEL_COUNT = 32;
export const MAX_CUSTOM_MODEL_LENGTH = 256;

type CustomModelProvider = Exclude<EngineKind, "oa">;

export type ProviderCustomModelConfig = {
  readonly provider: CustomModelProvider;
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

export const MODEL_PROVIDER_SETTINGS: readonly ProviderCustomModelConfig[] = [
  {
    provider: "codex",
    title: "Codex",
    description: "Save additional Codex model slugs for the picker and `/model` command.",
    placeholder: "your-codex-model-slug",
    example: "gpt-6.7-codex-ultra-preview",
  },
  {
    provider: "claude",
    title: "Claude",
    description: "Save additional Claude model slugs for the picker and `/model` command.",
    placeholder: "your-claude-model-slug",
    example: "claude-custom-model",
  },
  {
    provider: "cursor",
    title: "Cursor",
    description: "Save additional Cursor model slugs for the picker and provider runtime.",
    placeholder: "cursor-model-slug",
    example: "composer-2",
  },
  {
    provider: "antigravity",
    title: "Antigravity",
    description: "Save additional Antigravity CLI base model names for the picker.",
    placeholder: "Model Name",
    example: "Gemini 4 Pro",
  },
  {
    provider: "grok",
    title: "Grok",
    description: "Save additional Grok model slugs for the picker and `/model` command.",
    placeholder: "your-grok-model-slug",
    example: "grok-4.6",
  },
  {
    provider: "droid",
    title: "Droid",
    description: "Save additional Droid model slugs for the picker and provider runtime.",
    placeholder: "your-droid-model-slug",
    example: "claude-opus-4-8",
  },
  {
    provider: "kilo",
    title: "Kilo",
    description: "Save additional Kilo model slugs for the picker and provider runtime.",
    placeholder: "provider/model",
    example: "kilo/kilo-auto/free",
  },
  {
    provider: "opencode",
    title: "OpenCode",
    description: "Save additional OpenCode model slugs for the picker and provider runtime.",
    placeholder: "provider/model",
    example: "openai/gpt-5",
  },
  {
    provider: "pi",
    title: "Pi",
    description: "Save additional Pi model slugs for the picker and provider runtime.",
    placeholder: "provider/model",
    example: "anthropic/claude-sonnet-4-5",
  },
];

export const CUSTOM_MODEL_EDITOR_PROVIDER_SETTINGS = MODEL_PROVIDER_SETTINGS.filter(
  (config) => config.provider !== "pi" && config.provider !== "droid",
);

export interface AppModelOption extends ProviderModelOption {
  provider: EngineKind;
  isCustom: boolean;
}

export function isGitTextGenerationSettingsDirty(
  settings: ServerSettingsView,
  defaults: ServerSettingsView,
): boolean {
  return (
    settings.textGenerationModelSelection.provider !==
      defaults.textGenerationModelSelection.provider ||
    settings.textGenerationModelSelection.model !== defaults.textGenerationModelSelection.model
  );
}

export function normalizeCustomModelSlugs(
  models: Iterable<string | null | undefined>,
  provider: EngineKind = "codex",
): string[] {
  const normalizedModels: string[] = [];
  const seen = new Set<string>();
  for (const candidate of models) {
    const normalized = normalizeModelSlug(candidate, provider);
    if (
      !normalized ||
      normalized.length > MAX_CUSTOM_MODEL_LENGTH ||
      BUILT_IN_MODEL_SLUGS_BY_PROVIDER[provider].has(normalized) ||
      seen.has(normalized)
    )
      continue;
    seen.add(normalized);
    normalizedModels.push(normalized);
    if (normalizedModels.length >= MAX_CUSTOM_MODEL_COUNT) break;
  }
  return normalizedModels;
}

export function getCustomModelsForProvider(
  settings: ServerSettingsView,
  provider: CustomModelProvider,
): readonly string[] {
  return settings.providers[provider].customModels;
}

export function getDefaultCustomModelsForProvider(
  provider: CustomModelProvider,
): readonly string[] {
  return DEFAULT_SERVER_SETTINGS_VIEW.providers[provider].customModels;
}

export function patchCustomModels(
  provider: CustomModelProvider,
  models: readonly string[],
): ServerSettingsPatch {
  return { providers: { [provider]: { customModels: [...models] } } };
}

export function getCustomModelsByProvider(
  settings: ServerSettingsView,
): Record<EngineKind, readonly string[]> {
  return {
    oa: [],
    codex: settings.providers.codex?.customModels ?? [],
    claude: settings.providers.claude?.customModels ?? [],
    cursor: settings.providers.cursor?.customModels ?? [],
    antigravity: settings.providers.antigravity?.customModels ?? [],
    grok: settings.providers.grok?.customModels ?? [],
    droid: settings.providers.droid?.customModels ?? [],
    kilo: settings.providers.kilo?.customModels ?? [],
    opencode: settings.providers.opencode?.customModels ?? [],
    pi: settings.providers.pi?.customModels ?? [],
  };
}

export function getAppModelOptions(
  provider: EngineKind,
  customModels: readonly string[],
  selectedModel?: string | null,
): AppModelOption[] {
  const options: AppModelOption[] = getModelOptions(provider).map(({ slug, name }) => ({
    provider,
    slug,
    name,
    isCustom: false,
  }));
  const seen = new Set(options.map((option) => option.slug));
  const trimmedSelectedModel = selectedModel?.trim().toLowerCase();
  for (const slug of normalizeCustomModelSlugs(customModels, provider)) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    options.push({
      provider,
      slug,
      name: formatProviderModelOptionName({ provider, slug }),
      isCustom: true,
    });
  }
  const normalizedSelectedModel =
    provider === "cursor"
      ? normalizeCursorModelVariantBaseId(selectedModel)
      : normalizeModelSlug(selectedModel, provider);
  const matchesExistingName =
    typeof trimmedSelectedModel === "string" &&
    options.some((option) => option.name.toLowerCase() === trimmedSelectedModel);
  if (normalizedSelectedModel && !seen.has(normalizedSelectedModel) && !matchesExistingName) {
    options.push({
      provider,
      slug: normalizedSelectedModel,
      name: formatProviderModelOptionName({ provider, slug: normalizedSelectedModel }),
      isCustom: true,
    });
  }
  return options;
}

type GitTextGenerationDiscoveredProvider = "codex" | "kilo" | "opencode";

export function mapCatalogModelOptionsToAppModelOptions(
  provider: GitTextGenerationDiscoveredProvider,
  options: ReadonlyArray<ProviderModelOption & { isCustom?: boolean }>,
): AppModelOption[] {
  return options.map((option) => ({ ...option, provider, isCustom: option.isCustom ?? false }));
}

export function getGitTextGenerationModelOptions(
  settings: ServerSettingsView,
  discoveredOptionsByProvider?: Partial<
    Record<
      GitTextGenerationDiscoveredProvider,
      ReadonlyArray<ProviderModelOption & { isCustom?: boolean }>
    >
  >,
): AppModelOption[] {
  const options = [
    ...(discoveredOptionsByProvider?.codex
      ? mapCatalogModelOptionsToAppModelOptions("codex", discoveredOptionsByProvider.codex)
      : getAppModelOptions("codex", settings.providers.codex.customModels)),
    ...(discoveredOptionsByProvider?.kilo
      ? mapCatalogModelOptionsToAppModelOptions("kilo", discoveredOptionsByProvider.kilo)
      : getAppModelOptions("kilo", settings.providers.kilo.customModels)),
    ...(discoveredOptionsByProvider?.opencode
      ? mapCatalogModelOptionsToAppModelOptions("opencode", discoveredOptionsByProvider.opencode)
      : getAppModelOptions("opencode", settings.providers.opencode.customModels)),
  ];
  const deduped: AppModelOption[] = [];
  const seen = new Set<string>();
  for (const option of options) {
    const key = `${option.provider}:${option.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(option);
  }
  const selection = settings.textGenerationModelSelection;
  if (selection.model && !seen.has(`${selection.provider}:${selection.model}`)) {
    deduped.push({
      provider: selection.provider,
      slug: selection.model,
      name: formatProviderModelOptionName({ provider: selection.provider, slug: selection.model }),
      isCustom: true,
    });
  }
  return deduped;
}

export function resolveAppModelSelection(
  provider: EngineKind,
  customModels: Partial<Record<EngineKind, readonly string[]>>,
  selectedModel: string | null | undefined,
): string | null {
  const options = getAppModelOptions(provider, customModels[provider] ?? [], selectedModel);
  return resolveSelectableModel(provider, selectedModel, options) ?? getDefaultModel(provider);
}

export function getCustomModelOptionsByProvider(
  settings: ServerSettingsView,
): Record<EngineKind, ReadonlyArray<ProviderModelOption>> {
  const custom = getCustomModelsByProvider(settings);
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

export function getProviderStartOptions(settings: ServerSettingsView): ProviderStartOptions {
  return providerStartOptionsFromServerSettings(settings);
}

export function getCustomBinaryPathForProvider(
  settings: ServerSettingsView,
  provider: EngineKind,
): string {
  if (provider === "oa") return "";
  const configured = settings.providers[provider].binaryPath.trim();
  const bundledDefault = DEFAULT_SERVER_SETTINGS_VIEW.providers[provider].binaryPath.trim();
  return configured === bundledDefault ? "" : configured;
}

export function resolveAssistantDeliveryMode(
  settings: Pick<ServerSettingsView, "enableAssistantStreaming">,
): "streaming" | "buffered" {
  return settings.enableAssistantStreaming ? "streaming" : "buffered";
}
