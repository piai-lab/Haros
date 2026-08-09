// FILE: KeyboardShortcutsSettingsPanel.tsx
// Purpose: Searchable Keybindings editor for the settings screen — the same command reference
//          the Mod+/ sheet shows, with captured-key editing and new binding creation.
// Layer: Settings UI components
// Depends on: shared shortcut-sheet builder/filter, key capture, server keybindings config, and the Kbd pill.

import type {
  KeybindingCommand,
  KeybindingRule,
  ResolvedKeybindingsConfig,
} from "@synara/contracts";
import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ShortcutKbd } from "~/components/ui/shortcut-kbd";
import { toastManager } from "~/components/ui/toast";
import { formatKeybindingWhenExpression } from "~/keybindings";
import { CentralIcon } from "~/lib/central-icons";
import { keybindingFromKeyboardEvent, keybindingValueFromShortcut } from "~/lib/keybindingCapture";
import { ensureNativeApi } from "~/nativeApi";
import { serverConfigQueryOptions, serverQueryKeys } from "~/lib/serverReactQuery";
import { cn } from "~/lib/utils";
import {
  buildShortcutSheetSections,
  filterShortcutSheetSections,
  listEditableShortcutDefinitions,
  type ShortcutSheetContext,
  type ShortcutSheetEntry,
} from "~/shortcutsSheet";
import {
  SETTINGS_CARD_ROW_CLASS_NAME,
  SETTINGS_CARD_ROW_DESCRIPTION_CLASS_NAME,
  SETTINGS_CARD_ROW_TITLE_CLASS_NAME,
} from "~/settingsPanelStyles";
import { SettingsCard, SettingsEmptyState } from "./SettingsPanelPrimitives";
import { useI18n } from "~/i18n";

// Stable empty reference while the server config query is still loading.
const EMPTY_KEYBINDINGS: ResolvedKeybindingsConfig = [];

// The settings reference is intentionally context-free: it lists the chat/sidebar bindings
// as "available now" plus the workspace-mode set, independent of the live terminal state, so
// the page reads the same no matter which thread is focused.
const SETTINGS_SHORTCUT_CONTEXT: ShortcutSheetContext = {
  terminalFocus: false,
  terminalOpen: false,
  terminalWorkspaceOpen: false,
};

const DEFAULT_NEW_SHORTCUT_COMMAND =
  listEditableShortcutDefinitions()[0]?.command ?? ("sidebar.toggle" as KeybindingCommand);

