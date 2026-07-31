import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  digestArtifact,
  materializeGeneration,
} from "../packages/engine/artifact-generation.mjs";
import {
  activateGeneration,
  pinLastKnownGeneration,
} from "../packages/engine/generation-control.mjs";
import { preflightExtension } from "../packages/engine/extension-preflight.mjs";
import { loadPublicResources } from "../packages/engine/extension-resources.mjs";
import {
  executeActiveTool,
  ToolExecutionError,
} from "../packages/engine/tool-execution.mjs";
import {
  recoverThreadJournal,
  ThreadJournal,
} from "../packages/journal/thread-journal.mjs";
import { projectThread } from "../packages/journal/thread-projection.mjs";
import { OutputStore } from "../packages/outputs/output-store.mjs";

const ENTRY_SOURCE = `
export async function loadResources() {
  return {
    tools: [
      {
        id: "compose_note",
        description: "Compose a note as a generated file",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string" },
            mode: { type: "string" },
            large: { type: "boolean" }
          },
          required: ["text"],
          additionalProperties: false
        },
        effect: "write",
        async execute(input, context) {
          if (input.mode === "error_before_dispatch") throw new Error("expected failure");
          if (input.mode === "unknown_after_dispatch") {
            await context.markDispatched();
            throw new Error("response lost");
          }
          if (input.mode === "cancel_after_dispatch") {
            await context.markDispatched();
            await new Promise((resolve, reject) => {
              const abort = () => {
                const error = new Error("aborted");
                error.name = "AbortError";
                reject(error);
              };
              if (context.signal.aborted) abort();
              else context.signal.addEventListener("abort", abort, { once: true });
            });
          }
          await context.progress({ message: "Drafting", fraction: 0.5 });
          const outputRef = await context.publishOutput({
            name: "generated.md",
            mimeType: "text/markdown",
            bytes: input.text
          });
          if (input.mode === "error_after_output") throw new Error("post-write failure");
          if (input.large) return { value: "x".repeat(2048) };
          return { outputId: outputRef.outputId };
        }
      },
      {
        id: "inactive_tool",
        description: "A tool that must remain inactive",
        inputSchema: { type: "object", properties: {} },
        effect: "none",
        async execute() { return null; }
      }
    ]
  };
}
`;

async function createRuntime() {
  const root = await mkdtemp(path.join(tmpdir(), "tool-runtime-"));
  const artifactRoot = path.join(root, "artifact");
  const lineage = { source: "fixture:ordinary-writer", revision: "revision-1" };
  await mkdir(artifactRoot, { recursive: true });
  await writeFile(
    path.join(artifactRoot, "extension.json"),
    `${JSON.stringify({
      formatVersion: 1,
      apiVersion: 1,
      id: "ordinary-writer",
      entry: "index.mjs",
      headless: true,
      lineage,
      stateAuthority: "none",
      lifecycleScripts: [],
      nativeDependencies: [],
      permissions: ["write-output"],
      capabilities: ["tools"],
      hostBehaviors: [],
    })}\n`,
  );
  await writeFile(path.join(artifactRoot, "index.mjs"), ENTRY_SOURCE);
  const generation = await materializeGeneration({
    artifactRoot,
    expectedDigest: await digestArtifact(artifactRoot),
    expectedLineage: lineage,
    storeRoot: path.join(root, "generations"),
  });
  const report = await preflightExtension({
    generation,
    allowedPermissions: ["write-output"],
    allowedCapabilities: ["tools"],
  });
  const loaded = await loadPublicResources({
    generation,
    report,
    activeToolIds: ["compose_note"],
  });
  const journalRoot = path.join(root, "journal");
  const journal = await ThreadJournal.open({ root: journalRoot, threadId: "thread-1" });
  const outputStore = new OutputStore(path.join(root, "outputs"));
  await journal.append({ type: "thread_created" });
  await journal.append({ type: "turn_accepted", turnId: "turn-1" });
  await journal.append({ type: "attempt_started", turnId: "turn-1", attemptId: "attempt-1" });
  await activateGeneration({ journal, generationId: generation.generationId });
  return { root, generation, loaded, journalRoot, journal, outputStore };
}

