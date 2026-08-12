// FILE: ModelsSettingsPanel.tsx
// Purpose: Own model-setting discovery, selection, and custom-model editing workflows.
// Layer: Settings panel

import {
  DEFAULT_GIT_TEXT_GENERATION_MODEL,
  PROVIDER_DISPLAY_NAMES,
  WS_OMNIMIND_MODEL_SERVICES_CAPABILITY,
  type OmniMindModelServiceDescriptor,
  type ProviderKind,
} from "@omnimind/contracts";
import { getModelOptions, normalizeModelSlug } from "@omnimind/shared/model";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useId, useMemo, useState, useSyncExternalStore } from "react";

import {
  CUSTOM_MODEL_EDITOR_PROVIDER_SETTINGS,
  type AppSettingsBinding,
  MAX_CUSTOM_MODEL_LENGTH,
  getCustomModelsForProvider,
  getDefaultCustomModelsForProvider,
  getGitTextGenerationModelOptions,
  isGitTextGenerationSettingsDirty,
  patchCustomModels,
} from "~/appSettings";
import { useProviderModelCatalog } from "~/hooks/useProviderModelCatalog";
import { PlusIcon, XIcon } from "~/lib/icons";
import {
  onNativeApiServerCapabilitiesChange,
  readNativeApiServerCapabilityState,
} from "~/nativeApi";
import {
  omniMindModelServiceDetailQueryOptions,
  omniMindModelServicesListQueryOptions,
} from "~/lib/omnimindModelServicesReactQuery";
import { resolveProviderDiscoveryCwd } from "~/lib/providerDiscovery";
import { serverConfigQueryOptions } from "~/lib/serverReactQuery";
import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";
import {
  SETTINGS_CARD_ROW_DIVIDER_CLASS_NAME,
  SETTINGS_INSET_LIST_CLASS_NAME,
} from "~/settingsPanelStyles";

import { Button } from "../ui/button";
import { DisclosureChevron } from "../ui/DisclosureChevron";
import { DisclosureRegion } from "../ui/DisclosureRegion";
import { Input } from "../ui/input";
import { Select, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  SettingResetButton,
  SettingsSelectControl,
  useSettingsRestoreSignal,
} from "./SettingControls";
import {
  SettingsCard,
  SettingsEmptyState,
  SettingsListRow,
  SettingsRow,
  SettingsSection,
  SettingsSectionShell,
  SettingsSelectPopup,
} from "./SettingsPanelPrimitives";

type CustomModelValidationResult =
  | { readonly model: string; readonly error?: never }
  | { readonly model?: never; readonly error: string };

const GIT_WRITING_DISCOVERY_PROVIDERS = ["codex", "kilo", "opencode"] as const;
const INDEPENDENT_ENGINE_MODEL_EDITOR_SETTINGS = CUSTOM_MODEL_EDITOR_PROVIDER_SETTINGS.filter(
  (config) => config.provider !== "omnimind",
);
const subscribeModelServicesCapability = (listener: () => void) =>
  onNativeApiServerCapabilitiesChange(listener);
const readModelServicesCapability = () =>
  readNativeApiServerCapabilityState(WS_OMNIMIND_MODEL_SERVICES_CAPABILITY);
const readServerModelServicesCapability = () => null;

