// FILE: useRetainedConversationBoundary.ts
// Purpose: Owns the two-surface retained Conversation identity and activation boundary.

import type { ThreadId } from "@omnimind/contracts";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  createChatConversationActivitySignal,
  SINGLE_CHAT_PANE_SCOPE_ID,
} from "../../lib/chatPaneScope";
import type { SplitViewId } from "../../splitViewStore";

export interface RetainedConversationIdentity {
  readonly threadId: ThreadId;
  readonly surface: "agent" | "chat";
  readonly splitViewId: SplitViewId | null;
  readonly activity: ReturnType<typeof createChatConversationActivitySignal>;
}

export function useRetainedConversationBoundary(input: {
  readonly threadId: ThreadId;
  readonly surface: "agent" | "chat";
  readonly splitViewId: SplitViewId | null;
  readonly paneScopeId: string;
  readonly deferMount: boolean;
  readonly surfaceMode: "single" | "split";
  readonly onMounted: () => void;
}): {
  readonly canMount: boolean;
  readonly conversations: ReadonlyArray<RetainedConversationIdentity>;
  readonly activeMountKey: string | null;
} {
  const mountKey = `${input.paneScopeId}:${input.surface}:${input.threadId}`;
  const [readyMountKey, setReadyMountKey] = useState<string | null>(() =>
    input.deferMount ? null : mountKey,
  );
  const canMount = !input.deferMount || readyMountKey === mountKey;
  const activityByMountKeyRef = useRef(
    new Map<string, ReturnType<typeof createChatConversationActivitySignal>>(),
  );
  let currentActivity = activityByMountKeyRef.current.get(mountKey);
  if (!currentActivity) {
    currentActivity = createChatConversationActivitySignal(false);
    activityByMountKeyRef.current.set(mountKey, currentActivity);
  }
  const currentConversation: RetainedConversationIdentity = {
    threadId: input.threadId,
    surface: input.surface,
    splitViewId: input.splitViewId,
    activity: currentActivity,
  };
  const shouldRetain =
    input.surfaceMode === "single" && input.paneScopeId === SINGLE_CHAT_PANE_SCOPE_ID;
  const [retained, setRetained] = useState<ReadonlyArray<RetainedConversationIdentity>>(() => [
    currentConversation,
  ]);
  const currentIndex = retained.findIndex(
    (conversation) =>
      conversation.threadId === currentConversation.threadId &&
      conversation.surface === currentConversation.surface,
  );
  const visible = shouldRetain
    ? currentIndex >= 0
      ? retained
      : [...retained.slice(-1), currentConversation]
    : [currentConversation];
  const renderable = canMount
    ? visible
    : visible.filter(
        (conversation) =>
          `${input.paneScopeId}:${conversation.surface}:${conversation.threadId}` === readyMountKey,
      );

  const committedActiveMountKey = canMount ? mountKey : readyMountKey;
  useLayoutEffect(() => {
    for (const conversation of visible) {
      conversation.activity.setActive(
        `${input.paneScopeId}:${conversation.surface}:${conversation.threadId}` ===
          committedActiveMountKey,
      );
      conversation.activity.flushActivation();
    }
  }, [committedActiveMountKey, input.paneScopeId, visible]);

  useEffect(() => {
    if (!input.deferMount) return;
    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setReadyMountKey(mountKey));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [input.deferMount, mountKey]);

  useEffect(() => {
    if (!canMount) return;
    if (
      visible.length === retained.length &&
      visible.every(
        (conversation, index) =>
          conversation.threadId === retained[index]?.threadId &&
          conversation.surface === retained[index]?.surface &&
          conversation.splitViewId === retained[index]?.splitViewId,
      )
    ) {
      return;
    }
    setRetained(visible);
  }, [canMount, retained, visible]);

  useEffect(() => {
    if (canMount) input.onMounted();
  }, [canMount, input.onMounted]);

  return { canMount, conversations: renderable, activeMountKey: committedActiveMountKey };
}
