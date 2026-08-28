/**
 * CursorAdapter - Cursor CLI ACP implementation of the generic engine adapter contract.
 *
 * @module CursorAdapter
 */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

export interface CursorAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "cursor";
}

export class CursorAdapter extends ServiceMap.Service<CursorAdapter, CursorAdapterShape>()(
  "harnessos/provider/Services/CursorAdapter",
) {}
