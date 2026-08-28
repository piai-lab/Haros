// FILE: ShareCard.tsx
// Purpose: Fixed, identity-free Usage Insights summary rendered locally to PNG.

import { forwardRef, type ReactNode } from "react";
import type { ProfileStats, ProfileTokenStats } from "@harnessos/contracts";

import { OmniMindLogo } from "~/components/OmniMindLogo";
import { useI18n } from "~/i18n";
import { ActivityHeatmap, CARD_HEATMAP_INTENSITY_CLASSES } from "./ActivityHeatmap";
import { formatCompact, formatNumber, formatShortDate } from "./profileFormatting";

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 1600;

interface ShareCardProps {
  readonly stats: ProfileStats;
  readonly tokenStats: ProfileTokenStats | null;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { stats, tokenStats },
  ref,
) {
  const { locale, t } = useI18n();
  const recentTokens = tokenStats?.recentTokenUsage;
  const maxTokenDay = Math.max(
    1,
    ...(recentTokens?.days.map(
      (day) => day.cachedInputTokens + day.uncachedInputTokens + day.outputTokens,
    ) ?? [1]),
  );
  const tiles = [
    [formatCompact(tokenStats?.lifetimeTotalTokens ?? null), t("settings.lifetimeTokens")],
    [
      tokenStats?.peakDay
        ? (formatShortDate(tokenStats.peakDay, locale) ?? tokenStats.peakDay)
        : "—",
      t("settings.peakDay"),
    ],
    [formatNumber(stats.activity.totalPromptsSent), t("settings.totalPrompts")],
    [formatNumber(stats.activity.currentStreakDays), t("settings.currentStreak")],
    [formatNumber(stats.activity.longestStreakDays), t("settings.longestStreak")],
  ] as const;

  return (
    <div
      ref={ref}
      style={{ width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT }}
      className="flex flex-col overflow-hidden bg-background px-20 py-16 font-sans text-foreground"
    >
      <header className="flex items-start justify-between border-b border-border pb-10">
        <div>
          <h1 className="text-4xl font-medium tracking-tight">{t("settings.profile")}</h1>
          <p className="mt-3 text-xl text-muted-foreground">{t("settings.profileDescription")}</p>
        </div>
        <div className="flex items-center gap-3 text-foreground">
          <OmniMindLogo size={30} variant="flat" responsive={false} />
          <span className="text-2xl tracking-tight">OmniMind</span>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-5 overflow-hidden rounded-2xl border border-border">
        {tiles.map(([value, label]) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 border-r border-border px-4 py-5 text-center last:border-r-0"
          >
            <span className="text-xl tabular-nums">{value}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <ExportSection title={t("settings.activity")}>
        <ActivityHeatmap
          cells={tokenStats?.available ? tokenStats.heatmap : stats.activity.heatmap}
          cellSize={15}
          gap={4}
          radius={5}
          intensityClasses={CARD_HEATMAP_INTENSITY_CLASSES}
        />
      </ExportSection>

      <ExportSection
        title={t("settings.modelUsage")}
        meta={`${t("settings.modelUsageMeta", {
          count: formatNumber(stats.recentModelUsage.totalTurns),
        })}${stats.recentModelUsage.coverage === "partial" ? ` · ${t("settings.partialHistory")}` : ""}`}
      >
        <div className="space-y-5">
          {stats.recentModelUsage.models.slice(0, 7).map((entry) => {
            const label =
              entry.kind === "other"
                ? t("settings.otherModels")
                : entry.kind === "unknown"
                  ? t("settings.unknownModel")
                  : entry.model;
            return (
              <div key={`${entry.kind}:${entry.engine}:${entry.model}`} className="space-y-2">
                <div className="flex justify-between gap-8 text-lg">
                  <span className="truncate">{label}</span>
                  <span className="tabular-nums text-muted-foreground">{entry.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[var(--info)]"
                    style={{ width: `${entry.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ExportSection>

      <ExportSection
        title={t("settings.tokenUsage")}
        meta={
          recentTokens?.cacheHitPercent == null
            ? t("settings.cacheHitUnavailable")
            : t("settings.cacheHitMeta", {
                percent: recentTokens.cacheHitPercent,
                cached: formatCompact(recentTokens.cachedInputTokens),
                input: formatCompact(
                  recentTokens.cachedInputTokens + recentTokens.uncachedInputTokens,
                ),
              })
        }
      >
        <div className="flex h-48 items-end gap-2 border-b border-border pb-3">
          {recentTokens?.days.map((day) => {
            const total = day.cachedInputTokens + day.uncachedInputTokens + day.outputTokens;
            const height = total > 0 ? Math.max(3, (total / maxTokenDay) * 100) : 2;
            return (
              <div key={day.day} className="flex h-full min-w-0 flex-1 items-end">
                <div
                  className="flex w-full flex-col-reverse overflow-hidden rounded-sm bg-muted"
                  style={{ height: `${height}%` }}
                >
                  <div
                    className="bg-[var(--info)]"
                    style={{ height: `${total > 0 ? (day.cachedInputTokens / total) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-[color-mix(in_srgb,var(--info)_45%,transparent)]"
                    style={{
                      height: `${total > 0 ? (day.uncachedInputTokens / total) * 100 : 0}%`,
                    }}
                  />
                  <div
                    className="bg-[color-mix(in_srgb,var(--color-text-foreground)_28%,transparent)]"
                    style={{ height: `${total > 0 ? (day.outputTokens / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-8 text-sm text-muted-foreground">
          <ExportLegend label={t("settings.cachedInput")} className="bg-[var(--info)]" />
          <ExportLegend
            label={t("settings.uncachedInput")}
            className="bg-[color-mix(in_srgb,var(--info)_45%,transparent)]"
          />
          <ExportLegend
            label={t("settings.outputTokens")}
            className="bg-[color-mix(in_srgb,var(--color-text-foreground)_28%,transparent)]"
          />
        </div>
        {recentTokens?.coverage === "partial" ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("settings.partialHistory")}</p>
        ) : null}
      </ExportSection>

      <div className="mt-10 grid grid-cols-3 gap-10 border-t border-border pt-9">
        <div>
          <h2 className="mb-5 text-xl font-medium">{t("settings.workFocus")}</h2>
          <div className="space-y-4">
            {stats.workFocus.entries.map((entry) => (
              <div
                key={`${entry.kind}:${entry.title}`}
                className="flex justify-between gap-6 text-base"
              >
                <span className="truncate">
                  {entry.kind === "other" ? t("settings.otherProjects") : entry.title}
                </span>
                <span className="tabular-nums text-muted-foreground">{entry.percent}%</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-5 text-xl font-medium">{t("settings.workStyle")}</h2>
          <div className="space-y-4 text-base">
            <ExportDefinition
              label={t("settings.reasoningIntensity")}
              value={formatExportReasoning(stats, t)}
            />
            <ExportDefinition
              label={t("settings.mostActiveTime")}
              value={formatExportHourRange(
                stats.activeHours.startHour,
                stats.activeHours.endHour,
                locale,
              )}
            />
            <ExportDefinition
              label={t("settings.longestContinuousUse")}
              value={t("settings.dayPlural", {
                count: formatNumber(stats.activity.longestStreakDays),
              })}
            />
          </div>
        </div>
        <div>
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-medium">{t("settings.skillsAndAgents")}</h2>
            <span className="text-sm tabular-nums text-muted-foreground">
              {t("settings.skillsSummary", {
                explored: formatNumber(stats.skills.length),
                runs: formatNumber(stats.skills.reduce((sum, skill) => sum + skill.runCount, 0)),
              })}
            </span>
          </div>
          <div className="space-y-4">
            {stats.skills.slice(0, 5).map((skill) => (
              <div
                key={`${skill.kind}:${skill.name}`}
                className="flex justify-between gap-6 text-base"
              >
                <span className="truncate">{skill.displayName}</span>
                <span className="tabular-nums text-muted-foreground">
                  {t("settings.runCount", { count: formatNumber(skill.runCount) })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-auto flex items-center justify-between border-t border-border pt-7 text-sm text-muted-foreground">
        <span>{stats.timezone.today}</span>
        <span>OmniMind</span>
      </footer>
    </div>
  );
});

function ExportSection({
  title,
  meta,
  children,
}: {
  readonly title: string;
  readonly meta?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="mb-6 flex items-baseline justify-between gap-8">
        <h2 className="text-xl font-medium">{title}</h2>
        {meta ? <span className="text-sm tabular-nums text-muted-foreground">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

function ExportLegend({
  label,
  className,
}: {
  readonly label: string;
  readonly className: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-2 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function ExportDefinition({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function formatExportHourRange(start: number | null, end: number | null, locale: "en" | "zh-CN") {
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

function formatExportReasoning(stats: ProfileStats, t: ReturnType<typeof useI18n>["t"]) {
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
