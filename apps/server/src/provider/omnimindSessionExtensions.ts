import type { InlineExtension, ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { ProviderWorkSurface, TurnTasksUpdatedPayload } from "@omnimind/contracts";

import type { AgentGatewayMcpFetch } from "../agentGateway/mcpInjection.ts";
import type { AgentGatewayMcpConnection } from "../agentGateway/Services/AgentGatewayCredentials.ts";
import {
  makeAgentGatewayHostExtension,
  type AgentGatewayHostExtensionHandle,
} from "./agentGatewayHostExtension.ts";
import { makeOmniMindTaskListExtension } from "./omnimindTaskListExtension.ts";

export interface OmniMindSessionExtensionComposition {
  readonly extensions: InlineExtension[];
  readonly todoExtension?: InlineExtension;
  readonly host?: AgentGatewayHostExtensionHandle;
}

/** Explicit product wiring only; user and third-party Extensions stay in Pi's ResourceLoader. */
export function buildOmniMindSessionExtensions(input: {
  readonly workSurface?: ProviderWorkSurface;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly gatewayConnection?: AgentGatewayMcpConnection;
  readonly gatewayFetch?: AgentGatewayMcpFetch;
  readonly onTasksUpdated?: (input: {
    readonly toolCallId: string;
    readonly payload: TurnTasksUpdatedPayload;
  }) => void;
}): OmniMindSessionExtensionComposition {
  const todoExtension =
    input.workSurface !== undefined && input.onTasksUpdated !== undefined
      ? makeOmniMindTaskListExtension({
          defineTool: input.defineTool,
          onTasksUpdated: input.onTasksUpdated,
        })
      : undefined;
  const host =
    input.gatewayConnection === undefined
      ? undefined
      : makeAgentGatewayHostExtension({
          connection: input.gatewayConnection,
          defineTool: input.defineTool,
          ...(input.gatewayFetch === undefined ? {} : { fetch: input.gatewayFetch }),
        });
  return {
    extensions: [
      ...(todoExtension === undefined ? [] : [todoExtension]),
      ...(host === undefined ? [] : [host.extension]),
    ],
    ...(todoExtension === undefined ? {} : { todoExtension }),
    ...(host === undefined ? {} : { host }),
  };
}
