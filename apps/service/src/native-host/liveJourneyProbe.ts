import { mkdirSync, writeFileSync } from "node:fs";
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
  type ProductConversationSnapshot,
  type ProductRequestedSelection,
} from "@omnimind/contracts";
import { Effect, ManagedRuntime } from "effect";

import {
  PRODUCT_DATABASE_FILENAME,
  ProductControlPlane,
  type ProductControlPlaneError,
  type ProductControlPlaneShape,
  makeProductControlPlaneLayer,
} from "../product/ProductControlPlane";
import { makeNativeHostClientFromEnvironment } from "./client";
import {
  initializeProductPackageLifecycle,
  makeNativeHostExecutionBoundary,
} from "./executionBoundary";
import { CURATED_PI_PACKAGE_GENERATION } from "./packageLifecycle";

const PRIVATE_TODO_CANARY = "package-private-state-canary";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Live journey probe requires ${name}.`);
  return value;
}

function terminalState(state: string): boolean {
  return state === "settled" || state === "rejected" || state === "outcome_unknown";
}

async function waitForTerminal(
  runtime: ManagedRuntime.ManagedRuntime<ProductControlPlane, ProductControlPlaneError>,
  controlPlane: ProductControlPlaneShape,
  conversationId: ProductConversationId,
  runId: ProductRunId,
  timeoutMs: number,
): Promise<ProductConversationSnapshot> {
  const started = Date.now();
  for (;;) {
    const snapshot = await runtime.runPromise(
      controlPlane.getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
      }),
    );
    const run = snapshot.readModel.runs.find((candidate) => candidate.id === runId);
    if (run && terminalState(run.receipt.receipt.state)) return snapshot;
    if (Date.now() - started > timeoutMs) {
      throw new Error("Live journey probe timed out waiting for Product settlement.");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function main(): Promise<void> {
  const probeRoot = path.resolve(requiredEnvironment("OMNIMIND_PI_LIVE_PROBE_ROOT"));
  const resultFile = path.resolve(requiredEnvironment("OMNIMIND_PI_LIVE_PROBE_RESULT"));
  const resultRelative = path.relative(probeRoot, resultFile);
  if (resultRelative.startsWith("..") || path.isAbsolute(resultRelative)) {
    throw new Error("Live journey probe result must stay inside its explicit probe root.");
  }
  const timeoutMs = Math.min(
    180_000,
    Math.max(10_000, Number(process.env.OMNIMIND_PI_LIVE_PROBE_TIMEOUT_MS) || 120_000),
  );
  mkdirSync(probeRoot, { recursive: true, mode: 0o700 });
  mkdirSync(path.dirname(resultFile), { recursive: true, mode: 0o700 });
  const agentWorkspace = path.join(probeRoot, "agent-workspace");
  mkdirSync(agentWorkspace, { recursive: true, mode: 0o700 });
  writeFileSync(
    path.join(agentWorkspace, "probe-input.txt"),
    "OmniMind live folder-backed Agent proof input.\n",
    { encoding: "utf8", mode: 0o600 },
  );

  const client = makeNativeHostClientFromEnvironment(process.env);
  if (!client) throw new Error("Live journey probe could not construct the Native Host client.");
  const productDatabase = path.join(probeRoot, PRODUCT_DATABASE_FILENAME);
  const lifecycle = await initializeProductPackageLifecycle({
    stateDir: path.join(requiredEnvironment("OMNIMIND_HOME"), "userdata"),
    productDatabase,
    client,
    applicationRoot: path.resolve(requiredEnvironment("OMNIMIND_APP_ROOT")),
  });
  const packageGeneration = lifecycle.snapshot().currentGeneration;
  if (packageGeneration !== CURATED_PI_PACKAGE_GENERATION) {
    throw new Error("Live journey probe did not activate the curated Pi Package generation.");
  }
  const catalog = await client.catalog();
  const requestedModel = process.env.OMNIMIND_PI_LIVE_PROBE_MODEL?.trim();
  const selected = requestedModel
    ? catalog.models.find((model) => model.id === requestedModel && model.available)
    : catalog.models.find((model) => model.available);
  if (!selected) throw new Error("Live journey probe found no requested broker-backed Pi model.");
  const runtimeCatalog = {
    engineId: catalog.engineId,
    runtimeVersion: catalog.runtimeVersion,
    packageGeneration,
    models: catalog.models,
    capabilities: catalog.capabilities,
    truncated: catalog.truncated,
  };
  const boundary = makeNativeHostExecutionBoundary(client, lifecycle);
  const runtime = ManagedRuntime.make(
    makeProductControlPlaneLayer(productDatabase, boundary, runtimeCatalog),
  );
  const controlPlane = await runtime.runPromise(Effect.service(ProductControlPlane));
  const observedAt = new Date().toISOString();
  const selection = (
    executionTarget: ProductRequestedSelection["executionTarget"],
  ): ProductRequestedSelection => ({
    state: "selected",
    engineId: catalog.engineId,
    runtimeModelId: selected.id,
    thinking: selected.thinkingLevels.includes("medium")
      ? "medium"
      : (selected.thinkingLevels[0] ?? null),
    permissionPolicy: "approval-required",
    enforcement: "unverified",
    executionTarget,
    packageGeneration,
  });
  let counter = 0;
  const nextIds = (prefix: string) => {
    counter += 1;
    const suffix = `${prefix}-${counter}`;
    return {
      itemId: ProductQueueItemId.makeUnsafe(`queue-${suffix}`),
      entryId: ProductEntryId.makeUnsafe(`entry-${suffix}`),
      runId: ProductRunId.makeUnsafe(`run-${suffix}`),
      dispatchId: ProductDispatchId.makeUnsafe(`dispatch-${suffix}`),
      receiptId: ProductOperationReceiptId.makeUnsafe(`receipt-${suffix}`),
    };
  };
  const submit = async (
    conversationId: ProductConversationId,
    prefix: string,
    text: string,
    requestedSelection: ProductRequestedSelection,
  ) => {
    const ids = nextIds(prefix);
    const queued = await runtime.runPromise(
      controlPlane.putQueueItem({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
        itemId: ids.itemId,
        text,
        requestedSelection,
        resources: [],
        expectedRevision: null,
      }),
    );
    const submitted = await runtime.runPromise(
      controlPlane.submitQueueItem({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId,
        itemId: queued.id,
        expectedRevision: queued.revision,
        entryId: ids.entryId,
        runId: ids.runId,
        dispatchId: ids.dispatchId,
        receiptId: ids.receiptId,
      }),
    );
    const snapshot = await waitForTerminal(
      runtime,
      controlPlane,
      conversationId,
      ids.runId,
      timeoutMs,
    );
    return { ids, submitted, snapshot };
  };

  try {
    const chatConversationId = ProductConversationId.makeUnsafe("conversation-live-chat-proof");
    await runtime.runPromise(
      controlPlane.createConversation({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: chatConversationId,
        workspaceId: ProductWorkspaceId.makeUnsafe("workspace-live-chat-proof"),
        title: "Live Chat proof",
        workspace: {
          kind: "chat",
          managedDirectory: null,
          primaryFolder: null,
          executionTarget: null,
          writeAuthority: "read-only-references",
        },
      }),
    );
    const firstChat = await submit(
      chatConversationId,
      "live-chat-first",
      `Use the todo tool exactly once with action "add" and text "${PRIVATE_TODO_CANARY}". After the tool succeeds, reply with one short confirmation.`,
      selection(null),
    );
    const firstChatState = firstChat.snapshot.readModel.runs.find(
      (run) => run.id === firstChat.ids.runId,
    )?.receipt.receipt.state;
    if (firstChatState !== "settled") {
      throw new Error("Live journey probe Chat Run did not settle successfully.");
    }
    const secondChat = await submit(
      chatConversationId,
      "live-chat-continuation",
      `Use the todo tool exactly once with action "list". Then reply whether the existing list contains "${PRIVATE_TODO_CANARY}".`,
      selection(null),
    );

    const agentConversationId = ProductConversationId.makeUnsafe("conversation-live-agent-proof");
    const agentTarget = { kind: "local" as const, targetRef: agentWorkspace, observedAt };
    await runtime.runPromise(
      controlPlane.createConversation({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: agentConversationId,
        workspaceId: ProductWorkspaceId.makeUnsafe("workspace-live-agent-proof"),
        title: "Live Agent proof",
        workspace: {
          kind: "folder-backed",
          managedDirectory: null,
          primaryFolder: agentWorkspace,
          executionTarget: agentTarget,
          writeAuthority: "primary-folder",
        },
      }),
    );
    const agent = await submit(
      agentConversationId,
      "live-agent",
      "Use the read tool to inspect probe-input.txt, then summarize it in one sentence.",
      selection(agentTarget),
    );

    const summarize = (snapshot: ProductConversationSnapshot, runId: ProductRunId) => {
      const run = snapshot.readModel.runs.find((candidate) => candidate.id === runId);
      const activities = snapshot.readModel.activities.filter(
        (activity) => activity.runId === runId,
      );
      const sessionActivity = activities.find(
        (activity) => activity.detail.code === "session-bound",
      );
      const assistantText = snapshot.readModel.entries
        .filter((entry) => entry.runId === runId && entry.role === "assistant")
        .map((entry) => entry.text)
        .join("\n");
      return {
        receiptState: run?.receipt.receipt.state ?? "missing",
        assistantEntryCount: snapshot.readModel.entries.filter(
          (entry) => entry.runId === runId && entry.role === "assistant",
        ).length,
        lineage:
          sessionActivity?.detail.code === "session-bound" ? sessionActivity.detail.lineage : null,
        thinkingObserved: activities.some((activity) => activity.detail.code === "thinking-delta"),
        toolStarted: activities.some((activity) => activity.detail.code === "tool-started"),
        toolSettled: activities.some((activity) => activity.detail.code === "tool-settled"),
        todoToolStarted: activities.some(
          (activity) =>
            activity.detail.code === "tool-started" && activity.detail.toolName === "todo",
        ),
        todoToolSettled: activities.some(
          (activity) =>
            activity.detail.code === "tool-settled" &&
            activity.detail.toolName === "todo" &&
            activity.detail.outcome === "succeeded",
        ),
        packageLoaded: activities.some((activity) => activity.detail.code === "package-loaded"),
        privateTodoCanaryObserved: assistantText.includes(PRIVATE_TODO_CANARY),
        usageObserved: activities.some((activity) => activity.detail.code === "usage-observed"),
        settlementObserved: activities.some((activity) => activity.detail.code === "run-settled"),
      };
    };
    const outbox = await runtime.runPromise(controlPlane.inspectOutbox());
    writeFileSync(
      resultFile,
      `${JSON.stringify({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        runtimeVersion: catalog.runtimeVersion,
        packageGenerationMatched:
          lifecycle.snapshot().currentGeneration === runtimeCatalog.packageGeneration,
        dispatchCount: outbox.length,
        automaticReplayCounts: outbox.map((row) => row.automaticReplayCount),
        attemptCounts: outbox.map((row) => row.attemptCount),
        chat: summarize(secondChat.snapshot, firstChat.ids.runId),
        continuation: summarize(secondChat.snapshot, secondChat.ids.runId),
        agent: summarize(agent.snapshot, agent.ids.runId),
      })}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  } finally {
    await runtime.dispose();
  }
}

await main();
