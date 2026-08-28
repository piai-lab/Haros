/**
 * HostGatewayCredentials - Per-session credentials for the HarnessOS agent
 * gateway.
 *
 * Small service split out from the gateway itself so engine adapters can
 * mint MCP connection details (endpoint URL + bearer token) at session start
 * without depending on the full tool surface.
 *
 * @module hostGateway/Services/HostGatewayCredentials
 */
import type { EngineKind, ThreadId } from "@harnessos/contracts";
import { ServiceMap } from "effect";
import type {
  HostGatewaySessionIdentity,
  HostGatewayTurnAuthority,
} from "./HostGatewaySessionRegistry.ts";
import type {
  HostGatewayCancellation,
  HostGatewayInFlightRequestRegistration,
  HostGatewayInFlightRequestSelector,
} from "../inFlightRequestRegistry.ts";

export interface HostGatewayMcpConnection {
  /** Loopback streamable-HTTP MCP endpoint, e.g. `http://127.0.0.1:3773/mcp`. */
  readonly url: string;
  /** Bearer token bound to the calling thread. */
  readonly bearerToken: string;
}

export interface HostGatewayStdioProxySpawn {
  /** Interpreter (the server's own node/bun binary). */
  readonly command: string;
  /** Script arguments (path to the generated proxy script). */
  readonly args: ReadonlyArray<string>;
}

export interface HostGatewayCredentialsShape {
  /** Streamable-HTTP MCP endpoint served by this HarnessOS instance. */
  readonly mcpEndpointUrl: string;
  /** Update the endpoint after the HTTP server resolves a dynamic listen port. */
  readonly setListeningPort: (port: number) => void;
  /** Mint a new opaque bearer token for one engine session. */
  readonly issueSessionToken: (threadId: ThreadId, engine: EngineKind) => string;
  /** Resolve a live bearer token back to its thread id, or null when invalid. */
  readonly verifySessionToken: (token: string) => string | null;
  /** Resolve the complete non-secret invocation scope. */
  readonly verifySession: (token: string) => HostGatewaySessionIdentity | null;
  /**
   * Mint a one-shot credential that a stdio proxy can exchange for the
   * session bearer without exposing that bearer to the engine process.
   */
  readonly issueStdioBootstrapToken: (sessionToken: string) => string | null;
  /** Consume one stdio bootstrap credential exactly once. */
  readonly exchangeStdioBootstrapToken: (bootstrapToken: string) => string | null;
  /** Pin one request/batch to the exact running turn observed at ingress. */
  readonly bindTurnAuthority: (token: string, turnId: string) => HostGatewayTurnAuthority | null;
  /** Recheck that a previously bound authority still belongs to a live session. */
  readonly verifyTurnAuthority: (authority: HostGatewayTurnAuthority) => boolean;
  /** Register one MCP request under its exact engine session and turn. */
  readonly registerInFlightRequest: (
    registration: HostGatewayInFlightRequestRegistration,
  ) => () => void;
  /** Cancel matching requests, used by MCP `notifications/cancelled`. */
  readonly cancelInFlightRequests: (
    selector: HostGatewayInFlightRequestSelector,
  ) => HostGatewayCancellation;
  /** Cancel an entire engine turn even when the MCP client emits no notification. */
  readonly cancelSessionTurnRequests: (token: string, turnId: string) => Promise<void>;
  /**
   * Tombstone one terminal turn and permanently prevent this bearer from
   * acquiring tool-call authority for any later turn. Authority retirement must
   * happen synchronously; the promise represents only in-flight drainage.
   */
  readonly retireSessionTurn: (token: string, turnId: string) => Promise<void>;
  /** Revoke exactly one engine session credential. */
  readonly revokeSessionToken: (token: string) => void;
  /** Convenience bundle used when injecting MCP config into engine sessions. */
  readonly connectionForThread: (
    threadId: ThreadId,
    engine: EngineKind,
  ) => HostGatewayMcpConnection;
  /** Spawn spec for the stdio->HTTP proxy used by stdio-only MCP clients. */
  readonly stdioProxy: HostGatewayStdioProxySpawn;
}

export class HostGatewayCredentials extends ServiceMap.Service<
  HostGatewayCredentials,
  HostGatewayCredentialsShape
>()("harnessos/hostGateway/Services/HostGatewayCredentials") {}
