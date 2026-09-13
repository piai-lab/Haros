import {
  DEFAULT_ENGINE_KIND,
  DEFAULT_SERVER_SETTINGS,
} from "@harnessos/contracts";
import { describe, expect, it } from "vitest";
import {
  engineHasGlobalOnlyModelCatalog,
  engineOwnsProviderModelServices,
  firstRunnableEngine,
  isRunnableEngine,
  RUNNABLE_ENGINE_DESCRIPTORS,
} from "./engineMetadata";
import {
  isServerEngineEnabled,
  normalizeServerSettings,
  validateServerSettingsPatch,
} from "./serverSettings";

describe("retired OA Engine", () => {
  it("exposes ten runnable engines including independent Pi and DeepSeek, and defaults new work to Codex", () => {
    expect(RUNNABLE_ENGINE_DESCRIPTORS.map((x) => x.kind)).toEqual([
      "codex",
      "claude",
      "cursor",
      "antigravity",
      "grok",
      "droid",
      "kilo",
      "opencode",
      "pi",
      "deepseek",
    ]);
    expect(engineHasGlobalOnlyModelCatalog("deepseek")).toBe(true);
    expect(engineOwnsProviderModelServices("deepseek")).toBe(false);
    expect(DEFAULT_ENGINE_KIND).toBe("codex");
    expect(DEFAULT_SERVER_SETTINGS.defaultEngine).toBe("codex");
    expect(firstRunnableEngine("codex")).toBe("codex");
    expect(firstRunnableEngine(null, "claude")).toBe("claude");
    expect(firstRunnableEngine()).toBeNull();
    expect(isRunnableEngine("codex")).toBe(true);
    expect(isRunnableEngine("deepseek")).toBe(true);
  });
  it("marks Haros provider-model engines as global-only catalog owners", () => {
    expect(engineHasGlobalOnlyModelCatalog("pi")).toBe(true);
    expect(engineHasGlobalOnlyModelCatalog("deepseek")).toBe(true);
    expect(engineHasGlobalOnlyModelCatalog("codex")).toBe(false);
    expect(engineOwnsProviderModelServices("pi")).toBe(true);
    expect(engineOwnsProviderModelServices("deepseek")).toBe(false);
    expect(engineOwnsProviderModelServices("codex")).toBe(false);
  });
  it("preserves explicit runnable defaults", () => {
    expect(normalizeServerSettings({ ...DEFAULT_SERVER_SETTINGS, defaultEngine: "claude" }).defaultEngine).toBe(
      "claude",
    );
  });
  it("rejects unknown engines for new default or background text generation work", () => {
    expect(
      validateServerSettingsPatch(DEFAULT_SERVER_SETTINGS, {
        defaultEngine: "unknown" as never,
      }),
    ).toContain("removed");
    expect(
      validateServerSettingsPatch(DEFAULT_SERVER_SETTINGS, {
        textGenerationEngineSelection: { engine: "unknown" as never, model: "provider/model" },
      }),
    ).toContain("removed");
  });
});
