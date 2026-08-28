import {
  ENGINE_KINDS,
  type EngineSelection,
  type OAModelServicesListResult,
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
} from "~/lib/oaModelServicesReactQuery";
import { hasReceivedEngineStatusSnapshot, serverConfigQueryOptions } from "~/lib/serverReactQuery";
import { useStore } from "~/store";
import { createThreadShellsSelector } from "~/storeSelectors";
import { WS_HARNESSOS_MODEL_SERVICES_CAPABILITY } from "@harnessos/contracts";

import {
  areUsableEngineCatalogsSettled,
  hasUsableExactModelBinding,
  hasUsableOAModelServiceBinding,
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
  readonly engineStatuses: ReturnType<typeof useEngineStatusesForLocalConfig>;
  readonly modelOptionsByEngine: ReturnType<
    typeof useEngineModelCatalog
  >["selectableModelOptionsByEngine"];
  readonly catalogStateByEngine: ReturnType<typeof useEngineModelCatalog>["catalogStateByEngine"];
  readonly loadingEngineModels: ReturnType<typeof useEngineModelCatalog>["loadingEngineModels"];
}

export function useFirstRunReadinessController(
  selectedEngine: EngineKind,
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
  const stickyActiveEngine = useComposerDraftStore((state) => state.stickyActiveEngine);
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const engineStatuses = useEngineStatusesForLocalConfig();
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
    stickyEngineSelectionByEngine[selectedEngine]?.model ??
    (focusedContext.activeThread?.engineSelection.engine === selectedEngine
      ? focusedContext.activeThread.engineSelection.model
      : focusedContext.activeProject?.defaultEngineSelection?.engine === selectedEngine
        ? focusedContext.activeProject.defaultEngineSelection.model
        : null);
  const catalog = useEngineModelCatalog({
    selectedEngine,
    discoveryEnabled: false,
    // First-run classification is passive. HarnessOS's engine catalog loads
    // Pi Extensions, so readiness must rely on the credential-blind Model
    // services projection until the user explicitly opens model discovery.
    selectedEngineDiscoveryEnabled: selectedEngine !== "oa",
    piDiscoveryRequested: selectedEngine === "pi",
    cwd: focusedContext.activeProject?.cwd ?? serverConfigQuery.data?.cwd ?? null,
    modelHintByEngine: { [selectedEngine]: selectedModelHint },
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
    const focusedEngine =
      focusedDraft?.activeEngine ??
      focusedContext.activeThread?.engineSelection.engine ??
      focusedContext.activeProject?.defaultEngineSelection?.engine ??
      stickyActiveEngine ??
      settingsSnapshot.defaultEngine;
    const focusedSelection =
      focusedDraft?.engineSelectionByEngine[focusedEngine] ??
      (focusedContext.activeThread?.engineSelection.engine === focusedEngine
        ? focusedContext.activeThread.engineSelection
        : null) ??
      (focusedContext.activeProject?.defaultEngineSelection?.engine === focusedEngine
        ? focusedContext.activeProject.defaultEngineSelection
        : null) ??
      stickyEngineSelectionByEngine[focusedEngine] ??
      null;
    if (focusedSelection) result[focusedEngine] = focusedSelection;
    for (const engine of ENGINE_KINDS) {
      const status = engineStatuses.find((candidate) => candidate.engine === engine);
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
    engineStatuses,
    rememberedSelections,
    settingsSnapshot.defaultEngine,
    stickyActiveEngine,
    stickyEngineSelectionByEngine,
  ]);
  const hasUsableIndependentBinding = hasUsableExactModelBinding({
    engineStatuses,
    exactEngineSelections: exactSelections,
  });
  const passiveQueryState = queryClient.getQueryState<OAModelServicesListResult>(
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
  const explicitHarnessOSSelection = rememberedSelections.oa;
  const hasUsableHarnessOSBinding =
    cachedPassiveServices?.state === "ready" &&
    explicitHarnessOSSelection !== undefined &&
    hasUsableOAModelServiceBinding({
      selection: explicitHarnessOSSelection,
      selectionIsExplicit: true,
      catalogState: catalog.catalogStateByEngine.oa,
      modelOptions: catalog.selectableModelOptionsByEngine.oa,
      services: cachedPassiveServices.services,
    });
  const hasRememberedIndependentEngineBinding = hasRememberedExactModelBinding({
    engines: ENGINE_KINDS.filter((engine) => engine !== "oa"),
    explicitExactEngineSelections: rememberedSelections,
  });
  const hasRememberedHarnessOSBinding = hasRememberedExactModelBinding({
    engines: ["oa"],
    explicitExactEngineSelections: rememberedSelections,
  });
  const catalogsSettled = areUsableEngineCatalogsSettled({
    engineStatuses,
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
      hasReceivedEngineStatusSnapshot(queryClient) ||
      engineStatuses.length === 0);
  const readiness = deriveFirstRunReadinessState({
    factsSettled,
    hasUsableExactBinding: hasUsableIndependentBinding || hasUsableHarnessOSBinding,
    hasRememberedIndependentEngineBinding,
    hasRememberedHarnessOSBinding,
    modelServicesCapability,
    modelServicesTransport,
    passiveModelServicesState,
    deferred: readFirstRunReadinessPreference()?.disposition === "deferred",
  });

  return {
    readiness,
    focusedThreadId: focusedContext.focusedThreadId,
    activeProject: focusedContext.activeProject,
    engineStatuses,
    modelOptionsByEngine: catalog.selectableModelOptionsByEngine,
    catalogStateByEngine: catalog.catalogStateByEngine,
    loadingEngineModels: catalog.loadingEngineModels,
  };
}
