// FILE: shortcutsSheet.ts
// Purpose: Build the shortcut reference sections shown by the keyboard shortcuts sheet.
// Layer: UI helper
// Depends on: keybinding label resolution, project script command mapping, and platform helpers.

import {
  STATIC_KEYBINDING_COMMANDS,
  type KeybindingCommand,
  type ResolvedKeybindingRule,
  type ResolvedKeybindingsConfig,
} from "@omnimind/contracts";
import { isMacPlatform } from "./lib/utils";
import { formatShortcutLabel, resolveKeybindingForCommand } from "./keybindings";
import { commandForProjectScript } from "./projectScripts";
import type { ProjectScript } from "./types";
import { translate, type MessageKey } from "./i18n";

type ShortcutTranslate = (
  key: MessageKey,
  params?: Readonly<Record<string, string | number>>,
) => string;

const english: ShortcutTranslate = (key, params) => translate("en", key, params);

export interface ShortcutSheetContext {
  terminalFocus: boolean;
  terminalOpen: boolean;
  terminalWorkspaceOpen: boolean;
  [key: string]: boolean;
}

export interface ShortcutSheetEntry {
  id: string;
  command: KeybindingCommand | null;
  binding: ResolvedKeybindingRule | null;
  label: string;
  description: string;
  shortcutLabel: string;
}

export interface ShortcutSheetSection {
  id: string;
  title: string;
  description: string;
  tone?: "default" | "muted";
  entries: ShortcutSheetEntry[];
}

interface BuildShortcutSheetSectionsOptions {
  keybindings: ResolvedKeybindingsConfig;
  projectScripts: ReadonlyArray<ProjectScript>;
  platform: string;
  context: ShortcutSheetContext;
  translate?: ShortcutTranslate;
}

interface ShortcutDefinition {
  command: KeybindingCommand | readonly KeybindingCommand[];
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  params?: Readonly<Record<string, string | number>>;
}

