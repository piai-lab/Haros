import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

/**
 * Persist the immutable Product admission next to the Engine binding.
 *
 * Orphaned, deleted, mixed, or otherwise unknowable legacy bindings remain
 * NULL. Runtime recovery must fail them visibly instead of fabricating Product
 * authority from stale runtime payload fields.
 */
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`ALTER TABLE engine_session_runtime ADD COLUMN admission_json TEXT`;

  yield* sql`
    UPDATE engine_session_runtime
    SET admission_json = (
      SELECT CASE projects.kind
        WHEN 'project' THEN CASE
          WHEN length(trim(projects.workspace_root)) > 0 THEN json_object(
            'productSurface', 'agent',
            'workSurface', 'agent',
            'projectContextRoot', projects.workspace_root
          )
          ELSE NULL
        END
        WHEN 'chat' THEN json_object(
          'productSurface', 'chat',
          'workSurface', 'chat',
          'projectContextRoot', NULL
        )
        WHEN 'studio' THEN json_object(
          'productSurface', 'studio',
          'workSurface', 'chat',
          'projectContextRoot', NULL
        )
        ELSE NULL
      END
      FROM projection_threads AS threads
      JOIN projection_projects AS projects
        ON projects.project_id = threads.project_id
      WHERE threads.thread_id = engine_session_runtime.thread_id
        AND threads.deleted_at IS NULL
        AND projects.deleted_at IS NULL
      LIMIT 1
    )
  `;

  // Retire the two former runtime-payload facts after the one-way backfill.
  yield* sql`
    UPDATE engine_session_runtime
    SET runtime_payload_json = CASE
      WHEN runtime_payload_json IS NULL THEN NULL
      WHEN json_valid(runtime_payload_json) THEN json_remove(
        runtime_payload_json,
        '$.workSurface',
        '$.projectContextRoot'
      )
      ELSE runtime_payload_json
    END
  `;
});
