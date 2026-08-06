import { mkdirSync, writeFileSync } from "node:fs";
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
  type ProductConversationSnapshot,
  type ProductDispatchReceipt,
  type ProductRequestedSelection,
} from "@omnimind/contracts";
import { Effect, ManagedRuntime } from "effect";

import {
  PRODUCT_DATABASE_FILENAME,
  ProductControlPlane,
  ProductControlPlaneError,
  type ProductControlPlaneShape,
  type ProductExecutionBoundary,
  type ProductOutboxDiagnostic,
  makeProductControlPlaneLayer,
} from "../product/ProductControlPlane";
import {
  type EngineJourneyJavaScriptRuntime,
  EngineAttemptGuard,
  buildEngineJourneyAllowlistedSnapshot,
  nativeHostProofExecutable,
  persistSnapshotThenCleanupThenFinalize,
} from "../product/engineJourneyProof";
import { makeProductExecutionGateway } from "../product/productExecutionGateway";
import { makeNativeHostClientFromEnvironment } from "./client";
import {
  initializeProductPackageLifecycle,
  makeNativeHostExecutionBoundary,
} from "./executionBoundary";
import { CURATED_PI_PACKAGE_GENERATION } from "./packageLifecycle";

const PRIVATE_TODO_CANARY = "package-private-state-canary";

export function piSingleChatProofExecutable(runtime?: EngineJourneyJavaScriptRuntime): string {
  return nativeHostProofExecutable(runtime);
}

export function buildPiSingleChatProof(input: {
  readonly candidate: string;
  readonly runtimeVersion: string;
  readonly packageGenerationMatched: boolean;
  readonly receipt: ProductDispatchReceipt | null;
  readonly assistantTexts: ReadonlyArray<string>;
  readonly runSettledActivityCount: number;
  readonly proofOrder: ReadonlyArray<"assistant" | "settlement">;
  readonly outbox: ReadonlyArray<ProductOutboxDiagnostic>;
  readonly prepareCount: number;
  readonly attemptCount: number;
  readonly engineAttemptGuardCount: number;
  readonly siblingPrepareCount: number;
  readonly siblingAttemptCount: number;
}) {
  const assistantIndex = input.proofOrder.indexOf("assistant");
  const settlementIndex = input.proofOrder.indexOf("settlement");
  const journey = buildEngineJourneyAllowlistedSnapshot({
    engine: "pi",
    receipt: input.receipt,
    assistantEntryCount: input.assistantTexts.length,
    assistantTextPresent: input.assistantTexts.some((text) => text.trim().length > 0),
    runSettledActivityCount: input.runSettledActivityCount,
    assistantBeforeSettlement:
      assistantIndex >= 0 && settlementIndex >= 0 && assistantIndex < settlementIndex,
    outbox: input.outbox,
    prepareCount: input.prepareCount,
    attemptCount: input.attemptCount,
    engineAttemptGuardCount: input.engineAttemptGuardCount,
    siblingPrepareCount: input.siblingPrepareCount,
    siblingAttemptCount: input.siblingAttemptCount,
  });
  const acceptance =
    journey.receipt.state === "settled" &&
    journey.receipt.evidenceKind === "accepted-operation" &&
    journey.receipt.outcome === "succeeded" &&
    journey.receipt.operationRefPresent &&
    journey.product.assistantEntryCount === 1 &&
    journey.product.assistantTextPresent &&
    journey.product.runSettledActivityCount === 1 &&
    journey.product.assistantBeforeSettlement &&
    journey.outbox.length === 1 &&
    journey.outbox[0]?.attemptCount === 1 &&
    journey.outbox[0]?.automaticReplayCount === 0 &&
    journey.counters.prepareCount === 1 &&
    journey.counters.attemptCount === 1 &&
    journey.counters.engineAttemptGuardCount === 1 &&
    journey.counters.siblingPrepareCount === 0 &&
    journey.counters.siblingAttemptCount === 0;
  return {
    candidate: input.candidate,
    runtimeVersion: input.runtimeVersion,
    packageGenerationMatched: input.packageGenerationMatched,
    journey,
    fallbackCount: 0,
    acceptance: acceptance ? ("PASS" as const) : ("FAIL" as const),
  };
}

