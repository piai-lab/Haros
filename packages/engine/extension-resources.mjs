import { pathToFileURL } from "node:url";
import path from "node:path";
import { verifyGeneration } from "./artifact-generation.mjs";

const TOOL_ID_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const EFFECTS = new Set(["none", "read", "write", "external"]);
const RESOURCE_KEYS = new Set(["tools", "skills", "prompts", "commands", "activate", "dispose"]);

export class ExtensionResourceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ExtensionResourceError";
    this.code = code;
    this.details = details;
  }
}

function serialize(value, code, message) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    throw new ExtensionResourceError(
      code,
      message,
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function cloneJson(value, code, message) {
  const serialized = serialize(value, code, message);
  if (serialized === undefined) {
    throw new ExtensionResourceError(code, message);
  }
  return deepFreeze(JSON.parse(serialized));
}

function normalizeTool(tool) {
  if (!tool || typeof tool !== "object") {
    throw new ExtensionResourceError("TOOL_INVALID", "tool descriptor must be an object");
  }
  if (typeof tool.id !== "string" || !TOOL_ID_PATTERN.test(tool.id)) {
    throw new ExtensionResourceError("TOOL_ID_INVALID", "tool id is invalid");
  }
  if (typeof tool.description !== "string" || tool.description.length === 0) {
    throw new ExtensionResourceError("TOOL_DESCRIPTION_INVALID", "tool description is required", {
      toolId: tool.id,
    });
  }
  if (!tool.inputSchema || typeof tool.inputSchema !== "object" || Array.isArray(tool.inputSchema)) {
    throw new ExtensionResourceError("TOOL_SCHEMA_INVALID", "tool input schema is required", {
      toolId: tool.id,
    });
  }
  if (!EFFECTS.has(tool.effect)) {
    throw new ExtensionResourceError("TOOL_EFFECT_INVALID", "tool effect classification is invalid", {
      toolId: tool.id,
    });
  }
  if (typeof tool.execute !== "function") {
    throw new ExtensionResourceError("TOOL_EXECUTE_INVALID", "tool execute function is required", {
      toolId: tool.id,
    });
  }

  const inputSchema = cloneJson(
    tool.inputSchema,
    "TOOL_SCHEMA_NOT_SERIALIZABLE",
    "tool schema must be JSON serializable",
  );
  const providerDescriptor = deepFreeze({
    name: tool.id,
    description: tool.description,
    inputSchema,
  });
  const descriptorBytes = Buffer.byteLength(
    serialize(
      providerDescriptor,
      "TOOL_SCHEMA_NOT_SERIALIZABLE",
      "tool schema must be JSON serializable",
    ),
  );

  return Object.freeze({
    id: tool.id,
    description: tool.description,
    inputSchema,
    effect: tool.effect,
    execute: tool.execute,
    providerDescriptor,
    descriptorBytes,
  });
}

function validateResourceArray(value, name, { clone = true } = {}) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new ExtensionResourceError(
      "RESOURCE_COLLECTION_INVALID",
      `${name} resources must be an array`,
    );
  }
  return clone
    ? cloneJson(
        value,
        "RESOURCE_COLLECTION_NOT_SERIALIZABLE",
        `${name} resources must be JSON serializable`,
      )
    : value;
}

export class ActiveToolRegistry {
  #tools = new Map();
  #selected = new Set();

  constructor(activeToolIds = []) {
    this.setActive(activeToolIds);
  }

  register(tool, origin = "resource") {
    const normalized = normalizeTool(tool);
    if (this.#tools.has(normalized.id)) {
      throw new ExtensionResourceError("TOOL_ID_DUPLICATE", "tool id is already registered", {
        toolId: normalized.id,
      });
    }
    this.#tools.set(normalized.id, Object.freeze({ ...normalized, origin }));
    return normalized.id;
  }

  setActive(toolIds) {
    if (!Array.isArray(toolIds) || toolIds.some((toolId) => typeof toolId !== "string")) {
      throw new ExtensionResourceError(
        "ACTIVE_TOOL_SET_INVALID",
        "active tool ids must be an array of strings",
      );
    }
    this.#selected = new Set(toolIds);
  }

