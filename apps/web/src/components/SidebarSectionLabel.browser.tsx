// FILE: SidebarSectionLabel.browser.tsx
// Purpose: Lock the shared sidebar section-label role across light and dark themes.
// Layer: Browser UI regression

import "../index.css";

import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { SIDEBAR_SECTION_LABEL_CLASS_NAME } from "../sidebarRowStyles";

describe("sidebar section-label role", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
  });

  it.each(["light", "dark"] as const)(
    "keeps %s section labels quiet, legible, and regular-weight",
    async (theme) => {
      document.documentElement.classList.toggle("dark", theme === "dark");
      const mounted = await render(
        <div>
          <span className={SIDEBAR_SECTION_LABEL_CLASS_NAME}>Projects</span>
          <span
            data-testid="secondary-reference"
            className="text-[var(--color-text-foreground-secondary)]"
          >
            Reference
          </span>
        </div>,
      );

      const label = mounted.getByText("Projects").element();
      const reference = mounted.getByTestId("secondary-reference").element();
      const labelStyle = getComputedStyle(label);

      expect(labelStyle.fontSize).toBe("13px");
      expect(labelStyle.fontWeight).toBe("400");
      expect(labelStyle.color).toBe(getComputedStyle(reference).color);
    },
  );
});
