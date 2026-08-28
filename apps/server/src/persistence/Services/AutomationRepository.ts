import {
  AutomationCancelRunInput,
  AutomationArchiveRunInput,
  AutomationCreateInput,
  AutomationDefinition,
  AutomationId,
  AutomationListInput,
  AutomationListResult,
  AutomationMarkRunReadInput,
  AutomationMemory,
  AutomationPermissionSnapshot,
  AutomationRun,
  AutomationRunResult,
  AutomationRunId,
  AutomationTrigger,
  AutomationDisabledReason,
  CommandId,
  MessageId,
  NonNegativeInt,
  ProjectId,
  ThreadId,
  TurnId,
} from "@harnessos/contracts";
import type { AutomationRunResult as AutomationRunResultType } from "@harnessos/contracts";
import { Option, Schema, ServiceMap } from "effect";
import type { Effect } from "effect";

import type { AutomationRepositoryError } from "../Errors.ts";

export const CreateAutomationDefinitionInput = Schema.Struct({
  id: AutomationId,
  input: AutomationCreateInput,
  now: Schema.String,
  nextRunAt: Schema.optional(Schema.NullOr(Schema.String)),
});
export type CreateAutomationDefinitionInput = typeof CreateAutomationDefinitionInput.Type;

export const GetAutomationDefinitionInput = Schema.Struct({
  id: AutomationId,
});
export type GetAutomationDefinitionInput = typeof GetAutomationDefinitionInput.Type;

export const ListDueAutomationDefinitionsInput = Schema.Struct({
  now: Schema.String,
  limit: Schema.Number,
});
export type ListDueAutomationDefinitionsInput = typeof ListDueAutomationDefinitionsInput.Type;

export const SetAutomationDefinitionNextRunAtInput = Schema.Struct({
  id: AutomationId,
  nextRunAt: Schema.NullOr(Schema.String),
  updatedAt: Schema.String,
  expectedDefinitionRevision: NonNegativeInt,
});
export type SetAutomationDefinitionNextRunAtInput =
  typeof SetAutomationDefinitionNextRunAtInput.Type;

export const AttachAutomationDefinitionThreadInput = Schema.Struct({
  id: AutomationId,
  threadId: ThreadId,
  updatedAt: Schema.String,
  expectedDefinitionRevision: NonNegativeInt,
});
export type AttachAutomationDefinitionThreadInput =
  typeof AttachAutomationDefinitionThreadInput.Type;

export const RestartAutomationDefinitionLoopInput = Schema.Struct({
  id: AutomationId,
  enabled: Schema.Boolean,
  nextRunAt: Schema.NullOr(Schema.String),
  updatedAt: Schema.String,
  expectedDefinitionRevision: NonNegativeInt,
});
export type RestartAutomationDefinitionLoopInput = typeof RestartAutomationDefinitionLoopInput.Type;

export const ArchiveAutomationDefinitionInput = Schema.Struct({
  id: AutomationId,
  archivedAt: Schema.String,
  expectedDefinitionRevision: NonNegativeInt,
});
export type ArchiveAutomationDefinitionInput = typeof ArchiveAutomationDefinitionInput.Type;

export const ResolvePendingAutomationProposalInput = Schema.Struct({
  id: AutomationId,
  resolution: Schema.Literals(["accepted", "dismissed"]),
  nextRunAt: Schema.NullOr(Schema.String),
  updatedAt: Schema.String,
  archivedAt: Schema.NullOr(Schema.String),
  expectedDefinitionRevision: NonNegativeInt,
});
export type ResolvePendingAutomationProposalInput =
  typeof ResolvePendingAutomationProposalInput.Type;

