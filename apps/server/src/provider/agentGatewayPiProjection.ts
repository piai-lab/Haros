import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { AgentToolResult } from "@earendil-works/pi-agent-core";
import type { ImageContent, TextContent } from "@earendil-works/pi-ai";

import {
  callAgentGatewayMcpTool,
  type AgentGatewayMcpFetch,
  type AgentGatewayMcpToolDescriptor,
} from "../agentGateway/mcpInjection.ts";
import type { AgentGatewayMcpConnection } from "../agentGateway/Services/AgentGatewayCredentials.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toPiGatewayToolResult(result: unknown): AgentToolResult<unknown> {
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
    throw new Error(message || "HarnessOS gateway tool failed.");
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

export function assertCanonicalAgentGatewayDescriptors(
  descriptors: ReadonlyArray<AgentGatewayMcpToolDescriptor>,
): void {
  const names = new Set<string>();
  for (const descriptor of descriptors) {
    if (descriptor.provenance !== "agent-gateway" || descriptor.group === undefined) {
      throw new Error(`Untrusted AgentGateway tool descriptor: ${descriptor.name}`);
    }
    if (names.has(descriptor.name)) {
      throw new Error(`Duplicate AgentGateway tool name: ${descriptor.name}`);
    }
    names.add(descriptor.name);
  }
}

export function makeAgentGatewayPiToolDefinition(input: {
  readonly descriptor: AgentGatewayMcpToolDescriptor;
  readonly connection: AgentGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly fetch?: AgentGatewayMcpFetch;
}): ToolDefinition {
  return input.defineTool({
    name: input.descriptor.name,
    label: input.descriptor.name,
    description: input.descriptor.description,
    parameters: input.descriptor.inputSchema as ToolDefinition["parameters"],
    execute: async (_toolCallId, params, signal) =>
      toPiGatewayToolResult(
        await callAgentGatewayMcpTool({
          connection: input.connection,
          name: input.descriptor.name,
          arguments: params as Record<string, unknown>,
          ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
          ...(signal === undefined ? {} : { signal }),
        }),
      ),
  });
}

export function buildAgentGatewayPiToolDefinitions(input: {
  readonly connection: AgentGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly descriptors: ReadonlyArray<AgentGatewayMcpToolDescriptor>;
  readonly fetch?: AgentGatewayMcpFetch;
}): ReadonlyArray<ToolDefinition> {
  assertCanonicalAgentGatewayDescriptors(input.descriptors);
  return input.descriptors.map((descriptor) =>
    makeAgentGatewayPiToolDefinition({
      descriptor,
      connection: input.connection,
      defineTool: input.defineTool,
      ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
    }),
  );
}
