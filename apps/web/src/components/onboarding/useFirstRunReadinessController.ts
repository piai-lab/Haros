import {
  ENGINE_KINDS,
  type ModelSelection,
  type OmniMindModelServicesListResult,
  type EngineKind,
} from "@harnessos/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useSyncExternalStore } from "react";

import { useServerSettings } from "~/serverSettings";
import { useComposerDraftStore } from "~/composerDraftStore";
import { useFocusedChatContext } from "~/focusedChatContext";
import { useProviderModelCatalog } from "~/hooks/useProviderModelCatalog";
import { useProviderStatusesForLocalConfig } from "~/hooks/useProviderStatusesForLocalConfig";
import {
  onNativeApiServerCapabilitiesChange,
  onNativeApiTransportStateChange,
  readNativeApiServerCapabilityState,
  readNativeApiTransportState,
} from "~/nativeApi";
import {
  omniMindModelServicesListQueryOptions,
  omniMindModelServicesQueryKeys,
} from "~/lib/omnimindModelServicesReactQuery";
import {
  hasReceivedProviderStatusSnapshot,
  serverConfigQueryOptions,
} from "~/lib/serverReactQuery";
import { useStore } from "~/store";
import { createThreadShellsSelector } from "~/storeSelectors";
import { WS_HARNESSOS_MODEL_SERVICES_CAPABILITY } from "@harnessos/contracts";

import {
  areUsableProviderCatalogsSettled,
  hasUsableExactModelBinding,
  hasUsableOmniMindModelServiceBinding,
  isSettledPassiveModelServicesQueryState,
} from "../chat/modelReadinessPrompt.logic";
import {
  deriveFirstRunReadinessState,
  hasRememberedExactModelBinding,
  type FirstRunReadinessState,
  type PassiveModelServicesState,
} from "./firstRunReadiness.logic";
import { readFirstRunReadinessPreference } from "./firstRunReadinessPreference";

const subscribeModelServicesCapability = (listener: () => void) =>
  onNativeApiServerCapabilitiesChange(listener);
const readModelServicesCapability = () =>
  readNativeApiServerCapabilityState(WS_HARNESSOS_MODEL_SERVICES_CAPABILITY);
const readServerModelServicesCapability = () => null;
const subscribeModelServicesTransport = (listener: () => void) =>
  onNativeApiTransportStateChange(listener);
const readModelServicesTransport = () => readNativeApiTransportState();
const readServerModelServicesTransport = () => null;

export interface FirstRunReadinessController {
  readonly readiness: FirstRunReadinessState;
  readonly focusedThreadId: ReturnType<typeof useFocusedChatContext>["focusedThreadId"];
  readonly activeProject: ReturnType<typeof useFocusedChatContext>["activeProject"];
  readonly providerStatuses: ReturnType<typeof useProviderStatusesForLocalConfig>;
  readonly modelOptionsByProvider: ReturnType<
    typeof useProviderModelCatalog
  >["selectableModelOptionsByProvider"];
  readonly catalogStateByProvider: ReturnType<
    typeof useProviderModelCatalog
  >["catalogStateByProvider"];
  readonly loadingModelProviders: ReturnType<
    typeof useProviderModelCatalog
  >["loadingModelProviders"];
}

