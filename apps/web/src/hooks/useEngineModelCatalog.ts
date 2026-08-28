// FILE: useEngineModelCatalog.ts
// Purpose: Shared engine→model option catalog (static + custom + runtime-discovered)
//          for composer-like surfaces outside ChatView, e.g. the kanban new-task dialog.
// Layer: Web hooks
// Exports: useEngineModelCatalog, EngineModelCatalog

import type {
  EngineAgentDescriptor,
  EngineKind,
  EngineModelDescriptor,
} from "@harnessos/contracts";
import { ENGINE_KINDS } from "@harnessos/contracts";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getAppModelOptions, getCustomModelsByEngine } from "../engineSettings";
import { useLocalPreferences } from "../localPreferences";
import { useServerSettings } from "../serverSettings";
import { resolveRuntimeModelDescriptor } from "../components/chat/runtimeModelCapabilities";
import { collapseCursorModelVariants } from "../cursorModelVariants";
import {
  isInitialModelDiscoveryPending,
  providerAgentsQueryOptions,
  providerModelsQueryOptions,
} from "../lib/engineDiscoveryReactQuery";
import { mergeDynamicModelOptions, type EngineModelOption } from "../providerModelOptions";

export interface EngineModelCatalog {
  customModelsByEngine: ReturnType<typeof getCustomModelsByEngine>;
  modelOptionsByEngine: Record<
    EngineKind,
    ReadonlyArray<EngineModelOption & { isCustom?: boolean }>
  >;
  /** Catalog-authoritative candidates; engine health still owns send admission. */
  selectableModelOptionsByEngine: Record<EngineKind, ReadonlyArray<EngineModelOption>>;
  /** Distinguishes cold checks, truthful empty catalogs, last-good data, and hard failures. */
  catalogStateByEngine: Record<EngineKind, EngineModelCatalogState>;
  /** Engines whose runtime model discovery is still pending (no usable list yet). */
  loadingModelProviders: Record<EngineKind, boolean>;
  /** Runtime descriptors from the settled current query identity only. */
  runtimeModelsByEngine: Record<EngineKind, ReadonlyArray<EngineModelDescriptor>>;
  /** The runtime descriptor matching `selectedProvider` + its selected-model hint. */
  selectedRuntimeModel: EngineModelDescriptor | undefined;
  /** Runtime-discovered agents/modes for the selected engine (kilo/opencode/claude/codex). */
  selectedRuntimeAgents: ReadonlyArray<EngineAgentDescriptor>;
  /** Loading state used by the selected engine's bootstrap skeleton. */
  selectedProviderModelsLoading: boolean;
  /** Whether the selected engine requires and is still waiting on runtime models. */
  selectedProviderRuntimeModelDiscoveryPending: boolean;
}

export type EngineModelCatalogState = "idle" | "checking" | "ready" | "empty" | "stale" | "error";

const EMPTY_PROVIDER_AGENTS: ReadonlyArray<EngineAgentDescriptor> = [];
const EMPTY_CUSTOM_MODELS: ReturnType<typeof getCustomModelsByEngine> = {
  oa: [],
  codex: [],
  claude: [],
  cursor: [],
  antigravity: [],
  grok: [],
  droid: [],
  kilo: [],
  opencode: [],
  pi: [],
};

function ownsIndependentCustomModelSlugs(engine: EngineKind): boolean {
  return (
    engine === "codex" ||
    engine === "claude" ||
    engine === "cursor" ||
    engine === "antigravity" ||
    engine === "grok" ||
    engine === "kilo" ||
    engine === "opencode"
  );
}

function deriveCatalogState(input: {
  enabled: boolean;
  hasSettledData: boolean;
  isPending: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  modelCount: number;
}): EngineModelCatalogState {
  if (!input.enabled) return "idle";
  if (input.isPlaceholderData) return "checking";
  if (input.isError) return input.hasSettledData && input.modelCount > 0 ? "stale" : "error";
  if (input.isPending) return "checking";
  return input.modelCount > 0 ? "ready" : "empty";
}

