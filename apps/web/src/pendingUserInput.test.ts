import { describe, expect, it, vi } from "vitest";

import {
  buildPendingUserInputAnswers,
  claimPendingUserInputResponse,
  dispatchClaimedPendingUserInputResponse,
  derivePendingUserInputProgress,
  derivePendingUserInputSinglePresetAction,
  resolvePendingUserInputAnswer,
  releasePendingUserInputResponse,
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
  it("claims rapid response attempts synchronously and releases only for retry", () => {
    const claims = new Set<string>();
    expect(claimPendingUserInputResponse(claims, "thread:request:generation")).toBe(true);
    expect(claimPendingUserInputResponse(claims, "thread:request:generation")).toBe(false);
    releasePendingUserInputResponse(claims, "thread:request:generation");
    expect(claimPendingUserInputResponse(claims, "thread:request:generation")).toBe(true);
  });

  it("dispatches rapid response attempts exactly once and releases only on failure", async () => {
    const claims = new Set<string>();
    let settle!: () => void;
    const pendingDispatch = new Promise<void>((resolve) => {
      settle = resolve;
    });
    const dispatch = vi.fn(() => pendingDispatch);
    const first = dispatchClaimedPendingUserInputResponse({
      claimedKeys: claims,
      key: "request",
      dispatch,
    });
    expect(
      await dispatchClaimedPendingUserInputResponse({
        claimedKeys: claims,
        key: "request",
        dispatch,
      }),
    ).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(1);
    settle();
    await expect(first).resolves.toBe(true);
    expect(claims.has("request")).toBe(true);

    await expect(
      dispatchClaimedPendingUserInputResponse({
        claimedKeys: claims,
        key: "retryable",
        dispatch: async () => {
          throw new Error("transport failed");
        },
      }),
    ).rejects.toThrow("transport failed");
    expect(claims.has("retryable")).toBe(false);
    await expect(
      dispatchClaimedPendingUserInputResponse({
        claimedKeys: claims,
        key: "retryable",
        dispatch: async () => undefined,
      }),
    ).resolves.toBe(true);
  });

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

  it("routes a single preset to the next question or direct single-question submit", () => {
    expect(
      derivePendingUserInputSinglePresetAction([single, freeText], {}, 0, single.id, {
        selectedOptionLabels: ["Preserve"],
      }),
    ).toEqual({ kind: "question", questionIndex: 1 });

    expect(
      derivePendingUserInputSinglePresetAction([single], {}, 0, single.id, {
        selectedOptionLabels: ["Preserve"],
      }),
    ).toEqual({
      kind: "submit",
      answers: { direction: { selectedOptionLabels: ["Preserve"] } },
    });
  });

  it("keeps the last single preset in a multi-question request for explicit submit", () => {
    expect(
      derivePendingUserInputSinglePresetAction(
        [freeText, single],
        { constraint: { customText: "No caps" } },
        1,
        single.id,
        { selectedOptionLabels: ["Preserve"] },
      ),
    ).toEqual({ kind: "stay" });
  });

  it("never auto-advances custom or multiple-choice answers", () => {
    expect(
      derivePendingUserInputSinglePresetAction([single], {}, 0, single.id, {
        customSelected: true,
        customText: "Complete answer",
      }),
    ).toBeNull();
    expect(
      derivePendingUserInputSinglePresetAction([multiple], {}, 0, multiple.id, {
        selectedOptionLabels: ["Implementation"],
      }),
    ).toBeNull();
  });
});
