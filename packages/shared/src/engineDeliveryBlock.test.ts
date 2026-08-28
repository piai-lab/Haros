import { describe, expect, it } from "vitest";

import {
  formatEngineDeliveryBlockDetail,
  isEngineDeliveryBlockDetail,
  ENGINE_DELIVERY_BLOCK_SUMMARY,
} from "./engineDeliveryBlock";

describe("engineDeliveryBlock", () => {
  it("formats a detail the matcher recognizes", () => {
    const detail = formatEngineDeliveryBlockDetail(
      "External engine command claim expired without a durable acceptance result; execution was not replayed.",
    );

    expect(detail.startsWith(ENGINE_DELIVERY_BLOCK_SUMMARY)).toBe(true);
    expect(isEngineDeliveryBlockDetail(detail)).toBe(true);
  });

  it("ignores unrelated or missing thread errors", () => {
    expect(isEngineDeliveryBlockDetail(null)).toBe(false);
    expect(isEngineDeliveryBlockDetail(undefined)).toBe(false);
    expect(isEngineDeliveryBlockDetail("")).toBe(false);
    expect(isEngineDeliveryBlockDetail("The engine rejected the prompt.")).toBe(false);
    expect(
      isEngineDeliveryBlockDetail("Turn failed: thread is blocked by an earlier engine failure"),
    ).toBe(false);
  });
});
