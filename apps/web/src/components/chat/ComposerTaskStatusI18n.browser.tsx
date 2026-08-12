import "../../index.css";

import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { I18nProvider } from "../../i18n";
import { ComposerSlashStatusDialog } from "./ComposerSlashStatusDialog";
import { RateLimitBanner } from "./RateLimitBanner";

const harness = vi.hoisted(() => ({ settings: { localePreference: "zh-CN" } }));

vi.mock("../../appSettings", () => ({
  useAppSettings: () => ({ settings: harness.settings }),
}));

describe("task status i18n", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("uses ordinary task vocabulary for status and rate-limit surfaces", async () => {
    const screen = await render(
      <I18nProvider>
        <ComposerSlashStatusDialog
          open
          onOpenChange={vi.fn()}
          selectedModel="mimo-v2-flash"
          nativeOptionsSummary="思考强度 · 高"
          interactionMode="default"
          envMode="local"
          envState="local"
          branch="main"
          contextWindow={null}
          cumulativeCostUsd={null}
          rateLimitStatus={null}
        />
        <RateLimitBanner rateLimitStatus={{ status: "allowed_warning", utilization: 0.8 }} />
      </I18nProvider>,
    );

    await expect.element(page.getByRole("heading", { name: "任务状态" })).toBeVisible();
    await expect.element(page.getByText("思考强度 · 高", { exact: true })).toBeVisible();
    await expect.element(page.getByText("当前任务尚未上报上下文用量。")).toBeVisible();
    await expect.element(page.getByText("即将达到速率限制（已使用 80%）。")).toBeVisible();
    expect(document.body.textContent).not.toContain("Session Status");
    expect(document.body.textContent).not.toContain("Fast mode");
    expect(document.body.textContent).not.toContain("Reasoning");
    expect(document.body.textContent).not.toContain("thread");

    await screen.unmount();
  });
});
