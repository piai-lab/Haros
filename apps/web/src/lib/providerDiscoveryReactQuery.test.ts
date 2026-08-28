// FILE: providerDiscoveryReactQuery.test.ts
// Purpose: Locks provider model discovery query semantics — retry policy,
//          stale-catalog preservation, and initial-vs-background pending (#103).
// Layer: Web data fetching tests

import {
  PROVIDER_MODEL_DISCOVERY_ERROR_CODES,
  type NativeApi,
  type ProviderListModelsResult,
} from "@harnessos/contracts";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isProviderDiscoverySessionActive,
  isInitialModelDiscoveryPending,
  providerCatalogDiscoveryRetryDelay,
  providerAgentsQueryOptions,
  providerCommandsQueryOptions,
  providerDiscoveryQueryKeys,
  providerExecutionCapabilitiesMatchSelection,
  providerModelsQueryOptions,
  providerSkillsQueryOptions,
  shouldRetryProviderCatalogDiscovery,
} from "./providerDiscoveryReactQuery";
import * as nativeApi from "../nativeApi";

function mockListModels(listModels: ReturnType<typeof vi.fn>) {
  vi.spyOn(nativeApi, "ensureNativeApi").mockReturnValue({
    provider: { listModels },
  } as unknown as NativeApi);
  return listModels;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("provider execution capability identity", () => {
  const capabilities = {
    provider: "codex" as const,
    model: "gpt-test",
    supportsNativeTurnSteering: true,
    runtimeModes: {
      "full-access": {
        mode: "full-access" as const,
        structurallySupported: true,
        status: "ready" as const,
      },
      auto: { mode: "auto" as const, structurallySupported: true, status: "ready" as const },
      "approval-required": {
        mode: "approval-required" as const,
        structurallySupported: true,
        status: "ready" as const,
      },
    },
    interactionModes: {
      default: { mode: "default" as const, structurallySupported: true, status: "ready" as const },
      plan: { mode: "plan" as const, structurallySupported: true, status: "ready" as const },
      debug: { mode: "debug" as const, structurallySupported: true, status: "ready" as const },
      converge: {
        mode: "converge" as const,
        structurallySupported: true,
        status: "ready" as const,
      },
      learn: { mode: "learn" as const, structurallySupported: true, status: "ready" as const },
    },
  };

  it("rejects a late projection for a different Provider or model", () => {
    expect(
      providerExecutionCapabilitiesMatchSelection(capabilities, {
        provider: "codex",
        model: "gpt-test",
      }),
    ).toBe(true);
    expect(
      providerExecutionCapabilitiesMatchSelection(capabilities, {
        provider: "codex",
        model: "gpt-newer",
      }),
    ).toBe(false);
    expect(
      providerExecutionCapabilitiesMatchSelection(capabilities, {
        provider: "claudeAgent",
        model: "gpt-test",
      }),
    ).toBe(false);
  });
});

describe("isInitialModelDiscoveryPending", () => {
  it("is pending only for the first fetch (loading or placeholder fetch)", () => {
    expect(
      isInitialModelDiscoveryPending({
        isLoading: true,
        isFetching: true,
        isPlaceholderData: true,
      }),
    ).toBe(true);
    expect(
      isInitialModelDiscoveryPending({
        isLoading: false,
        isFetching: true,
        isPlaceholderData: true,
      }),
    ).toBe(true);
    // Settled catalog + background refetch must not blank the picker (#103).
    expect(
      isInitialModelDiscoveryPending({
        isLoading: false,
        isFetching: true,
        isPlaceholderData: false,
      }),
    ).toBe(false);
    expect(
      isInitialModelDiscoveryPending({
        isLoading: false,
        isFetching: false,
        isPlaceholderData: false,
      }),
    ).toBe(false);
  });
});

describe("providerModelsQueryOptions", () => {
  it("shares passive OmniMind discovery across Projects without sending a cwd", async () => {
    const catalog = {
      models: [{ slug: "deepseek/deepseek-chat", name: "DeepSeek Chat" }],
      source: "pi.sdk",
      cached: false,
    };
    const listModels = mockListModels(vi.fn().mockResolvedValue(catalog));
    const firstProject = providerModelsQueryOptions({
      provider: "omnimind",
      cwd: "/tmp/project-a",
    });
    const secondProject = providerModelsQueryOptions({
      provider: "omnimind",
      cwd: "/tmp/project-b",
    });

    expect(firstProject.queryKey).toEqual(secondProject.queryKey);

    const queryClient = new QueryClient();
    await expect(queryClient.fetchQuery(firstProject)).resolves.toEqual(catalog);
    await expect(queryClient.fetchQuery(secondProject)).resolves.toEqual(catalog);
    expect(listModels).toHaveBeenCalledTimes(1);
    expect(listModels).toHaveBeenCalledWith(
      { provider: "omnimind" },
      { signal: expect.any(AbortSignal) },
    );
    expect(queryClient.getQueryState(secondProject.queryKey)).toMatchObject({ status: "success" });
  });

  it("keeps genuinely Project-scoped Engine catalogs separated by cwd", async () => {
    const catalog = {
      models: [{ slug: "project-model", name: "Project model" }],
      source: "opencode",
      cached: false,
    };
    const listModels = mockListModels(vi.fn().mockResolvedValue(catalog));
    const firstProject = providerModelsQueryOptions({
      provider: "opencode",
      binaryPath: "/bin/opencode",
      cwd: "/tmp/project-a",
    });
    const secondProject = providerModelsQueryOptions({
      provider: "opencode",
      binaryPath: "/bin/opencode",
      cwd: "/tmp/project-b",
    });

    expect(firstProject.queryKey).not.toEqual(secondProject.queryKey);

    const queryClient = new QueryClient();
    await queryClient.fetchQuery(firstProject);
    await queryClient.fetchQuery(secondProject);
    expect(listModels).toHaveBeenCalledTimes(2);
    expect(listModels).toHaveBeenNthCalledWith(
      1,
      {
        provider: "opencode",
        binaryPath: "/bin/opencode",
        cwd: "/tmp/project-a",
      },
      { signal: expect.any(AbortSignal) },
    );
    expect(listModels).toHaveBeenNthCalledWith(
      2,
      {
        provider: "opencode",
        binaryPath: "/bin/opencode",
        cwd: "/tmp/project-b",
      },
      { signal: expect.any(AbortSignal) },
    );
  });

  it("refreshes the shared OmniMind catalog after provider-prefix invalidation", async () => {
    const listModels = mockListModels(
      vi.fn().mockResolvedValue({ models: [], source: "pi.sdk", cached: false }),
    );
    const firstProject = providerModelsQueryOptions({
      provider: "omnimind",
      cwd: "/tmp/project-a",
    });
    const secondProject = providerModelsQueryOptions({
      provider: "omnimind",
      cwd: "/tmp/project-b",
    });
    const queryClient = new QueryClient();

    await queryClient.fetchQuery(firstProject);
    await queryClient.invalidateQueries({
      queryKey: providerDiscoveryQueryKeys.modelsForProvider("omnimind"),
    });
    await queryClient.fetchQuery(secondProject);

    expect(listModels).toHaveBeenCalledTimes(2);
    expect(listModels).toHaveBeenNthCalledWith(
      1,
      { provider: "omnimind" },
      { signal: expect.any(AbortSignal) },
    );
    expect(listModels).toHaveBeenNthCalledWith(
      2,
      { provider: "omnimind" },
      { signal: expect.any(AbortSignal) },
    );
  });

  it("fails fast for Cursor so a missing CLI settles instead of spinning (#103)", async () => {
    const listModels = mockListModels(
      vi.fn().mockRejectedValue(new Error("Cursor CLI is not installed or not on PATH")),
    );
    const options = providerModelsQueryOptions({ provider: "cursor", enabled: true });

    const queryClient = new QueryClient();
    await expect(queryClient.fetchQuery(options)).rejects.toThrow(
      "Cursor CLI is not installed or not on PATH",
    );
    expect(listModels).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryState(options.queryKey)?.status).toBe("error");
  });

  it("retries only typed model-starting, timeout, and capacity failures", () => {
    const transient = {
      code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.starting,
      retryable: true,
      retryAfterMs: 250,
    };
    const startupCapacity = {
      code: "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED",
      retryable: true,
      retryAfterMs: 250,
    };
    expect(shouldRetryProviderCatalogDiscovery(0, transient)).toBe(true);
    expect(shouldRetryProviderCatalogDiscovery(2, transient)).toBe(true);
    expect(shouldRetryProviderCatalogDiscovery(3, transient)).toBe(false);
    expect(shouldRetryProviderCatalogDiscovery(11, startupCapacity)).toBe(true);
    expect(shouldRetryProviderCatalogDiscovery(12, startupCapacity)).toBe(false);
    expect(shouldRetryProviderCatalogDiscovery(0, { code: "WS_REQUEST_TIMEOUT" })).toBe(true);
    expect(shouldRetryProviderCatalogDiscovery(0, { code: "WS_REQUEST_ABORTED" })).toBe(false);
    expect(shouldRetryProviderCatalogDiscovery(0, new Error("missing CLI"))).toBe(false);
    expect(shouldRetryProviderCatalogDiscovery(0, { retryable: false })).toBe(false);
    expect(providerCatalogDiscoveryRetryDelay(0, transient)).toBe(250);
    expect(providerCatalogDiscoveryRetryDelay(1, transient)).toBe(500);
    expect(providerCatalogDiscoveryRetryDelay(2, transient)).toBe(1_000);
    expect(providerCatalogDiscoveryRetryDelay(0, startupCapacity)).toBe(250);
  });

  it("settles after one typed cold-start failure without user refresh", async () => {
    const catalog = {
      models: [{ slug: "gpt-5.4", name: "GPT-5.4" }],
      source: "codex",
      cached: false,
    };
    const listModels = mockListModels(
      vi
        .fn()
        .mockRejectedValueOnce({
          code: PROVIDER_MODEL_DISCOVERY_ERROR_CODES.starting,
          retryable: true,
          retryAfterMs: 1,
        })
        .mockResolvedValue(catalog),
    );
    const queryClient = new QueryClient();

    await expect(
      queryClient.fetchQuery(providerModelsQueryOptions({ provider: "codex", enabled: true })),
    ).resolves.toEqual(catalog);
    expect(listModels).toHaveBeenCalledTimes(2);
  });

  it("settles a catalog after temporary startup admission pressure", async () => {
    const catalog = {
      models: [{ slug: "gpt-5.4", name: "GPT-5.4" }],
      source: "codex",
      cached: false,
    };
    const startupCapacity = {
      code: "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED",
      retryable: true,
      retryAfterMs: 1,
    };
    const listModels = mockListModels(
      vi
        .fn()
        .mockRejectedValueOnce(startupCapacity)
        .mockRejectedValueOnce(startupCapacity)
        .mockResolvedValue(catalog),
    );
    const queryClient = new QueryClient();

    await expect(
      queryClient.fetchQuery(providerModelsQueryOptions({ provider: "codex", enabled: true })),
    ).resolves.toEqual(catalog);
    expect(listModels).toHaveBeenCalledTimes(3);
  });

  it("fails fast for unclassified provider errors instead of adding a seven-second loop", async () => {
    const listModels = mockListModels(vi.fn().mockRejectedValue(new Error("model/list failed")));
    const options = providerModelsQueryOptions({ provider: "codex", enabled: true });
    const queryClient = new QueryClient();

    await expect(queryClient.fetchQuery(options)).rejects.toThrow("model/list failed");
    expect(listModels).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes disabled catalogs so an orphaned Engine request can be aborted", () => {
    expect(providerModelsQueryOptions({ provider: "codex", enabled: true }).subscribed).toBe(true);
    expect(providerModelsQueryOptions({ provider: "codex", enabled: false }).subscribed).toBe(
      false,
    );
    expect(providerAgentsQueryOptions({ provider: "codex", enabled: false }).subscribed).toBe(
      false,
    );
  });

  it("keeps a shared Engine request alive until its last consumer leaves", async () => {
    let capturedSignal: AbortSignal | undefined;
    const listModels = mockListModels(
      vi.fn(
        (
          _input: unknown,
          options?: { readonly signal?: AbortSignal },
        ): Promise<ProviderListModelsResult> =>
          new Promise((_resolve, reject) => {
            capturedSignal = options?.signal;
            capturedSignal?.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );
    const queryClient = new QueryClient();
    const options = providerModelsQueryOptions({ provider: "codex", enabled: true });
    const firstObserver = new QueryObserver(queryClient, options);
    const secondObserver = new QueryObserver(queryClient, options);
    const unsubscribeFirst = firstObserver.subscribe(() => undefined);
    const unsubscribeSecond = secondObserver.subscribe(() => undefined);

    await vi.waitFor(() => expect(listModels).toHaveBeenCalledTimes(1));
    expect(capturedSignal?.aborted).toBe(false);

    unsubscribeFirst();
    await Promise.resolve();
    expect(capturedSignal?.aborted).toBe(false);

    unsubscribeSecond();
    await vi.waitFor(() => expect(capturedSignal?.aborted).toBe(true));
    expect(capturedSignal?.aborted).toBe(true);
    expect(listModels).toHaveBeenCalledTimes(1);
    queryClient.clear();
  });

  it("surfaces real errors instead of masking them as empty catalogs", async () => {
    mockListModels(vi.fn().mockRejectedValue(new Error("discovery exploded")));
    const options = providerModelsQueryOptions({ provider: "cursor", enabled: true });

    const queryClient = new QueryClient();
    await expect(queryClient.fetchQuery(options)).rejects.toThrow("discovery exploded");
    expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
  });

  it("preserves the cached catalog when a background refetch fails", async () => {
    const catalog = {
      models: [{ slug: "auto", name: "Auto" }],
      source: "cursor.cli",
      cached: false,
    };
    const listModels = mockListModels(
      vi.fn().mockResolvedValueOnce(catalog).mockRejectedValue(new Error("cursor went away")),
    );
    const options = providerModelsQueryOptions({ provider: "cursor", enabled: true });

    const queryClient = new QueryClient();
    await expect(queryClient.fetchQuery(options)).resolves.toEqual(catalog);
    await queryClient.refetchQueries({ queryKey: options.queryKey });

    expect(listModels).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryData(options.queryKey)).toEqual(catalog);
  });

  it("returns successful catalogs unchanged", async () => {
    const catalog = {
      models: [{ slug: "gpt-5.4", name: "GPT-5.4" }],
      source: "codex",
      cached: false,
    };
    mockListModels(vi.fn().mockResolvedValue(catalog));
    const options = providerModelsQueryOptions({ provider: "codex", enabled: true });

    const queryClient = new QueryClient();
    await expect(queryClient.fetchQuery(options)).resolves.toEqual(catalog);
  });
});

describe("Session-aware resource discovery keys", () => {
  it("keeps a recoverable error on the active key and changes key only after close", () => {
    const errorActive = isProviderDiscoverySessionActive({
      provider: "omnimind",
      session: { provider: "omnimind", status: "error" },
    });
    const closedActive = isProviderDiscoverySessionActive({
      provider: "omnimind",
      session: { provider: "omnimind", status: "closed" },
    });

    expect(errorActive).toBe(true);
    expect(closedActive).toBe(false);
    expect(
      providerSkillsQueryOptions({
        provider: "omnimind",
        cwd: "/tmp/project",
        threadId: "thread-a",
        activeSession: errorActive,
      }).queryKey,
    ).not.toEqual(
      providerSkillsQueryOptions({
        provider: "omnimind",
        cwd: "/tmp/project",
        threadId: "thread-a",
        activeSession: closedActive,
      }).queryKey,
    );
  });

  it("separates threads and the pre-session versus active-session resource loaders", () => {
    const skillsBeforeSession = providerSkillsQueryOptions({
      provider: "omnimind",
      cwd: "/tmp/project",
      threadId: "thread-a",
      activeSession: false,
    }).queryKey;
    const skillsAfterSession = providerSkillsQueryOptions({
      provider: "omnimind",
      cwd: "/tmp/project",
      threadId: "thread-a",
      activeSession: true,
    }).queryKey;
    const skillsForOtherThread = providerSkillsQueryOptions({
      provider: "omnimind",
      cwd: "/tmp/project",
      threadId: "thread-b",
      activeSession: true,
    }).queryKey;
    const commandsBeforeSession = providerCommandsQueryOptions({
      provider: "omnimind",
      cwd: "/tmp/project",
      threadId: "thread-a",
      activeSession: false,
    }).queryKey;
    const commandsAfterSession = providerCommandsQueryOptions({
      provider: "omnimind",
      cwd: "/tmp/project",
      threadId: "thread-a",
      activeSession: true,
    }).queryKey;

    expect(skillsAfterSession).not.toEqual(skillsBeforeSession);
    expect(skillsAfterSession).not.toEqual(skillsForOtherThread);
    expect(commandsAfterSession).not.toEqual(commandsBeforeSession);
  });

  it("does not expose an active Agent Skill while a Chat key is loading", async () => {
    let resolveChatSkills: ((value: unknown) => void) | undefined;
    const listSkills = vi
      .fn()
      .mockResolvedValueOnce({
        skills: [{ name: "project-only-skill", description: "Private Project Skill" }],
        source: "active-agent",
        cached: false,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveChatSkills = resolve;
          }),
      );
    vi.spyOn(nativeApi, "ensureNativeApi").mockReturnValue({
      provider: { listSkills },
    } as unknown as NativeApi);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const observer = new QueryObserver(
      queryClient,
      providerSkillsQueryOptions({
        provider: "omnimind",
        cwd: "/tmp/project",
        threadId: "thread-agent",
        activeSession: true,
      }),
    );
    const unsubscribe = observer.subscribe(() => undefined);

    await vi.waitFor(() => {
      expect(observer.getCurrentResult().data?.skills[0]?.name).toBe("project-only-skill");
    });
    observer.setOptions(
      providerSkillsQueryOptions({
        provider: "omnimind",
        cwd: "/tmp/managed-chat",
        threadId: "thread-chat",
        activeSession: false,
      }),
    );

    expect(observer.getCurrentResult().isPlaceholderData).toBe(true);
    expect(observer.getCurrentResult().data).toEqual({
      skills: [],
      source: "empty",
      cached: false,
    });
    resolveChatSkills?.({ skills: [], source: "chat", cached: false });
    unsubscribe();
  });

  it("does not expose an active Agent Prompt command after its Session closes", async () => {
    let resolveGlobalCommands: ((value: unknown) => void) | undefined;
    const listCommands = vi
      .fn()
      .mockResolvedValueOnce({
        commands: [{ name: "project-review", description: "Private Project Prompt" }],
        source: "active-agent",
        cached: false,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveGlobalCommands = resolve;
          }),
      );
    vi.spyOn(nativeApi, "ensureNativeApi").mockReturnValue({
      provider: { listCommands },
    } as unknown as NativeApi);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const observer = new QueryObserver(
      queryClient,
      providerCommandsQueryOptions({
        provider: "omnimind",
        cwd: "/tmp/project",
        threadId: "thread-agent",
        activeSession: true,
      }),
    );
    const unsubscribe = observer.subscribe(() => undefined);

    await vi.waitFor(() => {
      expect(observer.getCurrentResult().data?.commands[0]?.name).toBe("project-review");
    });
    observer.setOptions(
      providerCommandsQueryOptions({
        provider: "omnimind",
        cwd: "/tmp/project",
        threadId: "thread-agent",
        activeSession: false,
      }),
    );

    expect(observer.getCurrentResult().isPlaceholderData).toBe(true);
    expect(observer.getCurrentResult().data).toEqual({
      commands: [],
      source: "empty",
      cached: false,
    });
    resolveGlobalCommands?.({ commands: [], source: "global", cached: false });
    unsubscribe();
  });
});
