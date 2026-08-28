// FILE: composerDraftModels.ts
// Purpose: Normalizes engine-scoped model selections and resolves effective composer models.
// Exports: Model state helpers used by persistence, actions, and the public facade.

import {
  GROK_REASONING_EFFORT_OPTIONS,
  ENGINE_KINDS,
  EngineKind,
  type ClaudeCodeEffort,
  type CodexReasoningEffort,
  type CursorModelOptions,
  type DroidReasoningEffort,
  type GrokReasoningEffort,
  type EngineSelection,
  type ModelSlug,
  type PiThinkingLevel,
  type EngineModelOptions,
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

const isProviderKind = Schema.is(EngineKind);

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
  modelOptions: EngineModelOptions | null;
}

function mergeProviderModelOptionsFromSelections(
  ...selections: ReadonlyArray<EngineSelection | null | undefined>
): EngineModelOptions | null {
  const result: Partial<Record<EngineKind, EngineModelOptions[EngineKind]>> = {};
  for (const selection of selections) {
    if (!selection) continue;
    if (selection.options) {
      result[selection.engine] = selection.options;
    } else {
      delete result[selection.engine];
    }
  }
  return Object.keys(result).length > 0 ? (result as EngineModelOptions) : null;
}

function deriveEffectiveComposerModelOptions(input: {
  draft:
    | Pick<ComposerThreadDraftState, "engineSelectionByEngine" | "activeEngine">
    | null
    | undefined;
  threadEngineSelection: EngineSelection | null | undefined;
  projectEngineSelection: EngineSelection | null | undefined;
  stickyEngineSelection?: EngineSelection | null | undefined;
}): EngineModelOptions | null {
  const baseOptions = mergeProviderModelOptionsFromSelections(
    input.stickyEngineSelection,
    input.projectEngineSelection,
    input.threadEngineSelection,
  );
  const draftSelections = input.draft?.engineSelectionByEngine;
  if (!draftSelections) {
    return baseOptions;
  }

  const result: Partial<Record<EngineKind, EngineModelOptions[EngineKind]>> = baseOptions
    ? { ...baseOptions }
    : {};
  for (const [engine, selection] of Object.entries(draftSelections) as Array<
    [EngineKind, EngineSelection | undefined]
  >) {
    if (!selection) continue;
    if (selection.options) {
      result[engine] = selection.options;
    } else {
      delete result[engine];
    }
  }
  return Object.keys(result).length > 0 ? (result as EngineModelOptions) : null;
}

