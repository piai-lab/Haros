// FILE: useAccountCapacity.ts
// Purpose: Engine-native account capacity only; never reads local history or thread signals.

import type { EngineKind, ServerProviderUsageSnapshot } from "@harnessos/contracts";
import { useQuery } from "@tanstack/react-query";

import {
  isProviderUsageSnapshotNonOk,
  normalizeServerProviderUsageLines,
  normalizeServerProviderUsageRateLimit,
} from "~/lib/providerUsageSnapshot";
import { deriveProviderUsageLearnMoreHref, deriveRateLimitLearnMoreHref } from "~/lib/rateLimits";
import { serverAllProviderUsageQueryOptions } from "~/lib/serverReactQuery";

export function useAccountCapacity(input: {
  engine: EngineKind | null | undefined;
  providerSnapshot?: ServerProviderUsageSnapshot | undefined;
}) {
  const engine = input.engine ?? null;
  const shouldFetch = engine !== null && input.providerSnapshot === undefined;
  const query = useQuery(serverAllProviderUsageQueryOptions({ enabled: shouldFetch }));
  const fetched = (query.data ?? []).find((snapshot) => snapshot.engine === engine);
  const snapshot = fetched ?? input.providerSnapshot ?? null;
  const unavailable = isProviderUsageSnapshotNonOk(snapshot);
  const liveRateLimit = unavailable ? null : normalizeServerProviderUsageRateLimit(snapshot);
  const rateLimits = liveRateLimit ? [liveRateLimit] : [];
  const usageLines = unavailable ? [] : normalizeServerProviderUsageLines(snapshot);
  const detail = unavailable ? undefined : snapshot?.detail?.trim() || undefined;

  return {
    isLoading: shouldFetch && query.isPending && !snapshot,
    learnMoreHref:
      deriveRateLimitLearnMoreHref(rateLimits) ?? deriveProviderUsageLearnMoreHref(engine),
    rateLimits,
    usageLines,
    usageNotice: detail,
  } as const;
}
