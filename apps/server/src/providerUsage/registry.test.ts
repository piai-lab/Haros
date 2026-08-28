// FILE: providerUsage/registry.test.ts
// Purpose: Every usage-capable engine in shared metadata has a live fetcher.

import { describe, expect, it } from "vitest";

import { ENGINE_USAGE_PROVIDERS } from "@harnessos/shared/providerUsage";

import { ENGINE_USAGE_FETCHERS } from "./registry";

describe("engine usage registry", () => {
  it("registers a fetcher for every usage-capable engine", () => {
    expect(ENGINE_USAGE_PROVIDERS.every((engine) => ENGINE_USAGE_FETCHERS[engine])).toBe(true);
  });
});
