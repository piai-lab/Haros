import "../../index.css";

import { MessageId } from "@harnessos/contracts";
import { type LegendListRef } from "@legendapp/list/react";
import { page } from "vitest/browser";
import { Profiler, useRef, useState, type ProfilerOnRenderCallback } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ChatTranscriptPane } from "./ChatTranscriptPane";
import ChatMarkdown from "../ChatMarkdown";
import { TranscriptSelectionActionLayer } from "./TranscriptSelectionActionLayer";
import { useTranscriptAssistantSelectionAction } from "./useTranscriptAssistantSelectionAction";
import { createPanelResizeSession } from "../../lib/panelResize";

const EMPTY_WORK_GROUPS: Record<string, boolean> = {};
const EMPTY_TURN_DIFFS = new Map();
const EMPTY_REVERT_COUNTS = new Map();
const NOOP = () => {};
const TIMELINE_ENTRIES = [
  {
    id: "assistant-message-entry",
    kind: "message" as const,
    createdAt: "2026-03-17T19:12:28.000Z",
    message: {
      id: MessageId.makeUnsafe("assistant-message-1"),
      role: "assistant" as const,
      text: "This is a stable assistant message for the transcript perf harness.",
      createdAt: "2026-03-17T19:12:28.000Z",
      streaming: false,
    },
  },
];

async function settleLayout(): Promise<void> {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function TranscriptPerfHarness(props: { onTranscriptRender: () => void }) {
  const [composerValue, setComposerValue] = useState("");
  const composerImagesRef = useRef<readonly []>([]);
  const composerFilesRef = useRef<readonly []>([]);
  const composerAssistantSelectionsRef = useRef<readonly []>([]);
  const listRef = useRef<LegendListRef | null>(null);
  const {
    onMessagesClickCapture,
    onMessagesMouseUp,
    onMessagesPointerCancel,
    onMessagesPointerDown,
    onMessagesPointerUp,
    onMessagesScroll,
    onMessagesTouchEnd,
    onMessagesTouchMove,
    onMessagesTouchStart,
    onMessagesWheel,
  } = useTranscriptAssistantSelectionAction({
    threadId: "thread-transcript-perf",
    enabled: true,
    composerImagesRef,
    composerFilesRef,
    composerAssistantSelectionsRef,
    addComposerAssistantSelectionToDraft: () => true,
    scheduleComposerFocus: NOOP,
    onMessagesClickCaptureBase: NOOP,
    onMessagesPointerCancelBase: NOOP,
    onMessagesPointerDownBase: NOOP,
    onMessagesPointerUpBase: NOOP,
    onMessagesScrollBase: NOOP,
    onMessagesTouchEndBase: NOOP,
    onMessagesTouchMoveBase: NOOP,
    onMessagesTouchStartBase: NOOP,
    onMessagesWheelBase: NOOP,
  });
  const handleComposerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setComposerValue(event.target.value);
  };
  const handleTranscriptRender: ProfilerOnRenderCallback = () => {
    props.onTranscriptRender();
  };

  return (
    <div>
      <label htmlFor="composer-input">Composer</label>
      <input
        id="composer-input"
        placeholder="Type composer text"
        value={composerValue}
        onChange={handleComposerChange}
      />
      <Profiler id="chat-transcript-pane" onRender={handleTranscriptRender}>
        <ChatTranscriptPane
          activeThreadId="thread-transcript-perf"
          activeTurnInProgress={false}
          activeTurnStartedAt={null}
          chatFontSizePx={15}
          emptyStateProjectName={undefined}
          expandedWorkGroups={EMPTY_WORK_GROUPS}
          hasMessages
          isRevertingCheckpoint={false}
          isWorking={false}
          worktreeSetup={null}
          followLiveOutput={false}
          listRef={listRef}
          markdownCwd={undefined}
          onExpandTimelineImage={NOOP}
          onMessagesClickCapture={onMessagesClickCapture}
          onMessagesMouseUp={onMessagesMouseUp}
          onMessagesPointerCancel={onMessagesPointerCancel}
          onMessagesPointerDown={onMessagesPointerDown}
          onMessagesPointerUp={onMessagesPointerUp}
          onMessagesScroll={onMessagesScroll}
          onMessagesTouchEnd={onMessagesTouchEnd}
          onMessagesTouchMove={onMessagesTouchMove}
          onMessagesTouchStart={onMessagesTouchStart}
          onMessagesWheel={onMessagesWheel}
          onIsAtEndChange={NOOP}
          onOpenTurnDiff={NOOP}
          onOpenThread={NOOP}
          onRevertUserMessage={NOOP}
          onScrollToBottom={NOOP}
          onToggleWorkGroup={NOOP}
          resolvedTheme="dark"
          revertTurnCountByUserMessageId={EMPTY_REVERT_COUNTS}
          scrollButtonVisible={false}
          terminalWorkspaceTerminalTabActive={false}
          timelineEntries={TIMELINE_ENTRIES}
          timestampFormat="locale"
          turnDiffSummaryByAssistantMessageId={EMPTY_TURN_DIFFS}
          workspaceRoot={undefined}
        />
      </Profiler>
    </div>
  );
}

