import {
  ProductEngineBindingId,
  type ProductExecutionFact,
  type ProductExecutionObservation,
  type ProductResolvedSelection,
  type ProductRuntimeCatalog,
  type ProductRunId,
} from "@omnimind/contracts";
import { Effect } from "effect";

import {
  ProductControlPlaneError,
  type ProductExecutionBoundary,
  type ProductPreparedExecution,
} from "../product/ProductControlPlane";
import {
  OpenCodeExecutionBoundary,
  OpenCodePreparationError,
  type PreparedOpenCodeSession,
} from "./executionBoundary";
import type { OpenCodeInstallationEvidence } from "./installation";

type OpenCodePreparedExecution = ProductPreparedExecution & {
  readonly session: PreparedOpenCodeSession;
  readonly lineageRef: string;
  readonly runId: ProductRunId;
  engineSequence: number;
  deliveryObserved: boolean;
};

const isOpenCodePrepared = (
  value: ProductPreparedExecution | null,
): value is OpenCodePreparedExecution => value?.engineId === "opencode" && "session" in value;

export function makeOpenCodeProductExecutionBoundary(input: {
  readonly executable: string;
  readonly scratchBase: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly inspectInstallation?: () => Promise<OpenCodeInstallationEvidence>;
}): ProductExecutionBoundary {
  const source = new OpenCodeExecutionBoundary(input);
  const sessions = new Set<PreparedOpenCodeSession>();
  const activeRuns = new Map<ProductRunId, OpenCodePreparedExecution>();
  let preparationAuthRequired = false;
  const listeners = new Set<
    Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0]
  >();
  const publish = (
    runId: ProductRunId,
    update: Parameters<Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0]>[1],
  ) => {
    for (const listener of listeners) listener(runId, update);
  };
  return {
    prepare: (request) =>
      Effect.tryPromise({
        try: async () => {
          if (request.workspace.access.kind !== "chat" || request.resources.length > 0)
            throw new Error("OpenCode v1 accepts only resource-free Chat execution.");
          const session = await source.prepare(request.priorLineageRef);
          preparationAuthRequired = false;
          sessions.add(session);
          const resolvedSelection: ProductResolvedSelection = {
            engineId: "opencode",
            runtimeModelId: session.runtimeModelId,
            engineModeId: session.engineModeId,
            thinking: null,
            permissionPolicy: "approval-required",
            enforcement: "unverified",
            executionTarget: null,
            packageGeneration: null,
          };
          return {
            engineId: "opencode",
            resolvedSelection,
            lineageRef: session.lineageRef,
            runId: request.runId,
            engineSequence: 0,
            deliveryObserved: false,
            session,
            close: async () => {
              sessions.delete(session);
              await session.close();
            },
          } satisfies OpenCodePreparedExecution;
        },
        catch: (cause) => {
          const reason =
            cause instanceof OpenCodePreparationError ? cause.reason : "initialize-failed";
          if (reason === "auth-required") preparationAuthRequired = true;
          return new ProductControlPlaneError({
            code:
              reason === "auth-required"
                ? "OPENCODE_AUTH_REQUIRED"
                : reason === "protocol-mismatch"
                  ? "OPENCODE_PROTOCOL_MISMATCH"
                  : reason === "process-unavailable"
                    ? "OPENCODE_PROCESS_UNAVAILABLE"
                    : "OPENCODE_PREPARE_FAILED",
            message:
              reason === "auth-required"
                ? "OpenCode requires authentication before this Run can be prepared."
                : "OpenCode preparation failed.",
            retryable: true,
          });
        },
      }),
    attempt: ({ prepared, text, markSent, run }) =>
      Effect.tryPromise({
        try: async (): Promise<ProductExecutionObservation> => {
          if (!isOpenCodePrepared(prepared))
            throw new Error("Prepared OpenCode Session is unavailable.");
          activeRuns.set(run.id, prepared);
          try {
            const result = await prepared.session.prompt(
              text,
              (fact) => {
                prepared.engineSequence += 1;
                const engineSequence = prepared.engineSequence;
                const emittedAt = new Date().toISOString();
                const mapped: ProductExecutionFact | null = (() => {
                  switch (fact.kind) {
                    case "message":
                      return {
                        kind: "assistant.delta",
                        text: fact.text,
                        engineSequence,
                        emittedAt,
                      };
                    case "thought":
                      return { kind: "thinking.delta", text: fact.text, engineSequence, emittedAt };
                    case "tool-started":
                      return {
                        kind: "tool.started",
                        toolCallId: fact.toolCallId,
                        toolName: fact.title,
                        engineSequence,
                        emittedAt,
                      };
                    case "tool-settled":
                      return {
                        kind: "tool.settled",
                        toolCallId: fact.toolCallId,
                        toolName: fact.title,
                        outcome: fact.outcome,
                        summary: fact.title,
                        engineSequence,
                        emittedAt,
                      };
                    case "plan":
                      return {
                        kind: "plan.updated",
                        summary: fact.summary,
                        engineSequence,
                        emittedAt,
                      };
                    case "context-usage":
                      return {
                        kind: "context.usage",
                        used: fact.used,
                        size: fact.size,
                        engineSequence,
                        emittedAt,
                      };
                    case "permission-requested":
                      return {
                        kind: "permission.requested",
                        toolCallId: fact.toolCallId,
                        title: fact.title,
                        engineSequence,
                        emittedAt,
                      };
                    case "permission-rejected":
                      return {
                        kind: "permission.rejected",
                        toolCallId: fact.toolCallId,
                        reason: fact.reason,
                        engineSequence,
                        emittedAt,
                      };
                  }
                })();
                if (!mapped) return;
                if (!prepared.deliveryObserved) {
                  prepared.deliveryObserved = true;
                  publish(prepared.runId, {
                    kind: "delivery-observed",
                    engineBinding: {
                      id: ProductEngineBindingId.makeUnsafe(`opencode-binding:${prepared.runId}`),
                      engineId: "opencode",
                      lineageRef: prepared.lineageRef,
                    },
                    resolvedSelection: prepared.resolvedSelection!,
                    firstFact: mapped,
                  });
                  return;
                }
                publish(prepared.runId, { kind: "facts", facts: [mapped] });
              },
              () => Effect.runPromise(markSent()),
            );
            if (result.state === "delivery_unknown")
              return { kind: "indeterminate", lastConfirmedBoundary: "sent" };
            const engineBinding = {
              id: ProductEngineBindingId.makeUnsafe(`opencode-binding:${run.id}`),
              engineId: "opencode",
              lineageRef: prepared.lineageRef,
            };
            if (result.state === "settled") {
              prepared.engineSequence += 1;
              const settlement: ProductExecutionFact = {
                kind: "settlement",
                outcome: result.outcome,
                message: null,
                engineSequence: prepared.engineSequence,
                emittedAt: result.settledAt,
              };
              if (prepared.deliveryObserved) {
                publish(prepared.runId, { kind: "facts", facts: [settlement] });
              } else {
                prepared.deliveryObserved = true;
                publish(prepared.runId, {
                  kind: "delivery-observed",
                  engineBinding,
                  resolvedSelection: prepared.resolvedSelection!,
                  firstFact: settlement,
                });
              }
            }
            return result.state === "outcome_unknown"
              ? {
                  kind: "observed-outcome-unknown",
                  engineBinding,
                  resolvedSelection: prepared.resolvedSelection!,
                }
              : {
                  kind: "observed-settled",
                  engineBinding,
                  resolvedSelection: prepared.resolvedSelection!,
                  outcome: result.outcome,
                  settledAt: result.settledAt,
                };
          } finally {
            if (activeRuns.get(run.id) === prepared) activeRuns.delete(run.id);
          }
        },
        catch: () =>
          new ProductControlPlaneError({
            code: "OPENCODE_EXECUTION_FAILED",
            message: "OpenCode execution failed.",
            retryable: false,
          }),
      }),
    control: (request) => {
      if (request.control !== "abort" && request.control !== "cancel") {
        return Effect.succeed({
          operationRef: null,
          control: request.control,
          result: "unsupported",
          code: "control-unsupported",
          message: "OpenCode does not support this control for the current Run.",
        });
      }
      const prepared = activeRuns.get(request.run.id);
      if (!prepared) {
        return Effect.succeed({
          operationRef: null,
          control: request.control,
          result: "too-late",
          code: "control-too-late",
          message: "The OpenCode Run is no longer accepting cancellation requests.",
        });
      }
      return Effect.tryPromise({
        try: async () => {
          const result = await prepared.session.cancel();
          return {
            operationRef: null,
            control: request.control,
            result,
            code: result === "requested" ? "control-unacknowledged" : "control-too-late",
            message:
              result === "requested"
                ? "Cancellation was written to OpenCode without an acknowledgement."
                : "The OpenCode Run is no longer accepting cancellation requests.",
          } as const;
        },
        catch: () =>
          new ProductControlPlaneError({
            code: "OPENCODE_CANCEL_WRITE_FAILED",
            message: "OpenCode cancellation could not be written.",
            retryable: false,
          }),
      });
    },
    subscribeFacts: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    catalog: () =>
      Effect.tryPromise({
        try: async (): Promise<ProductRuntimeCatalog> => {
          const readiness = preparationAuthRequired
            ? ({ state: "unavailable", reason: "auth-required" } as const)
            : await source.readiness();
          const available = readiness.state === "available";
          const truth = (state: "available" | "unsupported" | "unknown", reason: string) =>
            ({ state, reason }) as const;
          return {
            defaultEngineId: "opencode",
            packageGeneration: null,
            engines: [
              {
                engineId: "opencode",
                displayName: "OpenCode",
                distribution: "user-installed",
                runtimeVersion: available ? readiness.installation.version : null,
                protocol: { name: "acp", version: "1" },
                availability: available
                  ? { state: "available" }
                  : { state: "unavailable", reason: readiness.reason },
                modelSelection: {
                  kind: "engine-session",
                  model: "resolved-on-prepare",
                  mode: "resolved-on-prepare",
                  thinking: "unsupported",
                },
                capabilities: {
                  continuation: truth("available", "acp-session"),
                  rebuild: truth("unknown", "not-observed"),
                  thinkingStream: truth("available", "acp-session-update"),
                  thinkingLevel: truth("unsupported", "engine-session-owned"),
                  structuredQuestion: truth("unsupported", "permission-asks-rejected"),
                  queue: truth("available", "product-queue"),
                  steer: truth("unsupported", "not-supported"),
                  followUp: truth("unsupported", "not-supported"),
                  cancel: truth("available", "acp-cancel-request"),
                  permissionPolicy: truth("unsupported", "approval-ui-out-of-scope"),
                  packages: truth("unsupported", "external-engine"),
                  filesRead: truth("unsupported", "chat-only"),
                  filesWrite: truth("unsupported", "chat-only"),
                  terminal: truth("unsupported", "chat-only"),
                  namespacedUi: truth("unknown", "not-observed"),
                },
                enforcement: "unverified",
              },
            ],
          };
        },
        catch: () =>
          new ProductControlPlaneError({
            code: "OPENCODE_CATALOG_UNAVAILABLE",
            message: "OpenCode catalog unavailable.",
            retryable: true,
          }),
      }),
    close: async () => {
      const active = [...sessions];
      listeners.clear();
      activeRuns.clear();
      sessions.clear();
      await Promise.allSettled(active.map((session) => session.close()));
    },
  };
}
