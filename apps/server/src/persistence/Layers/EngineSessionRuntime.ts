import { ThreadId } from "@harnessos/contracts";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";
import { Effect, Layer, Option, Schema, Struct } from "effect";

import {
  toPersistenceDecodeError,
  toPersistenceSqlError,
  toPersistenceSqlOrDecodeError,
} from "../Errors.ts";
import {
  EngineSessionRuntime,
  EngineSessionRuntimeRepository,
  type EngineSessionRuntimeRepositoryShape,
} from "../Services/EngineSessionRuntime.ts";

const EngineSessionRuntimeDbRowSchema = EngineSessionRuntime.mapFields(
  Struct.assign({
    resumeCursor: Schema.NullOr(Schema.fromJsonString(Schema.Unknown)),
    runtimePayload: Schema.NullOr(Schema.fromJsonString(Schema.Unknown)),
  }),
);

const decodeRuntime = Schema.decodeUnknownEffect(EngineSessionRuntime);

const GetRuntimeRequestSchema = Schema.Struct({
  threadId: ThreadId,
});

const DeleteRuntimeRequestSchema = GetRuntimeRequestSchema;

const makeEngineSessionRuntimeRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const upsertRuntimeRow = SqlSchema.void({
    Request: EngineSessionRuntimeDbRowSchema,
    execute: (runtime) =>
      sql`
        INSERT INTO engine_session_runtime (
          thread_id,
          engine,
          adapter_key,
          runtime_mode,
          status,
          lifecycle_generation,
          last_seen_at,
          resume_cursor_json,
          runtime_payload_json
        )
        VALUES (
          ${runtime.threadId},
          ${runtime.engine},
          ${runtime.adapterKey},
          ${runtime.runtimeMode},
          ${runtime.status},
          ${runtime.lifecycleGeneration},
          ${runtime.lastSeenAt},
          ${runtime.resumeCursor},
          ${runtime.runtimePayload}
        )
        ON CONFLICT (thread_id)
        DO UPDATE SET
          engine = excluded.engine,
          adapter_key = excluded.adapter_key,
          runtime_mode = excluded.runtime_mode,
          status = excluded.status,
          lifecycle_generation = excluded.lifecycle_generation,
          last_seen_at = excluded.last_seen_at,
          resume_cursor_json = excluded.resume_cursor_json,
          runtime_payload_json = excluded.runtime_payload_json
      `,
  });

  const getRuntimeRowByThreadId = SqlSchema.findOneOption({
    Request: GetRuntimeRequestSchema,
    Result: EngineSessionRuntimeDbRowSchema,
    execute: ({ threadId }) =>
      sql`
        SELECT
          thread_id AS "threadId",
          engine AS "engine",
          adapter_key AS "adapterKey",
          runtime_mode AS "runtimeMode",
          status,
          lifecycle_generation AS "lifecycleGeneration",
          last_seen_at AS "lastSeenAt",
          resume_cursor_json AS "resumeCursor",
          runtime_payload_json AS "runtimePayload"
        FROM engine_session_runtime
        WHERE thread_id = ${threadId}
      `,
  });

  const listRuntimeRows = SqlSchema.findAll({
    Request: Schema.Void,
    Result: EngineSessionRuntimeDbRowSchema,
    execute: () =>
      sql`
        SELECT
          thread_id AS "threadId",
          engine AS "engine",
          adapter_key AS "adapterKey",
          runtime_mode AS "runtimeMode",
          status,
          lifecycle_generation AS "lifecycleGeneration",
          last_seen_at AS "lastSeenAt",
          resume_cursor_json AS "resumeCursor",
          runtime_payload_json AS "runtimePayload"
        FROM engine_session_runtime
        ORDER BY last_seen_at ASC, thread_id ASC
      `,
  });

  const deleteRuntimeByThreadId = SqlSchema.void({
    Request: DeleteRuntimeRequestSchema,
    execute: ({ threadId }) =>
      sql`
        DELETE FROM engine_session_runtime
        WHERE thread_id = ${threadId}
      `,
  });

  const upsert: EngineSessionRuntimeRepositoryShape["upsert"] = (runtime) =>
    upsertRuntimeRow(runtime).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "EngineSessionRuntimeRepository.upsert:query",
          "EngineSessionRuntimeRepository.upsert:encodeRequest",
        ),
      ),
    );

  const getByThreadId: EngineSessionRuntimeRepositoryShape["getByThreadId"] = (input) =>
    getRuntimeRowByThreadId(input).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "EngineSessionRuntimeRepository.getByThreadId:query",
          "EngineSessionRuntimeRepository.getByThreadId:decodeRow",
        ),
      ),
      Effect.flatMap((runtimeRowOption) =>
        Option.match(runtimeRowOption, {
          onNone: () => Effect.succeed(Option.none()),
          onSome: (row) =>
            decodeRuntime(row).pipe(
              Effect.mapError(
                toPersistenceDecodeError(
                  "EngineSessionRuntimeRepository.getByThreadId:rowToRuntime",
                ),
              ),
              Effect.map((runtime) => Option.some(runtime)),
            ),
        }),
      ),
    );

  const list: EngineSessionRuntimeRepositoryShape["list"] = () =>
    listRuntimeRows(undefined).pipe(
      Effect.mapError(
        toPersistenceSqlOrDecodeError(
          "EngineSessionRuntimeRepository.list:query",
          "EngineSessionRuntimeRepository.list:decodeRows",
        ),
      ),
      Effect.flatMap((rows) =>
        Effect.forEach(
          rows,
          (row) =>
            decodeRuntime(row).pipe(
              Effect.mapError(
                toPersistenceDecodeError("EngineSessionRuntimeRepository.list:rowToRuntime"),
              ),
            ),
          { concurrency: "unbounded" },
        ),
      ),
    );

  const deleteByThreadId: EngineSessionRuntimeRepositoryShape["deleteByThreadId"] = (input) =>
    deleteRuntimeByThreadId(input).pipe(
      Effect.mapError(
        toPersistenceSqlError("EngineSessionRuntimeRepository.deleteByThreadId:query"),
      ),
    );

  return {
    upsert,
    getByThreadId,
    list,
    deleteByThreadId,
  } satisfies EngineSessionRuntimeRepositoryShape;
});

export const EngineSessionRuntimeRepositoryLive = Layer.effect(
  EngineSessionRuntimeRepository,
  makeEngineSessionRuntimeRepository,
);
