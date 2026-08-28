import { ServiceMap } from "effect";
import type { Effect, Scope } from "effect";

export interface EngineRuntimeReconcilerShape {
  readonly reconcileNow: Effect.Effect<void, unknown>;
  readonly start: () => Effect.Effect<void, never, Scope.Scope>;
}

export class EngineRuntimeReconciler extends ServiceMap.Service<
  EngineRuntimeReconciler,
  EngineRuntimeReconcilerShape
>()("harnessos/engine/Services/EngineRuntimeReconciler") {}
