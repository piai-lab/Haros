// FILE: settingsSearchIndex.ts
// Purpose: Declarative, searchable index of settings rows/sections so the sidebar can
//          surface matches by title/description the same way the editor file search does.
// Layer: Route/UI support
// Exports: entry type, the index, section label lookup, and the ranking helper

import { rankProviderDiscoveryItems } from "~/lib/providerDiscovery";
import type { MessageKey } from "~/i18n";
import {
  settingRowAnchorId,
  SETTINGS_NAV_ITEMS,
  SETTINGS_TARGETS,
  type SettingsSectionId,
} from "./settingsNavigation";

/**
 * One searchable settings result. `title` usually matches a string SettingsRow heading so
 * the default anchor can be derived; `target: null` marks panel-only or conditional rows.
 */
export interface SettingsSearchEntry {
  id: string;
  section: SettingsSectionId;
  title: string;
  keywords: string;
  target?: string | null;
}

/** DOM id a result deep-links to, or null for panel-level entries with no anchored row. */
export function settingsSearchEntryTarget(entry: SettingsSearchEntry): string | null {
  return entry.target === undefined ? settingRowAnchorId(entry.title) : entry.target;
}

// Mirrors row titles/descriptions rendered in settings panels. Panels stay mounted but render
// null while inactive, so the sidebar cannot read every row at runtime; keep this list in sync
// when rows are added, renamed, hidden conditionally, or represented as panel-level results.
export const SETTINGS_SEARCH_ENTRIES: readonly SettingsSearchEntry[] = [
  // ── General ────────────────────────────────────────────────────────────────
  {
    id: "general:default-provider",
    section: "general",
    title: "Default provider",
    keywords: "Choose the provider used for new chats. agent codex claude",
  },
  {
    id: "general:new-threads",
    section: "general",
    title: "New threads",
    keywords:
      "Pick the default workspace mode for newly created draft threads. local worktree environment",
  },
  {
    id: "general:project-order",
    section: "general",
    title: "Project order",
    keywords: "Controls how projects are arranged in the main sidebar. sort updated created manual",
  },
  {
    id: "general:thread-order",
    section: "general",
    title: "Thread order",
    keywords:
      "Controls how threads are arranged inside each project in the main sidebar. sort updated created",
  },
  {
    id: "general:studio-section",
    section: "general",
    title: "Chat",
    keywords:
      "Show the Chat tab in the Agent | Chat switcher. sidebar section content outbox studio",
  },
  {
    id: "general:environment-default-open",
    section: "general",
    title: "Open by default",
    keywords:
      "Open the chat Environment panel automatically on normal threads. default closed open environment panel preference",
  },
  {
    id: "general:environment-usage",
    section: "general",
    title: "Usage",
    keywords: "Show the provider usage row in the chat Environment panel.",
  },
  {
    id: "general:environment-repository",
    section: "general",
    title: "Repository",
    keywords: "Show the GitHub repository link in the chat Environment panel. git changes worktree",
  },
  {
    id: "general:git-writing-model",
    section: "general",
    title: "Git writing model",
    keywords:
      "Choose the model used to generate commit messages pull request titles and branch names.",
    target: SETTINGS_TARGETS.gitWritingModel,
  },
  {
    id: "general:environment-pull-request",
    section: "general",
    title: "Pull request",
    keywords:
      "Show the open pull request CI checks and review comments in the chat Environment panel. pr fix github",
  },
  {
    id: "general:environment-editor",
    section: "general",
    title: "Editor",
    keywords:
      "Show the Editor section in-app editor view and Open in editor picker in the chat Environment panel.",
  },
  {
    id: "general:environment-recap",
    section: "general",
    title: "Recap",
    keywords: "Show the auto-generated chat recap in the Environment panel.",
  },
  {
    id: "general:environment-pinned",
    section: "general",
    title: "Pinned messages",
    keywords: "Show the pinned-messages checklist in the Environment panel.",
  },
  {
    id: "general:environment-markers",
    section: "general",
    title: "Text markers",
    keywords: "Show highlighted and underlined transcript text in the Environment panel.",
  },
  {
    id: "general:environment-instructions",
    section: "general",
    title: "Project instructions",
    keywords: "Show project-level instructions in the Environment panel.",
  },
  {
    id: "general:environment-notepad",
    section: "general",
    title: "Notepad",
    keywords: "Show the per-thread notepad in the Environment panel.",
  },

  // ── Appearance ───────────────────────────────────────────────────────────────
  {
    id: "appearance:theme",
    section: "appearance",
    title: "Theme",
    keywords: "Choose how OmniMind looks across the app. dark light system color",
  },
  {
    id: "appearance:app-icon",
    section: "appearance",
    title: "App icon",
    keywords: "Choose the icon OmniMind uses in the dock or taskbar desktop application logo.",
    target: null,
  },
  {
    id: "appearance:system-ui-font",
    section: "appearance",
    title: "Use system UI font",
    keywords: "Use the operating system interface font throughout OmniMind.",
  },
  {
    id: "appearance:ui-density",
    section: "appearance",
    title: "UI density",
    keywords:
      "Control spacing in the sidebar, composer, chat gutters, and settings rows without changing font size. compact comfortable",
  },
  {
    id: "appearance:base-font-size",
    section: "appearance",
    title: "Base font size",
    keywords:
      "Adjust the app text base in pixels. Chat and UI typography scale proportionally. font",
  },
  {
    id: "appearance:terminal-font-size",
    section: "appearance",
    title: "Terminal font size",
    keywords: "Adjust terminal text independently from the app and chat font size.",
  },
  {
    id: "appearance:terminal-font",
    section: "appearance",
    title: "Terminal font",
    keywords:
      "Type any monospace font installed on this device e.g. Fira Code. system monospace family",
  },
  {
    id: "appearance:font-smoothing",
    section: "appearance",
    title: "Font smoothing",
    keywords: "Use macOS-style antialiasing for lighter, crisper text rendering.",
    target: null,
  },
  {
    id: "appearance:time-format",
    section: "appearance",
    title: "Time format",
    keywords:
      "System default follows your browser or OS clock preference. timestamp 12-hour 24-hour locale",
  },

  // ── Notifications ─────────────────────────────────────────────────────────────
  {
    id: "notifications:activity-toasts",
    section: "notifications",
    title: "Activity toasts",
    keywords:
      "Show an in-app toast when a chat or managed terminal agent finishes or needs input. alerts",
  },
  {
    id: "notifications:desktop-notifications",
    section: "notifications",
    title: "Desktop notifications",
    keywords:
      "Show an OS notification when a chat or managed terminal agent finishes or needs input while the app is in the background. alerts toast",
  },

  // ── AppSnap ───────────────────────────────────────────────────────────────────
  {
    id: "appsnap:enable",
    section: "appsnap",
    title: "Enable AppSnap",
    keywords:
      "Capture the frontmost macOS app window with a configurable two-key shortcut and add it to a recent task. appshot screenshot snap window capture hotkey",
  },
  {
    id: "appsnap:shortcut",
    section: "appsnap",
    title: "Shortcut",
    keywords: "Press the left and right Option keys at the same time. hotkey chord alt keys",
  },
  {
    id: "appsnap:destination",
    section: "appsnap",
    title: "Destination",
    keywords:
      "Snaps join the task you interacted with in the last minute, otherwise a fresh task opens. automatic target composer",
  },
  {
    id: "appsnap:capture-sound",
    section: "appsnap",
    title: "Capture sound",
    keywords: "Play a short shutter cue when a window is captured. sound effect audio mute",
  },
  {
    id: "appsnap:permissions",
    section: "appsnap",
    title: "Permission status",
    keywords:
      "Input Monitoring and Screen Recording permissions for AppSnap in macOS System Settings. privacy security recheck grant",
    // Renders only in the macOS desktop app, so no stable anchor on other platforms.
    target: null,
  },

  // ── Behavior ──────────────────────────────────────────────────────────────────
  {
    id: "behavior:follow-up-behavior",
    section: "behavior",
    title: "Follow-up behavior",
    keywords:
      "Choose whether messages sent during an active turn wait in the queue or steer the current run. Ctrl Cmd Enter opposite send",
  },
  {
    id: "behavior:assistant-output",
    section: "behavior",
    title: "Assistant output",
    keywords: "Show token-by-token output while a response is in progress. streaming",
  },
  {
    id: "behavior:diff-line-wrapping",
    section: "behavior",
    title: "Diff line wrapping",
    keywords: "Set the default wrap state when the diff panel opens. word wrap",
  },
  {
    id: "behavior:delete-confirmation",
    section: "behavior",
    title: "Delete confirmation",
    keywords: "Ask before deleting a thread and its chat history. safety confirm",
  },
  {
    id: "behavior:archive-confirmation",
    section: "behavior",
    title: "Archive confirmation",
    keywords: "Ask before archiving a thread. safety confirm",
  },
  {
    id: "behavior:terminal-close-confirmation",
    section: "behavior",
    title: "Terminal close confirmation",
    keywords: "Ask before closing a terminal tab and clearing its history. safety confirm",
  },

  // ── Keybindings ───────────────────────────────────────────────────────────────
  {
    id: "shortcuts:keyboard-shortcuts",
    section: "shortcuts",
    title: "Keybindings",
    keywords:
      "Every keyboard shortcut available in OmniMind, grouped by context. keybindings hotkeys key combo cmd ctrl reference",
    target: null,
  },

  // ── Worktrees ─────────────────────────────────────────────────────────────────
  {
    id: "worktrees:managed-worktrees",
    section: "worktrees",
    title: "Managed worktrees",
    keywords: "Review and clean up the worktrees created by OmniMind. git branch remove",
    target: null,
  },

  // ── Archived ──────────────────────────────────────────────────────────────────
  {
    id: "archived:archived-threads",
    section: "archived",
    title: "Archived threads",
    keywords: "View and restore archived threads. unarchive history",
    target: null,
  },

  // ── Models ────────────────────────────────────────────────────────────────────
  {
    id: "models:model-services",
    section: "models",
    title: "Model services",
    keywords:
      "Configure OmniMind model services credentials authentication available models catalog provider API key OAuth.",
    target: null,
  },

  // Independent Engine model controls live inside the existing Agent engines details.
  {
    id: "providers:independent-engine-models",
    section: "providers",
    title: "Independent engine models",
    keywords: "Add remove reset custom model slugs managed by each engine.",
    target: SETTINGS_TARGETS.engineDetails,
  },

  // ── Providers ─────────────────────────────────────────────────────────────────
  {
    id: "providers:automatic-cli-update-checks",
    section: "providers",
    title: "Automatic CLI update checks",
    keywords:
      "Check Codex Claude and other provider CLIs for newer versions in the background. updates upgrade disable nags",
  },
  {
    id: "providers:visible-providers",
    section: "providers",
    title: "Visible providers",
    keywords:
      "Drag providers into your preferred picker order and hide the ones you don't use. visibility order",
  },
  {
    id: "providers:provider-updates",
    section: "providers",
    title: "Provider updates",
    keywords: "Update installed provider tools that OmniMind can safely update. upgrade cli",
  },
  {
    id: "providers:installed-clis",
    section: "providers",
    title: "Engine details",
    keywords:
      "Review engine versions, paths, update tools, and custom model slugs. binary overrides install",
    target: SETTINGS_TARGETS.engineDetails,
  },

  // ── Skills ────────────────────────────────────────────────────────────────────
  {
    id: "skills:skills",
    section: "skills",
    title: "Skills",
    keywords: "Every skill found across providers, with toggles to control availability. agent",
    target: null,
  },

  // ── Usage ─────────────────────────────────────────────────────────────────────
  {
    id: "usage:usage",
    section: "usage",
    title: "Usage and billing",
    keywords: "Remaining quota and credits for each signed-in provider. limits credits",
    target: null,
  },

  // ── Advanced ──────────────────────────────────────────────────────────────────
  {
    id: "advanced:keybindings",
    section: "advanced",
    title: "Keybindings",
    keywords:
      "Open the persisted keybindings.json file to edit advanced bindings directly. shortcuts",
  },
  {
    id: "advanced:recovery-tools",
    section: "advanced",
    title: "Recovery tools",
    keywords:
      "Rebuild local project indexes without clearing existing chats when the local state gets out of sync.",
  },
  {
    id: "integrations:external-mcp",
    section: "integrations",
    title: "External MCP integrations",
    keywords:
      "Pair Codex Claude and other local MCP clients with scoped project access. revoke credential task create wait read worktree approval",
  },
  {
    id: "advanced:version",
    section: "advanced",
    title: "Version",
    keywords: "Current application version. about",
  },
  {
    id: "advanced:release-history",
    section: "advanced",
    title: "Release history",
    keywords:
      "A running log of every update, newest first. changelog what's new about release notes",
  },
] as const;

