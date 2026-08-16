import crypto from "node:crypto";
import path from "node:path";
import {
  spawn as spawnChildProcess,
  type ChildProcess,
  type SpawnOptions,
} from "node:child_process";

import type {
  BashOperations,
  ModelRegistry,
  ModelRuntime,
  SessionManager,
  AgentSession as PiAgentSession,
  AgentSessionEvent,
  CreateAgentSessionRuntimeFactory,
  ExtensionUIContext,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import type { AgentToolResult, ThinkingLevel } from "@earendil-works/pi-agent-core";
import type { Api, ImageContent, Model, TextContent } from "@earendil-works/pi-ai";
import type { PromptOutcome as OmniMindPromptOutcome } from "@omnimind/pi-coding-agent";
import {
  ApprovalRequestId,
  type ChatAttachment,
  EventId,
  type ProviderComposerCapabilities,
  type ProviderListCommandsResult,
  type ProviderListModelsResult,
  type ProviderListSkillsResult,
  type ProviderKind,
  ProviderItemId,
  type ProviderRuntimeEvent,
  type ProviderSession,
  type ProviderUserInputAnswers,
  RuntimeItemId,
  RuntimeRequestId,
  ThreadId,
  type ThreadTokenUsageSnapshot,
  TurnId,
  type UserInputQuestion,
} from "@omnimind/contracts";
import { Effect, FileSystem, Layer, Option, Queue, Stream } from "effect";

import {
  providerHasOmniMindGatewayControl,
  renderOmniMindHarnessPolicy,
} from "../../agentGateway/harnessPolicy.ts";
import {
  callAgentGatewayMcpTool,
  listAgentGatewayMcpTools,
  type AgentGatewayMcpFetch,
} from "../../agentGateway/mcpInjection.ts";
import {
  AgentGatewayCredentials,
  type AgentGatewayMcpConnection,
} from "../../agentGateway/Services/AgentGatewayCredentials.ts";
import {
  acquireAgentGatewaySessionLease,
  cancelAgentGatewayTurn,
  releaseAgentGatewaySessionLeaseOnInterrupt,
  type AgentGatewaySessionLease,
  withAgentGatewayTurnCancellation,
} from "../../agentGateway/sessionLease.ts";
import { resolveProviderAttachmentPath } from "../providerAttachmentPaths.ts";
import { ServerConfig } from "../../config.ts";
import { lazyModule } from "../../lazyModule.ts";
import { buildProviderChildEnvironment } from "../../providerChildEnvironment.ts";
import {
  type ProviderAdapterError,
  ProviderAdapterRequestError,
  ProviderAdapterSessionClosedError,
  ProviderAdapterSessionNotFoundError,
  ProviderAdapterValidationError,
} from "../Errors.ts";
import { PiAdapter, type PiAdapterShape } from "../Services/PiAdapter.ts";
import { OmniMindAgentAdapter } from "../Services/OmniMindAgentAdapter.ts";
import {
  PROVIDER_ADAPTER_RUNTIME_EVENT_BUFFER_CAPACITY,
  type ProviderAdapterShape,
  type ProviderThreadSnapshot,
} from "../Services/ProviderAdapter.ts";
import { appendFileAttachmentsPromptBlock } from "../attachmentProjection.ts";
import { makeBoundedCallbackIngress } from "../boundedCallbackIngress.ts";
import { makeKeyedLock } from "../keyedLock.ts";
import { classifyPiTurnFailure } from "../piTurnFailure.ts";
import {
  compactProviderRuntimeEventForIngress,
  isTerminalProviderRuntimeEvent,
  PROVIDER_RUNTIME_CALLBACK_BUFFER_MAX_BYTES,
  PROVIDER_RUNTIME_CALLBACK_TERMINAL_RESERVE,
  providerRuntimeEventBytes,
} from "../providerRuntimeEventIngress.ts";
import { clampUsagePercent, nonNegativeFiniteNumber, positiveFiniteNumber } from "../tokenUsage.ts";
import { type EventNdjsonLogger, makeEventNdjsonLogger } from "./EventNdjsonLogger.ts";
import {
  teardownChildProcessTree,
  teardownProviderProcessTree,
} from "../supervisedProcessTeardown.ts";
import { BrowserAutomationHost } from "../../browserAutomation/Services/BrowserAutomationHost.ts";
import {
  engineWebSurfacePresentationMetadata,
  extractPiCuratorWebSurfaceUrl,
  registerEngineWebSurfaceIntent,
  sanitizeEngineWebSurfacePayload,
} from "../../engineWebSurface/engineWebSurfaceHost.ts";
import {
  createOmniMindModelsConfigReader,
  loadOmniMindCodingAgentModule,
  resolveOmniMindAgentDir,
} from "../omnimindAgentRuntime.ts";
import { getOmniMindModelRuntimeMutationRevision } from "../omnimindModelRuntimeMutation.ts";

type PiFamilyProvider = Extract<ProviderKind, "pi" | "omnimind">;
const DEFAULT_PI_THINKING_LEVEL: ThinkingLevel = "medium";
const PI_THINKING_OPTIONS: ReadonlyArray<{
  readonly value: ThinkingLevel;
  readonly label: string;
  readonly description: string;
  readonly isDefault?: true;
}> = [
  { value: "off", label: "Off", description: "No extra reasoning" },
  { value: "minimal", label: "Minimal", description: "Light reasoning" },
  { value: "low", label: "Low", description: "Faster reasoning" },
  { value: "medium", label: "Medium", description: "Balanced reasoning", isDefault: true },
  { value: "high", label: "High", description: "Deeper reasoning" },
  { value: "xhigh", label: "Extra High", description: "Extra-high reasoning" },
  { value: "max", label: "Max", description: "Maximum reasoning" },
];
const PI_DEFAULT_SUPPORTED_THINKING_LEVELS = new Set<ThinkingLevel>([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
]);

type PiModelRegistry = Pick<ModelRegistry, "find" | "getAll" | "getAvailable">;
type ModelConfigProviderIdentityRuntime = ModelRuntime & {
  readonly getModelConfigProviderIds: () => ReadonlyArray<string>;
};
type StockPiCodingAgentModule = typeof import("@earendil-works/pi-coding-agent");
type PiCodingAgentModule = Pick<
  StockPiCodingAgentModule,
  | "ModelRegistry"
  | "ModelRuntime"
  | "SessionManager"
  | "createAgentSessionFromServices"
  | "createAgentSessionRuntime"
  | "createAgentSessionServices"
  | "createBashToolDefinition"
  | "defineTool"
  | "getAgentDir"
  | "getShellConfig"
>;
type PiAgentRuntime = Awaited<ReturnType<PiCodingAgentModule["createAgentSessionRuntime"]>>;
type PiShellConfig = ReturnType<PiCodingAgentModule["getShellConfig"]>;
type PiPromptSettlementEvent = {
  readonly type: "prompt_handled";
  readonly outcome: Extract<OmniMindPromptOutcome, { readonly kind: "handled-without-agent" }>;
};
type PiTurnSettlementInput = {
  readonly state: "completed" | "failed" | "interrupted" | "cancelled";
  readonly stopReason: string | null;
  readonly usage: unknown;
  readonly errorMessage?: string;
};
type PiTurnSettlement = {
  readonly event: AgentSessionEvent | PiPromptSettlementEvent;
  readonly input: PiTurnSettlementInput;
  readonly runtimeError?: {
    readonly message: string;
    readonly method: string;
  };
};
type PiPromptSubmission = {
  readonly turnId: TurnId;
  settlement?: PiTurnSettlement;
};

interface PiActiveProcess {
  readonly child: ChildProcess;
  teardown: Promise<void> | undefined;
  teardownRequested: boolean;
  teardownProven: boolean;
}

export interface PiBashProcessSupervisor {
  readonly operations: BashOperations;
  readonly setShellPath: (shellPath: string | undefined) => void;
  readonly teardownAll: () => Promise<void>;
}

export interface PiBashProcessSupervisorOptions {
  readonly getShellConfig: (shellPath?: string) => PiShellConfig;
  readonly spawnProcess?: (
    command: string,
    args: ReadonlyArray<string>,
    options: SpawnOptions,
  ) => ChildProcess;
  readonly teardownProcessTree?: typeof teardownProviderProcessTree;
}

export function makePiBashProcessSupervisor(
  options: PiBashProcessSupervisorOptions,
): PiBashProcessSupervisor {
  const spawnProcess = options.spawnProcess ?? spawnChildProcess;
  const teardownProcessTree = options.teardownProcessTree ?? teardownProviderProcessTree;
  const activeProcesses = new Set<PiActiveProcess>();
  let configuredShellPath: string | undefined;

  const startTeardown = (active: PiActiveProcess): Promise<void> => {
    active.teardownRequested = true;
    active.teardown ??= teardownChildProcessTree(active.child, teardownProcessTree).then(
      () => {
        active.teardownProven = true;
      },
      (cause) => {
        active.teardown = undefined;
        throw cause;
      },
    );
    return active.teardown;
  };

  const operations: BashOperations = {
    exec: async (command, cwd, execution) => {
      if (execution.signal?.aborted) {
        throw new Error("aborted");
      }
      const timeoutMs = execution.timeout === undefined ? undefined : execution.timeout * 1_000;
      if (
        execution.timeout !== undefined &&
        (!Number.isFinite(execution.timeout) || execution.timeout <= 0)
      ) {
        throw new Error("Invalid timeout: must be a finite number of seconds");
      }
      if (timeoutMs !== undefined && timeoutMs > 2_147_483_647) {
        throw new Error(`Invalid timeout: maximum is ${String(2_147_483_647 / 1_000)} seconds`);
      }
      const shell = options.getShellConfig(configuredShellPath);
      const commandFromStdin = shell.commandTransport === "stdin";
      const child = spawnProcess(
        shell.shell,
        commandFromStdin ? shell.args : [...shell.args, command],
        {
          cwd,
          detached: process.platform !== "win32",
          env: buildProviderChildEnvironment({
            provider: "pi",
            baseEnv: execution.env ?? process.env,
          }),
          stdio: [commandFromStdin ? "pipe" : "ignore", "pipe", "pipe"],
          windowsHide: true,
        },
      );
      const active: PiActiveProcess = {
        child,
        teardown: undefined,
        teardownRequested: false,
        teardownProven: false,
      };
      activeProcesses.add(active);

      if (commandFromStdin) {
        child.stdin?.on("error", () => undefined);
        child.stdin?.end(command);
      }
      child.stdout?.on("data", (chunk: Buffer | string) =>
        execution.onData(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      );
      child.stderr?.on("data", (chunk: Buffer | string) =>
        execution.onData(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      );

      let timedOut = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const requestTeardown = () => {
        void startTeardown(active).catch(() => undefined);
      };
      if (timeoutMs !== undefined) {
        timeout = setTimeout(() => {
          timedOut = true;
          requestTeardown();
        }, timeoutMs);
      }
      execution.signal?.addEventListener("abort", requestTeardown, { once: true });

      try {
        const exitCode = await new Promise<number | null>((resolve, reject) => {
          child.once("error", reject);
          child.once("exit", (code) => resolve(code));
        });
        if (active.teardown) {
          await active.teardown;
        }
        if (execution.signal?.aborted) {
          throw new Error("aborted");
        }
        if (timedOut) {
          throw new Error(`timeout:${String(execution.timeout)}`);
        }
        return { exitCode };
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
        execution.signal?.removeEventListener("abort", requestTeardown);
        if (!active.teardownRequested || active.teardownProven) {
          activeProcesses.delete(active);
        }
      }
    },
  };

  return {
    operations,
    setShellPath: (shellPath) => {
      configuredShellPath = shellPath;
    },
    teardownAll: async () => {
      const results = await Promise.allSettled(
        Array.from(activeProcesses, (active) => startTeardown(active)),
      );
      const failures = results.flatMap((result) =>
        result.status === "rejected" ? [result.reason] : [],
      );
      if (failures.length > 0) {
        throw new AggregateError(failures, "Failed to prove all Pi subprocess trees exited.");
      }
      for (const active of Array.from(activeProcesses)) {
        if (active.teardownProven) activeProcesses.delete(active);
      }
    },
  };
}

// Loads the Pi SDK only when the Pi provider is actually used. The SDK brings in
// a native clipboard module, so importing it during OmniMind startup can bloat the
// desktop backend before any Pi session exists.
const loadPiCodingAgentModule: () => Promise<PiCodingAgentModule> = lazyModule(
  () => import("@earendil-works/pi-coding-agent"),
);

// The product-owned package is built from the same pinned Pi source, but its
// classes are nominally distinct because it is a separate package instance.
// Keep the compatibility boundary limited to the exact SDK members consumed by
// this shared session adapter. Model-services code uses the product module's
// real exported type and never casts the complete module to stock Pi.
const loadOmniMindAdapterModule: () => Promise<PiCodingAgentModule> = lazyModule(async () => {
  const sdk = await loadOmniMindCodingAgentModule();
  return {
    ModelRegistry: sdk.ModelRegistry,
    ModelRuntime: sdk.ModelRuntime,
    SessionManager: sdk.SessionManager,
    createAgentSessionFromServices: sdk.createAgentSessionFromServices,
    createAgentSessionRuntime: sdk.createAgentSessionRuntime,
    createAgentSessionServices: sdk.createAgentSessionServices,
    createBashToolDefinition: sdk.createBashToolDefinition,
    defineTool: sdk.defineTool,
    getAgentDir: sdk.getAgentDir,
    getShellConfig: sdk.getShellConfig,
  } as unknown as PiCodingAgentModule;
});

export async function createOmniMindModelRuntime(agentDir: string) {
  const sdk = await loadOmniMindCodingAgentModule();
  return sdk.ModelRuntime.create({
    authPath: path.join(agentDir, "auth.json"),
    modelsPath: null,
    modelsConfigReader: createOmniMindModelsConfigReader(agentDir),
    modelsStorePath: path.join(agentDir, "models-store.json"),
  });
}

interface PiFamilyAdapterConfig<P extends PiFamilyProvider> {
  readonly provider: P;
  readonly displayName: string;
  readonly loadModule: () => Promise<PiCodingAgentModule>;
  readonly resolveAgentDir: (
    requestedAgentDir: string | undefined,
    serverBaseDir: string,
    sdk: Pick<PiCodingAgentModule, "getAgentDir">,
  ) => string;
  readonly createModelRuntime: (agentDir: string) => Promise<ModelRuntime>;
}

const STOCK_PI_FAMILY = {
  provider: "pi",
  displayName: "Pi",
  loadModule: loadPiCodingAgentModule,
  resolveAgentDir: (requestedAgentDir, _serverBaseDir, sdk) => makeAgentDir(requestedAgentDir, sdk),
  createModelRuntime: async (agentDir) =>
    createPiModelRuntime(agentDir, await loadPiCodingAgentModule()),
} satisfies PiFamilyAdapterConfig<"pi">;

const OMNIMIND_AGENT_FAMILY = {
  provider: "omnimind",
  displayName: "OmniMind",
  loadModule: loadOmniMindAdapterModule,
  // Product state is App-owned and cannot be redirected into stock Pi state.
  resolveAgentDir: (_requestedAgentDir, serverBaseDir) => resolveOmniMindAgentDir(serverBaseDir),
  createModelRuntime: async (agentDir: string) =>
    (await createOmniMindModelRuntime(agentDir)) as unknown as ModelRuntime,
} satisfies PiFamilyAdapterConfig<"omnimind">;

interface PiSessionContext {
  readonly agentDir: string;
  appliedModelRuntimeMutationRevision: number;
  readonly gatewayControlAvailable: boolean;
  gatewaySessionLease?: AgentGatewaySessionLease;
  gatewayConnection?: AgentGatewayMcpConnection;
  readonly lifecycleGeneration?: string;
  runtime: PiAgentRuntime;
  readonly processSupervisor: PiBashProcessSupervisor;
  modelRegistry: PiModelRegistry;
  session: ProviderSession;
  turns: PiStoredTurn[];
  activeTurnId: TurnId | undefined;
  startedTurnId: TurnId | undefined;
  activeAssistantItemId: RuntimeItemId | undefined;
  activeReasoningItemId: RuntimeItemId | undefined;
  activeToolItems: Map<string, PiTrackedToolCall>;
  pendingPromptSubmission: PiPromptSubmission | undefined;
  pendingUserInputs: Map<ApprovalRequestId, PiPendingUserInput>;
  stopped: boolean;
  lastKnownTokenUsage: ThreadTokenUsageSnapshot | undefined;
  unsubscribe: (() => void) | undefined;
}

export function makePiRuntimeEventBase(
  context: {
    readonly provider?: PiFamilyProvider;
    readonly lifecycleGeneration?: string;
    readonly session: Pick<ProviderSession, "threadId">;
    readonly activeTurnId: TurnId | undefined;
  },
  options?: { readonly includeTurnId?: boolean },
) {
  return {
    eventId: EventId.makeUnsafe(crypto.randomUUID()),
    provider: context.provider ?? "pi",
    threadId: context.session.threadId,
    createdAt: new Date().toISOString(),
    ...(context.lifecycleGeneration !== undefined
      ? { lifecycleGeneration: context.lifecycleGeneration }
      : {}),
    ...(options?.includeTurnId !== false && context.activeTurnId
      ? { turnId: context.activeTurnId }
      : {}),
  };
}

interface PiStoredTurn {
  readonly id: TurnId;
  readonly items: unknown[];
  leafId?: string | null;
}

interface PiTrackedToolCall {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: unknown;
  readonly itemId: RuntimeItemId;
  readonly itemType: "command_execution" | "file_change" | "dynamic_tool_call" | "web_search";
  engineWebSurface?: {
    readonly url: string;
    readonly unregister: () => void;
  };
}

interface PiPendingUserInput {
  readonly resolve: (answers: ProviderUserInputAnswers) => void;
}

export interface PiUserInputOptionMapping {
  readonly value: string;
  readonly option: UserInputQuestion["options"][number];
}

export interface PiAdapterLiveOptions {
  readonly nativeEventLogPath?: string;
  readonly nativeEventLogger?: EventNdjsonLogger;
  readonly spawnProcess?: PiBashProcessSupervisorOptions["spawnProcess"];
  readonly teardownProcessTree?: typeof teardownProviderProcessTree;
  readonly agentGatewayFetch?: AgentGatewayMcpFetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function piGatewayToolResult(result: unknown): AgentToolResult<unknown> {
  if (isRecord(result) && result.isError === true) {
    const message = Array.isArray(result.content)
      ? result.content
          .flatMap((item) =>
            isRecord(item) && item.type === "text" && typeof item.text === "string"
              ? [item.text]
              : [],
          )
          .join("\n")
      : "";
    throw new Error(message || "OmniMind gateway tool failed.");
  }
  const content =
    isRecord(result) && Array.isArray(result.content)
      ? result.content.flatMap((item): Array<TextContent | ImageContent> => {
          if (isRecord(item) && item.type === "text" && typeof item.text === "string") {
            return [{ type: "text", text: item.text }];
          }
          if (
            isRecord(item) &&
            item.type === "image" &&
            typeof item.data === "string" &&
            typeof item.mimeType === "string"
          ) {
            return [{ type: "image", data: item.data, mimeType: item.mimeType }];
          }
          return [];
        })
      : [];
  return {
    content:
      content.length > 0
        ? content
        : [{ type: "text", text: JSON.stringify(result ?? null) } satisfies TextContent],
    details: result,
  };
}

/**
 * Project the canonical MCP catalog into Pi's native custom-tool API. Tool
 * schemas and execution both remain owned by the gateway; Pi only adapts the
 * provider boundary.
 */
export async function buildPiAgentGatewayCustomTools(input: {
  readonly connection: AgentGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly fetch?: AgentGatewayMcpFetch;
}): Promise<ReadonlyArray<ToolDefinition>> {
  const tools = await listAgentGatewayMcpTools({
    connection: input.connection,
    ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
  });
  if (tools.length === 0) {
    throw new Error("OmniMind MCP returned an empty tool catalog.");
  }
  return tools.map((tool) =>
    input.defineTool({
      name: tool.name,
      label: tool.name,
      description: tool.description,
      parameters: tool.inputSchema as ToolDefinition["parameters"],
      execute: async (_toolCallId, params, signal) =>
        piGatewayToolResult(
          await callAgentGatewayMcpTool({
            connection: input.connection,
            name: tool.name,
            arguments: params as Record<string, unknown>,
            ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
            ...(signal === undefined ? {} : { signal }),
          }),
        ),
    }),
  );
}

function toMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.trim().length > 0) {
    return cause.message;
  }
  return fallback;
}

function trimToUndefined(value: string | null | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
}

function isPiThinkingLevel(value: string | null | undefined): value is ThinkingLevel {
  return (
    value === "off" ||
    value === "minimal" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh" ||
    value === "max"
  );
}

function normalizePiThinkingLevel(value: string | null | undefined): ThinkingLevel | undefined {
  return isPiThinkingLevel(value) ? value : undefined;
}

function getLocalSupportedThinkingLevels(
  model: Pick<Model<Api>, "reasoning" | "thinkingLevelMap">,
): Set<ThinkingLevel> {
  if (!model.reasoning) {
    return new Set();
  }

  const thinkingLevelMap = model.thinkingLevelMap;
  if (thinkingLevelMap && Object.keys(thinkingLevelMap).length > 0) {
    return new Set(
      PI_THINKING_OPTIONS.filter((option) => {
        const mapped = thinkingLevelMap[option.value as keyof typeof thinkingLevelMap];
        if (mapped === null) {
          return false;
        }
        return mapped !== undefined || PI_DEFAULT_SUPPORTED_THINKING_LEVELS.has(option.value);
      }).map((option) => option.value),
    );
  }

  return new Set(PI_DEFAULT_SUPPORTED_THINKING_LEVELS);
}

// Mirrors Pi SDK clamping so model discovery does not advertise levels that will be ignored.
export function getPiSupportedThinkingOptions(
  model: Pick<Model<Api>, "reasoning" | "thinkingLevelMap">,
): ReadonlyArray<(typeof PI_THINKING_OPTIONS)[number]> {
  if (!model.reasoning) {
    return [];
  }
  const supportedLevels = getLocalSupportedThinkingLevels(model);
  return PI_THINKING_OPTIONS.filter((option) => supportedLevels.has(option.value));
}

export function getPiDiscoverableModels(
  registry: Pick<ModelRegistry, "getAvailable">,
): ReadonlyArray<Model<Api>> {
  return registry.getAvailable();
}

function hasModelConfigProviderIdentity(
  runtime: ModelRuntime,
): runtime is ModelConfigProviderIdentityRuntime {
  return (
    "getModelConfigProviderIds" in runtime &&
    typeof runtime.getModelConfigProviderIds === "function"
  );
}

/**
 * Pi extensions own their provider catalogs, so normalize their display metadata
 * before it crosses OmniMind's trimmed-string RPC contract. A single malformed
 * extension model must not make the complete Pi catalog unavailable.
 */
export function toPiProviderModelDescriptor(
  model: Model<Api>,
  getProviderDisplayName: (provider: string) => string,
  getProviderOrigin: (provider: string) => "builtin" | "models_json" | "extension" | "unknown",
): ProviderListModelsResult["models"][number] | null {
  const provider = trimToUndefined(model.provider);
  const modelId = trimToUndefined(model.id);
  if (!provider || !modelId || provider !== model.provider || modelId !== model.id) {
    return null;
  }

  const slug = `${provider}/${modelId}`;
  const supportedThinkingOptions = getPiSupportedThinkingOptions(model);
  return {
    slug,
    name: trimToUndefined(model.name) ?? slug,
    upstreamProviderId: provider,
    upstreamProviderName: trimToUndefined(getProviderDisplayName(model.provider)) ?? provider,
    upstreamProviderOrigin: getProviderOrigin(provider),
    ...(supportedThinkingOptions.length > 0
      ? {
          supportedReasoningEfforts: supportedThinkingOptions.map((option) => ({
            value: option.value,
            label: option.label,
            description: option.description,
          })),
          ...(supportedThinkingOptions.some((option) => option.value === DEFAULT_PI_THINKING_LEVEL)
            ? { defaultReasoningEffort: DEFAULT_PI_THINKING_LEVEL }
            : {}),
        }
      : {}),
  };
}

function parseModelReference(
  modelId: string | null | undefined,
): { readonly provider?: string; readonly id: string } | undefined {
  const trimmed = trimToUndefined(modelId);
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.includes("/")) {
    const [provider, ...rest] = trimmed.split("/");
    const id = rest.join("/");
    if (provider && id) {
      return { provider, id };
    }
  }
  if (trimmed.includes(":")) {
    const [provider, ...rest] = trimmed.split(":");
    const id = rest.join(":");
    if (provider && id) {
      return { provider, id };
    }
  }
  return { id: trimmed };
}

export function findModelInRegistry(
  registry: PiModelRegistry,
  modelId: string | null | undefined,
): Model<Api> | undefined {
  const parsed = parseModelReference(modelId);
  if (!parsed) {
    return undefined;
  }
  if (parsed.provider) {
    return registry.find(parsed.provider, parsed.id);
  }
  const matches = registry.getAll().filter((model) => model.id === parsed.id);
  return matches.length === 1 ? matches[0] : undefined;
}

function extractResumeSessionFile(resumeCursor: unknown): string | undefined {
  if (typeof resumeCursor === "string" && resumeCursor.trim().length > 0) {
    return resumeCursor;
  }
  if (!resumeCursor || typeof resumeCursor !== "object") {
    return undefined;
  }
  const record = resumeCursor as Record<string, unknown>;
  for (const key of ["sessionFile", "sessionFilePath", "nativeHandle", "path"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function getSessionFile(session: PiAgentSession): string | undefined {
  return session.sessionFile ?? session.sessionManager.getSessionFile();
}

function makeSessionSnapshot(
  context: PiSessionContext,
  provider: PiFamilyProvider = "pi",
): ProviderSession {
  const resumeCursor = getSessionFile(context.runtime.session);
  return {
    provider,
    status: context.stopped ? "closed" : context.activeTurnId ? "running" : "ready",
    runtimeMode: context.session.runtimeMode,
    threadId: context.session.threadId,
    createdAt: context.session.createdAt,
    updatedAt: new Date().toISOString(),
    ...(context.session.cwd ? { cwd: context.session.cwd } : {}),
    ...(context.session.model ? { model: context.session.model } : {}),
    ...(resumeCursor ? { resumeCursor } : {}),
    ...(context.activeTurnId ? { activeTurnId: context.activeTurnId } : {}),
    ...(context.session.lastError ? { lastError: context.session.lastError } : {}),
  };
}

function normalizeTokenUsage(
  stats: ReturnType<PiAgentSession["getSessionStats"]>,
  contextWindow?: number | null,
): ThreadTokenUsageSnapshot | undefined {
  const inputTokens = stats.tokens.input;
  const cachedInputTokens = stats.tokens.cacheRead;
  const outputTokens = stats.tokens.output;
  const totalProcessedTokens = stats.tokens.total;
  const contextUsage = stats.contextUsage;
  const contextUsageWindowValue = positiveFiniteNumber(contextUsage?.contextWindow);
  const contextUsageWindow =
    contextUsageWindowValue !== undefined ? Math.floor(contextUsageWindowValue) : undefined;
  const fallbackWindowValue = positiveFiniteNumber(contextWindow);
  const fallbackWindow =
    fallbackWindowValue !== undefined ? Math.floor(fallbackWindowValue) : undefined;
  const maxTokens = contextUsageWindow ?? fallbackWindow;
  const contextUsageTokenValue = nonNegativeFiniteNumber(contextUsage?.tokens);
  const contextUsageTokens =
    contextUsageTokenValue !== undefined ? Math.round(contextUsageTokenValue) : undefined;
  const usedPercent = clampUsagePercent(contextUsage?.percent);
  const usedTokensFromPercent =
    contextUsageTokens === undefined && usedPercent !== undefined && maxTokens !== undefined
      ? Math.round((usedPercent / 100) * maxTokens)
      : undefined;
  const usedTokens =
    contextUsageTokens ??
    usedTokensFromPercent ??
    (contextUsage
      ? 0
      : maxTokens !== undefined
        ? Math.min(totalProcessedTokens, maxTokens)
        : totalProcessedTokens);
  if (
    usedTokens <= 0 &&
    inputTokens <= 0 &&
    cachedInputTokens <= 0 &&
    outputTokens <= 0 &&
    maxTokens === undefined &&
    usedPercent === undefined
  ) {
    return undefined;
  }
  return {
    usedTokens,
    ...(usedPercent !== undefined ? { usedPercent } : {}),
    ...(totalProcessedTokens > usedTokens ? { totalProcessedTokens } : {}),
    inputTokens,
    cachedInputTokens,
    outputTokens,
    ...(maxTokens !== undefined ? { maxTokens } : {}),
    lastUsedTokens: usedTokens,
    lastInputTokens: inputTokens,
    lastCachedInputTokens: cachedInputTokens,
    lastOutputTokens: outputTokens,
  };
}

function isPiReloadCommand(text: string): boolean {
  return /^\/reload(?:\s|$)/iu.test(text.trim());
}

function classifyPiRuntimeError(
  message: string,
): "provider_error" | "transport_error" | "permission_error" | "validation_error" | "unknown" {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("network") ||
    normalized.includes("connection") ||
    normalized.includes("timeout") ||
    normalized.includes("econn") ||
    normalized.includes("fetch failed")
  ) {
    return "transport_error";
  }
  if (
    normalized.includes("api key") ||
    normalized.includes("auth") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("permission")
  ) {
    return "permission_error";
  }
  if (
    normalized.includes("invalid") ||
    normalized.includes("validation") ||
    normalized.includes("not available")
  ) {
    return "validation_error";
  }
  if (
    normalized.includes("rate limit") ||
    normalized.includes("quota") ||
    normalized.includes("usage limit") ||
    normalized.includes("overloaded") ||
    normalized.includes("provider")
  ) {
    return "provider_error";
  }
  return "unknown";
}

function runtimeErrorDetail(cause: unknown): unknown {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      ...(cause.stack ? { stack: cause.stack } : {}),
    };
  }
  return cause;
}

function textFromContent(content: string | (TextContent | ImageContent)[]): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .filter((block): block is TextContent => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");
}

function toolRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function firstStringValue(
  record: Record<string, unknown> | undefined,
  keys: readonly string[],
): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function textFromToolResult(result: unknown): string | undefined {
  if (typeof result === "string") {
    return result;
  }
  const record = toolRecord(result);
  if (!record) {
    return undefined;
  }
  const directText = firstStringValue(record, [
    "output",
    "stdout",
    "stderr",
    "text",
    "summary",
    "message",
    "error",
  ]);
  if (directText) {
    return directText;
  }
  const content = Array.isArray(record.content) ? record.content : [];
  const parts = content.flatMap((block) => {
    const blockRecord = toolRecord(block);
    return blockRecord?.type === "text" && typeof blockRecord.text === "string"
      ? [blockRecord.text]
      : [];
  });
  return parts.length > 0 ? parts.join("\n") : undefined;
}

export function piToolTimelineDetail(result: unknown): string | undefined {
  return trimToUndefined(textFromToolResult(result));
}

export function makePiGatewayLoadWarning(displayName: string) {
  return {
    message: `OmniMind MCP tools could not be loaded for this ${displayName} session. Engine-native tools remain available; OmniMind MCP actions are unavailable.`,
    detail: { source: "omnimind-mcp", availability: "failed" } as const,
  };
}

/**
 * Pi owns native Prompt, Skill, Extension, and input-hook expansion. Keep the
 * host policy in Pi's existing system-prompt projection so slash input reaches
 * that source-locked pipeline unchanged.
 */
export function makePiHostSystemPrompt(input: {
  readonly provider: ProviderKind;
  readonly gatewayControlAvailable: boolean;
}): string {
  return [
    "<omnimind_host_context>",
    renderOmniMindHarnessPolicy({
      gatewayControlAvailable: providerHasOmniMindGatewayControl({
        provider: input.provider,
        scopedGatewayConnectionAvailable: input.gatewayControlAvailable,
      }),
    }),
    "</omnimind_host_context>",
  ].join("\n");
}

function toolExitCode(result: unknown): number | null | undefined {
  const record = toolRecord(result);
  if (!record) return undefined;
  const exitCode = record.exitCode;
  if (typeof exitCode === "number" && Number.isFinite(exitCode)) return exitCode;
  const code = record.code;
  if (typeof code === "number" && Number.isFinite(code)) return code;
  return null;
}

function toolRawOutput(result: unknown): Record<string, unknown> | undefined {
  if (result === undefined) return undefined;
  const text = textFromToolResult(result);
  const exitCode = toolExitCode(result);
  if (typeof result === "string") {
    return { stdout: result, content: result };
  }
  if (result === null) {
    return {};
  }
  const record = toolRecord(result);
  if (!record) {
    return text ? { stdout: text, content: text } : undefined;
  }
  return {
    ...record,
    ...(text ? { stdout: text, content: text } : {}),
    ...(exitCode !== undefined ? { exitCode } : {}),
  };
}

function toolPath(args: unknown): string | undefined {
  return firstStringValue(toolRecord(args), ["path", "filePath", "file", "relativePath"]);
}

function toolCommand(args: unknown): string | undefined {
  return firstStringValue(toolRecord(args), ["command", "cmd"]);
}

function toolSearchQuery(toolName: string, args: unknown): string | undefined {
  const record = toolRecord(args);
  if (!record) return undefined;
  if (toolName === "grep" || toolName === "find") {
    return firstStringValue(record, ["pattern", "query"]);
  }
  return firstStringValue(record, ["query", "pattern"]);
}

function toolEditEntries(args: unknown): ReadonlyArray<Record<string, unknown>> | undefined {
  const record = toolRecord(args);
  if (!record) return undefined;
  if (Array.isArray(record.edits)) {
    return record.edits.flatMap((edit) => {
      const editRecord = toolRecord(edit);
      return editRecord ? [editRecord] : [];
    });
  }
  const oldText = firstStringValue(record, ["oldText", "old_string", "oldString"]);
  const newText = firstStringValue(record, ["newText", "new_string", "newString"]);
  if (oldText !== undefined || newText !== undefined) {
    return [
      {
        ...(oldText !== undefined ? { oldText } : {}),
        ...(newText !== undefined ? { newText } : {}),
      },
    ];
  }
  return undefined;
}

function toolItemType(toolName: string): PiTrackedToolCall["itemType"] {
  switch (toolName) {
    case "bash":
      return "command_execution";
    case "edit":
    case "write":
      return "file_change";
    case "grep":
    case "find":
    case "web_search":
      return "web_search";
    default:
      return "dynamic_tool_call";
  }
}

function toolTitle(toolName: string, args: unknown): string {
  const command = toolName === "bash" ? toolCommand(args) : undefined;
  if (command) return command;
  const filePath = toolPath(args);
  if (
    filePath &&
    (toolName === "read" || toolName === "edit" || toolName === "write" || toolName === "ls")
  ) {
    return `${toolName} ${filePath}`;
  }
  const query = toolSearchQuery(toolName, args);
  if (query && (toolName === "find" || toolName === "grep")) {
    return `${toolName} ${query}`;
  }
  return toolName;
}

function toolLifecycleData(input: {
  toolCallId: string;
  toolName: string;
  args: unknown;
  result?: unknown;
  partialResult?: unknown;
  isError?: boolean;
  engineWebSurfaceStatus?: "waiting-for-user" | "unavailable" | "completed";
}): Record<string, unknown> {
  const { toolCallId, toolName, args } = input;
  const rawOutput = toolRawOutput(input.result ?? input.partialResult);
  const path = toolPath(args);
  const query = toolSearchQuery(toolName, args);
  const command = toolCommand(args);
  const edits = toolEditEntries(args);
  const content = toolRecord(args)?.content;
  const outputDetails = toolRecord(rawOutput?.details);
  const unifiedDiff = firstStringValue(outputDetails, ["diff"]);
  const base: Record<string, unknown> = {
    toolCallId,
    callId: toolCallId,
    toolName,
    name: toolName,
    tool: toolName,
    kind: toolName,
    args,
    input: args,
    rawInput: args,
    ...(rawOutput ? { rawOutput } : {}),
    ...(input.partialResult !== undefined ? { partialResult: input.partialResult } : {}),
    ...(input.result !== undefined ? { result: input.result } : {}),
    ...(input.isError !== undefined ? { isError: input.isError } : {}),
    ...(input.engineWebSurfaceStatus
      ? {
          engineWebSurface: engineWebSurfacePresentationMetadata(input.engineWebSurfaceStatus),
        }
      : {}),
  };

  switch (toolName) {
    case "bash":
      return {
        ...base,
        kind: "execute",
        ...(command ? { command } : {}),
        ...(rawOutput?.exitCode !== undefined ? { exitCode: rawOutput.exitCode } : {}),
      };
    case "read":
      return {
        ...base,
        kind: "read",
        ...(path
          ? {
              path,
              filePath: path,
              files: [{ path }],
              commandActions: [{ type: "read", name: "read", path }],
            }
          : {}),
      };
    case "edit":
      return {
        ...base,
        kind: "edit",
        ...(path ? { path, filePath: path, files: [{ path }], changes: [{ path }] } : {}),
        ...(edits ? { edits: edits.map((edit) => ({ ...edit, ...(path ? { path } : {}) })) } : {}),
        ...(unifiedDiff ? { unifiedDiff } : {}),
      };
    case "write":
      return {
        ...base,
        kind: "write",
        ...(path ? { path, filePath: path, files: [{ path }], changes: [{ path }] } : {}),
        ...(typeof content === "string" ? { content } : {}),
      };
    case "find":
      return {
        ...base,
        kind: "search",
        searchKind: "find",
        ...(query ? { query } : {}),
        ...(path ? { path } : {}),
        ...(query || path
          ? { commandActions: [{ type: "search", name: "find", query, path }] }
          : {}),
      };
    case "grep":
      return {
        ...base,
        kind: "search",
        searchKind: "grep",
        ...(query ? { query } : {}),
        ...(path ? { path } : {}),
        ...(query || path
          ? { commandActions: [{ type: "search", name: "grep", query, path }] }
          : {}),
      };
    case "ls":
      return {
        ...base,
        kind: "listFiles",
        ...(path
          ? {
              path,
              query: path,
              commandActions: [{ type: "listFiles", name: "ls", path }],
            }
          : {}),
      };
    default:
      return base;
  }
}

function mapMessageHistory(session: PiAgentSession): unknown[] {
  const items: unknown[] = [];
  const pendingTools = new Map<string, { toolName: string; args: unknown }>();
  for (const message of session.messages) {
    if (message.role === "user") {
      const text = textFromContent(message.content);
      if (text) items.push({ type: "user_message", text });
      continue;
    }
    if (message.role === "assistant") {
      for (const content of message.content) {
        if (content.type === "text" && content.text) {
          items.push({ type: "assistant_message", text: content.text });
          continue;
        }
        if (content.type === "thinking" && content.thinking) {
          items.push({ type: "reasoning", text: content.thinking });
          continue;
        }
        if (content.type === "toolCall") {
          pendingTools.set(content.id, { toolName: content.name, args: content.arguments });
          items.push({
            type: "tool_call",
            status: "started",
            callId: content.id,
            toolName: content.name,
            itemType: toolItemType(content.name),
            title: toolTitle(content.name, content.arguments),
            args: content.arguments,
            data: toolLifecycleData({
              toolCallId: content.id,
              toolName: content.name,
              args: content.arguments,
            }),
          });
        }
      }
      continue;
    }
    if (message.role === "toolResult") {
      const pending = pendingTools.get(message.toolCallId);
      pendingTools.delete(message.toolCallId);
      const toolName = pending?.toolName ?? message.toolName;
      const args = pending?.args;
      const result = { content: message.content };
      const surfaceUrl = extractPiCuratorWebSurfaceUrl(toolName, result);
      const safeResult = sanitizeEngineWebSurfacePayload(result, surfaceUrl);
      items.push({
        type: "tool_call",
        status: message.isError ? "failed" : "completed",
        callId: message.toolCallId,
        toolName,
        itemType: toolItemType(toolName),
        title: toolTitle(toolName, args),
        output: piToolTimelineDetail(safeResult),
        isError: message.isError,
        data: toolLifecycleData({
          toolCallId: message.toolCallId,
          toolName,
          args,
          result: safeResult,
          isError: message.isError,
          ...(surfaceUrl ? { engineWebSurfaceStatus: "completed" } : {}),
        }),
      });
    }
  }
  return items;
}

function makeAgentDir(
  agentDir: string | undefined,
  piSdk: Pick<PiCodingAgentModule, "getAgentDir">,
): string {
  return trimToUndefined(agentDir) ?? piSdk.getAgentDir();
}

// Mirrors Pi 0.84.2's own session path encoding while honoring the explicit
// agentDir already passed through the SDK services. Pi's public SessionManager
// accepts this path but does not expose its default-path helper.
function piSessionDir(agentDir: string, cwd: string): string {
  const resolvedCwd = path.resolve(cwd);
  const safePath = `--${resolvedCwd.replace(/^[/\\]/u, "").replace(/[/\\:]/gu, "-")}--`;
  return path.join(path.resolve(agentDir), "sessions", safePath);
}

export function piModelHasConfiguredCredentials(
  modelRuntime: Pick<ModelRuntime, "hasConfiguredAuth">,
  model: Pick<Model<Api>, "provider"> | undefined,
): boolean {
  return model !== undefined && modelRuntime.hasConfiguredAuth(model.provider);
}

// Keep session runtimes isolated so project extension provider registrations
// cannot leak between threads that share an agent directory.
export async function createPiModelRuntime(
  agentDir: string,
  piSdk: Pick<PiCodingAgentModule, "ModelRuntime">,
): Promise<ModelRuntime> {
  return piSdk.ModelRuntime.create({
    authPath: path.join(agentDir, "auth.json"),
    modelsPath: path.join(agentDir, "models.json"),
  });
}

function modelRegistryFacade(
  modelRuntime: ModelRuntime,
  piSdk: Pick<PiCodingAgentModule, "ModelRegistry">,
): ModelRegistry {
  return new piSdk.ModelRegistry(modelRuntime);
}

function extensionDisplayName(extension: {
  readonly path: string;
  readonly sourceInfo?: { readonly source?: string };
}): string {
  const source = trimToUndefined(extension.sourceInfo?.source);
  if (source) return source;
  const extensionPath = trimToUndefined(extension.path);
  return extensionPath ? path.basename(extensionPath).replace(/\.(?:ts|js)$/u, "") : "extension";
}

function makePiUserInputOption(label: string): UserInputQuestion["options"][number] {
  const normalizedLabel = trimToUndefined(label) ?? "Option";
  return { label: normalizedLabel, description: normalizedLabel };
}

export function makePiUserInputOptions(
  labels: ReadonlyArray<string>,
): ReadonlyArray<PiUserInputOptionMapping> {
  const labelCounts = new Map<string, number>();
  return labels.map((label, index) => {
    const baseLabel = trimToUndefined(label) ?? `Option ${index + 1}`;
    const count = (labelCounts.get(baseLabel) ?? 0) + 1;
    labelCounts.set(baseLabel, count);
    const displayLabel = count === 1 ? baseLabel : `${baseLabel} (${count})`;
    return {
      value: label,
      option: { label: displayLabel, description: baseLabel },
    };
  });
}

function firstPiUserInputAnswer(
  answers: ProviderUserInputAnswers,
  questionId: string,
): string | undefined {
  const answer = answers[questionId];
  if (typeof answer === "string") {
    return trimToUndefined(answer);
  }
  if (Array.isArray(answer)) {
    return trimToUndefined(answer.find((entry) => typeof entry === "string"));
  }
  return undefined;
}

export const PLAIN_PI_EXTENSION_THEME = {
  fg(_color: string, text: string) {
    return text;
  },
  bg(_color: string, text: string) {
    return text;
  },
  bold(text: string) {
    return text;
  },
  italic(text: string) {
    return text;
  },
  underline(text: string) {
    return text;
  },
  inverse(text: string) {
    return text;
  },
  strikethrough(text: string) {
    return text;
  },
  getFgAnsi() {
    return "";
  },
  getBgAnsi() {
    return "";
  },
  getColorMode() {
    return "truecolor";
  },
  getThinkingBorderColor() {
    return (text: string) => text;
  },
  getBashModeBorderColor() {
    return (text: string) => text;
  },
} as unknown as ExtensionUIContext["theme"];

const makePiAdapter = <P extends PiFamilyProvider>(
  family: PiFamilyAdapterConfig<P>,
  options?: PiAdapterLiveOptions,
) =>
  Effect.gen(function* () {
    const provider = family.provider;
    const displayName = family.displayName;
    const extensionLabel = `${displayName} extension`;
    const serverConfig = yield* ServerConfig;
    const fileSystem = yield* FileSystem.FileSystem;
    const agentGatewayCredentials = Option.getOrUndefined(
      yield* Effect.serviceOption(AgentGatewayCredentials),
    );
    const browserAutomationHost = Option.getOrUndefined(
      yield* Effect.serviceOption(BrowserAutomationHost),
    );
    const runtimeEventQueue = yield* Queue.bounded<ProviderRuntimeEvent>(
      PROVIDER_ADAPTER_RUNTIME_EVENT_BUFFER_CAPACITY,
    );
    const sessions = new Map<ThreadId, PiSessionContext>();
    const sessionResourceAdmission = makeKeyedLock<ThreadId>();
    const ownsNativeEventLogger = options?.nativeEventLogger === undefined;
    const nativeEventLogger =
      options?.nativeEventLogger ??
      (options?.nativeEventLogPath !== undefined
        ? yield* makeEventNdjsonLogger(options.nativeEventLogPath, { stream: "native" })
        : undefined);
    const runtimeEventIngress = yield* makeBoundedCallbackIngress<
      ProviderRuntimeEvent,
      never,
      never
    >(
      (event) =>
        (nativeEventLogger && event.raw
          ? nativeEventLogger.write(event.raw, event.threadId).pipe(Effect.ignore)
          : Effect.void
        ).pipe(Effect.andThen(Queue.offer(runtimeEventQueue, event)), Effect.asVoid),
      {
        capacity: PROVIDER_ADAPTER_RUNTIME_EVENT_BUFFER_CAPACITY,
        maxBufferedBytes: PROVIDER_RUNTIME_CALLBACK_BUFFER_MAX_BYTES,
        terminalReserve: PROVIDER_RUNTIME_CALLBACK_TERMINAL_RESERVE,
        isTerminal: isTerminalProviderRuntimeEvent,
        sizeOf: providerRuntimeEventBytes,
      },
    );

    const loadPiSdk = (method: string) =>
      Effect.tryPromise({
        try: () => family.loadModule(),
        catch: (cause) =>
          new ProviderAdapterRequestError({
            provider: provider,
            method,
            detail: toMessage(cause, `Failed to load ${displayName} runtime.`),
            cause,
          }),
      });

    const makeEventBase = (
      context: Parameters<typeof makePiRuntimeEventBase>[0],
      eventOptions?: Parameters<typeof makePiRuntimeEventBase>[1],
    ) => makePiRuntimeEventBase({ ...context, provider }, eventOptions);

    const offerRuntimeEvent = (event: ProviderRuntimeEvent) => {
      runtimeEventIngress.offer(compactProviderRuntimeEventForIngress(event));
    };

    const offerRuntimeError = (
      context: PiSessionContext,
      input: {
        readonly message: string;
        readonly cause?: unknown;
        readonly method: string;
        readonly messageType?: string;
      },
    ) => {
      offerRuntimeEvent({
        ...makeEventBase(context, { includeTurnId: false }),
        type: "runtime.error",
        payload: {
          message: input.message,
          class: classifyPiRuntimeError(input.message),
          ...(input.cause !== undefined ? { detail: runtimeErrorDetail(input.cause) } : {}),
        },
        raw: {
          source: "pi.sdk.event",
          method: input.method,
          ...(input.messageType ? { messageType: input.messageType } : {}),
          payload: input.cause ?? { message: input.message },
        },
      } satisfies ProviderRuntimeEvent);
    };

    const offerEngineWebSurfaceUnavailable = (
      context: PiSessionContext,
      tracked: PiTrackedToolCall,
    ) => {
      const message =
        "OmniMind Browser could not open this temporary Engine page. The Engine tool remains active; check Browser availability, then rerun the tool.";
      offerRuntimeEvent({
        ...makeEventBase(context),
        itemId: tracked.itemId,
        providerRefs: { providerItemId: ProviderItemId.makeUnsafe(tracked.toolCallId) },
        type: "item.updated",
        payload: {
          itemType: tracked.itemType,
          status: "inProgress",
          title: toolTitle(tracked.toolName, tracked.args),
          detail: message,
          data: toolLifecycleData({
            toolCallId: tracked.toolCallId,
            toolName: tracked.toolName,
            args: tracked.args,
            engineWebSurfaceStatus: "unavailable",
          }),
        },
        raw: {
          source: "pi.sdk.event",
          method: "engine-web-surface/unavailable",
          payload: { toolCallId: tracked.toolCallId, message },
        },
      } satisfies ProviderRuntimeEvent);
    };

    const registerPiCuratorWebSurface = (
      context: PiSessionContext,
      tracked: PiTrackedToolCall,
      url: string,
    ) => {
      if (tracked.engineWebSurface?.url === url) return;
      tracked.engineWebSurface?.unregister();
      const unregister = registerEngineWebSurfaceIntent({
        url,
        identity: {
          provider,
          threadId: context.session.threadId,
          toolCallId: tracked.toolCallId,
        },
        present: async () => {
          if (context.stopped || !browserAutomationHost?.available) {
            offerEngineWebSurfaceUnavailable(context, tracked);
            return;
          }
          try {
            await Effect.runPromise(
              browserAutomationHost.execute({
                sessionKey: `engine-web-surface:${provider}:${context.session.threadId}:${tracked.toolCallId}`,
                provider,
                threadId: context.session.threadId,
                name: "browser_open",
                arguments: { url, show: true, reuse: true },
                timeoutMs: 10_000,
              }),
            );
          } catch {
            offerEngineWebSurfaceUnavailable(context, tracked);
          }
        },
      });
      tracked.engineWebSurface = { url, unregister };
    };

    const resolvePiExtensionUserInput = (
      context: PiSessionContext,
      requestId: ApprovalRequestId,
      answers: ProviderUserInputAnswers,
    ) => {
      const pending = context.pendingUserInputs.get(requestId);
      if (!pending) return false;
      pending.resolve(answers);
      return true;
    };

    const requestPiExtensionUserInput = (
      context: PiSessionContext,
      input: {
        readonly method: string;
        readonly question: UserInputQuestion;
        readonly opts?: Parameters<ExtensionUIContext["select"]>[2];
        readonly rawPayload?: Record<string, unknown>;
      },
    ): Promise<ProviderUserInputAnswers> => {
      if (context.stopped || input.opts?.signal?.aborted) {
        return Promise.resolve({});
      }

      const requestId = ApprovalRequestId.makeUnsafe(crypto.randomUUID());
      const runtimeRequestId = RuntimeRequestId.makeUnsafe(requestId);

      return new Promise((resolve) => {
        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let abort: () => void = () => undefined;

        const cleanup = () => {
          if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
          }
          input.opts?.signal?.removeEventListener("abort", abort);
        };
        const finish = (answers: ProviderUserInputAnswers) => {
          if (settled) return;
          settled = true;
          cleanup();
          context.pendingUserInputs.delete(requestId);
          offerRuntimeEvent({
            ...makeEventBase(context),
            type: "user-input.resolved",
            requestId: runtimeRequestId,
            payload: { answers },
            raw: {
              source: "pi.sdk.event",
              method: `${input.method}/answered`,
              payload: { requestId, answers },
            },
          } satisfies ProviderRuntimeEvent);
          resolve(answers);
        };
        abort = () => finish({});

        context.pendingUserInputs.set(requestId, { resolve: finish });
        if (typeof input.opts?.timeout === "number" && input.opts.timeout > 0) {
          timeoutId = setTimeout(abort, input.opts.timeout);
        }
        input.opts?.signal?.addEventListener("abort", abort, { once: true });

        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "user-input.requested",
          requestId: runtimeRequestId,
          payload: { questions: [input.question] },
          raw: {
            source: "pi.sdk.event",
            method: input.method,
            payload: input.rawPayload ?? { requestId, question: input.question },
          },
        } satisfies ProviderRuntimeEvent);
      });
    };

    // Bridges the common Pi extension UI primitives onto OmniMind's existing
    // pending user-input flow; terminal/TUI-only APIs remain no-op by design.
    const makePiExtensionUIContext = (context: PiSessionContext): ExtensionUIContext => {
      const unsupportedWarnings = new Set<string>();
      const statusTexts = new Map<string, string>();
      let workingMessage: string | undefined;
      const warnUnsupported = (method: string) => {
        if (unsupportedWarnings.has(method)) return;
        unsupportedWarnings.add(method);
        offerRuntimeEvent({
          ...makeEventBase(context, { includeTurnId: false }),
          type: "runtime.warning",
          payload: {
            message: `${extensionLabel} UI API '${method}' is not supported in OmniMind yet.`,
            detail: { method },
          },
          raw: {
            source: "pi.sdk.event",
            method: "extension/ui-unsupported",
            payload: { method },
          },
        } satisfies ProviderRuntimeEvent);
      };
      const emitPluginProgress = (summary: string) => {
        const normalized = trimToUndefined(summary);
        if (!normalized) return;
        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "tool.progress",
          payload: { toolName: extensionLabel, summary: normalized },
          raw: {
            source: "pi.sdk.event",
            method: "extension/ui-progress",
            payload: { summary: normalized },
          },
        } satisfies ProviderRuntimeEvent);
      };

      const uiContext: ExtensionUIContext = {
        async select(title, options, opts) {
          const questionId = "selection";
          const optionMappings = makePiUserInputOptions(options);
          const answers = await requestPiExtensionUserInput(context, {
            method: "extension/ui/select",
            opts,
            question: {
              id: questionId,
              header: trimToUndefined(title) ?? extensionLabel,
              question: trimToUndefined(title) ?? "Choose an option.",
              options: optionMappings.map((mapping) => mapping.option),
            },
            rawPayload: { title, options },
          });
          const answer = firstPiUserInputAnswer(answers, questionId);
          return optionMappings.find((mapping) => mapping.option.label === answer)?.value;
        },
        async confirm(title, message, opts) {
          const questionId = "confirmation";
          const answers = await requestPiExtensionUserInput(context, {
            method: "extension/ui/confirm",
            opts,
            question: {
              id: questionId,
              header: trimToUndefined(title) ?? extensionLabel,
              question:
                trimToUndefined(message) ?? trimToUndefined(title) ?? "Confirm this action?",
              options: [makePiUserInputOption("Yes"), makePiUserInputOption("No")],
            },
            rawPayload: { title, message },
          });
          return firstPiUserInputAnswer(answers, questionId) === "Yes";
        },
        async input(title, placeholder, opts) {
          const questionId = "input";
          const answers = await requestPiExtensionUserInput(context, {
            method: "extension/ui/input",
            opts,
            question: {
              id: questionId,
              header: trimToUndefined(title) ?? extensionLabel,
              question:
                trimToUndefined(placeholder) ?? trimToUndefined(title) ?? "Type a response.",
              options: [],
            },
            rawPayload: { title, placeholder },
          });
          return firstPiUserInputAnswer(answers, questionId);
        },
        notify(message, type) {
          const normalized = trimToUndefined(message);
          if (!normalized) return;
          if (type === "warning" || type === "error") {
            offerRuntimeEvent({
              ...makeEventBase(context),
              type: "runtime.warning",
              payload: { message: normalized, detail: { type: type ?? "info" } },
              raw: {
                source: "pi.sdk.event",
                method: "extension/ui/notify",
                payload: { message: normalized, type },
              },
            } satisfies ProviderRuntimeEvent);
            return;
          }
          emitPluginProgress(normalized);
        },
        onTerminalInput() {
          warnUnsupported("onTerminalInput");
          return () => undefined;
        },
        setStatus(key, text) {
          const normalizedKey = trimToUndefined(key) ?? "status";
          const normalizedText = trimToUndefined(text);
          if (!normalizedText) {
            statusTexts.delete(normalizedKey);
            return;
          }
          if (statusTexts.get(normalizedKey) === normalizedText) return;
          statusTexts.set(normalizedKey, normalizedText);
          emitPluginProgress(`${normalizedKey}: ${normalizedText}`);
        },
        setWorkingMessage(message) {
          const normalizedMessage = trimToUndefined(message);
          if (!normalizedMessage || normalizedMessage === workingMessage) return;
          workingMessage = normalizedMessage;
          emitPluginProgress(normalizedMessage);
        },
        setWorkingVisible() {},
        setWorkingIndicator() {},
        setHiddenThinkingLabel() {},
        setWidget() {
          warnUnsupported("setWidget");
        },
        setFooter() {
          warnUnsupported("setFooter");
        },
        setHeader() {
          warnUnsupported("setHeader");
        },
        setTitle(title) {
          if (title) emitPluginProgress(title);
        },
        async custom() {
          warnUnsupported("custom");
          return undefined as never;
        },
        pasteToEditor() {
          warnUnsupported("pasteToEditor");
        },
        setEditorText() {
          warnUnsupported("setEditorText");
        },
        getEditorText() {
          return "";
        },
        editor(title, prefill) {
          return uiContext.input(title, prefill);
        },
        addAutocompleteProvider() {
          warnUnsupported("addAutocompleteProvider");
        },
        setEditorComponent() {
          warnUnsupported("setEditorComponent");
        },
        getEditorComponent() {
          return undefined;
        },
        theme: PLAIN_PI_EXTENSION_THEME,
        getAllThemes() {
          return [];
        },
        getTheme() {
          return undefined;
        },
        setTheme() {
          return { success: false, error: `Themes are not available for ${displayName}.` };
        },
        getToolsExpanded() {
          return false;
        },
        setToolsExpanded() {},
      };
      return uiContext;
    };

    const completePromptRejection = (context: PiSessionContext, turnId: TurnId, cause: unknown) => {
      if (context.activeTurnId !== turnId) {
        return;
      }
      if (context.pendingPromptSubmission?.turnId === turnId) {
        context.pendingPromptSubmission = undefined;
      }

      const message = toMessage(cause, `${displayName} turn failed.`);
      const failure = classifyPiTurnFailure(message);
      const completionBase = makeEventBase(context);
      if (failure.state === "failed") {
        offerRuntimeError(context, { message, method: "prompt", cause });
      }
      Effect.runFork(cancelAgentGatewayTurn(context.gatewaySessionLease, turnId));
      context.activeTurnId = undefined;
      context.startedTurnId = undefined;
      context.activeAssistantItemId = undefined;
      context.activeReasoningItemId = undefined;
      context.activeToolItems.clear();
      context.session = makeSessionSnapshot(context, provider);
      offerRuntimeEvent({
        ...completionBase,
        type: "turn.completed",
        payload: {
          state: failure.state,
          stopReason: failure.stopReason,
          errorMessage: message,
        },
        raw: { source: "pi.sdk.event", method: "prompt", payload: cause },
      } satisfies ProviderRuntimeEvent);
    };

    const recordItem = (context: PiSessionContext, item: unknown) => {
      const turn = context.activeTurnId
        ? context.turns.find((candidate) => candidate.id === context.activeTurnId)
        : context.turns.at(-1);
      turn?.items.push(item);
    };

    const requireSession = Effect.fn("PiAdapter.requireSession")(function* (threadId: ThreadId) {
      const context = sessions.get(threadId);
      if (!context) {
        return yield* new ProviderAdapterSessionNotFoundError({ provider: provider, threadId });
      }
      if (context.stopped) {
        return yield* new ProviderAdapterSessionClosedError({ provider: provider, threadId });
      }
      return context;
    });

    const disposeSessionContext = async (context: PiSessionContext) => {
      try {
        await Effect.runPromise(
          cancelAgentGatewayTurn(context.gatewaySessionLease, context.activeTurnId),
        );
        context.unsubscribe?.();
        context.unsubscribe = undefined;
        for (const pending of Array.from(context.pendingUserInputs.values())) {
          pending.resolve({});
        }
        context.pendingUserInputs.clear();
        for (const tracked of context.activeToolItems.values()) {
          tracked.engineWebSurface?.unregister();
        }
        context.activeToolItems.clear();
        context.stopped = true;
        let runtimeFailure: unknown;
        try {
          await context.runtime.dispose();
        } catch (cause) {
          runtimeFailure = cause;
        }
        let processFailure: unknown;
        try {
          await context.processSupervisor.teardownAll();
        } catch (cause) {
          processFailure = cause;
        }
        if (runtimeFailure !== undefined && processFailure !== undefined) {
          throw new AggregateError(
            [runtimeFailure, processFailure],
            "Failed to dispose the Pi runtime and prove its subprocess trees exited.",
          );
        }
        if (processFailure !== undefined) throw processFailure;
        if (runtimeFailure !== undefined) throw runtimeFailure;
      } finally {
        context.gatewaySessionLease?.release();
        delete context.gatewaySessionLease;
      }
    };

    const handleMessageUpdate = (
      context: PiSessionContext,
      event: Extract<AgentSessionEvent, { type: "message_update" }>,
    ) => {
      if (event.message.role !== "assistant") return;
      const update = event.assistantMessageEvent;
      if (update.type === "text_delta") {
        if (!context.activeAssistantItemId) {
          context.activeAssistantItemId = RuntimeItemId.makeUnsafe(
            `pi-assistant-${crypto.randomUUID()}`,
          );
          offerRuntimeEvent({
            ...makeEventBase(context),
            itemId: context.activeAssistantItemId,
            type: "item.started",
            payload: { itemType: "assistant_message", status: "inProgress", title: "Assistant" },
            raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
          } satisfies ProviderRuntimeEvent);
        }
        recordItem(context, { type: "assistant_message", delta: update.delta });
        offerRuntimeEvent({
          ...makeEventBase(context),
          itemId: context.activeAssistantItemId,
          type: "content.delta",
          payload: {
            streamKind: "assistant_text",
            delta: update.delta,
            contentIndex: update.contentIndex,
          },
          raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
        } satisfies ProviderRuntimeEvent);
        return;
      }
      if (update.type === "thinking_delta") {
        if (!context.activeReasoningItemId) {
          context.activeReasoningItemId = RuntimeItemId.makeUnsafe(
            `pi-reasoning-${crypto.randomUUID()}`,
          );
          offerRuntimeEvent({
            ...makeEventBase(context),
            itemId: context.activeReasoningItemId,
            type: "item.started",
            payload: { itemType: "reasoning", status: "inProgress", title: "Reasoning" },
            raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
          } satisfies ProviderRuntimeEvent);
        }
        recordItem(context, { type: "reasoning", delta: update.delta });
        offerRuntimeEvent({
          ...makeEventBase(context),
          itemId: context.activeReasoningItemId,
          type: "content.delta",
          payload: {
            streamKind: "reasoning_text",
            delta: update.delta,
            contentIndex: update.contentIndex,
          },
          raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
        } satisfies ProviderRuntimeEvent);
      }
    };

    const completePiAttemptItems = (
      context: PiSessionContext,
      event: AgentSessionEvent,
      status: "completed" | "failed",
    ) => {
      if (context.activeAssistantItemId) {
        offerRuntimeEvent({
          ...makeEventBase(context),
          itemId: context.activeAssistantItemId,
          type: "item.completed",
          payload: {
            itemType: "assistant_message",
            status,
            title: "Assistant",
          },
          raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
        } satisfies ProviderRuntimeEvent);
      }
      if (context.activeReasoningItemId) {
        offerRuntimeEvent({
          ...makeEventBase(context),
          itemId: context.activeReasoningItemId,
          type: "item.completed",
          payload: {
            itemType: "reasoning",
            status,
            title: "Reasoning",
          },
          raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
        } satisfies ProviderRuntimeEvent);
      }
      context.activeAssistantItemId = undefined;
      context.activeReasoningItemId = undefined;
      for (const tracked of context.activeToolItems.values()) {
        tracked.engineWebSurface?.unregister();
      }
      context.activeToolItems.clear();
    };

    const settlePiTurn = (
      context: PiSessionContext,
      event: AgentSessionEvent | PiPromptSettlementEvent,
      input: PiTurnSettlementInput,
    ) => {
      const turnId = context.activeTurnId;
      if (!turnId) return;
      if (context.pendingPromptSubmission?.turnId === turnId) {
        context.pendingPromptSubmission = undefined;
      }
      const completionBase = makeEventBase(context);
      if (context.gatewaySessionLease && context.gatewayConnection) {
        const outgoingLease = context.gatewaySessionLease;
        const drainage = outgoingLease.retireTurn(turnId);
        outgoingLease.release();
        const replacementLease = acquireAgentGatewaySessionLease(
          agentGatewayCredentials,
          context.session.threadId,
          provider,
        );
        if (replacementLease) {
          context.gatewaySessionLease = replacementLease;
          Object.assign(context.gatewayConnection, replacementLease.connection);
        } else {
          delete context.gatewaySessionLease;
        }
        Effect.runFork(
          Effect.promise(() => drainage).pipe(
            Effect.catchCause((cause) =>
              Effect.logWarning("pi.agent_gateway.turn_retirement_failed", { turnId, cause }),
            ),
          ),
        );
      }
      context.activeTurnId = undefined;
      context.startedTurnId = undefined;
      context.activeAssistantItemId = undefined;
      context.activeReasoningItemId = undefined;
      context.activeToolItems.clear();
      context.session = makeSessionSnapshot(context, provider);
      offerRuntimeEvent({
        ...completionBase,
        type: "turn.completed",
        payload: {
          state: input.state,
          stopReason: input.stopReason,
          usage: input.usage,
          ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
        },
        raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
      } satisfies ProviderRuntimeEvent);
    };

    const finalizePiTurnSettlement = (context: PiSessionContext, settlement: PiTurnSettlement) => {
      if (settlement.runtimeError) {
        offerRuntimeError(context, {
          message: settlement.runtimeError.message,
          method: settlement.runtimeError.method,
          messageType: settlement.event.type,
          cause: settlement.event,
        });
      }
      settlePiTurn(context, settlement.event, settlement.input);
    };

    const deferOrFinalizePiTurnSettlement = (
      context: PiSessionContext,
      settlement: PiTurnSettlement,
    ) => {
      const pending = context.pendingPromptSubmission;
      if (pending && pending.turnId === context.activeTurnId) {
        pending.settlement ??= settlement;
        return;
      }
      finalizePiTurnSettlement(context, settlement);
    };

    const ensurePiTurnStarted = (
      context: PiSessionContext,
      event: AgentSessionEvent | PiPromptSettlementEvent,
    ) => {
      if (!context.activeTurnId || context.startedTurnId === context.activeTurnId) return;
      context.startedTurnId = context.activeTurnId;
      offerRuntimeEvent({
        ...makeEventBase(context),
        type: "turn.started",
        payload: {
          ...(context.runtime.session.model
            ? {
                model: `${context.runtime.session.model.provider}/${context.runtime.session.model.id}`,
              }
            : {}),
          effort: context.runtime.session.thinkingLevel,
        },
        raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
      } satisfies ProviderRuntimeEvent);
    };

    const handlePromptOutcome = (
      context: PiSessionContext,
      turnId: TurnId,
      outcome: OmniMindPromptOutcome | void,
    ) => {
      if (
        context.activeTurnId !== turnId ||
        outcome === undefined ||
        outcome.kind !== "handled-without-agent"
      ) {
        return;
      }
      const event: PiPromptSettlementEvent = { type: "prompt_handled", outcome };
      ensurePiTurnStarted(context, event);
      const stats = context.runtime.session.getSessionStats();
      if (!outcome.success) {
        offerRuntimeError(context, {
          message: "The extension action could not be completed.",
          method: "prompt",
          messageType: event.type,
          cause: event,
        });
      }
      settlePiTurn(context, event, {
        state: outcome.success ? "completed" : "failed",
        stopReason: outcome.success ? "command" : "error",
        usage: stats,
        ...(outcome.success
          ? {}
          : { errorMessage: "The extension action could not be completed." }),
      });
    };

    const resolvePromptSubmission = (
      context: PiSessionContext,
      turnId: TurnId,
      outcome: OmniMindPromptOutcome | void,
    ) => {
      const pending = context.pendingPromptSubmission;
      if (!pending || pending.turnId !== turnId) return;
      context.pendingPromptSubmission = undefined;
      if (context.activeTurnId !== turnId) return;
      if (outcome?.kind === "handled-without-agent") {
        handlePromptOutcome(context, turnId, outcome);
        return;
      }
      if (pending.settlement) {
        finalizePiTurnSettlement(context, pending.settlement);
      }
    };

    const submitPiPrompt = (
      context: PiSessionContext,
      turnId: TurnId,
      text: string,
      images: ReadonlyArray<ImageContent>,
    ): Promise<OmniMindPromptOutcome | void> => {
      context.pendingPromptSubmission = { turnId };
      return context.runtime.session.prompt(
        text,
        images.length > 0 ? { images: [...images] } : undefined,
      ) as Promise<OmniMindPromptOutcome | void>;
    };

    const handleSessionEvent = (context: PiSessionContext, event: AgentSessionEvent) => {
      switch (event.type) {
        case "agent_start":
          offerRuntimeEvent({
            ...makeEventBase(context),
            type: "thread.state.changed",
            payload: { state: "active" },
            raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
          } satisfies ProviderRuntimeEvent);
          return;
        case "turn_start": {
          ensurePiTurnStarted(context, event);
          return;
        }
        case "message_update":
          handleMessageUpdate(context, event);
          return;
        case "tool_execution_start": {
          const itemId = RuntimeItemId.makeUnsafe(`pi-tool-${event.toolCallId}`);
          const tracked: PiTrackedToolCall = {
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: event.args,
            itemId,
            itemType: toolItemType(event.toolName),
          };
          context.activeToolItems.set(event.toolCallId, tracked);
          const title = toolTitle(event.toolName, event.args);
          recordItem(context, {
            type: "tool_call",
            status: "started",
            toolName: event.toolName,
            args: event.args,
          });
          offerRuntimeEvent({
            ...makeEventBase(context),
            itemId,
            providerRefs: { providerItemId: ProviderItemId.makeUnsafe(event.toolCallId) },
            type: "item.started",
            payload: {
              itemType: tracked.itemType,
              status: "inProgress",
              title,
              data: toolLifecycleData({
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                args: event.args,
              }),
            },
            raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
          } satisfies ProviderRuntimeEvent);
          return;
        }
        case "tool_execution_update": {
          const tracked = context.activeToolItems.get(event.toolCallId);
          if (!tracked) return;
          const discoveredSurfaceUrl = extractPiCuratorWebSurfaceUrl(
            event.toolName,
            event.partialResult,
          );
          if (discoveredSurfaceUrl) {
            registerPiCuratorWebSurface(context, tracked, discoveredSurfaceUrl);
          }
          const surfaceUrl = tracked.engineWebSurface?.url;
          const safePartialResult = sanitizeEngineWebSurfacePayload(
            event.partialResult,
            surfaceUrl,
          );
          const safeEvent = sanitizeEngineWebSurfacePayload(event, surfaceUrl);
          const detail = piToolTimelineDetail(safePartialResult);
          recordItem(context, {
            type: "tool_call",
            status: "updated",
            toolName: event.toolName,
            output: detail,
          });
          offerRuntimeEvent({
            ...makeEventBase(context),
            itemId: tracked.itemId,
            providerRefs: { providerItemId: ProviderItemId.makeUnsafe(event.toolCallId) },
            type: "item.updated",
            payload: {
              itemType: tracked.itemType,
              status: "inProgress",
              title: toolTitle(event.toolName, tracked.args),
              ...(detail ? { detail } : {}),
              data: toolLifecycleData({
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                args: tracked.args,
                partialResult: safePartialResult,
                ...(surfaceUrl ? { engineWebSurfaceStatus: "waiting-for-user" } : {}),
              }),
            },
            raw: { source: "pi.sdk.event", messageType: event.type, payload: safeEvent },
          } satisfies ProviderRuntimeEvent);
          return;
        }
        case "tool_execution_end": {
          const tracked = context.activeToolItems.get(event.toolCallId) ?? {
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: undefined,
            itemId: RuntimeItemId.makeUnsafe(`pi-tool-${event.toolCallId}`),
            itemType: toolItemType(event.toolName),
          };
          const surfaceUrl =
            tracked.engineWebSurface?.url ??
            extractPiCuratorWebSurfaceUrl(event.toolName, event.result);
          const safeResult = sanitizeEngineWebSurfacePayload(event.result, surfaceUrl);
          const safeEvent = sanitizeEngineWebSurfacePayload(event, surfaceUrl);
          context.activeToolItems.delete(event.toolCallId);
          tracked.engineWebSurface?.unregister();
          const detail = piToolTimelineDetail(safeResult);
          recordItem(context, {
            type: "tool_call",
            status: event.isError ? "failed" : "completed",
            toolName: event.toolName,
            output: detail,
            result: safeResult,
          });
          offerRuntimeEvent({
            ...makeEventBase(context),
            itemId: tracked.itemId,
            providerRefs: { providerItemId: ProviderItemId.makeUnsafe(event.toolCallId) },
            type: "item.completed",
            payload: {
              itemType: tracked.itemType,
              status: event.isError ? "failed" : "completed",
              title: toolTitle(event.toolName, tracked.args),
              ...(detail ? { detail } : {}),
              data: toolLifecycleData({
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                args: tracked.args,
                result: safeResult,
                isError: event.isError,
                ...(surfaceUrl ? { engineWebSurfaceStatus: "completed" } : {}),
              }),
            },
            raw: { source: "pi.sdk.event", messageType: event.type, payload: safeEvent },
          } satisfies ProviderRuntimeEvent);
          return;
        }
        case "compaction_start": {
          const itemId = RuntimeItemId.makeUnsafe(`pi-compaction-${crypto.randomUUID()}`);
          offerRuntimeEvent({
            ...makeEventBase(context),
            itemId,
            type: "item.updated",
            payload: {
              itemType: "context_compaction",
              status: "inProgress",
              title: "Compacting context",
            },
            raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
          } satisfies ProviderRuntimeEvent);
          return;
        }
        case "compaction_end": {
          const itemId = RuntimeItemId.makeUnsafe(`pi-compaction-${crypto.randomUUID()}`);
          offerRuntimeEvent({
            ...makeEventBase(context),
            itemId,
            type: "item.completed",
            payload: {
              itemType: "context_compaction",
              status: event.aborted ? "failed" : "completed",
              title: "Context compacted",
              data: event,
            },
            raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
          } satisfies ProviderRuntimeEvent);
          return;
        }
        case "auto_retry_start": {
          if (!context.activeTurnId) return;
          offerRuntimeEvent({
            ...makeEventBase(context),
            type: "runtime.warning",
            payload: {
              message: "Retrying the model request after a temporary failure.",
              detail: {
                source: "pi-auto-retry",
                subtype: "model_request_retrying",
                attempt: event.attempt,
                maxAttempts: event.maxAttempts,
                delayMs: event.delayMs,
              },
            },
            raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
          } satisfies ProviderRuntimeEvent);
          return;
        }
        case "auto_retry_end": {
          if (event.success || !context.activeTurnId) return;
          const cancelled = event.finalError === "Retry cancelled";
          if (!cancelled) return;
          const stats = context.runtime.session.getSessionStats();
          deferOrFinalizePiTurnSettlement(context, {
            event,
            input: {
              state: "cancelled",
              stopReason: "cancelled",
              usage: stats,
              ...(event.finalError ? { errorMessage: event.finalError } : {}),
            },
          });
          return;
        }
        case "agent_end": {
          const stats = context.runtime.session.getSessionStats();
          const usage = normalizeTokenUsage(stats, context.runtime.session.model?.contextWindow);
          context.lastKnownTokenUsage = usage;
          const turnId = context.activeTurnId;
          const errorMessage = context.runtime.session.agent.state.errorMessage;
          const leafId = context.runtime.session.sessionManager.getLeafId();
          const turn = turnId
            ? context.turns.find((candidate) => candidate.id === turnId)
            : undefined;
          if (turn) turn.leafId = leafId;
          completePiAttemptItems(context, event, errorMessage ? "failed" : "completed");
          if (usage) {
            offerRuntimeEvent({
              ...makeEventBase(context),
              type: "thread.token-usage.updated",
              payload: { usage },
              raw: { source: "pi.sdk.event", messageType: event.type, payload: event },
            } satisfies ProviderRuntimeEvent);
          }
          context.session = makeSessionSnapshot(context, provider);
          return;
        }
        case "agent_settled": {
          if (!context.activeTurnId) return;
          const stats = context.runtime.session.getSessionStats();
          const usage = normalizeTokenUsage(stats, context.runtime.session.model?.contextWindow);
          context.lastKnownTokenUsage = usage;
          const errorMessage = context.runtime.session.agent.state.errorMessage;
          const failure = errorMessage ? classifyPiTurnFailure(errorMessage) : undefined;
          deferOrFinalizePiTurnSettlement(context, {
            event,
            input:
              errorMessage && failure
                ? {
                    state: failure.state,
                    stopReason: failure.stopReason,
                    errorMessage,
                    usage: stats,
                  }
                : { state: "completed", stopReason: null, usage: stats },
            ...(errorMessage && failure?.state === "failed"
              ? { runtimeError: { message: errorMessage, method: "prompt" } }
              : {}),
          });
          return;
        }
        default:
          return;
      }
    };

    const createSdkRuntime = async (input: {
      sdk: PiCodingAgentModule;
      cwd: string;
      agentDir: string;
      sessionManager: SessionManager;
      modelId?: string;
      thinkingLevel?: ThinkingLevel;
      processSupervisor: PiBashProcessSupervisor;
      gatewayTools?: ReadonlyArray<ToolDefinition>;
      hostSystemPrompt: string;
    }) => {
      const modelRuntime = await family.createModelRuntime(input.agentDir);
      const createRuntime: CreateAgentSessionRuntimeFactory = async ({
        cwd,
        agentDir,
        sessionManager,
        sessionStartEvent,
      }) => {
        const services = await input.sdk.createAgentSessionServices({
          cwd,
          agentDir,
          modelRuntime,
          resourceLoaderOptions: {
            appendSystemPromptOverride: (base) => [...base, input.hostSystemPrompt],
          },
        });
        const registry = modelRegistryFacade(services.modelRuntime, input.sdk);
        const model = findModelInRegistry(registry, input.modelId);
        if (input.modelId && !model) {
          throw new Error(
            `${displayName} model '${input.modelId}' is not available in the current runtime catalog. Choose a discovered model and try again.`,
          );
        }
        const shellPath = services.settingsManager.getShellPath();
        const commandPrefix = services.settingsManager.getShellCommandPrefix();
        input.processSupervisor.setShellPath(shellPath);
        return {
          ...(await input.sdk.createAgentSessionFromServices({
            services,
            sessionManager,
            ...(sessionStartEvent ? { sessionStartEvent } : {}),
            ...(model ? { model } : {}),
            thinkingLevel: input.thinkingLevel ?? DEFAULT_PI_THINKING_LEVEL,
            customTools: [
              input.sdk.defineTool(
                input.sdk.createBashToolDefinition(cwd, {
                  operations: input.processSupervisor.operations,
                  ...(commandPrefix === undefined ? {} : { commandPrefix }),
                  ...(shellPath === undefined ? {} : { shellPath }),
                }),
              ),
              ...(input.gatewayTools ?? []),
            ],
          })),
          services,
          diagnostics: services.diagnostics,
        };
      };
      const runtime = await input.sdk.createAgentSessionRuntime(createRuntime, {
        cwd: input.sessionManager.getCwd(),
        agentDir: input.agentDir,
        sessionManager: input.sessionManager,
      });
      return {
        runtime,
        modelRegistry: modelRegistryFacade(runtime.services.modelRuntime, input.sdk),
      };
    };

    const startSession: PiAdapterShape["startSession"] = (input) =>
      Effect.gen(function* () {
        const cwd = trimToUndefined(input.cwd) ?? serverConfig.cwd;
        const piSdk = yield* loadPiSdk("session/start");
        const processSupervisor = makePiBashProcessSupervisor({
          getShellConfig: () => piSdk.getShellConfig(),
          ...(options?.spawnProcess ? { spawnProcess: options.spawnProcess } : {}),
          ...(options?.teardownProcessTree
            ? { teardownProcessTree: options.teardownProcessTree }
            : {}),
        });
        const agentDir = family.resolveAgentDir(
          input.providerOptions?.pi?.agentDir,
          serverConfig.baseDir,
          piSdk,
        );
        const sessionFile = extractResumeSessionFile(input.resumeCursor);
        const sessionManager = sessionFile
          ? piSdk.SessionManager.open(sessionFile, undefined, cwd)
          : piSdk.SessionManager.create(cwd, piSessionDir(agentDir, cwd));
        const modelId =
          input.modelSelection?.provider === provider ? input.modelSelection.model : undefined;
        const thinkingLevel =
          input.modelSelection?.provider === provider
            ? normalizePiThinkingLevel(input.modelSelection.options?.thinkingLevel)
            : undefined;
        const existingContext = sessions.get(input.threadId);
        if (existingContext) {
          yield* Effect.tryPromise({
            try: () => disposeSessionContext(existingContext),
            catch: (cause) =>
              new ProviderAdapterRequestError({
                provider: provider,
                method: "session/restart",
                detail: toMessage(cause, `Failed to dispose previous ${displayName} session.`),
                cause,
              }),
          });
          if (sessions.get(input.threadId) === existingContext) {
            sessions.delete(input.threadId);
          }
        }
        const agentGatewaySessionLease = acquireAgentGatewaySessionLease(
          agentGatewayCredentials,
          input.threadId,
          provider,
        );
        const agentGatewayConnection = agentGatewaySessionLease?.connection;
        let gatewayToolLoadFailed = false;
        const gatewayTools = agentGatewayConnection
          ? yield* releaseAgentGatewaySessionLeaseOnInterrupt(
              agentGatewaySessionLease,
              Effect.tryPromise({
                try: () =>
                  buildPiAgentGatewayCustomTools({
                    connection: agentGatewayConnection,
                    defineTool: (tool) => piSdk.defineTool(tool),
                    ...(options?.agentGatewayFetch === undefined
                      ? {}
                      : { fetch: options.agentGatewayFetch }),
                  }),
                catch: (cause) => cause,
              }),
            ).pipe(
              Effect.catch(() =>
                Effect.sync(() => {
                  gatewayToolLoadFailed = true;
                  agentGatewaySessionLease?.release();
                }).pipe(
                  Effect.andThen(
                    Effect.logWarning("Pi could not install thread-scoped OmniMind gateway tools", {
                      provider,
                      reason: "gateway-discovery-failed",
                    }),
                  ),
                  Effect.as([] as ReadonlyArray<ToolDefinition>),
                ),
              ),
            )
          : [];
        const gatewayControlAvailable = gatewayTools.length > 0;
        if (!gatewayControlAvailable) {
          agentGatewaySessionLease?.release();
        }
        const { runtime, modelRegistry } = yield* releaseAgentGatewaySessionLeaseOnInterrupt(
          agentGatewaySessionLease,
          Effect.tryPromise({
            try: () =>
              createSdkRuntime({
                sdk: piSdk,
                cwd,
                agentDir,
                sessionManager,
                ...(modelId ? { modelId } : {}),
                ...(thinkingLevel ? { thinkingLevel } : {}),
                processSupervisor,
                ...(gatewayControlAvailable ? { gatewayTools } : {}),
                hostSystemPrompt: makePiHostSystemPrompt({
                  provider,
                  gatewayControlAvailable,
                }),
              }),
            catch: (cause) =>
              new ProviderAdapterRequestError({
                provider: provider,
                method: "session/start",
                detail: toMessage(cause, `Failed to start ${displayName} session.`),
                cause,
              }),
          }),
        ).pipe(
          Effect.tapError(() =>
            Effect.sync(() => {
              agentGatewaySessionLease?.release();
            }),
          ),
        );
        const now = new Date().toISOString();
        const model = runtime.session.model
          ? `${runtime.session.model.provider}/${runtime.session.model.id}`
          : modelId;
        const resumeCursor = getSessionFile(runtime.session);
        const session: ProviderSession = {
          provider: provider,
          status: "ready",
          runtimeMode: input.runtimeMode,
          cwd,
          threadId: input.threadId,
          createdAt: now,
          updatedAt: now,
          ...(model ? { model } : {}),
          ...(resumeCursor ? { resumeCursor } : {}),
        };
        const context: PiSessionContext = {
          ...(input.lifecycleGeneration !== undefined
            ? { lifecycleGeneration: input.lifecycleGeneration }
            : {}),
          runtime,
          agentDir,
          appliedModelRuntimeMutationRevision:
            provider === "omnimind" ? getOmniMindModelRuntimeMutationRevision(agentDir) : 0,
          gatewayControlAvailable,
          ...(gatewayControlAvailable && agentGatewaySessionLease
            ? {
                gatewaySessionLease: agentGatewaySessionLease,
                gatewayConnection: agentGatewayConnection!,
              }
            : {}),
          processSupervisor,
          modelRegistry,
          session,
          turns: [],
          activeTurnId: undefined,
          startedTurnId: undefined,
          activeAssistantItemId: undefined,
          activeReasoningItemId: undefined,
          activeToolItems: new Map(),
          pendingPromptSubmission: undefined,
          pendingUserInputs: new Map(),
          stopped: false,
          lastKnownTokenUsage: undefined,
          unsubscribe: undefined,
        };
        context.unsubscribe = runtime.session.subscribe((event) =>
          handleSessionEvent(context, event),
        );
        sessions.set(input.threadId, context);
        yield* Effect.tryPromise({
          try: () =>
            runtime.session.bindExtensions({ uiContext: makePiExtensionUIContext(context) }),
          catch: (cause) =>
            new ProviderAdapterRequestError({
              provider: provider,
              method: "extension/bind",
              detail: toMessage(cause, `Failed to bind ${displayName} extensions.`),
              cause,
            }),
        }).pipe(
          Effect.catch((error) =>
            Effect.gen(function* () {
              yield* Effect.tryPromise({
                try: () => disposeSessionContext(context),
                catch: (cause) =>
                  new ProviderAdapterRequestError({
                    provider: provider,
                    method: "session/start-cleanup",
                    detail: toMessage(
                      cause,
                      `Failed to prove ${displayName} startup cleanup completed.`,
                    ),
                    cause,
                  }),
              });
              if (sessions.get(input.threadId) === context) {
                sessions.delete(input.threadId);
              }
              return yield* Effect.fail(error);
            }),
          ),
        );
        if (gatewayToolLoadFailed) {
          const warning = makePiGatewayLoadWarning(displayName);
          offerRuntimeEvent({
            ...makeEventBase(context, { includeTurnId: false }),
            type: "runtime.warning",
            payload: warning,
            raw: {
              source: "pi.sdk.event",
              method: "gateway/discovery-failed",
              payload: { provider },
            },
          } satisfies ProviderRuntimeEvent);
        }
        const loadedExtensions = runtime.session.resourceLoader.getExtensions().extensions;
        if (loadedExtensions.length > 0) {
          const extensionNames = loadedExtensions.map(extensionDisplayName);
          offerRuntimeEvent({
            ...makeEventBase(context, { includeTurnId: false }),
            type: "runtime.warning",
            payload: {
              message: `${displayName} extensions are loaded with OmniMind's limited UI bridge. select/confirm/input/notify/status are supported; TUI-only widgets and editor hooks are ignored.`,
              detail: {
                extensionCount: loadedExtensions.length,
                extensions: extensionNames,
              },
            },
            raw: {
              source: "pi.sdk.event",
              method: "extension/ui-limited-warning",
              payload: { extensionCount: loadedExtensions.length, extensions: extensionNames },
            },
          } satisfies ProviderRuntimeEvent);
        }
        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "session.started",
          payload: { message: `${displayName} session started`, resume: session.resumeCursor },
        } satisfies ProviderRuntimeEvent);
        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "thread.started",
          payload: { providerThreadId: runtime.session.sessionId },
        } satisfies ProviderRuntimeEvent);
        const initialUsage = normalizeTokenUsage(
          runtime.session.getSessionStats(),
          runtime.session.model?.contextWindow,
        );
        context.lastKnownTokenUsage = initialUsage;
        if (initialUsage) {
          offerRuntimeEvent({
            ...makeEventBase(context),
            type: "thread.token-usage.updated",
            payload: { usage: initialUsage },
          } satisfies ProviderRuntimeEvent);
        }
        return session;
      });

    const buildPromptPayload = (input: {
      readonly input?: string | undefined;
      readonly attachments?: ReadonlyArray<ChatAttachment> | undefined;
    }) =>
      Effect.gen(function* () {
        const text =
          appendFileAttachmentsPromptBlock({
            text: input.input,
            attachments: input.attachments,
            attachmentsDir: serverConfig.attachmentsDir,
            include: "all-files",
          }) ?? "";
        const images = yield* Effect.forEach(
          input.attachments ?? [],
          (attachment) =>
            Effect.gen(function* () {
              if (attachment.type !== "image" || !attachment.mimeType) return undefined;
              const attachmentPath = resolveProviderAttachmentPath({
                attachmentsDir: serverConfig.attachmentsDir,
                attachment,
              });
              if (!attachmentPath) {
                return yield* new ProviderAdapterValidationError({
                  provider: provider,
                  operation: "turn/start",
                  issue: `Invalid attachment id '${attachment.id}'.`,
                });
              }
              const bytes = yield* fileSystem.readFile(attachmentPath).pipe(
                Effect.mapError(
                  (cause) =>
                    new ProviderAdapterRequestError({
                      provider: provider,
                      method: "turn/start",
                      detail: toMessage(cause, "Failed to read attachment file."),
                      cause,
                    }),
                ),
              );
              return {
                type: "image" as const,
                data: Buffer.from(bytes).toString("base64"),
                mimeType: attachment.mimeType,
              };
            }),
          { concurrency: 1 },
        );
        return {
          text,
          images: images.filter((image): image is ImageContent => image !== undefined),
        };
      });

    const sendTurn: PiAdapterShape["sendTurn"] = (input) =>
      sessionResourceAdmission.withLock(
        input.threadId,
        Effect.gen(function* () {
          const context = yield* requireSession(input.threadId);
          if (context.activeTurnId) {
            return yield* new ProviderAdapterValidationError({
              provider: provider,
              operation: "sendTurn",
              issue: `A ${displayName} turn is already active for this thread.`,
            });
          }
          if (provider === "omnimind") {
            const currentRevision = getOmniMindModelRuntimeMutationRevision(context.agentDir);
            if (currentRevision > context.appliedModelRuntimeMutationRevision) {
              yield* Effect.tryPromise({
                try: async () => {
                  await context.runtime.services.modelRuntime.refresh({ allowNetwork: false });
                  const configurationError = context.runtime.services.modelRuntime.getError();
                  if (configurationError !== undefined) {
                    throw new Error("OmniMind model-service state could not be reconciled.");
                  }
                  const piSdk = await family.loadModule();
                  context.modelRegistry = modelRegistryFacade(
                    context.runtime.services.modelRuntime,
                    piSdk,
                  );
                  context.appliedModelRuntimeMutationRevision = currentRevision;
                },
                catch: (cause) =>
                  new ProviderAdapterRequestError({
                    provider,
                    method: "model-services/reconcile",
                    detail: "OmniMind model-service changes could not be applied to this session.",
                    cause,
                  }),
              });
            }
          }
          if (input.modelSelection?.provider === provider) {
            const model = findModelInRegistry(context.modelRegistry, input.modelSelection.model);
            if (!model) {
              return yield* new ProviderAdapterValidationError({
                provider: provider,
                operation: "model/set",
                issue: `${displayName} model '${input.modelSelection.model}' is not available in the current runtime catalog. Choose a discovered model and try again.`,
              });
            }
            // Pi's setModel rejects an unauthenticated model before the adapter's
            // general send gate runs. Check the requested model first so the product
            // reports a deliberate credential block instead of leaking an SDK stack.
            if (!piModelHasConfiguredCredentials(context.runtime.services.modelRuntime, model)) {
              return yield* new ProviderAdapterValidationError({
                provider: provider,
                operation: "sendTurn",
                issue: `${displayName} cannot send with provider '${model.provider}' because no credentials are configured. Add credentials for ${displayName}, then retry.`,
              });
            }
            yield* Effect.tryPromise({
              try: () => context.runtime.session.setModel(model),
              catch: (cause) =>
                new ProviderAdapterRequestError({
                  provider: provider,
                  method: "model/set",
                  detail: toMessage(cause, `Failed to set ${displayName} model.`),
                  cause,
                }),
            });
            const thinkingLevel = normalizePiThinkingLevel(
              input.modelSelection.options?.thinkingLevel,
            );
            if (thinkingLevel) {
              context.runtime.session.setThinkingLevel(thinkingLevel);
            }
          }
          const activeModel = context.runtime.session.model;
          if (
            !piModelHasConfiguredCredentials(context.runtime.services.modelRuntime, activeModel)
          ) {
            return yield* new ProviderAdapterValidationError({
              provider: provider,
              operation: "sendTurn",
              issue: activeModel
                ? `${displayName} cannot send with provider '${activeModel.provider}' because no credentials are configured. Add credentials for ${displayName}, then retry.`
                : `${displayName} cannot send because no model with configured credentials is selected.`,
            });
          }
          const payload = yield* buildPromptPayload(input);
          const turnId = TurnId.makeUnsafe(crypto.randomUUID());
          context.activeTurnId = turnId;
          context.startedTurnId = undefined;
          context.turns.push({ id: turnId, items: [] });
          context.session = makeSessionSnapshot(context, provider);
          if (payload.images.length === 0 && isPiReloadCommand(payload.text)) {
            offerRuntimeEvent({
              ...makeEventBase(context),
              type: "turn.started",
              payload: {
                ...(context.runtime.session.model
                  ? {
                      model: `${context.runtime.session.model.provider}/${context.runtime.session.model.id}`,
                    }
                  : {}),
                effort: context.runtime.session.thinkingLevel,
              },
              raw: { source: "pi.sdk.event", method: "reload", payload: { command: payload.text } },
            } satisfies ProviderRuntimeEvent);
            yield* Effect.tryPromise({
              try: () => context.runtime.session.reload(),
              catch: (cause) =>
                new ProviderAdapterRequestError({
                  provider: provider,
                  method: "session/reload",
                  detail: toMessage(cause, `Failed to reload ${displayName} resources.`),
                  cause,
                }),
            }).pipe(
              Effect.catch((error) =>
                Effect.gen(function* () {
                  const message = error.message;
                  offerRuntimeEvent({
                    ...makeEventBase(context),
                    type: "turn.completed",
                    payload: { state: "failed", stopReason: "error", errorMessage: message },
                    raw: { source: "pi.sdk.event", method: "reload", payload: error },
                  } satisfies ProviderRuntimeEvent);
                  offerRuntimeError(context, {
                    message,
                    method: "session/reload",
                    cause: error,
                  });
                  yield* cancelAgentGatewayTurn(context.gatewaySessionLease, context.activeTurnId);
                  context.activeTurnId = undefined;
                  context.startedTurnId = undefined;
                  context.session = makeSessionSnapshot(context, provider);
                  return yield* Effect.fail(error);
                }),
              ),
            );
            offerRuntimeEvent({
              ...makeEventBase(context),
              type: "turn.completed",
              payload: { state: "completed", stopReason: "reload" },
              raw: { source: "pi.sdk.event", method: "reload", payload: { command: payload.text } },
            } satisfies ProviderRuntimeEvent);
            yield* cancelAgentGatewayTurn(context.gatewaySessionLease, context.activeTurnId);
            context.activeTurnId = undefined;
            context.startedTurnId = undefined;
            context.session = makeSessionSnapshot(context, provider);
            return {
              threadId: input.threadId,
              turnId,
              resumeCursor: getSessionFile(context.runtime.session),
            };
          }
          void submitPiPrompt(context, turnId, payload.text, payload.images)
            .then((outcome) => {
              resolvePromptSubmission(context, turnId, outcome);
            })
            .catch((cause) => {
              completePromptRejection(context, turnId, cause);
            });
          return {
            threadId: input.threadId,
            turnId,
            resumeCursor: getSessionFile(context.runtime.session),
          };
        }),
      );

    const steerTurn: NonNullable<PiAdapterShape["steerTurn"]> = (input) =>
      sessionResourceAdmission.withLock(
        input.threadId,
        Effect.gen(function* () {
          const context = yield* requireSession(input.threadId);
          const payload = yield* buildPromptPayload(input);
          const turnId = context.activeTurnId ?? TurnId.makeUnsafe(crypto.randomUUID());
          if (!context.activeTurnId) {
            context.activeTurnId = turnId;
            context.startedTurnId = undefined;
            context.turns.push({ id: turnId, items: [] });
          }
          if (context.runtime.session.isStreaming) {
            yield* Effect.tryPromise({
              try: () => context.runtime.session.steer(payload.text, payload.images),
              catch: (cause) =>
                new ProviderAdapterRequestError({
                  provider: provider,
                  method: "turn/steer",
                  detail: toMessage(cause, `Failed to steer ${displayName} turn.`),
                  cause,
                }),
            });
          } else {
            void submitPiPrompt(context, turnId, payload.text, payload.images)
              .then((outcome) => {
                resolvePromptSubmission(context, turnId, outcome);
              })
              .catch((cause) => {
                completePromptRejection(context, turnId, cause);
              });
          }
          return {
            threadId: input.threadId,
            turnId,
            resumeCursor: getSessionFile(context.runtime.session),
          };
        }),
      );

    const interruptTurn: PiAdapterShape["interruptTurn"] = (threadId, turnId) =>
      Effect.gen(function* () {
        const context = yield* requireSession(threadId);
        if (turnId !== undefined && turnId !== context.activeTurnId) {
          yield* Effect.logWarning("pi.stale_interrupt_ignored", {
            threadId,
            requestedTurnId: turnId,
            activeTurnId: context.activeTurnId,
          });
          return;
        }
        const activeTurnId = turnId ?? context.activeTurnId;
        if (activeTurnId === undefined) return;
        // Cancel both Pi's retry backoff and any active provider I/O without
        // awaiting AgentSession.abort(); ProviderService owns deterministic
        // runtime teardown and the orchestration projection settlement.
        yield* withAgentGatewayTurnCancellation(
          context.gatewaySessionLease,
          activeTurnId,
          Effect.try({
            try: () => {
              context.runtime.session.abortRetry();
              context.runtime.session.agent.abort();
            },
            catch: (cause) =>
              new ProviderAdapterRequestError({
                provider: provider,
                method: "turn/interrupt",
                detail: toMessage(cause, `Failed to interrupt ${displayName} turn.`),
                cause,
              }),
          }),
        );
      });

    const respondUnsupported = (threadId: ThreadId, method: string) =>
      Effect.fail(
        new ProviderAdapterRequestError({
          provider: provider,
          method,
          detail: `${displayName} does not expose OmniMind approval/user-input requests for thread ${threadId}.`,
        }),
      );

    const respondToUserInput: PiAdapterShape["respondToUserInput"] = (
      threadId,
      requestId,
      answers,
    ) =>
      Effect.gen(function* () {
        const context = yield* requireSession(threadId);
        if (!resolvePiExtensionUserInput(context, requestId, answers)) {
          return yield* new ProviderAdapterRequestError({
            provider: provider,
            method: "user-input/respond",
            detail: `Unknown pending ${displayName} user-input request: ${requestId}`,
          });
        }
      });

    const stopSession: PiAdapterShape["stopSession"] = (threadId) =>
      Effect.gen(function* () {
        const context = sessions.get(threadId);
        if (!context) return;
        yield* Effect.tryPromise({
          try: () => disposeSessionContext(context),
          catch: (cause) =>
            new ProviderAdapterRequestError({
              provider: provider,
              method: "session/stop",
              detail: toMessage(cause, `Failed to stop ${displayName} session.`),
              cause,
            }),
        });
        if (sessions.get(threadId) === context) {
          sessions.delete(threadId);
        }
        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "thread.state.changed",
          payload: { state: "closed", detail: { reason: "stopped" } },
        } satisfies ProviderRuntimeEvent);
        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "session.exited",
          payload: { reason: "stopped", exitKind: "graceful" },
        } satisfies ProviderRuntimeEvent);
      });

    const reloadSessionResources: NonNullable<PiAdapterShape["reloadSessionResources"]> = (
      threadId,
    ) =>
      sessionResourceAdmission.withLock(
        threadId,
        Effect.gen(function* () {
          const context = sessions.get(threadId);
          if (!context || context.stopped) return "no_active_session" as const;
          if (
            context.activeTurnId !== undefined ||
            context.runtime.session.isStreaming ||
            context.activeToolItems.size > 0 ||
            context.pendingUserInputs.size > 0
          ) {
            return "busy" as const;
          }
          yield* Effect.tryPromise({
            try: () => context.runtime.session.reload(),
            catch: (cause) =>
              new ProviderAdapterRequestError({
                provider,
                method: "session/reload",
                detail: toMessage(cause, `Failed to reload ${displayName} resources.`),
                cause,
              }),
          });
          return "reloaded" as const;
        }),
      );

    const listSessions: PiAdapterShape["listSessions"] = () =>
      Effect.sync(() =>
        Array.from(sessions.values()).map((context) => makeSessionSnapshot(context, provider)),
      );

    const hasSession: PiAdapterShape["hasSession"] = (threadId) =>
      Effect.sync(() => sessions.has(threadId));

    const snapshotThread = (context: PiSessionContext): ProviderThreadSnapshot => {
      const historyItems = mapMessageHistory(context.runtime.session);
      const activeTurn = context.activeTurnId
        ? context.turns.find((turn) => turn.id === context.activeTurnId)
        : undefined;
      const turns = [
        ...(historyItems.length > 0
          ? [
              {
                id: TurnId.makeUnsafe(`pi-history-${context.runtime.session.sessionId}`),
                items: historyItems,
              },
            ]
          : []),
        ...(activeTurn ? [{ id: activeTurn.id, items: [...activeTurn.items] }] : []),
      ];
      return {
        threadId: context.session.threadId,
        ...(context.session.cwd ? { cwd: context.session.cwd } : {}),
        turns:
          turns.length > 0
            ? turns
            : context.turns.map((turn) => ({ id: turn.id, items: [...turn.items] })),
      };
    };

    const readThread: PiAdapterShape["readThread"] = (threadId) =>
      requireSession(threadId).pipe(Effect.map(snapshotThread));

    const rollbackThread: PiAdapterShape["rollbackThread"] = (threadId, numTurns) =>
      Effect.gen(function* () {
        const context = yield* requireSession(threadId);
        const nextLength = Math.max(0, context.turns.length - Math.max(0, numTurns));
        context.turns.splice(nextLength);
        const leafId = context.turns.at(-1)?.leafId;
        if (leafId) {
          context.runtime.session.sessionManager.branch(leafId);
        } else if (nextLength === 0) {
          context.runtime.session.sessionManager.resetLeaf();
        }
        return snapshotThread(context);
      });

    const compactThread: NonNullable<PiAdapterShape["compactThread"]> = (threadId) =>
      requireSession(threadId).pipe(
        Effect.flatMap((context) =>
          Effect.tryPromise({
            try: () => context.runtime.session.compact(),
            catch: (cause) =>
              new ProviderAdapterRequestError({
                provider: provider,
                method: "thread/compact",
                detail: toMessage(cause, `Failed to compact ${displayName} thread.`),
                cause,
              }),
          }),
        ),
        Effect.asVoid,
      );

    const stopAll: PiAdapterShape["stopAll"] = () =>
      Effect.forEach(Array.from(sessions.keys()), (threadId) => stopSession(threadId), {
        concurrency: "unbounded",
        discard: true,
      }).pipe(Effect.asVoid);

    const listModels: NonNullable<PiAdapterShape["listModels"]> = (input) =>
      Effect.tryPromise({
        try: async () => {
          const piSdk = await family.loadModule();
          const agentDir = family.resolveAgentDir(input.agentDir, serverConfig.baseDir, piSdk);
          const cwd = trimToUndefined(input.cwd) ?? serverConfig.cwd;
          const modelRuntime = await family.createModelRuntime(agentDir);
          const services = await piSdk.createAgentSessionServices({
            cwd,
            agentDir,
            modelRuntime,
          });
          const registry = modelRegistryFacade(services.modelRuntime, piSdk);
          const extensionProviderIds = new Set(services.modelRuntime.getRegisteredProviderIds());
          const configuredProviderIds = new Set(
            hasModelConfigProviderIdentity(services.modelRuntime)
              ? services.modelRuntime.getModelConfigProviderIds()
              : [],
          );
          const extensionCount = services.resourceLoader.getExtensions().extensions.length;
          const models = getPiDiscoverableModels(registry).flatMap((model) => {
            const descriptor = toPiProviderModelDescriptor(
              model,
              registry.getProviderDisplayName.bind(registry),
              (providerId) =>
                extensionProviderIds.has(providerId)
                  ? "extension"
                  : configuredProviderIds.has(providerId)
                    ? "models_json"
                    : family.provider === "omnimind" &&
                        services.modelRuntime.getProvider(providerId)
                      ? "builtin"
                      : "unknown",
            );
            return descriptor ? [descriptor] : [];
          });
          return {
            models,
            source: extensionCount > 0 ? "pi.sdk+extensions" : "pi.sdk",
            cached: false,
          } satisfies ProviderListModelsResult;
        },
        catch: (cause) =>
          new ProviderAdapterRequestError({
            provider: provider,
            method: "model/list",
            detail: toMessage(cause, `Failed to list ${displayName} models.`),
            cause,
          }),
      });

    const listSkills: NonNullable<PiAdapterShape["listSkills"]> = (input) =>
      Effect.tryPromise({
        try: async () => {
          const active = input.threadId
            ? sessions.get(ThreadId.makeUnsafe(input.threadId))
            : undefined;
          const loader = active?.runtime.session.resourceLoader;
          if (active && input.forceReload) {
            await active.runtime.session.reload();
          }
          let services:
            | Awaited<ReturnType<PiCodingAgentModule["createAgentSessionServices"]>>
            | undefined;
          if (!loader) {
            const piSdk = await family.loadModule();
            const agentDir = family.resolveAgentDir(input.agentDir, serverConfig.baseDir, piSdk);
            const modelRuntime = await family.createModelRuntime(agentDir);
            services = await piSdk.createAgentSessionServices({
              cwd: input.cwd,
              agentDir,
              modelRuntime,
            });
          }
          if (services && input.forceReload) {
            await services.resourceLoader.reload();
          }
          const resourceLoader = loader ?? services?.resourceLoader;
          if (!resourceLoader) {
            throw new Error(`Failed to create ${displayName} resource loader.`);
          }
          const result = resourceLoader.getSkills();
          return {
            skills: result.skills.map((skill) => {
              const description = trimToUndefined(skill.description);
              const scope = trimToUndefined(skill.sourceInfo.source);
              return {
                name: skill.name,
                ...(description ? { description } : {}),
                path: skill.filePath,
                enabled: !skill.disableModelInvocation,
                ...(scope ? { scope } : {}),
              };
            }),
            source: "pi.sdk",
            cached: false,
          } satisfies ProviderListSkillsResult;
        },
        catch: (cause) =>
          new ProviderAdapterRequestError({
            provider: provider,
            method: "skill/list",
            detail: toMessage(cause, `Failed to list ${displayName} skills.`),
            cause,
          }),
      });

    const listCommands: NonNullable<PiAdapterShape["listCommands"]> = (input) =>
      Effect.tryPromise({
        try: async () => {
          const active = input.threadId
            ? sessions.get(ThreadId.makeUnsafe(input.threadId))
            : undefined;
          const session = active?.runtime.session;
          const reloadCommand = {
            name: "reload",
            description: `Reload ${displayName} extensions, skills, prompts, themes, tools, and settings`,
          };
          if (session) {
            if (input.forceReload) {
              await session.reload();
            }
            const extensionCommands = session.extensionRunner
              .getRegisteredCommands()
              .map((command) => ({
                name: command.invocationName,
                description: trimToUndefined(command.description) ?? "Extension command",
              }));
            const promptCommands = session.promptTemplates.map((template) => ({
              name: template.name,
              description: trimToUndefined(template.description) ?? "Prompt template",
            }));
            const skillCommands = session.resourceLoader.getSkills().skills.map((skill) => ({
              name: `skill:${skill.name}`,
              description: trimToUndefined(skill.description) ?? "Skill",
            }));
            return {
              commands: [reloadCommand, ...extensionCommands, ...promptCommands, ...skillCommands],
              source: "pi.sdk",
              cached: false,
            } satisfies ProviderListCommandsResult;
          }
          const piSdk = await family.loadModule();
          const agentDir = family.resolveAgentDir(input.agentDir, serverConfig.baseDir, piSdk);
          const modelRuntime = await family.createModelRuntime(agentDir);
          const services = await piSdk.createAgentSessionServices({
            cwd: input.cwd,
            agentDir,
            modelRuntime,
          });
          if (input.forceReload) {
            await services.resourceLoader.reload();
          }
          const promptCommands = services.resourceLoader.getPrompts().prompts.map((template) => ({
            name: template.name,
            description: trimToUndefined(template.description) ?? "Prompt template",
          }));
          const skillCommands = services.resourceLoader.getSkills().skills.map((skill) => ({
            name: `skill:${skill.name}`,
            description: trimToUndefined(skill.description) ?? "Skill",
          }));
          return {
            commands: [reloadCommand, ...promptCommands, ...skillCommands],
            source: "pi.sdk",
            cached: false,
          } satisfies ProviderListCommandsResult;
        },
        catch: (cause) =>
          new ProviderAdapterRequestError({
            provider: provider,
            method: "command/list",
            detail: toMessage(cause, `Failed to list ${displayName} commands.`),
            cause,
          }),
      });

    const getComposerCapabilities: NonNullable<PiAdapterShape["getComposerCapabilities"]> = () =>
      Effect.succeed({
        provider: provider,
        supportsSkillMentions: true,
        supportsSkillDiscovery: true,
        supportsNativeSlashCommandDiscovery: true,
        supportsPluginMentions: false,
        supportsPluginDiscovery: false,
        supportsRuntimeModelList: true,
        supportsThreadCompaction: true,
        supportsThreadImport: false,
      } satisfies ProviderComposerCapabilities);

    yield* Effect.addFinalizer(() =>
      stopAll().pipe(
        Effect.orDie,
        Effect.andThen(runtimeEventIngress.stop),
        Effect.ensuring(
          ownsNativeEventLogger && nativeEventLogger
            ? nativeEventLogger.close().pipe(Effect.ignore)
            : Effect.void,
        ),
        Effect.ensuring(Queue.shutdown(runtimeEventQueue)),
      ),
    );

    return {
      provider: provider,
      capabilities: {
        sessionModelSwitch: "in-session",
        supportsSkillMentions: true,
        supportsSkillDiscovery: true,
        supportsNativeSlashCommandDiscovery: true,
        supportsPluginMentions: false,
        supportsPluginDiscovery: false,
        supportsRuntimeModelList: true,
        supportsTurnSteering: true,
      },
      startSession,
      sendTurn,
      steerTurn,
      interruptTurn,
      respondToRequest: (threadId) => respondUnsupported(threadId, "request/respond"),
      respondToUserInput,
      stopSession,
      reloadSessionResources,
      listSessions,
      hasSession,
      readThread,
      rollbackThread,
      compactThread,
      stopAll,
      listModels,
      listSkills,
      listCommands,
      getComposerCapabilities,
      get streamEvents() {
        return Stream.fromQueue(runtimeEventQueue);
      },
    } satisfies ProviderAdapterShape<ProviderAdapterError> & { readonly provider: P };
  });

export const PiAdapterLive = Layer.effect(PiAdapter, makePiAdapter(STOCK_PI_FAMILY));

export function makePiAdapterLive(options?: PiAdapterLiveOptions) {
  return Layer.effect(PiAdapter, makePiAdapter(STOCK_PI_FAMILY, options));
}

export const OmniMindAgentAdapterLive = Layer.effect(
  OmniMindAgentAdapter,
  makePiAdapter(OMNIMIND_AGENT_FAMILY),
);

export function makeOmniMindAgentAdapterLive(options?: PiAdapterLiveOptions) {
  return Layer.effect(OmniMindAgentAdapter, makePiAdapter(OMNIMIND_AGENT_FAMILY, options));
}
