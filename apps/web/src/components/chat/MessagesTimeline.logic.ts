// FILE: MessagesTimeline.logic.ts
// Purpose: Owns the pure row-derivation helpers used by the transcript hot path.
// Layer: Web chat presentation helpers
// Exports: row derivation, structural sharing, copy/timer helpers

import {
  type MessageId,
  type OrchestrationTurnProvenance,
  type TurnId,
} from "@harnessos/contracts";
import { type TimelineEntry, type WorkLogEntry, elapsedMilliseconds } from "../../session-logic";
import { normalizeCompactToolLabel as normalizeCompactToolLabelValue } from "../../lib/toolCallLabel";
import {
  isSummarizableToolCallEntry,
  MIN_COLLAPSIBLE_TOOL_GROUP_SIZE,
  summarizeToolCallGroup,
  type ToolCallGroupSummary,
} from "./toolCallGroup.logic";
import { isReasoningUpdateWorkEntry } from "./agentActivity.logic";
import {
  type ChatMessage,
  type ProposedPlan,
  type TurnDiffSummary,
  type WorktreeSetupSnapshot,
  type WorktreeSetupStep,
} from "../../types";

export const MAX_VISIBLE_WORK_LOG_ENTRIES = 6;

export function canSubmitUserMessageEdit(input: {
  draft: string;
  allowEmpty: boolean;
  disabled: boolean;
}): boolean {
  return (input.allowEmpty || input.draft.trim().length > 0) && !input.disabled;
}

// Ordered process item owned by one response-level Working/Worked disclosure.
// The sequence is projected directly from canonical Timeline entries: terminal
// assistant/result rows are excluded, everything else keeps source order.
export type TurnProcessItem =
  | { kind: "work"; id: string; entry: WorkLogEntry }
  | { kind: "narration"; id: string; message: ChatMessage };

// A turn's process items re-chunked for rendering: consecutive
// summarizable tool rows fold into one "Ran N commands..." disclosure while
// narration and rich rows pass through individually.
export type TurnProcessChunk =
  | { kind: "item"; item: TurnProcessItem }
  | { kind: "tool-group"; id: string; entries: WorkLogEntry[] };

export type TurnProcessPhase =
  | { kind: "running"; turnId: TurnId | null; startedAt: string | null }
  | {
      kind: "waiting-for-user";
      turnId: TurnId | null;
      startedAt: string | null;
      waitingAt: string;
    }
  | { kind: "settled" };

export type WorkEntryChunk =
  | { kind: "item"; id: string; entry: WorkLogEntry }
  | { kind: "tool-group"; id: string; entries: WorkLogEntry[] };

export function chunkTurnProcessItems(items: ReadonlyArray<TurnProcessItem>): TurnProcessChunk[] {
  const chunks: TurnProcessChunk[] = [];
  let pendingRun: Extract<TurnProcessItem, { kind: "work" }>[] = [];

  const flushPendingRun = () => {
    if (pendingRun.length === 0) return;
    if (pendingRun.length >= MIN_COLLAPSIBLE_TOOL_GROUP_SIZE) {
      chunks.push({
        kind: "tool-group",
        id: pendingRun[0]!.id,
        entries: pendingRun.map((item) => item.entry),
      });
    } else {
      for (const item of pendingRun) {
        chunks.push({ kind: "item", item });
      }
    }
    pendingRun = [];
  };

  for (const item of items) {
    if (item.kind === "work" && isSummarizableToolCallEntry(item.entry)) {
      pendingRun.push(item);
      continue;
    }
    flushPendingRun();
    chunks.push({ kind: "item", item });
  }
  flushPendingRun();
  return chunks;
}

export function chunkWorkEntries(entries: ReadonlyArray<WorkLogEntry>): WorkEntryChunk[] {
  return chunkTurnProcessItems(
    entries.map((entry) => ({ kind: "work" as const, id: entry.id, entry })),
  ).map((chunk) => {
    if (chunk.kind === "tool-group") return chunk;
    if (chunk.item.kind !== "work") {
      throw new Error("Work-entry chunking produced an unexpected narration item.");
    }
    return { kind: "item", id: chunk.item.id, entry: chunk.item.entry };
  });
}

// One renderable block of a work group: `summary` is non-null when the block
// renders collapsed behind a "Ran N commands..." disclosure.
export interface WorkEntryRenderPlanChunk {
  id: string;
  entries: WorkLogEntry[];
  summary: ToolCallGroupSummary | null;
}

// Plans a work group's entries block by block. Boundaries are the entries a
// summary can never absorb — thinking/info narration, errors, rich cards — so
// each tool run between boundaries folds independently. A run stays expanded
// only while it still has running work, or while it is the trailing block of
// the live transcript tail (`tailIsLive`): the moment a new narration block
// starts after it, it stops being the tail and collapses mid-turn.
export function planWorkEntryRenderChunks(
  entries: ReadonlyArray<WorkLogEntry>,
  options: { tailIsLive: boolean },
): WorkEntryRenderPlanChunk[] {
  const chunks = chunkWorkEntries(entries);
  return chunks.map((chunk, index) => {
    if (chunk.kind === "item") {
      return { id: chunk.id, entries: [chunk.entry], summary: null };
    }
    const summary = summarizeToolCallGroup(chunk.entries);
    const isLiveTail = options.tailIsLive && index === chunks.length - 1;
    const collapsed = summary !== null && !summary.hasRunningEntry && !isLiveTail;
    return {
      id: chunk.id,
      entries: chunk.entries,
      summary: collapsed ? summary : null,
    };
  });
}

