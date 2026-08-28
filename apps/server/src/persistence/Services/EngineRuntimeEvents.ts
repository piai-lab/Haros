import type { EngineRuntimeEvent } from "@harnessos/contracts";
import { ServiceMap } from "effect";
import type { Effect } from "effect";

import type { PersistenceDecodeError, PersistenceSqlError } from "../Errors.ts";

export const ENGINE_RUNTIME_INGESTION_CONSUMER = "engine-runtime-ingestion.v1";
export const ENGINE_RUNTIME_EVENT_MAX_BYTES = 2 * 1024 * 1024;
export const ENGINE_RUNTIME_EVENT_RETAIN_ACCEPTED = 512;

export interface PersistedEngineRuntimeEvent {
  readonly sequence: number;
  readonly event: EngineRuntimeEvent;
}

export type EngineRuntimeEventRepositoryError = PersistenceSqlError | PersistenceDecodeError;

export interface EngineRuntimeEventRepositoryShape {
  readonly append: (
    event: EngineRuntimeEvent,
  ) => Effect.Effect<PersistedEngineRuntimeEvent, EngineRuntimeEventRepositoryError>;
  readonly getHighWaterSequence: Effect.Effect<number, PersistenceSqlError>;
  readonly readAfter: (input: {
    readonly sequenceExclusive: number;
    readonly throughSequenceInclusive: number;
    readonly limit: number;
  }) => Effect.Effect<
    ReadonlyArray<PersistedEngineRuntimeEvent>,
    EngineRuntimeEventRepositoryError
  >;
  readonly getThreadCoverage: (threadId: string) => Effect.Effect<
    {
      readonly retainedCount: number;
      readonly oldestSequence: number | null;
      readonly highWaterSequence: number;
    },
    PersistenceSqlError
  >;
  readonly readThreadEvents: (input: {
    readonly threadId: string;
    readonly throughSequenceInclusive: number;
    readonly beforeSequenceExclusive?: number;
    readonly limit: number;
    readonly turnId?: string;
    readonly eventTypes?: ReadonlyArray<string>;
  }) => Effect.Effect<
    ReadonlyArray<PersistedEngineRuntimeEvent>,
    EngineRuntimeEventRepositoryError
  >;
  readonly readAcceptedOpenTurnEvents: (input: {
    readonly consumerName: string;
    readonly sequenceExclusive: number;
    readonly limit: number;
  }) => Effect.Effect<
    ReadonlyArray<PersistedEngineRuntimeEvent>,
    EngineRuntimeEventRepositoryError
  >;
  readonly pruneSettledOpenTurns: Effect.Effect<void, PersistenceSqlError>;
  readonly getConsumerCursor: (
    consumerName: string,
  ) => Effect.Effect<number, EngineRuntimeEventRepositoryError>;
  readonly hasPendingEventsForThreads: (input: {
    readonly consumerName: string;
    readonly threadIds: ReadonlyArray<string>;
  }) => Effect.Effect<boolean, EngineRuntimeEventRepositoryError>;
  readonly advanceConsumerCursor: (input: {
    readonly consumerName: string;
    readonly eventSequence: number;
    readonly updatedAt: string;
  }) => Effect.Effect<boolean, PersistenceSqlError>;
}

export class EngineRuntimeEventRepository extends ServiceMap.Service<
  EngineRuntimeEventRepository,
  EngineRuntimeEventRepositoryShape
>()("harnessos/persistence/Services/EngineRuntimeEvents/EngineRuntimeEventRepository") {}
