/**
 * EngineAdapterRegistry - Lookup boundary for engine adapter implementations.
 *
 * Maps a engine kind to the concrete adapter service (Codex, Claude, etc).
 * It does not own session lifecycle or routing rules; `EngineService` uses
 * this registry together with `EngineSessionDirectory`.
 *
 * @module EngineAdapterRegistry
 */
import type { EngineKind } from "@harnessos/contracts";
import { ServiceMap } from "effect";
import type { Effect } from "effect";

import type { EngineAdapterError, EngineUnsupportedError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

/**
 * EngineAdapterRegistryShape - Service API for adapter lookup by engine kind.
 */
export interface EngineAdapterRegistryShape {
  /**
   * Resolve the adapter for a engine kind.
   */
  readonly getByEngine: (
    engine: EngineKind,
  ) => Effect.Effect<EngineAdapterShape<EngineAdapterError>, EngineUnsupportedError>;

  /**
   * List engine kinds currently registered.
   */
  readonly listEngines: () => Effect.Effect<ReadonlyArray<EngineKind>>;
}

/**
 * EngineAdapterRegistry - Service tag for engine adapter lookup.
 */
export class EngineAdapterRegistry extends ServiceMap.Service<
  EngineAdapterRegistry,
  EngineAdapterRegistryShape
>()("harnessos/engine/Services/EngineAdapterRegistry") {}

// Dummy comment for workflow testing.
