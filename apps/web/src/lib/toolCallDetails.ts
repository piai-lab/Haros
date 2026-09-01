// FILE: toolCallDetails.ts
// Purpose: Extract bounded command/tool details from Engine tool lifecycle payloads.
// Layer: Web transcript data utility
// Exports: deriveWorkLogToolDetails, mergeWorkLogToolDetails
// Depends on: Engine runtime item metadata already truncated by server ingestion

import {
  ToolResultSnapshotV1 as ToolResultSnapshotSchema,
  type EngineToolActionKind,
  type ToolLifecycleItemType,
  type ToolResultSnapshotV1,
  type ToolTextPreviewV1,
} from "@harnessos/contracts";
import { Schema } from "effect";

export interface WorkLogToolOutputDetails {
  output?: string;
  preview?: ToolTextPreviewV1;
  stdout?: string;
  stdoutPreview?: ToolTextPreviewV1;
  stderr?: string;
  stderrPreview?: ToolTextPreviewV1;
  exitCode?: number;
  truncated?: boolean;
}

export interface WorkLogToolDetails {
  kind: "command" | "file-change" | "web-access" | "tool";
  title: string;
  toolCallId?: string;
  toolName?: string;
  input?: string;
  inputPreview?: ToolTextPreviewV1;
  command?: string;
  output?: WorkLogToolOutputDetails;
  files?: ReadonlyArray<string>;
}

export type ToolActionKind = EngineToolActionKind;

type WorkLogRequestKind = "command" | "file-read" | "file-change" | "permissions";

export interface DeriveWorkLogToolDetailsInput {
  payload: Record<string, unknown> | null;
  itemType?: ToolLifecycleItemType | undefined;
  requestKind?: WorkLogRequestKind | undefined;
  command?: string | undefined;
  rawCommand?: string | undefined;
  detail?: string | undefined;
  changedFiles?: ReadonlyArray<string> | undefined;
  label: string;
  toolTitle?: string | undefined;
  toolName?: string | undefined;
  toolActionKind?: ToolActionKind | undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function readCanonicalToolResultSnapshot(
  payload: Record<string, unknown> | null,
): ToolResultSnapshotV1 | null {
  const data = asRecord(payload?.data);
  const snapshot = data?.toolResultSnapshot;
  return Schema.is(ToolResultSnapshotSchema)(snapshot) ? snapshot : null;
}

function canonicalSnapshot(payload: Record<string, unknown> | null) {
  const snapshot = readCanonicalToolResultSnapshot(payload);
  if (!snapshot) return undefined;

  const { toolCallId, toolName } = snapshot;
  const outputPreview = snapshot.result?.output;
  const stdoutPreview = snapshot.result?.process?.stdout;
  const stderrPreview = snapshot.result?.process?.stderr;
  const exitCode = snapshot.result?.process?.exitCode;
  const output: WorkLogToolOutputDetails | undefined =
    outputPreview || stdoutPreview || stderrPreview || exitCode !== undefined
      ? {
          ...(outputPreview ? { preview: outputPreview } : {}),
          ...(stdoutPreview ? { stdoutPreview } : {}),
          ...(stderrPreview ? { stderrPreview } : {}),
          ...(exitCode !== undefined ? { exitCode } : {}),
        }
      : undefined;

  return {
    toolCallId,
    toolName,
    inputPreview: snapshot.inputPreview,
    command: canonicalCommand(snapshot),
    output,
  };
}

function canonicalCommand(snapshot: ToolResultSnapshotV1): string | undefined {
  if (
    snapshot.actionKind !== "execute" ||
    !snapshot.inputPreview ||
    snapshot.inputPreview.clipped
  ) {
    return undefined;
  }
  try {
    const input = asRecord(JSON.parse(snapshot.inputPreview.head));
    return firstString(input?.command, input?.cmd);
  } catch {
    return undefined;
  }
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const normalized = asTrimmedString(value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

function firstOutputText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    if (value.trim().length === 0) {
      continue;
    }
    return value;
  }
  return undefined;
}

function asRawOutputRecord(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (record) {
    return record;
  }
  const output = firstOutputText(value);
  return output !== undefined ? { output } : null;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const normalized = asFiniteNumber(value);
    if (normalized !== undefined) {
      return normalized;
    }
  }
  return undefined;
}

