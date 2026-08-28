import type { EngineKind, ThreadId } from "@harnessos/contracts";
import { Effect, Exit } from "effect";

import type {
  HostGatewayCredentialsShape,
  HostGatewayMcpConnection,
} from "./Services/HostGatewayCredentials.ts";

type HostGatewaySessionLeaseCredentials = Pick<
  HostGatewayCredentialsShape,
  "connectionForThread" | "revokeSessionToken"
> &
  Partial<
    Pick<
      HostGatewayCredentialsShape,
      "cancelSessionTurnRequests" | "issueStdioBootstrapToken" | "retireSessionTurn"
    >
  >;

export const HOST_GATEWAY_CREDENTIAL_ROTATION_REQUIRED = "hostGatewayCredentialRotationRequired";
export const HOST_GATEWAY_TURN_AUTHORITY_RETIRED = "harnessosGatewayTurnAuthorityRetired";

/**
 * One engine runtime's ownership of one gateway credential.
 *
 * Release is intentionally idempotent. Engine startup and teardown have
 * overlapping cleanup paths (scope finalizers, process exits, explicit stops,
 * and replacement sessions); whichever path wins revokes the credential once
 * and every later path becomes a no-op.
 */
export interface HostGatewaySessionLease {
  readonly connection: HostGatewayMcpConnection;
  /** Mint a fresh one-shot proxy credential for a engine turn. */
  readonly issueStdioBootstrapToken?: () => string | null;
  readonly cancelTurn: (turnId: string) => Promise<void>;
  /**
   * Permanently retire tool-call authority for a terminal turn while leaving the
   * engine runtime available to drain background work. The admission fence
   * is synchronous; the promise represents only request drainage.
   */
  readonly retireTurn: (turnId: string) => Promise<void>;
  readonly release: () => void;
}

const HOST_GATEWAY_TURN_CANCELLATION_TIMEOUT = "2 seconds";

function awaitHostGatewayTurnCancellation(
  turnId: string,
  cancellation: Promise<void>,
): Effect.Effect<void> {
  return Effect.tryPromise({
    try: () => cancellation,
    catch: (cause) => cause,
  }).pipe(
    Effect.timeoutOrElse({
      duration: HOST_GATEWAY_TURN_CANCELLATION_TIMEOUT,
      onTimeout: () =>
        Effect.logWarning("host_gateway.turn_cancellation_timeout", {
          turnId,
          timeout: HOST_GATEWAY_TURN_CANCELLATION_TIMEOUT,
        }),
    }),
    Effect.catchCause((cause) =>
      Effect.logWarning("host_gateway.turn_cancellation_failed", { turnId, cause }),
    ),
    Effect.asVoid,
  );
}

function startHostGatewayTurnCancellation(
  lease: HostGatewaySessionLease,
  turnId: string,
): Effect.Effect<Promise<void>> {
  return Effect.try({
    try: () => lease.cancelTurn(turnId),
    catch: (cause) => cause,
  }).pipe(
    Effect.catch((cause) =>
      Effect.logWarning("host_gateway.turn_cancellation_failed", { turnId, cause }).pipe(
        Effect.as(Promise.resolve()),
      ),
    ),
  );
}

/**
 * Tombstone one exact gateway turn and wait for every matching MCP request to
 * observe its AbortSignal. Cleanup failures are deliberately logged instead
 * of replacing the engine-native interrupt result.
 */
export function cancelHostGatewayTurn(
  lease: HostGatewaySessionLease | undefined,
  turnId: string | undefined,
): Effect.Effect<void> {
  if (lease === undefined || turnId === undefined) return Effect.void;

  return startHostGatewayTurnCancellation(lease, turnId).pipe(
    Effect.flatMap((cancellation) => awaitHostGatewayTurnCancellation(turnId, cancellation)),
  );
}

