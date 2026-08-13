// FILE: ModelsSettingsPanel.tsx
// Purpose: Own OmniMind model-service discovery, authentication, catalog, and recovery workflows.
// Layer: Settings panel

import {
  WS_OMNIMIND_MODEL_SERVICES_CAPABILITY,
  type OmniMindModelServiceAuthEvent,
  type OmniMindModelServiceAuthPrompt,
  type OmniMindModelServiceAuthResult,
  type OmniMindModelServiceDescriptor,
  type OmniMindModelServiceOAuthPromptMode,
} from "@omnimind/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { type AppSettingsBinding } from "~/appSettings";
import {
  onNativeApiServerCapabilitiesChange,
  ensureNativeApi,
  readNativeApiServerCapabilityState,
} from "~/nativeApi";
import {
  omniMindModelServicesQueryKeys,
  omniMindModelServiceDetailQueryOptions,
  omniMindModelServicesListQueryOptions,
} from "~/lib/omnimindModelServicesReactQuery";
import { providerDiscoveryQueryKeys } from "~/lib/providerDiscoveryReactQuery";
import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";

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
import { SearchInput } from "../ui/search-input";
import { Select, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ArrowLeftIcon, ChevronRightIcon, PlusIcon } from "~/lib/icons";
import { useSettingsRestoreSignal } from "./SettingControls";
import {
  SettingsCard,
  SettingsEmptyState,
  SettingsListRow,
  SettingsSection,
  SettingsSectionShell,
  SettingsSelectPopup,
} from "./SettingsPanelPrimitives";

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

const subscribeModelServicesCapability = (listener: () => void) =>
  onNativeApiServerCapabilitiesChange(listener);
const readModelServicesCapability = () =>
  readNativeApiServerCapabilityState(WS_OMNIMIND_MODEL_SERVICES_CAPABILITY);
const readServerModelServicesCapability = () => null;

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
  ...binding
}: AppSettingsBinding & { readonly resetEpoch: number; readonly active: boolean }) {
  if (!active) return null;
  return <ActiveModelsSettingsPanel active {...binding} />;
}

