/**
 * DeepSeekAdapterLive - DeepSeek Harness (`dsh --profile sdk`) JSON-RPC stdio adapter.
 *
 * @module DeepSeekAdapterLive
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import crypto from "node:crypto";

import {
  EventId,
  type EngineRuntimeEvent,
  type EngineSession,
  RuntimeItemId,
  ThreadId,
  TurnId,
} from "@harnessos/contracts";
import { prepareWindowsSafeProcess } from "@harnessos/shared/windowsProcess";
import { Effect, Layer, Option, Queue, Stream } from "effect";

import { ServerConfig } from "../../config.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { appendFileAttachmentsPromptBlock } from "../attachmentProjection.ts";
import { makeBoundedCallbackIngress } from "../boundedCallbackIngress.ts";
import { buildEngineChildEnvironment } from "../engineChildEnvironment.ts";
import {
  loadHarosModelServiceChildEnv,
  resolveHarosModelServicesAgentDir,
} from "../modelServiceChildEnv.ts";
import { engineExecutionStructure } from "../engineExecutionStructure.ts";
import {
  compactEngineRuntimeEventForIngress,
  ENGINE_RUNTIME_CALLBACK_BUFFER_MAX_BYTES,
  ENGINE_RUNTIME_CALLBACK_TERMINAL_RESERVE,
  isTerminalEngineRuntimeEvent,
  type SizedEngineRuntimeEvent,
} from "../engineRuntimeEventIngress.ts";
import {
  EngineAdapterProcessError,
  EngineAdapterRequestError,
  EngineAdapterSessionNotFoundError,
  EngineAdapterValidationError,
} from "../Errors.ts";
import { DeepSeekAdapter, type DeepSeekAdapterShape } from "../Services/DeepSeekAdapter.ts";
import {
  ENGINE_ADAPTER_RUNTIME_EVENT_BUFFER_CAPACITY,
  type EngineThreadSnapshot,
} from "../Services/EngineAdapter.ts";
import { teardownChildProcessTree } from "../supervisedProcessTeardown.ts";
import {
  DeepSeekJsonlFramer,
  DeepSeekJsonlWriter,
  DeepSeekSdkTransportError,
} from "../deepseekSdkTransport.ts";

const ENGINE = "deepseek" as const;
const DEFAULT_BINARY = "dsh";
const DEFAULT_PROVIDER = "deepseek-official";
const DEFAULT_MODEL = "deepseek-v4-flash";
const DEEPSEEK_RESUME_VERSION = 1 as const;
const REQUEST_TIMEOUT_MS = 20_000;
const SHUTDOWN_TIMEOUT_MS = 2_000;
const RAW_SOURCE = "deepseek.sdk.event" as const;

type StoredTurn = {
  readonly id: TurnId;
  readonly items: unknown[];
};

type PendingRpc = {
  readonly method: string;
  readonly timeout: ReturnType<typeof setTimeout>;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
};

type DeepSeekResumeCursor = {
  readonly schemaVersion: typeof DEEPSEEK_RESUME_VERSION;
  readonly sessionId: string;
  readonly provider: string;
  readonly model: string;
};

interface DeepSeekSessionContext {
  session: EngineSession;
  readonly lifecycleGeneration?: string;
  readonly binaryPath: string;
  readonly homePath?: string;
  readonly provider: string;
  child: ChildProcessWithoutNullStreams;
  stdoutFramer: DeepSeekJsonlFramer;
  stdinWriter: DeepSeekJsonlWriter;
  pending: Map<string, PendingRpc>;
  nextRequestId: number;
  initialized: boolean;
  stopping: boolean;
  stopPromise?: Promise<void>;
  detachStdout?: () => void;
  activeTurnId?: TurnId;
  turnTerminalEmitted: boolean;
  activeAssistantItemId?: RuntimeItemId;
  turns: StoredTurn[];
  nativeSessionId: string;
}

export interface DeepSeekAdapterLiveOptions {
  readonly spawnProcess?: (input: {
    readonly command: string;
    readonly args: readonly string[];
    readonly cwd: string;
    readonly env: NodeJS.ProcessEnv;
  }) => ChildProcessWithoutNullStreams;
  readonly teardownProcess?: (child: ChildProcessWithoutNullStreams) => Promise<void>;
  readonly resolveModelServiceEnv?: (processEnv: NodeJS.ProcessEnv) => Promise<NodeJS.ProcessEnv>;
}

function trim(value: string | undefined | null): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function jsonRpcFailureMessage(method: string, error: unknown): string {
  if (isRecord(error)) {
    const code = error.code;
    const message = asString(error.message);
    if (message && code !== undefined) return `${method} failed: ${message} (${String(code)})`;
    if (message) return `${method} failed: ${message}`;
    if (code !== undefined) return `${method} failed: JSON-RPC error ${String(code)}`;
  }
  return `${method} failed: JSON-RPC error`;
}

function parseResumeCursor(raw: unknown): DeepSeekResumeCursor | undefined {
  if (!isRecord(raw) || raw.schemaVersion !== DEEPSEEK_RESUME_VERSION) return undefined;
  const sessionId = asString(raw.sessionId);
  const provider = asString(raw.provider);
  const model = asString(raw.model);
  if (!sessionId || !provider || !model) return undefined;
  return { schemaVersion: DEEPSEEK_RESUME_VERSION, sessionId, provider, model };
}

function makeEventBase(context: DeepSeekSessionContext, options?: { includeTurn?: boolean }) {
  return {
    eventId: EventId.makeUnsafe(crypto.randomUUID()),
    engine: ENGINE,
    threadId: context.session.threadId,
    createdAt: new Date().toISOString(),
    ...(context.lifecycleGeneration !== undefined
      ? { lifecycleGeneration: context.lifecycleGeneration }
      : {}),
    ...(options?.includeTurn !== false && context.activeTurnId
      ? { turnId: context.activeTurnId }
      : {}),
    engineRefs: { nativeThreadId: context.nativeSessionId },
  };
}

function raw(method: string, payload: unknown) {
  return { source: RAW_SOURCE, method, payload };
}

function spawnDeepSeekSdk(input: {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
}): ChildProcessWithoutNullStreams {
  const prepared = prepareWindowsSafeProcess(input.command, [...input.args], {
    cwd: input.cwd,
    env: input.env,
  });
  return spawn(prepared.command, prepared.args, {
    cwd: input.cwd,
    env: input.env,
    stdio: ["pipe", "pipe", "pipe"],
    shell: prepared.shell,
    windowsHide: prepared.windowsHide,
    windowsVerbatimArguments: prepared.windowsVerbatimArguments,
  });
}

function processErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return "DeepSeek SDK process failed.";
}

function extractTextDelta(event: unknown): string | undefined {
  if (!isRecord(event)) return undefined;
  const nested = isRecord(event.event) ? event.event : event;
  const delta = asString(nested.delta) ?? asString(nested.text);
  if (delta) return delta;
  const content = nested.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = content.flatMap((block) => {
      if (typeof block === "string") return [block];
      if (isRecord(block) && typeof block.text === "string") return [block.text];
      return [];
    });
    return parts.length > 0 ? parts.join("") : undefined;
  }
  return undefined;
}

function eventTypeName(event: unknown): string {
  if (!isRecord(event)) return "unknown";
  const nested = isRecord(event.event) ? event.event : event;
  return asString(nested.type) ?? asString(nested.kind) ?? "unknown";
}

export function getDeepSeekApiKeyEnv(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return trim(env.DEEPSEEK_API_KEY);
}

export function hasDeepSeekApiKeyEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return getDeepSeekApiKeyEnv(env) !== undefined;
}

const makeDeepSeekAdapter = (options: DeepSeekAdapterLiveOptions = {}) =>
  Effect.gen(function* () {
    const serverConfig = yield* ServerConfig;
    const serverSettings = Option.getOrUndefined(
      yield* Effect.serviceOption(ServerSettingsService),
    );
    const spawnProcess = options.spawnProcess ?? spawnDeepSeekSdk;
    const resolveModelServiceEnv =
      options.resolveModelServiceEnv ??
      (async (processEnv: NodeJS.ProcessEnv) => {
        if (!serverSettings) return {};
        const settings = await Effect.runPromise(serverSettings.getSettings);
        const agentDir = await resolveHarosModelServicesAgentDir({
          requestedAgentDir: settings.engines.pi.agentDir,
          serverBaseDir: serverConfig.baseDir,
        });
        return await loadHarosModelServiceChildEnv({
          engine: ENGINE,
          agentDir,
          processEnv,
        });
      });
    const teardownProcess =
      options.teardownProcess ??
      ((child: ChildProcessWithoutNullStreams) => teardownChildProcessTree(child));
    const eventQueue = yield* Queue.bounded<EngineRuntimeEvent>(
      ENGINE_ADAPTER_RUNTIME_EVENT_BUFFER_CAPACITY,
    );
    const sessions = new Map<ThreadId, DeepSeekSessionContext>();

    const eventIngress = yield* makeBoundedCallbackIngress<SizedEngineRuntimeEvent, never, never>(
      (item) => Queue.offer(eventQueue, item.event).pipe(Effect.asVoid),
      {
        capacity: ENGINE_ADAPTER_RUNTIME_EVENT_BUFFER_CAPACITY,
        maxBufferedBytes: ENGINE_RUNTIME_CALLBACK_BUFFER_MAX_BYTES,
        terminalReserve: ENGINE_RUNTIME_CALLBACK_TERMINAL_RESERVE,
        isTerminal: (item) => isTerminalEngineRuntimeEvent(item.event),
        sizeOf: (item) => item.bytes,
      },
    );

    const offer = (event: EngineRuntimeEvent) => {
      eventIngress.offer(compactEngineRuntimeEventForIngress(event));
    };

    const requireSession = (threadId: ThreadId) =>
      Effect.gen(function* () {
        const context = sessions.get(threadId);
        if (!context) {
          return yield* new EngineAdapterSessionNotFoundError({ engine: ENGINE, threadId });
        }
        return context;
      });

    const rejectPending = (context: DeepSeekSessionContext, error: Error) => {
      for (const pending of context.pending.values()) {
        clearTimeout(pending.timeout);
        pending.reject(error);
      }
      context.pending.clear();
    };

    const writeMessage = (context: DeepSeekSessionContext, message: unknown): Promise<void> =>
      context.stdinWriter.write(message);

    const sendRequest = <T>(
      context: DeepSeekSessionContext,
      method: string,
      params: unknown,
      timeoutMs = REQUEST_TIMEOUT_MS,
    ): Promise<T> => {
      const id = context.nextRequestId;
      context.nextRequestId += 1;
      return new Promise<unknown>((resolve, reject) => {
        const timeout = setTimeout(() => {
          context.pending.delete(String(id));
          reject(new Error(`Timed out waiting for ${method}.`));
        }, timeoutMs);
        context.pending.set(String(id), { method, timeout, resolve, reject });
        void writeMessage(context, { jsonrpc: "2.0", method, id, params }).catch((error) => {
          clearTimeout(timeout);
          context.pending.delete(String(id));
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      }) as Promise<T>;
    };

    const settleActiveTurn = (
      context: DeepSeekSessionContext,
      input: {
        readonly state: "completed" | "interrupted" | "failed";
        readonly stopReason: string;
        readonly errorMessage?: string;
        readonly method: string;
        readonly payload: unknown;
      },
    ) => {
      if (context.turnTerminalEmitted || context.activeTurnId === undefined) return;
      context.turnTerminalEmitted = true;
      if (context.activeAssistantItemId) {
        offer({
          ...makeEventBase(context),
          itemId: context.activeAssistantItemId,
          type: "item.completed",
          payload: {
            itemType: "assistant_message",
            status: input.state === "failed" ? "failed" : "completed",
            title: "Assistant",
          },
          raw: raw(input.method, input.payload),
        } satisfies EngineRuntimeEvent);
        delete context.activeAssistantItemId;
      }
      const completionBase = makeEventBase(context);
      delete context.activeTurnId;
      context.session = {
        ...context.session,
        status: "ready",
        updatedAt: new Date().toISOString(),
      };
      offer({
        ...completionBase,
        type: "turn.completed",
        payload: {
          state: input.state,
          stopReason: input.stopReason,
          ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
        },
        raw: raw(input.method, input.payload),
      } satisfies EngineRuntimeEvent);
    };

    const emitAssistantDelta = (
      context: DeepSeekSessionContext,
      delta: string,
      payload: unknown,
    ) => {
      if (!context.activeTurnId || !delta) return;
      if (!context.activeAssistantItemId) {
        context.activeAssistantItemId = RuntimeItemId.makeUnsafe(
          `deepseek-assistant-${crypto.randomUUID()}`,
        );
        offer({
          ...makeEventBase(context),
          itemId: context.activeAssistantItemId,
          type: "item.started",
          payload: {
            itemType: "assistant_message",
            status: "inProgress",
            title: "Assistant",
          },
          raw: raw("session.event", payload),
        } satisfies EngineRuntimeEvent);
      }
      offer({
        ...makeEventBase(context),
        itemId: context.activeAssistantItemId,
        type: "content.delta",
        payload: { streamKind: "assistant_text", delta },
        raw: raw("session.event", payload),
      } satisfies EngineRuntimeEvent);
    };

    const handleNotification = (
      context: DeepSeekSessionContext,
      method: string,
      params: unknown,
    ) => {
      if (context.stopping) return;
      if (method === "session.status") {
        const status = isRecord(params) ? asString(params.status) : undefined;
        if (status === "running") {
          offer({
            ...makeEventBase(context, { includeTurn: false }),
            type: "session.state.changed",
            payload: { state: "running" },
            raw: raw(method, params),
          } satisfies EngineRuntimeEvent);
          return;
        }
        if (status === "idle") {
          settleActiveTurn(context, {
            state: "completed",
            stopReason: "model_stop",
            method,
            payload: params,
          });
          offer({
            ...makeEventBase(context, { includeTurn: false }),
            type: "session.state.changed",
            payload: { state: "ready" },
            raw: raw(method, params),
          } satisfies EngineRuntimeEvent);
        }
        return;
      }
      if (method === "session.event") {
        const delta = extractTextDelta(params);
        if (delta) {
          emitAssistantDelta(context, delta, params);
          return;
        }
        offer({
          ...makeEventBase(context),
          type: "event.unmapped",
          payload: { nativeType: eventTypeName(params) },
          raw: raw(method, params),
        } satisfies EngineRuntimeEvent);
        return;
      }
      if (method === "subagent.started" || method === "subagent.finished") {
        offer({
          ...makeEventBase(context),
          type: "event.unmapped",
          payload: { nativeType: method },
          raw: raw(method, params),
        } satisfies EngineRuntimeEvent);
      }
    };

    const handleStdoutLine = (context: DeepSeekSessionContext, line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return;
      }
      if (!isRecord(parsed)) return;
      const id = parsed.id;
      if (id !== undefined && parsed.method === undefined) {
        const pending = context.pending.get(String(id));
        if (!pending) return;
        clearTimeout(pending.timeout);
        context.pending.delete(String(id));
        if (Object.hasOwn(parsed, "error") && parsed.error != null) {
          pending.reject(new Error(jsonRpcFailureMessage(pending.method, parsed.error)));
          return;
        }
        pending.resolve(parsed.result);
        return;
      }
      const method = asString(parsed.method);
      if (method && id === undefined) {
        handleNotification(context, method, parsed.params);
      }
    };

    const stopContext = (context: DeepSeekSessionContext, reason: string): Promise<void> => {
      if (context.stopPromise) return context.stopPromise;
      context.stopping = true;
      settleActiveTurn(context, {
        state: "interrupted",
        stopReason: "interrupted",
        method: "session/stop",
        payload: { reason },
      });
      offer({
        ...makeEventBase(context, { includeTurn: false }),
        type: "session.exited",
        payload: { reason, exitKind: "graceful" },
      } satisfies EngineRuntimeEvent);
      rejectPending(context, new Error(reason));
      const shutdown = sendRequest(context, "shutdown", {}, SHUTDOWN_TIMEOUT_MS).catch(
        () => undefined,
      );
      const stopPromise = shutdown
        .then(async () => {
          context.stdinWriter.close(new Error(reason));
          context.detachStdout?.();
          await teardownProcess(context.child);
        })
        .catch(async (cause) => {
          context.stdinWriter.close(new Error(reason));
          context.detachStdout?.();
          try {
            context.child.kill("SIGKILL");
          } catch {
            // Process may already be gone.
          }
          try {
            await teardownProcess(context.child);
          } catch {
            throw cause;
          }
        })
        .then(() => {
          if (sessions.get(context.session.threadId) === context) {
            sessions.delete(context.session.threadId);
          }
        });
      context.stopPromise = stopPromise;
      return stopPromise;
    };

    const attachProcessListeners = (context: DeepSeekSessionContext) => {
      const onStdoutData = (chunk: Buffer) => {
        try {
          for (const line of context.stdoutFramer.push(chunk)) {
            handleStdoutLine(context, line);
          }
        } catch (cause) {
          void stopContext(
            context,
            cause instanceof Error ? cause.message : "DeepSeek SDK transport failed",
          );
        }
      };
      const onStdoutEnd = () => {
        if (context.stopping) return;
        try {
          context.stdoutFramer.finish();
        } catch (cause) {
          void stopContext(
            context,
            cause instanceof Error ? cause.message : "DeepSeek SDK stdout ended",
          );
          return;
        }
        void stopContext(
          context,
          new DeepSeekSdkTransportError({
            reason: "read-closed",
            maxBytes: context.stdoutFramer.maxFrameBytes,
            observedBytes: 0,
          }).message,
        );
      };
      context.child.stdout.on("data", onStdoutData);
      context.child.stdout.once("end", onStdoutEnd);
      context.detachStdout = () => {
        context.child.stdout.off("data", onStdoutData);
        context.child.stdout.off("end", onStdoutEnd);
        context.stdoutFramer.reset();
        delete context.detachStdout;
      };
      context.child.stderr.on("data", (chunk: Buffer) => {
        const message = chunk.toString("utf8").trim();
        if (!message || context.stopping) return;
        offer({
          ...makeEventBase(context, { includeTurn: false }),
          type: "runtime.warning",
          payload: { message: message.slice(0, 2_000) },
          raw: raw("process/stderr", { message: message.slice(0, 4_000) }),
        } satisfies EngineRuntimeEvent);
      });
      context.child.on("error", (error) => {
        if (context.stopping) return;
        void stopContext(context, processErrorMessage(error));
      });
      context.child.on("exit", (code, signal) => {
        if (context.stopping) return;
        void stopContext(
          context,
          `DeepSeek SDK exited (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
        );
      });
    };

    const startSession: DeepSeekAdapterShape["startSession"] = (input) =>
      Effect.gen(function* () {
        if (input.runtimeMode !== "full-access") {
          return yield* new EngineAdapterValidationError({
            engine: ENGINE,
            operation: "session/start",
            issue:
              "DeepSeek Harness SDK has no permission RPC. Select Full access to use this engine.",
          });
        }
        const existing = sessions.get(input.threadId);
        if (existing) {
          yield* Effect.promise(() => stopContext(existing, "session restarted"));
        }
        const engineSelection =
          input.engineSelection?.engine === ENGINE ? input.engineSelection : undefined;
        const resume = parseResumeCursor(input.resumeCursor);
        const binaryPath = trim(input.engineOptions?.deepseek?.binaryPath) ?? DEFAULT_BINARY;
        const homePath = trim(input.engineOptions?.deepseek?.homePath);
        const cwd = trim(input.cwd) ?? serverConfig.cwd;
        const model = engineSelection?.model ?? resume?.model ?? DEFAULT_MODEL;
        const provider = resume?.provider ?? DEFAULT_PROVIDER;
        const reasoningEffort = trim(engineSelection?.options?.reasoningEffort);
        const modelServiceEnv = yield* Effect.tryPromise({
          try: () => resolveModelServiceEnv(process.env),
          catch: (cause) =>
            new EngineAdapterRequestError({
              engine: ENGINE,
              method: "session/start",
              detail:
                cause instanceof Error
                  ? cause.message
                  : "Failed to load model-service credentials.",
              cause,
            }),
        });
        const env = buildEngineChildEnvironment({
          engine: ENGINE,
          overrides: {
            ...modelServiceEnv,
            ...(homePath ? { DSH_HOME: homePath } : {}),
          },
        });
        const child = yield* Effect.try({
          try: () =>
            spawnProcess({
              command: binaryPath,
              args: ["--profile", "sdk"],
              cwd,
              env,
            }),
          catch: (cause) =>
            new EngineAdapterProcessError({
              engine: ENGINE,
              threadId: input.threadId,
              detail: cause instanceof Error ? cause.message : "Failed to start DeepSeek Harness.",
              cause,
            }),
        });
        const now = new Date().toISOString();
        const nativeSessionId = resume?.sessionId ?? input.threadId;
        const session: EngineSession = {
          engine: ENGINE,
          status: "connecting",
          runtimeMode: input.runtimeMode,
          cwd,
          model,
          threadId: input.threadId,
          resumeCursor: {
            schemaVersion: DEEPSEEK_RESUME_VERSION,
            sessionId: nativeSessionId,
            provider,
            model,
          },
          createdAt: now,
          updatedAt: now,
        };
        const context: DeepSeekSessionContext = {
          session,
          ...(input.lifecycleGeneration !== undefined
            ? { lifecycleGeneration: input.lifecycleGeneration }
            : {}),
          binaryPath,
          ...(homePath ? { homePath } : {}),
          provider,
          child,
          stdoutFramer: new DeepSeekJsonlFramer(),
          stdinWriter: new DeepSeekJsonlWriter(child.stdin),
          pending: new Map(),
          nextRequestId: 1,
          initialized: false,
          stopping: false,
          turns: [],
          nativeSessionId,
          turnTerminalEmitted: true,
        };
        sessions.set(input.threadId, context);
        attachProcessListeners(context);
        yield* Effect.tryPromise({
          try: () =>
            sendRequest(context, "initialize", {
              cwd,
              provider,
              model,
              ...(reasoningEffort ? { reasoningEffort } : {}),
            }),
          catch: (cause) =>
            new EngineAdapterRequestError({
              engine: ENGINE,
              method: "initialize",
              detail: cause instanceof Error ? cause.message : "DeepSeek SDK initialize failed.",
              cause,
            }),
        }).pipe(
          Effect.tapError(() => Effect.promise(() => stopContext(context, "initialize failed"))),
        );
        context.initialized = true;
        context.session = {
          ...context.session,
          status: "ready",
          updatedAt: new Date().toISOString(),
        };
        offer({
          ...makeEventBase(context, { includeTurn: false }),
          type: "session.started",
          payload: {
            message: "DeepSeek session started",
            resume: context.session.resumeCursor,
          },
          raw: raw("initialize", { cwd, provider, model }),
        } satisfies EngineRuntimeEvent);
        offer({
          ...makeEventBase(context, { includeTurn: false }),
          type: "thread.started",
          payload: { nativeThreadId: nativeSessionId },
          raw: raw("initialize", { sessionId: nativeSessionId }),
        } satisfies EngineRuntimeEvent);
        return context.session;
      });

    const sendTurn: DeepSeekAdapterShape["sendTurn"] = (input) =>
      Effect.gen(function* () {
        const context = yield* requireSession(input.threadId);
        if (!context.initialized || context.stopping) {
          return yield* new EngineAdapterValidationError({
            engine: ENGINE,
            operation: "sendTurn",
            issue: "DeepSeek session is not ready.",
          });
        }
        if (context.activeTurnId) {
          return yield* new EngineAdapterValidationError({
            engine: ENGINE,
            operation: "sendTurn",
            issue: "A DeepSeek turn is already active for this thread.",
          });
        }
        const text =
          appendFileAttachmentsPromptBlock({
            text: input.input,
            attachments: input.attachments,
            attachmentsDir: serverConfig.attachmentsDir,
            include: "all-files",
          }) ?? "";
        if (!text.trim()) {
          return yield* new EngineAdapterValidationError({
            engine: ENGINE,
            operation: "sendTurn",
            issue: "A prompt or file attachment is required.",
          });
        }
        const turnId = TurnId.makeUnsafe(crypto.randomUUID());
        context.activeTurnId = turnId;
        context.turnTerminalEmitted = false;
        context.turns.push({ id: turnId, items: [] });
        context.session = {
          ...context.session,
          status: "running",
          activeTurnId: turnId,
          updatedAt: new Date().toISOString(),
        };
        offer({
          ...makeEventBase(context),
          type: "turn.started",
          payload: { model: context.session.model },
          raw: raw("session/prompt", { sessionId: context.nativeSessionId }),
        } satisfies EngineRuntimeEvent);
        yield* Effect.tryPromise({
          try: () =>
            sendRequest(context, "session/prompt", {
              sessionId: context.nativeSessionId,
              contentBlocks: [{ type: "text", text }],
            }),
          catch: (cause) =>
            new EngineAdapterRequestError({
              engine: ENGINE,
              method: "session/prompt",
              detail: cause instanceof Error ? cause.message : "DeepSeek prompt failed.",
              cause,
            }),
        }).pipe(
          Effect.tapError(() =>
            Effect.sync(() =>
              settleActiveTurn(context, {
                state: "failed",
                stopReason: "error",
                errorMessage: "DeepSeek prompt failed.",
                method: "session/prompt",
                payload: {},
              }),
            ),
          ),
        );
        return {
          threadId: input.threadId,
          turnId,
          resumeCursor: context.session.resumeCursor,
        };
      });

    const interruptTurn: DeepSeekAdapterShape["interruptTurn"] = (threadId, turnId) =>
      Effect.gen(function* () {
        const context = yield* requireSession(threadId);
        if (turnId !== undefined && turnId !== context.activeTurnId) {
          yield* Effect.logWarning("deepseek.stale_interrupt_ignored", {
            threadId,
            requestedTurnId: turnId,
            activeTurnId: context.activeTurnId,
          });
          return;
        }
        yield* Effect.promise(() => stopContext(context, "turn interrupted"));
      });

    const unsupported = (threadId: ThreadId, method: string) =>
      Effect.fail(
        new EngineAdapterRequestError({
          engine: ENGINE,
          method,
          detail: `DeepSeek Harness SDK does not expose interactive requests for ${threadId}.`,
        }),
      );

    const stopSession: DeepSeekAdapterShape["stopSession"] = (threadId) =>
      Effect.gen(function* () {
        const context = sessions.get(threadId);
        if (!context) return;
        yield* Effect.promise(() => stopContext(context, "session stopped"));
      });

    const snapshot = (context: DeepSeekSessionContext): EngineThreadSnapshot => ({
      threadId: context.session.threadId,
      ...(context.session.cwd ? { cwd: context.session.cwd } : {}),
      turns: context.turns.map((turn) => ({ id: turn.id, items: [...turn.items] })),
    });

    const rollbackThread: DeepSeekAdapterShape["rollbackThread"] = (threadId, numTurns) =>
      requireSession(threadId).pipe(
        Effect.map((context) => {
          context.turns.splice(Math.max(0, context.turns.length - Math.max(0, numTurns)));
          return snapshot(context);
        }),
      );

    const stopAll = () =>
      Effect.forEach([...sessions.keys()], (threadId) => stopSession(threadId), {
        concurrency: "unbounded",
        discard: true,
      }).pipe(Effect.asVoid);

    yield* Effect.addFinalizer(() =>
      stopAll().pipe(
        Effect.ignore,
        Effect.andThen(eventIngress.stop),
        Effect.andThen(Queue.shutdown(eventQueue)),
      ),
    );

    return {
      engine: ENGINE,
      capabilities: {
        ...engineExecutionStructure(ENGINE),
        sessionModelSwitch: "restart-session",
        conversationRollback: "restart-session",
        supportsSkillMentions: false,
        supportsSkillDiscovery: false,
        supportsNativeSlashCommandDiscovery: false,
        supportsPluginMentions: false,
        supportsPluginDiscovery: false,
        supportsRuntimeModelList: false,
        supportsThreadCompaction: false,
        supportsThreadImport: false,
        supportsLiveTurnDiffPatch: false,
      },
      startSession,
      sendTurn,
      interruptTurn,
      respondToRequest: (threadId) => unsupported(threadId, "request/respond"),
      respondToUserInput: (threadId) => unsupported(threadId, "user-input/respond"),
      stopSession,
      listSessions: () =>
        Effect.sync(() => [...sessions.values()].map((context) => context.session)),
      hasSession: (threadId) => Effect.sync(() => sessions.has(threadId)),
      readThread: (threadId) => requireSession(threadId).pipe(Effect.map(snapshot)),
      rollbackThread,
      stopAll,
      get streamEvents() {
        return Stream.fromQueue(eventQueue);
      },
    } satisfies DeepSeekAdapterShape;
  });

export const DeepSeekAdapterLive = Layer.effect(DeepSeekAdapter, makeDeepSeekAdapter());

export function makeDeepSeekAdapterLive(options: DeepSeekAdapterLiveOptions = {}) {
  return Layer.effect(DeepSeekAdapter, makeDeepSeekAdapter(options));
}
