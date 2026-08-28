import {
  isToolLifecycleItemType,
  MessageId,
  type OrchestrationLatestTurnState,
  type OrchestrationThreadActivity,
  EngineTurnStartFailureReason,
  type EngineTurnStartFailureReason as EngineTurnStartFailureReasonValue,
  EngineKind,
  type ToolLifecycleItemType,
  type TurnId,
} from "@harnessos/contracts";
import { isPotentiallyVisibleProviderRuntimeActivity } from "@harnessos/shared/providerActivityVisibility";
import { Schema } from "effect";
import {
  decodeSubagentAgentStates,
  extractSubagentIdentityHints,
  decodeSubagentReceiverAgents,
  decodeSubagentReceiverThreadIds,
} from "@harnessos/shared/subagents";
import {
  approvalRequestKindFromRequestType,
  type ApprovalRequestKind,
} from "@harnessos/shared/threadSummary";
import { summarizeToolRawOutput } from "@harnessos/shared/toolOutputSummary";
import { pluralize } from "@harnessos/shared/text";
import {
  deriveReadableToolTitle,
  deriveHarnessOSMcpToolTitle,
  isGenericToolTitle,
  normalizeCompactToolLabel,
  normalizeToolTextForComparison,
  type HarnessOSMcpToolStatus,
} from "./lib/toolCallLabel";
import {
  deriveToolInvocationPreview,
  deriveWorkLogToolDetails,
  mergeWorkLogToolDetails,
  type WorkLogToolDetails,
} from "./lib/toolCallDetails";
import { stripProposedPlanBlocksFromText } from "./proposedPlan";

import type { ChatMessage, ProposedPlan } from "./types";

export type WorkLogRequestKind = ApprovalRequestKind;

// Mirrors CHECKPOINT_REVERT_FAILED_ACTIVITY_KIND in
// apps/server/src/orchestration/commandInvariants.ts, which the web app cannot
// import.
const CHECKPOINT_REVERT_FAILED_ACTIVITY_KIND = "checkpoint.revert.failed";

export interface WorkLogEntry {
  id: string;
  createdAt: string;
  sequence?: number;
  turnId?: TurnId | null;
  label: string;
  detail?: string;
  command?: string;
  rawCommand?: string;
  preview?: string;
  changedFiles?: ReadonlyArray<string>;
  tone: "thinking" | "tool" | "info" | "error";
  toolTitle?: string;
  toolName?: string;
  toolCallId?: string;
  toolStatus?: HarnessOSMcpToolStatus;
  liveActivity?: WorkLogLiveActivity;
  toolDetails?: WorkLogToolDetails;
  itemType?: ToolLifecycleItemType;
  requestKind?: WorkLogRequestKind;
  subagents?: ReadonlyArray<WorkLogSubagent>;
  subagentAction?: WorkLogSubagentAction;
  automation?: WorkLogAutomation;
  harnessosThreadCreation?: WorkLogHarnessOSThreadCreation;
  engineWebSurface?: {
    status: "waiting-for-user" | "unavailable" | "completed";
    provenance: "engine-native";
    presentation: "harnessos-browser";
    surfaceId?: string;
  };
  // Source activity kind, kept so the timeline can pick a kind-specific icon
  // (e.g. user-input.requested -> canonical interaction glyph) instead of the generic
  // tone fallback. Same rationale as `toolName` below.
  activityKind?: OrchestrationThreadActivity["kind"];
  userInputSettlementStatus?:
    | "answered"
    | "cancelled"
    | "aborted"
    | "timed_out"
    | "unavailable"
    | "stale";
  /**
   * Read-only Timeline projection assembled from persisted request + settlement
   * facts. It never points at the Composer draft and never changes the payload
   * returned to the Engine/model.
   */
  userInputInteraction?: WorkLogUserInputInteraction;
  askUserProvenanceUnavailable?: boolean;
  failureReason?: EngineTurnStartFailureReasonValue;
  quitResumeFailureReason?:
    | "workspace-missing"
    | "workspace-unavailable"
    | "project-unavailable"
    | "exact-binding-unavailable";
  // Engine-native event type carried through the activity payload (e.g.
  // "background_tasks_changed") so the timeline can pick a specific icon.
  nativeEventType?: string;
  taskListProgress?: {
    completed: number;
    total: number;
  };
  // Public reasoning text grouped for one inline Timeline disclosure. Each
  // paragraph keeps its source event id and engine-authored text; this is a
  // presentation projection only, never a second event model.
  reasoningEntries?: ReadonlyArray<{
    id: string;
    text: string;
    truncated?: boolean;
  }>;
  reasoningDetailTruncated?: boolean;
  skillDelivery?: {
    skillName: string;
    mode: "inline" | "reference";
    failureReason?: "unreadable" | "oversized" | "budget_exceeded";
  };
  attachmentTransferFailures?: ReadonlyArray<{
    targetMessageId: string;
    name: string;
    attachmentIndex: number;
    reason: "missing" | "unreadable" | "limit" | "clone-failed";
  }>;
}

export interface WorkLogUserInputAnswer {
  selectedOptionLabels: ReadonlyArray<string>;
  customText?: string;
}

export interface WorkLogUserInputQuestion {
  id: string;
  prompt: string;
  kind: "choice" | "text";
  optionLabels: ReadonlyArray<string>;
  answer?: WorkLogUserInputAnswer;
}

export interface WorkLogUserInputInteraction {
  requestId: string;
  questions: ReadonlyArray<WorkLogUserInputQuestion>;
}

export type WorkLogLiveActivityState =
  | "starting"
  | "thinking"
  | "running_tool"
  | "waiting"
  | "streaming"
  | "completed"
  | "failed"
  | "cancelled";

export interface WorkLogLiveActivity {
  state: WorkLogLiveActivityState;
  label: string;
  startedAt?: string;
  lastActivityAt: string;
  detail?: string;
  progress?: number;
  elapsedSeconds?: number;
}

// Created-automation rows render as a dedicated card (icon + name + cadence + Open)
// instead of a plain tool-call line, so carry just the fields that card needs.
export interface WorkLogAutomation {
  id: string;
  name: string;
  cadenceLabel: string;
  proposalState?: "pending" | "accepted" | "dismissed";
}

export interface WorkLogHarnessOSCreatedThread {
  threadId: string;
  title: string;
  engine: EngineKind;
  model: string;
  environment: "local" | "worktree";
  status: string;
}

export interface WorkLogHarnessOSThreadCreation {
  operationId: string;
  requestedCount: number;
  createdCount: number;
  threads: ReadonlyArray<WorkLogHarnessOSCreatedThread>;
}

export interface WorkLogSubagent {
  threadId: string;
  nativeThreadId?: string | undefined;
  resolvedThreadId?: string | undefined;
  agentId?: string | undefined;
  nickname?: string | undefined;
  role?: string | undefined;
  model?: string | undefined;
  effort?: string | undefined;
  background?: boolean | undefined;
  prompt?: string | undefined;
  rawStatus?: string | undefined;
  latestUpdate?: string | undefined;
  title?: string | undefined;
  statusLabel?: string | undefined;
  isActive?: boolean | undefined;
}

export interface WorkLogSubagentAction {
  tool: string;
  status: string;
  summaryText: string;
  model?: string | undefined;
  prompt?: string | undefined;
}

interface DerivedWorkLogEntry extends WorkLogEntry {
  activityKind: OrchestrationThreadActivity["kind"];
  collapseKey?: string;
  collapseCommand?: string;
  toolName?: string;
  runtimeWarningRepeatCount?: number;
  runtimeWarningMessage?: string;
  suppressStandaloneCommandStart?: boolean;
  taskListSnapshotValid?: boolean;
  userInputCorrelationKey?: string;
  userInputResolvedAnswers?: unknown;
}

export function isFileChangeWorkLogEntry(
  workEntry: Pick<WorkLogEntry, "itemType" | "requestKind">,
): boolean {
  return workEntry.requestKind === "file-change" || workEntry.itemType === "file_change";
}

// Composer live chrome should count actual edit work, not bare file-change approvals.
export function isProviderFileEditWorkLogEntry(
  workEntry: Pick<WorkLogEntry, "changedFiles" | "itemType" | "requestKind">,
): boolean {
  if (workEntry.itemType === "file_change") {
    return true;
  }
  return workEntry.requestKind === "file-change" && (workEntry.changedFiles?.length ?? 0) > 0;
}

export type TimelineEntry =
  | {
      id: string;
      kind: "message";
      createdAt: string;
      sequence?: number;
      message: ChatMessage;
      assistantCopyText?: string;
    }
  | {
      id: string;
      kind: "proposed-plan";
      createdAt: string;
      proposedPlan: ProposedPlan;
    }
  | {
      id: string;
      kind: "work";
      createdAt: string;
      sequence?: number;
      entry: WorkLogEntry;
    };

const orderedActivitiesCache = new WeakMap<
  ReadonlyArray<OrchestrationThreadActivity>,
  ReadonlyArray<OrchestrationThreadActivity>
>();

function isActivityOrderStable(activities: ReadonlyArray<OrchestrationThreadActivity>): boolean {
  for (let index = 1; index < activities.length; index += 1) {
    if (compareActivitiesByOrder(activities[index - 1]!, activities[index]!) > 0) {
      return false;
    }
  }
  return true;
}

// Thread activity arrays are immutable store values and most call sites need the
// same order; cache it so chat startup does not sort the same array repeatedly.
export function orderedActivities(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
): ReadonlyArray<OrchestrationThreadActivity> {
  const cached = orderedActivitiesCache.get(activities);
  if (cached) {
    return cached;
  }

  const ordered = isActivityOrderStable(activities)
    ? activities
    : activities.toSorted(compareActivitiesByOrder);
  orderedActivitiesCache.set(activities, ordered);
  return ordered;
}

// Routed subagent work (Claude's agent fan-out) belongs to the composer subagent
// strip and to the child threads themselves — the transcript never renders a
// subagent roster. The check runs on derived entries rather than raw activities
// because engines stream the tool call first and attach receiver metadata on a
// later lifecycle update that merges into the same entry. Generic OpenCode task
// calls carry no receiver metadata and keep their ordinary chat row.
export function isRoutedSubagentWorkEntry(entry: Pick<WorkLogEntry, "itemType" | "subagents">) {
  return entry.itemType === "collab_agent_tool_call" && (entry.subagents?.length ?? 0) > 0;
}

// Returns the same array when nothing is routed so memoized consumers keep their
// reference identity on the common (no subagents) path.
export function omitRoutedSubagentWorkEntries<Entry extends WorkLogEntry>(
  entries: ReadonlyArray<Entry>,
): ReadonlyArray<Entry> {
  const kept = entries.filter((entry) => !isRoutedSubagentWorkEntry(entry));
  return kept.length === entries.length ? entries : kept;
}

