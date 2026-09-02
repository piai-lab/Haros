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
export const HARNESSOS_SOURCE_DESKTOP_BUILD_MARKER = "harnessos-source-desktop-build-v1";
export const HARNESSOS_DESKTOP_SMOKE_USER_DATA_ENV = "HARNESSOS_DESKTOP_SMOKE_USER_DATA";

export type HarosDesktopFlavor = "production" | "development" | "canary";

export interface HarosDesktopIdentity {
  readonly flavor: HarosDesktopFlavor;
  readonly displayName: string;
  readonly bundleId: string;
  readonly scheme: string;
  readonly origin: string;
  readonly entryUrl: string;
  readonly userDataDirectoryName: string;
  readonly defaultHomeDirectoryName: string;
  readonly usesScriptedUpdates: boolean;
}

export function resolveHarosDesktopFlavor(input: {
  readonly isDevelopment: boolean;
  readonly requestedFlavor?: string | undefined;
  readonly allowDevelopmentOverride?: boolean | undefined;
}): HarosDesktopFlavor {
  const requestedFlavor = input.requestedFlavor?.trim().toLowerCase();
  if (requestedFlavor === "canary") {
    return "canary";
  }
  if (
    requestedFlavor === "development" &&
    (input.isDevelopment || input.allowDevelopmentOverride === true)
  ) {
    return "development";
  }
  return input.isDevelopment ? "development" : "production";
}

export function harnessOSDesktopIdentity(flavor: HarosDesktopFlavor): HarosDesktopIdentity {
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
      defaultHomeDirectoryName: ".harnessos-dev",
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
