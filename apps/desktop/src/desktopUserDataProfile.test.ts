import { describe, expect, it } from "vitest";

import { resolveDesktopAppDataBase, resolveDesktopUserDataPath } from "./desktopUserDataProfile";

describe("desktopUserDataProfile", () => {
  it("resolves the canonical OmniMind profile names", () => {
    const appDataBase = "/Users/tester/Library/Application Support";
    expect(resolveDesktopUserDataPath({ appDataBase, userDataDirectoryName: "omnimind-dev" })).toBe(
      "/Users/tester/Library/Application Support/omnimind-dev",
    );
    expect(resolveDesktopUserDataPath({ appDataBase, userDataDirectoryName: "omnimind" })).toBe(
      "/Users/tester/Library/Application Support/omnimind",
    );
    expect(
      resolveDesktopUserDataPath({ appDataBase, userDataDirectoryName: "omnimind-canary" }),
    ).toBe("/Users/tester/Library/Application Support/omnimind-canary");
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

  it("keeps Electron profile state under an explicit OmniMind home", () => {
    expect(
      resolveDesktopUserDataPath({
        appDataBase: "/Users/tester/Library/Application Support",
        userDataDirectoryName: "omnimind-dev",
        productHome: "/tmp/product/.omnimind",
      }),
    ).toBe("/tmp/product/.omnimind/electron/omnimind-dev");
  });
});
