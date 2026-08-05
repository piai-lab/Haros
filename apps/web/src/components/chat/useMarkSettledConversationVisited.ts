// FILE: useMarkSettledConversationVisited.ts
// Purpose: Marks a settled turn visited only while its retained Conversation is active.

import type { ThreadId } from "@omnimind/contracts";
import { useCallback, useEffect } from "react";

import type { ChatConversationActivitySignal } from "../../lib/chatPaneScope";

export function useMarkSettledConversationVisited(input: {
  readonly activity?: ChatConversationActivitySignal;
  readonly threadId: ThreadId | null;
  readonly settled: boolean;
  readonly completedAt: string | null;
  readonly lastVisitedAt: string | null;
  readonly markVisited: (threadId: ThreadId) => void;
}) {
  const markIfCurrent = useCallback(() => {
    if (input.activity && !input.activity.isActive()) return;
    if (!input.threadId || !input.settled || !input.completedAt) return;
    const turnCompletedAt = Date.parse(input.completedAt);
    if (Number.isNaN(turnCompletedAt)) return;
    const lastVisitedAt = input.lastVisitedAt ? Date.parse(input.lastVisitedAt) : Number.NaN;
    if (!Number.isNaN(lastVisitedAt) && lastVisitedAt >= turnCompletedAt) return;
    input.markVisited(input.threadId);
  }, [
    input.activity,
    input.completedAt,
    input.lastVisitedAt,
    input.markVisited,
    input.settled,
    input.threadId,
  ]);

  useEffect(markIfCurrent, [markIfCurrent]);
  useEffect(
    () => input.activity?.subscribeToActivation(markIfCurrent),
    [input.activity, markIfCurrent],
  );
}
