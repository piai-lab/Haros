import {
  CommandId,
  MessageId,
  OrchestrationProposedPlanId,
  ProjectId,
  ThreadId,
} from "@omnimind/contracts";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  partializeComposerDraftStoreState,
  useComposerDraftStore,
  type PendingDirectTurnRecovery,
} from "./composerDraftStore";
import { normalizeCurrentPersistedComposerDraftStoreState } from "./composerDraftPersistence";
import {
  makeImage,
  makeFile,
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

const localStorageFixture = vi.hoisted(() => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (name: string) => values.get(name) ?? null,
      setItem: (name: string, value: string) => values.set(name, value),
      removeItem: (name: string) => values.delete(name),
    },
  });
  return { original };
});

afterAll(() => {
  if (localStorageFixture.original === undefined) {
    Reflect.deleteProperty(globalThis, "localStorage");
  } else {
    Object.defineProperty(globalThis, "localStorage", localStorageFixture.original);
  }
});

function makePendingDirectTurnRecovery(
  id: string,
  options?: { image?: ReturnType<typeof makeImage>; file?: ReturnType<typeof makeFile> },
): PendingDirectTurnRecovery {
  const queuedTurn = makeQueuedChatTurn(`recovery-${id}`, options?.image);
  if (queuedTurn.kind !== "chat") throw new Error("Expected a chat turn fixture");
  if (options?.file) queuedTurn.files = [options.file];
  queuedTurn.prompt = `recover ${id}`;
  return {
    recoveryId: CommandId.makeUnsafe(`recovery-${id}`),
    commandId: CommandId.makeUnsafe(`command-${id}`),
    messageId: MessageId.makeUnsafe(`message-${id}`),
    previousBinding: {
      modelSelection: modelSelection("codex", "gpt-5"),
      runtimeMode: "full-access",
      interactionMode: "default",
    },
    targetBinding: {
      modelSelection: modelSelection("omnimind", "gateway/model"),
      runtimeMode: "auto",
      interactionMode: "plan",
    },
    queuedTurn,
    persistedImageAttachments: options?.image
      ? [
          {
            id: options.image.id,
            name: options.image.name,
            mimeType: options.image.mimeType,
            sizeBytes: options.image.sizeBytes,
            blobKey: `composer-image/thread-recovery/${options.image.id}`,
          },
        ]
      : [],
    binaryAttachments: [
      ...(options?.image
        ? [
            {
              type: "image" as const,
              name: options.image.name,
              mimeType: options.image.mimeType,
              sizeBytes: options.image.sizeBytes,
            },
          ]
        : []),
      ...(options?.file
        ? [
            {
              type: "file" as const,
              name: options.file.name,
              mimeType: options.file.mimeType,
              sizeBytes: options.file.sizeBytes,
            },
          ]
        : []),
    ],
    contentSuperseded: false,
    bindingSuperseded: false,
  };
}

