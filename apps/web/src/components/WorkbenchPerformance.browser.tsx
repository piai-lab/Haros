// FILE: WorkbenchPerformance.browser.tsx
// Purpose: Current Work4 Chromium profile for switch/scroll/hover/split and hidden-terminal seams.
// Boundary: Synthetic publications prove renderer mechanics only, never Pi acceptance or streaming.

import "../index.css";
import "@xterm/xterm/css/xterm.css";

import { Terminal } from "@xterm/xterm";
import {
  Profiler,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type ProfilerOnRenderCallback,
} from "react";
import { commands } from "vitest/browser";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { SidebarSurfacePicker } from "./Sidebar";
import { MessagesTimeline } from "./chat/MessagesTimeline";
import TerminalViewportPane from "./terminal/TerminalViewportPane";
import type { ThreadTerminalLayoutNode } from "../types";

type TimelineEntries = ComponentProps<typeof MessagesTimeline>["timelineEntries"];

interface HeapUsage {
  readonly usedSize: number;
  readonly totalSize: number;
}

const performanceCommands = commands as typeof commands & {
  collectBrowserHeap(): Promise<HeapUsage>;
};

// Frozen before the first execution. These are absolute interaction/retention limits,
// not thresholds derived from the measurements below.
const WORKBENCH_BUDGET = Object.freeze({
  maxInteractionP95Ms: 80,
  maxInteractionLongTasks: 0,
  maxRootCommitsPerBurst: 4,
  maxSidebarCommitsPerBurst: 0,
  maxHiddenTerminalRendersPerBurst: 0,
  maxHiddenTerminalWritesPerBurst: 0,
  maxPostGcHeapGrowthBytes: 24 * 1024 * 1024,
});

const EMPTY_TURN_DIFFS = new Map();
const EMPTY_REVERT_COUNTS = new Map();
const NOOP = () => {};
const CREATED_AT = "2026-08-04T00:00:00.000Z";
const SURFACE_VIEWS = ["threads", "studio"] as const;

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function settleFrames(count = 3): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await nextAnimationFrame();
  }
}

function percentile95(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
}

async function measureBrowserInteraction(action: () => void): Promise<number> {
  const startedAt = performance.now();
  action();
  await nextAnimationFrame();
  return performance.now() - startedAt;
}

function buildScrollableConversation(messageCount = 900): TimelineEntries {
  return Array.from({ length: messageCount }, (_, index) => ({
    id: `workbench-message-entry-${index}`,
    kind: "message" as const,
    createdAt: CREATED_AT,
    message: {
      id: `workbench-message-${index}` as never,
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      text: `Measured Conversation row ${index}: ${"bounded content ".repeat(5)}`,
      createdAt: CREATED_AT,
      streaming: false,
    },
  })) as TimelineEntries;
}

function withSyntheticTail(entries: TimelineEntries, tail: string): TimelineEntries {
  return [
    ...entries,
    {
      id: "workbench-stream-entry",
      kind: "message" as const,
      createdAt: CREATED_AT,
      message: {
        id: "workbench-stream-message" as never,
        role: "assistant" as const,
        text: tail,
        createdAt: CREATED_AT,
        streaming: true,
      },
    },
  ] as TimelineEntries;
}

function PerformanceTimeline({ entries }: { readonly entries: TimelineEntries }) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <MessagesTimeline
        hasMessages
        isWorking={false}
        activeTurnInProgress={false}
        activeTurnStartedAt={null}
        followLiveOutput={false}
        timelineEntries={entries}
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
    </div>
  );
}

const StableSurfacePicker = memo(function StableSurfacePicker(props: {
  readonly activeView: "threads" | "studio";
  readonly onSelectView: (view: "threads" | "studio") => void;
  readonly onRender: ProfilerOnRenderCallback;
}) {
  return (
    <Profiler id="workbench-sidebar" onRender={props.onRender}>
      <SidebarSurfacePicker
        views={SURFACE_VIEWS}
        activeView={props.activeView}
        onSelectView={props.onSelectView}
      />
    </Profiler>
  );
});

