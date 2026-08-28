// FILE: serverReactQuery.test.ts
// Purpose: Locks down server React Query polling profiles and cache options.
// Layer: Web data-fetching unit tests

import type { ServerConfig, ServerProviderStatus } from "@harnessos/contracts";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  hasReceivedProviderStatusSnapshot,
  LOCAL_SERVERS_VISIBLE_REFETCH_INTERVAL_MS,
  reconcileServerProviderStatuses,
  readPassiveProviderPresence,
  refreshServerConfigAfterTransportOpen,
  serverAllProviderUsageQueryOptions,
  serverLocalServersQueryOptions,
  serverUsageHistoryQueryOptions,
  serverQueryKeys,
  sidebarLocalServersQueryOptions,
} from "./serverReactQuery";

const READY_CODEX_STATUS = {
  engine: "codex",
  status: "ready",
  available: true,
  authStatus: "authenticated",
  checkedAt: "2026-07-26T16:41:38.945Z",
} satisfies ServerProviderStatus;

function makeServerConfig(engines: readonly ServerProviderStatus[]): ServerConfig {
  return {
    cwd: "G:\\harnessos",
    homeDir: "C:\\Users\\tester",
    chatWorkspaceRoot: "C:\\Users\\tester\\Documents\\HarnessOS",
    studioWorkspaceRoot: "C:\\Users\\tester\\Documents\\HarnessOS\\Studio",
    worktreesDir: "C:\\HarnessOSDev\\worktrees",
    keybindingsConfigPath: "C:\\HarnessOSDev\\keybindings.json",
    keybindings: [],
    issues: [],
    engines,
    availableEditors: [],
  };
}

describe("server engine status reconciliation", () => {
  it("distinguishes an authoritative empty refresh from an unobserved startup cache", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(serverQueryKeys.config(), makeServerConfig([]));

    expect(hasReceivedProviderStatusSnapshot(queryClient)).toBe(false);
    await reconcileServerProviderStatuses(queryClient, []);
    expect(hasReceivedProviderStatusSnapshot(queryClient)).toBe(false);
    await reconcileServerProviderStatuses(queryClient, [], { passivePresence: [] });
    expect(hasReceivedProviderStatusSnapshot(queryClient)).toBe(true);
    expect(readPassiveProviderPresence(queryClient)).toEqual([]);
  });

  it("applies a missed live snapshot after the config projection hydrates", async () => {
    const queryClient = new QueryClient();
    let resolveConfig!: (config: ServerConfig) => void;
    const configProjection = new Promise<ServerConfig>((resolve) => {
      resolveConfig = resolve;
    });

    const reconciliation = reconcileServerProviderStatuses(queryClient, [READY_CODEX_STATUS], {
      loadConfig: () => configProjection,
    });

    expect(queryClient.getQueryData(serverQueryKeys.config())).toBeUndefined();

    resolveConfig(makeServerConfig([]));
    await reconciliation;

    expect(queryClient.getQueryData<ServerConfig>(serverQueryKeys.config())?.engines).toEqual([
      READY_CODEX_STATUS,
    ]);
  });

  it("keeps the newest engine snapshot when hydration overlaps multiple events", async () => {
    const queryClient = new QueryClient();
    let resolveConfig!: (config: ServerConfig) => void;
    const configProjection = new Promise<ServerConfig>((resolve) => {
      resolveConfig = resolve;
    });
    const unavailableStatus = {
      ...READY_CODEX_STATUS,
      status: "warning",
      available: false,
      authStatus: "unknown",
      checkedAt: "2026-07-26T16:40:00.000Z",
    } satisfies ServerProviderStatus;

    const first = reconcileServerProviderStatuses(queryClient, [unavailableStatus], {
      loadConfig: () => configProjection,
    });
    const second = reconcileServerProviderStatuses(queryClient, [READY_CODEX_STATUS], {
      loadConfig: () => configProjection,
    });

    resolveConfig(makeServerConfig([]));
    await Promise.all([first, second]);

    expect(queryClient.getQueryData<ServerConfig>(serverQueryKeys.config())?.engines).toEqual([
      READY_CODEX_STATUS,
    ]);
  });

  it("keeps a engine snapshot that arrives during reconnect config refresh", async () => {
    const queryClient = new QueryClient();
    const unavailableStatus = {
      ...READY_CODEX_STATUS,
      status: "warning",
      available: false,
      authStatus: "unknown",
      checkedAt: "2026-07-26T16:40:00.000Z",
    } satisfies ServerProviderStatus;
    queryClient.setQueryData(serverQueryKeys.config(), makeServerConfig([unavailableStatus]));
    let resolveConfig!: (config: ServerConfig) => void;
    const configProjection = new Promise<ServerConfig>((resolve) => {
      resolveConfig = resolve;
    });

    const refresh = refreshServerConfigAfterTransportOpen(queryClient, {
      loadConfig: () => configProjection,
    });
    await reconcileServerProviderStatuses(queryClient, [READY_CODEX_STATUS]);
    resolveConfig(makeServerConfig([unavailableStatus]));
    await refresh;

    expect(queryClient.getQueryData<ServerConfig>(serverQueryKeys.config())?.engines).toEqual([
      READY_CODEX_STATUS,
    ]);
  });

  it("accepts reconnect config when no newer engine snapshot arrives", async () => {
    const queryClient = new QueryClient();
    const unavailableStatus = {
      ...READY_CODEX_STATUS,
      status: "warning",
      available: false,
      authStatus: "unknown",
      checkedAt: "2026-07-26T16:40:00.000Z",
    } satisfies ServerProviderStatus;
    queryClient.setQueryData(serverQueryKeys.config(), makeServerConfig([unavailableStatus]));
    await reconcileServerProviderStatuses(queryClient, [unavailableStatus]);

    await refreshServerConfigAfterTransportOpen(queryClient, {
      loadConfig: async () => makeServerConfig([READY_CODEX_STATUS]),
    });

    expect(queryClient.getQueryData<ServerConfig>(serverQueryKeys.config())?.engines).toEqual([
      READY_CODEX_STATUS,
    ]);
  });
});

