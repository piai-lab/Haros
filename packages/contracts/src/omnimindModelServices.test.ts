import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  OmniMindCustomModelServiceDiscoverInput,
  OmniMindCustomModelServiceDiscoverResult,
  OmniMindCustomModelServiceSaveResult,
  OmniMindCustomModelServiceTestInput,
  OmniMindModelServiceAnswerLoginInput,
  OmniMindModelServiceAuthResult,
  OmniMindModelServiceBeginLoginInput,
  OmniMindModelServicePollLoginInput,
  OmniMindModelServiceDescriptor,
  OmniMindModelServicesGetResult,
  OmniMindModelServicesGetInput,
  OmniMindModelServicesListInput,
  OmniMindModelServicesListResult,
} from "./omnimindModelServices";

const descriptor = {
  serviceId: "deepseek",
  providerId: "deepseek",
  displayName: "DeepSeek",
  origin: "builtin",
  authMethods: [
    { type: "api_key", label: "DeepSeek API key", canLogin: true, subscription: false },
  ],
  authState: "configured",
  authSource: "stored",
  storedCredentialType: "api_key",
  knownModelCount: 3,
  availableModelCount: 3,
  supportsNetworkRefresh: true,
  catalogState: "ready",
  catalogErrorCode: null,
} as const;

