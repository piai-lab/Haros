import { describe, expect, it } from "vitest";

import {
  desktopAppIconResourceName,
  isDesktopAppIcon,
  shouldUpdateDesktopAppIcon,
} from "./desktopAppIcon";

describe("desktop app icons", () => {
  it("accepts only supported preferences", () => {
    expect(isDesktopAppIcon("default")).toBe(true);
    expect(isDesktopAppIcon("icon")).toBe(true);
    expect(isDesktopAppIcon("dark")).toBe(true);
    expect(isDesktopAppIcon("unknown")).toBe(false);
  });

  it("selects the alternate native asset on every desktop platform", () => {
    expect(
      desktopAppIconResourceName({
        icon: "icon",
        platform: "darwin",
        useLegacyMacDefault: false,
        isDarkAppearance: false,
      }),
    ).toBe("app-icon-macos.png");
    expect(
      desktopAppIconResourceName({
        icon: "icon",
        platform: "win32",
        useLegacyMacDefault: false,
        isDarkAppearance: false,
      }),
    ).toBe("app-icon-windows.ico");
    expect(
      desktopAppIconResourceName({
        icon: "icon",
        platform: "linux",
        useLegacyMacDefault: false,
        isDarkAppearance: false,
      }),
    ).toBe("app-icon-linux.png");
  });

  it("keeps the legacy macOS default compatible with older releases", () => {
    expect(
      desktopAppIconResourceName({
        icon: "default",
        platform: "darwin",
        useLegacyMacDefault: true,
        isDarkAppearance: false,
      }),
    ).toBe("dock-icon.png");
    expect(
      desktopAppIconResourceName({
        icon: "default",
        platform: "darwin",
        useLegacyMacDefault: false,
        isDarkAppearance: false,
      }),
    ).toBe("icon.icns");
  });

  it("uses HarnessOS dark artwork for macOS dark appearance and explicit preference", () => {
    expect(
      desktopAppIconResourceName({
        icon: "default",
        platform: "darwin",
        useLegacyMacDefault: false,
        isDarkAppearance: true,
      }),
    ).toBe("dock-icon-dark.png");
    expect(
      desktopAppIconResourceName({
        icon: "dark",
        platform: "darwin",
        useLegacyMacDefault: false,
        isDarkAppearance: false,
      }),
    ).toBe("dock-icon-dark.png");
  });

  it("falls back to each platform default for the mac-only dark preference", () => {
    expect(
      desktopAppIconResourceName({
        icon: "dark",
        platform: "linux",
        useLegacyMacDefault: false,
        isDarkAppearance: false,
      }),
    ).toBe("icon.png");
    expect(
      desktopAppIconResourceName({
        icon: "dark",
        platform: "win32",
        useLegacyMacDefault: false,
        isDarkAppearance: false,
      }),
    ).toBe("icon.ico");
  });

  it("does not reapply the icon when renderer hydration matches native state", () => {
    expect(shouldUpdateDesktopAppIcon("default", "default")).toBe(false);
    expect(shouldUpdateDesktopAppIcon("icon", "icon")).toBe(false);
    expect(shouldUpdateDesktopAppIcon("default", "icon")).toBe(true);
    expect(shouldUpdateDesktopAppIcon("icon", "default")).toBe(true);
    expect(shouldUpdateDesktopAppIcon("dark", "dark")).toBe(false);
    expect(shouldUpdateDesktopAppIcon("default", "dark")).toBe(true);
  });
});
