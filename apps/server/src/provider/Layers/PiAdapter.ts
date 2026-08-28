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
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import type { Api, ImageContent, Model, TextContent } from "@earendil-works/pi-ai";
import type { PromptOutcome as OmniMindPromptOutcome } from "@harnessos/pi-coding-agent";
import {
  ASK_USER_TOOL_NAME,
  type AskUserProductInteractionPort,
  type AskUserResult,
  type AskUserToolInput,
} from "@harnessos/om-ask";
import {
  ApprovalRequestId,
  type BuiltInToolGroupId,
  type ChatAttachment,
  type CanonicalUserInputResponse,
  type CanonicalUserInputSettlement,
  EventId,
  type ProviderListCommandsResult,
  type ProviderListModelsResult,
  type ProviderListSkillsResult,
  type EngineKind,
  type ProviderInteractionMode,
  ProviderItemId,
  type ProviderRuntimeEvent,
  type ProviderSession,
  type ProviderUserInputAnswers,
  type ProviderWorkSurface,
  RuntimeItemId,
  RuntimeRequestId,
  ThreadId,
  type ThreadTokenUsageSnapshot,
  type TurnTasksUpdatedPayload,
  TurnId,
  type UserInputQuestion,
} from "@harnessos/contracts";
import { Effect, FileSystem, Layer, Option, Queue, Stream } from "effect";
import type { ProductSurface } from "@harnessos/shared/productSurface";

