import {
  ENGINE_KINDS,
  type EngineSelection,
  type OmniMindModelServicesListResult,
  type EngineKind,
} from "@harnessos/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useSyncExternalStore } from "react";

import { useServerSettings } from "~/serverSettings";
import { useComposerDraftStore } from "~/composerDraftStore";
import { useFocusedChatContext } from "~/focusedChatContext";
import { useEngineModelCatalog } from "~/hooks/useEngineModelCatalog";
import { useEngineStatusesForLocalConfig } from "~/hooks/useEngineStatusesForLocalConfig";
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
  readonly providerStatuses: ReturnType<typeof useEngineStatusesForLocalConfig>;
  readonly modelOptionsByEngine: ReturnType<
    typeof useEngineModelCatalog
  >["selectableModelOptionsByEngine"];
  readonly catalogStateByEngine: ReturnType<typeof useEngineModelCatalog>["catalogStateByEngine"];
  readonly loadingModelProviders: ReturnType<typeof useEngineModelCatalog>["loadingModelProviders"];
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
  const stickyEngineSelectionByEngine = useComposerDraftStore(
    (state) => state.stickyEngineSelectionByEngine,
  );
  const stickyActiveProvider = useComposerDraftStore((state) => state.stickyActiveProvider);
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const providerStatuses = useEngineStatusesForLocalConfig();
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
    stickyEngineSelectionByEngine[selectedProvider]?.model ??
    (focusedContext.activeThread?.engineSelection.engine === selectedProvider
      ? focusedContext.activeThread.engineSelection.model
      : focusedContext.activeProject?.defaultEngineSelection?.engine === selectedProvider
        ? focusedContext.activeProject.defaultEngineSelection.model
        : null);
  const catalog = useEngineModelCatalog({
    selectedProvider,
    discoveryEnabled: false,
    // First-run classification is passive. OmniMind's engine catalog loads
    // Pi Extensions, so readiness must rely on the credential-blind Model
    // services projection until the user explicitly opens model discovery.
    selectedProviderDiscoveryEnabled: selectedProvider !== "oa",
    piDiscoveryRequested: selectedProvider === "pi",
    cwd: focusedContext.activeProject?.cwd ?? serverConfigQuery.data?.cwd ?? null,
    modelHintByEngine: { [selectedProvider]: selectedModelHint },
  });

  const rememberedSelections = useMemo(() => {
    const result: Partial<Record<EngineKind, EngineSelection>> = {};
    for (const engine of ENGINE_KINDS) {
      const selection =
        stickyEngineSelectionByEngine[engine] ??
        threadShells.find((thread) => thread.engineSelection.engine === engine)?.engineSelection ??
        projects.find((project) => project.defaultEngineSelection?.engine === engine)
          ?.defaultEngineSelection ??
        null;
      if (selection) result[engine] = selection;
    }
    return result;
  }, [projects, stickyEngineSelectionByEngine, threadShells]);
  const exactSelections = useMemo(() => {
    const result = { ...rememberedSelections };
    const focusedDraft = focusedContext.focusedThreadId
      ? draftsByThreadId[focusedContext.focusedThreadId]
      : null;
    const focusedProvider =
      focusedDraft?.activeProvider ??
      focusedContext.activeThread?.engineSelection.engine ??
      focusedContext.activeProject?.defaultEngineSelection?.engine ??
      stickyActiveProvider ??
      settingsSnapshot.defaultEngine;
    const focusedSelection =
      focusedDraft?.engineSelectionByEngine[focusedProvider] ??
      (focusedContext.activeThread?.engineSelection.engine === focusedProvider
        ? focusedContext.activeThread.engineSelection
        : null) ??
      (focusedContext.activeProject?.defaultEngineSelection?.engine === focusedProvider
        ? focusedContext.activeProject.defaultEngineSelection
        : null) ??
      stickyEngineSelectionByEngine[focusedProvider] ??
      null;
    if (focusedSelection) result[focusedProvider] = focusedSelection;
    for (const engine of ENGINE_KINDS) {
      const status = providerStatuses.find((candidate) => candidate.engine === engine);
      if (
        result[engine] &&
        status?.authStatus === "unknown" &&
        !catalog.selectableModelOptionsByEngine[engine].some(
          (model) => model.slug === result[engine]?.model,
        )
      ) {
        delete result[engine];
      }
    }
    return result;
  }, [
    catalog.selectableModelOptionsByEngine,
    draftsByThreadId,
    focusedContext.activeProject,
    focusedContext.activeThread,
    focusedContext.focusedThreadId,
    providerStatuses,
    rememberedSelections,
    settingsSnapshot.defaultEngine,
    stickyActiveProvider,
    stickyEngineSelectionByEngine,
  ]);
  const hasUsableIndependentBinding = hasUsableExactModelBinding({
    providerStatuses,
    exactEngineSelections: exactSelections,
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
      catalogState: catalog.catalogStateByEngine.oa,
      modelOptions: catalog.selectableModelOptionsByEngine.oa,
      services: cachedPassiveServices.services,
    });
  const hasRememberedIndependentEngineBinding = hasRememberedExactModelBinding({
    engines: ENGINE_KINDS.filter((engine) => engine !== "oa"),
    explicitExactEngineSelections: rememberedSelections,
  });
  const hasRememberedOmniMindBinding = hasRememberedExactModelBinding({
    engines: ["oa"],
    explicitExactEngineSelections: rememberedSelections,
  });
  const catalogsSettled = areUsableProviderCatalogsSettled({
    providerStatuses,
    catalogStateByEngine: catalog.catalogStateByEngine,
    explicitExactEngineSelections: rememberedSelections,
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
    modelOptionsByEngine: catalog.selectableModelOptionsByEngine,
    catalogStateByEngine: catalog.catalogStateByEngine,
    loadingModelProviders: catalog.loadingModelProviders,
  };
}
