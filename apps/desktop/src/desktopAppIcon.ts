// FILE: desktopAppIcon.ts
// Purpose: Validate app-icon preferences and map them to platform resources.
// Layer: Desktop-native preference logic

import { DesktopAppIcon } from "@omnimind/contracts";
import { Schema } from "effect";

type DesktopPlatform = "darwin" | "linux" | "win32";

interface DesktopAppIconResourceInput {
  readonly icon: DesktopAppIcon;
  readonly platform: DesktopPlatform;
  readonly useLegacyMacDefault: boolean;
  readonly isDarkAppearance: boolean;
}

const APP_ICON_RESOURCE_NAMES = {
  darwin: {
    default: "icon.icns",
    icon: "app-icon-macos.png",
    dark: "dock-icon-dark.png",
  },
  linux: {
    default: "icon.png",
    icon: "app-icon-linux.png",
    dark: "icon.png",
  },
  win32: {
    default: "icon.ico",
    icon: "app-icon-windows.ico",
    dark: "icon.ico",
  },
} as const;

export const isDesktopAppIcon = Schema.is(DesktopAppIcon);

export function shouldUpdateDesktopAppIcon(
  currentIcon: DesktopAppIcon,
  requestedIcon: DesktopAppIcon,
): boolean {
  return currentIcon !== requestedIcon;
}

export function desktopAppIconResourceName(
  input: DesktopAppIconResourceInput,
): string {
  if (input.platform === "darwin" && input.icon === "default") {
    if (input.isDarkAppearance) return "dock-icon-dark.png";
    if (input.useLegacyMacDefault) return "dock-icon.png";
  }
  return APP_ICON_RESOURCE_NAMES[input.platform][input.icon];
}
