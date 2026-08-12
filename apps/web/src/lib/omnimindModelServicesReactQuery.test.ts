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

    expect(options.queryKey).toEqual(["omnimind-model-services", "list"]);
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
    expect(enabled.queryKey).toEqual(["omnimind-model-services", "detail", "deepseek"]);
  });
});
