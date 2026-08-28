/**
 * Engine status cache helpers.
 *
 * Keeps engine readiness snapshots durable across restarts without making
 * the cache authoritative over fresh CLI probes.
 *
 * @module providerStatusCache
 */
import { ENGINE_KINDS, ServerProviderStatus } from "@harnessos/contracts";
import { Cause, Effect, FileSystem, Schema } from "effect";
import { writeFileStringAtomically } from "../atomicWrite";

const decodeProviderStatusCache = Schema.decodeUnknownEffect(
  Schema.fromJsonString(ServerProviderStatus),
);

const engineOrderRank = (engine: ServerProviderStatus["engine"]): number => {
  const rank = ENGINE_KINDS.indexOf(engine);
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
};

export const orderProviderStatuses = (
  engines: ReadonlyArray<ServerProviderStatus>,
): ReadonlyArray<ServerProviderStatus> =>
  [...engines].toSorted(
    (left, right) => engineOrderRank(left.engine) - engineOrderRank(right.engine),
  );

export function resolveProviderStatusCachePath(input: {
  readonly stateDir: string;
  readonly engine: ServerProviderStatus["engine"];
}): string {
  return `${input.stateDir}/provider-status/${input.engine}.json`;
}

// Ignore unreadable or malformed cache entries so the server can still boot
// and fall back to fresh probes or empty state.
export const readProviderStatusCache = (filePath: string) =>
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

    return yield* decodeProviderStatusCache(trimmed).pipe(
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

export const writeProviderStatusCache = (input: {
  readonly filePath: string;
  readonly engine: ServerProviderStatus;
}) => {
  return writeFileStringAtomically({
    filePath: input.filePath,
    contents: `${JSON.stringify(input.engine, null, 2)}\n`,
  });
};
