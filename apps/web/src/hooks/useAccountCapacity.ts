// FILE: useAccountCapacity.ts
// Purpose: Engine-native account capacity only; never reads local history or thread signals.

import type { EngineKind, ServerEngineUsageSnapshot } from "@harnessos/contracts";
import { useQuery } from "@tanstack/react-query";

import {
  isEngineUsageSnapshotNonOk,
  normalizeServerEngineUsageLines,
  normalizeServerEngineUsageRateLimit,
} from "~/lib/engineUsageSnapshot";
import { deriveEngineUsageLearnMoreHref, deriveRateLimitLearnMoreHref } from "~/lib/rateLimits";
import { serverAllEngineUsageQueryOptions } from "~/lib/serverReactQuery";

export function useAccountCapacity(input: {
  engine: EngineKind | null | undefined;
  engineSnapshot?: ServerEngineUsageSnapshot | undefined;
}) {
  const engine = input.engine ?? null;
  const shouldFetch = engine !== null && input.engineSnapshot === undefined;
  const query = useQuery(serverAllEngineUsageQueryOptions({ enabled: shouldFetch }));
  const fetched = (query.data ?? []).find((snapshot) => snapshot.engine === engine);
  const snapshot = fetched ?? input.engineSnapshot ?? null;
  const unavailable = isEngineUsageSnapshotNonOk(snapshot);
  const liveRateLimit = unavailable ? null : normalizeServerEngineUsageRateLimit(snapshot);
  const rateLimits = liveRateLimit ? [liveRateLimit] : [];
  const usageLines = unavailable ? [] : normalizeServerEngineUsageLines(snapshot);
  const detail = unavailable ? undefined : snapshot?.detail?.trim() || undefined;

  return {
    isLoading: shouldFetch && query.isPending && !snapshot,
    learnMoreHref:
      deriveRateLimitLearnMoreHref(rateLimits) ?? deriveEngineUsageLearnMoreHref(engine),
    rateLimits,
    usageLines,
    usageNotice: detail,
  } as const;
}