export interface CappedWorkEntryRenderPlan {
  chunks: WorkEntryRenderPlanChunk[];
  hasOverflow: boolean;
  hiddenEntryCount: number;
}

// Keeps collapsed summaries intact while bounding only the entries that still
// render openly. Callers can exclude boundary/status rows from the budget when
// those rows are rendered separately from tool calls.
export function capOpenWorkEntryRenderChunks(
  chunks: ReadonlyArray<WorkEntryRenderPlanChunk>,
  options: {
    expanded: boolean;
    maxVisibleEntries: number;
    keep: "first" | "last";
    shouldCapEntry?: (entry: WorkLogEntry) => boolean;
  },
): CappedWorkEntryRenderPlan {
  const shouldCapEntry = options.shouldCapEntry ?? (() => true);
  const openEntries = chunks.flatMap((chunk) =>
    chunk.summary === null ? chunk.entries.filter(shouldCapEntry) : [],
  );
  const maxVisibleEntries = Math.max(0, options.maxVisibleEntries);
  const hiddenEntryCount = Math.max(0, openEntries.length - maxVisibleEntries);
  const hasOverflow = hiddenEntryCount > 0;

  if (!hasOverflow || options.expanded) {
    return { chunks: [...chunks], hasOverflow, hiddenEntryCount: 0 };
  }

  const visibleEntries =
    maxVisibleEntries === 0
      ? []
      : options.keep === "last"
        ? openEntries.slice(-maxVisibleEntries)
        : openEntries.slice(0, maxVisibleEntries);
  const visibleEntrySet = new Set(visibleEntries);

  return {
    chunks: chunks.map((chunk) => {
      if (chunk.summary !== null) return chunk;
      return {
        ...chunk,
        entries: chunk.entries.filter(
          (entry) => !shouldCapEntry(entry) || visibleEntrySet.has(entry),
        ),
      };
    }),
    hasOverflow,
    hiddenEntryCount,
  };
}

// Public reasoning is live only while its canonical `reasoning.updated` row is
// the causal tail of the active turn. Its same-ID terminal replacement, a
// following assistant segment, tool activity, or proposed plan closes that
// reasoning group immediately even though the turn itself may keep running.
// Keeping this decision on the canonical Timeline sequence prevents every
// reasoning row in a long active turn from inheriting one coarse `isWorking`
// boolean and remaining open together.
export function findLiveReasoningEntryId(
  timelineEntries: ReadonlyArray<TimelineEntry>,
  activeTurnId: TurnId | null,
): string | null {
  const tail = timelineEntries.at(-1);
  if (
    tail?.kind !== "work" ||
    tail.entry.activityKind !== "reasoning.updated" ||
    !isReasoningUpdateWorkEntry(tail.entry)
  ) {
    return null;
  }
  if (activeTurnId !== null && tail.entry.turnId !== activeTurnId) {
    return null;
  }
  return tail.entry.id;
}

export interface TimelineDurationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  createdAt: string;
  turnId?: string | null;
  completedAt?: string | undefined;
}

interface TimelineDiffMessage {
  id: MessageId;
  role: "user" | "assistant" | "system";
  turnId: TurnId | null;
}

export interface AssistantTurnLayout {
  readonly responseId: string;
  readonly showIdentity: boolean;
  readonly provenance: OrchestrationTurnProvenance | null;
  readonly timestamp: string;
}

type MessagesTimelineRowContent =
  | {
      kind: "work";
      id: string;
      createdAt: string;
      groupedEntries: WorkLogEntry[];
    }
  | {
      kind: "message";
      id: string;
      createdAt: string;
      message: ChatMessage;
      // Read-only response metadata used by final-result projections (image-only
      // responses and OmniMind creation recaps). These entries render only in
      // the sibling turn-process row unless they are explicit result receipts.
      turnWorkEntries?: WorkLogEntry[];
      durationStart: string;
      showAssistantCopyButton: boolean;
      assistantCopyStreaming: boolean;
      assistantCopyText?: string;
      assistantTurnDiffSummary?: TurnDiffSummary | undefined;
      // True while this row's turn is still running. The end-of-turn changes
      // card (Undo / Review) is held back until the turn settles so it cannot
      // pre-empt the composer's live changes strip mid-turn.
      assistantTurnInProgress?: boolean | undefined;
      revertTurnCount?: number | undefined;
    }
  | {
      kind: "proposed-plan";
      id: string;
      createdAt: string;
      proposedPlan: ProposedPlan;
    }
  | {
      kind: "turn-process";
      id: string;
      createdAt: string;
      turnId: TurnId | null;
      phase: "running" | "waiting-for-user" | "settled";
      items: TurnProcessItem[];
      elapsedMs: number | null;
      turnDiffSummary?: TurnDiffSummary | undefined;
    }
  | {
      // Transient "Preparing worktree..." step card shown during the New
      // worktree first-send setup. `open` drives the shared disclosure close
      // animation while the presentation hook keeps the row mounted.
      kind: "worktree-setup";
      id: string;
      steps: ReadonlyArray<WorktreeSetupStep>;
      open: boolean;
    };

