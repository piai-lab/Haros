import { Schema } from "effect";

import { TrimmedNonEmptyString } from "./baseSchemas";
import { isOAAgentPromptContent, HARNESSOS_AGENT_PROMPT_MAX_BYTES } from "./editableText";

export const OAAgentCustomRulesSourceId = Schema.Literals([
  "AGENTS.override.md",
  "AGENTS.md",
  "AGENTS.MD",
  "CLAUDE.md",
  "CLAUDE.MD",
]);
export type OAAgentCustomRulesSourceId = typeof OAAgentCustomRulesSourceId.Type;

const PromptVersion = TrimmedNonEmptyString.check(
  Schema.isMinLength(64),
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-f0-9]{64}$/u),
);
const DisplayPath = TrimmedNonEmptyString.check(Schema.isMaxLength(4_096));
const RevealPath = TrimmedNonEmptyString.check(Schema.isMaxLength(16_384));
const PromptContent = Schema.String.check(
  Schema.isMaxLength(HARNESSOS_AGENT_PROMPT_MAX_BYTES),
  Schema.makeFilter(isOAAgentPromptContent),
);

export const OAAgentDefaultPromptSnapshot = Schema.Struct({
  content: PromptContent,
  customized: Schema.Boolean,
  version: PromptVersion,
});
export type OAAgentDefaultPromptSnapshot = typeof OAAgentDefaultPromptSnapshot.Type;

export const OAAgentCustomRulesSnapshot = Schema.Union([
  Schema.Struct({
    availability: Schema.Literal("absent"),
    unavailableReason: Schema.Null,
    sourceId: Schema.Null,
    displayPath: Schema.Null,
    revealPath: Schema.Null,
    exists: Schema.Literal(false),
    version: Schema.Null,
    content: Schema.Literal(""),
  }),
  Schema.Struct({
    availability: Schema.Literal("available"),
    unavailableReason: Schema.Null,
    sourceId: OAAgentCustomRulesSourceId,
    displayPath: DisplayPath,
    revealPath: RevealPath,
    exists: Schema.Literal(true),
    version: PromptVersion,
    content: PromptContent,
  }),
  Schema.Struct({
    availability: Schema.Literal("unavailable"),
    unavailableReason: Schema.Literals(["too_large", "unsupported_text"]),
    sourceId: Schema.NullOr(OAAgentCustomRulesSourceId),
    displayPath: DisplayPath,
    revealPath: RevealPath,
    exists: Schema.Literal(true),
    version: Schema.Null,
    content: Schema.Literal(""),
  }),
]);
export type OAAgentCustomRulesSnapshot = typeof OAAgentCustomRulesSnapshot.Type;

export const OAAgentPromptSnapshot = Schema.Struct({
  defaultPrompt: OAAgentDefaultPromptSnapshot,
  customRules: OAAgentCustomRulesSnapshot,
  maxBytes: Schema.Literal(HARNESSOS_AGENT_PROMPT_MAX_BYTES),
});
export type OAAgentPromptSnapshot = typeof OAAgentPromptSnapshot.Type;

export const OAAgentPromptGetSnapshotInput = Schema.Struct({});
export type OAAgentPromptGetSnapshotInput = typeof OAAgentPromptGetSnapshotInput.Type;

export const OAAgentDefaultPromptSetInput = Schema.Struct({
  action: Schema.Literal("setDefault"),
  expectedVersion: PromptVersion,
  content: PromptContent,
});
export const OAAgentDefaultPromptRestoreInput = Schema.Struct({
  action: Schema.Literal("restoreDefault"),
  expectedVersion: PromptVersion,
});
export const OAAgentCustomRulesCreateInput = Schema.Struct({
  action: Schema.Literal("createCustomRules"),
  content: PromptContent,
});
export const OAAgentCustomRulesUpdateInput = Schema.Struct({
  action: Schema.Literal("updateCustomRules"),
  sourceId: OAAgentCustomRulesSourceId,
  expectedVersion: PromptVersion,
  content: PromptContent,
});
export const OAAgentCustomRulesRemoveInput = Schema.Struct({
  action: Schema.Literal("removeCustomRules"),
  sourceId: OAAgentCustomRulesSourceId,
  expectedVersion: PromptVersion,
});

export const OAAgentPromptMutationInput = Schema.Union([
  OAAgentDefaultPromptSetInput,
  OAAgentDefaultPromptRestoreInput,
  OAAgentCustomRulesCreateInput,
  OAAgentCustomRulesUpdateInput,
  OAAgentCustomRulesRemoveInput,
]);
export type OAAgentPromptMutationInput = typeof OAAgentPromptMutationInput.Type;

// Custom rules use optimistic version checks against non-cooperating external
// editors. Node does not provide strict inode/version CAS for replace/remove;
// callers must not describe the final narrow race as atomically eliminated.
const PromptMutationCompleted = Schema.Struct({
  state: Schema.Literals(["changed", "unchanged"]),
  snapshot: OAAgentPromptSnapshot,
});
const PromptMutationConflict = Schema.Struct({
  state: Schema.Literal("conflict"),
  reason: Schema.Literals(["content_changed", "source_changed", "state_changed"]),
  snapshot: OAAgentPromptSnapshot,
});

export const OAAgentPromptMutationResult = Schema.Union([
  PromptMutationCompleted,
  PromptMutationConflict,
]);
export type OAAgentPromptMutationResult = typeof OAAgentPromptMutationResult.Type;
