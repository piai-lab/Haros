// FILE: MessagesTimeline.turnProcess.browser.tsx
// Purpose: Approval-baseline browser proof for the single turn-level process disclosure.
// Layer: Vitest browser tests

import "../../index.css";

import { CheckpointRef, MessageId, type NativeApi, ThreadId, TurnId } from "@harnessos/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
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
    Reflect.deleteProperty(window, "nativeApi");
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
      expect(processRow()?.querySelector("[data-turn-process-divider='true']")).not.toBeNull();
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
      expect(processRow()?.querySelector("[data-turn-process-divider='true']")).not.toBeNull();
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
      turnProcessPhase: {
        kind: "running",
        turnId: TURN_ID,
        startedAt: STARTED_AT,
      } as const,
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
      expect(processRow()?.querySelector("[data-turn-process-divider='true']")).toBeNull();
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
        presentation: "harnessos-browser",
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
      const action = screen.getByRole("button", { name: "Reopen in Haros Browser" }).element();
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

  it("8. keeps the approved avatar grid and shared content origin across product widths", async () => {
    const host = createHost();
    host.style.width = "calc(100vw - 32px)";
    const pendingMessageId = MessageId.makeUnsafe("user-process-browser");
    const turnProvenance = [
      {
        pendingMessageId,
        turnId: TURN_ID,
        engineSelection: {
          engine: "oa" as const,
          model: "deepseek/deepseek-v4-pro",
        },
        requestedAt: STARTED_AT,
      },
    ];
    const entries = [userEntry(), workEntry("identity-read", "Read source"), assistantEntry()];
    const screen = await render(
      <MessagesTimeline {...baseProps} turnProvenance={turnProvenance} timelineEntries={entries} />,
      { container: host },
    );

    try {
      for (const [width, expectedAvatar, expectedGap] of [
        [1_440, 30, 12],
        [832, 30, 12],
        [480, 28, 10],
      ] as const) {
        await page.viewport(width, 720);
        document.documentElement.classList.toggle("dark", width === 832);
        await screen.rerender(
          <MessagesTimeline
            {...baseProps}
            resolvedTheme={width === 832 ? "dark" : "light"}
            turnProvenance={turnProvenance}
            timelineEntries={entries}
          />,
        );

        const identity = document.querySelector<HTMLElement>(
          "[data-assistant-turn-identity='visible']",
        );
        const continuation = document.querySelector<HTMLElement>(
          "[data-assistant-turn-identity='continuation']",
        );
        const avatar = identity?.querySelector<HTMLElement>("[data-assistant-turn-avatar]");
        const identityContent = identity?.querySelector<HTMLElement>(
          "[data-assistant-turn-content='true']",
        );
        const continuationContent = continuation?.querySelector<HTMLElement>(
          "[data-assistant-turn-content='true']",
        );
        expect(identity).not.toBeNull();
        expect(continuation).not.toBeNull();
        expect(avatar).not.toBeNull();
        expect(identityContent).not.toBeNull();
        expect(continuationContent).not.toBeNull();
        if (!identity || !avatar || !identityContent || !continuationContent) continue;

        const gridStyle = getComputedStyle(identity);
        const avatarStyle = getComputedStyle(avatar);
        expect(avatar.getBoundingClientRect().width).toBeCloseTo(expectedAvatar, 1);
        expect(Number.parseFloat(gridStyle.columnGap)).toBeCloseTo(expectedGap, 1);
        expect(identityContent.getBoundingClientRect().left).toBeCloseTo(
          continuationContent.getBoundingClientRect().left,
          1,
        );
        expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
        expect(avatarStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(avatarStyle.borderTopWidth).toBe("0px");
        expect(avatarStyle.boxShadow).toBe("none");
        expect(avatarStyle.borderTopLeftRadius).toBe("25%");
        expect(avatarStyle.overflow).toBe("hidden");
        const brandIcon = avatar.querySelector<HTMLElement>("[data-model-service-icon='brand']");
        expect(brandIcon?.getBoundingClientRect().width).toBeCloseTo(expectedAvatar, 1);
      }

      expect(document.querySelectorAll("[data-assistant-turn-identity='visible']")).toHaveLength(1);
      expect(document.body.textContent).toContain("DeepSeek V4 Pro");
      expect(document.body.textContent).toContain("OA ·");
    } finally {
      document.documentElement.classList.remove("dark");
      await page.viewport(1_280, 720);
      await screen.unmount();
      host.remove();
    }
  });

  it("9. renders the admitted model on the first live frame before turn-id projection", async () => {
    const host = createHost();
    const pendingMessageId = MessageId.makeUnsafe("user-first-live-frame");
    const screen = await render(
      <MessagesTimeline
        {...baseProps}
        isWorking
        activeTurnInProgress
        activeTurnId={TURN_ID}
        activeTurnStartedAt={STARTED_AT}
        turnProvenance={[
          {
            pendingMessageId,
            turnId: null,
            engineSelection: {
              engine: "oa",
              model: "deepseek/deepseek-v4-pro",
            },
            modelPresentationIdentity: {
              model: "deepseek/deepseek-v4-pro",
              displayName: "DeepSeek V4 Pro",
              serviceId: "deepseek",
              source: "runtime-catalog",
            },
            requestedAt: STARTED_AT,
          },
        ]}
        timelineEntries={[userEntry("user-first-live-frame")]}
      />,
      { container: host },
    );

    try {
      expect(document.querySelector("[data-assistant-turn-identity='visible']")).not.toBeNull();
      expect(document.querySelector("[data-assistant-turn-model='true']")?.textContent).toBe(
        "DeepSeek V4 Pro",
      );
      expect(document.querySelector("[data-assistant-turn-avatar='model']")).not.toBeNull();
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("10. loads exact checkpoint evidence only after both disclosures open", async () => {
    const host = createHost();
    const threadId = ThreadId.makeUnsafe("thread-turn-diff-browser");
    const assistantMessageId = MessageId.makeUnsafe("assistant-process-browser");
    const patch = [
      "diff --git a/src/evidence.ts b/src/evidence.ts",
      "index 1111111..2222222 100644",
      "--- a/src/evidence.ts",
      "+++ b/src/evidence.ts",
      "@@ -1 +1 @@",
      "-export const evidence = false;",
      "+export const evidence = true;",
      "",
    ].join("\n");
    const getTurnDiff = vi.fn().mockResolvedValue({ diff: patch });
    window.nativeApi = {
      orchestration: { getTurnDiff },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <MessagesTimeline
          {...baseProps}
          threadId={threadId}
          timelineEntries={[
            userEntry(),
            workEntry("file-change", "Edited evidence", {
              tone: "tool",
              requestKind: "file-change",
              changedFiles: ["src/evidence.ts"],
              toolDetails: {
                kind: "file-change",
                title: "Edited evidence",
                files: ["src/evidence.ts"],
              },
            }),
            assistantEntry(),
          ]}
          turnDiffSummaryByAssistantMessageId={
            new Map([
              [
                assistantMessageId,
                {
                  turnId: TURN_ID,
                  completedAt: "2026-08-27T01:00:08.000Z",
                  assistantMessageId,
                  checkpointRef: CheckpointRef.makeUnsafe(
                    "refs/harnessos/checkpoints/thread/turn/evidence",
                  ),
                  checkpointTurnCount: 1,
                  checkpointTurnCounts: [1],
                  status: "ready",
                  files: [{ path: "src/evidence.ts", additions: 1, deletions: 1 }],
                },
              ],
            ])
          }
        />
      </QueryClientProvider>,
      { container: host },
    );
    try {
      expect(getTurnDiff).not.toHaveBeenCalled();
      processTrigger()!.click();
      await expect.poll(() => processTrigger()?.getAttribute("aria-expanded")).toBe("true");
      await expect
        .poll(() => document.querySelector("[data-turn-changed-files-evidence='true'] button"))
        .not.toBeNull();
      const evidenceTrigger = document.querySelector<HTMLButtonElement>(
        "[data-turn-changed-files-evidence='true'] button",
      )!;
      expect(getTurnDiff).not.toHaveBeenCalled();
      evidenceTrigger.click();
      await expect.poll(() => getTurnDiff.mock.calls.length).toBe(1);
      expect(getTurnDiff).toHaveBeenCalledWith(
        {
          threadId,
          fromTurnCount: 0,
          toTurnCount: 1,
          ignoreWhitespace: false,
        },
        { signal: expect.any(AbortSignal) },
      );
      await expect.poll(() => document.body.textContent ?? "").toContain("evidence.ts");
      expect(document.querySelector("[data-turn-diff-scroll-root='true']")).not.toBeNull();
      expect(document.querySelector("[data-timeline-file-copy='src/evidence.ts']")).not.toBeNull();
    } finally {
      queryClient.clear();
      await screen.unmount();
      host.remove();
    }
  });
});