export type MessagesTimelineRow = MessagesTimelineRowContent & {
  assistantTurnLayout?: AssistantTurnLayout;
};

export interface StableMessagesTimelineRowsState {
  byId: Map<string, MessagesTimelineRow>;
  result: MessagesTimelineRow[];
}

export function computeMessageDurationStart(
  messages: ReadonlyArray<TimelineDurationMessage>,
): Map<string, string> {
  const result = new Map<string, string>();
  let lastBoundary: string | null = null;

  for (const message of messages) {
    if (message.role === "user") {
      lastBoundary = message.createdAt;
    }
    result.set(message.id, lastBoundary ?? message.createdAt);
    if (message.role === "assistant" && message.completedAt) {
      lastBoundary = message.completedAt;
    }
  }

  return result;
}

export function normalizeCompactToolLabel(value: string): string {
  return normalizeCompactToolLabelValue(value);
}

export function resolveAssistantMessageCopyState({
  text,
  showCopyButton,
  streaming,
}: {
  text: string | null;
  showCopyButton: boolean;
  streaming: boolean;
}) {
  const normalizedText = text?.trim() ? text : null;
  return {
    text: normalizedText,
    visible: showCopyButton && normalizedText !== null && !streaming,
  };
}

type AssistantMessageDisplayInput = {
  readonly message: Pick<ChatMessage, "text" | "streaming">;
  readonly turnWorkEntries?: ReadonlyArray<WorkLogEntry>;
};

function isVisibleGeneratedImageEntry(entry: WorkLogEntry): boolean {
  return (
    entry.itemType === "image_generation" &&
    entry.activityKind === "tool.completed" &&
    entry.tone !== "error"
  );
}

/**
 * Resolves the markdown body for an assistant row. A completed image-generation
 * work item is already visible non-text output, so an adjacent empty provider
 * message must not add the misleading "(empty response)" placeholder. Truly
 * empty settled turns retain the placeholder, and live empty text stays blank.
 */
export function resolveAssistantMessageDisplayText(
  input: AssistantMessageDisplayInput,
): string | null {
  if (input.message.text) {
    return input.message.text;
  }
  if (input.message.streaming) {
    return "";
  }

  const hasVisibleGeneratedImage = [...(input.turnWorkEntries ?? [])].some(
    isVisibleGeneratedImageEntry,
  );

  return hasVisibleGeneratedImage ? null : "(empty response)";
}

// Builds the "Files changed" lookup keyed by the last assistant row in the
// user-visible response segment. Provider mini-turns can emit diffs before the
// final answer, so the card follows the segment tail instead of the raw turn.
export function buildTurnDiffSummaryByAssistantMessageId(input: {
  turnDiffSummaries: ReadonlyArray<TurnDiffSummary>;
  messages: ReadonlyArray<TimelineDiffMessage>;
}): Map<MessageId, TurnDiffSummary> {
  const byMessageId = new Map<MessageId, TurnDiffSummary>();
  if (input.turnDiffSummaries.length === 0) return byMessageId;

  const summaryByTurnId = new Map<string, TurnDiffSummary>();
  for (const summary of input.turnDiffSummaries) {
    summaryByTurnId.set(summary.turnId, summary);
  }

  const messageIndexByTurnId = new Map<string, number>();
  for (let index = 0; index < input.messages.length; index += 1) {
    const message = input.messages[index]!;
    if (message.role !== "assistant" || !message.turnId) continue;
    messageIndexByTurnId.set(message.turnId, index);
  }

  for (const [turnId, summary] of summaryByTurnId) {
    const anchorIndex = messageIndexByTurnId.get(turnId);
    if (anchorIndex === undefined) continue;
    let terminalAssistantMessageId: MessageId | null = null;
    for (let index = anchorIndex; index < input.messages.length; index += 1) {
      const message = input.messages[index]!;
      if (index > anchorIndex && message.role === "user") break;
      if (message.role === "assistant") {
        terminalAssistantMessageId = message.id;
      }
    }
    if (!terminalAssistantMessageId) continue;

    byMessageId.set(
      terminalAssistantMessageId,
      mergeTurnDiffSummaries(byMessageId.get(terminalAssistantMessageId), summary),
    );
  }
  return byMessageId;
}

// Keeps multi-turn provider responses from losing earlier "Files changed" rows
// when several turn-diff summaries anchor to the same final assistant message.
function mergeTurnDiffSummaries(
  existing: TurnDiffSummary | undefined,
  next: TurnDiffSummary,
): TurnDiffSummary {
  const checkpointTurnCountsFor = (summary: TurnDiffSummary): number[] => {
    if (
      summary.files.length === 0 ||
      summary.status === "missing" ||
      summary.status === "error" ||
      summary.checkpointRef === undefined ||
      summary.checkpointRef.startsWith("provider-diff:")
    ) {
      return [];
    }
    return (
      summary.checkpointTurnCounts ??
      (summary.checkpointTurnCount === undefined ? [] : [summary.checkpointTurnCount])
    );
  };
  if (!existing) {
    const checkpointTurnCounts = checkpointTurnCountsFor(next);
    return { ...next, checkpointTurnCounts };
  }

  const filesByPath = new Map(existing.files.map((file) => [file.path, file]));
  for (const file of next.files) {
    filesByPath.set(file.path, file);
  }
  const checkpointTurnCounts = new Set([
    ...checkpointTurnCountsFor(existing),
    ...checkpointTurnCountsFor(next),
  ]);
  const undoMetadata =
    checkpointTurnCountsFor(next).length > 0
      ? next
      : checkpointTurnCountsFor(existing).length > 0
        ? existing
        : next;
  const allDisplayedFilesUndoable = [existing, next].every(
    (summary) => summary.files.length === 0 || checkpointTurnCountsFor(summary).length > 0,
  );

  return {
    ...next,
    files: [...filesByPath.values()],
    checkpointRef: undoMetadata.checkpointRef,
    status: undoMetadata.status,
    checkpointTurnCount: undoMetadata.checkpointTurnCount,
    checkpointTurnCounts: allDisplayedFilesUndoable
      ? [...checkpointTurnCounts].toSorted((left, right) => left - right)
      : [],
  };
}