export const CreateAutomationRunInput = Schema.Struct({
  id: AutomationRunId,
  automationId: AutomationId,
  projectId: ProjectId,
  threadId: Schema.NullOr(ThreadId),
  messageId: Schema.optional(Schema.NullOr(MessageId)).pipe(Schema.withDecodingDefault(() => null)),
  threadCreateCommandId: Schema.optional(Schema.NullOr(CommandId)).pipe(
    Schema.withDecodingDefault(() => null),
  ),
  turnStartCommandId: Schema.optional(Schema.NullOr(CommandId)).pipe(
    Schema.withDecodingDefault(() => null),
  ),
  trigger: AutomationTrigger,
  scheduledFor: Schema.String,
  deferredUntil: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.withDecodingDefault(() => null),
  ),
  permissionSnapshot: AutomationPermissionSnapshot,
  now: Schema.String,
});
export type CreateAutomationRunInput = typeof CreateAutomationRunInput.Type;

export const GetAutomationMemoryInput = Schema.Struct({
  automationId: AutomationId,
});
export type GetAutomationMemoryInput = typeof GetAutomationMemoryInput.Type;

export const UpsertAutomationMemoryInput = Schema.Struct({
  automationId: AutomationId,
  content: AutomationMemory.fields.content,
  updatedAt: Schema.String,
});
export type UpsertAutomationMemoryInput = typeof UpsertAutomationMemoryInput.Type;

export const SetAutomationRunDeferredInput = Schema.Struct({
  id: AutomationRunId,
  deferredUntil: Schema.NullOr(Schema.String),
  updatedAt: Schema.String,
});
export type SetAutomationRunDeferredInput = typeof SetAutomationRunDeferredInput.Type;

export const GetDeferredAutomationRunInput = Schema.Struct({
  automationId: AutomationId,
});
export type GetDeferredAutomationRunInput = typeof GetDeferredAutomationRunInput.Type;

export const ListDueDeferredAutomationRunsInput = Schema.Struct({
  now: Schema.String,
  limit: Schema.Number,
});
export type ListDueDeferredAutomationRunsInput = typeof ListDueDeferredAutomationRunsInput.Type;

export const ListAutomationRunsForDefinitionInput = Schema.Struct({
  automationId: AutomationId,
  limit: Schema.Number,
});
export type ListAutomationRunsForDefinitionInput = typeof ListAutomationRunsForDefinitionInput.Type;

export const GetLatestFinishedAutomationRunInput = Schema.Struct({
  automationId: AutomationId,
});
export type GetLatestFinishedAutomationRunInput = typeof GetLatestFinishedAutomationRunInput.Type;

export const GetAutomationRunInput = Schema.Struct({
  id: AutomationRunId,
});
export type GetAutomationRunInput = typeof GetAutomationRunInput.Type;

export const MarkAutomationRunStartedInput = Schema.Struct({
  id: AutomationRunId,
  threadId: ThreadId,
  messageId: MessageId,
  threadCreateCommandId: Schema.NullOr(CommandId),
  turnStartCommandId: CommandId,
  startedAt: Schema.String,
});
export type MarkAutomationRunStartedInput = typeof MarkAutomationRunStartedInput.Type;

export const ReserveDeferredAutomationRunInput = Schema.Struct({
  id: AutomationRunId,
  threadId: ThreadId,
  reservedAt: Schema.String,
  settleDeferredOneShot: Schema.Boolean,
});
export type ReserveDeferredAutomationRunInput = typeof ReserveDeferredAutomationRunInput.Type;

export interface ReserveDeferredAutomationRunResult {
  readonly run: AutomationRun;
  readonly state: "reserved" | "skipped" | "unchanged";
  readonly definitionDisabled: boolean;
}

export const MarkAutomationRunFailedInput = Schema.Struct({
  id: AutomationRunId,
  error: Schema.String,
  finishedAt: Schema.String,
});
export type MarkAutomationRunFailedInput = typeof MarkAutomationRunFailedInput.Type;

export interface MarkAutomationRunFailedResult {
  readonly run: AutomationRun;
  readonly transitioned: boolean;
  readonly consecutiveFailureCount: number | null;
  readonly autoDisabled: boolean;
  readonly transitionedOwnerRun: DeferredOneShotOwnerTransition | null;
}

