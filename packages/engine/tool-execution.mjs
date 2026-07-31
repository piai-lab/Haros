import { createHash } from "node:crypto";

const LARGE_RESULT_BYTES = 64 * 1024;

export class ToolExecutionError extends Error {
  constructor(code, message, receipt) {
    super(message);
    this.name = "ToolExecutionError";
    this.code = code;
    this.receipt = receipt;
  }
}

function normalizeProgress(update) {
  if (typeof update === "string") return { message: update };
  if (!update || typeof update !== "object" || typeof update.message !== "string") {
    throw new ToolExecutionError("TOOL_PROGRESS_INVALID", "tool progress update is invalid", null);
  }
  const progress = { message: update.message };
  if (update.fraction !== undefined) {
    if (
      typeof update.fraction !== "number" ||
      !Number.isFinite(update.fraction) ||
      update.fraction < 0 ||
      update.fraction > 1
    ) {
      throw new ToolExecutionError("TOOL_PROGRESS_INVALID", "tool progress fraction is invalid", null);
    }
    progress.fraction = update.fraction;
  }
  return progress;
}

function serializeResult(result) {
  try {
    const serialized = JSON.stringify(result ?? null);
    return { serialized, digest: createHash("sha256").update(serialized).digest("hex") };
  } catch {
    throw new ToolExecutionError(
      "TOOL_RESULT_INVALID",
      "tool result must be JSON serializable",
      null,
    );
  }
}

function abortError(error, signal) {
  return signal?.aborted || error?.name === "AbortError" || error?.code === "ABORT_ERR";
}

async function emit(onEvent, event) {
  if (!onEvent) return;
  const snapshot = JSON.parse(JSON.stringify(event));
  const freeze = (value) => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  };
  try {
    await onEvent(freeze(snapshot));
  } catch {
    // Projection delivery cannot change the tool's product receipt.
  }
}

function durableSettlement(receipt) {
  const { outputRefs, ...durable } = receipt;
  return { ...durable, outputRefIds: outputRefs.map((outputRef) => outputRef.outputId) };
}

function requireNotAborted(signal) {
  if (!signal?.aborted) return;
  const error = new Error("aborted");
  error.name = "AbortError";
  throw error;
}

export async function executeActiveTool({
  registry,
  generationId,
  journal,
  outputStore,
  turnId,
  attemptId,
  actionId,
  toolId,
  input,
  signal,
  onEvent,
  largeResultBytes = LARGE_RESULT_BYTES,
}) {
  const tool = registry.tool(toolId);
  if (!tool || !registry.activeToolIds().includes(toolId)) {
    throw new ToolExecutionError("TOOL_NOT_ACTIVE", "requested tool is not active", null);
  }

  const base = { turnId, attemptId, actionId };
  const outputRefs = [];
  let opaqueDispatch = false;
  let outputDispatch = false;
  let outputWriteUnknown = false;

  await journal.append({
    type: "action_proposed",
    ...base,
    toolId,
    effect: tool.effect,
    generationId,
  });
  await emit(onEvent, { type: "action", actionId, lifecycle: "proposed", toolId });
  await journal.append({
    type: "action_policy_decided",
    ...base,
    decision: "allow",
  });

  if (signal?.aborted) {
    const receipt = {
      ...base,
      toolId,
      generationId,
      dispatchCertainty: "not_dispatched",
      settlement: tool.effect === "write" || tool.effect === "external"
        ? "failed_before_dispatch"
        : "settled",
      outcome: "cancelled",
      outputRefs,
    };
    await journal.append({ type: "action_settled", ...durableSettlement(receipt) });
    await emit(onEvent, { type: "action", actionId, lifecycle: "settled", ...receipt });
    throw new ToolExecutionError("TOOL_CANCELLED", "tool execution was cancelled", receipt);
  }

  await journal.append({ type: "action_started", ...base });
  await emit(onEvent, { type: "action", actionId, lifecycle: "started", toolId });

  const recordDispatch = async (kind) => {
    await journal.append({ type: "action_dispatched", ...base, kind });
    await emit(onEvent, { type: "action", actionId, lifecycle: "dispatched", kind });
  };

  const context = Object.freeze({
    signal,
    async progress(update) {
      requireNotAborted(signal);
      const progress = normalizeProgress(update);
      await journal.append({ type: "action_progress", ...base, ...progress });
      await emit(onEvent, { type: "progress", actionId, ...progress });
    },
    async markDispatched() {
      requireNotAborted(signal);
      if (!opaqueDispatch) {
        opaqueDispatch = true;
        await recordDispatch("opaque");
      }
    },
    async publishOutput({ name, mimeType, bytes }) {
      requireNotAborted(signal);
      outputDispatch = true;
      await recordDispatch("output");
      let outputRef;
      try {
        outputRef = await outputStore.write({
          threadId: journal.threadId,
          attemptId,
          actionId,
          name,
          mimeType,
          bytes,
        });
      } catch (error) {
        outputWriteUnknown = error?.outcomeUnknown === true;
        throw error;
      }
      outputRefs.push(outputRef);
      await journal.append({ type: "output_created", ...base, outputRef });
      await emit(onEvent, { type: "output", actionId, outputRef });
      return outputRef;
    },
  });

  try {
    let result = await tool.execute(input, context);
    let { serialized, digest } = serializeResult(result);

    if (Buffer.byteLength(serialized) > largeResultBytes) {
      const outputRef = await context.publishOutput({
        name: "tool-result.json",
        mimeType: "application/json",
        bytes: `${serialized}\n`,
      });
      result = { outputRef };
      ({ serialized, digest } = serializeResult(result));
    }

    const receipt = {
      ...base,
      toolId,
      generationId,
      dispatchCertainty: opaqueDispatch || outputRefs.length > 0 ? "acknowledged" : "not_dispatched",
      settlement: "settled",
      outcome: "succeeded",
      resultDigest: digest,
      outputRefs,
    };
    await journal.append({ type: "action_settled", ...durableSettlement(receipt) });
    await emit(onEvent, { type: "action", actionId, lifecycle: "settled", ...receipt });
    return { result, receipt };
  } catch (error) {
    const cancelled = abortError(error, signal);
    const unknown = opaqueDispatch || outputWriteUnknown;
    let settlement = "settled";
    if (unknown) {
      settlement = "outcome_unknown";
    } else if (!outputDispatch && (tool.effect === "write" || tool.effect === "external")) {
      settlement = "failed_before_dispatch";
    }
    const receipt = {
      ...base,
      toolId,
      generationId,
      dispatchCertainty: unknown || outputDispatch ? "dispatched" : "not_dispatched",
      settlement,
      outcome: cancelled ? "cancelled" : "failed",
      outputRefs,
    };
    await journal.append({ type: "action_settled", ...durableSettlement(receipt) });
    await emit(onEvent, { type: "action", actionId, lifecycle: "settled", ...receipt });
    throw new ToolExecutionError(
      cancelled ? "TOOL_CANCELLED" : "TOOL_FAILED",
      cancelled ? "tool execution was cancelled" : "tool execution failed",
      receipt,
    );
  }
}
