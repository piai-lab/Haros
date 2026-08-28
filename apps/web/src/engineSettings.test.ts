import { DEFAULT_SERVER_SETTINGS_VIEW } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import {
  getAppModelOptions,
  getCustomBinaryPathForEngine,
  getGitTextGenerationModelOptions,
  getEngineStartOptions,
  isGitTextGenerationSettingsDirty,
  normalizeCustomModelSlugs,
  patchCustomModels,
  resolveAppEngineSelection,
} from "./engineSettings";

describe("engine settings projection", () => {
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
      engine: "codex",
      isCustom: true,
    });
  });

  it("projects custom model patches only into ServerSettings", () => {
    expect(patchCustomModels("codex", ["custom/codex-next"])).toEqual({
      engines: { codex: { customModels: ["custom/codex-next"] } },
    });
  });

  it("derives git writing options and dirty state from the authoritative view", () => {
    const settings = {
      ...DEFAULT_SERVER_SETTINGS_VIEW,
      engines: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines,
        codex: {
          ...DEFAULT_SERVER_SETTINGS_VIEW.engines.codex,
          customModels: ["custom/codex-model"],
        },
        opencode: {
          ...DEFAULT_SERVER_SETTINGS_VIEW.engines.opencode,
          customModels: ["openrouter/gpt-oss-120b"],
        },
      },
      textGenerationEngineSelection: {
        engine: "opencode" as const,
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
      engines: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines,
        claude: {
          ...DEFAULT_SERVER_SETTINGS_VIEW.engines.claude,
          binaryPath: "/usr/local/bin/claude",
        },
        codex: {
          ...DEFAULT_SERVER_SETTINGS_VIEW.engines.codex,
          homePath: "/Users/you/.codex",
        },
        cursor: {
          ...DEFAULT_SERVER_SETTINGS_VIEW.engines.cursor,
          binaryPath: "/usr/local/bin/agent",
          apiEndpoint: "http://localhost:3000",
        },
      },
    };

    expect(getEngineStartOptions(settings)).toMatchObject({
      claude: { binaryPath: "/usr/local/bin/claude" },
      codex: { homePath: "/Users/you/.codex" },
      cursor: {
        binaryPath: "/usr/local/bin/agent",
        apiEndpoint: "http://localhost:3000",
      },
    });
    expect(getCustomBinaryPathForEngine(settings, "cursor")).toBe("/usr/local/bin/agent");
  });

  it("resolves canonical and custom model selections without a universal settings object", () => {
    expect(resolveAppEngineSelection("codex", { codex: [] }, "GPT-5.3 Codex")).toBe(
      "gpt-5.3-codex",
    );
    expect(resolveAppEngineSelection("codex", { codex: [] }, "custom/selected-model")).toBe(
      "custom/selected-model",
    );
    expect(resolveAppEngineSelection("pi", { pi: [] }, "")).toBeNull();
  });
});
