/**
 * OpenCodeAdapter - OpenCode implementation of the generic engine adapter contract.
 *
 * This service owns OpenCode runtime/session semantics and emits canonical
 * engine runtime events. It does not perform cross-engine routing.
 *
 * @module OpenCodeAdapter
 */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

export interface OpenCodeAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "opencode";
}

export class OpenCodeAdapter extends ServiceMap.Service<OpenCodeAdapter, OpenCodeAdapterShape>()(
  "harnessos/provider/Services/OpenCodeAdapter",
) {}
