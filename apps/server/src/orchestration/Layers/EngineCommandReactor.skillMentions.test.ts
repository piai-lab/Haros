// FILE: EngineCommandReactor.skillMentions.test.ts
// Purpose: Covers engine-specific prompt text normalization for selected skills.
// Layer: Server orchestration tests
// Exports: Vitest cases for EngineCommandReactor helpers.

import { describe, expect, it } from "vitest";

import { normalizeSkillMentionTextForProvider } from "./EngineCommandReactor.ts";

describe("normalizeSkillMentionTextForProvider", () => {
  it("translates slash-selected skills to Codex dollar mentions before engine dispatch", () => {
    expect(
      normalizeSkillMentionTextForProvider({
        engine: "codex",
        messageText: "Use /check-code and /recap please",
        skills: [
          { name: "check-code", path: "/skills/check-code/SKILL.md" },
          { name: "recap", path: "/skills/recap/SKILL.md" },
        ],
      }),
    ).toBe("Use $check-code and $recap please");
  });

  it("leaves non-Codex slash skills untouched", () => {
    expect(
      normalizeSkillMentionTextForProvider({
        engine: "cursor",
        messageText: "Use /check-code please",
        skills: [{ name: "check-code", path: "/skills/check-code/SKILL.md" }],
      }),
    ).toBe("Use /check-code please");
  });
});