/**
 * Run the engine-native stop and gateway stop concurrently, but do not let
 * an early engine failure interrupt the gateway cleanup. The caller gets the
 * original engine result only after the gateway cancellation barrier settles.
 */
export function withHostGatewayTurnCancellation<A, E, R>(
  lease: HostGatewaySessionLease | undefined,
  turnId: string | undefined,
  engineInterrupt: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> {
  if (lease === undefined) return engineInterrupt;

  return Effect.gen(function* () {
    // Tombstone synchronously before the engine side can release the lease;
    // the returned promise then drains concurrently with the native interrupt.
    const cancellation =
      turnId === undefined ? undefined : yield* startHostGatewayTurnCancellation(lease, turnId);
    // The bearer is session-scoped and cannot prove whether a late MCP call
    // originated in this interrupted turn or a later one. Revoke it before
    // the native interrupt starts; EngineService retires this runtime and
    // lazily resumes it with a fresh lease before the next main turn. A
    // background child may outlive its parent turn; without an exact turn id,
    // session revocation is still required and drains every in-flight request.
    const releaseExit = yield* Effect.exit(Effect.sync(lease.release));
    const [providerExit] = yield* Effect.all(
      [
        Effect.exit(engineInterrupt),
        turnId === undefined || cancellation === undefined
          ? Effect.void
          : awaitHostGatewayTurnCancellation(turnId, cancellation),
      ] as const,
      { concurrency: "unbounded" },
    );
    if (Exit.isFailure(providerExit)) {
      return yield* Effect.failCause(providerExit.cause);
    }
    if (Exit.isFailure(releaseExit)) {
      return yield* Effect.failCause(releaseExit.cause);
    }
    return providerExit.value;
  });
}

export function acquireHostGatewaySessionLease(
  credentials: HostGatewaySessionLeaseCredentials | undefined,
  threadId: ThreadId,
  engine: EngineKind,
): HostGatewaySessionLease | undefined {
  if (credentials === undefined) return undefined;

  const connection = credentials.connectionForThread(threadId, engine);
  let released = false;

  return {
    connection,
    issueStdioBootstrapToken: () => {
      if (released) return null;
      return credentials.issueStdioBootstrapToken?.(connection.bearerToken) ?? null;
    },
    cancelTurn: (turnId) => {
      if (released) return Promise.resolve();
      return (
        credentials.cancelSessionTurnRequests?.(connection.bearerToken, turnId) ?? Promise.resolve()
      );
    },
    retireTurn: (turnId) => {
      if (released) return Promise.resolve();
      return (
        credentials.retireSessionTurn?.(connection.bearerToken, turnId) ??
        credentials.cancelSessionTurnRequests?.(connection.bearerToken, turnId) ??
        Promise.resolve()
      );
    },
    release: () => {
      if (released) return;
      released = true;
      credentials.revokeSessionToken(connection.bearerToken);
    },
  };
}

/**
 * Revoke a lease when a engine process exits even if its adapter receives no
 * final protocol event. The watcher is detached because adapter-owned scopes
 * are themselves closed by normal teardown; the idempotent lease reconciles
 * whichever signal (explicit stop or process exit) arrives first.
 */
export function startHostGatewaySessionLeaseExitWatcher(
  lease: HostGatewaySessionLease | undefined,
  awaitProviderExit: Effect.Effect<void>,
): Effect.Effect<void> {
  if (lease === undefined) return Effect.void;
  return awaitProviderExit.pipe(
    Effect.andThen(Effect.sync(lease.release)),
    Effect.forkDetach,
    Effect.asVoid,
  );
}

/** Guard engine startup awaits until the lease has an installed session owner. */
export function releaseHostGatewaySessionLeaseOnInterrupt<A, E, R>(
  lease: HostGatewaySessionLease | undefined,
  startup: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> {
  if (lease === undefined) return startup;
  return startup.pipe(Effect.onInterrupt(() => Effect.sync(lease.release)));
}
