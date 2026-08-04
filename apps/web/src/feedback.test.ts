import { describe, expect, it, vi } from "vitest";
import {
  buildFeedbackSubmission,
  FeedbackDeliveryUnavailableError,
  FeedbackDeliveryCancelledError,
  FEEDBACK_CATEGORIES,
  formatFeedbackSummary,
  MAX_FEEDBACK_BODY_BYTES,
  MAX_FEEDBACK_DETAILS_LENGTH,
  submitFeedback,
  type FeedbackDiagnostics,
  type FeedbackThreadContext,
} from "./feedback";

const CONTEXT: FeedbackThreadContext = {
  provider: "codex",
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
  appVersion: "0.5.1",
  submittedAt: "2026-07-15T18:00:00.000Z",
  userAgent: "OmniMind test agent",
  platform: "MacIntel",
  language: "en-US",
  viewport: "1440x900",
};

describe("formatFeedbackSummary", () => {
  it("opens in the reporter's voice and lists the diagnostics a maintainer needs", () => {
    const summary = formatFeedbackSummary({
      category: "bug",
      diagnostics: DIAGNOSTICS,
    });

    expect(summary).toBe(
      [
        "I ran into a bug in OmniMind 0.5.1, using codex with gpt-5.6-sol.",
        "",
        "Report type: Bug",
        "App version: 0.5.1",
        "Provider: codex",
        "Model: gpt-5.6-sol",
        "Project kind: project",
        "Environment mode: worktree",
        "Runtime mode: full-access",
        "Interaction mode: default",
        "Session status: running",
        "Latest turn state: error",
        "Thread size: 12 messages, 8 activities",
        "At submission: the thread was in an error state, the agent was waiting for input.",
        "Platform: MacIntel, viewport 1440x900",
        "Language: en-US",
        "User agent: OmniMind test agent",
        "Submitted at: 2026-07-15T18:00:00.000Z",
      ].join("\n"),
    );
  });

  it("falls back to a neutral opening and omits fields the session never set", () => {
    const summary = formatFeedbackSummary({
      category: null,
      diagnostics: {
        ...DIAGNOSTICS,
        projectKind: null,
        environmentMode: null,
        sessionStatus: null,
        latestTurnState: null,
        hasPendingApproval: false,
        hasPendingUserInput: false,
        hasThreadError: false,
      },
    });

    expect(summary).toContain(
      "I have some feedback in OmniMind 0.5.1, using codex with gpt-5.6-sol.",
    );
    expect(summary).toContain("Report type: Unspecified");
    expect(summary).toContain("At submission: nothing pending.");
    expect(summary).not.toContain("Screenshot:");
    expect(summary).not.toContain("Project kind:");
    expect(summary).not.toContain("Session status:");
  });

  it.each(FEEDBACK_CATEGORIES)(
    "routes the $label report with its own opening line",
    ({ value, label, lead }) => {
      const summary = formatFeedbackSummary({ category: value, diagnostics: DIAGNOSTICS });

      expect(summary.startsWith(`${lead} in OmniMind 0.5.1`)).toBe(true);
      expect(summary).toContain(`Report type: ${label}`);
    },
  );

  it("describes feedback sent outside an active chat without inventing provider context", () => {
    const summary = formatFeedbackSummary({
      category: "other",
      diagnostics: {
        ...DIAGNOSTICS,
        provider: null,
        model: null,
        projectKind: null,
        environmentMode: null,
        runtimeMode: null,
        interactionMode: null,
        sessionStatus: null,
        latestTurnState: null,
      },
    });

    expect(summary).toContain("I have some feedback in OmniMind 0.5.1 outside an active chat.");
    expect(summary).not.toContain("Provider:");
    expect(summary).not.toContain("Model:");
  });
});

describe("buildFeedbackSubmission", () => {
  it("adds useful runtime diagnostics without adding project or conversation content", () => {
    const hostileContext = {
      ...CONTEXT,
      projectPath: "/secret/project",
      messages: ["private prompt"],
      credential: "secret-token",
    } as FeedbackThreadContext;
    const submission = buildFeedbackSubmission({
      category: "bug",
      details: "  The composer stopped responding.  ",
      context: hostileContext,
      now: new Date("2026-07-15T18:00:00.000Z"),
      userAgent: "OmniMind test agent",
      platform: "MacIntel",
      language: "en-US",
      viewport: { width: 1_440, height: 900 },
    });

    expect(submission).toMatchObject({
      category: "bug",
      details: "The composer stopped responding.",
      diagnostics: {
        provider: "codex",
        model: "gpt-5.6-sol",
        submittedAt: "2026-07-15T18:00:00.000Z",
        userAgent: "OmniMind test agent",
        platform: "MacIntel",
        language: "en-US",
        viewport: "1440x900",
      },
    });
    expect(submission.summary).toBe(
      formatFeedbackSummary({
        category: "bug",
        diagnostics: submission.diagnostics,
      }),
    );
    expect(submission.summary).not.toContain("The composer stopped responding.");
    expect(submission).not.toHaveProperty("screenshot");
    expect(submission.diagnostics).not.toHaveProperty("projectPath");
    expect(submission.diagnostics).not.toHaveProperty("threadTitle");
    expect(submission.diagnostics).not.toHaveProperty("messages");
    expect(submission.diagnostics).not.toHaveProperty("logs");
    expect(JSON.stringify(submission)).not.toContain("secret");
    expect(JSON.stringify(submission)).not.toContain("private prompt");
  });

  it("rejects oversized details even when called outside the textarea", () => {
    expect(() =>
      buildFeedbackSubmission({
        category: "other",
        details: "x".repeat(MAX_FEEDBACK_DETAILS_LENGTH + 1),
        context: CONTEXT,
        viewport: { width: 1, height: 1 },
      }),
    ).toThrow(RangeError);
  });
});

