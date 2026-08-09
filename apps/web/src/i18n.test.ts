import { describe, expect, it } from "vitest";

import { EN_MESSAGES, MESSAGE_CATALOGS, translate, ZH_CN_MESSAGES } from "./i18n";
import { resolveAppLocale } from "./locale";

function placeholders(message: string): string[] {
  return Array.from(message.matchAll(/\{([a-zA-Z0-9_]+)\}/g), (match) => match[1]!).sort();
}

describe("message catalogs", () => {
  it("keeps English and Simplified Chinese keys and placeholders in parity", () => {
    expect(Object.keys(ZH_CN_MESSAGES).sort()).toEqual(Object.keys(EN_MESSAGES).sort());
    for (const key of Object.keys(EN_MESSAGES) as Array<keyof typeof EN_MESSAGES>) {
      expect(placeholders(MESSAGE_CATALOGS["zh-CN"][key]), key).toEqual(
        placeholders(MESSAGE_CATALOGS.en[key]),
      );
    }
  });

  it("covers every required normal product surface", () => {
    const keys = Object.keys(EN_MESSAGES);
    for (const prefix of [
      "shell.",
      "nav.",
      "composer.",
      "timeline.",
      "workbench.",
      "settings.",
      "library.",
      "error.",
      "updater.",
    ]) {
      expect(
        keys.some((key) => key.startsWith(prefix)),
        prefix,
      ).toBe(true);
    }
  });

  it("resolves System without guessing non-Chinese locales and interpolates values", () => {
    expect(resolveAppLocale("system", ["zh-Hans-CN", "en-US"])).toBe("zh-CN");
    expect(resolveAppLocale("system", ["en-GB"])).toBe("en");
    expect(resolveAppLocale("system", ["ja-JP"])).toBe("en");
    expect(resolveAppLocale("zh-CN", ["en-US"])).toBe("zh-CN");
    expect(translate("zh-CN", "library.title", { provider: "Pi" })).toBe("Pi 能力库");
  });
});
