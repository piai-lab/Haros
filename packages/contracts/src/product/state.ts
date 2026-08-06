import { Schema } from "effect";

export const PRODUCT_RESOURCE_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const PRODUCT_RESOURCE_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const PRODUCT_CONVERSATION_NOTES_MAX_CHARS = 16_384;

import { NonNegativeInt, PositiveInt, TrimmedNonEmptyString } from "../baseSchemas";

const closedBoundary = <A extends Schema.Top>(schema: A): A =>
  schema.annotate({ parseOptions: { onExcessProperty: "error" } }) as A;

export const PRODUCT_PROTOCOL_VERSION = 2 as const;
export const PRODUCT_MAX_TEXT_CHARS = 65_536;
export const PRODUCT_MAX_FACTS_PER_BATCH = 256;
export const PRODUCT_MAX_QUEUE_ITEMS = 128;
export const PRODUCT_MAX_RESOURCE_REFS = 32;
export const PRODUCT_MAX_GROUPS = 50;
export const PRODUCT_GROUP_NAME_MAX_CHARS = 32;
export const PRODUCT_GROUP_MEMBERSHIP_MAX_COUNT = 200;
export const PRODUCT_ENTRY_PINS_MAX_COUNT = 100;
export const PRODUCT_ENTRY_PIN_LABEL_MAX_CHARS = 60;
export const PRODUCT_ENTRY_MARKERS_MAX_COUNT = 200;
export const PRODUCT_ENTRY_MARKER_LABEL_MAX_CHARS = 60;
export const PRODUCT_ENTRY_MARKER_SELECTED_TEXT_MAX_CHARS = 4_000;

const ProductIdText = TrimmedNonEmptyString.check(Schema.isMaxLength(128));
const makeProductId = <Brand extends string>(brand: Brand) =>
  ProductIdText.pipe(Schema.brand(brand));

export const ProductWorkspaceId = makeProductId("ProductWorkspaceId");
export type ProductWorkspaceId = typeof ProductWorkspaceId.Type;
export const ProductConversationId = makeProductId("ProductConversationId");
export type ProductConversationId = typeof ProductConversationId.Type;
export const ProductEntryId = makeProductId("ProductEntryId");
export type ProductEntryId = typeof ProductEntryId.Type;
export const ProductRunId = makeProductId("ProductRunId");
export type ProductRunId = typeof ProductRunId.Type;
export const ProductEngineBindingId = makeProductId("ProductEngineBindingId");
export type ProductEngineBindingId = typeof ProductEngineBindingId.Type;
export const ProductResourceRefId = makeProductId("ProductResourceRefId");
export type ProductResourceRefId = typeof ProductResourceRefId.Type;
export const ProductOperationReceiptId = makeProductId("ProductOperationReceiptId");
export type ProductOperationReceiptId = typeof ProductOperationReceiptId.Type;
export const ProductQueueItemId = makeProductId("ProductQueueItemId");
export type ProductQueueItemId = typeof ProductQueueItemId.Type;
export const ProductDispatchId = makeProductId("ProductDispatchId");
export type ProductDispatchId = typeof ProductDispatchId.Type;
export const ProductMutationId = makeProductId("ProductMutationId");
export type ProductMutationId = typeof ProductMutationId.Type;
export const ProductGroupId = makeProductId("ProductGroupId");
export type ProductGroupId = typeof ProductGroupId.Type;
export const ProductEntryMarkerId = makeProductId("ProductEntryMarkerId");
export type ProductEntryMarkerId = typeof ProductEntryMarkerId.Type;

export const ProductIsoDateTime = TrimmedNonEmptyString.check(Schema.isMaxLength(64));
export type ProductIsoDateTime = typeof ProductIsoDateTime.Type;
export const ProductTitle = TrimmedNonEmptyString.check(Schema.isMaxLength(256));
export type ProductTitle = typeof ProductTitle.Type;
export const ProductText = TrimmedNonEmptyString.check(Schema.isMaxLength(PRODUCT_MAX_TEXT_CHARS));
export type ProductText = typeof ProductText.Type;
export const ProductVisibleText = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PRODUCT_MAX_TEXT_CHARS),
);
export type ProductVisibleText = typeof ProductVisibleText.Type;
export const ProductPath = TrimmedNonEmptyString.check(Schema.isMaxLength(8_192));
export type ProductPath = typeof ProductPath.Type;

export const ProductExecutionTarget = Schema.Struct({
  kind: Schema.Literals(["local", "remote"]),
  targetRef: TrimmedNonEmptyString.check(Schema.isMaxLength(512)),
  observedAt: ProductIsoDateTime,
});
export type ProductExecutionTarget = typeof ProductExecutionTarget.Type;

const ManagedWorkspace = Schema.Struct({
  kind: Schema.Literal("managed"),
  managedDirectory: ProductPath,
  primaryFolder: Schema.Null,
  executionTarget: ProductExecutionTarget,
  writeAuthority: Schema.Literal("managed-directory"),
});
const FolderWorkspace = Schema.Struct({
  kind: Schema.Literal("folder-backed"),
  managedDirectory: Schema.Null,
  primaryFolder: ProductPath,
  executionTarget: ProductExecutionTarget,
  writeAuthority: Schema.Literal("primary-folder"),
});
const ChatWorkspace = Schema.Struct({
  kind: Schema.Literal("chat"),
  managedDirectory: Schema.Null,
  primaryFolder: Schema.Null,
  executionTarget: Schema.Null,
  writeAuthority: Schema.Literal("read-only-references"),
});

/** Product location truth. Agent/Chat remains information architecture, not a runtime type. */
export const ProductWorkspaceAccess = Schema.Union([
  ManagedWorkspace,
  FolderWorkspace,
  ChatWorkspace,
]);
export type ProductWorkspaceAccess = typeof ProductWorkspaceAccess.Type;

export const ProductWorkspace = Schema.Struct({
  id: ProductWorkspaceId,
  access: ProductWorkspaceAccess,
  observedAt: ProductIsoDateTime,
});
export type ProductWorkspace = typeof ProductWorkspace.Type;

export const ProductWorkspaceSummary = Schema.Struct({
  id: ProductWorkspaceId,
  title: ProductTitle,
  access: ProductWorkspaceAccess,
  revision: PositiveInt,
  visibleInSidebar: Schema.Boolean,
  isPinned: Schema.Boolean,
  runCommand: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(8_192))),
  archivedAt: Schema.NullOr(ProductIsoDateTime),
  createdAt: ProductIsoDateTime,
  updatedAt: ProductIsoDateTime,
});
export type ProductWorkspaceSummary = typeof ProductWorkspaceSummary.Type;

export const ProductResourceRef = Schema.Struct({
  id: ProductResourceRefId,
  kind: Schema.Literals([
    "file",
    "folder",
    "diff",
    "terminal",
    "artifact",
    "image",
    "report",
    "external-task",
  ]),
  uri: TrimmedNonEmptyString.check(Schema.isMaxLength(8_192)),
  label: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(512))),
  access: Schema.Literals(["read-only", "read-write"]),
  observedVersion: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(256))),
});
export type ProductResourceRef = typeof ProductResourceRef.Type;

