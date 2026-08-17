import { afterEach, describe, expect, it, vi } from "vitest";

const { desktopCopy, toBlob } = vi.hoisted(() => ({
  desktopCopy: vi.fn(),
  toBlob: vi.fn(),
}));

vi.mock("html-to-image", () => ({ toBlob }));
vi.mock("~/lib/desktopClipboard", () => ({
  copyPngBlobToDesktopClipboard: desktopCopy,
}));

import { copyImageToClipboard, renderNodeToPngBlob } from "./shareCardExport";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  desktopCopy.mockReset();
  toBlob.mockReset();
});

describe("local profile activity export", () => {
  it("renders a deterministic two-times PNG without contacting an external service", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const node = {} as HTMLElement;
    toBlob.mockResolvedValue(blob);

    await expect(
      renderNodeToPngBlob(node, { width: 860, height: 440 }),
    ).resolves.toBe(blob);
    expect(toBlob).toHaveBeenCalledExactlyOnceWith(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
      width: 860,
      height: 440,
    });
  });

  it("returns null when local rendering fails", async () => {
    toBlob.mockRejectedValue(new Error("render failed"));

    await expect(renderNodeToPngBlob({} as HTMLElement)).resolves.toBeNull();
  });

  it("prefers the native desktop clipboard", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    desktopCopy.mockResolvedValue(true);

    await expect(copyImageToClipboard(blob)).resolves.toBe(true);
  });

  it("falls back to the browser clipboard without any social or public-origin dependency", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const write = vi.fn().mockResolvedValue(undefined);
    class FakeClipboardItem {
      constructor(readonly items: Record<string, Blob>) {}
    }
    desktopCopy.mockResolvedValue(false);
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    vi.stubGlobal("navigator", { clipboard: { write } });

    await expect(copyImageToClipboard(blob)).resolves.toBe(true);
    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls[0]?.[0]?.[0]).toBeInstanceOf(FakeClipboardItem);
  });
});
