// FILE: handoff.test.ts
// Purpose: Verifies bootstrap transcripts stay within the replay char budget.
// Layer: Orchestration mapping tests
// Depends on: handoff.

import { MessageId, type OrchestrationMessage } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  buildChatToAgentForkBootstrapText,
  buildHistoryOnlyForkBootstrapText,
  buildPriorTranscriptBootstrapText,
} from "./handoff.ts";

const message = (
  index: number,
  role: "user" | "assistant",
  text: string,
): OrchestrationMessage => ({
  id: MessageId.makeUnsafe(`message-${index}`),
  role,
  text,
  turnId: null,
  streaming: false,
  source: "native",
  createdAt: "2026-07-08T00:00:00.000Z",
  updatedAt: "2026-07-08T00:00:00.000Z",
});

const thread = (messages: ReadonlyArray<OrchestrationMessage>) => ({
  title: "Budgeted thread",
  branch: null,
  worktreePath: null,
  messages,
});

describe("buildPriorTranscriptBootstrapText", () => {
  it("keeps every message with a plain summary header when under budget", () => {
    const messages = Array.from({ length: 10 }, (_, index) =>
      message(index, index % 2 === 0 ? "user" : "assistant", `marker-${index} short message`),
    );
    const text = buildPriorTranscriptBootstrapText(thread(messages), "message-9");

    expect(text).not.toBeNull();
    expect(text).toContain("Earlier conversation summary:");
    expect(text).not.toContain("omitted to fit the context budget");
    for (let index = 0; index < 9; index += 1) {
      expect(text).toContain(`marker-${index}`);
    }
  });

  it("drops the oldest summaries and notes the omission when over budget", () => {
    const filler = "x".repeat(400);
    const messages = Array.from({ length: 301 }, (_, index) =>
      message(index, index % 2 === 0 ? "user" : "assistant", `marker-${index} ${filler}`),
    );
    const text = buildPriorTranscriptBootstrapText(thread(messages), "message-300");

    expect(text).not.toBeNull();
    expect(text!.length).toBeLessThanOrEqual(32_000);
    expect(text).toContain("omitted to fit the context budget");
    // The most recent messages survive verbatim; the oldest summaries are gone.
    expect(text).toContain("marker-299");
    expect(text).toContain("marker-294");
    expect(text).not.toContain("marker-0 ");
    expect(text).not.toContain("marker-1 ");
    // Kept summaries stay in chronological order.
    expect(text!.indexOf("marker-250")).toBeLessThan(text!.indexOf("marker-290"));
  });

  it("respects a caller budget smaller than the transcript ceiling", () => {
    const filler = "y".repeat(400);
    const messages = Array.from({ length: 60 }, (_, index) =>
      message(index, index % 2 === 0 ? "user" : "assistant", `marker-${index} ${filler}`),
    );
    const text = buildPriorTranscriptBootstrapText(thread(messages), "message-59", 8_000);

    expect(text).not.toBeNull();
    expect(text!.length).toBeLessThanOrEqual(8_000);
    expect(text).toContain("marker-58");
  });

  it("never lets the omission header push the newest message past the budget", () => {
    // Adversarial tight budget: without reserving room for the "Earlier
    // conversation summary (...) omitted..." header before selecting
    // summary lines, the budget accountant lets summary lines fill the
    // entire remaining allowance, then tacks the header on top -- pushing
    // the assembled text past maxChars. The final truncateText clips from
    // the end, which is the recent-messages section, so the newest message
    // (the one newest-first retention exists to protect) gets clipped
    // instead of an older summary line.
    const earlierMessages = Array.from({ length: 5 }, (_, index) =>
      message(index, index % 2 === 0 ? "user" : "assistant", `EARLY-${index} ${"e".repeat(60)}`),
    );
    const recentPlainMessages = Array.from({ length: 5 }, (_, index) =>
      message(5 + index, index % 2 === 0 ? "user" : "assistant", `plain-recent-${index}`),
    );
    const newestMessage = message(
      10,
      "assistant",
      `NEWEST-START ${"r".repeat(10)} NEWEST-END-UNIQUE-MARKER`,
    );
    const currentMessage = message(11, "user", "current turn");
    const messages = [...earlierMessages, ...recentPlainMessages, newestMessage, currentMessage];

    const text = buildPriorTranscriptBootstrapText(thread(messages), "message-11", 600);

    expect(text).not.toBeNull();
    expect(text!.length).toBeLessThanOrEqual(600);
    // The newest message must survive intact, including its trailing marker
    // -- if the header overflow clips the tail, this substring is the first
    // casualty.
    expect(text).toContain("NEWEST-START");
    expect(text).toContain("NEWEST-END-UNIQUE-MARKER");
    expect(text).toContain("omitted to fit the context budget");
  });

  it("reserves header budget correctly when the omitted count reaches three digits", () => {
    const filler = "z".repeat(40);
    const earlierMessages = Array.from({ length: 150 }, (_, index) =>
      message(index, index % 2 === 0 ? "user" : "assistant", `EARLY-${index} ${filler}`),
    );
    const recentPlainMessages = Array.from({ length: 5 }, (_, index) =>
      message(150 + index, index % 2 === 0 ? "user" : "assistant", `plain-recent-${index}`),
    );
    const newestMessage = message(
      155,
      "assistant",
      `NEWEST-START ${"r".repeat(10)} NEWEST-END-UNIQUE-MARKER`,
    );
    const currentMessage = message(156, "user", "current turn");
    const messages = [...earlierMessages, ...recentPlainMessages, newestMessage, currentMessage];

    const text = buildPriorTranscriptBootstrapText(thread(messages), "message-156", 1_600);

    expect(text).not.toBeNull();
    expect(text!.length).toBeLessThanOrEqual(1_600);
    expect(text).toMatch(/\(\d{3,} older messages omitted to fit the context budget\):/);
    expect(text).toContain("NEWEST-START");
    expect(text).toContain("NEWEST-END-UNIQUE-MARKER");
  });
});