const ProductSelectionPolicy = {
  permissionPolicy: Schema.Literals(["approval-required", "auto", "full-access"]),
  executionTarget: Schema.NullOr(ProductExecutionTarget),
};

export const ProductRuntimeChoice = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("product-model"),
    runtimeModelId: TrimmedNonEmptyString.check(Schema.isMaxLength(512)),
    thinking: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(128))),
  }),
  Schema.Struct({ kind: Schema.Literal("engine-session-current") }),
]);
export type ProductRuntimeChoice = typeof ProductRuntimeChoice.Type;

export const ProductSelectedRuntime = Schema.Struct({
  state: Schema.Literal("selected"),
  engineId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  runtimeChoice: ProductRuntimeChoice,
  packageGeneration: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(256))),
  ...ProductSelectionPolicy,
});
export type ProductSelectedRuntime = typeof ProductSelectedRuntime.Type;

export const ProductUnavailableRuntime = Schema.Struct({
  state: Schema.Literal("unavailable"),
  requestedEngineId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  reason: Schema.Literals([
    "missing",
    "version-mismatch",
    "artifact-mismatch",
    "protocol-mismatch",
    "initialize-failed",
    "auth-required",
    "process-unavailable",
    "target-unsupported",
    "model-not-selected",
    "model-unavailable",
    "thinking-unsupported",
  ]),
  requestedRuntimeChoice: Schema.NullOr(ProductRuntimeChoice),
  packageGeneration: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(256))),
  ...ProductSelectionPolicy,
});
export type ProductUnavailableRuntime = typeof ProductUnavailableRuntime.Type;

/** Product-owned next-Run intent. Unavailable is durable and never silently falls back. */
export const ProductRequestedSelection = Schema.Union([
  ProductSelectedRuntime,
  ProductUnavailableRuntime,
]);
export type ProductRequestedSelection = typeof ProductRequestedSelection.Type;

export const ProductResolvedSelection = Schema.Struct({
  engineId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  runtimeModelId: TrimmedNonEmptyString.check(Schema.isMaxLength(512)),
  thinking: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(128))),
  engineModeId: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(256))),
  permissionPolicy: Schema.Literals(["approval-required", "auto", "full-access"]),
  enforcement: Schema.Literals(["host-enforced", "engine-enforced", "mixed", "unverified"]),
  executionTarget: Schema.NullOr(ProductExecutionTarget),
  packageGeneration: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(256))),
});
export type ProductResolvedSelection = typeof ProductResolvedSelection.Type;

export const ProductEngineBinding = Schema.Struct({
  id: ProductEngineBindingId,
  engineId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  lineageRef: TrimmedNonEmptyString.check(Schema.isMaxLength(1_024)),
});
export type ProductEngineBinding = typeof ProductEngineBinding.Type;

const DispatchPending = Schema.Struct({
  state: Schema.Literal("pending"),
  lastConfirmedBoundary: Schema.Literal("pre-send"),
  blocked: Schema.NullOr(
    Schema.Struct({
      kind: Schema.Literal("selected-engine-unavailable"),
      code: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
      message: TrimmedNonEmptyString.check(Schema.isMaxLength(2_000)),
      retryable: Schema.Literal(true),
      observedAt: ProductIsoDateTime,
    }),
  ),
});
const ProductAbortEvidence = Schema.NullOr(
  Schema.Struct({ requestedAt: ProductIsoDateTime, confirmed: Schema.Boolean }),
);
export const ProductExecutionEvidence = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("accepted-operation"),
    operationRef: TrimmedNonEmptyString.check(Schema.isMaxLength(1_024)),
  }),
  Schema.Struct({ kind: Schema.Literal("observed-delivery"), observedAt: ProductIsoDateTime }),
]);
export type ProductExecutionEvidence = typeof ProductExecutionEvidence.Type;
const DispatchSent = Schema.Struct({
  state: Schema.Literal("sent"),
  lastConfirmedBoundary: Schema.Literal("local-write"),
  resolvedSelection: ProductResolvedSelection,
  abort: ProductAbortEvidence,
});
const DispatchRejected = Schema.Struct({
  state: Schema.Literal("rejected"),
  code: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
  message: TrimmedNonEmptyString.check(Schema.isMaxLength(2_000)),
  retryable: Schema.Boolean,
});
const DispatchAccepted = Schema.Struct({
  state: Schema.Literal("accepted"),
  operationRef: TrimmedNonEmptyString.check(Schema.isMaxLength(1_024)),
  engineBinding: ProductEngineBinding,
  resolvedSelection: ProductResolvedSelection,
  abort: ProductAbortEvidence,
});
const DispatchDeliveryUnknown = Schema.Struct({
  state: Schema.Literal("delivery_unknown"),
  lastConfirmedBoundary: Schema.Literals(["local-write", "acceptance-ack"]),
  abort: ProductAbortEvidence,
});
const DispatchRunning = Schema.Struct({
  state: Schema.Literal("running"),
  evidence: ProductExecutionEvidence,
  engineBinding: ProductEngineBinding,
  resolvedSelection: ProductResolvedSelection,
  abort: ProductAbortEvidence,
});
const DispatchSettled = Schema.Struct({
  state: Schema.Literal("settled"),
  evidence: ProductExecutionEvidence,
  engineBinding: ProductEngineBinding,
  resolvedSelection: ProductResolvedSelection,
  outcome: Schema.Literals(["succeeded", "failed", "cancelled"]),
  settledAt: ProductIsoDateTime,
  abort: ProductAbortEvidence,
});
const DispatchOutcomeUnknown = Schema.Struct({
  state: Schema.Literal("outcome_unknown"),
  evidence: ProductExecutionEvidence,
  engineBinding: ProductEngineBinding,
  resolvedSelection: ProductResolvedSelection,
  abort: ProductAbortEvidence,
});

export const ProductDispatchReceipt = Schema.Union([
  DispatchPending,
  DispatchSent,
  DispatchRejected,
  DispatchAccepted,
  DispatchDeliveryUnknown,
  DispatchRunning,
  DispatchSettled,
  DispatchOutcomeUnknown,
]);
export type ProductDispatchReceipt = typeof ProductDispatchReceipt.Type;

export const ProductOperationReceipt = Schema.Struct({
  id: ProductOperationReceiptId,
  dispatchId: ProductDispatchId,
  runId: ProductRunId,
  receipt: ProductDispatchReceipt,
  updatedAt: ProductIsoDateTime,
});
export type ProductOperationReceipt = typeof ProductOperationReceipt.Type;

