// FILE: desktopStatusItem.ts
// Purpose: Restore and focus the desktop window after an explicit menu-bar click.
// Layer: Desktop-native window activation policy

export interface DesktopStatusItemWindow {
  readonly isDestroyed: () => boolean;
  readonly isMinimized: () => boolean;
  readonly isVisible: () => boolean;
  readonly restore: () => void;
  readonly show: () => void;
  readonly focus: () => void;
}

export interface RevealDesktopStatusItemWindowOptions<TWindow extends DesktopStatusItemWindow> {
  readonly currentWindow: TWindow | null;
  readonly createWindow: () => TWindow;
  readonly activateApp: () => void;
}

export type DesktopStatusItemPlatform = "darwin" | "linux" | "win32";

export function desktopStatusItemResourceName(platform: DesktopStatusItemPlatform): string | null {
  if (platform === "darwin") return "harnessos-statusTemplate.png";
  if (platform === "win32") return "harnessos-status.ico";
  return null;
}

export function revealDesktopStatusItemWindow<TWindow extends DesktopStatusItemWindow>(
  options: RevealDesktopStatusItemWindowOptions<TWindow>,
): TWindow {
  const target =
    options.currentWindow && !options.currentWindow.isDestroyed()
      ? options.currentWindow
      : options.createWindow();

  if (target.isMinimized()) {
    target.restore();
  }
  if (!target.isVisible()) {
    target.show();
  }
  options.activateApp();
  target.focus();
  return target;
}
