import { Schema } from "effect";

import { NonNegativeInt, PositiveInt, TrimmedNonEmptyString } from "../baseSchemas";

const closedBoundary = <A extends Schema.Top>(schema: A): A =>
  schema.annotate({ parseOptions: { onExcessProperty: "error" } }) as A;

export const PRODUCT_PROTOCOL_VERSION = 1 as const;
export const PRODUCT_MAX_TEXT_CHARS = 65_536;
export const PRODUCT_MAX_FACTS_PER_BATCH = 256;
export const PRODUCT_MAX_QUEUE_ITEMS = 128;
export const PRODUCT_MAX_RESOURCE_REFS = 32;

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

export const ProductRequestedSelection = Schema.Struct({
  engineId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  modelId: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(256))),
  thinking: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(128))),
  permissionPolicy: Schema.Literals(["approval-required", "auto", "full-access"]),
  enforcement: Schema.Literals(["host-enforced", "engine-enforced", "mixed", "unverified"]),
  executionTarget: Schema.NullOr(ProductExecutionTarget),
  packageGeneration: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
});
export type ProductRequestedSelection = typeof ProductRequestedSelection.Type;

export const ProductResolvedSelection = Schema.Struct({
  engineId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  modelId: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(256))),
  thinking: Schema.NullOr(TrimmedNonEmptyString.check(Schema.isMaxLength(128))),
  permissionPolicy: Schema.Literals(["approval-required", "auto", "full-access"]),
  enforcement: Schema.Literals(["host-enforced", "engine-enforced", "mixed", "unverified"]),
  executionTarget: Schema.NullOr(ProductExecutionTarget),
  packageGeneration: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
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
});
const DispatchDeliveryUnknown = Schema.Struct({
  state: Schema.Literal("delivery_unknown"),
  lastConfirmedBoundary: Schema.Literals(["sent", "acceptance-ack"]),
  reconciliationHint: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(512))),
});
const DispatchRunning = Schema.Struct({
  state: Schema.Literal("running"),
  operationRef: TrimmedNonEmptyString.check(Schema.isMaxLength(1_024)),
  engineBinding: ProductEngineBinding,
  resolvedSelection: ProductResolvedSelection,
});
const DispatchSettled = Schema.Struct({
  state: Schema.Literal("settled"),
  operationRef: TrimmedNonEmptyString.check(Schema.isMaxLength(1_024)),
  engineBinding: ProductEngineBinding,
  resolvedSelection: ProductResolvedSelection,
  outcome: Schema.Literals(["succeeded", "failed", "cancelled"]),
  settledAt: ProductIsoDateTime,
});
const DispatchOutcomeUnknown = Schema.Struct({
  state: Schema.Literal("outcome_unknown"),
  operationRef: TrimmedNonEmptyString.check(Schema.isMaxLength(1_024)),
  engineBinding: ProductEngineBinding,
  resolvedSelection: ProductResolvedSelection,
  lastConfirmedBoundary: Schema.Literal("accepted"),
});

export const ProductDispatchReceipt = Schema.Union([
  DispatchPending,
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

export const ProductRun = Schema.Struct({
  id: ProductRunId,
  conversationId: ProductConversationId,
  entryId: ProductEntryId,
  requestedSelection: ProductRequestedSelection,
  workspaceObservation: ProductWorkspace,
  resources: Schema.Array(ProductResourceRef).check(Schema.isMaxLength(PRODUCT_MAX_RESOURCE_REFS)),
  packageGeneration: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
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

export const ProductConversationSummary = Schema.Struct({
  id: ProductConversationId,
  workspaceId: ProductWorkspaceId,
  title: ProductTitle,
  workspaceKind: Schema.Literals(["managed", "folder-backed", "chat"]),
  receiptState: Schema.NullOr(
    Schema.Literals([
      "pending",
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
    code: Schema.Literal("run-settled"),
    outcome: Schema.Literals(["succeeded", "failed", "cancelled"]),
  }),
]);
export type ProductRuntimeActivityDetail = typeof ProductRuntimeActivityDetail.Type;

export const ProductRuntimeActivity = Schema.Struct({
  runId: ProductRunId,
  nativeSequence: PositiveInt,
  kind: Schema.Literals([
    "session",
    "package",
    "thinking",
    "question",
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

/** Sanitized Host-owned catalog snapshot; Product never reconstructs provider capability. */
export const ProductRuntimeCatalog = Schema.Struct({
  engineId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  runtimeVersion: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
  packageGeneration: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  models: Schema.Array(ProductRuntimeModel).check(Schema.isMaxLength(128)),
  truncated: Schema.Boolean,
});
export type ProductRuntimeCatalog = typeof ProductRuntimeCatalog.Type;

export const ProductShellSnapshot = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  sequence: NonNegativeInt,
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

export const ProductControlRunInput = Schema.Struct({
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  conversationId: ProductConversationId,
  runId: ProductRunId,
  control: Schema.Literals(["steer", "follow-up", "abort", "cancel"]),
  text: Schema.NullOr(ProductText),
}).pipe(closedBoundary);
export type ProductControlRunInput = typeof ProductControlRunInput.Type;

export const ProductControlRunResult = Schema.Struct({
  operationRef: TrimmedNonEmptyString.check(Schema.isMaxLength(1_024)),
  control: Schema.Literals(["steer", "follow-up", "abort", "cancel"]),
  result: Schema.Literals(["applied", "unsupported", "too-late", "unknown"]),
  code: Schema.Literals([
    "control-applied",
    "control-unsupported",
    "control-too-late",
    "operation-unknown",
  ]),
  message: TrimmedNonEmptyString.check(Schema.isMaxLength(2_000)),
}).pipe(closedBoundary);
export type ProductControlRunResult = typeof ProductControlRunResult.Type;

export const ProductShellFactChange = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("conversation-summary"),
    conversation: ProductConversationSummary,
  }),
  Schema.Struct({
    kind: Schema.Literal("conversation-tombstone"),
    conversationId: ProductConversationId,
  }),
  Schema.Struct({
    kind: Schema.Literal("runtime-catalog"),
    catalog: ProductRuntimeCatalog,
  }),
]);
export type ProductShellFactChange = typeof ProductShellFactChange.Type;

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
    kind: Schema.Literal("queue-changed"),
    conversationId: ProductConversationId,
    queue: Schema.Array(ProductQueueItem).check(Schema.isMaxLength(PRODUCT_MAX_QUEUE_ITEMS)),
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

const ProductFactBase = {
  protocolVersion: Schema.Literal(PRODUCT_PROTOCOL_VERSION),
  sequence: PositiveInt,
  factId: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
  conversationId: ProductConversationId,
  emittedAt: ProductIsoDateTime,
};
export const ProductShellFact = Schema.Struct({
  ...ProductFactBase,
  change: ProductShellFactChange,
});
export type ProductShellFact = typeof ProductShellFact.Type;
export const ProductDetailFact = Schema.Struct({
  ...ProductFactBase,
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
