/**
 * KiloAdapter - Kilo implementation of the generic engine adapter contract.
 *
 * Kilo's CLI/server API is OpenCode-compatible, so the live layer reuses the
 * OpenCode adapter implementation with Kilo-specific process settings.
 *
 * @module KiloAdapter
 */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

export interface KiloAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "kilo";
}

export class KiloAdapter extends ServiceMap.Service<KiloAdapter, KiloAdapterShape>()(
  "harnessos/provider/Services/KiloAdapter",
) {}
