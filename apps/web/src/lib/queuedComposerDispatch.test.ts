import { ThreadId } from "@harnessos/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { QueuedComposerTurn } from "../composerDraftStore";
import {
  makeQueuedChatTurn,
  makeQueuedTurn,
  resetComposerDraftStore,
} from "../composerDraftStoreTestFixtures";
import { useStore } from "../store";
import { initialState } from "../storeState";
import { makeState, makeThread } from "../storeTestFixtures";
import { dispatchQueuedComposerTurnHeadless } from "./queuedComposerDispatch";

const nativeApiMocks = vi.hoisted(() => ({
  dispatchCommand: vi.fn(async () => undefined),
}));

vi.mock("../nativeApi", () => ({
  readNativeApi: () => ({ orchestration: { dispatchCommand: nativeApiMocks.dispatchCommand } }),
}));

const THREAD_ID = ThreadId.makeUnsafe("thread-queued-headless");

describe("dispatchQueuedComposerTurnHeadless", () => {
  beforeEach(() => {
    resetComposerDraftStore();
    useStore.setState(initialState);
    nativeApiMocks.dispatchCommand.mockClear();
    useStore.setState(makeState(makeThread({ id: THREAD_ID })));
  });

  afterEach(() => {
    resetComposerDraftStore();
    useStore.setState(initialState);
  });

  it("dispatches a snapshotted chat turn through the canonical turn command", async () => {
    const queuedTurn = makeQueuedChatTurn("queued-chat-headless") as QueuedComposerTurn;
    const succeeded = await dispatchQueuedComposerTurnHeadless({
      threadId: THREAD_ID,
      queuedTurn,
      dispatchMode: "queue",
      assistantDeliveryMode: "streaming",
    });

    expect(succeeded).toBe(true);
    expect(nativeApiMocks.dispatchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "thread.turn.start",
        threadId: THREAD_ID,
        dispatchMode: "queue",
        engineSelection: queuedTurn.engineSelection,
        interactionMode: "default",
        runtimeMode: "full-access",
        assistantDeliveryMode: "streaming",
        message: expect.objectContaining({ role: "user", text: expect.stringContaining("queued") }),
      }),
    );
  });

  it("dispatches a queued plan follow-up with its captured binding", async () => {
    const queuedTurn = makeQueuedTurn("queued-plan-headless");
    const succeeded = await dispatchQueuedComposerTurnHeadless({
      threadId: THREAD_ID,
      queuedTurn,
      dispatchMode: "queue",
      assistantDeliveryMode: "buffered",
    });

    expect(succeeded).toBe(true);
    expect(nativeApiMocks.dispatchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "thread.turn.start",
        threadId: THREAD_ID,
        engineSelection: queuedTurn.engineSelection,
        interactionMode: "plan",
        assistantDeliveryMode: "buffered",
        message: expect.objectContaining({ role: "user", attachments: [] }),
      }),
    );
  });

  it("refuses to dispatch a queue item for a missing thread", async () => {
    useStore.setState(initialState);
    const succeeded = await dispatchQueuedComposerTurnHeadless({
      threadId: THREAD_ID,
      queuedTurn: makeQueuedChatTurn("queued-missing"),
      dispatchMode: "queue",
      assistantDeliveryMode: "streaming",
    });

    expect(succeeded).toBe(false);
    expect(nativeApiMocks.dispatchCommand).not.toHaveBeenCalled();
  });
});