export const ProductEntry = Schema.Struct({
  id: ProductEntryId,
  conversationId: ProductConversationId,
  runId: Schema.NullOr(ProductRunId),
  role: Schema.Literals(["user", "assistant", "system"]),
  text: ProductVisibleText,
  createdAt: ProductIsoDateTime,
});
export type ProductEntry = typeof ProductEntry.Type;

export const ProductEntryPin = Schema.Struct({
  entryId: ProductEntryId,
  label: Schema.NullOr(
    TrimmedNonEmptyString.check(Schema.isMaxLength(PRODUCT_ENTRY_PIN_LABEL_MAX_CHARS)),
  ),
  done: Schema.Boolean,
  pinnedAt: ProductIsoDateTime,
});
export type ProductEntryPin = typeof ProductEntryPin.Type;

export const ProductEntryMarker = Schema.Struct({
  id: ProductEntryMarkerId,
  entryId: ProductEntryId,
  startOffset: NonNegativeInt,
  endOffset: NonNegativeInt,
  selectedText: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PRODUCT_ENTRY_MARKER_SELECTED_TEXT_MAX_CHARS),
  ),
  selectedTextDigest: Schema.String.check(Schema.isPattern(/^sha256:[0-9a-f]{64}$/)),
  style: Schema.Literals(["highlight", "underline"]),
  color: Schema.Literals(["yellow", "blue", "green", "pink"]),
  label: Schema.NullOr(
    TrimmedNonEmptyString.check(Schema.isMaxLength(PRODUCT_ENTRY_MARKER_LABEL_MAX_CHARS)),
  ),
  done: Schema.Boolean,
  createdAt: ProductIsoDateTime,
  updatedAt: ProductIsoDateTime,
});
export type ProductEntryMarker = typeof ProductEntryMarker.Type;

export const ProductRun = Schema.Struct({
  id: ProductRunId,
  conversationId: ProductConversationId,
  entryId: ProductEntryId,
  requestedSelection: ProductSelectedRuntime,
  workspaceObservation: ProductWorkspace,
  resources: Schema.Array(ProductResourceRef).check(Schema.isMaxLength(PRODUCT_MAX_RESOURCE_REFS)),
  packageGeneration: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(256))),
  receipt: ProductOperationReceipt,
  createdAt: ProductIsoDateTime,
  updatedAt: ProductIsoDateTime,
});
export type ProductRun = typeof ProductRun.Type;

export const ProductQueueItem = Schema.Struct({
  id: ProductQueueItemId,
  conversationId: ProductConversationId,
  text: ProductText,
  requestedSelection: ProductRequestedSelection,
  resources: Schema.Array(ProductResourceRef).check(Schema.isMaxLength(PRODUCT_MAX_RESOURCE_REFS)),
  position: NonNegativeInt,
  revision: PositiveInt,
  createdAt: ProductIsoDateTime,
  updatedAt: ProductIsoDateTime,
});
export type ProductQueueItem = typeof ProductQueueItem.Type;

export const ProductGroupColor = Schema.Literals([
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
]);
export type ProductGroupColor = typeof ProductGroupColor.Type;

export const ProductGroupSummary = Schema.Struct({
  id: ProductGroupId,
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(PRODUCT_GROUP_NAME_MAX_CHARS)),
  color: ProductGroupColor,
  sortOrder: NonNegativeInt,
  revision: PositiveInt,
  conversationIds: Schema.Array(ProductConversationId).check(
    Schema.isMaxLength(PRODUCT_GROUP_MEMBERSHIP_MAX_COUNT),
  ),
  createdAt: ProductIsoDateTime,
  updatedAt: ProductIsoDateTime,
});
export type ProductGroupSummary = typeof ProductGroupSummary.Type;

const ProductConversationSummaryFields = Schema.Struct({
  id: ProductConversationId,
  workspaceId: ProductWorkspaceId,
  title: ProductTitle,
  workspaceKind: Schema.Literals(["managed", "folder-backed", "chat"]),
  revision: PositiveInt,
  archivedAt: Schema.NullOr(ProductIsoDateTime),
  isPinned: Schema.Boolean,
  notes: Schema.String.check(Schema.isMaxLength(PRODUCT_CONVERSATION_NOTES_MAX_CHARS)),
  boardState: Schema.Literals(["active", "done"]),
  boardStateChangedAt: Schema.NullOr(ProductIsoDateTime),
  latestRunId: Schema.NullOr(ProductRunId),
  receiptState: Schema.NullOr(
    Schema.Literals([
      "pending",
      "sent",
      "rejected",
      "accepted",
      "delivery_unknown",
      "running",
      "settled",
      "outcome_unknown",
    ]),
  ),
  createdAt: ProductIsoDateTime,
  updatedAt: ProductIsoDateTime,
});
export const ProductConversationSummary = ProductConversationSummaryFields.check(
  Schema.makeFilter(
    (summary: typeof ProductConversationSummaryFields.Type) =>
      (summary.latestRunId === null) === (summary.receiptState === null),
    { identifier: "ProductConversationSummaryLatestRunReceiptPair" },
  ),
);
export type ProductConversationSummary = typeof ProductConversationSummary.Type;

export const ProductRuntimeActivityDetail = Schema.Union([
  Schema.Struct({
    code: Schema.Literal("session-bound"),
    lineage: Schema.Literals(["continued", "new", "missing", "divergent"]),
  }),
  Schema.Struct({
    code: Schema.Literals(["package-loaded", "package-failed"]),
    count: NonNegativeInt,
  }),
  Schema.Struct({ code: Schema.Literal("thinking-delta"), text: ProductVisibleText }),
  Schema.Struct({ code: Schema.Literal("question-requested"), question: ProductVisibleText }),
  Schema.Struct({ code: Schema.Literal("plan-updated"), summary: ProductVisibleText }),
  Schema.Struct({
    code: Schema.Literal("permission-requested"),
    toolCallId: ProductVisibleText,
    title: ProductVisibleText,
  }),
  Schema.Struct({
    code: Schema.Literal("permission-rejected"),
    toolCallId: ProductVisibleText,
    reason: ProductVisibleText,
  }),
  Schema.Struct({
    code: Schema.Literal("control-applied"),
    control: Schema.Literals(["steer", "follow-up", "abort", "cancel"]),
    text: Schema.NullOr(Schema.String.check(Schema.isMaxLength(4_096))),
  }),
  Schema.Struct({ code: Schema.Literal("tool-started"), toolName: ProductVisibleText }),
  Schema.Struct({
    code: Schema.Literal("tool-settled"),
    toolName: ProductVisibleText,
    outcome: Schema.Literals(["succeeded", "failed"]),
  }),
  Schema.Struct({
    code: Schema.Literal("usage-observed"),
    input: NonNegativeInt,
    output: NonNegativeInt,
    cacheRead: NonNegativeInt,
    cacheWrite: NonNegativeInt,
    total: NonNegativeInt,
  }),
  Schema.Struct({
    code: Schema.Literal("context-usage-observed"),
    used: NonNegativeInt,
    size: NonNegativeInt,
  }),
  Schema.Struct({
    code: Schema.Literal("run-settled"),
    outcome: Schema.Literals(["succeeded", "failed", "cancelled"]),
  }),
]);
export type ProductRuntimeActivityDetail = typeof ProductRuntimeActivityDetail.Type;

