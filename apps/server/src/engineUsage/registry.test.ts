// FILE: engineUsage/registry.test.ts
// Purpose: Every usage-capable engine in shared metadata has a live fetcher.

import { describe, expect, it } from "vitest";

import { ENGINE_USAGE_ENGINES } from "@harnessos/shared/engineUsage";

import { ENGINE_USAGE_FETCHERS } from "./registry";

describe("engine usage registry", () => {
  it("registers a fetcher for every usage-capable engine", () => {
    expect(ENGINE_USAGE_ENGINES.every((engine) => ENGINE_USAGE_FETCHERS[engine])).toBe(true);
  });
});
