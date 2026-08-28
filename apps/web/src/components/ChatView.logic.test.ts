import {
  CheckpointRef,
  EventId,
  MessageId,
  ThreadId,
  TurnId,
  type GitWorktreeSetupProgressEvent,
  type EngineSelection,
  type ModelSlug,
  type RuntimeMode,
} from "@harnessos/contracts";
import { describe, expect, it, vi } from "vitest";

import type { WorkLogEntry } from "../session-logic";
import type { ThreadSession } from "../types";
import { createEmptyThreadDraft } from "../composerDraftDomain";

import {
  appendVoiceTranscriptToPrompt,
  awaitTurnPreparationWithWorktreeResolution,
  buildComposerMenuSelectionKey,
  buildTranscriptAutoFollowSignal,
  buildTranscriptTailKey,
  createRuntimeModePersistenceQueue,
  desiredBindingCanPersistWithoutActiveSession,
  persistEngineSelectionBeforeRuntimeMode,
  createLocalDispatchSnapshot,
  createWorktreeSetupResolution,
  createWorktreeSetupSnapshot,
  derivePromptHistoryFromMessages,
  failWorktreeSetupSnapshot,
  filterSidechatTranscriptMessages,
  hasFileUndoSettled,
  isComposerCursorOnFirstLine,
  isComposerCursorOnLastLine,
  type LocalDispatchSnapshot,
  promptStillMatchesActiveHistoryBrowse,
  resolvePromptHistoryNavigation,
  resolveTurnStartRecoveryDisposition,
  resolveNextLocalDispatchSnapshot,
  deriveComposerSendState,
  deriveComposerVoiceState,
  describeVoiceRecordingStartError,
  hasLiveTurnTakenOver,
  hasServerAcknowledgedLocalDispatch,
  isVoiceAuthExpiredMessage,
  LOCAL_DISPATCH_TURN_TAKEOVER_TIMEOUT_MS,
  resolveActiveThreadTitle,
  resolveActiveTurnLiveDiffState,
  resolveCommittedProviderModel,
  resolveComposerStripWorkLogEntries,
  resolveCycledModelSlug,
  resolveEnvironmentPanelVisible,
  resolveGitRepoUiState,
  resolveSettledThreadBranchMismatch,
  resolveProjectScriptTerminalTarget,
  resolveQueuedSteerGateTransition,
  resolveRuntimeModeAfterApprovalDecision,
  resolveThreadDetailHydration,
  resolveThreadArtifactWorkspaceRoot,
  runWorktreeCreationFlow,
  WorktreeSetupCancelledError,
  QUEUED_STEER_GATE_TIMEOUT_MS,
  sanitizeVoiceErrorMessage,
  buildExpiredTerminalContextToastCopy,
  cleanupPreparedWorktreeBeforeTurn,
  dispatchExactCommandWithOneReplay,
  shouldAutoDeleteTerminalThreadOnLastClose,
  shouldConsumePendingCustomBinaryConfirmation,
  shouldEnableComposerPastedTextCollapse,
  shouldHandlePromptHistoryNavigationKey,
  shouldRenderEngineHealthBanner,
  shouldShowActiveThreadHeaderIdentity,
  shouldStartActiveTurnLayoutGrace,
  shouldRenderTerminalWorkspace,
  worktreeSetupHasError,
} from "./ChatView.logic";
import { resolvePendingDirectTurnRecoveryMutation } from "../composerDraftDomain";

describe("settled thread branch mismatch", () => {
  it("only describes a settled local thread on a different concrete branch", () => {
    expect(
      resolveSettledThreadBranchMismatch({
        isSettled: true,
        isLocalWorkspace: true,
        threadBranch: "feature/finished",
        currentBranch: "main",
      }),
    ).toEqual({ threadBranch: "feature/finished", currentBranch: "main" });

    for (const input of [
      { isSettled: false, isLocalWorkspace: true, threadBranch: "old", currentBranch: "main" },
      { isSettled: true, isLocalWorkspace: false, threadBranch: "old", currentBranch: "main" },
      { isSettled: true, isLocalWorkspace: true, threadBranch: "main", currentBranch: "main" },
      { isSettled: true, isLocalWorkspace: true, threadBranch: null, currentBranch: "main" },
      { isSettled: true, isLocalWorkspace: true, threadBranch: "old", currentBranch: null },
    ]) {
      expect(resolveSettledThreadBranchMismatch(input)).toBeNull();
    }
  });
});

describe("resolvePendingDirectTurnRecoveryMutation", () => {
  it("is monotonic for content and exact-binding intent changes", () => {
    const baseline = createEmptyThreadDraft();
    expect(resolvePendingDirectTurnRecoveryMutation(baseline, baseline)).toBe("none");

    const withAttachmentIntent = {
      ...baseline,
      files: [
        {
          type: "file" as const,
          id: "file-new-intent",
          name: "new-intent.txt",
          mimeType: "text/plain",
          sizeBytes: 1,
          file: new File(["x"], "new-intent.txt", { type: "text/plain" }),
        },
      ],
    };
    expect(resolvePendingDirectTurnRecoveryMutation(baseline, withAttachmentIntent)).toBe(
      "content",
    );

    const targetBinding = {
      ...baseline,
      activeEngine: "codex" as const,
      engineSelectionByEngine: {
        codex: { engine: "codex" as const, model: "gpt-5.4" },
      },
    };
    const newerBinding = {
      ...targetBinding,
      engineSelectionByEngine: {
        codex: { engine: "codex" as const, model: "gpt-5.5" },
      },
    };
    expect(resolvePendingDirectTurnRecoveryMutation(targetBinding, newerBinding)).toBe("binding");
  });
});

const ACTIVE_SESSION: ThreadSession = {
  engine: "codex",
  status: "ready",
  orchestrationStatus: "ready",
  createdAt: "2026-08-12T00:00:00.000Z",
  updatedAt: "2026-08-12T00:00:02.000Z",
};

const CODEX_BINDING: EngineSelection = {
  engine: "codex",
  model: "gpt-5.4",
};

const CLAUDE_BINDING: EngineSelection = {
  engine: "claude",
  model: "claude-sonnet-4-5",
};

const CROSS_PROVIDER_MESSAGE_ID = MessageId.makeUnsafe("cross-engine-message");

describe("turn-start recovery disposition", () => {
  const matchingFailure = [
    {
      kind: "engine.turn.start.failed",
      payload: { messageId: CROSS_PROVIDER_MESSAGE_ID, detail: "target failed" },
    },
  ];

  it("clears the snapshot when the target binding has committed", () => {
    expect(
      resolveTurnStartRecoveryDisposition({
        messageId: CROSS_PROVIDER_MESSAGE_ID,
        previousEngineSelection: CODEX_BINDING,
        previousRuntimeMode: "full-access",
        previousInteractionMode: "default",
        targetEngineSelection: CLAUDE_BINDING,
        targetRuntimeMode: "approval-required",
        targetInteractionMode: "default",
        threadEngineSelection: CLAUDE_BINDING,
        threadRuntimeMode: "approval-required",
        threadInteractionMode: "default",
        session: { engine: "claude", orchestrationStatus: "running" },
        activities: matchingFailure,
      }),
    ).toBe("target-committed");
  });

  it("does not recover from a failure for another message", () => {
    expect(
      resolveTurnStartRecoveryDisposition({
        messageId: CROSS_PROVIDER_MESSAGE_ID,
        previousEngineSelection: CODEX_BINDING,
        previousRuntimeMode: "full-access",
        previousInteractionMode: "default",
        targetEngineSelection: CLAUDE_BINDING,
        targetRuntimeMode: "approval-required",
        targetInteractionMode: "default",
        threadEngineSelection: CODEX_BINDING,
        threadRuntimeMode: "full-access",
        threadInteractionMode: "default",
        session: { engine: "codex", orchestrationStatus: "ready" },
        activities: [
          {
            kind: "engine.turn.start.failed",
            payload: { messageId: MessageId.makeUnsafe("another-message") },
          },
        ],
      }),
    ).toBe("pending");
  });

  it("recovers only after the exact failure and old ready binding are projected", () => {
    expect(
      resolveTurnStartRecoveryDisposition({
        messageId: CROSS_PROVIDER_MESSAGE_ID,
        previousEngineSelection: CODEX_BINDING,
        previousRuntimeMode: "full-access",
        previousInteractionMode: "default",
        targetEngineSelection: CLAUDE_BINDING,
        targetRuntimeMode: "approval-required",
        targetInteractionMode: "default",
        threadEngineSelection: CODEX_BINDING,
        threadRuntimeMode: "full-access",
        threadInteractionMode: "default",
        session: { engine: "codex", orchestrationStatus: "ready" },
        activities: matchingFailure,
      }),
    ).toBe("old-binding-restored");
  });

  it("reports terminal recovery so content can return without reviving the old binding", () => {
    expect(
      resolveTurnStartRecoveryDisposition({
        messageId: CROSS_PROVIDER_MESSAGE_ID,
        previousEngineSelection: CODEX_BINDING,
        previousRuntimeMode: "full-access",
        previousInteractionMode: "default",
        targetEngineSelection: CLAUDE_BINDING,
        targetRuntimeMode: "approval-required",
        targetInteractionMode: "default",
        threadEngineSelection: CODEX_BINDING,
        threadRuntimeMode: "full-access",
        threadInteractionMode: "default",
        session: { engine: "codex", orchestrationStatus: "error" },
        activities: matchingFailure,
      }),
    ).toBe("terminal-unrecovered");
  });

  it("waits for the complete target binding commit, including interaction mode", () => {
    expect(
      resolveTurnStartRecoveryDisposition({
        messageId: CROSS_PROVIDER_MESSAGE_ID,
        previousEngineSelection: CODEX_BINDING,
        previousRuntimeMode: "full-access",
        previousInteractionMode: "default",
        targetEngineSelection: CLAUDE_BINDING,
        targetRuntimeMode: "approval-required",
        targetInteractionMode: "plan",
        threadEngineSelection: CLAUDE_BINDING,
        threadRuntimeMode: "approval-required",
        threadInteractionMode: "default",
        session: { engine: "claude", orchestrationStatus: "running" },
        activities: [],
      }),
    ).toBe("pending");
  });
});

describe("desiredBindingCanPersistWithoutActiveSession", () => {
  it("accepts an exact durable binding only when no live Session exists", () => {
    expect(
      desiredBindingCanPersistWithoutActiveSession({
        desiredEngineSelection: CODEX_BINDING,
        serverEngineSelection: CODEX_BINDING,
        activeSession: null,
      }),
    ).toBe(true);
  });

  it("rejects a different desired Engine without a live Session", () => {
    expect(
      desiredBindingCanPersistWithoutActiveSession({
        desiredEngineSelection: { engine: "pi", model: "anthropic/claude-sonnet-4-5" },
        serverEngineSelection: CODEX_BINDING,
        activeSession: null,
      }),
    ).toBe(false);
  });

  it("rejects even a newer same-engine Session because it has no model generation", () => {
    expect(
      desiredBindingCanPersistWithoutActiveSession({
        desiredEngineSelection: CODEX_BINDING,
        serverEngineSelection: CODEX_BINDING,
        activeSession: ACTIVE_SESSION,
      }),
    ).toBe(false);
  });
});

