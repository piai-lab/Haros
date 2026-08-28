// FILE: stats.ts
// Purpose: Schemas for the local profile-stats RPCs that power Usage Insights and
// its complete, identity-free summary card. All metrics are backed by OmniMind's
// local DB projections; no cloud data is part of this contract.
// Metrics are lifetime totals: deleting a thread or project from the app never
// subtracts the work it already contributed to the profile.
// Layer: shared contracts (schema-only, no runtime logic)

import { Schema } from "effect";
import { IsoDateTime, NonNegativeInt, TrimmedNonEmptyString } from "./baseSchemas";
import { EngineKind } from "./orchestration";

// ── Input ────────────────────────────────────────────────────────────

// The client passes its own fixed UTC offset (minutes east of UTC, i.e.
// `-new Date().getTimezoneOffset()`) so the server can bucket activity by the
// user's LOCAL day/hour rather than UTC.
export const StatsGetProfileStatsInput = Schema.Struct({
  utcOffsetMinutes: Schema.Int,
});
export type StatsGetProfileStatsInput = typeof StatsGetProfileStatsInput.Type;

export const StatsGetProfileTokenStatsInput = StatsGetProfileStatsInput;
export type StatsGetProfileTokenStatsInput = typeof StatsGetProfileTokenStatsInput.Type;

// ── Building blocks ──────────────────────────────────────────────────

// One day in the GitHub-style heatmap. `intensity` is a pre-bucketed 0–4 level so
// the client never has to know the count distribution. `weekday` is 0 (Sun)–6 (Sat).
export const ProfileHeatmapCell = Schema.Struct({
  day: TrimmedNonEmptyString,
  count: NonNegativeInt,
  weekday: Schema.Int,
  intensity: NonNegativeInt,
});
export type ProfileHeatmapCell = typeof ProfileHeatmapCell.Type;

export const ProfileSkillUsage = Schema.Struct({
  name: TrimmedNonEmptyString,
  displayName: TrimmedNonEmptyString,
  kind: Schema.Literals(["skill", "agent"]),
  runCount: NonNegativeInt,
});
export type ProfileSkillUsage = typeof ProfileSkillUsage.Type;

export const ProfileActivity = Schema.Struct({
  currentStreakDays: NonNegativeInt,
  longestStreakDays: NonNegativeInt,
  totalPromptsSent: NonNegativeInt,
  totalThreads: NonNegativeInt,
  promptsToday: NonNegativeInt,
  // Activity heatmap counts native user prompts per local day (same source as
  // totalPromptsSent), i.e. days the user actually used OmniMind.
  heatmapMetric: Schema.Literal("prompts"),
  heatmap: Schema.Array(ProfileHeatmapCell),
});
export type ProfileActivity = typeof ProfileActivity.Type;

export const ProfileActiveHours = Schema.Struct({
  startHour: Schema.NullOr(Schema.Int),
  endHour: Schema.NullOr(Schema.Int),
  turnCount: NonNegativeInt,
});
export type ProfileActiveHours = typeof ProfileActiveHours.Type;

export const ProfileInsights = Schema.Struct({
  topReasoning: Schema.NullOr(Schema.String),
  topReasoningPercent: Schema.NullOr(Schema.Number),
  skillsExplored: NonNegativeInt,
  totalSkillsUsed: NonNegativeInt,
});
export type ProfileInsights = typeof ProfileInsights.Type;

export const ProfileTimezone = Schema.Struct({
  utcOffsetMinutes: Schema.Int,
  today: TrimmedNonEmptyString,
});
export type ProfileTimezone = typeof ProfileTimezone.Type;

export const ProfileCoverage = Schema.Literals(["complete", "partial", "unavailable"]);
export type ProfileCoverage = typeof ProfileCoverage.Type;

export const ProfileRecentModelUsage = Schema.Struct({
  rangeDays: Schema.Literal(30),
  totalTurns: NonNegativeInt,
  coverage: ProfileCoverage,
  models: Schema.Array(
    Schema.Struct({
      engine: Schema.Union([EngineKind, Schema.Literal("unknown")]),
      model: TrimmedNonEmptyString,
      turnCount: NonNegativeInt,
      percent: Schema.Number,
      kind: Schema.Literals(["model", "other", "unknown"]),
    }),
  ),
});
export type ProfileRecentModelUsage = typeof ProfileRecentModelUsage.Type;

export const ProfileWorkFocusEntry = Schema.Struct({
  title: TrimmedNonEmptyString,
  promptCount: NonNegativeInt,
  percent: Schema.Number,
  kind: Schema.Literals(["project", "other"]),
});
export type ProfileWorkFocusEntry = typeof ProfileWorkFocusEntry.Type;

export const ProfileWorkFocus = Schema.Struct({
  totalPrompts: NonNegativeInt,
  entries: Schema.Array(ProfileWorkFocusEntry),
});
export type ProfileWorkFocus = typeof ProfileWorkFocus.Type;

// ── Aggregate result ─────────────────────────────────────────────────

export const ProfileStats = Schema.Struct({
  generatedAt: IsoDateTime,
  timezone: ProfileTimezone,
  activity: ProfileActivity,
  activeHours: ProfileActiveHours,
  recentModelUsage: ProfileRecentModelUsage,
  workFocus: ProfileWorkFocus,
  insights: ProfileInsights,
  skills: Schema.Array(ProfileSkillUsage),
});
export type ProfileStats = typeof ProfileStats.Type;

export const StatsGetProfileStatsResult = ProfileStats;
export type StatsGetProfileStatsResult = typeof StatsGetProfileStatsResult.Type;

// Token totals come from OmniMind's projected context-window updates. `available`
// is false when the DB has not recorded token totals yet.
export const ProfileTokenStats = Schema.Struct({
  available: Schema.Boolean,
  lifetimeTotalTokens: Schema.NullOr(NonNegativeInt),
  peakDayTokens: Schema.NullOr(NonNegativeInt),
  peakDay: Schema.NullOr(TrimmedNonEmptyString),
  heatmapMetric: Schema.Literal("tokens"),
  heatmap: Schema.Array(ProfileHeatmapCell),
  recentTokenUsage: Schema.Struct({
    rangeDays: Schema.Literal(30),
    startDay: TrimmedNonEmptyString,
    endDay: TrimmedNonEmptyString,
    cachedInputTokens: NonNegativeInt,
    uncachedInputTokens: NonNegativeInt,
    outputTokens: NonNegativeInt,
    cacheHitPercent: Schema.NullOr(Schema.Number),
    coverage: ProfileCoverage,
    unavailableProviders: Schema.Array(EngineKind),
    days: Schema.Array(
      Schema.Struct({
        day: TrimmedNonEmptyString,
        cachedInputTokens: NonNegativeInt,
        uncachedInputTokens: NonNegativeInt,
        outputTokens: NonNegativeInt,
      }),
    ),
  }),
});
export type ProfileTokenStats = typeof ProfileTokenStats.Type;

export const StatsGetProfileTokenStatsResult = ProfileTokenStats;
export type StatsGetProfileTokenStatsResult = typeof StatsGetProfileTokenStatsResult.Type;
