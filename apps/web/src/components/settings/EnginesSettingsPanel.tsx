// FILE: EnginesSettingsPanel.tsx
// Purpose: Own engine picker, update, and CLI installation settings workflows.
// Layer: Settings panel

import {
  type EngineKind,
  type ServerEngineStatus,
  type ServerSettingsPatch,
  type ServerSettingsView,
} from "@harnessos/contracts";
import { ENGINE_DESCRIPTORS, ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { deepMerge } from "@harnessos/shared/Struct";
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
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CUSTOM_MODEL_EDITOR_PROVIDER_SETTINGS,
  MAX_CUSTOM_MODEL_LENGTH,
  getCustomModelsForEngine,
  getCustomBinaryPathForEngine,
  getDefaultCustomModelsForEngine,
  patchCustomModels,
} from "~/engineSettings";
import { useLocalPreferences } from "~/localPreferences";
import { useServerSettings } from "~/serverSettings";
import {
  deriveEnginePickerAvailability,
  normalizeEngineStatusForLocalConfig,
  type EnginePickerAvailabilityState,
} from "~/lib/engineAvailability";
import { getModelOptions, normalizeModelSlug } from "@harnessos/shared/model";
import { CentralIcon } from "~/lib/central-icons";
import { DownloadIcon, ExternalLinkIcon, Loader2Icon, PlusIcon, XIcon } from "~/lib/icons";
import {
  reconcileServerEngineStatuses,
  serverConfigQueryOptions,
  serverQueryKeys,
} from "~/lib/serverReactQuery";
import { cn } from "~/lib/utils";
import { ensureNativeApi } from "~/nativeApi";
import { sameEngineOrder } from "~/engineOrdering";
import {
  getVisibleEngineUpdateStatuses,
  isEngineLatestVersionKnowable,
  isEngineUpdateActive,
  shouldOfferEngineUpdateAction,
  shouldPromptEngineUpdate,
  shouldShowEngineUpdateStatus,
  EngineUpdateTimeoutError,
  createEngineUpdateToastData,
  withEngineUpdateTimeout,
} from "~/engineUpdates";
import { ENGINES_SETTINGS_SEARCH } from "~/settingsMetadata/engineSettings";
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
import { EngineIcon } from "../EngineIcon";
import { SettingResetButton, useSettingsRestoreSignal } from "./SettingControls";
import { SettingsListRow, SettingsRow, SettingsSection } from "./SettingsPanelPrimitives";

type EngineInstallTextKey =
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
type EngineInstallPasswordKey = "kiloServerPassword" | "openCodeServerPassword";
type EngineInstallPasswordConfiguredKey =
  | "kiloServerPasswordConfigured"
  | "openCodeServerPasswordConfigured";
type EngineInstallBooleanKey = "openCodeExperimentalWebSockets";
type EngineInstallFieldKey =
  | EngineInstallTextKey
  | EngineInstallPasswordKey
  | EngineInstallBooleanKey;
type EngineInstallDraft = Partial<Record<EngineInstallFieldKey, string | boolean>>;
type SettingsTranslator = ReturnType<typeof useI18n>["t"];

type EngineInstallTextField = {
  readonly kind: "text";
  readonly settingsKey: EngineInstallTextKey;
  readonly labelKey: MessageKey;
  readonly labelParams?: Readonly<Record<string, string>>;
  readonly placeholderKey?: MessageKey;
  readonly placeholder?: string;
  readonly descriptionKey: MessageKey;
  readonly descriptionParams?: Readonly<Record<string, string>>;
};
type EngineInstallPasswordField = {
  readonly kind: "password";
  readonly settingsKey: EngineInstallPasswordKey;
  readonly configuredKey: EngineInstallPasswordConfiguredKey;
  readonly labelKey: MessageKey;
  readonly labelParams?: Readonly<Record<string, string>>;
  readonly placeholderKey?: MessageKey;
  readonly placeholder?: string;
  readonly descriptionKey: MessageKey;
  readonly descriptionParams?: Readonly<Record<string, string>>;
};
type EngineInstallBooleanField = {
  readonly kind: "boolean";
  readonly settingsKey: EngineInstallBooleanKey;
  readonly labelKey: MessageKey;
  readonly descriptionKey: MessageKey;
};
type EngineInstallField =
  | EngineInstallTextField
  | EngineInstallPasswordField
  | EngineInstallBooleanField;
type EngineInstallSettings = {
  readonly engine: EngineKind;
  readonly docs: ReadonlyArray<{ readonly labelKey: MessageKey; readonly href: string }>;
  readonly fields: readonly EngineInstallField[];
};

type CustomModelValidationResult =
  | { readonly model: string; readonly error?: never }
  | { readonly model?: never; readonly error: string };

