/**
 * EngineRuntimeIngestionService - Engine runtime ingestion service interface.
 *
 * Owns background workers that consume engine runtime streams and emit
 * orchestration commands/events.
 *
 * @module EngineRuntimeIngestionService
 */
import { ServiceMap } from "effect";
import type { Effect, Scope } from "effect";

/**
 * EngineRuntimeIngestionShape - Service API for runtime ingestion lifecycle.
 */
export interface EngineRuntimeIngestionShape {
  /**
   * Start ingesting engine runtime events into orchestration commands.
   *
   * The returned effect must be run in a scope so all worker fibers can be
   * finalized on shutdown.
   *
   * Uses an internal queue and continues after non-interrupt failures by
   * logging warnings.
   */
  readonly start: Effect.Effect<void, never, Scope.Scope>;

  /**
   * Drops replay-ledger rows whose durable turn projection is already terminal.
   * Startup reconciliation calls this after it closes process-orphaned turns.
   */
  readonly reconcileSettledOpenTurns: Effect.Effect<void>;

  /**
   * Resolves when the internal processing queue is empty and idle.
   * Intended for test use to replace timing-sensitive sleeps.
   */
  readonly drain: Effect.Effect<void>;
}

/**
 * EngineRuntimeIngestionService - Service tag for runtime ingestion workers.
 */
export class EngineRuntimeIngestionService extends ServiceMap.Service<
  EngineRuntimeIngestionService,
  EngineRuntimeIngestionShape
>()("harnessos/orchestration/Services/EngineRuntimeIngestion/EngineRuntimeIngestionService") {}
