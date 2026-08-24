// FILE: ProvidersSettingsPanel.tsx
// Purpose: Own provider picker, update, and CLI installation settings workflows.
// Layer: Settings panel

import {
  PROVIDER_DISPLAY_NAMES,
  type ProviderKind,
  type ServerProviderStatus,
  type ServerSettingsView,
} from "@omnimind/contracts";
import { PROVIDER_DESCRIPTORS } from "@omnimind/shared/providerMetadata";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type MouseEvent, useCallback, useMemo, useState } from "react";

import {
  CUSTOM_MODEL_EDITOR_PROVIDER_SETTINGS,
  MAX_CUSTOM_MODEL_LENGTH,
  getCustomModelsForProvider,
  getCustomBinaryPathForProvider,
  getDefaultCustomModelsForProvider,
  patchCustomModels,
  type AppSettings,
  type AppSettingsBinding,
} from "~/appSettings";
import {
  deriveProviderPickerAvailability,
  normalizeProviderStatusForLocalConfig,
  type ProviderPickerAvailabilityState,
} from "~/lib/providerAvailability";
import { getModelOptions, normalizeModelSlug } from "@omnimind/shared/model";
import { CentralIcon } from "~/lib/central-icons";
import { DownloadIcon, ExternalLinkIcon, Loader2Icon, PlusIcon, XIcon } from "~/lib/icons";
import {
  reconcileServerProviderStatuses,
  serverConfigQueryOptions,
  serverQueryKeys,
  serverSettingsQueryOptions,
} from "~/lib/serverReactQuery";
import { cn } from "~/lib/utils";
import { ensureNativeApi } from "~/nativeApi";
import { sameProviderOrder } from "~/providerOrdering";
import {
  getVisibleProviderUpdateStatuses,
  isProviderLatestVersionKnowable,
  isProviderUpdateActive,
  shouldOfferProviderUpdateAction,
  shouldPromptProviderUpdate,
  shouldShowProviderUpdateStatus,
  ProviderUpdateTimeoutError,
  createProviderUpdateToastData,
  withProviderUpdateTimeout,
} from "~/providerUpdates";
import { PROVIDERS_SETTINGS_SEARCH } from "~/settingsMetadata/providerSettings";
import {
  SETTINGS_INSET_LIST_CLASS_NAME,
  SETTINGS_INSET_RADIUS_CLASS_NAME,
  SETTINGS_OUTLINED_SURFACE_CLASS_NAME,
  SETTINGS_STACKED_ROWS_DIVIDER_CLASS_NAME,
} from "~/settingsPanelStyles";
import { ELEVATED_HOVER_SURFACE_RAISED_TEXT_CLASS_NAME } from "~/surfaceStyles";
import { useI18n, type MessageKey } from "~/i18n";

import { Button } from "../ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";
import { DisclosureChevron } from "../ui/DisclosureChevron";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { toastManager } from "../ui/toast";
import { ProviderIcon } from "../ProviderIcon";
import { DebouncedSettingTextInput } from "./DebouncedSettingTextInput";
import { SettingResetButton, useSettingsRestoreSignal } from "./SettingControls";
import { SettingsListRow, SettingsRow, SettingsSection } from "./SettingsPanelPrimitives";

type ProviderInstallTextKey =
  | "claudeBinaryPath"
  | "codexBinaryPath"
  | "codexHomePath"
  | "cursorBinaryPath"
  | "cursorApiEndpoint"
  | "antigravityBinaryPath"
  | "grokBinaryPath"
  | "droidBinaryPath"
  | "kiloBinaryPath"
  | "kiloServerUrl"
  | "openCodeBinaryPath"
  | "openCodeServerUrl"
  | "piBinaryPath"
  | "piAgentDir";
type ProviderInstallPasswordKey = "kiloServerPassword" | "openCodeServerPassword";
type ProviderInstallPasswordConfiguredKey =
  | "kiloServerPasswordConfigured"
  | "openCodeServerPasswordConfigured";
type ProviderInstallBooleanKey = "openCodeExperimentalWebSockets";
type SettingsTranslator = ReturnType<typeof useI18n>["t"];

type ProviderInstallTextField = {
  readonly kind: "text";
  readonly settingsKey: ProviderInstallTextKey;
  readonly labelKey: MessageKey;
  readonly labelParams?: Readonly<Record<string, string>>;
  readonly placeholderKey?: MessageKey;
  readonly placeholder?: string;
  readonly descriptionKey: MessageKey;
  readonly descriptionParams?: Readonly<Record<string, string>>;
};
type ProviderInstallPasswordField = {
  readonly kind: "password";
  readonly settingsKey: ProviderInstallPasswordKey;
  readonly configuredKey: ProviderInstallPasswordConfiguredKey;
  readonly labelKey: MessageKey;
  readonly labelParams?: Readonly<Record<string, string>>;
  readonly placeholderKey?: MessageKey;
  readonly placeholder?: string;
  readonly descriptionKey: MessageKey;
  readonly descriptionParams?: Readonly<Record<string, string>>;
};
type ProviderInstallBooleanField = {
  readonly kind: "boolean";
  readonly settingsKey: ProviderInstallBooleanKey;
  readonly labelKey: MessageKey;
  readonly descriptionKey: MessageKey;
};
type ProviderInstallField =
  | ProviderInstallTextField
  | ProviderInstallPasswordField
  | ProviderInstallBooleanField;
type ProviderInstallSettings = {
  readonly provider: ProviderKind;
  readonly docs: ReadonlyArray<{ readonly labelKey: MessageKey; readonly href: string }>;
  readonly fields: readonly ProviderInstallField[];
};

