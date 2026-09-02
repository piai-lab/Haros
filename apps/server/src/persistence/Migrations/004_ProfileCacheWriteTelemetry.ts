import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

/** Preserve cache-write tokens when a deleted thread is folded into lifetime profile stats. */
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`
    ALTER TABLE profile_stats_deleted_tokens
    ADD COLUMN cache_write_input_tokens INTEGER
  `;
});
