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
import { Cause, Effect, Fiber, Layer, Stream } from "effect";
import { describe, expect, it, vi } from "vitest";
import { ServerConfig } from "../../config.ts";
import { OmniMindAgentAdapter } from "../Services/OmniMindAgentAdapter.ts";
import { PiAdapter } from "../Services/PiAdapter.ts";
import { publishOmniMindModelRuntimeMutation } from "../omnimindModelRuntimeMutation.ts";
import {
  buildOmniMindTaskListTool,
  decodeOmniMindTaskListUpdate,
  makeOmniMindTaskListExtension,
} from "../omnimindTaskListExtension.ts";
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
  makeOmniMindEngineSystemPrompt,
  makePiRuntimeEventBase,
  makePiUserInputOptions,
  makePiAdapterLive,
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

  it("keeps Todo guidance out of the immutable engine contract", () => {
    const omniMindPrompt = makeOmniMindEngineSystemPrompt({
      workSurface: "agent",
    });
    const stockPiPrompt = makePiHostSystemPrompt({
      provider: "pi",
      gatewayControlAvailable: true,
    });

    expect(omniMindPrompt).not.toContain("<omnimind_agent_task_policy>");
    expect(omniMindPrompt).not.toContain("omnimind_update_tasks");
    expect(stockPiPrompt).not.toContain("<omnimind_agent_task_policy>");
    expect(stockPiPrompt).not.toContain("omnimind_update_tasks");
  });

  it("keeps OmniMind identity immutable while selecting distinct Chat and Agent contracts", () => {
    const chatPrompt = makeOmniMindEngineSystemPrompt({
      workSurface: "chat",
    });
    const agentPrompt = makeOmniMindEngineSystemPrompt({
      workSurface: "agent",
    });
    const identity =
      "You are OmniMind, created by πAI-Lab at the International Academy of Phronesis Medicine (Guangdong).";

    expect(chatPrompt).toContain(identity);
    expect(agentPrompt).toContain(identity);
    expect(chatPrompt).toContain("In Chat, help the user understand, explore, decide, learn");
    expect(chatPrompt).toContain("suggest Send to Agent");
    expect(chatPrompt).not.toContain("<omnimind_agent_task_policy>");
    expect(agentPrompt).toContain("Before substantive execution");
    expect(agentPrompt).toContain("no unresolved ambiguity would materially change the result");
    expect(agentPrompt).not.toContain("<omnimind_agent_task_policy>");
    expect(agentPrompt).not.toContain("In Chat, help the user");
    expect(agentPrompt).toContain(
      "Honor explicit user preferences for language, tone, format, level of detail, and working style",
    );
  });

  it("keeps general Host tool guidance outside the immutable engine contract", () => {
    const hostPrompt = makePiHostSystemPrompt({
      provider: "omnimind",
      gatewayControlAvailable: true,
    });
    const enginePrompt = makeOmniMindEngineSystemPrompt({ workSurface: "agent" });

    expect(hostPrompt).toContain("BrowserDownloadApprovalRequired");
    expect(hostPrompt).toContain("Device mutations such as");
    expect(enginePrompt).not.toContain("BrowserDownloadApprovalRequired");
    expect(enginePrompt).not.toContain("Device mutations such as");
    expect(enginePrompt).not.toContain("<omnimind_host_context>");
  });

  it("does not give stock Pi the OmniMind identity or work-surface contract", () => {
    const prompt = makePiHostSystemPrompt({
      provider: "pi",
      gatewayControlAvailable: false,
    });

    expect(prompt).not.toContain("You are OmniMind");
    expect(prompt).not.toContain("In Chat,");
    expect(prompt).not.toContain("In Agent,");
  });

  it("normalizes one bounded OmniMind task projection and rejects competing current tasks", async () => {
    expect(
      decodeOmniMindTaskListUpdate({
        explanation: "  Intake reconciled  ",
        tasks: [
          { task: "  Inspect source  ", status: "completed" },
          { task: "Implement candidate", status: "in_progress" },
          { task: "Verify result", status: "pending" },
        ],
      }),
    ).toEqual({
      explanation: "Intake reconciled",
      tasks: [
        { task: "Inspect source", status: "completed" },
        { task: "Implement candidate", status: "inProgress" },
        { task: "Verify result", status: "pending" },
      ],
    });
    expect(
      decodeOmniMindTaskListUpdate({
        tasks: [
          { task: "First", status: "in_progress" },
          { task: "Second", status: "in_progress" },
        ],
      }),
    ).toBeNull();
    expect(decodeOmniMindTaskListUpdate({ tasks: [] })).toBeNull();
    expect(
      decodeOmniMindTaskListUpdate({ tasks: [{ task: "Invalid", status: "abandoned" }] }),
    ).toBeNull();

    const tool = buildOmniMindTaskListTool({ defineTool: (definition) => definition });
    expect(tool.name).toBe("omnimind_update_tasks");
    expect(tool.promptGuidelines).toEqual([
      "Track user goals and meaningful outcomes when progress visibility helps; investigate first when needed, and never list internal tool or loading steps.",
    ]);
    const openAiFunctionEnvelope = {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
    expect(Buffer.byteLength(JSON.stringify(openAiFunctionEnvelope), "utf8")).toBeLessThan(1_024);
    expect(Buffer.byteLength(JSON.stringify(tool.promptGuidelines), "utf8")).toBeLessThan(256);
    await expect(
      tool.execute(
        "task-call",
        { tasks: [{ task: "Finish", status: "completed" }] },
        undefined,
        undefined,
        {} as never,
      ),
    ).resolves.toMatchObject({
      details: { tasks: [{ task: "Finish", status: "completed" }] },
    });
  });

  it("projects only result details created by the product Todo Extension instance", async () => {
    const projected: unknown[] = [];
    let tool: any;
    let onExecutionEnd: ((event: any) => void) | undefined;
    const extension = makeOmniMindTaskListExtension({
      defineTool: (definition) => definition,
      onTasksUpdated: (update) => projected.push(update),
    });
    expect(typeof extension).not.toBe("function");
    if (typeof extension === "function") throw new Error("expected a named inline Extension");
    await extension.factory({
      registerTool: (definition: unknown) => {
        tool = definition;
      },
      on: (event: string, handler: (value: any) => void) => {
        if (event === "tool_execution_end") onExecutionEnd = handler;
      },
    } as never);

    onExecutionEnd?.({
      type: "tool_execution_end",
      toolCallId: "forged",
      toolName: "omnimind_update_tasks",
      isError: false,
      result: { details: { tasks: [{ task: "Forged", status: "completed" }] } },
    });
    expect(projected).toEqual([]);

    const result = await tool.execute(
      "trusted",
      { tasks: [{ task: "Verified outcome", status: "completed" }] },
      undefined,
      undefined,
      {} as never,
    );
    onExecutionEnd?.({
      type: "tool_execution_end",
      toolCallId: "trusted",
      toolName: "omnimind_update_tasks",
      isError: false,
      result,
    });
    expect(projected).toEqual([
      {
        toolCallId: "trusted",
        payload: { tasks: [{ task: "Verified outcome", status: "completed" }] },
      },
    ]);

    onExecutionEnd?.({
      type: "tool_execution_end",
      toolCallId: "replayed",
      toolName: "omnimind_update_tasks",
      isError: false,
      result,
    });
    expect(projected).toHaveLength(1);
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

function piOpenAiTaskToolCallResponse() {
  return new Response(
    [
      `data: ${JSON.stringify({
        id: "chatcmpl-task",
        object: "chat.completion.chunk",
        created: 1,
        model: "safe-model",
        choices: [
          {
            index: 0,
            delta: {
              role: "assistant",
              tool_calls: [
                {
                  index: 0,
                  id: "call-task-list",
                  type: "function",
                  function: {
                    name: "omnimind_update_tasks",
                    arguments: JSON.stringify({
                      explanation: "Tracking the requested work",
                      tasks: [
                        { task: "Inspect the source", status: "completed" },
                        { task: "Verify the result", status: "in_progress" },
                      ],
                    }),
                  },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      })}`,
      `data: ${JSON.stringify({
        id: "chatcmpl-task",
        object: "chat.completion.chunk",
        created: 1,
        model: "safe-model",
        choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
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

function piContextOverflowResponse() {
  return Response.json(
    {
      error: {
        message: "Input exceeds the context window of this model",
        type: "invalid_request_error",
        code: "context_length_exceeded",
      },
    },
    { status: 400 },
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

function isOmniMindTaskUnavailableWarning(event: ProviderRuntimeEvent) {
  if (event.type !== "runtime.warning") return false;
  const detail = event.payload.detail;
  return (
    typeof detail === "object" &&
    detail !== null &&
    "capability" in detail &&
    detail.capability === "turn-task-projection" &&
    "availability" in detail &&
    detail.availability === "unavailable"
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
              workSurface: "agent",
              projectContextRoot: cwd,
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

  it("keeps passive OmniMind discovery global-only and does not execute Project extensions", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-untrusted-discovery-"));
    const cwd = path.join(serverRoot, "workspace");
    mkdirSync(path.join(serverRoot, "agent"), { recursive: true });
    mkdirSync(path.join(cwd, ".omnimind", "skills", "project-skill"), { recursive: true });
    mkdirSync(path.join(cwd, ".omnimind", "prompts"), { recursive: true });
    mkdirSync(path.join(cwd, ".omnimind", "extensions"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".omnimind", "skills", "project-skill", "SKILL.md"),
      "---\nname: project-skill\ndescription: Project-only skill\n---\n",
    );
    writeFileSync(
      path.join(cwd, ".omnimind", "prompts", "project-review.md"),
      "---\ndescription: Project-only prompt\n---\nReview this project.",
    );
    writeFileSync(
      path.join(cwd, ".omnimind", "extensions", "must-not-run.ts"),
      'throw new Error("passive discovery executed a Project extension");\n',
    );

    try {
      const layer = makeOmniMindAgentAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const adapter = yield* OmniMindAgentAdapter;
            const models = yield* adapter.listModels!({ provider: "omnimind", cwd });
            const skills = yield* adapter.listSkills!({ provider: "omnimind", cwd });
            const commands = yield* adapter.listCommands!({ provider: "omnimind", cwd });
            return { commands, models, skills };
          }).pipe(Effect.provide(layer)),
        ),
      );

      expect(result.skills.skills.map((skill) => skill.name)).not.toContain("project-skill");
      expect(result.commands.commands.map((command) => command.name)).not.toContain(
        "project-review",
      );
      expect(result.commands.commands.map((command) => command.name)).not.toContain(
        "skill:project-skill",
      );
      expect(result.models.models).toBeDefined();
    } finally {
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("keeps the final request identity immutable and excludes Agent task behavior from Chat and stock Pi", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-final-prompt-contract-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const agentThreadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000061");
    const chatThreadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000062");
    const stockThreadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000063");
    const identity =
      "You are OmniMind, created by πAI-Lab at the International Academy of Phronesis Medicine (Guangdong).";
    const immutableAgentPrompt = makeOmniMindEngineSystemPrompt({
      workSurface: "agent",
    });
    mkdirSync(path.join(cwd, ".omnimind", "extensions"), { recursive: true });
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(
      path.join(cwd, ".omnimind", "extensions", "replace-system-prompt.ts"),
      [
        "export default function setup(pi) {",
        '  pi.on("before_agent_start", () => ({',
        `    systemPrompt: ${JSON.stringify(`project extension replacement\n\n${immutableAgentPrompt}`)},`,
        "  }));",
        "}",
      ].join("\n"),
    );
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model", contextWindow: 128_000, maxTokens: 16_384 }],
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
      JSON.stringify({ retry: { enabled: false } }),
    );
    const requestBodies: any[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (request, init) => {
      if (request instanceof Request) {
        requestBodies.push(await request.clone().json());
      } else if (typeof init?.body === "string") {
        requestBodies.push(JSON.parse(init.body));
      }
      return piOpenAiSuccessResponse();
    });

    const waitForTurn = (events: ReadonlyArray<ProviderRuntimeEvent>, turnId: string) =>
      waitForTestCondition(
        () => events.some((event) => event.type === "turn.completed" && event.turnId === turnId),
        `Turn '${turnId}' did not settle.`,
      );
    try {
      const omniLayer = makeOmniMindAgentAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const adapter = yield* OmniMindAgentAdapter;
            const events: ProviderRuntimeEvent[] = [];
            const eventsFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
              Effect.sync(() => events.push(event)),
            ).pipe(Effect.forkChild);
            const agentSession = yield* adapter.startSession({
              provider: "omnimind",
              threadId: agentThreadId,
              cwd,
              workSurface: "agent",
              projectContextRoot: cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const firstAgentTurn = yield* adapter.sendTurn({
              threadId: agentThreadId,
              input: "first Agent turn",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() => waitForTurn(events, firstAgentTurn.turnId));
            yield* adapter.reloadSessionResources!(agentThreadId);
            const secondAgentTurn = yield* adapter.sendTurn({
              threadId: agentThreadId,
              input: "second Agent turn after reload",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() => waitForTurn(events, secondAgentTurn.turnId));
            yield* adapter.rollbackThread(agentThreadId, 1);
            const thirdAgentTurn = yield* adapter.sendTurn({
              threadId: agentThreadId,
              input: "third Agent turn after branch rollback",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() => waitForTurn(events, thirdAgentTurn.turnId));
            yield* adapter.stopSession(agentThreadId);

            yield* adapter.startSession({
              provider: "omnimind",
              threadId: agentThreadId,
              cwd,
              workSurface: "agent",
              projectContextRoot: cwd,
              ...(agentSession.resumeCursor === undefined
                ? {}
                : { resumeCursor: agentSession.resumeCursor }),
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const resumedAgentTurn = yield* adapter.sendTurn({
              threadId: agentThreadId,
              input: "fourth Agent turn after resume",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() => waitForTurn(events, resumedAgentTurn.turnId));
            yield* adapter.stopSession(agentThreadId);

            yield* adapter.startSession({
              provider: "omnimind",
              threadId: chatThreadId,
              cwd,
              workSurface: "chat",
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const chatTurn = yield* adapter.sendTurn({
              threadId: chatThreadId,
              input: "Chat turn",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() => waitForTurn(events, chatTurn.turnId));
            yield* adapter.stopSession(chatThreadId);
            yield* Fiber.interrupt(eventsFiber);
          }).pipe(Effect.provide(omniLayer)),
        ),
      );

      const stockLayer = makePiAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const adapter = yield* PiAdapter;
            const events: ProviderRuntimeEvent[] = [];
            const eventsFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
              Effect.sync(() => events.push(event)),
            ).pipe(Effect.forkChild);
            yield* adapter.startSession({
              provider: "pi",
              threadId: stockThreadId,
              cwd,
              providerOptions: { pi: { agentDir } },
              modelSelection: { provider: "pi", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const turn = yield* adapter.sendTurn({
              threadId: stockThreadId,
              input: "stock Pi turn",
              attachments: [],
              modelSelection: { provider: "pi", model: "local/safe-model" },
            });
            yield* Effect.promise(() => waitForTurn(events, turn.turnId));
            yield* adapter.stopSession(stockThreadId);
            yield* Fiber.interrupt(eventsFiber);
          }).pipe(Effect.provide(stockLayer)),
        ),
      );

      expect(requestBodies).toHaveLength(6);
      const systemPrompt = (body: any) =>
        body.messages?.find((message: any) => message.role === "system")?.content ?? "";
      const toolNames = (body: any) =>
        (body.tools ?? []).map((tool: any) => tool.function?.name ?? tool.name);
      for (const body of requestBodies.slice(0, 4)) {
        const prompt = systemPrompt(body);
        expect(prompt).toContain("project extension replacement");
        expect(prompt).not.toContain("<omnimind_agent_task_policy>");
        expect(prompt.split(identity)).toHaveLength(2);
        expect(prompt.split("<omnimind_engine_contract>")).toHaveLength(2);
        expect(prompt).not.toContain("<omnimind_host_context>");
        expect(toolNames(body)).toContain("omnimind_update_tasks");
        const taskTool = (body.tools ?? []).find(
          (tool: any) => (tool.function?.name ?? tool.name) === "omnimind_update_tasks",
        );
        expect(taskTool?.function?.description ?? taskTool?.description).toContain("task snapshot");
        expect(JSON.stringify(taskTool)).not.toContain("loader");
        expect(JSON.stringify(taskTool)).not.toContain("activation");
      }
      const chatPrompt = systemPrompt(requestBodies[4]);
      expect(chatPrompt).toContain(identity);
      expect(chatPrompt).toContain("In Chat, help the user understand, explore, decide, learn");
      expect(chatPrompt).not.toContain("project extension replacement");
      expect(chatPrompt).not.toContain("<omnimind_agent_task_policy>");
      expect(toolNames(requestBodies[4])).not.toContain("omnimind_update_tasks");
      expect(systemPrompt(requestBodies[5])).not.toContain(identity);
      expect(toolNames(requestBodies[5])).not.toContain("omnimind_update_tasks");
    } finally {
      vi.restoreAllMocks();
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when Product admission omits or contradicts the OmniMind work surface", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-work-surface-admission-"));
    const cwd = path.join(serverRoot, "workspace");
    const otherRoot = path.join(serverRoot, "other-project");
    mkdirSync(path.join(serverRoot, "agent"), { recursive: true });
    mkdirSync(cwd, { recursive: true });
    mkdirSync(otherRoot, { recursive: true });

    try {
      const layer = makeOmniMindAgentAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const adapter = yield* OmniMindAgentAdapter;
            const missingSurface = yield* Effect.exit(
              adapter.startSession({
                provider: "omnimind",
                threadId: ThreadId.makeUnsafe("omnimind-missing-surface"),
                cwd,
                runtimeMode: "full-access",
              }),
            );
            const missingRoot = yield* Effect.exit(
              adapter.startSession({
                provider: "omnimind",
                threadId: ThreadId.makeUnsafe("omnimind-missing-root"),
                cwd,
                workSurface: "agent",
                runtimeMode: "full-access",
              }),
            );
            const chatWithRoot = yield* Effect.exit(
              adapter.startSession({
                provider: "omnimind",
                threadId: ThreadId.makeUnsafe("omnimind-chat-with-root"),
                cwd,
                workSurface: "chat",
                projectContextRoot: cwd,
                runtimeMode: "full-access",
              }),
            );
            const cwdOutsideRoot = yield* Effect.exit(
              adapter.startSession({
                provider: "omnimind",
                threadId: ThreadId.makeUnsafe("omnimind-cwd-outside-root"),
                cwd,
                workSurface: "agent",
                projectContextRoot: otherRoot,
                runtimeMode: "full-access",
              }),
            );
            return { chatWithRoot, cwdOutsideRoot, missingRoot, missingSurface };
          }).pipe(Effect.provide(layer)),
        ),
      );

      expect(result.missingSurface._tag).toBe("Failure");
      expect(result.missingRoot._tag).toBe("Failure");
      expect(result.chatWithRoot._tag).toBe("Failure");
      expect(result.cwdOutsideRoot._tag).toBe("Failure");
      if (
        result.missingSurface._tag === "Failure" &&
        result.missingRoot._tag === "Failure" &&
        result.chatWithRoot._tag === "Failure" &&
        result.cwdOutsideRoot._tag === "Failure"
      ) {
        expect(Cause.pretty(result.missingSurface.cause)).toContain("work surface is missing");
        expect(Cause.pretty(result.missingRoot.cause)).toContain("canonical Project context root");
        expect(Cause.pretty(result.chatWithRoot.cause)).toContain(
          "Chat cannot receive a Project context root",
        );
        expect(Cause.pretty(result.cwdOutsideRoot.cause)).toContain(
          "working directory is outside its canonical Project context root",
        );
      }
    } finally {
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("does not project a Chat Extension's same-named tool as the Agent task authority", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-chat-task-name-collision-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000064");
    mkdirSync(path.join(agentDir, "extensions"), { recursive: true });
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      path.join(agentDir, "extensions", "same-named-task-tool.ts"),
      [
        'import { Type } from "typebox";',
        "export default function setup(pi) {",
        "  pi.registerTool({",
        '    name: "omnimind_update_tasks",',
        '    label: "Third-party same-name tool",',
        '    description: "A third-party tool that does not own OmniMind Agent tasks.",',
        "    parameters: Type.Object({}),",
        '    execute: async () => ({ content: [{ type: "text", text: "extension result" }] }),',
        "  });",
        "}",
      ].join("\n"),
    );
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model", contextWindow: 128_000, maxTokens: 16_384 }],
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
      JSON.stringify({ retry: { enabled: false } }),
    );
    let requestCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      requestCount += 1;
      return requestCount === 1
        ? piOpenAiTaskToolCallResponse()
        : piOpenAiSuccessResponse("Chat extension tool completed.");
    });

    try {
      const events: ProviderRuntimeEvent[] = [];
      const layer = makeOmniMindAgentAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      const turn = await Effect.runPromise(
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
              workSurface: "chat",
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const sent = yield* adapter.sendTurn({
              threadId,
              input: "Use the available extension tool.",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) => event.type === "turn.completed" && event.turnId === sent.turnId,
                  ),
                "The Chat extension-tool turn did not settle.",
              ),
            );
            yield* adapter.stopSession(threadId);
            yield* Fiber.interrupt(eventsFiber);
            return sent;
          }).pipe(Effect.provide(layer)),
        ),
      );

      expect(requestCount).toBe(2);
      expect(
        events.some(
          (event) =>
            event.type === "item.completed" &&
            event.turnId === turn.turnId &&
            event.payload.itemType === "dynamic_tool_call",
        ),
      ).toBe(true);
      expect(
        events.some((event) => event.type === "turn.tasks.updated" && event.turnId === turn.turnId),
      ).toBe(false);
      expect(events.some(isOmniMindTaskUnavailableWarning)).toBe(false);
    } finally {
      vi.restoreAllMocks();
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("keeps the Agent usable but disables Product Todo projection on same-name global/project Extensions", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-agent-task-name-collision-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000065");
    mkdirSync(path.join(cwd, ".omnimind", "extensions"), { recursive: true });
    mkdirSync(path.join(agentDir, "extensions"), { recursive: true });
    writeFileSync(
      path.join(agentDir, "extensions", "same-named-task-tool.ts"),
      [
        'import { Type } from "typebox";',
        "export default function setup(pi) {",
        "  pi.registerTool({",
        '    name: "omnimind_update_tasks",',
        '    label: "Global same-name tool",',
        '    description: "Must remain a normal global Extension tool.",',
        "    parameters: Type.Object({}),",
        '    execute: async () => ({ content: [{ type: "text", text: "global result" }] }),',
        "  });",
        "}",
      ].join("\n"),
    );
    writeFileSync(
      path.join(cwd, ".omnimind", "extensions", "same-named-task-tool.ts"),
      [
        'import { Type } from "typebox";',
        "export default function setup(pi) {",
        "  pi.registerTool({",
        '    name: "omnimind_update_tasks",',
        '    label: "Project same-name tool",',
        '    description: "Must not acquire Product Todo authority.",',
        "    parameters: Type.Object({}),",
        '    execute: async () => ({ content: [{ type: "text", text: "project result" }] }),',
        "  });",
        "}",
      ].join("\n"),
    );
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model", contextWindow: 128_000, maxTokens: 16_384 }],
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
      JSON.stringify({ retry: { enabled: false } }),
    );
    let requestCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      requestCount += 1;
      return requestCount === 1
        ? piOpenAiTaskToolCallResponse()
        : piOpenAiSuccessResponse("Project Extension tool completed.");
    });

    try {
      const events: ProviderRuntimeEvent[] = [];
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
              workSurface: "agent",
              projectContextRoot: cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const turn = yield* adapter.sendTurn({
              threadId,
              input: "Use the selected project tool.",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) => event.type === "turn.completed" && event.turnId === turn.turnId,
                  ),
                "The same-name project Extension turn did not settle.",
              ),
            );
            const exists = yield* adapter.hasSession(threadId);
            yield* adapter.stopSession(threadId);
            yield* Fiber.interrupt(eventsFiber);
            return { exists, turn };
          }).pipe(Effect.provide(layer)),
        ),
      );

      expect(requestCount).toBe(2);
      expect(result.exists).toBe(true);
      expect(events.filter(isOmniMindTaskUnavailableWarning)).toHaveLength(1);
      expect(
        events.some(
          (event) => event.type === "turn.tasks.updated" && event.turnId === result.turn.turnId,
        ),
      ).toBe(false);
      expect(
        events.some(
          (event) =>
            event.type === "item.completed" &&
            event.turnId === result.turn.turnId &&
            event.payload.itemType === "dynamic_tool_call",
        ),
      ).toBe(true);
    } finally {
      vi.restoreAllMocks();
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("keeps the Session usable but disables Product Todo when reload introduces a collision", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-agent-task-reload-collision-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000066");
    mkdirSync(agentDir, { recursive: true });
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model", contextWindow: 128_000, maxTokens: 16_384 }],
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
      JSON.stringify({ retry: { enabled: false } }),
    );
    let requestCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      requestCount += 1;
      return requestCount === 1
        ? piOpenAiTaskToolCallResponse()
        : piOpenAiSuccessResponse("Reloaded project Extension tool completed.");
    });

    try {
      const events: ProviderRuntimeEvent[] = [];
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
              workSurface: "agent",
              projectContextRoot: cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            yield* Effect.sync(() => {
              mkdirSync(path.join(cwd, ".omnimind", "extensions"), { recursive: true });
              writeFileSync(
                path.join(cwd, ".omnimind", "extensions", "same-named-task-tool.ts"),
                [
                  'import { Type } from "typebox";',
                  "export default function setup(pi) {",
                  "  pi.registerTool({",
                  '    name: "omnimind_update_tasks",',
                  '    label: "Reload collision",',
                  '    description: "Must not close the Product Session.",',
                  "    parameters: Type.Object({}),",
                  '    execute: async () => ({ content: [{ type: "text", text: "collision" }] }),',
                  "  });",
                  "}",
                ].join("\n"),
              );
            });
            const reloaded = yield* adapter.reloadSessionResources!(threadId);
            const exists = yield* adapter.hasSession(threadId);
            const turn = yield* adapter.sendTurn({
              threadId,
              input: "Use the tool selected after reload.",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) => event.type === "turn.completed" && event.turnId === turn.turnId,
                  ),
                "The reloaded same-name Extension turn did not settle.",
              ),
            );
            yield* adapter.stopSession(threadId);
            yield* Fiber.interrupt(eventsFiber);
            return { exists, reloaded, turn };
          }).pipe(Effect.provide(layer)),
        ),
      );

      expect(requestCount).toBe(2);
      expect(result.reloaded).toBe("reloaded");
      expect(result.exists).toBe(true);
      expect(events.filter(isOmniMindTaskUnavailableWarning)).toHaveLength(1);
      expect(
        events.some(
          (event) => event.type === "turn.tasks.updated" && event.turnId === result.turn.turnId,
        ),
      ).toBe(false);
    } finally {
      vi.restoreAllMocks();
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("projects the bundled OmniMind task tool into the canonical turn task list", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-agent-task-projection-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000051");
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
      JSON.stringify({ retry: { enabled: false } }),
    );
    let requestCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      requestCount += 1;
      return requestCount === 1
        ? piOpenAiTaskToolCallResponse()
        : piOpenAiSuccessResponse("All requested work is reconciled.");
    });

    try {
      const events: Array<ProviderRuntimeEvent> = [];
      const layer = makeOmniMindAgentAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      const turn = await Effect.runPromise(
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
              workSurface: "agent",
              projectContextRoot: cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const sent = yield* adapter.sendTurn({
              threadId,
              input: "Do the multi-step request and keep every part visible.",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) => event.type === "turn.completed" && event.turnId === sent.turnId,
                  ),
                "The task-list turn did not settle.",
              ),
            );
            yield* adapter.stopSession(threadId);
            yield* Fiber.interrupt(eventsFiber);
            return sent;
          }).pipe(Effect.provide(layer)),
        ),
      );

      const taskEventIndex = events.findIndex(
        (event) => event.type === "turn.tasks.updated" && event.turnId === turn.turnId,
      );
      const terminalIndex = events.findIndex(
        (event) => event.type === "turn.completed" && event.turnId === turn.turnId,
      );
      expect(requestCount).toBe(2);
      expect(taskEventIndex).toBeGreaterThanOrEqual(0);
      expect(taskEventIndex).toBeLessThan(terminalIndex);
      expect(events[taskEventIndex]).toMatchObject({
        type: "turn.tasks.updated",
        payload: {
          explanation: "Tracking the requested work",
          tasks: [
            { task: "Inspect the source", status: "completed" },
            { task: "Verify the result", status: "inProgress" },
          ],
        },
      });
    } finally {
      vi.restoreAllMocks();
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
              workSurface: "agent",
              projectContextRoot: cwd,
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
              workSurface: "agent",
              projectContextRoot: cwd,
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
              workSurface: "agent",
              projectContextRoot: cwd,
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
              workSurface: "agent",
              projectContextRoot: cwd,
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
              workSurface: "agent",
              projectContextRoot: cwd,
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

  it("keeps one Product turn while Pi compacts an overflow and continues the prompt", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-agent-overflow-compaction-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000047");
    mkdirSync(agentDir, { recursive: true });
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model", contextWindow: 128, maxTokens: 32 }],
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
      JSON.stringify({
        retry: { enabled: false },
        compaction: { enabled: true, reserveTokens: 32, keepRecentTokens: 1 },
      }),
    );
    let requestCount = 0;
    const requestBodies: any[] = [];
    let releasePostCompaction!: () => void;
    const postCompactionGate = new Promise<void>((resolve) => {
      releasePostCompaction = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (request, init) => {
      if (request instanceof Request) {
        requestBodies.push(await request.clone().json());
      } else if (typeof init?.body === "string") {
        requestBodies.push(JSON.parse(init.body));
      }
      requestCount += 1;
      if (requestCount === 1) return piOpenAiSuccessResponse("seed response");
      if (requestCount === 2) return piContextOverflowResponse();
      if (requestCount === 4) {
        await postCompactionGate;
        return piOpenAiSuccessResponse("post-compaction success");
      }
      return piOpenAiSuccessResponse(`compaction summary ${requestCount}`);
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
              workSurface: "agent",
              projectContextRoot: cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const seed = yield* adapter.sendTurn({
              threadId,
              input: "seed enough history for overflow recovery",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) => event.type === "turn.completed" && event.turnId === seed.turnId,
                  ),
                "The seed turn did not settle.",
              ),
            );
            const turn = yield* adapter.sendTurn({
              threadId,
              input: "recover this turn after context compaction",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) =>
                      event.type === "item.completed" &&
                      event.turnId === turn.turnId &&
                      event.payload.itemType === "context_compaction",
                  ),
                "Pi overflow compaction did not complete.",
              ),
            );
            const duringCompactionContinuation = yield* adapter.listSessions();
            const terminalsBeforeContinuation = events.filter(
              (event) =>
                (event.type === "turn.completed" || event.type === "turn.aborted") &&
                event.turnId === turn.turnId,
            );
            yield* Effect.sync(releasePostCompaction);
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) => event.type === "turn.completed" && event.turnId === turn.turnId,
                  ),
                "The post-compaction continuation did not settle.",
              ),
            );
            yield* Effect.sleep("50 millis");
            yield* adapter.stopSession(threadId);
            yield* Fiber.interrupt(eventsFiber);
            return { duringCompactionContinuation, terminalsBeforeContinuation, turn };
          }).pipe(Effect.provide(layer)),
        ),
      );

      const turnEvents = events.filter((event) => event.turnId === result.turn.turnId);
      const terminals = turnEvents.filter(
        (event) => event.type === "turn.completed" || event.type === "turn.aborted",
      );
      expect(requestCount).toBe(4);
      expect(requestBodies).toHaveLength(4);
      const finalContinuationPrompt =
        requestBodies[3]?.messages?.find((message: any) => message.role === "system")?.content ??
        "";
      expect(
        finalContinuationPrompt.split(
          "You are OmniMind, created by πAI-Lab at the International Academy of Phronesis Medicine (Guangdong).",
        ),
      ).toHaveLength(2);
      expect(finalContinuationPrompt.split("<omnimind_host_context>")).toHaveLength(2);
      expect(result.terminalsBeforeContinuation).toEqual([]);
      expect(result.duringCompactionContinuation).toContainEqual(
        expect.objectContaining({ activeTurnId: result.turn.turnId, status: "running" }),
      );
      expect(turnEvents.filter((event) => event.type === "turn.started")).toHaveLength(1);
      expect(terminals).toHaveLength(1);
      expect(terminals[0]).toMatchObject({
        type: "turn.completed",
        turnId: result.turn.turnId,
        payload: { state: "completed" },
      });
      expect(
        turnEvents.filter(
          (event) =>
            event.type === "content.delta" &&
            event.payload.streamKind === "assistant_text" &&
            event.payload.delta.includes("post-compaction success"),
        ),
      ).toHaveLength(1);
    } finally {
      releasePostCompaction();
      vi.restoreAllMocks();
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("settles loaded no-Agent extension command and input outcomes exactly once", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "omnimind-agent-command-outcome-"));
    const agentDir = path.join(serverRoot, "agent");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000048");
    mkdirSync(agentDir, { recursive: true });
    mkdirSync(cwd, { recursive: true });
    mkdirSync(path.join(agentDir, "extensions"), { recursive: true });
    writeFileSync(
      path.join(agentDir, "extensions", "noop.ts"),
      [
        "export default function setup(pi) {",
        '  pi.registerCommand("noop", {',
        '    description: "No Agent command",',
        "    handler: async () => {},",
        "  });",
        '  pi.registerCommand("fail", {',
        '    description: "Failing no Agent command",',
        '    handler: async () => { throw new Error("private extension diagnostic"); },',
        "  });",
        '  pi.registerCommand("agent", {',
        '    description: "Agent command",',
        '    handler: async () => { pi.sendUserMessage("from command"); },',
        "  });",
        '  pi.registerCommand("mixed", {',
        '    description: "Agent command that then fails",',
        "    handler: async () => {",
        '      pi.sendUserMessage("from failing command");',
        '      throw new Error("private mixed extension diagnostic");',
        "    },",
        "  });",
        '  pi.on("input", async (event) =>',
        '    event.text === "handled input" ? { action: "handled" } : { action: "continue" },',
        "  );",
        "}",
      ].join("\n"),
    );
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model", contextWindow: 128_000, maxTokens: 16_384 }],
          },
        },
      }),
    );
    writeFileSync(
      path.join(agentDir, "auth.json"),
      JSON.stringify({ local: { type: "api_key", key: "test-key" } }),
    );
    let releaseCommandAgentResponse!: () => void;
    const commandAgentResponseGate = new Promise<void>((resolve) => {
      releaseCommandAgentResponse = resolve;
    });
    let requestCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      requestCount += 1;
      if (requestCount === 1) await commandAgentResponseGate;
      return piOpenAiSuccessResponse("next turn response");
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
              workSurface: "agent",
              projectContextRoot: cwd,
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const requestsAfterStart = requestCount;
            const commandTurn = yield* adapter.sendTurn({
              threadId,
              input: "/noop",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) =>
                      event.type === "turn.completed" && event.turnId === commandTurn.turnId,
                  ),
                "The no-Agent extension command did not settle.",
              ),
            );
            const requestsAfterCommand = requestCount;
            const afterCommand = yield* adapter.listSessions();
            const failedCommandTurn = yield* adapter.sendTurn({
              threadId,
              input: "/fail",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) =>
                      event.type === "turn.completed" && event.turnId === failedCommandTurn.turnId,
                  ),
                "The failed no-Agent extension command did not settle.",
              ),
            );
            const handledInputTurn = yield* adapter.sendTurn({
              threadId,
              input: "handled input",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) =>
                      event.type === "turn.completed" && event.turnId === handledInputTurn.turnId,
                  ),
                "The handled input hook did not settle.",
              ),
            );
            const agentCommandTurn = yield* adapter.sendTurn({
              threadId,
              input: "/agent",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () => requestCount === requestsAfterStart + 1,
                "The Agent-triggering extension command did not start its request.",
              ),
            );
            const duringAgentCommand = yield* adapter.listSessions();
            const agentCommandTerminalsBeforeResponse = events.filter(
              (event) =>
                event.turnId === agentCommandTurn.turnId &&
                (event.type === "turn.completed" || event.type === "turn.aborted"),
            );
            yield* Effect.sync(releaseCommandAgentResponse);
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) =>
                      event.type === "turn.completed" && event.turnId === agentCommandTurn.turnId,
                  ),
                "The Agent-triggering extension command did not settle.",
              ),
            );
            const mixedCommandTurn = yield* adapter.sendTurn({
              threadId,
              input: "/mixed",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) =>
                      event.type === "turn.completed" && event.turnId === mixedCommandTurn.turnId,
                  ),
                "The mixed Agent/command failure did not settle.",
              ),
            );
            const nextTurn = yield* adapter.sendTurn({
              threadId,
              input: "ordinary next turn",
              attachments: [],
              modelSelection: { provider: "omnimind", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) => event.type === "turn.completed" && event.turnId === nextTurn.turnId,
                  ),
                "The turn after the extension command did not settle.",
              ),
            );
            yield* adapter.stopSession(threadId);
            yield* Fiber.interrupt(eventsFiber);
            return {
              afterCommand,
              agentCommandTerminalsBeforeResponse,
              agentCommandTurn,
              commandTurn,
              duringAgentCommand,
              failedCommandTurn,
              handledInputTurn,
              mixedCommandTurn,
              nextTurn,
              requestsAfterCommand,
              requestsAfterStart,
            };
          }).pipe(Effect.provide(layer)),
        ),
      );

      const commandEvents = events.filter((event) => event.turnId === result.commandTurn.turnId);
      const agentCommandEvents = events.filter(
        (event) => event.turnId === result.agentCommandTurn.turnId,
      );
      const failedCommandEvents = events.filter(
        (event) => event.turnId === result.failedCommandTurn.turnId,
      );
      const handledInputEvents = events.filter(
        (event) => event.turnId === result.handledInputTurn.turnId,
      );
      const mixedCommandEvents = events.filter(
        (event) => event.turnId === result.mixedCommandTurn.turnId,
      );
      const nextEvents = events.filter((event) => event.turnId === result.nextTurn.turnId);
      expect(result.requestsAfterCommand).toBe(result.requestsAfterStart);
      expect(requestCount).toBe(result.requestsAfterStart + 3);
      expect(result.afterCommand).toContainEqual(expect.objectContaining({ status: "ready" }));
      expect(commandEvents.filter((event) => event.type === "turn.started")).toHaveLength(1);
      expect(commandEvents.filter((event) => event.type === "turn.completed")).toEqual([
        expect.objectContaining({
          payload: expect.objectContaining({ state: "completed", stopReason: "command" }),
        }),
      ]);
      expect(failedCommandEvents.filter((event) => event.type === "turn.started")).toHaveLength(1);
      expect(failedCommandEvents.filter((event) => event.type === "turn.completed")).toEqual([
        expect.objectContaining({
          payload: expect.objectContaining({
            errorMessage: "The extension action could not be completed.",
            state: "failed",
            stopReason: "error",
          }),
        }),
      ]);
      expect(JSON.stringify(failedCommandEvents)).not.toContain("private extension diagnostic");
      expect(handledInputEvents.filter((event) => event.type === "turn.started")).toHaveLength(1);
      expect(handledInputEvents.filter((event) => event.type === "turn.completed")).toEqual([
        expect.objectContaining({
          payload: expect.objectContaining({ state: "completed", stopReason: "command" }),
        }),
      ]);
      expect(result.agentCommandTerminalsBeforeResponse).toEqual([]);
      expect(result.duringAgentCommand).toContainEqual(
        expect.objectContaining({
          activeTurnId: result.agentCommandTurn.turnId,
          status: "running",
        }),
      );
      expect(agentCommandEvents.filter((event) => event.type === "turn.started")).toHaveLength(1);
      expect(agentCommandEvents.filter((event) => event.type === "turn.completed")).toHaveLength(1);
      expect(mixedCommandEvents.filter((event) => event.type === "turn.started")).toHaveLength(1);
      expect(mixedCommandEvents.filter((event) => event.type === "turn.completed")).toEqual([
        expect.objectContaining({
          payload: expect.objectContaining({
            errorMessage: "The extension action could not be completed.",
            state: "failed",
            stopReason: "error",
          }),
        }),
      ]);
      expect(JSON.stringify(mixedCommandEvents)).not.toContain(
        "private mixed extension diagnostic",
      );
      expect(nextEvents.filter((event) => event.type === "turn.started")).toHaveLength(1);
      expect(nextEvents.filter((event) => event.type === "turn.completed")).toHaveLength(1);
    } finally {
      releaseCommandAgentResponse();
      vi.restoreAllMocks();
      rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  it("settles a stock Pi no-Agent extension command through the same typed outcome", async () => {
    const serverRoot = mkdtempSync(path.join(tmpdir(), "stock-pi-command-outcome-"));
    const agentDir = path.join(serverRoot, "pi-home");
    const cwd = path.join(serverRoot, "workspace");
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000049");
    mkdirSync(path.join(agentDir, "extensions"), { recursive: true });
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      path.join(agentDir, "extensions", "noop.ts"),
      [
        "export default function setup(pi) {",
        '  pi.registerCommand("noop", {',
        '    description: "No Agent command",',
        "    handler: async () => {},",
        "  });",
        "}",
      ].join("\n"),
    );
    writeFileSync(
      path.join(agentDir, "models.json"),
      JSON.stringify({
        providers: {
          local: {
            api: "openai-completions",
            baseUrl: "https://local-model.example.test/v1",
            models: [{ id: "safe-model", contextWindow: 128_000, maxTokens: 16_384 }],
          },
        },
      }),
    );
    writeFileSync(
      path.join(agentDir, "auth.json"),
      JSON.stringify({ local: { type: "api_key", key: "test-key" } }),
    );
    let requestCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      requestCount += 1;
      return piOpenAiSuccessResponse("next stock Pi turn response");
    });

    try {
      const events: Array<ProviderRuntimeEvent> = [];
      const layer = makePiAdapterLive().pipe(
        Layer.provideMerge(ServerConfig.layerTest(cwd, serverRoot)),
        Layer.provideMerge(NodeServices.layer),
      );
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const adapter = yield* PiAdapter;
            const eventsFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
              Effect.sync(() => events.push(event)),
            ).pipe(Effect.forkChild);
            yield* adapter.startSession({
              provider: "pi",
              threadId,
              cwd,
              providerOptions: { pi: { agentDir } },
              modelSelection: { provider: "pi", model: "local/safe-model" },
              runtimeMode: "full-access",
            });
            const commandTurn = yield* adapter.sendTurn({
              threadId,
              input: "/noop",
              attachments: [],
              modelSelection: { provider: "pi", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) =>
                      event.type === "turn.completed" && event.turnId === commandTurn.turnId,
                  ),
                "The stock Pi no-Agent command did not settle.",
              ),
            );
            const nextTurn = yield* adapter.sendTurn({
              threadId,
              input: "ordinary stock Pi turn",
              attachments: [],
              modelSelection: { provider: "pi", model: "local/safe-model" },
            });
            yield* Effect.promise(() =>
              waitForTestCondition(
                () =>
                  events.some(
                    (event) => event.type === "turn.completed" && event.turnId === nextTurn.turnId,
                  ),
                "The stock Pi turn after the command did not settle.",
              ),
            );
            yield* adapter.stopSession(threadId);
            yield* Fiber.interrupt(eventsFiber);
            return { commandTurn, nextTurn };
          }).pipe(Effect.provide(layer)),
        ),
      );

      const commandEvents = events.filter((event) => event.turnId === result.commandTurn.turnId);
      const nextEvents = events.filter((event) => event.turnId === result.nextTurn.turnId);
      expect(requestCount).toBe(1);
      expect(commandEvents.filter((event) => event.type === "turn.started")).toHaveLength(1);
      expect(commandEvents.filter((event) => event.type === "turn.completed")).toEqual([
        expect.objectContaining({
          payload: expect.objectContaining({ state: "completed", stopReason: "command" }),
        }),
      ]);
      expect(nextEvents.filter((event) => event.type === "turn.started")).toHaveLength(1);
      expect(nextEvents.filter((event) => event.type === "turn.completed")).toHaveLength(1);
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
