// FILE: MessagesTimeline.turnProcess.browser.tsx
// Purpose: Approval-baseline browser proof for the single turn-level process disclosure.
// Layer: Vitest browser tests

import "../../index.css";

import { MessageId, TurnId } from "@omnimind/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import type { TimelineEntry, WorkLogEntry } from "../../session-logic";
import { MessagesTimeline } from "./MessagesTimeline";

const TURN_ID = TurnId.makeUnsafe("turn-process-browser");
const STARTED_AT = "2026-08-27T01:00:00.000Z";

const baseProps = {
  hasMessages: true,
  isWorking: false,
  activeTurnInProgress: false,
  activeTurnStartedAt: null,
  turnDiffSummaryByAssistantMessageId: new Map(),
  nowIso: "2026-08-27T01:00:08.000Z",
  expandedWorkGroups: {},
  onToggleWorkGroup: () => {},
  onOpenTurnDiff: () => {},
  revertTurnCountByUserMessageId: new Map(),
  onRevertUserMessage: () => {},
  isRevertingCheckpoint: false,
  onImageExpand: () => {},
  markdownCwd: undefined,
  resolvedTheme: "light" as const,
  timestampFormat: "locale" as const,
  workspaceRoot: undefined,
};

function userEntry(id = "user-process-browser"): TimelineEntry {
  return {
    id,
    kind: "message",
    createdAt: STARTED_AT,
    message: {
      id: MessageId.makeUnsafe(id),
      role: "user",
      text: "Please inspect this.",
      createdAt: STARTED_AT,
      streaming: false,
    },
  };
}

function assistantEntry(text = "Final answer outside process."): TimelineEntry {
  return {
    id: "assistant-process-browser",
    kind: "message",
    createdAt: "2026-08-27T01:00:07.000Z",
    message: {
      id: MessageId.makeUnsafe("assistant-process-browser"),
      role: "assistant",
      text,
      turnId: TURN_ID,
      createdAt: "2026-08-27T01:00:07.000Z",
      completedAt: "2026-08-27T01:00:08.000Z",
      streaming: false,
    },
  };
}

function workEntry(
  id: string,
  label: string,
  overrides: Partial<WorkLogEntry> = {},
): TimelineEntry {
  return {
    id: `entry-${id}`,
    kind: "work",
    createdAt: overrides.createdAt ?? "2026-08-27T01:00:02.000Z",
    entry: {
      id,
      createdAt: overrides.createdAt ?? "2026-08-27T01:00:02.000Z",
      turnId: TURN_ID,
      label,
      tone: "info",
      ...overrides,
    },
  };
}

function commandEntry(index: number): TimelineEntry {
  return workEntry(`command-${index}`, `Command ${index}`, {
    tone: "tool",
    itemType: "command_execution",
    command: `echo ${index}`,
    toolStatus: "completed",
  });
}

function createHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.style.cssText = "display:flex;width:760px;height:620px;overflow:hidden";
  document.body.append(host);
  return host;
}

function processRow(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-timeline-row-kind='turn-process']");
}

function processTrigger(): HTMLButtonElement | null {
  return (
    processRow()?.querySelector<HTMLButtonElement>("[data-slot='collapsible-trigger']") ?? null
  );
}

