import { describe, expect, it } from "vitest";

import { decodeBrowserHostEngineWebSurfaceContext } from "./BrowserAutomationHost";

const themeSnapshot = {
  accent: "#2563eb",
  border: "#d4d4d8",
  borderStrong: "#a1a1aa",
  danger: "#dc2626",
  elevatedSurface: "#ffffff",
  hoverSurface: "#f4f4f5",
  primaryBackground: "#18181b",
  primaryBackgroundHover: "#27272a",
  primaryText: "#ffffff",
  secondaryBackground: "#e4e4e7",
  secondaryBackgroundHover: "#d4d4d8",
  success: "#16a34a",
  surface: "#fafafa",
  surfaceUnder: "#f4f4f5",
  text: "#18181b",
  textDim: "#71717a",
  textMuted: "#52525b",
  warning: "#d97706",
};

describe("BrowserAutomationHost Engine web-surface context", () => {
  it("preserves the renderer-owned theme snapshot across the Server transport", () => {
    expect(
      decodeBrowserHostEngineWebSurfaceContext({
        locale: "zh-CN",
        theme: "light",
        themeSnapshot,
      }),
    ).toEqual({ locale: "zh-CN", theme: "light", themeSnapshot });
  });

  it("rejects a transport response that dropped the resolved snapshot", () => {
    expect(() => decodeBrowserHostEngineWebSurfaceContext({ locale: "en", theme: "dark" })).toThrow(
      "Browser presentation context is invalid",
    );
  });
});
