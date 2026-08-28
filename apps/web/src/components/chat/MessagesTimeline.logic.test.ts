import {
  CheckpointRef,
  MessageId,
  OrchestrationProposedPlanId,
  TurnId,
} from "@harnessos/contracts";
import { describe, expect, it } from "vitest";
import {
  buildTurnDiffSummaryByAssistantMessageId,
  canSubmitUserMessageEdit,
  capOpenWorkEntryRenderChunks,
  chunkTurnProcessItems,
  chunkWorkEntries,
  computeMessageDurationStart,
  computeStableMessagesTimelineRows,
  deriveMessagesTimelineRows,
  deriveTerminalAssistantMessageIds,
  findLiveReasoningEntryId,
  normalizeCompactToolLabel,
  planWorkEntryRenderChunks,
  resolveAssistantMessageCopyState,
  resolveAssistantMessageDisplayText,
  type MessagesTimelineRow,
  type StableMessagesTimelineRowsState,
  type TurnProcessItem,
} from "./MessagesTimeline.logic";
import type { TimelineEntry, WorkLogEntry } from "../../session-logic";
import type { TurnDiffSummary, WorktreeSetupSnapshot } from "../../types";

describe("canSubmitUserMessageEdit", () => {
  it("allows an empty edit only when hidden annotations remain attached", () => {
    expect(
      canSubmitUserMessageEdit({
        draft: "",
        allowEmpty: true,
        disabled: false,
      }),
    ).toBe(true);
    expect(
      canSubmitUserMessageEdit({
        draft: "",
        allowEmpty: false,
        disabled: false,
      }),
    ).toBe(false);
    expect(canSubmitUserMessageEdit({ draft: "", allowEmpty: true, disabled: true })).toBe(false);
  });
});

function makeSummary(
  overrides: Omit<Partial<TurnDiffSummary>, "turnId"> & { turnId: string },
): TurnDiffSummary {
  const { turnId, ...rest } = overrides;
  return {
    turnId: TurnId.makeUnsafe(turnId),
    status: "ready",
    completedAt: "2026-01-01T00:00:10Z",
    files: [{ path: "src/app.ts", kind: "modified", additions: 1, deletions: 0 }],
    checkpointRef: CheckpointRef.makeUnsafe(`checkpoint-${turnId}`),
    checkpointTurnCount: 1,
    assistantMessageId: null,
    ...rest,
  } as TurnDiffSummary;
}

describe("computeMessageDurationStart", () => {
  it("returns message createdAt when there is no preceding user message", () => {
    const result = computeMessageDurationStart([
      {
        id: "a1",
        role: "assistant",
        createdAt: "2026-01-01T00:00:05Z",
        completedAt: "2026-01-01T00:00:10Z",
      },
    ]);
    expect(result).toEqual(new Map([["a1", "2026-01-01T00:00:05Z"]]));
  });

  it("uses the user message createdAt for the first assistant response", () => {
    const result = computeMessageDurationStart([
      { id: "u1", role: "user", createdAt: "2026-01-01T00:00:00Z" },
      {
        id: "a1",
        role: "assistant",
        createdAt: "2026-01-01T00:00:30Z",
        completedAt: "2026-01-01T00:00:30Z",
      },
    ]);

    expect(result).toEqual(
      new Map([
        ["u1", "2026-01-01T00:00:00Z"],
        ["a1", "2026-01-01T00:00:00Z"],
      ]),
    );
  });

  it("uses the previous assistant completedAt for subsequent assistant responses", () => {
    const result = computeMessageDurationStart([
      { id: "u1", role: "user", createdAt: "2026-01-01T00:00:00Z" },
      {
        id: "a1",
        role: "assistant",
        createdAt: "2026-01-01T00:00:30Z",
        completedAt: "2026-01-01T00:00:30Z",
      },
      {
        id: "a2",
        role: "assistant",
        createdAt: "2026-01-01T00:00:55Z",
        completedAt: "2026-01-01T00:00:55Z",
      },
    ]);

    expect(result).toEqual(
      new Map([
        ["u1", "2026-01-01T00:00:00Z"],
        ["a1", "2026-01-01T00:00:00Z"],
        ["a2", "2026-01-01T00:00:30Z"],
      ]),
    );
  });

  it("does not advance the boundary for a streaming message without completedAt", () => {
    const result = computeMessageDurationStart([
      { id: "u1", role: "user", createdAt: "2026-01-01T00:00:00Z" },
      { id: "a1", role: "assistant", createdAt: "2026-01-01T00:00:30Z" },
      {
        id: "a2",
        role: "assistant",
        createdAt: "2026-01-01T00:00:55Z",
        completedAt: "2026-01-01T00:00:55Z",
      },
    ]);

    expect(result).toEqual(
      new Map([
        ["u1", "2026-01-01T00:00:00Z"],
        ["a1", "2026-01-01T00:00:00Z"],
        ["a2", "2026-01-01T00:00:00Z"],
      ]),
    );
  });

  it("resets the boundary on a new user message", () => {
    const result = computeMessageDurationStart([
      { id: "u1", role: "user", createdAt: "2026-01-01T00:00:00Z" },
      {
        id: "a1",
        role: "assistant",
        createdAt: "2026-01-01T00:00:30Z",
        completedAt: "2026-01-01T00:00:30Z",
      },
      { id: "u2", role: "user", createdAt: "2026-01-01T00:01:00Z" },
      {
        id: "a2",
        role: "assistant",
        createdAt: "2026-01-01T00:01:20Z",
        completedAt: "2026-01-01T00:01:20Z",
      },
    ]);

    expect(result).toEqual(
      new Map([
        ["u1", "2026-01-01T00:00:00Z"],
        ["a1", "2026-01-01T00:00:00Z"],
        ["u2", "2026-01-01T00:01:00Z"],
        ["a2", "2026-01-01T00:01:00Z"],
      ]),
    );
  });

  it("handles system messages without affecting the boundary", () => {
    const result = computeMessageDurationStart([
      { id: "u1", role: "user", createdAt: "2026-01-01T00:00:00Z" },
      { id: "s1", role: "system", createdAt: "2026-01-01T00:00:01Z" },
      {
        id: "a1",
        role: "assistant",
        createdAt: "2026-01-01T00:00:30Z",
        completedAt: "2026-01-01T00:00:30Z",
      },
    ]);

    expect(result).toEqual(
      new Map([
        ["u1", "2026-01-01T00:00:00Z"],
        ["s1", "2026-01-01T00:00:00Z"],
        ["a1", "2026-01-01T00:00:00Z"],
      ]),
    );
  });

  it("returns empty map for empty input", () => {
    expect(computeMessageDurationStart([])).toEqual(new Map());
  });
});

describe("normalizeCompactToolLabel", () => {
  it("removes trailing completion wording from command labels", () => {
    expect(normalizeCompactToolLabel("Ran command complete")).toBe("Ran command");
  });

  it("removes trailing completion wording from other labels", () => {
    expect(normalizeCompactToolLabel("Read file completed")).toBe("Read file");
  });
});

