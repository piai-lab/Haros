import { ThreadId, TurnId } from "@harnessos/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useComposerDraftStore } from "../composerDraftStore";
import { makeQueuedChatTurn, resetComposerDraftStore } from "../composerDraftStoreTestFixtures";
import { useStore } from "../store";
import { initialState } from "../storeState";
import { makeState, makeThread } from "../storeTestFixtures";
import type { Thread, ThreadSession } from "../types";
import {
  armQueuedComposerSteerGate,
  claimQueuedComposerAutoDispatch,
  endQueuedComposerAutoDispatch,
  getQueuedComposerSteerGate,
  isQueuedComposerAwaitingTurnStart,
  releaseQueuedComposerAutoDispatch,
  resetQueuedComposerDrainForTests,
  shouldAutoDispatchQueuedComposerTurn,
  startQueuedComposerDrainWatcher,
  tryBeginQueuedComposerAutoDispatch,
  type QueuedComposerAutoDispatchGates,
} from "./queuedComposerDrain";

const THREAD_ID = ThreadId.makeUnsafe("thread-queued-drain");
const LIVE_TURN_ID = TurnId.makeUnsafe("turn-live");

const OPEN_GATES: QueuedComposerAutoDispatchGates = {
  hasQueueableLiveTurn: false,
  phase: "ready",
  isSendBusy: false,
  isConnecting: false,
  isAwaitingTurnStart: false,
  steerGate: null,
  hasPendingApproval: false,
  hasPendingProgress: false,
  pendingUserInputCount: 0,
  queuedTurnCount: 1,
};

function makeSession(status: ThreadSession["status"], activeTurnId?: TurnId): ThreadSession {
  return {
    engine: "codex",
    status,
    orchestrationStatus: status === "running" ? "running" : "idle",
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
    ...(activeTurnId ? { activeTurnId } : {}),
  };
}

function seedThread(thread: Thread): void {
  useStore.setState(makeState(thread));
}

