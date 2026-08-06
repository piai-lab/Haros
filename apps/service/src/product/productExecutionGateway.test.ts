import type { ProductRun, ProductRuntimeCatalog } from "@omnimind/contracts";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import { ProductControlPlaneError, type ProductExecutionBoundary } from "./ProductControlPlane";
import { makeProductExecutionGateway } from "./productExecutionGateway";

const boundary = (attempt: () => void): ProductExecutionBoundary => ({
  attempt: () => {
    attempt();
    return Effect.succeed({
      kind: "rejected",
      code: "fixture",
      message: "fixture",
      retryable: false,
    });
  },
});

describe("makeProductExecutionGateway", () => {
  it("routes only by the frozen Engine ID and never falls back", async () => {
    const nativeAttempt = vi.fn();
    const externalAttempt = vi.fn();
    const gateway = makeProductExecutionGateway({
      native: { engineId: "pi", boundary: boundary(nativeAttempt) },
      external: { engineId: "opencode", boundary: boundary(externalAttempt) },
      composeCatalog: (native) => native,
    });
    const run = { requestedSelection: { engineId: "opencode" } } as ProductRun;
    await Effect.runPromise(
      gateway.attempt({
        dispatchId: "dispatch" as never,
        run,
        text: "text",
        priorLineageRef: null,
        prepared: null,
        markSent: () => Effect.void,
      }),
    );
    expect(externalAttempt).toHaveBeenCalledOnce();
    expect(nativeAttempt).not.toHaveBeenCalled();
  });

  it("rejects unknown Engines without invoking either boundary", () => {
    const gateway = makeProductExecutionGateway({
      native: { engineId: "pi", boundary: boundary(vi.fn()) },
      external: { engineId: "opencode", boundary: boundary(vi.fn()) },
      composeCatalog: (native: ProductRuntimeCatalog | null) => native,
    });
    expect(() => gateway.boundaryForEngine("unknown")).toThrow("not part");
  });

  it("prepares only through the explicitly selected Engine", async () => {
    const nativePrepare = vi.fn();
    const externalPrepare = vi.fn(() =>
      Effect.succeed({
        engineId: "opencode",
        resolvedSelection: null,
        close: async () => undefined,
      }),
    );
    const gateway = makeProductExecutionGateway({
      native: { engineId: "pi", boundary: { ...boundary(vi.fn()), prepare: nativePrepare } },
      external: {
        engineId: "opencode",
        boundary: { ...boundary(vi.fn()), prepare: externalPrepare },
      },
      composeCatalog: (native) => native,
    });
    await Effect.runPromise(
      gateway.prepare!({
        dispatchId: "dispatch" as never,
        conversationId: "conversation" as never,
        runId: "run" as never,
        requestedSelection: { engineId: "opencode" } as never,
        workspace: { access: { kind: "chat" } } as never,
        resources: [],
        text: "text",
        priorLineageRef: null,
      }),
    );
    expect(externalPrepare).toHaveBeenCalledOnce();
    expect(nativePrepare).not.toHaveBeenCalled();
  });

  it("routes no-ACK controls by the authoritative Run Engine", async () => {
    const nativeControl = vi.fn();
    const externalControl = vi.fn((request) =>
      Effect.succeed({
        operationRef: request.operationRef,
        control: request.control,
        result: "requested" as const,
        code: "control-unacknowledged" as const,
        message: "Written without acknowledgement.",
      }),
    );
    const gateway = makeProductExecutionGateway({
      native: {
        engineId: "pi",
        boundary: { ...boundary(vi.fn()), control: nativeControl },
      },
      external: {
        engineId: "opencode",
        boundary: { ...boundary(vi.fn()), control: externalControl },
      },
      composeCatalog: (native) => native,
    });
    const run = { requestedSelection: { engineId: "opencode" } } as ProductRun;
    await expect(
      Effect.runPromise(
        gateway.control!({ run, operationRef: null, control: "abort", text: null }),
      ),
    ).resolves.toMatchObject({ operationRef: null, result: "requested" });
    expect(externalControl).toHaveBeenCalledOnce();
    expect(nativeControl).not.toHaveBeenCalled();
  });

  it("keeps a healthy sibling catalog when the other concrete boundary fails", async () => {
    const nativeAttempt = vi.fn();
    const externalAttempt = vi.fn();
    const externalCatalog = {
      defaultEngineId: "opencode",
      engines: [],
    } as unknown as ProductRuntimeCatalog;
    const gateway = makeProductExecutionGateway({
      native: {
        engineId: "pi",
        boundary: {
          ...boundary(nativeAttempt),
          catalog: () =>
            Effect.fail(
              new ProductControlPlaneError({
                code: "NATIVE_CATALOG_FAILED",
                message: "Native catalog failed.",
                retryable: true,
              }),
            ),
        },
      },
      external: {
        engineId: "opencode",
        boundary: { ...boundary(externalAttempt), catalog: () => Effect.succeed(externalCatalog) },
      },
      composeCatalog: (_native, external) => external,
    });
    await expect(Effect.runPromise(gateway.catalog!())).resolves.toEqual({
      ...externalCatalog,
      defaultEngineId: "pi",
    });
    await Effect.runPromise(
      gateway.attempt({
        dispatchId: "external-only-dispatch" as never,
        run: { requestedSelection: { engineId: "opencode" } } as ProductRun,
        text: "text",
        priorLineageRef: null,
        prepared: null,
        markSent: () => Effect.void,
      }),
    );
    expect(externalAttempt).toHaveBeenCalledOnce();
    expect(nativeAttempt).not.toHaveBeenCalled();
  });

  it("fans in both concrete fact sources byte-for-value and disposes each exactly once", () => {
    type Listener = Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0];
    let nativeListener: Listener | undefined;
    let externalListener: Listener | undefined;
    const nativeDispose = vi.fn(() => (nativeListener = undefined));
    const externalDispose = vi.fn(() => (externalListener = undefined));
    const native = {
      ...boundary(vi.fn()),
      subscribeFacts: (listener: Listener) => {
        nativeListener = listener;
        return nativeDispose;
      },
    };
    const external = {
      ...boundary(vi.fn()),
      subscribeFacts: (listener: Listener) => {
        externalListener = listener;
        return externalDispose;
      },
    };
    const gateway = makeProductExecutionGateway({
      native: { engineId: "pi", boundary: native },
      external: { engineId: "opencode", boundary: external },
      composeCatalog: (catalog) => catalog,
    });
    const received: Array<readonly [unknown, unknown, unknown]> = [];
    const dispose = gateway.subscribeFacts?.((runId, update, sourceEngineId) =>
      received.push([runId, update, sourceEngineId]),
    );
    const nativeRunId = "run-native" as never;
    const externalRunId = "run-external" as never;
    const nativeUpdate = { kind: "outcome-unknown" } as const;
    const externalUpdate = { kind: "facts", facts: [] } as const;
    nativeListener?.(nativeRunId, nativeUpdate);
    externalListener?.(externalRunId, externalUpdate);
    expect(received).toEqual([
      [nativeRunId, nativeUpdate, "pi"],
      [externalRunId, externalUpdate, "opencode"],
    ]);

    dispose?.();
    dispose?.();
    expect(nativeDispose).toHaveBeenCalledOnce();
    expect(externalDispose).toHaveBeenCalledOnce();
    nativeListener?.(nativeRunId, nativeUpdate);
    externalListener?.(externalRunId, externalUpdate);
    expect(received).toHaveLength(2);
  });

  it("safely subscribes when one concrete boundary exposes no fact source", () => {
    type Listener = Parameters<NonNullable<ProductExecutionBoundary["subscribeFacts"]>>[0];
    let externalListener: Listener | undefined;
    const externalDispose = vi.fn(() => (externalListener = undefined));
    const gateway = makeProductExecutionGateway({
      native: { engineId: "pi", boundary: boundary(vi.fn()) },
      external: {
        engineId: "opencode",
        boundary: {
          ...boundary(vi.fn()),
          subscribeFacts: (listener) => {
            externalListener = listener;
            return externalDispose;
          },
        },
      },
      composeCatalog: (catalog) => catalog,
    });
    const received = vi.fn();
    const dispose = gateway.subscribeFacts?.(received);
    externalListener?.("run-external" as never, { kind: "facts", facts: [] });
    expect(received).toHaveBeenCalledOnce();
    dispose?.();
    dispose?.();
    expect(externalDispose).toHaveBeenCalledOnce();
  });
});