export function KeyboardShortcutsSettingsPanel() {
  const { t } = useI18n();
  const editableShortcutDefinitions = listEditableShortcutDefinitions(t);
  const [query, setQuery] = useState("");
  const [editingCommand, setEditingCommand] = useState<KeybindingCommand | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newCommand, setNewCommand] = useState<KeybindingCommand>(DEFAULT_NEW_SHORTCUT_COMMAND);
  const [keyValue, setKeyValue] = useState("");
  const [whenValue, setWhenValue] = useState("");
  const [replacingRule, setReplacingRule] = useState<KeybindingRule | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const queryClient = useQueryClient();
  const keybindings = serverConfigQuery.data?.keybindings ?? EMPTY_KEYBINDINGS;
  const platform = typeof navigator === "undefined" ? "" : navigator.platform;

  const sections = buildShortcutSheetSections({
    keybindings,
    // Project scripts are per-project and live only in the chat context; the settings
    // reference stays project-agnostic, so the contextual Mod+/ sheet still owns them.
    projectScripts: [],
    platform,
    context: SETTINGS_SHORTCUT_CONTEXT,
    translate: t,
  });

  const filteredSections = filterShortcutSheetSections(sections, query);
  const beginEditing = (entry: ShortcutSheetEntry) => {
    if (!entry.command || !entry.binding) return;
    setIsAdding(false);
    setEditingCommand(entry.command);
    const key = keybindingValueFromShortcut(entry.binding.shortcut);
    const when = formatKeybindingWhenExpression(entry.binding.whenAst);
    setKeyValue(key);
    setWhenValue(when);
    setReplacingRule({ command: entry.command, key, ...(when ? { when } : {}) });
    setCaptureError(null);
  };
  const beginAdding = () => {
    setEditingCommand(null);
    setIsAdding(true);
    setKeyValue("");
    setWhenValue("");
    setReplacingRule(null);
    setCaptureError(null);
  };
  const cancelCapture = () => {
    setEditingCommand(null);
    setIsAdding(false);
    setKeyValue("");
    setWhenValue("");
    setReplacingRule(null);
    setCaptureError(null);
  };
  const activeCommand = editingCommand ?? (isAdding ? newCommand : null);
  const captureKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const next = keybindingFromKeyboardEvent(event.nativeEvent);
    if (!next) {
      setCaptureError(t("settings.shortcutCaptureRule"));
      return;
    }
    setCaptureError(null);
    setKeyValue(next);
  };
  const saveBinding = async () => {
    if (!activeCommand || !keyValue.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const result = await ensureNativeApi().server.upsertKeybinding({
        rule: {
          command: activeCommand,
          key: keyValue.trim().toLowerCase(),
          ...(whenValue.trim() ? { when: whenValue.trim() } : {}),
        },
        ...(replacingRule ? { replacing: replacingRule } : {}),
      });
      queryClient.setQueryData(serverQueryKeys.config(), (current: typeof serverConfigQuery.data) =>
        current ? { ...current, keybindings: result.keybindings, issues: result.issues } : current,
      );
      toastManager.add({
        type: "success",
        title: t("settings.shortcutSaved"),
        description: t("settings.shortcutSavedDescription"),
      });
      cancelCapture();
    } catch (error) {
      toastManager.add({
        type: "error",
        title: t("settings.shortcutSaveFailed"),
        description:
          error instanceof Error ? error.message : t("settings.shortcutSaveFailedDescription"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/45 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
        {t("settings.shortcutIntro")}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-medium text-foreground">{t("settings.keybindings")}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("settings.shortcutCustomize")}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={beginAdding} disabled={isAdding || isSaving}>
          {t("settings.setKeybinding")}
        </Button>
      </div>
      {isAdding ? (
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1 text-[11px] text-muted-foreground">
              <span className="block">{t("settings.command")}</span>
              <select
                className="h-8 w-full rounded-lg border border-border/80 bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring/60"
                value={newCommand}
                aria-label={t("settings.commandForNewKeybinding")}
                onChange={(event) => setNewCommand(event.target.value as KeybindingCommand)}
              >
                {editableShortcutDefinitions.map((definition) => (
                  <option key={definition.command} value={definition.command}>
                    {definition.label} · {definition.command}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-[11px] text-muted-foreground">
              <span className="block">{t("settings.pressKeyCombo")}</span>
              <Input
                size="sm"
                nativeInput
                autoFocus
                readOnly
                placeholder={t("settings.pressKey")}
                aria-label={t("settings.pressKeyAria")}
                value={keyValue}
                onKeyDown={captureKeyDown}
              />
            </label>
            <label className="space-y-1 text-[11px] text-muted-foreground">
              <span className="block">{t("settings.conditionOptional")}</span>
              <Input
                size="sm"
                nativeInput
                placeholder={t("settings.conditionExample")}
                aria-label={t("settings.conditionForNewKeybinding")}
                value={whenValue}
                onChange={(event) => setWhenValue(event.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {captureError ?? t("settings.shortcutCaptureRule")}
            </p>
            <div className="flex gap-2">
              <Button size="sm" disabled={!keyValue || isSaving} onClick={() => void saveBinding()}>
                {isSaving ? t("settings.saving") : t("settings.saveKeybinding")}
              </Button>
              <Button size="sm" variant="outline" disabled={isSaving} onClick={cancelCapture}>
                {t("settings.cancel")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="relative w-full">
        <Input
          type="search"
          size="sm"
          variant="soft"
          nativeInput
          placeholder={t("settings.searchShortcuts")}
          value={query}
          aria-label={t("settings.searchShortcutsAria")}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query.length > 0) {
              event.preventDefault();
              event.stopPropagation();
              setQuery("");
            }
          }}
          className="[&>[data-slot=input]]:pr-9"
        />
        <CentralIcon
          name="cmd-box"
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
        />
      </div>

      {filteredSections.length > 0 ? (
        <SettingsCard>
          <div className="flex items-center justify-between gap-4 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            <span>{t("settings.command")}</span>
            <span>{t("settings.keybinding")}</span>
          </div>
          {filteredSections.flatMap((section) => {
            const muted = section.tone === "muted";
            return section.entries.map((entry) => {
              const command = entry.command;
              const isEditing = command !== null && command === editingCommand && !isAdding;
              return (
                <div
                  key={`${section.id}:${entry.id}`}
                  className={cn(SETTINGS_CARD_ROW_CLASS_NAME, "space-y-2", muted && "opacity-75")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 space-y-0.5">
                      <div className={cn(SETTINGS_CARD_ROW_TITLE_CLASS_NAME, "truncate")}>
                        {entry.label}
                      </div>
                      <div className={cn(SETTINGS_CARD_ROW_DESCRIPTION_CLASS_NAME, "truncate")}>
                        {entry.description}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ShortcutKbd shortcutLabel={entry.shortcutLabel} groupClassName="shrink-0" />
                      {command ? (
                        <Button size="xs" variant="outline" onClick={() => beginEditing(entry)}>
                          {t("settings.edit")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="grid gap-2 border-t border-border/60 pt-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <Input
                        size="sm"
                        nativeInput
                        autoFocus
                        readOnly
                        placeholder={t("settings.pressKey")}
                        aria-label={t("settings.shortcutFor", { command: entry.label })}
                        value={keyValue}
                        onKeyDown={captureKeyDown}
                      />
                      <Input
                        size="sm"
                        nativeInput
                        placeholder={t("settings.optionalConditionExample")}
                        aria-label={t("settings.conditionFor", { command: entry.label })}
                        value={whenValue}
                        onChange={(event) => setWhenValue(event.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!keyValue.trim() || isSaving}
                          onClick={() => void saveBinding()}
                        >
                          {isSaving ? t("settings.saving") : t("settings.save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSaving}
                          onClick={cancelCapture}
                        >
                          {t("settings.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            });
          })}
        </SettingsCard>
      ) : (
        <SettingsEmptyState>{t("settings.noShortcutMatches", { query })}</SettingsEmptyState>
      )}
    </div>
  );
}
