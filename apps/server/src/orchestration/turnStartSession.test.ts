import { ThreadId, type OrchestrationSession } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  deriveTurnStartModelSelection,
  deriveTurnStartSession,
  shouldDeferTurnStartBindingProjection,
} from "./turnStartSession.ts";

const THREAD_ID = ThreadId.makeUnsafe("thread-turn-start-session");
const REQUESTED_AT = "2026-07-21T00:00:00.000Z";

function makeSession(status: OrchestrationSession["status"]): OrchestrationSession {
  return {
    threadId: THREAD_ID,
    status,
    providerName: "codex",
    runtimeMode: "approval-required",
    activeTurnId: null,
    lastError: status === "error" ? "runtime exploded" : null,
    updatedAt: "2026-07-20T00:00:00.000Z",
  };
}

function derive(currentSession: OrchestrationSession | null) {
  return deriveTurnStartSession({
    threadId: THREAD_ID,
    currentSession,
    providerName: "pi",
    requestedRuntimeMode: "full-access",
    requestedAt: REQUESTED_AT,
  });
}

describe("deriveTurnStartSession", () => {
  it("defers an established exact binding change until replacement succeeds", () => {
    expect(
      shouldDeferTurnStartBindingProjection({
        currentModelSelection: { provider: "codex", model: "gpt-5-codex" },
        currentRuntimeMode: "approval-required",
        currentInteractionMode: "default",
        currentSession: makeSession("ready"),
        requestedModelSelection: { provider: "pi", model: "openai/gpt-5" },
        requestedRuntimeMode: "full-access",
        requestedInteractionMode: "plan",
        canAdoptRequestedProvider: false,
      }),
    ).toBe(true);
    expect(
      shouldDeferTurnStartBindingProjection({
        currentModelSelection: {
          provider: "codex",
          model: "gpt-5-codex",
          options: { reasoningEffort: "high" },
        },
        currentRuntimeMode: "approval-required",
        currentInteractionMode: "default",
        currentSession: makeSession("ready"),
        requestedModelSelection: {
          provider: "codex",
          model: "gpt-5.1-codex",
          options: { reasoningEffort: "low" },
        },
        requestedRuntimeMode: "approval-required",
        requestedInteractionMode: "default",
        canAdoptRequestedProvider: false,
      }),
    ).toBe(true);
    expect(
      shouldDeferTurnStartBindingProjection({
        currentModelSelection: { provider: "codex", model: "gpt-5-codex" },
        currentRuntimeMode: "approval-required",
        currentInteractionMode: "default",
        currentSession: null,
        requestedModelSelection: { provider: "pi", model: "openai/gpt-5" },
        requestedRuntimeMode: "full-access",
        requestedInteractionMode: "plan",
        canAdoptRequestedProvider: true,
      }),
    ).toBe(false);
  });

  it("defers an established runtime or interaction mode change until start succeeds", () => {
    expect(
      shouldDeferTurnStartBindingProjection({
        currentModelSelection: { provider: "codex", model: "gpt-5-codex" },
        currentRuntimeMode: "full-access",
        currentInteractionMode: "default",
        currentSession: makeSession("ready"),
        requestedModelSelection: { provider: "codex", model: "gpt-5-codex" },
        requestedRuntimeMode: "approval-required",
        requestedInteractionMode: "default",
        canAdoptRequestedProvider: false,
      }),
    ).toBe(true);
    expect(
      shouldDeferTurnStartBindingProjection({
        currentModelSelection: { provider: "codex", model: "gpt-5-codex" },
        currentRuntimeMode: "full-access",
        currentInteractionMode: "default",
        currentSession: makeSession("ready"),
        requestedModelSelection: { provider: "codex", model: "gpt-5-codex" },
        requestedRuntimeMode: "full-access",
        requestedInteractionMode: "plan",
        canAdoptRequestedProvider: false,
      }),
    ).toBe(true);
  });

  it("keeps an established provider when a later turn requests another provider", () => {
    expect(
      deriveTurnStartModelSelection({
        currentModelSelection: { provider: "codex", model: "gpt-5-codex" },
        requestedModelSelection: { provider: "pi", model: "openai/gpt-5" },
        canAdoptRequestedProvider: false,
      }),
    ).toEqual({ provider: "codex", model: "gpt-5-codex" });
  });

  it("allows an empty thread to adopt its first requested provider", () => {
    expect(
      deriveTurnStartModelSelection({
        currentModelSelection: { provider: "codex", model: "gpt-5-codex" },
        requestedModelSelection: { provider: "pi", model: "openai/gpt-5" },
        canAdoptRequestedProvider: true,
      }),
    ).toEqual({ provider: "pi", model: "openai/gpt-5" });
  });

  it("creates a starting session when no session exists", () => {
    expect(derive(null)).toEqual({
      threadId: THREAD_ID,
      status: "starting",
      providerName: "pi",
      runtimeMode: "full-access",
      activeTurnId: null,
      lastError: null,
      updatedAt: REQUESTED_AT,
    });
  });

  it("preserves established provider settings when restarting an idle session", () => {
    expect(derive(makeSession("ready"))).toMatchObject({
      status: "starting",
      providerName: "codex",
      runtimeMode: "approval-required",
      activeTurnId: null,
      lastError: null,
    });
  });

  it.each(["starting", "running"] as const)("does not replace a %s session", (status) => {
    expect(derive(makeSession(status))).toBeNull();
  });

  it("clears terminal error details when a new turn starts", () => {
    expect(derive(makeSession("error"))).toMatchObject({
      status: "starting",
      activeTurnId: null,
      lastError: null,
    });
  });
});
