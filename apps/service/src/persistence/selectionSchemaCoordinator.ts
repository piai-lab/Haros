import path from "node:path";
import fs from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

import {
  ProductDispatchReceipt,
  ProductRequestedSelection,
  ProductSelectedRuntime,
  ProductSubmitQueueItemInput,
} from "@omnimind/contracts";
import { Effect } from "effect";
import { Schema } from "effect";

import {
  acquireDatabaseLifecycleLock,
  releaseDatabaseLifecycleLock,
  type DatabaseLifecycleLock,
} from "./DatabaseLifecycleLock";
import {
  migrateSchema1AutomationPermissionSnapshot,
  migrateSchema1AutomationSelection,
} from "./automationSelectionTranscode";
import {
  migrateSchema1SelectedRun,
  parseCanonicalJsonObject,
} from "../product/schema1SelectionTranscode";
import {
  migrateSchema1MutationJson,
  migrateSchema1ReceiptJson,
  migrateSchema1RequestedSelectionJson,
  migrateSchema1SubmitAdmissionJson,
} from "../product/schema1ProductTranscode";

export const SELECTION_SCHEMA_REVISION = "selection-schema-v2";

type FaultPoint =
  | "after-preflight"
  | "inside-product-transaction"
  | "after-product-commit"
  | "inside-automation-transaction"
  | "after-automation-commit";

export class SelectionSchemaCoordinatorError extends Error {
  readonly code = "SELECTION_SCHEMA_COORDINATOR_BLOCKED";
}

type ProductPlan = {
  readonly runs: ReadonlyArray<{
    readonly runId: string;
    readonly json: string;
    readonly engineId: string;
  }>;
  readonly queue: ReadonlyArray<{ readonly id: string; readonly json: string }>;
  readonly receipts: ReadonlyArray<{ readonly id: string; readonly json: string }>;
  readonly admissions: ReadonlyArray<{ readonly id: string; readonly json: string }>;
  readonly mutations: ReadonlyArray<{
    readonly id: string;
    readonly requestJson: string;
    readonly responseJson: string;
  }>;
};
type AutomationPlan = {
  readonly definitions: ReadonlyArray<{ readonly automationId: string; readonly json: string }>;
  readonly runs: ReadonlyArray<{ readonly runId: string; readonly json: string }>;
};

const tableExists = (db: DatabaseSync, table: string): boolean =>
  db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table) !==
  undefined;

const tableInfo = (db: DatabaseSync, table: string): Array<Record<string, unknown>> =>
  db.prepare(`PRAGMA table_info(${table})`).all() as Array<Record<string, unknown>>;

function assertColumns(
  db: DatabaseSync,
  table: string,
  expected: ReadonlyArray<readonly [name: string, notNull: 0 | 1]>,
): void {
  const actual = tableInfo(db, table).map(
    (column) => [String(column.name), Number(column.notnull)] as const,
  );
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new SelectionSchemaCoordinatorError(`${table} does not match the required schema.`);
  }
}

function assertForeignKey(
  db: DatabaseSync,
  table: string,
  expected: {
    readonly from: string;
    readonly target: string;
    readonly to: string;
    readonly onDelete: string;
  },
): void {
  const match = (
    db.prepare(`PRAGMA foreign_key_list(${table})`).all() as Array<Record<string, unknown>>
  ).some(
    (row) =>
      row.from === expected.from &&
      row.table === expected.target &&
      row.to === expected.to &&
      row.on_delete === expected.onDelete,
  );
  if (!match) {
    throw new SelectionSchemaCoordinatorError(`${table} has an invalid foreign key.`);
  }
}

function assertUniqueIndex(db: DatabaseSync, table: string, column: string): void {
  const indexes = db.prepare(`PRAGMA index_list(${table})`).all() as Array<Record<string, unknown>>;
  const match = indexes.some((index) => {
    if (Number(index.unique) !== 1) return false;
    const columns = db.prepare(`PRAGMA index_info(${String(index.name)})`).all() as Array<
      Record<string, unknown>
    >;
    return columns.length === 1 && columns[0]?.name === column;
  });
  if (!match) {
    throw new SelectionSchemaCoordinatorError(`${table}.${column} is not uniquely indexed.`);
  }
}