describe("computeStableMessagesTimelineRows", () => {
  type MessageTimelineRow = Extract<MessagesTimelineRow, { kind: "message" }>;
  type WorkTimelineRow = Extract<MessagesTimelineRow, { kind: "work" }>;
  type TurnProcessTimelineRow = Extract<MessagesTimelineRow, { kind: "turn-process" }>;

  const emptyStableRows = (): StableMessagesTimelineRowsState => ({
    byId: new Map(),
    result: [],
  });

  it("replaces work rows when later tool metadata adds visible details", () => {
    const firstRows: MessagesTimelineRow[] = [
      {
        kind: "work",
        id: "work-group-1",
        createdAt: "2026-05-09T10:00:00.000Z",
        groupedEntries: [
          {
            id: "activity-read",
            createdAt: "2026-05-09T10:00:00.000Z",
            label: "Read",
            tone: "tool",
            itemType: "dynamic_tool_call",
            toolTitle: "Read",
          },
        ],
      },
    ];
    const first = computeStableMessagesTimelineRows(firstRows, emptyStableRows());

    const enrichedRows: MessagesTimelineRow[] = [
      {
        kind: "work",
        id: "work-group-1",
        createdAt: "2026-05-09T10:00:00.000Z",
        groupedEntries: [
          {
            id: "activity-read",
            createdAt: "2026-05-09T10:00:00.000Z",
            label: "Read",
            tone: "tool",
            itemType: "dynamic_tool_call",
            toolTitle: "Read",
            detail: "apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts:12",
            changedFiles: ["apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts"],
          },
        ],
      },
    ];

    const second = computeStableMessagesTimelineRows(enrichedRows, first);

    expect(second).not.toBe(first);
    expect(second.result[0]).toBe(enrichedRows[0]);
  });

  it("replaces a reasoning row when another public paragraph joins its disclosure", () => {
    const firstRow: WorkTimelineRow = {
      kind: "work",
      id: "reasoning-group",
      createdAt: "2026-05-09T10:00:00.000Z",
      groupedEntries: [
        {
          id: "agent-reasoning:reasoning-1",
          createdAt: "2026-05-09T10:00:00.000Z",
          label: "Reasoning",
          tone: "thinking",
          activityKind: "reasoning.completed",
          reasoningEntries: [{ id: "reasoning-1", text: "Inspect the owner." }],
        },
      ],
    };
    const first = computeStableMessagesTimelineRows([firstRow], emptyStableRows());
    const enrichedRow: WorkTimelineRow = {
      ...firstRow,
      groupedEntries: [
        {
          ...firstRow.groupedEntries[0]!,
          reasoningEntries: [
            { id: "reasoning-1", text: "Inspect the owner." },
            { id: "reasoning-2", text: "Verify the projection." },
          ],
        },
      ],
    };

    const second = computeStableMessagesTimelineRows([enrichedRow], first);

    expect(second).not.toBe(first);
    expect(second.result[0]).toBe(enrichedRow);
  });

  it("replaces a reasoning row when its truncation state changes", () => {
    const firstRow: WorkTimelineRow = {
      kind: "work",
      id: "reasoning-truncation-group",
      createdAt: "2026-05-09T10:00:00.000Z",
      groupedEntries: [
        {
          id: "agent-reasoning:reasoning-truncated",
          createdAt: "2026-05-09T10:00:00.000Z",
          label: "Reasoning",
          tone: "thinking",
          activityKind: "reasoning.completed",
          reasoningEntries: [{ id: "reasoning-truncated", text: "Inspect the owner." }],
        },
      ],
    };
    const first = computeStableMessagesTimelineRows([firstRow], emptyStableRows());
    const truncatedRow: WorkTimelineRow = {
      ...firstRow,
      groupedEntries: [
        {
          ...firstRow.groupedEntries[0]!,
          reasoningEntries: [
            {
              id: "reasoning-truncated",
              text: "Inspect the owner.",
              truncated: true,
            },
          ],
        },
      ],
    };

    const second = computeStableMessagesTimelineRows([truncatedRow], first);

    expect(second).not.toBe(first);
    expect(second.result[0]).toBe(truncatedRow);
  });

  it("replaces work rows when live activity settles without a final tool event", () => {
    const firstRow: WorkTimelineRow = {
      kind: "work",
      id: "work-group-live-activity",
      createdAt: "2026-05-09T10:00:00.000Z",
      groupedEntries: [
        {
          id: "activity-command",
          createdAt: "2026-05-09T10:00:00.000Z",
          label: "Bash",
          tone: "tool",
          itemType: "command_execution",
          liveActivity: {
            state: "running_tool",
            label: "Bash",
            startedAt: "2026-05-09T10:00:00.000Z",
            lastActivityAt: "2026-05-09T10:00:01.000Z",
            detail: "Running",
            progress: 0.5,
            elapsedSeconds: 1,
          },
        },
      ],
    };
    const first = computeStableMessagesTimelineRows([firstRow], emptyStableRows());
    const settledRow: WorkTimelineRow = {
      ...firstRow,
      groupedEntries: [
        {
          ...firstRow.groupedEntries[0]!,
          liveActivity: {
            state: "completed",
            label: "Bash completed",
            startedAt: "2026-05-09T10:00:00.000Z",
            lastActivityAt: "2026-05-09T10:00:05.000Z",
            detail: "Done",
            progress: 1,
            elapsedSeconds: 5,
          },
        },
      ],
    };

    const second = computeStableMessagesTimelineRows([settledRow], first);

    expect(second).not.toBe(first);
    expect(second.result[0]).toBe(settledRow);
  });

  it("replaces a canonical User Input row when its persisted settlement arrives", () => {
    const pendingRow: WorkTimelineRow = {
      kind: "work",
      id: "user-input-request",
      createdAt: "2026-05-09T10:00:00.000Z",
      groupedEntries: [
        {
          id: "user-input-request",
          createdAt: "2026-05-09T10:00:00.000Z",
          label: "User input requested",
          tone: "info",
          activityKind: "user-input.requested",
          userInputInteraction: {
            requestId: "request-1",
            questions: [
              {
                id: "q1",
                prompt: "Continue?",
                kind: "choice",
                optionLabels: ["Continue", "Stop"],
              },
            ],
          },
        },
      ],
    };
    const first = computeStableMessagesTimelineRows([pendingRow], emptyStableRows());
    const abortedRow: WorkTimelineRow = {
      ...pendingRow,
      groupedEntries: [
        {
          ...pendingRow.groupedEntries[0]!,
          tone: "error",
          userInputSettlementStatus: "aborted",
        },
      ],
    };

    const second = computeStableMessagesTimelineRows([abortedRow], first);

    expect(second).not.toBe(first);
    expect(second.result[0]).toBe(abortedRow);
  });

  it("replaces an answered User Input row when persisted answer details change", () => {
    const firstRow: WorkTimelineRow = {
      kind: "work",
      id: "user-input-request",
      createdAt: "2026-05-09T10:00:00.000Z",
      groupedEntries: [
        {
          id: "user-input-request",
          createdAt: "2026-05-09T10:00:00.000Z",
          label: "User input requested",
          tone: "info",
          activityKind: "user-input.requested",
          userInputSettlementStatus: "answered",
          userInputInteraction: {
            requestId: "request-1",
            questions: [
              {
                id: "q1",
                prompt: "What else?",
                kind: "text",
                optionLabels: [],
                answer: { selectedOptionLabels: [], customText: "First" },
              },
            ],
          },
        },
      ],
    };
    const first = computeStableMessagesTimelineRows([firstRow], emptyStableRows());
    const changed: WorkTimelineRow = {
      ...firstRow,
      groupedEntries: [
        {
          ...firstRow.groupedEntries[0]!,
          userInputInteraction: {
            ...firstRow.groupedEntries[0]!.userInputInteraction!,
            questions: [
              {
                ...firstRow.groupedEntries[0]!.userInputInteraction!.questions[0]!,
                answer: { selectedOptionLabels: [], customText: "Second" },
              },
            ],
          },
        },
      ],
    };

    const second = computeStableMessagesTimelineRows([changed], first);

    expect(second).not.toBe(first);
    expect(second.result[0]).toBe(changed);
  });

  it("reuses worktree-setup rows until a step status or open state changes", () => {
    const makeRow = (
      status: "active" | "done",
      open: boolean,
    ): Extract<MessagesTimelineRow, { kind: "worktree-setup" }> => ({
      kind: "worktree-setup",
      id: "worktree-setup-row",
      open,
      steps: [{ id: "create-worktree", label: "Creating worktree", status }],
    });

    const first = computeStableMessagesTimelineRows([makeRow("active", true)], emptyStableRows());
    const unchanged = computeStableMessagesTimelineRows([makeRow("active", true)], first);
    expect(unchanged).toBe(first);

    const statusChanged = computeStableMessagesTimelineRows([makeRow("done", true)], unchanged);
    expect(statusChanged).not.toBe(unchanged);
    expect(statusChanged.result[0]).not.toBe(unchanged.result[0]);

    const openChanged = computeStableMessagesTimelineRows([makeRow("done", false)], statusChanged);
    expect(openChanged).not.toBe(statusChanged);
    expect(openChanged.result[0]).not.toBe(statusChanged.result[0]);
  });

  it("replaces work rows when the activity kind changes", () => {
    const firstRow: WorkTimelineRow = {
      kind: "work",
      id: "work-group-user-input",
      createdAt: "2026-05-09T10:00:00.000Z",
      groupedEntries: [
        {
          id: "activity-user-input",
          createdAt: "2026-05-09T10:00:00.000Z",
          label: "Needs input",
          tone: "info",
        },
      ],
    };
    const firstRows: MessagesTimelineRow[] = [firstRow];
    const first = computeStableMessagesTimelineRows(firstRows, emptyStableRows());

    const enrichedRows: MessagesTimelineRow[] = [
      {
        ...firstRow,
        groupedEntries: [
          {
            ...firstRow.groupedEntries[0]!,
            activityKind: "user-input.requested",
          },
        ],
      },
    ];

    const second = computeStableMessagesTimelineRows(enrichedRows, first);

    expect(second).not.toBe(first);
    expect(second.result[0]).toBe(enrichedRows[0]);
  });

  it("replaces work rows when automation card fields are added", () => {
    const firstRows: MessagesTimelineRow[] = [
      {
        kind: "work",
        id: "work-group-automation",
        createdAt: "2026-05-09T10:00:00.000Z",
        groupedEntries: [
          {
            id: "automation-created",
            createdAt: "2026-05-09T10:00:00.000Z",
            label: "Created automation",
            tone: "info",
          },
        ],
      },
    ];
    const first = computeStableMessagesTimelineRows(firstRows, emptyStableRows());

    const enrichedRows: MessagesTimelineRow[] = [
      {
        kind: "work",
        id: "work-group-automation",
        createdAt: "2026-05-09T10:00:00.000Z",
        groupedEntries: [
          {
            id: "automation-created",
            createdAt: "2026-05-09T10:00:00.000Z",
            label: "Created automation",
            tone: "info",
            automation: {
              id: "automation-7",
              name: "Watch OmniMind PR 231",
              cadenceLabel: "Every 5m",
            },
          },
        ],
      },
    ];

    const second = computeStableMessagesTimelineRows(enrichedRows, first);

    expect(second).not.toBe(first);
    expect(second.result[0]).toBe(enrichedRows[0]);
  });

  it("replaces assistant rows when response work metadata becomes richer", () => {
    const assistantMessage = {
      id: MessageId.makeUnsafe("assistant-1"),
      role: "assistant" as const,
      text: "Working on it.",
      createdAt: "2026-05-09T10:00:01.000Z",
      streaming: true,
    };
    const firstRows: MessageTimelineRow[] = [
      {
        kind: "message",
        id: "assistant-1",
        createdAt: "2026-05-09T10:00:01.000Z",
        message: assistantMessage,
        turnWorkEntries: [
          {
            id: "activity-command",
            createdAt: "2026-05-09T10:00:00.000Z",
            label: "Ran command",
            tone: "tool",
            itemType: "command_execution",
            toolTitle: "Ran",
          },
        ],
        durationStart: "2026-05-09T10:00:01.000Z",
        showAssistantCopyButton: false,
        assistantCopyStreaming: true,
      },
    ];
    const first = computeStableMessagesTimelineRows(firstRows, emptyStableRows());

    const enrichedRows: MessageTimelineRow[] = [
      {
        ...firstRows[0]!,
        turnWorkEntries: [
          {
            id: "activity-command",
            createdAt: "2026-05-09T10:00:00.000Z",
            label: "Ran command",
            tone: "tool",
            itemType: "command_execution",
            toolTitle: "Ran",
            command: 'git grep -n "model.rerouted"',
            rawCommand: "/bin/zsh -lc 'git grep -n \"model.rerouted\"'",
            requestKind: "command",
          },
        ],
      },
    ];

    const second = computeStableMessagesTimelineRows(enrichedRows, first);

    expect(second).not.toBe(first);
    expect(second.result[0]).toBe(enrichedRows[0]);
  });

  it("invalidates only the live turn-process row when a stream item is appended", () => {
    const userMessage = {
      id: MessageId.makeUnsafe("stable-user"),
      role: "user" as const,
      text: "Inspect it",
      createdAt: "2026-05-09T10:00:00.000Z",
      streaming: false,
    };
    const historicalRow: MessageTimelineRow = {
      kind: "message",
      id: "stable-user",
      createdAt: userMessage.createdAt,
      message: userMessage,
      durationStart: userMessage.createdAt,
      showAssistantCopyButton: false,
      assistantCopyStreaming: false,
    };
    const firstEntry: WorkLogEntry = {
      id: "stable-read",
      createdAt: "2026-05-09T10:00:01.000Z",
      label: "Read",
      tone: "tool",
    };
    const firstProcessRow: TurnProcessTimelineRow = {
      kind: "turn-process",
      id: "turn-process:stable-user",
      createdAt: userMessage.createdAt,
      turnId: TurnId.makeUnsafe("stable-turn"),
      phase: "running",
      items: [{ kind: "work", id: firstEntry.id, entry: firstEntry }],
      elapsedMs: 1_000,
    };
    const first = computeStableMessagesTimelineRows(
      [historicalRow, firstProcessRow],
      emptyStableRows(),
    );
    const nextEntry: WorkLogEntry = {
      id: "stable-search",
      createdAt: "2026-05-09T10:00:02.000Z",
      label: "Search",
      tone: "tool",
    };
    const second = computeStableMessagesTimelineRows(
      [
        { ...historicalRow },
        {
          ...firstProcessRow,
          items: [
            { kind: "work", id: firstEntry.id, entry: firstEntry },
            { kind: "work", id: nextEntry.id, entry: nextEntry },
          ],
          elapsedMs: 2_000,
        },
      ],
      first,
    );

    expect(second.result[0]).toBe(first.result[0]);
    expect(second.result[1]).not.toBe(first.result[1]);
    const retainedItem = (second.result[1] as TurnProcessTimelineRow).items[0];
    expect(retainedItem?.kind).toBe("work");
    expect(retainedItem?.kind === "work" ? retainedItem.entry : null).toBe(firstEntry);
  });
});

