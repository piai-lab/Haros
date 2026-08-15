// FILE: PiAdapter.test.ts
// Purpose: Verifies Pi adapter model discovery respects auth and SDK-supported thinking levels.
// Layer: Provider adapter tests
// Depends on: PiAdapter discovery helpers and Pi model metadata shapes.

import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type { ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { ModelRegistry, ModelRuntime } from "@earendil-works/pi-coding-agent";
import type { Api, Model } from "@earendil-works/pi-ai";
import { type ProviderRuntimeEvent, ThreadId } from "@omnimind/contracts";
import { Effect, Fiber, Layer, Stream } from "effect";
import { describe, expect, it, vi } from "vitest";
import { ServerConfig } from "../../config.ts";
import { OmniMindAgentAdapter } from "../Services/OmniMindAgentAdapter.ts";
import { publishOmniMindModelRuntimeMutation } from "../omnimindModelRuntimeMutation.ts";
import {
  createPiModelRuntime,
  createOmniMindModelRuntime,
  findModelInRegistry,
  getPiDiscoverableModels,
  getPiSupportedThinkingOptions,
  buildPiAgentGatewayCustomTools,
  makePiBashProcessSupervisor,
  makePiGatewayLoadWarning,
  makePiHostSystemPrompt,
  makePiRuntimeEventBase,
  makePiUserInputOptions,
  piModelHasConfiguredCredentials,
  piToolTimelineDetail,
  PLAIN_PI_EXTENSION_THEME,
  toPiProviderModelDescriptor,
  makeOmniMindAgentAdapterLive,
} from "./PiAdapter";

describe("Pi native resource projection", () => {
  it("keeps native slash input in Pi and injects OmniMind policy through its system prompt", () => {
    const prompt = makePiHostSystemPrompt({
      provider: "omnimind",
      gatewayControlAvailable: true,
    });

    expect(prompt).toContain("<omnimind_host_context>");
    expect(prompt).toContain("Use the omnimind_* tools");
    expect(prompt).not.toContain("OmniMind MCP control is unavailable");
  });

  it("keeps usable native tools visible when OmniMind MCP discovery fails", () => {
    expect(makePiGatewayLoadWarning("OmniMind Agent")).toEqual({
      message:
        "OmniMind MCP tools could not be loaded for this OmniMind Agent session. Engine-native tools remain available; OmniMind MCP actions are unavailable.",
      detail: { source: "omnimind-mcp", availability: "failed" },
    });
  });

  it("normalizes native tool text before it reaches the Timeline event contract", () => {
    expect(piToolTimelineDetail({ content: [{ type: "text", text: "  native output\n" }] })).toBe(
      "native output",
    );
    expect(piToolTimelineDetail({ content: [{ type: "text", text: "  \n" }] })).toBeUndefined();
  });
});

describe("Pi credential gate", () => {
  it("requires configured auth for the selected upstream model", () => {
    const configured = {
      hasConfiguredAuth: (provider: string) => provider === "deepseek",
    } as Pick<ModelRuntime, "hasConfiguredAuth">;

    expect(piModelHasConfiguredCredentials(configured, undefined)).toBe(false);
    expect(piModelHasConfiguredCredentials(configured, { provider: "anthropic" })).toBe(false);
    expect(piModelHasConfiguredCredentials(configured, { provider: "deepseek" })).toBe(true);
  });
});

describe("Pi native OmniMind gateway tools", () => {
  it("uses canonical MCP schemas and keeps same-cwd thread tokens distinct", async () => {
    const requests: Array<{ readonly token: string | null; readonly body: any }> = [];
    const fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      requests.push({
        token: new Headers(init?.headers).get("Authorization"),
        body,
      });
      return Response.json({
        jsonrpc: "2.0",
        id: body.id,
        result:
          body.method === "tools/list"
            ? {
                tools: [
                  {
                    name: "omnimind_list_threads",
                    description: "List OmniMind threads.",
                    inputSchema: {
                      type: "object",
                      properties: { limit: { type: "number" } },
                    },
                  },
                ],
              }
            : {
                content: [{ type: "text", text: body.params.arguments.owner }],
              },
      });
    };
    const defineTool = (tool: any) => tool;
    const firstConnection = {
      url: "http://127.0.0.1:3773/mcp",
      bearerToken: "token-a",
    };
    const first = await buildPiAgentGatewayCustomTools({
      connection: firstConnection,
      defineTool,
      fetch,
    });
    const second = await buildPiAgentGatewayCustomTools({
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "token-b" },
      defineTool,
      fetch,
    });

    expect(first[0]?.parameters).toEqual({
      type: "object",
      properties: { limit: { type: "number" } },
    });
    await expect(
      first[0]?.execute("call-a", { owner: "thread-a" }, undefined, undefined, {} as never),
    ).resolves.toMatchObject({ content: [{ type: "text", text: "thread-a" }] });
    await expect(
      second[0]?.execute("call-b", { owner: "thread-b" }, undefined, undefined, {} as never),
    ).resolves.toMatchObject({ content: [{ type: "text", text: "thread-b" }] });
    expect(requests.map((request) => request.token)).toEqual([
      "Bearer token-a",
      "Bearer token-b",
      "Bearer token-a",
      "Bearer token-b",
    ]);
    expect(requests[2]?.body.params.arguments).toEqual({ owner: "thread-a" });
    expect(requests[3]?.body.params.arguments).toEqual({ owner: "thread-b" });
    Object.assign(firstConnection, { bearerToken: "token-c" });
    await first[0]?.execute("call-c", {}, undefined, undefined, {} as never);
    expect(requests[4]?.token).toBe("Bearer token-c");
  });

  it("forwards Pi tool cancellation to the in-flight MCP request", async () => {
    let callSignal: AbortSignal | null = null;
    const fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.method === "tools/list") {
        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            tools: [
              {
                name: "omnimind_create_threads",
                description: "Create OmniMind threads.",
                inputSchema: { type: "object", properties: {} },
              },
            ],
          },
        });
      }

      callSignal = init?.signal ?? null;
      return await new Promise<Response>((_resolve, reject) => {
        const rejectAborted = () =>
          reject(
            callSignal?.reason ?? new DOMException("The operation was aborted.", "AbortError"),
          );
        if (callSignal?.aborted) {
          rejectAborted();
          return;
        }
        callSignal?.addEventListener("abort", rejectAborted, { once: true });
      });
    };
    const tools = await buildPiAgentGatewayCustomTools({
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "token-a" },
      defineTool: (tool) => tool,
      fetch,
    });
    const controller = new AbortController();
    const execution = tools[0]?.execute("call-a", {}, controller.signal, undefined, {} as never);

    controller.abort();

    await expect(execution).rejects.toMatchObject({ name: "AbortError" });
    expect(callSignal).toBe(controller.signal);
    expect(controller.signal.aborted).toBe(true);
  });
});

