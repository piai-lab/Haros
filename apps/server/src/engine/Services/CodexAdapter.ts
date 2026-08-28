/**
 * CodexAdapter - Codex implementation of the generic engine adapter contract.
 *
 * This service owns Codex app-server process / JSON-RPC semantics and emits
 * Codex engine events. It does not perform cross-engine routing, shared
 * event fan-out, or checkpoint orchestration.
 *
 * Uses Effect `ServiceMap.Service` for dependency injection and returns the
 * shared engine-adapter error channel with `engine: "codex"` context.
 *
 * @module CodexAdapter
 */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

/**
 * CodexAdapterShape - Service API for the Codex engine adapter.
 */
export interface CodexAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "codex";
}

/**
 * CodexAdapter - Service tag for Codex engine adapter operations.
 */
export class CodexAdapter extends ServiceMap.Service<CodexAdapter, CodexAdapterShape>()(
  "harnessos/engine/Services/CodexAdapter",
) {}
