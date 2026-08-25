import "../../index.css";

import { MessageId, TurnId } from "@omnimind/contracts";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import type { TimelineEntry } from "../../session-logic";
import { MessagesTimeline } from "./MessagesTimeline";

const TURN_ID = TurnId.makeUnsafe("turn-settled-transition");
const STARTED_AT = "2026-08-25T08:00:00.000Z";
type TimelineEntries = ComponentProps<typeof MessagesTimeline>["timelineEntries"];

function commandEntry(id: string, command: string, turnId = TURN_ID): TimelineEntry {
  return {
    id: `entry-${id}`,
    kind: "work",
    createdAt: "2026-08-25T08:00:01.000Z",
    entry: {
      id,
      createdAt: "2026-08-25T08:00:01.000Z",
      label: "Ran command",
      tone: "tool",
      turnId,
      itemType: "command_execution",
      toolStatus: "completed",
      command,
    },
  };
}

function assistantEntry(
  id: string,
  text: string,
  options: { turnId?: TurnId; streaming?: boolean; completed?: boolean } = {},
): TimelineEntry {
  return {
    id: `entry-${id}`,
    kind: "message",
    createdAt: "2026-08-25T08:00:02.000Z",
    message: {
      id: MessageId.makeUnsafe(id),
      role: "assistant",
      text,
      turnId: options.turnId ?? TURN_ID,
      createdAt: "2026-08-25T08:00:02.000Z",
      ...(options.completed ? { completedAt: "2026-08-25T08:00:03.000Z" } : {}),
      streaming: options.streaming ?? false,
    },
  };
}

function userEntry(id: string, text: string, turnId: TurnId): TimelineEntry {
  return {
    id: `entry-${id}`,
    kind: "message",
    createdAt: "2026-08-25T08:00:04.000Z",
    message: {
      id: MessageId.makeUnsafe(id),
      role: "user",
      text,
      turnId,
      createdAt: "2026-08-25T08:00:04.000Z",
      streaming: false,
    },
  };
}

const commands = Array.from({ length: 6 }, (_, index) =>
  commandEntry(`command-${index + 1}`, `echo command-${index + 1}`),
);

function TimelineHarness(props: {
  active: boolean;
  entries: TimelineEntries;
  activeTurnId?: TurnId | null;
}) {
  return (
    <MessagesTimeline
      hasMessages
      isWorking={props.active}
      activeTurnInProgress={props.active}
      activeTurnStartedAt={props.active ? STARTED_AT : null}
      activeTurnId={props.activeTurnId === undefined ? (props.active ? TURN_ID : null) : props.activeTurnId}
      timelineEntries={props.entries}
      turnDiffSummaryByAssistantMessageId={new Map()}
      expandedWorkGroups={{}}
      onToggleWorkGroup={() => {}}
      onOpenTurnDiff={() => {}}
      revertTurnCountByUserMessageId={new Map()}
      onRevertUserMessage={() => {}}
      isRevertingCheckpoint={false}
      onImageExpand={() => {}}
      markdownCwd={undefined}
      resolvedTheme="light"
      timestampFormat="locale"
      workspaceRoot={undefined}
    />
  );
}

function transitionClone(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-settled-turn-collapse-transition='true']");
}

function createHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.style.cssText = "display:flex;width:640px;height:520px;overflow:hidden";
  document.body.append(host);
  return host;
}

describe("MessagesTimeline settled turn transitions", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("animates a turn that visibly changes from live work to a settled disclosure", async () => {
    const host = createHost();
    const screen = await render(
      <TimelineHarness
        active
        entries={[...commands, assistantEntry("answer", "Finished the work.")]}
      />,
      { container: host },
    );

    try {
      expect(document.body.textContent ?? "").not.toContain("Worked for");

      await screen.rerender(
        <TimelineHarness
          active={false}
          entries={[
            ...commands,
            assistantEntry("answer", "Finished the work.", { completed: true }),
          ]}
        />,
      );

      await expect.poll(() => transitionClone() !== null).toBe(true);
      expect(transitionClone()?.hasAttribute("inert")).toBe(true);
      expect(transitionClone()?.textContent).toContain("Ran 6 commands");
      await expect.poll(() => (document.body.textContent ?? "").includes("Worked for")).toBe(true);
      await expect.poll(() => transitionClone() === null, { timeout: 1_000 }).toBe(true);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("opens an already settled turn folded without replaying the close transition", async () => {
    const host = createHost();
    const screen = await render(
      <TimelineHarness
        active={false}
        entries={[
          ...commands,
          assistantEntry("answer", "Finished the work.", { completed: true }),
        ]}
      />,
      { container: host },
    );

    try {
      await expect.poll(() => (document.body.textContent ?? "").includes("Worked for")).toBe(true);
      expect(transitionClone()).toBeNull();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 320));
      expect(transitionClone()).toBeNull();
      expect(document.body.textContent ?? "").not.toContain("echo command-1");
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("does not animate when historical work hydrates onto an existing settled answer", async () => {
    const host = createHost();
    const settledAnswer = assistantEntry("answer", "Finished the work.", { completed: true });
    const screen = await render(
      <TimelineHarness active={false} entries={[settledAnswer]} />,
      { container: host },
    );

    try {
      await screen.rerender(
        <TimelineHarness active={false} entries={[...commands, settledAnswer]} />,
      );
      await expect.poll(() => (document.body.textContent ?? "").includes("Worked for")).toBe(true);
      expect(transitionClone()).toBeNull();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 320));
      expect(transitionClone()).toBeNull();
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("does not animate hydrated history while a newer turn remains live", async () => {
    const host = createHost();
    const liveTurnId = TurnId.makeUnsafe("turn-live-after-history");
    const liveAnswer = assistantEntry("live-answer", "Still working.", {
      turnId: liveTurnId,
    });
    const livePrompt = userEntry("live-prompt", "Continue.", liveTurnId);
    const historicalAnswer = assistantEntry("answer", "Finished the earlier work.", {
      completed: true,
    });
    const screen = await render(
      <TimelineHarness active entries={[livePrompt, liveAnswer]} activeTurnId={liveTurnId} />,
      { container: host },
    );

    try {
      await screen.rerender(
        <TimelineHarness
          active
          activeTurnId={liveTurnId}
          entries={[...commands, historicalAnswer, livePrompt, liveAnswer]}
        />,
      );
      await expect.poll(() => (document.body.textContent ?? "").includes("Worked for")).toBe(true);
      expect(transitionClone()).toBeNull();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 320));
      expect(transitionClone()).toBeNull();
    } finally {
      await screen.unmount();
      host.remove();
    }
  });
});
