// FILE: providerDiscoveryInvalidation.ts
// Purpose: Keeps provider-discovery cache invalidation tied to meaningful provider changes.
// Layer: Web UI provider discovery
// Exports: per-provider fingerprints and exact changed-provider detection

import { ENGINE_KINDS, type EngineKind, type ServerProviderStatus } from "@harnessos/contracts";

type ProviderModelDiscoveryFingerprintEntry = readonly [
  provider: ServerProviderStatus["provider"],
  status: ServerProviderStatus["status"],
  available: boolean,
  authStatus: ServerProviderStatus["authStatus"],
  authType: string | null,
  authLabel: string | null,
  version: string | null,
];

export type ProviderModelDiscoveryInvalidationFingerprints = Partial<Record<EngineKind, string>>;

export function providerModelDiscoveryInvalidationFingerprints(
  providers: ReadonlyArray<ServerProviderStatus>,
): ProviderModelDiscoveryInvalidationFingerprints {
  const result: ProviderModelDiscoveryInvalidationFingerprints = {};
  for (const provider of providers) {
    const entry: ProviderModelDiscoveryFingerprintEntry = [
      provider.provider,
      provider.status,
      provider.available,
      provider.authStatus,
      provider.authType ?? null,
      provider.authLabel ?? null,
      provider.version ?? null,
    ];
    result[provider.provider] = JSON.stringify(entry);
  }
  return result;
}

export function changedProviderModelDiscoveryProviders(
  previous: ProviderModelDiscoveryInvalidationFingerprints,
  next: ProviderModelDiscoveryInvalidationFingerprints,
): EngineKind[] {
  return ENGINE_KINDS.filter((provider) => previous[provider] !== next[provider]);
}
