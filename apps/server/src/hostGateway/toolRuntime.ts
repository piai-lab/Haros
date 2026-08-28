import type { BuiltInToolGroupId, EngineKind } from "@harnessos/contracts";
import type { Effect } from "effect";

import type { HostGatewayTargetError } from "./targetResolver.ts";
import type { HostGatewayCapability } from "./Services/HostGatewaySessionRegistry.ts";
import {
  mcpToolResultJson,
  type JsonRpcId,
  type McpToolCallResult,
  type McpToolDefinition,
} from "./protocol.ts";

export const READ_ONLY_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export const WRITE_TOOL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const;

export interface EngineSessionPrincipal {
  readonly kind: "engine-session";
  readonly sessionKey: string;
  readonly threadId: string;
  readonly engine: EngineKind;
  readonly turnId: string | null;
}

export interface ExternalClientPrincipal {
  readonly kind: "external-client";
  readonly integrationId: string;
  readonly name: string;
}

export type HostGatewayPrincipal = EngineSessionPrincipal | ExternalClientPrincipal;

export interface ToolContext {
  readonly principal: EngineSessionPrincipal;
  readonly callerThreadId: string;
  readonly callerSessionKey: string;
  readonly callerProvider: EngineKind;
  readonly callerCapabilities: ReadonlySet<HostGatewayCapability>;
  readonly callerTurnId: string | null;
  readonly assertCallerTurnActive: () => Effect.Effect<void, GatewayToolError>;
  readonly jsonRpcRequestId: JsonRpcId;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext,
) => Effect.Effect<McpToolCallResult>;

export interface ToolEntry {
  readonly definition: McpToolDefinition;
  readonly handler: ToolHandler;
  readonly requiredCapability: HostGatewayCapability;
  readonly group?: BuiltInToolGroupId;
  readonly available?: boolean;
  readonly provenance?: "host-gateway";
}

export interface HostGatewayCatalogToolEntry extends ToolEntry {
  readonly group: BuiltInToolGroupId;
  readonly available: boolean;
  readonly provenance: "host-gateway";
}

export interface McpToolEntry<Context, Capability extends string> {
  readonly definition: McpToolDefinition;
  readonly handler: (
    args: Record<string, unknown>,
    context: Context,
  ) => Effect.Effect<McpToolCallResult>;
  readonly requiredCapability: Capability;
}

export class GatewayToolError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function gatewayToolErrorResult(error: GatewayToolError | HostGatewayTargetError) {
  return {
    ...mcpToolResultJson({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    }),
    isError: true as const,
  };
}
