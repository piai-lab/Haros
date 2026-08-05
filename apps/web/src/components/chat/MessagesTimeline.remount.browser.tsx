// FILE: MessagesTimeline.remount.browser.tsx
// Purpose: Browser regression for reopening a Conversation with an already-settled tail anchor.
// Layer: Transcript browser tests

import "../../index.css";

import { MessageId } from "@omnimind/contracts";
import { type LegendListRef } from "@legendapp/list/react";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import type { TimelineEntry } from "../../session-logic";
import { MessagesTimeline } from "./MessagesTimeline";

const ANCHOR_ID = MessageId.makeUnsafe("reopened-anchor");

function messageEntry(id: string, role: "user" | "assistant", text: string): TimelineEntry {
  return {
    id: `entry-${id}`,
    kind: "message",
    createdAt: "2026-08-05T10:00:00.000Z",
    message: {
      id: MessageId.makeUnsafe(id),
      role,
      text,
      createdAt: "2026-08-05T10:00:00.000Z",
      ...(role === "assistant" ? { completedAt: "2026-08-05T10:00:01.000Z" } : {}),
      streaming: false,
    },
  };
}

function ReopenedTimeline(props: { listRef: React.RefObject<LegendListRef | null> }) {
  const entries: TimelineEntry[] = [];
  for (let index = 0; index < 8; index += 1) {
    entries.push(messageEntry(`user-${index}`, "user", `Earlier question ${index}`));
    entries.push(
      messageEntry(
        `assistant-${index}`,
        "assistant",
        `Earlier response ${index}. ${"Settled transcript content. ".repeat(6)}`,
      ),
    );
  }
  entries.push(messageEntry(ANCHOR_ID, "user", "Previously sent question"));
  entries.push(
    messageEntry(
      "reopened-answer",
      "assistant",
      `Previously completed answer. ${"More settled content. ".repeat(10)}`,
    ),
  );

  return (
    <MessagesTimeline
      hasMessages
      isWorking={false}
      activeTurnInProgress={false}
      activeTurnStartedAt={null}
      listRef={props.listRef}
      tailAnchorMessageId={ANCHOR_ID}
      timelineEntries={entries}
      turnDiffSummaryByAssistantMessageId={new Map()}
      nowIso="2026-08-05T10:00:02.000Z"
      expandedWorkGroups={{}}
      onToggleWorkGroup={() => {}}
      onOpenTurnDiff={() => {}}
      revertTurnCountByUserMessageId={new Map()}
      onRevertUserMessage={() => {}}
      isRevertingCheckpoint={false}
      onImageExpand={() => {}}
      markdownCwd={undefined}
      resolvedTheme="dark"
      timestampFormat="locale"
      workspaceRoot={undefined}
    />
  );
}

describe("MessagesTimeline remount recovery", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("lands an inherited tail anchor at its settled coordinate without replaying the slide", async () => {
    const host = document.createElement("div");
    host.style.cssText = "height:420px;width:720px;overflow:hidden";
    document.body.append(host);
    const listRef = { current: null } as React.RefObject<LegendListRef | null>;
    const screen = await render(<ReopenedTimeline listRef={listRef} />, { container: host });

    try {
      await expect.poll(() => listRef.current?.getScrollableNode?.() != null).toBe(true);
      const offsets: number[] = [];
      for (let frame = 0; frame < 24; frame += 1) {
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        const container = listRef.current?.getScrollableNode?.();
        const anchor = host.querySelector<HTMLElement>(`[data-message-id="${ANCHOR_ID}"]`);
        if (container instanceof HTMLElement && anchor && anchor.getClientRects().length > 0) {
          offsets.push(anchor.getBoundingClientRect().top - container.getBoundingClientRect().top);
        }
      }

      expect(offsets.length).toBeGreaterThan(0);
      const topGap =
        Number.parseFloat(
          getComputedStyle(listRef.current?.getScrollableNode?.() as HTMLElement).paddingTop,
        ) || 0;
      expect(Math.abs(offsets[0]! - topGap)).toBeLessThanOrEqual(8);
      expect(Math.max(...offsets) - Math.min(...offsets)).toBeLessThanOrEqual(2);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });
});
