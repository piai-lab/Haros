import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { buildProviderChildEnvironment } from "./providerChildEnvironment";

describe("buildProviderChildEnvironment", () => {
  it("strips OmniMind control-plane and inherited native capabilities", () => {
    const env = buildProviderChildEnvironment({
      engine: "antigravity",
      baseEnv: {
        PATH: "/usr/bin",
        HOME: "/home/test",
        GEMINI_API_KEY: "engine-key",
        HARNESSOS_AUTH_TOKEN: "control-plane-secret",
        HARNESSOS_BROWSER_HOST_PIPE_PATH: "/tmp/browser.sock",
        HARNESSOS_BROWSER_HOST_CAPABILITY: "private-desktop-capability",
        HARNESSOS_BROWSER_HOST_CAPABILITY_FD: "3",
        NODE_OPTIONS: "--require=/tmp/inject.js",
        NODE_REPL_SANDBOX_ALLOWED_UNIX_SOCKETS: "/tmp/other.sock",
      },
    });

    expect(env).toEqual({
      PATH: "/usr/bin",
      HOME: "/home/test",
      GEMINI_API_KEY: "engine-key",
    });
  });

  it("admits only explicitly granted capability keys", () => {
    const env = buildProviderChildEnvironment({
      engine: "codex",
      baseEnv: {
        HARNESSOS_AUTH_TOKEN: "control-plane-secret",
        HARNESSOS_ALLOWED_CAPABILITY: "allowed",
        NODE_REPL_SANDBOX_ALLOWED_UNIX_SOCKETS: "/tmp/browser.sock",
      },
      inheritedOmniMindKeys: ["HARNESSOS_ALLOWED_CAPABILITY"],
      inheritedNativeCapabilityKeys: ["NODE_REPL_SANDBOX_ALLOWED_UNIX_SOCKETS"],
    });

    expect(env).toEqual({
      HARNESSOS_ALLOWED_CAPABILITY: "allowed",
      NODE_REPL_SANDBOX_ALLOWED_UNIX_SOCKETS: "/tmp/browser.sock",
    });
  });

  it("does not let overlays bypass the capability policy", () => {
    const env = buildProviderChildEnvironment({
      engine: "opencode",
      baseEnv: { PATH: "/usr/bin" },
      overrides: {
        OPENCODE_EXPERIMENTAL_WEBSOCKETS: "true",
        HARNESSOS_AUTH_TOKEN: "overlaid-control-plane-secret",
        NODE_OPTIONS: "--require=/tmp/inject.js",
      },
    });

    expect(env).toEqual({
      PATH: "/usr/bin",
      OPENCODE_EXPERIMENTAL_WEBSOCKETS: "true",
    });
  });

  it.each([
    ["claude", "ANTHROPIC_API_KEY", "GEMINI_API_KEY"],
    ["cursor", "CURSOR_API_KEY", "FACTORY_API_KEY"],
    ["droid", "FACTORY_API_KEY", "XAI_API_KEY"],
    ["antigravity", "GEMINI_API_KEY", "ANTHROPIC_API_KEY"],
    ["grok", "XAI_API_KEY", "GOOGLE_API_KEY"],
  ] as const)(
    "grants %s only its declared engine credential group",
    (engine, grantedKey, unrelatedKey) => {
      const env = buildProviderChildEnvironment({
        engine,
        baseEnv: {
          PATH: "/usr/bin",
          [grantedKey]: "native-engine-secret",
          [unrelatedKey]: "unrelated-engine-secret",
        },
      });

      expect(env[grantedKey]).toBe("native-engine-secret");
      expect(env[unrelatedKey]).toBeUndefined();
    },
  );

  it.each(["claude", "cursor", "droid", "antigravity", "grok"] as const)(
    "does not leak OpenAI credentials into restricted %s children",
    (engine) => {
      const env = buildProviderChildEnvironment({
        engine,
        baseEnv: {
          PATH: "/usr/bin",
          OPENAI_API_KEY: "unrelated-openai-secret",
        },
      });

      expect(env.OPENAI_API_KEY).toBeUndefined();
    },
  );

  it.each(["codex", "kilo", "opencode", "pi"] as const)(
    "preserves upstream credential discovery for multi-engine %s",
    (engine) => {
      const env = buildProviderChildEnvironment({
        engine,
        baseEnv: {
          ANTHROPIC_API_KEY: "anthropic-secret",
          GEMINI_API_KEY: "gemini-secret",
          OPENAI_API_KEY: "openai-secret",
        },
      });

      expect(env.ANTHROPIC_API_KEY).toBe("anthropic-secret");
      expect(env.GEMINI_API_KEY).toBe("gemini-secret");
      expect(env.OPENAI_API_KEY).toBe("openai-secret");
    },
  );

  it("matches declared engine credential grants case-insensitively", () => {
    const env = buildProviderChildEnvironment({
      engine: "claude",
      baseEnv: {
        anthropic_api_key: "native-engine-secret",
        gemini_api_key: "unrelated-engine-secret",
      },
    });

    expect(env.anthropic_api_key).toBe("native-engine-secret");
    expect(env.gemini_api_key).toBeUndefined();
  });

  it("keeps stripped authority absent in descendants", () => {
    const env = buildProviderChildEnvironment({
      engine: "grok",
      baseEnv: {
        XAI_API_KEY: "grok-secret",
        ANTHROPIC_API_KEY: "unrelated-secret",
        HARNESSOS_AUTH_TOKEN: "control-plane-secret",
      },
    });
    const descendantScript =
      "process.stdout.write(JSON.stringify({ xai: process.env.XAI_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY, oa: process.env.HARNESSOS_AUTH_TOKEN }))";
    const parentScript = `const { spawnSync } = require("node:child_process"); const result = spawnSync(process.execPath, ["-e", ${JSON.stringify(descendantScript)}], { env: process.env, encoding: "utf8" }); process.stdout.write(result.stdout); process.stderr.write(result.stderr); process.exit(result.status ?? 1);`;
    const result = spawnSync(process.execPath, ["-e", parentScript], {
      env,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ xai: "grok-secret" });
  });
});