describe("buildHistoryOnlyForkBootstrapText", () => {
  const scopedThread = (messages: ReadonlyArray<OrchestrationMessage>) => ({
    ...thread(messages),
    forkScope: {
      kind: "history-only" as const,
      sourceMessageId: MessageId.makeUnsafe("message-cutoff"),
      sourceMessageUpdatedAt: "2026-07-08T00:00:00.000Z",
      bootstrapStatus: "pending" as const,
    },
  });

  it("preserves every imported message byte without summarizing or truncating", () => {
    const messages = Array.from({ length: 9 }, (_, index) => ({
      ...message(
        index,
        index % 2 === 0 ? "user" : "assistant",
        `MARKER-${index}  leading and trailing bytes  \nsecond line`,
      ),
      source: "fork-import" as const,
    }));
    const text = buildHistoryOnlyForkBootstrapText(scopedThread(messages), 32_000);

    expect(text).not.toBeNull();
    for (const sourceMessage of messages) {
      expect(text).toContain(sourceMessage.text);
    }
    expect(text).not.toContain("omitted to fit the context budget");
    expect(text).not.toContain("...");
  });

  it("fails closed when the exact prefix cannot fit", () => {
    const messages = [
      {
        ...message(0, "assistant", `EXACT-PREFIX-${"x".repeat(1_000)}`),
        source: "fork-import" as const,
      },
    ];
    expect(buildHistoryOnlyForkBootstrapText(scopedThread(messages), 200)).toBeNull();
  });
});

describe("buildChatToAgentForkBootstrapText", () => {
  const scopedThread = (messages: ReadonlyArray<OrchestrationMessage>) => ({
    ...thread(messages),
    forkScope: {
      kind: "chat-to-agent" as const,
      bootstrapStatus: "pending" as const,
    },
  });

  it("keeps the newest visible history while bounding a long Chat transcript", () => {
    const messages = Array.from({ length: 300 }, (_, index) => ({
      ...message(
        index,
        index % 2 === 0 ? "user" : "assistant",
        `CHAT-MARKER-${index} ${"x".repeat(400)}`,
      ),
      source: "fork-import" as const,
    }));

    const text = buildChatToAgentForkBootstrapText(scopedThread(messages), 8_000);

    expect(text).not.toBeNull();
    expect(text!.length).toBeLessThanOrEqual(8_000);
    expect(text).toContain("CHAT-MARKER-299");
    expect(text).toContain("omitted to fit the context budget");
    expect(text).not.toContain("CHAT-MARKER-0 ");
  });

  it("omits history when the latest normal turn leaves no bootstrap budget", () => {
    const messages = [
      {
        ...message(0, "user", "Visible Chat context"),
        source: "fork-import" as const,
      },
    ];

    expect(buildChatToAgentForkBootstrapText(scopedThread(messages), 0)).toBeNull();
  });
});
