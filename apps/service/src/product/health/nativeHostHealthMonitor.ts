import { Effect, Layer } from "effect";

import { makeNativeHostClientFromEnvironment } from "../../native-host/client";

export const NATIVE_HOST_AUTHENTICATED_READY_MARKER =
  "OMNIMIND_NATIVE_HOST_AUTHENTICATED protocol=1";
export const NATIVE_HOST_AUTHENTICATED_UNAVAILABLE_MARKER =
  "OMNIMIND_NATIVE_HOST_UNAVAILABLE protocol=1";
export const NATIVE_HOST_EXECUTION_AVAILABLE_MARKER =
  "OMNIMIND_NATIVE_HOST_EXECUTION_AVAILABLE protocol=1";
export const NATIVE_HOST_EXECUTION_UNAVAILABLE_MARKER =
  "OMNIMIND_NATIVE_HOST_EXECUTION_UNAVAILABLE protocol=1";

const monitor = Effect.gen(function* () {
  const client = makeNativeHostClientFromEnvironment(process.env);
  if (!client) {
    console.info(NATIVE_HOST_AUTHENTICATED_UNAVAILABLE_MARKER);
    return;
  }
  let last: "ready" | "unavailable" | null = null;
  let executionAvailable: boolean | null = null;
  yield* Effect.forever(
    Effect.tryPromise(() => client.health()).pipe(
      Effect.matchEffect({
        onSuccess: () =>
          Effect.tryPromise(() => client.catalog()).pipe(
            Effect.map((catalog) => catalog.models.some((model) => model.available)),
            Effect.orElseSucceed(() => false),
            Effect.map((available) => {
              if (last !== "ready") console.info(NATIVE_HOST_AUTHENTICATED_READY_MARKER);
              if (executionAvailable !== available) {
                console.info(
                  available
                    ? NATIVE_HOST_EXECUTION_AVAILABLE_MARKER
                    : NATIVE_HOST_EXECUTION_UNAVAILABLE_MARKER,
                );
              }
              last = "ready";
              executionAvailable = available;
            }),
          ),
        onFailure: () =>
          Effect.sync(() => {
            if (last !== "unavailable") console.info(NATIVE_HOST_AUTHENTICATED_UNAVAILABLE_MARKER);
            last = "unavailable";
            executionAvailable = null;
          }),
      }),
      Effect.andThen(Effect.sleep("250 millis")),
    ),
  );
});

export const NativeHostHealthMonitorLive = Layer.effectDiscard(Effect.forkScoped(monitor));