function TranscriptSelectionHarness(props: { onAddSelection: (text: string) => void }) {
  const composerImagesRef = useRef<readonly []>([]);
  const composerFilesRef = useRef<readonly []>([]);
  const composerAssistantSelectionsRef = useRef<readonly []>([]);
  const {
    pendingTranscriptSelectionAction,
    commitTranscriptAssistantSelection,
    onMessagesMouseUp,
  } = useTranscriptAssistantSelectionAction({
    threadId: "thread-transcript-selection",
    enabled: true,
    composerImagesRef,
    composerFilesRef,
    composerAssistantSelectionsRef,
    addComposerAssistantSelectionToDraft: (selection) => {
      props.onAddSelection(selection.text);
      return true;
    },
    resolveAssistantSelectionContext: () => ({
      rawText: "Selectable assistant answer",
      markerEnabled: true,
    }),
    scheduleComposerFocus: NOOP,
    onMessagesClickCaptureBase: NOOP,
    onMessagesPointerCancelBase: NOOP,
    onMessagesPointerDownBase: NOOP,
    onMessagesPointerUpBase: NOOP,
    onMessagesScrollBase: NOOP,
    onMessagesTouchEndBase: NOOP,
    onMessagesTouchMoveBase: NOOP,
    onMessagesTouchStartBase: NOOP,
    onMessagesWheelBase: NOOP,
  });

  return (
    <>
      <div data-testid="selection-transcript" onMouseUp={onMessagesMouseUp}>
        <p data-assistant-message-id="assistant-selection-message">
          <span data-transcript-source-start="0" data-transcript-source-end="27">
            Selectable assistant answer
          </span>
        </p>
      </div>
      <TranscriptSelectionActionLayer
        action={pendingTranscriptSelectionAction}
        onHighlight={NOOP}
        onUnderline={NOOP}
        onAddToChat={commitTranscriptAssistantSelection}
      />
    </>
  );
}

const CHIP_SELECTION_RAW_TEXT =
  "参考： [docs/architecture.md](docs/architecture.md) · **Project note** · Prompt 设计稿";

