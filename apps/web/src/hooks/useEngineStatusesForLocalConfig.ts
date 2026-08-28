// FILE: useEngineStatusesForLocalConfig.ts
// Purpose: Normalize server engine health against local binary overrides for composer-like sends.
// Layer: Web hook
// Depends on: server config query, app settings, and engine availability normalization.

import type { ServerEngineStatus } from "@harnessos/contracts";
import { useQuery } from "@tanstack/react-query";

import { getCustomBinaryPathForEngine } from "../engineSettings";
import { useServerSettings } from "../serverSettings";
import { normalizeEngineStatusForLocalConfig } from "../lib/engineAvailability";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";

const EMPTY_PROVIDER_STATUSES: ServerEngineStatus[] = [];

export function useEngineStatusesForLocalConfig(): readonly ServerEngineStatus[] {
  const { settings } = useServerSettings();
  const serverConfigQuery = useQuery(serverConfigQueryOptions());

  return (serverConfigQuery.data?.engines ?? EMPTY_PROVIDER_STATUSES)
    .map((status) =>
      normalizeEngineStatusForLocalConfig({
        engine: status.engine,
        status,
        customBinaryPath: settings ? getCustomBinaryPathForEngine(settings, status.engine) : "",
      }),
    )
    .flatMap((status) => (status ? [status] : []));
}
