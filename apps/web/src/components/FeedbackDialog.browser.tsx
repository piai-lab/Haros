// FILE: FeedbackDialog.browser.tsx
// Purpose: Proves feedback delivery failure preserves the user's visible draft.
// Layer: Browser UI test

import "../index.css";

import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

const delivery = vi.hoisted(() => ({ submit: vi.fn() }));
const i18n = vi.hoisted(() => ({ settings: { localePreference: "zh-CN" } }));

vi.mock("../appSettings", () => ({
  useAppSettings: () => ({ settings: i18n.settings }),
}));

vi.mock("../feedback", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../feedback")>();
  return { ...actual, submitFeedback: delivery.submit };
});

import { FeedbackDialog } from "./FeedbackDialog";
import { FeedbackDeliveryCancelledError } from "../feedback";
import { I18nProvider } from "../i18n";

const EMPTY_CONTEXT = {
  provider: null,
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
  afterEach(async () => {
    await cleanup();
    delivery.submit.mockReset();
  });

  it("shows unavailable before submission and sends no request", async () => {
    const onOpenChange = vi.fn();
    await render(<FeedbackDialog open context={EMPTY_CONTEXT} onOpenChange={onOpenChange} />);

    await expect.element(page.getByRole("status")).toHaveTextContent("unavailable in this build");
    await expect
      .element(page.getByText(/If feedback delivery is activated in a future production build/))
      .toBeInTheDocument();
    const details = page.getByLabelText("Feedback details");
    await details.fill("Keep this local draft.");
    await expect.element(page.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(delivery.submit).not.toHaveBeenCalled();
  });

  it("renders categories and privacy boundaries in simplified Chinese", async () => {
    await render(
      <I18nProvider>
        <FeedbackDialog open context={EMPTY_CONTEXT} onOpenChange={vi.fn()} />
      </I18nProvider>,
    );

    await expect.element(page.getByRole("heading", { name: "提交反馈" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: /任务/ })).toBeVisible();
    await expect
      .element(page.getByText(/绝不会发送提示、消息、代码或文件内容/))
      .toBeVisible();
    await expect.element(page.getByRole("button", { name: "提交" })).toBeDisabled();
  });

  it("keeps the draft and dialog open when an activated delivery fails", async () => {
    const onOpenChange = vi.fn();
    delivery.submit.mockRejectedValue(
      new Error("Feedback delivery is not available in this build. Your draft has been kept."),
    );
    await render(
      <FeedbackDialog
        open
        context={EMPTY_CONTEXT}
        onOpenChange={onOpenChange}
        deliveryOptions={{
          configuredEndpoint: "https://omnimind.wisdomeyes.cn/api/v1/feedback",
          isProduction: true,
        }}
      />,
    );

    const details = page.getByLabelText("Feedback details");
    await details.fill("Please keep this exact draft.");
    await page.getByRole("button", { name: "Submit" }).click();

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Feedback delivery is not available in this build");
    await expect.element(details).toHaveValue("Please keep this exact draft.");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(delivery.submit).toHaveBeenCalledTimes(1);
  });

  it("offers an explicit cancel while sending and keeps the draft", async () => {
    const onOpenChange = vi.fn();
    let rejectDelivery: ((error: Error) => void) | undefined;
    delivery.submit.mockImplementation(async () => {
      await new Promise<void>((_resolve, reject) => {
        rejectDelivery = reject;
      });
    });
    await render(
      <FeedbackDialog
        open
        context={EMPTY_CONTEXT}
        onOpenChange={onOpenChange}
        deliveryOptions={{
          configuredEndpoint: "https://omnimind.wisdomeyes.cn/api/v1/feedback",
          isProduction: true,
        }}
      />,
    );

    const details = page.getByLabelText("Feedback details");
    await details.fill("Keep this draft after cancel.");
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByRole("button", { name: "Cancel sending" }).click();

    expect(delivery.submit.mock.calls[0]?.[1].signal.aborted).toBe(true);
    rejectDelivery?.(new FeedbackDeliveryCancelledError());
    await vi.waitFor(
      () => expect(document.body.textContent).toContain("Feedback sending was cancelled"),
      { timeout: 3_000 },
    );
    await expect.element(page.getByRole("alert")).toHaveTextContent("cancelled");
    await expect.element(details).toHaveValue("Keep this draft after cancel.");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
