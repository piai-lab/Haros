import { Schema } from "effect";
import { TrimmedNonEmptyString } from "./baseSchemas";
import {
  ApprovalRequestId,
  EventId,
  IsoDateTime,
  EngineItemId,
  ThreadId,
  TurnId,
} from "./baseSchemas";
import {
  ChatAttachment,
  CanonicalUserInputResponse,
  EngineSelection,
  ENGINE_SEND_TURN_MAX_ATTACHMENTS,
  ENGINE_SEND_TURN_MAX_INPUT_CHARS,
  EngineApprovalDecision,
  EngineApprovalPolicy,
  EngineInteractionMode,
  EngineKind,
  EngineRequestKind,
  EngineReviewTarget,
  EngineSandboxMode,
  EngineStartOptions,
  RuntimeMode,
} from "./orchestration";
import { EngineMentionReference, EngineSkillReference } from "./engineDiscovery";

const EngineSessionStatus = Schema.Literals(["connecting", "ready", "running", "error", "closed"]);

export const EngineSession = Schema.Struct({
  engine: EngineKind,
  status: EngineSessionStatus,
  runtimeMode: RuntimeMode,
  cwd: Schema.optional(TrimmedNonEmptyString),
  model: Schema.optional(TrimmedNonEmptyString),
  threadId: ThreadId,
  resumeCursor: Schema.optional(Schema.Unknown),
  activeTurnId: Schema.optional(TurnId),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  lastError: Schema.optional(TrimmedNonEmptyString),
});
export type EngineSession = typeof EngineSession.Type;

export const EngineWorkSurface = Schema.Literals(["agent", "chat"]);
export type EngineWorkSurface = typeof EngineWorkSurface.Type;

export const EngineSessionStartInput = Schema.Struct({
  threadId: ThreadId,
  engine: Schema.optional(EngineKind),
  lifecycleGeneration: Schema.optional(TrimmedNonEmptyString),
  cwd: Schema.optional(TrimmedNonEmptyString),
  workSurface: Schema.optional(EngineWorkSurface),
  projectContextRoot: Schema.optional(TrimmedNonEmptyString),
  engineSelection: Schema.optional(EngineSelection),
  resumeCursor: Schema.optional(Schema.Unknown),
  forkSourceResumeCursor: Schema.optional(Schema.Unknown),
  approvalPolicy: Schema.optional(EngineApprovalPolicy),
  sandboxMode: Schema.optional(EngineSandboxMode),
  engineOptions: Schema.optional(EngineStartOptions),
  runtimeMode: RuntimeMode,
});
export type EngineSessionStartInput = typeof EngineSessionStartInput.Type;

export const EngineSendTurnInput = Schema.Struct({
  threadId: ThreadId,
  input: Schema.optional(
    TrimmedNonEmptyString.check(Schema.isMaxLength(ENGINE_SEND_TURN_MAX_INPUT_CHARS)),
  ),
  attachments: Schema.optional(
    Schema.Array(ChatAttachment).check(Schema.isMaxLength(ENGINE_SEND_TURN_MAX_ATTACHMENTS)),
  ),
  skills: Schema.optional(Schema.Array(EngineSkillReference)),
  mentions: Schema.optional(Schema.Array(EngineMentionReference)),
  engineSelection: Schema.optional(EngineSelection),
  interactionMode: Schema.optional(EngineInteractionMode),
});
export type EngineSendTurnInput = typeof EngineSendTurnInput.Type;
export const EngineSteerTurnInput = EngineSendTurnInput;
export type EngineSteerTurnInput = typeof EngineSteerTurnInput.Type;

export const EngineForkThreadInput = Schema.Struct({
  sourceThreadId: ThreadId,
  threadId: ThreadId,
  sourceResumeCursor: Schema.optional(Schema.Unknown),
  sourceCwd: Schema.optional(TrimmedNonEmptyString),
  cwd: Schema.optional(TrimmedNonEmptyString),
  engineSelection: Schema.optional(EngineSelection),
  engineOptions: Schema.optional(EngineStartOptions),
  runtimeMode: RuntimeMode,
});
export type EngineForkThreadInput = typeof EngineForkThreadInput.Type;