describe("MessagesTimeline turn process approval cases", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("1. settles closed with the final answer outside", async () => {
    const host = createHost();
    const screen = await render(
      <MessagesTimeline
        {...baseProps}
        timelineEntries={[userEntry(), workEntry("read", "Read source"), assistantEntry()]}
      />,
      { container: host },
    );
    try {
      expect(processTrigger()?.getAttribute("aria-expanded")).toBe("false");
      expect(processTrigger()?.getAttribute("aria-controls")).toBeTruthy();
      expect(
        document.getElementById(processTrigger()!.getAttribute("aria-controls")!),
      ).not.toBeNull();
      expect(processTrigger()?.textContent).toContain("Worked for");
      const answer = document.querySelector(
        "[data-assistant-message-id='assistant-process-browser']",
      );
      expect(answer?.textContent).toContain("Final answer outside process.");
      expect(answer?.closest("[data-timeline-row-kind='turn-process']")).toBeNull();
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("2. expands settled process facts on demand", async () => {
    const host = createHost();
    const screen = await render(
      <MessagesTimeline
        {...baseProps}
        timelineEntries={[userEntry(), workEntry("search", "Searched sources"), assistantEntry()]}
      />,
      { container: host },
    );
    try {
      processTrigger()!.click();
      await expect.poll(() => processTrigger()?.getAttribute("aria-expanded")).toBe("true");
      expect(processTrigger()?.getAttribute("aria-expanded")).toBe("true");
      expect(processRow()?.textContent).toContain("Searched sources");
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("3. opens while running and preserves a manual close across stream updates", async () => {
    const host = createHost();
    const runningProps = {
      ...baseProps,
      isWorking: true,
      activeTurnInProgress: true,
      activeTurnId: TURN_ID,
      activeTurnStartedAt: STARTED_AT,
      turnProcessPhase: { kind: "running", turnId: TURN_ID, startedAt: STARTED_AT } as const,
    };
    const screen = await render(
      <MessagesTimeline
        {...runningProps}
        timelineEntries={[userEntry(), workEntry("live-read", "Reading live source")]}
      />,
      { container: host },
    );
    try {
      expect(processTrigger()?.getAttribute("aria-expanded")).toBe("true");
      processTrigger()!.click();
      await expect.poll(() => processTrigger()?.getAttribute("aria-expanded")).toBe("false");
      expect(processTrigger()?.getAttribute("aria-expanded")).toBe("false");
      await screen.rerender(
        <MessagesTimeline
          {...runningProps}
          timelineEntries={[
            userEntry(),
            workEntry("live-read", "Reading live source"),
            workEntry("live-search", "Searching live source"),
          ]}
        />,
      );
      expect(processTrigger()?.getAttribute("aria-expanded")).toBe("false");
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("4. uses a nested summary for a long tool run", async () => {
    const host = createHost();
    const screen = await render(
      <MessagesTimeline
        {...baseProps}
        isWorking
        activeTurnInProgress
        activeTurnId={TURN_ID}
        activeTurnStartedAt={STARTED_AT}
        timelineEntries={[
          userEntry(),
          ...Array.from({ length: 5 }, (_, index) => commandEntry(index + 1)),
        ]}
      />,
      { container: host },
    );
    try {
      const nested = screen.getByRole("button", { name: "Ran 5 commands" }).element();
      expect(nested.getAttribute("aria-expanded")).toBe("false");
      expect(nested.closest("[data-timeline-row-kind='turn-process']")).toBe(processRow());
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("5. keeps failure, retry, and recovery inspectable in order", async () => {
    const host = createHost();
    const screen = await render(
      <MessagesTimeline
        {...baseProps}
        timelineEntries={[
          userEntry(),
          workEntry("failed", "Search failed", { tone: "error" }),
          workEntry("retry", "Retrying search", { tone: "info" }),
          workEntry("recovered", "Search recovered", { tone: "info" }),
          assistantEntry("Recovered final answer."),
        ]}
      />,
      { container: host },
    );
    try {
      processTrigger()!.click();
      await expect.poll(() => processTrigger()?.getAttribute("aria-expanded")).toBe("true");
      const text = processRow()?.textContent ?? "";
      const positions = ["Search failed", "Retrying search", "Search recovered"].map((value) =>
        text.indexOf(value),
      );
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].toSorted((left, right) => left - right));
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("6. keeps waiting action outside a closed Worked for disclosure", async () => {
    const host = createHost();
    const waitingAction = workEntry("web-review", "Review web selection", {
      tone: "tool",
      itemType: "web_search",
      engineWebSurface: {
        status: "waiting-for-user",
        provenance: "engine-native",
        presentation: "omnimind-browser",
        surfaceId: "surface-waiting",
      },
    });
    const screen = await render(
      <MessagesTimeline
        {...baseProps}
        activeTurnId={TURN_ID}
        turnProcessPhase={{
          kind: "waiting-for-user",
          turnId: TURN_ID,
          startedAt: STARTED_AT,
          waitingAt: "2026-08-27T01:00:04.000Z",
        }}
        onOpenEngineWebSurface={() => {}}
        timelineEntries={[
          userEntry(),
          workEntry("waiting-process", "Prepared web candidates"),
          waitingAction,
        ]}
      />,
      { container: host },
    );
    try {
      expect(processTrigger()?.getAttribute("aria-expanded")).toBe("false");
      const action = screen.getByRole("button", { name: "Reopen in OmniMind Browser" }).element();
      expect(action.closest("[data-timeline-row-kind='turn-process']")).toBeNull();
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("7. omits an empty disclosure for a direct answer", async () => {
    const host = createHost();
    const screen = await render(
      <MessagesTimeline
        {...baseProps}
        timelineEntries={[userEntry(), assistantEntry("Direct.")]}
      />,
      { container: host },
    );
    try {
      expect(processRow()).toBeNull();
      expect(document.body.textContent ?? "").toContain("Direct.");
    } finally {
      await screen.unmount();
      host.remove();
    }
  });
});
