import "../../index.css";

import { TurnId, type OrchestrationThreadActivity } from "@omnimind/contracts";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { I18nProvider } from "../../i18n";
import { makeActivity } from "../../storeTestFixtures";
import { deriveWorkLogEntries } from "../../workLog";
import { ComposerSlashStatusDialog } from "./ComposerSlashStatusDialog";
import { RateLimitBanner } from "./RateLimitBanner";
import { TimelineWorkEntryRow } from "./TimelineWorkEntryRow";

const harness = vi.hoisted((): { settings: { localePreference: "en" | "zh-CN" } } => ({
  settings: { localePreference: "zh-CN" },
}));

vi.mock("../../appSettings", () => ({
  useAppSettings: () => ({ settings: harness.settings }),
}));

async function renderTaskSnapshotRow(input: {
  locale: "en" | "zh-CN";
  turnId: string;
  activities: OrchestrationThreadActivity[];
}) {
  harness.settings.localePreference = input.locale;
  const [workEntry] = deriveWorkLogEntries(input.activities, TurnId.makeUnsafe(input.turnId));
  if (!workEntry) {
    throw new Error("Expected a task snapshot work entry.");
  }
  return render(
    <I18nProvider>
      <TimelineWorkEntryRow
        workEntry={workEntry}
        chatMetaFontSizePx={12}
        textFontSizePx={13}
        density="compact"
        onImageExpand={() => {}}
        markdownCwd={undefined}
        timestampFormat="24-hour"
      />
    </I18nProvider>,
  );
}

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

  it.each([
    { locale: "en", expected: "2 of 2 tasks completed" },
    { locale: "zh-CN", expected: "已完成 2 / 2 个任务" },
  ] as const)(
    "renders completed task snapshot progress in $locale",
    async ({ locale, expected }) => {
      const screen = await renderTaskSnapshotRow({
        locale,
        turnId: "turn-task-snapshot",
        activities: [
          makeActivity({
            id: `task-snapshot-${locale}`,
            createdAt: "2026-08-17T10:00:00.000Z",
            kind: "turn.tasks.updated",
            summary: "Tasks updated",
            tone: "info",
            turnId: "turn-task-snapshot",
            payload: {
              tasks: [
                { task: "Implement snapshot row", status: "completed" },
                { task: "Verify snapshot row", status: "completed" },
              ],
            },
          }),
        ],
      });

      await expect.element(page.getByText(expected, { exact: true })).toBeVisible();
      expect(document.body.textContent).not.toContain("Tasks updated");

      await screen.unmount();
    },
  );

  it("keeps the latest in-progress task beside the localized snapshot heading", async () => {
    const screen = await renderTaskSnapshotRow({
      locale: "en",
      turnId: "turn-task-progress",
      activities: [
        makeActivity({
          id: "task-snapshot-start",
          createdAt: "2026-08-17T10:00:00.000Z",
          kind: "turn.tasks.updated",
          summary: "Tasks updated",
          tone: "info",
          turnId: "turn-task-progress",
          payload: {
            tasks: [
              { task: "Implement snapshot row", status: "inProgress" },
              { task: "Verify causal ordering", status: "pending" },
            ],
          },
        }),
        makeActivity({
          id: "task-snapshot-progress",
          createdAt: "2026-08-17T10:00:01.000Z",
          kind: "turn.tasks.updated",
          summary: "Tasks updated",
          tone: "info",
          turnId: "turn-task-progress",
          payload: {
            tasks: [
              { task: "Implement snapshot row", status: "completed" },
              { task: "Verify causal ordering", status: "inProgress" },
            ],
          },
        }),
      ],
    });

    await expect
      .element(page.getByText("1 of 2 tasks completed Verify causal ordering", { exact: true }))
      .toBeVisible();

    await screen.unmount();
  });
});
