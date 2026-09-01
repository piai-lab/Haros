import type { ThreadId } from "@harnessos/contracts";

import type { BrowserPanelOpenRequestOutcome } from "../../hooks/useBrowserPanelDesktopBridge";
import { useRightDockStore } from "../../rightDockStore";
import { findLeafPaneById } from "../../splitView.logic";
import type { PaneId, SplitView } from "../../splitViewStore";
import { useSplitViewStore } from "../../splitViewStore";

export function openRightDockBrowserPaneForPresentation(
  threadId: ThreadId,
  presentationId: string,
): (disposition: "restore" | "preserve") => void {
  useRightDockStore.getState().acquireBrowserPresentation(threadId, presentationId);
  return (disposition) => {
    useRightDockStore.getState().releaseBrowserPresentation(threadId, presentationId, disposition);
  };
}

interface SingleBrowserPanelOpenRequestInput {
  readonly presentationId: string;
  readonly acquireLease: boolean;
  readonly currentThreadId: ThreadId;
  readonly requestedThreadId: ThreadId;
  readonly requestImmediateBrowserHydration: () => void;
  readonly openBrowserPane: (threadId: ThreadId) => void;
}

export function routeSingleBrowserPanelOpenRequest(
  input: SingleBrowserPanelOpenRequestInput,
): BrowserPanelOpenRequestOutcome {
  const release = input.acquireLease
    ? openRightDockBrowserPaneForPresentation(input.requestedThreadId, input.presentationId)
    : undefined;
  if (input.requestedThreadId !== input.currentThreadId) {
    return { result: { status: "background" }, ...(release ? { release } : {}) };
  }
  input.requestImmediateBrowserHydration();
  if (!input.acquireLease) input.openBrowserPane(input.currentThreadId);
  return { result: { status: "visible" }, ...(release ? { release } : {}) };
}

interface SplitBrowserPanelOpenRequestInput {
  readonly presentationId: string;
  readonly acquireLease: boolean;
  readonly splitView: SplitView;
  readonly requestedThreadId: ThreadId;
  readonly openBrowserPanel: (paneId: PaneId) => void;
}

export function routeSplitBrowserPanelOpenRequest(
  input: SplitBrowserPanelOpenRequestInput,
): BrowserPanelOpenRequestOutcome {
  const requestedPaneId = findPaneIdForThread(input.splitView, input.requestedThreadId);
  const requestedPane = requestedPaneId
    ? findLeafPaneById(input.splitView.root, requestedPaneId)
    : null;
  const focusedPane = findLeafPaneById(input.splitView.root, input.splitView.focusedPaneId);
  if (!requestedPane) {
    if (!input.acquireLease) return { result: { status: "unavailable" } };
    return {
      result: { status: "background" },
      release: openRightDockBrowserPaneForPresentation(
        input.requestedThreadId,
        input.presentationId,
      ),
    };
  }
  if (!input.acquireLease) {
    if (focusedPane?.id === requestedPane.id) input.openBrowserPanel(requestedPane.id);
    return {
      result: { status: focusedPane?.id === requestedPane.id ? "visible" : "background" },
    };
  }
  useSplitViewStore.getState().acquireBrowserPresentation({
    presentationId: input.presentationId,
    splitViewId: input.splitView.id,
    paneId: requestedPane.id,
    threadId: input.requestedThreadId,
  });
  return {
    result: { status: focusedPane?.id === requestedPane.id ? "visible" : "background" },
    release: (disposition) => {
      useSplitViewStore
        .getState()
        .releaseBrowserPresentation(input.requestedThreadId, input.presentationId, disposition);
    },
  };
}

function findPaneIdForThread(splitView: SplitView, threadId: ThreadId): PaneId | null {
  const visit = (node: SplitView["root"]): PaneId | null => {
    if (node.kind === "leaf") return node.threadId === threadId ? node.id : null;
    return visit(node.first) ?? visit(node.second);
  };
  return visit(splitView.root);
}
