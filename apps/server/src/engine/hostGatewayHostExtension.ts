import type {
  InlineExtension,
  LoadExtensionsResult,
  ToolDefinition,
  ToolInfo,
} from "@earendil-works/pi-coding-agent";

import {
  listHostGatewayMcpTools,
  type HostGatewayMcpFetch,
  type HostGatewayMcpToolDescriptor,
} from "../hostGateway/mcpInjection.ts";
import type { HostGatewayMcpConnection } from "../hostGateway/Services/HostGatewayCredentials.ts";
import { renderHarosHarnessPolicy } from "../hostGateway/harnessPolicy.ts";
import { buildHostGatewayPiToolDefinitions } from "./hostGatewayPiProjection.ts";

export const HOST_GATEWAY_HOST_EXTENSION_NAME = "harnessos-host-gateway-host";
export const HOST_GATEWAY_HOST_EXTENSION_PATH = `<inline:${HOST_GATEWAY_HOST_EXTENSION_NAME}>`;

export interface HostGatewayHostExtensionHandle {
  readonly extension: InlineExtension;
  readonly refreshCurrentDescriptors: () => Promise<ReadonlyArray<HostGatewayMcpToolDescriptor>>;
  readonly requiresReload: (descriptors: ReadonlyArray<HostGatewayMcpToolDescriptor>) => boolean;
  readonly inspectRegistration: (input: {
    readonly extensions: LoadExtensionsResult;
    readonly tools: ReadonlyArray<ToolInfo>;
  }) => HostGatewayHostExtensionInspection;
  readonly assertDelivered: (input: {
    readonly tools: ReadonlyArray<ToolInfo>;
    readonly requiredNames: ReadonlyArray<string>;
    readonly currentlyExposedNames: ReadonlySet<string>;
  }) => void;
}

function descriptorFingerprint(descriptors: ReadonlyArray<HostGatewayMcpToolDescriptor>): string {
  return JSON.stringify(
    descriptors
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .map(({ name, description, group, inputSchema, provenance }) => ({
        name,
        description,
        group,
        inputSchema,
        provenance,
      })),
  );
}

export interface HostGatewayHostExtensionInspection {
  readonly available: boolean;
  readonly deliveredToolNames: ReadonlyArray<string>;
  readonly collidedToolNames: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
}

export class HostGatewayHostCapabilityUnavailableError extends Error {
  readonly unavailableNames: ReadonlyArray<string>;

  constructor(unavailableNames: ReadonlyArray<string>) {
    super(`Required Haros Host tools are unavailable: ${unavailableNames.join(", ")}`);
    this.name = "HostGatewayHostCapabilityUnavailableError";
    this.unavailableNames = unavailableNames;
  }
}

export function isHostGatewayHostTool(tool: ToolInfo | undefined): boolean {
  return (
    tool?.sourceInfo.path === HOST_GATEWAY_HOST_EXTENSION_PATH &&
    tool.sourceInfo.source === "inline" &&
    tool.sourceInfo.scope === "temporary" &&
    tool.sourceInfo.origin === "top-level"
  );
}

/** Derive the Host capability actually delivered by this ResourceLoader pass. */
export function inspectHostGatewayHostExtensionRegistration(input: {
  readonly extensions: LoadExtensionsResult;
  readonly tools: ReadonlyArray<ToolInfo>;
}): HostGatewayHostExtensionInspection {
  const hostExtension = input.extensions.extensions.find(
    (extension) => extension.path === HOST_GATEWAY_HOST_EXTENSION_PATH,
  );
  const candidateNames = [...(hostExtension?.tools.keys() ?? [])];
  const deliveredToolNames = candidateNames.filter((name) =>
    isHostGatewayHostTool(input.tools.find((tool) => tool.name === name)),
  );
  const deliveredNames = new Set(deliveredToolNames);
  const collidedToolNames = candidateNames.filter((name) => !deliveredNames.has(name));
  const loadDiagnostics = input.extensions.errors
    .filter(
      ({ path, error }) =>
        path === HOST_GATEWAY_HOST_EXTENSION_PATH ||
        candidateNames.some((name) => error.includes(name)),
    )
    .map(({ error }) => error);
  const collisionDiagnostics = collidedToolNames.map(
    (name) => `Pi selected a foreign source for HostGateway Host tool "${name}".`,
  );
  return {
    available: deliveredToolNames.length > 0,
    deliveredToolNames,
    collidedToolNames,
    diagnostics:
      loadDiagnostics.length > 0 || collisionDiagnostics.length > 0
        ? [...loadDiagnostics, ...collisionDiagnostics]
        : deliveredToolNames.length === 0
          ? ["Pi did not deliver any bundled HostGateway Host tools."]
          : [],
  };
}

