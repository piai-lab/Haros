import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductDispatchId,
  ProductEntryId,
  ProductOperationReceiptId,
  ProductQueueItemId,
  ProductRunId,
  type ProductRuntimeCatalog,
} from "@omnimind/contracts";
import { Effect, ManagedRuntime } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import {
  acquireDatabaseLifecycleLock,
  releaseDatabaseLifecycleLock,
} from "./DatabaseLifecycleLock";
import {
  SELECTION_SCHEMA_REVISION,
  coordinateSelectionSchemaV2,
} from "./selectionSchemaCoordinator";
import { PRODUCT_MUTATION_KINDS } from "../product/schema1ProductTranscode";
import { schema1ProductMutationFixtures } from "../product/schema1ProductMutationFixtures";
import {
  ProductControlPlane,
  makeProductControlPlaneLayer,
  type ProductExecutionBoundary,
} from "../product/ProductControlPlane";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

const selection = {
  state: "selected",
  engineId: "legacy-engine",
  runtimeModelId: "provider/model",
  thinking: "high",
  packageGeneration: "package-1",
  permissionPolicy: "auto",
  enforcement: "engine-enforced",
  executionTarget: null,
} as const;

const permissionSnapshot = {
  settingsRevision: 1,
  requestedSelection: selection,
  completionPolicyVersion: 0,
  iterationNumber: 1,
  worktreeMode: "local",
  allowedCapabilities: ["send-turn"],
  createdAt: "2026-08-06T00:00:00.000Z",
};

const externalSelection = {
  state: "selected" as const,
  engineId: "opencode",
  runtimeChoice: { kind: "engine-session-current" as const },
  permissionPolicy: "approval-required" as const,
  executionTarget: null,
  packageGeneration: null,
};

const externalResolvedSelection = {
  engineId: "opencode",
  runtimeModelId: "provider/model",
  engineModeId: null,
  thinking: null,
  permissionPolicy: "approval-required" as const,
  enforcement: "unverified" as const,
  executionTarget: null,
  packageGeneration: null,
};

const externalCatalog: ProductRuntimeCatalog = {
  defaultEngineId: "opencode",
  packageGeneration: null,
  engines: [
    {
      engineId: "opencode",
      displayName: "OpenCode",
      distribution: "user-installed",
      runtimeVersion: "1.14.40",
      protocol: { name: "acp", version: "1" },
      availability: { state: "available" },
      modelSelection: {
        kind: "engine-session",
        model: "resolved-on-prepare",
        mode: "resolved-on-prepare",
        thinking: "unsupported",
      },
      capabilities: Object.fromEntries(
        [
          "continuation",
          "rebuild",
          "thinkingStream",
          "thinkingLevel",
          "structuredQuestion",
          "queue",
          "steer",
          "followUp",
          "cancel",
          "permissionPolicy",
          "packages",
          "filesRead",
          "filesWrite",
          "terminal",
          "namespacedUi",
        ].map((key) => [key, { state: "available", reason: "fixture" }]),
      ) as never,
      enforcement: "unverified",
    },
  ],
};

