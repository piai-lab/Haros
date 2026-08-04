// FILE: ConversationPerformance.browser.tsx
// Purpose: Same-byte T0/current Chromium profile for the preserved Conversation mechanisms.
// Boundary: Synthetic text exercises UI publication/rendering only; it is not Pi-native streaming.

import "../../index.css";

import { type LegendListRef } from "@legendapp/list/react";
import {
  Profiler,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type ProfilerOnRenderCallback,
} from "react";
import { commands } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { ComposerPromptEditor } from "../ComposerPromptEditor";
import { MessagesTimeline } from "./MessagesTimeline";

type TimelineEntries = ComponentProps<typeof MessagesTimeline>["timelineEntries"];

interface HeapUsage {
  readonly usedSize: number;
  readonly totalSize: number;
  readonly embedderHeapUsedSize?: number;
  readonly backingStorageSize?: number;
}

interface PerformanceHost {
  readonly platform: string;
  readonly architecture: string;
  readonly cpuModel: string;
  readonly logicalCpuCount: number;
  readonly totalMemoryBytes: number;
}

const performanceCommands = commands as typeof commands & {
  collectBrowserHeap(): Promise<HeapUsage>;
  readPerformanceHost(): Promise<PerformanceHost>;
};

// Frozen before the first profile execution. T0/current use these exact limits.
const CONVERSATION_BUDGET = Object.freeze({
  maxRenderedDomNodes: 1_200,
  maxDomGrowthNodesFrom100kTo400k: 180,
  maxDomGrowthRatioFrom100kTo400k: 1.35,
  max400kUpdateCommitMs: 2_500,
  maxBurstUiCommits: 4,
  maxBurstLongTasks: 0,
  maxPostGcHeapGrowthBytes: 32 * 1024 * 1024,
});

const EMPTY_TURN_DIFFS = new Map();
const EMPTY_REVERT_COUNTS = new Map();
const NOOP = () => {};
const MESSAGE_CREATED_AT = "2026-08-04T00:00:00.000Z";

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function settleFrames(count = 3): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await nextAnimationFrame();
  }
}

function fixedLengthText(length: number, seed: string): string {
  const line = `${seed} preserves the virtual Conversation row and scroll anchor. `;
  return line.repeat(Math.ceil(length / line.length)).slice(0, length);
}

function buildConversation(totalCharacters: number, idPrefix: string): TimelineEntries {
  const charactersPerMessage = 200;
  const messageCount = Math.ceil(totalCharacters / charactersPerMessage);
  return Array.from({ length: messageCount }, (_, index) => {
    const remaining = totalCharacters - index * charactersPerMessage;
    const textLength = Math.min(charactersPerMessage, remaining);
    const role = index % 2 === 0 ? ("user" as const) : ("assistant" as const);
    return {
      id: `${idPrefix}-entry-${index}`,
      kind: "message" as const,
      createdAt: MESSAGE_CREATED_AT,
      message: {
        // Keep the profile byte-identical and source-tree neutral for the immutable T0 run.
        // The production component still validates the shape through its own prop type.
        id: `${idPrefix}-message-${index}` as never,
        role,
        text: fixedLengthText(textLength, `${idPrefix}-${index}`),
        createdAt: MESSAGE_CREATED_AT,
        streaming: false,
      },
    };
  }) as TimelineEntries;
}

function timelineWithStreamingTail(text: string): TimelineEntries {
  return [
    {
      id: "conversation-burst-user-entry",
      kind: "message" as const,
      createdAt: MESSAGE_CREATED_AT,
      message: {
        id: "conversation-burst-user" as never,
        role: "user" as const,
        text: "Explain the measured UI mechanism.",
        createdAt: MESSAGE_CREATED_AT,
        streaming: false,
      },
    },
    {
      id: "conversation-burst-assistant-entry",
      kind: "message" as const,
      createdAt: MESSAGE_CREATED_AT,
      message: {
        id: "conversation-burst-assistant" as never,
        role: "assistant" as const,
        text,
        createdAt: MESSAGE_CREATED_AT,
        streaming: true,
      },
    },
  ] as TimelineEntries;
}

