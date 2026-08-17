// FILE: desktopAppIcon.ts
// Purpose: Validate app-icon preferences, map platform resources, and refresh native icon surfaces.
// Layer: Desktop-native preference logic

import { DesktopAppIcon } from "@omnimind/contracts";
import { Schema } from "effect";
import type { BrowserWindow } from "electron";

type DesktopPlatform = "darwin" | "linux" | "win32";

interface DesktopAppIconResourceInput {
  readonly icon: DesktopAppIcon;
  readonly platform: DesktopPlatform;
  readonly useLegacyMacDefault: boolean;
}

const APP_ICON_RESOURCE_NAMES = {
  darwin: {
    default: "icon.icns",
    icon: "app-icon-macos.png",
  },
  linux: {
    default: "icon.png",
    icon: "app-icon-linux.png",
  },
  win32: {
    default: "icon.ico",
    icon: "app-icon-windows.ico",
  },
} as const;

// Explorer coalesces a synchronous detach/reattach and keeps its cached icon.
// Keep the taskbar button detached long enough for the shell to process removal.
const WINDOWS_TASKBAR_ICON_REFRESH_DELAY_MS = 250;
let windowsTaskbarIconRefreshGeneration = 0;

type WindowsTaskbarIconRefreshScheduler = (callback: () => void, delayMs: number) => unknown;

export const isDesktopAppIcon = Schema.is(DesktopAppIcon);

export function shouldUpdateDesktopAppIcon(
  currentIcon: DesktopAppIcon,
  requestedIcon: DesktopAppIcon,
): boolean {
  return currentIcon !== requestedIcon;
}

export function refreshWindowsTaskbarIcon({
  platform,
  window,
  schedule = setTimeout,
}: {
  readonly platform: NodeJS.Platform;
  readonly window: BrowserWindow | null;
  readonly schedule?: WindowsTaskbarIconRefreshScheduler;
}): void {
  if (platform !== "win32" || !window || window.isDestroyed() || !window.isVisible()) {
    return;
  }

  const generation = ++windowsTaskbarIconRefreshGeneration;
  window.setSkipTaskbar(true);
  schedule(() => {
    if (generation !== windowsTaskbarIconRefreshGeneration || window.isDestroyed()) {
      return;
    }
    window.setSkipTaskbar(false);
  }, WINDOWS_TASKBAR_ICON_REFRESH_DELAY_MS);
}

export function desktopAppIconResourceName(input: DesktopAppIconResourceInput): string {
  if (input.platform === "darwin" && input.icon === "default" && input.useLegacyMacDefault) {
    return "dock-icon.png";
  }
  return APP_ICON_RESOURCE_NAMES[input.platform][input.icon];
}
