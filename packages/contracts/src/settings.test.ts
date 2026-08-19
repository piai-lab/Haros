import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import { DEFAULT_SERVER_SETTINGS, ServerSettingsPatch } from "./settings";

const decodePatch = Schema.decodeUnknownSync(ServerSettingsPatch);

describe("agent tool settings contract", () => {
  it("keeps Device disabled for a brand-new settings profile", () => {
    expect(DEFAULT_SERVER_SETTINGS.agentTools.disabledBuiltInGroups).toEqual(["device"]);
  });

  it("bounds disabled group ids and list size", () => {
    expect(decodePatch({ agentTools: {} })).toEqual({ agentTools: {} });
    expect(() =>
      decodePatch({ agentTools: { disabledBuiltInGroups: ["x".repeat(65)] } }),
    ).toThrow();
    expect(() =>
      decodePatch({
        agentTools: {
          disabledBuiltInGroups: Array.from({ length: 33 }, (_, index) => `group-${index}`),
        },
      }),
    ).toThrow();
  });
});
