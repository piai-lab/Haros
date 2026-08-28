import {
  ThreadId,
  type BrowserToolName,
  type OrchestrationThreadShell,
  type EngineKind,
} from "@harnessos/contracts";
import { Effect, Option } from "effect";

import { makeAgentGatewayBrowserTools } from "../../src/agentGateway/browserTools";
import { makeAgentGatewayInFlightRequestRegistry } from "../../src/agentGateway/inFlightRequestRegistry";
import { makeAgentGatewayMcpTransport } from "../../src/agentGateway/mcpTransport";
import { makeAgentGatewaySessionRegistry } from "../../src/agentGateway/Layers/AgentGatewaySessionRegistry";
import { makeBrowserAutomationHost } from "../../src/browserAutomation/Layers/BrowserAutomationHost";

const PROVIDER: EngineKind = "codex";

export interface McpCallResult {
  readonly content: ReadonlyArray<Record<string, unknown>>;
  readonly structuredContent: Record<string, unknown>;
}

export interface BrowserMcpHarness {
  readonly initialize: () => Promise<Record<string, unknown>>;
  readonly listTools: () => Promise<ReadonlyArray<Record<string, unknown>>>;
  readonly call: (name: BrowserToolName, args?: Record<string, unknown>) => Promise<McpCallResult>;
  readonly cancelCall: (name: BrowserToolName, args?: Record<string, unknown>) => Promise<void>;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected an MCP object response.");
  }
  return value as Record<string, unknown>;
}

export function createBrowserMcpHarness(input: {
  readonly pipePath: string;
  readonly capability: string;
  readonly threadId: string;
  readonly workspaceRoot: string;
}): BrowserMcpHarness {
  const threadId = ThreadId.makeUnsafe(input.threadId);
  const registry = makeAgentGatewaySessionRegistry();
  const inFlightRequests = makeAgentGatewayInFlightRequestRegistry();
  const issued = registry.issue(threadId, PROVIDER);
  const credentials = {
    verifySession: registry.verify,
    bindTurnAuthority: registry.bindTurnAuthority,
    verifyTurnAuthority: registry.verifyTurnAuthority,
    registerInFlightRequest: inFlightRequests.register,
    cancelInFlightRequests: inFlightRequests.cancel,
  } satisfies Parameters<typeof makeAgentGatewayMcpTransport>[0]["credentials"];
  const shell = {
    id: threadId,
    modelSelection: { provider: PROVIDER, model: "e2e-fixture" },
    session: { providerName: PROVIDER },
    latestTurn: { turnId: "turn-visible-browser-e2e", state: "running" },
  } as unknown as OrchestrationThreadShell;
  const snapshotQuery = {
    getThreadShellById: () => Effect.succeed(Option.some(shell)),
  } as never;
  const tools = makeAgentGatewayBrowserTools(
    makeBrowserAutomationHost({
      HARNESSOS_BROWSER_HOST_PIPE_PATH: input.pipePath,
      HARNESSOS_BROWSER_HOST_CAPABILITY: input.capability,
    }),
    { resolveWorkspaceRoot: () => Effect.succeed(input.workspaceRoot) },
  );
  const handle = makeAgentGatewayMcpTransport({
    credentials,
    snapshotQuery,
    tools,
    instructions: "Visible browser Electron E2E",
    requireThreadShell: () => Effect.succeed(shell),
  });
  let sequence = 0;

  function nextRequestId(): string {
    sequence += 1;
    return `visible-browser-e2e-${sequence}`;
  }

  async function request(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const id = nextRequestId();
    const response = await Effect.runPromise(
      handle({
        authorizationHeader: `Bearer ${issued.token}`,
        body: { jsonrpc: "2.0", id, method, ...(params ? { params } : {}) },
      }),
    );
    if (response.status !== 200) throw new Error(`MCP returned HTTP ${response.status}.`);
    const envelope = asRecord(response.body);
    if (envelope.id !== id || "error" in envelope) {
      throw new Error(`MCP JSON-RPC failure: ${JSON.stringify(envelope)}`);
    }
    return asRecord(envelope.result);
  }

  return {
    initialize: () =>
      request("initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "visible-browser-e2e", version: "1.0.0" },
      }),
    listTools: async () => {
      const result = await request("tools/list");
      if (!Array.isArray(result.tools)) throw new Error("MCP tools/list omitted tools.");
      return result.tools.map(asRecord);
    },
    call: async (name, args = {}) => {
      const result = await request("tools/call", { name, arguments: args });
      if (result.isError === true) throw new Error(`MCP tool failure: ${JSON.stringify(result)}`);
      return {
        content: Array.isArray(result.content) ? result.content.map(asRecord) : [],
        structuredContent: asRecord(result.structuredContent),
      };
    },
    cancelCall: async (name, args = {}) => {
      const id = nextRequestId();
      const response = await Effect.runPromise(
        handle({
          authorizationHeader: `Bearer ${issued.token}`,
          body: [
            {
              jsonrpc: "2.0",
              id,
              method: "tools/call",
              params: { name, arguments: args },
            },
            {
              jsonrpc: "2.0",
              method: "notifications/cancelled",
              params: { requestId: id, reason: "visible Electron E2E cancellation" },
            },
          ],
        }),
      );
      if (response.status !== 202) {
        throw new Error(`Cancelled MCP request returned HTTP ${response.status}.`);
      }
    },
  };
}