const executionFactBase = { engineSequence: PositiveInt, emittedAt: ProductIsoDateTime };
const executionText = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(16_384));
const executionName = TrimmedNonEmptyString.check(Schema.isMaxLength(512));
const executionIdentity = TrimmedNonEmptyString.check(Schema.isMaxLength(1_024));
const executionFact = <const Fields extends Schema.Struct.Fields>(fields: Fields) =>
  closedBoundary(Schema.Struct({ ...executionFactBase, ...fields }));

export const ProductExecutionFact = Schema.Union([
  executionFact({
    kind: Schema.Literal("session.bound"),
    lineage: Schema.Literals(["continued", "new", "missing", "divergent"]),
  }),
  executionFact({
    kind: Schema.Literals(["package.loaded", "package.failed"]),
    count: NonNegativeInt,
  }),
  executionFact({
    kind: Schema.Literals(["assistant.delta", "thinking.delta"]),
    text: executionText,
  }),
  executionFact({ kind: Schema.Literal("question.requested"), question: executionText }),
  executionFact({ kind: Schema.Literal("plan.updated"), summary: executionText }),
  executionFact({
    kind: Schema.Literal("permission.requested"),
    toolCallId: executionIdentity,
    title: executionName,
  }),
  executionFact({
    kind: Schema.Literal("permission.rejected"),
    toolCallId: executionIdentity,
    reason: Schema.Literal("approval-ui-unavailable"),
  }),
  executionFact({
    kind: Schema.Literal("control.applied"),
    control: Schema.Literals(["steer", "follow-up", "abort", "cancel"]),
    text: Schema.NullOr(Schema.String.check(Schema.isMaxLength(4_096))),
  }),
  executionFact({
    kind: Schema.Literal("tool.started"),
    toolCallId: executionIdentity,
    toolName: executionName,
  }),
  executionFact({
    kind: Schema.Literal("tool.settled"),
    toolCallId: executionIdentity,
    toolName: executionName,
    outcome: Schema.Literals(["succeeded", "failed"]),
    summary: Schema.String.check(Schema.isMaxLength(16_384)),
  }),
  executionFact({
    kind: Schema.Literal("usage"),
    input: NonNegativeInt,
    output: NonNegativeInt,
    cacheRead: NonNegativeInt,
    cacheWrite: NonNegativeInt,
    total: NonNegativeInt,
  }),
  executionFact({
    kind: Schema.Literal("context.usage"),
    used: NonNegativeInt,
    size: NonNegativeInt,
  }),
  executionFact({
    kind: Schema.Literal("settlement"),
    outcome: Schema.Literals(["succeeded", "failed", "cancelled"]),
    message: Schema.NullOr(Schema.String.check(Schema.isMaxLength(16_384))),
  }),
]);
export type ProductExecutionFact = typeof ProductExecutionFact.Type;

export const ProductExecutionSnapshot = closedBoundary(
  Schema.Struct({
    version: Schema.Literal(1),
    source: Schema.Literals(["engine-session-reopen", "engine-redacted-stream"]),
    assistant: Schema.String.check(Schema.isMaxLength(PRODUCT_MAX_TEXT_CHARS)),
    settlement: closedBoundary(
      Schema.Struct({
        outcome: Schema.Literals(["succeeded", "failed", "cancelled"]),
        message: Schema.String.check(Schema.isMaxLength(16_384)),
        settledAt: ProductIsoDateTime,
      }),
    ),
  }),
);
export type ProductExecutionSnapshot = typeof ProductExecutionSnapshot.Type;

export const ProductExecutionUpdate = Schema.Union([
  closedBoundary(
    Schema.Struct({
      kind: Schema.Literal("facts"),
      facts: Schema.Array(ProductExecutionFact).check(
        Schema.isMaxLength(PRODUCT_MAX_FACTS_PER_BATCH),
      ),
    }),
  ),
  closedBoundary(
    Schema.Struct({
      kind: Schema.Literal("delivery-observed"),
      engineBinding: ProductEngineBinding,
      resolvedSelection: ProductResolvedSelection,
      firstFact: ProductExecutionFact,
    }),
  ),
  closedBoundary(
    Schema.Struct({ kind: Schema.Literal("snapshot"), snapshot: ProductExecutionSnapshot }),
  ),
  closedBoundary(Schema.Struct({ kind: Schema.Literal("outcome-unknown") })),
]);
export type ProductExecutionUpdate = typeof ProductExecutionUpdate.Type;

export const ProductRuntimeActivity = Schema.Struct({
  runId: ProductRunId,
  engineSequence: PositiveInt,
  kind: Schema.Literals([
    "session",
    "package",
    "thinking",
    "question",
    "plan",
    "permission",
    "control",
    "tool",
    "usage",
    "settlement",
  ]),
  detail: ProductRuntimeActivityDetail,
  createdAt: ProductIsoDateTime,
});
export type ProductRuntimeActivity = typeof ProductRuntimeActivity.Type;

export const ProductRuntimeRecovery = Schema.Struct({
  runId: ProductRunId,
  snapshotVersion: PositiveInt,
  kind: Schema.Literal("visible-result"),
  createdAt: ProductIsoDateTime,
});
export type ProductRuntimeRecovery = typeof ProductRuntimeRecovery.Type;

export const ProductConversationReadModel = Schema.Struct({
  conversation: ProductConversationSummary,
  workspace: ProductWorkspace,
  entries: Schema.Array(ProductEntry),
  streamingEntryIds: Schema.Array(ProductEntryId),
  runs: Schema.Array(ProductRun),
  activities: Schema.Array(ProductRuntimeActivity),
  recoveries: Schema.optional(Schema.Array(ProductRuntimeRecovery)),
  queue: Schema.Array(ProductQueueItem).check(Schema.isMaxLength(PRODUCT_MAX_QUEUE_ITEMS)),
  entryPins: Schema.Array(ProductEntryPin).check(Schema.isMaxLength(PRODUCT_ENTRY_PINS_MAX_COUNT)),
  entryMarkers: Schema.Array(ProductEntryMarker).check(
    Schema.isMaxLength(PRODUCT_ENTRY_MARKERS_MAX_COUNT),
  ),
});
export type ProductConversationReadModel = typeof ProductConversationReadModel.Type;

export const ProductRuntimeModel = Schema.Struct({
  id: TrimmedNonEmptyString.check(Schema.isMaxLength(512)),
  provider: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  modelId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(512)),
  reasoning: Schema.Boolean,
  thinkingLevels: Schema.Array(
    Schema.Literals(["off", "minimal", "low", "medium", "high", "xhigh", "max"]),
  ).check(Schema.isMaxLength(7)),
  available: Schema.Boolean,
  auth: Schema.Literals(["configured", "missing", "unavailable"]),
});
export type ProductRuntimeModel = typeof ProductRuntimeModel.Type;

