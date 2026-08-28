// FILE: MessagesTimeline.reasoning.browser.tsx
// Purpose: Browser-level contract for inline public reasoning disclosures.
// Layer: Vitest browser tests

import "../../index.css";

import { MessageId, TurnId } from "@harnessos/contracts";
import { type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "en" },
}));

vi.mock("../../localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

import { I18nProvider } from "../../i18n";
import { deriveTimelineEntries } from "../../session-logic";
import { applyOrchestrationEvents } from "../../storeEventReducer";
import { makeActivity, makeDomainEvent, makeState, makeThread } from "../../storeTestFixtures";
import { getThreadsFromState } from "../../threadDerivation";
import { deriveWorkLogEntries } from "../../workLog";
import { deriveAgentActivityTimelineState } from "./agentActivity.logic";
import { MessagesTimeline } from "./MessagesTimeline";
import { TimelineWorkEntryRow } from "./TimelineWorkEntryRow";

const LONG_REASONING =
  "I am checking the canonical sequence before opening https://example.test/a/very/long/source/path?query=reasoning-timeline-layout and then validating SupercalifragilisticexpialidociousRepeatedWithoutABreakSupercalifragilisticexpialidociousRepeatedWithoutABreak at the narrowest supported width.";
const LIVE_REASONING = Array.from(
  { length: 14 },
  (_, index) => `Public reasoning paragraph ${index + 1} stays in the provider's original text.`,
).join("\n\n");

function ReasoningRow(props: {
  onOpenAgentActivity?: (id: string) => void;
  reasoningDefaultOpen?: boolean;
  reasoningIsLive?: boolean;
  reasoningText?: string;
}) {
  return (
    <TimelineWorkEntryRow
      workEntry={{
        id: "agent-reasoning:reasoning-1",
        createdAt: "2026-08-24T13:30:40.000Z",
        label: "Reasoning",
        toolTitle: "Reasoning",
        activityKind: props.reasoningIsLive ? "reasoning.updated" : "reasoning.completed",
        tone: "thinking",
        reasoningEntries: props.reasoningText
          ? [{ id: "reasoning-live", text: props.reasoningText }]
          : [
              {
                id: "reasoning-1",
                text: "First public paragraph from the provider.",
              },
              { id: "reasoning-2", text: LONG_REASONING },
            ],
      }}
      chatMetaFontSizePx={12}
      textFontSizePx={13}
      density="compact"
      onImageExpand={() => {}}
      markdownCwd={undefined}
      {...(props.reasoningDefaultOpen === undefined
        ? {}
        : { reasoningDefaultOpen: props.reasoningDefaultOpen })}
      {...(props.reasoningIsLive === undefined ? {} : { reasoningIsLive: props.reasoningIsLive })}
      {...(props.onOpenAgentActivity ? { onOpenAgentActivity: props.onOpenAgentActivity } : {})}
      timestampFormat="locale"
    />
  );
}

function liveReasoningRow(text: string) {
  return (
    <I18nProvider>
      <ReasoningRow reasoningDefaultOpen reasoningIsLive reasoningText={text} />
    </I18nProvider>
  );
}

type TimelineEntries = ComponentProps<typeof MessagesTimeline>["timelineEntries"];

const baseTimelineProps = {
  hasMessages: true,
  activeTurnStartedAt: null,
  turnDiffSummaryByAssistantMessageId: new Map(),
  nowIso: "2026-08-24T13:30:50.000Z",
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

function reasoningEntry(
  id: string,
  turnId: TurnId,
  text: string,
  tone: "thinking" | "error" = "thinking",
  activityKind: "reasoning.updated" | "reasoning.completed" = "reasoning.completed",
) {
  return {
    id,
    kind: "work" as const,
    createdAt: `2026-08-24T13:30:${id.endsWith("2") ? "43" : "41"}.000Z`,
    entry: {
      id,
      createdAt: "2026-08-24T13:30:41.000Z",
      turnId,
      label: "Reasoning",
      tone,
      activityKind,
      reasoningEntries: [{ id: `${id}-part`, text }],
    },
  } satisfies TimelineEntries[number];
}

function projectedReasoningEntry(
  id: string,
  turnId: TurnId,
  text: string,
  tone: "info" | "error" = "info",
  truncated = false,
) {
  const [entry] = deriveWorkLogEntries(
    [
      makeActivity({
        id,
        createdAt: "2026-08-24T13:30:41.000Z",
        kind: "reasoning.completed",
        summary: "Reasoning trace",
        tone,
        turnId,
        payload: {
          status: tone === "error" ? "failed" : "completed",
          detail: text,
          data: { toolCallId: id, ...(truncated ? { reasoningDetailTruncated: true } : {}) },
        },
      }),
    ],
    undefined,
  );
  return deriveAgentActivityTimelineState([entry!]).timelineWorkEntries[0]!;
}

function toolEntry(
  id: string,
  turnId: TurnId,
  options: {
    label: string;
    itemType?: "dynamic_tool_call" | "web_search";
    requestKind?: "file-read";
    toolStatus?: "running";
  },
) {
  return {
    id,
    kind: "work" as const,
    createdAt: "2026-08-24T13:30:42.000Z",
    entry: {
      id,
      createdAt: "2026-08-24T13:30:42.000Z",
      turnId,
      label: options.label,
      toolTitle: options.label,
      tone: "tool" as const,
      itemType: options.itemType ?? "dynamic_tool_call",
      ...(options.requestKind ? { requestKind: options.requestKind } : {}),
      ...(options.toolStatus ? { toolStatus: options.toolStatus } : {}),
    },
  } satisfies TimelineEntries[number];
}

function assistantEntry(
  id: string,
  turnId: TurnId,
  text: string,
  options: { streaming?: boolean; completed?: boolean } = {},
) {
  return {
    id: MessageId.makeUnsafe(id),
    kind: "message" as const,
    createdAt: "2026-08-24T13:30:45.000Z",
    message: {
      id: MessageId.makeUnsafe(id),
      role: "assistant" as const,
      text,
      turnId,
      createdAt: "2026-08-24T13:30:45.000Z",
      ...(options.completed ? { completedAt: "2026-08-24T13:30:45.100Z" } : {}),
      streaming: options.streaming ?? false,
    },
  } satisfies TimelineEntries[number];
}

function AnswerStageTimeline(props: { settled: boolean }) {
  const turnId = TurnId.makeUnsafe("turn-answer-stage-browser");
  const timelineEntries: TimelineEntries = [
    assistantEntry("assistant-answer-preamble", turnId, "I will inspect the source.", {
      completed: true,
    }),
    reasoningEntry("reasoning-answer-stage", turnId, "Reasoning before the streamed answer."),
    toolEntry("tool-answer-stage", turnId, { label: "Read answer source" }),
    assistantEntry("assistant-answer-stream", turnId, "Streaming answer text.", {
      streaming: !props.settled,
      completed: props.settled,
    }),
  ];
  return (
    <MessagesTimeline
      {...baseTimelineProps}
      isWorking={!props.settled}
      activeTurnInProgress={!props.settled}
      activeTurnId={props.settled ? null : turnId}
      timelineEntries={timelineEntries}
      expandedWorkGroups={{}}
      onToggleWorkGroup={() => {}}
    />
  );
}

function ReasoningBoundaryTimeline(props: { stage: 0 | 1 | 2 | 3 }) {
  const turnId = TurnId.makeUnsafe("turn-reasoning-boundary-browser");
  const timelineEntries: TimelineEntries = [
    reasoningEntry(
      "reasoning-boundary-1",
      turnId,
      "First reasoning group.",
      "thinking",
      props.stage === 0 ? "reasoning.updated" : "reasoning.completed",
    ),
    ...(props.stage >= 1
      ? [toolEntry("tool-reasoning-boundary", turnId, { label: "Read boundary source" })]
      : []),
    ...(props.stage >= 2
      ? [
          reasoningEntry(
            "reasoning-boundary-2",
            turnId,
            "Second reasoning group.",
            "thinking",
            props.stage === 2 ? "reasoning.updated" : "reasoning.completed",
          ),
        ]
      : []),
    ...(props.stage >= 3
      ? [
          assistantEntry("assistant-reasoning-boundary", turnId, "Final answer is streaming.", {
            streaming: true,
          }),
        ]
      : []),
  ];
  return (
    <MessagesTimeline
      {...baseTimelineProps}
      isWorking
      activeTurnInProgress
      activeTurnId={turnId}
      timelineEntries={timelineEntries}
      expandedWorkGroups={{}}
      onToggleWorkGroup={() => {}}
    />
  );
}

function AlignedActivityRowsTimeline(props: { theme: "light" | "dark" }) {
  const turnId = TurnId.makeUnsafe("turn-activity-icon-alignment");
  const timelineEntries: TimelineEntries = [
    {
      id: "alignment-git-command",
      kind: "work",
      createdAt: "2026-08-24T13:30:40.000Z",
      entry: {
        id: "alignment-git-command",
        createdAt: "2026-08-24T13:30:40.000Z",
        turnId,
        label: "Ran command",
        toolTitle: "Ran command",
        tone: "tool",
        itemType: "command_execution",
        command: "git status",
      },
    },
    reasoningEntry(
      "alignment-reasoning",
      turnId,
      "Public reasoning stays collapsed after settlement.",
    ),
    {
      id: "alignment-omnimind-message",
      kind: "work",
      createdAt: "2026-08-24T13:30:42.000Z",
      entry: {
        id: "alignment-omnimind-message",
        createdAt: "2026-08-24T13:30:42.000Z",
        turnId,
        label: "OmniMind sent a message",
        toolTitle: "OmniMind sent a message",
        toolName: "mcp__omnimind__omnimind_send_message",
        tone: "tool",
        itemType: "mcp_tool_call",
      },
    },
  ];

  return (
    <MessagesTimeline
      {...baseTimelineProps}
      isWorking
      activeTurnInProgress
      activeTurnId={turnId}
      timelineEntries={timelineEntries}
      expandedWorkGroups={{}}
      onToggleWorkGroup={() => {}}
      resolvedTheme={props.theme}
    />
  );
}

function ReducedLiveCausalTimeline(props: { settled: boolean }) {
  const thread = makeThread();
  const turnId = TurnId.makeUnsafe("turn-reduced-live-browser");
  const messageId = MessageId.makeUnsafe("assistant-reduced-live-browser");
  const events = [
    makeDomainEvent(
      "thread.message-sent",
      {
        threadId: thread.id,
        messageId,
        role: "assistant",
        text: "Narration from the live reducer.",
        segmentStartedAt: "2026-08-24T13:30:40.000Z",
        segmentSequence: 9,
        turnId,
        streaming: true,
        createdAt: "2026-08-24T13:30:40.000Z",
        updatedAt: "2026-08-24T13:30:40.000Z",
        attachments: [],
        source: "native",
      },
      { sequence: 15 },
    ),
    makeDomainEvent(
      "thread.activity-appended",
      {
        threadId: thread.id,
        activity: makeActivity({
          id: "reasoning-reduced-live-1",
          createdAt: "2026-08-24T13:30:41.000Z",
          sequence: 11,
          turnId,
          kind: "reasoning.completed",
          summary: "Reasoning trace",
          tone: "info",
          payload: {
            status: "completed",
            detail: "First reasoning from the live timeline.",
            data: { toolCallId: "reasoning-reduced-live-1" },
          },
        }),
      },
      { sequence: 16 },
    ),
    makeDomainEvent(
      "thread.activity-appended",
      {
        threadId: thread.id,
        activity: makeActivity({
          id: "tool-reduced-live-1-started",
          createdAt: "2026-08-24T13:30:42.000Z",
          sequence: 12,
          turnId,
          kind: "tool.started",
          summary: "Read first live source",
          payload: {
            status: "running",
            itemType: "dynamic_tool_call",
            data: { toolCallId: "tool-reduced-live-1", toolName: "Read" },
          },
        }),
      },
      { sequence: 17 },
    ),
    makeDomainEvent(
      "thread.activity-appended",
      {
        threadId: thread.id,
        activity: makeActivity({
          id: "tool-reduced-live-1-completed",
          createdAt: "2026-08-24T13:30:42.100Z",
          sequence: 13,
          turnId,
          kind: "tool.completed",
          summary: "Read first live source",
          payload: {
            status: "completed",
            itemType: "dynamic_tool_call",
            detail: "Read first live source",
            data: { toolCallId: "tool-reduced-live-1", toolName: "Read" },
          },
        }),
      },
      { sequence: 18 },
    ),
    makeDomainEvent(
      "thread.activity-appended",
      {
        threadId: thread.id,
        activity: makeActivity({
          id: "reasoning-reduced-live-2",
          createdAt: "2026-08-24T13:30:43.000Z",
          sequence: 14,
          turnId,
          kind: "reasoning.completed",
          summary: "Reasoning trace",
          tone: "info",
          payload: {
            status: "completed",
            detail: "Second reasoning from the live timeline.",
            data: { toolCallId: "reasoning-reduced-live-2" },
          },
        }),
      },
      { sequence: 19 },
    ),
    makeDomainEvent(
      "thread.activity-appended",
      {
        threadId: thread.id,
        activity: makeActivity({
          id: "tool-reduced-live-2-started",
          createdAt: "2026-08-24T13:30:44.000Z",
          sequence: 15,
          turnId,
          kind: "tool.started",
          summary: "Read second live source",
          payload: {
            status: "running",
            itemType: "dynamic_tool_call",
            data: { toolCallId: "tool-reduced-live-2", toolName: "Read" },
          },
        }),
      },
      { sequence: 20 },
    ),
    makeDomainEvent(
      "thread.activity-appended",
      {
        threadId: thread.id,
        activity: makeActivity({
          id: "tool-reduced-live-2-completed",
          createdAt: "2026-08-24T13:30:44.100Z",
          sequence: 16,
          turnId,
          kind: "tool.completed",
          summary: "Read second live source",
          payload: {
            status: "completed",
            itemType: "dynamic_tool_call",
            detail: "Read second live source",
            data: { toolCallId: "tool-reduced-live-2", toolName: "Read" },
          },
        }),
      },
      { sequence: 21 },
    ),
    makeDomainEvent(
      "thread.message-sent",
      {
        threadId: thread.id,
        messageId,
        role: "assistant",
        text: "Answer from the live reducer.",
        segmentStartedAt: "2026-08-24T13:30:45.000Z",
        segmentSequence: 17,
        turnId,
        streaming: true,
        createdAt: "2026-08-24T13:30:45.000Z",
        updatedAt: "2026-08-24T13:30:45.000Z",
        attachments: [],
        source: "native",
      },
      { sequence: 22 },
    ),
    ...(props.settled
      ? [
          makeDomainEvent(
            "thread.message-sent",
            {
              threadId: thread.id,
              messageId,
              role: "assistant" as const,
              text: "",
              turnId,
              streaming: false,
              createdAt: "2026-08-24T13:30:46.000Z",
              updatedAt: "2026-08-24T13:30:46.000Z",
              attachments: [],
              source: "native" as const,
            },
            { sequence: 23 },
          ),
        ]
      : []),
  ];
  const reducedState = applyOrchestrationEvents(makeState(thread), events);
  const reducedThread = getThreadsFromState(reducedState)[0]!;
  const messages = reducedThread.messages;
  const workEntries = deriveWorkLogEntries(reducedThread.activities, undefined);
  const projectedWork = deriveAgentActivityTimelineState(workEntries, messages);
  const timelineEntries = deriveTimelineEntries(messages, [], projectedWork.timelineWorkEntries);

  return (
    <MessagesTimeline
      {...baseTimelineProps}
      isWorking={!props.settled}
      activeTurnInProgress={!props.settled}
      activeTurnId={props.settled ? null : turnId}
      timelineEntries={timelineEntries}
      expandedWorkGroups={{}}
      onToggleWorkGroup={() => {}}
    />
  );
}

function InsertedLiveCausalTimeline(props: { split: boolean }) {
  const turnId = TurnId.makeUnsafe("turn-inserted-live-browser");
  const terminal = assistantEntry(
    "assistant-inserted-live-browser",
    turnId,
    "Answer from the inserted live row.",
    { streaming: true },
  );
  const timelineEntries: TimelineEntries = props.split
    ? [
        assistantEntry(
          "assistant-inserted-live-browser#segment:0",
          turnId,
          "Narration inserted before the live answer.",
          { completed: true },
        ),
        reasoningEntry(
          "reasoning-inserted-live",
          turnId,
          "Reasoning before the inserted live answer.",
        ),
        toolEntry("tool-inserted-live", turnId, { label: "Read inserted live source" }),
        terminal,
      ]
    : [terminal];

  return (
    <MessagesTimeline
      {...baseTimelineProps}
      isWorking
      activeTurnInProgress
      activeTurnId={turnId}
      timelineEntries={timelineEntries}
      expandedWorkGroups={{}}
      onToggleWorkGroup={() => {}}
    />
  );
}

function FailedReasoningTimeline() {
  const turnId = TurnId.makeUnsafe("turn-failed-reasoning-browser");
  const failedReasoning = projectedReasoningEntry(
    "reasoning-failure",
    turnId,
    "Public reasoning before failure.",
    "error",
  );
  return (
    <MessagesTimeline
      {...baseTimelineProps}
      isWorking
      activeTurnInProgress
      activeTurnId={turnId}
      timelineEntries={[
        assistantEntry("assistant-failure-before", turnId, "I will try this.", {
          completed: true,
        }),
        {
          id: failedReasoning.id,
          kind: "work" as const,
          createdAt: failedReasoning.createdAt,
          entry: failedReasoning,
        },
        assistantEntry("assistant-failure-after", turnId, "The operation failed.", {
          completed: true,
        }),
      ]}
      expandedWorkGroups={{}}
      onToggleWorkGroup={() => {}}
    />
  );
}

function TruncatedReasoningRow() {
  const text = "UnbrokenReasoningToken".repeat(380);
  const entry = projectedReasoningEntry(
    "reasoning-truncated-browser",
    TurnId.makeUnsafe("turn-truncated-reasoning-browser"),
    text,
    "info",
    true,
  );
  return (
    <TimelineWorkEntryRow
      workEntry={entry}
      chatMetaFontSizePx={12}
      textFontSizePx={13}
      density="compact"
      onImageExpand={() => {}}
      markdownCwd={undefined}
      timestampFormat="locale"
    />
  );
}

function SettledSummaryTimeline() {
  const turnId = TurnId.makeUnsafe("turn-summary-browser");
  return (
    <MessagesTimeline
      {...baseTimelineProps}
      isWorking={false}
      activeTurnInProgress={false}
      timelineEntries={[
        assistantEntry("assistant-summary-before", turnId, "Before grouped work.", {
          completed: true,
        }),
        toolEntry("read-summary-1", turnId, {
          label: "Read alpha.ts",
          requestKind: "file-read",
        }),
        toolEntry("read-summary-2", turnId, {
          label: "Read beta.ts",
          requestKind: "file-read",
        }),
        reasoningEntry("reasoning-summary", turnId, "Reasoning between grouped tools."),
        toolEntry("search-summary-1", turnId, {
          label: "Search first source",
          itemType: "web_search",
        }),
        toolEntry("search-summary-2", turnId, {
          label: "Search second source",
          itemType: "web_search",
        }),
        assistantEntry("assistant-summary-after", turnId, "After grouped work.", {
          completed: true,
        }),
      ]}
      expandedWorkGroups={{}}
      onToggleWorkGroup={() => {}}
    />
  );
}

function ToolCapTimeline() {
  const turnId = TurnId.makeUnsafe("turn-tool-cap-browser");
  const toolsBefore = Array.from({ length: 5 }, (_, index) =>
    toolEntry(`cap-tool-${index + 1}`, turnId, {
      label: `Cap tool ${index + 1}`,
      toolStatus: "running",
    }),
  );
  const toolsAfter = Array.from({ length: 2 }, (_, index) =>
    toolEntry(`cap-tool-${index + 6}`, turnId, {
      label: `Cap tool ${index + 6}`,
      toolStatus: "running",
    }),
  );
  return (
    <MessagesTimeline
      {...baseTimelineProps}
      isWorking
      activeTurnInProgress
      activeTurnId={turnId}
      timelineEntries={[
        ...toolsBefore,
        reasoningEntry("reasoning-cap", turnId, "Reasoning remains at its causal position."),
        ...toolsAfter,
      ]}
      expandedWorkGroups={{}}
      onToggleWorkGroup={() => {}}
    />
  );
}

function CausalReasoningTimeline() {
  const turnId = TurnId.makeUnsafe("turn-causal-browser");
  return (
    <MessagesTimeline
      hasMessages
      isWorking={false}
      activeTurnInProgress={false}
      activeTurnStartedAt={null}
      timelineEntries={[
        {
          id: MessageId.makeUnsafe("assistant-causal-before"),
          kind: "message",
          createdAt: "2026-08-24T13:30:40.000Z",
          sequence: 10,
          message: {
            id: MessageId.makeUnsafe("assistant-causal-before"),
            role: "assistant",
            text: "Narration before work.",
            turnId,
            createdAt: "2026-08-24T13:30:40.000Z",
            completedAt: "2026-08-24T13:30:40.100Z",
            streaming: false,
          },
        },
        {
          id: "reasoning-causal-1",
          kind: "work",
          createdAt: "2026-08-24T13:30:41.000Z",
          sequence: 11,
          entry: {
            id: "reasoning-causal-1",
            createdAt: "2026-08-24T13:30:41.000Z",
            sequence: 11,
            turnId,
            label: "Reasoning",
            tone: "thinking",
            activityKind: "reasoning.completed",
            reasoningEntries: [{ id: "reasoning-part-1", text: "First public reasoning." }],
          },
        },
        {
          id: "tool-causal-1",
          kind: "work",
          createdAt: "2026-08-24T13:30:42.000Z",
          sequence: 12,
          entry: {
            id: "tool-causal-1",
            createdAt: "2026-08-24T13:30:42.000Z",
            sequence: 12,
            turnId,
            label: "First tool",
            toolTitle: "First tool",
            tone: "tool",
            itemType: "dynamic_tool_call",
          },
        },
        {
          id: "reasoning-causal-2",
          kind: "work",
          createdAt: "2026-08-24T13:30:43.000Z",
          sequence: 13,
          entry: {
            id: "reasoning-causal-2",
            createdAt: "2026-08-24T13:30:43.000Z",
            sequence: 13,
            turnId,
            label: "Reasoning",
            tone: "thinking",
            activityKind: "reasoning.completed",
            reasoningEntries: [{ id: "reasoning-part-2", text: "Second public reasoning." }],
          },
        },
        {
          id: "tool-causal-2",
          kind: "work",
          createdAt: "2026-08-24T13:30:44.000Z",
          sequence: 14,
          entry: {
            id: "tool-causal-2",
            createdAt: "2026-08-24T13:30:44.000Z",
            sequence: 14,
            turnId,
            label: "Second tool",
            toolTitle: "Second tool",
            tone: "tool",
            itemType: "dynamic_tool_call",
          },
        },
        {
          id: MessageId.makeUnsafe("assistant-causal-after"),
          kind: "message",
          createdAt: "2026-08-24T13:30:45.000Z",
          sequence: 15,
          message: {
            id: MessageId.makeUnsafe("assistant-causal-after"),
            role: "assistant",
            text: "Answer after work.",
            turnId,
            createdAt: "2026-08-24T13:30:45.000Z",
            completedAt: "2026-08-24T13:30:45.100Z",
            streaming: false,
          },
        },
      ]}
      turnDiffSummaryByAssistantMessageId={new Map()}
      nowIso="2026-08-24T13:30:46.000Z"
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

function createNarrowHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.style.cssText = "width:480px;max-width:480px;height:620px;overflow:hidden;";
  host.className = "dark bg-background text-foreground";
  document.body.append(host);
  return host;
}

function timelineAssistantRowIds(): Array<string | undefined> {
  return [
    ...document.querySelectorAll<HTMLElement>(
      "[data-timeline-row-kind='message'][data-message-role='assistant']",
    ),
  ].map((row) => row.dataset.messageId);
}

async function settleLayout(): Promise<void> {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

describe("Timeline public reasoning disclosure", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    harness.settings.localePreference = "en";
  });

  it("uses brain-2 and keeps live public reasoning open in a bounded, icon-free viewport", async () => {
    const onOpenAgentActivity = vi.fn();
    const consoleError = vi.spyOn(console, "error");
    const host = createNarrowHost();
    const screen = await render(
      <I18nProvider>
        <ReasoningRow
          onOpenAgentActivity={onOpenAgentActivity}
          reasoningDefaultOpen
          reasoningIsLive
          reasoningText={LIVE_REASONING}
        />
      </I18nProvider>,
      { container: host },
    );

    try {
      const trigger = screen.getByRole("button", { name: "Reasoning", exact: true }).element();
      const controlledId = trigger.getAttribute("aria-controls");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(controlledId).toBeTruthy();
      expect(document.getElementById(controlledId!)).not.toBeNull();
      expect(document.querySelector('[data-central-icon-name="brain-2"]')).not.toBeNull();
      expect(document.body.textContent ?? "").toContain("Public reasoning paragraph 14");
      expect(document.body.textContent ?? "").not.toContain("updates");
      expect(document.body.textContent ?? "").not.toContain("hidden reasoning");
      expect(document.querySelector("[data-agent-activity-detail='true']")).toBeNull();
      expect(onOpenAgentActivity).not.toHaveBeenCalled();

      await settleLayout();
      const viewport = document.querySelector<HTMLElement>(
        "[data-reasoning-scroll-viewport='true']",
      )!;
      const heightToggle = screen.getByRole("button", { name: "Expand reasoning fully" }).element();
      expect(viewport.dataset.reasoningHeightState).toBe("compact");
      expect(viewport.clientHeight).toBeLessThanOrEqual(126);
      expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
      expect(
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
      ).toBeLessThanOrEqual(2);
      expect(heightToggle.textContent).toBe("");
      expect(document.querySelector("[data-reasoning-height-icon]")).toBeNull();

      await userEvent.click(viewport);
      expect(viewport.dataset.reasoningHeightState).toBe("full");
      expect(heightToggle.getAttribute("aria-expanded")).toBe("true");
      expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.clientHeight);

      await userEvent.click(viewport);
      await settleLayout();
      expect(viewport.dataset.reasoningHeightState).toBe("compact");
      expect(heightToggle.getAttribute("aria-expanded")).toBe("false");
      expect(
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
      ).toBeLessThanOrEqual(2);

      trigger.focus();
      await userEvent.keyboard("{Enter}");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(
        document.getElementById(controlledId!)?.querySelector("[aria-hidden='true']"),
      ).not.toBeNull();
      expect(onOpenAgentActivity).not.toHaveBeenCalled();

      await userEvent.keyboard(" ");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(onOpenAgentActivity).not.toHaveBeenCalled();

      const disclosure = document.querySelector<HTMLElement>("[data-reasoning-disclosure='true']");
      const motionNodes = disclosure?.querySelectorAll<HTMLElement>(
        "[class*='motion-reduce:transition-none']",
      );
      expect((motionNodes?.length ?? 0) >= 2).toBe(true);
      expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
      expect(disclosure?.scrollWidth ?? 0).toBeLessThanOrEqual(disclosure?.clientWidth ?? 0);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      await screen.unmount();
      host.remove();
    }
  });

  it.each(["light", "dark"] as const)(
    "keeps command, reasoning, and OmniMind activity headings on one leading column in %s mode",
    async (theme) => {
      const host = createNarrowHost();
      host.className =
        theme === "dark" ? "dark bg-background text-foreground" : "bg-background text-foreground";
      const screen = await render(
        <I18nProvider>
          <AlignedActivityRowsTimeline theme={theme} />
        </I18nProvider>,
        { container: host },
      );

      try {
        await settleLayout();
        const iconSlots = [...host.querySelectorAll<HTMLElement>("[data-work-entry-icon='true']")];
        const labels = [
          ...host.querySelectorAll<HTMLElement>("[data-work-entry-display-text='true']"),
        ];
        expect(iconSlots).toHaveLength(3);
        expect(labels).toHaveLength(3);

        const iconCenters = iconSlots.map((slot) => {
          const rect = slot.getBoundingClientRect();
          expect(rect.width).toBeCloseTo(16, 1);
          expect(rect.height).toBeCloseTo(16, 1);
          return rect.left + rect.width / 2;
        });
        const labelStarts = labels.map((label) => label.getBoundingClientRect().left);
        expect(Math.max(...iconCenters) - Math.min(...iconCenters)).toBeLessThanOrEqual(0.5);
        expect(Math.max(...labelStarts) - Math.min(...labelStarts)).toBeLessThanOrEqual(0.5);

        const brain = host.querySelector<HTMLElement>("[data-central-icon-name='brain-2']");
        const github = host.querySelector<SVGElement>("[data-tool-icon='github'] svg");
        const omnimind = host.querySelector<SVGElement>("[data-tool-icon='omnimind'] svg");
        expect(brain?.getBoundingClientRect().width).toBeCloseTo(16, 1);
        expect(github?.getBoundingClientRect().width).toBeCloseTo(14, 1);
        // The product mark has transparent artwork padding, so its narrow icon
        // owner compensates optically while the shared 16px slot stays fixed.
        expect(omnimind?.getBoundingClientRect().width ?? 0).toBeGreaterThan(14);
        expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
      } finally {
        await screen.unmount();
        host.remove();
      }
    },
  );

  it("localizes the icon-free height control in Simplified Chinese", async () => {
    harness.settings.localePreference = "zh-CN";
    const host = createNarrowHost();
    const screen = await render(
      <I18nProvider>
        <ReasoningRow reasoningDefaultOpen reasoningIsLive reasoningText={LIVE_REASONING} />
      </I18nProvider>,
      { container: host },
    );

    try {
      const trigger = screen.getByRole("button", { name: "思考", exact: true }).element();
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(document.body.textContent ?? "").not.toContain("条更新");
      expect(document.body.textContent ?? "").toContain("Public reasoning paragraph 14");
      expect(screen.getByRole("button", { name: "完整展开思考" }).element().textContent).toBe("");
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("toggles live height from the keyboard and does not toggle while selecting text", async () => {
    const host = createNarrowHost();
    const screen = await render(
      <I18nProvider>
        <ReasoningRow reasoningDefaultOpen reasoningIsLive reasoningText={LIVE_REASONING} />
      </I18nProvider>,
      { container: host },
    );

    try {
      const viewport = document.querySelector<HTMLElement>(
        "[data-reasoning-scroll-viewport='true']",
      )!;
      const heightToggle = screen.getByRole("button", { name: "Expand reasoning fully" }).element();
      heightToggle.focus();
      await userEvent.keyboard("{Enter}");
      expect(viewport.dataset.reasoningHeightState).toBe("full");
      await userEvent.keyboard(" ");
      expect(viewport.dataset.reasoningHeightState).toBe("compact");

      const providerText = document.querySelector<HTMLElement>(
        "[data-reasoning-provider-text='true']",
      )!;
      await expect.poll(() => providerText.textContent).toContain("Public reasoning paragraph 14");
      const walker = document.createTreeWalker(providerText, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode && !textNode.textContent?.trim()) {
        textNode = walker.nextNode();
      }
      expect(textNode).toBeInstanceOf(Text);
      const selection = window.getSelection()!;
      const range = document.createRange();
      range.setStart(textNode!, 0);
      range.setEnd(textNode!, Math.min(12, textNode!.textContent?.length ?? 0));
      selection.removeAllRanges();
      selection.addRange(range);
      viewport.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(viewport.dataset.reasoningHeightState).toBe("compact");
      selection.removeAllRanges();
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("follows appended live reasoning until the reader scrolls away, then resumes at the tail", async () => {
    const host = createNarrowHost();
    const screen = await render(liveReasoningRow(LIVE_REASONING), { container: host });

    try {
      await expect.poll(() => document.body.textContent).toContain("Public reasoning paragraph 14");
      await settleLayout();
      const viewport = document.querySelector<HTMLElement>(
        "[data-reasoning-scroll-viewport='true']",
      )!;
      const disclosure = document.querySelector<HTMLElement>("[data-reasoning-disclosure='true']")!;
      const trigger = screen.getByRole("button", { name: "Reasoning", exact: true }).element();
      expect(
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
      ).toBeLessThanOrEqual(2);

      viewport.scrollTop = 0;
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      await screen.rerender(
        liveReasoningRow(`${LIVE_REASONING}\n\nAn appended paragraph stays below.`),
      );
      await expect
        .poll(() => document.body.textContent)
        .toContain("An appended paragraph stays below.");
      await settleLayout();
      expect(document.querySelector("[data-reasoning-disclosure='true']")).toBe(disclosure);
      expect(screen.getByRole("button", { name: "Reasoning", exact: true }).element()).toBe(
        trigger,
      );
      expect(document.querySelector("[data-reasoning-scroll-viewport='true']")).toBe(viewport);
      expect(viewport.scrollTop).toBe(0);

      viewport.scrollTop = viewport.scrollHeight;
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      await screen.rerender(
        liveReasoningRow(
          `${LIVE_REASONING}\n\nAn appended paragraph stays below.\n\nThe newest paragraph.`,
        ),
      );
      await expect.poll(() => document.body.textContent).toContain("The newest paragraph.");
      await settleLayout();
      expect(document.querySelector("[data-reasoning-disclosure='true']")).toBe(disclosure);
      expect(screen.getByRole("button", { name: "Reasoning", exact: true }).element()).toBe(
        trigger,
      );
      expect(
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
      ).toBeLessThanOrEqual(2);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("shows the localized reasoning truncation notice without altering provider text or overflowing at 480px", async () => {
    const host = createNarrowHost();
    const screen = await render(
      <I18nProvider>
        <TruncatedReasoningRow />
      </I18nProvider>,
      { container: host },
    );

    try {
      const trigger = screen.getByRole("button", { name: "Reasoning", exact: true }).element();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      await userEvent.click(trigger);
      await settleLayout();
      const disclosure = document.querySelector<HTMLElement>("[data-reasoning-disclosure='true']");
      const providerText = document.querySelector<HTMLElement>(
        "[data-reasoning-provider-text='true']",
      );
      const notice = document.querySelector<HTMLElement>(
        "[data-reasoning-truncation-notice='true']",
      );
      expect(providerText?.textContent ?? "").not.toContain("... [truncated]");
      expect(notice?.textContent).toBe("Content truncated");
      expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
      expect(disclosure?.scrollWidth ?? 0).toBeLessThanOrEqual(disclosure?.clientWidth ?? 0);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("localizes the reasoning truncation notice in Simplified Chinese", async () => {
    harness.settings.localePreference = "zh-CN";
    const host = createNarrowHost();
    const screen = await render(
      <I18nProvider>
        <TruncatedReasoningRow />
      </I18nProvider>,
      { container: host },
    );

    try {
      const trigger = screen.getByRole("button", { name: "思考", exact: true }).element();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      await userEvent.click(trigger);
      await settleLayout();
      expect(document.body.textContent ?? "").toContain("内容已截断");
      expect(document.body.textContent ?? "").not.toContain("Content truncated");
      expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("renders assistant, reasoning, and tools in their canonical causal order", async () => {
    const host = createNarrowHost();
    const screen = await render(<CausalReasoningTimeline />, { container: host });

    try {
      const text = document.body.textContent ?? "";
      const orderedText = [
        "Narration before work.",
        "First public reasoning.",
        "First tool",
        "Second public reasoning.",
        "Second tool",
        "Answer after work.",
      ];
      const positions = orderedText.map((value) => text.indexOf(value));
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].toSorted((left, right) => left - right));
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("keeps reducer-produced narration in process and settles the same disclosure in place", async () => {
    const host = createNarrowHost();
    const screen = await render(<ReducedLiveCausalTimeline settled={false} />, {
      container: host,
    });

    try {
      const narrationId = "assistant-reduced-live-browser#segment:0";
      const answerId = "assistant-reduced-live-browser";
      expect(document.querySelector(`[data-assistant-message-id="${narrationId}"]`)).toBeNull();
      expect(document.querySelector(`[data-assistant-message-id="${answerId}"]`)).not.toBeNull();
      const processRow = document.querySelector<HTMLElement>(
        "[data-timeline-row-kind='turn-process']",
      );

      const text = document.body.textContent ?? "";
      const orderedText = [
        "Narration from the live reducer.",
        "First reasoning from the live timeline.",
        "Read first live source",
        "Second reasoning from the live timeline.",
        "Read second live source",
        "Answer from the live reducer.",
      ];
      const positions = orderedText.map((value) => text.indexOf(value));
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].toSorted((left, right) => left - right));
      expect(document.querySelectorAll('[data-tool-detail-trigger="true"]')).toHaveLength(2);

      const triggers = screen.getByRole("button", { name: "Reasoning", exact: true }).elements();
      expect(triggers).toHaveLength(2);
      expect(triggers.map((trigger) => trigger.getAttribute("aria-expanded"))).toEqual([
        "false",
        "false",
      ]);

      await screen.rerender(<ReducedLiveCausalTimeline settled />);
      expect(document.querySelector<HTMLElement>("[data-timeline-row-kind='turn-process']")).toBe(
        processRow,
      );
      await expect
        .poll(() => triggers.map((trigger) => trigger.getAttribute("aria-expanded")))
        .toEqual(["false", "false"]);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("keeps only the causal-tail reasoning open and closes it at each visible boundary", async () => {
    const host = createNarrowHost();
    const screen = await render(<ReasoningBoundaryTimeline stage={0} />, { container: host });

    try {
      const firstTrigger = screen.getByRole("button", { name: "Reasoning", exact: true }).element();
      expect(firstTrigger.getAttribute("aria-expanded")).toBe("true");

      await screen.rerender(<ReasoningBoundaryTimeline stage={1} />);
      await expect.poll(() => firstTrigger.getAttribute("aria-expanded")).toBe("false");
      expect(screen.getByRole("button", { name: "Reasoning", exact: true }).element()).toBe(
        firstTrigger,
      );

      await screen.rerender(<ReasoningBoundaryTimeline stage={2} />);
      const liveTriggers = screen
        .getByRole("button", { name: "Reasoning", exact: true })
        .elements();
      expect(liveTriggers.map((trigger) => trigger.getAttribute("aria-expanded"))).toEqual([
        "false",
        "true",
      ]);

      await userEvent.click(liveTriggers[0]!);
      await expect
        .poll(() =>
          screen
            .getByRole("button", { name: "Reasoning", exact: true })
            .elements()[0]
            ?.getAttribute("aria-expanded"),
        )
        .toBe("true");

      await screen.rerender(<ReasoningBoundaryTimeline stage={3} />);
      await expect
        .poll(() =>
          screen
            .getByRole("button", { name: "Reasoning", exact: true })
            .elements()
            .map((trigger) => trigger.getAttribute("aria-expanded")),
        )
        .toEqual(["true", "false"]);
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("keeps virtualized live rows in canonical DOM order when a segment is inserted", async () => {
    const host = createNarrowHost();
    const screen = await render(<InsertedLiveCausalTimeline split={false} />, {
      container: host,
    });

    try {
      expect(timelineAssistantRowIds()).toEqual(["assistant-inserted-live-browser"]);
      await screen.rerender(<InsertedLiveCausalTimeline split />);
      await settleLayout();
      expect(timelineAssistantRowIds()).toEqual(["assistant-inserted-live-browser"]);

      const text = document.body.textContent ?? "";
      const orderedText = [
        "Narration inserted before the live answer.",
        "Reasoning before the inserted live answer.",
        "Read inserted live source",
        "Answer from the inserted live row.",
      ];
      const positions = orderedText.map((value) => text.indexOf(value));
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].toSorted((left, right) => left - right));
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("keeps settled tool summaries on each side of reasoning in DOM order", async () => {
    const host = createNarrowHost();
    const screen = await render(<SettledSummaryTimeline />, {
      container: host,
    });

    try {
      await userEvent.click(screen.getByRole("button", { name: /Worked for/ }));
      const text = document.body.textContent ?? "";
      const orderedText = [
        "Before grouped work.",
        "Read 2 files",
        "Reasoning between grouped tools.",
        "Searched 2 files",
        "After grouped work.",
      ];
      const positions = orderedText.map((value) => text.indexOf(value));
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].toSorted((left, right) => left - right));
      expect(screen.getByRole("button", { name: /Read 2 files/ }).element()).toBeTruthy();
      expect(screen.getByRole("button", { name: /Searched 2 files/ }).element()).toBeTruthy();
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("preserves reasoning between independently summarized tool runs", async () => {
    const host = createNarrowHost();
    const screen = await render(<ToolCapTimeline />, { container: host });

    try {
      const text = document.body.textContent ?? "";
      expect(text).not.toContain("Cap tool 1");
      expect(text).toContain("Reasoning remains at its causal position.");
      const positions = [
        text.indexOf("Used 5 tools"),
        text.indexOf("Reasoning remains at its causal position."),
        text.indexOf("Used 2 tools"),
      ];
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].toSorted((left, right) => left - right));

      await userEvent.click(screen.getByRole("button", { name: "Used 5 tools" }));
      expect(document.body.textContent ?? "").toContain("Cap tool 1");
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("localizes nested tool summaries in Simplified Chinese", async () => {
    harness.settings.localePreference = "zh-CN";
    const host = createNarrowHost();
    const screen = await render(
      <I18nProvider>
        <ToolCapTimeline />
      </I18nProvider>,
      { container: host },
    );

    try {
      expect(screen.getByRole("button", { name: "使用了 5 个工具" }).element()).toBeTruthy();
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("closes answer-stage reasoning before the final answer streams and keeps it settled", async () => {
    const host = createNarrowHost();
    const screen = await render(<AnswerStageTimeline settled={false} />, {
      container: host,
    });

    try {
      const trigger = screen.getByRole("button", { name: "Reasoning", exact: true }).element();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.querySelector("[data-reasoning-height-toggle='true']")).toBeNull();
      await screen.rerender(<AnswerStageTimeline settled />);
      await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.querySelector("[data-reasoning-height-toggle='true']")).toBeNull();
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("does not overwrite a disclosure choice when a live turn settles", async () => {
    const host = createNarrowHost();
    const screen = await render(<AnswerStageTimeline settled={false} />, {
      container: host,
    });

    try {
      const trigger = screen.getByRole("button", { name: "Reasoning", exact: true }).element();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      await userEvent.click(trigger);
      await expect
        .poll(() =>
          screen
            .getByRole("button", { name: "Reasoning", exact: true })
            .element()
            .getAttribute("aria-expanded"),
        )
        .toBe("true");

      await screen.rerender(<AnswerStageTimeline settled />);
      await settleLayout();
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    } finally {
      await screen.unmount();
      host.remove();
    }
  });

  it("starts failed reasoning collapsed", async () => {
    const host = createNarrowHost();
    const screen = await render(<FailedReasoningTimeline />, {
      container: host,
    });

    try {
      expect(
        screen
          .getByRole("button", { name: "Reasoning", exact: true })
          .element()
          .getAttribute("aria-expanded"),
      ).toBe("false");
    } finally {
      await screen.unmount();
      host.remove();
    }
  });
});
