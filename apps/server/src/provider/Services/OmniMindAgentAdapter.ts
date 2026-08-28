/**
 * OmniMindAgentAdapter - Product-owned Pi-derived provider runtime.
 *
 * The implementation is shared with the stock Pi adapter, but this service
 * loads a physically distinct package whose state root is `.harnessos`.
 */
import { ServiceMap } from "effect";

import type { ProviderAdapterError } from "../Errors.ts";
import type { ProviderAdapterShape } from "./ProviderAdapter.ts";

export interface OmniMindAgentAdapterShape extends ProviderAdapterShape<ProviderAdapterError> {
  readonly provider: "omnimind";
}

export class OmniMindAgentAdapter extends ServiceMap.Service<
  OmniMindAgentAdapter,
  OmniMindAgentAdapterShape
>()("harnessos/provider/Services/OmniMindAgentAdapter") {}