export function validateEngineCustomModelInput(input: {
  readonly engine: EngineKind;
  readonly value: string;
  readonly savedModels: readonly string[];
}): CustomModelValidationResult {
  const normalized = normalizeModelSlug(input.value, input.engine);
  if (!normalized) return { error: "Enter a model slug." };
  if (getModelOptions(input.engine).some((option) => option.slug === normalized)) {
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

const ENGINE_VISIBILITY_OPTIONS: ReadonlyArray<{ engine: EngineKind; title: string }> =
  ENGINE_DESCRIPTORS.map((descriptor) => ({
    engine: descriptor.kind,
    title: descriptor.displayName,
  }));

const ENGINE_INSTALL_SETTINGS: readonly EngineInstallSettings[] = [
  {
    engine: "codex",
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
        labelParams: { engine: "Codex" },
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
    engine: "claude",
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
        labelParams: { engine: "Claude" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "claude" },
      },
    ],
  },
  {
    engine: "cursor",
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
        labelParams: { engine: "Cursor" },
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
    engine: "antigravity",
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
        labelParams: { engine: "Antigravity" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "agy" },
      },
    ],
  },
  {
    engine: "grok",
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
        labelParams: { engine: "Grok" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "grok" },
      },
    ],
  },
  {
    engine: "droid",
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
        labelParams: { engine: "Droid" },
        placeholder: "droid",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "droid" },
      },
    ],
  },
  {
    engine: "kilo",
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
        labelParams: { engine: "Kilo" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "kilo" },
      },
      {
        kind: "text",
        settingsKey: "kiloServerUrl",
        labelKey: "settings.serverUrl",
        labelParams: { engine: "Kilo" },
        placeholder: "http://127.0.0.1:4096",
        descriptionKey: "settings.serverUrlDescription",
        descriptionParams: { engine: "Kilo" },
      },
      {
        kind: "password",
        settingsKey: "kiloServerPassword",
        configuredKey: "kiloServerPasswordConfigured",
        labelKey: "settings.serverPassword",
        labelParams: { engine: "Kilo" },
        placeholderKey: "settings.serverPassword",
        descriptionKey: "settings.serverPasswordDescription",
        descriptionParams: { engine: "Kilo" },
      },
    ],
  },
  {
    engine: "opencode",
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
        labelParams: { engine: "OpenCode" },
        placeholderKey: "settings.binaryPath",
        descriptionKey: "settings.binaryPathDescription",
        descriptionParams: { command: "opencode" },
      },
      {
        kind: "text",
        settingsKey: "openCodeServerUrl",
        labelKey: "settings.serverUrl",
        labelParams: { engine: "OpenCode" },
        placeholder: "http://127.0.0.1:4096",
        descriptionKey: "settings.serverUrlDescription",
        descriptionParams: { engine: "OpenCode" },
      },
      {
        kind: "password",
        settingsKey: "openCodeServerPassword",
        configuredKey: "openCodeServerPasswordConfigured",
        labelKey: "settings.serverPassword",
        labelParams: { engine: "OpenCode" },
        placeholderKey: "settings.serverPassword",
        descriptionKey: "settings.serverPasswordDescription",
        descriptionParams: { engine: "OpenCode" },
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
    engine: "pi",
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
        labelParams: { engine: "Pi" },
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

function readEngineInstallField(
  settings: ServerSettingsView,
  field: EngineInstallField,
): string | boolean {
  switch (field.settingsKey) {
    case "claudeBinaryPath":
      return settings.engines.claude.binaryPath;
    case "codexBinaryPath":
      return settings.engines.codex.binaryPath;
    case "codexHomePath":
      return settings.engines.codex.homePath;
    case "cursorBinaryPath":
      return settings.engines.cursor.binaryPath;
    case "cursorApiEndpoint":
      return settings.engines.cursor.apiEndpoint;
    case "antigravityBinaryPath":
      return settings.engines.antigravity.binaryPath;
    case "grokBinaryPath":
      return settings.engines.grok.binaryPath;
    case "droidBinaryPath":
      return settings.engines.droid.binaryPath;
    case "kiloBinaryPath":
      return settings.engines.kilo.binaryPath;
    case "kiloServerUrl":
      return settings.engines.kilo.serverUrl;
    case "kiloServerPassword":
      return settings.engines.kilo.serverPasswordConfigured;
    case "openCodeBinaryPath":
      return settings.engines.opencode.binaryPath;
    case "openCodeServerUrl":
      return settings.engines.opencode.serverUrl;
    case "openCodeServerPassword":
      return settings.engines.opencode.serverPasswordConfigured;
    case "openCodeExperimentalWebSockets":
      return settings.engines.opencode.experimentalWebSockets;
    case "piBinaryPath":
      return settings.engines.pi.binaryPath;
    case "piAgentDir":
      return settings.engines.pi.agentDir;
  }
}

function engineInstallFieldPatch(
  field: Exclude<EngineInstallField, EngineInstallPasswordField>,
  value: string | boolean,
): ServerSettingsPatch {
  switch (field.settingsKey) {
    case "claudeBinaryPath":
      return { engines: { claude: { binaryPath: String(value) } } };
    case "codexBinaryPath":
      return { engines: { codex: { binaryPath: String(value) } } };
    case "codexHomePath":
      return { engines: { codex: { homePath: String(value) } } };
    case "cursorBinaryPath":
      return { engines: { cursor: { binaryPath: String(value) } } };
    case "cursorApiEndpoint":
      return { engines: { cursor: { apiEndpoint: String(value) } } };
    case "antigravityBinaryPath":
      return { engines: { antigravity: { binaryPath: String(value) } } };
    case "grokBinaryPath":
      return { engines: { grok: { binaryPath: String(value) } } };
    case "droidBinaryPath":
      return { engines: { droid: { binaryPath: String(value) } } };
    case "kiloBinaryPath":
      return { engines: { kilo: { binaryPath: String(value) } } };
    case "kiloServerUrl":
      return { engines: { kilo: { serverUrl: String(value) } } };
    case "openCodeBinaryPath":
      return { engines: { opencode: { binaryPath: String(value) } } };
    case "openCodeServerUrl":
      return { engines: { opencode: { serverUrl: String(value) } } };
    case "openCodeExperimentalWebSockets":
      return { engines: { opencode: { experimentalWebSockets: Boolean(value) } } };
    case "piBinaryPath":
      return { engines: { pi: { binaryPath: String(value) } } };
    case "piAgentDir":
      return { engines: { pi: { agentDir: String(value) } } };
  }
}

function createEngineInstallDraft(
  config: EngineInstallSettings,
  settings: ServerSettingsView,
): EngineInstallDraft {
  return Object.fromEntries(
    config.fields.map((field) => [
      field.settingsKey,
      field.kind === "password" ? "" : readEngineInstallField(settings, field),
    ]),
  );
}

function engineInstallDraftValue(
  draft: EngineInstallDraft,
  settings: ServerSettingsView,
  field: EngineInstallField,
): string | boolean {
  return (
    draft[field.settingsKey] ??
    (field.kind === "password" ? "" : readEngineInstallField(settings, field))
  );
}

function createEngineInstallDraftServerPatch(input: {
  config: EngineInstallSettings;
  settings: ServerSettingsView;
  draft: EngineInstallDraft;
  dirtyKeys: ReadonlySet<EngineInstallFieldKey>;
}): ServerSettingsPatch | null {
  let patch: ServerSettingsPatch | null = null;
  for (const field of input.config.fields) {
    if (field.kind === "password" || !input.dirtyKeys.has(field.settingsKey)) continue;
    const fieldPatch = engineInstallFieldPatch(
      field,
      engineInstallDraftValue(input.draft, input.settings, field),
    );
    patch = patch === null ? fieldPatch : deepMerge(patch, fieldPatch);
  }
  return patch;
}

function isEngineInstallFieldDirty(
  field: EngineInstallField,
  settings: ServerSettingsView,
  defaults: ServerSettingsView,
): boolean {
  return readEngineInstallField(settings, field) !== readEngineInstallField(defaults, field);
}

function isEngineInstallConfigDirty(
  config: EngineInstallSettings,
  settings: ServerSettingsView,
  defaults: ServerSettingsView,
): boolean {
  return config.fields.some((field) => isEngineInstallFieldDirty(field, settings, defaults));
}

export function isEngineInstallSettingsDirty(
  settings: ServerSettingsView,
  defaults: ServerSettingsView,
): boolean {
  return ENGINE_INSTALL_SETTINGS.some((config) =>
    isEngineInstallConfigDirty(config, settings, defaults),
  );
}

function createEngineInstallDisclosureState(
  settings: ServerSettingsView,
  defaults: ServerSettingsView,
): Record<EngineKind, boolean> {
  return Object.fromEntries(
    ENGINE_INSTALL_SETTINGS.map((config) => {
      const customModelsConfig = CUSTOM_MODEL_EDITOR_PROVIDER_SETTINGS.find(
        (candidate) => candidate.engine === config.engine,
      );
      return [
        config.engine,
        config.fields.some(
          (field) =>
            readEngineInstallField(settings, field) !== readEngineInstallField(defaults, field),
        ) ||
          (customModelsConfig !== undefined &&
            getCustomModelsForEngine(settings, customModelsConfig.engine).length >
              getCustomModelsForEngine(defaults, customModelsConfig.engine).length),
      ];
    }),
  ) as Record<EngineKind, boolean>;
}

function createClosedEngineInstallDisclosureState(): Record<EngineKind, boolean> {
  return Object.fromEntries(
    ENGINE_INSTALL_SETTINGS.map((config) => [config.engine, false]),
  ) as Record<EngineKind, boolean>;
}

export function createEngineInstallResetPatch(defaults: ServerSettingsView): ServerSettingsPatch {
  return {
    engines: {
      codex: {
        binaryPath: defaults.engines.codex.binaryPath,
        homePath: defaults.engines.codex.homePath,
      },
      claude: { binaryPath: defaults.engines.claude.binaryPath },
      cursor: {
        binaryPath: defaults.engines.cursor.binaryPath,
        apiEndpoint: defaults.engines.cursor.apiEndpoint,
      },
      antigravity: { binaryPath: defaults.engines.antigravity.binaryPath },
      grok: { binaryPath: defaults.engines.grok.binaryPath },
      droid: { binaryPath: defaults.engines.droid.binaryPath },
      kilo: {
        binaryPath: defaults.engines.kilo.binaryPath,
        serverUrl: defaults.engines.kilo.serverUrl,
      },
      opencode: {
        binaryPath: defaults.engines.opencode.binaryPath,
        serverUrl: defaults.engines.opencode.serverUrl,
        experimentalWebSockets: defaults.engines.opencode.experimentalWebSockets,
      },
      pi: {
        binaryPath: defaults.engines.pi.binaryPath,
        agentDir: defaults.engines.pi.agentDir,
      },
    },
  };
}

function setEngineHidden(
  current: ReadonlyArray<EngineKind>,
  engine: EngineKind,
  hidden: boolean,
): EngineKind[] {
  const withoutTarget = current.filter((entry) => entry !== engine);
  return hidden ? [...withoutTarget, engine] : withoutTarget;
}

function engineVisibilityStatusLabel(
  state: EnginePickerAvailabilityState,
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

function SortableEngineVisibilityRow(props: {
  option: { engine: EngineKind; title: string };
  engineStatus: ServerEngineStatus | undefined;
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
  } = useSortable({ id: props.option.engine });
  const availability = props.statusPending
    ? ({ disabled: false, state: "checking" } as const)
    : props.engineStatus
      ? deriveEnginePickerAvailability(props.engineStatus)
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
          aria-label={t("settings.reorderEngine", { engine: props.option.title })}
          {...attributes}
          {...listeners}
        >
          <CentralIcon name="dot-grid-2x3" className="size-4" />
        </button>
        <EngineIcon engine={props.option.engine} className="size-4 shrink-0" />
        <span className="min-w-0">
          <span className="block truncate text-sm text-foreground">{props.option.title}</span>
          <span className="block text-[11px] text-muted-foreground">
            {engineVisibilityStatusLabel(availability.state, t)}
          </span>
        </span>
      </div>
      <Switch
        checked={!props.isHidden}
        onCheckedChange={(checked) => props.onHiddenChange(!checked)}
        aria-label={t("settings.showEngine", { engine: props.option.title })}
      />
    </div>
  );
}

function EngineDocsLinks({ docs }: { docs: EngineInstallSettings["docs"] }) {
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

function formatEngineVersion(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

function engineUpdateStatusLabel(engine: ServerEngineStatus, t: SettingsTranslator): string | null {
  const state = engine.updateState?.status;
  if (state === "queued") return t("settings.updateQueued");
  if (state === "running") return t("settings.updatingEngine");
  if (state === "succeeded") return t("settings.updatedEngine");
  if (state === "failed") return t("settings.updateFailed");
  if (state === "unchanged") return t("settings.stillOutdated");
  const advisory = engine.versionAdvisory;
  if (advisory?.status === "behind_latest" && advisory.latestVersion) {
    const currentVersion = formatEngineVersion(advisory.currentVersion);
    const latestVersion = formatEngineVersion(advisory.latestVersion);
    return currentVersion
      ? `${currentVersion} → ${latestVersion}`
      : t("settings.latestVersion", { version: latestVersion ?? "" });
  }
  const currentVersion = formatEngineVersion(engine.version);
  return currentVersion ? t("settings.currentVersion", { version: currentVersion }) : null;
}

export function engineUpdateFailureMessage(
  engine: ServerEngineStatus | undefined,
  fallback: string,
): string | null {
  const state = engine?.updateState;
  if (engine?.versionAdvisory?.status === "behind_latest") {
    return state?.message?.trim() || fallback;
  }
  if (!state || (state.status !== "failed" && state.status !== "unchanged")) return null;
  // Full CLI output remains available in engine diagnostics. A transient toast should stay
  // readable and must not turn ANSI progress streams into a screen-sized error notification.
  return state.message?.trim() || fallback;
}

function EngineUpdateAction(props: {
  engineStatus: ServerEngineStatus;
  active: boolean;
  disabled: boolean;
  onUpdate: (engine: EngineKind) => void;
}) {
  const { t } = useI18n();
  const advisory = props.engineStatus.versionAdvisory;
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
        props.onUpdate(props.engineStatus.engine);
      }}
    >
      {props.active ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <DownloadIcon className="size-3.5" />
      )}
      {props.active ? t("settings.updatingEngine") : t("settings.update")}
    </Button>
  );
}

