// FILE: 095_ProjectionThreadsForkScope.ts
// Purpose: Persists the authoritative history-only cutoff for message-scoped forks.

import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { columnExists } from "./schemaHelpers.ts";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  if (!(yield* columnExists(sql, "projection_threads", "fork_scope_json"))) {
    yield* sql`
      ALTER TABLE projection_threads
      ADD COLUMN fork_scope_json TEXT
    `;
  }
});