type CustomModelValidationResult =
  | { readonly model: string; readonly error?: never }
  | { readonly model?: never; readonly error: string };

export function validateProviderCustomModelInput(input: {
  readonly provider: ProviderKind;
  readonly value: string;
  readonly savedModels: readonly string[];
}): CustomModelValidationResult {
  const normalized = normalizeModelSlug(input.value, input.provider);
  if (!normalized) return { error: "Enter a model slug." };
  if (getModelOptions(input.provider).some((option) => option.slug === normalized)) {
    return { error: "That model is already built in." };
  }
  if (normalized.length > MAX_CUSTOM_MODEL_LENGTH) {
    return { error: `Model slugs must be ${MAX_CUSTOM_MODEL_LENGTH} characters or less.` };
  }
  if (input.savedModels.includes(normalized)) {
    return { error: "That custom model is already saved." };
  }
  return { model: normalized };
}

const PROVIDER_VISIBILITY_OPTIONS: ReadonlyArray<{ provider: ProviderKind; title: string }> =
  PROVIDER_DESCRIPTORS.map((descriptor) => ({
    provider: descriptor.kind,
    title: descriptor.displayName,
  }));

const PROVIDER_INSTALL_SETTINGS: readonly ProviderInstallSettings[] = [
  {
    provider: "codex",
    docs: [
      { labelKey: "settings.install", href: "https://help.openai.com/en/articles/11096431" },
      { labelKey: "settings.update", href: "https://help.openai.com/en/articles/11096431" },
      {
        labelKey: "settings.config",
        href: "https://github.com/openai/codex/blob/main/docs/config.md",
      },
    ],
    fields: [
      {
        kind: "text",
        settingsKey: "codexBinaryPath",
        labelKey: "settings.binaryPath",
        labelParams: { provider: "Codex" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "codex" },
      },
      {
        kind: "text",
        settingsKey: "codexHomePath",
        labelKey: "settings.codexHomePath",
        placeholder: "CODEX_HOME",
        descriptionKey: "settings.codexHomeDescription",
      },
    ],
  },
  {
    provider: "claudeAgent",
    docs: [
      { labelKey: "settings.install", href: "https://code.claude.com/docs/en/installation" },
      {
        labelKey: "settings.update",
        href: "https://code.claude.com/docs/en/installation#update-claude-code",
      },
      { labelKey: "settings.config", href: "https://code.claude.com/docs/en/settings" },
    ],
    fields: [
      {
        kind: "text",
        settingsKey: "claudeBinaryPath",
        labelKey: "settings.binaryPath",
        labelParams: { provider: "Claude" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "claude" },
      },
    ],
  },
  {
    provider: "cursor",
    docs: [
      { labelKey: "settings.install", href: "https://docs.cursor.com/en/cli/installation" },
      { labelKey: "settings.update", href: "https://docs.cursor.com/en/cli/installation#updates" },
      { labelKey: "settings.config", href: "https://docs.cursor.com/en/cli/overview" },
    ],
    fields: [
      {
        kind: "text",
        settingsKey: "cursorBinaryPath",
        labelKey: "settings.binaryPath",
        labelParams: { provider: "Cursor" },
        placeholderKey: "settings.cursorBinaryPlaceholder",
        descriptionKey: "settings.cursorBinaryDescription",
      },
      {
        kind: "text",
        settingsKey: "cursorApiEndpoint",
        labelKey: "settings.cursorApiEndpoint",
        placeholder: "https://api2.cursor.sh",
        descriptionKey: "settings.cursorApiEndpointDescription",
      },
    ],
  },
  {
    provider: "antigravity",
    docs: [
      { labelKey: "settings.install", href: "https://antigravity.google/docs/cli-using" },
      { labelKey: "settings.reference", href: "https://antigravity.google/docs/cli-reference" },
      { labelKey: "settings.hooks", href: "https://antigravity.google/docs/hooks" },
    ],
    fields: [
      {
        kind: "text",
        settingsKey: "antigravityBinaryPath",
        labelKey: "settings.binaryPath",
        labelParams: { provider: "Antigravity" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "agy" },
      },
    ],
  },
  {
    provider: "grok",
    docs: [
      { labelKey: "settings.install", href: "https://docs.x.ai/build/overview" },
      { labelKey: "settings.headless", href: "https://docs.x.ai/build/cli/headless-scripting" },
      { labelKey: "settings.config", href: "https://docs.x.ai/build/overview" },
    ],
    fields: [
      {
        kind: "text",
        settingsKey: "grokBinaryPath",
        labelKey: "settings.binaryPath",
        labelParams: { provider: "Grok" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "grok" },
      },
    ],
  },
  {
    provider: "droid",
    docs: [
      {
        labelKey: "settings.quickstart",
        href: "https://docs.factory.ai/cli/getting-started/quickstart.md",
      },
    ],
    fields: [
      {
        kind: "text",
        settingsKey: "droidBinaryPath",
        labelKey: "settings.binaryPath",
        labelParams: { provider: "Droid" },
        placeholder: "droid",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "droid" },
      },
    ],
  },
  {
    provider: "kilo",
    docs: [
      { labelKey: "settings.install", href: "https://kilo.ai/docs/cli" },
      { labelKey: "settings.update", href: "https://kilo.ai/docs/cli" },
      { labelKey: "settings.config", href: "https://kilo.ai/docs/cli#configuration" },
    ],
    fields: [
      {
        kind: "text",
        settingsKey: "kiloBinaryPath",
        labelKey: "settings.binaryPath",
        labelParams: { provider: "Kilo" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "kilo" },
      },
      {
        kind: "text",
        settingsKey: "kiloServerUrl",
        labelKey: "settings.serverUrl",
        labelParams: { provider: "Kilo" },
        placeholder: "http://127.0.0.1:4096",
        descriptionKey: "settings.serverUrlDescription",
        descriptionParams: { provider: "Kilo" },
      },
      {
        kind: "password",
        settingsKey: "kiloServerPassword",
        configuredKey: "kiloServerPasswordConfigured",
        labelKey: "settings.serverPassword",
        labelParams: { provider: "Kilo" },
        placeholderKey: "settings.serverPassword",
        descriptionKey: "settings.serverPasswordDescription",
        descriptionParams: { provider: "Kilo" },
      },
    ],
  },
  {
    provider: "opencode",
    docs: [
      { labelKey: "settings.install", href: "https://opencode.ai/docs/" },
      { labelKey: "settings.update", href: "https://opencode.ai/docs/cli/" },
      { labelKey: "settings.config", href: "https://opencode.ai/docs/config/" },
    ],
    fields: [
      {
        kind: "text",
        settingsKey: "openCodeBinaryPath",
        labelKey: "settings.binaryPath",
        labelParams: { provider: "OpenCode" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "opencode" },
      },
      {
        kind: "text",
        settingsKey: "openCodeServerUrl",
        labelKey: "settings.serverUrl",
        labelParams: { provider: "OpenCode" },
        placeholder: "http://127.0.0.1:4096",
        descriptionKey: "settings.serverUrlDescription",
        descriptionParams: { provider: "OpenCode" },
      },
      {
        kind: "password",
        settingsKey: "openCodeServerPassword",
        configuredKey: "openCodeServerPasswordConfigured",
        labelKey: "settings.serverPassword",
        labelParams: { provider: "OpenCode" },
        placeholderKey: "settings.serverPassword",
        descriptionKey: "settings.serverPasswordDescription",
        descriptionParams: { provider: "OpenCode" },
      },
      {
        kind: "boolean",
        settingsKey: "openCodeExperimentalWebSockets",
        labelKey: "settings.openCodeWebSockets",
        descriptionKey: "settings.openCodeWebSocketsDescription",
      },
    ],
  },
  {
    provider: "pi",
    docs: [
      { labelKey: "settings.install", href: "https://pi.dev/docs/latest" },
      { labelKey: "settings.update", href: "https://pi.dev/docs/latest/settings" },
      { labelKey: "settings.config", href: "https://pi.dev/docs/latest/settings" },
    ],
    fields: [
      {
        kind: "text",
        settingsKey: "piBinaryPath",
        labelKey: "settings.binaryPath",
        labelParams: { provider: "Pi" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "pi" },
      },
      {
        kind: "text",
        settingsKey: "piAgentDir",
        labelKey: "settings.piAgentDirectory",
        placeholderKey: "settings.piAgentDirectory",
        descriptionKey: "settings.piAgentDirectoryDescription",
      },
    ],
  },
];

