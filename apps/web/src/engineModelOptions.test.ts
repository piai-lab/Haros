// FILE: engineModelOptions.test.ts
// Purpose: Verifies engine-aware model-name formatting for picker and composer labels.
// Layer: Web unit tests
// Depends on: engineModelOptions shared formatting helpers.

import { describe, expect, it } from "vitest";

import {
  buildEngineSelection,
  buildNextEngineOptions,
  buildEngineOptionPatch,
  formatEngineModelOptionName,
  groupEngineModelOptions,
  groupEngineModelOptionsWithFavorites,
  mergeDynamicModelOptions,
  engineModelCostMultiplierLabel,
  engineModelOptionProvenanceLabel,
  resolveModelPresentationIdentity,
  resolveModelGroupDefaultOpen,
  shouldUseCollapsibleModelGroups,
  type EngineModelOption,
} from "./engineModelOptions";

describe("Antigravity model options", () => {
  it("keeps the base model and effort as separate selection fields", () => {
    const options = buildNextEngineOptions("antigravity", undefined, {
      reasoningEffort: "high",
    });

    expect(options).toEqual({ reasoningEffort: "high" });
    expect(buildEngineSelection("antigravity", "Gemini 3.5 Flash", options)).toEqual({
      engine: "antigravity",
      model: "Gemini 3.5 Flash",
      options: { reasoningEffort: "high" },
    });
  });
});

describe("Claude model selections", () => {
  it("preserves the discovered Auto capability with the selected model", () => {
    expect(buildEngineSelection("claude", "claude-haiku-4-5", undefined, false)).toEqual({
      engine: "claude",
      model: "claude-haiku-4-5",
      supportsAutoMode: false,
    });
  });
});

describe("formatEngineModelOptionName", () => {
  it("humanizes unknown OpenCode runtime model slugs using the model identifier", () => {
    expect(
      formatEngineModelOptionName({
        engine: "opencode",
        slug: "opencode-go/kimi-k2.6",
      }),
    ).toBe("Kimi K2.6");
  });

  it("keeps known OpenCode-backed models on their shared display names", () => {
    expect(
      formatEngineModelOptionName({
        engine: "opencode",
        slug: "openai/gpt-5",
      }),
    ).toBe("GPT-5");
  });

  it("leaves non-OpenCode unknown slugs unchanged", () => {
    expect(
      formatEngineModelOptionName({
        engine: "codex",
        slug: "custom/internal-model",
      }),
    ).toBe("custom/internal-model");
  });
});

describe("resolveModelPresentationIdentity", () => {
  it("freezes built-in catalog identity even when the caller has no live descriptor", () => {
    expect(
      resolveModelPresentationIdentity({
        selection: { engine: "codex", model: "gpt-5.5" },
      }),
    ).toEqual({
      model: "gpt-5.5",
      displayName: "GPT-5.5",
      source: "builtin-catalog",
    });
  });
});

