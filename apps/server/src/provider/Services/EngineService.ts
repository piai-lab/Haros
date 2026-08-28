/**
 * EngineService - Service interface for engine sessions, turns, and checkpoints.
 *
 * Acts as the cross-engine facade used by transports (WebSocket/RPC). It
 * resolves engine adapters through `EngineAdapterRegistry`, routes
 * session-scoped calls via `EngineSessionDirectory`, and exposes one unified
 * engine event stream to callers.
 *
 * Uses Effect `ServiceMap.Service` for dependency injection and returns typed
 * domain errors for validation, session, codex, and checkpoint workflows.
 *
 * @module EngineService
 */
import type {
  OmniMindEcosystemReloadInput,
  OmniMindEcosystemReloadResult,
  EngineBackgroundTaskInput,
  EngineForkThreadInput,
  EngineForkThreadResult,
  EngineInterruptTurnInput,
  EngineKind,
  EngineRespondToRequestInput,
  EngineRespondToUserInputInput,
  EngineRuntimeEvent,
  EngineSendTurnInput,
  EngineStartReviewInput,
  EngineSteerTurnInput,
  EngineSession,
  EngineSessionStartInput,
  EngineSteerSubagentInput,
  EngineStopSessionInput,
  EngineStopTaskInput,
  ThreadId,
  EngineTurnStartResult,
} from "@harnessos/contracts";
import { ServiceMap } from "effect";
import type { Effect, Stream } from "effect";
import type { ProductSurface } from "@harnessos/shared/productSurface";

import type { EngineServiceError } from "../Errors.ts";
import type { PersistedProviderRuntimeEvent } from "../../persistence/Services/EngineRuntimeEvents.ts";
import type { EngineAdapterCapabilities, EngineTurnDispatchContext } from "./EngineAdapter.ts";

export type EngineRuntimeEventPumpStatus = "starting" | "healthy" | "recovering" | "degraded";

export interface EngineRuntimeEventPumpHealth {
  readonly engine: EngineKind;
  readonly status: EngineRuntimeEventPumpStatus;
  readonly consecutiveFailures: number;
  readonly updatedAt: string;
  readonly lastEventAt?: string;
  readonly lastError?: string;
  readonly quarantinedEvents?: number;
  readonly lastQuarantinedEventId?: string;
  readonly lastQuarantinedAt?: string;
}

/**
 * EngineServiceShape - Service API for engine session and turn orchestration.
 */
export interface EngineServiceShape {
  /**
   * Start a engine session.
   */
  readonly startSession: (
    threadId: ThreadId,
    input: EngineSessionStartInput,
    context?: { readonly productSurface?: ProductSurface },
  ) => Effect.Effect<EngineSession, EngineServiceError>;

  /**
   * Send a engine turn.
   */
  readonly sendTurn: (
    input: EngineSendTurnInput,
    dispatchContext?: EngineTurnDispatchContext,
  ) => Effect.Effect<EngineTurnStartResult, EngineServiceError>;

  /**
   * Redirect an active engine turn toward a new prompt when supported.
   */
  readonly steerTurn: (
    input: EngineSteerTurnInput,
  ) => Effect.Effect<EngineTurnStartResult, EngineServiceError>;

  /**
   * Start a native engine review run when supported by the routed adapter.
   */
  readonly startReview: (
    input: EngineStartReviewInput,
  ) => Effect.Effect<EngineTurnStartResult, EngineServiceError>;

  /**
   * Fork a engine thread natively when the underlying adapter supports it.
   *
   * Returns a persisted engine-native fork binding when available, otherwise
   * `null` so callers can fall back to orchestration-only history.
   */
  readonly forkThread?: (
    input: EngineForkThreadInput,
  ) => Effect.Effect<EngineForkThreadResult | null, EngineServiceError>;

  /**
   * Interrupt a running engine turn.
   */
  readonly interruptTurn: (
    input: EngineInterruptTurnInput,
  ) => Effect.Effect<void, EngineServiceError>;

  /**
   * Stop a engine-native background task. No-op when the routed adapter does
   * not support task control.
   */
  readonly stopTask: (input: EngineStopTaskInput) => Effect.Effect<void, EngineServiceError>;

  /**
   * Move an in-flight foreground task to the background. No-op when the routed
   * adapter does not support task control.
   */
  readonly backgroundTask: (
    input: EngineBackgroundTaskInput,
  ) => Effect.Effect<void, EngineServiceError>;

  /**
   * Deliver a mid-task user message to a running subagent of an active session.
   */
  readonly steerSubagent: (
    input: EngineSteerSubagentInput,
  ) => Effect.Effect<void, EngineServiceError>;

  /**
   * Respond to a engine approval request.
   */
  readonly respondToRequest: (
    input: EngineRespondToRequestInput,
  ) => Effect.Effect<void, EngineServiceError>;

