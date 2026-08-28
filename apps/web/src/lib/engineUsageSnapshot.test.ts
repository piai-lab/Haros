// FILE: engineUsageSnapshot.test.ts
// Purpose: Locks down engine-usage snapshot normalization edge cases used by
// compact usage surfaces and Settings usage cards.

import type { ServerEngineUsageSnapshot } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import { isEngineUsageSnapshotNonOk } from "./engineUsageSnapshot";

function snapshot(input: Partial<ServerEngineUsageSnapshot> = {}): ServerEngineUsageSnapshot {
  return {
    engine: "claude",
    updatedAt: "2026-06-09T12:00:00.000Z",
    limits: [],
    usageLines: [],
    source: "test",
    ...input,
  };
}

describe("engineUsageSnapshot", () => {
  it("only treats explicit non-ok live statuses as fallback blockers", () => {
    expect(isEngineUsageSnapshotNonOk(null)).toBe(false);
    expect(isEngineUsageSnapshotNonOk(undefined)).toBe(false);
    expect(isEngineUsageSnapshotNonOk(snapshot())).toBe(false);
    expect(isEngineUsageSnapshotNonOk(snapshot({ status: "ok" }))).toBe(false);

    expect(isEngineUsageSnapshotNonOk(snapshot({ status: "needs-auth" }))).toBe(true);
    expect(isEngineUsageSnapshotNonOk(snapshot({ status: "unsupported" }))).toBe(true);
    expect(isEngineUsageSnapshotNonOk(snapshot({ status: "error" }))).toBe(true);
  });
});
