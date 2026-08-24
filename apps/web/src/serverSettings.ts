// FILE: serverSettings.ts
// Purpose: Consume and mutate the authoritative, credential-blind ServerSettings projection.
// Layer: Web-to-server settings boundary

import type {
  ServerProviderCredentialProvider,
  ServerSettingsPatch,
  ServerSettingsView,
} from "@omnimind/contracts";
import { DEFAULT_SERVER_SETTINGS_VIEW } from "@omnimind/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { ensureNativeApi } from "./nativeApi";
import { providerDiscoveryQueryKeys } from "./lib/providerDiscoveryReactQuery";
import { serverQueryKeys, serverSettingsQueryOptions } from "./lib/serverReactQuery";

export type ServerSettingsMutationResult =
  | { readonly state: "saved" }
  | { readonly state: "failed"; readonly error: unknown };

/**
 * Resolves the authoritative ServerSettings view at an execution boundary.
 * Presentation may render placeholders while the query is pending, but commands
 * must never substitute browser defaults for Server-owned state.
 */
export function fetchAuthoritativeServerSettings(
  queryClient: QueryClient,
): Promise<ServerSettingsView> {
  return queryClient.fetchQuery(serverSettingsQueryOptions());
}

export function useServerSettings() {
  const queryClient = useQueryClient();
  const query = useQuery(serverSettingsQueryOptions());
  const updateServerSettings = useCallback(
    async (patch: ServerSettingsPatch): Promise<ServerSettingsMutationResult> => {
      try {
        await ensureNativeApi().server.updateSettings(patch);
        // The RPC confirms this mutation. The existing settings stream/refetch remains the
        // authoritative cache owner, so a late RPC snapshot never overwrites a newer push.
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: serverQueryKeys.settings() }),
          queryClient.invalidateQueries({ queryKey: providerDiscoveryQueryKeys.all }),
        ]).catch(() => undefined);
        return { state: "saved" };
      } catch (error) {
        void queryClient
          .invalidateQueries({ queryKey: serverQueryKeys.settings() })
          .catch(() => undefined);
        return { state: "failed", error };
      }
    },
    [queryClient],
  );

  const updateProviderCredential = useCallback(
    async (
      provider: ServerProviderCredentialProvider,
      serverPassword: string,
    ): Promise<ServerSettingsMutationResult> => {
      try {
        await ensureNativeApi().server.updateProviderCredential({
          provider,
          serverPassword,
        });
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: serverQueryKeys.settings() }),
          queryClient.invalidateQueries({ queryKey: providerDiscoveryQueryKeys.all }),
        ]).catch(() => undefined);
        return { state: "saved" };
      } catch (error) {
        void queryClient
          .invalidateQueries({ queryKey: serverQueryKeys.settings() })
          .catch(() => undefined);
        return { state: "failed", error };
      }
    },
    [queryClient],
  );

  const resetServerSettings = useCallback(async (): Promise<ServerSettingsMutationResult> => {
    try {
      await ensureNativeApi().server.resetSettings();
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: serverQueryKeys.settings() }),
        queryClient.invalidateQueries({ queryKey: providerDiscoveryQueryKeys.all }),
      ]).catch(() => undefined);
      return { state: "saved" };
    } catch (error) {
      void queryClient
        .invalidateQueries({ queryKey: serverQueryKeys.settings() })
        .catch(() => undefined);
      return { state: "failed", error };
    }
  }, [queryClient]);

  return {
    query,
    settings: query.data,
    defaults: DEFAULT_SERVER_SETTINGS_VIEW,
    updateServerSettings,
    updateProviderCredential,
    resetServerSettings,
    fetchSettings: () => fetchAuthoritativeServerSettings(queryClient),
  } as const;
}