describe("Pi Bash process supervision", () => {
  it("keeps an aborted command pending until process-tree exit is proven", async () => {
    const child = Object.assign(new EventEmitter(), {
      pid: 64_201,
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      stdin: new PassThrough(),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
    }) as unknown as ChildProcess;
    let proveExit!: () => void;
    const exitProof = new Promise<void>((resolve) => {
      proveExit = resolve;
    });
    let observeTeardown!: () => void;
    const teardownStarted = new Promise<void>((resolve) => {
      observeTeardown = resolve;
    });
    const supervisor = makePiBashProcessSupervisor({
      getShellConfig: () => ({ shell: "/bin/sh", args: ["-c"] }),
      spawnProcess: () => child,
      teardownProcessTree: async (input) => {
        observeTeardown();
        await exitProof;
        (child as ChildProcess & { exitCode: number | null }).exitCode = 0;
        child.emit("exit", 0, null);
        await input.rootExited;
        return { escalated: false, signalErrors: [] };
      },
    });
    const abortController = new AbortController();
    const command = supervisor.operations.exec("sleep 10", "/tmp", {
      signal: abortController.signal,
      onData: () => undefined,
    });
    let settled = false;
    void command.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    abortController.abort();
    await teardownStarted;
    await Promise.resolve();
    expect(settled).toBe(false);

    proveExit();
    await expect(command).rejects.toThrow("aborted");
    expect(settled).toBe(true);
  });
});

function makePiModel(input: {
  reasoning: boolean;
  thinkingLevelMap?: Model<Api>["thinkingLevelMap"];
}): Pick<Model<Api>, "reasoning" | "thinkingLevelMap"> {
  return {
    reasoning: input.reasoning,
    ...(input.thinkingLevelMap !== undefined ? { thinkingLevelMap: input.thinkingLevelMap } : {}),
  };
}

