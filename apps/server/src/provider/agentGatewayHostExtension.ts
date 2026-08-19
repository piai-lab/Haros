import type {
  InlineExtension,
  LoadExtensionsResult,
  ToolDefinition,
  ToolInfo,
} from "@earendil-works/pi-coding-agent";

import {
  listAgentGatewayMcpTools,
  type AgentGatewayMcpFetch,
  type AgentGatewayMcpToolDescriptor,
} from "../agentGateway/mcpInjection.ts";
import type { AgentGatewayMcpConnection } from "../agentGateway/Services/AgentGatewayCredentials.ts";
import { buildAgentGatewayPiToolDefinitions } from "./agentGatewayPiProjection.ts";

export const AGENT_GATEWAY_HOST_EXTENSION_NAME = "omnimind-agent-gateway-host";
export const AGENT_GATEWAY_HOST_EXTENSION_PATH = `<inline:${AGENT_GATEWAY_HOST_EXTENSION_NAME}>`;

export interface AgentGatewayHostExtensionHandle {
  readonly extension: InlineExtension;
}

export class AgentGatewayHostCapabilityUnavailableError extends Error {
  readonly unavailableNames: ReadonlyArray<string>;

  constructor(unavailableNames: ReadonlyArray<string>) {
    super(`Required OmniMind Host tools are unavailable: ${unavailableNames.join(", ")}`);
    this.name = "AgentGatewayHostCapabilityUnavailableError";
    this.unavailableNames = unavailableNames;
  }
}

export function isAgentGatewayHostTool(tool: ToolInfo | undefined): boolean {
  return (
    tool?.sourceInfo.path === AGENT_GATEWAY_HOST_EXTENSION_PATH &&
    tool.sourceInfo.source === "inline" &&
    tool.sourceInfo.scope === "temporary" &&
    tool.sourceInfo.origin === "top-level"
  );
}

/** Derive the Host capability actually delivered by this ResourceLoader pass. */
export function inspectAgentGatewayHostExtensionRegistration(input: {
  readonly extensions: LoadExtensionsResult;
  readonly tools: ReadonlyArray<ToolInfo>;
}): {
  readonly available: boolean;
  readonly deliveredToolNames: ReadonlyArray<string>;
  readonly collidedToolNames: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
} {
  const hostExtension = input.extensions.extensions.find(
    (extension) => extension.path === AGENT_GATEWAY_HOST_EXTENSION_PATH,
  );
  const candidateNames = [...(hostExtension?.tools.keys() ?? [])];
  const deliveredToolNames = candidateNames.filter((name) =>
    isAgentGatewayHostTool(input.tools.find((tool) => tool.name === name)),
  );
  const deliveredNames = new Set(deliveredToolNames);
  const collidedToolNames = candidateNames.filter((name) => !deliveredNames.has(name));
  const loadDiagnostics = input.extensions.errors
    .filter(
      ({ path, error }) =>
        path === AGENT_GATEWAY_HOST_EXTENSION_PATH ||
        candidateNames.some((name) => error.includes(name)),
    )
    .map(({ error }) => error);
  const collisionDiagnostics = collidedToolNames.map(
    (name) => `Pi selected a foreign source for AgentGateway Host tool "${name}".`,
  );
  return {
    available: deliveredToolNames.length > 0,
    deliveredToolNames,
    collidedToolNames,
    diagnostics:
      loadDiagnostics.length > 0 || collisionDiagnostics.length > 0
        ? [...loadDiagnostics, ...collisionDiagnostics]
        : deliveredToolNames.length === 0
          ? ["Pi did not deliver any bundled AgentGateway Host tools."]
          : [],
  };
}

/** Check a canonical prompt/envelope dependency without mutating Pi's active set. */
export function assertAgentGatewayHostToolsDelivered(input: {
  readonly tools: ReadonlyArray<ToolInfo>;
  readonly requiredNames: ReadonlyArray<string>;
  readonly currentlyExposedNames: ReadonlySet<string>;
}): void {
  const unavailable = input.requiredNames.filter((name) => {
    const tool = input.tools.find((candidate) => candidate.name === name);
    return !isAgentGatewayHostTool(tool) || !input.currentlyExposedNames.has(name);
  });
  if (unavailable.length > 0) {
    throw new AgentGatewayHostCapabilityUnavailableError(unavailable);
  }
}

/** Build a session-scoped eager Host projection using Pi's async factory lifecycle. */
export function makeAgentGatewayHostExtension(input: {
  readonly connection: AgentGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly fetch?: AgentGatewayMcpFetch;
  readonly loadDescriptors?: () => Promise<ReadonlyArray<AgentGatewayMcpToolDescriptor>>;
}): AgentGatewayHostExtensionHandle {
  const loadDescriptors =
    input.loadDescriptors ??
    (() =>
      listAgentGatewayMcpTools({
        connection: input.connection,
        ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
      }));

  return {
    extension: {
      name: AGENT_GATEWAY_HOST_EXTENSION_NAME,
      hidden: true,
      factory: async (pi) => {
        const descriptors = await loadDescriptors();
        for (const tool of buildAgentGatewayPiToolDefinitions({
          connection: input.connection,
          defineTool: input.defineTool,
          descriptors,
          ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
        })) {
          pi.registerTool(tool);
        }
      },
    },
  };
}
