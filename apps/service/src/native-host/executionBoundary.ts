import { ProductEngineBindingId, type ProductExecutionObservation } from "@omnimind/contracts";
import path from "node:path";
import { Effect, Layer } from "effect";

import {
  PRODUCT_DATABASE_FILENAME,
  ProductControlPlaneError,
  makeProductControlPlaneLayer,
  type ProductExecutionBoundary,
} from "../product/ProductControlPlane";
import { ServerConfig } from "../config";
import {
  makeNativeHostClientFromEnvironment,
  NativeHostClient,
  NativeHostClientError,
} from "./client";

export function makeNativeHostExecutionBoundary(
  client: NativeHostClient,
): ProductExecutionBoundary {
  const executionRequest = (input: {
    readonly dispatchId: Parameters<ProductExecutionBoundary["attempt"]>[0]["dispatchId"];
    readonly run: Parameters<ProductExecutionBoundary["attempt"]>[0]["run"];
    readonly text: string;
    readonly priorLineageRef: string | null;
  }) => {
    const access = input.run.workspaceObservation.access;
    return {
      dispatchId: input.dispatchId,
      conversationId: input.run.conversationId,
      runId: input.run.id,
      text: input.text,
      selection: {
        engineId: input.run.requestedSelection.engineId,
        modelId: input.run.requestedSelection.modelId,
        thinking: input.run.requestedSelection.thinking,
        permissionPolicy: input.run.requestedSelection.permissionPolicy,
        enforcement: input.run.requestedSelection.enforcement,
        packageGeneration: input.run.requestedSelection.packageGeneration,
      },
      workspace: {
        kind: access.kind,
        cwd: access.primaryFolder ?? access.managedDirectory,
      },
      priorLineageRef: input.priorLineageRef,
    } as const;
  };
  const listeners = new Set<
    Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0]
  >();
  const observations = new Map<string, Promise<void>>();
  let closed = false;
  const publish = (
    runId: Parameters<Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0]>[0],
    observation: Parameters<
      Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0]
    >[1],
  ) => {
    for (const listener of listeners) listener(runId, observation);
  };
  const wait = (milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  const observe = (
    runId: Parameters<typeof publish>[0],
    operationRef: string,
    initialCursor = 0,
  ): void => {
    if (closed || observations.has(operationRef)) return;
    const pendingDelivery = operationRef.startsWith("pi-pending:");
    const running = (async () => {
      let cursor = initialCursor;
      try {
        await wait(100);
        while (!closed) {
          const batch = await client.facts(operationRef, cursor);
          if (batch.resnapshotRequired) {
            if (batch.snapshot) {
              publish(runId, { kind: "snapshot", snapshot: batch.snapshot });
              return;
            }
            if (batch.facts.length > 0) {
              publish(runId, { kind: "facts", facts: batch.facts });
              cursor = batch.facts.at(-1)?.sequence ?? cursor;
              if (batch.facts.some((fact) => fact.kind === "settlement")) return;
              continue;
            }
            const reconciled = await client.reconcile(operationRef, cursor);
            if (reconciled.resolution) {
              if (reconciled.resolution.kind === "accepted") {
                const acceptedOperationRef = reconciled.resolution.operationRef;
                publish(runId, {
                  kind: "delivery-accepted",
                  operationRef: acceptedOperationRef,
                  lineageRef: reconciled.resolution.lineageRef,
                  resolvedSelection: reconciled.resolution.resolvedSelection,
                });
                setTimeout(() => observe(runId, acceptedOperationRef), 0);
              } else {
                publish(runId, {
                  kind: "delivery-rejected",
                  code: reconciled.resolution.code,
                  message: reconciled.resolution.message,
                  retryable: reconciled.resolution.retryable,
                });
              }
              return;
            }
            if (reconciled.snapshot) {
              publish(runId, { kind: "snapshot", snapshot: reconciled.snapshot });
              return;
            } else if (reconciled.facts.length > 0) {
              publish(runId, { kind: "facts", facts: reconciled.facts });
              cursor = reconciled.facts.at(-1)?.sequence ?? cursor;
              if (reconciled.facts.some((fact) => fact.kind === "settlement")) return;
            } else {
              if (reconciled.status !== "running") {
                if (!pendingDelivery) publish(runId, { kind: "outcome-unknown" });
                return;
              }
            }
            if (cursor < reconciled.highWaterSequence) continue;
            if (reconciled.status !== "running") {
              if (!pendingDelivery) publish(runId, { kind: "outcome-unknown" });
              return;
            }
          } else {
            if (batch.facts.length > 0) publish(runId, { kind: "facts", facts: batch.facts });
            cursor = batch.facts.at(-1)?.sequence ?? cursor;
            if (batch.facts.some((fact) => fact.kind === "settlement")) return;
          }
          await wait(100);
        }
      } catch {
        for (let attempt = 0; attempt < 512 && !closed; attempt += 1) {
          await wait(250);
          try {
            const reconciled = await client.reconcile(operationRef, cursor);
            if (reconciled.resolution) {
              if (reconciled.resolution.kind === "accepted") {
                const acceptedOperationRef = reconciled.resolution.operationRef;
                publish(runId, {
                  kind: "delivery-accepted",
                  operationRef: acceptedOperationRef,
                  lineageRef: reconciled.resolution.lineageRef,
                  resolvedSelection: reconciled.resolution.resolvedSelection,
                });
                setTimeout(() => observe(runId, acceptedOperationRef), 0);
              } else {
                publish(runId, {
                  kind: "delivery-rejected",
                  code: reconciled.resolution.code,
                  message: reconciled.resolution.message,
                  retryable: reconciled.resolution.retryable,
                });
              }
              return;
            }
            if (reconciled.snapshot) {
              publish(runId, { kind: "snapshot", snapshot: reconciled.snapshot });
              return;
            } else if (reconciled.facts.length > 0) {
              publish(runId, { kind: "facts", facts: reconciled.facts });
              cursor = reconciled.facts.at(-1)?.sequence ?? cursor;
              if (reconciled.facts.some((fact) => fact.kind === "settlement")) return;
            }
            if (cursor < reconciled.highWaterSequence) {
              continue;
            }
            if (reconciled.status === "running") {
              setTimeout(() => observe(runId, operationRef, cursor), 0);
            } else if (!pendingDelivery) {
              publish(runId, { kind: "outcome-unknown" });
            }
            return;
          } catch {
            // The same accepted operation is queried again; it is never submitted again.
          }
        }
        if (!closed && !pendingDelivery) publish(runId, { kind: "outcome-unknown" });
      }
    })().finally(() => observations.delete(operationRef));
    observations.set(operationRef, running);
  };
  return {
    preflight: (input) => {
      try {
        client.preflightExecution(executionRequest(input));
      } catch (cause) {
        throw new ProductControlPlaneError({
          code:
            cause instanceof NativeHostClientError
              ? cause.code
              : "NATIVE_HOST_EXECUTION_FAILED",
          message:
            cause instanceof NativeHostClientError
              ? cause.message
              : "Native Host execution preflight failed.",
          retryable: cause instanceof NativeHostClientError ? cause.retryable : false,
        });
      }
    },
    attempt: ({ dispatchId, run, text, priorLineageRef, markSent }) =>
      Effect.tryPromise({
        try: async (): Promise<ProductExecutionObservation> => {
          let sent = false;
          let response: Awaited<ReturnType<NativeHostClient["execute"]>>;
          try {
            response = await client.execute(
              executionRequest({ dispatchId, run, text, priorLineageRef }),
              async () => {
                await Effect.runPromise(markSent());
                sent = true;
              },
            );
          } catch (cause) {
            if (!sent) throw cause;
            const reconciliationHint = `pi-pending:${dispatchId}`;
            setTimeout(() => observe(run.id, reconciliationHint), 0);
            return {
              kind: "indeterminate",
              lastConfirmedBoundary: "sent",
              reconciliationHint,
            };
          }
          if (response.kind === "execution.rejected") {
            return {
              kind: "rejected",
              code: response.code,
              message: response.message,
              retryable: response.retryable,
            };
          }
          if (response.kind === "execution.indeterminate") {
            setTimeout(() => observe(run.id, response.reconciliationHint), 0);
            return {
              kind: "indeterminate",
              lastConfirmedBoundary: response.lastConfirmedBoundary,
              reconciliationHint: response.reconciliationHint,
            };
          }
          observe(run.id, response.operationRef);
          return {
            kind: "accepted",
            operationRef: response.operationRef,
            engineBinding: {
              id: ProductEngineBindingId.makeUnsafe(`pi-binding:${run.id}`),
              engineId: response.resolvedSelection.engineId,
              lineageRef: response.lineageRef,
            },
            resolvedSelection: {
              ...response.resolvedSelection,
              executionTarget: run.requestedSelection.executionTarget,
            },
          };
        },
        catch: (cause) =>
          new ProductControlPlaneError({
            code:
              cause instanceof NativeHostClientError ? cause.code : "NATIVE_HOST_EXECUTION_FAILED",
            message:
              cause instanceof NativeHostClientError
                ? cause.message
                : "Native Host execution failed without exposing provider details.",
            retryable: cause instanceof NativeHostClientError ? cause.retryable : false,
          }),
      }),
    subscribeFacts: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    resumeFacts: observe,
    control: (input) =>
      Effect.tryPromise(() => client.control(input.operationRef, input.control, input.text)).pipe(
        Effect.map((response) => ({
          operationRef: response.operationRef,
          control: response.control,
          result: response.result,
          code: response.code,
          message: response.message,
        })),
        Effect.mapError(
          (cause) =>
            new ProductControlPlaneError({
              code:
                cause instanceof NativeHostClientError
                  ? cause.code
                  : "NATIVE_HOST_CONTROL_FAILED",
              message:
                cause instanceof NativeHostClientError
                  ? cause.message
                  : "The Native Host control failed without exposing provider details.",
              retryable: cause instanceof NativeHostClientError ? cause.retryable : false,
            }),
        ),
      ),
    catalog: () =>
      Effect.tryPromise(() => client.catalog()).pipe(
        Effect.map((response) => ({
          engineId: response.engineId,
          runtimeVersion: response.runtimeVersion,
          packageGeneration: response.packageGeneration,
          models: response.models,
          truncated: response.truncated,
        })),
        Effect.mapError(
          () =>
            new ProductControlPlaneError({
              code: "NATIVE_HOST_CATALOG_UNAVAILABLE",
              message: "The Native Host runtime catalog is unavailable.",
              retryable: true,
            }),
        ),
      ),
    close: async () => {
      closed = true;
      listeners.clear();
      await Promise.allSettled(observations.values());
    },
  };
}

export const NativeHostProductControlPlaneLive = Layer.unwrap(
  Effect.gen(function* () {
    const { stateDir } = yield* ServerConfig;
    const client = makeNativeHostClientFromEnvironment(process.env);
    const catalog = client
      ? yield* Effect.tryPromise(() => client.catalog()).pipe(
          Effect.map((response) => ({
            engineId: response.engineId,
            runtimeVersion: response.runtimeVersion,
            packageGeneration: response.packageGeneration,
            models: response.models,
            truncated: response.truncated,
          })),
          Effect.catch(() => Effect.succeed(null)),
        )
      : null;
    return makeProductControlPlaneLayer(
      path.join(stateDir, PRODUCT_DATABASE_FILENAME),
      client ? makeNativeHostExecutionBoundary(client) : undefined,
      catalog,
    );
  }),
);
