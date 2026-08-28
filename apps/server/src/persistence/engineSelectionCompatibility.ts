// FILE: engineSelectionCompatibility.ts
// Purpose: Normalizes persisted model-selection JSON from older/newer app builds.
// Layer: Persistence compatibility helper
// Exports: normalizeLegacyEngineSelection, normalizePersistedEngineSelection

import { MODEL_OPTIONS_BY_PROVIDER, EngineKind } from "@harnessos/contracts";
import { Schema } from "effect";

type ModelProviderKind = EngineKind;

const NON_DROID_MODEL_SLUGS = new Set(
  Object.entries(MODEL_OPTIONS_BY_PROVIDER).flatMap(([engine, models]) =>
    engine === "droid" ? [] : models.map((model) => model.slug.toLowerCase()),
  ),
);
const DROID_ONLY_MODEL_SLUGS = new Set(
  MODEL_OPTIONS_BY_PROVIDER.droid
    .map((model) => model.slug.toLowerCase())
    .filter((slug) => !NON_DROID_MODEL_SLUGS.has(slug)),
);

const LEGACY_GEMINI_MODEL_LABELS: Readonly<Record<string, string>> = {
  "gemini-3.1-pro-preview": "Gemini 3.1 Pro",
  "gemini-3-flash-preview": "Gemini 3.5 Flash",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTrimmedString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Imported instance ids may be runtime names rather than OmniMind engine literals.
function inferProviderFromLabel(label: string): ModelProviderKind | undefined {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("oa")) {
    return "oa";
  }
  if (/(^|[^a-z0-9])pi([^a-z0-9]|$)/u.test(lowerLabel)) {
    return "pi";
  }
  if (lowerLabel.includes("opencode")) {
    return "opencode";
  }
  if (lowerLabel.includes("kilo")) {
    return "kilo";
  }
  if (lowerLabel.includes("cursor")) {
    return "cursor";
  }
  if (lowerLabel.includes("antigravity")) {
    return "antigravity";
  }
  if (lowerLabel.includes("claude") || lowerLabel.includes("anthropic")) {
    return "claude";
  }
  if (lowerLabel.includes("gemini") || lowerLabel.includes("google")) {
    return "antigravity";
  }
  if (lowerLabel.includes("grok") || lowerLabel.includes("xai") || lowerLabel.includes("x.ai")) {
    return "grok";
  }
  if (lowerLabel.includes("droid") || lowerLabel.includes("factory")) {
    return "droid";
  }
  if (lowerLabel.includes("codex")) {
    return "codex";
  }
  return undefined;
}

function inferLegacyModelProvider(engine: unknown, model: string): ModelProviderKind {
  if (Schema.is(EngineKind)(engine)) {
    return engine;
  }
  if (engine === "gemini") {
    return "antigravity";
  }
  if (typeof engine === "string") {
    const providerFromLabel = inferProviderFromLabel(engine);
    if (providerFromLabel !== undefined) {
      return providerFromLabel;
    }
  }
  const lowerModel = model.toLowerCase();
  // Shared Claude/Gemini/OpenAI slugs remain ambiguous without an instance label;
  // only Factory-exclusive built-ins are safe to attribute to Droid.
  if (DROID_ONLY_MODEL_SLUGS.has(lowerModel)) {
    return "droid";
  }
  if (lowerModel.includes("claude")) {
    return "claude";
  }
  if (lowerModel.includes("gemini")) {
    return "antigravity";
  }
  if (lowerModel.includes("grok")) {
    return "grok";
  }
  return "codex";
}

function readLegacyProviderOptions(options: unknown, engine: ModelProviderKind): unknown {
  if (!isRecord(options)) {
    return options;
  }
  const providerScopedOptions = options[engine];
  return providerScopedOptions === undefined ? options : providerScopedOptions;
}

function normalizeModelOptions(input: unknown): unknown {
  if (!Array.isArray(input)) {
    return input;
  }

  const entries: Array<readonly [string, unknown]> = [];
  for (const option of input) {
    if (!isRecord(option)) {
      return input;
    }
    const id = readTrimmedString(option, "id");
    if (id === undefined) {
      return input;
    }
    entries.push([id, option.value]);
  }
  return Object.fromEntries(entries);
}

function splitLegacyAntigravityModelLabel(model: string): {
  model: string;
  reasoningEffort?: string;
} {
  const match = model.trim().match(/^(.*?)\s+\(([^()]+)\)$/u);
  if (!match?.[1] || !match[2]) {
    return { model };
  }
  const reasoningEffort = match[2].trim().toLowerCase();
  if (!new Set(["low", "medium", "high", "thinking"]).has(reasoningEffort)) {
    return { model };
  }
  return {
    model: match[1].trim(),
    reasoningEffort,
  };
}

function migrateLegacyGeminiModel(model: string): string {
  const trimmed = model.trim();
  return LEGACY_GEMINI_MODEL_LABELS[trimmed.toLowerCase()] ?? trimmed;
}

export function normalizeLegacyEngineSelection(input: {
  readonly engine: unknown;
  readonly model: string;
  readonly options: unknown;
}): Record<string, unknown> {
  const engine = inferLegacyModelProvider(input.engine, input.model);
  const migratedGeminiSelection = input.engine === "gemini";
  const normalizedOptions = migratedGeminiSelection
    ? undefined
    : normalizeModelOptions(readLegacyProviderOptions(input.options, engine));
  const antigravityModel =
    engine === "antigravity"
      ? splitLegacyAntigravityModelLabel(
          migratedGeminiSelection ? migrateLegacyGeminiModel(input.model) : input.model,
        )
      : null;
  const options =
    antigravityModel?.reasoningEffort &&
    (normalizedOptions === undefined || isRecord(normalizedOptions))
      ? {
          ...(isRecord(normalizedOptions) ? normalizedOptions : {}),
          reasoningEffort: antigravityModel.reasoningEffort,
        }
      : normalizedOptions;
  return {
    engine,
    model: antigravityModel?.model ?? input.model,
    ...(options === undefined ? {} : { options }),
  };
}

export function normalizePersistedEngineSelection(input: unknown): unknown {
  if (!isRecord(input)) {
    return input;
  }

  const model = readTrimmedString(input, "model");
  if (model === undefined) {
    return input;
  }

  // Newer OmniMind writes engine-less selections as { instanceId, model } and
  // option rows as [{ id, value }]; OmniMind stores canonical provider/options objects.
  return normalizeLegacyEngineSelection({
    engine: input.engine ?? input.instanceId,
    model,
    options: input.options,
  });
}
