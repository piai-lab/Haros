export type HostGatewayJsonRpcRequestId = string | number | null;

export interface HostGatewayInFlightRequestRegistration {
  readonly sessionKey: string;
  readonly turnId: string | null;
  readonly requestId: HostGatewayJsonRpcRequestId;
  readonly cancel: () => Promise<void>;
}

export interface HostGatewayInFlightRequestSelector {
  readonly sessionKey: string;
  readonly turnId?: string;
  readonly requestId?: HostGatewayJsonRpcRequestId;
}

export interface HostGatewayInFlightRequestRegistry {
  readonly register: (registration: HostGatewayInFlightRequestRegistration) => () => void;
  readonly cancel: (selector: HostGatewayInFlightRequestSelector) => HostGatewayCancellation;
  readonly cancelTurn: (sessionKey: string, turnId: string) => HostGatewayCancellation;
  readonly revokeSession: (sessionKey: string) => HostGatewayCancellation;
}

export interface HostGatewayCancellation {
  readonly count: number;
  readonly settled: Promise<void>;
}

interface RegisteredRequest extends HostGatewayInFlightRequestRegistration {
  readonly token: symbol;
}

/**
 * Process-local cancellation ownership for MCP calls.
 *
 * MCP clients are allowed to omit `notifications/cancelled` when their parent
 * operation is interrupted. The engine adapter therefore cancels the turn
 * directly through this registry. Interrupted turn ids are retained for the
 * lifetime of the engine session so a request racing with Stop is cancelled
 * at registration instead of escaping the first cancellation sweep.
 */
export function makeHostGatewayInFlightRequestRegistry(): HostGatewayInFlightRequestRegistry {
  const requests = new Map<symbol, RegisteredRequest>();
  const cancelledTurns = new Map<string, Set<string>>();

  const cancel = (selector: HostGatewayInFlightRequestSelector): HostGatewayCancellation => {
    const matches = Array.from(requests.values()).filter(
      (request) =>
        request.sessionKey === selector.sessionKey &&
        (selector.turnId === undefined || request.turnId === selector.turnId) &&
        (selector.requestId === undefined || request.requestId === selector.requestId),
    );
    for (const request of matches) requests.delete(request.token);
    const cancellations = matches.map((request) => {
      try {
        return request.cancel();
      } catch {
        // Cancellation is best-effort at this synchronous boundary. Each
        // request still owns its cleanup/finalizers and the caller must never
        // be prevented from interrupting the engine turn itself.
        return Promise.resolve();
      }
    });
    return {
      count: matches.length,
      settled: Promise.allSettled(cancellations).then(() => undefined),
    };
  };

  return {
    register: (registration) => {
      if (
        registration.turnId !== null &&
        cancelledTurns.get(registration.sessionKey)?.has(registration.turnId)
      ) {
        void registration.cancel();
        return () => undefined;
      }
      const token = Symbol("host-gateway-in-flight-request");
      requests.set(token, { ...registration, token });
      return () => {
        requests.delete(token);
      };
    },
    cancel,
    cancelTurn: (sessionKey, turnId) => {
      let turns = cancelledTurns.get(sessionKey);
      if (!turns) {
        turns = new Set();
        cancelledTurns.set(sessionKey, turns);
      }
      turns.add(turnId);
      return cancel({ sessionKey, turnId });
    },
    revokeSession: (sessionKey) => {
      const cancelled = cancel({ sessionKey });
      cancelledTurns.delete(sessionKey);
      return cancelled;
    },
  };
}
