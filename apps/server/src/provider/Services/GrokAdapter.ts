/**
 * GrokAdapter - Grok Build CLI ACP implementation of the generic engine contract.
 *
 * @module GrokAdapter
 */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

export interface GrokAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "grok";
}

export class GrokAdapter extends ServiceMap.Service<GrokAdapter, GrokAdapterShape>()(
  "harnessos/provider/Services/GrokAdapter",
) {}