export type DeferredOneShotOwnerTransitionReason =
  | "definition-superseded"
  | "failure-threshold-reached";

export interface DeferredOneShotOwnerTransition {
  readonly run: AutomationRun;
  readonly reason: DeferredOneShotOwnerTransitionReason;
}

export interface AutomationDefinitionMutationResult<A> {
  readonly value: A;
  readonly transitionedOwnerRun: DeferredOneShotOwnerTransition | null;
}

export const MarkAutomationRunSkippedInput = Schema.Struct({
  id: AutomationRunId,
  reason: Schema.String,
  finishedAt: Schema.String,
  result: Schema.optional(AutomationRunResult),
});
export type MarkAutomationRunSkippedInput = typeof MarkAutomationRunSkippedInput.Type;

export interface MarkAutomationRunSkippedResult {
  readonly run: AutomationRun;
  readonly transitioned: boolean;
  readonly definitionDisabled: boolean;
}

export const MarkAutomationRunSucceededInput = Schema.Struct({
  id: AutomationRunId,
  turnId: Schema.NullOr(TurnId),
  result: Schema.NullOr(AutomationRunResult),
  finishedAt: Schema.String,
  accountedAt: Schema.optional(Schema.String),
});
export type MarkAutomationRunSucceededInput = typeof MarkAutomationRunSucceededInput.Type;

export interface MarkAutomationRunSucceededResult {
  readonly run: AutomationRun;
  readonly transitioned: boolean;
  readonly failureCountReset: boolean;
}

export const MarkAutomationRunResultInput = Schema.Struct({
  id: AutomationRunId,
  result: Schema.NullOr(AutomationRunResult),
  updatedAt: Schema.String,
});
export type MarkAutomationRunResultInput = typeof MarkAutomationRunResultInput.Type;

export const MarkAutomationRunInterruptedInput = Schema.Struct({
  id: AutomationRunId,
  turnId: Schema.NullOr(TurnId),
  finishedAt: Schema.String,
});
export type MarkAutomationRunInterruptedInput = typeof MarkAutomationRunInterruptedInput.Type;

export const MarkAutomationRunWaitingForApprovalInput = Schema.Struct({
  id: AutomationRunId,
  turnId: Schema.NullOr(TurnId),
  updatedAt: Schema.String,
});
export type MarkAutomationRunWaitingForApprovalInput =
  typeof MarkAutomationRunWaitingForApprovalInput.Type;

export const GetAutomationRunByThreadInput = Schema.Struct({
  threadId: ThreadId,
});
export type GetAutomationRunByThreadInput = typeof GetAutomationRunByThreadInput.Type;

export const ListRecoverableAutomationRunsInput = Schema.Struct({
  limit: Schema.Number,
  afterCreatedAt: Schema.optional(Schema.String),
  afterRunId: Schema.optional(AutomationRunId),
});
export type ListRecoverableAutomationRunsInput = typeof ListRecoverableAutomationRunsInput.Type;

export const ListAutomationRunsNeedingCompletionEvaluationInput = Schema.Struct({
  limit: Schema.Number,
});
export type ListAutomationRunsNeedingCompletionEvaluationInput =
  typeof ListAutomationRunsNeedingCompletionEvaluationInput.Type;

export const CountActiveAutomationRunsInput = Schema.Struct({
  automationId: AutomationId,
});
export type CountActiveAutomationRunsInput = typeof CountActiveAutomationRunsInput.Type;

export const CountActiveAutomationRunsByThreadInput = Schema.Struct({
  threadId: ThreadId,
});
export type CountActiveAutomationRunsByThreadInput =
  typeof CountActiveAutomationRunsByThreadInput.Type;

export const CountPendingCompletionEvaluationsByThreadInput = Schema.Struct({
  threadId: ThreadId,
});
export type CountPendingCompletionEvaluationsByThreadInput =
  typeof CountPendingCompletionEvaluationsByThreadInput.Type;

