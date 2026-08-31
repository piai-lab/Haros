#!/usr/bin/env bash

set -euo pipefail

repo_root="/Users/liuzaoqu/Desktop/Develop/independent/Haros"
cd "$repo_root"

test "$(git rev-parse --show-toplevel)" = "$repo_root"
test -f AGENTS.md
test -f README.md
test -f docs/architecture.md
test -f docs/haros-guidebook-plan.md
test -f /Users/liuzaoqu/.codex/skills/zq-orchestrate/SKILL.md
test -f /Users/liuzaoqu/.codex/skills/zq-goal/SKILL.md
test -f /Users/liuzaoqu/Desktop/Develop/solvinglab-skill-internal/skills/design/image/gpt-image-2/SKILL.md

node - <<'NODE'
const fs = require("fs");
const source = fs.readFileSync("docs/haros-guidebook-plan.md", "utf8");
const lines = source.split(/\r?\n/);

function between(start, end) {
  const startIndex = lines.findIndex((line) => line.startsWith(start));
  const endIndex = lines.findIndex((line, index) => index > startIndex && line.startsWith(end));
  if (startIndex < 0 || endIndex < 0) throw new Error(`missing section: ${start} -> ${end}`);
  return lines.slice(startIndex + 1, endIndex);
}

const chapters = lines.filter((line) => /^\|\s+\d+\s+\| \*\*/.test(line)).length;
const anchors = between("### 9.6 ", "### 9.7 ").filter((line) => /^\| G\d\d \|/.test(line));
const pairs = between("### 9.7 ", "### 9.8 ").filter((line) => /^\|\s+\d+\s+\|/.test(line)).length;
const anchorIds = anchors.map((line) => line.split("|")[1].trim());
const anchorSlots = anchors.map((line) => line.split("|")[2].trim());

const observed = {
  chapters,
  anchorRows: anchors.length,
  uniqueAnchorIds: new Set(anchorIds).size,
  uniqueAnchorSlots: new Set(anchorSlots).size,
  chapterVisualPairs: pairs,
  plannedVisualSlots: 1 + 7 + 50 + 50 + 18 + 14,
  pilotGeneratedAssets: 9,
  pilotChapters: 3,
};

const pass = observed.chapters === 50 && observed.anchorRows === 26 &&
  observed.uniqueAnchorIds === 26 && observed.uniqueAnchorSlots === 26 &&
  observed.chapterVisualPairs === 50 && observed.plannedVisualSlots === 140;

console.log(`plan-contract=${JSON.stringify(observed)}`);
if (!pass) process.exit(1);
NODE

echo "workspace=$repo_root"
echo "branch=$(git branch --show-current)"
echo "head=$(git rev-parse HEAD)"
echo "plan_sha256=$(shasum -a 256 docs/haros-guidebook-plan.md | awk '{print $1}')"
echo "worktree_begin"
git status --short
echo "worktree_end"
echo "bootstrap=PASS"