function isProviderInstallFieldDirty(
  field: ProviderInstallField,
  settings: AppSettings,
  defaults: AppSettings,
): boolean {
  return field.kind === "password"
    ? settings[field.configuredKey] !== defaults[field.configuredKey]
    : settings[field.settingsKey] !== defaults[field.settingsKey];
}

function isProviderInstallConfigDirty(
  config: ProviderInstallSettings,
  settings: AppSettings,
  defaults: AppSettings,
): boolean {
  return config.fields.some((field) => isProviderInstallFieldDirty(field, settings, defaults));
}

export function isProviderInstallSettingsDirty(
  settings: AppSettings,
  defaults: AppSettings,
): boolean {
  return PROVIDER_INSTALL_SETTINGS.some((config) =>
    isProviderInstallConfigDirty(config, settings, defaults),
  );
}

function createProviderInstallDisclosureState(
  settings: AppSettings,
): Record<ProviderKind, boolean> {
  return Object.fromEntries(
    PROVIDER_INSTALL_SETTINGS.map((config) => {
      const customModelsConfig = CUSTOM_MODEL_EDITOR_PROVIDER_SETTINGS.find(
        (candidate) => candidate.provider === config.provider,
      );
      return [
        config.provider,
        config.fields.some((field) =>
          field.kind === "password"
            ? settings[field.configuredKey]
            : Boolean(settings[field.settingsKey]),
        ) ||
          (customModelsConfig !== undefined &&
            getCustomModelsForProvider(settings, customModelsConfig.provider).length > 0),
      ];
    }),
  ) as Record<ProviderKind, boolean>;
}

function createClosedProviderInstallDisclosureState(): Record<ProviderKind, boolean> {
  return Object.fromEntries(
    PROVIDER_INSTALL_SETTINGS.map((config) => [config.provider, false]),
  ) as Record<ProviderKind, boolean>;
}

export function createProviderInstallResetPatch(defaults: AppSettings): Partial<AppSettings> {
  return Object.fromEntries(
    PROVIDER_INSTALL_SETTINGS.flatMap((config) =>
      config.fields.map((field) => [field.settingsKey, defaults[field.settingsKey]]),
    ),
  ) as Partial<AppSettings>;
}

function setProviderHidden(
  current: ReadonlyArray<ProviderKind>,
  provider: ProviderKind,
  hidden: boolean,
): ProviderKind[] {
  const withoutTarget = current.filter((entry) => entry !== provider);
  return hidden ? [...withoutTarget, provider] : withoutTarget;
}

