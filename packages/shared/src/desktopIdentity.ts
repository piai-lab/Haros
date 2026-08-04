// FILE: desktopIdentity.ts
// Purpose: Defines the canonical desktop application identity across packaging and runtime.

export const OMNIMIND_DESKTOP_SCHEME = "omnimind";
export const OMNIMIND_DESKTOP_ORIGIN = `${OMNIMIND_DESKTOP_SCHEME}://app`;
export const OMNIMIND_DESKTOP_ENTRY_URL = `${OMNIMIND_DESKTOP_ORIGIN}/index.html`;
export const OMNIMIND_DESKTOP_UPDATE_CHANNEL = "omnimind";
export const OMNIMIND_PRODUCTION_BUNDLE_ID = "app.omnimind.desktop";
export const OMNIMIND_DEVELOPMENT_BUNDLE_ID = `${OMNIMIND_PRODUCTION_BUNDLE_ID}.dev`;
export const OMNIMIND_CANARY_BUNDLE_ID = `${OMNIMIND_PRODUCTION_BUNDLE_ID}.canary`;
export const OMNIMIND_CANARY_DESKTOP_SCHEME = "omnimind-canary";
export const OMNIMIND_CANARY_DESKTOP_ORIGIN = `${OMNIMIND_CANARY_DESKTOP_SCHEME}://app`;
export const OMNIMIND_CANARY_DESKTOP_ENTRY_URL = `${OMNIMIND_CANARY_DESKTOP_ORIGIN}/index.html`;

export type OmniMindDesktopFlavor = "production" | "development" | "canary";

export interface OmniMindDesktopIdentity {
  readonly flavor: OmniMindDesktopFlavor;
  readonly displayName: string;
  readonly bundleId: string;
  readonly scheme: string;
  readonly origin: string;
  readonly entryUrl: string;
  readonly userDataDirectoryName: string;
  readonly defaultHomeDirectoryName: string;
  readonly usesScriptedUpdates: boolean;
}

export function resolveOmniMindDesktopFlavor(input: {
  readonly isDevelopment: boolean;
  readonly requestedFlavor?: string | undefined;
}): OmniMindDesktopFlavor {
  if (input.requestedFlavor?.trim().toLowerCase() === "canary") {
    return "canary";
  }
  return input.isDevelopment ? "development" : "production";
}

export function omnimindDesktopIdentity(flavor: OmniMindDesktopFlavor): OmniMindDesktopIdentity {
  if (flavor === "canary") {
    return {
      flavor,
      displayName: "OmniMind Canary",
      bundleId: OMNIMIND_CANARY_BUNDLE_ID,
      scheme: OMNIMIND_CANARY_DESKTOP_SCHEME,
      origin: OMNIMIND_CANARY_DESKTOP_ORIGIN,
      entryUrl: OMNIMIND_CANARY_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "omnimind-canary",
      defaultHomeDirectoryName: ".omnimind-canary",
      usesScriptedUpdates: true,
    };
  }
  if (flavor === "development") {
    return {
      flavor,
      displayName: "OmniMind (Dev)",
      bundleId: OMNIMIND_DEVELOPMENT_BUNDLE_ID,
      scheme: OMNIMIND_DESKTOP_SCHEME,
      origin: OMNIMIND_DESKTOP_ORIGIN,
      entryUrl: OMNIMIND_DESKTOP_ENTRY_URL,
      userDataDirectoryName: "omnimind-dev",
      defaultHomeDirectoryName: ".omnimind",
      usesScriptedUpdates: false,
    };
  }
  return {
    flavor,
    displayName: "OmniMind",
    bundleId: OMNIMIND_PRODUCTION_BUNDLE_ID,
    scheme: OMNIMIND_DESKTOP_SCHEME,
    origin: OMNIMIND_DESKTOP_ORIGIN,
    entryUrl: OMNIMIND_DESKTOP_ENTRY_URL,
    userDataDirectoryName: "omnimind",
    defaultHomeDirectoryName: ".omnimind",
    usesScriptedUpdates: false,
  };
}

export function omnimindBundleId(isDevelopment: boolean): string {
  return omnimindDesktopIdentity(isDevelopment ? "development" : "production").bundleId;
}
