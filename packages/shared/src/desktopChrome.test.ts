import { describe, expect, it } from "vitest";

import {
  MAC_DESKTOP_TOP_BAR_TRAFFIC_LIGHT_GUTTER_CSS_PX,
  resolveDesktopDipRectFromCssRect,
  resolveMacDesktopTopBarTrafficLightGutterCssPx,
} from "./desktopChrome";

describe("resolveMacDesktopTopBarTrafficLightGutterCssPx", () => {
  it("returns the base gutter at zoom 1", () => {
    expect(resolveMacDesktopTopBarTrafficLightGutterCssPx(1)).toBe(
      MAC_DESKTOP_TOP_BAR_TRAFFIC_LIGHT_GUTTER_CSS_PX,
    );
  });

  it("inverse-scales the gutter as zoom increases", () => {
    expect(resolveMacDesktopTopBarTrafficLightGutterCssPx(1.1)).toBe(82);
    expect(resolveMacDesktopTopBarTrafficLightGutterCssPx(2)).toBe(45);
  });

  it("inverse-scales the gutter as zoom decreases", () => {
    expect(resolveMacDesktopTopBarTrafficLightGutterCssPx(0.8)).toBe(113);
  });

  it("falls back to zoom 1 for invalid factors", () => {
    expect(resolveMacDesktopTopBarTrafficLightGutterCssPx(0)).toBe(
      MAC_DESKTOP_TOP_BAR_TRAFFIC_LIGHT_GUTTER_CSS_PX,
    );
    expect(resolveMacDesktopTopBarTrafficLightGutterCssPx(Number.NaN)).toBe(
      MAC_DESKTOP_TOP_BAR_TRAFFIC_LIGHT_GUTTER_CSS_PX,
    );
  });
});

describe("resolveDesktopDipRectFromCssRect", () => {
  const rect = { x: 320, y: 46, width: 800, height: 600 };

  it.each([
    [1, rect],
    [2, { x: 640, y: 92, width: 1_600, height: 1_200 }],
    [0.5, { x: 160, y: 23, width: 400, height: 300 }],
  ])("converts the zoom %s matrix into window DIPs", (zoomFactor, expected) => {
    expect(resolveDesktopDipRectFromCssRect(rect, zoomFactor)).toEqual(expected);
  });

  it.each([0, Number.NaN, Number.POSITIVE_INFINITY])(
    "falls back to zoom 1 for invalid factor %s",
    (zoomFactor) => {
      expect(resolveDesktopDipRectFromCssRect(rect, zoomFactor)).toEqual(rect);
    },
  );
});