function providerVisibilityStatusLabel(
  state: ProviderPickerAvailabilityState,
  t: SettingsTranslator,
): string {
  switch (state) {
    case "checking":
      return t("composer.engineChecking");
    case "ready":
      return t("settings.engineAvailable");
    case "sign_in":
      return t("composer.engineSignIn");
    case "limited":
      return t("composer.engineLimited");
    case "not_installed":
      return t("composer.engineNotInstalled");
    case "unavailable":
      return t("composer.engineUnavailable");
  }
}

function SortableProviderVisibilityRow(props: {
  option: { provider: ProviderKind; title: string };
  providerStatus: ServerProviderStatus | undefined;
  statusPending: boolean;
  isHidden: boolean;
  onHiddenChange: (hidden: boolean) => void;
}) {
  const { t } = useI18n();
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.option.provider });
  const availability = props.statusPending
    ? ({ disabled: false, state: "checking" } as const)
    : props.providerStatus
      ? deriveProviderPickerAvailability(props.providerStatus)
      : ({ disabled: false, state: "unavailable" } as const);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        SETTINGS_OUTLINED_SURFACE_CLASS_NAME,
        "flex items-center justify-between gap-3 px-3 py-2.5",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={cn(
            "inline-flex size-6 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing",
            ELEVATED_HOVER_SURFACE_RAISED_TEXT_CLASS_NAME,
            SETTINGS_INSET_RADIUS_CLASS_NAME,
          )}
          aria-label={t("settings.reorderProvider", { provider: props.option.title })}
          {...attributes}
          {...listeners}
        >
          <CentralIcon name="dot-grid-2x3" className="size-4" />
        </button>
        <ProviderIcon provider={props.option.provider} className="size-4 shrink-0" />
        <span className="min-w-0">
          <span className="block truncate text-sm text-foreground">{props.option.title}</span>
          <span className="block text-[11px] text-muted-foreground">
            {providerVisibilityStatusLabel(availability.state, t)}
          </span>
        </span>
      </div>
      <Switch
        checked={!props.isHidden}
        onCheckedChange={(checked) => props.onHiddenChange(!checked)}
        aria-label={t("settings.showProvider", { provider: props.option.title })}
      />
    </div>
  );
}