export function useEngineModelCatalog(input: {
  selectedProvider: EngineKind;
  /**
   * Enables discovery for the on-demand engines (cursor/grok/droid/kilo/opencode)
   * even when they are not selected — pass the picker's open state so their lists
   * are warm by the time the user browses them. Stock Pi is deliberately excluded:
   * its native state is only read after `piDiscoveryRequested` records explicit intent.
   */
  discoveryEnabled: boolean;
  /**
   * Allows a permanently mounted surface to stop even its selected-engine
   * query while inactive. Chat/Composer callers omit this and keep the current
   * Engine authoritative.
   */
  selectedProviderDiscoveryEnabled?: boolean;
  /** User explicitly opened the stock Pi engine submenu in the current picker session. */
  piDiscoveryRequested?: boolean;
  /** Effective cwd for engines whose model catalog can be extended by project resources. */
  cwd?: string | null;
  /** Per-engine selected-model hints so an unknown selection still lists itself. */
  modelHintByEngine?: Partial<Record<EngineKind, string | null>>;
  /**
   * Restrict background discovery to the engines used by a non-picker surface.
   * Picker surfaces can omit this to use the visible-engine list from settings.
   */
  prefetchProviders?: ReadonlyArray<EngineKind>;
}): EngineModelCatalog {
  const { selectedProvider, discoveryEnabled, modelHintByEngine } = input;
  const discoveryCwd = input.cwd ?? null;
  const { preferences } = useLocalPreferences();
  const { settings: serverSettings } = useServerSettings();
  const customModelsByEngine = useMemo(
    () => (serverSettings ? getCustomModelsByEngine(serverSettings) : EMPTY_CUSTOM_MODELS),
    [serverSettings],
  );
  const hiddenProviderSet = useMemo(
    () => new Set<EngineKind>(preferences.hiddenEngines),
    [preferences.hiddenEngines],
  );
  const prefetchProviderSet = useMemo(
    () =>
      input.prefetchProviders === undefined ? null : new Set<EngineKind>(input.prefetchProviders),
    [input.prefetchProviders],
  );
  const shouldDiscoverProvider = (
    engine: EngineKind,
    prefetchRequested = discoveryEnabled,
  ): boolean => {
    // The enabled flag is a short-circuit, not a precondition. `serverSettings` is
    // undefined while the settings query is in flight and stays undefined if it
    // fails — and it never refetches on its own (`staleTime: Infinity`). Treating
    // that as "disabled" would silence discovery for every engine, including the
    // selected one, which is precisely the "my model disappeared" symptom. Mirrors
    // the server-side fallback in EngineDiscoveryService.listModels.
    if (serverSettings?.engines[engine]?.enabled === false) {
      return false;
    }
    if (engine === selectedProvider) {
      return input.selectedProviderDiscoveryEnabled ?? true;
    }
    if (!prefetchRequested) {
      return false;
    }
    return prefetchProviderSet?.has(engine) ?? !hiddenProviderSet.has(engine);
  };

  const omniMindModelDiscoveryEnabled = shouldDiscoverProvider("oa");
  const claudeModelDiscoveryEnabled = shouldDiscoverProvider("claude");
  const codexModelDiscoveryEnabled = shouldDiscoverProvider("codex");
  const cursorModelDiscoveryEnabled = shouldDiscoverProvider("cursor");
  const antigravityModelDiscoveryEnabled = shouldDiscoverProvider("antigravity");
  const grokModelDiscoveryEnabled = shouldDiscoverProvider("grok");
  const droidModelDiscoveryEnabled = shouldDiscoverProvider("droid", false);
  const kiloModelDiscoveryEnabled = shouldDiscoverProvider("kilo");
  const openCodeModelDiscoveryEnabled = shouldDiscoverProvider("opencode");
  // Opening the whole picker is not consent to inspect `.pi`. Browsing the Pi submenu
  // is explicit engine intent, and selecting Pi keeps its native discovery active.
  const piModelDiscoveryEnabled =
    selectedProvider === "pi"
      ? shouldDiscoverProvider("pi", false)
      : input.piDiscoveryRequested === true && shouldDiscoverProvider("pi", true);

  const omniMindDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      engine: "oa",
      cwd: discoveryCwd,
      enabled: omniMindModelDiscoveryEnabled,
    }),
  );

  const claudeDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      engine: "claude",
      binaryPath: serverSettings?.engines.claude?.binaryPath || null,
      enabled: claudeModelDiscoveryEnabled,
    }),
  );
  const codexDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      engine: "codex",
      enabled: codexModelDiscoveryEnabled,
    }),
  );
  const cursorDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      engine: "cursor",
      binaryPath: serverSettings?.engines.cursor?.binaryPath || null,
      apiEndpoint: serverSettings?.engines.cursor?.apiEndpoint || null,
      enabled: cursorModelDiscoveryEnabled,
    }),
  );
  const antigravityModelsQuery = useQuery(
    providerModelsQueryOptions({
      engine: "antigravity",
      binaryPath: serverSettings?.engines.antigravity?.binaryPath || null,
      cwd: discoveryCwd,
      enabled: antigravityModelDiscoveryEnabled,
    }),
  );
  const grokDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      engine: "grok",
      binaryPath: serverSettings?.engines.grok?.binaryPath || null,
      enabled: grokModelDiscoveryEnabled,
    }),
  );
  const droidDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      engine: "droid",
      binaryPath: serverSettings?.engines.droid?.binaryPath || null,
      cwd: discoveryCwd,
      // Droid probes every model through a disposable ACP session. Keep it
      // engine-scoped instead of warming it from unrelated picker/settings UI.
      enabled: droidModelDiscoveryEnabled,
    }),
  );
  const openCodeDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      engine: "opencode",
      binaryPath: serverSettings?.engines.opencode?.binaryPath || null,
      cwd: discoveryCwd,
      enabled: openCodeModelDiscoveryEnabled,
    }),
  );
  const kiloDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      engine: "kilo",
      binaryPath: serverSettings?.engines.kilo?.binaryPath || null,
      cwd: discoveryCwd,
      enabled: kiloModelDiscoveryEnabled,
    }),
  );
  const piDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      engine: "pi",
      binaryPath: serverSettings?.engines.pi?.binaryPath || null,
      agentDir: serverSettings?.engines.pi?.agentDir || null,
      cwd: discoveryCwd,
      enabled: piModelDiscoveryEnabled,
    }),
  );

  // Agent/mode discovery (kilo/opencode "Mode"/"Agent" picker, claude/codex subagents).
  // Models are send-critical; agent metadata is secondary. Sequencing them
  // prevents a newly mounted ChatView from spending both expensive-read leases
  // before the selected Engine's model catalog has settled.
  const claudeAgentDiscoveryEnabled =
    claudeModelDiscoveryEnabled && !isInitialModelDiscoveryPending(claudeDynamicModelsQuery);
  const codexAgentDiscoveryEnabled =
    codexModelDiscoveryEnabled && !isInitialModelDiscoveryPending(codexDynamicModelsQuery);
  const openCodeAgentDiscoveryEnabled =
    openCodeModelDiscoveryEnabled && !isInitialModelDiscoveryPending(openCodeDynamicModelsQuery);
  const kiloAgentDiscoveryEnabled =
    kiloModelDiscoveryEnabled && !isInitialModelDiscoveryPending(kiloDynamicModelsQuery);
  const claudeDynamicAgentsQuery = useQuery(
    providerAgentsQueryOptions({
      engine: "claude",
      enabled: claudeAgentDiscoveryEnabled,
    }),
  );
  const codexDynamicAgentsQuery = useQuery(
    providerAgentsQueryOptions({
      engine: "codex",
      enabled: codexAgentDiscoveryEnabled,
    }),
  );
  const openCodeDynamicAgentsQuery = useQuery(
    providerAgentsQueryOptions({
      engine: "opencode",
      binaryPath: serverSettings?.engines.opencode?.binaryPath || null,
      cwd: discoveryCwd,
      enabled: openCodeAgentDiscoveryEnabled,
    }),
  );
  const kiloDynamicAgentsQuery = useQuery(
    providerAgentsQueryOptions({
      engine: "kilo",
      binaryPath: serverSettings?.engines.kilo?.binaryPath || null,
      cwd: discoveryCwd,
      enabled: kiloAgentDiscoveryEnabled,
    }),
  );

  const cursorRuntimeModels = useMemo(
    () => collapseCursorModelVariants(cursorDynamicModelsQuery.data?.models ?? []),
    [cursorDynamicModelsQuery.data?.models],
  );

  const modelOptionsByEngine = useMemo(() => {
    const staticOptions: Record<EngineKind, ReturnType<typeof getAppModelOptions>> = {
      oa: getAppModelOptions("oa", []),
      codex: getAppModelOptions("codex", customModelsByEngine.codex, modelHintByEngine?.codex),
      claude: getAppModelOptions("claude", customModelsByEngine.claude, modelHintByEngine?.claude),
      cursor: getAppModelOptions("cursor", customModelsByEngine.cursor, modelHintByEngine?.cursor),
      antigravity: getAppModelOptions(
        "antigravity",
        customModelsByEngine.antigravity,
        modelHintByEngine?.antigravity,
      ),
      grok: getAppModelOptions("grok", customModelsByEngine.grok, modelHintByEngine?.grok),
      droid: getAppModelOptions("droid", customModelsByEngine.droid, modelHintByEngine?.droid),
      kilo: getAppModelOptions("kilo", customModelsByEngine.kilo, modelHintByEngine?.kilo),
      opencode: getAppModelOptions(
        "opencode",
        customModelsByEngine.opencode,
        modelHintByEngine?.opencode,
      ),
      pi: getAppModelOptions("pi", customModelsByEngine.pi, modelHintByEngine?.pi),
    };
    const result: Record<EngineKind, ReadonlyArray<EngineModelOption & { isCustom?: boolean }>> = {
      ...staticOptions,
    };
    const dynamicSources: Record<EngineKind, typeof claudeDynamicModelsQuery.data> = {
      oa: omniMindDynamicModelsQuery.data,
      claude: claudeDynamicModelsQuery.data,
      codex: codexDynamicModelsQuery.data,
      cursor:
        cursorDynamicModelsQuery.data === undefined
          ? undefined
          : { ...cursorDynamicModelsQuery.data, models: cursorRuntimeModels },
      antigravity: antigravityModelsQuery.data,
      grok: grokDynamicModelsQuery.data,
      droid: droidDynamicModelsQuery.data,
      kilo: kiloDynamicModelsQuery.data,
      opencode: openCodeDynamicModelsQuery.data,
      pi: piDynamicModelsQuery.data,
    };
    for (const engine of [
      "oa",
      "claude",
      "codex",
      "cursor",
      "antigravity",
      "grok",
      "droid",
      "kilo",
      "opencode",
      "pi",
    ] as const) {
      const dynamicModels = dynamicSources[engine]?.models;
      if (dynamicModels && dynamicModels.length > 0) {
        result[engine] = mergeDynamicModelOptions({
          engine,
          staticOptions: staticOptions[engine],
          dynamicModels,
        });
      }
    }
    return result;
  }, [
    antigravityModelsQuery.data,
    claudeDynamicModelsQuery.data,
    codexDynamicModelsQuery.data,
    cursorDynamicModelsQuery.data,
    cursorRuntimeModels,
    customModelsByEngine,
    droidDynamicModelsQuery.data,
    grokDynamicModelsQuery.data,
    kiloDynamicModelsQuery.data,
    modelHintByEngine,
    openCodeDynamicModelsQuery.data,
    omniMindDynamicModelsQuery.data,
    piDynamicModelsQuery.data,
  ]);

  const discoveredRuntimeModelsByEngine = useMemo<
    Record<EngineKind, ReadonlyArray<EngineModelDescriptor>>
  >(
    () => ({
      oa: omniMindDynamicModelsQuery.data?.models ?? [],
      claude: claudeDynamicModelsQuery.data?.models ?? [],
      codex: codexDynamicModelsQuery.data?.models ?? [],
      cursor: cursorRuntimeModels,
      antigravity: antigravityModelsQuery.data?.models ?? [],
      grok: grokDynamicModelsQuery.data?.models ?? [],
      droid: droidDynamicModelsQuery.data?.models ?? [],
      kilo: kiloDynamicModelsQuery.data?.models ?? [],
      opencode: openCodeDynamicModelsQuery.data?.models ?? [],
      pi: piDynamicModelsQuery.data?.models ?? [],
    }),
    [
      antigravityModelsQuery.data?.models,
      claudeDynamicModelsQuery.data?.models,
      codexDynamicModelsQuery.data?.models,
      cursorRuntimeModels,
      droidDynamicModelsQuery.data?.models,
      grokDynamicModelsQuery.data?.models,
      kiloDynamicModelsQuery.data?.models,
      openCodeDynamicModelsQuery.data?.models,
      omniMindDynamicModelsQuery.data?.models,
      piDynamicModelsQuery.data?.models,
    ],
  );

  const catalogStateByEngine = useMemo<Record<EngineKind, EngineModelCatalogState>>(
    () => ({
      oa: deriveCatalogState({
        enabled: omniMindModelDiscoveryEnabled,
        hasSettledData:
          omniMindDynamicModelsQuery.data !== undefined &&
          !omniMindDynamicModelsQuery.isPlaceholderData,
        isPending: omniMindDynamicModelsQuery.isPending,
        isPlaceholderData: omniMindDynamicModelsQuery.isPlaceholderData,
        isError: omniMindDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByEngine.oa.length,
      }),
      codex: deriveCatalogState({
        enabled: codexModelDiscoveryEnabled,
        hasSettledData:
          codexDynamicModelsQuery.data !== undefined && !codexDynamicModelsQuery.isPlaceholderData,
        isPending: codexDynamicModelsQuery.isPending,
        isPlaceholderData: codexDynamicModelsQuery.isPlaceholderData,
        isError: codexDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByEngine.codex.length,
      }),
      claude: deriveCatalogState({
        enabled: claudeModelDiscoveryEnabled,
        hasSettledData:
          claudeDynamicModelsQuery.data !== undefined &&
          !claudeDynamicModelsQuery.isPlaceholderData,
        isPending: claudeDynamicModelsQuery.isPending,
        isPlaceholderData: claudeDynamicModelsQuery.isPlaceholderData,
        isError: claudeDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByEngine.claude.length,
      }),
      cursor: deriveCatalogState({
        enabled: cursorModelDiscoveryEnabled,
        hasSettledData:
          cursorDynamicModelsQuery.data !== undefined &&
          !cursorDynamicModelsQuery.isPlaceholderData,
        isPending: cursorDynamicModelsQuery.isPending,
        isPlaceholderData: cursorDynamicModelsQuery.isPlaceholderData,
        isError: cursorDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByEngine.cursor.length,
      }),
      antigravity: deriveCatalogState({
        enabled: antigravityModelDiscoveryEnabled,
        hasSettledData:
          antigravityModelsQuery.data !== undefined && !antigravityModelsQuery.isPlaceholderData,
        isPending: antigravityModelsQuery.isPending,
        isPlaceholderData: antigravityModelsQuery.isPlaceholderData,
        isError: antigravityModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByEngine.antigravity.length,
      }),
      grok: deriveCatalogState({
        enabled: grokModelDiscoveryEnabled,
        hasSettledData:
          grokDynamicModelsQuery.data !== undefined && !grokDynamicModelsQuery.isPlaceholderData,
        isPending: grokDynamicModelsQuery.isPending,
        isPlaceholderData: grokDynamicModelsQuery.isPlaceholderData,
        isError: grokDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByEngine.grok.length,
      }),
      droid: deriveCatalogState({
        enabled: droidModelDiscoveryEnabled,
        hasSettledData:
          droidDynamicModelsQuery.data !== undefined && !droidDynamicModelsQuery.isPlaceholderData,
        isPending: droidDynamicModelsQuery.isPending,
        isPlaceholderData: droidDynamicModelsQuery.isPlaceholderData,
        isError: droidDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByEngine.droid.length,
      }),
      kilo: deriveCatalogState({
        enabled: kiloModelDiscoveryEnabled,
        hasSettledData:
          kiloDynamicModelsQuery.data !== undefined && !kiloDynamicModelsQuery.isPlaceholderData,
        isPending: kiloDynamicModelsQuery.isPending,
        isPlaceholderData: kiloDynamicModelsQuery.isPlaceholderData,
        isError: kiloDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByEngine.kilo.length,
      }),
      opencode: deriveCatalogState({
        enabled: openCodeModelDiscoveryEnabled,
        hasSettledData:
          openCodeDynamicModelsQuery.data !== undefined &&
          !openCodeDynamicModelsQuery.isPlaceholderData,
        isPending: openCodeDynamicModelsQuery.isPending,
        isPlaceholderData: openCodeDynamicModelsQuery.isPlaceholderData,
        isError: openCodeDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByEngine.opencode.length,
      }),
      pi: deriveCatalogState({
        enabled: piModelDiscoveryEnabled,
        hasSettledData:
          piDynamicModelsQuery.data !== undefined && !piDynamicModelsQuery.isPlaceholderData,
        isPending: piDynamicModelsQuery.isPending,
        isPlaceholderData: piDynamicModelsQuery.isPlaceholderData,
        isError: piDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByEngine.pi.length,
      }),
    }),
    [
      antigravityModelDiscoveryEnabled,
      antigravityModelsQuery.isError,
      antigravityModelsQuery.isPending,
      antigravityModelsQuery.isPlaceholderData,
      claudeDynamicModelsQuery.isError,
      claudeDynamicModelsQuery.isPending,
      claudeDynamicModelsQuery.isPlaceholderData,
      claudeModelDiscoveryEnabled,
      codexDynamicModelsQuery.isError,
      codexDynamicModelsQuery.isPending,
      codexDynamicModelsQuery.isPlaceholderData,
      codexModelDiscoveryEnabled,
      cursorDynamicModelsQuery.isError,
      cursorDynamicModelsQuery.isPending,
      cursorDynamicModelsQuery.isPlaceholderData,
      cursorModelDiscoveryEnabled,
      droidDynamicModelsQuery.isError,
      droidDynamicModelsQuery.isPending,
      droidDynamicModelsQuery.isPlaceholderData,
      droidModelDiscoveryEnabled,
      grokDynamicModelsQuery.isError,
      grokDynamicModelsQuery.isPending,
      grokDynamicModelsQuery.isPlaceholderData,
      grokModelDiscoveryEnabled,
      kiloDynamicModelsQuery.isError,
      kiloDynamicModelsQuery.isPending,
      kiloDynamicModelsQuery.isPlaceholderData,
      kiloModelDiscoveryEnabled,
      omniMindDynamicModelsQuery.isError,
      omniMindDynamicModelsQuery.isPending,
      omniMindDynamicModelsQuery.isPlaceholderData,
      omniMindModelDiscoveryEnabled,
      openCodeDynamicModelsQuery.isError,
      openCodeDynamicModelsQuery.isPending,
      openCodeDynamicModelsQuery.isPlaceholderData,
      openCodeModelDiscoveryEnabled,
      piDynamicModelsQuery.isError,
      piDynamicModelsQuery.isPending,
      piDynamicModelsQuery.isPlaceholderData,
      piModelDiscoveryEnabled,
      discoveredRuntimeModelsByEngine,
    ],
  );

  const runtimeModelsByEngine = useMemo<
    Record<EngineKind, ReadonlyArray<EngineModelDescriptor>>
  >(() => {
    const result = {} as Record<EngineKind, ReadonlyArray<EngineModelDescriptor>>;
    for (const engine of ENGINE_KINDS) {
      const state = catalogStateByEngine[engine];
      result[engine] =
        state === "ready" || state === "stale" ? discoveredRuntimeModelsByEngine[engine] : [];
    }
    return result;
  }, [catalogStateByEngine, discoveredRuntimeModelsByEngine]);

  const configuredCustomModelSlugsByEngine = useMemo(() => {
    const result = {} as Record<EngineKind, ReadonlySet<string>>;
    for (const engine of ENGINE_KINDS) {
      result[engine] = new Set(
        getAppModelOptions(engine, customModelsByEngine[engine])
          .filter((option) => option.isCustom)
          .map((option) => option.slug),
      );
    }
    return result;
  }, [customModelsByEngine]);

  const selectableModelOptionsByEngine = useMemo<
    Record<EngineKind, ReadonlyArray<EngineModelOption>>
  >(() => {
    const result = {} as Record<EngineKind, ReadonlyArray<EngineModelOption>>;
    for (const engine of ENGINE_KINDS) {
      const runtimeModels = runtimeModelsByEngine[engine];
      const catalogState = catalogStateByEngine[engine];
      if (catalogState === "idle" || catalogState === "checking") {
        result[engine] = [];
        continue;
      }
      const displayOptions = mergeDynamicModelOptions({
        engine,
        staticOptions: modelOptionsByEngine[engine],
        dynamicModels: runtimeModels,
      });
      result[engine] = displayOptions.filter((option) => {
        if (
          ownsIndependentCustomModelSlugs(engine) &&
          configuredCustomModelSlugsByEngine[engine].has(option.slug)
        ) {
          return true;
        }
        return Boolean(
          resolveRuntimeModelDescriptor({
            engine,
            model: option.slug,
            runtimeModels,
          }),
        );
      });
    }
    return result;
  }, [configuredCustomModelSlugsByEngine, modelOptionsByEngine, runtimeModelsByEngine]);

  const selectedRuntimeModel = useMemo(
    () =>
      resolveRuntimeModelDescriptor({
        engine: selectedProvider,
        model: modelHintByEngine?.[selectedProvider] ?? null,
        runtimeModels: runtimeModelsByEngine[selectedProvider],
      }),
    [modelHintByEngine, runtimeModelsByEngine, selectedProvider],
  );

  const selectedAgentCatalog =
    selectedProvider === "claude"
      ? {
          enabled: claudeAgentDiscoveryEnabled,
          query: claudeDynamicAgentsQuery,
        }
      : selectedProvider === "codex"
        ? {
            enabled: codexAgentDiscoveryEnabled,
            query: codexDynamicAgentsQuery,
          }
        : selectedProvider === "kilo"
          ? { enabled: kiloAgentDiscoveryEnabled, query: kiloDynamicAgentsQuery }
          : selectedProvider === "opencode"
            ? { enabled: openCodeAgentDiscoveryEnabled, query: openCodeDynamicAgentsQuery }
            : null;
  const selectedDynamicAgents =
    !selectedAgentCatalog?.enabled ||
    selectedAgentCatalog.query.isPlaceholderData ||
    selectedAgentCatalog.query.isPending
      ? EMPTY_PROVIDER_AGENTS
      : (selectedAgentCatalog.query.data?.agents ?? EMPTY_PROVIDER_AGENTS);
  const selectedRuntimeAgents = useMemo<ReadonlyArray<EngineAgentDescriptor>>(
    () =>
      selectedDynamicAgents.map((agent) =>
        agent.description
          ? { name: agent.name, displayName: agent.displayName, description: agent.description }
          : { name: agent.name, displayName: agent.displayName },
      ),
    [selectedDynamicAgents],
  );

  const loadingModelProviders = useMemo<Record<EngineKind, boolean>>(() => {
    const result = {} as Record<EngineKind, boolean>;
    for (const engine of ENGINE_KINDS) {
      result[engine] = catalogStateByEngine[engine] === "checking";
    }
    return result;
  }, [catalogStateByEngine]);
  const selectedProviderRuntimeModelDiscoveryPending = loadingModelProviders[selectedProvider];
  const selectedProviderModelsLoading = selectedProviderRuntimeModelDiscoveryPending;

  return useMemo(
    () => ({
      customModelsByEngine,
      modelOptionsByEngine,
      selectableModelOptionsByEngine,
      catalogStateByEngine,
      loadingModelProviders,
      runtimeModelsByEngine,
      selectedRuntimeModel,
      selectedRuntimeAgents,
      selectedProviderModelsLoading,
      selectedProviderRuntimeModelDiscoveryPending,
    }),
    [
      customModelsByEngine,
      catalogStateByEngine,
      loadingModelProviders,
      modelOptionsByEngine,
      runtimeModelsByEngine,
      selectedProviderModelsLoading,
      selectedProviderRuntimeModelDiscoveryPending,
      selectedRuntimeAgents,
      selectedRuntimeModel,
      selectableModelOptionsByEngine,
    ],
  );
}
