import {
  ProductRunId,
  type NativeHostRuntimeFact,
} from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import { NativeHostClient } from "./client";
import { makeNativeHostExecutionBoundary } from "./executionBoundary";

const operationRef = "pi-op:session:entry";
const emittedAt = "2026-08-05T00:00:00.000Z";

function fact(
  sequence: number,
  change:
    | { readonly kind: "assistant.delta"; readonly text: string }
    | {
        readonly kind: "settlement";
        readonly outcome: "succeeded";
        readonly message: string;
      },
): NativeHostRuntimeFact {
  return { operationRef, sequence, emittedAt, ...change };
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > 2_000) throw new Error("observation timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("makeNativeHostExecutionBoundary recovery", () => {
  it("drains every settled reconcile page through the terminal fact", async () => {
    const requestedCursors: number[] = [];
    const pages = [
      fact(1, { kind: "assistant.delta", text: "first" }),
      fact(2, { kind: "assistant.delta", text: " second" }),
      fact(3, { kind: "settlement", outcome: "succeeded", message: "Completed." }),
    ];
    const client = {
      facts: async () => {
        throw new Error("force restart reconciliation");
      },
      reconcile: async (_operationRef: string, cursor: number) => {
        requestedCursors.push(cursor);
        return {
          kind: "runtime.reconcile.response" as const,
          operationRef,
          status: "settled" as const,
          highWaterSequence: pages.length,
          facts: pages.filter((item) => item.sequence > cursor).slice(0, 1),
          resnapshotRequired: false,
          snapshot: null,
          resnapshotReason: null,
          resolution: null,
        };
      },
    } as unknown as NativeHostClient;
    const boundary = makeNativeHostExecutionBoundary(client);
    const observations: Array<
      | { readonly kind: "facts"; readonly facts: ReadonlyArray<NativeHostRuntimeFact> }
      | { readonly kind: "snapshot" }
      | { readonly kind: "outcome-unknown" }
    > = [];
    boundary.subscribeFacts?.((_runId, observation) => {
      if (
        observation.kind === "delivery-accepted" ||
        observation.kind === "delivery-rejected"
      ) {
        return;
      }
      observations.push(
        observation.kind === "snapshot" ? { kind: "snapshot" } : observation,
      );
    });
    boundary.resumeFacts?.(ProductRunId.makeUnsafe("run-reconcile-pages"), operationRef);
    await waitUntil(() =>
      observations.some(
        (observation) =>
          observation.kind === "facts" &&
          observation.facts.some((item) => item.kind === "settlement"),
      ),
    );
    expect(requestedCursors).toEqual([0, 1, 2]);
    expect(
      observations.flatMap((observation) =>
        observation.kind === "facts" ? observation.facts.map((item) => item.sequence) : [],
      ),
    ).toEqual([1, 2, 3]);
    expect(observations.some((observation) => observation.kind === "outcome-unknown")).toBe(
      false,
    );
    await boundary.close?.();
  });

  it("marks a restarted accepted operation unknown without executing it again", async () => {
    let executeCount = 0;
    const client = {
      execute: async () => {
        executeCount += 1;
        throw new Error("must not execute");
      },
      facts: async () => ({
        kind: "runtime.facts.response" as const,
        operationRef,
        afterSequence: 0,
        highWaterSequence: 2,
        facts: [],
        resnapshotRequired: true,
        snapshot: null,
        resnapshotReason: "native-outcome-unknown" as const,
      }),
      reconcile: async () => ({
        kind: "runtime.reconcile.response" as const,
        operationRef,
        status: "unknown" as const,
        highWaterSequence: 2,
        facts: [],
        resnapshotRequired: true,
        snapshot: null,
        resnapshotReason: "native-outcome-unknown" as const,
        resolution: null,
      }),
    } as unknown as NativeHostClient;
    const boundary = makeNativeHostExecutionBoundary(client);
    const kinds: string[] = [];
    boundary.subscribeFacts?.((_runId, observation) => kinds.push(observation.kind));
    boundary.resumeFacts?.(ProductRunId.makeUnsafe("run-native-unknown"), operationRef);
    await waitUntil(() => kinds.includes("outcome-unknown"));
    expect(executeCount).toBe(0);
    expect(kinds).toEqual(["outcome-unknown"]);
    await boundary.close?.();
  });

  it("re-delivers the same unacknowledged facts when the first Product apply throws", async () => {
    const terminalFacts = [
      fact(1, { kind: "assistant.delta", text: "durable" }),
      fact(2, { kind: "settlement", outcome: "succeeded", message: "Completed." }),
    ];
    const cursors: number[] = [];
    const client = {
      facts: async (_operationRef: string, cursor: number) => {
        cursors.push(cursor);
        return {
          kind: "runtime.facts.response" as const,
          operationRef,
          afterSequence: cursor,
          highWaterSequence: 2,
          facts: terminalFacts,
          resnapshotRequired: false,
          snapshot: null,
          resnapshotReason: null,
        };
      },
      reconcile: async (_operationRef: string, cursor: number) => {
        cursors.push(cursor);
        return {
          kind: "runtime.reconcile.response" as const,
          operationRef,
          status: "settled" as const,
          highWaterSequence: 2,
          facts: terminalFacts.filter((item) => item.sequence > cursor),
          resnapshotRequired: false,
          snapshot: null,
          resnapshotReason: null,
          resolution: null,
        };
      },
    } as unknown as NativeHostClient;
    const boundary = makeNativeHostExecutionBoundary(client);
    let applyCount = 0;
    let settled = false;
    boundary.subscribeFacts?.((_runId, observation) => {
      if (observation.kind !== "facts") return;
      applyCount += 1;
      if (applyCount === 1) throw new Error("transient Product transaction failure");
      settled = observation.facts.some((item) => item.kind === "settlement");
    });
    boundary.resumeFacts?.(ProductRunId.makeUnsafe("run-redelivery"), operationRef);
    await waitUntil(() => settled);
    expect(cursors).toEqual([0, 0]);
    expect(applyCount).toBe(2);
    await boundary.close?.();
  });

  it("reconciles a pending delivery to accepted and observes only the resolved operation", async () => {
    const pendingRef = "pi-pending:dispatch-late-accepted";
    const resolvedOperationRef = "pi-op:late-session:late-entry";
    let executeCount = 0;
    const factsRefs: string[] = [];
    const client = {
      execute: async () => {
        executeCount += 1;
        throw new Error("pending reconciliation must not execute");
      },
      facts: async (requestedRef: string) => {
        factsRefs.push(requestedRef);
        return {
          kind: "runtime.facts.response" as const,
          operationRef: requestedRef,
          afterSequence: 0,
          highWaterSequence: 0,
          facts: [],
          resnapshotRequired: true,
          snapshot: null,
          resnapshotReason: "native-history-incomplete" as const,
        };
      },
      reconcile: async (requestedRef: string) =>
        requestedRef === pendingRef
          ? {
              kind: "runtime.reconcile.response" as const,
              operationRef: pendingRef,
              status: "unknown" as const,
              highWaterSequence: 0,
              facts: [],
              resnapshotRequired: true,
              snapshot: null,
              resnapshotReason: "native-history-incomplete" as const,
              resolution: {
                kind: "accepted" as const,
                operationRef: resolvedOperationRef,
                lineageRef: "pi-session:late-session",
                acceptance: {
                  sessionId: "late-session",
                  entryId: "late-entry",
                  query: "session-manager-reopen" as const,
                },
                resolvedSelection: {
                  engineId: "pi",
                  modelId: "faux-native/faux-thinker",
                  thinking: "medium",
                  permissionPolicy: "approval-required" as const,
                  enforcement: "unverified" as const,
                  packageGeneration: "package-proof",
                },
              },
            }
          : {
              kind: "runtime.reconcile.response" as const,
              operationRef: resolvedOperationRef,
              status: "unknown" as const,
              highWaterSequence: 0,
              facts: [],
              resnapshotRequired: true,
              snapshot: null,
              resnapshotReason: "native-outcome-unknown" as const,
              resolution: null,
            },
    } as unknown as NativeHostClient;
    const boundary = makeNativeHostExecutionBoundary(client);
    const observations: string[] = [];
    boundary.subscribeFacts?.((_runId, observation) => observations.push(observation.kind));

    boundary.resumeFacts?.(ProductRunId.makeUnsafe("run-late-accepted"), pendingRef);

    await waitUntil(() => observations.includes("outcome-unknown"));
    expect(executeCount).toBe(0);
    expect(observations).toEqual(["delivery-accepted", "outcome-unknown"]);
    expect(factsRefs).toEqual([pendingRef, resolvedOperationRef]);
    await boundary.close?.();
  });

  it("reconciles a pending delivery to a durable rejection without replay", async () => {
    const pendingRef = "pi-pending:dispatch-late-rejected";
    let executeCount = 0;
    const client = {
      execute: async () => {
        executeCount += 1;
        throw new Error("pending reconciliation must not execute");
      },
      facts: async () => ({
        kind: "runtime.facts.response" as const,
        operationRef: pendingRef,
        afterSequence: 0,
        highWaterSequence: 0,
        facts: [],
        resnapshotRequired: true,
        snapshot: null,
        resnapshotReason: "native-history-incomplete" as const,
      }),
      reconcile: async () => ({
        kind: "runtime.reconcile.response" as const,
        operationRef: pendingRef,
        status: "unknown" as const,
        highWaterSequence: 0,
        facts: [],
        resnapshotRequired: true,
        snapshot: null,
        resnapshotReason: "native-history-incomplete" as const,
        resolution: {
          kind: "rejected" as const,
          code: "PI_DISPATCH_NOT_ACCEPTED",
          message: "No durable user entry was found.",
          retryable: false,
        },
      }),
    } as unknown as NativeHostClient;
    const boundary = makeNativeHostExecutionBoundary(client);
    const observations: string[] = [];
    boundary.subscribeFacts?.((_runId, observation) => observations.push(observation.kind));

    boundary.resumeFacts?.(ProductRunId.makeUnsafe("run-late-rejected"), pendingRef);

    await waitUntil(() => observations.includes("delivery-rejected"));
    expect(executeCount).toBe(0);
    expect(observations).toEqual(["delivery-rejected"]);
    await boundary.close?.();
  });

  it("stops an orphaned pending reconciliation without changing delivery truth or replaying", async () => {
    const pendingRef = "pi-pending:dispatch-orphaned";
    let executeCount = 0;
    let reconcileCount = 0;
    const client = {
      execute: async () => {
        executeCount += 1;
        throw new Error("orphan reconciliation must not execute");
      },
      facts: async () => ({
        kind: "runtime.facts.response" as const,
        operationRef: pendingRef,
        afterSequence: 0,
        highWaterSequence: 0,
        facts: [],
        resnapshotRequired: true,
        snapshot: null,
        resnapshotReason: "native-history-incomplete" as const,
      }),
      reconcile: async () => {
        reconcileCount += 1;
        return {
          kind: "runtime.reconcile.response" as const,
          operationRef: pendingRef,
          status: "unknown" as const,
          highWaterSequence: 0,
          facts: [],
          resnapshotRequired: true,
          snapshot: null,
          resnapshotReason: "native-history-incomplete" as const,
          resolution: null,
        };
      },
    } as unknown as NativeHostClient;
    const boundary = makeNativeHostExecutionBoundary(client);
    const observations: string[] = [];
    boundary.subscribeFacts?.((_runId, observation) => observations.push(observation.kind));

    boundary.resumeFacts?.(ProductRunId.makeUnsafe("run-orphaned"), pendingRef);

    await waitUntil(() => reconcileCount === 1);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(executeCount).toBe(0);
    expect(reconcileCount).toBe(1);
    expect(observations).toEqual([]);
    await boundary.close?.();
  });
});
