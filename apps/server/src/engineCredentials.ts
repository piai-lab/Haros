// FILE: engineCredentials.ts
// Purpose: Owns server-only credentials used to connect to external engine servers.
// Layer: Server engine security boundary

import { Effect, Layer, ServiceMap } from "effect";

import { ServerSecretStoreLive } from "./auth/Layers/ServerSecretStore";
import { ServerSecretStore, type SecretStoreError } from "./auth/Services/ServerSecretStore";

export type ExternalEngineServer = "kilo" | "opencode";

const secretName = (engine: ExternalEngineServer): string => `engine-${engine}-server-password`;

export interface EngineCredentialsShape {
  readonly getServerPassword: (
    engine: ExternalEngineServer,
  ) => Effect.Effect<string | null, SecretStoreError>;
  readonly replaceServerPassword: (
    engine: ExternalEngineServer,
    password: string | null,
  ) => Effect.Effect<void, SecretStoreError>;
  readonly isServerPasswordConfigured: (
    engine: ExternalEngineServer,
  ) => Effect.Effect<boolean, SecretStoreError>;
}

export class EngineCredentials extends ServiceMap.Service<
  EngineCredentials,
  EngineCredentialsShape
>()("harnessos/engineCredentials/EngineCredentials") {}

export const resolveEngineServerPassword = (engine: ExternalEngineServer) =>
  Effect.gen(function* () {
    const credentials = yield* EngineCredentials;
    return (yield* credentials.getServerPassword(engine)) ?? undefined;
  }).pipe(Effect.orDie);

export const makeEngineServerPasswordResolver =
  (credentials: EngineCredentialsShape) =>
  (engine: ExternalEngineServer): Effect.Effect<string | undefined> =>
    credentials.getServerPassword(engine).pipe(
      Effect.map((password) => password ?? undefined),
      Effect.orDie,
    );

const makeEngineCredentials = Effect.gen(function* () {
  const secrets = yield* ServerSecretStore;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });

  const getServerPassword: EngineCredentialsShape["getServerPassword"] = (engine) =>
    secrets.get(secretName(engine)).pipe(
      Effect.map((value) => {
        if (!value || value.byteLength === 0) return null;
        const password = decoder.decode(value);
        return password.length > 0 ? password : null;
      }),
    );

  const replaceServerPassword: EngineCredentialsShape["replaceServerPassword"] = (
    engine,
    password,
  ) => {
    const normalized = password?.trim() ?? "";
    return normalized.length > 0
      ? secrets.set(secretName(engine), encoder.encode(normalized))
      : secrets.remove(secretName(engine));
  };

  const isServerPasswordConfigured: EngineCredentialsShape["isServerPasswordConfigured"] = (
    engine,
  ) => getServerPassword(engine).pipe(Effect.map((password) => password !== null));

  return {
    getServerPassword,
    replaceServerPassword,
    isServerPasswordConfigured,
  } satisfies EngineCredentialsShape;
});

export const EngineCredentialsLive = Layer.effect(EngineCredentials, makeEngineCredentials).pipe(
  Layer.provide(ServerSecretStoreLive),
);
