import type { ConversationHistoryPlanId } from "~/historicalConversation";
import { ProjectId, ThreadId } from "@omnimind/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { partializeComposerDraftStoreState, useComposerDraftStore } from "./composerDraftStore";
import { COMPOSER_DRAFT_STORAGE_KEY } from "./composerDraftDomain";
import { normalizeCurrentPersistedComposerDraftStoreState } from "./composerDraftPersistence";
import {
  makeImage,
  makeQueuedChatTurn,
  makeQueuedTurn,
  makeTerminalContext,
  modelSelection,
  resetComposerDraftStore,
} from "./composerDraftStoreTestFixtures";
import { createDeferredPersistStorage, flushStorageBeforePageHide } from "./lib/storage";
import {
  INLINE_TERMINAL_CONTEXT_PLACEHOLDER,
  insertInlineTerminalContextPlaceholder,
} from "./lib/terminalContext";

describe("composerDraftStore generation-1 persisted-state hydration", () => {
  const emptyState = {
    draftsByThreadId: {},
    draftThreadsByThreadId: {},
    projectDraftThreadIdByProjectId: {},
    stickyModelSelectionByProvider: {},
    stickyActiveProvider: null,
  };

  it("accepts the exact current empty state", () => {
    expect(normalizeCurrentPersistedComposerDraftStoreState(emptyState)).toEqual(emptyState);
  });

  it.each([null, {}, { draftsByThreadId: {} }])(
    "rejects absent or partial donor state %#",
    (candidate) => {
      expect(() => normalizeCurrentPersistedComposerDraftStoreState(candidate)).toThrow();
    },
  );

  it.each(["stickyModelSelectionByProvider", "stickyActiveProvider"] as const)(
    "rejects missing required current field %s",
    (field) => {
      const candidate = { ...emptyState } as Record<string, unknown>;
      delete candidate[field];
      expect(() => normalizeCurrentPersistedComposerDraftStoreState(candidate)).toThrow();
    },
  );

  it("rejects unknown fields instead of silently stripping them", () => {
    expect(() =>
      normalizeCurrentPersistedComposerDraftStoreState({ ...emptyState, donorField: true }),
    ).toThrow();
    const threadId = ThreadId.makeUnsafe("thread-excess-field");
    expect(() =>
      normalizeCurrentPersistedComposerDraftStoreState({
        ...emptyState,
        draftsByThreadId: {
          [threadId]: { prompt: "x", attachments: [], donorField: true },
        },
      }),
    ).toThrow();
  });

  it("rejects a draft-thread without the current entry point", () => {
    const threadId = ThreadId.makeUnsafe("thread-missing-entry-point");
    expect(() =>
      normalizeCurrentPersistedComposerDraftStoreState({
        ...emptyState,
        draftThreadsByThreadId: {
          [threadId]: {
            projectId: ProjectId.makeUnsafe("project-missing-entry-point"),
            createdAt: "2026-08-07T00:00:00.000Z",
            runtimeMode: "full-access",
            interactionMode: "default",
            branch: null,
            worktreePath: null,
            workingDirectory: null,
            envMode: "local",
          },
        },
      }),
    ).toThrow();
  });

  it("accepts current project mappings and selections without conversion", () => {
    const projectId = ProjectId.makeUnsafe("project-hydration");
    const threadId = ThreadId.makeUnsafe("thread-hydration");
    const mappingKey = `${projectId}::terminal`;
    const currentState = {
      draftsByThreadId: {
        [threadId]: {
          prompt: "Review these selections",
          attachments: [],
          assistantSelections: [
            {
              id: "assistant-selection-1",
              assistantMessageId: "assistant-message-1",
              text: "selected assistant text",
            },
          ],
          fileComments: [
            {
              id: "file-comment-1",
              path: "src/example.ts",
              startLine: 8,
              endLine: 8,
              text: "selected file text",
            },
          ],
        },
      },
      draftThreadsByThreadId: {
        [threadId]: {
          projectId,
          createdAt: "2026-07-25T00:00:00.000Z",
          runtimeMode: "full-access" as const,
          interactionMode: "default" as const,
          entryPoint: "terminal" as const,
          branch: null,
          worktreePath: null,
          workingDirectory: null,
          envMode: "local" as const,
        },
      },
      projectDraftThreadIdByProjectId: { [mappingKey]: threadId },
      stickyModelSelectionByProvider: {},
      stickyActiveProvider: null,
    };

    expect(normalizeCurrentPersistedComposerDraftStoreState(currentState)).toEqual(currentState);
  });

  it("rejects the retired prompt-history string shape", () => {
    expect(() =>
      normalizeCurrentPersistedComposerDraftStoreState({
        ...emptyState,
        draftsByThreadId: {
          [ThreadId.makeUnsafe("thread-retired-history")]: {
            prompt: "",
            attachments: [],
            promptHistorySavedDraft: "retired donor draft",
          },
        },
      }),
    ).toThrow();
  });

  it.each([
    { modelSelectionByProvider: {} },
    { activeProvider: null },
  ])("rejects an incomplete per-draft model-selection pair %#", (partial) => {
    const threadId = ThreadId.makeUnsafe("thread-incomplete-model-pair");
    expect(() =>
      normalizeCurrentPersistedComposerDraftStoreState({
        ...emptyState,
        draftsByThreadId: {
          [threadId]: { prompt: "", attachments: [], ...partial },
        },
      }),
    ).toThrow();
  });
});

