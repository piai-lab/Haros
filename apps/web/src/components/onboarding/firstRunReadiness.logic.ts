import type { EngineSelection, EngineKind } from "@harnessos/contracts";

export type PassiveModelServicesState = "unknown" | "empty" | "configured" | "error";

export type FirstRunReadinessState =
  | "first-run"
  | "deferred"
  | "ready"
  | "recover-engine"
  | "recover-model-service"
  | "unknown";

export function hasRememberedExactModelBinding(input: {
  readonly engines: readonly EngineKind[];
  readonly explicitExactEngineSelections: Partial<Record<EngineKind, EngineSelection>>;
}): boolean {
  return input.engines.some((engine) => {
    const selection = input.explicitExactEngineSelections[engine];
    return selection?.engine === engine && selection.model.trim().length > 0;
  });
}

export function deriveFirstRunReadinessState(input: {
  readonly factsSettled: boolean;
  readonly hasUsableExactBinding: boolean;
  readonly hasRememberedIndependentEngineBinding: boolean;
  readonly hasRememberedHarnessOSBinding: boolean;
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
  if (input.hasRememberedHarnessOSBinding || input.passiveModelServicesState === "configured") {
    return "recover-model-service";
  }

  return input.deferred ? "deferred" : "first-run";
}
