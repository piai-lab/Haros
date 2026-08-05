// FILE: threadMarkers.ts
// Purpose: Web helpers for per-thread text markers.
// Layer: Chat transcript selection actions and Environment panel.

import {
  PRODUCT_PROTOCOL_VERSION,
  THREAD_MARKER_LABEL_MAX_CHARS,
  type MessageId,
  ProductConversationId,
  ProductEntryId,
  ProductEntryMarkerId,
  ProductMutationId,
  type ThreadId,
  type ThreadMarker,
  type ThreadMarkerColor,
  type ThreadMarkerId,
  type ThreadMarkerStyle,
} from "@omnimind/contracts";
import { normalizeThreadMarkerLabel } from "@omnimind/shared/threadMarkers";

import { randomUUID } from "./lib/identifiers";
import { useProductStore } from "./store/productStore";
import { readProductNativeApi, type ProductNativeApi } from "./wsNativeApi";

const INLINE_EMPHASIS_PATTERN = /[*_`~]+/g;

export { normalizeThreadMarkerLabel };

export function deriveThreadMarkerLabel(marker: ThreadMarker): string {
  const cleaned = marker.selectedText
    .replace(INLINE_EMPHASIS_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length === 0) {
    return "Marked text";
  }
  return cleaned.length > THREAD_MARKER_LABEL_MAX_CHARS
    ? `${cleaned.slice(0, THREAD_MARKER_LABEL_MAX_CHARS - 1)}…`
    : cleaned;
}

export type ProductMarkerApi = Pick<
  ProductNativeApi,
  | "getConversationSnapshot"
  | "addEntryMarker"
  | "removeEntryMarker"
  | "setEntryMarkerDone"
  | "setEntryMarkerLabel"
>;

async function selectedTextDigest(selectedText: string): Promise<`sha256:${string}`> {
  const bytes = new TextEncoder().encode(selectedText);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  return `sha256:${hex}`;
}

async function markerTarget(api: ProductMarkerApi, threadId: ThreadId) {
  const conversationId = ProductConversationId.makeUnsafe(threadId);
  const snapshot = await api.getConversationSnapshot({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    conversationId,
  });
  return {
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    mutationId: ProductMutationId.makeUnsafe(randomUUID()),
    conversationId,
    expectedRevision: snapshot.readModel.conversation.revision,
  } as const;
}

async function publishMarkerMutation(
  threadId: ThreadId,
  mutate: (
    api: ProductMarkerApi,
    target: Awaited<ReturnType<typeof markerTarget>>,
  ) => ReturnType<ProductMarkerApi["removeEntryMarker"]>,
  targetStateReached: (
    snapshot: Awaited<ReturnType<ProductMarkerApi["getConversationSnapshot"]>>,
  ) => boolean,
  api: ProductMarkerApi = readProductNativeApi(),
): Promise<void> {
  const target = await markerTarget(api, threadId);
  let snapshot;
  try {
    snapshot = await mutate(api, target);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? error.code
        : null;
    if (code !== "WS_REQUEST_TIMEOUT" && code !== "WS_REQUEST_ABORTED") throw error;
    let current;
    try {
      current = await api.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: target.conversationId,
      });
    } catch {
      throw error;
    }
    if (!targetStateReached(current)) throw error;
    snapshot = current;
  }
  useProductStore.getState().setConversationSnapshot(snapshot);
}

export function dispatchThreadMarkerAdd(
  input: {
    threadId: ThreadId;
    markerId: ThreadMarkerId;
    messageId: MessageId;
    startOffset: number;
    endOffset: number;
    selectedText: string;
    style: ThreadMarkerStyle;
    color: ThreadMarkerColor;
  },
  api?: ProductMarkerApi,
): Promise<void> {
  return publishMarkerMutation(
    input.threadId,
    async (client, target) =>
      client.addEntryMarker({
        ...target,
        markerId: ProductEntryMarkerId.makeUnsafe(input.markerId),
        entryId: ProductEntryId.makeUnsafe(input.messageId),
        startOffset: input.startOffset,
        endOffset: input.endOffset,
        selectedText: input.selectedText,
        selectedTextDigest: await selectedTextDigest(input.selectedText),
        style: input.style,
        color: input.color,
      }),
    (snapshot) =>
      snapshot.readModel.entryMarkers.some(
        (marker) =>
          String(marker.id) === String(input.markerId) &&
          String(marker.entryId) === String(input.messageId) &&
          marker.startOffset === input.startOffset &&
          marker.endOffset === input.endOffset &&
          marker.selectedText === input.selectedText &&
          marker.style === input.style &&
          marker.color === input.color,
      ),
    api,
  );
}

export function dispatchThreadMarkerRemove(
  threadId: ThreadId,
  markerId: ThreadMarkerId,
  api?: ProductMarkerApi,
): Promise<void> {
  return publishMarkerMutation(
    threadId,
    (client, target) =>
      client.removeEntryMarker({
        ...target,
        markerId: ProductEntryMarkerId.makeUnsafe(markerId),
      }),
    (snapshot) =>
      !snapshot.readModel.entryMarkers.some((marker) => String(marker.id) === String(markerId)),
    api,
  );
}

export function dispatchThreadMarkerDoneSet(
  threadId: ThreadId,
  markerId: ThreadMarkerId,
  done: boolean,
  api?: ProductMarkerApi,
): Promise<void> {
  return publishMarkerMutation(
    threadId,
    (client, target) =>
      client.setEntryMarkerDone({
        ...target,
        markerId: ProductEntryMarkerId.makeUnsafe(markerId),
        done,
      }),
    (snapshot) =>
      snapshot.readModel.entryMarkers.some(
        (marker) => String(marker.id) === String(markerId) && marker.done === done,
      ),
    api,
  );
}

export function dispatchThreadMarkerLabelSet(
  threadId: ThreadId,
  markerId: ThreadMarkerId,
  label: string | null,
  api?: ProductMarkerApi,
): Promise<void> {
  const normalized = normalizeThreadMarkerLabel(label);
  return publishMarkerMutation(
    threadId,
    (client, target) =>
      client.setEntryMarkerLabel({
        ...target,
        markerId: ProductEntryMarkerId.makeUnsafe(markerId),
        label: normalized,
      }),
    (snapshot) =>
      snapshot.readModel.entryMarkers.some(
        (marker) => String(marker.id) === String(markerId) && marker.label === normalized,
      ),
    api,
  );
}
