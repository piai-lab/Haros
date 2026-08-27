// FILE: MessagesTimeline.toolGroupCollapse.browser.tsx
// Purpose: Browser regressions for collapsing settled tool-call runs into
//          summary rows ("Ran 4 commands") once a newer narration block starts.
// Layer: Vitest browser tests

import "../../index.css";

import { MessageId } from "@omnimind/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { MessagesTimeline } from "./MessagesTimeline";
import type { TimelineEntry } from "../../session-logic";

function assistantEntry(id: string, text: string, streaming: boolean): TimelineEntry {
  return {
    id: `entry-${id}`,
    kind: "message",
    createdAt: "2026-03-17T19:12:28.000Z",
    message: {
      id: MessageId.makeUnsafe(id),
      role: "assistant",
      text,
      createdAt: "2026-03-17T19:12:28.000Z",
      streaming,
    },
  };
}

function commandEntry(id: string, command: string): TimelineEntry {
  return {
    id: `entry-${id}`,
    kind: "work",
    createdAt: "2026-03-17T19:12:28.000Z",
    entry: {
      id,
      createdAt: "2026-03-17T19:12:28.000Z",
      label: "Ran command",
      tone: "tool",
      itemType: "command_execution",
      toolStatus: "completed",
      command,
    },
  };
}

function thinkingEntry(id: string, label: string): TimelineEntry {
  return {
    id: `entry-${id}`,
    kind: "work",
    createdAt: "2026-03-17T19:12:28.000Z",
    entry: {
      id,
      createdAt: "2026-03-17T19:12:28.000Z",
      label,
      tone: "thinking",
    },
  };
}

const SETTLED_COMMANDS = [
  "bun run lint",
  "bun run typecheck",
  "bun run build",
  "node scripts/check.mjs",
];
// Commands whose display text passes through verbatim (no humanized rewrite).
const LIVE_COMMANDS = ["git status", "node scripts/tail.mjs"];

function ToolGroupCollapseTimeline(props: { timelineEntries: TimelineEntry[] }) {
  return (
    <MessagesTimeline
      hasMessages
      isWorking
      activeTurnInProgress
      activeTurnStartedAt="2026-03-17T19:12:20.000Z"
      timelineEntries={props.timelineEntries}
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

function createTimelineHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.style.cssText = "display:flex;width:600px;height:520px;overflow:hidden;";
  document.body.append(host);
  return host;
}

function findSummaryTrigger(label: string): HTMLButtonElement | null {
  return (
    [...document.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")].find((button) =>
      (button.textContent ?? "").includes(label),
    ) ?? null
  );
}

function isVisibleOutsideClosedDisclosure(text: string): boolean {
  // The innermost element containing the text (command labels may span nested
  // spans, so a leaf-only check would miss them).
  const match = [...document.querySelectorAll<HTMLElement>("*")].findLast((element) =>
    (element.textContent ?? "").includes(text),
  );
  return match !== undefined && match.closest("[aria-hidden='true']") === null;
}

describe("MessagesTimeline tool group collapse", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps both command runs behind nested summaries inside the live process", async () => {
    const host = createTimelineHost();
    const screen = await render(
      <ToolGroupCollapseTimeline
        timelineEntries={[
          assistantEntry("narration-1", "Looking at the failing checks first.", false),
          ...SETTLED_COMMANDS.map((command, index) => commandEntry(`settled-${index}`, command)),
          assistantEntry("narration-2", "Now inspecting the working tree.", true),
          ...LIVE_COMMANDS.map((command, index) => commandEntry(`live-${index}`, command)),
        ]}
      />,
      { container: host },
    );

    try {
      await expect.poll(() => findSummaryTrigger("Ran 4 commands") !== null).toBe(true);
      const trigger = findSummaryTrigger("Ran 4 commands")!;
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      // The default 14px reading base maps work evidence to its semantic 13px
      // activity role instead of shrinking the entire application back to 12px.
      expect(getComputedStyle(trigger).fontSize).toBe("13px");

      // Closed groups do not mount every tool row; this keeps large settled
      // transcripts cheap until the user asks to inspect the details.
      for (const command of SETTLED_COMMANDS) {
        expect(document.body.textContent ?? "").not.toContain(command);
      }

      const liveTrigger = findSummaryTrigger("Ran 2 commands");
      expect(liveTrigger).not.toBeNull();
      expect(liveTrigger?.getAttribute("aria-expanded")).toBe("false");
      for (const command of LIVE_COMMANDS) {
        expect(document.body.textContent ?? "").not.toContain(command);
      }

      trigger.click();

      await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("true");
      for (const command of SETTLED_COMMANDS) {
        await expect.poll(() => isVisibleOutsideClosedDisclosure(command)).toBe(true);
      }

      trigger.click();

      await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("false");
      // Rows remain mounted only long enough for the shared 220ms close motion.
      await expect
        .poll(() => (document.body.textContent ?? "").includes(SETTLED_COMMANDS[0]!))
        .toBe(false);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("keeps a thinking boundary between independently collapsed command runs", async () => {
    const host = createTimelineHost();
    // One live inline group: settled commands, then a thinking boundary, then
    // the live tail. The run before the boundary must collapse while the turn
    // is still in progress — not only once it finishes.
    const screen = await render(
      <ToolGroupCollapseTimeline
        timelineEntries={[
          assistantEntry("narration-1", "Looking at the failing checks first.", true),
          ...SETTLED_COMMANDS.map((command, index) => commandEntry(`settled-${index}`, command)),
          thinkingEntry("think-1", "Weighing the next verification step"),
          ...LIVE_COMMANDS.map((command, index) => commandEntry(`live-${index}`, command)),
        ]}
      />,
      { container: host },
    );

    try {
      await expect.poll(() => findSummaryTrigger("Ran 4 commands") !== null).toBe(true);
      expect(findSummaryTrigger("Ran 4 commands")!.getAttribute("aria-expanded")).toBe("false");
      for (const command of SETTLED_COMMANDS) {
        expect(document.body.textContent ?? "").not.toContain(command);
      }

      expect(findSummaryTrigger("Ran 2 commands")).not.toBeNull();
      for (const command of LIVE_COMMANDS) {
        expect(document.body.textContent ?? "").not.toContain(command);
      }
      expect(document.body.textContent ?? "").toContain("Weighing the next verification step");
    } finally {
      await screen.unmount();
      host.remove();
    }
  });
});
