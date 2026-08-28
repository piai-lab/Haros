// FILE: providerUsage/providers/codex.ts
// Purpose: Read Codex account limits through Codex's own app-server protocol. OmniMind does not
// parse, refresh, copy, or write Codex credentials; authentication remains native to Codex.

import type {
  ServerProviderUsageLimit,
  ServerProviderUsageLine,
} from "@harnessos/contracts";

import { createLogger } from "../../logger";
import {
  asFiniteNumber,
  asRecord,
  asString,
  buildSnapshot,
  clampPercent,
  errorSnapshot,
  formatUsd,
  isoFromUnixSeconds,
  needsAuthSnapshot,
  titleCase,
} from "../parse";
import type { ProviderUsageFetcher } from "../types";

const log = createLogger("provider-usage:codex");
const SOURCE = "codex-app-server-rate-limits";

function pushRateLimitWindow(input: {
  readonly limits: ServerProviderUsageLimit[];
  readonly label: string;
  readonly value: unknown;
  readonly fallbackDurationMins: number;
}): void {
  const window = asRecord(input.value);
  if (!window) return;

  const usedPercent = clampPercent(asFiniteNumber(window.usedPercent));
  const resetsAt = isoFromUnixSeconds(window.resetsAt);
  const windowDurationMins =
    asFiniteNumber(window.windowDurationMins) ?? input.fallbackDurationMins;
  if (usedPercent === undefined && !resetsAt) return;

  input.limits.push({
    window: input.label,
    ...(usedPercent !== undefined ? { usedPercent } : {}),
    ...(resetsAt ? { resetsAt } : {}),
    windowDurationMins,
  });
}

export function parseCodexAppServerRateLimits(input: { readonly json: unknown; nowMs: number }) {
  const root = asRecord(input.json);
  const rateLimits = asRecord(root?.rateLimits);
  const limits: ServerProviderUsageLimit[] = [];
  const usageLines: ServerProviderUsageLine[] = [];

  pushRateLimitWindow({
    limits,
    label: "5h",
    value: rateLimits?.primary,
    fallbackDurationMins: 300,
  });
  pushRateLimitWindow({
    limits,
    label: "Weekly",
    value: rateLimits?.secondary,
    fallbackDurationMins: 10_080,
  });

  const credits = asRecord(rateLimits?.credits);
  if (credits?.unlimited === true) {
    usageLines.push({ label: "Credits", value: "Unlimited" });
  } else {
    const balance = asFiniteNumber(credits?.balance);
    if (balance !== undefined && (credits?.hasCredits !== false || balance > 0)) {
      usageLines.push({ label: "Credits", value: `${formatUsd(balance)} remaining` });
    }
  }

  const planType = asString(rateLimits?.planType);
  return buildSnapshot({
    provider: "codex",
    nowMs: input.nowMs,
    status: "ok",
    source: SOURCE,
    limits,
    usageLines,
    ...(planType ? { planName: titleCase(planType) } : {}),
  });
}

function isCodexAuthenticationError(cause: unknown): boolean {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /auth|log(?:ged)? in|sign in|account is unavailable|unauthorized/i.test(message);
}

export const codexUsageFetcher: ProviderUsageFetcher = {
  provider: "codex",
  async cacheKey() {
    return SOURCE;
  },
  async fetch(ctx) {
    if (!ctx.codexRateLimits) {
      return errorSnapshot(
        "codex",
        ctx.nowMs,
        SOURCE,
        "Codex app-server usage is unavailable.",
      );
    }

    try {
      return parseCodexAppServerRateLimits({
        json: await ctx.codexRateLimits(),
        nowMs: ctx.nowMs,
      });
    } catch (cause) {
      log.warn("codex app-server could not read account limits", {
        message: cause instanceof Error ? cause.message : String(cause),
      });
      return isCodexAuthenticationError(cause)
        ? needsAuthSnapshot("codex", ctx.nowMs, SOURCE)
        : errorSnapshot(
            "codex",
            ctx.nowMs,
            SOURCE,
            "Codex could not report account limits.",
          );
    }
  },
};