describe("serverLocalServersQueryOptions", () => {
  it("uses the visible polling interval by default", () => {
    const options = serverLocalServersQueryOptions(true);

    expect(options.enabled).toBe(true);
    expect(options.refetchInterval).toBe(LOCAL_SERVERS_VISIBLE_REFETCH_INTERVAL_MS);
  });

  it("disables polling when disabled", () => {
    const options = serverLocalServersQueryOptions(false);

    expect(options.enabled).toBe(false);
    expect(options.refetchInterval).toBe(false);
  });

  it("keeps sidebar attribution enabled without idle polling", () => {
    const options = sidebarLocalServersQueryOptions({
      hasActiveProjectRun: false,
      hasProjects: true,
    });

    expect(options.enabled).toBe(true);
    expect(options.refetchInterval).toBe(false);
    expect(options.refetchOnWindowFocus).toBe(true);
  });

  it("uses visible polling while a HarnessOS-owned project run is active", () => {
    const options = sidebarLocalServersQueryOptions({
      hasActiveProjectRun: true,
      hasProjects: true,
    });

    expect(options.enabled).toBe(true);
    expect(options.refetchInterval).toBe(LOCAL_SERVERS_VISIBLE_REFETCH_INTERVAL_MS);
  });

  it("disables sidebar attribution when no projects or project runs exist", () => {
    const options = sidebarLocalServersQueryOptions({
      hasActiveProjectRun: false,
      hasProjects: false,
    });

    expect(options.enabled).toBe(false);
    expect(options.refetchInterval).toBe(false);
  });
});

describe("serverAllProviderUsageQueryOptions", () => {
  it("can be disabled by engine-scoped usage surfaces", () => {
    const options = serverAllProviderUsageQueryOptions(false);

    expect(options.enabled).toBe(false);
  });

  it("shares one batch query key across every usage surface", () => {
    const options = serverAllProviderUsageQueryOptions();

    expect(options.queryKey).toEqual(serverQueryKeys.allProviderUsage());
  });
});

describe("serverUsageHistoryQueryOptions", () => {
  it("uses a separate DB-backed cache key without an archive polling interval", () => {
    const options = serverUsageHistoryQueryOptions({ range: "7d", groupBy: "model" });

    expect(options.queryKey).toEqual(serverQueryKeys.usageHistory("7d", "model"));
    expect(typeof options.refetchInterval).toBe("function");
  });
});
