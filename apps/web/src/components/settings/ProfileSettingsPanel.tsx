// FILE: ProfileSettingsPanel.tsx
// Purpose: Settings → Usage insights. A low-chrome, local-first projection of
// activity, recent model choices, token/cache behavior, work focus and skills.

import { useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ProfileHeatmapCell, ProfileStats, ProfileTokenStats } from "@harnessos/contracts";

import { ModelIdentityIcon } from "~/components/ModelIdentityIcon";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { useI18n } from "~/i18n";
import { CentralIcon } from "~/lib/central-icons";
import { buildEngineSelection } from "~/providerModelOptions";
import {
  serverProfileStatsQueryOptions,
  serverProfileTokenStatsQueryOptions,
} from "~/lib/serverReactQuery";
import { ActivityHeatmap } from "../profile/ActivityHeatmap";
import { formatCompact, formatNumber, formatShortDate } from "../profile/profileFormatting";
import { selectProfileHeatmap } from "../profile/profileSelectors";
import { ShareDialog } from "../profile/ShareDialog";

export function ProfileSettingsPanel() {
  const { t } = useI18n();
  const coreQuery = useQuery(serverProfileStatsQueryOptions());
  const tokenQuery = useQuery(serverProfileTokenStatsQueryOptions());

  if (coreQuery.isPending) return <UsageInsightsSkeleton />;
  if (coreQuery.isError || !coreQuery.data) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-muted-foreground">{t("settings.profileLoadFailed")}</p>
        <Button variant="outline" size="sm" onClick={() => void coreQuery.refetch()}>
          {t("settings.tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <UsageInsightsContent
      stats={coreQuery.data}
      tokenStats={tokenQuery.data ?? null}
      tokensPending={tokenQuery.isPending}
    />
  );
}

function UsageInsightsContent({
  stats,
  tokenStats,
  tokensPending,
}: {
  readonly stats: ProfileStats;
  readonly tokenStats: ProfileTokenStats | null;
  readonly tokensPending: boolean;
}) {
  const { locale, t } = useI18n();
  const [shareOpen, setShareOpen] = useState(false);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const heatmap = selectProfileHeatmap(stats, tokenStats);
  const visibleSkills = skillsExpanded ? stats.skills : stats.skills.slice(0, 3);
  const peakDate = tokenStats?.peakDay
    ? (formatShortDate(tokenStats.peakDay, locale) ?? tokenStats.peakDay)
    : "—";

  const formatHeatmapTooltip = (cell: ProfileHeatmapCell) => {
    const date = formatShortDate(cell.day, locale) ?? cell.day;
    const unit =
      heatmap.unit === "tokens"
        ? t(cell.count === 1 ? "settings.tokenSingular" : "settings.tokenPlural")
        : t(cell.count === 1 ? "settings.promptSingular" : "settings.promptPlural");
    return cell.count <= 0
      ? t("settings.noHeatmapActivity", { unit, date })
      : t("settings.heatmapActivity", { count: formatCompact(cell.count), unit, date });
  };

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-medium tracking-tight text-foreground">
            {t("settings.profile")}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {t("settings.profileDescription")}
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setShareOpen(true)}>
          <CentralIcon name="share-os" />
          <span className="hidden sm:inline">{t("settings.exportUsageInsightsAction")}</span>
          <span className="sr-only sm:hidden">{t("settings.exportUsageInsightsAction")}</span>
        </Button>
      </header>

      <dl className="grid grid-cols-2 divide-x divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        <StatTile
          label={t("settings.lifetimeTokens")}
          value={tokensPending ? null : formatCompact(tokenStats?.lifetimeTotalTokens ?? null)}
        />
        <StatTile label={t("settings.peakDay")} value={tokensPending ? null : peakDate} />
        <StatTile
          label={t("settings.totalPrompts")}
          value={formatNumber(stats.activity.totalPromptsSent)}
        />
        <StatTile
          label={t("settings.currentStreak")}
          value={t("settings.dayPlural", {
            count: formatNumber(stats.activity.currentStreakDays),
          })}
        />
        <StatTile
          label={t("settings.longestStreak")}
          value={t("settings.dayPlural", {
            count: formatNumber(stats.activity.longestStreakDays),
          })}
        />
      </dl>

      <section className="flex min-w-0 flex-col gap-3" aria-labelledby="usage-activity-title">
        <h2 id="usage-activity-title" className="text-sm font-medium">
          {t("settings.activity")}
        </h2>
        {tokensPending ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : (
          <ActivityHeatmap
            cells={heatmap.cells}
            fill
            radius={5}
            gap={3}
            tooltip
            tooltipUnit={heatmap.unit}
            locale={locale}
            formatTooltip={formatHeatmapTooltip}
            showMonths
            monthsPosition="bottom"
          />
        )}
      </section>

      <ModelUsageSection stats={stats} />
      {tokensPending ? <TokenUsageSkeleton /> : <TokenUsageSection tokenStats={tokenStats} />}

      <section
        className="grid gap-8 border-t border-border/60 pt-8 sm:grid-cols-2 sm:gap-0"
        aria-label={t("settings.workPatterns")}
      >
        <div className="min-w-0 sm:pr-8">
          <h2 className="mb-4 text-sm font-medium">{t("settings.workFocus")}</h2>
          {stats.workFocus.entries.length > 0 ? (
            <div className="space-y-4">
              {stats.workFocus.entries.map((entry, index) => (
                <div key={`${entry.kind}:${entry.title}`} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">
                      {entry.kind === "other" ? t("settings.otherProjects") : entry.title}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {entry.percent}%
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[var(--info)]"
                      style={{
                        width: `${entry.percent}%`,
                        opacity: index === 0 ? 1 : index === 1 ? 0.68 : 0.42,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("settings.noWorkFocus")}</p>
          )}
        </div>
        <div className="min-w-0 sm:border-l sm:border-border/60 sm:pl-8">
          <h2 className="mb-4 text-sm font-medium">{t("settings.workStyle")}</h2>
          <dl className="space-y-3">
            <DefinitionRow
              label={t("settings.reasoningIntensity")}
              value={formatReasoning(stats, t)}
            />
            <DefinitionRow
              label={t("settings.mostActiveTime")}
              value={formatHourRange(
                stats.activeHours.startHour,
                stats.activeHours.endHour,
                locale,
              )}
            />
            <DefinitionRow
              label={t("settings.longestContinuousUse")}
              value={t("settings.dayPlural", {
                count: formatNumber(stats.activity.longestStreakDays),
              })}
            />
          </dl>
        </div>
      </section>

      <section
        className="flex min-w-0 flex-col gap-3 border-t border-border/60 pt-8"
        aria-labelledby="usage-skills-title"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="usage-skills-title" className="text-sm font-medium">
            {t("settings.skillsAndAgents")}
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t("settings.skillsSummary", {
              explored: formatNumber(stats.insights.skillsExplored),
              runs: formatNumber(stats.insights.totalSkillsUsed),
            })}
          </span>
        </div>
        {visibleSkills.length > 0 ? (
          <ul>
            {visibleSkills.map((skill) => (
              <li
                key={`${skill.kind}:${skill.name}`}
                className="flex min-h-10 items-center justify-between gap-4 border-t border-border/60 first:border-t-0"
              >
                <span className="flex min-w-0 items-center gap-2.5 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                    <CentralIcon
                      name={skill.kind === "agent" ? "agent" : "building-blocks"}
                      className="size-3.5"
                    />
                  </span>
                  <span className="truncate">{skill.displayName}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {t("settings.runCount", { count: formatNumber(skill.runCount) })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("settings.noSkillsOrAgents")}</p>
        )}
        {stats.skills.length > 3 ? (
          <button
            type="button"
            className="flex w-fit items-center gap-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={skillsExpanded}
            onClick={() => setSkillsExpanded((value) => !value)}
          >
            {skillsExpanded ? t("settings.collapse") : t("settings.viewAll")}
            <CentralIcon
              name={skillsExpanded ? "chevron-top-small" : "chevron-down-small"}
              className="size-3"
            />
          </button>
        ) : null}
      </section>

      <ShareDialog
        stats={stats}
        tokenStats={tokenStats}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}

function StatTile({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 px-3 py-3 text-center">
      <dt className="order-2 text-sm font-normal text-muted-foreground">{label}</dt>
      <dd className="order-1 m-0 max-w-full truncate text-sm font-normal tabular-nums text-foreground">
        {value === null ? <Skeleton className="h-4 w-12" /> : value}
      </dd>
    </div>
  );
}

function ModelUsageSection({ stats }: { readonly stats: ProfileStats }) {
  const { t } = useI18n();
  const usage = stats.recentModelUsage;
  return (
    <section
      className="flex min-w-0 flex-col gap-4 border-t border-border/60 pt-8"
      aria-labelledby="usage-model-title"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="usage-model-title" className="text-sm font-medium">
          {t("settings.modelUsage")}
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {t("settings.modelUsageMeta", { count: formatNumber(usage.totalTurns) })}
        </span>
      </div>
      {usage.models.length > 0 ? (
        <ul className="space-y-4">
          {usage.models.map((entry) => {
            const label =
              entry.kind === "other"
                ? t("settings.otherModels")
                : entry.kind === "unknown"
                  ? t("settings.unknownModel")
                  : entry.model;
            return (
              <Tooltip key={`${entry.kind}:${entry.engine}:${entry.model}`}>
                <TooltipTrigger
                  delay={0}
                  render={
                    <li
                      className="space-y-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      tabIndex={0}
                    />
                  }
                >
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      {entry.engine !== "unknown" && entry.kind === "model" ? (
                        <ModelIdentityIcon
                          selection={buildEngineSelection(entry.engine, entry.model)}
                          historical
                          className="size-3.5 shrink-0"
                        />
                      ) : (
                        <CentralIcon
                          name="chart-2"
                          className="size-3.5 shrink-0 text-muted-foreground"
                        />
                      )}
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {entry.percent}%
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[var(--info)]"
                      style={{ width: `${Math.max(2, entry.percent)}%` }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipPopup side="top">
                  {t("settings.modelTooltip", {
                    model: label,
                    count: formatNumber(entry.turnCount),
                    percent: entry.percent,
                  })}
                </TooltipPopup>
              </Tooltip>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("settings.noModelActivity")}</p>
      )}
      {usage.coverage === "partial" ? (
        <p className="text-xs text-muted-foreground">{t("settings.partialHistory")}</p>
      ) : null}
    </section>
  );
}

function TokenUsageSection({ tokenStats }: { readonly tokenStats: ProfileTokenStats | null }) {
  const { locale, t } = useI18n();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(29);
  const usage = tokenStats?.recentTokenUsage;
  if (!usage || usage.coverage === "unavailable") {
    return (
      <section className="flex flex-col gap-3 border-t border-border/60 pt-8">
        <h2 className="text-sm font-medium">{t("settings.tokenUsage")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.noComparableCacheData")}</p>
      </section>
    );
  }
  const maxTotal = Math.max(
    1,
    ...usage.days.map((day) => day.cachedInputTokens + day.uncachedInputTokens + day.outputTokens),
  );
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? usage.days.length - 1
          : event.key === "ArrowLeft"
            ? Math.max(0, index - 1)
            : Math.min(usage.days.length - 1, index + 1);
    setActiveIndex(next);
    refs.current[next]?.focus();
  };
  return (
    <section
      className="flex min-w-0 flex-col gap-4 border-t border-border/60 pt-8"
      aria-labelledby="usage-token-title"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="usage-token-title" className="text-sm font-medium">
          {t("settings.tokenUsage")}
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {usage.cacheHitPercent === null
            ? t("settings.cacheHitUnavailable")
            : t("settings.cacheHitMeta", {
                percent: usage.cacheHitPercent,
                cached: formatCompact(usage.cachedInputTokens),
                input: formatCompact(usage.cachedInputTokens + usage.uncachedInputTokens),
              })}
        </span>
      </div>
      <div
        className="grid h-44 items-end gap-1 border-b border-border/60 pb-2"
        style={{ gridTemplateColumns: `repeat(${usage.days.length}, minmax(0, 1fr))` }}
        role="group"
        aria-label={t("settings.tokenChartAria")}
      >
        {usage.days.map((day, index) => {
          const total = day.cachedInputTokens + day.uncachedInputTokens + day.outputTokens;
          const barHeight = total > 0 ? Math.max(3, (total / maxTotal) * 100) : 2;
          const cachedHeight = total > 0 ? (day.cachedInputTokens / total) * 100 : 0;
          const uncachedHeight = total > 0 ? (day.uncachedInputTokens / total) * 100 : 0;
          const outputHeight = total > 0 ? (day.outputTokens / total) * 100 : 0;
          const date = formatShortDate(day.day, locale) ?? day.day;
          return (
            <Tooltip key={day.day}>
              <TooltipTrigger
                delay={0}
                render={
                  <button
                    ref={(node) => {
                      refs.current[index] = node;
                    }}
                    type="button"
                    tabIndex={index === activeIndex ? 0 : -1}
                    className="group flex h-full min-w-0 items-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("settings.tokenDayAria", {
                      date,
                      total: formatNumber(total),
                      cached: formatNumber(day.cachedInputTokens),
                      uncached: formatNumber(day.uncachedInputTokens),
                      output: formatNumber(day.outputTokens),
                    })}
                    onFocus={() => setActiveIndex(index)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                  />
                }
              >
                <span
                  className="flex w-full min-w-0 flex-col-reverse overflow-hidden rounded-[2px] bg-muted/60 transition-opacity group-hover:opacity-80"
                  style={{ height: `${barHeight}%` }}
                >
                  <span
                    className="w-full bg-[var(--info)]"
                    style={{ height: `${cachedHeight}%` }}
                  />
                  <span
                    className="w-full bg-[color-mix(in_srgb,var(--info)_45%,transparent)]"
                    style={{ height: `${uncachedHeight}%` }}
                  />
                  <span
                    className="w-full bg-[color-mix(in_srgb,var(--color-text-foreground)_28%,transparent)]"
                    style={{ height: `${outputHeight}%` }}
                  />
                </span>
              </TooltipTrigger>
              <TooltipPopup side="top" className="min-w-52">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-6 border-b border-border/60 pb-2 font-medium">
                    <span>{date}</span>
                    <span className="tabular-nums">{formatNumber(total)}</span>
                  </div>
                  <TokenTooltipRow
                    label={t("settings.cachedInput")}
                    value={day.cachedInputTokens}
                    tone="cached"
                  />
                  <TokenTooltipRow
                    label={t("settings.uncachedInput")}
                    value={day.uncachedInputTokens}
                    tone="uncached"
                  />
                  <TokenTooltipRow
                    label={t("settings.outputTokens")}
                    value={day.outputTokens}
                    tone="output"
                  />
                </div>
              </TooltipPopup>
            </Tooltip>
          );
        })}
      </div>
      <div
        className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"
        aria-label={t("settings.tokenLegend")}
      >
        <LegendItem label={t("settings.cachedInput")} tone="cached" />
        <LegendItem label={t("settings.uncachedInput")} tone="uncached" />
        <LegendItem label={t("settings.outputTokens")} tone="output" />
      </div>
      {usage.coverage === "partial" ? (
        <p className="text-xs text-muted-foreground">{t("settings.partialHistory")}</p>
      ) : null}
    </section>
  );
}

function LegendItem({
  label,
  tone,
}: {
  readonly label: string;
  readonly tone: "cached" | "uncached" | "output";
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={toneClass(tone)} />
      {label}
    </span>
  );
}

function TokenTooltipRow({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone: "cached" | "uncached" | "output";
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <span className={toneClass(tone)} />
        {label}
      </span>
      <span className="tabular-nums">{formatNumber(value)}</span>
    </div>
  );
}

function toneClass(tone: "cached" | "uncached" | "output") {
  if (tone === "cached") return "size-1.5 rounded-[2px] bg-[var(--info)]";
  if (tone === "uncached")
    return "size-1.5 rounded-[2px] bg-[color-mix(in_srgb,var(--info)_45%,transparent)]";
  return "size-1.5 rounded-[2px] bg-[color-mix(in_srgb,var(--color-text-foreground)_28%,transparent)]";
}

function DefinitionRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="m-0 truncate text-right text-sm tabular-nums" title={value}>
        {value}
      </dd>
    </div>
  );
}

function formatHourRange(start: number | null, end: number | null, locale: "en" | "zh-CN") {
  if (start === null || end === null) return "—";
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  const at = (hour: number) => formatter.format(new Date(Date.UTC(2024, 0, 1, hour)));
  return `${at(start)}–${at(end)}`;
}

function formatReasoning(stats: ProfileStats, t: ReturnType<typeof useI18n>["t"]) {
  const value = stats.insights.topReasoning;
  if (!value) return "—";
  const normalized = value.toLowerCase();
  const key =
    normalized === "none" ||
    normalized === "low" ||
    normalized === "medium" ||
    normalized === "high" ||
    normalized === "xhigh" ||
    normalized === "ultra"
      ? (`settings.reasoning.${normalized}` as const)
      : null;
  const label = key ? t(key) : value;
  return stats.insights.topReasoningPercent === null
    ? label
    : `${label} · ${stats.insights.topReasoningPercent}%`;
}

function TokenUsageSkeleton() {
  return (
    <section className="flex flex-col gap-4 border-t border-border/60 pt-8">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-44 w-full rounded-lg" />
    </section>
  );
}

function UsageInsightsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-[72px] w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-52 w-full rounded-lg" />
      <Skeleton className="h-52 w-full rounded-lg" />
    </div>
  );
}
