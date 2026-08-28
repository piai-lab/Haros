import type { ProviderKind, ServerProviderStatus } from "@harnessos/contracts";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { ProviderUnsupportedError } from "../Errors.ts";
import { providerExecutionStructure } from "../providerExecutionStructure.ts";
import type { ProviderAdapterShape } from "../Services/ProviderAdapter.ts";
import {
  ProviderAdapterRegistry,
  type ProviderAdapterRegistryShape,
} from "../Services/ProviderAdapterRegistry.ts";
import { ProviderExecutionCapabilities } from "../Services/ProviderExecutionCapabilities.ts";
import { ProviderHealth, type ProviderHealthShape } from "../Services/ProviderHealth.ts";
import { ProviderExecutionCapabilitiesLive } from "./ProviderExecutionCapabilities.ts";

const codexStatus: ServerProviderStatus = {
  provider: "codex",
  status: "ready",
  available: true,
  authStatus: "authenticated",
  supportsAutoRuntimeMode: true,
  checkedAt: "2026-08-25T00:00:00.000Z",
};

function makeLayer(registered: ReadonlySet<ProviderKind>) {
  const registry: ProviderAdapterRegistryShape = {
    getByProvider: (provider) =>
      registered.has(provider)
        ? Effect.succeed({
            provider,
            capabilities: providerExecutionStructure(provider),
          } as unknown as ProviderAdapterShape<never>)
        : Effect.fail(new ProviderUnsupportedError({ provider })),
    listProviders: () => Effect.succeed([...registered]),
  };
  const health = {
    getStatuses: Effect.succeed([codexStatus]),
  } as unknown as ProviderHealthShape;
  return ProviderExecutionCapabilitiesLive.pipe(
    Layer.provide(Layer.succeed(ProviderAdapterRegistry, registry)),
    Layer.provide(Layer.succeed(ProviderHealth, health)),
  );
}

describe("ProviderExecutionCapabilities", () => {
  it("projects registered adapter structure with current health", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ProviderExecutionCapabilities;
        return yield* service.get({ provider: "codex", model: "gpt-test" });
      }).pipe(Effect.provide(makeLayer(new Set(["codex"])))),
    );

    expect(result.runtimeModes.auto.status).toBe("ready");
    expect(result.supportsNativeTurnSteering).toBe(true);
  });

  it("fails closed when canonical identity has no registered adapter", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ProviderExecutionCapabilities;
        return yield* service.get({ provider: "codex", model: "gpt-test" });
      }).pipe(Effect.provide(makeLayer(new Set()))),
    );

    expect(result.runtimeModes.auto).toMatchObject({
      structurallySupported: false,
      status: "unavailable",
      reason: "adapter-unregistered",
    });
  });
});
