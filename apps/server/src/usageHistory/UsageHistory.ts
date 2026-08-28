// FILE: usageHistory/UsageHistory.ts
// Purpose: Consent-gated, durable usage-history projection with a killable archive-reader child.

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, watch, type FSWatcher } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  ServerCommandUsageHistoryInput,
  ServerCommandUsageHistoryResult,
  ServerGetUsageHistoryInput,
  ServerGetUsageHistoryResult,
  UsageHistoryGroupBy,
  UsageHistoryProvider,
  UsageHistoryProviderSummary,
  UsageHistoryProgress,
  UsageHistoryRow,
} from "@harnessos/contracts";
import { USAGE_HISTORY_UNKNOWN_MODEL, USAGE_HISTORY_UNKNOWN_WORKSPACE } from "@harnessos/contracts";
import { Effect, Exit, Layer, ServiceMap } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { ServerConfig } from "../config";
import { ServerSettingsService } from "../serverSettings";
import { estimateUsageHistoryCostMicros, USAGE_HISTORY_PRICING_VERSION } from "./pricing";
import {
  USAGE_HISTORY_DISCOVERY_BATCH_FILES,
  USAGE_HISTORY_PARSE_BATCH_BYTES,
  USAGE_HISTORY_PARSE_BATCH_FILES,
  USAGE_HISTORY_PARSE_FILE_BYTES,
  USAGE_HISTORY_PARSE_MAX_EVENTS,
  USAGE_HISTORY_PARSER_VERSION,
  type UsageHistoryDiscoverResponse,
  type UsageHistoryParseFile,
  type UsageHistoryParseResponse,
  type UsageHistoryWorkerRequest,
  type UsageHistoryWorkerResponse,
} from "./protocol";

const PROVIDERS = ["codex", "claude"] as const satisfies readonly UsageHistoryProvider[];
const WORKER_TIMEOUT_MS = 20_000;
const WORKER_STDOUT_LIMIT = 16 * 1024 * 1024;
const MAX_PROVIDER_RESTARTS = 2;

interface ControlRow {
  readonly consentState: "not-authorized" | "authorized";
  readonly status: ServerGetUsageHistoryResult["status"];
  readonly authorizedAt: string | null;
  readonly updatedAt: string | null;
  readonly lastCompletedAt: string | null;
  readonly workspaceHashSalt: string;
}

interface ProviderRow {
  readonly provider: UsageHistoryProvider;
  readonly status: UsageHistoryProviderSummary["status"];
  readonly discoveryCursor: string | null;
  readonly discoveryGeneration: number;
  readonly discoveryComplete: number;
  readonly filesDiscovered: number;
  readonly filesIndexed: number;
  readonly bytesDiscovered: number;
  readonly bytesRead: number;
  readonly skippedFiles: number;
  readonly restartAttempts: number;
  readonly detailCode: string | null;
  readonly lastCompletedAt: string | null;
}

interface FileRow {
  readonly fileId: number;
  readonly relativePath: string;
  readonly deviceId: string;
  readonly inodeId: string;
  readonly sizeBytes: number;
  readonly mtimeMs: number;
  readonly indexedOffset: number;
  readonly sessionKey: string | null;
  readonly workspaceKey: string | null;
  readonly workspaceLabel: string | null;
  readonly model: string | null;
  readonly discardingOversizedLine: number;
  readonly cumulativeInputTokens: number;
  readonly cumulativeOutputTokens: number;
  readonly cumulativeCacheReadTokens: number;
  readonly cumulativeCacheWriteTokens: number;
}

interface AggregateRow {
  readonly key: string;
  readonly provider: UsageHistoryProvider | null;
  readonly model: string | null;
  readonly workspace: string | null;
  readonly date: string | null;
  readonly sessionCount: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly estimatedCostMicros: number | null;
}

interface ModelAggregateRow {
  readonly key: string;
  readonly label: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
}

interface SessionAggregateRow {
  readonly key: string;
  readonly sessionCount: number;
}

export interface UsageHistoryShape {
  readonly get: (
    input: ServerGetUsageHistoryInput,
  ) => Effect.Effect<ServerGetUsageHistoryResult, unknown>;
  readonly command: (
    input: ServerCommandUsageHistoryInput,
  ) => Effect.Effect<ServerCommandUsageHistoryResult, unknown>;
}

export class UsageHistory extends ServiceMap.Service<UsageHistory, UsageHistoryShape>()(
  "harnessos/usageHistory/UsageHistory",
) {}

function workerEntryPath(): string {
  const override = process.env.HARNESSOS_USAGE_HISTORY_WORKER?.trim();
  if (override) return override;
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const built = path.resolve(moduleDirectory, "usageHistoryIndexer.mjs");
  if (existsSync(built)) return built;
  return path.resolve(moduleDirectory, "indexerProcess.ts");
}

