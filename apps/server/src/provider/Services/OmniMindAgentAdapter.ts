/**
 * OmniMindAgentAdapter - Product-owned Pi-derived engine runtime.
 *
 * The implementation is shared with the stock Pi adapter, but this service
 * loads a physically distinct package whose state root is `.harnessos`.
 */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

export interface OmniMindAgentAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "oa";
}

export class OmniMindAgentAdapter extends ServiceMap.Service<
  OmniMindAgentAdapter,
  OmniMindAgentAdapterShape
>()("harnessos/provider/Services/OmniMindAgentAdapter") {}
