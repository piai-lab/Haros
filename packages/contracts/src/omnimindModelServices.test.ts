import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  OmniMindCustomModelServiceSaveResult,
  OmniMindCustomModelServiceTestInput,
  OmniMindModelServiceAnswerLoginInput,
  OmniMindModelServiceAuthResult,
  OmniMindModelServiceBeginLoginInput,
  OmniMindModelServicePollLoginInput,
  OmniMindModelServiceDescriptor,
  OmniMindModelServicesGetResult,
  OmniMindModelServicesGetInput,
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

  it("requires a bounded secret only at the custom test boundary and permits null on edit", () => {
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
        apiKey: null,
        testModelId: "model-one",
      }).apiKey,
    ).toBeNull();
    expect(() =>
      Schema.decodeUnknownSync(OmniMindCustomModelServiceTestInput)({
        config: {},
        apiKey: "",
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
      }),
    ).toEqual({
      serviceId: "openai-codex",
      authType: "oauth",
      promptMode: "provider_default",
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
