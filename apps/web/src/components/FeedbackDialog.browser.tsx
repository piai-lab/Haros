// FILE: FeedbackDialog.browser.tsx
// Purpose: Proves the public feedback flow opens a reviewable GitHub issue draft.
// Layer: Browser UI test

import "../index.css";

import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { FeedbackDialog } from "./FeedbackDialog";
import { I18nProvider } from "../i18n";

const i18n = vi.hoisted(() => ({ settings: { localePreference: "zh-CN" } }));

vi.mock("../localPreferences", () => ({
  useLocalPreferences: () => ({ preferences: i18n.settings }),
}));

const EMPTY_CONTEXT = {
  engine: null,
  model: null,
  projectKind: null,
  environmentMode: null,
  runtimeMode: null,
  interactionMode: null,
  sessionStatus: null,
  latestTurnState: null,
  messageCount: 0,
  activityCount: 0,
  hasPendingApproval: false,
  hasPendingUserInput: false,
  hasThreadError: false,
};

describe("FeedbackDialog", () => {
  afterEach(cleanup);

  it("keeps the GitHub action disabled until the user writes feedback", async () => {
    await render(
      <FeedbackDialog open context={EMPTY_CONTEXT} onOpenChange={vi.fn()} onOpenIssue={vi.fn()} />,
    );

    await expect
      .element(page.getByRole("button", { name: "Open GitHub issue draft" }))
      .toBeDisabled();
    await expect
      .element(page.getByText(/Nothing is submitted until you confirm on GitHub/))
      .toBeVisible();
  });

  it("renders the same public boundary in simplified Chinese", async () => {
    await render(
      <I18nProvider>
        <FeedbackDialog open context={EMPTY_CONTEXT} onOpenChange={vi.fn()} onOpenIssue={vi.fn()} />
      </I18nProvider>,
    );

    await expect.element(page.getByRole("heading", { name: "提交反馈" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: /任务/ })).toBeVisible();
    await expect.element(page.getByText(/确认前不会提交任何内容/)).toBeVisible();
    await expect.element(page.getByText(/绝不会发送提示、消息、代码或文件内容/)).toBeVisible();
  });

  it("opens a reviewable issue draft and closes the dialog", async () => {
    const onOpenIssue = vi.fn();
    const onOpenChange = vi.fn();
    await render(
      <FeedbackDialog
        open
        context={EMPTY_CONTEXT}
        onOpenChange={onOpenChange}
        onOpenIssue={onOpenIssue}
      />,
    );

    await page.getByLabelText("Feedback details").fill("Please keep this exact draft.");
    await page.getByRole("button", { name: "Open GitHub issue draft" }).click();

    expect(onOpenIssue).toHaveBeenCalledTimes(1);
    const url = new URL(onOpenIssue.mock.calls[0]?.[0] as string);
    expect(url.origin + url.pathname).toBe("https://github.com/piai-lab/HarnessOS/issues/new");
    expect(url.searchParams.get("body")).toContain("Please keep this exact draft.");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
