// FILE: ProviderUsageLimitRows.tsx
// Purpose: Shared provider usage limit-row renderer for Settings and compact
// popovers. Keeps labels, progress tracks, pace details, and tones consistent.

import {
  providerUsagePaceDetails,
  providerUsageProgressTrackProps,
  type ProviderUsageDisplayRow,
} from "~/lib/providerUsageDisplay";
import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";

import { UsageProgressTrack } from "./UsageProgressTrack";

export type ProviderUsageLimitRowsSurface = "settings" | "popover";

const STANDARD_PROVIDER_USAGE_WINDOW_LABELS = new Set([
  "5h",
  "Weekly",
  "Sonnet",
  "Opus",
  "Current",
]);

function ProviderUsagePaceLine({
  row,
  surface,
}: {
  row: ProviderUsageDisplayRow;
  surface: ProviderUsageLimitRowsSurface;
}) {
  const paceDetails = providerUsagePaceDetails(row);
  if (!paceDetails) return null;

  if (surface === "popover") {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 text-muted-foreground">
        {paceDetails.amountText ? (
          <div className="min-w-0 truncate tabular-nums">{paceDetails.amountText}</div>
        ) : (
          <div />
        )}
        {paceDetails.etaText ? (
          <div className="min-w-0 truncate text-right tabular-nums text-muted-foreground/80">
            {paceDetails.etaText}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
      {paceDetails.amountText ? <span>{paceDetails.amountText}</span> : <span />}
      {paceDetails.etaText ? <span>{paceDetails.etaText}</span> : null}
    </div>
  );
}

function ProviderUsageTrack({
  row,
  surface,
  ariaLabel,
}: {
  row: ProviderUsageDisplayRow;
  surface: ProviderUsageLimitRowsSurface;
  ariaLabel: string;
}) {
  const trackProps = providerUsageProgressTrackProps(row);

  return (
    <UsageProgressTrack
      {...trackProps}
      label={ariaLabel}
      className={surface === "popover" ? "h-1.5 bg-muted/80" : undefined}
      markerGapClassName={surface === "popover" ? "bg-popover" : undefined}
    />
  );
}

function SettingsUsageLimitRow({
  row,
  displayLabel,
  ariaLabel,
}: {
  row: ProviderUsageDisplayRow;
  displayLabel: string;
  ariaLabel: string;
}) {
  const trackProps = providerUsageProgressTrackProps(row);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-foreground">{displayLabel}</span>
        <span
          className={cn("size-1.5 shrink-0 rounded-full", trackProps.markerClassName)}
          title={row.pace ? `Usage pace: ${row.pace.status}` : undefined}
          aria-hidden
        />
      </div>
      <ProviderUsageTrack row={row} surface="settings" ariaLabel={ariaLabel} />
      <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{row.leftText}</span>
        {row.resetText ? <span>{row.resetText}</span> : null}
      </div>
      <ProviderUsagePaceLine row={row} surface="settings" />
    </div>
  );
}

function PopoverUsageLimitRow({
  row,
  displayLabel,
  ariaLabel,
}: {
  row: ProviderUsageDisplayRow;
  displayLabel: string;
  ariaLabel: string;
}) {
  return (
    <div className="space-y-1 text-[length:var(--app-font-size-chat-meta,10px)] leading-tight">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-x-3">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 text-[11px] font-medium text-foreground">{displayLabel}</span>
          <span className="min-w-0 truncate tabular-nums text-foreground">{row.leftText}</span>
        </div>
        <div className="min-w-0 text-right text-muted-foreground">
          {row.resetText ? <div className="truncate tabular-nums">{row.resetText}</div> : null}
        </div>
      </div>
      <ProviderUsageTrack row={row} surface="popover" ariaLabel={ariaLabel} />
      <ProviderUsagePaceLine row={row} surface="popover" />
    </div>
  );
}

export function ProviderUsageLimitRows({
  rows,
  surface,
}: {
  rows: ReadonlyArray<ProviderUsageDisplayRow>;
  surface: ProviderUsageLimitRowsSurface;
}) {
  const { t } = useI18n();

  if (rows.length === 0) return null;

  return (
    <div className={surface === "settings" ? "space-y-3" : "space-y-1.5"}>
      {rows.map((row) => {
        const displayLabel =
          row.label === "Weekly (overage)"
            ? t("providerUsage.window.weeklyOverage")
            : STANDARD_PROVIDER_USAGE_WINDOW_LABELS.has(row.label)
              ? row.label
              : t("providerUsage.window.other", { label: row.label });
        const ariaLabel = t("providerUsage.window.remaining", { label: displayLabel });

        return surface === "settings" ? (
          <SettingsUsageLimitRow
            key={row.id}
            row={row}
            displayLabel={displayLabel}
            ariaLabel={ariaLabel}
          />
        ) : (
          <PopoverUsageLimitRow
            key={row.id}
            row={row}
            displayLabel={displayLabel}
            ariaLabel={ariaLabel}
          />
        );
      })}
    </div>
  );
}
