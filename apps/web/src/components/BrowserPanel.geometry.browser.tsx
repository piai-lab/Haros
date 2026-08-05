// FILE: BrowserPanel.geometry.browser.tsx
// Purpose: Real-browser CSS-rectangle to Electron-DIP geometry matrix.

import { resolveDesktopDipRectFromCssRect } from "@omnimind/shared/desktopChrome";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("BrowserPanel native bounds", () => {
  it("converts a measured browser slot across the zoom matrix", () => {
    const slot = document.createElement("div");
    Object.assign(slot.style, {
      position: "fixed",
      left: "120px",
      top: "46px",
      width: "640px",
      height: "480px",
    });
    document.body.append(slot);
    const rect = slot.getBoundingClientRect();
    const cssRect = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };

    expect(resolveDesktopDipRectFromCssRect(cssRect, 0.8)).toEqual({
      x: cssRect.x * 0.8,
      y: cssRect.y * 0.8,
      width: cssRect.width * 0.8,
      height: cssRect.height * 0.8,
    });
    expect(resolveDesktopDipRectFromCssRect(cssRect, 1)).toEqual(cssRect);
    expect(resolveDesktopDipRectFromCssRect(cssRect, 1.25)).toEqual({
      x: cssRect.x * 1.25,
      y: cssRect.y * 1.25,
      width: cssRect.width * 1.25,
      height: cssRect.height * 1.25,
    });
  });
});
