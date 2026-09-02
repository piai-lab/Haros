import { Schema } from "effect";

import { TrimmedNonEmptyString } from "./baseSchemas";
import { isOAAgentPromptContent, HARNESSOS_AGENT_PROMPT_MAX_BYTES } from "./editableText";

export const HARNESSOS_AGENT_PERSONAL_STRATEGY_SOURCE_IDS = [
  "AGENTS.override.md",
  "AGENTS.md",
  "AGENTS.MD",
  "CLAUDE.md",
  "CLAUDE.MD",
] as const;
export const OAAgentPersonalStrategySourceId = Schema.Literals([
  ...HARNESSOS_AGENT_PERSONAL_STRATEGY_SOURCE_IDS,
]);
export type OAAgentPersonalStrategySourceId = typeof OAAgentPersonalStrategySourceId.Type;

export const OAAgentPromptLocale = Schema.Literals(["en", "zh-CN"]);
export type OAAgentPromptLocale = typeof OAAgentPromptLocale.Type;

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

export const OAAgentPersonalStrategySnapshot = Schema.Union([
  Schema.Struct({
    availability: Schema.Literal("available"),
    unavailableReason: Schema.Null,
    sourceId: OAAgentPersonalStrategySourceId,
    displayPath: DisplayPath,
    revealPath: RevealPath,
    version: PromptVersion,
    content: PromptContent,
  }),
  Schema.Struct({
    availability: Schema.Literal("unavailable"),
    unavailableReason: Schema.Literals(["too_large", "unsupported_text"]),
    sourceId: Schema.NullOr(OAAgentPersonalStrategySourceId),
    displayPath: DisplayPath,
    revealPath: RevealPath,
    version: Schema.Null,
    content: Schema.Literal(""),
  }),
]);
export type OAAgentPersonalStrategySnapshot = typeof OAAgentPersonalStrategySnapshot.Type;

export const OAAgentPromptSnapshot = Schema.Struct({
  personalStrategy: OAAgentPersonalStrategySnapshot,
  maxBytes: Schema.Literal(HARNESSOS_AGENT_PROMPT_MAX_BYTES),
});
export type OAAgentPromptSnapshot = typeof OAAgentPromptSnapshot.Type;

export const OAAgentPromptGetSnapshotInput = Schema.Struct({
  locale: OAAgentPromptLocale,
});
export type OAAgentPromptGetSnapshotInput = typeof OAAgentPromptGetSnapshotInput.Type;

export const OAAgentPersonalStrategySetInput = Schema.Struct({
  action: Schema.Literal("setPersonalStrategy"),
  sourceId: OAAgentPersonalStrategySourceId,
  expectedVersion: PromptVersion,
  locale: OAAgentPromptLocale,
  content: PromptContent,
});
export const OAAgentPersonalStrategyRestoreInput = Schema.Struct({
  action: Schema.Literal("restorePersonalStrategy"),
  sourceId: OAAgentPersonalStrategySourceId,
  expectedVersion: PromptVersion,
  locale: OAAgentPromptLocale,
});

export const OAAgentPromptMutationInput = Schema.Union([
  OAAgentPersonalStrategySetInput,
  OAAgentPersonalStrategyRestoreInput,
]);
export type OAAgentPromptMutationInput = typeof OAAgentPromptMutationInput.Type;

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
