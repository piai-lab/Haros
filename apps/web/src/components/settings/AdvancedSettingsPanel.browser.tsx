// FILE: AdvancedSettingsPanel.browser.tsx
// Purpose: Browser characterization for advanced-settings ownership and disclosure behavior.
// Layer: Browser UI test

import "../../index.css";

import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  config: {
    keybindingsConfigPath: "/tmp/keybindings.json",
    availableEditors: [],
  },
  auth: { authenticated: true, role: "client" },
  threadShells: [] as unknown[],
  allThreadsMessageless: false,
  projects: [{ id: "project-1" }],
  threadsHydrated: true,
  syncServerReadModel: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: readonly string[] }) => ({
    data: options.queryKey[0] === "config" ? harness.config : harness.auth,
  }),
}));

vi.mock("~/lib/serverReactQuery", () => ({
  serverConfigQueryOptions: () => ({ queryKey: ["config"] }),
  serverAuthSessionQueryOptions: () => ({ queryKey: ["auth"] }),
}));

vi.mock("~/storeSelectors", () => ({
  createThreadShellsSelector: () => () => harness.threadShells,
  createAllThreadsMessagelessSelector: () => () => harness.allThreadsMessageless,
}));

vi.mock("~/store", () => ({
  useStore: (selector: (store: Record<string, unknown>) => unknown) =>
    selector({
      projects: harness.projects,
      threadsHydrated: harness.threadsHydrated,
      syncServerReadModel: harness.syncServerReadModel,
    }),
}));

import { AdvancedSettingsPanel } from "./AdvancedSettingsPanel";

describe("AdvancedSettingsPanel", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("owns recovery eligibility and shared disclosure motion", async () => {
    await render(<AdvancedSettingsPanel active resetEpoch={0} />);

    const repairButton = page.getByRole("button", { name: "Repair state" });
    expect((repairButton.element() as HTMLButtonElement).disabled).toBe(false);
    expect(document.body.textContent).toContain("Authenticated as client.");

    const disclosureButton = page.getByRole("button", { name: "What this does" });
    expect(disclosureButton.element().getAttribute("aria-expanded")).toBe("false");
    const disclosureShell = disclosureButton.element().parentElement?.querySelector("div[inert]");
    expect(disclosureShell?.className).toContain("duration-220");
    await disclosureButton.click();
    await vi.waitFor(() =>
      expect(disclosureButton.element().getAttribute("aria-expanded")).toBe("true"),
    );
  });

  it("discloses product identity, exact Pi package truth, authority, and legal entry", async () => {
    await render(<AdvancedSettingsPanel active resetEpoch={0} />);

    expect(document.body.textContent).toContain("OmniMind Agent");
    expect(document.body.textContent).toContain("Bundled Pi distribution");
    expect(document.body.textContent).toContain("@earendil-works/pi-coding-agent@0.81.1");
    expect(document.body.textContent).toContain("Pi owns native Session behavior");
    expect(document.body.textContent).toContain("isolated Native Host is not implemented");
    expect(document.body.textContent).toContain("process isolation is not claimed");

    const source = page.getByRole("link", { name: "earendil-works/pi package repository" });
    expect(source.element().getAttribute("href")).toBe("https://github.com/earendil-works/pi");
    const license = page.getByRole("link", { name: "Adopted UI MIT license" });
    expect(license.element().getAttribute("href")).toBe("/licenses/ui-mother-MIT.txt");
    expect(
      page.getByRole("link", { name: "Third-party notices" }).element().getAttribute("href"),
    ).toBe("/licenses/THIRD-PARTY-NOTICES.txt");
    expect(
      page.getByRole("link", { name: "Dependency inventory" }).element().getAttribute("href"),
    ).toBe("/licenses/release-dependencies.json");
    expect(page.getByRole("link", { name: "CycloneDX SBOM" }).element().getAttribute("href")).toBe(
      "/licenses/sbom.cdx.json",
    );
  });
});
