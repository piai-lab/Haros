// FILE: composerTraits.ts
// Purpose: Centralizes composer trait resolution so menu surfaces read the same model capability state.
// Layer: Chat composer state helpers
// Depends on: shared model capability helpers and engine model option types.

import {
  type EngineOptionDescriptor,
  type EngineKind,
  type EngineModelDescriptor,
} from "@harnessos/contracts";
import {
  applyClaudePromptEffortPrefix,
  getEngineOptionCurrentValue,
  getEngineOptionDescriptors,
  isClaudeUltrathinkPrompt,
  trimOrNull,
} from "@harnessos/shared/model";

import { buildEngineOptionPatch, type EngineOptions } from "../../engineModelOptions";
import { getRuntimeAwareModelCapabilities } from "./runtimeModelCapabilities";
import type { StarredModel } from "../../lib/starredModels";

const ULTRATHINK_PROMPT_PREFIX = "Ultrathink:\n";

function getCursorBooleanModelParameter(
  model: string | null | undefined,
  key: "fast" | "thinking",
): boolean | null {
  const slug = typeof model === "string" ? model.trim().toLowerCase() : "";
  const match = typeof model === "string" ? model.match(/\[([^\]]*)\]$/u) : null;
  if (!match?.[1]) {
    if (key === "fast" && slug.endsWith("-fast")) {
      return true;
    }
    if (key === "thinking" && slug.includes("-thinking")) {
      return true;
    }
    return null;
  }
  for (const part of match[1].split(",")) {
    const [rawKey, rawValue] = part.split("=");
    if (rawKey?.trim() !== key) {
      continue;
    }
    const value = rawValue?.trim().toLowerCase();
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
  }
  return null;
}

function asSelectDescriptor(
  descriptor: EngineOptionDescriptor | undefined,
): Extract<EngineOptionDescriptor, { type: "select" }> | null {
  return descriptor?.type === "select" ? descriptor : null;
}

function asBooleanDescriptor(
  descriptor: EngineOptionDescriptor | undefined,
): Extract<EngineOptionDescriptor, { type: "boolean" }> | null {
  return descriptor?.type === "boolean" ? descriptor : null;
}

function primaryTraitSelectDescriptor(
  descriptors: ReadonlyArray<EngineOptionDescriptor>,
): Extract<EngineOptionDescriptor, { type: "select" }> | null {
  const descriptor = descriptors.find(
    (candidate): candidate is Extract<EngineOptionDescriptor, { type: "select" }> =>
      candidate.type === "select" &&
      candidate.id !== "contextWindow" &&
      candidate.id !== "autoCompactWindow",
  );
  return descriptor && descriptor.options.length > 1 ? descriptor : null;
}

function selectOptions(descriptor: Extract<EngineOptionDescriptor, { type: "select" }> | null) {
  return (
    descriptor?.options.map((option) => ({
      value: option.id,
      label: option.label,
      ...(option.description ? { description: option.description } : {}),
      ...(option.isDefault ? { isDefault: true as const } : {}),
    })) ?? []
  );
}

// Merges legacy capability flags with descriptor-specific prompt injection hints.
function promptInjectedValuesForDescriptor(
  capsPromptInjectedValues: ReadonlyArray<string>,
  descriptor: Extract<EngineOptionDescriptor, { type: "select" }> | null,
) {
  return Array.from(
    new Set([...capsPromptInjectedValues, ...(descriptor?.promptInjectedValues ?? [])]),
  );
}

