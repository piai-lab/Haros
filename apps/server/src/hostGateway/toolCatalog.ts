import {
  BUILT_IN_TOOL_GROUP_IDS,
  BUILT_IN_TOOL_SURFACES,
  type BuiltInToolGroupId,
  type BuiltInToolGroupAvailability,
  type BuiltInToolGroupsResult,
  type ServerSettings,
  type ProjectKind,
} from "@harnessos/contracts";
import {
  configuredHostGroupEnabled,
  resolveHostGroupSurfacePolicy,
} from "@harnessos/shared/hostToolSurfacePolicy";
import { projectKindToProductSurface } from "@harnessos/shared/productSurface";
import type { ServerSettingsSnapshot } from "../serverSettings.ts";

import type { HostGatewayCatalogToolEntry, ToolEntry } from "./toolRuntime.ts";

const HOST_GATEWAY_OWNER = "host-gateway" as const;

export function tagHostGatewayTools(input: {
  readonly group: BuiltInToolGroupId;
  readonly available: boolean;
  readonly tools: ReadonlyArray<ToolEntry>;
}): ReadonlyArray<HostGatewayCatalogToolEntry> {
  return input.tools.map((tool) => ({
    ...tool,
    group: input.group,
    available: input.available,
    provenance: HOST_GATEWAY_OWNER,
    definition: {
      ...tool.definition,
      _meta: {
        ...tool.definition._meta,
        "harnessos/owner": HOST_GATEWAY_OWNER,
        "harnessos/group": input.group,
      },
    },
  }));
}

export function makeHostGatewayToolCatalog(
  groups: ReadonlyArray<ReadonlyArray<HostGatewayCatalogToolEntry>>,
): ReadonlyArray<HostGatewayCatalogToolEntry> {
  const catalog = groups.flat();
  const names = new Set<string>();
  for (const tool of catalog) {
    if (names.has(tool.definition.name)) {
      throw new Error(`Duplicate HostGateway tool name: ${tool.definition.name}`);
    }
    names.add(tool.definition.name);
  }
  return catalog;
}

export function isBuiltInToolGroupEnabled(
  settings: ServerSettings,
  group: BuiltInToolGroupId,
  projectKind: ProjectKind,
): boolean {
  return configuredHostGroupEnabled({
    group,
    surface: projectKindToProductSurface(projectKind),
    overrides: settings.agentTools.builtInGroupOverrides,
  });
}

export function exposedHostGatewayToolsForProjectKind(
  catalog: ReadonlyArray<HostGatewayCatalogToolEntry>,
  settings: ServerSettings,
  projectKind: ProjectKind,
): ReadonlyArray<HostGatewayCatalogToolEntry> {
  return catalog.filter(
    (tool) => tool.available && isBuiltInToolGroupEnabled(settings, tool.group, projectKind),
  );
}

export function projectBuiltInToolGroups(
  catalog: ReadonlyArray<HostGatewayCatalogToolEntry>,
  snapshot: ServerSettingsSnapshot,
): BuiltInToolGroupsResult {
  const overrides = snapshot.settings.agentTools.builtInGroupOverrides;
  const groups = BUILT_IN_TOOL_GROUP_IDS.map((id) => {
    const groupTools = catalog.filter((tool) => tool.group === id);
    const availableToolCount = groupTools.filter((tool) => tool.available).length;
    const availability: BuiltInToolGroupAvailability =
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
      surfaces: Object.fromEntries(
        BUILT_IN_TOOL_SURFACES.map((surface) => {
          const policy = resolveHostGroupSurfacePolicy(id, surface);
          const configuredEnabled = configuredHostGroupEnabled({
            group: id,
            surface,
            overrides,
          });
          return [
            surface,
            {
              supported: policy.supported,
              defaultEnabled: policy.defaultEnabled,
              configuredEnabled,
              effective: policy.supported && configuredEnabled && availableToolCount > 0,
            },
          ];
        }),
      ) as BuiltInToolGroupsResult["groups"][number]["surfaces"],
    };
  });
  return {
    settingsRevision: snapshot.revision,
    builtInGroupOverrides: overrides,
    groups,
  };
}
