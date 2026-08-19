// FILE: agentGatewayHostExtension.test.ts
// Purpose: Conformance coverage for Pi-owned registry and Host-owned dynamic activation.
// Layer: Provider Extension tests

import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import * as StockPi from "@earendil-works/pi-coding-agent";
import * as ProductPi from "@omnimind/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";

import type { AgentGatewayMcpToolDescriptor } from "../agentGateway/mcpInjection.ts";
import {
  AGENT_GATEWAY_HOST_EXTENSION_PATH,
  AGENT_GATEWAY_HOST_LOADER_NAME,
  deactivateUnavailableAgentGatewayHostProjection,
  inspectAgentGatewayHostExtensionRegistration,
  makeAgentGatewayHostExtension,
  type AgentGatewayHostDiagnostic,
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
    name: "omnimind_list_threads",
    description: "List OmniMind threads.",
    inputSchema: { type: "object", properties: {} },
    group: "omnimind",
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
  readonly customTools?: StockPi.ToolDefinition[];
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
    ...(input.customTools === undefined ? {} : { customTools: input.customTools }),
  });
  await created.session.bindExtensions({ mode: "print" });
  return created;
}

function foreignExtension(input: {
  readonly name: string;
  readonly toolNames: ReadonlyArray<string>;
  readonly deactivateOnStart?: boolean;
}): StockPi.InlineExtension {
  return {
    name: input.name,
    hidden: true,
    factory: (pi) => {
      for (const name of input.toolNames) {
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
      }
      if (input.deactivateOnStart) {
        pi.on("session_start", () => {
          const names = new Set(input.toolNames);
          pi.setActiveTools(pi.getActiveTools().filter((name) => !names.has(name)));
        });
      }
    },
  };
}

