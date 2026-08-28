// FILE: ThinkingStatus.browser.tsx
// Purpose: Browser proof for the approved three-element live-status choreography.
// Layer: Web browser test

import "../../index.css";

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { paintComposingOrbFrame } from "./composingOrbPainter";
import { THINKING_HINT_ROTATION_MS, ThinkingStatus } from "./ThinkingStatus";

function fnv1a32(bytes: Uint8ClampedArray): number {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function setReducedMotion(reduced: boolean): void {
  const originalMatchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) =>
    query === "(prefers-reduced-motion: reduce)"
      ? ({
          matches: reduced,
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        } as unknown as MediaQueryList)
      : originalMatchMedia(query),
  );
}

describe("ThinkingStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the fixed three elements and replaces the hint every five seconds", async () => {
    setReducedMotion(false);
    vi.spyOn(Math, "random").mockReturnValue(0);

    const mounted = await render(
      <ThinkingStatus
        accessibleLabel="Working on your response"
        fontSizePx={13}
        hints={["First...", "Second...", "Third..."]}
        theme="dark"
      />,
    );
    const status = mounted.getByTestId("thinking-status");
    expect(status.element().getAttribute("role")).toBe("status");
    expect(status.element().getAttribute("aria-label")).toBe("Working on your response");
    const canvas = status.element().querySelector('canvas[data-composing-orb="official-20px"]');
    expect(canvas).not.toBeNull();
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect((canvas as HTMLCanvasElement).width).toBeLessThanOrEqual(40);
    expect((canvas as HTMLCanvasElement).height).toBeLessThanOrEqual(40);
    expect(status.element().querySelectorAll(".harnessos-thinking-status__dots i")).toHaveLength(3);
    const hint = status.element().querySelector(".harnessos-thinking-status__hint");
    const dots = status.element().querySelector(".harnessos-thinking-status__dots");
    expect(hint?.textContent).toBe("First");
    expect(getComputedStyle(hint as Element).animation).toContain("0.4s");
    expect(getComputedStyle(hint as Element).animation).toContain("1.6s");
    expect(getComputedStyle(dots as Element).transform).toBe("matrix(1, 0, 0, 1, 0, -1)");

    await expect
      .poll(() => status.element().querySelector(".harnessos-thinking-status__hint")?.textContent, {
        timeout: THINKING_HINT_ROTATION_MS + 2_000,
      })
      .toBe("Second");
    mounted.unmount();
  });

  it("freezes the hint under reduced motion", async () => {
    setReducedMotion(true);
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.useFakeTimers();

    const mounted = await render(
      <ThinkingStatus
        accessibleLabel="Working on your response"
        fontSizePx={13}
        hints={["First...", "Second..."]}
        theme="light"
      />,
    );
    const status = mounted.getByTestId("thinking-status");
    await vi.advanceTimersByTimeAsync(THINKING_HINT_ROTATION_MS * 2);
    expect(status.element().querySelector(".harnessos-thinking-status__hint")?.textContent).toBe(
      "First",
    );
    mounted.unmount();
  });

  it("matches the fixed dark and light pixel baselines", () => {
    const hashes: number[] = [];
    for (const dark of [true, false]) {
      const canvas = document.createElement("canvas");
      canvas.width = 40;
      canvas.height = 40;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas 2D is unavailable");
      context.setTransform(2, 0, 0, 2, 0, 0);
      paintComposingOrbFrame(context, 0.6, dark);
      hashes.push(fnv1a32(context.getImageData(0, 0, 40, 40).data));
    }

    expect(hashes).toEqual([1_665_855_848, 98_778_417]);
  });
});
