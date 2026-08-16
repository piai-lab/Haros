// FILE: providerModelPrefetch.test.ts
// Purpose: Verifies new-thread model prefetch resolves providers/cwds and hits
//          the same React Query keys ChatView uses for listModels.
// Layer: Web lib tests

import type { NativeApi, ProviderKind } from "@omnimind/contracts";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  prefetchProviderModelsForNewThread,
  providerModelsPrefetchQueryOptions,
  resolveNewThreadModelPrefetchCwd,
  resolveNewThreadModelPrefetchProvider,
  type ProviderModelPrefetchSettings,
} from "./providerModelPrefetch";
import { providerDiscoveryQueryKeys } from "./providerDiscoveryReactQuery";
import * as nativeApi from "../nativeApi";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeSettings(
  overrides: Partial<ProviderModelPrefetchSettings> = {},
): ProviderModelPrefetchSettings {
  return {
    defaultProvider: "codex",
    claudeBinaryPath: "",
    cursorBinaryPath: "",
    cursorApiEndpoint: "",
    antigravityBinaryPath: "",
    grokBinaryPath: "",
    droidBinaryPath: "",
    kiloBinaryPath: "",
    openCodeBinaryPath: "",
    piBinaryPath: "",
    piAgentDir: "",
    ...overrides,
  };
}

describe("resolveNewThreadModelPrefetchProvider", () => {
  it("prefers the explicit override, then draft, sticky, project, and app defaults", () => {
    expect(
      resolveNewThreadModelPrefetchProvider({
        providerOverride: "droid",
        draftActiveProvider: "cursor",
        stickyActiveProvider: "pi",
        projectDefaultProvider: "opencode",
        defaultProvider: "codex",
      }),
    ).toBe("droid");

    expect(
      resolveNewThreadModelPrefetchProvider({
        draftActiveProvider: "cursor",
        stickyActiveProvider: "pi",
        projectDefaultProvider: "opencode",
        defaultProvider: "codex",
      }),
    ).toBe("cursor");

    expect(
      resolveNewThreadModelPrefetchProvider({
        draftActiveProvider: null,
        stickyActiveProvider: "pi",
        projectDefaultProvider: "opencode",
        defaultProvider: "codex",
      }),
    ).toBe("pi");

    expect(
      resolveNewThreadModelPrefetchProvider({
        stickyActiveProvider: null,
        projectDefaultProvider: "opencode",
        defaultProvider: "codex",
      }),
    ).toBe("opencode");

    expect(
      resolveNewThreadModelPrefetchProvider({
        projectDefaultProvider: null,
        defaultProvider: "claudeAgent",
      }),
    ).toBe("claudeAgent");
  });
});

describe("resolveNewThreadModelPrefetchCwd", () => {
  it("prefers draft worktree, then project cwd, then server cwd", () => {
    expect(
      resolveNewThreadModelPrefetchCwd({
        draftWorktreePath: "/tmp/worktree",
        projectCwd: "/tmp/project",
        serverCwd: "/tmp/server",
      }),
    ).toBe("/tmp/worktree");

    expect(
      resolveNewThreadModelPrefetchCwd({
        draftWorktreePath: null,
        projectCwd: "/tmp/project",
        serverCwd: "/tmp/server",
      }),
    ).toBe("/tmp/project");

    expect(
      resolveNewThreadModelPrefetchCwd({
        projectCwd: null,
        serverCwd: "/tmp/server",
      }),
    ).toBe("/tmp/server");
  });

  it("mirrors thread bootstrap precedence for explicit, fresh, temporary, and local intents", () => {
    const base = {
      draftWorktreePath: "/tmp/draft-worktree",
      projectCwd: "/tmp/project",
      serverCwd: "/tmp/server",
    } as const;

    expect(
      resolveNewThreadModelPrefetchCwd({
        ...base,
        worktreePath: "/tmp/explicit-worktree",
        hasExplicitWorktreePath: true,
        fresh: true,
        temporary: true,
        envMode: "local",
      }),
    ).toBe("/tmp/explicit-worktree");
    expect(
      resolveNewThreadModelPrefetchCwd({
        ...base,
        worktreePath: null,
        hasExplicitWorktreePath: true,
      }),
    ).toBe("/tmp/project");
    expect(resolveNewThreadModelPrefetchCwd({ ...base, fresh: true })).toBe("/tmp/project");
    expect(resolveNewThreadModelPrefetchCwd({ ...base, temporary: true })).toBe("/tmp/project");
    expect(resolveNewThreadModelPrefetchCwd({ ...base, envMode: "local" })).toBe("/tmp/project");
    expect(resolveNewThreadModelPrefetchCwd({ ...base, envMode: "worktree" })).toBe(
      "/tmp/draft-worktree",
    );
  });
});

