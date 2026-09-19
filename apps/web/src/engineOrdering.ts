// FILE: engineOrdering.ts
// Purpose: Keeps engine picker ordering stable across settings, search, and menus.
// Layer: Web settings utility
// Exports: default order, hidden-engine writes, normalization, and order comparison helpers.

import type { EngineKind } from "@harnessos/contracts";
import { RUNNABLE_ENGINE_DESCRIPTORS } from "@harnessos/shared/engineMetadata";

export const DEFAULT_PROVIDER_ORDER: readonly EngineKind[] = RUNNABLE_ENGINE_DESCRIPTORS.map(
  (descriptor) => descriptor.kind,
);

const ENGINE_KIND_SET: ReadonlySet<EngineKind> = new Set(DEFAULT_PROVIDER_ORDER);

export function isEngineKind(value: string): value is EngineKind {
  return ENGINE_KIND_SET.has(value as EngineKind);
}

export function normalizeHiddenEngines(hiddenEngines: ReadonlyArray<string>): EngineKind[] {
  const seen = new Set<EngineKind>();
  const result: EngineKind[] = [];
  for (const candidate of hiddenEngines) {
    if (isEngineKind(candidate) && !seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate);
    }
  }
  return result;
}

export function setEngineHidden(
  current: ReadonlyArray<EngineKind>,
  engine: EngineKind,
  hidden: boolean,
): EngineKind[] {
  const withoutTarget = current.filter((entry) => entry !== engine);
  return hidden ? [...withoutTarget, engine] : withoutTarget;
}

export function normalizeEngineOrder(engineOrder: ReadonlyArray<string>): EngineKind[] {
  const seen = new Set<EngineKind>();
  const result: EngineKind[] = [];
  for (const candidate of engineOrder) {
    if (isEngineKind(candidate) && !seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate);
    }
  }
  for (const engine of DEFAULT_PROVIDER_ORDER) {
    if (!seen.has(engine)) {
      result.push(engine);
    }
  }
  return result;
}

export function sameEngineOrder(
  left: ReadonlyArray<EngineKind>,
  right: ReadonlyArray<EngineKind>,
): boolean {
  return left.length === right.length && left.every((engine, index) => engine === right[index]);
}

export function compareEnginesByOrder(
  engineOrder: ReadonlyArray<EngineKind>,
  left: EngineKind,
  right: EngineKind,
): number {
  const leftIndex = engineOrder.indexOf(left);
  const rightIndex = engineOrder.indexOf(right);
  const normalizedLeftIndex =
    leftIndex >= 0 ? leftIndex : DEFAULT_PROVIDER_ORDER.indexOf(left) + engineOrder.length;
  const normalizedRightIndex =
    rightIndex >= 0 ? rightIndex : DEFAULT_PROVIDER_ORDER.indexOf(right) + engineOrder.length;
  return normalizedLeftIndex - normalizedRightIndex;
}

export function filterEngineOptionsByVisibility<T extends { value: EngineKind }>(
  options: ReadonlyArray<T>,
  hiddenEngines: ReadonlySet<EngineKind>,
  protectedEngines: ReadonlySet<EngineKind>,
): ReadonlyArray<T> {
  return options.filter(
    (option) =>
      isEngineKind(option.value) &&
      (protectedEngines.has(option.value) || !hiddenEngines.has(option.value)),
  );
}
