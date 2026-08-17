import { describe, expect, it } from "vitest";

import {
  AUTOMATION_FAILURE_POLICY_NEVER,
  DEFAULT_AUTOMATION_FAILURE_POLICY_VALUE,
  automationFailurePolicyOptions,
  automationFailurePolicyValue,
  stopAfterConsecutiveFailuresFromPolicyValue,
} from "./automationFailurePolicy";

describe("automation failure policy values", () => {
  it("defaults to three consecutive failures", () => {
    expect(DEFAULT_AUTOMATION_FAILURE_POLICY_VALUE).toBe("3");
  });

  it("round-trips stored thresholds and never", () => {
    for (const stored of [null, 1, 3, 5, 12]) {
      expect(
        stopAfterConsecutiveFailuresFromPolicyValue(automationFailurePolicyValue(stored)),
      ).toBe(stored);
    }
    expect(automationFailurePolicyValue(null)).toBe(AUTOMATION_FAILURE_POLICY_NEVER);
  });

  it("offers 1, 3, 5 and keep running without hiding a custom stored value", () => {
    expect(automationFailurePolicyOptions("3").map((option) => option.value)).toEqual([
      "1",
      "3",
      "5",
      "never",
    ]);
    expect(automationFailurePolicyOptions("7").map((option) => option.value)).toEqual([
      "7",
      "1",
      "3",
      "5",
      "never",
    ]);
  });
});
