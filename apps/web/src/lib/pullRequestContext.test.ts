import { describe, expect, it } from "vitest";

import {
  appendPullRequestContextsToPrompt,
  createPullRequestContextDraft,
  extractTrailingPullRequestContexts,
  normalizePullRequestContext,
  pullRequestContextDedupKey,
  type PullRequestContextDraft,
} from "./pullRequestContext";
import { deriveDisplayedUserMessageState } from "./terminalContext";

function card(overrides: Partial<PullRequestContextDraft> = {}): PullRequestContextDraft {
  return {
    id: "pr-card-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    scope: "checks",
    prNumber: 42,
    prUrl: "https://github.com/acme/app/pull/42",
    title: "1 failing check",
    subtitle: "Test",
    text: "Fix the failing checks on PR #42.",
    ...overrides,
  };
}

describe("pullRequestContext", () => {
  it("drops empty titles, empty prompts, and unknown scopes", () => {
    expect(normalizePullRequestContext(card({ title: " " }))).toBeNull();
    expect(normalizePullRequestContext(card({ text: " " }))).toBeNull();
    expect(
      normalizePullRequestContext({
        ...card(),
        scope: "reviews" as PullRequestContextDraft["scope"],
      }),
    ).toBeNull();
  });

  it("dedupes the same PR and scope", () => {
    expect(pullRequestContextDedupKey(card())).toBe(
      pullRequestContextDedupKey(card({ id: "other", title: "2 failing checks" })),
    );
    expect(pullRequestContextDedupKey(card({ scope: "comments" }))).not.toBe(
      pullRequestContextDedupKey(card()),
    );
  });

  it("creates a draft only when the card can send", () => {
    expect(createPullRequestContextDraft(card({ title: " " }))).toBeNull();
    expect(createPullRequestContextDraft(card())?.scope).toBe("checks");
  });

  it("round-trips a trailing prompt block", () => {
    const prompt = appendPullRequestContextsToPrompt("Investigate this", [card()]);
    expect(prompt).toContain("<pull_request_context>");
    expect(extractTrailingPullRequestContexts(prompt)).toEqual({
      promptText: "Investigate this",
      pullRequestContexts: [
        {
          index: 1,
          scope: "checks",
          prNumber: 42,
          prUrl: "https://github.com/acme/app/pull/42",
          title: "1 failing check",
          subtitle: "Test",
          text: "Fix the failing checks on PR #42.",
        },
      ],
    });
  });

  it.each([
    "Please explain this format",
    "[]",
    "{}",
    JSON.stringify([card(), { scope: "future-kind", text: "Keep this visible" }]),
    JSON.stringify([card({ title: " " })]),
    JSON.stringify([card({ text: " " })]),
    JSON.stringify([card({ prNumber: -1 })]),
  ])("preserves unrecognized PR context text instead of hiding it: %s", (body) => {
    const prompt = `Review this literal input\n\n<pull_request_context>\n${body}\n</pull_request_context>`;
    expect(extractTrailingPullRequestContexts(prompt)).toEqual({
      promptText: prompt,
      pullRequestContexts: [],
    });
    const displayed = deriveDisplayedUserMessageState(prompt, { messageId: undefined });
    expect(displayed.visibleText).toBe(prompt);
    expect(displayed.copyText).toBe(prompt);
  });
});
