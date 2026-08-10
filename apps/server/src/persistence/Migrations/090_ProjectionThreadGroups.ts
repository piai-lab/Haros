/**
 * Adds the canonical many-to-many Group membership to the existing Thread
 * projection. Space continues to own only Group identity/name/order.
 */
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as Effect from "effect/Effect";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const [column] = yield* sql<{ readonly exists: number }>`
    SELECT EXISTS(
      SELECT 1
      FROM pragma_table_info('projection_threads')
      WHERE name = 'group_ids_json'
    ) AS "exists"
  `;
  if (column?.exists !== 1) {
    yield* sql`
      ALTER TABLE projection_threads
      ADD COLUMN group_ids_json TEXT NOT NULL DEFAULT '[]'
    `;
  }

  // Preserve the user's existing organization once: a Project previously filed into a Space
  // seeds that Space identity onto each conversation already in the Project. New membership is
  // Thread-owned; the web product no longer reads or writes Project.spaceId.
  yield* sql`
    UPDATE projection_threads
    SET group_ids_json = json_array((
      SELECT project.space_id
      FROM projection_projects AS project
      WHERE project.project_id = projection_threads.project_id
    ))
    WHERE group_ids_json = '[]'
      AND EXISTS (
        SELECT 1
        FROM projection_projects AS project
        WHERE project.project_id = projection_threads.project_id
          AND project.space_id IS NOT NULL
      )
  `;
});
