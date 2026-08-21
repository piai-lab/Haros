// FILE: BuiltInToolsSettingsPanel.tsx
// Purpose: Projects the server-owned built-in Agent tool exposure policy into Settings.
// Layer: Settings UI
// Depends on: ServerSettings intent, AgentGateway group availability, and shared Settings primitives.

import type { BuiltInToolGroupId, ServerSettingsView } from "@omnimind/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { SettingsRow, SettingsSection } from "~/components/settings/SettingsPanelPrimitives";
import { Switch } from "~/components/ui/switch";
import { toastManager } from "~/components/ui/toast";
import { useI18n, type MessageKey } from "~/i18n";
import {
  serverBuiltInToolGroupsQueryOptions,
  serverQueryKeys,
  serverSettingsQueryOptions,
} from "~/lib/serverReactQuery";
import { ensureNativeApi } from "~/nativeApi";

const GROUP_COPY: Readonly<Record<BuiltInToolGroupId, readonly [MessageKey, MessageKey]>> = {
  tasks: ["settings.builtInGroupTasks", "settings.builtInGroupTasksDescription"],
  diagnostics: ["settings.builtInGroupDiagnostics", "settings.builtInGroupDiagnosticsDescription"],
  goals: ["settings.builtInGroupGoals", "settings.builtInGroupGoalsDescription"],
  automations: ["settings.builtInGroupAutomations", "settings.builtInGroupAutomationsDescription"],
  browser: ["settings.builtInGroupBrowser", "settings.builtInGroupBrowserDescription"],
  device: ["settings.builtInGroupDevice", "settings.builtInGroupDeviceDescription"],
};

export function BuiltInToolsSettingsPanel(props: { active: boolean }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    ...serverSettingsQueryOptions(),
    enabled: props.active,
  });
  const groupsQuery = useQuery(serverBuiltInToolGroupsQueryOptions({ enabled: props.active }));
  const [pendingIntent, setPendingIntent] = useState<readonly string[] | null>(null);
  const latestIntentRef = useRef<readonly string[] | null>(null);
  const generationRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  if (!props.active) return null;

  const authoritativeDisabled = settingsQuery.data?.agentTools.disabledBuiltInGroups ?? [];
  const disabledGroups = new Set(pendingIntent ?? authoritativeDisabled);

  const setGroupEnabled = (group: BuiltInToolGroupId, enabled: boolean) => {
    const current = new Set(latestIntentRef.current ?? authoritativeDisabled);
    if (enabled) current.delete(group);
    else current.add(group);
    const disabledBuiltInGroups = [...current].sort((left, right) =>
      left < right ? -1 : left > right ? 1 : 0,
    );
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    latestIntentRef.current = disabledBuiltInGroups;
    setPendingIntent(disabledBuiltInGroups);

    const operation = queueRef.current
      .catch(() => undefined)
      .then(async () => {
        const nextSettings = await ensureNativeApi().server.updateSettings({
          agentTools: { disabledBuiltInGroups },
        });
        queryClient.setQueryData<ServerSettingsView>(serverQueryKeys.settings(), nextSettings);
        await queryClient.invalidateQueries({ queryKey: serverQueryKeys.builtInToolGroups() });
        if (generationRef.current === generation) {
          latestIntentRef.current = null;
          setPendingIntent(null);
        }
      })
      .catch(async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: serverQueryKeys.settings() }),
          queryClient.invalidateQueries({ queryKey: serverQueryKeys.builtInToolGroups() }),
        ]);
        if (generationRef.current === generation) {
          latestIntentRef.current = null;
          setPendingIntent(null);
          toastManager.add({
            type: "error",
            title: t("settings.builtInUpdateFailed"),
            description: t("settings.builtInUpdateFailedDescription"),
          });
        }
      });
    queueRef.current = operation;
  };

  return (
    <div className="space-y-6">
      <SettingsSection title={t("settings.builtInTools")}>
        <SettingsRow
          title={t("settings.builtInToolsForAgents")}
          description={t("settings.builtInToolsForAgentsDescription")}
        />
      </SettingsSection>

      <SettingsSection title={t("settings.builtInToolGroups")}>
        {groupsQuery.isError ? (
          <SettingsRow
            title={t("settings.builtInGroupsUnavailable")}
            description={t("settings.builtInGroupsUnavailableDescription")}
          />
        ) : null}
        {groupsQuery.data?.map((group) => {
          const enabled = !disabledGroups.has(group.id);
          const state = !enabled
            ? t("settings.builtInDisabled")
            : group.availability === "unavailable"
              ? t("settings.builtInUnavailable")
              : group.availability === "degraded"
                ? t("settings.builtInDegraded")
                : t("settings.builtInAvailable");
          return (
            <SettingsRow
              key={group.id}
              title={t(GROUP_COPY[group.id][0])}
              description={t(GROUP_COPY[group.id][1])}
              status={t("settings.builtInToolAvailabilitySummary", {
                state,
                available: group.availableToolCount,
                total: group.toolCount,
              })}
              control={
                <Switch
                  checked={enabled}
                  disabled={settingsQuery.data === undefined}
                  aria-label={t("settings.builtInGroupToggle", {
                    group: t(GROUP_COPY[group.id][0]),
                  })}
                  onCheckedChange={(checked) => setGroupEnabled(group.id, checked)}
                />
              }
            />
          );
        })}
        {groupsQuery.isLoading ? (
          <SettingsRow
            title={t("settings.loadingBuiltInToolGroups")}
            description={t("settings.builtInToolsDescription")}
          />
        ) : null}
      </SettingsSection>
    </div>
  );
}
