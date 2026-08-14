// FILE: omnimindEcosystem.ts
// Purpose: Typed OmniMind Agent package/resource lifecycle bridge.
// Layer: Shared contracts

import { Schema } from "effect";

import { TrimmedNonEmptyString } from "./baseSchemas";

const NPM_PACKAGE_SOURCE =
  /^npm:(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)(?:@[a-z0-9*+._~^<>=|-]+)?$/iu;

function isPublicPackageSource(source: string): boolean {
  if (NPM_PACKAGE_SOURCE.test(source)) return true;
  if (!source.startsWith("git:https://")) return false;
  try {
    const url = new URL(source.slice("git:".length));
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === "" &&
      url.port === "" &&
      url.pathname.length > 1 &&
      url.hostname !== "localhost" &&
      !url.hostname.endsWith(".local") &&
      !/^\d+(?:\.\d+){3}$/u.test(url.hostname)
    );
  } catch {
    return false;
  }
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

export const OmniMindPackageResourceType = Schema.Literals([
  "extensions",
  "skills",
  "prompts",
  "themes",
]);
export type OmniMindPackageResourceType = typeof OmniMindPackageResourceType.Type;

export const OmniMindPackageKind = Schema.Literals(["npm", "git", "local", "unsupported"]);
export type OmniMindPackageKind = typeof OmniMindPackageKind.Type;

export const OmniMindPackageDescriptor = Schema.Struct({
  packageId: PackageId,
  displayName: TrimmedNonEmptyString.check(Schema.isMaxLength(512)),
  kind: OmniMindPackageKind,
  installed: Schema.Boolean,
  filtered: Schema.Boolean,
  manageable: Schema.Boolean,
  updateAvailable: Schema.optional(Schema.Boolean),
});
export type OmniMindPackageDescriptor = typeof OmniMindPackageDescriptor.Type;

export const OmniMindPackageResourceDescriptor = Schema.Struct({
  packageId: PackageId,
  resourceType: OmniMindPackageResourceType,
  resourcePath: ResourcePath,
  enabled: Schema.Boolean,
});
export type OmniMindPackageResourceDescriptor = typeof OmniMindPackageResourceDescriptor.Type;

const Packages = Schema.Array(OmniMindPackageDescriptor).check(Schema.isMaxLength(512));
const Resources = Schema.Array(OmniMindPackageResourceDescriptor).check(Schema.isMaxLength(8_192));

export const OmniMindEcosystemSnapshot = Schema.Struct({
  packages: Packages,
});
export type OmniMindEcosystemSnapshot = typeof OmniMindEcosystemSnapshot.Type;

export const OmniMindEcosystemListInput = Schema.Struct({
  checkUpdates: Schema.optional(Schema.Boolean),
});
export type OmniMindEcosystemListInput = typeof OmniMindEcosystemListInput.Type;

export const OmniMindEcosystemInstallInput = Schema.Struct({
  source: PackageInstallSource,
});
export type OmniMindEcosystemInstallInput = typeof OmniMindEcosystemInstallInput.Type;

export const OmniMindEcosystemPackageInput = Schema.Struct({
  packageId: PackageId,
});
export type OmniMindEcosystemPackageInput = typeof OmniMindEcosystemPackageInput.Type;

export const OmniMindEcosystemListResourcesResult = Schema.Struct({
  resources: Resources,
});
export type OmniMindEcosystemListResourcesResult = typeof OmniMindEcosystemListResourcesResult.Type;

export const OmniMindEcosystemResourceToggleInput = Schema.Struct({
  packageId: PackageId,
  resourceType: OmniMindPackageResourceType,
  resourcePath: ResourcePath,
  enabled: Schema.Boolean,
});
export type OmniMindEcosystemResourceToggleInput = typeof OmniMindEcosystemResourceToggleInput.Type;

export const OmniMindEcosystemMutationResult = Schema.Struct({
  changed: Schema.Boolean,
  snapshot: OmniMindEcosystemSnapshot,
});
export type OmniMindEcosystemMutationResult = typeof OmniMindEcosystemMutationResult.Type;

export const OmniMindEcosystemReloadInput = Schema.Struct({});
export const OmniMindEcosystemReloadResult = Schema.Struct({
  reloaded: Schema.Boolean,
});
export type OmniMindEcosystemReloadResult = typeof OmniMindEcosystemReloadResult.Type;
