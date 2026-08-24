import { Effect, Layer, Option } from "effect";

import { resolveProviderExecutionCapabilities } from "../executionCapabilityProjection.ts";
import { ProviderAdapterRegistry } from "../Services/ProviderAdapterRegistry.ts";
import {
  ProviderExecutionCapabilities,
  type ProviderExecutionCapabilitiesShape,
} from "../Services/ProviderExecutionCapabilities.ts";
import { ProviderHealth } from "../Services/ProviderHealth.ts";

const make = Effect.gen(function* () {
  const registry = yield* ProviderAdapterRegistry;
  const providerHealth = yield* ProviderHealth;

  const get: ProviderExecutionCapabilitiesShape["get"] = (modelSelection) =>
    Effect.gen(function* () {
      const adapter = yield* registry.getByProvider(modelSelection.provider).pipe(Effect.option);
      const statuses = yield* providerHealth.getStatuses;
      return resolveProviderExecutionCapabilities({
        modelSelection,
        adapterCapabilities: Option.isSome(adapter) ? adapter.value.capabilities : null,
        providerStatus: statuses.find((status) => status.provider === modelSelection.provider),
      });
    });

  return { get } satisfies ProviderExecutionCapabilitiesShape;
});

export const ProviderExecutionCapabilitiesLive = Layer.effect(ProviderExecutionCapabilities, make);