describe("composerDraftStore generation-1 storage authority", () => {
  const emptyState = {
    draftsByThreadId: {},
    draftThreadsByThreadId: {},
    projectDraftThreadIdByProjectId: {},
    stickyModelSelectionByProvider: {},
    stickyActiveProvider: null,
  };

  const loadWithStorage = async (initial: Readonly<Record<string, string>>) => {
    const values = new Map(Object.entries(initial));
    const storage = {
      getItem: vi.fn((name: string) => values.get(name) ?? null),
      setItem: vi.fn((name: string, value: string) => values.set(name, value)),
      removeItem: vi.fn((name: string) => values.delete(name)),
    };
    vi.stubGlobal("localStorage", storage);
    vi.resetModules();
    const module = await import("./composerDraftStore");
    return { module, storage, values };
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("creates and rereads the exact g1 envelope from clean absence", async () => {
    const { storage, values } = await loadWithStorage({});
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(
      COMPOSER_DRAFT_STORAGE_KEY,
      JSON.stringify({ generation: 1, state: emptyState }),
    );
    expect(storage.getItem).toHaveBeenCalledTimes(2);
    expect(storage.getItem.mock.calls.every(([key]) => key === COMPOSER_DRAFT_STORAGE_KEY)).toBe(
      true,
    );
    expect(values.has(COMPOSER_DRAFT_STORAGE_KEY)).toBe(true);
  });

  it("does not probe or import an old draft key", async () => {
    const oldKey = ["omnimind:composer-drafts:", "v1"].join("");
    const { storage, values } = await loadWithStorage({ [oldKey]: "old bytes" });
    expect(storage.getItem.mock.calls.every(([key]) => key === COMPOSER_DRAFT_STORAGE_KEY)).toBe(
      true,
    );
    expect(values.get(oldKey)).toBe("old bytes");
    expect(values.has(COMPOSER_DRAFT_STORAGE_KEY)).toBe(true);
  });

  it.each([
    JSON.stringify({ generation: 2, state: emptyState }),
    JSON.stringify({ generation: 1, state: { ...emptyState, unknownField: true } }),
  ])("refuses an invalid current envelope without rewriting it", async (raw) => {
    const values = new Map([[COMPOSER_DRAFT_STORAGE_KEY, raw]]);
    const storage = {
      getItem: vi.fn((name: string) => values.get(name) ?? null),
      setItem: vi.fn((name: string, value: string) => values.set(name, value)),
      removeItem: vi.fn((name: string) => values.delete(name)),
    };
    vi.stubGlobal("localStorage", storage);
    vi.resetModules();
    const module = await import("./composerDraftStore");
    const generationStorage = module.useComposerDraftStore.persist.getOptions().storage as {
      readonly getItem: (name: string) => unknown;
    };
    expect(() => generationStorage.getItem(COMPOSER_DRAFT_STORAGE_KEY)).toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(values.get(COMPOSER_DRAFT_STORAGE_KEY)).toBe(raw);
  });
});

describe("composerDraftStore restored source proposed plan", () => {
  const threadId = ThreadId.makeUnsafe("thread-restored-source");

  beforeEach(() => {
    resetComposerDraftStore();
  });

  it("persists restored plan source metadata with composer drafts", () => {
    const restoredSource = {
      threadId,
      restoredPrompt: "Implement the accepted plan",
      sourceProposedPlan: {
        threadId,
        planId: "plan-restored-source",
      },
    };
    const store = useComposerDraftStore.getState();

    store.setPrompt(threadId, restoredSource.restoredPrompt);
    store.setRestoredSourceProposedPlan(threadId, restoredSource);

    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        partialize: (state: ReturnType<typeof useComposerDraftStore.getState>) => unknown;
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const persistedState = partializeComposerDraftStoreState(
      useComposerDraftStore.getState(),
    ) as unknown as {
      draftsByThreadId?: Record<
        string,
        {
          restoredSourceProposedPlan?: unknown;
        }
      >;
    };

    expect(persistedState.draftsByThreadId?.[threadId]?.restoredSourceProposedPlan).toEqual(
      restoredSource,
    );

    const mergedState = persistApi
      .getOptions()
      .merge(persistedState, useComposerDraftStore.getInitialState());

    expect(mergedState.draftsByThreadId[threadId]?.restoredSourceProposedPlan).toEqual(
      restoredSource,
    );
  });
});

describe("composerDraftStore provider references", () => {
  const threadId = ThreadId.makeUnsafe("thread-provider-refs");

  beforeEach(() => {
    resetComposerDraftStore();
  });

  it("persists selected plugin mentions with regular composer drafts", () => {
    const selectedSkill = { name: "check-code", path: "/skills/check-code" };
    const selectedMention = { name: "linear", path: "plugin://linear" };
    const store = useComposerDraftStore.getState();

    store.setPrompt(threadId, "Use @linear with /check-code");
    store.setSkills(threadId, [selectedSkill]);
    store.setMentions(threadId, [selectedMention]);

    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        partialize: (state: ReturnType<typeof useComposerDraftStore.getState>) => unknown;
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const persistedState = partializeComposerDraftStoreState(
      useComposerDraftStore.getState(),
    ) as unknown as {
      draftsByThreadId?: Record<
        string,
        {
          skills?: Array<Record<string, unknown>>;
          mentions?: Array<Record<string, unknown>>;
        }
      >;
    };

    expect(persistedState.draftsByThreadId?.[threadId]?.skills).toEqual([selectedSkill]);
    expect(persistedState.draftsByThreadId?.[threadId]?.mentions).toEqual([selectedMention]);

    const mergedState = persistApi
      .getOptions()
      .merge(persistedState, useComposerDraftStore.getInitialState());

    expect(mergedState.draftsByThreadId[threadId]?.skills).toEqual([selectedSkill]);
    expect(mergedState.draftsByThreadId[threadId]?.mentions).toEqual([selectedMention]);
  });
});

describe("composerDraftStore terminal contexts", () => {
  const threadId = ThreadId.makeUnsafe("thread-dedupe");

  beforeEach(() => {
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
      stickyModelSelectionByProvider: {},
      stickyActiveProvider: null,
    });
  });

  it("deduplicates identical terminal contexts by selection signature", () => {
    const first = makeTerminalContext({ id: "ctx-1" });
    const duplicate = makeTerminalContext({ id: "ctx-2" });

    useComposerDraftStore.getState().addTerminalContexts(threadId, [first, duplicate]);

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.terminalContexts.map((context) => context.id)).toEqual(["ctx-1"]);
  });

  it("clears terminal contexts when clearing composer content", () => {
    useComposerDraftStore
      .getState()
      .addTerminalContext(threadId, makeTerminalContext({ id: "ctx-1" }));

    useComposerDraftStore.getState().clearComposerContent(threadId);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });

  it("inserts terminal contexts at the requested inline prompt position", () => {
    const firstInsertion = insertInlineTerminalContextPlaceholder("alpha beta", 6);
    const secondInsertion = insertInlineTerminalContextPlaceholder(firstInsertion.prompt, 0);

    expect(
      useComposerDraftStore
        .getState()
        .insertTerminalContext(
          threadId,
          firstInsertion.prompt,
          makeTerminalContext({ id: "ctx-1" }),
          firstInsertion.contextIndex,
        ),
    ).toBe(true);
    expect(
      useComposerDraftStore.getState().insertTerminalContext(
        threadId,
        secondInsertion.prompt,
        makeTerminalContext({
          id: "ctx-2",
          terminalLabel: "Terminal 2",
          lineStart: 9,
          lineEnd: 10,
        }),
        secondInsertion.contextIndex,
      ),
    ).toBe(true);

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.prompt).toBe(
      `${INLINE_TERMINAL_CONTEXT_PLACEHOLDER} alpha ${INLINE_TERMINAL_CONTEXT_PLACEHOLDER} beta`,
    );
    expect(draft?.terminalContexts.map((context) => context.id)).toEqual(["ctx-2", "ctx-1"]);
  });

  it("omits terminal context text from persisted drafts", () => {
    useComposerDraftStore
      .getState()
      .addTerminalContext(threadId, makeTerminalContext({ id: "ctx-persist" }));

    const persistedState = partializeComposerDraftStoreState(
      useComposerDraftStore.getState(),
    ) as unknown as {
      draftsByThreadId?: Record<string, { terminalContexts?: Array<Record<string, unknown>> }>;
    };

    expect(
      persistedState.draftsByThreadId?.[threadId]?.terminalContexts?.[0],
      "Expected terminal context metadata to be persisted.",
    ).toMatchObject({
      id: "ctx-persist",
      terminalId: "default",
      terminalLabel: "Terminal 1",
      lineStart: 4,
      lineEnd: 5,
    });
    expect(
      persistedState.draftsByThreadId?.[threadId]?.terminalContexts?.[0]?.text,
    ).toBeUndefined();
  });

  it("hydrates persisted terminal contexts without in-memory snapshot text", () => {
    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const mergedState = persistApi.getOptions().merge(
      {
        draftsByThreadId: {
          [threadId]: {
            prompt: INLINE_TERMINAL_CONTEXT_PLACEHOLDER,
            attachments: [],
            terminalContexts: [
              {
                id: "ctx-rehydrated",
                threadId,
                createdAt: "2026-03-13T12:00:00.000Z",
                terminalId: "default",
                terminalLabel: "Terminal 1",
                lineStart: 4,
                lineEnd: 5,
              },
            ],
          },
        },
        draftThreadsByThreadId: {},
        projectDraftThreadIdByProjectId: {},
        stickyModelSelectionByProvider: {},
        stickyActiveProvider: null,
      },
      useComposerDraftStore.getInitialState(),
    );

    expect(mergedState.draftsByThreadId[threadId]?.terminalContexts).toMatchObject([
      {
        id: "ctx-rehydrated",
        terminalId: "default",
        terminalLabel: "Terminal 1",
        lineStart: 4,
        lineEnd: 5,
        text: "",
      },
    ]);
  });

  it("refuses malformed persisted drafts during merge", () => {
    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    expect(() =>
      persistApi.getOptions().merge(
        {
          draftsByThreadId: {
            [threadId]: {
              prompt: "",
              attachments: "not-an-array",
              terminalContexts: "not-an-array",
            },
          },
          draftThreadsByThreadId: {},
          projectDraftThreadIdByProjectId: {},
        },
        useComposerDraftStore.getInitialState(),
      ),
    ).toThrow();
  });

  it("restores provider-scoped selections without leaking effort across providers", () => {
    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const codexSelection = modelSelection("codex", "gpt-5.6-sol", {
      reasoningEffort: "ultra",
    });
    const cursorSelection = modelSelection("cursor", "cursor-auto", {
      reasoningEffort: "high",
    });
    const mergedState = persistApi.getOptions().merge(
      {
        draftsByThreadId: {
          [threadId]: {
            prompt: "",
            attachments: [],
            modelSelectionByProvider: {
              codex: codexSelection,
              cursor: cursorSelection,
            },
            activeProvider: "cursor",
          },
        },
        draftThreadsByThreadId: {},
        projectDraftThreadIdByProjectId: {},
        stickyModelSelectionByProvider: {},
        stickyActiveProvider: null,
      },
      useComposerDraftStore.getInitialState(),
    );

    const draft = mergedState.draftsByThreadId[threadId];
    expect(draft?.modelSelectionByProvider.codex).toEqual(codexSelection);
    expect(draft?.modelSelectionByProvider.cursor).toEqual(cursorSelection);
    expect(draft?.activeProvider).toBe("cursor");
  });
});

