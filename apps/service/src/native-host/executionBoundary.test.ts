import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductDispatchId,
  ProductEngineBindingId,
  ProductEntryId,
  ProductOperationReceiptId,
  ProductQueueItemId,
  ProductRunId,
  ProductWorkspaceId,
  type NativeHostPackageArtifact,
  type NativeHostPackageLoadReport,
  type NativeHostRuntimeFact,
  type ProductExecutionFact,
  type ProductRuntimeCatalog,
} from "@omnimind/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";

import {
  ProductControlPlane,
  resolveProductDatabasePath,
  type ProductExecutionBoundary,
} from "../product/ProductControlPlane";
import { ServerConfig } from "../config";
import { NativeHostClient } from "./client";
import {
  initializeProductPackageLifecycle,
  makeNativeHostExecutionBoundary,
  makeNativeHostProductControlPlaneLayer,
  makePackageStateUnavailableBoundary,
  NativeHostProductControlPlaneLive,
} from "./executionBoundary";
import { EMPTY_PI_PACKAGE_GENERATION, PiPackageLifecycle } from "./packageLifecycle";

const operationRef = "pi-op:session:entry";
const emittedAt = "2026-08-05T00:00:00.000Z";

function fact(
  sequence: number,
  change:
    | { readonly kind: "assistant.delta"; readonly text: string }
    | {
        readonly kind: "settlement";
        readonly outcome: "succeeded" | "failed";
        readonly message: string;
      }
    | { readonly kind: "package.failed"; readonly count: number },
): NativeHostRuntimeFact {
  return { operationRef, sequence, emittedAt, ...change };
}

const packageReport: NativeHostPackageLoadReport = {
  extensionCount: 1,
  toolNames: ["todo"],
  commandNames: [],
  lifecycleEvents: [],
};