function assertProductV1TableShapes(db: DatabaseSync): void {
  assertColumns(db, "product_runs", [
    ["run_id", 0],
    ["conversation_id", 1],
    ["entry_id", 1],
    ["requested_selection_json", 1],
    ["workspace_observation_json", 1],
    ["package_generation", 1],
    ["receipt_id", 1],
    ["created_at", 1],
    ["updated_at", 1],
  ]);
  assertColumns(db, "product_outbox", [
    ["dispatch_id", 0],
    ["run_id", 1],
    ["state", 1],
    ["send_boundary", 1],
    ["attempt_count", 1],
    ["automatic_replay_count", 1],
    ["updated_at", 1],
  ]);
  const outbox = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'product_outbox'")
    .get() as Record<string, unknown> | undefined;
  if (
    typeof outbox?.sql !== "string" ||
    !outbox.sql.includes("send_boundary IN ('pre-send', 'sent', 'accepted')")
  ) {
    throw new SelectionSchemaCoordinatorError("product_outbox has an unknown v1 boundary.");
  }
}

function productMarker(db: DatabaseSync): 1 | 2 {
  if (!tableExists(db, "product_meta"))
    throw new SelectionSchemaCoordinatorError("Product marker is missing.");
  const row = db.prepare("SELECT * FROM product_meta").get() as Record<string, unknown> | undefined;
  if (!row || db.prepare("SELECT COUNT(*) AS count FROM product_meta").get()!["count"] !== 1) {
    throw new SelectionSchemaCoordinatorError("Product marker cardinality is invalid.");
  }
  if (row.schema_version === 1 && row.migration_revision === undefined) return 1;
  if (row.schema_version === 2 && row.migration_revision === SELECTION_SCHEMA_REVISION) return 2;
  throw new SelectionSchemaCoordinatorError("Product marker is unknown or mismatched.");
}

function automationMarker(db: DatabaseSync): 1 | 2 {
  if (!tableExists(db, "automation_meta")) return 1;
  const row = db.prepare("SELECT * FROM automation_meta").get() as
    | Record<string, unknown>
    | undefined;
  if (!row || db.prepare("SELECT COUNT(*) AS count FROM automation_meta").get()!["count"] !== 1) {
    throw new SelectionSchemaCoordinatorError("Automation marker cardinality is invalid.");
  }
  if (row.schema_version === 2 && row.migration_revision === SELECTION_SCHEMA_REVISION) return 2;
  throw new SelectionSchemaCoordinatorError("Automation marker is unknown or mismatched.");
}

function legacyReceiptRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SelectionSchemaCoordinatorError("A schema-1 Product receipt is invalid.");
  }
  return value as Record<string, unknown>;
}

function assertLegacyRunReceiptConsistency(
  row: Record<string, unknown>,
  receipt: Record<string, unknown>,
  engineId: string,
): void {
  const outboxState = row.outbox_state;
  const outboxBoundary = row.outbox_boundary;
  if (typeof outboxState !== "string" || typeof outboxBoundary !== "string") {
    throw new SelectionSchemaCoordinatorError("A Product Run has no durable outbox row.");
  }
  const state = receipt.state;
  const expectedOutboxPairs = (() => {
    switch (state) {
      case "pending":
        return [
          ["pending", "pre-send"],
          ["sending", "pre-send"],
          ["sending", "sent"],
        ] as const;
      case "rejected":
        return [
          ["terminal", "pre-send"],
          ["terminal", "sent"],
        ] as const;
      case "delivery_unknown":
        return [["terminal", "sent"]] as const;
      case "accepted":
      case "running":
      case "settled":
      case "outcome_unknown":
        return [["terminal", "accepted"]] as const;
      default:
        throw new SelectionSchemaCoordinatorError("A Product Run has an unknown receipt state.");
    }
  })();
  if (
    !expectedOutboxPairs.some(
      ([expectedState, expectedBoundary]) =>
        outboxState === expectedState && outboxBoundary === expectedBoundary,
    )
  ) {
    throw new SelectionSchemaCoordinatorError(
      "A Product receipt contradicts its durable outbox boundary.",
    );
  }

  const requiresBinding =
    state === "accepted" ||
    state === "running" ||
    state === "settled" ||
    state === "outcome_unknown";
  const storedBindingPresent =
    row.binding_id !== null || row.binding_engine_id !== null || row.binding_lineage_ref !== null;
  if (!requiresBinding) {
    if (storedBindingPresent || receipt.engineBinding !== undefined) {
      throw new SelectionSchemaCoordinatorError(
        "An unaccepted Product Run unexpectedly has an Engine binding.",
      );
    }
    return;
  }
  const receiptBinding = legacyReceiptRecord(receipt.engineBinding);
  if (
    typeof row.binding_id !== "string" ||
    typeof row.binding_engine_id !== "string" ||
    typeof row.binding_lineage_ref !== "string" ||
    receiptBinding.id !== row.binding_id ||
    receiptBinding.engineId !== row.binding_engine_id ||
    receiptBinding.lineageRef !== row.binding_lineage_ref ||
    row.binding_engine_id !== engineId
  ) {
    throw new SelectionSchemaCoordinatorError(
      "A Product receipt contradicts its durable Engine binding.",
    );
  }
}

