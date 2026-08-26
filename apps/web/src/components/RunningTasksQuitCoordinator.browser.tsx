// FILE: RunningTasksQuitCoordinator.browser.tsx
// Purpose: Prove the normal-quit confirmation is bounded, keyboard reachable, and localized.
// Layer: Vitest browser regression

import "../index.css";

import { page, userEvent } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { I18nProvider } from "~/i18n";

import { RunningTasksQuitDialog } from "./RunningTasksQuitCoordinator";

const harness = vi.hoisted(() => ({
  localePreference: "en" as "en" | "zh-CN",
  resumeChatsAfterQuit: true,
  updatePreferences: vi.fn(),
}));

vi.mock("~/localPreferences", () => ({
  useLocalPreferences: () => ({
    preferences: {
      localePreference: harness.localePreference,
      resumeChatsAfterQuit: harness.resumeChatsAfterQuit,
    },
    updatePreferences: harness.updatePreferences,
  }),
}));

const longTasks = Array.from({ length: 18 }, (_, index) => ({
  id: `thread-${index + 1}`,
  title: `A very long task title that must remain inside the confirmation surface ${index + 1}`,
}));

afterEach(async () => {
  document.body.innerHTML = "";
  harness.localePreference = "en";
  harness.resumeChatsAfterQuit = true;
  harness.updatePreferences.mockReset();
  await page.viewport(1280, 720);
});

describe("RunningTasksQuitDialog", () => {
  it.each(["en", "zh-CN"] as const)(
    "stays bounded and focus-safe at 480px in %s",
    async (locale) => {
      await page.viewport(480, 620);
      harness.localePreference = locale;
      const onCancel = vi.fn();
      const onQuit = vi.fn();
      const mounted = await render(
        <I18nProvider>
          <RunningTasksQuitDialog tasks={longTasks} onCancel={onCancel} onQuit={onQuit} />
        </I18nProvider>,
      );

      try {
        const dialog = page.getByRole("alertdialog");
        await expect.element(dialog).toBeVisible();
        const dialogElement = dialog.element() as HTMLElement;
        const rect = dialogElement.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(-1);
        expect(rect.right).toBeLessThanOrEqual(window.innerWidth + 1);
        expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight + 1);
        expect(document.body.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);

        const list = dialogElement.querySelector("ul");
        expect(list).not.toBeNull();
        expect(list!.scrollHeight).toBeGreaterThan(list!.clientHeight);

        const quitButton = page.getByRole("button", { name: locale === "zh-CN" ? /退出/ : /Quit/ });
        await vi.waitFor(() => expect(document.activeElement).toBe(quitButton.element()));
        await userEvent.keyboard("{Enter}");
        expect(onQuit).toHaveBeenCalledWith(true, true);
      } finally {
        await mounted.unmount();
      }
    },
  );

  it("cancels with Escape and persists checkbox changes through LocalPreferences", async () => {
    const onCancel = vi.fn();
    const mounted = await render(
      <I18nProvider>
        <RunningTasksQuitDialog
          tasks={longTasks.slice(0, 2)}
          onCancel={onCancel}
          onQuit={vi.fn()}
        />
      </I18nProvider>,
    );
    try {
      await userEvent.click(page.getByRole("checkbox"));
      expect(harness.updatePreferences).toHaveBeenCalledWith({ resumeChatsAfterQuit: false });
      await userEvent.keyboard("{Escape}");
      await vi.waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    } finally {
      await mounted.unmount();
    }
  });
});
