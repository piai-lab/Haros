import { EngineKind, type ThreadId } from "@harnessos/contracts";
import { Effect, Layer, Option, Schema } from "effect";

import { EngineSessionRuntimeRepository } from "../../persistence/Services/EngineSessionRuntime.ts";
import { EngineSessionDirectoryPersistenceError, EngineValidationError } from "../Errors.ts";
import {
  EngineSessionDirectory,
  type EngineRuntimeBinding,
  type EngineSessionDirectoryShape,
} from "../Services/EngineSessionDirectory.ts";

function toPersistenceError(operation: string) {
  return (cause: unknown) =>
    new EngineSessionDirectoryPersistenceError({
      operation,
      detail: `Failed to execute ${operation}.`,
      cause,
    });
}

function decodeEngineKind(
  engine: string,
  operation: string,
): Effect.Effect<EngineKind, EngineSessionDirectoryPersistenceError> {
  if (Schema.is(EngineKind)(engine)) {
    return Effect.succeed(engine);
  }
  return Effect.fail(
    new EngineSessionDirectoryPersistenceError({
      operation,
      detail: `Unknown persisted engine '${engine}'.`,
    }),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeRuntimePayload(
  existing: unknown | null,
  next: unknown | null | undefined,
): unknown | null {
  if (next === undefined) {
    return existing ?? null;
  }
  if (isRecord(existing) && isRecord(next)) {
    return { ...existing, ...next };
  }
  return next;
}

const makeEngineSessionDirectory = Effect.gen(function* () {
  const repository = yield* EngineSessionRuntimeRepository;

  const getBinding = (threadId: ThreadId) =>
    repository.getByThreadId({ threadId }).pipe(
      Effect.mapError(toPersistenceError("EngineSessionDirectory.getBinding:getByThreadId")),
      Effect.flatMap((runtime) =>
        Option.match(runtime, {
          onNone: () => Effect.succeed(Option.none<EngineRuntimeBinding>()),
          onSome: (value) =>
            decodeEngineKind(value.engine, "EngineSessionDirectory.getBinding").pipe(
              Effect.map((engine) =>
                Option.some({
                  threadId: value.threadId,
                  engine,
                  adapterKey: value.adapterKey,
                  runtimeMode: value.runtimeMode,
                  status: value.status,
                  lifecycleGeneration: value.lifecycleGeneration,
                  lastSeenAt: value.lastSeenAt,
                  resumeCursor: value.resumeCursor,
                  admission: value.admission,
                  runtimePayload: value.runtimePayload,
                }),
              ),
            ),
        }),
      ),
    );

  const upsert: EngineSessionDirectoryShape["upsert"] = Effect.fn(function* (binding) {
    const existing = yield* repository
      .getByThreadId({ threadId: binding.threadId })
      .pipe(Effect.mapError(toPersistenceError("EngineSessionDirectory.upsert:getByThreadId")));

    const existingRuntime = Option.getOrUndefined(existing);
    const resolvedThreadId = binding.threadId ?? existingRuntime?.threadId;
    if (!resolvedThreadId) {
      return yield* new EngineValidationError({
        operation: "EngineSessionDirectory.upsert",
        issue: "threadId must be a non-empty string.",
      });
    }

    const now = new Date().toISOString();
    const engineChanged =
      existingRuntime !== undefined && existingRuntime.engine !== binding.engine;
    const compatibleRuntime = engineChanged ? undefined : existingRuntime;
    yield* repository
      .upsert({
        threadId: resolvedThreadId,
        engine: binding.engine,
        adapterKey:
          binding.adapterKey ??
          (engineChanged ? binding.engine : (existingRuntime?.adapterKey ?? binding.engine)),
        runtimeMode: binding.runtimeMode ?? existingRuntime?.runtimeMode ?? "full-access",
        status: binding.status ?? compatibleRuntime?.status ?? "running",
        lifecycleGeneration:
          binding.lifecycleGeneration ?? compatibleRuntime?.lifecycleGeneration ?? "legacy",
        lastSeenAt: now,
        resumeCursor:
          binding.resumeCursor !== undefined
            ? binding.resumeCursor
            : (compatibleRuntime?.resumeCursor ?? null),
        admission:
          binding.admission !== undefined
            ? binding.admission
            : (compatibleRuntime?.admission ?? null),
        runtimePayload: mergeRuntimePayload(
          compatibleRuntime?.runtimePayload ?? null,
          binding.runtimePayload,
        ),
      })
      .pipe(Effect.mapError(toPersistenceError("EngineSessionDirectory.upsert:upsert")));
  });

  const replace: EngineSessionDirectoryShape["replace"] = (binding) =>
    repository
      .upsert({
        threadId: binding.threadId,
        engine: binding.engine,
        adapterKey: binding.adapterKey ?? binding.engine,
        runtimeMode: binding.runtimeMode ?? "full-access",
        status: binding.status ?? "running",
        lifecycleGeneration: binding.lifecycleGeneration ?? "legacy",
        lastSeenAt: new Date().toISOString(),
        resumeCursor: binding.resumeCursor ?? null,
        admission: binding.admission ?? null,
        runtimePayload: binding.runtimePayload ?? null,
      })
      .pipe(Effect.mapError(toPersistenceError("EngineSessionDirectory.replace:upsert")));

  const getEngine: EngineSessionDirectoryShape["getEngine"] = (threadId) =>
    getBinding(threadId).pipe(
      Effect.flatMap((binding) =>
        Option.match(binding, {
          onSome: (value) => Effect.succeed(value.engine),
          onNone: () =>
            Effect.fail(
              new EngineSessionDirectoryPersistenceError({
                operation: "EngineSessionDirectory.getEngine",
                detail: `No persisted engine binding found for thread '${threadId}'.`,
              }),
            ),
        }),
      ),
    );

  const remove: EngineSessionDirectoryShape["remove"] = (threadId) =>
    repository
      .deleteByThreadId({ threadId })
      .pipe(Effect.mapError(toPersistenceError("EngineSessionDirectory.remove:deleteByThreadId")));

  const listThreadIds: EngineSessionDirectoryShape["listThreadIds"] = () =>
    repository.list().pipe(
      Effect.mapError(toPersistenceError("EngineSessionDirectory.listThreadIds:list")),
      Effect.map((rows) => rows.map((row) => row.threadId)),
    );

  const listBindings: EngineSessionDirectoryShape["listBindings"] = () =>
    repository.list().pipe(
      Effect.mapError(toPersistenceError("EngineSessionDirectory.listBindings:list")),
      Effect.flatMap(
        Effect.forEach((row) =>
          decodeEngineKind(row.engine, "EngineSessionDirectory.listBindings").pipe(
            Effect.map((engine) =>
              Option.some({
                threadId: row.threadId,
                engine,
                adapterKey: row.adapterKey,
                runtimeMode: row.runtimeMode,
                status: row.status,
                lifecycleGeneration: row.lifecycleGeneration,
                lastSeenAt: row.lastSeenAt,
                resumeCursor: row.resumeCursor,
                admission: row.admission,
                runtimePayload: row.runtimePayload,
              }),
            ),
            Effect.catchTag("EngineSessionDirectoryPersistenceError", (error) =>
              Effect.logDebug("engine session directory skipped unknown persisted engine", {
                threadId: row.threadId,
                engine: row.engine,
                detail: error.detail,
              }).pipe(Effect.as(Option.none<EngineRuntimeBinding>())),
            ),
          ),
        ),
      ),
      Effect.map((bindings) => bindings.filter(Option.isSome).map((binding) => binding.value)),
    );

  return {
    upsert,
    replace,
    getEngine,
    getBinding,
    remove,
    listThreadIds,
    listBindings,
  } satisfies EngineSessionDirectoryShape;
});

export const EngineSessionDirectoryLive = Layer.effect(
  EngineSessionDirectory,
  makeEngineSessionDirectory,
);

export function makeEngineSessionDirectoryLive() {
  return Layer.effect(EngineSessionDirectory, makeEngineSessionDirectory);
}