function preflightProductV1(db: DatabaseSync): ProductPlan {
  assertProductV1TableShapes(db);
  const rows = db
    .prepare(`SELECT r.run_id, r.requested_selection_json, r.package_generation,
      b.binding_id, b.engine_id AS binding_engine_id, b.lineage_ref AS binding_lineage_ref,
      o.receipt_json, x.state AS outbox_state, x.send_boundary AS outbox_boundary
      FROM product_runs r
      LEFT JOIN product_engine_bindings b ON b.run_id = r.run_id
      LEFT JOIN product_operation_receipts o ON o.run_id = r.run_id
      LEFT JOIN product_outbox x ON x.run_id = r.run_id
      ORDER BY r.run_id`)
    .all() as Array<Record<string, unknown>>;
  const runs = rows.map((row) => {
    if (typeof row.receipt_json !== "string") {
      throw new SelectionSchemaCoordinatorError("A Product Run has no receipt.");
    }
    if (typeof row.package_generation !== "string") {
      throw new SelectionSchemaCoordinatorError(
        "A schema-1 Product Run has no Package generation.",
      );
    }
    const receipt = legacyReceiptRecord(JSON.parse(row.receipt_json));
    migrateSchema1ReceiptJson(row.receipt_json);
    const resolved = receipt.resolvedSelection ? JSON.stringify(receipt.resolvedSelection) : null;
    const migrated = migrateSchema1SelectedRun({
      selectedJson: String(row.requested_selection_json),
      runPackageGeneration: row.package_generation,
      bindingEngineId: row.binding_engine_id == null ? null : String(row.binding_engine_id),
      resolvedSelectionJson: resolved,
    });
    assertLegacyRunReceiptConsistency(row, receipt, migrated.value.engineId);
    return {
      runId: String(row.run_id),
      json: migrated.canonicalJson,
      engineId: migrated.value.engineId,
    };
  });
  const queue = tableExists(db, "product_queue_items")
    ? (
        db
          .prepare(
            "SELECT queue_item_id, requested_selection_json FROM product_queue_items ORDER BY queue_item_id",
          )
          .all() as Array<Record<string, unknown>>
      ).map((row) => ({
        id: String(row.queue_item_id),
        json: migrateSchema1RequestedSelectionJson(String(row.requested_selection_json)),
      }))
    : [];
  const receipts = (
    db
      .prepare(
        "SELECT receipt_id, receipt_json FROM product_operation_receipts ORDER BY receipt_id",
      )
      .all() as Array<Record<string, unknown>>
  ).map((row) => ({
    id: String(row.receipt_id),
    json: migrateSchema1ReceiptJson(String(row.receipt_json)),
  }));
  const admissions = tableExists(db, "product_submit_admissions")
    ? (
        db
          .prepare(
            "SELECT dispatch_id, request_json FROM product_submit_admissions ORDER BY dispatch_id",
          )
          .all() as Array<Record<string, unknown>>
      ).map((row) => ({
        id: String(row.dispatch_id),
        json: migrateSchema1SubmitAdmissionJson(String(row.request_json)),
      }))
    : [];
  const mutations = tableExists(db, "product_mutations")
    ? (
        db
          .prepare(
            "SELECT mutation_id, mutation_kind, request_json, response_json FROM product_mutations ORDER BY mutation_id",
          )
          .all() as Array<Record<string, unknown>>
      ).map((row) => ({
        id: String(row.mutation_id),
        ...migrateSchema1MutationJson({
          kind: String(row.mutation_kind),
          requestJson: String(row.request_json),
          responseJson: String(row.response_json),
        }),
      }))
    : [];
  return { runs, queue, receipts, admissions, mutations };
}

