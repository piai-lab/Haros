// FILE: profileStats.ts
// Purpose: Compute Profile-page stats from OmniMind's local projection DB only.
// The share card never reads provider archives or cloud services for metrics.
// Stats are lifetime numbers: deleting a thread purges its rows but snapshots
// the aggregates into profile_stats_deleted_* first (profileStatsArchive.ts),
// and every query here merges live projections with those archived aggregates.
// Layer: server stats query service (SqlClient + ServerConfig).

import type {
  ProfileStats,
  ProfileTokenStats,
  ProviderKind,
  StatsGetProfileStatsInput,
  StatsGetProfileTokenStatsInput,
} from "@omnimind/contracts";
import { PROVIDER_KINDS } from "@omnimind/contracts";
import { isBuiltInComposerSlashCommandName } from "@omnimind/shared/composerSlashCommands";
import { Effect, Layer, ServiceMap } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

const HEATMAP_WINDOW_DAYS = 274; // ~9 months, GitHub-style contribution grid.
const RECENT_USAGE_WINDOW_DAYS = 30;
const SKILL_RESULT_LIMIT = 12;
const PROVIDER_KIND_SET = new Set<ProviderKind>(PROVIDER_KINDS);

type HeatmapCell = ProfileStats["activity"]["heatmap"][number];
type SkillUsage = ProfileStats["skills"][number];

interface CountRow {
  readonly count: number;
}

interface PromptActivityRow extends CountRow {
  readonly day: string | null;
  readonly hour: number | null;
}

interface TurnInsightRow extends CountRow {
  readonly provider: string | null;
  readonly model: string | null;
  readonly reasoning: string | null;
}

interface SkillUsageMessageRow {
  readonly messageId: string | null;
  readonly text: string | null;
  readonly skillsJson: string | null;
  readonly mentionsJson: string | null;
}

// Pre-aggregated usage snapshotted from purged threads (profile_stats_deleted_skills).
interface ArchivedSkillUsageRow {
  readonly name: string | null;
  readonly kind: string | null;
  readonly runCount: number;
}

interface TokenDayRow {
  readonly day: string | null;
  readonly provider: string | null;
  readonly model: string | null;
  readonly tokens: number;
}

interface RecentTurnRow extends TurnInsightRow {
  readonly legacyIncomplete: number;
}

interface WorkFocusRow {
  readonly projectId: string | null;
  readonly title: string | null;
  readonly promptCount: number;
}

interface TokenBreakdownDayRow {
  readonly day: string | null;
  readonly provider: string | null;
  readonly cachedInputTokens: number;
  readonly uncachedInputTokens: number;
  readonly outputTokens: number;
}

type UsageKind = "skill" | "agent";

interface UsageCount {
  name: string;
  kind: UsageKind;
  runCount: number;
}

// ── Pure helpers ───────────────────────────────────────────────────────

// SQLite DATETIME() modifier that shifts UTC timestamps into the caller's LOCAL
// wall-clock time (for example "+02:00" / "-05:00").
export function sqliteModifierFromUtcOffsetMinutes(offsetMinutes: number): string {
  const safe = Number.isFinite(offsetMinutes) ? Math.trunc(offsetMinutes) : 0;
  const sign = safe < 0 ? "-" : "+";
  const abs = Math.abs(safe);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

function localToday(utcOffsetMinutes: number): string {
  return new Date(Date.now() + utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

function addUtcDays(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (date ?? 1) + delta))
    .toISOString()
    .slice(0, 10);
}

function recentDayKeys(today: string): string[] {
  const start = addUtcDays(today, -(RECENT_USAGE_WINDOW_DAYS - 1));
  return Array.from({ length: RECENT_USAGE_WINDOW_DAYS }, (_, index) => addUtcDays(start, index));
}

function num(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

const PROFILE_SKILL_NAME_TOKEN =
  "[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])?(?::[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])?)*";
const PROFILE_SKILL_TOKEN_REGEX = new RegExp(
  `(^|[\\s([{<])([$/])(${PROFILE_SKILL_NAME_TOKEN})(?=$|[\\s.,!?;)\\]}>])`,
  "giu",
);
const PROFILE_TRAILING_PROMPT_BLOCK_PATTERNS = [
  /\n*<pasted_text>\n[\s\S]*?\n<\/pasted_text>\s*$/u,
  /\n*<file_comments>\n[\s\S]*?\n<\/file_comments>\s*$/u,
  /\n*<terminal_context>\n[\s\S]*?\n<\/terminal_context>\s*$/u,
  /\n*<assistant_selection>\n[\s\S]*?\n<\/assistant_selection>\s*$/u,
] as const;

function normalizeUsageName(value: unknown): string | null {
  const name = nonEmptyString(value);
  if (!name) {
    return null;
  }
  const withoutPrefix = name.replace(/^[$/@]+/u, "").trim();
  return withoutPrefix.length > 0 ? withoutPrefix : null;
}

function usageKey(kind: UsageKind, name: string): string {
  return `${kind}\u0000${name.toLowerCase()}`;
}

function usageKindSortOrder(kind: UsageKind): number {
  return kind === "skill" ? 0 : 1;
}

function isObviousNonSkillDollarToken(name: string): boolean {
  return /^\d/u.test(name) || /^[A-Z_][A-Z0-9_]*$/u.test(name);
}

function stripProfileTrailingPromptBlocks(prompt: string): string {
  let visiblePrompt = prompt;
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const pattern of PROFILE_TRAILING_PROMPT_BLOCK_PATTERNS) {
      const nextPrompt = visiblePrompt.replace(pattern, "").replace(/\n+$/u, "");
      if (nextPrompt !== visiblePrompt) {
        visiblePrompt = nextPrompt;
        stripped = true;
        break;
      }
    }
  }
  return visiblePrompt;
}

function parseReferenceNames(json: string | null): string[] {
  const value = nonEmptyString(json);
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((entry) => {
      if (entry && typeof entry === "object" && "name" in entry) {
        const name = normalizeUsageName((entry as { readonly name?: unknown }).name);
        return name ? [name] : [];
      }
      return [];
    });
  } catch {
    return [];
  }
}

function extractTextSkillNames(text: string | null): string[] {
  const prompt = nonEmptyString(text);
  if (!prompt) {
    return [];
  }
  const visiblePrompt = stripProfileTrailingPromptBlocks(prompt);
  if (visiblePrompt.trim().length === 0) {
    return [];
  }

  const names: string[] = [];
  PROFILE_SKILL_TOKEN_REGEX.lastIndex = 0;
  for (const match of visiblePrompt.matchAll(PROFILE_SKILL_TOKEN_REGEX)) {
    const leadingBoundary = match[1] ?? "";
    const prefix = match[2] ?? "";
    const rawName = match[3] ?? "";
    // Serialized prompt blocks end with XML-style tags like </pasted_text>.
    // Those slashes are structural delimiters, not user-invoked slash skills.
    if (leadingBoundary === "<" && prefix === "/") {
      continue;
    }
    if (prefix === "/" && isBuiltInComposerSlashCommandName(rawName)) {
      continue;
    }

    const hasExplicitSkillPrefix = rawName.toLowerCase().startsWith("skill:");
    const normalizedRawName = rawName.toLowerCase().startsWith("skill:")
      ? rawName.slice("skill:".length)
      : rawName;
    const name = normalizeUsageName(normalizedRawName);
    if (name) {
      // `$...` also appears in shell snippets and prices. Keep the legacy
      // text backfill, but avoid the most common non-skill dollar tokens.
      if (prefix === "$" && !hasExplicitSkillPrefix && isObviousNonSkillDollarToken(name)) {
        continue;
      }
      names.push(name);
    }
  }
  return names;
}

