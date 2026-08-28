// FILE: composerDraftModels.ts
// Purpose: Normalizes provider-scoped model selections and resolves effective composer models.
// Exports: Model state helpers used by persistence, actions, and the public facade.

import {
  GROK_REASONING_EFFORT_OPTIONS,
  PROVIDER_KINDS,
  ProviderKind,
  type ClaudeCodeEffort,
  type CodexReasoningEffort,
  type CursorModelOptions,
  type DroidReasoningEffort,
  type GrokReasoningEffort,
  type ModelSelection,
  type ModelSlug,
  type PiThinkingLevel,
  type ProviderModelOptions,
} from "@harnessos/contracts";
import * as Schema from "effect/Schema";

import {
  getDefaultModel,
  normalizeGrokModelOptions,
  normalizeModelSlug,
  resolveSelectableModel,
} from "@harnessos/shared/model";
import type { ComposerThreadDraftState } from "./composerDraftDomain";
import { classifyProviderReasoningEffortSupport } from "./lib/codexReasoningEffort";

const isProviderKind = Schema.is(ProviderKind);

const GROK_REASONING_EFFORT_SET = new Set<string>(GROK_REASONING_EFFORT_OPTIONS);

export const LegacyCodexFields = Schema.Struct({
  effort: Schema.optionalKey(Schema.String),
  codexFastMode: Schema.optionalKey(Schema.Boolean),
  serviceTier: Schema.optionalKey(Schema.String),
});

export type LegacyCodexFields = typeof LegacyCodexFields.Type;

const ANTIGRAVITY_REASONING_EFFORT_SET = new Set(["low", "medium", "high", "thinking"]);

export interface EffectiveComposerModelState {
  selectedModel: ModelSlug | null;
  modelOptions: ProviderModelOptions | null;
}

function mergeProviderModelOptionsFromSelections(
  ...selections: ReadonlyArray<ModelSelection | null | undefined>
): ProviderModelOptions | null {
  const result: Partial<Record<ProviderKind, ProviderModelOptions[ProviderKind]>> = {};
  for (const selection of selections) {
    if (!selection) continue;
    if (selection.options) {
      result[selection.provider] = selection.options;
    } else {
      delete result[selection.provider];
    }
  }
  return Object.keys(result).length > 0 ? (result as ProviderModelOptions) : null;
}

function deriveEffectiveComposerModelOptions(input: {
  draft:
    | Pick<ComposerThreadDraftState, "modelSelectionByProvider" | "activeProvider">
    | null
    | undefined;
  threadModelSelection: ModelSelection | null | undefined;
  projectModelSelection: ModelSelection | null | undefined;
  stickyModelSelection?: ModelSelection | null | undefined;
}): ProviderModelOptions | null {
  const baseOptions = mergeProviderModelOptionsFromSelections(
    input.stickyModelSelection,
    input.projectModelSelection,
    input.threadModelSelection,
  );
  const draftSelections = input.draft?.modelSelectionByProvider;
  if (!draftSelections) {
    return baseOptions;
  }

  const result: Partial<Record<ProviderKind, ProviderModelOptions[ProviderKind]>> = baseOptions
    ? { ...baseOptions }
    : {};
  for (const [provider, selection] of Object.entries(draftSelections) as Array<
    [ProviderKind, ModelSelection | undefined]
  >) {
    if (!selection) continue;
    if (selection.options) {
      result[provider] = selection.options;
    } else {
      delete result[provider];
    }
  }
  return Object.keys(result).length > 0 ? (result as ProviderModelOptions) : null;
}

export function normalizeProviderKind(value: unknown): ProviderKind | null {
  if (value === "gemini") {
    return "antigravity";
  }
  return isProviderKind(value) ? value : null;
}

function trimStringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isGrokReasoningEffort(value: unknown): value is GrokReasoningEffort {
  return typeof value === "string" && GROK_REASONING_EFFORT_SET.has(value);
}

