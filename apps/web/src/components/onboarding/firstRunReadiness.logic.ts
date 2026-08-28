import type { ModelSelection, ProviderKind } from "@harnessos/contracts";

export type PassiveModelServicesState = "unknown" | "empty" | "configured" | "error";

export type FirstRunReadinessState =
  | "first-run"
  | "deferred"
  | "ready"
  | "recover-engine"
  | "recover-model-service"
  | "unknown";

export function hasRememberedExactModelBinding(input: {
  readonly providers: readonly ProviderKind[];
  readonly explicitExactModelSelections: Partial<Record<ProviderKind, ModelSelection>>;
}): boolean {
  return input.providers.some((provider) => {
    const selection = input.explicitExactModelSelections[provider];
    return selection?.provider === provider && selection.model.trim().length > 0;
  });
}

export function deriveFirstRunReadinessState(input: {
  readonly factsSettled: boolean;
  readonly hasUsableExactBinding: boolean;
  readonly hasRememberedIndependentEngineBinding: boolean;
  readonly hasRememberedOmniMindBinding: boolean;
  readonly modelServicesCapability: boolean | null;
  readonly modelServicesTransport:
    | "open"
    | "closed"
    | "connecting"
    | "incompatible"
    | "disposed"
    | null;
  readonly passiveModelServicesState: PassiveModelServicesState;
  readonly deferred: boolean;
}): FirstRunReadinessState {
  // A proven sendable binding always wins. Model-services availability is
  // irrelevant when another Engine can already send.
  if (input.hasUsableExactBinding) return "ready";

  if (
    !input.factsSettled ||
    input.modelServicesCapability !== true ||
    input.modelServicesTransport !== "open" ||
    input.passiveModelServicesState === "unknown" ||
    input.passiveModelServicesState === "error"
  ) {
    return "unknown";
  }

  if (input.hasRememberedIndependentEngineBinding) return "recover-engine";
  if (input.hasRememberedOmniMindBinding || input.passiveModelServicesState === "configured") {
    return "recover-model-service";
  }

  return input.deferred ? "deferred" : "first-run";
}
