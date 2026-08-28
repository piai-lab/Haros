import { BUILT_IN_TOOL_GROUP_IDS, BUILT_IN_TOOL_SURFACES } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import {
  configuredHostGroupEnabled,
  HOST_GROUP_SURFACE_POLICY,
} from "./hostToolSurfacePolicy";

describe("Host tool product-surface policy", () => {
  it("exhaustively defines the locked eighteen-cell support/default matrix", () => {
    expect(
      BUILT_IN_TOOL_GROUP_IDS.flatMap((group) =>
        BUILT_IN_TOOL_SURFACES.map((surface) => [
          `${group}:${surface}`,
          HOST_GROUP_SURFACE_POLICY[group][surface],
        ]),
      ),
    ).toEqual([
      ["tasks:agent", { supported: true, defaultEnabled: true }],
      ["tasks:chat", { supported: false, defaultEnabled: false }],
      ["tasks:studio", { supported: true, defaultEnabled: true }],
      ["diagnostics:agent", { supported: true, defaultEnabled: true }],
      ["diagnostics:chat", { supported: false, defaultEnabled: false }],
      ["diagnostics:studio", { supported: true, defaultEnabled: true }],
      ["goals:agent", { supported: true, defaultEnabled: true }],
      ["goals:chat", { supported: true, defaultEnabled: false }],
      ["goals:studio", { supported: true, defaultEnabled: true }],
      ["automations:agent", { supported: true, defaultEnabled: true }],
      ["automations:chat", { supported: true, defaultEnabled: false }],
      ["automations:studio", { supported: true, defaultEnabled: true }],
      ["browser:agent", { supported: true, defaultEnabled: true }],
      ["browser:chat", { supported: true, defaultEnabled: true }],
      ["browser:studio", { supported: true, defaultEnabled: true }],
      ["device:agent", { supported: true, defaultEnabled: false }],
      ["device:chat", { supported: true, defaultEnabled: false }],
      ["device:studio", { supported: true, defaultEnabled: false }],
    ]);
  });

  it("uses absent/true/false overrides but never lets unsupported true become active", () => {
    expect(configuredHostGroupEnabled({ group: "goals", surface: "chat", overrides: {} })).toBe(
      false,
    );
    expect(
      configuredHostGroupEnabled({
        group: "goals",
        surface: "chat",
        overrides: { chat: { goals: true } },
      }),
    ).toBe(true);
    expect(
      configuredHostGroupEnabled({
        group: "browser",
        surface: "chat",
        overrides: { chat: { browser: false } },
      }),
    ).toBe(false);
    expect(
      configuredHostGroupEnabled({
        group: "tasks",
        surface: "chat",
        overrides: { chat: { tasks: true } },
      }),
    ).toBe(false);
  });
});
