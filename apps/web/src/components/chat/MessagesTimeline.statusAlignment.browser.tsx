// FILE: MessagesTimeline.statusAlignment.browser.tsx
// Purpose: Browser geometry regression for live and settled turn-status leading edges.
// Layer: Vitest browser tests

import "../../index.css";

import { MessageId } from "@omnimind/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { MessagesTimeline } from "./MessagesTimeline";

const VIEWPORT_WIDTHS = [480, 960, 1440] as const;
const LIVE_STATUS_CASES = VIEWPORT_WIDTHS.flatMap((widthPx) =>
  (["light", "dark"] as const).map((theme) => [widthPx, theme] as const),
);

const sharedProps = {
  turnDiffSummaryByAssistantMessageId: new Map(),
  nowIso: "2026-03-17T19:12:30.000Z",
  expandedWorkGroups: {},
  onToggleWorkGroup: () => {},
  onOpenTurnDiff: () => {},
  revertTurnCountByUserMessageId: new Map(),
  onRevertUserMessage: () => {},
  isRevertingCheckpoint: false,
  onImageExpand: () => {},
  markdownCwd: undefined,
  timestampFormat: "locale" as const,
  workspaceRoot: undefined,
};

function LiveStatusTimeline({ theme }: { theme: "light" | "dark" }) {
  return (
    <MessagesTimeline
      {...sharedProps}
      hasMessages
      isWorking
      activeTurnInProgress
      activeTurnStartedAt="2026-03-17T19:12:28.000Z"
      timelineEntries={[]}
      resolvedTheme={theme}
    />
  );
}

function SettledStatusTimeline() {
  return (
    <MessagesTimeline
      {...sharedProps}
      hasMessages
      isWorking={false}
      activeTurnInProgress={false}
      activeTurnStartedAt={null}
      timelineEntries={[
        {
          id: "entry-work-inline",
          kind: "work",
          createdAt: "2026-03-17T19:12:28.000Z",
          entry: {
            id: "work-inline-1",
            createdAt: "2026-03-17T19:12:28.000Z",
            label: "turn",
            tone: "info",
          },
        },
        {
          id: "entry-assistant-inline",
          kind: "message",
          createdAt: "2026-03-17T19:12:29.000Z",
          message: {
            id: MessageId.makeUnsafe("message-assistant-inline"),
            role: "assistant",
            text: "Alignment reference text.",
            createdAt: "2026-03-17T19:12:29.000Z",
            completedAt: "2026-03-17T19:12:30.000Z",
            streaming: false,
          },
        },
      ]}
      resolvedTheme="dark"
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

describe("MessagesTimeline turn-status alignment", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each(LIVE_STATUS_CASES)(
    "keeps the live header and orb on the same safe leading edge at %ipx in %s mode",
    async (widthPx, theme) => {
      const host = createTimelineHost(widthPx);
      const screen = await render(<LiveStatusTimeline theme={theme} />, { container: host });
      try {
        await settleLayout();

        const headerRow = host.querySelector<HTMLElement>(
          '[data-timeline-row-kind="working-header"]',
        );
        const workingRow = host.querySelector<HTMLElement>('[data-timeline-row-kind="working"]');
        const headerLabel = headerRow?.firstElementChild?.firstElementChild as HTMLElement | null;
        const orb = workingRow?.querySelector<HTMLCanvasElement>(
          'canvas[data-composing-orb="official-20px"]',
        );

        expect(headerRow).not.toBeNull();
        expect(workingRow).not.toBeNull();
        expect(headerLabel?.textContent).toContain("Working for 2s");
        expect(orb).not.toBeNull();
        if (!headerRow || !workingRow || !headerLabel || !orb) return;

        const headerLeft = headerLabel.getBoundingClientRect().left;
        const orbLeft = orb.getBoundingClientRect().left;
        expect(Math.abs(headerLeft - orbLeft)).toBeLessThanOrEqual(0.5);
        expect(headerLeft).toBeGreaterThanOrEqual(headerRow.getBoundingClientRect().left + 3.5);
        expect(orbLeft).toBeGreaterThanOrEqual(workingRow.getBoundingClientRect().left + 3.5);
      } finally {
        screen.unmount();
        host.remove();
      }
    },
  );

  it.each(VIEWPORT_WIDTHS)(
    "keeps the settled status trigger inside its row safe edge at %ipx",
    async (widthPx) => {
      const host = createTimelineHost(widthPx);
      const screen = await render(<SettledStatusTimeline />, { container: host });

      try {
        await settleLayout();
        const row = host.querySelector<HTMLElement>('[data-message-id="message-assistant-inline"]');
        const trigger = [...(row?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find(
          (button) => button.textContent?.includes("Worked for"),
        );
        expect(row).not.toBeNull();
        expect(trigger).not.toBeNull();
        if (!row || !trigger) return;

        expect(trigger.getBoundingClientRect().left).toBeGreaterThanOrEqual(
          row.getBoundingClientRect().left + 3.5,
        );
      } finally {
        screen.unmount();
        host.remove();
      }
    },
  );
});