describe("composerDraftStore queued follow-ups", () => {
  const threadId = ThreadId.makeUnsafe("thread-queue");
  let originalRevokeObjectUrl: typeof URL.revokeObjectURL;
  let revokeSpy: ReturnType<typeof vi.fn<(url: string) => void>>;

  beforeEach(() => {
    resetComposerDraftStore();
    originalRevokeObjectUrl = URL.revokeObjectURL;
    revokeSpy = vi.fn();
    URL.revokeObjectURL = revokeSpy;
  });

  afterEach(() => {
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it("stores queued turns per thread so route switches can rehydrate them", () => {
    const store = useComposerDraftStore.getState();

    store.enqueueQueuedTurn(threadId, makeQueuedTurn("queued-1"));

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.queuedTurns).toEqual([
      makeQueuedTurn("queued-1"),
    ]);
  });

  it("keeps queued turns when the live composer draft is cleared", () => {
    const store = useComposerDraftStore.getState();

    store.setPrompt(threadId, "temporary prompt");
    store.setSkills(threadId, [{ name: "check-code", path: "/skills/check-code" }]);
    store.setMentions(threadId, [{ name: "linear", path: "plugin://linear" }]);
    store.enqueueQueuedTurn(threadId, makeQueuedTurn("queued-1"));
    store.clearComposerContent(threadId);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toMatchObject({
      prompt: "",
      skills: [],
      mentions: [],
      queuedTurns: [makeQueuedTurn("queued-1")],
    });
  });

  it("drops the draft entry once the last queued turn is removed", () => {
    const store = useComposerDraftStore.getState();

    store.enqueueQueuedTurn(threadId, makeQueuedTurn("queued-1"));
    store.removeQueuedTurn(threadId, "queued-1");

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });

  it("persists queued chat turns for refresh and restart rehydration", () => {
    const queuedImage = makeImage({
      id: "queued-image-persisted",
      previewUrl: "data:image/png;base64,AA==",
      name: "queued.png",
    });
    const store = useComposerDraftStore.getState();
    store.enqueueQueuedTurn(threadId, makeQueuedChatTurn("queued-chat-1", queuedImage));

    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        partialize: (state: ReturnType<typeof useComposerDraftStore.getState>) => unknown;
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const persistedState = partializeComposerDraftStoreState(
      useComposerDraftStore.getState(),
    ) as unknown as {
      draftsByThreadId?: Record<string, { queuedTurns?: Array<Record<string, unknown>> }>;
    };

    expect(persistedState.draftsByThreadId?.[threadId]?.queuedTurns).toHaveLength(1);

    const mergedState = persistApi
      .getOptions()
      .merge(persistedState, useComposerDraftStore.getInitialState());

    expect(mergedState.draftsByThreadId[threadId]?.queuedTurns).toMatchObject([
      {
        id: "queued-chat-1",
        kind: "chat",
        prompt: "queued chat prompt",
        images: [{ name: "queued.png" }],
        sourceProposedPlan: {
          threadId: "thread-source-plan",
          planId: "plan-1",
        },
        terminalContexts: [{ text: "git status\nOn branch main" }],
      },
    ]);
  });

  it("persists restored proposed-plan source for edited queued sends", () => {
    const store = useComposerDraftStore.getState();
    store.setPrompt(threadId, "implement the queued plan");
    store.setRestoredSourceProposedPlan(threadId, {
      threadId,
      restoredPrompt: "implement the queued plan",
      sourceProposedPlan: {
        threadId: ThreadId.makeUnsafe("thread-source-plan"),
        planId: "plan-1",
      },
    });

    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        partialize: (state: ReturnType<typeof useComposerDraftStore.getState>) => unknown;
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const persistedState = partializeComposerDraftStoreState(
      useComposerDraftStore.getState(),
    ) as unknown as {
      draftsByThreadId?: Record<string, { restoredSourceProposedPlan?: unknown }>;
    };

    expect(persistedState.draftsByThreadId?.[threadId]?.restoredSourceProposedPlan).toEqual({
      threadId,
      restoredPrompt: "implement the queued plan",
      sourceProposedPlan: {
        threadId: "thread-source-plan",
        planId: "plan-1",
      },
    });

    const mergedState = persistApi
      .getOptions()
      .merge(persistedState, useComposerDraftStore.getInitialState());

    expect(mergedState.draftsByThreadId[threadId]?.restoredSourceProposedPlan).toEqual({
      threadId,
      restoredPrompt: "implement the queued plan",
      sourceProposedPlan: {
        threadId: "thread-source-plan",
        planId: "plan-1",
      },
    });
  });

  it("revokes queued chat image blob URLs when a queued turn is removed", () => {
    const queuedImage = makeImage({
      id: "queued-image-blob",
      previewUrl: "blob:queued-image-blob",
    });
    const store = useComposerDraftStore.getState();

    store.enqueueQueuedTurn(threadId, makeQueuedChatTurn("queued-chat-blob", queuedImage));
    store.removeQueuedTurn(threadId, "queued-chat-blob");

    expect(revokeSpy).toHaveBeenCalledWith("blob:queued-image-blob");
  });

  it("revokes queued chat image blob URLs when a draft thread is cleared", () => {
    const queuedImage = makeImage({
      id: "queued-image-thread-clear",
      previewUrl: "blob:queued-image-thread-clear",
    });
    const store = useComposerDraftStore.getState();

    store.setProjectDraftThreadId(ProjectId.makeUnsafe("queue-project"), threadId);
    store.enqueueQueuedTurn(threadId, makeQueuedChatTurn("queued-chat-thread-clear", queuedImage));
    store.clearDraftThread(threadId);

    expect(revokeSpy).toHaveBeenCalledWith("blob:queued-image-thread-clear");
  });
});

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((name: string) => store.get(name) ?? null),
    setItem: vi.fn((name: string, value: string) => {
      store.set(name, value);
    }),
    removeItem: vi.fn((name: string) => {
      store.delete(name);
    }),
  };
}

