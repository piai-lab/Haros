#!/usr/bin/env node
// FILE: generate-legal-metadata.ts
// Purpose: Generates build-time legal metadata or verifies deterministic generation from source.

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import serverPackageJson from "../apps/server/package.json" with { type: "json" };
import {
  DEPENDENCY_INVENTORY_FILE,
  NOTICES_FILE,
  SBOM_FILE,
  collectDependencyInventory,
  renderLegalMetadata,
  resolveDependencyRoots,
  writeLegalMetadata,
} from "./lib/legal-metadata.ts";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDirectory = resolve(repositoryRoot, "apps/web/public/licenses");
if (process.argv.includes("--check")) {
  const target = {
    kind: "development-host" as const,
    platform: process.platform,
    arch: process.arch,
  };
  const firstInventory = collectDependencyInventory({
    packageRoot: repositoryRoot,
    repositoryRoot,
    roots: resolveDependencyRoots(repositoryRoot),
    target,
  });
  const secondInventory = collectDependencyInventory({
    packageRoot: repositoryRoot,
    repositoryRoot,
    roots: resolveDependencyRoots(repositoryRoot),
    target,
  });
  if (JSON.stringify(firstInventory) !== JSON.stringify(secondInventory)) {
    throw new Error("Dependency inventory generation is not deterministic.");
  }
  const rendered = renderLegalMetadata(firstInventory, serverPackageJson.version);
  const renderedAgain = renderLegalMetadata(secondInventory, serverPackageJson.version);
  for (const name of [DEPENDENCY_INVENTORY_FILE, SBOM_FILE, NOTICES_FILE] as const) {
    if (rendered[name] !== renderedAgain[name]) {
      throw new Error(`${name} generation is not deterministic.`);
    }
  }
  console.log(
    `Verified deterministic legal metadata for ${firstInventory.componentCount} components.`,
  );
} else {
  const inventory = writeLegalMetadata({
    packageRoot: repositoryRoot,
    repositoryRoot,
    outputDirectory,
    appVersion: serverPackageJson.version,
    target: { kind: "development-host", platform: process.platform, arch: process.arch },
  });
  console.log(`Wrote deterministic legal metadata for ${inventory.componentCount} components.`);
}