export function deriveWorkLogEntries(
  activities: ReadonlyArray<OrchestrationThreadActivity>,
  latestTurnId: TurnId | undefined,
  options: {
    visibleTurnIds?: ReadonlySet<TurnId | string>;
    activeTurnId?: TurnId | null;
    activeTurnStartedAt?: string | null;
    latestTurnState?: OrchestrationLatestTurnState | null;
    latestTurnCompletedAt?: string | null;
  } = {},
): WorkLogEntry[] {
  const visibleTurnIds = options.visibleTurnIds;
  const ordered = orderedActivities(activities);
  const entries = ordered
    .filter((activity) => shouldKeepActivityForWorkLog(activity, latestTurnId, visibleTurnIds))
    .filter(isPotentiallyVisibleProviderRuntimeActivity)
    .map(toDerivedWorkLogEntry);
  // Strip the derivation-only helpers that exist solely on DerivedWorkLogEntry.
  // `toolName` and `activityKind` are intentionally kept: they are public
  // WorkLogEntry fields that the timeline relies on to pick the right icon (e.g.
  // file-read tools like Claude's `Read` -> search icon, GitHub MCP rows ->
  // GitHub icon, user-input rows -> question / submit glyphs). Stripping
  // `toolName` here previously made those icon checks dead code, leaving the
  // generic wrench.
  return reconcileSettledLiveActivities(
    collapseDerivedWorkLogEntries(coalesceCanonicalUserInputEntries(entries)),
    ordered,
    latestTurnId,
    options,
  )
    .filter((entry) => !isUninformativeCommandStartEntry(entry))
    .map(
      ({
        collapseCommand: _collapseCommand,
        collapseKey: _collapseKey,
        runtimeWarningMessage: _runtimeWarningMessage,
        runtimeWarningRepeatCount: _runtimeWarningRepeatCount,
        suppressStandaloneCommandStart: _suppressStandaloneCommandStart,
        taskListSnapshotValid: _taskListSnapshotValid,
        userInputCorrelationKey: _userInputCorrelationKey,
        userInputResolvedAnswers: _userInputResolvedAnswers,
        ...entry
      }) => entry,
    );
}

function shouldKeepActivityForWorkLog(
  activity: OrchestrationThreadActivity,
  latestTurnId: TurnId | undefined,
  visibleTurnIds: ReadonlySet<TurnId | string> | undefined,
): boolean {
  // Thread-level compaction progress has no engine turn id but should stay visible.
  if (activity.kind === "context-compaction" && activity.turnId === null) {
    return true;
  }

  // Created-automation milestones are thread-scoped and carry no engine turn id;
  // keep them so the transcript card survives once the thread has turn-stamped messages.
  if (activity.kind === "automation.created") {
    return true;
  }

  // Revert failures are the only feedback a failed Undo produces. They can be
  // emitted before any checkpoint exists to anchor them to a turn (or against a
  // turn that the revert itself just rolled out of view), so never let the
  // turn-visibility filter drop them.
  if (activity.kind === CHECKPOINT_REVERT_FAILED_ACTIVITY_KIND) {
    return true;
  }
  if (activity.kind === "chat-to-agent.attachments.partial") {
    return true;
  }

  // An empty set means the transcript has no turn-stamped assistant messages
  // (e.g. engines that never supply turn ids); fall back to the legacy
  // latest-turn filter instead of hiding the whole work log.
  if (visibleTurnIds && visibleTurnIds.size > 0) {
    return activity.turnId !== null && visibleTurnIds.has(activity.turnId);
  }

  return latestTurnId ? activity.turnId === latestTurnId : true;
}

function isUninformativeCommandStartEntry(entry: DerivedWorkLogEntry): boolean {
  return entry.activityKind === "tool.started" && entry.suppressStandaloneCommandStart === true;
}

function extractWorkLogAutomation(
  payload: Record<string, unknown> | null,
): WorkLogAutomation | null {
  if (!payload) {
    return null;
  }
  const id = typeof payload.automationId === "string" ? payload.automationId : null;
  const name = typeof payload.automationName === "string" ? payload.automationName : null;
  if (!id || !name) {
    return null;
  }
  const cadenceLabel = typeof payload.cadenceLabel === "string" ? payload.cadenceLabel : "";
  const proposalState =
    payload.proposalState === "pending" ||
    payload.proposalState === "accepted" ||
    payload.proposalState === "dismissed"
      ? payload.proposalState
      : undefined;
  return {
    id,
    name,
    cadenceLabel,
    ...(proposalState ? { proposalState } : {}),
  };
}

function extractWorkLogHarnessOSThreadCreation(
  payload: Record<string, unknown> | null,
): WorkLogHarnessOSThreadCreation | null {
  if (!payload) {
    return null;
  }
  const operationId = asTrimmedString(payload.operationId);
  const rawThreads = Array.isArray(payload.threads) ? payload.threads : [];
  if (!operationId || rawThreads.length === 0) {
    return null;
  }
  const threads = rawThreads.flatMap((value): WorkLogHarnessOSCreatedThread[] => {
    const thread = asRecord(value);
    const threadId = asTrimmedString(thread?.threadId);
    const title = asTrimmedString(thread?.title);
    const engine = asTrimmedString(thread?.engine);
    const model = asTrimmedString(thread?.model);
    const environment = asTrimmedString(thread?.environment);
    const status = asTrimmedString(thread?.status) ?? "created";
    const engineKind = engine !== null && Schema.is(EngineKind)(engine) ? engine : null;
    if (
      !threadId ||
      !title ||
      !engineKind ||
      !model ||
      (environment !== "local" && environment !== "worktree")
    ) {
      return [];
    }
    return [{ threadId, title, engine: engineKind, model, environment, status }];
  });
  if (threads.length === 0) {
    return null;
  }
  const requestedCount =
    typeof payload.requestedCount === "number" && Number.isInteger(payload.requestedCount)
      ? payload.requestedCount
      : threads.length;
  const createdCount =
    typeof payload.createdCount === "number" && Number.isInteger(payload.createdCount)
      ? payload.createdCount
      : threads.length;
  return { operationId, requestedCount, createdCount, threads };
}

export interface TaskListTaskSnapshot {
  task: string;
  status: "pending" | "inProgress" | "completed";
}

// One parser owns both the composer task card and transcript snapshot rows.
// An explicit empty array is distinct from an unreadable payload, but neither
// is a usable progress snapshot that may replace an earlier valid checklist.
export function parseTaskListTasks(payload: unknown): TaskListTaskSnapshot[] | null {
  const record = asRecord(payload);
  const rawTasks = record?.tasks;
  if (!Array.isArray(rawTasks)) {
    return null;
  }
  const tasks = rawTasks
    .map((value): TaskListTaskSnapshot | null => {
      const task = asRecord(value);
      if (typeof task?.task !== "string") {
        return null;
      }
      const status =
        task.status === "completed" || task.status === "inProgress" ? task.status : "pending";
      return { task: task.task, status };
    })
    .filter((task): task is TaskListTaskSnapshot => task !== null);
  if (rawTasks.length > 0 && tasks.length === 0) {
    return null;
  }
  return tasks;
}

function extractUserInputResolution(payload: Record<string, unknown> | null): {
  status: NonNullable<WorkLogEntry["userInputSettlementStatus"]>;
  answers?: unknown;
} | null {
  const settlement = asRecord(payload?.settlement);
  const status = settlement?.status;
  if (
    status === "answered" ||
    status === "cancelled" ||
    status === "aborted" ||
    status === "timed_out" ||
    status === "unavailable" ||
    status === "stale"
  ) {
    return {
      status,
      ...(status === "answered" ? { answers: settlement?.answers } : {}),
    };
  }
  // Named legacy/native decode seam: older persisted Engine activities carried
  // only an answers object. Empty answers stay a genuine answered fact; they are
  // never reverse-inferred as cancellation.
  if (asRecord(payload?.answers)) {
    return {
      status: "answered",
      answers: payload?.answers,
    };
  }
  return null;
}

function extractUserInputCorrelationKey(
  activity: OrchestrationThreadActivity,
  payload: Record<string, unknown> | null,
): string | null {
  const requestId = payload?.requestId;
  const lifecycleGeneration = payload?.lifecycleGeneration;
  // A request id alone is not globally unique. Refuse to coalesce old or malformed
  // facts that lack their owning turn/generation; an honest orphan terminal row is
  // safer than merging two different interactions that reused the same id.
  if (
    typeof requestId !== "string" ||
    requestId.length === 0 ||
    activity.turnId === null ||
    typeof lifecycleGeneration !== "string" ||
    lifecycleGeneration.length === 0
  ) {
    return null;
  }
  return JSON.stringify([requestId, activity.turnId, lifecycleGeneration]);
}

function extractUserInputQuestions(
  payload: Record<string, unknown> | null,
): WorkLogUserInputQuestion[] {
  if (!Array.isArray(payload?.questions)) return [];
  return payload.questions.flatMap((value): WorkLogUserInputQuestion[] => {
    const question = asRecord(value);
    if (!question || typeof question.id !== "string") return [];
    const prompt =
      typeof question.prompt === "string"
        ? question.prompt
        : typeof question.question === "string"
          ? question.question
          : null;
    if (prompt === null) return [];
    const kind =
      question.kind === "text" ||
      (question.kind !== "choice" &&
        Array.isArray(question.options) &&
        question.options.length === 0)
        ? "text"
        : "choice";
    const optionLabels = Array.isArray(question.options)
      ? question.options.flatMap((value): string[] => {
          const option = asRecord(value);
          return typeof option?.label === "string" ? [option.label] : [];
        })
      : [];
    return [{ id: question.id, prompt, kind, optionLabels }];
  });
}

function extractUserInputAnswer(
  value: unknown,
  question: WorkLogUserInputQuestion,
): WorkLogUserInputAnswer | null {
  if (typeof value === "string") {
    if (question.kind === "text") {
      return { selectedOptionLabels: [], customText: value };
    }
    return question.optionLabels.includes(value)
      ? { selectedOptionLabels: [value] }
      : { selectedOptionLabels: [], customText: value };
  }
  if (Array.isArray(value)) {
    return {
      selectedOptionLabels: value.filter((item): item is string => typeof item === "string"),
    };
  }
  const structured = asRecord(value);
  if (!structured) return null;
  const selectedOptionLabels = Array.isArray(structured.selectedOptionLabels)
    ? structured.selectedOptionLabels.filter((item): item is string => typeof item === "string")
    : [];
  return {
    selectedOptionLabels,
    ...(typeof structured.customText === "string" ? { customText: structured.customText } : {}),
  };
}

function attachUserInputAnswers(
  interaction: WorkLogUserInputInteraction,
  answers: unknown,
): WorkLogUserInputInteraction {
  const answerRecord = asRecord(answers);
  if (!answerRecord) return interaction;
  return {
    ...interaction,
    questions: interaction.questions.map((question) => {
      const answer = extractUserInputAnswer(answerRecord[question.id], question);
      return answer ? { ...question, answer } : question;
    }),
  };
}