describe("deriveTerminalAssistantMessageIds", () => {
  it("keeps only the latest assistant message in a user-visible response segment", () => {
    expect(
      deriveTerminalAssistantMessageIds([
        { id: "u1", role: "user", createdAt: "2026-01-01T00:00:00Z" },
        {
          id: "a1",
          role: "assistant",
          createdAt: "2026-01-01T00:00:01Z",
          turnId: "t1",
        },
        {
          id: "a2",
          role: "assistant",
          createdAt: "2026-01-01T00:00:02Z",
          turnId: "t1",
        },
        {
          id: "a3",
          role: "assistant",
          createdAt: "2026-01-01T00:00:03Z",
          turnId: "t2",
        },
      ]),
    ).toEqual(new Set(["a3"]));
  });

  it("treats assistant messages without turn ids as one response per user boundary", () => {
    expect(
      deriveTerminalAssistantMessageIds([
        { id: "u1", role: "user", createdAt: "2026-01-01T00:00:00Z" },
        { id: "a1", role: "assistant", createdAt: "2026-01-01T00:00:01Z" },
        { id: "a2", role: "assistant", createdAt: "2026-01-01T00:00:02Z" },
        { id: "u2", role: "user", createdAt: "2026-01-01T00:00:03Z" },
        { id: "a3", role: "assistant", createdAt: "2026-01-01T00:00:04Z" },
      ]),
    ).toEqual(new Set(["a2", "a3"]));
  });
});

