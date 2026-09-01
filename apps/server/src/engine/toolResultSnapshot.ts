import {
  TOOL_ACTIVITY_JSON_MAX_BYTES,
  TOOL_INPUT_PREVIEW_BYTES,
  TOOL_RESULT_PREVIEW_BYTES,
  TOOL_RESULT_PREVIEW_HEAD_BYTES,
  TOOL_RESULT_PREVIEW_TAIL_BYTES,
  type EngineToolActionKind,
  type ToolResultSnapshotV1,
  type ToolTextPreviewV1,
} from "@harnessos/contracts";

import { redactSensitiveEngineData } from "./unmappedEngineEvents.ts";

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function utf8Prefix(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.byteLength <= maxBytes) return value;
  return bytes
    .subarray(0, maxBytes)
    .toString("utf8")
    .replace(/\uFFFD$/u, "");
}

function utf8Suffix(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.byteLength <= maxBytes) return value;
  return bytes
    .subarray(bytes.byteLength - maxBytes)
    .toString("utf8")
    .replace(/^\uFFFD+/u, "");
}

export function clipToolText(
  value: string,
  maxBytes = TOOL_RESULT_PREVIEW_BYTES,
  headBytes = TOOL_RESULT_PREVIEW_HEAD_BYTES,
  tailBytes = TOOL_RESULT_PREVIEW_TAIL_BYTES,
): ToolTextPreviewV1 {
  const originalBytes = Buffer.byteLength(value, "utf8");
  if (originalBytes <= maxBytes) return { head: value, clipped: false, originalBytes };
  const normalizedHeadBytes = Math.min(maxBytes, Math.max(0, headBytes));
  const normalizedTailBytes = Math.min(
    Math.max(0, maxBytes - normalizedHeadBytes),
    Math.max(0, tailBytes),
  );
  return {
    head: utf8Prefix(value, normalizedHeadBytes),
    ...(normalizedTailBytes > 0 ? { tail: utf8Suffix(value, normalizedTailBytes) } : {}),
    clipped: true,
    originalBytes,
  };
}

export function appendToolTextPreview(
  preview: ToolTextPreviewV1 | undefined,
  delta: string,
): ToolTextPreviewV1 {
  if (!preview) return clipToolText(delta);
  if (!preview.clipped) return clipToolText(`${preview.head}${delta}`);
  return {
    head: preview.head,
    tail: utf8Suffix(`${preview.tail ?? ""}${delta}`, TOOL_RESULT_PREVIEW_TAIL_BYTES),
    clipped: true,
    originalBytes: preview.originalBytes + Buffer.byteLength(delta, "utf8"),
  };
}

function toolResultText(result: unknown): string | undefined {
  if (typeof result === "string") return result;
  const value = record(result);
  if (!value) return undefined;
  if (Array.isArray(value.content)) {
    const parts = value.content.flatMap((block) => {
      const item = record(block);
      return item?.type === "text" && typeof item.text === "string" ? [item.text] : [];
    });
    if (parts.length > 0) return parts.join("\n\n");
  }
  for (const key of ["output", "text", "summary", "message", "error"] as const) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return undefined;
}

function serializedInput(args: unknown): string | undefined {
  if (args === undefined) return undefined;
  try {
    return JSON.stringify(redactSensitiveEngineData(args), null, 2);
  } catch {
    return undefined;
  }
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clipOutput(value: string, budget: number): ToolTextPreviewV1 {
  const head = Math.floor((budget * 3) / 4);
  return clipToolText(value, budget, head, budget - head);
}

function snapshotBytes(snapshot: ToolResultSnapshotV1): number {
  return Buffer.byteLength(JSON.stringify(snapshot), "utf8");
}

const SNAPSHOT_JSON_MAX_BYTES = TOOL_ACTIVITY_JSON_MAX_BYTES - 1024;

export function buildToolResultSnapshot(input: {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly actionKind: EngineToolActionKind;
  readonly args: unknown;
  readonly result?: unknown;
  readonly isError?: boolean;
  readonly process?: {
    readonly exitCode?: number;
    readonly stdout?: string;
    readonly stderr?: string;
  };
}): ToolResultSnapshotV1 {
  const safeResult = redactSensitiveEngineData(input.result);
  const resultRecord = record(safeResult);
  const resultText = input.result === undefined ? undefined : toolResultText(safeResult);
  const exitCode =
    finiteNumber(input.process?.exitCode) ??
    finiteNumber(resultRecord?.exitCode) ??
    finiteNumber(resultRecord?.code);
  const inputText = serializedInput(input.args);
  const build = (inputBudget: number, outputBudget: number): ToolResultSnapshotV1 => {
    const stdout =
      input.process?.stdout ??
      (typeof resultRecord?.stdout === "string" ? resultRecord.stdout : undefined);
    const stderr =
      input.process?.stderr ??
      (typeof resultRecord?.stderr === "string" ? resultRecord.stderr : undefined);
    const process =
      exitCode !== undefined || stdout !== undefined || stderr !== undefined
        ? {
            ...(exitCode !== undefined ? { exitCode } : {}),
            ...(stdout !== undefined
              ? { stdout: clipOutput(String(redactSensitiveEngineData(stdout)), outputBudget) }
              : {}),
            ...(stderr !== undefined
              ? { stderr: clipOutput(String(redactSensitiveEngineData(stderr)), outputBudget) }
              : {}),
          }
        : undefined;
    return {
      version: 1,
      toolCallId: input.toolCallId,
      toolName: input.toolName,
      actionKind: input.actionKind,
      ...(inputText !== undefined && inputBudget > 0
        ? { inputPreview: clipToolText(inputText, inputBudget, inputBudget, 0) }
        : {}),
      ...(input.result !== undefined
        ? {
            result: {
              ...(resultText !== undefined && outputBudget > 0
                ? { output: clipOutput(resultText, outputBudget) }
                : {}),
              ...(process ? { process } : {}),
              isError: input.isError === true,
            },
          }
        : {}),
    };
  };

  let snapshot = build(TOOL_INPUT_PREVIEW_BYTES, TOOL_RESULT_PREVIEW_BYTES);
  if (snapshotBytes(snapshot) <= SNAPSHOT_JSON_MAX_BYTES) return snapshot;
  for (let budget = TOOL_INPUT_PREVIEW_BYTES; budget >= 0; budget -= 256) {
    snapshot = build(budget, TOOL_RESULT_PREVIEW_BYTES);
    if (snapshotBytes(snapshot) <= SNAPSHOT_JSON_MAX_BYTES) return snapshot;
  }
  let low = 0;
  let high = TOOL_RESULT_PREVIEW_BYTES;
  let bounded = build(0, 0);
  while (low <= high) {
    const budget = Math.floor((low + high) / 2);
    const candidate = build(0, budget);
    if (snapshotBytes(candidate) <= SNAPSHOT_JSON_MAX_BYTES) {
      bounded = candidate;
      low = budget + 1;
    } else {
      high = budget - 1;
    }
  }
  return bounded;
}
