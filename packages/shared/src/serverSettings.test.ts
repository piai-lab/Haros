import { DEFAULT_SERVER_SETTINGS, EngineSessionStartInput } from "@harnessos/contracts";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  applyServerSettingsPatch,
  normalizeBuiltInGroupOverrides,
  engineStartOptionsFromServerSettings,
  isServerEngineEnabled,
  validateServerSettingsPatch,
} from "./serverSettings";

const decodeEngineSessionStartInput = Schema.decodeUnknownSync(EngineSessionStartInput);

describe("applyServerSettingsPatch", () => {
  it("treats only an explicit false engine setting as disabled", () => {
    expect(isServerEngineEnabled(DEFAULT_SERVER_SETTINGS, "oa")).toBe(true);
    expect(
      isServerEngineEnabled(
        { engines: {} } as Pick<typeof DEFAULT_SERVER_SETTINGS, "engines">,
        "oa",
      ),
    ).toBe(true);
    expect(
      isServerEngineEnabled(
        {
          engines: {
            ...DEFAULT_SERVER_SETTINGS.engines,
            oa: { ...DEFAULT_SERVER_SETTINGS.engines.oa, enabled: false },
          },
        },
        "oa",
      ),
    ).toBe(false);
  });

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
      enableEngineUpdateChecks: false,
    });
    const reset = applyServerSettingsPatch(current, {
      agentTools: { builtInGroupOverrides: {} },
    });
    expect(reset.agentTools.builtInGroupOverrides).toEqual({});
    expect(reset.enableEngineUpdateChecks).toBe(false);
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

  it("refuses a engine-only switch to a runtime-catalog-only engine", () => {
    const patch = {
      textGenerationEngineSelection: { engine: "oa" as const },
    };

    expect(validateServerSettingsPatch(DEFAULT_SERVER_SETTINGS, patch)).toContain(
      "requires an explicit model",
    );
    expect(
      applyServerSettingsPatch(DEFAULT_SERVER_SETTINGS, patch).textGenerationEngineSelection,
    ).toEqual(DEFAULT_SERVER_SETTINGS.textGenerationEngineSelection);
  });

  it("preserves an explicit runtime-catalog model selection exactly", () => {
    const patch = {
      textGenerationEngineSelection: {
        engine: "oa" as const,
        model: "deepseek/deepseek-v4-pro",
        options: { thinkingLevel: "high" },
      },
    };

    expect(validateServerSettingsPatch(DEFAULT_SERVER_SETTINGS, patch)).toBeNull();
    expect(
      applyServerSettingsPatch(DEFAULT_SERVER_SETTINGS, patch).textGenerationEngineSelection,
    ).toEqual(patch.textGenerationEngineSelection);
  });
});

describe("engineStartOptionsFromServerSettings", () => {
  it("omits blank launch settings from engine session input", () => {
    const settings = {
      ...DEFAULT_SERVER_SETTINGS,
      engines: {
        oa: {
          ...DEFAULT_SERVER_SETTINGS.engines.oa,
        },
        codex: {
          ...DEFAULT_SERVER_SETTINGS.engines.codex,
          binaryPath: "",
          homePath: "",
        },
        claude: {
          ...DEFAULT_SERVER_SETTINGS.engines.claude,
          binaryPath: "",
        },
        cursor: {
          ...DEFAULT_SERVER_SETTINGS.engines.cursor,
          binaryPath: "",
          apiEndpoint: "",
        },
        antigravity: {
          ...DEFAULT_SERVER_SETTINGS.engines.antigravity,
          binaryPath: "",
        },
        grok: {
          ...DEFAULT_SERVER_SETTINGS.engines.grok,
          binaryPath: "",
        },
        droid: {
          ...DEFAULT_SERVER_SETTINGS.engines.droid,
          binaryPath: "",
        },
        kilo: {
          ...DEFAULT_SERVER_SETTINGS.engines.kilo,
          binaryPath: "",
          serverUrl: "",
        },
        opencode: {
          ...DEFAULT_SERVER_SETTINGS.engines.opencode,
          binaryPath: "",
          serverUrl: "",
        },
        pi: {
          ...DEFAULT_SERVER_SETTINGS.engines.pi,
          binaryPath: "",
          agentDir: "",
        },
      },
    };

    const engineOptions = engineStartOptionsFromServerSettings(settings);

    expect(() =>
      decodeEngineSessionStartInput({
        threadId: "thread-1",
        engine: "codex",
        engineOptions,
        runtimeMode: "full-access",
      }),
    ).not.toThrow();
    expect(engineOptions.codex).toEqual({});
    expect(engineOptions.claude).toEqual({});
    expect(engineOptions.cursor).toEqual({});
    expect(engineOptions.antigravity).toEqual({});
    expect(engineOptions.grok).toEqual({});
    expect(engineOptions.droid).toEqual({});
    expect(engineOptions.kilo).toEqual({});
    expect(engineOptions.opencode).toEqual({ experimentalWebSockets: false });
    expect(engineOptions.pi).toEqual({});
  });

  it("preserves configured launch settings", () => {
    const settings = {
      ...DEFAULT_SERVER_SETTINGS,
      engines: {
        ...DEFAULT_SERVER_SETTINGS.engines,
        codex: {
          ...DEFAULT_SERVER_SETTINGS.engines.codex,
          binaryPath: "/custom/bin/codex",
          homePath: "/custom/codex-home",
        },
        opencode: {
          ...DEFAULT_SERVER_SETTINGS.engines.opencode,
          binaryPath: "/custom/bin/opencode",
          serverUrl: "http://127.0.0.1:4096",
          experimentalWebSockets: true,
        },
      },
    };

    const engineOptions = engineStartOptionsFromServerSettings(settings);

    expect(engineOptions.codex).toEqual({
      binaryPath: "/custom/bin/codex",
      homePath: "/custom/codex-home",
    });
    expect(engineOptions.opencode).toEqual({
      binaryPath: "/custom/bin/opencode",
      serverUrl: "http://127.0.0.1:4096",
      experimentalWebSockets: true,
    });
  });
});
