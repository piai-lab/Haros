// FILE: composerEngineRegistry.tsx
// Purpose: Centralizes engine-specific composer state and trait picker rendering.
// Layer: Chat composer orchestration
// Depends on: shared model helpers, trait picker components, and runtime model discovery metadata.

import {
  type ModelSlug,
  type EngineAgentDescriptor,
  type EngineKind,
  type EngineModelDescriptor,
  type EngineModelOptions,
  type ThreadId,
} from "@harnessos/contracts";
import {
  getDefaultEffort,
  hasEffortLevel,
  isClaudeUltrathinkPrompt,
  normalizeAntigravityModelOptions,
  normalizeClaudeModelOptions,
  normalizeCursorModelOptions,
  normalizeOpenCodeModelOptions,
  normalizePiModelOptions,
  resolveLabeledOptionValue,
  trimOrNull,
} from "@harnessos/shared/model";
import type { ReactNode } from "react";
import type { EngineOptions } from "../../engineModelOptions";
import { classifyCodexReasoningEffortSupport } from "../../lib/codexReasoningEffort";
import { TraitsMenuContent, TraitsPicker } from "./TraitsPicker";
import { getComposerTraitSelection, hasVisibleComposerTraitControls } from "./composerTraits";
import { getRuntimeAwareModelCapabilities } from "./runtimeModelCapabilities";

export type ComposerEngineStateInput = {
  engine: EngineKind;
  model: ModelSlug | null;
  runtimeModel?: EngineModelDescriptor | undefined;
  prompt: string;
  modelOptions: EngineModelOptions | null | undefined;
};

export type ComposerEngineState = {
  engine: EngineKind;
  promptEffort: string | null;
  modelOptionsForDispatch: EngineOptions | undefined;
  composerFrameClassName?: string;
  composerSurfaceClassName?: string;
  modelPickerIconClassName?: string;
};

type EngineTraitRenderInput = {
  threadId: ThreadId;
  model: ModelSlug;
  runtimeModel?: EngineModelDescriptor | undefined;
  runtimeModels?: ReadonlyArray<EngineModelDescriptor> | null | undefined;
  runtimeAgents?: ReadonlyArray<EngineAgentDescriptor> | null | undefined;
  modelOptions: EngineOptions | undefined;
  prompt: string;
  includeFastMode?: boolean;
  onPromptChange: (prompt: string) => void;
  onSelectionComplete?: () => void;
};

type EngineTraitPickerRenderInput = EngineTraitRenderInput & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  shortcutLabel?: string | null;
};

function renderTraitsMenuContentForEngine(
  engine: EngineKind,
  input: EngineTraitRenderInput,
): ReactNode {
  return (
    <TraitsMenuContent
      engine={engine}
      threadId={input.threadId}
      model={input.model}
      runtimeModel={input.runtimeModel}
      runtimeModels={input.runtimeModels}
      runtimeAgents={input.runtimeAgents}
      modelOptions={input.modelOptions}
      prompt={input.prompt}
      {...(input.includeFastMode === undefined ? {} : { includeFastMode: input.includeFastMode })}
      onPromptChange={input.onPromptChange}
      {...(input.onSelectionComplete ? { onSelectionComplete: input.onSelectionComplete } : {})}
    />
  );
}

function renderTraitsPickerForEngine(
  engine: EngineKind,
  input: EngineTraitPickerRenderInput,
): ReactNode {
  return (
    <TraitsPicker
      engine={engine}
      threadId={input.threadId}
      model={input.model}
      runtimeModel={input.runtimeModel}
      runtimeModels={input.runtimeModels}
      runtimeAgents={input.runtimeAgents}
      modelOptions={input.modelOptions}
      prompt={input.prompt}
      {...(input.open !== undefined ? { open: input.open } : {})}
      {...(input.onOpenChange ? { onOpenChange: input.onOpenChange } : {})}
      {...(input.shortcutLabel !== undefined ? { shortcutLabel: input.shortcutLabel } : {})}
      {...(input.includeFastMode === undefined ? {} : { includeFastMode: input.includeFastMode })}
      onPromptChange={input.onPromptChange}
    />
  );
}

