// FILE: ModelsSettingsPanel.tsx
// Purpose: Own OmniMind model-service discovery, authentication, catalog, and recovery workflows.
// Layer: Settings panel

import {
  HARNESSOS_CUSTOM_MODEL_HEADERS_MAX_COUNT,
  HARNESSOS_CUSTOM_MODEL_COST_TIERS_MAX_COUNT,
  HARNESSOS_CUSTOM_MODEL_COMPAT_FIELDS_BY_API,
  WS_HARNESSOS_MODEL_SERVICES_CAPABILITY,
  type OmniMindModelServiceAuthEvent,
  type OmniMindModelServiceAuthPrompt,
  type OmniMindModelServiceAuthResult,
  type OmniMindModelServiceDescriptor,
  type OmniMindModelServiceOAuthPromptMode,
  type OmniMindModelServiceModel,
  type OmniMindCustomModelServiceApi,
  type OmniMindCustomModelServiceConfigInput,
  type OmniMindCustomModelServiceCredentialInput,
  type OmniMindCustomModelServiceDiscoveredModel,
  type OmniMindCustomModelHeaderMetadata,
  type OmniMindCustomModelHeaderMutation,
  type OmniMindCustomModelServiceModelInput,
  type EngineSelection,
} from "@harnessos/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useComposerDraftStore } from "~/composerDraftStore";
import {
  onNativeApiServerCapabilitiesChange,
  onNativeApiTransportStateChange,
  ensureNativeApi,
  readNativeApiServerCapabilityState,
  readNativeApiTransportState,
} from "~/nativeApi";
import {
  cancelOmniMindModelServicesAddIntentQueries,
  omniMindModelServicesQueryKeys,
  omniMindModelServiceDetailQueryOptions,
  omniMindModelServicesListQueryOptions,
} from "~/lib/omnimindModelServicesReactQuery";
import { engineDiscoveryQueryKeys } from "~/lib/engineDiscoveryReactQuery";
import { cn } from "~/lib/utils";
import { useI18n, type MessageKey } from "~/i18n";
import { useStore } from "~/store";

import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { SearchInput } from "../ui/search-input";
import { Select, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ArrowLeftIcon, ChevronRightIcon, EyeIcon, PlusIcon } from "~/lib/icons";
import { ModelServiceIcon } from "../ModelServiceIcon";
import { useSettingsRestoreSignal } from "./SettingControls";
import {
  SettingsCard,
  SettingsEmptyState,
  SettingsListRow,
  SettingsSectionShell,
  SettingsSelectPopup,
} from "./SettingsPanelPrimitives";
import { CredentialSecretControls } from "./CredentialSecretControls";

interface ModelServiceAuthDialogState {
  readonly serviceId: string;
  readonly serviceName: string;
  readonly authType: "api_key" | "oauth";
  readonly oauthPromptMode: OmniMindModelServiceOAuthPromptMode | null;
  readonly requestId?: string;
  readonly prompt?: OmniMindModelServiceAuthPrompt;
  readonly events: ReadonlyArray<OmniMindModelServiceAuthEvent>;
  readonly busy: boolean;
  readonly error: string | null;
  readonly value: string;
}

interface ModelServiceNotice {
  readonly tone: "status" | "error";
  readonly text: string;
}

export interface PreparedModelService {
  readonly service: OmniMindModelServiceDescriptor;
  readonly models: ReadonlyArray<OmniMindModelServiceModel>;
}

interface CustomHeaderEditorEntry {
  readonly name: string;
  readonly existingSource: OmniMindCustomModelHeaderMetadata["source"] | null;
  readonly mode: "preserve" | "environment" | "clear";
  readonly variableName: string;
}

type CustomModelEditorModel = Omit<OmniMindCustomModelServiceModelInput, "headerMutations"> & {
  readonly headers: ReadonlyArray<CustomHeaderEditorEntry>;
};

interface CustomModelServiceEditorState {
  readonly mode: "create" | "edit";
  readonly serviceId: string | null;
  readonly displayName: string;
  readonly api: OmniMindCustomModelServiceApi;
  readonly baseUrl: string;
  readonly authHeader: boolean | undefined;
  readonly credentialMode: "preserve" | "stored_key" | "environment" | "command";
  readonly apiKey: string;
  readonly environmentVariableName: string;
  readonly credentialCommand: string;
  readonly existingAuthSource: OmniMindModelServiceDescriptor["authSource"];
  readonly headers: ReadonlyArray<CustomHeaderEditorEntry>;
  readonly models: ReadonlyArray<CustomModelEditorModel>;
  readonly testedFingerprint: string | null;
  readonly testState: "idle" | "testing" | "success" | "failed";
}

interface CustomModelDiscoveryState {
  readonly status: "idle" | "loading" | "success";
  readonly models: ReadonlyArray<OmniMindCustomModelServiceDiscoveredModel>;
  readonly selectedModelIds: ReadonlySet<string>;
}

type CustomModelServiceAction = "discover" | "test" | "save";

const EMPTY_CUSTOM_MODEL_DISCOVERY: CustomModelDiscoveryState = {
  status: "idle",
  models: [],
  selectedModelIds: new Set(),
};

const DEFAULT_CUSTOM_MODEL: CustomModelEditorModel = {
  modelId: "",
  headers: [],
};
const CUSTOM_HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;
const CUSTOM_HEADER_ENVIRONMENT_VARIABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const CUSTOM_MODEL_THINKING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
const CUSTOM_MODEL_THINKING_LEVEL_LABEL_KEYS = {
  off: "settings.customApiThinkingLevel.off",
  minimal: "settings.customApiThinkingLevel.minimal",
  low: "settings.customApiThinkingLevel.low",
  medium: "settings.customApiThinkingLevel.medium",
  high: "settings.customApiThinkingLevel.high",
  xhigh: "settings.customApiThinkingLevel.xhigh",
  max: "settings.customApiThinkingLevel.max",
} as const;
type CustomModelCompat = NonNullable<OmniMindCustomModelServiceModelInput["compat"]>;
type CustomModelBooleanCompatField = Exclude<keyof CustomModelCompat, "maxTokensField">;
const CUSTOM_MODEL_COMPAT_LABEL_KEYS: Record<CustomModelBooleanCompatField, MessageKey> = {
  supportsDeveloperRole: "settings.customApiCompat.supportsDeveloperRole",
  supportsReasoningEffort: "settings.customApiCompat.supportsReasoningEffort",
  supportsUsageInStreaming: "settings.customApiCompat.supportsUsageInStreaming",
  requiresToolResultName: "settings.customApiCompat.requiresToolResultName",
  requiresAssistantAfterToolResult: "settings.customApiCompat.requiresAssistantAfterToolResult",
  requiresThinkingAsText: "settings.customApiCompat.requiresThinkingAsText",
  requiresReasoningContentOnAssistantMessages:
    "settings.customApiCompat.requiresReasoningContentOnAssistantMessages",
  supportsOpenAIGrammarTools: "settings.customApiCompat.supportsOpenAIGrammarTools",
  supportsStrictMode: "settings.customApiCompat.supportsStrictMode",
  supportsToolSearch: "settings.customApiCompat.supportsToolSearch",
  supportsEagerToolInputStreaming: "settings.customApiCompat.supportsEagerToolInputStreaming",
  supportsCacheControlOnTools: "settings.customApiCompat.supportsCacheControlOnTools",
  supportsTemperature: "settings.customApiCompat.supportsTemperature",
  forceAdaptiveThinking: "settings.customApiCompat.forceAdaptiveThinking",
  allowEmptySignature: "settings.customApiCompat.allowEmptySignature",
  supportsStrictTools: "settings.customApiCompat.supportsStrictTools",
  supportsToolReferences: "settings.customApiCompat.supportsToolReferences",
};

// Presentation preference only. Runtime projection remains the sole authority for
// whether a service exists and what it can do; unknown and Extension services stay
// in the complete searchable result set below.
const PREFERRED_MODEL_SERVICE_IDS = [
  "deepseek",
  "openai",
  "openai-codex",
  "anthropic",
  "google",
  "xiaomi",
] as const;
const PREFERRED_MODEL_SERVICE_RANK = new Map<string, number>(
  PREFERRED_MODEL_SERVICE_IDS.map((serviceId, index) => [serviceId, index]),
);

function customHeaderEditorEntries(
  headers: ReadonlyArray<OmniMindCustomModelHeaderMetadata> | undefined,
): ReadonlyArray<CustomHeaderEditorEntry> {
  return (headers ?? []).map((header) => ({
    name: header.name,
    existingSource: header.source,
    mode: "preserve",
    variableName: "",
  }));
}

function customHeaderMutations(
  entries: ReadonlyArray<CustomHeaderEditorEntry>,
): ReadonlyArray<OmniMindCustomModelHeaderMutation> {
  return entries.flatMap<OmniMindCustomModelHeaderMutation>((entry) => {
    if (entry.mode === "preserve") return [];
    const name = entry.name.trim();
    if (entry.mode === "clear") return [{ name, type: "clear" as const }];
    return [
      {
        name,
        type: "environment" as const,
        variableName: entry.variableName.trim(),
      },
    ];
  });
}

function customHeaderEntriesValid(entries: ReadonlyArray<CustomHeaderEditorEntry>): boolean {
  if (entries.length > HARNESSOS_CUSTOM_MODEL_HEADERS_MAX_COUNT) return false;
  const names = new Set<string>();
  for (const entry of entries) {
    const name = entry.name.trim();
    const normalizedName = name.toLowerCase();
    if (
      name.length === 0 ||
      name.length > 128 ||
      !CUSTOM_HEADER_NAME.test(name) ||
      names.has(normalizedName)
    ) {
      return false;
    }
    names.add(normalizedName);
    if (entry.mode === "preserve" && entry.existingSource === null) return false;
    if (
      entry.mode === "environment" &&
      !CUSTOM_HEADER_ENVIRONMENT_VARIABLE_NAME.test(entry.variableName.trim())
    ) {
      return false;
    }
  }
  return true;
}

function createCustomModelServiceEditor(): CustomModelServiceEditorState {
  return {
    mode: "create",
    serviceId: null,
    displayName: "",
    api: "openai-completions",
    baseUrl: "",
    authHeader: undefined,
    credentialMode: "stored_key",
    apiKey: "",
    environmentVariableName: "",
    credentialCommand: "",
    existingAuthSource: null,
    headers: [],
    models: [{ ...DEFAULT_CUSTOM_MODEL }],
    testedFingerprint: null,
    testState: "idle",
  };
}

function customModelServiceConfig(
  editor: CustomModelServiceEditorState,
): OmniMindCustomModelServiceConfigInput {
  const headerMutations = customHeaderMutations(editor.headers);
  return {
    serviceId: editor.serviceId,
    displayName: editor.displayName.trim(),
    api: editor.api,
    baseUrl: editor.baseUrl.trim(),
    ...(editor.authHeader !== undefined ? { authHeader: editor.authHeader } : {}),
    ...(headerMutations.length > 0 ? { headerMutations } : {}),
    models: editor.models.map((model) => {
      const modelHeaderMutations = customHeaderMutations(model.headers);
      return {
        modelId: model.modelId.trim(),
        ...(model.displayName?.trim() ? { displayName: model.displayName.trim() } : {}),
        ...(model.api ? { api: model.api } : {}),
        ...(model.baseUrl?.trim() ? { baseUrl: model.baseUrl.trim() } : {}),
        ...(model.reasoning !== undefined ? { reasoning: model.reasoning } : {}),
        ...(model.thinkingLevelMap ? { thinkingLevelMap: { ...model.thinkingLevelMap } } : {}),
        ...(model.input ? { input: [...model.input] } : {}),
        ...(model.cost
          ? {
              cost: {
                ...model.cost,
                ...(model.cost.tiers
                  ? { tiers: model.cost.tiers.map((tier) => ({ ...tier })) }
                  : {}),
              },
            }
          : {}),
        ...(model.compat ? { compat: { ...model.compat } } : {}),
        ...(model.contextWindow !== undefined ? { contextWindow: model.contextWindow } : {}),
        ...(model.maxTokens !== undefined ? { maxTokens: model.maxTokens } : {}),
        ...(modelHeaderMutations.length > 0 ? { headerMutations: modelHeaderMutations } : {}),
      };
    }),
  };
}

function customModelServiceDiscoveryConfig(editor: CustomModelServiceEditorState) {
  const headerMutations = customHeaderMutations(editor.headers);
  return {
    serviceId: editor.serviceId,
    displayName: editor.displayName.trim(),
    api: editor.api,
    baseUrl: editor.baseUrl.trim(),
    ...(headerMutations.length > 0 ? { headerMutations } : {}),
  } as const;
}

function customModelServiceFingerprint(editor: CustomModelServiceEditorState): string {
  return JSON.stringify({
    config: customModelServiceConfig(editor),
    credentialMode: editor.credentialMode,
    apiKey: editor.apiKey,
    environmentVariableName: editor.environmentVariableName,
    credentialCommand: editor.credentialCommand,
  });
}

function customModelServiceCredentialInput(
  editor: CustomModelServiceEditorState,
): OmniMindCustomModelServiceCredentialInput | null {
  switch (editor.credentialMode) {
    case "preserve":
      return editor.mode === "edit" ? { type: "preserve" } : null;
    case "stored_key":
      return editor.apiKey.length > 0 ? { type: "stored_key", apiKey: editor.apiKey } : null;
    case "environment": {
      const variableName = editor.environmentVariableName.trim();
      return /^[A-Za-z_][A-Za-z0-9_]*$/u.test(variableName)
        ? { type: "environment", variableName }
        : null;
    }
    case "command":
      return editor.credentialCommand.length > 0 &&
        editor.credentialCommand.length <= 4_096 &&
        editor.credentialCommand === editor.credentialCommand.trim() &&
        !/[\u0000-\u001f\u007f-\u009f]/u.test(editor.credentialCommand)
        ? { type: "command", command: editor.credentialCommand }
        : null;
  }
}

function customModelServiceRiskFingerprint(editor: CustomModelServiceEditorState): string {
  return JSON.stringify(
    [editor.baseUrl, ...editor.models.map((model) => model.baseUrl ?? editor.baseUrl)]
      .map((endpoint) => endpoint.trim())
      .filter(
        (endpoint, index, endpoints) =>
          endpoint.length > 0 && endpoints.indexOf(endpoint) === index,
      )
      .toSorted(),
  );
}

function engineSelectionUsesCustomService(
  selection: EngineSelection | null | undefined,
  serviceId: string,
): boolean {
  return selection?.engine === "oa" && selection.model.startsWith(`${serviceId}/`);
}

function countCustomServiceReferences(serviceId: string): number {
  const composerState = useComposerDraftStore.getState();
  const appState = useStore.getState();
  const draftReferences = Object.values(composerState.draftsByThreadId).filter((draft) =>
    engineSelectionUsesCustomService(draft.engineSelectionByEngine.oa, serviceId),
  ).length;
  const queuedTurnReferences = Object.values(composerState.draftsByThreadId).reduce(
    (count, draft) =>
      count +
      draft.queuedTurns.filter((turn) =>
        engineSelectionUsesCustomService(turn.engineSelection, serviceId),
      ).length,
    0,
  );
  const stickyReference = engineSelectionUsesCustomService(
    composerState.stickyEngineSelectionByEngine.oa,
    serviceId,
  )
    ? 1
    : 0;
  const projectReferences = appState.projects.filter((project) =>
    engineSelectionUsesCustomService(project.defaultEngineSelection, serviceId),
  ).length;
  const persistedThreadReferences = Object.values(appState.threadShellById ?? {}).filter((thread) =>
    engineSelectionUsesCustomService(thread.engineSelection, serviceId),
  ).length;
  return (
    draftReferences +
    queuedTurnReferences +
    stickyReference +
    projectReferences +
    persistedThreadReferences
  );
}

function customApiDeleteDescriptionKey(
  service: OmniMindModelServiceDescriptor | null,
):
  | "settings.customApiDeleteDescriptionStored"
  | "settings.customApiDeleteDescriptionEnvironment"
  | "settings.customApiDeleteDescriptionCommand"
  | "settings.customApiDeleteDescriptionConfiguration" {
  if (service?.authSource === "environment") {
    return "settings.customApiDeleteDescriptionEnvironment";
  }
  if (service?.authSource === "models_json_command") {
    return "settings.customApiDeleteDescriptionCommand";
  }
  if (service?.authSource === "stored" || service?.authSource === "runtime") {
    return "settings.customApiDeleteDescriptionStored";
  }
  return "settings.customApiDeleteDescriptionConfiguration";
}

function customModelServiceCommandFingerprint(
  editor: CustomModelServiceEditorState,
  action: CustomModelServiceAction,
): string | null {
  if (action === "save") return null;
  const commandSources: string[] = [];
  if (editor.credentialMode === "command") {
    commandSources.push(`credential:new:${editor.credentialCommand}`);
  } else if (
    editor.credentialMode === "preserve" &&
    editor.existingAuthSource === "models_json_command"
  ) {
    commandSources.push("credential:preserved");
  }
  for (const entry of editor.headers) {
    if (entry.mode === "preserve" && entry.existingSource === "command") {
      commandSources.push(`engine:${entry.name.toLowerCase()}`);
    }
  }
  if (action === "test") {
    for (const entry of editor.models[0]?.headers ?? []) {
      if (entry.mode === "preserve" && entry.existingSource === "command") {
        commandSources.push(`model:${entry.name.toLowerCase()}`);
      }
    }
  }
  return commandSources.length > 0
    ? JSON.stringify({ action, commandSources: commandSources.toSorted() })
    : null;
}

function customCredentialSourceKind(
  source: CustomModelServiceEditorState["existingAuthSource"],
): "stored_key" | "environment" | "command" | "configuration" | "unknown" {
  switch (source) {
    case "stored":
    case "runtime":
      return "stored_key";
    case "environment":
      return "environment";
    case "models_json_command":
      return "command";
    case "models_json_key":
    case "fallback":
      return "configuration";
    default:
      return "unknown";
  }
}

