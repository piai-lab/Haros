// Purpose: Share the persisted conversation-title rename flow between header and
// sidebar surfaces. Local drafts remain local until first-send admission creates
// their Product conversation.

import { type ThreadId } from "@omnimind/contracts";
import { readNativeApi } from "../nativeApi";
import { updateProductConversationTitle } from "../productConversationMutations";
import { readProductNativeApi } from "../wsNativeApi";

type ThreadRenameOutcome = "empty" | "unchanged" | "unavailable" | "renamed";

export async function dispatchThreadRename(input: {
  threadId: ThreadId;
  newTitle: string;
  unchangedTitles: readonly string[];
}): Promise<ThreadRenameOutcome> {
  const trimmed = input.newTitle.trim();
  if (trimmed.length === 0) {
    return "empty";
  }
  if (input.unchangedTitles.includes(trimmed)) {
    return "unchanged";
  }

  if (!readNativeApi()) {
    return "unavailable";
  }
  const productApi = readProductNativeApi();

  await updateProductConversationTitle(input.threadId, trimmed, productApi);

  return "renamed";
}