export function deriveTerminalAssistantMessageIds(
  messages: ReadonlyArray<TimelineDurationMessage>,
): Set<string> {
  const terminalAssistantMessageIds = new Set<string>();
  let latestAssistantMessageId: string | null = null;

  for (const message of messages) {
    if (message.role !== "assistant") {
      if (latestAssistantMessageId) {
        terminalAssistantMessageIds.add(latestAssistantMessageId);
        latestAssistantMessageId = null;
      }
      continue;
    }
    latestAssistantMessageId = message.id;
  }

  if (latestAssistantMessageId) {
    terminalAssistantMessageIds.add(latestAssistantMessageId);
  }

  return terminalAssistantMessageIds;
}

function isOutsideTurnProcessWork(entry: WorkLogEntry): boolean {
  return Boolean(
    entry.automation ||
    entry.harnessosThreadCreation ||
    isVisibleGeneratedImageEntry(entry) ||
    entry.attachmentTransferFailures ||
    entry.engineWebSurface?.status === "waiting-for-user",
  );
}

// A tool/process event after an assistant segment invalidates that provisional
// tail immediately. A later assistant segment becomes the new terminal result.
// Explicit result receipts do not invalidate an already-final answer.
function deriveTerminalAssistantMessageIdsFromTimeline(
  entries: ReadonlyArray<TimelineEntry>,
): Set<string> {
  const result = new Set<string>();
  let candidate: string | null = null;
  const commit = () => {
    if (candidate) result.add(candidate);
    candidate = null;
  };

  for (const entry of entries) {
    if (entry.kind === "message") {
      if (entry.message.role === "assistant") {
        candidate = entry.message.id;
      } else {
        commit();
      }
      continue;
    }
    if (entry.kind === "work" && !isOutsideTurnProcessWork(entry.entry)) {
      candidate = null;
    }
  }
  commit();
  return result;
}

