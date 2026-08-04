import { describe, expect, it } from "vitest";

import {
  NATIVE_HOST_MAX_CRASHES,
  NATIVE_HOST_STABLE_RESET_MS,
  NativeHostRestartPolicy,
} from "./nativeHostSupervisor";

describe("NativeHostRestartPolicy", () => {
  it("opens the independent circuit after bounded real-process exits", () => {
    const policy = new NativeHostRestartPolicy();
    for (let attempt = 1; attempt < NATIVE_HOST_MAX_CRASHES; attempt += 1) {
      policy.recordReadiness(attempt * 10);
      expect(
        policy.respondToExit({ nowMs: attempt * 20, quitting: false, restartPending: false }),
      ).toMatchObject({ kind: "restart", attempt });
    }
    policy.recordReadiness(100);
    expect(policy.respondToExit({ nowMs: 110, quitting: false, restartPending: false })).toEqual({
      kind: "circuitOpen",
      failures: NATIVE_HOST_MAX_CRASHES,
    });
  });

  it("re-arms on explicit retry and after a stable process lifetime", () => {
    const policy = new NativeHostRestartPolicy();
    policy.recordReadiness(0);
    policy.respondToExit({ nowMs: 1, quitting: false, restartPending: false });
    policy.reset();
    expect(policy.failures).toBe(0);

    policy.recordReadiness(10);
    expect(
      policy.respondToExit({
        nowMs: 10 + NATIVE_HOST_STABLE_RESET_MS,
        quitting: false,
        restartPending: false,
      }),
    ).toMatchObject({ kind: "restart", attempt: 1 });
  });
});
