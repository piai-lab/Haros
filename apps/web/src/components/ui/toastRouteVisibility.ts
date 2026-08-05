// FILE: toastRouteVisibility.ts
// Purpose: Keeps thread-scoped toasts visible for every thread currently rendered in the route.
// Layer: UI helpers
// Exports: visible-thread resolver shared by toast containers and split-aware tests

import type { ThreadId } from "@omnimind/contracts";
import { resolveSplitViewThreadIds, type SplitView } from "../../splitViewStore";
import { resolveActivePane, type RightDockThreadState } from "../../rightDockStore.logic";

export function resolveVisibleToastThreadIds(input: {
  activeThreadId: ThreadId | null;
  splitView: SplitView | null;
  rightDockState?: RightDockThreadState | null;
}): ReadonlySet<ThreadId> {
  if (input.splitView) {
    return new Set(resolveSplitViewThreadIds(input.splitView));
  }
  const visibleThreadIds = input.activeThreadId
    ? new Set<ThreadId>([input.activeThreadId])
    : new Set<ThreadId>();
  const activeDockPane = input.rightDockState ? resolveActivePane(input.rightDockState) : null;
  if (activeDockPane?.kind === "sidechat" && activeDockPane.threadId) {
    visibleThreadIds.add(activeDockPane.threadId);
  }
  return visibleThreadIds;
}

export function shouldRenderToastForVisibleThreads(input: {
  allowCrossThreadVisibility?: boolean | undefined;
  toastThreadId?: ThreadId | null | undefined;
  visibleThreadIds: ReadonlySet<ThreadId>;
}): boolean {
  if (input.allowCrossThreadVisibility) {
    return true;
  }
  const toastThreadId = input.toastThreadId;
  if (!toastThreadId) {
    return true;
  }
  return input.visibleThreadIds.has(toastThreadId);
}
