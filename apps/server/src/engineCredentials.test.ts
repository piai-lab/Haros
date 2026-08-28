import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  EngineCredentials,
  resolveEngineServerPassword,
  type EngineCredentialsShape,
} from "./engineCredentials";

describe("resolveEngineServerPassword", () => {
  it("reads EngineCredentials from the Effect service context", async () => {
    const credentials: EngineCredentialsShape = {
      getServerPassword: () => Effect.succeed("secret"),
      replaceServerPassword: () => Effect.void,
      isServerPasswordConfigured: () => Effect.succeed(true),
    };

    const password = await Effect.runPromise(
      resolveEngineServerPassword("kilo").pipe(
        Effect.provide(Layer.succeed(EngineCredentials, credentials)),
      ),
    );

    expect(password).toBe("secret");
  });
});
