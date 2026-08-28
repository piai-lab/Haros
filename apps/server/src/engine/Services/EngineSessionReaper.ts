import { Effect, Scope, ServiceMap } from "effect";

export interface EngineSessionReaperShape {
  readonly start: () => Effect.Effect<void, never, Scope.Scope>;
}

export class EngineSessionReaper extends ServiceMap.Service<
  EngineSessionReaper,
  EngineSessionReaperShape
>()("harnessos/engine/Services/EngineSessionReaper") {}
