#!/usr/bin/env node
// FILE: generate-release-legal-metadata.ts
// Purpose: Generates build-time legal metadata or verifies deterministic generation from source.

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import serverPackageJson from "../apps/server/package.json" with { type: "json" };
import {
  RELEASE_DEPENDENCY_INVENTORY_FILE,
  RELEASE_NOTICES_FILE,
  RELEASE_SBOM_FILE,
  collectReleaseDependencyInventory,
  renderReleaseLegalMetadata,
  resolveReleaseDependencyRoots,
  writeReleaseLegalMetadata,
} from "./lib/release-legal-metadata.ts";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDirectory = resolve(repositoryRoot, "apps/web/public/licenses");
if (process.argv.includes("--check")) {
  const target = {
    kind: "development-host" as const,
    platform: process.platform,
    arch: process.arch,
  };
  const firstInventory = collectReleaseDependencyInventory({
    packageRoot: repositoryRoot,
    repositoryRoot,
    roots: resolveReleaseDependencyRoots(repositoryRoot),
    target,
  });
  const secondInventory = collectReleaseDependencyInventory({
    packageRoot: repositoryRoot,
    repositoryRoot,
    roots: resolveReleaseDependencyRoots(repositoryRoot),
    target,
  });
  if (JSON.stringify(firstInventory) !== JSON.stringify(secondInventory)) {
    throw new Error("Release dependency inventory generation is not deterministic.");
  }
  const rendered = renderReleaseLegalMetadata(firstInventory, serverPackageJson.version);
  const renderedAgain = renderReleaseLegalMetadata(secondInventory, serverPackageJson.version);
  for (const name of [
    RELEASE_DEPENDENCY_INVENTORY_FILE,
    RELEASE_SBOM_FILE,
    RELEASE_NOTICES_FILE,
  ] as const) {
    if (rendered[name] !== renderedAgain[name]) {
      throw new Error(`${name} generation is not deterministic.`);
    }
  }
  console.log(
    `Verified deterministic release legal metadata for ${firstInventory.componentCount} components.`,
  );
} else {
  const inventory = writeReleaseLegalMetadata({
    packageRoot: repositoryRoot,
    repositoryRoot,
    outputDirectory,
    appVersion: serverPackageJson.version,
    target: { kind: "development-host", platform: process.platform, arch: process.arch },
  });
  console.log(
    `Wrote deterministic release legal metadata for ${inventory.componentCount} components.`,
  );
}
