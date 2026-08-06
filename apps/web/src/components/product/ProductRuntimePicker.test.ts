import type { ProductRuntimeCatalog } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import { reconcileProductRuntimeSelection } from "./ProductRuntimePicker";

const truth = { state: "available", reason: "fixture" } as const;
const capabilities = Object.fromEntries(
  [
    "continuation",
    "rebuild",
    "thinkingStream",
    "thinkingLevel",
    "structuredQuestion",
    "queue",
    "steer",
    "followUp",
    "cancel",
    "permissionPolicy",
    "packages",
    "filesRead",
    "filesWrite",
    "terminal",
    "namespacedUi",
  ].map((key) => [key, truth]),
) as never;
const catalog: ProductRuntimeCatalog = {
  defaultEngineId: "pi",
  packageGeneration: "package",
  engines: [
    {
      engineId: "pi",
      displayName: "Pi",
      distribution: "bundled-native",
      runtimeVersion: "1",
      protocol: { name: "native", version: "1" },
      availability: { state: "available" },
      modelSelection: {
        kind: "product-model",
        thinking: "product-selectable",
        models: [
          {
            id: "provider/model",
            provider: "provider",
            modelId: "model",
            name: "Model",
            reasoning: true,
            thinkingLevels: ["medium"],
            available: true,
            auth: "configured",
          },
        ],
      },
      capabilities,
      enforcement: "host-enforced",
    },
    {
      engineId: "opencode",
      displayName: "OpenCode",
      distribution: "user-installed",
      runtimeVersion: "1.14.40",
      protocol: { name: "acp", version: "1" },
      availability: { state: "available" },
      modelSelection: {
        kind: "engine-session",
        model: "resolved-on-prepare",
        mode: "resolved-on-prepare",
        thinking: "unsupported",
      },
      capabilities,
      enforcement: "unverified",
    },
  ],
};

describe("v2 Product Runtime selection", () => {
  it("keeps Pi as the initial explicit Product-model choice", () => {
    expect(reconcileProductRuntimeSelection(catalog, null)).toMatchObject({
      state: "selected",
      engineId: "pi",
      runtimeChoice: {
        kind: "product-model",
        runtimeModelId: "provider/model",
        thinking: "medium",
      },
      packageGeneration: "package",
    });
  });

  it("preserves an explicit OpenCode next-Run choice without inventing model or Package state", () => {
    expect(
      reconcileProductRuntimeSelection(catalog, {
        state: "selected",
        engineId: "opencode",
        runtimeChoice: { kind: "engine-session-current" },
        permissionPolicy: "approval-required",
        executionTarget: null,
        packageGeneration: null,
      }),
    ).toEqual({
      state: "selected",
      engineId: "opencode",
      runtimeChoice: { kind: "engine-session-current" },
      permissionPolicy: "approval-required",
      executionTarget: null,
      packageGeneration: null,
    });
  });

  it("keeps Pi explicitly unavailable while independently preserving a healthy selected OpenCode", () => {
    const externalOnlyCatalog: ProductRuntimeCatalog = {
      ...catalog,
      packageGeneration: null,
      engines: catalog.engines.filter((engine) => engine.engineId === "opencode"),
    };
    expect(reconcileProductRuntimeSelection(externalOnlyCatalog, null)).toEqual({
      state: "unavailable",
      reason: "process-unavailable",
      requestedEngineId: "pi",
      requestedRuntimeChoice: null,
      permissionPolicy: "approval-required",
      executionTarget: null,
      packageGeneration: null,
    });
    expect(
      reconcileProductRuntimeSelection(externalOnlyCatalog, {
        state: "selected",
        engineId: "opencode",
        runtimeChoice: { kind: "engine-session-current" },
        permissionPolicy: "approval-required",
        executionTarget: null,
        packageGeneration: null,
      }),
    ).toEqual({
      state: "selected",
      engineId: "opencode",
      runtimeChoice: { kind: "engine-session-current" },
      permissionPolicy: "approval-required",
      executionTarget: null,
      packageGeneration: null,
    });
  });
});
