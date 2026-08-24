// FILE: BrowserPanel.theme.browser.tsx
// Purpose: Locks Browser-owned empty surfaces to the resolved app theme.
// Layer: Browser UI regression

import "../index.css";

import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { BrowserLocalServersHome } from "./BrowserPanel";

function applyResolvedTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.setProperty(
    "--color-background-surface",
    theme === "light" ? "rgb(250, 250, 250)" : "rgb(14, 14, 14)",
  );
  root.style.setProperty(
    "--foreground",
    theme === "light" ? "rgb(31, 31, 31)" : "rgb(245, 245, 245)",
  );
  root.style.setProperty(
    "--muted-foreground",
    theme === "light" ? "rgb(102, 102, 102)" : "rgb(163, 163, 163)",
  );
}

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.classList.remove("dark");
  document.documentElement.style.removeProperty("--color-background-surface");
  document.documentElement.style.removeProperty("--foreground");
  document.documentElement.style.removeProperty("--muted-foreground");
});

describe("BrowserPanel resolved theme", () => {
  it("keeps the local-server home synchronized with light and dark app surfaces", async () => {
    applyResolvedTheme("light");
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

    applyResolvedTheme("dark");
    expect(getComputedStyle(home!).backgroundColor).toBe("rgb(14, 14, 14)");
    expect(getComputedStyle(mounted.getByText("No local servers").element()).color).toBe(
      "rgb(245, 245, 245)",
    );
  });
});
