import { ThreadId, type EngineSelection } from "@harnessos/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import {
  deriveEffectiveComposerModelState,
  resolvePreferredComposerEngineSelection,
  useComposerDraftStore,
} from "./composerDraftStore";
import {
  engineSelection,
  engineModelOptions,
  resetComposerDraftStore,
} from "./composerDraftStoreTestFixtures";

describe("resolvePreferredComposerEngineSelection", () => {
  it("prefers the active draft engine selection over thread and project defaults", () => {
    expect(
      resolvePreferredComposerEngineSelection({
        draft: {
          engineSelectionByEngine: {
            claude: engineSelection("claude", "claude-opus-4-6", {
              effort: "max",
            }),
          },
          activeEngine: "claude",
        },
        threadEngineSelection: engineSelection("codex", "gpt-5"),
        projectEngineSelection: engineSelection("codex", "gpt-5.4"),
      }),
    ).toEqual(
      engineSelection("claude", "claude-opus-4-6", {
        effort: "max",
      }),
    );
  });

  it("can prefer Grok draft selections", () => {
    expect(
      resolvePreferredComposerEngineSelection({
        draft: {
          engineSelectionByEngine: {
            grok: engineSelection("grok", "grok-build"),
          },
          activeEngine: "grok",
        },
        threadEngineSelection: engineSelection("codex", "gpt-5"),
        projectEngineSelection: engineSelection("codex", "gpt-5.4"),
      }),
    ).toEqual(engineSelection("grok", "grok-build"));
  });

  it("uses only the active engine selection for terminal-first promotion", () => {
    const cursorSelection = engineSelection("cursor", "cursor-auto", {
      reasoningEffort: "high",
    });
    expect(
      resolvePreferredComposerEngineSelection({
        draft: {
          engineSelectionByEngine: {
            codex: engineSelection("codex", "gpt-5.6-sol", { reasoningEffort: "ultra" }),
            cursor: cursorSelection,
          },
          activeEngine: "cursor",
        },
        threadEngineSelection: null,
        projectEngineSelection: null,
      }),
    ).toEqual(cursorSelection);
  });

  it("keeps an unbound Pi intent fail-closed instead of falling back to Codex", () => {
    expect(
      resolvePreferredComposerEngineSelection({
        draft: {
          engineSelectionByEngine: {},
          activeEngine: "pi",
        },
        threadEngineSelection: engineSelection("codex", "gpt-5.5"),
        projectEngineSelection: null,
        defaultEngine: "codex",
      }),
    ).toBeNull();
  });

  it("keeps an unbound HarnessOS intent fail-closed until its runtime catalog provides a model", () => {
    expect(
      resolvePreferredComposerEngineSelection({
        draft: {
          engineSelectionByEngine: {},
          activeEngine: "oa",
        },
        threadEngineSelection: null,
        projectEngineSelection: null,
        defaultEngine: "codex",
      }),
    ).toBeNull();
  });
});

