import { assert, it } from "@effect/vitest";
import { Effect } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

it.effect("093 upgrades a through-92 database without inventing disable causes", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations({ toMigrationInclusive: 92 });
    yield* sql`
      INSERT INTO automation_definitions (
        automation_id, project_id, name, prompt, schedule_json, enabled, next_run_at,
        model_selection_json, runtime_mode, interaction_mode, worktree_mode, mode,
        target_thread_id, max_iterations, stop_on_error, completion_policy_json,
        completion_policy_version, minimum_interval_seconds, max_runtime_seconds,
        retry_policy_json, misfire_policy, acknowledged_risks_json, iteration_count,
        created_at, updated_at, archived_at
      ) VALUES
        (
          'legacy-stop', 'project-legacy', 'Legacy stop', 'Run.', '{"type":"manual"}',
          0, NULL, '{"provider":"codex","model":"gpt-5"}', 'approval-required',
          'default', 'auto', 'standalone', NULL, 3, 1, '{"type":"none"}', 1, 60,
          3600, '{"type":"none"}', 'coalesce', '[]', 3,
          '2026-08-16T00:00:00.000Z', '2026-08-16T00:00:00.000Z', NULL
        ),
        (
          'legacy-continue', 'project-legacy', 'Legacy continue', 'Run.', '{"type":"manual"}',
          1, NULL, '{"provider":"codex","model":"gpt-5"}', 'approval-required',
          'default', 'auto', 'standalone', NULL, NULL, 0, '{"type":"none"}', 1, 60,
          3600, '{"type":"none"}', 'coalesce', '[]', 0,
          '2026-08-16T00:00:00.000Z', '2026-08-16T00:00:00.000Z', NULL
        )
    `;

    yield* runMigrations({ toMigrationInclusive: 93 });

    const rows = yield* sql<{
      readonly id: string;
      readonly threshold: number | null;
      readonly count: number;
      readonly reason: string | null;
      readonly disabledAt: string | null;
      readonly revision: number;
    }>`
      SELECT automation_id AS id,
             stop_after_consecutive_failures AS threshold,
             consecutive_failure_count AS count,
             disabled_reason AS reason,
             disabled_at AS "disabledAt",
             definition_revision AS revision
      FROM automation_definitions
      ORDER BY automation_id
    `;
    assert.deepStrictEqual(rows, [
      {
        id: "legacy-continue",
        threshold: null,
        count: 0,
        reason: null,
        disabledAt: null,
        revision: 0,
      },
      {
        id: "legacy-stop",
        threshold: 3,
        count: 0,
        reason: null,
        disabledAt: null,
        revision: 0,
      },
    ]);
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);