// Derives one stable process row per user-response boundary. Process items keep
// canonical Timeline order inside that row; terminal assistant/result rows stay
// outside and follow it. No text/tool-name heuristics participate in grouping.
export function deriveMessagesTimelineRows(input: {
  timelineEntries: ReadonlyArray<TimelineEntry>;
  isWorking: boolean;
  worktreeSetup: WorktreeSetupSnapshot | null;
  worktreeSetupOpen: boolean;
  activeTurnInProgress?: boolean;
  activeTurnId?: TurnId | null | undefined;
  activeTurnStartedAt: string | null;
  turnProcessPhase?: TurnProcessPhase | undefined;
  turnDiffSummaryByAssistantMessageId: ReadonlyMap<MessageId, TurnDiffSummary>;
  revertTurnCountByUserMessageId: ReadonlyMap<MessageId, number>;
  turnProvenance?: ReadonlyArray<OrchestrationTurnProvenance>;
}): MessagesTimelineRow[] {
  const timelineMessages = input.timelineEntries.flatMap((entry) =>
    entry.kind === "message" ? [entry.message] : [],
  );
  const durationStartByMessageId = computeMessageDurationStart(timelineMessages);
  const terminalAssistantMessageIds = deriveTerminalAssistantMessageIdsFromTimeline(
    input.timelineEntries,
  );
  const configuredPhase =
    input.turnProcessPhase ??
    (input.isWorking
      ? ({
          kind: "running",
          turnId: input.activeTurnId ?? null,
          startedAt: input.activeTurnStartedAt,
        } satisfies TurnProcessPhase)
      : ({ kind: "settled" } satisfies TurnProcessPhase));
  const provenanceByPendingMessageId = new Map(
    (input.turnProvenance ?? []).map((entry) => [entry.pendingMessageId, entry] as const),
  );
  const provenanceByTurnId = new Map(
    (input.turnProvenance ?? []).flatMap((entry) =>
      entry.turnId === null ? [] : ([[entry.turnId, entry]] as const),
    ),
  );

  type ResponseSegment = {
    boundaryId: string;
    boundaryCreatedAt: string | null;
    entries: TimelineEntry[];
  };
  type TimelinePart =
    | {
        kind: "boundary-message";
        entry: Extract<TimelineEntry, { kind: "message" }>;
      }
    | { kind: "segment"; segment: ResponseSegment };

  const parts: TimelinePart[] = [];
  let currentSegment: ResponseSegment | null = null;
  const flushSegment = () => {
    if (!currentSegment) return;
    parts.push({ kind: "segment", segment: currentSegment });
    currentSegment = null;
  };

  for (const entry of input.timelineEntries) {
    if (entry.kind === "message" && entry.message.role === "user") {
      flushSegment();
      parts.push({ kind: "boundary-message", entry });
      currentSegment = {
        boundaryId: entry.message.id,
        boundaryCreatedAt: entry.message.createdAt,
        entries: [],
      };
      continue;
    }
    currentSegment ??= {
      boundaryId: "root",
      boundaryCreatedAt: configuredPhase.kind === "settled" ? null : configuredPhase.startedAt,
      entries: [],
    };
    currentSegment.entries.push(entry);
  }
  flushSegment();

  // A fresh active response has no Timeline entries yet. Retain its user
  // boundary so the single live status can appear inside Working for.
  if (configuredPhase.kind !== "settled" && !parts.some((part) => part.kind === "segment")) {
    parts.push({
      kind: "segment",
      segment: {
        boundaryId: "root",
        boundaryCreatedAt: configuredPhase.startedAt,
        entries: [],
      },
    });
  }

  const segments = parts.flatMap((part) => (part.kind === "segment" ? [part.segment] : []));
  const phaseTurnId = configuredPhase.kind === "settled" ? null : configuredPhase.turnId;
  let activeSegment = configuredPhase.kind === "settled" ? null : (segments.at(-1) ?? null);
  if (phaseTurnId) {
    const matchingSegment = segments.findLast((segment) =>
      segment.entries.some((entry) => {
        if (entry.kind === "work") return entry.entry.turnId === phaseTurnId;
        if (entry.kind === "message") return entry.message.turnId === phaseTurnId;
        return false;
      }),
    );
    const tailHasNoTurnIdentity =
      activeSegment?.entries.every((entry) => {
        if (entry.kind === "work") return entry.entry.turnId == null;
        if (entry.kind === "message") return entry.message.turnId == null;
        return true;
      }) ?? false;
    activeSegment = matchingSegment ?? (tailHasNoTurnIdentity ? activeSegment : null);
  }

  const makeMessageRow = (
    entry: Extract<TimelineEntry, { kind: "message" }>,
    options?: {
      inProgress?: boolean;
      turnWorkEntries?: WorkLogEntry[];
      turnDiffSummary?: TurnDiffSummary;
    },
  ): Extract<MessagesTimelineRow, { kind: "message" }> => {
    const message = entry.message;
    return {
      kind: "message",
      id: entry.id,
      createdAt: entry.createdAt,
      message,
      ...(options?.turnWorkEntries?.length ? { turnWorkEntries: options.turnWorkEntries } : {}),
      durationStart: durationStartByMessageId.get(message.id) ?? message.createdAt,
      showAssistantCopyButton:
        message.role === "assistant" && terminalAssistantMessageIds.has(message.id),
      assistantCopyStreaming: message.streaming || options?.inProgress === true,
      ...(entry.assistantCopyText !== undefined
        ? { assistantCopyText: entry.assistantCopyText }
        : {}),
      assistantTurnInProgress: options?.inProgress === true,
      assistantTurnDiffSummary:
        message.role === "assistant"
          ? (options?.turnDiffSummary ?? input.turnDiffSummaryByAssistantMessageId.get(message.id))
          : undefined,
      revertTurnCount:
        message.role === "user" ? input.revertTurnCountByUserMessageId.get(message.id) : undefined,
    };
  };

  const nextRows: MessagesTimelineRow[] = [];
  for (const part of parts) {
    if (part.kind === "boundary-message") {
      nextRows.push(makeMessageRow(part.entry));
      continue;
    }

    const segment = part.segment;
    const segmentIsActive = segment === activeSegment && configuredPhase.kind !== "settled";
    const segmentPhase = segmentIsActive ? configuredPhase.kind : "settled";
    const processItems: TurnProcessItem[] = [];
    const resultRows: MessagesTimelineRow[] = [];
    const segmentRows: MessagesTimelineRow[] = [];
    const allWorkEntries: WorkLogEntry[] = [];
    let mergedTurnDiffSummary: TurnDiffSummary | undefined;
    let terminalMessageRow: Extract<MessagesTimelineRow, { kind: "message" }> | null = null;
    let latestTimestamp = segment.boundaryCreatedAt;

    const appendResultWork = (entry: WorkLogEntry) => {
      const previous = resultRows.at(-1);
      if (previous?.kind === "work") {
        previous.groupedEntries.push(entry);
      } else {
        resultRows.push({
          kind: "work",
          id: `result:${entry.id}`,
          createdAt: entry.createdAt,
          groupedEntries: [entry],
        });
      }
    };

    for (const entry of segment.entries) {
      latestTimestamp = entry.createdAt;
      if (entry.kind === "work") {
        allWorkEntries.push(entry.entry);
        if (entry.entry.harnessosThreadCreation) {
          // The structured creation recap is a final result rendered beside
          // the terminal answer; its milestone is metadata, not a second row.
        } else if (isOutsideTurnProcessWork(entry.entry)) {
          appendResultWork(entry.entry);
        } else {
          processItems.push({
            kind: "work",
            id: entry.entry.id,
            entry: entry.entry,
          });
        }
        continue;
      }
      if (entry.kind === "proposed-plan") {
        resultRows.push({
          kind: "proposed-plan",
          id: entry.id,
          createdAt: entry.createdAt,
          proposedPlan: entry.proposedPlan,
        });
        continue;
      }

      const message = entry.message;
      if (message.role === "assistant" && !terminalAssistantMessageIds.has(message.id)) {
        processItems.push({ kind: "narration", id: message.id, message });
        const summary = input.turnDiffSummaryByAssistantMessageId.get(message.id);
        if (summary) {
          mergedTurnDiffSummary = mergedTurnDiffSummary
            ? mergeTurnDiffSummaries(mergedTurnDiffSummary, summary)
            : summary;
        }
        continue;
      }

      const row = makeMessageRow(entry, {
        inProgress: segmentIsActive,
        turnWorkEntries: allWorkEntries,
      });
      if (message.role === "assistant") {
        const summary = input.turnDiffSummaryByAssistantMessageId.get(message.id);
        if (summary) {
          mergedTurnDiffSummary = mergedTurnDiffSummary
            ? mergeTurnDiffSummaries(mergedTurnDiffSummary, summary)
            : summary;
        }
        terminalMessageRow = row;
      }
      resultRows.push(row);
    }

    if (terminalMessageRow) {
      terminalMessageRow.turnWorkEntries = allWorkEntries;
      terminalMessageRow.assistantTurnDiffSummary = mergedTurnDiffSummary;
    }

    const firstProcessItem = processItems.at(0);
    const firstProcessAt =
      firstProcessItem?.kind === "work"
        ? firstProcessItem.entry.createdAt
        : firstProcessItem?.message.createdAt;
    const startedAt =
      segmentIsActive && configuredPhase.startedAt
        ? configuredPhase.startedAt
        : (segment.boundaryCreatedAt ?? firstProcessAt ?? latestTimestamp);
    const endedAt =
      segmentIsActive && configuredPhase.kind === "waiting-for-user"
        ? configuredPhase.waitingAt
        : (terminalMessageRow?.message.completedAt ?? latestTimestamp);
    const shouldRenderProcess =
      processItems.length > 0 ||
      (segmentIsActive && configuredPhase.kind === "running" && !input.worktreeSetupOpen);

    if (shouldRenderProcess && startedAt) {
      const lastProcessTurnId = processItems
        .toReversed()
        .map((item) => (item.kind === "work" ? item.entry.turnId : item.message.turnId))
        .find((turnId): turnId is TurnId => turnId != null);
      segmentRows.push({
        kind: "turn-process",
        id: `turn-process:${segment.boundaryId}`,
        createdAt: startedAt,
        turnId: segmentIsActive
          ? configuredPhase.turnId
          : (terminalMessageRow?.message.turnId ?? lastProcessTurnId ?? null),
        phase: segmentPhase,
        items: processItems,
        elapsedMs: endedAt ? elapsedMilliseconds(startedAt, endedAt) : null,
        ...(mergedTurnDiffSummary ? { turnDiffSummary: mergedTurnDiffSummary } : {}),
      });
    }
    segmentRows.push(...resultRows);

    const assistantRows = segmentRows.filter(
      (row) =>
        row.kind === "turn-process" ||
        row.kind === "work" ||
        row.kind === "proposed-plan" ||
        (row.kind === "message" && row.message.role === "assistant"),
    );
    const assistantTurnId =
      terminalMessageRow?.message.turnId ??
      assistantRows
        .toReversed()
        .map((row) => {
          if (row.kind === "turn-process") return row.turnId;
          if (row.kind === "message") return row.message.turnId;
          if (row.kind === "proposed-plan") return row.proposedPlan.turnId;
          if (row.kind === "work") {
            return row.groupedEntries.findLast((entry) => entry.turnId !== null)?.turnId ?? null;
          }
          return null;
        })
        .find((turnId): turnId is TurnId => turnId !== null && turnId !== undefined) ??
      null;
    const provenance =
      provenanceByPendingMessageId.get(segment.boundaryId as MessageId) ??
      (assistantTurnId === null ? null : (provenanceByTurnId.get(assistantTurnId) ?? null));
    const firstAssistantRow = assistantRows[0];
    const firstAssistantRowCreatedAt =
      firstAssistantRow && firstAssistantRow.kind !== "worktree-setup"
        ? firstAssistantRow.createdAt
        : undefined;
    const identityTimestamp = terminalMessageRow?.message.createdAt ?? firstAssistantRowCreatedAt;
    if (assistantRows.length > 0 && identityTimestamp) {
      const firstAssistantRow = assistantRows[0]!;
      for (const row of assistantRows) {
        row.assistantTurnLayout = {
          responseId: segment.boundaryId,
          showIdentity: row === firstAssistantRow,
          provenance,
          timestamp: identityTimestamp,
        };
      }
    }
    nextRows.push(...segmentRows);
  }

  if (input.worktreeSetup) {
    nextRows.push({
      kind: "worktree-setup",
      id: "worktree-setup-row",
      steps: input.worktreeSetup.steps,
      open: input.worktreeSetupOpen,
    });
  }

  return nextRows;
}