const TERMINAL_LAYOUT: ThreadTerminalLayoutNode = {
  type: "split",
  id: "performance-terminal-split",
  direction: "horizontal",
  weights: [1, 1],
  children: [
    {
      type: "terminal",
      paneId: "performance-pane-primary",
      terminalIds: ["terminal-visible", "terminal-hidden"],
      activeTerminalId: "terminal-visible",
    },
    {
      type: "terminal",
      paneId: "performance-pane-secondary",
      terminalIds: ["terminal-secondary"],
      activeTerminalId: "terminal-secondary",
    },
  ],
};

const terminalRenderCount = new Map<string, number>();
const terminalWriteCount = new Map<string, number>();

const InstrumentedXtermViewport = memo(function InstrumentedXtermViewport(props: {
  readonly terminalId: string;
  readonly isVisible: boolean;
  readonly streamPayload: string;
}) {
  terminalRenderCount.set(props.terminalId, (terminalRenderCount.get(props.terminalId) ?? 0) + 1);
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const terminal = new Terminal({
      cols: 72,
      rows: 12,
      scrollback: 1_000,
      cursorBlink: false,
      fontFamily: "monospace",
      fontSize: 11,
    });
    terminal.open(host);
    terminalRef.current = terminal;
    return () => {
      terminalRef.current = null;
      terminal.dispose();
    };
  }, []);

  useEffect(() => {
    if (!props.isVisible || props.streamPayload.length === 0) return;
    terminalRef.current?.write(props.streamPayload, () => {
      terminalWriteCount.set(props.terminalId, (terminalWriteCount.get(props.terminalId) ?? 0) + 1);
    });
  }, [props.isVisible, props.streamPayload, props.terminalId]);

  return (
    <div ref={hostRef} className="h-full min-h-0 w-full" data-terminal-id={props.terminalId} />
  );
});

interface WorkbenchHandle {
  publishSyntheticBurst(publicationCount: number): void;
  switchSurface(view: "threads" | "studio"): void;
}

const WorkbenchHarness = forwardRef<
  WorkbenchHandle,
  {
    readonly onRootRender: ProfilerOnRenderCallback;
    readonly onSidebarRender: ProfilerOnRenderCallback;
    readonly onPublicationRootRender?: () => void;
  }
>(function WorkbenchHarness(
  { onRootRender, onSidebarRender, onPublicationRootRender = NOOP },
  ref,
) {
  const [activeView, setActiveView] = useState<"threads" | "studio">("studio");
  const [streamText, setStreamText] = useState("Synthetic presentation stream");
  const [terminalPayload, setTerminalPayload] = useState("");
  const [terminalWeights, setTerminalWeights] = useState([1, 1]);
  const stableEntries = useRef(buildScrollableConversation()).current;
  onPublicationRootRender();
  const handleSelectView = useCallback((view: "threads" | "studio") => {
    setActiveView(view);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      publishSyntheticBurst(publicationCount: number) {
        for (let index = 0; index < publicationCount; index += 1) {
          setStreamText((current) => `${current}.`);
        }
        setTerminalPayload(
          Array.from(
            { length: publicationCount },
            (_, index) => `synthetic-ui-${index.toString().padStart(3, "0")}\r\n`,
          ).join(""),
        );
      },
      switchSurface(view: "threads" | "studio") {
        setActiveView(view);
      },
    }),
    [],
  );

  const renderTerminalViewport = useCallback(
    (terminalId: string, options: { autoFocus: boolean; isVisible: boolean }) => (
      <InstrumentedXtermViewport
        terminalId={terminalId}
        isVisible={options.isVisible}
        streamPayload={options.isVisible ? terminalPayload : ""}
      />
    ),
    [terminalPayload],
  );

  return (
    <Profiler id="workbench-root" onRender={onRootRender}>
      <div
        data-performance-workbench
        className="grid h-[760px] w-[1280px] grid-cols-[260px_minmax(0,1fr)] overflow-hidden bg-background"
      >
        <aside className="min-w-0 border-r p-3">
          <StableSurfacePicker
            activeView={activeView}
            onSelectView={handleSelectView}
            onRender={onSidebarRender}
          />
        </aside>
        <main className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_280px]">
          <PerformanceTimeline entries={withSyntheticTail(stableEntries, streamText)} />
          <div className="min-h-0 border-t">
            <TerminalViewportPane
              groupId="performance-terminal-group"
              layout={{ ...TERMINAL_LAYOUT, weights: terminalWeights }}
              resolvedActiveTerminalId="terminal-visible"
              terminalVisualIdentityById={new Map()}
              onActiveTerminalChange={NOOP}
              onResizeSplit={(_groupId, _splitId, weights) => setTerminalWeights(weights)}
              renderViewport={renderTerminalViewport}
              presentationMode="drawer"
            />
          </div>
        </main>
      </div>
    </Profiler>
  );
});

