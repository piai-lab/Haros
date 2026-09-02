import { createHash } from "node:crypto";

import type { InlineExtension, ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { EngineWorkSurface, EngineInteractionMode } from "@harnessos/contracts";

import { ENGINE_DEBUG_MODE_PROMPT_PREFIX } from "./debugMode.ts";
import { buildProviderGoalPrompt } from "./goalMode.ts";
import { providerInteractionModeEnvelope } from "./interactionMode.ts";
import { ENGINE_PLAN_MODE_PROMPT_PREFIX } from "./planMode.ts";

export const HARNESSOS_PROMPT_PROJECTION_VERSION = "1";
export const HARNESSOS_STABLE_PREFIX_BOUNDARY = "<harnessos_stable_prefix_end />";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalValue(child)]),
  );
}

export function stableCoreToolsetHash(
  tools: ReadonlyArray<Pick<ToolDefinition, "name" | "description" | "parameters">>,
): string {
  return sha256(
    JSON.stringify(
      tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: canonicalValue(tool.parameters),
      })),
    ),
  );
}

export interface HarosTurnPromptSnapshot {
  readonly surface: EngineWorkSurface;
  readonly mode: EngineInteractionMode;
  readonly runtimeAccess: "read_only" | "read_write";
  readonly firmwareVersion: string;
  readonly modePolicyVersion: string;
  readonly stableToolsetHash: string;
  readonly goal?: { readonly version: string; readonly objective: string };
}

export interface HarosPromptPolicyController {
  readonly current: () => HarosTurnPromptSnapshot | undefined;
  readonly activate: (snapshot: HarosTurnPromptSnapshot) => void;
  readonly deactivate: () => void;
}

export function createHarosPromptPolicyController(): HarosPromptPolicyController {
  let snapshot: HarosTurnPromptSnapshot | undefined;
  return {
    current: () => snapshot,
    activate: (next) => {
      snapshot = Object.freeze({
        ...next,
        ...(next.goal === undefined ? {} : { goal: Object.freeze({ ...next.goal }) }),
      });
    },
    deactivate: () => {
      snapshot = undefined;
    },
  };
}

export function goalVersion(objective: string): string {
  return sha256(objective.trim());
}

export function modePolicy(mode: EngineInteractionMode): string {
  if (mode === "plan") return ENGINE_PLAN_MODE_PROMPT_PREFIX;
  if (mode === "debug") return ENGINE_DEBUG_MODE_PROMPT_PREFIX;
  return (
    providerInteractionModeEnvelope(mode) ??
    "Operate in Haros Default mode. Work toward the user's actual outcome, preserve unrelated state, and verify results in proportion to risk."
  );
}

export function modePolicyVersion(mode: EngineInteractionMode): string {
  return sha256(modePolicy(mode));
}

function dispatchState(snapshot: HarosTurnPromptSnapshot): string {
  return [
    "<harnessos_dispatch_state>",
    `surface=${snapshot.surface}`,
    `mode=${snapshot.mode}`,
    `runtime_access=${snapshot.runtimeAccess}`,
    `firmware_version=${snapshot.firmwareVersion}`,
    `mode_policy_version=${snapshot.modePolicyVersion}`,
    `stable_toolset_hash=${snapshot.stableToolsetHash}`,
    `goal_version=${snapshot.goal?.version ?? "none"}`,
    "</harnessos_dispatch_state>",
  ].join("\n");
}

function promptCacheProfile(model: { readonly api?: string; readonly compat?: unknown }): string {
  const compat =
    model.compat && typeof model.compat === "object"
      ? (model.compat as Record<string, unknown>)
      : undefined;
  return model.api === "openai-responses" && compat?.supportsExplicitPromptCacheMode === true
    ? "breakpoint-v1"
    : "legacy";
}

export function harosProviderCacheMode(model: {
  readonly api?: string;
  readonly compat?: unknown;
}): string {
  if (model.api === "openai-responses") {
    return promptCacheProfile(model) === "breakpoint-v1"
      ? "openai-explicit-short"
      : "openai-automatic-short";
  }
  if (model.api === "openai-codex-responses") return "openai-automatic-short";
  if (model.api === "anthropic-messages") return "anthropic-ephemeral";
  return "provider-implicit";
}

function isOpenAIResponsesApi(api: string | undefined): boolean {
  return api === "openai-responses" || api === "openai-codex-responses";
}

