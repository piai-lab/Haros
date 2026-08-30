/**
 * PiAdapter - Pi direct SDK implementation of the generic engine adapter contract.
 *
 * Pi is intentionally treated as an unopinionated harness: Haros does not add
 * permissions or plan-mode semantics on top of it.
 *
 * @module PiAdapter
 */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

export interface PiAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "pi";
}

export class PiAdapter extends ServiceMap.Service<PiAdapter, PiAdapterShape>()(
  "harnessos/engine/Services/PiAdapter",
) {}
