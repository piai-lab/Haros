import { queryOptions } from "@tanstack/react-query";

import { ensureNativeApi } from "~/nativeApi";

export const omniMindModelServicesQueryKeys = {
  all: ["omnimind-model-services"] as const,
  list: () => ["omnimind-model-services", "list"] as const,
  detail: (serviceId: string | null) => ["omnimind-model-services", "detail", serviceId] as const,
};

export function omniMindModelServicesListQueryOptions(input: { enabled: boolean }) {
  return queryOptions({
    queryKey: omniMindModelServicesQueryKeys.list(),
    enabled: input.enabled,
    queryFn: async ({ signal }) => ensureNativeApi().omnimindModelServices.list({}, { signal }),
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function omniMindModelServiceDetailQueryOptions(input: {
  enabled: boolean;
  serviceId: string | null;
}) {
  return queryOptions({
    queryKey: omniMindModelServicesQueryKeys.detail(input.serviceId),
    enabled: input.enabled && input.serviceId !== null,
    queryFn: async ({ signal }) => {
      if (input.serviceId === null) {
        throw new Error("Model service detail requires a service id");
      }
      return ensureNativeApi().omnimindModelServices.get(
        { serviceId: input.serviceId },
        { signal },
      );
    },
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
