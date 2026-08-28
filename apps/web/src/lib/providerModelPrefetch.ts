// FILE: providerModelPrefetch.ts
// Purpose: Warm provider model discovery and composer capabilities into the
//          React Query cache before a new thread mounts ChatView, so the
//          composer can skip the "Loading models" skeleton and capability
//          round-trips on the common new-thread path.
// Layer: Web lib
// Exports: resolve + prefetch helpers that mirror ChatView's listModels query keys.

import type { ProviderKind, ServerSettingsView } from "@harnessos/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { resolveProviderDiscoveryCwd } from "./providerDiscovery";
import { resolveNewThreadDiscoveryWorktreePath } from "./threadBootstrap";
import {
  providerAgentsQueryOptions,
  providerComposerCapabilitiesQueryOptions,
  providerModelsQueryOptions,
} from "./providerDiscoveryReactQuery";

export type ProviderModelPrefetchSettings = Pick<
  ServerSettingsView,
  "defaultProvider" | "providers"
>;

export function resolveNewThreadModelPrefetchProvider(input: {
  providerOverride?: ProviderKind | null | undefined;
  draftActiveProvider?: ProviderKind | null | undefined;
  stickyActiveProvider?: ProviderKind | null | undefined;
  projectDefaultProvider?: ProviderKind | null | undefined;
  defaultProvider: ProviderKind;
}): ProviderKind {
  return (
    input.providerOverride ??
    input.draftActiveProvider ??
    input.stickyActiveProvider ??
    input.projectDefaultProvider ??
    input.defaultProvider
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
 * Build the same listModels query options ChatView uses for a provider, so a
 * prefetch lands on the exact cache key the composer will read on mount.
 */
export function providerModelsPrefetchQueryOptions(input: {
  provider: ProviderKind;
  settings: ProviderModelPrefetchSettings;
  cwd?: string | null;
}) {
  const { provider, settings } = input;
  const cwd = input.cwd ?? null;

  switch (provider) {
    case "omnimind":
      return providerModelsQueryOptions({ provider: "omnimind", cwd });
    case "claudeAgent":
      return providerModelsQueryOptions({
        provider: "claudeAgent",
        binaryPath: settings.providers.claudeAgent.binaryPath || null,
      });
    case "codex":
      return providerModelsQueryOptions({ provider: "codex" });
    case "cursor":
      return providerModelsQueryOptions({
        provider: "cursor",
        binaryPath: settings.providers.cursor.binaryPath || null,
        apiEndpoint: settings.providers.cursor.apiEndpoint || null,
      });
    case "antigravity":
      return providerModelsQueryOptions({
        provider: "antigravity",
        binaryPath: settings.providers.antigravity.binaryPath || null,
        cwd,
      });
    case "grok":
      return providerModelsQueryOptions({
        provider: "grok",
        binaryPath: settings.providers.grok.binaryPath || null,
      });
    case "droid":
      return providerModelsQueryOptions({
        provider: "droid",
        binaryPath: settings.providers.droid.binaryPath || null,
        cwd,
      });
    case "kilo":
      return providerModelsQueryOptions({
        provider: "kilo",
        binaryPath: settings.providers.kilo.binaryPath || null,
        cwd,
      });
    case "opencode":
      return providerModelsQueryOptions({
        provider: "opencode",
        binaryPath: settings.providers.opencode.binaryPath || null,
        cwd,
      });
    case "pi":
      return providerModelsQueryOptions({
        provider: "pi",
        binaryPath: settings.providers.pi.binaryPath || null,
        agentDir: settings.providers.pi.agentDir || null,
        cwd,
      });
  }
}

function providerAgentsPrefetchQueryOptions(input: {
  provider: ProviderKind;
  settings: ProviderModelPrefetchSettings;
  cwd?: string | null;
}) {
  const { provider, settings } = input;
  const cwd = input.cwd ?? null;

  switch (provider) {
    case "claudeAgent":
      return providerAgentsQueryOptions({ provider: "claudeAgent" });
    case "codex":
      return providerAgentsQueryOptions({ provider: "codex" });
    case "kilo":
      return providerAgentsQueryOptions({
        provider: "kilo",
        binaryPath: settings.providers.kilo.binaryPath || null,
        cwd,
      });
    case "opencode":
      return providerAgentsQueryOptions({
        provider: "opencode",
        binaryPath: settings.providers.opencode.binaryPath || null,
        cwd,
      });
    default:
      return null;
  }
}

export function prefetchProviderModelsForNewThread(
  queryClient: QueryClient,
  input: {
    provider: ProviderKind;
    settings: ProviderModelPrefetchSettings;
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
      provider: input.provider,
      settings: input.settings,
      cwd,
    }),
  );

  // Agent/mode lists ride along for providers that surface them next to models.
  const agentsOptions = providerAgentsPrefetchQueryOptions({
    provider: input.provider,
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
  // has staleTime Infinity, so this costs one IPC per provider per session.
  void queryClient.prefetchQuery(providerComposerCapabilitiesQueryOptions(input.provider));
}