// Builds profile skill rows from every stored OmniMind user message, plus the
// pre-aggregated counts snapshotted from purged threads. Structured references
// stay authoritative, while text tokens backfill older or partial rows.
export function aggregateProfileSkillUsageRows(
  rows: ReadonlyArray<SkillUsageMessageRow>,
  archivedRows: ReadonlyArray<ArchivedSkillUsageRow> = [],
): SkillUsage[] {
  const counts = new Map<string, UsageCount>();

  for (const row of rows) {
    const messageSkillCounts = new Map<
      string,
      { name: string; structuredCount: number; textCount: number }
    >();
    const messageAgentUsages = new Map<string, { name: string; kind: UsageKind }>();
    const addMessageSkillUsage = (rawName: string, source: "structured" | "text") => {
      const name = normalizeUsageName(rawName);
      if (!name) {
        return;
      }
      const key = usageKey("skill", name);
      const next = messageSkillCounts.get(key) ?? {
        name,
        structuredCount: 0,
        textCount: 0,
      };
      if (source === "structured") {
        next.structuredCount += 1;
      } else {
        next.textCount += 1;
      }
      messageSkillCounts.set(key, next);
    };
    const addMessageAgentUsage = (rawName: string) => {
      const name = normalizeUsageName(rawName);
      if (!name) {
        return;
      }
      const key = usageKey("agent", name);
      if (!messageAgentUsages.has(key)) {
        messageAgentUsages.set(key, { name, kind: "agent" });
      }
    };

    for (const name of parseReferenceNames(row.skillsJson)) {
      addMessageSkillUsage(name, "structured");
    }
    for (const name of extractTextSkillNames(row.text)) {
      addMessageSkillUsage(name, "text");
    }
    for (const name of parseReferenceNames(row.mentionsJson)) {
      addMessageAgentUsage(name);
    }

    for (const usage of messageSkillCounts.values()) {
      // Selected skills can appear both as structured refs and visible text.
      // Count repeated user tokens, but do not double-count the structured echo.
      const increment = Math.max(usage.structuredCount, usage.textCount);
      if (increment <= 0) {
        continue;
      }
      const key = usageKey("skill", usage.name);
      const existing = counts.get(key);
      if (existing) {
        existing.runCount += increment;
      } else {
        counts.set(key, { name: usage.name, kind: "skill", runCount: increment });
      }
    }

    for (const usage of messageAgentUsages.values()) {
      const key = usageKey(usage.kind, usage.name);
      const existing = counts.get(key);
      if (existing) {
        existing.runCount += 1;
      } else {
        counts.set(key, { ...usage, runCount: 1 });
      }
    }
  }

  for (const row of archivedRows) {
    const name = normalizeUsageName(row.name);
    const kind: UsageKind | null = row.kind === "skill" || row.kind === "agent" ? row.kind : null;
    const runCount = Math.trunc(num(row.runCount));
    if (!name || !kind || runCount <= 0) {
      continue;
    }
    const key = usageKey(kind, name);
    const existing = counts.get(key);
    if (existing) {
      existing.runCount += runCount;
    } else {
      counts.set(key, { name, kind, runCount });
    }
  }

  return [...counts.values()]
    .toSorted(
      (left, right) =>
        right.runCount - left.runCount ||
        usageKindSortOrder(left.kind) - usageKindSortOrder(right.kind) ||
        left.name.localeCompare(right.name),
    )
    .map((row) => ({
      name: row.name,
      displayName: `${row.kind === "skill" ? "$" : "@"}${row.name}`,
      kind: row.kind,
      runCount: row.runCount,
    }));
}

function addDaysIso(day: string, delta: number): string {
  const [year = 1970, month = 1, date = 1] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date) + delta * 86_400_000).toISOString().slice(0, 10);
}

function weekdayOf(day: string): number {
  const [year = 1970, month = 1, date = 1] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).getUTCDay();
}

// Number of non-empty intensity levels (1–4); level 0 is reserved for empty days.
const HEATMAP_LEVELS = 4;

// Rank a day against the distribution of active days instead of against the window
// max. Percent-of-max bucketing collapses on skewed data — token counts routinely
// span orders of magnitude, so one spike day drops every other day below 25% of the
// max and flattens the entire grid to level 1. Ranking spreads active days across
// all four levels regardless of scale, and ties share a level (a window where every
// active day is identical renders uniformly at level 4).
export function heatmapIntensity(count: number, sortedActiveCounts: readonly number[]): number {
  if (count <= 0 || sortedActiveCounts.length === 0) {
    return 0;
  }
  // Days with a count <= this one, i.e. this day's rank in the active-day distribution.
  let low = 0;
  let high = sortedActiveCounts.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (sortedActiveCounts[mid]! <= count) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  const level = Math.ceil((low * HEATMAP_LEVELS) / sortedActiveCounts.length);
  return Math.min(HEATMAP_LEVELS, Math.max(1, level));
}

function percent1(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function exactPercentageShares(counts: readonly number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return counts.map(() => 0);
  let allocated = 0;
  return counts.map((count, index) => {
    if (index === counts.length - 1) {
      return Math.max(0, Math.round((100 - allocated) * 10) / 10);
    }
    const percent = percent1(count, total);
    allocated += percent;
    return percent;
  });
}

function compareNullableText(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  return (left ?? "").localeCompare(right ?? "");
}

function normalizeProviderKind(value: unknown): ProviderKind | "unknown" {
  const provider = nonEmptyString(value);
  return provider && PROVIDER_KIND_SET.has(provider as ProviderKind)
    ? (provider as ProviderKind)
    : "unknown";
}

interface TokenActivityAggregate {
  readonly tokensByDay: Map<string, number>;
  readonly lifetime: number;
}

function aggregateTokenActivity(rows: ReadonlyArray<TokenDayRow>): TokenActivityAggregate {
  const tokensByDay = new Map<string, number>();
  let lifetime = 0;
  for (const row of rows) {
    const day = nonEmptyString(row.day);
    const tokens = num(row.tokens);
    if (!day || tokens <= 0) {
      continue;
    }
    tokensByDay.set(day, (tokensByDay.get(day) ?? 0) + tokens);
    lifetime += tokens;
  }
  return { tokensByDay, lifetime };
}

function computeStreaks(
  activeDaysAsc: ReadonlyArray<string>,
  todayKey: string,
): { current: number; longest: number } {
  if (activeDaysAsc.length === 0) {
    return { current: 0, longest: 0 };
  }
  const set = new Set(activeDaysAsc);

  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of activeDaysAsc) {
    run = previous && addDaysIso(previous, 1) === day ? run + 1 : 1;
    if (run > longest) {
      longest = run;
    }
    previous = day;
  }

  // Keep the streak alive through the current local day: if yesterday was active
  // but today is still empty, the user still has today to extend it.
  let anchor: string | null = set.has(todayKey)
    ? todayKey
    : set.has(addDaysIso(todayKey, -1))
      ? addDaysIso(todayKey, -1)
      : null;
  let current = 0;
  while (anchor && set.has(anchor)) {
    current += 1;
    anchor = addDaysIso(anchor, -1);
  }

  return { current, longest };
}

