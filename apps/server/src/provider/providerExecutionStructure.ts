import type { ProviderKind, RuntimeMode } from "@omnimind/contracts";

export interface ProviderExecutionStructure {
  readonly supportsTurnSteering: boolean;
  readonly supportedRuntimeModes: ReadonlySet<RuntimeMode>;
}

const defineStructure = (
  supportsTurnSteering: boolean,
  supportedRuntimeModes: readonly RuntimeMode[],
): ProviderExecutionStructure => ({
  supportsTurnSteering,
  supportedRuntimeModes: new Set(supportedRuntimeModes),
});

/**
 * Server-owned structural execution truth. Every live adapter consumes its own
 * entry, while projections and command admission read the same values. This is
 * deliberately limited to execution structure; health, models, credentials,
 * assets and presentation remain with their existing owners.
 */
export const PROVIDER_EXECUTION_STRUCTURE = {
  omnimind: defineStructure(true, ["full-access"]),
  codex: defineStructure(true, ["full-access", "auto", "approval-required"]),
  claudeAgent: defineStructure(true, ["full-access", "auto", "approval-required"]),
  cursor: defineStructure(false, ["full-access", "approval-required"]),
  antigravity: defineStructure(false, ["full-access"]),
  grok: defineStructure(false, ["full-access", "approval-required"]),
  droid: defineStructure(false, ["full-access", "approval-required"]),
  kilo: defineStructure(false, ["full-access", "approval-required"]),
  opencode: defineStructure(false, ["full-access", "approval-required"]),
  pi: defineStructure(true, ["full-access"]),
} as const satisfies Record<ProviderKind, ProviderExecutionStructure>;

export function providerExecutionStructure(provider: ProviderKind): ProviderExecutionStructure {
  return PROVIDER_EXECUTION_STRUCTURE[provider];
}
