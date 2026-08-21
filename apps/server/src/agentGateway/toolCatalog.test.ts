import { DEFAULT_SERVER_SETTINGS } from "@omnimind/contracts";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  exposedAgentGatewayTools,
  exposedAgentGatewayToolsForProjectKind,
  makeAgentGatewayToolCatalog,
  projectBuiltInToolGroups,
  tagAgentGatewayTools,
} from "./toolCatalog.ts";
import type { ToolEntry } from "./toolRuntime.ts";

function makeTool(name: string): ToolEntry {
  return {
    definition: { name, description: name, inputSchema: { type: "object" } },
    requiredCapability: "thread:read",
    handler: () => Effect.succeed({ content: [{ type: "text", text: "ok" }] }),
  };
}

describe("AgentGateway tool catalog", () => {
  it("attaches canonical owner metadata and rejects internal duplicate names", () => {
    const tool = tagAgentGatewayTools({
      group: "browser",
      available: true,
      tools: [makeTool("browser_click")],
    })[0]!;
    expect(tool).toMatchObject({
      group: "browser",
      available: true,
      provenance: "agent-gateway",
      definition: {
        _meta: {
          "omnimind/owner": "agent-gateway",
          "omnimind/group": "browser",
        },
      },
    });
    expect(() => makeAgentGatewayToolCatalog([[tool], [tool]])).toThrow(
      "Duplicate AgentGateway tool name",
    );
  });

  it("projects availability separately from persisted user enablement", () => {
    const catalog = makeAgentGatewayToolCatalog([
      tagAgentGatewayTools({
        group: "tasks",
        available: true,
        tools: [makeTool("omnimind_read_thread")],
      }),
      tagAgentGatewayTools({
        group: "browser",
        available: false,
        tools: [makeTool("browser_click")],
      }),
    ]);
    const settings = {
      ...DEFAULT_SERVER_SETTINGS,
      agentTools: { disabledBuiltInGroups: ["tasks", "future-group"] },
    };

    expect(exposedAgentGatewayTools(catalog, settings)).toEqual([]);
    expect(projectBuiltInToolGroups(catalog, settings)).toEqual([
      {
        id: "tasks",
        toolCount: 1,
        availableToolCount: 1,
        availability: "available",
        enabled: false,
        effective: false,
      },
      {
        id: "diagnostics",
        toolCount: 0,
        availableToolCount: 0,
        availability: "unavailable",
        enabled: true,
        effective: false,
      },
      {
        id: "goals",
        toolCount: 0,
        availableToolCount: 0,
        availability: "unavailable",
        enabled: true,
        effective: false,
      },
      {
        id: "automations",
        toolCount: 0,
        availableToolCount: 0,
        availability: "unavailable",
        enabled: true,
        effective: false,
      },
      {
        id: "browser",
        toolCount: 1,
        availableToolCount: 0,
        availability: "unavailable",
        enabled: true,
        effective: false,
      },
      {
        id: "device",
        toolCount: 0,
        availableToolCount: 0,
        availability: "unavailable",
        enabled: true,
        effective: false,
      },
    ]);
  });

  it("derives Agent, Chat, and Studio admission from ProductSurface without a second catalog", () => {
    const catalog = makeAgentGatewayToolCatalog([
      tagAgentGatewayTools({
        group: "tasks",
        available: true,
        tools: [makeTool("omnimind_read_thread")],
      }),
      tagAgentGatewayTools({
        group: "browser",
        available: true,
        tools: [makeTool("browser_click")],
      }),
      tagAgentGatewayTools({
        group: "device",
        available: false,
        tools: [makeTool("device_open")],
      }),
    ]);

    const namesFor = (kind: "project" | "chat" | "studio") =>
      exposedAgentGatewayToolsForProjectKind(catalog, DEFAULT_SERVER_SETTINGS, kind).map(
        (tool) => tool.definition.name,
      );

    expect(namesFor("project")).toEqual(["omnimind_read_thread", "browser_click"]);
    expect(namesFor("chat")).toEqual(["browser_click"]);
    expect(namesFor("studio")).toEqual(["omnimind_read_thread", "browser_click"]);

    const browserDisabled = {
      ...DEFAULT_SERVER_SETTINGS,
      agentTools: { disabledBuiltInGroups: ["browser"] },
    };
    expect(exposedAgentGatewayToolsForProjectKind(catalog, browserDisabled, "chat")).toEqual([]);
  });
});