export const ProductCapabilityTruth = Schema.Struct({
  state: Schema.Literals(["available", "unavailable", "unsupported", "degraded", "unknown"]),
  reason: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
});
const ProductEngineAvailability = Schema.Union([
  Schema.Struct({ state: Schema.Literal("available") }),
  Schema.Struct({
    state: Schema.Literal("unavailable"),
    reason: Schema.Literals([
      "missing",
      "version-mismatch",
      "artifact-mismatch",
      "protocol-mismatch",
      "initialize-failed",
      "auth-required",
      "process-unavailable",
    ]),
  }),
]);
const ProductModelSelectionAuthority = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("product-model"),
    models: Schema.Array(ProductRuntimeModel).check(Schema.isMaxLength(128)),
    thinking: Schema.Literal("product-selectable"),
  }),
  Schema.Struct({
    kind: Schema.Literal("engine-session"),
    model: Schema.Literal("resolved-on-prepare"),
    mode: Schema.Literal("resolved-on-prepare"),
    thinking: Schema.Literal("unsupported"),
  }),
]);
const capabilityKeys = {
  continuation: ProductCapabilityTruth,
  rebuild: ProductCapabilityTruth,
  thinkingStream: ProductCapabilityTruth,
  thinkingLevel: ProductCapabilityTruth,
  structuredQuestion: ProductCapabilityTruth,
  queue: ProductCapabilityTruth,
  steer: ProductCapabilityTruth,
  followUp: ProductCapabilityTruth,
  cancel: ProductCapabilityTruth,
  permissionPolicy: ProductCapabilityTruth,
  packages: ProductCapabilityTruth,
  filesRead: ProductCapabilityTruth,
  filesWrite: ProductCapabilityTruth,
  terminal: ProductCapabilityTruth,
  namespacedUi: ProductCapabilityTruth,
};
export const ProductEngineCatalogEntry = Schema.Struct({
  engineId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  displayName: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  distribution: Schema.Literals(["bundled-native", "user-installed"]),
  runtimeVersion: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(128))),
  protocol: Schema.Struct({
    name: Schema.Literals(["native", "acp"]),
    version: TrimmedNonEmptyString.check(Schema.isMaxLength(64)),
  }),
  availability: ProductEngineAvailability,
  modelSelection: ProductModelSelectionAuthority,
  capabilities: Schema.Struct(capabilityKeys),
  enforcement: Schema.Literals(["host-enforced", "engine-enforced", "mixed", "unverified"]),
});
export type ProductEngineCatalogEntry = typeof ProductEngineCatalogEntry.Type;

export const ProductRuntimeCatalog = Schema.Struct({
  defaultEngineId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  packageGeneration: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(256))),
  engines: Schema.Array(ProductEngineCatalogEntry).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(2),
  ),
});
export type ProductRuntimeCatalog = typeof ProductRuntimeCatalog.Type;

export const ProductShellSnapshot = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  sequence: NonNegativeInt,
  workspaces: Schema.Array(ProductWorkspaceSummary),
  groups: Schema.Array(ProductGroupSummary).check(Schema.isMaxLength(PRODUCT_MAX_GROUPS)),
  conversations: Schema.Array(ProductConversationSummary),
  runtimeCatalog: Schema.NullOr(ProductRuntimeCatalog),
}).pipe(closedBoundary);
export type ProductShellSnapshot = typeof ProductShellSnapshot.Type;

export const ProductConversationSnapshot = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  sequence: NonNegativeInt,
  readModel: ProductConversationReadModel,
}).pipe(closedBoundary);
export type ProductConversationSnapshot = typeof ProductConversationSnapshot.Type;

export const ProductCreateConversationInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  conversationId: ProductConversationId,
  workspaceId: ProductWorkspaceId,
  title: ProductTitle,
  workspace: ProductWorkspaceAccess,
}).pipe(closedBoundary);
export type ProductCreateConversationInput = typeof ProductCreateConversationInput.Type;

export const ProductCreateWorkspaceInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  workspaceId: ProductWorkspaceId,
  title: ProductTitle,
  access: ProductWorkspaceAccess,
  visibleInSidebar: Schema.Boolean,
}).pipe(closedBoundary);
export type ProductCreateWorkspaceInput = typeof ProductCreateWorkspaceInput.Type;

export const ProductCreateGroupInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  groupId: ProductGroupId,
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(PRODUCT_GROUP_NAME_MAX_CHARS)),
  color: ProductGroupColor,
}).pipe(closedBoundary);
export type ProductCreateGroupInput = typeof ProductCreateGroupInput.Type;

const ProductGroupMutationTarget = {
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  mutationId: ProductMutationId,
  groupId: ProductGroupId,
  expectedRevision: PositiveInt,
};

export const ProductUpdateGroupInput = Schema.Struct({
  ...ProductGroupMutationTarget,
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(PRODUCT_GROUP_NAME_MAX_CHARS)),
  color: ProductGroupColor,
}).pipe(closedBoundary);
export type ProductUpdateGroupInput = typeof ProductUpdateGroupInput.Type;

export const ProductReorderGroupsInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  mutationId: ProductMutationId,
  expectedGroups: Schema.Array(
    Schema.Struct({ groupId: ProductGroupId, revision: PositiveInt }),
  ).check(Schema.isMinLength(1), Schema.isMaxLength(PRODUCT_MAX_GROUPS)),
  orderedGroupIds: Schema.Array(ProductGroupId).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PRODUCT_MAX_GROUPS),
  ),
}).pipe(closedBoundary);
export type ProductReorderGroupsInput = typeof ProductReorderGroupsInput.Type;

export const ProductDeleteGroupInput = Schema.Struct({
  ...ProductGroupMutationTarget,
}).pipe(closedBoundary);
export type ProductDeleteGroupInput = typeof ProductDeleteGroupInput.Type;

export const ProductDeleteGroupResult = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  groupId: ProductGroupId,
  revision: PositiveInt,
  sequence: PositiveInt,
}).pipe(closedBoundary);
export type ProductDeleteGroupResult = typeof ProductDeleteGroupResult.Type;

const ProductConversationMembershipExpectation = Schema.Struct({
  conversationId: ProductConversationId,
  groupIds: Schema.Array(ProductGroupId).check(Schema.isMaxLength(PRODUCT_MAX_GROUPS)),
});

const ProductConversationGroupsMutationTarget = {
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  mutationId: ProductMutationId,
  expectedMemberships: Schema.Array(ProductConversationMembershipExpectation).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PRODUCT_GROUP_MEMBERSHIP_MAX_COUNT),
  ),
  groupIds: Schema.Array(ProductGroupId).check(Schema.isMaxLength(PRODUCT_MAX_GROUPS)),
};

