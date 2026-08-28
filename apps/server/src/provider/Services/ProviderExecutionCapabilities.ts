import type {
  ModelSelection,
  ProviderExecutionCapabilities as ProviderExecutionCapabilitiesSnapshot,
} from "@harnessos/contracts";
import { ServiceMap } from "effect";
import type { Effect } from "effect";

export interface ProviderExecutionCapabilitiesShape {
  readonly get: (
    modelSelection: ModelSelection,
  ) => Effect.Effect<ProviderExecutionCapabilitiesSnapshot>;
}

/**
 * Read-only composition boundary for registered adapter structure, model
 * capability and current credential-blind runtime health. It owns no cache or
 * lifecycle beyond its existing Registry and ProviderHealth dependencies.
 */
export class ProviderExecutionCapabilities extends ServiceMap.Service<
  ProviderExecutionCapabilities,
  ProviderExecutionCapabilitiesShape
>()("omnimind/provider/Services/ProviderExecutionCapabilities") {}
