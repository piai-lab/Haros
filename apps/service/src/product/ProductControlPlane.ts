import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import { workspaceRootsEqual } from "@omnimind/shared/threadWorkspace";

import {
  PRODUCT_ENTRY_MARKERS_MAX_COUNT,
  PRODUCT_ENTRY_PINS_MAX_COUNT,
  PRODUCT_GROUP_MEMBERSHIP_MAX_COUNT,
  PRODUCT_MAX_FACTS_PER_BATCH,
  PRODUCT_MAX_GROUPS,
  PRODUCT_MAX_TEXT_CHARS,
  PRODUCT_PROTOCOL_VERSION,
  ProductArchiveConversationInput,
  ProductAddConversationGroupsInput,
  ProductAddEntryMarkerInput,
  ProductAddEntryPinInput,
  ProductConversationId,
  ProductConversationReadModel,
  ProductConversationSnapshot,
  ProductConversationSummary,
  ProductControlRunInput,
  ProductControlRunResult,
  ProductCreateConversationInput,
  ProductCreateGroupInput,
  ProductCreateWorkspaceInput,
  ProductDeleteConversationInput,
  ProductDeleteGroupInput,
  ProductDeleteGroupResult,
  ProductDeleteConversationResult,
  ProductDeleteWorkspaceInput,
  ProductDeleteWorkspaceResult,
  ProductDeleteQueueItemInput,
  ProductDispatchReceipt,
  ProductEntry,
  ProductEntryMarker,
  ProductEntryPin,
  ProductEngineBindingId,
  ProductExecutionObservation,
  ProductFactBatch,
  ProductDetailFactChange,
  ProductDetailFact,
  ProductShellFactChange,
  ProductShellFact,
  ProductGetConversationInput,
  ProductGroupMembershipResult,
  ProductGroupSummary,
  ProductOperationReceipt,
  ProductPutQueueItemInput,
  ProductQueueItem,
  ProductReadFactsInput,
  ProductRetryDispatchInput,
  ProductRemoveEntryMarkerInput,
  ProductRemoveEntryPinInput,
  ProductReorderGroupsInput,
  ProductReorderQueueInput,
  ProductRestoreConversationInput,
  ProductRequestedSelection,
  ProductResourceRef,
  ProductRun,
  ProductRunObservation,
  ProductRuntimeActivity,
  ProductRuntimeActivityDetail,
  ProductRuntimeCatalog,
  ProductRuntimeRecovery,
  ProductSelectedRuntime,
  ProductSetConversationBoardStateInput,
  ProductSetConversationGroupsInput,
  ProductSetConversationPinnedInput,
  ProductSetEntryMarkerDoneInput,
  ProductSetEntryMarkerLabelInput,
  ProductSetEntryPinDoneInput,
  ProductSetEntryPinLabelInput,
  ProductSetWorkspacePinnedInput,
  ProductShellSnapshot,
  ProductSubmitQueueItemInput,
  ProductSubmitResult,
  ProductUpdateConversationTitleInput,
  ProductUpdateConversationNotesInput,
  ProductUpdateGroupInput,
  ProductUpdateWorkspaceRunCommandInput,
  ProductUpdateWorkspaceTitleInput,
  ProductWorkspace,
  ProductWorkspaceAccess,
  ProductWorkspaceSummary,
  ProductExecutionUpdate,
  type ProductExecutionFact,
  type ProductExecutionSnapshot,
  type ProductDispatchId,
  ProductResolvedSelection,
  type ProductRunId,
} from "@omnimind/contracts";
import { Effect, Layer, Schema, ServiceMap } from "effect";

import { ServerConfig } from "../config";
import { ensurePrivateFileSync } from "../privatePathPermissions";
import {
  acquireDatabaseLifecycleLock,
  releaseDatabaseLifecycleLock,
} from "../persistence/DatabaseLifecycleLock";

export const PRODUCT_DATABASE_FILENAME = "product-state-v1.sqlite";
export const PRODUCT_SCHEMA_VERSION = 2;
export const PRODUCT_MIGRATION_REVISION = "selection-schema-v2";
const RUNTIME_CATALOG_OBSERVATION_INTERVAL_MS = 5_000;
const productIsoNow = () => new Date().toISOString();

interface PortableStatement {
  run(...parameters: ReadonlyArray<unknown>): unknown;
  get(...parameters: ReadonlyArray<unknown>): unknown;
  all(...parameters: ReadonlyArray<unknown>): ReadonlyArray<unknown>;
}

interface PortableDatabase {
  exec(sql: string): void;
  prepare(sql: string): PortableStatement;
  close(): void;
}

const openPortableDatabase = async (filename: string): Promise<PortableDatabase> => {
  if (process.versions.bun !== undefined) {
    const { Database } = await import("bun:sqlite");
    return new Database(filename) as unknown as PortableDatabase;
  }
  const { DatabaseSync } = await import("node:sqlite");
  return new DatabaseSync(filename) as unknown as PortableDatabase;
};

const productSchemaSql = `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS product_meta (
    schema_version INTEGER NOT NULL CHECK (schema_version = 2),
    migration_revision TEXT NOT NULL CHECK (migration_revision = 'selection-schema-v2')
  );

  CREATE TABLE IF NOT EXISTS product_workspaces (
    workspace_id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Workspace',
    access_json TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    visible_in_sidebar INTEGER NOT NULL DEFAULT 1 CHECK (visible_in_sidebar IN (0, 1)),
    is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
    run_command TEXT,
    archived_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z',
    updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'
  );

  CREATE TABLE IF NOT EXISTS product_groups (
    group_id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_conversations (
    conversation_id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES product_workspaces(workspace_id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    archived_at TEXT,
    is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
    notes TEXT NOT NULL DEFAULT '',
    board_state TEXT NOT NULL DEFAULT 'active' CHECK (board_state IN ('active', 'done')),
    board_state_changed_at TEXT,
    deleted_at TEXT,
    detail_sequence INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_entries (
    entry_id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    run_id TEXT,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_group_conversations (
    group_id TEXT NOT NULL REFERENCES product_groups(group_id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (group_id, conversation_id)
  );

  CREATE TABLE IF NOT EXISTS product_entry_pins (
    conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    entry_id TEXT NOT NULL REFERENCES product_entries(entry_id) ON DELETE CASCADE,
    label TEXT,
    done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
    pinned_at TEXT NOT NULL,
    PRIMARY KEY (conversation_id, entry_id)
  );

  CREATE TABLE IF NOT EXISTS product_entry_markers (
    marker_id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    entry_id TEXT NOT NULL REFERENCES product_entries(entry_id) ON DELETE CASCADE,
    start_offset INTEGER NOT NULL CHECK (start_offset >= 0),
    end_offset INTEGER NOT NULL CHECK (end_offset > start_offset),
    selected_text TEXT NOT NULL,
    selected_text_digest TEXT NOT NULL,
    style TEXT NOT NULL CHECK (style IN ('highlight', 'underline')),
    color TEXT NOT NULL CHECK (color IN ('yellow', 'blue', 'green', 'pink')),
    label TEXT,
    done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_runs (
    run_id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    entry_id TEXT NOT NULL UNIQUE REFERENCES product_entries(entry_id) ON DELETE RESTRICT,
    requested_selection_json TEXT NOT NULL,
    workspace_observation_json TEXT NOT NULL,
    package_generation TEXT,
    receipt_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_engine_bindings (
    binding_id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    run_id TEXT NOT NULL UNIQUE REFERENCES product_runs(run_id) ON DELETE CASCADE,
    engine_id TEXT NOT NULL,
    lineage_ref TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_resource_refs (
    resource_id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    run_id TEXT REFERENCES product_runs(run_id) ON DELETE CASCADE,
    resource_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_operation_receipts (
    receipt_id TEXT PRIMARY KEY,
    dispatch_id TEXT NOT NULL UNIQUE,
    run_id TEXT NOT NULL UNIQUE REFERENCES product_runs(run_id) ON DELETE CASCADE,
    receipt_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_runtime_activities (
    run_id TEXT NOT NULL REFERENCES product_runs(run_id) ON DELETE CASCADE,
    engine_sequence INTEGER NOT NULL CHECK (engine_sequence > 0),
    kind TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (run_id, engine_sequence)
  );

  CREATE TABLE IF NOT EXISTS product_runtime_recoveries (
    run_id TEXT NOT NULL REFERENCES product_runs(run_id) ON DELETE CASCADE,
    snapshot_version INTEGER NOT NULL CHECK (snapshot_version > 0),
    kind TEXT NOT NULL CHECK (kind = 'visible-result'),
    created_at TEXT NOT NULL,
    PRIMARY KEY (run_id, snapshot_version)
  );

  CREATE TABLE IF NOT EXISTS product_streaming_entries (
    entry_id TEXT PRIMARY KEY REFERENCES product_entries(entry_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS product_runtime_fact_cursors (
    run_id TEXT PRIMARY KEY REFERENCES product_runs(run_id) ON DELETE CASCADE,
    engine_sequence INTEGER NOT NULL CHECK (engine_sequence >= 0)
  );

  CREATE TABLE IF NOT EXISTS product_queue_items (
    queue_item_id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    requested_selection_json TEXT NOT NULL,
    resources_json TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    revision INTEGER NOT NULL CHECK (revision > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (conversation_id, position)
  );

  CREATE TABLE IF NOT EXISTS product_outbox (
    dispatch_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL UNIQUE REFERENCES product_runs(run_id) ON DELETE CASCADE,
    state TEXT NOT NULL CHECK (state IN ('pending', 'sending', 'terminal')),
    send_boundary TEXT NOT NULL CHECK (send_boundary IN ('pre-send', 'sent', 'accepted', 'observed')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    automatic_replay_count INTEGER NOT NULL DEFAULT 0 CHECK (automatic_replay_count = 0),
    engine_id TEXT NOT NULL,
    prepared_selection_json TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_submit_admissions (
    dispatch_id TEXT PRIMARY KEY REFERENCES product_outbox(dispatch_id) ON DELETE CASCADE,
    request_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_facts (
    global_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    fact_id TEXT NOT NULL UNIQUE,
    conversation_id TEXT REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    workspace_id TEXT REFERENCES product_workspaces(workspace_id) ON DELETE CASCADE,
    group_id TEXT REFERENCES product_groups(group_id) ON DELETE CASCADE,
    conversation_sequence INTEGER CHECK (conversation_sequence > 0),
    emitted_at TEXT NOT NULL,
    shell_change_json TEXT NOT NULL,
    detail_change_json TEXT,
    UNIQUE (conversation_id, conversation_sequence),
    CHECK (
      (conversation_id IS NOT NULL AND workspace_id IS NULL AND group_id IS NULL AND
       conversation_sequence IS NOT NULL AND detail_change_json IS NOT NULL) OR
      (conversation_id IS NULL AND workspace_id IS NOT NULL AND group_id IS NULL AND
       conversation_sequence IS NULL AND detail_change_json IS NULL) OR
      (conversation_id IS NULL AND workspace_id IS NULL AND group_id IS NOT NULL AND
       conversation_sequence IS NULL AND detail_change_json IS NULL) OR
      (conversation_id IS NULL AND workspace_id IS NULL AND group_id IS NULL AND
       conversation_sequence IS NULL AND detail_change_json IS NULL)
    )
  );

  CREATE TABLE IF NOT EXISTS product_mutations (
    mutation_id TEXT PRIMARY KEY,
    mutation_kind TEXT NOT NULL,
    request_json TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS product_entries_by_conversation
    ON product_entries(conversation_id, created_at, entry_id);
  CREATE INDEX IF NOT EXISTS product_runs_by_conversation
    ON product_runs(conversation_id, created_at, run_id);
  CREATE INDEX IF NOT EXISTS product_queue_by_conversation
    ON product_queue_items(conversation_id, position);
  CREATE UNIQUE INDEX IF NOT EXISTS product_groups_active_name
    ON product_groups(name COLLATE NOCASE) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS product_group_conversations_by_conversation
    ON product_group_conversations(conversation_id, group_id);
  CREATE INDEX IF NOT EXISTS product_facts_by_conversation
    ON product_facts(conversation_id, conversation_sequence);
`;

class ProductFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}

export class ProductControlPlaneError extends Schema.TaggedErrorClass<ProductControlPlaneError>()(
  "ProductControlPlaneError",
  {
    code: Schema.String,
    message: Schema.String,
    retryable: Schema.Boolean,
  },
) {}

const toControlPlaneError = (cause: unknown): ProductControlPlaneError => {
  if (cause instanceof ProductControlPlaneError) return cause;
  if (cause instanceof ProductFailure) {
    return new ProductControlPlaneError({
      code: cause.code,
      message: cause.message,
      retryable: cause.retryable,
    });
  }
  return new ProductControlPlaneError({
    code: "PRODUCT_STORE_FAILURE",
    message: cause instanceof Error ? cause.message : "Product Store operation failed.",
    retryable: false,
  });
};

const decode = <A, I>(schema: Schema.Codec<A, I>, value: unknown): A =>
  Schema.decodeUnknownSync(schema)(value);
const decodeJson = <A, I>(schema: Schema.Codec<A, I>, value: string): A =>
  Schema.decodeSync(Schema.fromJsonString(schema))(value);
const encodeJson = <A, I>(schema: Schema.Codec<A, I>, value: A): string =>
  Schema.encodeSync(Schema.fromJsonString(schema))(value);

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProductFailure("PRODUCT_STORE_DECODE", "Product Store row was not an object.");
  }
  return value as Record<string, unknown>;
};

const requiredString = (row: Record<string, unknown>, key: string): string => {
  const value = row[key];
  if (typeof value !== "string") {
    throw new ProductFailure("PRODUCT_STORE_DECODE", `Product Store column ${key} was invalid.`);
  }
  return value;
};

const requiredNumber = (row: Record<string, unknown>, key: string): number => {
  const value = row[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ProductFailure("PRODUCT_STORE_DECODE", `Product Store column ${key} was invalid.`);
  }
  return value;
};

const nullableString = (row: Record<string, unknown>, key: string): string | null => {
  const value = row[key];
  if (value !== null && typeof value !== "string") {
    throw new ProductFailure("PRODUCT_STORE_DECODE", `Product Store column ${key} was invalid.`);
  }
  return value;
};

const receiptOperationRef = (receipt: ProductDispatchReceipt): string | null => {
  if (receipt.state === "accepted") return receipt.operationRef;
  if (
    (receipt.state === "running" ||
      receipt.state === "settled" ||
      receipt.state === "outcome_unknown") &&
    receipt.evidence.kind === "accepted-operation"
  )
    return receipt.evidence.operationRef;
  return null;
};

const evidenceSendBoundary = (evidence: {
  readonly kind: "accepted-operation" | "observed-delivery";
}): "accepted" | "observed" => (evidence.kind === "accepted-operation" ? "accepted" : "observed");

export interface ProductExecutionBoundary {
  /**
   * The boundary guarantees that every subscribed update carries the concrete Engine source that
   * emitted it. Literal multi-Engine gateways set this after binding each child subscription.
   */
  readonly sourceEngineBoundFacts?: true;
  readonly prepare?: (input: {
    readonly dispatchId: ProductDispatchId;
    readonly conversationId: ProductConversationId;
    readonly runId: ProductRunId;
    readonly requestedSelection: ProductSelectedRuntime;
    readonly workspace: ProductWorkspace;
    readonly resources: ReadonlyArray<ProductResourceRef>;
    readonly text: string;
    readonly priorLineageRef: string | null;
  }) => Effect.Effect<ProductPreparedExecution, ProductControlPlaneError>;
  readonly attempt: (input: {
    readonly dispatchId: ProductDispatchId;
    readonly run: ProductRun;
    readonly text: string;
    readonly priorLineageRef: string | null;
    readonly prepared: ProductPreparedExecution | null;
    /** Must complete before any non-idempotent send crosses the process boundary. */
    readonly markSent: () => Effect.Effect<void, ProductControlPlaneError>;
  }) => Effect.Effect<ProductExecutionObservation, ProductControlPlaneError>;
  readonly subscribeFacts?: (
    listener: (
      runId: ProductRunId,
      observation:
        | ProductExecutionUpdate
        | {
            readonly kind: "delivery-accepted";
            readonly operationRef: string;
            readonly lineageRef: string;
            readonly resolvedSelection: Omit<ProductResolvedSelection, "executionTarget">;
          }
        | {
            readonly kind: "delivery-rejected";
            readonly code: string;
            readonly message: string;
            readonly retryable: boolean;
          },
      sourceEngineId?: string,
    ) => void,
  ) => () => void;
  readonly resumeFacts?: (runId: ProductRunId, operationRef: string) => void;
  readonly bindRunPackageGeneration?: (runId: ProductRunId, generation: string) => void;
  readonly afterObservationApplied?: (
    runId: ProductRunId,
    engineId: string,
    observation: ProductExecutionObservation,
  ) => void;
  readonly control?: (input: {
    readonly run: ProductRun;
    readonly operationRef: string | null;
    readonly control: ProductControlRunInput["control"];
    readonly text: string | null;
  }) => Effect.Effect<ProductControlRunResult, ProductControlPlaneError>;
  readonly close?: () => Promise<void>;
  readonly catalog?: () => Effect.Effect<ProductRuntimeCatalog | null, ProductControlPlaneError>;
}

export interface ProductPreparedExecution {
  readonly engineId: string;
  readonly resolvedSelection: ProductResolvedSelection | null;
  readonly close: () => Promise<void>;
}

/** Closed boundary used when no authenticated native execution client is attached. */
export const ProductExecutionUnavailable: ProductExecutionBoundary = {
  attempt: () =>
    Effect.succeed({
      kind: "rejected",
      code: "NATIVE_HOST_EXECUTION_UNSUPPORTED",
      message: "Execution is unavailable until the isolated Native Host supports this Engine.",
      retryable: false,
    }),
};

/** Closed test boundary. Its name and type prevent fixture observations from becoming runtime proof. */
export function makeProductExecutionFixture(
  attempts: ReadonlyArray<{
    readonly observation?: ProductExecutionObservation;
    readonly crossesSendBoundary: boolean;
    readonly failAfterBoundary?: boolean;
    readonly dieAfterBoundary?: boolean;
  }>,
): ProductExecutionBoundary & { readonly attemptCount: () => number } {
  let index = 0;
  return {
    attemptCount: () => index,
    attempt: ({ markSent }) => {
      const attempt = attempts[Math.min(index, attempts.length - 1)];
      index += 1;
      if (!attempt) {
        return Effect.fail(
          new ProductControlPlaneError({
            code: "PRODUCT_FIXTURE_EXHAUSTED",
            message: "The closed Product execution fixture has no remaining observation.",
            retryable: false,
          }),
        );
      }
      return Effect.gen(function* () {
        if (attempt.crossesSendBoundary) yield* markSent();
        if (attempt.dieAfterBoundary) {
          return yield* Effect.die("Closed fixture terminated after the persisted send boundary.");
        }
        if (attempt.failAfterBoundary) {
          return yield* Effect.fail(
            new ProductControlPlaneError({
              code: "PRODUCT_FIXTURE_CRASH",
              message: "Closed fixture crashed at the configured send boundary.",
              retryable: false,
            }),
          );
        }
        if (!attempt.observation) {
          return yield* Effect.fail(
            new ProductControlPlaneError({
              code: "PRODUCT_FIXTURE_INVALID",
              message: "Closed fixture omitted its typed observation.",
              retryable: false,
            }),
          );
        }
        return attempt.observation;
      });
    },
  };
}

export interface ProductOutboxDiagnostic {
  readonly dispatchId: string;
  readonly runId: string;
  readonly engineId: string;
  readonly state: "pending" | "sending" | "terminal";
  readonly sendBoundary: ProductSendBoundary;
  readonly attemptCount: number;
  readonly automaticReplayCount: 0;
}

type ProductSendBoundary = "pre-send" | "sent" | "accepted" | "observed";

