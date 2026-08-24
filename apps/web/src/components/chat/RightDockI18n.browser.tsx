// FILE: RightDockI18n.browser.tsx
// Purpose: Prove right-dock pane labels and close ARIA project through both product locales.
// Layer: Vitest browser tests

import "../../index.css";

import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import type { RightDockThreadState } from "~/rightDockStore.logic";

const harness = vi.hoisted((): { settings: { localePreference: "en" | "zh-CN" } } => ({
  settings: { localePreference: "en" },
}));

vi.mock("~/localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

import { I18nProvider } from "~/i18n";
import { RightDock } from "./RightDock";

const STATE: RightDockThreadState = {
  open: true,
  activePaneId: "sidechat-pane",
  panes: [
    {
      id: "sidechat-pane",
      kind: "sidechat",
      threadId: null,
      diffTurnId: null,
      diffFilePath: null,
      filePath: null,
      pullRequestProjectId: null,
      pullRequestRepository: null,
      pullRequestNumber: null,
      pullRequestInitialTab: null,
    },
  ],
};

function RightDockLocaleHarness() {
  return (
    <I18nProvider>
      <div className="relative h-[500px] w-[900px]">
        <RightDock
          state={STATE}
          minWidth={416}
          defaultWidth="416px"
          shouldAcceptWidth={() => true}
          addMenuKinds={[]}
          onSelectPane={() => {}}
          onClosePane={() => {}}
          onCollapse={() => {}}
          onOpenChange={() => {}}
          onAddPane={() => {}}
          renderPane={() => <div>Pane content</div>}
        />
      </div>
    </I18nProvider>
  );
}

describe("RightDock locale projection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the pane label and close ARIA in English", async () => {
    harness.settings.localePreference = "en";
    await page.viewport(1280, 720);
    await render(<RightDockLocaleHarness />);

    expect(page.getByText("Side chats", { exact: true })).toBeInTheDocument();
    expect(page.getByRole("button", { name: "Close Side chats" })).toBeInTheDocument();
  });

  it("renders the pane label and close ARIA in Simplified Chinese", async () => {
    harness.settings.localePreference = "zh-CN";
    await page.viewport(1280, 720);
    await render(<RightDockLocaleHarness />);

    expect(page.getByText("侧边对话", { exact: true })).toBeInTheDocument();
    expect(page.getByRole("button", { name: "关闭侧边对话" })).toBeInTheDocument();
  });
});
