// FILE: BuiltInToolsSettingsPanel.tsx
// Purpose: Projects the server-owned built-in tool policy across Agent, Chat, and Studio.
// Layer: Settings UI
// Depends on: One AgentGateway read model, ServerSettings intent, and shared Settings primitives.

import {
  BUILT_IN_TOOL_GROUP_IDS,
  BUILT_IN_TOOL_SURFACES,
  type BuiltInToolGroupId,
  type BuiltInToolGroupOverrides,
  type BuiltInToolGroupsResult,
  type BuiltInToolSurface,
} from "@omnimind/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { SettingsCard, SettingsSectionShell } from "~/components/settings/SettingsPanelPrimitives";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { toastManager } from "~/components/ui/toast";
import { useI18n, type MessageKey } from "~/i18n";
import { serverBuiltInToolGroupsQueryOptions, serverQueryKeys } from "~/lib/serverReactQuery";
import { cn } from "~/lib/utils";
import { ensureNativeApi } from "~/nativeApi";

const GROUP_COPY: Readonly<Record<BuiltInToolGroupId, readonly [MessageKey, MessageKey]>> = {
  tasks: ["settings.builtInGroupTasks", "settings.builtInGroupTasksDescription"],
  diagnostics: ["settings.builtInGroupDiagnostics", "settings.builtInGroupDiagnosticsDescription"],
  goals: ["settings.builtInGroupGoals", "settings.builtInGroupGoalsDescription"],
  automations: ["settings.builtInGroupAutomations", "settings.builtInGroupAutomationsDescription"],
  browser: ["settings.builtInGroupBrowser", "settings.builtInGroupBrowserDescription"],
  device: ["settings.builtInGroupDevice", "settings.builtInGroupDeviceDescription"],
};

const SURFACE_COPY: Readonly<Record<BuiltInToolSurface, MessageKey>> = {
  agent: "nav.agent",
  chat: "nav.chat",
  studio: "nav.studio",
};

function cellKey(surface: BuiltInToolSurface, group: BuiltInToolGroupId): string {
  return `${surface}:${group}`;
}

function cloneOverrides(overrides: BuiltInToolGroupOverrides): BuiltInToolGroupOverrides {
  return Object.fromEntries(
    BUILT_IN_TOOL_SURFACES.flatMap((surface) => {
      const values = overrides[surface];
      return values ? [[surface, { ...values }] as const] : [];
    }),
  );
}

type MutableBuiltInToolGroupOverrides = {
  -readonly [Surface in BuiltInToolSurface]?: Record<string, boolean>;
};

function optimisticConfiguredEnabled(input: {
  readonly pendingOverrides: BuiltInToolGroupOverrides | null;
  readonly surface: BuiltInToolSurface;
  readonly group: BuiltInToolGroupId;
  readonly defaultEnabled: boolean;
  readonly configuredEnabled: boolean;
}): boolean {
  if (input.pendingOverrides === null) return input.configuredEnabled;
  const surfaceOverrides = input.pendingOverrides[input.surface];
  return surfaceOverrides && Object.hasOwn(surfaceOverrides, input.group)
    ? surfaceOverrides[input.group] === true
    : input.defaultEnabled;
}