// Resolve the currently selected composer traits from capabilities plus draft overrides.
export function getComposerTraitSelection(
  engine: EngineKind | null,
  model: string | null | undefined,
  prompt: string,
  modelOptions: EngineOptions | null | undefined,
  runtimeModel?: EngineModelDescriptor,
) {
  const caps = getRuntimeAwareModelCapabilities({ engine, model, runtimeModel });
  const descriptors = getEngineOptionDescriptors({
    engine,
    caps,
    selections: modelOptions as Record<string, unknown> | undefined,
  });
  const primarySelectDescriptor = primaryTraitSelectDescriptor(descriptors);
  const contextWindowDescriptor = asSelectDescriptor(
    descriptors.find((descriptor) => descriptor.id === "autoCompactWindow") ??
      descriptors.find((descriptor) => descriptor.id === "contextWindow"),
  );
  const fastModeDescriptor = asBooleanDescriptor(
    descriptors.find((descriptor) => descriptor.id === "fastMode"),
  );
  const thinkingDescriptor = asBooleanDescriptor(
    descriptors.find((descriptor) => descriptor.id === "thinking"),
  );
  const effortLevels = selectOptions(primarySelectDescriptor);
  const contextWindowOptions = selectOptions(contextWindowDescriptor);
  const defaultEffort =
    primarySelectDescriptor?.options.find((option) => option.isDefault)?.id ??
    primarySelectDescriptor?.options[0]?.id ??
    null;
  const defaultContextWindow =
    contextWindowDescriptor?.options.find((option) => option.isDefault)?.id ??
    contextWindowDescriptor?.options[0]?.id ??
    null;
  const resolvedEffort = trimOrNull(
    getEngineOptionCurrentValue(primarySelectDescriptor) as string | undefined,
  );
  const resolvedContextWindow = trimOrNull(
    getEngineOptionCurrentValue(contextWindowDescriptor) as string | undefined,
  );
  const promptInjectedValues = promptInjectedValuesForDescriptor(
    caps.promptInjectedEffortLevels,
    primarySelectDescriptor,
  );
  const isPromptInjected = resolvedEffort ? promptInjectedValues.includes(resolvedEffort) : false;
  const effort = resolvedEffort && !isPromptInjected ? resolvedEffort : defaultEffort;

  const thinkingEnabled = thinkingDescriptor
    ? engine === "cursor"
      ? (thinkingDescriptor.currentValue ??
        getCursorBooleanModelParameter(model, "thinking") ??
        true)
      : (thinkingDescriptor.currentValue ?? true)
    : null;

  const fastModeEnabled =
    Boolean(fastModeDescriptor) &&
    (fastModeDescriptor?.currentValue ??
      (engine === "cursor" ? getCursorBooleanModelParameter(model, "fast") : false)) === true;

  const contextWindow = resolvedContextWindow ?? defaultContextWindow;

  const ultrathinkPromptControlled =
    promptInjectedValues.length > 0 && isClaudeUltrathinkPrompt(prompt);

  return {
    caps,
    descriptors,
    primarySelectDescriptor,
    fastModeDescriptor,
    thinkingDescriptor,
    contextWindowDescriptor,
    promptInjectedValues,
    defaultEffort,
    effort,
    effortLevels,
    thinkingEnabled,
    fastModeEnabled,
    contextWindowOptions,
    contextWindow,
    defaultContextWindow,
    ultrathinkPromptControlled,
  };
}

// Human label for the currently selected reasoning/thinking trait, shared by the
// composer trigger and any surface that summarizes a thread's model selection.
export function resolveComposerTraitStatusLabel(
  selection: Pick<
    ReturnType<typeof getComposerTraitSelection>,
    "effort" | "effortLevels" | "thinkingEnabled" | "ultrathinkPromptControlled"
  >,
  labels?: {
    readonly ultrathink: string;
    readonly thinkingOn: string;
    readonly thinkingOff: string;
  },
): string | null {
  if (selection.ultrathinkPromptControlled) {
    return labels?.ultrathink ?? "Ultrathink";
  }
  const effortLabel = selection.effort
    ? (selection.effortLevels.find((level) => level.value === selection.effort)?.label ??
      selection.effort)
    : null;
  if (effortLabel) {
    return effortLabel;
  }
  return selection.thinkingEnabled !== null
    ? selection.thinkingEnabled
      ? (labels?.thinkingOn ?? "Thinking On")
      : (labels?.thinkingOff ?? "Thinking Off")
    : null;
}

// A model exposes a speed control either through an explicit descriptor or the
// legacy capability flag; every surface must agree on that test.
export function supportsComposerFastModeControl(
  selection: Pick<ReturnType<typeof getComposerTraitSelection>, "caps" | "fastModeDescriptor">,
): boolean {
  return selection.fastModeDescriptor !== null || selection.caps.supportsFastMode;
}

// Fast mode is only worth surfacing when the model exposes the control and it is on.
export function showsComposerFastModeBadge(
  selection: Pick<
    ReturnType<typeof getComposerTraitSelection>,
    "caps" | "fastModeDescriptor" | "fastModeEnabled"
  >,
): boolean {
  return supportsComposerFastModeControl(selection) && selection.fastModeEnabled;
}

