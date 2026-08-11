// FILE: 091_UsageHistoryIndex.ts
// Purpose: Adds the rebuildable, consent-gated Provider archive usage projection.

import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE IF NOT EXISTS usage_history_control (
      singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
      consent_state TEXT NOT NULL CHECK (consent_state IN ('not-authorized', 'authorized')),
      status TEXT NOT NULL CHECK (
        status IN ('not-authorized', 'idle', 'indexing', 'partial', 'ready', 'paused', 'stale')
      ),
      authorized_at TEXT,
      updated_at TEXT,
      last_completed_at TEXT,
      pricing_version TEXT NOT NULL,
      workspace_hash_salt TEXT NOT NULL,
      CHECK (
        (consent_state = 'not-authorized' AND authorized_at IS NULL)
        OR consent_state = 'authorized'
      )
    )
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS usage_history_provider_state (
      provider TEXT PRIMARY KEY CHECK (provider IN ('codex', 'claudeAgent')),
      status TEXT NOT NULL CHECK (
        status IN ('pending', 'indexing', 'ready', 'partial', 'paused', 'unsupported')
      ),
      discovery_cursor TEXT,
      discovery_generation INTEGER NOT NULL DEFAULT 0 CHECK (discovery_generation >= 0),
      discovery_complete INTEGER NOT NULL DEFAULT 0 CHECK (discovery_complete IN (0, 1)),
      files_discovered INTEGER NOT NULL DEFAULT 0 CHECK (files_discovered >= 0),
      files_indexed INTEGER NOT NULL DEFAULT 0 CHECK (files_indexed >= 0),
      bytes_discovered INTEGER NOT NULL DEFAULT 0 CHECK (bytes_discovered >= 0),
      bytes_read INTEGER NOT NULL DEFAULT 0 CHECK (bytes_read >= 0),
      skipped_files INTEGER NOT NULL DEFAULT 0 CHECK (skipped_files >= 0),
      restart_attempts INTEGER NOT NULL DEFAULT 0 CHECK (restart_attempts >= 0),
      detail_code TEXT,
      last_completed_at TEXT
    )
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS usage_history_files (
      file_id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL CHECK (provider IN ('codex', 'claudeAgent')),
      root_key TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      device_id TEXT NOT NULL,
      inode_id TEXT NOT NULL,
      size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
      mtime_ms INTEGER NOT NULL CHECK (mtime_ms >= 0),
      indexed_offset INTEGER NOT NULL DEFAULT 0 CHECK (indexed_offset >= 0),
      parser_version INTEGER NOT NULL CHECK (parser_version > 0),
      session_key TEXT,
      workspace_key TEXT,
      workspace_label TEXT,
      model TEXT,
      discarding_oversized_line INTEGER NOT NULL DEFAULT 0 CHECK (discarding_oversized_line IN (0, 1)),
      cumulative_input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (cumulative_input_tokens >= 0),
      cumulative_output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (cumulative_output_tokens >= 0),
      cumulative_cache_read_tokens INTEGER NOT NULL DEFAULT 0 CHECK (cumulative_cache_read_tokens >= 0),
      cumulative_cache_write_tokens INTEGER NOT NULL DEFAULT 0 CHECK (cumulative_cache_write_tokens >= 0),
      last_seen_generation INTEGER NOT NULL CHECK (last_seen_generation >= 0),
      state TEXT NOT NULL CHECK (state IN ('pending', 'indexed', 'partial', 'skipped')),
      detail_code TEXT,
      UNIQUE (provider, root_key, relative_path)
    )
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS usage_history_events (
      provider TEXT NOT NULL CHECK (provider IN ('codex', 'claudeAgent')),
      event_key TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      occurred_on TEXT NOT NULL,
      session_key TEXT NOT NULL,
      model TEXT NOT NULL,
      workspace_key TEXT NOT NULL,
      workspace_label TEXT NOT NULL,
      input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
      output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
      cache_read_tokens INTEGER NOT NULL CHECK (cache_read_tokens >= 0),
      cache_write_tokens INTEGER NOT NULL CHECK (cache_write_tokens >= 0),
      PRIMARY KEY (provider, event_key)
    )
  `;

  yield* sql`
    CREATE TABLE IF NOT EXISTS usage_history_event_sources (
      file_id INTEGER NOT NULL REFERENCES usage_history_files(file_id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      event_key TEXT NOT NULL,
      PRIMARY KEY (file_id, provider, event_key),
      FOREIGN KEY (provider, event_key)
        REFERENCES usage_history_events(provider, event_key)
        ON DELETE CASCADE
    )
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS usage_history_files_pending_idx
    ON usage_history_files(provider, state, relative_path)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS usage_history_events_time_idx
    ON usage_history_events(occurred_at, provider)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS usage_history_events_model_idx
    ON usage_history_events(model, occurred_at)
  `;
  yield* sql`
    CREATE INDEX IF NOT EXISTS usage_history_events_workspace_idx
    ON usage_history_events(workspace_key, occurred_at)
  `;
});