function preflightAutomationV1(db: DatabaseSync): AutomationPlan {
  const definitions = (
    db
      .prepare(
        "SELECT automation_id, requested_selection_json FROM automation_definitions ORDER BY automation_id",
      )
      .all() as Array<Record<string, unknown>>
  ).map((row) => ({
    automationId: String(row.automation_id),
    json: migrateSchema1AutomationSelection(String(row.requested_selection_json)).canonicalJson,
  }));
  const runs = (
    db
      .prepare("SELECT run_id, permission_snapshot_json FROM automation_runs ORDER BY run_id")
      .all() as Array<Record<string, unknown>>
  ).map((row) => ({
    runId: String(row.run_id),
    json: migrateSchema1AutomationPermissionSnapshot(String(row.permission_snapshot_json))
      .canonicalJson,
  }));
  return { definitions, runs };
}

function assertProductV2TableShapes(db: DatabaseSync): void {
  assertColumns(db, "product_runs", [
    ["run_id", 0],
    ["conversation_id", 1],
    ["entry_id", 1],
    ["requested_selection_json", 1],
    ["workspace_observation_json", 1],
    ["package_generation", 0],
    ["receipt_id", 1],
    ["created_at", 1],
    ["updated_at", 1],
  ]);
  assertColumns(db, "product_outbox", [
    ["dispatch_id", 0],
    ["run_id", 1],
    ["state", 1],
    ["send_boundary", 1],
    ["attempt_count", 1],
    ["automatic_replay_count", 1],
    ["engine_id", 1],
    ["prepared_selection_json", 0],
    ["updated_at", 1],
  ]);
  const outbox = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'product_outbox'")
    .get() as Record<string, unknown> | undefined;
  if (
    typeof outbox?.sql !== "string" ||
    !outbox.sql.includes("send_boundary IN ('pre-send', 'sent', 'accepted', 'observed')")
  ) {
    throw new SelectionSchemaCoordinatorError("product_outbox has an unknown v2 boundary.");
  }
  const runIndex = db.prepare("PRAGMA index_info(product_runs_by_conversation)").all() as Array<
    Record<string, unknown>
  >;
  if (
    JSON.stringify(runIndex.map((row) => String(row.name))) !==
    JSON.stringify(["conversation_id", "created_at", "run_id"])
  ) {
    throw new SelectionSchemaCoordinatorError("Product Run ordering index is missing.");
  }
  assertForeignKey(db, "product_runs", {
    from: "conversation_id",
    target: "product_conversations",
    to: "conversation_id",
    onDelete: "CASCADE",
  });
  assertForeignKey(db, "product_runs", {
    from: "entry_id",
    target: "product_entries",
    to: "entry_id",
    onDelete: "RESTRICT",
  });
  assertForeignKey(db, "product_outbox", {
    from: "run_id",
    target: "product_runs",
    to: "run_id",
    onDelete: "CASCADE",
  });
  assertUniqueIndex(db, "product_runs", "entry_id");
  assertUniqueIndex(db, "product_runs", "receipt_id");
  assertUniqueIndex(db, "product_outbox", "run_id");
}

