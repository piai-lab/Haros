import "../../index.css";

import { page, userEvent } from "vitest/browser";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Sidebar, SidebarProvider, SidebarRail, SidebarTrigger } from "./sidebar";

function ControlledSidebar({ transient }: { readonly transient: boolean }) {
  const [open, setOpen] = useState(true);

  return (
    <SidebarProvider
      open={open}
      toggleShortcutLabel={/Mac/i.test(navigator.platform) ? "⌘B" : "Ctrl+B"}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        return transient ? false : undefined;
      }}
    >
      <SidebarTrigger />
    </SidebarProvider>
  );
}

function CompactDesktopSidebar() {
  const [open, setOpen] = useState(true);

  return (
    <SidebarProvider desktopPresentation open={open} onOpenChange={setOpen}>
      <Sidebar>
        <button type="button">Navigation</button>
      </Sidebar>
      <SidebarTrigger />
    </SidebarProvider>
  );
}

function DragDismissSidebar() {
  return (
    <SidebarProvider desktopPresentation defaultOpen>
      <Sidebar
        resizable={{
          dragDismissThreshold: 48,
          minWidth: 208,
          storageKey: "test:sidebar-width",
        }}
      >
        <SidebarRail />
        <button type="button">Navigation</button>
      </Sidebar>
      <main className="min-w-0 flex-1">Content</main>
    </SidebarProvider>
  );
}

describe("SidebarProvider persistence boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("does not persist a controlled transient presentation change", async () => {
    await page.viewport(1280, 720);
    const cookieSet = vi.spyOn(cookieStore, "set");
    const screen = await render(<ControlledSidebar transient />);

    await userEvent.click(screen.container.querySelector("[data-slot='sidebar-trigger']")!);

    expect(cookieSet).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it("keeps the existing cookie write for a normal manual change", async () => {
    await page.viewport(1280, 720);
    const cookieSet = vi.spyOn(cookieStore, "set");
    const screen = await render(<ControlledSidebar transient={false} />);

    await userEvent.click(screen.container.querySelector("[data-slot='sidebar-trigger']")!);

    await vi.waitFor(() => {
      expect(cookieSet).toHaveBeenCalledTimes(1);
      expect(cookieSet.mock.calls[0]?.[0]).toMatchObject({
        name: "sidebar_state",
        path: "/",
        value: "false",
      });
    });
    await screen.unmount();
  });

  it("explains the Sidebar toggle with the platform shortcut on hover", async () => {
    await page.viewport(1280, 720);
    const screen = await render(<ControlledSidebar transient={false} />);
    const trigger = screen.container.querySelector<HTMLElement>("[data-slot='sidebar-trigger']");
    expect(trigger).toBeTruthy();

    await userEvent.hover(trigger!);
    await vi.waitFor(() => {
      const popup = document.querySelector<HTMLElement>("[data-slot='tooltip-popup']");
      expect(popup?.textContent).toContain("Toggle sidebar");
      expect(popup?.textContent).toMatch(/⌘B|Ctrl\+B/);
      expect(getComputedStyle(popup!).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    });

    expect(document.activeElement).not.toBe(trigger);
    await screen.unmount();
  });

  it("keeps one desktop Sidebar surface mounted through the compact native-window range", async () => {
    await page.viewport(480, 620);
    const screen = await render(<CompactDesktopSidebar />);

    const sidebar = screen.container.querySelector<HTMLElement>("[data-slot='sidebar-container']");
    expect(sidebar).toBeTruthy();
    expect(getComputedStyle(sidebar!).display).toBe("flex");
    expect(screen.container.querySelector("[data-mobile='true']")).toBeNull();

    await userEvent.click(screen.container.querySelector("[data-slot='sidebar-trigger']")!);
    await vi.waitFor(() => {
      expect(screen.container.querySelector("[data-slot='sidebar-container']")).toBe(sidebar);
      expect(sidebar?.getAttribute("aria-hidden")).toBe("true");
      expect(sidebar?.hasAttribute("inert")).toBe(true);
    });

    await userEvent.click(screen.container.querySelector("[data-slot='sidebar-trigger']")!);
    await vi.waitFor(() => {
      expect(sidebar?.hasAttribute("aria-hidden")).toBe(false);
      expect(sidebar?.hasAttribute("inert")).toBe(false);
    });

    await page.viewport(840, 620);
    await vi.waitFor(() => {
      expect(screen.container.querySelector("[data-slot='sidebar-container']")).toBe(sidebar);
    });
    await screen.unmount();
  });

  it("keeps retreat reversible, restores on cancel, and suppresses hover chrome", async () => {
    localStorage.removeItem("test:sidebar-width");
    await page.viewport(1280, 720);
    const screen = await render(<DragDismissSidebar />);
    const rail = screen.container.querySelector<HTMLButtonElement>("[data-slot='sidebar-rail']")!;
    const root = screen.container.querySelector<HTMLElement>("[data-slot='sidebar']")!;
    const container = screen.container.querySelector<HTMLElement>(
      "[data-slot='sidebar-container']",
    )!;
    const startWidth = container.getBoundingClientRect().width;
    const startX = rail.getBoundingClientRect().x + rail.getBoundingClientRect().width / 2;
    vi.spyOn(rail, "setPointerCapture").mockImplementation(() => undefined);
    vi.spyOn(rail, "hasPointerCapture").mockReturnValue(true);
    vi.spyOn(rail, "releasePointerCapture").mockImplementation(() => undefined);
    const tooltip = document.createElement("div");
    tooltip.dataset.slot = "tooltip-positioner";
    document.body.append(tooltip);
    const pointer = (type: "pointerdown" | "pointermove" | "pointercancel", clientX: number) =>
      rail.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: type === "pointercancel" ? 0 : 1,
          clientX,
          pointerId: 71,
          pointerType: "mouse",
        }),
      );

    pointer("pointerdown", startX);
    pointer("pointermove", 24);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(root.getAttribute("data-resize-retreating")).toBe("true");
    expect(Math.abs(container.getBoundingClientRect().right - 24)).toBeLessThanOrEqual(1);
    expect(document.body.getAttribute("data-sidebar-resizing")).toBe("true");
    expect(getComputedStyle(tooltip).visibility).toBe("hidden");

    pointer("pointermove", startX + 80);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(root.hasAttribute("data-resize-retreating")).toBe(false);
    expect(container.getBoundingClientRect().width).toBeCloseTo(startWidth + 80, 0);

    pointer("pointercancel", startX + 80);
    await vi.waitFor(() =>
      expect(container.getBoundingClientRect().width).toBeCloseTo(startWidth, 0),
    );
    expect(root.getAttribute("data-state")).toBe("expanded");
    expect(localStorage.getItem("test:sidebar-width")).toBeNull();
    expect(document.body.hasAttribute("data-sidebar-resizing")).toBe(false);

    tooltip.remove();
    await screen.unmount();
  });
});
