import type { ProductRequestedSelection, ProductRuntimeCatalog } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  resolveKanbanRuntimeAvailability,
  resolveKanbanRuntimeModel,
} from "./kanbanRuntimeSelection";

function catalog(models: ProductRuntimeCatalog["models"]): ProductRuntimeCatalog {
  return {
    engineId: "host-engine",
    runtimeVersion: "test",
    packageGeneration: "package-kanban-runtime",
    models,
    capabilities: {
      ingress: "typed-native-host",
      lineage: { continue: "available", rebuild: "available" },
      controls: { steer: "available", followUp: "available", abort: "available", cancel: "unknown" },
      structuredQuestions: "unknown",
      packages: "unknown",
      filesRead: "unknown",
      filesWrite: "unknown",
      terminal: "unknown",
      enforcement: "unverified",
    },
    truncated: false,
  };
}

const configuredModel = {
  id: "host-a/shared",
  provider: "host-a",
  modelId: "shared",
  name: "Host configured",
  reasoning: true,
  thinkingLevels: ["medium", "max"],
  available: true,
  auth: "configured",
} as const;

function selected(
  runtimeModelId: string,
  thinking: string | null = null,
): Extract<ProductRequestedSelection, { state: "selected" }> {
  return {
    state: "selected",
    engineId: "host-engine",
    runtimeModelId,
    thinking,
    packageGeneration: "package-kanban-runtime",
    permissionPolicy: "approval-required",
    enforcement: "unverified",
    executionTarget: null,
  };
}

describe("Kanban Product runtime selection", () => {
  it("resolves only the exact engine and provider-qualified Host identity", () => {
    const runtimeCatalog = catalog([
      configuredModel,
      { ...configuredModel, id: "host-b/shared", provider: "host-b", name: "Other host" },
    ]);
    expect(resolveKanbanRuntimeModel(runtimeCatalog, selected("shared"))).toBeUndefined();
    expect(resolveKanbanRuntimeModel(runtimeCatalog, selected("host-a/shared"))?.provider).toBe("host-a");
    expect(
      resolveKanbanRuntimeModel(runtimeCatalog, { ...selected("host-a/shared"), engineId: "other" }),
    ).toBeUndefined();
  });

  it("fails closed for unavailable, missing-auth, stale, and unsupported thinking requests", () => {
    expect(resolveKanbanRuntimeAvailability(null, selected("host-a/shared")).usable).toBe(false);
    expect(resolveKanbanRuntimeAvailability(catalog([configuredModel]), null).usable).toBe(false);
    expect(resolveKanbanRuntimeAvailability(catalog([configuredModel]), selected("donor/static")).usable).toBe(false);
    expect(
      resolveKanbanRuntimeAvailability(
        catalog([{ ...configuredModel, auth: "missing" }]),
        selected("host-a/shared"),
      ).usable,
    ).toBe(false);
    expect(
      resolveKanbanRuntimeAvailability(catalog([configuredModel]), selected("host-a/shared", "low"))
        .usable,
    ).toBe(false);
  });

  it("preserves the exact Host thinking request", () => {
    expect(
      resolveKanbanRuntimeAvailability(catalog([configuredModel]), selected("host-a/shared", "max")),
    ).toMatchObject({ usable: true, thinking: "max" });
  });
});
