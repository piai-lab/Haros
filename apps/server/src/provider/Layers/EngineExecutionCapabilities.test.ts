import type { EngineKind, ServerProviderStatus } from "@harnessos/contracts";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { EngineUnsupportedError } from "../Errors.ts";
import { engineExecutionStructure } from "../engineExecutionStructure.ts";
import type { EngineAdapterShape } from "../Services/EngineAdapter.ts";
import {
  EngineAdapterRegistry,
  type EngineAdapterRegistryShape,
} from "../Services/EngineAdapterRegistry.ts";
import { EngineExecutionCapabilities } from "../Services/EngineExecutionCapabilities.ts";
import { EngineHealth, type EngineHealthShape } from "../Services/EngineHealth.ts";
import { EngineExecutionCapabilitiesLive } from "./EngineExecutionCapabilities.ts";

const codexStatus: ServerProviderStatus = {
  engine: "codex",
  status: "ready",
  available: true,
  authStatus: "authenticated",
  supportsAutoRuntimeMode: true,
  checkedAt: "2026-08-25T00:00:00.000Z",
};

function makeLayer(registered: ReadonlySet<EngineKind>) {
  const registry: EngineAdapterRegistryShape = {
    getByEngine: (engine) =>
      registered.has(engine)
        ? Effect.succeed({
            engine,
            capabilities: engineExecutionStructure(engine),
          } as unknown as EngineAdapterShape<never>)
        : Effect.fail(new EngineUnsupportedError({ engine })),
    listEngines: () => Effect.succeed([...registered]),
  };
  const health = {
    getStatuses: Effect.succeed([codexStatus]),
  } as unknown as EngineHealthShape;
  return EngineExecutionCapabilitiesLive.pipe(
    Layer.provide(Layer.succeed(EngineAdapterRegistry, registry)),
    Layer.provide(Layer.succeed(EngineHealth, health)),
  );
}

describe("EngineExecutionCapabilities", () => {
  it("projects registered adapter structure with current health", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* EngineExecutionCapabilities;
        return yield* service.get({ engine: "codex", model: "gpt-test" });
      }).pipe(Effect.provide(makeLayer(new Set(["codex"])))),
    );

    expect(result.runtimeModes.auto.status).toBe("ready");
    expect(result.supportsNativeTurnSteering).toBe(true);
  });

  it("fails closed when canonical identity has no registered adapter", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* EngineExecutionCapabilities;
        return yield* service.get({ engine: "codex", model: "gpt-test" });
      }).pipe(Effect.provide(makeLayer(new Set()))),
    );

    expect(result.runtimeModes.auto).toMatchObject({
      structurallySupported: false,
      status: "unavailable",
      reason: "adapter-unregistered",
    });
  });
});
