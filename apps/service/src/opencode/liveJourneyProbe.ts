import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductDispatchId,
  ProductEntryId,
  ProductOperationReceiptId,
  ProductQueueItemId,
  ProductRunId,
  ProductWorkspaceId,
} from "@omnimind/contracts";
import { Effect, ManagedRuntime } from "effect";

import {
  ProductControlPlane,
  ProductControlPlaneError,
  makeProductControlPlaneLayer,
  resolveProductDatabasePath,
  type ProductExecutionBoundary,
} from "../product/ProductControlPlane";
import {
  EngineAttemptGuard,
  buildEngineJourneyAllowlistedSnapshot,
  observeOpenCodeReadinessOnce,
  openCodeScratchBaseIsEmpty,
  persistSnapshotThenCleanupThenFinalize,
} from "../product/engineJourneyProof";
import { makeProductExecutionGateway } from "../product/productExecutionGateway";
import { initializeOpenCodeChatScratchBase } from "./chatScratch";
import { OPENCODE_EXECUTABLE, type OpenCodeInstallationEvidence } from "./installation";
import { makeOpenCodeProductExecutionBoundary } from "./productBoundary";

export interface OpenCodeLiveJourneyProbeInput {
  readonly candidate: string;
  readonly probeRoot: string;
  readonly resultFile: string;
  readonly executable?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly inspectInstallation?: () => Promise<OpenCodeInstallationEvidence>;
  readonly timeoutMs?: number;
}

const privateJson = async (filename: string, value: unknown): Promise<void> => {
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  await chmod(filename, 0o600);
};

const inside = (root: string, target: string): boolean => {
  const relative = path.relative(root, target);
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
};

