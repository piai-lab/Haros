// upstream-adapted: supi-ask-user ask-user.test.ts

import { describe, expect, it, vi } from "vitest";
import {
  AskUserBusyError,
  AskUserUnavailableError,
  executeAskUserKernel,
  type AskUserInteractionPort,
} from "../src/kernel.ts";
import { ActiveQuestionnaireLock } from "../src/lock.ts";
import type { AskUserOutcome } from "../src/types.ts";
import { questionnaireInput } from "./fixtures.ts";

function submittedOutcome(): AskUserOutcome {
  return {
    outcome: "submitted",
    responses: [
      {
        questionId: "approach",
        answer: {
          kind: "choice",
          answered: true,
          selectedValues: ["a"],
          options: [{ value: "a", label: "A", selected: true }],
        },
      },
      {
        questionId: "features",
        answer: {
          kind: "choice",
          answered: true,
          selectedValues: ["x"],
          options: [{ value: "x", label: "X", selected: true }],
        },
      },
      {
        questionId: "notes",
        answer: { kind: "text", answered: true, value: "done" },
      },
    ],
  };
}

describe("executeAskUserKernel", () => {
  it("fails closed when no canonical interaction is available", async () => {
    await expect(executeAskUserKernel(questionnaireInput(), {})).rejects.toBeInstanceOf(
      AskUserUnavailableError,
    );
  });

  it("validates before attempting an interaction", async () => {
    await expect(executeAskUserKernel({ questions: [] }, {})).rejects.toThrow(/at least one/);
  });

  it("returns a structured successful result", async () => {
    const interaction: AskUserInteractionPort = {
      present: vi.fn().mockResolvedValue(submittedOutcome()),
    };
    const result = await executeAskUserKernel(questionnaireInput(), { interaction });
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("expected completed");
    expect(result.details.outcome).toBe("submitted");
    expect(result.details.responses).toEqual(submittedOutcome().responses);
  });

  it("preserves needs_discussion as a truthful incomplete outcome", async () => {
    const outcome: AskUserOutcome = { outcome: "needs_discussion", responses: [] };
    const result = await executeAskUserKernel(questionnaireInput(), {
      interaction: { present: vi.fn().mockResolvedValue(outcome) },
    });
    expect(result).toMatchObject({ kind: "completed", details: outcome });
  });

  it("preserves internal cancel without fabricating an answer", async () => {
    const interaction: AskUserInteractionPort = {
      present: vi.fn().mockResolvedValue({ kind: "cancel" }),
    };
    await expect(executeAskUserKernel(questionnaireInput(), { interaction })).resolves.toEqual({
      kind: "cancel",
    });
  });

  it("preserves internal abort without fabricating an answer", async () => {
    const interaction: AskUserInteractionPort = {
      present: vi.fn().mockResolvedValue({ kind: "abort" }),
    };
    await expect(executeAskUserKernel(questionnaireInput(), { interaction })).resolves.toEqual({
      kind: "abort",
    });
  });

  it("does not project an already-aborted request", async () => {
    const controller = new AbortController();
    controller.abort();
    const present = vi.fn();
    await expect(
      executeAskUserKernel(questionnaireInput(), {
        interaction: { present },
        signal: controller.signal,
      }),
    ).resolves.toEqual({ kind: "abort" });
    expect(present).not.toHaveBeenCalled();
  });

  it("rejects a second concurrent interaction", async () => {
    const lock = new ActiveQuestionnaireLock();
    let resolveFirst: ((outcome: AskUserOutcome) => void) | undefined;
    const first = executeAskUserKernel(questionnaireInput(), {
      lock,
      interaction: {
        present: () =>
          new Promise<AskUserOutcome>((resolve) => {
            resolveFirst = resolve;
          }),
      },
    });

    await expect(
      executeAskUserKernel(questionnaireInput(), {
        lock,
        interaction: { present: vi.fn().mockResolvedValue(submittedOutcome()) },
      }),
    ).rejects.toBeInstanceOf(AskUserBusyError);

    resolveFirst?.(submittedOutcome());
    await first;
  });

  it("releases the lock after interaction failure", async () => {
    const lock = new ActiveQuestionnaireLock();
    await expect(
      executeAskUserKernel(questionnaireInput(), {
        lock,
        interaction: { present: vi.fn().mockRejectedValue(new Error("failed")) },
      }),
    ).rejects.toThrow("failed");
    expect(lock.isActive).toBe(false);
  });

  it("settles in-flight abort and ignores a late answer", async () => {
    const abortController = new AbortController();
    const lock = new ActiveQuestionnaireLock();
    let resolveInteraction: ((outcome: AskUserOutcome) => void) | undefined;
    const pending = executeAskUserKernel(questionnaireInput(), {
      lock,
      signal: abortController.signal,
      interaction: {
        present: () =>
          new Promise<AskUserOutcome>((resolve) => {
            resolveInteraction = resolve;
          }),
      },
    });

    abortController.abort();
    await expect(pending).resolves.toEqual({ kind: "abort" });
    expect(lock.isActive).toBe(false);
    resolveInteraction?.(submittedOutcome());
    await Promise.resolve();
    expect(lock.isActive).toBe(false);
  });
});

describe("ActiveQuestionnaireLock", () => {
  it("rejects stale release tokens", () => {
    const lock = new ActiveQuestionnaireLock();
    const lease = lock.acquire();
    expect(lease).toBeDefined();
    expect(lock.release(Symbol("stale"))).toBe(false);
    expect(lock.isActive).toBe(true);
    expect(lock.release(lease!)).toBe(true);
    expect(lock.isActive).toBe(false);
  });
});