export function makeModelSelection(
  provider: ProviderKind,
  model: string,
  options?: ProviderModelOptions[ProviderKind],
  supportsAutoMode?: boolean,
): ModelSelection {
  switch (provider) {
    case "omnimind":
      return {
        provider,
        model,
        ...(options
          ? { options: options as Extract<ModelSelection, { provider: "omnimind" }>["options"] }
          : {}),
      };
    case "antigravity":
      return {
        provider,
        model,
        ...(options
          ? {
              options: options as Extract<ModelSelection, { provider: "antigravity" }>["options"],
            }
          : {}),
      };
    case "codex":
      return {
        provider,
        model,
        ...(options
          ? { options: options as Extract<ModelSelection, { provider: "codex" }>["options"] }
          : {}),
      };
    case "claudeAgent":
      return {
        provider,
        model,
        ...(options
          ? {
              options: options as Extract<ModelSelection, { provider: "claudeAgent" }>["options"],
            }
          : {}),
        ...(typeof supportsAutoMode === "boolean" ? { supportsAutoMode } : {}),
      };
    case "cursor":
      return {
        provider,
        model,
        ...(options
          ? { options: options as Extract<ModelSelection, { provider: "cursor" }>["options"] }
          : {}),
      };
    case "grok":
      return {
        provider,
        model,
        ...(options
          ? { options: options as Extract<ModelSelection, { provider: "grok" }>["options"] }
          : {}),
      };
    case "droid":
      return {
        provider,
        model,
        ...(options
          ? { options: options as Extract<ModelSelection, { provider: "droid" }>["options"] }
          : {}),
      };
    case "kilo":
      return {
        provider,
        model,
        ...(options
          ? { options: options as Extract<ModelSelection, { provider: "kilo" }>["options"] }
          : {}),
      };
    case "opencode":
      return {
        provider,
        model,
        ...(options
          ? { options: options as Extract<ModelSelection, { provider: "opencode" }>["options"] }
          : {}),
      };
    case "pi":
      return {
        provider,
        model,
        ...(options
          ? { options: options as Extract<ModelSelection, { provider: "pi" }>["options"] }
          : {}),
      };
  }
}

