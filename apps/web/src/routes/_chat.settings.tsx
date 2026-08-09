// FILE: _chat.settings.tsx
// Purpose: Render the dedicated settings experience with its own section sidebar and grouped panels.
// Layer: Route screen
// Exports: Settings route component for `/settings`

import { PROVIDER_DISPLAY_NAMES, type ProviderKind } from "@synara/contracts";
import { PROVIDER_DESCRIPTORS } from "@synara/shared/providerMetadata";
import { sameAppSnapShortcut } from "@synara/shared/appSnapShortcut";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  type AppSettings,
  type FollowUpBehavior,
  DEFAULT_UI_DENSITY,
  type UiDensity,
  MAX_CHAT_FONT_SIZE_PX,
  MAX_TERMINAL_FONT_SIZE_PX,
  MIN_CHAT_FONT_SIZE_PX,
  MIN_TERMINAL_FONT_SIZE_PX,
  normalizeChatFontSizePx,
  normalizeTerminalFontFamily,
  normalizeTerminalFontSizePx,
  isGitTextGenerationSettingsDirty,
  TERMINAL_FONT_FAMILY_SUGGESTIONS,
  useAppSettings,
} from "../appSettings";
import { AdvancedSettingsPanel } from "~/components/settings/AdvancedSettingsPanel";
import { AppIconPicker } from "~/components/settings/AppIconPicker";
import {
  ArchivedSettingsPanel,
  WorktreesSettingsPanel,
} from "~/components/settings/ConversationStorageSettingsPanels";
import {
  AppSnapSettingsPanel,
  NotificationsSettingsPanel,
} from "~/components/settings/DesktopSettingsPanels";
import { ModelsSettingsPanel } from "~/components/settings/ModelsSettingsPanel";
import {
  isProviderInstallSettingsDirty,
  ProvidersSettingsPanel,
} from "~/components/settings/ProvidersSettingsPanel";
import { ProviderOptionLabel } from "../components/ProviderIcon";
import { KeyboardShortcutsSettingsPanel } from "../components/settings/KeyboardShortcutsSettingsPanel";
import { ProfileSettingsPanel } from "../components/settings/ProfileSettingsPanel";
import { ProviderUsageSettingsPanel } from "../components/settings/ProviderUsageSettingsPanel";
import { ExternalMcpSettingsPanel } from "../components/settings/ExternalMcpSettingsPanel";
import {
  SettingResetButton,
  SettingsSegmentedControl,
  SettingsSelectControl,
} from "../components/settings/SettingControls";
import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsSectionShell,
} from "../components/settings/SettingsPanelPrimitives";
import { SkillsSettingsPanel } from "../components/settings/SkillsSettingsPanel";
import { ThemeModePicker } from "../components/settings/ThemeModePicker";
import { ThemePackEditor } from "../components/ThemePackEditor";
import {
  CHAT_CONTENT_CARD_CLASS_NAME,
  CHAT_MAIN_VIEWPORT_SHELL_CLASS_NAME,
} from "../components/chat/composerPickerStyles";
import {
  CHAT_SURFACE_HEADER_HEIGHT_CLASS,
  CHAT_SURFACE_HEADER_PADDING_X_CLASS,
} from "../components/chat/chatHeaderControls";
import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
} from "../components/ui/autocomplete";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { SelectItem } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { RouteInsetSurface } from "../components/RouteInsetSurface";
import { SidebarHeaderNavigationControls } from "../components/SidebarHeaderNavigationControls";
import { useDesktopTopBarTrafficLightGutterClassName } from "../hooks/useDesktopTopBarGutter";
import { useTheme } from "../hooks/useTheme";
import { isUiDensity } from "../lib/appDensity";
import { isElectron } from "../env";
import { useI18n } from "../i18n";
import { RotateCcwIcon } from "../lib/icons";
import { cn, isMacPlatform } from "../lib/utils";
import { ensureNativeApi, readNativeApi } from "../nativeApi";
import { sameProviderOrder } from "../providerOrdering";
import {
  normalizeSettingsSection,
  SETTINGS_NAV_ITEMS,
  SETTINGS_TARGETS,
} from "../settingsNavigation";
import { SETTINGS_PAGE_BACKGROUND_CLASS_NAME } from "../settingsPanelStyles";

// ── Settings taxonomy ──────────────────────────────────────────────────────

const UI_DENSITY_OPTIONS = [
  {
    value: "compact",
    label: "Compact",
    description: "Tighter spacing in the sidebar, composer, and settings rows.",
  },
  {
    value: "comfortable",
    label: "Comfortable",
    description: "Balanced spacing for everyday use.",
  },
  {
    value: "spacious",
    label: "Spacious",
    description: "More breathing room across the main workspace surfaces.",
  },
] as const satisfies ReadonlyArray<{
  value: UiDensity;
  label: string;
  description: string;
}>;

const PROVIDER_SELECT_OPTIONS = PROVIDER_DESCRIPTORS.map((descriptor) => descriptor.kind);

