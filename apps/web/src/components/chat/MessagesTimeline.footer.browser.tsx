// FILE: MessagesTimeline.footer.browser.tsx
// Purpose: Browser geometry and interaction regression for the settled assistant footer.
// Layer: Vitest browser tests

import "../../index.css";

import { MessageId } from "@omnimind/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { MessagesTimeline } from "./MessagesTimeline";

const VIEWPORT_WIDTHS = [480, 960, 1440] as const;

function SettledAssistantTimeline() {
  return (
    <MessagesTimeline
      hasMessages
      isWorking={false}
      activeTurnInProgress={false}
      activeTurnStartedAt={null}
      timelineEntries={[
        {
          id: "entry-footer-alignment",
          kind: "message",
          createdAt: "2026-03-17T19:12:29.000Z",
          message: {
            id: MessageId.makeUnsafe("message-footer-alignment"),
            role: "assistant",
            text: "Alignment reference text.",
            createdAt: "2026-03-17T19:12:29.000Z",
            completedAt: "2026-03-17T19:12:30.000Z",
            streaming: false,
          },
        },
      ]}
      turnDiffSummaryByAssistantMessageId={new Map()}
      nowIso="2026-03-17T19:12:30.000Z"
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

function createTimelineHost(widthPx: number): HTMLDivElement {
  const host = document.createElement("div");
  host.style.cssText = `display:flex;width:${widthPx}px;height:360px;overflow:hidden;`;
  document.body.append(host);
  return host;
}

async function settleLayout(): Promise<void> {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

describe("MessagesTimeline settled assistant footer", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each(VIEWPORT_WIDTHS)(
    "[geometry:linux] aligns the first action glyph with message text at %ipx",
    async (widthPx) => {
      const host = createTimelineHost(widthPx);
      const screen = await render(<SettledAssistantTimeline />, {
        container: host,
      });

      try {
        await settleLayout();

        const row = document.querySelector<HTMLElement>(
          '[data-message-id="message-footer-alignment"]',
        );
        const messageText = row?.querySelector<HTMLElement>(".chat-markdown p");
        const copyButton = row?.querySelector<HTMLButtonElement>(
          'button[aria-label="Copy message"]',
        );
        const copyGlyph = copyButton?.querySelector<HTMLElement>('[data-slot="central-icon"]');
        expect(row).not.toBeNull();
        expect(messageText).not.toBeNull();
        expect(copyButton).not.toBeNull();
        expect(copyGlyph).not.toBeNull();
        if (!row || !messageText || !copyButton || !copyGlyph) return;

        const messageRect = messageText.getBoundingClientRect();
        const buttonRect = copyButton.getBoundingClientRect();
        const glyphRect = copyGlyph.getBoundingClientRect();
        const buttonFontSize = Number.parseFloat(getComputedStyle(copyButton).fontSize);

        expect(Math.abs(glyphRect.left - messageRect.left)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(buttonRect.width - buttonFontSize * 1.75)).toBeLessThanOrEqual(0.5);
        expect(buttonRect.width).toBeGreaterThan(glyphRect.width);
        expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(
          host.getBoundingClientRect().right + 0.5,
        );

        expect(getComputedStyle(copyButton).opacity).toBe("0");
        expect(copyButton.className).toContain("group-hover:opacity-100");
        expect(copyButton.className).toContain("group-focus-within:opacity-100");

        expect(copyButton.tabIndex).toBe(0);
        copyButton.focus();
        expect(document.activeElement).toBe(copyButton);
        await expect.poll(() => getComputedStyle(copyButton).opacity).toBe("1");
      } finally {
        screen.unmount();
        host.remove();
      }
    },
  );
});
