import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { AgentToolResult } from "@earendil-works/pi-agent-core";
import type { ImageContent, TextContent } from "@earendil-works/pi-ai";

import {
  callHostGatewayMcpTool,
  listHostGatewayMcpTools,
  type HostGatewayMcpFetch,
  type HostGatewayMcpToolDescriptor,
} from "../hostGateway/mcpInjection.ts";
import type { HostGatewayMcpConnection } from "../hostGateway/Services/HostGatewayCredentials.ts";

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
    throw new Error(message || "Haros gateway tool failed.");
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

export function assertCanonicalHostGatewayDescriptors(
  descriptors: ReadonlyArray<HostGatewayMcpToolDescriptor>,
): void {
  const names = new Set<string>();
  for (const descriptor of descriptors) {
    if (descriptor.provenance !== "host-gateway" || descriptor.group === undefined) {
      throw new Error(`Untrusted HostGateway tool descriptor: ${descriptor.name}`);
    }
    if (names.has(descriptor.name)) {
      throw new Error(`Duplicate HostGateway tool name: ${descriptor.name}`);
    }
    names.add(descriptor.name);
  }
}

export function makeHostGatewayPiToolDefinition(input: {
  readonly descriptor: HostGatewayMcpToolDescriptor;
  readonly connection: HostGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly fetch?: HostGatewayMcpFetch;
}): ToolDefinition {
  return input.defineTool({
    name: input.descriptor.name,
    label: input.descriptor.name,
    description: input.descriptor.description,
    parameters: input.descriptor.inputSchema as ToolDefinition["parameters"],
    execute: async (_toolCallId, params, signal) =>
      toPiGatewayToolResult(
        await callHostGatewayMcpTool({
          connection: input.connection,
          name: input.descriptor.name,
          arguments: params as Record<string, unknown>,
          ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
          ...(signal === undefined ? {} : { signal }),
        }),
      ),
  });
}

export function buildHostGatewayPiToolDefinitions(input: {
  readonly connection: HostGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly descriptors: ReadonlyArray<HostGatewayMcpToolDescriptor>;
  readonly fetch?: HostGatewayMcpFetch;
}): ReadonlyArray<ToolDefinition> {
  assertCanonicalHostGatewayDescriptors(input.descriptors);
  return input.descriptors.map((descriptor) =>
    makeHostGatewayPiToolDefinition({
      descriptor,
      connection: input.connection,
      defineTool: input.defineTool,
      ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
    }),
  );
}

/** Load and project the canonical HostGateway catalog for one Pi-family Session. */
export async function buildPiHostGatewayCustomTools(input: {
  readonly connection: HostGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly fetch?: HostGatewayMcpFetch;
  readonly onCatalog?: (tools: ReadonlyArray<HostGatewayMcpToolDescriptor>) => void;
}): Promise<ReadonlyArray<ToolDefinition>> {
  const tools = await listHostGatewayMcpTools({
    connection: input.connection,
    ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
  });
  if (tools.length === 0) {
    throw new Error("Haros MCP returned an empty tool catalog.");
  }
  input.onCatalog?.(tools);
  return buildPiHostGatewayCustomToolsFromDescriptors({ ...input, tools });
}

/** Project a previously frozen HostGateway catalog without re-reading authority. */
export function buildPiHostGatewayCustomToolsFromDescriptors(input: {
  readonly connection: HostGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly tools: ReadonlyArray<HostGatewayMcpToolDescriptor>;
  readonly fetch?: HostGatewayMcpFetch;
}): ReadonlyArray<ToolDefinition> {
  return buildHostGatewayPiToolDefinitions({
    connection: input.connection,
    defineTool: input.defineTool,
    descriptors: input.tools,
    ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
  });
}