export function makeHarosCacheFamily(input: {
  readonly snapshot: HarosTurnPromptSnapshot;
  readonly model: {
    readonly provider: string;
    readonly id: string;
    readonly api?: string;
    readonly compat?: unknown;
  };
}): string {
  const material = [
    input.model.provider,
    input.model.id,
    input.model.api ?? "unknown",
    promptCacheProfile(input.model),
    input.snapshot.surface,
    input.snapshot.modePolicyVersion,
    input.snapshot.firmwareVersion,
    input.snapshot.stableToolsetHash,
    HARNESSOS_PROMPT_PROJECTION_VERSION,
  ].join("\0");
  return `om-${sha256(material).slice(0, 40)}`;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function splitTextAtBoundary(text: string): [string, string] | null {
  const index = text.indexOf(HARNESSOS_STABLE_PREFIX_BOUNDARY);
  if (index < 0) return null;
  return [
    text.slice(0, index).trimEnd(),
    text.slice(index + HARNESSOS_STABLE_PREFIX_BOUNDARY.length).trimStart(),
  ];
}

type BoundaryProjection = {
  readonly value: unknown;
  readonly changed: boolean;
};

function stripBoundaryFromText(text: string): BoundaryProjection {
  const split = splitTextAtBoundary(text);
  if (!split) return { value: text, changed: false };
  const [stable, dynamic] = split;
  return {
    value: dynamic.length > 0 ? `${stable}\n\n${dynamic}` : stable,
    changed: true,
  };
}

function stripBoundaryFromTextBlocks(value: unknown): BoundaryProjection {
  if (typeof value === "string") return stripBoundaryFromText(value);
  if (!Array.isArray(value)) return { value, changed: false };
  const blocks = [...value];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (typeof block === "string") {
      const projected = stripBoundaryFromText(block);
      if (!projected.changed) continue;
      blocks[index] = projected.value;
      return { value: blocks, changed: true };
    }
    if (!isRecord(block) || typeof block.text !== "string") continue;
    const projected = stripBoundaryFromText(block.text);
    if (!projected.changed) continue;
    blocks[index] = { ...block, text: projected.value };
    return { value: blocks, changed: true };
  }
  return { value, changed: false };
}

function stripBoundaryFromRoleMessages(value: unknown): BoundaryProjection {
  if (!Array.isArray(value)) return { value, changed: false };
  const messages = [...value];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (!isRecord(message) || (message.role !== "system" && message.role !== "developer")) {
      continue;
    }
    const projected = stripBoundaryFromTextBlocks(message.content);
    if (!projected.changed) continue;
    messages[index] = { ...message, content: projected.value };
    return { value: messages, changed: true };
  }
  return { value, changed: false };
}

/**
 * Remove only the Host-injected boundary from known Provider instruction
 * containers. User messages, Tool results and Tool schemas are data and must
 * remain byte-for-byte untouched even when they contain the same marker.
 */
function stripProviderSystemBoundary(payload: JsonRecord): JsonRecord {
  for (const key of ["instructions", "systemInstruction"] as const) {
    if (typeof payload[key] !== "string") continue;
    const projected = stripBoundaryFromText(payload[key]);
    if (projected.changed) return { ...payload, [key]: projected.value };
  }

  const system = stripBoundaryFromTextBlocks(payload.system);
  if (system.changed) return { ...payload, system: system.value };

  for (const key of ["input", "messages"] as const) {
    const projected = stripBoundaryFromRoleMessages(payload[key]);
    if (projected.changed) return { ...payload, [key]: projected.value };
  }

  if (isRecord(payload.context) && typeof payload.context.systemPrompt === "string") {
    const projected = stripBoundaryFromText(payload.context.systemPrompt);
    if (projected.changed) {
      return {
        ...payload,
        context: { ...payload.context, systemPrompt: projected.value },
      };
    }
  }
  return payload;
}

function projectOpenAIExplicitBreakpoint(payload: JsonRecord): JsonRecord {
  const input = Array.isArray(payload.input) ? [...payload.input] : null;
  if (!input) return stripProviderSystemBoundary(payload);
  for (let messageIndex = 0; messageIndex < input.length; messageIndex += 1) {
    const message = input[messageIndex];
    if (!isRecord(message) || (message.role !== "system" && message.role !== "developer")) {
      continue;
    }
    if (typeof message.content === "string") {
      const split = splitTextAtBoundary(message.content);
      if (!split) continue;
      const [stable, dynamic] = split;
      input[messageIndex] = {
        ...message,
        content: [
          {
            type: "input_text",
            text: stable,
            prompt_cache_breakpoint: { mode: "explicit" },
          },
          ...(dynamic.length > 0 ? [{ type: "input_text", text: dynamic }] : []),
        ],
      };
      return { ...payload, input };
    }
    if (!Array.isArray(message.content)) continue;
    const content = [...message.content];
    for (let blockIndex = 0; blockIndex < content.length; blockIndex += 1) {
      const block = content[blockIndex];
      if (!isRecord(block) || typeof block.text !== "string") continue;
      const split = splitTextAtBoundary(block.text);
      if (!split) continue;
      const [stable, dynamic] = split;
      const { prompt_cache_breakpoint: _existingBreakpoint, ...base } = block;
      content.splice(
        blockIndex,
        1,
        { ...base, text: stable, prompt_cache_breakpoint: { mode: "explicit" } },
        ...(dynamic.length > 0 ? [{ ...base, text: dynamic }] : []),
      );
      input[messageIndex] = { ...message, content };
      return { ...payload, input };
    }
  }
  return stripProviderSystemBoundary(payload);
}

