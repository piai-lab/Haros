// FILE: ComposerQueuedHeader.test.ts
// Purpose: Locks the queued composer preview down to compact, inline markdown.
// Layer: Web chat composer tests
// Depends on: ComposerQueuedHeader preview sanitizer

import { describe, expect, it } from "vitest";

import { getWorkbenchCopy } from "../../i18n/workbenchCopy";
import { compactQueuedComposerPreviewMarkdown } from "./ComposerQueuedHeader";

describe("compactQueuedComposerPreviewMarkdown", () => {
  const english = getWorkbenchCopy("en");

  it("keeps inline markdown while dropping block-only heading/list syntax", () => {
    expect(compactQueuedComposerPreviewMarkdown("# **Ship** `src/app.ts`", english)).toBe(
      "**Ship** `src/app.ts`",
    );
    expect(compactQueuedComposerPreviewMarkdown("- [x] Review `src/app.ts`", english)).toBe(
      "Review `src/app.ts`",
    );
  });

  it("uses one representative line for multiline prompts and fenced code", () => {
    expect(compactQueuedComposerPreviewMarkdown("\n\nFirst line\nSecond line", english)).toBe(
      "First line",
    );
    expect(compactQueuedComposerPreviewMarkdown("```ts\nconsole.log('wide')\n```", english)).toBe(
      "Code block",
    );
  });

  it("falls back for empty block prefixes", () => {
    expect(compactQueuedComposerPreviewMarkdown("", english)).toBe("Queued follow-up");
    expect(compactQueuedComposerPreviewMarkdown(">", english)).toBe("Queued follow-up");
  });
  it("uses localized Queue fallbacks", () => {
    const chinese = getWorkbenchCopy("zh-CN");
    expect(compactQueuedComposerPreviewMarkdown("", chinese)).toBe("队列中的后续消息");
    expect(compactQueuedComposerPreviewMarkdown("```ts", chinese)).toBe("代码块");
  });
});
