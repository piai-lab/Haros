// FILE: deletedThreadClientReconciliation.ts
// Purpose: Keeps thread-delete UI state responsive after the server accepts deletion.
// Layer: Web orchestration helper
// Exports: reconcileDeletedThreadFromClient, reconcileDeletedThreadsFromClient

import type { ThreadId } from "@harnessos/contracts";

import { useBrowserStateStore } from "../browserStateStore";
import { readNativeApi } from "../nativeApi";
import { useRightDockStore } from "../rightDockStore";
import { useSplitViewStore } from "../splitViewStore";

interface DeletedThreadClientReconciliationInput {
  threadIds: ReadonlyArray<ThreadId>;
  removeDeletedThreadFromClientState: (threadId: ThreadId) => void;
}

interface DeletedThreadClientReconciliationSingleInput extends Omit<
  DeletedThreadClientReconciliationInput,
  "threadIds"
> {
  threadId: ThreadId;
}

export function findThreadsRemovedByAuthoritativeSnapshot(input: {
  currentThreadIds: ReadonlyArray<ThreadId>;
  snapshotThreadIds: ReadonlyArray<ThreadId>;
}): ThreadId[] {
  const snapshotThreadIds = new Set(input.snapshotThreadIds);
  return input.currentThreadIds.filter((threadId) => !snapshotThreadIds.has(threadId));
}

export function reconcileDeletedThreadFromClient(
  input: DeletedThreadClientReconciliationSingleInput,
): Promise<void> {
  return reconcileDeletedThreadsFromClient({
    threadIds: [input.threadId],
    removeDeletedThreadFromClientState: input.removeDeletedThreadFromClientState,
  });
}

export async function closeDeletedThreadClientResources(
  threadIdsInput: ReadonlyArray<ThreadId>,
): Promise<void> {
  const threadIds = [...new Set(threadIdsInput)];
  const browser = readNativeApi()?.browser;
  if (browser) {
    // Desktop seals replay and destroys native runtimes before Renderer drops
    // its transient projections. A stale reveal therefore cannot win cleanup.
    await Promise.all(
      threadIds.map((threadId) =>
        browser.closeDeletedThreadResources({ threadId }).catch((error: unknown) => {
          console.error("Failed to close Browser resources for deleted thread", {
            threadId,
            errorKind: error instanceof Error ? error.name : "unknown",
          });
        }),
      ),
    );
  }
  for (const threadId of threadIds) {
    useRightDockStore.getState().clearThreadDockState(threadId);
    useSplitViewStore.getState().removeThreadFromSplitViews(threadId);
    useBrowserStateStore.getState().removeThreadState(threadId);
  }
}

// Delete reconciliation is intentionally local-only; shell snapshots/events still own
// authoritative refresh and can arrive stale while a delete is propagating.
export async function reconcileDeletedThreadsFromClient(
  input: DeletedThreadClientReconciliationInput,
): Promise<void> {
  const threadIds = [...new Set(input.threadIds)];
  if (threadIds.length === 0) {
    return;
  }

  for (const threadId of threadIds) {
    input.removeDeletedThreadFromClientState(threadId);
  }
  await closeDeletedThreadClientResources(threadIds);
}
