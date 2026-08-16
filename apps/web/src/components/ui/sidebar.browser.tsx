import "../../index.css";

import { page, userEvent } from "vitest/browser";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Sidebar, SidebarProvider, SidebarTrigger } from "./sidebar";

function ControlledSidebar({ transient }: { readonly transient: boolean }) {
  const [open, setOpen] = useState(true);

  return (
    <SidebarProvider
      open={open}
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
});
