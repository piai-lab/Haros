import { queryOptions, type QueryClient } from "@tanstack/react-query";

import { ensureNativeApi } from "~/nativeApi";

const MODEL_SERVICES_READ_RETRY_OPTIONS = {
  // Admission capacity is retried by WsTransport. A query-level retry would
  // multiply the same budget and keep stale Add-extension requests alive.
  retry: false,
} as const;

export const oaModelServicesQueryKeys = {
  all: ["harnessos-model-services"] as const,
  list: (intent: "add_service" | null = null) =>
    ["harnessos-model-services", "list", intent] as const,
  detail: (serviceId: string | null, intent: "add_service" | null = null) =>
    ["harnessos-model-services", "detail", serviceId, intent] as const,
};

function isAddServiceIntentQueryKey(queryKey: readonly unknown[]): boolean {
  return (
    queryKey[0] === oaModelServicesQueryKeys.all[0] &&
    ((queryKey[1] === "list" && queryKey[2] === "add_service") ||
      (queryKey[1] === "detail" && queryKey[3] === "add_service"))
  );
}

export async function cancelOAModelServicesAddIntentQueries(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.cancelQueries({
    queryKey: oaModelServicesQueryKeys.all,
    predicate: (query) => isAddServiceIntentQueryKey(query.queryKey),
  });
}

export function oaModelServicesListQueryOptions(input: {
  enabled: boolean;
  intent?: "add_service";
}) {
  return queryOptions({
    queryKey: oaModelServicesQueryKeys.list(input.intent ?? null),
    enabled: input.enabled,
    queryFn: async ({ signal }) =>
      ensureNativeApi().oaModelServices.list(input.intent ? { intent: input.intent } : {}, {
        signal,
      }),
    staleTime: 10_000,
    ...MODEL_SERVICES_READ_RETRY_OPTIONS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function oaModelServiceDetailQueryOptions(input: {
  enabled: boolean;
  serviceId: string | null;
  intent?: "add_service";
}) {
  return queryOptions({
    queryKey: oaModelServicesQueryKeys.detail(input.serviceId, input.intent ?? null),
    enabled: input.enabled && input.serviceId !== null,
    queryFn: async ({ signal }) => {
      if (input.serviceId === null) {
        throw new Error("Model service detail requires a service id");
      }
      return ensureNativeApi().oaModelServices.get(
        { serviceId: input.serviceId, ...(input.intent ? { intent: input.intent } : {}) },
        { signal },
      );
    },
    staleTime: 10_000,
    ...MODEL_SERVICES_READ_RETRY_OPTIONS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
