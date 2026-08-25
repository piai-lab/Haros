// FILE: usePendingUserInputController.browser.tsx
// Purpose: Characterize the canonical Ask User Web lifecycle in a real React browser runtime.
// Layer: Focused controller regression tests.

import {
  ApprovalRequestId,
  type NativeApi,
  type OrchestrationPendingInteraction,
  type OrchestrationThreadActivity,
  ThreadId,
  TurnId,
} from "@omnimind/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";

import { makeActivity } from "../../storeTestFixtures";
import {
  usePendingUserInputController,
  type PendingUserInputControllerInput,
} from "./usePendingUserInputController";

const THREAD_A = ThreadId.makeUnsafe("thread-a");
const THREAD_B = ThreadId.makeUnsafe("thread-b");
const TURN_A = TurnId.makeUnsafe("turn-a");
const TURN_B = TurnId.makeUnsafe("turn-b");
const REQUEST_A = ApprovalRequestId.makeUnsafe("request-a");
const REQUEST_B = ApprovalRequestId.makeUnsafe("request-b");
const GENERATION_A = "generation-a";
const GENERATION_B = "generation-b";

type QuestionFixture =
  | {
      readonly kind: "choice";
      readonly id: string;
      readonly prompt: string;
      readonly cardinality: "single" | "multiple";
      readonly options: ReadonlyArray<{ readonly label: string }>;
    }
  | {
      readonly kind: "text";
      readonly id: string;
      readonly prompt: string;
    };

const singleQuestion = (id: string, prompt = `Question ${id}`): QuestionFixture => ({
  kind: "choice",
  id,
  prompt,
  cardinality: "single",
  options: [{ label: "A" }, { label: "B" }],
});

const multipleQuestion = (id: string): QuestionFixture => ({
  kind: "choice",
  id,
  prompt: `Question ${id}`,
  cardinality: "multiple",
  options: [{ label: "A" }, { label: "B" }],
});

const textQuestion = (id: string): QuestionFixture => ({
  kind: "text",
  id,
  prompt: `Question ${id}`,
});

function requestActivity(input: {
  readonly requestId: ApprovalRequestId;
  readonly generation: string;
  readonly turnId: TurnId;
  readonly questions: ReadonlyArray<QuestionFixture>;
  readonly createdAt?: string;
}): OrchestrationThreadActivity {
  return makeActivity({
    id: `requested-${input.requestId}-${input.generation}`,
    createdAt: input.createdAt ?? "2026-08-25T00:00:00.000Z",
    turnId: input.turnId,
    kind: "user-input.requested",
    summary: "User input requested",
    tone: "info",
    payload: {
      requestId: input.requestId,
      lifecycleGeneration: input.generation,
      version: 1,
      questions: input.questions,
    },
  });
}

function resolvedActivity(input: {
  readonly requestId: ApprovalRequestId;
  readonly generation: string;
  readonly turnId: TurnId;
}): OrchestrationThreadActivity {
  return makeActivity({
    id: `resolved-${input.requestId}-${input.generation}`,
    createdAt: "2026-08-25T00:00:02.000Z",
    turnId: input.turnId,
    kind: "user-input.resolved",
    summary: "User input resolved",
    tone: "info",
    payload: {
      requestId: input.requestId,
      lifecycleGeneration: input.generation,
      settlement: { status: "answered", answers: {} },
    },
  });
}

function pendingInteraction(input: {
  readonly threadId: ThreadId;
  readonly turnId: TurnId;
  readonly requestId: ApprovalRequestId;
  readonly generation: string;
  readonly status?: OrchestrationPendingInteraction["status"];
  readonly responseRequestedAt?: string | null;
}): OrchestrationPendingInteraction {
  return {
    interactionKind: "userInput",
    requestId: input.requestId,
    threadId: input.threadId,
    turnId: input.turnId,
    lifecycleGeneration: input.generation,
    status: input.status ?? "pending",
    decision: null,
    responseCommandId: null,
    responseRequestedAt: input.responseRequestedAt ?? null,
    createdAt: "2026-08-25T00:00:00.000Z",
    resolvedAt: null,
  };
}

