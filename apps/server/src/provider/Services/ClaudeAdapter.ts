/**
 * ClaudeAdapter - Claude Agent implementation of the generic engine adapter contract.
 *
 * This service owns Claude runtime/session semantics and emits canonical
 * engine runtime events. It does not perform cross-engine routing, shared
 * event fan-out, or checkpoint orchestration.
 *
 * Uses Effect `ServiceMap.Service` for dependency injection and returns the
 * shared engine-adapter error channel with `engine: "claude"` context.
 *
 * @module ClaudeAdapter
 */
import { ServiceMap } from "effect";

import type { EngineAdapterError } from "../Errors.ts";
import type { EngineAdapterShape } from "./EngineAdapter.ts";

/**
 * ClaudeAdapterShape - Service API for the Claude Agent engine adapter.
 */
export interface ClaudeAdapterShape extends EngineAdapterShape<EngineAdapterError> {
  readonly engine: "claude";
  readonly steerTurn: NonNullable<EngineAdapterShape<EngineAdapterError>["steerTurn"]>;
  readonly stopTask: NonNullable<EngineAdapterShape<EngineAdapterError>["stopTask"]>;
  readonly backgroundTask: NonNullable<EngineAdapterShape<EngineAdapterError>["backgroundTask"]>;
  readonly steerSubagent: NonNullable<EngineAdapterShape<EngineAdapterError>["steerSubagent"]>;
}

/**
 * ClaudeAdapter - Service tag for Claude Agent engine adapter operations.
 */
export class ClaudeAdapter extends ServiceMap.Service<ClaudeAdapter, ClaudeAdapterShape>()(
  "harnessos/provider/Services/ClaudeAdapter",
) {}