const TIMESTAMP_FORMAT_LABELS = {
  locale: "System default",
  "12-hour": "12-hour",
  "24-hour": "24-hour",
} as const;

const FOLLOW_UP_BEHAVIOR_OPTIONS = [
  { value: "queue", label: "Queue" },
  { value: "steer", label: "Steer" },
] as const satisfies ReadonlyArray<{ value: FollowUpBehavior; label: string }>;

// ── Settings UI primitives ────────────────────────────────────────────────

// Shared settings controls live in ~/components/settings/SettingControls.

function isProviderSelectOption(value: string): value is ProviderKind {
  return PROVIDER_SELECT_OPTIONS.includes(value as ProviderKind);
}

// Keys of AppSettings whose value is a plain boolean — the only ones that can be
// driven by the shared on/off toggle row below.
type BooleanSettingKey = {
  [Key in keyof AppSettings]-?: AppSettings[Key] extends boolean ? Key : never;
}[keyof AppSettings];

// ── Route screen ───────────────────────────────────────────────────────────

function SettingsRouteView() {
  const routeSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const activeSection = normalizeSettingsSection(routeSearch.section);
  const settingsTarget = typeof routeSearch.target === "string" ? routeSearch.target : null;
  const activeSectionItem = SETTINGS_NAV_ITEMS.find((item) => item.id === activeSection)!;

  const {
    isDefaultActiveTheme,
    resetAllThemes,
    resolvedTheme,
    theme,
    setTheme,
    systemUiFont,
    setSystemUiFont,
  } = useTheme();
  const { settings, defaults, updateSettings, resetSettings } = useAppSettings();
  const { t } = useI18n();
  const desktopTopBarTrafficLightGutterClassName = useDesktopTopBarTrafficLightGutterClassName();
  const [resetEpoch, setResetEpoch] = useState(0);
  const shouldShowFontSmoothing = isMacPlatform(
    typeof navigator === "undefined" ? "" : navigator.platform,
  );
  const visibleTerminalFontFamilySuggestions = useMemo(() => {
    const query = settings.terminalFontFamily.trim().toLowerCase();
    if (!query) return TERMINAL_FONT_FAMILY_SUGGESTIONS;
    return TERMINAL_FONT_FAMILY_SUGGESTIONS.filter((suggestion) =>
      suggestion.toLowerCase().includes(query),
    );
  }, [settings.terminalFontFamily]);

  const isGitTextGenerationModelDirty = isGitTextGenerationSettingsDirty(settings, defaults);
  const isInstallSettingsDirty = isProviderInstallSettingsDirty(settings, defaults);
  const hiddenProviderCount = new Set(settings.hiddenProviders).size;
  const isProviderOrderDirty = !sameProviderOrder(settings.providerOrder, defaults.providerOrder);

  // Deep links and sidebar search targets all resolve to stable DOM ids in the active panel.
  useEffect(() => {
    if (!settingsTarget) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(settingsTarget)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSection, settingsTarget]);

  const changedSettingLabels = [
    ...(settings.localePreference !== defaults.localePreference ? [t("settings.language")] : []),
    ...(theme !== "system" ? ["Theme"] : []),
    ...(!isDefaultActiveTheme ? [`${resolvedTheme === "dark" ? "Dark" : "Light"} theme pack`] : []),
    ...(settings.defaultProvider !== defaults.defaultProvider ? ["Default provider"] : []),
    ...(settings.defaultThreadEnvMode !== defaults.defaultThreadEnvMode ? ["New thread mode"] : []),
    ...(settings.sidebarProjectSortOrder !== defaults.sidebarProjectSortOrder
      ? ["Project sort order"]
      : []),
    ...(settings.sidebarThreadSortOrder !== defaults.sidebarThreadSortOrder
      ? ["Thread sort order"]
      : []),
    ...(settings.showChatsSection !== defaults.showChatsSection ? ["Chats section"] : []),
    ...(settings.showStudioSection !== defaults.showStudioSection ? [t("nav.chat")] : []),
    ...(settings.uiDensity !== defaults.uiDensity ? ["UI density"] : []),
    ...(settings.desktopAppIcon !== defaults.desktopAppIcon ? ["App icon"] : []),
    ...(settings.chatFontSizePx !== defaults.chatFontSizePx ? ["Base font size"] : []),
    ...(settings.terminalFontSizePx !== defaults.terminalFontSizePx ? ["Terminal font size"] : []),
    ...(settings.terminalFontFamily !== defaults.terminalFontFamily ? ["Terminal font"] : []),
    ...(shouldShowFontSmoothing &&
    settings.enableNativeFontSmoothing !== defaults.enableNativeFontSmoothing
      ? ["Font smoothing"]
      : []),
    ...(settings.timestampFormat !== defaults.timestampFormat ? ["Time format"] : []),
    ...(settings.enableTaskCompletionToasts !== defaults.enableTaskCompletionToasts
      ? ["Activity toasts"]
      : []),
    ...(settings.enableSystemTaskCompletionNotifications !==
    defaults.enableSystemTaskCompletionNotifications
      ? ["Desktop notifications"]
      : []),
    ...(settings.enableAssistantStreaming !== defaults.enableAssistantStreaming
      ? ["Assistant output"]
      : []),
    ...(settings.followUpBehavior !== defaults.followUpBehavior ? ["Follow-up behavior"] : []),
    ...(settings.enableAppSnap !== defaults.enableAppSnap ? ["AppSnap"] : []),
    ...(!sameAppSnapShortcut(settings.appSnapShortcut, defaults.appSnapShortcut)
      ? ["AppSnap shortcut"]
      : []),
    ...(settings.appSnapPlaySound !== defaults.appSnapPlaySound ? ["AppSnap capture sound"] : []),
    ...(settings.enableProviderUpdateChecks !== defaults.enableProviderUpdateChecks
      ? ["Provider update checks"]
      : []),
    ...(settings.diffWordWrap !== defaults.diffWordWrap ? ["Diff line wrapping"] : []),
    ...(settings.showPullRequestDiffColors !== defaults.showPullRequestDiffColors
      ? ["Pull request diff colors"]
      : []),
    ...(settings.confirmThreadDelete !== defaults.confirmThreadDelete
      ? ["Delete confirmation"]
      : []),
    ...(settings.confirmThreadArchive !== defaults.confirmThreadArchive
      ? ["Archive confirmation"]
      : []),
    ...(settings.confirmTerminalTabClose !== defaults.confirmTerminalTabClose
      ? ["Terminal close confirmation"]
      : []),
    ...(isGitTextGenerationModelDirty ? ["Git writing model"] : []),
    ...(settings.customCodexModels.length > 0 ||
    settings.customClaudeModels.length > 0 ||
    settings.customCursorModels.length > 0 ||
    settings.customAntigravityModels.length > 0 ||
    settings.customGrokModels.length > 0 ||
    settings.customDroidModels.length > 0 ||
    settings.customKiloModels.length > 0 ||
    settings.customOpenCodeModels.length > 0 ||
    settings.customPiModels.length > 0
      ? ["Custom models"]
      : []),
    ...(isInstallSettingsDirty ? ["Provider installs"] : []),
    ...(hiddenProviderCount > 0 ? ["Provider visibility"] : []),
    ...(isProviderOrderDirty ? ["Provider order"] : []),
  ];

  async function restoreDefaults() {
    if (changedSettingLabels.length === 0) return;

    const api = readNativeApi();
    const confirmed = await (api ?? ensureNativeApi()).dialogs.confirm(
      ["Restore default settings?", `This will reset: ${changedSettingLabels.join(", ")}.`].join(
        "\n",
      ),
    );
    if (!confirmed) return;

    setTheme("system");
    resetAllThemes();
    resetSettings();
    setResetEpoch((current) => current + 1);
  }

  // Shared on/off settings row: a labelled Switch bound to a boolean AppSettings
  // key, with the standard "reset to default" affordance shown only when changed.
  // Rows with bespoke controls (e.g. the desktop-notifications Test button) keep
  // their own markup instead of using this helper.
  const renderBooleanSettingRow = (config: {
    settingKey: BooleanSettingKey;
    title: string;
    description: string;
    resetLabel: string;
    ariaLabel: string;
  }) => {
    const { settingKey, title, description, resetLabel, ariaLabel } = config;
    const isChanged = settings[settingKey] !== defaults[settingKey];
    return (
      <SettingsRow
        title={title}
        description={description}
        resetAction={
          isChanged ? (
            <SettingResetButton
              label={resetLabel}
              onClick={() =>
                updateSettings({ [settingKey]: defaults[settingKey] } as Partial<AppSettings>)
              }
            />
          ) : null
        }
        control={
          <Switch
            checked={settings[settingKey]}
            onCheckedChange={(checked) =>
              updateSettings({ [settingKey]: Boolean(checked) } as Partial<AppSettings>)
            }
            aria-label={ariaLabel}
          />
        }
      />
    );
  };

  const renderGeneralPanel = () => (
    <div className="space-y-6">
      <SettingsSection title={t("settings.coreDefaults")}>
        <SettingsRow
          title={t("settings.language")}
          description={t("settings.languageDescription")}
          resetAction={
            settings.localePreference !== defaults.localePreference ? (
              <SettingResetButton
                label={t("settings.language")}
                onClick={() => updateSettings({ localePreference: defaults.localePreference })}
              />
            ) : null
          }
          control={
            <SettingsSelectControl
              value={settings.localePreference}
              onValueChange={(value) => {
                if (value !== "system" && value !== "zh-CN" && value !== "en") return;
                updateSettings({ localePreference: value });
              }}
              ariaLabel={t("settings.language")}
              triggerClassName="w-full sm:w-40"
              valueContent={
                settings.localePreference === "system"
                  ? t("common.system")
                  : settings.localePreference === "zh-CN"
                    ? t("common.chinese")
                    : t("common.english")
              }
            >
              <SelectItem hideIndicator value="system">
                {t("common.system")}
              </SelectItem>
              <SelectItem hideIndicator value="zh-CN">
                {t("common.chinese")}
              </SelectItem>
              <SelectItem hideIndicator value="en">
                {t("common.english")}
              </SelectItem>
            </SettingsSelectControl>
          }
        />

        <SettingsRow
          title={t("settings.defaultProvider")}
          description={t("settings.defaultProviderDescription")}
          resetAction={
            settings.defaultProvider !== defaults.defaultProvider ? (
              <SettingResetButton
                label="default provider"
                onClick={() => updateSettings({ defaultProvider: defaults.defaultProvider })}
              />
            ) : null
          }
          control={
            <SettingsSelectControl
              value={settings.defaultProvider}
              onValueChange={(value) => {
                if (!isProviderSelectOption(value)) return;
                updateSettings({ defaultProvider: value });
              }}
              ariaLabel={t("settings.defaultProvider")}
              valueContent={
                <ProviderOptionLabel
                  provider={settings.defaultProvider}
                  label={PROVIDER_DISPLAY_NAMES[settings.defaultProvider]}
                />
              }
            >
              {PROVIDER_SELECT_OPTIONS.map((provider) => (
                <SelectItem hideIndicator key={provider} value={provider}>
                  <ProviderOptionLabel
                    provider={provider}
                    label={PROVIDER_DISPLAY_NAMES[provider]}
                  />
                </SelectItem>
              ))}
            </SettingsSelectControl>
          }
        />

        <SettingsRow
          title={t("settings.newThreads")}
          description={t("settings.newThreadsDescription")}
          resetAction={
            settings.defaultThreadEnvMode !== defaults.defaultThreadEnvMode ? (
              <SettingResetButton
                label={t("settings.newThreads")}
                onClick={() =>
                  updateSettings({
                    defaultThreadEnvMode: defaults.defaultThreadEnvMode,
                  })
                }
              />
            ) : null
          }
          control={
            <SettingsSelectControl
              value={settings.defaultThreadEnvMode}
              onValueChange={(value) => {
                if (value !== "local" && value !== "worktree") return;
                updateSettings({
                  defaultThreadEnvMode: value,
                });
              }}
              ariaLabel={t("settings.defaultThreadMode")}
              valueContent={
                settings.defaultThreadEnvMode === "worktree"
                  ? t("settings.newWorktree")
                  : t("settings.local")
              }
            >
              <SelectItem hideIndicator value="local">
                {t("settings.local")}
              </SelectItem>
              <SelectItem hideIndicator value="worktree">
                {t("settings.newWorktree")}
              </SelectItem>
            </SettingsSelectControl>
          }
        />
      </SettingsSection>

      <SettingsSection title={t("settings.sidebarOrganization")}>
        <SettingsRow
          title={t("settings.projectOrder")}
          description={t("settings.projectOrderDescription")}
          resetAction={
            settings.sidebarProjectSortOrder !== defaults.sidebarProjectSortOrder ? (
              <SettingResetButton
                label={t("settings.projectOrder")}
                onClick={() =>
                  updateSettings({
                    sidebarProjectSortOrder: defaults.sidebarProjectSortOrder,
                  })
                }
              />
            ) : null
          }
          control={
            <SettingsSelectControl
              value={settings.sidebarProjectSortOrder}
              onValueChange={(value) => {
                if (value !== "updated_at" && value !== "created_at" && value !== "manual") {
                  return;
                }
                updateSettings({ sidebarProjectSortOrder: value });
              }}
              ariaLabel={t("settings.projectOrder")}
              valueContent={
                settings.sidebarProjectSortOrder === "updated_at"
                  ? t("settings.recentlyActive")
                  : settings.sidebarProjectSortOrder === "created_at"
                    ? t("settings.recentlyAdded")
                    : t("settings.manualOrder")
              }
            >
              <SelectItem hideIndicator value="updated_at">
                {t("settings.recentlyActive")}
              </SelectItem>
              <SelectItem hideIndicator value="created_at">
                {t("settings.recentlyAdded")}
              </SelectItem>
              <SelectItem hideIndicator value="manual">
                {t("settings.manualOrder")}
              </SelectItem>
            </SettingsSelectControl>
          }
        />

        <SettingsRow
          title={t("settings.threadOrder")}
          description={t("settings.threadOrderDescription")}
          resetAction={
            settings.sidebarThreadSortOrder !== defaults.sidebarThreadSortOrder ? (
              <SettingResetButton
                label={t("settings.threadOrder")}
                onClick={() =>
                  updateSettings({
                    sidebarThreadSortOrder: defaults.sidebarThreadSortOrder,
                  })
                }
              />
            ) : null
          }
          control={
            <SettingsSelectControl
              value={settings.sidebarThreadSortOrder}
              onValueChange={(value) => {
                if (value !== "updated_at" && value !== "created_at") {
                  return;
                }
                updateSettings({ sidebarThreadSortOrder: value });
              }}
              ariaLabel={t("settings.threadOrder")}
              valueContent={
                settings.sidebarThreadSortOrder === "updated_at"
                  ? t("settings.recentlyActive")
                  : t("settings.newestFirst")
              }
            >
              <SelectItem hideIndicator value="updated_at">
                {t("settings.recentlyActive")}
              </SelectItem>
              <SelectItem hideIndicator value="created_at">
                {t("settings.newestFirst")}
              </SelectItem>
            </SettingsSelectControl>
          }
        />
      </SettingsSection>

      <SettingsSection title={t("settings.sidebarSections")}>
        {renderBooleanSettingRow({
          settingKey: "showChatsSection",
          title: t("settings.chats"),
          description: t("settings.chatsDescription"),
          resetLabel: t("settings.chats"),
          ariaLabel: t("settings.chatsDescription"),
        })}

        {renderBooleanSettingRow({
          settingKey: "showStudioSection",
          title: t("nav.chat"),
          description: t("settings.chatSurfaceDescription"),
          resetLabel: t("nav.chat"),
          ariaLabel: t("settings.chatSurfaceDescription"),
        })}
      </SettingsSection>

      <div id={SETTINGS_TARGETS.environmentPanel} className="space-y-6">
        <SettingsSection title={t("settings.environmentPanel")}>
          {renderBooleanSettingRow({
            settingKey: "environmentPanelDefaultOpen",
            title: t("settings.openByDefault"),
            description: t("settings.openByDefaultDescription"),
            resetLabel: t("settings.openByDefault"),
            ariaLabel: t("settings.openByDefaultDescription"),
          })}
        </SettingsSection>

        <SettingsSection title={t("settings.codeAndStatus")}>
          {renderBooleanSettingRow({
            settingKey: "showEnvironmentUsage",
            title: t("settings.usageLabel"),
            description: t("settings.usageDescription"),
            resetLabel: t("settings.usageLabel"),
            ariaLabel: t("settings.usageDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentRepository",
            title: t("settings.repositoryLabel"),
            description: t("settings.repositoryDescription"),
            resetLabel: t("settings.repositoryLabel"),
            ariaLabel: t("settings.repositoryDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentPullRequest",
            title: t("settings.pullRequest"),
            description: t("settings.pullRequestDescription"),
            resetLabel: t("settings.pullRequest"),
            ariaLabel: t("settings.pullRequestDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentEditor",
            title: t("settings.editor"),
            description: t("settings.editorDescription"),
            resetLabel: t("settings.editor"),
            ariaLabel: t("settings.editorDescription"),
          })}
        </SettingsSection>

        <SettingsSection title={t("settings.contextAndNotes")}>
          {renderBooleanSettingRow({
            settingKey: "showEnvironmentRecap",
            title: t("settings.recap"),
            description: t("settings.recapDescription"),
            resetLabel: t("settings.recap"),
            ariaLabel: t("settings.recapDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentPinned",
            title: t("settings.pinnedMessages"),
            description: t("settings.pinnedMessagesDescription"),
            resetLabel: t("settings.pinnedMessages"),
            ariaLabel: t("settings.pinnedMessagesDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentMarkers",
            title: t("settings.textMarkers"),
            description: t("settings.textMarkersDescription"),
            resetLabel: t("settings.textMarkers"),
            ariaLabel: t("settings.textMarkersDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentInstructions",
            title: t("settings.projectInstructions"),
            description: t("settings.projectInstructionsDescription"),
            resetLabel: t("settings.projectInstructions"),
            ariaLabel: t("settings.projectInstructionsDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentNotepad",
            title: t("settings.notepad"),
            description: t("settings.notepadDescription"),
            resetLabel: t("settings.notepad"),
            ariaLabel: t("settings.notepadDescription"),
          })}
        </SettingsSection>
      </div>
    </div>
  );

  const renderAppearancePanel = () => (
    <div className="space-y-6">
      <SettingsSectionShell title="Theme">
        <SettingsCard>
          <SettingsRow
            title="Theme"
            description="Choose how OmniMind looks across the app."
            resetAction={
              theme !== "system" ? (
                <SettingResetButton label="theme" onClick={() => setTheme("system")} />
              ) : null
            }
          >
            <div className="max-w-md pt-3">
              <ThemeModePicker
                value={theme}
                onValueChange={setTheme}
                ariaLabel="Theme preference"
              />
            </div>
          </SettingsRow>
        </SettingsCard>

        <div className="space-y-3">
          {(resolvedTheme === "dark"
            ? (["dark", "light"] as const)
            : (["light", "dark"] as const)
          ).map((variant) => (
            <ThemePackEditor
              key={variant}
              variant={variant}
              isActive={resolvedTheme === variant}
              mode={theme}
            />
          ))}
        </div>
      </SettingsSectionShell>

      {isElectron ? (
        <SettingsSection title="App">
          <SettingsRow
            title="App icon"
            description="Choose the icon OmniMind uses in the dock or taskbar."
            resetAction={
              settings.desktopAppIcon !== defaults.desktopAppIcon ? (
                <SettingResetButton
                  label="app icon"
                  onClick={() => updateSettings({ desktopAppIcon: defaults.desktopAppIcon })}
                />
              ) : null
            }
            control={
              <AppIconPicker
                value={settings.desktopAppIcon}
                onValueChange={(desktopAppIcon) => updateSettings({ desktopAppIcon })}
              />
            }
          />
        </SettingsSection>
      ) : null}

      <SettingsSection title="Typography and spacing">
        <SettingsRow
          title="Use system UI font"
          description="Ignore the theme's custom UI font and render the interface with the native system font (SF Pro on macOS)."
          resetAction={
            !systemUiFont ? (
              <SettingResetButton label="system UI font" onClick={() => setSystemUiFont(true)} />
            ) : null
          }
          control={
            <Switch
              checked={systemUiFont}
              onCheckedChange={(checked) => setSystemUiFont(Boolean(checked))}
              aria-label="Use system UI font"
            />
          }
        />

        <SettingsRow
          title="UI density"
          description="Control spacing in the sidebar, composer, chat gutters, and settings rows without changing font size."
          resetAction={
            settings.uiDensity !== defaults.uiDensity ? (
              <SettingResetButton
                label="UI density"
                onClick={() =>
                  updateSettings({
                    uiDensity: DEFAULT_UI_DENSITY,
                  })
                }
              />
            ) : null
          }
          control={
            <SettingsSegmentedControl
              value={settings.uiDensity}
              onValueChange={(value) => {
                if (!isUiDensity(value)) {
                  return;
                }
                updateSettings({ uiDensity: value });
              }}
              ariaLabel="UI density"
              options={UI_DENSITY_OPTIONS}
            />
          }
        />

        <SettingsRow
          title="Base font size"
          description="Adjust the app text base in pixels. Chat and UI typography scale proportionally from this value."
          resetAction={
            settings.chatFontSizePx !== defaults.chatFontSizePx ? (
              <SettingResetButton
                label="base font size"
                onClick={() =>
                  updateSettings({
                    chatFontSizePx: defaults.chatFontSizePx,
                  })
                }
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <Input
                type="number"
                size="sm"
                min={MIN_CHAT_FONT_SIZE_PX}
                max={MAX_CHAT_FONT_SIZE_PX}
                step={1}
                inputMode="numeric"
                variant="soft"
                className="w-full text-right sm:w-20"
                value={String(settings.chatFontSizePx)}
                onChange={(event) => {
                  const nextValue = event.target.value.trim();
                  if (nextValue.length === 0) return;
                  updateSettings({
                    chatFontSizePx: normalizeChatFontSizePx(Number(nextValue)),
                  });
                }}
                aria-label="Base font size in pixels"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          }
        />

        <SettingsRow
          title="Terminal font size"
          description="Adjust terminal text independently from the app and chat font size."
          resetAction={
            settings.terminalFontSizePx !== defaults.terminalFontSizePx ? (
              <SettingResetButton
                label="terminal font size"
                onClick={() =>
                  updateSettings({
                    terminalFontSizePx: defaults.terminalFontSizePx,
                  })
                }
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <Input
                type="number"
                size="sm"
                min={MIN_TERMINAL_FONT_SIZE_PX}
                max={MAX_TERMINAL_FONT_SIZE_PX}
                step={1}
                inputMode="numeric"
                variant="soft"
                className="w-full text-right sm:w-20"
                value={String(settings.terminalFontSizePx)}
                onChange={(event) => {
                  const nextValue = event.target.value.trim();
                  if (nextValue.length === 0) return;
                  updateSettings({
                    terminalFontSizePx: normalizeTerminalFontSizePx(Number(nextValue)),
                  });
                }}
                aria-label="Terminal font size in pixels"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          }
        />

        <SettingsRow
          title="Terminal font"
          description="Type any monospace font installed on this device (e.g. Fira Code). Leave empty for the default. Fonts that aren't installed fall back to the system monospace."
          resetAction={
            settings.terminalFontFamily !== defaults.terminalFontFamily ? (
              <SettingResetButton
                label="terminal font"
                onClick={() =>
                  updateSettings({
                    terminalFontFamily: defaults.terminalFontFamily,
                  })
                }
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center justify-end sm:w-auto">
              <Autocomplete
                items={visibleTerminalFontFamilySuggestions}
                mode="none"
                openOnInputClick
                value={settings.terminalFontFamily}
                onValueChange={(value) => {
                  updateSettings({
                    terminalFontFamily: normalizeTerminalFontFamily(value),
                  });
                }}
              >
                <AutocompleteInput
                  size="sm"
                  variant="soft"
                  showTrigger
                  showClear={settings.terminalFontFamily.length > 0}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="Default (JetBrains Mono)"
                  className="w-full sm:w-56"
                  aria-label="Terminal font family"
                />
                <AutocompletePopup className="w-56 min-w-56 font-system-ui">
                  <AutocompleteList>
                    {visibleTerminalFontFamilySuggestions.map((suggestion, index) => (
                      <AutocompleteItem
                        key={suggestion}
                        index={index}
                        value={suggestion}
                        className="font-normal text-[var(--color-text-foreground)]"
                        onClick={() => {
                          updateSettings({
                            terminalFontFamily: normalizeTerminalFontFamily(suggestion),
                          });
                        }}
                      >
                        {suggestion}
                      </AutocompleteItem>
                    ))}
                    <AutocompleteEmpty>No matching suggested fonts.</AutocompleteEmpty>
                  </AutocompleteList>
                </AutocompletePopup>
              </Autocomplete>
            </div>
          }
        />

        {shouldShowFontSmoothing
          ? renderBooleanSettingRow({
              settingKey: "enableNativeFontSmoothing",
              title: "Font smoothing",
              description: "Use macOS-style antialiasing for lighter, crisper text rendering.",
              resetLabel: "font smoothing",
              ariaLabel: "Enable font smoothing",
            })
          : null}
      </SettingsSection>

      <SettingsSection title={t("settings.timeAndReading")}>
        <SettingsRow
          title="Time format"
          description="System default follows your browser or OS clock preference."
          resetAction={
            settings.timestampFormat !== defaults.timestampFormat ? (
              <SettingResetButton
                label="time format"
                onClick={() =>
                  updateSettings({
                    timestampFormat: defaults.timestampFormat,
                  })
                }
              />
            ) : null
          }
          control={
            <SettingsSelectControl
              value={settings.timestampFormat}
              onValueChange={(value) => {
                if (value !== "locale" && value !== "12-hour" && value !== "24-hour") {
                  return;
                }
                updateSettings({
                  timestampFormat: value,
                });
              }}
              ariaLabel="Timestamp format"
              triggerClassName="w-full sm:w-40"
              valueContent={TIMESTAMP_FORMAT_LABELS[settings.timestampFormat]}
            >
              <SelectItem hideIndicator value="locale">
                {TIMESTAMP_FORMAT_LABELS.locale}
              </SelectItem>
              <SelectItem hideIndicator value="12-hour">
                {TIMESTAMP_FORMAT_LABELS["12-hour"]}
              </SelectItem>
              <SelectItem hideIndicator value="24-hour">
                {TIMESTAMP_FORMAT_LABELS["24-hour"]}
              </SelectItem>
            </SettingsSelectControl>
          }
        />
      </SettingsSection>
    </div>
  );

  const renderBehaviorPanel = () => (
    <div className="space-y-6">
      <SettingsSection title="Conversation">
        <SettingsRow
          title="Follow-up behavior"
          description="Choose whether messages sent during an active turn wait in the queue or steer the current run. Ctrl/Cmd+Enter uses the opposite behavior for one message."
          resetAction={
            settings.followUpBehavior !== defaults.followUpBehavior ? (
              <SettingResetButton
                label="follow-up behavior"
                onClick={() =>
                  updateSettings({
                    followUpBehavior: defaults.followUpBehavior,
                  })
                }
              />
            ) : null
          }
          control={
            <SettingsSegmentedControl
              value={settings.followUpBehavior}
              onValueChange={(value) => updateSettings({ followUpBehavior: value })}
              ariaLabel="Follow-up behavior"
              options={FOLLOW_UP_BEHAVIOR_OPTIONS}
            />
          }
        />

        {renderBooleanSettingRow({
          settingKey: "enableAssistantStreaming",
          title: "Assistant output",
          description: "Show token-by-token output while a response is in progress.",
          resetLabel: "assistant output",
          ariaLabel: "Stream assistant messages",
        })}
      </SettingsSection>

      <SettingsSection title="Review">
        {renderBooleanSettingRow({
          settingKey: "showPullRequestDiffColors",
          title: "Pull request diff colors",
          description: "Show additions in green and deletions in red in pull request summaries.",
          resetLabel: "pull request diff colors",
          ariaLabel: "Show pull request diff colors",
        })}

        {renderBooleanSettingRow({
          settingKey: "diffWordWrap",
          title: "Diff line wrapping",
          description:
            "Set the default wrap state when the diff panel opens. The in-panel wrap toggle only affects the current diff session.",
          resetLabel: "diff line wrapping",
          ariaLabel: "Wrap diff lines by default",
        })}
      </SettingsSection>

      <SettingsSection title="Safety confirmations">
        {renderBooleanSettingRow({
          settingKey: "confirmThreadDelete",
          title: "Delete confirmation",
          description: "Ask before deleting a thread and its chat history.",
          resetLabel: "delete confirmation",
          ariaLabel: "Confirm thread deletion",
        })}

        {renderBooleanSettingRow({
          settingKey: "confirmThreadArchive",
          title: "Archive confirmation",
          description: "Ask before archiving a thread.",
          resetLabel: "archive confirmation",
          ariaLabel: "Confirm thread archive",
        })}

        {renderBooleanSettingRow({
          settingKey: "confirmTerminalTabClose",
          title: "Terminal close confirmation",
          description: "Ask before closing a terminal tab and clearing its history.",
          resetLabel: "terminal close confirmation",
          ariaLabel: "Confirm terminal tab close",
        })}
      </SettingsSection>
    </div>
  );

  const renderRouteOwnedPanel = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralPanel();
      case "appearance":
        return renderAppearancePanel();
      case "behavior":
        return renderBehaviorPanel();
      case "shortcuts":
        return <KeyboardShortcutsSettingsPanel />;
      case "profile":
        return <ProfileSettingsPanel />;
      case "skills":
        return <SkillsSettingsPanel />;
      case "usage":
        return <ProviderUsageSettingsPanel />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        CHAT_MAIN_VIEWPORT_SHELL_CLASS_NAME,
        SETTINGS_PAGE_BACKGROUND_CLASS_NAME,
        CHAT_CONTENT_CARD_CLASS_NAME,
      )}
    >
      <RouteInsetSurface surfaceClassName={SETTINGS_PAGE_BACKGROUND_CLASS_NAME}>
        {/* Companion sidebar trigger so settings is reachable-and-exitable even when the
          sidebar is collapsed (web/mobile have no global Back arrow). Pinned to the
          card's top-left — at the same header height + traffic-light gutter as the
          chat and route headers — so the collapsed-state toggle sits by the traffic
          lights instead of floating in the centered settings body. It renders nothing
          while the sidebar is open (SidebarHeaderNavigationControls returns null), so it
          adds no navigation chrome in the common (open) state and never shifts the centered
          content (hence absolute, not a layout-occupying header row). The strip stays a
          drag-region so the Windows frameless window can be moved by its top edge; the
          caption buttons themselves are a separate fixed cluster (see root route). */}
        <div
          className={cn(
            "drag-region absolute inset-x-0 top-0 z-10 flex items-center",
            CHAT_SURFACE_HEADER_PADDING_X_CLASS,
            CHAT_SURFACE_HEADER_HEIGHT_CLASS,
            desktopTopBarTrafficLightGutterClassName,
          )}
        >
          <div className="pointer-events-auto">
            <SidebarHeaderNavigationControls />
          </div>
        </div>
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            <div
              className={cn(
                "mx-auto w-full px-6 py-8",
                activeSection === "profile" ? "max-w-3xl" : "max-w-2xl",
              )}
            >
              {activeSection !== "profile" ? (
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-xl font-medium tracking-tight text-foreground">
                      {activeSection === "general"
                        ? t("settings.general")
                        : activeSection === "appearance"
                          ? t("settings.appearance")
                          : activeSection === "behavior"
                            ? t("settings.behavior")
                            : activeSectionItem.label}
                    </h1>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {activeSection === "general"
                        ? t("settings.generalDescription")
                        : activeSection === "appearance"
                          ? t("settings.appearanceDescription")
                          : activeSection === "behavior"
                            ? t("settings.behaviorDescription")
                            : activeSectionItem.description}
                    </p>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    className="shrink-0"
                    disabled={changedSettingLabels.length === 0}
                    onClick={() => void restoreDefaults()}
                  >
                    <RotateCcwIcon className="size-3.5" />
                    {t("settings.restoreDefaults")}
                  </Button>
                </div>
              ) : null}

              {renderRouteOwnedPanel()}
              {/* These workflow owners stay mounted so drafts, request guards, and pending
                  mutations retain route lifetime while inactive panels render no DOM. */}
              <div className="contents">
                <NotificationsSettingsPanel
                  active={activeSection === "notifications"}
                  settings={settings}
                  defaults={defaults}
                  updateSettings={updateSettings}
                />
                <AppSnapSettingsPanel
                  active={activeSection === "appsnap"}
                  settings={settings}
                  defaults={defaults}
                  updateSettings={updateSettings}
                />
                <WorktreesSettingsPanel active={activeSection === "worktrees"} />
                <ArchivedSettingsPanel active={activeSection === "archived"} />
                <ModelsSettingsPanel
                  active={activeSection === "models"}
                  settings={settings}
                  defaults={defaults}
                  updateSettings={updateSettings}
                  resetEpoch={resetEpoch}
                />
                <ProvidersSettingsPanel
                  active={activeSection === "providers"}
                  settings={settings}
                  defaults={defaults}
                  updateSettings={updateSettings}
                  resetEpoch={resetEpoch}
                />
                <ExternalMcpSettingsPanel active={activeSection === "integrations"} />
                <AdvancedSettingsPanel
                  active={activeSection === "advanced"}
                  resetEpoch={resetEpoch}
                />
              </div>
            </div>
          </div>
        </div>
      </RouteInsetSurface>
    </div>
  );
}

export const Route = createFileRoute("/_chat/settings")({
  component: SettingsRouteView,
});