describe("buildTurnDiffSummaryByAssistantMessageId", () => {
  it("attaches each summary to the terminal assistant message of its response segment", () => {
    const result = buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: [makeSummary({ turnId: "turn-1" }), makeSummary({ turnId: "turn-2" })],
      messages: [
        { id: MessageId.makeUnsafe("u-1"), role: "user", turnId: null },
        {
          id: MessageId.makeUnsafe("a-turn-1"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-1"),
        },
        {
          id: MessageId.makeUnsafe("a-turn-2"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-2"),
        },
      ],
    });

    expect(result.get(MessageId.makeUnsafe("a-turn-2"))?.turnId).toBe(TurnId.makeUnsafe("turn-2"));
    expect(result.has(MessageId.makeUnsafe("a-turn-1"))).toBe(false);
    expect(result.size).toBe(1);
  });

  it("moves an earlier mini-turn diff to a later final answer in the same response segment", () => {
    const result = buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: [makeSummary({ turnId: "turn-files" })],
      messages: [
        { id: MessageId.makeUnsafe("u-1"), role: "user", turnId: null },
        {
          id: MessageId.makeUnsafe("a-files"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-files"),
        },
        {
          id: MessageId.makeUnsafe("a-final"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-final"),
        },
      ],
    });

    expect(result.get(MessageId.makeUnsafe("a-final"))?.turnId).toBe(
      TurnId.makeUnsafe("turn-files"),
    );
    expect(result.has(MessageId.makeUnsafe("a-files"))).toBe(false);
  });

  it("keeps files from multiple mini-turn summaries on the final answer", () => {
    const result = buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: [
        makeSummary({
          turnId: "turn-files",
          checkpointTurnCount: 1,
          files: [{ path: "a.ts", additions: 1, deletions: 0 }],
        }),
        makeSummary({
          turnId: "turn-final",
          checkpointTurnCount: 2,
          files: [{ path: "b.ts", additions: 0, deletions: 1 }],
        }),
      ],
      messages: [
        { id: MessageId.makeUnsafe("u-1"), role: "user", turnId: null },
        {
          id: MessageId.makeUnsafe("a-files"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-files"),
        },
        {
          id: MessageId.makeUnsafe("a-final"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-final"),
        },
      ],
    });

    expect(result.get(MessageId.makeUnsafe("a-final"))?.files.map((file) => file.path)).toEqual([
      "a.ts",
      "b.ts",
    ]);
    expect(result.get(MessageId.makeUnsafe("a-final"))?.checkpointTurnCounts).toEqual([1, 2]);
  });

  it("preserves Undo metadata when an empty placeholder follows file changes", () => {
    const result = buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: [
        makeSummary({ turnId: "turn-files", checkpointTurnCount: 1 }),
        makeSummary({
          turnId: "turn-empty-placeholder",
          status: "missing",
          checkpointRef: CheckpointRef.makeUnsafe("provider-diff:event-empty"),
          files: [],
        }),
      ],
      messages: [
        { id: MessageId.makeUnsafe("u-1"), role: "user", turnId: null },
        {
          id: MessageId.makeUnsafe("a-files"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-files"),
        },
        {
          id: MessageId.makeUnsafe("a-empty-placeholder"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-empty-placeholder"),
        },
      ],
    });

    const summary = result.get(MessageId.makeUnsafe("a-empty-placeholder"));
    expect(summary?.checkpointTurnCounts).toEqual([1]);
    expect(summary?.status).toBe("ready");
    expect(summary?.checkpointRef).toBe(CheckpointRef.makeUnsafe("checkpoint-turn-files"));
  });

  it("excludes no-change and placeholder mini-turns from merged Undo targets", () => {
    const result = buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: [
        makeSummary({ turnId: "turn-files", checkpointTurnCount: 1 }),
        makeSummary({
          turnId: "turn-no-files",
          checkpointTurnCount: 2,
          files: [],
        }),
        makeSummary({
          turnId: "turn-placeholder",
          checkpointTurnCount: 3,
          checkpointRef: CheckpointRef.makeUnsafe("provider-diff:event-3"),
        }),
        makeSummary({
          turnId: "turn-missing",
          checkpointTurnCount: 4,
          status: "missing",
          checkpointRef: CheckpointRef.makeUnsafe("checkpoint-turn-missing"),
        }),
      ],
      messages: [
        { id: MessageId.makeUnsafe("u-1"), role: "user", turnId: null },
        {
          id: MessageId.makeUnsafe("a-files"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-files"),
        },
        {
          id: MessageId.makeUnsafe("a-no-files"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-no-files"),
        },
        {
          id: MessageId.makeUnsafe("a-placeholder"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-placeholder"),
        },
        {
          id: MessageId.makeUnsafe("a-missing"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-missing"),
        },
      ],
    });

    expect(result.has(MessageId.makeUnsafe("a-placeholder"))).toBe(false);
    expect(result.get(MessageId.makeUnsafe("a-missing"))?.checkpointTurnCounts).toEqual([]);
  });

  it("keeps separate cards for response segments split by user messages", () => {
    const result = buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: [makeSummary({ turnId: "turn-1" }), makeSummary({ turnId: "turn-2" })],
      messages: [
        { id: MessageId.makeUnsafe("u-1"), role: "user", turnId: null },
        {
          id: MessageId.makeUnsafe("a-turn-1"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-1"),
        },
        { id: MessageId.makeUnsafe("u-2"), role: "user", turnId: null },
        {
          id: MessageId.makeUnsafe("a-turn-2"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-2"),
        },
      ],
    });

    expect(result.get(MessageId.makeUnsafe("a-turn-1"))?.turnId).toBe(TurnId.makeUnsafe("turn-1"));
    expect(result.get(MessageId.makeUnsafe("a-turn-2"))?.turnId).toBe(TurnId.makeUnsafe("turn-2"));
    expect(result.size).toBe(2);
  });

  it("does not leak a summary to an unrelated message even when ids look similar", () => {
    // Regression for the "Files changed on wrong thread" bug: before the fix,
    // the server synthesized `assistant:<turnId>` ids that could collide with
    // the real message id of a different turn. Anchoring by the matching turn's
    // response segment prevents the card from attaching to unrelated rows.
    const result = buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: [makeSummary({ turnId: "turn-files-changed" })],
      messages: [
        {
          id: MessageId.makeUnsafe("a-unrelated"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-no-changes"),
        },
      ],
    });

    expect(result.size).toBe(0);
  });

  it("ignores summaries for turns that have no rendered assistant message yet", () => {
    const result = buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: [makeSummary({ turnId: "turn-1" })],
      messages: [],
    });

    expect(result.size).toBe(0);
  });

  it("attaches the summary to the LAST assistant message of a turn when multiple exist", () => {
    const result = buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: [makeSummary({ turnId: "turn-1" })],
      messages: [
        {
          id: MessageId.makeUnsafe("a-turn-1-first"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-1"),
        },
        {
          id: MessageId.makeUnsafe("a-turn-1-last"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-1"),
        },
      ],
    });

    expect(result.get(MessageId.makeUnsafe("a-turn-1-last"))?.turnId).toBe(
      TurnId.makeUnsafe("turn-1"),
    );
    expect(result.has(MessageId.makeUnsafe("a-turn-1-first"))).toBe(false);
    expect(result.size).toBe(1);
  });

  it("returns an empty map when there are no summaries", () => {
    const result = buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: [],
      messages: [
        {
          id: MessageId.makeUnsafe("a-1"),
          role: "assistant",
          turnId: TurnId.makeUnsafe("turn-1"),
        },
      ],
    });

    expect(result.size).toBe(0);
  });

  it("ignores assistant messages without a turnId", () => {
    const result = buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: [makeSummary({ turnId: "turn-1" })],
      messages: [
        {
          id: MessageId.makeUnsafe("a-nullturn"),
          role: "assistant",
          turnId: null,
        },
      ],
    });

    expect(result.size).toBe(0);
  });
});

describe("resolveAssistantMessageCopyState", () => {
  it("shows copy only for non-empty settled assistant text", () => {
    expect(
      resolveAssistantMessageCopyState({
        text: "Hello",
        showCopyButton: true,
        streaming: false,
      }),
    ).toEqual({ text: "Hello", visible: true });
  });

  it("hides copy while the active assistant response is still streaming", () => {
    expect(
      resolveAssistantMessageCopyState({
        text: "Hello",
        showCopyButton: true,
        streaming: true,
      }),
    ).toEqual({ text: "Hello", visible: false });
  });

  it("hides copy for empty responses", () => {
    expect(
      resolveAssistantMessageCopyState({
        text: "   ",
        showCopyButton: true,
        streaming: false,
      }),
    ).toEqual({ text: null, visible: false });
  });
});

describe("resolveAssistantMessageDisplayText", () => {
  it("suppresses the empty placeholder when the turn visibly completed an image", () => {
    expect(
      resolveAssistantMessageDisplayText({
        message: { text: "", streaming: false },
        turnWorkEntries: [
          {
            id: "generated-image",
            createdAt: "2026-07-08T10:00:00.000Z",
            label: "Generated image",
            tone: "tool",
            itemType: "image_generation",
            activityKind: "tool.completed",
          },
        ],
      }),
    ).toBeNull();
  });

  it("keeps the placeholder when a settled turn produced no visible content", () => {
    expect(
      resolveAssistantMessageDisplayText({
        message: { text: "", streaming: false },
      }),
    ).toBe("(empty response)");
  });

  it("does not mistake an unfinished or failed image tool row for produced content", () => {
    const imageEntry = {
      id: "generated-image",
      createdAt: "2026-07-08T10:00:00.000Z",
      label: "Generating image",
      tone: "tool" as const,
      itemType: "image_generation" as const,
      activityKind: "tool.started",
    };
    expect(
      resolveAssistantMessageDisplayText({
        message: { text: "", streaming: false },
        turnWorkEntries: [imageEntry],
      }),
    ).toBe("(empty response)");
    expect(
      resolveAssistantMessageDisplayText({
        message: { text: "", streaming: false },
        turnWorkEntries: [
          {
            ...imageEntry,
            activityKind: "tool.completed",
            tone: "error" as const,
          },
        ],
      }),
    ).toBe("(empty response)");
  });

  it("preserves real assistant text even when the same turn generated an image", () => {
    expect(
      resolveAssistantMessageDisplayText({
        message: { text: "Here is your image.", streaming: false },
        turnWorkEntries: [
          {
            id: "generated-image",
            createdAt: "2026-07-08T10:00:00.000Z",
            label: "Generated image",
            tone: "tool",
            itemType: "image_generation",
            activityKind: "tool.completed",
          },
        ],
      }),
    ).toBe("Here is your image.");
  });
});

