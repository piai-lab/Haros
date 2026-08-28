import type {
  EngineExecutionCapabilities,
  EngineInteractionModeCapability,
  EngineComposerCapabilities,
  EngineSelection,
  EngineKind,
  EngineListAgentsResult,
  EngineListCommandsResult,
  EngineListModelsResult,
  EngineListPluginsResult,
  EngineListSkillsResult,
  EngineSkillsCatalogResult,
} from "@harnessos/contracts";
import { ENGINE_MODEL_DISCOVERY_ERROR_CODES } from "@harnessos/contracts";
import { queryOptions } from "@tanstack/react-query";
import { ensureNativeApi } from "~/nativeApi";

const EMPTY_SKILLS_RESULT: EngineListSkillsResult = {
  skills: [],
  source: "empty",
  cached: false,
};

const EMPTY_COMMANDS_RESULT: EngineListCommandsResult = {
  commands: [],
  source: "empty",
  cached: false,
};

const EMPTY_MODELS_RESULT: EngineListModelsResult = {
  models: [],
  source: "empty",
  cached: false,
};

const EMPTY_AGENTS_RESULT: EngineListAgentsResult = {
  agents: [],
  source: "empty",
  cached: false,
};

const EMPTY_PLUGINS_RESULT: EngineListPluginsResult = {
  marketplaces: [],
  marketplaceLoadErrors: [],
  remoteSyncError: null,
  featuredPluginIds: [],
  source: "empty",
  cached: false,
};

export function isProviderDiscoverySessionActive(input: {
  readonly engine: EngineKind;
  readonly session: { readonly engine: EngineKind; readonly status: string } | null | undefined;
}): boolean {
  return input.session?.engine === input.engine && input.session.status !== "closed";
}

export const engineDiscoveryQueryKeys = {
  all: ["engine-discovery"] as const,
  composerCapabilities: (engine: EngineKind) =>
    ["engine-discovery", "composer-capabilities", engine] as const,
  executionCapabilitiesAll: ["engine-discovery", "execution-capabilities"] as const,
  executionCapabilities: (engineSelection: EngineSelection) =>
    [...engineDiscoveryQueryKeys.executionCapabilitiesAll, engineSelection] as const,
  commands: (
    engine: EngineKind,
    cwd: string | null,
    agentDir: string | null,
    connectionKey: string | null,
    threadId: string | null = null,
    activeSession = false,
  ) =>
    [
      "engine-discovery",
      "commands",
      engine,
      cwd,
      agentDir,
      connectionKey,
      threadId,
      activeSession,
    ] as const,
  // The skill list is query-independent (filtering is client-side), so the key
  // deliberately excludes the typed filter to avoid a refetch per keystroke.
  skills: (
    engine: EngineKind,
    cwd: string | null,
    agentDir: string | null,
    threadId: string | null = null,
    activeSession = false,
  ) => ["engine-discovery", "skills", engine, cwd, agentDir, threadId, activeSession] as const,
  skillsCatalog: (cwd: string | null) => ["engine-discovery", "skills-catalog", cwd] as const,
  plugins: (engine: EngineKind, cwd: string | null, threadId: string | null) =>
    ["engine-discovery", "plugins", engine, cwd, threadId] as const,
  plugin: (
    engine: EngineKind,
    marketplacePath: string,
    pluginName: string,
    cwd: string | null,
    threadId: string | null,
  ) => ["engine-discovery", "plugin", engine, marketplacePath, pluginName, cwd, threadId] as const,
  models: (
    engine: EngineKind,
    binaryPath: string | null,
    apiEndpoint: string | null,
    agentDir: string | null,
    cwd: string | null,
  ) => ["engine-discovery", "models", engine, binaryPath, apiEndpoint, agentDir, cwd] as const,
  modelsForProvider: (engine: EngineKind) => ["engine-discovery", "models", engine] as const,
  agentsForProvider: (engine: EngineKind) => ["engine-discovery", "agents", engine] as const,
  agents: (engine: EngineKind, binaryPath: string | null, cwd: string | null) =>
    [...engineDiscoveryQueryKeys.agentsForProvider(engine), binaryPath, cwd] as const,
};

export function providerComposerCapabilitiesQueryOptions(engine: EngineKind) {
  return queryOptions({
    queryKey: engineDiscoveryQueryKeys.composerCapabilities(engine),
    queryFn: async () => {
      const api = ensureNativeApi();
      return api.engine.getComposerCapabilities({ engine });
    },
    staleTime: Infinity,
  });
}

export function engineExecutionCapabilitiesQueryOptions(engineSelection: EngineSelection) {
  return queryOptions({
    queryKey: engineDiscoveryQueryKeys.executionCapabilities(engineSelection),
    queryFn: async () => {
      const api = ensureNativeApi();
      const result = await api.engine.getExecutionCapabilities({ engineSelection });
      if (!engineExecutionCapabilitiesMatchSelection(result, engineSelection)) {
        throw new Error("Engine execution capability response identity did not match the request.");
      }
      return result;
    },
  });
}

export function engineExecutionCapabilitiesMatchSelection(
  capabilities: EngineExecutionCapabilities,
  engineSelection: EngineSelection,
): boolean {
  return (
    capabilities.engine === engineSelection.engine && capabilities.model === engineSelection.model
  );
}