export interface ProductControlPlaneShape {
  readonly createWorkspace: (
    input: ProductCreateWorkspaceInput,
  ) => Effect.Effect<ProductWorkspaceSummary, ProductControlPlaneError>;
  readonly updateWorkspaceTitle: (
    input: ProductUpdateWorkspaceTitleInput,
  ) => Effect.Effect<ProductWorkspaceSummary, ProductControlPlaneError>;
  readonly setWorkspacePinned: (
    input: ProductSetWorkspacePinnedInput,
  ) => Effect.Effect<ProductWorkspaceSummary, ProductControlPlaneError>;
  readonly updateWorkspaceRunCommand: (
    input: ProductUpdateWorkspaceRunCommandInput,
  ) => Effect.Effect<ProductWorkspaceSummary, ProductControlPlaneError>;
  readonly deleteWorkspace: (
    input: ProductDeleteWorkspaceInput,
  ) => Effect.Effect<ProductDeleteWorkspaceResult, ProductControlPlaneError>;
  readonly createGroup: (
    input: ProductCreateGroupInput,
  ) => Effect.Effect<ProductGroupSummary, ProductControlPlaneError>;
  readonly updateGroup: (
    input: ProductUpdateGroupInput,
  ) => Effect.Effect<ProductGroupSummary, ProductControlPlaneError>;
  readonly reorderGroups: (
    input: ProductReorderGroupsInput,
  ) => Effect.Effect<ReadonlyArray<ProductGroupSummary>, ProductControlPlaneError>;
  readonly deleteGroup: (
    input: ProductDeleteGroupInput,
  ) => Effect.Effect<ProductDeleteGroupResult, ProductControlPlaneError>;
  readonly setConversationGroups: (
    input: ProductSetConversationGroupsInput,
  ) => Effect.Effect<ProductGroupMembershipResult, ProductControlPlaneError>;
  readonly addConversationGroups: (
    input: ProductAddConversationGroupsInput,
  ) => Effect.Effect<ProductGroupMembershipResult, ProductControlPlaneError>;
  readonly hasConversation: (
    conversationId: ProductConversationId,
  ) => Effect.Effect<boolean, ProductControlPlaneError>;
  readonly createConversation: (
    input: ProductCreateConversationInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly updateConversationTitle: (
    input: ProductUpdateConversationTitleInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly archiveConversation: (
    input: ProductArchiveConversationInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly restoreConversation: (
    input: ProductRestoreConversationInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly deleteConversation: (
    input: ProductDeleteConversationInput,
  ) => Effect.Effect<ProductDeleteConversationResult, ProductControlPlaneError>;
  readonly setConversationPinned: (
    input: ProductSetConversationPinnedInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly updateConversationNotes: (
    input: ProductUpdateConversationNotesInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly setConversationBoardState: (
    input: ProductSetConversationBoardStateInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly addEntryPin: (
    input: ProductAddEntryPinInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly removeEntryPin: (
    input: ProductRemoveEntryPinInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly setEntryPinDone: (
    input: ProductSetEntryPinDoneInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly setEntryPinLabel: (
    input: ProductSetEntryPinLabelInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly addEntryMarker: (
    input: ProductAddEntryMarkerInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly removeEntryMarker: (
    input: ProductRemoveEntryMarkerInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly setEntryMarkerDone: (
    input: ProductSetEntryMarkerDoneInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly setEntryMarkerLabel: (
    input: ProductSetEntryMarkerLabelInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly getShellSnapshot: () => Effect.Effect<ProductShellSnapshot, ProductControlPlaneError>;
  readonly getConversationSnapshot: (
    input: ProductGetConversationInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly putQueueItem: (
    input: ProductPutQueueItemInput,
  ) => Effect.Effect<ProductQueueItem, ProductControlPlaneError>;
  readonly reorderQueue: (
    input: ProductReorderQueueInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly deleteQueueItem: (
    input: ProductDeleteQueueItemInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly admitQueueItem: (
    input: ProductSubmitQueueItemInput,
  ) => Effect.Effect<ProductConversationSnapshot, ProductControlPlaneError>;
  readonly submitQueueItem: (
    input: ProductSubmitQueueItemInput,
  ) => Effect.Effect<ProductSubmitResult, ProductControlPlaneError>;
  readonly retryDispatch: (
    input: ProductRetryDispatchInput,
  ) => Effect.Effect<ProductSubmitResult, ProductControlPlaneError>;
  readonly controlRun: (
    input: ProductControlRunInput,
  ) => Effect.Effect<ProductControlRunResult, ProductControlPlaneError>;
  readonly readFacts: (
    input: ProductReadFactsInput,
  ) => Effect.Effect<ProductFactBatch, ProductControlPlaneError>;
  readonly recoverDispatches: () => Effect.Effect<void, ProductControlPlaneError>;
  readonly dispatchPending: (
    dispatchId?: ProductDispatchId,
  ) => Effect.Effect<void, ProductControlPlaneError>;
  readonly observeRun: (
    runId: ProductRunId,
    observation: ProductRunObservation,
  ) => Effect.Effect<void, ProductControlPlaneError>;
  readonly inspectOutbox: () => Effect.Effect<
    ReadonlyArray<ProductOutboxDiagnostic>,
    ProductControlPlaneError
  >;
}

export class ProductControlPlane extends ServiceMap.Service<
  ProductControlPlane,
  ProductControlPlaneShape
>()("omnimind/product/ProductControlPlane") {}

function initializeSchema(database: PortableDatabase): void {
  database.exec(productSchemaSql);
  const workspaceColumns = database.prepare("PRAGMA table_info(product_workspaces)").all();
  const workspaceColumnNames = new Set(workspaceColumns.map((raw) => String(asRecord(raw).name)));
  for (const [name, definition] of [
    ["title", "title TEXT NOT NULL DEFAULT 'Workspace'"],
    ["revision", "revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0)"],
    [
      "visible_in_sidebar",
      "visible_in_sidebar INTEGER NOT NULL DEFAULT 1 CHECK (visible_in_sidebar IN (0, 1))",
    ],
    ["is_pinned", "is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1))"],
    ["run_command", "run_command TEXT"],
    ["archived_at", "archived_at TEXT"],
    ["deleted_at", "deleted_at TEXT"],
    ["created_at", "created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'"],
    ["updated_at", "updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'"],
  ] as const) {
    if (!workspaceColumnNames.has(name)) {
      database.exec(`ALTER TABLE product_workspaces ADD COLUMN ${definition}`);
    }
  }
  database.exec(
    `UPDATE product_workspaces
     SET created_at = observed_at
     WHERE created_at = '1970-01-01T00:00:00.000Z';
     UPDATE product_workspaces
     SET updated_at = observed_at
     WHERE updated_at = '1970-01-01T00:00:00.000Z';`,
  );

  const outboxColumns = new Set(
    database
      .prepare("PRAGMA table_info(product_outbox)")
      .all()
      .map((raw) => String(asRecord(raw).name)),
  );
  if (!outboxColumns.has("prepared_selection_json")) {
    database.exec("ALTER TABLE product_outbox ADD COLUMN prepared_selection_json TEXT");
  }

  const factColumns = database.prepare("PRAGMA table_info(product_facts)").all();
  const factGroupColumn = factColumns.find((raw) => String(asRecord(raw).name) === "group_id");
  const factTable = database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'product_facts'")
    .get();
  const factTableSql = factTable ? asRecord(factTable).sql : null;
  const supportsRuntimeFacts =
    typeof factTableSql === "string" &&
    factTableSql.includes("conversation_id IS NULL AND workspace_id IS NULL AND group_id IS NULL");
  if (!factGroupColumn || !supportsRuntimeFacts) {
    database.exec("PRAGMA foreign_keys = OFF");
    try {
      database.exec(`
        BEGIN IMMEDIATE;
        DROP TABLE product_facts;
        CREATE TABLE product_facts (
          global_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          fact_id TEXT NOT NULL UNIQUE,
          conversation_id TEXT REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
          workspace_id TEXT REFERENCES product_workspaces(workspace_id) ON DELETE CASCADE,
          group_id TEXT REFERENCES product_groups(group_id) ON DELETE CASCADE,
          conversation_sequence INTEGER CHECK (conversation_sequence > 0),
          emitted_at TEXT NOT NULL,
          shell_change_json TEXT NOT NULL,
          detail_change_json TEXT,
          UNIQUE (conversation_id, conversation_sequence),
          CHECK (
            (conversation_id IS NOT NULL AND workspace_id IS NULL AND group_id IS NULL AND
             conversation_sequence IS NOT NULL AND detail_change_json IS NOT NULL) OR
            (conversation_id IS NULL AND workspace_id IS NOT NULL AND group_id IS NULL AND
             conversation_sequence IS NULL AND detail_change_json IS NULL) OR
            (conversation_id IS NULL AND workspace_id IS NULL AND group_id IS NOT NULL AND
             conversation_sequence IS NULL AND detail_change_json IS NULL) OR
            (conversation_id IS NULL AND workspace_id IS NULL AND group_id IS NULL AND
             conversation_sequence IS NULL AND detail_change_json IS NULL)
          )
        );
        UPDATE product_conversations SET detail_sequence = 0;
        DELETE FROM sqlite_sequence WHERE name = 'product_facts';
        COMMIT;
      `);
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    } finally {
      database.exec("PRAGMA foreign_keys = ON");
    }
  }
  database.exec(
    `CREATE INDEX IF NOT EXISTS product_facts_by_conversation
       ON product_facts(conversation_id, conversation_sequence);
     CREATE INDEX IF NOT EXISTS product_facts_by_workspace
       ON product_facts(workspace_id, global_sequence);
     CREATE INDEX IF NOT EXISTS product_facts_by_group
       ON product_facts(group_id, global_sequence);`,
  );

  const conversationColumns = database.prepare("PRAGMA table_info(product_conversations)").all();
  const conversationColumnNames = new Set(
    conversationColumns.map((raw) => String(asRecord(raw).name)),
  );
  for (const [name, definition] of [
    ["revision", "revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0)"],
    ["archived_at", "archived_at TEXT"],
    ["is_pinned", "is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1))"],
    ["notes", "notes TEXT NOT NULL DEFAULT ''"],
    [
      "board_state",
      "board_state TEXT NOT NULL DEFAULT 'active' CHECK (board_state IN ('active', 'done'))",
    ],
    ["board_state_changed_at", "board_state_changed_at TEXT"],
    ["deleted_at", "deleted_at TEXT"],
  ] as const) {
    if (!conversationColumnNames.has(name)) {
      database.exec(`ALTER TABLE product_conversations ADD COLUMN ${definition}`);
    }
  }
  const versionRows = database
    .prepare("SELECT schema_version, migration_revision FROM product_meta")
    .all();
  if (versionRows.length === 0) {
    database
      .prepare("INSERT INTO product_meta(schema_version, migration_revision) VALUES (?, ?)")
      .run(PRODUCT_SCHEMA_VERSION, PRODUCT_MIGRATION_REVISION);
    return;
  }
  const version = requiredNumber(asRecord(versionRows[0]), "schema_version");
  if (
    version !== PRODUCT_SCHEMA_VERSION ||
    versionRows.length !== 1 ||
    asRecord(versionRows[0]).migration_revision !== PRODUCT_MIGRATION_REVISION
  ) {
    throw new ProductFailure(
      "PRODUCT_SCHEMA_UNSUPPORTED",
      `Product Store schema ${version} is unsupported; expected ${PRODUCT_SCHEMA_VERSION}.`,
    );
  }
}

const productPackageFatalCodes = new Set([
  "PI_PACKAGE_LIFECYCLE_UNAVAILABLE",
  "PI_PACKAGE_VALIDATION_FAILED",
  "PACKAGE_STAGE_CONFLICT",
  "PACKAGE_GENERATION_CONFLICT",
]);

export function isProductPackageFatalCode(code: string): boolean {
  return productPackageFatalCodes.has(code);
}

export type ProductPackageLifecycleReplay =
  | {
      readonly kind: "successful";
      readonly generation: string;
      readonly observedAt: string;
    }
  | {
      readonly kind: "fatal";
      readonly generation: string;
      readonly code: string;
      readonly observedAt: string;
    };

export interface ProductPackageLifecycleFacts {
  readonly activeLeaseCounts: Readonly<Record<string, number>>;
  readonly replay: ReadonlyArray<ProductPackageLifecycleReplay>;
}

/**
 * Derives Package lifecycle inputs from committed Product facts. The Product Store remains the
 * sole durable Run/lease authority; this projection does not create Package-owned Run state.
 */
export async function readProductPackageLifecycleFacts(
  filename: string,
): Promise<ProductPackageLifecycleFacts> {
  if (filename !== ":memory:") ensurePrivateFileSync(filename);
  const database = await openPortableDatabase(filename);
  try {
    initializeSchema(database);
    const activeLeaseCounts: Record<string, number> = {};
    const replay: ProductPackageLifecycleReplay[] = [];
    const rows = database
      .prepare(
        `SELECT r.run_id, r.package_generation, o.receipt_json, o.updated_at
         FROM product_runs r
         JOIN product_operation_receipts o ON o.run_id = r.run_id
         ORDER BY o.updated_at ASC, o.rowid ASC`,
      )
      .all();
    const packageFailedRuns = new Set(
      database
        .prepare(
          `SELECT DISTINCT a.run_id
           FROM product_runtime_activities a
           WHERE a.kind = 'package' AND json_extract(a.summary, '$.code') = 'package-failed'`,
        )
        .all()
        .map((raw) => requiredString(asRecord(raw), "run_id")),
    );
    for (const raw of rows) {
      const row = asRecord(raw);
      const runId = requiredString(row, "run_id");
      const generation = requiredString(row, "package_generation");
      const receipt = decodeJson(ProductDispatchReceipt, requiredString(row, "receipt_json"));
      if (
        receipt.state === "pending" ||
        receipt.state === "accepted" ||
        receipt.state === "running" ||
        receipt.state === "delivery_unknown" ||
        receipt.state === "outcome_unknown"
      ) {
        activeLeaseCounts[generation] = (activeLeaseCounts[generation] ?? 0) + 1;
      }
      const observedAt = requiredString(row, "updated_at");
      if (
        receipt.state === "settled" &&
        receipt.outcome === "succeeded" &&
        !packageFailedRuns.has(runId)
      ) {
        replay.push({ kind: "successful", generation, observedAt });
      } else if (receipt.state === "rejected" && isProductPackageFatalCode(receipt.code)) {
        replay.push({ kind: "fatal", generation, code: receipt.code, observedAt });
      }
    }
    for (const raw of database
      .prepare(
        `SELECT r.package_generation, a.summary, a.created_at, a.engine_sequence
         FROM product_runtime_activities a
         JOIN product_runs r ON r.run_id = a.run_id
         WHERE a.kind = 'package' AND json_extract(a.summary, '$.code') = 'package-failed'
         ORDER BY a.created_at ASC, a.engine_sequence ASC`,
      )
      .all()) {
      const row = asRecord(raw);
      const detail = decodeJson(ProductRuntimeActivityDetail, requiredString(row, "summary"));
      if (detail.code !== "package-failed") continue;
      replay.push({
        kind: "fatal",
        generation: requiredString(row, "package_generation"),
        code: "PI_PACKAGE_NATIVE_FAULT",
        observedAt: requiredString(row, "created_at"),
      });
    }
    replay.sort(
      (left, right) =>
        left.observedAt.localeCompare(right.observedAt) ||
        left.generation.localeCompare(right.generation) ||
        left.kind.localeCompare(right.kind),
    );
    return { activeLeaseCounts, replay };
  } finally {
    database.close();
  }
}

function makeControlPlane(
  database: PortableDatabase,
  executionBoundary: ProductExecutionBoundary,
  initialRuntimeCatalog: ProductRuntimeCatalog | null,
): ProductControlPlaneShape {
  let runtimeCatalog = initialRuntimeCatalog;
  const preparedExecutions = new Map<string, ProductPreparedExecution>();
  let lastRuntimeCatalogObservationAt = Number.NEGATIVE_INFINITY;
  const statement = (sql: string) => database.prepare(sql);
  const generatedId = () => randomUUID();
  const usesEngineSessionExecution = (run: ProductRun): boolean =>
    run.requestedSelection.runtimeChoice.kind === "engine-session-current";

  const withTransaction = <T>(operation: () => T): T => {
    database.exec("BEGIN IMMEDIATE");
    try {
      const value = operation();
      database.exec("COMMIT");
      return value;
    } catch (cause) {
      database.exec("ROLLBACK");
      throw cause;
    }
  };

  const readWorkspace = (workspaceId: string): ProductWorkspace => {
    const raw = statement(
      `SELECT workspace_id, access_json, observed_at FROM product_workspaces
       WHERE workspace_id = ? AND deleted_at IS NULL`,
    ).get(workspaceId);
    if (!raw) throw new ProductFailure("PRODUCT_WORKSPACE_NOT_FOUND", "Workspace was not found.");
    const row = asRecord(raw);
    return decode(ProductWorkspace, {
      id: requiredString(row, "workspace_id"),
      access: decodeJson(ProductWorkspaceAccess, requiredString(row, "access_json")),
      observedAt: requiredString(row, "observed_at"),
    });
  };

  const workspaceAccessMatches = (
    existing: ProductWorkspace["access"],
    requested: ProductWorkspace["access"],
  ): boolean => {
    const rootsEqual = (left: string | null, right: string | null): boolean =>
      (left === null && right === null) ||
      (left !== null &&
        right !== null &&
        workspaceRootsEqual(left, right, { platform: process.platform }));
    const existingTarget = existing.executionTarget;
    const requestedTarget = requested.executionTarget;
    return (
      existing.kind === requested.kind &&
      rootsEqual(existing.managedDirectory, requested.managedDirectory) &&
      rootsEqual(existing.primaryFolder, requested.primaryFolder) &&
      existing.writeAuthority === requested.writeAuthority &&
      ((existingTarget === null && requestedTarget === null) ||
        (existingTarget !== null &&
          requestedTarget !== null &&
          existingTarget.kind === requestedTarget.kind &&
          workspaceRootsEqual(existingTarget.targetRef, requestedTarget.targetRef, {
            platform: process.platform,
          })))
    );
  };

  const readWorkspaceSummary = (workspaceId: string): ProductWorkspaceSummary => {
    const raw = statement(
      `SELECT workspace_id, title, access_json, revision, visible_in_sidebar,
              is_pinned, run_command, archived_at, created_at, updated_at
       FROM product_workspaces WHERE workspace_id = ? AND deleted_at IS NULL`,
    ).get(workspaceId);
    if (!raw) throw new ProductFailure("PRODUCT_WORKSPACE_NOT_FOUND", "Workspace was not found.");
    const row = asRecord(raw);
    return decode(ProductWorkspaceSummary, {
      id: requiredString(row, "workspace_id"),
      title: requiredString(row, "title"),
      access: decodeJson(ProductWorkspaceAccess, requiredString(row, "access_json")),
      revision: requiredNumber(row, "revision"),
      visibleInSidebar: requiredNumber(row, "visible_in_sidebar") === 1,
      isPinned: requiredNumber(row, "is_pinned") === 1,
      runCommand: typeof row.run_command === "string" ? row.run_command : null,
      archivedAt: typeof row.archived_at === "string" ? row.archived_at : null,
      createdAt: requiredString(row, "created_at"),
      updatedAt: requiredString(row, "updated_at"),
    });
  };

  const readGroupSummary = (groupId: string): ProductGroupSummary => {
    const raw = statement(
      `SELECT group_id, name, color, sort_order, revision, created_at, updated_at
       FROM product_groups WHERE group_id = ? AND deleted_at IS NULL`,
    ).get(groupId);
    if (!raw) throw new ProductFailure("PRODUCT_GROUP_NOT_FOUND", "Group was not found.");
    const row = asRecord(raw);
    const conversationIds = statement(
      `SELECT gc.conversation_id
       FROM product_group_conversations gc
       JOIN product_conversations c ON c.conversation_id = gc.conversation_id
       WHERE gc.group_id = ? AND c.deleted_at IS NULL
       ORDER BY gc.created_at ASC, gc.conversation_id ASC`,
    )
      .all(groupId)
      .map((membership) => requiredString(asRecord(membership), "conversation_id"));
    return decode(ProductGroupSummary, {
      id: requiredString(row, "group_id"),
      name: requiredString(row, "name"),
      color: requiredString(row, "color"),
      sortOrder: requiredNumber(row, "sort_order"),
      revision: requiredNumber(row, "revision"),
      conversationIds,
      createdAt: requiredString(row, "created_at"),
      updatedAt: requiredString(row, "updated_at"),
    });
  };

  const readGroups = (): ReadonlyArray<ProductGroupSummary> =>
    statement(
      `SELECT group_id FROM product_groups
       WHERE deleted_at IS NULL ORDER BY sort_order ASC, group_id ASC`,
    )
      .all()
      .map((raw) => readGroupSummary(requiredString(asRecord(raw), "group_id")));

  const inferredWorkspaceTitle = (access: ProductWorkspaceAccess, fallback: string): string => {
    const root = access.primaryFolder ?? access.managedDirectory;
    return root?.split(/[/\\]/).findLast((segment) => segment.length > 0) ?? fallback;
  };

  const findWorkspaceByAccess = (
    access: ProductWorkspaceAccess,
  ): ProductWorkspaceSummary | null => {
    const ids = statement(
      `SELECT workspace_id FROM product_workspaces
       WHERE deleted_at IS NULL ORDER BY workspace_id ASC`,
    )
      .all()
      .map((raw) => requiredString(asRecord(raw), "workspace_id"));
    return (
      ids
        .map(readWorkspaceSummary)
        .find((workspace) => workspaceAccessMatches(workspace.access, access)) ?? null
    );
  };

  const assertResourceAuthority = (
    workspace: ProductWorkspace,
    resources: ReadonlyArray<ProductResourceRef>,
  ): void => {
    if (
      workspace.access.kind === "chat" &&
      resources.some((resource) => resource.access !== "read-only")
    ) {
      throw new ProductFailure(
        "PRODUCT_CHAT_RESOURCE_WRITE_FORBIDDEN",
        "Chat accepts only read-only file and folder references.",
      );
    }
  };

  const validateCatalogSelection = (selection: ProductRequestedSelection): void => {
    if (selection.state === "unavailable") {
      return;
    }
    if (!runtimeCatalog) {
      throw new ProductFailure(
        "PRODUCT_RUNTIME_CATALOG_UNAVAILABLE",
        "The Native Host runtime catalog is unavailable.",
        true,
      );
    }
    const engine = runtimeCatalog.engines.find(
      (candidate) => candidate.engineId === selection.engineId,
    );
    if (!engine || engine.availability.state !== "available") {
      throw new ProductFailure(
        "PRODUCT_RUNTIME_SELECTION_STALE",
        "The requested Engine is no longer available.",
        true,
      );
    }
    if (
      selection.packageGeneration !==
      (selection.engineId === runtimeCatalog.defaultEngineId
        ? runtimeCatalog.packageGeneration
        : null)
    ) {
      throw new ProductFailure(
        "PRODUCT_RUNTIME_SELECTION_STALE",
        "The requested Package generation is no longer current.",
        true,
      );
    }
    const runtimeChoice = selection.runtimeChoice;
    if (runtimeChoice.kind === "engine-session-current") return;
    if (engine.modelSelection.kind !== "product-model") {
      throw new ProductFailure(
        "PRODUCT_RUNTIME_MODEL_UNKNOWN",
        "The selected Engine does not expose Product model selection.",
        true,
      );
    }
    const model = engine.modelSelection.models.find(
      (candidate) => candidate.id === runtimeChoice.runtimeModelId,
    );
    if (!model) {
      throw new ProductFailure(
        "PRODUCT_RUNTIME_MODEL_UNKNOWN",
        "The requested runtime Model is not present in the current Native Host catalog.",
        true,
      );
    }
    if (!model.available || model.auth !== "configured") {
      throw new ProductFailure(
        model.auth === "missing"
          ? "PRODUCT_RUNTIME_AUTH_MISSING"
          : "PRODUCT_RUNTIME_MODEL_UNAVAILABLE",
        model.auth === "missing"
          ? "The selected runtime Model requires authentication."
          : "The selected runtime Model is currently unavailable.",
        true,
      );
    }
    if (
      runtimeChoice.thinking !== null &&
      !model.thinkingLevels.includes(
        runtimeChoice.thinking as (typeof model.thinkingLevels)[number],
      )
    ) {
      throw new ProductFailure(
        "PRODUCT_RUNTIME_THINKING_UNSUPPORTED",
        "The selected runtime Model does not support the requested Thinking level.",
        true,
      );
    }
  };

  const assertDispatchableSelection: (
    selection: ProductRequestedSelection,
  ) => asserts selection is ProductSelectedRuntime = (selection) => {
    validateCatalogSelection(selection);
    if (selection.state === "unavailable") {
      throw new ProductFailure(
        "PRODUCT_RUNTIME_SELECTION_UNAVAILABLE",
        "The queued Product intent has no dispatchable Native Host selection.",
        true,
      );
    }
  };

  const readReceiptByRun = (runId: string): ProductOperationReceipt => {
    const raw = statement(
      `SELECT receipt_id, dispatch_id, run_id, receipt_json, updated_at
       FROM product_operation_receipts WHERE run_id = ?`,
    ).get(runId);
    if (!raw) throw new ProductFailure("PRODUCT_RECEIPT_NOT_FOUND", "Run receipt was not found.");
    const row = asRecord(raw);
    return decode(ProductOperationReceipt, {
      id: requiredString(row, "receipt_id"),
      dispatchId: requiredString(row, "dispatch_id"),
      runId: requiredString(row, "run_id"),
      receipt: decodeJson(ProductDispatchReceipt, requiredString(row, "receipt_json")),
      updatedAt: requiredString(row, "updated_at"),
    });
  };

  const readResourcesByRun = (runId: string): ReadonlyArray<ProductResourceRef> =>
    statement(
      `SELECT resource_json FROM product_resource_refs
       WHERE run_id = ? ORDER BY resource_id ASC`,
    )
      .all(runId)
      .map((raw) => {
        const row = asRecord(raw);
        return decodeJson(ProductResourceRef, requiredString(row, "resource_json"));
      });

  const readRun = (runId: string): ProductRun => {
    const raw = statement(
      `SELECT run_id, conversation_id, entry_id, requested_selection_json,
              workspace_observation_json, package_generation, created_at, updated_at
       FROM product_runs WHERE run_id = ?`,
    ).get(runId);
    if (!raw) throw new ProductFailure("PRODUCT_RUN_NOT_FOUND", "Run was not found.");
    const row = asRecord(raw);
    return decode(ProductRun, {
      id: requiredString(row, "run_id"),
      conversationId: requiredString(row, "conversation_id"),
      entryId: requiredString(row, "entry_id"),
      requestedSelection: decodeJson(
        ProductSelectedRuntime,
        requiredString(row, "requested_selection_json"),
      ),
      workspaceObservation: decodeJson(
        ProductWorkspace,
        requiredString(row, "workspace_observation_json"),
      ),
      resources: readResourcesByRun(runId),
      packageGeneration: nullableString(row, "package_generation"),
      receipt: readReceiptByRun(runId),
      createdAt: requiredString(row, "created_at"),
      updatedAt: requiredString(row, "updated_at"),
    });
  };

  const compatiblePriorLineageRef = (
    conversationId: ProductConversationId,
    engineId: string,
  ): string | null => {
    const binding = statement(
      `SELECT b.lineage_ref, r.rowid AS run_rowid
       FROM product_engine_bindings b
       JOIN product_runs r ON r.run_id = b.run_id
       WHERE b.conversation_id = ? AND b.engine_id = ?
       ORDER BY r.rowid DESC LIMIT 1`,
    ).get(conversationId, engineId);
    if (!binding) return null;
    const row = asRecord(binding);
    const diverged = statement(
      `SELECT 1 FROM product_runs
       WHERE conversation_id = ? AND rowid > ?
         AND json_extract(requested_selection_json, '$.engineId') <> ?
       LIMIT 1`,
    ).get(conversationId, requiredNumber(row, "run_rowid"), engineId);
    return diverged ? null : requiredString(row, "lineage_ref");
  };

  const readQueue = (conversationId: string): ReadonlyArray<ProductQueueItem> =>
    statement(
      `SELECT queue_item_id, conversation_id, body, requested_selection_json, resources_json,
              position, revision, created_at, updated_at
       FROM product_queue_items WHERE conversation_id = ?
       ORDER BY position ASC, queue_item_id ASC`,
    )
      .all(conversationId)
      .map((raw) => {
        const row = asRecord(raw);
        return decode(ProductQueueItem, {
          id: requiredString(row, "queue_item_id"),
          conversationId: requiredString(row, "conversation_id"),
          text: requiredString(row, "body"),
          requestedSelection: decodeJson(
            ProductRequestedSelection,
            requiredString(row, "requested_selection_json"),
          ),
          resources: decodeJson(
            Schema.Array(ProductResourceRef),
            requiredString(row, "resources_json"),
          ),
          position: requiredNumber(row, "position"),
          revision: requiredNumber(row, "revision"),
          createdAt: requiredString(row, "created_at"),
          updatedAt: requiredString(row, "updated_at"),
        });
      });

  const readEntryPins = (conversationId: string): ReadonlyArray<ProductEntryPin> =>
    statement(
      `SELECT entry_id, label, done, pinned_at FROM product_entry_pins
       WHERE conversation_id = ? ORDER BY pinned_at ASC, entry_id ASC`,
    )
      .all(conversationId)
      .map((raw) => {
        const row = asRecord(raw);
        return decode(ProductEntryPin, {
          entryId: requiredString(row, "entry_id"),
          label: typeof row.label === "string" ? row.label : null,
          done: requiredNumber(row, "done") === 1,
          pinnedAt: requiredString(row, "pinned_at"),
        });
      });

  const readEntryMarkers = (conversationId: string): ReadonlyArray<ProductEntryMarker> =>
    statement(
      `SELECT marker_id, entry_id, start_offset, end_offset, selected_text,
              selected_text_digest, style, color, label, done, created_at, updated_at
       FROM product_entry_markers WHERE conversation_id = ?
       ORDER BY created_at ASC, marker_id ASC`,
    )
      .all(conversationId)
      .map((raw) => {
        const row = asRecord(raw);
        return decode(ProductEntryMarker, {
          id: requiredString(row, "marker_id"),
          entryId: requiredString(row, "entry_id"),
          startOffset: requiredNumber(row, "start_offset"),
          endOffset: requiredNumber(row, "end_offset"),
          selectedText: requiredString(row, "selected_text"),
          selectedTextDigest: requiredString(row, "selected_text_digest"),
          style: requiredString(row, "style"),
          color: requiredString(row, "color"),
          label: typeof row.label === "string" ? row.label : null,
          done: requiredNumber(row, "done") === 1,
          createdAt: requiredString(row, "created_at"),
          updatedAt: requiredString(row, "updated_at"),
        });
      });

  const readSummary = (conversationId: string): ProductConversationSummary => {
    const raw = statement(
      `SELECT c.conversation_id, c.workspace_id, c.title, c.revision,
              c.archived_at, c.is_pinned, c.notes, c.board_state,
              c.board_state_changed_at, w.access_json,
              c.created_at, c.updated_at,
              latest_run.run_id AS latest_run_id,
              latest_receipt.receipt_json AS latest_receipt_json
       FROM product_conversations c
       JOIN product_workspaces w ON w.workspace_id = c.workspace_id
       LEFT JOIN product_runs latest_run ON latest_run.run_id = (
         SELECT pr.run_id FROM product_runs pr
         WHERE pr.conversation_id = c.conversation_id
         ORDER BY pr.created_at DESC, pr.run_id DESC LIMIT 1
       )
       LEFT JOIN product_operation_receipts latest_receipt
         ON latest_receipt.run_id = latest_run.run_id
       WHERE c.conversation_id = ? AND c.deleted_at IS NULL`,
    ).get(conversationId);
    if (!raw) {
      throw new ProductFailure("PRODUCT_CONVERSATION_NOT_FOUND", "Conversation was not found.");
    }
    const row = asRecord(raw);
    const access = decodeJson(ProductWorkspaceAccess, requiredString(row, "access_json"));
    const latestReceiptJson = row.latest_receipt_json;
    const receiptState =
      typeof latestReceiptJson === "string"
        ? decodeJson(ProductDispatchReceipt, latestReceiptJson).state
        : null;
    return decode(ProductConversationSummary, {
      id: requiredString(row, "conversation_id"),
      workspaceId: requiredString(row, "workspace_id"),
      title: requiredString(row, "title"),
      workspaceKind: access.kind,
      revision: requiredNumber(row, "revision"),
      archivedAt: typeof row.archived_at === "string" ? row.archived_at : null,
      isPinned: requiredNumber(row, "is_pinned") === 1,
      notes: requiredString(row, "notes"),
      boardState: requiredString(row, "board_state"),
      boardStateChangedAt:
        typeof row.board_state_changed_at === "string" ? row.board_state_changed_at : null,
      latestRunId: typeof row.latest_run_id === "string" ? row.latest_run_id : null,
      receiptState,
      createdAt: requiredString(row, "created_at"),
      updatedAt: requiredString(row, "updated_at"),
    });
  };

  const readConversation = (conversationId: string): ProductConversationReadModel => {
    const summary = readSummary(conversationId);
    const entries = statement(
      `SELECT entry_id, conversation_id, run_id, role, body, created_at
       FROM product_entries WHERE conversation_id = ?
       ORDER BY created_at ASC, entry_id ASC`,
    )
      .all(conversationId)
      .map((raw) => {
        const row = asRecord(raw);
        return decode(ProductEntry, {
          id: requiredString(row, "entry_id"),
          conversationId: requiredString(row, "conversation_id"),
          runId: typeof row.run_id === "string" ? row.run_id : null,
          role: requiredString(row, "role"),
          text: requiredString(row, "body"),
          createdAt: requiredString(row, "created_at"),
        });
      });
    const runIds = statement(
      `SELECT run_id FROM product_runs WHERE conversation_id = ?
       ORDER BY created_at ASC, run_id ASC`,
    )
      .all(conversationId)
      .map((raw) => requiredString(asRecord(raw), "run_id"));
    const activities = statement(
      `SELECT a.run_id, a.engine_sequence, a.kind, a.summary AS detail_json, a.created_at
       FROM product_runtime_activities a
       JOIN product_runs r ON r.run_id = a.run_id
       WHERE r.conversation_id = ?
       ORDER BY a.created_at ASC, a.run_id ASC, a.engine_sequence ASC`,
    )
      .all(conversationId)
      .map((raw) => {
        const row = asRecord(raw);
        return decode(ProductRuntimeActivity, {
          runId: requiredString(row, "run_id"),
          engineSequence: requiredNumber(row, "engine_sequence"),
          kind: requiredString(row, "kind"),
          detail: decodeJson(ProductRuntimeActivityDetail, requiredString(row, "detail_json")),
          createdAt: requiredString(row, "created_at"),
        });
      });
    const recoveries = statement(
      `SELECT rr.run_id, rr.snapshot_version, rr.kind, rr.created_at
       FROM product_runtime_recoveries rr
       JOIN product_runs r ON r.run_id = rr.run_id
       WHERE r.conversation_id = ?
       ORDER BY rr.created_at ASC, rr.run_id ASC, rr.snapshot_version ASC`,
    )
      .all(conversationId)
      .map((raw) => {
        const row = asRecord(raw);
        return decode(ProductRuntimeRecovery, {
          runId: requiredString(row, "run_id"),
          snapshotVersion: requiredNumber(row, "snapshot_version"),
          kind: requiredString(row, "kind"),
          createdAt: requiredString(row, "created_at"),
        });
      });
    return decode(ProductConversationReadModel, {
      conversation: summary,
      workspace: readWorkspace(summary.workspaceId),
      entries,
      streamingEntryIds: statement(
        `SELECT s.entry_id FROM product_streaming_entries s
         JOIN product_entries e ON e.entry_id = s.entry_id
         WHERE e.conversation_id = ? ORDER BY s.entry_id ASC`,
      )
        .all(conversationId)
        .map((raw) => requiredString(asRecord(raw), "entry_id")),
      runs: runIds.map(readRun),
      activities,
      recoveries,
      queue: readQueue(conversationId),
      entryPins: readEntryPins(conversationId),
      entryMarkers: readEntryMarkers(conversationId),
    });
  };

  const detailSequence = (conversationId: string): number => {
    const raw = statement(
      "SELECT detail_sequence FROM product_conversations WHERE conversation_id = ?",
    ).get(conversationId);
    if (!raw) {
      throw new ProductFailure("PRODUCT_CONVERSATION_NOT_FOUND", "Conversation was not found.");
    }
    return requiredNumber(asRecord(raw), "detail_sequence");
  };

  const snapshot = (conversationId: string): ProductConversationSnapshot =>
    decode(ProductConversationSnapshot, {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      sequence: detailSequence(conversationId),
      readModel: readConversation(conversationId),
    });

  const appendFact = (conversationId: string, change: ProductDetailFactChange): void => {
    const updated = statement(
      `UPDATE product_conversations
       SET detail_sequence = detail_sequence + 1, updated_at = ?
       WHERE conversation_id = ? RETURNING detail_sequence`,
    ).get(productIsoNow(), conversationId);
    if (!updated) {
      throw new ProductFailure("PRODUCT_CONVERSATION_NOT_FOUND", "Conversation was not found.");
    }
    const sequence = requiredNumber(asRecord(updated), "detail_sequence");
    const shellChange: ProductShellFactChange =
      change.kind === "conversation-tombstone"
        ? { kind: "conversation-tombstone", conversationId: change.conversationId }
        : { kind: "conversation-summary", conversation: readSummary(conversationId) };
    const detailChange: ProductDetailFactChange =
      change.kind === "conversation-updated"
        ? { kind: "conversation-updated", conversation: readSummary(conversationId) }
        : change;
    statement(
      `INSERT INTO product_facts(
         fact_id, conversation_id, conversation_sequence, emitted_at,
         shell_change_json, detail_change_json
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      generatedId(),
      conversationId,
      sequence,
      productIsoNow(),
      encodeJson(ProductShellFactChange, shellChange),
      encodeJson(ProductDetailFactChange, detailChange),
    );
  };

  const appendWorkspaceShellFact = (
    workspaceId: string,
    change: ProductShellFactChange,
  ): number => {
    statement(
      `INSERT INTO product_facts(
         fact_id, conversation_id, workspace_id, conversation_sequence,
         emitted_at, shell_change_json, detail_change_json
       ) VALUES (?, NULL, ?, NULL, ?, ?, NULL)`,
    ).run(generatedId(), workspaceId, productIsoNow(), encodeJson(ProductShellFactChange, change));
    const highWater = statement(
      "SELECT COALESCE(MAX(global_sequence), 0) AS sequence FROM product_facts",
    ).get();
    return highWater ? requiredNumber(asRecord(highWater), "sequence") : 0;
  };

  const appendWorkspaceFact = (workspaceId: string): number =>
    appendWorkspaceShellFact(workspaceId, {
      kind: "workspace-summary",
      workspace: readWorkspaceSummary(workspaceId),
    });

  const appendGroupShellFact = (groupId: string, change: ProductShellFactChange): number => {
    statement(
      `INSERT INTO product_facts(
         fact_id, conversation_id, workspace_id, group_id, conversation_sequence,
         emitted_at, shell_change_json, detail_change_json
       ) VALUES (?, NULL, NULL, ?, NULL, ?, ?, NULL)`,
    ).run(generatedId(), groupId, productIsoNow(), encodeJson(ProductShellFactChange, change));
    const highWater = statement(
      "SELECT COALESCE(MAX(global_sequence), 0) AS sequence FROM product_facts",
    ).get();
    return highWater ? requiredNumber(asRecord(highWater), "sequence") : 0;
  };

  const appendGroupFact = (groupId: string): number =>
    appendGroupShellFact(groupId, {
      kind: "group-summary",
      group: readGroupSummary(groupId),
    });

  const appendRuntimeCatalogFact = (catalog: ProductRuntimeCatalog | null): number => {
    statement(
      `INSERT INTO product_facts(
         fact_id, conversation_id, workspace_id, group_id, conversation_sequence,
         emitted_at, shell_change_json, detail_change_json
       ) VALUES (?, NULL, NULL, NULL, NULL, ?, ?, NULL)`,
    ).run(
      generatedId(),
      productIsoNow(),
      encodeJson(ProductShellFactChange, { kind: "runtime-catalog", catalog }),
    );
    const highWater = statement(
      "SELECT COALESCE(MAX(global_sequence), 0) AS sequence FROM product_facts",
    ).get();
    return highWater ? requiredNumber(asRecord(highWater), "sequence") : 0;
  };

  const observeRuntimeCatalog = (): Effect.Effect<void, ProductControlPlaneError> => {
    if (!executionBoundary.catalog) return Effect.void;
    const observedAt = Date.now();
    if (observedAt - lastRuntimeCatalogObservationAt < RUNTIME_CATALOG_OBSERVATION_INTERVAL_MS) {
      return Effect.void;
    }
    lastRuntimeCatalogObservationAt = observedAt;
    return executionBoundary.catalog().pipe(
      Effect.catch(() => Effect.succeed(null)),
      Effect.flatMap((observed) =>
        effect(() => {
          const catalogSchema = Schema.NullOr(ProductRuntimeCatalog);
          if (encodeJson(catalogSchema, runtimeCatalog) === encodeJson(catalogSchema, observed)) {
            return;
          }
          withTransaction(() => {
            runtimeCatalog = observed;
            appendRuntimeCatalogFact(observed);
          });
        }),
      ),
    );
  };

  const updateReceipt = (
    runId: string,
    receipt: ProductDispatchReceipt,
    outboxState: "pending" | "sending" | "terminal",
    sendBoundary: ProductSendBoundary,
  ): void => {
    const updatedAt = productIsoNow();
    statement(
      `UPDATE product_operation_receipts SET receipt_json = ?, updated_at = ? WHERE run_id = ?`,
    ).run(encodeJson(ProductDispatchReceipt, receipt), updatedAt, runId);
    statement(`UPDATE product_runs SET updated_at = ? WHERE run_id = ?`).run(updatedAt, runId);
    statement(
      `UPDATE product_outbox SET state = ?, send_boundary = ?, updated_at = ? WHERE run_id = ?`,
    ).run(outboxState, sendBoundary, updatedAt, runId);
    const run = readRun(runId);
    appendFact(run.conversationId, {
      kind: "dispatch-changed",
      conversationId: run.conversationId,
      runId: run.id,
      receipt: run.receipt,
    });
  };

  const effect = <A>(operation: () => A): Effect.Effect<A, ProductControlPlaneError> =>
    Effect.try({ try: operation, catch: toControlPlaneError });

  const readRecordedMutation = (
    mutationId: string,
    mutationKind: string,
    requestJson: string,
  ): string | undefined => {
    const recorded = statement(
      `SELECT mutation_kind, request_json, response_json
       FROM product_mutations WHERE mutation_id = ?`,
    ).get(mutationId);
    if (!recorded) return undefined;
    const row = asRecord(recorded);
    if (
      requiredString(row, "mutation_kind") !== mutationKind ||
      requiredString(row, "request_json") !== requestJson
    ) {
      throw new ProductFailure(
        "PRODUCT_MUTATION_ID_CONFLICT",
        "The Product mutation identity is already bound to different input.",
      );
    }
    return requiredString(row, "response_json");
  };

  const recordMutation = (input: {
    mutationId: string;
    mutationKind: string;
    requestJson: string;
    responseJson: string;
  }): void => {
    statement(
      `INSERT INTO product_mutations(
         mutation_id, mutation_kind, request_json, response_json, created_at
       ) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      input.mutationId,
      input.mutationKind,
      input.requestJson,
      input.responseJson,
      productIsoNow(),
    );
  };

  const conversationMutationFailure = (
    conversationId: string,
    expectedRevision: number,
    stateFailure?: { readonly code: string; readonly message: string },
  ): never => {
    const current = statement(
      `SELECT revision, archived_at, deleted_at
       FROM product_conversations WHERE conversation_id = ?`,
    ).get(conversationId);
    if (!current || typeof asRecord(current).deleted_at === "string") {
      throw new ProductFailure("PRODUCT_CONVERSATION_NOT_FOUND", "Conversation was not found.");
    }
    if (requiredNumber(asRecord(current), "revision") !== expectedRevision) {
      throw new ProductFailure(
        "PRODUCT_CONVERSATION_REVISION_CONFLICT",
        "The Conversation changed before the mutation was applied.",
        true,
      );
    }
    if (stateFailure) throw new ProductFailure(stateFailure.code, stateFailure.message);
    throw new ProductFailure("PRODUCT_CONVERSATION_MUTATION_REJECTED", "Mutation was rejected.");
  };

  const workspaceMutationFailure = (
    workspaceId: string,
    expectedRevision: number,
    stateFailure?: { readonly code: string; readonly message: string },
  ): never => {
    const current = statement(
      `SELECT revision, deleted_at FROM product_workspaces WHERE workspace_id = ?`,
    ).get(workspaceId);
    if (!current || typeof asRecord(current).deleted_at === "string") {
      throw new ProductFailure("PRODUCT_WORKSPACE_NOT_FOUND", "Workspace was not found.");
    }
    if (requiredNumber(asRecord(current), "revision") !== expectedRevision) {
      throw new ProductFailure(
        "PRODUCT_WORKSPACE_REVISION_CONFLICT",
        "The Workspace changed before the mutation was applied.",
        true,
      );
    }
    if (stateFailure) throw new ProductFailure(stateFailure.code, stateFailure.message);
    throw new ProductFailure("PRODUCT_WORKSPACE_MUTATION_REJECTED", "Mutation was rejected.");
  };

  const groupMutationFailure = (groupId: string, expectedRevision: number): never => {
    const current = statement(
      "SELECT revision, deleted_at FROM product_groups WHERE group_id = ?",
    ).get(groupId);
    if (!current || typeof asRecord(current).deleted_at === "string") {
      throw new ProductFailure("PRODUCT_GROUP_NOT_FOUND", "Group was not found.");
    }
    if (requiredNumber(asRecord(current), "revision") !== expectedRevision) {
      throw new ProductFailure(
        "PRODUCT_GROUP_REVISION_CONFLICT",
        "The Group changed before the mutation was applied.",
        true,
      );
    }
    throw new ProductFailure("PRODUCT_GROUP_MUTATION_REJECTED", "Group mutation was rejected.");
  };

  const currentMemberships = (conversationId: string): ReadonlyArray<string> =>
    statement(
      `SELECT gc.group_id FROM product_group_conversations gc
       JOIN product_groups g ON g.group_id = gc.group_id
       WHERE gc.conversation_id = ? AND g.deleted_at IS NULL
       ORDER BY gc.group_id ASC`,
    )
      .all(conversationId)
      .map((raw) => requiredString(asRecord(raw), "group_id"));

  const sameStrings = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean =>
    left.length === right.length && left.every((value, index) => value === right[index]);

  const uniqueSorted = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
    [...new Set(values)].sort((left, right) => left.localeCompare(right));

  const createWorkspace: ProductControlPlaneShape["createWorkspace"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const existing = statement(
          "SELECT workspace_id FROM product_workspaces WHERE workspace_id = ? AND deleted_at IS NULL",
        ).get(input.workspaceId);
        if (existing) {
          const current = readWorkspaceSummary(input.workspaceId);
          if (
            current.title !== input.title ||
            current.visibleInSidebar !== input.visibleInSidebar ||
            !workspaceAccessMatches(current.access, input.access)
          ) {
            throw new ProductFailure(
              "PRODUCT_WORKSPACE_ID_CONFLICT",
              "Workspace identity is already bound to different metadata, access or canonical root.",
            );
          }
          return current;
        }
        const tombstone = statement(
          "SELECT workspace_id FROM product_workspaces WHERE workspace_id = ?",
        ).get(input.workspaceId);
        if (tombstone) {
          throw new ProductFailure(
            "PRODUCT_WORKSPACE_ID_CONFLICT",
            "Workspace identity is already bound to a deleted Workspace.",
          );
        }
        const rootOwner = findWorkspaceByAccess(input.access);
        if (rootOwner) {
          if (rootOwner.visibleInSidebar === input.visibleInSidebar) return rootOwner;
          throw new ProductFailure(
            "PRODUCT_WORKSPACE_ROOT_OWNED",
            "The canonical root is already owned by a Workspace with different visibility.",
          );
        }
        const timestamp = productIsoNow();
        statement(
          `INSERT INTO product_workspaces(
             workspace_id, title, access_json, observed_at, revision,
             visible_in_sidebar, is_pinned, run_command, archived_at,
             deleted_at, created_at, updated_at
           ) VALUES (?, ?, ?, ?, 1, ?, 0, NULL, NULL, NULL, ?, ?)`,
        ).run(
          input.workspaceId,
          input.title,
          encodeJson(ProductWorkspaceAccess, input.access),
          timestamp,
          input.visibleInSidebar ? 1 : 0,
          timestamp,
          timestamp,
        );
        appendWorkspaceFact(input.workspaceId);
        return readWorkspaceSummary(input.workspaceId);
      }),
    );

  const updateWorkspaceTitle: ProductControlPlaneShape["updateWorkspaceTitle"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "workspace-title-update";
        const requestJson = encodeJson(ProductUpdateWorkspaceTitleInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return readWorkspaceSummary(input.workspaceId);
        }
        const updated = statement(
          `UPDATE product_workspaces
           SET title = ?, revision = revision + 1, updated_at = ?
           WHERE workspace_id = ? AND revision = ? AND deleted_at IS NULL
           RETURNING workspace_id`,
        ).get(input.title, productIsoNow(), input.workspaceId, input.expectedRevision);
        if (!updated) workspaceMutationFailure(input.workspaceId, input.expectedRevision);
        appendWorkspaceFact(input.workspaceId);
        const result = readWorkspaceSummary(input.workspaceId);
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductWorkspaceSummary, result),
        });
        return result;
      }),
    );

  const setWorkspacePinned: ProductControlPlaneShape["setWorkspacePinned"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "workspace-pinned-set";
        const requestJson = encodeJson(ProductSetWorkspacePinnedInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return readWorkspaceSummary(input.workspaceId);
        }
        const updated = statement(
          `UPDATE product_workspaces
           SET is_pinned = ?, revision = revision + 1, updated_at = ?
           WHERE workspace_id = ? AND revision = ? AND deleted_at IS NULL
           RETURNING workspace_id`,
        ).get(input.isPinned ? 1 : 0, productIsoNow(), input.workspaceId, input.expectedRevision);
        if (!updated) workspaceMutationFailure(input.workspaceId, input.expectedRevision);
        appendWorkspaceFact(input.workspaceId);
        const result = readWorkspaceSummary(input.workspaceId);
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductWorkspaceSummary, result),
        });
        return result;
      }),
    );

  const updateWorkspaceRunCommand: ProductControlPlaneShape["updateWorkspaceRunCommand"] = (
    input,
  ) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "workspace-run-command-update";
        const requestJson = encodeJson(ProductUpdateWorkspaceRunCommandInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return readWorkspaceSummary(input.workspaceId);
        }
        const updated = statement(
          `UPDATE product_workspaces
           SET run_command = ?, revision = revision + 1, updated_at = ?
           WHERE workspace_id = ? AND revision = ? AND deleted_at IS NULL
           RETURNING workspace_id`,
        ).get(input.runCommand, productIsoNow(), input.workspaceId, input.expectedRevision);
        if (!updated) workspaceMutationFailure(input.workspaceId, input.expectedRevision);
        appendWorkspaceFact(input.workspaceId);
        const result = readWorkspaceSummary(input.workspaceId);
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductWorkspaceSummary, result),
        });
        return result;
      }),
    );