/** Replaces each target Conversation's complete Group membership set atomically. */
export const ProductSetConversationGroupsInput = Schema.Struct({
  ...ProductConversationGroupsMutationTarget,
}).pipe(closedBoundary);
export type ProductSetConversationGroupsInput = typeof ProductSetConversationGroupsInput.Type;

/** Adds Groups without removing a Conversation's existing memberships. */
export const ProductAddConversationGroupsInput = Schema.Struct({
  ...ProductConversationGroupsMutationTarget,
}).pipe(closedBoundary);
export type ProductAddConversationGroupsInput = typeof ProductAddConversationGroupsInput.Type;

export const ProductGroupMembershipResult = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  groups: Schema.Array(ProductGroupSummary).check(Schema.isMaxLength(PRODUCT_MAX_GROUPS)),
  sequence: NonNegativeInt,
}).pipe(closedBoundary);
export type ProductGroupMembershipResult = typeof ProductGroupMembershipResult.Type;

const ProductWorkspaceMutationTarget = {
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  mutationId: ProductMutationId,
  workspaceId: ProductWorkspaceId,
  expectedRevision: PositiveInt,
};

export const ProductUpdateWorkspaceTitleInput = Schema.Struct({
  ...ProductWorkspaceMutationTarget,
  title: ProductTitle,
}).pipe(closedBoundary);
export type ProductUpdateWorkspaceTitleInput = typeof ProductUpdateWorkspaceTitleInput.Type;

export const ProductSetWorkspacePinnedInput = Schema.Struct({
  ...ProductWorkspaceMutationTarget,
  isPinned: Schema.Boolean,
}).pipe(closedBoundary);
export type ProductSetWorkspacePinnedInput = typeof ProductSetWorkspacePinnedInput.Type;

export const ProductUpdateWorkspaceRunCommandInput = Schema.Struct({
  ...ProductWorkspaceMutationTarget,
  runCommand: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(8_192))),
}).pipe(closedBoundary);
export type ProductUpdateWorkspaceRunCommandInput =
  typeof ProductUpdateWorkspaceRunCommandInput.Type;

export const ProductDeleteWorkspaceInput = Schema.Struct({
  ...ProductWorkspaceMutationTarget,
}).pipe(closedBoundary);
export type ProductDeleteWorkspaceInput = typeof ProductDeleteWorkspaceInput.Type;

export const ProductDeleteWorkspaceResult = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  workspaceId: ProductWorkspaceId,
  revision: PositiveInt,
  sequence: PositiveInt,
}).pipe(closedBoundary);
export type ProductDeleteWorkspaceResult = typeof ProductDeleteWorkspaceResult.Type;

const ProductConversationMutationTarget = {
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  mutationId: ProductMutationId,
  conversationId: ProductConversationId,
  expectedRevision: PositiveInt,
};

export const ProductUpdateConversationTitleInput = Schema.Struct({
  ...ProductConversationMutationTarget,
  title: ProductTitle,
}).pipe(closedBoundary);
export type ProductUpdateConversationTitleInput = typeof ProductUpdateConversationTitleInput.Type;

export const ProductArchiveConversationInput = Schema.Struct({
  ...ProductConversationMutationTarget,
}).pipe(closedBoundary);
export type ProductArchiveConversationInput = typeof ProductArchiveConversationInput.Type;

export const ProductRestoreConversationInput = Schema.Struct({
  ...ProductConversationMutationTarget,
}).pipe(closedBoundary);
export type ProductRestoreConversationInput = typeof ProductRestoreConversationInput.Type;

export const ProductDeleteConversationInput = Schema.Struct({
  ...ProductConversationMutationTarget,
}).pipe(closedBoundary);
export type ProductDeleteConversationInput = typeof ProductDeleteConversationInput.Type;

export const ProductDeleteConversationResult = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  conversationId: ProductConversationId,
  revision: PositiveInt,
  sequence: PositiveInt,
}).pipe(closedBoundary);
export type ProductDeleteConversationResult = typeof ProductDeleteConversationResult.Type;

export const ProductSetConversationPinnedInput = Schema.Struct({
  ...ProductConversationMutationTarget,
  isPinned: Schema.Boolean,
}).pipe(closedBoundary);
export type ProductSetConversationPinnedInput = typeof ProductSetConversationPinnedInput.Type;

export const ProductUpdateConversationNotesInput = Schema.Struct({
  ...ProductConversationMutationTarget,
  notes: Schema.String.check(Schema.isMaxLength(PRODUCT_CONVERSATION_NOTES_MAX_CHARS)),
}).pipe(closedBoundary);
export type ProductUpdateConversationNotesInput = typeof ProductUpdateConversationNotesInput.Type;

export const ProductSetConversationBoardStateInput = Schema.Struct({
  ...ProductConversationMutationTarget,
  boardState: Schema.Literals(["active", "done"]),
}).pipe(closedBoundary);
export type ProductSetConversationBoardStateInput =
  typeof ProductSetConversationBoardStateInput.Type;

const ProductEntryAnnotationMutationTarget = {
  ...ProductConversationMutationTarget,
  entryId: ProductEntryId,
};

export const ProductAddEntryPinInput = Schema.Struct({
  ...ProductEntryAnnotationMutationTarget,
}).pipe(closedBoundary);
export type ProductAddEntryPinInput = typeof ProductAddEntryPinInput.Type;

export const ProductRemoveEntryPinInput = Schema.Struct({
  ...ProductEntryAnnotationMutationTarget,
}).pipe(closedBoundary);
export type ProductRemoveEntryPinInput = typeof ProductRemoveEntryPinInput.Type;

export const ProductSetEntryPinDoneInput = Schema.Struct({
  ...ProductEntryAnnotationMutationTarget,
  done: Schema.Boolean,
}).pipe(closedBoundary);
export type ProductSetEntryPinDoneInput = typeof ProductSetEntryPinDoneInput.Type;

export const ProductSetEntryPinLabelInput = Schema.Struct({
  ...ProductEntryAnnotationMutationTarget,
  label: Schema.NullOr(
    TrimmedNonEmptyString.check(Schema.isMaxLength(PRODUCT_ENTRY_PIN_LABEL_MAX_CHARS)),
  ),
}).pipe(closedBoundary);
export type ProductSetEntryPinLabelInput = typeof ProductSetEntryPinLabelInput.Type;

export const ProductAddEntryMarkerInput = Schema.Struct({
  ...ProductEntryAnnotationMutationTarget,
  markerId: ProductEntryMarkerId,
  startOffset: NonNegativeInt,
  endOffset: NonNegativeInt,
  selectedText: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PRODUCT_ENTRY_MARKER_SELECTED_TEXT_MAX_CHARS),
  ),
  selectedTextDigest: Schema.String.check(Schema.isPattern(/^sha256:[0-9a-f]{64}$/)),
  style: ProductEntryMarker.fields.style,
  color: ProductEntryMarker.fields.color,
}).pipe(closedBoundary);
export type ProductAddEntryMarkerInput = typeof ProductAddEntryMarkerInput.Type;

