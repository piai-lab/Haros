// FILE: _chat.settings.tsx
// Purpose: Render the dedicated settings experience with its own section sidebar and grouped panels.
// Layer: Route screen
// Exports: Settings route component for `/settings`

import {
  DEFAULT_GIT_TEXT_GENERATION_MODEL,
  PROVIDER_DISPLAY_NAMES,
  ThreadId,
  type ModelSelection,
  type ProviderKind,
} from "@omnimind/contracts";
import { PROVIDER_DESCRIPTORS } from "@omnimind/shared/providerMetadata";
import { sameAppSnapShortcut } from "@omnimind/shared/appSnapShortcut";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { goBackInAppHistory } from "~/appNavigation";
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
  getGitTextGenerationModelOptions,
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
import { useProviderModelCatalog } from "../hooks/useProviderModelCatalog";
import { useTheme } from "../hooks/useTheme";
import { isUiDensity } from "../lib/appDensity";
import { isElectron } from "../env";
import { useI18n, type MessageKey } from "../i18n";
import { RotateCcwIcon } from "../lib/icons";
import { cn, isMacPlatform } from "../lib/utils";
import { ensureNativeApi, readNativeApi } from "../nativeApi";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";
import { sameProviderOrder } from "../providerOrdering";
import {
  normalizeSettingsSection,
  SETTINGS_NAV_ITEMS,
  SETTINGS_TARGETS,
  settingRowAnchorId,
} from "../settingsNavigation";
import { SETTINGS_PAGE_BACKGROUND_CLASS_NAME } from "../settingsPanelStyles";
import { useComposerDraftStore } from "../composerDraftStore";
import { useStore } from "../store";
import { getThreadFromState } from "../threadDerivation";

// ── Settings taxonomy ──────────────────────────────────────────────────────

const PROVIDER_SELECT_OPTIONS = PROVIDER_DESCRIPTORS.map((descriptor) => descriptor.kind);
const GIT_WRITING_DISCOVERY_PROVIDERS = ["codex", "kilo", "opencode"] as const;

const SETTINGS_SECTION_LABEL_KEY = {
  general: "settings.general",
  profile: "settings.profile",
  appearance: "settings.appearance",
  notifications: "settings.notifications",
  behavior: "settings.behavior",
  appsnap: "settings.appsnap",
  shortcuts: "settings.shortcuts",
  worktrees: "settings.worktrees",
  archived: "settings.archived",
  models: "settings.models",
  providers: "settings.providers",
  skills: "settings.skills",
  usage: "settings.usage",
  integrations: "settings.integrations",
  advanced: "settings.advanced",
} as const satisfies Record<(typeof SETTINGS_NAV_ITEMS)[number]["id"], MessageKey>;