function findScrollableTimeline(root: HTMLElement): HTMLElement {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>("*"));
  const scrollable = candidates.find((element) => {
    const style = getComputedStyle(element);
    return (
      /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 20
    );
  });
  if (!scrollable) throw new Error("The real virtual Timeline did not expose a scroll viewport.");
  return scrollable;
}

function findHorizontalSplitHandle(root: HTMLElement): HTMLElement {
  const handle = Array.from(root.querySelectorAll<HTMLElement>("div")).find(
    (element) => getComputedStyle(element).cursor === "col-resize" && element.clientHeight > 100,
  );
  if (!handle) throw new Error("The real terminal split did not expose its resize handle.");
  return handle;
}

function reportMetric(name: string, value: unknown): void {
  console.info(`OMNIMIND_PERF ${name} ${JSON.stringify(value)}`);
}

describe("Agent | Chat Workbench performance profile", () => {
  afterEach(async () => {
    await cleanup();
    terminalRenderCount.clear();
    terminalWriteCount.clear();
    document.body.innerHTML = "";
  });

  it("keeps switch, scroll, hover and split-resize p95 free of long tasks", async () => {
    const handle = { current: null as WorkbenchHandle | null };
    const mounted = await render(
      <WorkbenchHarness ref={handle} onRootRender={NOOP} onSidebarRender={NOOP} />,
    );
    await settleFrames(6);
    const scrollable = findScrollableTimeline(mounted.container);
    const splitHandle = findHorizontalSplitHandle(mounted.container);
    // T0 used the same exported mother component as a menu trigger; Work4 renders two tabs.
    // Switching through the component state keeps the measured rerender identical while hover
    // targets the real control exposed by each immutable source tree.
    const surfaceControls = Array.from(
      mounted.container.querySelectorAll<HTMLButtonElement>(
        "#sidebar-surface-tab-agent, #sidebar-surface-tab-chat, button[aria-label='Switch sidebar surface']",
      ),
    );
    expect(surfaceControls.length).toBeGreaterThan(0);

    const longTasks: PerformanceEntry[] = [];
    const observer = new PerformanceObserver((list) => longTasks.push(...list.getEntries()));
    observer.observe({ type: "longtask", buffered: false });
    const samples = {
      switch: [] as number[],
      scroll: [] as number[],
      hover: [] as number[],
      splitResize: [] as number[],
    };

    for (let index = 0; index < 12; index += 1) {
      samples.switch.push(
        await measureBrowserInteraction(() =>
          handle.current?.switchSurface(index % 2 === 0 ? "threads" : "studio"),
        ),
      );
      samples.scroll.push(
        await measureBrowserInteraction(() => {
          scrollable.scrollTop = index % 2 === 0 ? scrollable.scrollHeight : 0;
          scrollable.dispatchEvent(new Event("scroll", { bubbles: true }));
        }),
      );
      samples.hover.push(
        await measureBrowserInteraction(() => {
          const target = surfaceControls[index % surfaceControls.length]!;
          target.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
          void getComputedStyle(target).backgroundColor;
        }),
      );
      samples.splitResize.push(
        await measureBrowserInteraction(() => {
          const rect = splitHandle.getBoundingClientRect();
          splitHandle.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              cancelable: true,
              clientX: rect.left,
              clientY: rect.top + rect.height / 2,
            }),
          );
          window.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              clientX: rect.left + (index % 2 === 0 ? 24 : -24),
              clientY: rect.top + rect.height / 2,
            }),
          );
          window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        }),
      );
    }
    await settleFrames(2);
    observer.disconnect();

    const p95 = {
      switch: percentile95(samples.switch),
      scroll: percentile95(samples.scroll),
      hover: percentile95(samples.hover),
      splitResize: percentile95(samples.splitResize),
    };
    reportMetric("workbench-interactions", {
      browser: navigator.userAgent,
      buildMode: "Vitest browser / Vite transformed modules / headless Chromium",
      viewport: { width: innerWidth, height: innerHeight },
      fixture: { conversationMessages: 900, samplesPerInteraction: 12, terminalPanes: 2 },
      method: "browser-clock action-to-next-animation-frame on real UI components",
      p95Ms: p95,
      longTaskCount: longTasks.length,
      budgets: WORKBENCH_BUDGET,
      proofBoundary: "current Work4 renderer mechanisms; not Pi-native execution",
    });

    expect(Math.max(...Object.values(p95))).toBeLessThanOrEqual(
      WORKBENCH_BUDGET.maxInteractionP95Ms,
    );
    expect(longTasks.length).toBeLessThanOrEqual(WORKBENCH_BUDGET.maxInteractionLongTasks);
  });

  it("isolates the unchanged Sidebar and hidden xterm during synthetic bursts and recovers heap", async () => {
    const handle = { current: null as WorkbenchHandle | null };
    const rootCommits: number[] = [];
    const sidebarCommits: number[] = [];
    let publicationRootRenderCount = 0;
    const mounted = await render(
      <WorkbenchHarness
        ref={handle}
        onRootRender={(_id, _phase, duration) => rootCommits.push(duration)}
        onSidebarRender={(_id, _phase, duration) => sidebarCommits.push(duration)}
        onPublicationRootRender={() => {
          publicationRootRenderCount += 1;
        }}
      />,
    );
    await settleFrames(6);
    const heapBefore = await performanceCommands.collectBrowserHeap();
    rootCommits.length = 0;
    sidebarCommits.length = 0;
    publicationRootRenderCount = 0;
    terminalRenderCount.clear();
    terminalWriteCount.clear();

    handle.current?.publishSyntheticBurst(240);
    await settleFrames(5);
    await expect
      .poll(() => terminalWriteCount.get("terminal-visible") ?? 0, { timeout: 5_000 })
      .toBeGreaterThan(0);
    const heapAfter = await performanceCommands.collectBrowserHeap();
    const heapGrowthBytes = heapAfter.usedSize - heapBefore.usedSize;
    const hiddenRenders = terminalRenderCount.get("terminal-hidden") ?? 0;
    const hiddenWrites = terminalWriteCount.get("terminal-hidden") ?? 0;

    reportMetric("workbench-burst-isolation", {
      fixture: { syntheticPublications: 240, visibleXtermLines: 240, hiddenXtermCount: 1 },
      method:
        "same-task React publications + real TerminalViewportPane visibility seam + real xterm",
      publicationRootRenderCount,
      workbenchSubtreeCommitCount: rootCommits.length,
      workbenchSubtreeCommitDurationMs: rootCommits.reduce((sum, duration) => sum + duration, 0),
      sidebarCommitCount: sidebarCommits.length,
      visibleTerminalRenders: terminalRenderCount.get("terminal-visible") ?? 0,
      hiddenTerminalRenders: hiddenRenders,
      visibleTerminalWrites: terminalWriteCount.get("terminal-visible") ?? 0,
      hiddenTerminalWrites: hiddenWrites,
      heapBeforeUsedBytes: heapBefore.usedSize,
      heapAfterUsedBytes: heapAfter.usedSize,
      heapGrowthBytes,
      budgets: WORKBENCH_BUDGET,
      proofBoundary:
        "Product presentation and preserved terminal visibility seam only; Pi stream/acceptance is T4",
    });

    expect(publicationRootRenderCount).toBeLessThanOrEqual(WORKBENCH_BUDGET.maxRootCommitsPerBurst);
    expect(sidebarCommits.length).toBeLessThanOrEqual(WORKBENCH_BUDGET.maxSidebarCommitsPerBurst);
    expect(hiddenRenders).toBeLessThanOrEqual(WORKBENCH_BUDGET.maxHiddenTerminalRendersPerBurst);
    expect(hiddenWrites).toBeLessThanOrEqual(WORKBENCH_BUDGET.maxHiddenTerminalWritesPerBurst);
    expect(heapGrowthBytes).toBeLessThanOrEqual(WORKBENCH_BUDGET.maxPostGcHeapGrowthBytes);
    expect(mounted.container.querySelector('[data-terminal-id="terminal-visible"]')).toBeTruthy();
  });
});
