import type {
  ProviderExecutionCapabilities,
  ProviderInteractionModeCapability,
  ProviderComposerCapabilities,
  ModelSelection,
  EngineKind,
  ProviderListAgentsResult,
  ProviderListCommandsResult,
  ProviderListModelsResult,
  ProviderListPluginsResult,
  ProviderListSkillsResult,
  ProviderSkillsCatalogResult,
} from "@harnessos/contracts";
import { PROVIDER_MODEL_DISCOVERY_ERROR_CODES } from "@harnessos/contracts";
import { queryOptions } from "@tanstack/react-query";
import { ensureNativeApi } from "~/nativeApi";

const EMPTY_SKILLS_RESULT: ProviderListSkillsResult = {
  skills: [],
  source: "empty",
  cached: false,
};

const EMPTY_COMMANDS_RESULT: ProviderListCommandsResult = {
  commands: [],
  source: "empty",
  cached: false,
};

const EMPTY_MODELS_RESULT: ProviderListModelsResult = {
  models: [],
  source: "empty",
  cached: false,
};

const EMPTY_AGENTS_RESULT: ProviderListAgentsResult = {
  agents: [],
  source: "empty",
  cached: false,
};

const EMPTY_PLUGINS_RESULT: ProviderListPluginsResult = {
  marketplaces: [],
  marketplaceLoadErrors: [],
  remoteSyncError: null,
  featuredPluginIds: [],
  source: "empty",
  cached: false,
};

export function isProviderDiscoverySessionActive(input: {
  readonly provider: EngineKind;
  readonly session: { readonly provider: EngineKind; readonly status: string } | null | undefined;
}): boolean {
  return input.session?.provider === input.provider && input.session.status !== "closed";
}

export const providerDiscoveryQueryKeys = {
  all: ["provider-discovery"] as const,
  composerCapabilities: (provider: EngineKind) =>
    ["provider-discovery", "composer-capabilities", provider] as const,
  executionCapabilitiesAll: ["provider-discovery", "execution-capabilities"] as const,
  executionCapabilities: (modelSelection: ModelSelection) =>
    [...providerDiscoveryQueryKeys.executionCapabilitiesAll, modelSelection] as const,
  commands: (
    provider: EngineKind,
    cwd: string | null,
    agentDir: string | null,
    connectionKey: string | null,
    threadId: string | null = null,
    activeSession = false,
  ) =>
    [
      "provider-discovery",
      "commands",
      provider,
      cwd,
      agentDir,
      connectionKey,
      threadId,
      activeSession,
    ] as const,
  // The skill list is query-independent (filtering is client-side), so the key
  // deliberately excludes the typed filter to avoid a refetch per keystroke.
  skills: (
    provider: EngineKind,
    cwd: string | null,
    agentDir: string | null,
    threadId: string | null = null,
    activeSession = false,
  ) => ["provider-discovery", "skills", provider, cwd, agentDir, threadId, activeSession] as const,
  skillsCatalog: (cwd: string | null) => ["provider-discovery", "skills-catalog", cwd] as const,
  plugins: (provider: EngineKind, cwd: string | null, threadId: string | null) =>
    ["provider-discovery", "plugins", provider, cwd, threadId] as const,
  plugin: (
    provider: EngineKind,
    marketplacePath: string,
    pluginName: string,
    cwd: string | null,
    threadId: string | null,
  ) =>
    ["provider-discovery", "plugin", provider, marketplacePath, pluginName, cwd, threadId] as const,
  models: (
    provider: EngineKind,
    binaryPath: string | null,
    apiEndpoint: string | null,
    agentDir: string | null,
    cwd: string | null,
  ) => ["provider-discovery", "models", provider, binaryPath, apiEndpoint, agentDir, cwd] as const,
  modelsForProvider: (provider: EngineKind) => ["provider-discovery", "models", provider] as const,
  agentsForProvider: (provider: EngineKind) => ["provider-discovery", "agents", provider] as const,
  agents: (provider: EngineKind, binaryPath: string | null, cwd: string | null) =>
    [...providerDiscoveryQueryKeys.agentsForProvider(provider), binaryPath, cwd] as const,
};

export function providerComposerCapabilitiesQueryOptions(provider: EngineKind) {
  return queryOptions({
    queryKey: providerDiscoveryQueryKeys.composerCapabilities(provider),
    queryFn: async () => {
      const api = ensureNativeApi();
      return api.provider.getComposerCapabilities({ provider });
    },
    staleTime: Infinity,
  });
}

