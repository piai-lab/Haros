// FILE: threadArchive.test.ts
// Purpose: Verifies client helpers for archive/unarchive orchestration commands.
// Layer: Web lib test
// Exports: Vitest cases for threadArchive helpers

import { ThreadId } from "@omnimind/contracts";
import { assert, describe, expect, it, vi } from "vitest";
import type { ProductConversationArchiveApi } from "../productConversationMutations";

import {
  archiveThreadFromClient,
  isThreadAlreadyUnarchivedError,
  unarchiveThreadFromClient,
} from "./threadArchive";

const THREAD_ID = ThreadId.makeUnsafe("thread-archive");

describe("threadArchive client helpers", () => {
  it("dispatches closed Product archive and restore mutations with current revision", async () => {
    const getConversationSnapshot = vi.fn(async () => ({
      readModel: { conversation: { revision: 4 } },
    }) as never);
    const archiveConversation = vi.fn(async () => ({}) as never);
    const restoreConversation = vi.fn(async () => ({}) as never);
    const api: ProductConversationArchiveApi = {
      getConversationSnapshot,
      archiveConversation,
      restoreConversation,
    };

    await archiveThreadFromClient(api, THREAD_ID);
    await unarchiveThreadFromClient(api, THREAD_ID);

    expect(archiveConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        protocolVersion: 1,
        conversationId: THREAD_ID,
        expectedRevision: 4,
        mutationId: expect.any(String),
      }),
    );
    expect(restoreConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        protocolVersion: 1,
        conversationId: THREAD_ID,
        expectedRevision: 4,
        mutationId: expect.any(String),
      }),
    );
    expect(getConversationSnapshot).toHaveBeenCalledTimes(2);
  });

  it("recognizes the already-unarchived invariant returned by the server", () => {
    const error = new Error("PRODUCT_CONVERSATION_NOT_ARCHIVED: Conversation is not archived.");

    assert.equal(isThreadAlreadyUnarchivedError(error, THREAD_ID), true);
  });

  it("does not treat unrelated invariant errors as already restored", () => {
    const error = new Error(
      "PRODUCT_CONVERSATION_ALREADY_ARCHIVED: Conversation is already archived.",
    );

    assert.equal(isThreadAlreadyUnarchivedError(error, THREAD_ID), false);
  });
});
