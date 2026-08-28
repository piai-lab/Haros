// FILE: useProviderModelCatalog.ts
// Purpose: Shared provider→model option catalog (static + custom + runtime-discovered)
//          for composer-like surfaces outside ChatView, e.g. the kanban new-task dialog.
// Layer: Web hooks
// Exports: useProviderModelCatalog, ProviderModelCatalog

import type {
  ProviderAgentDescriptor,
  ProviderKind,
  ProviderModelDescriptor,
} from "@harnessos/contracts";
import { PROVIDER_KINDS } from "@harnessos/contracts";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getAppModelOptions, getCustomModelsByProvider } from "../providerSettings";
import { useLocalPreferences } from "../localPreferences";
import { useServerSettings } from "../serverSettings";
import { resolveRuntimeModelDescriptor } from "../components/chat/runtimeModelCapabilities";
import { collapseCursorModelVariants } from "../cursorModelVariants";
import {
  isInitialModelDiscoveryPending,
  providerAgentsQueryOptions,
  providerModelsQueryOptions,
} from "../lib/providerDiscoveryReactQuery";
import { mergeDynamicModelOptions, type ProviderModelOption } from "../providerModelOptions";

export interface ProviderModelCatalog {
  customModelsByProvider: ReturnType<typeof getCustomModelsByProvider>;
  modelOptionsByProvider: Record<
    ProviderKind,
    ReadonlyArray<ProviderModelOption & { isCustom?: boolean }>
  >;
  /** Catalog-authoritative candidates; provider health still owns send admission. */
  selectableModelOptionsByProvider: Record<ProviderKind, ReadonlyArray<ProviderModelOption>>;
  /** Distinguishes cold checks, truthful empty catalogs, last-good data, and hard failures. */
  catalogStateByProvider: Record<ProviderKind, ProviderModelCatalogState>;
  /** Providers whose runtime model discovery is still pending (no usable list yet). */
  loadingModelProviders: Record<ProviderKind, boolean>;
  /** Runtime descriptors from the settled current query identity only. */
  runtimeModelsByProvider: Record<ProviderKind, ReadonlyArray<ProviderModelDescriptor>>;
  /** The runtime descriptor matching `selectedProvider` + its selected-model hint. */
  selectedRuntimeModel: ProviderModelDescriptor | undefined;
  /** Runtime-discovered agents/modes for the selected provider (kilo/opencode/claude/codex). */
  selectedRuntimeAgents: ReadonlyArray<ProviderAgentDescriptor>;
  /** Loading state used by the selected provider's bootstrap skeleton. */
  selectedProviderModelsLoading: boolean;
  /** Whether the selected provider requires and is still waiting on runtime models. */
  selectedProviderRuntimeModelDiscoveryPending: boolean;
}

export type ProviderModelCatalogState = "idle" | "checking" | "ready" | "empty" | "stale" | "error";

const EMPTY_PROVIDER_AGENTS: ReadonlyArray<ProviderAgentDescriptor> = [];
const EMPTY_CUSTOM_MODELS: ReturnType<typeof getCustomModelsByProvider> = {
  omnimind: [],
  codex: [],
  claudeAgent: [],
  cursor: [],
  antigravity: [],
  grok: [],
  droid: [],
  kilo: [],
  opencode: [],
  pi: [],
};

function ownsIndependentCustomModelSlugs(provider: ProviderKind): boolean {
  return (
    provider === "codex" ||
    provider === "claudeAgent" ||
    provider === "cursor" ||
    provider === "antigravity" ||
    provider === "grok" ||
    provider === "kilo" ||
    provider === "opencode"
  );
}

function deriveCatalogState(input: {
  enabled: boolean;
  hasSettledData: boolean;
  isPending: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  modelCount: number;
}): ProviderModelCatalogState {
  if (!input.enabled) return "idle";
  if (input.isPlaceholderData) return "checking";
  if (input.isError) return input.hasSettledData && input.modelCount > 0 ? "stale" : "error";
  if (input.isPending) return "checking";
  return input.modelCount > 0 ? "ready" : "empty";
}

