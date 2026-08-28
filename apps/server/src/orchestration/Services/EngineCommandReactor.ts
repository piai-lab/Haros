/**
 * EngineCommandReactor - Engine command reaction service interface.
 *
 * Owns background workers that react to orchestration intent events and
 * dispatch engine-side command execution.
 *
 * @module EngineCommandReactor
 */
import { ServiceMap } from "effect";
import type { Effect, Scope } from "effect";

import type { ThreadId } from "@harnessos/contracts";
import type {
  EngineBlockingDeliveryEvidence,
  EngineDeliveryReconciliationOutcome,
} from "../../persistence/Services/OrchestrationEventDeliveries.ts";

export interface EngineDeliveryReconciliationResult {
  readonly eventSequence: number;
  readonly threadId: ThreadId;
  readonly outcome: EngineDeliveryReconciliationOutcome;
  readonly state: "retry" | "succeeded" | "dead" | "uncertain";
  readonly reconciledAt: string;
}

/**
 * EngineCommandReactorShape - Service API for engine command reactors.
 */
export interface EngineCommandReactorShape {
  /**
   * Start reacting to engine-intent orchestration domain events.
   *
   * The returned effect must be run in a scope so all worker fibers can be
   * finalized on shutdown.
   *
   * Filters orchestration domain events to engine-intent types before
   * processing.
   */
  readonly start: Effect.Effect<void, never, Scope.Scope>;

  /**
   * Resolves when the internal processing queue is empty and idle.
   * Intended for test use to replace timing-sensitive sleeps.
   */
  readonly drain: Effect.Effect<void>;

  /** Re-runs durable queued-turn promotion after restart reconciliation clears stale turns. */
  readonly reconcileQueuedTurns: Effect.Effect<void>;

  readonly listBlockingDeliveries: (input: {
    readonly threadId?: string | undefined;
    readonly limit: number;
  }) => Effect.Effect<ReadonlyArray<EngineBlockingDeliveryEvidence>, unknown>;

  readonly reconcileDelivery: (input: {
    readonly eventSequence: number;
    readonly threadId: ThreadId;
    readonly expectedState: "dead" | "uncertain";
    readonly outcome: EngineDeliveryReconciliationOutcome;
    readonly reconciledBy: string;
    readonly note?: string | undefined;
  }) => Effect.Effect<EngineDeliveryReconciliationResult | null, unknown>;
}

/**
 * EngineCommandReactor - Service tag for engine command reaction workers.
 */
export class EngineCommandReactor extends ServiceMap.Service<
  EngineCommandReactor,
  EngineCommandReactorShape
>()("harnessos/orchestration/Services/EngineCommandReactor") {}
