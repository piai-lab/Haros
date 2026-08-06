import type { ProductRuntimeCatalog } from "@omnimind/contracts";
import { Effect } from "effect";

import { ProductControlPlaneError, type ProductExecutionBoundary } from "./ProductControlPlane";

export type ProductExecutionGateway = ProductExecutionBoundary & {
  readonly sourceEngineBoundFacts: true;
  readonly boundaryForEngine: (engineId: string) => ProductExecutionBoundary;
};

/** Literal two-boundary composition. This is deliberately not a registry or plugin surface. */
export function makeProductExecutionGateway(input: {
  readonly native: { readonly engineId: string; readonly boundary: ProductExecutionBoundary };
  readonly external: { readonly engineId: string; readonly boundary: ProductExecutionBoundary };
  readonly composeCatalog: (
    native: ProductRuntimeCatalog | null,
    external: ProductRuntimeCatalog | null,
  ) => ProductRuntimeCatalog | null;
}): ProductExecutionGateway {
  if (
    !input.native.engineId ||
    !input.external.engineId ||
    input.native.engineId === input.external.engineId
  ) {
    throw new Error("Product execution gateway requires two unique concrete Engine IDs.");
  }
  const boundaryForEngine = (engineId: string): ProductExecutionBoundary => {
    switch (engineId) {
      case input.native.engineId:
        return input.native.boundary;
      case input.external.engineId:
        return input.external.boundary;
      default:
        throw new ProductControlPlaneError({
          code: "PRODUCT_ENGINE_UNAVAILABLE",
          message: "The selected Engine is not part of this Product composition.",
          retryable: false,
        });
    }
  };
  return {
    boundaryForEngine,
    sourceEngineBoundFacts: true,
    prepare: (request) => {
      const boundary = boundaryForEngine(request.requestedSelection.engineId);
      return boundary.prepare
        ? boundary.prepare(request)
        : Effect.succeed({
            engineId: request.requestedSelection.engineId,
            resolvedSelection: null,
            close: async () => undefined,
          });
    },
    attempt: (request) => {
      const engineId = request.run.requestedSelection.engineId;
      return boundaryForEngine(engineId).attempt(request);
    },
    control: (request) => {
      const boundary = boundaryForEngine(request.run.requestedSelection.engineId);
      return boundary.control
        ? boundary.control(request)
        : Effect.succeed({
            operationRef: request.operationRef,
            control: request.control,
            result: "unsupported" as const,
            code: "control-unsupported" as const,
            message: "The selected Engine does not expose this control.",
          });
    },
    afterObservationApplied: (runId, engineId, observation) => {
      boundaryForEngine(engineId).afterObservationApplied?.(runId, engineId, observation);
    },
    subscribeFacts: (listener) => {
      const disposers = [
        input.native.boundary.subscribeFacts?.((runId, observation) =>
          listener(runId, observation, input.native.engineId),
        ),
        input.external.boundary.subscribeFacts?.((runId, observation) =>
          listener(runId, observation, input.external.engineId),
        ),
      ].filter((dispose): dispose is () => void => dispose !== undefined);
      let disposed = false;
      return () => {
        if (disposed) return;
        disposed = true;
        for (const dispose of disposers) dispose();
      };
    },
    catalog: () => {
      const observe = (boundary: ProductExecutionBoundary) =>
        (boundary.catalog?.() ?? Effect.succeed(null)).pipe(
          Effect.catch(() => Effect.succeed(null)),
        );
      return Effect.all([observe(input.native.boundary), observe(input.external.boundary)]).pipe(
        Effect.map(([native, external]) => {
          const composed = input.composeCatalog(native, external);
          return composed
            ? {
                ...composed,
                // The bundled-native Pi identity remains the explicit Product default even when
                // its current catalog observation failed and only OpenCode can be advertised.
                defaultEngineId: input.native.engineId,
              }
            : null;
        }),
      );
    },
    close: async () => {
      await Promise.allSettled([
        input.native.boundary.close?.(),
        input.external.boundary.close?.(),
      ]);
    },
  };
}