describe("deriveMessagesTimelineRows", () => {
  type MessageTimelineRow = Extract<MessagesTimelineRow, { kind: "message" }>;

  const baseInput = {
    isWorking: false,
    worktreeSetup: null as WorktreeSetupSnapshot | null,
    worktreeSetupOpen: false,
    activeTurnStartedAt: null as string | null,
    turnDiffSummaryByAssistantMessageId: new Map(),
    revertTurnCountByUserMessageId: new Map(),
  };

  const userEntry = (id: string, createdAt: string): TimelineEntry => ({
    id: `entry-${id}`,
    kind: "message",
    createdAt,
    message: {
      id: MessageId.makeUnsafe(id),
      role: "user",
      text: "ask",
      createdAt,
      streaming: false,
    },
  });

  const assistantEntry = (
    id: string,
    createdAt: string,
    opts: {
      turnId?: string;
      text?: string;
      streaming?: boolean;
      completedAt?: string;
      assistantCopyText?: string;
    },
  ): TimelineEntry => ({
    id: `entry-${id}`,
    kind: "message",
    createdAt,
    ...(opts.assistantCopyText !== undefined ? { assistantCopyText: opts.assistantCopyText } : {}),
    message: {
      id: MessageId.makeUnsafe(id),
      role: "assistant",
      text: opts.text ?? "reply",
      createdAt,
      streaming: opts.streaming ?? false,
      ...(opts.turnId ? { turnId: TurnId.makeUnsafe(opts.turnId) } : {}),
      ...(opts.completedAt ? { completedAt: opts.completedAt } : {}),
    },
  });

  const workEntry = (
    id: string,
    createdAt: string,
    label: string,
    tone: "thinking" | "tool" | "info" | "error" = "tool",
  ): TimelineEntry => ({
    id: `entry-${id}`,
    kind: "work",
    createdAt,
    entry: { id, createdAt, label, tone },
  });

  const proposedPlanEntry = (id: string, createdAt: string, turnId: string): TimelineEntry => ({
    id: `entry-${id}`,
    kind: "proposed-plan",
    createdAt,
    proposedPlan: {
      id: OrchestrationProposedPlanId.makeUnsafe(id),
      turnId: TurnId.makeUnsafe(turnId),
      planMarkdown: "# Plan",
      implementedAt: null,
      implementationThreadId: null,
      createdAt,
      updatedAt: createdAt,
    },
  });

  const messageRow = (rows: MessagesTimelineRow[], id: string): MessageTimelineRow | undefined =>
    rows.find(
      (row): row is MessageTimelineRow =>
        row.kind === "message" && row.message.id === MessageId.makeUnsafe(id),
    );

  const processRow = (rows: MessagesTimelineRow[], boundaryId?: string) =>
    rows.find(
      (row): row is Extract<MessagesTimelineRow, { kind: "turn-process" }> =>
        row.kind === "turn-process" &&
        (boundaryId === undefined || row.id === `turn-process:${boundaryId}`),
    );

  const processSignature = (rows: MessagesTimelineRow[], boundaryId?: string): string[] =>
    (processRow(rows, boundaryId)?.items ?? []).map((item) => `${item.kind}:${String(item.id)}`);

  it("assigns one exact identity header across every assistant-owned row in a response", () => {
    const pendingMessageId = MessageId.makeUnsafe("u-model");
    const provenance = {
      pendingMessageId,
      turnId: TurnId.makeUnsafe("t-model"),
      modelSelection: {
        provider: "omnimind" as const,
        model: "deepseek/deepseek-v4-pro",
      },
      requestedAt: "2026-08-27T02:21:00.000Z",
    };
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      turnProvenance: [provenance],
      timelineEntries: [
        userEntry("u-model", "2026-08-27T02:21:00.000Z"),
        workEntry("w-model", "2026-08-27T02:21:01.000Z", "Reading files"),
        assistantEntry("a-model", "2026-08-27T02:21:02.000Z", {
          turnId: "t-model",
          text: "Done",
          completedAt: "2026-08-27T02:21:03.000Z",
        }),
        userEntry("u-unknown", "2026-08-27T02:22:00.000Z"),
        assistantEntry("a-unknown", "2026-08-27T02:22:01.000Z", {
          turnId: "t-unknown",
          text: "Legacy reply",
          completedAt: "2026-08-27T02:22:02.000Z",
        }),
      ],
    });

    const knownRows = rows.filter((row) => row.assistantTurnLayout?.responseId === "u-model");
    expect(knownRows.length).toBeGreaterThanOrEqual(2);
    expect(knownRows.filter((row) => row.assistantTurnLayout?.showIdentity)).toHaveLength(1);
    expect(knownRows.every((row) => row.assistantTurnLayout?.provenance === provenance)).toBe(true);
    expect(knownRows.map((row) => row.kind)).toContain("turn-process");
    expect(knownRows.map((row) => row.kind)).toContain("message");

    const unknownRows = rows.filter((row) => row.assistantTurnLayout?.responseId === "u-unknown");
    expect(unknownRows).toHaveLength(1);
    expect(unknownRows[0]?.assistantTurnLayout).toMatchObject({
      showIdentity: true,
      provenance: null,
      timestamp: "2026-08-27T02:22:01.000Z",
    });
    expect(messageRow(rows, "u-model")?.assistantTurnLayout).toBeUndefined();
  });

  it("moves interleaved narration and work into one settled process row", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries: [
        userEntry("u1", "2026-01-01T00:00:00Z"),
        assistantEntry("a1", "2026-01-01T00:00:01Z", {
          turnId: "t1",
          text: "Looking into it",
          completedAt: "2026-01-01T00:00:01Z",
        }),
        workEntry("w1", "2026-01-01T00:00:02Z", "tool 1"),
        assistantEntry("a2", "2026-01-01T00:00:03Z", {
          turnId: "t1",
          text: "Almost there",
          completedAt: "2026-01-01T00:00:03Z",
        }),
        workEntry("w2", "2026-01-01T00:00:04Z", "tool 2"),
        assistantEntry("a3", "2026-01-01T00:00:05Z", {
          turnId: "t1",
          text: "All done",
          completedAt: "2026-01-01T00:00:06Z",
        }),
      ],
    });

    const visibleMessageIds = rows
      .filter((row): row is MessageTimelineRow => row.kind === "message")
      .map((row) => String(row.message.id));
    expect(visibleMessageIds).toEqual(["u1", "a3"]);

    const terminal = messageRow(rows, "a3");
    expect(terminal).toBeDefined();
    expect(processSignature(rows)).toEqual(["narration:a1", "work:w1", "narration:a2", "work:w2"]);
    expect(processRow(rows)?.phase).toBe("settled");
    expect(rows.some((row) => row.kind === "work")).toBe(false);
  });

  it("keeps assistant, reasoning, failed/retried tools, and continuation in one stable sequence", () => {
    const timelineEntries: TimelineEntry[] = [
      userEntry("u-causal", "2026-01-01T00:00:00Z"),
      assistantEntry("a-causal-start", "2026-01-01T00:00:01Z", {
        turnId: "t-causal",
        text: "I’ll inspect the source first.",
        completedAt: "2026-01-01T00:00:01Z",
      }),
      {
        id: "entry-reasoning-causal-1",
        kind: "work",
        createdAt: "2026-01-01T00:00:02Z",
        entry: {
          id: "reasoning-causal-1",
          createdAt: "2026-01-01T00:00:02Z",
          label: "Reasoning",
          tone: "thinking",
          activityKind: "reasoning.completed",
          reasoningEntries: [{ id: "reasoning-source-1", text: "Check the current owner." }],
        },
      },
      workEntry("tool-causal-failed", "2026-01-01T00:00:03Z", "Search failed", "error"),
      {
        id: "entry-reasoning-causal-2",
        kind: "work",
        createdAt: "2026-01-01T00:00:04Z",
        entry: {
          id: "reasoning-causal-2",
          createdAt: "2026-01-01T00:00:04Z",
          label: "Reasoning",
          tone: "thinking",
          activityKind: "reasoning.completed",
          reasoningEntries: [{ id: "reasoning-source-2", text: "Use the recovery path." }],
        },
      },
      workEntry("tool-causal-retry", "2026-01-01T00:00:05Z", "Retried search"),
      assistantEntry("a-causal-final", "2026-01-01T00:00:06Z", {
        turnId: "t-causal",
        text: "The retry succeeded.",
        completedAt: "2026-01-01T00:00:07Z",
      }),
    ];

    const settledRows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries,
    });
    const liveRows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries,
      isWorking: true,
      activeTurnInProgress: true,
      activeTurnId: TurnId.makeUnsafe("t-causal"),
      activeTurnStartedAt: "2026-01-01T00:00:00Z",
    });

    const visibleSignature = (rows: MessagesTimelineRow[]) =>
      rows.flatMap((row) => {
        if (row.kind === "turn-process") {
          return row.items.map((item) => `${item.kind === "work" ? "work" : "message"}:${item.id}`);
        }
        if (row.kind === "message") {
          return [`message:${String(row.message.id)}`];
        }
        return row.kind === "work" ? row.groupedEntries.map((entry) => `work:${entry.id}`) : [];
      });

    const expected = [
      "message:u-causal",
      "message:a-causal-start",
      "work:reasoning-causal-1",
      "work:tool-causal-failed",
      "work:reasoning-causal-2",
      "work:tool-causal-retry",
      "message:a-causal-final",
    ];
    expect(visibleSignature(settledRows)).toEqual(expected);
    expect(visibleSignature(liveRows)).toEqual(expected);
    expect(processRow(settledRows)?.phase).toBe("settled");
    expect(processRow(liveRows)?.phase).toBe("running");
  });

  it("keeps interleaved assistant segments in their causal positions after settlement", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries: [
        userEntry("u-segmented", "2026-01-01T00:00:00Z"),
        assistantEntry("a-segmented#segment:0", "2026-01-01T00:00:01Z", {
          turnId: "t-segmented",
          text: "Plan first.",
          completedAt: "2026-01-01T00:00:01Z",
        }),
        workEntry("w-segmented", "2026-01-01T00:00:01Z", "fd"),
        assistantEntry("a-segmented", "2026-01-01T00:00:01Z", {
          turnId: "t-segmented",
          text: "Then explain.",
          assistantCopyText: "Plan first.Then explain.",
          completedAt: "2026-01-01T00:00:02Z",
        }),
      ],
    });

    const terminal = messageRow(rows, "a-segmented");
    expect(terminal?.message.text).toBe("Then explain.");
    expect(terminal?.assistantCopyText).toBe("Plan first.Then explain.");
    expect(processSignature(rows)).toEqual(["narration:a-segmented#segment:0", "work:w-segmented"]);
    expect(messageRow(rows, "a-segmented#segment:0")).toBeUndefined();
  });

  it("keeps settled reasoning inspectable inside Worked for", () => {
    const reasoning = workEntry("reasoning-1", "2026-01-01T00:00:02Z", "Reasoning trace");
    if (reasoning.kind === "work") {
      reasoning.entry = {
        ...reasoning.entry,
        detail: "Inspecting apps/web/src/store.ts",
        toolTitle: "Reasoning trace",
      };
    }

    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries: [
        userEntry("u1", "2026-01-01T00:00:00Z"),
        reasoning,
        assistantEntry("a1", "2026-01-01T00:00:03Z", {
          turnId: "t1",
          text: "All done",
          completedAt: "2026-01-01T00:00:04Z",
        }),
      ],
    });

    expect(processSignature(rows)).toEqual(["work:reasoning-1"]);
  });

  it("keeps provider failure and retry facts in canonical process order", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries: [
        userEntry("u1", "2026-01-01T00:00:00Z"),
        workEntry("w1", "2026-01-01T00:00:05Z", "long tool work"),
        assistantEntry("a1", "2026-01-01T00:22:20Z", {
          turnId: "t1",
          text: "The provider run failed",
          completedAt: "2026-01-01T00:22:20Z",
        }),
        workEntry("w2", "2026-01-01T00:22:30Z", "retry work"),
        assistantEntry("a2", "2026-01-01T00:23:00Z", {
          turnId: "t2",
          text: "All done",
          completedAt: "2026-01-01T00:23:00Z",
        }),
      ],
    });

    const terminal = messageRow(rows, "a2");
    expect(terminal).toBeDefined();
    expect(processSignature(rows)).toEqual(["work:w1", "narration:a1", "work:w2"]);
    expect(messageRow(rows, "a1")).toBeUndefined();
  });

  it("keeps the live turn expanded instead of collapsing while it streams", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      isWorking: true,
      activeTurnInProgress: true,
      activeTurnId: TurnId.makeUnsafe("t1"),
      timelineEntries: [
        userEntry("u1", "2026-01-01T00:00:00Z"),
        assistantEntry("a1", "2026-01-01T00:00:01Z", {
          turnId: "t1",
          text: "Looking into it",
          completedAt: "2026-01-01T00:00:01Z",
        }),
        workEntry("w1", "2026-01-01T00:00:02Z", "tool 1"),
        assistantEntry("a3", "2026-01-01T00:00:05Z", {
          turnId: "t1",
          text: "still going",
          streaming: true,
        }),
      ],
    });

    expect(messageRow(rows, "a1")).toBeUndefined();
    const terminal = messageRow(rows, "a3");
    expect(terminal).toBeDefined();
    expect(processSignature(rows)).toEqual(["narration:a1", "work:w1"]);
    expect(processRow(rows)?.phase).toBe("running");
  });

  it("keeps pre-existing tool work above the new live narration text", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      isWorking: true,
      activeTurnInProgress: true,
      activeTurnId: TurnId.makeUnsafe("t1"),
      timelineEntries: [
        userEntry("u1", "2026-01-01T00:00:00Z"),
        assistantEntry("a1", "2026-01-01T00:00:01Z", {
          turnId: "t1",
          text: "I will inspect it.",
          completedAt: "2026-01-01T00:00:01Z",
        }),
        workEntry("w1", "2026-01-01T00:00:02Z", "read files"),
        assistantEntry("a2", "2026-01-01T00:00:03Z", {
          turnId: "t1",
          text: "Here is what I found so far.",
          streaming: true,
        }),
        workEntry("w2", "2026-01-01T00:00:04Z", "search files"),
      ],
    });

    expect(messageRow(rows, "a2")).toBeUndefined();
    expect(processSignature(rows)).toEqual(["narration:a1", "work:w1", "narration:a2", "work:w2"]);
  });

  it("keeps a just-settled tail assistant expanded when the active turn id is briefly unavailable", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      isWorking: true,
      activeTurnInProgress: true,
      timelineEntries: [
        userEntry("u1", "2026-01-01T00:00:00Z"),
        workEntry("w1", "2026-01-01T00:00:01Z", "tool 1"),
        assistantEntry("a1", "2026-01-01T00:00:02Z", {
          turnId: "t1",
          text: "All done",
          completedAt: "2026-01-01T00:00:03Z",
        }),
      ],
    });

    const terminal = messageRow(rows, "a1");
    expect(terminal).toBeDefined();
    expect(processSignature(rows)).toEqual(["work:w1"]);
    expect(processRow(rows)?.phase).toBe("running");
    expect(rows.some((row) => row.kind === "work")).toBe(false);
  });

  it("collapses an older settled turn when a follow-up user message is waiting for output", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      isWorking: true,
      activeTurnInProgress: true,
      activeTurnStartedAt: "2026-01-01T00:00:05Z",
      timelineEntries: [
        userEntry("u1", "2026-01-01T00:00:00Z"),
        workEntry("w1", "2026-01-01T00:00:01Z", "tool 1"),
        assistantEntry("a1", "2026-01-01T00:00:02Z", {
          turnId: "t1",
          text: "All done",
          completedAt: "2026-01-01T00:00:03Z",
        }),
        userEntry("u2", "2026-01-01T00:00:05Z"),
      ],
    });

    const previousAssistant = messageRow(rows, "a1");
    expect(previousAssistant).toBeDefined();
    expect(processSignature(rows, "u1")).toEqual(["work:w1"]);
    expect(processRow(rows, "u1")?.phase).toBe("settled");
    expect(messageRow(rows, "u2")).toBeDefined();
    expect(rows.some((row) => row.kind === "work")).toBe(false);
  });

  it("preserves adjacent provider mini-turn narration in causal order", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries: [
        userEntry("u1", "2026-01-01T00:00:00Z"),
        assistantEntry("a1", "2026-01-01T00:00:01Z", {
          turnId: "t1",
          text: "first preamble",
          completedAt: "2026-01-01T00:00:01Z",
        }),
        workEntry("w1", "2026-01-01T00:00:02Z", "tool 1"),
        assistantEntry("a2", "2026-01-01T00:00:03Z", {
          turnId: "t1",
          text: "first final",
          completedAt: "2026-01-01T00:00:03Z",
        }),
        assistantEntry("a3", "2026-01-01T00:00:04Z", {
          turnId: "t2",
          text: "second preamble",
          completedAt: "2026-01-01T00:00:04Z",
        }),
        workEntry("w2", "2026-01-01T00:00:05Z", "tool 2"),
        assistantEntry("a4", "2026-01-01T00:00:06Z", {
          turnId: "t2",
          text: "second final",
          completedAt: "2026-01-01T00:00:06Z",
        }),
      ],
    });

    const visibleMessageIds = rows
      .filter((row): row is MessageTimelineRow => row.kind === "message")
      .map((row) => String(row.message.id));
    expect(visibleMessageIds).toEqual(["u1", "a4"]);
    expect(processSignature(rows)).toEqual([
      "narration:a1",
      "work:w1",
      "narration:a2",
      "narration:a3",
      "work:w2",
    ]);
  });

  it("keeps causal work visible across an intervening proposed plan card", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries: [
        userEntry("u1", "2026-01-01T00:00:00Z"),
        assistantEntry("a1", "2026-01-01T00:00:01Z", {
          turnId: "t1",
          text: "I have a plan",
          completedAt: "2026-01-01T00:00:01Z",
        }),
        workEntry("w1", "2026-01-01T00:00:02Z", "tool 1"),
        proposedPlanEntry("plan-1", "2026-01-01T00:00:03Z", "t1"),
        assistantEntry("a2", "2026-01-01T00:00:04Z", {
          turnId: "t1",
          text: "final",
          completedAt: "2026-01-01T00:00:05Z",
        }),
      ],
    });

    expect(rows.some((row) => row.kind === "proposed-plan")).toBe(true);
    expect(messageRow(rows, "a1")).toBeUndefined();
    expect(messageRow(rows, "a2")).toBeDefined();
    expect(processSignature(rows)).toEqual(["narration:a1", "work:w1"]);
  });

  it("preserves OmniMind tool calls when a separate creation recap is present", () => {
    const createTool = workEntry(
      "omnimind-create-tool",
      "2026-01-01T00:00:01Z",
      "OmniMind created threads",
    );
    const creationRecap: TimelineEntry = {
      id: "entry-omnimind-create-recap",
      kind: "work",
      createdAt: "2026-01-01T00:00:02Z",
      entry: {
        id: "omnimind-create-recap",
        createdAt: "2026-01-01T00:00:02Z",
        label: "Created 2 OmniMind threads",
        tone: "info",
        harnessosThreadCreation: {
          operationId: "gateway:create:two",
          requestedCount: 2,
          createdCount: 2,
          threads: [
            {
              threadId: "thread-1",
              title: "First",
              provider: "codex",
              model: "gpt-5.6-terra",
              environment: "local",
              status: "task_dispatched",
            },
            {
              threadId: "thread-2",
              title: "Second",
              provider: "claudeAgent",
              model: "claude-sonnet-5",
              environment: "local",
              status: "task_dispatched",
            },
          ],
        },
      },
    };
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries: [
        userEntry("u1", "2026-01-01T00:00:00Z"),
        createTool,
        creationRecap,
        assistantEntry("a1", "2026-01-01T00:00:03Z", {
          turnId: "t1",
          text: "final",
          completedAt: "2026-01-01T00:00:04Z",
        }),
      ],
    });

    expect(processSignature(rows)).toEqual(["work:omnimind-create-tool"]);
    expect(messageRow(rows, "a1")?.turnWorkEntries?.map((entry) => entry.id)).toEqual([
      "omnimind-create-tool",
      "omnimind-create-recap",
    ]);
  });

  it("does not render an empty Worked for row for a direct answer", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries: [
        userEntry("u-direct", "2026-01-01T00:00:00Z"),
        assistantEntry("a-direct", "2026-01-01T00:00:01Z", {
          turnId: "t-direct",
          text: "Direct answer",
          completedAt: "2026-01-01T00:00:01Z",
        }),
      ],
    });

    expect(rows.map((row) => row.kind)).toEqual(["message", "message"]);
  });

  it("freezes a waiting process at the earliest pending interaction boundary", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      activeTurnId: TurnId.makeUnsafe("t-waiting"),
      turnProcessPhase: {
        kind: "waiting-for-user",
        turnId: TurnId.makeUnsafe("t-waiting"),
        startedAt: "2026-01-01T00:00:00Z",
        waitingAt: "2026-01-01T00:00:03Z",
      },
      timelineEntries: [
        userEntry("u-waiting", "2026-01-01T00:00:00Z"),
        workEntry("w-waiting", "2026-01-01T00:00:01Z", "Inspecting"),
      ],
    });

    expect(processRow(rows)).toMatchObject({
      phase: "waiting-for-user",
      turnId: TurnId.makeUnsafe("t-waiting"),
      elapsedMs: 3000,
    });
  });

  it("does not apply an unmatched old-turn phase to the latest response", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      turnProcessPhase: {
        kind: "waiting-for-user",
        turnId: TurnId.makeUnsafe("t-old-missing"),
        startedAt: "2026-01-01T00:00:00Z",
        waitingAt: "2026-01-01T00:00:06Z",
      },
      timelineEntries: [
        userEntry("u1", "2026-01-01T00:00:00Z"),
        workEntry("w1", "2026-01-01T00:00:01Z", "First turn work"),
        assistantEntry("a1", "2026-01-01T00:00:02Z", {
          turnId: "t1",
          completedAt: "2026-01-01T00:00:02Z",
        }),
        userEntry("u2", "2026-01-01T00:00:03Z"),
        workEntry("w2", "2026-01-01T00:00:04Z", "Latest turn work"),
        assistantEntry("a2", "2026-01-01T00:00:05Z", {
          turnId: "t2",
          completedAt: "2026-01-01T00:00:05Z",
        }),
      ],
    });

    expect(processRow(rows, "u1")?.phase).toBe("settled");
    expect(processRow(rows, "u2")?.phase).toBe("settled");
  });

  it("keeps explicit action and automation result cards outside process", () => {
    const webReview = workEntry("web-review", "2026-01-01T00:00:02Z", "Review selection");
    const automation = workEntry("automation", "2026-01-01T00:00:03Z", "Created automation");
    if (webReview.kind === "work") {
      webReview.entry.engineWebSurface = {
        status: "waiting-for-user",
        provenance: "engine-native",
        presentation: "omnimind-browser",
        surfaceId: "surface-1",
      };
    }
    if (automation.kind === "work") {
      automation.entry.automation = {
        id: "automation-1",
        name: "Watch CI",
        cadenceLabel: "5m",
      };
    }
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries: [
        userEntry("u-result", "2026-01-01T00:00:00Z"),
        workEntry("process", "2026-01-01T00:00:01Z", "Searching"),
        webReview,
        automation,
      ],
    });

    expect(processSignature(rows)).toEqual(["work:process"]);
    expect(
      rows.flatMap((row) =>
        row.kind === "work" ? row.groupedEntries.map((entry) => entry.id) : [],
      ),
    ).toEqual(["web-review", "automation"]);
  });

  it("keeps a completed generated image as a final result outside process", () => {
    const generatedImage = workEntry("generated-image", "2026-01-01T00:00:02Z", "Generated image");
    if (generatedImage.kind === "work") {
      generatedImage.entry.itemType = "image_generation";
      generatedImage.entry.activityKind = "tool.completed";
    }
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries: [
        userEntry("u-image", "2026-01-01T00:00:00Z"),
        assistantEntry("a-image", "2026-01-01T00:00:01Z", {
          turnId: "t-image",
          text: "",
          completedAt: "2026-01-01T00:00:03Z",
        }),
        generatedImage,
      ],
    });

    expect(messageRow(rows, "a-image")).toBeDefined();
    expect(messageRow(rows, "a-image")?.turnWorkEntries?.map((entry) => entry.id)).toEqual([
      "generated-image",
    ]);
    expect(processRow(rows)).toBeUndefined();
    expect(rows.find((row) => row.kind === "work")?.groupedEntries[0]?.id).toBe("generated-image");
  });

  it("places a plan-only final result after its process disclosure", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      timelineEntries: [
        userEntry("u-plan", "2026-01-01T00:00:00Z"),
        workEntry("plan-work", "2026-01-01T00:00:01Z", "Building plan"),
        proposedPlanEntry("plan-only", "2026-01-01T00:00:02Z", "t-plan"),
      ],
    });

    expect(rows.map((row) => row.kind)).toEqual(["message", "turn-process", "proposed-plan"]);
  });

  const worktreeSetupSnapshot = (): WorktreeSetupSnapshot => ({
    steps: [
      { id: "create-branch", label: "Creating branch", status: "done" },
      { id: "create-worktree", label: "Creating worktree", status: "done" },
      {
        id: "prepare-thread",
        label: "Linking thread workspace",
        status: "active",
      },
      { id: "start-session", label: "Starting session", status: "pending" },
    ],
  });

  it("appends an open worktree-setup row and suppresses the generic working shimmer", () => {
    const setup = worktreeSetupSnapshot();
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      isWorking: true,
      worktreeSetup: setup,
      worktreeSetupOpen: true,
      timelineEntries: [userEntry("u1", "2026-01-01T00:00:00Z")],
    });

    const setupRow = rows.at(-1);
    expect(setupRow).toMatchObject({
      kind: "worktree-setup",
      id: "worktree-setup-row",
      open: true,
      steps: setup.steps,
    });
    expect(rows.some((row) => row.kind === "turn-process")).toBe(false);
  });

  it("restores the live process row while the worktree-setup row animates closed", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      isWorking: true,
      worktreeSetup: worktreeSetupSnapshot(),
      worktreeSetupOpen: false,
      timelineEntries: [userEntry("u1", "2026-01-01T00:00:00Z")],
    });

    expect(rows.map((row) => row.kind)).toEqual(["message", "turn-process", "worktree-setup"]);
    expect(rows.find((row) => row.kind === "worktree-setup")).toMatchObject({
      open: false,
    });
  });

  it("omits the worktree-setup row entirely once the snapshot is gone", () => {
    const rows = deriveMessagesTimelineRows({
      ...baseInput,
      isWorking: true,
      timelineEntries: [userEntry("u1", "2026-01-01T00:00:00Z")],
    });

    expect(rows.map((row) => row.kind)).toEqual(["message", "turn-process"]);
  });
});

