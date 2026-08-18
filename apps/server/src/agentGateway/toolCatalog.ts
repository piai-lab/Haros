import {
  BUILT_IN_TOOL_GROUP_IDS,
  type BuiltInToolGroup,
  type BuiltInToolGroupId,
  type ServerSettings,
} from "@omnimind/contracts";

import type { AgentGatewayCatalogToolEntry, ToolEntry } from "./toolRuntime.ts";

const AGENT_GATEWAY_OWNER = "agent-gateway" as const;

export function tagAgentGatewayTools(input: {
  readonly group: BuiltInToolGroupId;
  readonly available: boolean;
  readonly tools: ReadonlyArray<ToolEntry>;
}): ReadonlyArray<AgentGatewayCatalogToolEntry> {
  return input.tools.map((tool) => ({
    ...tool,
    group: input.group,
    available: input.available,
    provenance: AGENT_GATEWAY_OWNER,
    definition: {
      ...tool.definition,
      _meta: {
        ...tool.definition._meta,
        "omnimind/owner": AGENT_GATEWAY_OWNER,
        "omnimind/group": input.group,
      },
    },
  }));
}

export function makeAgentGatewayToolCatalog(
  groups: ReadonlyArray<ReadonlyArray<AgentGatewayCatalogToolEntry>>,
): ReadonlyArray<AgentGatewayCatalogToolEntry> {
  const catalog = groups.flat();
  const names = new Set<string>();
  for (const tool of catalog) {
    if (names.has(tool.definition.name)) {
      throw new Error(`Duplicate AgentGateway tool name: ${tool.definition.name}`);
    }
    names.add(tool.definition.name);
  }
  return catalog;
}

export function isBuiltInToolGroupEnabled(
  settings: ServerSettings,
  group: BuiltInToolGroupId,
): boolean {
  return !settings.agentTools.disabledBuiltInGroups.includes(group);
}

export function exposedAgentGatewayTools(
  catalog: ReadonlyArray<AgentGatewayCatalogToolEntry>,
  settings: ServerSettings,
): ReadonlyArray<AgentGatewayCatalogToolEntry> {
  return catalog.filter(
    (tool) => tool.available && isBuiltInToolGroupEnabled(settings, tool.group),
  );
}

export function projectBuiltInToolGroups(
  catalog: ReadonlyArray<AgentGatewayCatalogToolEntry>,
  settings: ServerSettings,
): ReadonlyArray<BuiltInToolGroup> {
  return BUILT_IN_TOOL_GROUP_IDS.map((id) => {
    const groupTools = catalog.filter((tool) => tool.group === id);
    const availableToolCount = groupTools.filter((tool) => tool.available).length;
    const enabled = isBuiltInToolGroupEnabled(settings, id);
    const availability =
      availableToolCount === 0
        ? "unavailable"
        : availableToolCount === groupTools.length
          ? "available"
          : "degraded";
    return {
      id,
      toolCount: groupTools.length,
      availableToolCount,
      availability,
      enabled,
      effective: enabled && availableToolCount > 0,
    };
  });
}
