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
    document.documentElement.style.removeProperty("--app-font-size-ui-lg");
    document.documentElement.style.removeProperty("--app-font-size-ui-sm");
    document.documentElement.style.removeProperty("--app-font-size-ui-xs");
    document.documentElement.style.removeProperty("--app-font-size-ui-2xs");
    document.documentElement.style.removeProperty("--app-font-size-ui-micro");
  });

  it("preserves default geometry and scales shared text-sm and text-xs roles", async () => {
    const screen = await render(
      <section>
        <SettingsEmptyState>Nothing configured</SettingsEmptyState>
        <span className="text-xs">Supporting detail</span>
        <span className="text-[10px]">Micro label</span>
        <span className="text-[11px]">Dense label</span>
        <span className="text-[13px]">Secondary label</span>
        <span className="text-[15px]">Large label</span>
      </section>,
    );

    const primaryCopy = screen.getByText("Nothing configured").element();
    const supportingCopy = screen.getByText("Supporting detail").element();
    expect(getComputedStyle(primaryCopy).fontSize).toBe("14px");
    expect(getComputedStyle(primaryCopy).lineHeight).toBe("20px");
    expect(getComputedStyle(supportingCopy).fontSize).toBe("12px");
    expect(getComputedStyle(supportingCopy).lineHeight).toBe("16px");
    expect(getComputedStyle(screen.getByText("Micro label").element()).fontSize).toBe("10px");
    expect(getComputedStyle(screen.getByText("Dense label").element()).fontSize).toBe("11px");
    expect(getComputedStyle(screen.getByText("Secondary label").element()).fontSize).toBe("13px");
    expect(getComputedStyle(screen.getByText("Large label").element()).fontSize).toBe("15px");

    document.documentElement.style.setProperty("--app-font-size-base", "18px");
    document.documentElement.style.setProperty("--app-font-size-ui", "18px");
    document.documentElement.style.setProperty("--app-font-size-ui-lg", "19px");
    document.documentElement.style.setProperty("--app-font-size-ui-sm", "17px");
    document.documentElement.style.setProperty("--app-font-size-ui-xs", "15px");
    document.documentElement.style.setProperty("--app-font-size-ui-2xs", "14px");
    document.documentElement.style.setProperty("--app-font-size-ui-micro", "13px");

    expect(getComputedStyle(document.body).fontSize).toBe("18px");
    expect(getComputedStyle(primaryCopy).fontSize).toBe("18px");
    expect(Number.parseFloat(getComputedStyle(primaryCopy).lineHeight)).toBeCloseTo(25.714, 2);
    expect(getComputedStyle(supportingCopy).fontSize).toBe("15px");
    expect(getComputedStyle(supportingCopy).lineHeight).toBe("20px");
    expect(getComputedStyle(screen.getByText("Micro label").element()).fontSize).toBe("13px");
    expect(getComputedStyle(screen.getByText("Dense label").element()).fontSize).toBe("14px");
    expect(getComputedStyle(screen.getByText("Secondary label").element()).fontSize).toBe("17px");
    expect(getComputedStyle(screen.getByText("Large label").element()).fontSize).toBe("19px");
  });
});
