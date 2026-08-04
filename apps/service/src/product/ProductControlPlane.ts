import { randomUUID } from "node:crypto";
import path from "node:path";

import {
  PRODUCT_MAX_FACTS_PER_BATCH,
  PRODUCT_MAX_TEXT_CHARS,
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductConversationReadModel,
  ProductConversationSnapshot,
  ProductConversationSummary,
  ProductControlRunInput,
  ProductControlRunResult,
  ProductCreateConversationInput,
  ProductDeleteQueueItemInput,
  ProductDispatchReceipt,
  ProductEntry,
  ProductEngineBindingId,
  ProductExecutionObservation,
  ProductFactBatch,
  ProductDetailFactChange,
  ProductDetailFact,
  ProductShellFactChange,
  ProductShellFact,
  ProductGetConversationInput,
  ProductOperationReceipt,
  ProductPutQueueItemInput,
  ProductQueueItem,
  ProductReadFactsInput,
  ProductReorderQueueInput,
  ProductRequestedSelection,
  ProductResourceRef,
  ProductRun,
  ProductRunObservation,
  ProductRuntimeActivity,
  ProductRuntimeActivityDetail,
  ProductRuntimeCatalog,
  ProductRuntimeRecovery,
  ProductShellSnapshot,
  ProductSubmitQueueItemInput,
  ProductSubmitResult,
  ProductWorkspace,
  ProductWorkspaceAccess,
  type NativeHostRuntimeFact,
  type NativeHostRuntimeSnapshot,
  type ProductDispatchId,
  type ProductResolvedSelection,
  type ProductRunId,
} from "@omnimind/contracts";
import { Effect, Layer, Schema, ServiceMap } from "effect";

import { ServerConfig } from "../config";
import { ensurePrivateFileSync } from "../privatePathPermissions";

