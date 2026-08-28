import type { EngineKind, EngineModelDescriptor } from "@harnessos/contracts";
import { getModelCapabilities, hasEffortLevel, trimOrNull } from "@harnessos/shared/model";

export type CodexReasoningEffortSupport = "supported" | "unsupported" | "unknown";

// Runtime discovery is authoritative when present. Before it arrives, known static
// models can still validate built-in efforts; genuinely unknown models remain open
// to forward-compatible runtime-only values.
export function classifyProviderReasoningEffortSupport(input: {
  engine: EngineKind;
  model: string | null | undefined;
  effort: string | null | undefined;
  runtimeModel?: EngineModelDescriptor | undefined;
}): CodexReasoningEffortSupport {
  const effort = trimOrNull(input.effort);
  if (!effort) {
    return "unsupported";
  }

  const runtimeEfforts = input.runtimeModel?.supportedReasoningEfforts;
  if (runtimeEfforts && runtimeEfforts.length > 0) {
    return runtimeEfforts.some((candidate) => candidate.value === effort)
      ? "supported"
      : "unsupported";
  }

  const staticCapabilities = getModelCapabilities(input.engine, input.model);
  if (staticCapabilities.reasoningEffortLevels.length === 0) {
    return "unknown";
  }
  return hasEffortLevel(staticCapabilities, effort) ? "supported" : "unsupported";
}

export function classifyCodexReasoningEffortSupport(
  input: Omit<Parameters<typeof classifyProviderReasoningEffortSupport>[0], "engine">,
): CodexReasoningEffortSupport {
  return classifyProviderReasoningEffortSupport({ ...input, engine: "codex" });
}
