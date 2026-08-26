import { describe, expect, it } from "vitest";

import {
  projectionReconcileDelayMs,
  projectionReconcileNoopStreakAfterAttempt,
  shouldReconcileThreadProjectionState,
  shouldResetProjectionBackoffForObservedTurn,
  THREAD_DETAIL_PROJECTION_RECONCILE_INTERVAL_MS,
} from "./-threadProjectionScheduling";

describe("thread projection scheduling", () => {
  it("keeps converged threads idle and reconciles every incomplete state", () => {
    const converged = {
      sessionStatus: "ready",
      latestTurnState: "completed",
      hasStreamingAssistant: false,
      hasPendingDispatch: false,
    };
    expect(shouldReconcileThreadProjectionState(converged)).toBe(false);
    for (const incomplete of [
      { ...converged, sessionStatus: "starting" },
      { ...converged, sessionStatus: "running" },
      { ...converged, latestTurnState: "running" },
      { ...converged, hasStreamingAssistant: true },
      { ...converged, hasPendingDispatch: true },
    ]) {
      expect(shouldReconcileThreadProjectionState(incomplete)).toBe(true);
    }
  });

  it("caps no-op backoff and resets failures or changed projections to base cadence", () => {
    expect(projectionReconcileNoopStreakAfterAttempt(0, "noop")).toBe(1);
    expect(projectionReconcileNoopStreakAfterAttempt(1, "noop")).toBe(2);
    expect(projectionReconcileNoopStreakAfterAttempt(2, "noop")).toBe(2);
    expect(projectionReconcileNoopStreakAfterAttempt(2, "changed")).toBe(0);
    expect(projectionReconcileNoopStreakAfterAttempt(2, "failed")).toBe(0);
    expect(projectionReconcileDelayMs({ noopStreak: 2, forceBaseCadence: false })).toBe(
      THREAD_DETAIL_PROJECTION_RECONCILE_INTERVAL_MS * 4,
    );
    expect(projectionReconcileDelayMs({ noopStreak: 2, forceBaseCadence: true })).toBe(
      THREAD_DETAIL_PROJECTION_RECONCILE_INTERVAL_MS,
    );
  });

  it("resets only an existing backoff that observes a different real turn", () => {
    expect(shouldResetProjectionBackoffForObservedTurn(undefined, "turn-next")).toBe(false);
    expect(shouldResetProjectionBackoffForObservedTurn("turn-current", null)).toBe(false);
    expect(shouldResetProjectionBackoffForObservedTurn("turn-current", "turn-current")).toBe(false);
    expect(shouldResetProjectionBackoffForObservedTurn("turn-current", "turn-next")).toBe(true);
  });
});
