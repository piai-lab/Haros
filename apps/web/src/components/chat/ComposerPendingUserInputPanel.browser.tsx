import "../../index.css";

import { ApprovalRequestId } from "@omnimind/contracts";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { useState } from "react";

import { I18nProvider } from "../../i18n";
import {
  derivePendingUserInputSinglePresetAction,
  type PendingUserInputDraftAnswer,
} from "../../pendingUserInput";
import type { PendingUserInput } from "../../session-logic";
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

const singlePrompt = {
  requestId: ApprovalRequestId.makeUnsafe("ask-single-auto-advance"),
  createdAt: "2026-08-25T00:00:00.000Z",
  questions: [
    {
      id: "runtime",
      header: "Runtime",
      question: "选择运行时母体？",
      options: [
        { label: "成熟母体", description: "保留生命周期骨架" },
        { label: "从零开发", description: "承担全部维护责任" },
      ],
    },
    {
      id: "activation",
      header: "Activation",
      question: "何时激活？",
      options: [
        { label: "全部门通过后", description: "最后一次注册" },
        { label: "立即激活", description: "提前公开 schema" },
      ],
    },
  ],
} as const;

const exactSinglePrompt = {
  ...singlePrompt,
  requestId: ApprovalRequestId.makeUnsafe("ask-single-direct-submit"),
  questions: [singlePrompt.questions[0]!],
} as const;

function Harness({
  initialAnswers = {},
  pending = prompt,
  onCancel = vi.fn(),
  onAdvance = vi.fn(),
  onSubmit = vi.fn(),
  isResponding = false,
  isFocusedPane = true,
}: {
  initialAnswers?: Record<string, PendingUserInputDraftAnswer>;
  pending?: PendingUserInput;
  onCancel?: () => void;
  onAdvance?: () => void;
  onSubmit?: (answers: unknown) => void;
  isResponding?: boolean;
  isFocusedPane?: boolean;
}) {
  const [answers, setAnswers] =
    useState<Record<string, PendingUserInputDraftAnswer>>(initialAnswers);
  const [questionIndex, setQuestionIndex] = useState(0);
  return (
    <I18nProvider>
      <ComposerPendingUserInputPanel
        pendingUserInputs={[pending]}
        isResponding={isResponding}
        answers={answers}
        questionIndex={questionIndex}
        isFocusedPane={isFocusedPane}
        onChangeAnswer={(questionId, answer) =>
          setAnswers((current) => ({ ...current, [questionId]: answer }))
        }
        onSelectSinglePreset={(questionId, answer) => {
          const action = derivePendingUserInputSinglePresetAction(
            pending.questions,
            answers,
            questionIndex,
            questionId,
            answer,
          );
          setAnswers((current) => ({ ...current, [questionId]: answer }));
          if (action?.kind === "question") setQuestionIndex(action.questionIndex);
          if (action?.kind === "submit") onSubmit(action.answers);
        }}
        onAdvance={onAdvance}
        onPrevious={vi.fn()}
        onCancel={onCancel}
      />
    </I18nProvider>
  );
}

