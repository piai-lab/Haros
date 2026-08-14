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
    .replaceAll("~/projects/my-app", "")
    .replaceAll("thread.json", "")
    .replaceAll("transcript.md", "");
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

  it("localizes the reachable Fast command feedback", () => {
    expect(translate("en", "composer.fastUnavailable")).toBe("Fast mode is unavailable");
    expect(translate("zh-CN", "composer.fastUnavailable")).toBe("快速模式不可用");
    expect(translate("en", "composer.fastStatus", { state: "on" })).toBe("Fast mode is on");
    expect(translate("zh-CN", "composer.fastStatus", { state: "开启" })).toBe("快速模式当前为开启");
    expect(translate("zh-CN", "composer.fastDiscoveryFailed")).toBe(
      "Claude 命令检查失败，请重试。",
    );
  });

  it("localizes Markdown footnote navigation", () => {
    expect(translate("en", "markdown.footnotes.label")).toBe("Footnotes");
    expect(translate("en", "markdown.footnotes.backLabel", { reference: "2-2" })).toBe(
      "Back to reference 2-2",
    );
    expect(translate("zh-CN", "markdown.footnotes.label")).toBe("脚注");
    expect(translate("zh-CN", "markdown.footnotes.backLabel", { reference: "2-2" })).toBe(
      "返回引用 2-2",
    );
  });

  it("keeps custom model discovery actionable and honest in both languages", () => {
    expect(translate("en", "settings.customApiDiscoverModels")).toBe("Get from service");
    expect(translate("zh-CN", "settings.customApiDiscoverModels")).toBe("从供应商获取");
    expect(translate("en", "settings.customApiDiscoverySucceeded", { count: 2 })).toBe(
      "Found 2 models. Select the ones to add.",
    );
    expect(translate("zh-CN", "settings.customApiDiscoverySucceeded", { count: 2 })).toBe(
      "发现 2 个模型，请选择要添加的项目。",
    );
    expect(EN_MESSAGES["settings.customApiDiscoveryFailed.catalog_unavailable"]).toContain(
      "add a model manually",
    );
    expect(ZH_CN_MESSAGES["settings.customApiDiscoveryFailed.catalog_unavailable"]).toContain(
      "手工添加",
    );
    expect(EN_MESSAGES["settings.customApiDiscoveryRiskDescription"]).toContain(
      "model-catalog request",
    );
    expect(ZH_CN_MESSAGES["settings.customApiDiscoveryRiskDescription"]).toContain("模型目录请求");
    expect(EN_MESSAGES["settings.customApiSaveRiskDescription"]).toContain(
      "does not send a request now",
    );
    expect(ZH_CN_MESSAGES["settings.customApiSaveRiskDescription"]).toContain("现在不会发送请求");
    expect(EN_MESSAGES["settings.customApiCredentialCommandDescription"]).toContain(
      "future model requests will run it",
    );
    expect(ZH_CN_MESSAGES["settings.customApiCredentialCommandDescription"]).toContain(
      "之后的模型请求会执行它",
    );
  });

  it("keeps engine update feedback concise and truthful in both supported languages", () => {
    expect(translate("en", "updater.updatingProvider", { provider: "Claude" })).toBe(
      "Updating Claude…",
    );
    expect(
      translate("en", "updater.updatingProviderProgress", {
        current: 2,
        provider: "Codex",
        total: 3,
      }),
    ).toBe("Updating 2/3 · Codex");
    expect(EN_MESSAGES["updater.refreshedDescription"]).toBe("Applies to new sessions");
    expect(EN_MESSAGES["updater.hideProgress"]).toBe("Hide update progress");
    expect(translate("en", "updater.requestTimedOut", { provider: "Codex" })).toBe(
      "Codex update timed out. Try again.",
    );

    expect(translate("zh-CN", "updater.updatingProvider", { provider: "Claude" })).toBe(
      "正在更新 Claude…",
    );
    expect(
      translate("zh-CN", "updater.updatingProviderProgress", {
        current: 2,
        provider: "Codex",
        total: 3,
      }),
    ).toBe("正在更新 2/3 · Codex");
    expect(ZH_CN_MESSAGES["updater.refreshedDescription"]).toBe("新会话生效");
    expect(ZH_CN_MESSAGES["updater.hideProgress"]).toBe("隐藏更新进度");
    expect(translate("zh-CN", "updater.requestTimedOut", { provider: "Codex" })).toBe(
      "更新 Codex 超时，请重试。",
    );
  });

  it("locks the user-facing task, conversation, engine, and System vocabulary", () => {
    expect(EN_MESSAGES["nav.newAgent"]).toBe("New Task");
    expect(ZH_CN_MESSAGES["nav.newAgent"]).toBe("新建任务");
    expect(EN_MESSAGES["nav.newChat"]).toBe("New Chat");
    expect(ZH_CN_MESSAGES["nav.newChat"]).toBe("新建对话");
    expect(EN_MESSAGES["workbench.newChat"]).toBe("New chat");
    expect(ZH_CN_MESSAGES["workbench.newChat"]).toBe("新建对话");
    expect(EN_MESSAGES["shortcuts.newChat"]).toBe("New chat");
    expect(ZH_CN_MESSAGES["shortcuts.newChat"]).toBe("新建对话");
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
