import { Schema } from "effect";

import { TrimmedNonEmptyString } from "./baseSchemas";
import { isOmniMindAgentPromptContent, HARNESSOS_AGENT_PROMPT_MAX_BYTES } from "./editableText";

export const OmniMindAgentCustomRulesSourceId = Schema.Literals([
  "AGENTS.override.md",
  "AGENTS.md",
  "AGENTS.MD",
  "CLAUDE.md",
  "CLAUDE.MD",
]);
export type OmniMindAgentCustomRulesSourceId = typeof OmniMindAgentCustomRulesSourceId.Type;

const PromptVersion = TrimmedNonEmptyString.check(
  Schema.isMinLength(64),
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-f0-9]{64}$/u),
);
const DisplayPath = TrimmedNonEmptyString.check(Schema.isMaxLength(4_096));
const RevealPath = TrimmedNonEmptyString.check(Schema.isMaxLength(16_384));
const PromptContent = Schema.String.check(
  Schema.isMaxLength(HARNESSOS_AGENT_PROMPT_MAX_BYTES),
  Schema.makeFilter(isOmniMindAgentPromptContent),
);

export const OmniMindAgentDefaultPromptSnapshot = Schema.Struct({
  content: PromptContent,
  customized: Schema.Boolean,
  version: PromptVersion,
});
export type OmniMindAgentDefaultPromptSnapshot = typeof OmniMindAgentDefaultPromptSnapshot.Type;

export const OmniMindAgentCustomRulesSnapshot = Schema.Union([
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
    sourceId: OmniMindAgentCustomRulesSourceId,
    displayPath: DisplayPath,
    revealPath: RevealPath,
    exists: Schema.Literal(true),
    version: PromptVersion,
    content: PromptContent,
  }),
  Schema.Struct({
    availability: Schema.Literal("unavailable"),
    unavailableReason: Schema.Literals(["too_large", "unsupported_text"]),
    sourceId: Schema.NullOr(OmniMindAgentCustomRulesSourceId),
    displayPath: DisplayPath,
    revealPath: RevealPath,
    exists: Schema.Literal(true),
    version: Schema.Null,
    content: Schema.Literal(""),
  }),
]);
export type OmniMindAgentCustomRulesSnapshot = typeof OmniMindAgentCustomRulesSnapshot.Type;

export const OmniMindAgentPromptSnapshot = Schema.Struct({
  defaultPrompt: OmniMindAgentDefaultPromptSnapshot,
  customRules: OmniMindAgentCustomRulesSnapshot,
  maxBytes: Schema.Literal(HARNESSOS_AGENT_PROMPT_MAX_BYTES),
});
export type OmniMindAgentPromptSnapshot = typeof OmniMindAgentPromptSnapshot.Type;

export const OmniMindAgentPromptGetSnapshotInput = Schema.Struct({});
export type OmniMindAgentPromptGetSnapshotInput = typeof OmniMindAgentPromptGetSnapshotInput.Type;

export const OmniMindAgentDefaultPromptSetInput = Schema.Struct({
  action: Schema.Literal("setDefault"),
  expectedVersion: PromptVersion,
  content: PromptContent,
});
export const OmniMindAgentDefaultPromptRestoreInput = Schema.Struct({
  action: Schema.Literal("restoreDefault"),
  expectedVersion: PromptVersion,
});
export const OmniMindAgentCustomRulesCreateInput = Schema.Struct({
  action: Schema.Literal("createCustomRules"),
  content: PromptContent,
});
export const OmniMindAgentCustomRulesUpdateInput = Schema.Struct({
  action: Schema.Literal("updateCustomRules"),
  sourceId: OmniMindAgentCustomRulesSourceId,
  expectedVersion: PromptVersion,
  content: PromptContent,
});
export const OmniMindAgentCustomRulesRemoveInput = Schema.Struct({
  action: Schema.Literal("removeCustomRules"),
  sourceId: OmniMindAgentCustomRulesSourceId,
  expectedVersion: PromptVersion,
});

export const OmniMindAgentPromptMutationInput = Schema.Union([
  OmniMindAgentDefaultPromptSetInput,
  OmniMindAgentDefaultPromptRestoreInput,
  OmniMindAgentCustomRulesCreateInput,
  OmniMindAgentCustomRulesUpdateInput,
  OmniMindAgentCustomRulesRemoveInput,
]);
export type OmniMindAgentPromptMutationInput = typeof OmniMindAgentPromptMutationInput.Type;

// Custom rules use optimistic version checks against non-cooperating external
// editors. Node does not provide strict inode/version CAS for replace/remove;
// callers must not describe the final narrow race as atomically eliminated.
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
