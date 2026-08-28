import { Effect, Layer } from "effect";

import {
  OrchestrationReactor,
  type OrchestrationReactorShape,
} from "../Services/OrchestrationReactor.ts";
import { CheckpointReactor } from "../Services/CheckpointReactor.ts";
import { EngineCommandReactor } from "../Services/EngineCommandReactor.ts";
import { EngineRuntimeIngestionService } from "../Services/EngineRuntimeIngestion.ts";
import { StudioOutputReactor } from "../Services/StudioOutputReactor.ts";
import { ThreadGitMetadataReactor } from "../Services/ThreadGitMetadataReactor.ts";

export const makeOrchestrationReactor = Effect.gen(function* () {
  const engineRuntimeIngestion = yield* EngineRuntimeIngestionService;
  const providerCommandReactor = yield* EngineCommandReactor;
  const checkpointReactor = yield* CheckpointReactor;
  const studioOutputReactor = yield* StudioOutputReactor;
  const threadGitMetadataReactor = yield* ThreadGitMetadataReactor;

  const start: OrchestrationReactorShape["start"] = Effect.gen(function* () {
    yield* studioOutputReactor.start;
    yield* checkpointReactor.start;
    yield* threadGitMetadataReactor.start;
    yield* engineRuntimeIngestion.start;
    // Install every runtime observer before engine command dispatch can
    // begin. Reverse-order finalization then drains engine commands first,
    // runtime ingestion second, Git metadata third, checkpoints fourth, and Studio output last.
    yield* providerCommandReactor.start;
  });

  return {
    start,
    reconcileSettledOpenTurns: engineRuntimeIngestion.reconcileSettledOpenTurns,
    reconcileQueuedTurns: providerCommandReactor.reconcileQueuedTurns,
  } satisfies OrchestrationReactorShape;
});

export const OrchestrationReactorLive = Layer.effect(
  OrchestrationReactor,
  makeOrchestrationReactor,
);
