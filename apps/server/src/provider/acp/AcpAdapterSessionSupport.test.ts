import {
  ThreadId,
  TurnId,
  type CanonicalUserInputSettlement,
  type ProviderSession,
} from "@harnessos/contracts";
import { Deferred, Effect } from "effect";
import { describe, expect, it } from "vitest";
import { userInputPresenterRegistry } from "../userInputPresenterRegistry.ts";

import {
  clearAcpActiveTurn,
  finalizeAcpActiveTurnCost,
  acpUserInputAnswers,
  recordAcpSessionCost,
  resolveAcpSessionCwd,
  resolveRequestedAcpSessionModeId,
  resolveAcpTurnInteractionMode,
  scopeAcpRuntimeItemIdForTurn,
  scopeAcpToolCallStateForTurn,
  settleAcpPendingUserInputs,
  watchAcpUserInputPresenter,
  withAcpPlanModePrompt,
} from "./AcpAdapterSessionSupport.ts";

describe("ACP adapter session support", () => {
  it("resolves plan, approval, full-access, and fallback ACP modes in policy order", () => {
    const aliases = {
      plan: ["plan", "architect"],
      implement: ["code", "agent", "default", "chat", "implement"],
      approval: ["ask"],
    } as const;
    const modeState = {
      currentModeId: "current",
      availableModes: [
        { id: "architecture", name: "Architect", description: "Plan changes" },
        { id: "ask", name: "Ask" },
        { id: "code", name: "Code" },
      ],
    };

    expect(
      resolveRequestedAcpSessionModeId({
        interactionMode: "plan",
        runtimeMode: "full-access",
        modeState,
        aliases,
      }),
    ).toBe("architecture");
    expect(
      resolveRequestedAcpSessionModeId({
        interactionMode: "debug",
        runtimeMode: "approval-required",
        modeState,
        aliases,
      }),
    ).toBe("ask");
    expect(
      resolveRequestedAcpSessionModeId({
        interactionMode: "debug",
        runtimeMode: "full-access",
        modeState,
        aliases,
      }),
    ).toBe("code");
    expect(
      resolveRequestedAcpSessionModeId({
        interactionMode: "default",
        runtimeMode: "full-access",
        modeState: {
          currentModeId: "current",
          availableModes: [
            { id: "plan", name: "Plan" },
            { id: "custom", name: "Custom" },
          ],
        },
        aliases,
      }),
    ).toBe("custom");
    expect(
      resolveRequestedAcpSessionModeId({
        interactionMode: "default",
        runtimeMode: "full-access",
        modeState: {
          currentModeId: "current",
          availableModes: [{ id: "plan", name: "Plan" }],
        },
        aliases,
      }),
    ).toBe("current");
    expect(
      resolveRequestedAcpSessionModeId({
        interactionMode: "plan",
        runtimeMode: "full-access",
        modeState: undefined,
        aliases,
      }),
    ).toBeUndefined();
  });

  it("does not inherit Plan when the next turn omits its interaction mode", () => {
    const aliases = {
      plan: ["plan"],
      implement: ["code"],
      approval: ["ask"],
    } as const;
    const modeState = {
      currentModeId: "plan",
      availableModes: [
        { id: "plan", name: "Plan" },
        { id: "code", name: "Code" },
      ],
    };

    const interactionMode = resolveAcpTurnInteractionMode(undefined);
    expect(interactionMode).toBe("default");
    expect(
      resolveRequestedAcpSessionModeId({
        interactionMode,
        runtimeMode: "full-access",
        modeState,
        aliases,
      }),
    ).toBe("code");
  });

  it("scopes reused runtime and tool ids while preserving the provider id", () => {
    const turnId = TurnId.makeUnsafe("turn-1");
    expect(scopeAcpRuntimeItemIdForTurn("grok", turnId, "item-1")).toBe("grok:turn-1:item-1");
    expect(
      scopeAcpToolCallStateForTurn("grok", turnId, {
        toolCallId: "call-1",
        status: "completed",
        data: { toolCallId: "call-1" },
      }),
    ).toMatchObject({
      toolCallId: "grok:turn-1:call-1",
      data: { toolCallId: "call-1", providerToolCallId: "call-1" },
    });
  });

  it("clears only the matching active turn and removes it from the session snapshot", () => {
    const turnId = TurnId.makeUnsafe("turn-1");
    const context = {
      activeTurnId: turnId as TurnId | undefined,
      activeTurnHadAssistantContent: true,
      activeAssistantItemsWithContent: new Set(["item-1"]),
      activeTurnFailedToolDetail: "failed" as string | undefined,
      activePromptFiber: { id: "fiber" } as { id: string } | undefined,
      activeInteractionMode: "plan" as "plan" | "default" | undefined,
      session: {
        provider: "grok",
        status: "running",
        runtimeMode: "full-access",
        threadId: ThreadId.makeUnsafe("thread-1"),
        activeTurnId: turnId,
        createdAt: "2026-07-19T00:00:00.000Z",
        updatedAt: "2026-07-19T00:00:00.000Z",
      } satisfies ProviderSession,
    };

    expect(clearAcpActiveTurn(context, TurnId.makeUnsafe("other-turn"))).toBe(false);
    expect(clearAcpActiveTurn(context, turnId)).toBe(true);
    expect(context).toMatchObject({
      activeTurnId: undefined,
      activeTurnHadAssistantContent: false,
      activeTurnFailedToolDetail: undefined,
      activePromptFiber: undefined,
      activeInteractionMode: undefined,
    });
    expect(context.activeAssistantItemsWithContent.size).toBe(0);
    expect(Object.hasOwn(context.session, "activeTurnId")).toBe(false);
  });

  it("records only valid USD cost snapshots", () => {
    const context = { latestSessionCostUsd: undefined as number | undefined };
    recordAcpSessionCost(context, { amount: 1.25, currency: "USD" });
    expect(finalizeAcpActiveTurnCost(context)).toEqual({ cumulativeCostUsd: 1.25 });
    recordAcpSessionCost(context, { amount: 99, currency: "EUR" });
    expect(finalizeAcpActiveTurnCost(context)).toEqual({ cumulativeCostUsd: 1.25 });
  });

  it("wraps only Plan-mode prompts", () => {
    expect(
      withAcpPlanModePrompt({
        text: "  inspect this  ",
        interactionMode: "plan",
        promptPrefix: "PLAN",
      }),
    ).toBe("PLAN\n\nUser request:\ninspect this");
    expect(
      withAcpPlanModePrompt({
        text: "  preserve spacing  ",
        interactionMode: "default",
        promptPrefix: "PLAN",
      }),
    ).toBe("  preserve spacing  ");
  });

  it("resolves explicit, session, and server fallback working directories in order", () => {
    expect(
      resolveAcpSessionCwd({
        inputCwd: "/explicit",
        sessionCwd: "/session",
        serverCwd: "/server",
        homeDir: "/home/test",
      }),
    ).toBe("/explicit");
    expect(
      resolveAcpSessionCwd({
        inputCwd: undefined,
        sessionCwd: "/session",
        serverCwd: "/server",
        homeDir: "/home/test",
      }),
    ).toBe("/session");
    expect(
      resolveAcpSessionCwd({
        inputCwd: undefined,
        serverCwd: "/server",
        homeDir: "/home/test",
      }),
    ).toBe("/server");
  });

  it("keeps canonical ACP answers, cancellation, and Stop settlement distinct", async () => {
    expect(
      acpUserInputAnswers({
        status: "answered",
        answers: { q1: { selectedOptionLabels: ["A"], customText: "Custom  " } },
      }),
    ).toEqual({ q1: '{"selectedOptionLabels":["A"],"customText":"Custom  "}' });
    expect(acpUserInputAnswers({ status: "cancelled" })).toEqual({});

    const deferred = await Effect.runPromise(Deferred.make<CanonicalUserInputSettlement>());
    const pending = { settlement: deferred, suppressDurableTerminal: false };
    await Effect.runPromise(
      settleAcpPendingUserInputs(new Map([["request", pending]]), "aborted", {
        suppressDurableTerminal: true,
      }),
    );
    expect(await Effect.runPromise(Deferred.await(deferred))).toEqual({ status: "aborted" });
    expect(pending.suppressDurableTerminal).toBe(true);
    await Effect.runPromise(settleAcpPendingUserInputs(new Map([["request", pending]]), "stale"));
    expect(await Effect.runPromise(Deferred.await(deferred))).toEqual({ status: "aborted" });
  });

  it("settles unavailable only when the final compatible presenter disappears", async () => {
    const firstLease = userInputPresenterRegistry.acquire("acp-presenter-a", 1);
    const secondLease = userInputPresenterRegistry.acquire("acp-presenter-b", 1);
    const deferred = await Effect.runPromise(Deferred.make<CanonicalUserInputSettlement>());
    const removeWatch = watchAcpUserInputPresenter(deferred);
    firstLease.release();
    expect(await Effect.runPromise(Deferred.isDone(deferred))).toBe(false);
    secondLease.release();
    expect(await Effect.runPromise(Deferred.await(deferred))).toEqual({ status: "unavailable" });
    removeWatch();

    const headless = await Effect.runPromise(Deferred.make<CanonicalUserInputSettlement>());
    const removeHeadlessWatch = watchAcpUserInputPresenter(headless);
    expect(await Effect.runPromise(Deferred.await(headless))).toEqual({ status: "unavailable" });
    removeHeadlessWatch();
  });
});
