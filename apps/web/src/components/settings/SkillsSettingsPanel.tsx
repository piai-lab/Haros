// FILE: SkillsSettingsPanel.tsx
// Purpose: Settings → Skills panel. Lists every skill from the unified cross-engine
// catalog (~/.harnessos/skills plus each engine's skills folder), shows which engine
// a skill comes from, and lets the user enable/disable each one. Disabled skills are
// hidden from the composer skill picker on every engine.

import type { EngineKind, ServerSettings } from "@harnessos/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { EngineIcon } from "~/components/EngineIcon";
import { SettingsRow, SettingsSection } from "~/components/settings/SettingsPanelPrimitives";
import { Switch } from "~/components/ui/switch";
import { SkillCubeIcon } from "~/lib/icons";
import { ensureNativeApi } from "~/nativeApi";
import {
  engineDiscoveryQueryKeys,
  skillsCatalogQueryOptions,
} from "~/lib/engineDiscoveryReactQuery";
import { serverQueryKeys, serverSettingsQueryOptions } from "~/lib/serverReactQuery";
import { useI18n } from "~/i18n";
import {
  buildSettingsSkillGroups,
  buildSettingsSkillSections,
  isHarosSkillSource,
  engineDisplayName,
  settingsSkillNameKey,
} from "./skillsSettingsModel";

function SkillEngineStack({ engines }: { engines: ReadonlyArray<EngineKind> }) {
  const { t } = useI18n();
  if (engines.length === 0) {
    return null;
  }

  const label = engines.map(engineDisplayName).join(", ");
  const stackLabel = t(engines.length === 1 ? "settings.engineCopy" : "settings.engineCopies", {
    engines: label,
  });
  return (
    <span
      className="inline-flex shrink-0 items-center -space-x-1"
      aria-label={stackLabel}
      title={stackLabel}
    >
      {engines.map((engine) => (
        <span
          key={engine}
          className="inline-flex size-4 items-center justify-center rounded-full border border-background bg-background"
        >
          <EngineIcon engine={engine} className="size-3" />
        </span>
      ))}
    </span>
  );
}

export function SkillsSettingsPanel() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const catalogQuery = useQuery(skillsCatalogQueryOptions());
  const serverSettingsQuery = useQuery(serverSettingsQueryOptions());

  const disabledSkillNames = new Set(
    (serverSettingsQuery.data?.skills.disabled ?? []).map((name) => settingsSkillNameKey(name)),
  );

  const skillGroups = buildSettingsSkillGroups(catalogQuery.data?.skills ?? []);
  const skillSections = buildSettingsSkillSections(catalogQuery.data?.skills ?? []);

  const setSkillEnabled = (skillName: string, enabled: boolean) => {
    // Read through the query cache (not the render closure) so rapid toggles
    // build on each other instead of clobbering the previous patch.
    const latestSettings = queryClient.getQueryData<ServerSettings>(serverQueryKeys.settings());
    const currentDisabled = latestSettings?.skills.disabled ?? [...disabledSkillNames];
    const key = settingsSkillNameKey(skillName);
    const next = new Set(currentDisabled.map((name) => settingsSkillNameKey(name)));
    if (enabled) {
      next.delete(key);
    } else {
      next.add(key);
    }
    const disabled = [...next].sort();
    if (latestSettings) {
      // Optimistic flip; a failed patch invalidates back to the server state.
      queryClient.setQueryData(serverQueryKeys.settings(), {
        ...latestSettings,
        skills: { disabled },
      });
    }
    void ensureNativeApi()
      .server.updateSettings({ skills: { disabled } })
      .then((nextSettings) => {
        queryClient.setQueryData(serverQueryKeys.settings(), nextSettings);
        // Composer skill pickers are served filtered by these toggles.
        void queryClient.invalidateQueries({ queryKey: engineDiscoveryQueryKeys.all });
      })
      .catch(() => {
        void queryClient.invalidateQueries({ queryKey: serverQueryKeys.settings() });
      });
  };

  const harnessosSkillGroups = skillGroups.filter((group) =>
    group.sources.some((source) => isHarosSkillSource(source.skill)),
  );
  const enabledHarosSkills = harnessosSkillGroups.filter(
    (group) => !disabledSkillNames.has(group.key),
  ).length;
  const harnessosSkillsDir = catalogQuery.data?.harnessosSkillsDir;

  return (
    <div className="space-y-8">
      <SettingsSection title={t("settings.portableSkills")}>
        <SettingsRow
          title={t("settings.skillsFolder")}
          description={t("settings.skillsFolderDescription")}
          status={
            harnessosSkillsDir ? (
              <code className="break-all text-[11px] text-muted-foreground">
                {harnessosSkillsDir}
              </code>
            ) : null
          }
          control={
            <span className="text-xs font-medium text-muted-foreground">
              {catalogQuery.isLoading
                ? t("settings.scanning")
                : t("settings.enabledSkillsSummary", {
                    enabled: enabledHarosSkills,
                    total: harnessosSkillGroups.length,
                  })}
            </span>
          }
        />
      </SettingsSection>

      {catalogQuery.isError ? (
        <SettingsSection title={t("settings.skills")}>
          <SettingsRow
            title={t("settings.skillDiscoveryFailed")}
            description={t("settings.skillDiscoveryFailedDescription")}
          />
        </SettingsSection>
      ) : null}

      {!catalogQuery.isLoading && !catalogQuery.isError && skillGroups.length === 0 ? (
        <SettingsSection title={t("settings.skills")}>
          <SettingsRow
            title={t("settings.noSkills")}
            description={t("settings.noSkillsDescription")}
          />
        </SettingsSection>
      ) : null}

      {skillSections.map((section) => {
        return (
          <SettingsSection key={section.key} title={section.title}>
            {section.groups.map((group) => {
              const harnessosOwned = group.sources.some((source) =>
                isHarosSkillSource(source.skill),
              );
              const enabled = !disabledSkillNames.has(group.key);
              return (
                <SettingsRow
                  key={group.key}
                  title={
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <SkillCubeIcon
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-muted-foreground"
                      />
                      <span className="truncate">{group.displayName}</span>
                    </span>
                  }
                  description={group.description}
                  status={
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <SkillEngineStack engines={group.engines} />
                        <span className="truncate text-[11px] text-muted-foreground">
                          {group.sources.map((source) => source.originInfo.label).join(" · ")}
                        </span>
                      </span>
                      {group.sources.map((source) => (
                        <code
                          key={source.skill.path}
                          className="truncate text-[11px] text-muted-foreground"
                        >
                          {source.skill.path}
                        </code>
                      ))}
                    </span>
                  }
                  control={
                    harnessosOwned ? (
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          setSkillEnabled(group.primarySkill.name, Boolean(checked))
                        }
                        aria-label={t("settings.enableHarosSkill", {
                          skill: group.displayName,
                        })}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("settings.engineManaged")}
                      </span>
                    )
                  }
                />
              );
            })}
          </SettingsSection>
        );
      })}
    </div>
  );
}
