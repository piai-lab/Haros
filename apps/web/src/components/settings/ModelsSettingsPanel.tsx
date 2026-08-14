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
  type OmniMindModelServiceModel,
  type OmniMindCustomModelServiceApi,
  type OmniMindCustomModelServiceConfigInput,
  type OmniMindCustomModelServiceModelInput,
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
  onNativeApiTransportStateChange,
  ensureNativeApi,
  readNativeApiServerCapabilityState,
  readNativeApiTransportState,
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
import { Checkbox } from "../ui/checkbox";
import { SearchInput } from "../ui/search-input";
import { Select, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ArrowLeftIcon, ChevronRightIcon, PlusIcon } from "~/lib/icons";
import { ModelServiceIcon } from "../ModelServiceIcon";
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

interface CustomModelServiceEditorState {
  readonly mode: "create" | "edit";
  readonly serviceId: string | null;
  readonly displayName: string;
  readonly api: OmniMindCustomModelServiceApi;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly models: ReadonlyArray<OmniMindCustomModelServiceModelInput>;
  readonly testedFingerprint: string | null;
  readonly testState: "idle" | "testing" | "success" | "failed";
}

const DEFAULT_CUSTOM_MODEL: OmniMindCustomModelServiceModelInput = {
  modelId: "",
  displayName: "",
  reasoning: false,
  input: ["text"],
  // Pi requires these facts, but the Host must not invent a capability default.
  contextWindow: 0,
  maxTokens: 0,
};

function createCustomModelServiceEditor(): CustomModelServiceEditorState {
  return {
    mode: "create",
    serviceId: null,
    displayName: "",
    api: "openai-completions",
    baseUrl: "",
    apiKey: "",
    models: [{ ...DEFAULT_CUSTOM_MODEL }],
    testedFingerprint: null,
    testState: "idle",
  };
}

function customModelServiceConfig(
  editor: CustomModelServiceEditorState,
): OmniMindCustomModelServiceConfigInput {
  return {
    serviceId: editor.serviceId,
    displayName: editor.displayName.trim(),
    api: editor.api,
    baseUrl: editor.baseUrl.trim(),
    models: editor.models.map((model) => ({
      ...model,
      modelId: model.modelId.trim(),
      displayName: model.displayName.trim(),
    })),
  };
}

function customModelServiceFingerprint(editor: CustomModelServiceEditorState): string {
  return JSON.stringify({ config: customModelServiceConfig(editor), apiKey: editor.apiKey });
}

const subscribeModelServicesCapability = (listener: () => void) =>
  onNativeApiServerCapabilitiesChange(listener);
const readModelServicesCapability = () =>
  readNativeApiServerCapabilityState(WS_OMNIMIND_MODEL_SERVICES_CAPABILITY);
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
  onSetupReady,
  ...binding
}: AppSettingsBinding & {
  readonly resetEpoch: number;
  readonly active: boolean;
  readonly startInAddFlow?: boolean;
  readonly onSetupReady?: () => void;
}) {
  if (!active) return null;
  return (
    <ActiveModelsSettingsPanel
      active
      startInAddFlow={startInAddFlow}
      {...(onSetupReady ? { onSetupReady } : {})}
      {...binding}
    />
  );
}

