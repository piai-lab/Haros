// FILE: HarnessOSLogoButton.browser.tsx
// Purpose: Verify the canonical Soft Orbit interaction in a real Chromium renderer.
// Layer: Browser UI test

import "../index.css";

import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import type { SoftOrbitSnapshot } from "~/motion/softOrbit";
import { HarnessOSLogoButton } from "./HarnessOSLogoButton";

describe("HarnessOSLogoButton", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
  });

  it("plays one complete turn, queues three rapid clicks, and preserves the click action", async () => {
    const snapshots: SoftOrbitSnapshot[] = [];
    const onClick = vi.fn();
    const screen = await render(
      <HarnessOSLogoButton
        aria-label="Focus composer"
        reducedMotion={false}
        onClick={onClick}
        onMotionStateChange={(snapshot) => snapshots.push(snapshot)}
      />,
    );
    const button = screen.getByRole("button", { name: "Focus composer" });
    const mark = button.element().querySelector<HTMLElement>(".harnessos-logo-motion-target");
    if (!mark) throw new Error("Soft Orbit target is missing");

    expect(button.element().getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    expect(button.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);

    await button.click();
    await new Promise((resolve) => window.setTimeout(resolve, 100));
    expect(getComputedStyle(mark).transform).not.toBe("none");
    const orbitTiming = mark.getAnimations()[0]?.effect?.getTiming();
    expect(orbitTiming?.duration).toBe(650);
    expect(orbitTiming?.easing).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
    await vi.waitFor(() => expect(snapshots.at(-1)?.completedTurns).toBe(1), { timeout: 1_000 });
    expect(onClick).toHaveBeenCalledTimes(1);

    const buttonElement = button.element();
    if (!(buttonElement instanceof HTMLButtonElement))
      throw new Error("Logo trigger is not a button");
    buttonElement.click();
    buttonElement.click();
    buttonElement.click();
    await vi.waitFor(() => expect(snapshots.at(-1)?.completedTurns).toBe(4), { timeout: 2_400 });
    expect(onClick).toHaveBeenCalledTimes(4);
    expect(getComputedStyle(mark).transform).toBe("none");
  });

  it("cancels an exited or cancelled press and accepts Enter and Space without delaying the action", async () => {
    const onClick = vi.fn();
    const screen = await render(
      <HarnessOSLogoButton aria-label="Focus composer" reducedMotion={false} onClick={onClick} />,
    );
    const button = screen.getByRole("button", { name: "Focus composer" });
    const mark = button.element().querySelector<HTMLElement>(".harnessos-logo-motion-target");
    if (!mark) throw new Error("Soft Orbit target is missing");

    button.element().dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    const pressTiming = mark.getAnimations()[0]?.effect?.getTiming();
    expect(pressTiming?.duration).toBe(80);
    expect(pressTiming?.easing).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
    await new Promise((resolve) => window.setTimeout(resolve, 90));
    expect(getComputedStyle(mark).transform).not.toBe("none");
    button
      .element()
      .dispatchEvent(
        new PointerEvent("pointerout", { bubbles: true, relatedTarget: document.body }),
      );
    expect(getComputedStyle(mark).transform).toBe("none");

    button.element().dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 90));
    button.element().dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    expect(getComputedStyle(mark).transform).toBe("none");

    button.element().focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("uses a 180ms pulse without rotation when reduced motion is enabled", async () => {
    const snapshots: SoftOrbitSnapshot[] = [];
    const screen = await render(
      <HarnessOSLogoButton
        aria-label="Focus composer"
        reducedMotion
        onMotionStateChange={(snapshot) => snapshots.push(snapshot)}
      />,
    );
    const button = screen.getByRole("button", { name: "Focus composer" });
    const mark = button.element().querySelector<HTMLElement>(".harnessos-logo-motion-target");
    if (!mark) throw new Error("Soft Orbit target is missing");

    await button.click();
    await new Promise((resolve) => window.setTimeout(resolve, 70));
    const pulseTiming = mark.getAnimations()[0]?.effect?.getTiming();
    expect(pulseTiming?.duration).toBe(180);
    expect(pulseTiming?.easing).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
    const matrix = new DOMMatrix(getComputedStyle(mark).transform);
    expect(Math.abs(matrix.b) + Math.abs(matrix.c)).toBeLessThan(0.0001);
    expect(snapshots.some((snapshot) => snapshot.state === "reduced")).toBe(true);
    await vi.waitFor(() => expect(snapshots.at(-1)?.completedTurns).toBe(1), { timeout: 500 });
  });

  it("keeps both official theme variants and a visible keyboard focus ring", async () => {
    const screen = await render(<HarnessOSLogoButton aria-label="Focus composer" size={64} />);
    const button = screen.getByRole("button", { name: "Focus composer" });
    const images = button.element().querySelectorAll("image");
    expect(images[0]?.getAttribute("href")).toBe("/brand/harnessos-mark.svg");
    expect(images[1]?.getAttribute("href")).toBe("/brand/harnessos-mark-dark.svg");

    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(button.element());
    expect(getComputedStyle(button.element()).outlineWidth).not.toBe("0px");
  });
});
