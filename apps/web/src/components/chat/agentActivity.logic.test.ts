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
  it("compacts consecutive reasoning updates while preserving detail entries", () => {
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
      preview: "Verify diffToggleControl uses valid props",
      tone: "thinking",
      reasoningUpdateCount: 2,
    });
    expect(state.timelineWorkEntries[0]).not.toHaveProperty("sequence");
    expect(state.detailById.get("agent-reasoning:reasoning-1")?.entries).toHaveLength(2);
  });

  it("anchors compacted legacy reasoning before interleaved text and tool rows", () => {
    const firstReasoningAt = "2026-06-05T00:00:01.000Z";
    const textAt = "2026-06-05T00:00:02.000Z";
    const toolAt = "2026-06-05T00:00:03.000Z";
    const latestReasoningAt = "2026-06-05T00:00:04.000Z";
    const latestTurnId = TurnId.makeUnsafe("turn-latest-reasoning");
    const state = deriveAgentActivityTimelineState([
      workEntry({
        id: "reasoning-first",
        label: "Reasoning update",
        createdAt: firstReasoningAt,
        sequence: 10,
        detail: "Running Inspect the initial state",
        toolStatus: "running",
        changedFiles: ["src/first.ts"],
      }),
      workEntry({
        id: "reasoning-latest",
        label: "Reasoning update",
        createdAt: latestReasoningAt,
        sequence: 30,
        turnId: latestTurnId,
        detail: "Running Verify the final state",
        toolStatus: "completed",
        changedFiles: ["src/latest.ts"],
        nativeEventType: "reasoning.completed",
      }),
      workEntry({ id: "tool-middle", label: "Read", createdAt: toolAt, sequence: 40 }),
    ]);

    expect(state.timelineWorkEntries[0]).toMatchObject({
      id: "agent-reasoning:reasoning-first",
      createdAt: firstReasoningAt,
      sequence: 10,
      turnId: latestTurnId,
      preview: "Verify the final state",
      detail: "Verify the final state",
      toolStatus: "completed",
      changedFiles: ["src/latest.ts"],
      nativeEventType: "reasoning.completed",
    });
    expect(
      state.detailById.get("agent-reasoning:reasoning-first")?.entries.map(({ id }) => id),
    ).toEqual(["reasoning-first", "reasoning-latest"]);

    const textId = MessageId.makeUnsafe("text-middle");
    const timeline = deriveTimelineEntries(
      [
        {
          id: textId,
          role: "assistant",
          text: "Intermediate assistant text",
          createdAt: textAt,
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
      ],
      [],
      state.timelineWorkEntries,
    );
    expect(timeline.map(({ id }) => id)).toEqual([
      "agent-reasoning:reasoning-first",
      `${textId}#segment:0`,
      textId,
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
      reasoningUpdateCount: 3,
    });
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
      preview: "Refining the display logic",
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
    expect(state.detailById.get("agent-reasoning:reasoning-preserved")?.entries).toHaveLength(1);
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
