import {
  type AssistantDeliveryMode,
  CommandId,
  EventId,
  MessageId,
  type OrchestrationCheckpointFile,
  type OrchestrationEvent,
  type OrchestrationProjectShell,
  type OrchestrationProposedPlanId,
  CheckpointRef,
  STUDIO_OUTPUTS_ACTIVITY_KIND,
  ThreadId,
  TurnId,
  type OrchestrationThreadActivity,
  type OrchestrationThread,
  type OrchestrationThreadShell,
  type EngineKind,
  type EngineRuntimeEvent,
} from "@harnessos/contracts";
import { Cache, Cause, Deferred, Duration, Effect, Layer, Option, Ref, Stream } from "effect";
import * as Semaphore from "effect/Semaphore";
import {
  makeDrainableWorker,
  startDrainableWorkerProducers,
} from "@harnessos/shared/DrainableWorker";
import { isPotentiallyVisibleEngineRuntimeActivity } from "@harnessos/shared/engineActivityVisibility";
import { buildStalePendingRequestFailureDetail } from "@harnessos/shared/threadSummary";
import {
  buildSubagentIdentityDirectory,
  collectSubagentEngineThreadIds,
  extractSubagentIdentityHints,
  resolveSubagentIdentityFromDirectory,
} from "@harnessos/shared/subagents";

import {
  generatedImageMarkdown,
  generatedImagePathFromRuntimeEvent,
  isCodexGeneratedImageArtifact,
} from "../../codexGeneratedImages.ts";
import { copyAndAttributeStudioGeneratedImage } from "../../studioGeneratedImages.ts";
import { clearWorkspaceIndexCache } from "../../workspaceEntries.ts";
import { parseCheckpointFilesFromUnifiedDiff } from "../../checkpointing/Diffs.ts";
import { EngineSessionRuntimeRepositoryLive } from "../../persistence/Layers/EngineSessionRuntime.ts";
import { EngineSessionDirectoryLive } from "../../engine/Layers/EngineSessionDirectory.ts";
import { EngineService } from "../../engine/Services/EngineService.ts";
import { EngineSessionDirectory } from "../../engine/Services/EngineSessionDirectory.ts";
import { activeThreadGoal } from "../../engine/goalMode.ts";
import {
  isEngineInterruptTurnSettlement,
  ENGINE_INTERRUPT_RUNTIME_FENCED_EVENT,
} from "../../engine/engineInterruptSettlement.ts";
import {
  classifyTerminalTurnApplicability,
  isStartedTurnApplicable,
} from "../../engine/terminalTurnApplicability.ts";
import { ProjectionTurnRepository } from "../../persistence/Services/ProjectionTurns.ts";
import { ProjectionTurnRepositoryLive } from "../../persistence/Layers/ProjectionTurns.ts";
import { ProjectionPendingInteractionRepository } from "../../persistence/Services/ProjectionPendingInteractions.ts";
import { ProjectionPendingInteractionRepositoryLive } from "../../persistence/Layers/ProjectionPendingInteractions.ts";
import { EngineRuntimeEventRepositoryLive } from "../../persistence/Layers/EngineRuntimeEvents.ts";
import { OrchestrationCommandReceiptRepositoryLive } from "../../persistence/Layers/OrchestrationCommandReceipts.ts";
import { OrchestrationCommandReceiptRepository } from "../../persistence/Services/OrchestrationCommandReceipts.ts";
import {
  ENGINE_RUNTIME_INGESTION_CONSUMER,
  EngineRuntimeEventRepository,
  type PersistedEngineRuntimeEvent,
} from "../../persistence/Services/EngineRuntimeEvents.ts";
import { resolveThreadWorkspaceCwd } from "../../checkpointing/Utils.ts";
import { isGitRepository } from "../../git/isRepo.ts";
import {
  OrchestrationCommandIdentityCollisionError,
  OrchestrationCommandPreviouslyRejectedError,
} from "../Errors.ts";
import { makeRuntimeJournalPoisonGate } from "../runtimeJournalPoisonGate.ts";
import { OrchestrationEngineService } from "../Services/OrchestrationEngine.ts";
import {
  ProjectionSnapshotQuery,
  type ProjectionGeneratedImageActivityRecord,
} from "../Services/ProjectionSnapshotQuery.ts";
import {
  EngineRuntimeIngestionService,
  type EngineRuntimeIngestionShape,
} from "../Services/EngineRuntimeIngestion.ts";
import {
  MAX_REASONING_ACTIVITY_DETAIL_CHARS,
  projectProviderRuntimeActivities,
  providerActivityUpdateDedupeKey,
  providerActivityUpdateFingerprint,
  readableReasoningDetail,
  runtimePayloadRecord,
  runtimeTurnState,
} from "../engineRuntimeActivityProjection.ts";

// FILE: EngineRuntimeIngestion.ts
// Purpose: Projects engine runtime events into orchestration read-model updates and thread activity.
// Layer: Server orchestration ingestion
// Exports: EngineRuntimeIngestionLive
// Depends on: EngineRuntimeEvent contracts, OrchestrationEngine, Projection repositories

const providerTurnKey = (threadId: ThreadId, turnId: TurnId) => `${threadId}:${turnId}`;
const providerCommandId = (event: EngineRuntimeEvent, tag: string, target = "event"): CommandId =>
  CommandId.makeUnsafe(`engine:${event.eventId}:${tag}:${target}`);

// Delivery-mode binding is in-memory. If a restart or missing lifecycle event
// loses that binding, fail toward live output; only an explicit buffered
// dispatch may withhold text until completion.
const DEFAULT_ASSISTANT_DELIVERY_MODE: AssistantDeliveryMode = "streaming";
const ENGINE_REPLACEMENT_RESTORE_FAILED_EVENT = "engine.replacement.restore.failed";
const ENGINE_RUNTIME_INGESTION_CAPACITY = 1_024;
const ENGINE_RUNTIME_REPLAY_PAGE_SIZE = 128;
const ENGINE_RUNTIME_REPLAY_POLL_MIN_MS = 250;
const ENGINE_RUNTIME_REPLAY_POLL_MAX_MS = 5_000;
const TURN_MESSAGE_IDS_BY_TURN_CACHE_CAPACITY = 2_048;
const TURN_MESSAGE_IDS_BY_TURN_TTL = Duration.minutes(60);
const BUFFERED_MESSAGE_TEXT_BY_MESSAGE_ID_CACHE_CAPACITY = 1_024;
const BUFFERED_MESSAGE_TEXT_BY_MESSAGE_ID_TTL = Duration.minutes(60);
const BUFFERED_PROPOSED_PLAN_BY_ID_CACHE_CAPACITY = 1_024;
const BUFFERED_PROPOSED_PLAN_BY_ID_TTL = Duration.minutes(60);
const BUFFERED_TOOL_OUTPUT_BY_KEY_CACHE_CAPACITY = 2_048;
const BUFFERED_TOOL_OUTPUT_BY_KEY_TTL = Duration.minutes(60);
const BUFFERED_REASONING_SUMMARY_BY_KEY_CACHE_CAPACITY = 2_048;
const BUFFERED_REASONING_SUMMARY_BY_KEY_TTL = Duration.minutes(60);
const REASONING_ACTIVITY_UPDATE_INTERVAL_MS = 100;
const PENDING_GENERATED_IMAGES_CACHE_CAPACITY = 512;
// Hot-path cache only. Turn settlement also reads durable activity records, so
// TTL expiry or a server restart cannot discard the transcript reference.
const PENDING_GENERATED_IMAGES_TTL = Duration.minutes(60);
const ACTIVITY_UPDATE_FINGERPRINT_CACHE_CAPACITY = 4_096;
const ACTIVITY_UPDATE_FINGERPRINT_TTL = Duration.minutes(360);
const MAX_NATIVE_CHILDREN_PER_PARENT_TURN = 20;
const NATIVE_CHILD_IDS_BY_SOURCE_TURN_CACHE_CAPACITY = 2_048;
const NATIVE_CHILD_IDS_BY_SOURCE_TURN_TTL = Duration.minutes(360);
const ASSISTANT_DELIVERY_MODE_BY_TURN_CACHE_CAPACITY = 2_048;
const ASSISTANT_DELIVERY_MODE_BY_TURN_TTL = Duration.minutes(60);
// One turn realistically produces a handful of images; the cap only bounds a
// pathological engine replaying image completions in a loop.
const MAX_PENDING_GENERATED_IMAGES_PER_TURN = 32;
const MAX_BUFFERED_ASSISTANT_CHARS = 24_000;
const MAX_BUFFERED_PROPOSED_PLAN_CHARS = 64_000;
const MAX_BUFFERED_TOOL_OUTPUT_CHARS = 24_000;
const MAX_BUFFERED_REASONING_SUMMARY_PARTS = 24;
const BUFFERED_TEXT_TRUNCATION_MARKER = "... [truncated]";
const STRICT_PROVIDER_LIFECYCLE_GUARD =
  process.env.HARNESSOS_STRICT_PROVIDER_LIFECYCLE_GUARD !== "0";

function isCanonicalWorkspaceFileChangeEvent(event: EngineRuntimeEvent): boolean {
  return (
    (event.type === "item.started" ||
      event.type === "item.updated" ||
      event.type === "item.completed") &&
    event.payload.itemType === "file_change"
  );
}

/**
 * Back off the durable-journal safety poll while the live persisted-event
 * stream is healthy and the consumer is caught up. Live events still drain
 * immediately; this poll only recovers rows whose notification was missed.
 */
export function nextRuntimeJournalSafetyPollDelayMs(
  currentDelayMs: number,
  hadBacklog: boolean,
): number {
  if (hadBacklog) return ENGINE_RUNTIME_REPLAY_POLL_MIN_MS;
  return Math.min(
    ENGINE_RUNTIME_REPLAY_POLL_MAX_MS,
    Math.max(ENGINE_RUNTIME_REPLAY_POLL_MIN_MS, currentDelayMs * 2),
  );
}

type RuntimeIngestionDomainEvent = Extract<
  OrchestrationEvent,
  {
    type: "thread.turn-start-requested" | "thread.reverted" | "thread.conversation-rolled-back";
  }
>;

type RuntimeIngestionInput =
  | {
      source: "runtime";
      sequence: number;
      event: EngineRuntimeEvent;
    }
  | {
      source: "domain";
      event: RuntimeIngestionDomainEvent;
    }
  | {
      source: "reasoning-flush";
      key: string;
      generation: number;
    };

type BufferedToolOutput = {
  readonly text: string;
  readonly truncated: boolean;
};
type BufferedReasoningSummary = {
  readonly parts: ReadonlyMap<number, string>;
  readonly sourceEvent: Extract<EngineRuntimeEvent, { readonly type: "content.delta" }>;
  readonly firstRuntimeSequence: number | undefined;
  readonly lastRuntimeSequence: number;
  readonly lastPublishedAtMs: number | undefined;
  readonly flushGeneration: number;
  readonly truncated: boolean;
  readonly segmented: boolean;
};
type AssistantDeliveryModeBindingState = {
  readonly pendingModesByThreadId: ReadonlyMap<ThreadId, ReadonlyArray<AssistantDeliveryMode>>;
  readonly unmatchedTurnIdsByThreadId: ReadonlyMap<ThreadId, ReadonlyArray<TurnId>>;
  readonly settledUnmatchedRequestDebtByThreadId: ReadonlyMap<ThreadId, number>;
};
type EngineDiffPlaceholder = {
  readonly checkpointRef: CheckpointRef;
  readonly checkpointTurnCount: number;
  // Immutable snapshot of the turn's diff files. Stored values are only ever read
  // (forwarded to dispatch / re-stored), never mutated in place, so this is a
  // ReadonlyArray — which also lets it accept the readonly `checkpoint.files` from
  // an OrchestrationThread without a defensive copy.
  readonly files: ReadonlyArray<OrchestrationCheckpointFile>;
};
type NativeChildSlotState = {
  initialized: boolean;
  readonly childIds: Set<string>;
};

/**
 * Promote a cheap thread *shell* into a full {@link OrchestrationThread} by
 * filling the heavy arrays with empties. Only valid for events that do not read
 * those arrays (see {@link eventNeedsHeavyThreadDetail}); the empties are never
 * observed on those code paths.
 */
function threadDetailFromShell(shell: OrchestrationThreadShell): OrchestrationThread {
  return {
    ...shell,
    deletedAt: null,
    messages: [],
    proposedPlans: [],
    activities: [],
    checkpoints: [],
  };
}

/**
 * PERF: ingesting one runtime event used to load the full thread detail, which
 * decodes every message's text. For a long turn that streams a large output
 * (tens of thousands of deltas over a growing transcript) this is quadratic, so
 * the live transcript — and crucially the `turn.completed` event — fall minutes
 * behind the engine even though the turn already finished.
 *
 * The overwhelming majority of events (assistant deltas, tool-call lifecycle,
 * message parts) only ever read thread *shell* fields. Only the handlers for the
 * event types below read the heavy arrays (`thread.messages` /
 * `thread.proposedPlans` / `thread.checkpoints`), so only those pay for the full
 * detail; everything else uses the cheap shell.
 */
function eventNeedsHeavyThreadDetail(event: EngineRuntimeEvent): boolean {
  if (event.type === "item.completed") {
    // assistant_message completion reads thread.messages to decide whether to
    // apply fallback completion text; image_generation completion scans
    // thread.messages to attach the generated-image reference.
    return (
      event.payload.itemType === "assistant_message" ||
      generatedImagePathFromRuntimeEvent(event) !== undefined
    );
  }
  // Session exits and runtime errors flush the turn's pending generated images
  // into the terminal assistant message, which requires thread.messages.
  return (
    event.type === "turn.proposed.completed" ||
    event.type === "turn.completed" ||
    event.type === "turn.aborted" ||
    event.type === "turn.diff.updated" ||
    event.type === "session.exited" ||
    event.type === "runtime.error"
  );
}

function parseProviderTurnDiffFiles(
  unifiedDiff: string,
): Effect.Effect<OrchestrationCheckpointFile[] | null> {
  return parseCheckpointFilesFromUnifiedDiff(unifiedDiff).pipe(
    Effect.catchCause(() => Effect.succeed(null)),
  );
}

function toTurnId(value: TurnId | string | undefined): TurnId | undefined {
  return value === undefined ? undefined : TurnId.makeUnsafe(String(value));
}

function sameId(left: string | null | undefined, right: string | null | undefined): boolean {
  return typeof left === "string" && typeof right === "string" && left === right;
}

export function appendCappedBufferedText(existing: string, delta: string, limit: number): string {
  const normalizedLimit = Math.max(0, Math.floor(limit));
  if (normalizedLimit === 0) {
    return "";
  }
  const next = `${existing}${delta}`;
  if (next.length <= normalizedLimit) {
    return next;
  }
  if (normalizedLimit <= BUFFERED_TEXT_TRUNCATION_MARKER.length) {
    return BUFFERED_TEXT_TRUNCATION_MARKER.slice(0, normalizedLimit);
  }
  return `${next.slice(
    0,
    normalizedLimit - BUFFERED_TEXT_TRUNCATION_MARKER.length,
  )}${BUFFERED_TEXT_TRUNCATION_MARKER}`;
}

function appendCappedProviderText(existing: string, delta: string, limit: number): string {
  const normalizedLimit = Math.max(0, Math.floor(limit));
  return `${existing}${delta}`.slice(0, normalizedLimit);
}

function assistantMessageSegmentKey(threadId: ThreadId, messageId: MessageId): string {
  return JSON.stringify([threadId, messageId]);
}

function reasoningSummaryBufferKey(
  event: EngineRuntimeEvent,
  threadId = event.threadId,
): string | null {
  if (!supportsReadableReasoningProjection(event.engine) || !event.itemId) {
    return null;
  }
  if (
    event.type === "content.delta" &&
    isReadableReasoningDelta(event.engine, event.payload.streamKind)
  ) {
    return [threadId, event.turnId ?? "no-turn", event.itemId].join(":");
  }
  if (
    (event.type === "item.started" ||
      event.type === "item.updated" ||
      event.type === "item.completed") &&
    event.payload.itemType === "reasoning"
  ) {
    return [threadId, event.turnId ?? "no-turn", event.itemId].join(":");
  }
  return null;
}

function supportsReadableReasoningProjection(engine: EngineKind): boolean {
  return engine === "codex" || engine === "antigravity" || engine === "oa" || engine === "pi";
}

function isReadableReasoningDelta(engine: EngineKind, streamKind: string): boolean {
  return engine === "codex"
    ? streamKind === "reasoning_summary_text"
    : supportsReadableReasoningProjection(engine) && streamKind === "reasoning_text";
}

function joinedBufferedReasoningSummary(
  summary: BufferedReasoningSummary | undefined,
): string | undefined {
  if (!summary) return undefined;
  return readableReasoningDetail(
    Array.from(summary.parts.entries())
      .sort(([left], [right]) => left - right)
      .map(([, text]) => text.trim())
      .filter((text) => text.length > 0)
      .join("\n\n"),
  );
}

function bufferedReasoningSegmentItemId(summary: BufferedReasoningSummary): string | undefined {
  const sourceItemId = summary.sourceEvent.itemId;
  return sourceItemId === undefined || summary.firstRuntimeSequence === undefined
    ? undefined
    : `${sourceItemId}:turn:${summary.sourceEvent.turnId ?? "no-turn"}:segment:${summary.firstRuntimeSequence}`;
}

