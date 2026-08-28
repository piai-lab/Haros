// FILE: engineModelPrefetch.ts
// Purpose: Warm engine model discovery and composer capabilities into the
//          React Query cache before a new thread mounts ChatView, so the
//          composer can skip the "Loading models" skeleton and capability
//          round-trips on the common new-thread path.
// Layer: Web lib
// Exports: resolve + prefetch helpers that mirror ChatView's listModels query keys.

import type { EngineKind, ServerSettingsView } from "@harnessos/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { resolveProviderDiscoveryCwd } from "./engineDiscovery";
import { resolveNewThreadDiscoveryWorktreePath } from "./threadBootstrap";
import {
  providerAgentsQueryOptions,
  providerComposerCapabilitiesQueryOptions,
  providerModelsQueryOptions,
} from "./engineDiscoveryReactQuery";

export type EngineModelPrefetchSettings = Pick<ServerSettingsView, "defaultEngine" | "engines">;

export function resolveNewThreadModelPrefetchProvider(input: {
  providerOverride?: EngineKind | null | undefined;
  draftActiveProvider?: EngineKind | null | undefined;
  stickyActiveProvider?: EngineKind | null | undefined;
  projectDefaultProvider?: EngineKind | null | undefined;
  defaultEngine: EngineKind;
}): EngineKind {
  return (
    input.providerOverride ??
    input.draftActiveProvider ??
    input.stickyActiveProvider ??
    input.projectDefaultProvider ??
    input.defaultEngine
  );
}

export function resolveNewThreadModelPrefetchCwd(input: {
  worktreePath?: string | null | undefined;
  hasExplicitWorktreePath?: boolean;
  fresh?: boolean;
  temporary?: boolean;
  envMode?: "local" | "worktree" | null | undefined;
  draftWorktreePath?: string | null | undefined;
  projectCwd?: string | null | undefined;
  serverCwd?: string | null | undefined;
}): string | null {
  const worktreePath = resolveNewThreadDiscoveryWorktreePath({
    options: {
      ...(input.hasExplicitWorktreePath === true
        ? { worktreePath: input.worktreePath ?? null }
        : {}),
      ...(input.fresh === true ? { fresh: true } : {}),
      ...(input.temporary === true ? { temporary: true } : {}),
      ...(input.envMode ? { envMode: input.envMode } : {}),
    },
    draftWorktreePath: input.draftWorktreePath,
  });
  return resolveProviderDiscoveryCwd({
    activeThreadWorktreePath: worktreePath,
    activeProjectCwd: input.projectCwd ?? null,
    serverCwd: input.serverCwd ?? null,
  });
}

/**
 * Build the same listModels query options ChatView uses for a engine, so a
 * prefetch lands on the exact cache key the composer will read on mount.
 */
export function providerModelsPrefetchQueryOptions(input: {
  engine: EngineKind;
  settings: EngineModelPrefetchSettings;
  cwd?: string | null;
}) {
  const { engine, settings } = input;
  const cwd = input.cwd ?? null;

  switch (engine) {
    case "oa":
      return providerModelsQueryOptions({ engine: "oa", cwd });
    case "claude":
      return providerModelsQueryOptions({
        engine: "claude",
        binaryPath: settings.engines.claude.binaryPath || null,
      });
    case "codex":
      return providerModelsQueryOptions({ engine: "codex" });
    case "cursor":
      return providerModelsQueryOptions({
        engine: "cursor",
        binaryPath: settings.engines.cursor.binaryPath || null,
        apiEndpoint: settings.engines.cursor.apiEndpoint || null,
      });
    case "antigravity":
      return providerModelsQueryOptions({
        engine: "antigravity",
        binaryPath: settings.engines.antigravity.binaryPath || null,
        cwd,
      });
    case "grok":
      return providerModelsQueryOptions({
        engine: "grok",
        binaryPath: settings.engines.grok.binaryPath || null,
      });
    case "droid":
      return providerModelsQueryOptions({
        engine: "droid",
        binaryPath: settings.engines.droid.binaryPath || null,
        cwd,
      });
    case "kilo":
      return providerModelsQueryOptions({
        engine: "kilo",
        binaryPath: settings.engines.kilo.binaryPath || null,
        cwd,
      });
    case "opencode":
      return providerModelsQueryOptions({
        engine: "opencode",
        binaryPath: settings.engines.opencode.binaryPath || null,
        cwd,
      });
    case "pi":
      return providerModelsQueryOptions({
        engine: "pi",
        binaryPath: settings.engines.pi.binaryPath || null,
        agentDir: settings.engines.pi.agentDir || null,
        cwd,
      });
  }
}

function providerAgentsPrefetchQueryOptions(input: {
  engine: EngineKind;
  settings: EngineModelPrefetchSettings;
  cwd?: string | null;
}) {
  const { engine, settings } = input;
  const cwd = input.cwd ?? null;

  switch (engine) {
    case "claude":
      return providerAgentsQueryOptions({ engine: "claude" });
    case "codex":
      return providerAgentsQueryOptions({ engine: "codex" });
    case "kilo":
      return providerAgentsQueryOptions({
        engine: "kilo",
        binaryPath: settings.engines.kilo.binaryPath || null,
        cwd,
      });
    case "opencode":
      return providerAgentsQueryOptions({
        engine: "opencode",
        binaryPath: settings.engines.opencode.binaryPath || null,
        cwd,
      });
    default:
      return null;
  }
}

export function prefetchProviderModelsForNewThread(
  queryClient: QueryClient,
  input: {
    engine: EngineKind;
    settings: EngineModelPrefetchSettings;
    cwd?: string | null;
    enabled?: boolean;
  },
): void {
  if (input.enabled === false) {
    return;
  }
  const cwd = input.cwd ?? null;
  const modelPrefetch = queryClient.prefetchQuery(
    providerModelsPrefetchQueryOptions({
      engine: input.engine,
      settings: input.settings,
      cwd,
    }),
  );

  // Agent/mode lists ride along for engines that surface them next to models.
  const agentsOptions = providerAgentsPrefetchQueryOptions({
    engine: input.engine,
    settings: input.settings,
    cwd,
  });
  if (agentsOptions) {
    // Model readiness is send-critical, while agent/mode metadata is secondary.
    // Sequence the two expensive reads so a new Thread cannot consume both
    // Server admission leases before its model catalog is available.
    void modelPrefetch.then(() => queryClient.prefetchQuery(agentsOptions));
  }

  // Composer capabilities gate composer affordances on ChatView mount; the query
  // has staleTime Infinity, so this costs one IPC per engine per session.
  void queryClient.prefetchQuery(providerComposerCapabilitiesQueryOptions(input.engine));
}
