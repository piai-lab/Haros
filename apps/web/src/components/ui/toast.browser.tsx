// FILE: toast.browser.tsx
// Purpose: Verifies visible-time dismissal and status motion in a real browser.
// Layer: Web browser test

import "../../index.css";

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { createFullscreenTestHost } from "../../test/browserHarness";
import { ToastProvider, toastManager } from "./toast";

const TEST_DISMISS_AFTER_VISIBLE_MS = 320;

function ToastTestSurface() {
  return (
    <ToastProvider position="bottom-right">
      <main>Toast test surface</main>
    </ToastProvider>
  );
}

async function mountToastSurface() {
  const host = createFullscreenTestHost();
  const rootRoute = createRootRoute({ component: ToastTestSurface });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: rootRoute,
  });
  const screen = await render(<RouterProvider router={router} />, { container: host });

  return {
    screen,
    cleanup: async () => {
      toastManager.close();
      await screen.unmount();
      host.remove();
    },
  };
}

async function waitForStatusToast(title: string): Promise<HTMLElement> {
  return vi.waitFor(
    () => {
      const titleElement = Array.from(
        document.querySelectorAll<HTMLElement>('[data-slot="toast-title"]'),
      ).find((element) => element.textContent === title);
      const root = titleElement?.closest<HTMLElement>('[data-status-motion=""]');
      expect(root).toBeTruthy();
      return root!;
    },
    { interval: 8, timeout: 2_000 },
  );
}

async function waitForEnding(root: HTMLElement): Promise<number> {
  return vi.waitFor(
    () => {
      expect(root.hasAttribute("data-ending-style")).toBe(true);
      return performance.now();
    },
    { interval: 4, timeout: 2_000 },
  );
}