export const ListActiveAutomationRunsForDefinitionInput = Schema.Struct({
  automationId: AutomationId,
});
export type ListActiveAutomationRunsForDefinitionInput =
  typeof ListActiveAutomationRunsForDefinitionInput.Type;

export const GetEarliestAutomationNextRunAtInput = Schema.Struct({
  now: Schema.optional(Schema.String),
});
export type GetEarliestAutomationNextRunAtInput = typeof GetEarliestAutomationNextRunAtInput.Type;

export const DisableAutomationDefinitionInput = Schema.Struct({
  id: AutomationId,
  now: Schema.String,
  reason: AutomationDisabledReason,
  expectedDefinitionRevision: NonNegativeInt,
});
export type DisableAutomationDefinitionInput = typeof DisableAutomationDefinitionInput.Type;

export const DisableAutomationDefinitionIfUnchangedInput = Schema.Struct({
  id: AutomationId,
  expectedDefinitionRevision: NonNegativeInt,
  now: Schema.String,
  reason: AutomationDisabledReason,
});
export type DisableAutomationDefinitionIfUnchangedInput =
  typeof DisableAutomationDefinitionIfUnchangedInput.Type;

export const IncrementAutomationIterationInput = Schema.Struct({
  id: AutomationId,
  now: Schema.String,
  expectedDefinitionRevision: NonNegativeInt,
});
export type IncrementAutomationIterationInput = typeof IncrementAutomationIterationInput.Type;

export const AcquireAutomationSchedulerLeaseInput = Schema.Struct({
  leaseKey: Schema.String,
  ownerId: Schema.String,
  now: Schema.String,
  leaseExpiresAt: Schema.String,
});
export type AcquireAutomationSchedulerLeaseInput = typeof AcquireAutomationSchedulerLeaseInput.Type;

