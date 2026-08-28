import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import { EngineSendTurnInput, EngineSessionStartInput } from "./engine";

const decodeEngineSessionStartInput = Schema.decodeUnknownSync(EngineSessionStartInput);
const decodeProviderSendTurnInput = Schema.decodeUnknownSync(EngineSendTurnInput);

describe("EngineSessionStartInput", () => {
  it("accepts codex-compatible payloads", () => {
    const parsed = decodeEngineSessionStartInput({
      threadId: "thread-1",
      engine: "codex",
      cwd: "/tmp/workspace",
      engineSelection: {
        engine: "codex",
        model: "gpt-5.3-codex",
        options: {
          reasoningEffort: "high",
          fastMode: true,
        },
      },
      runtimeMode: "full-access",
      engineOptions: {
        codex: {
          binaryPath: "/usr/local/bin/codex",
          homePath: "/tmp/.codex",
        },
      },
    });
    expect(parsed.runtimeMode).toBe("full-access");
    expect(parsed.engineSelection?.engine).toBe("codex");
    expect(parsed.engineSelection?.model).toBe("gpt-5.3-codex");
    if (parsed.engineSelection?.engine !== "codex") {
      throw new Error("Expected codex engineSelection");
    }
    expect(parsed.engineSelection.options?.reasoningEffort).toBe("high");
    expect(parsed.engineSelection.options?.fastMode).toBe(true);
    expect(parsed.engineOptions?.codex?.binaryPath).toBe("/usr/local/bin/codex");
    expect(parsed.engineOptions?.codex?.homePath).toBe("/tmp/.codex");
  });

  it("accepts the product-derived work surface and project context root", () => {
    const parsed = decodeEngineSessionStartInput({
      threadId: "thread-agent",
      engine: "oa",
      cwd: "/tmp/workspace/packages/app",
      workSurface: "agent",
      projectContextRoot: "/tmp/workspace",
      runtimeMode: "full-access",
    });

    expect(parsed.workSurface).toBe("agent");
    expect(parsed.projectContextRoot).toBe("/tmp/workspace");
  });

  it("rejects payloads without runtime mode", () => {
    expect(() =>
      decodeEngineSessionStartInput({
        threadId: "thread-1",
        engine: "codex",
      }),
    ).toThrow();
  });

  it("accepts claude runtime knobs", () => {
    const parsed = decodeEngineSessionStartInput({
      threadId: "thread-1",
      engine: "claude",
      cwd: "/tmp/workspace",
      engineSelection: {
        engine: "claude",
        model: "claude-sonnet-4-6",
        options: {
          thinking: true,
          effort: "max",
          fastMode: true,
        },
      },
      engineOptions: {
        claude: {
          binaryPath: "/usr/local/bin/claude",
          permissionMode: "plan",
          maxThinkingTokens: 12_000,
        },
      },
      runtimeMode: "full-access",
    });
    expect(parsed.engine).toBe("claude");
    expect(parsed.engineSelection?.engine).toBe("claude");
    expect(parsed.engineSelection?.model).toBe("claude-sonnet-4-6");
    if (parsed.engineSelection?.engine !== "claude") {
      throw new Error("Expected claude engineSelection");
    }
    expect(parsed.engineSelection.options?.thinking).toBe(true);
    expect(parsed.engineSelection.options?.effort).toBe("max");
    expect(parsed.engineSelection.options?.fastMode).toBe(true);
    expect(parsed.engineOptions?.claude?.binaryPath).toBe("/usr/local/bin/claude");
    expect(parsed.engineOptions?.claude?.permissionMode).toBe("plan");
    expect(parsed.engineOptions?.claude?.maxThinkingTokens).toBe(12_000);
    expect(parsed.runtimeMode).toBe("full-access");
  });
});

describe("EngineSendTurnInput", () => {
  it("accepts codex engineSelection", () => {
    const parsed = decodeProviderSendTurnInput({
      threadId: "thread-1",
      engineSelection: {
        engine: "codex",
        model: "gpt-5.3-codex",
        options: {
          reasoningEffort: "xhigh",
          fastMode: true,
        },
      },
    });

    expect(parsed.engineSelection?.engine).toBe("codex");
    expect(parsed.engineSelection?.model).toBe("gpt-5.3-codex");
    if (parsed.engineSelection?.engine !== "codex") {
      throw new Error("Expected codex engineSelection");
    }
    expect(parsed.engineSelection.options?.reasoningEffort).toBe("xhigh");
    expect(parsed.engineSelection.options?.fastMode).toBe(true);
  });

  it("accepts claude engineSelection including ultrathink", () => {
    const parsed = decodeProviderSendTurnInput({
      threadId: "thread-1",
      engineSelection: {
        engine: "claude",
        model: "claude-sonnet-4-6",
        options: {
          effort: "ultrathink",
          fastMode: true,
        },
      },
    });

    expect(parsed.engineSelection?.engine).toBe("claude");
    if (parsed.engineSelection?.engine !== "claude") {
      throw new Error("Expected claude engineSelection");
    }
    expect(parsed.engineSelection.options?.effort).toBe("ultrathink");
    expect(parsed.engineSelection.options?.fastMode).toBe(true);
  });

  it("accepts claude engineSelection including xhigh for Opus 4.7", () => {
    const parsed = decodeProviderSendTurnInput({
      threadId: "thread-1",
      engineSelection: {
        engine: "claude",
        model: "claude-opus-4-7",
        options: {
          effort: "xhigh",
        },
      },
    });

    expect(parsed.engineSelection?.engine).toBe("claude");
    if (parsed.engineSelection?.engine !== "claude") {
      throw new Error("Expected claude engineSelection");
    }
    expect(parsed.engineSelection.options?.effort).toBe("xhigh");
  });
});
