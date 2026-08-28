import {
  ENGINE_INTERACTION_MODES,
  type EngineInteractionMode,
  type EngineKind,
  type RuntimeMode,
} from "@harnessos/contracts";

export interface EngineExecutionStructure {
  readonly supportsTurnSteering: boolean;
  readonly supportedRuntimeModes: ReadonlySet<RuntimeMode>;
  readonly supportedInteractionModes: ReadonlySet<EngineInteractionMode>;
}

const defineStructure = (
  supportsTurnSteering: boolean,
  supportedRuntimeModes: readonly RuntimeMode[],
  supportedInteractionModes: readonly EngineInteractionMode[],
): EngineExecutionStructure => ({
  supportsTurnSteering,
  supportedRuntimeModes: new Set(supportedRuntimeModes),
  supportedInteractionModes: new Set(supportedInteractionModes),
});

const HOST_INTERACTION_MODES = ["default", "debug", "converge", "learn"] as const;
const PRODUCT_INTERACTION_MODES = ENGINE_INTERACTION_MODES;

/**
 * Server-owned structural execution truth. Every live adapter consumes its own
 * entry, while projections and command admission read the same values. This is
 * deliberately limited to execution structure; health, models, credentials,
 * assets and presentation remain with their existing owners.
 */
export const ENGINE_EXECUTION_STRUCTURE = {
  oa: defineStructure(true, ["full-access"], PRODUCT_INTERACTION_MODES),
  codex: defineStructure(
    true,
    ["full-access", "auto", "approval-required"],
    PRODUCT_INTERACTION_MODES,
  ),
  claude: defineStructure(
    true,
    ["full-access", "auto", "approval-required"],
    PRODUCT_INTERACTION_MODES,
  ),
  cursor: defineStructure(false, ["full-access", "approval-required"], PRODUCT_INTERACTION_MODES),
  antigravity: defineStructure(false, ["full-access"], HOST_INTERACTION_MODES),
  grok: defineStructure(false, ["full-access", "approval-required"], PRODUCT_INTERACTION_MODES),
  droid: defineStructure(false, ["full-access", "approval-required"], PRODUCT_INTERACTION_MODES),
  kilo: defineStructure(false, ["full-access", "approval-required"], PRODUCT_INTERACTION_MODES),
  opencode: defineStructure(false, ["full-access", "approval-required"], PRODUCT_INTERACTION_MODES),
  pi: defineStructure(true, ["full-access"], HOST_INTERACTION_MODES),
} as const satisfies Partial<Record<EngineKind, EngineExecutionStructure>>;

const EMPTY_ENGINE_EXECUTION_STRUCTURE = defineStructure(false, [], []);

export function engineExecutionStructure(engine: EngineKind): EngineExecutionStructure {
  return (
    (ENGINE_EXECUTION_STRUCTURE as Partial<Record<EngineKind, EngineExecutionStructure>>)[engine] ??
    EMPTY_ENGINE_EXECUTION_STRUCTURE
  );
}
