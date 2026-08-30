/**
 * HostGatewayCredentialsLive - Live layer for HostGateway credentials.
 *
 * Issues opaque in-memory credentials. Tokens live for the engine session,
 * can be revoked independently, and intentionally do not survive a Haros
 * restart.
 *
 * @module hostGateway/Layers/HostGatewayCredentials
 */
import { randomUUID } from "node:crypto";

import { Effect, Layer } from "effect";

import { ServerConfig } from "../../config.ts";
import { formatHostForUrl, isWildcardHost } from "../../startupAccess.ts";
import {
  HostGatewayCredentials,
  type HostGatewayCredentialsShape,
} from "../Services/HostGatewayCredentials.ts";
import { HostGatewaySessionRegistry } from "../Services/HostGatewaySessionRegistry.ts";
import { makeHostGatewayInFlightRequestRegistry } from "../inFlightRequestRegistry.ts";
import { ensureHostGatewayStdioProxyScript } from "../stdioProxyScript.ts";
import { HostGatewaySessionRegistryLive } from "./HostGatewaySessionRegistry.ts";

export const HOST_GATEWAY_MCP_PATH = "/mcp";

interface HostGatewayEndpoint {
  readonly url: string;
  readonly setListeningPort: (listeningPort: number) => void;
}

interface HostGatewayStdioBootstrapRegistry {
  readonly issue: (sessionToken: string) => string | null;
  readonly exchange: (bootstrapToken: string) => string | null;
  readonly revokeSession: (sessionToken: string) => void;
}

const HOST_GATEWAY_STDIO_BOOTSTRAP_TTL_MS = 30_000;

export function makeHostGatewayStdioBootstrapRegistry(input: {
  readonly sessionIsActive: (sessionToken: string) => boolean;
  readonly randomId?: () => string;
  readonly now?: () => number;
  readonly ttlMs?: number;
}): HostGatewayStdioBootstrapRegistry {
  const randomId = input.randomId ?? randomUUID;
  const now = input.now ?? Date.now;
  const ttlMs = Math.max(1, input.ttlMs ?? HOST_GATEWAY_STDIO_BOOTSTRAP_TTL_MS);
  const tokens = new Map<string, { readonly sessionToken: string; readonly expiresAt: number }>();
  return {
    issue: (sessionToken) => {
      if (!input.sessionIsActive(sessionToken)) return null;
      const bootstrapToken = `sagw_bootstrap_${randomId()}`;
      tokens.set(bootstrapToken, { sessionToken, expiresAt: now() + ttlMs });
      return bootstrapToken;
    },
    exchange: (bootstrapToken) => {
      const bootstrap = tokens.get(bootstrapToken);
      if (bootstrap === undefined) return null;
      tokens.delete(bootstrapToken);
      if (bootstrap.expiresAt <= now()) return null;
      return input.sessionIsActive(bootstrap.sessionToken) ? bootstrap.sessionToken : null;
    },
    revokeSession: (sessionToken) => {
      for (const [bootstrapToken, owner] of tokens) {
        if (owner.sessionToken === sessionToken) tokens.delete(bootstrapToken);
      }
    },
  };
}

// Engines run as local child processes, so they must target a host the HTTP
// server actually listens on. Wildcard binds cover loopback; an explicit host
// (e.g. `::1` or a LAN address) does not, so reuse it verbatim.
export function resolveHostGatewayEndpointHost(configHost: string | undefined): string {
  if (configHost === undefined || isWildcardHost(configHost)) {
    return "127.0.0.1";
  }
  return formatHostForUrl(configHost);
}

export function makeHostGatewayEndpoint(
  configHost: string | undefined,
  initialPort: number,
): HostGatewayEndpoint {
  const endpointHost = resolveHostGatewayEndpointHost(configHost);
  let port = initialPort;
  return {
    get url() {
      return `http://${endpointHost}:${port}${HOST_GATEWAY_MCP_PATH}`;
    },
    setListeningPort: (listeningPort: number) => {
      port = listeningPort;
    },
  };
}