export const EngineForkThreadResult = Schema.Struct({
  threadId: ThreadId,
  resumeCursor: Schema.optional(Schema.Unknown),
});
export type EngineForkThreadResult = typeof EngineForkThreadResult.Type;

export const EngineTurnStartResult = Schema.Struct({
  threadId: ThreadId,
  turnId: TurnId,
  resumeCursor: Schema.optional(Schema.Unknown),
});
export type EngineTurnStartResult = typeof EngineTurnStartResult.Type;

export const EngineStartReviewInput = Schema.Struct({
  threadId: ThreadId,
  target: EngineReviewTarget,
});
export type EngineStartReviewInput = typeof EngineStartReviewInput.Type;

export const EngineInterruptTurnInput = Schema.Struct({
  threadId: ThreadId,
  turnId: Schema.optional(TurnId),
  nativeThreadId: Schema.optional(TrimmedNonEmptyString),
});
export type EngineInterruptTurnInput = typeof EngineInterruptTurnInput.Type;

export const EngineStopTaskInput = Schema.Struct({
  threadId: ThreadId,
  taskId: TrimmedNonEmptyString,
});
export type EngineStopTaskInput = typeof EngineStopTaskInput.Type;

export const EngineBackgroundTaskInput = Schema.Struct({
  threadId: ThreadId,
  toolUseId: TrimmedNonEmptyString,
});
export type EngineBackgroundTaskInput = typeof EngineBackgroundTaskInput.Type;

export const EngineSteerSubagentInput = Schema.Struct({
  threadId: ThreadId,
  nativeThreadId: TrimmedNonEmptyString,
  input: Schema.optional(
    TrimmedNonEmptyString.check(Schema.isMaxLength(ENGINE_SEND_TURN_MAX_INPUT_CHARS)),
  ),
  attachments: Schema.optional(
    Schema.Array(ChatAttachment).check(Schema.isMaxLength(ENGINE_SEND_TURN_MAX_ATTACHMENTS)),
  ),
  skills: Schema.optional(Schema.Array(EngineSkillReference)),
  mentions: Schema.optional(Schema.Array(EngineMentionReference)),
});
export type EngineSteerSubagentInput = typeof EngineSteerSubagentInput.Type;

export const EngineStopSessionInput = Schema.Struct({
  threadId: ThreadId,
});
export type EngineStopSessionInput = typeof EngineStopSessionInput.Type;

export const EngineCompactThreadInput = Schema.Struct({
  threadId: ThreadId,
});
export type EngineCompactThreadInput = typeof EngineCompactThreadInput.Type;

export const EngineRespondToRequestInput = Schema.Struct({
  threadId: ThreadId,
  requestId: ApprovalRequestId,
  lifecycleGeneration: Schema.optional(TrimmedNonEmptyString),
  decision: EngineApprovalDecision,
});
export type EngineRespondToRequestInput = typeof EngineRespondToRequestInput.Type;

export const EngineRespondToUserInputInput = Schema.Struct({
  threadId: ThreadId,
  requestId: ApprovalRequestId,
  lifecycleGeneration: Schema.optional(TrimmedNonEmptyString),
  response: CanonicalUserInputResponse,
}).annotate({ parseOptions: { onExcessProperty: "error" } });
export type EngineRespondToUserInputInput = typeof EngineRespondToUserInputInput.Type;

const EngineEventKind = Schema.Literals(["session", "notification", "request", "error"]);

export const EngineEvent = Schema.Struct({
  id: EventId,
  kind: EngineEventKind,
  engine: EngineKind,
  threadId: ThreadId,
  createdAt: IsoDateTime,
  method: TrimmedNonEmptyString,
  message: Schema.optional(TrimmedNonEmptyString),
  turnId: Schema.optional(TurnId),
  parentTurnId: Schema.optional(TurnId),
  itemId: Schema.optional(EngineItemId),
  requestId: Schema.optional(ApprovalRequestId),
  requestKind: Schema.optional(EngineRequestKind),
  lifecycleGeneration: Schema.optional(TrimmedNonEmptyString),
  nativeThreadId: Schema.optional(TrimmedNonEmptyString),
  nativeParentThreadId: Schema.optional(TrimmedNonEmptyString),
  textDelta: Schema.optional(Schema.String),
  payload: Schema.optional(Schema.Unknown),
});
export type EngineEvent = typeof EngineEvent.Type;
