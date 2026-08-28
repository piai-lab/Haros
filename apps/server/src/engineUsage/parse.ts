// FILE: engineUsage/parse.ts
// Purpose: Small, dependency-free parsing/formatting helpers and snapshot builders shared by
// the per-engine usage fetchers. Kept pure so the per-engine parsers can be unit-tested
// without touching the network, filesystem, or keychain.

import type {
  EngineKind,
  EngineUsageStatus,
  ServerEngineUsageLimit,
  ServerEngineUsageLine,
  ServerEngineUsageSnapshot,
} from "@harnessos/contracts";
import { engineUsageNeedsAuthDetail } from "@harnessos/shared/engineUsage";

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  // Several engine APIs send numeric quotas as strings (e.g. unix-ms timestamps).
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function asNonNegativeNumber(value: unknown): number | undefined {
  const parsed = asFiniteNumber(value);
  return parsed !== undefined && parsed >= 0 ? parsed : undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function clampPercent(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.min(100, Math.max(0, value));
}

/** Convert a fraction (0..1) or an already-percent value (0..100) into a clamped 0..100 percent. */
export function toUsedPercent(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }
  return clampPercent(value <= 1 ? value * 100 : value);
}

export function isoFromUnixSeconds(value: unknown): string | undefined {
  const seconds = asFiniteNumber(value);
  if (seconds === undefined || seconds <= 0) {
    return undefined;
  }
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function isoFromUnixMillis(value: unknown): string | undefined {
  const millis = asFiniteNumber(value);
  if (millis === undefined || millis <= 0) {
    return undefined;
  }
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function isoFromString(value: unknown): string | undefined {
  const text = asString(value);
  if (!text) {
    return undefined;
  }
  const millis = Date.parse(text);
  return Number.isNaN(millis) ? undefined : new Date(millis).toISOString();
}

export function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/u)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export interface SnapshotInput {
  engine: EngineKind;
  nowMs: number;
  status: EngineUsageStatus;
  source: string;
  limits?: ReadonlyArray<ServerEngineUsageLimit>;
  usageLines?: ReadonlyArray<ServerEngineUsageLine>;
  planName?: string;
  detail?: string;
}

export function buildSnapshot(input: SnapshotInput): ServerEngineUsageSnapshot {
  return {
    engine: input.engine,
    updatedAt: new Date(input.nowMs).toISOString(),
    limits: input.limits ?? [],
    usageLines: input.usageLines ?? [],
    source: input.source,
    status: input.status,
    ...(input.planName ? { planName: input.planName } : {}),
    ...(input.detail ? { detail: input.detail } : {}),
  };
}

export function needsAuthSnapshot(
  engine: EngineKind,
  nowMs: number,
  source: string,
): ServerEngineUsageSnapshot {
  return buildSnapshot({
    engine,
    nowMs,
    status: "needs-auth",
    source,
    detail: engineUsageNeedsAuthDetail(engine),
  });
}

export function unsupportedSnapshot(
  engine: EngineKind,
  nowMs: number,
  source: string,
  detail: string,
): ServerEngineUsageSnapshot {
  return buildSnapshot({ engine, nowMs, status: "unsupported", source, detail });
}

export function errorSnapshot(
  engine: EngineKind,
  nowMs: number,
  source: string,
  detail: string,
): ServerEngineUsageSnapshot {
  return buildSnapshot({ engine, nowMs, status: "error", source, detail });
}