async function waitForTestCondition(predicate: () => boolean, message: string, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(message);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function piOpenAiSuccessResponse(text = "ok") {
  return new Response(
    [
      `data: ${JSON.stringify({
        id: "chatcmpl-test",
        object: "chat.completion.chunk",
        created: 1,
        model: "safe-model",
        choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }],
      })}`,
      `data: ${JSON.stringify({
        id: "chatcmpl-test",
        object: "chat.completion.chunk",
        created: 1,
        model: "safe-model",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      })}`,
      "data: [DONE]",
      "",
    ].join("\n\n"),
    { headers: { "content-type": "text/event-stream" } },
  );
}

function piRetryableResponse() {
  return Response.json(
    { error: { message: "temporary rate limit", type: "rate_limit_error" } },
    { status: 429 },
  );
}

function isPiAutoRetryWarning(event: ProviderRuntimeEvent) {
  if (event.type !== "runtime.warning") return false;
  const detail = event.payload.detail;
  return (
    typeof detail === "object" &&
    detail !== null &&
    "source" in detail &&
    detail.source === "pi-auto-retry"
  );
}

describe("getPiDiscoverableModels", () => {
  it("normalizes the malformed Pi extension model metadata before returning it through RPC", () => {
    const descriptor = toPiProviderModelDescriptor(
      {
        provider: "openrouter",
        id: "google/gemma-4-26b-a4b-it",
        name: "Google: Gemma 4 26B A4B ",
        reasoning: false,
      } as Model<Api>,
      () => " OpenRouter ",
      () => "extension",
    );

    expect(descriptor).toMatchObject({
      slug: "openrouter/google/gemma-4-26b-a4b-it",
      name: "Google: Gemma 4 26B A4B",
      upstreamProviderId: "openrouter",
      upstreamProviderName: "OpenRouter",
      upstreamProviderOrigin: "extension",
    });
  });

  it("omits models whose normalized identity would no longer resolve in the registry", () => {
    expect(
      toPiProviderModelDescriptor(
        {
          provider: " openrouter",
          id: "google/gemma-4-26b-a4b-it",
          name: "Google: Gemma 4 26B A4B",
          reasoning: false,
        } as Model<Api>,
        () => "OpenRouter",
        () => "builtin",
      ),
    ).toBeNull();
    expect(
      toPiProviderModelDescriptor(
        {
          provider: "openrouter",
          id: " google/gemma-4-26b-a4b-it",
          name: "Google: Gemma 4 26B A4B",
          reasoning: false,
        } as Model<Api>,
        () => "OpenRouter",
        () => "builtin",
      ),
    ).toBeNull();
  });

  it("isolates extension providers between sessions that share an agent directory", async () => {
    const agentDir = mkdtempSync(path.join(tmpdir(), "omnimind-pi-runtime-isolation-"));

    try {
      const firstRuntime = await createPiModelRuntime(agentDir, { ModelRuntime });
      const secondRuntime = await createPiModelRuntime(agentDir, { ModelRuntime });
      const firstRegistry = new ModelRegistry(firstRuntime);
      const secondRegistry = new ModelRegistry(secondRuntime);

      firstRegistry.registerProvider("project-local", {
        baseUrl: "http://127.0.0.1:11434/v1",
        api: "openai-completions",
        apiKey: "test-key",
        models: [
          {
            id: "project-model",
            name: "Project Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128_000,
            maxTokens: 16_384,
          },
        ],
      });

      expect(firstRegistry.find("project-local", "project-model")).toBeDefined();
      expect(secondRegistry.find("project-local", "project-model")).toBeUndefined();
    } finally {
      rmSync(agentDir, { recursive: true, force: true });
    }
  });

  it("includes custom-provider models authenticated through auth.json semantics", async () => {
    const agentDir = mkdtempSync(path.join(tmpdir(), "omnimind-pi-models-"));
    const modelsPath = path.join(agentDir, "models.json");
    const authPath = path.join(agentDir, "auth.json");

    try {
      writeFileSync(
        modelsPath,
        JSON.stringify({
          providers: {
            local: {
              api: "openai-completions",
              baseUrl: "http://127.0.0.1:11434/v1",
              models: [{ id: "glm-5.2" }],
            },
          },
        }),
      );
      writeFileSync(
        authPath,
        JSON.stringify({
          local: { type: "api_key", key: "test-key" },
        }),
      );
      const modelRuntime = await ModelRuntime.create({
        authPath,
        modelsPath,
        allowModelNetwork: false,
      });
      const registry = new ModelRegistry(modelRuntime);

      const models = getPiDiscoverableModels(registry);

      expect(models.some((model) => model.provider === "local" && model.id === "glm-5.2")).toBe(
        true,
      );
      expect(models.some((model) => model.provider === "anthropic")).toBe(false);
    } finally {
      rmSync(agentDir, { recursive: true, force: true });
    }
  });

  it("uses the product safe reader for OmniMind create and refresh", async () => {
    const agentDir = mkdtempSync(path.join(tmpdir(), "omnimind-agent-model-reader-"));
    const modelsPath = path.join(agentDir, "models.json");
    const authPath = path.join(agentDir, "auth.json");
    const modelConfig = (provider: string, model: string) =>
      JSON.stringify({
        providers: {
          [provider]: {
            api: "openai-completions",
            baseUrl: "https://example.test/v1",
            models: [{ id: model }],
          },
        },
      });

    try {
      writeFileSync(modelsPath, modelConfig("custom-one", "model-one"));
      writeFileSync(
        authPath,
        JSON.stringify({ "custom-one": { type: "api_key", key: "test-key" } }),
      );
      const runtime = await createOmniMindModelRuntime(agentDir);

      expect(runtime.getModelConfigProviderIds()).toEqual(["custom-one"]);
      expect(runtime.getModel("custom-one", "model-one")).toBeDefined();

      writeFileSync(modelsPath, modelConfig("custom-two", "model-two"));
      await runtime.refresh({ allowNetwork: false });

      expect(runtime.getModelConfigProviderIds()).toEqual(["custom-two"]);
      expect(runtime.getModel("custom-one", "model-one")).toBeUndefined();
      expect(runtime.getModel("custom-two", "model-two")).toBeDefined();

      rmSync(modelsPath);
      await runtime.refresh({ allowNetwork: false });

      expect(runtime.getError()).toBeDefined();
    } finally {
      rmSync(agentDir, { recursive: true, force: true });
    }
  });

  it("uses the accepted product catalog for discovery and Session creation", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-agent-adapter-reader-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("omnimind-model-reader-thread");
    mkdirSync(agentDir, { recursive: true });
    mkdirSync(cwd, { recursive: true });

    try {
      writeFileSync(
        path.join(agentDir, "models.json"),
        JSON.stringify({
          providers: {
            local: {
              api: "openai-completions",
              baseUrl: "https://example.test/v1",
              models: [{ id: "safe-model" }],
            },
          },
        }),
      );
      writeFileSync(
        path.join(agentDir, "auth.json"),
        JSON.stringify({ local: { type: "api_key", key: "test-key" } }),
      );
      const layer = makeOmniMindAgentAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );

      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const adapter = yield* OmniMindAgentAdapter;
            const catalog = yield* adapter.listModels!({ provider: "omnimind", cwd });
            const session = yield* adapter.startSession({
              provider: "omnimind",
              threadId,
              cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const reloaded = yield* adapter.reloadSessionResources!(threadId);
            yield* adapter.stopSession(threadId);
            const afterStop = yield* adapter.reloadSessionResources!(threadId);
            return { afterStop, catalog, reloaded, session };
          }).pipe(Effect.provide(layer)),
        ),
      );

      expect(result.catalog.models).toContainEqual(
        expect.objectContaining({ slug: "local/safe-model", upstreamProviderId: "local" }),
      );
      expect(result.session).toMatchObject({
        provider: "omnimind",
        model: "local/safe-model",
        status: "ready",
      });
      expect(result.reloaded).toBe("reloaded");
      expect(result.afterStop).toBe("no_active_session");
    } finally {
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("reconciles an existing OmniMind Session on the next send after credential mutation", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-agent-credential-reconcile-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("omnimind-credential-reconcile-thread");
    mkdirSync(agentDir, { recursive: true });
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model" }],
          },
        },
      }),
    );
    const requests: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (request) => {
      requests.push(request instanceof Request ? request.url : String(request));
      return new Response(
        [
          'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1,"model":"safe-model","choices":[{"index":0,"delta":{"role":"assistant","content":"ok"},"finish_reason":null}]}',
          'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1,"model":"safe-model","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
          "data: [DONE]",
          "",
        ].join("\n\n"),
        { headers: { "content-type": "text/event-stream" } },
      );
    });

    try {
      const layer = makeOmniMindAgentAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const adapter = yield* OmniMindAgentAdapter;
            yield* adapter.startSession({
              provider: "omnimind",
              threadId,
              cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const before = yield* Effect.exit(
              adapter.sendTurn({
                threadId,
                input: "before credential mutation",
                attachments: [],
                modelSelection: { provider: "omnimind", model: "local/safe-model" },
              }),
            );
            yield* Effect.sync(() => {
              writeFileSync(
                path.join(agentDir, "auth.json"),
                JSON.stringify({ local: { type: "api_key", key: "test-only-api-key" } }),
              );
              publishOmniMindModelRuntimeMutation(agentDir);
            });
            const after = yield* adapter.sendTurn({
              threadId,
              input: "after credential mutation",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.sleep("50 millis");
            yield* adapter.stopSession(threadId);
            return { before, after };
          }).pipe(Effect.provide(layer)),
        ),
      );

      expect(result.before._tag).toBe("Failure");
      expect(result.after.turnId).toBeDefined();
      expect(requests).toHaveLength(1);
      expect(new URL(requests[0]!).pathname).toBe("/v1/chat/completions");
    } finally {
      vi.restoreAllMocks();
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("keeps an active OmniMind turn on its original credentials and reconciles only the next send", async () => {
    const serverRoot = mkdtempSync(
      path.join(tmpdir(), "omnimind-agent-active-credential-reconcile-"),
    );
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000043");
    mkdirSync(agentDir, { recursive: true });
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model" }],
          },
        },
      }),
    );
    writeFileSync(
      path.join(agentDir, "auth.json"),
      JSON.stringify({ local: { type: "api_key", key: "test-old-key" } }),
    );
    const authorizationHeaders: Array<string | null> = [];
    let releaseFirstRequest!: () => void;
    const firstRequestGate = new Promise<void>((resolve) => {
      releaseFirstRequest = resolve;
    });
    let requestCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (request, init) => {
      requestCount += 1;
      authorizationHeaders.push(
        new Headers(request instanceof Request ? request.headers : init?.headers).get(
          "authorization",
        ),
      );
      if (requestCount === 1) await firstRequestGate;
      return new Response(
        [
          'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1,"model":"safe-model","choices":[{"index":0,"delta":{"role":"assistant","content":"ok"},"finish_reason":null}]}',
          'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1,"model":"safe-model","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
          "data: [DONE]",
          "",
        ].join("\n\n"),
        { headers: { "content-type": "text/event-stream" } },
      );
    });

    try {
      const layer = makeOmniMindAgentAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const adapter = yield* OmniMindAgentAdapter;
            yield* adapter.startSession({
              provider: "omnimind",
              threadId,
              cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const first = yield* adapter.sendTurn({
              threadId,
              input: "active turn",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.sleep("20 millis");
            const reloadWhileActive = yield* adapter.reloadSessionResources!(threadId);
            yield* Effect.sync(() => {
              writeFileSync(
                path.join(agentDir, "auth.json"),
                JSON.stringify({ local: { type: "api_key", key: "test-new-key" } }),
              );
              publishOmniMindModelRuntimeMutation(agentDir);
            });
            const overlapping = yield* Effect.exit(
              adapter.sendTurn({
                threadId,
                input: "must not hot-switch",
                attachments: [],
                modelSelection: { provider: "omnimind", model: "local/safe-model" },
              }),
            );
            yield* Effect.sync(releaseFirstRequest);
            yield* Effect.sleep("50 millis");
            const next = yield* adapter.sendTurn({
              threadId,
              input: "next turn",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.sleep("50 millis");
            yield* adapter.stopSession(threadId);
            return { first, overlapping, reloadWhileActive, next };
          }).pipe(Effect.provide(layer)),
        ),
      );

      expect(result.first.turnId).toBeDefined();
      expect(result.overlapping._tag).toBe("Failure");
      expect(result.reloadWhileActive).toBe("busy");
      expect(result.next.turnId).toBeDefined();
      expect(authorizationHeaders).toEqual(["Bearer test-old-key", "Bearer test-new-key"]);
    } finally {
      releaseFirstRequest();
      vi.restoreAllMocks();
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("keeps one active turn across a retryable attempt and emits one terminal success", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-agent-auto-retry-success-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000044");
    mkdirSync(agentDir, { recursive: true });
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model" }],
          },
        },
      }),
    );
    writeFileSync(
      path.join(agentDir, "auth.json"),
      JSON.stringify({ local: { type: "api_key", key: "test-key" } }),
    );
    writeFileSync(
      path.join(agentDir, "settings.json"),
      JSON.stringify({ retry: { enabled: true, maxRetries: 1, baseDelayMs: 10 } }),
    );
    let requestCount = 0;
    let releaseSuccessfulRetry!: () => void;
    const successfulRetryGate = new Promise<void>((resolve) => {
      releaseSuccessfulRetry = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      requestCount += 1;
      if (requestCount === 1) return piRetryableResponse();
      await successfulRetryGate;
      return piOpenAiSuccessResponse("recovered");
    });

    try {
      const events: Array<ProviderRuntimeEvent> = [];
      const layer = makeOmniMindAgentAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const adapter = yield* OmniMindAgentAdapter;
            const eventsFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
              Effect.sync(() => events.push(event)),
            ).pipe(Effect.forkChild);
            yield* adapter.startSession({
              provider: "omnimind",
              threadId,
              cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const turn = yield* adapter.sendTurn({
              threadId,
              input: "retry once",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () => events.some(isPiAutoRetryWarning),
                "Pi auto-retry did not become observable.",
              ),
            );
            const duringRetry = yield* adapter.listSessions();
            const terminalsBeforeRetry = events.filter(
              (event) => event.type === "turn.completed" || event.type === "turn.aborted",
            );
            yield* Effect.sync(releaseSuccessfulRetry);
            yield* Effect.promise(() =>
              waitForTestCondition(
                () => events.some((event) => event.type === "turn.completed"),
                "Pi retry success did not settle.",
              ),
            );
            const nextTurn = yield* adapter.sendTurn({
              threadId,
              input: "next turn",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () => events.filter((event) => event.type === "turn.completed").length === 2,
                "The turn after a Pi retry did not settle independently.",
              ),
            );
            yield* Effect.sleep("50 millis");
            yield* adapter.stopSession(threadId);
            yield* Fiber.interrupt(eventsFiber);
            return { duringRetry, nextTurn, terminalsBeforeRetry, turn };
          }).pipe(Effect.provide(layer)),
        ),
      );

      const terminals = events.filter(
        (event) => event.type === "turn.completed" || event.type === "turn.aborted",
      );
      expect(result.duringRetry).toContainEqual(
        expect.objectContaining({ activeTurnId: result.turn.turnId, status: "running" }),
      );
      expect(result.terminalsBeforeRetry).toEqual([]);
      expect(requestCount).toBe(3);
      expect(terminals).toHaveLength(2);
      expect(terminals.filter((event) => event.turnId === result.turn.turnId)).toHaveLength(1);
      expect(terminals.filter((event) => event.turnId === result.nextTurn.turnId)).toHaveLength(1);
      expect(
        events.filter(
          (event) => event.type === "turn.started" && event.turnId === result.turn.turnId,
        ),
      ).toHaveLength(1);
      expect(
        events.filter(
          (event) => event.type === "turn.started" && event.turnId === result.nextTurn.turnId,
        ),
      ).toHaveLength(1);
      expect(terminals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "turn.completed",
            turnId: result.turn.turnId,
            payload: expect.objectContaining({ state: "completed" }),
          }),
          expect.objectContaining({
            type: "turn.completed",
            turnId: result.nextTurn.turnId,
            payload: expect.objectContaining({ state: "completed" }),
          }),
        ]),
      );
      expect(
        events.filter(
          (event) =>
            event.type === "content.delta" &&
            event.turnId !== result.turn.turnId &&
            event.turnId !== result.nextTurn.turnId,
        ),
      ).toEqual([]);
    } finally {
      releaseSuccessfulRetry();
      vi.restoreAllMocks();
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("emits one failed terminal only after Pi exhausts its retry budget", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-agent-auto-retry-exhausted-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000045");
    mkdirSync(agentDir, { recursive: true });
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model" }],
          },
        },
      }),
    );
    writeFileSync(
      path.join(agentDir, "auth.json"),
      JSON.stringify({ local: { type: "api_key", key: "test-key" } }),
    );
    writeFileSync(
      path.join(agentDir, "settings.json"),
      JSON.stringify({ retry: { enabled: true, maxRetries: 1, baseDelayMs: 10 } }),
    );
    let requestCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      requestCount += 1;
      return piRetryableResponse();
    });

    try {
      const events: Array<ProviderRuntimeEvent> = [];
      const layer = makeOmniMindAgentAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const adapter = yield* OmniMindAgentAdapter;
            const eventsFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
              Effect.sync(() => events.push(event)),
            ).pipe(Effect.forkChild);
            yield* adapter.startSession({
              provider: "omnimind",
              threadId,
              cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const turn = yield* adapter.sendTurn({
              threadId,
              input: "exhaust retry",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () => events.some((event) => event.type === "turn.completed"),
                "Pi retry exhaustion did not settle.",
              ),
            );
            yield* Effect.sleep("50 millis");
            const sessions = yield* adapter.listSessions();
            yield* adapter.stopSession(threadId);
            yield* Fiber.interrupt(eventsFiber);
            return { sessions, turn };
          }).pipe(Effect.provide(layer)),
        ),
      );

      const terminals = events.filter(
        (event) => event.type === "turn.completed" || event.type === "turn.aborted",
      );
      expect(requestCount).toBe(2);
      expect(terminals).toHaveLength(1);
      expect(terminals[0]).toMatchObject({
        type: "turn.completed",
        turnId: result.turn.turnId,
        payload: { state: "failed", stopReason: "error" },
      });
      expect(
        events.filter(
          (event) => event.type === "turn.started" && event.turnId === result.turn.turnId,
        ),
      ).toHaveLength(1);
      expect(result.sessions).toContainEqual(expect.objectContaining({ status: "ready" }));
      expect(result.sessions[0]).not.toHaveProperty("activeTurnId");
    } finally {
      vi.restoreAllMocks();
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("settles once when a user aborts during Pi retry backoff", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-agent-auto-retry-abort-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000046");
    mkdirSync(agentDir, { recursive: true });
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model" }],
          },
        },
      }),
    );
    writeFileSync(
      path.join(agentDir, "auth.json"),
      JSON.stringify({ local: { type: "api_key", key: "test-key" } }),
    );
    writeFileSync(
      path.join(agentDir, "settings.json"),
      JSON.stringify({ retry: { enabled: true, maxRetries: 3, baseDelayMs: 10_000 } }),
    );
    let requestCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      requestCount += 1;
      return piRetryableResponse();
    });

    try {
      const events: Array<ProviderRuntimeEvent> = [];
      const layer = makeOmniMindAgentAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const adapter = yield* OmniMindAgentAdapter;
            const eventsFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
              Effect.sync(() => events.push(event)),
            ).pipe(Effect.forkChild);
            yield* adapter.startSession({
              provider: "omnimind",
              threadId,
              cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const turn = yield* adapter.sendTurn({
              threadId,
              input: "cancel retry",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () => events.some(isPiAutoRetryWarning),
                "Pi retry backoff did not begin.",
              ),
            );
            yield* adapter.interruptTurn(threadId, turn.turnId);
            yield* Effect.promise(() =>
              waitForTestCondition(
                () => events.some((event) => event.type === "turn.completed"),
                "Pi retry cancellation did not settle.",
              ),
            );
            yield* Effect.sleep("50 millis");
            const sessions = yield* adapter.listSessions();
            yield* adapter.stopSession(threadId);
            yield* Fiber.interrupt(eventsFiber);
            return { sessions, turn };
          }).pipe(Effect.provide(layer)),
        ),
      );

      const terminals = events.filter(
        (event) => event.type === "turn.completed" || event.type === "turn.aborted",
      );
      expect(requestCount).toBe(1);
      expect(terminals).toHaveLength(1);
      expect(terminals[0]).toMatchObject({
        type: "turn.completed",
        turnId: result.turn.turnId,
        payload: { state: "cancelled", stopReason: "cancelled" },
      });
      expect(
        events.filter(
          (event) => event.type === "turn.started" && event.turnId === result.turn.turnId,
        ),
      ).toHaveLength(1);
      expect(result.sessions).toContainEqual(expect.objectContaining({ status: "ready" }));
      expect(result.sessions[0]).not.toHaveProperty("activeTurnId");
    } finally {
      vi.restoreAllMocks();
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("preserves the exact extension catalog without synthesizing Anthropic models", async () => {
    const agentDir = mkdtempSync(path.join(tmpdir(), "omnimind-pi-anthropic-"));
    const modelsPath = path.join(agentDir, "models.json");
    const authPath = path.join(agentDir, "auth.json");

    try {
      writeFileSync(modelsPath, "{}");
      writeFileSync(
        authPath,
        JSON.stringify({
          anthropic: {
            type: "oauth",
            access: "tok",
            refresh: "ref",
            expires: Date.now() + 60_000,
          },
        }),
      );
      const modelRuntime = await ModelRuntime.create({
        authPath,
        modelsPath,
        allowModelNetwork: false,
      });
      const registry = new ModelRegistry(modelRuntime);
      registry.registerProvider("anthropic", {
        baseUrl: "https://api.anthropic.com",
        api: "anthropic-messages",
        apiKey: "test-key",
        models: [
          {
            id: "claude-opus-4-7",
            name: "Claude Opus 4.7",
            api: "anthropic-messages",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
            contextWindow: 1_000_000,
            maxTokens: 128_000,
          },
        ],
      });

      expect(
        registry
          .getAll()
          .filter((model) => model.provider === "anthropic")
          .map((model) => model.id),
      ).toEqual(["claude-opus-4-7"]);
      const models = getPiDiscoverableModels(registry);

      expect(
        models.filter((model) => model.provider === "anthropic").map((model) => model.id),
      ).toEqual(["claude-opus-4-7"]);
    } finally {
      rmSync(agentDir, { recursive: true, force: true });
    }
  });
});

