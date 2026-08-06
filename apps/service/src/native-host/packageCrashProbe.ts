import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

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
  makeProductControlPlaneLayer,
  readProductPackageLifecycleFacts,
} from "../product/ProductControlPlane";
import { NativeHostClient } from "./client";
import { makeNativeHostExecutionBoundary } from "./executionBoundary";
import { PiPackageLifecycle } from "./packageLifecycle";
import type { NativeHostPackageArtifact } from "@omnimind/contracts/native-host";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Package crash probe requires ${name}.`);
  return value;
}

async function waitForAuthenticatedHost(client: NativeHostClient): Promise<void> {
  const started = Date.now();
  for (;;) {
    if (await client.liveness().catch(() => false)) return;
    if (Date.now() - started > 10_000) {
      throw new Error("Native Host did not re-authenticate after the Package crash.");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function main(): Promise<void> {
  const database = requiredEnvironment("OMNIMIND_PACKAGE_CRASH_PROBE_DATABASE");
  const resultFile = requiredEnvironment("OMNIMIND_PACKAGE_CRASH_PROBE_RESULT");
  const client = new NativeHostClient({
    endpoint: requiredEnvironment("OMNIMIND_NATIVE_HOST_ENDPOINT"),
    authentication: requiredEnvironment("OMNIMIND_NATIVE_HOST_AUTH"),
    hostInstanceId: requiredEnvironment("OMNIMIND_NATIVE_HOST_INSTANCE"),
    serviceInstanceId: "service-package-crash-proof",
  });
  const catalog = await client.catalog();
  const lifecycle = new PiPackageLifecycle({
    stateDir: path.join(requiredEnvironment("OMNIMIND_HOME"), "userdata"),
  });
  const artifact = JSON.parse(
    readFileSync(requiredEnvironment("OMNIMIND_PACKAGE_CRASH_PROBE_ARTIFACT"), "utf8"),
  ) as NativeHostPackageArtifact;
  const validation = await client.validatePackage(artifact);
  if (
    validation.status !== "validated" ||
    validation.generation !== artifact.generation ||
    !validation.report
  ) {
    throw new Error("Test Package failed exact Native Host validation.");
  }
  lifecycle.recordValidated(artifact, validation.report);
  lifecycle.activate(artifact.generation, 0);
  const packageGeneration = lifecycle.snapshot().currentGeneration;
  if (!packageGeneration)
    throw new Error("Package crash probe found no Product Package generation.");
  const selected = catalog.models.find((model) => model.available);
  if (!selected) throw new Error("Package crash probe found no broker-backed Pi model.");
  const boundary = makeNativeHostExecutionBoundary(client, lifecycle);
  const runtimeCatalog = await Effect.runPromise(boundary.catalog!());
  const runtime = ManagedRuntime.make(
    makeProductControlPlaneLayer(database, boundary, runtimeCatalog),
  );
  const controlPlane = await runtime.runPromise(Effect.service(ProductControlPlane));
  const conversationId = ProductConversationId.makeUnsafe("conversation-package-crash-proof");
  const firstItemId = ProductQueueItemId.makeUnsafe("queue-package-crash-first");
  const secondItemId = ProductQueueItemId.makeUnsafe("queue-package-crash-second");
  const requestedSelection = {
    state: "selected" as const,
    engineId: catalog.engineId,
    runtimeChoice: {
      kind: "product-model" as const,
      runtimeModelId: selected.id,
      thinking: selected.thinkingLevels.includes("medium")
        ? "medium"
        : (selected.thinkingLevels[0] ?? null),
    },
    permissionPolicy: "approval-required" as const,
    executionTarget: null,
    packageGeneration,
  };
  try {
    await runtime.runPromise(
      controlPlane.createConversation({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
        workspaceId: ProductWorkspaceId.makeUnsafe("workspace-package-crash-proof"),
        title: "Package crash proof",
        workspace: {
          kind: "chat",
          managedDirectory: null,
          primaryFolder: null,
          executionTarget: null,
          writeAuthority: "read-only-references",
        },
      }),
    );
    const first = await runtime.runPromise(
      controlPlane.putQueueItem({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
        itemId: firstItemId,
        text: "Trigger the representative Host-owned Package.",
        requestedSelection,
        resources: [],
        expectedRevision: null,
      }),
    );
    await runtime.runPromise(
      controlPlane.putQueueItem({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
        itemId: secondItemId,
        text: "This queued intent must survive the Host process crash.",
        requestedSelection,
        resources: [],
        expectedRevision: null,
      }),
    );
    const submitted = await runtime.runPromise(
      controlPlane.submitQueueItem({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
        itemId: first.id,
        expectedRevision: first.revision,
        entryId: ProductEntryId.makeUnsafe("entry-package-crash-proof"),
        runId: ProductRunId.makeUnsafe("run-package-crash-proof"),
        dispatchId: ProductDispatchId.makeUnsafe("dispatch-package-crash-proof"),
        receiptId: ProductOperationReceiptId.makeUnsafe("receipt-package-crash-proof"),
      }),
    );
    await waitForAuthenticatedHost(client);
    const pendingReconciliation = await client.reconcile(
      "pi-pending:dispatch-package-crash-proof",
      0,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    const snapshot = await runtime.runPromise(
      controlPlane.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
      }),
    );
    const outbox = await runtime.runPromise(controlPlane.inspectOutbox());
    const packageFacts = await readProductPackageLifecycleFacts(database);
    const lifecycleSnapshot = lifecycle.snapshot();
    const receipt = snapshot.readModel.runs[0]?.receipt.receipt;
    writeFileSync(
      resultFile,
      `${JSON.stringify({
        hostReauthenticated: true,
        submitReceiptState: submitted.snapshot.readModel.runs[0]?.receipt.receipt.state,
        receiptState: receipt?.state,
        reconciliationHint: null,
        pendingReconcileStatus: pendingReconciliation.status,
        pendingResolution: pendingReconciliation.resolution?.kind ?? null,
        packageGeneration,
        activeLeaseCount: packageFacts.activeLeaseCounts[packageGeneration] ?? 0,
        quarantinedGenerations: lifecycleSnapshot.quarantinedGenerations,
        queueIds: snapshot.readModel.queue.map((item) => item.id),
        outbox: outbox.map((row) => ({
          state: row.state,
          sendBoundary: row.sendBoundary,
          attemptCount: row.attemptCount,
          automaticReplayCount: row.automaticReplayCount,
        })),
      })}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  } finally {
    await runtime.dispose();
  }
}

await main();
