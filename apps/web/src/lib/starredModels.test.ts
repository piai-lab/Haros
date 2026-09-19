import { describe, expect, it } from "vitest";

import {
  isModelStarred,
  normalizeStarredModels,
  starredModelSlugsForEngine,
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
  });
});
