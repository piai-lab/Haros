import { Schema } from "effect";

import { TrimmedNonEmptyString } from "./baseSchemas";
import { EDITABLE_TEXT_FILE_MAX_BYTES } from "./editableText";

export const OmniMindAgentPromptResourceKind = Schema.Literals([
  "globalContext",
  "appendSystem",
  "system",
]);
export type OmniMindAgentPromptResourceKind = typeof OmniMindAgentPromptResourceKind.Type;

export const OmniMindAgentPromptSourceId = Schema.Literals([
  "AGENTS.override.md",
  "AGENTS.md",
  "AGENTS.MD",
  "CLAUDE.md",
  "CLAUDE.MD",
  "APPEND_SYSTEM.md",
  "SYSTEM.md",
]);
export type OmniMindAgentPromptSourceId = typeof OmniMindAgentPromptSourceId.Type;

const PromptVersion = TrimmedNonEmptyString.check(
  Schema.isMinLength(64),
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-f0-9]{64}$/u),
);
const DisplayPath = TrimmedNonEmptyString.check(Schema.isMaxLength(4_096));
const PromptContent = Schema.String.check(Schema.isMaxLength(EDITABLE_TEXT_FILE_MAX_BYTES));

export const OmniMindAgentPromptCandidate = Schema.Struct({
  sourceId: OmniMindAgentPromptSourceId,
  displayPath: DisplayPath,
  exists: Schema.Boolean,
  active: Schema.Boolean,
});
export type OmniMindAgentPromptCandidate = typeof OmniMindAgentPromptCandidate.Type;

export const OmniMindAgentPromptResourceSnapshot = Schema.Struct({
  kind: OmniMindAgentPromptResourceKind,
  sourceId: Schema.NullOr(OmniMindAgentPromptSourceId),
  displayPath: Schema.NullOr(DisplayPath),
  exists: Schema.Boolean,
  version: Schema.NullOr(PromptVersion),
  contentLoaded: Schema.Boolean,
  content: Schema.NullOr(PromptContent),
});
export type OmniMindAgentPromptResourceSnapshot = typeof OmniMindAgentPromptResourceSnapshot.Type;

export const OmniMindAgentPromptSnapshot = Schema.Struct({
  globalContextCandidates: Schema.Array(OmniMindAgentPromptCandidate).check(
    Schema.isMinLength(5),
    Schema.isMaxLength(5),
  ),
  globalContext: OmniMindAgentPromptResourceSnapshot,
  appendSystem: OmniMindAgentPromptResourceSnapshot,
  system: OmniMindAgentPromptResourceSnapshot,
  maxBytes: Schema.Literal(EDITABLE_TEXT_FILE_MAX_BYTES),
});
export type OmniMindAgentPromptSnapshot = typeof OmniMindAgentPromptSnapshot.Type;

export const OmniMindAgentPromptGetSnapshotInput = Schema.Struct({
  resource: Schema.optional(OmniMindAgentPromptResourceKind),
});
export type OmniMindAgentPromptGetSnapshotInput = typeof OmniMindAgentPromptGetSnapshotInput.Type;

export const OmniMindAgentPromptCreateInput = Schema.Struct({
  action: Schema.Literal("create"),
  resource: OmniMindAgentPromptResourceKind,
  content: PromptContent,
});
export const OmniMindAgentPromptUpdateInput = Schema.Struct({
  action: Schema.Literal("update"),
  resource: OmniMindAgentPromptResourceKind,
  sourceId: OmniMindAgentPromptSourceId,
  expectedVersion: PromptVersion,
  content: PromptContent,
});
export const OmniMindAgentPromptRemoveInput = Schema.Struct({
  action: Schema.Literal("remove"),
  resource: OmniMindAgentPromptResourceKind,
  sourceId: OmniMindAgentPromptSourceId,
  expectedVersion: PromptVersion,
});

export const OmniMindAgentPromptMutationInput = Schema.Union([
  OmniMindAgentPromptCreateInput,
  OmniMindAgentPromptUpdateInput,
  OmniMindAgentPromptRemoveInput,
]);
export type OmniMindAgentPromptMutationInput = typeof OmniMindAgentPromptMutationInput.Type;

const PromptMutationCompleted = Schema.Struct({
  state: Schema.Literals(["changed", "unchanged"]),
  snapshot: OmniMindAgentPromptSnapshot,
});
const PromptMutationConflict = Schema.Struct({
  state: Schema.Literal("conflict"),
  reason: Schema.Literals(["content_changed", "source_changed", "state_changed"]),
  snapshot: OmniMindAgentPromptSnapshot,
});

export const OmniMindAgentPromptMutationResult = Schema.Union([
  PromptMutationCompleted,
  PromptMutationConflict,
]);
export type OmniMindAgentPromptMutationResult = typeof OmniMindAgentPromptMutationResult.Type;