const ProductEntryMarkerMutationTarget = {
  ...ProductConversationMutationTarget,
  markerId: ProductEntryMarkerId,
};

export const ProductRemoveEntryMarkerInput = Schema.Struct({
  ...ProductEntryMarkerMutationTarget,
}).pipe(closedBoundary);
export type ProductRemoveEntryMarkerInput = typeof ProductRemoveEntryMarkerInput.Type;

export const ProductSetEntryMarkerDoneInput = Schema.Struct({
  ...ProductEntryMarkerMutationTarget,
  done: Schema.Boolean,
}).pipe(closedBoundary);
export type ProductSetEntryMarkerDoneInput = typeof ProductSetEntryMarkerDoneInput.Type;

export const ProductSetEntryMarkerLabelInput = Schema.Struct({
  ...ProductEntryMarkerMutationTarget,
  label: Schema.NullOr(
    TrimmedNonEmptyString.check(Schema.isMaxLength(PRODUCT_ENTRY_MARKER_LABEL_MAX_CHARS)),
  ),
}).pipe(closedBoundary);
export type ProductSetEntryMarkerLabelInput = typeof ProductSetEntryMarkerLabelInput.Type;

export const ProductGetConversationInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  conversationId: ProductConversationId,
}).pipe(closedBoundary);
export type ProductGetConversationInput = typeof ProductGetConversationInput.Type;

export const ProductPutQueueItemInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  conversationId: ProductConversationId,
  itemId: ProductQueueItemId,
  text: ProductText,
  requestedSelection: ProductRequestedSelection,
  resources: Schema.Array(ProductResourceRef).check(Schema.isMaxLength(PRODUCT_MAX_RESOURCE_REFS)),
  expectedRevision: Schema.NullOr(NonNegativeInt),
}).pipe(closedBoundary);
export type ProductPutQueueItemInput = typeof ProductPutQueueItemInput.Type;

export const ProductReorderQueueInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  conversationId: ProductConversationId,
  orderedItemIds: Schema.Array(ProductQueueItemId).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(PRODUCT_MAX_QUEUE_ITEMS),
  ),
}).pipe(closedBoundary);
export type ProductReorderQueueInput = typeof ProductReorderQueueInput.Type;

export const ProductDeleteQueueItemInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  conversationId: ProductConversationId,
  itemId: ProductQueueItemId,
  expectedRevision: PositiveInt,
}).pipe(closedBoundary);
export type ProductDeleteQueueItemInput = typeof ProductDeleteQueueItemInput.Type;

export const ProductSubmitQueueItemInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  conversationId: ProductConversationId,
  itemId: ProductQueueItemId,
  expectedRevision: PositiveInt,
  entryId: ProductEntryId,
  runId: ProductRunId,
  dispatchId: ProductDispatchId,
  receiptId: ProductOperationReceiptId,
}).pipe(closedBoundary);
export type ProductSubmitQueueItemInput = typeof ProductSubmitQueueItemInput.Type;

export const ProductSubmitResult = Schema.Struct({
  snapshot: ProductConversationSnapshot,
  automaticReplayCount: Schema.Literal(0),
}).pipe(closedBoundary);
export type ProductSubmitResult = typeof ProductSubmitResult.Type;

export const ProductRetryDispatchInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  conversationId: ProductConversationId,
  dispatchId: ProductDispatchId,
}).pipe(closedBoundary);
export type ProductRetryDispatchInput = typeof ProductRetryDispatchInput.Type;

export const ProductControlRunInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  conversationId: ProductConversationId,
  runId: ProductRunId,
  control: Schema.Literals(["steer", "follow-up", "abort", "cancel"]),
  text: Schema.NullOr(ProductText),
}).pipe(closedBoundary);
export type ProductControlRunInput = typeof ProductControlRunInput.Type;

export const ProductControlRunResult = Schema.Struct({
  operationRef: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(1_024))),
  control: Schema.Literals(["steer", "follow-up", "abort", "cancel"]),
  result: Schema.Literals(["applied", "requested", "unsupported", "too-late", "unknown"]),
  code: Schema.Literals([
    "control-applied",
    "control-unsupported",
    "control-too-late",
    "operation-unknown",
    "control-unacknowledged",
  ]),
  message: TrimmedNonEmptyString.check(Schema.isMaxLength(2_000)),
}).pipe(closedBoundary);
export type ProductControlRunResult = typeof ProductControlRunResult.Type;

const ProductConversationShellFactChange = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("conversation-summary"),
    conversation: ProductConversationSummary,
  }),
  Schema.Struct({
    kind: Schema.Literal("conversation-tombstone"),
    conversationId: ProductConversationId,
  }),
]);
const ProductWorkspaceShellFactChange = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("workspace-summary"),
    workspace: ProductWorkspaceSummary,
  }),
  Schema.Struct({
    kind: Schema.Literal("workspace-tombstone"),
    workspaceId: ProductWorkspaceId,
  }),
]);
const ProductGroupShellFactChange = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("group-summary"),
    group: ProductGroupSummary,
  }),
  Schema.Struct({
    kind: Schema.Literal("group-tombstone"),
    groupId: ProductGroupId,
  }),
]);
const ProductRuntimeShellFactChange = Schema.Struct({
  kind: Schema.Literal("runtime-catalog"),
  catalog: Schema.NullOr(ProductRuntimeCatalog),
});
export const ProductShellFactChange = Schema.Union([
  ProductConversationShellFactChange,
  ProductWorkspaceShellFactChange,
  ProductGroupShellFactChange,
  ProductRuntimeShellFactChange,
]);
export type ProductShellFactChange = typeof ProductShellFactChange.Type;

/*
 * Shell facts name exactly one Product scope. Runtime catalog refreshes are
 * Host observations and therefore carry neither a Workspace nor Conversation id.
 */
const ProductShellFactBase = {
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  sequence: PositiveInt,
  factId: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
  emittedAt: ProductIsoDateTime,
};
const ProductConversationShellFact = Schema.Struct({
  ...ProductShellFactBase,
  conversationId: ProductConversationId,
  change: ProductConversationShellFactChange,
});
const ProductWorkspaceShellFact = Schema.Struct({
  ...ProductShellFactBase,
  workspaceId: ProductWorkspaceId,
  change: ProductWorkspaceShellFactChange,
});
const ProductGroupShellFact = Schema.Struct({
  ...ProductShellFactBase,
  groupId: ProductGroupId,
  change: ProductGroupShellFactChange,
});
const ProductRuntimeShellFact = Schema.Struct({
  ...ProductShellFactBase,
  change: ProductRuntimeShellFactChange,
});

