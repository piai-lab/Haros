// FILE: SidebarHeaderNavigationControls.browser.tsx
// Purpose: Lock the compact titlebar brand mark to the shared control axis.
// Layer: Browser UI regression

import "../index.css";

import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { SidebarProductMark } from "./SidebarHeaderNavigationControls";

describe("SidebarProductMark", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
  });

  it("shares the control axis and preserves the approved optical spacing", async () => {
    const screen = await render(
      <div className="flex items-center gap-0.5">
        <SidebarProductMark />
        <button className="size-7" data-testid="sidebar-trigger-fixture" type="button" />
      </div>,
    );
    const slot = document.querySelector<HTMLElement>('[data-slot="sidebar-product-mark"]');
    const logo = slot?.querySelector<SVGSVGElement>("svg");
    if (!slot || !logo) throw new Error("Sidebar product mark is missing");

    const slotRect = slot.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    const triggerRect = screen
      .getByTestId("sidebar-trigger-fixture")
      .element()
      .getBoundingClientRect();

    expect(slotRect.width).toBe(20);
    expect(slotRect.height).toBe(28);
    expect(logoRect.width).toBe(16);
    expect(logoRect.height).toBe(16);
    expect(
      Math.abs(slotRect.top + slotRect.height / 2 - (triggerRect.top + triggerRect.height / 2)),
    ).toBeLessThan(0.01);
    expect(
      Math.abs(logoRect.top + logoRect.height / 2 - (triggerRect.top + triggerRect.height / 2)),
    ).toBeLessThan(0.01);
    expect(triggerRect.left - slotRect.right).toBe(5);
  });

  it("loads the canonical light and dark flat assets without adding an accessible control", async () => {
    await render(<SidebarProductMark />);
    const slot = document.querySelector<HTMLElement>('[data-slot="sidebar-product-mark"]');
    const logo = slot?.querySelector<SVGSVGElement>("svg");
    const images = slot?.querySelectorAll("img");
    if (!slot || !logo || !images) throw new Error("Sidebar product mark is missing");

    expect(logo.getAttribute("aria-hidden")).toBe("true");
    expect(images[0]?.getAttribute("src")).toBe("/brand/harnessos-logo-flat.svg");
    expect(images[1]?.getAttribute("src")).toBe("/brand/harnessos-logo-flat-dark.svg");
    await expect.poll(() => images[0]?.naturalWidth ?? 0).toBeGreaterThan(0);
    await expect.poll(() => images[1]?.naturalWidth ?? 0).toBeGreaterThan(0);
  });
});