describe("mergeDynamicModelOptions", () => {
  it("does not offer Pi Anthropic models when discovery only returns local models", () => {
    expect(
      mergeDynamicModelOptions({
        engine: "pi",
        staticOptions: [],
        dynamicModels: [
          {
            slug: "local/glm-5.2",
            name: "GLM 5.2",
            upstreamProviderId: "local",
            upstreamProviderName: "Local",
            upstreamProviderOrigin: "models_json",
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        slug: "local/glm-5.2",
        upstreamProviderOrigin: "models_json",
        presentationSource: "user-configured",
      }),
    ]);
  });

  it("offers Pi Fable and Opus when authenticated discovery returns them", () => {
    expect(
      mergeDynamicModelOptions({
        engine: "pi",
        staticOptions: [],
        dynamicModels: [
          { slug: "anthropic/claude-fable-5", name: "Claude Fable 5" },
          { slug: "anthropic/claude-opus-4-8", name: "Claude Opus 4.8" },
        ],
      }).map((option) => option.slug),
    ).toEqual(["anthropic/claude-fable-5", "anthropic/claude-opus-4-8"]);
  });

  it("uses the live Antigravity catalog as authoritative and includes newly discovered models", () => {
    expect(
      mergeDynamicModelOptions({
        engine: "antigravity",
        staticOptions: [
          { slug: "Gemini 3.5 Flash", name: "Gemini 3.5 Flash" },
          { slug: "Claude Sonnet 4.6", name: "Claude Sonnet 4.6" },
          { slug: "custom/private-model", name: "custom/private-model", isCustom: true },
        ],
        dynamicModels: [
          { slug: "Gemini 4 Pro", name: "Gemini 4 Pro" },
          { slug: "Claude Sonnet 5", name: "Claude Sonnet 5" },
        ],
      }),
    ).toEqual([
      { slug: "Gemini 4 Pro", name: "Gemini 4 Pro", presentationSource: "runtime-catalog" },
      {
        slug: "Claude Sonnet 5",
        name: "Claude Sonnet 5",
        presentationSource: "runtime-catalog",
      },
      { slug: "custom/private-model", name: "custom/private-model", isCustom: true },
    ]);
  });

  it("preserves runtime descriptions without inventing them for custom models", () => {
    const options = mergeDynamicModelOptions({
      engine: "droid",
      staticOptions: [{ slug: "custom:model", name: "Custom model", isCustom: true }],
      dynamicModels: [
        {
          slug: "gpt-5.6-luna",
          name: "GPT-5.6 Luna",
          description: " 0.4x Factory token rate ",
        },
        { slug: "custom:model", name: "Custom model" },
      ],
    });

    expect(options).toEqual([
      {
        slug: "gpt-5.6-luna",
        name: "GPT-5.6 Luna",
        description: "0.4x Factory token rate",
        presentationSource: "runtime-catalog",
      },
      { slug: "custom:model", name: "Custom model", presentationSource: "runtime-catalog" },
    ]);
  });

  it("treats the live Droid catalog as authoritative and drops invalid custom slugs", () => {
    expect(
      mergeDynamicModelOptions({
        engine: "droid",
        staticOptions: [
          { slug: "retired-model", name: "Retired" },
          { slug: "made-up-model", name: "Made up", isCustom: true },
        ],
        dynamicModels: [{ slug: "gpt-5.6-sol", name: "GPT-5.6 Sol" }],
      }),
    ).toEqual([
      { slug: "gpt-5.6-sol", name: "GPT-5.6 Sol", presentationSource: "runtime-catalog" },
    ]);
  });

  it("deduplicates Cursor transport variants by their base model", () => {
    expect(
      mergeDynamicModelOptions({
        engine: "cursor",
        staticOptions: [
          {
            slug: "grok-4.5[thinking=true]",
            name: "Cursor Grok 4.5",
            isCustom: true,
          },
        ],
        dynamicModels: [
          {
            slug: "grok-4.5",
            name: "Cursor Grok 4.5",
            upstreamProviderId: "xai",
            upstreamProviderName: "xAI",
          },
          { slug: "grok-4.5[thinking=true]", name: "Cursor Grok 4.5" },
        ],
      }),
    ).toEqual([
      {
        slug: "grok-4.5",
        name: "Cursor Grok 4.5",
        upstreamProviderId: "xai",
        upstreamProviderName: "xAI",
        presentationSource: "runtime-catalog",
      },
    ]);
  });

  it("orders discovered Claude models by the canonical catalog", () => {
    expect(
      mergeDynamicModelOptions({
        engine: "claude",
        staticOptions: [
          { slug: "claude-fable-5", name: "Claude Fable 5" },
          { slug: "claude-opus-5", name: "Claude Opus 5" },
          { slug: "claude-sonnet-5", name: "Claude Sonnet 5" },
          { slug: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
          { slug: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
        ],
        dynamicModels: [
          { slug: "default", name: "Default (recommended)" },
          { slug: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
          { slug: "claude-sonnet-5", name: "Claude Sonnet 5" },
          { slug: "claude-fable-5", name: "Claude Fable 5" },
          { slug: "claude-opus-5", name: "Claude Opus 5" },
        ],
      }).map((option) => option.slug),
    ).toEqual([
      "claude-fable-5",
      "claude-opus-5",
      "claude-sonnet-5",
      "claude-sonnet-4-6",
      "claude-haiku-4-5",
    ]);
  });

  it("keeps newly discovered unknown Claude models at the top", () => {
    expect(
      mergeDynamicModelOptions({
        engine: "claude",
        staticOptions: [
          { slug: "claude-fable-5", name: "Claude Fable 5" },
          { slug: "claude-opus-5", name: "Claude Opus 5" },
        ],
        dynamicModels: [
          { slug: "claude-opus-5", name: "Claude Opus 5" },
          { slug: "claude-opus-6", name: "Claude Opus 6" },
        ],
      }).map((option) => option.slug),
    ).toEqual(["claude-opus-6", "claude-fable-5", "claude-opus-5"]);
  });

  it("treats the live Grok CLI catalog as authoritative", () => {
    expect(
      mergeDynamicModelOptions({
        engine: "grok",
        staticOptions: [
          { slug: "grok-4.6", name: "Grok 4.6" },
          { slug: "grok-4.5", name: "Grok 4.5" },
          { slug: "grok-build", name: "Grok 4.3" },
          { slug: "custom/grok-fast", name: "custom/grok-fast", isCustom: true },
        ],
        dynamicModels: [{ slug: "grok-4.6", name: "Grok 4.6" }],
      }),
    ).toEqual([
      { slug: "grok-4.6", name: "Grok 4.6", presentationSource: "runtime-catalog" },
      { slug: "custom/grok-fast", name: "custom/grok-fast", isCustom: true },
    ]);
  });
});

describe("engineModelCostMultiplierLabel", () => {
  it("formats live engine multipliers without hardcoding their values", () => {
    expect(engineModelCostMultiplierLabel("0.38x Factory token rate")).toBe("0.38×");
    expect(engineModelCostMultiplierLabel("12x Factory token rate")).toBe("12×");
  });

  it("ignores descriptions that do not begin with a multiplier", () => {
    expect(engineModelCostMultiplierLabel("Launch Pricing")).toBeNull();
    expect(engineModelCostMultiplierLabel()).toBeNull();
  });
});

describe("engineModelOptionProvenanceLabel", () => {
  it("prefers the discovered upstream engine name", () => {
    expect(
      engineModelOptionProvenanceLabel({
        engine: "opencode",
        option: {
          slug: "opencode-go/deepseek-v4-flash",
          name: "DeepSeek V4 Flash",
          upstreamProviderId: "opencode-go",
          upstreamProviderName: "OpenCode Go",
        },
      }),
    ).toBe("OpenCode Go");
  });

  it("falls back to a humanized slug engine, then the HarnessOS engine", () => {
    expect(
      engineModelOptionProvenanceLabel({
        engine: "opencode",
        option: {
          slug: "local-runtime/deepseek-v4-flash",
          name: "DeepSeek V4 Flash",
        },
      }),
    ).toBe("Local Runtime");
    expect(
      engineModelOptionProvenanceLabel({
        engine: "cursor",
        option: { slug: "auto", name: "Auto" },
      }),
    ).toBe("Cursor");
  });
});

describe("buildEngineOptionPatch", () => {
  it("passes through option ids unchanged", () => {
    expect(buildEngineOptionPatch("codex", "reasoningEffort", "xhigh")).toEqual({
      reasoningEffort: "xhigh",
    });
    expect(buildEngineOptionPatch("droid", "reasoningEffort", "high")).toEqual({
      reasoningEffort: "high",
    });
    expect(buildEngineOptionPatch("grok", "reasoningEffort", "high")).toEqual({
      reasoningEffort: "high",
    });
    expect(buildEngineOptionPatch("cursor", "fastMode", true)).toEqual({ fastMode: true });
  });
});

describe("groupEngineModelOptions", () => {
  it("groups engine models by upstream engine", () => {
    const options = [
      {
        slug: "anthropic/claude-sonnet",
        name: "Claude Sonnet",
        upstreamProviderId: "anthropic",
        upstreamProviderName: "Anthropic",
      },
      {
        slug: "openai/gpt-5",
        name: "GPT-5",
        upstreamProviderId: "openai",
        upstreamProviderName: "OpenAI",
      },
    ] satisfies EngineModelOption[];

    const groupedOptions = groupEngineModelOptions(options);

    expect(groupedOptions.map((group) => group.label)).toEqual(["Anthropic", "OpenAI"]);
  });

  it("disambiguates two model-service instances with the same display name", () => {
    const groupedOptions = groupEngineModelOptions([
      {
        slug: "gateway-primary/shared-model",
        name: "Shared Model",
        upstreamProviderId: "gateway-primary",
        upstreamProviderName: "Team Gateway",
      },
      {
        slug: "gateway-secondary/shared-model",
        name: "Shared Model",
        upstreamProviderId: "gateway-secondary",
        upstreamProviderName: "Team Gateway",
      },
    ]);

    expect(groupedOptions.map((group) => ({ key: group.key, label: group.label }))).toEqual([
      { key: "gateway-primary", label: "Team Gateway · gateway-primary" },
      { key: "gateway-secondary", label: "Team Gateway · gateway-secondary" },
    ]);
    expect(groupedOptions.flatMap((group) => group.options.map((option) => option.slug))).toEqual([
      "gateway-primary/shared-model",
      "gateway-secondary/shared-model",
    ]);
  });

  it("keeps case-distinct opaque model-service ids in separate groups", () => {
    const groupedOptions = groupEngineModelOptions([
      {
        slug: "Gateway/shared-model",
        name: "Shared Model",
        upstreamProviderId: "Gateway",
        upstreamProviderName: "Team Gateway",
      },
      {
        slug: "gateway/shared-model",
        name: "Shared Model",
        upstreamProviderId: "gateway",
        upstreamProviderName: "Team Gateway",
      },
    ]);

    expect(groupedOptions.map((group) => group.key)).toEqual(["Gateway", "gateway"]);
    expect(groupedOptions.map((group) => group.label)).toEqual([
      "Team Gateway · Gateway",
      "Team Gateway · gateway",
    ]);
  });
});

describe("groupEngineModelOptionsWithFavorites", () => {
  it("adds a favourites group ahead of the normal engine groups", () => {
    const options = [
      {
        slug: "anthropic/claude-sonnet",
        name: "Claude Sonnet",
        upstreamProviderId: "anthropic",
        upstreamProviderName: "Anthropic",
      },
      {
        slug: "openai/gpt-5",
        name: "GPT-5",
        upstreamProviderId: "openai",
        upstreamProviderName: "OpenAI",
      },
    ] satisfies EngineModelOption[];

    const groupedOptions = groupEngineModelOptionsWithFavorites({
      options,
      favoriteSlugs: new Set(["openai/gpt-5"]),
    });

    expect(groupedOptions.map((group) => group.label)).toEqual(["Favourites", "Anthropic"]);
    expect(groupedOptions[0]?.options.map((option) => option.slug)).toEqual(["openai/gpt-5"]);
    expect(groupedOptions.flatMap((group) => group.options.map((option) => option.slug))).toEqual([
      "openai/gpt-5",
      "anthropic/claude-sonnet",
    ]);
  });
});

describe("collapsible model group helpers", () => {
  it("enables collapsible sections only for long grouped lists while not searching", () => {
    expect(shouldUseCollapsibleModelGroups(2, false)).toBe(false);
    expect(shouldUseCollapsibleModelGroups(3, false)).toBe(true);
    expect(shouldUseCollapsibleModelGroups(4, true)).toBe(false);
  });

  it("keeps favourites and the active model group expanded by default", () => {
    expect(
      resolveModelGroupDefaultOpen({
        groupKey: "__favorites__",
        options: [{ slug: "openai/gpt-5", name: "GPT-5" }],
        activeModel: "anthropic/claude-sonnet",
        groupCount: 4,
      }),
    ).toBe(true);
    expect(
      resolveModelGroupDefaultOpen({
        groupKey: "openai",
        options: [{ slug: "openai/gpt-5", name: "GPT-5" }],
        activeModel: "openai/gpt-5",
        groupCount: 4,
      }),
    ).toBe(true);
    expect(
      resolveModelGroupDefaultOpen({
        groupKey: "anthropic",
        options: [{ slug: "anthropic/claude-sonnet", name: "Claude Sonnet" }],
        activeModel: "openai/gpt-5",
        groupCount: 4,
      }),
    ).toBe(false);
  });
});
