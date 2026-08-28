import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { columnExists } from "./schemaHelpers.ts";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  if (!(yield* columnExists(sql, "automation_definitions", "model_presentation_identity_json"))) {
    yield* sql`
      ALTER TABLE automation_definitions
      ADD COLUMN model_presentation_identity_json TEXT
    `;
  }
});
