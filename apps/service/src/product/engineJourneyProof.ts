import { readdir } from "node:fs/promises";

import type { ProductDispatchReceipt, ProductRuntimeCatalog } from "@omnimind/contracts";

export class EngineJourneyProofError extends Error {
  constructor(
    readonly code: "NATIVE_HOST_PROOF_RUNTIME_UNSUPPORTED" | "ENGINE_ATTEMPT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "EngineJourneyProofError";
  }
}

export interface EngineJourneyJavaScriptRuntime {
  readonly execPath: string;
  readonly versions: {
    readonly node?: string;
    readonly electron?: string;
    readonly bun?: string;
  };
}

/** Native Host proof must use the production Node/Electron runtime, never the outer Bun runner. */
export function nativeHostProofExecutable(
  runtime: EngineJourneyJavaScriptRuntime = process,
): string {
  if (runtime.versions.bun || !runtime.versions.node) {
    throw new EngineJourneyProofError(
      "NATIVE_HOST_PROOF_RUNTIME_UNSUPPORTED",
      "Native Host proof requires a Node or Electron runtime.",
    );
  }
  return runtime.execPath;
}

export type OpenCodeReadinessObservation =
  | {
      readonly state: "available";
      readonly catalog: ProductRuntimeCatalog;
      readonly runtimeVersion: string | null;
    }
  | {
      readonly state: "unavailable";
      readonly catalog: ProductRuntimeCatalog;
      readonly reason:
        | "missing"
        | "version-mismatch"
        | "artifact-mismatch"
        | "process-unavailable"
        | "protocol-mismatch"
        | "initialize-failed"
        | "auth-required"
        | "unknown";
    }
  | {
      readonly state: "failed";
      readonly code: string;
    };

/**
 * Reads the production boundary exactly once and preserves unavailable versus failed truth.
 * The caller may compose the returned catalog without invoking OpenCode a second time.
 */
export async function observeOpenCodeReadinessOnce(
  readCatalog: () => Promise<ProductRuntimeCatalog>,
): Promise<OpenCodeReadinessObservation> {
  try {
    const catalog = await readCatalog();
    const engine = catalog.engines.find((candidate) => candidate.engineId === "opencode");
    if (!engine) return { state: "failed", code: "OPENCODE_CATALOG_ENTRY_MISSING" };
    if (engine.availability.state === "available") {
      return { state: "available", catalog, runtimeVersion: engine.runtimeVersion };
    }
    const allowedReasons = new Set([
      "missing",
      "version-mismatch",
      "artifact-mismatch",
      "process-unavailable",
      "protocol-mismatch",
      "initialize-failed",
      "auth-required",
    ]);
    return {
      state: "unavailable",
      catalog,
      reason: allowedReasons.has(engine.availability.reason)
        ? (engine.availability.reason as Exclude<
            Extract<OpenCodeReadinessObservation, { state: "unavailable" }>["reason"],
            "unknown"
          >)
        : "unknown",
    };
  } catch (cause) {
    const code =
      cause &&
      typeof cause === "object" &&
      "code" in cause &&
      cause.code === "OPENCODE_CATALOG_UNAVAILABLE"
        ? "OPENCODE_CATALOG_UNAVAILABLE"
        : "OPENCODE_CATALOG_OBSERVATION_FAILED";
    return { state: "failed", code };
  }
}

/** The dedicated base persists; cleanup means it contains no private Session leaf. */
export async function openCodeScratchBaseIsEmpty(base: string): Promise<boolean> {
  return (await readdir(base)).length === 0;
}

export class EngineAttemptGuard {
  #count = 0;

  markAttempt(): void {
    if (this.#count !== 0) {
      throw new EngineJourneyProofError(
        "ENGINE_ATTEMPT_LIMIT_EXCEEDED",
        "Engine journey proof permits exactly one Engine attempt and no retry.",
      );
    }
    this.#count = 1;
  }

  get count(): number {
    return this.#count;
  }
}

