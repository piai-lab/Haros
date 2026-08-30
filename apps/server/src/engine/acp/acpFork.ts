// FILE: acpFork.ts
// Purpose: Shared "probe capability + session/fork" step for ACP-backed engine adapters.
// Layer: Engine ACP helper
// Exports: forkViaAcpRuntime

import type * as Acp from "@agentclientprotocol/sdk";
import { Effect, Option } from "effect";
import type * as AcpErrors from "./AcpErrors.ts";
import type { AcpSessionRuntimeShape } from "./AcpSessionRuntime.ts";
import { EngineAdapterRequestError, EngineAdapterValidationError } from "../Errors.ts";

/**
 * Fork the runtime's active session when the agent advertises `session/fork`.
 *
 * Fails with a `EngineAdapterValidationError` when the capability is missing
 * so callers fall back to Haros's retained-transcript fork, and bounds the
 * whole probe+fork exchange with the adapter's request timeout.
 */
export function forkViaAcpRuntime(input: {
  readonly engine: string;
  readonly runtime: AcpSessionRuntimeShape;
  readonly targetCwd: string;
  readonly unsupportedIssue: string;
  readonly requestTimeoutMs: number;
  readonly timeoutError: (method: string) => EngineAdapterRequestError;
}): Effect.Effect<
  Acp.ForkSessionResponse,
  AcpErrors.AcpError | EngineAdapterRequestError | EngineAdapterValidationError
> {
  return Effect.gen(function* () {
    if (!(yield* input.runtime.supportsSessionFork)) {
      return yield* new EngineAdapterValidationError({
        engine: input.engine,
        operation: "forkThread",
        issue: input.unsupportedIssue,
      });
    }
    if (!(yield* input.runtime.supportsSessionRecovery)) {
      return yield* new EngineAdapterValidationError({
        engine: input.engine,
        operation: "forkThread",
        issue: `This ${input.engine} ACP version advertises session/fork but cannot reopen the forked session; Haros will rebuild the fork from its retained transcript.`,
      });
    }
    return yield* input.runtime.forkSession({ cwd: input.targetCwd, mcpServers: [] });
  }).pipe(
    Effect.timeoutOption(input.requestTimeoutMs),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(input.timeoutError("session/fork")),
        onSome: Effect.succeed,
      }),
    ),
  );
}
