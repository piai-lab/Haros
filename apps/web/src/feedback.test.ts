import { describe, expect, it } from "vitest";
import {
  buildFeedbackIssueUrl,
  buildFeedbackSubmission,
  FEEDBACK_CATEGORIES,
  formatFeedbackSummary,
  MAX_FEEDBACK_DETAILS_LENGTH,
  type FeedbackDiagnostics,
  type FeedbackThreadContext,
} from "./feedback";

const CONTEXT: FeedbackThreadContext = {
  engine: "codex",
  model: "gpt-5.6-sol",
  projectKind: "project",
  environmentMode: "worktree",
  runtimeMode: "full-access",
  interactionMode: "default",
  sessionStatus: "running",
  latestTurnState: "error",
  messageCount: 12,
  activityCount: 8,
  hasPendingApproval: false,
  hasPendingUserInput: true,
  hasThreadError: true,
};

const DIAGNOSTICS: FeedbackDiagnostics = {
  ...CONTEXT,
  appVersion: "0.1.0-alpha.0",
  submittedAt: "2026-07-15T18:00:00.000Z",
  userAgent: "Haros test agent",
  platform: "MacIntel",
  language: "en-US",
  viewport: "1440x900",
};

describe("formatFeedbackSummary", () => {
  it("lists only typed runtime diagnostics", () => {
    const summary = formatFeedbackSummary({ category: "bug", diagnostics: DIAGNOSTICS });
    expect(summary).toContain("I ran into a bug in Haros 0.1.0-alpha.0");
    expect(summary).toContain("Engine: codex");
    expect(summary).toContain("At submission: the thread was in an error state");
  });

  it.each(FEEDBACK_CATEGORIES)("renders the $label category", ({ value, label, lead }) => {
    const summary = formatFeedbackSummary({ category: value, diagnostics: DIAGNOSTICS });
    expect(summary.startsWith(`${lead} in Haros`)).toBe(true);
    expect(summary).toContain(`Report type: ${label}`);
  });
});

describe("GitHub feedback draft", () => {
  it("keeps prompt, code, paths, credentials, and messages out of the issue URL", () => {
    const hostileContext = {
      ...CONTEXT,
      projectPath: "/secret/project",
      messages: ["private prompt"],
      credential: "secret-token",
    } as FeedbackThreadContext;
    const submission = buildFeedbackSubmission({
      category: "bug",
      details: "The composer stopped responding.",
      context: hostileContext,
      now: new Date("2026-07-15T18:00:00.000Z"),
      userAgent: "Haros test agent",
      platform: "MacIntel",
      language: "en-US",
      viewport: { width: 1_440, height: 900 },
    });
    const issue = new URL(buildFeedbackIssueUrl(submission));

    expect(issue.origin + issue.pathname).toBe("https://github.com/piai-lab/Haros/issues/new");
    expect(issue.searchParams.get("title")).toBe("[Bug] The composer stopped responding.");
    expect(issue.searchParams.get("labels")).toBe("bug,needs-triage");
    expect(issue.searchParams.get("body")).toContain("Haros diagnostics");
    expect(issue.href).not.toContain("secret-token");
    expect(issue.href).not.toContain("private%20prompt");
    expect(issue.href).not.toContain("%2Fsecret%2Fproject");
  });

  it("rejects oversized details", () => {
    expect(() =>
      buildFeedbackSubmission({
        category: "other",
        details: "x".repeat(MAX_FEEDBACK_DETAILS_LENGTH + 1),
        context: CONTEXT,
        viewport: { width: 1, height: 1 },
      }),
    ).toThrow(RangeError);
  });

  it("rejects hostile runtime diagnostics before building a URL", () => {
    expect(() =>
      buildFeedbackIssueUrl({
        category: "bug",
        details: "Broken",
        summary: "ignored caller summary",
        diagnostics: { ...DIAGNOSTICS, messageCount: Number.POSITIVE_INFINITY },
      }),
    ).toThrow();
  });
});
