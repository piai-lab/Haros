// FILE: release-legal-metadata.ts
// Purpose: Derives deterministic notices and SBOM data from the installed release dependency closure.
// Layer: Release/build helper

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import { SERVER_BUNDLED_WORKSPACE_COMPONENTS } from "./release-workspace-manifests.ts";

export const RELEASE_DEPENDENCY_INVENTORY_FILE = "release-dependencies.json";
export const RELEASE_SBOM_FILE = "sbom.cdx.json";
export const RELEASE_NOTICES_FILE = "THIRD-PARTY-NOTICES.txt";

const PI_PACKAGE_NAMES = [
  "@earendil-works/pi-agent-core",
  "@earendil-works/pi-ai",
  "@earendil-works/pi-client",
  "@earendil-works/pi-coding-agent",
  "@earendil-works/pi-protocol",
  "@earendil-works/pi-telemetry",
  "@earendil-works/pi-tui",
  "@omnimind/pi-coding-agent",
] as const;

interface PackageManifest {
  readonly name?: unknown;
  readonly version?: unknown;
  readonly license?: unknown;
  readonly author?: unknown;
  readonly homepage?: unknown;
  readonly repository?: unknown;
  readonly dependencies?: Record<string, unknown>;
  readonly optionalDependencies?: Record<string, unknown>;
  readonly peerDependencies?: Record<string, unknown>;
}

export interface ReleaseDependencyRoot {
  readonly name: string;
  readonly fromDirectory: string;
}

export interface ReleaseLicenseFile {
  readonly name: string;
  readonly sha256: string;
  readonly text: string;
  readonly provenance: {
    readonly kind: "packaged" | "bundled-source" | "exact-upstream" | "canonical-spdx-recovery";
    readonly sourceUrl: string | null;
    readonly revision: string | null;
    readonly sourcePath: string;
    readonly upstreamLegalTextAbsent: boolean;
  };
}

interface ReleaseLegalOverride {
  readonly packageIds: ReadonlyArray<string>;
  readonly license: string;
  readonly kind: "exact-upstream" | "canonical-spdx-recovery";
  readonly assetPath: string;
  readonly sha256: string;
  readonly revision: string;
  readonly sourcePath: string;
  readonly sourceUrl: string;
  readonly manifestSha256ByPackageId: Readonly<Record<string, string>>;
  readonly canonicalTextSource?: string;
  readonly upstreamLegalTextAbsent: boolean;
}

export interface ReleaseDependencyComponent {
  readonly name: string;
  readonly version: string;
  readonly id: string;
  readonly license: string;
  readonly author: string | null;
  readonly repository: string | null;
  readonly homepage: string | null;
  readonly manifestSha256: string;
  readonly locations: ReadonlyArray<string>;
  readonly licenseFiles: ReadonlyArray<ReleaseLicenseFile>;
  readonly dependencies: ReadonlyArray<string>;
}

export interface ReleaseDependencyInventory {
  readonly schemaVersion: 3;
  readonly derivation: "installed-production-and-bundled-workspace-closure";
  readonly target: {
    readonly kind: "development-host" | "release-target";
    readonly platform: string;
    readonly arch: string;
  };
  readonly componentCount: number;
  readonly roots: ReadonlyArray<string>;
  readonly components: ReadonlyArray<ReleaseDependencyComponent>;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): PackageManifest {
  return JSON.parse(readFileSync(path, "utf8")) as PackageManifest;
}

