export const THREAD_DETAIL_PROJECTION_RECONCILE_INTERVAL_MS = 4_500;
export const THREAD_DETAIL_PROJECTION_RECONCILE_MAX_NOOP_STREAK = 2;

export type ThreadProjectionAttemptOutcome = "changed" | "failed" | "noop";

export function shouldReconcileThreadProjectionState(input: {
  readonly sessionStatus: string | null | undefined;
  readonly latestTurnState: string | null | undefined;
  readonly hasStreamingAssistant: boolean;
  readonly hasPendingDispatch: boolean;
}): boolean {
  return (
    input.sessionStatus === "starting" ||
    input.sessionStatus === "running" ||
    input.latestTurnState === "running" ||
    input.hasStreamingAssistant ||
    input.hasPendingDispatch
  );
}

export function projectionReconcileNoopStreakAfterAttempt(
  currentNoopStreak: number,
  outcome: ThreadProjectionAttemptOutcome,
): number {
  return outcome === "noop"
    ? Math.min(currentNoopStreak + 1, THREAD_DETAIL_PROJECTION_RECONCILE_MAX_NOOP_STREAK)
    : 0;
}

export function projectionReconcileDelayMs(input: {
  readonly noopStreak: number;
  readonly forceBaseCadence: boolean;
}): number {
  return (
    THREAD_DETAIL_PROJECTION_RECONCILE_INTERVAL_MS *
    2 ** (input.forceBaseCadence ? 0 : input.noopStreak)
  );
}

export function shouldResetProjectionBackoffForObservedTurn(
  currentTurnId: string | null | undefined,
  observedTurnId: string | null,
): boolean {
  return currentTurnId !== undefined && observedTurnId !== null && currentTurnId !== observedTurnId;
}
