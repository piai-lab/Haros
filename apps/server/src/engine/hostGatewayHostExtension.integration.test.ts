// FILE: hostGatewayHostExtension.test.ts
// Purpose: Exact Pi conformance for the eager HostGateway Host projection.
// Layer: Engine Extension tests

import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import * as StockPi from "@earendil-works/pi-coding-agent";
import * as OARuntime from "@harnessos/oa-runtime";
import { afterEach, describe, expect, it } from "vitest";

import type { HostGatewayMcpToolDescriptor } from "../hostGateway/mcpInjection.ts";
import {
  assertHostGatewayHostToolsDelivered,
  inspectHostGatewayHostExtensionRegistration,
  makeHostGatewayHostExtension,
  renderDeliveredHostGatewayHostGuidance,
} from "./hostGatewayHostExtension.ts";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const descriptors = [
  {
    name: "browser_open",
    description: "Open a URL in the HarnessOS browser.",
    inputSchema: { type: "object", properties: { url: { type: "string" } } },
    group: "browser",
    provenance: "host-gateway",
  },
  {
    name: "harnessos_list_threads",
    description: "List HarnessOS threads.",
    inputSchema: { type: "object", properties: {} },
    group: "tasks",
    provenance: "host-gateway",
  },
] as const satisfies ReadonlyArray<HostGatewayMcpToolDescriptor>;

type PiRuntime = Pick<
  typeof StockPi,
  "DefaultResourceLoader" | "SessionManager" | "createAgentSession" | "defineTool"
>;

async function createSession(input: {
  readonly runtime: PiRuntime;
  readonly extensions: StockPi.InlineExtension[];
}) {
  const root = mkdtempSync(path.join(tmpdir(), "harnessos-host-extension-"));
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
  ["product", OARuntime as unknown as PiRuntime],
])("eager HostGateway Host projection on %s Pi", (_label, runtime) => {
  it("registers every canonical definition active without touching another owner", async () => {
    const handle = makeHostGatewayHostExtension({
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
    const inspection = inspectHostGatewayHostExtensionRegistration({
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
    let catalog: ReadonlyArray<HostGatewayMcpToolDescriptor> = [descriptors[0]];
    let factoryCalls = 0;
    const handle = makeHostGatewayHostExtension({
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
    const handle = makeHostGatewayHostExtension({
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
    const handle = makeHostGatewayHostExtension({
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      loadDescriptors: async () => descriptors,
    });
    const { session, resourceLoader } = await createSession({
      runtime,
      extensions: [foreignExtension("browser_open"), handle.extension],
    });
    const inspection = inspectHostGatewayHostExtensionRegistration({
      extensions: resourceLoader.getExtensions(),
      tools: session.getAllTools(),
    });

    expect(inspection.deliveredToolNames).toEqual(["harnessos_list_threads"]);
    expect(inspection.collidedToolNames).toEqual(["browser_open"]);
    expect(
      renderDeliveredHostGatewayHostGuidance({
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
      assertHostGatewayHostToolsDelivered({
        tools: session.getAllTools(),
        requiredNames: ["browser_open"],
        currentlyExposedNames: new Set(["browser_open"]),
      }),
    ).toThrow("Required HarnessOS Host tools are unavailable");
  });

  it("contains an invalid catalog to the Host Extension diagnostic", async () => {
    const handle = makeHostGatewayHostExtension({
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      loadDescriptors: async () => [descriptors[0], descriptors[0]],
    });
    const { session, resourceLoader } = await createSession({
      runtime,
      extensions: [foreignExtension("team_tool"), handle.extension],
    });
    const inspection = inspectHostGatewayHostExtensionRegistration({
      extensions: resourceLoader.getExtensions(),
      tools: session.getAllTools(),
    });

    expect(session.getActiveToolNames()).toContain("team_tool");
    expect(inspection.available).toBe(false);
    expect(inspection.diagnostics.join("\n")).toContain("Duplicate HostGateway tool name");
  });
});
