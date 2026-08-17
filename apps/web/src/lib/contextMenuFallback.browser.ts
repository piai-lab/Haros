// FILE: contextMenuFallback.browser.ts
// Purpose: Verifies the browser context-menu fallback preserves invocation focus.
// Layer: Web UI browser tests

import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { showContextMenuFallback } from "../contextMenuFallback";

function createTarget(tagName: "button" | "a", label: string): HTMLElement {
  const target = document.createElement(tagName);
  target.textContent = label;
  if (target instanceof HTMLAnchorElement) target.href = "#";
  document.body.appendChild(target);
  return target;
}

function openCopyMenu(target: HTMLElement): Promise<"copy-path" | null> {
  let result: Promise<"copy-path" | null> | undefined;
  target.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
      result = showContextMenuFallback([{ id: "copy-path", label: "Copy path" }], {
        x: event.clientX,
        y: event.clientY,
      });
    },
    { once: true },
  );
  target.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 0,
      clientY: 0,
    }),
  );
  if (!result) throw new Error("Context menu did not open");
  return result;
}

afterEach(() => {
  document.body.innerHTML = "";
});

it("returns focus to a file row after Shift+F10/Menu dismissal", async () => {
  const row = createTarget("button", "src/notes.md");
  const focus = vi.spyOn(row, "focus");
  row.focus();
  focus.mockClear();

  const result = openCopyMenu(row);
  await userEvent.keyboard("{ArrowDown}");
  expect(document.activeElement?.textContent).toBe("Copy path");
  await userEvent.keyboard("{Escape}");

  await expect(result).resolves.toBeNull();
  expect(document.activeElement).toBe(row);
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});

it("returns focus to a file chip after choosing Copy with Enter", async () => {
  const chip = createTarget("a", "notes.md");
  const external = createTarget("button", "Open editor");
  chip.focus();

  const result = openCopyMenu(chip);
  const completion = result.then((selected) => {
    expect(selected).toBe("copy-path");
    expect(document.activeElement).toBe(chip);
    external.focus();
  });
  await userEvent.keyboard("{ArrowDown}{Enter}");

  await completion;
  await Promise.resolve();
  expect(document.activeElement).toBe(external);
});

it("does not overwrite focus that moved to another connected element", async () => {
  const row = createTarget("button", "src/notes.md");
  const external = createTarget("button", "Open editor");
  row.focus();

  const result = openCopyMenu(row);
  external.focus();
  await userEvent.keyboard("{Escape}");

  await expect(result).resolves.toBeNull();
  expect(document.activeElement).toBe(external);
});

it("does not throw when the invoking target disconnects before dismissal", async () => {
  const chip = createTarget("a", "notes.md");
  chip.focus();

  const result = openCopyMenu(chip);
  await userEvent.keyboard("{ArrowDown}");
  chip.remove();
  await userEvent.keyboard("{Escape}");

  await expect(result).resolves.toBeNull();
  expect(chip.isConnected).toBe(false);
});
