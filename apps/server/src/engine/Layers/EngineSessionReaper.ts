import { Cause, Duration, Effect, Layer, Option, Schedule } from "effect";

import { ProjectionSnapshotQuery } from "../../orchestration/Services/ProjectionSnapshotQuery";
import { EngineSessionDirectory } from "../Services/EngineSessionDirectory";
import {
  EngineSessionReaper,
  type EngineSessionReaperShape,
} from "../Services/EngineSessionReaper";
import { EngineService } from "../Services/EngineService";

const DEFAULT_INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000;
const DEFAULT_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

export interface EngineSessionReaperLiveOptions {
  readonly inactivityThresholdMs?: number;
  readonly sweepIntervalMs?: number;
}

const makeEngineSessionReaper = (options?: EngineSessionReaperLiveOptions) =>
  Effect.gen(function* () {
    const engineService = yield* EngineService;
    const directory = yield* EngineSessionDirectory;
    const projectionSnapshotQuery = yield* ProjectionSnapshotQuery;

    const inactivityThresholdMs = Math.max(
      1,
      options?.inactivityThresholdMs ?? DEFAULT_INACTIVITY_THRESHOLD_MS,
    );
    const sweepIntervalMs = Math.max(1, options?.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS);

    const sweep = Effect.gen(function* () {
      const bindings = yield* directory.listBindings();
      const now = Date.now();

      for (const binding of bindings) {
        if (binding.status === "stopped") continue;
        if (!binding.lastSeenAt) continue;

        const lastSeenMs = Date.parse(binding.lastSeenAt);
        if (Number.isNaN(lastSeenMs)) {
          yield* Effect.logWarning("engine session reaper skipped invalid timestamp", {
            threadId: binding.threadId,
            engine: binding.engine,
            lastSeenAt: binding.lastSeenAt,
          });
          continue;
        }

        const idleDurationMs = now - lastSeenMs;
        if (idleDurationMs < inactivityThresholdMs) continue;

        const thread = yield* projectionSnapshotQuery
          .getThreadShellById(binding.threadId)
          .pipe(Effect.map(Option.getOrUndefined));
        if (thread?.session?.activeTurnId != null) continue;

        yield* engineService.stopSession({ threadId: binding.threadId }).pipe(
          Effect.catchCause((cause) =>
            Effect.logWarning("engine session reaper failed to stop stale session", {
              threadId: binding.threadId,
              engine: binding.engine,
              cause: Cause.pretty(cause),
            }),
          ),
        );
      }
    });

    const runSweepSafely = sweep.pipe(
      Effect.catchCause((cause) =>
        Effect.logWarning("engine session reaper sweep failed", {
          cause: Cause.pretty(cause),
        }),
      ),
    );

    const start: EngineSessionReaperShape["start"] = () =>
      Effect.forkScoped(
        runSweepSafely.pipe(Effect.repeat(Schedule.spaced(Duration.millis(sweepIntervalMs)))),
      ).pipe(Effect.asVoid);

    return { start } satisfies EngineSessionReaperShape;
  });

export const makeEngineSessionReaperLive = (options?: EngineSessionReaperLiveOptions) =>
  Layer.effect(EngineSessionReaper, makeEngineSessionReaper(options));

export const EngineSessionReaperLive = makeEngineSessionReaperLive();
