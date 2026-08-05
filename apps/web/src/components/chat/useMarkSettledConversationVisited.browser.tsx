// FILE: useMarkSettledConversationVisited.browser.tsx
// Purpose: Browser proof that retained background completion cannot consume unread state.

import { ThreadId } from "@omnimind/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { createChatConversationActivitySignal } from "../../lib/chatPaneScope";
import { useMarkSettledConversationVisited } from "./useMarkSettledConversationVisited";

const THREAD_ID = ThreadId.makeUnsafe("visited-retained-product-thread");

function Harness(props: {
  readonly activity: ReturnType<typeof createChatConversationActivitySignal>;
  readonly completedAt: string | null;
  readonly lastVisitedAt: string | null;
  readonly markVisited: (threadId: ThreadId) => void;
}) {
  useMarkSettledConversationVisited({
    activity: props.activity,
    threadId: THREAD_ID,
    settled: props.completedAt !== null,
    completedAt: props.completedAt,
    lastVisitedAt: props.lastVisitedAt,
    markVisited: props.markVisited,
  });
  return null;
}

describe("retained Conversation visited ownership", () => {
  afterEach(async () => cleanup());

  it("does not mark a background completion visited until the Conversation activates", async () => {
    const activity = createChatConversationActivitySignal(false);
    const markVisited = vi.fn();
    const mounted = await render(
      <Harness
        activity={activity}
        completedAt="2026-08-05T00:00:02.000Z"
        lastVisitedAt="2026-08-05T00:00:01.000Z"
        markVisited={markVisited}
      />,
    );
    await Promise.resolve();
    expect(markVisited).not.toHaveBeenCalled();

    activity.setActive(true);
    expect(markVisited).not.toHaveBeenCalled();
    activity.flushActivation();
    expect(markVisited).toHaveBeenCalledOnce();
    expect(markVisited).toHaveBeenCalledWith(THREAD_ID);

    await mounted.rerender(
      <Harness
        activity={activity}
        completedAt="2026-08-05T00:00:02.000Z"
        lastVisitedAt="2026-08-05T00:00:02.000Z"
        markVisited={markVisited}
      />,
    );
    expect(markVisited).toHaveBeenCalledOnce();
  });
});
