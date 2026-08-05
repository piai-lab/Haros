import { ProductConversationId, ThreadId } from "@omnimind/contracts";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";

import { useAppSettings } from "../appSettings";
import { toastManager } from "../components/ui/toast";
import { resolveVisibleToastThreadIds } from "../components/ui/toastRouteVisibility";
import { useDiffRouteSearch } from "../hooks/useDiffRouteSearch";
import { selectRightDockState, useRightDockStore } from "../rightDockStore";
import { selectSplitView, useSplitViewStore } from "../splitViewStore";
import { useProductStore } from "../store/productStore";
import {
  advanceProductCompletionTracker,
  buildProductCompletionCopy,
  createProductCompletionTrackerState,
  type ProductCompletionCandidate,
} from "./productCompletion.logic";

interface NotificationCopy {
  readonly title: string;
  readonly body: string;
}

export function isRendererForeground(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible" && document.hasFocus();
}

function focusProductConversation(
  candidate: Pick<ProductCompletionCandidate, "conversationId" | "workspaceKind">,
  navigate: ReturnType<typeof useNavigate>,
): void {
  const threadId = ThreadId.makeUnsafe(candidate.conversationId);
  void navigate({
    to: "/$threadId",
    params: { threadId },
    search: (previous) => ({
      ...previous,
      splitViewId: undefined,
      surface: candidate.workspaceKind === "chat" ? "chat" : undefined,
    }),
  });
}

async function showSystemProductNotification(
  copy: NotificationCopy,
  candidate: ProductCompletionCandidate,
  navigate: ReturnType<typeof useNavigate>,
): Promise<boolean> {
  if (window.desktopBridge) {
    const supported = await window.desktopBridge.notifications.isSupported();
    if (!supported) return false;
    return window.desktopBridge.notifications.show({
      title: copy.title,
      body: copy.body,
      silent: false,
      suppressWhenForeground: true,
      productConversationId: candidate.conversationId,
      productSurface: candidate.workspaceKind === "chat" ? "chat" : "agent",
    });
  }

  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const notification = new Notification(copy.title, {
    body: copy.body,
    tag: `product-run:${candidate.conversationId}:${candidate.runId}`,
  });
  notification.addEventListener("click", () => {
    window.focus();
    focusProductConversation(candidate, navigate);
  });
  return true;
}

function showProductToast(
  copy: NotificationCopy,
  candidate: ProductCompletionCandidate,
  navigate: ReturnType<typeof useNavigate>,
): void {
  const threadId = ThreadId.makeUnsafe(candidate.conversationId);
  toastManager.add({
    type: "success",
    title: copy.title,
    description: copy.body,
    data: {
      allowCrossThreadVisibility: true,
      compactContextual: true,
      threadId,
      dismissAfterVisibleMs: 8000,
    },
    actionProps: {
      "aria-label": `Open ${copy.title}`,
      children: "Open",
      onClick: () => focusProductConversation(candidate, navigate),
    },
  });
}

/** Product-only completion observer. It consumes typed Product detail and no donor execution fact. */
export function ProductCompletionNotifications() {
  const { settings } = useAppSettings();
  const navigate = useNavigate();
  const activeThreadId = useParams({
    strict: false,
    select: (params) =>
      typeof params.threadId === "string" ? ThreadId.makeUnsafe(params.threadId) : null,
  });
  const routeSearch = useDiffRouteSearch();
  const splitView = useSplitViewStore(
    useMemo(() => selectSplitView(routeSearch.splitViewId ?? null), [routeSearch.splitViewId]),
  );
  const rightDockState = useRightDockStore((store) =>
    activeThreadId ? selectRightDockState(activeThreadId)(store) : null,
  );
  const visibleThreadIds = useMemo(
    () => resolveVisibleToastThreadIds({ activeThreadId, splitView, rightDockState }),
    [activeThreadId, rightDockState, splitView],
  );
  const shellHydrated = useProductStore((store) => store.shellHydrated);
  const conversations = useProductStore((store) => store.conversations);
  const detailByConversation = useProductStore((store) => store.detailByConversation);
  const trackerRef = useRef(createProductCompletionTrackerState());
  const notificationsEnabled =
    settings.enableTaskCompletionToasts || settings.enableSystemTaskCompletionNotifications;

  useEffect(() => {
    const onMenuAction = window.desktopBridge?.onMenuAction;
    if (typeof onMenuAction !== "function") return;
    const unsubscribe = onMenuAction((action) => {
      const chatPrefix = "notification-open-product-chat:";
      const agentPrefix = "notification-open-product-agent:";
      const prefix = action.startsWith(chatPrefix)
        ? chatPrefix
        : action.startsWith(agentPrefix)
          ? agentPrefix
          : null;
      if (!prefix) return;
      const conversationId = action.slice(prefix.length).trim();
      if (!conversationId) return;
      focusProductConversation(
        {
          conversationId: ProductConversationId.makeUnsafe(conversationId),
          workspaceKind: prefix === chatPrefix ? "chat" : "folder-backed",
        },
        navigate,
      );
    });
    return () => unsubscribe?.();
  }, [navigate]);

  useEffect(() => {
    const result = advanceProductCompletionTracker(trackerRef.current, {
      enabled: notificationsEnabled,
      shellHydrated,
      conversations,
      detailByConversation,
    });
    trackerRef.current = result.state;

    const store = useProductStore.getState();
    for (const conversationId of result.retainConversationIds) {
      store.retainConversation(conversationId);
    }
    for (const conversationId of result.releaseConversationIds) {
      store.releaseConversation(conversationId);
    }

    for (const candidate of result.candidates) {
      const copy = buildProductCompletionCopy(candidate);
      const threadId = ThreadId.makeUnsafe(candidate.conversationId);
      if (settings.enableTaskCompletionToasts && !visibleThreadIds.has(threadId)) {
        showProductToast(copy, candidate, navigate);
      }
      // Renderer suppression is the first defense. Desktop repeats the decision from its own
      // BrowserWindow truth, covering focus held by the native browser guest.
      if (settings.enableSystemTaskCompletionNotifications && !isRendererForeground()) {
        void showSystemProductNotification(copy, candidate, navigate);
      }
    }
  }, [
    conversations,
    detailByConversation,
    navigate,
    notificationsEnabled,
    settings.enableSystemTaskCompletionNotifications,
    settings.enableTaskCompletionToasts,
    shellHydrated,
    visibleThreadIds,
  ]);

  useEffect(
    () => () => {
      const store = useProductStore.getState();
      for (const conversationId of trackerRef.current.retainedConversationIds) {
        store.releaseConversation(ProductConversationId.makeUnsafe(conversationId));
      }
      trackerRef.current = createProductCompletionTrackerState();
    },
    [],
  );

  return null;
}
