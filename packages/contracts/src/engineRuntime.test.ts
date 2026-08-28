import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import {
  CANONICAL_USER_INPUT_MAX_NODES,
  CANONICAL_USER_INPUT_MAX_UTF8_BYTES,
  CanonicalUserInputRequest,
  EngineRuntimeEvent,
  type EngineRuntimeEventType,
} from "./engineRuntime";
import { canonicalUserInputUtf8Bytes } from "./canonicalUserInputGuard";

const decodeRuntimeEvent = Schema.decodeUnknownSync(EngineRuntimeEvent);

describe("EngineRuntimeEvent", () => {
  it("includes turn.steered in the exported event type", () => {
    const eventType: EngineRuntimeEventType = "turn.steered";
    expect(eventType).toBe("turn.steered");
  });

  it("decodes turn.tasks.updated for task-list rendering", () => {
    const parsed = decodeRuntimeEvent({
      type: "turn.tasks.updated",
      eventId: "event-1",
      engine: "claude",
      sessionId: "runtime-session-1",
      createdAt: "2026-02-28T00:00:00.000Z",
      threadId: "thread-1",
      turnId: "turn-1",
      payload: {
        explanation: "Implement schema updates",
        tasks: [
          { task: "Define event union", status: "completed" },
          { task: "Wire adapter mapping", status: "inProgress" },
        ],
      },
    });

    expect(parsed.type).toBe("turn.tasks.updated");
    if (parsed.type !== "turn.tasks.updated") {
      throw new Error("expected turn.tasks.updated");
    }
    expect(parsed.payload.tasks).toHaveLength(2);
    expect(parsed.payload.tasks[1]?.status).toBe("inProgress");
  });

  it("decodes proposed-plan completion events", () => {
    const parsed = decodeRuntimeEvent({
      type: "turn.proposed.completed",
      eventId: "event-proposed-plan-1",
      engine: "codex",
      createdAt: "2026-02-28T00:00:00.000Z",
      threadId: "thread-1",
      turnId: "turn-1",
      payload: {
        planMarkdown: "# Ship it",
      },
    });

    expect(parsed.type).toBe("turn.proposed.completed");
    if (parsed.type !== "turn.proposed.completed") {
      throw new Error("expected turn.proposed.completed");
    }
    expect(parsed.payload.planMarkdown).toBe("# Ship it");
  });

  it("decodes user-input.requested with structured questions", () => {
    const parsed = decodeRuntimeEvent({
      type: "user-input.requested",
      eventId: "event-2",
      engine: "claude",
      sessionId: "runtime-session-2",
      createdAt: "2026-02-28T00:00:01.000Z",
      threadId: "thread-2",
      requestId: "request-1",
      payload: {
        questions: [
          {
            id: "sandbox_mode",
            header: "Sandbox",
            question: "Which mode should be used?",
            options: [
              {
                label: "workspace-write",
                description: "Allow edits in workspace only",
              },
              {
                label: "danger-full-access",
                description: "Allow unrestricted access",
              },
            ],
          },
        ],
      },
    });

    expect(parsed.type).toBe("user-input.requested");
    if (parsed.type !== "user-input.requested") {
      throw new Error("expected user-input.requested");
    }
    expect(parsed.payload.questions[0]?.id).toBe("sandbox_mode");
    expect("version" in parsed.payload).toBe(false);
    if ("version" in parsed.payload) throw new Error("expected legacy engine payload");
    expect(parsed.payload.questions[0]?.options).toHaveLength(2);
  });

  it("keeps the named legacy request seam strict and bounded", () => {
    const base = {
      type: "user-input.requested",
      eventId: "event-legacy-strict",
      engine: "claude",
      createdAt: "2026-02-28T00:00:01.000Z",
      threadId: "thread-2",
      requestId: "request-legacy-strict",
    } as const;
    expect(() =>
      decodeRuntimeEvent({
        ...base,
        payload: {
          questions: [
            {
              id: "q1",
              header: "Choice",
              question: "Choose",
              options: [{ label: "A" }],
              notes: "unsupported",
            },
          ],
        },
      }),
    ).toThrow();
    expect(() => decodeRuntimeEvent({ ...base, payload: { questions: [] } })).toThrow();
    expect(() =>
      decodeRuntimeEvent({
        ...base,
        payload: {
          questions: [
            { id: "q", header: "One", question: "One?", options: [] },
            { id: "q", header: "Two", question: "Two?", options: [] },
          ],
        },
      }),
    ).toThrow();
  });

  it("decodes user-input.resolved with answer map", () => {
    const parsed = decodeRuntimeEvent({
      type: "user-input.resolved",
      eventId: "event-3",
      engine: "claude",
      sessionId: "runtime-session-2",
      createdAt: "2026-02-28T00:00:02.000Z",
      threadId: "thread-2",
      requestId: "request-1",
      payload: {
        answers: {
          sandbox_mode: "workspace-write",
        },
      },
    });

    expect(parsed.type).toBe("user-input.resolved");
    if (parsed.type !== "user-input.resolved") {
      throw new Error("expected user-input.resolved");
    }
    expect("answers" in parsed.payload && parsed.payload.answers.sandbox_mode).toBe(
      "workspace-write",
    );
  });

  it("rejects legacy message.delta type", () => {
    expect(() =>
      decodeRuntimeEvent({
        type: "message.delta",
        eventId: "event-4",
        engine: "codex",
        sessionId: "runtime-session-3",
        createdAt: "2026-02-28T00:00:03.000Z",
        payload: { delta: "legacy" },
      }),
    ).toThrow();
  });

  it("rejects empty branded canonical ids", () => {
    expect(() =>
      decodeRuntimeEvent({
        type: "runtime.error",
        eventId: "event-5",
        engine: "codex",
        sessionId: "runtime-session-3",
        createdAt: "2026-02-28T00:00:03.000Z",
        threadId: "   ",
        payload: { message: "boom" },
      }),
    ).toThrow();
  });

  it("decodes normalized thread token usage snapshots", () => {
    const parsed = decodeRuntimeEvent({
      type: "thread.token-usage.updated",
      eventId: "event-token-usage-1",
      engine: "claude",
      createdAt: "2026-02-28T00:00:04.000Z",
      threadId: "thread-1",
      payload: {
        usage: {
          usedTokens: 31251,
          usedPercent: 15.6255,
          maxTokens: 200000,
          toolUses: 25,
          durationMs: 43567,
        },
      },
    });

    expect(parsed.type).toBe("thread.token-usage.updated");
    if (parsed.type !== "thread.token-usage.updated") {
      throw new Error("expected thread.token-usage.updated");
    }
    expect(parsed.payload.usage.maxTokens).toBe(200000);
    expect(parsed.payload.usage.usedTokens).toBe(31251);
    expect(parsed.payload.usage.usedPercent).toBe(15.6255);
  });

  it("preserves untrimmed tool output in item lifecycle detail", () => {
    const rawOutput = "  COMMAND   PID  USER\nbun.exe 33263 zachz\ndone\n";
    const parsed = decodeRuntimeEvent({
      type: "item.completed",
      eventId: "event-tool-untrimmed",
      engine: "pi",
      sessionId: "runtime-session-4",
      createdAt: "2026-02-28T00:00:05.000Z",
      threadId: "thread-1",
      turnId: "turn-1",
      payload: {
        itemType: "command_execution",
        status: "completed",
        title: "bash",
        detail: rawOutput,
      },
    });

    expect(parsed.type).toBe("item.completed");
    if (parsed.type !== "item.completed") throw new Error("expected item.completed");
    expect(parsed.payload.detail).toBe(rawOutput);
  });
});