describe("composer strip work-log derivation", () => {
  it("reuses the active derivation unless a subagent view needs its parent source", () => {
    const activeWorkLogEntries: WorkLogEntry[] = [];
    const deriveParentWorkLogEntries = vi.fn(() => []);

    expect(
      resolveComposerStripWorkLogEntries({
        hasDistinctParentSource: false,
        activeWorkLogEntries,
        deriveParentWorkLogEntries,
      }),
    ).toBe(activeWorkLogEntries);
    expect(deriveParentWorkLogEntries).not.toHaveBeenCalled();

    resolveComposerStripWorkLogEntries({
      hasDistinctParentSource: true,
      activeWorkLogEntries,
      deriveParentWorkLogEntries,
    });
    expect(deriveParentWorkLogEntries).toHaveBeenCalledOnce();
  });
});

describe("thread artifact workspace root", () => {
  it("uses a materialized worktree for file previews", () => {
    expect(
      resolveThreadArtifactWorkspaceRoot({
        isStudioContainer: false,
        projectCwd: "/repo/project",
        threadWorkspaceCwd: "/repo/worktrees/feature",
      }),
    ).toBe("/repo/worktrees/feature");
  });

  it("keeps the project fallback while a normal thread worktree is pending", () => {
    expect(
      resolveThreadArtifactWorkspaceRoot({
        isStudioContainer: false,
        projectCwd: "/repo/project",
        threadWorkspaceCwd: null,
      }),
    ).toBe("/repo/project");
  });

  it("does not escape a Studio thread's selected working directory", () => {
    expect(
      resolveThreadArtifactWorkspaceRoot({
        isStudioContainer: true,
        projectCwd: "/studio/root",
        threadWorkspaceCwd: null,
      }),
    ).toBeNull();
  });
});

describe("transcript auto-follow signal", () => {
  it("stays stable when only non-message turn activity changes", () => {
    const before = buildTranscriptAutoFollowSignal({
      messageCount: 3,
      tailKey: "assistant-3:assistant:streaming:content:120",
    });
    const afterWorkRow = buildTranscriptAutoFollowSignal({
      messageCount: 3,
      tailKey: "assistant-3:assistant:streaming:content:120",
    });

    expect(afterWorkRow).toBe(before);
  });

  it("changes for a real transcript append or tail lifecycle change", () => {
    const streaming = buildTranscriptAutoFollowSignal({
      messageCount: 3,
      tailKey: "assistant-3:assistant:streaming:content:120",
    });

    expect(
      buildTranscriptAutoFollowSignal({
        messageCount: 4,
        tailKey: "user-4:user:settled:content:24",
      }),
    ).not.toBe(streaming);
    expect(
      buildTranscriptAutoFollowSignal({
        messageCount: 3,
        tailKey: "assistant-3:assistant:settled:content:120",
      }),
    ).not.toBe(streaming);
  });

  it("stays stable while the streaming assistant tail only grows", () => {
    const firstChunk = buildTranscriptAutoFollowSignal({
      messageCount: 3,
      tailKey: "assistant-3:assistant:streaming:content:",
    });
    const nextChunk = buildTranscriptAutoFollowSignal({
      messageCount: 3,
      tailKey: "assistant-3:assistant:streaming:content:",
    });

    expect(nextChunk).toBe(firstChunk);
  });
});

describe("transcript tail key", () => {
  const streamingTail = {
    id: "assistant-3",
    role: "assistant",
    streaming: true,
    text: "hello",
    completedAt: null,
  };

  it("covers empty, first content, new tail, settle, completion, and settled repair", () => {
    expect(buildTranscriptTailKey(null)).toBe("empty");
    const streaming = buildTranscriptTailKey(streamingTail);
    expect(buildTranscriptTailKey({ ...streamingTail, text: "hello world" })).toBe(streaming);
    expect(buildTranscriptTailKey({ ...streamingTail, text: "" })).not.toBe(streaming);
    expect(buildTranscriptTailKey({ ...streamingTail, id: "assistant-4" })).not.toBe(streaming);
    const settled = { ...streamingTail, streaming: false };
    expect(buildTranscriptTailKey(settled)).not.toBe(streaming);
    expect(
      buildTranscriptTailKey({ ...settled, completedAt: "2026-01-01T00:00:00.000Z" }),
    ).not.toBe(buildTranscriptTailKey(settled));
    expect(buildTranscriptTailKey({ ...settled, text: "hello repaired" })).not.toBe(
      buildTranscriptTailKey(settled),
    );
    expect(buildTranscriptTailKey({ ...settled, text: "a b" })).not.toBe(
      buildTranscriptTailKey({ ...settled, text: "a\nb" }),
    );
  });
});

