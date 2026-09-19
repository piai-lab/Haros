import { Schema } from "effect";
import { IsoDateTime, NonNegativeInt, PositiveInt, TrimmedNonEmptyString } from "./baseSchemas";

export const ClaudeCacheObservation = Schema.Struct({
  nativeSessionId: Schema.optional(TrimmedNonEmptyString),
  lifecycleGeneration: Schema.optional(TrimmedNonEmptyString),
  model: Schema.optional(TrimmedNonEmptyString),
  observedAt: IsoDateTime,
  contextTokens: Schema.optional(NonNegativeInt),
  lastResponseAt: Schema.optional(IsoDateTime),
  cacheReferenceAt: Schema.optional(IsoDateTime),
  ttlSeconds: Schema.optional(PositiveInt),
  state: Schema.Literals(["likely-warm", "likely-expired", "unknown"]),
  source: Schema.Literals(["session-start", "request-usage", "local-estimate"]),
  estimatedCacheWriteUsd: Schema.optional(Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))),
  lastRequest: Schema.optional(
    Schema.Struct({
      messageId: TrimmedNonEmptyString,
      inputTokens: Schema.optional(NonNegativeInt),
      cacheReadInputTokens: Schema.optional(NonNegativeInt),
      cacheCreationInputTokens: Schema.optional(NonNegativeInt),
    }),
  ),
});
export type ClaudeCacheObservation = typeof ClaudeCacheObservation.Type;
