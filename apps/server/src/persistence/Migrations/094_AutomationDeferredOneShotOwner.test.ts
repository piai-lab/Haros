import { assert, it } from "@effect/vitest";
import { Effect } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

it.effect("094 adds an empty deferred one-shot owner to every through-93 definition", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations({ toMigrationInclusive: 93 });
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
          'once-enabled', 'project-legacy', 'Enabled', 'Run.',
          '{"type":"once","runAt":"2026-08-17T00:00:00.000Z"}', 1,
          '2026-08-17T00:00:00.000Z', '{"provider":"codex","model":"gpt-5"}',
          'approval-required', 'default', 'auto', 'heartbeat', 'thread-1', NULL, 0,
          '{"type":"none"}', 1, 60, 3600, '{"type":"none"}', 'coalesce', '[]', 0,
          '2026-08-16T00:00:00.000Z', '2026-08-16T00:00:00.000Z', NULL
        ),
        (
          'once-disabled', 'project-legacy', 'Disabled', 'Run.',
          '{"type":"once","runAt":"2026-08-17T00:00:00.000Z"}', 0, NULL,
          '{"provider":"codex","model":"gpt-5"}', 'approval-required', 'default',
          'auto', 'heartbeat', 'thread-2', NULL, 0, '{"type":"none"}', 1, 60, 3600,
          '{"type":"none"}', 'coalesce', '[]', 0, '2026-08-16T00:00:00.000Z',
          '2026-08-16T00:00:00.000Z', NULL
        ),
        (
          'once-archived', 'project-legacy', 'Archived', 'Run.',
          '{"type":"once","runAt":"2026-08-17T00:00:00.000Z"}', 0, NULL,
          '{"provider":"codex","model":"gpt-5"}', 'approval-required', 'default',
          'auto', 'heartbeat', 'thread-3', NULL, 0, '{"type":"none"}', 1, 60, 3600,
          '{"type":"none"}', 'coalesce', '[]', 0, '2026-08-16T00:00:00.000Z',
          '2026-08-16T00:00:00.000Z', '2026-08-16T00:01:00.000Z'
        )
    `;

    const executed = yield* runMigrations({ toMigrationInclusive: 94 });
    assert.deepStrictEqual(executed, [[94, "AutomationDeferredOneShotOwner"]]);
    assert.deepStrictEqual(
      yield* sql<{ readonly id: string; readonly owner: string | null }>`
        SELECT automation_id AS id, deferred_one_shot_owner_run_id AS owner
        FROM automation_definitions
        ORDER BY automation_id
      `,
      [
        { id: "once-archived", owner: null },
        { id: "once-disabled", owner: null },
        { id: "once-enabled", owner: null },
      ],
    );
    assert.lengthOf(yield* runMigrations({ toMigrationInclusive: 94 }), 0);
  }).pipe(Effect.provide(NodeSqliteClient.layerMemory())),
);