// Reuses stable row references so streaming updates only invalidate rows whose
// visible content actually changed.
export function computeStableMessagesTimelineRows(
  rows: MessagesTimelineRow[],
  previous: StableMessagesTimelineRowsState,
): StableMessagesTimelineRowsState {
  const next = new Map<string, MessagesTimelineRow>();
  let anyChanged = rows.length !== previous.byId.size;

  const result = rows.map((row, index) => {
    const prevRow = previous.byId.get(row.id);
    const nextRow = prevRow && isRowUnchanged(prevRow, row) ? prevRow : row;
    next.set(row.id, nextRow);
    if (!anyChanged && previous.result[index] !== nextRow) {
      anyChanged = true;
    }
    return nextRow;
  });

  return anyChanged ? { byId: next, result } : previous;
}

function stringArraysEqual(
  left: ReadonlyArray<string> | undefined,
  right: ReadonlyArray<string> | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function workLogSubagentActionsEqual(
  a: WorkLogEntry["subagentAction"],
  b: WorkLogEntry["subagentAction"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.tool === b.tool &&
    a.status === b.status &&
    a.summaryText === b.summaryText &&
    a.model === b.model &&
    a.prompt === b.prompt
  );
}

function workLogSubagentsEqual(
  left: WorkLogEntry["subagents"],
  right: WorkLogEntry["subagents"],
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  if (left.length !== right.length) return false;
  return left.every((a, index) => {
    const b = right[index];
    return (
      b !== undefined &&
      a.threadId === b.threadId &&
      a.providerThreadId === b.providerThreadId &&
      a.resolvedThreadId === b.resolvedThreadId &&
      a.agentId === b.agentId &&
      a.nickname === b.nickname &&
      a.role === b.role &&
      a.model === b.model &&
      a.prompt === b.prompt &&
      a.rawStatus === b.rawStatus &&
      a.latestUpdate === b.latestUpdate &&
      a.title === b.title &&
      a.statusLabel === b.statusLabel &&
      a.isActive === b.isActive
    );
  });
}

// Automation card fields are visible row content, so stale equality would freeze the transcript UI.
function workLogAutomationsEqual(a: WorkLogEntry["automation"], b: WorkLogEntry["automation"]) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.cadenceLabel === b.cadenceLabel &&
    a.proposalState === b.proposalState
  );
}

