/**
 * Public contracts for the Haros agent-control gateway.
 *
 * New gateway tools decode these schemas before doing any work. Keeping the
 * limits here ensures the MCP surface, server implementation, and tests share
 * the same definition of an exact creation/wait plan.
 */
import { Schema } from "effect";

import { ProjectId, ThreadId, TurnId } from "./baseSchemas";
import { EngineSelection, EngineKind } from "./orchestration";
import { EngineModelDescriptor } from "./engineDiscovery";
import { ServerEngineAuthStatus } from "./server";

export const HARNESSOS_GATEWAY_MAX_THREADS_PER_OPERATION = 20;
export const HARNESSOS_GATEWAY_MAX_REQUEST_ID_LENGTH = 256;
export const HARNESSOS_GATEWAY_MAX_WAIT_MS = 60_000;

export const HarosGatewayErrorCode = Schema.Literals([
  "caller_session_inactive",
  "caller_turn_inactive",
  "capability_denied",
  "tool_unavailable",
  "engine_unavailable",
  "model_unavailable",
  "model_option_unavailable",
  "idempotency_conflict",
  "creation_plan_locked",
  "creation_limit_exceeded",
  "thread_not_found",
  "wait_timed_out",
  "operation_failed",
]);
export type HarosGatewayErrorCode = typeof HarosGatewayErrorCode.Type;

export const HarosGatewayError = Schema.Struct({
  code: HarosGatewayErrorCode,
  message: Schema.String,
  details: Schema.optional(Schema.Unknown),
});
export type HarosGatewayError = typeof HarosGatewayError.Type;

export const HarosGatewayErrorResult = Schema.Struct({
  error: HarosGatewayError,
});
export type HarosGatewayErrorResult = typeof HarosGatewayErrorResult.Type;

export const HarosContextResult = Schema.Struct({
  harness: Schema.Struct({
    name: Schema.Literal("Haros"),
    policyVersion: Schema.String,
  }),
  caller: Schema.Struct({
    threadId: ThreadId,
    turnId: Schema.NullOr(TurnId),
    engine: EngineKind,
    projectId: ProjectId,
  }),
  capabilities: Schema.Struct({
    threadRead: Schema.Boolean,
    threadCreate: Schema.Boolean,
    threadWait: Schema.Boolean,
    automations: Schema.Boolean,
  }),
});
export type HarosContextResult = typeof HarosContextResult.Type;

export const HarosCreateThreadSpec = Schema.Struct({
  prompt: Schema.String.check(Schema.isNonEmpty()),
  title: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  target: EngineSelection,
  projectId: Schema.optional(ProjectId),
  environment: Schema.optional(Schema.Literals(["local", "worktree"])),
  baseRef: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  // Legacy inputs remain decodable for replay/backward compatibility, but the
  // MCP catalog no longer advertises branch-backed worktree creation.
  baseBranch: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  branchName: Schema.optional(Schema.String.check(Schema.isNonEmpty())),
  runtimeMode: Schema.optional(Schema.Literals(["approval-required", "full-access"])),
});
export type HarosCreateThreadSpec = typeof HarosCreateThreadSpec.Type;

const HarosGatewayRequestId = Schema.String.check(Schema.isNonEmpty()).check(
  Schema.isMaxLength(HARNESSOS_GATEWAY_MAX_REQUEST_ID_LENGTH),
);

export const HarosCreateThreadsInput = Schema.Struct({
  requestId: HarosGatewayRequestId,
  threads: Schema.Array(HarosCreateThreadSpec)
    .check(Schema.isMinLength(1))
    .check(Schema.isMaxLength(HARNESSOS_GATEWAY_MAX_THREADS_PER_OPERATION)),
}).annotate({ parseOptions: { onExcessProperty: "error" } });
export type HarosCreateThreadsInput = typeof HarosCreateThreadsInput.Type;

