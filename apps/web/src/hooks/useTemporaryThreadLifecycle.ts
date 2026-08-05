// FILE: useTemporaryThreadLifecycle.ts
// Purpose: Deletes temporary threads when focus leaves them.
// Layer: Web route lifecycle hook
// Exports: useTemporaryThreadLifecycle

import { PRODUCT_PROTOCOL_VERSION, ProductConversationId, type ThreadId } from "@omnimind/contracts";
import { useEffect, useRef } from "react";
import { useComposerDraftStore } from "../composerDraftStore";
import { reconcileDeletedThreadFromClient } from "../lib/deletedThreadClientReconciliation";
import { resolveTemporaryThreadIdToDelete } from "../lib/temporaryThread";
import { deleteProductConversation } from "../productConversationMutations";
import { readNativeApi } from "../nativeApi";
import { useSplitViewStore } from "../splitViewStore";
import { useStore } from "../store";
import { useProductStore } from "../store/productStore";
import { useTemporaryThreadStore } from "../temporaryThreadStore";
import { useTerminalStateStore } from "../terminalStateStore";
import { readProductNativeApi } from "../wsNativeApi";

export function useTemporaryThreadLifecycle(activeThreadId: ThreadId | null): void {
  const clearDraftThread = useComposerDraftStore((store) => store.clearDraftThread);
  const clearTerminalState = useTerminalStateStore((store) => store.clearTerminalState);
  const removeThreadFromSplitViews = useSplitViewStore((store) => store.removeThreadFromSplitViews);
  const temporaryThreadIds = useTemporaryThreadStore((store) => store.temporaryThreadIds);
  const clearTemporaryThread = useTemporaryThreadStore((store) => store.clearTemporaryThread);
  const initialDraftIsTemporary = useComposerDraftStore(
    (store) =>
      activeThreadId !== null && store.draftThreadsByThreadId[activeThreadId]?.isTemporary === true,
  );
  const previousThreadStateRef = useRef<{
    threadId: ThreadId | null;
    wasTemporary: boolean;
  }>({
    threadId: activeThreadId,
    wasTemporary:
      (activeThreadId ? temporaryThreadIds[activeThreadId] === true : false) ||
      initialDraftIsTemporary,
  });
  const disposingThreadIdsRef = useRef<Set<ThreadId>>(new Set());

  useEffect(() => {
    const previousThreadState = previousThreadStateRef.current;
    const draftThreadsByThreadId = useComposerDraftStore.getState().draftThreadsByThreadId;
    previousThreadStateRef.current = {
      threadId: activeThreadId,
      wasTemporary: activeThreadId
        ? temporaryThreadIds[activeThreadId] === true ||
          draftThreadsByThreadId[activeThreadId]?.isTemporary === true
        : false,
    };

    const temporaryThreadId = resolveTemporaryThreadIdToDelete({
      previousThreadId: previousThreadState.threadId,
      nextThreadId: activeThreadId,
      previousThreadWasTemporary: previousThreadState.wasTemporary,
      draftThreadsByThreadId,
    });
    if (!temporaryThreadId || disposingThreadIdsRef.current.has(temporaryThreadId)) {
      return;
    }

    disposingThreadIdsRef.current.add(temporaryThreadId);
    void disposeTemporaryThread({
      temporaryThreadId,
      disposingThreadIds: disposingThreadIdsRef.current,
      clearDraftThread,
      clearTerminalState,
      removeThreadFromSplitViews,
      clearTemporaryThread,
    });
  }, [
    activeThreadId,
    clearDraftThread,
    clearTerminalState,
    clearTemporaryThread,
    removeThreadFromSplitViews,
    temporaryThreadIds,
  ]);
}

// Module-level so the try/finally stays outside the compiled hook body —
// React Compiler does not yet support try/finally and would otherwise skip
// optimizing the whole hook.
async function disposeTemporaryThread(input: {
  temporaryThreadId: ThreadId;
  disposingThreadIds: Set<ThreadId>;
  clearDraftThread: (threadId: ThreadId) => void;
  clearTerminalState: (threadId: ThreadId) => void;
  removeThreadFromSplitViews: (threadId: ThreadId) => void;
  clearTemporaryThread: (threadId: ThreadId) => void;
}): Promise<void> {
  const { temporaryThreadId } = input;
  try {
    const api = readNativeApi();
    const productConversation = useProductStore
      .getState()
      .conversations.find((conversation) => String(conversation.id) === String(temporaryThreadId));
    if (productConversation && !api) return;

    if (api) {
      await api.terminal
        .close({ threadId: temporaryThreadId, deleteHistory: true })
        .catch(() => undefined);

      if (productConversation) {
        const productApi = readProductNativeApi();
        const snapshot = await productApi.getConversationSnapshot({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: ProductConversationId.makeUnsafe(temporaryThreadId),
        });
        const latestRun = snapshot.readModel.runs.at(-1);
        const receiptState = latestRun?.receipt.receipt.state ?? null;
        if (latestRun && (receiptState === "accepted" || receiptState === "running")) {
          const stopped = await productApi.controlRun({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId: snapshot.readModel.conversation.id,
            runId: latestRun.id,
            control: "abort",
            text: null,
          });
          if (stopped.result === "unsupported" || stopped.result === "unknown") {
            throw new Error(stopped.message);
          }
        } else if (receiptState === "pending" || receiptState === "delivery_unknown") {
          throw new Error("Temporary Conversation cleanup is waiting for Run delivery truth.");
        }
        await deleteProductConversation(temporaryThreadId, productApi);
        void reconcileDeletedThreadFromClient({
          threadId: temporaryThreadId,
          removeDeletedThreadFromClientState:
            useStore.getState().removeDeletedThreadFromClientState,
        });
      }
    }

    input.clearDraftThread(temporaryThreadId);
    input.clearTerminalState(temporaryThreadId);
    input.removeThreadFromSplitViews(temporaryThreadId);
    input.clearTemporaryThread(temporaryThreadId);
  } finally {
    input.disposingThreadIds.delete(temporaryThreadId);
  }
}
