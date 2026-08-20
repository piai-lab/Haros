// FILE: release-version.ts
// Purpose: Normalizes and validates the version used by build-only release jobs.

const RELEASE_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export interface ResolvedReleaseVersion {
  readonly version: string;
  readonly tag: string;
}

export function resolveReleaseVersion(rawVersion: string): ResolvedReleaseVersion {
  const version = rawVersion.startsWith("v") ? rawVersion.slice(1) : rawVersion;
  if (!RELEASE_VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid release version: ${rawVersion}`);
  }
  return { version, tag: `v${version}` };
}
