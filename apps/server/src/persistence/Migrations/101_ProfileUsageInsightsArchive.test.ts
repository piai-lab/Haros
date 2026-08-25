import { assert, it } from "@effect/vitest";
import { Effect } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { describe } from "vitest";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

describe("101_ProfileUsageInsightsArchive", () => {
  it.effect("adds precise future archive fields without fabricating legacy coverage", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 100 });
      yield* sql`
        INSERT INTO profile_stats_deleted_threads (thread_id, project_id, deleted_at)
        VALUES ('legacy-thread', 'legacy-project', '2026-08-01T00:00:00.000Z')
      `;
      yield* sql`
        INSERT INTO profile_stats_deleted_tokens (
          thread_id, created_at, provider, model, tokens
        ) VALUES (
          'legacy-thread', '2026-08-01T00:00:00.000Z', 'codex', 'gpt-5-codex', 42
        )
      `;

      assert.deepStrictEqual(yield* runMigrations({ toMigrationInclusive: 101 }), [
        [101, "ProfileUsageInsightsArchive"],
      ]);
      assert.deepStrictEqual(yield* runMigrations({ toMigrationInclusive: 101 }), []);

      assert.deepStrictEqual(
        yield* sql<{
          readonly complete: number;
          readonly projectTitle: string | null;
        }>`
          SELECT
            turn_events_complete AS complete,
            project_title AS projectTitle
          FROM profile_stats_deleted_threads
          WHERE thread_id = 'legacy-thread'
        `,
        [{ complete: 0, projectTitle: null }],
      );
      assert.deepStrictEqual(
        yield* sql<{
          readonly cached: number | null;
          readonly uncached: number | null;
          readonly output: number | null;
        }>`
          SELECT
            cached_input_tokens AS cached,
            uncached_input_tokens AS uncached,
            output_tokens AS output
          FROM profile_stats_deleted_tokens
          WHERE thread_id = 'legacy-thread'
        `,
        [{ cached: null, uncached: null, output: null }],
      );
      const turnEventTable = yield* sql<{ readonly count: number }>`
        SELECT COUNT(*) AS count
        FROM sqlite_master
        WHERE type = 'table' AND name = 'profile_stats_deleted_turn_events'
      `;
      assert.strictEqual(turnEventTable[0]?.count, 1);
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
  );
});
