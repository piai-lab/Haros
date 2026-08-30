import { describe, expect, it } from "vitest";

import { resolveDesktopAppDataBase, resolveDesktopUserDataPath } from "./desktopUserDataProfile";

describe("desktopUserDataProfile", () => {
  it("resolves the canonical Haros profile names", () => {
    const appDataBase = "/Users/tester/Library/Application Support";
    expect(
      resolveDesktopUserDataPath({ appDataBase, userDataDirectoryName: "harnessos-dev" }),
    ).toBe("/Users/tester/Library/Application Support/harnessos-dev");
    expect(resolveDesktopUserDataPath({ appDataBase, userDataDirectoryName: "harnessos" })).toBe(
      "/Users/tester/Library/Application Support/harnessos",
    );
    expect(
      resolveDesktopUserDataPath({ appDataBase, userDataDirectoryName: "harnessos-canary" }),
    ).toBe("/Users/tester/Library/Application Support/harnessos-canary");
  });

  it("uses XDG_CONFIG_HOME on Linux when available", () => {
    expect(
      resolveDesktopAppDataBase({
        platform: "linux",
        env: { XDG_CONFIG_HOME: "/tmp/xdg" },
        homeDir: "/home/tester",
      }),
    ).toBe("/tmp/xdg");
  });

  it("keeps Electron profile state under an explicit Haros home", () => {
    expect(
      resolveDesktopUserDataPath({
        appDataBase: "/Users/tester/Library/Application Support",
        userDataDirectoryName: "harnessos-dev",
        productHome: "/tmp/product/.harnessos",
      }),
    ).toBe("/tmp/product/.harnessos/electron/harnessos-dev");
  });
});
