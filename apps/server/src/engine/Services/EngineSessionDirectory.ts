import type {
  EngineKind,
  EngineSessionRuntimeStatus,
  RuntimeMode,
  ThreadId,
} from "@harnessos/contracts";
import { Option, ServiceMap } from "effect";
import type { Effect } from "effect";

import type { EngineSessionDirectoryPersistenceError, EngineValidationError } from "../Errors.ts";

export interface EngineRuntimeBinding {
  readonly threadId: ThreadId;
  readonly engine: EngineKind;
  readonly adapterKey?: string;
  readonly status?: EngineSessionRuntimeStatus;
  readonly lifecycleGeneration?: string;
  readonly lastSeenAt?: string;
  readonly resumeCursor?: unknown | null;
  readonly runtimePayload?: unknown | null;
  readonly runtimeMode?: RuntimeMode;
}

export type EngineSessionDirectoryReadError = EngineSessionDirectoryPersistenceError;

export type EngineSessionDirectoryWriteError =
  | EngineValidationError
  | EngineSessionDirectoryPersistenceError;

export interface EngineSessionDirectoryShape {
  readonly upsert: (
    binding: EngineRuntimeBinding,
  ) => Effect.Effect<void, EngineSessionDirectoryWriteError>;

  /** Atomically replaces the complete row without merging runtime payload. */
  readonly replace: (
    binding: EngineRuntimeBinding,
  ) => Effect.Effect<void, EngineSessionDirectoryWriteError>;

  readonly getEngine: (
    threadId: ThreadId,
  ) => Effect.Effect<EngineKind, EngineSessionDirectoryReadError>;

  readonly getBinding: (
    threadId: ThreadId,
  ) => Effect.Effect<Option.Option<EngineRuntimeBinding>, EngineSessionDirectoryReadError>;

  readonly remove: (
    threadId: ThreadId,
  ) => Effect.Effect<void, EngineSessionDirectoryPersistenceError>;

  readonly listThreadIds: () => Effect.Effect<
    ReadonlyArray<ThreadId>,
    EngineSessionDirectoryPersistenceError
  >;

  readonly listBindings: () => Effect.Effect<
    ReadonlyArray<EngineRuntimeBinding>,
    EngineSessionDirectoryPersistenceError
  >;
}

export class EngineSessionDirectory extends ServiceMap.Service<
  EngineSessionDirectory,
  EngineSessionDirectoryShape
>()("harnessos/engine/Services/EngineSessionDirectory") {}
