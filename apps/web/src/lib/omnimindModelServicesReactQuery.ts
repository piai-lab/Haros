import { queryOptions } from "@tanstack/react-query";

import { ensureNativeApi } from "~/nativeApi";

export const omniMindModelServicesQueryKeys = {
  all: ["omnimind-model-services"] as const,
  list: (intent: "add_service" | null = null) =>
    ["omnimind-model-services", "list", intent] as const,
  detail: (serviceId: string | null, intent: "add_service" | null = null) =>
    ["omnimind-model-services", "detail", serviceId, intent] as const,
};

export function omniMindModelServicesListQueryOptions(input: {
  enabled: boolean;
  intent?: "add_service";
}) {
  return queryOptions({
    queryKey: omniMindModelServicesQueryKeys.list(input.intent ?? null),
    enabled: input.enabled,
    queryFn: async ({ signal }) =>
      ensureNativeApi().omnimindModelServices.list(input.intent ? { intent: input.intent } : {}, {
        signal,
      }),
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function omniMindModelServiceDetailQueryOptions(input: {
  enabled: boolean;
  serviceId: string | null;
  intent?: "add_service";
}) {
  return queryOptions({
    queryKey: omniMindModelServicesQueryKeys.detail(input.serviceId, input.intent ?? null),
    enabled: input.enabled && input.serviceId !== null,
    queryFn: async ({ signal }) => {
      if (input.serviceId === null) {
        throw new Error("Model service detail requires a service id");
      }
      return ensureNativeApi().omnimindModelServices.get(
        { serviceId: input.serviceId, ...(input.intent ? { intent: input.intent } : {}) },
        { signal },
      );
    },
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
