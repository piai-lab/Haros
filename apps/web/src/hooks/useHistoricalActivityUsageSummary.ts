// Present usage already recorded in historical conversation activity. This hook does not query or
// imply current runtime/account authority.

import type { ConversationHistory } from "~/historicalConversation";
import {
  deriveAccountRateLimits,
  deriveProviderUsageLearnMoreHref,
  deriveRateLimitLearnMoreHref,
  type ProviderRateLimit,
} from "~/lib/rateLimits";

export function useHistoricalActivityUsageSummary(input: {
  sourceId: string | null | undefined;
  conversations?: ReadonlyArray<Pick<ConversationHistory, "activities">>;
  recordedRateLimits?: ReadonlyArray<ProviderRateLimit> | undefined;
}) {
  const sourceId = input.sourceId ?? null;
  const rateLimits = (
    input.recordedRateLimits ?? deriveAccountRateLimits(input.conversations ?? [])
  ).filter((rateLimit) => (sourceId ? rateLimit.provider === sourceId : true));

  return {
    isLoading: false,
    learnMoreHref:
      deriveRateLimitLearnMoreHref(rateLimits) ?? deriveProviderUsageLearnMoreHref(sourceId),
    rateLimits,
    usageLines: [],
    usageNotice: undefined,
  } as const;
}
