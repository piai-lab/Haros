import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { createStartupSplashDom } from "../startup/startupSplashDom";
import {
  dismissStartupSplashImmediately,
  initializeStartupSplash,
  isStartupSplashActive,
  reportFocusedComposerReadiness,
  reportStartupShellReadiness,
} from "../startup/startupSplash";
import "../styles/startup-splash.css";

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

describe("Desktop startup splash", () => {
  beforeEach(() => {
    dismissStartupSplashImmediately();
  });

  afterEach(async () => {
    dismissStartupSplashImmediately();
    await page.viewport(1280, 720);
  });

  it("retains the exact quiet 64-dot golden-angle presentation", () => {
    const splash = createStartupSplashDom();

    expect(splash.querySelectorAll(".startup-splash__dot")).toHaveLength(64);
    expect(splash.querySelector(".startup-splash__word")?.textContent).toBe("HAROS");
    expect(splash.querySelector(".startup-splash__visual")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(splash.querySelector(".startup-splash__status")).toBeNull();
    expect(splash.querySelector(".startup-splash__rings")).toBeNull();
    expect(splash.querySelector(".startup-splash__line")).toBeNull();
    expect(splash.querySelector(".startup-splash__wave")).toBeNull();
    splash.remove();
  });

  it.each([
    { height: 620, maximum: 208, minimum: 206, width: 480 },
    { height: 700, maximum: 226, minimum: 223, width: 800 },
    { height: 750, maximum: 244, minimum: 240, width: 980 },
    { height: 780, maximum: 262, minimum: 258, width: 1100 },
    { height: 900, maximum: 288, minimum: 284, width: 1600 },
    { height: 1200, maximum: 332, minimum: 328, width: 2000 },
  ])(
    "keeps the 64-dot composition proportionate and dense at $width×$height",
    async ({ height, maximum, minimum, width }) => {
      await page.viewport(width, height);
      const splash = createStartupSplashDom();
      document.body.append(splash);

      const visual = splash.querySelector<HTMLElement>(".startup-splash__visual");
      const bounds = visual?.getBoundingClientRect();

      expect(splash.querySelectorAll(".startup-splash__dot")).toHaveLength(64);
      expect(bounds?.width).toBeGreaterThanOrEqual(minimum);
      expect(bounds?.width).toBeLessThanOrEqual(maximum);
      expect(bounds?.height).toBeCloseTo(bounds?.width ?? 0, 1);
      splash.remove();
    },
  );

  it("does not finish until shell and focused Composer catalog are both terminal", async () => {
    initializeStartupSplash();
    reportStartupShellReadiness({ settled: true, expectsComposer: true });

    await wait(1_450);
    expect(document.documentElement.dataset.startupReady).toBeUndefined();
    expect(isStartupSplashActive()).toBe(true);

    reportFocusedComposerReadiness(true);
    await wait(10);
    expect(document.documentElement.dataset.startupReady).toBe("true");
    await wait(1_150);

    expect(isStartupSplashActive()).toBe(false);
    expect(document.getElementById("startup-splash")).toBeNull();
  });

  it("cancels a pending exit when the focused Engine changes back to checking", async () => {
    initializeStartupSplash();
    reportStartupShellReadiness({ settled: true, expectsComposer: true });
    reportFocusedComposerReadiness(true);

    await wait(150);
    reportFocusedComposerReadiness(false);
    await wait(1_300);
    expect(document.documentElement.dataset.startupReady).toBeUndefined();

    reportFocusedComposerReadiness(true);
    await wait(10);
    expect(document.documentElement.dataset.startupReady).toBe("true");
  });
});
