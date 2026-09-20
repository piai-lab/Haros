import { describe, expect, it } from "vitest";

import {
  buildStarredModelEntry,
  isModelStarred,
  normalizeStarredModels,
  resolveCycledStarredModel,
  toggleStarredModel,
} from "./starredModels";

describe("starredModels", () => {
  it("cycles both directions between efforts on the same model and skips unavailable models", () => {
    const low = buildStarredModelEntry({ engine: "codex", model: "gpt-5.5", effort: "low" });
    const high = { ...low, effort: "high" };
    const models = [low, { ...low, model: "removed-model" }, high];
    expect(
      resolveCycledStarredModel({
        models,
        current: low,
        availableModels: [low.model],
        direction: "next",
      }),
    ).toEqual(high);
    expect(
      resolveCycledStarredModel({
        models,
        current: low,
        availableModels: [low.model],
        direction: "previous",
      }),
    ).toEqual(high);
    expect(
      resolveCycledStarredModel({
        models,
        current: high,
        availableModels: [low.model],
        direction: "next",
      }),
    ).toEqual(low);
    expect(
      resolveCycledStarredModel({ models, current: low, availableModels: [], direction: "next" }),
    ).toBeNull();
  });
  it("toggles a combo without duplicating it", () => {
    const entry = {
      engine: "codex" as const,
      model: "gpt-5.4",
      effort: "high",
      fastMode: true,
      thinking: null,
    };
    const added = toggleStarredModel([], entry);
    expect(added).toEqual([entry]);
    expect(toggleStarredModel(added, entry)).toEqual([]);
  });

  it("matches exact combinations without discarding explicit false values", () => {
    const models = normalizeStarredModels([
      { engine: "codex", model: "gpt-5.4", effort: "high", fastMode: null, thinking: null },
      { engine: "codex", model: "gpt-5.4", effort: "low", fastMode: null, thinking: null },
      { engine: "claude", model: "claude-opus-4-6", effort: null, fastMode: null, thinking: null },
    ]);
    expect(isModelStarred(models, "claude", "claude-opus-4-6")).toBe(true);
    expect(
      isModelStarred(models, "codex", "gpt-5.4", {
        effort: "high",
        fastMode: null,
        thinking: null,
      }),
    ).toBe(true);
    expect(
      isModelStarred(models, "codex", "gpt-5.4", {
        effort: "medium",
        fastMode: null,
        thinking: null,
      }),
    ).toBe(false);
    expect(
      buildStarredModelEntry({
        engine: "claude",
        model: "claude-opus-4-6",
        effort: "high",
        fastMode: false,
        thinking: true,
      }),
    ).toEqual({
      engine: "claude",
      model: "claude-opus-4-6",
      effort: "high",
      fastMode: false,
      thinking: true,
    });
  });
});
