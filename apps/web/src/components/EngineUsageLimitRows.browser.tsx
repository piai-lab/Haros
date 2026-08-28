// FILE: EngineUsageLimitRows.browser.tsx
// Purpose: Browser proof for localized engine-window labels and progress-track accessibility.

import "../index.css";

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "en" as "en" | "zh-CN" },
}));

vi.mock("../localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

import { I18nProvider } from "../i18n";
import { deriveProviderUsageDisplayRows } from "../lib/providerUsageDisplay";
import { EngineUsageLimitRows } from "./EngineUsageLimitRows";

const rows = deriveProviderUsageDisplayRows([
  {
    engine: "claude",
    updatedAt: "2099-04-08T18:00:00.000Z",
    limits: [
      { window: "Weekly", usedPercent: 10 },
      { window: "seven_day_overage_included", usedPercent: 20 },
      { window: "new_provider_window", usedPercent: 30 },
    ],
  },
]);

describe("EngineUsageLimitRows", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each([
    {
      locale: "en" as const,
      visibleLabels: ["Weekly", "Weekly (overage)", "Other limit · New Engine Window"],
      ariaLabels: [
        "Weekly remaining",
        "Weekly (overage) remaining",
        "Other limit · New Engine Window remaining",
      ],
    },
    {
      locale: "zh-CN" as const,
      visibleLabels: ["Weekly", "每周（超额用量）", "其他限额 · New Engine Window"],
      ariaLabels: [
        "Weekly 剩余量",
        "每周（超额用量） 剩余量",
        "其他限额 · New Engine Window 剩余量",
      ],
    },
  ])("renders ordered product labels and matching progress names in $locale", async (testCase) => {
    harness.settings.localePreference = testCase.locale;
    const screen = await render(
      <I18nProvider>
        <EngineUsageLimitRows rows={rows} surface="settings" />
      </I18nProvider>,
    );

    const text = document.body.textContent ?? "";
    const labelOffsets = testCase.visibleLabels.map((label) => text.indexOf(label));
    expect(labelOffsets.every((offset) => offset >= 0)).toBe(true);
    expect(labelOffsets).toEqual(labelOffsets.toSorted((a, b) => a - b));
    expect(text).not.toContain("new_provider_window");

    for (const ariaLabel of testCase.ariaLabels) {
      await expect.element(screen.getByRole("progressbar", { name: ariaLabel })).toBeVisible();
    }
  });
});