function requiredString(value: unknown, field: string, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Installed package ${path} has no valid ${field}.`);
  }
  return value.trim();
}

function metadataText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.name === "string" && candidate.name.trim()) return candidate.name.trim();
    if (typeof candidate.url === "string" && candidate.url.trim()) return candidate.url.trim();
  }
  return null;
}

function repositoryText(value: unknown): string | null {
  if (typeof value === "string") return value.replace(/^git\+/u, "").trim() || null;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.url === "string")
      return candidate.url.replace(/^git\+/u, "").trim() || null;
  }
  return null;
}

function packageCandidate(
  fromDirectory: string,
  packageName: string,
  packageRoot: string,
): string | null {
  const boundary = existsSync(packageRoot) ? realpathSync(packageRoot) : resolve(packageRoot);
  let cursor = existsSync(fromDirectory) ? realpathSync(fromDirectory) : resolve(fromDirectory);
  while (
    cursor === boundary ||
    (!relative(boundary, cursor).startsWith("..") && !isAbsolute(relative(boundary, cursor)))
  ) {
    const candidate = join(cursor, "node_modules", packageName);
    if (existsSync(join(candidate, "package.json"))) return realpathSync(candidate);
    if (cursor === boundary) break;
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return null;
}

function packageLicenseFiles(packageDirectory: string): ReleaseLicenseFile[] {
  const names = readdirSync(packageDirectory)
    .filter((name) => /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/iu.test(name))
    .filter((name) => statSync(join(packageDirectory, name)).isFile())
    .toSorted((left, right) => left.localeCompare(right));
  return names.map((name) => {
    const text = readFileSync(join(packageDirectory, name), "utf8")
      .replace(/\r\n?/gu, "\n")
      .replace(/[ \t]+$/gmu, "")
      .trimEnd();
    return {
      name,
      sha256: sha256(text),
      text,
      provenance: {
        kind: "packaged",
        sourceUrl: null,
        revision: null,
        sourcePath: name,
        upstreamLegalTextAbsent: false,
      },
    };
  });
}

function loadLegalOverrides(repositoryRoot: string): Map<string, ReleaseLegalOverride> {
  const manifestPath = join(repositoryRoot, "assets/licenses/release-legal-overrides.json");
  const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    schemaVersion?: unknown;
    entries?: unknown;
  };
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.entries)) {
    throw new Error("Release legal overrides manifest is invalid.");
  }
  const overrides = new Map<string, ReleaseLegalOverride>();
  for (const value of parsed.entries) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Release legal override entry must be an object.");
    }
    const entry = value as unknown as ReleaseLegalOverride;
    const manifestEntries =
      entry.manifestSha256ByPackageId &&
      typeof entry.manifestSha256ByPackageId === "object" &&
      !Array.isArray(entry.manifestSha256ByPackageId)
        ? Object.entries(entry.manifestSha256ByPackageId)
        : [];
    if (
      !Array.isArray(entry.packageIds) ||
      entry.packageIds.length === 0 ||
      (entry.kind !== "exact-upstream" && entry.kind !== "canonical-spdx-recovery") ||
      typeof entry.license !== "string" ||
      typeof entry.assetPath !== "string" ||
      !/^[0-9a-f]{64}$/u.test(entry.sha256) ||
      !/^[0-9a-f]{40}$/u.test(entry.revision) ||
      typeof entry.sourcePath !== "string" ||
      typeof entry.sourceUrl !== "string" ||
      !entry.sourceUrl.includes(entry.revision) ||
      manifestEntries.length !== entry.packageIds.length ||
      manifestEntries.some(
        ([packageId, digest]) =>
          !entry.packageIds.includes(packageId) || !/^[0-9a-f]{64}$/u.test(digest),
      ) ||
      entry.upstreamLegalTextAbsent !== (entry.kind === "canonical-spdx-recovery")
    ) {
      throw new Error("Release legal override entry has invalid provenance fields.");
    }
    if (
      entry.kind === "canonical-spdx-recovery" &&
      !entry.canonicalTextSource?.includes("spdx/license-list-data/blob/")
    ) {
      throw new Error(`Canonical SPDX recovery for ${entry.packageIds.join(", ")} is not exact.`);
    }
    const asset = resolve(repositoryRoot, entry.assetPath);
    const relation = relative(resolve(repositoryRoot), asset);
    if (relation.startsWith("..") || isAbsolute(relation)) {
      throw new Error(`Release legal override asset escaped the repository: ${entry.assetPath}`);
    }
    const text = readFileSync(asset, "utf8")
      .replace(/\r\n?/gu, "\n")
      .replace(/[ \t]+$/gmu, "")
      .trimEnd();
    if (sha256(text) !== entry.sha256) {
      throw new Error(`Release legal override digest mismatch for ${entry.assetPath}.`);
    }
    for (const packageId of entry.packageIds) {
      if (typeof packageId !== "string" || overrides.has(packageId)) {
        throw new Error(
          `Release legal override package id is invalid or duplicated: ${packageId}.`,
        );
      }
      overrides.set(packageId, entry);
    }
  }
  return overrides;
}

function relativeLocation(packageRoot: string, packageDirectory: string): string {
  const root = existsSync(packageRoot) ? realpathSync(packageRoot) : resolve(packageRoot);
  const location = relative(root, realpathSync(packageDirectory)).replaceAll("\\", "/");
  if (!location || location.startsWith("../") || isAbsolute(location)) {
    throw new Error(`Installed dependency escaped the release root: ${packageDirectory}`);
  }
  return location;
}

function packageId(name: string, version: string): string {
  return `${name}@${version}`;
}

export function collectReleaseDependencyInventory(options: {
  readonly packageRoot: string;
  readonly roots: ReadonlyArray<ReleaseDependencyRoot>;
  readonly repositoryRoot: string;
  readonly target: ReleaseDependencyInventory["target"];
  readonly includeBundledWorkspaceComponents?: boolean;
  readonly validateRequiredPiPackages?: boolean;
}): ReleaseDependencyInventory {
  const legalOverrides = loadLegalOverrides(options.repositoryRoot);
  const byDirectory = new Map<
    string,
    {
      manifest: PackageManifest;
      manifestText: string;
      packageDirectory: string;
      dependencyDirectories: string[];
    }
  >();
  const pending: Array<{ name: string; fromDirectory: string; optional: boolean }> =
    options.roots.map((root) => ({ ...root, optional: false }));
  for (const descriptor of options.includeBundledWorkspaceComponents === false
    ? []
    : SERVER_BUNDLED_WORKSPACE_COMPONENTS) {
    if (!descriptor.includeInLegalClosure) continue;
    const manifestPath = join(options.repositoryRoot, descriptor.manifestPath);
    if (!existsSync(manifestPath)) continue;
    const manifest = readJson(manifestPath);
    const stagedWorkspaceDirectory = join(options.packageRoot, dirname(descriptor.manifestPath));
    for (const name of Object.keys(manifest.dependencies ?? {}).toSorted()) {
      pending.push({ name, fromDirectory: stagedWorkspaceDirectory, optional: false });
    }
    for (const name of Object.keys(manifest.optionalDependencies ?? {}).toSorted()) {
      pending.push({ name, fromDirectory: stagedWorkspaceDirectory, optional: true });
    }
  }

  while (pending.length > 0) {
    const request = pending.shift()!;
    const packageDirectory = packageCandidate(
      request.fromDirectory,
      request.name,
      options.packageRoot,
    );
    if (!packageDirectory) {
      if (request.optional) continue;
      throw new Error(
        `Release dependency ${request.name} was not installed from ${request.fromDirectory}.`,
      );
    }
    if (byDirectory.has(packageDirectory)) continue;

    const manifestPath = join(packageDirectory, "package.json");
    const manifestText = readFileSync(manifestPath, "utf8");
    const manifest = readJson(manifestPath);
    const dependencyDirectories: string[] = [];
    byDirectory.set(packageDirectory, {
      manifest,
      manifestText,
      packageDirectory,
      dependencyDirectories,
    });

    const requiredDependencies = Object.keys(manifest.dependencies ?? {}).toSorted();
    const optionalDependencies = Object.keys(manifest.optionalDependencies ?? {}).toSorted();
    for (const name of requiredDependencies) {
      const resolved = packageCandidate(packageDirectory, name, options.packageRoot);
      if (!resolved)
        throw new Error(`${manifest.name}@${manifest.version} requires missing ${name}.`);
      dependencyDirectories.push(resolved);
      pending.push({ name, fromDirectory: packageDirectory, optional: false });
    }
    for (const name of optionalDependencies) {
      const resolved = packageCandidate(packageDirectory, name, options.packageRoot);
      if (!resolved) continue;
      dependencyDirectories.push(resolved);
      pending.push({ name, fromDirectory: packageDirectory, optional: true });
    }
  }

  const merged = new Map<
    string,
    {
      name: string;
      version: string;
      license: string;
      author: string | null;
      repository: string | null;
      homepage: string | null;
      manifestHashes: Set<string>;
      locations: Set<string>;
      licenseFiles: Map<string, ReleaseLicenseFile>;
      dependencies: Set<string>;
    }
  >();
  const directoryId = new Map<string, string>();

  for (const record of byDirectory.values()) {
    const name = requiredString(record.manifest.name, "name", record.packageDirectory);
    const version = requiredString(record.manifest.version, "version", record.packageDirectory);
    directoryId.set(record.packageDirectory, packageId(name, version));
  }

  for (const record of byDirectory.values()) {
    const name = requiredString(record.manifest.name, "name", record.packageDirectory);
    const version = requiredString(record.manifest.version, "version", record.packageDirectory);
    const id = packageId(name, version);
    const override = legalOverrides.get(id);
    const declaredLicense = metadataText(record.manifest.license);
    const license = declaredLicense ?? override?.license ?? "UNDECLARED";
    let licenseFiles = packageLicenseFiles(record.packageDirectory);
    if (license === "UNDECLARED") {
      throw new Error(`Release dependency ${id} has no declared license.`);
    }
    if (!declaredLicense) {
      // An exact, manifest-bound override owns both the missing metadata and legal text.
      // Do not silently infer a license identifier from an arbitrary packaged filename.
      licenseFiles = [];
    }
    if (licenseFiles.length === 0) {
      if (!override) {
        throw new Error(`Release dependency ${id} has no packaged legal text or exact override.`);
      }
      if (override.license !== license) {
        throw new Error(
          `Release legal override license mismatch for ${id}: ${override.license} != ${license}.`,
        );
      }
      const manifestDigest = sha256(record.manifestText);
      if (override.manifestSha256ByPackageId[id] !== manifestDigest) {
        throw new Error(`Release legal override manifest digest changed for ${id}.`);
      }
      const text = readFileSync(resolve(options.repositoryRoot, override.assetPath), "utf8")
        .replace(/\r\n?/gu, "\n")
        .replace(/[ \t]+$/gmu, "")
        .trimEnd();
      licenseFiles = [
        {
          name:
            override.kind === "exact-upstream"
              ? `Exact upstream ${override.sourcePath}`
              : `Canonical ${override.license} recovery`,
          sha256: override.sha256,
          text,
          provenance: {
            kind: override.kind,
            sourceUrl:
              override.kind === "canonical-spdx-recovery"
                ? (override.canonicalTextSource ?? null)
                : override.sourceUrl,
            revision: override.revision,
            sourcePath: override.sourcePath,
            upstreamLegalTextAbsent: override.upstreamLegalTextAbsent,
          },
        },
      ];
    }
    const current = merged.get(id) ?? {
      name,
      version,
      license,
      author: metadataText(record.manifest.author),
      repository: repositoryText(record.manifest.repository),
      homepage: metadataText(record.manifest.homepage),
      manifestHashes: new Set<string>(),
      locations: new Set<string>(),
      licenseFiles: new Map<string, ReleaseLicenseFile>(),
      dependencies: new Set<string>(),
    };
    current.manifestHashes.add(sha256(record.manifestText));
    current.locations.add(relativeLocation(options.packageRoot, record.packageDirectory));
    for (const file of licenseFiles) current.licenseFiles.set(file.sha256, file);
    for (const dependencyDirectory of record.dependencyDirectories) {
      const dependencyId = directoryId.get(dependencyDirectory);
      if (dependencyId) current.dependencies.add(dependencyId);
    }
    merged.set(id, current);
  }

  const bundledRecords: Array<{
    readonly descriptor: (typeof SERVER_BUNDLED_WORKSPACE_COMPONENTS)[number];
    readonly manifest: PackageManifest;
    readonly id: string;
  }> = [];
  const serverManifestPath = join(options.repositoryRoot, "apps/server/package.json");
  const serverManifest = existsSync(serverManifestPath) ? readJson(serverManifestPath) : null;
  for (const descriptor of options.includeBundledWorkspaceComponents === false
    ? []
    : SERVER_BUNDLED_WORKSPACE_COMPONENTS) {
    if (!descriptor.includeInLegalClosure) continue;
    const manifestPath = join(options.repositoryRoot, descriptor.manifestPath);
    if (!existsSync(manifestPath)) continue;
    if (serverManifest?.dependencies?.[descriptor.name] !== "workspace:*") {
      throw new Error(
        `Bundled workspace component ${descriptor.name} is not an exact Server production dependency.`,
      );
    }
    const packageDirectory = dirname(manifestPath);
    const manifestText = readFileSync(manifestPath, "utf8");
    const manifest = readJson(manifestPath);
    const name = requiredString(manifest.name, "name", packageDirectory);
    const version = requiredString(manifest.version, "version", packageDirectory);
    if (name !== descriptor.name) {
      throw new Error(
        `Bundled workspace manifest identity mismatch: ${name} != ${descriptor.name}.`,
      );
    }
    const id = packageId(name, version);
    if (merged.has(id)) {
      throw new Error(
        `Bundled workspace component ${id} was also collected as an installed package.`,
      );
    }
    const license = metadataText(manifest.license) ?? "UNDECLARED";
    if (license === "UNDECLARED") {
      throw new Error(`Bundled workspace component ${id} has no declared license.`);
    }
    const sourceLicenseFiles = packageLicenseFiles(packageDirectory);
    if (sourceLicenseFiles.length === 0) {
      throw new Error(`Bundled workspace component ${id} has no source legal text.`);
    }
    const sourceDirectory = dirname(descriptor.manifestPath).replaceAll("\\", "/");
    merged.set(id, {
      name,
      version,
      license,
      author: metadataText(manifest.author),
      repository: repositoryText(manifest.repository),
      homepage: metadataText(manifest.homepage),
      manifestHashes: new Set([sha256(manifestText)]),
      locations: new Set([`bundled:${descriptor.runtimePath}`]),
      licenseFiles: new Map(
        sourceLicenseFiles.map((file) => [
          file.sha256,
          {
            ...file,
            provenance: {
              ...file.provenance,
              kind: "bundled-source" as const,
              sourcePath: `${sourceDirectory}/${file.name}`,
            },
          },
        ]),
      ),
      dependencies: new Set(),
    });
    bundledRecords.push({ descriptor, manifest, id });
  }

  for (const record of bundledRecords) {
    const component = merged.get(record.id)!;
    for (const dependencyName of Object.keys(record.manifest.dependencies ?? {}).toSorted()) {
      const dependencyIds = [...merged.keys()].filter((id) => id.startsWith(`${dependencyName}@`));
      if (dependencyIds.length === 0) {
        throw new Error(
          `Bundled workspace component ${record.id} requires missing ${dependencyName}.`,
        );
      }
      for (const dependencyId of dependencyIds) component.dependencies.add(dependencyId);
    }
  }

  const components = [...merged.values()]
    .map(
      (component): ReleaseDependencyComponent => ({
        name: component.name,
        version: component.version,
        id: packageId(component.name, component.version),
        license: component.license,
        author: component.author,
        repository: component.repository,
        homepage: component.homepage,
        manifestSha256: sha256([...component.manifestHashes].toSorted().join("\n")),
        locations: [...component.locations].toSorted(),
        licenseFiles: [...component.licenseFiles.values()].toSorted((left, right) =>
          left.name.localeCompare(right.name),
        ),
        dependencies: [...component.dependencies].toSorted(),
      }),
    )
    .toSorted((left, right) => left.id.localeCompare(right.id));

  const ids = new Set(components.map((component) => component.id));
  if (options.validateRequiredPiPackages !== false) {
    for (const piName of PI_PACKAGE_NAMES) {
      if (![...ids].some((id) => id.startsWith(`${piName}@`))) {
        throw new Error(`Release dependency closure omitted required Pi package ${piName}.`);
      }
    }
  }
  return {
    schemaVersion: 3,
    derivation: "installed-production-and-bundled-workspace-closure",
    target: options.target,
    componentCount: components.length,
    roots: [
      ...new Set([
        ...options.roots.map((root) => root.name),
        ...bundledRecords.map((record) => record.descriptor.name),
      ]),
    ].toSorted(),
    components,
  };
}

export function mergeBundledRuntimeInventory(
  installed: ReleaseDependencyInventory,
  bundled: ReleaseDependencyInventory,
  runtimePath: string,
): ReleaseDependencyInventory {
  const normalizedRuntimePath = runtimePath.replace(/^[/\\]+/u, "").replaceAll("\\", "/");
  if (
    !normalizedRuntimePath ||
    normalizedRuntimePath.split("/").includes("..") ||
    normalizedRuntimePath.endsWith("/")
  ) {
    throw new Error(`Bundled runtime receipt path is invalid: ${runtimePath}`);
  }
  if (
    installed.target.kind !== bundled.target.kind ||
    installed.target.platform !== bundled.target.platform ||
    installed.target.arch !== bundled.target.arch
  ) {
    throw new Error("Bundled runtime inventory target does not match the installed inventory.");
  }

  const components = new Map(installed.components.map((component) => [component.id, component]));
  for (const source of bundled.components) {
    const bundledComponent: ReleaseDependencyComponent = {
      ...source,
      locations: [`bundled:${normalizedRuntimePath}`],
    };
    const current = components.get(source.id);
    if (!current) {
      components.set(source.id, bundledComponent);
      continue;
    }
    if (
      current.name !== source.name ||
      current.version !== source.version ||
      current.license !== source.license ||
      current.manifestSha256 !== source.manifestSha256
    ) {
      throw new Error(`Bundled runtime identity conflicts with installed dependency ${source.id}.`);
    }
    const licenseFiles = new Map(
      [...current.licenseFiles, ...source.licenseFiles].map((file) => [file.sha256, file]),
    );
    components.set(source.id, {
      ...current,
      locations: [...new Set([...current.locations, ...bundledComponent.locations])].toSorted(),
      licenseFiles: [...licenseFiles.values()].toSorted((left, right) =>
        left.name.localeCompare(right.name),
      ),
      dependencies: [...new Set([...current.dependencies, ...source.dependencies])].toSorted(),
    });
  }

  const mergedComponents = [...components.values()].toSorted((left, right) =>
    left.id.localeCompare(right.id),
  );
  return {
    ...installed,
    componentCount: mergedComponents.length,
    roots: [...new Set([...installed.roots, ...bundled.roots])].toSorted(),
    components: mergedComponents,
  };
}

function purl(name: string, version: string): string {
  return `pkg:npm/${name.startsWith("@") ? `%40${name.slice(1)}` : name}@${version}`;
}

const CANONICAL_SPDX_IDS = new Map([
  ["mit", "MIT"],
  ["apache-2.0", "Apache-2.0"],
  ["bsd-2-clause", "BSD-2-Clause"],
  ["bsd-3-clause", "BSD-3-Clause"],
  ["isc", "ISC"],
  ["mpl-2.0", "MPL-2.0"],
] as const);

function cyclonedxLicense(
  license: string,
): { license: { id: string } } | { license: { name: string } } {
  const canonicalId = CANONICAL_SPDX_IDS.get(
    license.toLowerCase() as typeof CANONICAL_SPDX_IDS extends Map<infer K, string> ? K : never,
  );
  return canonicalId ? { license: { id: canonicalId } } : { license: { name: license } };
}

export function renderReleaseLegalMetadata(
  inventory: ReleaseDependencyInventory,
  appVersion: string,
): Record<
  typeof RELEASE_DEPENDENCY_INVENTORY_FILE | typeof RELEASE_SBOM_FILE | typeof RELEASE_NOTICES_FILE,
  string
> {
  const inventoryText = `${JSON.stringify(inventory, null, 2)}\n`;
  const appRef = `pkg:npm/omnimind-desktop@${appVersion}`;
  const sbom = {
    $schema: "https://cyclonedx.org/schema/bom-1.6.schema.json",
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    version: 1,
    metadata: {
      component: { type: "application", name: "OmniMind", version: appVersion, "bom-ref": appRef },
      properties: [
        { name: "omnimind:derivation", value: inventory.derivation },
        { name: "omnimind:target-kind", value: inventory.target.kind },
        { name: "omnimind:target-platform", value: inventory.target.platform },
        { name: "omnimind:target-arch", value: inventory.target.arch },
        { name: "omnimind:inventory-sha256", value: sha256(inventoryText) },
      ],
    },
    components: inventory.components.map((component) => ({
      type: "library",
      name: component.name,
      version: component.version,
      "bom-ref": purl(component.name, component.version),
      purl: purl(component.name, component.version),
      // Preserve the manifest-declared token in the inventory/notices, but only
      // emit controlled canonical SPDX identifiers into the CycloneDX field.
      licenses: [cyclonedxLicense(component.license)],
      hashes: [{ alg: "SHA-256", content: component.manifestSha256 }],
      ...(component.author ? { author: component.author } : {}),
      ...(component.repository
        ? { externalReferences: [{ type: "vcs", url: component.repository }] }
        : {}),
      properties: component.locations.map((location) => ({
        name: "omnimind:artifact-location",
        value: location,
      })),
    })),
    dependencies: [
      {
        ref: appRef,
        dependsOn: inventory.roots
          .flatMap((name) =>
            inventory.components
              .filter((component) => component.name === name)
              .map((component) => purl(component.name, component.version)),
          )
          .toSorted(),
      },
      ...inventory.components.map((component) => ({
        ref: purl(component.name, component.version),
        dependsOn: component.dependencies.map((dependency) => {
          const split = dependency.lastIndexOf("@");
          return purl(dependency.slice(0, split), dependency.slice(split + 1));
        }),
      })),
    ],
  };

  const notices: string[] = [
    "OmniMind third-party notices",
    "==============================",
    "",
    `Application version: ${appVersion}`,
    `Derivation: ${inventory.derivation}`,
    `Target: ${inventory.target.kind} ${inventory.target.platform}/${inventory.target.arch}`,
    `Installed production components: ${inventory.componentCount}`,
    "",
    ...(inventory.target.kind === "release-target"
      ? [
          "This file is generated from package manifests and license files in the exact installed",
          "dependency closure used as Electron packaging input. The packaged app is checked against",
          "the sibling release-dependencies.json before a release artifact is accepted.",
        ]
      : [
          "This checked-in copy is a development-host snapshot for local browsing and source checks.",
          "Each release target regenerates these files from its staged dependency closure and is",
          "accepted only after the resulting inventory exactly matches that target's packaged ASAR.",
        ]),
    "",
  ];
  for (const component of inventory.components) {
    notices.push(component.id, "-".repeat(component.id.length));
    notices.push(`License: ${component.license}`);
    if (component.author) notices.push(`Author/copyright attribution: ${component.author}`);
    if (component.repository) notices.push(`Source: ${component.repository}`);
    if (component.homepage) notices.push(`Homepage: ${component.homepage}`);
    notices.push(`Packaged location(s): ${component.locations.join(", ")}`);
    for (const file of component.licenseFiles) {
      const provenance = file.provenance;
      notices.push(
        "",
        `Legal text provenance: ${provenance.kind}`,
        `Legal source: ${
          provenance.sourceUrl ??
          `${provenance.kind === "bundled-source" ? "source" : "packaged"} ${provenance.sourcePath}`
        }`,
        `Upstream legal text absent: ${provenance.upstreamLegalTextAbsent ? "yes" : "no"}`,
        `[${file.name}; SHA-256 ${file.sha256}]`,
        file.text,
      );
    }
    notices.push("", "");
  }

  return {
    [RELEASE_DEPENDENCY_INVENTORY_FILE]: inventoryText,
    [RELEASE_SBOM_FILE]: `${JSON.stringify(sbom, null, 2)}\n`,
    [RELEASE_NOTICES_FILE]: `${notices.join("\n").trimEnd()}\n`,
  };
}

function resolveDependencyRootsFromManifests(
  packageRoot: string,
  workspaceManifests: ReadonlyArray<string>,
): ReleaseDependencyRoot[] {
  const existingWorkspaceManifests = workspaceManifests.filter(existsSync);
  const manifests =
    existingWorkspaceManifests.length > 0
      ? existingWorkspaceManifests
      : [join(packageRoot, "package.json")];
  const roots: ReleaseDependencyRoot[] = [];
  for (const manifestPath of manifests) {
    const manifest = readJson(manifestPath);
    for (const [name, specification] of Object.entries(manifest.dependencies ?? {}).toSorted(
      ([left], [right]) => left.localeCompare(right),
    )) {
      if (name === "electron" || String(specification).startsWith("workspace:")) continue;
      roots.push({ name, fromDirectory: dirname(manifestPath) });
    }
  }
  return roots;
}

export function resolveReleaseDependencyRoots(packageRoot: string): ReleaseDependencyRoot[] {
  return resolveDependencyRootsFromManifests(packageRoot, [
    join(packageRoot, "apps/server/package.json"),
    join(packageRoot, "apps/desktop/package.json"),
    join(packageRoot, "apps/web/package.json"),
  ]);
}

export function writeReleaseLegalMetadata(options: {
  readonly packageRoot: string;
  readonly repositoryRoot: string;
  readonly outputDirectory: string;
  readonly appVersion: string;
  readonly target: ReleaseDependencyInventory["target"];
  readonly bundledWebRuntimePath?: string;
}): ReleaseDependencyInventory {
  let inventory = collectReleaseDependencyInventory({
    packageRoot: options.packageRoot,
    roots: resolveReleaseDependencyRoots(options.packageRoot),
    repositoryRoot: options.repositoryRoot,
    target: options.target,
  });
  if (options.bundledWebRuntimePath) {
    const webManifestPath = join(options.repositoryRoot, "apps/web/package.json");
    if (!existsSync(webManifestPath)) {
      throw new Error("Bundled Web legal closure requires apps/web/package.json.");
    }
    const webInventory = collectReleaseDependencyInventory({
      packageRoot: options.repositoryRoot,
      roots: resolveDependencyRootsFromManifests(options.repositoryRoot, [webManifestPath]),
      repositoryRoot: options.repositoryRoot,
      target: options.target,
      includeBundledWorkspaceComponents: false,
      validateRequiredPiPackages: false,
    });
    inventory = mergeBundledRuntimeInventory(
      inventory,
      webInventory,
      options.bundledWebRuntimePath,
    );
  }
  const rendered = renderReleaseLegalMetadata(inventory, options.appVersion);
  mkdirSync(options.outputDirectory, { recursive: true });
  for (const [name, text] of Object.entries(rendered)) {
    writeFileSync(join(options.outputDirectory, name), text);
  }
  return inventory;
}
