// FILE: skillPromptInjection.test.ts
// Purpose: Verifies which providers receive inlined portable skill instructions
//          and that the inline text respects the turn character budget.
// Layer: Server provider tests

import { mkdtempSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildInlineSkillInstructions,
  shouldInlineSkillForProvider,
} from "./skillPromptInjection.ts";

const omnimindSkillPath = "/Users/me/.omnimind/skills/reviewer/SKILL.md";
const codexSkillPath = "/Users/me/.codex/skills/reviewer/SKILL.md";
const claudeSkillPath = "/Users/me/.claude/skills/reviewer/SKILL.md";
const cursorSkillPath = "/Users/me/.cursor/skills/reviewer/SKILL.md";
const piSkillPath = "/Users/me/.pi/agent/skills/reviewer/SKILL.md";

describe("shouldInlineSkillForProvider", () => {
  it("skips codex-native and omnimind roots for codex but inlines foreign provider roots", () => {
    // Codex loads .codex roots natively and ~/.omnimind/skills via the extra
    // skill root registered at session start.
    expect(shouldInlineSkillForProvider("codex", omnimindSkillPath)).toBe(false);
    expect(shouldInlineSkillForProvider("codex", codexSkillPath)).toBe(false);
    expect(shouldInlineSkillForProvider("codex", claudeSkillPath)).toBe(true);
    expect(shouldInlineSkillForProvider("codex", cursorSkillPath)).toBe(true);
  });

  it("inlines only OmniMind-owned paths for cursor", () => {
    expect(shouldInlineSkillForProvider("cursor", omnimindSkillPath)).toBe(true);
    expect(shouldInlineSkillForProvider("cursor", cursorSkillPath)).toBe(false);
    expect(shouldInlineSkillForProvider("cursor", codexSkillPath)).toBe(false);
  });

  it("inlines everything except .claude paths for claudeAgent", () => {
    expect(shouldInlineSkillForProvider("claudeAgent", claudeSkillPath)).toBe(false);
    expect(shouldInlineSkillForProvider("claudeAgent", omnimindSkillPath)).toBe(true);
    expect(shouldInlineSkillForProvider("claudeAgent", codexSkillPath)).toBe(true);
  });

  it("inlines cross-provider paths for pi but not pi-native skills", () => {
    expect(shouldInlineSkillForProvider("pi", omnimindSkillPath)).toBe(true);
    expect(shouldInlineSkillForProvider("pi", claudeSkillPath)).toBe(true);
    expect(shouldInlineSkillForProvider("pi", piSkillPath)).toBe(false);
  });

  it("always inlines for providers without native skill support", () => {
    for (const provider of ["antigravity", "grok", "kilo", "opencode"] as const) {
      expect(shouldInlineSkillForProvider(provider, omnimindSkillPath)).toBe(true);
      expect(shouldInlineSkillForProvider(provider, claudeSkillPath)).toBe(true);
    }
  });
});

describe("buildInlineSkillInstructions", () => {
  it("inlines skill content for non-native providers and skips unreadable paths", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "skill-inline-"));
    const skillDir = path.join(root, ".omnimind", "skills", "reviewer");
    try {
      await mkdir(skillDir, { recursive: true });
      const skillPath = path.join(skillDir, "SKILL.md");
      await writeFile(skillPath, "# Reviewer\n\nAlways review carefully.");

      const result = await buildInlineSkillInstructions({
        provider: "antigravity",
        skills: [
          { name: "reviewer", path: skillPath },
          { name: "missing", path: path.join(root, ".omnimind", "skills", "missing", "SKILL.md") },
        ],
        maxChars: 10_000,
      });

      expect(result.text).toContain('<skill name="reviewer"');
      expect(result.text).toContain("Always review carefully.");
      expect(result.text).not.toContain("missing");
      expect(result.deliveries).toEqual([
        { name: "reviewer", status: "delivered", mode: "inline" },
        { name: "missing", status: "failed", mode: "inline", failureReason: "unreadable" },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns empty text when nothing fits in the budget", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "skill-inline-budget-"));
    const skillDir = path.join(root, ".omnimind", "skills", "reviewer");
    try {
      await mkdir(skillDir, { recursive: true });
      const skillPath = path.join(skillDir, "SKILL.md");
      await writeFile(skillPath, "content".repeat(100));

      const result = await buildInlineSkillInstructions({
        provider: "antigravity",
        skills: [{ name: "reviewer", path: skillPath }],
        maxChars: 50,
      });

      expect(result.text).toBe("");
      expect(result.deliveries[0]).toMatchObject({
        name: "reviewer",
        status: "failed",
        failureReason: "budget_exceeded",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not inline omnimind-rooted skills for codex (covered by the extra skill root)", async () => {
    const result = await buildInlineSkillInstructions({
      provider: "codex",
      skills: [{ name: "reviewer", path: omnimindSkillPath }],
      maxChars: 10_000,
    });
    expect(result.text).toBe("");
    expect(result.deliveries).toEqual([
      { name: "reviewer", status: "delivered", mode: "reference" },
    ]);
  });

  it("continues after an oversized skill so a later skill can still fit", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "skill-inline-partial-"));
    try {
      const firstDir = path.join(root, ".omnimind", "skills", "large");
      const secondDir = path.join(root, ".omnimind", "skills", "small");
      await mkdir(firstDir, { recursive: true });
      await mkdir(secondDir, { recursive: true });
      const firstPath = path.join(firstDir, "SKILL.md");
      const secondPath = path.join(secondDir, "SKILL.md");
      await writeFile(firstPath, "x".repeat(24_001));
      await writeFile(secondPath, "Keep this instruction.");

      const result = await buildInlineSkillInstructions({
        provider: "omnimind",
        skills: [
          { name: "large", path: firstPath },
          { name: "small", path: secondPath },
        ],
        maxChars: 10_000,
      });

      expect(result.text).toContain("Keep this instruction.");
      expect(result.deliveries).toEqual([
        { name: "large", status: "failed", mode: "inline", failureReason: "oversized" },
        { name: "small", status: "delivered", mode: "inline" },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
