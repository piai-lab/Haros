// FILE: piDynamicToolWire.test.ts
// Purpose: Captures exact Pi 0.84.2 provider payloads for additive tool loading.
// Layer: Provider wire conformance tests

import { Type, type Api, type Context, type Model, type Usage } from "@earendil-works/pi-ai";
import { stream as streamAnthropic } from "@earendil-works/pi-ai/api/anthropic-messages";
import { stream as streamOpenAICompletions } from "@earendil-works/pi-ai/api/openai-completions";
import { stream as streamOpenAIResponses } from "@earendil-works/pi-ai/api/openai-responses";
import { describe, expect, it } from "vitest";

const usage: Usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

const loaderTool = {
  name: "search_tools",
  description: "Load another Host capability.",
  parameters: Type.Object({ query: Type.String() }),
};

const loadedTool = {
  name: "browser_open",
  description: "Open one browser page.",
  parameters: Type.Object({ url: Type.String() }),
};

function makeModel<TApi extends Api>(input: {
  readonly api: TApi;
  readonly provider: string;
  readonly compat?: Model<TApi>["compat"];
}): Model<TApi> {
  return {
    id: "wire-model",
    name: "Wire model",
    api: input.api,
    provider: input.provider,
    baseUrl: "https://wire.example.test/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 4_096,
    ...(input.compat === undefined ? {} : { compat: input.compat }),
  };
}

function makeLoadedToolContext(api: Api, provider: string): Context {
  return {
    systemPrompt: "Wire conformance",
    tools: [loaderTool, loadedTool],
    messages: [
      { role: "user", content: "Open a browser page", timestamp: 1 },
      {
        role: "assistant",
        api,
        provider,
        model: "wire-model",
        content: [
          {
            type: "toolCall",
            id: "call-loader",
            name: loaderTool.name,
            arguments: { query: "browser" },
          },
        ],
        usage,
        stopReason: "toolUse",
        timestamp: 2,
      },
      {
        role: "toolResult",
        toolCallId: "call-loader",
        toolName: loaderTool.name,
        content: [{ type: "text", text: "Loaded one matching Host tool." }],
        addedToolNames: [loadedTool.name],
        isError: false,
        timestamp: 3,
      },
    ],
  };
}

async function capturePayload(
  stream: AsyncIterable<unknown>,
  read: () => unknown,
): Promise<Record<string, any>> {
  for await (const _event of stream) {
    // The onPayload sentinel is converted into a terminal provider error event.
  }
  return read() as Record<string, any>;
}

describe("Pi 0.84.2 dynamic tool provider wire", () => {
  it.each([
    ["tool-search", { supportsToolSearch: true }, "tool_search_output"],
    ["additional-tools", { supportsAdditionalTools: true }, "additional_tools"],
  ] as const)(
    "encodes OpenAI Responses %s at the loader result anchor",
    async (_mode, compat, type) => {
      const model = makeModel({ api: "openai-responses", provider: "openai", compat });
      let payload: unknown;
      const captured = await capturePayload(
        streamOpenAIResponses(model, makeLoadedToolContext(model.api, model.provider), {
          apiKey: "test-key",
          onPayload: (next) => {
            payload = next;
            throw new Error("wire-captured");
          },
        }),
        () => payload,
      );

      const immediateNames = (captured.tools ?? []).map(
        (tool: any) => tool.name ?? tool.function?.name,
      );
      expect(immediateNames).toContain(loaderTool.name);
      expect(immediateNames).not.toContain(loadedTool.name);
      const anchored = (captured.input ?? []).filter((item: any) => item.type === type);
      expect(anchored).toHaveLength(1);
      expect(JSON.stringify(anchored[0])).toContain(loadedTool.name);
    },
  );

  it("encodes Anthropic native loading as a deferred definition plus tool_reference", async () => {
    const model = makeModel({
      api: "anthropic-messages",
      provider: "anthropic",
      compat: { supportsToolReferences: true },
    });
    let payload: unknown;
    const captured = await capturePayload(
      streamAnthropic(model, makeLoadedToolContext(model.api, model.provider), {
        apiKey: "test-key",
        onPayload: (next) => {
          payload = next;
          throw new Error("wire-captured");
        },
      }),
      () => payload,
    );

    const deferred = (captured.tools ?? []).find((tool: any) => tool.name === loadedTool.name);
    expect(deferred).toMatchObject({ name: loadedTool.name, defer_loading: true });
    const serialized = JSON.stringify(captured.messages);
    expect(serialized).toContain('"type":"tool_reference"');
    expect(serialized).toContain(`"tool_name":"${loadedTool.name}"`);
  });

  it("distinguishes Kimi's exact system-tool encoding from generic compatible fallback", async () => {
    const capture = async (model: Model<"openai-completions">) => {
      let payload: unknown;
      return capturePayload(
        streamOpenAICompletions(model, makeLoadedToolContext(model.api, model.provider), {
          apiKey: "test-key",
          onPayload: (next) => {
            payload = next;
            throw new Error("wire-captured");
          },
        }),
        () => payload,
      );
    };
    const kimi = await capture(
      makeModel({
        api: "openai-completions",
        provider: "kimi-coding",
        compat: { deferredToolsMode: "kimi" },
      }),
    );
    const compatible = await capture(
      makeModel({ api: "openai-completions", provider: "deepseek" }),
    );

    expect((kimi.tools ?? []).map((tool: any) => tool.function?.name)).toEqual([loaderTool.name]);
    expect(
      (kimi.messages ?? []).some(
        (message: any) =>
          message.role === "system" &&
          Array.isArray(message.tools) &&
          message.tools.some((tool: any) => tool.function?.name === loadedTool.name),
      ),
    ).toBe(true);
    expect((compatible.tools ?? []).map((tool: any) => tool.function?.name)).toEqual([
      loaderTool.name,
      loadedTool.name,
    ]);
    expect((compatible.messages ?? []).some((message: any) => "tools" in message)).toBe(false);
  });
});
