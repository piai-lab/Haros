// FILE: useEngineStatusesForLocalConfig.ts
// Purpose: Normalize server engine health against local binary overrides for composer-like sends.
// Layer: Web hook
// Depends on: server config query, app settings, and engine availability normalization.

import type { ServerProviderStatus } from "@harnessos/contracts";
import { useQuery } from "@tanstack/react-query";

import { getCustomBinaryPathForProvider } from "../engineSettings";
import { useServerSettings } from "../serverSettings";
import { normalizeProviderStatusForLocalConfig } from "../lib/engineAvailability";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";

const EMPTY_PROVIDER_STATUSES: ServerProviderStatus[] = [];

export function useEngineStatusesForLocalConfig(): readonly ServerProviderStatus[] {
  const { settings } = useServerSettings();
  const serverConfigQuery = useQuery(serverConfigQueryOptions());

  return (serverConfigQuery.data?.engines ?? EMPTY_PROVIDER_STATUSES)
    .map((status) =>
      normalizeProviderStatusForLocalConfig({
        engine: status.engine,
        status,
        customBinaryPath: settings ? getCustomBinaryPathForProvider(settings, status.engine) : "",
      }),
    )
    .flatMap((status) => (status ? [status] : []));
}