/** Check a canonical prompt/envelope dependency without mutating Pi's active set. */
export function assertHostGatewayHostToolsDelivered(input: {
  readonly tools: ReadonlyArray<ToolInfo>;
  readonly requiredNames: ReadonlyArray<string>;
  readonly currentlyExposedNames: ReadonlySet<string>;
}): void {
  const unavailable = input.requiredNames.filter((name) => {
    const tool = input.tools.find((candidate) => candidate.name === name);
    return !isHostGatewayHostTool(tool) || !input.currentlyExposedNames.has(name);
  });
  if (unavailable.length > 0) {
    throw new HostGatewayHostCapabilityUnavailableError(unavailable);
  }
}

/** Render cross-tool guidance only for Host groups that won this Pi Registry pass. */
export function renderDeliveredHostGatewayHostGuidance(input: {
  readonly descriptors: ReadonlyArray<HostGatewayMcpToolDescriptor>;
  readonly tools: ReadonlyArray<ToolInfo>;
}): string {
  const groupByName = new Map(
    input.descriptors.map((descriptor) => [descriptor.name, descriptor.group]),
  );
  const deliveredGroups = new Set(
    input.tools.flatMap((tool) => {
      const group = groupByName.get(tool.name);
      return isHostGatewayHostTool(tool) && group !== undefined ? [group] : [];
    }),
  );
  if (deliveredGroups.size === 0) return "";
  return [
    "<harnessos_host_context>",
    renderHarosHarnessPolicy({
      gatewayControlAvailable: true,
      projection: { mode: "direct", enabledGroups: [...deliveredGroups] },
    }),
    "</harnessos_host_context>",
  ].join("\n");
}

/** Build a session-scoped eager Host projection using Pi's async factory lifecycle. */
export function makeHostGatewayHostExtension(input: {
  readonly connection: HostGatewayMcpConnection;
  readonly defineTool: (tool: ToolDefinition) => ToolDefinition;
  readonly fetch?: HostGatewayMcpFetch;
  readonly loadDescriptors?: () => Promise<ReadonlyArray<HostGatewayMcpToolDescriptor>>;
}): HostGatewayHostExtensionHandle {
  const loadDescriptors =
    input.loadDescriptors ??
    (() =>
      listHostGatewayMcpTools({
        connection: input.connection,
        ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
      }));
  let registeredDescriptorFingerprint: string | null = null;
  let currentDescriptors: ReadonlyArray<HostGatewayMcpToolDescriptor> = [];

  return {
    refreshCurrentDescriptors: async () => {
      currentDescriptors = await loadDescriptors();
      return currentDescriptors;
    },
    requiresReload: (descriptors) =>
      registeredDescriptorFingerprint !== descriptorFingerprint(descriptors),
    extension: {
      name: HOST_GATEWAY_HOST_EXTENSION_NAME,
      hidden: true,
      factory: async (pi) => {
        const descriptors = await loadDescriptors();
        currentDescriptors = descriptors;
        registeredDescriptorFingerprint = descriptorFingerprint(descriptors);
        const tools = buildHostGatewayPiToolDefinitions({
          connection: input.connection,
          defineTool: input.defineTool,
          descriptors,
          ...(input.fetch === undefined ? {} : { fetch: input.fetch }),
        });
        for (const tool of tools) {
          pi.registerTool(tool);
        }
        pi.on("before_agent_start", async (event) => {
          const guidance = renderDeliveredHostGatewayHostGuidance({
            descriptors: currentDescriptors,
            tools: pi.getAllTools(),
          });
          return guidance === ""
            ? undefined
            : { systemPrompt: `${event.systemPrompt}\n${guidance}` };
        });
      },
    },
    inspectRegistration: inspectHostGatewayHostExtensionRegistration,
    assertDelivered: assertHostGatewayHostToolsDelivered,
  };
}
