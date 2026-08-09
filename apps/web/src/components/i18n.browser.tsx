import "../index.css";

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "zh-CN" },
}));

vi.mock("../appSettings", () => ({
  useAppSettings: () => ({ settings: harness.settings }),
}));

import { DocumentLocaleSync, I18nProvider, useI18n } from "../i18n";

function LocaleProbe({ onEnglish }: { onEnglish: () => void }) {
  const { locale, t } = useI18n();
  return (
    <>
      <DocumentLocaleSync />
      <output aria-label="active locale">{locale}</output>
      <p>{t("composer.emptyChat")}</p>
      <button type="button" onClick={onEnglish}>
        English
      </button>
    </>
  );
}

function LocaleHarness() {
  const [preference, setPreference] = useState("zh-CN");
  harness.settings.localePreference = preference;
  return (
    <I18nProvider>
      <LocaleProbe onEnglish={() => setPreference("en")} />
    </I18nProvider>
  );
}

describe("I18nProvider", () => {
  it("switches the mounted UI and document language from the same app setting", async () => {
    harness.settings.localePreference = "zh-CN";
    const screen = await render(<LocaleHarness />);

    await expect.element(screen.getByText("我们要一起做什么？")).toBeVisible();
    await expect.element(screen.getByLabelText("active locale")).toHaveTextContent("zh-CN");
    expect(document.documentElement.lang).toBe("zh-CN");

    await screen.getByRole("button", { name: "English" }).click();

    await expect.element(screen.getByText("What should we work on?")).toBeVisible();
    await expect.element(screen.getByLabelText("active locale")).toHaveTextContent("en");
    expect(document.documentElement.lang).toBe("en");
  });
});
