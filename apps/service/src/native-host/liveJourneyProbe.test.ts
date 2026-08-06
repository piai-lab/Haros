import type { ProductDispatchReceipt, ProductRun } from "@omnimind/contracts";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  ProductControlPlaneError,
  type ProductExecutionBoundary,
} from "../product/ProductControlPlane";
import {
  EngineAttemptGuard,
  persistSnapshotThenCleanupThenFinalize,
} from "../product/engineJourneyProof";
import { makeProductExecutionGateway } from "../product/productExecutionGateway";
import {
  buildPiSingleChatProof,
  piSingleChatProofExecutable,
  piSingleChatProofExitCode,
} from "./liveJourneyProbe";

const receipt = {
  state: "settled",
  evidence: { kind: "accepted-operation", operationRef: "private-operation-ref" },
  outcome: "succeeded",
} as ProductDispatchReceipt;

const validProof = (
  counters = {
    prepareCount: 1,
    attemptCount: 1,
    engineAttemptGuardCount: 1,
    siblingPrepareCount: 0,
    siblingAttemptCount: 0,
  },
) =>
  buildPiSingleChatProof({
    candidate: "fixture-candidate",
    runtimeVersion: "0.81.1",
    packageGenerationMatched: true,
    receipt,
    assistantTexts: ["visible"],
    runSettledActivityCount: 1,
    proofOrder: ["assistant", "settlement"],
    outbox: [
      {
        dispatchId: "dispatch-fixture",
        runId: "run-fixture",
        engineId: "pi",
        state: "terminal",
        sendBoundary: "accepted",
        attemptCount: 1,
        automaticReplayCount: 0,
      },
    ],
    ...counters,
  });

describe("Pi strict single-Chat live journey proof", () => {
  it("requires Node/Electron and rejects a Bun runner", () => {
    expect(
      piSingleChatProofExecutable({ execPath: "/runtime/node", versions: { node: "24.0.0" } }),
    ).toBe("/runtime/node");
    expect(() =>
      piSingleChatProofExecutable({
        execPath: "/runtime/bun",
        versions: { node: "24.0.0", bun: "1.3.14" },
      }),
    ).toThrowError(/Node or Electron runtime/u);
  });

  it("accepts exactly one ordered Chat with a nested operation reference", () => {
    const proof = validProof();
    expect(proof).toMatchObject({
      acceptance: "PASS",
      journey: {
        receipt: {
          state: "settled",
          evidenceKind: "accepted-operation",
          operationRefPresent: true,
        },
        product: {
          assistantEntryCount: 1,
          assistantTextPresent: true,
          assistantBeforeSettlement: true,
        },
        counters: {
          prepareCount: 1,
          attemptCount: 1,
          engineAttemptGuardCount: 1,
          siblingPrepareCount: 0,
          siblingAttemptCount: 0,
        },
      },
    });
    expect(JSON.stringify(proof)).not.toContain("private-operation-ref");
    expect(piSingleChatProofExitCode({ ...proof, cleanupComplete: true })).toBe(0);
  });

  it("binds OpenCode zero invocation to the observed literal gateway route", async () => {
    let piPrepareCount = 0;
    let piAttemptCount = 0;
    let openCodePrepareCount = 0;
    let openCodeAttemptCount = 0;
    const engineAttemptGuard = new EngineAttemptGuard();
    const pi: ProductExecutionBoundary = {
      prepare: () => {
        piPrepareCount += 1;
        return Effect.succeed({
          engineId: "pi",
          resolvedSelection: null,
          close: async () => undefined,
        });
      },
      attempt: () => {
        piAttemptCount += 1;
        engineAttemptGuard.markAttempt();
        return Effect.succeed({
          kind: "rejected",
          code: "fixture-complete",
          message: "The routing observation is complete.",
          retryable: false,
        });
      },
    };
    const openCode: ProductExecutionBoundary = {
      prepare: () => {
        openCodePrepareCount += 1;
        return Effect.fail(
          new ProductControlPlaneError({
            code: "OPENCODE_SIBLING_MUST_NOT_PREPARE",
            message: "OpenCode sibling must not prepare during the Pi proof.",
            retryable: false,
          }),
        );
      },
      attempt: () => {
        openCodeAttemptCount += 1;
        return Effect.fail(
          new ProductControlPlaneError({
            code: "OPENCODE_SIBLING_MUST_NOT_ATTEMPT",
            message: "OpenCode sibling must not attempt during the Pi proof.",
            retryable: false,
          }),
        );
      },
    };
    const gateway = makeProductExecutionGateway({
      native: { engineId: "pi", boundary: pi },
      external: { engineId: "opencode", boundary: openCode },
      composeCatalog: (native) => native,
    });

    await Effect.runPromise(
      gateway.prepare!({
        dispatchId: "dispatch-pi-proof" as never,
        conversationId: "conversation-pi-proof" as never,
        runId: "run-pi-proof" as never,
        requestedSelection: { engineId: "pi" } as never,
        workspace: { access: { kind: "chat" } } as never,
        resources: [],
        text: "proof",
        priorLineageRef: null,
      }),
    );
    await Effect.runPromise(
      gateway.attempt({
        dispatchId: "dispatch-pi-proof" as never,
        run: { requestedSelection: { engineId: "pi" } } as ProductRun,
        text: "proof",
        priorLineageRef: null,
        prepared: null,
        markSent: () => Effect.void,
      }),
    );

    const proof = validProof({
      prepareCount: piPrepareCount,
      attemptCount: piAttemptCount,
      engineAttemptGuardCount: engineAttemptGuard.count,
      siblingPrepareCount: openCodePrepareCount,
      siblingAttemptCount: openCodeAttemptCount,
    });
    expect(proof.acceptance).toBe("PASS");
    expect(proof.journey.counters).toMatchObject({
      prepareCount: 1,
      attemptCount: 1,
      engineAttemptGuardCount: 1,
      siblingPrepareCount: 0,
      siblingAttemptCount: 0,
    });
  });

  it.each([
    [1, 0],
    [0, 1],
  ])("fails when OpenCode sibling counters are prepare=%s attempt=%s", (prepare, attempt) => {
    const proof = validProof({
      prepareCount: 1,
      attemptCount: 1,
      engineAttemptGuardCount: 1,
      siblingPrepareCount: prepare,
      siblingAttemptCount: attempt,
    });
    expect(proof.acceptance).toBe("FAIL");
  });

  it("persists snapshot, disposes runtime, then persists final and fails CLI on rejection", async () => {
    const order: string[] = [];
    const final = await persistSnapshotThenCleanupThenFinalize({
      snapshot: { ...validProof(), acceptance: "FAIL" as const },
      persistSnapshot: async () => {
        order.push("snapshot");
      },
      cleanup: async () => {
        order.push("dispose");
      },
      finalize: (snapshot, cleanupComplete) => ({ ...snapshot, cleanupComplete }),
      persistFinal: async () => {
        order.push("final");
      },
    });
    expect(order).toEqual(["snapshot", "dispose", "final"]);
    expect(piSingleChatProofExitCode(final)).toBe(1);
    expect(piSingleChatProofExitCode({ ...validProof(), cleanupComplete: false })).toBe(1);
  });
});
