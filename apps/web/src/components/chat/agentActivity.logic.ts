// FILE: agentActivity.logic.ts
// Purpose: Derive compact transcript rows and full-detail models for agent activity.
// Layer: Chat presentation helpers
// Exports: agent activity detection, formatting, and timeline compaction

import { normalizeCompactToolLabel } from "../../lib/toolCallLabel";
import type { WorkLogEntry } from "../../session-logic";
import { deriveTimelineEntries } from "../../workLog";
import type { ChatMessage } from "../../types";

export interface AgentActivityDetail {
  id: string;
  title: string;
  summary: string | null;
  primaryEntry: WorkLogEntry;
  entries: WorkLogEntry[];
}

export interface AgentActivityTimelineState {
  timelineWorkEntries: WorkLogEntry[];
  detailById: Map<string, AgentActivityDetail>;
}

const REASONING_GROUP_PREFIX = "agent-reasoning";

export function isReasoningUpdateWorkEntry(
  entry: Pick<WorkLogEntry, "activityKind" | "label" | "toolTitle">,
): boolean {
  if (entry.activityKind === "reasoning.completed") {
    return true;
  }
  // Read-only compatibility for activities persisted by older OmniMind builds.
  const heading = normalizeWorkText(entry.toolTitle ?? entry.label);
  return (
    heading === "reasoning" ||
    heading === "reasoning update" ||
    heading === "reasoning trace" ||
    heading === "reasoning summary"
  );
}

export function isCodexActivityStatusWorkEntry(entry: WorkLogEntry): boolean {
  // A structured command fact is a real execution even when the provider did
  // not include the raw shell string; it must keep the Terminal icon. Only a
  // generic lifecycle label without command semantics remains iconless.
  const isStatusOnlyCommand =
    entry.itemType !== "command_execution" &&
    entry.requestKind !== "command" &&
    !entry.command &&
    !entry.rawCommand &&
    normalizeWorkText(entry.toolTitle ?? entry.label) === "command execution";
  return isStatusOnlyCommand;
}

export function isAgentActivityWorkEntry(entry: WorkLogEntry): boolean {
  return entry.itemType === "collab_agent_tool_call" || isReasoningUpdateWorkEntry(entry);
}

// Unmapped provider events keep their native type as the title and a safe detail as preview.
export function isUnmappedProviderEventWorkEntry(
  entry: Pick<WorkLogEntry, "activityKind">,
): boolean {
  return entry.activityKind === "provider.event.unmapped";
}

export function formatAgentActivityEntryTitle(entry: WorkLogEntry): string {
  if (isReasoningUpdateWorkEntry(entry)) {
    return "Reasoning";
  }
  const heading = normalizeCompactToolLabel(entry.toolTitle ?? entry.label).trim();
  if (heading) {
    return capitalizePhrase(heading);
  }
  if (isUnmappedProviderEventWorkEntry(entry) && entry.nativeEventType) {
    // The raw native type/label is the only title the event carries; use it
    // verbatim instead of degrading to the generic "Activity" label.
    return capitalizePhrase(entry.nativeEventType);
  }
  return entry.itemType === "collab_agent_tool_call" ? "Agent task" : "Activity";
}

export function formatAgentActivityEntryPreview(entry: WorkLogEntry): string | null {
  if (isReasoningUpdateWorkEntry(entry)) {
    return cleanReasoningProgressText(entry.preview ?? entry.detail ?? entry.label);
  }

  if (entry.itemType === "collab_agent_tool_call") {
    return (
      normalizeOptionalText(entry.detail) ??
      normalizeOptionalText(entry.preview) ??
      normalizeOptionalText(entry.subagentAction?.prompt) ??
      normalizeOptionalText(entry.subagentAction?.summaryText)
    );
  }

  return normalizeOptionalText(entry.preview) ?? normalizeOptionalText(entry.detail);
}

export function formatAgentActivityEntrySummary(entry: WorkLogEntry): string | null {
  if (isReasoningUpdateWorkEntry(entry)) {
    return formatAgentActivityEntryPreview(entry);
  }

  if (entry.itemType === "collab_agent_tool_call") {
    return (
      normalizeOptionalText(entry.subagentAction?.prompt) ??
      normalizeOptionalText(entry.subagentAction?.summaryText) ??
      normalizeOptionalText(entry.preview)
    );
  }

  return normalizeOptionalText(entry.preview);
}

