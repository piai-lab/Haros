import { Effect, Layer, Schema } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";

import { toPersistenceSqlOrDecodeError } from "../Errors.ts";
import {
  ListWorkspacePullRequestPinsByWorkspaceIdsInput,
  WORKSPACE_PULL_REQUEST_PIN_LIMIT,
  WorkspacePullRequestPin,
  WorkspacePullRequestPinLimitError,
  WorkspacePullRequestPins,
  type WorkspacePullRequestPinsError,
  type WorkspacePullRequestPinsShape,
  SetWorkspacePullRequestPinnedInput,
} from "../Services/WorkspacePullRequestPins.ts";

const makeWorkspacePullRequestPins = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const listPinRows = SqlSchema.findAll({
    Request: ListWorkspacePullRequestPinsByWorkspaceIdsInput,
    Result: WorkspacePullRequestPin,
    execute: ({ workspaceIds }) => sql`
      SELECT
        workspace_id AS "workspaceId",
        repository_key AS "repositoryKey",
        pull_request_number AS "number"
      FROM workspace_pull_request_pins
      WHERE workspace_id IN ${sql.in(workspaceIds)}
      ORDER BY
        workspace_id ASC,
        repository_key ASC,
        pull_request_number ASC
    `,
  });

  const PinCountRow = Schema.Struct({
    count: Schema.Number,
    identityExists: Schema.Number,
  });

  const readWorkspacePinCount = SqlSchema.findOne({
    Request: SetWorkspacePullRequestPinnedInput,
    Result: PinCountRow,
    execute: ({ workspaceId, repositoryKey, number }) => sql`
      SELECT
        COUNT(*) AS "count",
        COALESCE(MAX(
          CASE
            WHEN repository_key = ${repositoryKey}
              AND pull_request_number = ${number}
            THEN 1
            ELSE 0
          END
        ), 0) AS "identityExists"
      FROM workspace_pull_request_pins
      WHERE workspace_id = ${workspaceId}
    `,
  });

  const insertPinRow = SqlSchema.void({
    Request: SetWorkspacePullRequestPinnedInput,
    execute: ({ workspaceId, repositoryKey, number }) => sql`
      INSERT INTO workspace_pull_request_pins (
        workspace_id,
        repository_key,
        pull_request_number
      )
      VALUES (${workspaceId}, ${repositoryKey}, ${number})
      ON CONFLICT (workspace_id, repository_key, pull_request_number) DO NOTHING
    `,
  });

  const deletePinRow = SqlSchema.void({
    Request: SetWorkspacePullRequestPinnedInput,
    execute: ({ workspaceId, repositoryKey, number }) => sql`
      DELETE FROM workspace_pull_request_pins
      WHERE workspace_id = ${workspaceId}
        AND repository_key = ${repositoryKey}
        AND pull_request_number = ${number}
    `,
  });

  const listByWorkspaceIds: WorkspacePullRequestPinsShape["listByWorkspaceIds"] = (input) => {
    if (input.workspaceIds.length === 0) {
      return Effect.succeed([]);
    }
    return listPinRows(input).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "WorkspacePullRequestPins.listByWorkspaceIds:query",
          "WorkspacePullRequestPins.listByWorkspaceIds:decodeRows",
        ),
      ),
    );
  };

  const setPinned: WorkspacePullRequestPinsShape["setPinned"] = (input) => {
    // Annotated because the two branches infer distinct Effect types that pipe() cannot
    // reconcile; mapError below funnels every failure into WorkspacePullRequestPinsError.
    const operation: Effect.Effect<void | undefined, unknown> = input.isPinned
      ? sql.withTransaction(
          Effect.gen(function* () {
            const current = yield* readWorkspacePinCount(input);
            if (current.identityExists > 0) return;
            if (current.count >= WORKSPACE_PULL_REQUEST_PIN_LIMIT) {
              return yield* new WorkspacePullRequestPinLimitError({
                workspaceId: input.workspaceId,
                limit: WORKSPACE_PULL_REQUEST_PIN_LIMIT,
              });
            }
            yield* insertPinRow(input);
          }),
        )
      : deletePinRow(input);

    return operation.pipe(
      Effect.mapError(
        (cause): WorkspacePullRequestPinsError =>
          cause instanceof WorkspacePullRequestPinLimitError
            ? cause
            : toPersistenceSqlOrDecodeError(
                "WorkspacePullRequestPins.setPinned:query",
                "WorkspacePullRequestPins.setPinned:encodeRequest",
              )(cause),
      ),
    );
  };

  return { listByWorkspaceIds, setPinned } satisfies WorkspacePullRequestPinsShape;
});

export const WorkspacePullRequestPinsLive = Layer.effect(
  WorkspacePullRequestPins,
  makeWorkspacePullRequestPins,
);