function validateProductV2(db: DatabaseSync): void {
  assertProductV2TableShapes(db);
  for (const row of db.prepare("SELECT requested_selection_json FROM product_runs").all() as Array<
    Record<string, unknown>
  >) {
    Schema.decodeSync(Schema.fromJsonString(ProductSelectedRuntime))(
      String(row.requested_selection_json),
    );
  }
  if (tableExists(db, "product_queue_items")) {
    for (const row of db
      .prepare("SELECT requested_selection_json FROM product_queue_items")
      .all() as Array<Record<string, unknown>>) {
      Schema.decodeSync(Schema.fromJsonString(ProductRequestedSelection))(
        String(row.requested_selection_json),
      );
    }
  }
  for (const row of db
    .prepare("SELECT receipt_json FROM product_operation_receipts")
    .all() as Array<Record<string, unknown>>) {
    Schema.decodeSync(Schema.fromJsonString(ProductDispatchReceipt))(String(row.receipt_json));
  }
  if (tableExists(db, "product_submit_admissions")) {
    for (const row of db
      .prepare("SELECT request_json FROM product_submit_admissions")
      .all() as Array<Record<string, unknown>>) {
      Schema.decodeSync(Schema.fromJsonString(ProductSubmitQueueItemInput))(
        String(row.request_json),
      );
    }
  }
  if (
    (db.prepare("PRAGMA integrity_check").get() as Record<string, unknown>).integrity_check !== "ok"
  ) {
    throw new SelectionSchemaCoordinatorError("Product integrity check failed.");
  }
  if (db.prepare("PRAGMA foreign_key_check").get() !== undefined) {
    throw new SelectionSchemaCoordinatorError("Product foreign-key check failed.");
  }
}

function validateAutomationV2(db: DatabaseSync): void {
  for (const row of db
    .prepare("SELECT requested_selection_json FROM automation_definitions")
    .all() as Array<Record<string, unknown>>) {
    const value = parseCanonicalJsonObject(String(row.requested_selection_json));
    if (!("engineId" in value || "requestedEngineId" in value)) {
      throw new SelectionSchemaCoordinatorError("Automation v2 selection is not canonical.");
    }
  }
  for (const row of db
    .prepare("SELECT permission_snapshot_json FROM automation_runs")
    .all() as Array<Record<string, unknown>>) {
    const value = parseCanonicalJsonObject(String(row.permission_snapshot_json));
    if (typeof value.requestedSelection !== "object") {
      throw new SelectionSchemaCoordinatorError(
        "Automation v2 permission snapshot is not canonical.",
      );
    }
  }
  if (
    (db.prepare("PRAGMA integrity_check").get() as Record<string, unknown>).integrity_check !== "ok"
  ) {
    throw new SelectionSchemaCoordinatorError("Automation integrity check failed.");
  }
}

const productRunsV2Sql = `
  CREATE TABLE product_runs_schema2 (
    run_id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
    entry_id TEXT NOT NULL UNIQUE REFERENCES product_entries(entry_id) ON DELETE RESTRICT,
    requested_selection_json TEXT NOT NULL,
    workspace_observation_json TEXT NOT NULL,
    package_generation TEXT,
    receipt_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`;

const productOutboxV2Sql = `
  CREATE TABLE product_outbox_schema2 (
    dispatch_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL UNIQUE REFERENCES product_runs(run_id) ON DELETE CASCADE,
    state TEXT NOT NULL CHECK (state IN ('pending', 'sending', 'terminal')),
    send_boundary TEXT NOT NULL CHECK (send_boundary IN ('pre-send', 'sent', 'accepted', 'observed')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    automatic_replay_count INTEGER NOT NULL DEFAULT 0 CHECK (automatic_replay_count = 0),
    engine_id TEXT NOT NULL,
    prepared_selection_json TEXT,
    updated_at TEXT NOT NULL
  )`;

function rebuildProductRuns(db: DatabaseSync): void {
  db.exec(productRunsV2Sql);
  db.exec(`
    INSERT INTO product_runs_schema2(
      run_id, conversation_id, entry_id, requested_selection_json,
      workspace_observation_json, package_generation, receipt_id, created_at, updated_at
    )
    SELECT run_id, conversation_id, entry_id, requested_selection_json,
           workspace_observation_json, package_generation, receipt_id, created_at, updated_at
    FROM product_runs ORDER BY rowid;
    DROP TABLE product_runs;
    ALTER TABLE product_runs_schema2 RENAME TO product_runs;
    CREATE INDEX product_runs_by_conversation
      ON product_runs(conversation_id, created_at, run_id);
  `);
}