export function normalizeProviderKind(value: unknown): EngineKind | null {
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

export function makeEngineSelection(
  engine: EngineKind,
  model: string,
  options?: EngineModelOptions[EngineKind],
  supportsAutoMode?: boolean,
): EngineSelection {
  switch (engine) {
    case "oa":
      return {
        engine,
        model,
        ...(options
          ? { options: options as Extract<EngineSelection, { engine: "oa" }>["options"] }
          : {}),
      };
    case "antigravity":
      return {
        engine,
        model,
        ...(options
          ? {
              options: options as Extract<EngineSelection, { engine: "antigravity" }>["options"],
            }
          : {}),
      };
    case "codex":
      return {
        engine,
        model,
        ...(options
          ? { options: options as Extract<EngineSelection, { engine: "codex" }>["options"] }
          : {}),
      };
    case "claude":
      return {
        engine,
        model,
        ...(options
          ? {
              options: options as Extract<EngineSelection, { engine: "claude" }>["options"],
            }
          : {}),
        ...(typeof supportsAutoMode === "boolean" ? { supportsAutoMode } : {}),
      };
    case "cursor":
      return {
        engine,
        model,
        ...(options
          ? { options: options as Extract<EngineSelection, { engine: "cursor" }>["options"] }
          : {}),
      };
    case "grok":
      return {
        engine,
        model,
        ...(options
          ? { options: options as Extract<EngineSelection, { engine: "grok" }>["options"] }
          : {}),
      };
    case "droid":
      return {
        engine,
        model,
        ...(options
          ? { options: options as Extract<EngineSelection, { engine: "droid" }>["options"] }
          : {}),
      };
    case "kilo":
      return {
        engine,
        model,
        ...(options
          ? { options: options as Extract<EngineSelection, { engine: "kilo" }>["options"] }
          : {}),
      };
    case "opencode":
      return {
        engine,
        model,
        ...(options
          ? { options: options as Extract<EngineSelection, { engine: "opencode" }>["options"] }
          : {}),
      };
    case "pi":
      return {
        engine,
        model,
        ...(options
          ? { options: options as Extract<EngineSelection, { engine: "pi" }>["options"] }
          : {}),
      };
  }
}

export function normalizeProviderModelOptions(
  value: unknown,
  engine?: EngineKind | null,
  legacy?: LegacyCodexFields,
): EngineModelOptions | null {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  const codexCandidate =
    candidate?.codex && typeof candidate.codex === "object"
      ? (candidate.codex as Record<string, unknown>)
      : null;
  const claudeCandidate =
    candidate?.claude && typeof candidate.claude === "object"
      ? (candidate.claude as Record<string, unknown>)
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
  const oaCandidate =
    candidate?.oa && typeof candidate.oa === "object"
      ? (candidate.oa as Record<string, unknown>)
      : null;

  const codexReasoningEffort: CodexReasoningEffort | undefined =
    trimStringOrUndefined(codexCandidate?.reasoningEffort) ??
    (engine === "codex" ? trimStringOrUndefined(legacy?.effort) : undefined);
  const codexFastMode =
    codexCandidate?.fastMode === true
      ? true
      : codexCandidate?.fastMode === false
        ? false
        : (engine === "codex" && legacy?.codexFastMode === true) ||
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
  const oaThinkingLevel: PiThinkingLevel | undefined =
    oaCandidate?.thinkingLevel === "off" ||
    oaCandidate?.thinkingLevel === "minimal" ||
    oaCandidate?.thinkingLevel === "low" ||
    oaCandidate?.thinkingLevel === "medium" ||
    oaCandidate?.thinkingLevel === "high" ||
    oaCandidate?.thinkingLevel === "xhigh" ||
    oaCandidate?.thinkingLevel === "max"
      ? oaCandidate.thinkingLevel
      : undefined;
  const oa = oaThinkingLevel !== undefined ? { thinkingLevel: oaThinkingLevel } : undefined;
  if (
    !oa &&
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
    ...(oa ? { oa } : {}),
    ...(codex ? { codex } : {}),
    ...(claude ? { claude: claude } : {}),
    ...(cursor ? { cursor } : {}),
    ...(antigravity ? { antigravity } : {}),
    ...(grok ? { grok } : {}),
    ...(droid ? { droid } : {}),
    ...(kilo ? { kilo } : {}),
    ...(opencode ? { opencode } : {}),
    ...(pi ? { pi } : {}),
  };
}

export function normalizeEngineSelection(
  value: unknown,
  legacy?: {
    engine?: unknown;
    model?: unknown;
    modelOptions?: unknown;
    legacyCodex?: LegacyCodexFields;
  },
): EngineSelection | null {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  const rawProvider = candidate?.engine ?? legacy?.engine;
  const migratedGeminiSelection = rawProvider === "gemini";
  const engine = normalizeProviderKind(rawProvider);
  if (engine === null) {
    return null;
  }
  const rawModel = candidate?.model ?? legacy?.model;
  if (typeof rawModel !== "string") {
    return null;
  }
  const antigravityLegacyMatch =
    engine === "antigravity" ? rawModel.trim().match(/^(.*?)\s+\(([^()]+)\)$/u) : null;
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
    engine === "claude" && /\[1m\]$/iu.test(rawModel) ? "1m" : undefined;
  const model = normalizeModelSlug(normalizedRawModel, engine);
  if (!model) {
    return null;
  }
  const modelOptions = migratedGeminiSelection
    ? null
    : normalizeProviderModelOptions(
        candidate?.options ? { [engine]: candidate.options } : legacy?.modelOptions,
        engine,
        engine === "codex" ? legacy?.legacyCodex : undefined,
      );
  const options =
    engine === "codex"
      ? modelOptions?.codex
      : engine === "claude"
        ? inferredClaudeAutoCompactWindow !== undefined
          ? {
              ...modelOptions?.claude,
              autoCompactWindow:
                modelOptions?.claude?.autoCompactWindow ?? inferredClaudeAutoCompactWindow,
            }
          : modelOptions?.claude
        : engine === "antigravity"
          ? modelOptions?.antigravity
          : engine === "grok"
            ? normalizeGrokModelOptions(model, modelOptions?.grok)
            : engine === "droid"
              ? modelOptions?.droid
              : engine === "kilo"
                ? modelOptions?.kilo
                : engine === "cursor"
                  ? modelOptions?.cursor
                  : engine === "opencode"
                    ? modelOptions?.opencode
                    : engine === "oa"
                      ? modelOptions?.oa
                      : engine === "pi"
                        ? modelOptions?.pi
                        : undefined;
  const normalizedOptions =
    engine === "antigravity" && hasLegacyAntigravityEffort
      ? {
          reasoningEffort: modelOptions?.antigravity?.reasoningEffort ?? antigravityLegacyEffort,
        }
      : options;
  return makeEngineSelection(
    engine,
    model,
    normalizedOptions,
    engine === "claude" && typeof candidate?.supportsAutoMode === "boolean"
      ? candidate.supportsAutoMode
      : undefined,
  );
}

export function reconcileProviderScopedEngineSelection(
  requested: EngineSelection,
  current: EngineSelection | null | undefined,
): EngineSelection {
  if (requested.options !== undefined || current?.engine !== requested.engine) {
    return requested;
  }
  if (current.model === requested.model) {
    const currentSupportsAutoMode =
      current.engine === "claude" ? current.supportsAutoMode : undefined;
    return makeEngineSelection(
      requested.engine,
      requested.model,
      current.options,
      requested.engine === "claude"
        ? (requested.supportsAutoMode ?? currentSupportsAutoMode)
        : undefined,
    );
  }
  if (current.engine !== "codex" && current.engine !== "cursor" && current.engine !== "claude") {
    return requested;
  }
  let preservedOptions = current.options;
  const effort =
    current.engine === "claude"
      ? current.options?.effort
      : current.engine === "codex" || current.engine === "cursor"
        ? current.options?.reasoningEffort
        : undefined;
  if (
    effort !== undefined &&
    classifyProviderReasoningEffortSupport({
      engine: requested.engine,
      model: requested.model,
      effort,
    }) !== "supported"
  ) {
    if (current.engine === "claude") {
      const { effort: _effort, ...remainingOptions } = current.options ?? {};
      preservedOptions = Object.keys(remainingOptions).length > 0 ? remainingOptions : undefined;
    } else if (current.engine === "codex" || current.engine === "cursor") {
      const { reasoningEffort: _reasoningEffort, ...remainingOptions } = current.options ?? {};
      preservedOptions = Object.keys(remainingOptions).length > 0 ? remainingOptions : undefined;
    }
  }
  return makeEngineSelection(
    requested.engine,
    requested.model,
    preservedOptions,
    requested.engine === "claude" ? requested.supportsAutoMode : undefined,
  );
}

export function stripNonStickyModelOptions(selection: EngineSelection): EngineSelection {
  if (
    selection.engine !== "claude" ||
    (!selection.options?.contextWindow && !selection.options?.autoCompactWindow)
  ) {
    return selection;
  }
  const {
    contextWindow: _contextWindow,
    autoCompactWindow: _autoCompactWindow,
    ...rest
  } = selection.options;
  return makeEngineSelection(
    selection.engine,
    selection.model,
    Object.keys(rest).length > 0 ? rest : undefined,
    selection.supportsAutoMode,
  );
}

export function sanitizeStickyEngineSelectionMap(
  map: Partial<Record<EngineKind, EngineSelection>>,
): Partial<Record<EngineKind, EngineSelection>> {
  const claude = map.claude;
  if (
    claude?.engine !== "claude" ||
    (!claude.options?.contextWindow && !claude.options?.autoCompactWindow)
  ) {
    return map;
  }
  return { ...map, claude: stripNonStickyModelOptions(claude) };
}

export function legacySyncEngineSelectionOptions(
  engineSelection: EngineSelection | null,
  modelOptions: EngineModelOptions | null | undefined,
): EngineSelection | null {
  if (engineSelection === null) {
    return null;
  }
  const normalizedOptions =
    engineSelection.engine === "grok"
      ? normalizeGrokModelOptions(engineSelection.model, modelOptions?.grok)
      : modelOptions?.[engineSelection.engine];
  return makeEngineSelection(
    engineSelection.engine,
    engineSelection.model,
    normalizedOptions,
    engineSelection.engine === "claude" ? engineSelection.supportsAutoMode : undefined,
  );
}

export function legacyMergeEngineSelectionIntoProviderModelOptions(
  engineSelection: EngineSelection | null,
  currentModelOptions: EngineModelOptions | null | undefined,
): EngineModelOptions | null {
  if (engineSelection?.options === undefined) {
    return normalizeProviderModelOptions(currentModelOptions);
  }
  return legacyReplaceProviderModelOptions(
    normalizeProviderModelOptions(currentModelOptions),
    engineSelection.engine,
    engineSelection.options,
  );
}

function legacyReplaceProviderModelOptions(
  currentModelOptions: EngineModelOptions | null | undefined,
  engine: EngineKind,
  nextProviderOptions: EngineModelOptions[EngineKind] | null | undefined,
): EngineModelOptions | null {
  const { [engine]: _discardedProviderModelOptions, ...otherProviderModelOptions } =
    currentModelOptions ?? {};
  const normalizedNextProviderOptions = normalizeProviderModelOptions(
    { [engine]: nextProviderOptions },
    engine,
  );

  return normalizeProviderModelOptions({
    ...otherProviderModelOptions,
    ...(normalizedNextProviderOptions ? normalizedNextProviderOptions : {}),
  });
}

export function legacyToEngineSelectionByEngine(
  engineSelection: EngineSelection | null,
  modelOptions: EngineModelOptions | null | undefined,
): Partial<Record<EngineKind, EngineSelection>> {
  const result: Partial<Record<EngineKind, EngineSelection>> = {};
  // Add entries from the options bag (for non-active engines)
  if (modelOptions) {
    for (const engine of ENGINE_KINDS) {
      const options = modelOptions[engine];
      if (options && Object.keys(options).length > 0) {
        const model =
          engineSelection?.engine === engine ? engineSelection.model : getDefaultModel(engine);
        if (model) {
          result[engine] = makeEngineSelection(
            engine,
            model,
            engine === "grok" ? normalizeGrokModelOptions(model, modelOptions.grok) : options,
          );
        }
      }
    }
  }
  // Add/overwrite the active selection (it's authoritative for its engine)
  if (engineSelection) {
    result[engineSelection.engine] = engineSelection;
  }
  return result;
}

export function deriveEffectiveComposerModelState(input: {
  draft:
    | Pick<ComposerThreadDraftState, "engineSelectionByEngine" | "activeEngine">
    | null
    | undefined;
  selectedEngine: EngineKind;
  threadEngineSelection: EngineSelection | null | undefined;
  projectEngineSelection: EngineSelection | null | undefined;
  stickyEngineSelection?: EngineSelection | null | undefined;
  runtimeCatalogFallbackModel?: ModelSlug | null | undefined;
  customModelsByEngine: Partial<Record<EngineKind, readonly string[]>>;
  availableModelOptionsByEngine?: Partial<
    Record<EngineKind, ReadonlyArray<{ slug: string; name: string }>>
  >;
}): EffectiveComposerModelState {
  const resolveAvailableModel = (candidate: string | null | undefined): ModelSlug | null => {
    const availableOptions = input.availableModelOptionsByEngine?.[input.selectedEngine];
    if (!availableOptions || availableOptions.length === 0) {
      return null;
    }
    return resolveSelectableModel(input.selectedEngine, candidate, availableOptions);
  };
  const activeSelection = input.draft?.engineSelectionByEngine?.[input.selectedEngine];
  const selectionCandidates = [
    activeSelection,
    input.threadEngineSelection?.engine === input.selectedEngine
      ? input.threadEngineSelection
      : null,
    input.projectEngineSelection?.engine === input.selectedEngine
      ? input.projectEngineSelection
      : null,
    input.stickyEngineSelection?.engine === input.selectedEngine
      ? input.stickyEngineSelection
      : null,
  ] as const;
  let selectedModel: ModelSlug | null = null;
  let selectedSource: EngineSelection | null = null;
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
    input.selectedEngine === "oa" || input.selectedEngine === "pi";
  if (!(requiresExactRuntimeCatalogSelection && hasRememberedExactSelection)) {
    selectedModel ??=
      input.runtimeCatalogFallbackModel !== undefined
        ? resolveAvailableModel(input.runtimeCatalogFallbackModel)
        : (resolveAvailableModel(getDefaultModel(input.selectedEngine)) ??
          input.availableModelOptionsByEngine?.[input.selectedEngine]?.[0]?.slug ??
          null);
  }

  const inheritedModelOptions = deriveEffectiveComposerModelOptions(input);
  const modelOptions = legacyReplaceProviderModelOptions(
    inheritedModelOptions,
    input.selectedEngine,
    selectedSource?.options,
  );

  return {
    selectedModel,
    modelOptions,
  };
}

export function resolvePreferredComposerEngineSelection(input: {
  draft:
    | Pick<ComposerThreadDraftState, "engineSelectionByEngine" | "activeEngine">
    | null
    | undefined;
  threadEngineSelection: EngineSelection | null | undefined;
  projectEngineSelection: EngineSelection | null | undefined;
  defaultEngine?: EngineKind | null | undefined;
}): EngineSelection | null {
  const draftProviderWithSelection =
    ENGINE_KINDS.find((engine) => input.draft?.engineSelectionByEngine?.[engine] !== undefined) ??
    null;
  const preferredProvider =
    input.draft?.activeEngine ??
    draftProviderWithSelection ??
    input.threadEngineSelection?.engine ??
    input.projectEngineSelection?.engine ??
    input.defaultEngine ??
    "codex";

  return (
    input.draft?.engineSelectionByEngine?.[preferredProvider] ??
    (input.threadEngineSelection?.engine === preferredProvider
      ? input.threadEngineSelection
      : null) ??
    (input.projectEngineSelection?.engine === preferredProvider
      ? input.projectEngineSelection
      : null) ??
    (() => {
      const model = getDefaultModel(preferredProvider);
      return model ? { engine: preferredProvider, model } : null;
    })()
  );
}
