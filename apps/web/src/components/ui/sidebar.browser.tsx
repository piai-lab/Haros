import "../../index.css";

import { page, userEvent } from "vitest/browser";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { SidebarProvider, SidebarTrigger } from "./sidebar";

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
});