function sameOverrides(left: BuiltInToolGroupOverrides, right: BuiltInToolGroupOverrides): boolean {
  return BUILT_IN_TOOL_SURFACES.every((surface) => {
    const leftEntries = Object.entries(left[surface] ?? {}).toSorted(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const rightEntries = Object.entries(right[surface] ?? {}).toSorted(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return (
      leftEntries.length === rightEntries.length &&
      leftEntries.every(
        ([key, value], index) =>
          rightEntries[index]?.[0] === key && rightEntries[index]?.[1] === value,
      )
    );
  });
}

function hasKnownOverrides(overrides: BuiltInToolGroupOverrides): boolean {
  return BUILT_IN_TOOL_SURFACES.some((surface) => {
    const values = overrides[surface];
    return (
      values !== undefined && BUILT_IN_TOOL_GROUP_IDS.some((group) => Object.hasOwn(values, group))
    );
  });
}

function withoutKnownOverrides(overrides: BuiltInToolGroupOverrides): BuiltInToolGroupOverrides {
  const known = new Set<string>(BUILT_IN_TOOL_GROUP_IDS);
  return Object.fromEntries(
    BUILT_IN_TOOL_SURFACES.flatMap((surface) => {
      const retained = Object.fromEntries(
        Object.entries(overrides[surface] ?? {}).filter(([group]) => !known.has(group)),
      );
      return Object.keys(retained).length > 0 ? [[surface, retained] as const] : [];
    }),
  );
}

export function BuiltInToolsSettingsPanel(props: { active: boolean }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const groupsQuery = useQuery(serverBuiltInToolGroupsQueryOptions({ enabled: props.active }));
  const [pendingIntent, setPendingIntent] = useState<BuiltInToolGroupOverrides | null>(null);
  const [pendingCells, setPendingCells] = useState<ReadonlySet<string>>(() => new Set());
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [confirmationFailed, setConfirmationFailed] = useState(false);
  const latestIntentRef = useRef<BuiltInToolGroupOverrides | null>(null);
  const generationRef = useRef(0);
  const acceptedGenerationRef = useRef(0);
  const acceptedRevisionFloorRef = useRef(0);
  const confirmationFailedAtRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const revision = groupsQuery.data?.settingsRevision;
    if (
      revision !== undefined &&
      revision >= acceptedRevisionFloorRef.current &&
      acceptedGenerationRef.current === generationRef.current
    ) {
      latestIntentRef.current = null;
      setPendingIntent(null);
      setPendingCells(new Set());
      setRefreshFailed(false);
      setConfirmationFailed(false);
    }
  }, [groupsQuery.data?.settingsRevision]);

  useEffect(() => {
    if (
      confirmationFailed &&
      groupsQuery.isSuccess &&
      groupsQuery.dataUpdatedAt > confirmationFailedAtRef.current
    ) {
      latestIntentRef.current = null;
      setPendingIntent(null);
      setPendingCells(new Set());
      setConfirmationFailed(false);
    }
  }, [confirmationFailed, groupsQuery.dataUpdatedAt, groupsQuery.isSuccess]);

  if (!props.active) return null;

  const authoritative = groupsQuery.data?.builtInGroupOverrides ?? {};
  const displayedOverrides = pendingIntent ?? authoritative;

  const submitOverrides = (
    nextOverrides: BuiltInToolGroupOverrides,
    changedCells: ReadonlyArray<string>,
  ) => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    latestIntentRef.current = nextOverrides;
    setPendingIntent(nextOverrides);
    setPendingCells((current) => new Set([...current, ...changedCells]));
    setRefreshFailed(false);
    setConfirmationFailed(false);

    const operation = queueRef.current
      .catch(() => undefined)
      .then(async () => {
        const previousRevision =
          queryClient.getQueryData<BuiltInToolGroupsResult>(serverQueryKeys.builtInToolGroups())
            ?.settingsRevision ?? 0;
        let acceptedProjection: BuiltInToolGroupsResult | null = null;
        try {
          await ensureNativeApi().server.updateSettings({
            agentTools: { builtInGroupOverrides: nextOverrides },
          });
        } catch {
          try {
            acceptedProjection = await ensureNativeApi().server.getBuiltInToolGroups();
          } catch {
            if (generationRef.current === generation) {
              confirmationFailedAtRef.current = groupsQuery.dataUpdatedAt;
              setPendingCells(new Set());
              setConfirmationFailed(true);
              toastManager.add({
                type: "error",
                title: t("settings.builtInConfirmationFailed"),
                description: t("settings.builtInConfirmationFailedDescription"),
              });
            }
            void queryClient.invalidateQueries({
              queryKey: serverQueryKeys.builtInToolGroups(),
            });
            return;
          }
          queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), acceptedProjection);
          if (!sameOverrides(acceptedProjection.builtInGroupOverrides, nextOverrides)) {
            if (generationRef.current === generation) {
              latestIntentRef.current = null;
              setPendingIntent(null);
              setPendingCells(new Set());
              setRefreshFailed(false);
              setConfirmationFailed(false);
              toastManager.add({
                type: "error",
                title: t("settings.builtInUpdateFailed"),
                description: t("settings.builtInUpdateFailedDescription"),
              });
            }
            return;
          }
        }

        acceptedGenerationRef.current = generation;
        acceptedRevisionFloorRef.current = Math.max(
          acceptedRevisionFloorRef.current + 1,
          previousRevision + 1,
        );
        try {
          const projection =
            acceptedProjection ?? (await ensureNativeApi().server.getBuiltInToolGroups());
          if (projection.settingsRevision < acceptedRevisionFloorRef.current) {
            throw new Error("stale built-in tool projection");
          }
          queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), projection);
          if (generationRef.current === generation) {
            latestIntentRef.current = null;
            setPendingIntent(null);
            setPendingCells(new Set());
            setRefreshFailed(false);
            setConfirmationFailed(false);
          }
        } catch {
          if (generationRef.current === generation) {
            setPendingCells(new Set());
            setRefreshFailed(true);
            toastManager.add({
              type: "error",
              title: t("settings.builtInRefreshFailed"),
              description: t("settings.builtInRefreshFailedDescription"),
            });
          }
        }
      });
    queueRef.current = operation;
  };

  const setGroupEnabled = (
    group: BuiltInToolGroupId,
    surface: BuiltInToolSurface,
    enabled: boolean,
  ) => {
    const next: MutableBuiltInToolGroupOverrides = cloneOverrides(
      latestIntentRef.current ?? displayedOverrides,
    );
    next[surface] = { ...next[surface], [group]: enabled };
    submitOverrides(next, [cellKey(surface, group)]);
  };

  const resetKnownOverrides = () => {
    const current = latestIntentRef.current ?? displayedOverrides;
    const changedCells = BUILT_IN_TOOL_SURFACES.flatMap((surface) => {
      const surfaceOverrides = current[surface];
      return surfaceOverrides
        ? BUILT_IN_TOOL_GROUP_IDS.filter((group) => Object.hasOwn(surfaceOverrides, group)).map(
            (group) => cellKey(surface, group),
          )
        : [];
    });
    submitOverrides(withoutKnownOverrides(current), changedCells);
  };

  return (
    <div className="space-y-6">
      <SettingsSectionShell
        title={t("settings.builtInTools")}
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasKnownOverrides(displayedOverrides)}
            onClick={resetKnownOverrides}
          >
            {t("settings.builtInRestoreRecommended")}
          </Button>
        }
      >
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          {t("settings.builtInToolsForSurfacesDescription")}
        </p>
        {refreshFailed ? (
          <p className="mb-3 text-xs text-amber-700 dark:text-amber-300" role="status">
            {t("settings.builtInRefreshFailedInline")}
          </p>
        ) : null}
        {confirmationFailed ? (
          <p className="mb-3 text-xs text-amber-700 dark:text-amber-300" role="status">
            {t("settings.builtInConfirmationFailedInline")}
          </p>
        ) : null}
        <SettingsCard divided={false} className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1fr)_repeat(3,minmax(5.5rem,0.28fr))] gap-3 border-b border-border/50 px-4 py-2.5 text-[11px] font-medium text-muted-foreground sm:grid">
            <span>{t("settings.builtInToolGroups")}</span>
            {BUILT_IN_TOOL_SURFACES.map((surface) => (
              <span key={surface} className="text-center">
                {t(SURFACE_COPY[surface])}
              </span>
            ))}
          </div>
          <div className="divide-y divide-border/50">
            {groupsQuery.data?.groups.map((group) => (
              <div
                key={group.id}
                className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(5.5rem,0.28fr))] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {t(GROUP_COPY[group.id][0])}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {t(GROUP_COPY[group.id][1])}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("settings.builtInToolCount", {
                      available: group.availableToolCount,
                      total: group.toolCount,
                    })}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:contents">
                  {BUILT_IN_TOOL_SURFACES.map((surface) => {
                    const projection = group.surfaces[surface];
                    const configuredEnabled = optimisticConfiguredEnabled({
                      pendingOverrides: pendingIntent,
                      surface,
                      group: group.id,
                      defaultEnabled: projection.defaultEnabled,
                      configuredEnabled: projection.configuredEnabled,
                    });
                    const pending = pendingCells.has(cellKey(surface, group.id));
                    const effective = projection.effective;
                    const state = !projection.supported
                      ? t("settings.builtInUnsupported")
                      : !configuredEnabled
                        ? t("settings.builtInDisabled")
                        : !effective || group.availability === "unavailable"
                          ? t("settings.builtInEnabledUnavailable")
                          : group.availability === "degraded"
                            ? t("settings.builtInEnabledDegraded")
                            : t("settings.builtInEnabled");
                    return (
                      <div
                        key={surface}
                        className={cn(
                          "flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-center",
                          !projection.supported && "bg-muted/35",
                        )}
                      >
                        <span className="text-[10px] font-medium text-muted-foreground sm:hidden">
                          {t(SURFACE_COPY[surface])}
                        </span>
                        {projection.supported ? (
                          <Switch
                            checked={configuredEnabled}
                            disabled={groupsQuery.data === undefined}
                            aria-label={t("settings.builtInGroupSurfaceToggle", {
                              group: t(GROUP_COPY[group.id][0]),
                              surface: t(SURFACE_COPY[surface]),
                            })}
                            onCheckedChange={(checked) =>
                              setGroupEnabled(group.id, surface, checked)
                            }
                          />
                        ) : (
                          <span aria-hidden="true" className="h-5 text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                        <span
                          className="min-h-8 text-[10px] leading-4 text-muted-foreground"
                          aria-live="polite"
                        >
                          {pending && projection.supported ? t("settings.builtInSaving") : state}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {groupsQuery.isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("settings.loadingBuiltInToolGroups")}
            </div>
          ) : null}
          {groupsQuery.isError ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("settings.builtInGroupsUnavailableDescription")}
            </div>
          ) : null}
        </SettingsCard>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {t("settings.builtInSessionTiming")}
        </p>
      </SettingsSectionShell>
    </div>
  );
}