export interface AutomationRepositoryShape {
  readonly createDefinition: (
    input: CreateAutomationDefinitionInput,
  ) => Effect.Effect<AutomationDefinition, AutomationRepositoryError>;
  readonly saveDefinition: (input: {
    readonly definition: AutomationDefinition;
    readonly expectedDefinitionRevision: number;
    readonly supersedeDeferredOneShotOwner?: boolean;
  }) => Effect.Effect<
    AutomationDefinitionMutationResult<Option.Option<AutomationDefinition>>,
    AutomationRepositoryError
  >;
  readonly resolvePendingProposal: (
    input: ResolvePendingAutomationProposalInput,
  ) => Effect.Effect<AutomationDefinitionMutationResult<boolean>, AutomationRepositoryError>;
  readonly getDefinitionById: (
    input: GetAutomationDefinitionInput,
  ) => Effect.Effect<Option.Option<AutomationDefinition>, AutomationRepositoryError>;
  readonly listDueDefinitions: (
    input: ListDueAutomationDefinitionsInput,
  ) => Effect.Effect<ReadonlyArray<AutomationDefinition>, AutomationRepositoryError>;
  readonly setDefinitionNextRunAt: (
    input: SetAutomationDefinitionNextRunAtInput,
  ) => Effect.Effect<boolean, AutomationRepositoryError>;
  /**
   * Claim the thread a dedicated automation owns from now on. Succeeds only while the
   * definition still has no continuation thread, so two concurrent first runs can never
   * leave the automation pointing at the loser's thread.
   */
  readonly attachDefinitionThread: (
    input: AttachAutomationDefinitionThreadInput,
  ) => Effect.Effect<boolean, AutomationRepositoryError>;
  readonly archiveDefinition: (
    input: ArchiveAutomationDefinitionInput,
  ) => Effect.Effect<AutomationDefinitionMutationResult<boolean>, AutomationRepositoryError>;
  readonly list: (
    input?: AutomationListInput,
  ) => Effect.Effect<AutomationListResult, AutomationRepositoryError>;
  readonly createRun: (
    input: CreateAutomationRunInput,
  ) => Effect.Effect<AutomationRun, AutomationRepositoryError>;
  /** Atomically inserts a fresh run and consumes one definition iteration. */
  readonly createRunAndIncrementDefinition: (
    input: CreateAutomationRunInput,
    definitionMutation: {
      readonly expectedDefinitionRevision: number;
      readonly consumeIteration: boolean;
      readonly claimDeferredOneShotOwner?: boolean;
      readonly scheduleAdvance?: {
        readonly nextRunAt: string | null;
        readonly disable: boolean;
      };
      readonly terminalSkip?: {
        readonly reason: string;
        readonly finishedAt: string;
        readonly result: AutomationRunResultType;
      };
    },
  ) => Effect.Effect<Option.Option<AutomationRun>, AutomationRepositoryError>;
  readonly getRunById: (
    input: GetAutomationRunInput,
  ) => Effect.Effect<Option.Option<AutomationRun>, AutomationRepositoryError>;
  readonly getDeferredRunForDefinition: (
    input: GetDeferredAutomationRunInput,
  ) => Effect.Effect<Option.Option<AutomationRun>, AutomationRepositoryError>;
  readonly listDueDeferredRuns: (
    input: ListDueDeferredAutomationRunsInput,
  ) => Effect.Effect<ReadonlyArray<AutomationRun>, AutomationRepositoryError>;
  readonly listRunsForDefinition: (
    input: ListAutomationRunsForDefinitionInput,
  ) => Effect.Effect<ReadonlyArray<AutomationRun>, AutomationRepositoryError>;
  readonly getLatestFinishedRunForDefinition: (
    input: GetLatestFinishedAutomationRunInput,
  ) => Effect.Effect<Option.Option<AutomationRun>, AutomationRepositoryError>;
  readonly setRunDeferred: (
    input: SetAutomationRunDeferredInput,
  ) => Effect.Effect<AutomationRun, AutomationRepositoryError>;
  readonly markRunStarted: (
    input: MarkAutomationRunStartedInput,
  ) => Effect.Effect<AutomationRun, AutomationRepositoryError>;
  /**
   * Atomically assigns a deferred heartbeat to its target thread when no other
   * active automation run currently owns that thread.
   */
  readonly reserveDeferredRun: (
    input: ReserveDeferredAutomationRunInput,
  ) => Effect.Effect<ReserveDeferredAutomationRunResult, AutomationRepositoryError>;
  readonly cleanupUnownedDeferredOneShot: (input: {
    readonly id: AutomationRunId;
    readonly finishedAt: string;
  }) => Effect.Effect<MarkAutomationRunSkippedResult, AutomationRepositoryError>;
  readonly markRunFailed: (
    input: MarkAutomationRunFailedInput,
  ) => Effect.Effect<MarkAutomationRunFailedResult, AutomationRepositoryError>;
  readonly markRunSkipped: (
    input: MarkAutomationRunSkippedInput & { readonly settleDeferredOneShot?: boolean },
  ) => Effect.Effect<MarkAutomationRunSkippedResult, AutomationRepositoryError>;
  readonly markRunSucceeded: (
    input: MarkAutomationRunSucceededInput,
  ) => Effect.Effect<MarkAutomationRunSucceededResult, AutomationRepositoryError>;
  readonly markRunResult: (
    input: MarkAutomationRunResultInput,
  ) => Effect.Effect<AutomationRun, AutomationRepositoryError>;
  /**
   * Like {@link markRunResult}, but preserves the run's triage fields
   * (`archivedAt`/`unread`) from the current row instead of from the supplied
   * result. Background completion-evaluation must not clobber a concurrent user
   * archive/mark-read; this write merges those fields atomically, SQL-side.
   */
  readonly markRunCompletionResult: (
    input: MarkAutomationRunResultInput,
  ) => Effect.Effect<AutomationRun, AutomationRepositoryError>;
  readonly markRunInterrupted: (
    input: MarkAutomationRunInterruptedInput,
  ) => Effect.Effect<AutomationRun, AutomationRepositoryError>;
  readonly markRunWaitingForApproval: (
    input: MarkAutomationRunWaitingForApprovalInput,
  ) => Effect.Effect<AutomationRun, AutomationRepositoryError>;
  readonly cancelRun: (
    input: AutomationCancelRunInput & { readonly now: string },
  ) => Effect.Effect<AutomationRun, AutomationRepositoryError>;
  /** Returns the newest active run for a thread; terminal history rows are intentionally ignored. */
  readonly getRunByThreadId: (
    input: GetAutomationRunByThreadInput,
  ) => Effect.Effect<Option.Option<AutomationRun>, AutomationRepositoryError>;
  readonly listRecoverableRuns: (
    input: ListRecoverableAutomationRunsInput,
  ) => Effect.Effect<ReadonlyArray<AutomationRun>, AutomationRepositoryError>;
  readonly listRunsNeedingCompletionEvaluation: (
    input: ListAutomationRunsNeedingCompletionEvaluationInput,
  ) => Effect.Effect<ReadonlyArray<AutomationRun>, AutomationRepositoryError>;
  readonly countActiveRunsForDefinition: (
    input: CountActiveAutomationRunsInput,
  ) => Effect.Effect<number, AutomationRepositoryError>;
  readonly countActiveRunsForThread: (
    input: CountActiveAutomationRunsByThreadInput,
  ) => Effect.Effect<number, AutomationRepositoryError>;
  readonly countPendingCompletionEvaluationsForThread: (
    input: CountPendingCompletionEvaluationsByThreadInput,
  ) => Effect.Effect<number, AutomationRepositoryError>;
  readonly listActiveRunsForDefinition: (
    input: ListActiveAutomationRunsForDefinitionInput,
  ) => Effect.Effect<ReadonlyArray<AutomationRun>, AutomationRepositoryError>;
  readonly getEarliestNextRunAt: (
    input?: GetEarliestAutomationNextRunAtInput,
  ) => Effect.Effect<string | null, AutomationRepositoryError>;
  readonly markRunRead: (
    input: AutomationMarkRunReadInput & { readonly now: string },
  ) => Effect.Effect<AutomationRun, AutomationRepositoryError>;
  readonly archiveRun: (
    input: AutomationArchiveRunInput & { readonly now: string },
  ) => Effect.Effect<AutomationRun, AutomationRepositoryError>;
  readonly getMemory: (
    input: GetAutomationMemoryInput,
  ) => Effect.Effect<Option.Option<AutomationMemory>, AutomationRepositoryError>;
  readonly upsertMemory: (
    input: UpsertAutomationMemoryInput,
  ) => Effect.Effect<AutomationMemory, AutomationRepositoryError>;
  readonly getOrCreateInstallSalt: () => Effect.Effect<string, AutomationRepositoryError>;
  readonly disableDefinition: (
    input: DisableAutomationDefinitionInput,
  ) => Effect.Effect<AutomationDefinitionMutationResult<boolean>, AutomationRepositoryError>;
  readonly disableDefinitionIfUnchanged: (
    input: DisableAutomationDefinitionIfUnchangedInput,
  ) => Effect.Effect<AutomationDefinitionMutationResult<boolean>, AutomationRepositoryError>;
  readonly incrementDefinitionIterationCount: (
    input: IncrementAutomationIterationInput,
  ) => Effect.Effect<boolean, AutomationRepositoryError>;
  readonly restartDefinitionLoop: (
    input: RestartAutomationDefinitionLoopInput,
  ) => Effect.Effect<AutomationDefinitionMutationResult<boolean>, AutomationRepositoryError>;
  readonly tryAcquireSchedulerLease: (
    input: AcquireAutomationSchedulerLeaseInput,
  ) => Effect.Effect<boolean, AutomationRepositoryError>;
}

export class AutomationRepository extends ServiceMap.Service<
  AutomationRepository,
  AutomationRepositoryShape
>()("omnimind/persistence/Services/AutomationRepository") {}
