/**
 * EngineServiceLive - Cross-engine orchestration layer.
 *
 * Routes validated transport/API calls to engine adapters through
 * `EngineAdapterRegistry` and `EngineSessionDirectory`, and exposes a
 * unified engine event stream for subscribers.
 *
 * It does not implement engine protocol details (adapter concern).
 *
 * @module EngineServiceLive
 */
import {
  EventId,
  EngineCompactThreadInput,
  EngineForkThreadInput,
  EngineSelection,
  NonNegativeInt,
  ThreadId,
  EngineInterruptTurnInput,
  EngineStopTaskInput,
  EngineBackgroundTaskInput,
  EngineSteerSubagentInput,
  EngineRespondToRequestInput,
  EngineRespondToUserInputInput,
  EngineSendTurnInput,
  EngineStartReviewInput,
  EngineSteerTurnInput,
  EngineSessionStartInput,
  EngineStopSessionInput,
  EngineStartOptions,
  EngineWorkSurface,
  TurnId,
  type EngineRuntimeEvent,
  type EngineSession,
} from "@harnessos/contracts";
import { createHash, randomUUID } from "node:crypto";
import {
  Cause,
  Duration,
  Effect,
  Exit,
  Layer,
  Option,
  PubSub,
  Schema,
  SchemaIssue,
  Scope,
  Stream,
} from "effect";
import { nonEmptyTrimmed } from "@harnessos/shared/text";
import { engineExecutionStructure } from "../engineExecutionStructure.ts";

import {
  EngineAdapterProcessError,
  EngineSessionDirectoryPersistenceError,
  EngineValidationError,
} from "../Errors.ts";
import { EngineAdapterRegistry } from "../Services/EngineAdapterRegistry.ts";
import { EngineService, type EngineServiceShape } from "../Services/EngineService.ts";
import {
  EngineSessionDirectory,
  type EngineRuntimeBinding,
  type EngineSessionDirectoryWriteError,
} from "../Services/EngineSessionDirectory.ts";
import { type EventNdjsonLogger, makeEventNdjsonLogger } from "./EventNdjsonLogger.ts";
import { PersistenceDecodeError } from "../../persistence/Errors.ts";
import {
  EngineRuntimeEventRepository,
  type PersistedEngineRuntimeEvent,
} from "../../persistence/Services/EngineRuntimeEvents.ts";
import {
  classifyTerminalTurnApplicability,
  isStartedTurnApplicable,
} from "../terminalTurnApplicability.ts";
import { makeEngineLifecycleCoordinator } from "../engineLifecycleCoordinator.ts";
import { makeKeyedLock } from "../keyedLock.ts";
import { carryEngineAttachmentPaths } from "../engineAttachmentPaths.ts";
import {
  ENGINE_INTERRUPT_EVENT_ID_PREFIX,
  ENGINE_INTERRUPT_REASON,
  ENGINE_INTERRUPT_RUNTIME_FENCED_EVENT,
} from "../engineInterruptSettlement.ts";
import {
  makeEngineRuntimeEventPumpHealthRegistry,
  runEngineRuntimeEventPump,
} from "../engineRuntimeEventPump.ts";
import {
  HOST_GATEWAY_CREDENTIAL_ROTATION_REQUIRED,
  HOST_GATEWAY_TURN_AUTHORITY_RETIRED,
} from "../../hostGateway/sessionLease.ts";

export interface EngineServiceLiveOptions {
  readonly canonicalEventLogPath?: string;
  readonly canonicalEventLogger?: EventNdjsonLogger;
  readonly runtimeIdleStopMs?: number;
  /** Test/embedding override for the lossless runtime-event fan-out budget. */
  readonly runtimeEventBufferCapacity?: number;
  /** Production journal hook. The event must be durable before this effect returns. */
  readonly persistRuntimeEvent?: (
    event: EngineRuntimeEvent,
  ) => Effect.Effect<PersistedEngineRuntimeEvent, unknown>;
  /** Durable fallback for events that can never be accepted by the canonical journal. */
  readonly quarantineRuntimeEvent?: (
    event: EngineRuntimeEvent,
    cause: string,
  ) => Effect.Effect<void, unknown>;
  /** Test override for supervised event retry timing. */
  readonly runtimeEventRetryBaseDelayMs?: number;
  readonly runtimeEventRetryMaxDelayMs?: number;
}

const DEFAULT_PROVIDER_RUNTIME_IDLE_STOP_MS = 10 * 60 * 1000;
export const ENGINE_RUNTIME_EVENT_BUFFER_CAPACITY = 2_048;
export const ENGINE_RUNTIME_QUARANTINE_CAUSE_MAX_BYTES = 16 * 1024;
const configuredEngineRuntimeIdleStopMs = process.env.HARNESSOS_ENGINE_RUNTIME_IDLE_STOP_MS;
const ENGINE_RUNTIME_IDLE_STOP_MS = Number.isFinite(Number(configuredEngineRuntimeIdleStopMs))
  ? Math.max(0, Number(configuredEngineRuntimeIdleStopMs))
  : DEFAULT_PROVIDER_RUNTIME_IDLE_STOP_MS;
const MAX_TARGETED_CHILD_INTERRUPT_TOMBSTONES = 16_384;

function validateRuntimeModeStructure(
  operation: string,
  engine: EngineSession["engine"],
  runtimeMode: EngineSession["runtimeMode"],
) {
  return engineExecutionStructure(engine).supportedRuntimeModes.has(runtimeMode)
    ? Effect.void
    : Effect.fail(
        new EngineValidationError({
          operation,
          issue: "The selected runtime mode is not supported by this Engine.",
        }),
      );
}

function validateInteractionModeStructure(
  operation: string,
  engine: EngineSession["engine"],
  interactionMode: EngineSendTurnInput["interactionMode"],
) {
  const mode = interactionMode ?? "default";
  return engineExecutionStructure(engine).supportedInteractionModes.has(mode)
    ? Effect.void
    : Effect.fail(
        new EngineValidationError({
          operation,
          issue: `Interaction mode '${mode}' is not supported by Engine '${engine}'.`,
        }),
      );
}

export function summarizeProviderRuntimeQuarantineCause(cause: string): {
  readonly cause: string;
  readonly causeTruncated?: true;
  readonly causeOriginalBytes?: number;
  readonly causeSha256?: string;
} {
  const encoded = Buffer.from(cause, "utf8");
  if (encoded.byteLength <= ENGINE_RUNTIME_QUARANTINE_CAUSE_MAX_BYTES) {
    return { cause };
  }
  let prefixEnd = ENGINE_RUNTIME_QUARANTINE_CAUSE_MAX_BYTES;
  while (prefixEnd > 0 && ((encoded[prefixEnd] ?? 0) & 0xc0) === 0x80) {
    prefixEnd -= 1;
  }
  return {
    cause: encoded.subarray(0, prefixEnd).toString("utf8"),
    causeTruncated: true,
    causeOriginalBytes: encoded.byteLength,
    causeSha256: createHash("sha256").update(encoded).digest("hex"),
  };
}

const EngineRollbackConversationInput = Schema.Struct({
  threadId: ThreadId,
  numTurns: NonNegativeInt,
});

const ClearSessionResumeCursorInput = Schema.Struct({
  threadId: ThreadId,
  preserveActiveRuntime: Schema.optional(Schema.Boolean),
});

type StopRuntimeSession = NonNullable<EngineServiceShape["stopRuntimeSession"]>;
type StopRuntimeSessionInput = Parameters<StopRuntimeSession>[0];
type StopRuntimeSessionEffect = ReturnType<StopRuntimeSession>;
type EngineInterruptionFence = {
  readonly settled: Promise<void>;
  readonly resolve: () => void;
  failure: string | null;
};
type TargetedChildInterruptTombstone = {
  readonly lifecycleGeneration: string | undefined;
  readonly state: "uncertain" | "confirmed";
};
type InteractionResponse =
  | { readonly kind: "approval"; readonly input: EngineRespondToRequestInput }
  | {
      readonly kind: "userInput";
      readonly input: EngineRespondToUserInputInput;
    };

/**
 * Hard deadlines for engine lifecycle calls. Every caller of these paths
 * holds a serialized resource (the per-thread lifecycle lock, an orchestration
 * command slot, or the engine command reactor's delivery lock), so an
 * unbounded adapter call is a process-wide stall, not a local one.
 */
const ENGINE_START_SESSION_TIMEOUT = Duration.seconds(60);
const ENGINE_STOP_SESSION_TIMEOUT = Duration.seconds(10);
const ENGINE_REPLACEMENT_RESTORE_FAILED_EVENT = "engine.replacement.restore.failed";
const ENGINE_REPLACEMENT_TARGET_PROVIDER_KEY = "replacementTargetEngine";

function toValidationError(
  operation: string,
  issue: string,
  cause?: unknown,
): EngineValidationError {
  return new EngineValidationError({
    operation,
    issue,
    ...(cause !== undefined ? { cause } : {}),
  });
}

const decodeInputOrValidationError = <S extends Schema.Top>(input: {
  readonly operation: string;
  readonly schema: S;
  readonly payload: unknown;
}) =>
  Schema.decodeUnknownEffect(input.schema)(input.payload).pipe(
    Effect.mapError(
      (schemaError) =>
        new EngineValidationError({
          operation: input.operation,
          issue: SchemaIssue.makeFormatterDefault()(schemaError.issue),
          cause: schemaError,
        }),
    ),
  );

function toRuntimeStatus(session: EngineSession): "starting" | "running" | "stopped" | "error" {
  if (session.status === "connecting") return "starting";
  if (session.status === "closed") return "stopped";
  return session.status === "error" ? "error" : "running";
}

function toRuntimePayloadFromSession(
  session: EngineSession,
  extra?: {
    readonly engineSelection?: unknown;
    readonly engineOptions?: unknown;
    readonly workSurface?: unknown;
    readonly projectContextRoot?: unknown;
    readonly lastRuntimeEvent?: string;
    readonly lastRuntimeEventAt?: string;
    readonly lifecycleGeneration?: string;
  },
): Record<string, unknown> {
  return {
    cwd: session.cwd ?? null,
    model: session.model ?? null,
    activeTurnId: nonEmptyTrimmed(session.activeTurnId) ?? null,
    // `thread.session.set` types both as trimmed-non-empty-or-null, so a blank
    // engine string has to become an explicit "absent" rather than reaching
    // the schema as "".
    lastError: nonEmptyTrimmed(session.lastError) ?? null,
    ...(extra?.engineSelection !== undefined ? { engineSelection: extra.engineSelection } : {}),
    ...(extra?.engineOptions !== undefined ? { engineOptions: extra.engineOptions } : {}),
    ...(extra?.workSurface !== undefined ? { workSurface: extra.workSurface } : {}),
    ...(extra?.projectContextRoot !== undefined
      ? { projectContextRoot: extra.projectContextRoot }
      : {}),
    ...(extra?.lastRuntimeEvent !== undefined ? { lastRuntimeEvent: extra.lastRuntimeEvent } : {}),
    ...(extra?.lastRuntimeEventAt !== undefined
      ? { lastRuntimeEventAt: extra.lastRuntimeEventAt }
      : {}),
    ...(extra?.lifecycleGeneration !== undefined
      ? { lifecycleGeneration: extra.lifecycleGeneration }
      : {}),
  };
}

function readPersistedEngineSelection(
  runtimePayload: EngineRuntimeBinding["runtimePayload"],
): EngineSelection | undefined {
  const raw = runtimePayloadRecord(runtimePayload).engineSelection;
  return Schema.is(EngineSelection)(raw) ? raw : undefined;
}

function modelServiceIdFromSelection(selection: EngineSelection | undefined): string | undefined {
  if (selection?.engine !== "oa") return undefined;
  const separatorIndex = selection.model.indexOf("/");
  return separatorIndex > 0 ? selection.model.slice(0, separatorIndex) : undefined;
}

function unboundModelServiceAdmissionKey(threadId: ThreadId): string {
  return `\u0000${threadId}`;
}

function readPersistedEngineOptions(
  runtimePayload: EngineRuntimeBinding["runtimePayload"],
): EngineStartOptions | undefined {
  const raw = runtimePayloadRecord(runtimePayload).engineOptions;
  return Option.getOrUndefined(Schema.decodeUnknownOption(EngineStartOptions)(raw));
}