describe("findModelInRegistry", () => {
  const makeModel = (provider: string, id: string) =>
    ({ provider, id, name: id, api: "openai-completions" }) as Model<Api>;

  it("accepts only exact qualified models and never fabricates provider peers", () => {
    const existing = makeModel("openai", "gpt-existing");
    const registry = {
      find: (provider: string, id: string) =>
        provider === existing.provider && id === existing.id ? existing : undefined,
      getAll: () => [existing],
      getAvailable: () => [existing],
    };

    expect(findModelInRegistry(registry, "openai/gpt-existing")).toBe(existing);
    expect(findModelInRegistry(registry, "openai/made-up")).toBeUndefined();
  });

  it("rejects an ambiguous legacy unqualified model id", () => {
    const first = makeModel("provider-a", "shared-model");
    const second = makeModel("provider-b", "shared-model");
    const registry = {
      find: () => undefined,
      getAll: () => [first, second],
      getAvailable: () => [first, second],
    };

    expect(findModelInRegistry(registry, "shared-model")).toBeUndefined();
  });
});

describe("getPiSupportedThinkingOptions", () => {
  it("hides thinking controls for non-reasoning models", () => {
    expect(getPiSupportedThinkingOptions(makePiModel({ reasoning: false }))).toEqual([]);
  });

  it("advertises xhigh and max only when the concrete Pi model supports them", () => {
    const withoutExtended = getPiSupportedThinkingOptions(makePiModel({ reasoning: true }));
    const withXHigh = getPiSupportedThinkingOptions(
      makePiModel({ reasoning: true, thinkingLevelMap: { xhigh: "xhigh" } }),
    );
    const withMax = getPiSupportedThinkingOptions(
      makePiModel({ reasoning: true, thinkingLevelMap: { max: "max" } }),
    );

    expect(withoutExtended.map((option) => option.value)).toEqual([
      "off",
      "minimal",
      "low",
      "medium",
      "high",
    ]);
    expect(withXHigh.map((option) => option.value)).toEqual([
      "off",
      "minimal",
      "low",
      "medium",
      "high",
      "xhigh",
    ]);
    expect(withMax.map((option) => option.value)).toEqual([
      "off",
      "minimal",
      "low",
      "medium",
      "high",
      "max",
    ]);
  });

  it("respects provider-level disabled thinking levels", () => {
    const options = getPiSupportedThinkingOptions(
      makePiModel({
        reasoning: true,
        thinkingLevelMap: {
          off: null,
          minimal: "low",
          low: "low",
          medium: "medium",
          high: "high",
        },
      }),
    );

    expect(options.map((option) => option.value)).toEqual(["minimal", "low", "medium", "high"]);
  });

  it("preserves kimi-k3 style ladders that expose low, high, and max", () => {
    const options = getPiSupportedThinkingOptions(
      makePiModel({
        reasoning: true,
        thinkingLevelMap: {
          off: null,
          minimal: null,
          low: "low",
          medium: null,
          high: "high",
          xhigh: null,
          max: "max",
        },
      }),
    );

    expect(options.map((option) => option.value)).toEqual(["low", "high", "max"]);
  });
});