function runWorker(
  request: UsageHistoryWorkerRequest,
  onSpawn: (child: ChildProcessWithoutNullStreams | null) => void,
): Promise<UsageHistoryWorkerResponse> {
  return new Promise((resolve, reject) => {
    const entry = workerEntryPath();
    const args = process.versions.bun ? [entry] : ["--max-old-space-size=96", entry];
    const childEnvironment = Object.fromEntries(
      ["LANG", "LC_ALL", "LC_CTYPE", "TZ", "TMPDIR"].flatMap((key) => {
        const value = process.env[key];
        return value ? [[key, value]] : [];
      }),
    );
    const child = spawn(process.execPath, args, {
      env: process.versions.bun
        ? childEnvironment
        : { ...childEnvironment, ELECTRON_RUN_AS_NODE: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    onSpawn(child);
    let stdout = "";
    let stderrBytes = 0;
    let settled = false;
    const finish = (operation: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      onSpawn(null);
      operation();
    };
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new Error("usage-history-worker-timeout")));
    }, WORKER_TIMEOUT_MS);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout) > WORKER_STDOUT_LIMIT) {
        child.kill("SIGKILL");
        finish(() => reject(new Error("usage-history-worker-output-limit")));
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > 64 * 1024) child.stderr.pause();
    });
    child.on("error", (cause) => finish(() => reject(cause)));
    child.on("close", (code, signal) => {
      finish(() => {
        if (code !== 0) {
          reject(new Error(`usage-history-worker-exit:${code ?? signal ?? "unknown"}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout) as UsageHistoryWorkerResponse);
        } catch {
          reject(new Error("usage-history-worker-invalid-response"));
        }
      });
    });
    child.stdin.end(JSON.stringify(request));
  });
}

const dateFloor = (range: ServerGetUsageHistoryInput["range"]): string | null => {
  if (!range || range === "all") return null;
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
};

const asProviderSummary = (row: ProviderRow): UsageHistoryProviderSummary => ({
  provider: row.provider,
  status: row.status,
  progress: {
    filesDiscovered: Number(row.filesDiscovered),
    filesIndexed: Number(row.filesIndexed),
    bytesDiscovered: Number(row.bytesDiscovered),
    bytesRead: Number(row.bytesRead),
    skippedFiles: Number(row.skippedFiles),
    discoveryComplete: Number(row.discoveryComplete) === 1,
  },
  ...(row.detailCode ? { detailCode: row.detailCode } : {}),
  ...(row.lastCompletedAt ? { lastCompletedAt: row.lastCompletedAt } : {}),
});

const makeUsageHistory = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const config = yield* ServerConfig;
  const serverSettings = yield* ServerSettingsService;
  let activeChild: ChildProcessWithoutNullStreams | null = null;
  let running = false;
  let stopped = false;
  let pauseRequested = false;
  let rerunRequested = false;
  const rootWatchers = new Map<UsageHistoryProvider, FSWatcher>();
  const rootRefreshTimers = new Map<UsageHistoryProvider, NodeJS.Timeout>();
  let startBackground: () => void = () => {
    rerunRequested = true;
  };

  yield* sql`
    INSERT INTO usage_history_control (
      singleton_id, consent_state, status, pricing_version, workspace_hash_salt
    ) VALUES (1, 'not-authorized', 'not-authorized', ${USAGE_HISTORY_PRICING_VERSION}, ${randomBytes(32).toString("hex")})
    ON CONFLICT (singleton_id) DO UPDATE SET pricing_version = excluded.pricing_version
  `;
  for (const provider of PROVIDERS) {
    yield* sql`
      INSERT INTO usage_history_provider_state (provider, status)
      VALUES (${provider}, 'pending')
      ON CONFLICT (provider) DO NOTHING
    `;
  }

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      stopped = true;
      activeChild?.kill("SIGKILL");
      activeChild = null;
      for (const watcher of rootWatchers.values()) watcher.close();
      rootWatchers.clear();
      for (const timer of rootRefreshTimers.values()) clearTimeout(timer);
      rootRefreshTimers.clear();
    }),
  );

  const readControl = () =>
    sql<ControlRow>`
      SELECT
        consent_state AS "consentState",
        status,
        authorized_at AS "authorizedAt",
        updated_at AS "updatedAt",
        last_completed_at AS "lastCompletedAt",
        workspace_hash_salt AS "workspaceHashSalt"
      FROM usage_history_control WHERE singleton_id = 1
    `.pipe(Effect.map((rows) => rows[0]!));

  const readProviders = () =>
    sql<ProviderRow>`
      SELECT provider, status,
        discovery_cursor AS "discoveryCursor",
        discovery_generation AS "discoveryGeneration",
        discovery_complete AS "discoveryComplete",
        files_discovered AS "filesDiscovered",
        files_indexed AS "filesIndexed",
        bytes_discovered AS "bytesDiscovered",
        bytes_read AS "bytesRead",
        skipped_files AS "skippedFiles",
        restart_attempts AS "restartAttempts",
        detail_code AS "detailCode",
        last_completed_at AS "lastCompletedAt"
      FROM usage_history_provider_state ORDER BY provider
    `;

  const roots = Effect.gen(function* () {
    const settings = yield* serverSettings.getSettings;
    const codexHome =
      settings.providers.codex.homePath.trim() ||
      process.env.CODEX_HOME?.trim() ||
      path.join(config.homeDir, ".codex");
    const claudeHome =
      process.env.CLAUDE_CONFIG_DIR?.trim() || path.join(config.homeDir, ".claude");
    return {
      codex: path.join(codexHome, "sessions"),
      claude: path.join(claudeHome, "projects"),
    } satisfies Record<UsageHistoryProvider, string>;
  });

  const scheduleRootRefresh = (provider: UsageHistoryProvider) => {
    const existing = rootRefreshTimers.get(provider);
    if (existing) clearTimeout(existing);
    rootRefreshTimers.set(
      provider,
      setTimeout(() => {
        rootRefreshTimers.delete(provider);
        if (stopped || pauseRequested) return;
        Effect.runFork(
          Effect.gen(function* () {
            const control = yield* readControl();
            if (
              control.consentState !== "authorized" ||
              control.status === "paused" ||
              control.status === "idle"
            )
              return;
            yield* sql`
              UPDATE usage_history_provider_state SET status = 'pending', discovery_cursor = NULL,
                discovery_generation = discovery_generation + 1, discovery_complete = 0,
                files_discovered = 0, bytes_discovered = 0, bytes_read = 0,
                restart_attempts = 0, detail_code = NULL
              WHERE provider = ${provider}
            `;
            yield* sql`
              UPDATE usage_history_control SET status = 'indexing', updated_at = ${new Date().toISOString()}
              WHERE singleton_id = 1
            `;
            startBackground();
          }).pipe(Effect.catch(() => Effect.void)) as Effect.Effect<void, never>,
        );
      }, 30_000),
    );
  };

  const installRootWatchers = (providerRoots: Record<UsageHistoryProvider, string>) => {
    for (const provider of PROVIDERS) {
      if (rootWatchers.has(provider) || !existsSync(providerRoots[provider])) continue;
      try {
        const watcher = watch(
          providerRoots[provider],
          {
            persistent: false,
            recursive: process.platform === "darwin" || process.platform === "win32",
          },
          () => scheduleRootRefresh(provider),
        );
        watcher.on("error", () => {
          watcher.close();
          rootWatchers.delete(provider);
        });
        rootWatchers.set(provider, watcher);
      } catch {
        // Root notification is an optimization. Manual refresh and checkpoint
        // resume remain available when the platform cannot watch this root.
      }
    }
  };

  const deleteFileContribution = (fileId: number) =>
    sql.withTransaction(
      Effect.gen(function* () {
        yield* sql`DELETE FROM usage_history_event_sources WHERE file_id = ${fileId}`;
        yield* sql`
          DELETE FROM usage_history_events
          WHERE NOT EXISTS (
            SELECT 1 FROM usage_history_event_sources source
            WHERE source.provider = usage_history_events.provider
              AND source.event_key = usage_history_events.event_key
          )
        `;
      }),
    );

  // Parser upgrades invalidate only the affected derived files. Startup performs
  // this small DB-only fence, then the dedicated Usage surface resumes discovery.
  const versionMismatches = yield* sql<{
    readonly fileId: number;
    readonly provider: UsageHistoryProvider;
  }>`
    SELECT file_id AS "fileId", provider FROM usage_history_files
    WHERE parser_version <> ${USAGE_HISTORY_PARSER_VERSION}
  `;
  if (versionMismatches.length > 0) {
    yield* sql.withTransaction(
      Effect.gen(function* () {
        for (const file of versionMismatches) {
          yield* sql`DELETE FROM usage_history_event_sources WHERE file_id = ${file.fileId}`;
          yield* sql`DELETE FROM usage_history_files WHERE file_id = ${file.fileId}`;
        }
        yield* sql`
          DELETE FROM usage_history_events
          WHERE NOT EXISTS (
            SELECT 1 FROM usage_history_event_sources source
            WHERE source.provider = usage_history_events.provider
              AND source.event_key = usage_history_events.event_key
          )
        `;
        for (const provider of new Set(versionMismatches.map((file) => file.provider))) {
          yield* sql`
            UPDATE usage_history_provider_state SET status = 'pending', discovery_cursor = NULL,
              discovery_generation = discovery_generation + 1, discovery_complete = 0,
              restart_attempts = 0, detail_code = 'parser-updated'
            WHERE provider = ${provider}
          `;
        }
        yield* sql`
          UPDATE usage_history_control SET status = 'indexing', updated_at = ${new Date().toISOString()}
          WHERE singleton_id = 1 AND consent_state = 'authorized'
            AND status NOT IN ('paused', 'idle')
        `;
      }),
    );
  }

  const persistedControl = yield* readControl();
  pauseRequested =
    persistedControl.consentState === "authorized" &&
    (persistedControl.status === "paused" || persistedControl.status === "idle");

  const discoverBatch = (provider: UsageHistoryProvider, rootPath: string, state: ProviderRow) =>
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise(() =>
        runWorker(
          {
            type: "discover",
            provider,
            rootPath,
            cursor: state.discoveryCursor,
            limit: USAGE_HISTORY_DISCOVERY_BATCH_FILES,
          },
          (child) => {
            activeChild = child;
          },
        ),
      );
      if (response.type === "failure") throw new Error(response.code);
      if (response.type !== "discover-result") throw new Error("worker-response-kind");
      const result: UsageHistoryDiscoverResponse = response;
      const currentGeneration = yield* sql<{ readonly discoveryGeneration: number }>`
        SELECT discovery_generation AS "discoveryGeneration"
        FROM usage_history_provider_state WHERE provider = ${provider}
      `;
      if (Number(currentGeneration[0]?.discoveryGeneration) !== state.discoveryGeneration) return;
      const discoveryIssue = result.issueCodes[0] ?? null;
      if (!result.rootAvailable) {
        yield* sql`
          UPDATE usage_history_provider_state
          SET status = ${discoveryIssue ? "partial" : "unsupported"}, discovery_complete = 1,
              discovery_cursor = NULL, detail_code = ${discoveryIssue ?? "archive-unavailable"}
          WHERE provider = ${provider} AND discovery_generation = ${state.discoveryGeneration}
        `;
        return;
      }
      for (const file of result.files) {
        const existing = yield* sql<{
          readonly fileId: number;
          readonly deviceId: string;
          readonly inodeId: string;
          readonly indexedOffset: number;
          readonly sizeBytes: number;
          readonly parserVersion: number;
        }>`
          SELECT file_id AS "fileId", device_id AS "deviceId", inode_id AS "inodeId",
            indexed_offset AS "indexedOffset", size_bytes AS "sizeBytes", parser_version AS "parserVersion"
          FROM usage_history_files
          WHERE provider = ${provider} AND root_key = ${provider} AND relative_path = ${file.relativePath}
        `;
        const prior = existing[0];
        const replace =
          prior &&
          (prior.deviceId !== file.deviceId ||
            prior.inodeId !== file.inodeId ||
            Number(file.sizeBytes) < Number(prior.indexedOffset) ||
            Number(prior.parserVersion) !== USAGE_HISTORY_PARSER_VERSION);
        if (replace && prior) yield* deleteFileContribution(Number(prior.fileId));
        yield* sql`
          INSERT INTO usage_history_files (
            provider, root_key, relative_path, device_id, inode_id, size_bytes, mtime_ms,
            indexed_offset, parser_version, last_seen_generation, state, detail_code
          ) VALUES (
            ${provider}, ${provider}, ${file.relativePath}, ${file.deviceId}, ${file.inodeId},
            ${file.sizeBytes}, ${Math.round(file.mtimeMs)}, 0, ${USAGE_HISTORY_PARSER_VERSION},
            ${state.discoveryGeneration}, 'pending', NULL
          )
          ON CONFLICT (provider, root_key, relative_path) DO UPDATE SET
            device_id = excluded.device_id,
            inode_id = excluded.inode_id,
            size_bytes = excluded.size_bytes,
            mtime_ms = excluded.mtime_ms,
            indexed_offset = CASE WHEN ${replace ? 1 : 0} = 1 THEN 0 ELSE usage_history_files.indexed_offset END,
            parser_version = excluded.parser_version,
          session_key = CASE WHEN ${replace ? 1 : 0} = 1 THEN NULL ELSE usage_history_files.session_key END,
            workspace_key = CASE WHEN ${replace ? 1 : 0} = 1 THEN NULL ELSE usage_history_files.workspace_key END,
            workspace_label = CASE WHEN ${replace ? 1 : 0} = 1 THEN NULL ELSE usage_history_files.workspace_label END,
            model = CASE WHEN ${replace ? 1 : 0} = 1 THEN NULL ELSE usage_history_files.model END,
            discarding_oversized_line = CASE WHEN ${replace ? 1 : 0} = 1 THEN 0 ELSE usage_history_files.discarding_oversized_line END,
            cumulative_input_tokens = CASE WHEN ${replace ? 1 : 0} = 1 THEN 0 ELSE usage_history_files.cumulative_input_tokens END,
            cumulative_output_tokens = CASE WHEN ${replace ? 1 : 0} = 1 THEN 0 ELSE usage_history_files.cumulative_output_tokens END,
            cumulative_cache_read_tokens = CASE WHEN ${replace ? 1 : 0} = 1 THEN 0 ELSE usage_history_files.cumulative_cache_read_tokens END,
            cumulative_cache_write_tokens = CASE WHEN ${replace ? 1 : 0} = 1 THEN 0 ELSE usage_history_files.cumulative_cache_write_tokens END,
            last_seen_generation = excluded.last_seen_generation,
            state = CASE
              WHEN ${replace ? 1 : 0} = 1 OR excluded.size_bytes > usage_history_files.indexed_offset
              THEN 'pending' ELSE usage_history_files.state END,
            detail_code = NULL
        `;
      }
      yield* sql`
        UPDATE usage_history_provider_state SET
          discovery_cursor = ${result.nextCursor},
          discovery_complete = ${result.complete ? 1 : 0},
          files_discovered = files_discovered + ${result.files.length},
          bytes_discovered = bytes_discovered + ${result.files.reduce((sum, file) => sum + file.sizeBytes, 0)},
          detail_code = COALESCE(detail_code, ${discoveryIssue})
        WHERE provider = ${provider} AND discovery_generation = ${state.discoveryGeneration}
      `;
      if (result.complete && result.issueCodes.length === 0) {
        const missing = yield* sql<{ readonly fileId: number }>`
          SELECT file_id AS "fileId" FROM usage_history_files
          WHERE provider = ${provider} AND last_seen_generation < ${state.discoveryGeneration}
        `;
        for (const file of missing) yield* deleteFileContribution(Number(file.fileId));
        yield* sql`
          DELETE FROM usage_history_files
          WHERE provider = ${provider} AND last_seen_generation < ${state.discoveryGeneration}
        `;
      }
    });

  const parseBatch = (
    provider: UsageHistoryProvider,
    rootPath: string,
    salt: string,
    expectedGeneration: number,
  ) =>
    Effect.gen(function* () {
      const rows = yield* sql<FileRow>`
        SELECT file_id AS "fileId", relative_path AS "relativePath", device_id AS "deviceId",
          inode_id AS "inodeId", size_bytes AS "sizeBytes", mtime_ms AS "mtimeMs",
          indexed_offset AS "indexedOffset", session_key AS "sessionKey",
          workspace_key AS "workspaceKey", workspace_label AS "workspaceLabel", model,
          discarding_oversized_line AS "discardingOversizedLine"
          , cumulative_input_tokens AS "cumulativeInputTokens"
          , cumulative_output_tokens AS "cumulativeOutputTokens"
          , cumulative_cache_read_tokens AS "cumulativeCacheReadTokens"
          , cumulative_cache_write_tokens AS "cumulativeCacheWriteTokens"
        FROM usage_history_files
        WHERE provider = ${provider} AND state = 'pending'
          AND indexed_offset < size_bytes
        ORDER BY relative_path LIMIT ${USAGE_HISTORY_PARSE_BATCH_FILES}
      `;
      if (rows.length === 0) return false;
      const files: UsageHistoryParseFile[] = rows.map((row) => ({
        fileId: Number(row.fileId),
        relativePath: row.relativePath,
        deviceId: row.deviceId,
        inodeId: row.inodeId,
        sizeBytes: Number(row.sizeBytes),
        mtimeMs: Number(row.mtimeMs),
        indexedOffset: Number(row.indexedOffset),
        parserState: {
          sessionKey: row.sessionKey,
          workspaceKey: row.workspaceKey,
          workspaceLabel: row.workspaceLabel,
          model: row.model,
          discardingOversizedLine: Number(row.discardingOversizedLine) === 1,
          cumulativeInputTokens: Number(row.cumulativeInputTokens),
          cumulativeOutputTokens: Number(row.cumulativeOutputTokens),
          cumulativeCacheReadTokens: Number(row.cumulativeCacheReadTokens),
          cumulativeCacheWriteTokens: Number(row.cumulativeCacheWriteTokens),
        },
      }));
      const response = yield* Effect.tryPromise(() =>
        runWorker(
          {
            type: "parse",
            provider,
            rootPath,
            files,
            workspaceHashSalt: salt,
            unknownModel: USAGE_HISTORY_UNKNOWN_MODEL,
            unknownWorkspace: USAGE_HISTORY_UNKNOWN_WORKSPACE,
            maxBatchBytes: USAGE_HISTORY_PARSE_BATCH_BYTES,
            maxFileBytes: USAGE_HISTORY_PARSE_FILE_BYTES,
            maxEvents: USAGE_HISTORY_PARSE_MAX_EVENTS,
            deadlineMs: Date.now() + 12_000,
          },
          (child) => {
            activeChild = child;
          },
        ),
      );
      if (response.type === "failure") throw new Error(response.code);
      if (response.type !== "parse-result") throw new Error("worker-response-kind");
      const result: UsageHistoryParseResponse = response;
      const committed = yield* sql.withTransaction(
        Effect.gen(function* () {
          const currentGeneration = yield* sql<{ readonly discoveryGeneration: number }>`
            SELECT discovery_generation AS "discoveryGeneration"
            FROM usage_history_provider_state WHERE provider = ${provider}
          `;
          if (Number(currentGeneration[0]?.discoveryGeneration) !== expectedGeneration)
            return false;
          for (const file of result.files) {
            if (file.detailCode === "identity-changed") {
              yield* sql`DELETE FROM usage_history_event_sources WHERE file_id = ${file.fileId}`;
              yield* sql`
                DELETE FROM usage_history_events
                WHERE NOT EXISTS (
                  SELECT 1 FROM usage_history_event_sources source
                  WHERE source.provider = usage_history_events.provider
                    AND source.event_key = usage_history_events.event_key
                )
              `;
              yield* sql`
                UPDATE usage_history_files SET indexed_offset = 0, state = 'skipped',
                  session_key = NULL, workspace_key = NULL, workspace_label = NULL, model = NULL,
                  discarding_oversized_line = 0,
                  cumulative_input_tokens = 0, cumulative_output_tokens = 0,
                  cumulative_cache_read_tokens = 0, cumulative_cache_write_tokens = 0,
                  detail_code = 'identity-changed'
                WHERE file_id = ${file.fileId}
              `;
              continue;
            }
            if (file.events.length > 0) {
              const eventBatch = JSON.stringify(file.events);
              yield* sql`
                INSERT INTO usage_history_events (
                  provider, event_key, occurred_at, occurred_on, session_key, model,
                  workspace_key, workspace_label, input_tokens, output_tokens,
                  cache_read_tokens, cache_write_tokens
                )
                SELECT
                  ${provider},
                  CAST(json_extract(item.value, '$.eventKey') AS TEXT),
                  CAST(json_extract(item.value, '$.occurredAt') AS TEXT),
                  substr(CAST(json_extract(item.value, '$.occurredAt') AS TEXT), 1, 10),
                  CAST(json_extract(item.value, '$.sessionKey') AS TEXT),
                  CAST(json_extract(item.value, '$.model') AS TEXT),
                  CAST(json_extract(item.value, '$.workspaceKey') AS TEXT),
                  CAST(json_extract(item.value, '$.workspaceLabel') AS TEXT),
                  CAST(json_extract(item.value, '$.inputTokens') AS INTEGER),
                  CAST(json_extract(item.value, '$.outputTokens') AS INTEGER),
                  CAST(json_extract(item.value, '$.cacheReadTokens') AS INTEGER),
                  CAST(json_extract(item.value, '$.cacheWriteTokens') AS INTEGER)
                FROM json_each(${eventBatch}) AS item
                WHERE 1
                ON CONFLICT (provider, event_key) DO UPDATE SET
                  occurred_at = excluded.occurred_at, occurred_on = excluded.occurred_on,
                  session_key = excluded.session_key, model = excluded.model,
                  workspace_key = excluded.workspace_key, workspace_label = excluded.workspace_label,
                  input_tokens = excluded.input_tokens, output_tokens = excluded.output_tokens,
                  cache_read_tokens = excluded.cache_read_tokens,
                  cache_write_tokens = excluded.cache_write_tokens
              `;
              yield* sql`
                INSERT OR IGNORE INTO usage_history_event_sources (file_id, provider, event_key)
                SELECT ${file.fileId}, ${provider},
                  CAST(json_extract(item.value, '$.eventKey') AS TEXT)
                FROM json_each(${eventBatch}) AS item
              `;
            }
            const complete =
              file.complete &&
              file.nextOffset >=
                (files.find((item) => item.fileId === file.fileId)?.sizeBytes ?? 0);
            const detailCode = file.detailCode === "checkpointed" ? null : file.detailCode;
            const shouldWaitForMoreBytes =
              !complete &&
              detailCode !== "permission-denied" &&
              detailCode !== "file-unavailable" &&
              detailCode !== "read-failed" &&
              detailCode !== "incomplete-tail";
            yield* sql`
              UPDATE usage_history_files SET
                indexed_offset = ${file.nextOffset},
                session_key = ${file.parserState.sessionKey},
                workspace_key = ${file.parserState.workspaceKey},
                workspace_label = ${file.parserState.workspaceLabel},
                model = ${file.parserState.model},
                discarding_oversized_line = ${file.parserState.discardingOversizedLine ? 1 : 0},
                cumulative_input_tokens = ${file.parserState.cumulativeInputTokens},
                cumulative_output_tokens = ${file.parserState.cumulativeOutputTokens},
                cumulative_cache_read_tokens = ${file.parserState.cumulativeCacheReadTokens},
                cumulative_cache_write_tokens = ${file.parserState.cumulativeCacheWriteTokens},
                state = CASE
                  WHEN ${shouldWaitForMoreBytes ? 1 : 0} = 1 THEN 'pending'
                  WHEN ${detailCode} IS NOT NULL OR usage_history_files.detail_code IS NOT NULL
                  THEN 'partial'
                  WHEN ${complete ? 1 : 0} = 1 THEN 'indexed'
                  ELSE 'pending'
                END,
                detail_code = COALESCE(${detailCode}, usage_history_files.detail_code)
              WHERE file_id = ${file.fileId}
            `;
          }
          yield* sql`
            UPDATE usage_history_provider_state SET
              bytes_read = bytes_read + ${result.bytesRead},
              files_indexed = (SELECT COUNT(*) FROM usage_history_files
                WHERE provider = ${provider} AND state = 'indexed'),
              skipped_files = (SELECT COUNT(*) FROM usage_history_files
                WHERE provider = ${provider} AND state IN ('partial', 'skipped'))
            WHERE provider = ${provider} AND discovery_generation = ${expectedGeneration}
          `;
          return true;
        }),
      );
      return committed;
    });

  const runIndex = Effect.gen(function* () {
    if (running || stopped || pauseRequested) return;
    running = true;
    try {
      const control = yield* readControl();
      if (control.consentState !== "authorized") return;
      const providerRoots = yield* roots;
      yield* sql`
        UPDATE usage_history_control SET status = 'indexing', updated_at = ${new Date().toISOString()}
        WHERE singleton_id = 1 AND consent_state = 'authorized'
      `;
      const activeProviders = new Set<UsageHistoryProvider>(PROVIDERS);
      while (activeProviders.size > 0) {
        if (stopped || pauseRequested) break;
        for (const provider of PROVIDERS) {
          if (!activeProviders.has(provider) || stopped || pauseRequested) continue;
          const current = (yield* readProviders()).find((row) => row.provider === provider)!;
          if (current.status === "paused" || current.status === "unsupported") {
            activeProviders.delete(provider);
            continue;
          }
          yield* sql`
            UPDATE usage_history_provider_state SET status = 'indexing'
            WHERE provider = ${provider} AND discovery_generation = ${current.discoveryGeneration}
          `;
          const stepExit = yield* Effect.exit(
            Effect.gen(function* () {
              if (current.discoveryComplete !== 1) {
                yield* discoverBatch(provider, providerRoots[provider], current);
              }
              const parsed = yield* parseBatch(
                provider,
                providerRoots[provider],
                control.workspaceHashSalt,
                current.discoveryGeneration,
              );
              const next = (yield* readProviders()).find((row) => row.provider === provider)!;
              return next.discoveryComplete !== 1 || parsed;
            }),
          );
          if (Exit.isSuccess(stepExit)) {
            yield* sql`
              UPDATE usage_history_provider_state SET restart_attempts = 0
              WHERE provider = ${provider} AND discovery_generation = ${current.discoveryGeneration}
            `;
            if (!stepExit.value) {
              const settled = (yield* readProviders()).find((row) => row.provider === provider)!;
              if (settled.status !== "paused" && settled.status !== "unsupported") {
                const partial = Number(settled.skippedFiles) > 0 || settled.detailCode !== null;
                yield* sql`
                  UPDATE usage_history_provider_state SET status = ${partial ? "partial" : "ready"},
                    last_completed_at = ${new Date().toISOString()}
                  WHERE provider = ${provider}
                    AND discovery_generation = ${settled.discoveryGeneration}
                `;
              }
              activeProviders.delete(provider);
            }
          } else {
            if (pauseRequested) return;
            const attempts = Number(current.restartAttempts) + 1;
            yield* sql`
              UPDATE usage_history_provider_state SET restart_attempts = ${attempts},
                status = ${attempts >= MAX_PROVIDER_RESTARTS ? "paused" : "partial"},
                detail_code = 'indexer-interrupted'
              WHERE provider = ${provider} AND discovery_generation = ${current.discoveryGeneration}
            `;
            if (attempts >= MAX_PROVIDER_RESTARTS) activeProviders.delete(provider);
          }
          yield* Effect.yieldNow;
        }
      }
      if (pauseRequested || stopped) return;
      const providerStates = yield* readProviders();
      const hasPaused = providerStates.some((row) => row.status === "paused");
      const hasPartial = providerStates.some(
        (row) => row.status === "partial" || row.status === "unsupported",
      );
      const completedAt = new Date().toISOString();
      yield* sql`
        UPDATE usage_history_control SET
          status = ${hasPaused ? "paused" : hasPartial ? "partial" : "ready"},
          updated_at = ${completedAt}, last_completed_at = ${completedAt}
        WHERE singleton_id = 1
      `;
      yield* Effect.sync(() => installRootWatchers(providerRoots));
    } finally {
      running = false;
      activeChild = null;
      if (rerunRequested && !pauseRequested && !stopped) {
        rerunRequested = false;
        queueMicrotask(startBackground);
      }
    }
  }).pipe(
    Effect.catch((cause) =>
      sql`
        UPDATE usage_history_control SET status = 'stale', updated_at = ${new Date().toISOString()}
        WHERE singleton_id = 1
      `.pipe(Effect.andThen(Effect.logWarning("usage history indexing paused", { cause }))),
    ),
  );

  startBackground = () => {
    if (running) {
      rerunRequested = true;
      return;
    }
    if (stopped || pauseRequested) return;
    Effect.runFork(runIndex as Effect.Effect<void, never>);
  };

  const queryAggregates = (input: ServerGetUsageHistoryInput) => {
    const groupBy: UsageHistoryGroupBy = input.groupBy ?? "provider";
    const floor = dateFloor(input.range);
    const groupExpression =
      groupBy === "provider"
        ? sql.literal("provider")
        : groupBy === "model"
          ? sql.literal("model")
          : groupBy === "workspace"
            ? sql.literal("workspace_key")
            : sql.literal("occurred_on");
    const labelExpression =
      groupBy === "workspace" ? sql.literal("workspace_label") : groupExpression;
    return Effect.gen(function* () {
      const modelRows = yield* sql<ModelAggregateRow>`
        SELECT ${groupExpression} AS key, ${labelExpression} AS label, model,
          SUM(input_tokens) AS "inputTokens",
          SUM(output_tokens) AS "outputTokens",
          SUM(cache_read_tokens) AS "cacheReadTokens",
          SUM(cache_write_tokens) AS "cacheWriteTokens"
        FROM usage_history_events
        WHERE (${floor} IS NULL OR occurred_at >= ${floor})
        GROUP BY ${groupExpression}, ${labelExpression}, model
      `;
      const sessionRows = yield* sql<SessionAggregateRow>`
        SELECT ${groupExpression} AS key, COUNT(DISTINCT session_key) AS "sessionCount"
        FROM usage_history_events
        WHERE (${floor} IS NULL OR occurred_at >= ${floor})
        GROUP BY ${groupExpression}
      `;
      const sessions = new Map(sessionRows.map((row) => [row.key, Number(row.sessionCount)]));
      const aggregates = new Map<string, AggregateRow>();
      for (const row of modelRows) {
        const inputTokens = Number(row.inputTokens ?? 0);
        const outputTokens = Number(row.outputTokens ?? 0);
        const cacheReadTokens = Number(row.cacheReadTokens ?? 0);
        const cacheWriteTokens = Number(row.cacheWriteTokens ?? 0);
        const estimated = estimateUsageHistoryCostMicros({
          model: row.model,
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWriteTokens,
        });
        const current = aggregates.get(row.key);
        aggregates.set(row.key, {
          key: row.key,
          provider: groupBy === "provider" ? (row.key as UsageHistoryProvider) : null,
          model: groupBy === "model" ? row.key : null,
          workspace: groupBy === "workspace" ? row.label : null,
          date: groupBy === "date" ? row.key : null,
          sessionCount: sessions.get(row.key) ?? 0,
          inputTokens: Number(current?.inputTokens ?? 0) + inputTokens,
          outputTokens: Number(current?.outputTokens ?? 0) + outputTokens,
          cacheReadTokens: Number(current?.cacheReadTokens ?? 0) + cacheReadTokens,
          cacheWriteTokens: Number(current?.cacheWriteTokens ?? 0) + cacheWriteTokens,
          estimatedCostMicros:
            estimated === null || current?.estimatedCostMicros === null
              ? null
              : Number(current?.estimatedCostMicros ?? 0) + estimated,
        });
      }
      return [...aggregates.values()].toSorted(
        (left, right) =>
          right.inputTokens +
          right.outputTokens +
          right.cacheReadTokens +
          right.cacheWriteTokens -
          (left.inputTokens + left.outputTokens + left.cacheReadTokens + left.cacheWriteTokens),
      );
    });
  };

  const get: UsageHistoryShape["get"] = (input) =>
    Effect.gen(function* () {
      const control = yield* readControl();
      // Opening the dedicated history surface resumes an interrupted checkpoint.
      // No startup, Header, or ordinary conversation path calls this query.
      if (control.consentState === "authorized" && control.status === "indexing" && !running) {
        startBackground();
      }
      if (
        control.consentState === "authorized" &&
        control.status !== "paused" &&
        control.status !== "idle"
      ) {
        const providerRoots = yield* roots;
        yield* Effect.sync(() => installRootWatchers(providerRoots));
      }
      const providerRows = yield* readProviders();
      const aggregates = control.consentState === "authorized" ? yield* queryAggregates(input) : [];
      const rows: UsageHistoryRow[] = aggregates.map((row) => {
        const inputTokens = Number(row.inputTokens ?? 0);
        const outputTokens = Number(row.outputTokens ?? 0);
        const cacheReadTokens = Number(row.cacheReadTokens ?? 0);
        const cacheWriteTokens = Number(row.cacheWriteTokens ?? 0);
        const cost = row.estimatedCostMicros;
        return {
          key: row.key || "unknown",
          ...(row.provider ? { provider: row.provider } : {}),
          ...(row.model ? { model: row.model } : {}),
          ...(row.workspace ? { workspace: row.workspace } : {}),
          ...(row.date ? { date: row.date } : {}),
          sessionCount: Number(row.sessionCount ?? 0),
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWriteTokens,
          totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
          ...(cost === null ? {} : { estimatedCostMicros: cost }),
          estimateUncertain: true,
        };
      });
      const providers = providerRows.map(asProviderSummary);
      return {
        status: control.consentState === "authorized" ? control.status : "not-authorized",
        ...(control.authorizedAt ? { authorizedAt: control.authorizedAt } : {}),
        ...(control.updatedAt ? { updatedAt: control.updatedAt } : {}),
        ...(control.lastCompletedAt ? { lastCompletedAt: control.lastCompletedAt } : {}),
        pricingVersion: USAGE_HISTORY_PRICING_VERSION,
        progress: providers.reduce<UsageHistoryProgress>(
          (total, provider) => ({
            filesDiscovered: total.filesDiscovered + provider.progress.filesDiscovered,
            filesIndexed: total.filesIndexed + provider.progress.filesIndexed,
            bytesDiscovered: total.bytesDiscovered + provider.progress.bytesDiscovered,
            bytesRead: total.bytesRead + provider.progress.bytesRead,
            skippedFiles: total.skippedFiles + provider.progress.skippedFiles,
            discoveryComplete: total.discoveryComplete && provider.progress.discoveryComplete,
          }),
          {
            filesDiscovered: 0,
            filesIndexed: 0,
            bytesDiscovered: 0,
            bytesRead: 0,
            skippedFiles: 0,
            discoveryComplete: true as boolean,
          },
        ),
        providers,
        rows,
      } satisfies ServerGetUsageHistoryResult;
    });

  const resetProjection = (status: "idle" | "indexing") =>
    sql.withTransaction(
      Effect.gen(function* () {
        yield* sql`DELETE FROM usage_history_event_sources`;
        yield* sql`DELETE FROM usage_history_events`;
        yield* sql`DELETE FROM usage_history_files`;
        yield* sql`
          UPDATE usage_history_provider_state SET status = 'pending', discovery_cursor = NULL,
            discovery_generation = discovery_generation + 1, discovery_complete = 0,
            files_discovered = 0, files_indexed = 0, bytes_discovered = 0, bytes_read = 0,
            skipped_files = 0, restart_attempts = 0, detail_code = NULL, last_completed_at = NULL
        `;
        yield* sql`
          UPDATE usage_history_control SET status = ${status}, updated_at = ${new Date().toISOString()},
            last_completed_at = NULL WHERE singleton_id = 1
        `;
      }),
    );

  const command: UsageHistoryShape["command"] = (input) =>
    Effect.gen(function* () {
      const now = new Date().toISOString();
      if (input.action === "authorize") {
        pauseRequested = false;
        yield* sql`
          UPDATE usage_history_control SET consent_state = 'authorized', status = 'idle',
            authorized_at = COALESCE(authorized_at, ${now}), updated_at = ${now}
          WHERE singleton_id = 1
        `;
        yield* resetProjection("indexing");
        startBackground();
      } else if (input.action === "pause") {
        pauseRequested = true;
        activeChild?.kill("SIGKILL");
        yield* sql`UPDATE usage_history_control SET status = 'paused', updated_at = ${now} WHERE singleton_id = 1`;
        yield* sql`
          UPDATE usage_history_provider_state
          SET status = CASE WHEN status = 'unsupported' THEN status ELSE 'paused' END,
            discovery_generation = discovery_generation + 1
        `;
      } else if (input.action === "clear") {
        pauseRequested = true;
        activeChild?.kill("SIGKILL");
        yield* resetProjection("idle");
      } else {
        const control = yield* readControl();
        if (control.consentState === "authorized") {
          pauseRequested = false;
          if (input.action === "reindex") {
            activeChild?.kill("SIGKILL");
            yield* resetProjection("indexing");
          } else {
            yield* sql`
              UPDATE usage_history_provider_state SET status = 'pending', discovery_cursor = NULL,
                discovery_generation = discovery_generation + 1, discovery_complete = 0,
                files_discovered = 0, bytes_discovered = 0, bytes_read = 0,
                restart_attempts = 0, detail_code = NULL
            `;
            yield* sql`UPDATE usage_history_control SET status = 'indexing', updated_at = ${now} WHERE singleton_id = 1`;
          }
          startBackground();
        }
      }
      return yield* get({ range: "30d", groupBy: "provider" });
    });

  return { get, command } satisfies UsageHistoryShape;
});

export const UsageHistoryLive = Layer.effect(UsageHistory, makeUsageHistory);
