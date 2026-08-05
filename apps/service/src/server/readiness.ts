import { Deferred, Effect } from "effect";

export interface ServerReadinessSnapshot {
  readonly httpListening: boolean;
  readonly pushBusReady: boolean;
  readonly keybindingsReady: boolean;
  readonly productControlPlaneReady: boolean;
  readonly startupReady: boolean;
}

export interface ServerReadiness {
  readonly awaitServerReady: Effect.Effect<void>;
  readonly markHttpListening: Effect.Effect<void>;
  readonly markPushBusReady: Effect.Effect<void>;
  readonly markKeybindingsReady: Effect.Effect<void>;
  readonly markProductControlPlaneReady: Effect.Effect<void>;
  readonly getSnapshot: Effect.Effect<ServerReadinessSnapshot>;
}

export const makeServerReadiness = Effect.gen(function* () {
  const httpListening = yield* Deferred.make<void>();
  const pushBusReady = yield* Deferred.make<void>();
  const keybindingsReady = yield* Deferred.make<void>();
  const productControlPlaneReady = yield* Deferred.make<void>();
  const status = {
    httpListening: false,
    pushBusReady: false,
    keybindingsReady: false,
    productControlPlaneReady: false,
  };

  const complete = (deferred: Deferred.Deferred<void>, key: keyof typeof status) =>
    Effect.gen(function* () {
      status[key] = true;
      yield* Deferred.succeed(deferred, undefined);
    }).pipe(Effect.asVoid, Effect.orDie);

  return {
    awaitServerReady: Effect.all([
      Deferred.await(httpListening),
      Deferred.await(pushBusReady),
      Deferred.await(keybindingsReady),
      Deferred.await(productControlPlaneReady),
    ]).pipe(Effect.asVoid),
    markHttpListening: complete(httpListening, "httpListening"),
    markPushBusReady: complete(pushBusReady, "pushBusReady"),
    markKeybindingsReady: complete(keybindingsReady, "keybindingsReady"),
    markProductControlPlaneReady: complete(productControlPlaneReady, "productControlPlaneReady"),
    getSnapshot: Effect.sync(() => ({
      ...status,
      startupReady:
        status.httpListening &&
        status.pushBusReady &&
        status.keybindingsReady &&
        status.productControlPlaneReady,
    })),
  } satisfies ServerReadiness;
});
