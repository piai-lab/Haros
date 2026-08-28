// FILE: useProviderModelCatalog.test.tsx
// Purpose: Locks the shared provider-model catalog's memoization and discovery policy.
// Layer: Web hook tests

import {
  DEFAULT_SERVER_SETTINGS_VIEW,
  type ProviderKind,
  type ProviderModelDescriptor,
} from "@harnessos/contracts";
import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProviderModelCatalog } from "./useProviderModelCatalog";
import { useProviderModelCatalog } from "./useProviderModelCatalog";

const mocks = vi.hoisted(() => ({
  useLocalPreferences: vi.fn(),
  useServerSettings: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: mocks.useQuery };
});

vi.mock("../localPreferences", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../localPreferences")>();
  return { ...actual, useLocalPreferences: mocks.useLocalPreferences };
});

vi.mock("../serverSettings", () => ({ useServerSettings: mocks.useServerSettings }));

interface QueryOptionsLike {
  readonly queryKey: readonly unknown[];
  readonly enabled?: boolean;
}

interface QueryResultLike {
  readonly data?: {
    readonly agents?: ReadonlyArray<{ name: string; displayName: string }>;
    readonly cached?: boolean;
    readonly models?: ReadonlyArray<ProviderModelDescriptor>;
    readonly source?: string;
  };
  readonly isFetching: boolean;
  readonly isError?: boolean;
  readonly isLoading: boolean;
  readonly isPending?: boolean;
  readonly isPlaceholderData: boolean;
}

const EMPTY_QUERY: QueryResultLike = {
  isFetching: false,
  isLoading: false,
  isPlaceholderData: false,
};
const modelQueries = new Map<ProviderKind, QueryResultLike>();
const agentQueries = new Map<ProviderKind, QueryResultLike>();
const MODEL_HINTS = { cursor: "composer-2" } as const;
const LOCAL_PREFERENCES = {
  hiddenProviders: [] as ProviderKind[],
};
const SERVER_SETTINGS = {
  ...DEFAULT_SERVER_SETTINGS_VIEW,
  providers: {
    ...DEFAULT_SERVER_SETTINGS_VIEW.providers,
    cursor: {
      ...DEFAULT_SERVER_SETTINGS_VIEW.providers.cursor,
      customModels: ["cursor-custom"],
    },
  },
};

function readCatalogRenders(
  input: Parameters<typeof useProviderModelCatalog>[0],
): ProviderModelCatalog[] {
  const results: ProviderModelCatalog[] = [];

  function Probe() {
    const [renderIndex, setRenderIndex] = useState(0);
    results.push(useProviderModelCatalog(input));
    if (renderIndex === 0) {
      setRenderIndex(1);
    }
    return null;
  }

  renderToStaticMarkup(<Probe />);
  expect(results).toHaveLength(2);
  return results;
}

function readAgentQueryEnabled(provider: ProviderKind): boolean | undefined {
  const call = mocks.useQuery.mock.calls.find(([value]) => {
    const queryKey = (value as QueryOptionsLike).queryKey;
    return queryKey[1] === "agents" && queryKey[2] === provider;
  });
  return call ? (call[0] as QueryOptionsLike).enabled : undefined;
}

function readModelQueryEnabled(provider: ProviderKind): boolean | undefined {
  const call = mocks.useQuery.mock.calls.find(([value]) => {
    const queryKey = (value as QueryOptionsLike).queryKey;
    return queryKey[1] === "models" && queryKey[2] === provider;
  });
  return call ? (call[0] as QueryOptionsLike).enabled : undefined;
}

beforeEach(() => {
  modelQueries.clear();
  agentQueries.clear();
  mocks.useLocalPreferences.mockReset().mockReturnValue({ preferences: LOCAL_PREFERENCES });
  mocks.useServerSettings.mockReset().mockReturnValue({ settings: SERVER_SETTINGS });
  mocks.useQuery.mockReset().mockImplementation((value: QueryOptionsLike) => {
    const [, resource, provider] = value.queryKey;
    if (resource === "models") {
      return modelQueries.get(provider as ProviderKind) ?? EMPTY_QUERY;
    }
    if (resource === "agents") {
      return agentQueries.get(provider as ProviderKind) ?? EMPTY_QUERY;
    }
    throw new Error(`Unexpected provider catalog query: ${String(resource)}`);
  });
});