function toDerivedWorkLogEntry(activity: OrchestrationThreadActivity): DerivedWorkLogEntry {
  const payload =
    activity.payload && typeof activity.payload === "object"
      ? (activity.payload as Record<string, unknown>)
      : null;
  const commandAction = extractPrimaryCommandAction(payload);
  const commandPreview = extractToolCommand(payload, commandAction);
  const changedFiles = extractChangedFiles(payload);
  const title = extractToolTitle(payload);
  const toolName = extractToolName(payload);
  const toolCallId = extractToolCallId(payload);
  const toolStatus = deriveToolLifecycleStatus(activity.kind, payload);
  const engineWebSurface = extractEngineWebSurface(payload);
  const reasoningDetailTruncated =
    (activity.kind === "reasoning.updated" || activity.kind === "reasoning.completed") &&
    asRecord(payload?.data)?.reasoningDetailTruncated === true;
  const userInputResolution = extractUserInputResolution(payload);
  const userInputCorrelationKey =
    activity.kind === "user-input.requested" || activity.kind === "user-input.resolved"
      ? extractUserInputCorrelationKey(activity, payload)
      : null;
  const userInputRequestId =
    typeof payload?.requestId === "string" && payload.requestId.length > 0
      ? payload.requestId
      : null;
  const userInputQuestions =
    activity.kind === "user-input.requested" ? extractUserInputQuestions(payload) : [];
  const entry: DerivedWorkLogEntry = {
    id: activity.id,
    createdAt: activity.createdAt,
    ...(activity.sequence !== undefined ? { sequence: activity.sequence } : {}),
    ...(activity.turnId !== null ? { turnId: activity.turnId } : {}),
    label: activity.summary,
    tone: activity.tone === "approval" ? "info" : activity.tone,
    activityKind: activity.kind,
    ...(activity.kind === "user-input.requested" && userInputRequestId
      ? {
          userInputInteraction: {
            requestId: userInputRequestId,
            questions: userInputQuestions,
          },
        }
      : {}),
    ...(activity.kind === "user-input.resolved" && userInputResolution
      ? {
          userInputSettlementStatus: userInputResolution.status,
          ...(userInputResolution.answers !== undefined
            ? { userInputResolvedAnswers: userInputResolution.answers }
            : {}),
        }
      : {}),
    ...(userInputCorrelationKey ? { userInputCorrelationKey } : {}),
    ...(toolName ? { toolName } : {}),
    ...(toolCallId ? { toolCallId } : {}),
    ...(toolStatus ? { toolStatus } : {}),
    ...(engineWebSurface ? { engineWebSurface } : {}),
    ...(reasoningDetailTruncated ? { reasoningDetailTruncated: true } : {}),
    ...(payload && Schema.is(EngineTurnStartFailureReason)(payload.failureReason)
      ? { failureReason: payload.failureReason }
      : {}),
    ...(activity.kind === "quit-resume.failed" &&
    (payload?.reason === "workspace-missing" ||
      payload?.reason === "workspace-unavailable" ||
      payload?.reason === "project-unavailable" ||
      payload?.reason === "exact-binding-unavailable")
      ? { quitResumeFailureReason: payload.reason }
      : {}),
  };
  const itemType = extractWorkLogItemType(payload);
  const requestKind = extractWorkLogRequestKind(payload);
  if (
    (activity.kind === "skill.instructions.delivered" ||
      activity.kind === "skill.instructions.failed") &&
    typeof payload?.skillName === "string" &&
    (payload.deliveryMode === "inline" || payload.deliveryMode === "reference")
  ) {
    entry.skillDelivery = {
      skillName: payload.skillName,
      mode: payload.deliveryMode,
      ...(payload.failureReason === "unreadable" ||
      payload.failureReason === "oversized" ||
      payload.failureReason === "budget_exceeded"
        ? { failureReason: payload.failureReason }
        : {}),
    };
  }
  if (activity.kind === "chat-to-agent.attachments.partial" && Array.isArray(payload?.failures)) {
    const failures = payload.failures.flatMap((value) => {
      const failure = asRecord(value);
      const targetMessageId = asTrimmedString(failure?.targetMessageId);
      const name = asTrimmedString(failure?.name);
      const attachmentIndex = failure?.attachmentIndex;
      const reason = failure?.reason;
      if (
        !targetMessageId ||
        !name ||
        typeof attachmentIndex !== "number" ||
        !Number.isInteger(attachmentIndex) ||
        attachmentIndex < 0 ||
        (reason !== "missing" &&
          reason !== "unreadable" &&
          reason !== "limit" &&
          reason !== "clone-failed")
      ) {
        return [];
      }
      return [
        {
          targetMessageId,
          name,
          attachmentIndex,
          reason: reason as "missing" | "unreadable" | "limit" | "clone-failed",
        },
      ];
    });
    if (failures.length > 0) entry.attachmentTransferFailures = failures;
  }
  if (payload && typeof payload.detail === "string" && payload.detail.length > 0) {
    const detail = stripTrailingExitCode(payload.detail).output;
    if (detail) {
      entry.detail = detail;
    }
  }
  const outputDetail =
    activity.kind === "engine.event.unmapped" ? null : summarizeToolPayloadOutput(payload);
  if (outputDetail && (!entry.detail || toolStatus === "failed")) {
    entry.detail = outputDetail;
  }
  const collabTaskOutputDetail = extractCollabTaskOutputDetail(payload);
  if (collabTaskOutputDetail) {
    entry.detail = collabTaskOutputDetail;
  }
  const nativeEventType =
    payload && typeof payload.nativeEventType === "string" && payload.nativeEventType.length > 0
      ? payload.nativeEventType
      : undefined;
  if (nativeEventType) {
    entry.nativeEventType = nativeEventType;
  }
  const runtimeWarningMessage =
    activity.kind === "runtime.warning" &&
    typeof payload?.message === "string" &&
    payload.message.trim().length > 0
      ? payload.message.trim()
      : undefined;
  const askUserProvenanceUnavailable =
    activity.kind === "runtime.warning" &&
    asRecord(payload?.detail)?.capability === "ask-user" &&
    asRecord(payload?.detail)?.availability === "unavailable";
  if (askUserProvenanceUnavailable) {
    entry.askUserProvenanceUnavailable = true;
    delete entry.detail;
  } else if (runtimeWarningMessage) {
    entry.detail = runtimeWarningMessage;
    entry.runtimeWarningMessage = runtimeWarningMessage;
  }
  if (activity.kind === "turn.tasks.updated") {
    const tasks = parseTaskListTasks(payload);
    if (tasks && tasks.length > 0) {
      entry.taskListSnapshotValid = true;
      entry.taskListProgress = {
        completed: tasks.filter((task) => task.status === "completed").length,
        total: tasks.length,
      };
      const inProgressTask = tasks.find((task) => task.status === "inProgress");
      if (inProgressTask) {
        entry.detail = inProgressTask.task;
      } else {
        delete entry.detail;
      }
    }
    // Full snapshots supersede one another only inside a known turn. Turnless
    // rows cannot prove a boundary and therefore remain independent.
    if (activity.turnId !== null) {
      entry.collapseKey = `task-list:${activity.turnId}`;
    }
  }
  if (commandPreview.command) {
    entry.command = commandPreview.command;
  }
  if (commandPreview.rawCommand) {
    entry.rawCommand = commandPreview.rawCommand;
  }
  const commandActionDisplay = deriveCommandActionDisplay(commandAction, activity.kind);
  if (commandActionDisplay?.preview) {
    entry.preview = commandActionDisplay.preview;
  }
  if (changedFiles.length > 0) {
    entry.changedFiles = changedFiles;
  }
  if (itemType) {
    entry.itemType = itemType;
  }
  if (requestKind) {
    entry.requestKind = requestKind;
  }
  if (
    activity.kind === "tool.started" &&
    itemType === "command_execution" &&
    !commandAction &&
    !commandPreview.command &&
    !toolName
  ) {
    entry.suppressStandaloneCommandStart = true;
  }
  const subagents = extractCollabSubagents(payload);
  if (subagents.length > 0) {
    entry.subagents = subagents;
  }
  const subagentAction = extractCollabAction(payload, subagents);
  if (subagentAction) {
    entry.subagentAction = subagentAction;
  }
  if (activity.kind === "automation.created") {
    const automation = extractWorkLogAutomation(payload);
    if (automation) {
      entry.automation = automation;
    }
  }
  if (activity.kind === "harnessos.threads.created") {
    const harnessosThreadCreation = extractWorkLogHarnessOSThreadCreation(payload);
    if (harnessosThreadCreation) {
      entry.harnessosThreadCreation = harnessosThreadCreation;
    }
  }
  const readableTitle =
    extractCollabActionTitle(payload) ??
    deriveHarnessOSMcpToolTitle({
      toolName,
      title: commandActionDisplay?.title ?? title,
      fallbackLabel: activity.summary,
      status: toolStatus,
    }) ??
    deriveReadableToolTitle({
      title: commandActionDisplay?.title ?? title,
      fallbackLabel: activity.summary,
      itemType,
      requestKind,
      command: commandPreview.command,
      payload,
      isRunning: activity.kind !== "tool.completed",
    });
  if (readableTitle && activity.kind !== "turn.tasks.updated") {
    entry.toolTitle = readableTitle;
  }
  const liveActivity = deriveWorkLogLiveActivity(activity, payload, entry);
  if (liveActivity) {
    entry.liveActivity = liveActivity;
  }
  if (
    entry.detail &&
    normalizeToolTextForComparison(entry.detail) ===
      normalizeToolTextForComparison(entry.toolTitle ?? entry.label)
  ) {
    delete entry.detail;
  }
  const toolDetails = deriveWorkLogToolDetails({
    payload,
    itemType,
    requestKind,
    command: entry.command,
    rawCommand: entry.rawCommand,
    detail: entry.detail,
    changedFiles: entry.changedFiles ?? changedFiles,
    label: entry.label,
    toolTitle: entry.toolTitle,
    toolName: toolName ?? undefined,
  });
  if (toolDetails) {
    entry.toolDetails = toolDetails;
  }
  const invocationPreview = deriveToolInvocationPreview({
    payload,
    toolName: toolName ?? undefined,
  });
  if (!entry.preview && invocationPreview) {
    entry.preview = invocationPreview;
  }
  const collapseKey =
    deriveProviderRuntimeReconciliationCollapseKey(activity, payload) ??
    deriveToolLifecycleCollapseKey(entry);
  if (collapseKey) {
    entry.collapseKey = collapseKey;
  }
  const collapseCommand = deriveToolLifecycleCollapseCommand(entry);
  if (collapseCommand) {
    entry.collapseCommand = collapseCommand;
  }
  return entry;
}

function extractEngineWebSurface(
  payload: Record<string, unknown> | null,
): WorkLogEntry["engineWebSurface"] | undefined {
  const data = asRecord(payload?.data);
  const surface = asRecord(data?.engineWebSurface);
  const status = surface?.status;
  const surfaceId = asTrimmedString(surface?.surfaceId);
  if (
    (status !== "waiting-for-user" && status !== "unavailable" && status !== "completed") ||
    surface?.provenance !== "engine-native" ||
    surface?.presentation !== "harnessos-browser"
  ) {
    return undefined;
  }
  return {
    status,
    provenance: "engine-native",
    presentation: "harnessos-browser",
    ...(surfaceId ? { surfaceId } : {}),
  };
}

function deriveProviderRuntimeReconciliationCollapseKey(
  activity: OrchestrationThreadActivity,
  payload: Record<string, unknown> | null,
): string | undefined {
  if (activity.kind !== "engine.runtime.reconciled") {
    return undefined;
  }
  const engine = asTrimmedString(payload?.engine);
  const action = asTrimmedString(payload?.action);
  const projectedTurnId = asTrimmedString(payload?.projectedTurnId) ?? activity.turnId ?? undefined;
  const runtimeTurnId = asTrimmedString(payload?.runtimeTurnId);
  if (
    !engine ||
    !projectedTurnId ||
    (action !== "settle-interrupted" &&
      action !== "settle-terminal-projection" &&
      action !== "settle-error" &&
      action !== "align-running-turn") ||
    (action === "align-running-turn" && !runtimeTurnId)
  ) {
    return undefined;
  }
  return `engine-runtime-reconcile:${JSON.stringify([
    engine,
    action,
    projectedTurnId,
    runtimeTurnId ?? null,
  ])}`;
}

