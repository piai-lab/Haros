// FILE: modelServicesReactQuery.test.ts
// Purpose: Locks Model services query identity and inactive/detail admission gates.
// Layer: Web query tests

import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  cancelHarosModelServicesAddIntentQueries,
  modelServiceDetailQueryOptions,
  modelServicesListQueryOptions,
  modelServicesQueryKeys,
} from "./modelServicesReactQuery";

describe("Haros model services React Query options", () => {
  it("uses a path-free stable namespace and honors the inactive list gate", () => {
    const options = modelServicesListQueryOptions({ enabled: false });

    expect(options.queryKey).toEqual(["harnessos-model-services", "list", null]);
    expect(options.enabled).toBe(false);
    expect(modelServicesQueryKeys.all).toEqual(["harnessos-model-services"]);
  });

  it("does not admit a detail read until both the route and service id are present", () => {
    expect(modelServiceDetailQueryOptions({ enabled: true, serviceId: null }).enabled).toBe(false);
    expect(modelServiceDetailQueryOptions({ enabled: false, serviceId: "deepseek" }).enabled).toBe(
      false,
    );
    const enabled = modelServiceDetailQueryOptions({
      enabled: true,
      serviceId: "deepseek",
    });
    expect(enabled.enabled).toBe(true);
    expect(enabled.queryKey).toEqual(["harnessos-model-services", "detail", "deepseek", null]);
  });

  it("keeps passive and explicit add-service projection queries separate", () => {
    const list = modelServicesListQueryOptions({
      enabled: true,
      intent: "add_service",
    });
    const detail = modelServiceDetailQueryOptions({
      enabled: true,
      serviceId: "extension-service",
      intent: "add_service",
    });

    expect(list.queryKey).toEqual(["harnessos-model-services", "list", "add_service"]);
    expect(detail.queryKey).toEqual([
      "harnessos-model-services",
      "detail",
      "extension-service",
      "add_service",
    ]);
  });

  it("leaves server read-capacity retries to the transport", () => {
    const options = modelServicesListQueryOptions({ enabled: true });
    expect(options.retry).toBe(false);
  });

  it("retries only capacity admission for intent-scoped Extension projection", () => {
    const addList = modelServicesListQueryOptions({
      enabled: true,
      intent: "add_service",
    });
    const addDetail = modelServiceDetailQueryOptions({
      enabled: true,
      serviceId: "extension-service",
      intent: "add_service",
    });

    for (const options of [addList, addDetail]) {
      expect(options.retry).toBe(false);
    }
  });

  it("cancels a queued intent retry when the user leaves Add", async () => {
    vi.useFakeTimers();
    try {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
      });
      let calls = 0;
      let aborts = 0;
      const observer = new QueryObserver(queryClient, {
        queryKey: modelServicesQueryKeys.detail("extension-service", "add_service"),
        queryFn: ({ signal }) => {
          calls += 1;
          signal.addEventListener("abort", () => {
            aborts += 1;
          });
          return Promise.reject({
            code: "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED",
            retryAfterMs: 250,
          });
        },
        retry: (failureCount, error) =>
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED" &&
          failureCount < 12,
        retryDelay: 250,
      });
      const unsubscribe = observer.subscribe(() => undefined);

      await Promise.resolve();
      await Promise.resolve();
      expect(calls).toBe(1);
      await cancelHarosModelServicesAddIntentQueries(queryClient);
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();

      expect(calls).toBe(1);
      expect(aborts).toBe(1);
      expect(queryClient.getQueryState(observer.options.queryKey)?.fetchStatus).toBe("idle");
      unsubscribe();
      queryClient.clear();
    } finally {
      vi.useRealTimers();
    }
  });
});
