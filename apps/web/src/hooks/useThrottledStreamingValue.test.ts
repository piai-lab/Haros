import { describe, expect, it } from "vitest";

import { planThrottledCommit } from "./useThrottledStreamingValue";

describe("planThrottledCommit", () => {
  it("commits the first change immediately", () => {
    expect(planThrottledCommit(0, 1_000, 160)).toEqual({ immediate: true });
  });

  it("commits after the interval and otherwise schedules the trailing edge", () => {
    expect(planThrottledCommit(1_000, 1_160, 160)).toEqual({ immediate: true });
    expect(planThrottledCommit(1_000, 1_040, 160)).toEqual({
      immediate: false,
      delayMs: 120,
    });
  });
});