describe.each([
  ["stock", StockPi as PiRuntime],
  ["product", ProductPi as unknown as PiRuntime],
])("AgentGateway Host Extension on %s Pi", (_label, runtime) => {
  it("deactivates only its owned searchable subset and activates matches additively", async () => {
    const calls: Array<{ readonly body: unknown; readonly signal: AbortSignal | null }> = [];
    const fetch = async (_request: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { readonly id: string };
      calls.push({ body, signal: init?.signal ?? null });
      return Response.json({
        jsonrpc: "2.0",
        id: body.id,
        result: { content: [{ type: "text", text: "opened" }] },
      });
    };
    const handle = makeAgentGatewayHostExtension({
      descriptors,
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      fetch,
    });
    expect(handle).not.toBeNull();
    if (!handle) throw new Error("expected Host Extension");

    const { session } = await createSession({ runtime, extensions: [handle.extension] });
    const allTools = session.getAllTools();
    for (const name of [...handle.candidateToolNames, handle.loaderName]) {
      expect(allTools.find((tool) => tool.name === name)?.sourceInfo.path).toBe(
        AGENT_GATEWAY_HOST_EXTENSION_PATH,
      );
    }
    const initialActive = session.getActiveToolNames();
    expect(initialActive).toContain(AGENT_GATEWAY_HOST_LOADER_NAME);
    expect(initialActive).not.toContain("browser_open");
    expect(initialActive).not.toContain("omnimind_list_threads");

    const loader = session.agent.state.tools.find(
      (tool) => tool.name === AGENT_GATEWAY_HOST_LOADER_NAME,
    );
    expect(loader).toBeDefined();
    const result = await loader!.execute(
      "load-browser",
      { query: "open browser" },
      undefined,
      undefined,
    );
    expect(result.details).toEqual({ matches: ["browser_open"], added: ["browser_open"] });
    expect(result.addedToolNames).toEqual(["browser_open"]);
    expect(session.getActiveToolNames()).toEqual(
      expect.arrayContaining([...initialActive, "browser_open"]),
    );
    expect(session.getActiveToolNames()).not.toContain("omnimind_list_threads");
    expect(JSON.stringify(result)).not.toContain("inputSchema");

    const controller = new AbortController();
    await expect(
      session
        .getToolDefinition("browser_open")!
        .execute(
          "open-browser",
          { url: "https://example.com" },
          controller.signal,
          undefined,
          {} as never,
        ),
    ).resolves.toMatchObject({ content: [{ type: "text", text: "opened" }] });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.signal).toBe(controller.signal);
    expect(calls[0]?.body).toMatchObject({
      method: "tools/call",
      params: { name: "browser_open", arguments: { url: "https://example.com" } },
    });
  });

  it("keeps a foreign same-name winner opaque and degrades only the collided claim", async () => {
    const diagnostics: AgentGatewayHostDiagnostic[] = [];
    const handle = makeAgentGatewayHostExtension({
      descriptors,
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });
    if (!handle) throw new Error("expected Host Extension");
    const foreign = foreignExtension({
      name: "foreign-browser",
      toolNames: ["browser_open"],
      deactivateOnStart: true,
    });
    const { session } = await createSession({
      runtime,
      extensions: [foreign, handle.extension],
    });

    expect(
      session.getAllTools().find((tool) => tool.name === "browser_open")?.sourceInfo.path,
    ).toBe("<inline:foreign-browser>");
    expect(diagnostics).toContainEqual({ kind: "tool-collision", name: "browser_open" });
    expect(session.getActiveToolNames()).not.toContain("browser_open");

    const loader = session.getToolDefinition(AGENT_GATEWAY_HOST_LOADER_NAME)!;
    const result = await loader.execute(
      "load-collided-browser",
      { query: "open browser" },
      undefined,
      undefined,
      {} as never,
    );
    expect(result.details).toEqual({ matches: [], added: [] });
    expect(session.getActiveToolNames()).not.toContain("browser_open");
  });

  it("does not stop the Session or rewrite active tools when the loader name collides", async () => {
    const diagnostics: AgentGatewayHostDiagnostic[] = [];
    const handle = makeAgentGatewayHostExtension({
      descriptors,
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });
    if (!handle) throw new Error("expected Host Extension");
    const foreign = foreignExtension({
      name: "foreign-loader",
      toolNames: [AGENT_GATEWAY_HOST_LOADER_NAME],
    });
    const { session } = await createSession({
      runtime,
      extensions: [foreign, handle.extension],
    });

    expect(diagnostics).toContainEqual({
      kind: "loader-collision",
      name: AGENT_GATEWAY_HOST_LOADER_NAME,
    });
    expect(session.getActiveToolNames()).toContain(AGENT_GATEWAY_HOST_LOADER_NAME);
    expect(session.getActiveToolNames()).toContain("browser_open");
    expect(session.getActiveToolNames()).toContain("omnimind_list_threads");
    expect(
      session.getAllTools().find((tool) => tool.name === AGENT_GATEWAY_HOST_LOADER_NAME)?.sourceInfo
        .path,
    ).toBe("<inline:foreign-loader>");

    const inspection = inspectAgentGatewayHostExtensionRegistration({
      extensions: session.resourceLoader.getExtensions(),
      candidateToolNames: handle.candidateToolNames,
    });
    expect(inspection.available).toBe(false);
    expect(
      deactivateUnavailableAgentGatewayHostProjection({
        session,
        candidateToolNames: handle.candidateToolNames,
      }),
    ).toEqual(expect.arrayContaining(["browser_open", "omnimind_list_threads"]));
    expect(session.getActiveToolNames()).toContain(AGENT_GATEWAY_HOST_LOADER_NAME);
    expect(session.getActiveToolNames()).not.toContain("browser_open");
    expect(session.getActiveToolNames()).not.toContain("omnimind_list_threads");
  });

  it("removes an empty Host loader without disabling foreign collided winners", async () => {
    const handle = makeAgentGatewayHostExtension({
      descriptors,
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
    });
    if (!handle) throw new Error("expected Host Extension");
    const foreign = foreignExtension({
      name: "foreign-host-names",
      toolNames: handle.candidateToolNames,
    });
    const { session } = await createSession({
      runtime,
      extensions: [foreign, handle.extension],
    });

    const inspection = inspectAgentGatewayHostExtensionRegistration({
      extensions: session.resourceLoader.getExtensions(),
      candidateToolNames: handle.candidateToolNames,
    });
    expect(inspection).toMatchObject({ available: false, ownedToolNames: [] });
    expect(session.getActiveToolNames()).toEqual(
      expect.arrayContaining([...handle.candidateToolNames, AGENT_GATEWAY_HOST_LOADER_NAME]),
    );
    expect(
      deactivateUnavailableAgentGatewayHostProjection({
        session,
        candidateToolNames: handle.candidateToolNames,
      }),
    ).toEqual([AGENT_GATEWAY_HOST_LOADER_NAME]);
    expect(session.getActiveToolNames()).toEqual(
      expect.arrayContaining([...handle.candidateToolNames]),
    );
    expect(session.getActiveToolNames()).not.toContain(AGENT_GATEWAY_HOST_LOADER_NAME);
  });

  it("does not claim or deactivate a customTools winner with the same name", async () => {
    const diagnostics: AgentGatewayHostDiagnostic[] = [];
    const handle = makeAgentGatewayHostExtension({
      descriptors,
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });
    if (!handle) throw new Error("expected Host Extension");
    const customBrowser = runtime.defineTool({
      name: "browser_open",
      label: "Custom browser",
      description: "Custom browser winner",
      parameters: { type: "object", properties: {} } as StockPi.ToolDefinition["parameters"],
      execute: async () => ({
        content: [{ type: "text", text: "custom" }],
        details: { source: "custom" },
      }),
    });
    const { session } = await createSession({
      runtime,
      extensions: [handle.extension],
      customTools: [customBrowser],
    });

    const winner = session.getAllTools().find((tool) => tool.name === "browser_open");
    expect(winner?.sourceInfo.path).not.toBe(AGENT_GATEWAY_HOST_EXTENSION_PATH);
    expect(diagnostics).toContainEqual({ kind: "tool-collision", name: "browser_open" });
    expect(session.getActiveToolNames()).toContain("browser_open");
  });

  it("intersects loader matches with the current policy snapshot", async () => {
    const handle = makeAgentGatewayHostExtension({
      descriptors,
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      loadCurrentlyExposedToolNames: async () => new Set(["omnimind_list_threads"]),
    });
    if (!handle) throw new Error("expected Host Extension");
    const { session } = await createSession({ runtime, extensions: [handle.extension] });
    const loader = session.agent.state.tools.find(
      (tool) => tool.name === AGENT_GATEWAY_HOST_LOADER_NAME,
    )!;
    const browser = await loader.execute(
      "disabled-browser",
      { query: "open browser" },
      undefined,
      undefined,
    );
    expect(browser.details).toEqual({ matches: [], added: [] });
    expect(session.getActiveToolNames()).not.toContain("browser_open");
  });

  it("does not treat an active schema as live Gateway authorization", async () => {
    let authorized = true;
    const fetch = async (_request: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { readonly id: string };
      return Response.json({
        jsonrpc: "2.0",
        id: body.id,
        result: authorized
          ? { content: [{ type: "text", text: "opened" }] }
          : {
              isError: true,
              content: [{ type: "text", text: "Browser is disabled by current policy." }],
            },
      });
    };
    const handle = makeAgentGatewayHostExtension({
      descriptors,
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool) => runtime.defineTool(tool),
      fetch,
    });
    if (!handle) throw new Error("expected Host Extension");
    const { session } = await createSession({ runtime, extensions: [handle.extension] });
    const loader = session.getToolDefinition(AGENT_GATEWAY_HOST_LOADER_NAME)!;
    await loader.execute(
      "load-browser",
      { query: "open browser" },
      undefined,
      undefined,
      {} as never,
    );
    expect(session.getActiveToolNames()).toContain("browser_open");

    authorized = false;
    await expect(
      session
        .getToolDefinition("browser_open")!
        .execute("stale-browser", {}, undefined, undefined, {} as never),
    ).rejects.toThrow("Browser is disabled by current policy.");
    expect(session.getActiveToolNames()).toContain("browser_open");
  });
});

describe("AgentGateway Host Extension catalog admission", () => {
  it("rejects untrusted and duplicate descriptors and omits an empty shell", () => {
    const base = {
      connection: { url: "http://127.0.0.1:3773/mcp", bearerToken: "test-token" },
      defineTool: (tool: StockPi.ToolDefinition) => tool,
    };
    expect(makeAgentGatewayHostExtension({ ...base, descriptors: [] })).toBeNull();
    expect(() =>
      makeAgentGatewayHostExtension({
        ...base,
        descriptors: [
          {
            name: descriptors[0].name,
            description: descriptors[0].description,
            inputSchema: descriptors[0].inputSchema,
            group: descriptors[0].group,
          },
        ],
      }),
    ).toThrow("Untrusted AgentGateway tool descriptor");
    expect(() =>
      makeAgentGatewayHostExtension({
        ...base,
        descriptors: [descriptors[0], descriptors[0]],
      }),
    ).toThrow("Duplicate AgentGateway tool name");
  });
});