function withBufferedReasoningSummary(
  event: EngineRuntimeEvent,
  summary: BufferedReasoningSummary | undefined,
  preferBufferedDetail = false,
): EngineRuntimeEvent {
  if (
    event.type !== "item.completed" ||
    !supportsReadableReasoningProjection(event.engine) ||
    event.payload.itemType !== "reasoning"
  ) {
    return event;
  }
  const bufferedDetail = joinedBufferedReasoningSummary(summary);
  const detail =
    !preferBufferedDetail && readableReasoningDetail(event.payload.detail)
      ? event.payload.detail
      : bufferedDetail;
  const segmentItemId = summary ? bufferedReasoningSegmentItemId(summary) : undefined;
  if (!detail && !segmentItemId) {
    return event;
  }
  return {
    ...event,
    ...(segmentItemId
      ? { itemId: segmentItemId as NonNullable<EngineRuntimeEvent["itemId"]> }
      : {}),
    payload: {
      ...event.payload,
      ...(detail ? { detail } : {}),
      ...(summary?.truncated
        ? {
            data: {
              ...(isJsonObject(event.payload.data) ? event.payload.data : {}),
              reasoningDetailTruncated: true,
            },
          }
        : {}),
    },
  };
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function mergeBufferedToolOutputData(
  data: unknown,
  bufferedOutput: BufferedToolOutput,
): Record<string, unknown> {
  const baseData = isJsonObject(data) ? data : {};
  const existingRawOutput = isJsonObject(baseData.rawOutput)
    ? baseData.rawOutput
    : typeof baseData.rawOutput === "string" && baseData.rawOutput.trim().length > 0
      ? { output: baseData.rawOutput }
      : {};
  const hasStructuredOutput =
    hasNonEmptyString(existingRawOutput.output) ||
    hasNonEmptyString(existingRawOutput.stdout) ||
    hasNonEmptyString(existingRawOutput.stderr);
  return {
    ...baseData,
    rawOutput: {
      ...existingRawOutput,
      ...(hasStructuredOutput ? {} : { output: bufferedOutput.text }),
      ...(bufferedOutput.truncated ? { truncated: true } : {}),
    },
  };
}

function withBufferedToolOutputData(
  event: EngineRuntimeEvent,
  bufferedOutput: BufferedToolOutput | undefined,
): EngineRuntimeEvent {
  if (!bufferedOutput) {
    return event;
  }
  if (event.type !== "item.updated" && event.type !== "item.completed") {
    return event;
  }
  if (event.payload.itemType !== "command_execution" && event.payload.itemType !== "file_change") {
    return event;
  }
  return {
    ...event,
    payload: {
      ...event.payload,
      data: mergeBufferedToolOutputData(event.payload.data, bufferedOutput),
    },
  } as EngineRuntimeEvent;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeNonEmptyString(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function hasRenderableAssistantText(text: string | undefined): boolean {
  return (text?.trim().length ?? 0) > 0;
}

function proposedPlanIdForTurn(threadId: ThreadId, turnId: TurnId): string {
  return `plan:${threadId}:turn:${turnId}`;
}

function proposedPlanIdFromEvent(event: EngineRuntimeEvent, threadId: ThreadId): string {
  const turnId = toTurnId(event.turnId);
  if (turnId) {
    return proposedPlanIdForTurn(threadId, turnId);
  }
  if (event.itemId) {
    return `plan:${threadId}:item:${event.itemId}`;
  }
  return `plan:${threadId}:event:${event.eventId}`;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return isJsonObject(value) ? value : undefined;
}

/**
 * Resolves persisted image tool records to their durable display paths. Studio
 * copies add a source -> workspace-path marker; non-Studio images keep the
 * engine artifact path. The query supplying these records is turn-scoped and
 * independent of the bounded thread-detail activity window.
 */
export function collectPersistedGeneratedImagePaths(
  records: ReadonlyArray<ProjectionGeneratedImageActivityRecord>,
): string[] {
  const studioDisplayPathBySourcePath = new Map<string, string>();
  for (const record of records) {
    if (record.kind !== STUDIO_OUTPUTS_ACTIVITY_KIND) {
      continue;
    }
    const payload = asObject(record.payload);
    const data = asObject(payload?.data);
    const generatedImage = asObject(data?.generatedImage);
    const sourcePath = asString(generatedImage?.sourcePath)?.trim();
    const fullPath = asString(generatedImage?.fullPath)?.trim();
    if (sourcePath && fullPath) {
      studioDisplayPathBySourcePath.set(sourcePath, fullPath);
    }
  }

  const paths: string[] = [];
  const seenPaths = new Set<string>();
  const representedSourcePaths = new Set<string>();
  const addPath = (path: string) => {
    if (!seenPaths.has(path)) {
      seenPaths.add(path);
      paths.push(path);
    }
  };

  for (const record of records) {
    if (record.kind !== "tool.completed") {
      continue;
    }
    const payload = asObject(record.payload);
    if (payload?.itemType !== "image_generation") {
      continue;
    }
    const artifact = isCodexGeneratedImageArtifact(payload.data) ? payload.data : undefined;
    if (!artifact) {
      continue;
    }
    representedSourcePaths.add(artifact.path);
    addPath(studioDisplayPathBySourcePath.get(artifact.path) ?? artifact.path);
  }

  // A Studio marker can survive even if a engine's corresponding tool row was
  // pruned or malformed. It is image-specific, so retaining the copied path is safe.
  for (const [sourcePath, fullPath] of studioDisplayPathBySourcePath) {
    if (!representedSourcePaths.has(sourcePath)) {
      addPath(fullPath);
    }
  }

  return paths;
}

interface SubagentIdentity {
  readonly nativeThreadId: string;
  readonly agentId?: string;
  readonly nickname?: string;
  readonly role?: string;
  readonly model?: string;
  readonly modelIsRequestedHint?: boolean;
}

function extractCollabPayload(event: EngineRuntimeEvent): Record<string, unknown> | undefined {
  const payload = runtimePayloadRecord(event);
  return asObject(payload?.data);
}

function extractSubagentIdentity(
  event: EngineRuntimeEvent,
  nativeThreadId: string,
): SubagentIdentity | undefined {
  const collabPayload = extractCollabPayload(event);
  const item = asObject(collabPayload?.item) ?? collabPayload;
  if (!item) {
    return undefined;
  }
  return resolveSubagentIdentityFromDirectory(
    buildSubagentIdentityDirectory(extractSubagentIdentityHints(item)),
    {
      nativeThreadId,
    },
  ) as SubagentIdentity | undefined;
}

function subagentThreadTitle(identity: {
  nickname?: string | undefined;
  role?: string | undefined;
  nativeThreadId?: string | undefined;
}): string {
  if (identity.nickname && identity.role) {
    return `${identity.nickname} [${identity.role}]`;
  }
  if (identity.nickname) {
    return identity.nickname;
  }
  if (identity.role) {
    return `Subagent [${identity.role}]`;
  }
  return identity.nativeThreadId ? `Subagent ${identity.nativeThreadId}` : "Subagent";
}

const takeCached = <Key, Value>(cache: Cache.Cache<Key, Value>, key: Key) =>
  Cache.getOption(cache, key).pipe(
    Effect.flatMap((value) => Cache.invalidate(cache, key).pipe(Effect.as(value))),
  );

export function selectProviderRuntimeJournalStream(input: {
  readonly streamEvents: Stream.Stream<EngineRuntimeEvent>;
  readonly streamPersistedEvents?: Stream.Stream<PersistedEngineRuntimeEvent>;
  readonly append: (
    event: EngineRuntimeEvent,
  ) => Effect.Effect<PersistedEngineRuntimeEvent, unknown>;
}) {
  return (
    input.streamPersistedEvents ??
    input.streamEvents.pipe(
      Stream.mapEffect((event) =>
        input.append(event).pipe(
          Effect.catchCause((cause) =>
            Cause.hasInterruptsOnly(cause)
              ? Effect.failCause(cause)
              : Effect.logWarning("engine runtime event journal ingestion failed", {
                  eventId: event.eventId,
                  eventType: event.type,
                  cause: Cause.pretty(cause),
                }).pipe(Effect.as(undefined)),
          ),
        ),
      ),
      Stream.filter(
        (persisted): persisted is NonNullable<typeof persisted> => persisted !== undefined,
      ),
    )
  );
}

const make = Effect.gen(function* () {
  const orchestrationEngine = yield* OrchestrationEngineService;
  const projectionSnapshotQuery = yield* ProjectionSnapshotQuery;
  const engineService = yield* EngineService;
  const engineSessionDirectory = yield* EngineSessionDirectory;
  const projectionTurnRepository = yield* ProjectionTurnRepository;
  const pendingInteractions = yield* ProjectionPendingInteractionRepository;
  const runtimeEvents = yield* EngineRuntimeEventRepository;
  const commandReceipts = yield* OrchestrationCommandReceiptRepository;
  const outstandingTurnIdsByThreadRef = yield* Ref.make<ReadonlyMap<ThreadId, ReadonlySet<TurnId>>>(
    new Map(),
  );

  const rememberOutstandingTurn = (threadId: ThreadId, turnId: TurnId) =>
    Ref.update(outstandingTurnIdsByThreadRef, (state) => {
      const next = new Map(state);
      next.set(threadId, new Set([...(next.get(threadId) ?? []), turnId]));
      return next;
    });
  const forgetOutstandingTurn = (threadId: ThreadId, turnId: TurnId) =>
    Ref.update(outstandingTurnIdsByThreadRef, (state) => {
      const current = state.get(threadId);
      if (!current?.has(turnId)) return state;
      const next = new Map(state);
      const remaining = new Set(current);
      remaining.delete(turnId);
      if (remaining.size === 0) next.delete(threadId);
      else next.set(threadId, remaining);
      return next;
    });
  const clearOutstandingTurns = (threadId: ThreadId) =>
    Ref.update(outstandingTurnIdsByThreadRef, (state) => {
      if (!state.has(threadId)) return state;
      const next = new Map(state);
      next.delete(threadId);
      return next;
    });

  // Match request modes and engine turn ids from either arrival direction.
  // Engine turns and domain events can race, and EngineService permits more
  // than one outstanding send per thread, so neither a global mode nor the
  // session's generic active turn is a valid correlation key.
  const assistantDeliveryModeBindingsRef = yield* Ref.make<AssistantDeliveryModeBindingState>({
    pendingModesByThreadId: new Map(),
    unmatchedTurnIdsByThreadId: new Map(),
    settledUnmatchedRequestDebtByThreadId: new Map(),
  });
  const cloneAssistantDeliveryModeBindings = (state: AssistantDeliveryModeBindingState) => ({
    pendingModesByThreadId: new Map(state.pendingModesByThreadId),
    unmatchedTurnIdsByThreadId: new Map(state.unmatchedTurnIdsByThreadId),
    settledUnmatchedRequestDebtByThreadId: new Map(state.settledUnmatchedRequestDebtByThreadId),
  });
  const shiftThreadQueue = <Value>(
    queues: Map<ThreadId, ReadonlyArray<Value>>,
    threadId: ThreadId,
  ): Value | undefined => {
    const values = queues.get(threadId) ?? [];
    const value = values[0];
    if (value === undefined) return undefined;
    if (values.length === 1) queues.delete(threadId);
    else queues.set(threadId, values.slice(1));
    return value;
  };
  const assistantDeliveryModeByTurnKey = yield* Cache.make<string, AssistantDeliveryMode>({
    capacity: ASSISTANT_DELIVERY_MODE_BY_TURN_CACHE_CAPACITY,
    timeToLive: ASSISTANT_DELIVERY_MODE_BY_TURN_TTL,
    lookup: () => Effect.succeed(DEFAULT_ASSISTANT_DELIVERY_MODE),
  });

  const matchAssistantDeliveryModeRequest = (threadId: ThreadId, mode: AssistantDeliveryMode) =>
    Effect.gen(function* () {
      const matchedTurnId = yield* Ref.modify(assistantDeliveryModeBindingsRef, (state) => {
        const nextState = cloneAssistantDeliveryModeBindings(state);
        const {
          pendingModesByThreadId,
          unmatchedTurnIdsByThreadId,
          settledUnmatchedRequestDebtByThreadId,
        } = nextState;
        const settledRequestDebt = settledUnmatchedRequestDebtByThreadId.get(threadId) ?? 0;
        if (settledRequestDebt > 0) {
          if (settledRequestDebt === 1) {
            settledUnmatchedRequestDebtByThreadId.delete(threadId);
          } else {
            settledUnmatchedRequestDebtByThreadId.set(threadId, settledRequestDebt - 1);
          }
          return [undefined, nextState] as const;
        }
        const unmatchedTurnId = shiftThreadQueue(unmatchedTurnIdsByThreadId, threadId);
        if (!unmatchedTurnId) {
          pendingModesByThreadId.set(threadId, [
            ...(pendingModesByThreadId.get(threadId) ?? []),
            mode,
          ]);
        }
        return [unmatchedTurnId, nextState] as const;
      });
      if (matchedTurnId) {
        yield* Cache.set(
          assistantDeliveryModeByTurnKey,
          providerTurnKey(threadId, matchedTurnId),
          mode,
        );
      }
      return matchedTurnId;
    });

  const matchStartedTurnAssistantDeliveryMode = (
    threadId: ThreadId,
    turnId: TurnId,
    options: { readonly recordUnmatched?: boolean } = {},
  ) =>
    Effect.gen(function* () {
      const key = providerTurnKey(threadId, turnId);
      if (Option.isSome(yield* Cache.getOption(assistantDeliveryModeByTurnKey, key))) {
        return;
      }
      const mode = yield* Ref.modify(assistantDeliveryModeBindingsRef, (state) => {
        const nextState = cloneAssistantDeliveryModeBindings(state);
        const {
          pendingModesByThreadId,
          unmatchedTurnIdsByThreadId,
          settledUnmatchedRequestDebtByThreadId,
        } = nextState;
        const pendingMode = shiftThreadQueue(pendingModesByThreadId, threadId);
        if (pendingMode === undefined) {
          if (options.recordUnmatched === false) {
            // A turn observed before its request may already be waiting on the
            // unmatched side. Once that exact turn terminates it must not be
            // claimable by a later, unrelated request.
            const unmatchedTurnIds = unmatchedTurnIdsByThreadId.get(threadId) ?? [];
            const remainingTurnIds = unmatchedTurnIds.filter(
              (unmatchedTurnId) => unmatchedTurnId !== turnId,
            );
            if (remainingTurnIds.length === 0) {
              unmatchedTurnIdsByThreadId.delete(threadId);
            } else if (remainingTurnIds.length !== unmatchedTurnIds.length) {
              unmatchedTurnIdsByThreadId.set(threadId, remainingTurnIds);
            }
            if (remainingTurnIds.length !== unmatchedTurnIds.length) {
              settledUnmatchedRequestDebtByThreadId.set(
                threadId,
                (settledUnmatchedRequestDebtByThreadId.get(threadId) ?? 0) + 1,
              );
            }
            return [undefined, nextState] as const;
          }
          const unmatchedTurnIds = unmatchedTurnIdsByThreadId.get(threadId) ?? [];
          if (!unmatchedTurnIds.includes(turnId)) {
            unmatchedTurnIdsByThreadId.set(threadId, [...unmatchedTurnIds, turnId]);
          }
          return [undefined, nextState] as const;
        }
        return [pendingMode, nextState] as const;
      });
      if (mode) {
        yield* Cache.set(assistantDeliveryModeByTurnKey, key, mode);
      }
    });

  const getAssistantDeliveryMode = (threadId: ThreadId, turnId: TurnId | undefined) =>
    turnId
      ? Cache.getOption(assistantDeliveryModeByTurnKey, providerTurnKey(threadId, turnId)).pipe(
          Effect.map(Option.getOrElse(() => DEFAULT_ASSISTANT_DELIVERY_MODE)),
        )
      : Effect.succeed(DEFAULT_ASSISTANT_DELIVERY_MODE);

  const clearAssistantDeliveryModeBindingsForThread = (threadId: ThreadId) =>
    Ref.update(assistantDeliveryModeBindingsRef, (state) => {
      if (
        !state.pendingModesByThreadId.has(threadId) &&
        !state.unmatchedTurnIdsByThreadId.has(threadId) &&
        !state.settledUnmatchedRequestDebtByThreadId.has(threadId)
      ) {
        return state;
      }
      const nextState = cloneAssistantDeliveryModeBindings(state);
      nextState.pendingModesByThreadId.delete(threadId);
      nextState.unmatchedTurnIdsByThreadId.delete(threadId);
      nextState.settledUnmatchedRequestDebtByThreadId.delete(threadId);
      return nextState;
    });

  const turnMessageIdsByTurnKey = yield* Cache.make<string, Set<MessageId>>({
    capacity: TURN_MESSAGE_IDS_BY_TURN_CACHE_CAPACITY,
    timeToLive: TURN_MESSAGE_IDS_BY_TURN_TTL,
    lookup: () => Effect.succeed(new Set<MessageId>()),
  });

  const bufferedAssistantTextByMessageId = yield* Cache.make<MessageId, string>({
    capacity: BUFFERED_MESSAGE_TEXT_BY_MESSAGE_ID_CACHE_CAPACITY,
    timeToLive: BUFFERED_MESSAGE_TEXT_BY_MESSAGE_ID_TTL,
    lookup: () => Effect.succeed(""),
  });

  const bufferedProposedPlanById = yield* Cache.make<string, { text: string; createdAt: string }>({
    capacity: BUFFERED_PROPOSED_PLAN_BY_ID_CACHE_CAPACITY,
    timeToLive: BUFFERED_PROPOSED_PLAN_BY_ID_TTL,
    lookup: () => Effect.succeed({ text: "", createdAt: "" }),
  });
  const bufferedToolOutputByKey = yield* Cache.make<string, BufferedToolOutput | undefined>({
    capacity: BUFFERED_TOOL_OUTPUT_BY_KEY_CACHE_CAPACITY,
    timeToLive: BUFFERED_TOOL_OUTPUT_BY_KEY_TTL,
    lookup: () => Effect.succeed(undefined),
  });
  const bufferedReasoningSummaryByKey = yield* Cache.make<
    string,
    BufferedReasoningSummary | undefined
  >({
    capacity: BUFFERED_REASONING_SUMMARY_BY_KEY_CACHE_CAPACITY,
    timeToLive: BUFFERED_REASONING_SUMMARY_BY_KEY_TTL,
    lookup: () => Effect.succeed(undefined),
  });
  // Display paths of generated images completed during a still-running turn, keyed by
  // providerTurnKey. Flushed into the turn's terminal assistant message when the turn
  // settles, so the visible final row owns the image instead of collapsed narration.
  const pendingGeneratedImagesByTurnKey = yield* Cache.make<string, ReadonlyArray<string>>({
    capacity: PENDING_GENERATED_IMAGES_CACHE_CAPACITY,
    timeToLive: PENDING_GENERATED_IMAGES_TTL,
    lookup: () => Effect.succeed([]),
  });
  const latestActivityUpdateFingerprintByKey = yield* Cache.make<string, string | undefined>({
    capacity: ACTIVITY_UPDATE_FINGERPRINT_CACHE_CAPACITY,
    timeToLive: ACTIVITY_UPDATE_FINGERPRINT_TTL,
    lookup: () => Effect.succeed(undefined),
  });
  const providerDiffPlaceholdersRef = yield* Ref.make(new Map<string, EngineDiffPlaceholder>());
  const nativeChildIdsBySourceTurn = yield* Cache.make<string, NativeChildSlotState>({
    capacity: NATIVE_CHILD_IDS_BY_SOURCE_TURN_CACHE_CAPACITY,
    timeToLive: NATIVE_CHILD_IDS_BY_SOURCE_TURN_TTL,
    lookup: () => Effect.succeed({ initialized: false, childIds: new Set<string>() }),
  });

  const claimNativeChildSlot = Effect.fnUntraced(function* (
    parentThreadId: ThreadId,
    sourceTurnId: TurnId | null,
    childThreadId: ThreadId,
  ) {
    const budgetKey = `${parentThreadId}:${sourceTurnId ?? "session"}`;
    const slotState = yield* Cache.get(nativeChildIdsBySourceTurn, budgetKey);
    if (!slotState.initialized) {
      const snapshot = yield* projectionSnapshotQuery.getShellSnapshot();
      for (const thread of snapshot.threads) {
        if (
          thread.parentThreadId === parentThreadId &&
          (thread.sourceTurnId ?? null) === sourceTurnId
        ) {
          slotState.childIds.add(thread.id);
        }
      }
      slotState.initialized = true;
    }
    const childIds = slotState.childIds;
    if (childIds.has(childThreadId)) {
      return { admitted: true, budgetKey } as const;
    }
    if (childIds.size >= MAX_NATIVE_CHILDREN_PER_PARENT_TURN) {
      return { admitted: false, budgetKey } as const;
    }
    childIds.add(childThreadId);
    return { admitted: true, budgetKey } as const;
  });

  const dispatchActivityUpdate = Effect.fnUntraced(function* (
    event: EngineRuntimeEvent,
    threadId: ThreadId,
    activity: OrchestrationThreadActivity,
  ) {
    const key = providerActivityUpdateDedupeKey(event, threadId, activity);
    const fingerprint = key ? providerActivityUpdateFingerprint(activity) : undefined;
    if (key && fingerprint) {
      const previous = yield* Cache.getOption(latestActivityUpdateFingerprintByKey, key);
      if (Option.isSome(previous) && previous.value === fingerprint) {
        return;
      }
    }

    yield* orchestrationEngine.dispatch(
      {
        type: "thread.activity.append",
        commandId: providerCommandId(
          event,
          "thread-activity-append",
          `${threadId}:${activity.kind}:${activity.id}`,
        ),
        threadId,
        activity,
        createdAt: activity.createdAt,
      },
      { admission: "in-flight-runtime-fact" },
    );
    if (key && fingerprint) {
      yield* Cache.set(latestActivityUpdateFingerprintByKey, key, fingerprint);
    }
  });

  const clearActivityUpdateFingerprints = Effect.fnUntraced(function* (threadId: ThreadId) {
    const keyPrefix = `${threadId}:`;
    yield* Effect.forEach(
      Array.from(yield* Cache.keys(latestActivityUpdateFingerprintByKey)),
      (key) =>
        key.startsWith(keyPrefix)
          ? Cache.invalidate(latestActivityUpdateFingerprintByKey, key)
          : Effect.void,
    );
  });

  const getThreadDetail = Effect.fnUntraced(function* (
    threadId: ThreadId,
  ): Effect.fn.Return<OrchestrationThread | undefined> {
    return Option.getOrUndefined(
      yield* projectionSnapshotQuery
        .getThreadDetailById(threadId)
        .pipe(Effect.catch(() => Effect.succeed(Option.none()))),
    );
  });

  // PERF: cheap counterpart to getThreadDetail for events that never read the
  // heavy thread arrays. Loads only the shell projection and promotes it with
  // empty arrays. See eventNeedsHeavyThreadDetail.
  const getThreadShellDetail = Effect.fnUntraced(function* (
    threadId: ThreadId,
  ): Effect.fn.Return<OrchestrationThread | undefined> {
    const shell = Option.getOrUndefined(
      yield* projectionSnapshotQuery
        .getThreadShellById(threadId)
        .pipe(Effect.catch(() => Effect.succeed(Option.none()))),
    );
    return shell ? threadDetailFromShell(shell) : undefined;
  });

  const getProjectShell = Effect.fnUntraced(function* (
    thread: Pick<OrchestrationThread, "projectId">,
  ): Effect.fn.Return<OrchestrationProjectShell | undefined> {
    return Option.getOrUndefined(
      yield* projectionSnapshotQuery
        .getProjectShellById(thread.projectId)
        .pipe(Effect.catch(() => Effect.succeed(Option.none()))),
    );
  });

  const invalidateWorkspaceIndexForFileChange = Effect.fnUntraced(function* (
    event: EngineRuntimeEvent,
    threadId: ThreadId,
  ) {
    if (!isCanonicalWorkspaceFileChangeEvent(event)) {
      return;
    }
    const thread = yield* getThreadShellDetail(threadId);
    if (!thread) return;
    const project = yield* getProjectShell(thread);
    if (!project) return;
    const cwd = resolveThreadWorkspaceCwd({ thread, projects: [project] });
    if (cwd) {
      clearWorkspaceIndexCache(cwd);
    }
  });

  const isGitRepoForThread = Effect.fnUntraced(function* (threadId: ThreadId) {
    const thread = yield* getThreadDetail(threadId);
    if (!thread) {
      return false;
    }
    const project = yield* getProjectShell(thread);
    if (!project) {
      return false;
    }
    const workspaceCwd = resolveThreadWorkspaceCwd({
      thread,
      projects: [project],
    });
    if (!workspaceCwd) {
      return false;
    }
    return isGitRepository(workspaceCwd);
  });

  const supportsLiveTurnDiffPatch = Effect.fnUntraced(function* (
    engine: EngineRuntimeEvent["engine"],
  ) {
    const capabilities = yield* engineService
      .getCapabilities(engine)
      .pipe(Effect.catch(() => Effect.succeed(null)));
    return capabilities?.supportsLiveTurnDiffPatch === true;
  });

  const clearProviderDiffPlaceholder = (threadId: ThreadId, turnId: TurnId) =>
    Ref.update(providerDiffPlaceholdersRef, (placeholders) => {
      const next = new Map(placeholders);
      next.delete(providerTurnKey(threadId, turnId));
      return next;
    });

  const rememberAssistantMessageId = (threadId: ThreadId, turnId: TurnId, messageId: MessageId) =>
    Cache.getOption(turnMessageIdsByTurnKey, providerTurnKey(threadId, turnId)).pipe(
      Effect.flatMap((existingIds) =>
        Cache.set(
          turnMessageIdsByTurnKey,
          providerTurnKey(threadId, turnId),
          Option.match(existingIds, {
            onNone: () => new Set([messageId]),
            onSome: (ids) => {
              const nextIds = new Set(ids);
              nextIds.add(messageId);
              return nextIds;
            },
          }),
        ),
      ),
    );

  const forgetAssistantMessageId = (threadId: ThreadId, turnId: TurnId, messageId: MessageId) =>
    Cache.getOption(turnMessageIdsByTurnKey, providerTurnKey(threadId, turnId)).pipe(
      Effect.flatMap((existingIds) =>
        Option.match(existingIds, {
          onNone: () => Effect.void,
          onSome: (ids) => {
            const nextIds = new Set(ids);
            nextIds.delete(messageId);
            if (nextIds.size === 0) {
              return Cache.invalidate(turnMessageIdsByTurnKey, providerTurnKey(threadId, turnId));
            }
            return Cache.set(turnMessageIdsByTurnKey, providerTurnKey(threadId, turnId), nextIds);
          },
        }),
      ),
    );

  const getAssistantMessageIdsForTurn = (threadId: ThreadId, turnId: TurnId) =>
    Cache.getOption(turnMessageIdsByTurnKey, providerTurnKey(threadId, turnId)).pipe(
      Effect.map((existingIds) =>
        Option.getOrElse(existingIds, (): Set<MessageId> => new Set<MessageId>()),
      ),
    );

  const clearAssistantMessageIdsForTurn = (threadId: ThreadId, turnId: TurnId) =>
    Cache.invalidate(turnMessageIdsByTurnKey, providerTurnKey(threadId, turnId));

  const planBufferedAssistantText = (messageId: MessageId, delta: string) =>
    Cache.getOption(bufferedAssistantTextByMessageId, messageId).pipe(
      Effect.map((existingText) => {
        const nextText = Option.match(existingText, {
          onNone: () => delta,
          onSome: (text) => `${text}${delta}`,
        });
        return {
          nextText,
          shouldSpill: nextText.length > MAX_BUFFERED_ASSISTANT_CHARS,
        };
      }),
    );

  const getBufferedAssistantText = (messageId: MessageId) =>
    Cache.getOption(bufferedAssistantTextByMessageId, messageId).pipe(
      Effect.map(Option.getOrElse(() => "")),
    );

  const appendBufferedProposedPlan = (planId: string, delta: string, createdAt: string) =>
    Cache.getOption(bufferedProposedPlanById, planId).pipe(
      Effect.flatMap((existingEntry) => {
        const existing = Option.getOrUndefined(existingEntry);
        return Cache.set(bufferedProposedPlanById, planId, {
          text: appendCappedBufferedText(
            existing?.text ?? "",
            delta,
            MAX_BUFFERED_PROPOSED_PLAN_CHARS,
          ),
          createdAt:
            existing?.createdAt && existing.createdAt.length > 0 ? existing.createdAt : createdAt,
        });
      }),
    );

  const takeBufferedProposedPlan = (planId: string) =>
    takeCached(bufferedProposedPlanById, planId).pipe(Effect.map(Option.getOrUndefined));

  const appendBufferedToolOutput = (key: string, delta: string) =>
    Cache.getOption(bufferedToolOutputByKey, key).pipe(
      Effect.flatMap((existingEntry) => {
        const existing = Option.getOrUndefined(existingEntry);
        const existingText = existing?.text ?? "";
        const truncated = existingText.length + delta.length > MAX_BUFFERED_TOOL_OUTPUT_CHARS;
        return Cache.set(bufferedToolOutputByKey, key, {
          text: appendCappedBufferedText(existingText, delta, MAX_BUFFERED_TOOL_OUTPUT_CHARS),
          truncated: existing?.truncated === true || truncated,
        });
      }),
    );

  const getBufferedToolOutput = (key: string) =>
    Cache.getOption(bufferedToolOutputByKey, key).pipe(
      Effect.map((existingEntry) => Option.getOrUndefined(existingEntry)),
    );

  const appendBufferedReasoningSummary = (
    key: string,
    event: Extract<EngineRuntimeEvent, { readonly type: "content.delta" }>,
    runtimeSequence: number,
  ) =>
    Cache.getOption(bufferedReasoningSummaryByKey, key).pipe(
      Effect.flatMap((existingEntry) => {
        const summaryIndex = event.payload.summaryIndex ?? 0;
        const delta = event.payload.delta;
        if (summaryIndex < 0 || delta.length === 0) {
          return Effect.succeed(undefined);
        }
        const existingSummary = Option.getOrUndefined(existingEntry);
        const beginsVisibleSegment =
          existingSummary?.firstRuntimeSequence === undefined &&
          readableReasoningDetail(event.payload.delta) !== undefined;
        const sourceEvent = beginsVisibleSegment ? event : (existingSummary?.sourceEvent ?? event);
        const firstRuntimeSequence = beginsVisibleSegment
          ? runtimeSequence
          : existingSummary?.firstRuntimeSequence;
        const flushGeneration = (existingSummary?.flushGeneration ?? 0) + 1;
        if (summaryIndex >= MAX_BUFFERED_REASONING_SUMMARY_PARTS) {
          const nextSummary: BufferedReasoningSummary = {
            parts: new Map(existingSummary?.parts ?? []),
            sourceEvent,
            firstRuntimeSequence,
            lastRuntimeSequence: runtimeSequence,
            lastPublishedAtMs: existingSummary?.lastPublishedAtMs,
            flushGeneration,
            truncated: true,
            segmented: existingSummary?.segmented === true,
          };
          return Cache.set(bufferedReasoningSummaryByKey, key, nextSummary).pipe(
            Effect.as(nextSummary),
          );
        }
        const parts = new Map(existingSummary?.parts ?? []);
        const existingPart = parts.get(summaryIndex) ?? "";
        const otherChars = Array.from(parts.entries()).reduce(
          (total, [index, text]) => total + (index === summaryIndex ? 0 : text.length),
          0,
        );
        const partLimit = Math.max(0, MAX_REASONING_ACTIVITY_DETAIL_CHARS - otherChars);
        if (partLimit === 0) {
          const nextSummary: BufferedReasoningSummary = {
            parts,
            sourceEvent,
            firstRuntimeSequence,
            lastRuntimeSequence: runtimeSequence,
            lastPublishedAtMs: existingSummary?.lastPublishedAtMs,
            flushGeneration,
            truncated: true,
            segmented: existingSummary?.segmented === true,
          };
          return Cache.set(bufferedReasoningSummaryByKey, key, nextSummary).pipe(
            Effect.as(nextSummary),
          );
        }
        const truncated = existingPart.length + delta.length > partLimit;
        parts.set(summaryIndex, appendCappedProviderText(existingPart, delta, partLimit));
        const nextSummary: BufferedReasoningSummary = {
          parts,
          sourceEvent,
          firstRuntimeSequence,
          lastRuntimeSequence: runtimeSequence,
          lastPublishedAtMs: existingSummary?.lastPublishedAtMs,
          flushGeneration,
          truncated: existingSummary?.truncated === true || truncated,
          segmented: existingSummary?.segmented === true,
        };
        return Cache.set(bufferedReasoningSummaryByKey, key, nextSummary).pipe(
          Effect.as(nextSummary),
        );
      }),
    );

  const getBufferedReasoningSummary = (key: string) =>
    Cache.getOption(bufferedReasoningSummaryByKey, key).pipe(Effect.map(Option.getOrUndefined));

  // Some runtimes keep one reasoning item open across multiple tool calls. The
  // public text is still causally segmented by each visible assistant/tool
  // boundary, so flush the text received so far before projecting that boundary.
  // A segment-specific item id prevents the next fragment of the same runtime
  // item from overwriting the first activity row.
  const flushBufferedReasoningBeforeBoundary = (
    threadId: ThreadId,
    boundaryEvent: EngineRuntimeEvent,
    turnId?: TurnId,
  ) => {
    const prefix = turnId ? `${threadId}:${turnId}:` : `${threadId}:`;
    return Cache.keys(bufferedReasoningSummaryByKey).pipe(
      Effect.flatMap((keys) =>
        Effect.forEach(
          Array.from(keys).filter((key) => key.startsWith(prefix)),
          (key) =>
            getBufferedReasoningSummary(key).pipe(
              Effect.flatMap((summary) => {
                const detail = joinedBufferedReasoningSummary(summary);
                if (!summary || !detail || !summary.sourceEvent.itemId) {
                  return Effect.void;
                }
                const segmentItemId = bufferedReasoningSegmentItemId(summary);
                if (!segmentItemId) {
                  return Effect.void;
                }
                const completionEvent: EngineRuntimeEvent = {
                  ...summary.sourceEvent,
                  eventId: EventId.makeUnsafe(
                    `${boundaryEvent.eventId}:reasoning:${segmentItemId}`,
                  ),
                  itemId: segmentItemId as NonNullable<EngineRuntimeEvent["itemId"]>,
                  threadId,
                  type: "item.completed",
                  payload: {
                    itemType: "reasoning",
                    status: "completed",
                    title: "Reasoning",
                    detail,
                    ...(summary.truncated ? { data: { reasoningDetailTruncated: true } } : {}),
                  },
                };
                const activities = projectProviderRuntimeActivities(
                  completionEvent,
                  summary.firstRuntimeSequence,
                );
                return dispatchProjectedActivities(completionEvent, threadId, activities).pipe(
                  Effect.andThen(
                    Cache.set(bufferedReasoningSummaryByKey, key, {
                      ...summary,
                      parts: new Map<number, string>(),
                      firstRuntimeSequence: undefined,
                      lastPublishedAtMs: undefined,
                      flushGeneration: summary.flushGeneration + 1,
                      truncated: false,
                      segmented: true,
                    }),
                  ),
                );
              }),
            ),
        ).pipe(Effect.asVoid),
      ),
    );
  };

  const settleBufferedReasoningSummaries = (
    threadId: ThreadId,
    terminalEvent: EngineRuntimeEvent,
    runtimeSequence: number,
    turnId?: TurnId,
  ) => {
    const prefix = turnId ? `${threadId}:${turnId}:` : `${threadId}:`;
    const status =
      terminalEvent.type === "runtime.error" ||
      terminalEvent.type === "turn.aborted" ||
      (terminalEvent.type === "turn.completed" && terminalEvent.payload.state !== "completed") ||
      (terminalEvent.type === "session.exited" && terminalEvent.payload.exitKind === "error")
        ? "failed"
        : "completed";
    return Cache.keys(bufferedReasoningSummaryByKey).pipe(
      Effect.flatMap((keys) =>
        Effect.forEach(
          Array.from(keys).filter((key) => key.startsWith(prefix)),
          (key) =>
            getBufferedReasoningSummary(key).pipe(
              Effect.flatMap((summary) => {
                const detail = joinedBufferedReasoningSummary(summary);
                if (!summary || !detail || !summary.sourceEvent.itemId) {
                  return Cache.invalidate(bufferedReasoningSummaryByKey, key);
                }
                const segmentItemId = bufferedReasoningSegmentItemId(summary);
                if (!segmentItemId) {
                  return Cache.invalidate(bufferedReasoningSummaryByKey, key);
                }
                const completionEvent: EngineRuntimeEvent = {
                  ...summary.sourceEvent,
                  eventId: EventId.makeUnsafe(
                    `${terminalEvent.eventId}:reasoning:${segmentItemId}`,
                  ),
                  itemId: segmentItemId as NonNullable<EngineRuntimeEvent["itemId"]>,
                  threadId,
                  type: "item.completed",
                  payload: {
                    itemType: "reasoning",
                    status,
                    title: "Reasoning",
                    detail,
                    ...(summary.truncated ? { data: { reasoningDetailTruncated: true } } : {}),
                  },
                };
                const activities = projectProviderRuntimeActivities(
                  completionEvent,
                  summary.firstRuntimeSequence ?? runtimeSequence,
                );
                return dispatchProjectedActivities(completionEvent, threadId, activities).pipe(
                  Effect.andThen(Cache.invalidate(bufferedReasoningSummaryByKey, key)),
                );
              }),
            ),
        ).pipe(Effect.asVoid),
      ),
    );
  };

  const clearAssistantMessageState = (threadId: ThreadId, messageId: MessageId) =>
    Effect.gen(function* () {
      yield* Cache.invalidate(bufferedAssistantTextByMessageId, messageId);
      const segmentKey = assistantMessageSegmentKey(threadId, messageId);
      bufferedTextSegmentsByMessageKey.delete(segmentKey);
      bufferedTextSpilledByMessageKey.delete(segmentKey);
      const statesForThread = segmentStateByThreadId.get(threadId);
      statesForThread?.delete(messageId);
      if (statesForThread?.size === 0) segmentStateByThreadId.delete(threadId);
    });

  const clearBufferedAssistantTextState = (threadId: ThreadId, messageId: MessageId) =>
    Effect.gen(function* () {
      yield* Cache.invalidate(bufferedAssistantTextByMessageId, messageId);
      const segmentKey = assistantMessageSegmentKey(threadId, messageId);
      bufferedTextSegmentsByMessageKey.delete(segmentKey);
      bufferedTextSpilledByMessageKey.delete(segmentKey);
    });

  const resolveAssistantCompletionMessageId = (input: {
    event: EngineRuntimeEvent;
    thread: OrchestrationThread;
    turnId?: TurnId;
  }) =>
    Effect.gen(function* () {
      if (input.turnId) {
        const knownAssistantMessageIds = yield* getAssistantMessageIdsForTurn(
          input.thread.id,
          input.turnId,
        );
        if (input.event.itemId) {
          const eventMessageId = MessageId.makeUnsafe(`assistant:${input.event.itemId}`);
          if (knownAssistantMessageIds.has(eventMessageId)) {
            return eventMessageId;
          }
        }
        if (knownAssistantMessageIds.size === 1) {
          const [onlyMessageId] = knownAssistantMessageIds;
          if (onlyMessageId) {
            return onlyMessageId;
          }
        }
        if (knownAssistantMessageIds.size > 1) {
          const preferredKnownMessage = input.thread.messages
            .filter(
              (message: OrchestrationThread["messages"][number]) =>
                message.role === "assistant" &&
                message.turnId === input.turnId &&
                knownAssistantMessageIds.has(message.id),
            )
            .toSorted(
              (
                left: OrchestrationThread["messages"][number],
                right: OrchestrationThread["messages"][number],
              ) => {
                if (left.streaming !== right.streaming) {
                  return left.streaming ? -1 : 1;
                }
                return (
                  right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)
                );
              },
            )[0];
          if (preferredKnownMessage) {
            return preferredKnownMessage.id;
          }
        }
        return input.event.itemId
          ? MessageId.makeUnsafe(`assistant:${input.event.itemId}`)
          : MessageId.makeUnsafe(`assistant:${input.turnId}`);
      }

      if (input.event.itemId) {
        return MessageId.makeUnsafe(`assistant:${input.event.itemId}`);
      }

      return MessageId.makeUnsafe(`assistant:${input.event.eventId}`);
    });

  const dispatchFinalAssistantTextSegments = (input: {
    event: EngineRuntimeEvent;
    threadId: ThreadId;
    messageId: MessageId;
    turnId?: TurnId;
    createdAt: string;
    tagBase: string;
    text: string;
  }) =>
    Effect.gen(function* () {
      const segmentKey = assistantMessageSegmentKey(input.threadId, input.messageId);
      const segments = bufferedTextSegmentsByMessageKey.get(segmentKey) ?? [];
      const spilled = bufferedTextSpilledByMessageKey.has(segmentKey);
      if (segments.length > 1 && !spilled) {
        for (const [segmentIndex, segment] of segments.entries()) {
          yield* orchestrationEngine.dispatch({
            type: "thread.message.assistant.delta",
            commandId: providerCommandId(
              input.event,
              `${input.tagBase}-segment-${segmentIndex}`,
              input.messageId,
            ),
            threadId: input.threadId,
            messageId: input.messageId,
            delta: segment.text,
            ...(input.turnId ? { turnId: input.turnId } : {}),
            segmentStartedAt: segment.startedAt,
            segmentSequence: segment.sequence,
            createdAt: input.createdAt,
          });
        }
        return;
      }
      const segment = spilled ? undefined : segments[0];
      yield* orchestrationEngine.dispatch({
        type: "thread.message.assistant.delta",
        commandId: providerCommandId(input.event, input.tagBase, input.messageId),
        threadId: input.threadId,
        messageId: input.messageId,
        delta: input.text,
        ...(input.turnId ? { turnId: input.turnId } : {}),
        ...(segment
          ? {
              segmentStartedAt: segment.startedAt,
              segmentSequence: segment.sequence,
            }
          : {}),
        createdAt: input.createdAt,
      });
    });

  const flushBufferedAssistantMessageDelta = (input: {
    event: EngineRuntimeEvent;
    threadId: ThreadId;
    messageId: MessageId;
    turnId?: TurnId;
    createdAt: string;
    commandTag: string;
  }) =>
    Effect.gen(function* () {
      const bufferedText = yield* getBufferedAssistantText(input.messageId);
      if (!hasRenderableAssistantText(bufferedText)) {
        yield* clearBufferedAssistantTextState(input.threadId, input.messageId);
        return false;
      }

      yield* dispatchFinalAssistantTextSegments({
        event: input.event,
        threadId: input.threadId,
        messageId: input.messageId,
        ...(input.turnId ? { turnId: input.turnId } : {}),
        createdAt: input.createdAt,
        tagBase: input.commandTag,
        text: bufferedText,
      });
      yield* clearBufferedAssistantTextState(input.threadId, input.messageId);
      return true;
    });

  const flushBufferedAssistantMessagesForTurn = (input: {
    event: EngineRuntimeEvent;
    threadId: ThreadId;
    turnId: TurnId;
    createdAt: string;
    commandTag: string;
  }) =>
    Effect.gen(function* () {
      const assistantMessageIds = yield* getAssistantMessageIdsForTurn(
        input.threadId,
        input.turnId,
      );
      for (const assistantMessageId of assistantMessageIds) {
        yield* flushBufferedAssistantMessageDelta({
          event: input.event,
          threadId: input.threadId,
          messageId: assistantMessageId,
          turnId: input.turnId,
          createdAt: input.createdAt,
          commandTag: input.commandTag,
        });
      }
    });

  const finalizeBufferedAssistantMessagesForTurn = (input: {
    event: EngineRuntimeEvent;
    threadId: ThreadId;
    turnId: TurnId;
    createdAt: string;
    commandTag: string;
    finalDeltaCommandTag: string;
  }) =>
    Effect.gen(function* () {
      const assistantMessageIds = yield* getAssistantMessageIdsForTurn(
        input.threadId,
        input.turnId,
      );
      yield* Effect.forEach(assistantMessageIds, (assistantMessageId) =>
        finalizeAssistantMessage({
          event: input.event,
          threadId: input.threadId,
          messageId: assistantMessageId,
          turnId: input.turnId,
          createdAt: input.createdAt,
          commandTag: input.commandTag,
          finalDeltaCommandTag: input.finalDeltaCommandTag,
        }),
      );
      yield* clearAssistantMessageIdsForTurn(input.threadId, input.turnId);
    });

  const finalizeAssistantMessage = (input: {
    event: EngineRuntimeEvent;
    threadId: ThreadId;
    messageId: MessageId;
    turnId?: TurnId;
    createdAt: string;
    commandTag: string;
    finalDeltaCommandTag: string;
    fallbackText?: string;
  }) =>
    Effect.gen(function* () {
      const bufferedText = yield* getBufferedAssistantText(input.messageId);
      const text =
        bufferedText.length > 0
          ? bufferedText
          : (input.fallbackText?.trim().length ?? 0) > 0
            ? input.fallbackText!
            : "";

      if (hasRenderableAssistantText(text)) {
        yield* dispatchFinalAssistantTextSegments({
          event: input.event,
          threadId: input.threadId,
          messageId: input.messageId,
          ...(input.turnId ? { turnId: input.turnId } : {}),
          createdAt: input.createdAt,
          tagBase: input.finalDeltaCommandTag,
          text,
        });
      }

      yield* orchestrationEngine.dispatch({
        type: "thread.message.assistant.complete",
        commandId: providerCommandId(input.event, input.commandTag, input.messageId),
        threadId: input.threadId,
        messageId: input.messageId,
        ...(input.turnId ? { turnId: input.turnId } : {}),
        createdAt: input.createdAt,
      });
      yield* clearAssistantMessageState(input.threadId, input.messageId);
    });

  /**
   * Appends generated-image markdown to one explicit assistant message (creating it
   * when it does not exist yet) and finalizes it. Image markdown already present on
   * the target is skipped, so engine replays never duplicate references or re-emit
   * message-sent events for untouched, already-finalized targets.
   */
  const appendGeneratedImagesToAssistantMessage = (input: {
    event: EngineRuntimeEvent;
    threadId: ThreadId;
    targetMessage:
      | Pick<OrchestrationThread["messages"][number], "id" | "text" | "streaming">
      | undefined;
    newMessageId: MessageId;
    imagePaths: ReadonlyArray<string>;
    turnId?: TurnId;
    createdAt: string;
  }) =>
    Effect.gen(function* () {
      const targetMessageId = input.targetMessage?.id ?? input.newMessageId;
      const targetMessageText = input.targetMessage?.text ?? "";
      const targetIsStreaming = input.targetMessage?.streaming ?? false;

      const missingMarkdown: string[] = [];
      for (const imagePath of input.imagePaths) {
        const markdown = generatedImageMarkdown(imagePath);
        if (
          targetMessageText.includes(imagePath) ||
          targetMessageText.includes(markdown) ||
          missingMarkdown.includes(markdown)
        ) {
          continue;
        }
        missingMarkdown.push(markdown);
      }

      let dispatchedDelta = false;
      if (missingMarkdown.length > 0) {
        const joined = missingMarkdown.join("\n\n");
        yield* orchestrationEngine.dispatch({
          type: "thread.message.assistant.delta",
          commandId: providerCommandId(input.event, "generated-image-delta", targetMessageId),
          threadId: input.threadId,
          messageId: targetMessageId,
          delta: targetMessageText.trim().length > 0 ? `\n\n${joined}` : joined,
          ...(input.turnId ? { turnId: input.turnId } : {}),
          createdAt: input.createdAt,
        });
        dispatchedDelta = true;
      }

      // Only finalize when we actually changed the message (delta dispatched, or we
      // just created a brand-new image-only message), or when the existing target was
      // still streaming. Skipping complete on already-finalized targets keeps replays
      // and duplicate engine notifications from emitting redundant message-sent events.
      const shouldComplete = dispatchedDelta || !input.targetMessage || targetIsStreaming;
      if (shouldComplete) {
        yield* orchestrationEngine.dispatch({
          type: "thread.message.assistant.complete",
          commandId: providerCommandId(input.event, "generated-image-complete", targetMessageId),
          threadId: input.threadId,
          messageId: targetMessageId,
          ...(input.turnId ? { turnId: input.turnId } : {}),
          createdAt: input.createdAt,
        });
      }
    });

  const rememberPendingGeneratedImage = (threadId: ThreadId, turnId: TurnId, imagePath: string) =>
    Cache.getOption(pendingGeneratedImagesByTurnKey, providerTurnKey(threadId, turnId)).pipe(
      Effect.flatMap((existingPaths) => {
        const paths = Option.getOrElse(existingPaths, (): ReadonlyArray<string> => []);
        if (paths.includes(imagePath) || paths.length >= MAX_PENDING_GENERATED_IMAGES_PER_TURN) {
          return Effect.void;
        }
        return Cache.set(pendingGeneratedImagesByTurnKey, providerTurnKey(threadId, turnId), [
          ...paths,
          imagePath,
        ]);
      }),
    );

  const takePendingGeneratedImages = (threadId: ThreadId, turnId: TurnId) =>
    Cache.getOption(pendingGeneratedImagesByTurnKey, providerTurnKey(threadId, turnId)).pipe(
      Effect.flatMap((existingPaths) =>
        Cache.invalidate(pendingGeneratedImagesByTurnKey, providerTurnKey(threadId, turnId)).pipe(
          Effect.as(Option.getOrElse(existingPaths, (): ReadonlyArray<string> => [])),
        ),
      ),
    );

  /**
   * Codex emits generated images as artifacts, so the turn's final assistant item is
   * often intentionally empty: the image IS the answer. Attaching images eagerly to
   * whatever narration exists mid-turn hands them to a message the settled-turn UI
   * collapses into the "Worked for…" disclosure, leaving the visible terminal row as
   * "(empty response)". Flushing at turn settle targets the actual terminal message
   * — including an empty one, whose body becomes the image markdown. Persisted
   * activity recovery complements the hot cache for long turns and restarts.
   */
  const flushPendingGeneratedImagesForTurn = (input: {
    event: EngineRuntimeEvent;
    thread: OrchestrationThread;
    turnId: TurnId;
    createdAt: string;
  }) =>
    Effect.gen(function* () {
      const cachedImagePaths = yield* takePendingGeneratedImages(input.thread.id, input.turnId);
      const persistedRecords = yield* projectionSnapshotQuery
        .listGeneratedImageActivitiesByTurn(input.thread.id, input.turnId)
        .pipe(
          Effect.catchCause((cause) =>
            Effect.logWarning("failed to recover persisted generated-image references", {
              threadId: input.thread.id,
              turnId: input.turnId,
              cause: Cause.pretty(cause),
            }).pipe(Effect.as<ReadonlyArray<ProjectionGeneratedImageActivityRecord>>([])),
          ),
        );
      const imagePaths = [
        ...new Set([...cachedImagePaths, ...collectPersistedGeneratedImagePaths(persistedRecords)]),
      ];
      if (imagePaths.length === 0) {
        return;
      }
      // The terminal assistant message is the newest of the turn: the transcript UI
      // gives the last assistant row ownership of the settled turn and folds every
      // earlier assistant row, so this is the only row that stays visible.
      const terminalMessage = input.thread.messages
        .filter((message) => message.role === "assistant" && message.turnId === input.turnId)
        .toSorted(
          (left, right) =>
            right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id),
        )[0];
      yield* appendGeneratedImagesToAssistantMessage({
        event: input.event,
        threadId: input.thread.id,
        targetMessage: terminalMessage,
        newMessageId: MessageId.makeUnsafe(`assistant:image:${input.turnId}`),
        imagePaths,
        turnId: input.turnId,
        createdAt: input.createdAt,
      });
    });

  /**
   * For Studio threads, copies a completed generated image into the thread's Studio
   * workspace (Outbox/Images) and appends direct output attribution. Returns null —
   * and must stay non-fatal — for non-Studio threads and on any copy failure, so the
   * transcript path falls back to the original Codex-home file.
   */
  const materializeStudioGeneratedImage = (input: {
    event: EngineRuntimeEvent;
    thread: OrchestrationThread;
    imagePath: string;
    turnId: TurnId | undefined;
    createdAt: string;
  }) =>
    Effect.gen(function* () {
      const project = yield* getProjectShell(input.thread);
      if (!project || project.kind !== "studio") {
        return null;
      }
      const workspaceRoot = resolveThreadWorkspaceCwd({
        thread: input.thread,
        projects: [project],
      });
      if (!workspaceRoot) {
        return null;
      }
      return yield* copyAndAttributeStudioGeneratedImage({
        orchestrationEngine,
        sourcePath: input.imagePath,
        workspaceRoot,
        threadId: input.thread.id,
        turnId: input.turnId,
        eventId: input.event.eventId,
        createdAt: input.createdAt,
      });
    }).pipe(
      Effect.catchCause((cause) => {
        if (Cause.hasInterruptsOnly(cause)) {
          return Effect.failCause(cause);
        }
        return Effect.logWarning("failed to copy generated image into Studio workspace", {
          threadId: input.thread.id,
          imagePath: input.imagePath,
          cause: Cause.pretty(cause),
        }).pipe(Effect.as(null));
      }),
    );

  const upsertProposedPlan = (input: {
    event: EngineRuntimeEvent;
    threadId: ThreadId;
    threadProposedPlans: ReadonlyArray<{
      id: string;
      createdAt: string;
      implementedAt: string | null;
      implementationThreadId: ThreadId | null;
    }>;
    planId: string;
    turnId?: TurnId;
    planMarkdown: string | undefined;
    createdAt: string;
    updatedAt: string;
  }) =>
    Effect.gen(function* () {
      const planMarkdown = normalizeNonEmptyString(input.planMarkdown);
      if (!planMarkdown) {
        return;
      }

      const existingPlan = input.threadProposedPlans.find((entry) => entry.id === input.planId);
      yield* orchestrationEngine.dispatch({
        type: "thread.proposed-plan.upsert",
        commandId: providerCommandId(input.event, "proposed-plan-upsert", input.planId),
        threadId: input.threadId,
        proposedPlan: {
          id: input.planId,
          turnId: input.turnId ?? null,
          planMarkdown,
          implementedAt: existingPlan?.implementedAt ?? null,
          implementationThreadId: existingPlan?.implementationThreadId ?? null,
          createdAt: existingPlan?.createdAt ?? input.createdAt,
          updatedAt: input.updatedAt,
        },
        createdAt: input.updatedAt,
      });
    });

  const finalizeBufferedProposedPlan = (input: {
    event: EngineRuntimeEvent;
    threadId: ThreadId;
    threadProposedPlans: ReadonlyArray<{
      id: string;
      createdAt: string;
      implementedAt: string | null;
      implementationThreadId: ThreadId | null;
    }>;
    planId: string;
    turnId?: TurnId;
    fallbackMarkdown?: string;
    updatedAt: string;
  }) =>
    Effect.gen(function* () {
      const bufferedPlan = yield* takeBufferedProposedPlan(input.planId);
      const bufferedMarkdown = normalizeNonEmptyString(bufferedPlan?.text);
      const fallbackMarkdown = normalizeNonEmptyString(input.fallbackMarkdown);
      const planMarkdown = bufferedMarkdown ?? fallbackMarkdown;
      if (!planMarkdown) {
        return;
      }

      yield* upsertProposedPlan({
        event: input.event,
        threadId: input.threadId,
        threadProposedPlans: input.threadProposedPlans,
        planId: input.planId,
        ...(input.turnId ? { turnId: input.turnId } : {}),
        planMarkdown,
        createdAt:
          bufferedPlan?.createdAt && bufferedPlan.createdAt.length > 0
            ? bufferedPlan.createdAt
            : input.updatedAt,
        updatedAt: input.updatedAt,
      });
      yield* Cache.invalidate(bufferedProposedPlanById, input.planId);
    });

  const clearTurnStateForSession = (threadId: ThreadId) =>
    Effect.gen(function* () {
      const prefix = `${threadId}:`;
      yield* Effect.forEach(Array.from(yield* Cache.keys(turnMessageIdsByTurnKey)), (key) =>
        Effect.gen(function* () {
          if (!key.startsWith(prefix)) {
            return;
          }

          const messageIds = yield* Cache.getOption(turnMessageIdsByTurnKey, key);
          if (Option.isSome(messageIds)) {
            yield* Effect.forEach(messageIds.value, (messageId) =>
              clearAssistantMessageState(threadId, messageId),
            );
          }

          yield* Cache.invalidate(turnMessageIdsByTurnKey, key);
        }),
      );
      yield* Effect.forEach(Array.from(yield* Cache.keys(bufferedProposedPlanById)), (key) =>
        key.startsWith(`plan:${threadId}:`)
          ? Cache.invalidate(bufferedProposedPlanById, key)
          : Effect.void,
      );
      yield* Effect.forEach(Array.from(yield* Cache.keys(pendingGeneratedImagesByTurnKey)), (key) =>
        key.startsWith(prefix)
          ? Cache.invalidate(pendingGeneratedImagesByTurnKey, key)
          : Effect.void,
      );
    });

  const getSourceProposedPlanReferenceForPendingTurnStart = Effect.fnUntraced(function* (
    threadId: ThreadId,
  ) {
    const pendingTurnStart = yield* projectionTurnRepository.getPendingTurnStartByThreadId({
      threadId,
    });
    if (Option.isNone(pendingTurnStart)) {
      return null;
    }

    const sourceThreadId = pendingTurnStart.value.sourceProposedPlanThreadId;
    const sourcePlanId = pendingTurnStart.value.sourceProposedPlanId;
    if (sourceThreadId === null || sourcePlanId === null) {
      return null;
    }

    return {
      sourceThreadId,
      sourcePlanId,
    } as const;
  });

  const getSourceProposedPlanReferenceForAcceptedTurnStart = Effect.fnUntraced(function* (
    threadId: ThreadId,
    eventTurnId: TurnId | undefined,
  ) {
    if (eventTurnId === undefined) {
      return null;
    }

    const expectedTurnId = (yield* engineService.listSessions()).find(
      (entry) => entry.threadId === threadId,
    )?.activeTurnId;
    if (!sameId(expectedTurnId, eventTurnId)) {
      return null;
    }

    return yield* getSourceProposedPlanReferenceForPendingTurnStart(threadId);
  });

  const markSourceProposedPlanImplemented = Effect.fnUntraced(function* (
    sourceThreadId: ThreadId,
    sourcePlanId: OrchestrationProposedPlanId,
    implementationThreadId: ThreadId,
    implementedAt: string,
  ) {
    const sourceThread = yield* getThreadDetail(sourceThreadId);
    const sourcePlan = sourceThread?.proposedPlans.find((entry) => entry.id === sourcePlanId);
    if (!sourceThread || !sourcePlan || sourcePlan.implementedAt !== null) {
      return;
    }

    yield* orchestrationEngine.dispatch({
      type: "thread.proposed-plan.upsert",
      commandId: CommandId.makeUnsafe(
        `engine:source-proposed-plan-implemented:${implementationThreadId}:${sourcePlanId}`,
      ),
      threadId: sourceThread.id,
      proposedPlan: {
        ...sourcePlan,
        implementedAt,
        implementationThreadId,
        updatedAt: implementedAt,
      },
      createdAt: implementedAt,
    });
  });

  /**
   * A `session.started` event marks a freshly (re)started engine runtime
   * whose in-memory approval/user-input callbacks are empty, so any durable
   * pending interaction recorded before it can never be answered. Requests
   * from the new runtime are ingested strictly after this event, so every
   * unsettled row seen here is provably orphaned. Settle them as stale —
   * leaving them open kept the prompt on screen while every response was
   * silently dropped, wedging the thread until the user abandoned it.
   */
  const settleUnanswerablePendingInteractions = (
    threadId: ThreadId,
    event: EngineRuntimeEvent,
    now: string,
  ) =>
    Effect.gen(function* () {
      const rows = yield* pendingInteractions.listByThreadId({ threadId });
      for (const row of rows) {
        // `uncertain` rows were already reported as unanswerable; re-reporting
        // on every session start would duplicate the failure activity.
        if (row.status === "confirmed" || row.status === "uncertain") continue;
        const isApproval = row.interactionKind === "approval";
        const requestKind = isApproval ? ("approval" as const) : ("user-input" as const);
        const commandId = providerCommandId(event, `stale-pending-${requestKind}`, row.requestId);
        yield* orchestrationEngine.dispatch({
          type: "thread.activity.append",
          commandId,
          threadId,
          activity: {
            id: EventId.makeUnsafe(commandId),
            tone: isApproval ? "error" : "info",
            kind: isApproval ? "engine.approval.respond.failed" : "user-input.resolved",
            summary: isApproval
              ? "Engine approval response failed"
              : "Engine user input response failed",
            payload: {
              requestId: row.requestId,
              ...(isApproval
                ? {
                    detail: buildStalePendingRequestFailureDetail(requestKind, row.requestId),
                  }
                : { settlement: { status: "stale" } }),
              ...(row.lifecycleGeneration ? { lifecycleGeneration: row.lifecycleGeneration } : {}),
            },
            turnId: null,
            createdAt: now,
          },
          createdAt: now,
        });
      }
    });

  const segmentStateByThreadId = new Map<
    ThreadId,
    Map<
      MessageId,
      {
        hasText: boolean;
        splitPending: boolean;
        lastAppliedRuntimeSequence?: number;
      }
    >
  >();
  const bufferedTextSegmentsByMessageKey = new Map<
    string,
    ReadonlyArray<{
      readonly sequence: number;
      readonly startedAt: string;
      readonly text: string;
    }>
  >();
  const bufferedTextSpilledByMessageKey = new Set<string>();
  const markAssistantTextBoundaryForThread = (threadId: ThreadId) => {
    const states = segmentStateByThreadId.get(threadId);
    if (!states) return;
    for (const [messageId, state] of states) {
      if (state.hasText && !state.splitPending) {
        states.set(messageId, { ...state, splitPending: true });
      }
    }
  };
  const dispatchProjectedActivities = (
    event: EngineRuntimeEvent,
    threadId: ThreadId,
    activities: ReadonlyArray<OrchestrationThreadActivity>,
  ) =>
    invalidateWorkspaceIndexForFileChange(event, threadId).pipe(
      Effect.catchCause(() =>
        Effect.logWarning("workspace index invalidation failed for engine file change", {
          threadId,
        }),
      ),
      Effect.andThen(
        Effect.forEach(activities, (activity) => dispatchActivityUpdate(event, threadId, activity)),
      ),
      Effect.tap(() =>
        activities.some(isPotentiallyVisibleEngineRuntimeActivity)
          ? Effect.sync(() => markAssistantTextBoundaryForThread(threadId))
          : Effect.void,
      ),
      Effect.asVoid,
    );
  let enqueueReasoningFlush:
    | ((
        input: Extract<RuntimeIngestionInput, { source: "reasoning-flush" }>,
      ) => Effect.Effect<boolean>)
    | undefined;

  const publishBufferedReasoningUpdate = Effect.fnUntraced(function* (
    key: string,
    expectedGeneration?: number,
  ) {
    const summary = yield* getBufferedReasoningSummary(key);
    if (
      !summary ||
      (expectedGeneration !== undefined && summary.flushGeneration !== expectedGeneration)
    ) {
      return;
    }
    const detail = joinedBufferedReasoningSummary(summary);
    const segmentItemId = bufferedReasoningSegmentItemId(summary);
    if (!detail || !segmentItemId || summary.firstRuntimeSequence === undefined) {
      return;
    }
    const updateEvent: EngineRuntimeEvent = {
      ...summary.sourceEvent,
      eventId: EventId.makeUnsafe(
        `${summary.sourceEvent.eventId}:reasoning-update:${summary.lastRuntimeSequence}`,
      ),
      itemId: segmentItemId as NonNullable<EngineRuntimeEvent["itemId"]>,
      type: "item.updated",
      payload: {
        itemType: "reasoning",
        status: "inProgress",
        title: "Reasoning",
        detail,
        ...(summary.truncated ? { data: { reasoningDetailTruncated: true } } : {}),
      },
    };
    yield* dispatchProjectedActivities(
      updateEvent,
      updateEvent.threadId,
      projectProviderRuntimeActivities(updateEvent, summary.firstRuntimeSequence),
    );
    yield* Cache.set(bufferedReasoningSummaryByKey, key, {
      ...summary,
      lastPublishedAtMs: Date.now(),
    });
  });

  const scheduleBufferedReasoningFlush = (key: string, generation: number, delayMs: number) =>
    Effect.forkDetach(
      Effect.sleep(Duration.millis(Math.max(0, delayMs))).pipe(
        Effect.andThen(
          Effect.suspend(() =>
            enqueueReasoningFlush
              ? enqueueReasoningFlush({
                  source: "reasoning-flush",
                  key,
                  generation,
                })
              : Effect.succeed(false),
          ),
        ),
      ),
    ).pipe(Effect.asVoid);

  const publishOrScheduleBufferedReasoning = Effect.fnUntraced(function* (
    key: string,
    summary: BufferedReasoningSummary,
  ) {
    if (
      summary.firstRuntimeSequence === undefined ||
      joinedBufferedReasoningSummary(summary) === undefined
    ) {
      return;
    }
    const elapsed =
      summary.lastPublishedAtMs === undefined ? undefined : Date.now() - summary.lastPublishedAtMs;
    if (elapsed === undefined || elapsed >= REASONING_ACTIVITY_UPDATE_INTERVAL_MS) {
      yield* publishBufferedReasoningUpdate(key, summary.flushGeneration);
      return;
    }
    yield* scheduleBufferedReasoningFlush(
      key,
      summary.flushGeneration,
      REASONING_ACTIVITY_UPDATE_INTERVAL_MS - elapsed,
    );
  });
  const clearAssistantTextSegmentStateForThread = (threadId: ThreadId) => {
    const states = segmentStateByThreadId.get(threadId);
    for (const messageId of states?.keys() ?? []) {
      const key = assistantMessageSegmentKey(threadId, messageId);
      bufferedTextSegmentsByMessageKey.delete(key);
      bufferedTextSpilledByMessageKey.delete(key);
    }
    segmentStateByThreadId.delete(threadId);
  };

  const processRuntimeEventWithinLease = (event: EngineRuntimeEvent, runtimeSequence: number) =>
    Effect.gen(function* () {
      // EngineService fences adapter events before journaling, but an event
      // accepted while a replacement generation was current can remain in the
      // durable journal until after that target fails and the old engine is
      // restored under a fresh generation. Re-check the durable routing owner
      // before *any* Product effect (Session, pending interaction, transcript,
      // Tool/Activity or bounded cache) so delayed target/old-runtime rows
      // cannot seize or contaminate the restored Thread.
      //
      // EngineService publishes a generation-scoped `starting` binding
      // before current adapters can emit. A generation-stamped row with no
      // binding is therefore orphaned (for example, an early row whose first
      // start later failed and was cleaned up). Generation-less legacy rows
      // retain their compatibility path only while a same-engine binding is
      // itself explicitly legacy; they cannot seize a UUID generation, and
      // absence is not authority to repaint a failed Thread. A directory read
      // failure is deliberately not
      // caught here: journal retry is safer than silently dropping a
      // possibly-current engine event.
      const binding = Option.getOrUndefined(
        yield* engineSessionDirectory.getBinding(event.threadId),
      );
      const bindingRuntimePayload =
        binding === undefined ? undefined : asObject(binding.runtimePayload);
      // EngineService durably publishes the user's exact parent-turn abort
      // before retiring that runtime. The journal consumer can observe it only
      // after the binding has advanced, so admit this one service-owned
      // terminal namespace while the replacement binding still proves the
      // matching interrupt fence. Every engine-native stale row remains
      // generation-rejected.
      const acceptsRetiredInterruptSettlement =
        binding !== undefined &&
        binding.engine === event.engine &&
        bindingRuntimePayload?.lastRuntimeEvent === ENGINE_INTERRUPT_RUNTIME_FENCED_EVENT &&
        isEngineInterruptTurnSettlement(event);
      if (
        binding === undefined ||
        (binding !== undefined &&
          (bindingRuntimePayload?.lastRuntimeEvent === ENGINE_REPLACEMENT_RESTORE_FAILED_EVENT ||
            binding.engine !== event.engine ||
            (!acceptsRetiredInterruptSettlement &&
              ((event.lifecycleGeneration === undefined &&
                binding.lifecycleGeneration !== "legacy") ||
                (event.lifecycleGeneration !== undefined &&
                  binding.lifecycleGeneration !== event.lifecycleGeneration)))))
      ) {
        yield* Effect.logWarning("engine.runtime.stale_binding_event_projection_skipped", {
          eventId: event.eventId,
          eventType: event.type,
          threadId: event.threadId,
          eventProvider: event.engine,
          eventLifecycleGeneration: event.lifecycleGeneration,
          bindingProvider: binding?.engine,
          bindingLifecycleGeneration: binding?.lifecycleGeneration,
        });
        return;
      }

      const now = event.createdAt;
      // Load the full (heavy) detail only when this event's handlers actually read
      // thread.messages / proposedPlans / checkpoints; otherwise use the cheap
      // shell so high-frequency streaming events don't re-decode the whole
      // transcript. See eventNeedsHeavyThreadDetail for the safety rationale.
      const needsHeavyThreadDetail = eventNeedsHeavyThreadDetail(event);
      const parentThread = needsHeavyThreadDetail
        ? yield* getThreadDetail(event.threadId)
        : yield* getThreadShellDetail(event.threadId);
      if (!parentThread) return;

      const ensureSubagentThread = (
        nativeThreadId: string,
        identity?: Pick<
          SubagentIdentity,
          "agentId" | "nickname" | "role" | "model" | "modelIsRequestedHint"
        >,
      ) =>
        Effect.gen(function* () {
          const childThreadId = ThreadId.makeUnsafe(
            `subagent:${parentThread.id}:${nativeThreadId}`,
          );
          const sourceTurnId = toTurnId(event.turnId) ?? null;
          // A single engine event can describe the child both as a collab receiver and
          // as the event's engine thread, so re-read after any earlier dispatch in this handler.
          // Mirror the parent load: only this event's heavy-detail handlers read the
          // child's message/plan/checkpoint arrays, so otherwise use the cheap shell.
          const existingThread = needsHeavyThreadDetail
            ? yield* projectionSnapshotQuery.getThreadDetailById(childThreadId)
            : Option.map(
                yield* projectionSnapshotQuery.getThreadShellById(childThreadId),
                threadDetailFromShell,
              );
          // Reuse the parent's full selection when the models match so capability
          // flags (e.g. supportsAutoMode) survive; a diverging subagent model gets
          // a bare selection because the parent's flags don't describe it.
          const resolvedEngineSelection =
            identity?.model && identity.modelIsRequestedHint !== true
              ? identity.model === parentThread.engineSelection.model
                ? parentThread.engineSelection
                : {
                    engine: parentThread.engineSelection.engine,
                    model: identity.model,
                  }
              : undefined;

          if (Option.isNone(existingThread)) {
            // The read above hides soft-deleted threads, but `thread.create` is
            // decided against a tombstone-inclusive read model, so re-creating a
            // deleted child is rejected — durably, by command id. Replaying that
            // event (startup open-turn rebuild, journal retry) would then keep
            // failing on the stored rejection. A deleted subagent thread stays
            // deleted: drop this child's projection instead of resurrecting it.
            if (yield* projectionSnapshotQuery.threadIdExistsIncludingDeleted(childThreadId)) {
              yield* Effect.logDebug("engine runtime ingestion skipped deleted subagent thread", {
                eventId: event.eventId,
                eventType: event.type,
                threadId: childThreadId,
              });
              return undefined;
            }
            const slot = yield* claimNativeChildSlot(parentThread.id, sourceTurnId, childThreadId);
            if (!slot.admitted) {
              const overflowId = EventId.makeUnsafe(
                `engine-native-child-overflow:${slot.budgetKey}`,
              );
              yield* orchestrationEngine.dispatch({
                type: "thread.activity.append",
                commandId: CommandId.makeUnsafe(`engine:native-child-overflow:${slot.budgetKey}`),
                threadId: parentThread.id,
                activity: {
                  id: overflowId,
                  tone: "error",
                  kind: "subagent.materialization.capped",
                  summary: `Haros limited this engine turn to ${MAX_NATIVE_CHILDREN_PER_PARENT_TURN} visible native subagents.`,
                  payload: {
                    source: "engine_native",
                    cap: MAX_NATIVE_CHILDREN_PER_PARENT_TURN,
                  },
                  turnId: sourceTurnId,
                  createdAt: now,
                },
                createdAt: now,
              });
              return undefined;
            }
            yield* orchestrationEngine.dispatch({
              type: "thread.create",
              commandId: providerCommandId(event, "subagent-thread-create", childThreadId),
              threadId: childThreadId,
              projectId: parentThread.projectId,
              title: subagentThreadTitle({
                nickname: identity?.nickname,
                role: identity?.role,
                nativeThreadId,
              }),
              engineSelection: resolvedEngineSelection ?? parentThread.engineSelection,
              runtimeMode: parentThread.runtimeMode,
              interactionMode: parentThread.interactionMode,
              envMode: parentThread.envMode,
              branch: parentThread.branch,
              worktreePath: parentThread.worktreePath,
              associatedWorktreePath: parentThread.associatedWorktreePath,
              associatedWorktreeBranch: parentThread.associatedWorktreeBranch,
              associatedWorktreeRef: parentThread.associatedWorktreeRef,
              parentThreadId: parentThread.id,
              creationSource: "engine_native",
              sourceThreadId: parentThread.id,
              ...(sourceTurnId !== null ? { sourceTurnId } : {}),
              subagentAgentId: identity?.agentId ?? null,
              subagentNickname: identity?.nickname ?? null,
              subagentRole: identity?.role ?? null,
              createdAt: now,
            });
          } else {
            const existingThreadShell = existingThread.value;
            if (
              identity?.agentId !== undefined ||
              identity?.nickname !== undefined ||
              identity?.role !== undefined ||
              (identity?.model !== undefined && identity.modelIsRequestedHint !== true)
            ) {
              yield* orchestrationEngine.dispatch({
                type: "thread.meta.update",
                commandId: providerCommandId(event, "subagent-thread-meta-update", childThreadId),
                threadId: childThreadId,
                ...(identity?.nickname !== undefined || identity?.role !== undefined
                  ? {
                      title: subagentThreadTitle({
                        nickname:
                          identity?.nickname ?? existingThreadShell.subagentNickname ?? undefined,
                        role: identity?.role ?? existingThreadShell.subagentRole ?? undefined,
                        nativeThreadId,
                      }),
                    }
                  : {}),
                parentThreadId: parentThread.id,
                ...(resolvedEngineSelection !== undefined &&
                existingThreadShell.engineSelection.model !== resolvedEngineSelection.model
                  ? { engineSelection: resolvedEngineSelection }
                  : {}),
                ...(identity?.agentId !== undefined ? { subagentAgentId: identity.agentId } : {}),
                ...(identity?.nickname !== undefined
                  ? { subagentNickname: identity.nickname }
                  : {}),
                ...(identity?.role !== undefined ? { subagentRole: identity.role } : {}),
              });
            }
          }

          return {
            threadId: childThreadId,
            thread: Option.match(existingThread, {
              onSome: (thread) => thread,
              onNone: () => ({
                ...parentThread,
                id: childThreadId,
                title: subagentThreadTitle({
                  nickname: identity?.nickname,
                  role: identity?.role,
                  nativeThreadId,
                }),
                parentThreadId: parentThread.id,
                creationSource: "engine_native" as const,
                sourceThreadId: parentThread.id,
                sourceTurnId,
                gatewayOperationId: null,
                gatewayOperationIndex: null,
                subagentAgentId: identity?.agentId ?? null,
                subagentNickname: identity?.nickname ?? null,
                subagentRole: identity?.role ?? null,
                engineSelection: resolvedEngineSelection ?? parentThread.engineSelection,
                latestTurn: null,
                messages: [],
                proposedPlans: [],
                activities: [],
                checkpoints: [],
                session: null,
                createdAt: now,
                updatedAt: now,
              }),
            }),
          };
        });

      const collabPayload = extractCollabPayload(event);
      const collabItem = asObject(collabPayload?.item) ?? collabPayload;
      const isCollabToolEvent =
        (event.type === "item.started" ||
          event.type === "item.updated" ||
          event.type === "item.completed") &&
        event.payload.itemType === "collab_agent_tool_call" &&
        collabItem !== undefined;
      if (isCollabToolEvent && collabItem) {
        const receiverThreadIds = collectSubagentEngineThreadIds(collabItem);
        const identityDirectory = buildSubagentIdentityDirectory(
          extractSubagentIdentityHints(collabItem),
        );
        for (const receiverThreadId of receiverThreadIds) {
          yield* ensureSubagentThread(
            receiverThreadId,
            resolveSubagentIdentityFromDirectory(identityDirectory, {
              nativeThreadId: receiverThreadId,
            }) as SubagentIdentity | undefined,
          );
        }
      }

      const nativeThreadId = normalizeNonEmptyString(event.engineRefs?.nativeThreadId);
      const nativeParentThreadId = normalizeNonEmptyString(event.engineRefs?.nativeParentThreadId);
      const targetThreadResolution =
        nativeThreadId !== undefined &&
        nativeParentThreadId !== undefined &&
        nativeThreadId !== nativeParentThreadId
          ? yield* ensureSubagentThread(
              nativeThreadId,
              extractSubagentIdentity(event, nativeThreadId),
            )
          : { threadId: parentThread.id, thread: parentThread };
      if (targetThreadResolution === undefined) {
        return;
      }
      const thread = targetThreadResolution.thread;
      const activeTurnId = thread.session?.activeTurnId ?? null;
      const isTerminalTurnEvent = event.type === "turn.completed" || event.type === "turn.aborted";
      const rawEventTurnId = toTurnId(event.turnId);
      if (event.type === "turn.started" && rawEventTurnId) {
        yield* rememberOutstandingTurn(thread.id, rawEventTurnId);
      }
      const terminalApplicability = isTerminalTurnEvent
        ? classifyTerminalTurnApplicability({
            activeTurnId,
            eventTurnId: rawEventTurnId,
            hasAmbiguousTurns:
              ((yield* Ref.get(outstandingTurnIdsByThreadRef)).get(thread.id)?.size ?? 0) > 1,
          })
        : undefined;
      const eventTurnId =
        terminalApplicability?.resolvedTurnId !== undefined
          ? TurnId.makeUnsafe(terminalApplicability.resolvedTurnId)
          : rawEventTurnId;

      const shouldApplyThreadLifecycle =
        event.type === "turn.started"
          ? !STRICT_PROVIDER_LIFECYCLE_GUARD ||
            isStartedTurnApplicable({ activeTurnId, eventTurnId })
          : !isTerminalTurnEvent || (terminalApplicability?.applicable ?? true);
      if (isTerminalTurnEvent) {
        if (eventTurnId) {
          yield* forgetOutstandingTurn(thread.id, eventTurnId);
        }
        if (terminalApplicability?.reason === "ambiguous-missing-turn-id") {
          yield* Effect.logWarning("engine.runtime.ambiguous_terminal_event_ignored", {
            threadId: thread.id,
            eventType: event.type,
          });
        }
      }
      // EngineService permits overlapping sends on one thread. Even when a
      // later turn.started cannot replace the active lifecycle, it still binds
      // exactly one queued delivery policy for that engine turn.
      if (event.type === "turn.started" && eventTurnId) {
        yield* matchStartedTurnAssistantDeliveryMode(thread.id, eventTurnId);
      }
      // A terminal event can be the first lifecycle signal for a engine
      // turn. Consume an already-pending request in that case, but never add a
      // completed turn to the unmatched side for a future request to claim.
      if (isTerminalTurnEvent && eventTurnId) {
        yield* matchStartedTurnAssistantDeliveryMode(thread.id, eventTurnId, {
          recordUnmatched: false,
        });
      }
      const acceptedTurnStartedSourcePlan =
        event.type === "turn.started" && shouldApplyThreadLifecycle
          ? yield* getSourceProposedPlanReferenceForAcceptedTurnStart(thread.id, eventTurnId)
          : null;

      if (event.type === "session.started") {
        yield* settleUnanswerablePendingInteractions(thread.id, event, now);
      }

      if (
        event.type === "session.started" ||
        event.type === "session.state.changed" ||
        event.type === "session.exited" ||
        event.type === "thread.started" ||
        event.type === "turn.started" ||
        event.type === "turn.completed" ||
        event.type === "turn.aborted"
      ) {
        let nextActiveTurnId = activeTurnId;
        if (event.type === "turn.started") {
          nextActiveTurnId = eventTurnId ?? null;
        } else if (
          isTerminalTurnEvent ||
          event.type === "session.exited" ||
          (event.type === "session.state.changed" &&
            (event.payload.state === "ready" ||
              event.payload.state === "stopped" ||
              event.payload.state === "error"))
        ) {
          nextActiveTurnId = null;
        }
        const status = (() => {
          switch (event.type) {
            case "session.state.changed":
              return event.payload.state === "waiting" ? "running" : event.payload.state;
            case "turn.started":
              return "running";
            case "session.exited":
              return "stopped";
            case "turn.completed": {
              const turnState = runtimeTurnState(event);
              if (turnState === "failed") return "error";
              if (turnState === "interrupted" || turnState === "cancelled") {
                return "interrupted";
              }
              return "ready";
            }
            case "turn.aborted":
              return "interrupted";
            case "session.started":
            case "thread.started":
              // Engine thread/session start notifications can arrive during an
              // active turn; preserve turn-running state in that case.
              return activeTurnId !== null ? "running" : "ready";
          }
        })();
        let lastError = thread.session?.lastError ?? null;
        if (event.type === "session.state.changed" && event.payload.state === "error") {
          lastError = event.payload.reason ?? lastError ?? "Engine session error";
        } else if (status === "error") {
          lastError =
            asString(runtimePayloadRecord(event)?.errorMessage) ?? lastError ?? "Turn failed";
        } else if (status === "ready" || status === "interrupted") {
          lastError = null;
        }

        if (shouldApplyThreadLifecycle) {
          if (event.type === "turn.started" && acceptedTurnStartedSourcePlan !== null) {
            yield* markSourceProposedPlanImplemented(
              acceptedTurnStartedSourcePlan.sourceThreadId,
              acceptedTurnStartedSourcePlan.sourcePlanId,
              thread.id,
              now,
            ).pipe(
              Effect.catchCause((cause) =>
                Effect.logWarning("engine runtime ingestion failed to mark source proposed plan", {
                  eventId: event.eventId,
                  eventType: event.type,
                  cause: Cause.pretty(cause),
                }),
              ),
            );
          }

          yield* orchestrationEngine.dispatch({
            type: "thread.session.set",
            commandId: providerCommandId(event, "thread-session-set", thread.id),
            threadId: thread.id,
            session: {
              threadId: thread.id,
              status,
              engine: event.engine,
              runtimeMode: thread.session?.runtimeMode ?? "full-access",
              activeTurnId: nextActiveTurnId,
              lastError,
              updatedAt: now,
            },
            createdAt: now,
          });

          if (isTerminalTurnEvent) {
            // Goal tools update the command read model synchronously. Re-read it
            // here so a fast terminal event cannot overtake achieved/paused state.
            const settledThread = (yield* orchestrationEngine.getReadModel()).threads.find(
              (candidate) => candidate.id === thread.id,
            );
            if (
              settledThread &&
              settledThread.deletedAt == null &&
              settledThread.archivedAt == null &&
              settledThread.parentThreadId == null &&
              Boolean(activeThreadGoal(settledThread)?.trim()) &&
              settledThread.goalPausedAt == null
            ) {
              if (event.type === "turn.completed" && runtimeTurnState(event) === "completed") {
                yield* orchestrationEngine.dispatch({
                  type: "thread.goal.continue",
                  commandId: providerCommandId(event, "goal-continue", thread.id),
                  threadId: thread.id,
                  goalStartedAt: settledThread.goalStartedAt ?? null,
                  trigger: "turn-completed",
                  ...(eventTurnId !== undefined ? { sourceTurnId: eventTurnId } : {}),
                  createdAt: now,
                });
              } else {
                // Failed/interrupted work must not autonomously resurrect until
                // the user explicitly resumes the same persistent goal.
                yield* orchestrationEngine.dispatch({
                  type: "thread.meta.update",
                  commandId: providerCommandId(event, "goal-auto-pause", thread.id),
                  threadId: thread.id,
                  goalPaused: true,
                });
              }
            }
          }
        }
      }

      const toolOutputKey = event.itemId
        ? [event.threadId, event.turnId ?? "no-turn", event.itemId].join(":")
        : null;
      if (
        toolOutputKey &&
        event.type === "content.delta" &&
        (event.payload.streamKind === "command_output" ||
          event.payload.streamKind === "file_change_output") &&
        event.payload.delta.length > 0
      ) {
        yield* appendBufferedToolOutput(toolOutputKey, event.payload.delta);
      }

      const reasoningSummaryKey = reasoningSummaryBufferKey(event, thread.id);
      if (
        reasoningSummaryKey &&
        event.type === "content.delta" &&
        isReadableReasoningDelta(event.engine, event.payload.streamKind) &&
        event.payload.delta.length > 0
      ) {
        const summary = yield* appendBufferedReasoningSummary(
          reasoningSummaryKey,
          event,
          runtimeSequence,
        );
        if (summary) {
          yield* publishOrScheduleBufferedReasoning(reasoningSummaryKey, summary);
        }
      }

      const assistantDelta =
        event.type === "content.delta" && event.payload.streamKind === "assistant_text"
          ? event.payload.delta
          : undefined;
      const proposedPlanDelta =
        event.type === "turn.proposed.delta" ? event.payload.delta : undefined;

      const assistantOrActivityBoundary =
        (assistantDelta !== undefined && assistantDelta.length > 0) ||
        ((event.type === "item.started" ||
          event.type === "item.updated" ||
          event.type === "item.completed") &&
          event.payload.itemType !== "reasoning" &&
          event.payload.itemType !== "assistant_message") ||
        (event.type === "item.completed" &&
          event.payload.itemType === "assistant_message" &&
          hasRenderableAssistantText(event.payload.detail ?? ""));
      if (assistantOrActivityBoundary) {
        yield* flushBufferedReasoningBeforeBoundary(
          thread.id,
          event,
          toTurnId(event.turnId) ?? activeTurnId ?? undefined,
        );
      }

      if (assistantDelta && assistantDelta.length > 0) {
        const assistantMessageId = MessageId.makeUnsafe(
          `assistant:${event.itemId ?? event.turnId ?? event.eventId}`,
        );
        const turnId = toTurnId(event.turnId);
        if (turnId) {
          yield* rememberAssistantMessageId(thread.id, turnId, assistantMessageId);
          // Some engines can emit content before (or without) turn.started.
          // Treat the first concrete assistant delta as an equivalent arrival
          // signal so the FIFO request mode is bound before delivery is chosen.
          yield* matchStartedTurnAssistantDeliveryMode(thread.id, turnId);
        }

        const assistantDeliveryMode = yield* getAssistantDeliveryMode(
          thread.id,
          turnId ?? activeTurnId ?? undefined,
        );
        const statesForThread = segmentStateByThreadId.get(thread.id) ?? new Map();
        const previousSegmentState = statesForThread.get(assistantMessageId) ?? {
          hasText: false,
          splitPending: false,
        };
        if (previousSegmentState.lastAppliedRuntimeSequence !== runtimeSequence) {
          const startsNewSegment =
            !previousSegmentState.hasText || previousSegmentState.splitPending;
          const segmentStartedAt = startsNewSegment ? now : undefined;
          const nextSegmentState = {
            hasText: true,
            splitPending: false,
            lastAppliedRuntimeSequence: runtimeSequence,
          };
          const bufferedSegmentKey = assistantMessageSegmentKey(thread.id, assistantMessageId);
          if (assistantDeliveryMode === "buffered") {
            const alreadySpilled = bufferedTextSpilledByMessageKey.has(bufferedSegmentKey);
            const existingSegments = bufferedTextSegmentsByMessageKey.get(bufferedSegmentKey);
            const nextSegments = (() => {
              if (alreadySpilled) return undefined;
              const tail = existingSegments?.[existingSegments.length - 1];
              if (segmentStartedAt === undefined && tail !== undefined) {
                return [
                  ...existingSegments!.slice(0, -1),
                  {
                    sequence: tail.sequence,
                    startedAt: tail.startedAt,
                    text: `${tail.text}${assistantDelta}`,
                  },
                ];
              }
              return [
                ...(existingSegments ?? []),
                {
                  sequence: runtimeSequence,
                  startedAt: segmentStartedAt ?? now,
                  text: assistantDelta,
                },
              ];
            })();
            const bufferedPlan = yield* planBufferedAssistantText(
              assistantMessageId,
              assistantDelta,
            );
            if (bufferedPlan.shouldSpill) {
              yield* orchestrationEngine.dispatch({
                type: "thread.message.assistant.delta",
                commandId: providerCommandId(
                  event,
                  "assistant-delta-buffer-spill",
                  assistantMessageId,
                ),
                threadId: thread.id,
                messageId: assistantMessageId,
                delta: bufferedPlan.nextText,
                ...(turnId ? { turnId } : {}),
                createdAt: now,
              });
              yield* Cache.invalidate(bufferedAssistantTextByMessageId, assistantMessageId);
              bufferedTextSegmentsByMessageKey.delete(bufferedSegmentKey);
              bufferedTextSpilledByMessageKey.add(bufferedSegmentKey);
            } else {
              yield* Cache.set(
                bufferedAssistantTextByMessageId,
                assistantMessageId,
                bufferedPlan.nextText,
              );
              if (nextSegments !== undefined) {
                bufferedTextSegmentsByMessageKey.set(bufferedSegmentKey, nextSegments);
              }
            }
            statesForThread.set(assistantMessageId, nextSegmentState);
            segmentStateByThreadId.set(thread.id, statesForThread);
          } else {
            yield* orchestrationEngine.dispatch({
              type: "thread.message.assistant.delta",
              commandId: providerCommandId(event, "assistant-delta", assistantMessageId),
              threadId: thread.id,
              messageId: assistantMessageId,
              delta: assistantDelta,
              ...(turnId ? { turnId } : {}),
              ...(segmentStartedAt ? { segmentStartedAt, segmentSequence: runtimeSequence } : {}),
              createdAt: now,
            });
            statesForThread.set(assistantMessageId, nextSegmentState);
            segmentStateByThreadId.set(thread.id, statesForThread);
          }
        }
      }

      if (proposedPlanDelta && proposedPlanDelta.length > 0) {
        const planId = proposedPlanIdFromEvent(event, thread.id);
        yield* appendBufferedProposedPlan(planId, proposedPlanDelta, now);
      }

      const assistantCompletion =
        event.type === "item.completed" && event.payload.itemType === "assistant_message"
          ? {
              fallbackText: event.payload.detail,
            }
          : undefined;
      const proposedPlanCompletion =
        event.type === "turn.proposed.completed"
          ? {
              planId: proposedPlanIdFromEvent(event, thread.id),
              turnId: toTurnId(event.turnId),
              planMarkdown: event.payload.planMarkdown,
            }
          : undefined;

      if (assistantCompletion) {
        const turnId = toTurnId(event.turnId);
        const assistantMessageId = yield* resolveAssistantCompletionMessageId({
          event,
          thread,
          ...(turnId ? { turnId } : {}),
        });
        const existingAssistantMessage = thread.messages.find(
          (entry) => entry.id === assistantMessageId,
        );
        const shouldApplyFallbackCompletionText =
          !existingAssistantMessage || existingAssistantMessage.text.length === 0;
        if (turnId) {
          yield* rememberAssistantMessageId(thread.id, turnId, assistantMessageId);
        }

        yield* finalizeAssistantMessage({
          event,
          threadId: thread.id,
          messageId: assistantMessageId,
          ...(turnId ? { turnId } : {}),
          createdAt: now,
          commandTag: "assistant-complete",
          finalDeltaCommandTag: "assistant-delta-finalize",
          ...(assistantCompletion.fallbackText !== undefined && shouldApplyFallbackCompletionText
            ? { fallbackText: assistantCompletion.fallbackText }
            : {}),
        });

        if (turnId) {
          yield* forgetAssistantMessageId(thread.id, turnId, assistantMessageId);
        }
      }

      if (proposedPlanCompletion) {
        yield* finalizeBufferedProposedPlan({
          event,
          threadId: thread.id,
          threadProposedPlans: thread.proposedPlans,
          planId: proposedPlanCompletion.planId,
          ...(proposedPlanCompletion.turnId ? { turnId: proposedPlanCompletion.turnId } : {}),
          fallbackMarkdown: proposedPlanCompletion.planMarkdown,
          updatedAt: now,
        });
      }

      const generatedImagePath = generatedImagePathFromRuntimeEvent(event);
      if (generatedImagePath) {
        const generatedImageTurnId = toTurnId(event.turnId) ?? activeTurnId ?? undefined;
        // Studio threads get a durable in-workspace copy (plus direct Output panel
        // attribution); the transcript then references that copy so the image outlives
        // any Codex-home cleanup. Non-Studio threads keep the original path.
        const copied = yield* materializeStudioGeneratedImage({
          event,
          thread,
          imagePath: generatedImagePath,
          turnId: generatedImageTurnId,
          createdAt: now,
        });
        const displayPath = copied?.fullPath ?? generatedImagePath;
        if (generatedImageTurnId) {
          // Defer the transcript reference to turn settle (see the flush helper); the
          // "Generated image" work row already surfaces progress mid-turn.
          yield* rememberPendingGeneratedImage(thread.id, generatedImageTurnId, displayPath);
        } else {
          // No turn to correlate with: attach immediately to the same engine item
          // (replay) or an existing reference, else a standalone image-only message.
          const messages = thread.messages;
          const sameItemMessageId = event.itemId
            ? MessageId.makeUnsafe(`assistant:${event.itemId}`)
            : undefined;
          const markdown = generatedImageMarkdown(displayPath);
          const targetMessage = messages.find(
            (message) =>
              message.role === "assistant" &&
              (message.id === sameItemMessageId ||
                message.text.includes(displayPath) ||
                message.text.includes(markdown)),
          );
          yield* appendGeneratedImagesToAssistantMessage({
            event,
            threadId: thread.id,
            targetMessage,
            newMessageId: MessageId.makeUnsafe(`assistant:image:${event.itemId ?? event.eventId}`),
            imagePaths: [displayPath],
            createdAt: now,
          });
        }
      }

      if (isTerminalTurnEvent) {
        const finalizedTurnId = eventTurnId ?? activeTurnId ?? undefined;
        if (finalizedTurnId) {
          const assistantMessageIds = yield* getAssistantMessageIdsForTurn(
            thread.id,
            finalizedTurnId,
          );
          yield* Effect.forEach(assistantMessageIds, (assistantMessageId) =>
            finalizeAssistantMessage({
              event,
              threadId: thread.id,
              messageId: assistantMessageId,
              turnId: finalizedTurnId,
              createdAt: now,
              commandTag: "assistant-complete-finalize",
              finalDeltaCommandTag: "assistant-delta-finalize-fallback",
            }),
          );
          yield* clearAssistantMessageIdsForTurn(thread.id, finalizedTurnId);

          // After finalization the turn's terminal assistant message is settled;
          // hand it the images the turn produced (an artifact-only turn's final
          // message is intentionally empty — the image markdown becomes its body).
          yield* flushPendingGeneratedImagesForTurn({
            event,
            thread,
            turnId: finalizedTurnId,
            createdAt: now,
          });

          yield* finalizeBufferedProposedPlan({
            event,
            threadId: thread.id,
            threadProposedPlans: thread.proposedPlans,
            planId: proposedPlanIdForTurn(thread.id, finalizedTurnId),
            turnId: finalizedTurnId,
            updatedAt: now,
          });
          yield* clearProviderDiffPlaceholder(thread.id, finalizedTurnId);
        }
      }

      if (event.type === "session.exited") {
        yield* clearOutstandingTurns(thread.id);
        const exitedTurnId = eventTurnId ?? activeTurnId ?? undefined;
        if (exitedTurnId) {
          yield* finalizeBufferedAssistantMessagesForTurn({
            event,
            threadId: thread.id,
            turnId: exitedTurnId,
            createdAt: now,
            commandTag: "assistant-complete-session-exit",
            finalDeltaCommandTag: "assistant-delta-session-exit",
          });
          // Images produced before the session died are real; surface them now.
          yield* flushPendingGeneratedImagesForTurn({
            event,
            thread,
            turnId: exitedTurnId,
            createdAt: now,
          });
          yield* clearProviderDiffPlaceholder(thread.id, exitedTurnId);
        }
        yield* clearTurnStateForSession(thread.id);
      }

      if (event.type === "runtime.error") {
        const runtimeErrorMessage =
          asString(runtimePayloadRecord(event)?.message) ?? "Engine runtime error";
        const erroredTurnId = eventTurnId ?? activeTurnId ?? undefined;

        if (erroredTurnId) {
          yield* finalizeBufferedAssistantMessagesForTurn({
            event,
            threadId: thread.id,
            turnId: erroredTurnId,
            createdAt: now,
            commandTag: "assistant-complete-runtime-error",
            finalDeltaCommandTag: "assistant-delta-runtime-error",
          });
          yield* flushPendingGeneratedImagesForTurn({
            event,
            thread,
            turnId: erroredTurnId,
            createdAt: now,
          });
          yield* clearProviderDiffPlaceholder(thread.id, erroredTurnId);
        }

        const shouldApplyRuntimeError = !STRICT_PROVIDER_LIFECYCLE_GUARD
          ? true
          : activeTurnId === null || eventTurnId === undefined || sameId(activeTurnId, eventTurnId);

        if (shouldApplyRuntimeError) {
          yield* orchestrationEngine.dispatch({
            type: "thread.session.set",
            commandId: providerCommandId(event, "runtime-error-session-set", thread.id),
            threadId: thread.id,
            session: {
              threadId: thread.id,
              status: "error",
              engine: event.engine,
              runtimeMode: thread.session?.runtimeMode ?? "full-access",
              activeTurnId: eventTurnId ?? null,
              lastError: runtimeErrorMessage,
              updatedAt: now,
            },
            createdAt: now,
          });
        }
      }

      if (event.type === "thread.metadata.updated" && event.payload.name) {
        yield* orchestrationEngine.dispatch({
          type: "thread.meta.update",
          commandId: providerCommandId(event, "thread-meta-update", thread.id),
          threadId: thread.id,
          title: event.payload.name,
        });
      }

      if (event.type === "turn.diff.updated") {
        const turnId = toTurnId(event.turnId);
        if (turnId && (yield* isGitRepoForThread(thread.id))) {
          const existingCheckpoint = thread.checkpoints.find((c) => c.turnId === turnId);
          const placeholderKey = providerTurnKey(thread.id, turnId);
          const trackedPlaceholder = (yield* Ref.get(providerDiffPlaceholdersRef)).get(
            placeholderKey,
          );
          const existingProviderPlaceholder =
            existingCheckpoint?.checkpointRef.startsWith("engine-diff:") === true
              ? {
                  checkpointRef: existingCheckpoint.checkpointRef,
                  checkpointTurnCount: existingCheckpoint.checkpointTurnCount,
                  files: existingCheckpoint.files,
                }
              : null;
          // Only engine-diff placeholders are live-updated. A real checkpoint from
          // CheckpointReactor is the terminal turn diff and must stay authoritative.
          if (existingCheckpoint && !existingProviderPlaceholder) {
            yield* clearProviderDiffPlaceholder(thread.id, turnId);
          } else {
            const canParseLiveDiffPatch = yield* supportsLiveTurnDiffPatch(event.engine);
            const livePlaceholder = trackedPlaceholder ?? existingProviderPlaceholder;
            const maxTurnCount = thread.checkpoints.reduce(
              (max, c) => Math.max(max, c.checkpointTurnCount),
              0,
            );
            const files =
              (canParseLiveDiffPatch
                ? yield* parseProviderTurnDiffFiles(event.payload.unifiedDiff)
                : null) ??
              trackedPlaceholder?.files ??
              existingCheckpoint?.files ??
              [];
            const checkpointRef =
              livePlaceholder?.checkpointRef ??
              CheckpointRef.makeUnsafe(`engine-diff:${event.eventId}`);
            const checkpointTurnCount = livePlaceholder?.checkpointTurnCount ?? maxTurnCount + 1;
            // Leave assistantMessageId undefined on the placeholder: the real
            // capture performed by CheckpointReactor will resolve the actual
            // assistant MessageId once the message is finalized. Emitting a
            // synthetic id here would leak an incorrect key that can collide
            // across turns and cause the diff card to render on the wrong row.
            yield* orchestrationEngine.dispatch({
              type: "thread.turn.diff.complete",
              commandId: providerCommandId(
                event,
                "thread-turn-diff-complete",
                `${thread.id}:${turnId}`,
              ),
              threadId: thread.id,
              turnId,
              completedAt: now,
              checkpointRef,
              status: "missing",
              files,
              assistantMessageId: undefined,
              checkpointTurnCount,
              createdAt: now,
            });
            if (canParseLiveDiffPatch) {
              yield* Ref.update(providerDiffPlaceholdersRef, (placeholders) => {
                const next = new Map(placeholders);
                next.set(placeholderKey, {
                  checkpointRef,
                  checkpointTurnCount,
                  files,
                });
                return next;
              });
            }
          }
        }
      }

      // Complete the hot reasoning row before projecting a terminal boundary.
      // This preserves causal delivery even though both facts share one serial
      // ingestion pass, and invalidates any detached trailing timer first.
      if (isTerminalTurnEvent) {
        yield* settleBufferedReasoningSummaries(
          thread.id,
          event,
          runtimeSequence,
          toTurnId(event.turnId),
        );
      } else if (event.type === "session.exited") {
        yield* settleBufferedReasoningSummaries(thread.id, event, runtimeSequence);
      } else if (event.type === "runtime.error") {
        yield* settleBufferedReasoningSummaries(
          thread.id,
          event,
          runtimeSequence,
          eventTurnId ?? activeTurnId ?? undefined,
        );
      }

      const bufferedReasoningSummary =
        event.type === "item.completed" && reasoningSummaryKey
          ? yield* getBufferedReasoningSummary(reasoningSummaryKey)
          : undefined;
      const reasoningWasSegmented = bufferedReasoningSummary?.segmented === true;
      const activityEvent =
        event.type === "item.completed" && reasoningSummaryKey
          ? withBufferedReasoningSummary(event, bufferedReasoningSummary, reasoningWasSegmented)
          : event.type === "item.completed" && toolOutputKey
            ? withBufferedToolOutputData(event, yield* getBufferedToolOutput(toolOutputKey))
            : event.type === "item.updated" && toolOutputKey
              ? withBufferedToolOutputData(event, yield* getBufferedToolOutput(toolOutputKey))
              : event;
      const suppressReplayedReasoningCompletion =
        event.type === "item.completed" &&
        event.payload.itemType === "reasoning" &&
        reasoningWasSegmented &&
        joinedBufferedReasoningSummary(bufferedReasoningSummary) === undefined;
      const projectedActivities = suppressReplayedReasoningCompletion
        ? []
        : projectProviderRuntimeActivities(
            activityEvent,
            event.type === "item.completed" &&
              bufferedReasoningSummary?.firstRuntimeSequence !== undefined
              ? bufferedReasoningSummary.firstRuntimeSequence
              : runtimeSequence,
          );
      yield* dispatchProjectedActivities(activityEvent, thread.id, projectedActivities);
      if (event.type === "item.completed" && reasoningSummaryKey) {
        yield* Cache.invalidate(bufferedReasoningSummaryByKey, reasoningSummaryKey);
      } else if (event.type === "item.completed" && toolOutputKey) {
        yield* Cache.invalidate(bufferedToolOutputByKey, toolOutputKey);
      }

      // Exact-turn delivery modes deliberately survive terminal events for a
      // bounded TTL: engines may send late item/delta events after settlement.
      // Unbound request/turn state is safe to clear when a session ends before
      // the two sides can be matched.
      if (event.type === "session.exited" || event.type === "runtime.error") {
        yield* clearAssistantDeliveryModeBindingsForThread(thread.id);
      }
    });

  const processRuntimeEvent = (event: EngineRuntimeEvent, runtimeSequence: number) =>
    engineService.withRuntimeEventProjectionLease(
      event.threadId,
      processRuntimeEventWithinLease(event, runtimeSequence),
    );

  const processDomainEvent = (event: RuntimeIngestionDomainEvent) =>
    Effect.gen(function* () {
      if (event.type === "thread.reverted" || event.type === "thread.conversation-rolled-back") {
        clearAssistantTextSegmentStateForThread(event.payload.threadId);
        yield* clearActivityUpdateFingerprints(event.payload.threadId);
        yield* clearAssistantDeliveryModeBindingsForThread(event.payload.threadId);
        yield* clearOutstandingTurns(event.payload.threadId);
        return;
      }
      const nextAssistantDeliveryMode =
        event.payload.assistantDeliveryMode ?? DEFAULT_ASSISTANT_DELIVERY_MODE;
      const thread = Option.getOrUndefined(
        yield* projectionSnapshotQuery.getThreadShellById(event.payload.threadId),
      );
      // A native steer rides the live turn, so no later turn.started will
      // arrive to match a pending delivery-mode request — bind to the live
      // turn immediately instead.
      const steerEngine = thread?.session?.engine ?? thread?.engineSelection.engine;
      const isNativeSteer =
        event.payload.dispatchMode === "steer" &&
        steerEngine !== undefined &&
        event.payload.steeringDisposition === "native";
      let deliveryTurnId: TurnId | undefined;
      if (isNativeSteer) {
        let activeTurnId = thread?.session?.activeTurnId ?? undefined;
        if (!activeTurnId) {
          const runtimeSession = (yield* engineService.listSessions()).find(
            (session) => session.threadId === event.payload.threadId,
          );
          activeTurnId = toTurnId(runtimeSession?.activeTurnId);
        }
        if (!activeTurnId) {
          return;
        }
        deliveryTurnId = activeTurnId;
        yield* Cache.set(
          assistantDeliveryModeByTurnKey,
          providerTurnKey(event.payload.threadId, activeTurnId),
          nextAssistantDeliveryMode,
        );
      } else {
        deliveryTurnId = yield* matchAssistantDeliveryModeRequest(
          event.payload.threadId,
          nextAssistantDeliveryMode,
        );
      }
      if (!deliveryTurnId || nextAssistantDeliveryMode !== "streaming") {
        return;
      }

      const flushEvent: EngineRuntimeEvent = {
        type: "turn.started",
        eventId: event.eventId,
        engine: (steerEngine ?? "codex") as EngineKind,
        createdAt: event.payload.createdAt,
        threadId: event.payload.threadId,
        turnId: deliveryTurnId,
        payload: {},
      };
      yield* flushBufferedAssistantMessagesForTurn({
        event: flushEvent,
        threadId: event.payload.threadId,
        turnId: deliveryTurnId,
        createdAt: event.payload.createdAt,
        commandTag: "assistant-delta-domain-flush",
      });
    });

  const processInput = (input: RuntimeIngestionInput) =>
    input.source === "runtime"
      ? processRuntimeEvent(input.event, input.sequence).pipe(
          Effect.andThen(
            runtimeEvents.advanceConsumerCursor({
              consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
              eventSequence: input.sequence,
              updatedAt: new Date().toISOString(),
            }),
          ),
          Effect.flatMap((advanced) =>
            advanced
              ? Effect.void
              : Effect.die(
                  new Error(
                    `Engine runtime cursor could not advance through event ${input.sequence}`,
                  ),
                ),
          ),
        )
      : input.source === "domain"
        ? processDomainEvent(input.event)
        : publishBufferedReasoningUpdate(input.key, input.generation);

  // A failed journal row blocks later runtime rows in the same page. Domain
  // inputs still drain, and the durable poll retries from the exact cursor.
  let runtimeJournalPageBlocked = false;

  const quarantineUnreplayableCommand = Effect.fnUntraced(function* (
    input: Extract<RuntimeIngestionInput, { source: "runtime" }>,
    error: OrchestrationCommandIdentityCollisionError | OrchestrationCommandPreviouslyRejectedError,
  ) {
    // A command receipt permanently binds one command id to one fingerprint,
    // and a stored rejection permanently binds one command id to its refusal.
    // Retrying the same runtime row can therefore never make an identity
    // collision or a previously rejected command succeed. This most commonly
    // happens when a crash or upgrade leaves a partially projected event whose
    // remaining command is rebuilt from newer thread state, or when a command
    // was durably rejected by an invariant on first dispatch.
    //
    // The runtime journal has one global cursor, so waiting for the generic
    // poison gate here drops every later event for every engine — including
    // assistant output — for at least a minute. Quarantine this deterministically
    // unreplayable row immediately, exactly as the poison gate eventually would,
    // and keep the accepted event available in the retained diagnostic tail.
    const advanced = yield* runtimeEvents
      .advanceConsumerCursor({
        consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
        eventSequence: input.sequence,
        updatedAt: new Date().toISOString(),
      })
      .pipe(
        Effect.catchCause((cause) => {
          runtimeJournalPageBlocked = true;
          return Effect.logWarning("engine runtime unreplayable command quarantine failed", {
            sequence: input.sequence,
            eventId: input.event.eventId,
            eventType: input.event.type,
            threadId: input.event.threadId,
            engine: input.event.engine,
            commandId: error.commandId,
            cause: Cause.pretty(cause),
          }).pipe(Effect.as(null));
        }),
      );
    if (advanced === null) {
      return;
    }
    if (!advanced) {
      runtimeJournalPageBlocked = true;
      yield* Effect.logWarning("engine runtime unreplayable command could not be quarantined", {
        sequence: input.sequence,
        eventId: input.event.eventId,
        eventType: input.event.type,
        threadId: input.event.threadId,
        engine: input.event.engine,
        commandId: error.commandId,
        detail: error.detail,
      });
      return;
    }
    yield* Effect.logError(
      "engine runtime unreplayable command quarantined without blocking the journal",
      {
        sequence: input.sequence,
        eventId: input.event.eventId,
        eventType: input.event.type,
        threadId: input.event.threadId,
        engine: input.event.engine,
        commandId: error.commandId,
        detail: error.detail,
      },
    );
  });

  const processInputSafely = (input: RuntimeIngestionInput) =>
    input.source === "runtime" && runtimeJournalPageBlocked
      ? Effect.void
      : processInput(input).pipe(
          Effect.catchCause((cause) => {
            if (Cause.hasInterruptsOnly(cause)) {
              return Effect.failCause(cause);
            }
            const error = Option.getOrUndefined(Cause.findErrorOption(cause));
            if (
              input.source === "runtime" &&
              (error instanceof OrchestrationCommandIdentityCollisionError ||
                error instanceof OrchestrationCommandPreviouslyRejectedError)
            ) {
              return quarantineUnreplayableCommand(input, error);
            }
            if (input.source === "runtime") {
              runtimeJournalPageBlocked = true;
            }
            return Effect.logWarning("engine runtime ingestion failed to process input", {
              source: input.source,
              ...(input.source === "reasoning-flush"
                ? { reasoningKey: input.key, generation: input.generation }
                : {
                    eventId: input.event.eventId,
                    eventType: input.event.type,
                  }),
              cause: Cause.pretty(cause),
            });
          }),
        );

  const worker = yield* makeDrainableWorker(processInputSafely, {
    capacity: ENGINE_RUNTIME_INGESTION_CAPACITY,
  });
  enqueueReasoningFlush = worker.enqueue;
  const runtimeJournalDrainLock = yield* Semaphore.make(1);

  // A deterministically failing row would otherwise pin the single global
  // cursor forever: the drain never advances, the durable poller re-reads the
  // same head row, and projection freezes for every thread and every engine
  // — durably, across restarts. Once the poison gate trips (see the module for
  // why it needs both an attempt and a wall-clock gate), the head row is
  // dead-lettered: skipped with an error log so the journal flows again.
  const poisonGate = makeRuntimeJournalPoisonGate();

  const deadLetterPoisonHeadRow = Effect.gen(function* () {
    const cursor = yield* runtimeEvents.getConsumerCursor(ENGINE_RUNTIME_INGESTION_CONSUMER);
    if (!poisonGate.noteBlockedDrain(cursor, Date.now())) return false;
    const highWater = yield* runtimeEvents.getHighWaterSequence;
    const page = yield* runtimeEvents.readAfter({
      sequenceExclusive: cursor,
      throughSequenceInclusive: highWater,
      limit: 1,
    });
    const poison = page[0];
    if (poison === undefined) return false;
    yield* Effect.logError("engine runtime journal dead-lettered a poison event", {
      sequence: poison.sequence,
      eventId: poison.event.eventId,
      eventType: poison.event.type,
      threadId: poison.event.threadId,
      engine: poison.event.engine,
    });
    const advanced = yield* runtimeEvents.advanceConsumerCursor({
      consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
      eventSequence: poison.sequence,
      updatedAt: new Date().toISOString(),
    });
    poisonGate.reset();
    return advanced;
  });

  const drainRuntimeJournalThrough = (throughSequenceInclusive?: number) =>
    runtimeJournalDrainLock.withPermits(1)(
      Effect.gen(function* () {
        const replayFence = throughSequenceInclusive ?? (yield* runtimeEvents.getHighWaterSequence);
        let hadBacklog = false;
        while (true) {
          const cursor = yield* runtimeEvents.getConsumerCursor(ENGINE_RUNTIME_INGESTION_CONSUMER);
          if (cursor >= replayFence) return hadBacklog;
          hadBacklog = true;

          const page = yield* runtimeEvents.readAfter({
            sequenceExclusive: cursor,
            throughSequenceInclusive: replayFence,
            limit: ENGINE_RUNTIME_REPLAY_PAGE_SIZE,
          });
          if (page.length === 0) {
            return yield* Effect.die(
              new Error(`Engine runtime journal is missing rows after cursor ${cursor}`),
            );
          }

          runtimeJournalPageBlocked = false;
          yield* Effect.forEach(page, (entry) =>
            worker.enqueue({
              source: "runtime",
              sequence: entry.sequence,
              event: entry.event,
            }),
          );
          yield* worker.drain;
          if (runtimeJournalPageBlocked) {
            // Either the poison threshold was reached and the head row was
            // skipped (loop again from the fresh cursor), or the drain yields
            // to the durable poller, which retries from the exact cursor.
            if (yield* deadLetterPoisonHeadRow) continue;
            return hadBacklog;
          }

          const advancedCursor = yield* runtimeEvents.getConsumerCursor(
            ENGINE_RUNTIME_INGESTION_CONSUMER,
          );
          if (advancedCursor <= cursor) {
            return yield* Effect.die(
              new Error(`Engine runtime journal made no progress after cursor ${cursor}`),
            );
          }
        }
      }),
    );

  const drainRuntimeJournal = drainRuntimeJournalThrough();

  const drainRuntimeJournalSafely = drainRuntimeJournal.pipe(
    Effect.catchCause((cause) => {
      if (Cause.hasInterruptsOnly(cause)) return Effect.failCause(cause);
      return Effect.logWarning("engine runtime journal drain failed", {
        cause: Cause.pretty(cause),
      }).pipe(Effect.as(true));
    }),
  );

  const pollRuntimeJournalSafely = Effect.gen(function* () {
    // Keep the long-lived loop inside one generator fiber. Recursively chaining
    // a fresh Effect for every tick retains work in Bun's Effect interpreter
    // and grows CPU/RSS over time even though each individual poll is tiny.
    let delayMs = ENGINE_RUNTIME_REPLAY_POLL_MIN_MS;
    while (true) {
      yield* Effect.sleep(Duration.millis(delayMs));
      const hadBacklog = yield* drainRuntimeJournalSafely;
      delayMs = nextRuntimeJournalSafetyPollDelayMs(delayMs, hadBacklog);
    }
  });

  const reconcileSettledOpenTurns: EngineRuntimeIngestionShape["reconcileSettledOpenTurns"] =
    runtimeEvents.pruneSettledOpenTurns.pipe(
      Effect.catchCause((cause) => {
        if (Cause.hasInterruptsOnly(cause)) return Effect.interrupt;
        return Effect.logWarning("engine runtime open-turn cleanup failed", {
          cause: Cause.pretty(cause),
        });
      }),
    );

  const prepareAcceptedRuntimeEventReplay = Effect.fnUntraced(function* (
    event: EngineRuntimeEvent,
  ) {
    if (
      event.type !== "content.delta" ||
      event.payload.streamKind !== "assistant_text" ||
      event.turnId === undefined
    ) {
      return;
    }
    const turnId = toTurnId(event.turnId);
    if (!turnId) return;
    const messageId = MessageId.makeUnsafe(
      `assistant:${event.itemId ?? event.turnId ?? event.eventId}`,
    );
    const streamingReceipt = yield* commandReceipts.getByCommandId({
      commandId: providerCommandId(event, "assistant-delta", messageId),
    });
    yield* Cache.set(
      assistantDeliveryModeByTurnKey,
      providerTurnKey(event.threadId, turnId),
      Option.isSome(streamingReceipt) ? "streaming" : "buffered",
    );
  });

  // This rebuild only restores bounded process-local caches — the durable
  // effects it re-derives are already committed and deduplicated by command
  // receipt. It also runs inside `start`, which is on the server's boot path
  // and dies on failure, so a single unreplayable row (a stored command
  // rejection, a decode failure) must degrade this thread's caches rather than
  // make the backend unbootable: the state is rebuildable, the boot loop is not
  // recoverable without deleting user data.
  const rebuildAcceptedOpenTurnStateForEvent = (event: EngineRuntimeEvent, sequence: number) =>
    prepareAcceptedRuntimeEventReplay(event).pipe(
      Effect.andThen(processRuntimeEvent(event, sequence)),
      Effect.catchCause((cause) =>
        Cause.hasInterruptsOnly(cause)
          ? Effect.failCause(cause)
          : Effect.logWarning("engine runtime ingestion failed to rebuild open-turn state", {
              eventId: event.eventId,
              eventType: event.type,
              threadId: event.threadId,
              cause: Cause.pretty(cause),
            }),
      ),
    );

  // Accepted open-turn rows may have updated only bounded process-local
  // aggregation state. Re-run them before new output; stable command receipts
  // deduplicate durable effects while the caches are rebuilt in event order.
  const rebuildAcceptedOpenTurnState = Effect.gen(function* () {
    let sequence = 0;
    while (true) {
      const page = yield* runtimeEvents.readAcceptedOpenTurnEvents({
        consumerName: ENGINE_RUNTIME_INGESTION_CONSUMER,
        sequenceExclusive: sequence,
        limit: ENGINE_RUNTIME_REPLAY_PAGE_SIZE,
      });
      if (page.length === 0) return;
      for (const entry of page) {
        yield* rebuildAcceptedOpenTurnStateForEvent(entry.event, entry.sequence);
        sequence = entry.sequence;
      }
      if (page.length < ENGINE_RUNTIME_REPLAY_PAGE_SIZE) return;
    }
  });
  const startupRuntimeReplayComplete = yield* Deferred.make<void>();

  const start: EngineRuntimeIngestionShape["start"] = startDrainableWorkerProducers(
    worker,
    Effect.gen(function* () {
      const streamPersistedEvents = engineService.streamPersistedEvents;
      const persistedRuntimeEvents = selectProviderRuntimeJournalStream({
        streamEvents: engineService.streamEvents,
        ...(streamPersistedEvents === undefined ? {} : { streamPersistedEvents }),
        append: (event) => runtimeEvents.append(event),
      });
      yield* Effect.forkScoped(
        Stream.runForEach(persistedRuntimeEvents, (persisted) =>
          Deferred.await(startupRuntimeReplayComplete).pipe(
            Effect.andThen(drainRuntimeJournalThrough(persisted.sequence)),
            Effect.catchCause((cause) =>
              Cause.hasInterruptsOnly(cause)
                ? Effect.failCause(cause)
                : Effect.logWarning("engine runtime event journal ingestion failed", {
                    eventId: persisted.event.eventId,
                    eventType: persisted.event.type,
                    cause: Cause.pretty(cause),
                  }),
            ),
          ),
        ),
      );
      yield* Effect.forkScoped(
        Stream.runForEach(orchestrationEngine.streamDomainEvents, (event) => {
          if (
            event.type !== "thread.turn-start-requested" &&
            event.type !== "thread.reverted" &&
            event.type !== "thread.conversation-rolled-back"
          ) {
            return Effect.void;
          }
          return Deferred.await(startupRuntimeReplayComplete).pipe(
            Effect.andThen(worker.enqueue({ source: "domain", event })),
          );
        }),
      );
      // A previous startup reconciliation can leave a durable turn terminal
      // while the runtime replay ledger still calls it open. Replaying that
      // stale row can reuse a command id with a payload derived from the newer
      // terminal projection, so remove settled rows before rebuilding
      // process-local state.
      yield* runtimeEvents.pruneSettledOpenTurns;
      yield* rebuildAcceptedOpenTurnState;
      yield* drainRuntimeJournal;
      yield* Deferred.succeed(startupRuntimeReplayComplete, undefined);
      yield* Effect.forkScoped(pollRuntimeJournalSafely);
    }),
  ).pipe(Effect.orDie);

  const drainThroughCurrentHighWater = Effect.gen(function* () {
    const replayFence = yield* runtimeEvents.getHighWaterSequence;
    yield* drainRuntimeJournalThrough(replayFence);
    yield* worker.drain;
    const cursor = yield* runtimeEvents.getConsumerCursor(ENGINE_RUNTIME_INGESTION_CONSUMER);
    if (cursor < replayFence) {
      return yield* Effect.die(
        new Error(`Engine runtime journal stopped at ${cursor} before drain fence ${replayFence}`),
      );
    }
  }).pipe(Effect.orDie);

  return {
    start,
    reconcileSettledOpenTurns,
    drain: drainThroughCurrentHighWater,
  } satisfies EngineRuntimeIngestionShape;
});

export const EngineRuntimeIngestionLive = Layer.effect(EngineRuntimeIngestionService, make).pipe(
  Layer.provide(
    Layer.mergeAll(
      ProjectionTurnRepositoryLive,
      ProjectionPendingInteractionRepositoryLive,
      EngineRuntimeEventRepositoryLive,
      OrchestrationCommandReceiptRepositoryLive,
      EngineSessionDirectoryLive.pipe(Layer.provide(EngineSessionRuntimeRepositoryLive)),
    ),
  ),
);