const toolItem = (
  id: string,
  overrides: Partial<WorkLogEntry> = {},
): Extract<TurnProcessItem, { kind: "work" }> => ({
  kind: "work",
  id,
  entry: {
    id,
    createdAt: "2026-01-01T00:00:00Z",
    label: `tool ${id}`,
    tone: "tool",
    itemType: "mcp_tool_call",
    ...overrides,
  },
});

const narrationItem = (id: string): TurnProcessItem => ({
  kind: "narration",
  id,
  message: {
    id: MessageId.makeUnsafe(id),
    role: "assistant",
    text: "narration",
    createdAt: "2026-01-01T00:00:00Z",
    streaming: false,
  },
});

const chunkSignature = (items: ReadonlyArray<TurnProcessItem>): string[] =>
  chunkTurnProcessItems(items).map((chunk) =>
    chunk.kind === "tool-group"
      ? `group:${chunk.id}:${chunk.entries.map((entry) => entry.id).join("+")}`
      : `item:${chunk.item.kind}:${String(chunk.item.id)}`,
  );

describe("chunkTurnProcessItems", () => {
  it("folds consecutive tool runs and lets narration split them", () => {
    expect(
      chunkSignature([
        toolItem("w1"),
        toolItem("w2"),
        narrationItem("a1"),
        toolItem("w3"),
        toolItem("w4"),
        toolItem("w5"),
      ]),
    ).toEqual(["group:w1:w1+w2", "item:narration:a1", "group:w3:w3+w4+w5"]);
  });

  it("keeps singleton runs as individual items", () => {
    expect(chunkSignature([toolItem("w1"), narrationItem("a1"), toolItem("w2")])).toEqual([
      "item:work:w1",
      "item:narration:a1",
      "item:work:w2",
    ]);
  });

  it("lets non-summarizable work rows split runs and render individually", () => {
    expect(
      chunkSignature([
        toolItem("w1"),
        toolItem("w2"),
        toolItem("err", { tone: "error" }),
        toolItem("w3"),
        toolItem("w4"),
      ]),
    ).toEqual(["group:w1:w1+w2", "item:work:err", "group:w3:w3+w4"]);
  });
});

