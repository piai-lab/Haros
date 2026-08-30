import { describe, expect, it, vi } from "vitest";

import {
  AUTH_SIGNED_OUT_PATH,
  bootstrapSignedOutScreen,
  createSignedOutMarkup,
} from "./authSignedOut";

describe("bootstrapSignedOutScreen", () => {
  it("uses the shared pre-React system palette and complete bilingual copy", () => {
    const english = createSignedOutMarkup("en");
    const chinese = createSignedOutMarkup("zh-CN");

    expect(english).toContain("color-scheme: light dark");
    expect(english).toContain("@media (prefers-color-scheme: dark)");
    expect(english).toContain("This browser no longer controls Haros.");
    expect(chinese).toContain("此浏览器已不再控制 Haros");
    expect(english).toContain("background:var(--startup-canvas)");
  });

  it("renders only on the dedicated signed-out route", () => {
    const render = vi.fn();

    expect(bootstrapSignedOutScreen({ pathname: "/", render })).toBe(false);
    expect(render).not.toHaveBeenCalled();

    expect(bootstrapSignedOutScreen({ pathname: AUTH_SIGNED_OUT_PATH, render })).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);
  });
});