export function normalizeProviderModelOptions(
  value: unknown,
  provider?: ProviderKind | null,
  legacy?: LegacyCodexFields,
): ProviderModelOptions | null {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  const codexCandidate =
    candidate?.codex && typeof candidate.codex === "object"
      ? (candidate.codex as Record<string, unknown>)
      : null;
  const claudeCandidate =
    candidate?.claudeAgent && typeof candidate.claudeAgent === "object"
      ? (candidate.claudeAgent as Record<string, unknown>)
      : null;
  const cursorCandidate =
    candidate?.cursor && typeof candidate.cursor === "object"
      ? (candidate.cursor as Record<string, unknown>)
      : null;
  const antigravityCandidate =
    candidate?.antigravity && typeof candidate.antigravity === "object"
      ? (candidate.antigravity as Record<string, unknown>)
      : null;
  const grokCandidate =
    candidate?.grok && typeof candidate.grok === "object"
      ? (candidate.grok as Record<string, unknown>)
      : null;
  const droidCandidate =
    candidate?.droid && typeof candidate.droid === "object"
      ? (candidate.droid as Record<string, unknown>)
      : null;
  const openCodeCandidate =
    candidate?.opencode && typeof candidate.opencode === "object"
      ? (candidate.opencode as Record<string, unknown>)
      : null;
  const kiloCandidate =
    candidate?.kilo && typeof candidate.kilo === "object"
      ? (candidate.kilo as Record<string, unknown>)
      : null;
  const piCandidate =
    candidate?.pi && typeof candidate.pi === "object"
      ? (candidate.pi as Record<string, unknown>)
      : null;
  const omniMindCandidate =
    candidate?.omnimind && typeof candidate.omnimind === "object"
      ? (candidate.omnimind as Record<string, unknown>)
      : null;

  const codexReasoningEffort: CodexReasoningEffort | undefined =
    trimStringOrUndefined(codexCandidate?.reasoningEffort) ??
    (provider === "codex" ? trimStringOrUndefined(legacy?.effort) : undefined);
  const codexFastMode =
    codexCandidate?.fastMode === true
      ? true
      : codexCandidate?.fastMode === false
        ? false
        : (provider === "codex" && legacy?.codexFastMode === true) ||
            (typeof legacy?.serviceTier === "string" && legacy.serviceTier === "fast")
          ? true
          : undefined;
  const codex =
    codexReasoningEffort !== undefined || codexFastMode !== undefined
      ? {
          ...(codexReasoningEffort !== undefined ? { reasoningEffort: codexReasoningEffort } : {}),
          ...(codexFastMode !== undefined ? { fastMode: codexFastMode } : {}),
        }
      : undefined;

  const claudeThinking =
    claudeCandidate?.thinking === true
      ? true
      : claudeCandidate?.thinking === false
        ? false
        : undefined;
  const claudeEffort: ClaudeCodeEffort | undefined =
    claudeCandidate?.effort === "low" ||
    claudeCandidate?.effort === "medium" ||
    claudeCandidate?.effort === "high" ||
    claudeCandidate?.effort === "xhigh" ||
    claudeCandidate?.effort === "max" ||
    claudeCandidate?.effort === "ultrathink" ||
    claudeCandidate?.effort === "ultracode"
      ? claudeCandidate.effort
      : undefined;
  const claudeFastMode =
    claudeCandidate?.fastMode === true
      ? true
      : claudeCandidate?.fastMode === false
        ? false
        : undefined;
  const claudeAutoCompactWindow =
    trimStringOrUndefined(claudeCandidate?.autoCompactWindow) ??
    trimStringOrUndefined(claudeCandidate?.contextWindow);
  const claude =
    claudeThinking !== undefined ||
    claudeEffort !== undefined ||
    claudeFastMode !== undefined ||
    claudeAutoCompactWindow !== undefined
      ? {
          ...(claudeThinking !== undefined ? { thinking: claudeThinking } : {}),
          ...(claudeEffort !== undefined ? { effort: claudeEffort } : {}),
          ...(claudeFastMode !== undefined ? { fastMode: claudeFastMode } : {}),
          ...(claudeAutoCompactWindow !== undefined
            ? { autoCompactWindow: claudeAutoCompactWindow }
            : {}),
        }
      : undefined;

  const cursorReasoningEffort = trimStringOrUndefined(cursorCandidate?.reasoningEffort);
  const cursorFastMode =
    cursorCandidate?.fastMode === true
      ? true
      : cursorCandidate?.fastMode === false
        ? false
        : undefined;
  const cursorThinking =
    cursorCandidate?.thinking === true
      ? true
      : cursorCandidate?.thinking === false
        ? false
        : undefined;
  const cursorContextWindow = trimStringOrUndefined(cursorCandidate?.contextWindow);
  const cursor: CursorModelOptions | undefined =
    cursorReasoningEffort !== undefined ||
    cursorFastMode !== undefined ||
    cursorThinking !== undefined ||
    cursorContextWindow !== undefined
      ? {
          ...(cursorReasoningEffort !== undefined
            ? { reasoningEffort: cursorReasoningEffort }
            : {}),
          ...(cursorFastMode !== undefined ? { fastMode: cursorFastMode } : {}),
          ...(cursorThinking !== undefined ? { thinking: cursorThinking } : {}),
          ...(cursorContextWindow !== undefined ? { contextWindow: cursorContextWindow } : {}),
        }
      : undefined;

  const antigravityReasoningEffort = trimStringOrUndefined(antigravityCandidate?.reasoningEffort);
  const antigravity =
    antigravityReasoningEffort !== undefined
      ? { reasoningEffort: antigravityReasoningEffort }
      : undefined;
  const grokReasoningEffort: GrokReasoningEffort | undefined = isGrokReasoningEffort(
    grokCandidate?.reasoningEffort,
  )
    ? grokCandidate.reasoningEffort
    : undefined;
  const grok =
    grokReasoningEffort !== undefined ? { reasoningEffort: grokReasoningEffort } : undefined;
  const droidReasoningEffort: DroidReasoningEffort | undefined = trimStringOrUndefined(
    droidCandidate?.reasoningEffort,
  );
  const droid =
    droidReasoningEffort !== undefined ? { reasoningEffort: droidReasoningEffort } : undefined;
  const openCodeVariant = trimStringOrUndefined(openCodeCandidate?.variant);
  const openCodeAgent = trimStringOrUndefined(openCodeCandidate?.agent);
  const opencode =
    openCodeVariant !== undefined || openCodeAgent !== undefined
      ? {
          ...(openCodeVariant !== undefined ? { variant: openCodeVariant } : {}),
          ...(openCodeAgent !== undefined ? { agent: openCodeAgent } : {}),
        }
      : undefined;
  const kiloVariant = trimStringOrUndefined(kiloCandidate?.variant);
  const kiloAgent = trimStringOrUndefined(kiloCandidate?.agent);
  const kilo =
    kiloVariant !== undefined || kiloAgent !== undefined
      ? {
          ...(kiloVariant !== undefined ? { variant: kiloVariant } : {}),
          ...(kiloAgent !== undefined ? { agent: kiloAgent } : {}),
        }
      : undefined;
  const piThinkingLevel: PiThinkingLevel | undefined =
    piCandidate?.thinkingLevel === "off" ||
    piCandidate?.thinkingLevel === "minimal" ||
    piCandidate?.thinkingLevel === "low" ||
    piCandidate?.thinkingLevel === "medium" ||
    piCandidate?.thinkingLevel === "high" ||
    piCandidate?.thinkingLevel === "xhigh" ||
    piCandidate?.thinkingLevel === "max"
      ? piCandidate.thinkingLevel
      : undefined;
  const pi = piThinkingLevel !== undefined ? { thinkingLevel: piThinkingLevel } : undefined;
  const omniMindThinkingLevel: PiThinkingLevel | undefined =
    omniMindCandidate?.thinkingLevel === "off" ||
    omniMindCandidate?.thinkingLevel === "minimal" ||
    omniMindCandidate?.thinkingLevel === "low" ||
    omniMindCandidate?.thinkingLevel === "medium" ||
    omniMindCandidate?.thinkingLevel === "high" ||
    omniMindCandidate?.thinkingLevel === "xhigh" ||
    omniMindCandidate?.thinkingLevel === "max"
      ? omniMindCandidate.thinkingLevel
      : undefined;
  const omnimind =
    omniMindThinkingLevel !== undefined ? { thinkingLevel: omniMindThinkingLevel } : undefined;
  if (
    !omnimind &&
    !codex &&
    !claude &&
    !cursor &&
    !antigravity &&
    !grok &&
    !droid &&
    !kilo &&
    !opencode &&
    !pi
  ) {
    return null;
  }
  return {
    ...(omnimind ? { omnimind } : {}),
    ...(codex ? { codex } : {}),
    ...(claude ? { claudeAgent: claude } : {}),
    ...(cursor ? { cursor } : {}),
    ...(antigravity ? { antigravity } : {}),
    ...(grok ? { grok } : {}),
    ...(droid ? { droid } : {}),
    ...(kilo ? { kilo } : {}),
    ...(opencode ? { opencode } : {}),
    ...(pi ? { pi } : {}),
  };
}

