/**
 * DeepSeekAdapter - DeepSeek Harness (`dsh --profile sdk`) JSON-RPC adapter contract.
 *
 * @module DeepSeekAdapter
 */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

export interface DeepSeekAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "deepseek";
}

export class DeepSeekAdapter extends ServiceMap.Service<DeepSeekAdapter, DeepSeekAdapterShape>()(
  "harnessos/engine/Services/DeepSeekAdapter",
) {}
