import { randomUUID } from "node:crypto";

import { Layer } from "effect";

import {
  AgentGatewaySessionRegistry,
  type AgentGatewaySessionIdentity,
  type AgentGatewaySessionRegistryShape,
  type AgentGatewayTurnAuthority,
} from "../Services/AgentGatewaySessionRegistry.ts";

const ENGINE_SESSION_CAPABILITIES = [
  "thread:read",
  "thread:write",
  "automation:write",
  "diagnostics:read",
  "browser:control",
  "device:control",
] as const;

export function makeAgentGatewaySessionRegistry(options?: {
  readonly now?: () => number;
  readonly randomId?: () => string;
}): AgentGatewaySessionRegistryShape {
  const now = options?.now ?? Date.now;
  const randomId = options?.randomId ?? randomUUID;
  interface RegisteredSession {
    readonly identity: AgentGatewaySessionIdentity;
    retiredTurnId: string | undefined;
  }
  const sessions = new Map<string, RegisteredSession>();
  const sessionsByKey = new Map<string, RegisteredSession>();

  return {
    issue: (threadId, engine) => {
      // Every engine runtime owns an independent credential. Replacement
      // runtimes overlap their predecessor during startup, and the outgoing
      // runtime revokes its own token during teardown. Reusing a token here
      // would therefore let old-session cleanup invalidate the replacement.
      const issuedAt = now();
      const sessionKey = `gateway-session:${randomId()}`;
      const token = `sagw_session_${randomId()}`;
      const identity: AgentGatewaySessionIdentity = {
        sessionKey,
        threadId,
        engine,
        issuedAt,
        capabilities: new Set(ENGINE_SESSION_CAPABILITIES),
      };
      const registered: RegisteredSession = {
        identity,
        retiredTurnId: undefined,
      };
      sessions.set(token, registered);
      sessionsByKey.set(sessionKey, registered);
      return { token, ...identity };
    },
    verify: (token) => sessions.get(token)?.identity ?? null,
    bindTurnAuthority: (token, turnId) => {
      const registered = sessions.get(token);
      if (!registered || registered.retiredTurnId !== undefined) return null;
      const { identity } = registered;
      return {
        sessionKey: identity.sessionKey,
        threadId: identity.threadId,
        engine: identity.engine,
        turnId,
      } satisfies AgentGatewayTurnAuthority;
    },
    verifyTurnAuthority: (authority) => {
      const registered = sessionsByKey.get(authority.sessionKey);
      const identity = registered?.identity;
      return (
        identity !== undefined &&
        registered?.retiredTurnId === undefined &&
        identity.threadId === authority.threadId &&
        identity.engine === authority.engine
      );
    },
    retireTurnAuthority: (token, turnId) => {
      const registered = sessions.get(token);
      if (!registered) return false;
      if (registered.retiredTurnId !== undefined) {
        return registered.retiredTurnId === turnId;
      }
      // Record A even when it never called a gateway tool. This is the
      // critical case: a detached request from A must not arrive during B and
      // become the first request to bind this credential.
      registered.retiredTurnId = turnId;
      return true;
    },
    revoke: (token) => {
      const registered = sessions.get(token);
      if (!registered) return;
      sessions.delete(token);
      sessionsByKey.delete(registered.identity.sessionKey);
    },
  };
}

export const AgentGatewaySessionRegistryLive = Layer.sync(
  AgentGatewaySessionRegistry,
  makeAgentGatewaySessionRegistry,
);
