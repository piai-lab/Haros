// FILE: desktop-platform-build-config.ts
// Purpose: Builds platform-specific electron-builder config fragments for desktop artifacts.
// Layer: Desktop packaging helper
// Depends on: Desktop packaging policy and electron-builder config shape.

export const MICROPHONE_USAGE_DESCRIPTION =
  "Haros needs microphone access so you can record voice notes and transcribe them into the chat composer.";
export const MAC_ENTITLEMENTS_PATH = "apps/desktop/resources/entitlements.mac.plist";
export const MAC_INHERITED_ENTITLEMENTS_PATH =
  "apps/desktop/resources/entitlements.mac.inherit.plist";
export const MAC_APPSNAP_HELPER_STAGE_PATH =
  "apps/desktop/native/appsnap/build/harnessos-appsnap-helper";
export const MAC_APPSNAP_HELPER_ASAR_EXCLUSION = "!apps/desktop/native/appsnap/build/**";
export const MAC_APPSNAP_HELPER_BUNDLE_PATH = "Contents/Helpers/harnessos-appsnap-helper";
export const MAC_DEVICE_HELPER_STAGE_PATH = "apps/server/dist/device-helper";
export const MAC_DEVICE_HELPER_RESOURCE_PATH = "Resources/device-helper";
export const WINDOWS_INSTALLER_GUID = "bf2c2d38-6ca0-58ef-892c-7b354a231883";
const MAC_DMG_ICON_PATH = "icon.icns";
export const NODE_PTY_ASAR_UNPACK_GLOBS = ["node_modules/node-pty/**"] as const;
// electron-builder applies platform-specific default exclusions. Keep the
// generated legal closure explicit so every platform archive carries the same
// audit files, even when the Windows packager prunes non-runtime metadata.
export const PACKAGED_LEGAL_FILES_GLOB = "apps/server/dist/client/licenses/**";

export interface DesktopPlatformBuildConfig {
  readonly asarUnpack?: ReadonlyArray<string>;
  readonly dmg?: Record<string, unknown>;
  readonly extraFiles?: ReadonlyArray<Record<string, string>>;
  readonly files?: ReadonlyArray<string>;
  readonly linux?: Record<string, unknown>;
  readonly mac?: Record<string, unknown>;
  readonly nsis?: Record<string, unknown>;
  readonly win?: Record<string, unknown>;
}

export interface CreateDesktopPlatformBuildConfigInput {
  readonly platform: "linux" | "mac" | "win";
  readonly target: string;
}

export interface DesktopNativeBuildHostInput {
  readonly arch: "arm64" | "x64" | "universal";
  readonly hostArch: string;
  readonly hostPlatform: NodeJS.Platform;
  readonly platform: "linux" | "mac" | "win";
}

export function validateDesktopNativeBuildHost(input: DesktopNativeBuildHostInput): string | null {
  if (input.platform === "mac" && input.hostPlatform !== "darwin") {
    return [
      "macOS desktop artifacts include the native Swift AppSnap helper.",
      `Build mac/${input.arch} on macOS so the helper can be compiled for the target platform.`,
      `Current host is ${input.hostPlatform}/${input.hostArch}.`,
    ].join(" ");
  }
  if (input.platform !== "linux") return null;
  if (input.arch === "universal") {
    return "Linux desktop artifacts support x64 or arm64 builds, not universal builds.";
  }
  if (input.hostPlatform === "linux" && input.hostArch === input.arch) return null;

  return [
    "Linux desktop artifacts include the native node-pty terminal dependency.",
    `Build linux/${input.arch} on a matching Linux host so pty.node and spawn-helper are compiled for Linux.`,
    `Current host is ${input.hostPlatform}/${input.hostArch}.`,
  ].join(" ");
}

export function createDesktopPlatformBuildConfig(
  input: CreateDesktopPlatformBuildConfigInput,
): DesktopPlatformBuildConfig {
  const nativePackaging = { asarUnpack: [...NODE_PTY_ASAR_UNPACK_GLOBS] };

  if (input.platform === "mac") {
    const mac = {
      target: [input.target],
      icon: MAC_DMG_ICON_PATH,
      category: "public.app-category.developer-tools",
      hardenedRuntime: false,
      notarize: false,
      entitlements: MAC_ENTITLEMENTS_PATH,
      entitlementsInherit: MAC_INHERITED_ENTITLEMENTS_PATH,
      binaries: [MAC_APPSNAP_HELPER_BUNDLE_PATH],
      // The universal build stages the same pre-lipo'd helper in both app trees.
      // @electron/universal needs this pattern to preserve that existing fat binary.
      x64ArchFiles: MAC_APPSNAP_HELPER_BUNDLE_PATH,
      extendInfo: {
        NSMicrophoneUsageDescription: MICROPHONE_USAGE_DESCRIPTION,
      },
    } satisfies Record<string, unknown>;

    return {
      ...nativePackaging,
      dmg: {
        sign: false,
        writeUpdateInfo: false,
      },
      files: ["**/*", MAC_APPSNAP_HELPER_ASAR_EXCLUSION],
      extraFiles: [
        {
          from: MAC_APPSNAP_HELPER_STAGE_PATH,
          to: "Helpers/harnessos-appsnap-helper",
        },
        {
          from: MAC_DEVICE_HELPER_STAGE_PATH,
          to: MAC_DEVICE_HELPER_RESOURCE_PATH,
        },
      ],
      mac,
    };
  }

  if (input.platform === "linux") {
    return {
      ...nativePackaging,
      linux: {
        target: [input.target],
        executableName: "harnessos",
        icon: "icon.png",
        category: "Development",
        desktop: {
          entry: {
            StartupWMClass: "Haros",
          },
        },
      },
    };
  }

  return {
    ...nativePackaging,
    files: ["**/*", PACKAGED_LEGAL_FILES_GLOB],
    nsis: {
      guid: WINDOWS_INSTALLER_GUID,
    },
    win: {
      target: [input.target],
      icon: "icon.ico",
    },
  };
}
