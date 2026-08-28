/**
 * Public contracts for the OmniMind agent-control gateway.
 *
 * New gateway tools decode these schemas before doing any work. Keeping the
 * limits here ensures the MCP surface, server implementation, and tests share
 * the same definition of an exact creation/wait plan.
 */
import { Schema } from "effect";

import { ProjectId, ThreadId, TurnId } from "./baseSchemas";
import { ModelSelection, EngineKind } from "./orchestration";
import { ProviderModelDescriptor } from "./providerDiscovery";
import { ServerProviderAuthStatus } from "./server";

export const HARNESSOS_GATEWAY_MAX_THREADS_PER_OPERATION = 20;
export const HARNESSOS_GATEWAY_MAX_REQUEST_ID_LENGTH = 256;
export const HARNESSOS_GATEWAY_MAX_WAIT_MS = 60_000;

export const OmniMindGatewayErrorCode = Schema.Literals([
  "caller_session_inactive",
  "caller_turn_inactive",
  "capability_denied",
  "tool_unavailable",
  "provider_unavailable",
  "model_unavailable",
  "model_option_unavailable",
  "idempotency_conflict",
  "creation_plan_locked",
  "creation_limit_exceeded",
  "thread_not_found",
  "wait_timed_out",
  "operation_failed",
]);
export type OmniMindGatewayErrorCode = typeof OmniMindGatewayErrorCode.Type;

export const OmniMindGatewayError = Schema.Struct({
  code: OmniMindGatewayErrorCode,
  message: Schema.String,
  details: Schema.optional(Schema.Unknown),
});
export type OmniMindGatewayError = typeof OmniMindGatewayError.Type;

export const OmniMindGatewayErrorResult = Schema.Struct({
  error: OmniMindGatewayError,
});
export type OmniMindGatewayErrorResult = typeof OmniMindGatewayErrorResult.Type;

export const OmniMindContextResult = Schema.Struct({
  harness: Schema.Struct({
    name: Schema.Literal("OmniMind"),
    policyVersion: Schema.String,
  }),
  caller: Schema.Struct({
    threadId: ThreadId,
    turnId: Schema.NullOr(TurnId),
    provider: EngineKind,
    projectId: ProjectId,
  }),
  capabilities: Schema.Struct({
    threadRead: Schema.Boolean,
    threadCreate: Schema.Boolean,
    threadWait: Schema.Boolean,
    automations: Schema.Boolean,
  }),
});
export type OmniMindContextResult = typeof OmniMindContextResult.Type;

export const OmniMindCreateThreadSpec = Schema.Struct({
  prompt: Schema.String.check(Schema.isNonEmpty()),
  title: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  target: ModelSelection,
  projectId: Schema.optional(ProjectId),
  environment: Schema.optional(Schema.Literals(["local", "worktree"])),
  baseRef: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  // Legacy inputs remain decodable for replay/backward compatibility, but the
  // MCP catalog no longer advertises branch-backed worktree creation.
  baseBranch: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  branchName: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  runtimeMode: Schema.optional(Schema.Literals(["approval-required", "full-access"])),
});
export type OmniMindCreateThreadSpec = typeof OmniMindCreateThreadSpec.Type;

const OmniMindGatewayRequestId = Schema.String.check(Schema.isNonEmpty()).check(
  Schema.isMaxLength(HARNESSOS_GATEWAY_MAX_REQUEST_ID_LENGTH),
);

export const OmniMindCreateThreadsInput = Schema.Struct({
  requestId: OmniMindGatewayRequestId,
  threads: Schema.Array(OmniMindCreateThreadSpec)
    .check(Schema.isMinLength(1))
    .check(Schema.isMaxLength(HARNESSOS_GATEWAY_MAX_THREADS_PER_OPERATION)),
}).annotate({ parseOptions: { onExcessProperty: "error" } });
export type OmniMindCreateThreadsInput = typeof OmniMindCreateThreadsInput.Type;

export const OmniMindProviderCatalog = Schema.Struct({
  provider: EngineKind,
  defaultModel: Schema.NullOr(Schema.String),
  models: Schema.Array(ProviderModelDescriptor),
  enabled: Schema.Boolean,
  available: Schema.Boolean,
  authStatus: Schema.optional(ServerProviderAuthStatus),
  source: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
});
export type OmniMindProviderCatalog = typeof OmniMindProviderCatalog.Type;

export const OmniMindGatewayTargetOptionValue = Schema.Union([
  Schema.String,
  Schema.Number,
  Schema.Boolean,
]);
export type OmniMindGatewayTargetOptionValue = typeof OmniMindGatewayTargetOptionValue.Type;

