// FILE: agentGatewayHostExtension.test.ts
// Purpose: Exact Pi conformance for the eager AgentGateway Host projection.
// Layer: Provider Extension tests

import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import * as StockPi from "@earendil-works/pi-coding-agent";
import * as ProductPi from "@harnessos/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";

import type { AgentGatewayMcpToolDescriptor } from "../agentGateway/mcpInjection.ts";
import {
  assertAgentGatewayHostToolsDelivered,
  inspectAgentGatewayHostExtensionRegistration,
  makeAgentGatewayHostExtension,
  renderDeliveredAgentGatewayHostGuidance,
} from "./agentGatewayHostExtension.ts";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const descriptors = [
  {
    name: "browser_open",
    description: "Open a URL in the OmniMind browser.",
    inputSchema: { type: "object", properties: { url: { type: "string" } } },
    group: "browser",
    provenance: "agent-gateway",
  },
  {
    name: "harnessos_list_threads",
    description: "List OmniMind threads.",
    inputSchema: { type: "object", properties: {} },
    group: "tasks",
    provenance: "agent-gateway",
  },
] as const satisfies ReadonlyArray<AgentGatewayMcpToolDescriptor>;

type PiRuntime = Pick<
  typeof StockPi,
  "DefaultResourceLoader" | "SessionManager" | "createAgentSession" | "defineTool"
>;