function workLogOmniMindThreadCreationsEqual(
  a: WorkLogEntry["harnessosThreadCreation"],
  b: WorkLogEntry["harnessosThreadCreation"],
) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (
    a.operationId !== b.operationId ||
    a.requestedCount !== b.requestedCount ||
    a.createdCount !== b.createdCount ||
    a.threads.length !== b.threads.length
  ) {
    return false;
  }
  return a.threads.every((thread, index) => {
    const other = b.threads[index];
    return (
      other !== undefined &&
      thread.threadId === other.threadId &&
      thread.title === other.title &&
      thread.provider === other.provider &&
      thread.model === other.model &&
      thread.environment === other.environment &&
      thread.status === other.status
    );
  });
}

function workLogToolOutputsEqual(
  a: NonNullable<WorkLogEntry["toolDetails"]>["output"],
  b: NonNullable<WorkLogEntry["toolDetails"]>["output"],
) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.output === b.output &&
    a.stdout === b.stdout &&
    a.stderr === b.stderr &&
    a.exitCode === b.exitCode &&
    a.truncated === b.truncated
  );
}

function workLogToolEditsEqual(
  left: NonNullable<WorkLogEntry["toolDetails"]>["edits"],
  right: NonNullable<WorkLogEntry["toolDetails"]>["edits"],
) {
  if (left === right) return true;
  if (!left || !right) return false;
  if (left.length !== right.length) return false;
  return left.every((edit, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      edit.path === other.path &&
      edit.oldText === other.oldText &&
      edit.newText === other.newText
    );
  });
}

function workLogToolDetailsEqual(a: WorkLogEntry["toolDetails"], b: WorkLogEntry["toolDetails"]) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.kind === b.kind &&
    a.title === b.title &&
    a.command === b.command &&
    a.diff === b.diff &&
    a.content === b.content &&
    stringArraysEqual(a.files, b.files) &&
    workLogToolOutputsEqual(a.output, b.output) &&
    workLogToolEditsEqual(a.edits, b.edits)
  );
}

function workLogLiveActivitiesEqual(
  a: WorkLogEntry["liveActivity"],
  b: WorkLogEntry["liveActivity"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.state === b.state &&
    a.label === b.label &&
    a.startedAt === b.startedAt &&
    a.lastActivityAt === b.lastActivityAt &&
    a.detail === b.detail &&
    a.progress === b.progress &&
    a.elapsedSeconds === b.elapsedSeconds
  );
}

function workLogReasoningEntriesEqual(
  left: WorkLogEntry["reasoningEntries"],
  right: WorkLogEntry["reasoningEntries"],
): boolean {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((entry, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      entry.id === other.id &&
      entry.text === other.text &&
      entry.truncated === other.truncated
    );
  });
}

function workLogUserInputInteractionsEqual(
  a: WorkLogEntry["userInputInteraction"],
  b: WorkLogEntry["userInputInteraction"],
): boolean {
  if (a === b) return true;
  if (!a || !b || a.requestId !== b.requestId || a.questions.length !== b.questions.length) {
    return false;
  }
  return a.questions.every((question, index) => {
    const other = b.questions[index];
    if (
      !other ||
      question.id !== other.id ||
      question.prompt !== other.prompt ||
      question.kind !== other.kind ||
      !stringArraysEqual(question.optionLabels, other.optionLabels)
    ) {
      return false;
    }
    if (question.answer === other.answer) return true;
    if (!question.answer || !other.answer) return false;
    return (
      stringArraysEqual(question.answer.selectedOptionLabels, other.answer.selectedOptionLabels) &&
      question.answer.customText === other.answer.customText
    );
  });
}