describe("Pi extension UI helpers", () => {
  it("stamps events from the lifecycle generation captured by the session context", () => {
    const eventBase = makePiRuntimeEventBase({
      lifecycleGeneration: "generation-pi-7",
      session: { threadId: "thread-pi" as never },
      activeTurnId: "turn-pi" as never,
    });

    expect(eventBase).toMatchObject({
      provider: "pi",
      threadId: "thread-pi",
      turnId: "turn-pi",
      lifecycleGeneration: "generation-pi-7",
    });
  });

  it("keeps original select values while showing normalized unique labels", () => {
    const mappings = makePiUserInputOptions(["  OpenRouter  ", "", "OpenRouter"]);

    expect(mappings.map((mapping) => mapping.value)).toEqual(["  OpenRouter  ", "", "OpenRouter"]);
    expect(mappings.map((mapping) => mapping.option.label)).toEqual([
      "OpenRouter",
      "Option 2",
      "OpenRouter (2)",
    ]);
  });

  it("provides a no-color theme object for UI-gated extensions", () => {
    expect(PLAIN_PI_EXTENSION_THEME.fg("accent", "ready")).toBe("ready");
    expect(PLAIN_PI_EXTENSION_THEME.bold("done")).toBe("done");
    expect(PLAIN_PI_EXTENSION_THEME.getThinkingBorderColor("medium")("thinking")).toBe("thinking");
  });
});
