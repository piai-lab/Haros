// FILE: skillPromptInjection.ts
// Purpose: Inlines portable skill instructions into the outgoing prompt for engines
//          that cannot natively load the referenced skill files. This is the fallback
//          that makes Haros catalog skills usable on every engine.
// Layer: Server engine helper
// Exports: shouldInlineSkillForProvider, buildInlineSkillInstructions

import * as fs from "node:fs/promises";
import * as nodePath from "node:path";

import type { EngineKind, EngineSkillReference } from "@harnessos/contracts";

// Per-skill cap keeps a single oversized SKILL.md from eating the turn budget.
const MAX_INLINE_SKILL_CONTENT_CHARS = 24_000;

const INLINE_SKILLS_HEADER =
  "The user invoked the following agent skill(s) for this request. Follow each " +
  "skill's instructions. File paths referenced inside a skill are relative to its " +
  '"dir" attribute.';

export type SkillInstructionDeliveryMode = "inline" | "reference";
export type SkillInstructionFailureReason = "unreadable" | "oversized" | "budget_exceeded";

export interface SkillInstructionDelivery {
  readonly name: string;
  readonly status: "delivered" | "failed";
  readonly mode: SkillInstructionDeliveryMode;
  readonly failureReason?: SkillInstructionFailureReason;
}

export interface InlineSkillInstructionsResult {
  readonly text: string;
  readonly deliveries: ReadonlyArray<SkillInstructionDelivery>;
}

const CROSS_PROVIDER_SKILL_DIR_NAMES = [
  ".harnessos",
  ".codex",
  ".cursor",
  ".claude",
  ".agents",
] as const;

function pathSegments(path: string): Set<string> {
  return new Set(nodePath.normalize(path).split(/[\\/]+/));
}

export function shouldInlineSkillForProvider(engine: EngineKind, skillPath: string): boolean {
  const segments = pathSegments(skillPath);
  switch (engine) {
    case "antigravity":
      return true;
    case "codex":
      // Codex injects structured skill items only from roots it knows: its own
      // folders plus `~/.harnessos/skills`, which Haros registers at session start
      // via skills/extraRoots/set. Skills resolved from other engines' folders
      // must be inlined.
      return [".claude", ".cursor", ".agents"].some((dir) => segments.has(dir));
    case "cursor":
      // cursor-agent natively scans .cursor/.agents/.claude/.codex skill roots;
      // only Haros-owned paths need inlining.
      return segments.has(".harnessos");
    case "claude":
      // Claude Code only loads skills from .claude/skills folders.
      return !segments.has(".claude");
    case "pi":
      // Pi loads its own skill set; anything resolved from a cross-engine
      // folder is portable and must be inlined.
      return CROSS_PROVIDER_SKILL_DIR_NAMES.some((dir) => segments.has(dir));
    case "oa":
      // Haros's explicit multi-skill Composer selection is a Host-owned
      // inline path. Pi remains the owner of native discovery and model-invoked
      // skills; this branch makes the Host boundary explicit instead of relying
      // on the default fallback.
      return true;
    default:
      // Antigravity/Grok/Droid/Kilo/OpenCode have no native skill support.
      return true;
  }
}

export async function buildInlineSkillInstructions(input: {
  readonly engine: EngineKind;
  readonly skills: ReadonlyArray<EngineSkillReference>;
  readonly maxChars: number;
}): Promise<InlineSkillInstructionsResult> {
  const deliveries: SkillInstructionDelivery[] = [];
  let text = "";
  for (const skill of input.skills) {
    if (!shouldInlineSkillForProvider(input.engine, skill.path)) {
      deliveries.push({ name: skill.name, status: "delivered", mode: "reference" });
      continue;
    }
    let content: string;
    try {
      content = await fs.readFile(skill.path, "utf8");
    } catch {
      deliveries.push({
        name: skill.name,
        status: "failed",
        mode: "inline",
        failureReason: "unreadable",
      });
      continue;
    }
    let trimmed = content.trim();
    if (trimmed.length > MAX_INLINE_SKILL_CONTENT_CHARS) {
      deliveries.push({
        name: skill.name,
        status: "failed",
        mode: "inline",
        failureReason: "oversized",
      });
      continue;
    }
    const block = `<skill name=${JSON.stringify(skill.name)} dir=${JSON.stringify(
      nodePath.dirname(skill.path),
    )}>\n${trimmed}\n</skill>`;
    const candidate =
      text.length === 0 ? `${INLINE_SKILLS_HEADER}\n\n${block}` : `${text}\n\n${block}`;
    if (candidate.length > input.maxChars) {
      deliveries.push({
        name: skill.name,
        status: "failed",
        mode: "inline",
        failureReason: "budget_exceeded",
      });
      continue;
    }
    text = candidate;
    deliveries.push({ name: skill.name, status: "delivered", mode: "inline" });
  }
  return { text, deliveries };
}
