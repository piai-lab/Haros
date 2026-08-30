import {
  DEFAULT_MODEL_BY_ENGINE,
  HarosCreateThreadsInput,
  HarosWaitForThreadsInput,
  ENGINE_KINDS,
  type EngineSelection,
  type EngineKind,
} from "@harnessos/contracts";
import { Schema } from "effect";

import { HOST_GATEWAY_TARGET_OPTIONS_DESCRIPTION } from "./targetResolver.ts";

export { ENGINE_KINDS };

export const MODEL_SELECTION_INPUT_SCHEMA = {
  type: "object",
  description: HOST_GATEWAY_TARGET_OPTIONS_DESCRIPTION,
  properties: {
    engine: { type: "string", enum: [...ENGINE_KINDS] },
    model: {
      type: "string",
      description: "Exact model slug from harnessos_capabilities engines[].models[].slug.",
    },
    options: {
      type: "object",
      description: HOST_GATEWAY_TARGET_OPTIONS_DESCRIPTION,
    },
  },
  required: ["engine", "model"],
  additionalProperties: false,
} as const;

export class ToolInputError extends Error {}

export const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export function readStringArg(
  args: Record<string, unknown>,
  name: string,
  options?: { readonly required?: boolean },
): string | undefined {
  const value = args[name];
  if (value === undefined || value === null) {
    if (options?.required) throw new ToolInputError(`Missing required argument "${name}".`);
    return undefined;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ToolInputError(`Argument "${name}" must be a non-empty string.`);
  }
  return value.trim();
}

export function readNumberArg(args: Record<string, unknown>, name: string): number | undefined {
  const value = args[name];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ToolInputError(`Argument "${name}" must be a number.`);
  }
  return value;
}

export function readBooleanArg(args: Record<string, unknown>, name: string): boolean | undefined {
  const value = args[name];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    throw new ToolInputError(`Argument "${name}" must be a boolean.`);
  }
  return value;
}

export function readIsoTimestampArg(
  args: Record<string, unknown>,
  name: string,
): string | undefined {
  const value = readStringArg(args, name);
  if (value === undefined) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new ToolInputError(`Argument "${name}" must be a valid ISO timestamp.`);
  }
  return new Date(timestamp).toISOString();
}

export function readRecordArg(
  args: Record<string, unknown>,
  name: string,
): Record<string, unknown> | undefined {
  const value = args[name];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ToolInputError(`Argument "${name}" must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function readStringArrayArg(
  args: Record<string, unknown>,
  name: string,
): ReadonlyArray<string> | undefined {
  const value = args[name];
  if (value === undefined || value === null) return undefined;
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)
  ) {
    throw new ToolInputError(`Argument "${name}" must be an array of non-empty strings.`);
  }
  return value.map((entry) => (entry as string).trim());
}

export function parseProviderKind(raw: string): EngineKind {
  if ((ENGINE_KINDS as ReadonlyArray<string>).includes(raw)) {
    return raw as EngineKind;
  }
  throw new ToolInputError(
    `Unknown engine "${raw}". Supported engines: ${ENGINE_KINDS.join(", ")}.`,
  );
}

export function buildEngineSelection(
  engine: EngineKind,
  model: string | undefined,
): EngineSelection {
  const effectiveModel =
    model ?? (engine === "pi" || engine === "oa" ? undefined : DEFAULT_MODEL_BY_ENGINE[engine]);
  if (!effectiveModel) {
    throw new ToolInputError(
      `Engine "${engine}" has no default model; pass an explicit "model" argument.`,
    );
  }
  return { engine, model: effectiveModel } as EngineSelection;
}

export function decodeCreateThreadsInput(value: unknown) {
  try {
    return Schema.decodeUnknownSync(HarosCreateThreadsInput)(value);
  } catch (error) {
    throw new ToolInputError(`Invalid Haros creation plan: ${errorText(error)}`);
  }
}

export function decodeWaitForThreadsInput(value: unknown) {
  try {
    return Schema.decodeUnknownSync(HarosWaitForThreadsInput)(value);
  } catch (error) {
    throw new ToolInputError(`Invalid Haros wait request: ${errorText(error)}`);
  }
}
