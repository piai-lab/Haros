import { describe, expect, it } from "vitest";

import { parseEngineWebSurfaceThemeSnapshot } from "./engineWebSurfaceTheme";

const completeSnapshot = {
  accent: "rgb(133, 77, 14)",
  border: "rgba(46, 35, 21, 0.08)",
  borderStrong: "rgba(46, 35, 21, 0.18)",
  danger: "#b42d26",
  elevatedSurface: "rgb(255, 252, 246)",
  hoverSurface: "rgba(46, 35, 21, 0.05)",
  primaryBackground: "#2e2315",
  primaryBackgroundHover: "rgba(46, 35, 21, 0.08)",
  primaryText: "#fffbf4",
  secondaryBackground: "rgba(46, 35, 21, 0.04)",
  secondaryBackgroundHover: "rgba(46, 35, 21, 0.07)",
  success: "#26844c",
  surface: "#fffbf4",
  surfaceUnder: "#f7f0e5",
  text: "#2e2315",
  textDim: "rgba(46, 35, 21, 0.45)",
  textMuted: "rgba(46, 35, 21, 0.65)",
  warning: "#d97706",
};

describe("Engine Web Surface theme snapshot", () => {
  it("accepts and copies one complete bounded resolved palette", () => {
    const parsed = parseEngineWebSurfaceThemeSnapshot({
      ...completeSnapshot,
      futurePresentationField: "ignored",
    });

    expect(parsed).toEqual(completeSnapshot);
    expect(parsed).not.toHaveProperty("futurePresentationField");
  });

  it("fails closed for partial or active CSS payloads", () => {
    const { warning: _warning, ...partial } = completeSnapshot;
    expect(parseEngineWebSurfaceThemeSnapshot(partial)).toBeNull();
    expect(
      parseEngineWebSurfaceThemeSnapshot({
        ...completeSnapshot,
        surface: "var(--stale-second-palette)",
      }),
    ).toBeNull();
    expect(
      parseEngineWebSurfaceThemeSnapshot({
        ...completeSnapshot,
        accent: "red; background:url(https://example.test)",
      }),
    ).toBeNull();
    expect(
      parseEngineWebSurfaceThemeSnapshot({
        ...completeSnapshot,
        surface: "not-a-resolved-color",
      }),
    ).toBeNull();
    expect(
      parseEngineWebSurfaceThemeSnapshot({
        ...completeSnapshot,
        surface: "rgb(300, 20, 10)",
      }),
    ).toBeNull();
  });
});