describe("chunkWorkEntries", () => {
  it("preserves rich rows between independently collapsible tool runs", () => {
    const entries = [
      toolItem("w1").entry,
      toolItem("w2").entry,
      toolItem("err", { tone: "error" }).entry,
      toolItem("w3").entry,
      toolItem("w4").entry,
    ];

    expect(
      chunkWorkEntries(entries).map((chunk) =>
        chunk.kind === "tool-group"
          ? `group:${chunk.entries.map((entry) => entry.id).join("+")}`
          : `item:${chunk.entry.id}`,
      ),
    ).toEqual(["group:w1+w2", "item:err", "group:w3+w4"]);
  });
});

const planSignature = (
  entries: ReadonlyArray<WorkLogEntry>,
  options: { tailIsLive: boolean },
): string[] =>
  planWorkEntryRenderChunks(entries, options).map((chunk) => {
    const ids = chunk.entries.map((entry) => entry.id).join("+");
    return chunk.summary === null ? `open:${ids}` : `collapsed:${ids}`;
  });

describe("planWorkEntryRenderChunks", () => {
  it("collapses the earlier run across a thinking boundary while the live tail stays open", () => {
    expect(
      planSignature(
        [
          toolItem("w1").entry,
          toolItem("w2").entry,
          toolItem("think", { tone: "thinking" }).entry,
          toolItem("w3").entry,
          toolItem("w4").entry,
        ],
        { tailIsLive: true },
      ),
    ).toEqual(["collapsed:w1+w2", "open:think", "open:w3+w4"]);
  });

  it("collapses every run when narration is the trailing block", () => {
    expect(
      planSignature(
        [toolItem("w1").entry, toolItem("w2").entry, toolItem("think", { tone: "thinking" }).entry],
        { tailIsLive: true },
      ),
    ).toEqual(["collapsed:w1+w2", "open:think"]);
  });

  it("collapses the trailing run once the tail is no longer live", () => {
    expect(
      planSignature([toolItem("w1").entry, toolItem("w2").entry], {
        tailIsLive: false,
      }),
    ).toEqual(["collapsed:w1+w2"]);
  });

  it("never collapses a run that still has running work", () => {
    expect(
      planSignature(
        [
          toolItem("w1", { toolStatus: "running" }).entry,
          toolItem("w2").entry,
          toolItem("think", { tone: "thinking" }).entry,
          toolItem("w3").entry,
          toolItem("w4").entry,
        ],
        { tailIsLive: false },
      ),
    ).toEqual(["open:w1+w2", "open:think", "collapsed:w3+w4"]);
  });

  it("keeps singleton runs open: nothing to summarize", () => {
    expect(
      planSignature(
        [toolItem("w1").entry, toolItem("think", { tone: "thinking" }).entry, toolItem("w2").entry],
        { tailIsLive: false },
      ),
    ).toEqual(["open:w1", "open:think", "open:w2"]);
  });
});

