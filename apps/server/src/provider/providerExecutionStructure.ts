import type { ProviderInteractionMode, ProviderKind, RuntimeMode } from "@omnimind/contracts";

export interface ProviderExecutionStructure {
  readonly supportsTurnSteering: boolean;
  readonly supportedRuntimeModes: ReadonlySet<RuntimeMode>;
  readonly supportedInteractionModes: ReadonlySet<ProviderInteractionMode>;
}

const defineStructure = (
  supportsTurnSteering: boolean,
  supportedRuntimeModes: readonly RuntimeMode[],
  supportedInteractionModes: readonly ProviderInteractionMode[],
): ProviderExecutionStructure => ({
  supportsTurnSteering,
  supportedRuntimeModes: new Set(supportedRuntimeModes),
  supportedInteractionModes: new Set(supportedInteractionModes),
});

const PRODUCT_INTERACTION_MODES = ["default", "plan", "debug"] as const;
const BASE_INTERACTION_MODES = ["default", "debug"] as const;

/**
 * Server-owned structural execution truth. Every live adapter consumes its own
 * entry, while projections and command admission read the same values. This is
 * deliberately limited to execution structure; health, models, credentials,
 * assets and presentation remain with their existing owners.
 */
export const PROVIDER_EXECUTION_STRUCTURE = {
  omnimind: defineStructure(true, ["full-access"], PRODUCT_INTERACTION_MODES),
  codex: defineStructure(true, ["full-access", "auto", "approval-required"], PRODUCT_INTERACTION_MODES),
  claudeAgent: defineStructure(true, ["full-access", "auto", "approval-required"], PRODUCT_INTERACTION_MODES),
  cursor: defineStructure(false, ["full-access", "approval-required"], PRODUCT_INTERACTION_MODES),
  antigravity: defineStructure(false, ["full-access"], BASE_INTERACTION_MODES),
  grok: defineStructure(false, ["full-access", "approval-required"], PRODUCT_INTERACTION_MODES),
  droid: defineStructure(false, ["full-access", "approval-required"], PRODUCT_INTERACTION_MODES),
  kilo: defineStructure(false, ["full-access", "approval-required"], PRODUCT_INTERACTION_MODES),
  opencode: defineStructure(false, ["full-access", "approval-required"], PRODUCT_INTERACTION_MODES),
  pi: defineStructure(true, ["full-access"], BASE_INTERACTION_MODES),
} as const satisfies Record<ProviderKind, ProviderExecutionStructure>;

export function providerExecutionStructure(provider: ProviderKind): ProviderExecutionStructure {
  return PROVIDER_EXECUTION_STRUCTURE[provider];
}
