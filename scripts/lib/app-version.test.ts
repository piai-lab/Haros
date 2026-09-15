import { describe, expect, it } from "vitest";

import {
  isPackagedAppVersion,
  listExactVersionTags,
  parseVersionTag,
  requireUniqueHeadVersion,
  resolvePackagedAppVersion,
} from "./app-version.ts";

describe("packaged app version tags", () => {
  it("accepts exact v-prefixed semver tags and ignores others", () => {
    expect(parseVersionTag("v0.1.0-alpha.1")).toEqual({
      tag: "v0.1.0-alpha.1",
      version: "0.1.0-alpha.1",
    });
    expect(parseVersionTag(" v1.2.3 ")).toEqual({ tag: "v1.2.3", version: "1.2.3" });
    expect(parseVersionTag("harnessos-fork-base")).toBeNull();
    expect(parseVersionTag("0.1.0-alpha.1")).toBeNull();
    expect(parseVersionTag("v0.1.0-alpha.1-g2c434575")).toBeNull();
    expect(parseVersionTag("v0.1.0-12-g2c434575")).toBeNull();
    expect(parseVersionTag("v1.2")).toBeNull();
  });

  it("rejects malformed prerelease strings", () => {
    expect(isPackagedAppVersion("0.1.0-alpha.1")).toBe(true);
    expect(isPackagedAppVersion("0.1.0-")).toBe(false);
    expect(isPackagedAppVersion("0.1.0.")).toBe(false);
    expect(isPackagedAppVersion("0.1..0")).toBe(false);
  });

  it("requires exactly one version tag on HEAD", () => {
    expect(
      listExactVersionTags(["harnessos-fork-base", "v0.1.0-alpha.1", "v0.1.0-alpha.1"]),
    ).toEqual([{ tag: "v0.1.0-alpha.1", version: "0.1.0-alpha.1" }]);
    expect(requireUniqueHeadVersion(["v0.1.0-alpha.1"]).version).toBe("0.1.0-alpha.1");
    expect(() => requireUniqueHeadVersion(["harnessos-fork-base"])).toThrow("no version tag");
    expect(() => requireUniqueHeadVersion(["v0.1.0-alpha.1", "v0.1.0-alpha.2"])).toThrow(
      "multiple version tags",
    );
  });

  it("prefers an explicit version, then a unique HEAD tag, then the package fallback", () => {
    expect(
      resolvePackagedAppVersion({
        explicitVersion: "0.1.0-alpha.9",
        headTags: ["v0.1.0-alpha.1"],
        allowPackageFallback: false,
        packageVersion: "0.1.0-alpha.0",
      }),
    ).toBe("0.1.0-alpha.9");
    expect(
      resolvePackagedAppVersion({
        explicitVersion: undefined,
        headTags: ["v0.1.0-alpha.1"],
        allowPackageFallback: false,
        packageVersion: "0.1.0-alpha.0",
      }),
    ).toBe("0.1.0-alpha.1");
    expect(
      resolvePackagedAppVersion({
        explicitVersion: undefined,
        headTags: [],
        allowPackageFallback: true,
        packageVersion: "0.1.0-alpha.0",
      }),
    ).toBe("0.1.0-alpha.0");
    expect(() =>
      resolvePackagedAppVersion({
        explicitVersion: "not-a-version",
        headTags: [],
        allowPackageFallback: false,
        packageVersion: "0.1.0-alpha.0",
      }),
    ).toThrow("semver packaged version");
  });
});
