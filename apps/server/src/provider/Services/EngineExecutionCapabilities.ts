import type {
  EngineSelection,
  EngineExecutionCapabilities as EngineExecutionCapabilitiesSnapshot,
} from "@harnessos/contracts";
import { ServiceMap } from "effect";
import type { Effect } from "effect";

export interface EngineExecutionCapabilitiesShape {
  readonly get: (
    engineSelection: EngineSelection,
  ) => Effect.Effect<EngineExecutionCapabilitiesSnapshot>;
}

/**
 * Read-only composition boundary for registered adapter structure, model
 * capability and current credential-blind runtime health. It owns no cache or
 * lifecycle beyond its existing Registry and EngineHealth dependencies.
 */
export class EngineExecutionCapabilities extends ServiceMap.Service<
  EngineExecutionCapabilities,
  EngineExecutionCapabilitiesShape
>()("harnessos/provider/Services/EngineExecutionCapabilities") {}