function controllerInput(
  input: {
    readonly threadId?: ThreadId;
    readonly turnId?: TurnId;
    readonly requestId?: ApprovalRequestId;
    readonly generation?: string;
    readonly questions?: ReadonlyArray<QuestionFixture>;
    readonly activities?: ReadonlyArray<OrchestrationThreadActivity>;
    readonly pendingInteractions?: ReadonlyArray<OrchestrationPendingInteraction>;
    readonly isFocusedPane?: boolean;
    readonly scheduleComposerFocus?: () => void;
    readonly reportSubmissionError?: PendingUserInputControllerInput["reportSubmissionError"];
  } = {},
): PendingUserInputControllerInput {
  const threadId = input.threadId ?? THREAD_A;
  const turnId = input.turnId ?? TURN_A;
  const requestId = input.requestId ?? REQUEST_A;
  const generation = input.generation ?? GENERATION_A;
  const questions = input.questions ?? [singleQuestion("q1")];
  return {
    threadId,
    activities: input.activities ?? [requestActivity({ requestId, generation, turnId, questions })],
    pendingInteractions: input.pendingInteractions ?? [
      pendingInteraction({ threadId, turnId, requestId, generation }),
    ],
    authoritativeHasPending: true,
    latestTurnId: turnId,
    threadDetailReady: true,
    isFocusedPane: input.isFocusedPane ?? true,
    scheduleComposerFocus: input.scheduleComposerFocus ?? vi.fn(),
    reportSubmissionError: input.reportSubmissionError ?? vi.fn(),
  };
}

function installNativeApi(dispatchCommand: (command: unknown) => Promise<unknown>): () => void {
  const previous = window.nativeApi;
  Object.defineProperty(window, "nativeApi", {
    configurable: true,
    value: {
      orchestration: { dispatchCommand },
    } as unknown as NativeApi,
  });
  return () => {
    if (previous) {
      Object.defineProperty(window, "nativeApi", { configurable: true, value: previous });
    } else {
      Reflect.deleteProperty(window, "nativeApi");
    }
  };
}

function dispatchedResponse(dispatchCommand: ReturnType<typeof vi.fn>, index = 0) {
  const command = dispatchCommand.mock.calls[index]?.[0];
  expect(command).toMatchObject({ type: "thread.user-input.respond" });
  return command as {
    readonly threadId: ThreadId;
    readonly requestId: ApprovalRequestId;
    readonly response: unknown;
  };
}