  /**
   * Respond to a engine structured user-input request.
   */
  readonly respondToUserInput: (
    input: EngineRespondToUserInputInput,
  ) => Effect.Effect<void, EngineServiceError>;

  /**
   * Stop a engine session.
   */
  readonly stopSession: (input: EngineStopSessionInput) => Effect.Effect<void, EngineServiceError>;

  /** Reload resources only on the exact live OmniMind Agent session. */
  readonly reloadSessionResources: (
    input: OmniMindEcosystemReloadInput,
  ) => Effect.Effect<OmniMindEcosystemReloadResult, EngineServiceError>;

  /**
   * Stop only the live adapter process/session while preserving the persisted
   * engine binding and resume cursor for a subsequent restart.
   */
  readonly stopRuntimeSession?: (input: {
    readonly threadId: ThreadId;
  }) => Effect.Effect<void, EngineServiceError>;

  /**
   * Whether engine-native background tasks are currently keeping the
   * thread's runtime alive. Restart-oriented recovery paths must check this
   * before stopRuntimeSession: killing the shared subprocess silently
   * terminates those tasks.
   */
  readonly hasLiveRuntimeTasks?: (input: { readonly threadId: ThreadId }) => Effect.Effect<boolean>;

  /**
   * Forget a stale engine-native resume cursor while preserving local routing
   * metadata such as engine options and runtime mode.
   */
  readonly clearSessionResumeCursor?: (input: {
    readonly threadId: ThreadId;
    /** Clear only persisted resume state without stopping a runtime that owns live tasks. */
    readonly preserveActiveRuntime?: boolean;
  }) => Effect.Effect<void, EngineServiceError>;

  /**
   * List authoritative active engine sessions. Persisted binding identity
   * filters stale or duplicate physical sessions left by failed replacement.
   */
  readonly listSessions: () => Effect.Effect<ReadonlyArray<EngineSession>>;

  /**
   * Read authoritative sessions without converting a directory read failure
   * into an empty list. Destructive consumers must use this strict form so an
   * unknown owner set cannot be mistaken for no live owner.
   */
  readonly listSessionsStrict: () => Effect.Effect<
    ReadonlyArray<EngineSession>,
    EngineServiceError
  >;

  /**
   * Serialize destructive model-service mutation with admission of a runtime
   * that selects that exact service. EngineService owns this fence because
   * it is the sole authority that can exclude new session starts while a
   * destructive consumer rechecks live ownership.
   */
  readonly withModelServiceMutationFence: <A, E, R>(
    serviceId: string,
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;

  /**
   * Keep one runtime event's binding validation and Product projection inside
   * the same per-thread lifecycle lease. A engine replacement cannot change
   * the authoritative binding after ingestion validates an event but before
   * its asynchronous projection finishes.
   */
  readonly withRuntimeEventProjectionLease: <A, E, R>(
    threadId: ThreadId,
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;

  /**
   * Read static capabilities for a engine adapter.
   */
  readonly getCapabilities: (
    engine: EngineKind,
  ) => Effect.Effect<EngineAdapterCapabilities, EngineServiceError>;

  /**
   * Roll back engine conversation state by a number of turns.
   */
  readonly rollbackConversation: (input: {
    readonly threadId: ThreadId;
    readonly numTurns: number;
  }) => Effect.Effect<void, EngineServiceError>;

  /**
   * Trigger engine-native context compaction for a thread.
   */
  readonly compactThread: (input: {
    readonly threadId: ThreadId;
  }) => Effect.Effect<void, EngineServiceError>;

  /**
   * Stop engine event producers, drain the lossless fan-out while subscribers
   * are still live, and then close the publication bus. Safe to call repeatedly.
   */
  readonly closeRuntimeEvents: Effect.Effect<void>;

  /**
   * Snapshot the supervised runtime-event pumps. The state is operational
   * evidence for reconciliation and diagnostics, not engine availability.
   */
  readonly getRuntimeEventPumpHealth?: () => Effect.Effect<
    ReadonlyArray<EngineRuntimeEventPumpHealth>
  >;

  /**
   * Canonical engine runtime event stream.
   *
   * Fan-out is owned by EngineService (not by a standalone event-bus service).
   */
  readonly streamEvents: Stream.Stream<EngineRuntimeEvent>;

  /**
   * Canonical runtime events paired with their already-durable journal sequence.
   *
   * Durable production services expose this stream so the ingestion worker can
   * drain through the accepted row without appending the same event again.
   * Lightweight/test services may omit it and retain the append-on-ingest path.
   */
  readonly streamPersistedEvents?: Stream.Stream<PersistedProviderRuntimeEvent>;
}

/**
 * EngineService - Service tag for engine orchestration.
 */
export class EngineService extends ServiceMap.Service<EngineService, EngineServiceShape>()(
  "harnessos/provider/Services/EngineService",
) {}