export function piSingleChatProofExitCode(input: {
  readonly acceptance: "PASS" | "FAIL";
  readonly cleanupComplete: boolean;
}): 0 | 1 {
  return input.acceptance === "PASS" && input.cleanupComplete ? 0 : 1;
}

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
  const singleChat = process.env.OMNIMIND_PI_LIVE_PROBE_MODE?.trim() === "single-chat";
  const candidate = singleChat ? requiredEnvironment("OMNIMIND_PI_LIVE_PROBE_CANDIDATE") : null;
  if (singleChat) piSingleChatProofExecutable();
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
  const sourceBoundary = makeNativeHostExecutionBoundary(client, lifecycle);
  const runtimeCatalog = await Effect.runPromise(sourceBoundary.catalog!());
  if (!runtimeCatalog) throw new Error("Live journey probe could not compose the Pi catalog.");
  let prepareCount = 0;
  let attemptCount = 0;
  const engineAttemptGuard = new EngineAttemptGuard();
  const proofOrder: Array<"assistant" | "settlement"> = [];
  let openCodePrepareCount = 0;
  let openCodeAttemptCount = 0;
  const guardedNative = singleChat
    ? {
        ...sourceBoundary,
        prepare: (request: Parameters<NonNullable<typeof sourceBoundary.prepare>>[0]) => {
          prepareCount += 1;
          return sourceBoundary.prepare!(request);
        },
        attempt: (request: Parameters<typeof sourceBoundary.attempt>[0]) => {
          attemptCount += 1;
          engineAttemptGuard.markAttempt();
          return sourceBoundary.attempt(request);
        },
        subscribeFacts: (
          listener: Parameters<NonNullable<typeof sourceBoundary.subscribeFacts>>[0],
        ) =>
          sourceBoundary.subscribeFacts!((runId, update) => {
            const projected = update as {
              readonly firstFact?: { readonly kind: string };
              readonly facts?: ReadonlyArray<{ readonly kind: string }>;
            };
            const facts = projected.firstFact ? [projected.firstFact] : (projected.facts ?? []);
            for (const fact of facts) {
              if (fact.kind === "assistant.delta") proofOrder.push("assistant");
              if (fact.kind === "settlement") proofOrder.push("settlement");
            }
            listener(runId, update);
          }),
      }
    : sourceBoundary;
  const openCodeSibling: ProductExecutionBoundary = {
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
  const boundary = singleChat
    ? makeProductExecutionGateway({
        native: { engineId: "pi", boundary: guardedNative },
        external: { engineId: "opencode", boundary: openCodeSibling },
        composeCatalog: (native) => native,
      })
    : sourceBoundary;
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
    runtimeChoice: {
      kind: "product-model",
      runtimeModelId: selected.id,
      thinking: selected.thinkingLevels.includes("medium")
        ? "medium"
        : (selected.thinkingLevels[0] ?? null),
    },
    permissionPolicy: "approval-required",
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

  let disposed = false;
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
      singleChat
        ? "Reply with one short visible confirmation."
        : `Use the todo tool exactly once with action "add" and text "${PRIVATE_TODO_CANARY}". After the tool succeeds, reply with one short confirmation.`,
      selection(null),
    );
    const firstChatState = firstChat.snapshot.readModel.runs.find(
      (run) => run.id === firstChat.ids.runId,
    )?.receipt.receipt.state;
    if (firstChatState !== "settled") {
      throw new Error("Live journey probe Chat Run did not settle successfully.");
    }
    if (singleChat) {
      const run = firstChat.snapshot.readModel.runs.find(
        (candidateRun) => candidateRun.id === firstChat.ids.runId,
      );
      const assistants = firstChat.snapshot.readModel.entries.filter(
        (entry) => entry.runId === firstChat.ids.runId && entry.role === "assistant",
      );
      const settlements = firstChat.snapshot.readModel.activities.filter(
        (activity) =>
          activity.runId === firstChat.ids.runId && activity.detail.code === "run-settled",
      );
      const outbox = await runtime.runPromise(controlPlane.inspectOutbox());
      const snapshot = buildPiSingleChatProof({
        candidate: candidate!,
        runtimeVersion: catalog.runtimeVersion,
        packageGenerationMatched:
          lifecycle.snapshot().currentGeneration === runtimeCatalog.packageGeneration,
        receipt: run?.receipt.receipt ?? null,
        assistantTexts: assistants.map((entry) => entry.text),
        runSettledActivityCount: settlements.length,
        proofOrder,
        outbox,
        prepareCount,
        attemptCount,
        engineAttemptGuardCount: engineAttemptGuard.count,
        siblingPrepareCount: openCodePrepareCount,
        siblingAttemptCount: openCodeAttemptCount,
      });
      const final = await persistSnapshotThenCleanupThenFinalize({
        snapshot,
        persistSnapshot: async (value) => {
          writeFileSync(`${resultFile}.snapshot`, `${JSON.stringify(value, null, 2)}\n`, {
            encoding: "utf8",
            flag: "wx",
            mode: 0o600,
          });
        },
        cleanup: async () => {
          await runtime.dispose();
          disposed = true;
        },
        finalize: (value, cleanupComplete) => ({ ...value, cleanupComplete }),
        persistFinal: async (value) => {
          writeFileSync(resultFile, `${JSON.stringify(value, null, 2)}\n`, {
            encoding: "utf8",
            flag: "wx",
            mode: 0o600,
          });
        },
      });
      process.exitCode = piSingleChatProofExitCode(final);
      return;
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
    if (!disposed) await runtime.dispose();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
