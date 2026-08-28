import type { EngineSelection, EngineKind } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import {
  deriveFirstRunReadinessState,
  hasRememberedExactModelBinding,
  type FirstRunReadinessState,
} from "./firstRunReadiness.logic";

type ClassifierInput = Parameters<typeof deriveFirstRunReadinessState>[0];

const settledEmpty: ClassifierInput = {
  factsSettled: true,
  hasUsableExactBinding: false,
  hasRememberedIndependentEngineBinding: false,
  hasRememberedHarnessOSBinding: false,
  modelServicesCapability: true,
  modelServicesTransport: "open" as const,
  passiveModelServicesState: "empty" as const,
  deferred: false,
};

describe("first-run readiness classifier", () => {
  const cases: ReadonlyArray<{
    name: string;
    overrides: Partial<ClassifierInput>;
    expected: FirstRunReadinessState;
  }> = [
    { name: "true empty product", overrides: {}, expected: "first-run" },
    {
      name: "deferred empty product",
      overrides: { deferred: true },
      expected: "deferred",
    },
    {
      name: "usable exact binding on any Engine",
      overrides: {
        hasUsableExactBinding: true,
        modelServicesCapability: null,
        modelServicesTransport: null,
        passiveModelServicesState: "unknown",
      },
      expected: "ready",
    },
    {
      name: "remembered independent Engine binding",
      overrides: { hasRememberedIndependentEngineBinding: true },
      expected: "recover-engine",
    },
    {
      name: "remembered HarnessOS binding",
      overrides: { hasRememberedHarnessOSBinding: true },
      expected: "recover-model-service",
    },
    {
      name: "configured model service with expired auth",
      overrides: { passiveModelServicesState: "configured" },
      expected: "recover-model-service",
    },
    {
      name: "engine facts still loading",
      overrides: { factsSettled: false },
      expected: "unknown",
    },
    {
      name: "passive model-services read failed",
      overrides: { passiveModelServicesState: "error" },
      expected: "unknown",
    },
    {
      name: "transport is connecting",
      overrides: { modelServicesTransport: "connecting" },
      expected: "unknown",
    },
    {
      name: "transport is incompatible",
      overrides: { modelServicesTransport: "incompatible" },
      expected: "unknown",
    },
    {
      name: "capability has not settled",
      overrides: { modelServicesCapability: null },
      expected: "unknown",
    },
  ];

  it.each(cases)("classifies $name", ({ overrides, expected }) => {
    expect(deriveFirstRunReadinessState({ ...settledEmpty, ...overrides })).toBe(expected);
  });

  it("treats only explicit user selections as remembered recovery intent", () => {
    const explicitExactEngineSelections = {
      codex: { engine: "codex", model: "gpt-5.6-sol" },
    } satisfies Partial<Record<EngineKind, EngineSelection>>;

    expect(
      hasRememberedExactModelBinding({
        engines: ["codex"],
        explicitExactEngineSelections,
      }),
    ).toBe(true);
    expect(
      hasRememberedExactModelBinding({
        engines: ["claude", "cursor", "pi"],
        explicitExactEngineSelections,
      }),
    ).toBe(false);
  });

  it("keeps installed-but-unauthenticated Engines in first-run without explicit intent", () => {
    expect(
      deriveFirstRunReadinessState({
        ...settledEmpty,
        hasRememberedIndependentEngineBinding: hasRememberedExactModelBinding({
          engines: ["codex", "claude", "cursor", "pi"],
          explicitExactEngineSelections: {},
        }),
      }),
    ).toBe("first-run");
  });
});
