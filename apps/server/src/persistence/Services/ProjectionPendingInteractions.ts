/** Durable settlement authority shared by approvals and structured user input. */
import {
  ApprovalRequestId,
  CanonicalUserInputDraftV1,
  CommandId,
  IsoDateTime,
  NonNegativeInt,
  ProjectionPendingInteractionDecision,
  ProjectionPendingInteractionKind,
  ProjectionPendingInteractionStatus,
  ThreadId,
  TurnId,
} from "@harnessos/contracts";
import { Option, Schema, ServiceMap } from "effect";
import type { Effect } from "effect";

import type { ProjectionRepositoryError } from "../Errors.ts";

export const ProjectionPendingInteraction = Schema.Struct({
  interactionKind: ProjectionPendingInteractionKind,
  requestId: ApprovalRequestId,
  threadId: ThreadId,
  turnId: Schema.NullOr(TurnId),
  lifecycleGeneration: Schema.NullOr(Schema.String),
  status: ProjectionPendingInteractionStatus,
  decision: ProjectionPendingInteractionDecision,
  responseCommandId: Schema.NullOr(CommandId),
  responseRequestedAt: Schema.NullOr(IsoDateTime),
  createdAt: IsoDateTime,
  resolvedAt: Schema.NullOr(IsoDateTime),
  draft: Schema.optional(Schema.NullOr(CanonicalUserInputDraftV1)).pipe(
    Schema.withDecodingDefault(() => null),
  ),
  draftRevision: Schema.optional(NonNegativeInt).pipe(Schema.withDecodingDefault(() => 0)),
  draftUpdatedAt: Schema.optional(Schema.NullOr(IsoDateTime)).pipe(
    Schema.withDecodingDefault(() => null),
  ),
});
export type ProjectionPendingInteraction = typeof ProjectionPendingInteraction.Type;

export const ListProjectionPendingInteractionsInput = Schema.Struct({
  threadId: ThreadId,
});

export const ProjectionPendingInteractionCounts = Schema.Struct({
  pendingApprovalCount: NonNegativeInt,
  pendingUserInputCount: NonNegativeInt,
});
export type ProjectionPendingInteractionCounts = typeof ProjectionPendingInteractionCounts.Type;

export const GetProjectionPendingInteractionInput = Schema.Struct({
  threadId: ThreadId,
  interactionKind: ProjectionPendingInteractionKind,
  requestId: ApprovalRequestId,
});

export const ClaimProjectionPendingInteractionResponseInput = Schema.Struct({
  threadId: ThreadId,
  interactionKind: ProjectionPendingInteractionKind,
  requestId: ApprovalRequestId,
  lifecycleGeneration: Schema.NullOr(Schema.String),
  responseCommandId: CommandId,
  decision: ProjectionPendingInteractionDecision,
  requestedAt: IsoDateTime,
});

export const DeleteProjectionPendingInteractionInput = GetProjectionPendingInteractionInput;

export const DeleteProjectionPendingInteractionsByThreadInput = Schema.Struct({
  threadId: ThreadId,
});

export const UpdateProjectionPendingUserInputDraftInput = Schema.Struct({
  threadId: ThreadId,
  requestId: ApprovalRequestId,
  lifecycleGeneration: Schema.NullOr(Schema.String),
  draft: CanonicalUserInputDraftV1,
  updatedAt: IsoDateTime,
});

export const UpdateProjectionPendingUserInputDraftResult = Schema.Struct({
  updated: Schema.Boolean,
  draftRevision: NonNegativeInt,
  draftUpdatedAt: Schema.NullOr(IsoDateTime),
});
export type UpdateProjectionPendingUserInputDraftResult =
  typeof UpdateProjectionPendingUserInputDraftResult.Type;

export interface ProjectionPendingInteractionRepositoryShape {
  readonly upsert: (
    row: ProjectionPendingInteraction,
  ) => Effect.Effect<void, ProjectionRepositoryError>;
  readonly listByThreadId: (
    input: typeof ListProjectionPendingInteractionsInput.Type,
  ) => Effect.Effect<ReadonlyArray<ProjectionPendingInteraction>, ProjectionRepositoryError>;
  readonly getPendingCountsByThreadId: (
    input: typeof ListProjectionPendingInteractionsInput.Type,
  ) => Effect.Effect<ProjectionPendingInteractionCounts, ProjectionRepositoryError>;
  readonly getByIdentity: (
    input: typeof GetProjectionPendingInteractionInput.Type,
  ) => Effect.Effect<Option.Option<ProjectionPendingInteraction>, ProjectionRepositoryError>;
  /**
   * Atomically assigns an unsettled interaction to exactly one response
   * command. Claims `pending`/`retryable`/`uncertain` rows, plus `responding`
   * rows whose claim is old enough to be considered orphaned — a permanently
   * unclaimable row would strand its prompt with no way to answer or dismiss.
   */
  readonly claimResponse: (
    input: typeof ClaimProjectionPendingInteractionResponseInput.Type,
  ) => Effect.Effect<boolean, ProjectionRepositoryError>;
  readonly updateUserInputDraft: (
    input: typeof UpdateProjectionPendingUserInputDraftInput.Type,
  ) => Effect.Effect<UpdateProjectionPendingUserInputDraftResult, ProjectionRepositoryError>;
  readonly deleteByIdentity: (
    input: typeof DeleteProjectionPendingInteractionInput.Type,
  ) => Effect.Effect<void, ProjectionRepositoryError>;
  readonly deleteByThreadId: (
    input: typeof DeleteProjectionPendingInteractionsByThreadInput.Type,
  ) => Effect.Effect<void, ProjectionRepositoryError>;
}

export class ProjectionPendingInteractionRepository extends ServiceMap.Service<
  ProjectionPendingInteractionRepository,
  ProjectionPendingInteractionRepositoryShape
>()(
  "harnessos/persistence/Services/ProjectionPendingInteractions/ProjectionPendingInteractionRepository",
) {}