describe("composerDraftStore engineSelection", () => {
  const threadId = ThreadId.makeUnsafe("thread-model-options");

  beforeEach(() => {
    resetComposerDraftStore();
  });

  it("stores a model selection in the draft", () => {
    const store = useComposerDraftStore.getState();
    store.setEngineSelection(
      threadId,
      engineSelection("codex", "gpt-5.3-codex", {
        reasoningEffort: "xhigh",
        fastMode: true,
      }),
    );

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.codex,
    ).toEqual(
      engineSelection("codex", "gpt-5.3-codex", {
        reasoningEffort: "xhigh",
        fastMode: true,
      }),
    );
  });

  it.each(["max", "ultra"])(
    "retains runtime-discovered Codex %s effort in thread and sticky selections",
    (reasoningEffort) => {
      const store = useComposerDraftStore.getState();
      const selection = engineSelection("codex", "gpt-5.6-sol", { reasoningEffort });

      store.setEngineSelection(threadId, selection);
      store.setStickyEngineSelection(selection);

      const state = useComposerDraftStore.getState();
      expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.codex).toEqual(selection);
      expect(state.stickyEngineSelectionByEngine.codex).toEqual(selection);
    },
  );

  it("drops malformed Codex reasoning efforts while preserving other options", () => {
    const store = useComposerDraftStore.getState();

    store.setEngineModelOptions(
      threadId,
      "codex",
      { reasoningEffort: "   ", fastMode: true },
      { model: "gpt-5.6-sol" },
    );

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.codex,
    ).toEqual(engineSelection("codex", "gpt-5.6-sol", { fastMode: true }));
  });

  it("keeps default-only model selections on the draft", () => {
    const store = useComposerDraftStore.getState();
    store.setEngineSelection(threadId, engineSelection("codex", "gpt-5.4"));

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.codex,
    ).toEqual(engineSelection("codex", "gpt-5.4"));
  });

  it("stores Grok selections instead of dropping them during normalization", () => {
    const store = useComposerDraftStore.getState();

    store.setEngineSelection(threadId, engineSelection("grok", "grok-build"));
    store.setStickyEngineSelection(engineSelection("grok", "grok-build"));

    const state = useComposerDraftStore.getState();
    expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.grok).toEqual(
      engineSelection("grok", "grok-build"),
    );
    expect(state.draftsByThreadId[threadId]?.activeEngine).toBe("grok");
    expect(state.stickyEngineSelectionByEngine.grok).toEqual(engineSelection("grok", "grok-build"));
    expect(state.stickyActiveEngine).toBe("grok");
  });

  it("stores Antigravity base models and effort options separately", () => {
    const store = useComposerDraftStore.getState();
    const selection = engineSelection("antigravity", "Gemini 3.5 Flash", {
      reasoningEffort: "high",
    });

    store.setEngineSelection(threadId, selection);
    store.setStickyEngineSelection(selection);

    const state = useComposerDraftStore.getState();
    expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.antigravity).toEqual(
      selection,
    );
    expect(state.draftsByThreadId[threadId]?.activeEngine).toBe("antigravity");
    expect(state.stickyEngineSelectionByEngine.antigravity).toEqual(selection);
    expect(state.stickyActiveEngine).toBe("antigravity");
  });

  it("replaces only the targeted engine options on the current model selection", () => {
    const store = useComposerDraftStore.getState();

    store.setEngineSelection(
      threadId,
      engineSelection("claude", "claude-opus-4-6", {
        effort: "max",
        fastMode: true,
      }),
    );
    store.setStickyEngineSelection(
      engineSelection("claude", "claude-opus-4-6", {
        effort: "max",
        fastMode: true,
      }),
    );

    store.setEngineModelOptions(
      threadId,
      "claude",
      {
        thinking: false,
      },
      { persistSticky: true },
    );

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.claude,
    ).toEqual(
      engineSelection("claude", "claude-opus-4-6", {
        thinking: false,
      }),
    );
    expect(useComposerDraftStore.getState().stickyEngineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-6", {
        thinking: false,
      }),
    );
  });

  it("keeps explicit default-state overrides on the selection", () => {
    const store = useComposerDraftStore.getState();

    store.setEngineSelection(
      threadId,
      engineSelection("claude", "claude-opus-4-6", {
        effort: "max",
      }),
    );

    store.setEngineModelOptions(threadId, "claude", {
      thinking: true,
    });

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.claude,
    ).toEqual(
      engineSelection("claude", "claude-opus-4-6", {
        thinking: true,
      }),
    );
    expect(useComposerDraftStore.getState().stickyEngineSelectionByEngine).toEqual({});
  });

  it("keeps explicit off/default codex overrides on the selection", () => {
    const store = useComposerDraftStore.getState();

    store.setEngineSelection(threadId, engineSelection("codex", "gpt-5.4", { fastMode: true }));

    store.setEngineModelOptions(threadId, "codex", {
      reasoningEffort: "high",
      fastMode: false,
    });

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.codex,
    ).toEqual(
      engineSelection("codex", "gpt-5.4", {
        reasoningEffort: "high",
        fastMode: false,
      }),
    );
  });

  it.each([
    { label: "omitted", options: undefined },
    { label: "disabled", options: { persistSticky: false } as const },
  ])("updates only the draft when sticky persistence is $label", ({ options }) => {
    const store = useComposerDraftStore.getState();

    store.setStickyEngineSelection(engineSelection("claude", "claude-opus-4-6", { effort: "max" }));
    store.setEngineSelection(
      threadId,
      engineSelection("claude", "claude-opus-4-6", { effort: "max" }),
    );

    store.setEngineModelOptions(threadId, "claude", { thinking: false }, options);

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.claude,
    ).toEqual(
      engineSelection("claude", "claude-opus-4-6", {
        thinking: false,
      }),
    );
    expect(useComposerDraftStore.getState().stickyEngineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-6", { effort: "max" }),
    );
  });

  it("does not clear other engine options when setting options for a single engine", () => {
    const store = useComposerDraftStore.getState();

    // Set options for both engines
    store.setModelOptions(
      threadId,
      engineModelOptions({
        codex: { fastMode: true },
        claude: { effort: "max" },
      }),
    );

    // Now set options for only codex — claudeAgent should be untouched
    store.setModelOptions(threadId, engineModelOptions({ codex: { reasoningEffort: "xhigh" } }));

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.engineSelectionByEngine.codex?.options).toEqual({ reasoningEffort: "xhigh" });
    expect(draft?.engineSelectionByEngine.claude?.options).toEqual({ effort: "max" });
  });

  it("preserves other engine options when switching the active model selection", () => {
    const store = useComposerDraftStore.getState();

    store.setModelOptions(
      threadId,
      engineModelOptions({
        codex: { fastMode: true },
        claude: { effort: "max" },
      }),
    );

    store.setEngineSelection(threadId, engineSelection("claude", "claude-opus-4-6"));

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.engineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-6", { effort: "max" }),
    );
    expect(draft?.engineSelectionByEngine.codex?.options).toEqual({ fastMode: true });
    expect(draft?.activeEngine).toBe("claude");
  });

  it("creates the first sticky snapshot from engine option changes", () => {
    const store = useComposerDraftStore.getState();

    store.setEngineSelection(threadId, engineSelection("codex", "gpt-5.4"));

    store.setEngineModelOptions(
      threadId,
      "codex",
      {
        fastMode: true,
      },
      { persistSticky: true },
    );

    expect(useComposerDraftStore.getState().stickyEngineSelectionByEngine.codex).toEqual(
      engineSelection("codex", "gpt-5.4", {
        fastMode: true,
      }),
    );
  });

  it("prefers the active OpenCode thread model over a stale draft default when runtime models are available", () => {
    const state = deriveEffectiveComposerModelState({
      draft: {
        engineSelectionByEngine: {
          opencode: engineSelection("opencode", "openai/gpt-5"),
        },
        activeEngine: "opencode",
      },
      selectedEngine: "opencode",
      threadEngineSelection: engineSelection("opencode", "opencode/gpt-5-nano"),
      projectEngineSelection: null,
      customModelsByEngine: {
        codex: [],
        claude: [],
        cursor: [],
        antigravity: [],
        grok: [],
        droid: [],
        kilo: [],
        opencode: [],
        pi: [],
      },
      availableModelOptionsByEngine: {
        opencode: [{ slug: "opencode/gpt-5-nano", name: "GPT-5 Nano" }],
      },
    });

    expect(state.selectedModel).toBe("opencode/gpt-5-nano");
  });

  it("falls back to the first live OpenCode model when discovery omits the persisted model", () => {
    const state = deriveEffectiveComposerModelState({
      draft: {
        engineSelectionByEngine: {},
        activeEngine: "opencode",
      },
      selectedEngine: "opencode",
      threadEngineSelection: engineSelection("opencode", "openai/gpt-5.4"),
      projectEngineSelection: null,
      customModelsByEngine: {
        codex: [],
        claude: [],
        cursor: [],
        antigravity: [],
        grok: [],
        droid: [],
        kilo: [],
        opencode: [],
        pi: [],
      },
      availableModelOptionsByEngine: {
        opencode: [
          { slug: "openai/gpt-5-codex", name: "GPT-5-Codex" },
          { slug: "openai/gpt-5.4-mini", name: "GPT-5.4 Mini" },
        ],
      },
    });

    expect(state.selectedModel).toBe("openai/gpt-5-codex");
  });

  it("falls back to the first exposed OpenCode runtime model when the draft selection is stale", () => {
    const state = deriveEffectiveComposerModelState({
      draft: {
        engineSelectionByEngine: {
          opencode: engineSelection("opencode", "openai/gpt-5"),
        },
        activeEngine: "opencode",
      },
      selectedEngine: "opencode",
      threadEngineSelection: null,
      projectEngineSelection: null,
      customModelsByEngine: {
        codex: [],
        claude: [],
        cursor: [],
        antigravity: [],
        grok: [],
        droid: [],
        kilo: [],
        opencode: [],
        pi: [],
      },
      availableModelOptionsByEngine: {
        opencode: [
          { slug: "opencode/gpt-5-nano", name: "GPT-5 Nano" },
          { slug: "opencode/big-pickle", name: "Big Pickle" },
        ],
      },
    });

    expect(state.selectedModel).toBe("opencode/gpt-5-nano");
  });

  it("keeps a remembered Pi model unavailable when the runtime catalog no longer contains it", () => {
    const state = deriveEffectiveComposerModelState({
      draft: {
        engineSelectionByEngine: {
          pi: engineSelection("pi", "openai/gpt-5.5"),
        },
        activeEngine: "pi",
      },
      selectedEngine: "pi",
      threadEngineSelection: null,
      projectEngineSelection: null,
      customModelsByEngine: {
        codex: [],
        claude: [],
        cursor: [],
        antigravity: [],
        grok: [],
        droid: [],
        kilo: [],
        opencode: [],
        pi: [],
      },
      availableModelOptionsByEngine: {
        pi: [
          { slug: "openai/gpt-5.1", name: "GPT-5.1" },
          { slug: "anthropic/claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
        ],
      },
    });

    expect(state.selectedModel).toBeNull();
  });

  it("does not silently replace a removed HarnessOS service with another service model", () => {
    const state = deriveEffectiveComposerModelState({
      draft: {
        engineSelectionByEngine: {
          oa: engineSelection("oa", "service-a/model-a"),
        },
        activeEngine: "oa",
      },
      selectedEngine: "oa",
      threadEngineSelection: null,
      projectEngineSelection: null,
      customModelsByEngine: {},
      availableModelOptionsByEngine: {
        oa: [{ slug: "service-b/model-b", name: "Model B" }],
      },
    });

    expect(state.selectedModel).toBeNull();
  });

  it("selects the first HarnessOS catalog model only when no exact selection was remembered", () => {
    const state = deriveEffectiveComposerModelState({
      draft: { engineSelectionByEngine: {}, activeEngine: "oa" },
      selectedEngine: "oa",
      threadEngineSelection: null,
      projectEngineSelection: null,
      customModelsByEngine: {},
      availableModelOptionsByEngine: {
        oa: [{ slug: "service-b/model-b", name: "Model B" }],
      },
    });

    expect(state.selectedModel).toBe("service-b/model-b");
  });

  it("uses an authority-selected HarnessOS catalog fallback instead of the first catalog row", () => {
    const state = deriveEffectiveComposerModelState({
      draft: { engineSelectionByEngine: {}, activeEngine: "oa" },
      selectedEngine: "oa",
      threadEngineSelection: null,
      projectEngineSelection: null,
      runtimeCatalogFallbackModel: "service-b/model-b",
      customModelsByEngine: {},
      availableModelOptionsByEngine: {
        oa: [
          { slug: "service-a/model-a", name: "Model A" },
          { slug: "service-b/model-b", name: "Model B" },
        ],
      },
    });

    expect(state.selectedModel).toBe("service-b/model-b");
  });

  it("returns no model when the selected Engine has no authoritative catalog", () => {
    const state = deriveEffectiveComposerModelState({
      draft: {
        engineSelectionByEngine: {
          oa: engineSelection("oa", "deepseek/deepseek-chat"),
          codex: engineSelection("codex", "gpt-5.5"),
        },
        activeEngine: "oa",
      },
      selectedEngine: "oa",
      threadEngineSelection: engineSelection("codex", "gpt-5.4"),
      projectEngineSelection: engineSelection("codex", "gpt-5.5"),
      customModelsByEngine: {},
      availableModelOptionsByEngine: { oa: [] },
    });

    expect(state.selectedModel).toBeNull();
  });

  it("restores a valid target-Engine sticky model before the declared default", () => {
    const state = deriveEffectiveComposerModelState({
      draft: { engineSelectionByEngine: {}, activeEngine: "claude" },
      selectedEngine: "claude",
      threadEngineSelection: engineSelection("codex", "gpt-5.4"),
      projectEngineSelection: engineSelection("codex", "gpt-5.5"),
      stickyEngineSelection: engineSelection("claude", "claude-opus-4-8", {
        effort: "max",
      }),
      customModelsByEngine: {},
      availableModelOptionsByEngine: {
        claude: [
          { slug: "claude-sonnet-5", name: "Claude Sonnet 5" },
          { slug: "claude-opus-4-8", name: "Claude Opus 4.8" },
        ],
      },
    });

    expect(state.selectedModel).toBe("claude-opus-4-8");
    expect(state.modelOptions?.claude).toEqual({ effort: "max" });
  });

  it("does not restore a target-Engine sticky model missing from the catalog", () => {
    const state = deriveEffectiveComposerModelState({
      draft: { engineSelectionByEngine: {}, activeEngine: "claude" },
      selectedEngine: "claude",
      threadEngineSelection: null,
      projectEngineSelection: null,
      stickyEngineSelection: engineSelection("claude", "claude-opus-4-8", {
        effort: "max",
      }),
      customModelsByEngine: {},
      availableModelOptionsByEngine: {
        claude: [{ slug: "claude-sonnet-5", name: "Claude Sonnet 5" }],
      },
    });

    expect(state.selectedModel).toBe("claude-sonnet-5");
    expect(state.modelOptions?.claude).toBeUndefined();
  });
});

