import { assert, it } from "@effect/vitest";
import { Effect } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { describe } from "vitest";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

describe("095_ProjectionThreadsForkScope", () => {
  it.effect("adds an empty fork scope without guessing legacy fork semantics", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 94 });
      yield* sql`
        INSERT INTO projection_threads (
          thread_id, project_id, title, model_selection_json, fork_source_thread_id,
          created_at, updated_at
        ) VALUES (
          'thread-fork', 'project-1', 'Legacy fork',
          '{"provider":"codex","model":"gpt-5"}', 'thread-source',
          '2026-08-17T00:00:00.000Z', '2026-08-17T00:00:00.000Z'
        )
      `;

      yield* runMigrations({ toMigrationInclusive: 95 });

      const rows = yield* sql<{ readonly forkScope: string | null }>`
        SELECT fork_scope_json AS "forkScope"
        FROM projection_threads
        WHERE thread_id = 'thread-fork'
      `;
      assert.strictEqual(rows[0]?.forkScope, null);
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
  );
});
