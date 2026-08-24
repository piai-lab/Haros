import { describe, expect, it, vi } from "vitest";

import {
  readDesktopAppIconFromNative,
  writeDesktopAppIconToNative,
} from "./useDesktopAppIcon";

describe("desktop app icon native owner", () => {
  it("reads the durable native preference without writing a renderer mirror", async () => {
    const setAppIcon = vi.fn();
    const bridge = {
      getAppIcon: vi.fn().mockResolvedValue("icon"),
      setAppIcon,
    } as const;

    await expect(readDesktopAppIconFromNative(bridge)).resolves.toBe("icon");

    expect(setAppIcon).not.toHaveBeenCalled();
  });

  it("uses the product default when no desktop bridge exists", async () => {
    await expect(readDesktopAppIconFromNative(undefined)).resolves.toBe("default");
  });

  it("persists user selections only through the native owner", async () => {
    const setAppIcon = vi.fn().mockResolvedValue(undefined);
    const bridge = {
      getAppIcon: vi.fn().mockResolvedValue("icon"),
      setAppIcon,
    } as const;

    await writeDesktopAppIconToNative(bridge, "default");

    expect(setAppIcon).toHaveBeenCalledWith("default");
  });

  it("surfaces native persistence failure without creating a Web fallback", async () => {
    const bridge = {
      getAppIcon: vi.fn().mockResolvedValue("default"),
      setAppIcon: vi.fn().mockRejectedValue(new Error("read-only")),
    } as const;

    await expect(writeDesktopAppIconToNative(bridge, "icon")).rejects.toThrow("read-only");
  });
});