describe("createDeferredPersistStorage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defers partialize + JSON.stringify off the set() path until flush", () => {
    const base = createMockStorage();
    const partialize = vi.fn((state: { readonly value: number }) => ({ value: state.value }));
    const storage = createDeferredPersistStorage<{ readonly value: number }>({
      getStorage: () => base,
      partialize,
    });

    // Rapid set()s must not serialize: neither partialize nor the base write runs.
    storage.setItem("key", { state: { value: 1 }, version: 2 });
    storage.setItem("key", { state: { value: 2 }, version: 2 });
    storage.setItem("key", { state: { value: 3 }, version: 2 });
    expect(partialize).not.toHaveBeenCalled();
    expect(base.setItem).not.toHaveBeenCalled();

    storage.flush();

    // Serialization happens exactly once, over the latest captured state.
    expect(partialize).toHaveBeenCalledTimes(1);
    expect(partialize).toHaveBeenCalledWith({ value: 3 });
    expect(base.setItem).toHaveBeenCalledTimes(1);
    expect(base.setItem).toHaveBeenCalledWith(
      "key",
      JSON.stringify({ state: { value: 3 }, version: 2 }),
    );
  });

  it("produces the same bytes as createJSONStorage would for the same state", () => {
    const base = createMockStorage();
    type FullState = { readonly a: number; readonly secret: string };
    const storage = createDeferredPersistStorage<FullState, { readonly a: number }>({
      getStorage: () => base,
      partialize: (state) => ({ a: state.a }),
    });

    // zustand passes the full state as value.state at runtime (no config partialize).
    const fullState: FullState = { a: 7, secret: "drop" };
    storage.setItem("key", { state: fullState, version: 5 });
    storage.flush();

    // Identical to createJSONStorage(setItem)(name, JSON.stringify({ state: partialize(s), version })).
    expect(base.setItem).toHaveBeenCalledWith(
      "key",
      JSON.stringify({ state: { a: 7 }, version: 5 }),
    );
  });

  it("also writes the pending value when the debounce fires on its own", () => {
    const base = createMockStorage();
    const partialize = vi.fn((state: { readonly value: number }) => state);
    const storage = createDeferredPersistStorage<{ readonly value: number }>({
      getStorage: () => base,
      partialize,
    });

    storage.setItem("key", { state: { value: 1 }, version: 1 });
    expect(base.setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(partialize).toHaveBeenCalledTimes(1);
    expect(base.setItem).toHaveBeenCalledTimes(1);
  });

  it("removeItem cancels a pending write and drops the captured state", () => {
    const base = createMockStorage();
    const partialize = vi.fn((state: { readonly value: number }) => state);
    const storage = createDeferredPersistStorage<{ readonly value: number }>({
      getStorage: () => base,
      partialize,
    });

    storage.setItem("key", { state: { value: 1 }, version: 1 });
    storage.removeItem("key");
    storage.flush();

    expect(partialize).not.toHaveBeenCalled();
    expect(base.setItem).not.toHaveBeenCalled();
    expect(base.removeItem).toHaveBeenCalledWith("key");
  });
});

