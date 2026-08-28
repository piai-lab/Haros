// FILE: providerOrdering.test.ts
// Purpose: Keeps provider ordering normalization covered for every exposed provider.
// Layer: Web settings tests
// Depends on: provider display metadata from contracts and providerOrdering helpers.

import { ENGINE_KINDS, type EngineKind } from "@harnessos/contracts";
import { ENGINE_DESCRIPTORS, ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROVIDER_ORDER,
  isProviderKind,
  normalizeHiddenProviders,
  normalizeProviderOrder,
} from "./providerOrdering";

const ALL_ENGINE_KINDS: readonly EngineKind[] = ENGINE_KINDS;

describe("providerOrdering", () => {
  it("includes every displayable provider in the default order", () => {
    expect(DEFAULT_PROVIDER_ORDER).toHaveLength(ALL_ENGINE_KINDS.length);
    expect(new Set(DEFAULT_PROVIDER_ORDER)).toEqual(new Set(ALL_ENGINE_KINDS));
  });

  it("keeps the shared presentation descriptor exhaustive and internally aligned", () => {
    expect(ENGINE_DESCRIPTORS.map((descriptor) => descriptor.kind)).toEqual(DEFAULT_PROVIDER_ORDER);
    for (const descriptor of ENGINE_DESCRIPTORS) {
      expect(descriptor.displayName).toBe(ENGINE_DISPLAY_NAMES[descriptor.kind]);
    }
  });

  it("keeps Pi as a valid provider for persisted order and visibility settings", () => {
    expect(isProviderKind("pi")).toBe(true);
    expect(normalizeProviderOrder(["pi", "codex"])[0]).toBe("pi");
    expect(normalizeHiddenProviders(["bogus", "pi", "pi"])).toEqual(["pi"]);
  });
});
