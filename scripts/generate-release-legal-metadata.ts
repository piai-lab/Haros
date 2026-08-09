#!/usr/bin/env node
// FILE: generate-release-legal-metadata.ts
// Purpose: Refreshes the browsable development copy of release dependency notices and SBOM.

import { readFileSync } from "node:fs";
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
  const checkedInInventory = JSON.parse(
    readFileSync(resolve(outputDirectory, RELEASE_DEPENDENCY_INVENTORY_FILE), "utf8"),
  ) as ReturnType<typeof collectReleaseDependencyInventory>;
  if (checkedInInventory.target?.kind !== "development-host") {
    throw new Error(
      "Checked-in legal metadata must identify itself as a development-host snapshot.",
    );
  }
  const rendered = renderReleaseLegalMetadata(checkedInInventory, serverPackageJson.version);
  for (const name of [
    RELEASE_DEPENDENCY_INVENTORY_FILE,
    RELEASE_SBOM_FILE,
    RELEASE_NOTICES_FILE,
  ] as const) {
    if (readFileSync(resolve(outputDirectory, name), "utf8") !== rendered[name]) {
      throw new Error(
        `${name} is stale. Run 'bun run licenses:generate' after dependency or legal-source changes.`,
      );
    }
  }
  if (
    checkedInInventory.target.platform === process.platform &&
    checkedInInventory.target.arch === process.arch
  ) {
    const actualInventory = collectReleaseDependencyInventory({
      packageRoot: repositoryRoot,
      repositoryRoot,
      roots: resolveReleaseDependencyRoots(repositoryRoot),
      target: checkedInInventory.target,
    });
    if (JSON.stringify(actualInventory) !== JSON.stringify(checkedInInventory)) {
      throw new Error("Checked-in development-host dependency inventory is stale.");
    }
  } else {
    console.log(
      `Skipped host closure equality: snapshot is ${checkedInInventory.target.platform}/${checkedInInventory.target.arch}, current host is ${process.platform}/${process.arch}.`,
    );
  }
  console.log(
    `Verified deterministic release legal metadata for ${checkedInInventory.componentCount} components.`,
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
