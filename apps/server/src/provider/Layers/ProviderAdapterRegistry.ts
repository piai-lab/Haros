/**
 * ProviderAdapterRegistryLive - In-memory provider adapter lookup layer.
 *
 * Binds provider kinds (codex/claudeAgent/...) to concrete adapter services.
 * This layer only performs adapter lookup; it does not route session-scoped
 * calls or own provider lifecycle workflows.
 *
 * @module ProviderAdapterRegistryLive
 */
import { Effect, Layer } from "effect";
import { ENGINE_DESCRIPTORS } from "@harnessos/shared/engineMetadata";

import { ProviderUnsupportedError, type ProviderAdapterError } from "../Errors.ts";
import { assertProviderAdapterConformance } from "../providerAdapterConformance.ts";
import type { ProviderAdapterShape } from "../Services/ProviderAdapter.ts";
import {
  ProviderAdapterRegistry,
  type ProviderAdapterRegistryShape,
} from "../Services/ProviderAdapterRegistry.ts";
import { ClaudeAdapter } from "../Services/ClaudeAdapter.ts";
import { CodexAdapter } from "../Services/CodexAdapter.ts";
import { CursorAdapter } from "../Services/CursorAdapter.ts";
import { DroidAdapter } from "../Services/DroidAdapter.ts";
import { GrokAdapter } from "../Services/GrokAdapter.ts";
import { KiloAdapter } from "../Services/KiloAdapter.ts";
import { OpenCodeAdapter } from "../Services/OpenCodeAdapter.ts";
import { PiAdapter } from "../Services/PiAdapter.ts";
import { OmniMindAgentAdapter } from "../Services/OmniMindAgentAdapter.ts";
import { AntigravityAdapter } from "../Services/AntigravityAdapter.ts";

export interface ProviderAdapterRegistryLiveOptions {
  readonly adapters?: ReadonlyArray<ProviderAdapterShape<ProviderAdapterError>>;
}

const makeProviderAdapterRegistry = (options?: ProviderAdapterRegistryLiveOptions) =>
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
            yield* OmniMindAgentAdapter,
            yield* PiAdapter,
          ];

    for (const adapter of adapters) {
      assertProviderAdapterConformance(adapter);
    }

    const byProvider = new Map(adapters.map((adapter) => [adapter.provider, adapter]));
    if (byProvider.size !== adapters.length) {
      return yield* Effect.die(new Error("Duplicate Engine adapter registration"));
    }

    const registeredProviders = ENGINE_DESCRIPTORS.map((descriptor) => descriptor.kind).filter(
      (engine) => byProvider.has(engine),
    );
    if (
      options?.adapters === undefined &&
      registeredProviders.length !== ENGINE_DESCRIPTORS.length
    ) {
      const missing = ENGINE_DESCRIPTORS.filter(
        (descriptor) => !byProvider.has(descriptor.kind),
      ).map((descriptor) => descriptor.kind);
      return yield* Effect.die(new Error(`Missing Engine adapters: ${missing.join(", ")}`));
    }

    const getByProvider: ProviderAdapterRegistryShape["getByProvider"] = (provider) => {
      const adapter = byProvider.get(provider);
      if (!adapter) {
        return Effect.fail(new ProviderUnsupportedError({ provider }));
      }
      return Effect.succeed(adapter);
    };

    const listProviders: ProviderAdapterRegistryShape["listProviders"] = () =>
      Effect.succeed(registeredProviders);

    return {
      getByProvider,
      listProviders,
    } satisfies ProviderAdapterRegistryShape;
  });

export const ProviderAdapterRegistryLive = Layer.effect(
  ProviderAdapterRegistry,
  makeProviderAdapterRegistry(),
);
