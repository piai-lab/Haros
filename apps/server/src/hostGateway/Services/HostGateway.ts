/**
 * HostGateway - Haros app-control tool surface for engine agents.
 *
 * Serves the `harnessos_*` MCP tools that let any engine session (Codex,
 * Claude, Grok, ...) inspect and control Haros itself: list projects and
 * threads, read thread status, spawn child threads, send messages, and manage
 * heartbeat automations. The HTTP route delegates every `POST /mcp` request
 * here; authentication and JSON-RPC handling both live behind this interface.
 *
 * @module hostGateway/Services/HostGateway
 */
import { ServiceMap } from "effect";
import type { Effect } from "effect";
import type { BuiltInToolGroupsResult } from "@harnessos/contracts";

export interface HostGatewayHttpResult {
  readonly status: number;
  /** JSON body; omitted for empty (202/405) responses. */
  readonly body?: unknown;
}

export interface HostGatewayShape {
  readonly getBuiltInToolGroups: Effect.Effect<BuiltInToolGroupsResult, unknown>;

  /**
   * Handle one MCP streamable-HTTP POST. All failures are folded into
   * JSON-RPC error responses or HTTP status codes; the effect never fails.
   */
  readonly handleMcpPost: (input: {
    readonly authorizationHeader: string | undefined;
    readonly body: unknown;
  }) => Effect.Effect<HostGatewayHttpResult>;
}

export class HostGateway extends ServiceMap.Service<HostGateway, HostGatewayShape>()(
  "harnessos/hostGateway/Services/HostGateway",
) {}