  const deleteWorkspace: ProductControlPlaneShape["deleteWorkspace"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "workspace-delete";
        const requestJson = encodeJson(ProductDeleteWorkspaceInput, input);
        const recorded = readRecordedMutation(input.mutationId, mutationKind, requestJson);
        if (recorded !== undefined) return decodeJson(ProductDeleteWorkspaceResult, recorded);
        const activeConversationCount = statement(
          `SELECT COUNT(*) AS count FROM product_conversations
           WHERE workspace_id = ? AND deleted_at IS NULL`,
        ).get(input.workspaceId);
        if (
          activeConversationCount &&
          requiredNumber(asRecord(activeConversationCount), "count") > 0
        ) {
          workspaceMutationFailure(input.workspaceId, input.expectedRevision, {
            code: "PRODUCT_WORKSPACE_NOT_EMPTY",
            message: "Workspace cannot be deleted while it contains Conversations.",
          });
        }
        const deletedAt = productIsoNow();
        const updated = statement(
          `UPDATE product_workspaces
           SET deleted_at = ?, revision = revision + 1, updated_at = ?
           WHERE workspace_id = ? AND revision = ? AND deleted_at IS NULL
           RETURNING revision`,
        ).get(deletedAt, deletedAt, input.workspaceId, input.expectedRevision);
        if (!updated) workspaceMutationFailure(input.workspaceId, input.expectedRevision);
        const revision = requiredNumber(asRecord(updated), "revision");
        const sequence = appendWorkspaceShellFact(input.workspaceId, {
          kind: "workspace-tombstone",
          workspaceId: input.workspaceId,
        });
        const result = decode(ProductDeleteWorkspaceResult, {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          workspaceId: input.workspaceId,
          revision,
          sequence,
        });
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductDeleteWorkspaceResult, result),
        });
        return result;
      }),
    );

  const createGroup: ProductControlPlaneShape["createGroup"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const existing = statement(
          "SELECT group_id FROM product_groups WHERE group_id = ? AND deleted_at IS NULL",
        ).get(input.groupId);
        if (existing) {
          const group = readGroupSummary(input.groupId);
          if (group.name !== input.name || group.color !== input.color) {
            throw new ProductFailure(
              "PRODUCT_GROUP_ID_CONFLICT",
              "Group identity is already bound to different metadata.",
            );
          }
          return group;
        }
        if (
          statement("SELECT group_id FROM product_groups WHERE group_id = ?").get(input.groupId)
        ) {
          throw new ProductFailure(
            "PRODUCT_GROUP_ID_CONFLICT",
            "Group identity is already bound to a deleted Group.",
          );
        }
        const activeCount = statement(
          "SELECT COUNT(*) AS count FROM product_groups WHERE deleted_at IS NULL",
        ).get();
        if (activeCount && requiredNumber(asRecord(activeCount), "count") >= PRODUCT_MAX_GROUPS) {
          throw new ProductFailure("PRODUCT_GROUP_LIMIT", "The Product Group limit was reached.");
        }
        if (
          statement(
            "SELECT group_id FROM product_groups WHERE name = ? COLLATE NOCASE AND deleted_at IS NULL",
          ).get(input.name)
        ) {
          throw new ProductFailure("PRODUCT_GROUP_NAME_CONFLICT", "Group name is already in use.");
        }
        const maxOrder = statement(
          "SELECT COALESCE(MAX(sort_order), -1) AS sort_order FROM product_groups WHERE deleted_at IS NULL",
        ).get();
        const sortOrder = (maxOrder ? requiredNumber(asRecord(maxOrder), "sort_order") : -1) + 1;
        const timestamp = productIsoNow();
        statement(
          `INSERT INTO product_groups(
             group_id, name, color, sort_order, revision, deleted_at, created_at, updated_at
           ) VALUES (?, ?, ?, ?, 1, NULL, ?, ?)`,
        ).run(input.groupId, input.name, input.color, sortOrder, timestamp, timestamp);
        appendGroupFact(input.groupId);
        return readGroupSummary(input.groupId);
      }),
    );

  const updateGroup: ProductControlPlaneShape["updateGroup"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "group-update";
        const requestJson = encodeJson(ProductUpdateGroupInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return readGroupSummary(input.groupId);
        }
        const nameOwner = statement(
          `SELECT group_id FROM product_groups
           WHERE name = ? COLLATE NOCASE AND group_id <> ? AND deleted_at IS NULL`,
        ).get(input.name, input.groupId);
        if (nameOwner) {
          throw new ProductFailure("PRODUCT_GROUP_NAME_CONFLICT", "Group name is already in use.");
        }
        const updated = statement(
          `UPDATE product_groups SET name = ?, color = ?, revision = revision + 1, updated_at = ?
           WHERE group_id = ? AND revision = ? AND deleted_at IS NULL RETURNING group_id`,
        ).get(input.name, input.color, productIsoNow(), input.groupId, input.expectedRevision);
        if (!updated) groupMutationFailure(input.groupId, input.expectedRevision);
        appendGroupFact(input.groupId);
        const result = readGroupSummary(input.groupId);
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductGroupSummary, result),
        });
        return result;
      }),
    );

  const reorderGroups: ProductControlPlaneShape["reorderGroups"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "groups-reorder";
        const requestJson = encodeJson(ProductReorderGroupsInput, input);
        const recorded = readRecordedMutation(input.mutationId, mutationKind, requestJson);
        if (recorded !== undefined) {
          return readGroups();
        }
        const current = readGroups();
        const expectedMatches =
          input.expectedGroups.length === current.length &&
          input.expectedGroups.every(
            (expected, index) =>
              expected.groupId === current[index]?.id &&
              expected.revision === current[index]?.revision,
          );
        const orderedUnique = uniqueSorted(input.orderedGroupIds);
        const currentUnique = uniqueSorted(current.map((group) => group.id));
        if (
          !expectedMatches ||
          orderedUnique.length !== input.orderedGroupIds.length ||
          !sameStrings(orderedUnique, currentUnique)
        ) {
          throw new ProductFailure(
            "PRODUCT_GROUP_ORDER_CONFLICT",
            "The active Group set or order changed before reorder was applied.",
            true,
          );
        }
        if (
          !sameStrings(
            input.orderedGroupIds,
            current.map((group) => group.id),
          )
        ) {
          const timestamp = productIsoNow();
          input.orderedGroupIds.forEach((groupId, sortOrder) => {
            statement(
              `UPDATE product_groups
               SET sort_order = ?, revision = revision + 1, updated_at = ?
               WHERE group_id = ? AND deleted_at IS NULL`,
            ).run(sortOrder, timestamp, groupId);
          });
          input.orderedGroupIds.forEach((groupId) => appendGroupFact(groupId));
        }
        const result = readGroups();
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(Schema.Array(ProductGroupSummary), result),
        });
        return result;
      }),
    );

  const deleteGroup: ProductControlPlaneShape["deleteGroup"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "group-delete";
        const requestJson = encodeJson(ProductDeleteGroupInput, input);
        const recorded = readRecordedMutation(input.mutationId, mutationKind, requestJson);
        if (recorded !== undefined) return decodeJson(ProductDeleteGroupResult, recorded);
        const timestamp = productIsoNow();
        const updated = statement(
          `UPDATE product_groups SET deleted_at = ?, revision = revision + 1, updated_at = ?
           WHERE group_id = ? AND revision = ? AND deleted_at IS NULL RETURNING revision`,
        ).get(timestamp, timestamp, input.groupId, input.expectedRevision);
        if (!updated) groupMutationFailure(input.groupId, input.expectedRevision);
        statement("DELETE FROM product_group_conversations WHERE group_id = ?").run(input.groupId);
        const sequence = appendGroupShellFact(input.groupId, {
          kind: "group-tombstone",
          groupId: input.groupId,
        });
        const result = decode(ProductDeleteGroupResult, {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          groupId: input.groupId,
          revision: requiredNumber(asRecord(updated), "revision"),
          sequence,
        });
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductDeleteGroupResult, result),
        });
        return result;
      }),
    );

  const mutateConversationGroups = (
    input: ProductSetConversationGroupsInput | ProductAddConversationGroupsInput,
    mode: "set" | "add",
  ): ProductGroupMembershipResult => {
    const mutationKind = mode === "set" ? "conversation-groups-set" : "conversation-groups-add";
    const inputSchema =
      mode === "set" ? ProductSetConversationGroupsInput : ProductAddConversationGroupsInput;
    const requestJson = encodeJson(inputSchema, input);
    const recorded = readRecordedMutation(input.mutationId, mutationKind, requestJson);
    if (recorded !== undefined) {
      const sequenceRow = statement(
        "SELECT COALESCE(MAX(global_sequence), 0) AS sequence FROM product_facts",
      ).get();
      return decode(ProductGroupMembershipResult, {
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        groups: readGroups(),
        sequence: sequenceRow ? requiredNumber(asRecord(sequenceRow), "sequence") : 0,
      });
    }
    const conversationIds = input.expectedMemberships.map((item) => item.conversationId);
    if (uniqueSorted(conversationIds).length !== conversationIds.length) {
      throw new ProductFailure(
        "PRODUCT_GROUP_MEMBERSHIP_CONFLICT",
        "Conversation membership expectations must be unique.",
        true,
      );
    }
    if (uniqueSorted(input.groupIds).length !== input.groupIds.length) {
      throw new ProductFailure("PRODUCT_GROUP_MEMBERSHIP_INVALID", "Target Groups must be unique.");
    }
    for (const groupId of input.groupIds) readGroupSummary(groupId);

    const currentByConversation = new Map<string, ReadonlyArray<string>>();
    const desiredByConversation = new Map<string, ReadonlyArray<string>>();
    for (const expected of input.expectedMemberships) {
      if (
        !statement(
          "SELECT conversation_id FROM product_conversations WHERE conversation_id = ? AND deleted_at IS NULL",
        ).get(expected.conversationId)
      ) {
        throw new ProductFailure("PRODUCT_CONVERSATION_NOT_FOUND", "Conversation was not found.");
      }
      const currentIds = currentMemberships(expected.conversationId);
      const expectedIds = uniqueSorted(expected.groupIds);
      if (
        expectedIds.length !== expected.groupIds.length ||
        !sameStrings(currentIds, expectedIds)
      ) {
        throw new ProductFailure(
          "PRODUCT_GROUP_MEMBERSHIP_CONFLICT",
          "Conversation Group membership changed before the mutation was applied.",
          true,
        );
      }
      currentByConversation.set(expected.conversationId, currentIds);
      desiredByConversation.set(
        expected.conversationId,
        mode === "set"
          ? uniqueSorted(input.groupIds)
          : uniqueSorted([...currentIds, ...input.groupIds]),
      );
    }

    const touchedGroupIds = uniqueSorted(
      [...currentByConversation.values(), ...desiredByConversation.values()].flat(),
    );
    for (const groupId of touchedGroupIds) {
      const currentCountRow = statement(
        "SELECT COUNT(*) AS count FROM product_group_conversations WHERE group_id = ?",
      ).get(groupId);
      let finalCount = currentCountRow ? requiredNumber(asRecord(currentCountRow), "count") : 0;
      for (const conversationId of conversationIds) {
        const before = currentByConversation.get(conversationId)?.includes(groupId) ?? false;
        const after = desiredByConversation.get(conversationId)?.includes(groupId) ?? false;
        if (before !== after) finalCount += after ? 1 : -1;
      }
      if (finalCount > PRODUCT_GROUP_MEMBERSHIP_MAX_COUNT) {
        throw new ProductFailure(
          "PRODUCT_GROUP_MEMBERSHIP_LIMIT",
          "A Group cannot contain more Conversations.",
        );
      }
    }

    const changedGroupIds = new Set<string>();
    const timestamp = productIsoNow();
    for (const conversationId of conversationIds) {
      const before = currentByConversation.get(conversationId) ?? [];
      const after = desiredByConversation.get(conversationId) ?? [];
      if (sameStrings(before, after)) continue;
      for (const groupId of before) {
        if (!after.includes(groupId)) {
          statement(
            "DELETE FROM product_group_conversations WHERE group_id = ? AND conversation_id = ?",
          ).run(groupId, conversationId);
          changedGroupIds.add(groupId);
        }
      }
      for (const groupId of after) {
        if (!before.includes(groupId)) {
          statement(
            `INSERT INTO product_group_conversations(group_id, conversation_id, created_at)
             VALUES (?, ?, ?)`,
          ).run(groupId, conversationId, timestamp);
          changedGroupIds.add(groupId);
        }
      }
    }
    for (const groupId of changedGroupIds) {
      statement(
        `UPDATE product_groups SET revision = revision + 1, updated_at = ?
         WHERE group_id = ? AND deleted_at IS NULL`,
      ).run(timestamp, groupId);
      appendGroupFact(groupId);
    }
    const sequenceRow = statement(
      "SELECT COALESCE(MAX(global_sequence), 0) AS sequence FROM product_facts",
    ).get();
    const result = decode(ProductGroupMembershipResult, {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      groups: readGroups(),
      sequence: sequenceRow ? requiredNumber(asRecord(sequenceRow), "sequence") : 0,
    });
    recordMutation({
      mutationId: input.mutationId,
      mutationKind,
      requestJson,
      responseJson: encodeJson(ProductGroupMembershipResult, result),
    });
    return result;
  };

  const setConversationGroups: ProductControlPlaneShape["setConversationGroups"] = (input) =>
    effect(() => withTransaction(() => mutateConversationGroups(input, "set")));

  const addConversationGroups: ProductControlPlaneShape["addConversationGroups"] = (input) =>
    effect(() => withTransaction(() => mutateConversationGroups(input, "add")));

  const createConversation: ProductControlPlaneShape["createConversation"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const timestamp = productIsoNow();
        let workspaceId: string = input.workspaceId;
        const conversationId = input.conversationId;
        const existingWorkspace = statement(
          "SELECT workspace_id FROM product_workspaces WHERE workspace_id = ?",
        ).get(workspaceId);
        if (existingWorkspace) {
          if (!workspaceAccessMatches(readWorkspace(workspaceId).access, input.workspace)) {
            throw new ProductFailure(
              "PRODUCT_WORKSPACE_ACCESS_CONFLICT",
              "Workspace identity is already bound to different access or a different canonical root.",
            );
          }
        } else {
          const rootOwner = findWorkspaceByAccess(input.workspace);
          if (rootOwner) {
            workspaceId = rootOwner.id;
          } else {
            const workspaceTitle = inferredWorkspaceTitle(
              input.workspace,
              input.workspace.kind === "chat" ? "Chat" : input.title,
            );
            statement(
              `INSERT INTO product_workspaces(
                 workspace_id, title, access_json, observed_at, revision,
                 visible_in_sidebar, is_pinned, run_command, archived_at,
                 deleted_at, created_at, updated_at
               ) VALUES (?, ?, ?, ?, 1, ?, 0, NULL, NULL, NULL, ?, ?)`,
            ).run(
              workspaceId,
              workspaceTitle,
              encodeJson(ProductWorkspaceAccess, input.workspace),
              timestamp,
              input.workspace.kind === "chat" ? 0 : 1,
              timestamp,
              timestamp,
            );
            appendWorkspaceFact(workspaceId);
          }
        }
        statement(
          `INSERT INTO product_conversations(
             conversation_id, workspace_id, title, revision, detail_sequence, created_at, updated_at
           ) VALUES (?, ?, ?, 1, 0, ?, ?)`,
        ).run(conversationId, workspaceId, input.title, timestamp, timestamp);
        appendFact(conversationId, {
          kind: "conversation-created",
          conversationId: decode(ProductConversationId, conversationId),
        });
        return snapshot(conversationId);
      }),
    );

  const updateConversationTitle: ProductControlPlaneShape["updateConversationTitle"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "conversation-title-update";
        const requestJson = encodeJson(ProductUpdateConversationTitleInput, input);
        const recorded = statement(
          `SELECT mutation_kind, request_json, response_json
           FROM product_mutations WHERE mutation_id = ?`,
        ).get(input.mutationId);
        if (recorded) {
          const row = asRecord(recorded);
          if (
            requiredString(row, "mutation_kind") !== mutationKind ||
            requiredString(row, "request_json") !== requestJson
          ) {
            throw new ProductFailure(
              "PRODUCT_MUTATION_ID_CONFLICT",
              "The Product mutation identity is already bound to different input.",
            );
          }
          return snapshot(input.conversationId);
        }
        const updated = statement(
          `UPDATE product_conversations
           SET title = ?, revision = revision + 1, updated_at = ?
           WHERE conversation_id = ? AND revision = ?
           RETURNING conversation_id`,
        ).get(input.title, productIsoNow(), input.conversationId, input.expectedRevision);
        if (!updated) {
          const exists = statement(
            "SELECT revision FROM product_conversations WHERE conversation_id = ?",
          ).get(input.conversationId);
          if (!exists) {
            throw new ProductFailure(
              "PRODUCT_CONVERSATION_NOT_FOUND",
              "Conversation was not found.",
            );
          }
          throw new ProductFailure(
            "PRODUCT_CONVERSATION_REVISION_CONFLICT",
            "The Conversation changed before its title was updated.",
            true,
          );
        }
        const summary = readSummary(input.conversationId);
        appendFact(input.conversationId, {
          kind: "conversation-updated",
          conversation: summary,
        });
        const result = snapshot(input.conversationId);
        statement(
          `INSERT INTO product_mutations(
             mutation_id, mutation_kind, request_json, response_json, created_at
           ) VALUES (?, ?, ?, ?, ?)`,
        ).run(
          input.mutationId,
          mutationKind,
          requestJson,
          encodeJson(ProductConversationSnapshot, result),
          productIsoNow(),
        );
        return result;
      }),
    );

  const archiveConversation: ProductControlPlaneShape["archiveConversation"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "conversation-archive";
        const requestJson = encodeJson(ProductArchiveConversationInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        const updated = statement(
          `UPDATE product_conversations
           SET archived_at = ?, revision = revision + 1, updated_at = ?
           WHERE conversation_id = ? AND revision = ?
             AND archived_at IS NULL AND deleted_at IS NULL
           RETURNING conversation_id`,
        ).get(productIsoNow(), productIsoNow(), input.conversationId, input.expectedRevision);
        if (!updated) {
          conversationMutationFailure(input.conversationId, input.expectedRevision, {
            code: "PRODUCT_CONVERSATION_ALREADY_ARCHIVED",
            message: "Conversation is already archived.",
          });
        }
        appendFact(input.conversationId, {
          kind: "conversation-updated",
          conversation: readSummary(input.conversationId),
        });
        const result = snapshot(input.conversationId);
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductConversationSnapshot, result),
        });
        return result;
      }),
    );

  const restoreConversation: ProductControlPlaneShape["restoreConversation"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "conversation-restore";
        const requestJson = encodeJson(ProductRestoreConversationInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        const updated = statement(
          `UPDATE product_conversations
           SET archived_at = NULL, revision = revision + 1, updated_at = ?
           WHERE conversation_id = ? AND revision = ?
             AND archived_at IS NOT NULL AND deleted_at IS NULL
           RETURNING conversation_id`,
        ).get(productIsoNow(), input.conversationId, input.expectedRevision);
        if (!updated) {
          conversationMutationFailure(input.conversationId, input.expectedRevision, {
            code: "PRODUCT_CONVERSATION_NOT_ARCHIVED",
            message: "Conversation is not archived.",
          });
        }
        appendFact(input.conversationId, {
          kind: "conversation-updated",
          conversation: readSummary(input.conversationId),
        });
        const result = snapshot(input.conversationId);
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductConversationSnapshot, result),
        });
        return result;
      }),
    );

  const setConversationPinned: ProductControlPlaneShape["setConversationPinned"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "conversation-pinned-set";
        const requestJson = encodeJson(ProductSetConversationPinnedInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        const updated = statement(
          `UPDATE product_conversations
           SET is_pinned = ?, revision = revision + 1, updated_at = ?
           WHERE conversation_id = ? AND revision = ? AND deleted_at IS NULL
           RETURNING conversation_id`,
        ).get(
          input.isPinned ? 1 : 0,
          productIsoNow(),
          input.conversationId,
          input.expectedRevision,
        );
        if (!updated) conversationMutationFailure(input.conversationId, input.expectedRevision);
        appendFact(input.conversationId, {
          kind: "conversation-updated",
          conversation: readSummary(input.conversationId),
        });
        const result = snapshot(input.conversationId);
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductConversationSnapshot, result),
        });
        return result;
      }),
    );

  const updateConversationNotes: ProductControlPlaneShape["updateConversationNotes"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "conversation-notes-update";
        const requestJson = encodeJson(ProductUpdateConversationNotesInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        const updated = statement(
          `UPDATE product_conversations
           SET notes = ?, revision = revision + 1, updated_at = ?
           WHERE conversation_id = ? AND revision = ? AND deleted_at IS NULL
           RETURNING conversation_id`,
        ).get(input.notes, productIsoNow(), input.conversationId, input.expectedRevision);
        if (!updated) conversationMutationFailure(input.conversationId, input.expectedRevision);
        appendFact(input.conversationId, {
          kind: "conversation-updated",
          conversation: readSummary(input.conversationId),
        });
        const result = snapshot(input.conversationId);
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductConversationSnapshot, result),
        });
        return result;
      }),
    );

  const setConversationBoardState: ProductControlPlaneShape["setConversationBoardState"] = (
    input,
  ) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "conversation-board-state-set";
        const requestJson = encodeJson(ProductSetConversationBoardStateInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        const changedAt = productIsoNow();
        const updated = statement(
          `UPDATE product_conversations
             SET board_state = ?, board_state_changed_at = ?,
                 revision = revision + 1, updated_at = ?
             WHERE conversation_id = ? AND revision = ? AND deleted_at IS NULL
             RETURNING conversation_id`,
        ).get(input.boardState, changedAt, changedAt, input.conversationId, input.expectedRevision);
        if (!updated) conversationMutationFailure(input.conversationId, input.expectedRevision);
        appendFact(input.conversationId, {
          kind: "conversation-updated",
          conversation: readSummary(input.conversationId),
        });
        const result = snapshot(input.conversationId);
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductConversationSnapshot, result),
        });
        return result;
      }),
    );

  const assertEntryMutationTarget = (
    conversationId: string,
    expectedRevision: number,
    entryId: string,
  ): string => {
    const summary = readSummary(conversationId);
    if (summary.revision !== expectedRevision) {
      throw new ProductFailure(
        "PRODUCT_CONVERSATION_REVISION_CONFLICT",
        "The Conversation changed before the annotation mutation was applied.",
        true,
      );
    }
    const entry = statement(
      "SELECT body FROM product_entries WHERE entry_id = ? AND conversation_id = ?",
    ).get(entryId, conversationId);
    if (!entry) {
      throw new ProductFailure(
        "PRODUCT_ENTRY_NOT_FOUND",
        "Entry was not found in the target Conversation.",
      );
    }
    return requiredString(asRecord(entry), "body");
  };

  const advanceConversationRevision = (conversationId: string, expectedRevision: number): void => {
    const updated = statement(
      `UPDATE product_conversations SET revision = revision + 1, updated_at = ?
       WHERE conversation_id = ? AND revision = ? AND deleted_at IS NULL RETURNING conversation_id`,
    ).get(productIsoNow(), conversationId, expectedRevision);
    if (!updated) conversationMutationFailure(conversationId, expectedRevision);
  };

  const finishEntryAnnotationMutation = (input: {
    readonly mutationId: string;
    readonly mutationKind: string;
    readonly requestJson: string;
    readonly conversationId: string;
  }): ProductConversationSnapshot => {
    const result = snapshot(input.conversationId);
    recordMutation({
      mutationId: input.mutationId,
      mutationKind: input.mutationKind,
      requestJson: input.requestJson,
      responseJson: encodeJson(ProductConversationSnapshot, result),
    });
    return result;
  };

  const addEntryPin: ProductControlPlaneShape["addEntryPin"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "entry-pin-add";
        const requestJson = encodeJson(ProductAddEntryPinInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        assertEntryMutationTarget(input.conversationId, input.expectedRevision, input.entryId);
        if (
          statement(
            "SELECT entry_id FROM product_entry_pins WHERE conversation_id = ? AND entry_id = ?",
          ).get(input.conversationId, input.entryId)
        ) {
          return finishEntryAnnotationMutation({
            mutationId: input.mutationId,
            mutationKind,
            requestJson,
            conversationId: input.conversationId,
          });
        }
        const countRow = statement(
          "SELECT COUNT(*) AS count FROM product_entry_pins WHERE conversation_id = ?",
        ).get(input.conversationId);
        if (
          countRow &&
          requiredNumber(asRecord(countRow), "count") >= PRODUCT_ENTRY_PINS_MAX_COUNT
        ) {
          throw new ProductFailure("PRODUCT_ENTRY_PIN_LIMIT", "The Entry pin limit was reached.");
        }
        statement(
          `INSERT INTO product_entry_pins(conversation_id, entry_id, label, done, pinned_at)
           VALUES (?, ?, NULL, 0, ?)`,
        ).run(input.conversationId, input.entryId, productIsoNow());
        advanceConversationRevision(input.conversationId, input.expectedRevision);
        appendFact(input.conversationId, {
          kind: "entry-pins-changed",
          conversationId: input.conversationId,
          pins: readEntryPins(input.conversationId),
        });
        return finishEntryAnnotationMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          conversationId: input.conversationId,
        });
      }),
    );

  const removeEntryPin: ProductControlPlaneShape["removeEntryPin"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "entry-pin-remove";
        const requestJson = encodeJson(ProductRemoveEntryPinInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        assertEntryMutationTarget(input.conversationId, input.expectedRevision, input.entryId);
        const removed = statement(
          "DELETE FROM product_entry_pins WHERE conversation_id = ? AND entry_id = ? RETURNING entry_id",
        ).get(input.conversationId, input.entryId);
        if (removed) {
          advanceConversationRevision(input.conversationId, input.expectedRevision);
          appendFact(input.conversationId, {
            kind: "entry-pins-changed",
            conversationId: input.conversationId,
            pins: readEntryPins(input.conversationId),
          });
        }
        return finishEntryAnnotationMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          conversationId: input.conversationId,
        });
      }),
    );

  const setEntryPinDone: ProductControlPlaneShape["setEntryPinDone"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "entry-pin-done-set";
        const requestJson = encodeJson(ProductSetEntryPinDoneInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        assertEntryMutationTarget(input.conversationId, input.expectedRevision, input.entryId);
        const updated = statement(
          `UPDATE product_entry_pins SET done = ?
           WHERE conversation_id = ? AND entry_id = ? RETURNING entry_id`,
        ).get(input.done ? 1 : 0, input.conversationId, input.entryId);
        if (!updated)
          throw new ProductFailure("PRODUCT_ENTRY_PIN_NOT_FOUND", "Entry pin was not found.");
        advanceConversationRevision(input.conversationId, input.expectedRevision);
        appendFact(input.conversationId, {
          kind: "entry-pins-changed",
          conversationId: input.conversationId,
          pins: readEntryPins(input.conversationId),
        });
        return finishEntryAnnotationMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          conversationId: input.conversationId,
        });
      }),
    );

  const setEntryPinLabel: ProductControlPlaneShape["setEntryPinLabel"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "entry-pin-label-set";
        const requestJson = encodeJson(ProductSetEntryPinLabelInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        assertEntryMutationTarget(input.conversationId, input.expectedRevision, input.entryId);
        const updated = statement(
          `UPDATE product_entry_pins SET label = ?
           WHERE conversation_id = ? AND entry_id = ? RETURNING entry_id`,
        ).get(input.label, input.conversationId, input.entryId);
        if (!updated)
          throw new ProductFailure("PRODUCT_ENTRY_PIN_NOT_FOUND", "Entry pin was not found.");
        advanceConversationRevision(input.conversationId, input.expectedRevision);
        appendFact(input.conversationId, {
          kind: "entry-pins-changed",
          conversationId: input.conversationId,
          pins: readEntryPins(input.conversationId),
        });
        return finishEntryAnnotationMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          conversationId: input.conversationId,
        });
      }),
    );

  const addEntryMarker: ProductControlPlaneShape["addEntryMarker"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "entry-marker-add";
        const requestJson = encodeJson(ProductAddEntryMarkerInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        const body = assertEntryMutationTarget(
          input.conversationId,
          input.expectedRevision,
          input.entryId,
        );
        if (
          input.endOffset <= input.startOffset ||
          input.endOffset > body.length ||
          body.slice(input.startOffset, input.endOffset) !== input.selectedText
        ) {
          throw new ProductFailure(
            "PRODUCT_ENTRY_MARKER_RANGE_INVALID",
            "Marker offsets and selected text do not match the Entry.",
          );
        }
        const digest = `sha256:${createHash("sha256").update(input.selectedText).digest("hex")}`;
        if (digest !== input.selectedTextDigest) {
          throw new ProductFailure(
            "PRODUCT_ENTRY_MARKER_DIGEST_INVALID",
            "Marker selected-text digest does not match the selection.",
          );
        }
        const existing = statement(
          `SELECT conversation_id, entry_id, start_offset, end_offset, selected_text_digest,
                  style, color FROM product_entry_markers WHERE marker_id = ?`,
        ).get(input.markerId);
        if (existing) {
          const row = asRecord(existing);
          if (
            requiredString(row, "conversation_id") !== input.conversationId ||
            requiredString(row, "entry_id") !== input.entryId ||
            requiredNumber(row, "start_offset") !== input.startOffset ||
            requiredNumber(row, "end_offset") !== input.endOffset ||
            requiredString(row, "selected_text_digest") !== input.selectedTextDigest ||
            requiredString(row, "style") !== input.style ||
            requiredString(row, "color") !== input.color
          ) {
            throw new ProductFailure(
              "PRODUCT_ENTRY_MARKER_ID_CONFLICT",
              "Marker identity is already bound to a different selection.",
            );
          }
          return finishEntryAnnotationMutation({
            mutationId: input.mutationId,
            mutationKind,
            requestJson,
            conversationId: input.conversationId,
          });
        }
        const countRow = statement(
          "SELECT COUNT(*) AS count FROM product_entry_markers WHERE conversation_id = ?",
        ).get(input.conversationId);
        const overlapRows = statement(
          `SELECT marker_id FROM product_entry_markers
           WHERE conversation_id = ? AND entry_id = ?
             AND start_offset < ? AND end_offset > ?`,
        ).all(input.conversationId, input.entryId, input.endOffset, input.startOffset);
        const count = countRow ? requiredNumber(asRecord(countRow), "count") : 0;
        if (count - overlapRows.length >= PRODUCT_ENTRY_MARKERS_MAX_COUNT) {
          throw new ProductFailure(
            "PRODUCT_ENTRY_MARKER_LIMIT",
            "The Entry marker limit was reached.",
          );
        }
        statement(
          `DELETE FROM product_entry_markers
           WHERE conversation_id = ? AND entry_id = ?
             AND start_offset < ? AND end_offset > ?`,
        ).run(input.conversationId, input.entryId, input.endOffset, input.startOffset);
        const timestamp = productIsoNow();
        statement(
          `INSERT INTO product_entry_markers(
             marker_id, conversation_id, entry_id, start_offset, end_offset,
             selected_text, selected_text_digest, style, color, label, done, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)`,
        ).run(
          input.markerId,
          input.conversationId,
          input.entryId,
          input.startOffset,
          input.endOffset,
          input.selectedText,
          input.selectedTextDigest,
          input.style,
          input.color,
          timestamp,
          timestamp,
        );
        advanceConversationRevision(input.conversationId, input.expectedRevision);
        appendFact(input.conversationId, {
          kind: "entry-markers-changed",
          conversationId: input.conversationId,
          markers: readEntryMarkers(input.conversationId),
        });
        return finishEntryAnnotationMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          conversationId: input.conversationId,
        });
      }),
    );

  const removeEntryMarker: ProductControlPlaneShape["removeEntryMarker"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "entry-marker-remove";
        const requestJson = encodeJson(ProductRemoveEntryMarkerInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        readSummary(input.conversationId).revision === input.expectedRevision ||
          conversationMutationFailure(input.conversationId, input.expectedRevision);
        const removed = statement(
          `DELETE FROM product_entry_markers
           WHERE marker_id = ? AND conversation_id = ? RETURNING marker_id`,
        ).get(input.markerId, input.conversationId);
        if (removed) {
          advanceConversationRevision(input.conversationId, input.expectedRevision);
          appendFact(input.conversationId, {
            kind: "entry-markers-changed",
            conversationId: input.conversationId,
            markers: readEntryMarkers(input.conversationId),
          });
        }
        return finishEntryAnnotationMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          conversationId: input.conversationId,
        });
      }),
    );

  const setEntryMarkerDone: ProductControlPlaneShape["setEntryMarkerDone"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "entry-marker-done-set";
        const requestJson = encodeJson(ProductSetEntryMarkerDoneInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        const current = readSummary(input.conversationId);
        if (current.revision !== input.expectedRevision) {
          conversationMutationFailure(input.conversationId, input.expectedRevision);
        }
        const updated = statement(
          `UPDATE product_entry_markers SET done = ?, updated_at = ?
           WHERE marker_id = ? AND conversation_id = ? RETURNING marker_id`,
        ).get(input.done ? 1 : 0, productIsoNow(), input.markerId, input.conversationId);
        if (!updated) {
          throw new ProductFailure("PRODUCT_ENTRY_MARKER_NOT_FOUND", "Entry marker was not found.");
        }
        advanceConversationRevision(input.conversationId, input.expectedRevision);
        appendFact(input.conversationId, {
          kind: "entry-markers-changed",
          conversationId: input.conversationId,
          markers: readEntryMarkers(input.conversationId),
        });
        return finishEntryAnnotationMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          conversationId: input.conversationId,
        });
      }),
    );

  const setEntryMarkerLabel: ProductControlPlaneShape["setEntryMarkerLabel"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "entry-marker-label-set";
        const requestJson = encodeJson(ProductSetEntryMarkerLabelInput, input);
        if (readRecordedMutation(input.mutationId, mutationKind, requestJson) !== undefined) {
          return snapshot(input.conversationId);
        }
        const current = readSummary(input.conversationId);
        if (current.revision !== input.expectedRevision) {
          conversationMutationFailure(input.conversationId, input.expectedRevision);
        }
        const updated = statement(
          `UPDATE product_entry_markers SET label = ?, updated_at = ?
           WHERE marker_id = ? AND conversation_id = ? RETURNING marker_id`,
        ).get(input.label, productIsoNow(), input.markerId, input.conversationId);
        if (!updated) {
          throw new ProductFailure("PRODUCT_ENTRY_MARKER_NOT_FOUND", "Entry marker was not found.");
        }
        advanceConversationRevision(input.conversationId, input.expectedRevision);
        appendFact(input.conversationId, {
          kind: "entry-markers-changed",
          conversationId: input.conversationId,
          markers: readEntryMarkers(input.conversationId),
        });
        return finishEntryAnnotationMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          conversationId: input.conversationId,
        });
      }),
    );

  const deleteConversation: ProductControlPlaneShape["deleteConversation"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const mutationKind = "conversation-delete";
        const requestJson = encodeJson(ProductDeleteConversationInput, input);
        const recorded = readRecordedMutation(input.mutationId, mutationKind, requestJson);
        if (recorded !== undefined) {
          return decodeJson(ProductDeleteConversationResult, recorded);
        }
        const deletedAt = productIsoNow();
        const updated = statement(
          `UPDATE product_conversations
           SET deleted_at = ?, revision = revision + 1, updated_at = ?
           WHERE conversation_id = ? AND revision = ? AND deleted_at IS NULL
           RETURNING revision`,
        ).get(deletedAt, deletedAt, input.conversationId, input.expectedRevision);
        if (!updated) conversationMutationFailure(input.conversationId, input.expectedRevision);
        appendFact(input.conversationId, {
          kind: "conversation-tombstone",
          conversationId: input.conversationId,
        });
        const result = decode(ProductDeleteConversationResult, {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: input.conversationId,
          revision: requiredNumber(asRecord(updated), "revision"),
          sequence: detailSequence(input.conversationId),
        });
        recordMutation({
          mutationId: input.mutationId,
          mutationKind,
          requestJson,
          responseJson: encodeJson(ProductDeleteConversationResult, result),
        });
        return result;
      }),
    );

  const hasConversation: ProductControlPlaneShape["hasConversation"] = (conversationId) =>
    effect(
      () =>
        statement(
          `SELECT conversation_id FROM product_conversations
           WHERE conversation_id = ? AND deleted_at IS NULL`,
        ).get(conversationId) !== undefined,
    );

  const getShellSnapshot: ProductControlPlaneShape["getShellSnapshot"] = () =>
    Effect.gen(function* () {
      yield* observeRuntimeCatalog();
      return yield* effect(() => {
        const workspaceIds = statement(
          `SELECT workspace_id FROM product_workspaces
           WHERE deleted_at IS NULL
           ORDER BY updated_at DESC, workspace_id ASC`,
        )
          .all()
          .map((raw) => requiredString(asRecord(raw), "workspace_id"));
        const ids = statement(
          `SELECT conversation_id FROM product_conversations
         WHERE deleted_at IS NULL
         ORDER BY updated_at DESC, conversation_id ASC`,
        )
          .all()
          .map((raw) => requiredString(asRecord(raw), "conversation_id"));
        const highWater = statement(
          "SELECT COALESCE(MAX(global_sequence), 0) AS high_water FROM product_facts",
        ).get();
        return decode(ProductShellSnapshot, {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          sequence: highWater ? requiredNumber(asRecord(highWater), "high_water") : 0,
          workspaces: workspaceIds.map(readWorkspaceSummary),
          groups: readGroups(),
          conversations: ids.map(readSummary),
          runtimeCatalog,
        });
      });
    });

  const getConversationSnapshot: ProductControlPlaneShape["getConversationSnapshot"] = (input) =>
    effect(() => snapshot(input.conversationId));

  const controlRun: ProductControlPlaneShape["controlRun"] = (input) =>
    Effect.gen(function* () {
      const run = yield* effect(() => readRun(input.runId));
      if (run.conversationId !== input.conversationId) {
        return yield* Effect.fail(
          new ProductControlPlaneError({
            code: "PRODUCT_CONTROL_TARGET_MISMATCH",
            message: "The selected Run does not belong to this Conversation.",
            retryable: false,
          }),
        );
      }
      const receipt = run.receipt.receipt;
      const operationRef = receiptOperationRef(receipt);
      const isNoAckAbort =
        (input.control === "abort" || input.control === "cancel") &&
        operationRef === null &&
        usesEngineSessionExecution(run) &&
        "abort" in receipt &&
        (receipt.state === "sent" || receipt.state === "running");
      if (
        receipt.state === "sent" &&
        usesEngineSessionExecution(run) &&
        (input.control === "steer" || input.control === "follow-up")
      ) {
        return decode(ProductControlRunResult, {
          operationRef: null,
          control: input.control,
          result: "unsupported",
          code: "control-unsupported",
          message: "OpenCode does not support this control for the current Run.",
        });
      }
      if (
        receipt.state !== "accepted" &&
        receipt.state !== "running" &&
        !(receipt.state === "sent" && isNoAckAbort)
      ) {
        return decode(ProductControlRunResult, {
          operationRef,
          control: input.control,
          result: receipt.state === "settled" ? "too-late" : "unknown",
          code: receipt.state === "settled" ? "control-too-late" : "operation-unknown",
          message:
            receipt.state === "settled"
              ? "The Product Run has already settled."
              : "The Product Run has no confirmed accepted operation.",
        });
      }
      if ((input.control === "steer" || input.control === "follow-up") && input.text === null) {
        return decode(ProductControlRunResult, {
          operationRef,
          control: input.control,
          result: "unsupported",
          code: "control-unsupported",
          message: "This native control requires text.",
        });
      }
      if (!executionBoundary.control) {
        return decode(ProductControlRunResult, {
          operationRef,
          control: input.control,
          result: "unsupported",
          code: "control-unsupported",
          message: "The active execution boundary does not expose native controls.",
        });
      }
      if (isNoAckAbort && receipt.abort !== null) {
        return decode(ProductControlRunResult, {
          operationRef: null,
          control: input.control,
          result: "requested",
          code: "control-unacknowledged",
          message: "The cancellation request is already recorded without an acknowledgement.",
        });
      }
      if (isNoAckAbort) {
        const requestedAt = productIsoNow();
        // Persist the user's request before the unacknowledged wire boundary. A crash on either
        // side must retain one durable intent and must never cause a second cancel write.
        yield* effect(() =>
          withTransaction(() => {
            const current = readRun(input.runId).receipt.receipt;
            if (
              (current.state !== "sent" && current.state !== "running") ||
              !("abort" in current) ||
              current.abort !== null
            )
              return;
            const outbox = statement(
              "SELECT state, send_boundary FROM product_outbox WHERE run_id = ?",
            ).get(input.runId);
            if (!outbox) return;
            const row = asRecord(outbox);
            updateReceipt(
              input.runId,
              { ...current, abort: { requestedAt, confirmed: false } },
              requiredString(row, "state") as "pending" | "sending" | "terminal",
              requiredString(row, "send_boundary") as ProductSendBoundary,
            );
          }),
        );
      }
      const result = yield* executionBoundary.control({
        run,
        operationRef,
        control: input.control,
        text: input.text,
      });
      if (
        result.result === "requested" &&
        (input.control === "abort" || input.control === "cancel")
      ) {
        const requestedAt = productIsoNow();
        yield* effect(() =>
          withTransaction(() => {
            const current = readRun(input.runId).receipt.receipt;
            if (!("abort" in current)) return;
            if (current.abort !== null) return;
            const outbox = statement(
              "SELECT state, send_boundary FROM product_outbox WHERE run_id = ?",
            ).get(input.runId);
            if (!outbox) return;
            const row = asRecord(outbox);
            updateReceipt(
              input.runId,
              { ...current, abort: { requestedAt, confirmed: false } },
              requiredString(row, "state") as "pending" | "sending" | "terminal",
              requiredString(row, "send_boundary") as ProductSendBoundary,
            );
          }),
        );
      }
      return result;
    });

  const putQueueItem: ProductControlPlaneShape["putQueueItem"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const conversation = readSummary(input.conversationId);
        assertResourceAuthority(readWorkspace(conversation.workspaceId), input.resources);
        validateCatalogSelection(input.requestedSelection);
        const existing = statement(
          `SELECT revision, position, created_at FROM product_queue_items
           WHERE queue_item_id = ? AND conversation_id = ?`,
        ).get(input.itemId, input.conversationId);
        const timestamp = productIsoNow();
        if (existing) {
          const row = asRecord(existing);
          const revision = requiredNumber(row, "revision");
          if (input.expectedRevision === null || input.expectedRevision !== revision) {
            throw new ProductFailure(
              "PRODUCT_QUEUE_REVISION_CONFLICT",
              "The Queue item changed before this edit.",
              true,
            );
          }
          statement(
            `UPDATE product_queue_items
             SET body = ?, requested_selection_json = ?, resources_json = ?,
                 revision = revision + 1, updated_at = ?
             WHERE queue_item_id = ? AND conversation_id = ?`,
          ).run(
            input.text,
            encodeJson(ProductRequestedSelection, input.requestedSelection),
            encodeJson(Schema.Array(ProductResourceRef), input.resources),
            timestamp,
            input.itemId,
            input.conversationId,
          );
        } else {
          if (input.expectedRevision !== null) {
            throw new ProductFailure(
              "PRODUCT_QUEUE_ITEM_NOT_FOUND",
              "The Queue item no longer exists.",
            );
          }
          const max = statement(
            `SELECT COALESCE(MAX(position), -1) AS max_position, COUNT(*) AS item_count
             FROM product_queue_items WHERE conversation_id = ?`,
          ).get(input.conversationId);
          const maxRow = asRecord(max);
          if (requiredNumber(maxRow, "item_count") >= 128) {
            throw new ProductFailure("PRODUCT_QUEUE_FULL", "The editable Queue is full.");
          }
          statement(
            `INSERT INTO product_queue_items(
               queue_item_id, conversation_id, body, requested_selection_json, resources_json,
               position, revision, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          ).run(
            input.itemId,
            input.conversationId,
            input.text,
            encodeJson(ProductRequestedSelection, input.requestedSelection),
            encodeJson(Schema.Array(ProductResourceRef), input.resources),
            requiredNumber(maxRow, "max_position") + 1,
            timestamp,
            timestamp,
          );
        }
        const queue = readQueue(input.conversationId);
        appendFact(input.conversationId, {
          kind: "queue-changed",
          conversationId: input.conversationId,
          queue,
        });
        const item = queue.find((candidate) => candidate.id === input.itemId);
        if (!item)
          throw new ProductFailure("PRODUCT_QUEUE_ITEM_NOT_FOUND", "Queue item was not found.");
        return item;
      }),
    );

  const reorderQueue: ProductControlPlaneShape["reorderQueue"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const current = readQueue(input.conversationId);
        const currentIds = current.map((item) => item.id).toSorted();
        const requestedIds = [...input.orderedItemIds].toSorted();
        if (
          currentIds.length !== requestedIds.length ||
          currentIds.some((id, index) => id !== requestedIds[index])
        ) {
          throw new ProductFailure(
            "PRODUCT_QUEUE_REORDER_CONFLICT",
            "Queue reorder must contain every current item exactly once.",
            true,
          );
        }
        // Offset first so the unique (conversation, position) constraint remains true.
        statement(
          "UPDATE product_queue_items SET position = position + 10000 WHERE conversation_id = ?",
        ).run(input.conversationId);
        input.orderedItemIds.forEach((itemId, position) => {
          statement(
            `UPDATE product_queue_items
             SET position = ?, revision = revision + 1, updated_at = ?
             WHERE conversation_id = ? AND queue_item_id = ?`,
          ).run(position, productIsoNow(), input.conversationId, itemId);
        });
        appendFact(input.conversationId, {
          kind: "queue-changed",
          conversationId: input.conversationId,
          queue: readQueue(input.conversationId),
        });
        return snapshot(input.conversationId);
      }),
    );

  const deleteQueueItem: ProductControlPlaneShape["deleteQueueItem"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const existing = statement(
          `SELECT revision FROM product_queue_items
           WHERE queue_item_id = ? AND conversation_id = ?`,
        ).get(input.itemId, input.conversationId);
        if (!existing)
          throw new ProductFailure("PRODUCT_QUEUE_ITEM_NOT_FOUND", "Queue item was not found.");
        if (requiredNumber(asRecord(existing), "revision") !== input.expectedRevision) {
          throw new ProductFailure(
            "PRODUCT_QUEUE_REVISION_CONFLICT",
            "The Queue item changed before deletion.",
            true,
          );
        }
        statement(
          "DELETE FROM product_queue_items WHERE queue_item_id = ? AND conversation_id = ?",
        ).run(input.itemId, input.conversationId);
        const queue = readQueue(input.conversationId);
        queue.forEach((item, position) => {
          statement("UPDATE product_queue_items SET position = ? WHERE queue_item_id = ?").run(
            position,
            item.id,
          );
        });
        appendFact(input.conversationId, {
          kind: "queue-changed",
          conversationId: input.conversationId,
          queue: readQueue(input.conversationId),
        });
        return snapshot(input.conversationId);
      }),
    );

  const admitQueueItem: ProductControlPlaneShape["admitQueueItem"] = (input) =>
    Effect.gen(function* () {
      const preparationInput = yield* effect(() => {
        const queueItem = readQueue(input.conversationId).find((item) => item.id === input.itemId);
        if (!queueItem)
          throw new ProductFailure("PRODUCT_QUEUE_ITEM_NOT_FOUND", "Queue item was not found.");
        if (queueItem.revision !== input.expectedRevision)
          throw new ProductFailure(
            "PRODUCT_QUEUE_REVISION_CONFLICT",
            "The Queue item changed before admission.",
            true,
          );
        assertDispatchableSelection(queueItem.requestedSelection);
        const workspace = readWorkspace(readSummary(input.conversationId).workspaceId);
        assertResourceAuthority(workspace, queueItem.resources);
        return {
          requestedSelection: queueItem.requestedSelection,
          workspace,
          resources: queueItem.resources,
          text: queueItem.text,
          priorLineageRef: compatiblePriorLineageRef(
            input.conversationId,
            queueItem.requestedSelection.engineId,
          ),
        };
      });
      const prepared = executionBoundary.prepare
        ? yield* executionBoundary.prepare({
            dispatchId: input.dispatchId,
            conversationId: input.conversationId,
            runId: input.runId,
            ...preparationInput,
          })
        : null;
      const admitted = yield* effect(() => {
        try {
          return withTransaction(() => {
            const blockingReceipt = statement(
              `SELECT o.state, r.receipt_json
           FROM product_runs pr
           JOIN product_outbox o ON o.run_id = pr.run_id
           JOIN product_operation_receipts r ON r.run_id = pr.run_id
           WHERE pr.conversation_id = ?`,
            )
              .all(input.conversationId)
              .map((raw) => {
                const row = asRecord(raw);
                const receipt = decodeJson(
                  ProductDispatchReceipt,
                  requiredString(row, "receipt_json"),
                );
                return {
                  receipt,
                  blocks:
                    requiredString(row, "state") !== "terminal" ||
                    receipt.state === "accepted" ||
                    receipt.state === "running" ||
                    receipt.state === "delivery_unknown" ||
                    receipt.state === "outcome_unknown",
                };
              })
              .find((candidate) => candidate.blocks)?.receipt;
            if (blockingReceipt) {
              if (
                blockingReceipt.state === "delivery_unknown" ||
                blockingReceipt.state === "outcome_unknown"
              ) {
                throw new ProductFailure(
                  "PRODUCT_RUN_UNRESOLVED",
                  "This Conversation has an unresolved Engine dispatch. The item remains in the editable Queue until reconciliation settles it.",
                  true,
                );
              }
              throw new ProductFailure(
                "PRODUCT_RUN_ACTIVE",
                "This Conversation already owns a nonterminal Engine dispatch. The item remains in the editable Queue.",
                true,
              );
            }
            const queueItem = readQueue(input.conversationId).find(
              (item) => item.id === input.itemId,
            );
            if (!queueItem)
              throw new ProductFailure("PRODUCT_QUEUE_ITEM_NOT_FOUND", "Queue item was not found.");
            if (queueItem.revision !== input.expectedRevision) {
              throw new ProductFailure(
                "PRODUCT_QUEUE_REVISION_CONFLICT",
                "The Queue item changed before admission.",
                true,
              );
            }
            assertDispatchableSelection(queueItem.requestedSelection);
            const workspaceId = readSummary(input.conversationId).workspaceId;
            const workspace = readWorkspace(workspaceId);
            assertResourceAuthority(workspace, queueItem.resources);
            const timestamp = productIsoNow();
            const pendingReceipt: ProductDispatchReceipt = {
              state: "pending",
              lastConfirmedBoundary: "pre-send",
              blocked: null,
            };
            statement(
              `INSERT INTO product_entries(entry_id, conversation_id, run_id, role, body, created_at)
           VALUES (?, ?, ?, 'user', ?, ?)`,
            ).run(input.entryId, input.conversationId, input.runId, queueItem.text, timestamp);
            statement(
              `INSERT INTO product_runs(
             run_id, conversation_id, entry_id, requested_selection_json,
             workspace_observation_json, package_generation, receipt_id, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ).run(
              input.runId,
              input.conversationId,
              input.entryId,
              encodeJson(ProductSelectedRuntime, queueItem.requestedSelection),
              encodeJson(ProductWorkspace, workspace),
              queueItem.requestedSelection.packageGeneration,
              input.receiptId,
              timestamp,
              timestamp,
            );
            for (const resource of queueItem.resources) {
              statement(
                `INSERT INTO product_resource_refs(resource_id, conversation_id, run_id, resource_json)
             VALUES (?, ?, ?, ?)`,
              ).run(
                resource.id,
                input.conversationId,
                input.runId,
                encodeJson(ProductResourceRef, resource),
              );
            }
            statement(
              `INSERT INTO product_operation_receipts(
             receipt_id, dispatch_id, run_id, receipt_json, updated_at
           ) VALUES (?, ?, ?, ?, ?)`,
            ).run(
              input.receiptId,
              input.dispatchId,
              input.runId,
              encodeJson(ProductDispatchReceipt, pendingReceipt),
              timestamp,
            );
            statement(
              `INSERT INTO product_outbox(
             dispatch_id, run_id, state, send_boundary, attempt_count,
             automatic_replay_count, engine_id, prepared_selection_json, updated_at
           ) VALUES (?, ?, 'pending', 'pre-send', 0, 0, ?, ?, ?)`,
            ).run(
              input.dispatchId,
              input.runId,
              queueItem.requestedSelection.engineId,
              prepared?.resolvedSelection
                ? encodeJson(ProductResolvedSelection, prepared.resolvedSelection)
                : null,
              timestamp,
            );
            statement(
              `INSERT INTO product_submit_admissions(dispatch_id, request_json)
           VALUES (?, ?)`,
            ).run(input.dispatchId, encodeJson(ProductSubmitQueueItemInput, input));
            const run = readRun(input.runId);
            statement(
              "DELETE FROM product_queue_items WHERE queue_item_id = ? AND conversation_id = ?",
            ).run(input.itemId, input.conversationId);
            const entry = decode(ProductEntry, {
              id: input.entryId,
              conversationId: input.conversationId,
              runId: input.runId,
              role: "user",
              text: queueItem.text,
              createdAt: timestamp,
            });
            appendFact(input.conversationId, {
              kind: "entry-admitted",
              conversationId: input.conversationId,
              entry,
              run,
            });
            appendFact(input.conversationId, {
              kind: "queue-changed",
              conversationId: input.conversationId,
              queue: readQueue(input.conversationId),
            });
            return snapshot(input.conversationId);
          });
        } catch (cause) {
          if (prepared) void prepared.close();
          throw cause;
        }
      });
      if (prepared) preparedExecutions.set(input.dispatchId, prepared);
      return admitted;
    });

  const applyExecutionObservation = (
    dispatchId: ProductDispatchId,
    observation: ProductExecutionObservation,
  ): void => {
    const raw = statement(
      `SELECT run_id, engine_id, state, send_boundary FROM product_outbox WHERE dispatch_id = ?`,
    ).get(dispatchId);
    if (!raw) throw new ProductFailure("PRODUCT_DISPATCH_NOT_FOUND", "Dispatch was not found.");
    const row = asRecord(raw);
    const runId = requiredString(row, "run_id");
    const currentBoundary = requiredString(row, "send_boundary") as ProductSendBoundary;
    if (requiredString(row, "state") === "terminal") return;
    if (observation.kind === "pre-send-failure") {
      if (currentBoundary !== "pre-send") {
        throw new ProductFailure(
          "PRODUCT_SEND_BOUNDARY_CONTRADICTION",
          "A pre-send failure cannot be recorded after the send boundary.",
        );
      }
      if (!observation.retryable) {
        throw new ProductFailure(
          "PRODUCT_ENGINE_PREPARE_REJECTED",
          "The selected Engine rejected preparation before send.",
        );
      }
      const selectedRun = readRun(runId);
      const selectedEngineId = selectedRun.requestedSelection.engineId;
      if (selectedEngineId !== requiredString(row, "engine_id")) {
        throw new ProductFailure(
          "PRODUCT_ENGINE_IDENTITY_CONFLICT",
          "The pre-send observation contradicts the admitted Run Engine.",
        );
      }
      updateReceipt(
        runId,
        {
          state: "pending",
          lastConfirmedBoundary: "pre-send",
          blocked: usesEngineSessionExecution(selectedRun)
            ? {
                kind: "selected-engine-unavailable",
                code: observation.code,
                message: observation.message,
                retryable: true,
                observedAt: productIsoNow(),
              }
            : null,
        },
        "pending",
        "pre-send",
      );
      return;
    }
    if (observation.kind === "rejected") {
      updateReceipt(
        runId,
        {
          state: "rejected",
          code: observation.code,
          message: observation.message,
          retryable: observation.retryable,
        },
        "terminal",
        currentBoundary,
      );
      return;
    }
    if (currentBoundary === "pre-send") {
      throw new ProductFailure(
        "PRODUCT_SEND_BOUNDARY_CONTRADICTION",
        "Accepted or indeterminate execution cannot precede the durable send boundary.",
      );
    }
    if (observation.kind === "indeterminate") {
      const currentReceipt = readRun(runId).receipt.receipt;
      updateReceipt(
        runId,
        {
          state: "delivery_unknown",
          lastConfirmedBoundary:
            observation.lastConfirmedBoundary === "sent" ? "local-write" : "acceptance-ack",
          abort: "abort" in currentReceipt ? currentReceipt.abort : null,
        },
        "terminal",
        "sent",
      );
      return;
    }
    const run = readRun(runId);
    const abortEvidence = "abort" in run.receipt.receipt ? run.receipt.receipt.abort : null;
    const existingBinding = statement(
      `SELECT binding_id, engine_id, lineage_ref FROM product_engine_bindings WHERE run_id = ?`,
    ).get(runId);
    if (existingBinding) {
      const existing = asRecord(existingBinding);
      if (
        requiredString(existing, "binding_id") !== observation.engineBinding.id ||
        requiredString(existing, "engine_id") !== observation.engineBinding.engineId ||
        requiredString(existing, "lineage_ref") !== observation.engineBinding.lineageRef
      ) {
        throw new ProductFailure(
          "PRODUCT_ENGINE_BINDING_CONFLICT",
          "Execution observation contradicted the established Engine binding.",
        );
      }
    } else
      statement(
        `INSERT INTO product_engine_bindings(
         binding_id, conversation_id, run_id, engine_id, lineage_ref
       ) VALUES (?, ?, ?, ?, ?)`,
      ).run(
        observation.engineBinding.id,
        run.conversationId,
        runId,
        observation.engineBinding.engineId,
        observation.engineBinding.lineageRef,
      );
    if (observation.kind === "observed-settled") {
      updateReceipt(
        runId,
        {
          state: "settled",
          evidence: { kind: "observed-delivery", observedAt: observation.settledAt },
          engineBinding: observation.engineBinding,
          resolvedSelection: observation.resolvedSelection,
          outcome: observation.outcome,
          settledAt: observation.settledAt,
          abort: abortEvidence,
        },
        "terminal",
        "observed",
      );
      return;
    }
    if (observation.kind === "observed-outcome-unknown") {
      updateReceipt(
        runId,
        {
          state: "outcome_unknown",
          evidence: { kind: "observed-delivery", observedAt: productIsoNow() },
          engineBinding: observation.engineBinding,
          resolvedSelection: observation.resolvedSelection,
          abort: abortEvidence,
        },
        "terminal",
        "observed",
      );
      return;
    }
    updateReceipt(
      runId,
      {
        state: "accepted",
        operationRef: observation.operationRef,
        engineBinding: observation.engineBinding,
        resolvedSelection: observation.resolvedSelection,
        abort: abortEvidence,
      },
      "terminal",
      "accepted",
    );
  };

  const dispatchPendingInternal = (
    dispatchId: ProductDispatchId | undefined,
    explicitRetry: boolean,
  ): Effect.Effect<void, ProductControlPlaneError> =>
    Effect.gen(function* () {
      const rows = yield* effect(() =>
        dispatchId
          ? statement(
              `SELECT dispatch_id, run_id, engine_id, prepared_selection_json FROM product_outbox
               WHERE dispatch_id = ? AND state = 'pending' AND send_boundary = 'pre-send'`,
            ).all(dispatchId)
          : statement(
              `SELECT dispatch_id, run_id, engine_id, prepared_selection_json FROM product_outbox
               WHERE state = 'pending' AND send_boundary = 'pre-send'
               ORDER BY updated_at ASC, dispatch_id ASC`,
            ).all(),
      );
      for (const raw of rows) {
        const row = asRecord(raw);
        const currentDispatchId = decode(
          ProductSubmitQueueItemInput.fields.dispatchId,
          requiredString(row, "dispatch_id"),
        );
        const runId = requiredString(row, "run_id");
        const engineId = requiredString(row, "engine_id");
        const admittedRun = yield* effect(() => readRun(runId));
        let repreparedHere = false;
        if (usesEngineSessionExecution(admittedRun) && !preparedExecutions.has(currentDispatchId)) {
          const durable = yield* effect(() => {
            const run = admittedRun;
            if (run.requestedSelection.engineId !== engineId)
              throw new ProductFailure(
                "PRODUCT_ENGINE_IDENTITY_CONFLICT",
                "The pending dispatch Engine contradicts its admitted Run.",
              );
            const entry = statement("SELECT body FROM product_entries WHERE entry_id = ?").get(
              run.entryId,
            );
            if (!entry)
              throw new ProductFailure(
                "PRODUCT_ENTRY_NOT_FOUND",
                "The admitted Product entry was not found.",
              );
            const frozenSelection = nullableString(row, "prepared_selection_json");
            if (!frozenSelection)
              throw new ProductFailure(
                "PRODUCT_PREPARED_SELECTION_MISSING",
                "The external Run has no frozen prepared selection.",
              );
            const decodedFrozenSelection = decodeJson(ProductResolvedSelection, frozenSelection);
            if (decodedFrozenSelection.engineId !== engineId)
              throw new ProductFailure(
                "PRODUCT_PREPARED_SELECTION_CONFLICT",
                "The frozen prepared selection contradicts the pending dispatch Engine.",
              );
            return {
              run,
              text: requiredString(asRecord(entry), "body"),
              frozenSelection: decodedFrozenSelection,
              priorLineageRef: compatiblePriorLineageRef(
                run.conversationId,
                run.requestedSelection.engineId,
              ),
            };
          });
          if (!explicitRetry) {
            yield* effect(() =>
              withTransaction(() =>
                updateReceipt(
                  runId,
                  {
                    state: "pending",
                    lastConfirmedBoundary: "pre-send",
                    blocked: {
                      kind: "selected-engine-unavailable",
                      code: "EXTERNAL_ENGINE_PREPARE_REQUIRED",
                      message:
                        "Nothing was sent. The selected Engine must be prepared again before an explicit Retry.",
                      retryable: true,
                      observedAt: productIsoNow(),
                    },
                  },
                  "pending",
                  "pre-send",
                ),
              ),
            );
            continue;
          }
          if (!executionBoundary.prepare) {
            return yield* Effect.fail(
              new ProductControlPlaneError({
                code: "PRODUCT_ENGINE_UNAVAILABLE",
                message: "The selected external Engine cannot prepare this pending Run.",
                retryable: true,
              }),
            );
          }
          const prepared = yield* executionBoundary
            .prepare({
              dispatchId: currentDispatchId,
              conversationId: durable.run.conversationId,
              runId: durable.run.id,
              requestedSelection: durable.run.requestedSelection,
              workspace: durable.run.workspaceObservation,
              resources: durable.run.resources,
              text: durable.text,
              priorLineageRef: durable.priorLineageRef,
            })
            .pipe(
              Effect.catch((cause) =>
                cause.retryable
                  ? effect(() =>
                      withTransaction(() =>
                        updateReceipt(
                          runId,
                          {
                            state: "pending",
                            lastConfirmedBoundary: "pre-send",
                            blocked: {
                              kind: "selected-engine-unavailable",
                              code: cause.code,
                              message: cause.message,
                              retryable: true,
                              observedAt: productIsoNow(),
                            },
                          },
                          "pending",
                          "pre-send",
                        ),
                      ),
                    ).pipe(Effect.flatMap(() => Effect.fail(cause)))
                  : effect(() =>
                      withTransaction(() =>
                        updateReceipt(
                          runId,
                          {
                            state: "rejected",
                            code: cause.code,
                            message: cause.message,
                            retryable: false,
                          },
                          "terminal",
                          "pre-send",
                        ),
                      ),
                    ).pipe(Effect.flatMap(() => Effect.fail(cause))),
              ),
            );
          if (
            prepared.engineId !== engineId ||
            !prepared.resolvedSelection ||
            encodeJson(ProductResolvedSelection, prepared.resolvedSelection) !==
              encodeJson(ProductResolvedSelection, durable.frozenSelection)
          ) {
            yield* Effect.promise(() => prepared.close());
            yield* effect(() =>
              withTransaction(() =>
                updateReceipt(
                  runId,
                  {
                    state: "rejected",
                    code: "PRODUCT_PREPARED_SELECTION_CONFLICT",
                    message: "The selected external Engine no longer matches the admitted Run.",
                    retryable: false,
                  },
                  "terminal",
                  "pre-send",
                ),
              ),
            );
            return yield* Effect.fail(
              new ProductControlPlaneError({
                code: "PRODUCT_PREPARED_SELECTION_CONFLICT",
                message: "The selected external Engine no longer matches the admitted Run.",
                retryable: false,
              }),
            );
          }
          preparedExecutions.set(currentDispatchId, prepared);
          repreparedHere = true;
        }
        const claimed = yield* effect(() =>
          statement(
            `UPDATE product_outbox
             SET state = 'sending', updated_at = ?
             WHERE dispatch_id = ? AND state = 'pending' AND send_boundary = 'pre-send'
               AND NOT EXISTS (
                 SELECT 1
                 FROM product_runs current_run
                 JOIN product_runs other_run
                   ON other_run.conversation_id = current_run.conversation_id
                  AND other_run.run_id <> current_run.run_id
                 JOIN product_outbox other_outbox ON other_outbox.run_id = other_run.run_id
                 JOIN product_operation_receipts other_receipt
                   ON other_receipt.run_id = other_run.run_id
                 WHERE current_run.run_id = product_outbox.run_id
                   AND (
                     other_outbox.state = 'sending'
                     OR json_extract(other_receipt.receipt_json, '$.state') IN (
                       'accepted', 'running', 'delivery_unknown', 'outcome_unknown'
                     )
                   )
               )
             RETURNING dispatch_id`,
          ).get(productIsoNow(), currentDispatchId),
        );
        if (!claimed) {
          if (repreparedHere) {
            const prepared = preparedExecutions.get(currentDispatchId);
            preparedExecutions.delete(currentDispatchId);
            if (prepared) yield* Effect.promise(() => prepared.close());
          }
          continue;
        }
        const preparedExecution = preparedExecutions.get(currentDispatchId) ?? null;
        const observation = yield* executionBoundary
          .attempt({
            dispatchId: currentDispatchId,
            run: yield* effect(() => readRun(runId)),
            text: yield* effect(() => {
              const run = readRun(runId);
              const row = statement("SELECT body FROM product_entries WHERE entry_id = ?").get(
                run.entryId,
              );
              if (!row) {
                throw new ProductFailure(
                  "PRODUCT_ENTRY_NOT_FOUND",
                  "The admitted Product entry was not found.",
                );
              }
              return requiredString(asRecord(row), "body");
            }),
            priorLineageRef: yield* effect(() => {
              const run = readRun(runId);
              return compatiblePriorLineageRef(run.conversationId, run.requestedSelection.engineId);
            }),
            prepared: preparedExecution,
            markSent: () =>
              effect(() =>
                withTransaction(() => {
                  const changed = statement(
                    `UPDATE product_outbox
                     SET send_boundary = 'sent', attempt_count = attempt_count + 1, updated_at = ?
                     WHERE dispatch_id = ? AND state = 'sending' AND send_boundary = 'pre-send'
                     RETURNING dispatch_id`,
                  ).get(productIsoNow(), currentDispatchId);
                  if (!changed) {
                    throw new ProductFailure(
                      "PRODUCT_SEND_BOUNDARY_CONFLICT",
                      "Dispatch send boundary could not be persisted before sending.",
                    );
                  }
                  if (preparedExecution?.resolvedSelection) {
                    updateReceipt(
                      runId,
                      {
                        state: "sent",
                        lastConfirmedBoundary: "local-write",
                        resolvedSelection: preparedExecution.resolvedSelection,
                        abort: null,
                      },
                      "sending",
                      "sent",
                    );
                  }
                }),
              ),
          })
          .pipe(
            Effect.map((value): ProductExecutionObservation | null => value),
            Effect.catch((cause) =>
              effect(() =>
                withTransaction(() => {
                  const current = statement(
                    `SELECT run_id, send_boundary FROM product_outbox WHERE dispatch_id = ?`,
                  ).get(currentDispatchId);
                  if (!current) {
                    throw new ProductFailure(
                      "PRODUCT_DISPATCH_NOT_FOUND",
                      "Dispatch was not found.",
                    );
                  }
                  const currentRow = asRecord(current);
                  if (requiredString(currentRow, "send_boundary") === "sent") {
                    const currentReceipt = readRun(requiredString(currentRow, "run_id")).receipt
                      .receipt;
                    updateReceipt(
                      requiredString(currentRow, "run_id"),
                      {
                        state: "delivery_unknown",
                        lastConfirmedBoundary: "local-write",
                        abort: "abort" in currentReceipt ? currentReceipt.abort : null,
                      },
                      "terminal",
                      "sent",
                    );
                    return true;
                  }
                  statement(
                    `UPDATE product_outbox SET state = 'pending', updated_at = ?
                     WHERE dispatch_id = ? AND send_boundary = 'pre-send'`,
                  ).run(productIsoNow(), currentDispatchId);
                  return false;
                }),
              ).pipe(
                Effect.flatMap((settledUnknown) =>
                  settledUnknown ? Effect.succeed(null) : Effect.fail(cause),
                ),
              ),
            ),
          );
        if (observation) {
          yield* effect(() => {
            try {
              withTransaction(() => applyExecutionObservation(currentDispatchId, observation));
              const observedRun = readRun(runId);
              executionBoundary.afterObservationApplied?.(
                decode(ProductRun.fields.id, runId),
                observedRun.requestedSelection.engineId,
                observation,
              );
            } catch (cause) {
              if (
                cause instanceof ProductFailure &&
                cause.code === "PRODUCT_SEND_BOUNDARY_CONTRADICTION"
              ) {
                withTransaction(() => {
                  statement(
                    `UPDATE product_outbox SET state = 'pending', updated_at = ?
                     WHERE dispatch_id = ? AND state = 'sending' AND send_boundary = 'pre-send'`,
                  ).run(productIsoNow(), currentDispatchId);
                });
              }
              throw cause;
            }
          });
        }
        const prepared = preparedExecutions.get(currentDispatchId);
        if (prepared) {
          preparedExecutions.delete(currentDispatchId);
          yield* Effect.promise(() => prepared.close());
        }
      }
    });

  const dispatchPending: ProductControlPlaneShape["dispatchPending"] = (dispatchId) =>
    dispatchPendingInternal(dispatchId, false);

  const retryDispatch: ProductControlPlaneShape["retryDispatch"] = (input) =>
    Effect.gen(function* () {
      const eligibility = yield* effect(() => {
        const raw = statement(
          `SELECT r.conversation_id, o.run_id, o.state, o.send_boundary, o.attempt_count,
                  o.automatic_replay_count, o.engine_id, receipt.receipt_json
           FROM product_outbox o
           JOIN product_runs r ON r.run_id = o.run_id
           JOIN product_operation_receipts receipt ON receipt.run_id = o.run_id
           WHERE o.dispatch_id = ?`,
        ).get(input.dispatchId);
        if (!raw) throw new ProductFailure("PRODUCT_DISPATCH_NOT_FOUND", "Dispatch was not found.");
        const row = asRecord(raw);
        if (requiredString(row, "conversation_id") !== input.conversationId)
          throw new ProductFailure(
            "PRODUCT_DISPATCH_IDENTITY_CONFLICT",
            "Dispatch does not belong to the requested Conversation.",
          );
        const receipt = decodeJson(ProductDispatchReceipt, requiredString(row, "receipt_json"));
        const alreadyAdvanced =
          requiredString(row, "state") !== "pending" ||
          requiredString(row, "send_boundary") !== "pre-send";
        if (alreadyAdvanced) return { alreadyAdvanced: true } as const;
        if (
          requiredNumber(row, "attempt_count") !== 0 ||
          requiredNumber(row, "automatic_replay_count") !== 0 ||
          !usesEngineSessionExecution(readRun(requiredString(row, "run_id"))) ||
          receipt.state !== "pending" ||
          receipt.blocked?.kind !== "selected-engine-unavailable" ||
          !receipt.blocked.retryable
        ) {
          throw new ProductFailure(
            "PRODUCT_DISPATCH_RETRY_INELIGIBLE",
            "Only a blocked external dispatch that has not crossed the send boundary can be retried.",
          );
        }
        return { alreadyAdvanced: false } as const;
      });
      if (!eligibility.alreadyAdvanced) {
        yield* dispatchPendingInternal(input.dispatchId, true);
      }
      return decode(ProductSubmitResult, {
        snapshot: yield* getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: input.conversationId,
        }),
        automaticReplayCount: 0,
      });
    });

  const submitQueueItem: ProductControlPlaneShape["submitQueueItem"] = (input) =>
    Effect.gen(function* () {
      const recordedAdmission = yield* effect(() =>
        statement("SELECT request_json FROM product_submit_admissions WHERE dispatch_id = ?").get(
          input.dispatchId,
        ),
      );
      if (recordedAdmission) {
        const requestJson = requiredString(asRecord(recordedAdmission), "request_json");
        if (requestJson !== encodeJson(ProductSubmitQueueItemInput, input)) {
          return yield* Effect.fail(
            new ProductControlPlaneError({
              code: "PRODUCT_SUBMIT_IDENTITY_CONFLICT",
              message: "Dispatch identity was already admitted with different Queue input.",
              retryable: false,
            }),
          );
        }
        const receiptRow = yield* effect(() =>
          statement(
            "SELECT receipt_json FROM product_operation_receipts WHERE dispatch_id = ?",
          ).get(input.dispatchId),
        );
        const receipt = receiptRow
          ? decodeJson(ProductDispatchReceipt, requiredString(asRecord(receiptRow), "receipt_json"))
          : null;
        if (
          receipt?.state === "pending" &&
          receipt.blocked?.kind === "selected-engine-unavailable"
        ) {
          return yield* retryDispatch({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId: input.conversationId,
            dispatchId: input.dispatchId,
          });
        }
      } else {
        yield* admitQueueItem(input);
      }
      yield* dispatchPending(input.dispatchId);
      return decode(ProductSubmitResult, {
        snapshot: yield* getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: input.conversationId,
        }),
        automaticReplayCount: 0,
      });
    });

  const readFacts: ProductControlPlaneShape["readFacts"] = (input) =>
    Effect.gen(function* () {
      const isShell = input.scope.kind === "shell";
      if (isShell) yield* observeRuntimeCatalog();
      return yield* effect(() => {
        const highWaterRaw = isShell
          ? statement(
              "SELECT COALESCE(MAX(global_sequence), 0) AS high_water FROM product_facts",
            ).get()
          : statement(
              `SELECT detail_sequence AS high_water FROM product_conversations
             WHERE conversation_id = ?`,
            ).get(input.scope.conversationId);
        if (!highWaterRaw) {
          throw new ProductFailure("PRODUCT_CONVERSATION_NOT_FOUND", "Conversation was not found.");
        }
        const highWaterSequence = requiredNumber(asRecord(highWaterRaw), "high_water");
        if (input.afterSequence > highWaterSequence) {
          return decode(ProductFactBatch, {
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            scope: input.scope,
            afterSequence: input.afterSequence,
            highWaterSequence,
            facts: [],
            resnapshotRequired: true,
            reason: "cursor-ahead",
          });
        }
        const countRaw = isShell
          ? statement("SELECT COUNT(*) AS count FROM product_facts WHERE global_sequence > ?").get(
              input.afterSequence,
            )
          : statement(
              `SELECT COUNT(*) AS count FROM product_facts
             WHERE conversation_id = ? AND conversation_sequence > ?`,
            ).get(input.scope.conversationId, input.afterSequence);
        const count = countRaw ? requiredNumber(asRecord(countRaw), "count") : 0;
        if (count > input.limit || count > PRODUCT_MAX_FACTS_PER_BATCH) {
          return decode(ProductFactBatch, {
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            scope: input.scope,
            afterSequence: input.afterSequence,
            highWaterSequence,
            facts: [],
            resnapshotRequired: true,
            reason: "overflow",
          });
        }
        const rows = isShell
          ? statement(
              `SELECT global_sequence AS sequence, fact_id, conversation_id, workspace_id, group_id,
                    emitted_at,
                    shell_change_json AS change_json
             FROM product_facts WHERE global_sequence > ?
             ORDER BY global_sequence ASC LIMIT ?`,
            ).all(input.afterSequence, input.limit)
          : statement(
              `SELECT conversation_sequence AS sequence, fact_id, conversation_id,
                    emitted_at, detail_change_json AS change_json
             FROM product_facts
             WHERE conversation_id = ? AND conversation_sequence > ?
             ORDER BY conversation_sequence ASC LIMIT ?`,
            ).all(input.scope.conversationId, input.afterSequence, input.limit);
        const facts = rows.map((raw) => {
          const row = asRecord(raw);
          const common = {
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            sequence: requiredNumber(row, "sequence"),
            factId: requiredString(row, "fact_id"),
            emittedAt: requiredString(row, "emitted_at"),
          };
          if (isShell) {
            const scopeIdentity =
              typeof row.conversation_id === "string"
                ? { conversationId: row.conversation_id }
                : typeof row.workspace_id === "string"
                  ? { workspaceId: row.workspace_id }
                  : typeof row.group_id === "string"
                    ? { groupId: row.group_id }
                    : {};
            return decode(ProductShellFact, {
              ...common,
              ...scopeIdentity,
              change: decodeJson(ProductShellFactChange, requiredString(row, "change_json")),
            });
          }
          return decode(ProductDetailFact, {
            ...common,
            conversationId: requiredString(row, "conversation_id"),
            change: decodeJson(ProductDetailFactChange, requiredString(row, "change_json")),
          });
        });
        return decode(ProductFactBatch, {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          scope: input.scope,
          afterSequence: input.afterSequence,
          highWaterSequence,
          facts,
          resnapshotRequired: false,
        });
      });
    });

  const recoverDispatches: ProductControlPlaneShape["recoverDispatches"] = () =>
    effect(() =>
      withTransaction(() => {
        const sent = statement(
          `SELECT dispatch_id, run_id, send_boundary FROM product_outbox
           WHERE state = 'sending' AND send_boundary <> 'pre-send'`,
        ).all();
        for (const raw of sent) {
          const row = asRecord(raw);
          const runId = requiredString(row, "run_id");
          const boundary = requiredString(row, "send_boundary") as ProductSendBoundary;
          const currentReceipt = readRun(runId).receipt.receipt;
          if (boundary === "accepted" || boundary === "observed") {
            if (currentReceipt.state !== "accepted" && currentReceipt.state !== "running") {
              throw new ProductFailure(
                "PRODUCT_SEND_BOUNDARY_CONTRADICTION",
                "The durable Engine boundary contradicted its execution receipt during recovery.",
              );
            }
            const evidence =
              currentReceipt.state === "accepted"
                ? {
                    kind: "accepted-operation" as const,
                    operationRef: currentReceipt.operationRef,
                  }
                : currentReceipt.evidence;
            const expectedBoundary = evidenceSendBoundary(evidence);
            if (boundary !== expectedBoundary) {
              throw new ProductFailure(
                "PRODUCT_SEND_BOUNDARY_CONTRADICTION",
                "The durable Engine boundary contradicted its execution evidence during recovery.",
              );
            }
            updateReceipt(
              runId,
              {
                state: "outcome_unknown",
                evidence,
                engineBinding: currentReceipt.engineBinding,
                resolvedSelection: currentReceipt.resolvedSelection,
                abort: currentReceipt.abort,
              },
              "terminal",
              expectedBoundary,
            );
            continue;
          }
          if (boundary !== "sent") {
            throw new ProductFailure(
              "PRODUCT_SEND_BOUNDARY_CONTRADICTION",
              "The durable post-send boundary contradicted its execution receipt during recovery.",
            );
          }
          updateReceipt(
            runId,
            {
              state: "delivery_unknown",
              lastConfirmedBoundary: "local-write",
              abort: "abort" in currentReceipt ? currentReceipt.abort : null,
            },
            "terminal",
            "sent",
          );
        }
        statement(
          `UPDATE product_outbox SET state = 'pending', updated_at = ?
           WHERE state = 'sending' AND send_boundary = 'pre-send'`,
        ).run(productIsoNow());
      }),
    );

  const observeRun: ProductControlPlaneShape["observeRun"] = (runId, observation) =>
    effect(() =>
      withTransaction(() => {
        const run = readRun(runId);
        const current = run.receipt.receipt;
        if (current.state !== "accepted" && current.state !== "running") {
          throw new ProductFailure(
            "PRODUCT_RUN_OBSERVATION_REJECTED",
            "Run observations require an accepted operation receipt.",
          );
        }
        if (observation.kind === "running") {
          const source = current.state === "accepted" ? current : current;
          const evidence =
            source.state === "accepted"
              ? { kind: "accepted-operation" as const, operationRef: source.operationRef }
              : source.evidence;
          updateReceipt(
            runId,
            {
              state: "running",
              evidence,
              engineBinding: source.engineBinding,
              resolvedSelection: source.resolvedSelection,
              abort: source.abort,
            },
            "terminal",
            evidenceSendBoundary(evidence),
          );
          return;
        }
        if (observation.kind === "outcome_unknown") {
          const evidence =
            current.state === "accepted"
              ? { kind: "accepted-operation" as const, operationRef: current.operationRef }
              : current.evidence;
          updateReceipt(
            runId,
            {
              state: "outcome_unknown",
              evidence,
              engineBinding: current.engineBinding,
              resolvedSelection: current.resolvedSelection,
              abort: current.abort,
            },
            "terminal",
            evidenceSendBoundary(evidence),
          );
          return;
        }
        const evidence =
          current.state === "accepted"
            ? { kind: "accepted-operation" as const, operationRef: current.operationRef }
            : current.evidence;
        updateReceipt(
          runId,
          {
            state: "settled",
            evidence,
            engineBinding: current.engineBinding,
            resolvedSelection: current.resolvedSelection,
            outcome: observation.outcome,
            settledAt: observation.settledAt,
            abort: current.abort,
          },
          "terminal",
          evidenceSendBoundary(evidence),
        );
      }),
    );

  const applyRuntimeFacts = (
    runId: ProductRunId,
    facts: ReadonlyArray<ProductExecutionFact>,
  ): void => {
    const run = readRun(runId);
    const cursorRow = statement(
      "SELECT engine_sequence FROM product_runtime_fact_cursors WHERE run_id = ?",
    ).get(runId);
    let engineCursor = cursorRow ? requiredNumber(asRecord(cursorRow), "engine_sequence") : 0;
    for (const fact of facts) {
      if (fact.engineSequence <= engineCursor) continue;
      if (fact.engineSequence !== engineCursor + 1) break;
      if (fact.kind === "assistant.delta") {
        const entryId = `${runId}:assistant`;
        const existing = statement(
          "SELECT body, created_at FROM product_entries WHERE entry_id = ?",
        ).get(entryId);
        const currentText = existing ? requiredString(asRecord(existing), "body") : "";
        const appendedText = fact.text.slice(
          0,
          Math.max(0, PRODUCT_MAX_TEXT_CHARS - currentText.length),
        );
        if (!appendedText) {
          engineCursor = fact.engineSequence;
          statement(
            `INSERT INTO product_runtime_fact_cursors(run_id, engine_sequence) VALUES (?, ?)
             ON CONFLICT(run_id) DO UPDATE SET engine_sequence = excluded.engine_sequence`,
          ).run(runId, engineCursor);
          continue;
        }
        const nextText = `${currentText}${appendedText}`;
        if (existing) {
          statement("UPDATE product_entries SET body = ? WHERE entry_id = ?").run(
            nextText,
            entryId,
          );
        } else {
          statement(
            `INSERT INTO product_entries(entry_id, conversation_id, run_id, role, body, created_at)
             VALUES (?, ?, ?, 'assistant', ?, ?)`,
          ).run(entryId, run.conversationId, runId, nextText, fact.emittedAt);
        }
        statement("INSERT OR IGNORE INTO product_streaming_entries(entry_id) VALUES (?)").run(
          entryId,
        );
        appendFact(run.conversationId, {
          kind: "entry-delta",
          conversationId: run.conversationId,
          entryId: decode(ProductEntry.fields.id, entryId),
          runId,
          delta: appendedText,
          createdAt: existing ? requiredString(asRecord(existing), "created_at") : fact.emittedAt,
        });
        engineCursor = fact.engineSequence;
        statement(
          `INSERT INTO product_runtime_fact_cursors(run_id, engine_sequence) VALUES (?, ?)
           ON CONFLICT(run_id) DO UPDATE SET engine_sequence = excluded.engine_sequence`,
        ).run(runId, engineCursor);
        continue;
      }

      const activity = (() => {
        switch (fact.kind) {
          case "session.bound":
            return {
              kind: "session" as const,
              detail: { code: "session-bound" as const, lineage: fact.lineage },
            };
          case "package.loaded":
            return {
              kind: "package" as const,
              detail: { code: "package-loaded" as const, count: fact.count },
            };
          case "package.failed":
            return {
              kind: "package" as const,
              detail: { code: "package-failed" as const, count: fact.count },
            };
          case "thinking.delta":
            return {
              kind: "thinking" as const,
              detail: { code: "thinking-delta" as const, text: fact.text },
            };
          case "question.requested":
            return {
              kind: "question" as const,
              detail: { code: "question-requested" as const, question: fact.question },
            };
          case "plan.updated":
            return {
              kind: "plan" as const,
              detail: { code: "plan-updated" as const, summary: fact.summary },
            };
          case "permission.requested":
            return {
              kind: "permission" as const,
              detail: {
                code: "permission-requested" as const,
                toolCallId: fact.toolCallId,
                title: fact.title,
              },
            };
          case "permission.rejected":
            return {
              kind: "permission" as const,
              detail: {
                code: "permission-rejected" as const,
                toolCallId: fact.toolCallId,
                reason: fact.reason,
              },
            };
          case "control.applied":
            return {
              kind: "control" as const,
              detail: {
                code: "control-applied" as const,
                control: fact.control,
                text: fact.text,
              },
            };
          case "tool.started":
            return {
              kind: "tool" as const,
              detail: { code: "tool-started" as const, toolName: fact.toolName },
            };
          case "tool.settled":
            return {
              kind: "tool" as const,
              detail: {
                code: "tool-settled" as const,
                toolName: fact.toolName,
                outcome: fact.outcome,
              },
            };
          case "usage":
            return {
              kind: "usage" as const,
              detail: {
                code: "usage-observed" as const,
                input: fact.input,
                output: fact.output,
                cacheRead: fact.cacheRead,
                cacheWrite: fact.cacheWrite,
                total: fact.total,
              },
            };
          case "context.usage":
            return {
              kind: "usage" as const,
              detail: {
                code: "context-usage-observed" as const,
                used: fact.used,
                size: fact.size,
              },
            };
          case "settlement":
            return {
              kind: "settlement" as const,
              detail: { code: "run-settled" as const, outcome: fact.outcome },
            };
          default:
            return null;
        }
      })();
      if (!activity) continue;
      const exists = statement(
        `SELECT engine_sequence FROM product_runtime_activities
         WHERE run_id = ? AND engine_sequence = ?`,
      ).get(runId, fact.engineSequence);
      if (!exists) {
        statement(
          `INSERT INTO product_runtime_activities(
             run_id, engine_sequence, kind, summary, created_at
           ) VALUES (?, ?, ?, ?, ?)`,
        ).run(
          runId,
          fact.engineSequence,
          activity.kind,
          encodeJson(ProductRuntimeActivityDetail, activity.detail),
          fact.emittedAt,
        );
        appendFact(run.conversationId, {
          kind: "runtime-activity",
          conversationId: run.conversationId,
          activity: decode(ProductRuntimeActivity, {
            runId,
            engineSequence: fact.engineSequence,
            kind: activity.kind,
            detail: activity.detail,
            createdAt: fact.emittedAt,
          }),
        });
      }
      if (fact.kind === "settlement") {
        const assistantEntryId = `${runId}:assistant`;
        const assistantEntry = statement(
          "SELECT entry_id FROM product_entries WHERE entry_id = ?",
        ).get(assistantEntryId);
        if (assistantEntry) {
          statement("DELETE FROM product_streaming_entries WHERE entry_id = ?").run(
            assistantEntryId,
          );
          appendFact(run.conversationId, {
            kind: "entry-streaming",
            conversationId: run.conversationId,
            entryId: decode(ProductEntry.fields.id, assistantEntryId),
            streaming: false,
          });
        }
        const current = readRun(runId).receipt.receipt;
        if (current.state === "accepted" || current.state === "running") {
          const evidence =
            current.state === "accepted"
              ? { kind: "accepted-operation" as const, operationRef: current.operationRef }
              : current.evidence;
          updateReceipt(
            runId,
            {
              state: "settled",
              evidence,
              engineBinding: current.engineBinding,
              resolvedSelection: current.resolvedSelection,
              outcome: fact.outcome,
              settledAt: fact.emittedAt,
              abort: current.abort,
            },
            "terminal",
            evidenceSendBoundary(evidence),
          );
        }
      }
      engineCursor = fact.engineSequence;
      statement(
        `INSERT INTO product_runtime_fact_cursors(run_id, engine_sequence) VALUES (?, ?)
         ON CONFLICT(run_id) DO UPDATE SET engine_sequence = excluded.engine_sequence`,
      ).run(runId, engineCursor);
    }
  };

  const applyRuntimeSnapshot = (
    runId: ProductRunId,
    executionSnapshot: ProductExecutionSnapshot,
  ): void => {
    const run = readRun(runId);
    const current = run.receipt.receipt;
    if (current.state !== "accepted" && current.state !== "running") {
      return;
    }
    const entryId = decode(ProductEntry.fields.id, `${runId}:assistant`);
    const existingRaw = statement(
      "SELECT body, created_at FROM product_entries WHERE entry_id = ?",
    ).get(entryId);
    const existing = existingRaw ? asRecord(existingRaw) : null;
    const wasStreaming = Boolean(
      statement("SELECT entry_id FROM product_streaming_entries WHERE entry_id = ?").get(entryId),
    );
    if (executionSnapshot.assistant.length > 0) {
      const createdAt = existing
        ? requiredString(existing, "created_at")
        : executionSnapshot.settlement.settledAt;
      if (existing) {
        if (requiredString(existing, "body") !== executionSnapshot.assistant) {
          statement("UPDATE product_entries SET body = ? WHERE entry_id = ?").run(
            executionSnapshot.assistant,
            entryId,
          );
          appendFact(run.conversationId, {
            kind: "entry-replaced",
            conversationId: run.conversationId,
            entry: decode(ProductEntry, {
              id: entryId,
              conversationId: run.conversationId,
              runId,
              role: "assistant",
              text: executionSnapshot.assistant,
              createdAt,
            }),
          });
        }
      } else {
        statement(
          `INSERT INTO product_entries(entry_id, conversation_id, run_id, role, body, created_at)
           VALUES (?, ?, ?, 'assistant', ?, ?)`,
        ).run(entryId, run.conversationId, runId, executionSnapshot.assistant, createdAt);
        appendFact(run.conversationId, {
          kind: "entry-replaced",
          conversationId: run.conversationId,
          entry: decode(ProductEntry, {
            id: entryId,
            conversationId: run.conversationId,
            runId,
            role: "assistant",
            text: executionSnapshot.assistant,
            createdAt,
          }),
        });
      }
    } else if (existing) {
      statement("DELETE FROM product_entries WHERE entry_id = ?").run(entryId);
      appendFact(run.conversationId, {
        kind: "entry-removed",
        conversationId: run.conversationId,
        entryId,
      });
    }
    if (wasStreaming) {
      statement("DELETE FROM product_streaming_entries WHERE entry_id = ?").run(entryId);
      if (executionSnapshot.assistant.length > 0) {
        appendFact(run.conversationId, {
          kind: "entry-streaming",
          conversationId: run.conversationId,
          entryId,
          streaming: false,
        });
      }
    }
    const recoveryExists = statement(
      `SELECT snapshot_version FROM product_runtime_recoveries
       WHERE run_id = ? AND snapshot_version = ?`,
    ).get(runId, executionSnapshot.version);
    if (!recoveryExists) {
      const recovery = decode(ProductRuntimeRecovery, {
        runId,
        snapshotVersion: executionSnapshot.version,
        kind: "visible-result",
        createdAt: executionSnapshot.settlement.settledAt,
      });
      statement(
        `INSERT INTO product_runtime_recoveries(
           run_id, snapshot_version, kind, created_at
         ) VALUES (?, ?, ?, ?)`,
      ).run(recovery.runId, recovery.snapshotVersion, recovery.kind, recovery.createdAt);
      appendFact(run.conversationId, {
        kind: "runtime-recovered",
        conversationId: run.conversationId,
        recovery,
      });
    }
    const evidence =
      current.state === "accepted"
        ? { kind: "accepted-operation" as const, operationRef: current.operationRef }
        : current.evidence;
    updateReceipt(
      runId,
      {
        state: "settled",
        evidence,
        engineBinding: current.engineBinding,
        resolvedSelection: current.resolvedSelection,
        outcome: executionSnapshot.settlement.outcome,
        settledAt: executionSnapshot.settlement.settledAt,
        abort: current.abort,
      },
      "terminal",
      evidenceSendBoundary(evidence),
    );
  };

  executionBoundary.subscribeFacts?.((runId, incomingObservation, sourceEngineId) => {
    const observation =
      incomingObservation.kind === "delivery-accepted" ||
      incomingObservation.kind === "delivery-rejected"
        ? incomingObservation
        : decode(ProductExecutionUpdate, incomingObservation);
    withTransaction(() => {
      const outboxRaw = statement("SELECT engine_id FROM product_outbox WHERE run_id = ?").get(
        runId,
      );
      if (!outboxRaw) return;
      const durableEngineId = requiredString(asRecord(outboxRaw), "engine_id");
      if (
        (executionBoundary.sourceEngineBoundFacts && sourceEngineId === undefined) ||
        (sourceEngineId !== undefined && sourceEngineId !== durableEngineId) ||
        ("engineBinding" in observation &&
          observation.engineBinding.engineId !== durableEngineId) ||
        ("resolvedSelection" in observation &&
          observation.resolvedSelection.engineId !== durableEngineId)
      ) {
        return;
      }
      if (observation.kind === "delivery-accepted") {
        const run = readRun(runId);
        const current = run.receipt.receipt;
        if (current.state !== "delivery_unknown") return;
        const engineBinding = {
          id: ProductEngineBindingId.makeUnsafe(`pi-binding:${run.id}`),
          engineId: observation.resolvedSelection.engineId,
          lineageRef: observation.lineageRef,
        };
        statement(
          `INSERT INTO product_engine_bindings(
             binding_id, conversation_id, run_id, engine_id, lineage_ref
           ) VALUES (?, ?, ?, ?, ?)`,
        ).run(
          engineBinding.id,
          run.conversationId,
          runId,
          engineBinding.engineId,
          engineBinding.lineageRef,
        );
        updateReceipt(
          runId,
          {
            state: "accepted",
            operationRef: observation.operationRef,
            engineBinding,
            resolvedSelection: {
              ...observation.resolvedSelection,
              executionTarget: run.requestedSelection.executionTarget,
            },
            abort: null,
          },
          "terminal",
          "accepted",
        );
        return;
      }
      if (observation.kind === "delivery-rejected") {
        const current = readRun(runId).receipt.receipt;
        if (current.state !== "delivery_unknown") return;
        updateReceipt(
          runId,
          {
            state: "rejected",
            code: observation.code,
            message: observation.message,
            retryable: observation.retryable,
          },
          "terminal",
          "sent",
        );
        return;
      }
      if (observation.kind === "delivery-observed") {
        const run = readRun(runId);
        const current = run.receipt.receipt;
        const cursorRow = statement(
          "SELECT engine_sequence FROM product_runtime_fact_cursors WHERE run_id = ?",
        ).get(runId);
        const cursor = cursorRow ? requiredNumber(asRecord(cursorRow), "engine_sequence") : 0;
        if (current.state !== "sent" || observation.firstFact.engineSequence !== cursor + 1) return;
        statement(
          `INSERT INTO product_engine_bindings(
             binding_id, conversation_id, run_id, engine_id, lineage_ref
           ) VALUES (?, ?, ?, ?, ?)`,
        ).run(
          observation.engineBinding.id,
          run.conversationId,
          runId,
          observation.engineBinding.engineId,
          observation.engineBinding.lineageRef,
        );
        updateReceipt(
          runId,
          {
            state: "running",
            evidence: { kind: "observed-delivery", observedAt: observation.firstFact.emittedAt },
            engineBinding: observation.engineBinding,
            resolvedSelection: observation.resolvedSelection,
            abort: current.abort,
          },
          "sending",
          "observed",
        );
        applyRuntimeFacts(runId, [observation.firstFact]);
        return;
      }
      if (observation.kind === "facts") {
        applyRuntimeFacts(runId, observation.facts);
        return;
      }
      if (observation.kind === "snapshot") {
        applyRuntimeSnapshot(runId, observation.snapshot);
        return;
      }
      const current = readRun(runId).receipt.receipt;
      if (current.state !== "accepted" && current.state !== "running") return;
      const evidence =
        current.state === "accepted"
          ? { kind: "accepted-operation" as const, operationRef: current.operationRef }
          : current.evidence;
      updateReceipt(
        runId,
        {
          state: "outcome_unknown",
          evidence,
          engineBinding: current.engineBinding,
          resolvedSelection: current.resolvedSelection,
          abort: current.abort,
        },
        "terminal",
        evidenceSendBoundary(evidence),
      );
    });
  });

  if (executionBoundary.resumeFacts) {
    const accepted = statement(
      `SELECT run_id, receipt_json FROM product_operation_receipts ORDER BY updated_at ASC`,
    ).all();
    for (const raw of accepted) {
      const row = asRecord(raw);
      const receipt = decodeJson(ProductDispatchReceipt, requiredString(row, "receipt_json"));
      if (
        receipt.state === "accepted" ||
        (receipt.state === "running" && receipt.evidence.kind === "accepted-operation")
      ) {
        const runId = decode(ProductRun.fields.id, requiredString(row, "run_id"));
        const packageGeneration = readRun(runId).packageGeneration;
        if (packageGeneration)
          executionBoundary.bindRunPackageGeneration?.(runId, packageGeneration);
        const operationRef = receiptOperationRef(receipt);
        if (operationRef) executionBoundary.resumeFacts(runId, operationRef);
      }
    }
  }

  const inspectOutbox: ProductControlPlaneShape["inspectOutbox"] = () =>
    effect(() =>
      statement(
        `SELECT dispatch_id, run_id, engine_id, state, send_boundary, attempt_count,
                automatic_replay_count FROM product_outbox
         ORDER BY dispatch_id ASC`,
      )
        .all()
        .map((raw) => {
          const row = asRecord(raw);
          return {
            dispatchId: requiredString(row, "dispatch_id"),
            runId: requiredString(row, "run_id"),
            engineId: requiredString(row, "engine_id"),
            state: requiredString(row, "state") as ProductOutboxDiagnostic["state"],
            sendBoundary: requiredString(
              row,
              "send_boundary",
            ) as ProductOutboxDiagnostic["sendBoundary"],
            attemptCount: requiredNumber(row, "attempt_count"),
            automaticReplayCount: requiredNumber(row, "automatic_replay_count") as 0,
          };
        }),
    );

  return {
    createWorkspace,
    updateWorkspaceTitle,
    setWorkspacePinned,
    updateWorkspaceRunCommand,
    deleteWorkspace,
    createGroup,
    updateGroup,
    reorderGroups,
    deleteGroup,
    setConversationGroups,
    addConversationGroups,
    hasConversation,
    createConversation,
    updateConversationTitle,
    archiveConversation,
    restoreConversation,
    deleteConversation,
    setConversationPinned,
    updateConversationNotes,
    setConversationBoardState,
    addEntryPin,
    removeEntryPin,
    setEntryPinDone,
    setEntryPinLabel,
    addEntryMarker,
    removeEntryMarker,
    setEntryMarkerDone,
    setEntryMarkerLabel,
    getShellSnapshot,
    getConversationSnapshot,
    putQueueItem,
    reorderQueue,
    deleteQueueItem,
    admitQueueItem,
    submitQueueItem,
    retryDispatch,
    controlRun,
    readFacts,
    recoverDispatches,
    dispatchPending,
    observeRun,
    inspectOutbox,
  };
}