function EngineInstallFieldControl(props: {
  field: EngineInstallField;
  settings: ServerSettingsView;
  value: string | boolean;
  disabled: boolean;
  onChange: (value: string | boolean) => void;
}) {
  const { t } = useI18n();
  const id = `engine-install-${props.field.settingsKey}`;
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
          disabled={props.disabled}
          checked={Boolean(props.value)}
          onCheckedChange={(checked) => props.onChange(Boolean(checked))}
        />
      </label>
    );
  }

  const configured =
    props.field.kind === "password"
      ? Boolean(readEngineInstallField(props.settings, props.field))
      : false;
  const isPassword = props.field.kind === "password";
  return (
    <label htmlFor={id} className="block">
      <span className="block text-xs font-medium text-foreground">{label}</span>
      <Input
        id={id}
        size="sm"
        variant="soft"
        className="mt-1"
        disabled={props.disabled}
        value={String(props.value)}
        onChange={(event) => props.onChange(event.target.value)}
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

function EngineCustomModelsEditor(props: {
  engine: EngineKind;
  settings: ServerSettingsView;
  defaults: ServerSettingsView;
  updateServerSettings: (
    patch: ServerSettingsPatch,
  ) => Promise<{ readonly state: "saved" | "failed" }>;
}) {
  const { t } = useI18n();
  const config = CUSTOM_MODEL_EDITOR_PROVIDER_SETTINGS.find(
    (candidate) => candidate.engine === props.engine,
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!config) return null;

  const engine = config.engine;
  const savedModels = getCustomModelsForEngine(props.settings, engine);
  const defaultModels = getDefaultCustomModelsForEngine(engine);
  const isDirty = JSON.stringify(savedModels) !== JSON.stringify(defaultModels);
  const addModel = () => {
    const result = validateEngineCustomModelInput({
      engine,
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
    void props.updateServerSettings(patchCustomModels(engine, [...savedModels, result.model]));
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
            onClick={() =>
              void props.updateServerSettings(patchCustomModels(engine, [...defaultModels]))
            }
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
                  void props.updateServerSettings(
                    patchCustomModels(
                      engine,
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

function EngineToolRow(props: {
  config: EngineInstallSettings;
  open: boolean;
  settings: ServerSettingsView;
  defaults: ServerSettingsView;
  hiddenEngineSet: ReadonlySet<EngineKind>;
  serverSettings: Pick<ServerSettingsView, "engines" | "enableEngineUpdateChecks"> | null;
  engineStatus: ServerEngineStatus | undefined;
  updatingEngines: ReadonlySet<EngineKind>;
  onOpenChange: (open: boolean) => void;
  onUpdate: (engine: EngineKind) => void;
  updateServerSettings: (
    patch: ServerSettingsPatch,
  ) => Promise<{ readonly state: "saved" | "failed" }>;
  updateCredential: (
    engine: "kilo" | "opencode",
    password: string,
  ) => Promise<{ readonly state: "saved" | "failed" }>;
}) {
  const { t } = useI18n();
  const title = ENGINE_DISPLAY_NAMES[props.config.engine];
  const [draft, setDraft] = useState<EngineInstallDraft>(() =>
    createEngineInstallDraft(props.config, props.settings),
  );
  const [dirtyKeys, setDirtyKeys] = useState<ReadonlySet<EngineInstallFieldKey>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const saveRequestIdRef = useRef(0);

  useEffect(() => {
    setDirtyKeys((current) => {
      const next = new Set(current);
      for (const field of props.config.fields) {
        if (
          field.kind !== "password" &&
          next.has(field.settingsKey) &&
          engineInstallDraftValue(draft, props.settings, field) ===
            readEngineInstallField(props.settings, field)
        ) {
          next.delete(field.settingsKey);
        }
      }
      return next.size === current.size && [...next].every((key) => current.has(key))
        ? current
        : next;
    });
  }, [draft, props.config.fields, props.settings]);

  useEffect(() => {
    setDraft((current) => {
      let changed = false;
      const next = { ...current };
      for (const field of props.config.fields) {
        if (dirtyKeys.has(field.settingsKey)) continue;
        const authoritative =
          field.kind === "password" ? "" : readEngineInstallField(props.settings, field);
        if (next[field.settingsKey] !== authoritative) {
          next[field.settingsKey] = authoritative;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [dirtyKeys, props.config.fields, props.settings]);

  const updateDraft = (field: EngineInstallField, value: string | boolean) => {
    saveRequestIdRef.current += 1;
    setSaving(false);
    setDraft((current) => ({ ...current, [field.settingsKey]: value }));
    setDirtyKeys((current) => new Set(current).add(field.settingsKey));
  };

  const discardDraft = () => {
    saveRequestIdRef.current += 1;
    setSaving(false);
    setDraft(createEngineInstallDraft(props.config, props.settings));
    setDirtyKeys(new Set());
  };

  const saveDraft = async () => {
    const requestId = ++saveRequestIdRef.current;
    setSaving(true);
    const serverPatch = createEngineInstallDraftServerPatch({
      config: props.config,
      settings: props.settings,
      draft,
      dirtyKeys,
    });
    if (serverPatch !== null) {
      const result = await props.updateServerSettings(serverPatch);
      if (requestId !== saveRequestIdRef.current) return;
      if (result.state === "failed") {
        setSaving(false);
        return;
      }
    }

    const passwordField = props.config.fields.find(
      (field): field is EngineInstallPasswordField =>
        field.kind === "password" && dirtyKeys.has(field.settingsKey),
    );
    if (passwordField) {
      const engine = passwordField.settingsKey === "kiloServerPassword" ? "kilo" : "opencode";
      const result = await props.updateCredential(
        engine,
        String(engineInstallDraftValue(draft, props.settings, passwordField)),
      );
      if (requestId !== saveRequestIdRef.current) return;
      if (result.state === "failed") {
        toastManager.add({
          type: serverPatch === null ? "error" : "warning",
          title: t(
            serverPatch === null
              ? "settings.engineConfigSaveFailed"
              : "settings.engineConfigSavedCredentialFailed",
          ),
          description: t(
            serverPatch === null
              ? "settings.engineConfigSaveRecovery"
              : "settings.engineConfigSavedCredentialFailedDescription",
          ),
        });
        setSaving(false);
        return;
      }
      setDraft((current) => ({ ...current, [passwordField.settingsKey]: "" }));
      setDirtyKeys((current) => {
        const next = new Set(current);
        next.delete(passwordField.settingsKey);
        return next;
      });
    }
    if (requestId === saveRequestIdRef.current) setSaving(false);
  };
  const isDirty =
    dirtyKeys.size > 0 || isEngineInstallConfigDirty(props.config, props.settings, props.defaults);
  const showEngineUpdateStatus = props.engineStatus
    ? shouldShowEngineUpdateStatus({
        engine: props.engineStatus,
        hiddenEngineSet: props.hiddenEngineSet,
        serverSettings: props.serverSettings,
      })
    : false;
  const updateAdvisory = props.engineStatus?.versionAdvisory;
  const engineUpdateSuppressed =
    updateAdvisory?.status === "behind_latest" && !showEngineUpdateStatus;
  const currentEngineVersion = formatEngineVersion(props.engineStatus?.version);
  const engineUpdateLabel = props.engineStatus
    ? !props.settings.enableEngineUpdateChecks
      ? currentEngineVersion
        ? t("settings.currentVersion", { version: currentEngineVersion })
        : null
      : engineUpdateSuppressed
        ? null
        : engineUpdateStatusLabel(props.engineStatus, t)
    : null;
  const updateActive = Boolean(
    (props.engineStatus && isEngineUpdateActive(props.engineStatus)) ||
    props.updatingEngines.has(props.config.engine),
  );
  const showUpdateButton = props.engineStatus
    ? shouldPromptEngineUpdate(props.engineStatus) &&
      (showEngineUpdateStatus || updateAdvisory?.status === "unknown")
    : false;
  // Self-updating CLIs never report a latest version, so the update stays available
  // inside the panel rather than as a header badge that can never be satisfied.
  const showSelfManagedUpdate = props.engineStatus
    ? shouldOfferEngineUpdateAction(props.engineStatus) &&
      !isEngineLatestVersionKnowable(props.engineStatus)
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
            {engineUpdateLabel ? (
              <span
                className={cn(
                  "shrink-0 text-[11px]",
                  updateAdvisory?.status === "behind_latest"
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {engineUpdateLabel}
              </span>
            ) : null}
            <DisclosureChevron
              open={props.open}
              className="size-4 shrink-0 text-muted-foreground"
            />
          </CollapsibleTrigger>
          {showUpdateButton && props.engineStatus ? (
            <EngineUpdateAction
              engineStatus={props.engineStatus}
              active={updateActive}
              disabled={updateActive}
              onUpdate={props.onUpdate}
            />
          ) : null}
        </div>

        <CollapsiblePanel>
          <div className="border-t border-border/70 bg-muted/20 px-3 py-3">
            <div className="space-y-3">
              <EngineDocsLinks docs={props.config.docs} />
              {showEngineUpdateStatus && updateAdvisory?.status === "behind_latest" ? (
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
              {showSelfManagedUpdate && props.engineStatus ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-xs text-muted-foreground">
                    {t("settings.selfManagedUpdate", { engine: title })}
                  </div>
                  <EngineUpdateAction
                    engineStatus={props.engineStatus}
                    active={updateActive}
                    disabled={updateActive}
                    onUpdate={props.onUpdate}
                  />
                </div>
              ) : null}
              {props.config.fields.map((field) => (
                <EngineInstallFieldControl
                  key={field.settingsKey}
                  field={field}
                  settings={props.settings}
                  value={engineInstallDraftValue(draft, props.settings, field)}
                  disabled={saving}
                  onChange={(value) => updateDraft(field, value)}
                />
              ))}
              {dirtyKeys.size > 0 ? (
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" disabled={saving} onClick={discardDraft}>
                    {t("common.cancel")}
                  </Button>
                  <Button size="sm" disabled={saving} onClick={() => void saveDraft()}>
                    {saving ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
                    {t("settings.save")}
                  </Button>
                </div>
              ) : null}
              <EngineCustomModelsEditor
                engine={props.config.engine}
                settings={props.settings}
                defaults={props.defaults}
                updateServerSettings={props.updateServerSettings}
              />
            </div>
          </div>
        </CollapsiblePanel>
      </div>
    </Collapsible>
  );
}

export type EnginesSettingsPanelProps = {
  readonly active: boolean;
  readonly resetEpoch: number;
};

export function EnginesSettingsPanel({ active, resetEpoch }: EnginesSettingsPanelProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { preferences, defaults: preferenceDefaults, updatePreferences } = useLocalPreferences();
  const {
    query: serverSettingsQuery,
    settings,
    defaults,
    updateServerSettings: mutateServerSettings,
    updateEngineCredential: mutateEngineCredential,
  } = useServerSettings();
  const updateServerSettings = useCallback(
    async (patch: ServerSettingsPatch) => {
      const result = await mutateServerSettings(patch);
      if (result.state === "failed") {
        toastManager.add({
          type: "error",
          title: t("settings.engineConfigSaveFailed"),
          description: t("settings.engineConfigSaveRecovery"),
        });
      }
      return result;
    },
    [mutateServerSettings, t],
  );
  const resetEngineTools = useCallback(async () => {
    const results = await Promise.all([
      mutateServerSettings(createEngineInstallResetPatch(defaults)),
      mutateEngineCredential("kilo", ""),
      mutateEngineCredential("opencode", ""),
    ]);
    if (results.some((result) => result.state === "failed")) {
      toastManager.add({
        type: "warning",
        title: t("settings.restorePartiallyCompleted"),
        description: t("settings.restorePartiallyCompletedDescription"),
      });
      return;
    }
    setOpenInstallEngines(createClosedEngineInstallDisclosureState());
  }, [defaults, mutateEngineCredential, mutateServerSettings, t]);
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const [openInstallEngines, setOpenInstallEngines] = useState<Record<EngineKind, boolean>>(() =>
    createEngineInstallDisclosureState(settings ?? defaults, defaults),
  );
  const [updatingEngines, setUpdatingEngines] = useState<ReadonlySet<EngineKind>>(() => new Set());
  const hiddenEngineSet = useMemo(
    () => new Set<EngineKind>(preferences.hiddenEngines),
    [preferences.hiddenEngines],
  );
  const hiddenEngineCount = hiddenEngineSet.size;
  const engineVisibilityOptionsByEngine = useMemo(
    () => new Map(ENGINE_VISIBILITY_OPTIONS.map((option) => [option.engine, option])),
    [],
  );
  const orderedEngineVisibilityOptions = useMemo(
    () =>
      preferences.engineOrder.flatMap((engine) => {
        const option = engineVisibilityOptionsByEngine.get(engine);
        return option ? [option] : [];
      }),
    [engineVisibilityOptionsByEngine, preferences.engineOrder],
  );
  const engineVisibilitySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const isEngineOrderDirty = !sameEngineOrder(
    preferences.engineOrder,
    preferenceDefaults.engineOrder,
  );
  const engineStatusByEngine = useMemo(
    () => new Map((serverConfigQuery.data?.engines ?? []).map((status) => [status.engine, status])),
    [serverConfigQuery.data?.engines],
  );
  const enginePickerStatusByEngine = useMemo(
    () =>
      new Map(
        (serverConfigQuery.data?.engines ?? []).flatMap((status) => {
          const normalized = normalizeEngineStatusForLocalConfig({
            engine: status.engine,
            status,
            customBinaryPath: settings ? getCustomBinaryPathForEngine(settings, status.engine) : "",
          });
          return normalized ? ([[normalized.engine, normalized]] as const) : [];
        }),
      ),
    [serverConfigQuery.data?.engines, settings],
  );
  const availableEngineCount = orderedEngineVisibilityOptions.filter(
    (option) => enginePickerStatusByEngine.get(option.engine)?.available === true,
  ).length;
  const engineUpdateServerSettings = useMemo(
    () =>
      settings
        ? {
            ...settings,
            enableEngineUpdateChecks: settings.enableEngineUpdateChecks,
          }
        : null,
    [settings],
  );
  const outdatedEngineStatuses = useMemo(
    () =>
      getVisibleEngineUpdateStatuses({
        engines: serverConfigQuery.data?.engines ?? [],
        hiddenEngines: preferences.hiddenEngines,
        serverSettings: engineUpdateServerSettings,
      }),
    [engineUpdateServerSettings, serverConfigQuery.data?.engines, preferences.hiddenEngines],
  );
  const outdatedEngineCount = outdatedEngineStatuses.length;
  const installSettingsDirty = settings ? isEngineInstallSettingsDirty(settings, defaults) : false;

  useSettingsRestoreSignal(resetEpoch, () => {
    setOpenInstallEngines(createClosedEngineInstallDisclosureState());
  });

  const handleEngineOrderDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const fromIndex = preferences.engineOrder.indexOf(active.id as EngineKind);
      const toIndex = preferences.engineOrder.indexOf(over.id as EngineKind);
      if (fromIndex < 0 || toIndex < 0) return;
      updatePreferences({
        engineOrder: arrayMove([...preferences.engineOrder], fromIndex, toIndex),
      });
    },
    [preferences.engineOrder, updatePreferences],
  );

  const runEngineUpdate = useCallback(
    async (engine: EngineKind) => {
      if (updatingEngines.has(engine)) return;
      let progressToastDismissed = false;
      const dismissProgressToast = () => {
        progressToastDismissed = true;
      };
      const engineLabel = ENGINE_DISPLAY_NAMES[engine];
      const toastId = toastManager.add({
        type: "loading",
        title: t("updater.updatingEngine", { engine: engineLabel }),
        data: createEngineUpdateToastData({
          stage: "progress",
          closeLabel: t("updater.hideProgress"),
          onClose: dismissProgressToast,
        }),
        timeout: 0,
      });
      setUpdatingEngines((current) => new Set(current).add(engine));
      await withEngineUpdateTimeout({
        engine,
        request: ensureNativeApi().server.updateEngine({ engine }),
      })
        .then((result) => {
          void reconcileServerEngineStatuses(queryClient, result.engines).catch(() => undefined);
          const refreshedEngine = result.engines.find((status) => status.engine === engine);
          const failureMessage = refreshedEngine
            ? engineUpdateFailureMessage(refreshedEngine, t("settings.engineUpdateIncomplete"))
            : t("settings.engineUpdateIncomplete");
          if (failureMessage) {
            const manualCommand = refreshedEngine?.versionAdvisory?.updateCommand?.trim();
            if (progressToastDismissed) return;
            toastManager.update(toastId, {
              type: "error",
              title: t("settings.couldNotUpdateEngine", {
                engine: engineLabel,
              }),
              description: manualCommand
                ? t("settings.manualUpdateInstruction", { failure: failureMessage })
                : failureMessage,
              data: createEngineUpdateToastData({
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
            title: t("updater.engineUpdated", { engine: engineLabel }),
            description: t("updater.refreshedDescription"),
            data: createEngineUpdateToastData({
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
            title: t("settings.couldNotUpdateEngine", {
              engine: engine,
            }),
            description:
              error instanceof EngineUpdateTimeoutError
                ? t("updater.requestTimedOut", {
                    engine: ENGINE_DISPLAY_NAMES[error.engine],
                  })
                : error instanceof Error
                  ? error.message
                  : t("settings.engineUpdateUnknownFailure"),
            data: createEngineUpdateToastData({
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
          setUpdatingEngines((current) => {
            const next = new Set(current);
            next.delete(engine);
            return next;
          });
        });
    },
    [queryClient, t, updatingEngines],
  );

  if (!active) return null;
  if (!settings) {
    return (
      <SettingsSection title={t("settings.engineTools")}>
        <SettingsRow
          title={t("settings.engineTools")}
          description={t("settings.serverSettingsUnavailable")}
          status={serverSettingsQuery.isPending ? t("common.loading") : t("settings.unavailable")}
          control={
            serverSettingsQuery.isError ? (
              <Button
                size="xs"
                variant="outline"
                onClick={() => void serverSettingsQuery.refetch()}
              >
                {t("common.retry")}
              </Button>
            ) : undefined
          }
        />
      </SettingsSection>
    );
  }

  return (
    <div className="space-y-6">
      <div id={ENGINES_SETTINGS_SEARCH.engineUpdates.target}>
        <SettingsSection title={t("settings.updates")}>
          <SettingsRow
            anchorId={ENGINES_SETTINGS_SEARCH.automaticCliUpdateChecks.target}
            title={t("settings.automaticCliUpdates")}
            description={t("settings.automaticCliUpdatesDescription")}
            resetAction={
              settings.enableEngineUpdateChecks !== defaults.enableEngineUpdateChecks ? (
                <SettingResetButton
                  label={t("settings.automaticCliUpdates")}
                  onClick={() =>
                    void updateServerSettings({
                      enableEngineUpdateChecks: defaults.enableEngineUpdateChecks,
                    })
                  }
                />
              ) : null
            }
            control={
              <Switch
                checked={settings.enableEngineUpdateChecks}
                onCheckedChange={(checked) => {
                  void updateServerSettings({ enableEngineUpdateChecks: Boolean(checked) });
                }}
                aria-label={t("settings.automaticCliUpdates")}
              />
            }
          />

          <SettingsRow
            title={t("settings.engineUpdates")}
            description={t("settings.engineUpdatesDescription")}
            status={
              !settings.enableEngineUpdateChecks
                ? t("settings.automaticChecksOff")
                : outdatedEngineCount > 0
                  ? t("settings.updatesAvailable", { count: outdatedEngineCount })
                  : t("settings.noEngineUpdates")
            }
          >
            {settings.enableEngineUpdateChecks && outdatedEngineStatuses.length > 0 ? (
              <div
                className={cn(
                  "mt-4",
                  SETTINGS_INSET_LIST_CLASS_NAME,
                  SETTINGS_STACKED_ROWS_DIVIDER_CLASS_NAME,
                )}
              >
                {outdatedEngineStatuses.map((engineStatus) => {
                  const updateActive =
                    isEngineUpdateActive(engineStatus) || updatingEngines.has(engineStatus.engine);
                  const updateLabel = engineUpdateStatusLabel(engineStatus, t);
                  return (
                    <SettingsListRow
                      key={engineStatus.engine}
                      title={ENGINE_DISPLAY_NAMES[engineStatus.engine]}
                      description={updateLabel || undefined}
                      actions={
                        engineStatus.versionAdvisory?.canUpdate ? (
                          <EngineUpdateAction
                            engineStatus={engineStatus}
                            active={updateActive}
                            disabled={updateActive}
                            onUpdate={(engine) => void runEngineUpdate(engine)}
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

      <SettingsSection title={t("settings.enginePicker")}>
        <SettingsRow
          anchorId={ENGINES_SETTINGS_SEARCH.visibleEngines.target}
          title={t("settings.visibleEngines")}
          description={t("settings.visibleEnginesDescription")}
          status={
            serverConfigQuery.isPending
              ? t("settings.engineStatusChecking")
              : hiddenEngineCount > 0
                ? t("settings.enginesAvailableWithHidden", {
                    available: availableEngineCount,
                    hidden: hiddenEngineCount,
                  })
                : isEngineOrderDirty
                  ? t("settings.enginesAvailableCustomOrder", {
                      count: availableEngineCount,
                    })
                  : t("settings.enginesAvailable", { count: availableEngineCount })
          }
          resetAction={
            hiddenEngineCount > 0 || isEngineOrderDirty ? (
              <SettingResetButton
                label={t("settings.enginePicker")}
                onClick={() =>
                  updatePreferences({
                    hiddenEngines: preferenceDefaults.hiddenEngines,
                    engineOrder: preferenceDefaults.engineOrder,
                  })
                }
              />
            ) : null
          }
        >
          <DndContext
            sensors={engineVisibilitySensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleEngineOrderDragEnd}
          >
            <SortableContext
              items={orderedEngineVisibilityOptions.map((option) => option.engine)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-4 space-y-2">
                {orderedEngineVisibilityOptions.map((option) => (
                  <SortableEngineVisibilityRow
                    key={option.engine}
                    option={option}
                    engineStatus={enginePickerStatusByEngine.get(option.engine)}
                    statusPending={serverConfigQuery.isPending}
                    isHidden={hiddenEngineSet.has(option.engine)}
                    onHiddenChange={(hidden) =>
                      updatePreferences({
                        hiddenEngines: setEngineHidden(
                          preferences.hiddenEngines,
                          option.engine,
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
        <SettingsSection title={t("settings.engineTools")}>
          <SettingsRow
            anchorId={ENGINES_SETTINGS_SEARCH.installedClis.target}
            title={t("settings.installedClis")}
            description={t("settings.installedClisDescription")}
            status={
              !settings.enableEngineUpdateChecks
                ? t("settings.automaticChecksOff")
                : outdatedEngineCount > 0
                  ? t("settings.updatesAvailable", { count: outdatedEngineCount })
                  : t("settings.noEngineUpdates")
            }
            resetAction={
              installSettingsDirty ? (
                <SettingResetButton
                  label={t("settings.engineTools")}
                  onClick={() => {
                    void resetEngineTools();
                  }}
                />
              ) : null
            }
          >
            <div className="mt-4">
              <div className={SETTINGS_INSET_LIST_CLASS_NAME}>
                {ENGINE_INSTALL_SETTINGS.map((config) => (
                  <EngineToolRow
                    key={config.engine}
                    config={config}
                    open={openInstallEngines[config.engine]}
                    settings={settings}
                    defaults={defaults}
                    hiddenEngineSet={hiddenEngineSet}
                    serverSettings={engineUpdateServerSettings}
                    engineStatus={engineStatusByEngine.get(config.engine)}
                    updatingEngines={updatingEngines}
                    onOpenChange={(open) =>
                      setOpenInstallEngines((existing) => ({
                        ...existing,
                        [config.engine]: open,
                      }))
                    }
                    onUpdate={(engine) => void runEngineUpdate(engine)}
                    updateServerSettings={updateServerSettings}
                    updateCredential={mutateEngineCredential}
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
