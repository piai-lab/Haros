// FILE: usageHistory/pricing.ts
// Purpose: Versioned API-price estimates for normalized local usage events.

export const USAGE_HISTORY_PRICING_VERSION = "official-api-prices-2026-08-11-v2";

interface TokenRatesPerMillion {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
}

interface PricingRule {
  readonly matches: (model: string) => boolean;
  readonly rates: TokenRatesPerMillion;
}

// Sources frozen for this pricing version:
// https://openai.com/api/pricing/
// https://developers.openai.com/api/docs/models/gpt-5.4
// https://openai.com/index/introducing-gpt-5-2/
// https://developers.openai.com/api/docs/models/gpt-5
// https://docs.anthropic.com/en/docs/about-claude/pricing
// These are API list prices, not proof of a user's subscription charge, batch/
// priority mode, long-context multiplier, proxy markup or negotiated contract.
const PRICING_RULES: ReadonlyArray<PricingRule> = [
  {
    matches: (model) => /(^|[/_-])gpt-5\.6-sol($|[/_-])/u.test(model),
    rates: { input: 5, cacheRead: 0.5, cacheWrite: 6.25, output: 30 },
  },
  {
    matches: (model) => /(^|[/_-])gpt-5\.6-terra($|[/_-])/u.test(model),
    rates: { input: 2.5, cacheRead: 0.25, cacheWrite: 3.125, output: 15 },
  },
  {
    matches: (model) => /(^|[/_-])gpt-5\.6-luna($|[/_-])/u.test(model),
    rates: { input: 1, cacheRead: 0.1, cacheWrite: 1.25, output: 6 },
  },
  {
    matches: (model) => /(^|[/_-])gpt-5\.4($|[/_-])/u.test(model),
    rates: { input: 2.5, cacheRead: 0.25, cacheWrite: 3.125, output: 15 },
  },
  {
    matches: (model) => /(^|[/_-])gpt-5\.2($|[/_-])/u.test(model),
    rates: { input: 1.75, cacheRead: 0.175, cacheWrite: 2.1875, output: 14 },
  },
  {
    matches: (model) => /(^|[/_-])gpt-5(?:\.1)?($|[/_-])/u.test(model),
    rates: { input: 1.25, cacheRead: 0.125, cacheWrite: 1.5625, output: 10 },
  },
  {
    matches: (model) => /claude-(?:[^/]*-)?opus-(?:5|4[.-](?:5|6|7|8))(?:[./_-]|$)/u.test(model),
    rates: { input: 5, cacheRead: 0.5, cacheWrite: 6.25, output: 25 },
  },
  {
    matches: (model) => /claude-(?:[^/]*-)?opus-4(?:[.-]1)?(?:[./_-]|$)/u.test(model),
    rates: { input: 15, cacheRead: 1.5, cacheWrite: 18.75, output: 75 },
  },
  {
    matches: (model) => /claude-(?:[^/]*-)?sonnet-5(?:[./_-]|$)/u.test(model),
    rates: { input: 2, cacheRead: 0.2, cacheWrite: 2.5, output: 10 },
  },
  {
    matches: (model) => /claude-(?:[^/]*-)?haiku-4[.-]5(?:[./_-]|$)/u.test(model),
    rates: { input: 1, cacheRead: 0.1, cacheWrite: 1.25, output: 5 },
  },
  {
    matches: (model) => /claude-(?:[^/]*-)?sonnet-(?:4|3\.7)(?:\.|-|$)/u.test(model),
    rates: { input: 3, cacheRead: 0.3, cacheWrite: 3.75, output: 15 },
  },
  {
    matches: (model) => /claude-(?:[^/]*-)?haiku-3\.5(?:\.|-|$)/u.test(model),
    rates: { input: 0.8, cacheRead: 0.08, cacheWrite: 1, output: 4 },
  },
];

export interface UsageHistoryPricedTokens {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
}

export function estimateUsageHistoryCostMicros(input: UsageHistoryPricedTokens): number | null {
  const normalizedModel = input.model.trim().toLowerCase();
  const rule = PRICING_RULES.find((candidate) => candidate.matches(normalizedModel));
  if (!rule) return null;

  // A rate is USD per million tokens. Multiplying token count by that rate
  // directly yields micro-USD, which keeps the durable/public value integral.
  return Math.max(
    0,
    Math.round(
      input.inputTokens * rule.rates.input +
        input.outputTokens * rule.rates.output +
        input.cacheReadTokens * rule.rates.cacheRead +
        input.cacheWriteTokens * rule.rates.cacheWrite,
    ),
  );
}
