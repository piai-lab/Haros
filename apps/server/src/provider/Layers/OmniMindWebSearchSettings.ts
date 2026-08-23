import type {
  OmniMindWebSearchMutationResult,
  OmniMindWebSearchRecoverySnapshot,
  OmniMindWebSearchReadResult,
} from "@omnimind/contracts";
import {
  WebSearchConfigConflictError,
  WebSearchConfigError,
  getWebSearchConfigService,
} from "@omnimind/om-web-access/config-service";
import {
  diagnoseGeminiWebAccount,
  mutateWebSearchSettings,
  projectWebSearchSettings,
  recheckWebSearchRoute,
  testWebSearchProvider,
} from "@omnimind/om-web-access/settings-runtime";
import { Effect, Layer } from "effect";

import { ServerConfig } from "../../config.ts";
import { Open } from "../../open.ts";
import { resolveOmniMindAgentDir } from "../omnimindAgentRuntime.ts";
import {
  OmniMindWebSearchSettings,
  type OmniMindWebSearchSettingsShape,
} from "../Services/OmniMindWebSearchSettings.ts";

function recovery(error: WebSearchConfigError): OmniMindWebSearchRecoverySnapshot {
  return { state: "recovery", reason: error.kind, message: error.message };
}

export const OmniMindWebSearchSettingsLive = Layer.effect(
  OmniMindWebSearchSettings,
  Effect.gen(function* () {
    const config = yield* ServerConfig;
    const open = yield* Open;
    const service = getWebSearchConfigService(resolveOmniMindAgentDir(config.baseDir));
    const inFlight = new Map<string, Promise<unknown>>();

    const read = (ensure: boolean, knownRevision?: string): OmniMindWebSearchReadResult => {
      try {
        let snapshot = ensure ? service.ensureDefault() : service.readSnapshot();
        if (!ensure && (knownRevision === undefined || snapshot.revision !== knownRevision)) {
          snapshot = service.refresh();
        }
        return { state: "ready", ...projectWebSearchSettings(snapshot) };
      } catch (error) {
        if (error instanceof WebSearchConfigError) return recovery(error);
        throw error;
      }
    };

    const runSync = <A>(operation: () => A) =>
      Effect.try({
        try: operation,
        catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
      });

    const singleFlight = <A>(key: string, operation: (signal: AbortSignal) => Promise<A>) =>
      Effect.tryPromise({
        try: (signal) => {
          const active = inFlight.get(key) as Promise<A> | undefined;
          if (active) return active;
          const request = operation(signal).finally(() => {
            if (inFlight.get(key) === request) inFlight.delete(key);
          });
          inFlight.set(key, request);
          return request;
        },
        catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
      });

    return {
      open: () => runSync(() => read(true)),
      refresh: (input = {}) => runSync(() => read(false, input.knownRevision)),
      mutate: (input) =>
        runSync((): OmniMindWebSearchMutationResult => {
          try {
            const result = mutateWebSearchSettings(service, input);
            return {
              state: result.changed ? "changed" : "unchanged",
              snapshot: { state: "ready", ...projectWebSearchSettings(result.snapshot) },
            };
          } catch (error) {
            if (error instanceof WebSearchConfigConflictError) {
              const current = service.readSnapshot();
              return {
                state: "conflict",
                snapshot: { state: "ready", ...projectWebSearchSettings(current) },
              };
            }
            if (error instanceof WebSearchConfigError) return recovery(error);
            throw error;
          }
        }),
      testProvider: (input, requestScope) =>
        singleFlight(`${requestScope}:provider:${input.providerId}:${input.requestId}`, async (signal) => {
          const provider = projectWebSearchSettings(service.readSnapshot()).providers.find(
            ({ id }) => id === input.providerId,
          );
          if (!provider) throw new Error("Unknown Web search Provider");
          return testWebSearchProvider({
            service,
            provider: provider.id,
            draft: input.draft,
            signal,
            requestId: input.requestId,
          });
        }),
      recheck: (input, requestScope) =>
        singleFlight(`${requestScope}:route:${input.requestId}`, (signal) =>
          recheckWebSearchRoute({ service, signal, requestId: input.requestId }),
        ),
      diagnoseGemini: (input) =>
        Effect.tryPromise({
          try: () => diagnoseGeminiWebAccount({ service, draft: input.draft }),
          catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
        }),
      openConfig: (editor) =>
        open.openInEditor({ cwd: service.configPath, editor }).pipe(
          Effect.mapError(() => new Error("Failed to open Web search configuration")),
        ),
    } satisfies OmniMindWebSearchSettingsShape;
  }),
);
