// FILE: piBarrierPatch.test.ts
// Purpose: Locks HarnessOS's exact Pi 0.84.3 interactive barrier semantics.
// Layer: Pinned agent-core patch conformance tests.

import { runAgentLoop, type AgentTool } from "@earendil-works/pi-agent-core";
import {
  Type,
  createAssistantMessageEventStream,
  type AssistantMessage,
  type Model,
  type Usage,
} from "@earendil-works/pi-ai";
import { describe, expect, it, vi } from "vitest";

const usage: Usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

const model: Model<any> = {
  id: "barrier-test",
  name: "Barrier test",
  api: "openai-completions",
  provider: "test",
  baseUrl: "https://example.test/v1",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 16_384,
  maxTokens: 1_024,
};

function assistant(
  content: AssistantMessage["content"],
  stopReason: "toolUse" | "stop",
): AssistantMessage {
  return {
    role: "assistant",
    api: model.api,
    provider: model.provider,
    model: model.id,
    content,
    usage,
    stopReason,
    timestamp: Date.now(),
  };
}

function streamMessages(messages: readonly AssistantMessage[]) {
  let calls = 0;
  const stream = vi.fn(() => {
    const result = createAssistantMessageEventStream();
    const message = messages[calls++];
    if (!message) throw new Error("Unexpected model continuation");
    queueMicrotask(() =>
      result.push({
        type: "done",
        reason: message.stopReason as "toolUse" | "stop" | "length" | "deferred",
        message,
      }),
    );
    return result;
  });
  return { stream, calls: () => calls };
}

function tool(
  name: string,
  executionMode: NonNullable<AgentTool["executionMode"]>,
  terminate: boolean,
  execute = vi.fn(),
) {
  return {
    name,
    label: name,
    description: name,
    parameters: Type.Object({}),
    executionMode,
    execute: vi.fn(async () => {
      execute();
      return {
        content: [{ type: "text" as const, text: `${name}:ok` }],
        details: { name },
        terminate,
      };
    }),
  } satisfies AgentTool;
}

async function run(input: {
  readonly order: readonly string[];
  readonly barrierTerminates: boolean;
  readonly includeSecondBarrier?: boolean;
}) {
  const sideEffect = vi.fn();
  const secondBarrierEffect = vi.fn();
  const ask = tool("ask_user", "barrier", input.barrierTerminates);
  const side = tool("side_effect", "parallel", false, sideEffect);
  const secondAsk = tool("ask_again", "barrier", false, secondBarrierEffect);
  const calls = input.order.map((name, index) => ({
    type: "toolCall" as const,
    id: `call-${index}`,
    name,
    arguments: {},
  }));
  if (input.includeSecondBarrier) {
    calls.push({ type: "toolCall", id: "call-second", name: "ask_again", arguments: {} });
  }
  const first = assistant(calls, "toolUse");
  const final = assistant([{ type: "text", text: "replanned" }], "stop");
  const provider = streamMessages([first, final]);
  const beforeNames: string[] = [];
  const events: any[] = [];
  const messages = await runAgentLoop(
    [{ role: "user", content: "begin", timestamp: 1 }],
    { systemPrompt: "test", messages: [], tools: [side, ask, secondAsk] },
    {
      model,
      convertToLlm: (value) => value as any,
      beforeToolCall: async ({ toolCall }) => {
        beforeNames.push(toolCall.name);
        return undefined;
      },
    },
    (event) => {
      events.push(event);
    },
    undefined,
    provider.stream,
  );
  return {
    ask,
    side,
    sideEffect,
    secondAsk,
    secondBarrierEffect,
    beforeNames,
    events,
    messages,
    provider,
  };
}

describe("Pi interactive barrier patch", () => {
  it.each([
    ["before", ["side_effect", "ask_user"]],
    ["after", ["ask_user", "side_effect"]],
  ] as const)(
    "blocks every sibling and all sibling hooks when Ask appears %s it",
    async (_label, order) => {
      const result = await run({ order, barrierTerminates: false });

      expect(result.ask.execute).toHaveBeenCalledTimes(1);
      expect(result.side.execute).not.toHaveBeenCalled();
      expect(result.sideEffect).not.toHaveBeenCalled();
      expect(result.beforeNames).toEqual(["ask_user"]);
      expect(result.provider.calls()).toBe(2);
      expect(result.messages.at(-1)).toMatchObject({ role: "assistant", stopReason: "stop" });
      expect(
        result.events.filter(
          (event) => event.type === "tool_execution_end" && event.toolName === "side_effect",
        ),
      ).toMatchObject([
        {
          isError: true,
          result: {
            terminate: true,
            details: { barrier: { status: "blocked", barrierToolCallId: expect.any(String) } },
          },
        },
      ]);
    },
  );

  it("executes only the first barrier in source order", async () => {
    const result = await run({
      order: ["ask_user", "side_effect"],
      barrierTerminates: false,
      includeSecondBarrier: true,
    });

    expect(result.ask.execute).toHaveBeenCalledTimes(1);
    expect(result.secondAsk.execute).not.toHaveBeenCalled();
    expect(result.secondBarrierEffect).not.toHaveBeenCalled();
    expect(result.beforeNames).toEqual(["ask_user"]);
  });

  it("ends the loop without a provider continuation when the barrier settles terminally", async () => {
    const result = await run({ order: ["side_effect", "ask_user"], barrierTerminates: true });

    expect(result.provider.calls()).toBe(1);
    expect(result.side.execute).not.toHaveBeenCalled();
    expect(result.messages.at(-1)).toMatchObject({ role: "toolResult", toolName: "ask_user" });
  });
});