export function normalizeModelSelection(
  value: unknown,
  legacy?: {
    provider?: unknown;
    model?: unknown;
    modelOptions?: unknown;
    legacyCodex?: LegacyCodexFields;
  },
): ModelSelection | null {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  const rawProvider = candidate?.provider ?? legacy?.provider;
  const migratedGeminiSelection = rawProvider === "gemini";
  const provider = normalizeProviderKind(rawProvider);
  if (provider === null) {
    return null;
  }
  const rawModel = candidate?.model ?? legacy?.model;
  if (typeof rawModel !== "string") {
    return null;
  }
  const antigravityLegacyMatch =
    provider === "antigravity" ? rawModel.trim().match(/^(.*?)\s+\(([^()]+)\)$/u) : null;
  const antigravityLegacyEffort = antigravityLegacyMatch?.[2]?.trim().toLowerCase();
  const hasLegacyAntigravityEffort =
    antigravityLegacyMatch?.[1] !== undefined &&
    antigravityLegacyEffort !== undefined &&
    ANTIGRAVITY_REASONING_EFFORT_SET.has(antigravityLegacyEffort);
  const normalizedRawModel = migratedGeminiSelection
    ? getDefaultModel("antigravity")
    : hasLegacyAntigravityEffort
      ? antigravityLegacyMatch[1]!.trim()
      : rawModel;
  const inferredClaudeAutoCompactWindow =
    provider === "claudeAgent" && /\[1m\]$/iu.test(rawModel) ? "1m" : undefined;
  const model = normalizeModelSlug(normalizedRawModel, provider);
  if (!model) {
    return null;
  }
  const modelOptions = migratedGeminiSelection
    ? null
    : normalizeProviderModelOptions(
        candidate?.options ? { [provider]: candidate.options } : legacy?.modelOptions,
        provider,
        provider === "codex" ? legacy?.legacyCodex : undefined,
      );
  const options =
    provider === "codex"
      ? modelOptions?.codex
      : provider === "claudeAgent"
        ? inferredClaudeAutoCompactWindow !== undefined
          ? {
              ...modelOptions?.claudeAgent,
              autoCompactWindow:
                modelOptions?.claudeAgent?.autoCompactWindow ?? inferredClaudeAutoCompactWindow,
            }
          : modelOptions?.claudeAgent
        : provider === "antigravity"
          ? modelOptions?.antigravity
          : provider === "grok"
            ? normalizeGrokModelOptions(model, modelOptions?.grok)
            : provider === "droid"
              ? modelOptions?.droid
              : provider === "kilo"
                ? modelOptions?.kilo
                : provider === "cursor"
                  ? modelOptions?.cursor
                  : provider === "opencode"
                    ? modelOptions?.opencode
                    : provider === "omnimind"
                      ? modelOptions?.omnimind
                      : provider === "pi"
                        ? modelOptions?.pi
                        : undefined;
  const normalizedOptions =
    provider === "antigravity" && hasLegacyAntigravityEffort
      ? {
          reasoningEffort: modelOptions?.antigravity?.reasoningEffort ?? antigravityLegacyEffort,
        }
      : options;
  return makeModelSelection(
    provider,
    model,
    normalizedOptions,
    provider === "claudeAgent" && typeof candidate?.supportsAutoMode === "boolean"
      ? candidate.supportsAutoMode
      : undefined,
  );
}