describe("providerModelsPrefetchQueryOptions", () => {
  it("matches ChatView cache keys for cwd-scoped and binary-scoped providers", () => {
    const settings = makeSettings({
      claudeBinaryPath: "/bin/claude",
      cursorBinaryPath: "/bin/agent",
      cursorApiEndpoint: "https://api.example",
      antigravityBinaryPath: "/bin/antigravity",
      openCodeBinaryPath: "/bin/opencode",
      piBinaryPath: "/bin/pi",
      piAgentDir: "/tmp/pi-agent",
    });

    const cursorOptions = providerModelsPrefetchQueryOptions({
      provider: "cursor",
      settings,
    });
    expect(cursorOptions.queryKey).toEqual(
      providerDiscoveryQueryKeys.models("cursor", "/bin/agent", "https://api.example", null, null),
    );

    const claudeOptions = providerModelsPrefetchQueryOptions({
      provider: "claudeAgent",
      settings,
    });
    expect(claudeOptions.queryKey).toEqual(
      providerDiscoveryQueryKeys.models("claudeAgent", "/bin/claude", null, null, null),
    );

    const openCodeOptions = providerModelsPrefetchQueryOptions({
      provider: "opencode",
      settings,
      cwd: "/tmp/project",
    });
    expect(openCodeOptions.queryKey).toEqual(
      providerDiscoveryQueryKeys.models("opencode", "/bin/opencode", null, null, "/tmp/project"),
    );

    const piOptions = providerModelsPrefetchQueryOptions({
      provider: "pi",
      settings,
      cwd: "/tmp/project",
    });
    expect(piOptions.queryKey).toEqual(
      providerDiscoveryQueryKeys.models("pi", "/bin/pi", null, "/tmp/pi-agent", "/tmp/project"),
    );

    const antigravityOptions = providerModelsPrefetchQueryOptions({
      provider: "antigravity",
      settings,
      cwd: "/tmp/project",
    });
    expect(antigravityOptions.queryKey).toEqual(
      providerDiscoveryQueryKeys.models(
        "antigravity",
        "/bin/antigravity",
        null,
        null,
        "/tmp/project",
      ),
    );

    const codexOptions = providerModelsPrefetchQueryOptions({
      provider: "codex",
      settings,
    });
    expect(codexOptions.queryKey).toEqual(
      providerDiscoveryQueryKeys.models("codex", null, null, null, null),
    );
  });
});

describe("prefetchProviderModelsForNewThread", () => {
  it("prefetches models and agents for the resolved provider", async () => {
    const queryClient = new QueryClient();
    const prefetchQuery = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);

    prefetchProviderModelsForNewThread(queryClient, {
      provider: "kilo" satisfies ProviderKind,
      settings: makeSettings({
        kiloBinaryPath: "/bin/kilo",
      }),
      cwd: "/tmp/project",
    });

    expect(prefetchQuery).toHaveBeenCalledTimes(3);
    expect(prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(
      providerDiscoveryQueryKeys.models("kilo", "/bin/kilo", null, null, "/tmp/project"),
    );
    expect(prefetchQuery.mock.calls[1]?.[0].queryKey).toEqual(
      providerDiscoveryQueryKeys.agents("kilo", "/bin/kilo", "/tmp/project"),
    );
    expect(prefetchQuery.mock.calls[2]?.[0].queryKey).toEqual(
      providerDiscoveryQueryKeys.composerCapabilities("kilo"),
    );
  });

  it("prefetches only models for providers without agent discovery", async () => {
    const queryClient = new QueryClient();
    const prefetchQuery = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);

    prefetchProviderModelsForNewThread(queryClient, {
      provider: "cursor",
      settings: makeSettings({ cursorBinaryPath: "/bin/agent" }),
    });

    expect(prefetchQuery).toHaveBeenCalledTimes(2);
    expect(prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(
      providerDiscoveryQueryKeys.models("cursor", "/bin/agent", null, null, null),
    );
    expect(prefetchQuery.mock.calls[1]?.[0].queryKey).toEqual(
      providerDiscoveryQueryKeys.composerCapabilities("cursor"),
    );
  });

  it("does not issue any discovery call when the exact selected provider is disabled", () => {
    const queryClient = new QueryClient();
    const prefetchQuery = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);

    prefetchProviderModelsForNewThread(queryClient, {
      provider: "omnimind",
      settings: makeSettings({ defaultProvider: "omnimind" }),
      cwd: "/tmp/project",
      enabled: false,
    });

    expect(prefetchQuery).not.toHaveBeenCalled();
  });

  it("shares one in-flight React Query request for the same selected Engine intent", async () => {
    const listModels = vi.fn(async () => ({
      source: "test",
      models: [{ slug: "droid-model", name: "Droid Model" }],
    }));
    const getComposerCapabilities = vi.fn(async () => ({
      supportsImages: false,
      supportsFiles: false,
      supportsMentions: false,
    }));
    vi.spyOn(nativeApi, "ensureNativeApi").mockReturnValue({
      provider: { listModels, getComposerCapabilities },
    } as unknown as NativeApi);
    const queryClient = new QueryClient();
    const input = {
      provider: "droid" as const,
      settings: makeSettings({ droidBinaryPath: "/bin/droid" }),
      cwd: "/tmp/project",
    };

    prefetchProviderModelsForNewThread(queryClient, input);
    prefetchProviderModelsForNewThread(queryClient, input);

    await vi.waitFor(() => {
      expect(listModels).toHaveBeenCalledTimes(1);
      expect(getComposerCapabilities).toHaveBeenCalledTimes(1);
    });
    expect(listModels).toHaveBeenCalledWith({
      provider: "droid",
      binaryPath: "/bin/droid",
      cwd: "/tmp/project",
    });
  });
});
