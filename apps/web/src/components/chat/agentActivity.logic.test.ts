import { MessageId, TurnId } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";
import type { WorkLogEntry } from "../../session-logic";
import { deriveTimelineEntries } from "../../workLog";
import {
  deriveAgentActivityTimelineState,
  formatAgentActivityEntryPreview,
  formatAgentActivityEntryTitle,
  isAgentActivityWorkEntry,
  isCodexActivityStatusWorkEntry,
  isReasoningUpdateWorkEntry,
  isUnmappedProviderEventWorkEntry,
} from "./agentActivity.logic";

function workEntry(overrides: Partial<WorkLogEntry> & Pick<WorkLogEntry, "id">): WorkLogEntry {
  return {
    createdAt: "2026-06-05T00:00:00.000Z",
    label: "Tool call",
    tone: "tool",
    ...overrides,
  };
}

describe("deriveAgentActivityTimelineState", () => {
  it("groups consecutive reasoning text into ordered inline paragraphs", () => {
    const state = deriveAgentActivityTimelineState([
      workEntry({
        id: "reasoning-1",
        label: "Reasoning update",
        tone: "info",
        detail: "Running Check sidebar z-index",
      }),
      workEntry({
        id: "reasoning-2",
        label: "Reasoning update",
        tone: "info",
        sequence: 20,
        detail: "Running Verify diffToggleControl uses valid props",
      }),
      workEntry({
        id: "tool-1",
        label: "Read",
        tone: "tool",
      }),
    ]);

    expect(state.timelineWorkEntries.map((entry) => entry.id)).toEqual([
      "agent-reasoning:reasoning-1",
      "tool-1",
    ]);
    expect(state.timelineWorkEntries[0]).toMatchObject({
      label: "Reasoning",
      toolTitle: "Reasoning",
      tone: "thinking",
      reasoningEntries: [
        { id: "reasoning-1", text: "Check sidebar z-index" },
        {
          id: "reasoning-2",
          text: "Verify diffToggleControl uses valid props",
        },
      ],
    });
    expect(state.timelineWorkEntries[0]).not.toHaveProperty("sequence");
    expect(state.timelineWorkEntries[0]).not.toHaveProperty("preview");
    expect(state.timelineWorkEntries[0]).not.toHaveProperty("detail");
    expect(state.detailById.has("agent-reasoning:reasoning-1")).toBe(false);
  });

  it("flushes reasoning at assistant boundaries and preserves causal anchors", () => {
    const firstReasoningAt = "2026-06-05T00:00:01.000Z";
    const textAt = "2026-06-05T00:00:02.000Z";
    const toolAt = "2026-06-05T00:00:03.000Z";
    const latestReasoningAt = "2026-06-05T00:00:04.000Z";
    const latestTurnId = TurnId.makeUnsafe("turn-latest-reasoning");
    const textId = MessageId.makeUnsafe("text-middle");
    const messages = [
      {
        id: textId,
        role: "assistant" as const,
        text: "Intermediate assistant text",
        createdAt: textAt,
        turnId: latestTurnId,
        streaming: false,
        textSegments: [
          {
            sequence: 20,
            startedAt: textAt,
            endedAt: textAt,
            text: "Intermediate assistant ",
          },
          {
            sequence: 21,
            startedAt: textAt,
            endedAt: textAt,
            text: "text",
          },
        ],
      },
    ];
    const state = deriveAgentActivityTimelineState(
      [
        workEntry({
          id: "reasoning-first",
          label: "Reasoning update",
          createdAt: firstReasoningAt,
          sequence: 10,
          turnId: latestTurnId,
          detail: "Running Inspect the initial state",
        }),
        workEntry({
          id: "reasoning-latest",
          label: "Reasoning update",
          createdAt: latestReasoningAt,
          sequence: 30,
          turnId: latestTurnId,
          detail: "Running Verify the final state",
        }),
        workEntry({
          id: "tool-middle",
          label: "Read",
          createdAt: toolAt,
          sequence: 40,
        }),
      ],
      messages,
    );

    expect(state.timelineWorkEntries.map((entry) => entry.id)).toEqual([
      "agent-reasoning:reasoning-first",
      "agent-reasoning:reasoning-latest",
      "tool-middle",
    ]);
    expect(state.timelineWorkEntries[0]?.reasoningEntries).toEqual([
      { id: "reasoning-first", text: "Inspect the initial state" },
    ]);
    expect(state.timelineWorkEntries[1]?.reasoningEntries).toEqual([
      { id: "reasoning-latest", text: "Verify the final state" },
    ]);

    const timeline = deriveTimelineEntries(messages, [], state.timelineWorkEntries);
    expect(timeline.map(({ id }) => id)).toEqual([
      "agent-reasoning:reasoning-first",
      `${textId}#segment:0`,
      textId,
      "agent-reasoning:reasoning-latest",
      "tool-middle",
    ]);
  });

  it("cleans reasoning prefixes for single update previews", () => {
    const entry = workEntry({
      id: "reasoning-1",
      label: "Reasoning update",
      detail: "Reasoning update Running Complete analysis of the floating panel issue",
    });

    expect(formatAgentActivityEntryPreview(entry)).toBe(
      "Complete analysis of the floating panel issue",
    );
  });

  it("groups canonical reasoning updates into one non-tool disclosure", () => {
    const state = deriveAgentActivityTimelineState([
      workEntry({
        id: "reasoning-item-1",
        label: "Reasoning",
        toolTitle: "Reasoning",
        toolCallId: "provider-reasoning-1",
        detail: "Inspect the protocol",
      }),
      workEntry({
        id: "reasoning-item-2",
        label: "Reasoning",
        toolTitle: "Reasoning",
        toolCallId: "provider-reasoning-2",
        detail: "Update the adapter",
      }),
      workEntry({
        id: "reasoning-item-3",
        label: "Reasoning",
        toolTitle: "Reasoning",
        toolCallId: "provider-reasoning-3",
        detail: "Verify the result",
      }),
    ]);

    expect(state.timelineWorkEntries.map((entry) => entry.id)).toEqual([
      "agent-reasoning:reasoning-item-1",
    ]);
    expect(state.timelineWorkEntries[0]).toMatchObject({
      tone: "thinking",
      reasoningEntries: [
        { id: "reasoning-item-1", text: "Inspect the protocol" },
        { id: "reasoning-item-2", text: "Update the adapter" },
        { id: "reasoning-item-3", text: "Verify the result" },
      ],
    });
  });

  it("starts a new reasoning group when the turn changes without another visible boundary", () => {
    const state = deriveAgentActivityTimelineState([
      workEntry({
        id: "reasoning-turn-1",
        activityKind: "reasoning.completed",
        turnId: TurnId.makeUnsafe("turn-1"),
        detail: "First turn reasoning",
      }),
      workEntry({
        id: "reasoning-turn-2",
        activityKind: "reasoning.completed",
        turnId: TurnId.makeUnsafe("turn-2"),
        detail: "Second turn reasoning",
      }),
    ]);

    expect(state.timelineWorkEntries.map((entry) => entry.id)).toEqual([
      "agent-reasoning:reasoning-turn-1",
      "agent-reasoning:reasoning-turn-2",
    ]);
  });

  it("shows the latest readable Codex summary and omits empty placeholders", () => {
    const state = deriveAgentActivityTimelineState([
      workEntry({
        id: "reasoning-visible",
        label: "Reasoning trace",
        toolTitle: "Reasoning trace",
        toolCallId: "provider-reasoning-visible",
        detail:
          "**Planning Codex threads inspection**\n\n<!-- -->\n\n**Refining the display logic**\n\n<!-- -->",
      }),
      workEntry({
        id: "reasoning-empty",
        label: "Reasoning trace",
        toolTitle: "Reasoning trace",
        toolCallId: "provider-reasoning-empty",
      }),
    ]);

    expect(state.timelineWorkEntries).toHaveLength(1);
    expect(state.timelineWorkEntries[0]).toMatchObject({
      id: "agent-reasoning:reasoning-visible",
      reasoningEntries: [
        {
          id: "reasoning-visible",
          text: "**Planning Codex threads inspection**\n\n**Refining the display logic**",
        },
      ],
    });
  });

  it("dedupes only exact adjacent assistant narration while preserving non-identical reasoning", () => {
    const turnId = TurnId.makeUnsafe("turn-dedupe");
    const reasoning = workEntry({
      id: "reasoning-duplicate",
      activityKind: "reasoning.completed",
      tone: "info",
      turnId,
      sequence: 10,
      createdAt: "2026-06-05T00:00:01.000Z",
      detail: "Converting all the timestamps to Beijing time for consistency.",
    });
    const preserved = workEntry({
      id: "reasoning-preserved",
      activityKind: "reasoning.completed",
      tone: "info",
      turnId,
      sequence: 30,
      createdAt: "2026-06-05T00:00:03.000Z",
      detail: "Checking the final timeline boundary.",
    });
    const state = deriveAgentActivityTimelineState(
      [reasoning, preserved],
      [
        {
          id: MessageId.makeUnsafe("assistant-narration"),
          role: "assistant",
          text: "Converting all the timestamps to Beijing time for consistency.",
          createdAt: "2026-06-05T00:00:02.000Z",
          turnId,
          streaming: false,
        },
      ],
    );

    expect(state.detailById.has("agent-reasoning:reasoning-duplicate")).toBe(false);
    expect(state.timelineWorkEntries).toHaveLength(1);
    expect(state.timelineWorkEntries[0]?.reasoningEntries).toEqual([
      {
        id: "reasoning-preserved",
        text: "Checking the final timeline boundary.",
      },
    ]);
    expect(state.detailById.has("agent-reasoning:reasoning-preserved")).toBe(false);
  });

  it("does not dedupe when display cleanup would make distinct raw reasoning text look equal", () => {
    const turnId = TurnId.makeUnsafe("turn-raw-dedupe");
    const reasoning = workEntry({
      id: "reasoning-markdown",
      activityKind: "reasoning.completed",
      tone: "info",
      turnId,
      detail: "**Same text**",
    });
    const state = deriveAgentActivityTimelineState(
      [reasoning],
      [
        {
          id: MessageId.makeUnsafe("assistant-same-text"),
          role: "assistant",
          text: "Same text",
          createdAt: "2026-06-05T00:00:01.000Z",
          turnId,
          streaming: false,
        },
      ],
    );

    expect(state.timelineWorkEntries).toHaveLength(1);
    expect(state.timelineWorkEntries[0]?.reasoningEntries).toEqual([
      { id: "reasoning-markdown", text: "**Same text**" },
    ]);
    expect(state.detailById.has("agent-reasoning:reasoning-markdown")).toBe(false);
  });

  it("recognizes reasoning trace and summary labels as reasoning activity", () => {
    const trace = workEntry({
      id: "reasoning-trace-1",
      label: "Reasoning trace",
      detail: "Reasoning trace Running Inspect the protocol",
    });
    const summary = workEntry({
      id: "reasoning-summary-1",
      label: "Reasoning summary",
      detail: "Reasoning summary Update the adapter",
    });

    expect(isReasoningUpdateWorkEntry(trace)).toBe(true);
    expect(isReasoningUpdateWorkEntry(summary)).toBe(true);
    expect(
      isCodexActivityStatusWorkEntry(
        workEntry({
          id: "command-execution-1",
          label: "Ran command",
          toolTitle: "Ran command",
          itemType: "command_execution",
        }),
      ),
    ).toBe(false);
    expect(formatAgentActivityEntryPreview(trace)).toBe("Inspect the protocol");
    expect(formatAgentActivityEntryPreview(summary)).toBe("Update the adapter");
  });

  it("keeps generic agent task rows openable without compacting them away", () => {
    const state = deriveAgentActivityTimelineState([
      workEntry({
        id: "agent-task-1",
        label: "Find changelog implementation",
        itemType: "collab_agent_tool_call",
        toolTitle: "Find changelog implementation",
        subagentAction: {
          tool: "task",
          status: "completed",
          summaryText: "Agent activity",
          prompt: "Explore this codebase to find the changelog feature.",
        },
      }),
    ]);

    expect(state.timelineWorkEntries.map((entry) => entry.id)).toEqual(["agent-task-1"]);
    expect(isAgentActivityWorkEntry(state.timelineWorkEntries[0]!)).toBe(true);
    expect(state.detailById.get("agent-task-1")).toMatchObject({
      title: "Find changelog implementation",
      summary: "Explore this codebase to find the changelog feature.",
    });
  });

  it("uses the prompt as the detail summary when the agent result is long", () => {
    const state = deriveAgentActivityTimelineState([
      workEntry({
        id: "agent-task-1",
        label: "Find changelog implementation",
        itemType: "collab_agent_tool_call",
        toolTitle: "Find changelog implementation",
        detail: "Full changelog report\nwith many file references and implementation notes.",
        subagentAction: {
          tool: "task",
          status: "completed",
          summaryText: "Agent activity",
          prompt: "Explore this codebase to find the changelog feature.",
        },
      }),
    ]);

    expect(state.detailById.get("agent-task-1")).toMatchObject({
      summary: "Explore this codebase to find the changelog feature.",
    });
    expect(state.timelineWorkEntries[0]).toMatchObject({
      detail: "Full changelog report\nwith many file references and implementation notes.",
    });
  });
});

