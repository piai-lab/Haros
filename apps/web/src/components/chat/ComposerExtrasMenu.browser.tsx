// FILE: ComposerExtrasMenu.browser.tsx
// Purpose: Verifies the composer `+` menu exposes generic file uploads and quick mode toggles.
// Layer: Browser UI test
// Depends on: vitest browser rendering helpers and the ComposerExtrasMenu component.

import "../../index.css";

import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ComposerExtrasMenu } from "./ComposerExtrasMenu";

async function mountMenu(props?: { interactionMode?: "default" | "plan" }) {
  const onAddAttachments = vi.fn();
  const onSetPlanMode = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const screen = await render(
    <ComposerExtrasMenu
      interactionMode={props?.interactionMode ?? "default"}
      onAddAttachments={onAddAttachments}
      onSetPlanMode={onSetPlanMode}
    />,
    { container: host },
  );

  const cleanup = async () => {
    await screen.unmount();
    host.remove();
  };

  return {
    [Symbol.asyncDispose]: cleanup,
    cleanup,
    onAddAttachments,
    onSetPlanMode,
  };
}

describe("ComposerExtrasMenu", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("uses an unrestricted file picker and forwards every selected file", async () => {
    await using menu = await mountMenu();

    const input = document.querySelector<HTMLInputElement>("[data-testid='composer-file-input']");
    expect(input).not.toBeNull();
    expect(input?.hasAttribute("accept")).toBe(false);

    const files = new DataTransfer();
    files.items.add(new File(["photo"], "photo.png", { type: "image/png" }));
    files.items.add(new File(["document"], "document.pdf", { type: "application/pdf" }));
    Object.defineProperty(input, "files", {
      configurable: true,
      value: files.files,
    });
    input?.dispatchEvent(new Event("change", { bubbles: true }));

    expect(menu.onAddAttachments).toHaveBeenCalledTimes(1);
    expect(menu.onAddAttachments.mock.calls[0]?.[0]?.map((file: File) => file.name)).toEqual([
      "photo.png",
      "document.pdf",
    ]);
  });

  it("shows the attachment action in the menu", async () => {
    await using _ = await mountMenu({ interactionMode: "plan" });

    await page.getByLabelText("Message box options").click();

    await vi.waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("Add files");
      expect(text).toContain("Plan mode");
      expect(text).not.toContain("Fast");
      expect(text).not.toContain("Plugins");
    });
  });

  it("wires plan mode without duplicating Engine-native Fast", async () => {
    await using menu = await mountMenu();

    await page.getByLabelText("Message box options").click();
    await page.getByText("Plan mode").click();

    expect(menu.onSetPlanMode).toHaveBeenCalledWith(true);
    expect(document.body.textContent).not.toContain("Fast");
  });
});