function stripTrailingExitCode(value: string): {
  output: string | null;
  exitCode?: number | undefined;
} {
  const trimmed = value.trim();
  const match = /^(?<output>[\s\S]*?)(?:\s*<exited with exit code (?<code>\d+)>)\s*$/i.exec(
    trimmed,
  );
  if (!match?.groups) {
    return { output: value.trim().length > 0 ? value : null };
  }
  const exitCode = Number.parseInt(match.groups.code ?? "", 10);
  const output = value.replace(/\s*<exited with exit code \d+>\s*$/i, "");
  return {
    output: output.trim().length > 0 ? output : null,
    ...(Number.isInteger(exitCode) ? { exitCode } : {}),
  };
}

function outputText(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  return stripTrailingExitCode(value).output ?? undefined;
}

function outputExitCode(value: unknown): number | undefined {
  const normalized = asTrimmedString(value);
  return normalized ? stripTrailingExitCode(normalized).exitCode : undefined;
}

function commandEqualsDetail(command: string | undefined, detail: string | undefined): boolean {
  if (!command || !detail) {
    return false;
  }
  return command.trim() === stripTrailingExitCode(detail).output;
}

// Collects command output without stringifying the full payload; ingestion already bounds each field.
function extractToolOutputDetails(input: {
  payload: Record<string, unknown> | null;
  detail?: string | undefined;
  command?: string | undefined;
}): WorkLogToolOutputDetails | undefined {
  const data = asRecord(input.payload?.data);
  const rawOutput = asRawOutputRecord(data?.rawOutput);
  const rawOutputDetails = asRecord(rawOutput?.details);
  const item = asRecord(data?.item);
  const itemResult = asRecord(item?.result);
  const result = asRecord(data?.result);
  const partialResult = asRecord(data?.partialResult);
  const stdout = outputText(
    firstOutputText(
      rawOutput?.stdout,
      rawOutput?.out,
      data?.stdout,
      itemResult?.stdout,
      result?.stdout,
    ),
  );
  const stderr = outputText(
    firstOutputText(
      rawOutput?.stderr,
      rawOutput?.err,
      data?.stderr,
      itemResult?.stderr,
      result?.stderr,
    ),
  );
  let output = outputText(
    firstOutputText(
      rawOutput?.output,
      rawOutput?.content,
      data?.output,
      itemResult?.output,
      itemResult?.content,
      result?.output,
      result?.content,
      partialResult?.output,
      partialResult?.content,
      rawOutputDetails?.output,
    ),
  );
  if (
    !stdout &&
    !stderr &&
    !output &&
    input.detail &&
    !commandEqualsDetail(input.command, input.detail)
  ) {
    output = stripTrailingExitCode(input.detail).output ?? undefined;
  }
  const exitCode = firstNumber(
    rawOutput?.exitCode,
    rawOutput?.code,
    data?.exitCode,
    itemResult?.exitCode,
    result?.exitCode,
    outputExitCode(input.detail),
  );
  const truncated = rawOutput?.truncated === true || data?.__harnessosTruncated === true;
  const deduplicatedStdout = output !== undefined && output === stdout ? undefined : stdout;
  if (!deduplicatedStdout && !stderr && !output && exitCode === undefined && !truncated) {
    return undefined;
  }
  return {
    ...(output ? { output } : {}),
    ...(deduplicatedStdout ? { stdout: deduplicatedStdout } : {}),
    ...(stderr ? { stderr } : {}),
    ...(exitCode !== undefined ? { exitCode } : {}),
    ...(truncated ? { truncated } : {}),
  };
}

function detailsTitle(input: DeriveWorkLogToolDetailsInput): string {
  return input.toolTitle ?? input.label;
}

function shouldBuildCommandDetails(input: DeriveWorkLogToolDetailsInput): boolean {
  return (
    input.requestKind === "command" ||
    input.itemType === "command_execution" ||
    Boolean(input.command)
  );
}

function shouldBuildFileChangeDetails(input: DeriveWorkLogToolDetailsInput): boolean {
  return input.requestKind === "file-change" || input.itemType === "file_change";
}

const INSPECTABLE_WEB_ACCESS_INPUT_KEYS = new Set([
  "query",
  "queries",
  "claim",
  "numResults",
  "includeContent",
  "fetchContent",
  "recencyFilter",
  "domainFilter",
  "engine",
  "provider",
  "workflow",
  "url",
  "urls",
  "forceClone",
  "prompt",
  "mode",
  "timestamp",
  "frames",
  "model",
  "answerModel",
  "responseId",
  "queryIndex",
  "urlIndex",
  "offset",
  "limit",
  "findText",
  "findMode",
]);

function isPrivateLoopbackUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("127.")
    );
  } catch {
    return false;
  }
}

function inspectableInputRecord(value: unknown): Record<string, unknown> | null {
  const rawInput = asRecord(value);
  if (!rawInput) return null;
  const visibleEntries = Object.entries(rawInput).filter(([key, entry]) => {
    if (!INSPECTABLE_WEB_ACCESS_INPUT_KEYS.has(key)) return false;
    if ((key === "url" || key === "urls") && isPrivateLoopbackUrl(entry)) return false;
    if (key === "urls" && Array.isArray(entry)) {
      return entry.some((url) => !isPrivateLoopbackUrl(url));
    }
    return true;
  });
  const sanitized = Object.fromEntries(
    visibleEntries.map(([key, entry]) => [
      key,
      key === "urls" && Array.isArray(entry)
        ? entry.filter((url) => !isPrivateLoopbackUrl(url))
        : entry,
    ]),
  );
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function inspectableToolInput(
  payload: Record<string, unknown> | null,
  isWebAccess: boolean,
): Record<string, unknown> | null {
  if (!isWebAccess) return null;
  const data = asRecord(payload?.data);
  return inspectableInputRecord(data?.rawInput) ?? inspectableInputRecord(data?.input);
}

function inspectableCanonicalInput(
  snapshot: ToolResultSnapshotV1,
  isWebAccess: boolean,
): Record<string, unknown> | null {
  if (!isWebAccess) return null;
  if (!snapshot.inputPreview || snapshot.inputPreview.clipped) return null;
  try {
    return inspectableInputRecord(JSON.parse(snapshot.inputPreview.head));
  } catch {
    return null;
  }
}

function formatInspectableInput(value: Record<string, unknown> | null): string | undefined {
  if (!value) return undefined;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return undefined;
  }
}

export function deriveToolInvocationPreview(input: {
  payload: Record<string, unknown> | null;
  toolActionKind?: ToolActionKind | undefined;
}): string | null {
  const isWebAccess = input.toolActionKind === "webAccess";
  const snapshot = readCanonicalToolResultSnapshot(input.payload);
  const visibleInput = snapshot
    ? inspectableCanonicalInput(snapshot, isWebAccess)
    : inspectableToolInput(input.payload, isWebAccess);
  if (!visibleInput) return null;
  const candidate =
    asTrimmedString(visibleInput.query) ??
    (Array.isArray(visibleInput.queries)
      ? asTrimmedString(visibleInput.queries.find((value) => typeof value === "string"))
      : null) ??
    asTrimmedString(visibleInput.claim) ??
    asTrimmedString(visibleInput.url) ??
    (Array.isArray(visibleInput.urls)
      ? asTrimmedString(visibleInput.urls.find((value) => typeof value === "string"))
      : null) ??
    asTrimmedString(visibleInput.findText);
  return candidate && candidate.length > 160
    ? `${candidate.slice(0, 157).trimEnd()}...`
    : candidate;
}

