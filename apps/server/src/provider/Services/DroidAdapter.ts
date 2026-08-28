/**
 * DroidAdapter - Droid Build CLI ACP implementation of the generic engine contract.
 *
 * @module DroidAdapter
 */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

export interface DroidAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "droid";
}

export class DroidAdapter extends ServiceMap.Service<DroidAdapter, DroidAdapterShape>()(
  "harnessos/provider/Services/DroidAdapter",
) {}