function CustomHeaderEditor({
  entries,
  scope,
  onChange,
}: {
  readonly entries: ReadonlyArray<CustomHeaderEditorEntry>;
  readonly scope: "engine" | "model";
  readonly onChange: (entries: ReadonlyArray<CustomHeaderEditorEntry>) => void;
}) {
  const { t } = useI18n();
  const normalizedNameCounts = new Map<string, number>();
  for (const entry of entries) {
    const normalized = entry.name.trim().toLowerCase();
    if (normalized)
      normalizedNameCounts.set(normalized, (normalizedNameCounts.get(normalized) ?? 0) + 1);
  }
  const hasPreservedCommand = entries.some(
    (entry) => entry.mode === "preserve" && entry.existingSource === "command",
  );

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h5 className="text-xs font-medium text-foreground">{t("settings.customApiHeaders")}</h5>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t(
              scope === "engine"
                ? "settings.customApiHeadersDescription.engine"
                : "settings.customApiHeadersDescription.model",
            )}
          </p>
        </div>
        <Button
          type="button"
          size="xs"
          variant="outline"
          aria-label={t(
            scope === "engine"
              ? "settings.customApiHeaderAdd.engine"
              : "settings.customApiHeaderAdd.model",
          )}
          disabled={entries.length >= HARNESSOS_CUSTOM_MODEL_HEADERS_MAX_COUNT}
          onClick={() =>
            onChange([
              ...entries,
              {
                name: "",
                existingSource: null,
                mode: "environment",
                variableName: "",
              },
            ])
          }
        >
          <PlusIcon aria-hidden="true" />
          {t("settings.customApiHeaderAdd")}
        </Button>
      </div>

      {entries.length > 0 ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {entries.map((entry, index) => {
            const name = entry.name.trim();
            const nameInvalid =
              name.length === 0 || name.length > 128 || !CUSTOM_HEADER_NAME.test(name);
            const duplicate =
              name.length > 0 && (normalizedNameCounts.get(name.toLowerCase()) ?? 0) > 1;
            const variableInvalid =
              entry.mode === "environment" &&
              !CUSTOM_HEADER_ENVIRONMENT_VARIABLE_NAME.test(entry.variableName.trim());
            return (
              <div key={index} className="space-y-2 p-2.5">
                <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
                  {entry.existingSource === null ? (
                    <label className="min-w-0 space-y-1 text-xs font-medium text-foreground">
                      <span>{t("settings.customApiHeaderName")}</span>
                      <Input
                        value={entry.name}
                        aria-label={t(
                          scope === "engine"
                            ? "settings.customApiHeaderName.engine"
                            : "settings.customApiHeaderName.model",
                          { number: index + 1 },
                        )}
                        aria-invalid={nameInvalid || duplicate}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={t("settings.customApiHeaderNamePlaceholder")}
                        onChange={(event) =>
                          onChange(
                            entries.map((current, currentIndex) =>
                              currentIndex === index
                                ? { ...current, name: event.target.value }
                                : current,
                            ),
                          )
                        }
                      />
                    </label>
                  ) : (
                    <div className="min-w-0 space-y-1">
                      <span className="block text-xs font-medium text-foreground">
                        {t("settings.customApiHeaderName")}
                      </span>
                      <code className="block truncate text-xs text-foreground" title={entry.name}>
                        {entry.name}
                      </code>
                      <span className="block text-[11px] text-muted-foreground">
                        {t(`settings.customApiHeaderSource.${entry.existingSource}`)}
                      </span>
                    </div>
                  )}

                  {entry.existingSource === null ? (
                    <label className="min-w-0 space-y-1 text-xs font-medium text-foreground">
                      <span>{t("settings.customApiHeaderEnvironmentVariable")}</span>
                      <Input
                        value={entry.variableName}
                        aria-label={t(
                          scope === "engine"
                            ? "settings.customApiHeaderEnvironmentVariable.engine"
                            : "settings.customApiHeaderEnvironmentVariable.model",
                          { number: index + 1 },
                        )}
                        aria-invalid={variableInvalid}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={t("settings.customApiHeaderEnvironmentVariablePlaceholder")}
                        onChange={(event) =>
                          onChange(
                            entries.map((current, currentIndex) =>
                              currentIndex === index
                                ? {
                                    ...current,
                                    variableName: event.target.value,
                                  }
                                : current,
                            ),
                          )
                        }
                      />
                    </label>
                  ) : (
                    <label className="min-w-0 space-y-1 text-xs font-medium text-foreground">
                      <span>{t("settings.customApiHeaderAction")}</span>
                      <Select
                        value={entry.mode}
                        onValueChange={(value) =>
                          onChange(
                            entries.map((current, currentIndex) =>
                              currentIndex === index
                                ? {
                                    ...current,
                                    mode: value as CustomHeaderEditorEntry["mode"],
                                    variableName:
                                      value === "environment" ? current.variableName : "",
                                  }
                                : current,
                            ),
                          )
                        }
                      >
                        <SelectTrigger
                          aria-label={t("settings.customApiHeaderActionNamed", {
                            name: entry.name,
                          })}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SettingsSelectPopup align="start">
                          <SelectItem value="preserve">
                            {t("settings.customApiHeaderAction.preserve")}
                          </SelectItem>
                          <SelectItem value="environment">
                            {t("settings.customApiHeaderAction.environment")}
                          </SelectItem>
                          <SelectItem value="clear">
                            {t("settings.customApiHeaderAction.clear")}
                          </SelectItem>
                        </SettingsSelectPopup>
                      </Select>
                    </label>
                  )}

                  {entry.existingSource === null ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      aria-label={t(
                        scope === "engine"
                          ? "settings.customApiHeaderRemove.engine"
                          : "settings.customApiHeaderRemove.model",
                        { number: index + 1 },
                      )}
                      className="self-end justify-self-start text-destructive hover:text-destructive sm:justify-self-end"
                      onClick={() =>
                        onChange(entries.filter((_, currentIndex) => currentIndex !== index))
                      }
                    >
                      {t("common.remove")}
                    </Button>
                  ) : null}
                </div>

                {entry.existingSource !== null && entry.mode === "environment" ? (
                  <label className="block space-y-1 text-xs font-medium text-foreground">
                    <span>{t("settings.customApiHeaderEnvironmentVariable")}</span>
                    <Input
                      value={entry.variableName}
                      aria-label={t(
                        scope === "engine"
                          ? "settings.customApiHeaderEnvironmentVariable.engine"
                          : "settings.customApiHeaderEnvironmentVariable.model",
                        { number: index + 1 },
                      )}
                      aria-invalid={variableInvalid}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={t("settings.customApiHeaderEnvironmentVariablePlaceholder")}
                      onChange={(event) =>
                        onChange(
                          entries.map((current, currentIndex) =>
                            currentIndex === index
                              ? { ...current, variableName: event.target.value }
                              : current,
                          ),
                        )
                      }
                    />
                  </label>
                ) : null}

                {nameInvalid || duplicate || variableInvalid ? (
                  <p role="alert" className="text-xs text-destructive">
                    {t(
                      duplicate
                        ? "settings.customApiHeaderError.duplicate"
                        : variableInvalid
                          ? "settings.customApiHeaderError.variable"
                          : "settings.customApiHeaderError.name",
                    )}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("settings.customApiHeadersPrivacy")}
      </p>
      {hasPreservedCommand ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            scope === "engine"
              ? "settings.customApiHeaderCommandDescription.engine"
              : "settings.customApiHeaderCommandDescription.model",
          )}
        </p>
      ) : null}
    </div>
  );
}

function stableModelServiceInstanceSuffix(serviceId: string): string {
  let hash = 0x811c9dc5;
  for (const character of serviceId) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return `#${(hash >>> 0).toString(16).padStart(8, "0").slice(0, 6).toUpperCase()}`;
}

const subscribeModelServicesCapability = (listener: () => void) =>
  onNativeApiServerCapabilitiesChange(listener);
const readModelServicesCapability = () =>
  readNativeApiServerCapabilityState(WS_HARNESSOS_MODEL_SERVICES_CAPABILITY);
const readServerModelServicesCapability = () => null;
const subscribeModelServicesTransport = (listener: () => void) =>
  onNativeApiTransportStateChange(listener);
const readModelServicesTransport = () => readNativeApiTransportState();
const readServerModelServicesTransport = () => null;

function authEventExternalUrl(event: OmniMindModelServiceAuthEvent): string | null {
  return event.type === "auth_url"
    ? event.url
    : event.type === "device_code"
      ? event.verificationUri
      : null;
}

function authEventExternalHost(event: OmniMindModelServiceAuthEvent): string | null {
  const url = authEventExternalUrl(event);
  return url ? new URL(url).hostname : null;
}

export function ModelsSettingsPanel({
  active,
  startInAddFlow = false,
  presentation = "settings",
  onServicePrepared,
  onSetupReady,
  resetEpoch,
}: {
  readonly resetEpoch: number;
  readonly active: boolean;
  readonly startInAddFlow?: boolean;
  readonly presentation?: "settings" | "first-run";
  readonly onServicePrepared?: (prepared: PreparedModelService) => void;
  readonly onSetupReady?: (selection: EngineSelection) => void;
}) {
  if (!active) return null;
  return (
    <ActiveModelsSettingsPanel
      active
      startInAddFlow={startInAddFlow}
      presentation={presentation}
      {...(onServicePrepared ? { onServicePrepared } : {})}
      {...(onSetupReady ? { onSetupReady } : {})}
      resetEpoch={resetEpoch}
    />
  );
}

