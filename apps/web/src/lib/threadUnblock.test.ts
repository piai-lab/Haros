// FILE: threadUnblock.test.ts
// Purpose: Guards the "Unblock thread" recovery flow against reconciliation regressions.
// Layer: Web orchestration helper tests
// Depends on: threadUnblock helpers with a stubbed orchestration API.

import type { OrchestrationListEngineDeliveryBlockersResult } from "@harnessos/contracts";
import { ThreadId } from "@harnessos/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  describeThreadUnblockResult,
  isEngineDeliveryReconciliationConflict,
  ENGINE_DELIVERY_RECONCILIATION_CONFLICT_CODE,
  unblockThreadFromClient,
} from "./threadUnblock";

const threadId = ThreadId.makeUnsafe("thread-blocked");

function blocker(input: {
  readonly eventSequence: number;
  readonly state: "dead" | "uncertain";
}): OrchestrationListEngineDeliveryBlockersResult[number] {
  return {
    consumerName: "engine-command-reactor.v1",
    eventSequence: input.eventSequence,
    eventId: "event-1",
    eventType: "thread.turn-start-requested",
    occurredAt: "2026-07-26T10:00:00.000Z",
    threadId,
    state: input.state,
    attemptCount: 1,
    lastError: "External engine command claim expired without a durable acceptance result;",
    updatedAt: "2026-07-26T10:00:00.000Z",
    lastReconciliationOutcome: null,
    lastReconciledAt: null,
    lastReconciledBy: null,
    lastReconciliationNote: null,
  } as OrchestrationListEngineDeliveryBlockersResult[number];
}

function conflictError() {
  return Object.assign(new Error("Engine delivery no longer matches the requested thread."), {
    code: ENGINE_DELIVERY_RECONCILIATION_CONFLICT_CODE,
  });
}

describe("unblockThreadFromClient", () => {
  it("abandons every blocker oldest-first", async () => {
    const listEngineDeliveryBlockers = vi.fn(async () => [
      blocker({ eventSequence: 42, state: "dead" }),
      blocker({ eventSequence: 17, state: "uncertain" }),
    ]);
    const reconcileEngineDelivery = vi.fn(async (input: { eventSequence: number }) => ({
      eventSequence: input.eventSequence,
      threadId,
      outcome: "abandon" as const,
      state: "succeeded" as const,
      reconciledAt: "2026-07-26T10:01:00.000Z",
    }));

    const result = await unblockThreadFromClient(
      {
        listEngineDeliveryBlockers,
        reconcileEngineDelivery,
      } as never,
      threadId,
    );

    expect(result).toEqual({ kind: "unblocked", reconciledCount: 2 });
    expect(listEngineDeliveryBlockers).toHaveBeenCalledWith({ threadId });
    expect(
      reconcileEngineDelivery.mock.calls.map(
        ([input]) => (input as never as { eventSequence: number }).eventSequence,
      ),
    ).toEqual([17, 42]);
    expect(reconcileEngineDelivery.mock.calls[0]?.[0]).toMatchObject({
      threadId,
      expectedState: "uncertain",
      outcome: "abandon",
    });
    expect(reconcileEngineDelivery.mock.calls[1]?.[0]).toMatchObject({ expectedState: "dead" });
  });

  it("reports an already-clear thread without reconciling anything", async () => {
    const reconcileEngineDelivery = vi.fn();

    const result = await unblockThreadFromClient(
      {
        listEngineDeliveryBlockers: vi.fn(async () => []),
        reconcileEngineDelivery,
      } as never,
      threadId,
    );

    expect(result).toEqual({ kind: "already-clear" });
    expect(reconcileEngineDelivery).not.toHaveBeenCalled();
  });

  it("treats a reconciliation conflict as settled elsewhere", async () => {
    const result = await unblockThreadFromClient(
      {
        listEngineDeliveryBlockers: vi.fn(async () => [
          blocker({ eventSequence: 17, state: "uncertain" }),
        ]),
        reconcileEngineDelivery: vi.fn(async () => {
          throw conflictError();
        }),
      } as never,
      threadId,
    );

    expect(result).toEqual({ kind: "resolved-elsewhere" });
  });

  it("still unblocks when only a later blocker conflicts", async () => {
    let call = 0;
    const result = await unblockThreadFromClient(
      {
        listEngineDeliveryBlockers: vi.fn(async () => [
          blocker({ eventSequence: 17, state: "uncertain" }),
          blocker({ eventSequence: 42, state: "uncertain" }),
        ]),
        reconcileEngineDelivery: vi.fn(async () => {
          call += 1;
          if (call === 2) throw conflictError();
          return {
            eventSequence: 17,
            threadId,
            outcome: "abandon" as const,
            state: "succeeded" as const,
            reconciledAt: "2026-07-26T10:01:00.000Z",
          };
        }),
      } as never,
      threadId,
    );

    expect(result).toEqual({ kind: "unblocked", reconciledCount: 1 });
  });

  it("propagates unexpected reconciliation failures", async () => {
    await expect(
      unblockThreadFromClient(
        {
          listEngineDeliveryBlockers: vi.fn(async () => [
            blocker({ eventSequence: 17, state: "uncertain" }),
          ]),
          reconcileEngineDelivery: vi.fn(async () => {
            throw new Error("Socket closed");
          }),
        } as never,
        threadId,
      ),
    ).rejects.toThrow("Socket closed");
  });
});

describe("isEngineDeliveryReconciliationConflict", () => {
  it("matches only the server conflict code", () => {
    expect(isEngineDeliveryReconciliationConflict(conflictError())).toBe(true);
    expect(isEngineDeliveryReconciliationConflict(new Error("Socket closed"))).toBe(false);
    expect(isEngineDeliveryReconciliationConflict(null)).toBe(false);
    expect(isEngineDeliveryReconciliationConflict({ code: "WS_REQUEST_TIMEOUT" })).toBe(false);
  });
});

describe("describeThreadUnblockResult", () => {
  it("always tells the user to resend the failed message", () => {
    for (const result of [
      { kind: "unblocked", reconciledCount: 1 },
      { kind: "already-clear" },
      { kind: "resolved-elsewhere" },
    ] as const) {
      const notice = describeThreadUnblockResult(result);
      expect(notice.title.length).toBeGreaterThan(0);
      expect(notice.description.toLowerCase()).toContain("resend");
    }
  });
});
