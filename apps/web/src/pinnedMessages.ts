// FILE: pinnedMessages.ts
// Purpose: Pure transforms + dispatch helpers for per-thread pinned messages and notes.
// Layer: Chat environment panel + message timeline helpers.

import {
  PINNED_MESSAGE_LABEL_MAX_CHARS,
  PRODUCT_PROTOCOL_VERSION,
  type MessageId,
  type PinnedMessage,
  ProductConversationId,
  ProductEntryId,
  ProductMutationId,
  type ThreadId,
} from "@omnimind/contracts";
import {
  addPinnedMessage,
  clampThreadNotes,
  isMessagePinned,
  normalizePinLabel,
  removePinnedMessage,
  setPinnedMessageDone,
  setPinnedMessageLabel,
  togglePinnedMessage,
  togglePinnedMessageDone,
} from "@omnimind/shared/pinnedMessages";

import { randomUUID } from "./lib/identifiers";
import { updateProductConversationNotes } from "./productConversationMutations";
import { useProductStore } from "./store/productStore";
import { readProductNativeApi, type ProductNativeApi } from "./wsNativeApi";

// Strip the most common leading block markers (headings, list bullets, blockquotes)
// and inline emphasis so an auto-derived label reads as plain prose.
const LEADING_BLOCK_MARKER_PATTERN = /^\s*(?:#{1,6}\s+|>+\s*|[-*+]\s+|\d+[.)]\s+)/;
const INLINE_EMPHASIS_PATTERN = /[*_`~]+/g;

/**
 * Derive a human-readable label from a pinned message's text: the first non-empty
 * line, lightly de-marked and truncated. Returns "" when there is no usable text.
 */
export function derivePinLabel(messageText: string): string {
  const normalized = messageText.replace(/\r\n/g, "\n");
  let firstLine = "";
  for (const rawLine of normalized.split("\n")) {
    const candidate = rawLine.replace(LEADING_BLOCK_MARKER_PATTERN, "").trim();
    if (candidate.length > 0) {
      firstLine = candidate;
      break;
    }
  }
  if (firstLine.length === 0) {
    return "";
  }
  const cleaned = firstLine.replace(INLINE_EMPHASIS_PATTERN, "").replace(/\s+/g, " ").trim();
  if (cleaned.length === 0) {
    return "";
  }
  return cleaned.length > PINNED_MESSAGE_LABEL_MAX_CHARS
    ? `${cleaned.slice(0, PINNED_MESSAGE_LABEL_MAX_CHARS - 1)}…`
    : cleaned;
}

/**
 * Resolve the label to render for a pin: an explicit user override wins, otherwise
 * the auto-derived label from the message text. Returns "" when the message text is
 * unavailable and there is no override (callers render their own fallback).
 */
export function displayLabelFor(pin: PinnedMessage, messageText: string | undefined): string {
  const override = pin.label?.trim();
  if (override) {
    return override;
  }
  return messageText === undefined ? "" : derivePinLabel(messageText);
}

export { clampThreadNotes, isMessagePinned, normalizePinLabel };

export function addPin(
  pins: readonly PinnedMessage[] | undefined,
  messageId: MessageId,
  pinnedAt: string,
): PinnedMessage[] {
  return addPinnedMessage(pins, { messageId, label: null, done: false, pinnedAt });
}

export function removePin(
  pins: readonly PinnedMessage[] | undefined,
  messageId: MessageId,
): PinnedMessage[] {
  return removePinnedMessage(pins, messageId);
}

export function restorePinAtIndex(
  pins: readonly PinnedMessage[] | undefined,
  pin: PinnedMessage,
  index: number,
): PinnedMessage[] {
  const existingPins = pins ?? [];
  if (isMessagePinned(existingPins, pin.messageId)) {
    return existingPins as PinnedMessage[];
  }
  const nextPins = [...existingPins];
  nextPins.splice(Math.max(0, Math.min(index, nextPins.length)), 0, pin);
  return nextPins;
}

export function togglePin(
  pins: readonly PinnedMessage[] | undefined,
  messageId: MessageId,
  pinnedAt: string,
): PinnedMessage[] {
  return togglePinnedMessage(pins, { messageId, label: null, done: false, pinnedAt });
}

export function togglePinDone(
  pins: readonly PinnedMessage[] | undefined,
  messageId: MessageId,
): PinnedMessage[] {
  return togglePinnedMessageDone(pins, messageId);
}

export function setPinDone(
  pins: readonly PinnedMessage[] | undefined,
  messageId: MessageId,
  done: boolean,
): PinnedMessage[] {
  return setPinnedMessageDone(pins, messageId, done);
}

/** Set (or clear, with `null`) a pin's user-provided label. Empty input clears it. */
export function setPinLabel(
  pins: readonly PinnedMessage[] | undefined,
  messageId: MessageId,
  label: string | null,
): PinnedMessage[] {
  return setPinnedMessageLabel(pins, messageId, label);
}

export type ProductPinApi = Pick<
  ProductNativeApi,
  | "getConversationSnapshot"
  | "addEntryPin"
  | "removeEntryPin"
  | "setEntryPinDone"
  | "setEntryPinLabel"
>;

async function pinTarget(api: ProductPinApi, threadId: ThreadId, messageId: MessageId) {
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
    entryId: ProductEntryId.makeUnsafe(messageId),
  } as const;
}

async function publishProductPinMutation(
  threadId: ThreadId,
  messageId: MessageId,
  mutate: (
    api: ProductPinApi,
    target: Awaited<ReturnType<typeof pinTarget>>,
  ) => ReturnType<ProductPinApi["addEntryPin"]>,
  targetStateReached: (
    snapshot: Awaited<ReturnType<ProductPinApi["getConversationSnapshot"]>>,
  ) => boolean,
  api: ProductPinApi = readProductNativeApi(),
): Promise<void> {
  const target = await pinTarget(api, threadId, messageId);
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

export function dispatchPinnedMessageAdd(
  threadId: ThreadId,
  messageId: MessageId,
  api?: ProductPinApi,
): Promise<void> {
  return publishProductPinMutation(
    threadId,
    messageId,
    (client, target) => client.addEntryPin(target),
    (snapshot) =>
      snapshot.readModel.entryPins.some((pin) => String(pin.entryId) === String(messageId)),
    api,
  );
}

export function dispatchPinnedMessageRemove(
  threadId: ThreadId,
  messageId: MessageId,
  api?: ProductPinApi,
): Promise<void> {
  return publishProductPinMutation(
    threadId,
    messageId,
    (client, target) => client.removeEntryPin(target),
    (snapshot) =>
      !snapshot.readModel.entryPins.some((pin) => String(pin.entryId) === String(messageId)),
    api,
  );
}

export function dispatchPinnedMessageDoneSet(
  threadId: ThreadId,
  messageId: MessageId,
  done: boolean,
  api?: ProductPinApi,
): Promise<void> {
  return publishProductPinMutation(
    threadId,
    messageId,
    (client, target) => client.setEntryPinDone({ ...target, done }),
    (snapshot) =>
      snapshot.readModel.entryPins.some(
        (pin) => String(pin.entryId) === String(messageId) && pin.done === done,
      ),
    api,
  );
}

export function dispatchPinnedMessageLabelSet(
  threadId: ThreadId,
  messageId: MessageId,
  label: string | null,
  api?: ProductPinApi,
): Promise<void> {
  const normalized = normalizePinLabel(label);
  return publishProductPinMutation(
    threadId,
    messageId,
    (client, target) => client.setEntryPinLabel({ ...target, label: normalized }),
    (snapshot) =>
      snapshot.readModel.entryPins.some(
        (pin) => String(pin.entryId) === String(messageId) && pin.label === normalized,
      ),
    api,
  );
}

export function dispatchThreadNotes(threadId: ThreadId, notes: string): Promise<void> {
  return updateProductConversationNotes(threadId, clampThreadNotes(notes)).then(() => undefined);
}
