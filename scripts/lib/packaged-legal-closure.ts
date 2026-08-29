// FILE: packaged-legal-closure.ts
// Purpose: Proves packaged ASAR dependency identities equal its disclosed legal inventory.
// Layer: Packaging/legal helper

import { extractFile, listPackage } from "@electron/asar";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  DEPENDENCY_INVENTORY_FILE,
  NOTICES_FILE,
  SBOM_FILE,
  type DependencyInventory,
} from "./legal-metadata.ts";
import { SERVER_BUNDLED_WORKSPACE_COMPONENTS } from "./packaged-workspace-manifests.ts";

const LEGAL_DIRECTORY = "apps/server/dist/client/licenses";
const REQUIRED_LINEAGE_PACKAGES = [
  "@earendil-works/pi-agent-core",
  "@earendil-works/pi-ai",
  "@earendil-works/pi-client",
  "@earendil-works/pi-coding-agent",
  "@earendil-works/pi-protocol",
  "@earendil-works/pi-telemetry",
  "@earendil-works/pi-tui",
  "@harnessos/oa-runtime",
] as const;

function normalizedArchivePath(path: string): string {
  return path.replace(/^[/\\]+/u, "").replaceAll("\\", "/");
}

function readArchiveFile(archivePath: string, path: string): Buffer {
  const normalized = normalizedArchivePath(path);
  // `@electron/asar` resolves archive paths through the host platform's
  // `path` implementation. Windows can require the root marker even though
  // `listPackage` returns entries without one after normalization. Try both
  // canonical forms so legal verification is identical on every runner.
  let firstError: unknown;
  for (const candidate of [normalized, `/${normalized}`]) {
    try {
      return extractFile(archivePath, candidate);
    } catch (error) {
      firstError ??= error;
    }
  }
  throw firstError;
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
  for (const name of [DEPENDENCY_INVENTORY_FILE, SBOM_FILE, NOTICES_FILE]) {
    const path = `${LEGAL_DIRECTORY}/${name}`;
    if (!archiveEntries.has(path)) throw new Error(`Packaged legal artifact is missing: ${path}`);
  }

  const inventory = JSON.parse(
    readArchiveFile(archivePath, `${LEGAL_DIRECTORY}/${DEPENDENCY_INVENTORY_FILE}`).toString(
      "utf8",
    ),
  ) as DependencyInventory;
  if (
    inventory.schemaVersion !== 3 ||
    inventory.derivation !== "installed-production-and-bundled-workspace-closure" ||
    inventory.target?.kind !== "packaged-target" ||
    inventory.componentCount !== inventory.components.length
  ) {
    throw new Error("Packaged dependency inventory contract is invalid.");
  }

  const disclosed = new Set(inventory.components.map((component) => component.id));
  const bundled = new Set(
    inventory.components
      .filter((component) =>
        component.locations?.some((location) => location.startsWith("bundled:")),
      )
      .map((component) => component.id),
  );
  const packaged = packageIdsInArchive(archivePath);
  const missing = [...packaged].filter((id) => !disclosed.has(id)).toSorted();
  const phantom = [...disclosed].filter((id) => !packaged.has(id) && !bundled.has(id)).toSorted();
  if (missing.length > 0 || phantom.length > 0) {
    throw new Error(
      [
        "Packaged dependency closure does not match packaged-dependencies.json.",
        missing.length > 0 ? `Undisclosed packaged IDs: ${missing.join(", ")}` : "",
        phantom.length > 0 ? `Disclosed but absent IDs: ${phantom.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }
  for (const component of inventory.components) {
    for (const location of component.locations ?? []) {
      if (!location.startsWith("bundled:")) continue;
      const runtimePath = normalizedArchivePath(location.slice("bundled:".length));
      if (!runtimePath || !archiveEntries.has(runtimePath)) {
        throw new Error(
          `Bundled dependency ${component.id} runtime receipt is absent: ${runtimePath || "<empty>"}.`,
        );
      }
    }
  }
  for (const name of REQUIRED_LINEAGE_PACKAGES) {
    if (![...packaged].some((id) => id.startsWith(`${name}@`))) {
      throw new Error(`Packaged dependency closure omitted required lineage package ${name}.`);
    }
  }
  for (const descriptor of SERVER_BUNDLED_WORKSPACE_COMPONENTS) {
    if (!descriptor.includeInLegalClosure) continue;
    const component = inventory.components.find((candidate) => candidate.name === descriptor.name);
    if (!component) {
      throw new Error(`Packaged legal closure omitted bundled workspace ${descriptor.name}.`);
    }
    if (!component.locations.includes(`bundled:${descriptor.runtimePath}`)) {
      throw new Error(
        `Bundled workspace ${descriptor.name} has no exact runtime location receipt.`,
      );
    }
    if (!archiveEntries.has(descriptor.runtimePath)) {
      throw new Error(
        `Bundled workspace ${descriptor.name} runtime is absent: ${descriptor.runtimePath}.`,
      );
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