async function seed() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "omnimind-selection-schema-"));
  roots.push(root);
  const productDbPath = path.join(root, "product-state-v1.sqlite");
  const automationDbPath = path.join(root, "state.sqlite");
  const product = new DatabaseSync(productDbPath);
  product.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE product_meta (schema_version INTEGER NOT NULL CHECK (schema_version = 1));
    INSERT INTO product_meta VALUES (1);
    CREATE TABLE product_workspaces (
      workspace_id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT 'Workspace',
      access_json TEXT NOT NULL, observed_at TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
      visible_in_sidebar INTEGER NOT NULL DEFAULT 1 CHECK (visible_in_sidebar IN (0, 1)),
      is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
      run_command TEXT, archived_at TEXT, deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z',
      updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'
    );
    CREATE TABLE product_conversations (
      conversation_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES product_workspaces(workspace_id) ON DELETE RESTRICT,
      title TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
      archived_at TEXT, is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
      notes TEXT NOT NULL DEFAULT '',
      board_state TEXT NOT NULL DEFAULT 'active' CHECK (board_state IN ('active', 'done')),
      board_state_changed_at TEXT, deleted_at TEXT,
      detail_sequence INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE product_entries (
      entry_id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
      run_id TEXT, role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      body TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE product_runs (
      run_id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
      entry_id TEXT NOT NULL UNIQUE REFERENCES product_entries(entry_id) ON DELETE RESTRICT,
      requested_selection_json TEXT NOT NULL, workspace_observation_json TEXT NOT NULL,
      package_generation TEXT NOT NULL, receipt_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE product_engine_bindings (
      binding_id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
      run_id TEXT NOT NULL UNIQUE REFERENCES product_runs(run_id) ON DELETE CASCADE,
      engine_id TEXT NOT NULL, lineage_ref TEXT NOT NULL
    );
    CREATE TABLE product_resource_refs (
      resource_id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
      run_id TEXT REFERENCES product_runs(run_id) ON DELETE CASCADE,
      resource_json TEXT NOT NULL
    );
    CREATE TABLE product_operation_receipts (
      receipt_id TEXT PRIMARY KEY, dispatch_id TEXT NOT NULL UNIQUE,
      run_id TEXT NOT NULL UNIQUE REFERENCES product_runs(run_id) ON DELETE CASCADE,
      receipt_json TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE product_runtime_activities (
      run_id TEXT NOT NULL REFERENCES product_runs(run_id) ON DELETE CASCADE,
      native_sequence INTEGER NOT NULL,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (run_id, native_sequence)
    );
    CREATE TABLE product_runtime_recoveries (
      run_id TEXT NOT NULL REFERENCES product_runs(run_id) ON DELETE CASCADE,
      snapshot_version INTEGER NOT NULL CHECK (snapshot_version > 0),
      kind TEXT NOT NULL CHECK (kind = 'visible-result'), created_at TEXT NOT NULL,
      PRIMARY KEY (run_id, snapshot_version)
    );
    CREATE TABLE product_streaming_entries (
      entry_id TEXT PRIMARY KEY REFERENCES product_entries(entry_id) ON DELETE CASCADE
    );
    CREATE TABLE product_runtime_fact_cursors (
      run_id TEXT PRIMARY KEY REFERENCES product_runs(run_id) ON DELETE CASCADE,
      native_sequence INTEGER NOT NULL CHECK (native_sequence >= 0)
    );
    CREATE TABLE product_queue_items (
      queue_item_id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
      body TEXT NOT NULL, requested_selection_json TEXT NOT NULL, resources_json TEXT NOT NULL,
      position INTEGER NOT NULL CHECK (position >= 0), revision INTEGER NOT NULL CHECK (revision > 0),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE (conversation_id, position)
    );
    CREATE TABLE product_outbox (
      dispatch_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL UNIQUE REFERENCES product_runs(run_id) ON DELETE CASCADE,
      state TEXT NOT NULL CHECK (state IN ('pending', 'sending', 'terminal')),
      send_boundary TEXT NOT NULL CHECK (send_boundary IN ('pre-send', 'sent', 'accepted')),
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      automatic_replay_count INTEGER NOT NULL DEFAULT 0 CHECK (automatic_replay_count = 0),
      updated_at TEXT NOT NULL
    );
    CREATE TABLE product_submit_admissions (
      dispatch_id TEXT PRIMARY KEY REFERENCES product_outbox(dispatch_id) ON DELETE CASCADE,
      request_json TEXT NOT NULL
    );
    CREATE TABLE product_facts (
      global_sequence INTEGER PRIMARY KEY AUTOINCREMENT, fact_id TEXT NOT NULL UNIQUE,
      conversation_id TEXT REFERENCES product_conversations(conversation_id) ON DELETE CASCADE,
      workspace_id TEXT REFERENCES product_workspaces(workspace_id) ON DELETE CASCADE,
      group_id TEXT, conversation_sequence INTEGER CHECK (conversation_sequence > 0),
      emitted_at TEXT NOT NULL, shell_change_json TEXT NOT NULL, detail_change_json TEXT,
      UNIQUE (conversation_id, conversation_sequence)
    );
    CREATE TABLE product_mutations (
      mutation_id TEXT PRIMARY KEY, mutation_kind TEXT NOT NULL,
      request_json TEXT NOT NULL, response_json TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX product_entries_by_conversation
      ON product_entries(conversation_id, created_at, entry_id);
    CREATE INDEX product_runs_by_conversation
      ON product_runs(conversation_id, created_at, run_id);
    CREATE INDEX product_queue_by_conversation
      ON product_queue_items(conversation_id, position);
  `);
  const timestamp = "2026-08-06T00:00:00.000Z";
  const workspaceAccess = {
    kind: "chat",
    managedDirectory: null,
    primaryFolder: null,
    executionTarget: null,
    writeAuthority: "read-only-references",
  };
  product
    .prepare("INSERT INTO product_workspaces VALUES (?, ?, ?, ?, 1, 1, 0, NULL, NULL, NULL, ?, ?)")
    .run(
      "workspace-1",
      "Workspace",
      JSON.stringify(workspaceAccess),
      timestamp,
      timestamp,
      timestamp,
    );
  product
    .prepare(
      "INSERT INTO product_conversations VALUES (?, ?, ?, 1, NULL, 0, '', 'active', NULL, NULL, 0, ?, ?)",
    )
    .run("conversation-1", "workspace-1", "Conversation", timestamp, timestamp);
  product
    .prepare("INSERT INTO product_entries VALUES (?, ?, ?, 'user', ?, ?)")
    .run("entry-1", "conversation-1", "run-1", "legacy", timestamp);
  product
    .prepare("INSERT INTO product_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(
      "run-1",
      "conversation-1",
      "entry-1",
      JSON.stringify(selection),
      JSON.stringify({ id: "workspace-1", access: workspaceAccess, observedAt: timestamp }),
      selection.packageGeneration,
      "receipt-1",
      timestamp,
      timestamp,
    );
  const legacyBinding = {
    id: "binding-1",
    engineId: selection.engineId,
    lineageRef: "lineage-1",
  };
  const legacyResolvedSelection = {
    engineId: selection.engineId,
    runtimeModelId: selection.runtimeModelId,
    thinking: selection.thinking,
    permissionPolicy: selection.permissionPolicy,
    enforcement: selection.enforcement,
    executionTarget: selection.executionTarget,
    packageGeneration: selection.packageGeneration,
  };
  product
    .prepare("INSERT INTO product_engine_bindings VALUES (?, ?, ?, ?, ?)")
    .run(
      legacyBinding.id,
      "conversation-1",
      "run-1",
      legacyBinding.engineId,
      legacyBinding.lineageRef,
    );
  product.prepare("INSERT INTO product_operation_receipts VALUES (?, ?, ?, ?, ?)").run(
    "receipt-1",
    "dispatch-1",
    "run-1",
    JSON.stringify({
      state: "settled",
      operationRef: "operation-1",
      engineBinding: legacyBinding,
      resolvedSelection: legacyResolvedSelection,
      outcome: "succeeded",
      settledAt: timestamp,
    }),
    timestamp,
  );
  product
    .prepare("INSERT INTO product_queue_items VALUES (?, ?, ?, ?, '[]', 0, 1, ?, ?)")
    .run(
      "queue-1",
      "conversation-1",
      "queued legacy",
      JSON.stringify(selection),
      timestamp,
      timestamp,
    );
  product
    .prepare("INSERT INTO product_outbox VALUES (?, ?, 'terminal', 'accepted', 2, 0, ?)")
    .run("dispatch-1", "run-1", timestamp);
  product.prepare("INSERT INTO product_submit_admissions VALUES (?, ?)").run(
    "dispatch-1",
    JSON.stringify({
      protocolVersion: 1,
      conversationId: "conversation-1",
      itemId: "queue-1",
      expectedRevision: 1,
      entryId: "entry-1",
      runId: "run-1",
      dispatchId: "dispatch-1",
      receiptId: "receipt-1",
    }),
  );
  product
    .prepare("INSERT INTO product_facts VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?)")
    .run(1, "fact-1", "conversation-1", 1, timestamp, "{}", "{}");
  product.prepare("INSERT INTO product_runtime_fact_cursors VALUES (?, ?)").run("run-1", 3);
  product
    .prepare("INSERT INTO product_runtime_activities VALUES (?, ?, ?, ?, ?)")
    .run(
      "run-1",
      7,
      "thinking",
      JSON.stringify({ code: "thinking-delta", text: "historical" }),
      "2026-08-06T00:00:07.000Z",
    );
  product.prepare("INSERT INTO product_runtime_activities VALUES (?, ?, ?, ?, ?)").run(
    "run-1",
    8,
    "usage",
    JSON.stringify({
      code: "usage-observed",
      input: 1,
      output: 2,
      cacheRead: 0,
      cacheWrite: 0,
      total: 3,
    }),
    "2026-08-06T00:00:08.000Z",
  );
  for (const [index, kind] of PRODUCT_MUTATION_KINDS.entries()) {
    const fixture = schema1ProductMutationFixtures[kind];
    product.prepare("INSERT INTO product_mutations VALUES (?, ?, ?, ?, ?)").run(
      `mutation-${index}`,
      kind,
      JSON.stringify({
        ...(fixture.request as Record<string, unknown>),
        mutationId: `mutation-${index}`,
      }),
      JSON.stringify(fixture.response),
      timestamp,
    );
  }
  product.close();

  const automation = new DatabaseSync(automationDbPath);
  automation.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE automation_definitions (automation_id TEXT PRIMARY KEY, requested_selection_json TEXT NOT NULL);
    CREATE TABLE automation_runs (run_id TEXT PRIMARY KEY, permission_snapshot_json TEXT NOT NULL);
  `);
  automation
    .prepare("INSERT INTO automation_definitions VALUES (?, ?)")
    .run("automation-1", JSON.stringify(selection));
  automation
    .prepare("INSERT INTO automation_runs VALUES (?, ?)")
    .run("automation-run-1", JSON.stringify(permissionSnapshot));
  automation.close();
  return { productDbPath, automationDbPath };
}

const readMarker = (filename: string, table: string) => {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    return db.prepare(`SELECT * FROM ${table}`).get() as Record<string, unknown>;
  } finally {
    db.close();
  }
};

describe("startup selection-schema two-store coordinator", () => {
  it("preflights both stores before writing either one and releases both lifecycle locks", async () => {
    const paths = await seed();
    const automation = new DatabaseSync(paths.automationDbPath);
    automation
      .prepare("UPDATE automation_runs SET permission_snapshot_json = ?")
      .run('{"malformed":true}');
    automation.close();

    await expect(coordinateSelectionSchemaV2(paths)).rejects.toThrow();
    expect(readMarker(paths.productDbPath, "product_meta").schema_version).toBe(1);
    const productLock = await Effect.runPromise(acquireDatabaseLifecycleLock(paths.productDbPath));
    const automationLock = await Effect.runPromise(
      acquireDatabaseLifecycleLock(paths.automationDbPath),
    );
    await Effect.runPromise(releaseDatabaseLifecycleLock(automationLock));
    await Effect.runPromise(releaseDatabaseLifecycleLock(productLock));
  });

  it.each(["malformed-boundary", "binding-engine", "outbox-boundary"] as const)(
    "fails zero-write preflight for a %s Product contradiction",
    async (corruption) => {
      const paths = await seed();
      const product = new DatabaseSync(paths.productDbPath);
      const originalReceipt = JSON.parse(
        String(
          (
            product
              .prepare("SELECT receipt_json FROM product_operation_receipts WHERE run_id = 'run-1'")
              .get() as Record<string, unknown>
          ).receipt_json,
        ),
      ) as Record<string, unknown>;
      if (corruption === "malformed-boundary") {
        product
          .prepare("UPDATE product_operation_receipts SET receipt_json = ? WHERE run_id = 'run-1'")
          .run(
            JSON.stringify({
              state: "delivery_unknown",
              lastConfirmedBoundary: "corrupt",
            }),
          );
      } else if (corruption === "binding-engine") {
        product
          .prepare("UPDATE product_operation_receipts SET receipt_json = ? WHERE run_id = 'run-1'")
          .run(
            JSON.stringify({
              ...originalReceipt,
              engineBinding: {
                ...(originalReceipt.engineBinding as Record<string, unknown>),
                engineId: "different-engine",
              },
            }),
          );
      } else {
        product
          .prepare("UPDATE product_outbox SET send_boundary = 'sent' WHERE run_id = 'run-1'")
          .run();
      }
      const corruptedReceipt = String(
        (
          product
            .prepare("SELECT receipt_json FROM product_operation_receipts WHERE run_id = 'run-1'")
            .get() as Record<string, unknown>
        ).receipt_json,
      );
      const corruptedOutbox = product
        .prepare("SELECT state, send_boundary FROM product_outbox WHERE run_id = 'run-1'")
        .get();
      product.close();

      await expect(coordinateSelectionSchemaV2(paths)).rejects.toThrow();
      expect(readMarker(paths.productDbPath, "product_meta").schema_version).toBe(1);
      const reopened = new DatabaseSync(paths.productDbPath, { readOnly: true });
      try {
        expect(
          (
            reopened
              .prepare("SELECT receipt_json FROM product_operation_receipts WHERE run_id = 'run-1'")
              .get() as Record<string, unknown>
          ).receipt_json,
        ).toBe(corruptedReceipt);
        expect(
          reopened
            .prepare("SELECT state, send_boundary FROM product_outbox WHERE run_id = 'run-1'")
            .get(),
        ).toEqual(corruptedOutbox);
      } finally {
        reopened.close();
      }
      await expect(async () =>
        readMarker(paths.automationDbPath, "automation_meta"),
      ).rejects.toThrow();
    },
  );

  it("preserves a reachable schema-1 post-send crash for v2 unknown-delivery recovery", async () => {
    const paths = await seed();
    const product = new DatabaseSync(paths.productDbPath);
    product.prepare("DELETE FROM product_engine_bindings WHERE run_id = 'run-1'").run();
    product
      .prepare("UPDATE product_operation_receipts SET receipt_json = ? WHERE run_id = 'run-1'")
      .run(JSON.stringify({ state: "pending", lastConfirmedBoundary: "pre-send" }));
    product
      .prepare(
        "UPDATE product_outbox SET state = 'sending', send_boundary = 'sent', attempt_count = 1 WHERE run_id = 'run-1'",
      )
      .run();
    product.close();

    await coordinateSelectionSchemaV2(paths);
    const runtime = ManagedRuntime.make(makeProductControlPlaneLayer(paths.productDbPath));
    const controlPlane = await runtime.runPromise(Effect.service(ProductControlPlane));
    try {
      const snapshot = await runtime.runPromise(
        controlPlane.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: ProductConversationId.makeUnsafe("conversation-1"),
        }),
      );
      expect(snapshot.readModel.runs[0]?.receipt.receipt).toEqual({
        state: "delivery_unknown",
        lastConfirmedBoundary: "local-write",
        abort: null,
      });
      expect(await runtime.runPromise(controlPlane.inspectOutbox())).toEqual([
        expect.objectContaining({
          state: "terminal",
          sendBoundary: "sent",
          attemptCount: 1,
          automaticReplayCount: 0,
        }),
      ]);
    } finally {
      await runtime.dispose();
    }
  });

  it("commits matching per-store markers and canonical selection bytes in fixed order", async () => {
    const paths = await seed();
    const order: string[] = [];
    await coordinateSelectionSchemaV2({ ...paths, fault: (point) => order.push(point) });

    expect(order).toEqual([
      "after-preflight",
      "inside-product-transaction",
      "after-product-commit",
      "inside-automation-transaction",
      "after-automation-commit",
    ]);
    expect(readMarker(paths.productDbPath, "product_meta")).toEqual({
      schema_version: 2,
      migration_revision: SELECTION_SCHEMA_REVISION,
    });
    expect(readMarker(paths.automationDbPath, "automation_meta")).toEqual({
      schema_version: 2,
      migration_revision: SELECTION_SCHEMA_REVISION,
    });
    const product = new DatabaseSync(paths.productDbPath, { readOnly: true });
    const json = String(
      (
        product.prepare("SELECT requested_selection_json FROM product_runs").get() as Record<
          string,
          unknown
        >
      ).requested_selection_json,
    );
    product.close();
    expect(json).toContain('"runtimeChoice":{"kind":"product-model"');
    expect(json).not.toContain("enforcement");
    const reopened = new DatabaseSync(paths.productDbPath, { readOnly: true });
    expect(
      reopened
        .prepare(
          `SELECT state, send_boundary, attempt_count, automatic_replay_count,
                  engine_id, prepared_selection_json
           FROM product_outbox WHERE run_id = 'run-1'`,
        )
        .get(),
    ).toEqual({
      state: "terminal",
      send_boundary: "accepted",
      attempt_count: 2,
      automatic_replay_count: 0,
      engine_id: "legacy-engine",
      prepared_selection_json: null,
    });
    expect(
      JSON.parse(
        String(
          (
            reopened
              .prepare("SELECT receipt_json FROM product_operation_receipts WHERE run_id = 'run-1'")
              .get() as Record<string, unknown>
          ).receipt_json,
        ),
      ),
    ).toMatchObject({
      state: "settled",
      evidence: { kind: "accepted-operation", operationRef: "operation-1" },
      resolvedSelection: { engineModeId: null },
    });
    expect(
      reopened
        .prepare("PRAGMA table_info(product_runs)")
        .all()
        .find((column) => column.name === "package_generation"),
    ).toMatchObject({ notnull: 0 });
    expect(
      reopened
        .prepare("PRAGMA table_info(product_outbox)")
        .all()
        .find((column) => column.name === "engine_id"),
    ).toMatchObject({ notnull: 1 });
    expect(
      (
        reopened
          .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'product_outbox'")
          .get() as Record<string, unknown>
      ).sql,
    ).toContain("'observed'");
    const migratedMutations = reopened
      .prepare(
        "SELECT mutation_id, mutation_kind, request_json, response_json FROM product_mutations ORDER BY mutation_id",
      )
      .all() as Array<Record<string, unknown>>;
    expect(migratedMutations).toHaveLength(24);
    for (const row of migratedMutations) {
      expect(JSON.parse(String(row.request_json))).toMatchObject({
        protocolVersion: 2,
        mutationId: row.mutation_id,
      });
      expect(PRODUCT_MUTATION_KINDS).toContain(row.mutation_kind);
      expect(() => JSON.parse(String(row.response_json))).not.toThrow();
    }
    const canonicalMutationBytes = JSON.stringify(migratedMutations);
    expect(
      (
        reopened.prepare("SELECT COUNT(*) AS count FROM product_facts").get() as Record<
          string,
          unknown
        >
      ).count,
    ).toBe(0);
    expect(
      reopened
        .prepare(
          "SELECT engine_sequence, kind, summary, created_at FROM product_runtime_activities ORDER BY engine_sequence",
        )
        .all(),
    ).toEqual([
      {
        engine_sequence: 7,
        kind: "thinking",
        summary: JSON.stringify({ code: "thinking-delta", text: "historical" }),
        created_at: "2026-08-06T00:00:07.000Z",
      },
      {
        engine_sequence: 8,
        kind: "usage",
        summary: JSON.stringify({
          code: "usage-observed",
          input: 1,
          output: 2,
          cacheRead: 0,
          cacheWrite: 0,
          total: 3,
        }),
        created_at: "2026-08-06T00:00:08.000Z",
      },
    ]);
    expect(
      (
        reopened
          .prepare("SELECT COUNT(*) AS count FROM product_runtime_fact_cursors")
          .get() as Record<string, unknown>
      ).count,
    ).toBe(0);
    reopened.close();

    await coordinateSelectionSchemaV2(paths);
    const reopenedAgain = new DatabaseSync(paths.productDbPath, { readOnly: true });
    const afterReopen = reopenedAgain
      .prepare(
        "SELECT mutation_id, mutation_kind, request_json, response_json FROM product_mutations ORDER BY mutation_id",
      )
      .all() as Array<Record<string, unknown>>;
    reopenedAgain.close();
    expect(JSON.stringify(afterReopen)).toBe(canonicalMutationBytes);

    const boundary: ProductExecutionBoundary = {
      prepare: () =>
        Effect.succeed({
          engineId: "opencode",
          resolvedSelection: externalResolvedSelection,
          close: async () => undefined,
        }),
      attempt: () =>
        Effect.succeed({
          kind: "rejected",
          code: "NOT_USED",
          message: "The migration admission fixture does not dispatch.",
          retryable: false,
        }),
    };
    const runtime = ManagedRuntime.make(
      makeProductControlPlaneLayer(paths.productDbPath, boundary, externalCatalog),
    );
    const controlPlane = await runtime.runPromise(Effect.service(ProductControlPlane));
    const queued = await runtime.runPromise(
      controlPlane.putQueueItem({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: ProductConversationId.makeUnsafe("conversation-1"),
        itemId: ProductQueueItemId.makeUnsafe("queue-external-after-migration"),
        text: "external after migration",
        requestedSelection: externalSelection,
        resources: [],
        expectedRevision: null,
      }),
    );
    await runtime.runPromise(
      controlPlane.admitQueueItem({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: ProductConversationId.makeUnsafe("conversation-1"),
        itemId: queued.id,
        expectedRevision: queued.revision,
        entryId: ProductEntryId.makeUnsafe("entry-external-after-migration"),
        runId: ProductRunId.makeUnsafe("run-external-after-migration"),
        dispatchId: ProductDispatchId.makeUnsafe("dispatch-external-after-migration"),
        receiptId: ProductOperationReceiptId.makeUnsafe("receipt-external-after-migration"),
      }),
    );
    await runtime.dispose();

    const admitted = new DatabaseSync(paths.productDbPath);
    admitted.exec("PRAGMA foreign_keys = ON");
    try {
      expect(
        admitted
          .prepare("SELECT package_generation FROM product_runs WHERE run_id = ?")
          .get("run-external-after-migration"),
      ).toEqual({ package_generation: null });
      expect(
        admitted
          .prepare("SELECT engine_id, prepared_selection_json FROM product_outbox WHERE run_id = ?")
          .get("run-external-after-migration"),
      ).toMatchObject({ engine_id: "opencode" });
      expect(readMarker(paths.productDbPath, "product_meta")).toEqual({
        schema_version: 2,
        migration_revision: SELECTION_SCHEMA_REVISION,
      });
      expect(admitted.prepare("PRAGMA integrity_check").get()).toEqual({
        integrity_check: "ok",
      });
      expect(admitted.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      admitted.close();
    }
  });

  it("rolls back an active file transaction and resumes a post-Product-commit mixed state exactly once", async () => {
    const paths = await seed();
    await expect(
      coordinateSelectionSchemaV2({
        ...paths,
        fault: (point) => {
          if (point === "inside-product-transaction") throw new Error("fixture product crash");
        },
      }),
    ).rejects.toThrow("fixture product crash");
    expect(readMarker(paths.productDbPath, "product_meta").schema_version).toBe(1);

    await expect(
      coordinateSelectionSchemaV2({
        ...paths,
        fault: (point) => {
          if (point === "after-product-commit") throw new Error("fixture process loss");
        },
      }),
    ).rejects.toThrow("fixture process loss");
    expect(readMarker(paths.productDbPath, "product_meta").schema_version).toBe(2);
    await expect(async () =>
      readMarker(paths.automationDbPath, "automation_meta"),
    ).rejects.toThrow();

    await coordinateSelectionSchemaV2(paths);
    expect(readMarker(paths.productDbPath, "product_meta").schema_version).toBe(2);
    expect(readMarker(paths.automationDbPath, "automation_meta").schema_version).toBe(2);
    await coordinateSelectionSchemaV2(paths);
  });

  it.each([
    "after-preflight",
    "inside-product-transaction",
    "after-product-commit",
    "inside-automation-transaction",
    "after-automation-commit",
  ] as const)("converges exactly once after a process loss at %s", async (crashPoint) => {
    const paths = await seed();
    await expect(
      coordinateSelectionSchemaV2({
        ...paths,
        fault: (point) => {
          if (point === crashPoint) throw new Error(`process loss at ${point}`);
        },
      }),
    ).rejects.toThrow(`process loss at ${crashPoint}`);

    await coordinateSelectionSchemaV2(paths);
    await coordinateSelectionSchemaV2(paths);
    expect(readMarker(paths.productDbPath, "product_meta").schema_version).toBe(2);
    expect(readMarker(paths.automationDbPath, "automation_meta").schema_version).toBe(2);
    const reopened = new DatabaseSync(paths.productDbPath, { readOnly: true });
    try {
      expect(
        (
          reopened.prepare("SELECT COUNT(*) AS count FROM product_mutations").get() as Record<
            string,
            unknown
          >
        ).count,
      ).toBe(24);
    } finally {
      reopened.close();
    }
  });
});
