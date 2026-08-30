import { describe, expect, it } from "vitest";

import {
  resolveHarosDesktopFlavor,
  HARNESSOS_CANARY_BUNDLE_ID,
  HARNESSOS_CANARY_DESKTOP_ENTRY_URL,
  HARNESSOS_CANARY_DESKTOP_ORIGIN,
  HARNESSOS_DESKTOP_ENTRY_URL,
  HARNESSOS_DESKTOP_ORIGIN,
  HARNESSOS_DEVELOPMENT_BUNDLE_ID,
  HARNESSOS_PRODUCTION_BUNDLE_ID,
  harnessOSBundleId,
  harnessOSDesktopIdentity,
} from "./desktopIdentity";

describe("desktopIdentity", () => {
  it("uses the exact canonical production and development bundle IDs", () => {
    expect(HARNESSOS_PRODUCTION_BUNDLE_ID).toBe("ai.piai.harnessos");
    expect(HARNESSOS_DEVELOPMENT_BUNDLE_ID).toBe("ai.piai.harnessos.dev");
    expect(harnessOSBundleId(false)).toBe(HARNESSOS_PRODUCTION_BUNDLE_ID);
    expect(harnessOSBundleId(true)).toBe(HARNESSOS_DEVELOPMENT_BUNDLE_ID);
  });

  it("uses the exact packaged renderer origin and entry URL", () => {
    expect(HARNESSOS_DESKTOP_ORIGIN).toBe("harnessos://app");
    expect(HARNESSOS_DESKTOP_ENTRY_URL).toBe("harnessos://app/index.html");
  });

  it("gives Canary a fully separate desktop identity and storage profile", () => {
    expect(HARNESSOS_CANARY_BUNDLE_ID).toBe("ai.piai.harnessos.canary");
    expect(HARNESSOS_CANARY_DESKTOP_ORIGIN).toBe("harnessos-canary://app");
    expect(HARNESSOS_CANARY_DESKTOP_ENTRY_URL).toBe("harnessos-canary://app/index.html");
    expect(harnessOSDesktopIdentity("canary")).toEqual({
      flavor: "canary",
      displayName: "Haros Canary",
      bundleId: HARNESSOS_CANARY_BUNDLE_ID,
      scheme: "harnessos-canary",
      origin: HARNESSOS_CANARY_DESKTOP_ORIGIN,
      entryUrl: HARNESSOS_CANARY_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "harnessos-canary",
      defaultHomeDirectoryName: ".harnessos-canary",
      usesScriptedUpdates: true,
    });
  });

  it("selects Canary explicitly without changing normal dev and production defaults", () => {
    expect(resolveHarosDesktopFlavor({ isDevelopment: false })).toBe("production");
    expect(resolveHarosDesktopFlavor({ isDevelopment: true })).toBe("development");
    expect(resolveHarosDesktopFlavor({ isDevelopment: false, requestedFlavor: " canary " })).toBe(
      "canary",
    );
    expect(resolveHarosDesktopFlavor({ isDevelopment: true, requestedFlavor: "canary" })).toBe(
      "canary",
    );
  });
});
