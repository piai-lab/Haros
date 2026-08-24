import { DEFAULT_SERVER_SETTINGS_VIEW } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  getAppModelOptions,
  getCustomBinaryPathForProvider,
  getGitTextGenerationModelOptions,
  getProviderStartOptions,
  isGitTextGenerationSettingsDirty,
  normalizeCustomModelSlugs,
  patchCustomModels,
  resolveAppModelSelection,
} from "./providerSettings";

describe("provider settings projection", () => {
  it("normalizes custom model aliases and preserves exact custom selections", () => {
    expect(
      normalizeCustomModelSlugs([
        " custom/internal-model ",
        "gpt-5.3-codex",
        "5.3",
        "custom/internal-model",
      ]),
    ).toEqual(["custom/internal-model"]);
    expect(getAppModelOptions("antigravity", [])).toEqual([]);
    expect(getAppModelOptions("pi", [])).toEqual([]);
    expect(getAppModelOptions("codex", [], "custom/selected-model").at(-1)).toMatchObject({
      slug: "custom/selected-model",
      provider: "codex",
      isCustom: true,
    });
  });

  it("projects custom model patches only into ServerSettings", () => {
    expect(patchCustomModels("codex", ["custom/codex-next"])).toEqual({
      providers: { codex: { customModels: ["custom/codex-next"] } },
    });
  });

  it("derives git writing options and dirty state from the authoritative view", () => {
    const settings = {
      ...DEFAULT_SERVER_SETTINGS_VIEW,
      providers: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.providers,
        codex: {
          ...DEFAULT_SERVER_SETTINGS_VIEW.providers.codex,
          customModels: ["custom/codex-model"],
        },
        opencode: {
          ...DEFAULT_SERVER_SETTINGS_VIEW.providers.opencode,
          customModels: ["openrouter/gpt-oss-120b"],
        },
      },
      textGenerationModelSelection: {
        provider: "opencode" as const,
        model: "openai/gpt-5",
      },
    };

    const options = getGitTextGenerationModelOptions(settings);
    expect(options.some((option) => option.slug === "custom/codex-model")).toBe(true);
    expect(options.some((option) => option.slug === "openrouter/gpt-oss-120b")).toBe(true);
    expect(isGitTextGenerationSettingsDirty(settings, DEFAULT_SERVER_SETTINGS_VIEW)).toBe(true);
  });

  it("derives launch options from the Server projection without browser mirrors", () => {
    const settings = {
      ...DEFAULT_SERVER_SETTINGS_VIEW,
      providers: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.providers,
        claudeAgent: {
          ...DEFAULT_SERVER_SETTINGS_VIEW.providers.claudeAgent,
          binaryPath: "/usr/local/bin/claude",
        },
        codex: {
          ...DEFAULT_SERVER_SETTINGS_VIEW.providers.codex,
          homePath: "/Users/you/.codex",
        },
        cursor: {
          ...DEFAULT_SERVER_SETTINGS_VIEW.providers.cursor,
          binaryPath: "/usr/local/bin/agent",
          apiEndpoint: "http://localhost:3000",
        },
      },
    };

    expect(getProviderStartOptions(settings)).toMatchObject({
      claudeAgent: { binaryPath: "/usr/local/bin/claude" },
      codex: { homePath: "/Users/you/.codex" },
      cursor: {
        binaryPath: "/usr/local/bin/agent",
        apiEndpoint: "http://localhost:3000",
      },
    });
    expect(getCustomBinaryPathForProvider(settings, "cursor")).toBe("/usr/local/bin/agent");
  });

  it("resolves canonical and custom model selections without a universal settings object", () => {
    expect(resolveAppModelSelection("codex", { codex: [] }, "GPT-5.3 Codex")).toBe("gpt-5.3-codex");
    expect(resolveAppModelSelection("codex", { codex: [] }, "custom/selected-model")).toBe(
      "custom/selected-model",
    );
    expect(resolveAppModelSelection("pi", { pi: [] }, "")).toBeNull();
  });
});
