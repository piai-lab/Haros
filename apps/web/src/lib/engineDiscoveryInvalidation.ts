// FILE: engineDiscoveryInvalidation.ts
// Purpose: Keeps engine-discovery cache invalidation tied to meaningful engine changes.
// Layer: Web UI engine discovery
// Exports: per-engine fingerprints and exact changed-engine detection

import { ENGINE_KINDS, type EngineKind, type ServerProviderStatus } from "@harnessos/contracts";

type EngineModelDiscoveryFingerprintEntry = readonly [
  engine: ServerProviderStatus["engine"],
  status: ServerProviderStatus["status"],
  available: boolean,
  authStatus: ServerProviderStatus["authStatus"],
  authType: string | null,
  authLabel: string | null,
  version: string | null,
];

export type EngineModelDiscoveryInvalidationFingerprints = Partial<Record<EngineKind, string>>;

export function providerModelDiscoveryInvalidationFingerprints(
  engines: ReadonlyArray<ServerProviderStatus>,
): EngineModelDiscoveryInvalidationFingerprints {
  const result: EngineModelDiscoveryInvalidationFingerprints = {};
  for (const engine of engines) {
    const entry: EngineModelDiscoveryFingerprintEntry = [
      engine.engine,
      engine.status,
      engine.available,
      engine.authStatus,
      engine.authType ?? null,
      engine.authLabel ?? null,
      engine.version ?? null,
    ];
    result[engine.engine] = JSON.stringify(entry);
  }
  return result;
}

export function changedProviderModelDiscoveryProviders(
  previous: EngineModelDiscoveryInvalidationFingerprints,
  next: EngineModelDiscoveryInvalidationFingerprints,
): EngineKind[] {
  return ENGINE_KINDS.filter((engine) => previous[engine] !== next[engine]);
}
