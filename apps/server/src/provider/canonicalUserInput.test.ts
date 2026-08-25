import { describe, expect, it } from "vitest";

import {
  encodeCanonicalUserInputAnswer,
  encodeCanonicalUserInputAnswers,
  encodeCanonicalUserInputResponse,
  normalizeCanonicalUserInputResponse,
} from "./canonicalUserInput";

describe("canonical user-input Provider encoding", () => {
  it("keeps the compact native shape when it is already lossless", () => {
    expect(encodeCanonicalUserInputAnswer({ selectedOptionLabels: ["Safe"] })).toBe("Safe");
    expect(encodeCanonicalUserInputAnswer({ selectedOptionLabels: ["Tests", "Docs"] })).toEqual([
      "Tests",
      "Docs",
    ]);
    expect(
      encodeCanonicalUserInputAnswer({ selectedOptionLabels: [], customText: "My answer  " }),
    ).toBe("My answer  ");
  });

  it("keeps cancellation separate from an answered empty map at the canonical boundary", () => {
    expect(encodeCanonicalUserInputResponse({ status: "cancelled" })).toEqual({
      answers: {},
      cancelled: true,
    });
    expect(encodeCanonicalUserInputResponse({ status: "answered", answers: {} })).toEqual({
      answers: {},
      cancelled: false,
    });
    expect(normalizeCanonicalUserInputResponse({})).toEqual({ status: "answered", answers: {} });
  });

  it("uses a structured wire envelope when presets and custom text coexist", () => {
    const encoded = encodeCanonicalUserInputAnswers({
      delivery: {
        selectedOptionLabels: ["Implementation", "Tests"],
        customText: "Keep author tests.  ",
      },
    });
    expect(typeof encoded.delivery).toBe("string");
    expect(JSON.parse(encoded.delivery as string)).toEqual({
      selectedOptionLabels: ["Implementation", "Tests"],
      customText: "Keep author tests.  ",
    });
  });
});