export function deriveAgentActivityTimelineState(
  entries: ReadonlyArray<WorkLogEntry>,
  messages: ReadonlyArray<ChatMessage> = [],
): AgentActivityTimelineState {
  const timelineWorkEntries: WorkLogEntry[] = [];
  const detailById = new Map<string, AgentActivityDetail>();
  let pendingReasoningEntries: WorkLogEntry[] = [];

  const flushReasoningEntries = () => {
    if (pendingReasoningEntries.length === 0) {
      return;
    }

    const groupEntries = pendingReasoningEntries;
    pendingReasoningEntries = [];
    const first = groupEntries[0]!;
    const latest = groupEntries[groupEntries.length - 1]!;
    const groupId = `${REASONING_GROUP_PREFIX}:${first.id}`;
    const latestPreview = findLatestPreview(groupEntries);
    const updateCount = groupEntries.length;
    const displayPreview =
      latestPreview;
    const displayEntry: WorkLogEntry = {
      ...latest,
      id: groupId,
      createdAt: first.createdAt,
      label: "Reasoning",
      toolTitle: "Reasoning",
      tone: "thinking",
      reasoningUpdateCount: updateCount,
      ...(displayPreview ? { preview: displayPreview, detail: displayPreview } : {}),
    };
    if (first.sequence === undefined) {
      delete displayEntry.sequence;
    } else {
      displayEntry.sequence = first.sequence;
    }

    timelineWorkEntries.push(displayEntry);
    detailById.set(groupId, buildAgentActivityDetail(groupId, displayEntry, groupEntries));
  };

  const orderedTimeline =
    messages.length > 0
      ? deriveTimelineEntries([...messages], [], [...entries])
      : entries.map((entry) => ({
          id: entry.id,
          kind: "work" as const,
          createdAt: entry.createdAt,
          ...(entry.sequence !== undefined ? { sequence: entry.sequence } : {}),
          entry,
        }));

  for (const [index, timelineEntry] of orderedTimeline.entries()) {
    if (timelineEntry.kind !== "work") {
      flushReasoningEntries();
      continue;
    }
    const entry = timelineEntry.entry;
    if (isReasoningUpdateWorkEntry(entry)) {
      const reasoningPreview = formatAgentActivityEntryPreview(entry);
      if (!reasoningPreview || isDuplicateAdjacentAssistantNarration(orderedTimeline, index, entry)) {
        continue;
      }
      pendingReasoningEntries.push(entry);
      continue;
    }

    flushReasoningEntries();
    timelineWorkEntries.push(entry);
    if (isAgentActivityWorkEntry(entry)) {
      detailById.set(entry.id, buildAgentActivityDetail(entry.id, entry, [entry]));
    }
  }

  flushReasoningEntries();
  return { timelineWorkEntries, detailById };
}

function isDuplicateAdjacentAssistantNarration(
  timeline: ReturnType<typeof deriveTimelineEntries>,
  index: number,
  entry: WorkLogEntry,
): boolean {
  if (!entry.turnId) {
    return false;
  }
  const preview = formatAgentActivityEntryPreview(entry);
  if (!preview) {
    return false;
  }
  const normalizedPreview = normalizeExactVisibleText(preview);
  for (const adjacentIndex of [index - 1, index + 1]) {
    const adjacent = timeline[adjacentIndex];
    if (
      adjacent?.kind === "message" &&
      adjacent.message.role === "assistant" &&
      adjacent.message.turnId === entry.turnId &&
      normalizeExactVisibleText(adjacent.message.text) === normalizedPreview
    ) {
      return true;
    }
  }
  return false;
}

function normalizeExactVisibleText(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

function buildAgentActivityDetail(
  id: string,
  primaryEntry: WorkLogEntry,
  entries: ReadonlyArray<WorkLogEntry>,
): AgentActivityDetail {
  const title = formatAgentActivityEntryTitle(primaryEntry);
  return {
    id,
    title,
    summary: findLatestSummary(entries),
    primaryEntry,
    entries: [...entries],
  };
}

function findLatestPreview(entries: ReadonlyArray<WorkLogEntry>): string | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const preview = formatAgentActivityEntryPreview(entries[index]!);
    if (preview) {
      return preview;
    }
  }
  return null;
}

function findLatestSummary(entries: ReadonlyArray<WorkLogEntry>): string | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const summary = formatAgentActivityEntrySummary(entries[index]!);
    if (summary) {
      return summary;
    }
  }
  return null;
}

function cleanReasoningProgressText(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  // Codex summaries are Markdown blocks such as
  // `**Planning the implementation**\n\n<!-- -->`. Its compact UI label is the
  // last readable line, with comments and lightweight Markdown removed.
  const readableLines = value
    .replace(/<!--[\s\S]*?-->/gu, "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("<!--"));
  const latestLine = readableLines.at(-1);
  if (!latestLine) {
    return null;
  }
  const trimmed = latestLine
    .replace(/^#{1,6}\s+/u, "")
    .replace(/^\*\*(.+)\*\*$/u, "$1")
    .replace(/^__(.+)__$/u, "$1")
    .replace(/^`(.+)`$/u, "$1")
    .trim();

  const withoutReasoningPrefix = trimmed
    .replace(/^reasoning(?:\s+(?:update|trace|summary))?\b[\s:.-]*/i, "")
    .trim();
  const withoutRunningPrefix = withoutReasoningPrefix.replace(/^running\b[\s:.-]*/i, "").trim();
  return withoutRunningPrefix || withoutReasoningPrefix || null;
}

function normalizeOptionalText(value: string | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function normalizeWorkText(value: string): string {
  return normalizeCompactToolLabel(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function capitalizePhrase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}