describe("composerDraftStore setEngineSelection", () => {
  const threadId = ThreadId.makeUnsafe("thread-model");

  beforeEach(() => {
    resetComposerDraftStore();
  });

  it("switches the active Engine without fabricating a model selection", () => {
    const store = useComposerDraftStore.getState();

    store.setEngineSelectionAndSticky(threadId, engineSelection("codex", "gpt-5.4"));
    store.setActiveEngineAndSticky(threadId, "oa");

    const state = useComposerDraftStore.getState();
    expect(state.draftsByThreadId[threadId]?.activeEngine).toBe("oa");
    expect(state.stickyActiveEngine).toBe("oa");
    expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.oa).toBeUndefined();
    expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.codex).toEqual(
      engineSelection("codex", "gpt-5.4"),
    );
  });

  it("keeps explicit model overrides instead of coercing to null", () => {
    const store = useComposerDraftStore.getState();

    store.setEngineSelection(threadId, engineSelection("codex", "gpt-5.3-codex"));

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.codex,
    ).toEqual(engineSelection("codex", "gpt-5.3-codex"));
  });

  it("preserves newly discovered Droid effort strings in composer state", () => {
    const store = useComposerDraftStore.getState();
    store.setEngineSelection(threadId, engineSelection("droid", "future-droid-model"));

    store.setEngineModelOptions(threadId, "droid", { reasoningEffort: "ultra" });

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.droid,
    ).toEqual(engineSelection("droid", "future-droid-model", { reasoningEffort: "ultra" }));
  });

  it("drops a runtime Codex effort when switching models before terminal promotion", () => {
    const store = useComposerDraftStore.getState();
    store.setEngineSelectionAndSticky(
      threadId,
      engineSelection("codex", "gpt-5.6-sol", {
        reasoningEffort: "ultra",
        fastMode: true,
      }),
    );

    store.setEngineSelectionAndSticky(threadId, engineSelection("codex", "gpt-5.4"));

    const state = useComposerDraftStore.getState();
    const draft = state.draftsByThreadId[threadId];
    const expectedSelection = engineSelection("codex", "gpt-5.4", { fastMode: true });
    expect(draft?.engineSelectionByEngine.codex).toEqual(expectedSelection);
    expect(state.stickyEngineSelectionByEngine.codex).toEqual(expectedSelection);
    expect(
      resolvePreferredComposerEngineSelection({
        draft,
        threadEngineSelection: null,
        projectEngineSelection: null,
      }),
    ).toEqual(expectedSelection);
  });

  it("retains a runtime Codex effort when reselecting the same model", () => {
    const store = useComposerDraftStore.getState();
    const selection = engineSelection("codex", "gpt-5.6-sol", {
      reasoningEffort: "max",
      fastMode: true,
    });
    store.setEngineSelectionAndSticky(threadId, selection);

    store.setEngineSelectionAndSticky(threadId, engineSelection("codex", "gpt-5.6-sol"));

    const state = useComposerDraftStore.getState();
    expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.codex).toEqual(selection);
    expect(state.stickyEngineSelectionByEngine.codex).toEqual(selection);
  });

  it("preserves a built-in Codex effort supported by both models", () => {
    const store = useComposerDraftStore.getState();
    store.setEngineSelectionAndSticky(
      threadId,
      engineSelection("codex", "gpt-5.5", { reasoningEffort: "xhigh", fastMode: true }),
    );

    store.setEngineSelectionAndSticky(threadId, engineSelection("codex", "gpt-5.4"));

    const expectedSelection = engineSelection("codex", "gpt-5.4", {
      reasoningEffort: "xhigh",
      fastMode: true,
    });
    const state = useComposerDraftStore.getState();
    expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.codex).toEqual(
      expectedSelection,
    );
    expect(state.stickyEngineSelectionByEngine.codex).toEqual(expectedSelection);
  });

  it("restores Cursor state without transferring the active Codex effort", () => {
    const store = useComposerDraftStore.getState();
    const cursorSelection = engineSelection("cursor", "cursor-auto", {
      reasoningEffort: "high",
    });
    store.setEngineSelectionAndSticky(threadId, cursorSelection);
    store.setEngineSelectionAndSticky(
      threadId,
      engineSelection("codex", "gpt-5.6-sol", { reasoningEffort: "ultra" }),
    );

    store.setEngineSelectionAndSticky(threadId, engineSelection("cursor", "cursor-auto"));

    const state = useComposerDraftStore.getState();
    expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.cursor).toEqual(
      cursorSelection,
    );
    expect(state.stickyEngineSelectionByEngine.cursor).toEqual(cursorSelection);
  });

  it("restores Codex state without transferring the active Cursor effort", () => {
    const store = useComposerDraftStore.getState();
    const codexSelection = engineSelection("codex", "gpt-5.4", {
      reasoningEffort: "xhigh",
    });
    store.setEngineSelectionAndSticky(threadId, codexSelection);
    store.setEngineSelectionAndSticky(
      threadId,
      engineSelection("cursor", "cursor-auto", { reasoningEffort: "high" }),
    );

    store.setEngineSelectionAndSticky(threadId, engineSelection("codex", "gpt-5.4"));

    const state = useComposerDraftStore.getState();
    expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.codex).toEqual(codexSelection);
    expect(state.stickyEngineSelectionByEngine.codex).toEqual(codexSelection);
  });

  it("uses destination defaults when switching engines without saved state", () => {
    const store = useComposerDraftStore.getState();
    store.setEngineSelectionAndSticky(
      threadId,
      engineSelection("codex", "gpt-5.6-sol", { reasoningEffort: "ultra" }),
    );

    store.setEngineSelectionAndSticky(threadId, engineSelection("claude", "claude-opus-4-6"));

    const state = useComposerDraftStore.getState();
    expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-6"),
    );
    expect(state.stickyEngineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-6"),
    );
  });
});

