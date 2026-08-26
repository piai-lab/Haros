import { describe, expect, it } from "vitest";
import type { BrowserTabState } from "@omnimind/contracts";

import {
  resolveBrowserTabPresentationTitle,
  scrollBrowserTabStripToActive,
} from "./BrowserTabStrip";

function rect(left: number, width: number): DOMRect {
  return { left, right: left + width, width } as DOMRect;
}

function browserTab(overrides: Partial<BrowserTabState>): BrowserTabState {
  return {
    id: "tab-1",
    title: "",
    url: "about:blank",
    status: "live",
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    faviconUrl: null,
    lastCommittedUrl: null,
    lastError: null,
    ...overrides,
  };
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

describe("BrowserTabStrip titles", () => {
  const labels = { newTab: "新建标签页", untitled: "未命名" };

  it("localizes the runtime's blank-tab placeholder", () => {
    expect(
      resolveBrowserTabPresentationTitle(
        browserTab({
          title: "New tab",
          url: "about:blank",
        }),
        labels,
      ),
    ).toBe("新建标签页");
  });

  it("preserves a real page title and localizes only a truly untitled page", () => {
    expect(
      resolveBrowserTabPresentationTitle(
        browserTab({
          title: "New tab",
          url: "https://example.com",
        }),
        labels,
      ),
    ).toBe("New tab");
    expect(
      resolveBrowserTabPresentationTitle(
        browserTab({
          id: "tab-2",
          title: "",
          url: "https://example.com",
        }),
        labels,
      ),
    ).toBe("未命名");
  });
});
