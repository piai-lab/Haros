import type {
  ModelSelection,
  OrchestrationSession,
  ProviderInteractionMode,
  RuntimeMode,
  ThreadId,
} from "@harnessos/contracts";
import { Equal } from "effect";

export function deriveTurnStartModelSelection(input: {
  readonly currentModelSelection: ModelSelection;
  readonly requestedModelSelection: ModelSelection | undefined;
  readonly canAdoptRequestedProvider: boolean;
}): ModelSelection {
  const requestedModelSelection = input.requestedModelSelection;
  return requestedModelSelection !== undefined &&
    (requestedModelSelection.provider === input.currentModelSelection.provider ||
      input.canAdoptRequestedProvider)
    ? requestedModelSelection
    : input.currentModelSelection;
}

export function shouldDeferTurnStartBindingProjection(input: {
  readonly currentModelSelection: ModelSelection;
  readonly currentRuntimeMode: RuntimeMode;
  readonly currentInteractionMode: ProviderInteractionMode;
  readonly currentSession: OrchestrationSession | null;
  readonly requestedModelSelection: ModelSelection | undefined;
  readonly requestedRuntimeMode: RuntimeMode;
  readonly requestedInteractionMode: ProviderInteractionMode;
  readonly canAdoptRequestedProvider: boolean;
}): boolean {
  if (input.canAdoptRequestedProvider || input.currentSession === null) {
    return false;
  }

  return (
    (input.requestedModelSelection !== undefined &&
      !Equal.equals(input.requestedModelSelection, input.currentModelSelection)) ||
    input.requestedRuntimeMode !== input.currentRuntimeMode ||
    input.requestedInteractionMode !== input.currentInteractionMode
  );
}

export function turnStartBindingMatchesCommitted(input: {
  readonly currentModelSelection: ModelSelection;
  readonly currentRuntimeMode: RuntimeMode;
  readonly currentInteractionMode: ProviderInteractionMode;
  readonly requestedModelSelection: ModelSelection;
  readonly requestedRuntimeMode: RuntimeMode;
  readonly requestedInteractionMode: ProviderInteractionMode;
}): boolean {
  return (
    Equal.equals(input.currentModelSelection, input.requestedModelSelection) &&
    input.currentRuntimeMode === input.requestedRuntimeMode &&
    input.currentInteractionMode === input.requestedInteractionMode
  );
}

export function deriveTurnStartSession(input: {
  readonly threadId: ThreadId;
  readonly currentSession: OrchestrationSession | null;
  readonly providerName: OrchestrationSession["providerName"];
  readonly requestedRuntimeMode: RuntimeMode;
  readonly requestedAt: string;
}): OrchestrationSession | null {
  if (input.currentSession?.status === "starting" || input.currentSession?.status === "running") {
    return null;
  }

  return {
    threadId: input.threadId,
    status: "starting",
    providerName: input.currentSession?.providerName ?? input.providerName,
    runtimeMode: input.currentSession?.runtimeMode ?? input.requestedRuntimeMode,
    activeTurnId: null,
    lastError: null,
    updatedAt: input.requestedAt,
  };
}