function workLogEntryContentEqual(a: WorkLogEntry, b: WorkLogEntry): boolean {
  return (
    a.id === b.id &&
    a.createdAt === b.createdAt &&
    a.sequence === b.sequence &&
    a.turnId === b.turnId &&
    a.label === b.label &&
    a.detail === b.detail &&
    a.toolTitle === b.toolTitle &&
    a.command === b.command &&
    a.rawCommand === b.rawCommand &&
    a.preview === b.preview &&
    a.tone === b.tone &&
    a.itemType === b.itemType &&
    a.requestKind === b.requestKind &&
    a.activityKind === b.activityKind &&
    a.toolName === b.toolName &&
    a.toolCallId === b.toolCallId &&
    a.toolStatus === b.toolStatus &&
    a.userInputSettlementStatus === b.userInputSettlementStatus &&
    workLogUserInputInteractionsEqual(a.userInputInteraction, b.userInputInteraction) &&
    a.askUserProvenanceUnavailable === b.askUserProvenanceUnavailable &&
    workLogReasoningEntriesEqual(a.reasoningEntries, b.reasoningEntries) &&
    stringArraysEqual(a.changedFiles, b.changedFiles) &&
    workLogSubagentActionsEqual(a.subagentAction, b.subagentAction) &&
    workLogSubagentsEqual(a.subagents, b.subagents) &&
    workLogAutomationsEqual(a.automation, b.automation) &&
    workLogOmniMindThreadCreationsEqual(a.harnessosThreadCreation, b.harnessosThreadCreation) &&
    workLogLiveActivitiesEqual(a.liveActivity, b.liveActivity) &&
    workLogToolDetailsEqual(a.toolDetails, b.toolDetails)
  );
}

function workLogEntryArraysEqual(
  left: ReadonlyArray<WorkLogEntry> | undefined,
  right: ReadonlyArray<WorkLogEntry> | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  if (left.length !== right.length) return false;
  return left.every((entry, index) => workLogEntryContentEqual(entry, right[index]!));
}

function turnProcessItemsEqual(
  left: ReadonlyArray<TurnProcessItem> | undefined,
  right: ReadonlyArray<TurnProcessItem> | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  if (left.length !== right.length) return false;
  return left.every((item, index) => {
    const other = right[index]!;
    if (item.kind !== other.kind || item.id !== other.id) return false;
    if (item.kind === "work" && other.kind === "work") {
      return workLogEntryContentEqual(item.entry, other.entry);
    }
    if (item.kind === "narration" && other.kind === "narration") {
      return item.message === other.message;
    }
    return false;
  });
}

function isRowUnchanged(a: MessagesTimelineRow, b: MessagesTimelineRow): boolean {
  if (a.kind !== b.kind || a.id !== b.id) return false;
  if (!assistantTurnLayoutsEqual(a.assistantTurnLayout, b.assistantTurnLayout)) return false;

  switch (a.kind) {
    case "turn-process": {
      const bp = b as typeof a;
      return (
        a.createdAt === bp.createdAt &&
        a.turnId === bp.turnId &&
        a.phase === bp.phase &&
        a.elapsedMs === bp.elapsedMs &&
        a.turnDiffSummary === bp.turnDiffSummary &&
        turnProcessItemsEqual(a.items, bp.items)
      );
    }

    case "worktree-setup": {
      const bw = b as typeof a;
      return (
        a.open === bw.open &&
        a.steps.length === bw.steps.length &&
        a.steps.every((step, index) => {
          const other = bw.steps[index]!;
          return step.id === other.id && step.status === other.status && step.label === other.label;
        })
      );
    }

    case "proposed-plan":
      return a.proposedPlan === (b as typeof a).proposedPlan;

    case "work":
      return (
        a.createdAt === (b as typeof a).createdAt &&
        workLogEntryArraysEqual(a.groupedEntries, (b as typeof a).groupedEntries)
      );

    case "message": {
      const bm = b as typeof a;
      return (
        a.message === bm.message &&
        workLogEntryArraysEqual(a.turnWorkEntries, bm.turnWorkEntries) &&
        a.durationStart === bm.durationStart &&
        a.showAssistantCopyButton === bm.showAssistantCopyButton &&
        a.assistantCopyStreaming === bm.assistantCopyStreaming &&
        a.assistantCopyText === bm.assistantCopyText &&
        a.assistantTurnInProgress === bm.assistantTurnInProgress &&
        a.assistantTurnDiffSummary === bm.assistantTurnDiffSummary &&
        a.revertTurnCount === bm.revertTurnCount
      );
    }
  }
}

function assistantTurnLayoutsEqual(
  left: AssistantTurnLayout | undefined,
  right: AssistantTurnLayout | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    left.responseId === right.responseId &&
    left.showIdentity === right.showIdentity &&
    left.provenance === right.provenance &&
    left.timestamp === right.timestamp
  );
}
