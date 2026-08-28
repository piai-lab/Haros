import { Effect, Layer } from "effect";

import { GitCoreLive } from "./Layers/GitCore";
import { GitHubCliLive } from "./Layers/GitHubCli";
import { GitManagerLive } from "./Layers/GitManager";
import { GitStatusBroadcasterLive } from "./Layers/GitStatusBroadcaster";
import { CodexTextGenerationServiceLive } from "./Layers/CodexTextGeneration";
import { CursorTextGenerationServiceLive } from "./Layers/CursorTextGeneration";
import {
  makeKiloTextGenerationServiceLive,
  makeOpenCodeTextGenerationServiceLive,
} from "./Layers/OpenCodeTextGeneration";
import { EngineTextGenerationLive } from "./Layers/EngineTextGeneration";
import { OpenCodeRuntimeLive } from "../engine/opencodeRuntime";
import {
  makeEngineServerPasswordResolver,
  EngineCredentials,
  EngineCredentialsLive,
} from "../engineCredentials";

const textGenerationEngineLayers = Effect.gen(function* () {
  const credentials = yield* EngineCredentials;
  const resolveEngineServerPassword = makeEngineServerPasswordResolver(credentials);
  return Layer.mergeAll(
    makeKiloTextGenerationServiceLive(resolveEngineServerPassword).pipe(
      Layer.provide(OpenCodeRuntimeLive),
    ),
    makeOpenCodeTextGenerationServiceLive(resolveEngineServerPassword).pipe(
      Layer.provide(OpenCodeRuntimeLive),
    ),
  );
}).pipe(Effect.provide(EngineCredentialsLive.pipe(Layer.orDie)), Layer.unwrap);

export const TextGenerationLayerLive = EngineTextGenerationLive.pipe(
  Layer.provide(CodexTextGenerationServiceLive),
  Layer.provide(CursorTextGenerationServiceLive),
  Layer.provide(textGenerationEngineLayers),
);

export const GitManagerLayerLive = GitManagerLive.pipe(
  Layer.provideMerge(GitCoreLive),
  Layer.provideMerge(GitHubCliLive),
  Layer.provideMerge(TextGenerationLayerLive),
);

export const GitStatusBroadcasterLayerLive = GitStatusBroadcasterLive.pipe(
  Layer.provide(Layer.mergeAll(GitCoreLive, GitManagerLayerLive)),
);

export const GitLayerLive = Layer.mergeAll(
  GitCoreLive,
  GitHubCliLive,
  GitManagerLayerLive,
  GitStatusBroadcasterLayerLive,
);
