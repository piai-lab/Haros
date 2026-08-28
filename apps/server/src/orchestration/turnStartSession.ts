import type {
  EngineSelection,
  OrchestrationSession,
  EngineInteractionMode,
  RuntimeMode,
  ThreadId,
} from "@harnessos/contracts";
import { Equal } from "effect";

export function deriveTurnStartEngineSelection(input: {
  readonly currentEngineSelection: EngineSelection;
  readonly requestedEngineSelection: EngineSelection | undefined;
  readonly canAdoptRequestedProvider: boolean;
}): EngineSelection {
  const requestedEngineSelection = input.requestedEngineSelection;
  return requestedEngineSelection !== undefined &&
    (requestedEngineSelection.engine === input.currentEngineSelection.engine ||
      input.canAdoptRequestedProvider)
    ? requestedEngineSelection
    : input.currentEngineSelection;
}

export function shouldDeferTurnStartBindingProjection(input: {
  readonly currentEngineSelection: EngineSelection;
  readonly currentRuntimeMode: RuntimeMode;
  readonly currentInteractionMode: EngineInteractionMode;
  readonly currentSession: OrchestrationSession | null;
  readonly requestedEngineSelection: EngineSelection | undefined;
  readonly requestedRuntimeMode: RuntimeMode;
  readonly requestedInteractionMode: EngineInteractionMode;
  readonly canAdoptRequestedProvider: boolean;
}): boolean {
  if (input.canAdoptRequestedProvider || input.currentSession === null) {
    return false;
  }

  return (
    (input.requestedEngineSelection !== undefined &&
      !Equal.equals(input.requestedEngineSelection, input.currentEngineSelection)) ||
    input.requestedRuntimeMode !== input.currentRuntimeMode ||
    input.requestedInteractionMode !== input.currentInteractionMode
  );
}

export function turnStartBindingMatchesCommitted(input: {
  readonly currentEngineSelection: EngineSelection;
  readonly currentRuntimeMode: RuntimeMode;
  readonly currentInteractionMode: EngineInteractionMode;
  readonly requestedEngineSelection: EngineSelection;
  readonly requestedRuntimeMode: RuntimeMode;
  readonly requestedInteractionMode: EngineInteractionMode;
}): boolean {
  return (
    Equal.equals(input.currentEngineSelection, input.requestedEngineSelection) &&
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
