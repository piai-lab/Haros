import { describe, expect, it } from "vitest";

import {
  buildPendingUserInputAnswers,
  derivePendingUserInputProgress,
  derivePendingUserInputSinglePresetDestination,
  resolvePendingUserInputAnswer,
  setPendingUserInputCustomText,
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
  it("keeps selected labels and custom text structurally independent", () => {
    const draft = {
      selectedOptionLabels: ["Implementation", "Tests"],
      customSelected: true,
      customText: "Keep author tests.  ",
    };
    expect(resolvePendingUserInputAnswer(multiple, draft)).toEqual({
      selectedOptionLabels: ["Implementation", "Tests"],
      customText: "Keep author tests.  ",
    });
  });

  it("lets a single custom answer replace the preset", () => {
    const customSelected = togglePendingUserInputCustomSelection(single, {
      selectedOptionLabels: ["Preserve"],
    });
    expect(customSelected).toEqual({ customSelected: true, customText: "" });
    expect(
      resolvePendingUserInputAnswer(
        single,
        setPendingUserInputCustomText(single, customSelected, "A third direction.  "),
      ),
    ).toEqual({ selectedOptionLabels: [], customText: "A third direction.  " });
  });

  it("replaces a single-choice preset without retaining parallel answer state", () => {
    const next = togglePendingUserInputOptionSelection(
      single,
      { selectedOptionLabels: ["Preserve"] },
      "Rebuild",
    );
    expect(next).toEqual({ selectedOptionLabels: ["Rebuild"] });
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
        direction: { selectedOptionLabels: ["Preserve"] },
        delivery: {
          selectedOptionLabels: ["Implementation", "Tests"],
          customSelected: true,
          customText: "Keep author tests.  ",
        },
        constraint: { customText: "No product caps.\nKeep raw text. " },
      }),
    ).toEqual({
      direction: {
        selectedOptionLabels: ["Preserve"],
      },
      delivery: {
        selectedOptionLabels: ["Implementation", "Tests"],
        customText: "Keep author tests.  ",
      },
      constraint: {
        selectedOptionLabels: [],
        customText: "No product caps.\nKeep raw text. ",
      },
    });
  });

  it("derives an answer that can advance without implying submission", () => {
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

  it("routes single preset selection to the next question or final Review", () => {
    expect(
      derivePendingUserInputSinglePresetDestination([single, freeText], {}, 0, single.id, {
        selectedOptionLabels: ["Preserve"],
      }),
    ).toEqual({ kind: "question", questionIndex: 1 });

    expect(
      derivePendingUserInputSinglePresetDestination([single], {}, 0, single.id, {
        selectedOptionLabels: ["Preserve"],
      }),
    ).toEqual({ kind: "review" });
  });

  it("never auto-advances custom or multiple-choice answers", () => {
    expect(
      derivePendingUserInputSinglePresetDestination([single], {}, 0, single.id, {
        customSelected: true,
        customText: "Complete answer",
      }),
    ).toBeNull();
    expect(
      derivePendingUserInputSinglePresetDestination([multiple], {}, 0, multiple.id, {
        selectedOptionLabels: ["Implementation"],
      }),
    ).toBeNull();
  });
});
