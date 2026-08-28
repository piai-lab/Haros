// FILE: engineUsageSnapshot.ts
// Purpose: Normalize engine usage snapshots returned by the server into the
// same shapes consumed by the shared usage/rate-limit UI in the web app.

import type { ServerEngineUsageSnapshot } from "@harnessos/contracts";

import type { OpenUsageUsageLine } from "./openUsageRateLimits";
import type { EngineRateLimit } from "./rateLimits";

export function isEngineUsageSnapshotNonOk(
  snapshot: ServerEngineUsageSnapshot | null | undefined,
): boolean {
  return snapshot?.status !== undefined && snapshot.status !== "ok";
}

export function normalizeServerEngineUsageRateLimit(
  snapshot: ServerEngineUsageSnapshot | null | undefined,
): EngineRateLimit | null {
  if (!snapshot || snapshot.limits.length === 0) {
    return null;
  }

  return {
    engine: snapshot.engine,
    updatedAt: snapshot.updatedAt,
    limits: snapshot.limits.map((limit) => ({
      window: limit.window,
      ...(limit.usedPercent !== undefined ? { usedPercent: limit.usedPercent } : {}),
      ...(limit.resetsAt ? { resetsAt: limit.resetsAt } : {}),
      ...(limit.windowDurationMins !== undefined
        ? { windowDurationMins: limit.windowDurationMins }
        : {}),
    })),
  };
}

export function normalizeServerEngineUsageLines(
  snapshot: ServerEngineUsageSnapshot | null | undefined,
): OpenUsageUsageLine[] {
  if (!snapshot || snapshot.usageLines.length === 0) {
    return [];
  }

  return snapshot.usageLines.map((line) => ({
    label: line.label,
    value: line.value,
    ...(line.subtitle ? { subtitle: line.subtitle } : {}),
  }));
}