function getEngineStateFromCapabilities(input: ComposerEngineStateInput): ComposerEngineState {
  const { engine, model, runtimeModel, prompt, modelOptions } = input;
  const caps = getRuntimeAwareModelCapabilities({ engine, model, runtimeModel });

  let rawEffort: string | null = null;
  let normalizedOptions: EngineOptions | undefined;

  switch (engine) {
    case "codex": {
      const engineOptions = modelOptions?.codex;
      rawEffort = trimOrNull(engineOptions?.reasoningEffort);
      const defaultReasoningEffort = getDefaultEffort(caps);
      const reasoningEffortSupport = classifyCodexReasoningEffortSupport({
        model,
        effort: rawEffort,
        ...(runtimeModel ? { runtimeModel } : {}),
      });
      const reasoningEffort =
        rawEffort &&
        reasoningEffortSupport !== "unsupported" &&
        rawEffort !== defaultReasoningEffort
          ? rawEffort
          : undefined;
      const fastModeEnabled = caps.supportsFastMode && engineOptions?.fastMode === true;
      const nextOptions = {
        ...(reasoningEffort ? { reasoningEffort } : {}),
        ...(fastModeEnabled ? { fastMode: true } : {}),
      };
      normalizedOptions = Object.keys(nextOptions).length > 0 ? nextOptions : undefined;
      break;
    }
    case "claude": {
      const engineOptions = modelOptions?.claude;
      rawEffort = trimOrNull(engineOptions?.effort);
      normalizedOptions = normalizeClaudeModelOptions(model, engineOptions);
      break;
    }
    case "cursor": {
      const engineOptions = modelOptions?.cursor;
      rawEffort = trimOrNull(engineOptions?.reasoningEffort);
      normalizedOptions = normalizeCursorModelOptions(model, engineOptions, caps);
      break;
    }
    case "antigravity": {
      const engineOptions = modelOptions?.antigravity;
      rawEffort = trimOrNull(engineOptions?.reasoningEffort);
      normalizedOptions = normalizeAntigravityModelOptions(model, engineOptions, caps);
      break;
    }
    case "grok": {
      const engineOptions = modelOptions?.grok;
      rawEffort = trimOrNull(engineOptions?.reasoningEffort);
      const defaultReasoningEffort = getDefaultEffort(caps);
      const reasoningEffort =
        rawEffort && hasEffortLevel(caps, rawEffort) && rawEffort !== defaultReasoningEffort
          ? engineOptions?.reasoningEffort
          : undefined;
      normalizedOptions = reasoningEffort ? { reasoningEffort } : undefined;
      break;
    }
    case "droid": {
      const engineOptions = modelOptions?.droid;
      rawEffort = trimOrNull(engineOptions?.reasoningEffort);
      // Droid's advertised "default" is the mutable current CLI preference.
      // Once the user selects an effort, always dispatch it explicitly.
      const reasoningEffort =
        rawEffort && hasEffortLevel(caps, rawEffort) ? engineOptions?.reasoningEffort : undefined;
      normalizedOptions = reasoningEffort ? { reasoningEffort } : undefined;
      break;
    }
    case "kilo":
    case "opencode": {
      const engineOptions = engine === "kilo" ? modelOptions?.kilo : modelOptions?.opencode;
      rawEffort = trimOrNull(engineOptions?.variant);
      const variantOptions = caps.variantOptions ?? [];
      const reasoningVariant =
        rawEffort && variantOptions.some((option) => option.value === rawEffort)
          ? rawEffort
          : undefined;
      const agent = trimOrNull(engineOptions?.agent);
      if (variantOptions.length > 0) {
        const nextOptions = {
          ...(reasoningVariant ? { variant: reasoningVariant } : {}),
          ...(agent ? { agent } : {}),
        };
        normalizedOptions = Object.keys(nextOptions).length > 0 ? nextOptions : undefined;
        break;
      }
      normalizedOptions = normalizeOpenCodeModelOptions(engineOptions);
      break;
    }
    case "oa":
    case "pi": {
      const engineOptions = engine === "oa" ? modelOptions?.oa : modelOptions?.pi;
      rawEffort = trimOrNull(engineOptions?.thinkingLevel);
      normalizedOptions = normalizePiModelOptions(engineOptions);
      break;
    }
    default:
      break;
  }

  const draftEffort = trimOrNull(rawEffort);
  const defaultEffort = getDefaultEffort(caps);
  const isPromptInjected = draftEffort
    ? caps.promptInjectedEffortLevels.includes(draftEffort)
    : false;
  const promptEffort =
    engine === "kilo" || engine === "opencode"
      ? resolveLabeledOptionValue(caps.variantOptions, draftEffort)
      : draftEffort &&
          !isPromptInjected &&
          (engine === "codex"
            ? classifyCodexReasoningEffortSupport({
                model,
                effort: draftEffort,
                ...(runtimeModel ? { runtimeModel } : {}),
              }) !== "unsupported"
            : hasEffortLevel(caps, draftEffort))
        ? draftEffort
        : defaultEffort && hasEffortLevel(caps, defaultEffort)
          ? defaultEffort
          : null;

  const ultrathinkActive =
    caps.promptInjectedEffortLevels.length > 0 && isClaudeUltrathinkPrompt(prompt);

  return {
    engine,
    promptEffort,
    modelOptionsForDispatch: normalizedOptions,
    ...(ultrathinkActive ? { composerFrameClassName: "ultrathink-frame" } : {}),
    ...(ultrathinkActive ? { modelPickerIconClassName: "ultrathink-chroma" } : {}),
  };
}