export function validateCustomModelInput(input: {
  readonly provider: ProviderKind;
  readonly value: string;
  readonly savedModels: readonly string[];
}): CustomModelValidationResult {
  const normalized = normalizeModelSlug(input.value, input.provider);
  if (!normalized) {
    return { error: "Enter a model slug." };
  }
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

function isCustomModelEditorProvider(value: string | null): value is ProviderKind {
  return INDEPENDENT_ENGINE_MODEL_EDITOR_SETTINGS.some((config) => config.provider === value);
}

export function ModelsSettingsPanel({
  active,
  ...binding
}: AppSettingsBinding & { readonly resetEpoch: number; readonly active: boolean }) {
  if (!active) return null;
  return <ActiveModelsSettingsPanel active {...binding} />;
}

function ActiveModelsSettingsPanel({
  settings,
  defaults,
  updateSettings,
  resetEpoch,
  active,
}: AppSettingsBinding & { readonly resetEpoch: number; readonly active: boolean }) {
  const { t } = useI18n();
  const modelServicesCapability = useSyncExternalStore(
    subscribeModelServicesCapability,
    readModelServicesCapability,
    readServerModelServicesCapability,
  );
  const serverConfigQuery = useQuery({ ...serverConfigQueryOptions(), enabled: active });
  const [selectedModelServiceId, setSelectedModelServiceId] = useState<string | null>(null);
  const modelServiceDetailRegionId = useId();
  const independentEngineModelsRegionId = useId();
  const modelServicesQuery = useQuery(
    omniMindModelServicesListQueryOptions({
      enabled: active && modelServicesCapability === true,
    }),
  );
  const modelServiceDetailQuery = useQuery(
    omniMindModelServiceDetailQueryOptions({
      enabled: active && modelServicesCapability === true,
      serviceId: selectedModelServiceId,
    }),
  );
  const [selectedCustomModelProvider, setSelectedCustomModelProvider] =
    useState<ProviderKind>("codex");
  const [customModelInputByProvider, setCustomModelInputByProvider] = useState<
    Partial<Record<ProviderKind, string>>
  >({});
  const [customModelErrorByProvider, setCustomModelErrorByProvider] = useState<
    Partial<Record<ProviderKind, string | null>>
  >({});
  const [showAllCustomModels, setShowAllCustomModels] = useState(false);
  const [independentEngineModelsOpen, setIndependentEngineModelsOpen] = useState(false);

  useSettingsRestoreSignal(resetEpoch, () => {
    setSelectedModelServiceId(null);
    setSelectedCustomModelProvider("codex");
    setCustomModelInputByProvider({});
    setCustomModelErrorByProvider({});
    setShowAllCustomModels(false);
    setIndependentEngineModelsOpen(false);
  });

  const {
    customCodexModels,
    customKiloModels,
    customOpenCodeModels,
    textGenerationModel,
    textGenerationProvider,
  } = settings;
  const currentGitTextGenerationProvider = textGenerationProvider ?? "codex";
  const currentGitTextGenerationModel = textGenerationModel ?? DEFAULT_GIT_TEXT_GENERATION_MODEL;
  const gitWritingModelHintByProvider = useMemo<Partial<Record<ProviderKind, string | null>>>(
    () => ({ [currentGitTextGenerationProvider]: currentGitTextGenerationModel }),
    [currentGitTextGenerationModel, currentGitTextGenerationProvider],
  );
  const providerModelDiscoveryCwd = resolveProviderDiscoveryCwd({
    activeThreadWorktreePath: null,
    activeProjectCwd: null,
    serverCwd: serverConfigQuery.data?.cwd ?? null,
  });
  const { modelOptionsByProvider: gitWritingCatalogOptionsByProvider } = useProviderModelCatalog({
    selectedProvider: currentGitTextGenerationProvider,
    discoveryEnabled: active,
    cwd: providerModelDiscoveryCwd,
    modelHintByProvider: gitWritingModelHintByProvider,
    prefetchProviders: GIT_WRITING_DISCOVERY_PROVIDERS,
  });
  const gitTextGenerationModelOptions = useMemo(
    () =>
      getGitTextGenerationModelOptions(
        {
          customCodexModels,
          customKiloModels,
          customOpenCodeModels,
          textGenerationModel,
          textGenerationProvider,
        },
        {
          codex: gitWritingCatalogOptionsByProvider.codex,
          kilo: gitWritingCatalogOptionsByProvider.kilo,
          opencode: gitWritingCatalogOptionsByProvider.opencode,
        },
      ),
    [
      customCodexModels,
      customKiloModels,
      customOpenCodeModels,
      gitWritingCatalogOptionsByProvider.codex,
      gitWritingCatalogOptionsByProvider.kilo,
      gitWritingCatalogOptionsByProvider.opencode,
      textGenerationModel,
      textGenerationProvider,
    ],
  );
  const currentGitTextGenerationValue = `${currentGitTextGenerationProvider}:${currentGitTextGenerationModel}`;
  const isGitTextGenerationModelDirty = isGitTextGenerationSettingsDirty(settings, defaults);
  const selectedGitTextGenerationModelLabel =
    gitTextGenerationModelOptions.find(
      (option) =>
        option.provider === currentGitTextGenerationProvider &&
        option.slug === currentGitTextGenerationModel,
    )?.name ?? currentGitTextGenerationModel;
  const selectedCustomModelProviderSettings = INDEPENDENT_ENGINE_MODEL_EDITOR_SETTINGS.find(
    (config) => config.provider === selectedCustomModelProvider,
  )!;
  const selectedCustomModelInput = customModelInputByProvider[selectedCustomModelProvider] ?? "";
  const selectedCustomModelError = customModelErrorByProvider[selectedCustomModelProvider] ?? null;
  const savedCustomModelRows = useMemo(
    () =>
      CUSTOM_MODEL_EDITOR_PROVIDER_SETTINGS.flatMap((config) =>
        getCustomModelsForProvider(settings, config.provider).map((slug) => ({
          key: `${config.provider}:${slug}`,
          provider: config.provider,
          providerTitle: config.title,
          slug,
        })),
      ),
    [settings],
  );
  const visibleCustomModelRows = savedCustomModelRows.slice(0, 5);
  const overflowCustomModelRows = savedCustomModelRows.slice(5);
  const resettableCustomModelCount = savedCustomModelRows.filter(
    (row) => row.provider !== "omnimind",
  ).length;
  const selectedModelService = modelServiceDetailQuery.data?.service ?? null;
  const modelServiceDisplayNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const service of modelServicesQuery.data?.services ?? []) {
      counts.set(service.displayName, (counts.get(service.displayName) ?? 0) + 1);
    }
    return counts;
  }, [modelServicesQuery.data?.services]);

  const modelServiceInstanceLabel = useCallback(
    (service: OmniMindModelServiceDescriptor) =>
      (modelServiceDisplayNameCounts.get(service.displayName) ?? 0) > 1
        ? t("settings.modelServiceInstanceNamed", {
            name: service.displayName,
            id: service.serviceId,
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

  const addCustomModel = useCallback(
    (provider: ProviderKind) => {
      const customModels = getCustomModelsForProvider(settings, provider);
      const result = validateCustomModelInput({
        provider,
        value: customModelInputByProvider[provider] ?? "",
        savedModels: customModels,
      });
      if ("error" in result) {
        setCustomModelErrorByProvider((existing) => ({
          ...existing,
          [provider]:
            result.error === "Enter a model slug."
              ? t("settings.enterModelSlug")
              : result.error === "That model is already built in."
                ? t("settings.modelAlreadyBuiltIn")
                : result.error === "That custom model is already saved."
                  ? t("settings.customModelAlreadySaved")
                  : t("settings.modelSlugTooLong", { max: MAX_CUSTOM_MODEL_LENGTH }),
        }));
        return;
      }

      updateSettings(patchCustomModels(provider, [...customModels, result.model]));
      setCustomModelInputByProvider((existing) => ({ ...existing, [provider]: "" }));
      setCustomModelErrorByProvider((existing) => ({ ...existing, [provider]: null }));
    },
    [customModelInputByProvider, settings, t, updateSettings],
  );

  const removeCustomModel = useCallback(
    (provider: ProviderKind, slug: string) => {
      const customModels = getCustomModelsForProvider(settings, provider);
      updateSettings(
        patchCustomModels(
          provider,
          customModels.filter((model) => model !== slug),
        ),
      );
      setCustomModelErrorByProvider((existing) => ({ ...existing, [provider]: null }));
    },
    [settings, updateSettings],
  );

  const resetCustomModels = useCallback(() => {
    const patch = Object.assign(
      {},
      ...INDEPENDENT_ENGINE_MODEL_EDITOR_SETTINGS.map((config) =>
        patchCustomModels(config.provider, [
          ...getDefaultCustomModelsForProvider(defaults, config.provider),
        ]),
      ),
    );
    updateSettings(patch);
    setCustomModelErrorByProvider({});
    setShowAllCustomModels(false);
  }, [defaults, updateSettings]);

  const renderCustomModelRow = (
    row: (typeof savedCustomModelRows)[number],
    removeFirstBorder: boolean,
  ) => (
    <div
      key={row.key}
      className={cn(
        "group grid grid-cols-[minmax(5rem,6rem)_minmax(0,1fr)_auto] items-center gap-3 border-t border-[color:var(--color-border)] px-4 py-2",
        removeFirstBorder && "first:border-t-0",
      )}
    >
      <span className="truncate text-xs text-muted-foreground">{row.providerTitle}</span>
      <code className="min-w-0 truncate text-sm text-foreground">{row.slug}</code>
      <button
        type="button"
        className="shrink-0 rounded-sm opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label={t("settings.removeModel", { model: row.slug })}
        onClick={() => removeCustomModel(row.provider, row.slug)}
      >
        <XIcon className="size-3.5 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <SettingsSectionShell
        title={t("settings.configuredModelServices")}
        action={
          modelServicesQuery.isFetching && !modelServicesQuery.isPending ? (
            <span role="status" className="text-xs text-muted-foreground">
              {t("settings.modelServicesChecking")}
            </span>
          ) : null
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
          ) : modelServicesQuery.isError ? (
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
                    title={instanceLabel}
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
                            ? t("settings.hideDetailsNamed", { name: instanceLabel })
                            : t("settings.viewDetailsNamed", { name: instanceLabel })
                        }
                        onClick={() =>
                          setSelectedModelServiceId((current) =>
                            current === service.serviceId ? null : service.serviceId,
                          )
                        }
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
            </SettingsEmptyState>
          )}
        </div>
      </SettingsSectionShell>

      {selectedModelServiceId ? (
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
              <Button size="sm" variant="ghost" onClick={() => setSelectedModelServiceId(null)}>
                {t("settings.close")}
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
              <SettingsCard>
                <SettingsListRow
                  title={t("settings.modelServiceAuthentication")}
                  description={modelServiceAuthLabel(selectedModelService)}
                  actions={
                    <span
                      className="max-w-[min(18rem,45vw)] break-words text-right text-xs text-muted-foreground"
                      title={
                        selectedModelService.authMethods.length > 0
                          ? selectedModelService.authMethods
                              .map((method) => method.label)
                              .join(" · ")
                          : undefined
                      }
                    >
                      {selectedModelService.authMethods.length > 0
                        ? selectedModelService.authMethods.map((method) => method.label).join(" · ")
                        : t("settings.modelServiceNoInteractiveAuth")}
                    </span>
                  }
                />
                <SettingsListRow
                  title={t("settings.modelServiceCatalog")}
                  description={t("settings.modelServiceModelCounts", {
                    known: selectedModelService.knownModelCount,
                    available: selectedModelService.availableModelCount,
                  })}
                  actions={
                    <span className="text-xs text-muted-foreground">
                      {modelServiceCatalogLabel(selectedModelService)}
                    </span>
                  }
                />
                <SettingsListRow
                  title={t("settings.modelServiceSource")}
                  description={modelServiceOriginLabel(selectedModelService)}
                  actions={
                    selectedModelService.supportsNetworkRefresh ? (
                      <span className="text-xs text-muted-foreground">
                        {t("settings.modelServiceSupportsRefresh")}
                      </span>
                    ) : null
                  }
                />
              </SettingsCard>
            ) : (
              <SettingsEmptyState layout="status">
                {t("settings.modelServiceNotFound")}
              </SettingsEmptyState>
            )}
          </SettingsSectionShell>
        </div>
      ) : null}

      <SettingsSection title={t("settings.customModels")}>
        <SettingsRow
          title={
            <span id="setting-saved-model-slugs" className="scroll-mt-24">
              {t("settings.independentEngineModels")}
            </span>
          }
          description={t("settings.independentEngineModelsDescription")}
          status={t("settings.engineManaged")}
          resetAction={
            resettableCustomModelCount > 0 ? (
              <SettingResetButton label={t("settings.customModels")} onClick={resetCustomModels} />
            ) : null
          }
          control={
            <Button
              size="xs"
              variant="ghost"
              aria-expanded={independentEngineModelsOpen}
              aria-controls={independentEngineModelsRegionId}
              onClick={() => setIndependentEngineModelsOpen((current) => !current)}
            >
              {t("settings.reviewAction")}
              <DisclosureChevron open={independentEngineModelsOpen} className="ml-1 size-3.5" />
            </Button>
          }
        >
          <div id={independentEngineModelsRegionId}>
            <DisclosureRegion
              open={independentEngineModelsOpen}
              contentClassName={cn("mt-4 pt-4", SETTINGS_CARD_ROW_DIVIDER_CLASS_NAME)}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={selectedCustomModelProvider}
                  onValueChange={(value) => {
                    if (isCustomModelEditorProvider(value)) {
                      setSelectedCustomModelProvider(value);
                    }
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-full sm:w-40"
                    aria-label={t("settings.engineModelProvider")}
                  >
                    <SelectValue>{selectedCustomModelProviderSettings.title}</SelectValue>
                  </SelectTrigger>
                  <SettingsSelectPopup align="start">
                    {INDEPENDENT_ENGINE_MODEL_EDITOR_SETTINGS.map((config) => (
                      <SelectItem hideIndicator key={config.provider} value={config.provider}>
                        {config.title}
                      </SelectItem>
                    ))}
                  </SettingsSelectPopup>
                </Select>
                <Input
                  id="custom-model-slug"
                  size="sm"
                  variant="soft"
                  value={selectedCustomModelInput}
                  aria-label={t("settings.engineModelSlug")}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCustomModelInputByProvider((existing) => ({
                      ...existing,
                      [selectedCustomModelProvider]: value,
                    }));
                    if (selectedCustomModelError) {
                      setCustomModelErrorByProvider((existing) => ({
                        ...existing,
                        [selectedCustomModelProvider]: null,
                      }));
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    addCustomModel(selectedCustomModelProvider);
                  }}
                  placeholder={selectedCustomModelProviderSettings.example}
                  spellCheck={false}
                />
                <Button
                  className="shrink-0"
                  variant="outline"
                  onClick={() => addCustomModel(selectedCustomModelProvider)}
                >
                  <PlusIcon className="size-3.5" />
                  {t("settings.add")}
                </Button>
              </div>

              {selectedCustomModelError ? (
                <p className="mt-2 text-xs text-destructive">{selectedCustomModelError}</p>
              ) : null}

              {savedCustomModelRows.length > 0 ? (
                <div className={cn("mt-3", SETTINGS_INSET_LIST_CLASS_NAME)}>
                  {visibleCustomModelRows.map((row) => renderCustomModelRow(row, true))}
                  {overflowCustomModelRows.length > 0 ? (
                    <>
                      <DisclosureRegion open={showAllCustomModels}>
                        <div>
                          {overflowCustomModelRows.map((row) => renderCustomModelRow(row, false))}
                        </div>
                      </DisclosureRegion>
                      <button
                        type="button"
                        className="mt-2 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        aria-expanded={showAllCustomModels}
                        onClick={() => setShowAllCustomModels((value) => !value)}
                      >
                        {showAllCustomModels
                          ? t("settings.showLess")
                          : t("settings.showMore", { count: overflowCustomModelRows.length })}
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </DisclosureRegion>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t("settings.generationDefaults")}>
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
                if (!value) return;
                const separatorIndex = value.indexOf(":");
                const provider = value.slice(0, separatorIndex) as ProviderKind;
                const model = value.slice(separatorIndex + 1);
                if (!provider || !model) return;
                updateSettings({
                  textGenerationProvider: provider,
                  textGenerationModel: model,
                });
              }}
              ariaLabel={t("settings.gitTextGenerationModel")}
              triggerClassName="w-full sm:w-52"
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
      </SettingsSection>
    </div>
  );
}
