// FILE: _chat.settings.tsx
// Purpose: Render the dedicated settings experience with its own section sidebar and grouped panels.
// Layer: Route screen
// Exports: Settings route component for `/settings`

import {
  DEFAULT_GIT_TEXT_GENERATION_MODEL,
  type DesktopAppIcon,
  type EngineKind,
  type ServerSettingsPatch,
} from "@harnessos/contracts";
import { ENGINE_DESCRIPTORS, ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { sameAppSnapShortcut } from "@harnessos/shared/appSnapShortcut";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  type FollowUpBehavior,
  DEFAULT_CHAT_WIDTH,
  DEFAULT_UI_DENSITY,
  type UiDensity,
  MAX_CHAT_FONT_SIZE_PX,
  MAX_TERMINAL_FONT_SIZE_PX,
  MIN_CHAT_FONT_SIZE_PX,
  MIN_TERMINAL_FONT_SIZE_PX,
  normalizeChatFontSizePx,
  normalizeTerminalFontFamily,
  normalizeTerminalFontSizePx,
  TERMINAL_FONT_FAMILY_SUGGESTIONS,
  type LocalPreferences,
  useLocalPreferences,
} from "../localPreferences";
import {
  getGitTextGenerationModelOptions,
  isGitTextGenerationSettingsDirty,
} from "../engineSettings";
import { useServerSettings } from "../serverSettings";
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
import { WebSearchSettingsPanel } from "~/components/settings/WebSearchSettingsPanel";
import { PromptsSettingsPanel } from "~/components/settings/PromptsSettingsPanel";
import {
  isEngineInstallSettingsDirty,
  EnginesSettingsPanel,
} from "~/components/settings/EnginesSettingsPanel";
import { EngineOptionLabel } from "../components/EngineIcon";
import { KeyboardShortcutsSettingsPanel } from "../components/settings/KeyboardShortcutsSettingsPanel";
import { ProfileSettingsPanel } from "../components/settings/ProfileSettingsPanel";
import { EngineUsageSettingsPanel } from "../components/settings/EngineUsageSettingsPanel";
import { ExternalConnectionsSettingsPanel } from "../components/settings/ExternalConnectionsSettingsPanel";
import { BuiltInToolsSettingsPanel } from "../components/settings/BuiltInToolsSettingsPanel";
import {
  SettingResetButton,
  SettingsSegmentedControl,
  SettingsSelectControl,
} from "../components/settings/SettingControls";
import {
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
import { toastManager } from "../components/ui/toast";
import { RouteInsetSurface } from "../components/RouteInsetSurface";
import { SidebarHeaderNavigationControls } from "../components/SidebarHeaderNavigationControls";
import { useDesktopCustomTitleBarState } from "../hooks/useDesktopCustomTitleBar";
import { useDesktopAppIcon } from "../hooks/useDesktopAppIcon";
import { useDesktopTopBarTrafficLightGutterClassName } from "../hooks/useDesktopTopBarGutter";
import { useEngineModelCatalog } from "../hooks/useEngineModelCatalog";
import { useTheme } from "../hooks/useTheme";
import { isUiDensity } from "../lib/appDensity";
import { isChatWidthMode, type ChatWidthMode } from "../lib/chatWidth";
import { isElectron } from "../env";
import { useI18n } from "../i18n";
import { RotateCcwIcon } from "../lib/icons";
import {
  cn,
  getNavigatorPlatform,
  isLinuxPlatform,
  isMacPlatform,
  isWindowsPlatform,
} from "../lib/utils";
import { ensureNativeApi, readNativeApi } from "../nativeApi";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";
import { sameEngineOrder } from "../engineOrdering";
import {
  normalizeSettingsSection,
  SETTINGS_SECTION_BY_ID,
  SETTINGS_TARGETS,
} from "../settingsNavigation";
import {
  APPEARANCE_SETTINGS_SEARCH,
  BEHAVIOR_SETTINGS_SEARCH,
  GENERAL_SETTINGS_SEARCH,
} from "../settingsMetadata/coreSettings";
import { SETTINGS_PAGE_BACKGROUND_CLASS_NAME } from "../settingsPanelStyles";

// ── Settings taxonomy ──────────────────────────────────────────────────────

const ENGINE_SELECT_OPTIONS = ENGINE_DESCRIPTORS.map((descriptor) => descriptor.kind);
const GIT_WRITING_DISCOVERY_PROVIDERS = ["codex", "kilo", "opencode"] as const;

// ── Settings UI primitives ────────────────────────────────────────────────

// Shared settings controls live in ~/components/settings/SettingControls.

function isEngineSelectOption(value: string): value is EngineKind {
  return ENGINE_SELECT_OPTIONS.includes(value as EngineKind);
}

// Keys of LocalPreferences whose value is a plain boolean — the only ones that can be
// driven by the shared on/off toggle row below.
type BooleanSettingKey = {
  [Key in keyof LocalPreferences]-?: LocalPreferences[Key] extends boolean ? Key : never;
}[keyof LocalPreferences];

// ── Route screen ───────────────────────────────────────────────────────────

function SettingsRouteView() {
  const navigate = useNavigate();
  const routeSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const activeSection = normalizeSettingsSection(routeSearch.section);
  const settingsTarget = typeof routeSearch.target === "string" ? routeSearch.target : null;
  const {
    isDefaultActiveTheme,
    resetAllThemes,
    resolvedTheme,
    theme,
    setTheme,
    systemUiFont,
    setSystemUiFont,
  } = useTheme();
  const {
    preferences: settings,
    defaults,
    updatePreferences,
    resetPreferences,
  } = useLocalPreferences();
  const {
    query: serverSettingsQuery,
    settings: serverSettings,
    defaults: serverDefaults,
    updateServerSettings: mutateServerSettings,
    updateEngineCredential: mutateEngineCredential,
    resetServerSettings,
  } = useServerSettings();
  const activeServerSettings = serverSettings ?? serverDefaults;
  const { icon: desktopAppIcon, updateIcon: updateDesktopAppIcon } = useDesktopAppIcon();
  const { t } = useI18n();
  const serverSettingsStatus = serverSettings ? undefined : serverSettingsQuery.isError ? (
    <span className="inline-flex items-center gap-2">
      <span>{t("settings.unavailable")}</span>
      <Button
        type="button"
        size="xs"
        variant="outline"
        onClick={() => void serverSettingsQuery.refetch()}
      >
        {t("common.retry")}
      </Button>
    </span>
  ) : (
    t("common.loading")
  );
  const updateSettings = (patch: Partial<LocalPreferences>) => {
    const result = updatePreferences(patch);
    if (result.state === "failed") {
      toastManager.add({
        type: "error",
        title: t("settings.localPreferenceSaveFailed"),
        description: t("settings.localPreferenceSaveRecovery"),
      });
    }
    return result;
  };
  const updateServerSettings = async (patch: ServerSettingsPatch) => {
    const result = await mutateServerSettings(patch);
    if (result.state === "failed") {
      toastManager.add({
        type: "error",
        title: t("settings.engineConfigSaveFailed"),
        description: t("settings.engineConfigSaveRecovery"),
      });
    }
    return result;
  };
  const updateEngineCredential = async (engine: "kilo" | "opencode", serverPassword: string) => {
    const result = await mutateEngineCredential(engine, serverPassword);
    if (result.state === "failed") {
      toastManager.add({
        type: "error",
        title: t("settings.engineConfigSaveFailed"),
        description: t("settings.engineConfigSaveRecovery"),
      });
    }
    return result;
  };
  const activeSectionDescriptor = SETTINGS_SECTION_BY_ID.get(activeSection);
  const currentGitTextGenerationEngine =
    serverSettings?.textGenerationEngineSelection.engine ??
    serverDefaults.textGenerationEngineSelection.engine;
  const currentGitTextGenerationModel =
    serverSettings?.textGenerationEngineSelection.model ??
    serverDefaults.textGenerationEngineSelection.model ??
    DEFAULT_GIT_TEXT_GENERATION_MODEL;
  const serverConfigQuery = useQuery({
    ...serverConfigQueryOptions(),
    enabled: activeSection === "general",
  });
  const gitWritingModelHintByEngine = useMemo<Partial<Record<EngineKind, string | null>>>(
    () => ({
      [currentGitTextGenerationEngine]: currentGitTextGenerationModel,
    }),
    [currentGitTextGenerationModel, currentGitTextGenerationEngine],
  );
  const { modelOptionsByEngine: gitWritingCatalogOptionsByEngine } = useEngineModelCatalog({
    selectedEngine: currentGitTextGenerationEngine,
    discoveryEnabled: activeSection === "general",
    selectedEngineDiscoveryEnabled: activeSection === "general",
    cwd: serverConfigQuery.data?.cwd ?? null,
    modelHintByEngine: gitWritingModelHintByEngine,
    prefetchEngines: GIT_WRITING_DISCOVERY_PROVIDERS,
  });
  const gitTextGenerationModelOptions = useMemo(
    () =>
      getGitTextGenerationModelOptions(activeServerSettings, {
        codex: gitWritingCatalogOptionsByEngine.codex,
        kilo: gitWritingCatalogOptionsByEngine.kilo,
        opencode: gitWritingCatalogOptionsByEngine.opencode,
      }),
    [
      gitWritingCatalogOptionsByEngine.codex,
      gitWritingCatalogOptionsByEngine.kilo,
      gitWritingCatalogOptionsByEngine.opencode,
      activeServerSettings,
    ],
  );
  const currentGitTextGenerationValue = `${currentGitTextGenerationEngine}:${currentGitTextGenerationModel}`;
  const selectedGitTextGenerationModelLabel =
    gitTextGenerationModelOptions.find(
      (option) =>
        option.engine === currentGitTextGenerationEngine &&
        option.slug === currentGitTextGenerationModel,
    )?.name ?? currentGitTextGenerationModel;
  const uiDensityOptions = useMemo(
    () =>
      [
        { value: "compact", label: t("settings.densityCompact") },
        { value: "comfortable", label: t("settings.densityComfortable") },
        { value: "spacious", label: t("settings.densitySpacious") },
      ] as const satisfies ReadonlyArray<{ value: UiDensity; label: string }>,
    [t],
  );
  const chatWidthOptions = useMemo(
    () =>
      [
        { value: "standard", label: t("settings.chatWidthStandard") },
        { value: "wide", label: t("settings.chatWidthWide") },
        { value: "full", label: t("settings.chatWidthFull") },
      ] as const satisfies ReadonlyArray<{ value: ChatWidthMode; label: string }>,
    [t],
  );
  const followUpBehaviorOptions = useMemo(
    () =>
      [
        { value: "queue", label: t("settings.queue") },
        { value: "steer", label: t("settings.steer") },
      ] as const satisfies ReadonlyArray<{
        value: FollowUpBehavior;
        label: string;
      }>,
    [t],
  );
  const timestampFormatLabels = useMemo(
    () => ({
      locale: t("settings.systemDefault"),
      "12-hour": t("settings.twelveHour"),
      "24-hour": t("settings.twentyFourHour"),
    }),
    [t],
  );
  const desktopTopBarTrafficLightGutterClassName = useDesktopTopBarTrafficLightGutterClassName();
  const [resetEpoch, setResetEpoch] = useState(0);
  const platform = getNavigatorPlatform();
  const shouldShowFontSmoothing = isMacPlatform(platform);
  const supportsCustomTitleBarSetting =
    isElectron && (isWindowsPlatform(platform) || isLinuxPlatform(platform));
  const customTitleBarState = useDesktopCustomTitleBarState();
  const customTitleBarRestartRequired =
    customTitleBarState.supported && customTitleBarState.preference !== customTitleBarState.active;
  const customTitleBarPreferenceDirty =
    supportsCustomTitleBarSetting &&
    customTitleBarState.supported &&
    customTitleBarState.preference !== true;

  function showCustomTitleBarRestartToast(): void {
    toastManager.add({
      type: "warning",
      title: t("settings.customTitleBarRestartToastTitle"),
      description: t("settings.customTitleBarRestartToastDescription"),
      actionProps: {
        "aria-label": t("settings.restartHarnessOS"),
        children: t("common.restart"),
        onClick: () => {
          void window.desktopBridge?.customTitleBar?.relaunch();
        },
      },
    });
  }

  async function persistCustomTitleBarPreference(
    enabled: boolean,
  ): Promise<{ readonly restartRequired: boolean } | null> {
    try {
      const bridge = window.desktopBridge?.customTitleBar;
      if (!bridge) throw new Error("Desktop title bar bridge is unavailable.");
      const state = await bridge.setPreference(enabled);
      if (!state.supported || state.preference !== enabled) {
        throw new Error("Desktop title bar preference was not persisted.");
      }
      return state;
    } catch {
      toastManager.add({
        type: "error",
        title: t("settings.customTitleBarUpdateFailed"),
      });
      return null;
    }
  }

  async function applyCustomTitleBarPreference(enabled: boolean): Promise<void> {
    const state = await persistCustomTitleBarPreference(enabled);
    if (state === null) return;
    if (state.restartRequired) showCustomTitleBarRestartToast();
  }

  async function applyDesktopAppIcon(icon: DesktopAppIcon): Promise<void> {
    const result = await updateDesktopAppIcon(icon);
    if (result.state === "failed") {
      toastManager.add({
        type: "error",
        title: t("settings.appIconUpdateFailed"),
        description: t("settings.retryAfterReconnect"),
      });
    }
  }

  const visibleTerminalFontFamilySuggestions = useMemo(() => {
    const query = settings.terminalFontFamily.trim().toLowerCase();
    if (!query) return TERMINAL_FONT_FAMILY_SUGGESTIONS;
    return TERMINAL_FONT_FAMILY_SUGGESTIONS.filter((suggestion) =>
      suggestion.toLowerCase().includes(query),
    );
  }, [settings.terminalFontFamily]);

  const isGitTextGenerationModelDirty = isGitTextGenerationSettingsDirty(
    serverSettings ?? serverDefaults,
    serverDefaults,
  );
  const isInstallSettingsDirty = isEngineInstallSettingsDirty(
    serverSettings ?? serverDefaults,
    serverDefaults,
  );
  const hiddenEngineCount = new Set(settings.hiddenEngines).size;
  const isEngineOrderDirty = !sameEngineOrder(settings.engineOrder, defaults.engineOrder);

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
    ...(theme !== "system" ? [t("settings.theme")] : []),
    ...(!isDefaultActiveTheme ? [t("settings.theme")] : []),
    ...((serverSettings ?? serverDefaults).defaultEngine !== serverDefaults.defaultEngine
      ? [t("settings.defaultEngine")]
      : []),
    ...((serverSettings ?? serverDefaults).defaultThreadEnvMode !==
    serverDefaults.defaultThreadEnvMode
      ? [t("settings.defaultThreadMode")]
      : []),
    ...(settings.sidebarProjectSortOrder !== defaults.sidebarProjectSortOrder
      ? [t("settings.projectOrder")]
      : []),
    ...(settings.sidebarThreadSortOrder !== defaults.sidebarThreadSortOrder
      ? [t("settings.threadOrder")]
      : []),
    ...(settings.showStudioSection !== defaults.showStudioSection ? [t("nav.studio")] : []),
    ...(settings.uiDensity !== defaults.uiDensity ? [t("settings.uiDensity")] : []),
    ...(settings.chatWidth !== defaults.chatWidth ? [t("settings.chatWidth")] : []),
    ...(desktopAppIcon !== "default" ? [t("settings.appIcon")] : []),
    ...(settings.chatFontSizePx !== defaults.chatFontSizePx ? [t("settings.baseFontSize")] : []),
    ...(settings.terminalFontSizePx !== defaults.terminalFontSizePx
      ? [t("settings.terminalFontSize")]
      : []),
    ...(settings.terminalFontFamily !== defaults.terminalFontFamily
      ? [t("settings.terminalFont")]
      : []),
    ...(customTitleBarPreferenceDirty ? [t("settings.customTitleBar")] : []),
    ...(shouldShowFontSmoothing &&
    settings.enableNativeFontSmoothing !== defaults.enableNativeFontSmoothing
      ? [t("settings.fontSmoothing")]
      : []),
    ...(settings.timestampFormat !== defaults.timestampFormat ? [t("settings.timeFormat")] : []),
    ...(settings.enableTaskCompletionToasts !== defaults.enableTaskCompletionToasts
      ? [t("settings.activityToasts")]
      : []),
    ...(settings.enableSystemTaskCompletionNotifications !==
    defaults.enableSystemTaskCompletionNotifications
      ? [t("settings.desktopNotifications")]
      : []),
    ...((serverSettings ?? serverDefaults).enableAssistantStreaming !==
    serverDefaults.enableAssistantStreaming
      ? [t("settings.assistantOutput")]
      : []),
    ...(settings.followUpBehavior !== defaults.followUpBehavior
      ? [t("settings.followUpBehavior")]
      : []),
    ...(settings.enableAppSnap !== defaults.enableAppSnap ? [t("settings.appsnap")] : []),
    ...(!sameAppSnapShortcut(settings.appSnapShortcut, defaults.appSnapShortcut)
      ? [t("settings.shortcut")]
      : []),
    ...(settings.appSnapPlaySound !== defaults.appSnapPlaySound
      ? [t("settings.captureSound")]
      : []),
    ...((serverSettings ?? serverDefaults).enableEngineUpdateChecks !==
    serverDefaults.enableEngineUpdateChecks
      ? [t("settings.automaticCliUpdates")]
      : []),
    ...(settings.diffWordWrap !== defaults.diffWordWrap ? [t("settings.diffLineWrapping")] : []),
    ...(settings.showPullRequestDiffColors !== defaults.showPullRequestDiffColors
      ? [t("settings.pullRequestDiffColors")]
      : []),
    ...(settings.confirmThreadDelete !== defaults.confirmThreadDelete
      ? [t("settings.deleteConfirmation")]
      : []),
    ...(settings.confirmThreadArchive !== defaults.confirmThreadArchive
      ? [t("settings.archiveConfirmation")]
      : []),
    ...(settings.confirmTerminalTabClose !== defaults.confirmTerminalTabClose
      ? [t("settings.terminalCloseConfirmation")]
      : []),
    ...(isGitTextGenerationModelDirty ? [t("settings.gitWritingModel")] : []),
    ...(Object.values((serverSettings ?? serverDefaults).engines).some(
      (engine) => "customModels" in engine && engine.customModels.length > 0,
    )
      ? [t("settings.customModels")]
      : []),
    ...(isInstallSettingsDirty ? [t("settings.engineTools")] : []),
    ...(hiddenEngineCount > 0 ? [t("settings.visibleEngines")] : []),
    ...(isEngineOrderDirty ? [t("settings.enginePicker")] : []),
  ];

  async function restoreDefaults() {
    if (changedSettingLabels.length === 0) return;

    const api = readNativeApi();
    const confirmed = await (api ?? ensureNativeApi()).dialogs.confirm(
      [
        t("settings.restoreConfirmTitle"),
        t("settings.restoreConfirmDescription", {
          settings: changedSettingLabels.join(", "),
        }),
      ].join("\n"),
    );
    if (!confirmed) return;

    let appearanceResetFailed = false;
    try {
      resetAllThemes();
    } catch {
      appearanceResetFailed = true;
    }
    const localResult = resetPreferences();
    const [
      serverResult,
      kiloCredentialResult,
      openCodeCredentialResult,
      iconResult,
      titleBarResult,
    ] = await Promise.all([
      resetServerSettings(),
      updateEngineCredential("kilo", ""),
      updateEngineCredential("opencode", ""),
      isElectron ? updateDesktopAppIcon("default") : Promise.resolve({ state: "saved" as const }),
      customTitleBarPreferenceDirty
        ? persistCustomTitleBarPreference(true)
        : Promise.resolve({ restartRequired: false }),
    ]);

    const applyDefaultAppSnapRuntime = async (): Promise<boolean> => {
      const appSnapBridge = window.desktopBridge?.appSnap;
      if (!appSnapBridge) return true;
      try {
        await appSnapBridge.setShortcut(defaults.appSnapShortcut);
        await appSnapBridge.setEnabled(defaults.enableAppSnap);
        return true;
      } catch {
        return false;
      }
    };
    let appSnapNativeApplied = true;
    if (localResult.state !== "failed") {
      appSnapNativeApplied = await applyDefaultAppSnapRuntime();
    }

    const failed =
      appearanceResetFailed ||
      localResult.state === "failed" ||
      serverResult.state === "failed" ||
      kiloCredentialResult.state === "failed" ||
      openCodeCredentialResult.state === "failed" ||
      iconResult.state === "failed" ||
      titleBarResult === null ||
      !appSnapNativeApplied;
    if (failed) {
      toastManager.add({
        type: "warning",
        title: t("settings.restorePartiallyCompleted"),
        description:
          !appSnapNativeApplied && localResult.state !== "failed"
            ? t("settings.restoreAppSnapRuntimePending")
            : t("settings.restorePartiallyCompletedDescription"),
        ...(!appSnapNativeApplied && localResult.state !== "failed"
          ? {
              actionProps: {
                children: t("common.retry"),
                onClick: () => {
                  void applyDefaultAppSnapRuntime().then((applied) => {
                    toastManager.add({
                      type: applied ? "success" : "error",
                      title: t(
                        applied
                          ? "settings.restoreAppSnapRuntimeCompleted"
                          : "settings.restoreAppSnapRuntimeFailed",
                      ),
                    });
                  });
                },
              },
            }
          : {}),
      });
    } else {
      toastManager.add({ type: "success", title: t("settings.restoreCompleted") });
    }
    if (titleBarResult?.restartRequired) showCustomTitleBarRestartToast();
    setResetEpoch((current) => current + 1);
  }

  // Shared on/off settings row: a labelled Switch bound to a boolean local preference
  // key, with the standard "reset to default" affordance shown only when changed.
  // Rows with bespoke controls (e.g. the desktop-notifications Test button) keep
  // their own markup instead of using this helper.
  const renderBooleanSettingRow = (config: {
    settingKey: BooleanSettingKey;
    anchorId?: string;
    title: string;
    description: string;
    resetLabel: string;
    ariaLabel: string;
  }) => {
    const { settingKey, anchorId, title, description, resetLabel, ariaLabel } = config;
    const isChanged = settings[settingKey] !== defaults[settingKey];
    return (
      <SettingsRow
        {...(anchorId ? { anchorId } : {})}
        title={title}
        description={description}
        resetAction={
          isChanged ? (
            <SettingResetButton
              label={resetLabel}
              onClick={() =>
                updateSettings({
                  [settingKey]: defaults[settingKey],
                } as Partial<LocalPreferences>)
              }
            />
          ) : null
        }
        control={
          <Switch
            checked={settings[settingKey]}
            onCheckedChange={(checked) =>
              updateSettings({
                [settingKey]: Boolean(checked),
              } as Partial<LocalPreferences>)
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
                onClick={() =>
                  updateSettings({
                    localePreference: defaults.localePreference,
                  })
                }
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
          anchorId={GENERAL_SETTINGS_SEARCH.defaultEngine.target}
          title={t("settings.defaultEngine")}
          description={t("settings.defaultEngineDescription")}
          status={serverSettingsStatus}
          resetAction={
            activeServerSettings.defaultEngine !== serverDefaults.defaultEngine ? (
              <SettingResetButton
                label={t("settings.defaultEngine")}
                onClick={() =>
                  void updateServerSettings({ defaultEngine: serverDefaults.defaultEngine })
                }
              />
            ) : null
          }
          control={
            <SettingsSelectControl
              disabled={!serverSettings}
              value={activeServerSettings.defaultEngine}
              onValueChange={(value) => {
                if (!isEngineSelectOption(value)) return;
                void updateServerSettings({ defaultEngine: value });
              }}
              ariaLabel={t("settings.defaultEngine")}
              valueContent={
                <EngineOptionLabel
                  engine={activeServerSettings.defaultEngine}
                  label={ENGINE_DISPLAY_NAMES[activeServerSettings.defaultEngine]}
                />
              }
            >
              {ENGINE_SELECT_OPTIONS.map((engine) => (
                <SelectItem hideIndicator key={engine} value={engine}>
                  <EngineOptionLabel engine={engine} label={ENGINE_DISPLAY_NAMES[engine]} />
                </SelectItem>
              ))}
            </SettingsSelectControl>
          }
        />

        <SettingsRow
          anchorId={GENERAL_SETTINGS_SEARCH.newThreads.target}
          title={t("settings.newThreads")}
          description={t("settings.newThreadsDescription")}
          status={serverSettingsStatus}
          resetAction={
            activeServerSettings.defaultThreadEnvMode !== serverDefaults.defaultThreadEnvMode ? (
              <SettingResetButton
                label={t("settings.newThreads")}
                onClick={() =>
                  void updateServerSettings({
                    defaultThreadEnvMode: serverDefaults.defaultThreadEnvMode,
                  })
                }
              />
            ) : null
          }
          control={
            <SettingsSelectControl
              disabled={!serverSettings}
              value={activeServerSettings.defaultThreadEnvMode}
              onValueChange={(value) => {
                if (value !== "local" && value !== "worktree") return;
                void updateServerSettings({
                  defaultThreadEnvMode: value,
                });
              }}
              ariaLabel={t("settings.defaultThreadMode")}
              valueContent={
                activeServerSettings.defaultThreadEnvMode === "worktree"
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
          anchorId={GENERAL_SETTINGS_SEARCH.projectOrder.target}
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
          anchorId={GENERAL_SETTINGS_SEARCH.threadOrder.target}
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
          settingKey: "showStudioSection",
          anchorId: GENERAL_SETTINGS_SEARCH.studioSection.target,
          title: t("nav.studio"),
          description: t("settings.studioSurfaceDescription"),
          resetLabel: t("nav.studio"),
          ariaLabel: t("settings.studioSurfaceDescription"),
        })}
      </SettingsSection>

      <div id={SETTINGS_TARGETS.environmentPanel} className="space-y-6">
        <SettingsSection title={t("settings.codeAndStatus")}>
          {renderBooleanSettingRow({
            settingKey: "showEnvironmentUsage",
            anchorId: GENERAL_SETTINGS_SEARCH.environmentUsage.target,
            title: t("settings.usageLabel"),
            description: t("settings.usageDescription"),
            resetLabel: t("settings.usageLabel"),
            ariaLabel: t("settings.usageDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentRepository",
            anchorId: GENERAL_SETTINGS_SEARCH.environmentRepository.target,
            title: t("settings.repositoryLabel"),
            description: t("settings.repositoryDescription"),
            resetLabel: t("settings.repositoryLabel"),
            ariaLabel: t("settings.repositoryDescription"),
          })}

          <div id={GENERAL_SETTINGS_SEARCH.gitWritingModel.target}>
            <SettingsRow
              title={t("settings.gitWritingModel")}
              description={t("settings.gitWritingModelDescription")}
              status={serverSettingsStatus}
              resetAction={
                isGitTextGenerationModelDirty ? (
                  <SettingResetButton
                    label={t("settings.gitWritingModel")}
                    onClick={() =>
                      void updateServerSettings({
                        textGenerationEngineSelection: {
                          engine: serverDefaults.textGenerationEngineSelection.engine,
                          model: serverDefaults.textGenerationEngineSelection.model,
                        },
                      })
                    }
                  />
                ) : null
              }
              control={
                <SettingsSelectControl
                  disabled={!serverSettings}
                  value={currentGitTextGenerationValue}
                  onValueChange={(value) => {
                    const separatorIndex = value.indexOf(":");
                    if (separatorIndex <= 0 || separatorIndex === value.length - 1) return;
                    const engine = value.slice(0, separatorIndex) as EngineKind;
                    const model = value.slice(separatorIndex + 1);
                    if (!ENGINE_SELECT_OPTIONS.includes(engine)) return;
                    void updateServerSettings({
                      textGenerationEngineSelection: { engine, model },
                    });
                  }}
                  ariaLabel={t("settings.gitTextGenerationModel")}
                  triggerClassName="w-full sm:w-56"
                  valueContent={selectedGitTextGenerationModelLabel}
                >
                  {gitTextGenerationModelOptions.map((option) => (
                    <SelectItem
                      hideIndicator
                      key={`${option.engine}:${option.slug}`}
                      value={`${option.engine}:${option.slug}`}
                    >
                      {ENGINE_DISPLAY_NAMES[option.engine]} / {option.name}
                    </SelectItem>
                  ))}
                </SettingsSelectControl>
              }
            />
          </div>

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentPullRequest",
            anchorId: GENERAL_SETTINGS_SEARCH.environmentPullRequest.target,
            title: t("settings.pullRequest"),
            description: t("settings.pullRequestDescription"),
            resetLabel: t("settings.pullRequest"),
            ariaLabel: t("settings.pullRequestDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentEditor",
            anchorId: GENERAL_SETTINGS_SEARCH.environmentEditor.target,
            title: t("settings.editor"),
            description: t("settings.editorDescription"),
            resetLabel: t("settings.editor"),
            ariaLabel: t("settings.editorDescription"),
          })}
        </SettingsSection>

        <SettingsSection title={t("settings.contextAndNotes")}>
          {renderBooleanSettingRow({
            settingKey: "showEnvironmentRecap",
            anchorId: GENERAL_SETTINGS_SEARCH.environmentRecap.target,
            title: t("settings.recap"),
            description: t("settings.recapDescription"),
            resetLabel: t("settings.recap"),
            ariaLabel: t("settings.recapDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentPinned",
            anchorId: GENERAL_SETTINGS_SEARCH.environmentPinned.target,
            title: t("settings.pinnedMessages"),
            description: t("settings.pinnedMessagesDescription"),
            resetLabel: t("settings.pinnedMessages"),
            ariaLabel: t("settings.pinnedMessagesDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentMarkers",
            anchorId: GENERAL_SETTINGS_SEARCH.environmentMarkers.target,
            title: t("settings.textMarkers"),
            description: t("settings.textMarkersDescription"),
            resetLabel: t("settings.textMarkers"),
            ariaLabel: t("settings.textMarkersDescription"),
          })}

          {renderBooleanSettingRow({
            settingKey: "showEnvironmentNotepad",
            anchorId: GENERAL_SETTINGS_SEARCH.environmentNotepad.target,
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
      <SettingsSectionShell
        title={t("settings.themeSection")}
        action={
          theme !== "system" ? (
            <SettingResetButton label={t("settings.theme")} onClick={() => setTheme("system")} />
          ) : null
        }
      >
        {/* The mode picker is the one settings control that sits directly on the page
            instead of inside a card — the mockups are the whole UI, so boxing them in
            a card reads as chrome around chrome. The anchor keeps search deep-links
            (`?target=setting-theme`) working without the SettingsRow. */}
        <div id={APPEARANCE_SETTINGS_SEARCH.theme.target} className="scroll-mt-24 pb-1.5">
          <ThemeModePicker
            value={theme}
            onValueChange={setTheme}
            ariaLabel={t("settings.themePreference")}
          />
        </div>

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
        <SettingsSection title={t("settings.appSection")}>
          <SettingsRow
            title={t("settings.appIcon")}
            description={t("settings.appIconDescription")}
            resetAction={
              desktopAppIcon !== "default" ? (
                <SettingResetButton
                  label={t("settings.appIcon")}
                  onClick={() => void applyDesktopAppIcon("default")}
                />
              ) : null
            }
            control={
              <AppIconPicker
                platform={typeof navigator === "undefined" ? "" : navigator.platform}
                value={desktopAppIcon}
                onValueChange={async (desktopAppIcon) => {
                  await applyDesktopAppIcon(desktopAppIcon);
                }}
              />
            }
          />
          {supportsCustomTitleBarSetting ? (
            <SettingsRow
              title={t("settings.customTitleBar")}
              description={
                customTitleBarRestartRequired
                  ? t("settings.customTitleBarRestartDescription")
                  : t("settings.customTitleBarDescription")
              }
              status={
                customTitleBarRestartRequired
                  ? t("settings.customTitleBarRestartRequired")
                  : undefined
              }
              resetAction={
                customTitleBarPreferenceDirty ? (
                  <SettingResetButton
                    label={t("settings.customTitleBar")}
                    onClick={() => {
                      void applyCustomTitleBarPreference(true);
                    }}
                  />
                ) : null
              }
              control={
                <div className="flex items-center gap-2">
                  {customTitleBarRestartRequired ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        void window.desktopBridge?.customTitleBar?.relaunch();
                      }}
                    >
                      {t("common.restart")}
                    </Button>
                  ) : null}
                  <Switch
                    checked={customTitleBarState.preference}
                    onCheckedChange={(checked) => {
                      void applyCustomTitleBarPreference(Boolean(checked));
                    }}
                    aria-label={t("settings.customTitleBar")}
                  />
                </div>
              }
            />
          ) : null}
        </SettingsSection>
      ) : null}

      <SettingsSection title={t("settings.typography")}>
        <SettingsRow
          anchorId={APPEARANCE_SETTINGS_SEARCH.systemUiFont.target}
          title={t("settings.systemUiFont")}
          description={t("settings.systemUiFontDescription")}
          resetAction={
            !systemUiFont ? (
              <SettingResetButton
                label={t("settings.systemUiFont")}
                onClick={() => setSystemUiFont(true)}
              />
            ) : null
          }
          control={
            <Switch
              checked={systemUiFont}
              onCheckedChange={(checked) => setSystemUiFont(Boolean(checked))}
              aria-label={t("settings.systemUiFont")}
            />
          }
        />

        <SettingsRow
          anchorId={APPEARANCE_SETTINGS_SEARCH.uiDensity.target}
          title={t("settings.uiDensity")}
          description={t("settings.uiDensityDescription")}
          resetAction={
            settings.uiDensity !== defaults.uiDensity ? (
              <SettingResetButton
                label={t("settings.uiDensity")}
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
              ariaLabel={t("settings.uiDensity")}
              options={uiDensityOptions}
            />
          }
        />

        <SettingsRow
          anchorId={APPEARANCE_SETTINGS_SEARCH.chatWidth.target}
          title={t("settings.chatWidth")}
          description={t("settings.chatWidthDescription")}
          resetAction={
            settings.chatWidth !== defaults.chatWidth ? (
              <SettingResetButton
                label={t("settings.chatWidth")}
                onClick={() => updateSettings({ chatWidth: DEFAULT_CHAT_WIDTH })}
              />
            ) : null
          }
          control={
            <SettingsSegmentedControl
              value={settings.chatWidth}
              onValueChange={(value) => {
                if (!isChatWidthMode(value)) {
                  return;
                }
                updateSettings({ chatWidth: value });
              }}
              ariaLabel={t("settings.chatWidth")}
              options={chatWidthOptions}
            />
          }
        />

        <SettingsRow
          anchorId={APPEARANCE_SETTINGS_SEARCH.baseFontSize.target}
          title={t("settings.baseFontSize")}
          description={t("settings.baseFontSizeDescription")}
          resetAction={
            settings.chatFontSizePx !== defaults.chatFontSizePx ? (
              <SettingResetButton
                label={t("settings.baseFontSize")}
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
                aria-label={t("settings.baseFontSizeAria")}
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          }
        />

        <SettingsRow
          anchorId={APPEARANCE_SETTINGS_SEARCH.terminalFontSize.target}
          title={t("settings.terminalFontSize")}
          description={t("settings.terminalFontSizeDescription")}
          resetAction={
            settings.terminalFontSizePx !== defaults.terminalFontSizePx ? (
              <SettingResetButton
                label={t("settings.terminalFontSize")}
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
                aria-label={t("settings.terminalFontSizeAria")}
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          }
        />

        <SettingsRow
          anchorId={APPEARANCE_SETTINGS_SEARCH.terminalFont.target}
          title={t("settings.terminalFont")}
          description={t("settings.terminalFontDescription")}
          resetAction={
            settings.terminalFontFamily !== defaults.terminalFontFamily ? (
              <SettingResetButton
                label={t("settings.terminalFont")}
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
                  placeholder={t("settings.terminalFontDefault")}
                  className="w-full sm:w-56"
                  aria-label={t("settings.terminalFontFamily")}
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
                    <AutocompleteEmpty>{t("settings.noSuggestedFonts")}</AutocompleteEmpty>
                  </AutocompleteList>
                </AutocompletePopup>
              </Autocomplete>
            </div>
          }
        />

        {shouldShowFontSmoothing
          ? renderBooleanSettingRow({
              settingKey: "enableNativeFontSmoothing",
              title: t("settings.fontSmoothing"),
              description: t("settings.fontSmoothingDescription"),
              resetLabel: t("settings.fontSmoothing"),
              ariaLabel: t("settings.enableFontSmoothing"),
            })
          : null}
      </SettingsSection>

      <SettingsSection title={t("settings.timeAndReading")}>
        <SettingsRow
          anchorId={APPEARANCE_SETTINGS_SEARCH.timeFormat.target}
          title={t("settings.timeFormat")}
          description={t("settings.timeFormatDescription")}
          resetAction={
            settings.timestampFormat !== defaults.timestampFormat ? (
              <SettingResetButton
                label={t("settings.timeFormat")}
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
              ariaLabel={t("settings.timestampFormat")}
              triggerClassName="w-full sm:w-40"
              valueContent={timestampFormatLabels[settings.timestampFormat]}
            >
              <SelectItem hideIndicator value="locale">
                {timestampFormatLabels.locale}
              </SelectItem>
              <SelectItem hideIndicator value="12-hour">
                {timestampFormatLabels["12-hour"]}
              </SelectItem>
              <SelectItem hideIndicator value="24-hour">
                {timestampFormatLabels["24-hour"]}
              </SelectItem>
            </SettingsSelectControl>
          }
        />
      </SettingsSection>
    </div>
  );

  const renderBehaviorPanel = () => (
    <div className="space-y-6">
      <SettingsSection title={t("settings.conversation")}>
        <SettingsRow
          anchorId={BEHAVIOR_SETTINGS_SEARCH.followUpBehavior.target}
          title={t("settings.followUpBehavior")}
          description={t("settings.followUpBehaviorDescription")}
          resetAction={
            settings.followUpBehavior !== defaults.followUpBehavior ? (
              <SettingResetButton
                label={t("settings.followUpBehavior")}
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
              ariaLabel={t("settings.followUpBehavior")}
              options={followUpBehaviorOptions}
            />
          }
        />

        <SettingsRow
          anchorId={BEHAVIOR_SETTINGS_SEARCH.assistantOutput.target}
          title={t("settings.assistantOutput")}
          description={t("settings.assistantOutputDescription")}
          status={serverSettingsStatus}
          resetAction={
            activeServerSettings.enableAssistantStreaming !==
            serverDefaults.enableAssistantStreaming ? (
              <SettingResetButton
                label={t("settings.assistantOutput")}
                onClick={() =>
                  void updateServerSettings({
                    enableAssistantStreaming: serverDefaults.enableAssistantStreaming,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              disabled={!serverSettings}
              checked={activeServerSettings.enableAssistantStreaming}
              onCheckedChange={(checked) => {
                void updateServerSettings({ enableAssistantStreaming: Boolean(checked) });
              }}
              aria-label={t("settings.streamAssistant")}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title={t("settings.reviewSection")}>
        {renderBooleanSettingRow({
          settingKey: "showPullRequestDiffColors",
          title: t("settings.pullRequestDiffColors"),
          description: t("settings.pullRequestDiffColorsDescription"),
          resetLabel: t("settings.pullRequestDiffColors"),
          ariaLabel: t("settings.showPullRequestDiffColors"),
        })}

        {renderBooleanSettingRow({
          settingKey: "diffWordWrap",
          anchorId: BEHAVIOR_SETTINGS_SEARCH.diffLineWrapping.target,
          title: t("settings.diffLineWrapping"),
          description: t("settings.diffLineWrappingDescription"),
          resetLabel: t("settings.diffLineWrapping"),
          ariaLabel: t("settings.wrapDiffLines"),
        })}
      </SettingsSection>

      <SettingsSection title={t("settings.safetyConfirmations")}>
        {renderBooleanSettingRow({
          settingKey: "confirmThreadDelete",
          anchorId: BEHAVIOR_SETTINGS_SEARCH.deleteConfirmation.target,
          title: t("settings.deleteConfirmation"),
          description: t("settings.deleteConfirmationDescription"),
          resetLabel: t("settings.deleteConfirmation"),
          ariaLabel: t("settings.confirmThreadDeletion"),
        })}

        {renderBooleanSettingRow({
          settingKey: "confirmThreadArchive",
          anchorId: BEHAVIOR_SETTINGS_SEARCH.archiveConfirmation.target,
          title: t("settings.archiveConfirmation"),
          description: t("settings.archiveConfirmationDescription"),
          resetLabel: t("settings.archiveConfirmation"),
          ariaLabel: t("settings.confirmThreadArchive"),
        })}

        {renderBooleanSettingRow({
          settingKey: "confirmTerminalTabClose",
          anchorId: BEHAVIOR_SETTINGS_SEARCH.terminalCloseConfirmation.target,
          title: t("settings.terminalCloseConfirmation"),
          description: t("settings.terminalCloseConfirmationDescription"),
          resetLabel: t("settings.terminalCloseConfirmation"),
          ariaLabel: t("settings.confirmTerminalClose"),
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
        return <EngineUsageSettingsPanel />;
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
                      {activeSectionDescriptor
                        ? t(activeSectionDescriptor.labelKey)
                        : activeSection}
                    </h1>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {activeSectionDescriptor ? t(activeSectionDescriptor.descriptionKey) : null}
                    </p>
                  </div>
                  {activeSection !== "prompts" && activeSection !== "web-search" ? (
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
                  ) : null}
                </div>
              ) : null}

              {renderRouteOwnedPanel()}
              {/* These workflow owners stay mounted so drafts, request guards, and pending
                  mutations retain route lifetime while inactive panels render no DOM. */}
              <div className="contents">
                <NotificationsSettingsPanel active={activeSection === "notifications"} />
                <AppSnapSettingsPanel active={activeSection === "appsnap"} />
                <WorktreesSettingsPanel active={activeSection === "worktrees"} />
                <ArchivedSettingsPanel active={activeSection === "archived"} />
                <ModelsSettingsPanel active={activeSection === "models"} resetEpoch={resetEpoch} />
                <WebSearchSettingsPanel
                  active={activeSection === "web-search"}
                  activeTarget={settingsTarget}
                  onTargetInvalidated={() => {
                    if (!settingsTarget) return;
                    void navigate({
                      to: "/settings",
                      replace: true,
                      search: (previous) => ({ ...previous, target: undefined }),
                    });
                  }}
                />
                <EnginesSettingsPanel
                  active={activeSection === "engines"}
                  resetEpoch={resetEpoch}
                />
                <BuiltInToolsSettingsPanel active={activeSection === "built-in-tools"} />
                <PromptsSettingsPanel active={activeSection === "prompts"} />
                <ExternalConnectionsSettingsPanel active={activeSection === "integrations"} />
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
