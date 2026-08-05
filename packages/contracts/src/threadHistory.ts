// FILE: threadHistory.ts
// Purpose: Read-only schemas for persisted donor-era thread presentation.

import { Schema } from "effect";
import { ChatAttachment } from "./attachments";
import { ProjectKind, ProjectScript } from "./project";
import {
  ApprovalRequestId,
  CheckpointRef,
  CommandId,
  EventId,
  IsoDateTime,
  MessageId,
  NonNegativeInt,
  PositiveInt,
  ProjectId,
  SpaceId,
  ProviderItemId,
  ThreadId,
  ThreadMarkerId,
  TrimmedNonEmptyString,
  TurnId,
} from "./baseSchemas";

/** Non-executable references retained only to render persisted composer/history content. */
export const ProviderSkillReference = Schema.Struct({
  name: TrimmedNonEmptyString,
  path: TrimmedNonEmptyString,
});
export type ProviderSkillReference = typeof ProviderSkillReference.Type;

export const ProviderMentionReference = Schema.Struct({
  name: TrimmedNonEmptyString,
  path: TrimmedNonEmptyString,
});
export type ProviderMentionReference = typeof ProviderMentionReference.Type;

export const ProviderApprovalPolicy = Schema.Literals([
  "untrusted",
  "on-failure",
  "on-request",
  "never",
]);
export type ProviderApprovalPolicy = typeof ProviderApprovalPolicy.Type;
export const ProviderSandboxMode = Schema.Literals([
  "read-only",
  "workspace-write",
  "danger-full-access",
]);
export type ProviderSandboxMode = typeof ProviderSandboxMode.Type;
export const RuntimeMode = Schema.Literals(["approval-required", "auto", "full-access"]);
export type RuntimeMode = typeof RuntimeMode.Type;
export const ProviderInteractionMode = Schema.Literals(["default", "plan"]);
export type ProviderInteractionMode = typeof ProviderInteractionMode.Type;
const SidechatSourceThreadId = Schema.optional(Schema.NullOr(ThreadId)).pipe(
  Schema.withDecodingDefault(() => null),
);
export const ProviderRequestKind = Schema.Literals([
  "command",
  "file-read",
  "file-change",
  "permissions",
]);
export type ProviderRequestKind = typeof ProviderRequestKind.Type;
export const AssistantDeliveryMode = Schema.Literals(["buffered", "streaming"]);
export type AssistantDeliveryMode = typeof AssistantDeliveryMode.Type;
/** Persisted donor-era dispatch label; not a current command or default. */
export const TurnDispatchMode = Schema.Literals(["queue", "steer"]);
export type TurnDispatchMode = typeof TurnDispatchMode.Type;
/** Persisted donor-era origin label; no current gateway behavior is implied. */
export const MessageDispatchOrigin = Schema.Literals(["user", "automation", "agent"]);
export type MessageDispatchOrigin = typeof MessageDispatchOrigin.Type;
export const ThreadCreationSource = Schema.Literals([
  "omnimind_mcp",
  "external_mcp",
  "provider_native",
]);
export type ThreadCreationSource = typeof ThreadCreationSource.Type;
export const ProviderReviewTarget = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("uncommittedChanges"),
  }),
  Schema.Struct({
    type: Schema.Literal("baseBranch"),
    branch: TrimmedNonEmptyString,
  }),
]);
export type ProviderReviewTarget = typeof ProviderReviewTarget.Type;
export const ProviderApprovalDecision = Schema.Literals([
  "accept",
  "acceptForSession",
  "decline",
  "cancel",
]);
export type ProviderApprovalDecision = typeof ProviderApprovalDecision.Type;
export const ProviderUserInputAnswer = Schema.NullOr(
  Schema.Union([Schema.String, Schema.Array(Schema.String)]),
);
export type ProviderUserInputAnswer = typeof ProviderUserInputAnswer.Type;
export const ProviderUserInputAnswers = Schema.Record(Schema.String, ProviderUserInputAnswer);
export type ProviderUserInputAnswers = typeof ProviderUserInputAnswers.Type;
export const ThreadHandoffBootstrapStatus = Schema.Literals(["pending", "completed"]);
export type ThreadHandoffBootstrapStatus = typeof ThreadHandoffBootstrapStatus.Type;
