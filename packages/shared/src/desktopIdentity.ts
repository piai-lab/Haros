// FILE: desktopIdentity.ts
// Purpose: Defines the canonical desktop application identity across packaging and runtime.

export const HARNESSOS_DESKTOP_SCHEME = "harnessos";
export const HARNESSOS_DESKTOP_ORIGIN = `${HARNESSOS_DESKTOP_SCHEME}://app`;
export const HARNESSOS_DESKTOP_ENTRY_URL = `${HARNESSOS_DESKTOP_ORIGIN}/index.html`;
export const HARNESSOS_PRODUCTION_BUNDLE_ID = "ai.piai.harnessos";
export const HARNESSOS_DEVELOPMENT_BUNDLE_ID = `${HARNESSOS_PRODUCTION_BUNDLE_ID}.dev`;
export const HARNESSOS_CANARY_BUNDLE_ID = `${HARNESSOS_PRODUCTION_BUNDLE_ID}.canary`;
export const HARNESSOS_CANARY_DESKTOP_SCHEME = "harnessos-canary";
export const HARNESSOS_CANARY_DESKTOP_ORIGIN = `${HARNESSOS_CANARY_DESKTOP_SCHEME}://app`;
export const HARNESSOS_CANARY_DESKTOP_ENTRY_URL = `${HARNESSOS_CANARY_DESKTOP_ORIGIN}/index.html`;

export type HarnessOSDesktopFlavor = "production" | "development" | "canary";

export interface HarnessOSDesktopIdentity {
  readonly flavor: HarnessOSDesktopFlavor;
  readonly displayName: string;
  readonly bundleId: string;
  readonly scheme: string;
  readonly origin: string;
  readonly entryUrl: string;
  readonly userDataDirectoryName: string;
  readonly defaultHomeDirectoryName: string;
  readonly usesScriptedUpdates: boolean;
}

export function resolveHarnessOSDesktopFlavor(input: {
  readonly isDevelopment: boolean;
  readonly requestedFlavor?: string | undefined;
}): HarnessOSDesktopFlavor {
  if (input.requestedFlavor?.trim().toLowerCase() === "canary") {
    return "canary";
  }
  return input.isDevelopment ? "development" : "production";
}

export function harnessOSDesktopIdentity(flavor: HarnessOSDesktopFlavor): HarnessOSDesktopIdentity {
  if (flavor === "canary") {
    return {
      flavor,
      displayName: "Haros Canary",
      bundleId: HARNESSOS_CANARY_BUNDLE_ID,
      scheme: HARNESSOS_CANARY_DESKTOP_SCHEME,
      origin: HARNESSOS_CANARY_DESKTOP_ORIGIN,
      entryUrl: HARNESSOS_CANARY_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "harnessos-canary",
      defaultHomeDirectoryName: ".harnessos-canary",
      usesScriptedUpdates: true,
    };
  }
  if (flavor === "development") {
    return {
      flavor,
      displayName: "Haros (Dev)",
      bundleId: HARNESSOS_DEVELOPMENT_BUNDLE_ID,
      scheme: HARNESSOS_DESKTOP_SCHEME,
      origin: HARNESSOS_DESKTOP_ORIGIN,
      entryUrl: HARNESSOS_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "harnessos-dev",
      defaultHomeDirectoryName: ".harnessos",
      usesScriptedUpdates: false,
    };
  }
  return {
    flavor,
    displayName: "Haros",
    bundleId: HARNESSOS_PRODUCTION_BUNDLE_ID,
    scheme: HARNESSOS_DESKTOP_SCHEME,
    origin: HARNESSOS_DESKTOP_ORIGIN,
    entryUrl: HARNESSOS_DESKTOP_ENTRY_URL,
    userDataDirectoryName: "harnessos",
    defaultHomeDirectoryName: ".harnessos",
    usesScriptedUpdates: false,
  };
}

export function harnessOSBundleId(isDevelopment: boolean): string {
  return harnessOSDesktopIdentity(isDevelopment ? "development" : "production").bundleId;
}