function ActiveModelsSettingsPanel({
  resetEpoch,
  active,
}: AppSettingsBinding & { readonly resetEpoch: number; readonly active: boolean }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const authRequestControllerRef = useRef<AbortController | null>(null);
  const authRequestIdRef = useRef<string | null>(null);
  const openedAuthUrlsRef = useRef(new Set<string>());
  const modelServicesCapability = useSyncExternalStore(
    subscribeModelServicesCapability,
    readModelServicesCapability,
    readServerModelServicesCapability,
  );
  const [selectedModelServiceId, setSelectedModelServiceId] = useState<string | null>(null);
  const [modelServiceBrowserOpen, setModelServiceBrowserOpen] = useState(false);
  const [modelServiceSearch, setModelServiceSearch] = useState("");
  const [modelServiceDetailReturnView, setModelServiceDetailReturnView] = useState<
    "overview" | "browser"
  >("overview");
  const [authDialog, setAuthDialog] = useState<ModelServiceAuthDialogState | null>(null);
  const [logoutService, setLogoutService] = useState<OmniMindModelServiceDescriptor | null>(null);
  const [modelServiceMutation, setModelServiceMutation] = useState<string | null>(null);
  const [modelServiceNotice, setModelServiceNotice] = useState<ModelServiceNotice | null>(null);
  const modelServiceDetailRegionId = useId();
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
    },
    [cancelCurrentAuthRequest],
  );

  useSettingsRestoreSignal(resetEpoch, () => {
    setSelectedModelServiceId(null);
    setModelServiceBrowserOpen(false);
    setModelServiceSearch("");
    setModelServiceDetailReturnView("overview");
    void cancelCurrentAuthRequest();
    setAuthDialog(null);
    setLogoutService(null);
    setModelServiceMutation(null);
    setModelServiceNotice(null);
  });
  const selectedModelService = modelServiceDetailQuery.data?.service ?? null;
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
      ...(modelServicesQuery.data?.connectableServices ?? []),
    ]) {
      counts.set(service.displayName, (counts.get(service.displayName) ?? 0) + 1);
    }
    return counts;
  }, [modelServicesQuery.data?.connectableServices, modelServicesQuery.data?.services]);

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

  const invalidateModelServiceConsumers = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: omniMindModelServicesQueryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: providerDiscoveryQueryKeys.modelsForProvider("omnimind"),
      }),
    ]);
  }, [queryClient]);

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
    },
    [invalidateModelServiceConsumers, t],
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
            ? { serviceId: service.serviceId, authType, promptMode: oauthPromptMode }
            : { serviceId: service.serviceId, authType },
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

  const refreshModelService = useCallback(
    async (service: OmniMindModelServiceDescriptor) => {
      setModelServiceMutation(`refresh:${service.serviceId}`);
      setModelServiceNotice(null);
      try {
        const result = await ensureNativeApi().omnimindModelServices.refresh({
          serviceId: service.serviceId,
        });
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
        if (result.state === "success") await invalidateModelServiceConsumers();
      } catch {
        setModelServiceNotice({
          tone: "error",
          text: t("settings.modelServiceRefreshFailed"),
        });
      } finally {
        setModelServiceMutation(null);
      }
    },
    [invalidateModelServiceConsumers, t],
  );

  const logoutModelService = useCallback(async () => {
    const service = logoutService;
    if (!service) return;
    const isOAuth = service.storedCredentialType === "oauth";
    setModelServiceMutation(`logout:${service.serviceId}`);
    setModelServiceNotice(null);
    try {
      const result = await ensureNativeApi().omnimindModelServices.logout({
        serviceId: service.serviceId,
      });
      setLogoutService(null);
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
  }, [invalidateModelServiceConsumers, logoutService, t]);

  const connectableModelServices = modelServicesQuery.data?.connectableServices ?? [];
  const configuredModelServices = modelServicesQuery.data?.services ?? [];
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

  const openModelServiceDetails = useCallback(
    (serviceId: string, returnView: "overview" | "browser") => {
      setModelServiceDetailReturnView(returnView);
      setSelectedModelServiceId(serviceId);
    },
    [],
  );

  const closeModelServiceDetails = useCallback(() => {
    setSelectedModelServiceId(null);
    setModelServiceBrowserOpen(modelServiceDetailReturnView === "browser");
  }, [modelServiceDetailReturnView]);

  return (
    <div className="space-y-6">
      {!selectedModelServiceId && !modelServiceBrowserOpen ? (
        <SettingsSectionShell
          title={t("settings.configuredModelServices")}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {modelServicesQuery.isFetching && !modelServicesQuery.isPending ? (
                <span role="status" className="text-xs text-muted-foreground">
                  {t("settings.modelServicesChecking")}
                </span>
              ) : null}
              {connectableModelServices.length > 0 && configuredModelServices.length > 0 ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setModelServiceSearch("");
                    setModelServiceBrowserOpen(true);
                  }}
                >
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
                {connectableModelServices.length > 0 ? (
                  <Button
                    className="mt-4"
                    onClick={() => {
                      setModelServiceSearch("");
                      setModelServiceBrowserOpen(true);
                    }}
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

      {!selectedModelServiceId && modelServiceBrowserOpen ? (
        <SettingsSectionShell
          title={t("settings.addModelService")}
          action={
            <Button size="sm" variant="ghost" onClick={() => setModelServiceBrowserOpen(false)}>
              <ArrowLeftIcon aria-hidden="true" />
              {t("common.back")}
            </Button>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="mb-3 text-sm text-muted-foreground">
                {t("settings.chooseModelServiceDescription")}
              </p>
              <SearchInput
                autoFocus
                value={modelServiceSearch}
                onChange={(event) => setModelServiceSearch(event.target.value)}
                placeholder={t("settings.searchModelServices")}
                aria-label={t("settings.searchModelServices")}
                spellCheck={false}
              />
            </div>
            {filteredConnectableModelServices.length > 0 ? (
              <ul className="grid list-none gap-2 sm:grid-cols-2">
                {filteredConnectableModelServices.map((service) => {
                  const instanceLabel = modelServiceInstanceLabel(service);
                  return (
                    <li key={service.serviceId}>
                      <button
                        type="button"
                        className={cn(
                          "group flex min-h-20 w-full items-center gap-3 rounded-xl border border-border bg-foreground/[0.025] px-4 py-3 text-left outline-none transition-colors",
                          "hover:border-foreground/20 hover:bg-foreground/[0.045]",
                          "focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                        )}
                        aria-label={t("settings.connectModelServiceNamed", {
                          name: instanceLabel,
                        })}
                        onClick={() => openModelServiceDetails(service.serviceId, "browser")}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {instanceLabel}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                            {service.authMethods.length > 0
                              ? service.authMethods.map((method) => method.label).join(" · ")
                              : modelServiceAuthLabel(service)}
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
            ) : (
              <SettingsEmptyState>{t("settings.noMatchingModelServices")}</SettingsEmptyState>
            )}
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
              <Button size="sm" variant="ghost" onClick={closeModelServiceDetails}>
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
              <SettingsCard>
                <SettingsListRow
                  title={t("settings.modelServiceAuthentication")}
                  description={modelServiceAuthLabel(selectedModelService)}
                  actions={
                    <div className="flex max-w-[min(24rem,55vw)] flex-wrap items-center justify-end gap-2">
                      <span
                        className="break-words text-right text-xs text-muted-foreground"
                        title={
                          selectedModelService.authMethods.length > 0
                            ? selectedModelService.authMethods
                                .map((method) => method.label)
                                .join(" · ")
                            : undefined
                        }
                      >
                        {selectedModelService.authMethods.length > 0
                          ? selectedModelService.authMethods
                              .map((method) => method.label)
                              .join(" · ")
                          : t("settings.modelServiceNoInteractiveAuth")}
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
                          onClick={() => void beginModelServiceLogin(selectedModelService, "oauth")}
                        >
                          {selectedModelService.storedCredentialType === "oauth"
                            ? t("settings.signInAgain")
                            : t("settings.signInWithBrowser")}
                        </Button>
                      ) : null}
                      {selectedModelService.storedCredentialType === "api_key" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={modelServiceMutation !== null || authDialog !== null}
                          onClick={() => setLogoutService(selectedModelService)}
                        >
                          {t("settings.removeApiKey")}
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
                  return (
                    <div
                      key={`${event.type}:${index}`}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
                    >
                      <span>
                        {event.type === "device_code"
                          ? t("settings.modelServiceDeviceCode", { code: event.userCode })
                          : event.type === "auth_url"
                            ? (event.instructions ?? t("settings.modelServiceOpenOAuth"))
                            : event.message}
                      </span>
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
                          {t("settings.modelServiceOpenOAuthAt", { host: externalHost })}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {authDialog?.busy ? (
              <p role="status" className="text-sm text-muted-foreground">
                {t("settings.modelServiceAuthWorking")}
              </p>
            ) : authDialog?.prompt ? (
              <div className="space-y-2">
                <label htmlFor="model-service-auth-value" className="text-sm font-medium">
                  {authDialog.prompt.message}
                </label>
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
                      aria-label={authDialog.prompt.message}
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
                    placeholder={authDialog.prompt.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) =>
                      setAuthDialog((current) =>
                        current ? { ...current, value: event.target.value, error: null } : null,
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
        open={logoutService !== null}
        onOpenChange={(open) => !open && setLogoutService(null)}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {logoutService?.storedCredentialType === "oauth"
                ? t("settings.signOutModelService")
                : t("settings.removeApiKey")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                logoutService?.storedCredentialType === "oauth"
                  ? "settings.signOutModelServiceDescription"
                  : "settings.removeApiKeyDescription",
                {
                  name: logoutService ? modelServiceInstanceLabel(logoutService) : "",
                },
              )}
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
                ? logoutService?.storedCredentialType === "oauth"
                  ? t("settings.signingOutModelService")
                  : t("settings.removingApiKey")
                : logoutService?.storedCredentialType === "oauth"
                  ? t("settings.signOutModelService")
                  : t("settings.removeApiKey")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}
