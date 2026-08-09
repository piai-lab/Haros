// FILE: packaged-legal-closure.ts
// Purpose: Proves packaged ASAR dependency identities equal its disclosed legal inventory.
// Layer: Release/build helper

import { extractFile, listPackage } from "@electron/asar";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  RELEASE_DEPENDENCY_INVENTORY_FILE,
  RELEASE_NOTICES_FILE,
  RELEASE_SBOM_FILE,
  type ReleaseDependencyInventory,
} from "./release-legal-metadata.ts";

const LEGAL_DIRECTORY = "apps/server/dist/client/licenses";
const REQUIRED_PI_PACKAGES = [
  "@earendil-works/pi-agent-core",
  "@earendil-works/pi-ai",
  "@earendil-works/pi-client",
  "@earendil-works/pi-coding-agent",
  "@earendil-works/pi-protocol",
  "@earendil-works/pi-telemetry",
  "@earendil-works/pi-tui",
  "@omnimind/pi-coding-agent",
] as const;

function normalizedArchivePath(path: string): string {
  return path.replace(/^[/\\]+/u, "").replaceAll("\\", "/");
}

function readArchiveFile(archivePath: string, path: string): Buffer {
  return extractFile(archivePath, normalizedArchivePath(path));
}

export function packageIdsInArchive(archivePath: string): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const listedPath of listPackage(archivePath, { isPack: false })) {
    const path = normalizedArchivePath(listedPath);
    if (!/(?:^|\/)node_modules\/(?:@[^/]+\/)?[^/]+\/package\.json$/u.test(path)) continue;
    const parsed = JSON.parse(readArchiveFile(archivePath, path).toString("utf8")) as {
      name?: unknown;
      version?: unknown;
    };
    if (typeof parsed.name !== "string" || typeof parsed.version !== "string") {
      throw new Error(`Packaged dependency manifest is missing name/version: ${path}`);
    }
    ids.add(`${parsed.name}@${parsed.version}`);
  }
  return ids;
}

export function verifyPackagedLegalClosureArchive(archivePath: string): {
  readonly archivePath: string;
  readonly componentCount: number;
} {
  const archiveEntries = new Set(
    listPackage(archivePath, { isPack: false }).map(normalizedArchivePath),
  );
  for (const name of [RELEASE_DEPENDENCY_INVENTORY_FILE, RELEASE_SBOM_FILE, RELEASE_NOTICES_FILE]) {
    const path = `${LEGAL_DIRECTORY}/${name}`;
    if (!archiveEntries.has(path)) throw new Error(`Packaged legal artifact is missing: ${path}`);
  }

  const inventory = JSON.parse(
    readArchiveFile(
      archivePath,
      `${LEGAL_DIRECTORY}/${RELEASE_DEPENDENCY_INVENTORY_FILE}`,
    ).toString("utf8"),
  ) as ReleaseDependencyInventory;
  if (
    inventory.schemaVersion !== 2 ||
    inventory.derivation !== "installed-production-dependency-closure" ||
    inventory.target?.kind !== "release-target" ||
    inventory.componentCount !== inventory.components.length
  ) {
    throw new Error("Packaged release dependency inventory contract is invalid.");
  }

  const disclosed = new Set(inventory.components.map((component) => component.id));
  const packaged = packageIdsInArchive(archivePath);
  const missing = [...packaged].filter((id) => !disclosed.has(id)).toSorted();
  const phantom = [...disclosed].filter((id) => !packaged.has(id)).toSorted();
  if (missing.length > 0 || phantom.length > 0) {
    throw new Error(
      [
        "Packaged dependency closure does not match release-dependencies.json.",
        missing.length > 0 ? `Undisclosed packaged IDs: ${missing.join(", ")}` : "",
        phantom.length > 0 ? `Disclosed but absent IDs: ${phantom.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }
  for (const name of REQUIRED_PI_PACKAGES) {
    if (![...packaged].some((id) => id.startsWith(`${name}@`))) {
      throw new Error(`Packaged dependency closure omitted required Pi package ${name}.`);
    }
  }
  return { archivePath, componentCount: inventory.componentCount };
}

export function findPackagedAsars(outputDirectory: string): string[] {
  const found: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name === "app.asar") found.push(path);
    }
  };
  if (existsSync(outputDirectory)) visit(outputDirectory);
  return found.toSorted();
}

export function verifyPackagedLegalClosure(outputDirectory: string): ReadonlyArray<{
  readonly archivePath: string;
  readonly componentCount: number;
}> {
  const archives = findPackagedAsars(outputDirectory);
  if (archives.length === 0) {
    throw new Error(`No packaged app.asar was found under ${outputDirectory}.`);
  }
  return archives.map(verifyPackagedLegalClosureArchive);
}
