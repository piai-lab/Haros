// FILE: 094_AutomationDeferredOneShotOwner.ts
// Purpose: Adds the single durable owner pointer for a deferred scheduled one-shot run.

import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { columnExists } from "./schemaHelpers.ts";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  if (!(yield* columnExists(sql, "automation_definitions", "deferred_one_shot_owner_run_id"))) {
    yield* sql`
      ALTER TABLE automation_definitions
      ADD COLUMN deferred_one_shot_owner_run_id TEXT
    `;
  }
});
