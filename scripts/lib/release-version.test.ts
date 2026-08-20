import { describe, expect, it } from "vitest";

import { resolveReleaseVersion } from "./release-version";

describe("resolveReleaseVersion", () => {
  it("normalizes stable and prerelease build versions", () => {
    expect(resolveReleaseVersion("v1.2.3")).toEqual({ version: "1.2.3", tag: "v1.2.3" });
    expect(resolveReleaseVersion("0.1.0-alpha.0")).toEqual({
      version: "0.1.0-alpha.0",
      tag: "v0.1.0-alpha.0",
    });
  });

  it("rejects non-release inputs", () => {
    expect(() => resolveReleaseVersion("1.2.3.4")).toThrow("Invalid release version");
    expect(() => resolveReleaseVersion("release-1.2.3")).toThrow("Invalid release version");
  });
});