const deadline = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("OpenCode live journey timed out.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export async function runOpenCodeLiveJourneyProbe(input: OpenCodeLiveJourneyProbeInput) {
  const root = path.resolve(input.probeRoot);
  const resultFile = path.resolve(input.resultFile);
  const snapshotFile = `${resultFile}.snapshot`;
  if (!input.candidate.trim() || !inside(root, resultFile) || !inside(root, snapshotFile)) {
    throw new Error("OpenCode live journey requires bounded candidate, root and result paths.");
  }
  await mkdir(root, { recursive: true, mode: 0o700 });
  const stateDir = path.join(root, "opencode-state");
  await mkdir(stateDir, { mode: 0o700 });
  const scratchBase = await initializeOpenCodeChatScratchBase(stateDir);
  const source = makeOpenCodeProductExecutionBoundary({
    executable: input.executable ?? OPENCODE_EXECUTABLE,
    scratchBase,
    ...(input.environment ? { environment: input.environment } : {}),
    ...(input.inspectInstallation ? { inspectInstallation: input.inspectInstallation } : {}),
  });
  let runtime: ManagedRuntime.ManagedRuntime<ProductControlPlane, ProductControlPlaneError> | null =
    null;
  let runtimeDisposed = false;
  let scratchEmpty = false;
  let stateRemoved = false;
  let prepareCount = 0;
  let attemptCount = 0;
  let piPrepareCount = 0;
  let piAttemptCount = 0;
  const guard = new EngineAttemptGuard();
  const order: string[] = [];

  try {
    const readiness = await observeOpenCodeReadinessOnce(async () => {
      const catalog = await Effect.runPromise(source.catalog!());
      if (!catalog) throw new Error("OpenCode catalog was absent.");
      return catalog;
    });
    if (readiness.state !== "available") throw new Error("OpenCode readiness was not available.");
    const external: ProductExecutionBoundary = {
      ...source,
      prepare: (request) => {
        prepareCount += 1;
        return source.prepare!(request);
      },
      attempt: (request) => {
        attemptCount += 1;
        guard.markAttempt();
        return source.attempt(request);
      },
      subscribeFacts: (listener) =>
        source.subscribeFacts!((runId, update) => {
          const projected = update as {
            readonly firstFact?: { readonly kind: string };
            readonly facts?: ReadonlyArray<{ readonly kind: string }>;
          };
          const facts = projected.firstFact ? [projected.firstFact] : (projected.facts ?? []);
          for (const fact of facts) {
            if (fact.kind === "assistant.delta") order.push("assistant");
            if (fact.kind === "settlement") order.push("settlement");
          }
          listener(runId, update);
        }),
    };
    const pi: ProductExecutionBoundary = {
      prepare: () => {
        piPrepareCount += 1;
        return Effect.fail(
          new ProductControlPlaneError({
            code: "PI_SIBLING_MUST_NOT_PREPARE",
            message: "Pi sibling must not prepare during OpenCode proof.",
            retryable: false,
          }),
        );
      },
      attempt: () => {
        piAttemptCount += 1;
        return Effect.fail(
          new ProductControlPlaneError({
            code: "PI_SIBLING_MUST_NOT_ATTEMPT",
            message: "Pi sibling must not attempt during OpenCode proof.",
            retryable: false,
          }),
        );
      },
    };
    const gateway = makeProductExecutionGateway({
      native: { engineId: "pi", boundary: pi },
      external: { engineId: "opencode", boundary: external },
      composeCatalog: (_native, observedExternal) => observedExternal,
    });
    const catalog = { ...readiness.catalog, defaultEngineId: "pi" };
    const activeRuntime = ManagedRuntime.make(
      makeProductControlPlaneLayer(
        resolveProductDatabasePath(stateDir),
        gateway,
        catalog,
      ),
    );
    runtime = activeRuntime;
    const controlPlane = await activeRuntime.runPromise(Effect.service(ProductControlPlane));
    const conversationId = ProductConversationId.makeUnsafe("opencode-live-conversation");
    const runId = ProductRunId.makeUnsafe("opencode-live-run");
    await activeRuntime.runPromise(
      controlPlane.createConversation({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
        workspaceId: ProductWorkspaceId.makeUnsafe("opencode-live-workspace"),
        title: "OpenCode live proof",
        workspace: {
          kind: "chat",
          managedDirectory: null,
          primaryFolder: null,
          executionTarget: null,
          writeAuthority: "read-only-references",
        },
      }),
    );
    const item = await activeRuntime.runPromise(
      controlPlane.putQueueItem({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
        itemId: ProductQueueItemId.makeUnsafe("opencode-live-queue"),
        text: "Reply with one short visible confirmation.",
        requestedSelection: {
          state: "selected",
          engineId: "opencode",
          runtimeChoice: { kind: "engine-session-current" },
          permissionPolicy: "approval-required",
          executionTarget: null,
          packageGeneration: null,
        },
        resources: [],
        expectedRevision: null,
      }),
    );
    const submitted = await deadline(
      activeRuntime.runPromise(
        controlPlane.submitQueueItem({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId,
          itemId: item.id,
          expectedRevision: item.revision,
          entryId: ProductEntryId.makeUnsafe("opencode-live-entry"),
          runId,
          dispatchId: ProductDispatchId.makeUnsafe("opencode-live-dispatch"),
          receiptId: ProductOperationReceiptId.makeUnsafe("opencode-live-receipt"),
        }),
      ),
      Math.min(180_000, Math.max(10_000, input.timeoutMs ?? 120_000)),
    );
    const model = submitted.snapshot.readModel;
    const run = model.runs.find((candidate) => candidate.id === runId);
    const assistants = model.entries.filter(
      (entry) => entry.runId === runId && entry.role === "assistant",
    );
    const settled = model.activities.filter(
      (activity) => activity.runId === runId && activity.detail.code === "run-settled",
    );
    const assistantIndex = order.indexOf("assistant");
    const settlementIndex = order.indexOf("settlement");
    const outbox = await activeRuntime.runPromise(controlPlane.inspectOutbox());
    const journey = buildEngineJourneyAllowlistedSnapshot({
      engine: "opencode",
      receipt: run?.receipt.receipt ?? null,
      assistantEntryCount: assistants.length,
      assistantTextPresent: assistants.some((entry) => entry.text.trim().length > 0),
      runSettledActivityCount: settled.length,
      assistantBeforeSettlement:
        assistantIndex >= 0 && settlementIndex >= 0 && assistantIndex < settlementIndex,
      outbox,
      prepareCount,
      attemptCount,
      engineAttemptGuardCount: guard.count,
      siblingPrepareCount: piPrepareCount,
      siblingAttemptCount: piAttemptCount,
    });
    const acceptance =
      readiness.runtimeVersion === "1.14.40" &&
      journey.receipt.state === "settled" &&
      journey.receipt.evidenceKind === "observed-delivery" &&
      journey.receipt.outcome === "succeeded" &&
      !journey.receipt.operationRefPresent &&
      journey.product.assistantEntryCount === 1 &&
      journey.product.assistantTextPresent &&
      journey.product.runSettledActivityCount === 1 &&
      journey.product.assistantBeforeSettlement &&
      journey.outbox.length === 1 &&
      journey.outbox[0]?.sendBoundary === "observed" &&
      journey.outbox[0]?.attemptCount === 1 &&
      journey.outbox[0]?.automaticReplayCount === 0 &&
      journey.counters.prepareCount === 1 &&
      journey.counters.attemptCount === 1 &&
      journey.counters.engineAttemptGuardCount === 1 &&
      journey.counters.siblingPrepareCount === 0 &&
      journey.counters.siblingAttemptCount === 0;
    const snapshot = {
      candidate: input.candidate,
      readiness: { state: readiness.state, runtimeVersion: readiness.runtimeVersion },
      journey,
      fallbackCount: 0,
      acceptance: acceptance ? ("PASS" as const) : ("FAIL" as const),
    };
    return await persistSnapshotThenCleanupThenFinalize({
      snapshot,
      persistSnapshot: (value) => privateJson(snapshotFile, value),
      cleanup: async () => {
        await activeRuntime.dispose();
        runtimeDisposed = true;
        scratchEmpty = await openCodeScratchBaseIsEmpty(scratchBase);
        await rm(stateDir, { recursive: true });
        stateRemoved = true;
        if (!scratchEmpty) throw new Error("OpenCode scratch cleanup failed.");
      },
      finalize: (value, cleanupComplete) => ({
        ...value,
        cleanup: { cleanupComplete, runtimeDisposed, scratchEmpty, stateRemoved },
      }),
      persistFinal: (value) => privateJson(resultFile, value),
    });
  } finally {
    if (!runtimeDisposed) {
      if (runtime) await runtime.dispose();
      else await source.close?.();
    }
  }
}

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`OpenCode live journey requires ${name}.`);
  return value;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const configuredTimeout = Number(process.env.OMNIMIND_OPENCODE_LIVE_PROBE_TIMEOUT_MS);
  const result = await runOpenCodeLiveJourneyProbe({
    candidate: required("OMNIMIND_OPENCODE_LIVE_PROBE_CANDIDATE"),
    probeRoot: required("OMNIMIND_OPENCODE_LIVE_PROBE_ROOT"),
    resultFile: required("OMNIMIND_OPENCODE_LIVE_PROBE_RESULT"),
    ...(configuredTimeout ? { timeoutMs: configuredTimeout } : {}),
  });
  if (result.acceptance !== "PASS" || !result.cleanup.cleanupComplete) process.exitCode = 1;
}