describe("OmniMind model-services contracts", () => {
  it("decodes the credential-blind list projection", () => {
    const decoded = Schema.decodeUnknownSync(OmniMindModelServicesListResult)({
      state: "ready",
      services: [descriptor],
      connectableServices: [],
      errorCode: null,
    });

    expect(decoded.services[0]).toEqual(descriptor);
  });

  it("only admits the explicit add-service intent and a bounded extension outcome", () => {
    expect(
      Schema.decodeUnknownSync(OmniMindModelServicesListInput)({ intent: "add_service" }),
    ).toEqual({ intent: "add_service" });
    expect(
      Schema.decodeUnknownSync(OmniMindModelServicesGetInput)({
        serviceId: "extension-service",
        intent: "add_service",
      }),
    ).toEqual({ serviceId: "extension-service", intent: "add_service" });
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServicesListInput)({ intent: "settings_open" }),
    ).toThrow();

    const decoded = Schema.decodeUnknownSync(OmniMindModelServicesListResult)({
      state: "empty",
      services: [],
      connectableServices: [],
      extensionProjectionState: "unavailable",
      errorCode: null,
    });
    expect(decoded.state === "empty" ? decoded.extensionProjectionState : undefined).toBe(
      "unavailable",
    );
  });

  it("decodes bounded public model facts without accepting private runtime fields", () => {
    const decoded = Schema.decodeUnknownSync(OmniMindModelServicesGetResult)({
      state: "ready",
      service: descriptor,
      models: [
        {
          modelId: "deepseek/deepseek-v4-pro",
          displayName: "DeepSeek V4 Pro",
          available: true,
          reasoning: true,
          input: ["text", "image"],
          contextWindow: 131_072,
          maxTokens: 16_384,
          baseUrl: "https://secret.example.test/v1",
          headers: { Authorization: "Bearer secret" },
        },
      ],
      errorCode: null,
    });

    expect(decoded.state).toBe("ready");
    if (decoded.state !== "ready") throw new Error("Expected ready model-service detail");
    expect(decoded.models?.[0]).toEqual({
      modelId: "deepseek/deepseek-v4-pro",
      displayName: "DeepSeek V4 Pro",
      available: true,
      reasoning: true,
      input: ["text", "image"],
      contextWindow: 131_072,
      maxTokens: 16_384,
    });
    expect(JSON.stringify(decoded)).not.toContain("secret.example.test");
    expect(JSON.stringify(decoded)).not.toContain("Authorization");
  });

  it("keeps custom configuration editable without accepting credentials or headers", () => {
    const decoded = Schema.decodeUnknownSync(OmniMindModelServicesGetResult)({
      state: "ready",
      service: { ...descriptor, serviceId: "custom", providerId: "custom", origin: "models_json" },
      models: [],
      customConfig: {
        serviceId: "custom",
        displayName: "Private gateway",
        api: "openai-responses",
        baseUrl: "https://gateway.example.test/v1",
        models: [
          {
            modelId: "model-one",
            displayName: "Model One",
            reasoning: true,
            input: ["text"],
            contextWindow: 128_000,
            maxTokens: 16_384,
          },
        ],
        apiKey: "must-not-decode",
        headers: { Authorization: "must-not-decode" },
      },
      errorCode: null,
    });

    expect(decoded.state).toBe("ready");
    if (decoded.state !== "ready") throw new Error("Expected ready custom service detail");
    expect(decoded.customConfig).toEqual({
      serviceId: "custom",
      displayName: "Private gateway",
      api: "openai-responses",
      baseUrl: "https://gateway.example.test/v1",
      models: [
        {
          modelId: "model-one",
          displayName: "Model One",
          reasoning: true,
          input: ["text"],
          contextWindow: 128_000,
          maxTokens: 16_384,
        },
      ],
    });
    expect(JSON.stringify(decoded)).not.toContain("must-not-decode");
  });

  it("accepts typed credential intents without returning their private values", () => {
    expect(
      Schema.decodeUnknownSync(OmniMindCustomModelServiceTestInput)({
        config: {
          serviceId: "custom",
          displayName: "Custom",
          api: "anthropic-messages",
          baseUrl: "https://gateway.example.test",
          models: [
            {
              modelId: "model-one",
              displayName: "Model One",
              reasoning: false,
              input: ["text"],
              contextWindow: 32_000,
              maxTokens: 4_096,
            },
          ],
        },
        credential: { type: "preserve" },
        testModelId: "model-one",
      }).credential,
    ).toEqual({ type: "preserve" });
    expect(() =>
      Schema.decodeUnknownSync(OmniMindCustomModelServiceTestInput)({
        config: {},
        credential: { type: "stored_key", apiKey: "" },
        testModelId: "model-one",
      }),
    ).toThrow();
    expect(
      Schema.decodeUnknownSync(OmniMindCustomModelServiceTestInput)({
        config: {
          serviceId: "custom",
          displayName: "Custom",
          api: "anthropic-messages",
          baseUrl: "https://gateway.example.test",
          models: [
            {
              modelId: "model-one",
              displayName: "Model One",
              reasoning: false,
              input: ["text"],
              contextWindow: 32_000,
              maxTokens: 4_096,
            },
          ],
        },
        credential: { type: "environment", variableName: "CUSTOM_API_KEY" },
        testModelId: "model-one",
      }).credential,
    ).toEqual({ type: "environment", variableName: "CUSTOM_API_KEY" });
    expect(
      Schema.decodeUnknownSync(OmniMindCustomModelServiceTestInput)({
        config: {
          serviceId: null,
          displayName: "Basic only",
          api: "openai-completions",
          baseUrl: "https://gateway.example.test/v1",
          models: [{ modelId: "model-one" }],
        },
        credential: { type: "command", command: "printf private-key" },
        testModelId: "model-one",
      }).config.models,
    ).toEqual([{ modelId: "model-one" }]);
    expect(() =>
      Schema.decodeUnknownSync(OmniMindCustomModelServiceTestInput)({
        config: {
          serviceId: null,
          displayName: "Invalid env",
          api: "openai-completions",
          baseUrl: "https://gateway.example.test/v1",
          models: [{ modelId: "model-one" }],
        },
        credential: { type: "environment", variableName: "NOT VALID" },
        testModelId: "model-one",
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(OmniMindCustomModelServiceTestInput)({
        config: {
          serviceId: null,
          displayName: "Invalid command",
          api: "openai-completions",
          baseUrl: "https://gateway.example.test/v1",
          models: [{ modelId: "model-one" }],
        },
        credential: { type: "command", command: "printf key\n" },
        testModelId: "model-one",
      }),
    ).toThrow();
    expect(
      Schema.decodeUnknownSync(OmniMindCustomModelServiceSaveResult)({
        state: "config_saved_sync_failed",
        service: null,
      }),
    ).toEqual({ state: "config_saved_sync_failed", service: null });
  });

  it("admits only the closed credential-blind advanced model surface", () => {
    const decoded = Schema.decodeUnknownSync(OmniMindCustomModelServiceTestInput)({
      config: {
        serviceId: "custom",
        displayName: "Custom",
        api: "openai-completions",
        baseUrl: "https://gateway.example.test/v1",
        authHeader: false,
        models: [
          {
            modelId: "model-one",
            api: "openai-responses",
            baseUrl: "https://model.example.test/v1",
            thinkingLevelMap: { off: null, low: "low", high: "high" },
          },
        ],
      },
      credential: { type: "preserve" },
      testModelId: "model-one",
    });
    expect(decoded.config).toMatchObject({
      authHeader: false,
      models: [
        {
          api: "openai-responses",
          baseUrl: "https://model.example.test/v1",
          thinkingLevelMap: { off: null, low: "low", high: "high" },
        },
      ],
    });

    expect(() =>
      Schema.decodeUnknownSync(OmniMindCustomModelServiceTestInput)({
        config: {
          serviceId: "custom",
          displayName: "Custom",
          api: "openai-completions",
          baseUrl: "https://gateway.example.test/v1",
          models: [
            {
              modelId: "model-one",
              baseUrl: "file:///private/model",
            },
          ],
        },
        credential: { type: "preserve" },
        testModelId: "model-one",
      }),
    ).toThrow();
    expect(JSON.stringify(decoded)).not.toContain("headers");
    expect(JSON.stringify(decoded)).not.toContain("samplingParams");
    expect(JSON.stringify(decoded)).not.toContain("compat");
  });

  it("keeps generic model discovery bounded and credential-blind", () => {
    expect(
      Schema.decodeUnknownSync(OmniMindCustomModelServiceDiscoverInput)({
        config: {
          serviceId: null,
          displayName: "Private gateway",
          api: "openai-responses",
          baseUrl: "https://gateway.example.test/v1",
        },
        credential: { type: "stored_key", apiKey: "discovery-only-secret" },
      }).config,
    ).toEqual({
      serviceId: null,
      displayName: "Private gateway",
      api: "openai-responses",
      baseUrl: "https://gateway.example.test/v1",
    });

    const decoded = Schema.decodeUnknownSync(OmniMindCustomModelServiceDiscoverResult)({
      state: "success",
      models: [{ modelId: "model-one", displayName: "Model One" }],
      errorCode: null,
      apiKey: "must-not-decode",
      headers: { Authorization: "must-not-decode" },
    });
    expect(decoded).toEqual({
      state: "success",
      models: [{ modelId: "model-one", displayName: "Model One" }],
      errorCode: null,
    });
    expect(JSON.stringify(decoded)).not.toContain("must-not-decode");
    expect(() =>
      Schema.decodeUnknownSync(OmniMindCustomModelServiceDiscoverResult)({
        state: "success",
        models: [],
        errorCode: null,
      }),
    ).toThrow();
  });

  it("rejects path-shaped get inputs and invalid counts", () => {
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServicesGetInput)({
        serviceId: "/private/.omnimind/agent/auth.json",
      }),
    ).toThrow();
    expect(
      Schema.decodeUnknownSync(OmniMindModelServicesGetInput)({ serviceId: "小米代理" }),
    ).toEqual({ serviceId: "小米代理" });
    for (const serviceId of ["..", "provider/child", "provider\\child", "provider\u202esecret"]) {
      expect(() =>
        Schema.decodeUnknownSync(OmniMindModelServicesGetInput)({ serviceId }),
      ).toThrow();
    }
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServiceDescriptor)({
        ...descriptor,
        availableModelCount: -1,
      }),
    ).toThrow();
  });

  it("rejects path, URL, control, and bidi-shaped display labels", () => {
    for (const displayName of [
      "/private/agent/auth.json",
      "C:\\private\\auth.json",
      "\\\\server\\share",
      "file:///private/auth.json",
      "https://secret.example.test/v1",
      "Unsafe\u061c label",
      "Unsafe\u200f label",
      "Unsafe\u009f label",
    ]) {
      expect(() =>
        Schema.decodeUnknownSync(OmniMindModelServiceDescriptor)({ ...descriptor, displayName }),
      ).toThrow();
    }
  });

  it("rejects contradictory projection and catalog error states", () => {
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServicesListResult)({
        state: "error",
        services: [],
        connectableServices: [],
        errorCode: null,
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServiceDescriptor)({
        ...descriptor,
        catalogState: "ready",
        catalogErrorCode: "catalog_unavailable",
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServicesListResult)({
        state: "ready",
        services: [],
        connectableServices: [],
        errorCode: null,
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(OmniMindModelServicesListResult)({
        state: "empty",
        services: [descriptor],
        connectableServices: [],
        errorCode: null,
      }),
    ).toThrow();
  });

  it("strips secret, endpoint, header, and path fields from encoded output", () => {
    const encoded = Schema.encodeSync(OmniMindModelServiceDescriptor)({
      ...descriptor,
      apiKey: "sk-secret",
      endpoint: "https://secret.example.test/v1",
      headers: { Authorization: "Bearer secret" },
      authPath: "/private/.omnimind/agent/auth.json",
    } as typeof descriptor);
    const serialized = JSON.stringify(encoded);

    expect(serialized).not.toContain("sk-secret");
    expect(serialized).not.toContain("secret.example.test");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("auth.json");
  });

  it("decodes typed auth prompts while keeping credentials out of results", () => {
    const requestId = "00000000-0000-4000-8000-000000000021";
    const promptId = "00000000-0000-4000-8000-000000000022";
    expect(
      Schema.decodeUnknownSync(OmniMindModelServiceBeginLoginInput)({
        serviceId: "deepseek",
        authType: "api_key",
      }),
    ).toEqual({ serviceId: "deepseek", authType: "api_key" });
    expect(
      Schema.decodeUnknownSync(OmniMindModelServiceBeginLoginInput)({
        serviceId: "openai-codex",
        authType: "oauth",
        promptMode: "provider_default",
        origin: "extension",
      }),
    ).toEqual({
      serviceId: "openai-codex",
      authType: "oauth",
      promptMode: "provider_default",
      origin: "extension",
    });
    expect(
      Schema.decodeUnknownSync(OmniMindModelServicePollLoginInput)({
        requestId,
        afterEventCount: 1,
        afterPromptId: promptId,
      }),
    ).toEqual({ requestId, afterEventCount: 1, afterPromptId: promptId });
    expect(
      Schema.decodeUnknownSync(OmniMindModelServiceAnswerLoginInput)({
        requestId,
        promptId,
        value: "test-secret",
      }),
    ).toEqual({ requestId, promptId, value: "test-secret" });
    const result = Schema.encodeSync(OmniMindModelServiceAuthResult)({
      state: "complete",
      requestId,
      service: descriptor,
      events: [{ type: "progress", message: "Credential stored" }],
      credential: { key: "must-not-cross-the-contract" },
    } as never);
    expect(JSON.stringify(result)).not.toContain("must-not-cross-the-contract");
  });
});
