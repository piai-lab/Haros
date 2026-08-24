// FILE: ProviderUsageSettingsPanel.tsx
// Purpose: Settings → Usage panel. One card per supported provider showing live remaining
// quota/credits with linear progress meters, the provider brand icon, and plan/status pills.
// Usage is fetched from each CLI's local sign-in state by the server. Providers that use
// short-lived OAuth tokens may refresh and atomically persist those tokens through their
// official endpoint; the panel itself never receives credential material.

import type {
  ServerProviderUsageSnapshot,
  UsageHistoryRow,
  UsageHistoryGroupBy,
  UsageHistoryRange,
} from "@omnimind/contracts";
import { USAGE_HISTORY_UNKNOWN_MODEL, USAGE_HISTORY_UNKNOWN_WORKSPACE } from "@omnimind/contracts";
import { formatBytes } from "@omnimind/shared/formatBytes";
import {
  PROVIDER_USAGE_PROVIDERS,
  providerUsageDisplayName,
  selectVisibleProviderUsageSnapshots,
} from "@omnimind/shared/providerUsage";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ProviderIcon } from "~/components/ProviderIcon";
import { ProviderUsageLimitRows } from "~/components/ProviderUsageLimitRows";
import { ProviderUsageLineList } from "~/components/ProviderUsageLineList";
import { SettingsCard, SettingsSectionShell } from "~/components/settings/SettingsPanelPrimitives";
import { Button } from "~/components/ui/button";
import { useAccountCapacity } from "~/hooks/useAccountCapacity";
import { useUsageHistory } from "~/hooks/useUsageHistory";
import { RotateCcwIcon, TriangleAlertIcon } from "~/lib/icons";
import { deriveProviderUsageDisplayRows } from "~/lib/providerUsageDisplay";
import {
  fetchAllProviderUsage,
  serverAllProviderUsageQueryOptions,
  serverQueryKeys,
} from "~/lib/serverReactQuery";
import { cn } from "~/lib/utils";
import { useI18n, type MessageKey } from "~/i18n";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

const PILL_CLASS_NAME = "shrink-0 rounded-full px-2 py-1 text-[11px] font-medium leading-none";

interface StatusPill {
  labelKey: MessageKey;
  className: string;
}

function statusPill(status: ServerProviderUsageSnapshot["status"]): StatusPill | null {
  switch (status) {
    case "needs-auth":
      return {
        labelKey: "settings.notSignedIn",
        className: "bg-warning/12 text-warning",
      };
    case "unsupported":
      return { labelKey: "settings.unsupported", className: "bg-muted text-muted-foreground" };
    case "error":
      return {
        labelKey: "settings.usageUnavailable",
        className: "bg-destructive/12 text-destructive",
      };
    default:
      return null;
  }
}

function ProviderUsageCard({ snapshot }: { snapshot: ServerProviderUsageSnapshot }) {
  const { t } = useI18n();
  const provider = snapshot.provider;
  const status = snapshot.status ?? "ok";
  const usageSummary = useAccountCapacity({
    provider,
    providerSnapshot: snapshot,
  });
  const meterRows = deriveProviderUsageDisplayRows(usageSummary.rateLimits);
  const usageLines = usageSummary.usageLines;

  const hasUsage = meterRows.length > 0 || usageLines.length > 0;
  const pill = status === "ok" ? null : statusPill(snapshot.status);

  return (
    <SettingsCard>
      <div className="space-y-3.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-muted/60">
              <ProviderIcon provider={provider} className="size-4" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">
              {providerUsageDisplayName(provider)}
            </span>
          </div>
          {status === "ok" && snapshot.planName ? (
            <span className={cn(PILL_CLASS_NAME, "bg-muted text-muted-foreground")}>
              {snapshot.planName}
            </span>
          ) : pill ? (
            <span className={cn(PILL_CLASS_NAME, pill.className)}>{t(pill.labelKey)}</span>
          ) : null}
        </div>

        {status === "ok" && hasUsage ? (
          <>
            {usageSummary.usageNotice ? (
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-warning">
                <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>{usageSummary.usageNotice}</span>
              </p>
            ) : null}
            {meterRows.length > 0 ? (
              <ProviderUsageLimitRows rows={meterRows} surface="settings" />
            ) : null}
            {usageLines.length > 0 ? (
              <ProviderUsageLineList
                className={cn(
                  meterRows.length > 0 && "border-t border-[color:var(--color-border)] pt-3",
                )}
                lines={usageLines}
                surface="settings"
              />
            ) : null}
          </>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {status === "ok"
              ? t("settings.noUsageData")
              : status === "needs-auth"
                ? t("settings.providerUsageSignIn")
                : (snapshot.detail ?? t("settings.noUsageData"))}
          </p>
        )}
        {status === "error" ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("settings.providerUsageErrorScope")}
          </p>
        ) : null}
      </div>
    </SettingsCard>
  );
}