function readPersistedCwd(
  runtimePayload: EngineRuntimeBinding["runtimePayload"],
): string | undefined {
  const rawCwd = runtimePayloadRecord(runtimePayload).cwd;
  if (typeof rawCwd !== "string") return undefined;
  const trimmed = rawCwd.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readPersistedWorkSurface(
  runtimePayload: EngineRuntimeBinding["runtimePayload"],
): EngineWorkSurface | undefined {
  const raw = runtimePayloadRecord(runtimePayload).workSurface;
  return Schema.is(EngineWorkSurface)(raw) ? raw : undefined;
}

function readPersistedProjectContextRoot(
  runtimePayload: EngineRuntimeBinding["runtimePayload"],
): string | undefined {
  const rawRoot = runtimePayloadRecord(runtimePayload).projectContextRoot;
  if (typeof rawRoot !== "string") return undefined;
  const trimmed = rawRoot.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function runtimePayloadRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function runtimeEventRetiredGatewayTurnAuthority(event: EngineRuntimeEvent): boolean {
  return runtimePayloadRecord(event.raw?.payload)[HOST_GATEWAY_TURN_AUTHORITY_RETIRED] === true;
}

function runtimeActiveTurnId(value: unknown): string | undefined {
  const activeTurnId = runtimePayloadRecord(value).activeTurnId;
  return typeof activeTurnId === "string" ? activeTurnId : undefined;
}

function hasResumeCursor(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function isTerminalRuntimeEvent(event: EngineRuntimeEvent): boolean {
  return (
    event.type === "turn.completed" ||
    event.type === "turn.aborted" ||
    event.type === "session.exited" ||
    event.type === "runtime.error"
  );
}

function updatesSessionBindingFromRuntimeEvent(event: EngineRuntimeEvent): boolean {
  switch (event.type) {
    case "session.started":
    case "session.state.changed":
    case "thread.started":
    case "thread.state.changed":
    case "turn.started":
    case "turn.tasks.updated":
    case "model.rerouted":
    case "turn.completed":
    case "turn.aborted":
    case "session.exited":
    case "runtime.error":
      return true;
    default:
      return false;
  }
}

interface AcceptedRuntimeEvent {
  readonly accepted: true;
  readonly binding: EngineRuntimeBinding | undefined;
  readonly updatesThreadBinding: boolean;
  readonly resolvedTerminalTurnId?: string;
}
interface RejectedRuntimeEvent {
  readonly accepted: false;
  readonly reason:
    | "ownership-mismatch"
    | "current-terminal-conflict"
    | "ambiguous-current-terminal";
  readonly rejectedTurnId?: string;
}
type RuntimeEventDecision = AcceptedRuntimeEvent | RejectedRuntimeEvent;

function rejectRuntimeEvent(
  reason: RejectedRuntimeEvent["reason"] = "ownership-mismatch",
  rejectedTurnId?: string,
): RejectedRuntimeEvent {
  return {
    accepted: false,
    reason,
    ...(rejectedTurnId === undefined ? {} : { rejectedTurnId }),
  };
}

function runtimeStatusForEvent(
  event: EngineRuntimeEvent,
  activeTurnId?: unknown,
): "running" | "stopped" | "error" {
  switch (event.type) {
    case "session.state.changed":
      if (event.payload.state === "stopped") return "stopped";
      return event.payload.state === "error" ? "error" : "running";
    case "thread.state.changed":
      if (event.payload.state === "error") return "error";
      if (event.payload.state === "archived" || event.payload.state === "closed") return "stopped";
      return event.payload.state === "compacted" &&
        event.turnId === undefined &&
        activeTurnId == null
        ? "stopped"
        : "running";
    case "session.exited":
    case "turn.completed":
    case "turn.aborted":
      // A completed turn can still carry a resume cursor, but it must not keep
      // the desktop app treating the engine process as active after restart.
      return "stopped";
    case "runtime.error":
      return "error";
    default:
      return "running";
  }
}

function shouldRefreshResumeCursorForEvent(event: EngineRuntimeEvent): boolean {
  return (
    event.type === "thread.started" ||
    event.type === "model.rerouted" ||
    (event.type === "thread.state.changed" &&
      event.payload.state === "compacted" &&
      event.turnId === undefined) ||
    event.type === "turn.tasks.updated" ||
    event.type === "turn.completed" ||
    event.type === "turn.aborted"
  );
}

function runtimeLastErrorForEvent(event: EngineRuntimeEvent): string | null | undefined {
  // A blank message must not degrade to `null`: null means "clear the error",
  // which would erase the very failure being reported. Fall back to an honest
  // constant instead.
  if (event.type === "runtime.error")
    return nonEmptyTrimmed(event.payload.message) ?? "Engine runtime reported an error.";
  if (event.type === "session.state.changed")
    return event.payload.state === "error"
      ? (nonEmptyTrimmed(event.payload.reason) ?? "Session error")
      : null;
  if (event.type === "thread.state.changed")
    return event.payload.state === "error" ? "Thread error" : null;
  return event.type === "turn.started" ||
    event.type === "turn.completed" ||
    event.type === "turn.aborted" ||
    event.type === "session.exited"
    ? null
    : undefined;
}

const makeEngineService = (options?: EngineServiceLiveOptions) =>
  Effect.gen(function* () {
    const canonicalEventLogger =
      options?.canonicalEventLogger ??
      (options?.canonicalEventLogPath !== undefined
        ? yield* makeEventNdjsonLogger(options.canonicalEventLogPath, {
            stream: "canonical",
          })
        : undefined);

    const registry = yield* EngineAdapterRegistry;
    const directory = yield* EngineSessionDirectory;
    const lifecycle = makeEngineLifecycleCoordinator();
    const modelServiceAdmissionLock = makeKeyedLock<string>();
    const withModelServiceAdmissionLocks = <A, E, R>(
      keys: ReadonlyArray<string | undefined>,
      effect: Effect.Effect<A, E, R>,
    ): Effect.Effect<A, E, R> =>
      [...new Set(keys.filter((key): key is string => key !== undefined))]
        .toSorted()
        .reduceRight((current, key) => modelServiceAdmissionLock.withLock(key, current), effect);
    for (const binding of yield* directory.listBindings()) {
      if (
        binding.lifecycleGeneration !== undefined &&
        runtimePayloadRecord(binding.runtimePayload).lastRuntimeEvent !==
          ENGINE_REPLACEMENT_RESTORE_FAILED_EVENT
      ) {
        lifecycle.adoptCurrent(binding.threadId, binding.lifecycleGeneration);
      }
    }
    const runtimeEventBufferCapacity = Math.max(
      1,
      Math.floor(options?.runtimeEventBufferCapacity ?? ENGINE_RUNTIME_EVENT_BUFFER_CAPACITY),
    );
    type PublishedRuntimeEvent = {
      readonly event: EngineRuntimeEvent;
      readonly persisted?: PersistedEngineRuntimeEvent;
    };
    const runtimeEventPubSub = yield* PubSub.bounded<PublishedRuntimeEvent>(
      runtimeEventBufferCapacity,
    );
    const runtimeEventProducerScope = yield* Scope.make("sequential");
    const runtimeIdleTimers = new Map<ThreadId, ReturnType<typeof setTimeout>>();
    const liveRuntimeTaskIds = new Map<ThreadId, Set<string>>();
    const runtimeTaskSettlementWaiters = new Map<ThreadId, Set<() => void>>();
    // Fired idle callbacks outlive their timer map entry, so use generations to
    // invalidate async stop work when new user work starts in that gap.
    const runtimeIdleGenerations = new Map<ThreadId, symbol>();
    const runtimeIdleStopsInFlight = new Map<ThreadId, Promise<void>>();
    const engineInterruptionFences = new Map<ThreadId, EngineInterruptionFence>();
    const targetedChildInterruptTombstones = new Map<string, TargetedChildInterruptTombstone>();
    const runtimeIdleStopMs = Math.max(
      0,
      options?.runtimeIdleStopMs ?? ENGINE_RUNTIME_IDLE_STOP_MS,
    );
    let stopIdleRuntimeSession: ((threadId: ThreadId, generation: symbol) => void) | null = null;

    const invalidateRuntimeIdleGeneration = (threadId: ThreadId): symbol => {
      const generation = Symbol(String(threadId));
      runtimeIdleGenerations.set(threadId, generation);
      return generation;
    };

    const isRuntimeIdleGenerationCurrent = (threadId: ThreadId, generation: symbol): boolean =>
      runtimeIdleGenerations.get(threadId) === generation;

    const retireRuntimeIdleGeneration = (threadId: ThreadId, generation?: symbol): void => {
      if (generation === undefined || isRuntimeIdleGenerationCurrent(threadId, generation)) {
        runtimeIdleGenerations.delete(threadId);
      }
    };

    const clearRuntimeIdleTimer = (threadId: ThreadId) => {
      invalidateRuntimeIdleGeneration(threadId);
      const timer = runtimeIdleTimers.get(threadId);
      if (!timer) {
        return;
      }
      clearTimeout(timer);
      runtimeIdleTimers.delete(threadId);
    };

    const scheduleRuntimeIdleStop = (threadId: ThreadId) => {
      clearRuntimeIdleTimer(threadId);
      // A parent turn can finish while engine-native tasks keep running in
      // the same subprocess. Those tasks own the runtime until the last one
      // settles, even though the adapter session otherwise looks idle-ready.
      if ((liveRuntimeTaskIds.get(threadId)?.size ?? 0) > 0) {
        return;
      }
      if (runtimeIdleStopMs <= 0) {
        retireRuntimeIdleGeneration(threadId);
        return;
      }

      const generation = invalidateRuntimeIdleGeneration(threadId);
      const timer = setTimeout(() => {
        runtimeIdleTimers.delete(threadId);
        stopIdleRuntimeSession?.(threadId, generation);
      }, runtimeIdleStopMs);
      timer.unref();
      runtimeIdleTimers.set(threadId, timer);
    };

    const markRuntimeTaskLive = (threadId: ThreadId, taskId: string): void => {
      const taskIds = liveRuntimeTaskIds.get(threadId) ?? new Set<string>();
      taskIds.add(taskId);
      liveRuntimeTaskIds.set(threadId, taskIds);
      clearRuntimeIdleTimer(threadId);
    };

    const resolveRuntimeTaskSettlementWaiters = (threadId: ThreadId): void => {
      const waiters = runtimeTaskSettlementWaiters.get(threadId);
      runtimeTaskSettlementWaiters.delete(threadId);
      for (const resolve of waiters ?? []) resolve();
    };

    const clearLiveRuntimeTasks = (threadId: ThreadId): void => {
      liveRuntimeTaskIds.delete(threadId);
      resolveRuntimeTaskSettlementWaiters(threadId);
    };

    const waitForLiveRuntimeTasksToSettle = (threadId: ThreadId): Effect.Effect<void> =>
      Effect.suspend(() => {
        if ((liveRuntimeTaskIds.get(threadId)?.size ?? 0) === 0) return Effect.void;
        let resolveWaiter!: () => void;
        const settled = new Promise<void>((resolve) => {
          resolveWaiter = resolve;
        });
        const waiters = runtimeTaskSettlementWaiters.get(threadId) ?? new Set<() => void>();
        waiters.add(resolveWaiter);
        runtimeTaskSettlementWaiters.set(threadId, waiters);
        return Effect.promise(() => settled).pipe(
          Effect.ensuring(
            Effect.sync(() => {
              const current = runtimeTaskSettlementWaiters.get(threadId);
              current?.delete(resolveWaiter);
              if (current?.size === 0) runtimeTaskSettlementWaiters.delete(threadId);
            }),
          ),
          // A new task can become visible while the previous last task settles.
          // Recheck before allowing credential rotation to stop the runtime.
          Effect.andThen(waitForLiveRuntimeTasksToSettle(threadId)),
        );
      });

    const markRuntimeTaskSettled = (threadId: ThreadId, taskId: string): void => {
      const taskIds = liveRuntimeTaskIds.get(threadId);
      taskIds?.delete(taskId);
      if (taskIds && taskIds.size > 0) {
        return;
      }
      clearLiveRuntimeTasks(threadId);
      scheduleRuntimeIdleStop(threadId);
    };

    const waitForRuntimeIdleStop = (threadId: ThreadId): Effect.Effect<void> =>
      Effect.promise(() => runtimeIdleStopsInFlight.get(threadId) ?? Promise.resolve());

    const targetedChildInterruptKey = (
      threadId: ThreadId,
      turnId: TurnId,
      nativeThreadId: string,
    ): string => JSON.stringify([threadId, turnId, nativeThreadId]);

    const rememberTargetedChildInterrupt = (
      key: string,
      tombstone: TargetedChildInterruptTombstone,
    ): void => {
      const existing = targetedChildInterruptTombstones.get(key);
      if (existing?.state === "confirmed" && tombstone.state === "uncertain") return;
      targetedChildInterruptTombstones.delete(key);
      targetedChildInterruptTombstones.set(key, tombstone);
      while (targetedChildInterruptTombstones.size > MAX_TARGETED_CHILD_INTERRUPT_TOMBSTONES) {
        const oldest = targetedChildInterruptTombstones.keys().next().value;
        if (oldest === undefined) break;
        targetedChildInterruptTombstones.delete(oldest);
      }
    };

    const waitForCurrentInterruptionFence = (
      threadId: ThreadId,
    ): Effect.Effect<EngineInterruptionFence | undefined> =>
      Effect.suspend(() => {
        const fence = engineInterruptionFences.get(threadId);
        if (!fence) return Effect.succeed(undefined);
        return Effect.promise(() => fence.settled).pipe(
          Effect.flatMap(() =>
            engineInterruptionFences.get(threadId) === fence
              ? Effect.succeed(fence)
              : waitForCurrentInterruptionFence(threadId),
          ),
        );
      });

    const acquireEngineInterruptionFence = (
      threadId: ThreadId,
    ): Effect.Effect<EngineInterruptionFence, EngineValidationError> =>
      Effect.suspend(() => {
        const existing = engineInterruptionFences.get(threadId);
        if (!existing) {
          let resolveFence!: () => void;
          const fence: EngineInterruptionFence = {
            settled: new Promise<void>((resolve) => {
              resolveFence = resolve;
            }),
            resolve: () => resolveFence(),
            failure: null,
          };
          engineInterruptionFences.set(threadId, fence);
          return Effect.succeed(fence);
        }
        return Effect.promise(() => existing.settled).pipe(
          Effect.flatMap(() => {
            if (engineInterruptionFences.get(threadId) !== existing) {
              return acquireEngineInterruptionFence(threadId);
            }
            return Effect.fail(
              toValidationError(
                "EngineService.interruptTurn",
                existing.failure
                  ? `Cannot interrupt thread '${threadId}' because its previous runtime could not be retired safely: ${existing.failure}`
                  : `Cannot interrupt thread '${threadId}' because its previous interruption did not reconcile safely.`,
              ),
            );
          }),
        );
      });

    const runIdleSensitiveProviderWork = <A, E, R>(
      threadId: ThreadId,
      effect: Effect.Effect<A, E, R>,
      options?: { readonly scheduleIdleStopOnSuccess?: boolean },
    ): Effect.Effect<A, E | EngineValidationError, R> =>
      Effect.suspend(() => {
        const waitForInterruptionFence = waitForCurrentInterruptionFence(threadId).pipe(
          Effect.flatMap((interruptionFence) =>
            interruptionFence?.failure
              ? Effect.fail(
                  toValidationError(
                    "EngineService.turnDispatch",
                    `Cannot start a new engine turn because the interrupted runtime could not be retired safely: ${interruptionFence.failure}`,
                  ),
                )
              : Effect.void,
          ),
        );
        const existingIdleStop = runtimeIdleStopsInFlight.get(threadId);
        const displacedIdleStop = existingIdleStop !== undefined || runtimeIdleTimers.has(threadId);
        const waitForExistingIdleStop =
          existingIdleStop !== undefined ? Effect.promise(() => existingIdleStop) : Effect.void;
        return waitForInterruptionFence.pipe(
          Effect.andThen(waitForExistingIdleStop),
          Effect.tap(() => Effect.sync(() => clearRuntimeIdleTimer(threadId))),
          Effect.flatMap(() => waitForRuntimeIdleStop(threadId)),
          Effect.flatMap(() => effect),
          Effect.onExit((exit) =>
            Exit.isSuccess(exit)
              ? options?.scheduleIdleStopOnSuccess === true
                ? Effect.sync(() => scheduleRuntimeIdleStop(threadId))
                : Effect.void
              : displacedIdleStop
                ? Effect.sync(() => scheduleRuntimeIdleStop(threadId))
                : Effect.sync(() => retireRuntimeIdleGeneration(threadId)),
          ),
        );
      });

    const reconcileRuntimeIdleTimer = (event: EngineRuntimeEvent) => {
      switch (event.type) {
        case "turn.started":
          clearRuntimeIdleTimer(event.threadId);
          return;
        case "task.started":
        case "task.progress":
          markRuntimeTaskLive(event.threadId, event.payload.taskId);
          return;
        case "task.updated":
          if (
            event.payload.status === "completed" ||
            event.payload.status === "failed" ||
            event.payload.status === "killed" ||
            event.payload.status === "paused"
          ) {
            markRuntimeTaskSettled(event.threadId, event.payload.taskId);
          } else {
            markRuntimeTaskLive(event.threadId, event.payload.taskId);
          }
          return;
        case "task.completed":
          markRuntimeTaskSettled(event.threadId, event.payload.taskId);
          return;
        case "session.started":
        case "thread.started":
        case "turn.completed":
        case "turn.aborted":
          scheduleRuntimeIdleStop(event.threadId);
          return;
        case "thread.state.changed":
          if (
            event.payload.state === "compacted" ||
            event.payload.state === "archived" ||
            event.payload.state === "closed"
          ) {
            if (event.payload.state === "archived" || event.payload.state === "closed") {
              clearLiveRuntimeTasks(event.threadId);
            }
            scheduleRuntimeIdleStop(event.threadId);
          }
          return;
        case "session.exited":
          clearLiveRuntimeTasks(event.threadId);
          clearRuntimeIdleTimer(event.threadId);
          retireRuntimeIdleGeneration(event.threadId);
          return;
      }
    };

    const persistCanonicalRuntimeEvent = (
      event: EngineRuntimeEvent,
    ): Effect.Effect<PersistedEngineRuntimeEvent | undefined, unknown> => {
      const persistence: Effect.Effect<PersistedEngineRuntimeEvent | undefined, unknown> =
        options?.persistRuntimeEvent
          ? options.persistRuntimeEvent(event)
          : Effect.succeed(undefined);

      return Effect.uninterruptible(
        persistence.pipe(
          Effect.tap(() =>
            canonicalEventLogger ? canonicalEventLogger.write(event, null) : Effect.void,
          ),
        ),
      );
    };

    const publishRuntimeEvent = (
      event: EngineRuntimeEvent,
      persisted: PersistedEngineRuntimeEvent | undefined,
    ): Effect.Effect<void> =>
      PubSub.publish(runtimeEventPubSub, {
        event,
        ...(persisted === undefined ? {} : { persisted }),
      }).pipe(Effect.asVoid);

    const upsertSessionBinding = (
      session: EngineSession,
      threadId: ThreadId,
      extra?: {
        readonly lifecycleGeneration?: string;
        readonly engineSelection?: unknown;
        readonly engineOptions?: unknown;
        readonly workSurface?: unknown;
        readonly projectContextRoot?: unknown;
        readonly lastRuntimeEvent?: string;
        readonly lastRuntimeEventAt?: string;
      },
    ) =>
      directory.upsert({
        threadId,
        engine: session.engine,
        runtimeMode: session.runtimeMode,
        status: toRuntimeStatus(session),
        ...(extra?.lifecycleGeneration !== undefined
          ? { lifecycleGeneration: extra.lifecycleGeneration }
          : {}),
        ...(session.resumeCursor !== undefined ? { resumeCursor: session.resumeCursor } : {}),
        runtimePayload: toRuntimePayloadFromSession(session, extra),
      });

    const markThreadStopped = (
      threadId: ThreadId,
      stoppedAt: string,
      session?: EngineSession,
    ): Effect.Effect<void, EngineSessionDirectoryWriteError> =>
      session
        ? directory.upsert({
            threadId,
            engine: session.engine,
            runtimeMode: session.runtimeMode,
            status: "stopped",
            ...(session.resumeCursor !== undefined ? { resumeCursor: session.resumeCursor } : {}),
            runtimePayload: {
              ...toRuntimePayloadFromSession(session, {
                lastRuntimeEvent: "engine.stopAll",
                lastRuntimeEventAt: stoppedAt,
              }),
              activeTurnId: null,
            },
          })
        : directory.getEngine(threadId).pipe(
            Effect.flatMap((engine) =>
              directory.upsert({
                threadId,
                engine,
                status: "stopped",
                runtimePayload: {
                  activeTurnId: null,
                  lastRuntimeEvent: "engine.stopAll",
                  lastRuntimeEventAt: stoppedAt,
                },
              }),
            ),
          );

    // Runtime events are where adapters surface engine-native ids; refresh
    // from the live session before idle stop/recovery freezes an old cursor.
    const refreshResumeCursorFromActiveSession = (
      event: EngineRuntimeEvent,
      binding: EngineRuntimeBinding,
    ): Effect.Effect<unknown | null | undefined> => {
      if (!shouldRefreshResumeCursorForEvent(event)) {
        return Effect.succeed(binding.resumeCursor);
      }

      return Effect.gen(function* () {
        const adapter = yield* registry.getByEngine(binding.engine);
        const sessions = yield* adapter.listSessions();
        const activeSession = sessions.find((session) => session.threadId === event.threadId);
        return activeSession?.resumeCursor ?? binding.resumeCursor;
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("engine.session.resume_cursor_refresh_failed", {
            threadId: event.threadId,
            engine: binding.engine,
            eventType: event.type,
            cause: Cause.pretty(cause),
          }).pipe(Effect.as(binding.resumeCursor)),
        ),
      );
    };

    // Turn ids whose terminal runtime event has already been observed, keyed by
    // thread. sendTurn consults this immediately before its post-dispatch
    // "running" upsert: a turn that settles before that write lands (e.g. a
    // pre-start cancellation) must not be re-marked as running afterwards.
    // A single slot per thread is not enough — sendTurn is not serialized per
    // thread, so overlapping sends can both settle pre-write and the second
    // completion would evict the first turn's marker before its send checked
    // it. Markers are retained only while dispatches are in flight, and each
    // sendTurn consumes its own marker.
    const recentlyCompletedTurnsByThread = new Map<ThreadId, Set<string>>();
    const recordRecentlyCompletedTurn = (threadId: ThreadId, turnId: string): void => {
      let turns = recentlyCompletedTurnsByThread.get(threadId);
      if (turns === undefined) {
        turns = new Set();
        recentlyCompletedTurnsByThread.set(threadId, turns);
      }
      turns.delete(turnId);
      turns.add(turnId);
    };
    const consumeRecentlyCompletedTurn = (threadId: ThreadId, turnId: string): boolean => {
      const turns = recentlyCompletedTurnsByThread.get(threadId);
      if (turns === undefined || !turns.has(turnId)) {
        return false;
      }
      turns.delete(turnId);
      if (turns.size === 0) {
        recentlyCompletedTurnsByThread.delete(threadId);
      }
      return true;
    };

    // Serializes binding writes for a thread between the runtime-event handler
    // and sendTurn's post-dispatch write. Without it a terminal event could
    // land between sendTurn's settled-turn check and its "running" upsert and
    // still be overwritten. Lifecycle events are low-frequency, so a per-thread
    // mutex adds no meaningful contention. Creation is synchronous
    // (Semaphore.makeUnsafe), so concurrent callers cannot mint two locks.
    const withBindingWriteLock = makeKeyedLock<ThreadId>().withLock;

    interface StartedTurnPersistenceInput {
      readonly threadId: ThreadId;
      readonly engine: EngineRuntimeBinding["engine"];
      readonly turnId: string;
      readonly generation: number;
      readonly resumeCursor?: unknown;
      readonly engineSelection?: EngineSelection;
      readonly lastRuntimeEvent: string;
    }
    interface ThreadDispatchState {
      nextGeneration: number;
      latestGeneration: number;
      ownerGeneration: number;
      readonly inFlightGenerations: Set<number>;
      readonly outstandingTurnIds: Set<string>;
      readonly successfulResults: Map<number, StartedTurnPersistenceInput>;
    }
    const dispatchStateByThread = new Map<ThreadId, ThreadDispatchState>();
    const getDispatchState = (threadId: ThreadId): ThreadDispatchState => {
      let state = dispatchStateByThread.get(threadId);
      if (!state) {
        state = {
          nextGeneration: 0,
          latestGeneration: 0,
          ownerGeneration: 0,
          inFlightGenerations: new Set(),
          outstandingTurnIds: new Set(),
          successfulResults: new Map(),
        };
        dispatchStateByThread.set(threadId, state);
      }
      return state;
    };
    const beginTurnDispatch = (threadId: ThreadId): number => {
      const state = getDispatchState(threadId);
      const generation = state.nextGeneration + 1;
      state.nextGeneration = generation;
      state.latestGeneration = generation;
      state.inFlightGenerations.add(generation);
      return generation;
    };
    const cleanupDispatchState = (threadId: ThreadId): void => {
      const state = dispatchStateByThread.get(threadId);
      if (
        state &&
        state.inFlightGenerations.size === 0 &&
        state.outstandingTurnIds.size === 0 &&
        state.successfulResults.size === 0
      ) {
        dispatchStateByThread.delete(threadId);
      }
    };
    const rememberSuccessfulTurnDispatch = (input: StartedTurnPersistenceInput): void => {
      const state = getDispatchState(input.threadId);
      state.outstandingTurnIds.add(input.turnId);
      state.successfulResults.set(input.generation, input);
    };
    const hasAmbiguousTerminalTurn = (threadId: ThreadId): boolean => {
      const state = dispatchStateByThread.get(threadId);
      return (
        state !== undefined &&
        (state.outstandingTurnIds.size > 1 ||
          state.inFlightGenerations.size > 1 ||
          (state.outstandingTurnIds.size > 0 && state.inFlightGenerations.size > 0))
      );
    };

    const persistStartedTurn = (input: StartedTurnPersistenceInput) => {
      let persistenceAttempted = false;
      const rollbackFailedPersistence = Effect.sync(() => {
        if (!persistenceAttempted) return;
        const state = dispatchStateByThread.get(input.threadId);
        state?.successfulResults.delete(input.generation);
        state?.outstandingTurnIds.delete(input.turnId);
        cleanupDispatchState(input.threadId);
      });
      const markPersistenceSucceeded = (ownsLifecycle: boolean): void => {
        const state = getDispatchState(input.threadId);
        if (ownsLifecycle) state.ownerGeneration = input.generation;
        for (const generation of state.successfulResults.keys()) {
          if (generation <= input.generation) state.successfulResults.delete(generation);
        }
      };

      const persist = withBindingWriteLock(
        input.threadId,
        Effect.gen(function* () {
          // Older successful results stay retained while newer invocations are
          // unresolved. If every newer generation fails, settlement promotes
          // the newest retained result through this same persistence path.
          if (getDispatchState(input.threadId).latestGeneration !== input.generation) {
            return;
          }
          const completedBeforePersistence = consumeRecentlyCompletedTurn(
            input.threadId,
            input.turnId,
          );
          if (completedBeforePersistence) {
            getDispatchState(input.threadId).outstandingTurnIds.delete(input.turnId);
          }
          persistenceAttempted = true;
          if (completedBeforePersistence) {
            // An existing row may already belong to a newer overlapping turn;
            // the delayed result must not overwrite any of its metadata. With
            // no row, preserve the live-fallback behavior by creating an
            // explicitly stopped binding from the settled dispatch result.
            if (Option.isSome(yield* directory.getBinding(input.threadId))) {
              markPersistenceSucceeded(false);
              return;
            }
            yield* directory.upsert({
              threadId: input.threadId,
              engine: input.engine,
              status: "stopped",
              ...(input.resumeCursor !== undefined ? { resumeCursor: input.resumeCursor } : {}),
              ...(input.engineSelection !== undefined
                ? { runtimePayload: { engineSelection: input.engineSelection } }
                : {}),
            });
            markPersistenceSucceeded(false);
            return;
          }

          // Clear again under the binding lock. This orders active-turn writes
          // against terminal-event scheduling even if dispatch took long
          // enough for an older terminal event to arrive in the meantime.
          clearRuntimeIdleTimer(input.threadId);
          yield* directory.upsert({
            threadId: input.threadId,
            engine: input.engine,
            status: "running",
            ...(input.resumeCursor !== undefined ? { resumeCursor: input.resumeCursor } : {}),
            runtimePayload: {
              ...(input.engineSelection !== undefined
                ? { engineSelection: input.engineSelection }
                : {}),
              activeTurnId: input.turnId,
              lastRuntimeEvent: input.lastRuntimeEvent,
              lastRuntimeEventAt: new Date().toISOString(),
            },
          });
          markPersistenceSucceeded(true);
        }),
      ).pipe(Effect.onError(() => rollbackFailedPersistence));
      if (input.engineSelection === undefined) return persist;

      return Effect.gen(function* () {
        while (true) {
          const admissionBinding = Option.getOrUndefined(
            yield* directory.getBinding(input.threadId),
          );
          const previousServiceId = modelServiceIdFromSelection(
            admissionBinding === undefined
              ? undefined
              : readPersistedEngineSelection(admissionBinding.runtimePayload),
          );
          const nextServiceId = modelServiceIdFromSelection(input.engineSelection);
          const outcome = yield* withModelServiceAdmissionLocks(
            [previousServiceId ?? unboundModelServiceAdmissionKey(input.threadId), nextServiceId],
            Effect.gen(function* () {
              const currentBinding = Option.getOrUndefined(
                yield* directory.getBinding(input.threadId),
              );
              const currentServiceId = modelServiceIdFromSelection(
                currentBinding === undefined
                  ? undefined
                  : readPersistedEngineSelection(currentBinding.runtimePayload),
              );
              if (currentServiceId !== previousServiceId) {
                return { retry: true } as const;
              }
              yield* persist;
              return { retry: false } as const;
            }),
          );
          if (!outcome.retry) return;
        }
      });
    };

    const finishTurnDispatch = (
      threadId: ThreadId,
      generation: number,
    ): Effect.Effect<void, EngineSessionDirectoryWriteError> =>
      Effect.gen(function* () {
        const candidate = yield* Effect.sync(() => {
          const state = getDispatchState(threadId);
          state.inFlightGenerations.delete(generation);
          if (state.latestGeneration === generation && !state.successfulResults.has(generation)) {
            state.latestGeneration = Math.max(
              state.ownerGeneration,
              ...state.inFlightGenerations,
              ...state.successfulResults.keys(),
            );
          }
          return state.successfulResults.get(state.latestGeneration);
        });
        if (candidate !== undefined) {
          yield* persistStartedTurn(candidate);
        }
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            const state = dispatchStateByThread.get(threadId);
            if (state?.inFlightGenerations.size === 0) {
              recentlyCompletedTurnsByThread.delete(threadId);
            }
            cleanupDispatchState(threadId);
          }),
        ),
      );

    const runTurnDispatch = <A, E, R>(
      threadId: ThreadId,
      dispatch: (generation: number) => Effect.Effect<A, E, R>,
    ) =>
      runIdleSensitiveProviderWork(
        threadId,
        Effect.suspend(() => {
          const generation = beginTurnDispatch(threadId);
          return dispatch(generation).pipe(
            Effect.ensuring(finishTurnDispatch(threadId, generation).pipe(Effect.ignore)),
          );
        }),
      );

    const recordRuntimeEventDispatchState = (event: EngineRuntimeEvent): void => {
      if (event.type === "turn.started" && event.turnId !== undefined) {
        getDispatchState(event.threadId).outstandingTurnIds.add(String(event.turnId));
      }
      if (
        (event.type === "turn.completed" || event.type === "turn.aborted") &&
        event.turnId !== undefined &&
        (dispatchStateByThread.get(event.threadId)?.inFlightGenerations.size ?? 0) > 0
      ) {
        recordRecentlyCompletedTurn(event.threadId, String(event.turnId));
      }
    };

    const acceptRuntimeEvent = (
      event: EngineRuntimeEvent,
      currentGeneration: string | undefined,
      binding: EngineRuntimeBinding | undefined,
    ): RuntimeEventDecision => {
      const isStaleGeneration =
        event.lifecycleGeneration !== undefined && event.lifecycleGeneration !== currentGeneration;

      if (binding === undefined) {
        return isStaleGeneration
          ? rejectRuntimeEvent()
          : { accepted: true, binding: undefined, updatesThreadBinding: false };
      }
      if (binding.engine !== event.engine || isReplacementRestoreFailedBinding(binding)) {
        return rejectRuntimeEvent();
      }
      if (
        event.lifecycleGeneration !== undefined &&
        binding.lifecycleGeneration !== event.lifecycleGeneration
      ) {
        return rejectRuntimeEvent();
      }

      // Child events use the parent thread id only as their transport route.
      // A stale child cannot prove durable child ownership from the parent row.
      if (event.engineRefs?.nativeParentThreadId !== undefined) {
        return isStaleGeneration
          ? rejectRuntimeEvent()
          : { accepted: true, binding, updatesThreadBinding: false };
      }

      const activeTurnId = runtimeActiveTurnId(binding.runtimePayload);
      if (isStaleGeneration) {
        // The binding row is the durable physical-owner authority. A
        // lifecycle mutation may already have published its next generation
        // while it is still waiting to commit that owner row, so current
        // generation mismatch alone cannot discard the exact old owner's
        // terminal settlement. Nonterminal events never cross that boundary.
        if (!isTerminalRuntimeEvent(event)) {
          return rejectRuntimeEvent();
        }
        if (event.type === "turn.completed" || event.type === "turn.aborted") {
          const eventTurnId = event.turnId === undefined ? undefined : String(event.turnId);
          return eventTurnId !== undefined && eventTurnId === activeTurnId
            ? {
                accepted: true,
                binding,
                updatesThreadBinding: true,
                resolvedTerminalTurnId: eventTurnId,
              }
            : rejectRuntimeEvent();
        }
        if (event.turnId !== undefined && String(event.turnId) !== activeTurnId) {
          return rejectRuntimeEvent();
        }
        return { accepted: true, binding, updatesThreadBinding: true };
      }

      if (
        event.type === "turn.started" &&
        !isStartedTurnApplicable({
          activeTurnId,
          eventTurnId: event.turnId === undefined ? undefined : String(event.turnId),
        })
      ) {
        return rejectRuntimeEvent();
      }
      if (event.type === "turn.completed" || event.type === "turn.aborted") {
        const applicability = classifyTerminalTurnApplicability({
          activeTurnId,
          eventTurnId: event.turnId === undefined ? undefined : String(event.turnId),
          hasAmbiguousTurns: hasAmbiguousTerminalTurn(event.threadId),
        });
        if (!applicability.applicable) {
          return rejectRuntimeEvent(
            applicability.reason === "ambiguous-missing-turn-id"
              ? "ambiguous-current-terminal"
              : "current-terminal-conflict",
            applicability.resolvedTurnId,
          );
        }
        return {
          accepted: true,
          binding,
          updatesThreadBinding: true,
          ...(applicability.resolvedTurnId === undefined
            ? {}
            : { resolvedTerminalTurnId: applicability.resolvedTurnId }),
        };
      }
      return { accepted: true, binding, updatesThreadBinding: true };
    };

    const updateSessionBindingFromRuntimeEvent = (
      event: EngineRuntimeEvent,
      accepted: AcceptedRuntimeEvent,
    ): Effect.Effect<void, unknown> => {
      if (!accepted.updatesThreadBinding) {
        if (accepted.binding === undefined) {
          recordRuntimeEventDispatchState(event);
          reconcileRuntimeIdleTimer(event);
        }
        return Effect.void;
      }

      const binding = accepted.binding;
      if (binding === undefined) {
        return Effect.void;
      }
      return Effect.gen(function* () {
        recordRuntimeEventDispatchState(event);

        const currentActiveTurnId = runtimeActiveTurnId(binding.runtimePayload);
        if (event.type === "turn.completed" || event.type === "turn.aborted") {
          if (event.turnId === undefined && accepted.resolvedTerminalTurnId !== undefined) {
            recordRecentlyCompletedTurn(event.threadId, accepted.resolvedTerminalTurnId);
          }
          if (accepted.resolvedTerminalTurnId !== undefined) {
            dispatchStateByThread
              .get(event.threadId)
              ?.outstandingTurnIds.delete(accepted.resolvedTerminalTurnId);
            cleanupDispatchState(event.threadId);
          }
        }
        const activeTurnId =
          event.type === "turn.started"
            ? (event.turnId ?? null)
            : event.type === "thread.state.changed" && event.payload.state === "compacted"
              ? (event.turnId ?? currentActiveTurnId)
              : event.type === "turn.completed" ||
                  event.type === "turn.aborted" ||
                  (event.type === "thread.state.changed" &&
                    (event.payload.state === "archived" ||
                      event.payload.state === "closed" ||
                      event.payload.state === "error")) ||
                  event.type === "session.exited" ||
                  event.type === "runtime.error" ||
                  (event.type === "session.state.changed" &&
                    (event.payload.state === "ready" ||
                      event.payload.state === "stopped" ||
                      event.payload.state === "error"))
                ? null
                : currentActiveTurnId;
        const lastError = runtimeLastErrorForEvent(event);
        const resumeCursor = yield* refreshResumeCursorFromActiveSession(event, binding);

        yield* directory.upsert({
          threadId: event.threadId,
          engine: binding.engine,
          ...(binding.adapterKey !== undefined ? { adapterKey: binding.adapterKey } : {}),
          ...(binding.runtimeMode !== undefined ? { runtimeMode: binding.runtimeMode } : {}),
          status: runtimeStatusForEvent(event, activeTurnId),
          ...(resumeCursor !== undefined ? { resumeCursor } : {}),
          runtimePayload: {
            activeTurnId,
            lastRuntimeEvent: event.type,
            lastRuntimeEventAt: event.createdAt,
            ...(lastError !== undefined ? { lastError } : {}),
            ...(runtimeEventRetiredGatewayTurnAuthority(event)
              ? { [HOST_GATEWAY_CREDENTIAL_ROTATION_REQUIRED]: true }
              : {}),
          },
        });
        if (event.type === "session.exited") {
          const dispatchState = dispatchStateByThread.get(event.threadId);
          if (dispatchState) {
            // Invalidate adapter calls that were already in flight when the
            // session exited, then retain only the generations needed for
            // their eventual settlement/cleanup.
            dispatchState.latestGeneration = dispatchState.nextGeneration + 1;
            dispatchState.nextGeneration = dispatchState.latestGeneration;
            dispatchState.outstandingTurnIds.clear();
            dispatchState.successfulResults.clear();
          }
          recentlyCompletedTurnsByThread.delete(event.threadId);
          cleanupDispatchState(event.threadId);
        }
        reconcileRuntimeIdleTimer(event);
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("engine.session.runtime_binding_update_failed", {
            threadId: event.threadId,
            eventType: event.type,
            cause: Cause.pretty(cause),
          }).pipe(Effect.andThen(Effect.failCause(cause))),
        ),
      );
    };

    const engines = yield* registry.listEngines();
    const adapters = yield* Effect.forEach(engines, (engine) => registry.getByEngine(engine));
    type RegisteredEngineAdapter = (typeof adapters)[number];

    const inspectUnboundProviderOwners = (threadId: ThreadId) =>
      Effect.gen(function* () {
        const probes = yield* Effect.forEach(
          adapters,
          (adapter) =>
            Effect.exit(
              adapter.hasSession(threadId).pipe(Effect.timeoutOption(ENGINE_STOP_SESSION_TIMEOUT)),
            ).pipe(Effect.map((exit) => ({ adapter, exit }))),
          { concurrency: "unbounded" },
        );
        const liveAdapters: RegisteredEngineAdapter[] = [];
        const suspiciousAdapters: RegisteredEngineAdapter[] = [];
        for (const probe of probes) {
          if (Exit.isFailure(probe.exit) || Option.isNone(probe.exit.value)) {
            suspiciousAdapters.push(probe.adapter);
          } else if (probe.exit.value.value) {
            liveAdapters.push(probe.adapter);
          }
        }
        return { liveAdapters, suspiciousAdapters } as const;
      });

    const stopAdapterWithinDeadline = (
      adapter: RegisteredEngineAdapter,
      threadId: ThreadId,
      label: string,
    ) =>
      Effect.gen(function* () {
        const stopped = yield* Effect.exit(
          adapter.stopSession(threadId).pipe(Effect.timeoutOption(ENGINE_STOP_SESSION_TIMEOUT)),
        );
        if (Exit.isFailure(stopped) || Option.isNone(stopped.value)) {
          yield* Effect.logWarning(label, {
            threadId,
            engine: adapter.engine,
            ...(Exit.isFailure(stopped) ? { cause: Cause.pretty(stopped.cause) } : {}),
          });
          return false;
        }
        return true;
      });

    const stopAdaptersWithinDeadline = (
      targetAdapters: ReadonlyArray<RegisteredEngineAdapter>,
      threadId: ThreadId,
      label: string,
    ) => {
      const uniqueAdapters = Array.from(
        new Map(targetAdapters.map((adapter) => [adapter.engine, adapter] as const)).values(),
      );
      return Effect.forEach(
        uniqueAdapters,
        (adapter) => stopAdapterWithinDeadline(adapter, threadId, label),
        { concurrency: "unbounded" },
      ).pipe(Effect.map((results) => results.every(Boolean)));
    };

    const replacementTargetEngine = (
      binding: EngineRuntimeBinding,
    ): EngineSession["engine"] | undefined => {
      const value = runtimePayloadRecord(binding.runtimePayload)[
        ENGINE_REPLACEMENT_TARGET_PROVIDER_KEY
      ];
      return typeof value === "string"
        ? adapters.find((adapter) => adapter.engine === value)?.engine
        : undefined;
    };

    const cleanupCandidatesForUncertainOwnership = Effect.fnUntraced(function* (
      threadId: ThreadId,
      requiredEngines: ReadonlyArray<EngineSession["engine"]>,
    ) {
      const inspected = yield* inspectUnboundProviderOwners(threadId);
      const requiredAdapters = requiredEngines.flatMap((engine) => {
        const adapter = adapters.find((candidate) => candidate.engine === engine);
        return adapter === undefined ? [] : [adapter];
      });
      return [...inspected.liveAdapters, ...inspected.suspiciousAdapters, ...requiredAdapters];
    });

    const isReplacementRestoreFailedBinding = (binding: EngineRuntimeBinding): boolean =>
      runtimePayloadRecord(binding.runtimePayload).lastRuntimeEvent ===
      ENGINE_REPLACEMENT_RESTORE_FAILED_EVENT;

    const persistUncertainEngineOwnership = (input: {
      readonly threadId: ThreadId;
      readonly nominalProvider: EngineSession["engine"];
      readonly lifecycleGeneration: string;
      readonly detail: string;
      readonly targetEngine?: EngineSession["engine"];
      readonly binding?: EngineRuntimeBinding;
      readonly runtimeMode?: EngineSession["runtimeMode"];
      readonly cwd?: string;
      readonly engineSelection?: EngineSelection;
      readonly engineOptions?: EngineStartOptions;
    }) => {
      const binding = input.binding;
      return withBindingWriteLock(
        input.threadId,
        directory.upsert({
          threadId: input.threadId,
          engine: binding?.engine ?? input.nominalProvider,
          ...(binding?.adapterKey !== undefined ? { adapterKey: binding.adapterKey } : {}),
          runtimeMode: binding?.runtimeMode ?? input.runtimeMode ?? "full-access",
          status: "error",
          lifecycleGeneration: input.lifecycleGeneration,
          ...(binding?.resumeCursor !== undefined ? { resumeCursor: binding.resumeCursor } : {}),
          runtimePayload: {
            ...runtimePayloadRecord(binding?.runtimePayload),
            ...(binding === undefined && input.cwd !== undefined ? { cwd: input.cwd } : {}),
            ...(binding === undefined && input.engineSelection !== undefined
              ? { engineSelection: input.engineSelection }
              : {}),
            ...(binding === undefined && input.engineOptions !== undefined
              ? { engineOptions: input.engineOptions }
              : {}),
            activeTurnId: null,
            lastError: input.detail,
            lastRuntimeEvent: ENGINE_REPLACEMENT_RESTORE_FAILED_EVENT,
            lastRuntimeEventAt: new Date().toISOString(),
            lifecycleGeneration: input.lifecycleGeneration,
            ...(input.targetEngine !== undefined
              ? {
                  [ENGINE_REPLACEMENT_TARGET_PROVIDER_KEY]: input.targetEngine,
                }
              : {}),
          },
        }),
      );
    };

    const restoreBindingSnapshot = (
      threadId: ThreadId,
      snapshot: EngineRuntimeBinding | undefined,
    ) =>
      withBindingWriteLock(
        threadId,
        directory
          .remove(threadId)
          .pipe(Effect.andThen(snapshot === undefined ? Effect.void : directory.upsert(snapshot))),
      );

    const runtimeEventPumpHealth = makeEngineRuntimeEventPumpHealthRegistry(engines);
    let scheduleRetiredGatewaySessionRecovery = (_event: EngineRuntimeEvent): Effect.Effect<void> =>
      Effect.void;
    const rejectRuntimeEventEffect = (
      event: EngineRuntimeEvent,
      decision: RejectedRuntimeEvent,
      currentGeneration: string | undefined,
      binding: EngineRuntimeBinding | undefined,
    ) =>
      Effect.gen(function* () {
        if (
          decision.reason === "current-terminal-conflict" ||
          decision.reason === "ambiguous-current-terminal"
        ) {
          recordRuntimeEventDispatchState(event);
          if (decision.rejectedTurnId !== undefined) {
            dispatchStateByThread
              .get(event.threadId)
              ?.outstandingTurnIds.delete(decision.rejectedTurnId);
            cleanupDispatchState(event.threadId);
          }
          if (decision.reason === "ambiguous-current-terminal") {
            yield* Effect.logWarning("engine.session.ambiguous_terminal_event_ignored", {
              threadId: event.threadId,
              eventType: event.type,
            });
          }
        }
        yield* Effect.logWarning("engine.session.runtime_event_ignored", {
          threadId: event.threadId,
          engine: event.engine,
          eventType: event.type,
          eventLifecycleGeneration: event.lifecycleGeneration,
          currentLifecycleGeneration: currentGeneration,
          bindingLifecycleGeneration: binding?.lifecycleGeneration,
        });
      });

    const persistBindingRuntimeEvent = (event: EngineRuntimeEvent) =>
      withBindingWriteLock(
        event.threadId,
        Effect.gen(function* () {
          const binding = Option.getOrUndefined(yield* directory.getBinding(event.threadId));
          // Snapshot the provisional lifecycle owner only after acquiring the
          // same lock that protects the durable binding. If a replacement has
          // already published a new generation while waiting to commit its
          // row, an old nonterminal event must observe that generation and
          // fail closed.
          const currentGeneration = lifecycle.currentGeneration(event.threadId);

          const decision = acceptRuntimeEvent(event, currentGeneration, binding);
          if (!decision.accepted) {
            yield* rejectRuntimeEventEffect(event, decision, currentGeneration, binding);
            return { accepted: false } as const;
          }

          // Journal and binding settlement share the same lifecycle decision
          // and binding lock. Update failure is retried before live fan-out.
          const persisted = yield* persistCanonicalRuntimeEvent(event);
          yield* updateSessionBindingFromRuntimeEvent(event, decision);
          return { accepted: true, persisted } as const;
        }),
      );

    const processRuntimeEvent = (event: EngineRuntimeEvent): Effect.Effect<void, unknown> =>
      Effect.uninterruptible(
        Effect.suspend(() => {
          if (!updatesSessionBindingFromRuntimeEvent(event)) {
            const currentGeneration = lifecycle.currentGeneration(event.threadId);
            if (
              event.lifecycleGeneration !== undefined &&
              event.lifecycleGeneration !== currentGeneration
            ) {
              return Effect.logWarning("engine.session.stale_generation_event_ignored", {
                threadId: event.threadId,
                engine: event.engine,
                eventType: event.type,
                eventLifecycleGeneration: event.lifecycleGeneration,
                currentLifecycleGeneration: currentGeneration,
              });
            }
            return persistCanonicalRuntimeEvent(event).pipe(
              Effect.tap(() => Effect.sync(() => reconcileRuntimeIdleTimer(event))),
              Effect.flatMap((persisted) => publishRuntimeEvent(event, persisted)),
            );
          }

          return persistBindingRuntimeEvent(event).pipe(
            Effect.flatMap((result) =>
              !result.accepted
                ? Effect.void
                : publishRuntimeEvent(event, result.persisted).pipe(
                    Effect.andThen(scheduleRetiredGatewaySessionRecovery(event)),
                  ),
            ),
          );
        }),
      );

    const recoverSessionForThread = (input: {
      readonly binding: EngineRuntimeBinding;
      readonly operation: string;
      readonly productSurface?: import("@harnessos/shared/productSurface").ProductSurface;
    }) =>
      Effect.gen(function* () {
        const threadId = input.binding.threadId;
        const getCurrentBinding = () =>
          directory.getBinding(threadId).pipe(
            Effect.flatMap(
              Option.match({
                onNone: () =>
                  Effect.fail(
                    toValidationError(
                      input.operation,
                      `Cannot recover thread '${threadId}' because its engine binding was removed.`,
                    ),
                  ),
                onSome: Effect.succeed,
              }),
            ),
          );

        // Keep the retiring runtime's generation current until all of its
        // background work has settled and the process is stopped. Otherwise
        // its terminal task event would be rejected as stale and this drain
        // could wait forever.
        yield* lifecycle.runCurrent(threadId, () =>
          Effect.gen(function* () {
            let binding = yield* getCurrentBinding();
            const requiresCredentialRotation =
              runtimePayloadRecord(binding.runtimePayload)[
                HOST_GATEWAY_CREDENTIAL_ROTATION_REQUIRED
              ] === true;
            if (!requiresCredentialRotation) {
              return;
            }

            let adapter = yield* registry.getByEngine(binding.engine);
            if (!(yield* adapter.hasSession(threadId))) {
              return;
            }

            yield* waitForLiveRuntimeTasksToSettle(threadId);

            // The drain may have waited for a while. Re-read all durable
            // routing state before stopping anything.
            binding = yield* getCurrentBinding();
            if (
              runtimePayloadRecord(binding.runtimePayload)[
                HOST_GATEWAY_CREDENTIAL_ROTATION_REQUIRED
              ] !== true
            ) {
              return;
            }
            adapter = yield* registry.getByEngine(binding.engine);
            if (!(yield* adapter.hasSession(threadId))) {
              return;
            }

            const activeSession = (yield* adapter.listSessions()).find(
              (session) => session.threadId === threadId,
            );
            if (activeSession?.resumeCursor !== undefined) {
              yield* withBindingWriteLock(
                threadId,
                directory.upsert({
                  threadId,
                  engine: binding.engine,
                  resumeCursor: activeSession.resumeCursor,
                }),
              );
            }
            yield* adapter.stopSession(threadId);
          }),
        );

        const recovery = lifecycle.run(threadId, (lease) =>
          Effect.gen(function* () {
            const binding = yield* getCurrentBinding();
            const adapter = yield* registry.getByEngine(binding.engine);
            const hasPersistedResumeCursor = hasResumeCursor(binding.resumeCursor);
            const requiresCredentialRotation =
              runtimePayloadRecord(binding.runtimePayload)[
                HOST_GATEWAY_CREDENTIAL_ROTATION_REQUIRED
              ] === true;
            const hasActiveSession = yield* adapter.hasSession(threadId);

            // A concurrent recovery may have won between the drain and restart
            // phases. Adopt its fresh runtime instead of replacing it again.
            if (hasActiveSession && !requiresCredentialRotation) {
              const existing = (yield* adapter.listSessions()).find(
                (session) => session.threadId === threadId,
              );
              if (existing) {
                lease.adopt(binding.lifecycleGeneration ?? "legacy");
                return adapter;
              }
            }

            if (hasActiveSession && requiresCredentialRotation) {
              return yield* toValidationError(
                input.operation,
                `Cannot recover thread '${threadId}' because its retired engine runtime is still active.`,
              );
            }

            if (!hasPersistedResumeCursor && !requiresCredentialRotation) {
              return yield* toValidationError(
                input.operation,
                `Cannot recover thread '${threadId}' because no engine resume state is persisted.`,
              );
            }

            const persistedCwd = readPersistedCwd(binding.runtimePayload);
            const persistedEngineSelection = readPersistedEngineSelection(binding.runtimePayload);
            const persistedEngineOptions = readPersistedEngineOptions(binding.runtimePayload);
            const persistedWorkSurface =
              binding.engine === "oa" || binding.engine === "pi"
                ? readPersistedWorkSurface(binding.runtimePayload)
                : undefined;
            const persistedProjectContextRoot =
              persistedWorkSurface === "agent"
                ? readPersistedProjectContextRoot(binding.runtimePayload)
                : undefined;
            yield* validateRuntimeModeStructure(
              input.operation,
              binding.engine,
              binding.runtimeMode ?? "full-access",
            );

            const resumed = yield* adapter.startSession({
              threadId,
              engine: binding.engine,
              lifecycleGeneration: lease.generation,
              ...(persistedCwd ? { cwd: persistedCwd } : {}),
              ...(persistedEngineSelection ? { engineSelection: persistedEngineSelection } : {}),
              ...(persistedEngineOptions ? { engineOptions: persistedEngineOptions } : {}),
              ...(persistedWorkSurface ? { workSurface: persistedWorkSurface } : {}),
              ...(persistedProjectContextRoot
                ? { projectContextRoot: persistedProjectContextRoot }
                : {}),
              ...(hasPersistedResumeCursor ? { resumeCursor: binding.resumeCursor } : {}),
              runtimeMode: binding.runtimeMode ?? "full-access",
              ...(input.productSurface === undefined
                ? {}
                : { productSurface: input.productSurface }),
            });
            if (resumed.engine !== adapter.engine) {
              return yield* toValidationError(
                input.operation,
                `Adapter/provider mismatch while recovering thread '${threadId}'. Expected '${adapter.engine}', received '${resumed.engine}'.`,
              );
            }

            yield* withBindingWriteLock(
              threadId,
              upsertSessionBinding(resumed, threadId, {
                lifecycleGeneration: lease.generation,
                ...(persistedWorkSurface === undefined
                  ? {}
                  : {
                      workSurface: persistedWorkSurface,
                      projectContextRoot: persistedProjectContextRoot ?? null,
                    }),
              }).pipe(
                Effect.andThen(
                  requiresCredentialRotation
                    ? directory.upsert({
                        threadId,
                        engine: binding.engine,
                        runtimePayload: {
                          [HOST_GATEWAY_CREDENTIAL_ROTATION_REQUIRED]: false,
                        },
                      })
                    : Effect.void,
                ),
              ),
            );
            lease.commit();
            return adapter;
          }),
        );
        while (true) {
          const admissionBinding = yield* getCurrentBinding();
          const admissionServiceId = modelServiceIdFromSelection(
            readPersistedEngineSelection(admissionBinding.runtimePayload),
          );
          const outcome = yield* withModelServiceAdmissionLocks(
            [admissionServiceId ?? unboundModelServiceAdmissionKey(threadId)],
            Effect.gen(function* () {
              const currentBinding = yield* getCurrentBinding();
              const currentServiceId = modelServiceIdFromSelection(
                readPersistedEngineSelection(currentBinding.runtimePayload),
              );
              if (currentServiceId !== admissionServiceId) {
                return { retry: true } as const;
              }
              return { retry: false, value: yield* recovery } as const;
            }),
          );
          if (!outcome.retry) return outcome.value;
        }
      });

    const retiredGatewaySessionRecoveries = new Set<ThreadId>();
    scheduleRetiredGatewaySessionRecovery = (event) => {
      if (
        (event.type !== "turn.completed" && event.type !== "turn.aborted") ||
        !runtimeEventRetiredGatewayTurnAuthority(event)
      ) {
        return Effect.void;
      }

      return Effect.suspend(() => {
        if (retiredGatewaySessionRecoveries.has(event.threadId)) {
          return Effect.void;
        }
        retiredGatewaySessionRecoveries.add(event.threadId);

        return Effect.gen(function* () {
          // The terminal event is already durable and published. Rotate the
          // retired bearer now, while the user is reading the response, so the
          // next turn does not pay for process teardown and thread/resume.
          yield* Effect.yieldNow;
          const binding = Option.getOrUndefined(yield* directory.getBinding(event.threadId));
          if (!binding) return;
          // EngineWorkSurface intentionally collapses Chat and Studio to the
          // same untrusted execution surface, so it cannot reconstruct the
          // immutable three-way ProductSurface prompt. Only Agent is
          // unambiguous here; Chat/Studio recover on the next authoritative
          // turn dispatch, which supplies ProductSurface from Project.kind.
          if (
            (binding.engine === "oa" || binding.engine === "pi") &&
            readPersistedWorkSurface(binding.runtimePayload) !== "agent"
          ) {
            return;
          }
          yield* recoverSessionForThread({
            binding,
            operation: "EngineService.proactiveGatewayCredentialRotation",
          });
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.logWarning("engine.session.proactive_gateway_rotation_failed", {
              threadId: event.threadId,
              engine: event.engine,
              cause: Cause.pretty(cause),
            }),
          ),
          Effect.ensuring(
            Effect.sync(() => {
              retiredGatewaySessionRecoveries.delete(event.threadId);
            }),
          ),
          Effect.forkIn(runtimeEventProducerScope),
          Effect.asVoid,
        );
      });
    };

    // Each Adapter has one supervised journal-first pump. Per-event retry holds
    // the current queue item until durable acceptance succeeds; stream restart
    // covers unexpected completion/defects without engine-specific fallbacks.
    // Start the pumps only after proactive recovery is installed so even an
    // immediately queued terminal event can schedule credential rotation.
    yield* Effect.forEach(adapters, (adapter) =>
      runEngineRuntimeEventPump({
        engine: adapter.engine,
        stream: adapter.streamEvents,
        processEvent: processRuntimeEvent,
        updateHealth: runtimeEventPumpHealth.update,
        isPermanentFailure: (cause) =>
          Option.match(Cause.findErrorOption(cause), {
            onNone: () => false,
            onSome: (error) => error instanceof PersistenceDecodeError,
          }),
        ...(options?.quarantineRuntimeEvent !== undefined
          ? { quarantineEvent: options.quarantineRuntimeEvent }
          : {}),
        ...(options?.runtimeEventRetryBaseDelayMs !== undefined
          ? { retryBaseDelayMs: options.runtimeEventRetryBaseDelayMs }
          : {}),
        ...(options?.runtimeEventRetryMaxDelayMs !== undefined
          ? { retryMaxDelayMs: options.runtimeEventRetryMaxDelayMs }
          : {}),
      }).pipe(Effect.forkIn(runtimeEventProducerScope)),
    ).pipe(Effect.asVoid);

    const findLiveSessionAdapter = (threadId: ThreadId, operation: string) =>
      Effect.gen(function* () {
        const inspected = yield* inspectUnboundProviderOwners(threadId);
        if (inspected.suspiciousAdapters.length > 0) {
          return yield* toValidationError(
            operation,
            `Cannot route thread '${threadId}' because engine ownership could not be inspected safely.`,
          );
        }
        if (inspected.liveAdapters.length > 1) {
          return yield* toValidationError(
            operation,
            `Cannot route thread '${threadId}' because multiple engines report a live session without a persisted binding.`,
          );
        }
        return inspected.liveAdapters[0] ?? null;
      });

    const resolveRoutableSession = (input: {
      readonly threadId: ThreadId;
      readonly operation: string;
      readonly allowRecovery: boolean;
      readonly productSurface?: import("@harnessos/shared/productSurface").ProductSurface;
    }) =>
      Effect.gen(function* () {
        const binding = Option.getOrUndefined(yield* directory.getBinding(input.threadId));
        if (!binding) {
          // Startup extension prompts can fire before startSession has persisted
          // the engine binding, but the adapter already owns a live session.
          const liveAdapter = yield* findLiveSessionAdapter(input.threadId, input.operation);
          if (liveAdapter) {
            return {
              adapter: liveAdapter,
              isActive: true,
              lifecycleGeneration: lifecycle.currentGeneration(input.threadId),
            } as const;
          }
          return yield* toValidationError(
            input.operation,
            `Cannot route thread '${input.threadId}' because no persisted engine binding exists.`,
          );
        }
        if (
          input.operation !== "EngineService.stopSession" &&
          isReplacementRestoreFailedBinding(binding)
        ) {
          return yield* toValidationError(
            input.operation,
            `Cannot route thread '${input.threadId}' because its engine ownership is not authoritative.`,
          );
        }
        const adapter = yield* registry.getByEngine(binding.engine);

        const hasActiveSession = yield* adapter.hasSession(input.threadId);
        const requiresCredentialRotation =
          runtimePayloadRecord(binding.runtimePayload)[
            HOST_GATEWAY_CREDENTIAL_ROTATION_REQUIRED
          ] === true;
        const bindingGenerationIsCurrent =
          binding.lifecycleGeneration === undefined ||
          binding.lifecycleGeneration === lifecycle.currentGeneration(input.threadId);
        if (
          hasActiveSession &&
          (!input.allowRecovery || (bindingGenerationIsCurrent && !requiresCredentialRotation))
        ) {
          return {
            adapter,
            isActive: true,
            lifecycleGeneration: binding.lifecycleGeneration,
          } as const;
        }

        if (!input.allowRecovery) {
          return {
            adapter,
            isActive: false,
            lifecycleGeneration: binding.lifecycleGeneration,
          } as const;
        }

        return {
          adapter: yield* recoverSessionForThread({
            binding,
            operation: input.operation,
            ...(input.productSurface === undefined ? {} : { productSurface: input.productSurface }),
          }),
          isActive: true,
          lifecycleGeneration: lifecycle.currentGeneration(input.threadId),
        } as const;
      });

    const startSession: EngineServiceShape["startSession"] = (threadId, rawInput, context) =>
      Effect.gen(function* () {
        const parsed = yield* decodeInputOrValidationError({
          operation: "EngineService.startSession",
          schema: EngineSessionStartInput,
          payload: rawInput,
        });

        const input = {
          ...parsed,
          threadId,
          engine: parsed.engine ?? "codex",
        };
        yield* validateRuntimeModeStructure(
          "EngineService.startSession",
          input.engine,
          input.runtimeMode,
        );
        // An explicit start is the recovery authority for a failed retirement,
        // but it must never interleave with one still in progress. Capture the
        // exact settled fence so this replacement cannot delete a newer fence
        // that was published while engine startup was running.
        const replacementFence = yield* waitForCurrentInterruptionFence(threadId);
        clearRuntimeIdleTimer(threadId);
        yield* waitForRuntimeIdleStop(threadId);
        const start = lifecycle.run(threadId, (lease) =>
          Effect.gen(function* () {
            const persistedBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
            if (persistedBinding && isReplacementRestoreFailedBinding(persistedBinding)) {
              const targetEngine = replacementTargetEngine(persistedBinding);
              const cleanupCandidates = yield* cleanupCandidatesForUncertainOwnership(threadId, [
                persistedBinding.engine,
                ...(targetEngine === undefined ? [] : [targetEngine]),
              ]);
              const ownershipRetired = yield* stopAdaptersWithinDeadline(
                cleanupCandidates,
                threadId,
                "failed to retire uncertain engine ownership before explicit start",
              );
              if (!ownershipRetired) {
                lease.retire();
                const detail = `Uncertain engine ownership could not be retired before starting '${input.engine}' for thread '${threadId}'.`;
                const unresolvedTarget =
                  targetEngine ??
                  cleanupCandidates.find(
                    (candidate) => candidate.engine !== persistedBinding.engine,
                  )?.engine;
                yield* persistUncertainEngineOwnership({
                  threadId,
                  nominalProvider: persistedBinding.engine,
                  lifecycleGeneration: lease.generation,
                  detail,
                  binding: persistedBinding,
                  ...(unresolvedTarget === undefined ? {} : { targetEngine: unresolvedTarget }),
                }).pipe(
                  Effect.catchCause((cause) =>
                    Effect.logWarning("failed to preserve engine ownership uncertainty", {
                      threadId,
                      cause: Cause.pretty(cause),
                    }),
                  ),
                );
                return yield* new EngineAdapterProcessError({
                  engine: persistedBinding.engine,
                  threadId,
                  detail,
                });
              }
              clearLiveRuntimeTasks(threadId);
            } else if (!persistedBinding) {
              const liveAdapter = yield* findLiveSessionAdapter(
                threadId,
                "EngineService.startSession",
              );
              if (liveAdapter !== null && liveAdapter.engine !== input.engine) {
                return yield* toValidationError(
                  "EngineService.startSession",
                  `Cannot replace unbound engine '${liveAdapter.engine}' with '${input.engine}' for thread '${threadId}'.`,
                );
              }
            }
            const effectiveResumeCursor =
              input.forkSourceResumeCursor !== undefined
                ? undefined
                : (input.resumeCursor ??
                  (persistedBinding?.engine === input.engine
                    ? persistedBinding.resumeCursor
                    : undefined));
            const adapterStartInput = { ...input };
            delete adapterStartInput.resumeCursor;
            delete adapterStartInput.workSurface;
            delete adapterStartInput.projectContextRoot;
            const effectiveEngineOptions =
              input.engineOptions ??
              (persistedBinding?.engine === input.engine
                ? readPersistedEngineOptions(persistedBinding.runtimePayload)
                : undefined);
            const effectiveWorkSurface =
              input.engine === "oa" || input.engine === "pi"
                ? (input.workSurface ??
                  (persistedBinding?.engine === input.engine
                    ? readPersistedWorkSurface(persistedBinding.runtimePayload)
                    : undefined))
                : undefined;
            const effectiveProjectContextRoot =
              effectiveWorkSurface === "agent"
                ? (input.projectContextRoot ??
                  (persistedBinding?.engine === input.engine
                    ? readPersistedProjectContextRoot(persistedBinding.runtimePayload)
                    : undefined))
                : undefined;
            const adapter = yield* registry.getByEngine(input.engine);
            const startAndPersistReplacement = Effect.gen(function* () {
              // Publish the lifecycle owner before entering adapter code. An
              // adapter may synchronously persist runtime events before its
              // start call returns; without this starting binding those rows
              // can outlive a failed start and later be projected as if they
              // belonged to a current runtime. Failure paths below restore the
              // exact previous snapshot (or remove this first-start binding).
              yield* withBindingWriteLock(
                threadId,
                directory.upsert({
                  threadId,
                  engine: input.engine,
                  runtimeMode: input.runtimeMode,
                  status: "starting",
                  lifecycleGeneration: lease.generation,
                  runtimePayload: {
                    activeTurnId: null,
                    lastRuntimeEvent: "engine.startSession.requested",
                    lastRuntimeEventAt: new Date().toISOString(),
                    ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
                    ...(input.engineSelection === undefined
                      ? {}
                      : { engineSelection: input.engineSelection }),
                    ...(effectiveEngineOptions === undefined
                      ? {}
                      : { engineOptions: effectiveEngineOptions }),
                    ...(effectiveWorkSurface === undefined
                      ? {}
                      : { workSurface: effectiveWorkSurface }),
                    ...(effectiveWorkSurface === undefined
                      ? {}
                      : {
                          projectContextRoot: effectiveProjectContextRoot ?? null,
                        }),
                  },
                }),
              );
              // A engine start that never returns holds this thread's
              // lifecycle lock and the caller's command slot forever. Bound it;
              // the single attempt wrapper below owns retirement for every
              // non-success exit, including timeouts and persistence failures.
              const started = yield* adapter
                .startSession({
                  ...adapterStartInput,
                  lifecycleGeneration: lease.generation,
                  ...(effectiveEngineOptions !== undefined
                    ? { engineOptions: effectiveEngineOptions }
                    : {}),
                  ...(effectiveWorkSurface !== undefined
                    ? { workSurface: effectiveWorkSurface }
                    : {}),
                  ...(effectiveProjectContextRoot !== undefined
                    ? { projectContextRoot: effectiveProjectContextRoot }
                    : {}),
                  ...(effectiveResumeCursor !== undefined
                    ? { resumeCursor: effectiveResumeCursor }
                    : {}),
                  ...(context?.productSurface === undefined
                    ? {}
                    : { productSurface: context.productSurface }),
                })
                .pipe(Effect.timeoutOption(ENGINE_START_SESSION_TIMEOUT));
              if (Option.isNone(started)) {
                yield* Effect.logError("engine session start exceeded its deadline", {
                  threadId,
                  engine: input.engine,
                  timeoutMs: Duration.toMillis(ENGINE_START_SESSION_TIMEOUT),
                });
                return yield* toValidationError(
                  "EngineService.startSession",
                  `Engine '${input.engine}' did not finish starting within ${Duration.toMillis(
                    ENGINE_START_SESSION_TIMEOUT,
                  )}ms for thread '${threadId}'.`,
                );
              }
              const session = started.value;

              if (session.engine !== adapter.engine) {
                return yield* toValidationError(
                  "EngineService.startSession",
                  `Adapter/provider mismatch: requested '${adapter.engine}', received '${session.engine}'.`,
                );
              }

              yield* withBindingWriteLock(
                threadId,
                upsertSessionBinding(session, threadId, {
                  engineSelection: input.engineSelection,
                  engineOptions: effectiveEngineOptions,
                  ...(effectiveWorkSurface === undefined
                    ? {}
                    : {
                        workSurface: effectiveWorkSurface,
                        projectContextRoot: effectiveProjectContextRoot ?? null,
                      }),
                  lifecycleGeneration: lease.generation,
                }).pipe(
                  Effect.andThen(
                    directory.upsert({
                      threadId,
                      engine: session.engine,
                      runtimePayload: {
                        [HOST_GATEWAY_CREDENTIAL_ROTATION_REQUIRED]: false,
                        [ENGINE_REPLACEMENT_TARGET_PROVIDER_KEY]: null,
                        lastRuntimeEvent: "engine.startSession",
                        lastRuntimeEventAt: new Date().toISOString(),
                      },
                    }),
                  ),
                ),
              );
              lease.commit();
              if (
                replacementFence !== undefined &&
                engineInterruptionFences.get(threadId) === replacementFence
              ) {
                engineInterruptionFences.delete(threadId);
              }

              return session;
            });

            const attemptTargetStart = Effect.gen(function* () {
              const exit = yield* Effect.exit(startAndPersistReplacement);
              if (Exit.isSuccess(exit)) {
                return { exit, targetRetired: true } as const;
              }
              const targetRetired = yield* stopAdapterWithinDeadline(
                adapter,
                threadId,
                "failed to retire engine runtime after start did not complete successfully",
              );
              return { exit, targetRetired } as const;
            });

            const startWithoutLivePreviousOwner = Effect.gen(function* () {
              const targetAttempt = yield* attemptTargetStart;
              if (Exit.isSuccess(targetAttempt.exit)) {
                return targetAttempt.exit.value;
              }
              if (!targetAttempt.targetRetired) {
                lease.retire();
                const detail = `Engine '${input.engine}' could not be retired after its start failed for thread '${threadId}'.`;
                yield* persistUncertainEngineOwnership({
                  threadId,
                  nominalProvider: persistedBinding?.engine ?? input.engine,
                  lifecycleGeneration: lease.generation,
                  detail,
                  targetEngine: input.engine,
                  ...(persistedBinding === undefined ? {} : { binding: persistedBinding }),
                  runtimeMode: input.runtimeMode,
                  ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
                  ...(input.engineSelection === undefined
                    ? {}
                    : { engineSelection: input.engineSelection }),
                  ...(effectiveEngineOptions === undefined
                    ? {}
                    : { engineOptions: effectiveEngineOptions }),
                }).pipe(
                  Effect.catchCause((cause) =>
                    Effect.logWarning("failed to persist engine start uncertainty", {
                      threadId,
                      cause: Cause.pretty(cause),
                    }),
                  ),
                );
                return yield* new EngineAdapterProcessError({
                  engine: input.engine,
                  threadId,
                  detail,
                  cause: targetAttempt.exit.cause,
                });
              }

              const restoredSnapshot = yield* Effect.exit(
                restoreBindingSnapshot(threadId, persistedBinding),
              );
              if (Exit.isFailure(restoredSnapshot)) {
                lease.retire();
                const detail = `Engine '${input.engine}' failed to start and its previous binding could not be restored for thread '${threadId}'.`;
                yield* persistUncertainEngineOwnership({
                  threadId,
                  nominalProvider: persistedBinding?.engine ?? input.engine,
                  lifecycleGeneration: lease.generation,
                  detail,
                  targetEngine: input.engine,
                  ...(persistedBinding === undefined ? {} : { binding: persistedBinding }),
                  runtimeMode: input.runtimeMode,
                  ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
                  ...(input.engineSelection === undefined
                    ? {}
                    : { engineSelection: input.engineSelection }),
                  ...(effectiveEngineOptions === undefined
                    ? {}
                    : { engineOptions: effectiveEngineOptions }),
                }).pipe(
                  Effect.catchCause((cause) =>
                    Effect.logWarning("failed to persist engine binding uncertainty", {
                      threadId,
                      cause: Cause.pretty(cause),
                    }),
                  ),
                );
                return yield* new EngineAdapterProcessError({
                  engine: input.engine,
                  threadId,
                  detail,
                  cause: restoredSnapshot.cause,
                });
              }
              return yield* Effect.failCause(targetAttempt.exit.cause);
            });

            if (!persistedBinding) {
              return yield* startWithoutLivePreviousOwner;
            }

            const previousAdapter = yield* registry.getByEngine(persistedBinding.engine);
            if (!(yield* previousAdapter.hasSession(threadId))) {
              return yield* startWithoutLivePreviousOwner;
            }
            if ((liveRuntimeTaskIds.get(threadId)?.size ?? 0) > 0) {
              return yield* toValidationError(
                "EngineService.startSession",
                `Cannot replace engine '${persistedBinding.engine}' while engine-native background tasks are active for thread '${threadId}'.`,
              );
            }

            const previousLiveSession = (yield* previousAdapter.listSessions()).find(
              (session) => session.threadId === threadId,
            );
            const previousEngineSelection = readPersistedEngineSelection(
              persistedBinding.runtimePayload,
            );
            const previousEngineOptions = readPersistedEngineOptions(
              persistedBinding.runtimePayload,
            );
            const previousWorkSurface =
              persistedBinding.engine === "oa" || persistedBinding.engine === "pi"
                ? readPersistedWorkSurface(persistedBinding.runtimePayload)
                : undefined;
            const previousProjectContextRoot =
              previousWorkSurface === "agent"
                ? readPersistedProjectContextRoot(persistedBinding.runtimePayload)
                : undefined;
            const previousCwd =
              previousLiveSession?.cwd ?? readPersistedCwd(persistedBinding.runtimePayload);
            const previousResumeCursor =
              previousLiveSession?.resumeCursor === undefined
                ? persistedBinding.resumeCursor
                : previousLiveSession.resumeCursor;
            const previousRuntimeMode =
              previousLiveSession?.runtimeMode ?? persistedBinding.runtimeMode ?? "full-access";
            const previousRetired = yield* stopAdapterWithinDeadline(
              previousAdapter,
              threadId,
              "failed to retire previous engine before replacement",
            );
            if (!previousRetired) {
              lease.retire();
              const detail = `Engine '${persistedBinding.engine}' could not be retired before replacement by '${input.engine}' for thread '${threadId}'.`;
              yield* persistUncertainEngineOwnership({
                threadId,
                nominalProvider: persistedBinding.engine,
                lifecycleGeneration: lease.generation,
                detail,
                targetEngine: input.engine,
                binding: persistedBinding,
              }).pipe(
                Effect.catchCause((cause) =>
                  Effect.logWarning("failed to persist engine retirement uncertainty", {
                    threadId,
                    cause: Cause.pretty(cause),
                  }),
                ),
              );
              return yield* new EngineAdapterProcessError({
                engine: persistedBinding.engine,
                threadId,
                detail,
              });
            }

            const replacementAttempt = yield* attemptTargetStart;
            if (Exit.isSuccess(replacementAttempt.exit)) {
              return replacementAttempt.exit.value;
            }

            // A failed adapter start may still have spawned a process or native
            // session. Prove target retirement before restoring the previous
            // owner; otherwise a single Thread could become dual-owned.
            if (!replacementAttempt.targetRetired) {
              yield* stopAdapterWithinDeadline(
                previousAdapter,
                threadId,
                "failed to confirm previous engine remained stopped after replacement failure",
              );
              lease.retire();
              const detail = `Engine '${input.engine}' could not be retired after a failed replacement for thread '${threadId}'.`;
              yield* persistUncertainEngineOwnership({
                threadId,
                nominalProvider: persistedBinding.engine,
                lifecycleGeneration: lease.generation,
                detail,
                targetEngine: input.engine,
                binding: persistedBinding,
              }).pipe(
                Effect.catchCause((cause) =>
                  Effect.logWarning("failed to persist engine replacement uncertainty", {
                    threadId,
                    cause: Cause.pretty(cause),
                  }),
                ),
              );
              return yield* new EngineAdapterProcessError({
                engine: input.engine,
                threadId,
                detail,
                cause: replacementAttempt.exit.cause,
              });
            }

            // A restored physical runtime is a third incarnation: it cannot
            // reuse either the old instance's or the failed target's generation,
            // or their delayed events could seize the restored binding.
            const restoreGeneration = lease.renewGeneration();
            const restoreExit = yield* Effect.exit(
              Effect.gen(function* () {
                // The restored adapter can emit before startSession returns,
                // exactly like a fresh target. Publish its new generation and
                // previous exact facts first so those legitimate rows cannot
                // be consumed against the failed target's provisional owner.
                yield* withBindingWriteLock(
                  threadId,
                  directory.replace({
                    threadId,
                    engine: persistedBinding.engine,
                    ...(persistedBinding.adapterKey !== undefined
                      ? { adapterKey: persistedBinding.adapterKey }
                      : {}),
                    runtimeMode: previousRuntimeMode,
                    status: "starting",
                    lifecycleGeneration: restoreGeneration,
                    ...(previousResumeCursor !== undefined
                      ? { resumeCursor: previousResumeCursor }
                      : {}),
                    runtimePayload: {
                      ...runtimePayloadRecord(persistedBinding.runtimePayload),
                      activeTurnId: null,
                      lastRuntimeEvent: "engine.restoreSession.requested",
                      lastRuntimeEventAt: new Date().toISOString(),
                      ...(previousCwd !== undefined ? { cwd: previousCwd } : {}),
                      ...(previousEngineSelection !== undefined
                        ? { engineSelection: previousEngineSelection }
                        : {}),
                      ...(previousEngineOptions !== undefined
                        ? { engineOptions: previousEngineOptions }
                        : {}),
                      ...(previousWorkSurface !== undefined
                        ? { workSurface: previousWorkSurface }
                        : {}),
                      ...(previousWorkSurface === undefined
                        ? {}
                        : {
                            projectContextRoot: previousProjectContextRoot ?? null,
                          }),
                    },
                  }),
                );
                return yield* previousAdapter.startSession({
                  threadId,
                  engine: persistedBinding.engine,
                  lifecycleGeneration: restoreGeneration,
                  runtimeMode: previousRuntimeMode,
                  ...(previousCwd !== undefined ? { cwd: previousCwd } : {}),
                  ...(previousEngineSelection !== undefined
                    ? { engineSelection: previousEngineSelection }
                    : {}),
                  ...(previousEngineOptions !== undefined
                    ? { engineOptions: previousEngineOptions }
                    : {}),
                  ...(previousWorkSurface !== undefined
                    ? { workSurface: previousWorkSurface }
                    : {}),
                  ...(previousProjectContextRoot !== undefined
                    ? { projectContextRoot: previousProjectContextRoot }
                    : {}),
                  ...(previousResumeCursor !== undefined
                    ? { resumeCursor: previousResumeCursor }
                    : {}),
                });
              }).pipe(Effect.timeoutOption(ENGINE_START_SESSION_TIMEOUT)),
            );
            const restored =
              Exit.isSuccess(restoreExit) && Option.isSome(restoreExit.value)
                ? restoreExit.value.value
                : undefined;
            if (restored?.engine === previousAdapter.engine) {
              const persistedRestore = yield* Effect.exit(
                withBindingWriteLock(
                  threadId,
                  upsertSessionBinding(restored, threadId, {
                    lifecycleGeneration: restoreGeneration,
                    engineSelection: previousEngineSelection,
                    engineOptions: previousEngineOptions,
                    ...(previousWorkSurface === undefined
                      ? {}
                      : {
                          workSurface: previousWorkSurface,
                          projectContextRoot: previousProjectContextRoot ?? null,
                        }),
                  }),
                ),
              );
              if (Exit.isSuccess(persistedRestore)) {
                lease.commit();
                return yield* Effect.failCause(replacementAttempt.exit.cause);
              }
            }

            yield* stopAdapterWithinDeadline(
              previousAdapter,
              threadId,
              "failed to retire an uncertain restored engine runtime",
            );
            yield* stopAdapterWithinDeadline(
              adapter,
              threadId,
              "failed to retire engine replacement after restore failure",
            );
            lease.retire();
            const detail = `Engine '${persistedBinding.engine}' could not be restored after replacement by '${input.engine}' failed for thread '${threadId}'.`;
            yield* persistUncertainEngineOwnership({
              threadId,
              nominalProvider: persistedBinding.engine,
              lifecycleGeneration: restoreGeneration,
              detail,
              targetEngine: input.engine,
              binding: persistedBinding,
            }).pipe(
              Effect.catchCause((cause) =>
                Effect.logWarning("failed to persist engine restore failure", {
                  threadId,
                  cause: Cause.pretty(cause),
                }),
              ),
            );
            return yield* new EngineAdapterProcessError({
              engine: persistedBinding.engine,
              threadId,
              detail,
              cause: Exit.isFailure(restoreExit)
                ? restoreExit.cause
                : replacementAttempt.exit.cause,
            });
          }),
        );
        while (true) {
          const admissionBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
          const previousServiceId = modelServiceIdFromSelection(
            admissionBinding === undefined
              ? undefined
              : readPersistedEngineSelection(admissionBinding.runtimePayload),
          );
          const targetServiceId = modelServiceIdFromSelection(input.engineSelection);
          const outcome = yield* withModelServiceAdmissionLocks(
            [previousServiceId ?? unboundModelServiceAdmissionKey(threadId), targetServiceId],
            Effect.gen(function* () {
              const currentBinding = Option.getOrUndefined(yield* directory.getBinding(threadId));
              const currentServiceId = modelServiceIdFromSelection(
                currentBinding === undefined
                  ? undefined
                  : readPersistedEngineSelection(currentBinding.runtimePayload),
              );
              if (currentServiceId !== previousServiceId) {
                return { retry: true } as const;
              }
              return { retry: false, value: yield* start } as const;
            }),
          );
          if (!outcome.retry) return outcome.value;
        }
      });

    const forkThread: NonNullable<EngineServiceShape["forkThread"]> = (rawInput) =>
      Effect.gen(function* () {
        const input = yield* decodeInputOrValidationError({
          operation: "EngineService.forkThread",
          schema: EngineForkThreadInput,
          payload: rawInput,
        });

        const existingTargetBinding = Option.getOrUndefined(
          yield* directory.getBinding(input.threadId),
        );
        if (existingTargetBinding) {
          const existingTargetPayload = runtimePayloadRecord(existingTargetBinding.runtimePayload);
          if (
            existingTargetPayload.lastRuntimeEvent === "engine.thread.forked" &&
            hasResumeCursor(existingTargetBinding.resumeCursor)
          ) {
            return {
              threadId: input.threadId,
              resumeCursor: existingTargetBinding.resumeCursor,
            };
          }
          return null;
        }

        const sourceBinding = Option.getOrUndefined(
          yield* directory.getBinding(input.sourceThreadId),
        );
        if (!sourceBinding) {
          return null;
        }

        const effectiveEngineOptions =
          input.engineOptions ?? readPersistedEngineOptions(sourceBinding.runtimePayload);
        const sourceCwd = readPersistedCwd(sourceBinding.runtimePayload);
        const targetCwd = input.cwd ?? sourceCwd;
        yield* validateRuntimeModeStructure(
          "EngineService.forkThread",
          sourceBinding.engine,
          input.runtimeMode,
        );

        const adapter = yield* registry.getByEngine(sourceBinding.engine);
        if (!adapter.forkThread) {
          return null;
        }

        if (
          input.engineSelection !== undefined &&
          input.engineSelection.engine !== adapter.engine
        ) {
          return null;
        }

        const forked = yield* adapter
          .forkThread({
            ...input,
            threadId: input.threadId,
            sourceThreadId: input.sourceThreadId,
            ...(effectiveEngineOptions !== undefined
              ? { engineOptions: effectiveEngineOptions }
              : {}),
            ...(sourceBinding.resumeCursor !== null && sourceBinding.resumeCursor !== undefined
              ? { sourceResumeCursor: sourceBinding.resumeCursor }
              : {}),
            ...(sourceCwd ? { sourceCwd } : {}),
            runtimeMode: input.runtimeMode,
          })
          .pipe(
            Effect.catch((error) =>
              Effect.logWarning("engine native fork failed; falling back", {
                sourceThreadId: input.sourceThreadId,
                targetThreadId: input.threadId,
                cause: error instanceof Error ? error.message : String(error),
              }).pipe(Effect.as(null)),
            ),
          );
        if (!forked) {
          return null;
        }

        const forkedSession = (yield* adapter.listSessions()).find(
          (session) => session.threadId === input.threadId,
        );
        // Register the fork under a committed lifecycle generation. Writing the
        // binding outside the coordinator lands it on the directory's "legacy"
        // default while the coordinator has no entry for the thread at all, and
        // any later generation adoption from that row (session recovery, the
        // startup broadcast) diverges from what the live runtime stamps —
        // silently discarding the thread's runtime events.
        yield* lifecycle.run(input.threadId, (lease) =>
          withBindingWriteLock(
            input.threadId,
            Effect.gen(function* () {
              if (forkedSession) {
                yield* upsertSessionBinding(forkedSession, input.threadId, {
                  lifecycleGeneration: lease.generation,
                  ...(input.engineSelection !== undefined
                    ? { engineSelection: input.engineSelection }
                    : {}),
                  ...(effectiveEngineOptions !== undefined
                    ? { engineOptions: effectiveEngineOptions }
                    : {}),
                  lastRuntimeEvent: "engine.thread.forked",
                  lastRuntimeEventAt: new Date().toISOString(),
                });
              } else {
                yield* directory.upsert({
                  threadId: input.threadId,
                  engine: adapter.engine,
                  runtimeMode: input.runtimeMode,
                  status: "stopped",
                  lifecycleGeneration: lease.generation,
                  ...(forked.resumeCursor !== undefined
                    ? { resumeCursor: forked.resumeCursor }
                    : {}),
                  runtimePayload: {
                    cwd: targetCwd ?? null,
                    model: input.engineSelection?.model ?? null,
                    activeTurnId: null,
                    lastError: null,
                    ...(input.engineSelection !== undefined
                      ? { engineSelection: input.engineSelection }
                      : {}),
                    ...(effectiveEngineOptions !== undefined
                      ? { engineOptions: effectiveEngineOptions }
                      : {}),
                    lastRuntimeEvent: "engine.thread.forked",
                    lastRuntimeEventAt: new Date().toISOString(),
                  },
                });
              }
              lease.commit();
            }),
          ),
        );
        return forked;
      });

    const sendTurn: EngineServiceShape["sendTurn"] = (rawInput, dispatchContext) =>
      Effect.gen(function* () {
        const parsed = yield* decodeInputOrValidationError({
          operation: "EngineService.sendTurn",
          schema: EngineSendTurnInput,
          payload: rawInput,
        });

        const input = {
          ...parsed,
          attachments: carryEngineAttachmentPaths(rawInput, parsed.attachments ?? []),
        };
        if (!input.input && input.attachments.length === 0) {
          return yield* toValidationError(
            "EngineService.sendTurn",
            "Either input text or at least one attachment is required",
          );
        }
        return yield* runTurnDispatch(input.threadId, (generation) =>
          Effect.gen(function* () {
            const routed = yield* resolveRoutableSession({
              threadId: input.threadId,
              operation: "EngineService.sendTurn",
              allowRecovery: true,
              ...(dispatchContext?.productSurface === undefined
                ? {}
                : { productSurface: dispatchContext.productSurface }),
            });
            yield* validateInteractionModeStructure(
              "EngineService.sendTurn",
              routed.adapter.engine,
              input.interactionMode,
            );
            const turn = yield* routed.adapter.sendTurn(input, dispatchContext);
            const persistenceInput: StartedTurnPersistenceInput = {
              threadId: input.threadId,
              engine: routed.adapter.engine,
              turnId: String(turn.turnId),
              generation,
              ...(turn.resumeCursor !== undefined ? { resumeCursor: turn.resumeCursor } : {}),
              ...(input.engineSelection !== undefined
                ? { engineSelection: input.engineSelection }
                : {}),
              lastRuntimeEvent: "engine.sendTurn",
            };
            rememberSuccessfulTurnDispatch(persistenceInput);
            // A turn can settle before this write lands (e.g. a pre-start
            // cancellation completes inside the adapter fork); re-marking the
            // thread as running then would strand it with a stale active turn.
            // Durable metadata (model selection, resume cursor) is still
            // persisted — status stays untouched (upsert keeps the existing
            // value when omitted) and runtimePayload merges per key. The
            // binding-write lock makes the check and the write atomic with the
            // runtime-event handler, so a terminal event cannot slip between
            // them and then be overwritten.
            yield* persistStartedTurn(persistenceInput);
            return turn;
          }),
        );
      });

    const steerTurn: EngineServiceShape["steerTurn"] = (rawInput) =>
      Effect.gen(function* () {
        const parsed = yield* decodeInputOrValidationError({
          operation: "EngineService.steerTurn",
          schema: EngineSteerTurnInput,
          payload: rawInput,
        });

        const input = {
          ...parsed,
          attachments: carryEngineAttachmentPaths(rawInput, parsed.attachments ?? []),
        };
        if (!input.input && input.attachments.length === 0) {
          return yield* toValidationError(
            "EngineService.steerTurn",
            "Either input text or at least one attachment is required",
          );
        }
        return yield* runTurnDispatch(input.threadId, (generation) =>
          Effect.gen(function* () {
            const routed = yield* resolveRoutableSession({
              threadId: input.threadId,
              operation: "EngineService.steerTurn",
              allowRecovery: true,
            });
            yield* validateInteractionModeStructure(
              "EngineService.steerTurn",
              routed.adapter.engine,
              input.interactionMode,
            );
            if (
              !routed.adapter.steerTurn ||
              routed.adapter.capabilities.supportsTurnSteering !== true
            ) {
              return yield* toValidationError(
                "EngineService.steerTurn",
                `Engine '${routed.adapter.engine}' does not support steering an active turn.`,
              );
            }
            const turn = yield* routed.adapter.steerTurn(input);
            const persistenceInput: StartedTurnPersistenceInput = {
              threadId: input.threadId,
              engine: routed.adapter.engine,
              turnId: String(turn.turnId),
              generation,
              ...(turn.resumeCursor !== undefined ? { resumeCursor: turn.resumeCursor } : {}),
              ...(input.engineSelection !== undefined
                ? { engineSelection: input.engineSelection }
                : {}),
              lastRuntimeEvent: "engine.steerTurn",
            };
            rememberSuccessfulTurnDispatch(persistenceInput);
            yield* persistStartedTurn(persistenceInput);
            return turn;
          }),
        );
      });

    const startReview: EngineServiceShape["startReview"] = (rawInput) =>
      Effect.gen(function* () {
        const input = yield* decodeInputOrValidationError({
          operation: "EngineService.startReview",
          schema: EngineStartReviewInput,
          payload: rawInput,
        });

        return yield* runTurnDispatch(input.threadId, (generation) =>
          Effect.gen(function* () {
            const routed = yield* resolveRoutableSession({
              threadId: input.threadId,
              operation: "EngineService.startReview",
              allowRecovery: true,
            });
            if (!routed.adapter.startReview) {
              return yield* toValidationError(
                "EngineService.startReview",
                `Engine '${routed.adapter.engine}' does not support native review.`,
              );
            }

            const turn = yield* routed.adapter.startReview(input);
            const persistenceInput: StartedTurnPersistenceInput = {
              threadId: input.threadId,
              engine: routed.adapter.engine,
              turnId: String(turn.turnId),
              generation,
              ...(turn.resumeCursor !== undefined ? { resumeCursor: turn.resumeCursor } : {}),
              lastRuntimeEvent: "engine.startReview",
            };
            rememberSuccessfulTurnDispatch(persistenceInput);
            yield* persistStartedTurn(persistenceInput);
            return turn;
          }),
        );
      });

    const interruptTurn: EngineServiceShape["interruptTurn"] = (rawInput) =>
      Effect.gen(function* () {
        const input = yield* decodeInputOrValidationError({
          operation: "EngineService.interruptTurn",
          schema: EngineInterruptTurnInput,
          payload: rawInput,
        });
        let rotationStarted = false;
        // Urgent: an interrupt is the user's only escape hatch from a wedged
        // turn, so it must not queue behind a lifecycle mutation that hangs.
        const runInterrupt =
          input.nativeThreadId === undefined ? lifecycle.runCurrentUrgent : lifecycle.runCurrent;
        const interruptActiveTurn = runInterrupt(input.threadId, (currentGeneration) =>
          Effect.gen(function* () {
            const routed = yield* resolveRoutableSession({
              threadId: input.threadId,
              operation: "EngineService.interruptTurn",
              allowRecovery: false,
            });
            if (!routed.isActive) {
              return yield* toValidationError(
                "EngineService.interruptTurn",
                `Cannot interrupt thread '${input.threadId}' because its engine runtime is not active.`,
              );
            }

            const binding = Option.getOrUndefined(yield* directory.getBinding(input.threadId));
            if (!binding) {
              return yield* toValidationError(
                "EngineService.interruptTurn",
                `Cannot interrupt thread '${input.threadId}' without a persisted engine binding.`,
              );
            }
            const bindingGeneration = binding.lifecycleGeneration ?? currentGeneration;
            if (
              currentGeneration !== undefined &&
              bindingGeneration !== undefined &&
              bindingGeneration !== currentGeneration
            ) {
              return yield* toValidationError(
                "EngineService.interruptTurn",
                `Cannot interrupt stale engine generation '${bindingGeneration}' for thread '${input.threadId}'.`,
              );
            }

            const boundActiveTurnId = runtimeActiveTurnId(binding.runtimePayload);
            const nativeTurnId =
              input.nativeThreadId !== undefined ? input.turnId : boundActiveTurnId;
            if (nativeTurnId === undefined) {
              return yield* toValidationError(
                "EngineService.interruptTurn",
                `Cannot interrupt thread '${input.threadId}' because no exact active engine turn is bound.`,
              );
            }
            if (
              input.nativeThreadId === undefined &&
              input.turnId !== undefined &&
              input.turnId !== nativeTurnId
            ) {
              yield* Effect.logWarning(
                "engine interrupt received stale projection turn; using authoritative active turn",
                {
                  threadId: input.threadId,
                  requestedTurnId: input.turnId,
                  activeTurnId: nativeTurnId,
                  engine: routed.adapter.engine,
                },
              );
            }

            const targetedInterruptKey =
              input.nativeThreadId === undefined
                ? undefined
                : targetedChildInterruptKey(
                    input.threadId,
                    TurnId.makeUnsafe(nativeTurnId),
                    input.nativeThreadId,
                  );
            if (targetedInterruptKey !== undefined) {
              const previousTargetedInterrupt =
                targetedChildInterruptTombstones.get(targetedInterruptKey);
              if (
                previousTargetedInterrupt?.state === "confirmed" ||
                (previousTargetedInterrupt?.state === "uncertain" &&
                  previousTargetedInterrupt.lifecycleGeneration !== bindingGeneration)
              ) {
                return;
              }
            }

            if (input.nativeThreadId !== undefined) {
              // Child and parent share one engine MCP transport. The adapter
              // revokes that lease while stopping the child; persist the need
              // to replace the still-running parent runtime before its next
              // turn receives browser authority.
              yield* withBindingWriteLock(
                input.threadId,
                directory.upsert({
                  threadId: input.threadId,
                  engine: binding.engine,
                  runtimePayload: {
                    [HOST_GATEWAY_CREDENTIAL_ROTATION_REQUIRED]: true,
                    lastRuntimeEvent: "engine.subagentInterruptedCredentialRotationRequired",
                    lastRuntimeEventAt: new Date().toISOString(),
                  },
                }),
              );
              if (targetedInterruptKey !== undefined) {
                // The adapter revokes the shared bearer before attempting its
                // engine-native child stop. Tombstone at the same admission
                // boundary: even an uncertain native failure must not let a
                // duplicate stale Stop revoke the replacement runtime's lease.
                rememberTargetedChildInterrupt(targetedInterruptKey, {
                  lifecycleGeneration: bindingGeneration,
                  state: "uncertain",
                });
              }
            }

            rotationStarted = input.nativeThreadId === undefined;
            yield* routed.adapter.interruptTurn(
              input.threadId,
              TurnId.makeUnsafe(nativeTurnId),
              input.nativeThreadId,
            );
            if (input.nativeThreadId === undefined) {
              // User interruption is itself the authoritative terminal fact.
              // Persist and publish it while the exact turn still owns the
              // binding; the engine-native terminal may arrive only after
              // the interrupted runtime has been retired and must then be a
              // harmless duplicate rather than the sole settlement path.
              yield* processRuntimeEvent({
                type: "turn.aborted",
                eventId: EventId.makeUnsafe(`${ENGINE_INTERRUPT_EVENT_ID_PREFIX}${randomUUID()}`),
                engine: routed.adapter.engine,
                threadId: input.threadId,
                turnId: TurnId.makeUnsafe(nativeTurnId),
                ...(bindingGeneration === undefined
                  ? {}
                  : { lifecycleGeneration: bindingGeneration }),
                createdAt: new Date().toISOString(),
                payload: { reason: ENGINE_INTERRUPT_REASON },
              }).pipe(
                Effect.mapError(
                  (cause) =>
                    new EngineSessionDirectoryPersistenceError({
                      operation: "EngineService.interruptTurn",
                      detail: "Failed to persist the authoritative interrupt settlement.",
                      cause,
                    }),
                ),
              );
            }
            if (targetedInterruptKey !== undefined) {
              rememberTargetedChildInterrupt(targetedInterruptKey, {
                lifecycleGeneration: bindingGeneration,
                state: "confirmed",
              });
            }
          }),
        );
        return yield* Effect.uninterruptible(
          Effect.gen(function* () {
            // Publish and settle the fence inside the same masked region. If
            // this interrupt fiber is itself cancelled while runtime teardown
            // is blocked, deferred interruption must not skip resolve/delete.
            const fence = yield* acquireEngineInterruptionFence(input.threadId);
            const rotationExit = yield* Effect.exit(
              input.nativeThreadId === undefined
                ? interruptActiveTurn.pipe(
                    Effect.andThen(
                      stopRuntimeSessionInternal({ threadId: input.threadId }, undefined, {
                        requireHostGatewayCredentialRotation: true,
                      }),
                    ),
                  )
                : interruptActiveTurn,
            );
            if (Exit.isFailure(rotationExit)) {
              if (rotationStarted) {
                fence.failure = Cause.pretty(rotationExit.cause);
              } else if (engineInterruptionFences.get(input.threadId) === fence) {
                engineInterruptionFences.delete(input.threadId);
              }
              fence.resolve();
              return yield* Effect.failCause(rotationExit.cause);
            }
            if (engineInterruptionFences.get(input.threadId) === fence) {
              engineInterruptionFences.delete(input.threadId);
            }
            fence.resolve();
          }),
        );
      });

    const stopTask: EngineServiceShape["stopTask"] = (rawInput) =>
      decodeInputOrValidationError({
        operation: "EngineService.stopTask",
        schema: EngineStopTaskInput,
        payload: rawInput,
      }).pipe(
        Effect.flatMap((input) =>
          lifecycle.runCurrent(input.threadId, () =>
            Effect.gen(function* () {
              const routed = yield* resolveRoutableSession({
                threadId: input.threadId,
                operation: "EngineService.stopTask",
                allowRecovery: false,
              });
              if (!routed.isActive) {
                return yield* toValidationError(
                  "EngineService.stopTask",
                  `Cannot stop engine task '${input.taskId}' because the engine runtime is not active.`,
                );
              }
              if (!routed.adapter.stopTask) {
                return yield* toValidationError(
                  "EngineService.stopTask",
                  `Engine '${routed.adapter.engine}' does not support stopping a engine task.`,
                );
              }
              yield* routed.adapter.stopTask(input.threadId, input.taskId);
            }),
          ),
        ),
      );

    const backgroundTask: EngineServiceShape["backgroundTask"] = (rawInput) =>
      decodeInputOrValidationError({
        operation: "EngineService.backgroundTask",
        schema: EngineBackgroundTaskInput,
        payload: rawInput,
      }).pipe(
        Effect.flatMap((input) =>
          lifecycle.runCurrent(input.threadId, () =>
            Effect.gen(function* () {
              const routed = yield* resolveRoutableSession({
                threadId: input.threadId,
                operation: "EngineService.backgroundTask",
                allowRecovery: false,
              });
              if (!routed.isActive) {
                return yield* toValidationError(
                  "EngineService.backgroundTask",
                  `Cannot background engine task '${input.toolUseId}' because the engine runtime is not active.`,
                );
              }
              if (!routed.adapter.backgroundTask) {
                return yield* toValidationError(
                  "EngineService.backgroundTask",
                  `Engine '${routed.adapter.engine}' does not support backgrounding a engine task.`,
                );
              }
              yield* routed.adapter.backgroundTask(input.threadId, input.toolUseId);
            }),
          ),
        ),
      );

    const steerSubagent: EngineServiceShape["steerSubagent"] = (rawInput) =>
      decodeInputOrValidationError({
        operation: "EngineService.steerSubagent",
        schema: EngineSteerSubagentInput,
        payload: rawInput,
      }).pipe(
        Effect.flatMap((input) =>
          lifecycle.runCurrent(input.threadId, () =>
            Effect.gen(function* () {
              const routed = yield* resolveRoutableSession({
                threadId: input.threadId,
                operation: "EngineService.steerSubagent",
                allowRecovery: false,
              });
              if (!routed.isActive) {
                return yield* toValidationError(
                  "EngineService.steerSubagent",
                  `Cannot message subagent '${input.nativeThreadId}' because the engine runtime is not active.`,
                );
              }
              if (!routed.adapter.steerSubagent) {
                return yield* toValidationError(
                  "EngineService.steerSubagent",
                  `Engine '${routed.adapter.engine}' does not support messaging a running subagent.`,
                );
              }
              const attachments = carryEngineAttachmentPaths(rawInput, input.attachments ?? []);
              yield* routed.adapter.steerSubagent(input.threadId, input.nativeThreadId, {
                input: input.input ?? "",
                ...(attachments.length > 0 ? { attachments } : {}),
                ...(input.skills !== undefined ? { skills: input.skills } : {}),
                ...(input.mentions !== undefined ? { mentions: input.mentions } : {}),
              });
            }),
          ),
        ),
      );

    const respondToInteraction = (response: InteractionResponse) => {
      const { input } = response;
      const operation =
        response.kind === "approval"
          ? "EngineService.respondToRequest"
          : "EngineService.respondToUserInput";
      return lifecycle.runCurrent(input.threadId, (currentGeneration) =>
        Effect.gen(function* () {
          const routed = yield* resolveRoutableSession({
            threadId: input.threadId,
            operation,
            allowRecovery: false,
          });
          if (!routed.isActive) {
            return yield* toValidationError(
              operation,
              `Cannot respond to request '${input.requestId}' because the engine runtime is not active.`,
            );
          }
          const routedGeneration = routed.lifecycleGeneration ?? currentGeneration;
          if (
            routedGeneration !== undefined &&
            routedGeneration !== "legacy" &&
            input.lifecycleGeneration === undefined
          ) {
            return yield* toValidationError(
              operation,
              `Cannot respond to request '${input.requestId}' without its engine lifecycle generation.`,
            );
          }
          if (
            input.lifecycleGeneration !== undefined &&
            input.lifecycleGeneration !== routedGeneration
          ) {
            return yield* toValidationError(
              operation,
              `Cannot respond to stale request '${input.requestId}' from engine generation '${input.lifecycleGeneration}'.`,
            );
          }
          if (response.kind === "approval") {
            yield* routed.adapter.respondToRequest(
              input.threadId,
              input.requestId,
              response.input.decision,
            );
            return;
          }
          yield* routed.adapter.respondToUserInput(
            input.threadId,
            input.requestId,
            response.input.response,
          );
        }),
      );
    };

    const respondToRequest: EngineServiceShape["respondToRequest"] = (rawInput) =>
      decodeInputOrValidationError({
        operation: "EngineService.respondToRequest",
        schema: EngineRespondToRequestInput,
        payload: rawInput,
      }).pipe(Effect.flatMap((input) => respondToInteraction({ kind: "approval", input })));

    const respondToUserInput: EngineServiceShape["respondToUserInput"] = (rawInput) =>
      decodeInputOrValidationError({
        operation: "EngineService.respondToUserInput",
        schema: EngineRespondToUserInputInput,
        payload: rawInput,
      }).pipe(Effect.flatMap((input) => respondToInteraction({ kind: "userInput", input })));

    const stopSession: EngineServiceShape["stopSession"] = (rawInput) =>
      Effect.gen(function* () {
        const input = yield* decodeInputOrValidationError({
          operation: "EngineService.stopSession",
          schema: EngineStopSessionInput,
          payload: rawInput,
        });
        yield* waitForRuntimeIdleStop(input.threadId);
        clearRuntimeIdleTimer(input.threadId);
        return yield* lifecycle.run(input.threadId, (lease) =>
          Effect.gen(function* () {
            const binding = Option.getOrUndefined(yield* directory.getBinding(input.threadId));
            if (!binding || isReplacementRestoreFailedBinding(binding)) {
              const recordedTarget = binding ? replacementTargetEngine(binding) : undefined;
              const cleanupCandidates = yield* cleanupCandidatesForUncertainOwnership(
                input.threadId,
                binding
                  ? [binding.engine, ...(recordedTarget === undefined ? [] : [recordedTarget])]
                  : [],
              );
              const ownershipRetired = yield* stopAdaptersWithinDeadline(
                cleanupCandidates,
                input.threadId,
                "failed to retire engine with uncertain or unbound ownership",
              );
              if (!ownershipRetired) {
                lease.retire();
                const nominalProvider = binding?.engine ?? cleanupCandidates[0]?.engine;
                if (nominalProvider === undefined) {
                  return yield* toValidationError(
                    "EngineService.stopSession",
                    `Engine ownership cleanup failed without an identifiable adapter for thread '${input.threadId}'.`,
                  );
                }
                const targetEngine =
                  recordedTarget ??
                  cleanupCandidates.find((adapter) => adapter.engine !== nominalProvider)?.engine;
                const detail = `Engine ownership could not be retired completely for thread '${input.threadId}'.`;
                yield* persistUncertainEngineOwnership({
                  threadId: input.threadId,
                  nominalProvider,
                  lifecycleGeneration: lease.generation,
                  detail,
                  ...(targetEngine === undefined ? {} : { targetEngine }),
                  ...(binding === undefined ? {} : { binding }),
                }).pipe(
                  Effect.catchCause((cause) =>
                    Effect.logWarning("failed to preserve engine stop uncertainty", {
                      threadId: input.threadId,
                      cause: Cause.pretty(cause),
                    }),
                  ),
                );
                return yield* new EngineAdapterProcessError({
                  engine: nominalProvider,
                  threadId: input.threadId,
                  detail,
                });
              }

              clearLiveRuntimeTasks(input.threadId);
              yield* waitForRuntimeIdleStop(input.threadId);
              yield* withBindingWriteLock(input.threadId, directory.remove(input.threadId));
              engineInterruptionFences.delete(input.threadId);
              lease.retire();
              retireRuntimeIdleGeneration(input.threadId);
              return;
            }

            const routed = yield* resolveRoutableSession({
              threadId: input.threadId,
              operation: "EngineService.stopSession",
              allowRecovery: false,
            }).pipe(
              Effect.catchTag("EngineValidationError", (error) =>
                error.issue.includes("no persisted engine binding exists")
                  ? Effect.succeed(null)
                  : Effect.fail(error),
              ),
            );
            if (routed === null) {
              clearLiveRuntimeTasks(input.threadId);
              lease.retire();
              retireRuntimeIdleGeneration(input.threadId);
              return;
            }
            // Adapter stop is an idempotent cleanup barrier. Even when the
            // routable session is inactive, the adapter may retain ownership
            // from a teardown whose exit proof previously failed.
            yield* routed.adapter.stopSession(input.threadId);
            clearLiveRuntimeTasks(input.threadId);
            yield* waitForRuntimeIdleStop(input.threadId);
            yield* withBindingWriteLock(input.threadId, directory.remove(input.threadId));
            engineInterruptionFences.delete(input.threadId);
            lease.retire();
            retireRuntimeIdleGeneration(input.threadId);
          }),
        );
      });

    const stopRuntimeSessionInternal = (
      rawInput: StopRuntimeSessionInput,
      expectedIdleGeneration?: symbol,
      options?: { readonly requireHostGatewayCredentialRotation?: boolean },
    ): StopRuntimeSessionEffect =>
      Effect.gen(function* () {
        const input = yield* decodeInputOrValidationError({
          operation: "EngineService.stopRuntimeSession",
          schema: EngineStopSessionInput,
          payload: rawInput,
        });
        const isExpectedIdleStopCurrent = () =>
          expectedIdleGeneration === undefined ||
          isRuntimeIdleGenerationCurrent(input.threadId, expectedIdleGeneration);
        if (expectedIdleGeneration === undefined) {
          yield* waitForRuntimeIdleStop(input.threadId);
          clearRuntimeIdleTimer(input.threadId);
        } else if (!isExpectedIdleStopCurrent()) {
          return;
        }
        return yield* lifecycle.run(input.threadId, (lease) =>
          Effect.gen(function* () {
            if (!isExpectedIdleStopCurrent()) {
              return;
            }
            const binding = Option.getOrUndefined(yield* directory.getBinding(input.threadId));
            if (!binding || !isExpectedIdleStopCurrent()) {
              return;
            }
            const adapter = yield* registry.getByEngine(binding.engine);
            const hasActiveSession = yield* adapter.hasSession(input.threadId);
            let resumeCursor = binding.resumeCursor;
            if (!isExpectedIdleStopCurrent()) {
              return;
            }
            if (hasActiveSession) {
              const activeSessions = yield* adapter.listSessions();
              const activeSession = activeSessions.find(
                (session) => session.threadId === input.threadId,
              );
              if (activeSession?.resumeCursor !== undefined) {
                resumeCursor = activeSession.resumeCursor;
              }
              yield* adapter.stopSession(input.threadId);
            }
            if (!isExpectedIdleStopCurrent()) {
              return;
            }
            clearLiveRuntimeTasks(input.threadId);
            yield* withBindingWriteLock(
              input.threadId,
              directory.upsert({
                threadId: input.threadId,
                engine: binding.engine,
                ...(binding.adapterKey !== undefined ? { adapterKey: binding.adapterKey } : {}),
                ...(binding.runtimeMode !== undefined ? { runtimeMode: binding.runtimeMode } : {}),
                status: "stopped",
                lifecycleGeneration: lease.generation,
                resumeCursor,
                runtimePayload: {
                  ...runtimePayloadRecord(binding.runtimePayload),
                  activeTurnId: null,
                  lastRuntimeEvent:
                    options?.requireHostGatewayCredentialRotation === true
                      ? ENGINE_INTERRUPT_RUNTIME_FENCED_EVENT
                      : "engine.stopRuntimeSession",
                  lastRuntimeEventAt: new Date().toISOString(),
                  lifecycleGeneration: lease.generation,
                  ...(options?.requireHostGatewayCredentialRotation === true
                    ? { [HOST_GATEWAY_CREDENTIAL_ROTATION_REQUIRED]: true }
                    : {}),
                },
              }),
            );
            lease.commit();
            retireRuntimeIdleGeneration(input.threadId, expectedIdleGeneration);
          }),
        );
      });

    const stopRuntimeSession: StopRuntimeSession = (rawInput) =>
      stopRuntimeSessionInternal(rawInput);

    const hasLiveRuntimeTasks: NonNullable<EngineServiceShape["hasLiveRuntimeTasks"]> = (input) =>
      Effect.sync(() => (liveRuntimeTaskIds.get(input.threadId)?.size ?? 0) > 0);

    const reloadSessionResources: EngineServiceShape["reloadSessionResources"] = (input) =>
      lifecycle.runCurrent(input.threadId, () =>
        Effect.gen(function* () {
          const operation = "EngineService.reloadSessionResources";
          const binding = Option.getOrUndefined(yield* directory.getBinding(input.threadId));
          if (binding !== undefined) {
            if (isReplacementRestoreFailedBinding(binding)) {
              return yield* toValidationError(
                operation,
                `Cannot reload thread '${input.threadId}' because its engine ownership is not authoritative.`,
              );
            }
          }
          const adapter =
            binding === undefined
              ? yield* findLiveSessionAdapter(input.threadId, operation)
              : yield* registry.getByEngine(binding.engine);
          if (adapter === null) return { state: "no_active_session" as const };
          if (adapter.engine !== "oa") {
            return { state: "different_engine" as const };
          }
          if (!(yield* adapter.hasSession(input.threadId))) {
            return { state: "no_active_session" as const };
          }
          if ((liveRuntimeTaskIds.get(input.threadId)?.size ?? 0) > 0) {
            return { state: "busy" as const };
          }
          if (!adapter.reloadSessionResources) {
            return yield* toValidationError(
              operation,
              "HarnessOS Agent does not expose active-session resource reload.",
            );
          }
          return {
            state: yield* adapter.reloadSessionResources(input.threadId),
          };
        }),
      );

    stopIdleRuntimeSession = (threadId, generation) => {
      const stopEffect = Effect.gen(function* () {
        const binding = Option.getOrUndefined(yield* directory.getBinding(threadId));
        if (!binding) {
          retireRuntimeIdleGeneration(threadId, generation);
          return;
        }

        const adapter = yield* registry.getByEngine(binding.engine);
        const sessions = yield* adapter.listSessions();
        const session = sessions.find((entry) => entry.threadId === threadId);
        const bindingRuntimePayload = runtimePayloadRecord(binding.runtimePayload);
        if (
          bindingRuntimePayload.activeTurnId !== null &&
          bindingRuntimePayload.activeTurnId !== undefined
        ) {
          retireRuntimeIdleGeneration(threadId, generation);
          return;
        }
        const isIdleReadySession =
          session?.status === "ready" ||
          (session?.status === "running" &&
            binding.status === "stopped" &&
            (bindingRuntimePayload.lastRuntimeEvent === "thread.state.changed" ||
              bindingRuntimePayload.lastRuntimeEvent === "engine.compactThread"));
        if (
          !session ||
          !isIdleReadySession ||
          session.activeTurnId !== undefined ||
          (liveRuntimeTaskIds.get(threadId)?.size ?? 0) > 0
        ) {
          retireRuntimeIdleGeneration(threadId, generation);
          return;
        }
        // Live adapter snapshots can temporarily omit cursors even though the
        // directory already persisted one from an earlier runtime event.
        if (!hasResumeCursor(session.resumeCursor) && !hasResumeCursor(binding.resumeCursor)) {
          retireRuntimeIdleGeneration(threadId, generation);
          return;
        }
        if (!isRuntimeIdleGenerationCurrent(threadId, generation)) {
          return;
        }

        yield* stopRuntimeSessionInternal({ threadId }, generation);
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("engine.session.idle_stop_failed", {
            threadId,
            cause,
          }),
        ),
      );
      const stopPromise = Effect.runPromise(stopEffect).finally(() => {
        if (runtimeIdleStopsInFlight.get(threadId) === stopPromise) {
          runtimeIdleStopsInFlight.delete(threadId);
        }
      });
      runtimeIdleStopsInFlight.set(threadId, stopPromise);
    };

    const clearSessionResumeCursor: NonNullable<EngineServiceShape["clearSessionResumeCursor"]> = (
      rawInput,
    ) =>
      Effect.gen(function* () {
        const input = yield* decodeInputOrValidationError({
          operation: "EngineService.clearSessionResumeCursor",
          schema: ClearSessionResumeCursorInput,
          payload: rawInput,
        });
        yield* waitForRuntimeIdleStop(input.threadId);
        clearRuntimeIdleTimer(input.threadId);
        yield* lifecycle.run(input.threadId, (lease) =>
          Effect.gen(function* () {
            const initialBinding = Option.getOrUndefined(
              yield* directory.getBinding(input.threadId),
            );
            if (!initialBinding) return undefined;

            // Adapter calls remain under lifecycle authority, but never under
            // the binding lock: stopSession is allowed to synchronously await
            // terminal events whose binding settlement needs that lock.
            const adapter = yield* registry.getByEngine(initialBinding.engine);
            const hasActiveSession = yield* adapter.hasSession(input.threadId);
            const preserveActive = hasActiveSession && input.preserveActiveRuntime === true;
            if (hasActiveSession && !preserveActive) {
              yield* adapter.stopSession(input.threadId);
            }
            if (!preserveActive) clearLiveRuntimeTasks(input.threadId);

            return yield* withBindingWriteLock(
              input.threadId,
              Effect.gen(function* () {
                const latestBinding = Option.getOrUndefined(
                  yield* directory.getBinding(input.threadId),
                );
                if (
                  latestBinding === undefined ||
                  latestBinding.engine !== initialBinding.engine ||
                  latestBinding.lifecycleGeneration !== initialBinding.lifecycleGeneration
                ) {
                  return yield* toValidationError(
                    "EngineService.clearSessionResumeCursor",
                    `Cannot clear thread '${input.threadId}' because engine ownership changed while its runtime was stopping.`,
                  );
                }

                // Adapter stop returning is not a runtime-event pump drain
                // acknowledgement. Keep the exact physical generation and
                // unresolved turn facts so already queued terminal events can
                // still prove durable ownership and settle this row.
                const effectiveGeneration = latestBinding.lifecycleGeneration ?? lease.generation;
                yield* directory.upsert({
                  threadId: input.threadId,
                  engine: latestBinding.engine,
                  ...(latestBinding.adapterKey !== undefined
                    ? { adapterKey: latestBinding.adapterKey }
                    : {}),
                  ...(latestBinding.runtimeMode !== undefined
                    ? { runtimeMode: latestBinding.runtimeMode }
                    : {}),
                  status: preserveActive ? (latestBinding.status ?? "running") : "stopped",
                  lifecycleGeneration: effectiveGeneration,
                  resumeCursor: null,
                  runtimePayload: {
                    ...runtimePayloadRecord(latestBinding.runtimePayload),
                    lifecycleGeneration: effectiveGeneration,
                  },
                });
                lease.adopt(effectiveGeneration);
                return latestBinding.engine;
              }),
            );
          }),
        );
        yield* waitForRuntimeIdleStop(input.threadId);
        retireRuntimeIdleGeneration(input.threadId);
      });

    const reconcileAuthoritativeSessions = (
      activeSessions: ReadonlyArray<EngineSession>,
      persistedBindings: ReadonlyArray<EngineRuntimeBinding>,
    ): ReadonlyArray<EngineSession> => {
      const bindingsByThreadId = new Map(
        persistedBindings.map((binding) => [binding.threadId, binding] as const),
      );
      const sessionsByThreadId = new Map<ThreadId, Array<EngineSession>>();
      for (const session of activeSessions) {
        const sessions = sessionsByThreadId.get(session.threadId) ?? [];
        sessions.push(session);
        sessionsByThreadId.set(session.threadId, sessions);
      }
      const authoritativeSessions: Array<EngineSession> = [];
      for (const [threadId, sessions] of sessionsByThreadId) {
        const binding = bindingsByThreadId.get(threadId);
        const currentGeneration = lifecycle.currentGeneration(threadId);
        const bindingGenerationIsCurrent =
          binding?.lifecycleGeneration === undefined ||
          (currentGeneration !== undefined && binding.lifecycleGeneration === currentGeneration);
        const matching = binding
          ? bindingGenerationIsCurrent
            ? sessions.filter((session) => session.engine === binding.engine)
            : []
          : sessions;
        // A single physical owner is required. During the narrow startup
        // window with no binding, preserve one unambiguous live session;
        // dual matches fail closed instead of inheriting registry order.
        if (matching.length === 1) {
          authoritativeSessions.push(matching[0]!);
        }
      }

      return authoritativeSessions.map((session) => {
        const binding = bindingsByThreadId.get(session.threadId);
        if (!binding) {
          return session;
        }

        const overrides: {
          resumeCursor?: EngineSession["resumeCursor"];
          runtimeMode?: EngineSession["runtimeMode"];
        } = {};
        if (session.resumeCursor === undefined && binding.resumeCursor !== undefined) {
          overrides.resumeCursor = binding.resumeCursor;
        }
        if (binding.runtimeMode !== undefined) {
          overrides.runtimeMode = binding.runtimeMode;
        }
        return Object.assign({}, session, overrides);
      });
    };

    const listSessionsStrict: EngineServiceShape["listSessionsStrict"] = () =>
      Effect.gen(function* () {
        const activeSessions = (yield* Effect.forEach(adapters, (adapter) =>
          adapter.listSessions(),
        )).flatMap((sessions) => sessions);
        const persistedBindings = yield* directory.listBindings();
        return reconcileAuthoritativeSessions(activeSessions, persistedBindings);
      });

    const listSessions: EngineServiceShape["listSessions"] = () =>
      Effect.gen(function* () {
        const activeSessions = (yield* Effect.forEach(adapters, (adapter) =>
          adapter.listSessions(),
        )).flatMap((sessions) => sessions);
        const persistedBindingsExit = yield* Effect.exit(directory.listBindings());
        if (Exit.isFailure(persistedBindingsExit)) {
          yield* Effect.logWarning("engine session directory unavailable while listing sessions", {
            cause: Cause.pretty(persistedBindingsExit.cause),
          });
          return [];
        }
        return reconcileAuthoritativeSessions(activeSessions, persistedBindingsExit.value);
      });

    const getCapabilities: EngineServiceShape["getCapabilities"] = (engine) =>
      registry.getByEngine(engine).pipe(Effect.map((adapter) => adapter.capabilities));

    const rollbackConversation: EngineServiceShape["rollbackConversation"] = (rawInput) =>
      Effect.gen(function* () {
        const input = yield* decodeInputOrValidationError({
          operation: "EngineService.rollbackConversation",
          schema: EngineRollbackConversationInput,
          payload: rawInput,
        });
        if (input.numTurns === 0) {
          return;
        }
        yield* runIdleSensitiveProviderWork(
          input.threadId,
          Effect.gen(function* () {
            const routed = yield* resolveRoutableSession({
              threadId: input.threadId,
              operation: "EngineService.rollbackConversation",
              // Restart-based rollback only needs the persisted binding and must
              // not replay the stale native cursor merely to close it again.
              allowRecovery: false,
            });
            if (routed.adapter.capabilities.conversationRollback === "restart-session") {
              // Some engine protocols can resume but cannot rewind. Clear their
              // native cursor so edit-and-resend cannot continue from stale history;
              // EngineCommandReactor bootstraps the retained transcript next turn.
              yield* clearSessionResumeCursor({ threadId: input.threadId });
            } else {
              const active = routed.isActive
                ? routed
                : yield* resolveRoutableSession({
                    threadId: input.threadId,
                    operation: "EngineService.rollbackConversation",
                    allowRecovery: true,
                  });
              yield* active.adapter.rollbackThread(input.threadId, input.numTurns);
            }
          }),
          { scheduleIdleStopOnSuccess: true },
        );
      });

    const compactThread: EngineServiceShape["compactThread"] = (rawInput) =>
      Effect.gen(function* () {
        const input = yield* decodeInputOrValidationError({
          operation: "EngineService.compactThread",
          schema: EngineCompactThreadInput,
          payload: rawInput,
        });
        yield* runIdleSensitiveProviderWork(
          input.threadId,
          Effect.gen(function* () {
            const routed = yield* resolveRoutableSession({
              threadId: input.threadId,
              operation: "EngineService.compactThread",
              allowRecovery: true,
            });
            if (!routed.adapter.compactThread) {
              return yield* toValidationError(
                "EngineService.compactThread",
                `Context compaction is unavailable for engine '${routed.adapter.engine}'.`,
              );
            }
            yield* routed.adapter.compactThread(input.threadId);
            const binding = Option.getOrUndefined(yield* directory.getBinding(input.threadId));
            if (binding) {
              yield* directory.upsert({
                threadId: input.threadId,
                engine: binding.engine,
                ...(binding.adapterKey !== undefined ? { adapterKey: binding.adapterKey } : {}),
                ...(binding.runtimeMode !== undefined ? { runtimeMode: binding.runtimeMode } : {}),
                status: "stopped",
                resumeCursor: binding.resumeCursor,
                runtimePayload: {
                  ...runtimePayloadRecord(binding.runtimePayload),
                  activeTurnId: null,
                  lastRuntimeEvent: "engine.compactThread",
                  lastRuntimeEventAt: new Date().toISOString(),
                },
              });
            }
          }),
          { scheduleIdleStopOnSuccess: true },
        );
      });

    const runStopAll = () =>
      Effect.gen(function* () {
        const stoppedAt = new Date().toISOString();
        const threadIds = yield* directory.listThreadIds();
        const activeSessionByThreadId = new Map(
          (yield* Effect.forEach(adapters, (adapter) => adapter.listSessions()))
            .flatMap((sessions) => sessions)
            .map((session) => [session.threadId, session] as const),
        );
        yield* Effect.forEach(
          new Set([...threadIds, ...activeSessionByThreadId.keys()]),
          (threadId) =>
            markThreadStopped(threadId, stoppedAt, activeSessionByThreadId.get(threadId)),
        );
        yield* Effect.forEach(adapters, (adapter) => adapter.stopAll());
      });

    const awaitRuntimeEventFanoutDrained: Effect.Effect<void> = Effect.suspend(() =>
      PubSub.isEmpty(runtimeEventPubSub).pipe(
        Effect.flatMap((empty) =>
          empty
            ? Effect.void
            : Effect.yieldNow.pipe(Effect.andThen(awaitRuntimeEventFanoutDrained)),
        ),
      ),
    );

    const closeRuntimeEvents = yield* Effect.cached(
      Effect.uninterruptible(
        Effect.sync(() => {
          for (const timer of runtimeIdleTimers.values()) {
            clearTimeout(timer);
          }
          runtimeIdleTimers.clear();
          for (const threadId of new Set([
            ...liveRuntimeTaskIds.keys(),
            ...runtimeTaskSettlementWaiters.keys(),
          ])) {
            clearLiveRuntimeTasks(threadId);
          }
          runtimeIdleGenerations.clear();
          runtimeIdleStopsInFlight.clear();
          stopIdleRuntimeSession = null;
        }).pipe(
          Effect.andThen(
            runStopAll().pipe(
              Effect.catchCause((cause) =>
                Effect.logWarning("failed to stop engine sessions", {
                  cause: Cause.pretty(cause),
                }),
              ),
            ),
          ),
          // Keep subscriptions alive until adapters have emitted terminal
          // events. Closing waits for an in-flight canonical event because its
          // persistence and publication section is uninterruptible.
          Effect.andThen(Scope.close(runtimeEventProducerScope, Exit.void)),
          // Downstream subscribers transfer every published event into their
          // own drainable workers before the publication owner is shut down.
          Effect.andThen(awaitRuntimeEventFanoutDrained),
          Effect.andThen(PubSub.shutdown(runtimeEventPubSub)),
        ),
      ),
    );

    yield* Effect.addFinalizer(() => closeRuntimeEvents);

    return {
      startSession,
      forkThread,
      sendTurn,
      steerTurn,
      startReview,
      interruptTurn,
      stopTask,
      backgroundTask,
      steerSubagent,
      respondToRequest,
      respondToUserInput,
      stopSession,
      reloadSessionResources,
      stopRuntimeSession,
      hasLiveRuntimeTasks,
      clearSessionResumeCursor,
      listSessions,
      listSessionsStrict,
      withModelServiceMutationFence: (serviceId, effect) =>
        modelServiceAdmissionLock.withLock(serviceId, effect),
      withRuntimeEventProjectionLease: (threadId, effect) =>
        lifecycle.runCurrent(threadId, () => effect),
      getCapabilities,
      rollbackConversation,
      compactThread,
      closeRuntimeEvents,
      getRuntimeEventPumpHealth: () => Effect.sync(runtimeEventPumpHealth.snapshot),
      // Each access creates a fresh PubSub subscription so that multiple
      // consumers (EngineRuntimeIngestion, CheckpointReactor, etc.) each
      // independently receive all runtime events.
      get streamEvents(): EngineServiceShape["streamEvents"] {
        return Stream.fromPubSub(runtimeEventPubSub).pipe(Stream.map(({ event }) => event));
      },
      ...(options?.persistRuntimeEvent === undefined
        ? {}
        : {
            get streamPersistedEvents(): NonNullable<EngineServiceShape["streamPersistedEvents"]> {
              return Stream.fromPubSub(runtimeEventPubSub).pipe(
                Stream.filter(
                  (
                    published,
                  ): published is PublishedRuntimeEvent & {
                    readonly persisted: PersistedEngineRuntimeEvent;
                  } => published.persisted !== undefined,
                ),
                Stream.map(({ persisted }) => persisted),
              );
            },
          }),
    } satisfies EngineServiceShape;
  });

export const EngineServiceLive = Layer.effect(EngineService, makeEngineService());

export function makeEngineServiceLive(options?: EngineServiceLiveOptions) {
  return Layer.effect(EngineService, makeEngineService(options));
}

/** Production engine service: journal each canonical event before live fan-out. */
export function makeDurableEngineServiceLive(options?: EngineServiceLiveOptions) {
  return Layer.effect(
    EngineService,
    Effect.gen(function* () {
      const runtimeEvents = yield* EngineRuntimeEventRepository;
      return yield* makeEngineService({
        ...options,
        persistRuntimeEvent: (event) => runtimeEvents.append(event),
        quarantineRuntimeEvent: (event, cause) =>
          runtimeEvents
            .append({
              type: "runtime.warning",
              eventId: EventId.makeUnsafe(randomUUID()),
              engine: event.engine,
              threadId: event.threadId,
              createdAt: new Date().toISOString(),
              ...(event.turnId !== undefined ? { turnId: event.turnId } : {}),
              ...(event.lifecycleGeneration !== undefined
                ? { lifecycleGeneration: event.lifecycleGeneration }
                : {}),
              payload: {
                message: `Quarantined engine runtime event '${event.type}' after a permanent journal failure.`,
                detail: {
                  originalEventId: event.eventId,
                  originalEventType: event.type,
                  ...summarizeProviderRuntimeQuarantineCause(cause),
                },
              },
            })
            .pipe(Effect.asVoid),
      });
    }),
  );
}
