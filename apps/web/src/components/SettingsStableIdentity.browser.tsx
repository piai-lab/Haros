// FILE: SettingsStableIdentity.browser.tsx
// Purpose: Prove Settings search, URL targets, and real DOM anchors share locale-independent identity.
// Layer: Browser UI test

import "../index.css";

import { useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "en" as "en" | "zh-CN" },
}));

vi.mock("../appSettings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../appSettings")>();
  return {
    ...actual,
    useAppSettings: () => ({ settings: harness.settings }),
  };
});

import { I18nProvider, useI18n } from "../i18n";
import { GENERAL_SETTINGS_SEARCH } from "../settingsMetadata/coreSettings";
import { normalizeSettingsSection, type SettingsSectionId } from "../settingsNavigation";
import { SettingsSidebarNav } from "./SettingsSidebarNav";
import { SettingsRow, SettingsSection } from "./settings/SettingsPanelPrimitives";

function readInitialLocation(): { section: SettingsSectionId; target: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    section: normalizeSettingsSection(params.get("section")),
    target: params.get("target"),
  };
}

function SettingsIdentitySurface() {
  const { t } = useI18n();
  const initial = readInitialLocation();
  const [activeSection, setActiveSection] = useState(initial.section);
  const [target, setTarget] = useState(initial.target);

  useEffect(() => {
    if (!target) return;
    document.getElementById(target)?.scrollIntoView({ block: "start" });
  }, [activeSection, target]);

  const navigate = (section: SettingsSectionId, options?: { target?: string }) => {
    const nextTarget = options?.target ?? null;
    const params = new URLSearchParams({ section });
    if (nextTarget) params.set("target", nextTarget);
    window.history.replaceState(null, "", `?${params.toString()}`);
    setActiveSection(section);
    setTarget(nextTarget);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "13rem minmax(0, 1fr)", width: 480 }}>
      <SettingsSidebarNav
        activeSection={activeSection}
        onBack={() => {}}
        onSelectSection={navigate}
      />
      <main style={{ minWidth: 0 }}>
        {activeSection === "general" ? (
          <SettingsSection title={t("settings.general")}>
            <SettingsRow
              anchorId={GENERAL_SETTINGS_SEARCH.defaultProvider.target}
              title={t("settings.defaultProvider")}
              description={t("settings.defaultProviderDescription")}
            />
          </SettingsSection>
        ) : (
          <section aria-label={t("settings.integrations")}>
            <h1>{t("settings.integrations")}</h1>
          </section>
        )}
      </main>
    </div>
  );
}

async function renderLocale(locale: "en" | "zh-CN") {
  harness.settings.localePreference = locale;
  return render(
    <I18nProvider>
      <SettingsIdentitySurface />
    </I18nProvider>,
  );
}

describe("Settings stable search identity", () => {
  afterEach(() => {
    window.history.replaceState(null, "", window.location.pathname);
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("keeps one exact target across English search, Chinese remount, and narrow layout", async () => {
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});
    const english = await renderLocale("en");
    const englishSearch = english.getByRole("textbox", { name: "Search settings" });

    await englishSearch.fill("Default engine");
    await userEvent.keyboard("{Enter}");

    const stableTarget = GENERAL_SETTINGS_SEARCH.defaultProvider.target;
    expect(new URLSearchParams(window.location.search).get("target")).toBe(stableTarget);
    expect(document.getElementById(stableTarget)?.textContent).toContain("Default engine");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
    expect(scrollIntoView).toHaveBeenCalled();

    await english.unmount();
    scrollIntoView.mockClear();
    const chinese = await renderLocale("zh-CN");
    expect(new URLSearchParams(window.location.search).get("target")).toBe(stableTarget);
    expect(document.getElementById(stableTarget)?.textContent).toContain("默认引擎");
    expect(scrollIntoView).toHaveBeenCalled();

    const chineseSearch = chinese.getByRole("textbox", { name: "搜索设置" });
    await chineseSearch.fill("默认引擎");
    await expect.element(chinese.getByRole("button", { name: "默认引擎" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(chinese.getByRole("navigation", { name: "设置分区" })).toBeVisible();
    expect(document.activeElement).toBe(chineseSearch.element());
  });

  it("routes a panel-only result without inventing a missing DOM target", async () => {
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});
    const screen = await renderLocale("en");
    const search = screen.getByRole("textbox", { name: "Search settings" });

    await search.fill("External connections");
    await userEvent.keyboard("{Enter}");

    const params = new URLSearchParams(window.location.search);
    expect(params.get("section")).toBe("integrations");
    expect(params.has("target")).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
    await expect
      .element(screen.getByRole("region", { name: "External connections" }))
      .toBeVisible();
  });
});
