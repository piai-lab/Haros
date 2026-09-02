import { assert, describe, it } from "@effect/vitest";
import { Cause, Effect, Exit, Layer, Schema } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { MigrationLineageError, MigrationSchemaTooNewError } from "./Errors.ts";
import { migrationEntries, runMigrations } from "./Migrations.ts";
import * as NodeSqliteClient from "./NodeSqliteClient.ts";

const layer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));

layer("Haros initial schema", (it) => {
  it.effect("creates the complete canonical schema once", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      assert.deepStrictEqual(yield* runMigrations(), [
        [1, "HarnessOSInitialSchema"],
        [2, "EngineSessionAdmission"],
        [3, "PendingUserInputDraft"],
        [4, "ProfileCacheWriteTelemetry"],
      ]);
      assert.deepStrictEqual(yield* runMigrations(), []);

      const requiredObjects = yield* sql<{ readonly name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE name IN (
          'orchestration_events',
          'projection_projects',
          'projection_threads',
          'projection_thread_sessions',
          'engine_session_runtime',
          'engine_runtime_events',
          'engine_runtime_open_turns',
          'engine_runtime_event_consumers',
          'engine_delivery_reconciliations',
          'host_gateway_operations',
          'automation_definitions',
          'projection_spaces'
        )
        ORDER BY name
      `;
      assert.lengthOf(requiredObjects, 12);

      const engineColumns = yield* sql<{ readonly name: string }>`
        SELECT name FROM pragma_table_info('engine_session_runtime')
      `;
      assert.includeMembers(
        engineColumns.map(({ name }) => name),
        ["engine", "admission_json"],
      );

      const pendingInteractionColumns = yield* sql<{ readonly name: string }>`
        SELECT name FROM pragma_table_info('projection_pending_interactions')
      `;
      assert.includeMembers(
        pendingInteractionColumns.map(({ name }) => name),
        ["draft_json", "draft_revision", "draft_updated_at"],
      );

      const deletedTokenColumns = yield* sql<{ readonly name: string }>`
        SELECT name FROM pragma_table_info('profile_stats_deleted_tokens')
      `;
      assert.include(
        deletedTokenColumns.map(({ name }) => name),
        "cache_write_input_tokens",
      );

      const schemaSql = yield* sql<{ readonly sql: string | null }>`
        SELECT sql FROM sqlite_master WHERE sql IS NOT NULL
      `;
      assert.notMatch(schemaSql.map(({ sql }) => sql).join("\n"), /provider/iu);

      const consumers = yield* sql<{ readonly consumerName: string }>`
        SELECT consumer_name AS "consumerName" FROM orchestration_consumer_state
        UNION ALL
        SELECT consumer_name AS "consumerName" FROM engine_runtime_event_consumers
        ORDER BY "consumerName"
      `;
      assert.deepStrictEqual(consumers, [
        { consumerName: "engine-command-reactor.v1" },
        { consumerName: "engine-runtime-ingestion.v1" },
      ]);
    }),
  );
});

const untrackedLayer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));

untrackedLayer("untracked database", (it) => {
  it.effect("rejects a non-empty database without modifying it", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`CREATE TABLE foreign_state (id TEXT PRIMARY KEY)`;

      const exit = yield* Effect.exit(runMigrations());
      assert.isTrue(Exit.isFailure(exit));
      if (Exit.isFailure(exit)) {
        assert.isTrue(Schema.is(MigrationLineageError)(Cause.squash(exit.cause)));
      }

      const tables = yield* sql<{ readonly name: string }>`
        SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name
      `;
      assert.deepStrictEqual(tables, [{ name: "foreign_state" }]);
    }),
  );
});

describe("Haros migration registry", () => {
  it("extends the one fresh baseline with numbered Product migrations", () => {
    assert.deepStrictEqual(
      migrationEntries.map(([id, name]) => [id, name]),
      [
        [1, "HarnessOSInitialSchema"],
        [2, "EngineSessionAdmission"],
        [3, "PendingUserInputDraft"],
        [4, "ProfileCacheWriteTelemetry"],
      ],
    );
  });
});

const admissionBackfillLayer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));

admissionBackfillLayer("Engine Session admission migration", (it) => {
  it.effect("backfills exact Product admission and leaves orphan bindings invalid", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      assert.deepStrictEqual(yield* runMigrations({ toMigrationInclusive: 1 }), [
        [1, "HarnessOSInitialSchema"],
      ]);

      for (const project of [
        { id: "project-agent", kind: "project", root: "/repo/agent" },
        { id: "project-chat", kind: "chat", root: "" },
        { id: "project-studio", kind: "studio", root: "" },
      ] as const) {
        yield* sql`
          INSERT INTO projection_projects (
            project_id, kind, title, workspace_root, scripts_json, created_at, updated_at
          ) VALUES (
            ${project.id}, ${project.kind}, ${project.id}, ${project.root}, '{}',
            '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
          )
        `;
        yield* sql`
          INSERT INTO projection_threads (
            thread_id, project_id, title, created_at, updated_at
          ) VALUES (
            ${`thread-${project.kind}`}, ${project.id}, ${project.id},
            '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'
          )
        `;
      }

      for (const threadId of ["thread-project", "thread-chat", "thread-studio", "thread-orphan"]) {
        yield* sql`
          INSERT INTO engine_session_runtime (
            thread_id, engine, adapter_key, runtime_mode, status, last_seen_at,
            resume_cursor_json, runtime_payload_json, lifecycle_generation
          ) VALUES (
            ${threadId}, 'oa', 'oa', 'full-access', 'stopped',
            '2026-09-01T00:00:00.000Z', NULL,
            '{"workSurface":"agent","projectContextRoot":"/stale","kept":true}',
            'legacy'
          )
        `;
      }

      assert.deepStrictEqual(yield* runMigrations(), [
        [2, "EngineSessionAdmission"],
        [3, "PendingUserInputDraft"],
        [4, "ProfileCacheWriteTelemetry"],
      ]);

      const rows = yield* sql<{
        readonly threadId: string;
        readonly admission: string | null;
        readonly runtimePayload: string | null;
      }>`
        SELECT
          thread_id AS "threadId",
          admission_json AS admission,
          runtime_payload_json AS "runtimePayload"
        FROM engine_session_runtime
        ORDER BY thread_id
      `;
      assert.deepStrictEqual(
        rows.map((row) => ({
          threadId: row.threadId,
          admission: row.admission === null ? null : JSON.parse(row.admission),
          runtimePayload: row.runtimePayload === null ? null : JSON.parse(row.runtimePayload),
        })),
        [
          {
            threadId: "thread-chat",
            admission: {
              productSurface: "chat",
              workSurface: "chat",
              projectContextRoot: null,
            },
            runtimePayload: { kept: true },
          },
          { threadId: "thread-orphan", admission: null, runtimePayload: { kept: true } },
          {
            threadId: "thread-project",
            admission: {
              productSurface: "agent",
              workSurface: "agent",
              projectContextRoot: "/repo/agent",
            },
            runtimePayload: { kept: true },
          },
          {
            threadId: "thread-studio",
            admission: {
              productSurface: "studio",
              workSurface: "chat",
              projectContextRoot: null,
            },
            runtimePayload: { kept: true },
          },
        ],
      );
    }),
  );
});

const foreignTrackerLayer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));

foreignTrackerLayer("foreign migration tracker", (it) => {
  it.effect("rejects a newer lineage before schema mutation", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`
        CREATE TABLE effect_sql_migrations (
          migration_id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      yield* sql`
        INSERT INTO effect_sql_migrations (migration_id, name)
        VALUES (5, 'ForeignSchema')
      `;

      const exit = yield* Effect.exit(runMigrations());
      assert.isTrue(Exit.isFailure(exit));
      if (Exit.isFailure(exit)) {
        assert.isTrue(Schema.is(MigrationSchemaTooNewError)(Cause.squash(exit.cause)));
      }

      const productTables = yield* sql<{ readonly count: number }>`
        SELECT COUNT(*) AS count
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT IN ('effect_sql_migrations', 'sqlite_sequence')
      `;
      assert.strictEqual(productTables[0]?.count, 0);
    }),
  );
});
