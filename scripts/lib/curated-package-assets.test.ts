import { createPackage, extractFile } from "@electron/asar";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { CURATED_PACKAGE_ASSETS, stageCuratedPackageAssets } from "./curated-package-assets";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const temporaryRoots: string[] = [];

function temporaryRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "omnimind-curated-assets-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("curated Package release assets", () => {
  it("stages only the exact Package source, manifest and retained notice into app.asar", async () => {
    const root = temporaryRoot();
    const applicationRoot = path.join(root, "app");
    const staged = await stageCuratedPackageAssets({
      sourceRoot: repositoryRoot,
      applicationRoot,
    });
    expect(staged.map((entry) => path.relative(applicationRoot, entry))).toEqual(
      CURATED_PACKAGE_ASSETS.map((asset) => asset.path),
    );

    const archive = path.join(root, "app.asar");
    await createPackage(applicationRoot, archive);
    for (const asset of CURATED_PACKAGE_ASSETS) {
      expect(extractFile(archive, asset.path)).toEqual(
        readFileSync(path.join(repositoryRoot, asset.path)),
      );
    }
  });

  it("fails before staging when a required root asset is missing or changed", async () => {
    const sourceRoot = path.join(temporaryRoot(), "source");
    cpSync(path.join(repositoryRoot, "assets"), path.join(sourceRoot, "assets"), {
      recursive: true,
    });
    rmSync(path.join(sourceRoot, CURATED_PACKAGE_ASSETS[0].path));
    const missingDestination = path.join(temporaryRoot(), "missing-app");
    await expect(
      stageCuratedPackageAssets({ sourceRoot, applicationRoot: missingDestination }),
    ).rejects.toThrow();
    expect(existsSync(path.join(missingDestination, "assets"))).toBe(false);

    cpSync(path.join(repositoryRoot, "assets"), path.join(sourceRoot, "assets"), {
      recursive: true,
      force: true,
    });
    writeFileSync(path.join(sourceRoot, CURATED_PACKAGE_ASSETS[1].path), "changed\n");
    const changedDestination = path.join(temporaryRoot(), "changed-app");
    await expect(
      stageCuratedPackageAssets({ sourceRoot, applicationRoot: changedDestination }),
    ).rejects.toThrow("exact digest validation");
    expect(existsSync(path.join(changedDestination, "assets"))).toBe(false);
  });
});
