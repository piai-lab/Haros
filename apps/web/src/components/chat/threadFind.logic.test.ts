import { MessageId } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import type { TimelineEntry } from "../../session-logic";
import {
  collectThreadFindDocuments,
  findThreadMatches,
  projectMarkdownVisibleText,
  stepThreadFindIndex,
} from "./threadFind.logic";

const messageId = MessageId.makeUnsafe("assistant-1");
const entries: TimelineEntry[] = [
  {
    id: messageId,
    kind: "message",
    createdAt: "2026-01-01T00:00:00.000Z",
    message: {
      id: messageId,
      role: "assistant",
      text: "Error one. Error two.",
      createdAt: "2026-01-01T00:00:00.000Z",
      streaming: false,
    },
  },
];

describe("thread find projection", () => {
  it("finds every projected occurrence in transcript order", () => {
    expect(findThreadMatches(collectThreadFindDocuments(entries), "ERROR")).toEqual([
      { messageId, startOffset: 0, endOffset: 5, occurrenceIndex: 0 },
      { messageId, startOffset: 11, endOffset: 16, occurrenceIndex: 1 },
    ]);
  });

  it("searches rendered Markdown text without syntax-only URLs or delimiters", () => {
    const projected = projectMarkdownVisibleText(
      "[Visible label](https://hidden.example/ghost) and **bold**. ![hidden alt](image.png)\n\n```ts\nconst answer = 42;\n```",
    );

    expect(projected).toContain("Visible label");
    expect(projected).toContain("bold");
    expect(projected).toContain("const answer = 42;");
    expect(projected).not.toContain("hidden.example");
    expect(projected).not.toContain("hidden alt");
    expect(projected).not.toContain("**");
  });

  it("wraps forward and backward navigation", () => {
    expect(stepThreadFindIndex(2, 1, "next")).toBe(0);
    expect(stepThreadFindIndex(2, 0, "previous")).toBe(1);
    expect(stepThreadFindIndex(0, 0, "next")).toBe(-1);
  });
});