function ConversationSurface(props: {
  readonly entries: TimelineEntries;
  readonly onRender?: ProfilerOnRenderCallback;
}) {
  const listRef = useRef<LegendListRef | null>(null);
  const timeline = (
    <MessagesTimeline
      hasMessages={props.entries.length > 0}
      isWorking={false}
      activeTurnInProgress={false}
      activeTurnStartedAt={null}
      followLiveOutput={false}
      listRef={listRef}
      timelineEntries={props.entries}
      turnDiffSummaryByAssistantMessageId={EMPTY_TURN_DIFFS}
      revertTurnCountByUserMessageId={EMPTY_REVERT_COUNTS}
      onRevertUserMessage={NOOP}
      isRevertingCheckpoint={false}
      onImageExpand={NOOP}
      onOpenTurnDiff={NOOP}
      markdownCwd={undefined}
      resolvedTheme="dark"
      timestampFormat="locale"
      workspaceRoot={undefined}
    />
  );

  return (
    <div
      data-performance-conversation
      className="relative flex h-[620px] w-[960px] min-h-0 min-w-0 overflow-hidden"
    >
      {props.onRender ? (
        <Profiler id="conversation-timeline" onRender={props.onRender}>
          {timeline}
        </Profiler>
      ) : (
        timeline
      )}
    </div>
  );
}

interface BurstHandle {
  publishSyntheticBurst(tokenCount: number): void;
}

const SyntheticBurstConversation = forwardRef<
  BurstHandle,
  {
    readonly onTimelineRender: ProfilerOnRenderCallback;
    readonly onPublicationRootRender: () => void;
  }
>(function SyntheticBurstConversation({ onTimelineRender, onPublicationRootRender }, ref) {
  const [streamText, setStreamText] = useState("Streaming presentation: ");
  onPublicationRootRender();
  useImperativeHandle(
    ref,
    () => ({
      publishSyntheticBurst(tokenCount: number) {
        for (let index = 0; index < tokenCount; index += 1) {
          setStreamText((current) => `${current}${index % 12 === 0 ? " measured" : "."}`);
        }
      },
    }),
    [],
  );
  return (
    <ConversationSurface
      entries={timelineWithStreamingTail(streamText)}
      onRender={onTimelineRender}
    />
  );
});

interface ImeStreamHandle {
  publishSyntheticBurst(): void;
}

const ImeDuringStreamHarness = forwardRef<ImeStreamHandle>(function ImeDuringStreamHarness(_, ref) {
  const [composerValue, setComposerValue] = useState("输入中的文字不会丢失");
  const [streamText, setStreamText] = useState("Synthetic UI stream");
  const onCommandKeyDown = useRef(vi.fn(() => true));
  useImperativeHandle(
    ref,
    () => ({
      publishSyntheticBurst() {
        for (let index = 0; index < 120; index += 1) {
          setStreamText((current) => `${current}.`);
        }
      },
    }),
    [],
  );

  return (
    <div data-ime-stream-harness>
      <ComposerPromptEditor
        value={composerValue}
        cursor={composerValue.length}
        terminalContexts={[]}
        disabled={false}
        placeholder="输入消息"
        onRemoveTerminalContext={NOOP}
        onChange={(value) => setComposerValue(value)}
        onCommandKeyDown={onCommandKeyDown.current}
        onPaste={NOOP}
      />
      <ConversationSurface entries={timelineWithStreamingTail(streamText)} />
      <output data-command-count>{onCommandKeyDown.current.mock.calls.length}</output>
    </div>
  );
});

function reportMetric(name: string, value: unknown): void {
  console.info(`OMNIMIND_PERF ${name} ${JSON.stringify(value)}`);
}