describe("composerDraftStore persisted-state hydration", () => {
  it("normalizes null and empty persisted states", () => {
    const emptyState = {
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
      stickyModelSelectionByProvider: {},
      stickyActiveProvider: null,
    };

    expect(normalizeCurrentPersistedComposerDraftStoreState(null)).toEqual(emptyState);
    expect(normalizeCurrentPersistedComposerDraftStoreState({})).toEqual(emptyState);
  });

  it("hydrates project mappings, defaults, and persisted selections", () => {
    const projectId = ProjectId.makeUnsafe("project-hydration");
    const threadId = ThreadId.makeUnsafe("thread-hydration");
    const mappingKey = `${projectId}::terminal`;

    const hydrated = normalizeCurrentPersistedComposerDraftStoreState({
      draftsByThreadId: {
        [threadId]: {
          prompt: "Review these selections",
          attachments: [],
          assistantSelections: [
            {
              id: "assistant-selection-1",
              assistantMessageId: " assistant-message-1 ",
              text: " selected assistant text ",
            },
          ],
          fileComments: [
            {
              id: "file-comment-1",
              path: " src/example.ts ",
              startLine: 8,
              endLine: 4,
              text: " selected file text ",
            },
          ],
        },
      },
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: { [mappingKey]: threadId },
    });

    expect(hydrated.projectDraftThreadIdByProjectId).toEqual({ [mappingKey]: threadId });
    expect(hydrated.draftThreadsByThreadId[threadId]).toMatchObject({
      projectId,
      runtimeMode: "full-access",
      interactionMode: "default",
      entryPoint: "terminal",
    });
    expect(hydrated.draftsByThreadId[threadId]?.assistantSelections).toEqual([
      {
        id: "assistant-selection-1",
        assistantMessageId: "assistant-message-1",
        text: "selected assistant text",
      },
    ]);
    expect(hydrated.draftsByThreadId[threadId]?.fileComments).toEqual([
      {
        id: "file-comment-1",
        path: "src/example.ts",
        startLine: 8,
        endLine: 8,
        text: "selected file text",
      },
    ]);
  });

  it("preserves AI-reviewed auto mode during hydration", () => {
    const projectId = ProjectId.makeUnsafe("project-auto-mode");
    const threadId = ThreadId.makeUnsafe("thread-auto-mode");

    const hydrated = normalizeCurrentPersistedComposerDraftStoreState({
      draftsByThreadId: {
        [threadId]: {
          prompt: "",
          attachments: [],
          runtimeMode: "auto",
        },
      },
      draftThreadsByThreadId: {
        [threadId]: {
          projectId,
          title: "Local Pi terminal",
          createdAt: "2026-07-25T00:00:00.000Z",
          runtimeMode: "auto",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          workingDirectory: null,
          envMode: "local",
        },
      },
      projectDraftThreadIdByProjectId: {},
    });

    expect(hydrated.draftsByThreadId[threadId]?.runtimeMode).toBe("auto");
    expect(hydrated.draftThreadsByThreadId[threadId]?.runtimeMode).toBe("auto");
    expect(hydrated.draftThreadsByThreadId[threadId]?.title).toBe("Local Pi terminal");
  });

  it("preserves Debug mode in composer and draft-thread state during hydration", () => {
    const projectId = ProjectId.makeUnsafe("project-debug-mode");
    const threadId = ThreadId.makeUnsafe("thread-debug-mode");

    const hydrated = normalizeCurrentPersistedComposerDraftStoreState({
      draftsByThreadId: {
        [threadId]: {
          prompt: "Reproduce the crash",
          attachments: [],
          interactionMode: "debug",
        },
      },
      draftThreadsByThreadId: {
        [threadId]: {
          projectId,
          createdAt: "2026-08-11T00:00:00.000Z",
          runtimeMode: "approval-required",
          interactionMode: "debug",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          workingDirectory: null,
          envMode: "local",
        },
      },
      projectDraftThreadIdByProjectId: {},
    });

    expect(hydrated.draftsByThreadId[threadId]?.interactionMode).toBe("debug");
    expect(hydrated.draftThreadsByThreadId[threadId]?.interactionMode).toBe("debug");
  });

  it("preserves a staged goal in draft-thread state during hydration and drops blank ones", () => {
    const projectId = ProjectId.makeUnsafe("project-goal");
    const threadId = ThreadId.makeUnsafe("thread-goal");
    const blankGoalThreadId = ThreadId.makeUnsafe("thread-goal-blank");

    const hydrated = normalizeCurrentPersistedComposerDraftStoreState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {
        [threadId]: {
          projectId,
          createdAt: "2026-08-13T00:00:00.000Z",
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          workingDirectory: null,
          envMode: "local",
          goal: "clean the directory and build a snake game",
        },
        [blankGoalThreadId]: {
          projectId,
          createdAt: "2026-08-13T00:00:00.000Z",
          runtimeMode: "full-access",
          interactionMode: "default",
          entryPoint: "chat",
          branch: null,
          worktreePath: null,
          workingDirectory: null,
          envMode: "local",
          goal: "   ",
        },
      },
      projectDraftThreadIdByProjectId: {},
    });

    expect(hydrated.draftThreadsByThreadId[threadId]?.goal).toBe(
      "clean the directory and build a snake game",
    );
    expect(hydrated.draftThreadsByThreadId[blankGoalThreadId]?.goal).toBeUndefined();
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
        planId: OrchestrationProposedPlanId.makeUnsafe("plan-restored-source"),
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

  it("sanitizes malformed persisted drafts during merge", () => {
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
            prompt: "",
            attachments: "not-an-array",
            terminalContexts: "not-an-array",
            provider: "bogus-provider",
            modelOptions: "not-an-object",
          },
        },
        draftThreadsByThreadId: "not-an-object",
        projectDraftThreadIdByProjectId: "not-an-object",
      },
      useComposerDraftStore.getInitialState(),
    );

    expect(mergedState.draftsByThreadId[threadId]).toBeUndefined();
    expect(mergedState.draftThreadsByThreadId).toEqual({});
    expect(mergedState.projectDraftThreadIdByProjectId).toEqual({});
  });

  it("drops unsupported restored Grok reasoning efforts from legacy draft storage", () => {
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
            provider: "grok",
            model: "grok-build",
            modelOptions: {
              grok: {
                reasoningEffort: "xhigh",
              },
            },
          },
        },
        draftThreadsByThreadId: {},
        projectDraftThreadIdByProjectId: {},
      },
      useComposerDraftStore.getInitialState(),
    );

    expect(mergedState.draftsByThreadId[threadId]?.modelSelectionByProvider.grok).toEqual(
      modelSelection("grok", "grok-build"),
    );
  });

  it("trims a runtime-discovered Codex effort from legacy draft storage", () => {
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
            provider: "codex",
            model: "gpt-5.6-sol",
            effort: "  ultra  ",
          },
        },
        draftThreadsByThreadId: {},
        projectDraftThreadIdByProjectId: {},
      },
      useComposerDraftStore.getInitialState(),
    );

    expect(mergedState.draftsByThreadId[threadId]?.modelSelectionByProvider.codex).toEqual(
      modelSelection("codex", "gpt-5.6-sol", { reasoningEffort: "ultra" }),
    );
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
            modelSelectionByProvider: {
              codex: codexSelection,
              cursor: cursorSelection,
            },
            activeProvider: "cursor",
          },
        },
        draftThreadsByThreadId: {},
        projectDraftThreadIdByProjectId: {},
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
    const queuedChatTurn = makeQueuedChatTurn("queued-chat-1", queuedImage);
    if (queuedChatTurn.kind !== "chat") {
      throw new Error("Expected a queued chat turn fixture");
    }
    store.enqueueQueuedTurn(threadId, {
      ...queuedChatTurn,
      interactionMode: "debug",
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
        interactionMode: "debug",
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

describe("composerDraftStore direct turn recovery", () => {
  const threadId = ThreadId.makeUnsafe("thread-direct-recovery");

  beforeEach(() => {
    resetComposerDraftStore();
  });

  it("arms and clears the visible Composer atomically without changing Queue", () => {
    const store = useComposerDraftStore.getState();
    store.setPrompt(threadId, "visible prompt");
    store.enqueueQueuedTurn(threadId, makeQueuedTurn("queued-unchanged"));

    const recovery = makePendingDirectTurnRecovery("arm");
    store.armPendingDirectTurnRecovery(threadId, recovery);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toMatchObject({
      prompt: "",
      queuedTurns: [{ id: "queued-unchanged" }],
      pendingDirectTurnRecovery: {
        recoveryId: recovery.recoveryId,
        queuedTurn: { prompt: "recover arm" },
      },
    });
  });

  it("persists the recovery snapshot without File bytes or preview URLs and rehydrates it", () => {
    const image = makeImage({ id: "recovery-image", previewUrl: "blob:recovery-image" });
    const file = makeFile({ id: "recovery-file", sizeBytes: 7 });
    const recovery = makePendingDirectTurnRecovery("restart", { image, file });
    useComposerDraftStore.getState().armPendingDirectTurnRecovery(threadId, recovery);

    const persistedState = partializeComposerDraftStoreState(useComposerDraftStore.getState());
    const serialized = JSON.stringify(persistedState);
    expect(serialized).not.toContain("blob:recovery-image");
    expect(serialized).toContain(file.name);
    const persistedRecovery = persistedState.draftsByThreadId[threadId]
      ?.pendingDirectTurnRecovery as { queuedTurn?: { files?: unknown } } | undefined;
    expect(persistedRecovery?.queuedTurn?.files).toBeUndefined();

    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const merged = persistApi
      .getOptions()
      .merge(persistedState, useComposerDraftStore.getInitialState());
    const hydrated = merged.draftsByThreadId[threadId]?.pendingDirectTurnRecovery;

    expect(hydrated).toMatchObject({
      recoveryId: recovery.recoveryId,
      commandId: recovery.commandId,
      messageId: recovery.messageId,
      queuedTurn: {
        prompt: "recover restart",
        images: [],
        files: [],
        terminalContexts: [{ text: "git status\nOn branch main" }],
      },
      binaryAttachments: [
        { type: "image", name: image.name, sizeBytes: image.sizeBytes },
        { type: "file", name: file.name, sizeBytes: file.sizeBytes },
      ],
    });
  });

  it("drops a malformed recovery marker without poisoning the remaining draft", () => {
    const normalized = normalizeCurrentPersistedComposerDraftStoreState({
      draftsByThreadId: {
        [threadId]: {
          prompt: "keep me",
          attachments: [],
          pendingDirectTurnRecovery: {
            recoveryId: "",
            commandId: "bad",
            messageId: "bad",
          },
        },
      },
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });

    expect(normalized.draftsByThreadId[threadId]).toMatchObject({ prompt: "keep me" });
    expect(normalized.draftsByThreadId[threadId]?.pendingDirectTurnRecovery).toBeUndefined();
  });

  it("marks content and binding ABA changes monotonically across component lifetimes", () => {
    const recovery = makePendingDirectTurnRecovery("aba");
    const store = useComposerDraftStore.getState();
    store.armPendingDirectTurnRecovery(threadId, recovery);
    store.setPrompt(threadId, "newer intent");
    store.setPrompt(threadId, "");
    store.setModelSelection(threadId, recovery.previousBinding.modelSelection);
    store.setModelSelection(threadId, recovery.targetBinding.modelSelection);

    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.pendingDirectTurnRecovery,
    ).toMatchObject({
      recoveryId: recovery.recoveryId,
      contentSuperseded: true,
      bindingSuperseded: true,
    });
  });

  it("prevents an older recovery from clearing or taking a replacement marker", () => {
    const first = makePendingDirectTurnRecovery("r1");
    const second = makePendingDirectTurnRecovery("r2");
    const store = useComposerDraftStore.getState();
    store.armPendingDirectTurnRecovery(threadId, first);
    store.armPendingDirectTurnRecovery(threadId, second);

    expect(store.clearPendingDirectTurnRecovery(threadId, first.recoveryId)).toBe(false);
    expect(store.takePendingDirectTurnRecovery(threadId, first.recoveryId)).toBeNull();
    expect(
      useComposerDraftStore.getState().draftsByThreadId[threadId]?.pendingDirectTurnRecovery
        ?.recoveryId,
    ).toBe(second.recoveryId);
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

  it("ignores partial DOM targets without event listeners", () => {
    const flush = vi.fn();

    expect(() =>
      flushStorageBeforePageHide(flush, {
        window: {},
        document: { visibilityState: "visible" },
      }),
    ).not.toThrow();
    expect(flush).not.toHaveBeenCalled();
  });
});