function ActiveModelsSettingsPanel({
  resetEpoch,
  active,
  startInAddFlow,
  onSetupReady,
}: AppSettingsBinding & {
  readonly resetEpoch: number;
  readonly active: boolean;
  readonly startInAddFlow: boolean;
  readonly onSetupReady?: () => void;
}) {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const authRequestControllerRef = useRef<AbortController | null>(null);
  const customTestControllerRef = useRef<AbortController | null>(null);
  const authRequestIdRef = useRef<string | null>(null);
  const openedAuthUrlsRef = useRef(new Set<string>());
  const setupCompletionArmedRef = useRef(false);
  const addModelServiceButtonRef = useRef<HTMLButtonElement | null>(null);
  const modelServiceDetailBackButtonRef = useRef<HTMLButtonElement | null>(null);
  const modelServiceBrowserListRef = useRef<HTMLUListElement | null>(null);
  const modelServiceBrowserItemRefs = useRef(new Map<string, HTMLButtonElement>());
  const modelServiceBrowserRestoreRef = useRef<{
    readonly serviceId: string;
    readonly scrollTop: number;
  } | null>(null);
  const modelServiceDetailShouldFocusRef = useRef(false);
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
  const [customServiceEditor, setCustomServiceEditor] =
    useState<CustomModelServiceEditorState | null>(null);
  const [modelServiceMutation, setModelServiceMutation] = useState<string | null>(null);
  const [modelServiceNotice, setModelServiceNotice] = useState<ModelServiceNotice | null>(null);
  const modelServiceDetailRegionId = useId();
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
  const finishSetupIfReady = useCallback(
    (service: OmniMindModelServiceDescriptor | null | undefined) => {
      if (
        !setupCompletionArmedRef.current ||
        !service ||
        service.availableModelCount <= 0 ||
        !onSetupReady
      ) {
        return;
      }
      setupCompletionArmedRef.current = false;
      onSetupReady();
    },
    [onSetupReady],
  );

  useEffect(() => {
    const readyService = [
      ...(modelServicesQuery.data?.services ?? []),
      ...(addModelServicesQuery.data?.services ?? []),
    ].find((service) => service.availableModelCount > 0);
    finishSetupIfReady(readyService);
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
      customTestControllerRef.current?.abort();
      customTestControllerRef.current = null;
    },
    [cancelCurrentAuthRequest],
  );

  useSettingsRestoreSignal(resetEpoch, () => {
    setupCompletionArmedRef.current = false;
    setSelectedModelServiceId(null);
    setModelServiceBrowserOpen(false);
    setModelServiceSearch("");
    setModelServiceModelSearch("");
    setModelServiceDetailReturnView("overview");
    void cancelCurrentAuthRequest();
    customTestControllerRef.current?.abort();
    customTestControllerRef.current = null;
    setAuthDialog(null);
    setLogoutService(null);
    setRemoveCustomService(null);
    setCustomServiceEditor(null);
    setModelServiceMutation(null);
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

      if (!("service" in result)) return;
      const completedService = result.service;
      setAuthDialog(null);
      if (result.state === "complete") setupCompletionArmedRef.current = true;
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
      finishSetupIfReady(completedService);
    },
    [finishSetupIfReady, invalidateModelServiceConsumers, t],
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

  const refreshModelService = useCallback(
    async (service: OmniMindModelServiceDescriptor) => {
      setModelServiceMutation(`refresh:${service.serviceId}`);
      setModelServiceNotice(null);
      try {
        const result = await ensureNativeApi().omnimindModelServices.refresh({
          serviceId: service.serviceId,
          ...(service.origin === "extension" ? { origin: "extension" as const } : {}),
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
        ...(service.origin === "extension" ? { origin: "extension" as const } : {}),
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

  const updateCustomServiceEditor = useCallback(
    (update: (current: CustomModelServiceEditorState) => CustomModelServiceEditorState) => {
      setCustomServiceEditor((current) => {
        if (!current) return current;
        const next = update(current);
        return { ...next, testedFingerprint: null, testState: "idle" };
      });
      setModelServiceNotice(null);
    },
    [],
  );

  const openCustomServiceEditor = useCallback(
    (config?: NonNullable<typeof selectedCustomConfig>) => {
      setModelServiceNotice(null);
      setCustomServiceEditor(
        config
          ? {
              mode: "edit",
              serviceId: config.serviceId,
              displayName: config.displayName,
              api: config.api,
              baseUrl: config.baseUrl,
              apiKey: "",
              models: config.models.map((model) => ({ ...model, input: [...model.input] })),
              testedFingerprint: null,
              testState: "idle",
            }
          : createCustomModelServiceEditor(),
      );
    },
    [],
  );

  const testCustomService = useCallback(async () => {
    const editor = customServiceEditor;
    if (!editor) return;
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
          apiKey: editor.apiKey || null,
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
        setModelServiceNotice({ tone: "status", text: t("settings.customApiTestSucceeded") });
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

  const saveCustomService = useCallback(async () => {
    const editor = customServiceEditor;
    if (!editor || editor.testedFingerprint !== customModelServiceFingerprint(editor)) return;
    setModelServiceMutation("custom:save");
    setModelServiceNotice(null);
    try {
      const result = await ensureNativeApi().omnimindModelServices.saveCustom({
        config: customModelServiceConfig(editor),
        apiKey: editor.apiKey || null,
      });
      if (result.state === "complete") setupCompletionArmedRef.current = true;
      await invalidateModelServiceConsumers();
      setCustomServiceEditor(null);
      setModelServiceBrowserOpen(false);
      if (result.service) {
        setModelServiceDetailReturnView("overview");
        setSelectedModelServiceId(result.service.serviceId);
      }
      setModelServiceNotice({
        tone: result.state === "complete" ? "status" : "error",
        text:
          result.state === "complete"
            ? t("settings.customApiSaved")
            : result.state === "config_saved_auth_failed"
              ? t("settings.customApiSavedAuthFailed")
              : t("settings.customApiSavedSyncFailed"),
      });
      finishSetupIfReady(result.service);
    } catch {
      setModelServiceNotice({ tone: "error", text: t("settings.customApiSaveFailed") });
    } finally {
      setModelServiceMutation(null);
    }
  }, [customServiceEditor, finishSetupIfReady, invalidateModelServiceConsumers, t]);

  const confirmRemoveCustomService = useCallback(async () => {
    const service = removeCustomService;
    if (!service) return;
    setModelServiceMutation(`custom:remove:${service.serviceId}`);
    setModelServiceNotice(null);
    try {
      const result = await ensureNativeApi().omnimindModelServices.removeCustom({
        serviceId: service.serviceId,
      });
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
      setModelServiceNotice({ tone: "error", text: t("settings.customApiRemoveFailed") });
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
      config.models.every(
        (model) =>
          model.modelId.length > 0 &&
          model.displayName.length > 0 &&
          model.contextWindow > 0 &&
          model.maxTokens > 0,
      ) &&
      (customServiceEditor.mode === "edit" || customServiceEditor.apiKey.length > 0)
    );
  }, [customServiceEditor]);

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
            ) : modelServicesTransport !== "open" || modelServicesQuery.isPending ? (
              <SettingsEmptyState layout="status">
                {t("settings.modelServicesLoading")}
              </SettingsEmptyState>
            ) : modelServicesQuery.isError && confirmedOpenReadFailure ? (
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
        <SettingsSectionShell
          title={t("settings.addModelService")}
          action={
            <Button size="sm" variant="ghost" onClick={closeModelServiceBrowser}>
              <ArrowLeftIcon aria-hidden="true" />
              {t("common.back")}
            </Button>
          }
        >
          <div
            className="space-y-4"
            onKeyDown={(event) => {
              if (event.key !== "Escape" || event.defaultPrevented) return;
              event.preventDefault();
              if (modelServiceSearch.length > 0) {
                setModelServiceSearch("");
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
              <ul
                ref={modelServiceBrowserListRef}
                data-model-service-results="compact-list"
                className="max-h-[min(24rem,calc(100vh-18rem))] list-none divide-y divide-border/70 overflow-y-auto rounded-xl border border-border bg-background"
              >
                {filteredConnectableModelServices.map((service) => {
                  const instanceLabel = modelServiceInstanceLabel(service);
                  return (
                    <li key={service.serviceId}>
                      <button
                        ref={(node) => {
                          if (node)
                            modelServiceBrowserItemRefs.current.set(service.serviceId, node);
                          else modelServiceBrowserItemRefs.current.delete(service.serviceId);
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
                        onClick={() => openModelServiceDetails(service.serviceId, "browser")}
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
              onClick={() => setCustomServiceEditor(null)}
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
                      updateCustomServiceEditor((current) => ({
                        ...current,
                        api: value as OmniMindCustomModelServiceApi,
                      }))
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
                <label className="space-y-1.5 text-xs font-medium text-foreground sm:col-span-2">
                  <span>{t("settings.customApiKey")}</span>
                  <Input
                    type="password"
                    autoComplete="off"
                    value={customServiceEditor.apiKey}
                    onChange={(event) =>
                      updateCustomServiceEditor((current) => ({
                        ...current,
                        apiKey: event.target.value,
                      }))
                    }
                    placeholder={
                      customServiceEditor.mode === "edit"
                        ? t("settings.customApiKeyPreservePlaceholder")
                        : t("settings.customApiKeyPlaceholder")
                    }
                  />
                  <span className="block font-normal text-muted-foreground">
                    {t("settings.customApiKeyDescription")}
                  </span>
                </label>
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
                          value={model.displayName}
                          onChange={(event) =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              models: current.models.map((entry, modelIndex) =>
                                modelIndex === index
                                  ? { ...entry, displayName: event.target.value }
                                  : entry,
                              ),
                            }))
                          }
                          placeholder={t("settings.customApiModelNamePlaceholder")}
                        />
                      </label>
                      <label className="space-y-1.5 text-xs font-medium text-foreground">
                        <span>{t("settings.customApiContextWindow")}</span>
                        <Input
                          type="number"
                          min={1}
                          value={model.contextWindow || ""}
                          onChange={(event) =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              models: current.models.map((entry, modelIndex) =>
                                modelIndex === index
                                  ? { ...entry, contextWindow: Number(event.target.value) }
                                  : entry,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label className="space-y-1.5 text-xs font-medium text-foreground">
                        <span>{t("settings.customApiMaxTokens")}</span>
                        <Input
                          type="number"
                          min={1}
                          value={model.maxTokens || ""}
                          onChange={(event) =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              models: current.models.map((entry, modelIndex) =>
                                modelIndex === index
                                  ? { ...entry, maxTokens: Number(event.target.value) }
                                  : entry,
                              ),
                            }))
                          }
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <Checkbox
                          checked={model.reasoning}
                          onCheckedChange={(checked) =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              models: current.models.map((entry, modelIndex) =>
                                modelIndex === index
                                  ? { ...entry, reasoning: checked === true }
                                  : entry,
                              ),
                            }))
                          }
                        />
                        {t("settings.customApiModelThinking")}
                      </label>
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <Checkbox
                          checked={model.input.includes("image")}
                          onCheckedChange={(checked) =>
                            updateCustomServiceEditor((current) => ({
                              ...current,
                              models: current.models.map((entry, modelIndex) =>
                                modelIndex === index
                                  ? {
                                      ...entry,
                                      input: checked === true ? ["text", "image"] : ["text"],
                                    }
                                  : entry,
                              ),
                            }))
                          }
                        />
                        {t("settings.customApiModelImages")}
                      </label>
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
                <Button
                  variant="outline"
                  disabled={
                    !customServiceFormValid ||
                    customServiceEditor.testState === "testing" ||
                    modelServiceMutation !== null
                  }
                  onClick={() => void testCustomService()}
                >
                  {customServiceEditor.testState === "testing"
                    ? t("settings.customApiTesting")
                    : t("settings.customApiTestConnection")}
                </Button>
                <Button
                  disabled={
                    customServiceEditor.testedFingerprint !==
                      customModelServiceFingerprint(customServiceEditor) ||
                    modelServiceMutation !== null
                  }
                  onClick={() => void saveCustomService()}
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
                            onClick={() =>
                              void beginModelServiceLogin(selectedModelService, "oauth")
                            }
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
                                model.available
                                  ? "text-primary"
                                  : "text-muted-foreground",
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
                            ? t("settings.modelServiceDeviceCode", { code: event.userCode })
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

      <AlertDialog
        open={removeCustomService !== null}
        onOpenChange={(open) => !open && setRemoveCustomService(null)}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.customApiDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.customApiDeleteDescription", {
                name: removeCustomService ? modelServiceInstanceLabel(removeCustomService) : "",
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
