/**
 * Engine status cache helpers.
 *
 * Keeps engine readiness snapshots durable across restarts without making
 * the cache authoritative over fresh CLI probes.
 *
 * @module engineStatusCache
 */
import { ENGINE_KINDS, ServerEngineStatus } from "@harnessos/contracts";
import { Cause, Effect, FileSystem, Schema } from "effect";
import { writeFileStringAtomically } from "../atomicWrite";

const decodeEngineStatusCache = Schema.decodeUnknownEffect(
  Schema.fromJsonString(ServerEngineStatus),
);

const engineOrderRank = (engine: ServerEngineStatus["engine"]): number => {
  const rank = ENGINE_KINDS.indexOf(engine);
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
};

export const orderEngineStatuses = (
  engines: ReadonlyArray<ServerEngineStatus>,
): ReadonlyArray<ServerEngineStatus> =>
  [...engines].toSorted(
    (left, right) => engineOrderRank(left.engine) - engineOrderRank(right.engine),
  );

export function resolveEngineStatusCachePath(input: {
  readonly stateDir: string;
  readonly engine: ServerEngineStatus["engine"];
}): string {
  return `${input.stateDir}/provider-status/${input.engine}.json`;
}

// Ignore unreadable or malformed cache entries so the server can still boot
// and fall back to fresh probes or empty state.
export const readEngineStatusCache = (filePath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const exists = yield* fs.exists(filePath).pipe(Effect.orElseSucceed(() => false));
    if (!exists) {
      return undefined;
    }

    const raw = yield* fs.readFileString(filePath).pipe(Effect.orElseSucceed(() => ""));
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    return yield* decodeEngineStatusCache(trimmed).pipe(
      Effect.matchCauseEffect({
        onFailure: (cause) =>
          Effect.logWarning("failed to parse engine status cache, ignoring", {
            path: filePath,
            issues: Cause.pretty(cause),
          }).pipe(Effect.as(undefined)),
        onSuccess: Effect.succeed,
      }),
    );
  });

export const writeEngineStatusCache = (input: {
  readonly filePath: string;
  readonly engine: ServerEngineStatus;
}) => {
  return writeFileStringAtomically({
    filePath: input.filePath,
    contents: `${JSON.stringify(input.engine, null, 2)}\n`,
  });
};