// Rolling 6-month window ending today.
function buildHeatmap(countByDay: ReadonlyMap<string, number>, todayKey: string): HeatmapCell[] {
  const windowStart = addDaysIso(todayKey, -(HEATMAP_WINDOW_DAYS - 1));

  const activeCounts: number[] = [];
  for (const [day, count] of countByDay) {
    if (day >= windowStart && day <= todayKey && count > 0) {
      activeCounts.push(count);
    }
  }
  activeCounts.sort((left, right) => left - right);

  const heatmap: HeatmapCell[] = [];
  for (let offset = 0; offset < HEATMAP_WINDOW_DAYS; offset += 1) {
    const day = addDaysIso(windowStart, offset);
    const count = countByDay.get(day) ?? 0;
    heatmap.push({
      day,
      count,
      weekday: weekdayOf(day),
      intensity: heatmapIntensity(count, activeCounts),
    });
  }
  return heatmap;
}

// ── Shared SQL ─────────────────────────────────────────────────────────

// Maps every turn to the provider/model selected when it was started: turn-start
// events carry the pending messageId, which projection_turns links back to the
// turn_id that token activities reference. Shared by the live token stats query
// and the delete-time archive snapshot so both attribute token deltas the same
// way. Pass `scope` to restrict the CTE to a single thread (archive path).
export function turnModelSelectionCte(
  sql: SqlClient.SqlClient,
  scope?: { readonly threadId: string },
) {
  const turnThreadMatch = scope
    ? sql`${scope.threadId}`
    : sql.literal("json_extract(e.payload_json, '$.threadId')");
  const eventThreadScope = scope
    ? sql`AND COALESCE(json_extract(e.payload_json, '$.threadId'), e.stream_id) = ${scope.threadId}`
    : sql.literal("");
  return sql`
    SELECT
      pt.thread_id AS thread_id,
      pt.turn_id AS turn_id,
      MAX(json_extract(e.payload_json, '$.modelSelection.provider')) AS provider,
      MAX(json_extract(e.payload_json, '$.modelSelection.model')) AS model
    FROM orchestration_events e
    JOIN projection_turns pt
      ON pt.thread_id = ${turnThreadMatch}
     AND pt.pending_message_id = json_extract(e.payload_json, '$.messageId')
    WHERE e.event_type = 'thread.turn-start-requested'
      ${eventThreadScope}
      AND pt.turn_id IS NOT NULL
      AND json_type(e.payload_json, '$.modelSelection') = 'object'
    GROUP BY pt.thread_id, pt.turn_id
  `;
}

// ── Service ────────────────────────────────────────────────────────────

export interface ProfileStatsQueryShape {
  readonly getProfileStats: (
    input: StatsGetProfileStatsInput,
  ) => Effect.Effect<ProfileStats, unknown>;
  readonly getProfileTokenStats: (
    input: StatsGetProfileTokenStatsInput,
  ) => Effect.Effect<ProfileTokenStats, unknown>;
}

export class ProfileStatsQuery extends ServiceMap.Service<
  ProfileStatsQuery,
  ProfileStatsQueryShape
>()("omnimind/profileStats/ProfileStatsQuery") {}

