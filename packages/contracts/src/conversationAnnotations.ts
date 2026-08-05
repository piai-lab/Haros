import { Schema } from "effect";

import {
  IsoDateTime,
  MessageId,
  NonNegativeInt,
  ThreadMarkerId,
  TrimmedNonEmptyString,
} from "./baseSchemas";

export const CONVERSATION_NOTES_MAX_CHARS = 16_384;
export const PINNED_MESSAGES_MAX_COUNT = 100;
export const PINNED_MESSAGE_LABEL_MAX_CHARS = 60;
export const THREAD_MARKERS_MAX_COUNT = 200;
export const THREAD_MARKER_LABEL_MAX_CHARS = 60;
export const THREAD_MARKER_SELECTED_TEXT_MAX_CHARS = 4_000;

export const ConversationNotes = Schema.String.check(
  Schema.isMaxLength(CONVERSATION_NOTES_MAX_CHARS),
);
export type ConversationNotes = typeof ConversationNotes.Type;
export const PinnedMessageLabel = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PINNED_MESSAGE_LABEL_MAX_CHARS),
);
export type PinnedMessageLabel = typeof PinnedMessageLabel.Type;
export const PinnedMessage = Schema.Struct({
  messageId: MessageId,
  label: Schema.optional(Schema.NullOr(PinnedMessageLabel)).pipe(
    Schema.withDecodingDefault(() => null),
  ),
  done: Schema.optional(Schema.Boolean).pipe(Schema.withDecodingDefault(() => false)),
  pinnedAt: IsoDateTime,
});
export type PinnedMessage = typeof PinnedMessage.Type;
export const ConversationPinnedMessages = Schema.Array(PinnedMessage).check(
  Schema.isMaxLength(PINNED_MESSAGES_MAX_COUNT),
);
export type ConversationPinnedMessages = typeof ConversationPinnedMessages.Type;

export const ThreadMarkerStyle = Schema.Literals(["highlight", "underline"]);
export type ThreadMarkerStyle = typeof ThreadMarkerStyle.Type;
export const ThreadMarkerColor = Schema.Literals(["yellow", "blue", "green", "pink"]);
export type ThreadMarkerColor = typeof ThreadMarkerColor.Type;
export const ThreadMarkerLabel = TrimmedNonEmptyString.check(
  Schema.isMaxLength(THREAD_MARKER_LABEL_MAX_CHARS),
);
export type ThreadMarkerLabel = typeof ThreadMarkerLabel.Type;
export const ThreadMarker = Schema.Struct({
  id: ThreadMarkerId,
  messageId: MessageId,
  startOffset: NonNegativeInt,
  endOffset: NonNegativeInt,
  selectedText: TrimmedNonEmptyString.check(
    Schema.isMaxLength(THREAD_MARKER_SELECTED_TEXT_MAX_CHARS),
  ),
  style: ThreadMarkerStyle,
  color: ThreadMarkerColor,
  label: Schema.optional(Schema.NullOr(ThreadMarkerLabel)).pipe(
    Schema.withDecodingDefault(() => null),
  ),
  done: Schema.optional(Schema.Boolean).pipe(Schema.withDecodingDefault(() => false)),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type ThreadMarker = typeof ThreadMarker.Type;
export const ThreadMarkers = Schema.Array(ThreadMarker).check(
  Schema.isMaxLength(THREAD_MARKERS_MAX_COUNT),
);
export type ThreadMarkers = typeof ThreadMarkers.Type;
