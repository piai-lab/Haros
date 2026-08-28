import { describe, expect, it } from "vitest";
import {
  CANONICAL_USER_INPUT_MAX_NODES,
  CANONICAL_USER_INPUT_MAX_UTF8_BYTES,
} from "@harnessos/contracts";
import { ASK_USER_MAX_NODES, ASK_USER_MAX_UTF8_BYTES } from "@harnessos/oa-ask";

import {
  canonicalUserInputRequestFromQuestions,
  encodeCanonicalUserInputAnswer,
  encodeCanonicalUserInputAnswers,
  encodeCanonicalUserInputResponse,
} from "./canonicalUserInput";

describe("canonical user-input Engine encoding", () => {
  it("keeps the fork Tool and cross-Engine Product safety guards aligned", () => {
    expect(ASK_USER_MAX_NODES).toBe(CANONICAL_USER_INPUT_MAX_NODES);
    expect(ASK_USER_MAX_UTF8_BYTES).toBe(CANONICAL_USER_INPUT_MAX_UTF8_BYTES);
  });

  it("upgrades native questions through the strict versioned Product contract", () => {
    expect(
      canonicalUserInputRequestFromQuestions([
        {
          id: "delivery",
          header: "Delivery",
          question: "What should ship?",
          options: [
            {
              label: "Implementation",
              preview: "Production path",
              recommended: true,
            },
          ],
          multiSelect: true,
        },
        {
          id: "constraint",
          header: "Constraint",
          question: "Anything else?",
          options: [],
          suggestion: { text: "No product caps.  " },
        },
      ]),
    ).toEqual({
      version: 1,
      questions: [
        {
          kind: "choice",
          id: "delivery",
          header: "Delivery",
          prompt: "What should ship?",
          cardinality: "multiple",
          options: [
            {
              label: "Implementation",
              preview: "Production path",
              recommended: true,
            },
          ],
        },
        {
          kind: "text",
          id: "constraint",
          header: "Constraint",
          prompt: "Anything else?",
          suggestion: { text: "No product caps.  " },
        },
      ],
    });
  });

  it("rejects duplicate native identities at the canonical adapter seam", () => {
    expect(() =>
      canonicalUserInputRequestFromQuestions([
        { id: "q", header: "One", question: "One?", options: [] },
        { id: "q", header: "Two", question: "Two?", options: [] },
      ]),
    ).toThrow();
  });

  it("rejects an explicitly authored choice with no options", () => {
    expect(() =>
      canonicalUserInputRequestFromQuestions([
        {
          kind: "choice",
          id: "empty-choice",
          header: "Choice",
          question: "Choose one",
          options: [],
          multiSelect: false,
        },
      ]),
    ).toThrow();
  });

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
