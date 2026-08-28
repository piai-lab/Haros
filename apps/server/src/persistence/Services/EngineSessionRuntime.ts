/**
 * EngineSessionRuntimeRepository - Repository interface for engine runtime sessions.
 *
 * Owns persistence operations for engine runtime metadata and resume cursors.
 *
 * @module EngineSessionRuntimeRepository
 */
import {
  IsoDateTime,
  EngineSessionRuntimeStatus,
  RuntimeMode,
  ThreadId,
} from "@harnessos/contracts";
import { Option, Schema, ServiceMap } from "effect";
import type { Effect } from "effect";

import type { EngineSessionRuntimeRepositoryError } from "../Errors.ts";

export const EngineSessionRuntime = Schema.Struct({
  threadId: ThreadId,
  providerName: Schema.String,
  adapterKey: Schema.String,
  runtimeMode: RuntimeMode,
  status: EngineSessionRuntimeStatus,
  lifecycleGeneration: Schema.String,
  lastSeenAt: IsoDateTime,
  resumeCursor: Schema.NullOr(Schema.Unknown),
  runtimePayload: Schema.NullOr(Schema.Unknown),
});
export type EngineSessionRuntime = typeof EngineSessionRuntime.Type;

export const GetProviderSessionRuntimeInput = Schema.Struct({ threadId: ThreadId });
export type GetProviderSessionRuntimeInput = typeof GetProviderSessionRuntimeInput.Type;

export const DeleteProviderSessionRuntimeInput = Schema.Struct({ threadId: ThreadId });
export type DeleteProviderSessionRuntimeInput = typeof DeleteProviderSessionRuntimeInput.Type;

/**
 * EngineSessionRuntimeRepositoryShape - Service API for engine runtime records.
 */
export interface EngineSessionRuntimeRepositoryShape {
  /**
   * Insert or replace a engine runtime row.
   *
   * Upserts by canonical `threadId`, including JSON payload/cursor fields.
   */
  readonly upsert: (
    runtime: EngineSessionRuntime,
  ) => Effect.Effect<void, EngineSessionRuntimeRepositoryError>;

  /**
   * Read engine runtime state by canonical thread id.
   */
  readonly getByThreadId: (
    input: GetProviderSessionRuntimeInput,
  ) => Effect.Effect<Option.Option<EngineSessionRuntime>, EngineSessionRuntimeRepositoryError>;

  /**
   * List all engine runtime rows.
   *
   * Returned in ascending last-seen order.
   */
  readonly list: () => Effect.Effect<
    ReadonlyArray<EngineSessionRuntime>,
    EngineSessionRuntimeRepositoryError
  >;

  /**
   * Delete engine runtime state by canonical thread id.
   */
  readonly deleteByThreadId: (
    input: DeleteProviderSessionRuntimeInput,
  ) => Effect.Effect<void, EngineSessionRuntimeRepositoryError>;
}

/**
 * EngineSessionRuntimeRepository - Service tag for engine runtime persistence.
 */
export class EngineSessionRuntimeRepository extends ServiceMap.Service<
  EngineSessionRuntimeRepository,
  EngineSessionRuntimeRepositoryShape
>()("harnessos/persistence/Services/EngineSessionRuntime/EngineSessionRuntimeRepository") {}
