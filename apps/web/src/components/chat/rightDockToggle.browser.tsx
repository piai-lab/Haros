// FILE: rightDockToggle.browser.tsx
// Purpose: Browser proof for the SingleChatSurface right-dock toggle owner.

import { ThreadId } from "@omnimind/contracts";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { selectRightDockState, useRightDockStore } from "../../rightDockStore";
import { toggleRightDockOpen } from "./SingleChatSurface";

const THREAD_ID = ThreadId.makeUnsafe("right-dock-toggle-browser");

function Harness() {
  const open = useRightDockStore((store) => selectRightDockState(THREAD_ID)(store).open);
  return (
    <div>
      <output data-testid="dock-state">{open ? "open" : "closed"}</output>
      <button type="button" onClick={() => toggleRightDockOpen(THREAD_ID)}>
        Toggle dock
      </button>
    </div>
  );
}

describe("SingleChatSurface right dock toggle", () => {
  afterEach(async () => {
    useRightDockStore.getState().clearThreadDockState(THREAD_ID);
    await cleanup();
  });

  it("reads current store state on every click so open then close cannot use a stale callback", async () => {
    await render(<Harness />);
    const toggle = page.getByRole("button", { name: "Toggle dock" });
    expect(page.getByTestId("dock-state")).toHaveTextContent("closed");
    await toggle.click();
    await expect.element(page.getByTestId("dock-state")).toHaveTextContent("open");
    await toggle.click();
    await expect.element(page.getByTestId("dock-state")).toHaveTextContent("closed");
  });
});
