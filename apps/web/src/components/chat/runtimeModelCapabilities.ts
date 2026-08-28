// FILE: runtimeModelCapabilities.ts
// Purpose: Bridges runtime-discovered model metadata into composer capabilities without replacing static defaults wholesale.
// Layer: Chat composer helpers
// Exports: runtime model lookup and Codex capability overrides derived from engine discovery responses.

import type {
  EffortOption,
  ModelCapabilities,
  EngineKind,
  EngineModelDescriptor,
} from "@harnessos/contracts";
import {
  getDefaultEffort,
  getModelCapabilities,
  normalizeModelSlug,
  trimOrNull,
} from "@harnessos/shared/model";
import { normalizeCursorModelVariantBaseId } from "../../cursorModelVariants";

function runtimeEffortLabel(value: string): string {
  switch (value) {
    case "none":
      return "None";
    case "minimal":
      return "Minimal";
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "xhigh":
      return "Extra High";
    case "max":
      return "Max";
    default:
      return value
        .split(/[-_\s]+/u)
        .filter((segment) => segment.length > 0)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
  }
}

// Matches the selected model to its runtime descriptor after engine-specific normalization.
export function resolveRuntimeModelDescriptor(input: {
  engine: EngineKind;
  model: string | null | undefined;
  runtimeModels: ReadonlyArray<EngineModelDescriptor> | null | undefined;
}): EngineModelDescriptor | undefined {
  const { engine, model, runtimeModels } = input;
  if (!runtimeModels?.length) {
    return undefined;
  }

  const normalizedModel = normalizeModelSlug(model, engine) ?? trimOrNull(model);
  if (!normalizedModel) {
    return undefined;
  }

  return runtimeModels.find((candidate) => {
    const normalizedCandidate = normalizeModelSlug(candidate.slug, engine) ?? candidate.slug;
    const normalizedResolvedModel =
      normalizeModelSlug(candidate.resolvedModel, engine) ?? candidate.resolvedModel;
    if (normalizedCandidate === normalizedModel || normalizedResolvedModel === normalizedModel) {
      return true;
    }
    return (
      engine === "cursor" &&
      normalizeCursorModelVariantBaseId(normalizedCandidate) ===
        normalizeCursorModelVariantBaseId(normalizedModel)
    );
  });
}

// Reuses static capability flags but lets runtime-discovered models override exposed effort menus.
export function getRuntimeAwareModelCapabilities(input: {
  engine: EngineKind;
  model: string | null | undefined;
  runtimeModel?: EngineModelDescriptor | undefined;
}): ModelCapabilities {
  const staticCapabilities = getModelCapabilities(input.engine, input.model);
  // Runtime discovery is authoritative when available; the static table is only a startup fallback.
  const supportsFastMode =
    (input.engine === "codex" || input.engine === "cursor") && input.runtimeModel
      ? input.runtimeModel.supportsFastMode === true
      : staticCapabilities.supportsFastMode;
  const supportsThinkingToggle =
    input.runtimeModel?.supportsThinkingToggle ?? staticCapabilities.supportsThinkingToggle;
  const contextWindowOptions =
    input.runtimeModel?.contextWindowOptions?.map((option) => ({
      value: option.value,
      label: option.label,
      ...(option.isDefault === true ? { isDefault: true as const } : {}),
    })) ?? staticCapabilities.contextWindowOptions;
  const optionDescriptors =
    input.runtimeModel?.optionDescriptors ?? staticCapabilities.optionDescriptors;
  const runtimeEfforts = input.runtimeModel?.supportedReasoningEfforts;
  // Engines with dynamic catalogs, including Droid, expose model-specific effort ladders here.
  if (
    (input.engine !== "codex" &&
      input.engine !== "cursor" &&
      input.engine !== "antigravity" &&
      input.engine !== "grok" &&
      input.engine !== "droid" &&
      input.engine !== "kilo" &&
      input.engine !== "opencode" &&
      input.engine !== "oa" &&
      input.engine !== "pi") ||
    !runtimeEfforts ||
    runtimeEfforts.length === 0
  ) {
    return {
      ...staticCapabilities,
      ...(optionDescriptors ? { optionDescriptors } : {}),
      supportsFastMode,
      supportsThinkingToggle,
      contextWindowOptions,
    };
  }

  const staticDefaultEffort = getDefaultEffort(staticCapabilities);
  const runtimeDefaultEffort =
    trimOrNull(input.runtimeModel?.defaultReasoningEffort) ??
    (staticDefaultEffort && runtimeEfforts.some((effort) => effort.value === staticDefaultEffort)
      ? staticDefaultEffort
      : null);

  const runtimeOptions: EffortOption[] = runtimeEfforts.map((effort) => {
    const description = trimOrNull(effort.description);
    return {
      value: effort.value,
      label: trimOrNull(effort.label) ?? runtimeEffortLabel(effort.value),
      ...(description ? { description } : {}),
      ...(effort.value === runtimeDefaultEffort ? { isDefault: true as const } : {}),
    };
  });

  if (input.engine === "kilo" || input.engine === "opencode") {
    return {
      ...staticCapabilities,
      ...(optionDescriptors ? { optionDescriptors } : {}),
      variantOptions: runtimeOptions,
      supportsThinkingToggle,
      contextWindowOptions,
    };
  }

  return {
    ...staticCapabilities,
    ...(optionDescriptors ? { optionDescriptors } : {}),
    supportsFastMode,
    supportsThinkingToggle,
    contextWindowOptions,
    reasoningEffortLevels: runtimeOptions,
  };
}
