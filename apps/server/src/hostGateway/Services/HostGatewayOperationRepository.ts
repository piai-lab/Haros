import { ServiceMap } from "effect";
import type { Effect } from "effect";

export type HostGatewayOperationStatus =
  | "reserved"
  | "dispatching"
  | "completed"
  | "failed"
  | "compensating";

export interface HostGatewayOperationRecord {
  readonly operationId: string;
  readonly callerThreadId: string;
  readonly callerTurnId: string;
  readonly operationKind: "create_threads";
  readonly requestId: string;
  readonly fingerprint: string;
  readonly requestedCount: number;
  readonly planJson: string;
  readonly status: HostGatewayOperationStatus;
  readonly resultJson: string | null;
  readonly errorJson: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ReserveHostGatewayOperationResult =
  | { readonly kind: "reserved"; readonly operation: HostGatewayOperationRecord }
  | { readonly kind: "replay"; readonly operation: HostGatewayOperationRecord }
  | { readonly kind: "idempotency_conflict"; readonly operation: HostGatewayOperationRecord }
  | { readonly kind: "creation_plan_locked"; readonly operation: HostGatewayOperationRecord };

export interface ReserveHostGatewayOperationInput {
  readonly operationId: string;
  readonly callerThreadId: string;
  readonly callerTurnId: string;
  readonly operationKind: "create_threads";
  readonly requestId: string;
  readonly fingerprint: string;
  readonly requestedCount: number;
  readonly planJson: string;
  readonly now: string;
}

export interface HostGatewayOperationRepositoryShape {
  readonly reserve: (
    input: ReserveHostGatewayOperationInput,
  ) => Effect.Effect<ReserveHostGatewayOperationResult, Error>;
  readonly markDispatching: (input: {
    readonly operationId: string;
    readonly now: string;
  }) => Effect.Effect<boolean, Error>;
  readonly recordWorktreeCreated: (input: {
    readonly operationId: string;
    readonly index: number;
    readonly workspaceRoot: string;
    readonly path: string;
    readonly branch: string | null;
    readonly token: string;
    readonly gitDir: string;
    readonly head: string;
    readonly stateHash?: string;
    readonly now: string;
  }) => Effect.Effect<boolean, Error>;
  readonly markCompensating: (input: {
    readonly operationId: string;
    readonly now: string;
  }) => Effect.Effect<void, Error>;
  readonly recordCompensationFailure: (input: {
    readonly operationId: string;
    readonly errorJson: string;
    readonly now: string;
  }) => Effect.Effect<void, Error>;
  readonly complete: (input: {
    readonly operationId: string;
    readonly resultJson: string;
    readonly now: string;
  }) => Effect.Effect<void, Error>;
  readonly fail: (input: {
    readonly operationId: string;
    readonly errorJson: string;
    readonly now: string;
  }) => Effect.Effect<void, Error>;
  readonly getById: (
    operationId: string,
  ) => Effect.Effect<HostGatewayOperationRecord | null, Error>;
  readonly getByScope: (input: {
    readonly callerThreadId: string;
    readonly callerTurnId: string;
    readonly operationKind: "create_threads";
  }) => Effect.Effect<HostGatewayOperationRecord | null, Error>;
  readonly listNonTerminal: () => Effect.Effect<ReadonlyArray<HostGatewayOperationRecord>, Error>;
}

export class HostGatewayOperationRepository extends ServiceMap.Service<
  HostGatewayOperationRepository,
  HostGatewayOperationRepositoryShape
>()("harnessos/hostGateway/Services/HostGatewayOperationRepository") {}
