// FILE: settingsNavigation.ts
// Purpose: Share the settings topic taxonomy between the main sidebar and the settings screen.
// Layer: Route/UI support
// Exports: section ids, nav items, and search normalization helper

import type { MessageKey } from "./i18n";
import { ADVANCED_SETTINGS_SEARCH } from "./settingsMetadata/advancedSettings";
import {
  APPEARANCE_SETTINGS_SEARCH,
  BEHAVIOR_SETTINGS_SEARCH,
  GENERAL_SETTINGS_SEARCH,
} from "./settingsMetadata/coreSettings";
import {
  APPSNAP_SETTINGS_SEARCH,
  NOTIFICATIONS_SETTINGS_SEARCH,
} from "./settingsMetadata/desktopSettings";
import { PROMPTS_SETTINGS_SEARCH } from "./settingsMetadata/promptSettings";
import { PROVIDERS_SETTINGS_SEARCH } from "./settingsMetadata/engineSettings";
import { WEB_SEARCH_SETTINGS_SEARCH } from "./settingsMetadata/webSearchSettings";
import {
  SETTINGS_TARGETS,
  defineSettingsSearchPanel,
  type OwnedSettingsSearchRecord,
} from "./settingsSearchMetadata";

export { SETTINGS_TARGETS } from "./settingsSearchMetadata";

export type SettingsNavGroupId = "personal" | "integrations" | "coding" | "system" | "archived";

export type SettingsNavItem = {
  readonly id: string;
  group: SettingsNavGroupId;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  /** Basename of a SVG under `/central-icons-reversed`. */
  icon: string;
  searchRecords: readonly OwnedSettingsSearchRecord[];
};

export const SETTINGS_NAV_GROUPS: ReadonlyArray<{
  id: SettingsNavGroupId;
  labelKey: MessageKey;
}> = [
  { id: "personal", labelKey: "settings.groupPersonal" },
  { id: "integrations", labelKey: "settings.groupIntegrations" },
  { id: "coding", labelKey: "settings.groupCoding" },
  { id: "system", labelKey: "settings.groupSystem" },
  { id: "archived", labelKey: "settings.groupArchived" },
] as const;