function projectAnthropicSystemBoundary(payload: JsonRecord): JsonRecord {
  const system = Array.isArray(payload.system) ? [...payload.system] : null;
  if (!system) return stripProviderSystemBoundary(payload);
  for (let index = 0; index < system.length; index += 1) {
    const block = system[index];
    if (!isRecord(block) || typeof block.text !== "string") continue;
    const split = splitTextAtBoundary(block.text);
    if (!split) continue;
    const [stable, dynamic] = split;
    const { cache_control: _cacheControl, ...base } = block;
    const cacheControl = isRecord(block.cache_control)
      ? { cache_control: { type: "ephemeral" } }
      : {};
    system.splice(
      index,
      1,
      { ...base, text: stable, ...cacheControl },
      ...(dynamic.length > 0 ? [{ ...base, text: dynamic }] : []),
    );
    return { ...payload, system };
  }
  return stripProviderSystemBoundary(payload);
}

export function projectHarosProviderPrompt(input: {
  readonly payload: unknown;
  readonly snapshot: HarosTurnPromptSnapshot;
  readonly model: {
    readonly provider: string;
    readonly id: string;
    readonly api?: string;
    readonly compat?: unknown;
  };
}): unknown {
  if (!isRecord(input.payload)) return input.payload;
  if (isOpenAIResponsesApi(input.model.api)) {
    const profile = promptCacheProfile(input.model);
    const cacheEnabled = typeof input.payload.prompt_cache_key === "string";
    const projected =
      cacheEnabled && profile === "breakpoint-v1"
        ? projectOpenAIExplicitBreakpoint(input.payload)
        : stripProviderSystemBoundary(input.payload);
    if (projected === input.payload) return input.payload;
    if (!cacheEnabled) return projected;
    const cacheFamily = makeHarosCacheFamily({ snapshot: input.snapshot, model: input.model });
    if (profile === "legacy") {
      return { ...projected, prompt_cache_key: cacheFamily };
    }
    const { prompt_cache_retention: _legacyRetention, ...withoutLegacyRetention } = projected;
    return {
      ...withoutLegacyRetention,
      prompt_cache_key: cacheFamily,
      prompt_cache_options: { mode: "explicit", ttl: "30m" },
    };
  }
  if (input.model.api === "anthropic-messages") {
    return projectAnthropicSystemBoundary(input.payload);
  }
  return stripProviderSystemBoundary(input.payload);
}

export function makeHarosPromptPolicyExtension(
  controller: HarosPromptPolicyController,
  stableProductPrompt: string,
): InlineExtension {
  return {
    name: "harnessos-turn-prompt-policy",
    hidden: true,
    factory: (pi) => {
      pi.on("before_agent_start", (event) => {
        const snapshot = controller.current();
        if (!snapshot) return;
        const goalPrompt = buildProviderGoalPrompt(snapshot.goal?.objective);
        const stablePrefix = `${stableProductPrompt}\n\n`;
        const mutablePromptCandidate =
          stableProductPrompt.length === 0
            ? event.systemPrompt
            : event.systemPrompt === stableProductPrompt
              ? ""
              : event.systemPrompt.startsWith(stablePrefix)
                ? event.systemPrompt.slice(stablePrefix.length).trimStart()
                : event.systemPrompt;
        // The immutable Pi seam already guarantees the Product prefix. Strip
        // only the leading copy emitted by that seam. The same bytes later in
        // mutable instructions are user/Extension data and must be preserved.
        const mutablePrompt = mutablePromptCandidate.trim();
        return {
          systemPrompt: [
            stableProductPrompt,
            modePolicy(snapshot.mode),
            HARNESSOS_STABLE_PREFIX_BOUNDARY,
            mutablePrompt,
            dispatchState(snapshot),
            ...(goalPrompt === null ? [] : [goalPrompt]),
          ].join("\n\n"),
        };
      });
      pi.on("before_provider_request", (event, context) => {
        const snapshot = controller.current();
        const model = context.model;
        if (!snapshot || !model) return;
        return projectHarosProviderPrompt({ payload: event.payload, snapshot, model });
      });
    },
  };
}