const AVAILABLE_NOW_DEFINITIONS: readonly ShortcutDefinition[] = [
  {
    command: "sidebar.addProject",
    labelKey: "shortcuts.addProject",
    descriptionKey: "shortcuts.addProjectDescription",
  },
  {
    command: "sidebar.search",
    labelKey: "shortcuts.searchProjects",
    descriptionKey: "shortcuts.searchProjectsDescription",
  },
  {
    command: "sidebar.activity",
    labelKey: "shortcuts.toggleActivity",
    descriptionKey: "shortcuts.toggleActivityDescription",
  },
  {
    command: "sidebar.importThread",
    labelKey: "shortcuts.importThread",
    descriptionKey: "shortcuts.importThreadDescription",
  },
  {
    command: "chat.new",
    labelKey: "shortcuts.newThread",
    descriptionKey: "shortcuts.newThreadDescription",
  },
  {
    command: "chat.newLatestProject",
    labelKey: "shortcuts.newLatestProjectThread",
    descriptionKey: "shortcuts.newLatestProjectThreadDescription",
  },
  {
    command: ["chat.newChat", "chat.newLocal"],
    labelKey: "shortcuts.newChat",
    descriptionKey: "shortcuts.newChatDescription",
  },
  {
    command: "chat.newTerminal",
    labelKey: "shortcuts.newTerminalThread",
    descriptionKey: "shortcuts.newTerminalThreadDescription",
  },
  {
    command: "chat.newClaude",
    labelKey: "shortcuts.newClaudeThread",
    descriptionKey: "shortcuts.newClaudeThreadDescription",
  },
  {
    command: "chat.newCodex",
    labelKey: "shortcuts.newCodexThread",
    descriptionKey: "shortcuts.newCodexThreadDescription",
  },
  {
    command: "chat.newCursor",
    labelKey: "shortcuts.newCursorThread",
    descriptionKey: "shortcuts.newCursorThreadDescription",
  },
  {
    command: "chat.split",
    labelKey: "shortcuts.splitChat",
    descriptionKey: "shortcuts.splitChatDescription",
  },
  {
    command: "view.recent.previous",
    labelKey: "shortcuts.previousRecentView",
    descriptionKey: "shortcuts.previousRecentViewDescription",
  },
  {
    command: "view.recent.next",
    labelKey: "shortcuts.nextRecentView",
    descriptionKey: "shortcuts.nextRecentViewDescription",
  },
  {
    command: "modelPicker.toggle",
    labelKey: "shortcuts.modelPicker",
    descriptionKey: "shortcuts.modelPickerDescription",
  },
  {
    command: "model.next",
    labelKey: "shortcuts.nextModel",
    descriptionKey: "shortcuts.nextModelDescription",
  },
  {
    command: "model.previous",
    labelKey: "shortcuts.previousModel",
    descriptionKey: "shortcuts.previousModelDescription",
  },
  {
    command: "traitsPicker.toggle",
    labelKey: "shortcuts.reasoningPicker",
    descriptionKey: "shortcuts.reasoningPickerDescription",
  },
  {
    command: "composer.focus.toggle",
    labelKey: "shortcuts.focusComposer",
    descriptionKey: "shortcuts.focusComposerDescription",
  },
  {
    command: "terminal.toggle",
    labelKey: "shortcuts.toggleTerminal",
    descriptionKey: "shortcuts.toggleTerminalDescription",
  },
  {
    command: "diff.toggle",
    labelKey: "shortcuts.toggleDiff",
    descriptionKey: "shortcuts.toggleDiffDescription",
  },
  {
    command: "browser.toggle",
    labelKey: "shortcuts.toggleBrowser",
    descriptionKey: "shortcuts.toggleBrowserDescription",
  },
  {
    command: "device.toggle",
    labelKey: "shortcuts.toggleDevice",
    descriptionKey: "shortcuts.toggleDeviceDescription",
  },
  {
    command: "thread.copyId",
    labelKey: "shortcuts.copyThreadId",
    descriptionKey: "shortcuts.copyThreadIdDescription",
  },
  {
    command: "chat.visible.previous",
    labelKey: "shortcuts.previousVisibleThread",
    descriptionKey: "shortcuts.previousVisibleThreadDescription",
  },
  {
    command: "chat.visible.next",
    labelKey: "shortcuts.nextVisibleThread",
    descriptionKey: "shortcuts.nextVisibleThreadDescription",
  },
  {
    command: "editor.openFavorite",
    labelKey: "shortcuts.openFavoriteEditor",
    descriptionKey: "shortcuts.openFavoriteEditorDescription",
  },
  {
    command: "git.commitAndPush",
    labelKey: "shortcuts.commitAndPush",
    descriptionKey: "shortcuts.commitAndPushDescription",
  },
] as const;

const THREAD_JUMP_DEFINITIONS: readonly ShortcutDefinition[] = Array.from(
  { length: 9 },
  (_, index) => ({
    command: `thread.jump.${index + 1}` as KeybindingCommand,
    labelKey: "shortcuts.jumpVisibleThread",
    descriptionKey: "shortcuts.jumpVisibleThreadDescription",
    params: { number: index + 1 },
  }),
);

const WORKSPACE_DEFINITIONS: readonly ShortcutDefinition[] = [
  {
    command: "terminal.workspace.newFullWidth",
    labelKey: "shortcuts.openTerminalWorkspace",
    descriptionKey: "shortcuts.openTerminalWorkspaceDescription",
  },
  {
    command: "terminal.workspace.terminal",
    labelKey: "shortcuts.focusTerminal",
    descriptionKey: "shortcuts.focusTerminalDescription",
  },
  {
    command: "terminal.workspace.chat",
    labelKey: "shortcuts.focusChat",
    descriptionKey: "shortcuts.focusChatDescription",
  },
  {
    command: "terminal.workspace.closeActive",
    labelKey: "shortcuts.closeWorkspacePanel",
    descriptionKey: "shortcuts.closeWorkspacePanelDescription",
  },
] as const;

const SIDEBAR_TOGGLE_DEFINITION: ShortcutDefinition = {
  command: "sidebar.toggle",
  labelKey: "shortcuts.toggleSidebar",
  descriptionKey: "shortcuts.toggleSidebarDescription",
};

