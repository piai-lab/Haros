import { describe, expect, it } from "vitest";

import {
  buildStarredModelEntry,
  isModelStarred,
  normalizeStarredModels,
  resolveStarredToggleEntry,
  starredModelSlugsForEngine,
  starredTraitsForModel,
  toggleStarredModel,
} from "./starredModels";

describe("starredModels", () => {
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

  it("keeps slug cycling unique per engine", () => {
    const models = normalizeStarredModels([
      { engine: "codex", model: "gpt-5.4", effort: "high", fastMode: null, thinking: null },
      { engine: "codex", model: "gpt-5.4", effort: "low", fastMode: null, thinking: null },
      { engine: "claude", model: "claude-opus-4-6", effort: null, fastMode: null, thinking: null },
    ]);
    expect(starredModelSlugsForEngine(models, "codex")).toEqual(["gpt-5.4"]);
    expect(isModelStarred(models, "claude", "claude-opus-4-6")).toBe(true);
    expect(isModelStarred(models, "codex", "gpt-5.4", { effort: "high", fastMode: null, thinking: null })).toBe(
      true,
    );
    expect(isModelStarred(models, "codex", "gpt-5.4", { effort: "medium", fastMode: null, thinking: null })).toBe(
      false,
    );
    expect(starredTraitsForModel(models, "codex", "gpt-5.4")).toEqual({
      effort: "high",
      fastMode: null,
      thinking: null,
    });
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
    expect(
      resolveStarredToggleEntry({
        models,
        engine: "codex",
        model: "gpt-5.4",
        live: true,
        effort: "xhigh",
        fastMode: true,
        thinking: null,
      }),
    ).toEqual({
      engine: "codex",
      model: "gpt-5.4",
      effort: "xhigh",
      fastMode: true,
      thinking: null,
    });
    expect(
      resolveStarredToggleEntry({
        models,
        engine: "codex",
        model: "gpt-5.4",
        live: false,
      }),
    ).toEqual({
      engine: "codex",
      model: "gpt-5.4",
      effort: "high",
      fastMode: null,
      thinking: null,
    });
  });
});
