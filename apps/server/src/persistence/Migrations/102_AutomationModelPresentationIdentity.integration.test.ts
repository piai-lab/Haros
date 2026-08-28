import { assert, it } from "@effect/vitest";
import { Effect } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { describe } from "vitest";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

describe("102_AutomationModelPresentationIdentity", () => {
  it.effect(
    "adds one nullable identity snapshot column without rewriting existing definitions",
    () =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* runMigrations({ toMigrationInclusive: 101 });
        yield* sql`
        INSERT INTO automation_definitions (
          automation_id, project_id, name, prompt, schedule_json, enabled, next_run_at,
          model_selection_json, runtime_mode, interaction_mode, worktree_mode, mode,
          stop_on_error, minimum_interval_seconds, max_runtime_seconds, retry_policy_json,
          misfire_policy, acknowledged_risks_json, iteration_count, created_at, updated_at
        ) VALUES (
          'automation-legacy', 'project-1', 'Legacy', 'Prompt', '{"type":"manual"}', 1, NULL,
          '{"engine":"opencode","model":"deepseek/deepseek-v4-flash"}',
          'approval-required', 'default', 'auto', 'standalone', 1, 60, 3600,
          '{"type":"none"}', 'coalesce', '[]', 0,
          '2026-08-28T00:00:00.000Z', '2026-08-28T00:00:00.000Z'
        )
      `;

        assert.deepStrictEqual(yield* runMigrations({ toMigrationInclusive: 102 }), [
          [102, "AutomationModelPresentationIdentity"],
        ]);
        assert.deepStrictEqual(yield* runMigrations({ toMigrationInclusive: 102 }), []);
        assert.deepStrictEqual(
          yield* sql<{ readonly identity: string | null }>`
          SELECT model_presentation_identity_json AS identity
          FROM automation_definitions
          WHERE automation_id = 'automation-legacy'
        `,
          [{ identity: null }],
        );
      }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
  );
});
