import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

/**
 * Add short-lived Ask User draft state to the existing settlement owner.
 *
 * Drafts are deliberately not events: they may be overwritten, are cleared
 * when the lifecycle leaves `pending`, and disappear with the thread.
 */
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`ALTER TABLE projection_pending_interactions ADD COLUMN draft_json TEXT`;
  yield* sql`
    ALTER TABLE projection_pending_interactions
    ADD COLUMN draft_revision INTEGER NOT NULL DEFAULT 0
  `;
  yield* sql`ALTER TABLE projection_pending_interactions ADD COLUMN draft_updated_at TEXT`;

  // Rows from earlier schemas cannot carry a valid draft. Normalize any
  // non-pending lifecycle defensively so backup/restore has one invariant.
  yield* sql`
    UPDATE projection_pending_interactions
    SET draft_json = NULL, draft_revision = 0, draft_updated_at = NULL
    WHERE interaction_kind <> 'userInput' OR status <> 'pending'
  `;
});