export interface EditableShortcutDefinition {
  command: KeybindingCommand;
  label: string;
  description: string;
}

/** All built-in commands that can be assigned from Settings → Keybindings. */
export function listEditableShortcutDefinitions(
  t: ShortcutTranslate = english,
): EditableShortcutDefinition[] {
  const definitionsByCommand = new Map<KeybindingCommand, EditableShortcutDefinition>();
  for (const definition of [
    SIDEBAR_TOGGLE_DEFINITION,
    ...AVAILABLE_NOW_DEFINITIONS,
    ...WORKSPACE_DEFINITIONS,
    ...THREAD_JUMP_DEFINITIONS,
  ]) {
    const commands = Array.isArray(definition.command) ? definition.command : [definition.command];
    for (const command of commands) {
      definitionsByCommand.set(command, {
        command,
        label: t(definition.labelKey, definition.params),
        description: t(definition.descriptionKey, definition.params),
      });
    }
  }

  return STATIC_KEYBINDING_COMMANDS.filter((command) => !command.startsWith("space.")).map(
    (command): EditableShortcutDefinition =>
      definitionsByCommand.get(command) ?? {
        command,
        label: command,
        description: t("shortcuts.assignBuiltInDescription"),
      },
  );
}

function modSlashLabel(platform: string): string {
  return isMacPlatform(platform) ? "⌘/" : "Ctrl+/";
}

/** Human-readable sheet label for a keybinding command, e.g. `chat.new` → "New thread". */
export function shortcutSheetCommandLabel(
  command: KeybindingCommand,
  t: ShortcutTranslate = english,
): string | null {
  for (const definitions of [
    AVAILABLE_NOW_DEFINITIONS,
    WORKSPACE_DEFINITIONS,
    THREAD_JUMP_DEFINITIONS,
  ]) {
    for (const definition of definitions) {
      const commands = Array.isArray(definition.command)
        ? definition.command
        : [definition.command];
      if (commands.includes(command)) return t(definition.labelKey, definition.params);
    }
  }
  return null;
}

function definitionToEntry(
  definition: ShortcutDefinition,
  keybindings: ResolvedKeybindingsConfig,
  platform: string,
  context: ShortcutSheetContext,
  t: ShortcutTranslate,
): ShortcutSheetEntry | null {
  const commands = Array.isArray(definition.command) ? definition.command : [definition.command];
  const binding = commands.reduce<ResolvedKeybindingRule | null>(
    (resolved, command) =>
      resolved ?? resolveKeybindingForCommand(keybindings, command, { platform, context }),
    null,
  );
  if (!binding) return null;
  return {
    id: binding.command,
    command: binding.command,
    binding,
    label: t(definition.labelKey, definition.params),
    description: t(definition.descriptionKey, definition.params),
    shortcutLabel: formatShortcutLabel(binding.shortcut, platform),
  };
}

function definitionsToEntries(
  definitions: ReadonlyArray<ShortcutDefinition>,
  keybindings: ResolvedKeybindingsConfig,
  platform: string,
  context: ShortcutSheetContext,
  t: ShortcutTranslate,
): ShortcutSheetEntry[] {
  return definitions
    .map((definition) => definitionToEntry(definition, keybindings, platform, context, t))
    .filter((entry): entry is ShortcutSheetEntry => entry !== null);
}

