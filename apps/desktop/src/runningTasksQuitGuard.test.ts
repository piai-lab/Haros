import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  makeRunningTasksQuitGuard,
  parseQuitConfirmationResponse,
  shouldPromptForRunningTasksBeforeQuit,
} from "./runningTasksQuitGuard";

describe("running tasks quit guard", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("only guards ordinary user quit paths", () => {
    expect(shouldPromptForRunningTasksBeforeQuit("window-close")).toBe(true);
    expect(shouldPromptForRunningTasksBeforeQuit("before-quit")).toBe(true);
    for (const reason of ["SIGTERM", "renderer-crashed", "updater", "fatal-startup"]) {
      expect(shouldPromptForRunningTasksBeforeQuit(reason)).toBe(false);
    }
  });

  it("fails open when the renderer is unavailable or misses the ready deadline", async () => {
    const unavailable = makeRunningTasksQuitGuard(() => "request-unavailable");
    await expect(
      unavailable.askRenderer({ send: vi.fn(), isRendererAvailable: () => false }),
    ).resolves.toEqual({ allow: true });

    const timedOut = makeRunningTasksQuitGuard(() => "request-timeout");
    const result = timedOut.askRenderer({
      send: vi.fn(),
      isRendererAvailable: () => true,
      readyTimeoutMs: 3_000,
    });
    await vi.advanceTimersByTimeAsync(2_999);
    let settled = false;
    void result.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual({ allow: true });
  });

  it("coalesces duplicate quit requests and cancels without a resume intent", async () => {
    const guard = makeRunningTasksQuitGuard(() => "request-1");
    const send = vi.fn();
    const first = guard.askRenderer({ send, isRendererAvailable: () => true });
    const second = guard.askRenderer({ send, isRendererAvailable: () => true });
    expect(first).toBe(second);
    expect(send).toHaveBeenCalledOnce();

    guard.receiveResponse({
      requestId: "request-1",
      phase: "ready",
      runningCount: 2,
      threads: [
        { id: "thread-a", title: "A" },
        { id: "thread-b", title: "B" },
      ],
    });
    guard.receiveResponse({
      requestId: "request-1",
      phase: "decision",
      allow: false,
      resume: true,
      continuationPrompt: "continue",
    });
    await expect(first).resolves.toEqual({ allow: false });
    expect(guard.hasAllowedQuit()).toBe(false);
  });

  it("uses only the ready snapshot when confirmed and never trusts supplied thread ids", async () => {
    const guard = makeRunningTasksQuitGuard(() => "request-2");
    const result = guard.askRenderer({ send: vi.fn(), isRendererAvailable: () => true });
    guard.receiveResponse({
      requestId: "request-2",
      phase: "ready",
      runningCount: 1,
      threads: [{ id: "thread-a", title: "A" }],
    });
    guard.receiveResponse({
      requestId: "request-2",
      phase: "decision",
      allow: true,
      resume: true,
      continuationPrompt: "continue exactly",
    });
    await expect(result).resolves.toEqual({
      allow: true,
      resumeIntent: { threadIds: ["thread-a"], continuationPrompt: "continue exactly" },
    });
    expect(guard.hasAllowedQuit()).toBe(true);
  });

  it("allows immediately when renderer reports no eligible tasks", async () => {
    const guard = makeRunningTasksQuitGuard(() => "request-3");
    const result = guard.askRenderer({ send: vi.fn(), isRendererAvailable: () => true });
    guard.receiveResponse({
      requestId: "request-3",
      phase: "ready",
      runningCount: 0,
      threads: [],
    });
    await expect(result).resolves.toEqual({ allow: true });
  });

  it("fails open if the renderer reloads after reporting running tasks", async () => {
    const guard = makeRunningTasksQuitGuard(() => "request-reload");
    const result = guard.askRenderer({ send: vi.fn(), isRendererAvailable: () => true });
    guard.receiveResponse({
      requestId: "request-reload",
      phase: "ready",
      runningCount: 1,
      threads: [{ id: "thread-a", title: "A" }],
    });
    guard.failOpenPending();
    await expect(result).resolves.toEqual({ allow: true });
  });

  it("ignores ordinary renderer loads when no quit is pending", () => {
    const guard = makeRunningTasksQuitGuard(() => "request-idle-load");
    guard.failOpenPending();
    expect(guard.hasAllowedQuit()).toBe(false);
  });

  it("rejects malformed or overlong renderer messages", () => {
    expect(parseQuitConfirmationResponse({ phase: "ready" })).toBeNull();
    expect(
      parseQuitConfirmationResponse({
        requestId: "x",
        phase: "decision",
        allow: true,
        resume: true,
        continuationPrompt: "x".repeat(2_001),
      }),
    ).toBeNull();
  });
});
