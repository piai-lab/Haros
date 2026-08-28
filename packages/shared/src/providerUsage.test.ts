// FILE: providerUsage.test.ts
// Purpose: Locks usage-provider metadata and the settings-panel visibility rule
// that hides unsigned providers once any connected snapshot exists.

import { describe, expect, it } from "vitest";

import type { ServerProviderUsageSnapshot } from "@harnessos/contracts";

import { PROVIDER_USAGE_PROVIDERS, selectVisibleProviderUsageSnapshots } from "./providerUsage";

function snapshot(
  provider: ServerProviderUsageSnapshot["provider"],
  status: NonNullable<ServerProviderUsageSnapshot["status"]>,
): ServerProviderUsageSnapshot {
  return {
    provider,
    updatedAt: "2026-08-19T00:00:00.000Z",
    limits: [],
    usageLines: [],
    source: "test",
    status,
  };
}

describe("provider usage metadata", () => {
  it("exposes every provider with a safe live usage source", () => {
    expect([...PROVIDER_USAGE_PROVIDERS]).toEqual([
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
    expect(selectVisibleProviderUsageSnapshots(snapshots).map((item) => item.provider)).toEqual([
      "codex",
      "antigravity",
      "grok",
    ]);
  });

  it("hides unsigned providers once any connected snapshot exists", () => {
    const snapshots = [
      snapshot("codex", "ok"),
      snapshot("claude", "needs-auth"),
      snapshot("grok", "ok"),
      snapshot("antigravity", "needs-auth"),
    ];
    expect(selectVisibleProviderUsageSnapshots(snapshots).map((item) => item.provider)).toEqual([
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
    expect(selectVisibleProviderUsageSnapshots(snapshots).map((item) => item.provider)).toEqual([
      "codex",
    ]);
  });

  it("does not invent connected cards for providers absent from the payload", () => {
    const snapshots = [snapshot("codex", "ok")];
    expect(selectVisibleProviderUsageSnapshots(snapshots).map((item) => item.provider)).toEqual([
      "codex",
    ]);
  });
});