describe("usePendingUserInputController", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "nativeApi");
    vi.restoreAllMocks();
  });

  it("submits an exact single preset once with the newly selected answer", async () => {
    const dispatchCommand = vi.fn(async () => undefined);
    const restore = installNativeApi(dispatchCommand);
    const hook = await renderHook(() => usePendingUserInputController(controllerInput()));

    await hook.act(() => {
      hook.result.current.actions.selectSinglePreset("q1", { selectedOptionLabels: ["A"] });
      hook.result.current.actions.selectSinglePreset("q1", { selectedOptionLabels: ["A"] });
    });

    await expect.poll(() => dispatchCommand.mock.calls.length).toBe(1);
    expect(dispatchedResponse(dispatchCommand).response).toEqual({
      status: "answered",
      answers: { q1: { selectedOptionLabels: ["A"] } },
    });
    await hook.unmount();
    restore();
  });

  it("advances a middle single question but waits for explicit submit on the final question", async () => {
    const dispatchCommand = vi.fn(async () => undefined);
    const restore = installNativeApi(dispatchCommand);
    const hook = await renderHook(() =>
      usePendingUserInputController(
        controllerInput({ questions: [singleQuestion("q1"), singleQuestion("q2")] }),
      ),
    );

    await hook.act(() =>
      hook.result.current.actions.selectSinglePreset("q1", { selectedOptionLabels: ["A"] }),
    );
    expect(hook.result.current.active?.progress.questionIndex).toBe(1);
    expect(dispatchCommand).not.toHaveBeenCalled();

    await hook.act(() =>
      hook.result.current.actions.selectSinglePreset("q2", { selectedOptionLabels: ["B"] }),
    );
    expect(hook.result.current.active?.progress.questionIndex).toBe(1);
    expect(dispatchCommand).not.toHaveBeenCalled();

    await hook.act(() => hook.result.current.actions.advance());
    await expect.poll(() => dispatchCommand.mock.calls.length).toBe(1);
    expect(dispatchedResponse(dispatchCommand).response).toEqual({
      status: "answered",
      answers: {
        q1: { selectedOptionLabels: ["A"] },
        q2: { selectedOptionLabels: ["B"] },
      },
    });
    await hook.unmount();
    restore();
  });

  it("keeps custom, text, and multiple answers explicit and preserves raw custom text", async () => {
    const dispatchCommand = vi.fn(async () => undefined);
    const restore = installNativeApi(dispatchCommand);
    const rawCustomText = "  custom\nanswer  ";
    const hook = await renderHook(() =>
      usePendingUserInputController(
        controllerInput({
          questions: [multipleQuestion("multi"), textQuestion("text")],
        }),
      ),
    );

    await hook.act(() => {
      hook.result.current.actions.changeAnswer("multi", {
        selectedOptionLabels: ["A", "B"],
        customSelected: true,
        customText: rawCustomText,
      });
    });
    expect(dispatchCommand).not.toHaveBeenCalled();
    await hook.act(() => hook.result.current.actions.advance());
    expect(hook.result.current.active?.progress.questionIndex).toBe(1);
    expect(dispatchCommand).not.toHaveBeenCalled();

    await hook.act(() => {
      hook.result.current.actions.changeAnswer("text", {
        customSelected: true,
        customText: "  text\nanswer  ",
      });
    });
    expect(dispatchCommand).not.toHaveBeenCalled();
    await hook.act(() => hook.result.current.actions.advance());
    await expect.poll(() => dispatchCommand.mock.calls.length).toBe(1);
    expect(dispatchedResponse(dispatchCommand).response).toEqual({
      status: "answered",
      answers: {
        multi: { selectedOptionLabels: ["A", "B"], customText: rawCustomText },
        text: { selectedOptionLabels: [], customText: "  text\nanswer  " },
      },
    });
    await hook.unmount();
    restore();
  });

  it("releases a failed synchronous claim while preserving the draft for retry", async () => {
    const reportSubmissionError = vi.fn();
    const dispatchCommand = vi
      .fn<(command: unknown) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error("transport failed"))
      .mockResolvedValue(undefined);
    const restore = installNativeApi(dispatchCommand);
    const hook = await renderHook(() =>
      usePendingUserInputController(controllerInput({ reportSubmissionError })),
    );

    await hook.act(() =>
      hook.result.current.actions.selectSinglePreset("q1", { selectedOptionLabels: ["A"] }),
    );
    await expect.poll(() => reportSubmissionError.mock.calls.length).toBe(1);
    expect(hook.result.current.active?.answers.q1).toEqual({ selectedOptionLabels: ["A"] });
    expect(hook.result.current.active?.isResponding).toBe(false);

    await hook.act(() => hook.result.current.actions.advance());
    await expect.poll(() => dispatchCommand.mock.calls.length).toBe(2);
    expect(dispatchedResponse(dispatchCommand, 1).response).toEqual({
      status: "answered",
      answers: { q1: { selectedOptionLabels: ["A"] } },
    });
    await hook.unmount();
    restore();
  });

  it("retains the card and draft while responding, then reclaims retryable work", async () => {
    const dispatchCommand = vi.fn(async () => undefined);
    const restore = installNativeApi(dispatchCommand);
    const initialInput = controllerInput();
    const hook = await renderHook(
      (props?: PendingUserInputControllerInput) =>
        usePendingUserInputController(props ?? initialInput),
      { initialProps: initialInput },
    );

    await hook.act(() =>
      hook.result.current.actions.selectSinglePreset("q1", { selectedOptionLabels: ["A"] }),
    );
    await expect.poll(() => hook.result.current.active?.isResponding).toBe(true);
    expect(hook.result.current.pendingUserInputs).toHaveLength(1);
    expect(hook.result.current.active?.answers.q1).toEqual({ selectedOptionLabels: ["A"] });

    await hook.rerender({
      ...initialInput,
      pendingInteractions: [
        pendingInteraction({
          threadId: THREAD_A,
          turnId: TURN_A,
          requestId: REQUEST_A,
          generation: GENERATION_A,
          status: "retryable",
        }),
      ],
    });
    await expect.poll(() => hook.result.current.active?.isResponding).toBe(false);
    expect(hook.result.current.active?.answers.q1).toEqual({ selectedOptionLabels: ["A"] });

    await hook.act(() => hook.result.current.actions.advance());
    await expect.poll(() => dispatchCommand.mock.calls.length).toBe(2);
    await hook.unmount();
    restore();
  });

  it("projects a fresh durable responding claim as a disabled card without local memory", async () => {
    const initialInput = controllerInput({
      pendingInteractions: [
        pendingInteraction({
          threadId: THREAD_A,
          turnId: TURN_A,
          requestId: REQUEST_A,
          generation: GENERATION_A,
          status: "responding",
          responseRequestedAt: new Date().toISOString(),
        }),
      ],
    });
    const hook = await renderHook(() => usePendingUserInputController(initialInput));

    expect(hook.result.current.pendingUserInputs).toHaveLength(1);
    expect(hook.result.current.active?.isResponding).toBe(true);
    await hook.act(() =>
      hook.result.current.actions.changeAnswer("q1", { selectedOptionLabels: ["A"] }),
    );
    expect(hook.result.current.active?.answers).toEqual({});
    await hook.unmount();
  });

  it("releases an uncertain claim without discarding the existing draft", async () => {
    const dispatchCommand = vi.fn(async () => undefined);
    const restore = installNativeApi(dispatchCommand);
    const initialInput = controllerInput();
    const hook = await renderHook(
      (props?: PendingUserInputControllerInput) =>
        usePendingUserInputController(props ?? initialInput),
      { initialProps: initialInput },
    );

    await hook.act(() =>
      hook.result.current.actions.selectSinglePreset("q1", { selectedOptionLabels: ["A"] }),
    );
    await expect.poll(() => hook.result.current.active?.isResponding).toBe(true);
    await hook.rerender({
      ...initialInput,
      pendingInteractions: [
        pendingInteraction({
          threadId: THREAD_A,
          turnId: TURN_A,
          requestId: REQUEST_A,
          generation: GENERATION_A,
          status: "uncertain",
        }),
      ],
    });

    await expect.poll(() => hook.result.current.active?.isResponding).toBe(false);
    expect(hook.result.current.active?.answers.q1).toEqual({ selectedOptionLabels: ["A"] });
    await hook.act(() => hook.result.current.actions.advance());
    await expect.poll(() => dispatchCommand.mock.calls.length).toBe(2);
    await hook.unmount();
    restore();
  });

  it("removes draft and restores focus only after canonical resolution in the same focused pane", async () => {
    const scheduleComposerFocus = vi.fn();
    const initialInput = controllerInput({ scheduleComposerFocus });
    const hook = await renderHook(
      (props?: PendingUserInputControllerInput) =>
        usePendingUserInputController(props ?? initialInput),
      { initialProps: initialInput },
    );

    await hook.act(() =>
      hook.result.current.actions.changeAnswer("q1", { selectedOptionLabels: ["A"] }),
    );
    await hook.rerender({
      ...initialInput,
      activities: [
        ...initialInput.activities,
        resolvedActivity({ requestId: REQUEST_A, generation: GENERATION_A, turnId: TURN_A }),
      ],
      pendingInteractions: [],
      authoritativeHasPending: false,
    });

    await expect.poll(() => hook.result.current.pendingUserInputs.length).toBe(0);
    expect(hook.result.current.active).toBeNull();
    expect(scheduleComposerFocus).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });

  it("preserves each thread draft across A to B to A navigation without stealing focus", async () => {
    const scheduleComposerFocus = vi.fn();
    const inputA = controllerInput({ scheduleComposerFocus, isFocusedPane: false });
    const inputB = controllerInput({
      threadId: THREAD_B,
      turnId: TURN_B,
      requestId: REQUEST_B,
      generation: GENERATION_B,
      questions: [textQuestion("b-text")],
      scheduleComposerFocus,
      isFocusedPane: false,
    });
    const hook = await renderHook(
      (props?: PendingUserInputControllerInput) => usePendingUserInputController(props ?? inputA),
      { initialProps: inputA },
    );

    await hook.act(() =>
      hook.result.current.actions.changeAnswer("q1", { selectedOptionLabels: ["B"] }),
    );
    await hook.rerender(inputB);
    await hook.act(() =>
      hook.result.current.actions.changeAnswer("b-text", {
        customSelected: true,
        customText: "draft B",
      }),
    );
    await hook.rerender(inputA);

    expect(hook.result.current.active?.answers.q1).toEqual({ selectedOptionLabels: ["B"] });
    expect(scheduleComposerFocus).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it("does not restore Composer focus when a background pane resolves", async () => {
    const scheduleComposerFocus = vi.fn();
    const initialInput = controllerInput({ scheduleComposerFocus, isFocusedPane: false });
    const hook = await renderHook(
      (props?: PendingUserInputControllerInput) =>
        usePendingUserInputController(props ?? initialInput),
      { initialProps: initialInput },
    );

    await hook.rerender({
      ...initialInput,
      activities: [
        ...initialInput.activities,
        resolvedActivity({ requestId: REQUEST_A, generation: GENERATION_A, turnId: TURN_A }),
      ],
      pendingInteractions: [],
      authoritativeHasPending: false,
    });
    await expect.poll(() => hook.result.current.pendingUserInputs.length).toBe(0);
    expect(scheduleComposerFocus).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it("encodes Ask Cancel as cancelled and leaves Stop Turn outside the controller", async () => {
    const dispatchCommand = vi.fn(async () => undefined);
    const restore = installNativeApi(dispatchCommand);
    const hook = await renderHook(() => usePendingUserInputController(controllerInput()));

    await hook.act(() => hook.result.current.actions.cancel());
    await expect.poll(() => dispatchCommand.mock.calls.length).toBe(1);
    expect(dispatchedResponse(dispatchCommand).response).toEqual({ status: "cancelled" });
    expect("stop" in hook.result.current.actions).toBe(false);
    await hook.unmount();
    restore();
  });
});