describe("ComposerPendingUserInputPanel", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps preset and custom answer editable together in the Question card", async () => {
    const screen = await render(<Harness />);

    await page.getByRole("checkbox", { name: /功能实现/ }).click();
    const custom = page.getByRole("checkbox", { name: /自定义.*补充自己的答案/ });
    await custom.click();
    const customInput = page.getByRole("textbox", { name: "自定义答案" });
    await expect.element(customInput).toHaveFocus();
    await customInput.fill("同时保留作者测试。  ");

    expect((customInput.element() as HTMLTextAreaElement).value).toBe("同时保留作者测试。  ");
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
    expect(document.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(1);
    await screen.unmount();
  });

  it("keeps recommendation and preview advisory until the user selects the option", async () => {
    const screen = await render(<Harness />);
    await expect.element(page.getByText("推荐", { exact: true })).toBeVisible();
    expect(document.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(0);

    await page.getByRole("button", { name: "预览" }).click();
    await expect.element(page.getByText("只在用户显式展开后显示。", { exact: true })).toBeVisible();
    await expect.element(page.getByText("与当前成熟运行时一致。", { exact: true })).toBeVisible();
    expect(document.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(0);
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

  it("keeps the Question card focused on cancelling the answer", async () => {
    const onCancel = vi.fn();
    const screen = await render(<Harness onCancel={onCancel} />);

    await page.getByRole("button", { name: "取消" }).click();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(page.getByRole("button", { name: "停止生成" }).query()).toBeNull();
    await screen.unmount();
  });

  it("auto-advances middle single presets and keeps the final preset for explicit submit", async () => {
    const onSubmit = vi.fn();
    const screen = await render(<Harness pending={singlePrompt} onSubmit={onSubmit} />);

    await expect.element(page.getByText("选择运行时母体？", { exact: true })).toHaveFocus();
    await expect.element(page.getByRole("status")).toHaveTextContent("第 1 题，共 2 题");
    expect(page.getByRole("status").element().textContent).not.toContain("选择运行时母体");

    await page.getByRole("radio", { name: /成熟母体/ }).click();
    await expect.element(page.getByText("何时激活？", { exact: true })).toBeVisible();
    await expect.element(page.getByText("何时激活？", { exact: true })).toHaveFocus();
    await expect.element(page.getByRole("status")).toHaveTextContent("第 2 题，共 2 题");
    expect(onSubmit).not.toHaveBeenCalled();

    await page.getByRole("radio", { name: /全部门通过后/ }).click();
    await expect.element(page.getByText("何时激活？", { exact: true })).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it("submits an exact single preset once without a Review screen", async () => {
    const onSubmit = vi.fn();
    const screen = await render(<Harness pending={exactSinglePrompt} onSubmit={onSubmit} />);

    await page.getByRole("radio", { name: /成熟母体/ }).click();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      runtime: { selectedOptionLabels: ["成熟母体"] },
    });
    expect(document.body.textContent).not.toContain("确认回答");
    await screen.unmount();
  });

  it("keeps single custom and multiple presets on explicit navigation", async () => {
    const singleAdvance = vi.fn();
    const singleScreen = await render(<Harness pending={singlePrompt} onAdvance={singleAdvance} />);
    await page.getByRole("radio", { name: /自定义.*输入自己的答案/ }).click();
    await expect.element(page.getByRole("textbox", { name: "自定义答案" })).toHaveFocus();
    await expect.element(page.getByText("选择运行时母体？", { exact: true })).toBeVisible();
    expect(singleAdvance).not.toHaveBeenCalled();
    await singleScreen.unmount();

    const multiAdvance = vi.fn();
    const multiScreen = await render(<Harness onAdvance={multiAdvance} />);
    await page.getByRole("checkbox", { name: /功能实现/ }).click();
    await expect.element(page.getByText("哪些结果需要一并交付？", { exact: true })).toBeVisible();
    expect(multiAdvance).not.toHaveBeenCalled();
    await multiScreen.unmount();
  });

  it("uses scoped number shortcuts for the same exact single submit owner", async () => {
    const onSubmit = vi.fn();
    const screen = await render(<Harness pending={exactSinglePrompt} onSubmit={onSubmit} />);
    const heading = page.getByText("选择运行时母体？", { exact: true });
    heading
      .element()
      .dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true, cancelable: true }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it("keeps answer controls disabled while responding without duplicating global Stop", async () => {
    const screen = await render(<Harness isResponding />);

    await expect.element(page.getByRole("checkbox", { name: /功能实现/ })).toBeDisabled();
    await expect.element(page.getByRole("button", { name: "取消" })).toBeDisabled();
    expect(page.getByRole("button", { name: "停止生成" }).query()).toBeNull();
    await screen.unmount();
  });

  it("does not steal focus from a background split pane", async () => {
    const outside = document.createElement("button");
    outside.textContent = "foreground";
    document.body.append(outside);
    outside.focus();
    const screen = await render(<Harness pending={singlePrompt} isFocusedPane={false} />);

    expect(document.activeElement).toBe(outside);
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