describe("flushStorageBeforePageHide", () => {
  function makeFakeEnv() {
    const windowListeners = new Map<string, () => void>();
    const documentListeners = new Map<string, () => void>();
    const visibility = { value: "visible" };
    return {
      env: {
        window: {
          addEventListener: (type: string, listener: () => void) => {
            windowListeners.set(type, listener);
          },
        },
        document: {
          addEventListener: (type: string, listener: () => void) => {
            documentListeners.set(type, listener);
          },
          get visibilityState() {
            return visibility.value;
          },
        },
      },
      fireWindow: (type: string) => windowListeners.get(type)?.(),
      fireDocument: (type: string) => documentListeners.get(type)?.(),
      setVisibility: (value: string) => {
        visibility.value = value;
      },
    };
  }

  it("flushes on pagehide, beforeunload, and visibilitychange->hidden", () => {
    const flush = vi.fn();
    const harness = makeFakeEnv();
    flushStorageBeforePageHide(flush, harness.env);

    harness.fireWindow("pagehide");
    expect(flush).toHaveBeenCalledTimes(1);

    harness.fireWindow("beforeunload");
    expect(flush).toHaveBeenCalledTimes(2);

    harness.setVisibility("hidden");
    harness.fireDocument("visibilitychange");
    expect(flush).toHaveBeenCalledTimes(3);
  });

  it("does not flush while the document stays visible", () => {
    const flush = vi.fn();
    const harness = makeFakeEnv();
    flushStorageBeforePageHide(flush, harness.env);

    harness.setVisibility("visible");
    harness.fireDocument("visibilitychange");
    expect(flush).not.toHaveBeenCalled();
  });
});
