import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { EDITABLE_TEXT_FILE_MAX_BYTES } from "./editableText";
import {
  OmniMindAgentPromptGetSnapshotInput,
  OmniMindAgentPromptMutationInput,
  OmniMindAgentPromptSnapshot,
} from "./omnimindAgentPrompts";

describe("OmniMind Agent prompt contracts", () => {
  it("accepts typed resource intents without accepting paths", () => {
    expect(
      Schema.decodeUnknownSync(OmniMindAgentPromptMutationInput)({
        action: "update",
        resource: "globalContext",
        sourceId: "AGENTS.md",
        expectedVersion: "a".repeat(64),
        content: "Be concise.",
      }),
    ).toEqual({
      action: "update",
      resource: "globalContext",
      sourceId: "AGENTS.md",
      expectedVersion: "a".repeat(64),
      content: "Be concise.",
    });
    expect(() =>
      Schema.decodeUnknownSync(OmniMindAgentPromptMutationInput)({
        action: "update",
        resource: "globalContext",
        sourceId: "/tmp/AGENTS.md",
        expectedVersion: "a".repeat(64),
        content: "forged",
      }),
    ).toThrow();
  });

  it("keeps snapshots lazy and bounded to one requested resource", () => {
    expect(Schema.decodeUnknownSync(OmniMindAgentPromptGetSnapshotInput)({})).toEqual({});
    const candidates = [
      "AGENTS.override.md",
      "AGENTS.md",
      "AGENTS.MD",
      "CLAUDE.md",
      "CLAUDE.MD",
    ].map((sourceId, index) => ({
      sourceId,
      displayPath: `~/.omnimind/agent/${sourceId}`,
      exists: index === 1,
      active: index === 1,
    }));
    const empty = (kind: "appendSystem" | "system") => ({
      kind,
      sourceId: null,
      displayPath: null,
      exists: false,
      version: null,
      contentLoaded: false,
      content: null,
    });
    expect(
      Schema.decodeUnknownSync(OmniMindAgentPromptSnapshot)({
        globalContextCandidates: candidates,
        globalContext: {
          kind: "globalContext",
          sourceId: "AGENTS.md",
          displayPath: "~/.omnimind/agent/AGENTS.md",
          exists: true,
          version: "b".repeat(64),
          contentLoaded: true,
          content: "hello",
        },
        appendSystem: empty("appendSystem"),
        system: empty("system"),
        maxBytes: EDITABLE_TEXT_FILE_MAX_BYTES,
      }).globalContext.content,
    ).toBe("hello");
  });

  it("rejects oversized character payloads before transport", () => {
    expect(() =>
      Schema.decodeUnknownSync(OmniMindAgentPromptMutationInput)({
        action: "create",
        resource: "system",
        content: "x".repeat(EDITABLE_TEXT_FILE_MAX_BYTES + 1),
      }),
    ).toThrow();
  });
});
