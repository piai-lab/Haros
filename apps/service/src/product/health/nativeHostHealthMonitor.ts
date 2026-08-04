import { Effect, Layer } from "effect";

import { makeNativeHostClientFromEnvironment } from "../../native-host/client";

export const NATIVE_HOST_AUTHENTICATED_READY_MARKER =
  "OMNIMIND_NATIVE_HOST_AUTHENTICATED protocol=1";
export const NATIVE_HOST_AUTHENTICATED_UNAVAILABLE_MARKER =
  "OMNIMIND_NATIVE_HOST_UNAVAILABLE protocol=1";

const monitor = Effect.gen(function* () {
  const client = makeNativeHostClientFromEnvironment(process.env);
  if (!client) {
    console.info(NATIVE_HOST_AUTHENTICATED_UNAVAILABLE_MARKER);
    return;
  }
  let last: "ready" | "unavailable" | null = null;
  yield* Effect.forever(
    Effect.tryPromise(() => client.health()).pipe(
      Effect.matchEffect({
        onSuccess: () =>
          Effect.sync(() => {
            if (last !== "ready") console.info(NATIVE_HOST_AUTHENTICATED_READY_MARKER);
            last = "ready";
          }),
        onFailure: () =>
          Effect.sync(() => {
            if (last !== "unavailable") console.info(NATIVE_HOST_AUTHENTICATED_UNAVAILABLE_MARKER);
            last = "unavailable";
          }),
      }),
      Effect.andThen(Effect.sleep("250 millis")),
    ),
  );
});

export const NativeHostHealthMonitorLive = Layer.effectDiscard(Effect.forkScoped(monitor));
