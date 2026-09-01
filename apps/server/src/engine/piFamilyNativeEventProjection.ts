import crypto from "node:crypto";

import type { AgentSession as PiAgentSession } from "@earendil-works/pi-coding-agent";
import type { ImageContent, TextContent } from "@earendil-works/pi-ai";
import {
  EventId,
  type EngineToolActionKind,
  type EngineKind,
  type EngineSession,
  RuntimeItemId,
  type TurnId,
} from "@harnessos/contracts";

import { buildToolResultSnapshot } from "./toolResultSnapshot.ts";

import {
  engineWebSurfacePresentationMetadata,
  extractPiCuratorWebSurfaceUrl,
  sanitizeEngineWebSurfacePayload,
} from "../engineWebSurface/engineWebSurfaceHost.ts";

type PiFamilyEngine = Extract<EngineKind, "pi" | "oa">;

export interface PiTrackedToolCall {
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

export function makePiRuntimeEventBase(
  context: {
    readonly engine?: PiFamilyEngine;
    readonly lifecycleGeneration?: string;
    readonly session: Pick<EngineSession, "threadId">;
    readonly activeTurnId: TurnId | undefined;
  },
  options?: { readonly includeTurnId?: boolean },
) {
  return {
    eventId: EventId.makeUnsafe(crypto.randomUUID()),
    engine: context.engine ?? "pi",
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

export function classifyPiRuntimeError(
  message: string,
): "engine_error" | "transport_error" | "permission_error" | "validation_error" | "unknown" {
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
    normalized.includes("engine")
  ) {
    return "engine_error";
  }
  return "unknown";
}

export function piRuntimeErrorDetail(cause: unknown): unknown {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      ...(cause.stack ? { stack: cause.stack } : {}),
    };
  }
  return cause;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function trimmed(value: string | null | undefined): string | undefined {
  const result = typeof value === "string" ? value.trim() : "";
  return result.length > 0 ? result : undefined;
}

function firstString(
  source: Record<string, unknown> | undefined,
  keys: readonly string[],
): string | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
}

function textFromContent(content: string | (TextContent | ImageContent)[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((block): block is TextContent => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");
}

export function latestPiAssistantText(messages: readonly unknown[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = record(messages[index]);
    if (message?.role !== "assistant") continue;
    const content = message.content;
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return undefined;
    return content
      .flatMap((block) => {
        const entry = record(block);
        return entry?.type === "text" && typeof entry.text === "string" ? [entry.text] : [];
      })
      .join("\n\n");
  }
  return undefined;
}

function textFromToolResult(result: unknown): string | undefined {
  if (typeof result === "string") return result;
  const source = record(result);
  if (!source) return undefined;
  const directText = firstString(source, [
    "output",
    "stdout",
    "stderr",
    "text",
    "summary",
    "message",
    "error",
  ]);
  if (directText) return directText;
  const content = Array.isArray(source.content) ? source.content : [];
  const parts = content.flatMap((block) => {
    const blockRecord = record(block);
    return blockRecord?.type === "text" && typeof blockRecord.text === "string"
      ? [blockRecord.text]
      : [];
  });
  return parts.length > 0 ? parts.join("\n") : undefined;
}

export function piToolTimelineDetail(result: unknown): string | undefined {
  return trimmed(textFromToolResult(result));
}

export function makePiGatewayLoadWarning(displayName: string) {
  return {
    message: `Haros MCP tools could not be loaded for this ${displayName} session. Engine-native tools remain available; Haros MCP actions are unavailable.`,
    detail: { source: "harnessos-mcp", availability: "failed" } as const,
  };
}

function toolPath(args: unknown): string | undefined {
  return firstString(record(args), ["path", "filePath", "file", "relativePath"]);
}

function toolCommand(args: unknown): string | undefined {
  return firstString(record(args), ["command", "cmd"]);
}

function toolSearchQuery(toolName: string, args: unknown): string | undefined {
  const source = record(args);
  if (!source) return undefined;
  return toolName === "grep" || toolName === "find"
    ? firstString(source, ["pattern", "query"])
    : firstString(source, ["query", "pattern"]);
}

export function piToolActionKind(toolName: string): EngineToolActionKind {
  switch (toolName) {
    case "bash":
      return "execute";
    case "read":
      return "read";
    case "edit":
      return "edit";
    case "write":
      return "write";
    case "find":
    case "grep":
      return "search";
    case "ls":
      return "listFiles";
    case "web_search":
    case "source_check":
    case "fetch_content":
    case "get_search_content":
      return "webAccess";
    default:
      return "unknown";
  }
}

export function piToolItemType(toolName: string): PiTrackedToolCall["itemType"] {
  switch (toolName) {
    case "bash":
      return "command_execution";
    case "edit":
    case "write":
      return "file_change";
    case "grep":
    case "find":
    case "web_search":
    case "source_check":
    case "fetch_content":
    case "get_search_content":
      return "web_search";
    default:
      return "dynamic_tool_call";
  }
}

export function piToolTitle(toolName: string, args: unknown): string {
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
  return query && (toolName === "find" || toolName === "grep") ? `${toolName} ${query}` : toolName;
}

export function piToolLifecycleData(input: {
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
  const result = input.result ?? input.partialResult;
  const path = toolPath(args);
  const actionKind = piToolActionKind(toolName);
  const base: Record<string, unknown> = {
    kind: actionKind,
    toolResultSnapshot: buildToolResultSnapshot({
      toolCallId,
      toolName,
      actionKind,
      args,
      ...(result !== undefined ? { result } : {}),
      ...(input.isError !== undefined ? { isError: input.isError } : {}),
    }),
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
      return base;
    case "read":
      return {
        ...base,
        kind: "read",
        ...(path
          ? {
              path,
              files: [path],
            }
          : {}),
      };
    case "edit":
      return {
        ...base,
        kind: "edit",
        ...(path ? { path, files: [path] } : {}),
      };
    case "write":
      return {
        ...base,
        kind: "write",
        ...(path ? { path, files: [path] } : {}),
      };
    case "find":
    case "grep": {
      return {
        ...base,
        searchKind: toolName,
        ...(path ? { path } : {}),
      };
    }
    case "ls":
      return {
        ...base,
        ...(path ? { path } : {}),
      };
    default:
      return base;
  }
}

export function isPiBarrierSiblingBlocked(result: unknown): boolean {
  return record(record(record(result)?.details)?.barrier)?.status === "blocked";
}

export function mapPiMessageHistory(session: PiAgentSession): unknown[] {
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
        } else if (content.type === "thinking" && content.thinking) {
          items.push({ type: "reasoning", text: content.thinking });
        } else if (content.type === "toolCall") {
          pendingTools.set(content.id, { toolName: content.name, args: content.arguments });
          items.push({
            type: "tool_call",
            status: "started",
            callId: content.id,
            toolName: content.name,
            itemType: piToolItemType(content.name),
            title: piToolTitle(content.name, content.arguments),
            data: piToolLifecycleData({
              toolCallId: content.id,
              toolName: content.name,
              args: content.arguments,
            }),
          });
        }
      }
      continue;
    }
    if (message.role !== "toolResult") continue;
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
      itemType: piToolItemType(toolName),
      title: piToolTitle(toolName, args),
      isError: message.isError,
      data: piToolLifecycleData({
        toolCallId: message.toolCallId,
        toolName,
        args,
        result: safeResult,
        isError: message.isError,
        ...(surfaceUrl ? { engineWebSurfaceStatus: "completed" } : {}),
      }),
    });
  }
  return items;
}
