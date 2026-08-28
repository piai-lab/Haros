// FILE: engineUsage.test.ts
// Purpose: Locks usage-engine metadata and the settings-panel visibility rule
// that hides unsigned engines once any connected snapshot exists.

import { describe, expect, it } from "vitest";

import type { ServerEngineUsageSnapshot } from "@harnessos/contracts";

import { ENGINE_USAGE_ENGINES, selectVisibleEngineUsageSnapshots } from "./engineUsage";

function snapshot(
  engine: ServerEngineUsageSnapshot["engine"],
  status: NonNullable<ServerEngineUsageSnapshot["status"]>,
): ServerEngineUsageSnapshot {
  return {
    engine,
    updatedAt: "2026-08-19T00:00:00.000Z",
    limits: [],
    usageLines: [],
    source: "test",
    status,
  };
}

describe("engine usage metadata", () => {
  it("exposes every engine with a safe live usage source", () => {
    expect([...ENGINE_USAGE_ENGINES]).toEqual([
      "codex",
      "claude",
      "cursor",
      "antigravity",
      "grok",
      "droid",
      "kilo",
      "opencode",
    ]);
  });

  it("keeps every unsigned card visible when nothing is connected", () => {
    const snapshots = [
      snapshot("codex", "needs-auth"),
      snapshot("grok", "needs-auth"),
      snapshot("antigravity", "needs-auth"),
    ];
    expect(selectVisibleEngineUsageSnapshots(snapshots).map((item) => item.engine)).toEqual([
      "codex",
      "antigravity",
      "grok",
    ]);
  });

  it("hides unsigned engines once any connected snapshot exists", () => {
    const snapshots = [
      snapshot("codex", "ok"),
      snapshot("claude", "needs-auth"),
      snapshot("grok", "ok"),
      snapshot("antigravity", "needs-auth"),
    ];
    expect(selectVisibleEngineUsageSnapshots(snapshots).map((item) => item.engine)).toEqual([
      "codex",
      "grok",
    ]);
  });

  it("treats a live fetch error as connected so unsigned cards still hide", () => {
    const snapshots = [
      snapshot("codex", "error"),
      snapshot("claude", "needs-auth"),
      snapshot("opencode", "needs-auth"),
    ];
    expect(selectVisibleEngineUsageSnapshots(snapshots).map((item) => item.engine)).toEqual([
      "codex",
    ]);
  });

  it("does not invent connected cards for engines absent from the payload", () => {
    const snapshots = [snapshot("codex", "ok")];
    expect(selectVisibleEngineUsageSnapshots(snapshots).map((item) => item.engine)).toEqual([
      "codex",
    ]);
  });
});
