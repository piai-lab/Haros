/**
 * Adds the timestamped, text-free archive facts required for truthful recent
 * model and token-breakdown insights after a thread is purged. Legacy rows are
 * deliberately left incomplete instead of receiving fabricated backfills.
 */
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { columnExists } from "./schemaHelpers.ts";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE IF NOT EXISTS profile_stats_deleted_turn_events (
      thread_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      provider TEXT,
      model TEXT,
      reasoning TEXT
    )
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS idx_profile_stats_deleted_turn_events_thread_created
    ON profile_stats_deleted_turn_events(thread_id, created_at)
  `;

  if (!(yield* columnExists(sql, "profile_stats_deleted_threads", "turn_events_complete"))) {
    yield* sql`
      ALTER TABLE profile_stats_deleted_threads
      ADD COLUMN turn_events_complete INTEGER NOT NULL DEFAULT 0
    `;
  }
  if (!(yield* columnExists(sql, "profile_stats_deleted_threads", "project_title"))) {
    yield* sql`
      ALTER TABLE profile_stats_deleted_threads
      ADD COLUMN project_title TEXT
    `;
  }
  if (!(yield* columnExists(sql, "profile_stats_deleted_tokens", "cached_input_tokens"))) {
    yield* sql`
      ALTER TABLE profile_stats_deleted_tokens
      ADD COLUMN cached_input_tokens INTEGER
    `;
  }
  if (!(yield* columnExists(sql, "profile_stats_deleted_tokens", "uncached_input_tokens"))) {
    yield* sql`
      ALTER TABLE profile_stats_deleted_tokens
      ADD COLUMN uncached_input_tokens INTEGER
    `;
  }
  if (!(yield* columnExists(sql, "profile_stats_deleted_tokens", "output_tokens"))) {
    yield* sql`
      ALTER TABLE profile_stats_deleted_tokens
      ADD COLUMN output_tokens INTEGER
    `;
  }
});