function ProviderDocsLinks({ docs }: { docs: ProviderInstallSettings["docs"] }) {
  const { t } = useI18n();
  return (
    <div className={cn(SETTINGS_OUTLINED_SURFACE_CLASS_NAME, "px-3 py-2.5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-medium text-foreground">{t("settings.cliDocs")}</span>
        <div className="flex flex-wrap gap-2">
          {docs.map((doc) => (
            <Button
              key={`${doc.labelKey}:${doc.href}`}
              variant="outline"
              size="sm"
              render={<a href={doc.href} target="_blank" rel="noreferrer" />}
            >
              <span>{t(doc.labelKey)}</span>
              <ExternalLinkIcon className="size-3" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatProviderVersion(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

function providerUpdateStatusLabel(
  provider: ServerProviderStatus,
  t: SettingsTranslator,
): string | null {
  const state = provider.updateState?.status;
  if (state === "queued") return t("settings.updateQueued");
  if (state === "running") return t("settings.updatingProvider");
  if (state === "succeeded") return t("settings.updatedProvider");
  if (state === "failed") return t("settings.updateFailed");
  if (state === "unchanged") return t("settings.stillOutdated");
  const advisory = provider.versionAdvisory;
  if (advisory?.status === "behind_latest" && advisory.latestVersion) {
    const currentVersion = formatProviderVersion(advisory.currentVersion);
    const latestVersion = formatProviderVersion(advisory.latestVersion);
    return currentVersion
      ? `${currentVersion} → ${latestVersion}`
      : t("settings.latestVersion", { version: latestVersion ?? "" });
  }
  const currentVersion = formatProviderVersion(provider.version);
  return currentVersion ? t("settings.currentVersion", { version: currentVersion }) : null;
}

export function providerUpdateFailureMessage(
  provider: ServerProviderStatus | undefined,
  fallback: string,
): string | null {
  const state = provider?.updateState;
  if (provider?.versionAdvisory?.status === "behind_latest") {
    return state?.message?.trim() || fallback;
  }
  if (!state || (state.status !== "failed" && state.status !== "unchanged")) return null;
  // Full CLI output remains available in provider diagnostics. A transient toast should stay
  // readable and must not turn ANSI progress streams into a screen-sized error notification.
  return state.message?.trim() || fallback;
}

function ProviderUpdateAction(props: {
  providerStatus: ServerProviderStatus;
  active: boolean;
  disabled: boolean;
  onUpdate: (provider: ProviderKind) => void;
}) {
  const { t } = useI18n();
  const advisory = props.providerStatus.versionAdvisory;
  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
      disabled={props.disabled}
      title={
        advisory?.updateCommand
          ? t("settings.runUpdateCommand", { command: advisory.updateCommand })
          : undefined
      }
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        props.onUpdate(props.providerStatus.provider);
      }}
    >
      {props.active ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <DownloadIcon className="size-3.5" />
      )}
      {props.active ? t("settings.updatingProvider") : t("settings.update")}
    </Button>
  );
}

function ProviderInstallFieldControl(props: {
  field: ProviderInstallField;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
}) {
  const { t } = useI18n();
  const id = `provider-install-${props.field.settingsKey}`;
  const label = t(
    props.field.labelKey,
    "labelParams" in props.field ? props.field.labelParams : undefined,
  );
  const description = t(
    props.field.descriptionKey,
    "descriptionParams" in props.field ? props.field.descriptionParams : undefined,
  );
  if (props.field.kind === "boolean") {
    return (
      <label
        htmlFor={id}
        className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-background/60 px-3 py-2"
      >
        <span className="min-w-0">
          <span className="block text-xs font-medium text-foreground">{label}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
        </span>
        <Switch
          id={id}
          checked={props.settings[props.field.settingsKey]}
          onCheckedChange={(checked) =>
            props.updateSettings({ [props.field.settingsKey]: Boolean(checked) })
          }
        />
      </label>
    );
  }

  const configured =
    props.field.kind === "password" ? props.settings[props.field.configuredKey] : false;
  const isPassword = props.field.kind === "password";
  return (
    <label htmlFor={id} className="block">
      <span className="block text-xs font-medium text-foreground">{label}</span>
      <DebouncedSettingTextInput
        id={id}
        size="sm"
        variant="soft"
        className="mt-1"
        value={isPassword ? "" : props.settings[props.field.settingsKey]}
        onCommit={(nextValue) =>
          props.updateSettings({ [props.field.settingsKey]: nextValue } as Partial<AppSettings>)
        }
        placeholder={
          isPassword && configured
            ? t("settings.configuredPassword")
            : props.field.placeholderKey
              ? t(props.field.placeholderKey, props.field.labelParams)
              : props.field.placeholder
        }
        type={isPassword ? "password" : undefined}
        autoComplete={isPassword ? "new-password" : undefined}
        spellCheck={false}
      />
      <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
    </label>
  );
}

function ProviderCustomModelsEditor(props: {
  provider: ProviderKind;
  settings: AppSettings;
  defaults: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
}) {
  const { t } = useI18n();
  const config = CUSTOM_MODEL_EDITOR_PROVIDER_SETTINGS.find(
    (candidate) => candidate.provider === props.provider,
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!config) return null;

  const provider = config.provider;
  const savedModels = getCustomModelsForProvider(props.settings, provider);
  const defaultModels = getDefaultCustomModelsForProvider(props.defaults, provider);
  const isDirty = JSON.stringify(savedModels) !== JSON.stringify(defaultModels);
  const addModel = () => {
    const result = validateProviderCustomModelInput({
      provider,
      value: input,
      savedModels,
    });
    if ("error" in result) {
      setError(
        result.error === "Enter a model slug."
          ? t("settings.enterModelSlug")
          : result.error === "That model is already built in."
            ? t("settings.modelAlreadyBuiltIn")
            : result.error === "That custom model is already saved."
              ? t("settings.customModelAlreadySaved")
              : t("settings.modelSlugTooLong", { max: MAX_CUSTOM_MODEL_LENGTH }),
      );
      return;
    }
    props.updateSettings(patchCustomModels(provider, [...savedModels, result.model]));
    setInput("");
    setError(null);
  };

  return (
    <div className="border-t border-border/70 pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-foreground">{t("settings.customModels")}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t("settings.independentEngineModelsDescription")}
          </div>
        </div>
        {isDirty ? (
          <SettingResetButton
            label={t("settings.customModels")}
            onClick={() => props.updateSettings(patchCustomModels(provider, [...defaultModels]))}
          />
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Input
          size="sm"
          variant="soft"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addModel();
          }}
          placeholder={config.example}
          aria-label={t("settings.engineModelSlug")}
          spellCheck={false}
        />
        <Button size="sm" variant="outline" onClick={addModel}>
          <PlusIcon className="size-3.5" />
          {t("settings.add")}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      {savedModels.length > 0 ? (
        <div className="mt-2 space-y-1">
          {savedModels.map((model) => (
            <div
              key={model}
              className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-2"
            >
              <code className="min-w-0 truncate text-xs text-foreground">{model}</code>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={t("settings.removeModel", { model })}
                onClick={() =>
                  props.updateSettings(
                    patchCustomModels(
                      provider,
                      savedModels.filter((candidate) => candidate !== model),
                    ),
                  )
                }
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProviderToolRow(props: {
  config: ProviderInstallSettings;
  open: boolean;
  settings: AppSettings;
  defaults: AppSettings;
  hiddenProviderSet: ReadonlySet<ProviderKind>;
  serverSettings: Pick<ServerSettingsView, "providers" | "enableProviderUpdateChecks"> | null;
  providerStatus: ServerProviderStatus | undefined;
  updatingProviders: ReadonlySet<ProviderKind>;
  onOpenChange: (open: boolean) => void;
  onUpdate: (provider: ProviderKind) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
}) {
  const { t } = useI18n();
  const title = PROVIDER_DISPLAY_NAMES[props.config.provider];
  const isDirty = isProviderInstallConfigDirty(props.config, props.settings, props.defaults);
  const showProviderUpdateStatus = props.providerStatus
    ? shouldShowProviderUpdateStatus({
        provider: props.providerStatus,
        hiddenProviderSet: props.hiddenProviderSet,
        serverSettings: props.serverSettings,
      })
    : false;
  const updateAdvisory = props.providerStatus?.versionAdvisory;
  const providerUpdateSuppressed =
    updateAdvisory?.status === "behind_latest" && !showProviderUpdateStatus;
  const currentProviderVersion = formatProviderVersion(props.providerStatus?.version);
  const providerUpdateLabel = props.providerStatus
    ? !props.settings.enableProviderUpdateChecks
      ? currentProviderVersion
        ? t("settings.currentVersion", { version: currentProviderVersion })
        : null
      : providerUpdateSuppressed
        ? null
        : providerUpdateStatusLabel(props.providerStatus, t)
    : null;
  const updateActive = Boolean(
    (props.providerStatus && isProviderUpdateActive(props.providerStatus)) ||
    props.updatingProviders.has(props.config.provider),
  );
  const showUpdateButton = props.providerStatus
    ? shouldPromptProviderUpdate(props.providerStatus) &&
      (showProviderUpdateStatus || updateAdvisory?.status === "unknown")
    : false;
  // Self-updating CLIs never report a latest version, so the update stays available
  // inside the panel rather than as a header badge that can never be satisfied.
  const showSelfManagedUpdate = props.providerStatus
    ? shouldOfferProviderUpdateAction(props.providerStatus) &&
      !isProviderLatestVersionKnowable(props.providerStatus)
    : false;

  return (
    <Collapsible open={props.open} onOpenChange={props.onOpenChange}>
      <div className="border-t border-border/70 first:border-t-0">
        <div className="flex min-h-11 items-center gap-2 px-3 py-2">
          <CollapsibleTrigger
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{title}</span>
            {isDirty ? (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {t("settings.custom")}
              </span>
            ) : null}
            {providerUpdateLabel ? (
              <span
                className={cn(
                  "shrink-0 text-[11px]",
                  updateAdvisory?.status === "behind_latest"
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {providerUpdateLabel}
              </span>
            ) : null}
            <DisclosureChevron
              open={props.open}
              className="size-4 shrink-0 text-muted-foreground"
            />
          </CollapsibleTrigger>
          {showUpdateButton && props.providerStatus ? (
            <ProviderUpdateAction
              providerStatus={props.providerStatus}
              active={updateActive}
              disabled={updateActive}
              onUpdate={props.onUpdate}
            />
          ) : null}
        </div>

        <CollapsiblePanel>
          <div className="border-t border-border/70 bg-muted/20 px-3 py-3">
            <div className="space-y-3">
              <ProviderDocsLinks docs={props.config.docs} />
              {showProviderUpdateStatus && updateAdvisory?.status === "behind_latest" ? (
                <div className="text-xs text-muted-foreground">
                  {updateAdvisory.canUpdate && updateAdvisory.updateCommand ? (
                    <>
                      <span>{t("settings.commandLabel")} </span>
                      <code className="font-mono">{updateAdvisory.updateCommand}</code>
                    </>
                  ) : (
                    t("settings.noSafeUpdateCommand")
                  )}
                </div>
              ) : null}
              {showSelfManagedUpdate && props.providerStatus ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-xs text-muted-foreground">
                    {t("settings.selfManagedUpdate", { provider: title })}
                  </div>
                  <ProviderUpdateAction
                    providerStatus={props.providerStatus}
                    active={updateActive}
                    disabled={updateActive}
                    onUpdate={props.onUpdate}
                  />
                </div>
              ) : null}
              {props.config.fields.map((field) => (
                <ProviderInstallFieldControl
                  key={field.settingsKey}
                  field={field}
                  settings={props.settings}
                  updateSettings={props.updateSettings}
                />
              ))}
              <ProviderCustomModelsEditor
                provider={props.config.provider}
                settings={props.settings}
                defaults={props.defaults}
                updateSettings={props.updateSettings}
              />
            </div>
          </div>
        </CollapsiblePanel>
      </div>
    </Collapsible>
  );
}

export type ProvidersSettingsPanelProps = AppSettingsBinding & {
  readonly active: boolean;
  readonly resetEpoch: number;
};

export function ProvidersSettingsPanel({
  settings,
  defaults,
  updateSettings,
  active,
  resetEpoch,
}: ProvidersSettingsPanelProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const serverSettingsQuery = useQuery(serverSettingsQueryOptions());
  const [openInstallProviders, setOpenInstallProviders] = useState<Record<ProviderKind, boolean>>(
    () => createProviderInstallDisclosureState(settings),
  );
  const [updatingProviders, setUpdatingProviders] = useState<ReadonlySet<ProviderKind>>(
    () => new Set(),
  );
  const hiddenProviderSet = useMemo(
    () => new Set<ProviderKind>(settings.hiddenProviders),
    [settings.hiddenProviders],
  );
  const hiddenProviderCount = hiddenProviderSet.size;
  const providerVisibilityOptionsByProvider = useMemo(
    () => new Map(PROVIDER_VISIBILITY_OPTIONS.map((option) => [option.provider, option])),
    [],
  );
  const orderedProviderVisibilityOptions = useMemo(
    () =>
      settings.providerOrder.flatMap((provider) => {
        const option = providerVisibilityOptionsByProvider.get(provider);
        return option ? [option] : [];
      }),
    [providerVisibilityOptionsByProvider, settings.providerOrder],
  );
  const providerVisibilitySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const isProviderOrderDirty = !sameProviderOrder(settings.providerOrder, defaults.providerOrder);
  const providerStatusByProvider = useMemo(
    () =>
      new Map((serverConfigQuery.data?.providers ?? []).map((status) => [status.provider, status])),
    [serverConfigQuery.data?.providers],
  );
  const providerPickerStatusByProvider = useMemo(
    () =>
      new Map(
        (serverConfigQuery.data?.providers ?? []).flatMap((status) => {
          const normalized = normalizeProviderStatusForLocalConfig({
            provider: status.provider,
            status,
            customBinaryPath: getCustomBinaryPathForProvider(settings, status.provider),
          });
          return normalized ? ([[normalized.provider, normalized]] as const) : [];
        }),
      ),
    [serverConfigQuery.data?.providers, settings],
  );
  const availableProviderCount = orderedProviderVisibilityOptions.filter(
    (option) => providerPickerStatusByProvider.get(option.provider)?.available === true,
  ).length;
  const providerUpdateServerSettings = useMemo(
    () =>
      serverSettingsQuery.data
        ? {
            ...serverSettingsQuery.data,
            enableProviderUpdateChecks: settings.enableProviderUpdateChecks,
          }
        : null,
    [serverSettingsQuery.data, settings.enableProviderUpdateChecks],
  );
  const outdatedProviderStatuses = useMemo(
    () =>
      getVisibleProviderUpdateStatuses({
        providers: serverConfigQuery.data?.providers ?? [],
        hiddenProviders: settings.hiddenProviders,
        serverSettings: providerUpdateServerSettings,
      }),
    [providerUpdateServerSettings, serverConfigQuery.data?.providers, settings.hiddenProviders],
  );
  const outdatedProviderCount = outdatedProviderStatuses.length;
  const installSettingsDirty = isProviderInstallSettingsDirty(settings, defaults);

  useSettingsRestoreSignal(resetEpoch, () => {
    setOpenInstallProviders(createClosedProviderInstallDisclosureState());
  });

  const handleProviderOrderDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const fromIndex = settings.providerOrder.indexOf(active.id as ProviderKind);
      const toIndex = settings.providerOrder.indexOf(over.id as ProviderKind);
      if (fromIndex < 0 || toIndex < 0) return;
      updateSettings({ providerOrder: arrayMove([...settings.providerOrder], fromIndex, toIndex) });
    },
    [settings.providerOrder, updateSettings],
  );

  const runProviderUpdate = useCallback(
    async (provider: ProviderKind) => {
      if (updatingProviders.has(provider)) return;
      let progressToastDismissed = false;
      const dismissProgressToast = () => {
        progressToastDismissed = true;
      };
      const providerName = PROVIDER_DISPLAY_NAMES[provider];
      const toastId = toastManager.add({
        type: "loading",
        title: t("updater.updatingProvider", { provider: providerName }),
        data: createProviderUpdateToastData({
          stage: "progress",
          closeLabel: t("updater.hideProgress"),
          onClose: dismissProgressToast,
        }),
        timeout: 0,
      });
      setUpdatingProviders((current) => new Set(current).add(provider));
      await withProviderUpdateTimeout({
        provider,
        request: ensureNativeApi().server.updateProvider({ provider }),
      })
        .then((result) => {
          void reconcileServerProviderStatuses(queryClient, result.providers).catch(
            () => undefined,
          );
          const refreshedProvider = result.providers.find((status) => status.provider === provider);
          const failureMessage = refreshedProvider
            ? providerUpdateFailureMessage(
                refreshedProvider,
                t("settings.providerUpdateIncomplete"),
              )
            : t("settings.providerUpdateIncomplete");
          if (failureMessage) {
            const manualCommand = refreshedProvider?.versionAdvisory?.updateCommand?.trim();
            if (progressToastDismissed) return;
            toastManager.update(toastId, {
              type: "error",
              title: t("settings.couldNotUpdateProvider", {
                provider: providerName,
              }),
              description: manualCommand
                ? t("settings.manualUpdateInstruction", { failure: failureMessage })
                : failureMessage,
              data: createProviderUpdateToastData({
                stage: "error",
                onClose: dismissProgressToast,
                ...(manualCommand ? { copyText: manualCommand } : {}),
              }),
              timeout: 0,
            });
            return;
          }
          if (progressToastDismissed) return;
          toastManager.update(toastId, {
            type: "success",
            title: t("updater.providerUpdated", { provider: providerName }),
            description: t("updater.refreshedDescription"),
            data: createProviderUpdateToastData({
              stage: "success",
              onClose: dismissProgressToast,
            }),
            timeout: 0,
          });
        })
        .catch((error: unknown) => {
          if (progressToastDismissed) return;
          toastManager.update(toastId, {
            type: "error",
            title: t("settings.couldNotUpdateProvider", {
              provider: providerName,
            }),
            description:
              error instanceof ProviderUpdateTimeoutError
                ? t("updater.requestTimedOut", {
                    provider: PROVIDER_DISPLAY_NAMES[error.provider],
                  })
                : error instanceof Error
                  ? error.message
                  : t("settings.providerUpdateUnknownFailure"),
            data: createProviderUpdateToastData({
              stage: "error",
              onClose: dismissProgressToast,
            }),
            timeout: 0,
          });
        })
        .finally(() => {
          void queryClient
            .invalidateQueries({ queryKey: serverQueryKeys.config() })
            .catch(() => undefined);
          setUpdatingProviders((current) => {
            const next = new Set(current);
            next.delete(provider);
            return next;
          });
        });
    },
    [queryClient, t, updatingProviders],
  );

  if (!active) return null;

  return (
    <div className="space-y-6">
      <div id={PROVIDERS_SETTINGS_SEARCH.providerUpdates.target}>
        <SettingsSection title={t("settings.updates")}>
          <SettingsRow
            anchorId={PROVIDERS_SETTINGS_SEARCH.automaticCliUpdateChecks.target}
            title={t("settings.automaticCliUpdates")}
            description={t("settings.automaticCliUpdatesDescription")}
            resetAction={
              settings.enableProviderUpdateChecks !== defaults.enableProviderUpdateChecks ? (
                <SettingResetButton
                  label={t("settings.automaticCliUpdates")}
                  onClick={() =>
                    updateSettings({
                      enableProviderUpdateChecks: defaults.enableProviderUpdateChecks,
                    })
                  }
                />
              ) : null
            }
            control={
              <Switch
                checked={settings.enableProviderUpdateChecks}
                onCheckedChange={(checked) =>
                  updateSettings({ enableProviderUpdateChecks: Boolean(checked) })
                }
                aria-label={t("settings.automaticCliUpdates")}
              />
            }
          />

          <SettingsRow
            title={t("settings.providerUpdates")}
            description={t("settings.providerUpdatesDescription")}
            status={
              !settings.enableProviderUpdateChecks
                ? t("settings.automaticChecksOff")
                : outdatedProviderCount > 0
                  ? t("settings.updatesAvailable", { count: outdatedProviderCount })
                  : t("settings.noProviderUpdates")
            }
          >
            {settings.enableProviderUpdateChecks && outdatedProviderStatuses.length > 0 ? (
              <div
                className={cn(
                  "mt-4",
                  SETTINGS_INSET_LIST_CLASS_NAME,
                  SETTINGS_STACKED_ROWS_DIVIDER_CLASS_NAME,
                )}
              >
                {outdatedProviderStatuses.map((providerStatus) => {
                  const updateActive =
                    isProviderUpdateActive(providerStatus) ||
                    updatingProviders.has(providerStatus.provider);
                  const updateLabel = providerUpdateStatusLabel(providerStatus, t);
                  return (
                    <SettingsListRow
                      key={providerStatus.provider}
                      title={PROVIDER_DISPLAY_NAMES[providerStatus.provider]}
                      description={updateLabel || undefined}
                      actions={
                        providerStatus.versionAdvisory?.canUpdate ? (
                          <ProviderUpdateAction
                            providerStatus={providerStatus}
                            active={updateActive}
                            disabled={updateActive}
                            onUpdate={(provider) => void runProviderUpdate(provider)}
                          />
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {t("settings.manualUpdate")}
                          </span>
                        )
                      }
                    />
                  );
                })}
              </div>
            ) : null}
          </SettingsRow>
        </SettingsSection>
      </div>

      <SettingsSection title={t("settings.providerPicker")}>
        <SettingsRow
          anchorId={PROVIDERS_SETTINGS_SEARCH.visibleProviders.target}
          title={t("settings.visibleProviders")}
          description={t("settings.visibleProvidersDescription")}
          status={
            serverConfigQuery.isPending
              ? t("settings.engineStatusChecking")
              : hiddenProviderCount > 0
                ? t("settings.enginesAvailableWithHidden", {
                    available: availableProviderCount,
                    hidden: hiddenProviderCount,
                  })
                : isProviderOrderDirty
                  ? t("settings.enginesAvailableCustomOrder", {
                      count: availableProviderCount,
                    })
                  : t("settings.enginesAvailable", { count: availableProviderCount })
          }
          resetAction={
            hiddenProviderCount > 0 || isProviderOrderDirty ? (
              <SettingResetButton
                label={t("settings.providerPicker")}
                onClick={() =>
                  updateSettings({
                    hiddenProviders: defaults.hiddenProviders,
                    providerOrder: defaults.providerOrder,
                  })
                }
              />
            ) : null
          }
        >
          <DndContext
            sensors={providerVisibilitySensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleProviderOrderDragEnd}
          >
            <SortableContext
              items={orderedProviderVisibilityOptions.map((option) => option.provider)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-4 space-y-2">
                {orderedProviderVisibilityOptions.map((option) => (
                  <SortableProviderVisibilityRow
                    key={option.provider}
                    option={option}
                    providerStatus={providerPickerStatusByProvider.get(option.provider)}
                    statusPending={serverConfigQuery.isPending}
                    isHidden={hiddenProviderSet.has(option.provider)}
                    onHiddenChange={(hidden) =>
                      updateSettings({
                        hiddenProviders: setProviderHidden(
                          settings.hiddenProviders,
                          option.provider,
                          hidden,
                        ),
                      })
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </SettingsRow>
      </SettingsSection>

      <div>
        <SettingsSection title={t("settings.providerTools")}>
          <SettingsRow
            anchorId={PROVIDERS_SETTINGS_SEARCH.installedClis.target}
            title={t("settings.installedClis")}
            description={t("settings.installedClisDescription")}
            status={
              !settings.enableProviderUpdateChecks
                ? t("settings.automaticChecksOff")
                : outdatedProviderCount > 0
                  ? t("settings.updatesAvailable", { count: outdatedProviderCount })
                  : t("settings.noProviderUpdates")
            }
            resetAction={
              installSettingsDirty ? (
                <SettingResetButton
                  label={t("settings.providerTools")}
                  onClick={() => {
                    updateSettings(createProviderInstallResetPatch(defaults));
                    setOpenInstallProviders(createClosedProviderInstallDisclosureState());
                  }}
                />
              ) : null
            }
          >
            <div className="mt-4">
              <div className={SETTINGS_INSET_LIST_CLASS_NAME}>
                {PROVIDER_INSTALL_SETTINGS.map((config) => (
                  <ProviderToolRow
                    key={config.provider}
                    config={config}
                    open={openInstallProviders[config.provider]}
                    settings={settings}
                    defaults={defaults}
                    hiddenProviderSet={hiddenProviderSet}
                    serverSettings={providerUpdateServerSettings}
                    providerStatus={providerStatusByProvider.get(config.provider)}
                    updatingProviders={updatingProviders}
                    onOpenChange={(open) =>
                      setOpenInstallProviders((existing) => ({
                        ...existing,
                        [config.provider]: open,
                      }))
                    }
                    onUpdate={(provider) => void runProviderUpdate(provider)}
                    updateSettings={updateSettings}
                  />
                ))}
              </div>
            </div>
          </SettingsRow>
        </SettingsSection>
      </div>
    </div>
  );
}