function mergeProviderUsageRefresh(
  previous: readonly ServerProviderUsageSnapshot[] | undefined,
  next: readonly ServerProviderUsageSnapshot[],
): readonly ServerProviderUsageSnapshot[] {
  if (!previous) {
    return next;
  }
  const previousByProvider = new Map(previous.map((snapshot) => [snapshot.provider, snapshot]));
  const nextByProvider = new Map(next.map((snapshot) => [snapshot.provider, snapshot]));
  return PROVIDER_USAGE_PROVIDERS.map(
    (provider) => nextByProvider.get(provider) ?? previousByProvider.get(provider),
  ).filter((snapshot): snapshot is ServerProviderUsageSnapshot => snapshot !== undefined);
}

const HISTORY_RANGES = ["24h", "7d", "30d", "all"] as const;
const HISTORY_GROUPS = ["provider", "model", "workspace", "date"] as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

function formatEstimatedCost(micros: number | undefined): string {
  if (micros === undefined) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(micros / 1_000_000);
}

export function historyStatusKey(status: string): MessageKey {
  switch (status) {
    case "not-authorized":
      return "settings.usageHistoryNotAuthorized";
    case "indexing":
      return "settings.usageHistoryIndexing";
    case "partial":
      return "settings.usageHistoryPartial";
    case "paused":
      return "settings.usageHistoryPaused";
    case "stale":
      return "settings.usageHistoryStale";
    case "idle":
      return "settings.usageHistoryIdle";
    default:
      return "settings.usageHistoryReady";
  }
}

function formatUsageHistoryDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function usageHistoryDimensionLabel(
  row: UsageHistoryRow,
  t: (key: MessageKey) => string,
): string {
  if (row.provider) return providerUsageDisplayName(row.provider);
  if (row.model === USAGE_HISTORY_UNKNOWN_MODEL) return t("settings.usageHistoryUnknownModel");
  if (row.workspace === USAGE_HISTORY_UNKNOWN_WORKSPACE)
    return t("settings.usageHistoryUnknownWorkspace");
  return row.model ?? row.workspace ?? row.date ?? row.key;
}