export function deriveWorkLogToolDetails(
  input: DeriveWorkLogToolDetailsInput,
): WorkLogToolDetails | undefined {
  const canonical = canonicalSnapshot(input.payload);
  if (canonical) {
    const isWebAccess = input.toolActionKind === "webAccess";
    const canonicalInspectableInput = isWebAccess
      ? formatInspectableInput(
          inspectableCanonicalInput(readCanonicalToolResultSnapshot(input.payload)!, true),
        )
      : undefined;
    const inputText = isWebAccess
      ? canonicalInspectableInput
      : canonical.inputPreview
        ? `${canonical.inputPreview.head}${canonical.inputPreview.tail ?? ""}`
        : undefined;
    return {
      kind: shouldBuildCommandDetails(input)
        ? "command"
        : shouldBuildFileChangeDetails(input)
          ? "file-change"
          : isWebAccess
            ? "web-access"
            : "tool",
      title: detailsTitle(input),
      toolCallId: canonical.toolCallId,
      toolName: canonical.toolName,
      ...(canonical.command ? { command: canonical.command } : {}),
      ...(inputText
        ? {
            input: inputText,
            ...(!isWebAccess && canonical.inputPreview
              ? { inputPreview: canonical.inputPreview }
              : {}),
          }
        : {}),
      ...(canonical.output ? { output: canonical.output } : {}),
      ...(input.changedFiles?.length ? { files: input.changedFiles } : {}),
    };
  }

  const command = input.rawCommand ?? input.command;
  if (shouldBuildCommandDetails(input)) {
    const output = extractToolOutputDetails({
      payload: input.payload,
      detail: input.detail,
      command,
    });
    if (!command && !output) {
      return undefined;
    }
    return {
      kind: "command",
      title: detailsTitle(input),
      ...(command ? { command } : {}),
      ...(output ? { output } : {}),
    };
  }

  if (!shouldBuildFileChangeDetails(input)) {
    const toolName = input.toolName?.trim();
    const isWebAccess = input.toolActionKind === "webAccess";
    const inspectableInput = formatInspectableInput(
      inspectableToolInput(input.payload, isWebAccess),
    );
    const output = extractToolOutputDetails({
      payload: input.payload,
      detail: input.detail,
      command: undefined,
    });
    if (!toolName && !inspectableInput && !output) {
      return undefined;
    }
    return {
      kind: isWebAccess ? "web-access" : "tool",
      title: detailsTitle(input),
      ...(toolName ? { toolName } : {}),
      ...(inspectableInput ? { input: inspectableInput } : {}),
      ...(output ? { output } : {}),
    };
  }
  const output = extractToolOutputDetails({
    payload: input.payload,
    command: undefined,
  });
  const files = input.changedFiles?.length ? input.changedFiles : undefined;
  if (!output && !files) {
    return undefined;
  }
  return {
    kind: "file-change",
    title: detailsTitle(input),
    ...(files ? { files } : {}),
    ...(output ? { output } : {}),
  };
}

function mergeStringArrays(
  left: ReadonlyArray<string> | undefined,
  right: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  const merged = [...(left ?? []), ...(right ?? [])];
  return merged.length > 0 ? [...new Set(merged)] : undefined;
}

function mergeOutputs(
  left: WorkLogToolOutputDetails | undefined,
  right: WorkLogToolOutputDetails | undefined,
): WorkLogToolOutputDetails | undefined {
  if (!left) return right;
  if (!right) return left;
  return {
    ...(left.output || right.output ? { output: right.output ?? left.output } : {}),
    ...(left.preview || right.preview ? { preview: right.preview ?? left.preview } : {}),
    ...(left.stdout || right.stdout ? { stdout: right.stdout ?? left.stdout } : {}),
    ...(left.stdoutPreview || right.stdoutPreview
      ? { stdoutPreview: right.stdoutPreview ?? left.stdoutPreview }
      : {}),
    ...(left.stderr || right.stderr ? { stderr: right.stderr ?? left.stderr } : {}),
    ...(left.stderrPreview || right.stderrPreview
      ? { stderrPreview: right.stderrPreview ?? left.stderrPreview }
      : {}),
    ...(left.exitCode !== undefined || right.exitCode !== undefined
      ? { exitCode: right.exitCode ?? left.exitCode }
      : {}),
    ...(left.truncated === true || right.truncated === true ? { truncated: true } : {}),
  };
}

export function mergeWorkLogToolDetails(
  left: WorkLogToolDetails | undefined,
  right: WorkLogToolDetails | undefined,
): WorkLogToolDetails | undefined {
  if (!left) return right;
  if (!right) return left;
  if (left.kind !== right.kind) return right;
  const output = mergeOutputs(left.output, right.output);
  const files = mergeStringArrays(left.files, right.files);
  return {
    kind: right.kind,
    title: right.title || left.title,
    ...((right.toolCallId ?? left.toolCallId)
      ? { toolCallId: right.toolCallId ?? left.toolCallId }
      : {}),
    ...((right.toolName ?? left.toolName) ? { toolName: right.toolName ?? left.toolName } : {}),
    ...((right.input ?? left.input) ? { input: right.input ?? left.input } : {}),
    ...((right.inputPreview ?? left.inputPreview)
      ? { inputPreview: right.inputPreview ?? left.inputPreview }
      : {}),
    ...((right.command ?? left.command) ? { command: right.command ?? left.command } : {}),
    ...(output ? { output } : {}),
    ...(files ? { files } : {}),
  };
}
