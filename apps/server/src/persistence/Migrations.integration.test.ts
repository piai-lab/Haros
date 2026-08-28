import { assert, describe, it } from "@effect/vitest";
import { Cause, Effect, Exit, Layer, Schema } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { MigrationLineageError, MigrationSchemaTooNewError } from "./Errors.ts";
import { migrationEntries, runMigrations } from "./Migrations.ts";
import * as NodeSqliteClient from "./NodeSqliteClient.ts";

const layer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));

layer("HarnessOS initial schema", (it) => {
  it.effect("creates the complete canonical schema once", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      assert.deepStrictEqual(yield* runMigrations(), [[1, "HarnessOSInitialSchema"]]);
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
        SELECT name FROM pragma_table_info('projection_thread_sessions')
      `;
      assert.includeMembers(
        engineColumns.map(({ name }) => name),
        ["engine", "engine_session_id", "engine_thread_id"],
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

describe("HarnessOS migration registry", () => {
  it("starts at one fresh baseline", () => {
    assert.deepStrictEqual(
      migrationEntries.map(([id, name]) => [id, name]),
      [[1, "HarnessOSInitialSchema"]],
    );
  });
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
        VALUES (2, 'ForeignSchema')
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