function invocation(runtime, overrides = {}) {
  return {
    registry: runtime.loaded.registry,
    generationId: runtime.generation.generationId,
    journal: runtime.journal,
    outputStore: runtime.outputStore,
    turnId: "turn-1",
    attemptId: "attempt-1",
    actionId: overrides.actionId ?? "action-1",
    toolId: "compose_note",
    input: overrides.input ?? { text: "# Durable note\n" },
    signal: overrides.signal,
    onEvent: overrides.onEvent,
    largeResultBytes: overrides.largeResultBytes,
  };
}

test("streams an ordinary tool, persists an OutputRef, and restores the same Thread state", async () => {
  const runtime = await createRuntime();
  const visibleEvents = [];
  const execution = await executeActiveTool(
    invocation(runtime, { onEvent: (event) => visibleEvents.push(event) }),
  );
  await runtime.journal.append({
    type: "attempt_settled",
    turnId: "turn-1",
    attemptId: "attempt-1",
    outcome: "succeeded",
  });

  assert.equal(execution.receipt.settlement, "settled");
  assert.equal(execution.receipt.outcome, "succeeded");
  assert.equal(execution.receipt.outputRefs.length, 1);
  assert.ok(visibleEvents.some((event) => event.type === "progress" && event.message === "Drafting"));
  assert.ok(visibleEvents.some((event) => event.type === "output"));

  const beforeRestart = await recoverThreadJournal({
    root: runtime.journalRoot,
    threadId: "thread-1",
  });
  const firstProjection = projectThread("thread-1", beforeRestart.events);
  await ThreadJournal.open({ root: runtime.journalRoot, threadId: "thread-1" });
  const afterRestart = await recoverThreadJournal({
    root: runtime.journalRoot,
    threadId: "thread-1",
  });
  const restoredProjection = projectThread("thread-1", afterRestart.events, {
    recoverInterrupted: true,
  });

  assert.deepEqual(restoredProjection, firstProjection);
  assert.equal(restoredProjection.actions["action-1"].settlement, "settled");
  assert.equal(restoredProjection.outputs.length, 1);
  assert.equal(
    (await runtime.outputStore.read(restoredProjection.outputs[0])).toString("utf8"),
    "# Durable note\n",
  );
  const journalText = await readFile(beforeRestart.path, "utf8");
  assert.equal(journalText.includes("# Durable note"), false);
  assert.equal(journalText.includes("messages"), false);
  assert.equal(journalText.includes("package-owned"), false);
  const settlement = beforeRestart.events.find((event) => event.type === "action_settled");
  assert.deepEqual(settlement.outputRefIds, [restoredProjection.outputs[0].outputId]);
  assert.equal(Object.hasOwn(settlement, "outputRefs"), false);
});

test("keeps projection delivery failure separate from the tool receipt", async () => {
  const runtime = await createRuntime();
  const execution = await executeActiveTool(
    invocation(runtime, {
      onEvent() {
        throw new Error("renderer unavailable");
      },
    }),
  );
  assert.equal(execution.receipt.outcome, "succeeded");
  assert.equal(execution.receipt.outputRefs.length, 1);
});

test("records a failure before side-effect dispatch without inventing an unknown outcome", async () => {
  const runtime = await createRuntime();
  await assert.rejects(
    executeActiveTool(
      invocation(runtime, {
        input: { text: "unused", mode: "error_before_dispatch" },
      }),
    ),
    (error) =>
      error instanceof ToolExecutionError &&
      error.code === "TOOL_FAILED" &&
      error.receipt.settlement === "failed_before_dispatch" &&
      error.receipt.dispatchCertainty === "not_dispatched",
  );
});

test("keeps an error after opaque dispatch as outcome_unknown", async () => {
  const runtime = await createRuntime();
  await assert.rejects(
    executeActiveTool(
      invocation(runtime, {
        input: { text: "unused", mode: "unknown_after_dispatch" },
      }),
    ),
    (error) =>
      error instanceof ToolExecutionError &&
      error.receipt.settlement === "outcome_unknown" &&
      error.receipt.dispatchCertainty === "dispatched",
  );
  const recovered = await recoverThreadJournal({ root: runtime.journalRoot, threadId: "thread-1" });
  assert.equal(
    projectThread("thread-1", recovered.events).actions["action-1"].settlement,
    "outcome_unknown",
  );
});