export function buildShortcutSheetSections(
  options: BuildShortcutSheetSectionsOptions,
): ShortcutSheetSection[] {
  const sections: ShortcutSheetSection[] = [];
  const t = options.translate ?? english;

  const currentEntries: ShortcutSheetEntry[] = [
    {
      id: "shortcuts.show",
      command: null,
      binding: null,
      label: t("shortcuts.show"),
      description: t("shortcuts.showDescription"),
      shortcutLabel: modSlashLabel(options.platform),
    },
    ...definitionsToEntries(
      AVAILABLE_NOW_DEFINITIONS,
      options.keybindings,
      options.platform,
      options.context,
      t,
    ),
  ];

  const sidebarToggle = definitionToEntry(
    SIDEBAR_TOGGLE_DEFINITION,
    options.keybindings,
    options.platform,
    options.context,
    t,
  );
  if (sidebarToggle) {
    currentEntries.splice(1, 0, sidebarToggle);
  }

  const currentNavigationEntries = options.context.terminalWorkspaceOpen
    ? definitionsToEntries(
        WORKSPACE_DEFINITIONS,
        options.keybindings,
        options.platform,
        options.context,
        t,
      )
    : definitionsToEntries(
        THREAD_JUMP_DEFINITIONS,
        options.keybindings,
        options.platform,
        options.context,
        t,
      );

  sections.push({
    id: "available-now",
    title: t("shortcuts.availableNow"),
    description: options.context.terminalWorkspaceOpen
      ? t("shortcuts.activeWorkspaceContext")
      : t("shortcuts.activeChatContext"),
    entries: [...currentEntries, ...currentNavigationEntries],
  });

  const alternateContext: ShortcutSheetContext = options.context.terminalWorkspaceOpen
    ? { ...options.context, terminalWorkspaceOpen: false }
    : {
        ...options.context,
        terminalOpen: true,
        terminalWorkspaceOpen: true,
      };
  const alternateDefinitions = options.context.terminalWorkspaceOpen
    ? THREAD_JUMP_DEFINITIONS
    : WORKSPACE_DEFINITIONS;
  const alternateEntries = definitionsToEntries(
    alternateDefinitions,
    options.keybindings,
    options.platform,
    alternateContext,
    t,
  );
  if (alternateEntries.length > 0) {
    sections.push({
      id: "alternate-context",
      title: options.context.terminalWorkspaceOpen
        ? t("shortcuts.outsideWorkspace")
        : t("shortcuts.inWorkspace"),
      description: options.context.terminalWorkspaceOpen
        ? t("shortcuts.outsideWorkspaceDescription")
        : t("shortcuts.inWorkspaceDescription"),
      tone: "muted",
      entries: alternateEntries,
    });
  }

  const projectScriptEntries = options.projectScripts
    .map<ShortcutSheetEntry | null>((script) => {
      const command = commandForProjectScript(script.id);
      const binding = resolveKeybindingForCommand(options.keybindings, command, {
        platform: options.platform,
      });
      if (!binding) return null;
      return {
        id: script.id,
        command,
        binding,
        label: script.runOnWorktreeCreate
          ? t("shortcuts.projectSetupScript", { name: script.name })
          : script.name,
        description: script.runOnWorktreeCreate
          ? t("shortcuts.projectSetupScriptDescription")
          : t("shortcuts.projectScriptDescription"),
        shortcutLabel: formatShortcutLabel(binding.shortcut, options.platform),
      };
    })
    .filter((entry): entry is ShortcutSheetEntry => entry !== null);

  if (projectScriptEntries.length > 0) {
    sections.push({
      id: "project-scripts",
      title: t("shortcuts.projectScripts"),
      description: t("shortcuts.projectScriptsDescription"),
      entries: projectScriptEntries,
    });
  }

  return sections;
}

// Match a single entry against a free-text query on the human-readable label, the
// description, and the rendered shortcut label, so a user can search by action name
// ("terminal"), intent ("split"), or even the key combo itself ("⌘N" / "ctrl+n").
function shortcutSheetEntryMatchesQuery(entry: ShortcutSheetEntry, needle: string): boolean {
  return (
    entry.label.toLowerCase().includes(needle) ||
    entry.description.toLowerCase().includes(needle) ||
    entry.shortcutLabel.toLowerCase().includes(needle)
  );
}

// Filter each section's entries against a free-text query, dropping sections that end up
// empty. Shared by the keyboard-shortcuts dialog (Mod+/) and the settings reference panel
// so the two surfaces search identically.
export function filterShortcutSheetSections(
  sections: ShortcutSheetSection[],
  query: string,
): ShortcutSheetSection[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return sections;
  return sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter((entry) => shortcutSheetEntryMatchesQuery(entry, trimmed)),
    }))
    .filter((section) => section.entries.length > 0);
}
