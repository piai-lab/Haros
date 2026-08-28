import { describe, expect, it } from "vitest";

import { normalizeOpenUsageSnapshot, normalizeOpenUsageUsageLines } from "./openUsageRateLimits";
import { mergeEngineRateLimits } from "./rateLimits";

describe("openUsageRateLimits", () => {
  it("normalizes OpenUsage progress lines into shared engine rate limits", () => {
    expect(
      normalizeOpenUsageSnapshot({
        providerId: "codex",
        fetchedAt: "2099-04-08T18:00:00.000Z",
        lines: [
          {
            type: "progress",
            label: "Session",
            used: 20,
            limit: 100,
            resetsAt: "2099-04-08T21:18:00.000Z",
            periodDurationMs: 18_000_000,
          },
          {
            type: "progress",
            label: "Weekly",
            used: 10,
            limit: 100,
            resetsAt: "2099-04-14T18:00:00.000Z",
            periodDurationMs: 604_800_000,
          },
        ],
      }),
    ).toEqual({
      engine: "codex",
      updatedAt: "2099-04-08T18:00:00.000Z",
      limits: [
        {
          window: "5h",
          usedPercent: 20,
          resetsAt: "2099-04-08T21:18:00.000Z",
          windowDurationMins: 300,
        },
        {
          window: "Weekly",
          usedPercent: 10,
          resetsAt: "2099-04-14T18:00:00.000Z",
          windowDurationMins: 10080,
        },
      ],
    });
  });

  it("merges runtime and OpenUsage windows for the same engine", () => {
    expect(
      mergeEngineRateLimits(
        [
          {
            engine: "codex",
            updatedAt: "2099-04-08T18:05:00.000Z",
            limits: [
              {
                window: "5h",
                usedPercent: 22,
                resetsAt: "2099-04-08T21:18:00.000Z",
                windowDurationMins: 300,
              },
            ],
          },
        ],
        [
          {
            engine: "codex",
            updatedAt: "2099-04-08T18:00:00.000Z",
            limits: [
              {
                window: "Weekly",
                usedPercent: 10,
                resetsAt: "2099-04-14T18:00:00.000Z",
                windowDurationMins: 10080,
              },
            ],
          },
        ],
      ),
    ).toEqual([
      {
        engine: "codex",
        updatedAt: "2099-04-08T18:05:00.000Z",
        limits: [
          {
            window: "5h",
            usedPercent: 22,
            resetsAt: "2099-04-08T21:18:00.000Z",
            windowDurationMins: 300,
          },
          {
            window: "Weekly",
            usedPercent: 10,
            resetsAt: "2099-04-14T18:00:00.000Z",
            windowDurationMins: 10080,
          },
        ],
      },
    ]);
  });

  it("keeps the freshest window when two sources report the same engine limit", () => {
    expect(
      mergeEngineRateLimits(
        [
          {
            engine: "codex",
            updatedAt: "2099-04-08T18:00:00.000Z",
            limits: [
              {
                window: "Weekly",
                usedPercent: 65,
                resetsAt: "2099-04-14T18:00:00.000Z",
                windowDurationMins: 10080,
              },
            ],
          },
        ],
        [
          {
            engine: "codex",
            updatedAt: "2099-04-08T18:05:00.000Z",
            limits: [
              {
                window: "Weekly",
                usedPercent: 84,
                resetsAt: "2099-04-14T18:00:00.000Z",
                windowDurationMins: 10080,
              },
            ],
          },
        ],
      ),
    ).toEqual([
      {
        engine: "codex",
        updatedAt: "2099-04-08T18:05:00.000Z",
        limits: [
          {
            window: "Weekly",
            usedPercent: 84,
            resetsAt: "2099-04-14T18:00:00.000Z",
            windowDurationMins: 10080,
          },
        ],
      },
    ]);
  });

  it("fills missing timing metadata from an older source when the freshest row only has usage", () => {
    expect(
      mergeEngineRateLimits(
        [
          {
            engine: "codex",
            updatedAt: "2099-04-08T18:00:00.000Z",
            limits: [
              {
                window: "Weekly",
                usedPercent: 65,
                resetsAt: "2099-04-14T18:00:00.000Z",
                windowDurationMins: 10080,
              },
            ],
          },
        ],
        [
          {
            engine: "codex",
            updatedAt: "2099-04-08T18:05:00.000Z",
            limits: [
              {
                window: "Weekly",
                usedPercent: 84,
              },
            ],
          },
        ],
      ),
    ).toEqual([
      {
        engine: "codex",
        updatedAt: "2099-04-08T18:05:00.000Z",
        limits: [
          {
            window: "Weekly",
            usedPercent: 84,
            resetsAt: "2099-04-14T18:00:00.000Z",
            windowDurationMins: 10080,
          },
        ],
      },
    ]);
  });

  it("preserves OpenUsage text lines for daily token usage summaries", () => {
    expect(
      normalizeOpenUsageUsageLines({
        providerId: "codex",
        fetchedAt: "2099-04-08T18:00:00.000Z",
        lines: [
          {
            type: "progress",
            label: "Session",
            used: 20,
            limit: 100,
          },
          {
            type: "text",
            label: "Today",
            value: "$5.17 · 9.2M tokens",
          },
          {
            type: "text",
            label: "Yesterday",
            value: "$2.04 · 3.1M tokens",
            subtitle: "via ccusage",
          },
        ],
      }),
    ).toEqual([
      {
        label: "Today",
        value: "$5.17 · 9.2M tokens",
      },
      {
        label: "Yesterday",
        value: "$2.04 · 3.1M tokens",
        subtitle: "via ccusage",
      },
    ]);
  });
});