export function useFirstRunReadinessController(
  selectedProvider: EngineKind,
): FirstRunReadinessController {
  const queryClient = useQueryClient();
  const { settings, defaults } = useServerSettings();
  const settingsSnapshot = settings ?? defaults;
  const focusedContext = useFocusedChatContext();
  const projects = useStore((state) => state.projects);
  const threadsHydrated = useStore((state) => state.threadsHydrated);
  const threadShells = useStore(useMemo(() => createThreadShellsSelector(), []));
  const draftsByThreadId = useComposerDraftStore((state) => state.draftsByThreadId);
  const stickyModelSelectionByProvider = useComposerDraftStore(
    (state) => state.stickyModelSelectionByProvider,
  );
  const stickyActiveProvider = useComposerDraftStore((state) => state.stickyActiveProvider);
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const providerStatuses = useProviderStatusesForLocalConfig();
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
  const selectedModelHint =
    stickyModelSelectionByProvider[selectedProvider]?.model ??
    (focusedContext.activeThread?.modelSelection.provider === selectedProvider
      ? focusedContext.activeThread.modelSelection.model
      : focusedContext.activeProject?.defaultModelSelection?.provider === selectedProvider
        ? focusedContext.activeProject.defaultModelSelection.model
        : null);
  const catalog = useProviderModelCatalog({
    selectedProvider,
    discoveryEnabled: false,
    // First-run classification is passive. OmniMind's provider catalog loads
    // Pi Extensions, so readiness must rely on the credential-blind Model
    // services projection until the user explicitly opens model discovery.
    selectedProviderDiscoveryEnabled: selectedProvider !== "oa",
    piDiscoveryRequested: selectedProvider === "pi",
    cwd: focusedContext.activeProject?.cwd ?? serverConfigQuery.data?.cwd ?? null,
    modelHintByProvider: { [selectedProvider]: selectedModelHint },
  });

  const rememberedSelections = useMemo(() => {
    const result: Partial<Record<EngineKind, ModelSelection>> = {};
    for (const provider of ENGINE_KINDS) {
      const selection =
        stickyModelSelectionByProvider[provider] ??
        threadShells.find((thread) => thread.modelSelection.provider === provider)
          ?.modelSelection ??
        projects.find((project) => project.defaultModelSelection?.provider === provider)
          ?.defaultModelSelection ??
        null;
      if (selection) result[provider] = selection;
    }
    return result;
  }, [projects, stickyModelSelectionByProvider, threadShells]);
  const exactSelections = useMemo(() => {
    const result = { ...rememberedSelections };
    const focusedDraft = focusedContext.focusedThreadId
      ? draftsByThreadId[focusedContext.focusedThreadId]
      : null;
    const focusedProvider =
      focusedDraft?.activeProvider ??
      focusedContext.activeThread?.modelSelection.provider ??
      focusedContext.activeProject?.defaultModelSelection?.provider ??
      stickyActiveProvider ??
      settingsSnapshot.defaultProvider;
    const focusedSelection =
      focusedDraft?.modelSelectionByProvider[focusedProvider] ??
      (focusedContext.activeThread?.modelSelection.provider === focusedProvider
        ? focusedContext.activeThread.modelSelection
        : null) ??
      (focusedContext.activeProject?.defaultModelSelection?.provider === focusedProvider
        ? focusedContext.activeProject.defaultModelSelection
        : null) ??
      stickyModelSelectionByProvider[focusedProvider] ??
      null;
    if (focusedSelection) result[focusedProvider] = focusedSelection;
    for (const provider of ENGINE_KINDS) {
      const status = providerStatuses.find((candidate) => candidate.provider === provider);
      if (
        result[provider] &&
        status?.authStatus === "unknown" &&
        !catalog.selectableModelOptionsByProvider[provider].some(
          (model) => model.slug === result[provider]?.model,
        )
      ) {
        delete result[provider];
      }
    }
    return result;
  }, [
    catalog.selectableModelOptionsByProvider,
    draftsByThreadId,
    focusedContext.activeProject,
    focusedContext.activeThread,
    focusedContext.focusedThreadId,
    providerStatuses,
    rememberedSelections,
    settingsSnapshot.defaultProvider,
    stickyActiveProvider,
    stickyModelSelectionByProvider,
  ]);
  const hasUsableIndependentBinding = hasUsableExactModelBinding({
    providerStatuses,
    exactModelSelections: exactSelections,
  });
  const passiveQueryState = queryClient.getQueryState<OmniMindModelServicesListResult>(
    omniMindModelServicesQueryKeys.list(),
  );
  const cachedPassiveServices =
    passiveQueryState && isSettledPassiveModelServicesQueryState(passiveQueryState)
      ? passiveQueryState.data
      : undefined;
  const modelServicesQuery = useQuery(
    omniMindModelServicesListQueryOptions({
      enabled:
        serverConfigQuery.isSuccess &&
        !hasUsableIndependentBinding &&
        modelServicesCapability === true &&
        modelServicesTransport === "open",
    }),
  );
  const passiveModelServicesState: PassiveModelServicesState = modelServicesQuery.isFetching
    ? "unknown"
    : modelServicesQuery.isError
      ? "error"
      : modelServicesQuery.isSuccess
        ? modelServicesQuery.data.state === "empty"
          ? "empty"
          : modelServicesQuery.data.state === "ready"
            ? "configured"
            : "error"
        : "unknown";
  const explicitOmniMindSelection = rememberedSelections.oa;
  const hasUsableOmniMindBinding =
    cachedPassiveServices?.state === "ready" &&
    explicitOmniMindSelection !== undefined &&
    hasUsableOmniMindModelServiceBinding({
      selection: explicitOmniMindSelection,
      selectionIsExplicit: true,
      catalogState: catalog.catalogStateByProvider.oa,
      modelOptions: catalog.selectableModelOptionsByProvider.oa,
      services: cachedPassiveServices.services,
    });
  const hasRememberedIndependentEngineBinding = hasRememberedExactModelBinding({
    providers: ENGINE_KINDS.filter((provider) => provider !== "oa"),
    explicitExactModelSelections: rememberedSelections,
  });
  const hasRememberedOmniMindBinding = hasRememberedExactModelBinding({
    providers: ["oa"],
    explicitExactModelSelections: rememberedSelections,
  });
  const catalogsSettled = areUsableProviderCatalogsSettled({
    providerStatuses,
    catalogStateByProvider: catalog.catalogStateByProvider,
    explicitExactModelSelections: rememberedSelections,
  });
  const factsSettled =
    threadsHydrated &&
    serverConfigQuery.isSuccess &&
    !serverConfigQuery.isFetching &&
    catalogsSettled &&
    passiveModelServicesState !== "unknown" &&
    (passiveModelServicesState !== "empty" ||
      hasReceivedProviderStatusSnapshot(queryClient) ||
      providerStatuses.length === 0);
  const readiness = deriveFirstRunReadinessState({
    factsSettled,
    hasUsableExactBinding: hasUsableIndependentBinding || hasUsableOmniMindBinding,
    hasRememberedIndependentEngineBinding,
    hasRememberedOmniMindBinding,
    modelServicesCapability,
    modelServicesTransport,
    passiveModelServicesState,
    deferred: readFirstRunReadinessPreference()?.disposition === "deferred",
  });

  return {
    readiness,
    focusedThreadId: focusedContext.focusedThreadId,
    activeProject: focusedContext.activeProject,
    providerStatuses,
    modelOptionsByProvider: catalog.selectableModelOptionsByProvider,
    catalogStateByProvider: catalog.catalogStateByProvider,
    loadingModelProviders: catalog.loadingModelProviders,
  };
}
