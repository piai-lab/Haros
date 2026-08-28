// FILE: providerUsage/index.ts
// Purpose: Orchestrate the live engine-usage fetchers — defensive batch fetch (one failure never
// blocks the others), per-engine snapshot caching with single-flight coalescing, and enrichment
// of Codex/Claude live snapshots with the locally-derived token-total usage lines. Exposes both a
// plain async API (for tests) and an Effect that reads ServerConfig (for the WS RPC handler).

import type {
  EngineKind,
  ServerListProviderUsageInput,
  ServerListProviderUsageResult,
  ServerProviderUsageSnapshot,
} from "@harnessos/contracts";
import { Effect } from "effect";

import { ENGINE_USAGE_PROVIDERS } from "@harnessos/shared/providerUsage";

import { ServerConfig } from "../config";
import { buildProviderChildEnvironment, type EngineChildKind } from "../providerChildEnvironment";
import { ServerSettingsService } from "../serverSettings";
import { EngineAdapterRegistry } from "../provider/Services/EngineAdapterRegistry";
import { errorSnapshot } from "./parse";
import { ENGINE_USAGE_FETCHERS } from "./registry";
import type { EngineUsageContext } from "./types";

const providerChildKind = (engine: EngineKind): EngineChildKind =>
  engine === "claude" ? "claude" : engine === "oa" ? "pi" : engine;

function buildContext(): EngineUsageContext {
  return {
    homeDir: "",
    env: process.env,
    platform: process.platform,
    nowMs: Date.now(),
  };
}

async function fetchProviderUsage(
  engine: EngineKind,
  providerContext: EngineUsageContext,
): Promise<ServerProviderUsageSnapshot | null> {
  const fetcher = ENGINE_USAGE_FETCHERS[engine];
  if (!fetcher) {
    return null;
  }

  return fetcher
    .fetch(providerContext)
    .catch(() =>
      errorSnapshot(
        engine,
        providerContext.nowMs,
        "live-usage",
        "Usage fetch failed unexpectedly.",
      ),
    );
}

function buildProviderContext(engine: EngineKind, ctx: EngineUsageContext): EngineUsageContext {
  return {
    ...ctx,
    env: buildProviderChildEnvironment({
      engine: providerChildKind(engine),
      baseEnv: ctx.env,
    }),
  };
}

// Every UI surface (header chip, branch toolbar, settings panel) plus their periodic refetches
// funnels through this cache, so one browser tab doesn't hammer engine endpoints — or spawn
// `claude auth status` processes — once per surface. Fresh snapshots are served from memory,
// concurrent requests for the same engine coalesce into a single fetch, and `forceRefresh`
// (the settings panel's explicit refresh button) bypasses the TTL but still joins an in-flight
// fetch. Degraded snapshots (errors, re-served last-good data) expire faster so recovery is
// picked up quickly. Keyed by EngineKind, so the cache is inherently bounded.
const SNAPSHOT_CACHE_TTL_MS = 5 * 60 * 1000;
const SNAPSHOT_CACHE_DEGRADED_TTL_MS = 60 * 1000;

interface CachedSnapshot {
  snapshot: ServerProviderUsageSnapshot;
  fetchedAtMs: number;
  credentialKey: string;
}

interface InFlightSnapshot {
  credentialKey: string;
  promise: Promise<ServerProviderUsageSnapshot | null>;
}

const snapshotCache = new Map<EngineKind, CachedSnapshot>();
const inFlightFetches = new Map<EngineKind, InFlightSnapshot>();

const snapshotCacheTtlMs = (snapshot: ServerProviderUsageSnapshot): number =>
  snapshot.stale === true
    ? 0
    : (snapshot.status ?? "ok") === "error" || (snapshot.status ?? "ok") === "needs-auth"
      ? SNAPSHOT_CACHE_DEGRADED_TTL_MS
      : SNAPSHOT_CACHE_TTL_MS;

async function resolveCredentialKey(
  engine: EngineKind,
  ctx: EngineUsageContext,
): Promise<string | null> {
  const fetcher = ENGINE_USAGE_FETCHERS[engine];
  if (!fetcher?.cacheKey) {
    return engine;
  }
  try {
    return await fetcher.cacheKey(ctx);
  } catch {
    return null;
  }
}