function rebuildProductOutbox(db: DatabaseSync, plan: ProductPlan): void {
  const rows = db
    .prepare(
      `SELECT dispatch_id, run_id, state, send_boundary, attempt_count,
              automatic_replay_count, updated_at
       FROM product_outbox ORDER BY rowid`,
    )
    .all() as Array<Record<string, unknown>>;
  const engineByRun = new Map(plan.runs.map((run) => [run.runId, run.engineId] as const));
  db.exec(productOutboxV2Sql);
  const insert = db.prepare(
    `INSERT INTO product_outbox_schema2(
       dispatch_id, run_id, state, send_boundary, attempt_count,
       automatic_replay_count, engine_id, prepared_selection_json, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
  );
  for (const row of rows) {
    const text = (column: string): string => {
      const value = row[column];
      if (typeof value !== "string") {
        throw new SelectionSchemaCoordinatorError(`Product outbox ${column} is invalid.`);
      }
      return value;
    };
    const count = (column: string): number => {
      const value = row[column];
      if (typeof value !== "number" || !Number.isInteger(value)) {
        throw new SelectionSchemaCoordinatorError(`Product outbox ${column} is invalid.`);
      }
      return value;
    };
    const runId = text("run_id");
    const engineId = engineByRun.get(runId);
    if (!engineId) {
      throw new SelectionSchemaCoordinatorError("A Product outbox row has no selected Engine.");
    }
    insert.run(
      text("dispatch_id"),
      runId,
      text("state"),
      text("send_boundary"),
      count("attempt_count"),
      count("automatic_replay_count"),
      engineId,
      text("updated_at"),
    );
  }
  db.exec(`
    DROP TABLE product_outbox;
    ALTER TABLE product_outbox_schema2 RENAME TO product_outbox;
  `);
}

function migrateProduct(
  db: DatabaseSync,
  plan: ProductPlan,
  fault?: (point: FaultPoint) => void,
): void {
  db.exec("PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE");
  try {
    const update = db.prepare(
      "UPDATE product_runs SET requested_selection_json = ? WHERE run_id = ?",
    );
    for (const row of plan.runs) update.run(row.json, row.runId);
    if (tableExists(db, "product_queue_items")) {
      const statement = db.prepare(
        "UPDATE product_queue_items SET requested_selection_json = ? WHERE queue_item_id = ?",
      );
      for (const row of plan.queue) statement.run(row.json, row.id);
    }
    const receipt = db.prepare(
      "UPDATE product_operation_receipts SET receipt_json = ? WHERE receipt_id = ?",
    );
    for (const row of plan.receipts) receipt.run(row.json, row.id);
    if (tableExists(db, "product_submit_admissions")) {
      const statement = db.prepare(
        "UPDATE product_submit_admissions SET request_json = ? WHERE dispatch_id = ?",
      );
      for (const row of plan.admissions) statement.run(row.json, row.id);
    }
    if (tableExists(db, "product_mutations")) {
      const statement = db.prepare(
        "UPDATE product_mutations SET request_json = ?, response_json = ? WHERE mutation_id = ?",
      );
      for (const row of plan.mutations) statement.run(row.requestJson, row.responseJson, row.id);
    }
    if (tableExists(db, "product_facts")) db.exec("DELETE FROM product_facts");
    if (tableExists(db, "product_runtime_fact_cursors"))
      db.exec("DELETE FROM product_runtime_fact_cursors");
    if (tableExists(db, "product_runtime_fact_cursors")) {
      const columns = db.prepare("PRAGMA table_info(product_runtime_fact_cursors)").all() as Array<
        Record<string, unknown>
      >;
      if (columns.some((column) => column.name === "native_sequence"))
        db.exec(
          "ALTER TABLE product_runtime_fact_cursors RENAME COLUMN native_sequence TO engine_sequence",
        );
    }
    if (tableExists(db, "product_runtime_activities")) {
      const columns = db.prepare("PRAGMA table_info(product_runtime_activities)").all() as Array<
        Record<string, unknown>
      >;
      if (columns.some((column) => column.name === "native_sequence"))
        db.exec(
          "ALTER TABLE product_runtime_activities RENAME COLUMN native_sequence TO engine_sequence",
        );
    }
    rebuildProductRuns(db);
    rebuildProductOutbox(db, plan);
    fault?.("inside-product-transaction");
    validateProductV2(db);
    db.exec(`ALTER TABLE product_meta RENAME TO product_meta_schema1;
      CREATE TABLE product_meta (
        schema_version INTEGER NOT NULL CHECK (schema_version = 2),
        migration_revision TEXT NOT NULL CHECK (migration_revision = '${SELECTION_SCHEMA_REVISION}')
      );
      INSERT INTO product_meta VALUES (2, '${SELECTION_SCHEMA_REVISION}');
      DROP TABLE product_meta_schema1;
      COMMIT`);
    db.exec("PRAGMA foreign_keys = ON");
  } catch (cause) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* transaction may already be closed */
    }
    db.exec("PRAGMA foreign_keys = ON");
    throw cause;
  }
}

function migrateAutomation(
  db: DatabaseSync,
  plan: AutomationPlan,
  fault?: (point: FaultPoint) => void,
): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    const updateDefinition = db.prepare(
      "UPDATE automation_definitions SET requested_selection_json = ? WHERE automation_id = ?",
    );
    for (const row of plan.definitions) updateDefinition.run(row.json, row.automationId);
    const updateRun = db.prepare(
      "UPDATE automation_runs SET permission_snapshot_json = ? WHERE run_id = ?",
    );
    for (const row of plan.runs) updateRun.run(row.json, row.runId);
    fault?.("inside-automation-transaction");
    validateAutomationV2(db);
    db.exec(`CREATE TABLE automation_meta (schema_version INTEGER NOT NULL CHECK (schema_version = 2), migration_revision TEXT NOT NULL);
      INSERT INTO automation_meta VALUES (2, '${SELECTION_SCHEMA_REVISION}');
      COMMIT`);
  } catch (cause) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* transaction may already be closed */
    }
    throw cause;
  }
}

/** Startup-only owner for the two independent selection migration windows. */
export async function coordinateSelectionSchemaV2(input: {
  readonly productDbPath: string;
  readonly automationDbPath: string;
  readonly fault?: (point: FaultPoint) => void;
}): Promise<void> {
  if (path.resolve(input.productDbPath) === path.resolve(input.automationDbPath)) {
    throw new SelectionSchemaCoordinatorError("Product and Automation stores must be distinct.");
  }
  const sizes = await Promise.all(
    [input.productDbPath, input.automationDbPath].map((filename) =>
      fs
        .stat(filename)
        .then((value) => value.size)
        .catch((cause: NodeJS.ErrnoException) => {
          if (cause.code === "ENOENT") return 0;
          throw cause;
        }),
    ),
  );
  if (sizes[0] === 0 && sizes[1] === 0) return;
  if (sizes[0] === 0 || sizes[1] === 0) {
    throw new SelectionSchemaCoordinatorError(
      "Only one selection store exists; startup is blocked.",
    );
  }
  const locks: DatabaseLifecycleLock[] = [];
  let product: DatabaseSync | undefined;
  let automation: DatabaseSync | undefined;
  try {
    locks.push(await Effect.runPromise(acquireDatabaseLifecycleLock(input.productDbPath)));
    locks.push(await Effect.runPromise(acquireDatabaseLifecycleLock(input.automationDbPath)));
    product = new DatabaseSync(input.productDbPath);
    automation = new DatabaseSync(input.automationDbPath);
    product.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000");
    automation.exec(
      "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000",
    );

    const productVersion = productMarker(product);
    const automationVersion = automationMarker(automation);
    const productPlan = productVersion === 1 ? preflightProductV1(product) : undefined;
    const automationPlan = automationVersion === 1 ? preflightAutomationV1(automation) : undefined;
    if (productVersion === 2) validateProductV2(product);
    if (automationVersion === 2) validateAutomationV2(automation);
    input.fault?.("after-preflight");

    if (productPlan) {
      migrateProduct(product, productPlan, input.fault);
      input.fault?.("after-product-commit");
    }
    if (automationPlan) {
      migrateAutomation(automation, automationPlan, input.fault);
      input.fault?.("after-automation-commit");
    }
    validateProductV2(product);
    validateAutomationV2(automation);
  } finally {
    automation?.close();
    product?.close();
    for (const lock of locks.reverse()) await Effect.runPromise(releaseDatabaseLifecycleLock(lock));
  }
}
