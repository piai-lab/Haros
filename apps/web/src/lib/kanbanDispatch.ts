// FILE: kanbanDispatch.ts
// Purpose: Sends a kanban Draft card to In Progress — promotes local draft threads when
//          needed and dispatches the drafted prompt as a queued turn.
// Layer: Web orchestration helper
// Exports: dispatchKanbanDraftCard, dispatchKanbanDraftThread, KanbanDraftDispatchResult

import type {
  ProductSubmitQueueItemInput,
  ProductSubmitResult,
  ProjectId,
  WorkspaceEnvironmentMode,
  ThreadId,
} from "@omnimind/contracts";
import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductDispatchId,
  ProductEntryId,
  ProductOperationReceiptId,
  ProductQueueItemId,
  ProductRunId,
} from "@omnimind/contracts";
import { buildPromptThreadTitleFallback } from "@omnimind/shared/chatThreads";
import { isPendingThreadWorktree } from "@omnimind/shared/threadEnvironment";
import {
  buildKanbanComposerDraftSnapshot,
  resolveKanbanDraftOpenThreadReason,
  resolveDraftDropAction,
  type KanbanCard,
  type KanbanDraftOpenThreadReason,
  type KanbanOptimisticDispatchSnapshot,
} from "../components/kanban/kanban.logic";
import { resolveKanbanRuntimeModel } from "../components/kanban/kanbanRuntimeSelection";
import { useComposerDraftStore } from "../composerDraftStore";
import { useKanbanUiStore } from "../kanbanUiStore";
import { readProductNativeApi } from "../wsNativeApi";
import { useStore } from "../store";
import { getThreadFromState } from "../threadDerivation";
import type { SidebarThreadSummary } from "../types";
import { appendAssistantSelectionsToPrompt } from "./assistantSelections";
import {
  appendBrowserAnnotationsToPrompt,
  formatBrowserAnnotationLabel,
} from "./browserAnnotations";
import { appendFileCommentsToPrompt, formatFileCommentTitleSeed } from "./fileComments";
import {
  appendTerminalContextsToPrompt,
  filterTerminalContextsWithText,
  IMAGE_ONLY_BOOTSTRAP_PROMPT,
} from "./terminalContext";
import { resolveTerminalThreadCreationState } from "./threadBootstrap";
import { promoteThreadCreate } from "./threadCreatePromotion";
import { createMessageId, randomUUID } from "./identifiers";

export type KanbanDraftDispatchResult =
  /** The drafted prompt is on its way; runtime events move the card to In Progress. */
  | { kind: "dispatched" }
  /** The board cannot dispatch this card faithfully — open the chat instead. */
  | { kind: "open-thread"; reason: KanbanDraftOpenThreadReason }
  /** Admission remains pre-send; retry reuses the same durable transfer identity. */
  | { kind: "pending" }
  /** Delivery crossed an uncertain boundary; never replay this intent automatically. */
  | { kind: "delivery-unknown" }
  /** The Host conclusively rejected the transfer before execution. */
  | { kind: "rejected"; message: string; retryable: boolean }
  /** Composer changed after admission; the edited draft was not submitted. */
  | { kind: "draft-changed" }
  | { kind: "unavailable" }
  | { kind: "error"; message: string };

export async function dispatchKanbanDraftCard(input: {
  card: KanbanCard;
}): Promise<KanbanDraftDispatchResult> {
  const { card } = input;
  if (resolveDraftDropAction(card) !== "dispatch") {
    return {
      kind: "open-thread",
      reason: resolveKanbanDraftOpenThreadReason(card) ?? "not-draft",
    };
  }
  return dispatchKanbanDraftThread({
    threadId: card.threadId,
    projectId: card.projectId,
    thread: card.thread,
  });
}

interface KanbanDraftDispatchInput {
  threadId: ThreadId;
  projectId: ProjectId;
  /** Backing summary; null for local-only draft threads not yet promoted. */
  thread: SidebarThreadSummary | null;
}

// Racing callers (a re-drop before the board re-derives, drag + send-now) must
// not create two Product Queue transfers for the same local draft.
const inFlightDispatchByThreadId = new Map<ThreadId, Promise<KanbanDraftDispatchResult>>();

