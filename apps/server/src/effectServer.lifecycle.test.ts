import { Effect, Scope } from "effect";
import { describe, expect, it, vi } from "vitest";

import { closeServerRuntimePipeline } from "./effectServer.ts";
import { UserInputPresenterRegistry } from "./provider/userInputPresenterRegistry.ts";

describe("server runtime pipeline shutdown", () => {
  it("persists accepted engine terminal work before the engine stops", async () => {
    const order: string[] = [];
    let terminalAccepted = false;
    let terminalPersisted = false;
    let attachmentsDrained = false;
    const subscriptionsScope = await Effect.runPromise(Scope.make("sequential"));
    await Effect.runPromise(
      Scope.addFinalizer(
        subscriptionsScope,
        Effect.sync(() => {
          expect(terminalAccepted).toBe(true);
          terminalPersisted = true;
          order.push("reactors-drained-and-persisted");
        }),
      ),
    );

    await Effect.runPromise(
      closeServerRuntimePipeline({
        sealUserInputPresenters: Effect.sync(() => {
          order.push("user-input-presenters-revoked");
        }),
        drainUserInputPresenterHandoffs: Effect.sync(() => {
          order.push("user-input-presenter-handoffs-drained");
        }),
        orchestrationEngine: {
          quiesce: Effect.sync(() => order.push("engine-quiesced")),
          drain: Effect.sync(() => order.push("admitted-commands-drained")),
          stop: Effect.sync(() => {
            expect(terminalPersisted).toBe(true);
            expect(attachmentsDrained).toBe(true);
            order.push("engine-stopped");
          }),
        },
        providerService: {
          closeRuntimeEvents: Effect.sync(() => {
            terminalAccepted = true;
            order.push("engine-terminal-events-fenced");
          }),
        },
        managedAttachmentCleanup: {
          drain: Effect.sync(() => {
            expect(terminalPersisted).toBe(true);
            attachmentsDrained = true;
            order.push("managed-attachments-drained");
          }),
        },
        subscriptionsScope,
      }),
    );

    expect(order).toEqual([
      "user-input-presenters-revoked",
      "engine-quiesced",
      "admitted-commands-drained",
      "engine-terminal-events-fenced",
      "user-input-presenter-handoffs-drained",
      "reactors-drained-and-persisted",
      "admitted-commands-drained",
      "managed-attachments-drained",
      "engine-stopped",
    ]);
  });

  it("awaits a presenter handoff created after the first engine idle fence", async () => {
    const registry = new UserInputPresenterRegistry();
    const lease = registry.acquire("window-a", 1);
    const order: string[] = [];
    let releaseLateHandoff: (() => void) | undefined;
    const subscriptionsScope = await Effect.runPromise(Scope.make("sequential"));
    await Effect.runPromise(
      Scope.addFinalizer(
        subscriptionsScope,
        Effect.sync(() => order.push("subscribers-closed")),
      ),
    );

    const shutdown = Effect.runPromise(
      closeServerRuntimePipeline({
        sealUserInputPresenters: Effect.promise(() => registry.sealAndRevoke()).pipe(Effect.asVoid),
        drainUserInputPresenterHandoffs: Effect.promise(() =>
          registry.drainUnavailableHandoffs(),
        ).pipe(Effect.asVoid),
        orchestrationEngine: {
          quiesce: Effect.sync(() => order.push("engine-quiesced")),
          drain: Effect.sync(() => order.push("engine-drained")),
          stop: Effect.sync(() => order.push("engine-stopped")),
        },
        providerService: {
          closeRuntimeEvents: Effect.sync(() => {
            order.push("engine-producers-closed");
            registry.onUnavailable(() => undefined);
            registry.handoffUnavailable(
              () =>
                new Promise<void>((resolve) => {
                  releaseLateHandoff = () => {
                    order.push("late-terminal-handed-off");
                    resolve();
                  };
                }),
            );
          }),
        },
        managedAttachmentCleanup: {
          drain: Effect.sync(() => order.push("attachments-drained")),
        },
        subscriptionsScope,
      }),
    );

    await vi.waitFor(() => expect(releaseLateHandoff).toBeTypeOf("function"));
    expect(order).toEqual(["engine-quiesced", "engine-drained", "engine-producers-closed"]);
    releaseLateHandoff?.();
    await shutdown;

    expect(order).toEqual([
      "engine-quiesced",
      "engine-drained",
      "engine-producers-closed",
      "late-terminal-handed-off",
      "subscribers-closed",
      "engine-drained",
      "attachments-drained",
      "engine-stopped",
    ]);
    lease.release();
  });
});
