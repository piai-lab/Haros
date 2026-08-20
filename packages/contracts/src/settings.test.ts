import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import { OMNIMIND_AGENT_PROMPT_MAX_BYTES } from "./editableText";
import { DEFAULT_SERVER_SETTINGS, ServerSettings, ServerSettingsPatch } from "./settings";

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

describe("server-only OmniMind default prompt settings", () => {
  it("ignores retired OmniMind model hints in persisted settings and public patches", () => {
    const retiredKey = ["custom", "Models"].join("");
    const settings = Schema.decodeUnknownSync(ServerSettings)({
      providers: {
        omnimind: {
          enabled: false,
          [retiredKey]: ["legacy/provider-model"],
          defaultPrompt: null,
        },
      },
    });
    const patch = decodePatch({
      providers: { omnimind: { [retiredKey]: ["legacy/provider-model"] } },
    });

    expect(settings.providers.omnimind).toEqual({ enabled: false, defaultPrompt: null });
    expect(patch.providers?.omnimind).toEqual({});
  });

  it("is not accepted by the public settings patch", () => {
    const patch = decodePatch({
      providers: { omnimind: { defaultPrompt: "must stay private" } },
    });
    expect(patch.providers?.omnimind).not.toHaveProperty("defaultPrompt");
  });

  it("uses the same UTF-8 byte boundary as the prompt contract", () => {
    const emoji = "😀";
    const withinLimit = emoji.repeat(OMNIMIND_AGENT_PROMPT_MAX_BYTES / 4);
    const decodeSettings = (defaultPrompt: string) =>
      Schema.decodeUnknownSync(ServerSettings)({
        providers: { omnimind: { defaultPrompt } },
      });

    expect(decodeSettings(withinLimit).providers.omnimind.defaultPrompt).toBe(withinLimit);
    expect(() => decodeSettings(`${withinLimit}${emoji}`)).toThrow();
  });
});
