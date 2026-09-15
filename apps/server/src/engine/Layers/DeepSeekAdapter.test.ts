import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { ThreadId } from "@harnessos/contracts";
import { Effect, Layer, Result, Stream } from "effect";
import { describe, expect, it } from "vitest";

import { ServerConfig, type ServerConfigShape } from "../../config.ts";
import { DeepSeekAdapter } from "../Services/DeepSeekAdapter.ts";
import { makeDeepSeekAdapterLive } from "./DeepSeekAdapter.ts";

class FakeDeepSeekProcess extends EventEmitter {
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  readonly pid = 42_424;
  killed = false;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  readonly frames: unknown[] = [];
  private readonly settlePrompt: boolean;
  private readonly initializeError: unknown | undefined;

  constructor(
    options: { readonly settlePrompt?: boolean; readonly initializeError?: unknown } = {},
  ) {
    super();
    this.settlePrompt = options.settlePrompt !== false;
    this.initializeError = options.initializeError;
    this.stdin.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString("utf8").split("\n")) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line) as {
          readonly id?: number;
          readonly method?: string;
          readonly params?: unknown;
        };
        this.frames.push(parsed);
        if (parsed.method === "initialize") {
          if (this.initializeError !== undefined) {
            this.respondError(parsed.id, this.initializeError);
            continue;
          }
          this.respond(parsed.id, {
            serverInfo: { name: "deepseek-harness-sdk-runtime", version: "0.0.1" },
          });
          continue;
        }
        if (parsed.method === "session/prompt") {
          this.respond(parsed.id, { messageId: "user-1" });
          this.notify("session.status", { status: "running" });
          this.notify("session.event", { type: "text_delta", delta: "hello" });
          if (this.settlePrompt) {
            this.notify("session.status", { status: "idle" });
          }
          continue;
        }
        if (parsed.method === "shutdown") {
          this.respond(parsed.id, {});
        }
      }
    });
  }

  respond(id: number | undefined, result: unknown): void {
    if (id === undefined) return;
    this.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
  }

  respondError(id: number | undefined, error: unknown): void {
    if (id === undefined) return;
    this.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error })}\n`);
  }

  notify(method: string, params: unknown): void {
    this.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  kill(): boolean {
    this.killed = true;
    this.exitCode = 0;
    this.emit("exit", 0, null);
    return true;
  }
}

const serverConfig: ServerConfigShape = {
  mode: "web",
  port: 3773,
  host: "127.0.0.1",
  cwd: "/tmp/haros-deepseek",
  homeDir: "/tmp/home",
  chatWorkspaceRoot: "/tmp/chat",
  studioWorkspaceRoot: "/tmp/studio",
  baseDir: "/tmp/haros",
  staticDir: undefined,
  devUrl: undefined,
  publicUrl: undefined,
  allowInsecureRemote: false,
  noBrowser: true,
  authToken: undefined,
  autoBootstrapProjectFromCwd: false,
  logEngineEvents: false,
  logWebSocketEvents: false,
  stateDir: "/tmp/haros/state",
  secretsDir: "/tmp/haros/secrets",
  dbPath: "/tmp/haros/state/db.sqlite",
  settingsPath: "/tmp/haros/state/settings.json",
  keybindingsConfigPath: "/tmp/haros/state/keybindings.json",
  worktreesDir: "/tmp/haros/worktrees",
  attachmentsDir: "/tmp/haros/attachments",
  logsDir: "/tmp/haros/logs",
  serverLogPath: "/tmp/haros/logs/server.log",
  serverRuntimeStatePath: "/tmp/haros/state/runtime.json",
  quitResumeStatePath: "/tmp/haros/state/quit.json",
  engineLogsDir: "/tmp/haros/logs/engine",
  engineEventLogPath: "/tmp/haros/logs/engine/events.ndjson",
  terminalLogsDir: "/tmp/haros/logs/terminal",
  environmentIdPath: "/tmp/haros/state/environment-id",
};

describe("DeepSeekAdapter", () => {
  it("initializes over JSON-RPC, prompts, then settles idle as a completed turn", async () => {
    const child = new FakeDeepSeekProcess();
    const layer = makeDeepSeekAdapterLive({
      spawnProcess: () => child as never,
      teardownProcess: async (process) => {
        process.kill();
      },
    }).pipe(
      Layer.provide(Layer.succeed(ServerConfig, serverConfig)),
      Layer.provide(NodeServices.layer),
    );

    await Effect.gen(function* () {
      const adapter = yield* DeepSeekAdapter;
      const events: Array<{ type: string }> = [];
      yield* Stream.runForEach(adapter.streamEvents, (event) =>
        Effect.sync(() => {
          events.push({ type: event.type });
        }),
      ).pipe(Effect.forkScoped);
      const session = yield* adapter.startSession({
        threadId: ThreadId.makeUnsafe("thread-deepseek"),
        cwd: "/tmp/project",
        admission: {
          productSurface: "agent",
          workSurface: "agent",
          projectContextRoot: "/tmp/project",
        },
        runtimeMode: "full-access",
        engineSelection: { engine: "deepseek", model: "deepseek-v4-flash" },
      });
      expect(session.engine).toBe("deepseek");
      expect(session.status).toBe("ready");
      expect(
        child.frames.some((frame) => (frame as { method?: string }).method === "initialize"),
      ).toBe(true);

      const turn = yield* adapter.sendTurn({
        threadId: session.threadId,
        input: "say hello",
      });
      expect(turn.turnId).toBeTruthy();
      yield* Effect.sleep("50 millis");
      expect(events.map((event) => event.type)).toEqual(
        expect.arrayContaining([
          "session.started",
          "thread.started",
          "turn.started",
          "content.delta",
          "turn.completed",
        ]),
      );

      yield* adapter.stopSession(session.threadId);
      expect(yield* adapter.hasSession(session.threadId)).toBe(false);
    }).pipe(Effect.provide(layer), Effect.scoped, Effect.runPromise);
  });

  it("interrupts an active turn by shutting down the SDK process", async () => {
    const child = new FakeDeepSeekProcess({ settlePrompt: false });
    const layer = makeDeepSeekAdapterLive({
      spawnProcess: () => child as never,
      teardownProcess: async (process) => {
        process.kill();
      },
    }).pipe(
      Layer.provide(Layer.succeed(ServerConfig, serverConfig)),
      Layer.provide(NodeServices.layer),
    );

    await Effect.gen(function* () {
      const adapter = yield* DeepSeekAdapter;
      const events: Array<{ type: string }> = [];
      yield* Stream.runForEach(adapter.streamEvents, (event) =>
        Effect.sync(() => {
          events.push({ type: event.type });
        }),
      ).pipe(Effect.forkScoped);
      const session = yield* adapter.startSession({
        threadId: ThreadId.makeUnsafe("thread-deepseek-interrupt"),
        cwd: "/tmp/project",
        admission: {
          productSurface: "agent",
          workSurface: "agent",
          projectContextRoot: "/tmp/project",
        },
        runtimeMode: "full-access",
        engineSelection: { engine: "deepseek", model: "deepseek-v4-pro" },
      });
      const turn = yield* adapter.sendTurn({
        threadId: session.threadId,
        input: "say hello",
      });
      yield* adapter.interruptTurn(session.threadId, turn.turnId);
      yield* Effect.sleep("20 millis");
      expect(child.killed).toBe(true);
      expect(
        child.frames.some((frame) => (frame as { method?: string }).method === "shutdown"),
      ).toBe(true);
      expect(events.map((event) => event.type)).toEqual(
        expect.arrayContaining(["turn.started", "turn.completed", "session.exited"]),
      );
      expect(yield* adapter.hasSession(session.threadId)).toBe(false);
    }).pipe(Effect.provide(layer), Effect.scoped, Effect.runPromise);
  });

  it("injects stored DeepSeek model-service credentials into the child env", async () => {
    const child = new FakeDeepSeekProcess();
    let spawnedEnv: NodeJS.ProcessEnv | undefined;
    const layer = makeDeepSeekAdapterLive({
      spawnProcess: (input) => {
        spawnedEnv = input.env;
        return child as never;
      },
      teardownProcess: async (process) => {
        process.kill();
      },
      resolveModelServiceEnv: async () => ({
        DEEPSEEK_API_KEY: "sk-from-model-services",
        DEEPSEEK_BASE_URL: "https://gateway.example.test/v1",
      }),
    }).pipe(
      Layer.provide(Layer.succeed(ServerConfig, serverConfig)),
      Layer.provide(NodeServices.layer),
    );

    await Effect.gen(function* () {
      const adapter = yield* DeepSeekAdapter;
      yield* adapter.startSession({
        threadId: ThreadId.makeUnsafe("thread-deepseek-env"),
        cwd: "/tmp/project",
        admission: {
          productSurface: "agent",
          workSurface: "agent",
          projectContextRoot: "/tmp/project",
        },
        runtimeMode: "full-access",
        engineSelection: { engine: "deepseek", model: "deepseek-v4-flash" },
      });
      expect(spawnedEnv?.DEEPSEEK_API_KEY).toBe("sk-from-model-services");
      expect(spawnedEnv?.DEEPSEEK_BASE_URL).toBe("https://gateway.example.test/v1");
    }).pipe(Effect.provide(layer), Effect.scoped, Effect.runPromise);
  });

  it("tears down the session when the SDK process emits an error", async () => {
    const child = new FakeDeepSeekProcess();
    const layer = makeDeepSeekAdapterLive({
      spawnProcess: () => child as never,
      teardownProcess: async (process) => {
        process.kill();
      },
    }).pipe(
      Layer.provide(Layer.succeed(ServerConfig, serverConfig)),
      Layer.provide(NodeServices.layer),
    );

    await Effect.gen(function* () {
      const adapter = yield* DeepSeekAdapter;
      const events: Array<{ type: string }> = [];
      yield* Stream.runForEach(adapter.streamEvents, (event) =>
        Effect.sync(() => {
          events.push({ type: event.type });
        }),
      ).pipe(Effect.forkScoped);
      const session = yield* adapter.startSession({
        threadId: ThreadId.makeUnsafe("thread-deepseek-spawn-error"),
        cwd: "/tmp/project",
        admission: {
          productSurface: "agent",
          workSurface: "agent",
          projectContextRoot: "/tmp/project",
        },
        runtimeMode: "full-access",
        engineSelection: { engine: "deepseek", model: "deepseek-v4-flash" },
      });
      child.emit("error", new Error("spawn ENOENT dsh"));
      yield* Effect.sleep("50 millis");
      expect(child.killed).toBe(true);
      expect(events.map((event) => event.type)).toEqual(
        expect.arrayContaining(["session.started", "session.exited"]),
      );
      expect(yield* adapter.hasSession(session.threadId)).toBe(false);
    }).pipe(Effect.provide(layer), Effect.scoped, Effect.runPromise);
  });

  it("rejects JSON-RPC errors that only include a numeric code", async () => {
    const child = new FakeDeepSeekProcess({ initializeError: { code: -32603 } });
    const layer = makeDeepSeekAdapterLive({
      spawnProcess: () => child as never,
      teardownProcess: async (process) => {
        process.kill();
      },
    }).pipe(
      Layer.provide(Layer.succeed(ServerConfig, serverConfig)),
      Layer.provide(NodeServices.layer),
    );

    await Effect.gen(function* () {
      const adapter = yield* DeepSeekAdapter;
      const result = yield* adapter
        .startSession({
          threadId: ThreadId.makeUnsafe("thread-deepseek-rpc-error"),
          cwd: "/tmp/project",
          admission: {
            productSurface: "agent",
            workSurface: "agent",
            projectContextRoot: "/tmp/project",
          },
          runtimeMode: "full-access",
          engineSelection: { engine: "deepseek", model: "deepseek-v4-flash" },
        })
        .pipe(Effect.result);
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(String(result.failure)).toMatch(/JSON-RPC error -32603/);
      }
    }).pipe(Effect.provide(layer), Effect.scoped, Effect.runPromise);
  });

  it("rejects runtime modes other than full-access", async () => {
    const child = new FakeDeepSeekProcess();
    const layer = makeDeepSeekAdapterLive({
      spawnProcess: () => child as never,
      teardownProcess: async (process) => {
        process.kill();
      },
    }).pipe(
      Layer.provide(Layer.succeed(ServerConfig, serverConfig)),
      Layer.provide(NodeServices.layer),
    );

    await Effect.gen(function* () {
      const adapter = yield* DeepSeekAdapter;
      const result = yield* adapter
        .startSession({
          threadId: ThreadId.makeUnsafe("thread-deepseek-auto"),
          cwd: "/tmp/project",
          admission: {
            productSurface: "agent",
            workSurface: "agent",
            projectContextRoot: "/tmp/project",
          },
          runtimeMode: "auto",
          engineSelection: { engine: "deepseek", model: "deepseek-v4-flash" },
        })
        .pipe(Effect.result);
      expect(Result.isFailure(result)).toBe(true);
      expect(child.frames).toEqual([]);
    }).pipe(Effect.provide(layer), Effect.scoped, Effect.runPromise);
  });
});
