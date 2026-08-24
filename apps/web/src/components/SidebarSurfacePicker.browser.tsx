import "../index.css";

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "en" },
}));

vi.mock("../localPreferences", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../localPreferences")>();
  return {
    ...actual,
    useLocalPreferences: () => ({ preferences: harness.settings }),
  };
});

import { I18nProvider } from "../i18n";
import type { SidebarView } from "./Sidebar.logic";
import { SidebarSurfacePicker } from "./Sidebar";
import { SIDEBAR_RESIZE_DEFAULT_MIN_WIDTH } from "./ui/sidebar";

function SurfaceHarness({
  locale,
  showStudio = true,
  onSelectView,
  onPrewarmView,
}: {
  locale: "en" | "zh-CN";
  showStudio?: boolean;
  onSelectView?: (view: SidebarView) => void;
  onPrewarmView?: (view: SidebarView) => void;
}) {
  harness.settings.localePreference = locale;
  const [activeView, setActiveView] = useState<SidebarView>("agent");
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
          views={["agent", "chat", ...(showStudio ? (["studio"] as const) : [])]}
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

function WordmarkWidthHarness({ width }: { width: number }) {
  return (
    <div style={{ containerType: "inline-size", width }}>
      <span className="sidebar-product-wordmark">OmniMind</span>
    </div>
  );
}

describe("SidebarSurfacePicker", () => {
  it.each(["en", "zh-CN"] as const)(
    "keeps the current surface trigger within the 13rem sidebar floor in %s",
    async (locale) => {
      expect(SIDEBAR_RESIZE_DEFAULT_MIN_WIDTH).toBe(13 * 16);
      const screen = await render(<SurfaceHarness locale={locale} />);
      const trigger = screen.getByRole("button", {
        name: locale === "en" ? "Switch surface" : "切换工作面",
      });

      await expect.element(trigger).toBeVisible();
      expect(trigger.element().textContent).toBe("Agent");
      const disclosureChevron = trigger
        .element()
        .querySelector<SVGElement>('svg[aria-hidden="true"]');
      expect(disclosureChevron).not.toBeNull();
      expect(disclosureChevron?.getBoundingClientRect().width).toBeGreaterThan(0);
      expect(disclosureChevron?.getBoundingClientRect().height).toBeGreaterThan(0);
      expect(window.getComputedStyle(disclosureChevron!).visibility).not.toBe("hidden");
      expect(Number(window.getComputedStyle(disclosureChevron!).opacity)).toBeGreaterThan(0);

      const row = screen.getByTestId("minimum-sidebar-row").element();
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
      expect(trigger.element().scrollWidth).toBeLessThanOrEqual(trigger.element().clientWidth);
    },
  );

  it("never clips the product wordmark at preserved narrow widths", async () => {
    const narrow = await render(<WordmarkWidthHarness width={258.0078125} />);
    await expect.element(narrow.getByText("OmniMind")).not.toBeVisible();

    await narrow.unmount();
    const authored = await render(<WordmarkWidthHarness width={368} />);
    await expect.element(authored.getByText("OmniMind")).toBeVisible();
  });

  it("exposes three described radio choices and routes Chat and Studio exactly once", async () => {
    const onSelectView = vi.fn();
    const onPrewarmView = vi.fn();
    const screen = await render(
      <SurfaceHarness locale="en" onSelectView={onSelectView} onPrewarmView={onPrewarmView} />,
    );
    const trigger = screen.getByRole("button", { name: "Switch surface" });
    (trigger.element() as HTMLButtonElement).click();
    const agent = screen.getByRole("menuitemradio", {
      name: /Agent Work inside a project with execution tools/,
    });
    const chat = screen.getByRole("menuitemradio", {
      name: /Chat Talk, analyze, and use explicit references/,
    });
    const studio = screen.getByRole("menuitemradio", {
      name: /Studio Create in OmniMind's managed workspace/,
    });
    await expect.element(agent).toHaveAttribute("aria-checked", "true");
    await expect.element(chat).toBeVisible();
    await expect.element(studio).toBeVisible();

    chat.element().dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    (chat.element() as HTMLElement).click();
    await vi.waitFor(() => {
      expect(onSelectView).toHaveBeenCalledTimes(1);
      expect(onSelectView).toHaveBeenCalledWith("chat");
      expect(trigger.element().textContent).toBe("Chat");
    });

    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
    (trigger.element() as HTMLButtonElement).click();
    const reopenedStudio = screen.getByRole("menuitemradio", {
      name: /Studio Create in OmniMind's managed workspace/,
    });
    await expect.element(reopenedStudio).toBeVisible();
    reopenedStudio.element().focus();
    (reopenedStudio.element() as HTMLElement).click();
    await vi.waitFor(() => {
      expect(onSelectView).toHaveBeenCalledTimes(2);
      expect(onSelectView).toHaveBeenLastCalledWith("studio");
      expect(trigger.element().textContent).toBe("Studio");
    });
    expect(onPrewarmView).toHaveBeenCalledWith("chat");
    expect(onPrewarmView).toHaveBeenCalledWith("studio");
  });

  it("supports keyboard selection and keeps Studio out when its setting is hidden", async () => {
    const onSelectView = vi.fn();
    const screen = await render(
      <SurfaceHarness locale="zh-CN" showStudio={false} onSelectView={onSelectView} />,
    );
    const row = screen.getByTestId("minimum-sidebar-row").element();
    const trigger = screen.getByRole("button", { name: "切换工作面" });

    trigger.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("menuitemradio", { name: /Agent/ })).toBeVisible();
    await expect.element(screen.getByRole("menuitemradio", { name: /Chat/ })).toBeVisible();
    expect(screen.getByRole("menuitemradio", { name: /Studio/ }).query()).toBeNull();

    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onSelectView).toHaveBeenCalledTimes(1);
    expect(onSelectView).toHaveBeenCalledWith("chat");
    expect(trigger.element().textContent).toBe("Chat");
    expect(document.activeElement).toBe(trigger.element());
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
  });
});