describe("useProviderModelCatalog", () => {
  it("keeps aggregate identities stable when inputs and query data are unchanged", () => {
    const [first, second] = readCatalogRenders({
      selectedProvider: "cursor",
      discoveryEnabled: true,
      modelHintByProvider: MODEL_HINTS,
    });

    expect(second).toBe(first);
    expect(second?.customModelsByProvider).toBe(first?.customModelsByProvider);
    expect(second?.modelOptionsByProvider).toBe(first?.modelOptionsByProvider);
    expect(second?.selectableModelOptionsByProvider).toBe(first?.selectableModelOptionsByProvider);
    expect(second?.catalogStateByProvider).toBe(first?.catalogStateByProvider);
    expect(second?.loadingModelProviders).toBe(first?.loadingModelProviders);
    expect(second?.runtimeModelsByProvider).toBe(first?.runtimeModelsByProvider);
    expect(second?.selectedRuntimeAgents).toBe(first?.selectedRuntimeAgents);
  });

  it("discovers agents only for the selected Engine", () => {
    readCatalogRenders({ selectedProvider: "cursor", discoveryEnabled: false });
    expect(readAgentQueryEnabled("claudeAgent")).toBe(false);
    expect(readAgentQueryEnabled("codex")).toBe(false);
  });

  it("settles the selected model catalog before starting secondary agent discovery", () => {
    modelQueries.set("codex", {
      isFetching: true,
      isLoading: true,
      isPending: true,
      isPlaceholderData: true,
    });
    readCatalogRenders({ selectedProvider: "codex", discoveryEnabled: false });
    expect(readAgentQueryEnabled("codex")).toBe(false);

    modelQueries.set("codex", {
      data: { models: [], source: "codex", cached: false },
      isFetching: false,
      isLoading: false,
      isPending: false,
      isPlaceholderData: false,
    });
    mocks.useQuery.mockClear();
    readCatalogRenders({ selectedProvider: "codex", discoveryEnabled: false });
    expect(readAgentQueryEnabled("codex")).toBe(true);
  });

  it("does not prefetch providers hidden from picker surfaces", () => {
    mocks.useLocalPreferences.mockReturnValue({
      preferences: { ...LOCAL_PREFERENCES, hiddenProviders: ["cursor"] },
    });

    readCatalogRenders({ selectedProvider: "codex", discoveryEnabled: true });

    expect(readModelQueryEnabled("codex")).toBe(true);
    expect(readModelQueryEnabled("cursor")).toBe(false);
    expect(readModelQueryEnabled("antigravity")).toBe(true);
  });

  it("discovers stock Pi only after explicit browse intent or selection", () => {
    readCatalogRenders({ selectedProvider: "codex", discoveryEnabled: true });
    expect(readModelQueryEnabled("pi")).toBe(false);

    mocks.useQuery.mockClear();
    readCatalogRenders({
      selectedProvider: "codex",
      discoveryEnabled: true,
      piDiscoveryRequested: true,
    });
    expect(readModelQueryEnabled("pi")).toBe(true);

    mocks.useQuery.mockClear();
    readCatalogRenders({ selectedProvider: "pi", discoveryEnabled: false });
    expect(readModelQueryEnabled("pi")).toBe(true);
  });

  it("does not discover disabled stock Pi after explicit browse intent", () => {
    mocks.useServerSettings.mockReturnValue({
      settings: {
        ...SERVER_SETTINGS,
        providers: {
          ...SERVER_SETTINGS.providers,
          pi: {
            ...SERVER_SETTINGS.providers.pi,
            enabled: false,
          },
        },
      },
    });

    readCatalogRenders({
      selectedProvider: "codex",
      discoveryEnabled: true,
      piDiscoveryRequested: true,
    });

    expect(readModelQueryEnabled("pi")).toBe(false);
  });

  it("keeps an enabled selected provider discoverable when it is hidden", () => {
    mocks.useLocalPreferences.mockReturnValue({
      preferences: { ...LOCAL_PREFERENCES, hiddenProviders: ["cursor"] },
    });

    readCatalogRenders({ selectedProvider: "cursor", discoveryEnabled: false });

    expect(readModelQueryEnabled("cursor")).toBe(true);
  });

  it("lets a permanently mounted inactive surface stop its selected-provider query", () => {
    readCatalogRenders({
      selectedProvider: "codex",
      discoveryEnabled: false,
      selectedProviderDiscoveryEnabled: false,
    });

    expect(readModelQueryEnabled("codex")).toBe(false);
    expect(readAgentQueryEnabled("codex")).toBe(false);
  });

  it("does not discover a disabled provider even when it is selected", () => {
    mocks.useServerSettings.mockReturnValue({
      settings: {
        ...SERVER_SETTINGS,
        providers: {
          ...SERVER_SETTINGS.providers,
          cursor: {
            ...SERVER_SETTINGS.providers.cursor,
            enabled: false,
          },
        },
      },
    });

    readCatalogRenders({ selectedProvider: "cursor", discoveryEnabled: true });

    expect(readModelQueryEnabled("cursor")).toBe(false);
  });

  it("keeps discovering while the server settings are unavailable", () => {
    // `serverSettings` is undefined until the settings query resolves, and stays
    // undefined for good if it fails — the query never refetches on its own. Failing
    // closed here would blank every provider's model list, selected one included.
    mocks.useServerSettings.mockReturnValue({ settings: undefined });

    readCatalogRenders({ selectedProvider: "claudeAgent", discoveryEnabled: true });

    expect(readModelQueryEnabled("claudeAgent")).toBe(true);
    expect(readModelQueryEnabled("codex")).toBe(true);
  });

  it("keeps discovering the selected provider when the settings omit it", () => {
    // A client talking to a server whose provider set it does not fully know must not
    // lose model discovery over the unknown key — and must not throw reading it.
    const { cursor: _cursor, ...providersWithoutCursor } = SERVER_SETTINGS.providers;
    mocks.useServerSettings.mockReturnValue({
      settings: { ...SERVER_SETTINGS, providers: providersWithoutCursor },
    });

    readCatalogRenders({ selectedProvider: "cursor", discoveryEnabled: false });

    expect(readModelQueryEnabled("cursor")).toBe(true);
  });

  it("restricts non-picker prefetch to the requested providers", () => {
    readCatalogRenders({
      selectedProvider: "codex",
      discoveryEnabled: true,
      prefetchProviders: ["codex", "kilo", "opencode"],
    });

    expect(readModelQueryEnabled("codex")).toBe(true);
    expect(readModelQueryEnabled("kilo")).toBe(true);
    expect(readModelQueryEnabled("opencode")).toBe(true);
    expect(readModelQueryEnabled("cursor")).toBe(false);
    expect(readModelQueryEnabled("antigravity")).toBe(false);
  });

  it("keeps an intent-scoped picker on the selected Engine until another submenu is opened", () => {
    readCatalogRenders({
      selectedProvider: "codex",
      discoveryEnabled: true,
      prefetchProviders: [],
    });

    expect(readModelQueryEnabled("codex")).toBe(true);
    expect(readModelQueryEnabled("claudeAgent")).toBe(false);
    expect(readModelQueryEnabled("cursor")).toBe(false);
    expect(readModelQueryEnabled("opencode")).toBe(false);

    mocks.useQuery.mockClear();
    readCatalogRenders({
      selectedProvider: "codex",
      discoveryEnabled: true,
      prefetchProviders: ["opencode"],
    });

    expect(readModelQueryEnabled("codex")).toBe(true);
    expect(readModelQueryEnabled("opencode")).toBe(true);
    expect(readModelQueryEnabled("claudeAgent")).toBe(false);
    expect(readModelQueryEnabled("cursor")).toBe(false);
  });

  it("keeps placeholder models visible but non-selectable until the new catalog settles", () => {
    modelQueries.set("cursor", {
      data: {
        models: [{ slug: "composer-2", name: "Composer 2" }],
        source: "cursor.cli",
        cached: false,
      },
      isFetching: true,
      isLoading: false,
      isPlaceholderData: true,
    });

    const catalog = readCatalogRenders({
      selectedProvider: "cursor",
      discoveryEnabled: true,
      modelHintByProvider: MODEL_HINTS,
    }).at(-1);

    const displaySlugs = catalog?.modelOptionsByProvider.cursor.map((model) => model.slug);
    expect(displaySlugs).toContain("composer-2");
    expect(displaySlugs).toContain("cursor-custom");
    expect(catalog?.loadingModelProviders.cursor).toBe(true);
    expect(catalog?.selectedProviderModelsLoading).toBe(true);
    expect(catalog?.runtimeModelsByProvider.cursor).toEqual([]);
    expect(catalog?.selectableModelOptionsByProvider.cursor).toEqual([]);
    expect(catalog?.selectedRuntimeModel).toBeUndefined();
    expect(catalog?.catalogStateByProvider.cursor).toBe("checking");
  });

  it("keeps a configured custom model but rejects a mere selection hint after an empty catalog", () => {
    modelQueries.set("cursor", {
      data: { models: [], source: "cursor.cli", cached: false },
      isFetching: false,
      isLoading: false,
      isPending: false,
      isPlaceholderData: false,
    });

    const catalog = readCatalogRenders({
      selectedProvider: "cursor",
      discoveryEnabled: true,
      modelHintByProvider: MODEL_HINTS,
    }).at(-1);

    const displaySlugs = catalog?.modelOptionsByProvider.cursor.map((model) => model.slug);
    expect(displaySlugs).toContain("composer-2");
    expect(displaySlugs).toContain("cursor-custom");
    expect(catalog?.selectableModelOptionsByProvider.cursor.map((model) => model.slug)).toEqual([
      "cursor-custom",
    ]);
    expect(catalog?.catalogStateByProvider.cursor).toBe("empty");
  });

  it("keeps a configured independent Engine custom model selectable when runtime omits it", () => {
    mocks.useServerSettings.mockReturnValue({
      settings: {
        ...SERVER_SETTINGS,
        providers: {
          ...SERVER_SETTINGS.providers,
          antigravity: {
            ...SERVER_SETTINGS.providers.antigravity,
            customModels: ["custom/private-model"],
          },
        },
      },
    });
    modelQueries.set("antigravity", {
      data: {
        models: [{ slug: "Gemini 4 Pro", name: "Gemini 4 Pro" }],
        source: "antigravity.cli",
        cached: false,
      },
      isFetching: false,
      isLoading: false,
      isPending: false,
      isPlaceholderData: false,
    });

    const catalog = readCatalogRenders({
      selectedProvider: "antigravity",
      discoveryEnabled: true,
    }).at(-1);

    expect(
      catalog?.selectableModelOptionsByProvider.antigravity.map((model) => model.slug),
    ).toEqual(["Gemini 4 Pro", "custom/private-model"]);
  });

  it("does not surface an unavailable exact OmniMind binding as a static model option", () => {
    modelQueries.set("omnimind", {
      data: {
        models: [{ slug: "deepseek/deepseek-chat", name: "DeepSeek Chat" }],
        source: "pi.sdk",
        cached: false,
      },
      isFetching: false,
      isLoading: false,
      isPending: false,
      isPlaceholderData: false,
    });

    const catalog = readCatalogRenders({
      selectedProvider: "omnimind",
      discoveryEnabled: true,
      modelHintByProvider: { omnimind: "legacy/provider-model" },
    }).at(-1);

    expect(catalog?.modelOptionsByProvider.omnimind.map((model) => model.slug)).not.toContain(
      "legacy/provider-model",
    );
    expect(catalog?.selectableModelOptionsByProvider.omnimind.map((model) => model.slug)).toEqual([
      "deepseek/deepseek-chat",
    ]);
  });

  it("distinguishes a cold catalog check from a failed refresh with last-good models", () => {
    modelQueries.set("cursor", {
      isFetching: true,
      isLoading: true,
      isPending: true,
      isPlaceholderData: false,
    });

    let catalog = readCatalogRenders({
      selectedProvider: "cursor",
      discoveryEnabled: true,
    }).at(-1);
    expect(catalog?.catalogStateByProvider.cursor).toBe("checking");

    modelQueries.set("cursor", {
      data: {
        models: [{ slug: "composer-2", name: "Composer 2" }],
        source: "cursor.cli",
        cached: true,
      },
      isError: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isPlaceholderData: false,
    });

    catalog = readCatalogRenders({ selectedProvider: "cursor", discoveryEnabled: true }).at(-1);
    expect(catalog?.catalogStateByProvider.cursor).toBe("stale");
    expect(catalog?.selectableModelOptionsByProvider.cursor.map((model) => model.slug)).toEqual([
      "composer-2",
      "cursor-custom",
    ]);
  });

  it("does not call a failed refresh stale when the last settled catalog was empty", () => {
    modelQueries.set("cursor", {
      data: { models: [], source: "cursor.cli", cached: true },
      isError: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isPlaceholderData: false,
    });

    const catalog = readCatalogRenders({
      selectedProvider: "cursor",
      discoveryEnabled: true,
    }).at(-1);

    expect(catalog?.catalogStateByProvider.cursor).toBe("error");
    expect(catalog?.runtimeModelsByProvider.cursor).toEqual([]);
    expect(catalog?.selectableModelOptionsByProvider.cursor.map((model) => model.slug)).toEqual([
      "cursor-custom",
    ]);
  });

  it("does not expose placeholder agents from a previous cwd as current choices", () => {
    agentQueries.set("opencode", {
      data: {
        agents: [{ name: "old-agent", displayName: "Old Agent" }],
        source: "opencode",
      },
      isFetching: true,
      isLoading: false,
      isPending: false,
      isPlaceholderData: true,
    });

    const catalog = readCatalogRenders({
      selectedProvider: "opencode",
      discoveryEnabled: true,
      cwd: "/next-project",
    }).at(-1);

    expect(catalog?.selectedRuntimeAgents).toEqual([]);
  });
});