describe("capOpenWorkEntryRenderChunks", () => {
  it("preserves collapsed summaries while limiting later open entries", () => {
    const chunks = planWorkEntryRenderChunks(
      [
        toolItem("w1").entry,
        toolItem("w2").entry,
        toolItem("think", { tone: "thinking" }).entry,
        toolItem("w3").entry,
        toolItem("w4").entry,
        toolItem("w5").entry,
        toolItem("w6").entry,
        toolItem("w7").entry,
      ],
      { tailIsLive: true },
    );

    const result = capOpenWorkEntryRenderChunks(chunks, {
      expanded: false,
      maxVisibleEntries: 3,
      keep: "last",
    });

    expect(
      result.chunks.map((chunk) => ({
        ids: chunk.entries.map((entry) => entry.id),
        collapsed: chunk.summary !== null,
      })),
    ).toEqual([
      { ids: ["w1", "w2"], collapsed: true },
      { ids: [], collapsed: false },
      { ids: ["w5", "w6", "w7"], collapsed: false },
    ]);
    expect(result.hasOverflow).toBe(true);
    expect(result.hiddenEntryCount).toBe(3);
  });

  it("does not count separately rendered status boundaries against the tool cap", () => {
    const chunks = planWorkEntryRenderChunks(
      [
        toolItem("w1").entry,
        toolItem("w2").entry,
        toolItem("think", { tone: "thinking" }).entry,
        toolItem("w3").entry,
        toolItem("w4").entry,
        toolItem("w5").entry,
      ],
      { tailIsLive: true },
    );

    const result = capOpenWorkEntryRenderChunks(chunks, {
      expanded: false,
      maxVisibleEntries: 2,
      keep: "first",
      shouldCapEntry: (entry) => entry.tone === "tool",
    });

    expect(result.chunks.map((chunk) => chunk.entries.map((entry) => entry.id))).toEqual([
      ["w1", "w2"],
      ["think"],
      ["w3", "w4"],
    ]);
    expect(result.hiddenEntryCount).toBe(1);
  });

  it("restores every open entry when expanded while retaining overflow state", () => {
    const chunks = planWorkEntryRenderChunks(
      [toolItem("w1").entry, toolItem("w2").entry, toolItem("w3").entry],
      { tailIsLive: true },
    );

    const result = capOpenWorkEntryRenderChunks(chunks, {
      expanded: true,
      maxVisibleEntries: 2,
      keep: "last",
    });

    expect(result.chunks.flatMap((chunk) => chunk.entries.map((entry) => entry.id))).toEqual([
      "w1",
      "w2",
      "w3",
    ]);
    expect(result.hasOverflow).toBe(true);
    expect(result.hiddenEntryCount).toBe(0);
  });
});

describe("findLiveReasoningEntryId", () => {
  const turnId = TurnId.makeUnsafe("turn-live-reasoning");
  const reasoning = (
    id: string,
    activityKind: "reasoning.updated" | "reasoning.completed" = "reasoning.updated",
  ): TimelineEntry => ({
    id,
    kind: "work",
    createdAt: "2026-08-26T12:00:00.000Z",
    entry: {
      id,
      createdAt: "2026-08-26T12:00:00.000Z",
      turnId,
      label: "Reasoning",
      tone: "thinking",
      activityKind,
      reasoningEntries: [{ id: `${id}:part`, text: "Public reasoning" }],
    },
  });
  const tool = (id: string): TimelineEntry => ({
    id,
    kind: "work",
    createdAt: "2026-08-26T12:00:01.000Z",
    entry: {
      id,
      createdAt: "2026-08-26T12:00:01.000Z",
      turnId,
      label: "Read source",
      tone: "tool",
      itemType: "dynamic_tool_call",
    },
  });

  it("returns only a trailing reasoning group from the active turn", () => {
    expect(findLiveReasoningEntryId([tool("tool-1"), reasoning("reasoning-1")], turnId)).toBe(
      "reasoning-1",
    );
    expect(
      findLiveReasoningEntryId(
        [reasoning("reasoning-1"), tool("tool-1"), reasoning("reasoning-2")],
        turnId,
      ),
    ).toBe("reasoning-2");
  });

  it("closes reasoning as soon as a tool or assistant segment follows", () => {
    expect(findLiveReasoningEntryId([reasoning("reasoning-1"), tool("tool-1")], turnId)).toBeNull();
    expect(
      findLiveReasoningEntryId(
        [
          reasoning("reasoning-1"),
          {
            id: "assistant-answer",
            kind: "message",
            createdAt: "2026-08-26T12:00:02.000Z",
            message: {
              id: MessageId.makeUnsafe("assistant-answer"),
              role: "assistant",
              text: "Answer streaming now",
              turnId,
              createdAt: "2026-08-26T12:00:02.000Z",
              streaming: true,
            },
          },
        ],
        turnId,
      ),
    ).toBeNull();
  });

  it("closes reasoning when the same segment reaches its terminal snapshot", () => {
    expect(
      findLiveReasoningEntryId([reasoning("reasoning-1", "reasoning.completed")], turnId),
    ).toBeNull();
  });

  it("does not reopen trailing reasoning from a different turn", () => {
    expect(
      findLiveReasoningEntryId([reasoning("reasoning-1")], TurnId.makeUnsafe("turn-other")),
    ).toBeNull();
  });
});