const SETTINGS_SECTION_DESCRIPTION_KEY = {
  general: "settings.generalDescription",
  profile: "settings.profileDescription",
  appearance: "settings.appearanceDescription",
  notifications: "settings.notificationsDescription",
  behavior: "settings.behaviorDescription",
  appsnap: "settings.appsnapDescription",
  shortcuts: "settings.shortcutsDescription",
  worktrees: "settings.worktreesDescription",
  archived: "settings.archivedDescription",
  models: "settings.modelsDescription",
  providers: "settings.providersDescription",
  skills: "settings.skillsDescription",
  usage: "settings.usagePanelDescription",
  integrations: "settings.integrationsDescription",
  advanced: "settings.advancedDescription",
} as const satisfies Record<(typeof SETTINGS_NAV_ITEMS)[number]["id"], MessageKey>;

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
  const modelServiceSetupFlow = routeSearch.setup === "model-service";
  const setupThreadId =
    modelServiceSetupFlow &&
    typeof routeSearch.setupThreadId === "string" &&
    routeSearch.setupThreadId.trim() === routeSearch.setupThreadId &&
    routeSearch.setupThreadId.length > 0
      ? ThreadId.makeUnsafe(routeSearch.setupThreadId)
      : null;
  const setupDraftProvider =
    modelServiceSetupFlow && typeof routeSearch.setupDraftProvider === "string"
      ? routeSearch.setupDraftProvider
      : null;
  const setupDraftModel =
    modelServiceSetupFlow && typeof routeSearch.setupDraftModel === "string"
      ? routeSearch.setupDraftModel
      : null;
  const setupSelectionSupersededRef = useRef(false);
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
  const setupSelectionStillCurrent = useCallback(() => {
    if (setupThreadId === null || setupDraftProvider === null || setupDraftModel === null) {
      return false;
    }
    const composerState = useComposerDraftStore.getState();
    const draft = composerState.draftsByThreadId[setupThreadId];
    const threadStillExists =
      composerState.draftThreadsByThreadId[setupThreadId] !== undefined ||
      getThreadFromState(useStore.getState(), setupThreadId) !== undefined;
    if (!threadStillExists) return false;
    const activeProvider = draft?.activeProvider ?? "";
    const model = draft?.activeProvider
      ? (draft.modelSelectionByProvider[draft.activeProvider]?.model ?? "")
      : "";
    return activeProvider === setupDraftProvider && model === setupDraftModel;
  }, [setupDraftModel, setupDraftProvider, setupThreadId]);
  useEffect(() => {
    setupSelectionSupersededRef.current = !setupSelectionStillCurrent();
    return useComposerDraftStore.subscribe(() => {
      if (!setupSelectionStillCurrent()) setupSelectionSupersededRef.current = true;
    });
  }, [setupSelectionStillCurrent]);
  const completeModelServiceSetup = useCallback(
    (selection: ModelSelection) => {
      if (
        setupThreadId !== null &&
        !setupSelectionSupersededRef.current &&
        setupSelectionStillCurrent()
      ) {
        // Setup only repairs the Chat that launched it. A user may have selected a
        // different Engine in another Chat while authentication was pending; do
        // not let this late completion overwrite that newer global sticky intent.
        useComposerDraftStore.getState().setModelSelection(setupThreadId, selection);
      }
      goBackInAppHistory();
    },
    [setupSelectionStillCurrent, setupThreadId],
  );
  const currentGitTextGenerationProvider = settings.textGenerationProvider ?? "codex";
  const currentGitTextGenerationModel =
    settings.textGenerationModel ?? DEFAULT_GIT_TEXT_GENERATION_MODEL;
  const serverConfigQuery = useQuery({
    ...serverConfigQueryOptions(),
    enabled: activeSection === "general",
  });
  const gitWritingModelHintByProvider = useMemo<Partial<Record<ProviderKind, string | null>>>(
    () => ({ [currentGitTextGenerationProvider]: currentGitTextGenerationModel }),
    [currentGitTextGenerationModel, currentGitTextGenerationProvider],
  );
  const { modelOptionsByProvider: gitWritingCatalogOptionsByProvider } = useProviderModelCatalog({
    selectedProvider: currentGitTextGenerationProvider,
    discoveryEnabled: activeSection === "general",
    selectedProviderDiscoveryEnabled: activeSection === "general",
    cwd: serverConfigQuery.data?.cwd ?? null,
    modelHintByProvider: gitWritingModelHintByProvider,
    prefetchProviders: GIT_WRITING_DISCOVERY_PROVIDERS,
  });
  const gitTextGenerationModelOptions = useMemo(
    () =>
      getGitTextGenerationModelOptions(settings, {
        codex: gitWritingCatalogOptionsByProvider.codex,
        kilo: gitWritingCatalogOptionsByProvider.kilo,
        opencode: gitWritingCatalogOptionsByProvider.opencode,
      }),
    [
      gitWritingCatalogOptionsByProvider.codex,
      gitWritingCatalogOptionsByProvider.kilo,
      gitWritingCatalogOptionsByProvider.opencode,
      settings,
    ],
  );
  const currentGitTextGenerationValue = `${currentGitTextGenerationProvider}:${currentGitTextGenerationModel}`;
  const selectedGitTextGenerationModelLabel =
    gitTextGenerationModelOptions.find(
      (option) =>
        option.provider === currentGitTextGenerationProvider &&
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
  const followUpBehaviorOptions = useMemo(
    () =>
      [
        { value: "queue", label: t("settings.queue") },
        { value: "steer", label: t("settings.steer") },
      ] as const satisfies ReadonlyArray<{ value: FollowUpBehavior; label: string }>,
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
    ...(theme !== "system" ? [t("settings.theme")] : []),
    ...(!isDefaultActiveTheme ? [t("settings.theme")] : []),
    ...(settings.defaultProvider !== defaults.defaultProvider
      ? [t("settings.defaultProvider")]
      : []),
    ...(settings.defaultThreadEnvMode !== defaults.defaultThreadEnvMode
      ? [t("settings.defaultThreadMode")]
      : []),
    ...(settings.sidebarProjectSortOrder !== defaults.sidebarProjectSortOrder
      ? [t("settings.projectOrder")]
      : []),
    ...(settings.sidebarThreadSortOrder !== defaults.sidebarThreadSortOrder
      ? [t("settings.threadOrder")]
      : []),
    ...(settings.showStudioSection !== defaults.showStudioSection ? [t("nav.chat")] : []),
    ...(settings.uiDensity !== defaults.uiDensity ? [t("settings.uiDensity")] : []),
    ...(settings.desktopAppIcon !== defaults.desktopAppIcon ? [t("settings.appIcon")] : []),
    ...(settings.chatFontSizePx !== defaults.chatFontSizePx ? [t("settings.baseFontSize")] : []),
    ...(settings.terminalFontSizePx !== defaults.terminalFontSizePx
      ? [t("settings.terminalFontSize")]
      : []),
    ...(settings.terminalFontFamily !== defaults.terminalFontFamily
      ? [t("settings.terminalFont")]
      : []),
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
    ...(settings.enableAssistantStreaming !== defaults.enableAssistantStreaming
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
    ...(settings.enableProviderUpdateChecks !== defaults.enableProviderUpdateChecks
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
    ...(settings.customCodexModels.length > 0 ||
    settings.customClaudeModels.length > 0 ||
    settings.customCursorModels.length > 0 ||
    settings.customAntigravityModels.length > 0 ||
    settings.customGrokModels.length > 0 ||
    settings.customDroidModels.length > 0 ||
    settings.customKiloModels.length > 0 ||
    settings.customOpenCodeModels.length > 0 ||
    settings.customPiModels.length > 0
      ? [t("settings.customModels")]
      : []),
    ...(isInstallSettingsDirty ? [t("settings.providerTools")] : []),
    ...(hiddenProviderCount > 0 ? [t("settings.visibleProviders")] : []),
    ...(isProviderOrderDirty ? [t("settings.providerPicker")] : []),
  ];

  async function restoreDefaults() {
    if (changedSettingLabels.length === 0) return;

    const api = readNativeApi();
    const confirmed = await (api ?? ensureNativeApi()).dialogs.confirm(
      [
        t("settings.restoreConfirmTitle"),
        t("settings.restoreConfirmDescription", { settings: changedSettingLabels.join(", ") }),
      ].join("\n"),
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
                label={t("settings.defaultProvider")}
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

          <div id={SETTINGS_TARGETS.gitWritingModel}>
            <SettingsRow
              title={t("settings.gitWritingModel")}
              description={t("settings.gitWritingModelDescription")}
              resetAction={
                isGitTextGenerationModelDirty ? (
                  <SettingResetButton
                    label={t("settings.gitWritingModel")}
                    onClick={() =>
                      updateSettings({
                        textGenerationProvider: defaults.textGenerationProvider,
                        textGenerationModel: defaults.textGenerationModel,
                      })
                    }
                  />
                ) : null
              }
              control={
                <SettingsSelectControl
                  value={currentGitTextGenerationValue}
                  onValueChange={(value) => {
                    const separatorIndex = value.indexOf(":");
                    if (separatorIndex <= 0 || separatorIndex === value.length - 1) return;
                    const provider = value.slice(0, separatorIndex) as ProviderKind;
                    const model = value.slice(separatorIndex + 1);
                    if (!PROVIDER_SELECT_OPTIONS.includes(provider)) return;
                    updateSettings({
                      textGenerationProvider: provider,
                      textGenerationModel: model,
                    });
                  }}
                  ariaLabel={t("settings.gitTextGenerationModel")}
                  triggerClassName="w-full sm:w-56"
                  valueContent={selectedGitTextGenerationModelLabel}
                >
                  {gitTextGenerationModelOptions.map((option) => (
                    <SelectItem
                      hideIndicator
                      key={`${option.provider}:${option.slug}`}
                      value={`${option.provider}:${option.slug}`}
                    >
                      {PROVIDER_DISPLAY_NAMES[option.provider]} / {option.name}
                    </SelectItem>
                  ))}
                </SettingsSelectControl>
              }
            />
          </div>

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
        <div id={settingRowAnchorId("Theme")} className="scroll-mt-24 pb-1.5">
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
              settings.desktopAppIcon !== defaults.desktopAppIcon ? (
                <SettingResetButton
                  label={t("settings.appIcon")}
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

      <SettingsSection title={t("settings.typography")}>
        <SettingsRow
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

        {renderBooleanSettingRow({
          settingKey: "enableAssistantStreaming",
          title: t("settings.assistantOutput"),
          description: t("settings.assistantOutputDescription"),
          resetLabel: t("settings.assistantOutput"),
          ariaLabel: t("settings.streamAssistant"),
        })}
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
          title: t("settings.diffLineWrapping"),
          description: t("settings.diffLineWrappingDescription"),
          resetLabel: t("settings.diffLineWrapping"),
          ariaLabel: t("settings.wrapDiffLines"),
        })}
      </SettingsSection>

      <SettingsSection title={t("settings.safetyConfirmations")}>
        {renderBooleanSettingRow({
          settingKey: "confirmThreadDelete",
          title: t("settings.deleteConfirmation"),
          description: t("settings.deleteConfirmationDescription"),
          resetLabel: t("settings.deleteConfirmation"),
          ariaLabel: t("settings.confirmThreadDeletion"),
        })}

        {renderBooleanSettingRow({
          settingKey: "confirmThreadArchive",
          title: t("settings.archiveConfirmation"),
          description: t("settings.archiveConfirmationDescription"),
          resetLabel: t("settings.archiveConfirmation"),
          ariaLabel: t("settings.confirmThreadArchive"),
        })}

        {renderBooleanSettingRow({
          settingKey: "confirmTerminalTabClose",
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
                            : t(SETTINGS_SECTION_LABEL_KEY[activeSection])}
                    </h1>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {activeSection === "general"
                        ? t("settings.generalDescription")
                        : activeSection === "appearance"
                          ? t("settings.appearanceDescription")
                          : activeSection === "behavior"
                            ? t("settings.behaviorDescription")
                            : t(SETTINGS_SECTION_DESCRIPTION_KEY[activeSection])}
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
                  startInAddFlow={modelServiceSetupFlow}
                  {...(modelServiceSetupFlow ? { onSetupReady: completeModelServiceSetup } : {})}
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
