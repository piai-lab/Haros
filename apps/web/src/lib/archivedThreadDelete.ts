// FILE: archivedThreadDelete.ts
// Purpose: Coordinates archived-thread deletion with immediate local removal.
// Layer: Web orchestration helper
// Exports: deleteArchivedThreadsFromClient

import type { ThreadId } from "@omnimind/contracts";

import { reconcileDeletedThreadsFromClient } from "./deletedThreadClientReconciliation";
import {
  deleteProductConversation,
  type ProductConversationDeleteApi,
} from "../productConversationMutations";

interface DeleteArchivedThreadsFromClientInput {
  api: ProductConversationDeleteApi;
  threadIds: ReadonlyArray<ThreadId>;
  removeDeletedThreadFromClientState: (threadId: ThreadId) => void;
}

// Deletes a group of archived threads and reconciles successful ids once at the end.
export async function deleteArchivedThreadsFromClient(
  input: DeleteArchivedThreadsFromClientInput,
): Promise<void> {
  const threadIds = [...new Set(input.threadIds)];
  if (threadIds.length === 0) {
    return;
  }

  const deletedThreadIds: ThreadId[] = [];
  try {
    for (const threadId of threadIds) {
      await deleteProductConversation(threadId, input.api);
      deletedThreadIds.push(threadId);
    }
  } finally {
    await reconcileDeletedThreadsFromClient({
      threadIds: deletedThreadIds,
      removeDeletedThreadFromClientState: input.removeDeletedThreadFromClientState,
    });
  }
}
