// FILE: EnvironmentAutomationsSection.browser.tsx
// Purpose: Browser-level regression tests for thread automation rows in the Environment panel.
// Layer: Vitest browser tests

import "../../../index.css";

import { AutomationId, ProjectId, ThreadId, type AutomationDefinition } from "@omnimind/contracts";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "en" },
}));

vi.mock("~/appSettings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/appSettings")>()),
  useAppSettings: () => ({ settings: harness.settings }),
}));

import { I18nProvider } from "~/i18n";
import { EnvironmentAutomationsSection } from "./EnvironmentAutomationsSection";

const baseAutomation = (overrides: Partial<AutomationDefinition> = {}): AutomationDefinition => ({
  id: AutomationId.makeUnsafe("automation-monitor-pr-220"),
  projectId: ProjectId.makeUnsafe("project-omnimind"),
  sourceThreadId: null,
  name: "Monitor PR #220 Codex review",
  prompt: "Monitor the pull request review status.",
  schedule: { type: "interval", everySeconds: 180 },
  enabled: true,
  nextRunAt: "2026-06-21T15:00:00.000Z",
  modelSelection: { provider: "codex", model: "gpt-5-codex" },
  runtimeMode: "approval-required",
  interactionMode: "default",
  worktreeMode: "worktree",
  mode: "heartbeat",
  targetThreadId: ThreadId.makeUnsafe("thread-pr-220"),
  maxIterations: null,
  stopOnError: false,
  completionPolicy: { type: "none" },
  completionPolicyVersion: 1,
  completionPolicyUpdatedAt: "2026-06-21T14:00:00.000Z",
  minimumIntervalSeconds: 60,
  maxRuntimeSeconds: null,
  retryPolicy: { type: "none" },
  misfirePolicy: "coalesce",
  acknowledgedRisks: [],
  iterationCount: 0,
  createdAt: "2026-06-21T14:00:00.000Z",
  updatedAt: "2026-06-21T14:00:00.000Z",
  archivedAt: null,
  ...overrides,
});

describe("EnvironmentAutomationsSection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    harness.settings.localePreference = "en";
  });

  it("shows the thread automation cadence and opens the editor callback", async () => {
    const definition = baseAutomation();
    const onOpenAutomation = vi.fn();

    await render(
      <EnvironmentAutomationsSection
        automations={[{ definition }]}
        onOpenAutomation={onOpenAutomation}
      />,
    );

    expect(page.getByText("Automations")).toBeInTheDocument();
    expect(page.getByText("Every 3m")).toBeInTheDocument();

    await page
      .getByRole("button", { name: "Edit automation Monitor PR #220 Codex review" })
      .click();

    expect(onOpenAutomation).toHaveBeenCalledWith(definition);
  });

  it("marks disabled thread automations as paused", async () => {
    await render(
      <EnvironmentAutomationsSection
        automations={[{ definition: baseAutomation({ enabled: false }) }]}
        onOpenAutomation={vi.fn()}
      />,
    );

    expect(page.getByText("Paused")).toBeInTheDocument();
  });

  it("renders Automation-owned labels and cadence in Chinese", async () => {
    harness.settings.localePreference = "zh-CN";
    const definition = baseAutomation();
    await render(
      <I18nProvider>
        <EnvironmentAutomationsSection automations={[{ definition }]} onOpenAutomation={vi.fn()} />
      </I18nProvider>,
    );

    expect(page.getByText("自动化")).toBeInTheDocument();
    expect(page.getByText("每 3 分钟")).toBeInTheDocument();
    expect(
      page.getByRole("button", { name: "编辑自动化 Monitor PR #220 Codex review" }),
    ).toBeInTheDocument();
  });
});