export function reconcileProviderScopedModelSelection(
  requested: ModelSelection,
  current: ModelSelection | null | undefined,
): ModelSelection {
  if (requested.options !== undefined || current?.provider !== requested.provider) {
    return requested;
  }
  if (current.model === requested.model) {
    const currentSupportsAutoMode =
      current.provider === "claudeAgent" ? current.supportsAutoMode : undefined;
    return makeModelSelection(
      requested.provider,
      requested.model,
      current.options,
      requested.provider === "claudeAgent"
        ? (requested.supportsAutoMode ?? currentSupportsAutoMode)
        : undefined,
    );
  }
  if (
    current.provider !== "codex" &&
    current.provider !== "cursor" &&
    current.provider !== "claudeAgent"
  ) {
    return requested;
  }
  let preservedOptions = current.options;
  const effort =
    current.provider === "claudeAgent"
      ? current.options?.effort
      : current.provider === "codex" || current.provider === "cursor"
        ? current.options?.reasoningEffort
        : undefined;
  if (
    effort !== undefined &&
    classifyProviderReasoningEffortSupport({
      provider: requested.provider,
      model: requested.model,
      effort,
    }) !== "supported"
  ) {
    if (current.provider === "claudeAgent") {
      const { effort: _effort, ...remainingOptions } = current.options ?? {};
      preservedOptions = Object.keys(remainingOptions).length > 0 ? remainingOptions : undefined;
    } else if (current.provider === "codex" || current.provider === "cursor") {
      const { reasoningEffort: _reasoningEffort, ...remainingOptions } = current.options ?? {};
      preservedOptions = Object.keys(remainingOptions).length > 0 ? remainingOptions : undefined;
    }
  }
  return makeModelSelection(
    requested.provider,
    requested.model,
    preservedOptions,
    requested.provider === "claudeAgent" ? requested.supportsAutoMode : undefined,
  );
}

