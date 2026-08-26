import { it } from "vitest";

export type BrowserTestKind = "stable" | "geometry";

const disabledIt = Object.assign(() => undefined, {
  each: () => () => undefined,
}) as unknown as typeof it;

export function browserItFor(
  currentKind: BrowserTestKind,
  requestedKind: BrowserTestKind,
): typeof it {
  return currentKind === requestedKind ? it : disabledIt;
}
