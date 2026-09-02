import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { HARNESSOS_AGENT_PROMPT_MAX_BYTES } from "./editableText";
import {
  OAAgentPromptGetSnapshotInput,
  OAAgentPromptMutationInput,
  OAAgentPromptSnapshot,
} from "./oaAgentPrompts";

const setInput = (content: string) => ({
  action: "setPersonalStrategy" as const,
  sourceId: "AGENTS.md" as const,
  expectedVersion: "a".repeat(64),
  locale: "en" as const,
  content,
});

describe("OA Agent Personal Strategy contracts", () => {
  it("requires the initialization locale and exposes one persistent owner", () => {
    expect(Schema.decodeUnknownSync(OAAgentPromptGetSnapshotInput)({ locale: "zh-CN" })).toEqual({
      locale: "zh-CN",
    });
    expect(() => Schema.decodeUnknownSync(OAAgentPromptGetSnapshotInput)({})).toThrow();

    const snapshot = Schema.decodeUnknownSync(OAAgentPromptSnapshot)({
      personalStrategy: {
        availability: "available",
        unavailableReason: null,
        sourceId: "AGENTS.md",
        displayPath: "~/.oa/agent/AGENTS.md",
        revealPath: "/private/example/.oa/agent/AGENTS.md",
        version: "b".repeat(64),
        content: "Be concise.",
      },
      maxBytes: HARNESSOS_AGENT_PROMPT_MAX_BYTES,
    });
    expect(snapshot.personalStrategy.content).toBe("Be concise.");
    expect(snapshot).not.toHaveProperty("defaultPrompt");
    expect(snapshot).not.toHaveProperty("customRules");
  });

  it("accepts only managed source ids and strips renderer-selected paths", () => {
    expect(Schema.decodeUnknownSync(OAAgentPromptMutationInput)(setInput("Be direct."))).toEqual(
      setInput("Be direct."),
    );
    expect(() =>
      Schema.decodeUnknownSync(OAAgentPromptMutationInput)({
        ...setInput("forged"),
        sourceId: "/tmp/AGENTS.md",
      }),
    ).toThrow();
    expect(
      Schema.decodeUnknownSync(OAAgentPromptMutationInput)({
        ...setInput("forged"),
        revealPath: "/tmp/AGENTS.md",
      }),
    ).not.toHaveProperty("revealPath");
  });

  it("rejects oversized, invalid-control, and invalid-UTF-16 content", () => {
    for (const content of [
      "x".repeat(HARNESSOS_AGENT_PROMPT_MAX_BYTES + 1),
      "before\0after",
      "before\u0001after",
      "before\ud800after",
      "before\udc00after",
    ]) {
      expect(() =>
        Schema.decodeUnknownSync(OAAgentPromptMutationInput)(setInput(content)),
      ).toThrow();
    }
  });

  it("enforces the UTF-8 byte boundary and permits ordinary whitespace", () => {
    const emoji = "😀";
    const withinLimit = emoji.repeat(HARNESSOS_AGENT_PROMPT_MAX_BYTES / 4);
    expect(() =>
      Schema.decodeUnknownSync(OAAgentPromptMutationInput)(setInput(withinLimit)),
    ).not.toThrow();
    expect(() =>
      Schema.decodeUnknownSync(OAAgentPromptMutationInput)(setInput(`${withinLimit}${emoji}`)),
    ).toThrow();
    expect(
      Schema.decodeUnknownSync(OAAgentPromptMutationInput)(setInput("one\n\ttwo\r\n")),
    ).toMatchObject({
      content: "one\n\ttwo\r\n",
    });
  });
});
