// FILE: engineOrdering.test.ts
// Purpose: Keeps engine ordering normalization covered for every exposed engine.
// Layer: Web settings tests
// Depends on: engine display metadata from contracts and engineOrdering helpers.

import { ENGINE_KINDS, type EngineKind } from "@harnessos/contracts";
import { ENGINE_DESCRIPTORS, ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROVIDER_ORDER,
  isEngineKind,
  normalizeHiddenEngines,
  normalizeEngineOrder,
} from "./engineOrdering";

const ALL_ENGINE_KINDS: readonly EngineKind[] = ENGINE_KINDS;

describe("engineOrdering", () => {
  it("includes every displayable engine in the default order", () => {
    expect(DEFAULT_PROVIDER_ORDER).toHaveLength(ALL_ENGINE_KINDS.length);
    expect(new Set(DEFAULT_PROVIDER_ORDER)).toEqual(new Set(ALL_ENGINE_KINDS));
  });

  it("keeps the shared presentation descriptor exhaustive and internally aligned", () => {
    expect(ENGINE_DESCRIPTORS.map((descriptor) => descriptor.kind)).toEqual(DEFAULT_PROVIDER_ORDER);
    for (const descriptor of ENGINE_DESCRIPTORS) {
      expect(descriptor.displayName).toBe(ENGINE_DISPLAY_NAMES[descriptor.kind]);
    }
  });

  it("keeps Pi as a valid engine for persisted order and visibility settings", () => {
    expect(isEngineKind("pi")).toBe(true);
    expect(normalizeEngineOrder(["pi", "codex"])[0]).toBe("pi");
    expect(normalizeHiddenEngines(["bogus", "pi", "pi"])).toEqual(["pi"]);
  });
});
