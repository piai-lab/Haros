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

  it("scales shared text-sm and text-xs roles with the app preference", async () => {
    document.documentElement.style.setProperty("--app-font-size-base", "18px");
    document.documentElement.style.setProperty("--app-font-size-ui", "18px");
    document.documentElement.style.setProperty("--app-font-size-ui-xs", "15px");

    const screen = await render(
      <section>
        <SettingsEmptyState>Nothing configured</SettingsEmptyState>
        <span className="text-xs">Supporting detail</span>
      </section>,
    );

    expect(getComputedStyle(document.body).fontSize).toBe("18px");
    expect(getComputedStyle(screen.getByText("Nothing configured").element()).fontSize).toBe(
      "18px",
    );
    expect(getComputedStyle(screen.getByText("Supporting detail").element()).fontSize).toBe("15px");
  });
});
