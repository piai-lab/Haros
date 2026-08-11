import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { __providerUsageSnapshotTest } from "./providerUsageSnapshot";

const temporaryDirectories: string[] = [];

async function makeTemporaryDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "omnimind-provider-usage-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe("provider usage archive bounds", () => {
  it("finds the final Codex token summary without reading a large sparse file in full", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = path.join(directory, "large-session.jsonl");
    const sparseFileBytes = 512 * 1024 * 1024;
    const summaryLine = JSON.stringify({
      type: "event_msg",
      timestamp: new Date().toISOString(),
      payload: {
        type: "token_count",
        info: { total_token_usage: { total_tokens: 12_345 } },
        rate_limits: { primary: { used_percent: 25, window_minutes: 300 } },
      },
    });
    const tail = Buffer.from(`\n${summaryLine}\n`, "utf8");
    const handle = await fs.open(filePath, "w");
    try {
      await handle.truncate(sparseFileBytes);
      await handle.write(tail, 0, tail.length, sparseFileBytes - tail.length);
    } finally {
      await handle.close();
    }

    const summary = await __providerUsageSnapshotTest.readCodexSessionSummary(filePath);

    expect(summary?.totalTokens).toBe(12_345);
    expect(summary?.limits[0]).toMatchObject({ usedPercent: 25, windowDurationMins: 300 });
  });

  it("rejects an archive whose bounded reads would exceed the request budget", () => {
    const budget = __providerUsageSnapshotTest.PROVIDER_USAGE_TOTAL_READ_BUDGET_BYTES;
    const files = [
      { path: "one", mtimeMs: 2, size: budget },
      { path: "two", mtimeMs: 1, size: 1 },
    ];

    expect(__providerUsageSnapshotTest.fitsReadBudget(files, (file) => file.size)).toBe(false);
    expect(__providerUsageSnapshotTest.fitsReadBudget(files.slice(0, 1), (file) => file.size)).toBe(
      true,
    );
  });

  it("bounds an oversized Claude line and continues with later valid records", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = path.join(directory, "claude-transcript.jsonl");
    const now = Date.now();
    const validRecord = JSON.stringify({
      type: "assistant",
      timestamp: new Date(now).toISOString(),
      sessionId: "session-1",
      requestId: "request-1",
      message: {
        model: "claude-test",
        usage: { input_tokens: 20, output_tokens: 5 },
      },
    });
    await fs.writeFile(
      filePath,
      `${"x".repeat(__providerUsageSnapshotTest.PROVIDER_USAGE_MAX_LINE_CHARS + 1)}\n${validRecord}\n`,
      "utf8",
    );

    const result = await __providerUsageSnapshotTest.readClaudeUsageAggregate(filePath, now);

    expect(result.complete).toBe(false);
    expect(result.aggregate.tokens24h).toBe(25);
    expect(result.aggregate.sessions24h).toEqual(new Set(["session-1"]));
  });
});
