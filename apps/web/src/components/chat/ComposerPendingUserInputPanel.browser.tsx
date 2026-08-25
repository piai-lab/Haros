import "../../index.css";

import { ApprovalRequestId } from "@omnimind/contracts";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { useState } from "react";

import { I18nProvider } from "../../i18n";
import type { PendingUserInputDraftAnswer } from "../../pendingUserInput";
import { ComposerPendingUserInputPanel } from "./ComposerPendingUserInputPanel";

const harness = vi.hoisted((): { localePreference: "en" | "zh-CN" } => ({
  localePreference: "zh-CN",
}));

vi.mock("../../localPreferences", () => ({
  useLocalPreferences: () => ({ preferences: harness }),
}));

const prompt = {
  requestId: ApprovalRequestId.makeUnsafe("ask-occam"),
  createdAt: "2026-08-25T00:00:00.000Z",
  questions: [
    {
      id: "delivery",
      header: "Delivery",
      question: "哪些结果需要一并交付？",
      multiSelect: true,
      options: [
        {
          label: "功能实现",
          description: "可直接使用的完整路径",
          preview: "只在用户显式展开后显示。",
          recommended: true,
          recommendationReason: "与当前成熟运行时一致。",
        },
        { label: "自动化测试", description: "保护关键生命周期" },
      ],
    },
  ],
} as const;

const textPrompt = {
  requestId: ApprovalRequestId.makeUnsafe("ask-text-suggestion"),
  createdAt: "2026-08-25T00:00:00.000Z",
  questions: [
    {
      id: "constraint",
      header: "Constraint",
      question: "还有什么约束？",
      options: [],
      suggestion: { text: "不要建立第二套 UI。  ", reason: "保持唯一投影 owner" },
    },
  ],
} as const;

function Harness({
  reviewing = false,
  initialAnswers = {},
  pending = prompt,
  onStop = vi.fn(),
}: {
  reviewing?: boolean;
  initialAnswers?: Record<string, PendingUserInputDraftAnswer>;
  pending?: typeof prompt | typeof textPrompt;
  onStop?: () => void;
}) {
  const [answers, setAnswers] =
    useState<Record<string, PendingUserInputDraftAnswer>>(initialAnswers);
  return (
    <I18nProvider>
      <ComposerPendingUserInputPanel
        pendingUserInputs={[pending]}
        isResponding={false}
        answers={answers}
        questionIndex={0}
        isReviewing={reviewing}
        onChangeAnswer={(questionId, answer) =>
          setAnswers((current) => ({ ...current, [questionId]: answer }))
        }
        onAdvance={vi.fn()}
        onPrevious={vi.fn()}
        onEditQuestion={vi.fn()}
        onCancel={vi.fn()}
        onStop={onStop}
      />
    </I18nProvider>
  );
}

describe("ComposerPendingUserInputPanel", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps preset, custom answer, and note editable in the Question card", async () => {
    const screen = await render(<Harness />);

    await page.getByRole("checkbox", { name: /功能实现/ }).click();
    await expect.element(page.getByText("补充说明", { exact: true })).toBeVisible();
    const note = page.getByPlaceholder("补充所选答案的边界、条件或理由");
    await note.fill("优先保护真实生命周期。  ");

    const custom = page.getByRole("checkbox", { name: /自定义.*补充自己的答案/ });
    await custom.click();
    const customInput = page.getByRole("textbox", { name: "自定义答案" });
    await expect.element(customInput).toHaveFocus();
    await customInput.fill("同时保留作者测试。  ");

    expect((customInput.element() as HTMLTextAreaElement).value).toBe("同时保留作者测试。  ");
    expect((note.element() as HTMLTextAreaElement).value).toBe("优先保护真实生命周期。  ");
    await expect.element(page.getByRole("checkbox", { name: /功能实现/ })).toBeChecked();
    await expect.element(custom).toBeChecked();

    await screen.unmount();
  });

  it("scopes number shortcuts to the card and leaves number input untouched", async () => {
    const screen = await render(<Harness />);
    await page.getByRole("checkbox", { name: /自定义/ }).click();
    const customInput = page.getByRole("textbox", { name: "自定义答案" });
    await customInput.fill("2026");
    expect((customInput.element() as HTMLTextAreaElement).value).toBe("2026");
    expect(document.querySelectorAll('[role="checkbox"][aria-checked="true"]')).toHaveLength(1);
    await screen.unmount();
  });

  it("keeps recommendation and preview advisory until the user selects the option", async () => {
    const screen = await render(<Harness />);
    await expect.element(page.getByText("推荐", { exact: true })).toBeVisible();
    expect(document.querySelectorAll('[role="checkbox"][aria-checked="true"]')).toHaveLength(0);

    await page.getByRole("button", { name: "预览" }).click();
    await expect.element(page.getByText("只在用户显式展开后显示。", { exact: true })).toBeVisible();
    await expect.element(page.getByText("与当前成熟运行时一致。", { exact: true })).toBeVisible();
    expect(document.querySelectorAll('[role="checkbox"][aria-checked="true"]')).toHaveLength(0);
    await screen.unmount();
  });

  it("copies a text suggestion only after the explicit use action", async () => {
    const screen = await render(<Harness pending={textPrompt} />);
    const input = page.getByRole("textbox", { name: "回答" });
    expect((input.element() as HTMLTextAreaElement).value).toBe("");

    await page.getByRole("button", { name: "查看建议" }).click();
    await expect.element(page.getByText("不要建立第二套 UI。", { exact: true })).toBeVisible();
    expect((input.element() as HTMLTextAreaElement).value).toBe("");
    await page.getByRole("button", { name: "采用建议" }).click();
    expect((input.element() as HTMLTextAreaElement).value).toBe("不要建立第二套 UI。  ");
    await screen.unmount();
  });

  it("keeps Stop Turn distinct from cancelling the Ask", async () => {
    const onStop = vi.fn();
    const screen = await render(<Harness onStop={onStop} />);

    await page.getByRole("button", { name: "停止生成" }).click();

    expect(onStop).toHaveBeenCalledTimes(1);
    await expect.element(page.getByRole("button", { name: "取消" })).toBeVisible();
    await screen.unmount();
  });

  it("reviews the main answer and note as separate facts", async () => {
    const screen = await render(
      <Harness
        reviewing
        initialAnswers={{
          delivery: {
            selectedOptionLabels: ["功能实现", "自动化测试"],
            customSelected: true,
            customText: "同时保留作者测试。  ",
            note: "优先保护真实生命周期。  ",
          },
        }}
      />,
    );

    await expect.element(page.getByText("确认回答", { exact: true })).toBeVisible();
    await expect.element(page.getByText(/功能实现.*自动化测试.*同时保留作者测试/)).toBeVisible();
    await expect.element(page.getByText(/补充说明: 优先保护真实生命周期/)).toBeVisible();
    await screen.unmount();
  });

  it.each([
    [800, 520],
    [430, 820],
  ])("stays inside a %dpx viewport", async (width, height) => {
    await page.viewport(width, height);
    const screen = await render(<Harness />);
    expect(document.body.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
    expect(screen.container.scrollWidth).toBeLessThanOrEqual(screen.container.clientWidth + 1);
    await screen.unmount();
  });
});
