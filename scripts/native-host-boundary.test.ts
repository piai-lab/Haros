import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");
const readJson = (path: string) => JSON.parse(read(path)) as Record<string, unknown>;

describe("isolated Native Host production boundary", () => {
  it("keeps the executable Pi runtime in the Native Host package only", () => {
    const hostPackage = readJson("apps/native-host/package.json") as {
      name: string;
      bin: Record<string, string>;
      dependencies: Record<string, string>;
    };
    const hostSource = read("apps/native-host/src/index.ts");
    const piRuntimeSource = read("apps/native-host/src/piRuntime.ts");
    const hostArtifact = read("apps/native-host/dist/index.mjs");
    const piDependencies = Object.keys(hostPackage.dependencies)
      .filter((name) => name.startsWith("@earendil-works/pi-"))
      .sort();

    expect(hostPackage.name).toBe("@omnimind/native-host");
    expect(hostPackage.bin).toEqual({ "omnimind-native-host": "dist/index.mjs" });
    expect(piDependencies).toEqual([
      "@earendil-works/pi-agent-core",
      "@earendil-works/pi-ai",
      "@earendil-works/pi-coding-agent",
    ]);
    expect(hostPackage.dependencies["@omnimind/contracts"]).toBe("workspace:*");
    expect(readdirSync(resolve(repositoryRoot, "apps/native-host/dist"))).toEqual(["index.mjs"]);
    expect(`${hostSource}\n${piRuntimeSource}\n${hostArtifact}`).toMatch(
      /@earendil-works\/pi-(?:ai|coding-agent)/u,
    );
  });

  it("uses one socket transport and one Desktop supervisor/direct Service client direction", () => {
    const hostSource = read("apps/native-host/src/index.ts");
    const serviceClient = read("apps/service/src/native-host/client.ts");
    const desktopMain = read("apps/desktop/src/main.ts");
    const supervisor = read("apps/desktop/src/process/nativeHostSupervisor.ts");
    const alternateTransport = /node:http|node:https|WebSocket|\bws\b|fetch\s*\(/u;

    expect(hostSource).toContain('from "node:net"');
    expect(serviceClient).toContain('from "node:net"');
    expect(`${hostSource}\n${serviceClient}`).not.toMatch(alternateTransport);
    expect(desktopMain.match(/new NativeHostProcessSupervisor/gu)).toHaveLength(1);
    expect(
      desktopMain.match(
        /Path\.join\(resolveAppRoot\(\), "apps\/native-host\/dist\/index\.mjs"\)/gu,
      ),
    ).toHaveLength(1);
    expect(supervisor).toContain("spawn(");
    expect(desktopMain).not.toContain('from "../../../native-host/src');
    expect(serviceClient).not.toContain('from "../../../native-host/src');
  });

  it("stages that same Host and keeps endpoint/authentication out of Product and renderer state", () => {
    const buildScript = read("scripts/build-desktop-artifact.ts");
    const releaseManifests = read("scripts/lib/release-workspace-manifests.ts");
    const releaseLegalMetadata = read("scripts/lib/release-legal-metadata.ts");
    const rendererAndProductState = [
      read("apps/web/src/store/systemHealthStore.ts"),
      read("apps/web/src/components/system-health/SystemHealthCoordinator.tsx"),
      read("packages/contracts/src/desktop/health.ts"),
      read("apps/service/src/product/ProductControlPlane.ts"),
    ].join("\n");

    expect(buildScript).toContain(
      'fs.copy(distDirs.nativeHostDist, path.join(stageAppDir, "apps/native-host/dist"))',
    );
    expect(releaseManifests).toContain('"apps/native-host/package.json"');
    expect(buildScript).toContain("...resolvedNativeHostDependencies");
    expect(releaseLegalMetadata).toContain(
      'join(packageRoot, "apps/native-host/package.json")',
    );
    expect(rendererAndProductState).not.toMatch(
      /OMNIMIND_NATIVE_HOST_(?:AUTH|ENDPOINT)|omnimind-native-host-[a-f0-9-]+\.sock/iu,
    );
  });

  it("keeps every Host-external production package free of Pi runtime dependencies", () => {
    const hostPackage = readJson("apps/native-host/package.json") as {
      dependencies: Record<string, string>;
    };
    const externalManifestPaths = [
      "apps/desktop/package.json",
      "apps/service/package.json",
      "apps/web/package.json",
      "packages/contracts/package.json",
      "packages/shared/package.json",
    ];
    const externalManifests = externalManifestPaths.map((path) => ({
      path,
      manifest: readJson(path) as {
        dependencies?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
      },
    }));

    expect(Object.keys(hostPackage.dependencies).some((name) => name.startsWith("@earendil-works/pi-"))).toBe(true);
    for (const { path, manifest } of externalManifests) {
      const runtimeDependencies = {
        ...manifest.dependencies,
        ...manifest.optionalDependencies,
      };
      expect(
        Object.keys(runtimeDependencies).filter((name) => name.startsWith("@earendil-works/pi-")),
        path,
      ).toEqual([]);
    }

    const externalProductionSource = [
      read("apps/service/src/native-host/client.ts"),
      read("apps/service/src/native-host/executionBoundary.ts"),
      read("apps/desktop/src/main.ts"),
      read("apps/desktop/src/preload.ts"),
      read("apps/web/src/wsNativeApi.ts"),
      read("packages/contracts/src/native-host/protocol.ts"),
    ].join("\n");
    expect(externalProductionSource).not.toMatch(/@earendil-works\/pi-/u);
  });
});
