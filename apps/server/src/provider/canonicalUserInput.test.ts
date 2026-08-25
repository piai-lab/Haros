import { describe, expect, it } from "vitest";

import {
  encodeCanonicalUserInputAnswer,
  encodeCanonicalUserInputAnswers,
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

  it("uses a structured wire envelope when custom text and note must remain distinct", () => {
    const encoded = encodeCanonicalUserInputAnswers({
      delivery: {
        selectedOptionLabels: ["Implementation", "Tests"],
        customText: "Keep author tests.  ",
        note: "Protect lifecycle.  ",
      },
    });
    expect(typeof encoded.delivery).toBe("string");
    expect(JSON.parse(encoded.delivery as string)).toEqual({
      selectedOptionLabels: ["Implementation", "Tests"],
      customText: "Keep author tests.  ",
      note: "Protect lifecycle.  ",
    });
  });
});
