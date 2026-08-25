import { beforeEach, describe, expect, it } from "vitest";

import { askUserMetrics } from "./askUserMetrics.ts";

describe("Ask User internal metrics", () => {
  beforeEach(() => askUserMetrics.resetForTests());

  it("records only lifecycle counts and bounded waiting aggregates", () => {
    askUserMetrics.increment("requested");
    askUserMetrics.increment("barrier_sibling_blocked", 2);
    askUserMetrics.settle("answered", 12.5);
    askUserMetrics.settle("unavailable", 7.5);

    expect(askUserMetrics.snapshot()).toEqual({
      counters: { requested: 1, barrier_sibling_blocked: 2, answered: 1, unavailable: 1 },
      waiting: { count: 2, totalMs: 20, maxMs: 12.5 },
    });
  });
});
