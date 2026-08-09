import "../index.css";

import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "en" },
}));

vi.mock("../appSettings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../appSettings")>();
  return {
    ...actual,
    useAppSettings: () => ({ settings: harness.settings }),
  };
});

import { I18nProvider } from "../i18n";
import type { SidebarView } from "./Sidebar.logic";
import { SidebarSurfacePicker } from "./Sidebar";
import { SIDEBAR_RESIZE_DEFAULT_MIN_WIDTH } from "./ui/sidebar";

function SurfaceHarness({
  locale,
  showChat = true,
  onSelectView,
  onPrewarmView,
}: {
  locale: "en" | "zh-CN";
  showChat?: boolean;
  onSelectView?: (view: SidebarView) => void;
  onPrewarmView?: (view: SidebarView) => void;
}) {
  harness.settings.localePreference = locale;
  const [activeView, setActiveView] = useState<SidebarView>("threads");
  return (
    <I18nProvider>
      <div
        data-testid="minimum-sidebar-row"
        style={{
          alignItems: "center",
          display: "flex",
          gap: "0.25rem",
          padding: "0 0.625rem 0 0.375rem",
          width: "13rem",
        }}
      >
        <SidebarSurfacePicker
          views={showChat ? ["threads", "studio"] : ["threads"]}
          activeView={activeView}
          onSelectView={(view) => {
            onSelectView?.(view);
            setActiveView(view);
          }}
          {...(onPrewarmView ? { onPrewarmView } : {})}
        />
        <button type="button" aria-label="Search fixture" style={{ width: "1.75rem" }} />
        <button type="button" aria-label="Activity fixture" style={{ width: "1.75rem" }} />
      </div>
    </I18nProvider>
  );
}

describe("SidebarSurfacePicker", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each(["en", "zh-CN"] as const)(
    "keeps Agent left and Chat right at the 13rem sidebar floor in %s",
    async (locale) => {
      expect(SIDEBAR_RESIZE_DEFAULT_MIN_WIDTH).toBe(13 * 16);
      const screen = await render(<SurfaceHarness locale={locale} />);
      const navigation = screen.getByRole("navigation", {
        name: locale === "en" ? "Switch between Agent and Chat" : "切换 Agent 与 Chat",
      });
      const buttons = navigation.getByRole("button").elements();

      await expect.element(screen.getByRole("button", { name: "Agent" })).toBeVisible();
      await expect.element(screen.getByRole("button", { name: "Chat" })).toBeVisible();
      expect(buttons.map((button) => button.textContent)).toEqual(["Agent", "Chat"]);

      const row = screen.getByTestId("minimum-sidebar-row").element();
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
      expect(navigation.element().scrollWidth).toBeLessThanOrEqual(
        navigation.element().clientWidth,
      );
      expect(navigation.element().querySelector('[role="menu"], [role="tab"]')).toBeNull();
    },
  );

  it("switches once through route-owned buttons and exposes the current page", async () => {
    const onSelectView = vi.fn();
    const onPrewarmView = vi.fn();
    const screen = await render(
      <SurfaceHarness locale="en" onSelectView={onSelectView} onPrewarmView={onPrewarmView} />,
    );
    const agent = screen.getByRole("button", { name: "Agent" });
    const chat = screen.getByRole("button", { name: "Chat" });

    await expect.element(agent).toHaveAttribute("aria-current", "page");
    await chat.click();
    expect(onSelectView).toHaveBeenCalledTimes(1);
    expect(onSelectView).toHaveBeenCalledWith("studio");
    await expect.element(chat).toHaveAttribute("aria-current", "page");
    expect(agent.element().hasAttribute("aria-current")).toBe(false);
    expect(onPrewarmView).toHaveBeenCalledWith("studio");

    agent.element().focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelectView).toHaveBeenCalledTimes(2);
    expect(onSelectView).toHaveBeenLastCalledWith("threads");
    await expect.element(agent).toHaveAttribute("aria-current", "page");
  });

  it("renders a non-interactive Agent title when Chat is explicitly hidden", async () => {
    const screen = await render(<SurfaceHarness locale="zh-CN" showChat={false} />);
    const row = screen.getByTestId("minimum-sidebar-row").element();

    await expect.element(screen.getByText("Agent", { exact: true })).toBeVisible();
    expect(row.querySelector('[data-slot="sidebar-surface-navigation"]')).toBeNull();
    expect(row.querySelector('[data-slot="sidebar-surface-title"]')).not.toBeNull();
    expect(row.querySelector('button[aria-current], [role="menu"], [role="tab"]')).toBeNull();
  });
});
