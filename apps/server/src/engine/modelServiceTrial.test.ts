import { describe, expect, it } from "vitest";

import { trialReplyText } from "./modelServiceTrial";

describe("trialReplyText", () => {
  it("prefers visible text over thinking", () => {
    expect(
      trialReplyText([
        { type: "thinking", thinking: "I am considering the request." },
        { type: "text", text: "Ready." },
      ]),
    ).toBe("Ready.");
  });

  it("accepts a thinking-only DeepSeek reply as a successful trial", () => {
    expect(trialReplyText([{ type: "thinking", thinking: "I am ready." }])).toBe("I am ready.");
  });

  it("rejects an empty completion", () => {
    expect(
      trialReplyText([
        { type: "text", text: "  " },
        { type: "thinking", thinking: "" },
      ]),
    ).toBe("");
  });
});
