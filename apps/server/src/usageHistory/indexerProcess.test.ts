// FILE: usageHistory/indexerProcess.test.ts
// Purpose: Adversarial fixtures for bounded discovery, checkpointing, dedupe and path safety.

import { mkdtemp, mkdir, open, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { handleUsageHistoryWorkerRequest } from "./indexerProcess";
import type { UsageHistoryParseFile, UsageHistoryParserState } from "./protocol";

const roots: string[] = [];

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "omnimind-usage-indexer-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  const fs = await import("node:fs/promises");
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

const emptyState = (): UsageHistoryParserState => ({
  sessionKey: null,
  workspaceKey: null,
  workspaceLabel: null,
  model: null,
  discardingOversizedLine: false,
  cumulativeInputTokens: 0,
  cumulativeOutputTokens: 0,
  cumulativeCacheReadTokens: 0,
  cumulativeCacheWriteTokens: 0,
});

async function fileDescriptor(
  root: string,
  relativePath: string,
  indexedOffset = 0,
  parserState = emptyState(),
): Promise<UsageHistoryParseFile> {
  const fs = await import("node:fs/promises");
  const stats = await fs.stat(path.join(root, relativePath));
  return {
    fileId: 1,
    relativePath,
    deviceId: String(stats.dev),
    inodeId: String(stats.ino),
    sizeBytes: stats.size,
    mtimeMs: stats.mtimeMs,
    indexedOffset,
    parserState,
  };
}

async function parseCodex(
  root: string,
  file: UsageHistoryParseFile,
  maxFileBytes = 4 * 1024 * 1024,
) {
  const response = await handleUsageHistoryWorkerRequest({
    type: "parse",
    provider: "codex",
    rootPath: root,
    files: [file],
    workspaceHashSalt: "test-salt",
    maxBatchBytes: maxFileBytes,
    maxFileBytes,
    maxEvents: 2_000,
    deadlineMs: Date.now() + 10_000,
  });
  if (response.type !== "parse-result") throw new Error("unexpected worker response");
  return response.files[0]!;
}

describe("usage history indexer", () => {
  it("discovers every file through resumable batches without a permanent file cap", async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, "nested"));
    await Promise.all(
      Array.from({ length: 2_105 }, (_, index) =>
        writeFile(path.join(root, "nested", `${String(index).padStart(4, "0")}.jsonl`), "\n"),
      ),
    );
    let cursor: string | null = null;
    const discovered = new Set<string>();
    for (;;) {
      const response = await handleUsageHistoryWorkerRequest({
        type: "discover",
        provider: "codex",
        rootPath: root,
        cursor,
        limit: 128,
      });
      if (response.type !== "discover-result") throw new Error("unexpected worker response");
      response.files.forEach((file) => discovered.add(file.relativePath));
      cursor = response.nextCursor;
      if (response.complete) break;
    }
    expect(discovered.size).toBe(2_105);
  });

  it("ignores symlinks and never discovers files outside the allowed provider root", async () => {
    const root = await makeRoot();
    const outside = await makeRoot();
    await writeFile(path.join(outside, "secret.jsonl"), "{}\n");
    await symlink(path.join(outside, "secret.jsonl"), path.join(root, "escape.jsonl"));
    const response = await handleUsageHistoryWorkerRequest({
      type: "discover",
      provider: "codex",
      rootPath: root,
      cursor: null,
      limit: 128,
    });
    expect(response.type === "discover-result" ? response.files : []).toEqual([]);
  });

  it("deduplicates cumulative Codex counters while preserving incremental token events", async () => {
    const root = await makeRoot();
    const relativePath = "session.jsonl";
    const lines = [
      { type: "session_meta", payload: { id: "s1", cwd: "/work/a", model: "gpt-5" } },
      {
        type: "event_msg",
        timestamp: "2026-08-11T00:00:00Z",
        payload: {
          type: "token_count",
          info: { total_token_usage: { input_tokens: 100, output_tokens: 10 } },
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-08-11T00:01:00Z",
        payload: {
          type: "token_count",
          info: { total_token_usage: { input_tokens: 150, output_tokens: 15 } },
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-08-11T00:02:00Z",
        payload: {
          type: "token_count",
          id: "i1",
          info: { last_token_usage: { input_tokens: 20, output_tokens: 2 } },
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-08-11T00:03:00Z",
        payload: {
          type: "token_count",
          id: "i2",
          info: { last_token_usage: { input_tokens: 30, output_tokens: 3 } },
        },
      },
    ];
    await writeFile(
      path.join(root, relativePath),
      `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`,
    );
    const result = await parseCodex(root, await fileDescriptor(root, relativePath));
    expect(result.complete).toBe(true);
    expect(result.events).toHaveLength(4);
    expect(result.events.reduce((sum, event) => sum + event.inputTokens, 0)).toBe(200);
    expect(result.events.reduce((sum, event) => sum + event.outputTokens, 0)).toBe(20);
  });

  it("leaves a half-written UTF-8 tail uncommitted and resumes from the last complete line", async () => {
    const root = await makeRoot();
    const relativePath = "tail.jsonl";
    const metadata = JSON.stringify({
      type: "session_meta",
      payload: { id: "s1", cwd: "/工作区", model: "gpt-5" },
    });
    const event = JSON.stringify({
      type: "event_msg",
      timestamp: "2026-08-11T00:00:00Z",
      payload: {
        type: "token_count",
        id: "i1",
        info: { last_token_usage: { input_tokens: 9, output_tokens: 1 } },
      },
    });
    const split = Math.floor(event.length / 2);
    await writeFile(path.join(root, relativePath), `${metadata}\n${event.slice(0, split)}`);
    const first = await parseCodex(root, await fileDescriptor(root, relativePath));
    expect(first.nextOffset).toBe(Buffer.byteLength(`${metadata}\n`));
    await writeFile(path.join(root, relativePath), `${metadata}\n${event}\n`);
    const second = await parseCodex(
      root,
      await fileDescriptor(root, relativePath, first.nextOffset, first.parserState),
    );
    expect(second.events).toHaveLength(1);
    expect(second.events[0]?.inputTokens).toBe(9);
  });

  it("advances a checkpoint through a 512 MiB sparse oversized record using only the batch budget", async () => {
    const root = await makeRoot();
    const relativePath = "huge.jsonl";
    const handle = await open(path.join(root, relativePath), "w");
    await handle.truncate(512 * 1024 * 1024);
    await handle.close();
    const before = process.memoryUsage().heapUsed;
    const result = await parseCodex(
      root,
      await fileDescriptor(root, relativePath),
      4 * 1024 * 1024,
    );
    const after = process.memoryUsage().heapUsed;
    expect(result.bytesRead).toBeLessThanOrEqual(4 * 1024 * 1024);
    expect(result.nextOffset).toBe(4 * 1024 * 1024);
    expect(result.parserState.discardingOversizedLine).toBe(true);
    expect(after - before).toBeLessThan(32 * 1024 * 1024);
  });
});