export const SETTINGS_NAV_ITEMS = [
  {
    id: "general",
    group: "personal",
    labelKey: "settings.general",
    descriptionKey: "settings.generalDescription",
    icon: "settings-gear-4",
    searchRecords: Object.values(GENERAL_SETTINGS_SEARCH),
  },
  {
    id: "profile",
    group: "personal",
    labelKey: "settings.profile",
    descriptionKey: "settings.profileDescription",
    icon: "chart-2",
    searchRecords: [],
  },
  {
    id: "appearance",
    group: "personal",
    labelKey: "settings.appearance",
    descriptionKey: "settings.appearanceDescription",
    icon: "color-palette",
    searchRecords: Object.values(APPEARANCE_SETTINGS_SEARCH),
  },
  {
    id: "notifications",
    group: "personal",
    labelKey: "settings.notifications",
    descriptionKey: "settings.notificationsDescription",
    icon: "bell",
    searchRecords: Object.values(NOTIFICATIONS_SETTINGS_SEARCH),
  },
  {
    id: "behavior",
    group: "personal",
    labelKey: "settings.behavior",
    descriptionKey: "settings.behaviorDescription",
    icon: "settings-slider-hor",
    searchRecords: Object.values(BEHAVIOR_SETTINGS_SEARCH),
  },
  {
    id: "shortcuts",
    group: "personal",
    labelKey: "settings.shortcuts",
    descriptionKey: "settings.shortcutsDescription",
    icon: "shortcut",
    searchRecords: [
      defineSettingsSearchPanel({
        id: "shortcuts:keyboard-shortcuts",
        titleKey: "settings.keybindings",
        keywords:
          "Every keyboard shortcut available in HarnessOS, grouped by context. keybindings hotkeys key combo cmd ctrl reference",
      }),
    ],
  },
  {
    id: "usage",
    group: "personal",
    labelKey: "settings.usage",
    descriptionKey: "settings.usagePanelDescription",
    icon: "gauge",
    searchRecords: [
      defineSettingsSearchPanel({
        id: "usage:usage",
        titleKey: "settings.usage",
        keywords: "Remaining quota and credits for each signed-in engine. limits credits",
      }),
    ],
  },
  {
    id: "appsnap",
    group: "integrations",
    labelKey: "settings.appsnap",
    descriptionKey: "settings.appsnapDescription",
    icon: "screen-capture",
    searchRecords: Object.values(APPSNAP_SETTINGS_SEARCH),
  },
  {
    id: "built-in-tools",
    group: "integrations",
    labelKey: "settings.builtInTools",
    descriptionKey: "settings.builtInToolsDescription",
    icon: "toolbox",
    searchRecords: [
      defineSettingsSearchPanel({
        id: "built-in-tools:groups",
        titleKey: "settings.builtInTools",
        keywords:
          "Agent capabilities HarnessOS Browser Device availability enabled disabled exposure tools",
      }),
    ],
  },
  {
    id: "integrations",
    group: "integrations",
    labelKey: "settings.integrations",
    descriptionKey: "settings.integrationsDescription",
    icon: "plugin-1",
    searchRecords: [
      defineSettingsSearchPanel({
        id: "integrations:external-mcp",
        titleKey: "settings.integrations",
        keywords:
          "Pair Codex Claude Code and other local apps with scoped project access. revoke credential task create wait read worktree approval MCP",
      }),
    ],
  },
  {
    id: "engines",
    group: "coding",
    labelKey: "settings.engines",
    descriptionKey: "settings.enginesDescription",
    icon: "puzzle",
    searchRecords: Object.values(PROVIDERS_SETTINGS_SEARCH),
  },
  {
    id: "models",
    group: "coding",
    labelKey: "settings.models",
    descriptionKey: "settings.modelsDescription",
    icon: "brain",
    searchRecords: [
      defineSettingsSearchPanel({
        id: "models:model-services",
        titleKey: "settings.models",
        keywords:
          "Configure HarnessOS model services credentials authentication available models catalog engine API key OAuth.",
      }),
    ],
  },
  {
    id: "web-search",
    group: "coding",
    labelKey: "settings.webSearch",
    descriptionKey: "settings.webSearchDescription",
    icon: "globe",
    searchRecords: Object.values(WEB_SEARCH_SETTINGS_SEARCH),
  },
  {
    id: "skills",
    group: "coding",
    labelKey: "settings.skills",
    descriptionKey: "settings.skillsDescription",
    icon: "building-blocks",
    searchRecords: [
      defineSettingsSearchPanel({
        id: "skills:skills",
        titleKey: "settings.skills",
        keywords: "Every skill found across engines, with toggles to control availability. agent",
      }),
    ],
  },
  {
    id: "prompts",
    group: "coding",
    labelKey: "settings.prompts",
    descriptionKey: "settings.promptsDescription",
    icon: "prompt",
    searchRecords: Object.values(PROMPTS_SETTINGS_SEARCH),
  },
  {
    id: "worktrees",
    group: "coding",
    labelKey: "settings.worktrees",
    descriptionKey: "settings.worktreesDescription",
    icon: "branch-simple",
    searchRecords: [
      defineSettingsSearchPanel({
        id: "worktrees:managed-worktrees",
        titleKey: "settings.worktrees",
        keywords: "Review and clean up the worktrees created by HarnessOS. git branch remove",
      }),
    ],
  },
  {
    id: "advanced",
    group: "system",
    labelKey: "settings.advanced",
    descriptionKey: "settings.advancedDescription",
    icon: "toolbox",
    searchRecords: Object.values(ADVANCED_SETTINGS_SEARCH),
  },
  {
    id: "archived",
    group: "archived",
    labelKey: "settings.archived",
    descriptionKey: "settings.archivedDescription",
    icon: "archive",
    searchRecords: [
      defineSettingsSearchPanel({
        id: "archived:archived-threads",
        titleKey: "settings.archived",
        keywords: "View and restore archived threads. unarchive history",
      }),
    ],
  },
] as const satisfies readonly SettingsNavItem[];

export type SettingsSectionId = (typeof SETTINGS_NAV_ITEMS)[number]["id"];

export const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = SETTINGS_NAV_ITEMS.map(
  (item) => item.id,
);

export const SETTINGS_SECTION_BY_ID = new Map<
  SettingsSectionId,
  (typeof SETTINGS_NAV_ITEMS)[number]
>(SETTINGS_NAV_ITEMS.map((item) => [item.id, item]));

export function normalizeSettingsSection(value: unknown): SettingsSectionId {
  if (typeof value !== "string") {
    return "general";
  }
  return SETTINGS_SECTION_IDS.find((candidate) => candidate === value) ?? "general";
}