async function createSession(input: {
  readonly runtime: PiRuntime;
  readonly extensions: StockPi.InlineExtension[];
}) {
  const root = mkdtempSync(path.join(tmpdir(), "omnimind-host-extension-"));
  temporaryRoots.push(root);
  const cwd = path.join(root, "workspace");
  const agentDir = path.join(root, "agent");
  mkdirSync(cwd, { recursive: true });
  mkdirSync(agentDir, { recursive: true });
  const resourceLoader = new input.runtime.DefaultResourceLoader({
    cwd,
    agentDir,
    extensionFactories: input.extensions,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await resourceLoader.reload();
  const created = await input.runtime.createAgentSession({
    cwd,
    agentDir,
    resourceLoader,
    sessionManager: input.runtime.SessionManager.inMemory(cwd),
  });
  await created.session.bindExtensions({ mode: "print" });
  return { ...created, resourceLoader };
}

function foreignExtension(name: string): StockPi.InlineExtension {
  return {
    name: "foreign-browser",
    hidden: true,
    factory: (pi) => {
      pi.registerTool({
        name,
        label: `Foreign ${name}`,
        description: `Foreign ${name}`,
        parameters: { type: "object", properties: {} } as StockPi.ToolDefinition["parameters"],
        execute: async () => ({
          content: [{ type: "text", text: "foreign" }],
          details: { source: "foreign" },
        }),
      });
    },
  };
}

describe.each([
  ["stock", StockPi as PiRuntime],
  ["product", ProductPi as unknown as PiRuntime],
])("eager AgentGateway Host projection on %s Pi", (_label, runtime) => {
  it("registers every canonical definition active without touching another owner", async () => {
    const handle = makeAgentGatewayHostExtension({
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      loadDescriptors: async () => descriptors,
    });
    const { session, resourceLoader } = await createSession({
      runtime,
      extensions: [foreignExtension("team_tool"), handle.extension],
    });

    expect(session.getActiveToolNames()).toEqual(
      expect.arrayContaining(["team_tool", "browser_open", "harnessos_list_threads"]),
    );
    const inspection = inspectAgentGatewayHostExtensionRegistration({
      extensions: resourceLoader.getExtensions(),
      tools: session.getAllTools(),
    });
    expect(inspection).toMatchObject({
      available: true,
      deliveredToolNames: ["browser_open", "harnessos_list_threads"],
      collidedToolNames: [],
    });
  });

  it("reruns the async factory on native reload and replaces the Host catalog", async () => {
    let catalog: ReadonlyArray<AgentGatewayMcpToolDescriptor> = [descriptors[0]];
    let factoryCalls = 0;
    const handle = makeAgentGatewayHostExtension({
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      loadDescriptors: async () => {
        factoryCalls += 1;
        return catalog;
      },
    });
    const { session } = await createSession({ runtime, extensions: [handle.extension] });
    expect(factoryCalls).toBe(1);
    expect(session.getActiveToolNames()).toContain("browser_open");
    expect(handle.requiresReload(catalog)).toBe(false);

    catalog = [descriptors[1]];
    expect(handle.requiresReload(catalog)).toBe(true);
    await session.reload();

    expect(factoryCalls).toBe(2);
    expect(handle.requiresReload(catalog)).toBe(false);
    expect(session.getActiveToolNames()).toContain("harnessos_list_threads");
    expect(session.getAllTools().map(({ name }) => name)).not.toContain("browser_open");
  });

  it("keeps the Session alive and recovers a transient catalog failure on native reload", async () => {
    let available = false;
    const handle = makeAgentGatewayHostExtension({
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      loadDescriptors: async () => {
        if (!available) throw new Error("transient catalog failure");
        return descriptors;
      },
    });
    const { session, resourceLoader } = await createSession({
      runtime,
      extensions: [foreignExtension("team_tool"), handle.extension],
    });

    expect(session.getActiveToolNames()).toContain("team_tool");
    expect(session.getActiveToolNames()).not.toContain("browser_open");
    expect(
      resourceLoader
        .getExtensions()
        .errors.map(({ error }) => error)
        .join("\n"),
    ).toContain("transient catalog failure");

    available = true;
    await session.reload();

    expect(session.getActiveToolNames()).toEqual(
      expect.arrayContaining(["team_tool", "browser_open", "harnessos_list_threads"]),
    );
    expect(
      handle.inspectRegistration({
        extensions: resourceLoader.getExtensions(),
        tools: session.getAllTools(),
      }).deliveredToolNames,
    ).toEqual(["browser_open", "harnessos_list_threads"]);
  });

  it("keeps a foreign same-name winner and degrades only the collided Host capability", async () => {
    const handle = makeAgentGatewayHostExtension({
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      loadDescriptors: async () => descriptors,
    });
    const { session, resourceLoader } = await createSession({
      runtime,
      extensions: [foreignExtension("browser_open"), handle.extension],
    });
    const inspection = inspectAgentGatewayHostExtensionRegistration({
      extensions: resourceLoader.getExtensions(),
      tools: session.getAllTools(),
    });

    expect(inspection.deliveredToolNames).toEqual(["harnessos_list_threads"]);
    expect(inspection.collidedToolNames).toEqual(["browser_open"]);
    expect(
      renderDeliveredAgentGatewayHostGuidance({
        descriptors,
        tools: session.getAllTools(),
      }),
    ).not.toContain("thread-scoped in-app page");
    await expect(
      session
        .getToolDefinition("browser_open")!
        .execute("foreign", {}, undefined, undefined, {} as never),
    ).resolves.toMatchObject({ details: { source: "foreign" } });
    expect(() =>
      assertAgentGatewayHostToolsDelivered({
        tools: session.getAllTools(),
        requiredNames: ["browser_open"],
        currentlyExposedNames: new Set(["browser_open"]),
      }),
    ).toThrow("Required OmniMind Host tools are unavailable");
  });

  it("contains an invalid catalog to the Host Extension diagnostic", async () => {
    const handle = makeAgentGatewayHostExtension({
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      loadDescriptors: async () => [descriptors[0], descriptors[0]],
    });
    const { session, resourceLoader } = await createSession({
      runtime,
      extensions: [foreignExtension("team_tool"), handle.extension],
    });
    const inspection = inspectAgentGatewayHostExtensionRegistration({
      extensions: resourceLoader.getExtensions(),
      tools: session.getAllTools(),
    });

    expect(session.getActiveToolNames()).toContain("team_tool");
    expect(inspection.available).toBe(false);
    expect(inspection.diagnostics.join("\n")).toContain("Duplicate AgentGateway tool name");
  });
});