export const HarosEngineCatalog = Schema.Struct({
  engine: EngineKind,
  defaultModel: Schema.NullOr(Schema.String),
  models: Schema.Array(EngineModelDescriptor),
  enabled: Schema.Boolean,
  available: Schema.Boolean,
  authStatus: Schema.optional(ServerEngineAuthStatus),
  source: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
});
export type HarosEngineCatalog = typeof HarosEngineCatalog.Type;

export const HarosGatewayTargetOptionValue = Schema.Union([
  Schema.String,
  Schema.Number,
  Schema.Boolean,
]);
export type HarosGatewayTargetOptionValue = typeof HarosGatewayTargetOptionValue.Type;

export const HarosGatewayTargetOptionRule = Schema.Struct({
  key: Schema.String,
  valueType: Schema.Literals(["string", "number", "boolean"]),
  allowedValues: Schema.Array(HarosGatewayTargetOptionValue),
  allowedValuesSource: Schema.Literals(["engine-contract", "model-discovery"]),
});
export type HarosGatewayTargetOptionRule = typeof HarosGatewayTargetOptionRule.Type;

export const HarosGatewayTargetConstruction = Schema.Struct({
  modelValueSource: Schema.Literal("engines[].models[].slug"),
  primaryOptionKey: Schema.String,
  alternativeOptionKeys: Schema.Array(Schema.String),
  optionSelectionRule: Schema.String,
  engineOptions: Schema.Array(HarosGatewayTargetOptionRule),
  optionsByModel: Schema.Record(Schema.String, Schema.Array(HarosGatewayTargetOptionRule)),
  exampleTarget: Schema.NullOr(EngineSelection),
});
export type HarosGatewayTargetConstruction = typeof HarosGatewayTargetConstruction.Type;

export const HarosCapabilitiesResult = Schema.Struct({
  targetConstruction: Schema.Record(Schema.String, HarosGatewayTargetConstruction),
  engines: Schema.Array(HarosEngineCatalog),
  limits: Schema.Struct({
    maxThreadsPerOperation: Schema.Int,
    maxWaitMs: Schema.Int,
    oneCreationPlanPerActiveTurn: Schema.Boolean,
  }),
});
export type HarosCapabilitiesResult = typeof HarosCapabilitiesResult.Type;

export const HarosCreatedThreadResult = Schema.Struct({
  index: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  threadId: ThreadId,
  projectId: ProjectId,
  title: Schema.String,
  target: EngineSelection,
  engine: EngineKind,
  model: Schema.String,
  runtimeMode: Schema.Literals(["approval-required", "full-access"]),
  environment: Schema.Literals(["local", "worktree"]),
  branch: Schema.NullOr(Schema.String),
  worktreePath: Schema.NullOr(Schema.String),
  status: Schema.Literal("task_dispatched"),
});
export type HarosCreatedThreadResult = typeof HarosCreatedThreadResult.Type;

export const HarosCreateThreadsResult = Schema.Struct({
  operationId: Schema.String,
  requestId: HarosGatewayRequestId,
  requestedCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  createdCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  threadIds: Schema.Array(ThreadId),
  threads: Schema.Array(HarosCreatedThreadResult),
});
export type HarosCreateThreadsResult = typeof HarosCreateThreadsResult.Type;

export const HarosWaitForThreadsInput = Schema.Struct({
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
export type HarosWaitForThreadsInput = typeof HarosWaitForThreadsInput.Type;

export const HarosWaitedThreadResult = Schema.Struct({
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
export type HarosWaitedThreadResult = typeof HarosWaitedThreadResult.Type;

export const HarosWaitForThreadsResult = Schema.Struct({
  callerThreadId: ThreadId,
  runIds: Schema.Array(Schema.NullOr(TurnId)),
  allTerminal: Schema.Boolean,
  timedOut: Schema.Boolean,
  threads: Schema.Array(HarosWaitedThreadResult),
});
export type HarosWaitForThreadsResult = typeof HarosWaitForThreadsResult.Type;
