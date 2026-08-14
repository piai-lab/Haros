import { queryOptions, type QueryClient } from "@tanstack/react-query";

import { ensureNativeApi } from "~/nativeApi";

const RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED = "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED";
const MODEL_SERVICES_CAPACITY_RETRY_LIMIT = 12;
const DEFAULT_MODEL_SERVICES_CAPACITY_RETRY_MS = 250;

function isExpensiveReadCapacityError(
  error: unknown,
): error is { readonly code: string; readonly retryAfterMs?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED
  );
}

function shouldRetryModelServicesRead(failureCount: number, error: unknown): boolean {
  return isExpensiveReadCapacityError(error) && failureCount < MODEL_SERVICES_CAPACITY_RETRY_LIMIT;
}

function modelServicesReadRetryDelay(_attemptIndex: number, error: unknown): number {
  if (!isExpensiveReadCapacityError(error)) return 0;
  const retryAfterMs = error.retryAfterMs;
  return typeof retryAfterMs === "number" && retryAfterMs > 0
    ? retryAfterMs
    : DEFAULT_MODEL_SERVICES_CAPACITY_RETRY_MS;
}

const MODEL_SERVICES_READ_RETRY_OPTIONS = {
  retry: shouldRetryModelServicesRead,
  retryDelay: modelServicesReadRetryDelay,
} as const;

export const omniMindModelServicesQueryKeys = {
  all: ["omnimind-model-services"] as const,
  list: (intent: "add_service" | null = null) =>
    ["omnimind-model-services", "list", intent] as const,
  detail: (serviceId: string | null, intent: "add_service" | null = null) =>
    ["omnimind-model-services", "detail", serviceId, intent] as const,
};

function isAddServiceIntentQueryKey(queryKey: readonly unknown[]): boolean {
  return (
    queryKey[0] === omniMindModelServicesQueryKeys.all[0] &&
    ((queryKey[1] === "list" && queryKey[2] === "add_service") ||
      (queryKey[1] === "detail" && queryKey[3] === "add_service"))
  );
}

export async function cancelOmniMindModelServicesAddIntentQueries(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.cancelQueries({
    queryKey: omniMindModelServicesQueryKeys.all,
    predicate: (query) => isAddServiceIntentQueryKey(query.queryKey),
  });
}

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
    ...MODEL_SERVICES_READ_RETRY_OPTIONS,
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
    ...MODEL_SERVICES_READ_RETRY_OPTIONS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
