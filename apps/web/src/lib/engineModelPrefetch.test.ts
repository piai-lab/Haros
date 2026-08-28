// FILE: engineModelPrefetch.test.ts
// Purpose: Verifies new-thread model prefetch resolves engines/cwds and hits
//          the same React Query keys ChatView uses for listModels.
// Layer: Web lib tests

import {
  DEFAULT_SERVER_SETTINGS_VIEW,
  type NativeApi,
  type EngineKind,
  type ServerSettingsView,
} from "@harnessos/contracts";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  prefetchEngineModelsForNewThread,
  engineModelsPrefetchQueryOptions,
  resolveNewThreadModelPrefetchCwd,
  resolveNewThreadModelPrefetchEngine,
  type EngineModelPrefetchSettings,
} from "./engineModelPrefetch";
import { engineDiscoveryQueryKeys } from "./engineDiscoveryReactQuery";
import * as nativeApi from "../nativeApi";

afterEach(() => {
  vi.restoreAllMocks();
});

type EngineOverrides = {
  [Engine in keyof ServerSettingsView["engines"]]?: Partial<ServerSettingsView["engines"][Engine]>;
};

function makeSettings(
  overrides: {
    defaultEngine?: EngineKind;
    engines?: EngineOverrides;
  } = {},
): EngineModelPrefetchSettings {
  return {
    defaultEngine: overrides.defaultEngine ?? "codex",
    engines: {
      ...DEFAULT_SERVER_SETTINGS_VIEW.engines,
      claude: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines.claude,
        ...overrides.engines?.claude,
      },
      cursor: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines.cursor,
        ...overrides.engines?.cursor,
      },
      antigravity: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines.antigravity,
        ...overrides.engines?.antigravity,
      },
      grok: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines.grok,
        ...overrides.engines?.grok,
      },
      droid: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines.droid,
        ...overrides.engines?.droid,
      },
      kilo: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines.kilo,
        ...overrides.engines?.kilo,
      },
      opencode: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines.opencode,
        ...overrides.engines?.opencode,
      },
      pi: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines.pi,
        ...overrides.engines?.pi,
      },
    },
  };
}

