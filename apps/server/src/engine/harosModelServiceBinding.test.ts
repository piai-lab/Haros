import { describe, expect, it } from "vitest";

import {
  buildCodexModelServiceConfigToml,
  HARNESSOS_CODEX_MODEL_SERVICE_KEY_ENV,
  mergeHarosModelServiceCatalog,
  requireConfiguredHarosOverlayBinding,
  resolveClaudeModelServiceEnv,
  resolveCodexModelServiceSpawn,
  resolveHarosModelServiceBinding,
} from "./harosModelServiceBinding.ts";

describe("harosModelServiceBinding", () => {
  it("matches Codex to Completions and Claude only to Messages", () => {
    const storedApiKeys = new Map([["deepseek", "sk-deepseek"]]);
    const providers = [
      { serviceId: "deepseek", api: "openai-completions", baseUrl: "https://api.deepseek.com" },
    ];
    expect(
      resolveHarosModelServiceBinding({
        engine: "codex",
        model: "deepseek/deepseek-chat",
        storedApiKeys,
        providers,
      }),
    ).toMatchObject({
      engine: "codex",
      serviceId: "deepseek",
      modelId: "deepseek-chat",
      api: "openai-completions",
    });
    expect(
      resolveHarosModelServiceBinding({
        engine: "claude",
        model: "deepseek/deepseek-chat",
        storedApiKeys,
        providers,
      }),
    ).toBeNull();
    expect(
      resolveHarosModelServiceBinding({
        engine: "codex",
        model: "foo/bar",
        storedApiKeys,
        providers,
      }),
    ).toBeNull();
  });

  it("keeps native catalog first and overlays matching Haros models", () => {
    const merged = mergeHarosModelServiceCatalog({
      engine: "codex",
      nativeModels: [{ slug: "gpt-5.3-codex", name: "GPT-5.3 Codex" }],
      services: [
        {
          serviceId: "deepseek",
          providerId: "deepseek",
          displayName: "DeepSeek",
          origin: "builtin",
          authMethods: [],
          authState: "configured",
          authSource: "stored",
          storedCredentialType: "api_key",
          knownModelCount: 1,
          availableModelCount: 1,
          supportsNetworkRefresh: true,
          catalogState: "ready",
          catalogErrorCode: null,
          api: "openai-completions",
        },
      ],
      modelsByServiceId: new Map([
        [
          "deepseek",
          [
            {
              modelId: "deepseek-chat",
              displayName: "DeepSeek Chat",
              available: true,
              reasoning: false,
              input: ["text"],
              contextWindow: 0,
              maxTokens: 0,
            },
          ],
        ],
      ]),
    });
    expect(merged.map((model) => model.slug)).toEqual(["gpt-5.3-codex", "deepseek/deepseek-chat"]);
  });

  it("does not overlay Completions models onto Claude", () => {
    const merged = mergeHarosModelServiceCatalog({
      engine: "claude",
      nativeModels: [{ slug: "claude-opus-4-6", name: "Opus" }],
      services: [
        {
          serviceId: "deepseek",
          providerId: "deepseek",
          displayName: "DeepSeek",
          origin: "builtin",
          authMethods: [],
          authState: "configured",
          authSource: "stored",
          storedCredentialType: "api_key",
          knownModelCount: 1,
          availableModelCount: 1,
          supportsNetworkRefresh: true,
          catalogState: "ready",
          catalogErrorCode: null,
          api: "openai-completions",
        },
      ],
      modelsByServiceId: new Map([
        [
          "deepseek",
          [
            {
              modelId: "deepseek-chat",
              displayName: "DeepSeek Chat",
              available: true,
              reasoning: false,
              input: ["text"],
              contextWindow: 0,
              maxTokens: 0,
            },
          ],
        ],
      ]),
    });
    expect(merged.map((model) => model.slug)).toEqual(["claude-opus-4-6"]);
  });

  it("builds a Codex overlay without converting protocols", () => {
    const spawn = resolveCodexModelServiceSpawn({
      engine: "codex",
      serviceId: "deepseek",
      modelId: "deepseek-chat",
      api: "openai-completions",
      baseUrl: "https://api.deepseek.com",
      apiKey: "sk-deepseek",
    });
    expect(spawn.overlayId).toBe("haros-deepseek");
    expect(spawn.env?.[HARNESSOS_CODEX_MODEL_SERVICE_KEY_ENV]).toBe("sk-deepseek");
    expect(spawn.extraConfigToml).toContain('model_provider = "haros-deepseek"');
    expect(spawn.extraConfigToml).toContain('wire_api = "chat"');
    expect(
      buildCodexModelServiceConfigToml({
        engine: "codex",
        serviceId: "deepseek",
        modelId: "deepseek-chat",
        api: "anthropic-messages",
        apiKey: "sk-deepseek",
      }),
    ).toBeUndefined();
  });

  it("injects Claude Messages credentials only", () => {
    expect(
      resolveClaudeModelServiceEnv({
        engine: "claude",
        serviceId: "deepseek-anthropic",
        modelId: "deepseek-chat",
        api: "anthropic-messages",
        baseUrl: "https://api.deepseek.com/anthropic",
        apiKey: "sk-deepseek",
      }),
    ).toEqual({
      ANTHROPIC_API_KEY: "sk-deepseek",
      ANTHROPIC_BASE_URL: "https://api.deepseek.com/anthropic",
    });
    expect(
      resolveClaudeModelServiceEnv({
        engine: "claude",
        serviceId: "deepseek",
        modelId: "deepseek-chat",
        api: "openai-completions",
        apiKey: "sk-deepseek",
      }),
    ).toEqual({});
  });

  it("fails spawn when an overlay model has no configured key", () => {
    expect(() =>
      requireConfiguredHarosOverlayBinding({
        engine: "codex",
        model: "deepseek/deepseek-chat",
        snapshot: null,
      }),
    ).toThrow(/Could not read Haros model services/);
    expect(() =>
      requireConfiguredHarosOverlayBinding({
        engine: "codex",
        model: "deepseek/deepseek-chat",
        snapshot: { storedApiKeys: new Map(), providers: [] },
      }),
    ).toThrow(/not configured/);
    expect(
      requireConfiguredHarosOverlayBinding({
        engine: "codex",
        model: "gpt-5.3-codex",
        snapshot: null,
      }),
    ).toBeNull();
  });

  it("uses the DeepSeek /v1 root when Codex has no custom base URL", () => {
    expect(
      buildCodexModelServiceConfigToml({
        engine: "codex",
        serviceId: "deepseek",
        modelId: "deepseek-chat",
        api: "openai-completions",
        apiKey: "sk-deepseek",
      }),
    ).toContain('base_url = "https://api.deepseek.com/v1"');
  });
});