const SETTINGS_SECTION_LABEL_BY_ID = new Map<SettingsSectionId, string>(
  SETTINGS_NAV_ITEMS.map((item) => [item.id, item.label]),
);

export function settingsSectionLabel(section: SettingsSectionId): string {
  return SETTINGS_SECTION_LABEL_BY_ID.get(section) ?? section;
}

/**
 * Fuzzy-rank settings rows for the sidebar search. Title carries the strongest intent;
 * the description/synonym keywords and the owning section label match more loosely so a
 * query like "appearance" or "wrap" still surfaces the right rows.
 */
export function rankSettingsSearchEntries(
  query: string,
  limit: number,
  translate?: (key: MessageKey) => string,
): readonly SettingsSearchEntry[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const entries = translate
    ? SETTINGS_SEARCH_ENTRIES.map((entry) => ({
        ...entry,
        title: localizeSettingsSearchEntryTitle(entry, translate),
      }))
    : SETTINGS_SEARCH_ENTRIES;
  const ranked = rankProviderDiscoveryItems(entries, trimmed, (entry) => [
    { value: entry.title },
    { value: entry.keywords, weight: 200 },
    { value: settingsSectionLabel(entry.section), weight: 400 },
  ]);
  return ranked.slice(0, limit);
}

const SETTINGS_SEARCH_TITLE_KEY_BY_TITLE: Readonly<Record<string, MessageKey>> = {
  "Activity toasts": "settings.activityToasts",
  "App icon": "settings.appIcon",
  "Archive confirmation": "settings.archiveConfirmation",
  "Archived threads": "settings.archived",
  "Assistant output": "settings.assistantOutput",
  "Automatic CLI update checks": "settings.automaticCliUpdates",
  "Base font size": "settings.baseFontSize",
  "Capture sound": "settings.captureSound",
  Chat: "nav.chat",
  "Default provider": "settings.defaultProvider",
  "Delete confirmation": "settings.deleteConfirmation",
  "Desktop notifications": "settings.desktopNotifications",
  Destination: "settings.destination",
  "Diff line wrapping": "settings.diffLineWrapping",
  Editor: "settings.editor",
  "Enable AppSnap": "settings.enableAppSnap",
  "External MCP integrations": "settings.integrations",
  "Follow-up behavior": "settings.followUpBehavior",
  "Font smoothing": "settings.fontSmoothing",
  "Git writing model": "settings.gitWritingModel",
  "Engine details": "settings.installedClis",
  "Independent engine models": "settings.independentEngineModels",
  Keybindings: "settings.keybindings",
  "Managed worktrees": "settings.worktrees",
  "Model services": "settings.models",
  "New threads": "settings.newThreads",
  Notepad: "settings.notepad",
  "Open by default": "settings.openByDefault",
  "Permission status": "settings.permissionStatus",
  "Pinned messages": "settings.pinnedMessages",
  "Project instructions": "settings.projectInstructions",
  "Project order": "settings.projectOrder",
  "Provider updates": "settings.providerUpdates",
  "Pull request": "settings.pullRequest",
  Recap: "settings.recap",
  "Recovery tools": "settings.recoveryTools",
  "Release history": "settings.releaseHistory",
  Repository: "settings.repositoryLabel",
  Shortcut: "settings.shortcut",
  Skills: "settings.skills",
  "Terminal close confirmation": "settings.terminalCloseConfirmation",
  "Terminal font": "settings.terminalFont",
  "Terminal font size": "settings.terminalFontSize",
  "Text markers": "settings.textMarkers",
  Theme: "settings.theme",
  "Thread order": "settings.threadOrder",
  "Time format": "settings.timeFormat",
  "UI density": "settings.uiDensity",
  Usage: "settings.usageLabel",
  "Usage and billing": "settings.usage",
  "Use system UI font": "settings.systemUiFont",
  Version: "settings.version",
  "Visible providers": "settings.visibleProviders",
};

/** Project a stable English anchor record into the active product language. */
export function localizeSettingsSearchEntryTitle(
  entry: SettingsSearchEntry,
  translate: (key: MessageKey) => string,
): string {
  const titleKey = SETTINGS_SEARCH_TITLE_KEY_BY_TITLE[entry.title];
  if (!titleKey) {
    throw new Error(`Missing localized Settings search title: ${entry.title}`);
  }
  return translate(titleKey);
}