const makeProfileStatsQuery = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  function profileStatsErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  function isMissingLegacyColumnError(error: unknown): boolean {
    return /\bno such column\b/iu.test(profileStatsErrorMessage(error));
  }

  // Imported legacy databases can briefly miss columns added after their original
  // lineage. Only that compatibility case degrades; real SQL failures should reach
  // the UI retry path instead of producing believable zero-stats.
  const legacyCompatibleQuery = <T>(
    operation: string,
    query: Effect.Effect<ReadonlyArray<T>, unknown>,
  ) =>
    query.pipe(
      Effect.catchIf(isMissingLegacyColumnError, (error) =>
        Effect.logWarning("profile stats query skipped due to missing legacy column", {
          error: profileStatsErrorMessage(error),
          operation,
        }).pipe(Effect.as([] as ReadonlyArray<T>)),
      ),
    );

  // Profile history counts all work ever done. Active and archived thread rows
  // feed these queries directly; explicit deletes purge the thread's rows AFTER
  // snapshotting the aggregates that matter into the profile_stats_deleted_*
  // tables (see profileStatsArchive.ts), so every query below merges current
  // projections with those deleted-thread aggregates.
  // ── SQL helpers ──────────────────────────────────────────────────────

  // Activity = days/hours the user actually sent a OmniMind prompt. One day-hour
  // grouping gives day totals, hour totals, and lifetime prompt count in TS.
  const queryPromptActivity = (tz: string) =>
    legacyCompatibleQuery(
      "profileStats.promptActivity",
      sql<PromptActivityRow>`
        WITH prompt_events AS (
          -- The thread join (no deleted_at filter) keeps archived and not-yet-
          -- purged rows counting while excluding orphan message rows of purged
          -- threads, which are already counted from the archive tables.
          SELECT m.created_at AS created_at
          FROM projection_thread_messages m
          JOIN projection_threads t ON t.thread_id = m.thread_id
          WHERE m.role = 'user'
            AND m.source = 'native'
            AND (m.dispatch_origin IS NULL OR m.dispatch_origin = 'user')
          UNION ALL
          SELECT d.created_at AS created_at
          FROM profile_stats_deleted_prompts d
        )
        SELECT
          STRFTIME('%Y-%m-%d', DATETIME(created_at, ${tz})) AS day,
          CAST(STRFTIME('%H', DATETIME(created_at, ${tz})) AS INTEGER) AS hour,
          COUNT(*) AS count
        FROM prompt_events
        GROUP BY day, hour
        ORDER BY day ASC, hour ASC
      `,
    );

  // Token usage for EVERY provider, straight from OmniMind's own DB (no external
  // ~/.codex/~/.claude archives, so it is provider-agnostic AND per-instance). Each
  // `context-window.updated` activity carries a running per-thread token counter;
  // the positive delta is the tokens processed in that step, bucketed by the
  // caller's local day. Deltas are attributed to the provider/model selected for
  // the turn that processed them (activity turn_id → turn's pending message →
  // turn-start modelSelection); the thread's current selection is only a fallback
  // for legacy rows, so switching models mid-thread keeps history accurate.
  // Counter scale: totalProcessedTokens is the preferred cumulative counter.
  // Some provider/model groups only emit usedTokens; keep those as separate
  // fallback series so a mixed-provider thread does not drop their tokens.
  const queryTokenActivity = (tz: string) =>
    legacyCompatibleQuery(
      "profileStats.tokenActivity",
      sql<TokenDayRow>`
        WITH turn_model AS (
          ${turnModelSelectionCte(sql)}
        ),
        ev AS (
          SELECT
            a.thread_id AS thread_id,
            STRFTIME('%Y-%m-%d', DATETIME(a.created_at, ${tz})) AS day,
            COALESCE(
              tm.provider,
              json_extract(a.payload_json, '$.provider'),
              CASE
                WHEN th.model_selection_json IS NOT NULL AND json_valid(th.model_selection_json)
                THEN json_extract(th.model_selection_json, '$.provider')
              END,
              'unknown'
            ) AS provider,
            COALESCE(
              tm.model,
              CASE
                WHEN th.model_selection_json IS NOT NULL
                  AND json_valid(th.model_selection_json)
                  AND (
                    json_extract(a.payload_json, '$.provider') IS NULL
                    OR json_extract(a.payload_json, '$.provider') =
                      json_extract(th.model_selection_json, '$.provider')
                  )
                THEN json_extract(th.model_selection_json, '$.model')
              END,
              'unknown'
            ) AS model,
            CAST(json_extract(a.payload_json, '$.totalProcessedTokens') AS INTEGER) AS tp,
            CAST(json_extract(a.payload_json, '$.usedTokens') AS INTEGER) AS ut,
            pm.dispatch_origin AS dispatch_origin,
            a.sequence AS sequence,
            a.created_at AS created_at,
            a.activity_id AS activity_id
          FROM projection_thread_activities a
          JOIN projection_threads th ON th.thread_id = a.thread_id
          LEFT JOIN turn_model tm
            ON tm.thread_id = a.thread_id
           AND tm.turn_id = a.turn_id
          LEFT JOIN projection_turns pt
            ON pt.thread_id = a.thread_id
           AND pt.turn_id = a.turn_id
          LEFT JOIN projection_thread_messages pm
            ON pm.thread_id = pt.thread_id
           AND pm.message_id = pt.pending_message_id
          WHERE a.kind = 'context-window.updated'
            AND COALESCE(
              json_extract(a.payload_json, '$.totalProcessedTokens'),
              json_extract(a.payload_json, '$.usedTokens')
            ) IS NOT NULL
        ),
        provider_model_scale AS (
          SELECT thread_id, provider, model, MAX(tp IS NOT NULL) AS has_cumulative
          FROM ev
          GROUP BY thread_id, provider, model
        ),
        cumulative_kept AS (
          SELECT
            day,
            provider,
            model,
            thread_id,
            tp AS tot,
            dispatch_origin,
            sequence,
            created_at,
            activity_id
          FROM ev
          WHERE tp IS NOT NULL
        ),
        cumulative_delta AS (
          SELECT
            day,
            provider,
            model,
            dispatch_origin,
            CASE
              WHEN previous_tot IS NULL OR tot < previous_tot THEN tot
              ELSE MAX(0, tot - previous_tot)
            END AS d
          FROM (
            SELECT
              day,
              provider,
              model,
              dispatch_origin,
              tot,
              LAG(tot) OVER (
                PARTITION BY thread_id
                ORDER BY
                  CASE WHEN sequence IS NULL THEN 0 ELSE 1 END ASC,
                  sequence ASC,
                  created_at ASC,
                  activity_id ASC
              ) AS previous_tot
            FROM cumulative_kept
          )
        ),
        used_only_kept AS (
          SELECT
            ev.day AS day,
            ev.provider AS provider,
            ev.model AS model,
            ev.thread_id AS thread_id,
            ev.ut AS tot,
            ev.dispatch_origin AS dispatch_origin,
            ev.sequence AS sequence,
            ev.created_at AS created_at,
            ev.activity_id AS activity_id
          FROM ev
          JOIN provider_model_scale pms
            ON pms.thread_id = ev.thread_id
           AND pms.provider = ev.provider
           AND pms.model = ev.model
          WHERE ev.tp IS NULL
            AND ev.ut IS NOT NULL
            AND NOT pms.has_cumulative
        ),
        used_only_delta AS (
          SELECT
            day,
            provider,
            model,
            dispatch_origin,
            CASE
              WHEN previous_tot IS NULL THEN tot
              WHEN tot < previous_tot
                AND (provider != previous_provider OR model != previous_model)
              THEN tot
              ELSE MAX(0, tot - previous_tot)
            END AS d
          FROM (
            SELECT
              day,
              provider,
              model,
              dispatch_origin,
              tot,
              LAG(tot) OVER (
                PARTITION BY thread_id
                ORDER BY
                  CASE WHEN sequence IS NULL THEN 0 ELSE 1 END ASC,
                  sequence ASC,
                  created_at ASC,
                  activity_id ASC
              ) AS previous_tot,
              LAG(provider) OVER (
                PARTITION BY thread_id
                ORDER BY
                  CASE WHEN sequence IS NULL THEN 0 ELSE 1 END ASC,
                  sequence ASC,
                  created_at ASC,
                  activity_id ASC
              ) AS previous_provider,
              LAG(model) OVER (
                PARTITION BY thread_id
                ORDER BY
                  CASE WHEN sequence IS NULL THEN 0 ELSE 1 END ASC,
                  sequence ASC,
                  created_at ASC,
                  activity_id ASC
              ) AS previous_model
            FROM used_only_kept
          )
        ),
        all_tokens AS (
          SELECT day, provider, model, d FROM cumulative_delta
          WHERE dispatch_origin IS NULL OR dispatch_origin = 'user'
          UNION ALL
          SELECT day, provider, model, d FROM used_only_delta
          WHERE dispatch_origin IS NULL OR dispatch_origin = 'user'
          UNION ALL
          SELECT
            STRFTIME('%Y-%m-%d', DATETIME(a.created_at, ${tz})) AS day,
            COALESCE(a.provider, 'unknown') AS provider,
            COALESCE(a.model, 'unknown') AS model,
            a.tokens AS d
          FROM profile_stats_deleted_tokens a
        )
        SELECT day, provider, model, SUM(d) AS tokens
        FROM all_tokens
        GROUP BY day, provider, model
      `,
    );

  const queryTotalThreads = () =>
    legacyCompatibleQuery(
      "profileStats.totalThreads",
      sql<CountRow>`
        SELECT
          (SELECT COUNT(*) FROM projection_threads)
          + (SELECT COUNT(*) FROM profile_stats_deleted_threads) AS count
      `,
    );

  const queryTurnInsights = () =>
    legacyCompatibleQuery(
      "profileStats.turnInsights",
      sql<TurnInsightRow>`
        WITH per_turn AS (
          SELECT
            CASE
              WHEN json_type(e.payload_json, '$.modelSelection') = 'object'
              THEN json_extract(e.payload_json, '$.modelSelection.provider')
              ELSE CASE
                WHEN t.model_selection_json IS NOT NULL AND json_valid(t.model_selection_json)
                THEN json_extract(t.model_selection_json, '$.provider')
              END
            END AS provider,
            CASE
              WHEN json_type(e.payload_json, '$.modelSelection') = 'object'
              THEN json_extract(e.payload_json, '$.modelSelection.model')
              ELSE CASE
                WHEN t.model_selection_json IS NOT NULL AND json_valid(t.model_selection_json)
                THEN json_extract(t.model_selection_json, '$.model')
              END
            END AS model,
            CASE
              WHEN json_type(e.payload_json, '$.modelSelection') = 'object'
              THEN COALESCE(
                json_extract(e.payload_json, '$.modelSelection.options.reasoningEffort'),
                json_extract(e.payload_json, '$.modelSelection.options.effort')
              )
              ELSE CASE
                WHEN t.model_selection_json IS NOT NULL AND json_valid(t.model_selection_json)
                THEN COALESCE(
                  json_extract(t.model_selection_json, '$.options.reasoningEffort'),
                  json_extract(t.model_selection_json, '$.options.effort')
                )
              END
            END AS reasoning
          FROM orchestration_events e
          JOIN projection_threads t
            ON t.thread_id = COALESCE(json_extract(e.payload_json, '$.threadId'), e.stream_id)
          LEFT JOIN projection_thread_messages um
            ON um.thread_id = COALESCE(json_extract(e.payload_json, '$.threadId'), e.stream_id)
           AND um.message_id = json_extract(e.payload_json, '$.messageId')
          WHERE e.event_type = 'thread.turn-start-requested'
            AND COALESCE(
              json_extract(e.payload_json, '$.dispatchOrigin'),
              um.dispatch_origin,
              CASE WHEN e.actor_kind = 'client' THEN 'user' END
            ) = 'user'
        ),
        turn_counts AS (
          SELECT provider, model, reasoning, COUNT(*) AS count
          FROM per_turn
          GROUP BY provider, model, reasoning
          UNION ALL
          SELECT d.provider, d.model, d.reasoning, COUNT(*) AS count
          FROM profile_stats_deleted_turn_events d
          JOIN profile_stats_deleted_threads t ON t.thread_id = d.thread_id
          WHERE t.turn_events_complete = 1
          GROUP BY d.provider, d.model, d.reasoning
          UNION ALL
          SELECT d.provider, d.model, d.reasoning, d.turn_count AS count
          FROM profile_stats_deleted_turns d
          JOIN profile_stats_deleted_threads t ON t.thread_id = d.thread_id
          WHERE t.turn_events_complete = 0
        )
        SELECT provider, model, reasoning, SUM(count) AS count
        FROM turn_counts
        GROUP BY provider, model, reasoning
        ORDER BY count DESC, provider ASC, model ASC, reasoning ASC
      `,
    );

  const querySkillUsageMessages = () =>
    sql<SkillUsageMessageRow>`
      SELECT
        m.message_id AS messageId,
        CASE
          WHEN m.text GLOB '*$[A-Za-z0-9]*'
            OR m.text GLOB '*/[A-Za-z0-9]*'
          THEN m.text
          ELSE NULL
        END AS text,
        m.skills_json AS skillsJson,
        m.mentions_json AS mentionsJson
      FROM projection_thread_messages m
      JOIN projection_threads t ON t.thread_id = m.thread_id
      WHERE m.role = 'user'
        AND m.source = 'native'
        AND (m.dispatch_origin IS NULL OR m.dispatch_origin = 'user')
        AND (
          (m.skills_json IS NOT NULL AND TRIM(m.skills_json) NOT IN ('', '[]'))
          OR (m.mentions_json IS NOT NULL AND TRIM(m.mentions_json) NOT IN ('', '[]'))
          OR m.text GLOB '*$[A-Za-z0-9]*'
          OR m.text GLOB '*/[A-Za-z0-9]*'
        )
      ORDER BY m.created_at ASC, m.message_id ASC
    `.pipe(
      Effect.catchIf(isMissingLegacyColumnError, (error) =>
        Effect.logWarning("profile stats skill usage fell back to text-only legacy scan", {
          error: profileStatsErrorMessage(error),
          operation: "profileStats.skillUsage",
        }).pipe(
          Effect.flatMap(
            () => sql<SkillUsageMessageRow>`
              SELECT
                m.message_id AS messageId,
                m.text AS text,
                NULL AS skillsJson,
                NULL AS mentionsJson
              FROM projection_thread_messages m
              JOIN projection_threads t ON t.thread_id = m.thread_id
              WHERE m.role = 'user'
                AND (
                  m.text GLOB '*$[A-Za-z0-9]*'
                  OR m.text GLOB '*/[A-Za-z0-9]*'
                )
              ORDER BY m.created_at ASC, m.message_id ASC
            `,
          ),
        ),
      ),
    );

  const queryArchivedSkillUsage = () =>
    legacyCompatibleQuery(
      "profileStats.archivedSkillUsage",
      sql<ArchivedSkillUsageRow>`
        SELECT name, kind, run_count AS runCount
        FROM profile_stats_deleted_skills
      `,
    );

  const queryRecentTurns = (tz: string, startDay: string, endDay: string) =>
    legacyCompatibleQuery(
      "profileStats.recentTurns",
      sql<RecentTurnRow>`
        WITH recent_turns AS (
          SELECT
            json_extract(e.payload_json, '$.modelSelection.provider') AS provider,
            json_extract(e.payload_json, '$.modelSelection.model') AS model,
            COALESCE(
              json_extract(e.payload_json, '$.modelSelection.options.reasoningEffort'),
              json_extract(e.payload_json, '$.modelSelection.options.effort')
            ) AS reasoning
          FROM orchestration_events e
          LEFT JOIN projection_thread_messages m
            ON m.thread_id = COALESCE(json_extract(e.payload_json, '$.threadId'), e.stream_id)
           AND m.message_id = json_extract(e.payload_json, '$.messageId')
          WHERE e.event_type = 'thread.turn-start-requested'
            AND COALESCE(
              json_extract(e.payload_json, '$.dispatchOrigin'),
              m.dispatch_origin,
              CASE WHEN e.actor_kind = 'client' THEN 'user' END
            ) = 'user'
            AND STRFTIME('%Y-%m-%d', DATETIME(e.occurred_at, ${tz})) BETWEEN ${startDay} AND ${endDay}
          UNION ALL
          SELECT d.provider, d.model, d.reasoning
          FROM profile_stats_deleted_turn_events d
          JOIN profile_stats_deleted_threads t ON t.thread_id = d.thread_id
          WHERE t.turn_events_complete = 1
            AND STRFTIME('%Y-%m-%d', DATETIME(d.created_at, ${tz})) BETWEEN ${startDay} AND ${endDay}
        )
        SELECT provider, model, reasoning, COUNT(*) AS count, 0 AS legacyIncomplete
        FROM recent_turns
        GROUP BY provider, model, reasoning
        ORDER BY count DESC, provider ASC, model ASC, reasoning ASC
      `,
    );

  const queryRecentLegacyTurnGap = (tz: string, startDay: string, endDay: string) =>
    legacyCompatibleQuery(
      "profileStats.recentLegacyTurnGap",
      sql<CountRow>`
        SELECT COUNT(DISTINCT d.thread_id) AS count
        FROM profile_stats_deleted_prompts d
        JOIN profile_stats_deleted_threads t ON t.thread_id = d.thread_id
        WHERE t.turn_events_complete = 0
          AND STRFTIME('%Y-%m-%d', DATETIME(d.created_at, ${tz})) BETWEEN ${startDay} AND ${endDay}
          AND EXISTS (
            SELECT 1 FROM profile_stats_deleted_turns x WHERE x.thread_id = d.thread_id
          )
      `,
    );

  const queryWorkFocus = () =>
    legacyCompatibleQuery(
      "profileStats.workFocus",
      sql<WorkFocusRow>`
        WITH prompts AS (
          SELECT t.project_id AS project_id, p.title AS title
          FROM projection_thread_messages m
          JOIN projection_threads t ON t.thread_id = m.thread_id
          LEFT JOIN projection_projects p ON p.project_id = t.project_id
          WHERE m.role = 'user'
            AND m.source = 'native'
            AND (m.dispatch_origin IS NULL OR m.dispatch_origin = 'user')
          UNION ALL
          SELECT d.project_id AS project_id, COALESCE(t.project_title, p.title) AS title
          FROM profile_stats_deleted_prompts d
          LEFT JOIN profile_stats_deleted_threads t ON t.thread_id = d.thread_id
          LEFT JOIN projection_projects p ON p.project_id = d.project_id
        )
        SELECT project_id AS projectId, title, COUNT(*) AS promptCount
        FROM prompts
        GROUP BY project_id, title
        ORDER BY promptCount DESC, title ASC
      `,
    );

  const queryRecentTokenBreakdown = (tz: string, startDay: string, endDay: string) =>
    legacyCompatibleQuery(
      "profileStats.recentTokenBreakdown",
      sql<TokenBreakdownDayRow>`
        WITH known AS (
          SELECT
            a.thread_id,
            a.created_at,
            a.sequence,
            a.activity_id,
            COALESCE(json_extract(a.payload_json, '$.provider'), 'unknown') AS provider,
            pm.dispatch_origin,
            CAST(json_extract(a.payload_json, '$.totalTokenBreakdown.cachedInputTokens') AS INTEGER) AS cached,
            CAST(json_extract(a.payload_json, '$.totalTokenBreakdown.uncachedInputTokens') AS INTEGER) AS uncached,
            CAST(json_extract(a.payload_json, '$.totalTokenBreakdown.outputTokens') AS INTEGER) AS output
          FROM projection_thread_activities a
          JOIN projection_threads t ON t.thread_id = a.thread_id
          LEFT JOIN projection_turns pt
            ON pt.thread_id = a.thread_id AND pt.turn_id = a.turn_id
          LEFT JOIN projection_thread_messages pm
            ON pm.thread_id = pt.thread_id AND pm.message_id = pt.pending_message_id
          WHERE a.kind = 'context-window.updated'
            AND json_extract(a.payload_json, '$.totalTokenBreakdown.cachedInputTokens') IS NOT NULL
            AND json_extract(a.payload_json, '$.totalTokenBreakdown.uncachedInputTokens') IS NOT NULL
            AND json_extract(a.payload_json, '$.totalTokenBreakdown.outputTokens') IS NOT NULL
        ),
        deltas AS (
          SELECT
            STRFTIME('%Y-%m-%d', DATETIME(created_at, ${tz})) AS day,
            provider,
            dispatch_origin,
            CASE WHEN previous_cached IS NULL OR cached < previous_cached
              THEN cached ELSE MAX(0, cached - previous_cached) END AS cached_delta,
            CASE WHEN previous_uncached IS NULL OR uncached < previous_uncached
              THEN uncached ELSE MAX(0, uncached - previous_uncached) END AS uncached_delta,
            CASE WHEN previous_output IS NULL OR output < previous_output
              THEN output ELSE MAX(0, output - previous_output) END AS output_delta
          FROM (
            SELECT *,
              LAG(cached) OVER token_order AS previous_cached,
              LAG(uncached) OVER token_order AS previous_uncached,
              LAG(output) OVER token_order AS previous_output
            FROM known
            WINDOW token_order AS (
              PARTITION BY thread_id
              ORDER BY CASE WHEN sequence IS NULL THEN 0 ELSE 1 END ASC,
                sequence ASC, created_at ASC, activity_id ASC
            )
          )
        ),
        all_rows AS (
          SELECT day, provider, cached_delta AS cached, uncached_delta AS uncached, output_delta AS output
          FROM deltas
          WHERE (dispatch_origin IS NULL OR dispatch_origin = 'user')
            AND day BETWEEN ${startDay} AND ${endDay}
          UNION ALL
          SELECT
            STRFTIME('%Y-%m-%d', DATETIME(d.created_at, ${tz})) AS day,
            COALESCE(d.provider, 'unknown') AS provider,
            d.cached_input_tokens AS cached,
            d.uncached_input_tokens AS uncached,
            d.output_tokens AS output
          FROM profile_stats_deleted_tokens d
          WHERE d.cached_input_tokens IS NOT NULL
            AND d.uncached_input_tokens IS NOT NULL
            AND d.output_tokens IS NOT NULL
            AND STRFTIME('%Y-%m-%d', DATETIME(d.created_at, ${tz})) BETWEEN ${startDay} AND ${endDay}
        )
        SELECT day, provider,
          SUM(cached) AS cachedInputTokens,
          SUM(uncached) AS uncachedInputTokens,
          SUM(output) AS outputTokens
        FROM all_rows
        GROUP BY day, provider
        ORDER BY day ASC, provider ASC
      `,
    );

  const queryRecentUnknownTokenBreakdown = (tz: string, startDay: string, endDay: string) =>
    legacyCompatibleQuery(
      "profileStats.recentUnknownTokenBreakdown",
      sql<CountRow>`
        SELECT (
          SELECT COUNT(*)
          FROM projection_thread_activities a
          JOIN projection_threads t ON t.thread_id = a.thread_id
          LEFT JOIN projection_turns pt
            ON pt.thread_id = a.thread_id AND pt.turn_id = a.turn_id
          LEFT JOIN projection_thread_messages pm
            ON pm.thread_id = pt.thread_id AND pm.message_id = pt.pending_message_id
          WHERE a.kind = 'context-window.updated'
            AND (pm.dispatch_origin IS NULL OR pm.dispatch_origin = 'user')
            AND COALESCE(
              json_extract(a.payload_json, '$.totalProcessedTokens'),
              json_extract(a.payload_json, '$.usedTokens')
            ) IS NOT NULL
            AND (
              json_extract(a.payload_json, '$.totalTokenBreakdown.cachedInputTokens') IS NULL
              OR json_extract(a.payload_json, '$.totalTokenBreakdown.uncachedInputTokens') IS NULL
              OR json_extract(a.payload_json, '$.totalTokenBreakdown.outputTokens') IS NULL
            )
            AND STRFTIME('%Y-%m-%d', DATETIME(a.created_at, ${tz})) BETWEEN ${startDay} AND ${endDay}
        ) + (
          SELECT COUNT(*)
          FROM profile_stats_deleted_tokens d
          WHERE (
            d.cached_input_tokens IS NULL
            OR d.uncached_input_tokens IS NULL
            OR d.output_tokens IS NULL
          )
          AND STRFTIME('%Y-%m-%d', DATETIME(d.created_at, ${tz})) BETWEEN ${startDay} AND ${endDay}
        ) AS count
      `,
    );

  // ── Result builders ─────────────────────────────────────────────────

  const getProfileStats = (
    input: StatsGetProfileStatsInput,
  ): Effect.Effect<ProfileStats, unknown> =>
    Effect.gen(function* () {
      const tz = sqliteModifierFromUtcOffsetMinutes(input.utcOffsetMinutes);
      const todayKey = localToday(input.utcOffsetMinutes);
      const recentDays = recentDayKeys(todayKey);
      const recentStartDay = recentDays[0]!;

      const promptActivityRows = yield* queryPromptActivity(tz);
      const totalThreadRows = yield* queryTotalThreads();
      const turnInsightRows = yield* queryTurnInsights();
      const skillMessageRows = yield* querySkillUsageMessages();
      const archivedSkillRows = yield* queryArchivedSkillUsage();
      const recentTurnRows = yield* queryRecentTurns(tz, recentStartDay, todayKey);
      const recentLegacyGapRows = yield* queryRecentLegacyTurnGap(tz, recentStartDay, todayKey);
      const workFocusRows = yield* queryWorkFocus();

      // ── Activity / heatmap / streaks ──
      const countByDay = new Map<string, number>();
      const hourCounts = Array.from({ length: 24 }, () => 0);
      let totalPromptsSent = 0;
      for (const row of promptActivityRows) {
        const day = nonEmptyString(row.day);
        const count = num(row.count);
        if (day) {
          countByDay.set(day, (countByDay.get(day) ?? 0) + count);
        }
        const hour = ((Math.trunc(num(row.hour)) % 24) + 24) % 24;
        hourCounts[hour] = (hourCounts[hour] ?? 0) + count;
        totalPromptsSent += count;
      }
      const heatmap = buildHeatmap(countByDay, todayKey);
      const activeDaysAsc = [...countByDay.entries()]
        .filter(([, count]) => count > 0)
        .map(([day]) => day)
        .toSorted();
      const { current: currentStreakDays, longest: longestStreakDays } = computeStreaks(
        activeDaysAsc,
        todayKey,
      );

      // ── Most active rolling two-hour local window ──
      const totalHourTurns = hourCounts.reduce((sum, value) => sum + value, 0);
      let bestHour: number | null = null;
      let bestHourCount = 0;
      if (totalHourTurns > 0) {
        for (let hour = 0; hour < 24; hour += 1) {
          const hourCount = (hourCounts[hour] ?? 0) + (hourCounts[(hour + 1) % 24] ?? 0);
          if (hourCount > bestHourCount) {
            bestHourCount = hourCount;
            bestHour = hour;
          }
        }
      }
      const activeHours =
        bestHour === null
          ? { startHour: null, endHour: null, turnCount: 0 }
          : {
              startHour: bestHour,
              endHour: (bestHour + 2) % 24,
              turnCount: bestHourCount,
            };

      const recentModelCounts = new Map<
        string,
        {
          provider: ProviderKind | "unknown";
          model: string;
          count: number;
          kind: "model" | "unknown";
        }
      >();
      let recentTotalTurns = 0;
      for (const row of recentTurnRows) {
        const count = num(row.count);
        recentTotalTurns += count;
        const provider = normalizeProviderKind(row.provider);
        const model = nonEmptyString(row.model);
        const kind = model ? "model" : "unknown";
        const key = `${provider}\u0000${model ?? ""}`;
        const existing = recentModelCounts.get(key);
        if (existing) existing.count += count;
        else recentModelCounts.set(key, { provider, model: model ?? "unknown", count, kind });
      }
      const recentRows = [...recentModelCounts.values()].toSorted(
        (left, right) => right.count - left.count || left.model.localeCompare(right.model),
      );
      const knownRecentRows = recentRows.filter((row) => row.kind === "model");
      const unknownRecentTurns = recentRows
        .filter((row) => row.kind === "unknown")
        .reduce((sum, row) => sum + row.count, 0);
      const visibleKnownRows = knownRecentRows.slice(0, 5);
      const otherRecentTurns = knownRecentRows.slice(5).reduce((sum, row) => sum + row.count, 0);
      const recentModelBuckets = [
        ...visibleKnownRows.map((row) => ({
          provider: row.provider,
          model: row.model,
          turnCount: row.count,
          kind: "model" as const,
        })),
        ...(otherRecentTurns > 0
          ? [
              {
                provider: "unknown" as const,
                model: "other",
                turnCount: otherRecentTurns,
                kind: "other" as const,
              },
            ]
          : []),
        ...(unknownRecentTurns > 0
          ? [
              {
                provider: "unknown" as const,
                model: "unknown",
                turnCount: unknownRecentTurns,
                kind: "unknown" as const,
              },
            ]
          : []),
      ];
      const recentModelPercents = exactPercentageShares(
        recentModelBuckets.map((entry) => entry.turnCount),
      );
      const recentModels: ProfileStats["recentModelUsage"]["models"] = recentModelBuckets.map(
        (entry, index) => ({
          ...entry,
          percent: recentModelPercents[index]!,
        }),
      );
      const recentModelCoverage =
        recentTotalTurns === 0
          ? "unavailable"
          : num(recentLegacyGapRows[0]?.count) > 0 || unknownRecentTurns > 0
            ? "partial"
            : "complete";

      const focusTotal = workFocusRows.reduce((sum, row) => sum + num(row.promptCount), 0);
      const namedFocusRows = workFocusRows
        .filter((row) => nonEmptyString(row.title))
        .toSorted(
          (left, right) =>
            num(right.promptCount) - num(left.promptCount) ||
            (nonEmptyString(left.title) ?? "").localeCompare(nonEmptyString(right.title) ?? ""),
        );
      const topFocusRows = namedFocusRows.slice(0, 2);
      const topFocusPrompts = topFocusRows.reduce((sum, row) => sum + num(row.promptCount), 0);
      const workFocusBuckets = [
        ...topFocusRows.map((row) => ({
          title: nonEmptyString(row.title)!,
          promptCount: num(row.promptCount),
          kind: "project" as const,
        })),
        ...(focusTotal > topFocusPrompts
          ? [
              {
                title: "other",
                promptCount: focusTotal - topFocusPrompts,
                kind: "other" as const,
              },
            ]
          : []),
      ];
      const workFocusPercents = exactPercentageShares(
        workFocusBuckets.map((entry) => entry.promptCount),
      );
      const workFocus: ProfileStats["workFocus"] = {
        totalPrompts: focusTotal,
        entries: workFocusBuckets.map((entry, index) => ({
          ...entry,
          percent: workFocusPercents[index]!,
        })),
      };

      const reasoningCounts = new Map<string, { readonly reasoning: string; count: number }>();

      for (const row of turnInsightRows) {
        const count = num(row.count);
        const reasoning = nonEmptyString(row.reasoning);
        if (reasoning) {
          const existingReasoning = reasoningCounts.get(reasoning);
          if (existingReasoning) {
            existingReasoning.count += count;
          } else {
            reasoningCounts.set(reasoning, { reasoning, count });
          }
        }
      }

      const reasoningRows = [...reasoningCounts.values()].toSorted(
        (left, right) =>
          right.count - left.count || compareNullableText(left.reasoning, right.reasoning),
      );
      const totalReasonedSelections = reasoningRows.reduce((sum, row) => sum + num(row.count), 0);
      const topReasoningRow = reasoningRows[0];
      const topReasoning = topReasoningRow?.reasoning ?? null;
      // Denominator excludes null reasoning values; those turns had no reasoning option set.
      const topReasoningPercent =
        topReasoningRow && totalReasonedSelections > 0
          ? percent1(num(topReasoningRow.count), totalReasonedSelections)
          : null;

      // ── Skills and agent mentions ──
      const allSkillUsages = aggregateProfileSkillUsageRows(skillMessageRows, archivedSkillRows);
      const skills = allSkillUsages.slice(0, SKILL_RESULT_LIMIT);
      const totalSkillsUsed = allSkillUsages.reduce((sum, row) => sum + row.runCount, 0);

      return {
        generatedAt: new Date().toISOString(),
        timezone: { utcOffsetMinutes: input.utcOffsetMinutes, today: todayKey },
        activity: {
          currentStreakDays,
          longestStreakDays,
          totalPromptsSent,
          totalThreads: num(totalThreadRows[0]?.count),
          promptsToday: countByDay.get(todayKey) ?? 0,
          heatmapMetric: "prompts",
          heatmap,
        },
        activeHours,
        recentModelUsage: {
          rangeDays: 30,
          totalTurns: recentTotalTurns,
          coverage: recentModelCoverage,
          models: recentModels,
        },
        workFocus,
        insights: {
          topReasoning,
          topReasoningPercent,
          skillsExplored: allSkillUsages.length,
          totalSkillsUsed,
        },
        skills,
      } satisfies ProfileStats;
    });

  const getProfileTokenStats = (
    input: StatsGetProfileTokenStatsInput,
  ): Effect.Effect<ProfileTokenStats, unknown> =>
    Effect.gen(function* () {
      const tz = sqliteModifierFromUtcOffsetMinutes(input.utcOffsetMinutes);
      const todayKey = localToday(input.utcOffsetMinutes);
      const recentDays = recentDayKeys(todayKey);
      const recentStartDay = recentDays[0]!;
      const rows = yield* queryTokenActivity(tz);
      const recentTurnRows = yield* queryRecentTurns(tz, recentStartDay, todayKey);
      const recentBreakdownRows = yield* queryRecentTokenBreakdown(tz, recentStartDay, todayKey);
      const recentUnknownRows = yield* queryRecentUnknownTokenBreakdown(
        tz,
        recentStartDay,
        todayKey,
      );
      const { tokensByDay, lifetime } = aggregateTokenActivity(rows);

      let peakDay: string | null = null;
      let peakDayTokens: number | null = null;
      for (const [day, tokens] of tokensByDay) {
        if (peakDayTokens === null || tokens > peakDayTokens) {
          peakDayTokens = tokens;
          peakDay = day;
        }
      }

      const available = lifetime > 0;

      const breakdownByDay = new Map<
        string,
        { cachedInputTokens: number; uncachedInputTokens: number; outputTokens: number }
      >();
      const breakdownProviders = new Set<ProviderKind>();
      for (const row of recentBreakdownRows) {
        const day = nonEmptyString(row.day);
        if (!day) continue;
        const current = breakdownByDay.get(day) ?? {
          cachedInputTokens: 0,
          uncachedInputTokens: 0,
          outputTokens: 0,
        };
        current.cachedInputTokens += num(row.cachedInputTokens);
        current.uncachedInputTokens += num(row.uncachedInputTokens);
        current.outputTokens += num(row.outputTokens);
        breakdownByDay.set(day, current);
        const provider = normalizeProviderKind(row.provider);
        if (provider !== "unknown") breakdownProviders.add(provider);
      }
      const recentTurnProviders = new Set<ProviderKind>();
      let recentTurnsHaveUnknownProvider = false;
      for (const row of recentTurnRows) {
        const provider = normalizeProviderKind(row.provider);
        if (provider === "unknown") recentTurnsHaveUnknownProvider = true;
        else recentTurnProviders.add(provider);
      }
      const recentUnavailableProviders = [...recentTurnProviders]
        .filter((provider) => !breakdownProviders.has(provider))
        .toSorted();
      const recentTokenDays = recentDays.map((day) => ({
        day,
        ...(breakdownByDay.get(day) ?? {
          cachedInputTokens: 0,
          uncachedInputTokens: 0,
          outputTokens: 0,
        }),
      }));
      const recentCachedInputTokens = recentTokenDays.reduce(
        (sum, day) => sum + day.cachedInputTokens,
        0,
      );
      const recentUncachedInputTokens = recentTokenDays.reduce(
        (sum, day) => sum + day.uncachedInputTokens,
        0,
      );
      const recentOutputTokens = recentTokenDays.reduce((sum, day) => sum + day.outputTokens, 0);
      const recentInputTokens = recentCachedInputTokens + recentUncachedInputTokens;
      const hasRecentBreakdown = recentBreakdownRows.length > 0;
      const recentTokenCoverage = !hasRecentBreakdown
        ? "unavailable"
        : num(recentUnknownRows[0]?.count) > 0 ||
            recentUnavailableProviders.length > 0 ||
            recentTurnsHaveUnknownProvider
          ? "partial"
          : "complete";

      return {
        available,
        lifetimeTotalTokens: available ? lifetime : null,
        peakDayTokens,
        peakDay,
        heatmapMetric: "tokens",
        heatmap: buildHeatmap(tokensByDay, todayKey),
        recentTokenUsage: {
          rangeDays: 30,
          startDay: recentStartDay,
          endDay: todayKey,
          cachedInputTokens: recentCachedInputTokens,
          uncachedInputTokens: recentUncachedInputTokens,
          outputTokens: recentOutputTokens,
          cacheHitPercent:
            recentInputTokens > 0 ? percent1(recentCachedInputTokens, recentInputTokens) : null,
          coverage: recentTokenCoverage,
          unavailableProviders: recentUnavailableProviders,
          days: recentTokenDays,
        },
      } satisfies ProfileTokenStats;
    });

  return { getProfileStats, getProfileTokenStats } satisfies ProfileStatsQueryShape;
});

export const ProfileStatsQueryLive = Layer.effect(ProfileStatsQuery, makeProfileStatsQuery);
