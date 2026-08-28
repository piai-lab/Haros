// FILE: profileSelectors.test.ts
// Purpose: Covers profile selectors that bridge fast core stats with slower
// token telemetry.
// Layer: web profile feature tests.

import type { ProfileStats, ProfileTokenStats } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import { selectProfileHeatmap } from "./profileSelectors";

const promptHeatmapCell = {
  day: "2026-07-01",
  count: 3,
  weekday: 3,
  intensity: 2,
};

const tokenHeatmapCell = {
  day: "2026-07-02",
  count: 6000,
  weekday: 4,
  intensity: 4,
};

const baseStats = {
  generatedAt: "2026-07-02T10:00:00.000Z",
  timezone: { utcOffsetMinutes: 0, today: "2026-07-02" },
  activity: {
    currentStreakDays: 0,
    longestStreakDays: 0,
    totalPromptsSent: 0,
    totalThreads: 0,
    promptsToday: 0,
    heatmapMetric: "prompts",
    heatmap: [promptHeatmapCell],
  },
  activeHours: { startHour: null, endHour: null, turnCount: 0 },
  recentModelUsage: {
    rangeDays: 30,
    totalTurns: 3,
    coverage: "complete",
    models: [
      {
        engine: "codex",
        model: "gpt-5-codex",
        turnCount: 2,
        percent: 66.7,
        kind: "model",
      },
      {
        engine: "claude",
        model: "claude-sonnet-4-6",
        turnCount: 1,
        percent: 33.3,
        kind: "model",
      },
    ],
  },
  workFocus: { totalPrompts: 0, entries: [] },
  insights: {
    topReasoning: null,
    topReasoningPercent: null,
    skillsExplored: 0,
    totalSkillsUsed: 0,
  },
  skills: [],
} satisfies ProfileStats;

const tokenStats = {
  available: true,
  lifetimeTotalTokens: 6000,
  peakDayTokens: 5000,
  peakDay: "2026-07-02",
  heatmapMetric: "tokens",
  heatmap: [tokenHeatmapCell],
  recentTokenUsage: {
    rangeDays: 30,
    startDay: "2026-06-03",
    endDay: "2026-07-02",
    cachedInputTokens: 0,
    uncachedInputTokens: 5000,
    outputTokens: 1000,
    cacheHitPercent: 0,
    coverage: "complete",
    unavailableProviders: [],
    days: [],
  },
} satisfies ProfileTokenStats;

describe("profile selectors", () => {
  it("prefers token telemetry once available", () => {
    expect(selectProfileHeatmap(baseStats, tokenStats)).toEqual({
      cells: [tokenHeatmapCell],
      unit: "tokens",
    });
  });

  it("falls back to core profile stats while token telemetry is unavailable", () => {
    expect(selectProfileHeatmap(baseStats, null)).toEqual({
      cells: [promptHeatmapCell],
      unit: "prompts",
    });
  });
});
