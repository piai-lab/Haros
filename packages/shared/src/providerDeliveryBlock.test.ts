import { describe, expect, it } from "vitest";

import {
  formatProviderDeliveryBlockDetail,
  isProviderDeliveryBlockDetail,
  ENGINE_DELIVERY_BLOCK_SUMMARY,
} from "./providerDeliveryBlock";

describe("providerDeliveryBlock", () => {
  it("formats a detail the matcher recognizes", () => {
    const detail = formatProviderDeliveryBlockDetail(
      "External engine command claim expired without a durable acceptance result; execution was not replayed.",
    );

    expect(detail.startsWith(ENGINE_DELIVERY_BLOCK_SUMMARY)).toBe(true);
    expect(isProviderDeliveryBlockDetail(detail)).toBe(true);
  });

  it("ignores unrelated or missing thread errors", () => {
    expect(isProviderDeliveryBlockDetail(null)).toBe(false);
    expect(isProviderDeliveryBlockDetail(undefined)).toBe(false);
    expect(isProviderDeliveryBlockDetail("")).toBe(false);
    expect(isProviderDeliveryBlockDetail("The engine rejected the prompt.")).toBe(false);
    expect(
      isProviderDeliveryBlockDetail("Turn failed: thread is blocked by an earlier engine failure"),
    ).toBe(false);
  });
});