describe("composerDraftStore sticky composer settings", () => {
  beforeEach(() => {
    resetComposerDraftStore();
  });

  it("stores a sticky model selection", () => {
    const store = useComposerDraftStore.getState();

    store.setStickyEngineSelection(
      engineSelection("codex", "gpt-5.3-codex", {
        reasoningEffort: "medium",
        fastMode: true,
      }),
    );

    expect(useComposerDraftStore.getState().stickyEngineSelectionByEngine.codex).toEqual(
      engineSelection("codex", "gpt-5.3-codex", {
        reasoningEffort: "medium",
        fastMode: true,
      }),
    );
    expect(useComposerDraftStore.getState().stickyActiveEngine).toBe("codex");
  });

  it("preserves Claude Auto support through sticky updates, options, and hydration", () => {
    const store = useComposerDraftStore.getState();
    const threadId = ThreadId.makeUnsafe("thread-claude-auto-capability");
    const selection: EngineSelection = {
      engine: "claude",
      model: "claude-haiku-4-5",
      supportsAutoMode: false,
    };

    store.setEngineSelectionAndSticky(threadId, selection);
    store.setEngineModelOptions(threadId, "claude", { effort: "high" }, { persistSticky: true });

    const state = useComposerDraftStore.getState();
    expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.claude).toEqual({
      ...selection,
      options: { effort: "high" },
    });
    expect(state.stickyEngineSelectionByEngine.claude).toEqual({
      ...selection,
      options: { effort: "high" },
    });

    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        merge: (persistedState: unknown, currentState: unknown) => unknown;
      };
    };
    const merged = persistApi.getOptions().merge(
      {
        draftsByThreadId: {
          [threadId]: state.draftsByThreadId[threadId],
        },
        draftThreadsByThreadId: {},
        projectDraftThreadIdByProjectId: {},
        stickyEngineSelectionByEngine: {
          claude: state.stickyEngineSelectionByEngine.claude,
        },
        stickyActiveEngine: "claude",
      },
      useComposerDraftStore.getState(),
    ) as {
      draftsByThreadId: typeof state.draftsByThreadId;
      stickyEngineSelectionByEngine: Partial<Record<EngineSelection["engine"], EngineSelection>>;
    };

    const hydratedClaudeSelection =
      merged.draftsByThreadId[threadId]?.engineSelectionByEngine.claude;
    expect(
      hydratedClaudeSelection?.engine === "claude"
        ? hydratedClaudeSelection.supportsAutoMode
        : undefined,
    ).toBe(false);
    expect(merged.stickyEngineSelectionByEngine.claude).toMatchObject({
      supportsAutoMode: false,
    });
  });

  it("does not copy Claude Auto support metadata to a different model", () => {
    const store = useComposerDraftStore.getState();
    const threadId = ThreadId.makeUnsafe("thread-claude-auto-model-switch");
    store.setEngineSelection(threadId, {
      engine: "claude",
      model: "claude-haiku-4-5",
      supportsAutoMode: false,
    });

    store.setEngineSelection(threadId, {
      engine: "claude",
      model: "claude-sonnet-5",
    });

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.claude,
    ).toEqual({
      engine: "claude",
      model: "claude-sonnet-5",
    });
  });

  it("normalizes empty sticky model options by dropping selection options", () => {
    const store = useComposerDraftStore.getState();

    store.setStickyEngineSelection(engineSelection("codex", "gpt-5.4"));

    expect(useComposerDraftStore.getState().stickyEngineSelectionByEngine.codex).toEqual(
      engineSelection("codex", "gpt-5.4"),
    );
    expect(useComposerDraftStore.getState().stickyActiveEngine).toBe("codex");
  });

  it("preserves current sticky model fields during storage-version migration", () => {
    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        migrate: (persistedState: unknown, version: number) => unknown;
      };
    };
    const migratedState = persistApi.getOptions().migrate(
      {
        draftsByThreadId: {},
        draftThreadsByThreadId: {},
        projectDraftThreadIdByProjectId: {},
        stickyEngineSelectionByEngine: {
          claude: engineSelection("claude", "claude-opus-4-6", {
            effort: "max",
          }),
        },
        stickyActiveEngine: "claude",
        stickyProvider: "codex",
        stickyModel: "gpt-5",
      },
      4,
    ) as {
      stickyEngineSelectionByEngine: Partial<Record<EngineSelection["engine"], EngineSelection>>;
      stickyActiveEngine: EngineSelection["engine"] | null;
    };

    expect(migratedState.stickyEngineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-6", {
        effort: "max",
      }),
    );
    expect(migratedState.stickyActiveEngine).toBe("claude");
  });

  it("applies sticky activeEngine to new drafts", () => {
    const store = useComposerDraftStore.getState();
    const threadId = ThreadId.makeUnsafe("thread-sticky-active-engine");

    store.setStickyEngineSelection(engineSelection("claude", "claude-opus-4-6"));
    store.applyStickyState(threadId);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toMatchObject({
      engineSelectionByEngine: {
        claude: engineSelection("claude", "claude-opus-4-6"),
      },
      activeEngine: "claude",
    });
  });

  it("does not overwrite existing model-scoped options with another sticky model", () => {
    const store = useComposerDraftStore.getState();
    const threadId = ThreadId.makeUnsafe("thread-sticky-model-scope");
    const currentSelection = engineSelection("codex", "gpt-5.4", {
      reasoningEffort: "xhigh",
    });
    store.setStickyEngineSelection(
      engineSelection("codex", "gpt-5.6-sol", { reasoningEffort: "ultra" }),
    );
    store.setEngineSelection(threadId, currentSelection);

    store.applyStickyState(threadId);

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.codex,
    ).toEqual(currentSelection);
  });

  it("restores sticky options for the same engine and model", () => {
    const store = useComposerDraftStore.getState();
    const threadId = ThreadId.makeUnsafe("thread-sticky-same-model");
    const stickySelection = engineSelection("codex", "gpt-5.4", {
      reasoningEffort: "xhigh",
    });
    store.setStickyEngineSelection(stickySelection);
    store.setEngineSelection(threadId, engineSelection("codex", "gpt-5.4"));

    store.applyStickyState(threadId);

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.codex,
    ).toEqual(stickySelection);
  });

  it("strips the Claude context window from sticky selections", () => {
    const store = useComposerDraftStore.getState();

    store.setStickyEngineSelection(
      engineSelection("claude", "claude-opus-4-6", {
        effort: "max",
        contextWindow: "1m",
      }),
    );

    expect(useComposerDraftStore.getState().stickyEngineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-6", { effort: "max" }),
    );
  });

  it("drops sticky Claude options entirely when only the context window was set", () => {
    const store = useComposerDraftStore.getState();

    store.setStickyEngineSelection(
      engineSelection("claude", "claude-opus-4-6", { contextWindow: "1m" }),
    );

    expect(useComposerDraftStore.getState().stickyEngineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-6"),
    );
  });

  it("keeps the Claude auto-compact budget thread-local", () => {
    const store = useComposerDraftStore.getState();
    const threadId = ThreadId.makeUnsafe("thread-sticky-auto-compact-window");

    store.setEngineModelOptions(
      threadId,
      "claude",
      { effort: "xhigh", autoCompactWindow: "1m" },
      { persistSticky: true, model: "claude-opus-4-7" },
    );

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.claude
        ?.options,
    ).toEqual({ effort: "xhigh", autoCompactWindow: "1m" });
    expect(useComposerDraftStore.getState().stickyEngineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-7", { effort: "xhigh" }),
    );
  });

  it("does not persist Claude context window changes through sticky engine options", () => {
    const store = useComposerDraftStore.getState();
    const threadId = ThreadId.makeUnsafe("thread-sticky-context-window");

    store.setEngineModelOptions(
      threadId,
      "claude",
      { effort: "xhigh", contextWindow: "1m" },
      { persistSticky: true, model: "claude-opus-4-7" },
    );

    const state = useComposerDraftStore.getState();
    // The thread keeps its own choice and migrates the legacy field name.
    expect(state.draftsByThreadId[threadId]?.engineSelectionByEngine.claude?.options).toEqual({
      effort: "xhigh",
      autoCompactWindow: "1m",
    });
    // The sticky snapshot only carries options that are safe to inherit.
    expect(state.stickyEngineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-7", { effort: "xhigh" }),
    );
  });

  it("sanitizes a persisted sticky Claude context window during hydration", () => {
    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        merge: (persistedState: unknown, currentState: unknown) => unknown;
      };
    };
    const merged = persistApi.getOptions().merge(
      {
        draftsByThreadId: {},
        draftThreadsByThreadId: {},
        projectDraftThreadIdByProjectId: {},
        stickyEngineSelectionByEngine: {
          claude: engineSelection("claude", "claude-opus-4-6", {
            effort: "max",
            contextWindow: "1m",
          }),
        },
        stickyActiveEngine: "claude",
      },
      useComposerDraftStore.getState(),
    ) as {
      stickyEngineSelectionByEngine: Partial<Record<EngineSelection["engine"], EngineSelection>>;
    };

    expect(merged.stickyEngineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-6", { effort: "max" }),
    );
  });
});