  activeToolIds() {
    return [...this.#tools.keys()].filter((toolId) => this.#selected.has(toolId));
  }

  registeredToolIds() {
    return [...this.#tools.keys()];
  }

  tool(toolId) {
    return this.#tools.get(toolId) ?? null;
  }

  requestDescriptors() {
    return this.activeToolIds().map((toolId) => this.#tools.get(toolId).providerDescriptor);
  }

  metrics() {
    const registeredDescriptorBytes = [...this.#tools.values()].reduce(
      (total, tool) => total + tool.descriptorBytes,
      0,
    );
    const activeDescriptorBytes = this.activeToolIds().reduce(
      (total, toolId) => total + this.#tools.get(toolId).descriptorBytes,
      0,
    );
    return {
      registeredToolCount: this.#tools.size,
      activeToolCount: this.activeToolIds().length,
      registeredDescriptorBytes,
      activeDescriptorBytes,
    };
  }
}

function ignoredKeys(resourceSet) {
  return Object.keys(resourceSet).filter((key) => !RESOURCE_KEYS.has(key)).sort();
}

export async function loadPublicResources({ generation, report, activeToolIds = [] }) {
  if (report?.verdict !== "supported") {
    throw new ExtensionResourceError(
      "PREFLIGHT_REQUIRED",
      "extension resources cannot load without a supported preflight report",
    );
  }
  if (
    report.generationId !== generation.generationId ||
    report.digest !== generation.digest ||
    report.entry === null
  ) {
    throw new ExtensionResourceError(
      "PREFLIGHT_GENERATION_MISMATCH",
      "preflight report does not match the requested generation",
    );
  }

  await verifyGeneration(generation);
  const registry = new ActiveToolRegistry(activeToolIds);
  const host = Object.freeze({
    apiVersion: 1,
    registerTool: (tool) => registry.register(tool, "dynamic"),
  });
  const entryUrl = pathToFileURL(path.join(generation.path, report.entry)).href;
  const publicModule = await import(entryUrl);

  if (typeof publicModule.loadResources !== "function") {
    throw new ExtensionResourceError(
      "PUBLIC_LOADER_MISSING",
      "public root module must export loadResources",
    );
  }

  const resourceSet = await publicModule.loadResources(host);
  if (!resourceSet || typeof resourceSet !== "object" || Array.isArray(resourceSet)) {
    throw new ExtensionResourceError(
      "RESOURCE_SET_INVALID",
      "public loader must return a resource set",
    );
  }

  for (const tool of validateResourceArray(resourceSet.tools, "tool", { clone: false })) {
    registry.register(tool, "public-loader");
  }
  const resources = Object.freeze({
    skills: validateResourceArray(resourceSet.skills, "skill"),
    prompts: validateResourceArray(resourceSet.prompts, "prompt"),
    commands: validateResourceArray(resourceSet.commands, "command"),
  });
  const nonAuthoritativeKeys = ignoredKeys(resourceSet);
  let activated = false;

  return Object.freeze({
    generationId: generation.generationId,
    registry,
    resources,
    nonAuthoritativeKeys,
    async activate() {
      if (activated) {
        throw new ExtensionResourceError(
          "RESOURCE_SET_ALREADY_ACTIVE",
          "resource set can only activate once",
        );
      }
      activated = true;
      if (resourceSet.activate === undefined) return { nonAuthoritativeKeys: [] };
      if (typeof resourceSet.activate !== "function") {
        throw new ExtensionResourceError(
          "RESOURCE_ACTIVATE_INVALID",
          "resource activation hook must be a function",
        );
      }
      const result = await resourceSet.activate(host);
      return {
        nonAuthoritativeKeys:
          result && typeof result === "object" && !Array.isArray(result)
            ? Object.keys(result).sort()
            : [],
      };
    },
    async dispose() {
      if (resourceSet.dispose === undefined) return;
      if (typeof resourceSet.dispose !== "function") {
        throw new ExtensionResourceError(
          "RESOURCE_DISPOSE_INVALID",
          "resource dispose hook must be a function",
        );
      }
      await resourceSet.dispose();
    },
  });
}

export function buildProviderRequest({ registry, messages }) {
  if (!Array.isArray(messages)) {
    throw new ExtensionResourceError("PROVIDER_MESSAGES_INVALID", "provider messages must be an array");
  }
  return {
    messages,
    tools: registry.requestDescriptors(),
    toolMetrics: registry.metrics(),
  };
}
