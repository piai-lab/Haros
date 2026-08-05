/**
 * Durable project-scoped pull request pins.
 *
 * Repository keys are canonical values supplied by callers. This service owns only
 * persistence and never derives or normalizes repository identity.
 */
import { PositiveInt, ProductWorkspaceId, TrimmedNonEmptyString } from "@omnimind/contracts";
import { Schema, ServiceMap } from "effect";
import type { Effect } from "effect";

import type { PersistenceDecodeError, PersistenceSqlError } from "../Errors.ts";

/**
 * A project pin list is intentionally a small "what next" queue rather than a second backlog.
 * Keeping the cap in the persistence service makes it durable across every caller and bounds
 * missing-pin recovery work before any GitHub subprocess is considered.
 */
export const WORKSPACE_PULL_REQUEST_PIN_LIMIT = 20;

export class WorkspacePullRequestPinLimitError extends Schema.TaggedErrorClass<WorkspacePullRequestPinLimitError>()(
  "WorkspacePullRequestPinLimitError",
  {
    workspaceId: ProductWorkspaceId,
    limit: PositiveInt,
  },
) {
  override get message(): string {
    return `A project can pin at most ${this.limit} pull requests.`;
  }
}

export type WorkspacePullRequestPinsError =
  | PersistenceSqlError
  | PersistenceDecodeError
  | WorkspacePullRequestPinLimitError;

export const WorkspacePullRequestPin = Schema.Struct({
  workspaceId: ProductWorkspaceId,
  repositoryKey: TrimmedNonEmptyString,
  number: PositiveInt,
});
export type WorkspacePullRequestPin = typeof WorkspacePullRequestPin.Type;

export const ListWorkspacePullRequestPinsByWorkspaceIdsInput = Schema.Struct({
  workspaceIds: Schema.Array(ProductWorkspaceId),
});
export type ListWorkspacePullRequestPinsByWorkspaceIdsInput =
  typeof ListWorkspacePullRequestPinsByWorkspaceIdsInput.Type;

export const SetWorkspacePullRequestPinnedInput = Schema.Struct({
  workspaceId: ProductWorkspaceId,
  repositoryKey: TrimmedNonEmptyString,
  number: PositiveInt,
  isPinned: Schema.Boolean,
});
export type SetWorkspacePullRequestPinnedInput = typeof SetWorkspacePullRequestPinnedInput.Type;

export interface WorkspacePullRequestPinsShape {
  /** List pins for exactly the requested projects in deterministic identity order. */
  readonly listByWorkspaceIds: (
    input: ListWorkspacePullRequestPinsByWorkspaceIdsInput,
  ) => Effect.Effect<ReadonlyArray<WorkspacePullRequestPin>, WorkspacePullRequestPinsError>;

  /** Idempotently establish the requested pin state. */
  readonly setPinned: (
    input: SetWorkspacePullRequestPinnedInput,
  ) => Effect.Effect<void, WorkspacePullRequestPinsError>;
}

export class WorkspacePullRequestPins extends ServiceMap.Service<
  WorkspacePullRequestPins,
  WorkspacePullRequestPinsShape
>()("omnimind/persistence/Services/WorkspacePullRequestPins/WorkspacePullRequestPins") {}
