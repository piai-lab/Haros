import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import { BUILT_IN_TOOL_GROUP_OVERRIDE_MAX_KEYS } from "./agentTools";
import { DEFAULT_SERVER_SETTINGS, ServerSettings, ServerSettingsPatch } from "./settings";

const decodePatch = Schema.decodeUnknownSync(ServerSettingsPatch);

describe("agent tool settings contract", () => {
  it("keeps a brand-new settings profile free of explicit surface overrides", () => {
    expect(DEFAULT_SERVER_SETTINGS.agentTools.builtInGroupOverrides).toEqual({});
  });

  it("bounds override group ids, values, surfaces, and map size", () => {
    const specialObjectKey = Object.defineProperty({}, "__proto__", {
      value: true,
      enumerable: true,
    });
    expect(decodePatch({ agentTools: {} })).toEqual({ agentTools: {} });
    expect(() =>
      decodePatch({
        agentTools: { builtInGroupOverrides: { agent: { ["x".repeat(65)]: true } } },
      }),
    ).toThrow();
    expect(() =>
      decodePatch({
        agentTools: {
          builtInGroupOverrides: {
            agent: Object.fromEntries(
              Array.from({ length: BUILT_IN_TOOL_GROUP_OVERRIDE_MAX_KEYS + 1 }, (_, index) => [
                `group-${index}`,
                false,
              ]),
            ),
          },
        },
      }),
    ).toThrow();
    expect(() =>
      decodePatch({ agentTools: { builtInGroupOverrides: { chat: { not_valid: true } } } }),
    ).toThrow();
    expect(() =>
      decodePatch({ agentTools: { builtInGroupOverrides: { chat: specialObjectKey } } }),
    ).toThrow();
    expect(() =>
      decodePatch({ agentTools: { builtInGroupOverrides: { chat: { goals: "yes" } } } }),
    ).toThrow();
    const maximumBoundedMap = Object.fromEntries(
      Array.from({ length: BUILT_IN_TOOL_GROUP_OVERRIDE_MAX_KEYS }, (_, index) => [
        `group-${index}`,
        false,
      ]),
    );
    expect(
      decodePatch({ agentTools: { builtInGroupOverrides: { studio: maximumBoundedMap } } }),
    ).toEqual({ agentTools: { builtInGroupOverrides: { studio: maximumBoundedMap } } });
    expect(
      decodePatch({ agentTools: { builtInGroupOverrides: { chat: { "future-group": false } } } }),
    ).toEqual({
      agentTools: { builtInGroupOverrides: { chat: { "future-group": false } } },
    });
  });
});

describe("engine credential boundary", () => {
  it.each(["kilo", "opencode"] as const)(
    "rejects %s secrets from the generic ServerSettings patch",
    (engine) => {
      expect(() =>
        decodePatch({ engines: { [engine]: { serverPassword: "must-not-pass" } } }),
      ).toThrow();
    },
  );
});
