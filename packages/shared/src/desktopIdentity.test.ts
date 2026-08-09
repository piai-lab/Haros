import { describe, expect, it } from "vitest";

import {
  resolveOmniMindDesktopFlavor,
  OMNIMIND_CANARY_BUNDLE_ID,
  OMNIMIND_CANARY_DESKTOP_ENTRY_URL,
  OMNIMIND_CANARY_DESKTOP_ORIGIN,
  OMNIMIND_DESKTOP_ENTRY_URL,
  OMNIMIND_DESKTOP_ORIGIN,
  OMNIMIND_DESKTOP_UPDATE_CHANNEL,
  OMNIMIND_DEVELOPMENT_BUNDLE_ID,
  OMNIMIND_PRODUCTION_BUNDLE_ID,
  omnimindBundleId,
  omnimindDesktopIdentity,
} from "./desktopIdentity";

describe("desktopIdentity", () => {
  it("uses the exact canonical production and development bundle IDs", () => {
    expect(OMNIMIND_PRODUCTION_BUNDLE_ID).toBe("app.omnimind.desktop");
    expect(OMNIMIND_DEVELOPMENT_BUNDLE_ID).toBe("app.omnimind.desktop.dev");
    expect(omnimindBundleId(false)).toBe(OMNIMIND_PRODUCTION_BUNDLE_ID);
    expect(omnimindBundleId(true)).toBe(OMNIMIND_DEVELOPMENT_BUNDLE_ID);
  });

  it("uses the exact packaged renderer origin and entry URL", () => {
    expect(OMNIMIND_DESKTOP_ORIGIN).toBe("omnimind://app");
    expect(OMNIMIND_DESKTOP_ENTRY_URL).toBe("omnimind://app/index.html");
  });

  it("uses the isolated OmniMind desktop update channel", () => {
    expect(OMNIMIND_DESKTOP_UPDATE_CHANNEL).toBe("omnimind");
  });

  it("gives Canary a fully separate desktop identity and storage profile", () => {
    expect(OMNIMIND_CANARY_BUNDLE_ID).toBe("app.omnimind.desktop.canary");
    expect(OMNIMIND_CANARY_DESKTOP_ORIGIN).toBe("omnimind-canary://app");
    expect(OMNIMIND_CANARY_DESKTOP_ENTRY_URL).toBe("omnimind-canary://app/index.html");
    expect(omnimindDesktopIdentity("canary")).toEqual({
      flavor: "canary",
      displayName: "OmniMind Canary",
      bundleId: OMNIMIND_CANARY_BUNDLE_ID,
      scheme: "omnimind-canary",
      origin: OMNIMIND_CANARY_DESKTOP_ORIGIN,
      entryUrl: OMNIMIND_CANARY_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "omnimind-canary",
      defaultHomeDirectoryName: ".omnimind-canary",
      usesScriptedUpdates: true,
    });
  });

  it("selects Canary explicitly without changing normal dev and production defaults", () => {
    expect(resolveOmniMindDesktopFlavor({ isDevelopment: false })).toBe("production");
    expect(resolveOmniMindDesktopFlavor({ isDevelopment: true })).toBe("development");
    expect(
      resolveOmniMindDesktopFlavor({ isDevelopment: false, requestedFlavor: " canary " }),
    ).toBe("canary");
    expect(resolveOmniMindDesktopFlavor({ isDevelopment: true, requestedFlavor: "canary" })).toBe(
      "canary",
    );
  });
});
