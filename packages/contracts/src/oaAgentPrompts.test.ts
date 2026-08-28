import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { HARNESSOS_AGENT_PROMPT_MAX_BYTES } from "./editableText";
import {
  OAAgentPromptGetSnapshotInput,
  OAAgentPromptMutationInput,
  OAAgentPromptSnapshot,
} from "./oaAgentPrompts";

const defaultPromptInput = (content: string) => ({
  action: "setDefault" as const,
  expectedVersion: "a".repeat(64),
  content,
});

describe("HarnessOS Agent prompt contracts", () => {
  it("accepts product intents without accepting renderer-selected paths", () => {
    expect(
      Schema.decodeUnknownSync(OAAgentPromptMutationInput)({
        action: "updateCustomRules",
        sourceId: "AGENTS.md",
        expectedVersion: "a".repeat(64),
        content: "Be concise.",
      }),
    ).toEqual({
      action: "updateCustomRules",
      sourceId: "AGENTS.md",
      expectedVersion: "a".repeat(64),
      content: "Be concise.",
    });
    expect(() =>
      Schema.decodeUnknownSync(OAAgentPromptMutationInput)({
        action: "updateCustomRules",
        sourceId: "/tmp/AGENTS.md",
        expectedVersion: "a".repeat(64),
        content: "forged",
      }),
    ).toThrow();
    expect(
      Schema.decodeUnknownSync(OAAgentPromptMutationInput)({
        action: "updateCustomRules",
        sourceId: "AGENTS.md",
        expectedVersion: "a".repeat(64),
        content: "forged",
        revealPath: "/tmp/AGENTS.md",
      }),
    ).not.toHaveProperty("revealPath");
  });

  it("projects factory/current defaults and only the active custom-rules source", () => {
    expect(Schema.decodeUnknownSync(OAAgentPromptGetSnapshotInput)({})).toEqual({});
    const snapshot = Schema.decodeUnknownSync(OAAgentPromptSnapshot)({
      defaultPrompt: {
        content: "Customized instructions",
        customized: true,
        version: "a".repeat(64),
      },
      customRules: {
        availability: "available",
        unavailableReason: null,
        sourceId: "AGENTS.md",
        displayPath: "~/.harnessos/agent/AGENTS.md",
        revealPath: "/private/example/.harnessos/agent/AGENTS.md",
        exists: true,
        version: "b".repeat(64),
        content: "Be concise.",
      },
      maxBytes: HARNESSOS_AGENT_PROMPT_MAX_BYTES,
    });
    expect(snapshot.defaultPrompt.customized).toBe(true);
    expect(snapshot.customRules.content).toBe("Be concise.");
  });

  it("rejects contradictory custom-rules availability states", () => {
    expect(() =>
      Schema.decodeUnknownSync(OAAgentPromptSnapshot)({
        defaultPrompt: {
          content: "Factory",
          customized: false,
          version: "a".repeat(64),
        },
        customRules: {
          availability: "available",
          unavailableReason: null,
          sourceId: "AGENTS.md",
          displayPath: "~/.harnessos/agent/AGENTS.md",
          revealPath: "/private/example/.harnessos/agent/AGENTS.md",
          exists: false,
          version: null,
          content: "",
        },
        maxBytes: HARNESSOS_AGENT_PROMPT_MAX_BYTES,
      }),
    ).toThrow();
  });

  it("rejects oversized payloads, disallowed C0 controls, and invalid UTF-16 before transport", () => {
    for (const action of ["setDefault", "createCustomRules"] as const) {
      const base =
        action === "setDefault" ? { action, expectedVersion: "a".repeat(64) } : { action };
      expect(() =>
        Schema.decodeUnknownSync(OAAgentPromptMutationInput)({
          ...base,
          content: "x".repeat(HARNESSOS_AGENT_PROMPT_MAX_BYTES + 1),
        }),
      ).toThrow();
      for (const content of ["before\0after", "before\u0001after", "before\u000cafter"]) {
        expect(() =>
          Schema.decodeUnknownSync(OAAgentPromptMutationInput)({ ...base, content }),
        ).toThrow();
      }
      for (const content of ["before\ud800after", "before\udc00after"]) {
        expect(() =>
          Schema.decodeUnknownSync(OAAgentPromptMutationInput)({ ...base, content }),
        ).toThrow();
      }
    }
  });

  it("allows ordinary prompt whitespace", () => {
    expect(
      Schema.decodeUnknownSync(OAAgentPromptMutationInput)({
        action: "setDefault",
        expectedVersion: "a".repeat(64),
        content: "line one\n\tline two\r\n",
      }),
    ).toMatchObject({ content: "line one\n\tline two\r\n" });
  });

  it("enforces the prompt byte boundary for multibyte content", () => {
    const emoji = "😀";
    const withinLimit = emoji.repeat(HARNESSOS_AGENT_PROMPT_MAX_BYTES / 4);
    const overLimit = `${withinLimit}${emoji}`;
    expect(() =>
      Schema.decodeUnknownSync(OAAgentPromptMutationInput)(defaultPromptInput(withinLimit)),
    ).not.toThrow();
    expect(() =>
      Schema.decodeUnknownSync(OAAgentPromptMutationInput)(defaultPromptInput(overLimit)),
    ).toThrow();
  });
});
