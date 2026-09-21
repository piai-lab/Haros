import {
  DEFAULT_ENGINE_KIND,
  DEFAULT_SERVER_SETTINGS,
  decodePersistedEngineKind,
} from "@harnessos/contracts";
import { describe, expect, it } from "vitest";
import {
  engineConsumesHarosModelServiceCredentials,
  engineHasGlobalOnlyModelCatalog,
  engineHarosModelServiceProtocols,
  engineMatchesHarosModelService,
  engineOpensModelServicesSettings,
  isHarosOverlayComposerModel,
  engineOverlaysHarosModelServiceCatalog,
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

describe("engine identity", () => {
  it("exposes ten runnable engines including independent Pi and DeepSeek, and defaults new work to Pi", () => {
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
    expect(engineConsumesHarosModelServiceCredentials("deepseek")).toBe(true);
    expect(engineOpensModelServicesSettings("deepseek")).toBe(true);
    expect(DEFAULT_ENGINE_KIND).toBe("pi");
    expect(DEFAULT_SERVER_SETTINGS.defaultEngine).toBe("pi");
    expect(DEFAULT_SERVER_SETTINGS.modelServices.added).toEqual({ deepseek: true });
    expect(DEFAULT_SERVER_SETTINGS.textGenerationEngineSelection.engine).toBe("codex");
    expect(firstRunnableEngine("codex")).toBe("codex");
    expect(firstRunnableEngine(null, "claude")).toBe("claude");
    expect(firstRunnableEngine()).toBeNull();
    expect(isRunnableEngine("codex")).toBe(true);
    expect(isRunnableEngine("deepseek")).toBe(true);
    expect(decodePersistedEngineKind("oa")).toBeNull();
    expect(decodePersistedEngineKind("pi")).toBe("pi");
    expect(decodePersistedEngineKind("unknown")).toBeNull();
  });
  it("marks Haros provider-model engines as global-only catalog owners", () => {
    expect(engineHasGlobalOnlyModelCatalog("pi")).toBe(true);
    expect(engineHasGlobalOnlyModelCatalog("deepseek")).toBe(true);
    expect(engineHasGlobalOnlyModelCatalog("codex")).toBe(false);
    expect(engineOwnsProviderModelServices("pi")).toBe(true);
    expect(engineOwnsProviderModelServices("deepseek")).toBe(false);
    expect(engineOwnsProviderModelServices("codex")).toBe(false);
    expect(engineConsumesHarosModelServiceCredentials("pi")).toBe(false);
    expect(engineConsumesHarosModelServiceCredentials("opencode")).toBe(true);
    expect(engineConsumesHarosModelServiceCredentials("kilo")).toBe(true);
    expect(engineConsumesHarosModelServiceCredentials("codex")).toBe(false);
    expect(engineOpensModelServicesSettings("pi")).toBe(true);
    expect(engineOpensModelServicesSettings("opencode")).toBe(true);
    expect(engineOpensModelServicesSettings("codex")).toBe(false);
    expect(engineOverlaysHarosModelServiceCatalog("codex")).toBe(true);
    expect(engineOverlaysHarosModelServiceCatalog("claude")).toBe(true);
    expect(engineOverlaysHarosModelServiceCatalog("cursor")).toBe(false);
    expect(engineHarosModelServiceProtocols("codex")).toEqual([
      "openai-completions",
      "openai-responses",
    ]);
    expect(engineHarosModelServiceProtocols("claude")).toEqual(["anthropic-messages"]);
    expect(
      engineMatchesHarosModelService({
        engine: "codex",
        serviceId: "deepseek",
        api: "openai-completions",
      }),
    ).toBe(true);
    expect(
      engineMatchesHarosModelService({
        engine: "claude",
        serviceId: "deepseek",
        api: "openai-completions",
      }),
    ).toBe(false);
    expect(
      engineMatchesHarosModelService({
        engine: "claude",
        serviceId: "deepseek-anthropic",
        api: "anthropic-messages",
      }),
    ).toBe(true);
    expect(
      engineMatchesHarosModelService({
        engine: "cursor",
        serviceId: "deepseek",
        api: "openai-completions",
      }),
    ).toBe(false);
    expect(engineMatchesHarosModelService({ engine: "grok", serviceId: "xai" })).toBe(true);
    expect(
      engineMatchesHarosModelService({
        engine: "antigravity",
        serviceId: "custom",
        api: "google-generative-ai",
      }),
    ).toBe(true);
    expect(
      engineMatchesHarosModelService({
        engine: "kilo",
        serviceId: "deepseek",
        api: "openai-completions",
      }),
    ).toBe(false);
    expect(
      engineMatchesHarosModelService({
        engine: "pi",
        serviceId: "deepseek",
        api: "openai-completions",
      }),
    ).toBe(false);
    expect(
      isHarosOverlayComposerModel({
        engine: "codex",
        model: "deepseek/deepseek-chat",
      }),
    ).toBe(true);
    expect(
      isHarosOverlayComposerModel({
        engine: "codex",
        model: "foo/bar",
      }),
    ).toBe(false);
  });
  it("preserves explicit runnable defaults", () => {
    expect(
      normalizeServerSettings({ ...DEFAULT_SERVER_SETTINGS, defaultEngine: "claude" })
        .defaultEngine,
    ).toBe("claude");
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