function ExactMarkdownSelectionHarness(props: {
  streaming?: boolean;
  onAddSelection: (text: string) => void;
  onMarkerRange: (range: { startOffset: number; endOffset: number; selectedText: string }) => void;
}) {
  const composerImagesRef = useRef<readonly []>([]);
  const composerFilesRef = useRef<readonly []>([]);
  const composerAssistantSelectionsRef = useRef<readonly []>([]);
  const {
    pendingTranscriptSelectionAction,
    commitTranscriptAssistantSelection,
    onMessagesClickCapture,
    onMessagesMouseUp,
    onMessagesTouchEnd,
  } = useTranscriptAssistantSelectionAction({
    threadId: "thread-exact-markdown-selection",
    enabled: true,
    composerImagesRef,
    composerFilesRef,
    composerAssistantSelectionsRef,
    addComposerAssistantSelectionToDraft: (selection) => {
      props.onAddSelection(selection.text);
      return true;
    },
    resolveAssistantSelectionContext: () => ({
      rawText: CHIP_SELECTION_RAW_TEXT,
      markerEnabled: !(props.streaming ?? false),
    }),
    scheduleComposerFocus: NOOP,
    onMessagesClickCaptureBase: NOOP,
    onMessagesPointerCancelBase: NOOP,
    onMessagesPointerDownBase: NOOP,
    onMessagesPointerUpBase: NOOP,
    onMessagesScrollBase: NOOP,
    onMessagesTouchEndBase: NOOP,
    onMessagesTouchMoveBase: NOOP,
    onMessagesTouchStartBase: NOOP,
    onMessagesWheelBase: NOOP,
  });

  return (
    <>
      <div
        data-testid="exact-markdown-transcript"
        onClickCapture={onMessagesClickCapture}
        onMouseUp={onMessagesMouseUp}
        onTouchEnd={onMessagesTouchEnd}
      >
        <div data-assistant-message-id="assistant-exact-markdown">
          <ChatMarkdown
            text={CHIP_SELECTION_RAW_TEXT}
            cwd="/repo"
            isStreaming={props.streaming ?? false}
          />
        </div>
      </div>
      <TranscriptSelectionActionLayer
        action={pendingTranscriptSelectionAction}
        onHighlight={() => {
          const range = pendingTranscriptSelectionAction?.selection.markerRange;
          if (range) props.onMarkerRange(range);
        }}
        onUnderline={NOOP}
        onAddToChat={commitTranscriptAssistantSelection}
      />
    </>
  );
}

