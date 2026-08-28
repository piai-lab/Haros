// FILE: providerOrdering.ts
// Purpose: Keeps provider picker ordering stable across settings, search, and menus.
// Layer: Web settings utility
// Exports: default order, normalization, and order comparison helpers.

import type { EngineKind } from "@harnessos/contracts";
import { ENGINE_DESCRIPTORS } from "@harnessos/shared/engineMetadata";

export const DEFAULT_PROVIDER_ORDER: readonly EngineKind[] = ENGINE_DESCRIPTORS.map(
  (descriptor) => descriptor.kind,
);

const PROVIDER_KIND_SET: ReadonlySet<EngineKind> = new Set(DEFAULT_PROVIDER_ORDER);

export function isProviderKind(value: string): value is EngineKind {
  return PROVIDER_KIND_SET.has(value as EngineKind);
}

export function normalizeHiddenProviders(hiddenProviders: ReadonlyArray<string>): EngineKind[] {
  const seen = new Set<EngineKind>();
  const result: EngineKind[] = [];
  for (const candidate of hiddenProviders) {
    if (isProviderKind(candidate) && !seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate);
    }
  }
  return result;
}

export function normalizeProviderOrder(providerOrder: ReadonlyArray<string>): EngineKind[] {
  const seen = new Set<EngineKind>();
  const result: EngineKind[] = [];
  for (const candidate of providerOrder) {
    if (isProviderKind(candidate) && !seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate);
    }
  }
  for (const provider of DEFAULT_PROVIDER_ORDER) {
    if (!seen.has(provider)) {
      result.push(provider);
    }
  }
  return result;
}

export function sameProviderOrder(
  left: ReadonlyArray<EngineKind>,
  right: ReadonlyArray<EngineKind>,
): boolean {
  return left.length === right.length && left.every((provider, index) => provider === right[index]);
}

export function compareProvidersByOrder(
  providerOrder: ReadonlyArray<EngineKind>,
  left: EngineKind,
  right: EngineKind,
): number {
  const leftIndex = providerOrder.indexOf(left);
  const rightIndex = providerOrder.indexOf(right);
  const normalizedLeftIndex =
    leftIndex >= 0 ? leftIndex : DEFAULT_PROVIDER_ORDER.indexOf(left) + providerOrder.length;
  const normalizedRightIndex =
    rightIndex >= 0 ? rightIndex : DEFAULT_PROVIDER_ORDER.indexOf(right) + providerOrder.length;
  return normalizedLeftIndex - normalizedRightIndex;
}

export function filterProviderOptionsByVisibility<T extends { value: EngineKind }>(
  options: ReadonlyArray<T>,
  hiddenProviders: ReadonlySet<EngineKind>,
  protectedProviders: ReadonlySet<EngineKind>,
): ReadonlyArray<T> {
  if (hiddenProviders.size === 0) {
    return options;
  }
  return options.filter(
    (option) => protectedProviders.has(option.value) || !hiddenProviders.has(option.value),
  );
}
