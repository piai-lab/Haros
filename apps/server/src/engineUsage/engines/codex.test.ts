// FILE: engineUsage/engines/codex.test.ts
// Purpose: Proves Codex usage stays on the engine-native app-server path.

import { describe, expect, it, vi } from "vitest";

import { codexUsageFetcher, parseCodexAppServerRateLimits } from "./codex";

const NOW_MS = 1_780_000_000_000;

const RATE_LIMITS_RESPONSE = {
  rateLimits: {
    limitId: "codex",
    limitName: null,
    primary: {
      usedPercent: 41,
      windowDurationMins: 300,
      resetsAt: Math.floor(NOW_MS / 1000) + 3_600,
    },
    secondary: {
      usedPercent: 12,
      windowDurationMins: 10_080,
      resetsAt: Math.floor(NOW_MS / 1000) + 86_400,
    },
    credits: { hasCredits: true, unlimited: false, balance: "12.50" },
    individualLimit: null,
    spendControlReached: false,
    planType: "plus",
    rateLimitReachedType: null,
  },
  rateLimitsByLimitId: null,
  rateLimitResetCredits: null,
};

describe("Codex app-server usage", () => {
  it("maps native rate limits without reading credential state", () => {
    const snapshot = parseCodexAppServerRateLimits({
      json: RATE_LIMITS_RESPONSE,
      nowMs: NOW_MS,
    });

    expect(snapshot).toMatchObject({
      engine: "codex",
      status: "ok",
      source: "codex-app-server-rate-limits",
      planName: "Plus",
      limits: [
        { window: "5h", usedPercent: 41, windowDurationMins: 300 },
        { window: "Weekly", usedPercent: 12, windowDurationMins: 10_080 },
      ],
      usageLines: [{ label: "Credits", value: "$12.50 remaining" }],
    });
  });

  it("delegates the read to Codex app-server", async () => {
    const codexRateLimits = vi.fn(async () => RATE_LIMITS_RESPONSE);
    const snapshot = await codexUsageFetcher.fetch({
      homeDir: "/home/test",
      env: {},
      platform: "darwin",
      nowMs: NOW_MS,
      codexRateLimits,
    });

    expect(snapshot.status).toBe("ok");
    expect(codexRateLimits).toHaveBeenCalledOnce();
  });

  it("distinguishes native authentication failure from transport failure", async () => {
    const needsAuth = await codexUsageFetcher.fetch({
      homeDir: "/home/test",
      env: {},
      platform: "darwin",
      nowMs: NOW_MS,
      codexRateLimits: async () => {
        throw new Error("Sign in to ChatGPT in Codex.");
      },
    });
    const unavailable = await codexUsageFetcher.fetch({
      homeDir: "/home/test",
      env: {},
      platform: "darwin",
      nowMs: NOW_MS,
      codexRateLimits: async () => {
        throw new Error("app-server request timed out");
      },
    });

    expect(needsAuth.status).toBe("needs-auth");
    expect(unavailable.status).toBe("error");
  });

  it("does not invent an HTTP fallback when the native reader is absent", async () => {
    const snapshot = await codexUsageFetcher.fetch({
      homeDir: "/home/test",
      env: {},
      platform: "darwin",
      nowMs: NOW_MS,
    });

    expect(snapshot).toMatchObject({
      status: "error",
      detail: "Codex app-server usage is unavailable.",
    });
  });
});
