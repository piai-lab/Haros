import { DEFAULT_SERVER_SETTINGS, ProviderSessionStartInput } from "@harnessos/contracts";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  applyServerSettingsPatch,
  normalizeBuiltInGroupOverrides,
  providerStartOptionsFromServerSettings,
  validateServerSettingsPatch,
} from "./serverSettings";

const decodeProviderSessionStartInput = Schema.decodeUnknownSync(ProviderSessionStartInput);

describe("applyServerSettingsPatch", () => {
  it("normalizes surface overrides without discarding unknown bounded ids", () => {
    expect(
      normalizeBuiltInGroupOverrides({
        agent: { "future-group": false, browser: true },
      }),
    ).toEqual({ agent: { browser: true, "future-group": false } });

    expect(
      applyServerSettingsPatch(DEFAULT_SERVER_SETTINGS, {
        agentTools: {
          builtInGroupOverrides: { agent: { device: true, "future-group": false } },
        },
      }).agentTools.builtInGroupOverrides,
    ).toEqual({ agent: { device: true, "future-group": false } });
  });

  it("normalizes own properties only", () => {
    const inherited = Object.create({ browser: false }) as Record<string, boolean>;
    inherited.device = true;

    expect(normalizeBuiltInGroupOverrides({ agent: inherited })).toEqual({
      agent: { device: true },
    });
  });

  it("replaces only the override field so reset removes known keys", () => {
    const current = applyServerSettingsPatch(DEFAULT_SERVER_SETTINGS, {
      agentTools: { builtInGroupOverrides: { agent: { browser: false } } },
      enableProviderUpdateChecks: false,
    });
    const reset = applyServerSettingsPatch(current, {
      agentTools: { builtInGroupOverrides: {} },
    });
    expect(reset.agentTools.builtInGroupOverrides).toEqual({});
    expect(reset.enableProviderUpdateChecks).toBe(false);
  });

  it("rejects new unsupported overrides while allowing their removal", () => {
    expect(
      validateServerSettingsPatch(DEFAULT_SERVER_SETTINGS, {
        agentTools: { builtInGroupOverrides: { chat: { tasks: true } } },
      }),
    ).toContain("unsupported");
    const poisoned = {
      ...DEFAULT_SERVER_SETTINGS,
      agentTools: { builtInGroupOverrides: { chat: { tasks: false } } },
    };
    expect(
      validateServerSettingsPatch(poisoned, {
        agentTools: { builtInGroupOverrides: {} },
      }),
    ).toBeNull();
  });

  it("refuses a provider-only switch to a runtime-catalog-only provider", () => {
    const patch = {
      textGenerationModelSelection: { provider: "omnimind" as const },
    };

    expect(validateServerSettingsPatch(DEFAULT_SERVER_SETTINGS, patch)).toContain(
      "requires an explicit model",
    );
    expect(
      applyServerSettingsPatch(DEFAULT_SERVER_SETTINGS, patch).textGenerationModelSelection,
    ).toEqual(DEFAULT_SERVER_SETTINGS.textGenerationModelSelection);
  });

  it("preserves an explicit runtime-catalog model selection exactly", () => {
    const patch = {
      textGenerationModelSelection: {
        provider: "omnimind" as const,
        model: "deepseek/deepseek-v4-pro",
        options: { thinkingLevel: "high" },
      },
    };

    expect(validateServerSettingsPatch(DEFAULT_SERVER_SETTINGS, patch)).toBeNull();
    expect(
      applyServerSettingsPatch(DEFAULT_SERVER_SETTINGS, patch).textGenerationModelSelection,
    ).toEqual(patch.textGenerationModelSelection);
  });
});

describe("providerStartOptionsFromServerSettings", () => {
  it("omits blank launch settings from provider session input", () => {
    const settings = {
      ...DEFAULT_SERVER_SETTINGS,
      providers: {
        omnimind: {
          ...DEFAULT_SERVER_SETTINGS.providers.omnimind,
        },
        codex: {
          ...DEFAULT_SERVER_SETTINGS.providers.codex,
          binaryPath: "",
          homePath: "",
        },
        claudeAgent: {
          ...DEFAULT_SERVER_SETTINGS.providers.claudeAgent,
          binaryPath: "",
        },
        cursor: {
          ...DEFAULT_SERVER_SETTINGS.providers.cursor,
          binaryPath: "",
          apiEndpoint: "",
        },
        antigravity: {
          ...DEFAULT_SERVER_SETTINGS.providers.antigravity,
          binaryPath: "",
        },
        grok: {
          ...DEFAULT_SERVER_SETTINGS.providers.grok,
          binaryPath: "",
        },
        droid: {
          ...DEFAULT_SERVER_SETTINGS.providers.droid,
          binaryPath: "",
        },
        kilo: {
          ...DEFAULT_SERVER_SETTINGS.providers.kilo,
          binaryPath: "",
          serverUrl: "",
        },
        opencode: {
          ...DEFAULT_SERVER_SETTINGS.providers.opencode,
          binaryPath: "",
          serverUrl: "",
        },
        pi: {
          ...DEFAULT_SERVER_SETTINGS.providers.pi,
          binaryPath: "",
          agentDir: "",
        },
      },
    };

    const providerOptions = providerStartOptionsFromServerSettings(settings);

    expect(() =>
      decodeProviderSessionStartInput({
        threadId: "thread-1",
        provider: "codex",
        providerOptions,
        runtimeMode: "full-access",
      }),
    ).not.toThrow();
    expect(providerOptions.codex).toEqual({});
    expect(providerOptions.claudeAgent).toEqual({});
    expect(providerOptions.cursor).toEqual({});
    expect(providerOptions.antigravity).toEqual({});
    expect(providerOptions.grok).toEqual({});
    expect(providerOptions.droid).toEqual({});
    expect(providerOptions.kilo).toEqual({});
    expect(providerOptions.opencode).toEqual({ experimentalWebSockets: false });
    expect(providerOptions.pi).toEqual({});
  });

  it("preserves configured launch settings", () => {
    const settings = {
      ...DEFAULT_SERVER_SETTINGS,
      providers: {
        ...DEFAULT_SERVER_SETTINGS.providers,
        codex: {
          ...DEFAULT_SERVER_SETTINGS.providers.codex,
          binaryPath: "/custom/bin/codex",
          homePath: "/custom/codex-home",
        },
        opencode: {
          ...DEFAULT_SERVER_SETTINGS.providers.opencode,
          binaryPath: "/custom/bin/opencode",
          serverUrl: "http://127.0.0.1:4096",
          experimentalWebSockets: true,
        },
      },
    };

    const providerOptions = providerStartOptionsFromServerSettings(settings);

    expect(providerOptions.codex).toEqual({
      binaryPath: "/custom/bin/codex",
      homePath: "/custom/codex-home",
    });
    expect(providerOptions.opencode).toEqual({
      binaryPath: "/custom/bin/opencode",
      serverUrl: "http://127.0.0.1:4096",
      experimentalWebSockets: true,
    });
  });
});
