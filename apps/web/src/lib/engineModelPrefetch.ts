// FILE: engineModelPrefetch.ts
// Purpose: Warm engine model discovery and composer capabilities into the
//          React Query cache before a new thread mounts ChatView, so the
//          composer can skip the "Loading models" skeleton and capability
//          round-trips on the common new-thread path.
// Layer: Web lib
// Exports: resolve + prefetch helpers that mirror ChatView's listModels query keys.

import type { EngineKind, ServerSettingsView } from "@harnessos/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { resolveEngineDiscoveryCwd } from "./engineDiscovery";
import { resolveNewThreadDiscoveryWorktreePath } from "./threadBootstrap";
import {
  engineAgentsQueryOptions,
  engineComposerCapabilitiesQueryOptions,
  engineModelsQueryOptions,
} from "./engineDiscoveryReactQuery";

export type EngineModelPrefetchSettings = Pick<ServerSettingsView, "defaultEngine" | "engines">;

export function resolveNewThreadModelPrefetchEngine(input: {
  engineOverride?: EngineKind | null | undefined;
  draftActiveEngine?: EngineKind | null | undefined;
  stickyActiveEngine?: EngineKind | null | undefined;
  projectDefaultEngine?: EngineKind | null | undefined;
  defaultEngine: EngineKind;
}): EngineKind {
  return (
    input.engineOverride ??
    input.draftActiveEngine ??
    input.stickyActiveEngine ??
    input.projectDefaultEngine ??
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
  return resolveEngineDiscoveryCwd({
    activeThreadWorktreePath: worktreePath,
    activeProjectCwd: input.projectCwd ?? null,
    serverCwd: input.serverCwd ?? null,
  });
}

/**
 * Build the same listModels query options ChatView uses for a engine, so a
 * prefetch lands on the exact cache key the composer will read on mount.
 */
export function engineModelsPrefetchQueryOptions(input: {
  engine: EngineKind;
  settings: EngineModelPrefetchSettings;
  cwd?: string | null;
}) {
  const { engine, settings } = input;
  const cwd = input.cwd ?? null;

  switch (engine) {
    case "oa":
      return engineModelsQueryOptions({ engine: "oa", cwd });
    case "claude":
      return engineModelsQueryOptions({
        engine: "claude",
        binaryPath: settings.engines.claude.binaryPath || null,
      });
    case "codex":
      return engineModelsQueryOptions({ engine: "codex" });
    case "cursor":
      return engineModelsQueryOptions({
        engine: "cursor",
        binaryPath: settings.engines.cursor.binaryPath || null,
        apiEndpoint: settings.engines.cursor.apiEndpoint || null,
      });
    case "antigravity":
      return engineModelsQueryOptions({
        engine: "antigravity",
        binaryPath: settings.engines.antigravity.binaryPath || null,
        cwd,
      });
    case "grok":
      return engineModelsQueryOptions({
        engine: "grok",
        binaryPath: settings.engines.grok.binaryPath || null,
      });
    case "droid":
      return engineModelsQueryOptions({
        engine: "droid",
        binaryPath: settings.engines.droid.binaryPath || null,
        cwd,
      });
    case "kilo":
      return engineModelsQueryOptions({
        engine: "kilo",
        binaryPath: settings.engines.kilo.binaryPath || null,
        cwd,
      });
    case "opencode":
      return engineModelsQueryOptions({
        engine: "opencode",
        binaryPath: settings.engines.opencode.binaryPath || null,
        cwd,
      });
    case "pi":
      return engineModelsQueryOptions({
        engine: "pi",
        binaryPath: settings.engines.pi.binaryPath || null,
        agentDir: settings.engines.pi.agentDir || null,
        cwd,
      });
    default:
      return null;
  }
}

function engineAgentsPrefetchQueryOptions(input: {
  engine: EngineKind;
  settings: EngineModelPrefetchSettings;
  cwd?: string | null;
}) {
  const { engine, settings } = input;
  const cwd = input.cwd ?? null;

  switch (engine) {
    case "claude":
      return engineAgentsQueryOptions({ engine: "claude" });
    case "codex":
      return engineAgentsQueryOptions({ engine: "codex" });
    case "kilo":
      return engineAgentsQueryOptions({
        engine: "kilo",
        binaryPath: settings.engines.kilo.binaryPath || null,
        cwd,
      });
    case "opencode":
      return engineAgentsQueryOptions({
        engine: "opencode",
        binaryPath: settings.engines.opencode.binaryPath || null,
        cwd,
      });
    default:
      return null;
  }
}

export function prefetchEngineModelsForNewThread(
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
  const modelOptions = engineModelsPrefetchQueryOptions({
    engine: input.engine,
    settings: input.settings,
    cwd,
  });
  if (!modelOptions) {
    return;
  }
  const modelPrefetch = queryClient.prefetchQuery(modelOptions);

  // Agent/mode lists ride along for engines that surface them next to models.
  const agentsOptions = engineAgentsPrefetchQueryOptions({
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
  void queryClient.prefetchQuery(engineComposerCapabilitiesQueryOptions(input.engine));
}
