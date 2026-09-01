import { Schema } from "effect";

import { NonNegativeInt, ThreadId, TrimmedNonEmptyString } from "./baseSchemas";

export const TOOL_RESULT_PREVIEW_BYTES = 16 * 1024;
export const TOOL_RESULT_PREVIEW_HEAD_BYTES = 12 * 1024;
export const TOOL_RESULT_PREVIEW_TAIL_BYTES = 4 * 1024;
export const TOOL_INPUT_PREVIEW_BYTES = 4 * 1024;
export const TOOL_ACTIVITY_JSON_MAX_BYTES = 24 * 1024;

export const EngineToolActionKind = Schema.Literals([
  "execute",
  "read",
  "edit",
  "write",
  "search",
  "listFiles",
  "webAccess",
  "unknown",
]);
export type EngineToolActionKind = typeof EngineToolActionKind.Type;

export const ToolTextPreviewV1 = Schema.Struct({
  head: Schema.String,
  tail: Schema.optional(Schema.String),
  clipped: Schema.Boolean,
  originalBytes: NonNegativeInt,
});
export type ToolTextPreviewV1 = typeof ToolTextPreviewV1.Type;

export const ToolResultProcessSnapshotV1 = Schema.Struct({
  exitCode: Schema.optional(Schema.Number),
  stdout: Schema.optional(ToolTextPreviewV1),
  stderr: Schema.optional(ToolTextPreviewV1),
});

export const ToolResultSnapshotV1 = Schema.Struct({
  version: Schema.Literal(1),
  toolCallId: TrimmedNonEmptyString,
  toolName: TrimmedNonEmptyString,
  actionKind: EngineToolActionKind,
  inputPreview: Schema.optional(ToolTextPreviewV1),
  result: Schema.optional(
    Schema.Struct({
      output: Schema.optional(ToolTextPreviewV1),
      process: Schema.optional(ToolResultProcessSnapshotV1),
      isError: Schema.Boolean,
    }),
  ),
});
export type ToolResultSnapshotV1 = typeof ToolResultSnapshotV1.Type;

export const ToolResultReadInput = Schema.Struct({
  threadId: ThreadId,
  toolCallId: TrimmedNonEmptyString,
});
export type ToolResultReadInput = typeof ToolResultReadInput.Type;

export const ToolResultFullBlock = Schema.Union([
  Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }),
  Schema.Struct({
    type: Schema.Literal("image"),
    data: Schema.String,
    mimeType: TrimmedNonEmptyString,
  }),
]);
export type ToolResultFullBlock = typeof ToolResultFullBlock.Type;

export const ToolResultFullReadResult = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("found"),
    toolName: TrimmedNonEmptyString,
    isError: Schema.Boolean,
    content: Schema.Array(ToolResultFullBlock),
  }),
  Schema.Struct({
    status: Schema.Literal("unavailable"),
    reason: Schema.Literals(["not_found", "session_unavailable", "read_failed"]),
  }),
]);
export type ToolResultFullReadResult = typeof ToolResultFullReadResult.Type;
