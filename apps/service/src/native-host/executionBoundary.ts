import {
  ProductEngineBindingId,
  type ProductExecutionObservation,
  type ProductRuntimeCatalog,
} from "@omnimind/contracts";
import path from "node:path";
import { Effect, Layer } from "effect";

import {
  PRODUCT_DATABASE_FILENAME,
  ProductControlPlaneError,
  isProductPackageFatalCode,
  makeProductControlPlaneLayer,
  readProductPackageLifecycleFacts,
  type ProductExecutionBoundary,
} from "../product/ProductControlPlane";
import { ServerConfig } from "../config";
import {
  makeNativeHostClientFromEnvironment,
  NativeHostClient,
  NativeHostClientError,
} from "./client";
import {
  PiPackageLifecycle,
  PiPackageLifecycleError,
  resolveCuratedPiPackageEvidence,
} from "./packageLifecycle";

function lifecycleRejection(cause: PiPackageLifecycleError): ProductExecutionObservation {
  return {
    kind: "rejected",
    code: cause.code,
    message: cause.message,
    retryable: cause.code === "PACKAGE_GENERATION_STALE",
  };
}

export function makePackageStateUnavailableBoundary(cause: unknown): ProductExecutionBoundary {
  const code = cause instanceof PiPackageLifecycleError ? cause.code : "PACKAGE_STATE_INVALID";
  const message = "Product Package state is unavailable and execution is fail-closed.";
  return {
    preflight: () => {
      throw new ProductControlPlaneError({ code, message, retryable: false });
    },
    attempt: () => Effect.succeed({ kind: "rejected", code, message, retryable: false }),
    catalog: () => Effect.succeed(null),
  };
}

export async function prepareCuratedPiPackage(input: {
  readonly client: NativeHostClient;
  readonly lifecycle: PiPackageLifecycle;
  readonly packageDirectory: string;
  readonly noticePath: string;
  readonly activeCurrentGenerationLeaseCount: number;
}): Promise<void> {
  const artifact = input.lifecycle.stageCurated({
    packageDirectory: input.packageDirectory,
    noticePath: input.noticePath,
  });
  const validation = await input.client.validatePackage(artifact);
  if (
    validation.status !== "validated" ||
    validation.generation !== artifact.generation ||
    !validation.report
  ) {
    throw new PiPackageLifecycleError(
      "PACKAGE_NATIVE_VALIDATION_FAILED",
      "The curated Package generation failed native Pi validation.",
    );
  }
  input.lifecycle.recordValidated(artifact, validation.report);
  input.lifecycle.activate(artifact.generation, input.activeCurrentGenerationLeaseCount);
}

export async function initializeProductPackageLifecycle(input: {
  readonly stateDir: string;
  readonly productDatabase: string;
  readonly client: NativeHostClient | null;
  readonly applicationRoot?: string;
}): Promise<PiPackageLifecycle> {
  const lifecycle = new PiPackageLifecycle({ stateDir: input.stateDir });
  const committed = await readProductPackageLifecycleFacts(input.productDatabase);
  for (const replay of committed.replay) {
    if (replay.kind === "successful") {
      lifecycle.recordSuccessfulGeneration(replay.generation);
    } else {
      lifecycle.quarantineGeneration(replay.generation, replay.code);
    }
  }
  if (!input.client) return lifecycle;

  // Missing application-root assets disable the Package capability. A present candidate that
  // fails exact source/native validation is different: it must not replace current or LKG.
  const evidence = resolveCuratedPiPackageEvidence(
    input.applicationRoot ? { applicationRoot: input.applicationRoot } : {},
  );
  try {
    const currentGeneration = lifecycle.snapshot().currentGeneration;
    await prepareCuratedPiPackage({
      client: input.client,
      lifecycle,
      ...evidence,
      activeCurrentGenerationLeaseCount: currentGeneration
        ? (committed.activeLeaseCounts[currentGeneration] ?? 0)
        : 0,
    });
  } catch {
    // A failed present candidate does not replace or invalidate current/LKG generations.
  }
  return lifecycle;
}