export function makeProductControlPlaneLayer(
  filename: string,
  executionBoundary: ProductExecutionBoundary = ProductExecutionUnavailable,
  runtimeCatalog: ProductRuntimeCatalog | null = null,
): Layer.Layer<ProductControlPlane, ProductControlPlaneError> {
  const acquire = Effect.tryPromise({
    try: async () => {
      if (filename !== ":memory:") ensurePrivateFileSync(filename);
      const lock =
        filename === ":memory:"
          ? null
          : await Effect.runPromise(acquireDatabaseLifecycleLock(filename));
      let database: PortableDatabase | undefined;
      try {
        database = await openPortableDatabase(filename);
        initializeSchema(database);
        return { database, lock };
      } catch (cause) {
        database?.close();
        if (lock) await Effect.runPromise(releaseDatabaseLifecycleLock(lock));
        throw cause;
      }
    },
    catch: (cause) =>
      new ProductControlPlaneError({
        code: "PRODUCT_DATABASE_LIFECYCLE_LOCKED",
        message:
          cause instanceof Error
            ? cause.message
            : "Product database lifecycle could not be acquired.",
        retryable: true,
      }),
  });
  return Layer.effect(
    ProductControlPlane,
    Effect.gen(function* () {
      const acquired = yield* Effect.acquireRelease(acquire, ({ database, lock }) =>
        Effect.promise(async () => {
          await executionBoundary.close?.();
          database.close();
          if (lock) await Effect.runPromise(releaseDatabaseLifecycleLock(lock));
        }),
      );
      const database = acquired.database;
      const controlPlane = makeControlPlane(database, executionBoundary, runtimeCatalog);
      yield* controlPlane.recoverDispatches();
      // Only pre-send pending rows are eligible. Unknown/accepted rows are terminal and never replayed.
      yield* controlPlane.dispatchPending();
      return controlPlane;
    }),
  );
}

export const ProductControlPlaneLive = Layer.unwrap(
  Effect.map(Effect.service(ServerConfig), ({ stateDir }) =>
    makeProductControlPlaneLayer(path.join(stateDir, PRODUCT_DATABASE_FILENAME)),
  ),
);