export function useProviderModelCatalog(input: {
  selectedProvider: ProviderKind;
  /**
   * Enables discovery for the on-demand providers (cursor/grok/droid/kilo/opencode)
   * even when they are not selected — pass the picker's open state so their lists
   * are warm by the time the user browses them. Stock Pi is deliberately excluded:
   * its native state is only read after `piDiscoveryRequested` records explicit intent.
   */
  discoveryEnabled: boolean;
  /**
   * Allows a permanently mounted surface to stop even its selected-provider
   * query while inactive. Chat/Composer callers omit this and keep the current
   * Engine authoritative.
   */
  selectedProviderDiscoveryEnabled?: boolean;
  /** User explicitly opened the stock Pi provider submenu in the current picker session. */
  piDiscoveryRequested?: boolean;
  /** Effective cwd for providers whose model catalog can be extended by project resources. */
  cwd?: string | null;
  /** Per-provider selected-model hints so an unknown selection still lists itself. */
  modelHintByProvider?: Partial<Record<ProviderKind, string | null>>;
  /**
   * Restrict background discovery to the providers used by a non-picker surface.
   * Picker surfaces can omit this to use the visible-provider list from settings.
   */
  prefetchProviders?: ReadonlyArray<ProviderKind>;
}): ProviderModelCatalog {
  const { selectedProvider, discoveryEnabled, modelHintByProvider } = input;
  const discoveryCwd = input.cwd ?? null;
  const { preferences } = useLocalPreferences();
  const { settings: serverSettings } = useServerSettings();
  const customModelsByProvider = useMemo(
    () => (serverSettings ? getCustomModelsByProvider(serverSettings) : EMPTY_CUSTOM_MODELS),
    [serverSettings],
  );
  const hiddenProviderSet = useMemo(
    () => new Set<ProviderKind>(preferences.hiddenProviders),
    [preferences.hiddenProviders],
  );
  const prefetchProviderSet = useMemo(
    () =>
      input.prefetchProviders === undefined ? null : new Set<ProviderKind>(input.prefetchProviders),
    [input.prefetchProviders],
  );
  const shouldDiscoverProvider = (
    provider: ProviderKind,
    prefetchRequested = discoveryEnabled,
  ): boolean => {
    // The enabled flag is a short-circuit, not a precondition. `serverSettings` is
    // undefined while the settings query is in flight and stays undefined if it
    // fails — and it never refetches on its own (`staleTime: Infinity`). Treating
    // that as "disabled" would silence discovery for every provider, including the
    // selected one, which is precisely the "my model disappeared" symptom. Mirrors
    // the server-side fallback in ProviderDiscoveryService.listModels.
    if (serverSettings?.providers[provider]?.enabled === false) {
      return false;
    }
    if (provider === selectedProvider) {
      return input.selectedProviderDiscoveryEnabled ?? true;
    }
    if (!prefetchRequested) {
      return false;
    }
    return prefetchProviderSet?.has(provider) ?? !hiddenProviderSet.has(provider);
  };

  const omniMindModelDiscoveryEnabled = shouldDiscoverProvider("omnimind");
  const claudeModelDiscoveryEnabled = shouldDiscoverProvider("claudeAgent");
  const codexModelDiscoveryEnabled = shouldDiscoverProvider("codex");
  const cursorModelDiscoveryEnabled = shouldDiscoverProvider("cursor");
  const antigravityModelDiscoveryEnabled = shouldDiscoverProvider("antigravity");
  const grokModelDiscoveryEnabled = shouldDiscoverProvider("grok");
  const droidModelDiscoveryEnabled = shouldDiscoverProvider("droid", false);
  const kiloModelDiscoveryEnabled = shouldDiscoverProvider("kilo");
  const openCodeModelDiscoveryEnabled = shouldDiscoverProvider("opencode");
  // Opening the whole picker is not consent to inspect `.pi`. Browsing the Pi submenu
  // is explicit provider intent, and selecting Pi keeps its native discovery active.
  const piModelDiscoveryEnabled =
    selectedProvider === "pi"
      ? shouldDiscoverProvider("pi", false)
      : input.piDiscoveryRequested === true && shouldDiscoverProvider("pi", true);

  const omniMindDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      provider: "omnimind",
      cwd: discoveryCwd,
      enabled: omniMindModelDiscoveryEnabled,
    }),
  );

  const claudeDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      provider: "claudeAgent",
      binaryPath: serverSettings?.providers.claudeAgent?.binaryPath || null,
      enabled: claudeModelDiscoveryEnabled,
    }),
  );
  const codexDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      provider: "codex",
      enabled: codexModelDiscoveryEnabled,
    }),
  );
  const cursorDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      provider: "cursor",
      binaryPath: serverSettings?.providers.cursor?.binaryPath || null,
      apiEndpoint: serverSettings?.providers.cursor?.apiEndpoint || null,
      enabled: cursorModelDiscoveryEnabled,
    }),
  );
  const antigravityModelsQuery = useQuery(
    providerModelsQueryOptions({
      provider: "antigravity",
      binaryPath: serverSettings?.providers.antigravity?.binaryPath || null,
      cwd: discoveryCwd,
      enabled: antigravityModelDiscoveryEnabled,
    }),
  );
  const grokDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      provider: "grok",
      binaryPath: serverSettings?.providers.grok?.binaryPath || null,
      enabled: grokModelDiscoveryEnabled,
    }),
  );
  const droidDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      provider: "droid",
      binaryPath: serverSettings?.providers.droid?.binaryPath || null,
      cwd: discoveryCwd,
      // Droid probes every model through a disposable ACP session. Keep it
      // provider-scoped instead of warming it from unrelated picker/settings UI.
      enabled: droidModelDiscoveryEnabled,
    }),
  );
  const openCodeDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      provider: "opencode",
      binaryPath: serverSettings?.providers.opencode?.binaryPath || null,
      cwd: discoveryCwd,
      enabled: openCodeModelDiscoveryEnabled,
    }),
  );
  const kiloDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      provider: "kilo",
      binaryPath: serverSettings?.providers.kilo?.binaryPath || null,
      cwd: discoveryCwd,
      enabled: kiloModelDiscoveryEnabled,
    }),
  );
  const piDynamicModelsQuery = useQuery(
    providerModelsQueryOptions({
      provider: "pi",
      binaryPath: serverSettings?.providers.pi?.binaryPath || null,
      agentDir: serverSettings?.providers.pi?.agentDir || null,
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
      provider: "claudeAgent",
      enabled: claudeAgentDiscoveryEnabled,
    }),
  );
  const codexDynamicAgentsQuery = useQuery(
    providerAgentsQueryOptions({
      provider: "codex",
      enabled: codexAgentDiscoveryEnabled,
    }),
  );
  const openCodeDynamicAgentsQuery = useQuery(
    providerAgentsQueryOptions({
      provider: "opencode",
      binaryPath: serverSettings?.providers.opencode?.binaryPath || null,
      cwd: discoveryCwd,
      enabled: openCodeAgentDiscoveryEnabled,
    }),
  );
  const kiloDynamicAgentsQuery = useQuery(
    providerAgentsQueryOptions({
      provider: "kilo",
      binaryPath: serverSettings?.providers.kilo?.binaryPath || null,
      cwd: discoveryCwd,
      enabled: kiloAgentDiscoveryEnabled,
    }),
  );

  const cursorRuntimeModels = useMemo(
    () => collapseCursorModelVariants(cursorDynamicModelsQuery.data?.models ?? []),
    [cursorDynamicModelsQuery.data?.models],
  );

  const modelOptionsByProvider = useMemo(() => {
    const staticOptions: Record<ProviderKind, ReturnType<typeof getAppModelOptions>> = {
      omnimind: getAppModelOptions("omnimind", []),
      codex: getAppModelOptions("codex", customModelsByProvider.codex, modelHintByProvider?.codex),
      claudeAgent: getAppModelOptions(
        "claudeAgent",
        customModelsByProvider.claudeAgent,
        modelHintByProvider?.claudeAgent,
      ),
      cursor: getAppModelOptions(
        "cursor",
        customModelsByProvider.cursor,
        modelHintByProvider?.cursor,
      ),
      antigravity: getAppModelOptions(
        "antigravity",
        customModelsByProvider.antigravity,
        modelHintByProvider?.antigravity,
      ),
      grok: getAppModelOptions("grok", customModelsByProvider.grok, modelHintByProvider?.grok),
      droid: getAppModelOptions("droid", customModelsByProvider.droid, modelHintByProvider?.droid),
      kilo: getAppModelOptions("kilo", customModelsByProvider.kilo, modelHintByProvider?.kilo),
      opencode: getAppModelOptions(
        "opencode",
        customModelsByProvider.opencode,
        modelHintByProvider?.opencode,
      ),
      pi: getAppModelOptions("pi", customModelsByProvider.pi, modelHintByProvider?.pi),
    };
    const result: Record<
      ProviderKind,
      ReadonlyArray<ProviderModelOption & { isCustom?: boolean }>
    > = { ...staticOptions };
    const dynamicSources: Record<ProviderKind, typeof claudeDynamicModelsQuery.data> = {
      omnimind: omniMindDynamicModelsQuery.data,
      claudeAgent: claudeDynamicModelsQuery.data,
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
    for (const provider of [
      "omnimind",
      "claudeAgent",
      "codex",
      "cursor",
      "antigravity",
      "grok",
      "droid",
      "kilo",
      "opencode",
      "pi",
    ] as const) {
      const dynamicModels = dynamicSources[provider]?.models;
      if (dynamicModels && dynamicModels.length > 0) {
        result[provider] = mergeDynamicModelOptions({
          provider,
          staticOptions: staticOptions[provider],
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
    customModelsByProvider,
    droidDynamicModelsQuery.data,
    grokDynamicModelsQuery.data,
    kiloDynamicModelsQuery.data,
    modelHintByProvider,
    openCodeDynamicModelsQuery.data,
    omniMindDynamicModelsQuery.data,
    piDynamicModelsQuery.data,
  ]);

  const discoveredRuntimeModelsByProvider = useMemo<
    Record<ProviderKind, ReadonlyArray<ProviderModelDescriptor>>
  >(
    () => ({
      omnimind: omniMindDynamicModelsQuery.data?.models ?? [],
      claudeAgent: claudeDynamicModelsQuery.data?.models ?? [],
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

  const catalogStateByProvider = useMemo<Record<ProviderKind, ProviderModelCatalogState>>(
    () => ({
      omnimind: deriveCatalogState({
        enabled: omniMindModelDiscoveryEnabled,
        hasSettledData:
          omniMindDynamicModelsQuery.data !== undefined &&
          !omniMindDynamicModelsQuery.isPlaceholderData,
        isPending: omniMindDynamicModelsQuery.isPending,
        isPlaceholderData: omniMindDynamicModelsQuery.isPlaceholderData,
        isError: omniMindDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByProvider.omnimind.length,
      }),
      codex: deriveCatalogState({
        enabled: codexModelDiscoveryEnabled,
        hasSettledData:
          codexDynamicModelsQuery.data !== undefined && !codexDynamicModelsQuery.isPlaceholderData,
        isPending: codexDynamicModelsQuery.isPending,
        isPlaceholderData: codexDynamicModelsQuery.isPlaceholderData,
        isError: codexDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByProvider.codex.length,
      }),
      claudeAgent: deriveCatalogState({
        enabled: claudeModelDiscoveryEnabled,
        hasSettledData:
          claudeDynamicModelsQuery.data !== undefined &&
          !claudeDynamicModelsQuery.isPlaceholderData,
        isPending: claudeDynamicModelsQuery.isPending,
        isPlaceholderData: claudeDynamicModelsQuery.isPlaceholderData,
        isError: claudeDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByProvider.claudeAgent.length,
      }),
      cursor: deriveCatalogState({
        enabled: cursorModelDiscoveryEnabled,
        hasSettledData:
          cursorDynamicModelsQuery.data !== undefined &&
          !cursorDynamicModelsQuery.isPlaceholderData,
        isPending: cursorDynamicModelsQuery.isPending,
        isPlaceholderData: cursorDynamicModelsQuery.isPlaceholderData,
        isError: cursorDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByProvider.cursor.length,
      }),
      antigravity: deriveCatalogState({
        enabled: antigravityModelDiscoveryEnabled,
        hasSettledData:
          antigravityModelsQuery.data !== undefined && !antigravityModelsQuery.isPlaceholderData,
        isPending: antigravityModelsQuery.isPending,
        isPlaceholderData: antigravityModelsQuery.isPlaceholderData,
        isError: antigravityModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByProvider.antigravity.length,
      }),
      grok: deriveCatalogState({
        enabled: grokModelDiscoveryEnabled,
        hasSettledData:
          grokDynamicModelsQuery.data !== undefined && !grokDynamicModelsQuery.isPlaceholderData,
        isPending: grokDynamicModelsQuery.isPending,
        isPlaceholderData: grokDynamicModelsQuery.isPlaceholderData,
        isError: grokDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByProvider.grok.length,
      }),
      droid: deriveCatalogState({
        enabled: droidModelDiscoveryEnabled,
        hasSettledData:
          droidDynamicModelsQuery.data !== undefined && !droidDynamicModelsQuery.isPlaceholderData,
        isPending: droidDynamicModelsQuery.isPending,
        isPlaceholderData: droidDynamicModelsQuery.isPlaceholderData,
        isError: droidDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByProvider.droid.length,
      }),
      kilo: deriveCatalogState({
        enabled: kiloModelDiscoveryEnabled,
        hasSettledData:
          kiloDynamicModelsQuery.data !== undefined && !kiloDynamicModelsQuery.isPlaceholderData,
        isPending: kiloDynamicModelsQuery.isPending,
        isPlaceholderData: kiloDynamicModelsQuery.isPlaceholderData,
        isError: kiloDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByProvider.kilo.length,
      }),
      opencode: deriveCatalogState({
        enabled: openCodeModelDiscoveryEnabled,
        hasSettledData:
          openCodeDynamicModelsQuery.data !== undefined &&
          !openCodeDynamicModelsQuery.isPlaceholderData,
        isPending: openCodeDynamicModelsQuery.isPending,
        isPlaceholderData: openCodeDynamicModelsQuery.isPlaceholderData,
        isError: openCodeDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByProvider.opencode.length,
      }),
      pi: deriveCatalogState({
        enabled: piModelDiscoveryEnabled,
        hasSettledData:
          piDynamicModelsQuery.data !== undefined && !piDynamicModelsQuery.isPlaceholderData,
        isPending: piDynamicModelsQuery.isPending,
        isPlaceholderData: piDynamicModelsQuery.isPlaceholderData,
        isError: piDynamicModelsQuery.isError,
        modelCount: discoveredRuntimeModelsByProvider.pi.length,
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
      discoveredRuntimeModelsByProvider,
    ],
  );

  const runtimeModelsByProvider = useMemo<
    Record<ProviderKind, ReadonlyArray<ProviderModelDescriptor>>
  >(() => {
    const result = {} as Record<ProviderKind, ReadonlyArray<ProviderModelDescriptor>>;
    for (const provider of PROVIDER_KINDS) {
      const state = catalogStateByProvider[provider];
      result[provider] =
        state === "ready" || state === "stale" ? discoveredRuntimeModelsByProvider[provider] : [];
    }
    return result;
  }, [catalogStateByProvider, discoveredRuntimeModelsByProvider]);

  const configuredCustomModelSlugsByProvider = useMemo(() => {
    const result = {} as Record<ProviderKind, ReadonlySet<string>>;
    for (const provider of PROVIDER_KINDS) {
      result[provider] = new Set(
        getAppModelOptions(provider, customModelsByProvider[provider])
          .filter((option) => option.isCustom)
          .map((option) => option.slug),
      );
    }
    return result;
  }, [customModelsByProvider]);

  const selectableModelOptionsByProvider = useMemo<
    Record<ProviderKind, ReadonlyArray<ProviderModelOption>>
  >(() => {
    const result = {} as Record<ProviderKind, ReadonlyArray<ProviderModelOption>>;
    for (const provider of PROVIDER_KINDS) {
      const runtimeModels = runtimeModelsByProvider[provider];
      const catalogState = catalogStateByProvider[provider];
      if (catalogState === "idle" || catalogState === "checking") {
        result[provider] = [];
        continue;
      }
      const displayOptions = mergeDynamicModelOptions({
        provider,
        staticOptions: modelOptionsByProvider[provider],
        dynamicModels: runtimeModels,
      });
      result[provider] = displayOptions.filter((option) => {
        if (
          ownsIndependentCustomModelSlugs(provider) &&
          configuredCustomModelSlugsByProvider[provider].has(option.slug)
        ) {
          return true;
        }
        return Boolean(
          resolveRuntimeModelDescriptor({
            provider,
            model: option.slug,
            runtimeModels,
          }),
        );
      });
    }
    return result;
  }, [configuredCustomModelSlugsByProvider, modelOptionsByProvider, runtimeModelsByProvider]);

  const selectedRuntimeModel = useMemo(
    () =>
      resolveRuntimeModelDescriptor({
        provider: selectedProvider,
        model: modelHintByProvider?.[selectedProvider] ?? null,
        runtimeModels: runtimeModelsByProvider[selectedProvider],
      }),
    [modelHintByProvider, runtimeModelsByProvider, selectedProvider],
  );

  const selectedAgentCatalog =
    selectedProvider === "claudeAgent"
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
  const selectedRuntimeAgents = useMemo<ReadonlyArray<ProviderAgentDescriptor>>(
    () =>
      selectedDynamicAgents.map((agent) =>
        agent.description
          ? { name: agent.name, displayName: agent.displayName, description: agent.description }
          : { name: agent.name, displayName: agent.displayName },
      ),
    [selectedDynamicAgents],
  );

  const loadingModelProviders = useMemo<Record<ProviderKind, boolean>>(() => {
    const result = {} as Record<ProviderKind, boolean>;
    for (const provider of PROVIDER_KINDS) {
      result[provider] = catalogStateByProvider[provider] === "checking";
    }
    return result;
  }, [catalogStateByProvider]);
  const selectedProviderRuntimeModelDiscoveryPending = loadingModelProviders[selectedProvider];
  const selectedProviderModelsLoading = selectedProviderRuntimeModelDiscoveryPending;

  return useMemo(
    () => ({
      customModelsByProvider,
      modelOptionsByProvider,
      selectableModelOptionsByProvider,
      catalogStateByProvider,
      loadingModelProviders,
      runtimeModelsByProvider,
      selectedRuntimeModel,
      selectedRuntimeAgents,
      selectedProviderModelsLoading,
      selectedProviderRuntimeModelDiscoveryPending,
    }),
    [
      customModelsByProvider,
      catalogStateByProvider,
      loadingModelProviders,
      modelOptionsByProvider,
      runtimeModelsByProvider,
      selectedProviderModelsLoading,
      selectedProviderRuntimeModelDiscoveryPending,
      selectedRuntimeAgents,
      selectedRuntimeModel,
      selectableModelOptionsByProvider,
    ],
  );
}