export function UsageHistorySection() {
  const { t } = useI18n();
  const [range, setRange] = useState<UsageHistoryRange>("30d");
  const [groupBy, setGroupBy] = useState<UsageHistoryGroupBy>("provider");
  const [confirmAction, setConfirmAction] = useState<"authorize" | "reindex" | "clear" | null>(
    null,
  );
  const { query, command } = useUsageHistory({ range, groupBy });
  const history = query.data;
  const isAuthorized = Boolean(history && history.status !== "not-authorized");
  const isBusy = command.isPending || history?.status === "indexing";
  const lastUpdated = formatUsageHistoryDate(history?.lastCompletedAt ?? history?.updatedAt);

  return (
    <SettingsSectionShell
      title={t("settings.usageHistory")}
      action={
        isAuthorized ? (
          <div className="flex items-center gap-1.5">
            {history?.status === "paused" || history?.status === "idle" ? (
              <Button
                size="xs"
                variant="outline"
                disabled={command.isPending}
                onClick={() => command.mutate({ action: "resume" })}
              >
                {t("settings.resume")}
              </Button>
            ) : (
              <Button
                size="xs"
                variant="outline"
                disabled={command.isPending}
                onClick={() => command.mutate({ action: "pause" })}
              >
                {t("settings.pause")}
              </Button>
            )}
            <Button
              size="xs"
              variant="outline"
              disabled={isBusy}
              onClick={() => command.mutate({ action: "refresh" })}
            >
              <RotateCcwIcon className={cn("size-3.5", isBusy && "animate-spin")} />
              {t("settings.refresh")}
            </Button>
          </div>
        ) : null
      }
    >
      <SettingsCard divided={false}>
        <div className="space-y-4 p-4">
          {query.isError && !history ? (
            <div className="flex flex-col items-start gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t("settings.usageHistoryLoadFailed")}
                </p>
                <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                  {t("settings.usageHistoryScopeNote")}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
                {t("common.tryAgain")}
              </Button>
            </div>
          ) : query.isPending && !history ? (
            <p className="text-xs text-muted-foreground">{t("settings.loadingUsageHistory")}</p>
          ) : !isAuthorized ? (
            <div className="flex flex-col items-start gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t("settings.usageHistoryNotAuthorized")}
                </p>
                <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                  {t("settings.usageHistoryConsentSummary")}
                </p>
              </div>
              <Button size="sm" onClick={() => setConfirmAction("authorize")}>
                {t("settings.enableUsageHistory")}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {t(historyStatusKey(history?.status ?? "ready"))}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {history?.status === "indexing"
                      ? t("settings.usageHistoryProgress", {
                          indexed: history.progress.filesIndexed,
                          discovered: history.progress.filesDiscovered,
                          read: formatBytes(history.progress.bytesRead),
                          bytes: formatBytes(history.progress.bytesDiscovered),
                        })
                      : history?.status === "idle"
                        ? t("settings.usageHistoryIdleDetail")
                        : t("settings.usageHistoryScopeNote")}
                  </p>
                  {lastUpdated ? (
                    <p className="text-[11px] text-muted-foreground">
                      {t("settings.usageHistoryLastUpdated", { time: lastUpdated })}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1">
                  {HISTORY_RANGES.map((item) => (
                    <Button
                      key={item}
                      size="xs"
                      variant={range === item ? "secondary" : "ghost"}
                      onClick={() => setRange(item)}
                    >
                      {t(`settings.usageHistoryRange.${item}` as MessageKey)}
                    </Button>
                  ))}
                </div>
              </div>

              {history ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {history.providers.map((provider) => (
                    <div
                      key={provider.provider}
                      className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-foreground">
                        {providerUsageDisplayName(provider.provider)}
                      </span>
                      <span className="text-right text-muted-foreground">
                        {provider.status === "unsupported"
                          ? t("settings.usageHistoryProviderUnavailable")
                          : provider.status === "paused"
                            ? t("settings.usageHistoryProviderPaused")
                            : provider.progress.skippedFiles > 0
                              ? t("settings.usageHistoryFilesSkipped", {
                                  count: provider.progress.skippedFiles,
                                })
                              : provider.status === "partial" || provider.detailCode
                                ? t("settings.usageHistoryProviderPartial")
                                : provider.status === "indexing"
                                  ? t("settings.usageHistoryProviderIndexing")
                                  : provider.status === "pending"
                                    ? t("settings.usageHistoryProviderPending")
                                    : t("settings.usageHistoryProviderReady")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-1 border-t border-[color:var(--color-border)] pt-3">
                {HISTORY_GROUPS.map((item) => (
                  <Button
                    key={item}
                    size="xs"
                    variant={groupBy === item ? "secondary" : "ghost"}
                    onClick={() => setGroupBy(item)}
                  >
                    {t(`settings.usageHistoryGroup.${item}` as MessageKey)}
                  </Button>
                ))}
              </div>

              {history && history.rows.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-[color:var(--color-border)]">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-muted/45 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">
                          {t("settings.usageHistoryDimension")}
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          {t("settings.sessions")}
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          {t("settings.inputTokens")}
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          {t("settings.outputTokens")}
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          {t("settings.cacheTokens")}
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          {t("settings.estimatedCost")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--color-border)]">
                      {history.rows.map((row) => (
                        <tr key={row.key}>
                          <td className="max-w-56 truncate px-3 py-2.5 font-medium text-foreground">
                            {usageHistoryDimensionLabel(row, (key) => t(key))}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatNumber(row.sessionCount)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatNumber(row.inputTokens)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatNumber(row.outputTokens)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatNumber(row.cacheReadTokens + row.cacheWriteTokens)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatEstimatedCost(row.estimatedCostMicros)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-[color:var(--color-border)] px-3 py-6 text-center text-xs text-muted-foreground">
                  {t("settings.noUsageHistory")}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--color-border)] pt-3">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {t("settings.usageHistoryEstimate", { version: history?.pricingVersion ?? "—" })}
                </p>
                <div className="flex gap-1.5">
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={command.isPending}
                    onClick={() => setConfirmAction("reindex")}
                  >
                    {t("settings.reindex")}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={command.isPending}
                    onClick={() => setConfirmAction("clear")}
                  >
                    {t("settings.clearUsageIndex")}
                  </Button>
                </div>
              </div>
              {command.isError ? (
                <p className="text-xs leading-relaxed text-destructive">
                  {t("settings.usageHistoryCommandFailed")}
                </p>
              ) : null}
            </>
          )}
        </div>
      </SettingsCard>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "authorize"
                ? t("settings.usageHistoryConsentTitle")
                : confirmAction === "reindex"
                  ? t("settings.reindexUsageHistoryTitle")
                  : t("settings.clearUsageHistoryTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "authorize"
                ? t("settings.usageHistoryConsentDetail")
                : confirmAction === "reindex"
                  ? t("settings.reindexUsageHistoryDetail")
                  : t("settings.clearUsageHistoryDetail")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" size="sm" />}>
              {t("common.cancel")}
            </AlertDialogClose>
            <Button
              size="sm"
              disabled={command.isPending || confirmAction === null}
              onClick={() => {
                if (!confirmAction) return;
                command.mutate({ action: confirmAction });
                setConfirmAction(null);
              }}
            >
              {t("common.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </SettingsSectionShell>
  );
}

export function ProviderUsageSettingsPanel() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const usageQuery = useQuery(serverAllProviderUsageQueryOptions());
  const refreshMutation = useMutation({
    mutationFn: () => fetchAllProviderUsage({ forceRefresh: true }),
    onSuccess: (data) => {
      queryClient.setQueryData<readonly ServerProviderUsageSnapshot[]>(
        serverQueryKeys.allProviderUsage(),
        (previous) => mergeProviderUsageRefresh(previous, data),
      );
    },
  });

  // Use the live payload only. Inventing error placeholders for omitted providers
  // would count as "connected" and hide unsigned cards.
  const cards = selectVisibleProviderUsageSnapshots(usageQuery.data ?? []);

  const showInitialLoading = usageQuery.isPending && !usageQuery.data;

  const isRefreshing = usageQuery.isFetching || refreshMutation.isPending;

  return (
    <div className="space-y-8">
      <SettingsSectionShell
        title={t("settings.accountCapacity")}
        action={
          <Button
            size="xs"
            variant="outline"
            className="shrink-0"
            disabled={isRefreshing}
            onClick={() => refreshMutation.mutate()}
          >
            <RotateCcwIcon className={cn("size-3.5", isRefreshing && "animate-spin")} />
            {t("settings.refresh")}
          </Button>
        }
      >
        {showInitialLoading ? (
          <SettingsCard>
            <div className="px-4 py-3.5 text-xs text-muted-foreground">
              {t("settings.loadingProviderUsage")}
            </div>
          </SettingsCard>
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map((snapshot) => (
              <ProviderUsageCard key={snapshot.provider} snapshot={snapshot} />
            ))}
          </div>
        )}

        <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
          {t("settings.providerUsagePrivacy")}
        </p>
      </SettingsSectionShell>
      <UsageHistorySection />
    </div>
  );
}