export function isProviderInteractionModeExecutable(
  capability: EngineInteractionModeCapability | undefined,
): capability is EngineInteractionModeCapability & { readonly structurallySupported: true } {
  return (
    capability?.structurallySupported === true &&
    (capability.status === "ready" || capability.status === "degraded")
  );
}

export function providerSkillsQueryOptions(input: {
  engine: EngineKind;
  cwd: string | null;
  threadId?: string | null;
  activeSession?: boolean;
  agentDir?: string | null;
  enabled?: boolean;
}) {
  return queryOptions({
    queryKey: engineDiscoveryQueryKeys.skills(
      input.engine,
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
      return api.engine.listSkills({
        engine: input.engine,
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

// Unified cross-engine skills catalog (settings page); not filtered by toggles.
// Keep prior data during refetches so Settings does not flicker back to "Scanning..."
// while the server refreshes filesystem discovery in the background.
export function skillsCatalogQueryOptions(input?: { cwd?: string | null; enabled?: boolean }) {
  const cwd = input?.cwd ?? null;
  return queryOptions({
    queryKey: engineDiscoveryQueryKeys.skillsCatalog(cwd),
    queryFn: async (): Promise<EngineSkillsCatalogResult> => {
      const api = ensureNativeApi();
      return api.engine.listSkillsCatalog(cwd ? { cwd } : {});
    },
    enabled: input?.enabled ?? true,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function providerCommandsQueryOptions(input: {
  engine: EngineKind;
  cwd: string | null;
  threadId?: string | null;
  activeSession?: boolean;
  binaryPath?: string | null;
  serverUrl?: string | null;
  // Undefined means "not applicable" (non-OpenCode engines); the body normalizes it.
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
    queryKey: engineDiscoveryQueryKeys.commands(
      input.engine,
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
      return api.engine.listCommands({
        engine: input.engine,
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
 * and a failed engine must not park the model control on a skeleton.
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
        code === ENGINE_MODEL_DISCOVERY_ERROR_CODES.starting))
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
  if (code === WS_REQUEST_TIMEOUT_CODE || code === ENGINE_MODEL_DISCOVERY_ERROR_CODES.starting) {
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
  engine: EngineKind;
  binaryPath?: string | null;
  apiEndpoint?: string | null;
  agentDir?: string | null;
  cwd?: string | null;
  enabled?: boolean;
}) {
  // Passive HarnessOS model discovery is intentionally global-only: the Server
  // does not bind a Thread/Session or execute Project extensions on this path.
  // Keeping a Project cwd in the query identity would therefore repeat the same
  // expensive runtime catalog load for every Project and briefly replace an
  // authoritative catalog with a cold placeholder during navigation.
  const discoveryCwd = input.engine === "oa" ? null : (input.cwd ?? null);
  return queryOptions({
    queryKey: engineDiscoveryQueryKeys.models(
      input.engine,
      input.binaryPath ?? null,
      input.apiEndpoint ?? null,
      input.agentDir ?? null,
      discoveryCwd,
    ),
    queryFn: async ({ signal }): Promise<EngineListModelsResult> => {
      const api = ensureNativeApi();
      return api.engine.listModels(
        {
          engine: input.engine,
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
    // config, or unknown engine failures. Only a typed RPC error that
    // explicitly declares itself transient may retry.
    retry: shouldRetryProviderCatalogDiscovery,
    retryDelay: providerCatalogDiscoveryRetryDelay,
    staleTime: input.engine === "droid" ? 5 * 60_000 : 60_000,
    ...(input.engine === "droid" ? { refetchOnWindowFocus: false } : {}),
    placeholderData: (previous) => previous ?? EMPTY_MODELS_RESULT,
  });
}

export function providerAgentsQueryOptions(input: {
  engine: EngineKind;
  binaryPath?: string | null;
  cwd?: string | null;
  enabled?: boolean;
}) {
  return queryOptions({
    queryKey: engineDiscoveryQueryKeys.agents(
      input.engine,
      input.binaryPath ?? null,
      input.cwd ?? null,
    ),
    queryFn: async ({ signal }) => {
      const api = ensureNativeApi();
      return api.engine.listAgents(
        {
          engine: input.engine,
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
  engine: EngineKind;
  cwd: string | null;
  threadId?: string | null;
  enabled?: boolean;
}) {
  return queryOptions({
    queryKey: engineDiscoveryQueryKeys.plugins(input.engine, input.cwd, input.threadId ?? null),
    queryFn: async () => {
      const api = ensureNativeApi();
      return api.engine.listPlugins({
        engine: input.engine,
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
  capabilities: EngineComposerCapabilities | undefined,
): boolean {
  return capabilities?.supportsSkillDiscovery === true;
}

export function supportsNativeSlashCommandDiscovery(
  capabilities: EngineComposerCapabilities | undefined,
): boolean {
  return capabilities?.supportsNativeSlashCommandDiscovery === true;
}

export function supportsPluginDiscovery(
  capabilities: EngineComposerCapabilities | undefined,
): boolean {
  return capabilities?.supportsPluginDiscovery === true;
}

export function supportsThreadCompaction(
  capabilities: EngineComposerCapabilities | undefined,
): boolean {
  return capabilities?.supportsThreadCompaction === true;
}

export function supportsThreadImport(
  capabilities: EngineComposerCapabilities | undefined,
): boolean {
  return capabilities?.supportsThreadImport === true;
}
