// FILE: SidebarThreadRowContent.browser.tsx
// Purpose: Characterizes the shared Sidebar thread-row identity and status presentation.
// Layer: Browser UI test

import "../index.css";

import { ProjectId, ThreadId } from "@omnimind/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "en" },
}));

vi.mock("../localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

import { I18nProvider } from "../i18n";
import { DEFAULT_INTERACTION_MODE, type SidebarThreadSummary } from "../types";
import { SidebarThreadRowContent } from "./SidebarThreadRowContent";

function makeThread(overrides: Partial<SidebarThreadSummary> = {}): SidebarThreadSummary {
  return {
    id: ThreadId.makeUnsafe("thread-row-content"),
    projectId: ProjectId.makeUnsafe("project-row-content"),
    title: "Shared thread row",
    modelSelection: { provider: "codex", model: "gpt-5.4" },
    interactionMode: DEFAULT_INTERACTION_MODE,
    branch: null,
    worktreePath: null,
    session: null,
    createdAt: "2026-07-19T12:00:00.000Z",
    latestTurn: null,
    latestUserMessageAt: null,
    hasPendingApprovals: false,
    hasPendingUserInput: false,
    hasActionableProposedPlan: false,
    hasLiveTailWork: false,
    ...overrides,
  };
}

describe("SidebarThreadRowContent", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.style.removeProperty("--app-font-size-base");
    document.documentElement.style.removeProperty("--app-font-size-ui");
    document.documentElement.style.removeProperty("--app-font-size-ui-2xs");
    harness.settings.localePreference = "en";
  });

  it("preserves the pinned title, pending state, terminal count, and suffix", async () => {
    document.documentElement.style.setProperty("--app-font-size-base", "14px");
    document.documentElement.style.setProperty("--app-font-size-ui", "14px");
    document.documentElement.style.setProperty("--app-font-size-ui-2xs", "11px");
    const thread = makeThread();
    const screen = await render(
      <SidebarThreadRowContent
        thread={thread}
        terminalEntryPoint={false}
        terminalStatus={null}
        terminalCount={2}
        isActive
        variant="pinned"
        pendingStatusColorClass="text-amber-600"
        suffix={<span>Project Alpha</span>}
      />,
    );

    const title = screen.getByTestId(`thread-title-${thread.id}`);
    const pending = screen.getByLabelText("Pending approval");
    await expect.element(title).toHaveTextContent("Shared thread row");
    await expect.element(pending).toHaveTextContent("Pending");
    await expect.element(screen.getByLabelText("2 terminals open")).toBeVisible();
    await expect.element(screen.getByText("Project Alpha")).toBeVisible();
    expect(getComputedStyle(document.body).fontSize).toBe("14px");
    expect(getComputedStyle(title.element()).fontSize).toBe("14px");
    expect(getComputedStyle(title.element()).fontWeight).toBe("500");
    expect(getComputedStyle(pending.element()).fontSize).toBe("11px");
  });

  it("keeps standard subagent nickname and role presentation", async () => {
    const screen = await render(
      <SidebarThreadRowContent
        thread={makeThread({
          id: ThreadId.makeUnsafe("thread-subagent-row"),
          parentThreadId: ThreadId.makeUnsafe("thread-parent-row"),
          subagentNickname: "Scout",
          subagentRole: "reviewer",
        })}
        terminalEntryPoint={false}
        terminalStatus={null}
        terminalCount={0}
        isActive={false}
        variant="standard"
        subagentIndentPx={10}
      />,
    );

    await expect.element(screen.getByText("Scout")).toBeVisible();
    await expect.element(screen.getByText("(reviewer)")).toBeVisible();
  });

  it("renders task status and terminal metadata in Chinese", async () => {
    harness.settings.localePreference = "zh-CN";
    const screen = await render(
      <I18nProvider>
        <SidebarThreadRowContent
          thread={makeThread()}
          terminalEntryPoint={false}
          terminalStatus={null}
          terminalCount={2}
          isActive
          variant="pinned"
          pendingStatusColorClass="text-amber-600"
        />
      </I18nProvider>,
    );

    await expect.element(screen.getByLabelText("等待审批")).toHaveTextContent("待审批");
    await expect.element(screen.getByLabelText("已打开 2 个终端")).toBeVisible();
  });

  it("localizes a generic Terminal title without rewriting a meaningful title", async () => {
    harness.settings.localePreference = "zh-CN";
    const generic = await render(
      <I18nProvider>
        <SidebarThreadRowContent
          thread={makeThread({ title: "New terminal" })}
          terminalEntryPoint
          terminalStatus={null}
          terminalCount={1}
          isActive
          variant="pinned"
        />
      </I18nProvider>,
    );
    await expect
      .element(generic.getByTestId("thread-title-thread-row-content"))
      .toHaveTextContent("新建终端");

    document.body.innerHTML = "";
    const named = await render(
      <I18nProvider>
        <SidebarThreadRowContent
          thread={makeThread({ title: "Release smoke" })}
          terminalEntryPoint
          terminalStatus={null}
          terminalCount={1}
          isActive
          variant="pinned"
        />
      </I18nProvider>,
    );
    await expect
      .element(named.getByTestId("thread-title-thread-row-content"))
      .toHaveTextContent("Release smoke");
  });
});
