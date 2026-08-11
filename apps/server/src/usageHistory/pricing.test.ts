import { describe, expect, it } from "vitest";

import { estimateUsageHistoryCostMicros } from "./pricing";

const oneMillionEach = (model: string) =>
  estimateUsageHistoryCostMicros({
    model,
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  });

describe("usage history pricing", () => {
  it("uses current list prices for modern Claude model families", () => {
    expect(oneMillionEach("claude-opus-4.5")).toBe(30_000_000);
    expect(oneMillionEach("claude-opus-4-8-20260701")).toBe(30_000_000);
    expect(oneMillionEach("claude-sonnet-5")).toBe(12_000_000);
    expect(oneMillionEach("claude-haiku-4.5")).toBe(6_000_000);
  });

  it("preserves legacy Claude prices where the model really is legacy", () => {
    expect(oneMillionEach("claude-opus-4.1")).toBe(90_000_000);
    expect(oneMillionEach("claude-haiku-3.5")).toBe(4_800_000);
  });
});