import { renderOmniMindHarnessPolicy } from "../../agentGateway/harnessPolicy.ts";
import {
  agentGatewayGroupsFromToolDescriptors,
  listAgentGatewayMcpTools,
  type AgentGatewayMcpFetch,
  type AgentGatewayMcpToolDescriptor,
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
import {
  canonicalUserInputRequestFromQuestions,
  encodeCanonicalUserInputResponse,
} from "../canonicalUserInput.ts";
import { ServerConfig } from "../../config.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
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
import { buildAgentGatewayPiToolDefinitions } from "../agentGatewayPiProjection.ts";
import { inspectOmniMindWebAccessRegistration } from "@harnessos/om-web-access";
import type { CuratorPresenter } from "@harnessos/om-web-access/curator-presentation";
import { type AgentGatewayHostExtensionHandle } from "../agentGatewayHostExtension.ts";
import { GOAL_CONTINUATION_GATEWAY_TOOL_NAMES } from "../goalMode.ts";
import { AUTOMATION_RUN_GATEWAY_TOOL_NAMES } from "../../automation/runEnvelope.ts";
import {
  inspectOmniMindTaskListExtensionRegistration,
  HARNESSOS_TASK_LIST_TOOL_NAME,
} from "../omnimindTaskListExtension.ts";
import { inspectOmniMindAskUserRegistration } from "../omnimindAskUserExtension.ts";
import { userInputPresenterRegistry } from "../userInputPresenterRegistry.ts";
import {
  buildOmniMindSessionExtensions,
  type OmniMindSessionExtensionComposition,
} from "../omnimindSessionExtensions.ts";
import {
  PROVIDER_ADAPTER_RUNTIME_EVENT_BUFFER_CAPACITY,
  type ProviderAdapterShape,
  type ProviderResourceDiscoveryScope,
  type ProviderThreadSnapshot,
  type ProviderTurnDispatchContext,
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
  type SizedProviderRuntimeEvent,
} from "../providerRuntimeEventIngress.ts";
import { clampUsagePercent, nonNegativeFiniteNumber, positiveFiniteNumber } from "../tokenUsage.ts";
import { type EventNdjsonLogger, makeEventNdjsonLogger } from "./EventNdjsonLogger.ts";
import {
  teardownChildProcessTree,
  teardownProviderProcessTree,
} from "../supervisedProcessTeardown.ts";
import { BrowserAutomationHost } from "../../browserAutomation/Services/BrowserAutomationHost.ts";
import { BrowserHostRpcError } from "../../browserAutomation/browserHostRpcClient.ts";
import {
  engineWebSurfacePresentationMetadata,
  extractPiCuratorWebSurfaceUrl,
  extractTypedEngineWebSurface,
  registerEngineWebSurfaceIntent,
  requireReadyEngineWebSurfaceContext,
  sanitizeEngineWebSurfacePayload,
} from "../../engineWebSurface/engineWebSurfaceHost.ts";
import {
  createOmniMindModelsConfigReader,
  loadOmniMindCodingAgentModule,
  resolveOmniMindAgentDir,
} from "../omnimindAgentRuntime.ts";
import { getOmniMindModelRuntimeMutationRevision } from "../omnimindModelRuntimeMutation.ts";
import { resolveRealPathWithinRoot } from "../../workspace/realPathContainment.ts";
import { providerExecutionStructure } from "../providerExecutionStructure.ts";
import { projectAskUserRequest, resolveAskUserResponse } from "../askUserHostBridge.ts";
import { extractProposedPlanMarkdown, withProviderPlanModePrompt } from "../planMode.ts";
import type { OmniMindPlanModeController } from "../omnimindPlanModeExtension.ts";
import { askUserMetrics } from "../askUserMetrics.ts";

type PiFamilyProvider = Extract<EngineKind, "pi" | "oa">;
const DEFAULT_PI_THINKING_LEVEL: ThinkingLevel = "medium";
const HARNESSOS_IDENTITY_AND_COGNITIVE_CONTRACT = [
  "You are OmniMind, created by πAI-Lab at the International Academy of Phronesis Medicine (Guangdong).",
  "The academy's official Chinese name is 广东智慧医学国际研究院.",
  "",
  "Understand what the user is ultimately trying to achieve. Do not treat the user's first wording as a complete specification or assume specialized knowledge in the current domain. Adapt the density of explanation to evidence from the conversation without quizzing the user about their level.",
  "",
  "Separate facts you can investigate from intent only the user can provide. Use available context and tools to investigate facts yourself. Ask focused questions when the user's goal, preferences, constraints, or quality bar could materially change the result. Include your recommended interpretation or path instead of handing the decision back without judgment.",
  "",
  "Look beyond the literal request for important blind spots, risks, and meaningfully better paths. Improvements that preserve the same goal, scope, cost, and risk can be incorporated directly. Before changing any of those, explain the better path and align with the user.",
  "",
  "If the user asks you to proceed without questions, state and use reasonable assumptions for low-risk, reversible ambiguity. Do not bypass a material intent fork or high-risk boundary.",
  "",
  "Be honest and independent-minded. When evidence or constraints conflict with the user's premise, explain the conflict concretely and continue toward a workable path. Never claim an action or verification that did not occur.",
  "",
  "By default, communicate naturally in the user's language, lead with the outcome, and stay concise but complete; expand when complexity, risk, learning, or evidence requires it. If asked who you are, answer directly without unnecessary preamble.",
  "Honor explicit user preferences for language, tone, format, level of detail, and working style when they do not conflict with identity, work-surface boundaries, alignment and task-completion policy, truthfulness, or safety.",
].join("\n");
const HARNESSOS_CHAT_CONTRACT = [
  "In Chat, help the user understand, explore, decide, learn, and produce useful work.",
  "",
  "Give a clear, usable starting answer whenever it can be done without misleading the user, and clarify in parallel. Ask before answering when different plausible intents would reverse the answer, create material risk, or waste substantial effort.",
  "",
  "Explain necessary concepts in place and connect prerequisites when the user is learning, without hiding essential complexity or burdening them with unrelated advanced detail.",
  "",
  "When several approaches are reasonable, recommend a primary path and explain why and its key tradeoffs; include alternatives only when useful.",
  "",
  "Explicit file and folder references are inputs for the current conversation. They are not a working directory, Project, or trusted project root, and must not be treated as permission to scan nearby paths.",
  "Treat external references as read-and-understand inputs by default. If the user explicitly asks to write a named path or run an available Engine-native operation, follow the real permission and risk rules; Chat is not a hard filesystem, Git, or Terminal sandbox.",
  "When you produce ordinary file results without an explicit destination, use the managed Chat workspace already provided by OmniMind.",
  "Use available tools when they materially improve accuracy, timeliness, or completeness. When the work naturally needs a durable Project boundary, sustained project execution, or trusted project-local context and resources, explain that boundary and suggest Send to Agent.",
].join("\n");
const HARNESSOS_AGENT_CONTRACT = [
  "In Agent, understand the user's actual desired outcome and carry aligned work through to a verified result.",
  "",
  "Before substantive execution, ensure the intended outcome, material boundaries, important constraints, and success criteria are sufficiently aligned. Alignment is sufficient when no unresolved ambiguity would materially change the result; it does not require the user to specify every low-risk implementation detail.",
  "",
  "While alignment is incomplete, continue with safe read-only investigation, analysis, and reversible preparation, but do not make direction-locking, persistent, costly, or externally consequential changes.",
  "",
  "Once aligned, act proactively within scope. Make ordinary, reversible, low-risk decisions and tool choices without repeated permission. Confirm before destructive, irreversible, costly, permission-expanding, externally publishing or sending, security-boundary-changing, or out-of-scope actions.",
  "",
  "Inspect existing state and applicable project rules, preserve existing work, execute the necessary steps, verify the result proportionately, and close the loop. Do not stop after superficial steps or hand back work that can be completed within available capabilities. If blocked, explain the exact cause, what is complete, and the smallest decision needed.",
].join("\n");
const HARNESSOS_STUDIO_CONTRACT = [
  "In Studio, work inside OmniMind's managed creative workspace and its established workspace instructions, drafts, files, and outputs.",
  "Create, edit, and organize the requested work in that managed Studio environment, and make useful results visible through its existing outputs and file surfaces.",
  "Studio is not an Agent Project trust root. Do not infer project-local resources or broader filesystem authority from its managed working directory.",
].join("\n");
const PI_THINKING_OPTIONS: ReadonlyArray<{
  readonly value: ThinkingLevel;
  readonly label: string;
  readonly description: string;
  readonly isDefault?: true;
}> = [
  { value: "off", label: "Off", description: "No extra reasoning" },
  { value: "minimal", label: "Minimal", description: "Light reasoning" },
  { value: "low", label: "Low", description: "Faster reasoning" },
  {
    value: "medium",
    label: "Medium",
    description: "Balanced reasoning",
    isDefault: true,
  },
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
  | "SettingsManager"
  | "createAgentSessionFromServices"
  | "createAgentSessionRuntime"
  | "createAgentSessionServices"
  | "createBashToolDefinition"
  | "defineTool"
  | "getAgentDir"
  | "getShellConfig"
> & { readonly DEFAULT_BASE_INSTRUCTIONS?: string };
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
      execution.signal?.addEventListener("abort", requestTeardown, {
        once: true,
      });

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
    SettingsManager: sdk.SettingsManager,
    createAgentSessionFromServices: sdk.createAgentSessionFromServices,
    createAgentSessionRuntime: sdk.createAgentSessionRuntime,
    createAgentSessionServices: sdk.createAgentSessionServices,
    createBashToolDefinition: sdk.createBashToolDefinition,
    defineTool: sdk.defineTool,
    getAgentDir: sdk.getAgentDir,
    getShellConfig: sdk.getShellConfig,
    DEFAULT_BASE_INSTRUCTIONS: sdk.DEFAULT_BASE_INSTRUCTIONS,
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

const HARNESSOS_AGENT_FAMILY = {
  provider: "oa",
  displayName: "OmniMind",
  loadModule: loadOmniMindAdapterModule,
  // Product state is App-owned and cannot be redirected into stock Pi state.
  resolveAgentDir: (_requestedAgentDir, serverBaseDir) => resolveOmniMindAgentDir(serverBaseDir),
  createModelRuntime: async (agentDir: string) =>
    (await createOmniMindModelRuntime(agentDir)) as unknown as ModelRuntime,
} satisfies PiFamilyAdapterConfig<"oa">;

interface PiSessionContext {
  readonly agentDir: string;
  appliedModelRuntimeMutationRevision: number;
  readonly workSurface?: ProviderWorkSurface;
  readonly productSurface?: ProductSurface;
  /** Frozen discovery trust for this native ResourceLoader; not a second policy owner. */
  readonly resourceScopeIdentity: string;
  readonly hostProjection?: AgentGatewayHostExtensionHandle;
  readonly planModeController?: OmniMindPlanModeController;
  gatewaySessionLease?: AgentGatewaySessionLease;
  gatewayConnection?: AgentGatewayMcpConnection;
  readonly lifecycleGeneration?: string;
  runtime: PiAgentRuntime;
  readonly processSupervisor: PiBashProcessSupervisor;
  modelRegistry: PiModelRegistry;
  session: ProviderSession;
  turns: PiStoredTurn[];
  activeTurnId: TurnId | undefined;
  activeInteractionMode: ProviderInteractionMode | undefined;
  proposedPlanCandidate: string | undefined;
  startedTurnId: TurnId | undefined;
  activeAssistantItemId: RuntimeItemId | undefined;
  activeReasoningItemId: RuntimeItemId | undefined;
  activeToolItems: Map<string, PiTrackedToolCall>;
  pendingPromptSubmission: PiPromptSubmission | undefined;
  pendingUserInputs: Map<ApprovalRequestId, PiPendingUserInput>;
  pendingProductUserInputs: Map<ApprovalRequestId, PiPendingProductUserInput>;
  settledProductUserInputIds: Set<ApprovalRequestId>;
  askUserProvenanceCollisionRecorded: boolean;
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
  canonicalUserInputLifecycle?: "candidate" | "projected";
  engineWebSurface?: {
    readonly url?: string;
    readonly surfaceId?: string;
    readonly unregister?: () => void;
    readonly status?: "pending" | "observing";
  };
}

interface PiPendingUserInput {
  readonly turnId?: TurnId;
  readonly resolve: (settlement: CanonicalUserInputSettlement) => void;
  readonly settleAborted: (emitRuntimeEvent?: boolean) => void;
}

interface PiPendingProductUserInput {
  readonly requestId: ApprovalRequestId;
  readonly sessionGeneration?: string;
  readonly turnId?: TurnId;
  readonly toolCallId: string;
  readonly resolve: (response: CanonicalUserInputResponse) => boolean;
  readonly settleAborted: (emitRuntimeEvent?: boolean) => void;
  readonly settleStale: () => void;
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

/**
 * Project the canonical MCP catalog into Pi's native custom-tool API. Tool
 * schemas and execution both remain owned by the gateway; Pi only adapts the
 * provider boundary.
 */
export async function buildPiAgentGatewayCustomTools(input: {
  readonly connection: AgentGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly fetch?: AgentGatewayMcpFetch;
  readonly onCatalog?: (tools: ReadonlyArray<AgentGatewayMcpToolDescriptor>) => void;
}): Promise<ReadonlyArray<ToolDefinition>> {
  const tools = await listAgentGatewayMcpTools({
    connection: input.connection,
    ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
  });
  if (tools.length === 0) {
    throw new Error("OmniMind MCP returned an empty tool catalog.");
  }
  input.onCatalog?.(tools);
  return buildPiAgentGatewayCustomToolsFromDescriptors({ ...input, tools });
}

export function buildPiAgentGatewayCustomToolsFromDescriptors(input: {
  readonly connection: AgentGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly tools: ReadonlyArray<AgentGatewayMcpToolDescriptor>;
  readonly fetch?: AgentGatewayMcpFetch;
}): ReadonlyArray<ToolDefinition> {
  return buildAgentGatewayPiToolDefinitions({
    connection: input.connection,
    defineTool: input.defineTool,
    descriptors: input.tools,
    ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
  });
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

export function normalizePiTokenUsage(
  stats: ReturnType<PiAgentSession["getSessionStats"]>,
  contextWindow?: number | null,
  previous?: ThreadTokenUsageSnapshot,
  useCurrentAsLastWhenPreviousMissing = false,
): ThreadTokenUsageSnapshot | undefined {
  const rawInputTokens = nonNegativeFiniteNumber(stats.tokens.input);
  const rawCacheReadTokens = nonNegativeFiniteNumber(stats.tokens.cacheRead);
  const rawCacheWriteTokens = nonNegativeFiniteNumber(stats.tokens.cacheWrite);
  const rawOutputTokens = nonNegativeFiniteNumber(stats.tokens.output);
  const rawTotalProcessedTokens = nonNegativeFiniteNumber(stats.tokens.total);
  const hasValidBreakdown =
    rawInputTokens !== undefined &&
    rawCacheReadTokens !== undefined &&
    rawCacheWriteTokens !== undefined &&
    rawOutputTokens !== undefined;
  const inputTokens = hasValidBreakdown ? Math.round(rawInputTokens) : 0;
  const cacheReadTokens = hasValidBreakdown ? Math.round(rawCacheReadTokens) : 0;
  const cacheWriteTokens = hasValidBreakdown ? Math.round(rawCacheWriteTokens) : 0;
  const outputTokens = hasValidBreakdown ? Math.round(rawOutputTokens) : 0;
  const totalProcessedTokens =
    rawTotalProcessedTokens === undefined ? 0 : Math.round(rawTotalProcessedTokens);
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
    cacheReadTokens <= 0 &&
    cacheWriteTokens <= 0 &&
    outputTokens <= 0 &&
    maxTokens === undefined &&
    usedPercent === undefined
  ) {
    return undefined;
  }
  const totalTokenBreakdown = hasValidBreakdown
    ? {
        cachedInputTokens: cacheReadTokens,
        uncachedInputTokens: inputTokens + cacheWriteTokens,
        outputTokens,
      }
    : undefined;
  const previousBreakdown = previous?.totalTokenBreakdown;
  const lastTokenBreakdown =
    totalTokenBreakdown && previousBreakdown
      ? {
          cachedInputTokens:
            totalTokenBreakdown.cachedInputTokens >= previousBreakdown.cachedInputTokens
              ? totalTokenBreakdown.cachedInputTokens - previousBreakdown.cachedInputTokens
              : totalTokenBreakdown.cachedInputTokens,
          uncachedInputTokens:
            totalTokenBreakdown.uncachedInputTokens >= previousBreakdown.uncachedInputTokens
              ? totalTokenBreakdown.uncachedInputTokens - previousBreakdown.uncachedInputTokens
              : totalTokenBreakdown.uncachedInputTokens,
          outputTokens:
            totalTokenBreakdown.outputTokens >= previousBreakdown.outputTokens
              ? totalTokenBreakdown.outputTokens - previousBreakdown.outputTokens
              : totalTokenBreakdown.outputTokens,
        }
      : totalTokenBreakdown && useCurrentAsLastWhenPreviousMissing
        ? totalTokenBreakdown
        : undefined;
  const hasLastBreakdown =
    lastTokenBreakdown !== undefined &&
    lastTokenBreakdown.cachedInputTokens +
      lastTokenBreakdown.uncachedInputTokens +
      lastTokenBreakdown.outputTokens >
      0;
  return {
    usedTokens,
    ...(usedPercent !== undefined ? { usedPercent } : {}),
    ...(totalProcessedTokens > usedTokens ? { totalProcessedTokens } : {}),
    ...(totalTokenBreakdown ? { totalTokenBreakdown } : {}),
    ...(hasLastBreakdown ? { lastTokenBreakdown } : {}),
    ...(maxTokens !== undefined ? { maxTokens } : {}),
    lastUsedTokens: usedTokens,
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

function latestAssistantText(messages: readonly unknown[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = toolRecord(messages[index]);
    if (message?.role !== "assistant") continue;
    const content = message.content;
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return undefined;
    return content
      .flatMap((block) => {
        const entry = toolRecord(block);
        return entry?.type === "text" && typeof entry.text === "string" ? [entry.text] : [];
      })
      .join("\n\n");
  }
  return undefined;
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
 * general Host/tool policy in Pi's existing mutable system-prompt projection
 * so slash input reaches that source-locked pipeline unchanged.
 */
export function makePiHostSystemPrompt(input: {
  readonly gatewayControlAvailable: boolean;
  readonly enabledBuiltInGroups?: ReadonlyArray<BuiltInToolGroupId>;
}): string {
  return [
    "<harnessos_host_context>",
    renderOmniMindHarnessPolicy({
      gatewayControlAvailable: input.gatewayControlAvailable,
      projection: {
        mode: "direct",
        enabledGroups: input.enabledBuiltInGroups ?? [],
      },
    }),
    "</harnessos_host_context>",
  ].join("\n");
}

export function promptRequiredAgentGatewayToolNames(
  dispatchContext: ProviderTurnDispatchContext | undefined,
): ReadonlyArray<string> {
  if (dispatchContext?.turnKind === "goal-continuation") {
    return GOAL_CONTINUATION_GATEWAY_TOOL_NAMES;
  }
  if (dispatchContext?.dispatchOrigin === "automation") {
    return AUTOMATION_RUN_GATEWAY_TOOL_NAMES;
  }
  return [];
}

/** Stable OmniMind identity and work-surface behavior that user Prompt resources cannot replace. */
export function makeOmniMindEngineSystemPrompt(input: {
  readonly productSurface?: ProductSurface;
  /** Backward-compatible test/embedding fallback; production passes ProductSurface. */
  readonly workSurface?: ProviderWorkSurface;
}): string {
  const surface = input.productSurface ?? (input.workSurface === "agent" ? "agent" : "chat");
  const surfaceContract =
    surface === "agent"
      ? HARNESSOS_AGENT_CONTRACT
      : surface === "studio"
        ? HARNESSOS_STUDIO_CONTRACT
        : HARNESSOS_CHAT_CONTRACT;
  return [
    "<harnessos_engine_contract>",
    HARNESSOS_IDENTITY_AND_COGNITIVE_CONTRACT,
    "",
    surfaceContract,
    "</harnessos_engine_contract>",
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
  engineWebSurfaceId?: string;
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
          engineWebSurface: engineWebSurfacePresentationMetadata(
            input.engineWebSurfaceStatus,
            input.engineWebSurfaceId,
          ),
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
        ...(edits
          ? {
              edits: edits.map((edit) => ({
                ...edit,
                ...(path ? { path } : {}),
              })),
            }
          : {}),
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
          pendingTools.set(content.id, {
            toolName: content.name,
            args: content.arguments,
          });
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

// Mirrors Pi 0.84.3's own session path encoding while honoring the explicit
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
    const serverSettings = Option.getOrUndefined(
      yield* Effect.serviceOption(ServerSettingsService),
    );
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
    const productDiscoveryOptions = (
      sdk: PiCodingAgentModule,
      cwd: string,
      agentDir: string,
      scope: "global-only" | "project" = "global-only",
    ) =>
      scope === "global-only"
        ? {
            settingsManager: sdk.SettingsManager.create(cwd, agentDir, {
              projectTrusted: false,
            }),
            resourceLoaderOptions: {
              noContextFiles: false,
              projectContextRoot: false,
            },
          }
        : {};
    const resourceScopeIdentity = (
      scope:
        | ProviderResourceDiscoveryScope
        | { readonly kind: "project"; readonly authoritativeRoot: string },
    ): string => (scope.kind === "project" ? `project:${scope.authoritativeRoot}` : "global-only");
    const sessionResourceAdmission = makeKeyedLock<ThreadId>();
    const ownsNativeEventLogger = options?.nativeEventLogger === undefined;
    const nativeEventLogger =
      options?.nativeEventLogger ??
      (options?.nativeEventLogPath !== undefined
        ? yield* makeEventNdjsonLogger(options.nativeEventLogPath, {
            stream: "native",
          })
        : undefined);
    const runtimeEventIngress = yield* makeBoundedCallbackIngress<
      SizedProviderRuntimeEvent,
      never,
      never
    >(
      (item) =>
        (nativeEventLogger && item.event.raw
          ? nativeEventLogger.write(item.event.raw, item.event.threadId).pipe(Effect.ignore)
          : Effect.void
        ).pipe(Effect.andThen(Queue.offer(runtimeEventQueue, item.event)), Effect.asVoid),
      {
        capacity: PROVIDER_ADAPTER_RUNTIME_EVENT_BUFFER_CAPACITY,
        maxBufferedBytes: PROVIDER_RUNTIME_CALLBACK_BUFFER_MAX_BYTES,
        terminalReserve: PROVIDER_RUNTIME_CALLBACK_TERMINAL_RESERVE,
        isTerminal: (item) => isTerminalProviderRuntimeEvent(item.event),
        sizeOf: (item) => item.bytes,
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
        providerRefs: {
          providerItemId: ProviderItemId.makeUnsafe(tracked.toolCallId),
        },
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
      tracked.engineWebSurface?.unregister?.();
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
      response: CanonicalUserInputResponse,
    ) => {
      const pending = context.pendingUserInputs.get(requestId);
      if (!pending) return false;
      pending.resolve(response);
      return true;
    };

    const requestProductAskUser = (
      context: PiSessionContext,
      input: {
        readonly toolCallId: string;
        readonly request: AskUserToolInput;
        readonly signal?: AbortSignal;
      },
    ): Promise<AskUserResult> => {
      const requestId = ApprovalRequestId.makeUnsafe(crypto.randomUUID());
      const runtimeRequestId = RuntimeRequestId.makeUnsafe(requestId);
      const terminal = (status: Exclude<AskUserResult["status"], "answered">): AskUserResult => ({
        version: 1,
        requestId,
        status,
      });
      if (context.stopped) return Promise.resolve(terminal("stale"));
      if (input.signal?.aborted) return Promise.resolve(terminal("aborted"));
      const projection = projectAskUserRequest(input.request);
      const trackedToolCall = context.activeToolItems.get(input.toolCallId);
      if (
        trackedToolCall?.toolName === ASK_USER_TOOL_NAME &&
        trackedToolCall.canonicalUserInputLifecycle === "candidate"
      ) {
        // The interaction port is the structured proof that this exact bundled
        // Tool call became canonical User Input. Its generic Pi lifecycle stays
        // hidden; third-party and failed pre-interaction calls keep their row.
        trackedToolCall.canonicalUserInputLifecycle = "projected";
      }
      const requestedAt = Date.now();
      askUserMetrics.increment("requested");

      if (!userInputPresenterRegistry.available) {
        const result = terminal("unavailable");
        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "user-input.requested",
          requestId: runtimeRequestId,
          payload: projection.request,
        } satisfies ProviderRuntimeEvent);
        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "user-input.resolved",
          requestId: runtimeRequestId,
          payload: { settlement: { status: "unavailable" } },
        } satisfies ProviderRuntimeEvent);
        askUserMetrics.settle("unavailable", Date.now() - requestedAt);
        return Promise.resolve(result);
      }

      return new Promise((resolve) => {
        let settled = false;
        let removeUnavailableListener: () => void = () => undefined;
        let removeAbortListener: () => void = () => undefined;
        const cleanup = () => {
          removeUnavailableListener();
          removeAbortListener();
          context.pendingProductUserInputs.delete(requestId);
        };
        const finish = (
          result: AskUserResult,
          settlement: CanonicalUserInputSettlement,
          emitSettlement = true,
        ) => {
          if (settled) return;
          settled = true;
          askUserMetrics.settle(result.status, Date.now() - requestedAt);
          cleanup();
          context.settledProductUserInputIds.add(requestId);
          if (context.settledProductUserInputIds.size > 128) {
            const oldest = context.settledProductUserInputIds.values().next().value;
            if (oldest !== undefined) context.settledProductUserInputIds.delete(oldest);
          }
          if (emitSettlement) {
            offerRuntimeEvent({
              ...makeEventBase(context),
              type: "user-input.resolved",
              requestId: runtimeRequestId,
              payload: { settlement },
              raw: {
                source: "pi.sdk.event",
                method: "ask_user/settled",
                payload: { requestId, toolCallId: input.toolCallId, status: result.status },
              },
            } satisfies ProviderRuntimeEvent);
          }
          resolve(result);
        };
        const settleStatus = (
          status: Exclude<AskUserResult["status"], "answered">,
          emitSettlement = true,
        ) => finish(terminal(status), { status }, emitSettlement);
        const respond = (response: CanonicalUserInputResponse): boolean => {
          if (settled) return false;
          if (response.status === "cancelled") {
            settleStatus("cancelled");
            return true;
          }
          const result = resolveAskUserResponse({
            request: input.request,
            projection,
            response,
            requestId,
          });
          if (!result || result.status !== "answered") return false;
          finish(result, { status: "answered", answers: response.answers });
          return true;
        };
        context.pendingProductUserInputs.set(requestId, {
          requestId,
          ...(context.lifecycleGeneration === undefined
            ? {}
            : { sessionGeneration: context.lifecycleGeneration }),
          ...(context.activeTurnId === undefined ? {} : { turnId: context.activeTurnId }),
          toolCallId: input.toolCallId,
          resolve: respond,
          settleAborted: (emitSettlement = true) => settleStatus("aborted", emitSettlement),
          settleStale: () => settleStatus("stale"),
        });
        removeUnavailableListener = userInputPresenterRegistry.onUnavailable(() =>
          settleStatus("unavailable"),
        );
        if (!userInputPresenterRegistry.available) {
          userInputPresenterRegistry.handoffUnavailable(() => settleStatus("unavailable"));
        }
        if (input.signal) {
          const abort = () => settleStatus("aborted");
          input.signal.addEventListener("abort", abort, { once: true });
          removeAbortListener = () => input.signal?.removeEventListener("abort", abort);
        }
        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "user-input.requested",
          requestId: runtimeRequestId,
          payload: projection.request,
          raw: {
            source: "pi.sdk.event",
            method: "ask_user/requested",
            payload: {
              requestId,
              toolCallId: input.toolCallId,
              questionCount: projection.request.questions.length,
            },
          },
        } satisfies ProviderRuntimeEvent);
      });
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
      const canonicalRequest = canonicalUserInputRequestFromQuestions([input.question]);

      return new Promise((resolve) => {
        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let abort: () => void = () => undefined;
        let removeUnavailableListener: () => void = () => undefined;

        const cleanup = () => {
          if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
          }
          input.opts?.signal?.removeEventListener("abort", abort);
          removeUnavailableListener();
        };
        const finish = (settlement: CanonicalUserInputSettlement, emitRuntimeEvent = true) => {
          if (settled) return;
          settled = true;
          cleanup();
          context.pendingUserInputs.delete(requestId);
          if (emitRuntimeEvent) {
            offerRuntimeEvent({
              ...makeEventBase(context),
              type: "user-input.resolved",
              requestId: runtimeRequestId,
              payload: { settlement },
              raw: {
                source: "pi.sdk.event",
                method: `${input.method}/settled`,
                payload: { requestId, status: settlement.status },
              },
            } satisfies ProviderRuntimeEvent);
          }
          resolve(
            settlement.status === "answered"
              ? encodeCanonicalUserInputResponse(settlement).answers
              : {},
          );
        };
        abort = () => finish({ status: "aborted" });

        context.pendingUserInputs.set(requestId, {
          ...(context.activeTurnId === undefined ? {} : { turnId: context.activeTurnId }),
          resolve: finish,
          settleAborted: (emitRuntimeEvent = true) =>
            finish({ status: "aborted" }, emitRuntimeEvent),
        });
        if (typeof input.opts?.timeout === "number" && input.opts.timeout > 0) {
          timeoutId = setTimeout(() => finish({ status: "timed_out" }), input.opts.timeout);
        }
        input.opts?.signal?.addEventListener("abort", abort, { once: true });

        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "user-input.requested",
          requestId: runtimeRequestId,
          payload: canonicalRequest,
          raw: {
            source: "pi.sdk.event",
            method: input.method,
            payload: input.rawPayload ?? {
              requestId,
              question: input.question,
            },
          },
        } satisfies ProviderRuntimeEvent);
        removeUnavailableListener = userInputPresenterRegistry.onUnavailable(() =>
          finish({ status: "unavailable" }),
        );
        if (!userInputPresenterRegistry.available) {
          userInputPresenterRegistry.handoffUnavailable(() => finish({ status: "unavailable" }));
        }
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
              payload: {
                message: normalized,
                detail: { type: type ?? "info" },
              },
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
          return {
            success: false,
            error: `Themes are not available for ${displayName}.`,
          };
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
      context.planModeController?.deactivate(turnId);
      context.activeTurnId = undefined;
      context.activeInteractionMode = undefined;
      context.proposedPlanCandidate = undefined;
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
        return yield* new ProviderAdapterSessionNotFoundError({
          provider: provider,
          threadId,
        });
      }
      if (context.stopped) {
        return yield* new ProviderAdapterSessionClosedError({
          provider: provider,
          threadId,
        });
      }
      return context;
    });

    const disposeSessionContext = async (context: PiSessionContext) => {
      try {
        context.planModeController?.deactivate();
        context.activeInteractionMode = undefined;
        context.proposedPlanCandidate = undefined;
        await Effect.runPromise(
          cancelAgentGatewayTurn(context.gatewaySessionLease, context.activeTurnId),
        );
        context.unsubscribe?.();
        context.unsubscribe = undefined;
        for (const pending of Array.from(context.pendingUserInputs.values())) {
          pending.resolve({ status: "stale" });
        }
        context.pendingUserInputs.clear();
        for (const pending of Array.from(context.pendingProductUserInputs.values())) {
          pending.settleStale();
        }
        context.pendingProductUserInputs.clear();
        for (const tracked of context.activeToolItems.values()) {
          tracked.engineWebSurface?.unregister?.();
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
            payload: {
              itemType: "assistant_message",
              status: "inProgress",
              title: "Assistant",
            },
            raw: {
              source: "pi.sdk.event",
              messageType: event.type,
              payload: event,
            },
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
          raw: {
            source: "pi.sdk.event",
            messageType: event.type,
            payload: event,
          },
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
            payload: {
              itemType: "reasoning",
              status: "inProgress",
              title: "Reasoning",
            },
            raw: {
              source: "pi.sdk.event",
              messageType: event.type,
              payload: event,
            },
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
          raw: {
            source: "pi.sdk.event",
            messageType: event.type,
            payload: event,
          },
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
          raw: {
            source: "pi.sdk.event",
            messageType: event.type,
            payload: event,
          },
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
          raw: {
            source: "pi.sdk.event",
            messageType: event.type,
            payload: event,
          },
        } satisfies ProviderRuntimeEvent);
      }
      context.activeAssistantItemId = undefined;
      context.activeReasoningItemId = undefined;
      for (const tracked of context.activeToolItems.values()) {
        tracked.engineWebSurface?.unregister?.();
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
      if (
        provider === "oa" &&
        input.state === "completed" &&
        context.activeInteractionMode === "plan" &&
        context.proposedPlanCandidate
      ) {
        offerRuntimeEvent({
          ...completionBase,
          type: "turn.proposed.completed",
          payload: { planMarkdown: context.proposedPlanCandidate },
          raw: {
            source: "pi.sdk.event",
            messageType: event.type,
            payload: { source: "proposed_plan" },
          },
        } satisfies ProviderRuntimeEvent);
      }
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
              Effect.logWarning("pi.agent_gateway.turn_retirement_failed", {
                turnId,
                cause,
              }),
            ),
          ),
        );
      }
      context.planModeController?.deactivate(turnId);
      context.activeTurnId = undefined;
      context.activeInteractionMode = undefined;
      context.proposedPlanCandidate = undefined;
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
        raw: {
          source: "pi.sdk.event",
          messageType: event.type,
          payload: event,
        },
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
        raw: {
          source: "pi.sdk.event",
          messageType: event.type,
          payload: event,
        },
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
      const event: PiPromptSettlementEvent = {
        type: "prompt_handled",
        outcome,
      };
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
            raw: {
              source: "pi.sdk.event",
              messageType: event.type,
              payload: event,
            },
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
          const isBundledProductAsk =
            event.toolName === ASK_USER_TOOL_NAME &&
            reconcileAskUserTool(context)?.available === true;
          const tracked: PiTrackedToolCall = {
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: event.args,
            itemId,
            itemType: toolItemType(event.toolName),
            ...(isBundledProductAsk ? { canonicalUserInputLifecycle: "candidate" as const } : {}),
          };
          context.activeToolItems.set(event.toolCallId, tracked);
          const title = toolTitle(event.toolName, event.args);
          recordItem(context, {
            type: "tool_call",
            status: "started",
            toolName: event.toolName,
            args: event.args,
          });
          if (!isBundledProductAsk) {
            offerRuntimeEvent({
              ...makeEventBase(context),
              itemId,
              providerRefs: {
                providerItemId: ProviderItemId.makeUnsafe(event.toolCallId),
              },
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
              raw: {
                source: "pi.sdk.event",
                messageType: event.type,
                payload: event,
              },
            } satisfies ProviderRuntimeEvent);
          }
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
          const typedSurface = extractTypedEngineWebSurface(event.toolName, event.partialResult);
          if (typedSurface) {
            tracked.engineWebSurface = {
              ...tracked.engineWebSurface,
              surfaceId: typedSurface.surfaceId,
              status: typedSurface.status,
            };
          }
          const engineSurfaceId = typedSurface?.surfaceId ?? tracked.engineWebSurface?.surfaceId;
          const surfaceUrl = tracked.engineWebSurface?.url;
          const engineSurfacePending =
            surfaceUrl !== undefined || tracked.engineWebSurface?.status === "pending";
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
          if (tracked.canonicalUserInputLifecycle !== undefined) return;
          offerRuntimeEvent({
            ...makeEventBase(context),
            itemId: tracked.itemId,
            providerRefs: {
              providerItemId: ProviderItemId.makeUnsafe(event.toolCallId),
            },
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
                ...(engineSurfaceId && engineSurfacePending
                  ? {
                      engineWebSurfaceStatus: "waiting-for-user",
                      engineWebSurfaceId: engineSurfaceId,
                    }
                  : {}),
              }),
            },
            raw: {
              source: "pi.sdk.event",
              messageType: event.type,
              payload: safeEvent,
            },
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
          const barrierDetails = toolRecord(toolRecord(event.result)?.details)?.barrier;
          if (toolRecord(barrierDetails)?.status === "blocked") {
            askUserMetrics.increment("barrier_sibling_blocked");
          }
          context.activeToolItems.delete(event.toolCallId);
          tracked.engineWebSurface?.unregister?.();
          const detail = piToolTimelineDetail(safeResult);
          recordItem(context, {
            type: "tool_call",
            status: event.isError ? "failed" : "completed",
            toolName: event.toolName,
            output: detail,
            result: safeResult,
          });
          if (tracked.canonicalUserInputLifecycle === "projected") return;
          offerRuntimeEvent({
            ...makeEventBase(context),
            itemId: tracked.itemId,
            providerRefs: {
              providerItemId: ProviderItemId.makeUnsafe(event.toolCallId),
            },
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
                ...(tracked.engineWebSurface?.surfaceId &&
                tracked.engineWebSurface.status === "pending"
                  ? {
                      engineWebSurfaceStatus: "completed",
                      engineWebSurfaceId: tracked.engineWebSurface.surfaceId,
                    }
                  : {}),
              }),
            },
            raw: {
              source: "pi.sdk.event",
              messageType: event.type,
              payload: safeEvent,
            },
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
            raw: {
              source: "pi.sdk.event",
              messageType: event.type,
              payload: event,
            },
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
            raw: {
              source: "pi.sdk.event",
              messageType: event.type,
              payload: event,
            },
          } satisfies ProviderRuntimeEvent);
          return;
        }
        case "auto_retry_start": {
          if (!context.activeTurnId) return;
          context.proposedPlanCandidate = undefined;
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
            raw: {
              source: "pi.sdk.event",
              messageType: event.type,
              payload: event,
            },
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
          const usage = normalizePiTokenUsage(
            stats,
            context.runtime.session.model?.contextWindow,
            context.lastKnownTokenUsage,
            true,
          );
          context.lastKnownTokenUsage = usage;
          const turnId = context.activeTurnId;
          const errorMessage = context.runtime.session.agent.state.errorMessage;
          const leafId = context.runtime.session.sessionManager.getLeafId();
          const turn = turnId
            ? context.turns.find((candidate) => candidate.id === turnId)
            : undefined;
          if (turn) turn.leafId = leafId;
          if (provider === "oa" && context.activeInteractionMode === "plan") {
            context.proposedPlanCandidate = extractProposedPlanMarkdown(
              latestAssistantText(event.messages),
            );
          } else {
            context.proposedPlanCandidate = undefined;
          }
          completePiAttemptItems(context, event, errorMessage ? "failed" : "completed");
          if (usage) {
            offerRuntimeEvent({
              ...makeEventBase(context),
              type: "thread.token-usage.updated",
              payload: { usage },
              raw: {
                source: "pi.sdk.event",
                messageType: event.type,
                payload: event,
              },
            } satisfies ProviderRuntimeEvent);
          }
          context.session = makeSessionSnapshot(context, provider);
          return;
        }
        case "agent_settled": {
          if (!context.activeTurnId) return;
          const stats = context.runtime.session.getSessionStats();
          const usage = normalizePiTokenUsage(
            stats,
            context.runtime.session.model?.contextWindow,
            context.lastKnownTokenUsage,
            true,
          );
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

    const warnIfTaskListExtensionUnavailable = (context: PiSessionContext) => {
      if (provider !== "oa" || context.workSurface === undefined) return;
      const inspection = inspectOmniMindTaskListExtensionRegistration({
        extensions: context.runtime.session.resourceLoader.getExtensions(),
        tools: context.runtime.session.getAllTools(),
        activeToolNames: context.runtime.session.getActiveToolNames(),
      });
      if (inspection.available) return;
      offerRuntimeEvent({
        ...makeEventBase(context, { includeTurnId: false }),
        type: "runtime.warning",
        payload: {
          message:
            "Task progress is unavailable for this OmniMind session. Other capabilities remain available.",
          detail: {
            source: "pi-resource-loader",
            capability: "turn-task-projection",
            availability: "unavailable",
            diagnostics: inspection.diagnostics,
          },
        },
        raw: {
          source: "pi.sdk.event",
          method: "extension/resource-diagnostic",
          payload: {
            capability: "turn-task-projection",
            diagnosticCount: inspection.diagnostics.length,
          },
        },
      } satisfies ProviderRuntimeEvent);
    };

    const reconcileAskUserTool = (context: PiSessionContext) => {
      if (provider !== "oa") return undefined;
      const inspection = inspectOmniMindAskUserRegistration({
        extensions: context.runtime.session.resourceLoader.getExtensions(),
        tools: context.runtime.session.getAllTools(),
        activeToolNames: context.runtime.session.getActiveToolNames(),
      });
      const shouldBeActive = userInputPresenterRegistry.available && inspection.registered;
      if (inspection.collision && !context.askUserProvenanceCollisionRecorded) {
        context.askUserProvenanceCollisionRecorded = true;
        askUserMetrics.increment("provenance_collision");
      }
      const active = context.runtime.session.getActiveToolNames();
      const isActive = active.includes(ASK_USER_TOOL_NAME);
      if (shouldBeActive !== isActive) {
        context.runtime.session.setActiveToolsByName(
          shouldBeActive
            ? [...active.filter((name) => name !== ASK_USER_TOOL_NAME), ASK_USER_TOOL_NAME]
            : active.filter((name) => name !== ASK_USER_TOOL_NAME),
        );
      }
      return { ...inspection, available: shouldBeActive };
    };

    const warnIfAskUserUnavailable = (context: PiSessionContext) => {
      if (provider !== "oa" || !userInputPresenterRegistry.available) return;
      const inspection = reconcileAskUserTool(context);
      if (inspection?.available) return;
      offerRuntimeEvent({
        ...makeEventBase(context, { includeTurnId: false }),
        type: "runtime.warning",
        payload: {
          message: "ask_user_provenance_unavailable",
          detail: {
            source: "pi-resource-loader",
            capability: "ask-user",
            availability: "unavailable",
            diagnostics: inspection?.diagnostics ?? [],
          },
        },
        raw: {
          source: "pi.sdk.event",
          method: "extension/resource-diagnostic",
          payload: {
            capability: "ask-user",
            diagnosticCount: inspection?.diagnostics.length ?? 0,
          },
        },
      } satisfies ProviderRuntimeEvent);
    };

    const createSdkRuntime = async (input: {
      threadId: ThreadId;
      sdk: PiCodingAgentModule;
      cwd: string;
      agentDir: string;
      sessionManager: SessionManager;
      modelId?: string;
      thinkingLevel?: ThinkingLevel;
      processSupervisor: PiBashProcessSupervisor;
      gatewayTools?: ReadonlyArray<ToolDefinition>;
      gatewayConnection?: AgentGatewayMcpConnection;
      agentGatewayFetch?: AgentGatewayMcpFetch;
      onTaskListUpdate?: (input: {
        readonly toolCallId: string;
        readonly payload: TurnTasksUpdatedPayload;
      }) => void;
      askUserInteraction?: AskUserProductInteractionPort;
      hostSystemPrompt: (gatewayControlAvailable: boolean) => string;
      defaultPrompt?: string;
      immutableSystemPrompt?: string;
      workSurface?: ProviderWorkSurface;
      productSurface?: ProductSurface;
      projectContextRoot?: string;
    }) => {
      const modelRuntime = await family.createModelRuntime(input.agentDir);
      const curatorPresenter: CuratorPresenter | undefined =
        provider === "oa" &&
        browserAutomationHost?.available &&
        browserAutomationHost.getEngineWebSurfaceContext &&
        browserAutomationHost.presentEngineWebSurface &&
        browserAutomationHost.settleEngineWebSurface
          ? {
              snapshot: async () =>
                requireReadyEngineWebSurfaceContext(
                  await Effect.runPromise(
                    browserAutomationHost.getEngineWebSurfaceContext!(
                      `engine-web-surface:${provider}:${input.threadId}`,
                    ),
                  ),
                ),
              present: async (request) => {
                try {
                  const result = await Effect.runPromise(
                    browserAutomationHost.presentEngineWebSurface!({
                      sessionKey: `engine-web-surface:${provider}:${input.threadId}`,
                      threadId: input.threadId,
                      surfaceId: request.surfaceId,
                      url: request.url,
                      title: request.title,
                      expiresAt: request.expiresAt,
                    }),
                  );
                  return { kind: "presented", tabId: result.tabId };
                } catch (error) {
                  const recoverable =
                    error instanceof BrowserHostRpcError &&
                    ["unavailable", "timeout", "transport"].includes(error.kind);
                  return {
                    kind: recoverable ? "recoverable-error" : "fatal-error",
                    message: error instanceof Error ? error.message : String(error),
                  };
                }
              },
              settle: async ({ surfaceId, preserveTab }) => {
                await Effect.runPromise(
                  browserAutomationHost.settleEngineWebSurface!({
                    sessionKey: `engine-web-surface:${provider}:${input.threadId}`,
                    threadId: input.threadId,
                    surfaceId,
                    ...(preserveTab === undefined ? {} : { preserveTab }),
                  }).pipe(Effect.ignore),
                );
              },
            }
          : undefined;
      let resolvedGatewayControlAvailable =
        provider !== "oa" && (input.gatewayTools?.length ?? 0) > 0;
      let resolvedHostProjection: AgentGatewayHostExtensionHandle | undefined;
      let resolvedPlanModeController: OmniMindPlanModeController | undefined;
      const hostProjectionDiagnostics: string[] = [];
      const webAccessDiagnostics: string[] = [];
      const createRuntime: CreateAgentSessionRuntimeFactory = async ({
        cwd,
        agentDir,
        sessionManager,
        sessionStartEvent,
      }) => {
        const composition: Pick<OmniMindSessionExtensionComposition, "extensions"> &
          Partial<Pick<OmniMindSessionExtensionComposition, "host" | "planModeController">> =
          provider === "oa"
            ? buildOmniMindSessionExtensions({
                agentDir,
                defineTool: (tool) => input.sdk.defineTool(tool),
                ...(curatorPresenter === undefined ? {} : { curatorPresenter }),
                ...(input.workSurface === undefined ? {} : { workSurface: input.workSurface }),
                ...(input.gatewayConnection === undefined
                  ? {}
                  : { gatewayConnection: input.gatewayConnection }),
                ...(input.agentGatewayFetch === undefined
                  ? {}
                  : { gatewayFetch: input.agentGatewayFetch }),
                ...(input.onTaskListUpdate === undefined
                  ? {}
                  : { onTasksUpdated: input.onTaskListUpdate }),
                ...(input.askUserInteraction === undefined
                  ? {}
                  : { askUserInteraction: input.askUserInteraction }),
              })
            : { extensions: [] };
        const inlineExtensions = composition.extensions;
        resolvedHostProjection = composition.host;
        resolvedPlanModeController = composition.planModeController;
        const resourceLoaderOptions = {
          appendSystemPromptOverride: (base: string[]) => [
            ...base,
            ...(provider === "oa" ? [] : [input.hostSystemPrompt(resolvedGatewayControlAvailable)]),
          ],
          ...(inlineExtensions.length === 0 ? {} : { extensionFactories: inlineExtensions }),
          ...(input.workSurface !== undefined
            ? {
                projectContextRoot:
                  input.workSurface === "agent" ? input.projectContextRoot : false,
              }
            : {}),
        };
        const settingsManager =
          input.workSurface !== undefined
            ? input.sdk.SettingsManager.create(cwd, agentDir, {
                projectTrusted: input.workSurface === "agent",
              })
            : undefined;
        const services = await input.sdk.createAgentSessionServices({
          cwd,
          agentDir,
          modelRuntime,
          ...(settingsManager === undefined ? {} : { settingsManager }),
          resourceLoaderOptions,
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
        const agentSessionOptions = {
          services,
          sessionManager,
          ...(sessionStartEvent ? { sessionStartEvent } : {}),
          ...(model ? { model } : {}),
          thinkingLevel: input.thinkingLevel ?? DEFAULT_PI_THINKING_LEVEL,
          ...(input.immutableSystemPrompt === undefined
            ? {}
            : { immutableSystemPrompt: input.immutableSystemPrompt }),
          ...(input.defaultPrompt === undefined ? {} : { defaultPrompt: input.defaultPrompt }),
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
        };
        const createdSession = await input.sdk.createAgentSessionFromServices(agentSessionOptions);
        if (composition.host !== undefined) {
          const inspection = composition.host.inspectRegistration({
            extensions: services.resourceLoader.getExtensions(),
            tools: createdSession.session.getAllTools(),
          });
          resolvedGatewayControlAvailable = inspection.available;
          hostProjectionDiagnostics.push(...inspection.diagnostics);
        }
        if (provider === "oa") {
          const inspection = inspectOmniMindWebAccessRegistration(
            createdSession.session.getAllTools(),
          );
          webAccessDiagnostics.push(...inspection.diagnostics);
        }
        return {
          ...createdSession,
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
        gatewayControlAvailable: resolvedGatewayControlAvailable,
        hostProjectionDiagnostics,
        webAccessDiagnostics,
        ...(resolvedHostProjection === undefined ? {} : { hostProjection: resolvedHostProjection }),
        ...(resolvedPlanModeController === undefined
          ? {}
          : { planModeController: resolvedPlanModeController }),
      };
    };

    const startSession: PiAdapterShape["startSession"] = (input) =>
      Effect.gen(function* () {
        const cwd = trimToUndefined(input.cwd) ?? serverConfig.cwd;
        const workSurface = input.workSurface;
        const productSurface = input.productSurface ?? (workSurface === "agent" ? "agent" : "chat");
        const projectContextRoot = trimToUndefined(input.projectContextRoot);
        if (provider === "oa" && workSurface === undefined) {
          return yield* new ProviderAdapterValidationError({
            provider,
            operation: "session/start",
            issue: "OmniMind work surface is missing from Product session admission.",
          });
        }
        if (workSurface === "agent" && !projectContextRoot) {
          return yield* new ProviderAdapterValidationError({
            provider,
            operation: "session/start",
            issue: `${displayName} Agent requires a canonical Project context root.`,
          });
        }
        if (workSurface === "chat" && projectContextRoot) {
          return yield* new ProviderAdapterValidationError({
            provider,
            operation: "session/start",
            issue: `${displayName} Chat cannot receive a Project context root.`,
          });
        }
        if (workSurface === "agent" && projectContextRoot) {
          const containedCwd = yield* Effect.tryPromise({
            try: () => resolveRealPathWithinRoot(projectContextRoot, cwd),
            catch: (cause) =>
              new ProviderAdapterValidationError({
                provider,
                operation: "session/start",
                issue: `${displayName} Agent Project context containment could not be verified.`,
                cause,
              }),
          });
          if (containedCwd === null) {
            return yield* new ProviderAdapterValidationError({
              provider,
              operation: "session/start",
              issue: `${displayName} Agent working directory is outside its canonical Project context root.`,
            });
          }
        }
        const piSdk = yield* loadPiSdk("session/start");
        const currentServerSettings =
          provider === "oa" && serverSettings
            ? yield* serverSettings.getSettings.pipe(
                Effect.mapError(
                  (cause) =>
                    new ProviderAdapterRequestError({
                      provider,
                      method: "session/start",
                      detail: "Failed to load OmniMind settings.",
                      cause,
                    }),
                ),
              )
            : undefined;
        const configuredDefaultPrompt =
          provider === "oa" ? currentServerSettings?.providers.oa.defaultPrompt : null;
        const defaultPrompt =
          provider === "oa"
            ? (configuredDefaultPrompt ?? piSdk.DEFAULT_BASE_INSTRUCTIONS)
            : undefined;
        if (provider === "oa" && defaultPrompt === undefined) {
          return yield* new ProviderAdapterValidationError({
            provider,
            operation: "session/start",
            issue: "OmniMind default instructions are unavailable.",
          });
        }
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
        let enabledBuiltInGroups: ReadonlyArray<BuiltInToolGroupId> = [];
        const gatewayDescriptors =
          agentGatewayConnection && provider !== "oa"
            ? yield* releaseAgentGatewaySessionLeaseOnInterrupt(
                agentGatewaySessionLease,
                Effect.tryPromise({
                  try: () =>
                    listAgentGatewayMcpTools({
                      connection: agentGatewayConnection,
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
                      Effect.logWarning(
                        "Pi could not install thread-scoped OmniMind gateway tools",
                        {
                          provider,
                          reason: "gateway-discovery-failed",
                        },
                      ),
                    ),
                    Effect.as([] as ReadonlyArray<AgentGatewayMcpToolDescriptor>),
                  ),
                ),
              )
            : [];
        enabledBuiltInGroups = agentGatewayGroupsFromToolDescriptors(gatewayDescriptors);
        const gatewayTools =
          provider === "oa" || !agentGatewayConnection
            ? []
            : buildPiAgentGatewayCustomToolsFromDescriptors({
                connection: agentGatewayConnection,
                defineTool: (tool) => piSdk.defineTool(tool),
                tools: gatewayDescriptors,
                ...(options?.agentGatewayFetch === undefined
                  ? {}
                  : { fetch: options.agentGatewayFetch }),
              });
        if (provider !== "oa" && gatewayDescriptors.length === 0) {
          agentGatewaySessionLease?.release();
        }
        let taskProjectionContext: PiSessionContext | undefined;
        let askProjectionContext: PiSessionContext | undefined;
        const askUserInteraction: AskUserProductInteractionPort | undefined =
          provider === "oa"
            ? {
                present: ({ toolCallId, request, signal }) => {
                  const current = askProjectionContext;
                  if (!current || current.stopped || sessions.get(input.threadId) !== current) {
                    return Promise.resolve({
                      version: 1,
                      requestId: crypto.randomUUID(),
                      status: "stale",
                    });
                  }
                  return requestProductAskUser(current, {
                    toolCallId,
                    request,
                    ...(signal === undefined ? {} : { signal }),
                  });
                },
              }
            : undefined;
        const {
          runtime,
          modelRegistry,
          gatewayControlAvailable,
          hostProjectionDiagnostics,
          webAccessDiagnostics,
          hostProjection,
          planModeController,
        } = yield* releaseAgentGatewaySessionLeaseOnInterrupt(
          agentGatewaySessionLease,
          Effect.tryPromise({
            try: () =>
              createSdkRuntime({
                threadId: input.threadId,
                sdk: piSdk,
                cwd,
                agentDir,
                sessionManager,
                ...(modelId ? { modelId } : {}),
                ...(thinkingLevel ? { thinkingLevel } : {}),
                processSupervisor,
                ...(gatewayTools.length > 0 ? { gatewayTools } : {}),
                ...(provider === "oa" && agentGatewayConnection !== undefined
                  ? {
                      gatewayConnection: agentGatewayConnection!,
                      ...(options?.agentGatewayFetch === undefined
                        ? {}
                        : { agentGatewayFetch: options.agentGatewayFetch }),
                    }
                  : {}),
                ...(workSurface === undefined ? {} : { workSurface }),
                ...(provider === "oa" ? { productSurface } : {}),
                ...(projectContextRoot === undefined ? {} : { projectContextRoot }),
                ...(provider === "oa" && workSurface !== undefined
                  ? {
                      onTaskListUpdate: ({ toolCallId, payload }) => {
                        const current = taskProjectionContext;
                        if (
                          !current ||
                          current.stopped ||
                          !current.activeTurnId ||
                          sessions.get(input.threadId) !== current
                        ) {
                          return;
                        }
                        offerRuntimeEvent({
                          ...makeEventBase(current),
                          type: "turn.tasks.updated",
                          payload,
                          raw: {
                            source: "pi.sdk.event",
                            messageType: HARNESSOS_TASK_LIST_TOOL_NAME,
                            payload: { toolCallId },
                          },
                        } satisfies ProviderRuntimeEvent);
                      },
                    }
                  : {}),
                ...(askUserInteraction === undefined ? {} : { askUserInteraction }),
                hostSystemPrompt: (available) =>
                  makePiHostSystemPrompt({
                    gatewayControlAvailable:
                      provider === "oa" ? agentGatewayConnection !== undefined : available,
                    enabledBuiltInGroups,
                  }),
                ...(defaultPrompt === undefined ? {} : { defaultPrompt }),
                ...(provider === "oa" && workSurface !== undefined
                  ? {
                      immutableSystemPrompt: makeOmniMindEngineSystemPrompt({
                        productSurface,
                      }),
                    }
                  : {}),
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
            provider === "oa" ? getOmniMindModelRuntimeMutationRevision(agentDir) : 0,
          ...(workSurface === undefined ? {} : { workSurface }),
          ...(provider === "oa" ? { productSurface } : {}),
          resourceScopeIdentity: resourceScopeIdentity(
            workSurface === "chat"
              ? { kind: "global-only" }
              : workSurface === "agent"
                ? { kind: "project", authoritativeRoot: projectContextRoot ?? cwd }
                : { kind: "project", authoritativeRoot: cwd },
          ),
          ...(hostProjection === undefined ? {} : { hostProjection }),
          ...(planModeController === undefined ? {} : { planModeController }),
          ...(agentGatewaySessionLease
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
          activeInteractionMode: undefined,
          proposedPlanCandidate: undefined,
          startedTurnId: undefined,
          activeAssistantItemId: undefined,
          activeReasoningItemId: undefined,
          activeToolItems: new Map(),
          pendingPromptSubmission: undefined,
          pendingUserInputs: new Map(),
          pendingProductUserInputs: new Map(),
          settledProductUserInputIds: new Set(),
          askUserProvenanceCollisionRecorded: false,
          stopped: false,
          lastKnownTokenUsage: undefined,
          unsubscribe: undefined,
        };
        taskProjectionContext = context;
        askProjectionContext = context;
        reconcileAskUserTool(context);
        context.unsubscribe = runtime.session.subscribe((event) =>
          handleSessionEvent(context, event),
        );
        sessions.set(input.threadId, context);
        yield* Effect.tryPromise({
          try: () =>
            runtime.session.bindExtensions({
              uiContext: makePiExtensionUIContext(context),
            }),
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
        if (hostProjectionDiagnostics.length > 0) {
          const diagnostics = [...new Set(hostProjectionDiagnostics)];
          offerRuntimeEvent({
            ...makeEventBase(context, { includeTurnId: false }),
            type: "runtime.warning",
            payload: {
              message:
                "Some OmniMind Host capabilities could not be projected into this Agent session. Other Agent capabilities remain available.",
              detail: {
                source: "pi-resource-loader",
                capability: "agent-gateway-host-projection",
                availability: gatewayControlAvailable ? "degraded" : "unavailable",
                diagnostics,
              },
            },
            raw: {
              source: "pi.sdk.event",
              method: "extension/resource-diagnostic",
              payload: {
                capability: "agent-gateway-host-projection",
                diagnosticCount: diagnostics.length,
              },
            },
          } satisfies ProviderRuntimeEvent);
        }
        if (webAccessDiagnostics.length > 0) {
          const diagnostics = [...new Set(webAccessDiagnostics)];
          offerRuntimeEvent({
            ...makeEventBase(context, { includeTurnId: false }),
            type: "runtime.warning",
            payload: {
              message:
                "OmniMind Web Access could not register every canonical tool in this Agent session. The winning foreign tools remain untouched.",
              detail: {
                source: "pi-resource-loader",
                capability: "omnimind-web-access",
                availability: "degraded",
                diagnostics,
              },
            },
            raw: {
              source: "pi.sdk.event",
              method: "extension/resource-diagnostic",
              payload: {
                capability: "omnimind-web-access",
                diagnosticCount: diagnostics.length,
              },
            },
          } satisfies ProviderRuntimeEvent);
        }
        warnIfTaskListExtensionUnavailable(context);
        warnIfAskUserUnavailable(context);
        const loadedExtensions = runtime.session.resourceLoader
          .getExtensions()
          .extensions.filter((extension) => extension.hidden !== true);
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
              payload: {
                extensionCount: loadedExtensions.length,
                extensions: extensionNames,
              },
            },
          } satisfies ProviderRuntimeEvent);
        }
        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "session.started",
          payload: {
            message: `${displayName} session started`,
            resume: session.resumeCursor,
          },
        } satisfies ProviderRuntimeEvent);
        offerRuntimeEvent({
          ...makeEventBase(context),
          type: "thread.started",
          payload: { providerThreadId: runtime.session.sessionId },
        } satisfies ProviderRuntimeEvent);
        const initialUsage = normalizePiTokenUsage(
          runtime.session.getSessionStats(),
          runtime.session.model?.contextWindow,
          undefined,
          true,
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

    const sendTurn: PiAdapterShape["sendTurn"] = (input, dispatchContext) =>
      sessionResourceAdmission.withLock(
        input.threadId,
        Effect.gen(function* () {
          const context = yield* requireSession(input.threadId);
          let currentHostDescriptors: ReadonlyArray<AgentGatewayMcpToolDescriptor> | undefined;
          if (context.activeTurnId) {
            return yield* new ProviderAdapterValidationError({
              provider: provider,
              operation: "sendTurn",
              issue: `A ${displayName} turn is already active for this thread.`,
            });
          }
          if (provider === "oa") {
            const currentRevision = getOmniMindModelRuntimeMutationRevision(context.agentDir);
            if (currentRevision > context.appliedModelRuntimeMutationRevision) {
              yield* Effect.tryPromise({
                try: async () => {
                  await context.runtime.services.modelRuntime.refresh({
                    allowNetwork: false,
                  });
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
            if (context.hostProjection !== undefined) {
              yield* Effect.tryPromise({
                try: async () => {
                  const descriptors = await context.hostProjection!.refreshCurrentDescriptors();
                  currentHostDescriptors = descriptors;
                  if (!context.hostProjection!.requiresReload(descriptors)) {
                    return;
                  }
                  // Pi owns the active tool registry. Re-run its native
                  // ResourceLoader before this turn when the authoritative Host
                  // catalog changed, so newly enabled tools are registered and
                  // disabled tools disappear rather than merely failing at call.
                  await context.runtime.session.reload();
                },
                catch: (cause) =>
                  new ProviderAdapterRequestError({
                    provider,
                    method: "host-catalog/reconcile",
                    detail: "OmniMind Host tool changes could not be applied to this session.",
                    cause,
                  }),
              });
              warnIfTaskListExtensionUnavailable(context);
            }
            reconcileAskUserTool(context);
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
          const promptRequiredNames = promptRequiredAgentGatewayToolNames(dispatchContext);
          if (provider === "oa" && promptRequiredNames.length > 0) {
            if (context.gatewayConnection === undefined || context.hostProjection === undefined) {
              return yield* new ProviderAdapterValidationError({
                provider,
                operation: "sendTurn",
                issue:
                  "This synthetic OmniMind turn requires Host capabilities that are unavailable in the current Agent session.",
              });
            }
            yield* Effect.tryPromise({
              try: async () => {
                const currentlyExposed =
                  currentHostDescriptors ??
                  (await context.hostProjection!.refreshCurrentDescriptors());
                context.hostProjection!.assertDelivered({
                  tools: context.runtime.session.getAllTools(),
                  requiredNames: promptRequiredNames,
                  currentlyExposedNames: new Set(
                    currentlyExposed
                      .filter((tool) => tool.provenance === "agent-gateway")
                      .map(({ name }) => name),
                  ),
                });
              },
              catch: (cause) =>
                new ProviderAdapterValidationError({
                  provider,
                  operation: "sendTurn",
                  issue:
                    "This synthetic OmniMind turn requires Host capabilities that are disabled, unavailable, or collided in the current Agent session.",
                  cause,
                }),
            });
          }
          const payload = yield* buildPromptPayload(input);
          const turnId = TurnId.makeUnsafe(crypto.randomUUID());
          const interactionMode = input.interactionMode ?? "default";
          const promptText =
            provider === "oa"
              ? withProviderPlanModePrompt({ text: payload.text, interactionMode })
              : payload.text;
          context.activeTurnId = turnId;
          context.activeInteractionMode = interactionMode;
          context.proposedPlanCandidate = undefined;
          if (provider === "oa" && interactionMode === "plan") {
            context.planModeController?.activate(turnId);
          } else {
            context.planModeController?.deactivate();
          }
          context.startedTurnId = undefined;
          context.turns.push({ id: turnId, items: [] });
          context.session = makeSessionSnapshot(context, provider);
          if (payload.images.length === 0 && isPiReloadCommand(promptText)) {
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
              raw: {
                source: "pi.sdk.event",
                method: "reload",
                payload: { command: payload.text },
              },
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
                    payload: {
                      state: "failed",
                      stopReason: "error",
                      errorMessage: message,
                    },
                    raw: {
                      source: "pi.sdk.event",
                      method: "reload",
                      payload: error,
                    },
                  } satisfies ProviderRuntimeEvent);
                  offerRuntimeError(context, {
                    message,
                    method: "session/reload",
                    cause: error,
                  });
                  yield* cancelAgentGatewayTurn(context.gatewaySessionLease, context.activeTurnId);
                  context.planModeController?.deactivate(turnId);
                  context.activeTurnId = undefined;
                  context.activeInteractionMode = undefined;
                  context.proposedPlanCandidate = undefined;
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
              raw: {
                source: "pi.sdk.event",
                method: "reload",
                payload: { command: payload.text },
              },
            } satisfies ProviderRuntimeEvent);
            yield* cancelAgentGatewayTurn(context.gatewaySessionLease, context.activeTurnId);
            context.planModeController?.deactivate(turnId);
            context.activeTurnId = undefined;
            context.activeInteractionMode = undefined;
            context.proposedPlanCandidate = undefined;
            context.startedTurnId = undefined;
            context.session = makeSessionSnapshot(context, provider);
            return {
              threadId: input.threadId,
              turnId,
              resumeCursor: getSessionFile(context.runtime.session),
            };
          }
          void submitPiPrompt(context, turnId, promptText, payload.images)
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
          const interactionMode = context.activeTurnId
            ? (context.activeInteractionMode ?? "default")
            : (input.interactionMode ?? "default");
          const promptText =
            provider === "oa"
              ? withProviderPlanModePrompt({ text: payload.text, interactionMode })
              : payload.text;
          const turnId = context.activeTurnId ?? TurnId.makeUnsafe(crypto.randomUUID());
          if (!context.activeTurnId) {
            context.activeTurnId = turnId;
            context.activeInteractionMode = interactionMode;
            context.proposedPlanCandidate = undefined;
            if (provider === "oa" && interactionMode === "plan") {
              context.planModeController?.activate(turnId);
            } else {
              context.planModeController?.deactivate();
            }
            context.startedTurnId = undefined;
            context.turns.push({ id: turnId, items: [] });
          }
          if (context.runtime.session.isStreaming) {
            yield* Effect.tryPromise({
              try: () => context.runtime.session.steer(promptText, payload.images),
              catch: (cause) =>
                new ProviderAdapterRequestError({
                  provider: provider,
                  method: "turn/steer",
                  detail: toMessage(cause, `Failed to steer ${displayName} turn.`),
                  cause,
                }),
            });
          } else {
            void submitPiPrompt(context, turnId, promptText, payload.images)
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
              // Pi may mark an executing Tool call cancelled without forwarding
              // the turn AbortSignal into the Tool's pending Promise. Settle the
              // Product Ask explicitly before aborting the agent so the durable
              // user-input projection cannot remain actionable after Stop Turn.
              for (const pending of context.pendingProductUserInputs.values()) {
                if (pending.turnId === activeTurnId) pending.settleAborted(false);
              }
              for (const pending of context.pendingUserInputs.values()) {
                if (pending.turnId === activeTurnId) pending.settleAborted(false);
              }
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
      response,
    ) =>
      Effect.gen(function* () {
        const context = yield* requireSession(threadId);
        const canonicalResponse = response;
        const productPending = context.pendingProductUserInputs.get(requestId);
        if (productPending) {
          if (
            productPending.requestId !== requestId ||
            productPending.sessionGeneration !== context.lifecycleGeneration ||
            productPending.turnId !== context.activeTurnId
          ) {
            productPending.settleStale();
            askUserMetrics.increment("late_response_rejected");
            return yield* new ProviderAdapterRequestError({
              provider: provider,
              method: "user-input/respond",
              detail: `Stale ${displayName} ask_user correlation: ${requestId}`,
            });
          }
          if (!productPending.resolve(canonicalResponse)) {
            return yield* new ProviderAdapterRequestError({
              provider: provider,
              method: "user-input/respond",
              detail: `Invalid or stale ${displayName} ask_user response: ${requestId}`,
            });
          }
          return;
        }
        if (context.settledProductUserInputIds.has(requestId)) {
          askUserMetrics.increment("late_response_rejected");
          return yield* new ProviderAdapterRequestError({
            provider: provider,
            method: "user-input/respond",
            detail: `Stale ${displayName} ask_user response: ${requestId}`,
          });
        }
        if (!resolvePiExtensionUserInput(context, requestId, canonicalResponse)) {
          return yield* new ProviderAdapterRequestError({
            provider: provider,
            method: "user-input/respond",
            detail: `Unknown pending ${displayName} user-input request: ${requestId}`,
          });
        }
        if (canonicalResponse.status === "cancelled") {
          context.runtime.session.agent.abort();
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
            context.pendingUserInputs.size > 0 ||
            context.pendingProductUserInputs.size > 0
          ) {
            return "busy" as const;
          }
          context.planModeController?.deactivate();
          context.activeInteractionMode = undefined;
          context.proposedPlanCandidate = undefined;
          const currentServerSettings =
            provider === "oa" && serverSettings
              ? yield* serverSettings.getSettings.pipe(
                  Effect.mapError(
                    (cause) =>
                      new ProviderAdapterRequestError({
                        provider,
                        method: "session/reload",
                        detail: "Failed to load OmniMind settings.",
                        cause,
                      }),
                  ),
                )
              : undefined;
          const reloadSdk = provider === "oa" ? yield* loadPiSdk("session/reload") : null;
          const configuredDefaultPrompt =
            provider === "oa" ? currentServerSettings?.providers.oa.defaultPrompt : null;
          const defaultPrompt =
            provider === "oa"
              ? (configuredDefaultPrompt ?? reloadSdk?.DEFAULT_BASE_INSTRUCTIONS)
              : undefined;
          if (provider === "oa" && defaultPrompt === undefined) {
            return yield* new ProviderAdapterValidationError({
              provider,
              operation: "session/reload",
              issue: "OmniMind default instructions are unavailable.",
            });
          }
          yield* Effect.tryPromise({
            try: () =>
              (
                context.runtime.session.reload as (options?: {
                  beforeSessionStart?: () => void | Promise<void>;
                  defaultPrompt?: string;
                }) => Promise<void>
              )(defaultPrompt === undefined ? undefined : { defaultPrompt }),
            catch: (cause) =>
              new ProviderAdapterRequestError({
                provider,
                method: "session/reload",
                detail: toMessage(cause, `Failed to reload ${displayName} resources.`),
                cause,
              }),
          });
          warnIfTaskListExtensionUnavailable(context);
          warnIfAskUserUnavailable(context);
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
            : context.turns.map((turn) => ({
                id: turn.id,
                items: [...turn.items],
              })),
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
            ...productDiscoveryOptions(piSdk, cwd, agentDir),
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
                    : family.provider === "oa" && services.modelRuntime.getProvider(providerId)
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
          const requestedScope = input.resourceScope ?? {
            kind: "global-only" as const,
          };
          const reusableActive =
            active?.resourceScopeIdentity === resourceScopeIdentity(requestedScope)
              ? active
              : undefined;
          const loader = reusableActive?.runtime.session.resourceLoader;
          if (reusableActive && input.forceReload) {
            await reusableActive.runtime.session.reload();
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
              ...productDiscoveryOptions(piSdk, input.cwd, agentDir, requestedScope.kind),
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
          const requestedScope = input.resourceScope ?? {
            kind: "global-only" as const,
          };
          const session =
            active?.resourceScopeIdentity === resourceScopeIdentity(requestedScope)
              ? active.runtime.session
              : undefined;
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
            ...productDiscoveryOptions(piSdk, input.cwd, agentDir, requestedScope.kind),
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
        ...providerExecutionStructure(provider),
        sessionModelSwitch: "in-session",
        supportsSkillMentions: true,
        supportsSkillDiscovery: true,
        supportsNativeSlashCommandDiscovery: true,
        supportsPluginMentions: false,
        supportsPluginDiscovery: false,
        supportsRuntimeModelList: true,
        supportsThreadCompaction: true,
        supportsThreadImport: false,
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
      get streamEvents() {
        return Stream.fromQueue(runtimeEventQueue);
      },
    } satisfies ProviderAdapterShape<ProviderAdapterError> & {
      readonly provider: P;
    };
  });

export const PiAdapterLive = Layer.effect(PiAdapter, makePiAdapter(STOCK_PI_FAMILY));

export function makePiAdapterLive(options?: PiAdapterLiveOptions) {
  return Layer.effect(PiAdapter, makePiAdapter(STOCK_PI_FAMILY, options));
}

export const OmniMindAgentAdapterLive = Layer.effect(
  OmniMindAgentAdapter,
  makePiAdapter(HARNESSOS_AGENT_FAMILY),
);

export function makeOmniMindAgentAdapterLive(options?: PiAdapterLiveOptions) {
  return Layer.effect(OmniMindAgentAdapter, makePiAdapter(HARNESSOS_AGENT_FAMILY, options));
}
