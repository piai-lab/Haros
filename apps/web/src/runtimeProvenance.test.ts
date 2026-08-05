import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  BUNDLED_PI_PROVENANCE,
  OPEN_SOURCE_NOTICE,
  RELEASE_LEGAL_ARTIFACTS,
} from "./runtimeProvenance";

const nativeHostManifest = JSON.parse(
  readFileSync(new URL("../../native-host/package.json", import.meta.url), "utf8"),
) as { dependencies: Record<string, string> };
const nonRuntimeManifests = [
  "../../desktop/package.json",
  "../../service/package.json",
  "../package.json",
].map(
  (manifestPath) =>
    JSON.parse(readFileSync(new URL(manifestPath, import.meta.url), "utf8")) as {
      dependencies?: Record<string, string>;
    },
);
const lockfile = readFileSync(new URL("../../../bun.lock", import.meta.url), "utf8");
const legalOverrides = JSON.parse(
  readFileSync(
    new URL("../../../assets/licenses/release-legal-overrides.json", import.meta.url),
    "utf8",
  ),
) as {
  entries: ReadonlyArray<{ packageIds: ReadonlyArray<string>; revision: string }>;
};
const releaseInventory = JSON.parse(
  readFileSync(new URL("../public/licenses/release-dependencies.json", import.meta.url), "utf8"),
) as { components: ReadonlyArray<{ id: string }> };

describe("runtime provenance", () => {
  it("binds the disclosed Pi generation to the isolated Native Host dependency closure", () => {
    const version = BUNDLED_PI_PROVENANCE.packageVersion;
    const directPackages = [
      "@earendil-works/pi-agent-core",
      "@earendil-works/pi-ai",
      "@earendil-works/pi-coding-agent",
    ] as const;

    for (const packageName of directPackages) {
      expect(nativeHostManifest.dependencies[packageName]).toBe(version);
      for (const manifest of nonRuntimeManifests) {
        expect(manifest.dependencies?.[packageName]).toBeUndefined();
      }
    }

    expect(BUNDLED_PI_PROVENANCE.packages).toEqual([
      ...directPackages.map((packageName) => `${packageName}@${version}`),
      `@earendil-works/pi-tui@${version}`,
    ]);
    for (const packageName of [...directPackages, "@earendil-works/pi-tui"]) {
      expect(lockfile).toContain(`"${packageName}": ["${packageName}@${version}"`);
      expect(
        releaseInventory.components.some(
          (component) => component.id === `${packageName}@${version}`,
        ),
      ).toBe(true);
    }

    const piLegalSource = legalOverrides.entries.find((entry) =>
      entry.packageIds.includes(`@earendil-works/pi-coding-agent@${version}`),
    );
    expect(piLegalSource?.revision).toBe(BUNDLED_PI_PROVENANCE.sourceRevision);
    expect(BUNDLED_PI_PROVENANCE.revisionTruth).toContain(BUNDLED_PI_PROVENANCE.sourceRevision);
  });

  it("states the implemented Native Host as a fault boundary rather than a sandbox", () => {
    expect(BUNDLED_PI_PROVENANCE.authority).toContain("Pi owns native Session behavior");
    expect(BUNDLED_PI_PROVENANCE.currentBoundary).toContain(
      "Pi executes in a supervised, isolated Native Host",
    );
    expect(BUNDLED_PI_PROVENANCE.currentBoundary).toContain(
      "absent from Electron Main, the renderer, and Product Service",
    );
    expect(BUNDLED_PI_PROVENANCE.currentBoundary).toContain(
      "fault boundary, not a filesystem or network sandbox",
    );
  });

  it("serves the adopted-source notice byte-for-byte from its disclosed route", () => {
    const canonicalNotice = readFileSync(
      new URL("../../../LICENSES/ui-mother-MIT.txt", import.meta.url),
    );
    const publicNotice = readFileSync(
      new URL(`../public${OPEN_SOURCE_NOTICE.href}`, import.meta.url),
    );

    expect(publicNotice).toEqual(canonicalNotice);
  });

  it("serves the generated dependency inventory, notices, and SBOM from disclosed routes", () => {
    expect(RELEASE_LEGAL_ARTIFACTS.map((artifact) => artifact.href)).toEqual([
      "/licenses/THIRD-PARTY-NOTICES.txt",
      "/licenses/release-dependencies.json",
      "/licenses/sbom.cdx.json",
    ]);
    for (const artifact of RELEASE_LEGAL_ARTIFACTS) {
      expect(
        readFileSync(new URL(`../public${artifact.href}`, import.meta.url)).length,
      ).toBeGreaterThan(0);
    }
  });
});