function ActiveModelsSettingsPanel({
  resetEpoch,
  active,
  startInAddFlow,
  presentation,
  onServicePrepared,
  onSetupReady,
}: {
  readonly resetEpoch: number;
  readonly active: boolean;
  readonly startInAddFlow: boolean;
  readonly presentation: "settings" | "first-run";
  readonly onServicePrepared?: (prepared: PreparedModelService) => void;
  readonly onSetupReady?: (selection: EngineSelection) => void;
}) {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const authRequestControllerRef = useRef<AbortController | null>(null);
  const modelServicePostLoginControllerRef = useRef<AbortController | null>(null);
  const modelServiceRefreshControllerRef = useRef<AbortController | null>(null);
  const modelServiceApiKeyControllerRef = useRef<AbortController | null>(null);
  const customTestControllerRef = useRef<AbortController | null>(null);
  const customDiscoveryControllerRef = useRef<AbortController | null>(null);
  const authRequestIdRef = useRef<string | null>(null);
  const openedAuthUrlsRef = useRef(new Set<string>());
  const setupCompletionArmedRef = useRef(false);
  const setupTargetServiceIdRef = useRef<string | null>(null);
  const addModelServiceButtonRef = useRef<HTMLButtonElement | null>(null);
  const modelServiceSearchInputRef = useRef<HTMLInputElement | null>(null);
  const modelServiceDetailBackButtonRef = useRef<HTMLButtonElement | null>(null);
  const modelServiceBrowserListRef = useRef<HTMLDivElement | null>(null);
  const modelServiceBrowserItemRefs = useRef(new Map<string, HTMLButtonElement>());
  const modelServiceBrowserRestoreRef = useRef<{
    readonly serviceId: string;
    readonly scrollTop: number;
  } | null>(null);
  const modelServiceDetailShouldFocusRef = useRef(false);
  const customServiceEditorInitialFingerprintRef = useRef<string | null>(null);
  const modelServicesCapability = useSyncExternalStore(
    subscribeModelServicesCapability,
    readModelServicesCapability,
    readServerModelServicesCapability,
  );
  const modelServicesTransport = useSyncExternalStore(
    subscribeModelServicesTransport,
    readModelServicesTransport,
    readServerModelServicesTransport,
  );
  const [confirmedOpenReadFailure, setConfirmedOpenReadFailure] = useState(false);
  const openReadRetryAttemptedRef = useRef(false);
  const [selectedModelServiceId, setSelectedModelServiceId] = useState<string | null>(null);
  const [modelServiceBrowserOpen, setModelServiceBrowserOpen] = useState(startInAddFlow);
  const [modelServiceSearch, setModelServiceSearch] = useState("");
  const [modelServiceModelSearch, setModelServiceModelSearch] = useState("");
  const [modelServiceDetailReturnView, setModelServiceDetailReturnView] = useState<
    "overview" | "browser"
  >("overview");
  const [authDialog, setAuthDialog] = useState<ModelServiceAuthDialogState | null>(null);
  const [logoutService, setLogoutService] = useState<OmniMindModelServiceDescriptor | null>(null);
  const [removeCustomService, setRemoveCustomService] =
    useState<OmniMindModelServiceDescriptor | null>(null);
  const removeCustomServiceReferenceCount = removeCustomService
    ? countCustomServiceReferences(removeCustomService.serviceId)
    : 0;
  const [customServiceEditor, setCustomServiceEditor] =
    useState<CustomModelServiceEditorState | null>(null);
  const [customServiceApiKeyVisible, setCustomServiceApiKeyVisible] = useState(false);
  const [customModelDiscovery, setCustomModelDiscovery] = useState<CustomModelDiscoveryState>(
    EMPTY_CUSTOM_MODEL_DISCOVERY,
  );
  const [customServiceDiscardRequested, setCustomServiceDiscardRequested] = useState(false);
  const [pendingCustomServiceRiskAction, setPendingCustomServiceRiskAction] = useState<
    "discover" | "test" | "save" | null
  >(null);
  const [confirmedCustomServiceEndpoint, setConfirmedCustomServiceEndpoint] = useState<
    string | null
  >(null);
  const [confirmedCustomServiceCommands, setConfirmedCustomServiceCommands] = useState<
    ReadonlySet<string>
  >(new Set());
  const [modelServiceMutation, setModelServiceMutation] = useState<string | null>(null);
  const [revealedModelServiceApiKey, setRevealedModelServiceApiKey] = useState<{
    readonly serviceId: string;
    readonly value: string;
  } | null>(null);
  const [modelServiceApiKeyAccess, setModelServiceApiKeyAccess] = useState<
    "reveal" | "copy" | null
  >(null);
  const [modelServiceApiKeyError, setModelServiceApiKeyError] = useState<string | null>(null);
  const [modelServiceNotice, setModelServiceNotice] = useState<ModelServiceNotice | null>(null);
  const modelServiceDetailRegionId = useId();
  const customServiceApiKeyInputId = useId();
  const customServiceEditorDirty =
    customServiceEditor !== null &&
    customServiceEditorInitialFingerprintRef.current !== null &&
    customModelServiceFingerprint(customServiceEditor) !==
      customServiceEditorInitialFingerprintRef.current;
  const customServiceNavigationBlocker = useBlocker({
    shouldBlockFn: () => customServiceEditorDirty,
    enableBeforeUnload: customServiceEditorDirty,
    withResolver: true,
  });
  const modelServicesQuery = useQuery(
    omniMindModelServicesListQueryOptions({
      enabled: active && modelServicesCapability === true,
    }),
  );
  const addModelServicesQuery = useQuery(
    omniMindModelServicesListQueryOptions({
      enabled: active && modelServicesCapability === true && modelServiceBrowserOpen,
      intent: "add_service",
    }),
  );
  const modelServiceDetailQuery = useQuery(
    omniMindModelServiceDetailQueryOptions({
      enabled: active && modelServicesCapability === true,
      serviceId: selectedModelServiceId,
      ...(modelServiceDetailReturnView === "browser" ? { intent: "add_service" as const } : {}),
    }),
  );

  useEffect(() => {
    if (active && modelServicesCapability === true && modelServiceBrowserOpen) return;
    void cancelOmniMindModelServicesAddIntentQueries(queryClient);
  }, [active, modelServiceBrowserOpen, modelServicesCapability, queryClient]);

  useEffect(
    () => () => {
      void cancelOmniMindModelServicesAddIntentQueries(queryClient);
    },
    [queryClient],
  );

  useEffect(() => {
    if (modelServiceDetailReturnView !== "browser" || selectedModelServiceId === null) return;
    const queryKey = omniMindModelServicesQueryKeys.detail(selectedModelServiceId, "add_service");
    return () => {
      void queryClient.cancelQueries({ queryKey, exact: true });
    };
  }, [modelServiceDetailReturnView, queryClient, selectedModelServiceId]);
  const finishSetupIfReady = useCallback(
    async (
      service: OmniMindModelServiceDescriptor | null | undefined,
      completionController?: AbortController,
    ) => {
      const completionIsCurrent = () =>
        completionController === undefined ||
        (!completionController.signal.aborted &&
          modelServicePostLoginControllerRef.current === completionController);
      if (
        !completionIsCurrent() ||
        !setupCompletionArmedRef.current ||
        !service ||
        service.availableModelCount <= 0 ||
        (!onServicePrepared && !onSetupReady)
      ) {
        return false;
      }
      setupCompletionArmedRef.current = false;
      try {
        const detail = await queryClient.fetchQuery(
          omniMindModelServiceDetailQueryOptions({
            enabled: true,
            serviceId: service.serviceId,
            intent: "add_service",
          }),
        );
        if (!completionIsCurrent()) return false;
        const availableModels =
          detail.state === "ready" ? (detail.models?.filter((entry) => entry.available) ?? []) : [];
        const model = availableModels[0] ?? null;
        if (detail.state !== "ready" || !model) {
          setupCompletionArmedRef.current = true;
          return false;
        }
        if (!completionIsCurrent()) return false;
        setupTargetServiceIdRef.current = null;
        onServicePrepared?.({
          service: detail.service,
          models: availableModels,
        });
        onSetupReady?.({
          engine: "oa",
          model: `${service.serviceId}/${model.modelId}`,
        });
        return true;
      } catch {
        if (!completionIsCurrent()) return false;
        setupCompletionArmedRef.current = true;
        return false;
      }
    },
    [onServicePrepared, onSetupReady, queryClient],
  );

  useEffect(() => {
    const targetServiceId = setupTargetServiceIdRef.current;
    if (!targetServiceId) return;
    const readyService = [
      ...(modelServicesQuery.data?.services ?? []),
      ...(addModelServicesQuery.data?.services ?? []),
    ].find((service) => service.serviceId === targetServiceId && service.availableModelCount > 0);
    void finishSetupIfReady(readyService);
  }, [addModelServicesQuery.data?.services, finishSetupIfReady, modelServicesQuery.data?.services]);

  useEffect(() => {
    if (modelServicesTransport !== "open") {
      openReadRetryAttemptedRef.current = false;
      setConfirmedOpenReadFailure(false);
      return;
    }
    if (
      !modelServicesQuery.isError ||
      modelServicesQuery.isFetching ||
      openReadRetryAttemptedRef.current
    ) {
      return;
    }
    openReadRetryAttemptedRef.current = true;
    let cancelled = false;
    void modelServicesQuery.refetch().then((result) => {
      if (!cancelled) setConfirmedOpenReadFailure(result.isError);
    });
    return () => {
      cancelled = true;
    };
  }, [
    modelServicesQuery.isError,
    modelServicesQuery.isFetching,
    modelServicesQuery.refetch,
    modelServicesTransport,
  ]);

  const cancelCurrentAuthRequest = useCallback(() => {
    authRequestControllerRef.current?.abort();
    authRequestControllerRef.current = null;
    const requestId = authRequestIdRef.current;
    authRequestIdRef.current = null;
    return requestId
      ? ensureNativeApi()
          .omnimindModelServices.cancelLogin({ requestId })
          .catch(() => null)
      : null;
  }, []);

  useEffect(
    () => () => {
      void cancelCurrentAuthRequest();
      modelServicePostLoginControllerRef.current?.abort();
      modelServiceRefreshControllerRef.current?.abort();
      modelServiceApiKeyControllerRef.current?.abort();
      customTestControllerRef.current?.abort();
      customTestControllerRef.current = null;
      customDiscoveryControllerRef.current?.abort();
      customDiscoveryControllerRef.current = null;
    },
    [cancelCurrentAuthRequest],
  );

  useSettingsRestoreSignal(resetEpoch, () => {
    setupCompletionArmedRef.current = false;
    setupTargetServiceIdRef.current = null;
    setSelectedModelServiceId(null);
    setModelServiceBrowserOpen(false);
    setModelServiceSearch("");
    setModelServiceModelSearch("");
    setModelServiceDetailReturnView("overview");
    void cancelCurrentAuthRequest();
    modelServicePostLoginControllerRef.current?.abort();
    modelServiceRefreshControllerRef.current?.abort();
    customTestControllerRef.current?.abort();
    customTestControllerRef.current = null;
    customDiscoveryControllerRef.current?.abort();
    customDiscoveryControllerRef.current = null;
    setAuthDialog(null);
    setLogoutService(null);
    setRemoveCustomService(null);
    setCustomServiceEditor(null);
    customServiceEditorInitialFingerprintRef.current = null;
    setCustomServiceApiKeyVisible(false);
    setCustomModelDiscovery(EMPTY_CUSTOM_MODEL_DISCOVERY);
    setCustomServiceDiscardRequested(false);
    setPendingCustomServiceRiskAction(null);
    setConfirmedCustomServiceEndpoint(null);
    setConfirmedCustomServiceCommands(new Set());
    setModelServiceMutation(null);
    modelServiceApiKeyControllerRef.current?.abort();
    modelServiceApiKeyControllerRef.current = null;
    setRevealedModelServiceApiKey(null);
    setModelServiceApiKeyAccess(null);
    setModelServiceApiKeyError(null);
    setModelServiceNotice(null);
  });
  const selectedModelService = modelServiceDetailQuery.data?.service ?? null;
  const selectedCustomConfig =
    modelServiceDetailQuery.data?.state === "ready"
      ? modelServiceDetailQuery.data.customConfig
      : undefined;
  const projectedModelServiceModels =
    modelServiceDetailQuery.data?.state === "ready"
      ? modelServiceDetailQuery.data.models
      : undefined;
  const selectedModelServiceModelsKnown = projectedModelServiceModels !== undefined;
  const selectedModelServiceModels: ReadonlyArray<OmniMindModelServiceModel> =
    projectedModelServiceModels ?? [];
  const selectedModelServiceApiKeyMethod = selectedModelService?.authMethods.find(
    (method) => method.type === "api_key" && method.canLogin,
  );
  const selectedModelServiceOAuthMethod = selectedModelService?.authMethods.find(
    (method) => method.type === "oauth" && method.canLogin,
  );
  const modelServiceDisplayNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const service of [
      ...(modelServicesQuery.data?.services ?? []),
      ...(addModelServicesQuery.data?.services ?? []).filter(
        (service) => service.origin === "extension",
      ),
      ...(addModelServicesQuery.data?.connectableServices ??
        modelServicesQuery.data?.connectableServices ??
        []),
    ]) {
      counts.set(service.displayName, (counts.get(service.displayName) ?? 0) + 1);
    }
    return counts;
  }, [
    addModelServicesQuery.data?.connectableServices,
    addModelServicesQuery.data?.services,
    modelServicesQuery.data?.connectableServices,
    modelServicesQuery.data?.services,
  ]);

  const modelServiceInstanceLabel = useCallback(
    (service: OmniMindModelServiceDescriptor) =>
      (modelServiceDisplayNameCounts.get(service.displayName) ?? 0) > 1
        ? t("settings.modelServiceInstanceNamed", {
            name: service.displayName,
            id: stableModelServiceInstanceSuffix(service.serviceId),
          })
        : service.displayName,
    [modelServiceDisplayNameCounts, t],
  );

  const modelServiceAuthLabel = useCallback(
    (service: OmniMindModelServiceDescriptor) => {
      switch (service.authState) {
        case "configured":
          return t("settings.modelServiceConfigured");
        case "setup_required":
          return t("settings.modelServiceSetupRequired");
        case "refresh_required":
          return t("settings.modelServiceRefreshRequired");
        case "unavailable":
          return t("settings.modelServiceAuthUnavailable");
      }
    },
    [t],
  );

  const modelServiceCatalogLabel = useCallback(
    (service: OmniMindModelServiceDescriptor) => {
      switch (service.catalogState) {
        case "stale":
          return t("settings.modelServiceCatalogStale");
        case "error":
          return t("settings.modelServiceCatalogError");
        case "empty":
          return t("settings.modelServiceCatalogEmpty");
        case "ready":
          return t("settings.modelServiceCatalogReady");
      }
    },
    [t],
  );

  const modelServiceOriginLabel = useCallback(
    (service: OmniMindModelServiceDescriptor) => {
      switch (service.origin) {
        case "builtin":
          return t("settings.modelServiceOriginBuiltIn");
        case "models_json":
          return t("settings.modelServiceOriginModelsJson");
        case "extension":
          return t("settings.modelServiceOriginExtension");
        case "unknown":
          return t("settings.modelServiceOriginUnknown");
      }
    },
    [t],
  );

  const modelServiceCredentialSourceLabel = useCallback(
    (service: OmniMindModelServiceDescriptor) => {
      switch (service.authSource) {
        case "stored":
          return service.storedCredentialType === "oauth"
            ? t("settings.modelServiceCredentialSourceOAuth")
            : t("settings.modelServiceCredentialSourceStored");
        case "environment":
          return service.authEnvironmentVariables
            ? t("settings.modelServiceCredentialSourceEnvironmentNamed", {
                variable: service.authEnvironmentVariables.join(", "),
              })
            : t("settings.modelServiceCredentialSourceEnvironment");
        case "runtime":
          return t("settings.modelServiceCredentialSourceRuntime");
        case "models_json_key":
          return t("settings.modelServiceCredentialSourceImportedKey");
        case "models_json_command":
          return t("settings.modelServiceCredentialSourceCommand");
        case "fallback":
          return t("settings.modelServiceCredentialSourceFallback");
        case "unknown":
          return t("settings.modelServiceCredentialSourceUnknown");
        case null:
          return t("settings.modelServiceCredentialSourceNone");
      }
    },
    [t],
  );

  const invalidateModelServiceConsumers = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: omniMindModelServicesQueryKeys.all,
      }),
      queryClient.invalidateQueries({
        queryKey: engineDiscoveryQueryKeys.modelsForProvider("oa"),
      }),
    ]);
  }, [queryClient]);

  const refreshModelService = useCallback(
    async (
      service: OmniMindModelServiceDescriptor,
      options?: { readonly preserveNotice?: boolean },
    ) => {
      modelServiceRefreshControllerRef.current?.abort();
      const controller = new AbortController();
      modelServiceRefreshControllerRef.current = controller;
      setModelServiceMutation(`refresh:${service.serviceId}`);
      if (!options?.preserveNotice) setModelServiceNotice(null);
      try {
        const result = await ensureNativeApi().omnimindModelServices.refresh(
          {
            serviceId: service.serviceId,
            ...(service.origin === "extension" ? { origin: "extension" as const } : {}),
          },
          { signal: controller.signal },
        );
        if (controller.signal.aborted || modelServiceRefreshControllerRef.current !== controller) {
          return { state: "cancelled", service } as const;
        }
        setModelServiceNotice({
          tone: result.state === "success" ? "status" : "error",
          text:
            result.state === "success"
              ? t("settings.modelServiceRefreshComplete")
              : result.state === "unsupported"
                ? t("settings.modelServiceRefreshUnsupported")
                : result.state === "cancelled"
                  ? t("settings.modelServiceRefreshCancelled")
                  : t("settings.modelServiceRefreshFailed"),
        });
        if (result.state === "success") {
          await invalidateModelServiceConsumers();
          if (
            controller.signal.aborted ||
            modelServiceRefreshControllerRef.current !== controller
          ) {
            return { state: "cancelled", service } as const;
          }
        }
        return result;
      } catch {
        if (controller.signal.aborted || modelServiceRefreshControllerRef.current !== controller) {
          return { state: "cancelled", service } as const;
        }
        setModelServiceNotice({
          tone: "error",
          text: t("settings.modelServiceRefreshFailed"),
        });
        return { state: "failed", service } as const;
      } finally {
        if (modelServiceRefreshControllerRef.current === controller) {
          modelServiceRefreshControllerRef.current = null;
          setModelServiceMutation(null);
        }
      }
    },
    [invalidateModelServiceConsumers, t],
  );

  const applyAuthResult = useCallback(
    async (result: OmniMindModelServiceAuthResult, authType: "api_key" | "oauth") => {
      let authUrlOpenFailed = false;
      for (const event of result.events) {
        const externalUrl = authEventExternalUrl(event);
        if (!externalUrl) continue;
        const eventKey = `${result.requestId}:${externalUrl}`;
        if (openedAuthUrlsRef.current.has(eventKey)) continue;
        openedAuthUrlsRef.current.add(eventKey);
        try {
          await ensureNativeApi().shell.openExternal(externalUrl);
        } catch {
          authUrlOpenFailed = true;
        }
      }
      if (result.state === "pending") {
        authRequestIdRef.current = result.requestId;
        setAuthDialog((current) =>
          current
            ? (({ prompt: _prompt, ...rest }) => ({
                ...rest,
                requestId: result.requestId,
                events: result.events,
                busy: true,
                error: authUrlOpenFailed ? t("settings.modelServiceOAuthOpenFailed") : null,
                value: "",
              }))(current)
            : null,
        );
        return;
      }
      if (result.state === "prompt") {
        authRequestIdRef.current = result.requestId;
        setAuthDialog((current) =>
          current
            ? {
                ...current,
                requestId: result.requestId,
                prompt: result.prompt,
                events: result.events,
                busy: false,
                error: authUrlOpenFailed ? t("settings.modelServiceOAuthOpenFailed") : null,
                value: "",
              }
            : null,
        );
        return;
      }

      authRequestControllerRef.current = null;
      authRequestIdRef.current = null;
      if (result.state === "cancelled") {
        setAuthDialog(null);
        return;
      }
      if (result.state === "failed") {
        setAuthDialog((current) =>
          current
            ? {
                ...current,
                events: result.events,
                busy: false,
                error:
                  result.errorCode === "request_expired"
                    ? t("settings.modelServiceAuthExpired")
                    : current.authType === "oauth"
                      ? t("settings.modelServiceOAuthFailed")
                      : t("settings.modelServiceAuthFailed"),
              }
            : null,
        );
        return;
      }

      if (!("service" in result)) return;
      const completedService = result.service;
      modelServicePostLoginControllerRef.current?.abort();
      const completionController = new AbortController();
      modelServicePostLoginControllerRef.current = completionController;
      setAuthDialog(null);
      setModelServiceNotice({
        tone: result.state === "complete" ? "status" : "error",
        text:
          result.state === "auth_updated_catalog_failed"
            ? authType === "oauth"
              ? t("settings.modelServiceOAuthSavedCatalogFailed")
              : t("settings.modelServiceAuthSavedCatalogFailed")
            : result.state === "auth_updated_sync_failed"
              ? authType === "oauth"
                ? t("settings.modelServiceOAuthSavedSyncFailed")
                : t("settings.modelServiceAuthSavedSyncFailed")
              : authType === "oauth"
                ? t("settings.modelServiceOAuthSaved")
                : t("settings.modelServiceAuthSaved"),
      });
      await invalidateModelServiceConsumers();
      if (
        completionController.signal.aborted ||
        modelServicePostLoginControllerRef.current !== completionController
      ) {
        return;
      }
      const refreshResult =
        result.state === "complete" && completedService.supportsNetworkRefresh
          ? await refreshModelService(completedService, {
              preserveNotice: true,
            })
          : null;
      if (
        completionController.signal.aborted ||
        modelServicePostLoginControllerRef.current !== completionController
      ) {
        return;
      }
      if (
        result.state === "complete" &&
        (refreshResult === null ||
          refreshResult.state === "success" ||
          refreshResult.state === "failed" ||
          refreshResult.state === "unsupported")
      ) {
        setupCompletionArmedRef.current = true;
        setupTargetServiceIdRef.current = completedService.serviceId;
        await finishSetupIfReady(refreshResult?.service ?? completedService, completionController);
      }
      if (modelServicePostLoginControllerRef.current === completionController) {
        modelServicePostLoginControllerRef.current = null;
      }
    },
    [finishSetupIfReady, invalidateModelServiceConsumers, refreshModelService, t],
  );

  const consumeAuthResult = useCallback(
    async (
      initialResult: OmniMindModelServiceAuthResult,
      controller: AbortController,
      authType: "api_key" | "oauth",
    ) => {
      let result = initialResult;
      while (
        (result.state === "pending" || result.state === "prompt") &&
        !controller.signal.aborted
      ) {
        await applyAuthResult(result, authType);
        result = await ensureNativeApi().omnimindModelServices.pollLogin(
          {
            requestId: result.requestId,
            afterEventCount: result.events.length,
            ...(result.state === "prompt" ? { afterPromptId: result.prompt.promptId } : {}),
          },
          { signal: controller.signal },
        );
      }
      if (!controller.signal.aborted) {
        authRequestControllerRef.current = null;
        await applyAuthResult(result, authType);
      }
    },
    [applyAuthResult],
  );

  const beginModelServiceLogin = useCallback(
    async (
      service: OmniMindModelServiceDescriptor,
      authType: "api_key" | "oauth",
      oauthPromptMode: OmniMindModelServiceOAuthPromptMode = "provider_default",
    ) => {
      modelServiceApiKeyControllerRef.current?.abort();
      setRevealedModelServiceApiKey(null);
      setModelServiceApiKeyError(null);
      await cancelCurrentAuthRequest();
      const controller = new AbortController();
      authRequestControllerRef.current = controller;
      openedAuthUrlsRef.current.clear();
      setModelServiceNotice(null);
      setAuthDialog({
        serviceId: service.serviceId,
        serviceName: modelServiceInstanceLabel(service),
        authType,
        oauthPromptMode: authType === "oauth" ? oauthPromptMode : null,
        events: [],
        busy: true,
        error: null,
        value: "",
      });
      try {
        const result = await ensureNativeApi().omnimindModelServices.beginLogin(
          authType === "oauth"
            ? {
                serviceId: service.serviceId,
                authType,
                promptMode: oauthPromptMode,
                ...(service.origin === "extension" ? { origin: "extension" as const } : {}),
              }
            : {
                serviceId: service.serviceId,
                authType,
                ...(service.origin === "extension" ? { origin: "extension" as const } : {}),
              },
          { signal: controller.signal },
        );
        await consumeAuthResult(result, controller, authType);
      } catch {
        if (!controller.signal.aborted) {
          setAuthDialog((current) =>
            current
              ? {
                  ...current,
                  busy: false,
                  error:
                    authType === "oauth"
                      ? t("settings.modelServiceOAuthFailed")
                      : t("settings.modelServiceAuthFailed"),
                }
              : null,
          );
        }
      }
    },
    [cancelCurrentAuthRequest, consumeAuthResult, modelServiceInstanceLabel, t],
  );

  const answerAuthPrompt = useCallback(async () => {
    const current = authDialog;
    if (!current?.requestId || !current.prompt || current.busy || !current.value) return;
    authRequestControllerRef.current?.abort();
    const controller = new AbortController();
    authRequestControllerRef.current = controller;
    const value = current.value;
    setAuthDialog({ ...current, busy: true, error: null, value: "" });
    try {
      const result = await ensureNativeApi().omnimindModelServices.answerLogin(
        {
          requestId: current.requestId,
          promptId: current.prompt.promptId,
          value,
        },
        { signal: controller.signal },
      );
      await consumeAuthResult(result, controller, current.authType);
    } catch {
      if (!controller.signal.aborted) {
        setAuthDialog((dialog) =>
          dialog
            ? {
                ...dialog,
                busy: false,
                error:
                  dialog.authType === "oauth"
                    ? t("settings.modelServiceOAuthFailed")
                    : t("settings.modelServiceAuthFailed"),
              }
            : null,
        );
      }
    }
  }, [authDialog, consumeAuthResult, t]);

  const closeAuthDialog = useCallback(() => {
    const authType = authDialog?.authType ?? "api_key";
    const cancellation = cancelCurrentAuthRequest();
    setAuthDialog(null);
    void cancellation?.then((result) => {
      if (result && result.state !== "cancelled" && result.state !== "failed") {
        return applyAuthResult(result, authType);
      }
    });
  }, [applyAuthResult, authDialog?.authType, cancelCurrentAuthRequest]);

  const logoutModelService = useCallback(
    async (requestedService?: OmniMindModelServiceDescriptor) => {
      const service = requestedService ?? logoutService;
      if (!service) return;
      const isOAuth = service.storedCredentialType === "oauth";
      if (!isOAuth) {
        modelServiceApiKeyControllerRef.current?.abort();
        setRevealedModelServiceApiKey(null);
        setModelServiceApiKeyError(null);
      }
      setModelServiceMutation(`logout:${service.serviceId}`);
      setModelServiceNotice(null);
      try {
        const result = await ensureNativeApi().omnimindModelServices.logout({
          serviceId: service.serviceId,
          ...(service.origin === "extension" ? { origin: "extension" as const } : {}),
        });
        setLogoutService(null);
        modelServiceApiKeyControllerRef.current?.abort();
        setRevealedModelServiceApiKey(null);
        setModelServiceApiKeyError(null);
        setModelServiceNotice({
          tone: result.state === "complete" ? "status" : "error",
          text:
            result.state === "complete"
              ? isOAuth
                ? t("settings.modelServiceSignedOut")
                : t("settings.modelServiceCredentialRemoved")
              : isOAuth
                ? t("settings.modelServiceSignedOutSyncFailed")
                : t("settings.modelServiceCredentialRemovedSyncFailed"),
        });
        await invalidateModelServiceConsumers();
      } catch {
        setModelServiceNotice({
          tone: "error",
          text: isOAuth
            ? t("settings.modelServiceSignOutFailed")
            : t("settings.modelServiceCredentialRemoveFailed"),
        });
      } finally {
        setModelServiceMutation(null);
      }
    },
    [invalidateModelServiceConsumers, logoutService, t],
  );

  const readStoredModelServiceApiKey = useCallback(
    async (
      service: OmniMindModelServiceDescriptor,
      intent: "reveal" | "copy",
    ): Promise<string | null> => {
      modelServiceApiKeyControllerRef.current?.abort();
      const controller = new AbortController();
      modelServiceApiKeyControllerRef.current = controller;
      setModelServiceApiKeyAccess(intent);
      setModelServiceApiKeyError(null);
      try {
        const result = await ensureNativeApi().omnimindModelServices.revealApiKey(
          { serviceId: service.serviceId },
          { signal: controller.signal },
        );
        if (controller.signal.aborted || modelServiceApiKeyControllerRef.current !== controller) {
          return null;
        }
        if (result.state !== "ready") {
          setRevealedModelServiceApiKey(null);
          setModelServiceApiKeyError(
            result.reason === "not_stored_api_key"
              ? t("settings.modelServiceApiKeyNoLongerStored")
              : t("settings.modelServiceApiKeyRevealFailed"),
          );
          return null;
        }
        if (intent === "reveal") {
          setRevealedModelServiceApiKey({
            serviceId: service.serviceId,
            value: result.apiKey,
          });
        }
        return result.apiKey;
      } catch {
        if (controller.signal.aborted || modelServiceApiKeyControllerRef.current !== controller) {
          return null;
        }
        setRevealedModelServiceApiKey(null);
        setModelServiceApiKeyError(t("settings.modelServiceApiKeyRevealFailed"));
        return null;
      } finally {
        if (modelServiceApiKeyControllerRef.current === controller) {
          modelServiceApiKeyControllerRef.current = null;
          setModelServiceApiKeyAccess(null);
        }
      }
    },
    [t],
  );

  useEffect(() => {
    modelServiceApiKeyControllerRef.current?.abort();
    modelServiceApiKeyControllerRef.current = null;
    setRevealedModelServiceApiKey(null);
    setModelServiceApiKeyAccess(null);
    setModelServiceApiKeyError(null);
  }, [selectedModelServiceId]);

  const updateCustomServiceEditor = useCallback(
    (update: (current: CustomModelServiceEditorState) => CustomModelServiceEditorState) => {
      setCustomServiceEditor((current) => {
        if (!current) return current;
        const next = update(current);
        return { ...next, testedFingerprint: null, testState: "idle" };
      });
      customDiscoveryControllerRef.current?.abort();
      customDiscoveryControllerRef.current = null;
      setCustomModelDiscovery(EMPTY_CUSTOM_MODEL_DISCOVERY);
      setModelServiceNotice(null);
    },
    [],
  );

  const openCustomServiceEditor = useCallback(
    (config?: NonNullable<typeof selectedCustomConfig>) => {
      const nextEditor: CustomModelServiceEditorState = config
        ? {
            mode: "edit",
            serviceId: config.serviceId,
            displayName: config.displayName,
            api: config.api,
            baseUrl: config.baseUrl,
            authHeader: config.authHeader,
            credentialMode: "preserve",
            apiKey: "",
            environmentVariableName: "",
            credentialCommand: "",
            existingAuthSource: selectedModelService?.authSource ?? null,
            headers: customHeaderEditorEntries(config.configuredHeaders),
            models: config.models.map((model) => {
              const { configuredHeaders, ...modelFields } = model;
              return {
                ...modelFields,
                headers: customHeaderEditorEntries(configuredHeaders),
                ...(model.input ? { input: [...model.input] } : {}),
                ...(model.thinkingLevelMap
                  ? { thinkingLevelMap: { ...model.thinkingLevelMap } }
                  : {}),
                ...(model.cost
                  ? {
                      cost: {
                        ...model.cost,
                        ...(model.cost.tiers
                          ? {
                              tiers: model.cost.tiers.map((tier) => ({
                                ...tier,
                              })),
                            }
                          : {}),
                      },
                    }
                  : {}),
                ...(model.compat ? { compat: { ...model.compat } } : {}),
              };
            }),
            testedFingerprint: null,
            testState: "idle",
          }
        : createCustomModelServiceEditor();
      setModelServiceNotice(null);
      customServiceEditorInitialFingerprintRef.current = customModelServiceFingerprint(nextEditor);
      setCustomServiceApiKeyVisible(false);
      setCustomModelDiscovery(EMPTY_CUSTOM_MODEL_DISCOVERY);
      setCustomServiceDiscardRequested(false);
      setPendingCustomServiceRiskAction(null);
      setConfirmedCustomServiceEndpoint(null);
      setConfirmedCustomServiceCommands(new Set());
      setCustomServiceEditor(nextEditor);
    },
    [selectedModelService?.authSource],
  );

  const closeCustomServiceEditor = useCallback(() => {
    customTestControllerRef.current?.abort();
    customTestControllerRef.current = null;
    customDiscoveryControllerRef.current?.abort();
    customDiscoveryControllerRef.current = null;
    customServiceEditorInitialFingerprintRef.current = null;
    setCustomServiceEditor(null);
    setCustomServiceApiKeyVisible(false);
    setCustomModelDiscovery(EMPTY_CUSTOM_MODEL_DISCOVERY);
    setCustomServiceDiscardRequested(false);
    setPendingCustomServiceRiskAction(null);
    setConfirmedCustomServiceEndpoint(null);
    setConfirmedCustomServiceCommands(new Set());
  }, []);

  const requestCloseCustomServiceEditor = useCallback(() => {
    if (customServiceEditorDirty) {
      setCustomServiceDiscardRequested(true);
      return;
    }
    closeCustomServiceEditor();
  }, [closeCustomServiceEditor, customServiceEditorDirty]);

  const testCustomService = useCallback(async () => {
    const editor = customServiceEditor;
    if (!editor) return;
    const credential = customModelServiceCredentialInput(editor);
    if (!credential) return;
    customTestControllerRef.current?.abort();
    const controller = new AbortController();
    customTestControllerRef.current = controller;
    const fingerprint = customModelServiceFingerprint(editor);
    setCustomServiceEditor({ ...editor, testState: "testing" });
    setModelServiceNotice(null);
    try {
      const result = await ensureNativeApi().omnimindModelServices.testCustom(
        {
          config: customModelServiceConfig(editor),
          credential,
          testModelId: editor.models[0]?.modelId.trim() ?? "",
        },
        { signal: controller.signal },
      );
      if (result.state === "success") {
        setCustomServiceEditor((current) =>
          current && customModelServiceFingerprint(current) === fingerprint
            ? {
                ...current,
                testState: "success",
                testedFingerprint: fingerprint,
              }
            : current,
        );
        setModelServiceNotice({
          tone: "status",
          text: t("settings.customApiTestSucceeded"),
        });
      } else {
        setCustomServiceEditor((current) =>
          current && customModelServiceFingerprint(current) === fingerprint
            ? { ...current, testState: "failed", testedFingerprint: null }
            : current,
        );
        setModelServiceNotice({
          tone: "error",
          text: t(`settings.customApiTestFailed.${result.errorCode}`),
        });
      }
    } catch {
      if (controller.signal.aborted) return;
      setCustomServiceEditor((current) =>
        current && customModelServiceFingerprint(current) === fingerprint
          ? { ...current, testState: "failed", testedFingerprint: null }
          : current,
      );
      setModelServiceNotice({
        tone: "error",
        text: t("settings.customApiTestFailed.connection_failed"),
      });
    } finally {
      if (customTestControllerRef.current === controller) customTestControllerRef.current = null;
    }
  }, [customServiceEditor, t]);

  const cancelCustomServiceTest = useCallback(() => {
    customTestControllerRef.current?.abort();
    customTestControllerRef.current = null;
    setCustomServiceEditor((current) =>
      current?.testState === "testing"
        ? { ...current, testState: "idle", testedFingerprint: null }
        : current,
    );
    setModelServiceNotice(null);
  }, []);

  const discoverCustomServiceModels = useCallback(async () => {
    const editor = customServiceEditor;
    if (!editor) return;
    const credential = customModelServiceCredentialInput(editor);
    if (!credential) return;
    customDiscoveryControllerRef.current?.abort();
    const controller = new AbortController();
    customDiscoveryControllerRef.current = controller;
    setCustomModelDiscovery({
      status: "loading",
      models: [],
      selectedModelIds: new Set(),
    });
    setModelServiceNotice(null);
    try {
      const result = await ensureNativeApi().omnimindModelServices.discoverCustom(
        {
          config: customModelServiceDiscoveryConfig(editor),
          credential,
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      if (result.state === "success") {
        setCustomModelDiscovery({
          status: "success",
          models: result.models,
          selectedModelIds: new Set(result.models.map((model) => model.modelId)),
        });
        setModelServiceNotice({
          tone: "status",
          text: t("settings.customApiDiscoverySucceeded", {
            count: result.models.length,
          }),
        });
      } else if (result.state !== "cancelled") {
        setCustomModelDiscovery(EMPTY_CUSTOM_MODEL_DISCOVERY);
        setModelServiceNotice({
          tone: "error",
          text: t(`settings.customApiDiscoveryFailed.${result.errorCode}`),
        });
      } else {
        setCustomModelDiscovery(EMPTY_CUSTOM_MODEL_DISCOVERY);
      }
    } catch {
      if (controller.signal.aborted) return;
      setCustomModelDiscovery(EMPTY_CUSTOM_MODEL_DISCOVERY);
      setModelServiceNotice({
        tone: "error",
        text: t("settings.customApiDiscoveryFailed.connection_failed"),
      });
    } finally {
      if (customDiscoveryControllerRef.current === controller) {
        customDiscoveryControllerRef.current = null;
      }
    }
  }, [customServiceEditor, t]);

  const cancelCustomModelDiscovery = useCallback(() => {
    customDiscoveryControllerRef.current?.abort();
    customDiscoveryControllerRef.current = null;
    setCustomModelDiscovery(EMPTY_CUSTOM_MODEL_DISCOVERY);
    setModelServiceNotice(null);
  }, []);

  const addSelectedDiscoveredModels = useCallback(() => {
    if (customModelDiscovery.status !== "success") return;
    const selectedModels = customModelDiscovery.models.filter((model) =>
      customModelDiscovery.selectedModelIds.has(model.modelId),
    );
    if (selectedModels.length === 0) return;
    setCustomServiceEditor((current) => {
      if (!current) return current;
      const existingIds = new Set(current.models.map((model) => model.modelId));
      const retainedModels =
        current.models.length === 1 && current.models[0]?.modelId.trim() === ""
          ? []
          : current.models;
      return {
        ...current,
        models: [
          ...retainedModels,
          ...selectedModels
            .filter((model) => !existingIds.has(model.modelId))
            .map((model) => ({
              ...DEFAULT_CUSTOM_MODEL,
              modelId: model.modelId,
              displayName: model.displayName,
            })),
        ],
        testedFingerprint: null,
        testState: "idle",
      };
    });
    setCustomModelDiscovery(EMPTY_CUSTOM_MODEL_DISCOVERY);
    setModelServiceNotice(null);
  }, [customModelDiscovery]);

  const saveCustomService = useCallback(async () => {
    const editor = customServiceEditor;
    if (!editor || editor.testedFingerprint !== customModelServiceFingerprint(editor)) return;
    const credential = customModelServiceCredentialInput(editor);
    if (!credential) return;
    setModelServiceMutation("custom:save");
    setModelServiceNotice(null);
    try {
      const result = await ensureNativeApi().omnimindModelServices.saveCustom({
        config: customModelServiceConfig(editor),
        credential,
      });
      const completed =
        result.state === "complete" || result.state === "complete_with_sync_warning";
      if (completed) {
        setupCompletionArmedRef.current = true;
        setupTargetServiceIdRef.current = result.service?.serviceId ?? editor.serviceId;
      }
      await invalidateModelServiceConsumers();
      if (!completed) {
        setModelServiceNotice({
          tone: "error",
          text:
            result.state === "credential_unchanged"
              ? t("settings.customApiCredentialUnchanged")
              : result.state === "credential_removed_retry_required"
                ? t("settings.customApiCredentialRemovedRetryRequired")
                : result.state === "config_saved_auth_failed"
                  ? t("settings.customApiSavedAuthFailed")
                  : t("settings.customApiSavedSyncFailed"),
        });
        return;
      }
      closeCustomServiceEditor();
      setModelServiceNotice({
        tone: result.state === "complete" ? "status" : "error",
        text:
          result.state === "complete"
            ? t("settings.customApiSaved")
            : t("settings.customApiSavedSyncWarning"),
      });
      const setupCompleted = await finishSetupIfReady(result.service);
      if (!setupCompleted) {
        setModelServiceBrowserOpen(false);
        if (result.service) {
          setModelServiceDetailReturnView("overview");
          setSelectedModelServiceId(result.service.serviceId);
        }
      }
    } catch {
      setModelServiceNotice({
        tone: "error",
        text: t("settings.customApiSaveFailed"),
      });
    } finally {
      setModelServiceMutation(null);
    }
  }, [
    closeCustomServiceEditor,
    customServiceEditor,
    finishSetupIfReady,
    invalidateModelServiceConsumers,
    t,
  ]);

  const requestCustomServiceAction = useCallback(
    (action: CustomModelServiceAction) => {
      const editor = customServiceEditor;
      if (!editor) return;
      const endpointNeedsConfirmation =
        confirmedCustomServiceEndpoint !== customModelServiceRiskFingerprint(editor);
      const commandFingerprint = customModelServiceCommandFingerprint(editor, action);
      const commandNeedsConfirmation =
        commandFingerprint !== null && !confirmedCustomServiceCommands.has(commandFingerprint);
      if (endpointNeedsConfirmation || commandNeedsConfirmation) {
        setPendingCustomServiceRiskAction(action);
        return;
      }
      if (action === "discover") void discoverCustomServiceModels();
      else if (action === "test") void testCustomService();
      else void saveCustomService();
    },
    [
      confirmedCustomServiceEndpoint,
      confirmedCustomServiceCommands,
      customServiceEditor,
      discoverCustomServiceModels,
      saveCustomService,
      testCustomService,
    ],
  );

  const confirmCustomServiceRisk = useCallback(() => {
    const action = pendingCustomServiceRiskAction;
    const editor = customServiceEditor;
    if (!action || !editor) return;
    setConfirmedCustomServiceEndpoint(customModelServiceRiskFingerprint(editor));
    const commandFingerprint = customModelServiceCommandFingerprint(editor, action);
    if (commandFingerprint) {
      setConfirmedCustomServiceCommands((current) => new Set(current).add(commandFingerprint));
    }
    setPendingCustomServiceRiskAction(null);
    if (action === "discover") void discoverCustomServiceModels();
    else if (action === "test") void testCustomService();
    else void saveCustomService();
  }, [
    customServiceEditor,
    discoverCustomServiceModels,
    pendingCustomServiceRiskAction,
    saveCustomService,
    testCustomService,
  ]);

  const cancelCustomServiceDiscard = useCallback(() => {
    setCustomServiceDiscardRequested(false);
    if (customServiceNavigationBlocker.status === "blocked") {
      customServiceNavigationBlocker.reset();
    }
  }, [customServiceNavigationBlocker]);

  const confirmCustomServiceDiscard = useCallback(() => {
    const proceed =
      customServiceNavigationBlocker.status === "blocked"
        ? customServiceNavigationBlocker.proceed
        : null;
    closeCustomServiceEditor();
    proceed?.();
  }, [closeCustomServiceEditor, customServiceNavigationBlocker]);

  const confirmRemoveCustomService = useCallback(async () => {
    const service = removeCustomService;
    if (!service) return;
    setModelServiceMutation(`custom:remove:${service.serviceId}`);
    setModelServiceNotice(null);
    try {
      const result = await ensureNativeApi().omnimindModelServices.removeCustom({
        serviceId: service.serviceId,
      });
      if (result.state === "blocked_active_operation") {
        setModelServiceNotice({
          tone: "error",
          text: t("settings.customApiRemoveBlockedActive"),
        });
        return;
      }
      setRemoveCustomService(null);
      setSelectedModelServiceId(null);
      setModelServiceBrowserOpen(false);
      await invalidateModelServiceConsumers();
      setModelServiceNotice({
        tone: result.state === "complete" ? "status" : "error",
        text:
          result.state === "complete"
            ? t("settings.customApiRemoved")
            : t("settings.customApiRemovedSyncWarning"),
      });
    } catch {
      setModelServiceNotice({
        tone: "error",
        text: t("settings.customApiRemoveFailed"),
      });
    } finally {
      setModelServiceMutation(null);
    }
  }, [invalidateModelServiceConsumers, removeCustomService, t]);

  const connectableModelServices = useMemo(() => {
    const candidates = [
      ...(addModelServicesQuery.data?.connectableServices ??
        modelServicesQuery.data?.connectableServices ??
        []),
      ...(addModelServicesQuery.data?.services ?? []).filter(
        (service) => service.origin === "extension",
      ),
    ];
    return [...new Map(candidates.map((service) => [service.serviceId, service])).values()];
  }, [
    addModelServicesQuery.data?.connectableServices,
    addModelServicesQuery.data?.services,
    modelServicesQuery.data?.connectableServices,
  ]);
  const configuredModelServices = modelServicesQuery.data?.services ?? [];
  const customApiCapability =
    modelServicesQuery.data?.state === "ready" || modelServicesQuery.data?.state === "empty"
      ? modelServicesQuery.data.customApiConfiguration
      : undefined;
  const canAddModelService =
    modelServicesQuery.data?.state === "ready" || modelServicesQuery.data?.state === "empty";
  const filteredConnectableModelServices = useMemo(() => {
    const query = modelServiceSearch.trim().toLocaleLowerCase();
    if (!query) return connectableModelServices;
    return connectableModelServices.filter((service) =>
      [
        modelServiceInstanceLabel(service),
        service.serviceId,
        service.providerId,
        ...service.authMethods.map((method) => method.label),
      ].some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [connectableModelServices, modelServiceInstanceLabel, modelServiceSearch]);
  const modelServiceSearchActive = modelServiceSearch.trim().length > 0;
  const preferredConnectableModelServices = useMemo(
    () =>
      modelServiceSearchActive
        ? []
        : filteredConnectableModelServices
            .filter((service) => PREFERRED_MODEL_SERVICE_RANK.has(service.serviceId))
            .toSorted(
              (left, right) =>
                (PREFERRED_MODEL_SERVICE_RANK.get(left.serviceId) ?? Number.MAX_SAFE_INTEGER) -
                (PREFERRED_MODEL_SERVICE_RANK.get(right.serviceId) ?? Number.MAX_SAFE_INTEGER),
            ),
    [filteredConnectableModelServices, modelServiceSearchActive],
  );
  const otherConnectableModelServices = useMemo(
    () =>
      modelServiceSearchActive
        ? filteredConnectableModelServices
        : filteredConnectableModelServices.filter(
            (service) => !PREFERRED_MODEL_SERVICE_RANK.has(service.serviceId),
          ),
    [filteredConnectableModelServices, modelServiceSearchActive],
  );
  const orderedConnectableModelServices = useMemo(
    () => [...preferredConnectableModelServices, ...otherConnectableModelServices],
    [otherConnectableModelServices, preferredConnectableModelServices],
  );
  const modelServiceAuthMethodsLabel = useCallback(
    (service: OmniMindModelServiceDescriptor) => {
      const labels = [
        ...new Set(
          service.authMethods
            .filter((method) => method.canLogin)
            .map((method) =>
              method.type === "api_key"
                ? t("settings.modelServiceAuthMethodApiKey")
                : t("settings.modelServiceAuthMethodSignIn"),
            ),
        ),
      ];
      return labels.length > 0 ? labels.join(" · ") : t("settings.modelServiceNoInteractiveAuth");
    },
    [t],
  );

  const filteredSelectedModelServiceModels = useMemo(() => {
    const query = modelServiceModelSearch.trim().toLocaleLowerCase(locale);
    if (!query) return selectedModelServiceModels;
    return selectedModelServiceModels.filter((model) =>
      [model.displayName, model.modelId].some((value) =>
        value.toLocaleLowerCase(locale).includes(query),
      ),
    );
  }, [locale, modelServiceModelSearch, selectedModelServiceModels]);

  const modelContextLabel = useCallback(
    (model: OmniMindModelServiceModel) =>
      t("settings.modelServiceContextWindow", {
        count: new Intl.NumberFormat(locale, {
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(model.contextWindow),
      }),
    [locale, t],
  );

  const openModelServiceDetails = useCallback(
    (serviceId: string, returnView: "overview" | "browser") => {
      if (returnView === "browser") {
        modelServiceBrowserRestoreRef.current = {
          serviceId,
          scrollTop: modelServiceBrowserListRef.current?.scrollTop ?? 0,
        };
      }
      setModelServiceDetailReturnView(returnView);
      setModelServiceModelSearch("");
      modelServiceDetailShouldFocusRef.current = true;
      setSelectedModelServiceId(serviceId);
    },
    [],
  );

  const openModelServiceBrowser = useCallback(() => {
    modelServiceBrowserRestoreRef.current = null;
    setModelServiceSearch("");
    setModelServiceBrowserOpen(true);
  }, []);

  const closeModelServiceBrowser = useCallback(() => {
    setupCompletionArmedRef.current = false;
    setupTargetServiceIdRef.current = null;
    modelServicePostLoginControllerRef.current?.abort();
    modelServiceRefreshControllerRef.current?.abort();
    setModelServiceBrowserOpen(false);
    requestAnimationFrame(() => addModelServiceButtonRef.current?.focus());
  }, []);

  const closeModelServiceDetails = useCallback(() => {
    setSelectedModelServiceId(null);
    setModelServiceModelSearch("");
    setModelServiceBrowserOpen(modelServiceDetailReturnView === "browser");
  }, [modelServiceDetailReturnView]);

  useEffect(() => {
    if (selectedModelServiceId || !modelServiceBrowserOpen) return;
    const restore = modelServiceBrowserRestoreRef.current;
    if (!restore) return;
    const frame = requestAnimationFrame(() => {
      if (modelServiceBrowserListRef.current) {
        modelServiceBrowserListRef.current.scrollTop = restore.scrollTop;
      }
      modelServiceBrowserItemRefs.current.get(restore.serviceId)?.focus();
      modelServiceBrowserRestoreRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [modelServiceBrowserOpen, selectedModelServiceId]);

  useEffect(() => {
    if (!selectedModelServiceId || !modelServiceDetailShouldFocusRef.current) return;
    const frame = requestAnimationFrame(() => {
      modelServiceDetailBackButtonRef.current?.focus();
      modelServiceDetailShouldFocusRef.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedModelServiceId]);

  const customServiceFormValid = useMemo(() => {
    if (!customServiceEditor) return false;
    const config = customModelServiceConfig(customServiceEditor);
    return (
      config.displayName.length > 0 &&
      /^https?:\/\/\S+$/iu.test(config.baseUrl) &&
      config.models.length > 0 &&
      config.models.every((model) => model.modelId.length > 0) &&
      customHeaderEntriesValid(customServiceEditor.headers) &&
      customServiceEditor.models.every((model) => customHeaderEntriesValid(model.headers)) &&
      customModelServiceCredentialInput(customServiceEditor) !== null
    );
  }, [customServiceEditor]);
  const customServiceDiscoveryFormValid = useMemo(() => {
    if (!customServiceEditor) return false;
    const config = customModelServiceDiscoveryConfig(customServiceEditor);
    return (
      config.displayName.length > 0 &&
      /^https?:\/\/\S+$/iu.test(config.baseUrl) &&
      customHeaderEntriesValid(customServiceEditor.headers) &&
      customModelServiceCredentialInput(customServiceEditor) !== null
    );
  }, [customServiceEditor]);
  const pendingCustomServiceRiskNeedsEndpoint =
    pendingCustomServiceRiskAction !== null &&
    customServiceEditor !== null &&
    confirmedCustomServiceEndpoint !== customModelServiceRiskFingerprint(customServiceEditor);
  const pendingCustomServiceRiskNeedsCommand =
    pendingCustomServiceRiskAction !== null &&
    customServiceEditor !== null &&
    customModelServiceCommandFingerprint(customServiceEditor, pendingCustomServiceRiskAction) !==
      null &&
    !confirmedCustomServiceCommands.has(
      customModelServiceCommandFingerprint(customServiceEditor, pendingCustomServiceRiskAction) ??
        "",
    );

  return (
    <div className="space-y-6">
      {!selectedModelServiceId && !modelServiceBrowserOpen && !customServiceEditor ? (
        <SettingsSectionShell
          title={t("settings.configuredModelServices")}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {modelServicesQuery.isFetching && !modelServicesQuery.isPending ? (
                <span role="status" className="text-xs text-muted-foreground">
                  {t("settings.modelServicesChecking")}
                </span>
              ) : null}
              {canAddModelService && configuredModelServices.length > 0 ? (
                <Button ref={addModelServiceButtonRef} size="sm" onClick={openModelServiceBrowser}>
                  <PlusIcon aria-hidden="true" />
                  {t("settings.addModelService")}
                </Button>
              ) : null}
            </div>
          }
        >
          <div
            aria-live="polite"
            aria-busy={modelServicesCapability === null || modelServicesQuery.isPending}
          >
            {modelServicesCapability === null ? (
              <SettingsEmptyState layout="status">
                {t("settings.modelServicesCapabilityChecking")}
              </SettingsEmptyState>
            ) : modelServicesCapability === false ? (
              <SettingsEmptyState layout="status" tone="destructive">
                <div role="alert">{t("settings.modelServicesServerUpdateRequired")}</div>
              </SettingsEmptyState>
            ) : modelServicesQuery.isPending ? (
              <SettingsEmptyState layout="status">
                {t("settings.modelServicesLoading")}
              </SettingsEmptyState>
            ) : modelServicesQuery.isError &&
              (modelServicesTransport !== "open" || confirmedOpenReadFailure) ? (
              <SettingsEmptyState layout="status" tone="destructive">
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
                  <span>{t("settings.modelServicesConnectionUnavailable")}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void modelServicesQuery.refetch()}
                  >
                    {t("common.tryAgain")}
                  </Button>
                </div>
              </SettingsEmptyState>
            ) : modelServicesQuery.isError ? (
              <SettingsEmptyState layout="status">
                {t("settings.modelServicesLoading")}
              </SettingsEmptyState>
            ) : modelServicesQuery.data?.state === "error" ? (
              <SettingsEmptyState layout="status" tone="destructive">
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
                  <span>{t("settings.modelServicesUnavailable")}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void modelServicesQuery.refetch()}
                  >
                    {t("common.tryAgain")}
                  </Button>
                </div>
              </SettingsEmptyState>
            ) : modelServicesQuery.data?.services.length ? (
              <SettingsCard>
                {modelServicesQuery.data.services.map((service) => {
                  const detailOpen = selectedModelServiceId === service.serviceId;
                  const instanceLabel = modelServiceInstanceLabel(service);
                  return (
                    <SettingsListRow
                      key={service.serviceId}
                      title={
                        <span className="flex min-w-0 items-center gap-2.5">
                          <ModelServiceIcon
                            serviceId={service.serviceId}
                            origin={service.origin}
                            className="size-6"
                          />
                          <span className="truncate">{instanceLabel}</span>
                        </span>
                      }
                      description={
                        <span>
                          {modelServiceAuthLabel(service)}
                          {" · "}
                          {t("settings.modelServiceModelCounts", {
                            known: service.knownModelCount,
                            available: service.availableModelCount,
                          })}
                          {service.catalogState === "ready"
                            ? null
                            : ` · ${modelServiceCatalogLabel(service)}`}
                        </span>
                      }
                      actions={
                        <Button
                          size="sm"
                          variant="outline"
                          aria-expanded={detailOpen}
                          aria-controls={modelServiceDetailRegionId}
                          aria-label={
                            detailOpen
                              ? t("settings.hideDetailsNamed", {
                                  name: instanceLabel,
                                })
                              : t("settings.viewDetailsNamed", {
                                  name: instanceLabel,
                                })
                          }
                          onClick={() => openModelServiceDetails(service.serviceId, "overview")}
                        >
                          {detailOpen ? t("settings.hideDetails") : t("settings.viewDetails")}
                        </Button>
                      }
                    />
                  );
                })}
              </SettingsCard>
            ) : (
              <SettingsEmptyState>
                <p className="font-medium text-foreground">{t("settings.noModelServices")}</p>
                <p className="mt-1">{t("settings.noModelServicesDescription")}</p>
                {canAddModelService ? (
                  <Button
                    ref={addModelServiceButtonRef}
                    className="mt-4"
                    onClick={openModelServiceBrowser}
                  >
                    <PlusIcon aria-hidden="true" />
                    {t("settings.addModelService")}
                  </Button>
                ) : null}
              </SettingsEmptyState>
            )}
          </div>
        </SettingsSectionShell>
      ) : null}

      {!selectedModelServiceId && modelServiceBrowserOpen && !customServiceEditor ? (
        <div data-model-service-presentation={presentation}>
          <SettingsSectionShell
            title={t("settings.addModelService")}
            action={
              presentation === "settings" ? (
                <Button size="sm" variant="ghost" onClick={closeModelServiceBrowser}>
                  <ArrowLeftIcon aria-hidden="true" />
                  {t("common.back")}
                </Button>
              ) : null
            }
          >
            <div
              className="space-y-4"
              onKeyDown={(event) => {
                if (event.key !== "Escape" || event.defaultPrevented) return;
                event.preventDefault();
                if (modelServiceSearch.length > 0) {
                  setModelServiceSearch("");
                  modelServiceSearchInputRef.current?.focus();
                  return;
                }
                closeModelServiceBrowser();
              }}
            >
              <div>
                <p className="mb-3 text-sm text-muted-foreground">
                  {t("settings.chooseModelServiceDescription")}
                </p>
                <SearchInput
                  ref={modelServiceSearchInputRef}
                  autoFocus
                  value={modelServiceSearch}
                  onChange={(event) => setModelServiceSearch(event.target.value)}
                  placeholder={t("settings.searchModelServices")}
                  aria-label={t("settings.searchModelServices")}
                  spellCheck={false}
                />
              </div>
              {addModelServicesQuery.isPending ? (
                <div role="status" className="text-sm text-muted-foreground">
                  {t("settings.modelServiceSourcesChecking")}
                </div>
              ) : addModelServicesQuery.isError ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  <span>{t("settings.modelServiceSourcesUnavailable")}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void addModelServicesQuery.refetch()}
                  >
                    {t("common.tryAgain")}
                  </Button>
                </div>
              ) : addModelServicesQuery.data?.state !== "error" &&
                (addModelServicesQuery.data?.extensionProjectionState === "partial" ||
                  addModelServicesQuery.data?.extensionProjectionState === "unavailable") ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                >
                  <span>
                    {addModelServicesQuery.data?.extensionProjectionState === "partial"
                      ? t("settings.modelServiceSourcesPartial")
                      : t("settings.modelServiceSourcesUnavailable")}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void addModelServicesQuery.refetch()}
                  >
                    {t("common.tryAgain")}
                  </Button>
                </div>
              ) : null}
              {filteredConnectableModelServices.length > 0 ? (
                presentation === "first-run" ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between px-0.5 text-[11px] text-muted-foreground">
                      <strong className="font-semibold text-foreground/70">
                        {t("onboarding.firstRun.servicesAvailable")}
                      </strong>
                      <span>
                        {t("onboarding.firstRun.serviceCount", {
                          count: filteredConnectableModelServices.length,
                        })}
                      </span>
                    </div>
                    <div
                      ref={modelServiceBrowserListRef}
                      data-model-service-results="first-run-grid"
                      role="region"
                      aria-label={t("settings.connectableModelServices")}
                      tabIndex={0}
                      className="grid max-h-[min(184px,calc(100vh-22rem))] grid-cols-2 gap-2 overflow-y-auto overscroll-contain pr-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      {orderedConnectableModelServices.map((service) => {
                        const instanceLabel = modelServiceInstanceLabel(service);
                        return (
                          <button
                            key={service.serviceId}
                            ref={(node) => {
                              if (node)
                                modelServiceBrowserItemRefs.current.set(service.serviceId, node);
                              else modelServiceBrowserItemRefs.current.delete(service.serviceId);
                            }}
                            type="button"
                            className="group flex min-h-[54px] min-w-0 items-center gap-2.5 rounded-[13px] border border-border bg-background px-3 py-2.5 text-left outline-none transition-colors hover:border-foreground/25 hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none"
                            data-model-service-result={service.serviceId}
                            aria-label={t("settings.connectModelServiceNamed", {
                              name: instanceLabel,
                            })}
                            onClick={() => openModelServiceDetails(service.serviceId, "browser")}
                          >
                            <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] border border-border/70 bg-muted/30">
                              <ModelServiceIcon
                                serviceId={service.serviceId}
                                origin={service.origin}
                                className="size-[21px]"
                              />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[length:var(--app-font-size-ui-sm,13px)] font-medium text-foreground">
                                {instanceLabel}
                              </span>
                              <span className="mt-0.5 block truncate text-[length:var(--app-font-size-ui-2xs,11px)] text-muted-foreground">
                                {modelServiceAuthMethodsLabel(service)}
                              </span>
                            </span>
                            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/55" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div
                    ref={modelServiceBrowserListRef}
                    data-model-service-results="compact-list"
                    className="max-h-[min(24rem,calc(100vh-18rem))] overflow-y-auto rounded-xl border border-border bg-background"
                  >
                    {[
                      ...(preferredConnectableModelServices.length > 0
                        ? [
                            {
                              key: "recommended",
                              label: t("settings.recommendedModelServices"),
                              services: preferredConnectableModelServices,
                            },
                          ]
                        : []),
                      ...(otherConnectableModelServices.length > 0
                        ? [
                            {
                              key: modelServiceSearchActive ? "results" : "other",
                              label: modelServiceSearchActive
                                ? null
                                : t("settings.otherModelServices"),
                              services: otherConnectableModelServices,
                            },
                          ]
                        : []),
                    ].map((group) => (
                      <section key={group.key} aria-label={group.label ?? undefined}>
                        {group.label ? (
                          <h3 className="border-b border-border/70 bg-muted/35 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {group.label}
                          </h3>
                        ) : null}
                        <ul className="list-none divide-y divide-border/70">
                          {group.services.map((service) => {
                            const instanceLabel = modelServiceInstanceLabel(service);
                            return (
                              <li key={service.serviceId}>
                                <button
                                  ref={(node) => {
                                    if (node)
                                      modelServiceBrowserItemRefs.current.set(
                                        service.serviceId,
                                        node,
                                      );
                                    else
                                      modelServiceBrowserItemRefs.current.delete(service.serviceId);
                                  }}
                                  type="button"
                                  className={cn(
                                    "group flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors",
                                    "hover:bg-foreground/[0.04]",
                                    "focus-visible:bg-foreground/[0.045] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60",
                                  )}
                                  data-model-service-result={service.serviceId}
                                  aria-label={t("settings.connectModelServiceNamed", {
                                    name: instanceLabel,
                                  })}
                                  onClick={() =>
                                    openModelServiceDetails(service.serviceId, "browser")
                                  }
                                >
                                  <ModelServiceIcon
                                    serviceId={service.serviceId}
                                    origin={service.origin}
                                    className="size-6"
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-foreground">
                                      {instanceLabel}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                      {modelServiceAuthMethodsLabel(service)}
                                    </span>
                                  </span>
                                  <ChevronRightIcon
                                    aria-hidden="true"
                                    className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/70"
                                  />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                )
              ) : (
                <SettingsEmptyState>{t("settings.noMatchingModelServices")}</SettingsEmptyState>
              )}
              {customApiCapability ? (
                <div className="border-t border-border/70 pt-4">
                  <button
                    type="button"
                    className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.035] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/60"
                    onClick={() => openCustomServiceEditor()}
                  >
                    <ModelServiceIcon
                      serviceId="custom-api"
                      origin="models_json"
                      className="size-4"
                    />
                    <span className="min-w-0 flex-1">
                      {t("settings.customApiNotFoundPrompt")}{" "}
                      <span className="font-medium text-foreground">
                        {t("settings.connectByApiAddress")}
                      </span>
                    </span>
                    <ChevronRightIcon
                      aria-hidden="true"
                      className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                </div>
              ) : null}
            </div>
          </SettingsSectionShell>
        </div>
      ) : null}

      {customServiceEditor ? (
        <SettingsSectionShell
          title={
            customServiceEditor.mode === "edit"
              ? t("settings.editCustomApiService")
              : t("settings.connectByApiAddress")
          }
          action={
            <Button
              size="sm"
              variant="ghost"
              disabled={
                customServiceEditor.testState === "testing" || modelServiceMutation !== null
              }
              onClick={requestCloseCustomServiceEditor}
            >
              <ArrowLeftIcon aria-hidden="true" />
              {t("common.back")}
            </Button>
          }
        >
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("settings.customApiDescription")}
            </p>
            <SettingsCard className="space-y-0 p-0">
              <div className="grid gap-4 border-b border-border p-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  <span>{t("settings.customApiConnectionName")}</span>
                  <Input
                    autoFocus
                    value={customServiceEditor.displayName}
                    onChange={(event) =>
                      updateCustomServiceEditor((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder={t("settings.customApiConnectionNamePlaceholder")}
                  />
                </label>
                <label className="space-y-1.5 text-xs font-medium text-foreground">
                  <span>{t("settings.customApiProtocol")}</span>
                  <Select
                    value={customServiceEditor.api}
                    onValueChange={(value) =>
                      updateCustomServiceEditor((current) => {
                        const api = value as OmniMindCustomModelServiceApi;
                        return {
                          ...current,
                          api,
                          models: current.models.map((model) =>
                            model.api === undefined && current.api !== api
                              ? { ...model, compat: {} }
                              : model,
                          ),
                        };
                      })
                    }
                  >
                    <SelectTrigger aria-label={t("settings.customApiProtocol")}>
                      <SelectValue>
                        {t(`settings.customApiProtocol.${customServiceEditor.api}`)}
                      </SelectValue>
                    </SelectTrigger>
                    <SettingsSelectPopup align="start">
                      {customApiCapability?.protocols.map((protocol) => (
                        <SelectItem key={protocol} value={protocol}>
                          {t(`settings.customApiProtocol.${protocol}`)}
                        </SelectItem>
                      ))}
                    </SettingsSelectPopup>
                  </Select>
                </label>
                <label className="space-y-1.5 text-xs font-medium text-foreground sm:col-span-2">
                  <span>{t("settings.customApiEndpoint")}</span>
                  <Input
                    value={customServiceEditor.baseUrl}
                    onChange={(event) =>
                      updateCustomServiceEditor((current) => ({
                        ...current,
                        baseUrl: event.target.value,
                      }))
                    }
                    placeholder={t(
                      `settings.customApiEndpointPlaceholder.${customServiceEditor.api}`,
                    )}
                    inputMode="url"
                    spellCheck={false}
                  />
                  <span className="block font-normal text-muted-foreground">
                    {t(`settings.customApiProtocolHelp.${customServiceEditor.api}`)}
                  </span>
                </label>
                <div className="space-y-3 sm:col-span-2">
                  <label className="space-y-1.5 text-xs font-medium text-foreground">
                    <span>{t("settings.customApiCredentialMethod")}</span>
                    <Select
                      value={customServiceEditor.credentialMode}
                      onValueChange={(value) =>
                        updateCustomServiceEditor((current) => ({
                          ...current,
                          credentialMode: value as CustomModelServiceEditorState["credentialMode"],
                          apiKey: "",
                          environmentVariableName: "",
                          credentialCommand: "",
                        }))
                      }
                    >
                      <SelectTrigger aria-label={t("settings.customApiCredentialMethod")}>
                        <SelectValue>
                          {t(
                            `settings.customApiCredentialMethod.${customServiceEditor.credentialMode}`,
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SettingsSelectPopup align="start">
                        {customServiceEditor.mode === "edit" ? (
                          <SelectItem value="preserve">
                            {t("settings.customApiCredentialMethod.preserve")}
                          </SelectItem>
                        ) : null}
                        <SelectItem value="stored_key">
                          {t("settings.customApiCredentialMethod.stored_key")}
                        </SelectItem>
                      </SettingsSelectPopup>
                    </Select>
                  </label>

                  {customServiceEditor.credentialMode === "preserve" ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("settings.customApiCredentialPreserveDescription", {
                        source: t(
                          `settings.customApiCredentialSource.${customCredentialSourceKind(
                            customServiceEditor.existingAuthSource,
                          )}`,
                        ),
                      })}
                    </p>
                  ) : null}

                  {customServiceEditor.credentialMode === "stored_key" ? (
                    <div className="space-y-1.5 text-xs font-medium text-foreground">
                      <label htmlFor={customServiceApiKeyInputId}>
                        {t("settings.customApiKey")}
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={customServiceApiKeyInputId}
                          type={customServiceApiKeyVisible ? "text" : "password"}
                          autoComplete="off"
                          value={customServiceEditor.apiKey}
                          onChange={(event) =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              apiKey: event.target.value,
                            }))
                          }
                          placeholder={t("settings.customApiKeyPlaceholder")}
                        />
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          aria-label={t(
                            customServiceApiKeyVisible
                              ? "settings.customApiHideKey"
                              : "settings.customApiShowKey",
                          )}
                          title={t(
                            customServiceApiKeyVisible
                              ? "settings.customApiHideKey"
                              : "settings.customApiShowKey",
                          )}
                          onClick={() => setCustomServiceApiKeyVisible((visible) => !visible)}
                        >
                          <EyeIcon aria-hidden="true" />
                        </Button>
                      </div>
                      <span className="block font-normal text-muted-foreground">
                        {t("settings.customApiKeyDescription")}
                      </span>
                    </div>
                  ) : null}

                  <details className="rounded-lg border border-border px-3 py-2">
                    <summary className="cursor-pointer text-xs font-medium text-foreground">
                      {t("settings.customApiCredentialAdvanced")}
                    </summary>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {t("settings.customApiCredentialAdvancedDescription")}
                    </p>
                    <label className="mt-3 block space-y-1.5 text-xs font-medium text-foreground">
                      <span>{t("settings.customApiAuthHeader")}</span>
                      <Select
                        value={
                          customServiceEditor.authHeader === undefined
                            ? "provider_default"
                            : String(customServiceEditor.authHeader)
                        }
                        onValueChange={(value) =>
                          updateCustomServiceEditor((current) => ({
                            ...current,
                            authHeader: value === "provider_default" ? undefined : value === "true",
                          }))
                        }
                      >
                        <SelectTrigger aria-label={t("settings.customApiAuthHeader")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SettingsSelectPopup align="start">
                          <SelectItem value="provider_default">
                            {t("settings.customApiAuthHeader.default")}
                          </SelectItem>
                          <SelectItem value="true">
                            {t("settings.customApiAuthHeader.bearer")}
                          </SelectItem>
                          <SelectItem value="false">
                            {t("settings.customApiAuthHeader.none")}
                          </SelectItem>
                        </SettingsSelectPopup>
                      </Select>
                      <span className="block font-normal text-muted-foreground">
                        {t("settings.customApiAuthHeaderDescription")}
                      </span>
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          customServiceEditor.credentialMode === "environment"
                            ? "secondary"
                            : "outline"
                        }
                        aria-pressed={customServiceEditor.credentialMode === "environment"}
                        onClick={() =>
                          updateCustomServiceEditor((current) => ({
                            ...current,
                            credentialMode: "environment",
                            apiKey: "",
                            credentialCommand: "",
                          }))
                        }
                      >
                        {t("settings.customApiCredentialMethod.environment")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          customServiceEditor.credentialMode === "command" ? "secondary" : "outline"
                        }
                        aria-pressed={customServiceEditor.credentialMode === "command"}
                        onClick={() =>
                          updateCustomServiceEditor((current) => ({
                            ...current,
                            credentialMode: "command",
                            apiKey: "",
                            environmentVariableName: "",
                          }))
                        }
                      >
                        {t("settings.customApiCredentialMethod.command")}
                      </Button>
                    </div>

                    {customServiceEditor.credentialMode === "environment" ? (
                      <label className="mt-3 block space-y-1.5 text-xs font-medium text-foreground">
                        <span>{t("settings.customApiEnvironmentVariable")}</span>
                        <Input
                          value={customServiceEditor.environmentVariableName}
                          onChange={(event) =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              environmentVariableName: event.target.value,
                            }))
                          }
                          placeholder={t("settings.customApiEnvironmentVariablePlaceholder")}
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <span className="block font-normal text-muted-foreground">
                          {t("settings.customApiEnvironmentDescription")}
                        </span>
                      </label>
                    ) : null}

                    {customServiceEditor.credentialMode === "command" ? (
                      <label className="mt-3 block space-y-1.5 text-xs font-medium text-foreground">
                        <span>{t("settings.customApiCredentialCommand")}</span>
                        <Textarea
                          value={customServiceEditor.credentialCommand}
                          onChange={(event) =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              credentialCommand: event.target.value,
                            }))
                          }
                          placeholder={t("settings.customApiCredentialCommandPlaceholder")}
                          className="min-h-20 font-mono text-xs"
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <span className="block font-normal leading-relaxed text-muted-foreground">
                          {t("settings.customApiCredentialCommandDescription")}
                        </span>
                      </label>
                    ) : null}

                    <CustomHeaderEditor
                      scope="engine"
                      entries={customServiceEditor.headers}
                      onChange={(headers) =>
                        updateCustomServiceEditor((current) => ({
                          ...current,
                          headers,
                        }))
                      }
                    />
                  </details>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {t("settings.customApiModels")}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("settings.customApiModelsDescription")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {customModelDiscovery.status === "loading" ? (
                      <Button size="sm" variant="outline" onClick={cancelCustomModelDiscovery}>
                        {t("settings.customApiCancelDiscovery")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!customServiceDiscoveryFormValid}
                        onClick={() => requestCustomServiceAction("discover")}
                      >
                        {t("settings.customApiDiscoverModels")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateCustomServiceEditor((current) => ({
                          ...current,
                          models: [...current.models, { ...DEFAULT_CUSTOM_MODEL }],
                        }))
                      }
                    >
                      <PlusIcon aria-hidden="true" />
                      {t("settings.customApiAddModel")}
                    </Button>
                  </div>
                </div>

                {customModelDiscovery.status === "loading" ? (
                  <div role="status" className="text-xs text-muted-foreground">
                    {t("settings.customApiDiscovering")}
                  </div>
                ) : customModelDiscovery.status === "success" ? (
                  <div className="space-y-3 rounded-lg border border-border p-3">
                    <div>
                      <h4 className="text-xs font-medium text-foreground">
                        {t("settings.customApiDiscoveredModels")}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t("settings.customApiDiscoveryDescription")}
                      </p>
                    </div>
                    <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                      {customModelDiscovery.models.map((model) => (
                        <label
                          key={model.modelId}
                          className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-foreground/[0.04]"
                        >
                          <Checkbox
                            checked={customModelDiscovery.selectedModelIds.has(model.modelId)}
                            onCheckedChange={(checked) =>
                              setCustomModelDiscovery((current) => {
                                if (current.status !== "success") return current;
                                const selectedModelIds = new Set(current.selectedModelIds);
                                if (checked === true) selectedModelIds.add(model.modelId);
                                else selectedModelIds.delete(model.modelId);
                                return { ...current, selectedModelIds };
                              })
                            }
                          />
                          <span className="min-w-0">
                            <span className="block text-xs font-medium text-foreground">
                              {model.displayName}
                            </span>
                            <span className="block break-all font-mono text-[11px] text-muted-foreground">
                              {model.modelId}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={customModelDiscovery.selectedModelIds.size === 0}
                        onClick={addSelectedDiscoveredModels}
                      >
                        {t("settings.customApiAddSelectedModels")}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {customServiceEditor.models.map((model, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-border bg-foreground/[0.02] p-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1.5 text-xs font-medium text-foreground">
                        <span>{t("settings.customApiModelId")}</span>
                        <Input
                          value={model.modelId}
                          onChange={(event) =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              models: current.models.map((entry, modelIndex) =>
                                modelIndex === index
                                  ? { ...entry, modelId: event.target.value }
                                  : entry,
                              ),
                            }))
                          }
                          placeholder={t("settings.customApiModelIdPlaceholder")}
                          spellCheck={false}
                        />
                      </label>
                      <label className="space-y-1.5 text-xs font-medium text-foreground">
                        <span>{t("settings.customApiModelName")}</span>
                        <Input
                          value={model.displayName ?? ""}
                          onChange={(event) =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              models: current.models.map((entry, modelIndex) =>
                                modelIndex === index
                                  ? {
                                      ...entry,
                                      displayName: event.target.value || undefined,
                                    }
                                  : entry,
                              ),
                            }))
                          }
                          placeholder={t("settings.customApiModelNamePlaceholder")}
                        />
                      </label>
                    </div>
                    <details className="mt-3 rounded-lg border border-border px-3 py-2">
                      <summary className="cursor-pointer text-xs font-medium text-foreground">
                        {t("settings.customApiModelAdvanced")}
                      </summary>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {t("settings.customApiModelAdvancedDescription")}
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1.5 text-xs font-medium text-foreground">
                          <span>{t("settings.customApiModelProtocol")}</span>
                          <Select
                            value={model.api ?? "provider_default"}
                            onValueChange={(value) =>
                              updateCustomServiceEditor((current) => ({
                                ...current,
                                models: current.models.map((entry, modelIndex) => {
                                  if (modelIndex !== index) return entry;
                                  const api =
                                    value === "provider_default"
                                      ? undefined
                                      : (value as OmniMindCustomModelServiceApi);
                                  const protocolChanged =
                                    (entry.api ?? current.api) !== (api ?? current.api);
                                  return {
                                    ...entry,
                                    api,
                                    ...(protocolChanged ? { compat: {} } : {}),
                                  };
                                }),
                              }))
                            }
                          >
                            <SelectTrigger aria-label={t("settings.customApiModelProtocol")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SettingsSelectPopup align="start">
                              <SelectItem value="provider_default">
                                {t("settings.customApiModelUseDefault")}
                              </SelectItem>
                              {customApiCapability?.protocols.map((protocol) => (
                                <SelectItem key={protocol} value={protocol}>
                                  {t(`settings.customApiProtocol.${protocol}`)}
                                </SelectItem>
                              ))}
                            </SettingsSelectPopup>
                          </Select>
                        </label>
                        <label className="space-y-1.5 text-xs font-medium text-foreground">
                          <span>{t("settings.customApiModelEndpoint")}</span>
                          <Input
                            value={model.baseUrl ?? ""}
                            placeholder={t("settings.customApiModelUseDefault")}
                            inputMode="url"
                            spellCheck={false}
                            onChange={(event) =>
                              updateCustomServiceEditor((current) => ({
                                ...current,
                                models: current.models.map((entry, modelIndex) =>
                                  modelIndex === index
                                    ? {
                                        ...entry,
                                        baseUrl: event.target.value || undefined,
                                      }
                                    : entry,
                                ),
                              }))
                            }
                          />
                        </label>
                        <label className="space-y-1.5 text-xs font-medium text-foreground">
                          <span>{t("settings.customApiContextWindow")}</span>
                          <Input
                            type="number"
                            min={1}
                            value={model.contextWindow ?? ""}
                            placeholder={t("settings.customApiModelUseDefault")}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateCustomServiceEditor((current) => ({
                                ...current,
                                models: current.models.map((entry, modelIndex) =>
                                  modelIndex === index
                                    ? {
                                        ...entry,
                                        contextWindow: value === "" ? undefined : Number(value),
                                      }
                                    : entry,
                                ),
                              }));
                            }}
                          />
                        </label>
                        <label className="space-y-1.5 text-xs font-medium text-foreground">
                          <span>{t("settings.customApiMaxTokens")}</span>
                          <Input
                            type="number"
                            min={1}
                            value={model.maxTokens ?? ""}
                            placeholder={t("settings.customApiModelUseDefault")}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateCustomServiceEditor((current) => ({
                                ...current,
                                models: current.models.map((entry, modelIndex) =>
                                  modelIndex === index
                                    ? {
                                        ...entry,
                                        maxTokens: value === "" ? undefined : Number(value),
                                      }
                                    : entry,
                                ),
                              }));
                            }}
                          />
                        </label>
                      </div>
                      <CustomHeaderEditor
                        scope="model"
                        entries={model.headers}
                        onChange={(headers) =>
                          updateCustomServiceEditor((current) => ({
                            ...current,
                            models: current.models.map((entry, modelIndex) =>
                              modelIndex === index ? { ...entry, headers } : entry,
                            ),
                          }))
                        }
                      />
                      <div className="mt-4 space-y-3 border-t border-border pt-3">
                        <div>
                          <h5 className="text-xs font-medium text-foreground">
                            {t("settings.customApiModelPricing")}
                          </h5>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {t("settings.customApiModelPricingDescription")}
                          </p>
                        </div>
                        <Select
                          value={model.cost ? "custom" : "provider_default"}
                          onValueChange={(value) =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              models: current.models.map((entry, modelIndex) =>
                                modelIndex === index
                                  ? {
                                      ...entry,
                                      cost:
                                        value === "custom"
                                          ? (entry.cost ?? {
                                              input: 0,
                                              output: 0,
                                              cacheRead: 0,
                                              cacheWrite: 0,
                                            })
                                          : undefined,
                                    }
                                  : entry,
                              ),
                            }))
                          }
                        >
                          <SelectTrigger aria-label={t("settings.customApiModelPricingMode")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SettingsSelectPopup align="start">
                            <SelectItem value="provider_default">
                              {t("settings.customApiModelPricingNone")}
                            </SelectItem>
                            <SelectItem value="custom">
                              {t("settings.customApiModelPricingCustom")}
                            </SelectItem>
                          </SettingsSelectPopup>
                        </Select>
                        {model.cost ? (
                          <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              {(["input", "output", "cacheRead", "cacheWrite"] as const).map(
                                (rate) => (
                                  <label
                                    key={rate}
                                    className="space-y-1.5 text-xs font-medium text-foreground"
                                  >
                                    <span>{t(`settings.customApiModelCost.${rate}`)}</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      step="any"
                                      value={model.cost?.[rate] ?? 0}
                                      onChange={(event) => {
                                        if (event.target.value === "") return;
                                        const value = Number(event.target.value);
                                        if (!Number.isFinite(value) || value < 0) return;
                                        updateCustomServiceEditor((current) => ({
                                          ...current,
                                          models: current.models.map((entry, modelIndex) =>
                                            modelIndex === index && entry.cost
                                              ? {
                                                  ...entry,
                                                  cost: {
                                                    ...entry.cost,
                                                    [rate]: value,
                                                  },
                                                }
                                              : entry,
                                          ),
                                        }));
                                      }}
                                    />
                                  </label>
                                ),
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <h6 className="text-xs font-medium text-foreground">
                                    {t("settings.customApiModelCostTiers")}
                                  </h6>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {t("settings.customApiModelCostTiersDescription")}
                                  </p>
                                </div>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  disabled={
                                    (model.cost.tiers?.length ?? 0) >=
                                    HARNESSOS_CUSTOM_MODEL_COST_TIERS_MAX_COUNT
                                  }
                                  onClick={() =>
                                    updateCustomServiceEditor((current) => ({
                                      ...current,
                                      models: current.models.map((entry, modelIndex) =>
                                        modelIndex === index && entry.cost
                                          ? {
                                              ...entry,
                                              cost: {
                                                ...entry.cost,
                                                tiers: [
                                                  ...(entry.cost.tiers ?? []),
                                                  {
                                                    inputTokensAbove: 0,
                                                    input: entry.cost.input,
                                                    output: entry.cost.output,
                                                    cacheRead: entry.cost.cacheRead,
                                                    cacheWrite: entry.cost.cacheWrite,
                                                  },
                                                ],
                                              },
                                            }
                                          : entry,
                                      ),
                                    }))
                                  }
                                >
                                  <PlusIcon aria-hidden="true" />
                                  {t("settings.customApiModelAddCostTier")}
                                </Button>
                              </div>
                              {model.cost.tiers?.map((tier, tierIndex) => (
                                <div
                                  key={tierIndex}
                                  className="space-y-2 rounded-lg border border-border p-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs font-medium text-foreground">
                                      {t("settings.customApiModelCostTier", {
                                        number: tierIndex + 1,
                                      })}
                                    </span>
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      onClick={() =>
                                        updateCustomServiceEditor((current) => ({
                                          ...current,
                                          models: current.models.map((entry, modelIndex) =>
                                            modelIndex === index && entry.cost
                                              ? {
                                                  ...entry,
                                                  cost: {
                                                    ...entry.cost,
                                                    tiers: entry.cost.tiers?.filter(
                                                      (_, currentTierIndex) =>
                                                        currentTierIndex !== tierIndex,
                                                    ),
                                                  },
                                                }
                                              : entry,
                                          ),
                                        }))
                                      }
                                    >
                                      {t("common.remove")}
                                    </Button>
                                  </div>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    {(
                                      [
                                        "inputTokensAbove",
                                        "input",
                                        "output",
                                        "cacheRead",
                                        "cacheWrite",
                                      ] as const
                                    ).map((field) => (
                                      <label
                                        key={field}
                                        className="space-y-1.5 text-xs font-medium text-foreground"
                                      >
                                        <span>{t(`settings.customApiModelCostTier.${field}`)}</span>
                                        <Input
                                          type="number"
                                          min={0}
                                          step="any"
                                          value={tier[field]}
                                          onChange={(event) => {
                                            if (event.target.value === "") return;
                                            const value = Number(event.target.value);
                                            if (!Number.isFinite(value) || value < 0) return;
                                            updateCustomServiceEditor((current) => ({
                                              ...current,
                                              models: current.models.map((entry, modelIndex) =>
                                                modelIndex === index && entry.cost
                                                  ? {
                                                      ...entry,
                                                      cost: {
                                                        ...entry.cost,
                                                        tiers: entry.cost.tiers?.map(
                                                          (currentTier, currentTierIndex) =>
                                                            currentTierIndex === tierIndex
                                                              ? {
                                                                  ...currentTier,
                                                                  [field]: value,
                                                                }
                                                              : currentTier,
                                                        ),
                                                      },
                                                    }
                                                  : entry,
                                              ),
                                            }));
                                          }}
                                        />
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-4">
                        <h5 className="text-xs font-medium text-foreground">
                          {t("settings.customApiThinkingMap")}
                        </h5>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("settings.customApiThinkingMapDescription")}
                        </p>
                        <div className="mt-2 grid gap-2">
                          {CUSTOM_MODEL_THINKING_LEVELS.map((level) => {
                            const levelLabel = t(CUSTOM_MODEL_THINKING_LEVEL_LABEL_KEYS[level]);
                            const levelValue = model.thinkingLevelMap?.[level];
                            const levelMode =
                              levelValue === undefined
                                ? "provider_default"
                                : levelValue === null
                                  ? "disabled"
                                  : "mapped";
                            const updateLevel = (value: string | null | undefined) =>
                              updateCustomServiceEditor((current) => ({
                                ...current,
                                models: current.models.map((entry, modelIndex) => {
                                  if (modelIndex !== index) return entry;
                                  const nextMap = {
                                    ...entry.thinkingLevelMap,
                                  };
                                  if (value === undefined) delete nextMap[level];
                                  else nextMap[level] = value;
                                  return {
                                    ...entry,
                                    thinkingLevelMap:
                                      Object.keys(nextMap).length > 0 ? nextMap : undefined,
                                  };
                                }),
                              }));
                            return (
                              <div
                                key={level}
                                className="grid grid-cols-[4rem_minmax(0,8rem)_1fr] items-center gap-2 text-xs"
                              >
                                <span className="text-muted-foreground">{levelLabel}</span>
                                <Select
                                  value={levelMode}
                                  onValueChange={(value) =>
                                    updateLevel(
                                      value === "provider_default"
                                        ? undefined
                                        : value === "disabled"
                                          ? null
                                          : (levelValue ?? level),
                                    )
                                  }
                                >
                                  <SelectTrigger
                                    aria-label={t("settings.customApiThinkingMapControl", {
                                      level: levelLabel,
                                    })}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SettingsSelectPopup align="start">
                                    <SelectItem value="provider_default">
                                      {t("settings.customApiThinkingMap.default")}
                                    </SelectItem>
                                    <SelectItem value="disabled">
                                      {t("settings.customApiThinkingMap.disabled")}
                                    </SelectItem>
                                    <SelectItem value="mapped">
                                      {t("settings.customApiThinkingMap.mapped")}
                                    </SelectItem>
                                  </SettingsSelectPopup>
                                </Select>
                                {levelMode === "mapped" ? (
                                  <Input
                                    aria-label={t("settings.customApiThinkingMapValue", {
                                      level: levelLabel,
                                    })}
                                    value={levelValue ?? ""}
                                    spellCheck={false}
                                    onChange={(event) =>
                                      updateLevel(event.target.value || undefined)
                                    }
                                  />
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1.5 text-xs font-medium text-foreground">
                          <span>{t("settings.customApiModelThinking")}</span>
                          <Select
                            value={
                              model.reasoning === undefined
                                ? "provider_default"
                                : String(model.reasoning)
                            }
                            onValueChange={(value) =>
                              updateCustomServiceEditor((current) => ({
                                ...current,
                                models: current.models.map((entry, modelIndex) =>
                                  modelIndex === index
                                    ? {
                                        ...entry,
                                        reasoning:
                                          value === "provider_default"
                                            ? undefined
                                            : value === "true",
                                      }
                                    : entry,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger aria-label={t("settings.customApiModelThinking")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SettingsSelectPopup align="start">
                              <SelectItem value="provider_default">
                                {t("settings.customApiModelUseDefault")}
                              </SelectItem>
                              <SelectItem value="true">{t("common.on")}</SelectItem>
                              <SelectItem value="false">{t("common.off")}</SelectItem>
                            </SettingsSelectPopup>
                          </Select>
                        </label>
                        <label className="space-y-1.5 text-xs font-medium text-foreground">
                          <span>{t("settings.customApiModelInput")}</span>
                          <Select
                            value={
                              model.input === undefined
                                ? "provider_default"
                                : model.input.includes("image")
                                  ? "text_image"
                                  : "text"
                            }
                            onValueChange={(value) =>
                              updateCustomServiceEditor((current) => ({
                                ...current,
                                models: current.models.map((entry, modelIndex) =>
                                  modelIndex === index
                                    ? {
                                        ...entry,
                                        input:
                                          value === "provider_default"
                                            ? undefined
                                            : value === "text_image"
                                              ? ["text", "image"]
                                              : ["text"],
                                      }
                                    : entry,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger aria-label={t("settings.customApiModelInput")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SettingsSelectPopup align="start">
                              <SelectItem value="provider_default">
                                {t("settings.customApiModelUseDefault")}
                              </SelectItem>
                              <SelectItem value="text">
                                {t("settings.customApiModelInput.text")}
                              </SelectItem>
                              <SelectItem value="text_image">
                                {t("settings.customApiModelInput.text_image")}
                              </SelectItem>
                            </SettingsSelectPopup>
                          </Select>
                        </label>
                      </div>
                      {(() => {
                        const effectiveApi = model.api ?? customServiceEditor.api;
                        const fields = HARNESSOS_CUSTOM_MODEL_COMPAT_FIELDS_BY_API[
                          effectiveApi
                        ].filter(
                          (field): field is CustomModelBooleanCompatField =>
                            field !== "maxTokensField",
                        );
                        if (fields.length === 0 && effectiveApi !== "openai-completions")
                          return null;
                        return (
                          <details className="mt-4 rounded-lg border border-border px-3 py-2">
                            <summary className="cursor-pointer text-xs font-medium text-foreground">
                              {t("settings.customApiCompat")}
                            </summary>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                              {t("settings.customApiCompatDescription")}
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {effectiveApi === "openai-completions" ? (
                                <label className="space-y-1.5 text-xs font-medium text-foreground">
                                  <span>{t("settings.customApiCompat.maxTokensField")}</span>
                                  <Select
                                    value={model.compat?.maxTokensField ?? "provider_default"}
                                    onValueChange={(value) =>
                                      updateCustomServiceEditor((current) => ({
                                        ...current,
                                        models: current.models.map((entry, modelIndex) => {
                                          if (modelIndex !== index) return entry;
                                          const compat = { ...entry.compat };
                                          if (value === "provider_default")
                                            delete compat.maxTokensField;
                                          else
                                            compat.maxTokensField = value as
                                              | "max_completion_tokens"
                                              | "max_tokens";
                                          return { ...entry, compat };
                                        }),
                                      }))
                                    }
                                  >
                                    <SelectTrigger
                                      aria-label={t("settings.customApiCompat.maxTokensField")}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SettingsSelectPopup align="start">
                                      <SelectItem value="provider_default">
                                        {t("settings.customApiModelUseDefault")}
                                      </SelectItem>
                                      <SelectItem value="max_completion_tokens">
                                        {t(
                                          "settings.customApiCompat.maxTokensField.max_completion_tokens",
                                        )}
                                      </SelectItem>
                                      <SelectItem value="max_tokens">
                                        {t("settings.customApiCompat.maxTokensField.max_tokens")}
                                      </SelectItem>
                                    </SettingsSelectPopup>
                                  </Select>
                                </label>
                              ) : null}
                              {fields.map((field) => (
                                <label
                                  key={field}
                                  className="space-y-1.5 text-xs font-medium text-foreground"
                                >
                                  <span>{t(CUSTOM_MODEL_COMPAT_LABEL_KEYS[field])}</span>
                                  <Select
                                    value={
                                      model.compat?.[field] === undefined
                                        ? "provider_default"
                                        : String(model.compat[field])
                                    }
                                    onValueChange={(value) =>
                                      updateCustomServiceEditor((current) => ({
                                        ...current,
                                        models: current.models.map((entry, modelIndex) => {
                                          if (modelIndex !== index) return entry;
                                          const compat = { ...entry.compat };
                                          if (value === "provider_default") delete compat[field];
                                          else compat[field] = value === "true";
                                          return { ...entry, compat };
                                        }),
                                      }))
                                    }
                                  >
                                    <SelectTrigger
                                      aria-label={t(CUSTOM_MODEL_COMPAT_LABEL_KEYS[field])}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SettingsSelectPopup align="start">
                                      <SelectItem value="provider_default">
                                        {t("settings.customApiModelUseDefault")}
                                      </SelectItem>
                                      <SelectItem value="true">{t("common.on")}</SelectItem>
                                      <SelectItem value="false">{t("common.off")}</SelectItem>
                                    </SettingsSelectPopup>
                                  </Select>
                                </label>
                              ))}
                            </div>
                          </details>
                        );
                      })()}
                    </details>
                    <div className="mt-3 flex justify-end">
                      {customServiceEditor.models.length > 1 ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="ml-auto text-destructive hover:text-destructive"
                          onClick={() =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              models: current.models.filter(
                                (_, modelIndex) => modelIndex !== index,
                              ),
                            }))
                          }
                        >
                          {t("common.remove")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </SettingsCard>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                {t("settings.customApiTestRequired")}
              </p>
              <div className="flex items-center gap-2">
                {customServiceEditor.testState === "testing" ? (
                  <Button variant="outline" onClick={cancelCustomServiceTest}>
                    {t("settings.customApiCancelTest")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={
                      !customServiceFormValid ||
                      customModelDiscovery.status === "loading" ||
                      modelServiceMutation !== null
                    }
                    onClick={() => requestCustomServiceAction("test")}
                  >
                    {t("settings.customApiTestConnection")}
                  </Button>
                )}
                <Button
                  disabled={
                    customServiceEditor.testedFingerprint !==
                      customModelServiceFingerprint(customServiceEditor) ||
                    customModelDiscovery.status === "loading" ||
                    modelServiceMutation !== null
                  }
                  onClick={() => requestCustomServiceAction("save")}
                >
                  {modelServiceMutation === "custom:save"
                    ? t("settings.customApiSaving")
                    : t("settings.customApiSave")}
                </Button>
              </div>
            </div>
          </div>
        </SettingsSectionShell>
      ) : null}

      {modelServiceNotice ? (
        <div
          role={modelServiceNotice.tone === "error" ? "alert" : "status"}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            modelServiceNotice.tone === "error"
              ? "border-destructive/30 text-destructive"
              : "border-[color:var(--color-border)] text-muted-foreground",
          )}
        >
          {modelServiceNotice.text}
        </div>
      ) : null}

      {selectedModelServiceId && !customServiceEditor ? (
        <div id={modelServiceDetailRegionId} aria-live="polite">
          <SettingsSectionShell
            title={
              selectedModelService
                ? t("settings.modelServiceDetailsNamed", {
                    name: modelServiceInstanceLabel(selectedModelService),
                  })
                : t("settings.modelServiceDetails")
            }
            action={
              <Button
                ref={modelServiceDetailBackButtonRef}
                size="sm"
                variant="ghost"
                onClick={closeModelServiceDetails}
              >
                {t("common.back")}
              </Button>
            }
          >
            {modelServiceDetailQuery.isPending ? (
              <SettingsEmptyState layout="status">
                {t("settings.modelServiceDetailsLoading")}
              </SettingsEmptyState>
            ) : modelServiceDetailQuery.isError ? (
              <SettingsEmptyState layout="status" tone="destructive">
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
                  <span>{t("settings.modelServicesConnectionUnavailable")}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void modelServiceDetailQuery.refetch()}
                  >
                    {t("common.tryAgain")}
                  </Button>
                </div>
              </SettingsEmptyState>
            ) : modelServiceDetailQuery.data?.state === "error" ? (
              <SettingsEmptyState layout="status" tone="destructive">
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
                  <span>{t("settings.modelServiceDetailsUnavailable")}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void modelServiceDetailQuery.refetch()}
                  >
                    {t("common.tryAgain")}
                  </Button>
                </div>
              </SettingsEmptyState>
            ) : selectedModelService ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                  <ModelServiceIcon
                    serviceId={selectedModelService.serviceId}
                    origin={selectedModelService.origin}
                    className="size-7"
                  />
                  <span className="truncate">
                    {modelServiceInstanceLabel(selectedModelService)}
                  </span>
                </div>
                {selectedCustomConfig ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={modelServiceMutation !== null}
                      onClick={() => openCustomServiceEditor(selectedCustomConfig)}
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={modelServiceMutation !== null}
                      onClick={() => {
                        void modelServiceDetailQuery.refetch();
                        void modelServicesQuery.refetch();
                      }}
                    >
                      {t("settings.customApiReload")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={modelServiceMutation !== null}
                      onClick={() => setRemoveCustomService(selectedModelService)}
                    >
                      {t("common.delete")}
                    </Button>
                  </div>
                ) : null}
                <SettingsCard>
                  <SettingsListRow
                    title={t("settings.modelServiceAuthentication")}
                    description={modelServiceAuthLabel(selectedModelService)}
                    actions={
                      <div className="flex max-w-[min(24rem,55vw)] flex-wrap items-center justify-end gap-2">
                        <span className="break-words text-right text-xs text-muted-foreground">
                          {modelServiceAuthMethodsLabel(selectedModelService)}
                        </span>
                        {selectedModelServiceApiKeyMethod ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={modelServiceMutation !== null || authDialog !== null}
                            onClick={() =>
                              void beginModelServiceLogin(selectedModelService, "api_key")
                            }
                          >
                            {selectedModelService.storedCredentialType === "api_key"
                              ? t("settings.replaceApiKey")
                              : t("settings.addApiKey")}
                          </Button>
                        ) : null}
                        {selectedModelServiceOAuthMethod ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={modelServiceMutation !== null || authDialog !== null}
                            onClick={() =>
                              void beginModelServiceLogin(selectedModelService, "oauth")
                            }
                          >
                            {selectedModelService.storedCredentialType === "oauth"
                              ? t("settings.signInAgain")
                              : t("settings.signInWithBrowser")}
                          </Button>
                        ) : null}
                        {selectedModelService.storedCredentialType === "oauth" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={modelServiceMutation !== null || authDialog !== null}
                            onClick={() => setLogoutService(selectedModelService)}
                          >
                            {t("settings.signOutModelService")}
                          </Button>
                        ) : null}
                      </div>
                    }
                  />
                  <SettingsListRow
                    title={t("settings.modelServiceCredentialSource")}
                    description={modelServiceCredentialSourceLabel(selectedModelService)}
                  />
                  {selectedModelService.storedCredentialType === "api_key" &&
                  selectedModelService.authSource === "stored" ? (
                    <SettingsListRow
                      align="start"
                      title={t("settings.modelServiceStoredApiKey")}
                      description={
                        <div className="space-y-1">
                          <p>
                            {revealedModelServiceApiKey?.serviceId ===
                            selectedModelService.serviceId
                              ? t("settings.modelServiceApiKeyVisibleUntilClose")
                              : t("settings.modelServiceApiKeyHidden")}
                          </p>
                          {modelServiceApiKeyError ? (
                            <p role="alert" className="text-destructive">
                              {modelServiceApiKeyError}
                            </p>
                          ) : null}
                        </div>
                      }
                      actions={
                        <div className="flex w-full min-w-0 max-w-md flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            aria-label={t("settings.modelServiceStoredApiKey")}
                            type={
                              revealedModelServiceApiKey?.serviceId ===
                              selectedModelService.serviceId
                                ? "text"
                                : "password"
                            }
                            readOnly
                            spellCheck={false}
                            autoComplete="off"
                            className="min-w-0 flex-1 font-mono text-xs"
                            value={
                              revealedModelServiceApiKey?.serviceId ===
                              selectedModelService.serviceId
                                ? revealedModelServiceApiKey.value
                                : "saved-api-key"
                            }
                          />
                          <CredentialSecretControls
                            visible={
                              revealedModelServiceApiKey?.serviceId ===
                              selectedModelService.serviceId
                            }
                            disabled={
                              modelServiceMutation !== null || modelServiceApiKeyAccess !== null
                            }
                            onToggleVisibility={() => {
                              if (
                                revealedModelServiceApiKey?.serviceId ===
                                selectedModelService.serviceId
                              ) {
                                setRevealedModelServiceApiKey(null);
                                setModelServiceApiKeyError(null);
                                return;
                              }
                              return readStoredModelServiceApiKey(
                                selectedModelService,
                                "reveal",
                              ).then(() => undefined);
                            }}
                            resolveCopyValue={() =>
                              revealedModelServiceApiKey?.serviceId ===
                              selectedModelService.serviceId
                                ? revealedModelServiceApiKey.value
                                : readStoredModelServiceApiKey(selectedModelService, "copy")
                            }
                            clearLabel={t("settings.modelServiceRemoveSavedApiKey")}
                            onClear={() => logoutModelService(selectedModelService)}
                          />
                        </div>
                      }
                    />
                  ) : null}
                  <SettingsListRow
                    title={t("settings.modelServiceCatalog")}
                    description={t("settings.modelServiceModelCounts", {
                      known: selectedModelService.knownModelCount,
                      available: selectedModelService.availableModelCount,
                    })}
                    actions={
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {modelServiceCatalogLabel(selectedModelService)}
                        </span>
                        {selectedModelService.supportsNetworkRefresh ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={modelServiceMutation !== null || authDialog !== null}
                            onClick={() => void refreshModelService(selectedModelService)}
                          >
                            {modelServiceMutation === `refresh:${selectedModelService.serviceId}`
                              ? t("settings.modelServiceRefreshing")
                              : t("settings.refreshModelCatalog")}
                          </Button>
                        ) : null}
                      </div>
                    }
                  />
                  <SettingsListRow
                    title={t("settings.modelServiceSource")}
                    description={modelServiceOriginLabel(selectedModelService)}
                    actions={
                      <span className="text-xs text-muted-foreground">
                        {selectedModelService.supportsNetworkRefresh
                          ? t("settings.modelServiceSupportsRefresh")
                          : t("settings.modelServiceStaticCatalog")}
                      </span>
                    }
                  />
                </SettingsCard>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-end justify-between gap-2 px-2">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        {t("settings.modelServiceModels")}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("settings.modelServiceModelsDescription", {
                          known: selectedModelService.knownModelCount,
                          available: selectedModelService.availableModelCount,
                        })}
                      </p>
                    </div>
                  </div>

                  {selectedModelServiceModelsKnown && selectedModelServiceModels.length > 8 ? (
                    <SearchInput
                      value={modelServiceModelSearch}
                      onChange={(event) => setModelServiceModelSearch(event.target.value)}
                      placeholder={t("settings.searchServiceModels")}
                      aria-label={t("settings.searchServiceModels")}
                      spellCheck={false}
                    />
                  ) : null}

                  {!selectedModelServiceModelsKnown ? (
                    <SettingsEmptyState>
                      {t("settings.modelServiceModelDetailsUnavailable")}
                    </SettingsEmptyState>
                  ) : filteredSelectedModelServiceModels.length > 0 ? (
                    <ul
                      data-model-service-model-list="compact-list"
                      className="list-none divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-background"
                    >
                      {filteredSelectedModelServiceModels.map((model) => (
                        <li
                          key={model.modelId}
                          className="flex min-w-0 items-center gap-3 px-3 py-2.5"
                        >
                          <ModelServiceIcon
                            serviceId={selectedModelService.serviceId}
                            modelId={model.modelId}
                            origin={selectedModelService.origin}
                            className="size-5"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {model.displayName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {model.modelId}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap justify-end gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                            <span
                              className={cn(
                                "font-medium",
                                model.available ? "text-primary" : "text-muted-foreground",
                              )}
                            >
                              {model.available
                                ? t("settings.modelServiceModelAvailable")
                                : t("settings.modelServiceModelNeedsAuth")}
                            </span>
                            {model.reasoning ? (
                              <span>{t("settings.modelServiceModelThinking")}</span>
                            ) : null}
                            {model.input.includes("image") ? (
                              <span>{t("settings.modelServiceModelImages")}</span>
                            ) : null}
                            {model.contextWindow > 0 ? (
                              <span>{modelContextLabel(model)}</span>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : selectedModelServiceModels.length > 0 ? (
                    <SettingsEmptyState>{t("settings.noMatchingServiceModels")}</SettingsEmptyState>
                  ) : (
                    <SettingsEmptyState>{t("settings.noServiceModels")}</SettingsEmptyState>
                  )}
                </div>
              </div>
            ) : (
              <SettingsEmptyState layout="status">
                {t("settings.modelServiceNotFound")}
              </SettingsEmptyState>
            )}
          </SettingsSectionShell>
        </div>
      ) : null}

      <Dialog
        open={authDialog !== null}
        onOpenChange={(open) => {
          if (!open) closeAuthDialog();
        }}
      >
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>
              {authDialog?.authType === "oauth"
                ? t("settings.modelServiceOAuthTitle", {
                    name: authDialog?.serviceName ?? "",
                  })
                : t("settings.modelServiceApiKeyTitle", {
                    name: authDialog?.serviceName ?? "",
                  })}
            </DialogTitle>
            <DialogDescription>
              {authDialog?.authType === "oauth"
                ? t("settings.modelServiceOAuthDescription")
                : t("settings.modelServiceApiKeyDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            {authDialog?.events.length ? (
              <div className="mb-3 space-y-2" aria-live="polite">
                {authDialog.events.map((event, index) => {
                  const externalUrl = authEventExternalUrl(event);
                  const externalHost = authEventExternalHost(event);
                  const providerDetail =
                    event.type === "auth_url"
                      ? event.instructions
                      : event.type === "info" || event.type === "progress"
                        ? event.message
                        : undefined;
                  return (
                    <div
                      key={`${event.type}:${index}`}
                      className="flex flex-wrap items-start justify-between gap-2 text-xs text-muted-foreground"
                    >
                      <div className="min-w-0 space-y-1">
                        <span>
                          {event.type === "device_code"
                            ? t("settings.modelServiceDeviceCode", {
                                code: event.userCode,
                              })
                            : event.type === "auth_url"
                              ? t("settings.modelServiceOpenOAuth")
                              : event.type === "progress"
                                ? t("settings.modelServiceProviderProgress")
                                : t("settings.modelServiceProviderNotice")}
                        </span>
                        {providerDetail ? (
                          <details>
                            <summary className="cursor-pointer select-none">
                              {t("settings.modelServiceProviderDetails")}
                            </summary>
                            <p className="mt-1 break-words">{providerDetail}</p>
                          </details>
                        ) : null}
                      </div>
                      {externalUrl && externalHost ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            void ensureNativeApi()
                              .shell.openExternal(externalUrl)
                              .catch(() => {
                                setAuthDialog((current) =>
                                  current
                                    ? {
                                        ...current,
                                        error: t("settings.modelServiceOAuthOpenFailed"),
                                      }
                                    : null,
                                );
                              })
                          }
                        >
                          {t("settings.modelServiceOpenOAuthAt", {
                            host: externalHost,
                          })}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {authDialog?.busy ? (
              <p role="status" className="text-sm text-muted-foreground">
                {t(
                  authDialog.authType === "oauth"
                    ? "settings.modelServiceOAuthWorking"
                    : "settings.modelServiceApiKeyWorking",
                )}
              </p>
            ) : authDialog?.prompt ? (
              <div className="space-y-2">
                <label htmlFor="model-service-auth-value" className="text-sm font-medium">
                  {t(
                    authDialog.prompt.type === "secret"
                      ? "settings.modelServicePromptSecret"
                      : authDialog.prompt.type === "manual_code"
                        ? "settings.modelServicePromptManualCode"
                        : authDialog.prompt.type === "select"
                          ? "settings.modelServicePromptSelect"
                          : "settings.modelServicePromptText",
                  )}
                </label>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none">
                    {t("settings.modelServiceProviderDetails")}
                  </summary>
                  <p className="mt-1 break-words">{authDialog.prompt.message}</p>
                </details>
                {authDialog.prompt.type === "select" ? (
                  <Select
                    value={authDialog.value}
                    onValueChange={(value) =>
                      setAuthDialog((current) =>
                        current ? { ...current, value: value ?? "" } : null,
                      )
                    }
                  >
                    <SelectTrigger
                      id="model-service-auth-value"
                      className="w-full"
                      aria-label={t("settings.modelServicePromptSelect")}
                    >
                      <SelectValue>
                        {authDialog.prompt.options.find((option) => option.id === authDialog.value)
                          ?.label ?? t("settings.modelServiceChooseAuthOption")}
                      </SelectValue>
                    </SelectTrigger>
                    <SettingsSelectPopup align="start">
                      {authDialog.prompt.options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SettingsSelectPopup>
                  </Select>
                ) : (
                  <Input
                    autoFocus
                    id="model-service-auth-value"
                    type={authDialog.prompt.type === "secret" ? "password" : "text"}
                    value={authDialog.value}
                    placeholder={t(
                      authDialog.prompt.type === "secret"
                        ? "settings.modelServicePromptSecret"
                        : authDialog.prompt.type === "manual_code"
                          ? "settings.modelServicePromptManualCode"
                          : "settings.modelServicePromptText",
                    )}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) =>
                      setAuthDialog((current) =>
                        current
                          ? {
                              ...current,
                              value: event.target.value,
                              error: null,
                            }
                          : null,
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || !authDialog.value) return;
                      event.preventDefault();
                      void answerAuthPrompt();
                    }}
                  />
                )}
              </div>
            ) : null}
            {authDialog?.error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {authDialog.error}
              </p>
            ) : null}
          </DialogPanel>
          <DialogFooter>
            {authDialog?.authType === "oauth" &&
            authDialog.oauthPromptMode === "provider_default" &&
            selectedModelService?.serviceId === authDialog.serviceId ? (
              <Button
                variant="ghost"
                onClick={() =>
                  void beginModelServiceLogin(selectedModelService, "oauth", "interactive")
                }
              >
                {t("settings.modelServiceOtherSignInOptions")}
              </Button>
            ) : null}
            <Button variant="outline" onClick={closeAuthDialog}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!authDialog?.prompt || authDialog.busy || !authDialog.value}
              onClick={() => void answerAuthPrompt()}
            >
              {t("settings.modelServiceContinue")}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <AlertDialog
        open={pendingCustomServiceRiskAction !== null}
        onOpenChange={(open) => !open && setPendingCustomServiceRiskAction(null)}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                pendingCustomServiceRiskNeedsEndpoint
                  ? pendingCustomServiceRiskAction === "save"
                    ? "settings.customApiSaveRiskTitle"
                    : pendingCustomServiceRiskAction === "discover"
                      ? "settings.customApiDiscoveryRiskTitle"
                      : "settings.customApiRiskTitle"
                  : "settings.customApiCommandRiskTitle",
              )}
            </AlertDialogTitle>
            {pendingCustomServiceRiskNeedsEndpoint ? (
              <AlertDialogDescription>
                {t(
                  pendingCustomServiceRiskAction === "save"
                    ? "settings.customApiSaveRiskDescription"
                    : pendingCustomServiceRiskAction === "discover"
                      ? "settings.customApiDiscoveryRiskDescription"
                      : "settings.customApiRiskDescription",
                )}
              </AlertDialogDescription>
            ) : null}
            {pendingCustomServiceRiskNeedsCommand ? (
              <p className="text-sm leading-relaxed text-destructive">
                {t("settings.customApiCredentialCommandExecutionWarning")}
              </p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" size="sm" />}>
              {t("common.cancel")}
            </AlertDialogClose>
            <Button size="sm" onClick={confirmCustomServiceRisk}>
              {pendingCustomServiceRiskAction === "save"
                ? t("settings.customApiRiskContinueSave")
                : pendingCustomServiceRiskAction === "discover"
                  ? t("settings.customApiRiskContinueDiscover")
                  : t("settings.customApiRiskContinueTest")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      <AlertDialog
        open={customServiceDiscardRequested || customServiceNavigationBlocker.status === "blocked"}
        onOpenChange={(open) => !open && cancelCustomServiceDiscard()}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.customApiDiscardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.customApiDiscardDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" size="sm" onClick={cancelCustomServiceDiscard}>
              {t("settings.customApiKeepEditing")}
            </Button>
            <Button size="sm" variant="destructive" onClick={confirmCustomServiceDiscard}>
              {t("settings.customApiDiscardConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      <AlertDialog
        open={logoutService !== null}
        onOpenChange={(open) => !open && setLogoutService(null)}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.signOutModelService")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.signOutModelServiceDescription", {
                name: logoutService ? modelServiceInstanceLabel(logoutService) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" size="sm" />}>
              {t("common.cancel")}
            </AlertDialogClose>
            <Button
              size="sm"
              variant="destructive"
              disabled={modelServiceMutation !== null}
              onClick={() => void logoutModelService()}
            >
              {modelServiceMutation?.startsWith("logout:")
                ? t("settings.signingOutModelService")
                : t("settings.signOutModelService")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      <AlertDialog
        open={removeCustomService !== null}
        onOpenChange={(open) => !open && setRemoveCustomService(null)}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.customApiDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(customApiDeleteDescriptionKey(removeCustomService), {
                name: removeCustomService ? modelServiceInstanceLabel(removeCustomService) : "",
              })}
              {removeCustomServiceReferenceCount > 0 ? (
                <span className="mt-2 block">
                  {t("settings.customApiDeleteReferences", {
                    count: removeCustomServiceReferenceCount,
                  })}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" size="sm" />}>
              {t("common.cancel")}
            </AlertDialogClose>
            <Button
              size="sm"
              variant="destructive"
              disabled={modelServiceMutation !== null}
              onClick={() => void confirmRemoveCustomService()}
            >
              {modelServiceMutation?.startsWith("custom:remove:")
                ? t("settings.customApiDeleting")
                : t("common.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}
