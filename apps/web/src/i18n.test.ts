import { describe, expect, it } from "vitest";

import { EN_MESSAGES, MESSAGE_CATALOGS, translate, ZH_CN_MESSAGES } from "./i18n";
import { resolveAppLocale } from "./locale";

function placeholders(message: string): string[] {
  return Array.from(message.matchAll(/\{([a-zA-Z0-9_]+)\}/g), (match) => match[1]!).sort();
}

function productCopy(message: string): string {
  return message
    .replaceAll(/\{[^}]+\}/g, "")
    .replaceAll("SKILL.md", "")
    .replaceAll("~/projects/my-app", "");
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

  it("locks the user-facing task, conversation, engine, and System vocabulary", () => {
    expect(EN_MESSAGES["nav.newAgent"]).toBe("New Task");
    expect(ZH_CN_MESSAGES["nav.newAgent"]).toBe("新建任务");
    expect(EN_MESSAGES["nav.newChat"]).toBe("New Chat");
    expect(ZH_CN_MESSAGES["nav.newChat"]).toBe("新建对话");
    expect(EN_MESSAGES["common.system"]).toBe("System");
    expect(ZH_CN_MESSAGES["common.system"]).toBe("跟随系统");

    for (const [key, message] of Object.entries(EN_MESSAGES)) {
      expect(productCopy(message), `${key} exposes internal Thread vocabulary`).not.toMatch(
        /\bthreads?\b/i,
      );
      if (key !== "settings.customModelProvider") {
        expect(productCopy(message), `${key} exposes internal Provider vocabulary`).not.toMatch(
          /\bproviders?\b/i,
        );
      }
      expect(productCopy(message), `${key} exposes internal Composer vocabulary`).not.toMatch(
        /\bcomposer\b/i,
      );
    }

    for (const [key, message] of Object.entries(ZH_CN_MESSAGES)) {
      expect(productCopy(message), `${key} mixes untranslated product vocabulary`).not.toMatch(
        /\b(?:Provider|Providers|Engine|Engines|Skill|Skills|Composer|Workbench|Pull Requests?|App|System|tokens)\b/i,
      );
    }
  });
});
