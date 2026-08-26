import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createStartupSplashDom } from "../startup/startupSplashDom";
import {
  dismissStartupSplashImmediately,
  initializeStartupSplash,
  isStartupSplashActive,
  reportFocusedComposerReadiness,
  reportStartupShellReadiness,
} from "../startup/startupSplash";

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

describe("Desktop startup splash", () => {
  beforeEach(() => {
    dismissStartupSplashImmediately();
  });

  afterEach(() => {
    dismissStartupSplashImmediately();
  });

  it("retains the exact 64-dot golden-angle presentation with accessible bilingual status", () => {
    const splash = createStartupSplashDom({ locale: "zh-CN", presentation: "full" });

    expect(splash.querySelectorAll(".startup-splash__dot")).toHaveLength(64);
    expect(splash.querySelector(".startup-splash__visual")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(splash.querySelector(".startup-splash__status")?.getAttribute("role")).toBe("status");
    expect((splash.querySelector(".startup-splash__status") as HTMLElement).dataset.message).toBe(
      "正在准备模型…",
    );
    splash.remove();
  });

  it("does not finish until shell and focused Composer catalog are both terminal", async () => {
    initializeStartupSplash("brief");
    reportStartupShellReadiness({ settled: true, expectsComposer: true });

    await wait(550);
    expect(document.documentElement.dataset.startupReady).toBeUndefined();
    expect(isStartupSplashActive()).toBe(true);

    reportFocusedComposerReadiness(true);
    await wait(10);
    expect(document.documentElement.dataset.startupReady).toBe("true");
    await wait(400);

    expect(isStartupSplashActive()).toBe(false);
    expect(document.getElementById("startup-splash")).toBeNull();
    expect(document.documentElement.dataset.startupSlow).toBeUndefined();
  });

  it("cancels a pending exit when the focused Engine changes back to checking", async () => {
    initializeStartupSplash("brief");
    reportStartupShellReadiness({ settled: true, expectsComposer: true });
    reportFocusedComposerReadiness(true);

    await wait(150);
    reportFocusedComposerReadiness(false);
    await wait(400);
    expect(document.documentElement.dataset.startupReady).toBeUndefined();

    reportFocusedComposerReadiness(true);
    await wait(10);
    expect(document.documentElement.dataset.startupReady).toBe("true");
  });
});