function deriveToolLifecycleStatus(
  activityKind: OrchestrationThreadActivity["kind"],
  payload: Record<string, unknown> | null,
): HarnessOSMcpToolStatus | undefined {
  if (!isRenderableToolLifecycleActivity(activityKind)) return undefined;
  if (isFailedToolLifecyclePayload(payload)) return "failed";
  if (isCancelledToolLifecyclePayload(payload)) return "cancelled";
  return activityKind === "tool.completed" ? "completed" : "running";
}

function deriveWorkLogLiveActivity(
  activity: OrchestrationThreadActivity,
  payload: Record<string, unknown> | null,
  entry: WorkLogEntry,
): WorkLogLiveActivity | undefined {
  if (!isRenderableToolLifecycleActivity(activity.kind)) {
    return undefined;
  }

  const data = asRecord(payload?.data);
  const stateRecord = asRecord(data?.state);
  const rawOutput = asRecord(data?.rawOutput);
  const rawStatus = [payload?.status, data?.status, stateRecord?.status, rawOutput?.status].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  const normalizedStatus = rawStatus?.trim().toLowerCase();
  const state: WorkLogLiveActivityState = isFailedToolLifecyclePayload(payload)
    ? "failed"
    : isCancelledToolLifecyclePayload(payload)
      ? "cancelled"
      : activity.kind === "tool.completed" ||
          (normalizedStatus &&
            ["completed", "complete", "success", "succeeded"].includes(normalizedStatus))
        ? "completed"
        : "running_tool";
  const detail =
    asTrimmedString(data?.summary) ??
    (activity.kind === "tool.updated"
      ? asTrimmedString(payload?.detail)
      : state === "failed" || state === "cancelled"
        ? (entry.detail ?? null)
        : null);
  const progress = deriveWorkLogLiveActivityProgress(payload, data);
  const elapsedSeconds = firstFiniteNumber(payload?.elapsedSeconds, data?.elapsedSeconds);

  return {
    state,
    label: entry.toolTitle ?? entry.label,
    lastActivityAt: activity.createdAt,
    ...(activity.kind === "tool.started" ? { startedAt: activity.createdAt } : {}),
    ...(detail ? { detail } : {}),
    ...(progress !== undefined ? { progress } : {}),
    ...(elapsedSeconds !== undefined ? { elapsedSeconds } : {}),
  };
}

function deriveWorkLogLiveActivityProgress(
  payload: Record<string, unknown> | null,
  data: Record<string, unknown> | null,
): number | undefined {
  const progress = firstFiniteNumber(payload?.progress, data?.progress);
  if (progress !== undefined) {
    return progress;
  }

  const percent = firstFiniteNumber(data?.percent);
  return percent === undefined ? undefined : percent / 100;
}

function isFailedToolLifecyclePayload(payload: Record<string, unknown> | null): boolean {
  const data = asRecord(payload?.data);
  const state = asRecord(data?.state);
  const rawOutput = asRecord(data?.rawOutput);
  const statuses = [payload?.status, data?.status, state?.status, rawOutput?.status];
  if (
    statuses.some(
      (status) =>
        typeof status === "string" && ["error", "failed", "failure"].includes(status.toLowerCase()),
    )
  ) {
    return true;
  }
  return [
    payload?.isError,
    payload?.is_error,
    data?.isError,
    data?.is_error,
    rawOutput?.isError,
    rawOutput?.is_error,
  ].some((flag) => flag === true || flag === 1 || flag === "true");
}

function isCancelledToolLifecyclePayload(payload: Record<string, unknown> | null): boolean {
  const data = asRecord(payload?.data);
  const state = asRecord(data?.state);
  const rawOutput = asRecord(data?.rawOutput);
  return [payload?.status, data?.status, state?.status, rawOutput?.status].some(
    (status) =>
      typeof status === "string" &&
      ["cancelled", "canceled", "declined", "interrupted", "killed", "stopped", "aborted"].includes(
        status.trim().toLowerCase(),
      ),
  );
}

function summarizeToolPayloadOutput(payload: Record<string, unknown> | null): string | null {
  const data = asRecord(payload?.data);
  return summarizeToolRawOutput(data?.rawOutput) ?? null;
}