describe("Conversation performance profile", () => {
  afterEach(async () => {
    await cleanup();
    document.body.innerHTML = "";
  });

  it("keeps the real virtual Timeline DOM bounded from 100k to 400k characters", async () => {
    const host = await performanceCommands.readPerformanceHost();
    let entries100k: TimelineEntries | null = buildConversation(100_000, "conversation-100k");
    let entries400k: TimelineEntries | null = buildConversation(400_000, "conversation-400k");
    const commitDurations: number[] = [];
    const mounted = await render(
      <ConversationSurface
        entries={entries100k}
        onRender={(_id, _phase, actualDuration) => commitDurations.push(actualDuration)}
      />,
    );

    await settleFrames(5);
    const nodes100k = mounted.container.querySelectorAll("*").length;
    const heap100k = await performanceCommands.collectBrowserHeap();
    commitDurations.length = 0;

    await mounted.rerender(
      <ConversationSurface
        entries={entries400k}
        onRender={(_id, _phase, actualDuration) => commitDurations.push(actualDuration)}
      />,
    );
    await settleFrames(5);
    const nodes400k = mounted.container.querySelectorAll("*").length;
    const updateCommitMs = commitDurations.reduce((sum, duration) => sum + duration, 0);

    await mounted.rerender(<ConversationSurface entries={entries100k} />);
    entries400k = null;
    await settleFrames(4);
    const heapAfterRecovery = await performanceCommands.collectBrowserHeap();
    const heapGrowthBytes = heapAfterRecovery.usedSize - heap100k.usedSize;

    reportMetric("conversation-dom", {
      host,
      browser: navigator.userAgent,
      buildMode: "Vitest browser / Vite transformed modules / headless Chromium",
      fixture: {
        characters100k: 100_000,
        messages100k: entries100k.length,
        characters400k: 400_000,
        messages400k: 2_000,
      },
      method: "real MessagesTimeline + LegendList, 1440x900 viewport, five-frame settle",
      nodes100k,
      nodes400k,
      updateCommitMs,
      heap100kUsedBytes: heap100k.usedSize,
      heapAfterRecoveryUsedBytes: heapAfterRecovery.usedSize,
      heapGrowthBytes,
      budgets: CONVERSATION_BUDGET,
      proofBoundary: "preserved Conversation UI mechanism; no Pi runtime or native stream",
    });

    expect(nodes100k).toBeLessThanOrEqual(CONVERSATION_BUDGET.maxRenderedDomNodes);
    expect(nodes400k).toBeLessThanOrEqual(CONVERSATION_BUDGET.maxRenderedDomNodes);
    expect(nodes400k - nodes100k).toBeLessThanOrEqual(
      CONVERSATION_BUDGET.maxDomGrowthNodesFrom100kTo400k,
    );
    expect(nodes400k / Math.max(nodes100k, 1)).toBeLessThanOrEqual(
      CONVERSATION_BUDGET.maxDomGrowthRatioFrom100kTo400k,
    );
    expect(updateCommitMs).toBeLessThanOrEqual(CONVERSATION_BUDGET.max400kUpdateCommitMs);
    expect(heapGrowthBytes).toBeLessThanOrEqual(CONVERSATION_BUDGET.maxPostGcHeapGrowthBytes);

    entries100k = null;
  });

  it("batches a synthetic presentation burst into bounded real Timeline commits", async () => {
    const handle = { current: null as BurstHandle | null };
    const timelineCommitDurations: number[] = [];
    let publicationRootRenderCount = 0;
    const longTasks: PerformanceEntry[] = [];
    const observer = new PerformanceObserver((list) => longTasks.push(...list.getEntries()));
    observer.observe({ type: "longtask", buffered: false });
    const mounted = await render(
      <SyntheticBurstConversation
        ref={handle}
        onTimelineRender={(_id, _phase, actualDuration) =>
          timelineCommitDurations.push(actualDuration)
        }
        onPublicationRootRender={() => {
          publicationRootRenderCount += 1;
        }}
      />,
    );
    await settleFrames(4);
    timelineCommitDurations.length = 0;
    publicationRootRenderCount = 0;
    longTasks.length = 0;

    const startedAt = performance.now();
    handle.current?.publishSyntheticBurst(240);
    await settleFrames(3);
    const elapsedMs = performance.now() - startedAt;
    observer.disconnect();

    reportMetric("conversation-burst", {
      fixture: { syntheticPublications: 240 },
      method: "240 same-task presentation publications into real MessagesTimeline",
      publicationRootRenderCount,
      timelineInternalCommitCount: timelineCommitDurations.length,
      timelineCommitDurationMs: timelineCommitDurations.reduce(
        (sum, duration) => sum + duration,
        0,
      ),
      elapsedMs,
      longTaskCount: longTasks.length,
      budgets: CONVERSATION_BUDGET,
      proofBoundary: "browser presentation batching only; not Pi-native transport acceptance",
    });

    expect(publicationRootRenderCount).toBeLessThanOrEqual(CONVERSATION_BUDGET.maxBurstUiCommits);
    expect(longTasks.length).toBeLessThanOrEqual(CONVERSATION_BUDGET.maxBurstLongTasks);
    expect(mounted.container.textContent).toContain("Streaming presentation");
  });

  it("preserves CJK IME input while the synthetic Timeline stream updates", async () => {
    const handle = { current: null as ImeStreamHandle | null };
    const mounted = await render(<ImeDuringStreamHarness ref={handle} />);
    const editor = mounted.container.querySelector<HTMLElement>('[data-testid="composer-editor"]');
    expect(editor).toBeTruthy();
    editor!.focus();
    editor!.dispatchEvent(new CompositionEvent("compositionstart", { data: "输", bubbles: true }));
    editor!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        keyCode: 229,
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    handle.current?.publishSyntheticBurst();
    await settleFrames(3);

    expect(editor!.textContent).toContain("输入中的文字不会丢失");
    expect(mounted.container.querySelector("[data-command-count]")?.textContent).toBe("0");
    editor!.dispatchEvent(new CompositionEvent("compositionend", { data: "输入", bubbles: true }));
    reportMetric("conversation-ime", {
      syntheticPublications: 120,
      input: "CJK composition",
      commandCountDuringComposition: 0,
      preservedText: true,
      proofBoundary: "real Composer + synthetic UI stream; Pi execution remains out of scope",
    });
  });
});
