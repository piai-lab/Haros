import { assert, it } from "@effect/vitest";
import { Effect } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { describe } from "vitest";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

describe("090_ProjectionThreadGroups", () => {
  it.effect("converts existing Project Space filing into initial conversation membership", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 89 });

      yield* sql`
        INSERT INTO projection_projects (
          project_id, title, workspace_root, scripts_json, space_id, created_at, updated_at
        ) VALUES (
          'project-existing', 'Existing', '/tmp/existing', '[]', 'group-existing',
          '2026-08-09T00:00:00.000Z', '2026-08-09T00:00:00.000Z'
        )
      `;
      yield* sql`
        INSERT INTO projection_threads (
          thread_id, project_id, title, model_selection_json, created_at, updated_at
        ) VALUES (
          'thread-existing', 'project-existing', 'Existing conversation',
          '{"provider":"codex","model":"gpt-5"}',
          '2026-08-09T00:00:00.000Z', '2026-08-09T00:00:00.000Z'
        )
      `;

      yield* runMigrations({ toMigrationInclusive: 90 });

      const rows = yield* sql<{ readonly groupIds: string }>`
        SELECT group_ids_json AS "groupIds"
        FROM projection_threads
        WHERE thread_id = 'thread-existing'
      `;
      assert.strictEqual(rows[0]?.groupIds, '["group-existing"]');
    }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
  );
});