describe("submitFeedback", () => {
  const submission = {
    category: "bug" as const,
    details: "The composer stopped responding.",
    summary: "I ran into a bug.",
    diagnostics: DIAGNOSTICS,
  };

  it("fails before fetch when no separately approved endpoint exists", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();

    await expect(
      submitFeedback(submission, {
        configuredEndpoint: null,
        isProduction: true,
        fetchImplementation,
      }),
    ).rejects.toBeInstanceOf(FeedbackDeliveryUnavailableError);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("makes one request, does not retry failure, and sends only the explicit submission", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ error: "Delivery unavailable" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
    );

    const hostileSubmission = {
      ...submission,
      summary: "private prompt from caller summary",
      projectPath: "/secret/project",
      messages: ["private prompt"],
      credential: "secret-token",
      diagnostics: {
        ...submission.diagnostics,
        projectPath: "/secret/project",
        messages: ["private prompt"],
        credential: "secret-token",
      },
    } as typeof submission;

    await expect(
      submitFeedback(hostileSubmission, {
        configuredEndpoint: "https://omnimind.wisdomeyes.cn/api/v1/feedback",
        isProduction: true,
        fetchImplementation,
      }),
    ).rejects.toThrow("Delivery unavailable");

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    const call = fetchImplementation.mock.calls[0];
    expect(call).toBeDefined();
    const [url, request] = call!;
    expect(url).toBe("https://omnimind.wisdomeyes.cn/api/v1/feedback");
    expect(request?.method).toBe("POST");
    expect(request?.credentials).toBe("omit");
    expect(request?.referrerPolicy).toBe("no-referrer");
    expect(request?.redirect).toBe("error");
    expect(JSON.parse(String(request?.body))).toEqual({
      category: submission.category,
      details: submission.details,
      summary: formatFeedbackSummary({
        category: submission.category,
        diagnostics: submission.diagnostics,
      }),
      diagnostics: submission.diagnostics,
    });
    const payload = JSON.parse(String(request?.body));
    expect(payload).not.toHaveProperty("projectPath");
    expect(payload).not.toHaveProperty("messages");
    expect(payload.diagnostics).not.toHaveProperty("projectPath");
    expect(payload.diagnostics).not.toHaveProperty("messages");
    expect(payload.diagnostics).not.toHaveProperty("credential");
    expect(String(request?.body)).not.toContain("secret-token");
    expect(String(request?.body)).not.toContain("private prompt");
  });

  it("rejects an unknown runtime category before fetch", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    await expect(
      submitFeedback(
        { ...submission, category: "credential" as never },
        {
          configuredEndpoint: "https://omnimind.wisdomeyes.cn/api/v1/feedback",
          isProduction: true,
          fetchImplementation,
        },
      ),
    ).rejects.toThrow("Feedback category is invalid");
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("rejects an oversized serialized body before fetch", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    await expect(
      submitFeedback(
        {
          ...submission,
          diagnostics: {
            ...submission.diagnostics,
            userAgent: "x".repeat(MAX_FEEDBACK_BODY_BYTES),
          },
        },
        {
          configuredEndpoint: "https://omnimind.wisdomeyes.cn/api/v1/feedback",
          isProduction: true,
          fetchImplementation,
        },
      ),
    ).rejects.toThrow(RangeError);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it.each([
    ["provider", { nested: "secret-token" }],
    ["model", ["private prompt"]],
    ["projectKind", "repository"],
    ["environmentMode", "remote"],
    ["runtimeMode", "root"],
    ["interactionMode", "unsafe"],
    ["sessionStatus", "unknown"],
    ["latestTurnState", "queued"],
    ["messageCount", Number.POSITIVE_INFINITY],
    ["activityCount", -1],
    ["hasPendingApproval", "false"],
    ["hasPendingUserInput", { secret: "credential" }],
    ["hasThreadError", 0],
    ["appVersion", "0.5.1\u0000secret"],
    ["submittedAt", "not-a-date"],
    ["userAgent", { authorization: "Bearer secret" }],
    ["platform", ["secret"]],
    ["language", "en-US\ncredential"],
    ["viewport", "all-screen"],
  ])("rejects hostile runtime diagnostic %s before fetch", async (field, value) => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const hostile = {
      ...submission,
      diagnostics: { ...submission.diagnostics, [field]: value },
    } as typeof submission;

    await expect(
      submitFeedback(hostile, {
        configuredEndpoint: "https://omnimind.wisdomeyes.cn/api/v1/feedback",
        isProduction: true,
        fetchImplementation,
      }),
    ).rejects.toThrow();
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("lets the caller cancel the one in-flight request without retrying", async () => {
    const caller = new AbortController();
    const fetchImplementation = vi.fn<typeof fetch>(async (_url, request) => {
      return await new Promise<Response>((_resolve, reject) => {
        request?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    });

    const pending = submitFeedback(submission, {
      configuredEndpoint: "https://omnimind.wisdomeyes.cn/api/v1/feedback",
      isProduction: true,
      fetchImplementation,
      signal: caller.signal,
    });
    caller.abort();

    await expect(pending).rejects.toBeInstanceOf(FeedbackDeliveryCancelledError);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("rejects redirected responses even if a fetch implementation returns one", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () => {
      const response = new Response(null, { status: 200 });
      Object.defineProperty(response, "redirected", { value: true });
      return response;
    });

    await expect(
      submitFeedback(submission, {
        configuredEndpoint: "https://omnimind.wisdomeyes.cn/api/v1/feedback",
        isProduction: true,
        fetchImplementation,
      }),
    ).rejects.toThrow("refused a redirected response");
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });
});
