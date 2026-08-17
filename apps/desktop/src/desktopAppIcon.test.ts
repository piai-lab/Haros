import { describe, expect, it, vi } from "vitest";
import type { BrowserWindow } from "electron";

import {
  desktopAppIconResourceName,
  isDesktopAppIcon,
  refreshWindowsTaskbarIcon,
  shouldUpdateDesktopAppIcon,
} from "./desktopAppIcon";

interface FakeWindowState {
  destroyed?: boolean;
  visible?: boolean;
}

function makeWindow({ destroyed = false, visible = true }: FakeWindowState = {}) {
  return {
    isDestroyed: vi.fn(() => destroyed),
    isVisible: vi.fn(() => visible),
    setSkipTaskbar: vi.fn(),
  } as unknown as BrowserWindow;
}

function makeSchedule() {
  const callbacks: Array<() => void> = [];
  const schedule = vi.fn((callback: () => void, _delayMs: number) => {
    callbacks.push(callback);
  });
  return { callbacks, schedule };
}

describe("desktop app icons", () => {
  it("accepts only supported preferences", () => {
    expect(isDesktopAppIcon("default")).toBe(true);
    expect(isDesktopAppIcon("icon")).toBe(true);
    expect(isDesktopAppIcon("unknown")).toBe(false);
  });

  it("selects the alternate native asset on every desktop platform", () => {
    expect(
      desktopAppIconResourceName({ icon: "icon", platform: "darwin", useLegacyMacDefault: false }),
    ).toBe("app-icon-macos.png");
    expect(
      desktopAppIconResourceName({ icon: "icon", platform: "win32", useLegacyMacDefault: false }),
    ).toBe("app-icon-windows.ico");
    expect(
      desktopAppIconResourceName({ icon: "icon", platform: "linux", useLegacyMacDefault: false }),
    ).toBe("app-icon-linux.png");
  });

  it("keeps the legacy macOS default compatible with older releases", () => {
    expect(
      desktopAppIconResourceName({
        icon: "default",
        platform: "darwin",
        useLegacyMacDefault: true,
      }),
    ).toBe("dock-icon.png");
    expect(
      desktopAppIconResourceName({
        icon: "default",
        platform: "darwin",
        useLegacyMacDefault: false,
      }),
    ).toBe("icon.icns");
  });

  it("does not reapply the icon when renderer hydration matches native state", () => {
    expect(shouldUpdateDesktopAppIcon("default", "default")).toBe(false);
    expect(shouldUpdateDesktopAppIcon("icon", "icon")).toBe(false);
    expect(shouldUpdateDesktopAppIcon("default", "icon")).toBe(true);
    expect(shouldUpdateDesktopAppIcon("icon", "default")).toBe(true);
  });

  it("detaches a visible Windows taskbar button and re-registers it after 250ms", () => {
    const window = makeWindow();
    const { callbacks, schedule } = makeSchedule();

    refreshWindowsTaskbarIcon({ platform: "win32", window, schedule });

    expect(window.setSkipTaskbar).toHaveBeenCalledExactlyOnceWith(true);
    expect(schedule).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 250);

    callbacks[0]?.();

    expect(window.setSkipTaskbar).toHaveBeenLastCalledWith(false);
    expect(window.setSkipTaskbar).toHaveBeenCalledTimes(2);
  });

  it("does nothing when there is no Windows window", () => {
    const { schedule } = makeSchedule();

    expect(() =>
      refreshWindowsTaskbarIcon({ platform: "win32", window: null, schedule }),
    ).not.toThrow();

    expect(schedule).not.toHaveBeenCalled();
  });

  it("does nothing when the Windows window is destroyed", () => {
    const window = makeWindow({ destroyed: true });
    const { schedule } = makeSchedule();

    refreshWindowsTaskbarIcon({ platform: "win32", window, schedule });

    expect(window.setSkipTaskbar).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });

  it("does nothing when the Windows window is hidden", () => {
    const window = makeWindow({ visible: false });
    const { schedule } = makeSchedule();

    refreshWindowsTaskbarIcon({ platform: "win32", window, schedule });

    expect(window.setSkipTaskbar).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });

  it.each(["darwin", "linux"] as const)("does not touch the taskbar on %s", (platform) => {
    const window = makeWindow();
    const { schedule } = makeSchedule();

    refreshWindowsTaskbarIcon({ platform, window, schedule });

    expect(window.setSkipTaskbar).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });

  it("never re-registers a window destroyed before the delay elapses", () => {
    const window = makeWindow();
    const { callbacks, schedule } = makeSchedule();

    refreshWindowsTaskbarIcon({ platform: "win32", window, schedule });
    (window.isDestroyed as ReturnType<typeof vi.fn>).mockReturnValue(true);
    callbacks[0]?.();

    expect(window.setSkipTaskbar).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("lets only the latest rapid update re-register the taskbar button", () => {
    const window = makeWindow();
    const { callbacks, schedule } = makeSchedule();

    refreshWindowsTaskbarIcon({ platform: "win32", window, schedule });
    refreshWindowsTaskbarIcon({ platform: "win32", window, schedule });

    expect(window.setSkipTaskbar).toHaveBeenNthCalledWith(1, true);
    expect(window.setSkipTaskbar).toHaveBeenNthCalledWith(2, true);
    callbacks[0]?.();
    expect(window.setSkipTaskbar).toHaveBeenCalledTimes(2);

    callbacks[1]?.();
    expect(window.setSkipTaskbar).toHaveBeenNthCalledWith(3, false);
    expect(window.setSkipTaskbar).toHaveBeenCalledTimes(3);
  });
});
