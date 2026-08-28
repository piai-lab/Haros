import { describe, expect, it, vi } from "vitest";

import {
  desktopStatusItemResourceName,
  revealDesktopStatusItemWindow,
  type DesktopStatusItemWindow,
} from "./desktopStatusItem";

function makeWindow(
  input: {
    readonly destroyed?: boolean;
    readonly minimized?: boolean;
    readonly visible?: boolean;
  } = {},
): DesktopStatusItemWindow {
  return {
    isDestroyed: vi.fn(() => input.destroyed ?? false),
    isMinimized: vi.fn(() => input.minimized ?? false),
    isVisible: vi.fn(() => input.visible ?? true),
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
  };
}

describe("revealDesktopStatusItemWindow", () => {
  it("selects native status-item resources for macOS and Windows", () => {
    expect(desktopStatusItemResourceName("darwin")).toBe("omnimind-statusTemplate.png");
    expect(desktopStatusItemResourceName("win32")).toBe("omnimind-status.ico");
    expect(desktopStatusItemResourceName("linux")).toBeNull();
  });

  it("restores, shows, activates, and focuses a minimized hidden window", () => {
    const window = makeWindow({ minimized: true, visible: false });
    const activateApp = vi.fn();

    const result = revealDesktopStatusItemWindow({
      currentWindow: window,
      createWindow: vi.fn(),
      activateApp,
    });

    expect(result).toBe(window);
    expect(window.restore).toHaveBeenCalledOnce();
    expect(window.show).toHaveBeenCalledOnce();
    expect(activateApp).toHaveBeenCalledOnce();
    expect(window.focus).toHaveBeenCalledOnce();
  });

  it("creates a replacement when no live main window remains", () => {
    const destroyedWindow = makeWindow({ destroyed: true });
    const replacement = makeWindow({ visible: false });
    const createWindow = vi.fn(() => replacement);

    const result = revealDesktopStatusItemWindow({
      currentWindow: destroyedWindow,
      createWindow,
      activateApp: vi.fn(),
    });

    expect(result).toBe(replacement);
    expect(createWindow).toHaveBeenCalledOnce();
    expect(replacement.show).toHaveBeenCalledOnce();
    expect(replacement.focus).toHaveBeenCalledOnce();
  });
});