export function hasVisibleComposerTraitControls(
  selection: Pick<
    ReturnType<typeof getComposerTraitSelection>,
    "caps" | "effortLevels" | "thinkingEnabled" | "contextWindowOptions" | "fastModeDescriptor"
  >,
  options?: {
    includeFastMode?: boolean;
  },
): boolean {
  return (
    selection.effortLevels.length > 0 ||
    selection.thinkingEnabled !== null ||
    selection.contextWindowOptions.length > 1 ||
    ((options?.includeFastMode ?? true) && supportsComposerFastModeControl(selection))
  );
}

function fallbackEffortOptionId(engine: EngineKind): string {
  if (engine === "kilo" || engine === "opencode") return "variant";
  if (engine === "pi") return "thinkingLevel";
  if (engine === "claude") return "effort";
  return "reasoningEffort";
}

export type ComposerEffortChangePlan =
  | { readonly kind: "prompt"; readonly prompt: string }
  | { readonly kind: "options"; readonly patch: Record<string, unknown> };

export function planComposerEffortChange(input: {
  engine: EngineKind;
  selection: Pick<
    ReturnType<typeof getComposerTraitSelection>,
    | "effortLevels"
    | "promptInjectedValues"
    | "primarySelectDescriptor"
    | "ultrathinkPromptControlled"
  >;
  prompt: string;
  value: string;
}): ComposerEffortChangePlan | null {
  const { engine, selection, prompt, value } = input;
  if (selection.ultrathinkPromptControlled) return null;
  if (!value) return null;
  const nextOption = selection.effortLevels.find((option) => option.value === value);
  if (!nextOption) return null;
  if (selection.promptInjectedValues.includes(nextOption.value)) {
    return {
      kind: "prompt",
      prompt:
        prompt.trim().length === 0
          ? ULTRATHINK_PROMPT_PREFIX
          : applyClaudePromptEffortPrefix(prompt, "ultrathink"),
    };
  }
  const optionId = selection.primarySelectDescriptor?.id ?? fallbackEffortOptionId(engine);
  return { kind: "options", patch: buildEngineOptionPatch(engine, optionId, nextOption.value) };
}

export function canRestoreStarredComposerTraits(
  entry: StarredModel,
  runtimeModel?: EngineModelDescriptor,
): boolean {
  const selection = getComposerTraitSelection(
    entry.engine,
    entry.model,
    "",
    undefined,
    runtimeModel,
  );
  return (
    (entry.effort === null ||
      selection.effortLevels.some((option) => option.value === entry.effort)) &&
    (entry.fastMode === null || Boolean(selection.fastModeDescriptor)) &&
    (entry.thinking === null || Boolean(selection.thinkingDescriptor))
  );
}

export function restoreStarredComposerTraits(input: {
  entry: StarredModel;
  prompt: string;
  options: EngineOptions | undefined;
  runtimeModel?: EngineModelDescriptor | undefined;
}): { prompt: string; options: EngineOptions } {
  const { entry } = input;
  const selection = getComposerTraitSelection(
    entry.engine,
    entry.model,
    input.prompt,
    input.options,
    input.runtimeModel,
  );
  let prompt = input.prompt;
  const options: Record<string, unknown> = { ...input.options };
  if (entry.effort !== null) {
    const plan = planComposerEffortChange({
      engine: entry.engine,
      selection,
      prompt,
      value: entry.effort,
    });
    if (plan?.kind === "prompt") prompt = plan.prompt;
    if (plan?.kind === "options") Object.assign(options, plan.patch);
  }
  if (entry.fastMode !== null && selection.fastModeDescriptor)
    Object.assign(
      options,
      buildEngineOptionPatch(entry.engine, selection.fastModeDescriptor.id, entry.fastMode),
    );
  if (entry.thinking !== null && selection.thinkingDescriptor)
    Object.assign(
      options,
      buildEngineOptionPatch(entry.engine, selection.thinkingDescriptor.id, entry.thinking),
    );
  return { prompt, options: options as EngineOptions };
}

export function resolveComposerEffortLadderIndex(
  selection: Pick<
    ReturnType<typeof getComposerTraitSelection>,
    "effort" | "effortLevels" | "promptInjectedValues" | "ultrathinkPromptControlled"
  >,
): number {
  if (selection.ultrathinkPromptControlled) {
    const injectedIndex = selection.effortLevels.findIndex((level) =>
      selection.promptInjectedValues.includes(level.value),
    );
    if (injectedIndex >= 0) return injectedIndex;
  }
  const index = selection.effortLevels.findIndex((level) => level.value === selection.effort);
  return index >= 0 ? index : 0;
}