export const OmniMindGatewayTargetOptionRule = Schema.Struct({
  key: Schema.String,
  valueType: Schema.Literals(["string", "number", "boolean"]),
  allowedValues: Schema.Array(OmniMindGatewayTargetOptionValue),
  allowedValuesSource: Schema.Literals(["provider-contract", "model-discovery"]),
});
export type OmniMindGatewayTargetOptionRule = typeof OmniMindGatewayTargetOptionRule.Type;

export const OmniMindGatewayTargetConstruction = Schema.Struct({
  modelValueSource: Schema.Literal("providers[].models[].slug"),
  primaryOptionKey: Schema.String,
  alternativeOptionKeys: Schema.Array(Schema.String),
  optionSelectionRule: Schema.String,
  providerOptions: Schema.Array(OmniMindGatewayTargetOptionRule),
  optionsByModel: Schema.Record(Schema.String, Schema.Array(OmniMindGatewayTargetOptionRule)),
  exampleTarget: Schema.NullOr(ModelSelection),
});
export type OmniMindGatewayTargetConstruction = typeof OmniMindGatewayTargetConstruction.Type;

export const OmniMindCapabilitiesResult = Schema.Struct({
  targetConstruction: Schema.Record(Schema.String, OmniMindGatewayTargetConstruction),
  providers: Schema.Array(OmniMindProviderCatalog),
  limits: Schema.Struct({
    maxThreadsPerOperation: Schema.Int,
    maxWaitMs: Schema.Int,
    oneCreationPlanPerActiveTurn: Schema.Boolean,
  }),
});
export type OmniMindCapabilitiesResult = typeof OmniMindCapabilitiesResult.Type;

export const OmniMindCreatedThreadResult = Schema.Struct({
  index: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  threadId: ThreadId,
  projectId: ProjectId,
  title: Schema.String,
  target: ModelSelection,
  provider: EngineKind,
  model: Schema.String,
  runtimeMode: Schema.Literals(["approval-required", "full-access"]),
  environment: Schema.Literals(["local", "worktree"]),
  branch: Schema.NullOr(Schema.String),
  worktreePath: Schema.NullOr(Schema.String),
  status: Schema.Literal("task_dispatched"),
});
export type OmniMindCreatedThreadResult = typeof OmniMindCreatedThreadResult.Type;

export const OmniMindCreateThreadsResult = Schema.Struct({
  operationId: Schema.String,
  requestId: OmniMindGatewayRequestId,
  requestedCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  createdCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  threadIds: Schema.Array(ThreadId),
  threads: Schema.Array(OmniMindCreatedThreadResult),
});
export type OmniMindCreateThreadsResult = typeof OmniMindCreateThreadsResult.Type;

export const OmniMindWaitForThreadsInput = Schema.Struct({
  threadIds: Schema.Array(ThreadId)
    .check(Schema.isMinLength(1))
    .check(Schema.isMaxLength(HARNESSOS_GATEWAY_MAX_THREADS_PER_OPERATION)),
  runIds: Schema.optional(
    Schema.Array(Schema.NullOr(TurnId)).check(
      Schema.isMaxLength(HARNESSOS_GATEWAY_MAX_THREADS_PER_OPERATION),
    ),
  ),
  timeoutMs: Schema.optional(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).check(
      Schema.isLessThanOrEqualTo(HARNESSOS_GATEWAY_MAX_WAIT_MS),
    ),
  ),
}).annotate({ parseOptions: { onExcessProperty: "error" } });
export type OmniMindWaitForThreadsInput = typeof OmniMindWaitForThreadsInput.Type;

export const OmniMindWaitedThreadResult = Schema.Struct({
  threadId: ThreadId,
  runId: Schema.NullOr(TurnId),
  state: Schema.Literals(["idle", "pending", "running", "completed", "error", "interrupted"]),
  terminal: Schema.Boolean,
  timedOut: Schema.Boolean,
  summary: Schema.NullOr(Schema.String),
  summaryTruncated: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
  readThread: Schema.Struct({
    tool: Schema.Literal("harnessos_read_thread"),
    arguments: Schema.Struct({ threadId: ThreadId }),
  }),
});
export type OmniMindWaitedThreadResult = typeof OmniMindWaitedThreadResult.Type;

export const OmniMindWaitForThreadsResult = Schema.Struct({
  callerThreadId: ThreadId,
  runIds: Schema.Array(Schema.NullOr(TurnId)),
  allTerminal: Schema.Boolean,
  timedOut: Schema.Boolean,
  threads: Schema.Array(OmniMindWaitedThreadResult),
});
export type OmniMindWaitForThreadsResult = typeof OmniMindWaitForThreadsResult.Type;
