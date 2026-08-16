// FILE: 093_AutomationDurability.ts
// Purpose: Adds durable Automation failure policy, disable metadata, and revision authority.

import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { columnExists } from "./schemaHelpers.ts";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  if (!(yield* columnExists(sql, "automation_definitions", "stop_after_consecutive_failures"))) {
    yield* sql`
      ALTER TABLE automation_definitions
      ADD COLUMN stop_after_consecutive_failures INTEGER
      CHECK (
        stop_after_consecutive_failures IS NULL
        OR stop_after_consecutive_failures >= 1
      )
    `;
    // Preserve the exact legacy safety behavior: true stopped at the first failure.
    yield* sql`
      UPDATE automation_definitions
      SET stop_after_consecutive_failures = CASE stop_on_error WHEN 1 THEN 1 ELSE NULL END
    `;
  }

  if (!(yield* columnExists(sql, "automation_definitions", "consecutive_failure_count"))) {
    yield* sql`
      ALTER TABLE automation_definitions
      ADD COLUMN consecutive_failure_count INTEGER NOT NULL DEFAULT 0
    `;
  }

  if (!(yield* columnExists(sql, "automation_definitions", "disabled_reason"))) {
    yield* sql`
      ALTER TABLE automation_definitions
      ADD COLUMN disabled_reason TEXT
      CHECK (
        disabled_reason IS NULL
        OR disabled_reason IN ('failures', 'max-iterations', 'completion', 'schedule', 'user')
      )
    `;
  }

  if (!(yield* columnExists(sql, "automation_definitions", "disabled_at"))) {
    yield* sql`
      ALTER TABLE automation_definitions
      ADD COLUMN disabled_at TEXT
    `;
  }

  if (!(yield* columnExists(sql, "automation_definitions", "definition_revision"))) {
    yield* sql`
      ALTER TABLE automation_definitions
      ADD COLUMN definition_revision INTEGER NOT NULL DEFAULT 0
    `;
  }
});
