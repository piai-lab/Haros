import { Effect, Layer, Option } from "effect";

import { resolveProviderExecutionCapabilities } from "../executionCapabilityProjection.ts";
import { EngineAdapterRegistry } from "../Services/EngineAdapterRegistry.ts";
import {
  EngineExecutionCapabilities,
  type EngineExecutionCapabilitiesShape,
} from "../Services/EngineExecutionCapabilities.ts";
import { EngineHealth } from "../Services/EngineHealth.ts";

const make = Effect.gen(function* () {
  const registry = yield* EngineAdapterRegistry;
  const providerHealth = yield* EngineHealth;

  const get: EngineExecutionCapabilitiesShape["get"] = (engineSelection) =>
    Effect.gen(function* () {
      const adapter = yield* registry.getByEngine(engineSelection.engine).pipe(Effect.option);
      const statuses = yield* providerHealth.getStatuses;
      return resolveProviderExecutionCapabilities({
        engineSelection,
        adapterCapabilities: Option.isSome(adapter) ? adapter.value.capabilities : null,
        providerStatus: statuses.find((status) => status.engine === engineSelection.engine),
      });
    });

  return { get } satisfies EngineExecutionCapabilitiesShape;
});

export const EngineExecutionCapabilitiesLive = Layer.effect(EngineExecutionCapabilities, make);
