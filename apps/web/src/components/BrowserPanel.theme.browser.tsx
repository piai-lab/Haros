// FILE: BrowserPanel.theme.browser.tsx
// Purpose: Locks Browser-owned empty surfaces to the resolved app theme.
// Layer: Browser UI regression

import "../index.css";

import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { BrowserLocalServersHome } from "./BrowserPanel";

function applyResolvedTheme(theme: {
  variant: "light" | "dark";
  surface: string;
  foreground: string;
  mutedForeground: string;
}) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme.variant === "dark");
  root.style.setProperty("--color-background-surface", theme.surface);
  root.style.setProperty("--foreground", theme.foreground);
  root.style.setProperty("--muted-foreground", theme.mutedForeground);
}

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.classList.remove("dark");
  document.documentElement.style.removeProperty("--color-background-surface");
  document.documentElement.style.removeProperty("--foreground");
  document.documentElement.style.removeProperty("--muted-foreground");
});

describe("BrowserPanel resolved theme", () => {
  it("keeps the local-server home synchronized with every resolved app palette", async () => {
    applyResolvedTheme({
      variant: "light",
      surface: "rgb(250, 250, 250)",
      foreground: "rgb(31, 31, 31)",
      mutedForeground: "rgb(102, 102, 102)",
    });
    const mounted = await render(
      <BrowserLocalServersHome
        activeTabId={null}
        loading={false}
        servers={[]}
        onNavigate={() => {}}
        onRefresh={() => {}}
      />,
    );
    const home = document.querySelector<HTMLElement>("[data-browser-local-servers-home]");
    expect(home).not.toBeNull();
    expect(getComputedStyle(home!).backgroundColor).toBe("rgb(250, 250, 250)");
    expect(getComputedStyle(mounted.getByText("No local servers").element()).color).toBe(
      "rgb(31, 31, 31)",
    );

    // A future skin changes the resolved palette, not Browser state or component code.
    applyResolvedTheme({
      variant: "light",
      surface: "rgb(247, 242, 232)",
      foreground: "rgb(54, 45, 35)",
      mutedForeground: "rgb(116, 98, 78)",
    });
    expect(getComputedStyle(home!).backgroundColor).toBe("rgb(247, 242, 232)");
    expect(getComputedStyle(mounted.getByText("No local servers").element()).color).toBe(
      "rgb(54, 45, 35)",
    );

    applyResolvedTheme({
      variant: "dark",
      surface: "rgb(14, 14, 14)",
      foreground: "rgb(245, 245, 245)",
      mutedForeground: "rgb(163, 163, 163)",
    });
    expect(getComputedStyle(home!).backgroundColor).toBe("rgb(14, 14, 14)");
    expect(getComputedStyle(mounted.getByText("No local servers").element()).color).toBe(
      "rgb(245, 245, 245)",
    );
  });
});