export function stripNonStickyModelOptions(selection: ModelSelection): ModelSelection {
  if (
    selection.provider !== "claudeAgent" ||
    (!selection.options?.contextWindow && !selection.options?.autoCompactWindow)
  ) {
    return selection;
  }
  const {
    contextWindow: _contextWindow,
    autoCompactWindow: _autoCompactWindow,
    ...rest
  } = selection.options;
  return makeModelSelection(
    selection.provider,
    selection.model,
    Object.keys(rest).length > 0 ? rest : undefined,
    selection.supportsAutoMode,
  );
}

export function sanitizeStickyModelSelectionMap(
  map: Partial<Record<ProviderKind, ModelSelection>>,
): Partial<Record<ProviderKind, ModelSelection>> {
  const claude = map.claudeAgent;
  if (
    claude?.provider !== "claudeAgent" ||
    (!claude.options?.contextWindow && !claude.options?.autoCompactWindow)
  ) {
    return map;
  }
  return { ...map, claudeAgent: stripNonStickyModelOptions(claude) };
}

export function legacySyncModelSelectionOptions(
  modelSelection: ModelSelection | null,
  modelOptions: ProviderModelOptions | null | undefined,
): ModelSelection | null {
  if (modelSelection === null) {
    return null;
  }
  const normalizedOptions =
    modelSelection.provider === "grok"
      ? normalizeGrokModelOptions(modelSelection.model, modelOptions?.grok)
      : modelOptions?.[modelSelection.provider];
  return makeModelSelection(
    modelSelection.provider,
    modelSelection.model,
    normalizedOptions,
    modelSelection.provider === "claudeAgent" ? modelSelection.supportsAutoMode : undefined,
  );
}

export function legacyMergeModelSelectionIntoProviderModelOptions(
  modelSelection: ModelSelection | null,
  currentModelOptions: ProviderModelOptions | null | undefined,
): ProviderModelOptions | null {
  if (modelSelection?.options === undefined) {
    return normalizeProviderModelOptions(currentModelOptions);
  }
  return legacyReplaceProviderModelOptions(
    normalizeProviderModelOptions(currentModelOptions),
    modelSelection.provider,
    modelSelection.options,
  );
}

function legacyReplaceProviderModelOptions(
  currentModelOptions: ProviderModelOptions | null | undefined,
  provider: ProviderKind,
  nextProviderOptions: ProviderModelOptions[ProviderKind] | null | undefined,
): ProviderModelOptions | null {
  const { [provider]: _discardedProviderModelOptions, ...otherProviderModelOptions } =
    currentModelOptions ?? {};
  const normalizedNextProviderOptions = normalizeProviderModelOptions(
    { [provider]: nextProviderOptions },
    provider,
  );

  return normalizeProviderModelOptions({
    ...otherProviderModelOptions,
    ...(normalizedNextProviderOptions ? normalizedNextProviderOptions : {}),
  });
}

export function legacyToModelSelectionByProvider(
  modelSelection: ModelSelection | null,
  modelOptions: ProviderModelOptions | null | undefined,
): Partial<Record<ProviderKind, ModelSelection>> {
  const result: Partial<Record<ProviderKind, ModelSelection>> = {};
  // Add entries from the options bag (for non-active providers)
  if (modelOptions) {
    for (const provider of PROVIDER_KINDS) {
      const options = modelOptions[provider];
      if (options && Object.keys(options).length > 0) {
        const model =
          modelSelection?.provider === provider ? modelSelection.model : getDefaultModel(provider);
        if (model) {
          result[provider] = makeModelSelection(
            provider,
            model,
            provider === "grok" ? normalizeGrokModelOptions(model, modelOptions.grok) : options,
          );
        }
      }
    }
  }
  // Add/overwrite the active selection (it's authoritative for its provider)
  if (modelSelection) {
    result[modelSelection.provider] = modelSelection;
  }
  return result;
}