function extractCollabTaskOutputDetail(payload: Record<string, unknown> | null): string | null {
  if (extractWorkLogItemType(payload) !== "collab_agent_tool_call") {
    return null;
  }
  const data = asRecord(payload?.data);
  const item = collabPayloadItem(payload);
  const state = asRecord(data?.state) ?? asRecord(item?.state);
  const candidates = [
    state?.output,
    data?.output,
    item?.output,
    data?.rawOutput,
    data?.result,
    item?.result,
  ];
  for (const candidate of candidates) {
    const normalized = extractCollabTaskText(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function extractCollabActionTitle(payload: Record<string, unknown> | null): string | null {
  if (extractWorkLogItemType(payload) !== "collab_agent_tool_call") {
    return null;
  }
  const item = collabPayloadItem(payload);
  const input = asRecord(item?.input);
  const state = asRecord(item?.state);
  const candidates = [
    state?.title,
    item?.title,
    payload?.title,
    input?.description,
    item?.description,
  ];
  for (const candidate of candidates) {
    const title = asTrimmedString(candidate);
    if (title && !isGenericToolTitle(title)) {
      return title.length > 120 ? `${title.slice(0, 117).trimEnd()}...` : title;
    }
  }
  return null;
}

function extractCollabTaskText(value: unknown): string | null {
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => extractCollabTaskText(entry))
      .filter((entry): entry is string => entry !== null);
    return parts.length > 0 ? parts.join("\n") : null;
  }
  const direct = normalizeCollabTaskOutput(asTrimmedString(value));
  if (direct) {
    return direct;
  }
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return (
    extractCollabTaskText(record.content) ??
    extractCollabTaskText(record.text) ??
    extractCollabTaskText(record.output) ??
    extractCollabTaskText(record.result)
  );
}

function normalizeCollabTaskOutput(value: string | null): string | null {
  const output = value ? stripTrailingExitCode(value).output : null;
  if (!output) {
    return null;
  }
  const taskResultMatch = /<task_result>\s*([\s\S]*?)\s*<\/task_result>/i.exec(output);
  if (taskResultMatch?.[1]) {
    return taskResultMatch[1].trim() || null;
  }
  const unwrappedTask = output
    .replace(/^<task\b[^>]*>\s*/i, "")
    .replace(/\s*<\/task>\s*$/i, "")
    .trim();
  return (unwrappedTask || output).trim() || null;
}

function coalesceCanonicalUserInputEntries(
  entries: ReadonlyArray<DerivedWorkLogEntry>,
): DerivedWorkLogEntry[] {
  const requestedByCorrelation = new Map<string, DerivedWorkLogEntry>();
  const terminalByCorrelation = new Map<string, DerivedWorkLogEntry>();

  for (const entry of entries) {
    const correlationKey = entry.userInputCorrelationKey;
    if (entry.activityKind === "user-input.requested" && correlationKey) {
      // Duplicate requested facts remain visible instead of silently replacing an
      // earlier interaction. Only the first well-formed request can own a terminal.
      if (!requestedByCorrelation.has(correlationKey)) {
        requestedByCorrelation.set(correlationKey, entry);
      }
      continue;
    }
    if (
      entry.activityKind === "user-input.resolved" &&
      correlationKey &&
      entry.userInputSettlementStatus &&
      !terminalByCorrelation.has(correlationKey)
    ) {
      terminalByCorrelation.set(correlationKey, entry);
    }
  }

  const projected: DerivedWorkLogEntry[] = [];
  for (const entry of entries) {
    const correlationKey = entry.userInputCorrelationKey;
    const requested = correlationKey ? requestedByCorrelation.get(correlationKey) : undefined;
    const terminal = correlationKey ? terminalByCorrelation.get(correlationKey) : undefined;

    if (entry === requested && entry.userInputInteraction && terminal?.userInputSettlementStatus) {
      projected.push({
        ...entry,
        // Runtime and orchestration activities have independent causal sequence domains,
        // so a terminal may sort before its request. The request still owns the stable
        // presentation position and identity regardless of fact arrival/order.
        tone: terminal.tone,
        userInputSettlementStatus: terminal.userInputSettlementStatus,
        userInputInteraction:
          terminal.userInputSettlementStatus === "answered"
            ? attachUserInputAnswers(entry.userInputInteraction, terminal.userInputResolvedAnswers)
            : entry.userInputInteraction,
      });
      continue;
    }

    if (entry === terminal && requested?.userInputInteraction) {
      continue;
    }

    projected.push(entry);
  }

  return projected;
}

function collapseDerivedWorkLogEntries(
  entries: ReadonlyArray<DerivedWorkLogEntry>,
): DerivedWorkLogEntry[] {
  const collapsed: DerivedWorkLogEntry[] = [];
  // Tools that carry a unique tool-call id (collapseKey "tool:<id>") merge by that
  // id regardless of position. This is what fixes engines that emit every tool's
  // started event before any of their completed events — Claude's parallel tool
  // calls — which the adjacency-only path below renders as a started row plus a
  // separate completed row. The id is unique per call, so distinct calls of the
  // same tool never merge into each other.
  const stableToolIndexByKey = new Map<string, number>();
  // Older servers included the current observation sequence in recovery ids,
  // so the same repair could be persisted more than once while projections
  // converged. Preserve the first row for each semantic repair and hide only
  // exact repeats; different turns/actions remain independently visible.
  const seenRuntimeReconciliationKeys = new Set<string>();
  const taskListIndexByKey = new Map<string, number>();
  for (const entry of entries) {
    const runtimeReconciliationKey = entry.collapseKey?.startsWith("engine-runtime-reconcile:")
      ? entry.collapseKey
      : undefined;
    if (runtimeReconciliationKey !== undefined) {
      if (seenRuntimeReconciliationKeys.has(runtimeReconciliationKey)) {
        continue;
      }
      seenRuntimeReconciliationKeys.add(runtimeReconciliationKey);
    }
    const taskListKey = entry.collapseKey?.startsWith("task-list:") ? entry.collapseKey : undefined;
    if (taskListKey !== undefined) {
      const existingIndex = taskListIndexByKey.get(taskListKey);
      if (existingIndex !== undefined) {
        collapsed[existingIndex] = mergeTaskListEntries(collapsed[existingIndex]!, entry);
        continue;
      }
      taskListIndexByKey.set(taskListKey, collapsed.length);
      collapsed.push(entry);
      continue;
    }
    const previous = collapsed.at(-1);
    if (previous && shouldCollapseRuntimeWarningEntries(previous, entry)) {
      collapsed[collapsed.length - 1] = mergeRuntimeWarningEntries(previous, entry);
      continue;
    }
    if (previous && shouldCollapseContextCompactionEntries(previous, entry)) {
      collapsed[collapsed.length - 1] = mergeDerivedWorkLogEntries(previous, entry);
      continue;
    }
    const stableToolKey =
      entry.collapseKey?.startsWith("tool:") &&
      isRenderableToolLifecycleActivity(entry.activityKind)
        ? entry.collapseKey
        : undefined;
    if (stableToolKey !== undefined) {
      const existingIndex = stableToolIndexByKey.get(stableToolKey);
      if (existingIndex !== undefined) {
        collapsed[existingIndex] = mergeDerivedWorkLogEntries(collapsed[existingIndex]!, entry);
        continue;
      }
    }
    if (previous && shouldCollapseToolLifecycleEntries(previous, entry)) {
      collapsed[collapsed.length - 1] = mergeDerivedWorkLogEntries(previous, entry);
      if (stableToolKey !== undefined) {
        stableToolIndexByKey.set(stableToolKey, collapsed.length - 1);
      }
      continue;
    }
    collapsed.push(entry);
    if (stableToolKey !== undefined) {
      stableToolIndexByKey.set(stableToolKey, collapsed.length - 1);
    }
  }
  return collapsed;
}

function shouldCollapseRuntimeWarningEntries(
  previous: DerivedWorkLogEntry,
  next: DerivedWorkLogEntry,
): boolean {
  if (previous.activityKind !== "runtime.warning" || next.activityKind !== "runtime.warning") {
    return false;
  }
  if (previous.turnId !== next.turnId) {
    return false;
  }
  return (
    normalizeToolTextForComparison(previous.label) === normalizeToolTextForComparison(next.label) &&
    normalizeToolTextForComparison(
      previous.runtimeWarningMessage ?? previous.detail ?? previous.preview ?? "",
    ) ===
      normalizeToolTextForComparison(
        next.runtimeWarningMessage ?? next.detail ?? next.preview ?? "",
      )
  );
}

function mergeRuntimeWarningEntries(
  previous: DerivedWorkLogEntry,
  next: DerivedWorkLogEntry,
): DerivedWorkLogEntry {
  const repeatCount = (previous.runtimeWarningRepeatCount ?? 1) + 1;
  const runtimeWarningMessage =
    next.runtimeWarningMessage ??
    previous.runtimeWarningMessage ??
    next.detail ??
    next.preview ??
    previous.detail ??
    previous.preview;
  const repeatPreview = runtimeWarningMessage
    ? `${repeatCount} notices - ${runtimeWarningMessage}`
    : `${repeatCount} notices`;
  return {
    ...previous,
    ...next,
    runtimeWarningRepeatCount: repeatCount,
    ...(runtimeWarningMessage ? { runtimeWarningMessage } : {}),
    detail: repeatPreview,
    preview: repeatPreview,
  };
}

function mergeTaskListEntries(
  previous: DerivedWorkLogEntry,
  next: DerivedWorkLogEntry,
): DerivedWorkLogEntry {
  if (!next.taskListSnapshotValid) {
    return previous;
  }
  if (!previous.taskListSnapshotValid) {
    return next;
  }
  const merged = {
    ...next,
    id: previous.id,
    createdAt: previous.createdAt,
  };
  if (previous.sequence === undefined) {
    delete merged.sequence;
  } else {
    merged.sequence = previous.sequence;
  }
  return merged;
}

// Ingestion emits compaction progress ("Compacting conversation...") and its
// terminal row ("Context compacted" / "... failed" / "... manually") as separate
// activities; fold the terminal row into the in-progress one so the work log
// shows a single resolving compaction entry instead of a stale spinner row.
const CONTEXT_COMPACTION_PROGRESS_LABEL = "Compacting conversation...";

function shouldCollapseContextCompactionEntries(
  previous: DerivedWorkLogEntry,
  next: DerivedWorkLogEntry,
): boolean {
  if (
    previous.activityKind !== "context-compaction" ||
    next.activityKind !== "context-compaction"
  ) {
    return false;
  }
  if (previous.turnId !== next.turnId) {
    return false;
  }
  // Only merge into a row that is still in progress; a terminal row belongs to
  // an earlier compaction and must not swallow the next one's progress row.
  return previous.label === CONTEXT_COMPACTION_PROGRESS_LABEL;
}

function shouldCollapseToolLifecycleEntries(
  previous: DerivedWorkLogEntry,
  next: DerivedWorkLogEntry,
): boolean {
  if (!isRenderableToolLifecycleActivity(previous.activityKind)) {
    return false;
  }
  if (!isRenderableToolLifecycleActivity(next.activityKind)) {
    return false;
  }
  if (previous.activityKind === "tool.completed") {
    return false;
  }
  if (previous.suppressStandaloneCommandStart && next.toolCallId === undefined) {
    return false;
  }
  if (previous.collapseKey !== undefined && previous.collapseKey === next.collapseKey) {
    if (previous.collapseKey.startsWith("tool:")) {
      return true;
    }
    if (!areToolLifecycleChangedFilesCompatible(previous.changedFiles, next.changedFiles)) {
      return false;
    }
    return areToolLifecycleCommandsCompatible(previous.collapseCommand, next.collapseCommand);
  }
  return (
    previous.toolCallId !== undefined &&
    next.toolCallId === undefined &&
    previous.itemType === next.itemType &&
    normalizeCompactToolLabel(previous.toolTitle ?? previous.label) ===
      normalizeCompactToolLabel(next.toolTitle ?? next.label) &&
    areToolLifecycleChangedFilesCompatible(previous.changedFiles, next.changedFiles) &&
    areToolLifecycleCommandsCompatible(previous.collapseCommand, next.collapseCommand)
  );
}

function mergeDerivedWorkLogEntries(
  previous: DerivedWorkLogEntry,
  next: DerivedWorkLogEntry,
): DerivedWorkLogEntry {
  const changedFiles = mergeChangedFiles(previous.changedFiles, next.changedFiles);
  const detail = next.detail ?? previous.detail;
  const command = next.command ?? previous.command;
  const rawCommand = next.rawCommand ?? previous.rawCommand;
  const preview = next.preview ?? previous.preview;
  const toolTitle = mergeWorkLogToolTitle(previous, next);
  const preservePreviousToolSemantics =
    next.activityKind === "tool.updated" &&
    next.itemType === "mcp_tool_call" &&
    previous.itemType !== undefined &&
    previous.itemType !== "mcp_tool_call";
  const itemType = preservePreviousToolSemantics
    ? previous.itemType
    : (next.itemType ?? previous.itemType);
  const requestKind = preservePreviousToolSemantics
    ? previous.requestKind
    : (next.requestKind ?? previous.requestKind);
  const subagents = next.subagents ?? previous.subagents;
  const subagentAction = next.subagentAction ?? previous.subagentAction;
  const harnessosThreadCreation = next.harnessosThreadCreation ?? previous.harnessosThreadCreation;
  const collapseKey = next.collapseKey ?? previous.collapseKey;
  const toolName = next.toolName ?? previous.toolName;
  const toolCallId = next.toolCallId ?? previous.toolCallId;
  const preservePreviousTerminalState =
    previous.liveActivity !== undefined &&
    !isInProgressLiveActivityState(previous.liveActivity.state) &&
    next.liveActivity !== undefined &&
    isInProgressLiveActivityState(next.liveActivity.state);
  const toolStatus = preservePreviousTerminalState
    ? previous.toolStatus
    : (next.toolStatus ?? previous.toolStatus);
  const liveActivity = mergeWorkLogLiveActivity(previous.liveActivity, next.liveActivity);
  const toolDetails = mergeWorkLogToolDetails(previous.toolDetails, next.toolDetails);
  const turnId = next.turnId ?? previous.turnId;
  const merged: DerivedWorkLogEntry = {
    ...previous,
    ...next,
    ...(turnId !== undefined ? { turnId } : {}),
    ...(detail ? { detail } : {}),
    ...(command ? { command } : {}),
    ...(rawCommand ? { rawCommand } : {}),
    ...(preview ? { preview } : {}),
    ...(changedFiles.length > 0 ? { changedFiles } : {}),
    ...(toolTitle ? { toolTitle } : {}),
    ...(itemType ? { itemType } : {}),
    ...(requestKind ? { requestKind } : {}),
    ...(subagents ? { subagents } : {}),
    ...(subagentAction ? { subagentAction } : {}),
    ...(harnessosThreadCreation ? { harnessosThreadCreation } : {}),
    ...(collapseKey ? { collapseKey } : {}),
    ...(toolName ? { toolName } : {}),
    ...(toolCallId ? { toolCallId } : {}),
    ...(toolStatus ? { toolStatus } : {}),
    ...(liveActivity ? { liveActivity } : {}),
    ...(toolDetails ? { toolDetails } : {}),
  };
  // A lifecycle update enriches the first visible tool row; it does not move
  // that tool to the terminal event's causal position. This matters when
  // public reasoning arrives between started and completed.
  if (previous.sequence === undefined) {
    delete merged.sequence;
  } else {
    merged.sequence = previous.sequence;
  }
  return merged;
}

function mergeWorkLogLiveActivity(
  previous: WorkLogLiveActivity | undefined,
  next: WorkLogLiveActivity | undefined,
): WorkLogLiveActivity | undefined {
  if (!previous) return next;
  if (!next) return previous;
  if (!isInProgressLiveActivityState(previous.state) && isInProgressLiveActivityState(next.state)) {
    return {
      ...previous,
      ...(next.detail || previous.detail ? { detail: next.detail ?? previous.detail } : {}),
      ...(next.progress !== undefined || previous.progress !== undefined
        ? { progress: next.progress ?? previous.progress }
        : {}),
    };
  }
  const startedAt = previous.startedAt ?? next.startedAt;
  const lifecycleElapsedSeconds = startedAt
    ? (Date.parse(next.lastActivityAt) - Date.parse(startedAt)) / 1_000
    : undefined;
  const activityDeltaSeconds =
    (Date.parse(next.lastActivityAt) - Date.parse(previous.lastActivityAt)) / 1_000;
  const carriedElapsedSeconds =
    next.elapsedSeconds === undefined &&
    previous.elapsedSeconds !== undefined &&
    Number.isFinite(activityDeltaSeconds)
      ? previous.elapsedSeconds + Math.max(0, activityDeltaSeconds)
      : previous.elapsedSeconds;
  const elapsedCandidates = [
    lifecycleElapsedSeconds,
    next.elapsedSeconds,
    carriedElapsedSeconds,
  ].filter((value): value is number => value !== undefined && Number.isFinite(value));
  const terminalElapsedSeconds =
    next.state === "completed" || next.state === "failed" || next.state === "cancelled"
      ? elapsedCandidates.length > 0
        ? Math.max(0, ...elapsedCandidates)
        : undefined
      : undefined;
  return {
    state: next.state,
    label: next.label || previous.label,
    lastActivityAt: next.lastActivityAt,
    ...(startedAt ? { startedAt } : {}),
    ...(next.detail || previous.detail ? { detail: next.detail ?? previous.detail } : {}),
    ...(next.progress !== undefined || previous.progress !== undefined
      ? { progress: next.progress ?? previous.progress }
      : {}),
    ...(terminalElapsedSeconds !== undefined
      ? { elapsedSeconds: terminalElapsedSeconds }
      : next.elapsedSeconds !== undefined || carriedElapsedSeconds !== undefined
        ? { elapsedSeconds: next.elapsedSeconds ?? carriedElapsedSeconds }
        : {}),
  };
}

function reconcileSettledLiveActivities(
  entries: ReadonlyArray<DerivedWorkLogEntry>,
  activities: ReadonlyArray<OrchestrationThreadActivity>,
  latestTurnId: TurnId | undefined,
  options: {
    activeTurnId?: TurnId | null;
    activeTurnStartedAt?: string | null;
    latestTurnState?: OrchestrationLatestTurnState | null;
    latestTurnCompletedAt?: string | null;
  },
): DerivedWorkLogEntry[] {
  const terminalByTurnId = new Map<
    TurnId | string,
    {
      state: Extract<WorkLogLiveActivityState, "completed" | "failed" | "cancelled">;
      settledAt: string;
    }
  >();
  for (const activity of activities) {
    if (activity.turnId === null) {
      continue;
    }
    if (activity.kind === "turn.aborted") {
      terminalByTurnId.set(activity.turnId, {
        state: "cancelled",
        settledAt: activity.createdAt,
      });
    } else if (activity.kind === "turn.completed") {
      terminalByTurnId.set(activity.turnId, {
        state: activity.tone === "error" ? "failed" : "completed",
        settledAt: activity.createdAt,
      });
    }
  }

  const latestTerminalState =
    options.latestTurnState === "completed"
      ? "completed"
      : options.latestTurnState === "error"
        ? "failed"
        : options.latestTurnState === "interrupted"
          ? "cancelled"
          : null;
  if (
    latestTurnId &&
    latestTerminalState &&
    options.latestTurnCompletedAt &&
    !terminalByTurnId.has(latestTurnId)
  ) {
    terminalByTurnId.set(latestTurnId, {
      state: latestTerminalState,
      settledAt: options.latestTurnCompletedAt,
    });
  }

  const hasActiveTurnContext = options.activeTurnId !== undefined;
  const activeTurnStartedAtMs = options.activeTurnStartedAt
    ? Date.parse(options.activeTurnStartedAt)
    : Number.NaN;
  return entries.map((entry) => {
    const liveActivity = entry.liveActivity;
    if (!liveActivity || !isInProgressLiveActivityState(liveActivity.state)) {
      return entry;
    }

    const terminal = entry.turnId ? terminalByTurnId.get(entry.turnId) : undefined;
    if (terminal) {
      return {
        ...entry,
        toolStatus:
          terminal.state === "failed"
            ? "failed"
            : terminal.state === "cancelled"
              ? "cancelled"
              : "completed",
        liveActivity: settleWorkLogLiveActivity(liveActivity, terminal.state, terminal.settledAt),
      };
    }

    if (!hasActiveTurnContext) {
      return entry;
    }
    const entryLastActivityAtMs = Date.parse(liveActivity.lastActivityAt);
    const turnlessEntryBelongsToActiveTurn =
      (entry.turnId === undefined || entry.turnId === null) &&
      Number.isFinite(activeTurnStartedAtMs) &&
      Number.isFinite(entryLastActivityAtMs) &&
      entryLastActivityAtMs >= activeTurnStartedAtMs;
    if (
      options.activeTurnId !== null &&
      (entry.turnId === options.activeTurnId || turnlessEntryBelongsToActiveTurn)
    ) {
      return entry;
    }

    const settledState =
      latestTurnId && entry.turnId === latestTurnId && latestTerminalState
        ? latestTerminalState
        : "cancelled";
    return {
      ...entry,
      toolStatus:
        settledState === "failed"
          ? "failed"
          : settledState === "cancelled"
            ? "cancelled"
            : "completed",
      liveActivity: settleWorkLogLiveActivity(
        liveActivity,
        settledState,
        latestTurnId && entry.turnId === latestTurnId && options.latestTurnCompletedAt
          ? options.latestTurnCompletedAt
          : liveActivity.lastActivityAt,
      ),
    };
  });
}

function isInProgressLiveActivityState(state: WorkLogLiveActivityState): boolean {
  return (
    state === "starting" ||
    state === "thinking" ||
    state === "running_tool" ||
    state === "waiting" ||
    state === "streaming"
  );
}

function settleWorkLogLiveActivity(
  activity: WorkLogLiveActivity,
  state: Extract<WorkLogLiveActivityState, "completed" | "failed" | "cancelled">,
  settledAt: string,
): WorkLogLiveActivity {
  const activityAtMs = Date.parse(activity.lastActivityAt);
  const settledAtMs = Date.parse(settledAt);
  const lastActivityAt =
    Number.isFinite(activityAtMs) && Number.isFinite(settledAtMs) && settledAtMs >= activityAtMs
      ? settledAt
      : activity.lastActivityAt;
  return (
    mergeWorkLogLiveActivity(activity, {
      state,
      label: activity.label,
      lastActivityAt,
    }) ?? activity
  );
}

function mergeWorkLogToolTitle(
  previous: DerivedWorkLogEntry,
  next: DerivedWorkLogEntry,
): string | undefined {
  const previousTitle = previous.toolTitle;
  const nextTitle = next.toolTitle;
  if (!previousTitle || !nextTitle) {
    return nextTitle ?? previousTitle;
  }
  const isAgentTask =
    previous.itemType === "collab_agent_tool_call" || next.itemType === "collab_agent_tool_call";
  if (isAgentTask && !isGenericToolTitle(previousTitle) && isGenericToolTitle(nextTitle)) {
    return previousTitle;
  }
  return nextTitle;
}

function mergeChangedFiles(
  previous: ReadonlyArray<string> | undefined,
  next: ReadonlyArray<string> | undefined,
): string[] {
  const merged = [...(previous ?? []), ...(next ?? [])];
  if (merged.length === 0) {
    return [];
  }
  return [...new Set(merged)];
}

// Keep a stable lifecycle key so engines like Claude can stream many
// in-progress tool deltas without turning each partial update into its own row.
function deriveToolLifecycleCollapseKey(entry: DerivedWorkLogEntry): string | undefined {
  if (!isRenderableToolLifecycleActivity(entry.activityKind)) {
    return undefined;
  }
  if (entry.toolCallId) {
    return `tool:${entry.toolCallId}`;
  }
  const normalizedLabel = normalizeCompactToolLabel(entry.toolTitle ?? entry.label);
  const itemType = entry.itemType ?? "";
  const requestKind = entry.requestKind ?? "";
  const toolName = entry.toolName ?? "";
  const command = normalizeCompactToolLabel(entry.command ?? "");
  const detailHint = normalizeCompactToolLabel(extractDetailCollapseHint(entry.detail));
  if (
    normalizedLabel.length === 0 &&
    itemType.length === 0 &&
    requestKind.length === 0 &&
    toolName.length === 0 &&
    detailHint.length === 0
  ) {
    return command.length > 0 ? `command-only${"\u001f"}${command}` : undefined;
  }
  return [itemType, normalizedLabel, requestKind, toolName, detailHint].join("\u001f");
}

function isRenderableToolLifecycleActivity(
  kind: OrchestrationThreadActivity["kind"],
): kind is "tool.started" | "tool.updated" | "tool.completed" {
  return kind === "tool.started" || kind === "tool.updated" || kind === "tool.completed";
}

function deriveToolLifecycleCollapseCommand(entry: DerivedWorkLogEntry): string | undefined {
  const command = normalizeCompactToolLabel(entry.command ?? "");
  return command.length > 0 ? command : undefined;
}

function areToolLifecycleCommandsCompatible(
  previous: string | undefined,
  next: string | undefined,
): boolean {
  if (!previous || !next) {
    return true;
  }
  return previous === next || previous.startsWith(next) || next.startsWith(previous);
}

function areToolLifecycleChangedFilesCompatible(
  previous: ReadonlyArray<string> | undefined,
  next: ReadonlyArray<string> | undefined,
): boolean {
  if (!previous?.length || !next?.length) {
    return true;
  }
  const nextSet = new Set(next);
  return previous.some((path) => nextSet.has(path));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstFiniteNumber(...values: unknown[]): number | undefined {
  return values.find(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
}

function normalizeCollabIdentifier(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.trim().toLowerCase().replaceAll("_", "").replaceAll("-", "");
}

function collabPayloadItem(
  payload: Record<string, unknown> | null,
): Record<string, unknown> | null {
  const data = asRecord(payload?.data);
  return asRecord(data?.item) ?? data;
}

function inferSubagentActionTool(item: Record<string, unknown> | null): string | null {
  const directTool = asTrimmedString(item?.tool ?? item?.name);
  if (directTool) {
    return directTool;
  }

  const normalizedType = normalizeCollabIdentifier(asTrimmedString(item?.type));
  if (!normalizedType) {
    return null;
  }
  if (normalizedType.includes("spawn")) return "spawnAgent";
  if (normalizedType.includes("wait")) return "waitAgent";
  if (normalizedType.includes("close")) return "closeAgent";
  if (normalizedType.includes("resume")) return "resumeAgent";
  if (normalizedType.includes("interaction")) return "sendInput";
  return "spawnAgent";
}

function summarizeSubagentAction(tool: string, count: number): string {
  const normalizedTool = normalizeCollabIdentifier(tool) ?? "";
  const effectiveCount = Math.max(1, count);
  const noun = pluralize(effectiveCount, "agent");
  switch (normalizedTool) {
    case "spawnagent":
      return `Spawning ${effectiveCount} ${noun}`;
    case "wait":
    case "waitagent":
      return `Waiting on ${effectiveCount} ${noun}`;
    case "closeagent":
      return `Closing ${effectiveCount} ${noun}`;
    case "resumeagent":
      return `Resuming ${effectiveCount} ${noun}`;
    case "sendinput":
      return `Updating ${pluralize(effectiveCount, "agent")}`;
    default:
      return effectiveCount === 1 ? "Agent activity" : `Agent activity (${effectiveCount})`;
  }
}

function extractCollabAction(
  payload: Record<string, unknown> | null,
  subagents: ReadonlyArray<WorkLogSubagent>,
): WorkLogSubagentAction | undefined {
  const itemType = extractWorkLogItemType(payload);
  if (itemType !== "collab_agent_tool_call") {
    return undefined;
  }

  const item = collabPayloadItem(payload);
  const itemInput = asRecord(item?.input);
  const tool = inferSubagentActionTool(item);
  const status = asTrimmedString(item?.status ?? payload?.status) ?? "in_progress";
  const model = asTrimmedString(
    item?.model ??
      item?.modelName ??
      item?.model_name ??
      item?.requestedModel ??
      item?.requested_model,
  );
  const prompt = asTrimmedString(
    item?.prompt ?? item?.task ?? item?.message ?? itemInput?.prompt ?? itemInput?.description,
  );
  const agentStates = decodeSubagentAgentStates(item);
  const receiverThreadIds = decodeSubagentReceiverThreadIds(item);
  const count = Math.max(
    subagents.length,
    receiverThreadIds.length,
    Object.keys(agentStates).length,
  );

  if (!tool && !model && !prompt && count === 0) {
    return undefined;
  }

  return {
    tool: tool ?? "spawnAgent",
    status,
    summaryText: summarizeSubagentAction(tool ?? "spawnAgent", count),
    ...(model ? { model } : {}),
    ...(prompt ? { prompt } : {}),
  };
}

function extractCollabSubagents(
  payload: Record<string, unknown> | null,
): ReadonlyArray<WorkLogSubagent> {
  const itemType = extractWorkLogItemType(payload);
  if (itemType !== "collab_agent_tool_call") {
    return [];
  }

  const item = collabPayloadItem(payload);
  if (!item) {
    return [];
  }

  const receiverThreadIds = decodeSubagentReceiverThreadIds(item);
  const receiverAgents = decodeSubagentReceiverAgents(item, receiverThreadIds).map((agent) => {
    const receiverAgent: WorkLogSubagent = {
      threadId: agent.nativeThreadId,
      nativeThreadId: agent.nativeThreadId,
    };
    if (agent.agentId) receiverAgent.agentId = agent.agentId;
    if (agent.nickname) receiverAgent.nickname = agent.nickname;
    if (agent.role) receiverAgent.role = agent.role;
    if (agent.model) receiverAgent.model = agent.model;
    if (agent.effort) receiverAgent.effort = agent.effort;
    if (agent.background) receiverAgent.background = agent.background;
    if (agent.prompt) receiverAgent.prompt = agent.prompt;
    return receiverAgent;
  });

  const agentStates = decodeSubagentAgentStates(item);
  if (receiverAgents.length > 0 || Object.keys(agentStates).length > 0) {
    const mergedByThreadId = new Map<string, WorkLogSubagent>();
    for (const agent of receiverAgents) {
      mergedByThreadId.set(agent.threadId, agent);
    }
    for (const [threadId, state] of Object.entries(agentStates)) {
      const previous = mergedByThreadId.get(threadId);
      mergedByThreadId.set(threadId, {
        threadId,
        nativeThreadId: previous?.nativeThreadId ?? threadId,
        ...previous,
        ...(state.agentId ? { agentId: state.agentId } : {}),
        ...(state.nickname ? { nickname: state.nickname } : {}),
        ...(state.role ? { role: state.role } : {}),
        ...(state.model ? { model: state.model } : {}),
        ...(state.prompt ? { prompt: state.prompt } : {}),
        ...(state.status ? { rawStatus: state.status } : {}),
        ...(state.message ? { latestUpdate: state.message } : {}),
      });
    }
    return [...mergedByThreadId.values()];
  }

  const singularThreadId =
    receiverThreadIds[0] ??
    asTrimmedString(
      item.receiverThreadId ?? item.receiver_thread_id ?? item.threadId ?? item.thread_id,
    );
  if (!singularThreadId) {
    const fallbackIdentity = extractSubagentIdentityHints(item).find(
      (entry) => entry.nativeThreadId !== undefined,
    );
    if (!fallbackIdentity?.nativeThreadId) {
      return [];
    }
    return [
      {
        threadId: fallbackIdentity.nativeThreadId,
        nativeThreadId: fallbackIdentity.nativeThreadId,
        ...(fallbackIdentity.agentId ? { agentId: fallbackIdentity.agentId } : {}),
        ...(fallbackIdentity.nickname ? { nickname: fallbackIdentity.nickname } : {}),
        ...(fallbackIdentity.role ? { role: fallbackIdentity.role } : {}),
        ...(fallbackIdentity.model ? { model: fallbackIdentity.model } : {}),
        ...(fallbackIdentity.effort ? { effort: fallbackIdentity.effort } : {}),
        ...(fallbackIdentity.background ? { background: fallbackIdentity.background } : {}),
        ...(fallbackIdentity.prompt ? { prompt: fallbackIdentity.prompt } : {}),
        ...(fallbackIdentity.status ? { rawStatus: fallbackIdentity.status } : {}),
        ...(fallbackIdentity.message ? { latestUpdate: fallbackIdentity.message } : {}),
      },
    ];
  }
  return [
    {
      threadId: singularThreadId,
      nativeThreadId: singularThreadId,
      agentId:
        asTrimmedString(item.agentId ?? item.agent_id ?? item.newAgentId ?? item.new_agent_id) ??
        undefined,
      nickname:
        asTrimmedString(
          item.newAgentNickname ??
            item.new_agent_nickname ??
            item.agentNickname ??
            item.agent_nickname ??
            item.receiverAgentNickname ??
            item.receiver_agent_nickname,
        ) ?? undefined,
      role:
        asTrimmedString(
          item.receiverAgentRole ??
            item.receiver_agent_role ??
            item.newAgentRole ??
            item.new_agent_role ??
            item.agentRole ??
            item.agent_role ??
            item.agentType ??
            item.agent_type,
        ) ?? undefined,
      model:
        asTrimmedString(
          item.model ??
            item.modelName ??
            item.model_name ??
            item.requestedModel ??
            item.requested_model,
        ) ?? undefined,
      effort: asTrimmedString(item.effort) ?? undefined,
      background: item.background === true ? true : undefined,
      prompt: asTrimmedString(item.prompt ?? item.task ?? item.message) ?? undefined,
    },
  ];
}

function normalizeCommandValue(value: unknown): string | null {
  const direct = asTrimmedString(value);
  if (direct) {
    return direct;
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const parts = value
    .map((entry) => asTrimmedString(entry))
    .filter((entry): entry is string => entry !== null);
  return parts.length > 0 ? parts.join(" ") : null;
}

function asCommandArgumentRecord(value: unknown): Record<string, unknown> | null {
  const direct = asRecord(value);
  if (direct) {
    return direct;
  }
  const text = asTrimmedString(value);
  if (!text || !text.startsWith("{")) {
    return null;
  }
  try {
    return asRecord(JSON.parse(text));
  } catch {
    return null;
  }
}

function isCommandLikeDetail(payload: Record<string, unknown> | null): boolean {
  if (!payload) {
    return false;
  }
  const itemType = extractWorkLogItemType(payload);
  if (itemType === "command_execution") {
    return true;
  }
  const requestKind = extractWorkLogRequestKind(payload);
  if (requestKind === "command") {
    return true;
  }
  const normalizedTitle = normalizeCompactToolLabel(asTrimmedString(payload.title) ?? "");
  return normalizedTitle === "Ran command" || normalizedTitle === "Command run";
}

interface CommandAction {
  type: string;
  command?: string;
  name?: string;
  path?: string;
  query?: string;
}

interface CommandActionDisplay {
  title: string;
  preview?: string;
}

function makeCommandActionDisplay(
  title: string,
  preview: string | undefined,
): CommandActionDisplay {
  return preview === undefined ? { title } : { title, preview };
}

function extractToolCommand(
  payload: Record<string, unknown> | null,
  commandAction: CommandAction | null = extractPrimaryCommandAction(payload),
): { command: string | null; rawCommand: string | null } {
  const data = asRecord(payload?.data);
  const item = asRecord(data?.item);
  const itemResult = asRecord(item?.result);
  const itemInput = asRecord(item?.input);
  const itemArguments = asCommandArgumentRecord(item?.arguments ?? item?.args ?? item?.params);
  const itemCall = asRecord(item?.call);
  const itemFunction = asRecord(item?.function);
  const dataInput = asRecord(data?.input);
  const dataArguments = asCommandArgumentRecord(data?.arguments ?? data?.args ?? data?.params);
  const rawInput = asCommandArgumentRecord(data?.rawInput);
  const detailCommand =
    isCommandLikeDetail(payload) && typeof payload?.detail === "string"
      ? stripTrailingExitCode(payload.detail).output
      : null;
  const rawCommandCandidates = [
    item?.command,
    item?.cmd,
    itemInput?.command,
    itemInput?.cmd,
    itemArguments?.command,
    itemArguments?.cmd,
    itemCall?.command,
    itemCall?.cmd,
    itemFunction?.arguments,
    itemResult?.command,
    itemResult?.cmd,
    data?.command,
    data?.cmd,
    dataInput?.command,
    dataInput?.cmd,
    dataArguments?.command,
    dataArguments?.cmd,
    rawInput?.command,
    rawInput?.cmd,
    item?.text,
    item?.summary,
    detailCommand,
  ];
  const rawCommand =
    rawCommandCandidates
      .map((candidate) => normalizeCommandValue(candidate))
      .find((candidate) => candidate !== null) ?? null;
  const command =
    normalizeCommandValue(commandAction?.command) ??
    rawCommandCandidates
      .map((candidate) => normalizeCommandValue(candidate))
      .find((candidate) => candidate !== null) ??
    null;
  return {
    command,
    rawCommand: rawCommand && rawCommand !== command ? rawCommand : null,
  };
}

function extractToolTitle(payload: Record<string, unknown> | null): string | null {
  return asTrimmedString(payload?.title);
}

function extractPrimaryCommandAction(
  payload: Record<string, unknown> | null,
): CommandAction | null {
  const data = asRecord(payload?.data);
  const item = asRecord(data?.item);
  const actions = collectCommandActions(payload, data, item);
  for (const action of actions) {
    const actionRecord = asRecord(action);
    if (!actionRecord) {
      continue;
    }
    const type = asTrimmedString(actionRecord.type) ?? "unknown";
    const command = asTrimmedString(actionRecord.command) ?? undefined;
    const name = asTrimmedString(actionRecord.name) ?? undefined;
    const path = asTrimmedString(actionRecord.path) ?? undefined;
    const query = asTrimmedString(actionRecord.query) ?? undefined;
    if (command || name || path || query || type !== "unknown") {
      return {
        type,
        ...(command ? { command } : {}),
        ...(name ? { name } : {}),
        ...(path ? { path } : {}),
        ...(query ? { query } : {}),
      };
    }
  }
  return null;
}

// Codex has emitted commandActions both on the item and on the surrounding raw
// payload; scan the nearby envelopes before falling back to generic command text.
function collectCommandActions(
  payload: Record<string, unknown> | null,
  data: Record<string, unknown> | null,
  item: Record<string, unknown> | null,
): ReadonlyArray<unknown> {
  const candidates = [
    item?.commandActions,
    asCommandArgumentRecord(item?.arguments ?? item?.args ?? item?.params)?.commandActions,
    data?.commandActions,
    asCommandArgumentRecord(data?.arguments ?? data?.args ?? data?.params)?.commandActions,
    asCommandArgumentRecord(data?.rawInput)?.commandActions,
    asCommandArgumentRecord(data?.input)?.commandActions,
    payload?.commandActions,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

function deriveCommandActionDisplay(
  action: CommandAction | null,
  activityKind: OrchestrationThreadActivity["kind"],
): CommandActionDisplay | null {
  if (!action) {
    return null;
  }
  const running = activityKind !== "tool.completed";
  switch (normalizeCommandActionType(action.type)) {
    case "read":
    case "readfile":
      return makeCommandActionDisplay(running ? "Reading" : "Read", commandActionTarget(action));
    case "search":
    case "find":
      return makeCommandActionDisplay(
        running ? "Searching" : "Searched",
        commandActionSearchPreview(action),
      );
    case "listfiles":
      return makeCommandActionDisplay(
        running ? "Listing" : "Listed",
        commandActionListPreview(action),
      );
    default:
      return null;
  }
}

function normalizeCommandActionType(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function commandActionTarget(action: CommandAction): string | undefined {
  return action.name ?? compactWorkLogPath(action.path) ?? undefined;
}

function commandActionSearchPreview(action: CommandAction): string | undefined {
  const query = action.query ?? action.name;
  const path = compactWorkLogPath(action.path);
  if (query && path) {
    return `for ${query} in ${path}`;
  }
  if (query) {
    return `for ${query}`;
  }
  if (path) {
    return `in ${path}`;
  }
  return commandActionTarget(action);
}

function commandActionListPreview(action: CommandAction): string | undefined {
  return compactWorkLogPath(action.path) ?? action.name ?? undefined;
}

function compactWorkLogPath(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  if (value === ".") {
    return "current directory";
  }
  if (value === "..") {
    return "parent directory";
  }
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 2) {
    return value;
  }
  return parts.slice(-2).join("/");
}

function extractToolName(payload: Record<string, unknown> | null): string | null {
  const data = asRecord(payload?.data);
  const item = asRecord(data?.item);
  const itemInput = asRecord(item?.input);
  const candidates = [data?.toolName, data?.tool, item?.toolName, item?.name, itemInput?.toolName];
  for (const candidate of candidates) {
    const normalized = asTrimmedString(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function extractToolCallId(payload: Record<string, unknown> | null): string | null {
  const data = asRecord(payload?.data);
  const item = asRecord(data?.item);
  return asTrimmedString(
    data?.toolCallId ?? data?.toolUseId ?? data?.callID ?? data?.callId ?? item?.id,
  );
}

function stripTrailingExitCode(value: string): {
  output: string | null;
  exitCode?: number | undefined;
} {
  const trimmed = value.trim();
  const match = /^(?<output>[\s\S]*?)(?:\s*<exited with exit code (?<code>\d+)>)\s*$/i.exec(
    trimmed,
  );
  if (!match?.groups) {
    return {
      output: trimmed.length > 0 ? trimmed : null,
    };
  }
  const exitCode = Number.parseInt(match.groups.code ?? "", 10);
  const normalizedOutput = match.groups.output?.trim() ?? "";
  return {
    output: normalizedOutput.length > 0 ? normalizedOutput : null,
    ...(Number.isInteger(exitCode) ? { exitCode } : {}),
  };
}

function extractDetailCollapseHint(detail: string | undefined): string {
  if (!detail) {
    return "";
  }
  const firstLine = detail.split("\n", 1)[0]?.trim() ?? "";
  if (firstLine.length === 0) {
    return "";
  }
  const colonIndex = firstLine.indexOf(":");
  if (colonIndex <= 0) {
    return firstLine;
  }
  return firstLine.slice(0, colonIndex);
}

function extractWorkLogItemType(
  payload: Record<string, unknown> | null,
): WorkLogEntry["itemType"] | undefined {
  const topLevel = payload?.itemType;
  if (typeof topLevel === "string" && isToolLifecycleItemType(topLevel)) {
    return topLevel;
  }
  // Defensive: some engine payloads nest the type inside data or data.item
  const data = asRecord(payload?.data);
  const item = asRecord(data?.item);
  const nested = data?.itemType ?? item?.type ?? item?.kind ?? payload?.type ?? payload?.kind;
  if (typeof nested === "string" && isToolLifecycleItemType(nested)) {
    return nested;
  }
  return undefined;
}

function extractWorkLogRequestKind(
  payload: Record<string, unknown> | null,
): WorkLogEntry["requestKind"] | undefined {
  if (
    payload?.requestKind === "command" ||
    payload?.requestKind === "file-read" ||
    payload?.requestKind === "file-change" ||
    payload?.requestKind === "permissions"
  ) {
    return payload.requestKind;
  }
  return approvalRequestKindFromRequestType(payload?.requestType) ?? undefined;
}

function pushChangedFile(target: string[], seen: Set<string>, value: unknown) {
  const normalized = asTrimmedString(value);
  if (!normalized || !isLikelyFilePath(normalized) || seen.has(normalized)) {
    return;
  }
  seen.add(normalized);
  target.push(normalized);
}

function isLikelyFilePath(value: string): boolean {
  if (/^(?:file|vscode|cursor):\/\//iu.test(value)) {
    return true;
  }
  if (value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) {
    return true;
  }
  if (/^[A-Za-z]:[\\/]/u.test(value)) {
    return true;
  }
  if (value.includes("/") || value.includes("\\")) {
    return true;
  }
  return /^[^\s/\\]+\.[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value);
}

function collectChangedFiles(value: unknown, target: string[], seen: Set<string>, depth: number) {
  if (depth > 4 || target.length >= 12) {
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectChangedFiles(entry, target, seen, depth + 1);
      if (target.length >= 12) {
        return;
      }
    }
    return;
  }

  const record = asRecord(value);
  if (!record) {
    return;
  }

  pushChangedFile(target, seen, record.path);
  pushChangedFile(target, seen, record.file);
  pushChangedFile(target, seen, record.file_path);
  pushChangedFile(target, seen, record.filepath);
  pushChangedFile(target, seen, record.filePath);
  pushChangedFile(target, seen, record.relativePath);
  pushChangedFile(target, seen, record.filename);
  pushChangedFile(target, seen, record.newPath);
  pushChangedFile(target, seen, record.oldPath);

  for (const nestedKey of [
    "item",
    "result",
    "input",
    "rawInput",
    "rawOutput",
    "data",
    "location",
    "locations",
    "changes",
    "files",
    "file",
    "edits",
    "patch",
    "patches",
    "operations",
  ]) {
    if (!(nestedKey in record)) {
      continue;
    }
    collectChangedFiles(record[nestedKey], target, seen, depth + 1);
    if (target.length >= 12) {
      return;
    }
  }
}

function extractChangedFiles(payload: Record<string, unknown> | null): string[] {
  const changedFiles: string[] = [];
  const seen = new Set<string>();
  collectChangedFiles(asRecord(payload?.data), changedFiles, seen, 0);
  return changedFiles;
}

function compareActivitiesByOrder(
  left: OrchestrationThreadActivity,
  right: OrchestrationThreadActivity,
): number {
  if (left.sequence !== undefined && right.sequence !== undefined) {
    if (left.sequence !== right.sequence) {
      return left.sequence - right.sequence;
    }
  } else if (left.sequence !== undefined) {
    return 1;
  } else if (right.sequence !== undefined) {
    return -1;
  }

  const createdAtComparison = left.createdAt.localeCompare(right.createdAt);
  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  const lifecycleRankComparison =
    compareActivityLifecycleRank(left.kind) - compareActivityLifecycleRank(right.kind);
  if (lifecycleRankComparison !== 0) {
    return lifecycleRankComparison;
  }

  // Compaction progress and terminal rows can share a millisecond; keep the
  // progress row first so the work-log collapse can fold the pair (event ids
  // are random and would otherwise order them arbitrarily).
  if (left.kind === "context-compaction" && right.kind === "context-compaction") {
    const compactionRankComparison =
      contextCompactionOrderRank(left.summary) - contextCompactionOrderRank(right.summary);
    if (compactionRankComparison !== 0) {
      return compactionRankComparison;
    }
  }

  return left.id.localeCompare(right.id);
}

function contextCompactionOrderRank(summary: string): number {
  return summary === CONTEXT_COMPACTION_PROGRESS_LABEL ? 0 : 1;
}

function compareActivityLifecycleRank(kind: string): number {
  if (kind.endsWith(".started") || kind === "tool.started") {
    return 0;
  }
  if (kind.endsWith(".progress") || kind.endsWith(".updated")) {
    return 1;
  }
  if (kind.endsWith(".completed") || kind.endsWith(".resolved")) {
    return 2;
  }
  return 1;
}

function timelineEntrySourceRank(entry: TimelineEntry): number {
  if (entry.kind === "message") {
    return entry.message.role === "user" ? 0 : 1;
  }
  return entry.kind === "proposed-plan" ? 2 : 3;
}

function compareTimelineEntryTie(left: TimelineEntry, right: TimelineEntry): number {
  return (
    timelineEntrySourceRank(left) - timelineEntrySourceRank(right) ||
    left.id.localeCompare(right.id)
  );
}

function orderTimelineEntries(entries: ReadonlyArray<TimelineEntry>): TimelineEntry[] {
  const causal = entries
    .filter(
      (entry): entry is TimelineEntry & { readonly sequence: number } =>
        "sequence" in entry && entry.sequence !== undefined,
    )
    .toSorted(
      (left, right) =>
        left.sequence! - right.sequence! ||
        left.createdAt.localeCompare(right.createdAt) ||
        compareTimelineEntryTie(left, right),
    );
  const legacy = entries
    .filter((entry) => !("sequence" in entry) || entry.sequence === undefined)
    .toSorted(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) || compareTimelineEntryTie(left, right),
    );
  const merged: TimelineEntry[] = [];
  let causalIndex = 0;
  let legacyIndex = 0;
  while (causalIndex < causal.length && legacyIndex < legacy.length) {
    const causalEntry = causal[causalIndex]!;
    const legacyEntry = legacy[legacyIndex]!;
    const headOrder =
      causalEntry.createdAt.localeCompare(legacyEntry.createdAt) ||
      compareTimelineEntryTie(causalEntry, legacyEntry);
    if (headOrder <= 0) {
      merged.push(causalEntry);
      causalIndex += 1;
    } else {
      merged.push(legacyEntry);
      legacyIndex += 1;
    }
  }
  while (causalIndex < causal.length) {
    merged.push(causal[causalIndex]!);
    causalIndex += 1;
  }
  while (legacyIndex < legacy.length) {
    merged.push(legacy[legacyIndex]!);
    legacyIndex += 1;
  }
  return merged;
}

export function deriveTimelineEntries(
  messages: ChatMessage[],
  proposedPlans: ProposedPlan[],
  workEntries: WorkLogEntry[],
): TimelineEntry[] {
  const proposedPlanTurnIds = new Set(
    proposedPlans.flatMap((proposedPlan) => (proposedPlan.turnId ? [proposedPlan.turnId] : [])),
  );
  const messageRows: TimelineEntry[] = messages.flatMap((message): TimelineEntry[] => {
    const displayMessage =
      message.role === "assistant" && message.turnId && proposedPlanTurnIds.has(message.turnId)
        ? { ...message, text: stripProposedPlanBlocksFromText(message.text) }
        : message;
    if (
      displayMessage.role === "assistant" &&
      displayMessage.text.length === 0 &&
      displayMessage.turnId &&
      proposedPlanTurnIds.has(displayMessage.turnId)
    ) {
      return [];
    }
    const textSegments = displayMessage.textSegments;
    if (
      displayMessage.role === "assistant" &&
      textSegments !== undefined &&
      (textSegments.length > 1 || (displayMessage.streaming && textSegments.length === 1))
    ) {
      const { textSegments: _textSegments, ...messageWithoutSegments } = displayMessage;
      const segmentRows: TimelineEntry[] = [];
      for (const [segmentIndex, segment] of textSegments.entries()) {
        const isTerminalSegment = segmentIndex === textSegments.length - 1;
        const segmentId = isTerminalSegment
          ? displayMessage.id
          : MessageId.makeUnsafe(`${displayMessage.id}#segment:${segmentIndex}`);
        segmentRows.push({
          id: segmentId,
          kind: "message",
          createdAt: segment.startedAt,
          sequence: segment.sequence,
          message: {
            ...messageWithoutSegments,
            id: segmentId,
            text: stripProposedPlanBlocksFromText(segment.text),
            createdAt: segment.startedAt,
            streaming: isTerminalSegment ? displayMessage.streaming : false,
            ...(!isTerminalSegment || !displayMessage.streaming
              ? { completedAt: segment.endedAt }
              : {}),
          },
          ...(isTerminalSegment ? { assistantCopyText: displayMessage.text } : {}),
        });
      }
      return segmentRows;
    }
    return [
      {
        id: displayMessage.id,
        kind: "message",
        createdAt: displayMessage.createdAt,
        message: displayMessage,
      },
    ];
  });
  const proposedPlanRows: TimelineEntry[] = proposedPlans.map((proposedPlan) => ({
    id: proposedPlan.id,
    kind: "proposed-plan",
    createdAt: proposedPlan.createdAt,
    proposedPlan,
  }));
  const workRows: TimelineEntry[] = workEntries.map((entry) => ({
    id: entry.id,
    kind: "work",
    createdAt: entry.createdAt,
    ...(entry.sequence !== undefined ? { sequence: entry.sequence } : {}),
    entry,
  }));

  return orderTimelineEntries([...messageRows, ...proposedPlanRows, ...workRows]);
}
