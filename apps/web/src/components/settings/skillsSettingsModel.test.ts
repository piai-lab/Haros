// FILE: skillsSettingsModel.test.ts
// Purpose: Locks down Settings -> Skills grouping for duplicate engine skill copies.
// Layer: Web settings logic tests

import { ENGINE_KINDS, type EngineSkillDescriptor } from "@harnessos/contracts";
import { ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { describe, expect, it } from "vitest";

import {
  buildSettingsSkillGroups,
  buildSettingsSkillSections,
  isHarnessOSSkillSource,
  ORIGIN_SECTION_ORDER,
  skillOriginInfo,
} from "./skillsSettingsModel";

function skill(partial: Partial<EngineSkillDescriptor>): EngineSkillDescriptor {
  return {
    name: "example",
    enabled: true,
    path: "/tmp/example/SKILL.md",
    ...partial,
  };
}

describe("buildSettingsSkillGroups", () => {
  it("renders duplicate engine copies as one shared skill group", () => {
    const groups = buildSettingsSkillGroups([
      skill({
        name: "check-code",
        description: "Codex copy",
        path: "/Users/test/.codex/skills/check-code/SKILL.md",
        scope: "codex",
      }),
      skill({
        name: "check-code",
        description: "Claude copy",
        path: "/Users/test/.claude/skills/check-code/SKILL.md",
        scope: "claude",
      }),
      skill({
        name: "cursor-only",
        path: "/Users/test/.cursor/skills/cursor-only/SKILL.md",
        scope: "cursor",
      }),
    ]);

    const shared = groups.find((group) => group.key === "check-code");
    expect(shared?.section).toBe("shared");
    expect(shared?.engines).toEqual(["codex", "claude"]);
    expect(shared?.sources.map((source) => source.origin)).toEqual(["codex", "claude"]);
    expect(shared?.sources.map((source) => source.skill.path)).toEqual([
      "/Users/test/.codex/skills/check-code/SKILL.md",
      "/Users/test/.claude/skills/check-code/SKILL.md",
    ]);

    const cursorOnly = groups.find((group) => group.key === "cursor-only");
    expect(cursorOnly?.section).toBe("cursor");
    expect(cursorOnly?.engines).toEqual(["cursor"]);
  });

  it("does not show engine icons for shared alias-only skills", () => {
    const groups = buildSettingsSkillGroups([
      skill({
        name: "portable-review",
        description: "Shared standard copy",
        path: "/Users/test/.agents/skills/portable-review/SKILL.md",
        scope: "agents",
      }),
    ]);

    expect(groups[0]?.engines).toEqual([]);
    expect(groups[0]?.section).toBe("agents");
  });
});

describe("isHarnessOSSkillSource", () => {
  it("distinguishes HarnessOS-owned assets from Engine-native homes", () => {
    expect(
      isHarnessOSSkillSource(
        skill({ path: "/Users/test/.harnessos/skills/reviewer/SKILL.md", scope: "project" }),
      ),
    ).toBe(true);
    expect(
      isHarnessOSSkillSource(
        skill({ path: "/Users/test/.codex/skills/reviewer/SKILL.md", scope: "codex" }),
      ),
    ).toBe(false);
  });
});

describe("buildSettingsSkillSections", () => {
  it("places shared skill groups before engine-only sections", () => {
    const sections = buildSettingsSkillSections([
      skill({
        name: "logic-consolidator",
        path: "/Users/test/.codex/skills/logic-consolidator/SKILL.md",
        scope: "codex",
      }),
      skill({
        name: "logic-consolidator",
        path: "/Users/test/.claude/skills/logic-consolidator/SKILL.md",
        scope: "claude",
      }),
      skill({
        name: "cursor-only",
        path: "/Users/test/.cursor/skills/cursor-only/SKILL.md",
        scope: "cursor",
      }),
    ]);

    expect(sections.map((section) => section.title)).toEqual(["Shared skills", "From Cursor"]);
    expect(sections[0]?.groups.map((group) => group.key)).toEqual(["logic-consolidator"]);
  });
});

describe("Settings skill Engine projection", () => {
  it("derives Engine-backed origins from canonical identity instead of a second member list", () => {
    const providerOrigins = ORIGIN_SECTION_ORDER.slice(0, ENGINE_KINDS.length);
    expect(providerOrigins).toEqual(
      ENGINE_KINDS.map((engine) => (engine === "claude" ? "claude" : engine)),
    );

    for (const engine of ENGINE_KINDS) {
      const origin = engine === "claude" ? "claude" : engine;
      const info = skillOriginInfo(origin);
      if (engine === "oa") {
        expect(info).toEqual({ label: "HarnessOS", engine: null });
      } else {
        expect(info).toEqual({ label: ENGINE_DISPLAY_NAMES[engine], engine });
      }
    }
  });
});