export function providerExecutionCapabilitiesQueryOptions(modelSelection: ModelSelection) {
  return queryOptions({
    queryKey: providerDiscoveryQueryKeys.executionCapabilities(modelSelection),
    queryFn: async () => {
      const api = ensureNativeApi();
      const result = await api.provider.getExecutionCapabilities({ modelSelection });
      if (!providerExecutionCapabilitiesMatchSelection(result, modelSelection)) {
        throw new Error(
          "Provider execution capability response identity did not match the request.",
        );
      }
      return result;
    },
  });
}

export function providerExecutionCapabilitiesMatchSelection(
  capabilities: ProviderExecutionCapabilities,
  modelSelection: ModelSelection,
): boolean {
  return (
    capabilities.provider === modelSelection.provider && capabilities.model === modelSelection.model
  );
}

export function isProviderInteractionModeExecutable(
  capability: ProviderInteractionModeCapability | undefined,
): capability is ProviderInteractionModeCapability & { readonly structurallySupported: true } {
  return (
    capability?.structurallySupported === true &&
    (capability.status === "ready" || capability.status === "degraded")
  );
}

export function providerSkillsQueryOptions(input: {
  provider: EngineKind;
  cwd: string | null;
  threadId?: string | null;
  activeSession?: boolean;
  agentDir?: string | null;
  enabled?: boolean;
}) {
  return queryOptions({
    queryKey: providerDiscoveryQueryKeys.skills(
      input.provider,
      input.cwd,
      input.agentDir ?? null,
      input.threadId ?? null,
      input.activeSession ?? false,
    ),
    queryFn: async () => {
      const api = ensureNativeApi();
      if (!input.cwd) {
        throw new Error("Skill discovery is unavailable.");
      }
      return api.provider.listSkills({
        provider: input.provider,
        cwd: input.cwd,
        ...(input.threadId ? { threadId: input.threadId } : {}),
        ...(input.agentDir ? { agentDir: input.agentDir } : {}),
      });
    },
    enabled: (input.enabled ?? true) && input.cwd !== null,
    staleTime: 30_000,
    // A different Thread/session key may have a different Project trust boundary.
    // Never surface the previous key's resource names while the new key loads.
    placeholderData: EMPTY_SKILLS_RESULT,
  });
}

