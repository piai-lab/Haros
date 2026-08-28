/**
 * EngineHealth - Engine readiness snapshot service.
 *
 * Owns engine health checks, cache-backed snapshots, and change streaming
 * for transport layers that need engine install/auth status.
 *
 * @module EngineHealth
 */
import type {
  ServerProviderStatus,
  ServerEngineUpdateInput,
  ServerEngineUpdateResult,
  ServerEngineUpdateError,
} from "@harnessos/contracts";
import { ServiceMap } from "effect";
import type { Effect, Stream } from "effect";

export interface EngineHealthShape {
  /**
   * Read the latest engine health statuses.
   */
  readonly getStatuses: Effect.Effect<ReadonlyArray<ServerProviderStatus>>;

  /**
   * Force a foreground refresh of engine health snapshots.
   */
  readonly refresh: Effect.Effect<ReadonlyArray<ServerProviderStatus>>;

  /**
   * Read a bounded local-only presence projection for first-run eligibility.
   * This must not spawn engines, load extensions, start sessions, or use the network.
   */
  readonly getPassivePresence: Effect.Effect<ReadonlyArray<ServerProviderStatus["engine"]>>;

  /**
   * Run the allowlisted update command for a engine and publish the
   * resulting engine snapshots.
   */
  readonly updateEngine: (
    input: ServerEngineUpdateInput,
  ) => Effect.Effect<ServerEngineUpdateResult, ServerEngineUpdateError>;

  /**
   * Stream of engine snapshot changes for config consumers.
   */
  readonly streamChanges: Stream.Stream<ReadonlyArray<ServerProviderStatus>>;
}

export class EngineHealth extends ServiceMap.Service<EngineHealth, EngineHealthShape>()(
  "harnessos/provider/Services/EngineHealth",
) {}
