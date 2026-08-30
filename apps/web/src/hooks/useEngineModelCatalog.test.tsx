// FILE: useEngineModelCatalog.test.tsx
// Purpose: Locks the shared engine-model catalog's memoization and discovery policy.
// Layer: Web hook tests

import {
  DEFAULT_SERVER_SETTINGS_VIEW,
  type EngineKind,
  type EngineModelDescriptor,
} from "@harnessos/contracts";
import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EngineModelCatalog } from "./useEngineModelCatalog";
import { useEngineModelCatalog } from "./useEngineModelCatalog";

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
    readonly models?: ReadonlyArray<EngineModelDescriptor>;
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
const modelQueries = new Map<EngineKind, QueryResultLike>();
const agentQueries = new Map<EngineKind, QueryResultLike>();
const MODEL_HINTS = { cursor: "composer-2" } as const;
const LOCAL_PREFERENCES = {
  hiddenEngines: [] as EngineKind[],
};
const SERVER_SETTINGS = {
  ...DEFAULT_SERVER_SETTINGS_VIEW,
  engines: {
    ...DEFAULT_SERVER_SETTINGS_VIEW.engines,
    cursor: {
      ...DEFAULT_SERVER_SETTINGS_VIEW.engines.cursor,
      customModels: ["cursor-custom"],
    },
  },
};

function readCatalogRenders(
  input: Parameters<typeof useEngineModelCatalog>[0],
): EngineModelCatalog[] {
  const results: EngineModelCatalog[] = [];

  function Probe() {
    const [renderIndex, setRenderIndex] = useState(0);
    results.push(useEngineModelCatalog(input));
    if (renderIndex === 0) {
      setRenderIndex(1);
    }
    return null;
  }

  renderToStaticMarkup(<Probe />);
  expect(results).toHaveLength(2);
  return results;
}

function readAgentQueryEnabled(engine: EngineKind): boolean | undefined {
  const call = mocks.useQuery.mock.calls.find(([value]) => {
    const queryKey = (value as QueryOptionsLike).queryKey;
    return queryKey[1] === "agents" && queryKey[2] === engine;
  });
  return call ? (call[0] as QueryOptionsLike).enabled : undefined;
}

function readModelQueryEnabled(engine: EngineKind): boolean | undefined {
  const call = mocks.useQuery.mock.calls.find(([value]) => {
    const queryKey = (value as QueryOptionsLike).queryKey;
    return queryKey[1] === "models" && queryKey[2] === engine;
  });
  return call ? (call[0] as QueryOptionsLike).enabled : undefined;
}

beforeEach(() => {
  modelQueries.clear();
  agentQueries.clear();
  mocks.useLocalPreferences.mockReset().mockReturnValue({ preferences: LOCAL_PREFERENCES });
  mocks.useServerSettings.mockReset().mockReturnValue({ settings: SERVER_SETTINGS });
  mocks.useQuery.mockReset().mockImplementation((value: QueryOptionsLike) => {
    const [, resource, engine] = value.queryKey;
    if (resource === "models") {
      return modelQueries.get(engine as EngineKind) ?? EMPTY_QUERY;
    }
    if (resource === "agents") {
      return agentQueries.get(engine as EngineKind) ?? EMPTY_QUERY;
    }
    throw new Error(`Unexpected engine catalog query: ${String(resource)}`);
  });
});

