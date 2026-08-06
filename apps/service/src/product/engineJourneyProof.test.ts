import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ProductDispatchReceipt, ProductRuntimeCatalog } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  EngineJourneyProofError,
  EngineAttemptGuard,
  buildEngineJourneyAllowlistedSnapshot,
  nativeHostProofExecutable,
  observeOpenCodeReadinessOnce,
  openCodeScratchBaseIsEmpty,
  persistSnapshotThenCleanupThenFinalize,
} from "./engineJourneyProof";

const openCodeCatalog = (state: "available" | "unavailable"): ProductRuntimeCatalog =>
  ({
    defaultEngineId: "opencode",
    packageGeneration: null,
    engines: [
      {
        engineId: "opencode",
        runtimeVersion: state === "available" ? "1.14.40" : null,
        availability:
          state === "available"
            ? { state: "available" }
            : { state: "unavailable", reason: "process-unavailable" },
      },
    ],
  }) as unknown as ProductRuntimeCatalog;

describe("engine journey proof harness", () => {
  it("requires the declared Node/Electron Native Host runtime and rejects Bun", () => {
    expect(
      nativeHostProofExecutable({ execPath: "/runtime/node", versions: { node: "22.19.0" } }),
    ).toBe("/runtime/node");
    expect(
      nativeHostProofExecutable({
        execPath: "/runtime/electron",
        versions: { node: "22.19.0", electron: "40.0.0" },
      }),
    ).toBe("/runtime/electron");
    expect(() =>
      nativeHostProofExecutable({
        execPath: "/runtime/bun",
        versions: { node: "24.3.0", bun: "1.3.14" },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<EngineJourneyProofError>>({
        code: "NATIVE_HOST_PROOF_RUNTIME_UNSUPPORTED",
      }),
    );
  });

  it("observes OpenCode catalog exactly once without collapsing unavailable or failure", async () => {
    let calls = 0;
    await expect(
      observeOpenCodeReadinessOnce(async () => {
        calls += 1;
        return openCodeCatalog("available");
      }),
    ).resolves.toMatchObject({ state: "available", runtimeVersion: "1.14.40" });
    expect(calls).toBe(1);

    await expect(
      observeOpenCodeReadinessOnce(async () => openCodeCatalog("unavailable")),
    ).resolves.toMatchObject({ state: "unavailable", reason: "process-unavailable" });
    await expect(
      observeOpenCodeReadinessOnce(async () => {
        throw Object.assign(new Error("private detail"), { code: "OPENCODE_CATALOG_UNAVAILABLE" });
      }),
    ).resolves.toEqual({ state: "failed", code: "OPENCODE_CATALOG_UNAVAILABLE" });
    await expect(
      observeOpenCodeReadinessOnce(async () => {
        throw Object.assign(new Error("private detail"), { code: "private-code" });
      }),
    ).resolves.toEqual({ state: "failed", code: "OPENCODE_CATALOG_OBSERVATION_FAILED" });
  });

  it("checks scratch cleanup by leaf absence without an owner-file convention", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "omnimind-engine-proof-"));
    try {
      expect(await openCodeScratchBaseIsEmpty(root)).toBe(true);
      await mkdir(path.join(root, "00000000-0000-4000-8000-000000000000"));
      expect(await openCodeScratchBaseIsEmpty(root)).toBe(false);
    } finally {
      await rm(root, { recursive: true });
    }
  });

  it("allows one Engine attempt and fails before a retry", () => {
    const guard = new EngineAttemptGuard();
    guard.markAttempt();
    expect(guard.count).toBe(1);
    expect(() => guard.markAttempt()).toThrowError(
      expect.objectContaining<Partial<EngineJourneyProofError>>({
        code: "ENGINE_ATTEMPT_LIMIT_EXCEEDED",
      }),
    );
    expect(guard.count).toBe(1);
  });

  it("projects only allowlisted fields and reads settled Pi reference from evidence", () => {
    const operationRef = "private-operation-reference";
    const receipt = {
      state: "settled",
      evidence: { kind: "accepted-operation", operationRef },
      outcome: "succeeded",
    } as ProductDispatchReceipt;
    const snapshot = buildEngineJourneyAllowlistedSnapshot({
      engine: "pi",
      receipt,
      assistantEntryCount: 1,
      assistantTextPresent: true,
      runSettledActivityCount: 1,
      assistantBeforeSettlement: true,
      outbox: [
        {
          state: "terminal",
          sendBoundary: "accepted",
          attemptCount: 1,
          automaticReplayCount: 0,
        },
      ],
      prepareCount: 1,
      attemptCount: 1,
      engineAttemptGuardCount: 1,
      siblingPrepareCount: 0,
      siblingAttemptCount: 0,
    });
    expect(snapshot.receipt).toEqual({
      state: "settled",
      evidenceKind: "accepted-operation",
      outcome: "succeeded",
      operationRefPresent: true,
    });
    expect(JSON.stringify(snapshot)).not.toContain(operationRef);
  });

  it("persists the snapshot before cleanup and the final receipt afterwards", async () => {
    const order: string[] = [];
    const final = await persistSnapshotThenCleanupThenFinalize({
      snapshot: { receiptState: "settled" },
      persistSnapshot: async () => {
        order.push("snapshot");
      },
      cleanup: async () => {
        order.push("cleanup");
      },
      finalize: (snapshot, cleanupComplete) => ({ ...snapshot, cleanupComplete }),
      persistFinal: async () => {
        order.push("final");
      },
    });
    expect(order).toEqual(["snapshot", "cleanup", "final"]);
    expect(final).toEqual({ receiptState: "settled", cleanupComplete: true });
  });

  it("still persists a cleanup-failed final receipt after the snapshot", async () => {
    const order: string[] = [];
    const final = await persistSnapshotThenCleanupThenFinalize({
      snapshot: { receiptState: "settled" },
      persistSnapshot: async () => {
        order.push("snapshot");
      },
      cleanup: async () => {
        order.push("cleanup");
        throw new Error("private cleanup detail");
      },
      finalize: (_snapshot, cleanupComplete) => ({ cleanupComplete }),
      persistFinal: async () => {
        order.push("final");
      },
    });
    expect(order).toEqual(["snapshot", "cleanup", "final"]);
    expect(final).toEqual({ cleanupComplete: false });
  });
});
