// FILE: oaEcosystem.ts
// Purpose: Typed HarnessOS Agent package/resource lifecycle bridge.
// Layer: Shared contracts

import { Schema } from "effect";

import { ThreadId, TrimmedNonEmptyString } from "./baseSchemas";

const NPM_PACKAGE_SOURCE =
  /^npm:(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)(?:@[a-z0-9*+._~^<>=|-]+)?$/iu;

function isPublicPackageSource(source: string): boolean {
  return NPM_PACKAGE_SOURCE.test(source);
}

const PackageInstallSource = TrimmedNonEmptyString.check(
  Schema.isMaxLength(2_048),
  Schema.makeFilter<string>((source) => isPublicPackageSource(source)),
);
const PackageId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-f0-9]{64}$/u),
);
function isPublicResourcePath(value: string): boolean {
  if (value === "." || value.startsWith("/") || value.includes("\\")) return false;
  if (value.split("/").some((segment) => segment === "..")) return false;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 31 || (codePoint >= 127 && codePoint <= 159)) return false;
  }
  return true;
}

const ResourcePath = TrimmedNonEmptyString.check(
  Schema.isMaxLength(2_048),
  Schema.makeFilter<string>((value) => isPublicResourcePath(value)),
);

export const HarnessOSPackageResourceType = Schema.Literals([
  "extensions",
  "skills",
  "prompts",
  "themes",
]);
export type HarnessOSPackageResourceType = typeof HarnessOSPackageResourceType.Type;

export const HarnessOSPackageKind = Schema.Literals(["npm", "git", "local", "unsupported"]);
export type HarnessOSPackageKind = typeof HarnessOSPackageKind.Type;

export const HarnessOSPackageDescriptor = Schema.Struct({
  packageId: PackageId,
  displayName: TrimmedNonEmptyString.check(Schema.isMaxLength(512)),
  kind: HarnessOSPackageKind,
  installed: Schema.Boolean,
  filtered: Schema.Boolean,
  manageable: Schema.Boolean,
  updateAvailable: Schema.optional(Schema.Boolean),
});
export type HarnessOSPackageDescriptor = typeof HarnessOSPackageDescriptor.Type;

export const HarnessOSPackageResourceDescriptor = Schema.Struct({
  packageId: PackageId,
  resourceType: HarnessOSPackageResourceType,
  resourcePath: ResourcePath,
  enabled: Schema.Boolean,
});
export type HarnessOSPackageResourceDescriptor = typeof HarnessOSPackageResourceDescriptor.Type;

const Packages = Schema.Array(HarnessOSPackageDescriptor).check(Schema.isMaxLength(512));
const Resources = Schema.Array(HarnessOSPackageResourceDescriptor).check(Schema.isMaxLength(8_192));

export const OAEcosystemSnapshot = Schema.Struct({
  packages: Packages,
});
export type OAEcosystemSnapshot = typeof OAEcosystemSnapshot.Type;

export const OAEcosystemListInput = Schema.Struct({
  checkUpdates: Schema.optional(Schema.Boolean),
});
export type OAEcosystemListInput = typeof OAEcosystemListInput.Type;

export const OAEcosystemInstallInput = Schema.Struct({
  source: PackageInstallSource,
});
export type OAEcosystemInstallInput = typeof OAEcosystemInstallInput.Type;

export const OAEcosystemPackageInput = Schema.Struct({
  packageId: PackageId,
});
export type OAEcosystemPackageInput = typeof OAEcosystemPackageInput.Type;

export const OAEcosystemListResourcesResult = Schema.Struct({
  resources: Resources,
});
export type OAEcosystemListResourcesResult = typeof OAEcosystemListResourcesResult.Type;

export const OAEcosystemResourceToggleInput = Schema.Struct({
  packageId: PackageId,
  resourceType: HarnessOSPackageResourceType,
  resourcePath: ResourcePath,
  enabled: Schema.Boolean,
});
export type OAEcosystemResourceToggleInput = typeof OAEcosystemResourceToggleInput.Type;

export const OAEcosystemMutationResult = Schema.Struct({
  changed: Schema.Boolean,
  snapshot: OAEcosystemSnapshot,
});
export type OAEcosystemMutationResult = typeof OAEcosystemMutationResult.Type;

export const OAEcosystemReloadInput = Schema.Struct({
  threadId: ThreadId,
});
export type OAEcosystemReloadInput = typeof OAEcosystemReloadInput.Type;
export const OAEcosystemReloadResult = Schema.Struct({
  state: Schema.Literals(["reloaded", "no_active_session", "different_engine", "busy"]),
});
export type OAEcosystemReloadResult = typeof OAEcosystemReloadResult.Type;
