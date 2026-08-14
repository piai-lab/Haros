import { Effect, Layer } from "effect";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { ThreadId } from "@omnimind/contracts";
import { describe, expect, it, vi } from "vitest";

import { ServerConfig } from "../../config.ts";
import type { OmniMindCodingAgentModule } from "../omnimindAgentRuntime.ts";
import { OmniMindEcosystem, type OmniMindEcosystemShape } from "../Services/OmniMindEcosystem.ts";
import { ProviderService, type ProviderServiceShape } from "../Services/ProviderService.ts";
import { makeOmniMindEcosystemLive } from "./OmniMindEcosystem.ts";

function makeHarness() {
  const packageId = "a".repeat(64);
  const flush = vi.fn(async () => undefined);
  const listPublicConfiguredPackages = vi.fn(() => [
    {
      packageId,
      displayName: "@example/plugin",
      kind: "npm" as const,
      scope: "user" as const,
      filtered: false,
      installed: true,
      manageable: true,
    },
    {
      packageId: "b".repeat(64),
      displayName: "Local package",
      kind: "local" as const,
      scope: "user" as const,
      filtered: false,
      installed: false,
      manageable: false,
    },
  ]);
  const listPublicConfiguredPackageResources = vi.fn(async () => [
    {
      packageId,
      resourceType: "extensions" as const,
      resourcePath: "extensions/index.ts",
      enabled: true,
    },
  ]);
  const checkPublicPackageUpdates = vi.fn(async () => []);
  const setPublicPackageResourceEnabled = vi.fn(async () => true);
  const reloadSessionResources = vi.fn(() => Effect.succeed({ state: "reloaded" as const }));
  const settingsManager = { flush };
  const sdk = {
    SettingsManager: { create: () => settingsManager },
    DefaultPackageManager: class {
      listPublicConfiguredPackages = listPublicConfiguredPackages;
      listPublicConfiguredPackageResources = listPublicConfiguredPackageResources;
      checkPublicPackageUpdates = checkPublicPackageUpdates;
      setPublicPackageResourceEnabled = setPublicPackageResourceEnabled;
      installPublicPackage = vi.fn(async () => undefined);
      updatePublicPackage = vi.fn(async () => undefined);
      removePublicPackage = vi.fn(async () => true);
    },
  } as unknown as OmniMindCodingAgentModule;
  const layer = makeOmniMindEcosystemLive({ loadModule: async () => sdk }).pipe(
    Layer.provideMerge(ServerConfig.layerTest(process.cwd(), "/tmp/omnimind-ecosystem-test")),
    Layer.provideMerge(
      Layer.succeed(ProviderService, { reloadSessionResources } as unknown as ProviderServiceShape),
    ),
    Layer.provideMerge(NodeServices.layer),
  );
  const run = <A>(operation: (service: OmniMindEcosystemShape) => Effect.Effect<A, Error>) =>
    Effect.runPromise(
      Effect.gen(function* () {
        return yield* operation(yield* OmniMindEcosystem);
      }).pipe(Effect.provide(layer)),
    );
  return {
    run,
    packageId,
    listPublicConfiguredPackages,
    listPublicConfiguredPackageResources,
    checkPublicPackageUpdates,
    setPublicPackageResourceEnabled,
    reloadSessionResources,
    flush,
  };
}

describe("OmniMindEcosystemLive", () => {
  it("keeps passive package listing configuration-only", async () => {
    const harness = makeHarness();

    const snapshot = await harness.run((service) => service.list());
    expect(snapshot).toEqual({
      packages: [
        {
          packageId: harness.packageId,
          displayName: "@example/plugin",
          kind: "npm",
          installed: true,
          filtered: false,
          manageable: true,
        },
        {
          packageId: "b".repeat(64),
          displayName: "Local package",
          kind: "local",
          installed: false,
          filtered: false,
          manageable: false,
        },
      ],
    });
    expect(harness.listPublicConfiguredPackages).toHaveBeenCalledTimes(1);
    expect(harness.listPublicConfiguredPackageResources).not.toHaveBeenCalled();
    expect(harness.checkPublicPackageUpdates).not.toHaveBeenCalled();
    expect(harness.reloadSessionResources).not.toHaveBeenCalled();
    expect(JSON.stringify(snapshot)).not.toContain("/private/");
  });

  it("resolves resources only for the explicit package intent", async () => {
    const harness = makeHarness();

    await expect(
      harness.run((service) => service.listResources({ packageId: harness.packageId })),
    ).resolves.toEqual({
      resources: [
        {
          packageId: harness.packageId,
          resourceType: "extensions",
          resourcePath: "extensions/index.ts",
          enabled: true,
        },
      ],
    });
    expect(harness.listPublicConfiguredPackageResources).toHaveBeenCalledWith({
      packageId: harness.packageId,
    });
  });

  it("rejects a forged resource path before changing package filters", async () => {
    const harness = makeHarness();

    await expect(
      harness.run((service) =>
        service.setResourceEnabled({
          packageId: harness.packageId,
          resourceType: "extensions",
          resourcePath: "extensions/forged.ts",
          enabled: false,
        }),
      ),
    ).rejects.toThrow("OmniMind ecosystem operation failed");
    expect(harness.setPublicPackageResourceEnabled).not.toHaveBeenCalled();
    expect(harness.flush).not.toHaveBeenCalled();
  });

  it("persists an exact toggle before returning a passive snapshot", async () => {
    const harness = makeHarness();

    await expect(
      harness.run((service) =>
        service.setResourceEnabled({
          packageId: harness.packageId,
          resourceType: "extensions",
          resourcePath: "extensions/index.ts",
          enabled: false,
        }),
      ),
    ).resolves.toMatchObject({ changed: true });
    expect(harness.setPublicPackageResourceEnabled).toHaveBeenCalledWith(
      {
        packageId: harness.packageId,
        resourceType: "extensions",
        resourcePath: "extensions/index.ts",
        enabled: false,
      },
      false,
    );
    expect(harness.flush).toHaveBeenCalledTimes(1);
  });

  it("routes an explicit reload to the exact live thread owner", async () => {
    const harness = makeHarness();
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000041");

    await expect(harness.run((service) => service.reload({ threadId }))).resolves.toEqual({
      state: "reloaded",
    });
    expect(harness.reloadSessionResources).toHaveBeenCalledWith({ threadId });
  });
});