/** Test-only: drop the snapshot cache and any in-flight coalescing state. */
export function __resetProviderUsageCacheForTests(): void {
  snapshotCache.clear();
  inFlightFetches.clear();
}

async function getProviderUsageSnapshot(
  engine: EngineKind,
  ctx: EngineUsageContext,
  forceRefresh: boolean,
): Promise<ServerProviderUsageSnapshot | null> {
  const providerContext = buildProviderContext(engine, ctx);
  const credentialKey = await resolveCredentialKey(engine, providerContext);
  const pending = inFlightFetches.get(engine);
  if (credentialKey !== null && pending?.credentialKey === credentialKey) {
    return pending.promise;
  }

  if (!forceRefresh && credentialKey !== null) {
    const cached = snapshotCache.get(engine);
    if (
      cached &&
      cached.credentialKey === credentialKey &&
      ctx.nowMs - cached.fetchedAtMs < snapshotCacheTtlMs(cached.snapshot)
    ) {
      return cached.snapshot;
    }
  }

  const fetchPromise = (async () => {
    const snapshot = await fetchProviderUsage(engine, providerContext);
    const refreshedCredentialKey = await resolveCredentialKey(engine, providerContext);
    if (snapshot && credentialKey !== null && refreshedCredentialKey === credentialKey) {
      const current = snapshotCache.get(engine);
      const hasFreshHealthySnapshot =
        current?.credentialKey === credentialKey &&
        snapshotCacheTtlMs(current.snapshot) === SNAPSHOT_CACHE_TTL_MS &&
        ctx.nowMs - current.fetchedAtMs < SNAPSHOT_CACHE_TTL_MS;
      const fetchedFailedSnapshot = (snapshot.status ?? "ok") === "error";
      if (fetchedFailedSnapshot && hasFreshHealthySnapshot && current) {
        return current.snapshot;
      }
      snapshotCache.set(engine, {
        snapshot,
        fetchedAtMs: ctx.nowMs,
        credentialKey,
      });
    }
    return snapshot;
  })();
  if (credentialKey !== null) {
    inFlightFetches.set(engine, { credentialKey, promise: fetchPromise });
  }
  try {
    return await fetchPromise;
  } finally {
    if (inFlightFetches.get(engine)?.promise === fetchPromise) {
      inFlightFetches.delete(engine);
    }
  }
}

/** Plain async batch fetch for supported engines. Never throws. */
export async function collectProviderUsageSnapshots(
  ctx: EngineUsageContext,
  options: { forceRefresh?: boolean; engine?: EngineKind } = {},
): Promise<ServerProviderUsageSnapshot[]> {
  const engines = options.engine
    ? ([options.engine] as EngineKind[])
    : ENGINE_USAGE_PROVIDERS.filter((engine) => ENGINE_USAGE_FETCHERS[engine] !== undefined);
  const settled = await Promise.allSettled(
    engines.map((engine) => getProviderUsageSnapshot(engine, ctx, options.forceRefresh === true)),
  );

  return settled
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((snapshot): snapshot is ServerProviderUsageSnapshot => snapshot !== null);
}

export const listProviderUsage = Effect.fn(function* (input: ServerListProviderUsageInput) {
  const serverConfig = yield* ServerConfig;
  const serverSettings = yield* ServerSettingsService;
  const providerRegistry = yield* EngineAdapterRegistry;
  const settings = yield* serverSettings.getSettings;
  const codexAdapter = yield* providerRegistry.getByEngine("codex");
  return yield* Effect.tryPromise({
    try: () =>
      collectProviderUsageSnapshots(
        {
          ...buildContext(),
          homeDir: serverConfig.homeDir,
          claudeBinaryPath: settings.engines.claude.binaryPath,
          ...(codexAdapter.readAccountRateLimits
            ? {
                codexRateLimits: () => Effect.runPromise(codexAdapter.readAccountRateLimits!()),
              }
            : {}),
        },
        {
          forceRefresh: input.forceRefresh === true,
          ...(input.engine ? { engine: input.engine } : {}),
        },
      ),
    catch: () => [] as unknown as ServerListProviderUsageResult,
  });
});
