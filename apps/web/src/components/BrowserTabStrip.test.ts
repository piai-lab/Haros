import { describe, expect, it } from "vitest";

import { scrollBrowserTabStripToActive } from "./BrowserTabStrip";

function rect(left: number, width: number): DOMRect {
  return { left, right: left + width, width } as DOMRect;
}

describe("BrowserTabStrip scrolling", () => {
  it("moves only its own horizontal scroll position", () => {
    const strip = {
      scrollLeft: 100,
      clientWidth: 200,
      getBoundingClientRect: () => rect(20, 200),
    } as HTMLElement;
    const tab = { getBoundingClientRect: () => rect(280, 80) } as HTMLElement;
    scrollBrowserTabStripToActive(strip, tab);
    expect(strip.scrollLeft).toBe(240);
  });

  it("does not move when the active tab is already visible", () => {
    const strip = {
      scrollLeft: 100,
      clientWidth: 200,
      getBoundingClientRect: () => rect(20, 200),
    } as HTMLElement;
    const tab = { getBoundingClientRect: () => rect(80, 60) } as HTMLElement;
    scrollBrowserTabStripToActive(strip, tab);
    expect(strip.scrollLeft).toBe(100);
  });
});
