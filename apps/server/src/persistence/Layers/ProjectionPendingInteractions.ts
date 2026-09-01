import { respondingInteractionReclaimCutoff } from "@harnessos/shared/pendingInteractions";
import { CanonicalUserInputDraftV1 } from "@harnessos/contracts";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";
import { Effect, Layer, Schema, Struct } from "effect";

import { toPersistenceSqlError } from "../Errors.ts";
import {
  ClaimProjectionPendingInteractionResponseInput,
  DeleteProjectionPendingInteractionsByThreadInput,
  DeleteProjectionPendingInteractionInput,
  GetProjectionPendingInteractionInput,
  ListProjectionPendingInteractionsInput,
  ProjectionPendingInteraction,
  ProjectionPendingInteractionCounts,
  ProjectionPendingInteractionRepository,
  UpdateProjectionPendingUserInputDraftInput,
  type ProjectionPendingInteractionRepositoryShape,
} from "../Services/ProjectionPendingInteractions.ts";

const ProjectionPendingInteractionDbRow = ProjectionPendingInteraction.mapFields(
  Struct.assign({
    draft: Schema.NullOr(Schema.fromJsonString(CanonicalUserInputDraftV1)),
  }),
);

const makeProjectionPendingInteractionRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const upsertRow = SqlSchema.void({
    Request: ProjectionPendingInteraction,
    execute: (row) => sql`
      INSERT INTO projection_pending_interactions (
        interaction_kind, request_id, thread_id, turn_id, lifecycle_generation,
        status, decision, response_command_id, response_requested_at, created_at, resolved_at,
        draft_json, draft_revision, draft_updated_at
      ) VALUES (
        ${row.interactionKind}, ${row.requestId}, ${row.threadId}, ${row.turnId},
        ${row.lifecycleGeneration}, ${row.status}, ${row.decision}, ${row.responseCommandId},
        ${row.responseRequestedAt}, ${row.createdAt}, ${row.resolvedAt},
        ${row.draft == null ? null : JSON.stringify(row.draft)}, ${row.draftRevision ?? 0},
        ${row.draftUpdatedAt ?? null}
      )
      ON CONFLICT (thread_id, interaction_kind, request_id)
      DO UPDATE SET
        turn_id = excluded.turn_id,
        lifecycle_generation = excluded.lifecycle_generation,
        status = excluded.status,
        decision = excluded.decision,
        response_command_id = excluded.response_command_id,
        response_requested_at = excluded.response_requested_at,
        created_at = excluded.created_at,
        resolved_at = excluded.resolved_at,
        draft_json = CASE
          WHEN excluded.interaction_kind = 'userInput'
            AND excluded.status = 'pending'
            AND projection_pending_interactions.lifecycle_generation IS excluded.lifecycle_generation
          THEN projection_pending_interactions.draft_json
          ELSE NULL
        END,
        draft_revision = CASE
          WHEN excluded.interaction_kind = 'userInput'
            AND excluded.status = 'pending'
            AND projection_pending_interactions.lifecycle_generation IS excluded.lifecycle_generation
          THEN projection_pending_interactions.draft_revision
          ELSE 0
        END,
        draft_updated_at = CASE
          WHEN excluded.interaction_kind = 'userInput'
            AND excluded.status = 'pending'
            AND projection_pending_interactions.lifecycle_generation IS excluded.lifecycle_generation
          THEN projection_pending_interactions.draft_updated_at
          ELSE NULL
        END
    `,
  });

  const listRows = SqlSchema.findAll({
    Request: ListProjectionPendingInteractionsInput,
    Result: ProjectionPendingInteractionDbRow,
    execute: ({ threadId }) => sql`
      SELECT
        interaction_kind AS "interactionKind",
        request_id AS "requestId",
        thread_id AS "threadId",
        turn_id AS "turnId",
        lifecycle_generation AS "lifecycleGeneration",
        status,
        decision,
        response_command_id AS "responseCommandId",
        response_requested_at AS "responseRequestedAt",
        created_at AS "createdAt",
        resolved_at AS "resolvedAt"
        , draft_json AS draft
        , draft_revision AS "draftRevision"
        , draft_updated_at AS "draftUpdatedAt"
      FROM projection_pending_interactions
      WHERE thread_id = ${threadId}
      ORDER BY created_at ASC, interaction_kind ASC, request_id ASC
    `,
  });

  const getRow = SqlSchema.findOneOption({
    Request: GetProjectionPendingInteractionInput,
    Result: ProjectionPendingInteractionDbRow,
    execute: ({ threadId, interactionKind, requestId }) => sql`
      SELECT
        interaction_kind AS "interactionKind",
        request_id AS "requestId",
        thread_id AS "threadId",
        turn_id AS "turnId",
        lifecycle_generation AS "lifecycleGeneration",
        status,
        decision,
        response_command_id AS "responseCommandId",
        response_requested_at AS "responseRequestedAt",
        created_at AS "createdAt",
        resolved_at AS "resolvedAt"
        , draft_json AS draft
        , draft_revision AS "draftRevision"
        , draft_updated_at AS "draftUpdatedAt"
      FROM projection_pending_interactions
      WHERE thread_id = ${threadId}
        AND interaction_kind = ${interactionKind}
        AND request_id = ${requestId}
    `,
  });

  const getPendingCounts = SqlSchema.findOne({
    Request: ListProjectionPendingInteractionsInput,
    Result: ProjectionPendingInteractionCounts,
    execute: ({ threadId }) => sql`
      SELECT
        COALESCE(SUM(CASE
          WHEN interaction_kind = 'approval'
            AND status IN ('pending', 'retryable')
            AND EXISTS (
              SELECT 1
              FROM projection_thread_activities AS activity
              WHERE activity.thread_id = projection_pending_interactions.thread_id
                AND activity.kind = 'approval.requested'
                AND json_extract(activity.payload_json, '$.requestId') =
                  projection_pending_interactions.request_id
            )
          THEN 1 ELSE 0
        END), 0) AS "pendingApprovalCount",
        COALESCE(SUM(CASE
          WHEN interaction_kind = 'userInput'
            AND status IN ('pending', 'retryable')
            AND EXISTS (
              SELECT 1
              FROM projection_thread_activities AS activity
              WHERE activity.thread_id = projection_pending_interactions.thread_id
                AND activity.kind = 'user-input.requested'
                AND json_extract(activity.payload_json, '$.requestId') =
                  projection_pending_interactions.request_id
            )
          THEN 1 ELSE 0
        END), 0) AS "pendingUserInputCount"
      FROM projection_pending_interactions
      WHERE thread_id = ${threadId}
    `,
  });

  const claimRow = SqlSchema.findAll({
    Request: ClaimProjectionPendingInteractionResponseInput,
    Result: ProjectionPendingInteractionDbRow,
    execute: (input) => sql`
      UPDATE projection_pending_interactions
      SET
        status = 'responding',
        decision = ${input.decision},
        response_command_id = ${input.responseCommandId},
        response_requested_at = ${input.requestedAt},
        resolved_at = NULL,
        draft_json = NULL,
        draft_revision = 0,
        draft_updated_at = NULL
      WHERE thread_id = ${input.threadId}
        AND interaction_kind = ${input.interactionKind}
        AND request_id = ${input.requestId}
        AND (
          status IN ('pending', 'retryable', 'uncertain')
          OR (
            status = 'responding'
            AND (
              response_requested_at IS NULL
              OR response_requested_at <= ${respondingInteractionReclaimCutoff(input.requestedAt)}
            )
          )
        )
        AND (
          (${input.lifecycleGeneration} IS NULL AND lifecycle_generation IS NULL)
          OR lifecycle_generation = ${input.lifecycleGeneration}
        )
      RETURNING
        interaction_kind AS "interactionKind",
        request_id AS "requestId",
        thread_id AS "threadId",
        turn_id AS "turnId",
        lifecycle_generation AS "lifecycleGeneration",
        status,
        decision,
        response_command_id AS "responseCommandId",
        response_requested_at AS "responseRequestedAt",
        created_at AS "createdAt",
        resolved_at AS "resolvedAt"
        , draft_json AS draft
        , draft_revision AS "draftRevision"
        , draft_updated_at AS "draftUpdatedAt"
    `,
  });

  const updateUserInputDraftRow = SqlSchema.findAll({
    Request: UpdateProjectionPendingUserInputDraftInput,
    Result: ProjectionPendingInteractionDbRow,
    execute: (input) => sql`
      UPDATE projection_pending_interactions
      SET
        draft_json = ${JSON.stringify(input.draft)},
        draft_revision = draft_revision + 1,
        draft_updated_at = ${input.updatedAt}
      WHERE thread_id = ${input.threadId}
        AND interaction_kind = 'userInput'
        AND request_id = ${input.requestId}
        AND status = 'pending'
        AND (
          (${input.lifecycleGeneration} IS NULL AND lifecycle_generation IS NULL)
          OR lifecycle_generation = ${input.lifecycleGeneration}
        )
      RETURNING
        interaction_kind AS "interactionKind",
        request_id AS "requestId",
        thread_id AS "threadId",
        turn_id AS "turnId",
        lifecycle_generation AS "lifecycleGeneration",
        status,
        decision,
        response_command_id AS "responseCommandId",
        response_requested_at AS "responseRequestedAt",
        created_at AS "createdAt",
        resolved_at AS "resolvedAt",
        draft_json AS draft,
        draft_revision AS "draftRevision",
        draft_updated_at AS "draftUpdatedAt"
    `,
  });

  const deleteRow = SqlSchema.void({
    Request: DeleteProjectionPendingInteractionInput,
    execute: ({ threadId, interactionKind, requestId }) => sql`
      DELETE FROM projection_pending_interactions
      WHERE thread_id = ${threadId}
        AND interaction_kind = ${interactionKind}
        AND request_id = ${requestId}
    `,
  });

  const deleteRowsByThread = SqlSchema.void({
    Request: DeleteProjectionPendingInteractionsByThreadInput,
    execute: ({ threadId }) => sql`
      DELETE FROM projection_pending_interactions
      WHERE thread_id = ${threadId}
    `,
  });

  return {
    upsert: (row) =>
      upsertRow(row).pipe(
        Effect.mapError(toPersistenceSqlError("ProjectionPendingInteractionRepository.upsert")),
      ),
    listByThreadId: (input) =>
      listRows(input).pipe(
        Effect.mapError(
          toPersistenceSqlError("ProjectionPendingInteractionRepository.listByThreadId"),
        ),
      ),
    getPendingCountsByThreadId: (input) =>
      getPendingCounts(input).pipe(
        Effect.mapError(
          toPersistenceSqlError(
            "ProjectionPendingInteractionRepository.getPendingCountsByThreadId",
          ),
        ),
      ),
    getByIdentity: (input) =>
      getRow(input).pipe(
        Effect.mapError(
          toPersistenceSqlError("ProjectionPendingInteractionRepository.getByIdentity"),
        ),
      ),
    claimResponse: (input) =>
      claimRow(input).pipe(
        Effect.map((rows) => rows.length === 1),
        Effect.mapError(
          toPersistenceSqlError("ProjectionPendingInteractionRepository.claimResponse"),
        ),
      ),
    updateUserInputDraft: (input) =>
      updateUserInputDraftRow(input).pipe(
        Effect.map((rows) => {
          const row = rows[0];
          return row
            ? {
                updated: true,
                draftRevision: row.draftRevision ?? 0,
                draftUpdatedAt: row.draftUpdatedAt ?? null,
              }
            : { updated: false, draftRevision: 0, draftUpdatedAt: null };
        }),
        Effect.mapError(
          toPersistenceSqlError("ProjectionPendingInteractionRepository.updateUserInputDraft"),
        ),
      ),
    deleteByIdentity: (input) =>
      deleteRow(input).pipe(
        Effect.mapError(
          toPersistenceSqlError("ProjectionPendingInteractionRepository.deleteByIdentity"),
        ),
      ),
    deleteByThreadId: (input) =>
      deleteRowsByThread(input).pipe(
        Effect.mapError(
          toPersistenceSqlError("ProjectionPendingInteractionRepository.deleteByThreadId"),
        ),
      ),
  } satisfies ProjectionPendingInteractionRepositoryShape;
});

export const ProjectionPendingInteractionRepositoryLive = Layer.effect(
  ProjectionPendingInteractionRepository,
  makeProjectionPendingInteractionRepository,
);