interface PendingKanbanTransfer {
  readonly submitInput: ProductSubmitQueueItemInput;
  readonly optimisticEntry: KanbanOptimisticDispatchSnapshot;
  readonly outgoingMessageText: string;
}

// A transport error or pre-send receipt must not turn a second drop into a
// second Queue item. The Product Control Plane owns the durable item/run; this
// map only retains its transfer identity for a same-process retry.
const pendingTransferByThreadId = new Map<ThreadId, PendingKanbanTransfer>();

export { resolveKanbanRuntimeModel } from "../components/kanban/kanbanRuntimeSelection";

export type KanbanSubmitReceiptResolution =
  | { readonly kind: "accepted" }
  | { readonly kind: "settled" }
  | { readonly kind: "pending" }
  | { readonly kind: "delivery-unknown" }
  | { readonly kind: "rejected"; readonly message: string; readonly retryable: boolean };

/** Resolves only the receipt created by this transfer; another run can never confirm the card. */
export function resolveKanbanSubmitReceipt(
  result: ProductSubmitResult,
  identity: Pick<ProductSubmitQueueItemInput, "runId" | "entryId" | "dispatchId" | "receiptId">,
): KanbanSubmitReceiptResolution {
  const run = result.snapshot.readModel.runs.find(
    (candidate) =>
      candidate.id === identity.runId &&
      candidate.entryId === identity.entryId &&
      candidate.receipt.id === identity.receiptId &&
      candidate.receipt.dispatchId === identity.dispatchId,
  );
  if (!run) {
    throw new Error("Product submit response did not contain the matching dispatch receipt.");
  }
  const receipt = run.receipt.receipt;
  switch (receipt.state) {
    case "accepted":
    case "running":
      return { kind: "accepted" };
    case "settled":
    case "outcome_unknown":
      return { kind: "settled" };
    case "pending":
      return { kind: "pending" };
    case "delivery_unknown":
      return { kind: "delivery-unknown" };
    case "rejected":
      return { kind: "rejected", message: receipt.message, retryable: receipt.retryable };
  }
}

function applyKanbanSubmitResult(
  threadId: ThreadId,
  transfer: PendingKanbanTransfer,
  result: ProductSubmitResult,
  options?: { readonly preserveEditedDraft?: boolean },
): KanbanDraftDispatchResult {
  const resolution = resolveKanbanSubmitReceipt(result, transfer.submitInput);
  if (resolution.kind === "pending") return { kind: "pending" };
  if (resolution.kind === "delivery-unknown") return { kind: "delivery-unknown" };

  pendingTransferByThreadId.delete(threadId);
  if (resolution.kind === "rejected") {
    return resolution;
  }

  // Only an exact accepted/running receipt earns the short projection-gap
  // overlay. Settled/outcome-unknown receipts are accepted history, but they do
  // not truthfully describe work as currently In Progress.
  if (resolution.kind === "accepted") {
    useKanbanUiStore.getState().markOptimisticDispatch(threadId, transfer.optimisticEntry);
  }
  if (options?.preserveEditedDraft) return { kind: "draft-changed" };
  useComposerDraftStore.getState().clearComposerContent(threadId);
  return { kind: "dispatched" };
}

/**
 * Promote (when needed) and dispatch a draft thread's composer prompt as a queued
 * turn. Shared by the board's drag-to-In-Progress drop and the new-task dialog's
 * "send now" path, so both routes stay byte-for-byte consistent. Reads the live
 * composer draft by id, so callers only pass identity + dispatch preferences.
 * Concurrent calls for the same thread coalesce onto the first dispatch.
 */
export function dispatchKanbanDraftThread(
  input: KanbanDraftDispatchInput,
): Promise<KanbanDraftDispatchResult> {
  const existing = inFlightDispatchByThreadId.get(input.threadId);
  if (existing) {
    return existing;
  }
  const dispatchPromise = dispatchKanbanDraftThreadOnce(input).finally(() => {
    inFlightDispatchByThreadId.delete(input.threadId);
  });
  inFlightDispatchByThreadId.set(input.threadId, dispatchPromise);
  return dispatchPromise;
}