export const ProductDetailFactChange = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("conversation-created"),
    conversationId: ProductConversationId,
  }),
  Schema.Struct({
    kind: Schema.Literal("conversation-tombstone"),
    conversationId: ProductConversationId,
  }),
  Schema.Struct({
    kind: Schema.Literal("conversation-updated"),
    conversation: ProductConversationSummary,
  }),
  Schema.Struct({
    kind: Schema.Literal("queue-changed"),
    conversationId: ProductConversationId,
    queue: Schema.Array(ProductQueueItem).check(Schema.isMaxLength(PRODUCT_MAX_QUEUE_ITEMS)),
  }),
  Schema.Struct({
    kind: Schema.Literal("entry-pins-changed"),
    conversationId: ProductConversationId,
    pins: Schema.Array(ProductEntryPin).check(Schema.isMaxLength(PRODUCT_ENTRY_PINS_MAX_COUNT)),
  }),
  Schema.Struct({
    kind: Schema.Literal("entry-markers-changed"),
    conversationId: ProductConversationId,
    markers: Schema.Array(ProductEntryMarker).check(
      Schema.isMaxLength(PRODUCT_ENTRY_MARKERS_MAX_COUNT),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("entry-admitted"),
    conversationId: ProductConversationId,
    entry: ProductEntry,
    run: ProductRun,
  }),
  Schema.Struct({
    kind: Schema.Literal("entry-delta"),
    conversationId: ProductConversationId,
    entryId: ProductEntryId,
    runId: ProductRunId,
    delta: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(4_096)),
    createdAt: ProductIsoDateTime,
  }),
  Schema.Struct({
    kind: Schema.Literal("entry-replaced"),
    conversationId: ProductConversationId,
    entry: ProductEntry,
  }),
  Schema.Struct({
    kind: Schema.Literal("entry-removed"),
    conversationId: ProductConversationId,
    entryId: ProductEntryId,
  }),
  Schema.Struct({
    kind: Schema.Literal("entry-streaming"),
    conversationId: ProductConversationId,
    entryId: ProductEntryId,
    streaming: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal("runtime-activity"),
    conversationId: ProductConversationId,
    activity: ProductRuntimeActivity,
  }),
  Schema.Struct({
    kind: Schema.Literal("runtime-recovered"),
    conversationId: ProductConversationId,
    recovery: ProductRuntimeRecovery,
  }),
  Schema.Struct({
    kind: Schema.Literal("dispatch-changed"),
    conversationId: ProductConversationId,
    runId: ProductRunId,
    receipt: ProductOperationReceipt,
  }),
]);
export type ProductDetailFactChange = typeof ProductDetailFactChange.Type;

const ProductDetailFactBase = {
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  sequence: PositiveInt,
  factId: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
  conversationId: ProductConversationId,
  emittedAt: ProductIsoDateTime,
};
export const ProductShellFact = Schema.Union([
  ProductConversationShellFact,
  ProductWorkspaceShellFact,
  ProductGroupShellFact,
  ProductRuntimeShellFact,
]);
export type ProductShellFact = typeof ProductShellFact.Type;
export const ProductDetailFact = Schema.Struct({
  ...ProductDetailFactBase,
  change: ProductDetailFactChange,
});
export type ProductDetailFact = typeof ProductDetailFact.Type;
export const ProductFact = Schema.Union([ProductShellFact, ProductDetailFact]);
export type ProductFact = typeof ProductFact.Type;

export const ProductFactScope = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("shell") }),
  Schema.Struct({ kind: Schema.Literal("conversation"), conversationId: ProductConversationId }),
]);
export type ProductFactScope = typeof ProductFactScope.Type;

export const ProductReadFactsInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  scope: ProductFactScope,
  afterSequence: NonNegativeInt,
  limit: PositiveInt.check(Schema.isLessThanOrEqualTo(PRODUCT_MAX_FACTS_PER_BATCH)),
}).pipe(closedBoundary);
export type ProductReadFactsInput = typeof ProductReadFactsInput.Type;

const ProductFactBatchBase = {
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  afterSequence: NonNegativeInt,
  highWaterSequence: NonNegativeInt,
  resnapshotRequired: Schema.Boolean,
  reason: Schema.optional(Schema.Literals(["overflow", "cursor-ahead", "history-unavailable"])),
};
export const ProductShellFactBatch = Schema.Struct({
  ...ProductFactBatchBase,
  scope: Schema.Struct({ kind: Schema.Literal("shell") }),
  facts: Schema.Array(ProductShellFact).check(Schema.isMaxLength(PRODUCT_MAX_FACTS_PER_BATCH)),
});
export type ProductShellFactBatch = typeof ProductShellFactBatch.Type;
export const ProductDetailFactBatch = Schema.Struct({
  ...ProductFactBatchBase,
  scope: Schema.Struct({
    kind: Schema.Literal("conversation"),
    conversationId: ProductConversationId,
  }),
  facts: Schema.Array(ProductDetailFact).check(Schema.isMaxLength(PRODUCT_MAX_FACTS_PER_BATCH)),
});
export type ProductDetailFactBatch = typeof ProductDetailFactBatch.Type;
export const ProductFactBatch = Schema.Union([ProductShellFactBatch, ProductDetailFactBatch]).pipe(
  closedBoundary,
);
export type ProductFactBatch = typeof ProductFactBatch.Type;

/** Closed, validated observations crossing the Product-to-native execution boundary. */
export const ProductExecutionObservation = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("pre-send-failure"),
    code: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
    message: TrimmedNonEmptyString.check(Schema.isMaxLength(2_000)),
    retryable: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal("rejected"),
    code: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
    message: TrimmedNonEmptyString.check(Schema.isMaxLength(2_000)),
    retryable: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal("accepted"),
    operationRef: TrimmedNonEmptyString.check(Schema.isMaxLength(1_024)),
    engineBinding: ProductEngineBinding,
    resolvedSelection: ProductResolvedSelection,
  }),
  Schema.Struct({
    kind: Schema.Literal("indeterminate"),
    lastConfirmedBoundary: Schema.Literals(["sent", "acceptance-ack"]),
    reconciliationHint: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(512))),
  }),
  Schema.Struct({
    kind: Schema.Literal("observed-settled"),
    engineBinding: ProductEngineBinding,
    resolvedSelection: ProductResolvedSelection,
    outcome: Schema.Literals(["succeeded", "failed"]),
    settledAt: ProductIsoDateTime,
  }),
  Schema.Struct({
    kind: Schema.Literal("observed-outcome-unknown"),
    engineBinding: ProductEngineBinding,
    resolvedSelection: ProductResolvedSelection,
  }),
]).pipe(closedBoundary);
export type ProductExecutionObservation = typeof ProductExecutionObservation.Type;

export const ProductRunObservation = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("running") }),
  Schema.Struct({
    kind: Schema.Literal("settled"),
    outcome: Schema.Literals(["succeeded", "failed", "cancelled"]),
    settledAt: ProductIsoDateTime,
  }),
  Schema.Struct({ kind: Schema.Literal("outcome_unknown") }),
]).pipe(closedBoundary);
export type ProductRunObservation = typeof ProductRunObservation.Type;