export function makeNativeHostExecutionBoundary(
  client: NativeHostClient,
  lifecycle?: PiPackageLifecycle,
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
        runtimeModelId: input.run.requestedSelection.runtimeModelId,
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
  const runGenerations = new Map<string, string>();
  let closed = false;
  const publish = (
    runId: Parameters<Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0]>[0],
    observation: Parameters<
      Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0]
    >[1],
  ) => {
    for (const listener of listeners) listener(runId, observation);
    const generation = runGenerations.get(runId);
    if (!lifecycle || !generation) return;
    if (observation.kind === "facts") {
      const packageFailed = observation.facts.some((fact) => fact.kind === "package.failed");
      if (packageFailed) {
        lifecycle.quarantineGeneration(generation, "PI_PACKAGE_NATIVE_FAULT");
      } else if (
        observation.facts.some((fact) => fact.kind === "settlement" && fact.outcome === "succeeded")
      ) {
        lifecycle.recordSuccessfulGeneration(generation);
      }
      if (observation.facts.some((fact) => fact.kind === "settlement")) {
        runGenerations.delete(runId);
      }
    } else if (observation.kind === "snapshot") {
      if (observation.snapshot.settlement.outcome === "succeeded") {
        lifecycle.recordSuccessfulGeneration(generation);
      }
      runGenerations.delete(runId);
    } else if (observation.kind === "delivery-rejected") {
      if (isProductPackageFatalCode(observation.code)) {
        lifecycle.quarantineGeneration(generation, observation.code);
      }
      runGenerations.delete(runId);
    }
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
        lifecycle?.assertSelectable(input.run.requestedSelection.packageGeneration);
        client.preflightExecution(executionRequest(input));
      } catch (cause) {
        throw new ProductControlPlaneError({
          code:
            cause instanceof PiPackageLifecycleError
              ? cause.code
              : cause instanceof NativeHostClientError
                ? cause.code
                : "NATIVE_HOST_EXECUTION_FAILED",
          message:
            cause instanceof PiPackageLifecycleError
              ? cause.message
              : cause instanceof NativeHostClientError
                ? cause.message
                : "Native Host execution preflight failed.",
          retryable:
            cause instanceof PiPackageLifecycleError
              ? cause.code === "PACKAGE_GENERATION_STALE"
              : cause instanceof NativeHostClientError
                ? cause.retryable
                : false,
        });
      }
    },
    attempt: ({ dispatchId, run, text, priorLineageRef, markSent }) =>
      Effect.tryPromise({
        try: async (): Promise<ProductExecutionObservation> => {
          runGenerations.set(run.id, run.requestedSelection.packageGeneration);
          let artifact = null;
          if (lifecycle) {
            try {
              lifecycle.assertSelectable(run.requestedSelection.packageGeneration);
              artifact = lifecycle.artifactForGeneration(run.requestedSelection.packageGeneration);
            } catch (cause) {
              if (cause instanceof PiPackageLifecycleError) {
                return lifecycleRejection(cause);
              }
              throw cause;
            }
          }
          let sent = false;
          let response: Awaited<ReturnType<NativeHostClient["execute"]>>;
          try {
            if (artifact) {
              const validation = await client.validatePackage(artifact);
              if (
                validation.status !== "validated" ||
                validation.generation !== artifact.generation ||
                !validation.report
              ) {
                return {
                  kind: "rejected",
                  code: "PI_PACKAGE_VALIDATION_FAILED",
                  message: "The selected Package generation failed native validation.",
                  retryable: false,
                };
              }
              try {
                lifecycle?.recordValidated(artifact, validation.report);
              } catch (cause) {
                if (!(cause instanceof PiPackageLifecycleError)) throw cause;
                return lifecycleRejection(cause);
              }
            }
            response = await client.execute(
              executionRequest({ dispatchId, run, text, priorLineageRef }),
              async () => {
                await Effect.runPromise(markSent());
                sent = true;
              },
            );
          } catch (cause) {
            if (!sent) {
              throw cause;
            }
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
    bindRunPackageGeneration: (runId, generation) => {
      runGenerations.set(runId, generation);
    },
    afterObservationApplied: (runId, observation) => {
      const generation = runGenerations.get(runId);
      if (observation.kind === "rejected") {
        if (lifecycle && generation && isProductPackageFatalCode(observation.code)) {
          lifecycle.quarantineGeneration(generation, observation.code);
        }
        runGenerations.delete(runId);
      }
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
                cause instanceof NativeHostClientError ? cause.code : "NATIVE_HOST_CONTROL_FAILED",
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
        Effect.map((response): ProductRuntimeCatalog | null => {
          const packageGeneration = lifecycle?.snapshot().currentGeneration;
          if (!packageGeneration) return null;
          return {
            engineId: response.engineId,
            runtimeVersion: response.runtimeVersion,
            packageGeneration,
            models: response.models,
            capabilities: response.capabilities,
            truncated: response.truncated,
          };
        }),
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
    const productDatabase = path.join(stateDir, PRODUCT_DATABASE_FILENAME);
    const applicationRoot = process.env.OMNIMIND_APP_ROOT?.trim();
    const lifecycleStartup = yield* Effect.tryPromise(() =>
      initializeProductPackageLifecycle({
        stateDir,
        productDatabase,
        client,
        ...(applicationRoot ? { applicationRoot } : {}),
      }),
    ).pipe(
      Effect.match({
        onFailure: (cause) => ({ lifecycle: null, failure: cause }),
        onSuccess: (lifecycle) => ({ lifecycle, failure: null }),
      }),
    );
    const { lifecycle, failure: lifecycleFailure } = lifecycleStartup;
    const boundary = client
      ? lifecycle
        ? makeNativeHostExecutionBoundary(client, lifecycle)
        : makePackageStateUnavailableBoundary(lifecycleFailure)
      : null;
    const catalog = boundary?.catalog
      ? yield* boundary.catalog().pipe(Effect.catch(() => Effect.succeed(null)))
      : null;
    return makeProductControlPlaneLayer(productDatabase, boundary ?? undefined, catalog);
  }),
);