describe("status toast visible timing", () => {
  afterEach(() => {
    toastManager.close();
    vi.restoreAllMocks();
  });

  it("does not let hover prolong success and pauses while the page is hidden", async () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    let visibilityState: DocumentVisibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibilityState);
    const { cleanup } = await mountToastSurface();

    try {
      const firstToastId = toastManager.add({
        type: "loading",
        title: "Updating 1/3 · Claude",
        timeout: 0,
        data: {
          closeLabel: "Hide update progress",
          statusMotion: true,
        },
      });
      const loadingRoot = await waitForStatusToast("Updating 1/3 · Claude");
      const viewport = loadingRoot.closest<HTMLElement>('[data-slot="toast-viewport"]');
      expect(viewport).toBeTruthy();
      viewport!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.waitFor(() => expect(viewport!.hasAttribute("data-expanded")).toBe(true));
      expect(
        loadingRoot.querySelector('[data-slot="toast-close"]')?.getAttribute("aria-label"),
      ).toBe("Hide update progress");
      expect(loadingRoot.className).toContain("motion-reduce:transition-none");
      expect(
        loadingRoot.querySelector('[data-slot="toast-icon"] svg')?.getAttribute("class"),
      ).toContain("motion-reduce:animate-none");
      expect(viewport?.getAttribute("aria-live")).toBe("polite");

      const successStartedAt = performance.now();
      toastManager.update(firstToastId, {
        type: "success",
        title: "Claude updated",
        description: "Applies to new sessions",
        timeout: 0,
        data: {
          compactContextual: true,
          dismissAfterVisibleMs: TEST_DISMISS_AFTER_VISIBLE_MS,
          statusMotion: true,
        },
      });
      const successRoot = await waitForStatusToast("Claude updated");
      expect(successRoot.textContent).toContain("Applies to new sessions");
      expect(
        successRoot.querySelector('[data-slot="toast-close"]')?.getAttribute("aria-label"),
      ).toBe("Dismiss notification");
      expect(
        getComputedStyle(successRoot.querySelector<HTMLElement>('[data-slot="toast-copy"]')!)
          .animationDuration,
      ).toBe("0.18s");
      const endingAt = await waitForEnding(successRoot);
      expect(endingAt - successStartedAt).toBeGreaterThanOrEqual(
        TEST_DISMISS_AFTER_VISIBLE_MS - 35,
      );
      // The exact product value is locked separately at 3 seconds. This scaled
      // browser probe keeps enough scheduler slack to remain stable in the full suite.
      expect(endingAt - successStartedAt).toBeLessThan(TEST_DISMISS_AFTER_VISIBLE_MS + 180);
      expect(getComputedStyle(successRoot).transitionDuration.split(",")[0]?.trim()).toBe("0.2s");
      expect(
        getComputedStyle(successRoot)
          .transitionProperty.split(",")
          .map((property) => property.trim()),
      ).toContain("width");

      await vi.waitFor(() => expect(successRoot.isConnected).toBe(false), {
        interval: 8,
        timeout: 1_000,
      });
      expect(performance.now() - endingAt).toBeGreaterThanOrEqual(150);
      expect(performance.now() - endingAt).toBeLessThan(500);

      visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
      const pausedToastId = toastManager.add({
        type: "success",
        title: "Codex updated",
        description: "Applies to new sessions",
        timeout: 0,
        data: {
          compactContextual: true,
          dismissAfterVisibleMs: TEST_DISMISS_AFTER_VISIBLE_MS,
          statusMotion: true,
        },
      });
      const pausedRoot = await waitForStatusToast("Codex updated");
      await new Promise((resolve) =>
        window.setTimeout(resolve, TEST_DISMISS_AFTER_VISIBLE_MS + 80),
      );
      expect(pausedRoot.hasAttribute("data-ending-style")).toBe(false);

      visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
      await waitForEnding(pausedRoot);
      toastManager.close(pausedToastId);
    } finally {
      await cleanup();
    }
  });

  it("spends the dismissal budget only when a stacked status toast can be seen", async () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    const { cleanup } = await mountToastSurface();

    try {
      const statusToastId = toastManager.add({
        type: "loading",
        title: "Updating 1/3 · Claude",
        timeout: 0,
        data: { statusMotion: true },
      });
      toastManager.add({ type: "info", title: "Newer notification 1", timeout: 0 });
      toastManager.update(statusToastId, {
        type: "success",
        title: "Claude updated behind stack",
        timeout: 0,
        data: {
          dismissAfterVisibleMs: TEST_DISMISS_AFTER_VISIBLE_MS,
          statusMotion: true,
        },
      });

      const statusRoot = await waitForStatusToast("Claude updated behind stack");
      await new Promise((resolve) =>
        window.setTimeout(resolve, TEST_DISMISS_AFTER_VISIBLE_MS + 80),
      );
      expect(statusRoot.hasAttribute("data-ending-style")).toBe(false);

      toastManager.add({ type: "info", title: "Newer notification 2", timeout: 0 });
      const newestToastId = toastManager.add({
        type: "info",
        title: "Newer notification 3",
        timeout: 0,
      });
      await vi.waitFor(() => expect(statusRoot.hasAttribute("data-limited")).toBe(true));

      const viewport = statusRoot.closest<HTMLElement>('[data-slot="toast-viewport"]');
      expect(viewport).toBeTruthy();
      viewport!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.waitFor(() => expect(statusRoot.hasAttribute("data-expanded")).toBe(true));
      await new Promise((resolve) =>
        window.setTimeout(resolve, TEST_DISMISS_AFTER_VISIBLE_MS + 80),
      );
      expect(statusRoot.hasAttribute("data-ending-style")).toBe(false);

      const visibleStartedAt = performance.now();
      toastManager.close(newestToastId);
      await vi.waitFor(() => expect(statusRoot.hasAttribute("data-limited")).toBe(false));
      const endingAt = await waitForEnding(statusRoot);
      expect(endingAt - visibleStartedAt).toBeGreaterThanOrEqual(
        TEST_DISMISS_AFTER_VISIBLE_MS - 35,
      );
    } finally {
      await cleanup();
    }
  });
});