describe("composerDraftStore engine-scoped option updates", () => {
  const threadId = ThreadId.makeUnsafe("thread-engine");

  beforeEach(() => {
    resetComposerDraftStore();
  });

  it("retains off-engine option memory without changing the active selection", () => {
    const store = useComposerDraftStore.getState();
    store.setEngineSelection(
      threadId,
      engineSelection("codex", "gpt-5.3-codex", {
        reasoningEffort: "medium",
      }),
    );
    store.setEngineModelOptions(threadId, "claude", { effort: "max" });
    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.engineSelectionByEngine.codex).toEqual(
      engineSelection("codex", "gpt-5.3-codex", { reasoningEffort: "medium" }),
    );
    expect(draft?.engineSelectionByEngine.claude?.options).toEqual({ effort: "max" });
    expect(draft?.activeEngine).toBe("codex");
  });

  it("retains Claude xhigh effort in engine-scoped options", () => {
    const store = useComposerDraftStore.getState();

    store.setEngineModelOptions(
      threadId,
      "claude",
      { effort: "xhigh" },
      { model: "claude-opus-4-7" },
    );

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.engineSelectionByEngine.claude).toEqual(
      engineSelection("claude", "claude-opus-4-7", {
        effort: "xhigh",
      }),
    );
  });

  it("retains Grok reasoning effort in engine-scoped options", () => {
    const store = useComposerDraftStore.getState();

    store.setEngineModelOptions(
      threadId,
      "grok",
      { reasoningEffort: "high" },
      { model: "grok-build" },
    );

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.engineSelectionByEngine.grok).toEqual(
      engineSelection("grok", "grok-build", {
        reasoningEffort: "high",
      }),
    );
  });

  it("retains HarnessOS max thinking level in engine-scoped options", () => {
    const store = useComposerDraftStore.getState();

    store.setEngineModelOptions(
      threadId,
      "oa",
      { thinkingLevel: "max" },
      { model: "deepseek/deepseek-reasoner" },
    );

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.oa,
    ).toEqual(
      engineSelection("oa", "deepseek/deepseek-reasoner", {
        thinkingLevel: "max",
      }),
    );
  });

  it("moves native options onto the authoritative fallback model instead of a stale saved model", () => {
    const store = useComposerDraftStore.getState();
    store.setEngineSelection(
      threadId,
      engineSelection("pi", "legacy/missing-model", { thinkingLevel: "low" }),
    );

    store.setEngineModelOptions(
      threadId,
      "pi",
      { thinkingLevel: "high" },
      { model: "openai/live-model", persistSticky: true },
    );

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.pi,
    ).toEqual(
      engineSelection("pi", "openai/live-model", {
        thinkingLevel: "high",
      }),
    );
    expect(useComposerDraftStore.getState().stickyEngineSelectionByEngine.pi).toEqual(
      engineSelection("pi", "openai/live-model", {
        thinkingLevel: "high",
      }),
    );
  });

  it("moves a cleared native option onto the authoritative fallback model", () => {
    const store = useComposerDraftStore.getState();
    store.setEngineSelectionAndSticky(
      threadId,
      engineSelection("pi", "legacy/missing-model", { thinkingLevel: "low" }),
    );

    store.setEngineModelOptions(threadId, "pi", undefined, {
      model: "openai/live-model",
      persistSticky: true,
    });

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.engineSelectionByEngine.pi,
    ).toEqual(engineSelection("pi", "openai/live-model"));
    expect(useComposerDraftStore.getState().stickyEngineSelectionByEngine.pi).toEqual(
      engineSelection("pi", "openai/live-model"),
    );
  });
});