describe("useEngineModelCatalog", () => {
  it("keeps aggregate identities stable when inputs and query data are unchanged", () => {
    const [first, second] = readCatalogRenders({
      selectedEngine: "cursor",
      discoveryEnabled: true,
      modelHintByEngine: MODEL_HINTS,
    });

    expect(second).toBe(first);
    expect(second?.customModelsByEngine).toBe(first?.customModelsByEngine);
    expect(second?.modelOptionsByEngine).toBe(first?.modelOptionsByEngine);
    expect(second?.selectableModelOptionsByEngine).toBe(first?.selectableModelOptionsByEngine);
    expect(second?.catalogStateByEngine).toBe(first?.catalogStateByEngine);
    expect(second?.loadingEngineModels).toBe(first?.loadingEngineModels);
    expect(second?.runtimeModelsByEngine).toBe(first?.runtimeModelsByEngine);
    expect(second?.selectedRuntimeAgents).toBe(first?.selectedRuntimeAgents);
  });

  it("discovers agents only for the selected Engine", () => {
    readCatalogRenders({ selectedEngine: "cursor", discoveryEnabled: false });
    expect(readAgentQueryEnabled("claude")).toBe(false);
    expect(readAgentQueryEnabled("codex")).toBe(false);
  });

  it("settles the selected model catalog before starting secondary agent discovery", () => {
    modelQueries.set("codex", {
      isFetching: true,
      isLoading: true,
      isPending: true,
      isPlaceholderData: true,
    });
    readCatalogRenders({ selectedEngine: "codex", discoveryEnabled: false });
    expect(readAgentQueryEnabled("codex")).toBe(false);

    modelQueries.set("codex", {
      data: { models: [], source: "codex", cached: false },
      isFetching: false,
      isLoading: false,
      isPending: false,
      isPlaceholderData: false,
    });
    mocks.useQuery.mockClear();
    readCatalogRenders({ selectedEngine: "codex", discoveryEnabled: false });
    expect(readAgentQueryEnabled("codex")).toBe(true);
  });

  it("does not prefetch engines hidden from picker surfaces", () => {
    mocks.useLocalPreferences.mockReturnValue({
      preferences: { ...LOCAL_PREFERENCES, hiddenEngines: ["cursor"] },
    });

    readCatalogRenders({ selectedEngine: "codex", discoveryEnabled: true });

    expect(readModelQueryEnabled("codex")).toBe(true);
    expect(readModelQueryEnabled("cursor")).toBe(false);
    expect(readModelQueryEnabled("antigravity")).toBe(true);
  });

  it("discovers stock Pi only after explicit browse intent or selection", () => {
    readCatalogRenders({ selectedEngine: "codex", discoveryEnabled: true });
    expect(readModelQueryEnabled("pi")).toBe(false);

    mocks.useQuery.mockClear();
    readCatalogRenders({
      selectedEngine: "codex",
      discoveryEnabled: true,
      piDiscoveryRequested: true,
    });
    expect(readModelQueryEnabled("pi")).toBe(true);

    mocks.useQuery.mockClear();
    readCatalogRenders({ selectedEngine: "pi", discoveryEnabled: false });
    expect(readModelQueryEnabled("pi")).toBe(true);
  });

  it("does not discover disabled stock Pi after explicit browse intent", () => {
    mocks.useServerSettings.mockReturnValue({
      settings: {
        ...SERVER_SETTINGS,
        engines: {
          ...SERVER_SETTINGS.engines,
          pi: {
            ...SERVER_SETTINGS.engines.pi,
            enabled: false,
          },
        },
      },
    });

    readCatalogRenders({
      selectedEngine: "codex",
      discoveryEnabled: true,
      piDiscoveryRequested: true,
    });

    expect(readModelQueryEnabled("pi")).toBe(false);
  });

  it("keeps an enabled selected engine discoverable when it is hidden", () => {
    mocks.useLocalPreferences.mockReturnValue({
      preferences: { ...LOCAL_PREFERENCES, hiddenEngines: ["cursor"] },
    });

    readCatalogRenders({ selectedEngine: "cursor", discoveryEnabled: false });

    expect(readModelQueryEnabled("cursor")).toBe(true);
  });

  it("lets a permanently mounted inactive surface stop its selected-engine query", () => {
    readCatalogRenders({
      selectedEngine: "codex",
      discoveryEnabled: false,
      selectedEngineDiscoveryEnabled: false,
    });

    expect(readModelQueryEnabled("codex")).toBe(false);
    expect(readAgentQueryEnabled("codex")).toBe(false);
  });

  it("does not discover a disabled engine even when it is selected", () => {
    mocks.useServerSettings.mockReturnValue({
      settings: {
        ...SERVER_SETTINGS,
        engines: {
          ...SERVER_SETTINGS.engines,
          cursor: {
            ...SERVER_SETTINGS.engines.cursor,
            enabled: false,
          },
        },
      },
    });

    readCatalogRenders({ selectedEngine: "cursor", discoveryEnabled: true });

    expect(readModelQueryEnabled("cursor")).toBe(false);
  });

  it("keeps discovering while the server settings are unavailable", () => {
    // `serverSettings` is undefined until the settings query resolves, and stays
    // undefined for good if it fails — the query never refetches on its own. Failing
    // closed here would blank every engine's model list, selected one included.
    mocks.useServerSettings.mockReturnValue({ settings: undefined });

    readCatalogRenders({ selectedEngine: "claude", discoveryEnabled: true });

    expect(readModelQueryEnabled("claude")).toBe(true);
    expect(readModelQueryEnabled("codex")).toBe(true);
  });

  it("keeps discovering the selected engine when the settings omit it", () => {
    // A client talking to a server whose engine set it does not fully know must not
    // lose model discovery over the unknown key — and must not throw reading it.
    const { cursor: _cursor, ...providersWithoutCursor } = SERVER_SETTINGS.engines;
    mocks.useServerSettings.mockReturnValue({
      settings: { ...SERVER_SETTINGS, engines: providersWithoutCursor },
    });

    readCatalogRenders({ selectedEngine: "cursor", discoveryEnabled: false });

    expect(readModelQueryEnabled("cursor")).toBe(true);
  });

  it("restricts non-picker prefetch to the requested engines", () => {
    readCatalogRenders({
      selectedEngine: "codex",
      discoveryEnabled: true,
      prefetchEngines: ["codex", "kilo", "opencode"],
    });

    expect(readModelQueryEnabled("codex")).toBe(true);
    expect(readModelQueryEnabled("kilo")).toBe(true);
    expect(readModelQueryEnabled("opencode")).toBe(true);
    expect(readModelQueryEnabled("cursor")).toBe(false);
    expect(readModelQueryEnabled("antigravity")).toBe(false);
  });

  it("keeps an intent-scoped picker on the selected Engine until another submenu is opened", () => {
    readCatalogRenders({
      selectedEngine: "codex",
      discoveryEnabled: true,
      prefetchEngines: [],
    });

    expect(readModelQueryEnabled("codex")).toBe(true);
    expect(readModelQueryEnabled("claude")).toBe(false);
    expect(readModelQueryEnabled("cursor")).toBe(false);
    expect(readModelQueryEnabled("opencode")).toBe(false);

    mocks.useQuery.mockClear();
    readCatalogRenders({
      selectedEngine: "codex",
      discoveryEnabled: true,
      prefetchEngines: ["opencode"],
    });

    expect(readModelQueryEnabled("codex")).toBe(true);
    expect(readModelQueryEnabled("opencode")).toBe(true);
    expect(readModelQueryEnabled("claude")).toBe(false);
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
      selectedEngine: "cursor",
      discoveryEnabled: true,
      modelHintByEngine: MODEL_HINTS,
    }).at(-1);

    const displaySlugs = catalog?.modelOptionsByEngine.cursor.map((model) => model.slug);
    expect(displaySlugs).toContain("composer-2");
    expect(displaySlugs).toContain("cursor-custom");
    expect(catalog?.loadingEngineModels.cursor).toBe(true);
    expect(catalog?.selectedEngineModelsLoading).toBe(true);
    expect(catalog?.runtimeModelsByEngine.cursor).toEqual([]);
    expect(catalog?.selectableModelOptionsByEngine.cursor).toEqual([]);
    expect(catalog?.selectedRuntimeModel).toBeUndefined();
    expect(catalog?.catalogStateByEngine.cursor).toBe("checking");
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
      selectedEngine: "cursor",
      discoveryEnabled: true,
      modelHintByEngine: MODEL_HINTS,
    }).at(-1);

    const displaySlugs = catalog?.modelOptionsByEngine.cursor.map((model) => model.slug);
    expect(displaySlugs).toContain("composer-2");
    expect(displaySlugs).toContain("cursor-custom");
    expect(catalog?.selectableModelOptionsByEngine.cursor.map((model) => model.slug)).toEqual([
      "cursor-custom",
    ]);
    expect(catalog?.catalogStateByEngine.cursor).toBe("empty");
  });

  it("keeps a configured independent Engine custom model selectable when runtime omits it", () => {
    mocks.useServerSettings.mockReturnValue({
      settings: {
        ...SERVER_SETTINGS,
        engines: {
          ...SERVER_SETTINGS.engines,
          antigravity: {
            ...SERVER_SETTINGS.engines.antigravity,
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
      selectedEngine: "antigravity",
      discoveryEnabled: true,
    }).at(-1);

    expect(catalog?.selectableModelOptionsByEngine.antigravity.map((model) => model.slug)).toEqual([
      "Gemini 4 Pro",
      "custom/private-model",
    ]);
  });

  it("does not surface an unavailable exact Haros binding as a static model option", () => {
    modelQueries.set("oa", {
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
      selectedEngine: "oa",
      discoveryEnabled: true,
      modelHintByEngine: { oa: "legacy/engine-model" },
    }).at(-1);

    expect(catalog?.modelOptionsByEngine.oa.map((model) => model.slug)).not.toContain(
      "legacy/engine-model",
    );
    expect(catalog?.selectableModelOptionsByEngine.oa.map((model) => model.slug)).toEqual([
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
      selectedEngine: "cursor",
      discoveryEnabled: true,
    }).at(-1);
    expect(catalog?.catalogStateByEngine.cursor).toBe("checking");

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

    catalog = readCatalogRenders({ selectedEngine: "cursor", discoveryEnabled: true }).at(-1);
    expect(catalog?.catalogStateByEngine.cursor).toBe("stale");
    expect(catalog?.selectableModelOptionsByEngine.cursor.map((model) => model.slug)).toEqual([
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
      selectedEngine: "cursor",
      discoveryEnabled: true,
    }).at(-1);

    expect(catalog?.catalogStateByEngine.cursor).toBe("error");
    expect(catalog?.runtimeModelsByEngine.cursor).toEqual([]);
    expect(catalog?.selectableModelOptionsByEngine.cursor.map((model) => model.slug)).toEqual([
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
      selectedEngine: "opencode",
      discoveryEnabled: true,
      cwd: "/next-project",
    }).at(-1);

    expect(catalog?.selectedRuntimeAgents).toEqual([]);
  });
});