export const makeHostGatewayCredentials = Effect.gen(function* () {
  const config = yield* ServerConfig;
  const sessionRegistry = yield* HostGatewaySessionRegistry;
  const inFlightRequests = makeHostGatewayInFlightRequestRegistry();

  const endpoint = makeHostGatewayEndpoint(config.host, config.port);
  const stdioProxyScriptPath = yield* ensureHostGatewayStdioProxyScript(config.stateDir);
  const stdioBootstraps = makeHostGatewayStdioBootstrapRegistry({
    sessionIsActive: (token) => sessionRegistry.verify(token) !== null,
  });

  const issueSessionToken: HostGatewayCredentialsShape["issueSessionToken"] = (threadId, engine) =>
    sessionRegistry.issue(threadId, engine).token;

  const verifySessionToken: HostGatewayCredentialsShape["verifySessionToken"] = (token) =>
    sessionRegistry.verify(token)?.threadId ?? null;

  const revokeSessionToken = (token: string): void => {
    const session = sessionRegistry.verify(token);
    sessionRegistry.revoke(token);
    stdioBootstraps.revokeSession(token);
    if (session) inFlightRequests.revokeSession(session.sessionKey);
  };

  const issueStdioBootstrapToken: HostGatewayCredentialsShape["issueStdioBootstrapToken"] = (
    sessionToken,
  ) => {
    return stdioBootstraps.issue(sessionToken);
  };

  const exchangeStdioBootstrapToken: HostGatewayCredentialsShape["exchangeStdioBootstrapToken"] = (
    bootstrapToken,
  ) => {
    return stdioBootstraps.exchange(bootstrapToken);
  };

  const cancelSessionTurnRequests: HostGatewayCredentialsShape["cancelSessionTurnRequests"] = (
    token,
    turnId,
  ) => {
    const session = sessionRegistry.verify(token);
    if (!session) return Promise.resolve();
    return inFlightRequests.cancelTurn(session.sessionKey, turnId).settled;
  };

  const retireSessionTurn: HostGatewayCredentialsShape["retireSessionTurn"] = (token, turnId) => {
    const session = sessionRegistry.verify(token);
    if (!session) return Promise.resolve();
    // Retire synchronously before exposing the asynchronous drain barrier.
    // Requests racing the terminal event can no longer bind this bearer to B.
    sessionRegistry.retireTurnAuthority(token, turnId);
    return inFlightRequests.cancelTurn(session.sessionKey, turnId).settled;
  };

  return {
    get mcpEndpointUrl() {
      return endpoint.url;
    },
    setListeningPort: endpoint.setListeningPort,
    issueSessionToken,
    verifySessionToken,
    verifySession: sessionRegistry.verify,
    issueStdioBootstrapToken,
    exchangeStdioBootstrapToken,
    bindTurnAuthority: sessionRegistry.bindTurnAuthority,
    verifyTurnAuthority: sessionRegistry.verifyTurnAuthority,
    registerInFlightRequest: inFlightRequests.register,
    cancelInFlightRequests: inFlightRequests.cancel,
    cancelSessionTurnRequests,
    retireSessionTurn,
    revokeSessionToken,
    connectionForThread: (threadId, engine) => ({
      url: endpoint.url,
      bearerToken: issueSessionToken(threadId, engine),
    }),
    stdioProxy: {
      command: process.execPath,
      args: [stdioProxyScriptPath],
    },
  } satisfies HostGatewayCredentialsShape;
});

export const HostGatewayCredentialsLive = Layer.effect(
  HostGatewayCredentials,
  makeHostGatewayCredentials,
).pipe(Layer.provide(HostGatewaySessionRegistryLive));

// Single shared composition so every consumer (HTTP gateway, engine
// adapters) reuses the same memoized in-memory session registry.
export const HostGatewayCredentialsWithSecretsLive = HostGatewayCredentialsLive.pipe(Layer.orDie);