describe("file undo completion", () => {
  const pending = {
    threadId: ThreadId.makeUnsafe("thread-file-undo"),
    turnCounts: [2],
    existingFailureActivityIds: [],
  };
  const summary = {
    turnId: TurnId.makeUnsafe("turn-2"),
    checkpointTurnCount: 2,
    checkpointTurnCounts: [2],
    checkpointRef: CheckpointRef.makeUnsafe("refs/harnessos/checkpoints/thread-file-undo/turn/2"),
    status: "ready" as const,
    completedAt: "2026-07-12T17:59:00.000Z",
    files: [{ path: "src/file.ts", additions: 1, deletions: 0 }],
  };

  it("stays pending after command acceptance until the projected file diff settles", () => {
    const baseThread = {
      id: pending.threadId,
      turnDiffSummaries: [summary],
      activities: [],
    };

    expect(hasFileUndoSettled({ pending, thread: baseThread })).toBe(false);
    expect(
      hasFileUndoSettled({
        pending,
        thread: {
          ...baseThread,
          turnDiffSummaries: [{ ...summary, files: [] }],
        },
      }),
    ).toBe(true);
  });

  it("stays pending until every merged turn in the card has been reverted", () => {
    const olderSummary = {
      ...summary,
      turnId: TurnId.makeUnsafe("turn-1"),
      checkpointTurnCount: 1,
      checkpointTurnCounts: [1],
      files: [],
    };
    const multiTurnPending = { ...pending, turnCounts: [2, 1] };

    expect(
      hasFileUndoSettled({
        pending: multiTurnPending,
        thread: {
          id: pending.threadId,
          turnDiffSummaries: [olderSummary, summary],
          activities: [],
        },
      }),
    ).toBe(false);
    expect(
      hasFileUndoSettled({
        pending: multiTurnPending,
        thread: {
          id: pending.threadId,
          turnDiffSummaries: [olderSummary, { ...summary, files: [] }],
          activities: [],
        },
      }),
    ).toBe(true);
  });

  it("settles when the matching revert failure is projected", () => {
    expect(
      hasFileUndoSettled({
        pending,
        thread: {
          id: pending.threadId,
          turnDiffSummaries: [summary],
          activities: [
            {
              id: EventId.makeUnsafe("activity-file-undo-failed"),
              tone: "error",
              kind: "checkpoint.revert.failed",
              summary: "Checkpoint revert failed",
              payload: { turnCount: 2, detail: "reset failed" },
              turnId: null,
              createdAt: "2026-07-12T18:00:01.000Z",
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it("ignores a matching failure activity that predates this undo request", () => {
    expect(
      hasFileUndoSettled({
        pending: { ...pending, existingFailureActivityIds: ["activity-file-undo-failed"] },
        thread: {
          id: pending.threadId,
          turnDiffSummaries: [summary],
          activities: [
            {
              id: EventId.makeUnsafe("activity-file-undo-failed"),
              tone: "error",
              kind: "checkpoint.revert.failed",
              summary: "Checkpoint revert failed",
              payload: { turnCount: 2, detail: "old failure" },
              turnId: null,
              createdAt: "2026-07-12T17:00:00.000Z",
            },
          ],
        },
      }),
    ).toBe(false);
  });
});

describe("composer menu selection", () => {
  const items = [{ id: "skill:check-code" }, { id: "skill:sanity-check" }] as const;

  it("builds a stable key from query and displayed item order", () => {
    const baseKey = buildComposerMenuSelectionKey({
      menuOpen: true,
      picker: null,
      triggerKind: "slash-command",
      triggerQuery: "check",
      items,
    });

    expect(
      buildComposerMenuSelectionKey({
        menuOpen: true,
        picker: null,
        triggerKind: "slash-command",
        triggerQuery: "check",
        items: [...items],
      }),
    ).toBe(baseKey);
    expect(
      buildComposerMenuSelectionKey({
        menuOpen: true,
        picker: null,
        triggerKind: "slash-command",
        triggerQuery: "chec",
        items,
      }),
    ).not.toBe(baseKey);
    expect(
      buildComposerMenuSelectionKey({
        menuOpen: true,
        picker: null,
        triggerKind: "slash-command",
        triggerQuery: "check",
        items: [...items].reverse(),
      }),
    ).not.toBe(baseKey);
  });

  it("returns null while the menu is closed", () => {
    expect(
      buildComposerMenuSelectionKey({
        menuOpen: false,
        picker: null,
        triggerKind: "slash-command",
        triggerQuery: "check",
        items,
      }),
    ).toBeNull();
  });
});

describe("prompt history navigation", () => {
  it("derives newest-first native user prompts and skips imported or internal-only entries", () => {
    const messages = [
      {
        id: MessageId.makeUnsafe("message-imported"),
        role: "user",
        text: "Imported prompt",
        source: "fork-import",
      },
      {
        id: MessageId.makeUnsafe("message-assistant"),
        role: "assistant",
        text: "Assistant response",
        source: "native",
      },
      {
        id: MessageId.makeUnsafe("message-first"),
        role: "user",
        text: "First prompt\n\n<terminal_context>\n# Terminal\noutput\n</terminal_context>",
        source: "native",
      },
      {
        id: MessageId.makeUnsafe("message-images"),
        role: "user",
        text: "[User attached one or more images without additional text. Respond using the conversation context and the attached image(s).]",
        source: "native",
      },
      {
        id: MessageId.makeUnsafe("message-second"),
        role: "user",
        text: "Second prompt",
        source: "native",
      },
    ] as const;

    expect(derivePromptHistoryFromMessages(messages)).toEqual(["Second prompt", "First prompt"]);
  });

  it("limits prompt history without deduping repeated prompts", () => {
    const messages = [
      {
        id: MessageId.makeUnsafe("message-one"),
        role: "user",
        text: "one",
        source: "native",
      },
      {
        id: MessageId.makeUnsafe("message-repeat-one"),
        role: "user",
        text: "repeat",
        source: "native",
      },
      {
        id: MessageId.makeUnsafe("message-repeat-two"),
        role: "user",
        text: "repeat",
        source: "native",
      },
    ] as const;

    expect(derivePromptHistoryFromMessages(messages, 2)).toEqual(["repeat", "repeat"]);
  });

  it("keeps history browse state for cursor-only movement inside the recalled prompt", () => {
    expect(
      promptStillMatchesActiveHistoryBrowse({
        state: { index: 0, draft: "draft in progress" },
        history: ["recalled prompt"],
        nextPrompt: "recalled prompt",
        appliedPrompt: "recalled prompt",
      }),
    ).toBe(true);

    expect(
      promptStillMatchesActiveHistoryBrowse({
        state: { index: 3, draft: "draft in progress" },
        history: ["different prompt"],
        nextPrompt: "recalled prompt",
        appliedPrompt: "recalled prompt",
      }),
    ).toBe(true);
  });

  it("ends history browse state when the recalled prompt text is edited", () => {
    expect(
      promptStillMatchesActiveHistoryBrowse({
        state: { index: 0, draft: "draft in progress" },
        history: ["recalled prompt"],
        nextPrompt: "recalled prompt edited",
        appliedPrompt: "recalled prompt",
      }),
    ).toBe(false);
  });

  it("does not start prompt history navigation while a composer menu trigger is active", () => {
    expect(
      shouldHandlePromptHistoryNavigationKey({
        key: "ArrowUp",
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        menuIsActive: true,
        hasActivePendingProgress: false,
        isComposerApprovalState: false,
        pendingUserInputCount: 0,
      }),
    ).toBe(false);

    expect(
      shouldHandlePromptHistoryNavigationKey({
        key: "ArrowUp",
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        menuIsActive: false,
        hasActivePendingProgress: false,
        isComposerApprovalState: false,
        pendingUserInputCount: 0,
      }),
    ).toBe(true);
  });

  it("detects first and last line cursor positions", () => {
    const prompt = "first\nmiddle\nlast";

    expect(isComposerCursorOnFirstLine(prompt, 0)).toBe(true);
    expect(isComposerCursorOnFirstLine(prompt, 5)).toBe(true);
    expect(isComposerCursorOnFirstLine(prompt, 6)).toBe(false);

    expect(isComposerCursorOnLastLine(prompt, 13)).toBe(true);
    expect(isComposerCursorOnLastLine(prompt, prompt.length)).toBe(true);
    expect(isComposerCursorOnLastLine(prompt, 12)).toBe(false);
  });

  it("navigates older prompts from a non-empty draft and restores the draft at the end", () => {
    const history = ["third prompt", "second prompt", "first prompt"];
    const first = resolvePromptHistoryNavigation({
      direction: "older",
      history,
      currentPrompt: "draft in progress",
      currentExpandedCursor: 0,
      selectionCollapsed: true,
      state: null,
    });

    expect(first).toMatchObject({
      handled: true,
      prompt: "third prompt",
      expandedCursor: "third prompt".length,
      state: { index: 0, draft: "draft in progress" },
    });

    const second = resolvePromptHistoryNavigation({
      direction: "older",
      history,
      currentPrompt: first.prompt,
      currentExpandedCursor: first.expandedCursor,
      selectionCollapsed: true,
      state: first.state,
    });

    expect(second).toMatchObject({
      handled: true,
      prompt: "second prompt",
      expandedCursor: "second prompt".length,
      state: { index: 1, draft: "draft in progress" },
    });

    const newer = resolvePromptHistoryNavigation({
      direction: "newer",
      history,
      currentPrompt: second.prompt,
      currentExpandedCursor: second.prompt.length,
      selectionCollapsed: true,
      state: second.state,
    });

    expect(newer).toMatchObject({
      handled: true,
      prompt: "third prompt",
      state: { index: 0, draft: "draft in progress" },
    });

    const restored = resolvePromptHistoryNavigation({
      direction: "newer",
      history,
      currentPrompt: newer.prompt,
      currentExpandedCursor: newer.prompt.length,
      selectionCollapsed: true,
      state: newer.state,
    });

    expect(restored).toEqual({
      handled: true,
      prompt: "draft in progress",
      expandedCursor: "draft in progress".length,
      state: null,
    });
  });

  it("places recalled multiline prompts on the eligible line for repeated navigation", () => {
    const older = resolvePromptHistoryNavigation({
      direction: "older",
      history: ["first line\nsecond line"],
      currentPrompt: "",
      currentExpandedCursor: 0,
      selectionCollapsed: true,
      state: null,
    });

    expect(older.expandedCursor).toBe("first line".length);

    const newer = resolvePromptHistoryNavigation({
      direction: "newer",
      history: ["first line\nsecond line", "older"],
      currentPrompt: "older",
      currentExpandedCursor: "older".length,
      selectionCollapsed: true,
      state: { index: 1, draft: "" },
    });

    expect(newer.prompt).toBe("first line\nsecond line");
    expect(newer.expandedCursor).toBe("first line\nsecond line".length);
  });

  it("can navigate newer immediately after recalling a multiline prompt with ArrowUp", () => {
    const history = ["newer line one\nnewer line two", "older prompt"];
    const recalled = resolvePromptHistoryNavigation({
      direction: "older",
      history,
      currentPrompt: "",
      currentExpandedCursor: 0,
      selectionCollapsed: true,
      state: null,
    });

    expect(recalled.prompt).toBe("newer line one\nnewer line two");
    expect(recalled.expandedCursor).toBe("newer line one".length);

    const restoredDraft = resolvePromptHistoryNavigation({
      direction: "newer",
      history,
      currentPrompt: recalled.prompt,
      currentExpandedCursor: recalled.expandedCursor,
      selectionCollapsed: true,
      state: recalled.state,
    });

    expect(restoredDraft).toEqual({
      handled: true,
      prompt: "",
      expandedCursor: 0,
      state: null,
    });
  });

  it("does not navigate when cursor position or selection should belong to text editing", () => {
    expect(
      resolvePromptHistoryNavigation({
        direction: "older",
        history: ["previous"],
        currentPrompt: "first\nsecond",
        currentExpandedCursor: "first\ns".length,
        selectionCollapsed: true,
        state: null,
      }).handled,
    ).toBe(false);

    expect(
      resolvePromptHistoryNavigation({
        direction: "older",
        history: ["previous"],
        currentPrompt: "draft",
        currentExpandedCursor: 0,
        selectionCollapsed: false,
        state: null,
      }).handled,
    ).toBe(false);
  });

  it("does not navigate from lower lines even when the first line is long", () => {
    // Cursor offsets are expanded (raw string indices). A collapsed cursor —
    // where an inline chip like "@apps/web/src/components/ChatView.tsx" counts
    // as one unit — would sit below the first line's raw end and wrongly hijack
    // ArrowUp from the second line; expanded offsets must be used instead.
    const prompt = "@apps/web/src/components/ChatView.tsx fix this\nplease keep the draft";
    const secondLineCursor = prompt.indexOf("please") + "plea".length;

    expect(
      resolvePromptHistoryNavigation({
        direction: "older",
        history: ["previous"],
        currentPrompt: prompt,
        currentExpandedCursor: secondLineCursor,
        selectionCollapsed: true,
        state: null,
      }).handled,
    ).toBe(false);
  });

  it("restarts from the newest entry when older navigation loses its place", () => {
    const older = resolvePromptHistoryNavigation({
      direction: "older",
      history: ["new prompt"],
      currentPrompt: "old prompt",
      currentExpandedCursor: 0,
      selectionCollapsed: true,
      state: { index: 0, draft: "draft" },
    });

    expect(older).toEqual({
      handled: true,
      prompt: "new prompt",
      expandedCursor: "new prompt".length,
      state: { index: 0, draft: "draft" },
    });
  });

  it("restarts from the newest entry when the stored index falls outside history", () => {
    const older = resolvePromptHistoryNavigation({
      direction: "older",
      history: ["only prompt"],
      currentPrompt: "recalled from longer history",
      currentExpandedCursor: 0,
      selectionCollapsed: true,
      state: { index: 5, draft: "draft" },
    });

    expect(older).toEqual({
      handled: true,
      prompt: "only prompt",
      expandedCursor: "only prompt".length,
      state: { index: 0, draft: "draft" },
    });
  });

  it("restores the draft when newer navigation loses its place", () => {
    const newer = resolvePromptHistoryNavigation({
      direction: "newer",
      history: ["new prompt"],
      currentPrompt: "old prompt",
      currentExpandedCursor: "old prompt".length,
      selectionCollapsed: true,
      state: { index: 0, draft: "draft" },
    });

    expect(newer).toEqual({
      handled: true,
      prompt: "draft",
      expandedCursor: "draft".length,
      state: null,
    });
  });
});

describe("composer pasted text collapse", () => {
  it("is enabled only for regular chat sends", () => {
    expect(
      shouldEnableComposerPastedTextCollapse({
        isComposerApprovalState: false,
        hasPendingUserInput: false,
        showPlanFollowUpPrompt: false,
      }),
    ).toBe(true);
    expect(
      shouldEnableComposerPastedTextCollapse({
        isComposerApprovalState: false,
        hasPendingUserInput: true,
        showPlanFollowUpPrompt: false,
      }),
    ).toBe(false);
    expect(
      shouldEnableComposerPastedTextCollapse({
        isComposerApprovalState: false,
        hasPendingUserInput: false,
        showPlanFollowUpPrompt: true,
      }),
    ).toBe(false);
    expect(
      shouldEnableComposerPastedTextCollapse({
        isComposerApprovalState: true,
        hasPendingUserInput: false,
        showPlanFollowUpPrompt: false,
      }),
    ).toBe(false);
  });
});

describe("voice helpers", () => {
  it("keeps manual titles visible for empty home chats", () => {
    expect(
      resolveActiveThreadTitle({
        title: "Roadmap scratchpad",
        subagentTitle: null,
        entryPoint: "chat",
        genericTerminalTitle: "New terminal",
      }),
    ).toBe("Roadmap scratchpad");
  });

  it("keeps the raw placeholder out of presentation-specific title rewriting", () => {
    expect(
      resolveActiveThreadTitle({
        title: "New thread",
        subagentTitle: null,
        entryPoint: "chat",
        genericTerminalTitle: "New terminal",
      }),
    ).toBe("New thread");
  });

  it("prefers the resolved subagent label when present", () => {
    expect(
      resolveActiveThreadTitle({
        title: "Ignored raw title",
        subagentTitle: "Reviewer / Fix follow-up",
        entryPoint: "chat",
        genericTerminalTitle: "New terminal",
      }),
    ).toBe("Reviewer / Fix follow-up");
  });

  it("localizes only the generic terminal title at presentation time", () => {
    expect(
      resolveActiveThreadTitle({
        title: "New terminal",
        subagentTitle: null,
        entryPoint: "terminal",
        genericTerminalTitle: "新建终端",
      }),
    ).toBe("新建终端");
  });

  it("hides only untouched Agent and Chat draft identities", () => {
    expect(
      shouldShowActiveThreadHeaderIdentity({
        title: "New thread",
        subagentTitle: null,
        entryPoint: "chat",
      }),
    ).toBe(false);
    expect(
      shouldShowActiveThreadHeaderIdentity({
        title: "Roadmap scratchpad",
        subagentTitle: null,
        entryPoint: "chat",
      }),
    ).toBe(true);
  });

  it("keeps meaningful subagent and Terminal identities visible", () => {
    expect(
      shouldShowActiveThreadHeaderIdentity({
        title: "New thread",
        subagentTitle: "Reviewer / Fix follow-up",
        entryPoint: "chat",
      }),
    ).toBe(true);
    expect(
      shouldShowActiveThreadHeaderIdentity({
        title: "New terminal",
        subagentTitle: null,
        entryPoint: "terminal",
      }),
    ).toBe(true);
  });

  it("hides fork-imported transcript rows only for sidechats", () => {
    const messages = [
      {
        id: "message-imported" as never,
        role: "assistant",
        text: "Previous context",
        turnId: null,
        streaming: false,
        source: "fork-import",
        createdAt: "2026-05-02T10:00:00.000Z",
        completedAt: "2026-05-02T10:00:00.000Z",
      },
      {
        id: "message-native" as never,
        role: "user",
        text: "Fresh side question",
        turnId: null,
        streaming: false,
        source: "native",
        createdAt: "2026-05-02T10:01:00.000Z",
        completedAt: "2026-05-02T10:01:00.000Z",
      },
    ] as const;

    expect(filterSidechatTranscriptMessages(messages, true).map((message) => message.id)).toEqual([
      "message-native",
    ]);
    expect(filterSidechatTranscriptMessages(messages, false).map((message) => message.id)).toEqual([
      "message-imported",
      "message-native",
    ]);
  });

  it("appends a transcript to the existing prompt without disturbing spacing", () => {
    expect(appendVoiceTranscriptToPrompt("Hello there   ", "  next line  ")).toBe(
      "Hello there\nnext line",
    );
  });

  it("returns null when the transcript is empty", () => {
    expect(appendVoiceTranscriptToPrompt("Hello", "   ")).toBeNull();
  });

  it("sanitizes inline stack traces from voice errors", () => {
    expect(
      sanitizeVoiceErrorMessage(
        "Your ChatGPT login has expired. Sign in again. at file:///Users/test/app.mjs:12:3",
      ),
    ).toBe("Your ChatGPT login has expired. Sign in again.");
  });

  it("strips desktop bridge wrappers from voice errors", () => {
    expect(
      sanitizeVoiceErrorMessage(
        "Error invoking remote method 'desktop:server-transcribe-voice': Error: The transcription response did not include any text.",
      ),
    ).toBe("The transcription response did not include any text.");
  });

  it("detects auth-expired copy in sanitized voice errors", () => {
    expect(isVoiceAuthExpiredMessage("Sign in again to ChatGPT")).toBe(true);
    expect(isVoiceAuthExpiredMessage("The microphone could not be opened.")).toBe(false);
  });

  it("maps microphone permission errors to clearer copy", () => {
    const error = new Error("Permission denied");
    error.name = "NotAllowedError";

    expect(describeVoiceRecordingStartError(error)).toContain("Microphone access was denied");
  });

  it("derives voice-note availability from engine auth and runtime state", () => {
    expect(
      deriveComposerVoiceState({
        authStatus: "authenticated",
        voiceTranscriptionAvailable: true,
        isRecording: false,
        isTranscribing: false,
      }),
    ).toEqual({
      canRenderVoiceNotes: true,
      canStartVoiceNotes: true,
      showVoiceNotesControl: true,
    });

    expect(
      deriveComposerVoiceState({
        authStatus: "unauthenticated",
        voiceTranscriptionAvailable: true,
        isRecording: true,
        isTranscribing: false,
      }),
    ).toEqual({
      canRenderVoiceNotes: false,
      canStartVoiceNotes: false,
      showVoiceNotesControl: true,
    });
  });
});

describe("environment panel visibility", () => {
  it("renders the panel when the user toggles it open on empty landing", () => {
    expect(
      resolveEnvironmentPanelVisible({
        environmentEnabled: true,
        environmentPanelOpen: true,
      }),
    ).toBe(true);
  });

  it("keeps the panel hidden when environment controls are disabled or closed", () => {
    expect(
      resolveEnvironmentPanelVisible({
        environmentEnabled: false,
        environmentPanelOpen: true,
      }),
    ).toBe(false);
    expect(
      resolveEnvironmentPanelVisible({
        environmentEnabled: true,
        environmentPanelOpen: false,
      }),
    ).toBe(false);
  });
});

describe("git repository UI state", () => {
  it("waits for positive repository detection in Studio", () => {
    expect(
      resolveGitRepoUiState({
        isStudioContainer: true,
        queriedIsRepo: undefined,
      }),
    ).toBe(false);
    expect(
      resolveGitRepoUiState({
        isStudioContainer: true,
        queriedIsRepo: true,
      }),
    ).toBe(true);
    expect(
      resolveGitRepoUiState({
        isStudioContainer: true,
        queriedIsRepo: false,
      }),
    ).toBe(false);
  });

  it("keeps normal project Git UI stable while discovery is pending", () => {
    expect(
      resolveGitRepoUiState({
        isStudioContainer: false,
        queriedIsRepo: undefined,
      }),
    ).toBe(true);
  });
});

describe("resolveCycledModelSlug", () => {
  const options = [{ slug: "a" }, { slug: "b" }, { slug: "c" }, { slug: "d" }];

  it("returns null when fewer than two models are available", () => {
    expect(
      resolveCycledModelSlug({
        currentModel: "a",
        options: [{ slug: "a" }],
        direction: "next",
      }),
    ).toBeNull();
  });

  it("cycles next/previous through the full list", () => {
    expect(
      resolveCycledModelSlug({
        currentModel: "a",
        options,
        direction: "next",
      }),
    ).toBe("b");
    expect(
      resolveCycledModelSlug({
        currentModel: "a",
        options,
        direction: "previous",
      }),
    ).toBe("d");
  });

  it("puts favorites first and cycles within that ordered list", () => {
    // Ordered: d, b, a, c — from c next wraps to d; from d next is b
    expect(
      resolveCycledModelSlug({
        currentModel: "c",
        options,
        favoriteSlugs: ["d", "b"],
        direction: "next",
      }),
    ).toBe("d");
    expect(
      resolveCycledModelSlug({
        currentModel: "d",
        options,
        favoriteSlugs: ["d", "b"],
        direction: "next",
      }),
    ).toBe("b");
  });

  it("starts at the ordered boundary when the current model is unavailable", () => {
    expect(
      resolveCycledModelSlug({
        currentModel: "removed-model",
        options,
        favoriteSlugs: ["d", "b"],
        direction: "next",
      }),
    ).toBe("d");
    expect(
      resolveCycledModelSlug({
        currentModel: "removed-model",
        options,
        favoriteSlugs: ["d", "b"],
        direction: "previous",
      }),
    ).toBe("c");
  });

  it("normalizes whitespace and ignores duplicate or unavailable favorites", () => {
    expect(
      resolveCycledModelSlug({
        currentModel: " d ",
        options: [{ slug: " a " }, { slug: "b" }, { slug: "b" }, { slug: "d" }],
        favoriteSlugs: [" missing ", " d ", "d"],
        direction: "next",
      }),
    ).toBe("a");
  });
});

describe("resolveActiveTurnLiveDiffState", () => {
  it("uses only the diff summary for the active turn", () => {
    const activeTurnId = TurnId.makeUnsafe("turn-active");

    expect(
      resolveActiveTurnLiveDiffState({
        latestTurnId: activeTurnId,
        turnDiffSummaries: [
          {
            turnId: TurnId.makeUnsafe("turn-previous"),
            completedAt: "2026-06-13T10:00:00.000Z",
            files: [{ path: "old.ts", additions: 100, deletions: 50 }],
          },
          {
            turnId: activeTurnId,
            completedAt: "2026-06-13T10:01:00.000Z",
            files: [
              { path: "src/a.ts", additions: 2, deletions: 1 },
              { path: "src/b.ts", additions: 3, deletions: 0 },
            ],
          },
        ],
      }),
    ).toEqual({
      turnId: activeTurnId,
      fileCount: 2,
      additions: 5,
      deletions: 1,
      hasChanges: true,
    });
  });

  it("returns zero totals before the active turn has a diff summary or file-edit work", () => {
    expect(
      resolveActiveTurnLiveDiffState({
        latestTurnId: TurnId.makeUnsafe("turn-active"),
        turnDiffSummaries: [
          {
            turnId: TurnId.makeUnsafe("turn-previous"),
            completedAt: "2026-06-13T10:00:00.000Z",
            files: [{ path: "old.ts", additions: 100, deletions: 50 }],
          },
        ],
      }),
    ).toEqual({
      turnId: null,
      fileCount: 0,
      additions: 0,
      deletions: 0,
      hasChanges: false,
    });
  });

  it("treats an empty active turn diff summary as authoritative over tool-log file hints", () => {
    const activeTurnId = TurnId.makeUnsafe("turn-active");

    expect(
      resolveActiveTurnLiveDiffState({
        latestTurnId: activeTurnId,
        turnDiffSummaries: [
          {
            turnId: activeTurnId,
            completedAt: "2026-06-13T10:01:00.000Z",
            files: [],
          },
        ],
        workLogEntries: [
          {
            turnId: activeTurnId,
            itemType: "file_change",
            changedFiles: ["src/a.ts"],
          },
        ],
      }),
    ).toEqual({
      turnId: null,
      fileCount: 0,
      additions: 0,
      deletions: 0,
      hasChanges: false,
    });
  });

  it("falls back to in-turn file-edit work before the diff summary lands", () => {
    const activeTurnId = TurnId.makeUnsafe("turn-active");

    expect(
      resolveActiveTurnLiveDiffState({
        latestTurnId: activeTurnId,
        turnDiffSummaries: [],
        workLogEntries: [
          // Other turn / non-edit work is ignored.
          { turnId: TurnId.makeUnsafe("turn-previous"), itemType: "file_change" },
          { turnId: activeTurnId, requestKind: "command" },
          {
            turnId: activeTurnId,
            itemType: "file_change",
            changedFiles: ["src/a.ts", "src/b.ts"],
          },
          { turnId: activeTurnId, itemType: "file_change", changedFiles: ["src/a.ts"] },
        ],
      }),
    ).toEqual({
      turnId: null,
      fileCount: 2,
      additions: 0,
      deletions: 0,
      hasChanges: true,
    });
  });

  it("surfaces a stat-less strip when file-edit work has no changed paths yet", () => {
    const activeTurnId = TurnId.makeUnsafe("turn-active");

    expect(
      resolveActiveTurnLiveDiffState({
        latestTurnId: activeTurnId,
        turnDiffSummaries: [],
        workLogEntries: [{ turnId: activeTurnId, itemType: "file_change" }],
      }),
    ).toEqual({
      turnId: null,
      fileCount: null,
      additions: 0,
      deletions: 0,
      hasChanges: true,
    });
  });
});

describe("resolveCommittedProviderModel", () => {
  it("preserves the exact runtime-discovered slug when the picker selected it", () => {
    expect(
      resolveCommittedProviderModel({
        selectedModel: "grok-code-fast-1-0825" as ModelSlug,
        availableOptions: [
          {
            slug: "grok-code-fast-1-0825" as ModelSlug,
            name: "Grok Code Fast 1 0825",
          },
        ],
      }),
    ).toBe("grok-code-fast-1-0825");
  });

  it("rejects a selected slug that is not in the authoritative options", () => {
    expect(
      resolveCommittedProviderModel({
        selectedModel: "code-fast" as ModelSlug,
        availableOptions: [],
      }),
    ).toBeNull();
  });
});

describe("shouldConsumePendingCustomBinaryConfirmation", () => {
  it("still processes a pending path for a session that was already checked", () => {
    expect(
      shouldConsumePendingCustomBinaryConfirmation({
        sessionAlreadyChecked: true,
        pendingCustomBinaryPath: "/custom/bin/opencode",
      }),
    ).toBe(true);
  });

  it("skips already checked sessions when there is no pending path to confirm", () => {
    expect(
      shouldConsumePendingCustomBinaryConfirmation({
        sessionAlreadyChecked: true,
        pendingCustomBinaryPath: null,
      }),
    ).toBe(false);
  });
});

describe("deriveComposerSendState", () => {
  it("treats expired terminal pills as non-sendable content", () => {
    const state = deriveComposerSendState({
      prompt: "\uFFFC",
      imageCount: 0,
      fileCount: 0,
      assistantSelectionCount: 0,
      browserAnnotationCount: 0,
      fileCommentCount: 0,
      terminalContexts: [
        {
          id: "ctx-expired",
          threadId: ThreadId.makeUnsafe("thread-1"),
          terminalId: "default",
          terminalLabel: "Terminal 1",
          lineStart: 4,
          lineEnd: 4,
          text: "",
          createdAt: "2026-03-17T12:52:29.000Z",
        },
      ],
      pastedTexts: [],
    });

    expect(state.trimmedPrompt).toBe("");
    expect(state.sendableTerminalContexts).toEqual([]);
    expect(state.expiredTerminalContextCount).toBe(1);
    expect(state.hasSendableContent).toBe(false);
  });

  it("keeps text sendable while excluding expired terminal pills", () => {
    const state = deriveComposerSendState({
      prompt: `yoo \uFFFC waddup`,
      imageCount: 0,
      fileCount: 0,
      assistantSelectionCount: 0,
      browserAnnotationCount: 0,
      fileCommentCount: 0,
      terminalContexts: [
        {
          id: "ctx-expired",
          threadId: ThreadId.makeUnsafe("thread-1"),
          terminalId: "default",
          terminalLabel: "Terminal 1",
          lineStart: 4,
          lineEnd: 4,
          text: "",
          createdAt: "2026-03-17T12:52:29.000Z",
        },
      ],
      pastedTexts: [],
    });

    expect(state.trimmedPrompt).toBe("yoo  waddup");
    expect(state.expiredTerminalContextCount).toBe(1);
    expect(state.hasSendableContent).toBe(true);
  });

  it("treats assistant selections as sendable content", () => {
    const state = deriveComposerSendState({
      prompt: "",
      imageCount: 0,
      fileCount: 0,
      assistantSelectionCount: 1,
      browserAnnotationCount: 0,
      fileCommentCount: 0,
      terminalContexts: [],
      pastedTexts: [],
    });

    expect(state.hasSendableContent).toBe(true);
  });

  it("treats file comments as sendable content", () => {
    const state = deriveComposerSendState({
      prompt: "",
      imageCount: 0,
      fileCount: 0,
      assistantSelectionCount: 0,
      browserAnnotationCount: 0,
      fileCommentCount: 1,
      terminalContexts: [],
      pastedTexts: [],
    });

    expect(state.hasSendableContent).toBe(true);
  });

  it("treats file attachments as sendable content", () => {
    const state = deriveComposerSendState({
      prompt: "",
      imageCount: 0,
      fileCount: 1,
      assistantSelectionCount: 0,
      browserAnnotationCount: 0,
      fileCommentCount: 0,
      terminalContexts: [],
      pastedTexts: [],
    });

    expect(state.hasSendableContent).toBe(true);
  });

  it("treats browser annotations as sendable content", () => {
    const state = deriveComposerSendState({
      prompt: "",
      imageCount: 0,
      fileCount: 0,
      assistantSelectionCount: 0,
      browserAnnotationCount: 1,
      fileCommentCount: 0,
      terminalContexts: [],
      pastedTexts: [],
    });

    expect(state.hasSendableContent).toBe(true);
  });
});

describe("buildExpiredTerminalContextToastCopy", () => {
  it("formats clear empty-state guidance", () => {
    expect(buildExpiredTerminalContextToastCopy(1, "empty")).toEqual({
      title: "Expired terminal context won't be sent",
      description: "Remove it or re-add it to include terminal output.",
    });
  });

  it("formats omission guidance for sent messages", () => {
    expect(buildExpiredTerminalContextToastCopy(2, "omitted")).toEqual({
      title: "Expired terminal contexts omitted from message",
      description: "Re-add it if you want that terminal output included.",
    });
  });
});

describe("shouldRenderTerminalWorkspace", () => {
  it("renders the workspace shell before the active project has hydrated", () => {
    expect(
      shouldRenderTerminalWorkspace({
        presentationMode: "workspace",
        terminalOpen: true,
      }),
    ).toBe(true);
  });

  it("renders only for an open workspace terminal", () => {
    expect(
      shouldRenderTerminalWorkspace({
        presentationMode: "workspace",
        terminalOpen: true,
      }),
    ).toBe(true);
    expect(
      shouldRenderTerminalWorkspace({
        presentationMode: "drawer",
        terminalOpen: true,
      }),
    ).toBe(false);
  });
});

describe("resolveProjectScriptTerminalTarget", () => {
  it("reuses the base terminal only when no terminal is open or running", () => {
    const target = resolveProjectScriptTerminalTarget({
      baseTerminalId: "default",
      createTerminalId: () => "new-terminal",
      hasRunningTerminal: false,
      terminalOpen: false,
    });

    expect(target).toEqual({
      shouldCreateNewTerminal: false,
      terminalId: "default",
    });
  });

  it("creates a fresh terminal when a live terminal could keep stale cwd or env", () => {
    expect(
      resolveProjectScriptTerminalTarget({
        baseTerminalId: "default",
        createTerminalId: () => "visible-script-terminal",
        hasRunningTerminal: false,
        terminalOpen: true,
      }),
    ).toEqual({
      shouldCreateNewTerminal: true,
      terminalId: "visible-script-terminal",
    });

    expect(
      resolveProjectScriptTerminalTarget({
        baseTerminalId: "default",
        createTerminalId: () => "running-script-terminal",
        hasRunningTerminal: true,
        terminalOpen: false,
      }),
    ).toEqual({
      shouldCreateNewTerminal: true,
      terminalId: "running-script-terminal",
    });
  });

  it("honors explicit requests for a new terminal", () => {
    const target = resolveProjectScriptTerminalTarget({
      baseTerminalId: "default",
      createTerminalId: () => "forced-script-terminal",
      hasRunningTerminal: false,
      preferNewTerminal: true,
      terminalOpen: false,
    });

    expect(target).toEqual({
      shouldCreateNewTerminal: true,
      terminalId: "forced-script-terminal",
    });
  });
});

describe("shouldRenderEngineHealthBanner", () => {
  it("does not show chat engine health while a terminal thread is active", () => {
    expect(
      shouldRenderEngineHealthBanner({
        threadEntryPoint: "terminal",
        terminalWorkspaceTerminalTabActive: false,
      }),
    ).toBe(false);
  });

  it("does not show chat engine health while the terminal workspace tab is active", () => {
    expect(
      shouldRenderEngineHealthBanner({
        threadEntryPoint: "chat",
        terminalWorkspaceTerminalTabActive: true,
      }),
    ).toBe(false);
  });

  it("shows chat engine health only on the chat surface", () => {
    expect(
      shouldRenderEngineHealthBanner({
        threadEntryPoint: "chat",
        terminalWorkspaceTerminalTabActive: false,
      }),
    ).toBe(true);
  });
});

describe("shouldStartActiveTurnLayoutGrace", () => {
  it("starts the grace window when a live turn just became settled", () => {
    expect(
      shouldStartActiveTurnLayoutGrace({
        previousTurnLayoutLive: true,
        currentTurnLayoutLive: false,
        latestTurnStartedAt: "2026-04-13T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("does not start the grace window for already-idle threads", () => {
    expect(
      shouldStartActiveTurnLayoutGrace({
        previousTurnLayoutLive: false,
        currentTurnLayoutLive: false,
        latestTurnStartedAt: "2026-04-13T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("does not start the grace window while work is still live", () => {
    expect(
      shouldStartActiveTurnLayoutGrace({
        previousTurnLayoutLive: true,
        currentTurnLayoutLive: true,
        latestTurnStartedAt: "2026-04-13T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("does not start the grace window when the turn never started", () => {
    expect(
      shouldStartActiveTurnLayoutGrace({
        previousTurnLayoutLive: true,
        currentTurnLayoutLive: false,
        latestTurnStartedAt: null,
      }),
    ).toBe(false);
  });
});

describe("worktree setup snapshots", () => {
  it("marks earlier steps done, the active step active, and later steps pending", () => {
    expect(createWorktreeSetupSnapshot("prepare-thread").steps).toEqual([
      { id: "create-branch", label: "Creating branch", status: "done" },
      { id: "create-worktree", label: "Creating worktree", status: "done" },
      { id: "prepare-thread", label: "Linking thread workspace", status: "active" },
      { id: "start-session", label: "Starting session", status: "pending" },
    ]);
  });

  it("starts with every step pending except the first when setup begins", () => {
    expect(createWorktreeSetupSnapshot("create-branch").steps.map((step) => step.status)).toEqual([
      "active",
      "pending",
      "pending",
      "pending",
    ]);
  });

  it("ends with every step done except the last when the session starts", () => {
    expect(createWorktreeSetupSnapshot("start-session").steps.map((step) => step.status)).toEqual([
      "done",
      "done",
      "done",
      "active",
    ]);
  });

  it("inserts the copy step when the worktree copies local changes", () => {
    expect(createWorktreeSetupSnapshot("copy-changes").steps).toEqual([
      { id: "create-branch", label: "Creating branch", status: "done" },
      { id: "create-worktree", label: "Creating worktree", status: "done" },
      { id: "copy-changes", label: "Copying local changes", status: "active" },
      { id: "prepare-thread", label: "Linking thread workspace", status: "pending" },
      { id: "start-session", label: "Starting session", status: "pending" },
    ]);
    expect(
      createWorktreeSetupSnapshot("create-branch", { copyLocalChanges: true }).steps.map(
        (step) => step.id,
      ),
    ).toEqual([
      "create-branch",
      "create-worktree",
      "copy-changes",
      "prepare-thread",
      "start-session",
    ]);
  });

  it("inserts the setup action step when a worktree setup script is present", () => {
    expect(
      createWorktreeSetupSnapshot("run-setup-action", { setupScriptName: "Setup" }).steps,
    ).toEqual([
      { id: "create-branch", label: "Creating branch", status: "done" },
      { id: "create-worktree", label: "Creating worktree", status: "done" },
      { id: "prepare-thread", label: "Linking thread workspace", status: "done" },
      { id: "run-setup-action", label: "Running setup action: Setup", status: "active" },
      { id: "start-session", label: "Starting session", status: "pending" },
    ]);
  });

  it("keeps the setup action step done when the session starts afterward", () => {
    expect(
      createWorktreeSetupSnapshot("start-session", { setupScriptName: "Setup" }).steps.map(
        (step) => step.status,
      ),
    ).toEqual(["done", "done", "done", "done", "active"]);
  });

  it("preserves setup action metadata while advancing local worktree setup", () => {
    const current = createLocalDispatchSnapshot(undefined, {
      worktreeSetupStepId: "create-worktree",
      setupScriptName: "Setup",
    });

    const next = resolveNextLocalDispatchSnapshot({
      current,
      activeThread: undefined,
      options: { worktreeSetupStepId: "run-setup-action", setupScriptName: "Setup" },
    });

    expect(next.worktreeSetup?.steps).toEqual([
      { id: "create-branch", label: "Creating branch", status: "done" },
      { id: "create-worktree", label: "Creating worktree", status: "done" },
      { id: "prepare-thread", label: "Linking thread workspace", status: "done" },
      { id: "run-setup-action", label: "Running setup action: Setup", status: "active" },
      { id: "start-session", label: "Starting session", status: "pending" },
    ]);
  });

  it("fails only the active step and leaves the rest untouched", () => {
    const failed = failWorktreeSetupSnapshot(createWorktreeSetupSnapshot("prepare-thread"));
    expect(failed.steps.map((step) => step.status)).toEqual(["done", "done", "error", "pending"]);
    expect(worktreeSetupHasError(failed)).toBe(true);
  });

  it("returns the same snapshot when no step is active", () => {
    const failed = failWorktreeSetupSnapshot(createWorktreeSetupSnapshot("prepare-thread"));
    expect(failWorktreeSetupSnapshot(failed)).toBe(failed);
  });

  it("reports no error for null or healthy snapshots", () => {
    expect(worktreeSetupHasError(null)).toBe(false);
    expect(worktreeSetupHasError(createWorktreeSetupSnapshot("create-worktree"))).toBe(false);
  });

  it("resolves a worktree setup resolution once and ignores later attempts", async () => {
    const resolution = createWorktreeSetupResolution();
    expect(resolution.action).toBeNull();

    resolution.resolve("work-locally");
    resolution.resolve("cancel");

    expect(resolution.action).toBe("work-locally");
    await expect(resolution.promise).resolves.toBe("work-locally");
  });

  it("exposes a cancel resolution through both the getter and the promise", async () => {
    const resolution = createWorktreeSetupResolution();
    const settled = resolution.promise;

    resolution.resolve("cancel");

    expect(resolution.action).toBe("cancel");
    await expect(settled).resolves.toBe("cancel");
  });

  it("replaces a held failed setup when a fresh local dispatch starts", () => {
    const current: LocalDispatchSnapshot = {
      startedAt: "2026-04-13T00:00:00.000Z",
      worktreeSetup: failWorktreeSetupSnapshot(createWorktreeSetupSnapshot("create-worktree")),
      expectedUserMessageId: null,
      latestTurnTurnId: null,
      latestTurnRequestedAt: null,
      latestTurnStartedAt: null,
      latestTurnCompletedAt: null,
      sessionOrchestrationStatus: null,
      sessionUpdatedAt: null,
    };

    const next = resolveNextLocalDispatchSnapshot({
      current,
      activeThread: undefined,
    });

    expect(next).not.toBe(current);
    expect(next.worktreeSetup).toBeNull();
  });

  it("starts a fresh dispatch marker when a new expected user message id arrives", () => {
    const current: LocalDispatchSnapshot = {
      startedAt: "2026-04-13T00:00:00.000Z",
      worktreeSetup: null,
      expectedUserMessageId: "message-first" as never,
      latestTurnTurnId: null,
      latestTurnRequestedAt: null,
      latestTurnStartedAt: null,
      latestTurnCompletedAt: null,
      sessionOrchestrationStatus: "ready",
      sessionUpdatedAt: "2026-04-13T00:00:00.000Z",
    };

    const next = resolveNextLocalDispatchSnapshot({
      current,
      activeThread: undefined,
      options: { expectedUserMessageId: "message-second" as never },
    });

    expect(next).not.toBe(current);
    expect(next.expectedUserMessageId).toBe("message-second");
  });

  it("replaces a held failed setup when retrying worktree setup", () => {
    const current: LocalDispatchSnapshot = {
      startedAt: "2026-04-13T00:00:00.000Z",
      worktreeSetup: failWorktreeSetupSnapshot(createWorktreeSetupSnapshot("create-worktree")),
      expectedUserMessageId: null,
      latestTurnTurnId: null,
      latestTurnRequestedAt: null,
      latestTurnStartedAt: null,
      latestTurnCompletedAt: null,
      sessionOrchestrationStatus: null,
      sessionUpdatedAt: null,
    };

    const next = resolveNextLocalDispatchSnapshot({
      current,
      activeThread: undefined,
      options: { worktreeSetupStepId: "create-worktree" },
    });

    expect(next).not.toBe(current);
    expect(next.worktreeSetup?.steps.map((step) => step.status)).toEqual([
      "done",
      "active",
      "pending",
      "pending",
    ]);
  });
});

describe("runWorktreeCreationFlow", () => {
  interface FlowHarness {
    emit: (event: GitWorktreeSetupProgressEvent) => void;
    resolution: ReturnType<typeof createWorktreeSetupResolution>;
    steps: string[];
    removedPaths: string[];
    unsubscribeCount: () => number;
    settleCreation: (worktreePath: string) => void;
    rejectCreation: (error: unknown) => void;
    flow: ReturnType<typeof runWorktreeCreationFlow<{ worktree: { path: string } }>>;
  }

  function startFlowHarness(): FlowHarness {
    const listeners: Array<(event: GitWorktreeSetupProgressEvent) => void> = [];
    let unsubscribes = 0;
    let settle!: (result: { worktree: { path: string } }) => void;
    let reject!: (error: unknown) => void;
    const resolution = createWorktreeSetupResolution();
    const steps: string[] = [];
    const removedPaths: string[] = [];
    const flow = runWorktreeCreationFlow({
      progressId: "progress-1",
      subscribeToProgress: (listener) => {
        listeners.push(listener);
        return () => {
          unsubscribes += 1;
        };
      },
      startCreation: () =>
        new Promise<{ worktree: { path: string } }>((resolveCreation, rejectCreation) => {
          settle = resolveCreation;
          reject = rejectCreation;
        }),
      resolution,
      onCreationStep: (stepId) => steps.push(stepId),
      removeWorktree: (worktreePath) => {
        removedPaths.push(worktreePath);
        return Promise.resolve();
      },
    });
    return {
      emit: (event) => {
        for (const listener of listeners) {
          listener(event);
        }
      },
      resolution,
      steps,
      removedPaths,
      unsubscribeCount: () => unsubscribes,
      settleCreation: (worktreePath) => settle({ worktree: { path: worktreePath } }),
      rejectCreation: (error) => reject(error),
      flow,
    };
  }

  it("advances steps only for this creation's phase-started events", async () => {
    const harness = startFlowHarness();

    harness.emit({ progressId: "progress-1", kind: "phase_started", phase: "branch" });
    harness.emit({ progressId: "progress-other", kind: "phase_started", phase: "worktree" });
    harness.emit({
      progressId: "progress-1",
      kind: "completed",
      result: { worktree: { path: "/wt", ref: "abc123", branch: "harnessos/x" } },
    });
    harness.emit({ progressId: "progress-1", kind: "phase_started", phase: "copy-changes" });

    expect(harness.steps).toEqual(["create-branch", "copy-changes"]);

    harness.settleCreation("/wt");
    await expect(harness.flow).resolves.toEqual({
      outcome: "created",
      result: { worktree: { path: "/wt" } },
    });
    expect(harness.removedPaths).toEqual([]);
    expect(harness.unsubscribeCount()).toBe(1);
  });

  it("stops advancing steps once the setup card is resolved", async () => {
    const harness = startFlowHarness();

    harness.emit({ progressId: "progress-1", kind: "phase_started", phase: "branch" });
    harness.resolution.resolve("cancel");
    harness.emit({ progressId: "progress-1", kind: "phase_started", phase: "worktree" });

    expect(harness.steps).toEqual(["create-branch"]);
    harness.settleCreation("/resolved-worktree");
    await expect(harness.flow).resolves.toEqual({ outcome: "resolved" });
  });

  it("tears down the worktree once creation lands after a resolution won the race", async () => {
    const harness = startFlowHarness();

    harness.resolution.resolve("work-locally");
    let settled = false;
    void harness.flow.finally(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(harness.removedPaths).toEqual([]);

    harness.settleCreation("/late-worktree");
    await expect(harness.flow).resolves.toEqual({ outcome: "resolved" });
    expect(harness.removedPaths).toEqual(["/late-worktree"]);
    expect(harness.unsubscribeCount()).toBe(1);
  });

  it("does not report a resolved setup when late physical cleanup fails", async () => {
    const resolution = createWorktreeSetupResolution();
    resolution.resolve("cancel");
    const flow = runWorktreeCreationFlow({
      progressId: "progress-fail-remove",
      subscribeToProgress: () => () => undefined,
      startCreation: async () => ({ worktree: { path: "/late-worktree" } }),
      resolution,
      onCreationStep: () => undefined,
      removeWorktree: async () => {
        throw new Error("remove failed");
      },
    });

    await expect(flow).rejects.toThrow("remove failed");
  });

  it("unsubscribes and rethrows when creation fails", async () => {
    const harness = startFlowHarness();

    harness.rejectCreation(new Error("worktree add failed"));

    await expect(harness.flow).rejects.toThrow("worktree add failed");
    expect(harness.unsubscribeCount()).toBe(1);
    expect(harness.removedPaths).toEqual([]);
  });
});

describe("awaitTurnPreparationWithWorktreeResolution", () => {
  it("consumes a resolution that arrives while preparation is pending", async () => {
    let releasePreparation!: (value: string) => void;
    const preparation = new Promise<string>((resolve) => {
      releasePreparation = resolve;
    });
    let cancelled = false;
    const consumeResolution = vi.fn(async () => {
      if (cancelled) {
        throw new WorktreeSetupCancelledError();
      }
    });

    const result = awaitTurnPreparationWithWorktreeResolution({
      preparation,
      consumeResolution,
    });
    await Promise.resolve();
    expect(consumeResolution).toHaveBeenCalledTimes(1);

    cancelled = true;
    releasePreparation("prepared");

    await expect(result).rejects.toBeInstanceOf(WorktreeSetupCancelledError);
    expect(consumeResolution).toHaveBeenCalledTimes(2);
  });

  it("returns the exact prepared value after both resolution checkpoints", async () => {
    const prepared = { attachments: ["attachment-1"] };
    const consumeResolution = vi.fn(async () => undefined);

    await expect(
      awaitTurnPreparationWithWorktreeResolution({
        preparation: Promise.resolve(prepared),
        consumeResolution,
      }),
    ).resolves.toBe(prepared);
    expect(consumeResolution).toHaveBeenCalledTimes(2);
  });
});

describe("cleanupPreparedWorktreeBeforeTurn", () => {
  function harness(ownership: "promoted" | "existing") {
    const calls: string[] = [];
    return {
      calls,
      run: () =>
        cleanupPreparedWorktreeBeforeTurn({
          turnStartAttempted: false,
          ownership,
          deletePromotedThread: async () => {
            calls.push("delete");
          },
          detachExistingThread: async () => {
            calls.push("detach");
          },
          removeWorktree: async () => {
            calls.push("remove");
          },
          commitLocalDetach: () => calls.push("local"),
        }),
    };
  }

  it("durably deletes a promoted thread before removing its worktree", async () => {
    const test = harness("promoted");
    await test.run();
    expect(test.calls).toEqual(["delete", "remove", "local"]);
  });

  it("durably detaches an existing thread before removing its worktree", async () => {
    const test = harness("existing");
    await test.run();
    expect(test.calls).toEqual(["detach", "remove", "local"]);
  });

  it("removes an unowned worktree without mutating any Thread", async () => {
    const calls: string[] = [];
    await cleanupPreparedWorktreeBeforeTurn({
      turnStartAttempted: false,
      ownership: "unowned",
      deletePromotedThread: async () => {
        calls.push("delete");
      },
      detachExistingThread: async () => {
        calls.push("detach");
      },
      removeWorktree: async () => {
        calls.push("remove");
      },
      commitLocalDetach: () => calls.push("local"),
    });
    expect(calls).toEqual(["remove", "local"]);
  });

  it("never removes when durable ownership cleanup is rejected", async () => {
    const calls: string[] = [];
    await expect(
      cleanupPreparedWorktreeBeforeTurn({
        turnStartAttempted: false,
        ownership: "existing",
        deletePromotedThread: async () => undefined,
        detachExistingThread: async () => {
          calls.push("detach");
          throw new Error("durable reject");
        },
        removeWorktree: async () => {
          calls.push("remove");
        },
        commitLocalDetach: () => calls.push("local"),
      }),
    ).rejects.toThrow("durable reject");
    expect(calls).toEqual(["detach"]);
  });

  it("does not commit local completion when physical removal fails", async () => {
    const calls: string[] = [];
    await expect(
      cleanupPreparedWorktreeBeforeTurn({
        turnStartAttempted: false,
        ownership: "existing",
        deletePromotedThread: async () => undefined,
        detachExistingThread: async () => {
          calls.push("detach");
        },
        removeWorktree: async () => {
          calls.push("remove");
          throw new Error("remove reject");
        },
        commitLocalDetach: () => calls.push("local"),
      }),
    ).rejects.toThrow("remove reject");
    expect(calls).toEqual(["detach", "remove"]);
  });

  it("leaves an attempted turn entirely to the exact server projection", async () => {
    const calls: string[] = [];
    await expect(
      cleanupPreparedWorktreeBeforeTurn({
        turnStartAttempted: true,
        ownership: "promoted",
        deletePromotedThread: async () => {
          calls.push("delete");
        },
        detachExistingThread: async () => {
          calls.push("detach");
        },
        removeWorktree: async () => {
          calls.push("remove");
        },
        commitLocalDetach: () => calls.push("local"),
      }),
    ).resolves.toBe("projection-owned");
    expect(calls).toEqual([]);
  });
});

describe("dispatchExactCommandWithOneReplay", () => {
  it("replays an ACK failure once without changing caller-owned identity", async () => {
    const command = { commandId: "same-command" };
    const seen: unknown[] = [];
    const dispatch = vi.fn(async () => {
      seen.push(command);
      if (seen.length === 1) throw new Error("ack lost");
    });

    await dispatchExactCommandWithOneReplay(dispatch);
    expect(seen).toEqual([command, command]);
  });

  it("remains bounded when both attempts fail", async () => {
    const dispatch = vi.fn().mockRejectedValue(new Error("still unavailable"));
    await expect(dispatchExactCommandWithOneReplay(dispatch)).rejects.toThrow("still unavailable");
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});

describe("hasServerAcknowledgedLocalDispatch", () => {
  const localDispatch: LocalDispatchSnapshot = {
    startedAt: "2026-04-13T00:00:00.000Z",
    worktreeSetup: null,
    expectedUserMessageId: "message-for-dispatch" as never,
    latestTurnTurnId: null,
    latestTurnRequestedAt: null,
    latestTurnStartedAt: null,
    latestTurnCompletedAt: null,
    sessionOrchestrationStatus: "ready",
    sessionUpdatedAt: "2026-04-13T00:00:00.000Z",
  };
  const firstTurnLocalDispatch: LocalDispatchSnapshot = {
    startedAt: "2026-04-13T00:00:00.000Z",
    worktreeSetup: null,
    expectedUserMessageId: "message-first-send" as never,
    latestTurnTurnId: null,
    latestTurnRequestedAt: null,
    latestTurnStartedAt: null,
    latestTurnCompletedAt: null,
    sessionOrchestrationStatus: null,
    sessionUpdatedAt: null,
  };

  it("stays pending until the server-side thread/session snapshot changes", () => {
    expect(
      hasServerAcknowledgedLocalDispatch({
        localDispatch,
        phase: "ready",
        latestTurn: null,
        messages: [
          {
            id: "message-before-dispatch" as never,
            role: "user",
            text: "an unrelated message",
            createdAt: "2026-04-13T00:00:00.000Z",
            streaming: false,
          },
        ],
        session: {
          engine: "codex",
          status: "ready",
          orchestrationStatus: "ready",
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:00:00.000Z",
        },
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
      }),
    ).toBe(false);
  });

  it("acknowledges the local send once the latest turn snapshot changes", () => {
    expect(
      hasServerAcknowledgedLocalDispatch({
        localDispatch,
        phase: "ready",
        latestTurn: {
          turnId: "turn-1" as never,
          state: "running",
          requestedAt: "2026-04-13T00:00:01.000Z",
          startedAt: null,
          completedAt: null,
          assistantMessageId: null,
          sourceProposedPlan: undefined,
        },
        messages: [],
        session: {
          engine: "codex",
          status: "ready",
          orchestrationStatus: "ready",
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:00:01.000Z",
        },
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
      }),
    ).toBe(true);
  });

  it("keeps the first-turn optimistic timer alive through a null-to-ready session bootstrap", () => {
    expect(
      hasServerAcknowledgedLocalDispatch({
        localDispatch: firstTurnLocalDispatch,
        phase: "ready",
        latestTurn: null,
        messages: [],
        session: {
          engine: "claude",
          status: "ready",
          orchestrationStatus: "ready",
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:00:01.000Z",
        },
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
      }),
    ).toBe(false);
  });

  it("acknowledges a first send when its user message becomes durable", () => {
    expect(
      hasServerAcknowledgedLocalDispatch({
        localDispatch: firstTurnLocalDispatch,
        phase: "ready",
        latestTurn: null,
        messages: [
          {
            id: "message-first-send" as never,
            role: "user",
            text: "the submitted message",
            createdAt: "2026-04-13T00:00:01.000Z",
            streaming: false,
          },
        ],
        session: {
          engine: "claude",
          status: "ready",
          orchestrationStatus: "ready",
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:00:01.000Z",
        },
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
      }),
    ).toBe(true);
  });

  it("still acknowledges non-ready session transitions without a latest turn snapshot", () => {
    expect(
      hasServerAcknowledgedLocalDispatch({
        localDispatch: firstTurnLocalDispatch,
        phase: "disconnected",
        latestTurn: null,
        messages: [],
        session: null,
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: "engine failed",
      }),
    ).toBe(true);
  });
});

describe("hasLiveTurnTakenOver", () => {
  const localDispatch: LocalDispatchSnapshot = {
    startedAt: "2026-04-13T00:00:00.000Z",
    worktreeSetup: null,
    expectedUserMessageId: "message-for-dispatch" as never,
    latestTurnTurnId: null,
    latestTurnRequestedAt: null,
    latestTurnStartedAt: null,
    latestTurnCompletedAt: null,
    sessionOrchestrationStatus: "ready",
    sessionUpdatedAt: "2026-04-13T00:00:00.000Z",
  };

  it("stays false for a message echo and requestedAt-only turn bump", () => {
    expect(
      hasLiveTurnTakenOver({
        localDispatch,
        phase: "ready",
        latestTurn: {
          turnId: "turn-1" as never,
          state: "running",
          requestedAt: "2026-04-13T00:00:01.000Z",
          startedAt: null,
          completedAt: null,
          assistantMessageId: null,
          sourceProposedPlan: undefined,
        },
        session: {
          engine: "codex",
          status: "ready",
          orchestrationStatus: "ready",
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:00:01.000Z",
        },
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
        now: Date.parse("2026-04-13T00:00:02.000Z"),
      }),
    ).toBe(false);
  });

  it("takes over once the session phase is running or connecting", () => {
    expect(
      hasLiveTurnTakenOver({
        localDispatch,
        phase: "running",
        latestTurn: null,
        session: null,
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
      }),
    ).toBe(true);
    expect(
      hasLiveTurnTakenOver({
        localDispatch,
        phase: "connecting",
        latestTurn: null,
        session: null,
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
      }),
    ).toBe(true);
  });

  it("takes over when an active turn id appears", () => {
    expect(
      hasLiveTurnTakenOver({
        localDispatch,
        phase: "ready",
        latestTurn: null,
        session: {
          engine: "codex",
          status: "ready",
          orchestrationStatus: "ready",
          activeTurnId: "turn-1" as never,
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:00:01.000Z",
        },
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
      }),
    ).toBe(true);
  });

  it("takes over when latestTurn startedAt or completedAt changes", () => {
    expect(
      hasLiveTurnTakenOver({
        localDispatch,
        phase: "ready",
        latestTurn: {
          turnId: "turn-1" as never,
          state: "running",
          requestedAt: "2026-04-13T00:00:01.000Z",
          startedAt: "2026-04-13T00:00:02.000Z",
          completedAt: null,
          assistantMessageId: null,
          sourceProposedPlan: undefined,
        },
        session: null,
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
      }),
    ).toBe(true);
    expect(
      hasLiveTurnTakenOver({
        localDispatch,
        phase: "ready",
        latestTurn: {
          turnId: "turn-1" as never,
          state: "completed",
          requestedAt: "2026-04-13T00:00:01.000Z",
          startedAt: null,
          completedAt: "2026-04-13T00:00:03.000Z",
          assistantMessageId: null,
          sourceProposedPlan: undefined,
        },
        session: null,
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
      }),
    ).toBe(true);
  });

  it("takes over on pending approval, user input, or thread error", () => {
    expect(
      hasLiveTurnTakenOver({
        localDispatch,
        phase: "ready",
        latestTurn: null,
        session: null,
        hasPendingApproval: true,
        hasPendingUserInput: false,
        threadError: null,
      }),
    ).toBe(true);
    expect(
      hasLiveTurnTakenOver({
        localDispatch,
        phase: "ready",
        latestTurn: null,
        session: null,
        hasPendingApproval: false,
        hasPendingUserInput: true,
        threadError: null,
      }),
    ).toBe(true);
    expect(
      hasLiveTurnTakenOver({
        localDispatch,
        phase: "ready",
        latestTurn: null,
        session: null,
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: "engine failed",
      }),
    ).toBe(true);
  });

  it("fails open after the awaiting-turn timeout unless worktree setup is active", () => {
    const now = Date.parse(localDispatch.startedAt) + LOCAL_DISPATCH_TURN_TAKEOVER_TIMEOUT_MS;
    expect(
      hasLiveTurnTakenOver({
        localDispatch,
        phase: "ready",
        latestTurn: null,
        session: null,
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
        now,
      }),
    ).toBe(true);
    expect(
      hasLiveTurnTakenOver({
        localDispatch: {
          ...localDispatch,
          worktreeSetup: createWorktreeSetupSnapshot("create-worktree"),
        },
        phase: "ready",
        latestTurn: null,
        session: null,
        hasPendingApproval: false,
        hasPendingUserInput: false,
        threadError: null,
        now,
      }),
    ).toBe(false);
  });
});

describe("shouldAutoDeleteTerminalThreadOnLastClose", () => {
  it("deletes untouched terminal-first placeholder threads when the last terminal closes", () => {
    expect(
      shouldAutoDeleteTerminalThreadOnLastClose({
        isLastTerminal: true,
        isServerThread: true,
        terminalEntryPoint: "terminal",
        thread: {
          title: "New terminal",
          messages: [],
          latestTurn: null,
          session: null,
          activities: [],
          proposedPlans: [],
        },
      }),
    ).toBe(true);
  });

  it("keeps non-placeholder or already-used threads", () => {
    expect(
      shouldAutoDeleteTerminalThreadOnLastClose({
        isLastTerminal: true,
        isServerThread: true,
        terminalEntryPoint: "terminal",
        thread: {
          title: "Manual rename",
          messages: [],
          latestTurn: null,
          session: null,
          activities: [],
          proposedPlans: [],
        },
      }),
    ).toBe(false);

    expect(
      shouldAutoDeleteTerminalThreadOnLastClose({
        isLastTerminal: true,
        isServerThread: true,
        terminalEntryPoint: "terminal",
        thread: {
          title: "New terminal",
          messages: [
            {
              id: "msg-1" as never,
              role: "user",
              text: "hello",
              createdAt: "2026-04-06T12:00:00.000Z",
              streaming: false,
            },
          ],
          latestTurn: null,
          session: null,
          activities: [],
          proposedPlans: [],
        },
      }),
    ).toBe(false);
  });
});

describe("resolveRuntimeModeAfterApprovalDecision", () => {
  it("switches approval-required threads to full-access on acceptForSession", () => {
    expect(resolveRuntimeModeAfterApprovalDecision("approval-required", "acceptForSession")).toBe(
      "full-access",
    );
  });

  it("does not change a thread already in full-access", () => {
    expect(resolveRuntimeModeAfterApprovalDecision("full-access", "acceptForSession")).toBeNull();
  });

  it("keeps Auto as the durable policy after a session-scoped approval", () => {
    expect(resolveRuntimeModeAfterApprovalDecision("auto", "acceptForSession")).toBeNull();
  });

  it("leaves runtime mode untouched for one-off accept and decline decisions", () => {
    expect(resolveRuntimeModeAfterApprovalDecision("approval-required", "accept")).toBeNull();
    expect(resolveRuntimeModeAfterApprovalDecision("approval-required", "decline")).toBeNull();
  });

  it("does not widen a permission-profile grant to full access", () => {
    expect(
      resolveRuntimeModeAfterApprovalDecision("auto", "acceptForSession", "permissions"),
    ).toBeNull();
  });
});

describe("createRuntimeModePersistenceQueue", () => {
  it("persists the final rapid selection after an opposite update is already in flight", async () => {
    let releaseFirst: (() => void) | undefined;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const calls: Array<[RuntimeMode, RuntimeMode]> = [];
    const queue = createRuntimeModePersistenceQueue("auto");
    const persist = async (currentMode: RuntimeMode, nextMode: RuntimeMode) => {
      calls.push([currentMode, nextMode]);
      if (calls.length === 1) {
        await firstBlocked;
      }
      return true;
    };

    const fullAccess = queue.persist("full-access", persist);
    await Promise.resolve();
    const auto = queue.persist("auto", persist);
    expect(calls).toEqual([["auto", "full-access"]]);

    releaseFirst?.();
    await expect(Promise.all([fullAccess, auto])).resolves.toEqual([true, true]);
    expect(calls).toEqual([
      ["auto", "full-access"],
      ["full-access", "auto"],
    ]);
  });

  it("keeps the acknowledged mode when an earlier queued write fails", async () => {
    const calls: Array<[RuntimeMode, RuntimeMode]> = [];
    const queue = createRuntimeModePersistenceQueue("auto");
    const failed = queue.persist("full-access", async (currentMode, nextMode) => {
      calls.push([currentMode, nextMode]);
      return false;
    });
    const finalAuto = queue.persist("auto", async (currentMode, nextMode) => {
      calls.push([currentMode, nextMode]);
      return true;
    });

    await expect(Promise.all([failed, finalAuto])).resolves.toEqual([false, true]);
    expect(calls).toEqual([["auto", "full-access"]]);
  });
});

describe("persistEngineSelectionBeforeRuntimeMode", () => {
  const previousModel = {
    engine: "droid",
    model: "claude-opus-4-8",
  } as const;
  const autoCapableModel = {
    engine: "codex",
    model: "gpt-5.6-sol",
  } as const;

  it("persists a newly selected model before enabling Auto", async () => {
    const calls: Array<string> = [];

    await persistEngineSelectionBeforeRuntimeMode({
      currentEngineSelection: previousModel,
      nextEngineSelection: autoCapableModel,
      currentRuntimeMode: "approval-required",
      nextRuntimeMode: "auto",
      persistEngineSelection: async () => {
        calls.push("model");
      },
      persistRuntimeMode: async () => {
        calls.push("runtime");
      },
    });

    expect(calls).toEqual(["model", "runtime"]);
  });

  it("does not enable Auto when persisting the selected model fails", async () => {
    const calls: Array<string> = [];

    await expect(
      persistEngineSelectionBeforeRuntimeMode({
        currentEngineSelection: previousModel,
        nextEngineSelection: autoCapableModel,
        currentRuntimeMode: "approval-required",
        nextRuntimeMode: "auto",
        persistEngineSelection: async () => {
          calls.push("model");
          throw new Error("model persistence failed");
        },
        persistRuntimeMode: async () => {
          calls.push("runtime");
        },
      }),
    ).rejects.toThrow("model persistence failed");

    expect(calls).toEqual(["model"]);
  });

  it("downgrades from Auto before persisting an incompatible model", async () => {
    const calls: Array<string> = [];

    await persistEngineSelectionBeforeRuntimeMode({
      currentEngineSelection: autoCapableModel,
      nextEngineSelection: previousModel,
      currentRuntimeMode: "auto",
      nextRuntimeMode: "approval-required",
      persistEngineSelection: async () => {
        calls.push("model");
      },
      persistRuntimeMode: async () => {
        calls.push("runtime");
      },
    });

    expect(calls).toEqual(["runtime", "model"]);
  });
});

describe("resolveQueuedSteerGateTransition", () => {
  const armedGate = {
    sawInterruptGap: false,
    gapStartedAt: null,
    armedActiveTurnId: "turn-original",
  };
  const now = 1_000_000;

  it("holds without expiry while the original turn is still running", () => {
    const transition = resolveQueuedSteerGateTransition({
      gate: armedGate,
      phase: "running",
      sessionErrored: false,
      activeTurnId: "turn-original",
      now,
    });
    expect(transition).toEqual({
      kind: "hold",
      gate: armedGate,
      expiresInMs: null,
    });
  });

  it("adopts the live turn id when the gate was armed before the projection caught up", () => {
    const transition = resolveQueuedSteerGateTransition({
      gate: { sawInterruptGap: false, gapStartedAt: null, armedActiveTurnId: null },
      phase: "running",
      sessionErrored: false,
      activeTurnId: "turn-original",
      now,
    });
    expect(transition).toEqual({
      kind: "hold",
      gate: armedGate,
      expiresInMs: null,
    });
  });

  it("clears when the active turn id flips without an observed idle gap", () => {
    const transition = resolveQueuedSteerGateTransition({
      gate: armedGate,
      phase: "running",
      sessionErrored: false,
      activeTurnId: "turn-steered",
      now,
    });
    expect(transition).toEqual({ kind: "clear" });
  });

  it("starts the gap timer when the interrupt lands and the phase leaves running", () => {
    const transition = resolveQueuedSteerGateTransition({
      gate: armedGate,
      phase: "ready",
      sessionErrored: false,
      activeTurnId: null,
      now,
    });
    expect(transition).toEqual({
      kind: "hold",
      gate: { ...armedGate, sawInterruptGap: true, gapStartedAt: now },
      expiresInMs: QUEUED_STEER_GATE_TIMEOUT_MS,
    });
  });

  it("keeps counting down from the original gap start on re-evaluation", () => {
    const transition = resolveQueuedSteerGateTransition({
      gate: { ...armedGate, sawInterruptGap: true, gapStartedAt: now },
      phase: "ready",
      sessionErrored: false,
      activeTurnId: null,
      now: now + 5_000,
    });
    expect(transition).toEqual({
      kind: "hold",
      gate: { ...armedGate, sawInterruptGap: true, gapStartedAt: now },
      expiresInMs: QUEUED_STEER_GATE_TIMEOUT_MS - 5_000,
    });
  });

  it("clears once the steered turn starts running after the gap", () => {
    const transition = resolveQueuedSteerGateTransition({
      gate: { ...armedGate, sawInterruptGap: true, gapStartedAt: now },
      phase: "running",
      sessionErrored: false,
      activeTurnId: "turn-steered",
      now: now + 1_000,
    });
    expect(transition).toEqual({ kind: "clear" });
  });

  it("fails open when the steered turn never starts within the timeout", () => {
    const transition = resolveQueuedSteerGateTransition({
      gate: { ...armedGate, sawInterruptGap: true, gapStartedAt: now },
      phase: "ready",
      sessionErrored: false,
      activeTurnId: null,
      now: now + QUEUED_STEER_GATE_TIMEOUT_MS,
    });
    expect(transition).toEqual({ kind: "clear" });
  });

  it("clears on session error or disconnect so the queue cannot stall", () => {
    expect(
      resolveQueuedSteerGateTransition({
        gate: armedGate,
        phase: "ready",
        sessionErrored: true,
        activeTurnId: null,
        now,
      }),
    ).toEqual({ kind: "clear" });
    expect(
      resolveQueuedSteerGateTransition({
        gate: { ...armedGate, sawInterruptGap: true, gapStartedAt: now },
        phase: "disconnected",
        sessionErrored: false,
        activeTurnId: null,
        now,
      }),
    ).toEqual({ kind: "clear" });
  });
});

describe("thread detail hydration", () => {
  it("keeps local drafts on the empty landing even if a stale failure flag lingers", () => {
    expect(
      resolveThreadDetailHydration({
        isServerThread: false,
        hasTimelineEntries: false,
        detailSyncState: null,
      }),
    ).toBe("ready");
    expect(
      resolveThreadDetailHydration({
        isServerThread: false,
        hasTimelineEntries: false,
        detailSyncState: "failed",
      }),
    ).toBe("ready");
  });

  it("renders existing timeline entries without waiting for a snapshot", () => {
    expect(
      resolveThreadDetailHydration({
        isServerThread: true,
        hasTimelineEntries: true,
        detailSyncState: null,
      }),
    ).toBe("ready");
  });

  it("treats a synced empty thread as genuinely empty", () => {
    expect(
      resolveThreadDetailHydration({
        isServerThread: true,
        hasTimelineEntries: false,
        detailSyncState: "synced",
      }),
    ).toBe("ready");
  });

  it("shows loading for a server thread whose detail has not synced yet", () => {
    expect(
      resolveThreadDetailHydration({
        isServerThread: true,
        hasTimelineEntries: false,
        detailSyncState: null,
      }),
    ).toBe("loading");
  });

  it("surfaces a failed state when the detail stream died without data", () => {
    expect(
      resolveThreadDetailHydration({
        isServerThread: true,
        hasTimelineEntries: false,
        detailSyncState: "failed",
      }),
    ).toBe("failed");
  });
});