export const PRODUCT_DATABASE_FILENAME = "product-state-v1.sqlite";
export const PRODUCT_SCHEMA_VERSION = 1;
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
    schema_version INTEGER NOT NULL CHECK (schema_version = 1)
  );

  CREATE TABLE IF NOT EXISTS product_workspaces (
    workspace_id TEXT PRIMARY KEY,
    access_json TEXT NOT NULL,
    observed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_conversations (
    conversation_id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES product_workspaces(workspace_id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
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

  CREATE TABLE IF NOT EXISTS product_runs (
    run_id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    entry_id TEXT NOT NULL UNIQUE REFERENCES product_entries(entry_id) ON DELETE RESTRICT,
    requested_selection_json TEXT NOT NULL,
    workspace_observation_json TEXT NOT NULL,
    package_generation TEXT NOT NULL,
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
    native_sequence INTEGER NOT NULL CHECK (native_sequence > 0),
    kind TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (run_id, native_sequence)
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
    native_sequence INTEGER NOT NULL CHECK (native_sequence >= 0)
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
    send_boundary TEXT NOT NULL CHECK (send_boundary IN ('pre-send', 'sent', 'accepted')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    automatic_replay_count INTEGER NOT NULL DEFAULT 0 CHECK (automatic_replay_count = 0),
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_facts (
    global_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    fact_id TEXT NOT NULL UNIQUE,
    conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    conversation_sequence INTEGER NOT NULL CHECK (conversation_sequence > 0),
    emitted_at TEXT NOT NULL,
    shell_change_json TEXT NOT NULL,
    detail_change_json TEXT NOT NULL,
    UNIQUE (conversation_id, conversation_sequence)
  );

  CREATE INDEX IF NOT EXISTS product_entries_by_conversation
    ON product_entries(conversation_id, created_at, entry_id);
  CREATE INDEX IF NOT EXISTS product_runs_by_conversation
    ON product_runs(conversation_id, created_at, run_id);
  CREATE INDEX IF NOT EXISTS product_queue_by_conversation
    ON product_queue_items(conversation_id, position);
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

export interface ProductExecutionBoundary {
  readonly preflight?: (input: {
    readonly dispatchId: ProductDispatchId;
    readonly run: ProductRun;
    readonly text: string;
    readonly priorLineageRef: string | null;
  }) => void;
  readonly attempt: (input: {
    readonly dispatchId: ProductDispatchId;
    readonly run: ProductRun;
    readonly text: string;
    readonly priorLineageRef: string | null;
    /** Must complete before any non-idempotent send crosses the process boundary. */
    readonly markSent: () => Effect.Effect<void, ProductControlPlaneError>;
  }) => Effect.Effect<ProductExecutionObservation, ProductControlPlaneError>;
  readonly subscribeFacts?: (
    listener: (
      runId: ProductRunId,
      observation:
        | { readonly kind: "facts"; readonly facts: ReadonlyArray<NativeHostRuntimeFact> }
        | { readonly kind: "snapshot"; readonly snapshot: NativeHostRuntimeSnapshot }
        | { readonly kind: "outcome-unknown" }
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
    ) => void,
  ) => () => void;
  readonly resumeFacts?: (runId: ProductRunId, operationRef: string) => void;
  readonly control?: (input: {
    readonly operationRef: string;
    readonly control: ProductControlRunInput["control"];
    readonly text: string | null;
  }) => Effect.Effect<ProductControlRunResult, ProductControlPlaneError>;
  readonly close?: () => Promise<void>;
  readonly catalog?: () => Effect.Effect<ProductRuntimeCatalog | null, ProductControlPlaneError>;
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
  readonly state: "pending" | "sending" | "terminal";
  readonly sendBoundary: "pre-send" | "sent" | "accepted";
  readonly attemptCount: number;
  readonly automaticReplayCount: 0;
}

export interface ProductControlPlaneShape {
  readonly hasConversation: (
    conversationId: ProductConversationId,
  ) => Effect.Effect<boolean, ProductControlPlaneError>;
  readonly createConversation: (
    input: ProductCreateConversationInput,
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
  const versionRows = database.prepare("SELECT schema_version FROM product_meta").all();
  if (versionRows.length === 0) {
    database
      .prepare("INSERT INTO product_meta(schema_version) VALUES (?)")
      .run(PRODUCT_SCHEMA_VERSION);
    return;
  }
  const version = requiredNumber(asRecord(versionRows[0]), "schema_version");
  if (version !== PRODUCT_SCHEMA_VERSION || versionRows.length !== 1) {
    throw new ProductFailure(
      "PRODUCT_SCHEMA_UNSUPPORTED",
      `Product Store schema ${version} is unsupported; expected ${PRODUCT_SCHEMA_VERSION}.`,
    );
  }
}

function makeControlPlane(
  database: PortableDatabase,
  executionBoundary: ProductExecutionBoundary,
  initialRuntimeCatalog: ProductRuntimeCatalog | null,
): ProductControlPlaneShape {
  let runtimeCatalog = initialRuntimeCatalog;
  const statement = (sql: string) => database.prepare(sql);
  const generatedId = () => randomUUID();

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
      "SELECT workspace_id, access_json, observed_at FROM product_workspaces WHERE workspace_id = ?",
    ).get(workspaceId);
    if (!raw) throw new ProductFailure("PRODUCT_WORKSPACE_NOT_FOUND", "Workspace was not found.");
    const row = asRecord(raw);
    return decode(ProductWorkspace, {
      id: requiredString(row, "workspace_id"),
      access: decodeJson(ProductWorkspaceAccess, requiredString(row, "access_json")),
      observedAt: requiredString(row, "observed_at"),
    });
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
        ProductRequestedSelection,
        requiredString(row, "requested_selection_json"),
      ),
      workspaceObservation: decodeJson(
        ProductWorkspace,
        requiredString(row, "workspace_observation_json"),
      ),
      resources: readResourcesByRun(runId),
      packageGeneration: requiredString(row, "package_generation"),
      receipt: readReceiptByRun(runId),
      createdAt: requiredString(row, "created_at"),
      updatedAt: requiredString(row, "updated_at"),
    });
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

  const readSummary = (conversationId: string): ProductConversationSummary => {
    const raw = statement(
      `SELECT c.conversation_id, c.workspace_id, c.title, w.access_json,
              c.created_at, c.updated_at,
              (SELECT receipt_json FROM product_operation_receipts r
               JOIN product_runs pr ON pr.run_id = r.run_id
               WHERE pr.conversation_id = c.conversation_id
               ORDER BY pr.created_at DESC, pr.run_id DESC LIMIT 1) AS latest_receipt_json
       FROM product_conversations c
       JOIN product_workspaces w ON w.workspace_id = c.workspace_id
       WHERE c.conversation_id = ?`,
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
      `SELECT a.run_id, a.native_sequence, a.kind, a.summary AS detail_json, a.created_at
       FROM product_runtime_activities a
       JOIN product_runs r ON r.run_id = a.run_id
       WHERE r.conversation_id = ?
       ORDER BY a.created_at ASC, a.run_id ASC, a.native_sequence ASC`,
    )
      .all(conversationId)
      .map((raw) => {
        const row = asRecord(raw);
        return decode(ProductRuntimeActivity, {
          runId: requiredString(row, "run_id"),
          nativeSequence: requiredNumber(row, "native_sequence"),
          kind: requiredString(row, "kind"),
          detail: decodeJson(
            ProductRuntimeActivityDetail,
            requiredString(row, "detail_json"),
          ),
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
      encodeJson(ProductShellFactChange, {
        kind: "conversation-summary",
        conversation: readSummary(conversationId),
      }),
      encodeJson(ProductDetailFactChange, change),
    );
  };

  const updateReceipt = (
    runId: string,
    receipt: ProductDispatchReceipt,
    outboxState: "pending" | "sending" | "terminal",
    sendBoundary: "pre-send" | "sent" | "accepted",
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

  const createConversation: ProductControlPlaneShape["createConversation"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const timestamp = productIsoNow();
        const workspaceId = input.workspaceId;
        const conversationId = input.conversationId;
        statement(
          `INSERT INTO product_workspaces(workspace_id, access_json, observed_at)
           VALUES (?, ?, ?)`,
        ).run(workspaceId, encodeJson(ProductWorkspaceAccess, input.workspace), timestamp);
        statement(
          `INSERT INTO product_conversations(
             conversation_id, workspace_id, title, detail_sequence, created_at, updated_at
           ) VALUES (?, ?, ?, 0, ?, ?)`,
        ).run(conversationId, workspaceId, input.title, timestamp, timestamp);
        appendFact(conversationId, {
          kind: "conversation-created",
          conversationId: decode(ProductConversationId, conversationId),
        });
        return snapshot(conversationId);
      }),
    );

  const hasConversation: ProductControlPlaneShape["hasConversation"] = (conversationId) =>
    effect(
      () =>
        statement(
          "SELECT conversation_id FROM product_conversations WHERE conversation_id = ?",
        ).get(conversationId) !== undefined,
    );

  const getShellSnapshot: ProductControlPlaneShape["getShellSnapshot"] = () =>
    Effect.gen(function* () {
      if (executionBoundary.catalog) {
        runtimeCatalog = yield* executionBoundary
          .catalog()
          .pipe(Effect.catch(() => Effect.succeed(null)));
      }
      return yield* effect(() => {
        const ids = statement(
          `SELECT conversation_id FROM product_conversations
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
      if (receipt.state !== "accepted" && receipt.state !== "running") {
        return decode(ProductControlRunResult, {
          operationRef:
            "operationRef" in receipt ? receipt.operationRef : `unaccepted:${input.runId}`,
          control: input.control,
          result: receipt.state === "settled" ? "too-late" : "unknown",
          code: receipt.state === "settled" ? "control-too-late" : "operation-unknown",
          message:
            receipt.state === "settled"
              ? "The Product Run has already settled."
              : "The Product Run has no confirmed accepted operation.",
        });
      }
      if (
        (input.control === "steer" || input.control === "follow-up") &&
        input.text === null
      ) {
        return decode(ProductControlRunResult, {
          operationRef: receipt.operationRef,
          control: input.control,
          result: "unsupported",
          code: "control-unsupported",
          message: "This native control requires text.",
        });
      }
      if (!executionBoundary.control) {
        return decode(ProductControlRunResult, {
          operationRef: receipt.operationRef,
          control: input.control,
          result: "unsupported",
          code: "control-unsupported",
          message: "The active execution boundary does not expose native controls.",
        });
      }
      return yield* executionBoundary.control({
        operationRef: receipt.operationRef,
        control: input.control,
        text: input.text,
      });
    });

  const putQueueItem: ProductControlPlaneShape["putQueueItem"] = (input) =>
    effect(() =>
      withTransaction(() => {
        const conversation = readSummary(input.conversationId);
        assertResourceAuthority(readWorkspace(conversation.workspaceId), input.resources);
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
    effect(() =>
      withTransaction(() => {
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
        const queueItem = readQueue(input.conversationId).find((item) => item.id === input.itemId);
        if (!queueItem)
          throw new ProductFailure("PRODUCT_QUEUE_ITEM_NOT_FOUND", "Queue item was not found.");
        if (queueItem.revision !== input.expectedRevision) {
          throw new ProductFailure(
            "PRODUCT_QUEUE_REVISION_CONFLICT",
            "The Queue item changed before admission.",
            true,
          );
        }
        if (queueItem.requestedSelection.modelId === null) {
          throw new ProductFailure(
            "PRODUCT_MODEL_SELECTION_REQUIRED",
            "A currently available runtime model must be selected before admission.",
            true,
          );
        }
        const workspaceId = readSummary(input.conversationId).workspaceId;
        const workspace = readWorkspace(workspaceId);
        assertResourceAuthority(workspace, queueItem.resources);
        const timestamp = productIsoNow();
        const pendingReceipt: ProductDispatchReceipt = {
          state: "pending",
          lastConfirmedBoundary: "pre-send",
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
          encodeJson(ProductRequestedSelection, queueItem.requestedSelection),
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
             automatic_replay_count, updated_at
           ) VALUES (?, ?, 'pending', 'pre-send', 0, 0, ?)`,
        ).run(input.dispatchId, input.runId, timestamp);
        const run = readRun(input.runId);
        const priorBinding = statement(
          `SELECT lineage_ref FROM product_engine_bindings
           WHERE conversation_id = ? ORDER BY rowid DESC LIMIT 1`,
        ).get(run.conversationId);
        executionBoundary.preflight?.({
          dispatchId: input.dispatchId,
          run,
          text: queueItem.text,
          priorLineageRef: priorBinding
            ? requiredString(asRecord(priorBinding), "lineage_ref")
            : null,
        });
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
      }),
    );

  const applyExecutionObservation = (
    dispatchId: ProductDispatchId,
    observation: ProductExecutionObservation,
  ): void => {
    const raw = statement(
      `SELECT run_id, state, send_boundary FROM product_outbox WHERE dispatch_id = ?`,
    ).get(dispatchId);
    if (!raw) throw new ProductFailure("PRODUCT_DISPATCH_NOT_FOUND", "Dispatch was not found.");
    const row = asRecord(raw);
    const runId = requiredString(row, "run_id");
    const currentBoundary = requiredString(row, "send_boundary") as
      | "pre-send"
      | "sent"
      | "accepted";
    if (requiredString(row, "state") === "terminal") return;
    if (observation.kind === "pre-send-failure") {
      if (currentBoundary !== "pre-send") {
        throw new ProductFailure(
          "PRODUCT_SEND_BOUNDARY_CONTRADICTION",
          "A pre-send failure cannot be recorded after the send boundary.",
        );
      }
      updateReceipt(
        runId,
        { state: "pending", lastConfirmedBoundary: "pre-send" },
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
      updateReceipt(
        runId,
        {
          state: "delivery_unknown",
          lastConfirmedBoundary: observation.lastConfirmedBoundary,
          ...(observation.reconciliationHint
            ? { reconciliationHint: observation.reconciliationHint }
            : {}),
        },
        "terminal",
        "sent",
      );
      return;
    }
    const run = readRun(runId);
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
        state: "accepted",
        operationRef: observation.operationRef,
        engineBinding: observation.engineBinding,
        resolvedSelection: observation.resolvedSelection,
      },
      "terminal",
      "accepted",
    );
  };

  const dispatchPending: ProductControlPlaneShape["dispatchPending"] = (dispatchId) =>
    Effect.gen(function* () {
      const rows = yield* effect(() =>
        dispatchId
          ? statement(
              `SELECT dispatch_id, run_id FROM product_outbox
               WHERE dispatch_id = ? AND state = 'pending' AND send_boundary = 'pre-send'`,
            ).all(dispatchId)
          : statement(
              `SELECT dispatch_id, run_id FROM product_outbox
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
        const claimed = yield* effect(() =>
          statement(
            `UPDATE product_outbox
             SET state = 'sending', attempt_count = attempt_count + 1, updated_at = ?
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
        if (!claimed) continue;
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
              const row = statement(
                `SELECT lineage_ref FROM product_engine_bindings
                 WHERE conversation_id = ? ORDER BY rowid DESC LIMIT 1`,
              ).get(run.conversationId);
              return row ? requiredString(asRecord(row), "lineage_ref") : null;
            }),
            markSent: () =>
              effect(() =>
                withTransaction(() => {
                  const changed = statement(
                    `UPDATE product_outbox
                     SET send_boundary = 'sent', updated_at = ?
                     WHERE dispatch_id = ? AND state = 'sending' AND send_boundary = 'pre-send'
                     RETURNING dispatch_id`,
                  ).get(productIsoNow(), currentDispatchId);
                  if (!changed) {
                    throw new ProductFailure(
                      "PRODUCT_SEND_BOUNDARY_CONFLICT",
                      "Dispatch send boundary could not be persisted before sending.",
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
                    updateReceipt(
                      requiredString(currentRow, "run_id"),
                      { state: "delivery_unknown", lastConfirmedBoundary: "sent" },
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
      }
    });

  const submitQueueItem: ProductControlPlaneShape["submitQueueItem"] = (input) =>
    Effect.gen(function* () {
      yield* admitQueueItem(input);
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
    effect(() => {
      const isShell = input.scope.kind === "shell";
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
            `SELECT global_sequence AS sequence, fact_id, conversation_id, emitted_at,
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
        const base = {
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          sequence: requiredNumber(row, "sequence"),
          factId: requiredString(row, "fact_id"),
          conversationId: requiredString(row, "conversation_id"),
          emittedAt: requiredString(row, "emitted_at"),
        };
        return isShell
          ? decode(ProductShellFact, {
              ...base,
              change: decodeJson(ProductShellFactChange, requiredString(row, "change_json")),
            })
          : decode(ProductDetailFact, {
              ...base,
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

  const recoverDispatches: ProductControlPlaneShape["recoverDispatches"] = () =>
    effect(() =>
      withTransaction(() => {
        const sent = statement(
          `SELECT dispatch_id, run_id FROM product_outbox
           WHERE state = 'sending' AND send_boundary <> 'pre-send'`,
        ).all();
        for (const raw of sent) {
          const row = asRecord(raw);
          updateReceipt(
            requiredString(row, "run_id"),
            { state: "delivery_unknown", lastConfirmedBoundary: "sent" },
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
          updateReceipt(
            runId,
            {
              state: "running",
              operationRef: source.operationRef,
              engineBinding: source.engineBinding,
              resolvedSelection: source.resolvedSelection,
            },
            "terminal",
            "accepted",
          );
          return;
        }
        if (observation.kind === "outcome_unknown") {
          updateReceipt(
            runId,
            {
              state: "outcome_unknown",
              operationRef: current.operationRef,
              engineBinding: current.engineBinding,
              resolvedSelection: current.resolvedSelection,
              lastConfirmedBoundary: "accepted",
            },
            "terminal",
            "accepted",
          );
          return;
        }
        updateReceipt(
          runId,
          {
            state: "settled",
            operationRef: current.operationRef,
            engineBinding: current.engineBinding,
            resolvedSelection: current.resolvedSelection,
            outcome: observation.outcome,
            settledAt: observation.settledAt,
          },
          "terminal",
          "accepted",
        );
      }),
    );

  const applyRuntimeFacts = (
    runId: ProductRunId,
    facts: ReadonlyArray<NativeHostRuntimeFact>,
  ): void => {
    const run = readRun(runId);
    const cursorRow = statement(
      "SELECT native_sequence FROM product_runtime_fact_cursors WHERE run_id = ?",
    ).get(runId);
    let nativeCursor = cursorRow ? requiredNumber(asRecord(cursorRow), "native_sequence") : 0;
    for (const fact of facts) {
      if (fact.sequence <= nativeCursor) continue;
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
          nativeCursor = fact.sequence;
          statement(
            `INSERT INTO product_runtime_fact_cursors(run_id, native_sequence) VALUES (?, ?)
             ON CONFLICT(run_id) DO UPDATE SET native_sequence = excluded.native_sequence`,
          ).run(runId, nativeCursor);
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
        nativeCursor = fact.sequence;
        statement(
          `INSERT INTO product_runtime_fact_cursors(run_id, native_sequence) VALUES (?, ?)
           ON CONFLICT(run_id) DO UPDATE SET native_sequence = excluded.native_sequence`,
        ).run(runId, nativeCursor);
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
        `SELECT native_sequence FROM product_runtime_activities
         WHERE run_id = ? AND native_sequence = ?`,
      ).get(runId, fact.sequence);
      if (!exists) {
        statement(
          `INSERT INTO product_runtime_activities(
             run_id, native_sequence, kind, summary, created_at
           ) VALUES (?, ?, ?, ?, ?)`,
        ).run(
          runId,
          fact.sequence,
          activity.kind,
          encodeJson(ProductRuntimeActivityDetail, activity.detail),
          fact.emittedAt,
        );
        appendFact(run.conversationId, {
          kind: "runtime-activity",
          conversationId: run.conversationId,
          activity: decode(ProductRuntimeActivity, {
            runId,
            nativeSequence: fact.sequence,
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
          updateReceipt(
            runId,
            {
              state: "settled",
              operationRef: current.operationRef,
              engineBinding: current.engineBinding,
              resolvedSelection: current.resolvedSelection,
              outcome: fact.outcome,
              settledAt: fact.emittedAt,
            },
            "terminal",
            "accepted",
          );
        }
      }
      nativeCursor = fact.sequence;
      statement(
        `INSERT INTO product_runtime_fact_cursors(run_id, native_sequence) VALUES (?, ?)
         ON CONFLICT(run_id) DO UPDATE SET native_sequence = excluded.native_sequence`,
      ).run(runId, nativeCursor);
    }
  };

  const applyRuntimeSnapshot = (
    runId: ProductRunId,
    nativeSnapshot: NativeHostRuntimeSnapshot,
  ): void => {
    const run = readRun(runId);
    const current = run.receipt.receipt;
    if (
      (current.state !== "accepted" && current.state !== "running") ||
      current.operationRef !== nativeSnapshot.operationRef
    ) {
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
    if (nativeSnapshot.assistant.length > 0) {
      const createdAt = existing
        ? requiredString(existing, "created_at")
        : nativeSnapshot.settlement.settledAt;
      if (existing) {
        if (requiredString(existing, "body") !== nativeSnapshot.assistant) {
          statement("UPDATE product_entries SET body = ? WHERE entry_id = ?").run(
            nativeSnapshot.assistant,
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
              text: nativeSnapshot.assistant,
              createdAt,
            }),
          });
        }
      } else {
        statement(
          `INSERT INTO product_entries(entry_id, conversation_id, run_id, role, body, created_at)
           VALUES (?, ?, ?, 'assistant', ?, ?)`,
        ).run(entryId, run.conversationId, runId, nativeSnapshot.assistant, createdAt);
        appendFact(run.conversationId, {
          kind: "entry-replaced",
          conversationId: run.conversationId,
          entry: decode(ProductEntry, {
            id: entryId,
            conversationId: run.conversationId,
            runId,
            role: "assistant",
            text: nativeSnapshot.assistant,
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
      if (nativeSnapshot.assistant.length > 0) {
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
    ).get(runId, nativeSnapshot.version);
    if (!recoveryExists) {
      const recovery = decode(ProductRuntimeRecovery, {
        runId,
        snapshotVersion: nativeSnapshot.version,
        kind: "visible-result",
        createdAt: nativeSnapshot.settlement.settledAt,
      });
      statement(
        `INSERT INTO product_runtime_recoveries(
           run_id, snapshot_version, kind, created_at
         ) VALUES (?, ?, ?, ?)`,
      ).run(
        recovery.runId,
        recovery.snapshotVersion,
        recovery.kind,
        recovery.createdAt,
      );
      appendFact(run.conversationId, {
        kind: "runtime-recovered",
        conversationId: run.conversationId,
        recovery,
      });
    }
    updateReceipt(
      runId,
      {
        state: "settled",
        operationRef: current.operationRef,
        engineBinding: current.engineBinding,
        resolvedSelection: current.resolvedSelection,
        outcome: nativeSnapshot.settlement.outcome,
        settledAt: nativeSnapshot.settlement.settledAt,
      },
      "terminal",
      "accepted",
    );
  };

  executionBoundary.subscribeFacts?.((runId, observation) => {
    withTransaction(() => {
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
      updateReceipt(
        runId,
        {
          state: "outcome_unknown",
          operationRef: current.operationRef,
          engineBinding: current.engineBinding,
          resolvedSelection: current.resolvedSelection,
          lastConfirmedBoundary: "accepted",
        },
        "terminal",
        "accepted",
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
        receipt.state === "running" ||
        (receipt.state === "delivery_unknown" && receipt.reconciliationHint)
      ) {
        executionBoundary.resumeFacts(
          decode(ProductRun.fields.id, requiredString(row, "run_id")),
          receipt.state === "delivery_unknown"
            ? receipt.reconciliationHint!
            : receipt.operationRef,
        );
      }
    }
  }

  const inspectOutbox: ProductControlPlaneShape["inspectOutbox"] = () =>
    effect(() =>
      statement(
        `SELECT dispatch_id, run_id, state, send_boundary, attempt_count,
                automatic_replay_count FROM product_outbox
         ORDER BY dispatch_id ASC`,
      )
        .all()
        .map((raw) => {
          const row = asRecord(raw);
          return {
            dispatchId: requiredString(row, "dispatch_id"),
            runId: requiredString(row, "run_id"),
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
    hasConversation,
    createConversation,
    getShellSnapshot,
    getConversationSnapshot,
    putQueueItem,
    reorderQueue,
    deleteQueueItem,
    admitQueueItem,
    submitQueueItem,
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
  const acquire = Effect.promise(async () => {
    if (filename !== ":memory:") ensurePrivateFileSync(filename);
    const database = await openPortableDatabase(filename);
    initializeSchema(database);
    return database;
  });
  return Layer.effect(
    ProductControlPlane,
    Effect.gen(function* () {
      const database = yield* Effect.acquireRelease(acquire, (openedDatabase) =>
        Effect.promise(async () => {
          await executionBoundary.close?.();
          openedDatabase.close();
        }),
      );
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
