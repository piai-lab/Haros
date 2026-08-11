// FILE: SettingsTypography.browser.tsx
// Purpose: Proves shared Tailwind copy roles follow the persisted app typography scale.
// Layer: Browser UI test

import "../../index.css";

import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { SettingsEmptyState } from "./SettingsPanelPrimitives";

describe("settings typography", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.style.removeProperty("--app-font-size-base");
    document.documentElement.style.removeProperty("--app-font-size-ui");
    document.documentElement.style.removeProperty("--app-font-size-ui-xs");
  });

  it("preserves default geometry and scales shared text-sm and text-xs roles", async () => {
    const screen = await render(
      <section>
        <SettingsEmptyState>Nothing configured</SettingsEmptyState>
        <span className="text-xs">Supporting detail</span>
      </section>,
    );

    const primaryCopy = screen.getByText("Nothing configured").element();
    const supportingCopy = screen.getByText("Supporting detail").element();
    expect(getComputedStyle(primaryCopy).fontSize).toBe("14px");
    expect(getComputedStyle(primaryCopy).lineHeight).toBe("20px");
    expect(getComputedStyle(supportingCopy).fontSize).toBe("12px");
    expect(getComputedStyle(supportingCopy).lineHeight).toBe("16px");

    document.documentElement.style.setProperty("--app-font-size-base", "18px");
    document.documentElement.style.setProperty("--app-font-size-ui", "18px");
    document.documentElement.style.setProperty("--app-font-size-ui-xs", "15px");

    expect(getComputedStyle(document.body).fontSize).toBe("18px");
    expect(getComputedStyle(primaryCopy).fontSize).toBe("18px");
    expect(Number.parseFloat(getComputedStyle(primaryCopy).lineHeight)).toBeCloseTo(25.714, 2);
    expect(getComputedStyle(supportingCopy).fontSize).toBe("15px");
    expect(getComputedStyle(supportingCopy).lineHeight).toBe("20px");
  });
});