export function getComposerEngineState(input: ComposerEngineStateInput): ComposerEngineState {
  return getEngineStateFromCapabilities(input);
}

export function renderEngineTraitsMenuContent(input: {
  engine: EngineKind;
  threadId: ThreadId;
  model: ModelSlug;
  runtimeModel?: EngineModelDescriptor | undefined;
  runtimeModels?: ReadonlyArray<EngineModelDescriptor> | null | undefined;
  runtimeAgents?: ReadonlyArray<EngineAgentDescriptor> | null | undefined;
  modelOptions: EngineOptions | undefined;
  prompt: string;
  includeFastMode?: boolean;
  onPromptChange: (prompt: string) => void;
  onSelectionComplete?: () => void;
}): ReactNode {
  const selection = getComposerTraitSelection(
    input.engine,
    input.model,
    input.prompt,
    input.modelOptions,
    input.runtimeModel,
  );
  if (
    !hasVisibleComposerTraitControls(
      selection,
      input.includeFastMode === undefined ? undefined : { includeFastMode: input.includeFastMode },
    ) &&
    ((input.engine !== "kilo" && input.engine !== "opencode") ||
      (input.runtimeAgents?.length ?? 0) === 0)
  ) {
    return null;
  }
  return renderTraitsMenuContentForEngine(input.engine, input);
}

export function renderEngineTraitsPicker(input: {
  engine: EngineKind;
  threadId: ThreadId;
  model: ModelSlug;
  runtimeModel?: EngineModelDescriptor | undefined;
  runtimeModels?: ReadonlyArray<EngineModelDescriptor> | null | undefined;
  runtimeAgents?: ReadonlyArray<EngineAgentDescriptor> | null | undefined;
  modelOptions: EngineOptions | undefined;
  prompt: string;
  includeFastMode?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  shortcutLabel?: string | null;
  onPromptChange: (prompt: string) => void;
}): ReactNode {
  const selection = getComposerTraitSelection(
    input.engine,
    input.model,
    input.prompt,
    input.modelOptions,
    input.runtimeModel,
  );
  if (
    !hasVisibleComposerTraitControls(
      selection,
      input.includeFastMode === undefined ? undefined : { includeFastMode: input.includeFastMode },
    ) &&
    ((input.engine !== "kilo" && input.engine !== "opencode") ||
      (input.runtimeAgents?.length ?? 0) === 0)
  ) {
    return null;
  }
  return renderTraitsPickerForEngine(input.engine, input);
}
