// FILE: omnimindModelServicesReactQuery.test.ts
// Purpose: Locks Model services query identity and inactive/detail admission gates.
// Layer: Web query tests

import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  cancelOmniMindModelServicesAddIntentQueries,
  omniMindModelServiceDetailQueryOptions,
  omniMindModelServicesListQueryOptions,
  omniMindModelServicesQueryKeys,
} from "./omnimindModelServicesReactQuery";

describe("OmniMind model services React Query options", () => {
  it("uses a path-free stable namespace and honors the inactive list gate", () => {
    const options = omniMindModelServicesListQueryOptions({ enabled: false });

    expect(options.queryKey).toEqual(["omnimind-model-services", "list", null]);
    expect(options.enabled).toBe(false);
    expect(omniMindModelServicesQueryKeys.all).toEqual(["omnimind-model-services"]);
  });

  it("does not admit a detail read until both the route and service id are present", () => {
    expect(omniMindModelServiceDetailQueryOptions({ enabled: true, serviceId: null }).enabled).toBe(
      false,
    );
    expect(
      omniMindModelServiceDetailQueryOptions({ enabled: false, serviceId: "deepseek" }).enabled,
    ).toBe(false);
    const enabled = omniMindModelServiceDetailQueryOptions({
      enabled: true,
      serviceId: "deepseek",
    });
    expect(enabled.enabled).toBe(true);
    expect(enabled.queryKey).toEqual(["omnimind-model-services", "detail", "deepseek", null]);
  });

  it("keeps passive and explicit add-service projection queries separate", () => {
    const list = omniMindModelServicesListQueryOptions({
      enabled: true,
      intent: "add_service",
    });
    const detail = omniMindModelServiceDetailQueryOptions({
      enabled: true,
      serviceId: "extension-service",
      intent: "add_service",
    });

    expect(list.queryKey).toEqual(["omnimind-model-services", "list", "add_service"]);
    expect(detail.queryKey).toEqual([
      "omnimind-model-services",
      "detail",
      "extension-service",
      "add_service",
    ]);
  });

  it("retries only bounded server read-capacity rejections", () => {
    const options = omniMindModelServicesListQueryOptions({ enabled: true });
    const retry = options.retry;
    const retryDelay = options.retryDelay;
    expect(retry).toBeTypeOf("function");
    expect(retryDelay).toBeTypeOf("function");
    if (typeof retry !== "function" || typeof retryDelay !== "function") return;

    const capacityError = {
      code: "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED",
      retryAfterMs: 375,
    };
    expect(retry(0, capacityError)).toBe(true);
    expect(retry(11, capacityError)).toBe(true);
    expect(retry(12, capacityError)).toBe(false);
    expect(retry(0, { code: "RPC_REQUEST_CAPACITY_EXCEEDED" })).toBe(false);
    expect(retryDelay(0, capacityError)).toBe(375);
    expect(
      retryDelay(0, {
        code: "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED",
      }),
    ).toBe(250);
  });

  it("retries only capacity admission for intent-scoped Extension projection", () => {
    const addList = omniMindModelServicesListQueryOptions({
      enabled: true,
      intent: "add_service",
    });
    const addDetail = omniMindModelServiceDetailQueryOptions({
      enabled: true,
      serviceId: "extension-service",
      intent: "add_service",
    });

    for (const options of [addList, addDetail]) {
      const retry = options.retry;
      expect(retry).toBeTypeOf("function");
      if (typeof retry !== "function") continue;

      expect(retry(0, { code: "RPC_EXPENSIVE_READ_CAPACITY_EXCEEDED" })).toBe(true);
      expect(retry(0, { code: "EXTENSION_PROJECTION_FAILED" })).toBe(false);
      expect(retry(0, new Error("Extension load failed"))).toBe(false);
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
        queryKey: omniMindModelServicesQueryKeys.detail("extension-service", "add_service"),
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
      await cancelOmniMindModelServicesAddIntentQueries(queryClient);
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
