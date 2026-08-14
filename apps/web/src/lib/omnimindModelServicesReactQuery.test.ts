// FILE: omnimindModelServicesReactQuery.test.ts
// Purpose: Locks Model services query identity and inactive/detail admission gates.
// Layer: Web query tests

import { describe, expect, it } from "vitest";

import {
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

  it("never retries intent-scoped Extension projection after the user leaves Add", () => {
    const addList = omniMindModelServicesListQueryOptions({
      enabled: true,
      intent: "add_service",
    });
    const addDetail = omniMindModelServiceDetailQueryOptions({
      enabled: true,
      serviceId: "extension-service",
      intent: "add_service",
    });

    expect(addList.retry).toBe(false);
    expect(addDetail.retry).toBe(false);
  });
});
