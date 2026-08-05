// FILE: threadArchive.ts
// Purpose: Dispatches thread archive/unarchive commands from the client.
// Layer: Web orchestration helper
// Exports: archiveThreadFromClient, unarchiveThreadFromClient, isThreadAlreadyUnarchivedError

import type { ThreadId } from "@omnimind/contracts";
import { collectErrorMessages } from "@omnimind/shared/errorMessages";

import {
  archiveProductConversation,
  restoreProductConversation,
  type ProductConversationArchiveApi,
} from "../productConversationMutations";

// Archives a thread on the server. Archived threads are hidden from the sidebar
// but can be restored later via {@link unarchiveThreadFromClient}.
export async function archiveThreadFromClient(
  api: ProductConversationArchiveApi,
  threadId: ThreadId,
): Promise<void> {
  await archiveProductConversation(threadId, api);
}

// Detects the server invariant returned when an Undo races another restore (the
// thread is already unarchived). Matches the marker the server embeds in the
// invariant message — a single shared source of truth so the two sides cannot
// drift — and scopes it to the unarchive command and this thread so unrelated
// invariants (e.g. "thread not found") never read as "already restored".
export function isThreadAlreadyUnarchivedError(error: unknown, _threadId: ThreadId): boolean {
  const errorText = collectErrorMessages(error).join("\n");
  return errorText.includes("PRODUCT_CONVERSATION_NOT_ARCHIVED");
}

// Restores a previously archived thread back into the sidebar.
export async function unarchiveThreadFromClient(
  api: ProductConversationArchiveApi,
  threadId: ThreadId,
): Promise<void> {
  await restoreProductConversation(threadId, api);
}
