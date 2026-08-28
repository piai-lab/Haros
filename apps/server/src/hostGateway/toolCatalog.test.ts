import { DEFAULT_SERVER_SETTINGS } from "@harnessos/contracts";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  exposedHostGatewayToolsForProjectKind,
  makeHostGatewayToolCatalog,
  projectBuiltInToolGroups,
  tagHostGatewayTools,
} from "./toolCatalog.ts";
import type { ToolEntry } from "./toolRuntime.ts";

function makeTool(name: string): ToolEntry {
  return {
    definition: { name, description: name, inputSchema: { type: "object" } },
    requiredCapability: "thread:read",
    handler: () => Effect.succeed({ content: [{ type: "text", text: "ok" }] }),
  };
}

function snapshot(settings = DEFAULT_SERVER_SETTINGS) {
  return { revision: 7, migrationVersion: 4, settings };
}

describe("HostGateway tool catalog", () => {
  it("attaches canonical owner metadata and rejects internal duplicate names", () => {
    const tool = tagHostGatewayTools({
      group: "browser",
      available: true,
      tools: [makeTool("browser_click")],
    })[0]!;
    expect(tool).toMatchObject({
      group: "browser",
      available: true,
      provenance: "host-gateway",
      definition: {
        _meta: {
          "harnessos/owner": "host-gateway",
          "harnessos/group": "browser",
        },
      },
    });
    expect(() => makeHostGatewayToolCatalog([[tool], [tool]])).toThrow(
      "Duplicate HostGateway tool name",
    );
  });

  it("projects one revisioned read model with all eighteen support/default cells", () => {
    const catalog = makeHostGatewayToolCatalog([
      tagHostGatewayTools({
        group: "tasks",
        available: true,
        tools: [makeTool("harnessos_read_thread")],
      }),
      tagHostGatewayTools({
        group: "browser",
        available: false,
        tools: [makeTool("browser_click")],
      }),
    ]);
    const settings = {
      ...DEFAULT_SERVER_SETTINGS,
      agentTools: {
        builtInGroupOverrides: {
          agent: { tasks: false, "future-group": false },
          chat: { goals: true },
        },
      },
    };

    const projection = projectBuiltInToolGroups(catalog, snapshot(settings));
    expect(projection.settingsRevision).toBe(7);
    expect(projection.builtInGroupOverrides).toEqual(settings.agentTools.builtInGroupOverrides);
    expect(projection.groups).toHaveLength(6);
    expect(projection.groups.flatMap((group) => Object.values(group.surfaces))).toHaveLength(18);
    expect(projection.groups.find((group) => group.id === "tasks")).toMatchObject({
      availability: "available",
      surfaces: {
        agent: { supported: true, defaultEnabled: true, configuredEnabled: false },
        chat: { supported: false, defaultEnabled: false, configuredEnabled: false },
        studio: { supported: true, defaultEnabled: true, configuredEnabled: true },
      },
    });
    expect(projection.groups.find((group) => group.id === "goals")?.surfaces.chat).toEqual({
      supported: true,
      defaultEnabled: false,
      configuredEnabled: true,
      effective: false,
    });
    expect(projection.groups.find((group) => group.id === "device")?.surfaces).toMatchObject({
      agent: { supported: true, defaultEnabled: false, configuredEnabled: false },
      chat: { supported: true, defaultEnabled: false, configuredEnabled: false },
      studio: { supported: true, defaultEnabled: false, configuredEnabled: false },
    });
  });

  it("derives Agent, Chat, and Studio admission without a second catalog", () => {
    const catalog = makeHostGatewayToolCatalog([
      tagHostGatewayTools({
        group: "tasks",
        available: true,
        tools: [makeTool("harnessos_read_thread")],
      }),
      tagHostGatewayTools({
        group: "goals",
        available: true,
        tools: [makeTool("harnessos_set_goal")],
      }),
      tagHostGatewayTools({
        group: "browser",
        available: true,
        tools: [makeTool("browser_click")],
      }),
    ]);
    const namesFor = (kind: "project" | "chat" | "studio", settings = DEFAULT_SERVER_SETTINGS) =>
      exposedHostGatewayToolsForProjectKind(catalog, settings, kind).map(
        (tool) => tool.definition.name,
      );

    expect(namesFor("project")).toEqual([
      "harnessos_read_thread",
      "harnessos_set_goal",
      "browser_click",
    ]);
    expect(namesFor("chat")).toEqual(["browser_click"]);
    expect(namesFor("studio")).toEqual([
      "harnessos_read_thread",
      "harnessos_set_goal",
      "browser_click",
    ]);

    const chatOptIn = {
      ...DEFAULT_SERVER_SETTINGS,
      agentTools: { builtInGroupOverrides: { chat: { goals: true } } },
    };
    expect(namesFor("chat", chatOptIn)).toEqual(["harnessos_set_goal", "browser_click"]);

    const maliciousUnsupported = {
      ...DEFAULT_SERVER_SETTINGS,
      agentTools: { builtInGroupOverrides: { chat: { tasks: true } } },
    };
    expect(namesFor("chat", maliciousUnsupported)).not.toContain("harnessos_read_thread");
  });
});
