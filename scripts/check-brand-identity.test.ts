import { describe, expect, it } from "vitest";

import { findVisualBrandAssetViolations } from "./check-brand-identity";

describe("temporary brand asset guard", () => {
  it("accepts the calibrated digest", () => {
    const contents = new TextEncoder().encode("approved OmniMind icon");
    const digests = new Map([
      ["icon.svg", "d3e1ca575f7b0f6e4098f1b0cc9f975da683252d99e35ca0152cec55c2cc678a"],
    ]);
    expect(findVisualBrandAssetViolations([{ path: "icon.svg", contents }], digests)).toEqual([]);
  });

  it("rejects missing or changed outputs", () => {
    const digests = new Map([["icon.svg", "0".repeat(64)]]);
    expect(findVisualBrandAssetViolations([], digests)).toHaveLength(1);
    expect(
      findVisualBrandAssetViolations(
        [{ path: "icon.svg", contents: new TextEncoder().encode("changed") }],
        digests,
      ),
    ).toHaveLength(1);
  });
});
