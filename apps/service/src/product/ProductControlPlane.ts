import { randomUUID } from "node:crypto";
import path from "node:path";

import {
  PRODUCT_MAX_FACTS_PER_BATCH,
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductConversationReadModel,
  ProductConversationSnapshot,
  ProductConversationSummary,
  ProductCreateConversationInput,
  ProductDeleteQueueItemInput,
  ProductDispatchReceipt,
  ProductEntry,
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
  ProductShellSnapshot,
  ProductSubmitQueueItemInput,
  ProductSubmitResult,
  ProductWorkspace,
  ProductWorkspaceAccess,
  type ProductDispatchId,
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
  readonly attempt: (input: {
    readonly dispatchId: ProductDispatchId;
    readonly run: ProductRun;
    /** Must complete before any non-idempotent send crosses the process boundary. */
    readonly markSent: () => Effect.Effect<void, ProductControlPlaneError>;
  }) => Effect.Effect<ProductExecutionObservation, ProductControlPlaneError>;
}

/** T2 production behavior: the real Pi-free path cannot accept execution. */
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
): ProductControlPlaneShape {
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
    return decode(ProductConversationReadModel, {
      conversation: summary,
      workspace: readWorkspace(summary.workspaceId),
      entries,
      runs: runIds.map(readRun),
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
    effect(() => {
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
      });
    });

  const getConversationSnapshot: ProductControlPlaneShape["getConversationSnapshot"] = (input) =>
    effect(() => snapshot(input.conversationId));

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
        statement(
          "DELETE FROM product_queue_items WHERE queue_item_id = ? AND conversation_id = ?",
        ).run(input.itemId, input.conversationId);
        const run = readRun(input.runId);
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
             RETURNING dispatch_id`,
          ).get(productIsoNow(), currentDispatchId),
        );
        if (!claimed) continue;
        const observation = yield* executionBoundary
          .attempt({
            dispatchId: currentDispatchId,
            run: yield* effect(() => readRun(runId)),
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
        Effect.sync(() => openedDatabase.close()),
      );
      const controlPlane = makeControlPlane(database, executionBoundary);
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
