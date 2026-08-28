/**
 * EngineAdapterRegistryLive - In-memory engine adapter lookup layer.
 *
 * Binds engine kinds (codex/claudeAgent/...) to concrete adapter services.
 * This layer only performs adapter lookup; it does not route session-scoped
 * calls or own engine lifecycle workflows.
 *
 * @module EngineAdapterRegistryLive
 */
import { Effect, Layer } from "effect";
import { ENGINE_DESCRIPTORS } from "@harnessos/shared/engineMetadata";

import { EngineUnsupportedError, type EngineAdapterError } from "../Errors.ts";
import { assertEngineAdapterConformance } from "../engineAdapterConformance.ts";
import type { EngineAdapterShape } from "../Services/EngineAdapter.ts";
import {
  EngineAdapterRegistry,
  type EngineAdapterRegistryShape,
} from "../Services/EngineAdapterRegistry.ts";
import { ClaudeAdapter } from "../Services/ClaudeAdapter.ts";
import { CodexAdapter } from "../Services/CodexAdapter.ts";
import { CursorAdapter } from "../Services/CursorAdapter.ts";
import { DroidAdapter } from "../Services/DroidAdapter.ts";
import { GrokAdapter } from "../Services/GrokAdapter.ts";
import { KiloAdapter } from "../Services/KiloAdapter.ts";
import { OpenCodeAdapter } from "../Services/OpenCodeAdapter.ts";
import { PiAdapter } from "../Services/PiAdapter.ts";
import { OAAgentAdapter } from "../Services/OAAgentAdapter.ts";
import { AntigravityAdapter } from "../Services/AntigravityAdapter.ts";

export interface EngineAdapterRegistryLiveOptions {
  readonly adapters?: ReadonlyArray<EngineAdapterShape<EngineAdapterError>>;
}

const makeEngineAdapterRegistry = (options?: EngineAdapterRegistryLiveOptions) =>
  Effect.gen(function* () {
    const adapters =
      options?.adapters !== undefined
        ? options.adapters
        : [
            yield* CodexAdapter,
            yield* ClaudeAdapter,
            yield* CursorAdapter,
            yield* AntigravityAdapter,
            yield* GrokAdapter,
            yield* DroidAdapter,
            yield* KiloAdapter,
            yield* OpenCodeAdapter,
            yield* OAAgentAdapter,
            yield* PiAdapter,
          ];

    for (const adapter of adapters) {
      assertEngineAdapterConformance(adapter);
    }

    const byProvider = new Map(adapters.map((adapter) => [adapter.engine, adapter]));
    if (byProvider.size !== adapters.length) {
      return yield* Effect.die(new Error("Duplicate Engine adapter registration"));
    }

    const registeredEngines = ENGINE_DESCRIPTORS.map((descriptor) => descriptor.kind).filter(
      (engine) => byProvider.has(engine),
    );
    if (options?.adapters === undefined && registeredEngines.length !== ENGINE_DESCRIPTORS.length) {
      const missing = ENGINE_DESCRIPTORS.filter(
        (descriptor) => !byProvider.has(descriptor.kind),
      ).map((descriptor) => descriptor.kind);
      return yield* Effect.die(new Error(`Missing Engine adapters: ${missing.join(", ")}`));
    }

    const getByEngine: EngineAdapterRegistryShape["getByEngine"] = (engine) => {
      const adapter = byProvider.get(engine);
      if (!adapter) {
        return Effect.fail(new EngineUnsupportedError({ engine }));
      }
      return Effect.succeed(adapter);
    };

    const listEngines: EngineAdapterRegistryShape["listEngines"] = () =>
      Effect.succeed(registeredEngines);

    return {
      getByEngine,
      listEngines,
    } satisfies EngineAdapterRegistryShape;
  });

export const EngineAdapterRegistryLive = Layer.effect(
  EngineAdapterRegistry,
  makeEngineAdapterRegistry(),
);
