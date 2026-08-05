// FILE: archivedThreadDelete.test.ts
// Purpose: Verifies archived-thread delete coordination without rendering settings UI.
// Layer: Web orchestration helper tests

import { ThreadId } from "@omnimind/contracts";
import { describe, expect, it, vi } from "vitest";

import { deleteArchivedThreadsFromClient } from "./archivedThreadDelete";

const snapshot = { readModel: { conversation: { revision: 3 } } } as never;

describe("deleteArchivedThreadsFromClient", () => {
  it("dispatches delete, then removes the local row", async () => {
    const threadId = ThreadId.makeUnsafe("thread-archived");
    const deleteConversation = vi.fn().mockResolvedValue({ sequence: 11 });
    const removeDeletedThreadFromClientState = vi.fn();

    await deleteArchivedThreadsFromClient({
      api: {
        getConversationSnapshot: vi.fn().mockResolvedValue(snapshot),
        getShellSnapshot: vi.fn(),
        deleteConversation,
      },
      threadIds: [threadId],
      removeDeletedThreadFromClientState,
    });

    expect(deleteConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: threadId,
        expectedRevision: 3,
        mutationId: expect.any(String),
      }),
    );
    expect(removeDeletedThreadFromClientState).toHaveBeenCalledOnce();
    expect(removeDeletedThreadFromClientState).toHaveBeenCalledWith(threadId);
    const dispatchOrder = deleteConversation.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER;
    const removeOrder =
      removeDeletedThreadFromClientState.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER;
    expect(dispatchOrder).toBeLessThan(removeOrder);
  });

  it("deletes multiple archived threads and removes each locally once", async () => {
    const threadA = ThreadId.makeUnsafe("thread-archived-a");
    const threadB = ThreadId.makeUnsafe("thread-archived-b");
    const deleteConversation = vi.fn().mockResolvedValue({ sequence: 11 });
    const removeDeletedThreadFromClientState = vi.fn();

    await deleteArchivedThreadsFromClient({
      api: {
        getConversationSnapshot: vi.fn().mockResolvedValue(snapshot),
        getShellSnapshot: vi.fn(),
        deleteConversation,
      },
      threadIds: [threadA, threadA, threadB],
      removeDeletedThreadFromClientState,
    });

    expect(deleteConversation).toHaveBeenCalledTimes(2);
    expect(deleteConversation).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ conversationId: threadA, expectedRevision: 3 }),
    );
    expect(deleteConversation).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ conversationId: threadB, expectedRevision: 3 }),
    );
    expect(removeDeletedThreadFromClientState.mock.calls).toEqual([[threadA], [threadB]]);
  });

  it("reconciles successful archived deletes when a later bulk delete fails", async () => {
    const threadA = ThreadId.makeUnsafe("thread-archived-a");
    const threadB = ThreadId.makeUnsafe("thread-archived-b");
    const dispatchError = new Error("delete failed");
    const deleteConversation = vi
      .fn()
      .mockResolvedValueOnce({ sequence: 11 })
      .mockRejectedValueOnce(dispatchError);
    const removeDeletedThreadFromClientState = vi.fn();

    await expect(
      deleteArchivedThreadsFromClient({
        api: {
          getConversationSnapshot: vi.fn().mockResolvedValue(snapshot),
          getShellSnapshot: vi.fn(),
          deleteConversation,
        },
        threadIds: [threadA, threadB],
        removeDeletedThreadFromClientState,
      }),
    ).rejects.toThrow(dispatchError);

    expect(deleteConversation).toHaveBeenCalledTimes(2);
    expect(removeDeletedThreadFromClientState.mock.calls).toEqual([[threadA]]);
  });
});