async function flushDrain(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("shouldAutoDispatchQueuedComposerTurn", () => {
  it("allows only an idle, unblocked thread with a queued turn", () => {
    expect(shouldAutoDispatchQueuedComposerTurn(OPEN_GATES)).toBe(true);
    expect(
      shouldAutoDispatchQueuedComposerTurn({
        ...OPEN_GATES,
        hasQueueableLiveTurn: true,
        phase: "running",
      }),
    ).toBe(false);
    expect(shouldAutoDispatchQueuedComposerTurn({ ...OPEN_GATES, isAwaitingTurnStart: true })).toBe(
      false,
    );
    expect(shouldAutoDispatchQueuedComposerTurn({ ...OPEN_GATES, hasPendingApproval: true })).toBe(
      false,
    );
    expect(shouldAutoDispatchQueuedComposerTurn({ ...OPEN_GATES, pendingUserInputCount: 1 })).toBe(
      false,
    );
    expect(shouldAutoDispatchQueuedComposerTurn({ ...OPEN_GATES, queuedTurnCount: 0 })).toBe(false);
  });
});

describe("queued Composer drain watcher", () => {
  type DrainDispatch = NonNullable<
    NonNullable<Parameters<typeof startQueuedComposerDrainWatcher>[0]>["dispatch"]
  >;
  const dispatch = vi.fn<DrainDispatch>(async () => true);
  let stopWatcher: () => void;

  beforeEach(() => {
    resetQueuedComposerDrainForTests();
    resetComposerDraftStore();
    useStore.setState(initialState);
    dispatch.mockReset();
    dispatch.mockResolvedValue(true);
    stopWatcher = startQueuedComposerDrainWatcher({ dispatch });
  });

  afterEach(() => {
    vi.useRealTimers();
    resetQueuedComposerDrainForTests();
    resetComposerDraftStore();
    useStore.setState(initialState);
  });

  it("drains a background thread when its live turn settles", async () => {
    seedThread(makeThread({ id: THREAD_ID, session: makeSession("running", LIVE_TURN_ID) }));
    useComposerDraftStore
      .getState()
      .enqueueQueuedTurn(THREAD_ID, makeQueuedChatTurn("queued-background"));
    await flushDrain();
    expect(dispatch).not.toHaveBeenCalled();

    seedThread(makeThread({ id: THREAD_ID, session: makeSession("ready") }));
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: THREAD_ID,
        dispatchMode: "queue",
        queuedTurn: expect.objectContaining({ id: "queued-background" }),
      }),
    );
  });

  it("waits for the accepted turn to start before sending the next queue item", async () => {
    seedThread(makeThread({ id: THREAD_ID, session: makeSession("ready") }));
    useComposerDraftStore.getState().enqueueQueuedTurn(THREAD_ID, makeQueuedChatTurn("queued-1"));
    useComposerDraftStore.getState().enqueueQueuedTurn(THREAD_ID, makeQueuedChatTurn("queued-2"));

    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1));
    await flushDrain();
    expect(isQueuedComposerAwaitingTurnStart(THREAD_ID)).toBe(true);
    expect(
      useComposerDraftStore.getState().draftsByThreadId[THREAD_ID]?.queuedTurns.map(({ id }) => id),
    ).toEqual(["queued-2"]);

    seedThread(makeThread({ id: THREAD_ID, session: makeSession("running", LIVE_TURN_ID) }));
    await flushDrain();
    expect(dispatch).toHaveBeenCalledTimes(1);
    seedThread(makeThread({ id: THREAD_ID, session: makeSession("ready") }));
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(2));
  });

  it("does not drain a thread claimed by its mounted ChatView", async () => {
    seedThread(makeThread({ id: THREAD_ID, session: makeSession("ready") }));
    claimQueuedComposerAutoDispatch(THREAD_ID);
    useComposerDraftStore
      .getState()
      .enqueueQueuedTurn(THREAD_ID, makeQueuedChatTurn("queued-open"));
    await flushDrain();
    expect(dispatch).not.toHaveBeenCalled();

    releaseQueuedComposerAutoDispatch(THREAD_ID);
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1));
  });

  it("keeps a thread claimed until every mounted ChatView releases it", async () => {
    seedThread(makeThread({ id: THREAD_ID, session: makeSession("ready") }));
    claimQueuedComposerAutoDispatch(THREAD_ID);
    claimQueuedComposerAutoDispatch(THREAD_ID);
    useComposerDraftStore
      .getState()
      .enqueueQueuedTurn(THREAD_ID, makeQueuedChatTurn("queued-multi-view"));

    releaseQueuedComposerAutoDispatch(THREAD_ID);
    await flushDrain();
    expect(dispatch).not.toHaveBeenCalled();

    releaseQueuedComposerAutoDispatch(THREAD_ID);
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1));
  });

  it("does not dispatch a queued microtask after the final watcher stops", async () => {
    seedThread(makeThread({ id: THREAD_ID, session: makeSession("ready") }));
    claimQueuedComposerAutoDispatch(THREAD_ID);
    useComposerDraftStore
      .getState()
      .enqueueQueuedTurn(THREAD_ID, makeQueuedChatTurn("queued-after-stop"));

    stopWatcher();
    releaseQueuedComposerAutoDispatch(THREAD_ID);
    await flushDrain();

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("shares one exclusive per-thread send lock with ChatView", async () => {
    seedThread(makeThread({ id: THREAD_ID, session: makeSession("ready") }));
    claimQueuedComposerAutoDispatch(THREAD_ID);
    useComposerDraftStore
      .getState()
      .enqueueQueuedTurn(THREAD_ID, makeQueuedChatTurn("queued-locked"));
    expect(tryBeginQueuedComposerAutoDispatch(THREAD_ID)).toBe(true);

    releaseQueuedComposerAutoDispatch(THREAD_ID);
    await flushDrain();
    expect(dispatch).not.toHaveBeenCalled();
    endQueuedComposerAutoDispatch(THREAD_ID);
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1));
  });

  it("keeps a steer gate authoritative across mount transitions", async () => {
    seedThread(makeThread({ id: THREAD_ID, session: makeSession("ready") }));
    const gate = {
      sawInterruptGap: false,
      gapStartedAt: null,
      armedActiveTurnId: "turn-original",
    };
    armQueuedComposerSteerGate(THREAD_ID, gate);
    useComposerDraftStore
      .getState()
      .enqueueQueuedTurn(THREAD_ID, makeQueuedChatTurn("queued-steer"));
    await flushDrain();

    expect(dispatch).not.toHaveBeenCalled();
    expect(getQueuedComposerSteerGate(THREAD_ID)).toEqual(
      expect.objectContaining({ armedActiveTurnId: gate.armedActiveTurnId }),
    );
  });

  it("bounds retries for a persistently failing background dispatch", async () => {
    vi.useFakeTimers();
    dispatch.mockResolvedValue(false);
    seedThread(makeThread({ id: THREAD_ID, session: makeSession("ready") }));
    useComposerDraftStore
      .getState()
      .enqueueQueuedTurn(THREAD_ID, makeQueuedChatTurn("queued-failing"));

    await flushDrain();
    expect(dispatch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(dispatch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(dispatch).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(dispatch).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(dispatch).toHaveBeenCalledTimes(4);
  });
});