// Unified cross-provider skills catalog (settings page); not filtered by toggles.
// Keep prior data during refetches so Settings does not flicker back to "Scanning..."
// while the server refreshes filesystem discovery in the background.
export function skillsCatalogQueryOptions(input?: { cwd?: string | null; enabled?: boolean }) {
  const cwd = input?.cwd ?? null;
  return queryOptions({
    queryKey: providerDiscoveryQueryKeys.skillsCatalog(cwd),
    queryFn: async (): Promise<ProviderSkillsCatalogResult> => {
      const api = ensureNativeApi();
      return api.provider.listSkillsCatalog(cwd ? { cwd } : {});
    },
    enabled: input?.enabled ?? true,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function providerCommandsQueryOptions(input: {
  provider: EngineKind;
  cwd: string | null;
  threadId?: string | null;
  activeSession?: boolean;
  binaryPath?: string | null;
  serverUrl?: string | null;
  // Undefined means "not applicable" (non-OpenCode providers); the body normalizes it.
  experimentalWebSockets?: boolean | undefined;
  agentDir?: string | null;
  enabled?: boolean;
}) {
  const connectionKey = JSON.stringify({
    binaryPath: input.binaryPath ?? null,
    serverUrl: input.serverUrl ?? null,
    experimentalWebSockets: input.experimentalWebSockets ?? null,
  });
  return queryOptions({
    queryKey: providerDiscoveryQueryKeys.commands(
      input.provider,
      input.cwd,
      input.agentDir ?? null,
      connectionKey,
      input.threadId ?? null,
      input.activeSession ?? false,
    ),
    queryFn: async () => {
      const api = ensureNativeApi();
      if (!input.cwd) {
        throw new Error("Command discovery is unavailable.");
      }
      return api.provider.listCommands({
        provider: input.provider,
        cwd: input.cwd,
        ...(input.threadId ? { threadId: input.threadId } : {}),
        ...(input.binaryPath ? { binaryPath: input.binaryPath } : {}),
        ...(input.serverUrl ? { serverUrl: input.serverUrl } : {}),
        ...(input.experimentalWebSockets !== undefined
          ? { experimentalWebSockets: input.experimentalWebSockets }
          : {}),
        ...(input.agentDir ? { agentDir: input.agentDir } : {}),
      });
    },
    enabled: (input.enabled ?? true) && input.cwd !== null,
    staleTime: 30_000,
    // Prompt commands follow the same Thread/session trust boundary as Skills.
    placeholderData: EMPTY_COMMANDS_RESULT,
  });
}

/**
 * True only while the first real models fetch is still outstanding.
 * Once discovery settles — with a catalog OR a failure (e.g. missing Cursor
 * CLI, #103) — background refetches must not re-blank the composer picker,
 * and a failed provider must not park the model control on a skeleton.
 */
export function isInitialModelDiscoveryPending(query: {
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly isPlaceholderData: boolean;
}): boolean {
  return query.isLoading || (query.isFetching && query.isPlaceholderData);
}

function isExplicitlyRetryableDiscoveryError(error: unknown): error is {
  readonly code?: unknown;
  readonly retryable: true;
  readonly retryAfterMs?: unknown;
} {
  return (
    typeof error === "object" && error !== null && "retryable" in error && error.retryable === true
  );
}

const EXPENSIVE_READ_CAPACITY_CODE = "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED";
const WS_REQUEST_TIMEOUT_CODE = "WS_REQUEST_TIMEOUT";
const EXPENSIVE_READ_CAPACITY_RETRY_LIMIT = 12;
const TRANSIENT_DISCOVERY_RETRY_LIMIT = 3;

function discoveryErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function isRetryableProviderCatalogDiscoveryError(error: unknown): boolean {
  const code = discoveryErrorCode(error);
  return (
    code === WS_REQUEST_TIMEOUT_CODE ||
    (isExplicitlyRetryableDiscoveryError(error) &&
      (code === EXPENSIVE_READ_CAPACITY_CODE ||
        code === PROVIDER_MODEL_DISCOVERY_ERROR_CODES.starting))
  );
}

export function shouldRetryProviderCatalogDiscovery(failureCount: number, error: unknown): boolean {
  if (!isRetryableProviderCatalogDiscoveryError(error)) return false;
  return (
    failureCount <
    (discoveryErrorCode(error) === EXPENSIVE_READ_CAPACITY_CODE
      ? EXPENSIVE_READ_CAPACITY_RETRY_LIMIT
      : TRANSIENT_DISCOVERY_RETRY_LIMIT)
  );
}

export function providerCatalogDiscoveryRetryDelay(attemptIndex: number, error: unknown): number {
  const code = discoveryErrorCode(error);
  if (code === EXPENSIVE_READ_CAPACITY_CODE && isExplicitlyRetryableDiscoveryError(error)) {
    const retryAfterMs = error.retryAfterMs;
    if (typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
      return retryAfterMs;
    }
  }
  if (code === WS_REQUEST_TIMEOUT_CODE || code === PROVIDER_MODEL_DISCOVERY_ERROR_CODES.starting) {
    const baseDelay =
      isExplicitlyRetryableDiscoveryError(error) &&
      typeof error.retryAfterMs === "number" &&
      Number.isFinite(error.retryAfterMs) &&
      error.retryAfterMs >= 0
        ? error.retryAfterMs
        : 250;
    return Math.min(baseDelay * 2 ** attemptIndex, 1_000);
  }
  return Math.min(1_000 * 2 ** attemptIndex, 30_000);
}

export function providerModelsQueryOptions(input: {
  provider: EngineKind;
  binaryPath?: string | null;
  apiEndpoint?: string | null;
  agentDir?: string | null;
  cwd?: string | null;
  enabled?: boolean;
}) {
  // Passive OmniMind model discovery is intentionally global-only: the Server
  // does not bind a Thread/Session or execute Project extensions on this path.
  // Keeping a Project cwd in the query identity would therefore repeat the same
  // expensive runtime catalog load for every Project and briefly replace an
  // authoritative catalog with a cold placeholder during navigation.
  const discoveryCwd = input.provider === "oa" ? null : (input.cwd ?? null);
  return queryOptions({
    queryKey: providerDiscoveryQueryKeys.models(
      input.provider,
      input.binaryPath ?? null,
      input.apiEndpoint ?? null,
      input.agentDir ?? null,
      discoveryCwd,
    ),
    queryFn: async ({ signal }): Promise<ProviderListModelsResult> => {
      const api = ensureNativeApi();
      return api.provider.listModels(
        {
          provider: input.provider,
          ...(input.binaryPath ? { binaryPath: input.binaryPath } : {}),
          ...(input.apiEndpoint ? { apiEndpoint: input.apiEndpoint } : {}),
          ...(input.agentDir ? { agentDir: input.agentDir } : {}),
          ...(discoveryCwd ? { cwd: discoveryCwd } : {}),
        },
        { signal },
      );
    },
    enabled: input.enabled ?? true,
    // Disabled catalog hooks must not keep an observer alive. TanStack then
    // aborts an orphaned request after an Engine switch, while a shared query
    // remains alive when another window or surface still observes it.
    subscribed: input.enabled ?? true,
    // The transport already waits for Server readiness and owns reconnects. Do
    // not add a second 1s + 2s + 4s retry loop for deterministic CLI, auth,
    // config, or unknown provider failures. Only a typed RPC error that
    // explicitly declares itself transient may retry.
    retry: shouldRetryProviderCatalogDiscovery,
    retryDelay: providerCatalogDiscoveryRetryDelay,
    staleTime: input.provider === "droid" ? 5 * 60_000 : 60_000,
    ...(input.provider === "droid" ? { refetchOnWindowFocus: false } : {}),
    placeholderData: (previous) => previous ?? EMPTY_MODELS_RESULT,
  });
}

export function providerAgentsQueryOptions(input: {
  provider: EngineKind;
  binaryPath?: string | null;
  cwd?: string | null;
  enabled?: boolean;
}) {
  return queryOptions({
    queryKey: providerDiscoveryQueryKeys.agents(
      input.provider,
      input.binaryPath ?? null,
      input.cwd ?? null,
    ),
    queryFn: async ({ signal }) => {
      const api = ensureNativeApi();
      return api.provider.listAgents(
        {
          provider: input.provider,
          ...(input.binaryPath ? { binaryPath: input.binaryPath } : {}),
          ...(input.cwd ? { cwd: input.cwd } : {}),
        },
        { signal },
      );
    },
    enabled: input.enabled ?? true,
    subscribed: input.enabled ?? true,
    retry: shouldRetryProviderCatalogDiscovery,
    retryDelay: providerCatalogDiscoveryRetryDelay,
    staleTime: 60_000,
    placeholderData: (previous) => previous ?? EMPTY_AGENTS_RESULT,
  });
}

export function providerPluginsQueryOptions(input: {
  provider: EngineKind;
  cwd: string | null;
  threadId?: string | null;
  enabled?: boolean;
}) {
  return queryOptions({
    queryKey: providerDiscoveryQueryKeys.plugins(input.provider, input.cwd, input.threadId ?? null),
    queryFn: async () => {
      const api = ensureNativeApi();
      return api.provider.listPlugins({
        provider: input.provider,
        ...(input.cwd ? { cwd: input.cwd } : {}),
        ...(input.threadId ? { threadId: input.threadId } : {}),
      });
    },
    enabled: input.enabled ?? true,
    staleTime: 30_000,
    placeholderData: (previous) => previous ?? EMPTY_PLUGINS_RESULT,
  });
}

export function supportsSkillDiscovery(
  capabilities: ProviderComposerCapabilities | undefined,
): boolean {
  return capabilities?.supportsSkillDiscovery === true;
}

export function supportsNativeSlashCommandDiscovery(
  capabilities: ProviderComposerCapabilities | undefined,
): boolean {
  return capabilities?.supportsNativeSlashCommandDiscovery === true;
}

export function supportsPluginDiscovery(
  capabilities: ProviderComposerCapabilities | undefined,
): boolean {
  return capabilities?.supportsPluginDiscovery === true;
}

export function supportsThreadCompaction(
  capabilities: ProviderComposerCapabilities | undefined,
): boolean {
  return capabilities?.supportsThreadCompaction === true;
}

export function supportsThreadImport(
  capabilities: ProviderComposerCapabilities | undefined,
): boolean {
  return capabilities?.supportsThreadImport === true;
}
