/** Antigravity CLI implementation of the generic engine adapter contract. */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

export interface AntigravityAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "antigravity";
}

export class AntigravityAdapter extends ServiceMap.Service<
  AntigravityAdapter,
  AntigravityAdapterShape
>()("harnessos/engine/Services/AntigravityAdapter") {}
