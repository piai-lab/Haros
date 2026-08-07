import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  channelManifestNames,
  prepareReleaseUpdateManifests,
  resolveReleaseUpdatePolicy,
  type ReleaseUpdatePolicyConfig,
} from "./lib/release-update-policy";

const releaseConfig: ReleaseUpdatePolicyConfig = {
  channel: "omnimind",
};
const defaultManifestNames = ["latest-mac.yml", "latest.yml", "latest-linux.yml"] as const;

describe("release update policy", () => {
  it("publishes stable releases to Latest and keeps prereleases off it", () => {
    expect(resolveReleaseUpdatePolicy("v1.0.0", releaseConfig)).toMatchObject({
      tag: "v1.0.0",
      makeLatest: true,
      mirrorToStableChannel: false,
      channel: "omnimind",
    });
    expect(resolveReleaseUpdatePolicy("1.1.0-beta.1", releaseConfig)).toMatchObject({
      isPrerelease: true,
      makeLatest: false,
      mirrorToStableChannel: false,
    });
  });

  it("rejects invalid release versions", () => {
    expect(() => resolveReleaseUpdatePolicy("1.0.0.not-semver", releaseConfig)).toThrow(
      "Invalid release version",
    );
  });

  it("keeps clean release metadata on Latest and dedicated channel filenames", () => {
    const root = mkdtempSync(join(tmpdir(), "omnimind-release-policy-"));
    try {
      mkdirSync(root, { recursive: true });
      for (const name of defaultManifestNames) {
        writeFileSync(resolve(root, name), name);
      }

      expect(prepareReleaseUpdateManifests(root, releaseConfig)).toEqual([
        ...defaultManifestNames,
        ...channelManifestNames("omnimind"),
      ]);
      for (const name of defaultManifestNames) {
        expect(readFileSync(resolve(root, name), "utf8")).toBe(name);
      }
      for (const [index, channelName] of channelManifestNames("omnimind").entries()) {
        const defaultName = defaultManifestNames[index];
        if (!defaultName) throw new Error(`Missing default manifest mapping for ${channelName}`);
        expect(readFileSync(resolve(root, channelName), "utf8")).toBe(
          readFileSync(resolve(root, defaultName), "utf8"),
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses to overwrite an existing channel manifest", () => {
    const root = mkdtempSync(join(tmpdir(), "omnimind-release-policy-"));
    try {
      for (const name of defaultManifestNames) {
        writeFileSync(resolve(root, name), "current");
      }
      writeFileSync(resolve(root, "omnimind-mac.yml"), "existing");

      expect(() => prepareReleaseUpdateManifests(root, releaseConfig)).toThrow(
        "Refusing to overwrite existing update manifest: omnimind-mac.yml",
      );
      expect(existsSync(resolve(root, "omnimind.yml"))).toBe(false);
      expect(existsSync(resolve(root, "omnimind-linux.yml"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a Latest release with missing default metadata", () => {
    const root = mkdtempSync(join(tmpdir(), "omnimind-release-policy-"));
    try {
      writeFileSync(resolve(root, "latest-mac.yml"), "current");

      expect(() => prepareReleaseUpdateManifests(root, releaseConfig)).toThrow(
        "Latest release is missing update manifests: latest.yml, latest-linux.yml",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
