import { describe, expect, it } from "vitest";

import {
  hasStoredDeepSeekModelServiceKey,
  loadHarosModelServiceChildEnv,
  parseModelServiceProviderHints,
  parseStoredModelServiceApiKeys,
  resolveHarosModelServiceChildEnv,
} from "./modelServiceChildEnv.ts";

describe("resolveHarosModelServiceChildEnv", () => {
  it("projects a stored DeepSeek key and custom gateway URL", () => {
    const storedApiKeys = parseStoredModelServiceApiKeys({
      deepseek: { type: "api_key", key: "sk-deepseek-stored" },
    });
    const providers = parseModelServiceProviderHints({
      providers: {
        deepseek: {
          api: "openai-completions",
          baseUrl: "https://gateway.example.test/v1",
        },
      },
    });

    expect(
      resolveHarosModelServiceChildEnv({
        engine: "deepseek",
        storedApiKeys,
        providers,
        processEnv: { PATH: "/usr/bin" },
      }),
    ).toEqual({
      DEEPSEEK_API_KEY: "sk-deepseek-stored",
      DEEPSEEK_BASE_URL: "https://gateway.example.test/v1",
    });
  });

  it("does not clobber an explicit process DeepSeek key", () => {
    expect(
      resolveHarosModelServiceChildEnv({
        engine: "deepseek",
        storedApiKeys: new Map([["deepseek", "sk-stored"]]),
        providers: [],
        processEnv: { DEEPSEEK_API_KEY: "sk-process" },
      }),
    ).toEqual({});
  });

  it("skips OAuth-only DeepSeek credentials", () => {
    const storedApiKeys = parseStoredModelServiceApiKeys({
      deepseek: { type: "oauth", access: "tok", refresh: "ref", expires: Date.now() + 60_000 },
    });
    expect(
      resolveHarosModelServiceChildEnv({
        engine: "deepseek",
        storedApiKeys,
        providers: [],
        processEnv: {},
      }),
    ).toEqual({});
    expect(hasStoredDeepSeekModelServiceKey({ storedApiKeys, providers: [] })).toBe(false);
  });

  it("uses a single custom OpenAI-compatible gateway as DeepSeek 中转", () => {
    const storedApiKeys = parseStoredModelServiceApiKeys({
      "my-gateway": { type: "api_key", key: "sk-gateway" },
    });
    const providers = parseModelServiceProviderHints({
      providers: {
        "my-gateway": {
          api: "openai-completions",
          baseUrl: "https://relay.example.test/v1",
        },
      },
    });
    expect(
      resolveHarosModelServiceChildEnv({
        engine: "deepseek",
        storedApiKeys,
        providers,
        processEnv: {},
      }),
    ).toEqual({
      DEEPSEEK_API_KEY: "sk-gateway",
      DEEPSEEK_BASE_URL: "https://relay.example.test/v1",
    });
  });

  it("projects well-known provider keys for OpenCode without inventing OAuth env vars", () => {
    const storedApiKeys = parseStoredModelServiceApiKeys({
      openai: { type: "api_key", key: "sk-openai" },
      anthropic: { type: "oauth", access: "tok", refresh: "ref", expires: Date.now() + 60_000 },
    });
    expect(
      resolveHarosModelServiceChildEnv({
        engine: "opencode",
        storedApiKeys,
        providers: parseModelServiceProviderHints({
          providers: {
            openai: { api: "openai-completions", baseUrl: "https://api.openai.com/v1" },
            anthropic: { api: "anthropic-messages" },
          },
        }),
        processEnv: {},
      }),
    ).toEqual({ OPENAI_API_KEY: "sk-openai" });
  });

  it("does not project credentials for Codex", () => {
    expect(
      resolveHarosModelServiceChildEnv({
        engine: "codex",
        storedApiKeys: new Map([["openai", "sk-openai"]]),
        providers: [],
        processEnv: {},
      }),
    ).toEqual({});
  });
});

describe("loadHarosModelServiceChildEnv", () => {
  it("reads stored DeepSeek keys from private files without clobbering process env", async () => {
    const files = {
      "auth.json": JSON.stringify({ deepseek: { type: "api_key", key: "sk-file" } }),
      "models.json": JSON.stringify({
        providers: {
          deepseek: { api: "openai-completions", baseUrl: "https://api.deepseek.com" },
        },
      }),
    };
    await expect(
      loadHarosModelServiceChildEnv({
        engine: "deepseek",
        agentDir: "/tmp/unused",
        processEnv: {},
        readTextFile: async (filename) => files[filename],
      }),
    ).resolves.toEqual({ DEEPSEEK_API_KEY: "sk-file" });
    await expect(
      loadHarosModelServiceChildEnv({
        engine: "deepseek",
        agentDir: "/tmp/unused",
        processEnv: { DEEPSEEK_API_KEY: "sk-process" },
        readTextFile: async (filename) => files[filename],
      }),
    ).resolves.toEqual({});
  });

  it("treats missing credential files as empty and surfaces isolation errors", async () => {
    const missing = Object.assign(new Error("not found"), { code: "ENOENT" });
    await expect(
      loadHarosModelServiceChildEnv({
        engine: "deepseek",
        agentDir: "/tmp/unused",
        processEnv: {},
        readTextFile: async () => {
          throw missing;
        },
      }),
    ).resolves.toEqual({});
    await expect(
      loadHarosModelServiceChildEnv({
        engine: "deepseek",
        agentDir: "/tmp/unused",
        processEnv: {},
        readTextFile: async () => {
          throw new Error("Model-service configuration isolation could not be verified");
        },
      }),
    ).rejects.toThrow(/isolation could not be verified/);
    await expect(
      loadHarosModelServiceChildEnv({
        engine: "deepseek",
        agentDir: "/tmp/unused",
        processEnv: {},
        readTextFile: async () => "{not-json",
      }),
    ).rejects.toThrow();
  });
});