function packageLifecycleFixture(generations: ReadonlyArray<string>) {
  const root = mkdtempSync(path.join(tmpdir(), "omnimind-boundary-package-"));
  const stateDir = path.join(root, "userdata");
  const lifecycle = new PiPackageLifecycle({ stateDir });
  const artifacts = generations.map((generation): NativeHostPackageArtifact => {
    const stagePath = path.join(stateDir, "packages", "stage", generation);
    mkdirSync(stagePath, { recursive: true });
    const manifest = Buffer.from(`manifest:${generation}\n`);
    const executable = Buffer.from(`extension:${generation}\n`);
    writeFileSync(path.join(stagePath, "manifest.json"), manifest);
    writeFileSync(path.join(stagePath, "todo.ts"), executable);
    return {
      generation,
      stagePath,
      manifestSha256: createHash("sha256").update(manifest).digest("hex"),
      executablePath: "todo.ts",
      executableSha256: createHash("sha256").update(executable).digest("hex"),
      executableBytes: executable.byteLength,
    };
  });
  return { root, lifecycle, artifacts };
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > 2_000) throw new Error("observation timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("Native Host production Product composition", () => {
  it("uses the canonical stores Product database for control-plane and Package lifecycle startup", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "omnimind-product-composition-"));
    const baseDir = path.join(root, "product-home");
    const stateDir = path.join(baseDir, "userdata");
    const productDatabase = resolveProductDatabasePath(stateDir);
    const retiredRootDatabase = path.join(stateDir, "product.sqlite");
    const runtime = ManagedRuntime.make(
      NativeHostProductControlPlaneLive.pipe(
        Layer.provide(
          ServerConfig.layerTest(process.cwd(), baseDir).pipe(Layer.provide(NodeServices.layer)),
        ),
      ),
    );
    try {
      await runtime.runPromise(Effect.service(ProductControlPlane));
      expect(lstatSync(productDatabase).isFile()).toBe(true);
      expect(() => lstatSync(retiredRootDatabase)).toThrow();
    } finally {
      await runtime.dispose();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps Pi available when a foreign OpenCode scratch child fails validation", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "omnimind-scratch-isolation-"));
    const stateDir = path.join(root, "userdata");
    const scratchBase = path.join(stateDir, "opencode-chat");
    const foreign = path.join(scratchBase, "foreign-private-state");
    mkdirSync(foreign, { recursive: true, mode: 0o700 });

    let piPrepareCount = 0;
    let piAttemptCount = 0;
    const piCatalog: ProductRuntimeCatalog = {
      defaultEngineId: "pi",
      packageGeneration: "pi-generation",
      engines: [
        {
          engineId: "pi",
          displayName: "Pi",
          distribution: "bundled-native",
          runtimeVersion: "0.81.1",
          protocol: { name: "native", version: "1" },
          availability: { state: "available" },
          modelSelection: {
            kind: "product-model",
            thinking: "product-selectable",
            models: [
              {
                id: "fake/model",
                provider: "fake",
                modelId: "model",
                name: "Healthy fake Pi model",
                reasoning: false,
                available: true,
                thinkingLevels: [],
                auth: "configured",
              },
            ],
          },
          capabilities: Object.fromEntries(
            [
              "continuation",
              "rebuild",
              "thinkingStream",
              "thinkingLevel",
              "structuredQuestion",
              "queue",
              "steer",
              "followUp",
              "cancel",
              "permissionPolicy",
              "packages",
              "filesRead",
              "filesWrite",
              "terminal",
              "namespacedUi",
            ].map((key) => [key, { state: "available", reason: "healthy-fake-pi" }]),
          ) as never,
          enforcement: "host-enforced",
        },
      ],
    };
    const piBoundary: ProductExecutionBoundary = {
      prepare: () => {
        piPrepareCount += 1;
        return Effect.succeed({
          engineId: "pi",
          resolvedSelection: null,
          close: async () => undefined,
        });
      },
      attempt: ({ markSent }) =>
        Effect.gen(function* () {
          piAttemptCount += 1;
          yield* markSent();
          return {
            kind: "accepted" as const,
            operationRef: "pi-operation:scratch-isolation",
            engineBinding: {
              id: ProductEngineBindingId.makeUnsafe("pi-binding:scratch-isolation"),
              engineId: "pi",
              lineageRef: "pi-lineage:scratch-isolation",
            },
            resolvedSelection: {
              engineId: "pi",
              runtimeModelId: "fake/model",
              engineModeId: null,
              thinking: null,
              permissionPolicy: "approval-required" as const,
              enforcement: "host-enforced" as const,
              executionTarget: null,
              packageGeneration: "pi-generation",
            },
          };
        }),
      catalog: () => Effect.succeed(piCatalog),
    };
    const layer = await Effect.runPromise(
      makeNativeHostProductControlPlaneLayer({ stateDir, nativeBoundary: piBoundary }),
    );
    const runtime = ManagedRuntime.make(layer);
    try {
      const controlPlane = await runtime.runPromise(Effect.service(ProductControlPlane));
      const shell = await runtime.runPromise(controlPlane.getShellSnapshot());
      expect(shell.runtimeCatalog).toMatchObject({
        defaultEngineId: "pi",
        engines: [
          { engineId: "pi", availability: { state: "available" } },
          {
            engineId: "opencode",
            availability: { state: "unavailable", reason: "initialize-failed" },
          },
        ],
      });

      const conversationId = ProductConversationId.makeUnsafe("conversation-scratch-isolation");
      await runtime.runPromise(
        controlPlane.createConversation({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId,
          workspaceId: ProductWorkspaceId.makeUnsafe("workspace-scratch-isolation"),
          title: "Scratch isolation",
          workspace: {
            kind: "chat",
            managedDirectory: null,
            primaryFolder: null,
            executionTarget: null,
            writeAuthority: "read-only-references",
          },
        }),
      );
      const piQueue = await runtime.runPromise(
        controlPlane.putQueueItem({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId,
          itemId: ProductQueueItemId.makeUnsafe("queue-scratch-isolation-pi"),
          text: "Route through healthy Pi",
          requestedSelection: {
            state: "selected",
            engineId: "pi",
            runtimeChoice: { kind: "product-model", runtimeModelId: "fake/model", thinking: null },
            permissionPolicy: "approval-required",
            executionTarget: null,
            packageGeneration: "pi-generation",
          },
          resources: [],
          expectedRevision: null,
        }),
      );
      await expect(
        runtime.runPromise(
          controlPlane.submitQueueItem({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId,
            itemId: piQueue.id,
            expectedRevision: piQueue.revision,
            entryId: ProductEntryId.makeUnsafe("entry-scratch-isolation-pi"),
            runId: ProductRunId.makeUnsafe("run-scratch-isolation-pi"),
            dispatchId: ProductDispatchId.makeUnsafe("dispatch-scratch-isolation-pi"),
            receiptId: ProductOperationReceiptId.makeUnsafe("receipt-scratch-isolation-pi"),
          }),
        ),
      ).resolves.toMatchObject({
        snapshot: { readModel: { runs: [{ requestedSelection: { engineId: "pi" } }] } },
      });
      expect({ piPrepareCount, piAttemptCount }).toEqual({
        piPrepareCount: 1,
        piAttemptCount: 1,
      });

      const openCodeQueue = await runtime.runPromise(
        controlPlane.putQueueItem({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId,
          itemId: ProductQueueItemId.makeUnsafe("queue-scratch-isolation-opencode"),
          text: "Keep explicit OpenCode intent",
          requestedSelection: {
            state: "unavailable",
            requestedEngineId: "opencode",
            reason: "initialize-failed",
            requestedRuntimeChoice: { kind: "engine-session-current" },
            permissionPolicy: "approval-required",
            executionTarget: null,
            packageGeneration: null,
          },
          resources: [],
          expectedRevision: null,
        }),
      );
      await expect(
        runtime.runPromise(
          controlPlane.submitQueueItem({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId,
            itemId: openCodeQueue.id,
            expectedRevision: openCodeQueue.revision,
            entryId: ProductEntryId.makeUnsafe("entry-scratch-isolation-opencode"),
            runId: ProductRunId.makeUnsafe("run-scratch-isolation-opencode"),
            dispatchId: ProductDispatchId.makeUnsafe("dispatch-scratch-isolation-opencode"),
            receiptId: ProductOperationReceiptId.makeUnsafe("receipt-scratch-isolation-opencode"),
          }),
        ),
      ).rejects.toMatchObject({ code: "PRODUCT_RUNTIME_SELECTION_UNAVAILABLE" });
      expect({ piPrepareCount, piAttemptCount }).toEqual({
        piPrepareCount: 1,
        piAttemptCount: 1,
      });
      await expect(runtime.runPromise(controlPlane.inspectOutbox())).resolves.toEqual([
        expect.objectContaining({ engineId: "pi", attemptCount: 1, automaticReplayCount: 0 }),
      ]);
      expect(lstatSync(foreign).isDirectory()).toBe(true);
    } finally {
      await runtime.dispose();
    }
    expect(lstatSync(foreign).isDirectory()).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });
});

