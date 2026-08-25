import { describe, expect, it } from "vitest";

import {
  buildPendingUserInputAnswers,
  derivePendingUserInputProgress,
  resolvePendingUserInputAnswer,
  setPendingUserInputCustomText,
  setPendingUserInputNote,
  togglePendingUserInputCustomSelection,
  togglePendingUserInputOptionSelection,
} from "./pendingUserInput";

const single = {
  id: "direction",
  header: "Direction",
  question: "Which direction?",
  options: [
    { label: "Preserve", description: "Keep the current shape" },
    { label: "Rebuild", description: "Change the shape" },
  ],
} as const;

const multiple = {
  id: "delivery",
  header: "Delivery",
  question: "What should ship?",
  multiSelect: true,
  options: [
    { label: "Implementation", description: "Production code" },
    { label: "Tests", description: "Regression tests" },
  ],
} as const;

const freeText = {
  id: "constraint",
  header: "Constraint",
  question: "Anything else?",
  options: [],
} as const;

describe("canonical user-input answer semantics", () => {
  it("keeps selected labels, custom text, and note structurally independent", () => {
    const draft = {
      selectedOptionLabels: ["Implementation", "Tests"],
      customSelected: true,
      customText: "Keep author tests.  ",
      note: "Protect lifecycle semantics.  ",
    };
    expect(resolvePendingUserInputAnswer(multiple, draft)).toEqual({
      selectedOptionLabels: ["Implementation", "Tests"],
      customText: "Keep author tests.  ",
      note: "Protect lifecycle semantics.  ",
    });
  });

  it("lets a single custom answer replace the preset and its note", () => {
    const withPreset = setPendingUserInputNote(
      single,
      { selectedOptionLabels: ["Preserve"] },
      "Only for the current release. ",
    );
    const customSelected = togglePendingUserInputCustomSelection(single, withPreset);
    expect(customSelected).toEqual({ customSelected: true, customText: "" });
    expect(
      resolvePendingUserInputAnswer(
        single,
        setPendingUserInputCustomText(single, customSelected, "A third direction.  "),
      ),
    ).toEqual({ selectedOptionLabels: [], customText: "A third direction.  " });
  });

  it("clears a single-choice note when the preset changes", () => {
    const next = togglePendingUserInputOptionSelection(
      single,
      { selectedOptionLabels: ["Preserve"], note: "About Preserve" },
      "Rebuild",
    );
    expect(next).toEqual({ selectedOptionLabels: ["Rebuild"] });
  });

  it("clears a multiple-choice note only after the last preset is removed", () => {
    const oneLeft = togglePendingUserInputOptionSelection(
      multiple,
      { selectedOptionLabels: ["Implementation", "Tests"], note: "Shared note" },
      "Implementation",
    );
    expect(oneLeft).toEqual({ selectedOptionLabels: ["Tests"], note: "Shared note" });
    expect(togglePendingUserInputOptionSelection(multiple, oneLeft, "Tests")).toEqual({});
  });

  it("does not let preset toggles erase a multiple-choice custom answer", () => {
    const next = togglePendingUserInputOptionSelection(
      multiple,
      {
        selectedOptionLabels: ["Implementation"],
        customSelected: true,
        customText: "Documentation too. ",
      },
      "Tests",
    );
    expect(next).toEqual({
      selectedOptionLabels: ["Implementation", "Tests"],
      customSelected: true,
      customText: "Documentation too. ",
    });
  });

  it("uses trim only as an emptiness predicate and preserves raw free text", () => {
    expect(resolvePendingUserInputAnswer(freeText, { customText: "  \n" })).toBeNull();
    expect(resolvePendingUserInputAnswer(freeText, { customText: "Line one\nLine two  " })).toEqual(
      {
        selectedOptionLabels: [],
        customText: "Line one\nLine two  ",
      },
    );
  });

  it("builds a lossless structured result for every question", () => {
    expect(
      buildPendingUserInputAnswers([single, multiple, freeText], {
        direction: { selectedOptionLabels: ["Preserve"], note: "No second UI.  " },
        delivery: {
          selectedOptionLabels: ["Implementation", "Tests"],
          customSelected: true,
          customText: "Keep author tests.  ",
          note: "Protect lifecycle.  ",
        },
        constraint: { customText: "No product caps.\nKeep raw text. " },
      }),
    ).toEqual({
      direction: {
        selectedOptionLabels: ["Preserve"],
        note: "No second UI.  ",
      },
      delivery: {
        selectedOptionLabels: ["Implementation", "Tests"],
        customText: "Keep author tests.  ",
        note: "Protect lifecycle.  ",
      },
      constraint: {
        selectedOptionLabels: [],
        customText: "No product caps.\nKeep raw text. ",
      },
    });
  });

  it("derives explicit advancement without auto-submit semantics", () => {
    expect(
      derivePendingUserInputProgress(
        [single, freeText],
        { direction: { selectedOptionLabels: ["Preserve"] } },
        0,
      ),
    ).toMatchObject({
      questionIndex: 0,
      canAdvance: true,
      isLastQuestion: false,
      isComplete: false,
      customSelected: false,
    });
  });
});
