// FILE: productQueueActions.ts
// Purpose: Executes Product-owned Queue reorder and delete mutations.

import {
  PRODUCT_PROTOCOL_VERSION,
  type ProductConversationId,
  type ProductConversationSnapshot,
  type ProductQueueItem,
  ProductQueueItemId,
} from "@omnimind/contracts";

import type { ProductNativeApi } from "../../wsNativeApi";

export async function moveProductQueueItemNext(input: {
  readonly api: Pick<ProductNativeApi, "reorderQueue">;
  readonly conversationId: ProductConversationId;
  readonly queue: ReadonlyArray<ProductQueueItem>;
  readonly itemId: string;
}): Promise<ProductConversationSnapshot | null> {
  const orderedItemIds = input.queue.map((item) => item.id);
  const selectedIndex = orderedItemIds.findIndex((itemId) => itemId === input.itemId);
  if (selectedIndex <= 0) return null;
  orderedItemIds.splice(selectedIndex, 1);
  orderedItemIds.unshift(ProductQueueItemId.makeUnsafe(input.itemId));
  return input.api.reorderQueue({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    conversationId: input.conversationId,
    orderedItemIds,
  });
}

export async function deleteProductQueueItem(input: {
  readonly api: Pick<ProductNativeApi, "deleteQueueItem">;
  readonly conversationId: ProductConversationId;
  readonly item: ProductQueueItem;
}): Promise<ProductConversationSnapshot> {
  return input.api.deleteQueueItem({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    conversationId: input.conversationId,
    itemId: input.item.id,
    expectedRevision: input.item.revision,
  });
}