describe("unmapped provider events", () => {
  it("labels an unmapped event with its native type and safe detail", () => {
    const entry = workEntry({
      id: "unmapped-1",
      label: "item/agentMessage/completed",
      toolTitle: "item/agentMessage/completed",
      activityKind: "provider.event.unmapped",
      nativeEventType: "item/agentMessage/completed",
      detail: "Finished the refactor",
      tone: "info",
    });

    expect(isUnmappedProviderEventWorkEntry(entry)).toBe(true);
    // Raw native type/label is the title instead of the generic "Activity".
    expect(formatAgentActivityEntryTitle(entry)).toBe("Item/agentMessage/completed");
    expect(formatAgentActivityEntryPreview(entry)).toBe("Finished the refactor");
    // The unmapped fallback never hijacks explicit, working mappings.
    expect(isCodexActivityStatusWorkEntry(entry)).toBe(false);
    expect(isAgentActivityWorkEntry(entry)).toBe(false);
  });

  it("still derives a native-type title when the normalized heading is empty", () => {
    const entry = workEntry({
      id: "unmapped-2",
      label: "done",
      activityKind: "provider.event.unmapped",
      nativeEventType: "done",
      tone: "info",
    });
    // normalizeCompactToolLabel strips the trailing "done", which previously
    // fell through to the generic "Activity" label.
    expect(formatAgentActivityEntryTitle(entry)).toBe("Done");
  });
});
