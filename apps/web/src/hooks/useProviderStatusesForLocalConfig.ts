// FILE: useProviderStatusesForLocalConfig.ts
// Purpose: Normalize server provider health against local binary overrides for composer-like sends.
// Layer: Web hook
// Depends on: server config query, app settings, and provider availability normalization.

import type { ServerProviderStatus } from "@harnessos/contracts";
import { useQuery } from "@tanstack/react-query";

import { getCustomBinaryPathForProvider } from "../providerSettings";
import { useServerSettings } from "../serverSettings";
import { normalizeProviderStatusForLocalConfig } from "../lib/providerAvailability";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";

const EMPTY_PROVIDER_STATUSES: ServerProviderStatus[] = [];

export function useProviderStatusesForLocalConfig(): readonly ServerProviderStatus[] {
  const { settings } = useServerSettings();
  const serverConfigQuery = useQuery(serverConfigQueryOptions());

  return (serverConfigQuery.data?.providers ?? EMPTY_PROVIDER_STATUSES)
    .map((status) =>
      normalizeProviderStatusForLocalConfig({
        provider: status.provider,
        status,
        customBinaryPath: settings ? getCustomBinaryPathForProvider(settings, status.provider) : "",
      }),
    )
    .flatMap((status) => (status ? [status] : []));
}