describe("resolveNewThreadModelPrefetchEngine", () => {
  it("prefers the explicit override, then draft, sticky, project, and app defaults", () => {
    expect(
      resolveNewThreadModelPrefetchEngine({
        engineOverride: "droid",
        draftActiveEngine: "cursor",
        stickyActiveEngine: "pi",
        projectDefaultEngine: "opencode",
        defaultEngine: "codex",
      }),
    ).toBe("droid");

    expect(
      resolveNewThreadModelPrefetchEngine({
        draftActiveEngine: "cursor",
        stickyActiveEngine: "pi",
        projectDefaultEngine: "opencode",
        defaultEngine: "codex",
      }),
    ).toBe("cursor");

    expect(
      resolveNewThreadModelPrefetchEngine({
        draftActiveEngine: null,
        stickyActiveEngine: "pi",
        projectDefaultEngine: "opencode",
        defaultEngine: "codex",
      }),
    ).toBe("pi");

    expect(
      resolveNewThreadModelPrefetchEngine({
        stickyActiveEngine: null,
        projectDefaultEngine: "opencode",
        defaultEngine: "codex",
      }),
    ).toBe("opencode");

    expect(
      resolveNewThreadModelPrefetchEngine({
        projectDefaultEngine: null,
        defaultEngine: "claude",
      }),
    ).toBe("claude");
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

describe("engineModelsPrefetchQueryOptions", () => {
  it("matches ChatView cache keys for cwd-scoped and binary-scoped engines", () => {
    const settings = makeSettings({
      engines: {
        claude: { binaryPath: "/bin/claude" },
        cursor: { binaryPath: "/bin/agent", apiEndpoint: "https://api.example" },
        antigravity: { binaryPath: "/bin/antigravity" },
        opencode: { binaryPath: "/bin/opencode" },
        pi: { binaryPath: "/bin/pi", agentDir: "/tmp/pi-agent" },
      },
    });

    const cursorOptions = engineModelsPrefetchQueryOptions({
      engine: "cursor",
      settings,
    });
    expect(cursorOptions?.queryKey).toEqual(
      engineDiscoveryQueryKeys.models("cursor", "/bin/agent", "https://api.example", null, null),
    );

    const oaOptions = engineModelsPrefetchQueryOptions({
      engine: "oa",
      settings,
      cwd: "/tmp/project",
    });
    expect(oaOptions?.queryKey).toEqual(
      engineDiscoveryQueryKeys.models("oa", null, null, null, null),
    );

    const claudeOptions = engineModelsPrefetchQueryOptions({
      engine: "claude",
      settings,
    });
    expect(claudeOptions?.queryKey).toEqual(
      engineDiscoveryQueryKeys.models("claude", "/bin/claude", null, null, null),
    );

    const openCodeOptions = engineModelsPrefetchQueryOptions({
      engine: "opencode",
      settings,
      cwd: "/tmp/project",
    });
    expect(openCodeOptions?.queryKey).toEqual(
      engineDiscoveryQueryKeys.models("opencode", "/bin/opencode", null, null, "/tmp/project"),
    );

    const piOptions = engineModelsPrefetchQueryOptions({
      engine: "pi",
      settings,
      cwd: "/tmp/project",
    });
    expect(piOptions?.queryKey).toEqual(
      engineDiscoveryQueryKeys.models("pi", "/bin/pi", null, "/tmp/pi-agent", "/tmp/project"),
    );

    const antigravityOptions = engineModelsPrefetchQueryOptions({
      engine: "antigravity",
      settings,
      cwd: "/tmp/project",
    });
    expect(antigravityOptions?.queryKey).toEqual(
      engineDiscoveryQueryKeys.models(
        "antigravity",
        "/bin/antigravity",
        null,
        null,
        "/tmp/project",
      ),
    );

    const codexOptions = engineModelsPrefetchQueryOptions({
      engine: "codex",
      settings,
    });
    expect(codexOptions?.queryKey).toEqual(
      engineDiscoveryQueryKeys.models("codex", null, null, null, null),
    );
  });
});

describe("prefetchEngineModelsForNewThread", () => {
  it("prefetches models and agents for the resolved engine", async () => {
    const queryClient = new QueryClient();
    const prefetchQuery = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);

    prefetchEngineModelsForNewThread(queryClient, {
      engine: "kilo" satisfies EngineKind,
      settings: makeSettings({
        engines: { kilo: { binaryPath: "/bin/kilo" } },
      }),
      cwd: "/tmp/project",
    });

    expect(prefetchQuery).toHaveBeenCalledTimes(2);
    expect(prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(
      engineDiscoveryQueryKeys.models("kilo", "/bin/kilo", null, null, "/tmp/project"),
    );
    expect(prefetchQuery.mock.calls[1]?.[0].queryKey).toEqual(
      engineDiscoveryQueryKeys.composerCapabilities("kilo"),
    );
    await vi.waitFor(() => expect(prefetchQuery).toHaveBeenCalledTimes(3));
    expect(prefetchQuery.mock.calls[2]?.[0].queryKey).toEqual(
      engineDiscoveryQueryKeys.agents("kilo", "/bin/kilo", "/tmp/project"),
    );
  });

  it("prefetches only models for engines without agent discovery", async () => {
    const queryClient = new QueryClient();
    const prefetchQuery = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);

    prefetchEngineModelsForNewThread(queryClient, {
      engine: "cursor",
      settings: makeSettings({ engines: { cursor: { binaryPath: "/bin/agent" } } }),
    });

    expect(prefetchQuery).toHaveBeenCalledTimes(2);
    expect(prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(
      engineDiscoveryQueryKeys.models("cursor", "/bin/agent", null, null, null),
    );
    expect(prefetchQuery.mock.calls[1]?.[0].queryKey).toEqual(
      engineDiscoveryQueryKeys.composerCapabilities("cursor"),
    );
  });

  it("does not issue any discovery call when the exact selected engine is disabled", () => {
    const queryClient = new QueryClient();
    const prefetchQuery = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);

    prefetchEngineModelsForNewThread(queryClient, {
      engine: "oa",
      settings: makeSettings({ defaultEngine: "oa" }),
      cwd: "/tmp/project",
      enabled: false,
    });

    expect(prefetchQuery).not.toHaveBeenCalled();
  });

  it("reuses one HarnessOS discovery when explicit new-thread intent crosses Projects", async () => {
    const listModels = vi.fn(async () => ({
      source: "pi.sdk",
      models: [{ slug: "deepseek/deepseek-chat", name: "DeepSeek Chat" }],
    }));
    const getComposerCapabilities = vi.fn(async () => ({
      supportsImages: true,
      supportsFiles: true,
      supportsMentions: true,
    }));
    vi.spyOn(nativeApi, "ensureNativeApi").mockReturnValue({
      engine: { listModels, getComposerCapabilities },
    } as unknown as NativeApi);
    const queryClient = new QueryClient();
    const settings = makeSettings({ defaultEngine: "oa" });

    prefetchEngineModelsForNewThread(queryClient, {
      engine: "oa",
      settings,
      cwd: "/tmp/project-a",
    });
    prefetchEngineModelsForNewThread(queryClient, {
      engine: "oa",
      settings,
      cwd: "/tmp/project-b",
    });

    await vi.waitFor(() => {
      expect(listModels).toHaveBeenCalledTimes(1);
      expect(getComposerCapabilities).toHaveBeenCalledTimes(1);
    });
    expect(listModels).toHaveBeenCalledWith({ engine: "oa" }, { signal: expect.any(AbortSignal) });
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
      engine: { listModels, getComposerCapabilities },
    } as unknown as NativeApi);
    const queryClient = new QueryClient();
    const input = {
      engine: "droid" as const,
      settings: makeSettings({ engines: { droid: { binaryPath: "/bin/droid" } } }),
      cwd: "/tmp/project",
    };

    prefetchEngineModelsForNewThread(queryClient, input);
    prefetchEngineModelsForNewThread(queryClient, input);

    await vi.waitFor(() => {
      expect(listModels).toHaveBeenCalledTimes(1);
      expect(getComposerCapabilities).toHaveBeenCalledTimes(1);
    });
    expect(listModels).toHaveBeenCalledWith(
      {
        engine: "droid",
        binaryPath: "/bin/droid",
        cwd: "/tmp/project",
      },
      { signal: expect.any(AbortSignal) },
    );
  });
});