describe("ChatTranscriptPane", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does not re-render the transcript subtree when only composer text changes", async () => {
    let transcriptCommitCount = 0;

    const screen = await render(
      <TranscriptPerfHarness
        onTranscriptRender={() => {
          transcriptCommitCount += 1;
        }}
      />,
    );
    try {
      await vi.waitFor(() => {
        expect(transcriptCommitCount).toBeGreaterThan(0);
      });
      // LegendList and the transcript's layout effects can commit after the
      // first paint under a busy two-worker browser run. Establish the perf
      // baseline only after those mount-owned frames have settled, otherwise
      // their deferred commit is misattributed to the composer update.
      await settleLayout();

      const baselineCommitCount = transcriptCommitCount;
      await page.getByPlaceholder("Type composer text").fill("reply follow up");

      await vi.waitFor(() => {
        expect(screen.container.querySelector("#composer-input")).toHaveValue("reply follow up");
      });

      expect(transcriptCommitCount).toBe(baselineCommitCount);
    } finally {
      await screen.unmount();
    }
  });

  it("keeps assistant text selectable and actionable after an interrupted resize", async () => {
    const addedSelections: string[] = [];
    const screen = await render(
      <TranscriptSelectionHarness
        onAddSelection={(text) => {
          addedSelections.push(text);
        }}
      />,
    );
    try {
      const resizeSession = createPanelResizeSession({ cursor: "col-resize", onFinish: NOOP });
      window.dispatchEvent(new Event("blur"));
      resizeSession.finish("commit");
      expect(document.body.style.cursor).toBe("");
      expect(document.body.style.userSelect).toBe("");

      const transcript = screen.container.querySelector<HTMLElement>(
        '[data-testid="selection-transcript"]',
      )!;
      const textNode = transcript.querySelector("span")?.firstChild;
      expect(textNode).toBeInstanceOf(Text);
      const range = document.createRange();
      range.selectNodeContents(textNode!);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      transcript.dispatchEvent(
        new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          clientX: 120,
          clientY: 80,
        }),
      );

      await vi.waitFor(() => {
        expect(document.querySelector('[data-transcript-selection-action="true"]')).not.toBeNull();
      });
      await expect.element(page.getByRole("button", { name: "Highlight" })).toBeVisible();
      await expect.element(page.getByRole("button", { name: "Underline" })).toBeVisible();
      await page.getByRole("button", { name: "Add to Chat" }).click();

      expect(addedSelections).toEqual(["Selectable assistant answer"]);
      expect(window.getSelection()?.isCollapsed).toBe(true);
    } finally {
      window.getSelection()?.removeAllRanges();
      await screen.unmount();
    }
  });

  it("keeps file-chip labels in the native selection and resolves exact raw marker offsets", async () => {
    const addedSelections: string[] = [];
    const markerRanges: Array<{ startOffset: number; endOffset: number; selectedText: string }> =
      [];
    const screen = await render(
      <ExactMarkdownSelectionHarness
        onAddSelection={(text) => addedSelections.push(text)}
        onMarkerRange={(range) => markerRanges.push(range)}
      />,
    );
    const originalNativeApi = window.nativeApi;
    const originalDesktopBridge = window.desktopBridge;
    try {
      const showContextMenu = vi.fn(async () => null);
      window.nativeApi = {
        contextMenu: { show: showContextMenu },
        shell: { showInFolder: vi.fn(async () => undefined) },
      } as never;
      window.desktopBridge = {} as never;
      const transcript = screen.container.querySelector<HTMLElement>(
        '[data-testid="exact-markdown-transcript"]',
      )!;
      const messageBody = transcript.querySelector<HTMLElement>("[data-assistant-message-id]")!;
      const range = document.createRange();
      range.selectNodeContents(messageBody.querySelector(".chat-markdown")!);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      expect(selection.toString()).toContain("docs/architecture.md");
      expect(selection.toString()).toContain("Project note");
      expect(selection.toString()).toContain("Prompt 设计稿");
      const fileChip = transcript.querySelector<HTMLElement>('a[title*="docs/architecture.md"]')!;
      const selectedContextMenuEvent = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
      });
      fileChip.dispatchEvent(selectedContextMenuEvent);
      expect(selectedContextMenuEvent.defaultPrevented).toBe(false);
      expect(showContextMenu).not.toHaveBeenCalled();
      transcript.dispatchEvent(
        new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          clientX: 160,
          clientY: 90,
        }),
      );

      await expect.element(page.getByRole("button", { name: "Highlight" })).toBeVisible();
      const toolbarRect = document
        .querySelector<HTMLElement>('[role="toolbar"]')!
        .getBoundingClientRect();
      expect(toolbarRect.left).toBeGreaterThanOrEqual(8);
      expect(toolbarRect.right).toBeLessThanOrEqual(window.innerWidth - 8);
      await page.getByRole("button", { name: "Highlight" }).click();
      expect(markerRanges).toEqual([
        {
          startOffset: 0,
          endOffset: CHIP_SELECTION_RAW_TEXT.length,
          selectedText: CHIP_SELECTION_RAW_TEXT,
        },
      ]);

      selection.removeAllRanges();
      const fileMenuEvent = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
      });
      fileChip.dispatchEvent(fileMenuEvent);
      expect(fileMenuEvent.defaultPrevented).toBe(true);
      expect(showContextMenu).toHaveBeenCalledTimes(1);

      selection.addRange(range);
      transcript.dispatchEvent(
        new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          clientX: 160,
          clientY: 90,
        }),
      );
      await page.getByRole("button", { name: "Add to Chat" }).click();
      expect(addedSelections).toEqual([
        "参考： docs/architecture.md · Project note · Prompt 设计稿",
      ]);
    } finally {
      if (originalNativeApi) {
        window.nativeApi = originalNativeApi;
      } else {
        delete window.nativeApi;
      }
      if (originalDesktopBridge) {
        window.desktopBridge = originalDesktopBridge;
      } else {
        delete window.desktopBridge;
      }
      window.getSelection()?.removeAllRanges();
      await screen.unmount();
    }
  });

  it("keeps streaming selections addable while hiding marker actions", async () => {
    const addedSelections: string[] = [];
    const screen = await render(
      <ExactMarkdownSelectionHarness
        streaming
        onAddSelection={(text) => addedSelections.push(text)}
        onMarkerRange={NOOP}
      />,
    );
    try {
      const transcript = screen.container.querySelector<HTMLElement>(
        '[data-testid="exact-markdown-transcript"]',
      )!;
      const range = document.createRange();
      range.selectNodeContents(transcript.querySelector(".chat-markdown")!);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      transcript.dispatchEvent(
        new MouseEvent("mouseup", { bubbles: true, clientX: 160, clientY: 90 }),
      );

      await expect.element(page.getByRole("button", { name: "Add to Chat" })).toBeVisible();
      expect(document.querySelector('button[aria-label="Highlight"]')).toBeNull();
      expect(document.querySelector('button[aria-label="Underline"]')).toBeNull();
      await page.getByRole("button", { name: "Add to Chat" }).click();
      expect(addedSelections[0]).toContain("docs/architecture.md");
    } finally {
      window.getSelection()?.removeAllRanges();
      await screen.unmount();
    }
  });

  it("captures keyboard-style selectionchange and touch-end selections locally", async () => {
    const addedSelections: string[] = [];
    const screen = await render(
      <ExactMarkdownSelectionHarness
        onAddSelection={(text) => addedSelections.push(text)}
        onMarkerRange={NOOP}
      />,
    );
    try {
      const transcript = screen.container.querySelector<HTMLElement>(
        '[data-testid="exact-markdown-transcript"]',
      )!;
      transcript.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const promptTextNode = Array.from(
        transcript.querySelectorAll<HTMLElement>("[data-transcript-source-start]"),
      ).find((element) => element.textContent?.includes("Prompt 设计稿"))?.firstChild;
      expect(promptTextNode).toBeInstanceOf(Text);

      const selection = window.getSelection()!;
      const promptText = promptTextNode!.textContent ?? "";
      const promptStart = promptText.indexOf("Prompt 设计稿");
      selection.setBaseAndExtent(promptTextNode!, promptText.length, promptTextNode!, promptStart);
      document.dispatchEvent(new Event("selectionchange"));
      await expect.element(page.getByRole("button", { name: "Add to Chat" })).toBeVisible();
      await page.getByRole("button", { name: "Add to Chat" }).click();
      expect(addedSelections).toEqual(["Prompt 设计稿"]);

      const campaignTextNode = Array.from(
        transcript.querySelectorAll<HTMLElement>("[data-transcript-source-start]"),
      ).find((element) => element.textContent === "Project note")?.firstChild;
      expect(campaignTextNode).toBeInstanceOf(Text);
      const touchRange = document.createRange();
      touchRange.selectNodeContents(campaignTextNode!);
      selection.removeAllRanges();
      selection.addRange(touchRange);
      transcript.dispatchEvent(new Event("touchend", { bubbles: true }));
      await expect.element(page.getByRole("button", { name: "Add to Chat" })).toBeVisible();
      await page.getByRole("button", { name: "Add to Chat" }).click();
      expect(addedSelections).toEqual(["Prompt 设计稿", "Project note"]);
    } finally {
      window.getSelection()?.removeAllRanges();
      await screen.unmount();
    }
  });

  it("removes marker actions when a selected message resumes streaming but keeps the snapshot", async () => {
    const addedSelections: string[] = [];
    const renderHarness = (streaming: boolean) => (
      <ExactMarkdownSelectionHarness
        streaming={streaming}
        onAddSelection={(text) => addedSelections.push(text)}
        onMarkerRange={NOOP}
      />
    );
    const screen = await render(renderHarness(false));
    try {
      const transcript = screen.container.querySelector<HTMLElement>(
        '[data-testid="exact-markdown-transcript"]',
      )!;
      const range = document.createRange();
      range.selectNodeContents(transcript.querySelector(".chat-markdown")!);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      transcript.dispatchEvent(
        new MouseEvent("mouseup", { bubbles: true, clientX: 160, clientY: 90 }),
      );
      await expect.element(page.getByRole("button", { name: "Highlight" })).toBeVisible();

      await screen.rerender(renderHarness(true));
      await expect.element(page.getByRole("button", { name: "Add to Chat" })).toBeVisible();
      expect(document.querySelector('button[aria-label="Highlight"]')).toBeNull();
      expect(document.querySelector('button[aria-label="Underline"]')).toBeNull();
      await page.getByRole("button", { name: "Add to Chat" }).click();
      expect(addedSelections[0]).toContain("docs/architecture.md");
    } finally {
      window.getSelection()?.removeAllRanges();
      await screen.unmount();
    }
  });

  it("expands collapsed user messages from the Show more control", async () => {
    const hiddenTail = "TAIL_SHOULD_APPEAR_AFTER_EXPAND";
    // Well past the visual line clamp so the collapsed message measures as
    // overflowing regardless of viewport width.
    const longUserText = `${Array.from({ length: 40 }, (_, index) => `line ${index}`).join("\n")}\n${hiddenTail}`;
    const host = document.createElement("div");
    host.style.cssText = "display:flex;width:600px;height:520px;overflow:hidden;";
    document.body.append(host);

    const screen = await render(
      <ChatTranscriptPane
        activeThreadId="thread-user-message-expand"
        activeTurnInProgress={false}
        activeTurnStartedAt={null}
        chatFontSizePx={15}
        emptyStateProjectName={undefined}
        hasMessages
        isRevertingCheckpoint={false}
        isWorking={false}
        worktreeSetup={null}
        followLiveOutput={false}
        listRef={{ current: null }}
        markdownCwd={undefined}
        onExpandTimelineImage={NOOP}
        onMessagesClickCapture={NOOP}
        onMessagesMouseUp={NOOP}
        onMessagesPointerCancel={NOOP}
        onMessagesPointerDown={NOOP}
        onMessagesPointerUp={NOOP}
        onMessagesScroll={NOOP}
        onMessagesTouchEnd={NOOP}
        onMessagesTouchMove={NOOP}
        onMessagesTouchStart={NOOP}
        onMessagesWheel={NOOP}
        onIsAtEndChange={NOOP}
        onOpenTurnDiff={NOOP}
        onOpenThread={NOOP}
        onRevertUserMessage={NOOP}
        onScrollToBottom={NOOP}
        resolvedTheme="dark"
        revertTurnCountByUserMessageId={EMPTY_REVERT_COUNTS}
        scrollButtonVisible={false}
        terminalWorkspaceTerminalTabActive={false}
        timelineEntries={[
          {
            id: "user-message-entry",
            kind: "message",
            createdAt: "2026-03-17T19:12:28.000Z",
            message: {
              id: MessageId.makeUnsafe("user-message-expand"),
              role: "user",
              text: longUserText,
              createdAt: "2026-03-17T19:12:28.000Z",
              streaming: false,
            },
          },
        ]}
        timestampFormat="locale"
        turnDiffSummaryByAssistantMessageId={EMPTY_TURN_DIFFS}
        workspaceRoot={undefined}
      />,
      { container: host },
    );
    try {
      // Collapsing is a visual clamp: the tail stays in the DOM but the clamp
      // wrapper is overflowing (cut off) until the message is expanded.
      await vi.waitFor(() => {
        const clampWrapper = screen.container.querySelector('[data-user-message-clamp="true"]');
        expect(clampWrapper).not.toBeNull();
        expect(clampWrapper!.scrollHeight).toBeGreaterThan(clampWrapper!.clientHeight);
      });
      expect(screen.container.querySelector("button[data-scroll-anchor-ignore]")?.textContent).toBe(
        "Show more",
      );

      await page.getByText("Show more").click();

      await vi.waitFor(() => {
        const wrapper = screen.container.querySelector("[data-user-message-clamp]");
        expect(wrapper?.getAttribute("data-user-message-clamp")).toBe("false");
        expect(wrapper!.scrollHeight).toBeLessThanOrEqual(wrapper!.clientHeight + 1);
      });
      await expect.element(page.getByText("Show less")).toBeInTheDocument();
      expect(screen.container.querySelector("button[data-scroll-anchor-ignore]")?.textContent).toBe(
        "Show less",
      );
      await settleLayout();
    } finally {
      await screen.unmount();
      host.remove();
      await settleLayout();
    }
  });

  it("keeps hidden message-trail ticks out of the tab order", async () => {
    const host = document.createElement("div");
    host.style.cssText = "display:flex;width:600px;height:520px;";
    document.body.append(host);

    const screen = await render(
      <ChatTranscriptPane
        activeThreadId="thread-hidden-trail"
        activeTurnInProgress={false}
        activeTurnStartedAt={null}
        chatFontSizePx={15}
        emptyStateProjectName={undefined}
        hasMessages
        isRevertingCheckpoint={false}
        isWorking={false}
        worktreeSetup={null}
        followLiveOutput={false}
        listRef={{ current: null }}
        markdownCwd={undefined}
        onExpandTimelineImage={NOOP}
        onMessagesClickCapture={NOOP}
        onMessagesMouseUp={NOOP}
        onMessagesPointerCancel={NOOP}
        onMessagesPointerDown={NOOP}
        onMessagesPointerUp={NOOP}
        onMessagesScroll={NOOP}
        onMessagesTouchEnd={NOOP}
        onMessagesTouchMove={NOOP}
        onMessagesTouchStart={NOOP}
        onMessagesWheel={NOOP}
        onIsAtEndChange={NOOP}
        onOpenTurnDiff={NOOP}
        onOpenThread={NOOP}
        onRevertUserMessage={NOOP}
        onScrollToBottom={NOOP}
        resolvedTheme="dark"
        revertTurnCountByUserMessageId={EMPTY_REVERT_COUNTS}
        scrollButtonVisible={false}
        terminalWorkspaceTerminalTabActive={false}
        timelineEntries={[
          {
            id: "user-message-entry-1",
            kind: "message",
            createdAt: "2026-03-17T19:12:28.000Z",
            message: {
              id: MessageId.makeUnsafe("user-message-trail-1"),
              role: "user",
              text: "First turn",
              createdAt: "2026-03-17T19:12:28.000Z",
              streaming: false,
            },
          },
          {
            id: "assistant-message-entry-1",
            kind: "message",
            createdAt: "2026-03-17T19:12:29.000Z",
            message: {
              id: MessageId.makeUnsafe("assistant-message-trail-1"),
              role: "assistant",
              text: "First reply",
              createdAt: "2026-03-17T19:12:29.000Z",
              streaming: false,
            },
          },
          {
            id: "user-message-entry-2",
            kind: "message",
            createdAt: "2026-03-17T19:12:30.000Z",
            message: {
              id: MessageId.makeUnsafe("user-message-trail-2"),
              role: "user",
              text: "Second turn",
              createdAt: "2026-03-17T19:12:30.000Z",
              streaming: false,
            },
          },
        ]}
        timestampFormat="locale"
        turnDiffSummaryByAssistantMessageId={EMPTY_TURN_DIFFS}
        workspaceRoot={undefined}
      />,
      { container: host },
    );
    try {
      await vi.waitFor(() => {
        const trail = screen.container.querySelector("[data-message-trail]");
        expect(trail?.getAttribute("aria-hidden")).toBe("true");
        expect(trail?.hasAttribute("inert")).toBe(true);
      });

      const ticks = Array.from(
        screen.container.querySelectorAll<HTMLButtonElement>("[data-message-trail] button"),
      );
      expect(ticks).toHaveLength(2);
      expect(ticks.every((tick) => tick.tabIndex === -1)).toBe(true);
    } finally {
      await screen.unmount();
    }
  });
});