export function deriveEffectiveComposerModelState(input: {
  draft:
    | Pick<ComposerThreadDraftState, "modelSelectionByProvider" | "activeProvider">
    | null
    | undefined;
  selectedProvider: ProviderKind;
  threadModelSelection: ModelSelection | null | undefined;
  projectModelSelection: ModelSelection | null | undefined;
  stickyModelSelection?: ModelSelection | null | undefined;
  runtimeCatalogFallbackModel?: ModelSlug | null | undefined;
  customModelsByProvider: Partial<Record<ProviderKind, readonly string[]>>;
  availableModelOptionsByProvider?: Partial<
    Record<ProviderKind, ReadonlyArray<{ slug: string; name: string }>>
  >;
}): EffectiveComposerModelState {
  const resolveAvailableModel = (candidate: string | null | undefined): ModelSlug | null => {
    const availableOptions = input.availableModelOptionsByProvider?.[input.selectedProvider];
    if (!availableOptions || availableOptions.length === 0) {
      return null;
    }
    return resolveSelectableModel(input.selectedProvider, candidate, availableOptions);
  };
  const activeSelection = input.draft?.modelSelectionByProvider?.[input.selectedProvider];
  const selectionCandidates = [
    activeSelection,
    input.threadModelSelection?.provider === input.selectedProvider
      ? input.threadModelSelection
      : null,
    input.projectModelSelection?.provider === input.selectedProvider
      ? input.projectModelSelection
      : null,
    input.stickyModelSelection?.provider === input.selectedProvider
      ? input.stickyModelSelection
      : null,
  ] as const;
  let selectedModel: ModelSlug | null = null;
  let selectedSource: ModelSelection | null = null;
  for (const candidate of selectionCandidates) {
    const resolvedModel = resolveAvailableModel(candidate?.model);
    if (!resolvedModel) continue;
    selectedModel = resolvedModel;
    selectedSource = candidate ?? null;
    break;
  }
  const hasRememberedExactSelection = selectionCandidates.some(
    (candidate) => candidate !== null && candidate !== undefined,
  );
  const requiresExactRuntimeCatalogSelection =
    input.selectedProvider === "omnimind" || input.selectedProvider === "pi";
  if (!(requiresExactRuntimeCatalogSelection && hasRememberedExactSelection)) {
    selectedModel ??=
      input.runtimeCatalogFallbackModel !== undefined
        ? resolveAvailableModel(input.runtimeCatalogFallbackModel)
        : (resolveAvailableModel(getDefaultModel(input.selectedProvider)) ??
          input.availableModelOptionsByProvider?.[input.selectedProvider]?.[0]?.slug ??
          null);
  }

  const inheritedModelOptions = deriveEffectiveComposerModelOptions(input);
  const modelOptions = legacyReplaceProviderModelOptions(
    inheritedModelOptions,
    input.selectedProvider,
    selectedSource?.options,
  );

  return {
    selectedModel,
    modelOptions,
  };
}

export function resolvePreferredComposerModelSelection(input: {
  draft:
    | Pick<ComposerThreadDraftState, "modelSelectionByProvider" | "activeProvider">
    | null
    | undefined;
  threadModelSelection: ModelSelection | null | undefined;
  projectModelSelection: ModelSelection | null | undefined;
  defaultProvider?: ProviderKind | null | undefined;
}): ModelSelection | null {
  const draftProviderWithSelection =
    PROVIDER_KINDS.find(
      (provider) => input.draft?.modelSelectionByProvider?.[provider] !== undefined,
    ) ?? null;
  const preferredProvider =
    input.draft?.activeProvider ??
    draftProviderWithSelection ??
    input.threadModelSelection?.provider ??
    input.projectModelSelection?.provider ??
    input.defaultProvider ??
    "codex";

  return (
    input.draft?.modelSelectionByProvider?.[preferredProvider] ??
    (input.threadModelSelection?.provider === preferredProvider
      ? input.threadModelSelection
      : null) ??
    (input.projectModelSelection?.provider === preferredProvider
      ? input.projectModelSelection
      : null) ??
    (() => {
      const model = getDefaultModel(preferredProvider);
      return model ? { provider: preferredProvider, model } : null;
    })()
  );
}