export interface EngineJourneyOutboxObservation {
  readonly state: "pending" | "sending" | "terminal";
  readonly sendBoundary: "pre-send" | "sent" | "accepted" | "observed";
  readonly attemptCount: number;
  readonly automaticReplayCount: number;
}

export interface EngineJourneySnapshotInput {
  readonly engine: "pi" | "opencode";
  readonly receipt: ProductDispatchReceipt | null;
  readonly assistantEntryCount: number;
  readonly assistantTextPresent: boolean;
  readonly runSettledActivityCount: number;
  readonly assistantBeforeSettlement: boolean;
  readonly outbox: ReadonlyArray<EngineJourneyOutboxObservation>;
  readonly prepareCount: number;
  readonly attemptCount: number;
  readonly engineAttemptGuardCount: number;
  readonly siblingPrepareCount: number;
  readonly siblingAttemptCount: number;
}

export interface EngineJourneyAllowlistedSnapshot {
  readonly engine: "pi" | "opencode";
  readonly receipt: {
    readonly state: ProductDispatchReceipt["state"] | "missing";
    readonly evidenceKind: "accepted-operation" | "observed-delivery" | null;
    readonly outcome: "succeeded" | "failed" | "cancelled" | null;
    readonly operationRefPresent: boolean;
  };
  readonly product: {
    readonly assistantEntryCount: number;
    readonly assistantTextPresent: boolean;
    readonly runSettledActivityCount: number;
    readonly assistantBeforeSettlement: boolean;
  };
  readonly outbox: ReadonlyArray<EngineJourneyOutboxObservation>;
  readonly counters: {
    readonly prepareCount: number;
    readonly attemptCount: number;
    readonly engineAttemptGuardCount: number;
    readonly siblingPrepareCount: number;
    readonly siblingAttemptCount: number;
  };
}

function receiptEvidence(receipt: ProductDispatchReceipt | null) {
  if (!receipt) return null;
  if (receipt.state === "accepted") {
    return { kind: "accepted-operation" as const, operationRef: receipt.operationRef };
  }
  return "evidence" in receipt ? receipt.evidence : null;
}

export function buildEngineJourneyAllowlistedSnapshot(
  input: EngineJourneySnapshotInput,
): EngineJourneyAllowlistedSnapshot {
  const evidence = receiptEvidence(input.receipt);
  return {
    engine: input.engine,
    receipt: {
      state: input.receipt?.state ?? "missing",
      evidenceKind: evidence?.kind ?? null,
      outcome: input.receipt?.state === "settled" ? input.receipt.outcome : null,
      operationRefPresent:
        evidence?.kind === "accepted-operation" && evidence.operationRef.length > 0,
    },
    product: {
      assistantEntryCount: input.assistantEntryCount,
      assistantTextPresent: input.assistantTextPresent,
      runSettledActivityCount: input.runSettledActivityCount,
      assistantBeforeSettlement: input.assistantBeforeSettlement,
    },
    outbox: input.outbox,
    counters: {
      prepareCount: input.prepareCount,
      attemptCount: input.attemptCount,
      engineAttemptGuardCount: input.engineAttemptGuardCount,
      siblingPrepareCount: input.siblingPrepareCount,
      siblingAttemptCount: input.siblingAttemptCount,
    },
  };
}

export async function persistSnapshotThenCleanupThenFinalize<Snapshot, Final>(input: {
  readonly snapshot: Snapshot;
  readonly persistSnapshot: (snapshot: Snapshot) => Promise<void>;
  readonly cleanup: () => Promise<void>;
  readonly finalize: (snapshot: Snapshot, cleanupComplete: boolean) => Final;
  readonly persistFinal: (final: Final) => Promise<void>;
}): Promise<Final> {
  await input.persistSnapshot(input.snapshot);
  let cleanupComplete = false;
  try {
    await input.cleanup();
    cleanupComplete = true;
  } catch {
    // The final allowlisted receipt still records cleanup failure after the snapshot is durable.
  }
  const final = input.finalize(input.snapshot, cleanupComplete);
  await input.persistFinal(final);
  return final;
}
