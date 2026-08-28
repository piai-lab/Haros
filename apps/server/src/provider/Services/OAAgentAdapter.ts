/**
 * OAAgentAdapter - Product-owned Pi-derived engine runtime.
 *
 * The implementation is shared with the stock Pi adapter, but this service
 * loads a physically distinct package whose state root is `.harnessos`.
 */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

export interface OAAgentAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "oa";
}

export class OAAgentAdapter extends ServiceMap.Service<OAAgentAdapter, OAAgentAdapterShape>()(
  "harnessos/provider/Services/OAAgentAdapter",
) {}
