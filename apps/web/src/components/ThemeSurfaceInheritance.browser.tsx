// FILE: ThemeSurfaceInheritance.browser.tsx
// Purpose: Proves ordinary product primitives inherit one resolved palette while content stays raw.
// Layer: Browser rendering regression for the global theme contract

import "../index.css";

import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { buildThemeCssVariables, type ThemePack } from "~/theme/theme.logic";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const root = document.documentElement;
const originalRootClassName = root.className;
const originalRootStyle = root.getAttribute("style");

afterEach(() => {
  document.body.innerHTML = "";
  root.className = originalRootClassName;
  if (originalRootStyle === null) {
    root.removeAttribute("style");
  } else {
    root.setAttribute("style", originalRootStyle);
  }
});

describe("global resolved theme inheritance", () => {
  it("themes ordinary surfaces and controls from one warm palette without recoloring content", async () => {
    const warmPack: ThemePack = {
      codeThemeId: "warm-test",
      theme: {
        accent: "#b65a32",
        contrast: 12,
        fonts: { code: null, ui: null },
        ink: "#392c20",
        opaqueWindows: true,
        semanticColors: {
          diffAdded: "#2d7c55",
          diffRemoved: "#b13b32",
          skill: "#7d5aa6",
        },
        surface: "#fff3df",
      },
    };
    const variables = buildThemeCssVariables(warmPack, "light").variables;
    for (const [name, value] of Object.entries(variables)) {
      root.style.setProperty(name, value);
    }

    const mounted = await render(
      <main data-testid="ordinary-surface" className="bg-background text-foreground">
        <section data-testid="settings-surface" className="bg-card text-card-foreground">
          <Input aria-label="API Key" defaultValue="saved expression" />
          <Button>Save</Button>
          <img
            alt="Engine identity"
            data-testid="brand-content"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Cpath fill='%23e24a3b' d='M0 0h1v1H0z'/%3E%3C/svg%3E"
          />
        </section>
      </main>,
    );

    const ordinarySurface = mounted.getByTestId("ordinary-surface").element();
    const settingsSurface = mounted.getByTestId("settings-surface").element();
    const inputControl = document.querySelector<HTMLElement>("[data-slot=input-control]");
    const saveButton = mounted.getByRole("button", { name: "Save" }).element();
    const brandContent = mounted.getByTestId("brand-content").element();

    expect(getComputedStyle(ordinarySurface).backgroundColor).not.toBe("rgb(255, 255, 255)");
    expect(getComputedStyle(ordinarySurface).color).toBe("rgb(57, 44, 32)");
    expect(getComputedStyle(settingsSurface).backgroundColor).not.toBe("rgb(255, 255, 255)");
    expect(inputControl).not.toBeNull();
    expect(getComputedStyle(inputControl!).borderColor).not.toBe("rgb(0, 0, 0)");
    const saveBackground = getComputedStyle(saveButton).backgroundColor;
    // Chromium serializes modern color functions as `oklab(...)`, while
    // WebKit/WebKitGTK may serialize the same token as rgb/rgba. The contract
    // is that the control uses the resolved theme rather than the default
    // white surface; exact serialization is browser-owned.
    expect(saveBackground).not.toBe("rgb(255, 255, 255)");
    expect(saveBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(brandContent).filter).toBe("none");
  });
});
