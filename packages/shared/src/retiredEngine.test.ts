import {
  DEFAULT_ENGINE_KIND,
  DEFAULT_SERVER_SETTINGS,
  EngineSelection,
} from "@harnessos/contracts";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { isRunnableEngine, RUNNABLE_ENGINE_DESCRIPTORS } from "./engineMetadata";
import {
  isServerEngineEnabled,
  normalizeServerSettings,
  validateServerSettingsPatch,
} from "./serverSettings";

describe("retired OA Engine", () => {
  it("keeps stored OA selections readable without changing their engine or model", () => {
    const history = {
      engine: "oa",
      model: "provider/original-model",
      options: { thinkingLevel: "high" },
    };
    expect(Schema.decodeUnknownSync(EngineSelection)(history)).toEqual(history);
    expect(isRunnableEngine("oa")).toBe(false);
    expect(isServerEngineEnabled(DEFAULT_SERVER_SETTINGS, "oa")).toBe(false);
  });
  it("exposes nine runnable engines including independent Pi, and defaults new work to Codex", () => {
    expect(RUNNABLE_ENGINE_DESCRIPTORS.map((x) => x.kind)).toEqual([
      "codex",
      "claude",
      "cursor",
      "antigravity",
      "grok",
      "droid",
      "kilo",
      "opencode",
      "pi",
    ]);
    expect(DEFAULT_ENGINE_KIND).toBe("codex");
    expect(DEFAULT_SERVER_SETTINGS.defaultEngine).toBe("codex");
  });
  it("normalizes an obsolete default but preserves other explicit defaults", () => {
    const prior = { ...DEFAULT_SERVER_SETTINGS, defaultEngine: "oa" as const };
    expect(normalizeServerSettings(prior).defaultEngine).toBe("codex");
    expect(prior.defaultEngine).toBe("oa");
    expect(normalizeServerSettings({ ...prior, defaultEngine: "claude" }).defaultEngine).toBe(
      "claude",
    );
  });
  it("rejects attempts to re-enable OA for new default or background text generation work", () => {
    expect(validateServerSettingsPatch(DEFAULT_SERVER_SETTINGS, { defaultEngine: "oa" })).toContain(
      "removed",
    );
    expect(
      validateServerSettingsPatch(DEFAULT_SERVER_SETTINGS, {
        textGenerationEngineSelection: { engine: "oa", model: "provider/model" },
      }),
    ).toContain("removed");
  });
});