async function dispatchKanbanDraftThreadOnce(
  input: KanbanDraftDispatchInput,
): Promise<KanbanDraftDispatchResult> {
  const { threadId, projectId, thread } = input;
  let api;
  try {
    api = readProductNativeApi();
  } catch {
    return { kind: "unavailable" };
  }

  // Re-read the composer at drop time: the card snapshot may lag behind edits made
  // in an open chat, and a stale prompt must never be dispatched.
  const composerStore = useComposerDraftStore.getState();
  const draftComposerState = composerStore.draftsByThreadId[threadId] ?? null;
  const liveSnapshot = buildKanbanComposerDraftSnapshot(draftComposerState);
  const prompt = liveSnapshot?.prompt.trim() ?? "";
  if (prompt.length === 0 && liveSnapshot?.hasAttachments !== true) {
    return { kind: "open-thread", reason: "empty" };
  }

  const appState = useStore.getState();
  const project = appState.projects.find((candidate) => candidate.id === projectId) ?? null;
  const existingThread = thread ? getThreadFromState(appState, threadId) : null;
  const requestedSelection = composerStore.getDraftThread(threadId)?.requestedSelection ?? null;
  if (!requestedSelection || requestedSelection.state !== "selected") {
    return { kind: "unavailable" };
  }
  const draftThread = composerStore.getDraftThread(threadId);
  // Worktree creation is owned by the full chat composer path. Kanban stays a
  // control surface and opens chat when a draft still needs that preflight.
  const dispatchEnvironment = {
    envMode: (thread?.envMode ??
      existingThread?.envMode ??
      draftThread?.envMode ??
      null) as WorkspaceEnvironmentMode | null,
    worktreePath: thread?.worktreePath ?? existingThread?.worktreePath ?? draftThread?.worktreePath,
  };
  if (isPendingThreadWorktree(dispatchEnvironment)) {
    return { kind: "open-thread", reason: "worktree-pending" };
  }
  const skills = draftComposerState?.skills ?? [];
  const mentions = draftComposerState?.mentions ?? [];
  if (skills.length > 0 || mentions.length > 0) {
    return { kind: "open-thread", reason: "unsupported-execution-options" };
  }
  const composerImages = draftComposerState?.images ?? [];
  const composerFiles = draftComposerState?.files ?? [];
  const composerAssistantSelections = draftComposerState?.assistantSelections ?? [];
  const composerBrowserAnnotations = draftComposerState?.browserAnnotations ?? [];
  const composerFileComments = draftComposerState?.fileComments ?? [];
  const sendableTerminalContexts = filterTerminalContextsWithText(
    draftComposerState?.terminalContexts ?? [],
  );
  const titleSeed =
    prompt ||
    (composerImages[0] ? `Image: ${composerImages[0].name}` : "") ||
    (composerFiles[0] ? `File: ${composerFiles[0].name}` : "") ||
    (composerAssistantSelections.length > 0 ? "Referenced assistant selection" : "") ||
    (composerBrowserAnnotations[0]
      ? formatBrowserAnnotationLabel(composerBrowserAnnotations[0])
      : "") ||
    (sendableTerminalContexts.length > 0 ? "Attached terminal context" : "") ||
    (composerFileComments.length > 0
      ? formatFileCommentTitleSeed(composerFileComments.length)
      : "") ||
    "New task";
  const fallbackTitle = buildPromptThreadTitleFallback(titleSeed);
  const messageId = createMessageId();
  // Browser annotations serialize outermost so display extraction can validate
  // their message-bound transport before unwrapping the remaining context blocks.
  const messageText = appendBrowserAnnotationsToPrompt(
    appendFileCommentsToPrompt(
      appendTerminalContextsToPrompt(
        appendAssistantSelectionsToPrompt(liveSnapshot?.prompt ?? "", composerAssistantSelections),
        sendableTerminalContexts,
      ),
      composerFileComments,
    ),
    composerBrowserAnnotations,
    messageId,
  );
  const outgoingMessageText =
    messageText || (composerImages.length > 0 ? IMAGE_ONLY_BOOTSTRAP_PROMPT : "");
  const pendingTransfer = pendingTransferByThreadId.get(threadId);
  if (pendingTransfer) {
    try {
      const draftChanged = pendingTransfer.outgoingMessageText !== outgoingMessageText;
      if (draftChanged) {
        // Recheck only. The admitted intent may already have crossed the send
        // boundary, so editing invalidates its retry authority but can never
        // authorize a replacement put/replay.
        const snapshot = await api.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: pendingTransfer.submitInput.conversationId,
        });
        const resolution = resolveKanbanSubmitReceipt(
          { snapshot, automaticReplayCount: 0 },
          pendingTransfer.submitInput,
        );
        if (resolution.kind === "pending" || resolution.kind === "delivery-unknown") {
          return { kind: "draft-changed" };
        }
        return applyKanbanSubmitResult(
          threadId,
          pendingTransfer,
          { snapshot, automaticReplayCount: 0 },
          { preserveEditedDraft: true },
        );
      }
      return applyKanbanSubmitResult(
        threadId,
        pendingTransfer,
        await api.submitQueueItem(pendingTransfer.submitInput),
      );
    } catch (error) {
      return {
        kind: "error",
        message: error instanceof Error ? error.message : "Could not recheck the drafted prompt.",
      };
    }
  }
  // The same instant feeds both the command timestamps and the optimistic entry:
  // a server-side failure stamps the session with this createdAt, and the
  // failure check compares it against droppedAtMs with >=.
  const droppedAtMs = Date.now();
  const createdAt = new Date(droppedAtMs).toISOString();

  const optimisticEntry: KanbanOptimisticDispatchSnapshot = {
    projectId,
    title: thread?.title ?? fallbackTitle,
    provider: null,
    baselineTurnId: thread?.latestTurn?.turnId ?? null,
    droppedAtMs,
  };

  try {
    if (thread === null) {
      // Local-only draft thread: create the durable thread first, reusing the same
      // workspace resolution the terminal-first promotion path uses.
      const creationState = resolveTerminalThreadCreationState({
        activeDraftThread: null,
        activeThread: null,
        draftThread,
        options: undefined,
        projectId,
      });
      const promotion = await promoteThreadCreate({
        threadId,
        projectId,
        title: fallbackTitle,
        worktreePath: creationState.worktreePath,
        workingDirectory: creationState.workingDirectory,
        createdAt: draftThread?.createdAt ?? createdAt,
      });
      if (promotion === "unavailable") {
        return { kind: "unavailable" };
      }
    }
    if (composerImages.length > 0 || composerFiles.length > 0) {
      return { kind: "unavailable" };
    }
    const shell = await api.getShellSnapshot();
    const runtimeModel = shell.runtimeCatalog
      ? resolveKanbanRuntimeModel(shell.runtimeCatalog, requestedSelection)
      : undefined;
    if (!shell.runtimeCatalog || !runtimeModel?.available || runtimeModel.auth !== "configured") {
      return { kind: "unavailable" };
    }
    const conversationId = ProductConversationId.makeUnsafe(threadId);
    const detail = await api.getConversationSnapshot({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId,
    });
    const queueItem = await api.putQueueItem({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId,
      itemId: ProductQueueItemId.makeUnsafe(messageId),
      text: outgoingMessageText,
      requestedSelection: {
        state: "selected",
        engineId: shell.runtimeCatalog.engineId,
        runtimeModelId: runtimeModel.id,
        thinking: requestedSelection.thinking,
        permissionPolicy: "approval-required",
        enforcement: shell.runtimeCatalog.capabilities.enforcement,
        executionTarget: detail.readModel.workspace.access.executionTarget,
        packageGeneration: shell.runtimeCatalog.packageGeneration,
      },
      resources: [],
      expectedRevision: null,
    });
    const submitInput: ProductSubmitQueueItemInput = {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId,
      itemId: queueItem.id,
      expectedRevision: queueItem.revision,
      entryId: ProductEntryId.makeUnsafe(messageId),
      runId: ProductRunId.makeUnsafe(randomUUID()),
      dispatchId: ProductDispatchId.makeUnsafe(randomUUID()),
      receiptId: ProductOperationReceiptId.makeUnsafe(randomUUID()),
    };
    const transfer = {
      submitInput,
      optimisticEntry,
      outgoingMessageText,
    } satisfies PendingKanbanTransfer;
    pendingTransferByThreadId.set(threadId, transfer);
    return applyKanbanSubmitResult(threadId, transfer, await api.submitQueueItem(submitInput));
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Could not send the drafted prompt.",
    };
  }
}
