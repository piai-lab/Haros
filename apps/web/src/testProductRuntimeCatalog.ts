import type { ProductRuntimeCatalog, ProductRuntimeModel } from "@omnimind/contracts";

const truth = { state: "available", reason: "test fixture" } as const;
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
) as ProductRuntimeCatalog["engines"][number]["capabilities"];

export function makeProductModelRuntimeCatalog(
  models: ReadonlyArray<ProductRuntimeModel>,
  engineId = "pi",
): ProductRuntimeCatalog {
  return {
    defaultEngineId: engineId,
    packageGeneration: "package-test",
    engines: [
      {
        engineId,
        displayName: engineId === "pi" ? "Pi" : engineId,
        distribution: "bundled-native",
        runtimeVersion: "test",
        protocol: { name: "native", version: "1" },
        availability: { state: "available" },
        modelSelection: { kind: "product-model", thinking: "product-selectable", models },
        capabilities,
        enforcement: "unverified",
      },
    ],
  };
}
