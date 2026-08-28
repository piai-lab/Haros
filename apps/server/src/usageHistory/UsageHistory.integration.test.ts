// FILE: usageHistory/UsageHistory.test.ts
// Purpose: End-to-end proof for consent, durable checkpoint use and incremental refresh.

import { appendFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { afterEach, describe, expect, it } from "vitest";

import { ServerConfig } from "../config";
import { SqlitePersistenceMemory } from "../persistence/Layers/Sqlite";
import { ServerSettingsService } from "../serverSettings";
import { UsageHistory, UsageHistoryLive, type UsageHistoryShape } from "./UsageHistory";

const tempRoots: string[] = [];
const previousClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
const previousWorkerOverride = process.env.HARNESSOS_USAGE_HISTORY_WORKER;

afterEach(async () => {
  if (previousClaudeConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = previousClaudeConfigDir;
  if (previousWorkerOverride === undefined) delete process.env.HARNESSOS_USAGE_HISTORY_WORKER;
  else process.env.HARNESSOS_USAGE_HISTORY_WORKER = previousWorkerOverride;
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function waitForSettled(history: UsageHistoryShape) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const snapshot = await Effect.runPromise(history.get({ range: "all", groupBy: "model" }));
    if (snapshot.status !== "indexing" && snapshot.status !== "idle") return snapshot;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("usage history did not settle");
}

describe("UsageHistory", () => {
  it("does not read before consent and refreshes only appended bytes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harnessos-usage-service-"));
    tempRoots.push(root);
    const codexHome = path.join(root, ".codex");
    const sessions = path.join(codexHome, "sessions");
    const claudeHome = path.join(root, ".claude");
    await mkdir(sessions, { recursive: true });
    await mkdir(path.join(claudeHome, "projects"), { recursive: true });
    process.env.CLAUDE_CONFIG_DIR = claudeHome;

    const sessionPath = path.join(sessions, "session.jsonl");
    const metadata = JSON.stringify({
      type: "session_meta",
      payload: { id: "session-1", cwd: path.join(root, "workspace"), model: "gpt-5" },
    });
    const firstEvent = JSON.stringify({
      type: "event_msg",
      timestamp: "2026-08-11T00:00:00.000Z",
      payload: {
        type: "token_count",
        id: "event-1",
        info: { last_token_usage: { input_tokens: 100, output_tokens: 10 } },
      },
    });
    await writeFile(sessionPath, `${metadata}\n${firstEvent}\n`);
    const initialBytes = Buffer.byteLength(`${metadata}\n${firstEvent}\n`);

    const layer = UsageHistoryLive.pipe(
      Layer.provideMerge(SqlitePersistenceMemory),
      Layer.provideMerge(
        ServerSettingsService.layerTest({ engines: { codex: { homePath: codexHome } } }),
      ),
      Layer.provide(
        ServerConfig.layerTest(process.cwd(), { prefix: "harnessos-usage-history-test-" }),
      ),
      Layer.provide(NodeServices.layer),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const history = yield* UsageHistory;
        const beforeConsent = yield* history.get({ range: "all", groupBy: "model" });
        expect(beforeConsent.status).toBe("not-authorized");
        expect(beforeConsent.progress.bytesRead).toBe(0);
        expect(beforeConsent.rows).toEqual([]);

        yield* history.command({ action: "authorize" });
        const first = yield* Effect.promise(() => waitForSettled(history));
        expect(first.status, JSON.stringify(first)).toBe("ready");
        expect(first.rows).toHaveLength(1);
        expect(first.rows[0]?.inputTokens).toBe(100);
        expect(first.progress.bytesRead).toBe(initialBytes);

        const appendedEvent = JSON.stringify({
          type: "event_msg",
          timestamp: "2026-08-11T00:01:00.000Z",
          payload: {
            type: "token_count",
            id: "event-2",
            info: { last_token_usage: { input_tokens: 25, output_tokens: 5 } },
          },
        });
        const appended = `${appendedEvent}\n`;
        yield* Effect.promise(() => appendFile(sessionPath, appended));
        yield* history.command({ action: "refresh" });
        const refreshed = yield* Effect.promise(() => waitForSettled(history));
        expect(refreshed.status).toBe("ready");
        expect(refreshed.rows[0]?.inputTokens).toBe(125);
        expect(refreshed.rows[0]?.outputTokens).toBe(15);
        expect(refreshed.progress.bytesRead).toBe(Buffer.byteLength(appended));
      }).pipe(Effect.provide(layer), Effect.scoped),
    );
  });

  it("keeps an unfinished tail as scoped partial data without a read loop", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harnessos-usage-tail-"));
    tempRoots.push(root);
    const codexHome = path.join(root, ".codex");
    const claudeHome = path.join(root, ".claude");
    await mkdir(path.join(codexHome, "sessions"), { recursive: true });
    await mkdir(path.join(claudeHome, "projects"), { recursive: true });
    process.env.CLAUDE_CONFIG_DIR = claudeHome;
    await writeFile(
      path.join(codexHome, "sessions", "writing.jsonl"),
      '{"type":"session_meta","payload":{"id":"session-tail","cwd":"/tmp/work"}}\n{"type":',
    );

    const layer = UsageHistoryLive.pipe(
      Layer.provideMerge(SqlitePersistenceMemory),
      Layer.provideMerge(
        ServerSettingsService.layerTest({ engines: { codex: { homePath: codexHome } } }),
      ),
      Layer.provide(
        ServerConfig.layerTest(process.cwd(), { prefix: "harnessos-usage-tail-test-" }),
      ),
      Layer.provide(NodeServices.layer),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const history = yield* UsageHistory;
        yield* history.command({ action: "authorize" });
        const first = yield* Effect.promise(() => waitForSettled(history));
        expect(first.status).toBe("partial");
        expect(
          first.engines.find((engine) => engine.engine === "codex")?.progress.skippedFiles,
        ).toBe(1);
        const bytesRead = first.progress.bytesRead;
        yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 100)));
        const unchanged = yield* history.get({ range: "all", groupBy: "model" });
        expect(unchanged.progress.bytesRead).toBe(bytesRead);
      }).pipe(Effect.provide(layer), Effect.scoped),
    );
  });

  it("contains repeated worker crashes as a paused history-only failure", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harnessos-usage-crash-"));
    tempRoots.push(root);
    const codexHome = path.join(root, ".codex");
    const claudeHome = path.join(root, ".claude");
    await mkdir(path.join(codexHome, "sessions"), { recursive: true });
    await mkdir(path.join(claudeHome, "projects"), { recursive: true });
    process.env.CLAUDE_CONFIG_DIR = claudeHome;
    const crashWorker = path.join(root, "crash-worker.mjs");
    await writeFile(crashWorker, "process.kill(process.pid, 'SIGKILL');\n");
    process.env.HARNESSOS_USAGE_HISTORY_WORKER = crashWorker;

    const layer = UsageHistoryLive.pipe(
      Layer.provideMerge(SqlitePersistenceMemory),
      Layer.provideMerge(
        ServerSettingsService.layerTest({ engines: { codex: { homePath: codexHome } } }),
      ),
      Layer.provide(
        ServerConfig.layerTest(process.cwd(), { prefix: "harnessos-usage-crash-test-" }),
      ),
      Layer.provide(NodeServices.layer),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const history = yield* UsageHistory;
        yield* history.command({ action: "authorize" });
        const settled = yield* Effect.promise(() => waitForSettled(history));
        expect(settled.status).toBe("paused");
        expect(settled.engines.every((engine) => engine.status === "paused")).toBe(true);
        expect(settled.rows).toEqual([]);
        expect(process.pid).toBeGreaterThan(0);
      }).pipe(Effect.provide(layer), Effect.scoped),
    );
  });

  it("keeps last-good usage while a retired scalar cursor pauses and resumes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harnessos-usage-cursor-"));
    tempRoots.push(root);
    const codexHome = path.join(root, ".codex");
    const sessions = path.join(codexHome, "sessions");
    const claudeHome = path.join(root, ".claude");
    await mkdir(sessions, { recursive: true });
    await mkdir(path.join(claudeHome, "projects"), { recursive: true });
    process.env.CLAUDE_CONFIG_DIR = claudeHome;

    const metadata = JSON.stringify({
      type: "session_meta",
      payload: { id: "session-cursor", cwd: path.join(root, "workspace"), model: "gpt-5" },
    });
    const event = JSON.stringify({
      type: "event_msg",
      timestamp: "2026-08-20T00:00:00.000Z",
      payload: {
        type: "token_count",
        id: "event-cursor",
        info: { last_token_usage: { input_tokens: 80, output_tokens: 8 } },
      },
    });
    await writeFile(path.join(sessions, "session.jsonl"), `${metadata}\n${event}\n`);

    const layer = UsageHistoryLive.pipe(
      Layer.provideMerge(SqlitePersistenceMemory),
      Layer.provideMerge(
        ServerSettingsService.layerTest({ engines: { codex: { homePath: codexHome } } }),
      ),
      Layer.provide(
        ServerConfig.layerTest(process.cwd(), { prefix: "harnessos-usage-cursor-test-" }),
      ),
      Layer.provide(NodeServices.layer),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const history = yield* UsageHistory;
        const sql = yield* SqlClient.SqlClient;
        yield* history.command({ action: "authorize" });
        const ready = yield* Effect.promise(() => waitForSettled(history));
        expect(ready.status).toBe("ready");
        expect(ready.rows[0]?.inputTokens).toBe(80);
        expect(ready.rows[0]?.outputTokens).toBe(8);

        yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 25)));
        yield* sql`
          UPDATE usage_history_provider_state SET status = 'pending',
            discovery_cursor = 'session.jsonl', discovery_complete = 0,
            restart_attempts = 0, detail_code = NULL
          WHERE engine = 'codex'
        `;
        yield* sql`
          UPDATE usage_history_control SET status = 'indexing',
            updated_at = ${new Date().toISOString()}
          WHERE singleton_id = 1
        `;

        yield* history.get({ range: "all", groupBy: "model" });
        const paused = yield* Effect.promise(() => waitForSettled(history));
        expect(paused.status).toBe("paused");
        expect(paused.engines.find((engine) => engine.engine === "codex")?.status).toBe("paused");
        expect(paused.rows[0]?.inputTokens).toBe(80);
        expect(paused.rows[0]?.outputTokens).toBe(8);

        yield* history.command({ action: "resume" });
        const resumed = yield* Effect.promise(() => waitForSettled(history));
        expect(resumed.status).toBe("ready");
        expect(resumed.rows[0]?.inputTokens).toBe(80);
        expect(resumed.rows[0]?.outputTokens).toBe(8);
      }).pipe(Effect.provide(layer), Effect.scoped),
    );
  });

  it("fences an in-flight worker before clearing the derived index", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harnessos-usage-clear-race-"));
    tempRoots.push(root);
    const codexHome = path.join(root, ".codex");
    const claudeHome = path.join(root, ".claude");
    await mkdir(path.join(codexHome, "sessions"), { recursive: true });
    await mkdir(path.join(claudeHome, "projects"), { recursive: true });
    process.env.CLAUDE_CONFIG_DIR = claudeHome;
    const slowWorker = path.join(root, "slow-worker.mjs");
    await writeFile(
      slowWorker,
      `let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => setTimeout(() => {
  const request = JSON.parse(input);
  process.stdout.write(JSON.stringify(request.type === "discover"
    ? { type: "discover-result", rootAvailable: true, files: [], nextCursor: null, complete: true, issueCodes: [] }
    : { type: "parse-result", files: [], bytesRead: 0, eventLimitReached: false }));
}, 250));
`,
    );
    process.env.HARNESSOS_USAGE_HISTORY_WORKER = slowWorker;

    const layer = UsageHistoryLive.pipe(
      Layer.provideMerge(SqlitePersistenceMemory),
      Layer.provideMerge(
        ServerSettingsService.layerTest({ engines: { codex: { homePath: codexHome } } }),
      ),
      Layer.provide(
        ServerConfig.layerTest(process.cwd(), { prefix: "harnessos-usage-clear-race-test-" }),
      ),
      Layer.provide(NodeServices.layer),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const history = yield* UsageHistory;
        yield* history.command({ action: "authorize" });
        yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 40)));
        const cleared = yield* history.command({ action: "clear" });
        expect(cleared.status).toBe("idle");
        yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 350)));
        const after = yield* history.get({ range: "all", groupBy: "engine" });
        expect(after.status).toBe("idle");
        expect(after.rows).toEqual([]);
        expect(after.engines.every((engine) => engine.status === "pending")).toBe(true);
      }).pipe(Effect.provide(layer), Effect.scoped),
    );
  });
});