test("keeps cancellation after dispatch unknown and cancellation before dispatch explicit", async () => {
  const runtime = await createRuntime();
  const controller = new AbortController();
  await assert.rejects(
    executeActiveTool(
      invocation(runtime, {
        actionId: "action-dispatched",
        input: { text: "unused", mode: "cancel_after_dispatch" },
        signal: controller.signal,
        onEvent(event) {
          if (event.type === "action" && event.lifecycle === "dispatched") controller.abort();
        },
      }),
    ),
    (error) =>
      error.code === "TOOL_CANCELLED" && error.receipt.settlement === "outcome_unknown",
  );

  const preCancelled = new AbortController();
  preCancelled.abort();
  await assert.rejects(
    executeActiveTool(
      invocation(runtime, {
        actionId: "action-pre-cancelled",
        input: { text: "unused" },
        signal: preCancelled.signal,
      }),
    ),
    (error) =>
      error.code === "TOOL_CANCELLED" &&
      error.receipt.settlement === "failed_before_dispatch",
  );
});

test("keeps a completed output receipt when later tool work fails", async () => {
  const runtime = await createRuntime();
  await assert.rejects(
    executeActiveTool(
      invocation(runtime, {
        input: { text: "written before failure", mode: "error_after_output" },
      }),
    ),
    (error) =>
      error.receipt.settlement === "settled" &&
      error.receipt.outcome === "failed" &&
      error.receipt.outputRefs.length === 1,
  );
  const recovered = await recoverThreadJournal({ root: runtime.journalRoot, threadId: "thread-1" });
  const state = projectThread("thread-1", recovered.events);
  assert.equal(state.outputs.length, 1);
  assert.equal((await runtime.outputStore.read(state.outputs[0])).toString(), "written before failure");
});

test("fences a large tool result behind a durable OutputRef", async () => {
  const runtime = await createRuntime();
  const execution = await executeActiveTool(
    invocation(runtime, {
      input: { text: "visible file", large: true },
      largeResultBytes: 128,
    }),
  );
  assert.deepEqual(Object.keys(execution.result), ["outputRef"]);
  assert.equal(execution.receipt.outputRefs.length, 2);
  assert.equal(execution.receipt.outputRefs[1].name, "tool-result.json");
  assert.ok((await runtime.outputStore.read(execution.receipt.outputRefs[1])).byteLength > 2048);
});

test("pins the last known generation and unloads only its projection without losing journal facts", async () => {
  const runtime = await createRuntime();
  await executeActiveTool(invocation(runtime));
  const nextGenerationId = runtime.generation.generationId === "e".repeat(64)
    ? "d".repeat(64)
    : "e".repeat(64);
  await activateGeneration({
    journal: runtime.journal,
    generationId: nextGenerationId,
    previousGenerationId: runtime.generation.generationId,
  });
  await pinLastKnownGeneration({
    journal: runtime.journal,
    failedGenerationId: nextGenerationId,
    lastKnownGenerationId: runtime.generation.generationId,
    reason: "health_check_failed",
  });

  const recovered = await recoverThreadJournal({ root: runtime.journalRoot, threadId: "thread-1" });
  const state = projectThread("thread-1", recovered.events, { recoverInterrupted: true });
  assert.equal(state.generation.current, runtime.generation.generationId);
  assert.equal(state.generation.pinned, runtime.generation.generationId);
  assert.deepEqual(state.generation.unloaded, [nextGenerationId]);
  assert.equal(state.actions["action-1"].outcome, "succeeded");
  assert.equal((await runtime.outputStore.read(state.outputs[0])).toString(), "# Durable note\n");
});

test("does not execute a registered but inactive tool", async () => {
  const runtime = await createRuntime();
  await assert.rejects(
    executeActiveTool({ ...invocation(runtime), toolId: "inactive_tool" }),
    (error) => error.code === "TOOL_NOT_ACTIVE" && error.receipt === null,
  );
  const recovered = await recoverThreadJournal({ root: runtime.journalRoot, threadId: "thread-1" });
  assert.equal(recovered.events.some((event) => event.type === "action_proposed"), false);
});

test("does not follow an OutputRef outside its owned store", async () => {
  const runtime = await createRuntime();
  await assert.rejects(
    runtime.outputStore.read({
      outputId: "outside",
      path: path.join(runtime.root, "outside.txt"),
      size: 0,
      digest: "0".repeat(64),
    }),
    (error) => error.code === "OUTPUT_PATH_INVALID",
  );
});
