// FILE: release-update-policy.ts
// Purpose: Publishes stable releases through GitHub Latest while retaining the packaged app's
// dedicated `omnimind` channel aliases.

import { constants, copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ReleaseUpdatePolicyConfig {
  readonly channel: string;
}

export interface ResolvedReleaseUpdatePolicy {
  readonly version: string;
  readonly tag: string;
  readonly isPrerelease: boolean;
  readonly makeLatest: boolean;
  readonly mirrorToStableChannel: boolean;
  readonly channel: string;
}

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const CHANNEL_PATTERN = /^[a-z0-9-]+$/;

function parseVersion(value: string): { isPrerelease: boolean } {
  const match = VERSION_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid release version: ${value}`);
  return {
    isPrerelease: match[4] !== undefined,
  };
}

export function validateReleaseUpdatePolicyConfig(config: unknown): ReleaseUpdatePolicyConfig {
  if (typeof config !== "object" || config === null) {
    throw new Error("Release update policy must be an object.");
  }
  const candidate = config as Partial<ReleaseUpdatePolicyConfig>;
  if (
    typeof candidate.channel !== "string" ||
    !CHANNEL_PATTERN.test(candidate.channel) ||
    candidate.channel === "latest"
  ) {
    throw new Error(`Invalid dedicated update channel: ${String(candidate.channel)}`);
  }
  return candidate as ReleaseUpdatePolicyConfig;
}

export function readReleaseUpdatePolicyConfig(rootDirectory: string): ReleaseUpdatePolicyConfig {
  const path = resolve(rootDirectory, "scripts/release-update-policy.json");
  return validateReleaseUpdatePolicyConfig(JSON.parse(readFileSync(path, "utf8")) as unknown);
}

export function resolveReleaseUpdatePolicy(
  rawVersion: string,
  config: ReleaseUpdatePolicyConfig,
): ResolvedReleaseUpdatePolicy {
  const normalizedConfig = validateReleaseUpdatePolicyConfig(config);
  const version = rawVersion.startsWith("v") ? rawVersion.slice(1) : rawVersion;
  const requested = parseVersion(version);

  return {
    version,
    tag: `v${version}`,
    isPrerelease: requested.isPrerelease,
    makeLatest: !requested.isPrerelease,
    mirrorToStableChannel: false,
    channel: normalizedConfig.channel,
  };
}

export function channelManifestNames(channel: string): readonly string[] {
  if (!CHANNEL_PATTERN.test(channel) || channel === "latest") {
    throw new Error(`Invalid dedicated update channel: ${channel}`);
  }
  return [`${channel}-mac.yml`, `${channel}.yml`, `${channel}-linux.yml`];
}

function copyChannelManifests(
  assetDirectory: string,
  sourceNames: readonly string[],
  destinationNames: readonly string[],
): void {
  const existing = destinationNames.filter((name) => existsSync(resolve(assetDirectory, name)));
  if (existing.length > 0) {
    throw new Error(`Refusing to overwrite existing update manifest: ${existing.join(", ")}`);
  }
  for (const [index, sourceName] of sourceNames.entries()) {
    const destinationName = destinationNames[index];
    if (!destinationName) throw new Error(`Missing channel manifest mapping for ${sourceName}.`);
    copyFileSync(
      resolve(assetDirectory, sourceName),
      resolve(assetDirectory, destinationName),
      constants.COPYFILE_EXCL,
    );
  }
}

export function prepareReleaseUpdateManifests(
  assetDirectory: string,
  config: ReleaseUpdatePolicyConfig,
): readonly string[] {
  const normalizedConfig = validateReleaseUpdatePolicyConfig(config);
  const sourceNames = ["latest-mac.yml", "latest.yml", "latest-linux.yml"] as const;
  const destinationNames = channelManifestNames(normalizedConfig.channel);
  const missing = sourceNames.filter((name) => !existsSync(resolve(assetDirectory, name)));
  if (missing.length > 0) {
    throw new Error(`Latest release is missing update manifests: ${missing.join(", ")}`);
  }
  // Stable releases are GitHub Latest, but shipped desktop binaries still
  // request the dedicated `omnimind` channel. Keep both filenames in the same
  // release so existing installations and new Latest installs use the same feed.
  copyChannelManifests(assetDirectory, sourceNames, destinationNames);
  return [...sourceNames, ...destinationNames];
}
