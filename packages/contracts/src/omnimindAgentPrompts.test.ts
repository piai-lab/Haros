import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { EDITABLE_TEXT_FILE_MAX_BYTES } from "./editableText";
import {
  OmniMindAgentPromptGetSnapshotInput,
  OmniMindAgentPromptMutationInput,
  OmniMindAgentPromptSnapshot,
} from "./omnimindAgentPrompts";

function emptyPromptResource(kind: "appendSystem" | "system") {
  return {
    kind,
    sourceId: null,
    displayPath: null,
    exists: false,
    version: null,
    contentLoaded: false,
    content: null,
  };
}

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
        appendSystem: emptyPromptResource("appendSystem"),
        system: emptyPromptResource("system"),
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

    expect(() =>
      Schema.decodeUnknownSync(OmniMindAgentPromptMutationInput)({
        action: "create",
        resource: "system",
        content: "😀".repeat(Math.floor(EDITABLE_TEXT_FILE_MAX_BYTES / 4) + 1),
      }),
    ).toThrow();
  });

  it("allows normal whitespace but rejects C0 controls that can over-expand JSON", () => {
    expect(
      Schema.decodeUnknownSync(OmniMindAgentPromptMutationInput)({
        action: "create",
        resource: "system",
        content: "line one\n\tline two\r\n",
      }),
    ).toMatchObject({ content: "line one\n\tline two\r\n" });

    for (const content of ["before\0after", "before\u0001after", "before\u000cafter"]) {
      expect(() =>
        Schema.decodeUnknownSync(OmniMindAgentPromptMutationInput)({
          action: "create",
          resource: "system",
          content,
        }),
      ).toThrow();
    }
  });
});