describe("canonical user-input request", () => {
  const decodeRequest = Schema.decodeUnknownSync(CanonicalUserInputRequest);
  const validRequest = () => ({
    version: 1 as const,
    questions: [
      {
        kind: "choice" as const,
        id: "q1",
        prompt: "Choose",
        cardinality: "single" as const,
        options: [{ label: "A" }],
      },
    ],
  });

  it("rejects empty, duplicate, and unknown authored structures", () => {
    expect(() => decodeRequest({ version: 1, questions: [] })).toThrow();
    expect(() =>
      decodeRequest({
        version: 1,
        questions: [{ kind: "choice", id: "q", prompt: "One", cardinality: "single", options: [] }],
      }),
    ).toThrow();
    expect(() =>
      decodeRequest({
        version: 1,
        questions: [
          {
            kind: "choice",
            id: "q",
            prompt: "One",
            cardinality: "single",
            options: [{ label: "A" }],
          },
          { kind: "text", id: "q", prompt: "Two" },
        ],
      }),
    ).toThrow();
    expect(() =>
      decodeRequest({
        version: 1,
        questions: [
          {
            kind: "choice",
            id: "q",
            prompt: "One",
            cardinality: "single",
            options: [{ label: "A" }, { label: "A" }],
          },
        ],
      }),
    ).toThrow();

    expect(() => decodeRequest({ ...validRequest(), review: true })).toThrow();
    expect(() =>
      decodeRequest({
        version: 1,
        questions: [
          {
            ...validRequest().questions[0],
            notes: "unsupported",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      decodeRequest({
        version: 1,
        questions: [
          {
            ...validRequest().questions[0],
            options: [{ label: "A", note: "unsupported" }],
          },
        ],
      }),
    ).toThrow();
  });

  it("enforces exactly 10,000 authored question and option nodes", () => {
    const labels = Array.from({ length: CANONICAL_USER_INPUT_MAX_NODES - 1 }, (_, index) => ({
      label: `option-${index}`,
    }));
    expect(() =>
      decodeRequest({
        version: 1,
        questions: [
          { kind: "choice", id: "q", prompt: "Choose", cardinality: "multiple", options: labels },
        ],
      }),
    ).not.toThrow();
    expect(() =>
      decodeRequest({
        version: 1,
        questions: [
          {
            kind: "choice",
            id: "q",
            prompt: "Choose",
            cardinality: "multiple",
            options: [...labels, { label: "one-too-many" }],
          },
        ],
      }),
    ).toThrow();
  });

  it("enforces the 1 MiB UTF-8 request boundary without truncation", () => {
    const base = {
      version: 1 as const,
      questions: [
        {
          kind: "choice" as const,
          id: "q",
          prompt: "Choose",
          cardinality: "single" as const,
          options: [{ label: "A", preview: "" }],
        },
      ],
    };
    const exactPreview = "x".repeat(
      CANONICAL_USER_INPUT_MAX_UTF8_BYTES - canonicalUserInputUtf8Bytes(base),
    );
    const exact = {
      ...base,
      questions: [
        {
          ...base.questions[0],
          options: [
            {
              label: "A",
              preview: exactPreview,
            },
          ],
        },
      ],
    };
    expect(canonicalUserInputUtf8Bytes(exact)).toBe(CANONICAL_USER_INPUT_MAX_UTF8_BYTES);
    expect(decodeRequest(exact)).toEqual(exact);
    expect(() =>
      decodeRequest({
        ...exact,
        questions: [
          {
            ...exact.questions[0],
            options: [{ label: "A", preview: `${exactPreview}é` }],
          },
        ],
      }),
    ).toThrow();
  });
});

describe("canonical user-input terminal payload", () => {
  it("requires exactly one strict canonical or legacy terminal envelope", () => {
    const base = {
      type: "user-input.resolved",
      eventId: "terminal-1",
      engine: "codex",
      createdAt: "2026-02-28T00:00:03.000Z",
      threadId: "thread-1",
      requestId: "request-1",
    } as const;
    expect(() => decodeRuntimeEvent({ ...base, payload: {} })).toThrow();
    expect(() =>
      decodeRuntimeEvent({
        ...base,
        payload: {
          settlement: { status: "cancelled" },
          answers: {},
        },
      }),
    ).toThrow();
    expect(() =>
      decodeRuntimeEvent({
        ...base,
        payload: { settlement: { status: "cancelled", answers: {} } },
      }),
    ).toThrow();
    expect(
      decodeRuntimeEvent({ ...base, payload: { settlement: { status: "cancelled" } } }).type,
    ).toBe("user-input.resolved");
    expect(decodeRuntimeEvent({ ...base, payload: { answers: {} } }).type).toBe(
      "user-input.resolved",
    );
  });
});