describe("makeNativeHostExecutionBoundary recovery", () => {
  it("fails Package capability closed when the explicit application root lacks assets", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "omnimind-missing-package-root-"));
    const stateDir = path.join(root, "userdata");
    const productDatabase = resolveProductDatabasePath(stateDir);
    mkdirSync(path.dirname(productDatabase), { recursive: true, mode: 0o700 });
    let failure: unknown = null;
    try {
      await initializeProductPackageLifecycle({
        stateDir,
        productDatabase,
        client: {} as NativeHostClient,
        applicationRoot: root,
      });
    } catch (cause) {
      failure = cause;
    }
    expect(failure).toMatchObject({ code: "PACKAGE_SOURCE_INVALID" });
    const boundary = makePackageStateUnavailableBoundary(failure);
    expect(boundary.catalog).toBeDefined();
    await expect(Effect.runPromise(boundary.catalog!())).resolves.toBeNull();
    rmSync(root, { recursive: true, force: true });
  });

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
      | { readonly kind: "facts"; readonly facts: ReadonlyArray<ProductExecutionFact> }
      | { readonly kind: "snapshot" }
      | { readonly kind: "outcome-unknown" }
    > = [];
    boundary.subscribeFacts?.((_runId, observation) => {
      if (
        observation.kind === "delivery-accepted" ||
        observation.kind === "delivery-rejected" ||
        observation.kind === "delivery-observed"
      ) {
        return;
      }
      observations.push(observation.kind === "snapshot" ? { kind: "snapshot" } : observation);
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
        observation.kind === "facts" ? observation.facts.map((item) => item.engineSequence) : [],
      ),
    ).toEqual([1, 2, 3]);
    expect(observations.some((observation) => observation.kind === "outcome-unknown")).toBe(false);
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
    const { root, lifecycle, artifacts } = packageLifecycleFixture(["generation-redelivery"]);
    lifecycle.recordValidated(artifacts[0]!, packageReport);
    lifecycle.activate(artifacts[0]!.generation, 0);
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
    const boundary = makeNativeHostExecutionBoundary(client, lifecycle);
    boundary.bindRunPackageGeneration?.(
      ProductRunId.makeUnsafe("run-redelivery"),
      artifacts[0]!.generation,
    );
    let applyCount = 0;
    let settled = false;
    boundary.subscribeFacts?.((_runId, observation) => {
      if (observation.kind !== "facts") return;
      applyCount += 1;
      expect(lifecycle.snapshot().lastKnownGoodGeneration).toBe(EMPTY_PI_PACKAGE_GENERATION);
      if (applyCount === 1) throw new Error("transient Product transaction failure");
      settled = observation.facts.some((item) => item.kind === "settlement");
    });
    boundary.resumeFacts?.(ProductRunId.makeUnsafe("run-redelivery"), operationRef);
    await waitUntil(() => settled);
    expect(cursors).toEqual([0, 0]);
    expect(applyCount).toBe(2);
    expect(lifecycle.snapshot().lastKnownGoodGeneration).toBe(artifacts[0]!.generation);
    await boundary.close?.();
    rmSync(root, { recursive: true, force: true });
  });

  it("quarantines only after Product accepts a native Package fault and selects LKG next", async () => {
    const { root, lifecycle, artifacts } = packageLifecycleFixture([
      "generation-known-good",
      "generation-failing",
    ]);
    lifecycle.recordValidated(artifacts[0]!, packageReport);
    lifecycle.activate(artifacts[0]!.generation, 0);
    lifecycle.recordSuccessfulGeneration(artifacts[0]!.generation);
    lifecycle.recordValidated(artifacts[1]!, packageReport);
    lifecycle.activate(artifacts[1]!.generation, 0);
    const terminalFacts = [
      fact(1, { kind: "package.failed", count: 1 }),
      fact(2, { kind: "settlement", outcome: "failed", message: "Package failed." }),
    ];
    const client = {
      facts: async () => ({
        kind: "runtime.facts.response" as const,
        operationRef,
        afterSequence: 0,
        highWaterSequence: 2,
        facts: terminalFacts,
        resnapshotRequired: false,
        snapshot: null,
        resnapshotReason: null,
      }),
      reconcile: async () => ({
        kind: "runtime.reconcile.response" as const,
        operationRef,
        status: "settled" as const,
        highWaterSequence: 2,
        facts: terminalFacts,
        resnapshotRequired: false,
        snapshot: null,
        resnapshotReason: null,
        resolution: null,
      }),
      catalog: async () => ({
        kind: "runtime.catalog.response" as const,
        engineId: "pi",
        runtimeVersion: "0.81.1",
        models: [],
        capabilities: {
          ingress: "typed-native-host" as const,
          lineage: { continue: "available" as const, rebuild: "available" as const },
          controls: {
            steer: "available" as const,
            followUp: "available" as const,
            abort: "available" as const,
            cancel: "unavailable" as const,
          },
          structuredQuestions: "available" as const,
          packages: "available" as const,
          filesRead: "unknown" as const,
          filesWrite: "unknown" as const,
          terminal: "unknown" as const,
          enforcement: "unverified" as const,
        },
        truncated: false,
      }),
    } as unknown as NativeHostClient;
    const boundary = makeNativeHostExecutionBoundary(client, lifecycle);
    const runId = ProductRunId.makeUnsafe("run-package-fault");
    boundary.bindRunPackageGeneration?.(runId, artifacts[1]!.generation);
    let applyCount = 0;
    boundary.subscribeFacts?.(() => {
      expect(lifecycle.snapshot().currentGeneration).toBe(artifacts[1]!.generation);
      applyCount += 1;
      if (applyCount === 1) throw new Error("transient Product transaction failure");
    });

    boundary.resumeFacts?.(runId, operationRef);
    await waitUntil(() => lifecycle.snapshot().quarantinedGenerations.length === 1);

    expect(applyCount).toBe(2);
    expect(lifecycle.snapshot()).toMatchObject({
      currentGeneration: artifacts[0]!.generation,
      lastKnownGoodGeneration: artifacts[0]!.generation,
      quarantinedGenerations: [artifacts[1]!.generation],
    });
    expect(boundary.catalog).toBeDefined();
    await expect(Effect.runPromise(boundary.catalog!())).resolves.toMatchObject({
      packageGeneration: artifacts[0]!.generation,
    });
    await boundary.close?.();
    rmSync(root, { recursive: true, force: true });
  });

  it("quarantines a committed Package rejection but not a generic Session rejection", () => {
    const { root, lifecycle, artifacts } = packageLifecycleFixture([
      "generation-rejection-known-good",
      "generation-rejection-current",
    ]);
    lifecycle.recordValidated(artifacts[0]!, packageReport);
    lifecycle.activate(artifacts[0]!.generation, 0);
    lifecycle.recordSuccessfulGeneration(artifacts[0]!.generation);
    lifecycle.recordValidated(artifacts[1]!, packageReport);
    lifecycle.activate(artifacts[1]!.generation, 0);
    const boundary = makeNativeHostExecutionBoundary({} as NativeHostClient, lifecycle);
    const genericRunId = ProductRunId.makeUnsafe("run-generic-session-failure");
    boundary.bindRunPackageGeneration?.(genericRunId, artifacts[1]!.generation);
    boundary.afterObservationApplied?.(genericRunId, "pi", {
      kind: "rejected",
      code: "PI_SESSION_UNAVAILABLE",
      message: "Generic Session construction failed.",
      retryable: false,
    });
    expect(lifecycle.snapshot()).toMatchObject({
      currentGeneration: artifacts[1]!.generation,
      quarantinedGenerations: [],
    });

    const packageRunId = ProductRunId.makeUnsafe("run-package-lifecycle-failure");
    boundary.bindRunPackageGeneration?.(packageRunId, artifacts[1]!.generation);
    boundary.afterObservationApplied?.(packageRunId, "pi", {
      kind: "rejected",
      code: "PI_PACKAGE_LIFECYCLE_UNAVAILABLE",
      message: "Selected Package lifecycle failed.",
      retryable: false,
    });
    expect(lifecycle.snapshot()).toMatchObject({
      currentGeneration: artifacts[0]!.generation,
      lastKnownGoodGeneration: artifacts[0]!.generation,
      quarantinedGenerations: [artifacts[1]!.generation],
    });
    rmSync(root, { recursive: true, force: true });
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
                  runtimeModelId: "faux-native/faux-thinker",
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
