import type { EngineKind, ThreadId } from "@harnessos/contracts";
import { ServiceMap } from "effect";

export type HostGatewayCapability =
  | "thread:read"
  | "thread:write"
  | "automation:write"
  | "diagnostics:read"
  | "browser:control"
  | "device:control";

export interface HostGatewaySessionIdentity {
  readonly sessionKey: string;
  readonly threadId: ThreadId;
  readonly engine: EngineKind;
  readonly issuedAt: number;
  readonly capabilities: ReadonlySet<HostGatewayCapability>;
}

export interface HostGatewayIssuedSession extends HostGatewaySessionIdentity {
  readonly token: string;
}

/**
 * Non-secret authority captured when an MCP HTTP request enters the gateway.
 *
 * Engine-session credentials can survive across turns until their adapter
 * explicitly retires them. Tool-call authority is narrower: one request/batch is
 * pinned to the exact running turn observed at ingress and must never be
 * rebound to a later `latestTurn` while it executes.
 */
export interface HostGatewayTurnAuthority {
  readonly sessionKey: string;
  readonly threadId: ThreadId;
  readonly engine: EngineKind;
  readonly turnId: string;
}

export interface HostGatewaySessionRegistryShape {
  readonly issue: (threadId: ThreadId, engine: EngineKind) => HostGatewayIssuedSession;
  readonly verify: (token: string) => HostGatewaySessionIdentity | null;
  readonly bindTurnAuthority: (token: string, turnId: string) => HostGatewayTurnAuthority | null;
  readonly verifyTurnAuthority: (authority: HostGatewayTurnAuthority) => boolean;
  /**
   * Permanently retire this credential's authority for one terminal turn.
   *
   * A engine-session bearer may authenticate MCP discovery traffic for the
   * rest of its runtime, but it can never acquire tool-call authority for a
   * later turn after this transition.
   */
  readonly retireTurnAuthority: (token: string, turnId: string) => boolean;
  readonly revoke: (token: string) => void;
}

export class HostGatewaySessionRegistry extends ServiceMap.Service<
  HostGatewaySessionRegistry,
  HostGatewaySessionRegistryShape
>()("harnessos/hostGateway/Services/HostGatewaySessionRegistry") {}
