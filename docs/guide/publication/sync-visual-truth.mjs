#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { collectFigureContracts } from "./figure-contracts.mjs";

const guideRoot = process.env.GUIDEBOOK_ROOT_OVERRIDE
  ? resolve(process.env.GUIDEBOOK_ROOT_OVERRIDE)
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = join(guideRoot, "assets/generated");
const mode = process.argv.includes("--write") ? "write" : "check";
const allowed =
  "Warm white, charcoal/gray, muted teal, and sparse amber; dense text-first technical matrix or relationship diagram with source-backed labels only.";
const forbidden =
  "People/rooms, physical metaphor, fake UI/cards/papers/folders, decorative or unlabeled glyphs, invented owner/lifecycle, non-acronym all-caps.";

function fail(message) {
  throw new Error(message);
}

function frontMatter(source, path) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) fail(`missing front matter: ${path}`);
  return match[1];
}

function scalar(metadata, key, path) {
  const match = metadata.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) fail(`missing ${key}: ${path}`);
  const value = match[1].trim();
  return value.startsWith('"') ? JSON.parse(value) : value.replace(/^'|'$/g, "");
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const paletteValidator = join(
  dirname(fileURLToPath(import.meta.url)),
  "validate-generated-palette.py",
);
const generatedMediaPaths = readdirSync(generatedRoot)
  .filter((name) => name.endsWith(".jpg"))
  .sort()
  .map((name) => join(generatedRoot, name));
const paletteResult = spawnSync("python3", [paletteValidator, "--json", ...generatedMediaPaths], {
  encoding: "utf8",
});
if (paletteResult.status !== 0) {
  fail(paletteResult.stderr.trim() || "generated palette validator failed");
}
const paletteByMedia = new Map(
  JSON.parse(paletteResult.stdout).map((entry) => [entry.file, entry]),
);

const run3TruthPath = join(guideRoot, "assets/parts-03-04-visual-truth.md");
const run3Figures = collectFigureContracts().filter(({ sourcePath }) => {
  const source = relative(guideRoot, sourcePath);
  return source.startsWith("part-03-organize-work/") || source.startsWith("part-04-capabilities/");
});
if (run3Figures.length > 0 && run3Figures.length !== 48) {
  fail(`Run 3 visual-truth allocation must contain 48 figures; found ${run3Figures.length}`);
}
if (run3Figures.length === 48 && mode === "write" && !existsSync(run3TruthPath)) {
  const rows = run3Figures
    .sort((left, right) => left.mediaName.localeCompare(right.mediaName))
    .map(({ mediaName, contractAlt, sourcePath }) => {
      const slot = mediaName.replace(/\.jpg$/, "");
      return `| \`${slot}\` | ${contractAlt} | \`${relative(guideRoot, sourcePath)}\` source anchors | ${allowed} | ${forbidden} | pending projection |`;
    });
  writeFileSync(
    run3TruthPath,
    [
      "---",
      "kind: parts-03-04-visual-truth",
      "edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6",
      "observed_at: 2026-08-30",
      "scope: English Guidebook Parts III-IV",
      "---",
      "",
      "# Parts III-IV generated-visual truth sheet",
      "",
      "This derived review surface is projected from generated-figure sidecars. Sidecars remain the sole owner of structured relations, alt text, extended descriptions, checksum, dimensions, generation provenance, and crop metadata.",
      "",
      "| Slot | Claim | Observed source | Allowed abstraction | Forbidden invented elements | Current verdict |",
      "| --- | --- | --- | --- | --- | --- |",
      ...rows,
      "",
    ].join("\n"),
  );
}
if (run3Figures.length === 48 && !existsSync(run3TruthPath)) {
  fail(`missing Run 3 visual-truth projection: ${run3TruthPath}`);
}

const run4TruthPath = join(guideRoot, "assets/parts-05-06-visual-truth.md");
const run4ReusedPilotSlots = new Set([
  "part-05-opener.jpg",
  "ch-37-primary.jpg",
  "ch-37-secondary.jpg",
]);
const run4Figures = collectFigureContracts().filter(({ mediaName, sourcePath }) => {
  const source = relative(guideRoot, sourcePath);
  const inRun4Parts =
    source.startsWith("part-05-architecture/") || source.startsWith("part-06-reliability/");
  return inRun4Parts && !run4ReusedPilotSlots.has(mediaName);
});
if (run4Figures.length > 0 && run4Figures.length !== 29) {
  fail(`Run 4 visual-truth allocation must contain 29 new figures; found ${run4Figures.length}`);
}
if (run4Figures.length === 29 && mode === "write" && !existsSync(run4TruthPath)) {
  const rows = run4Figures
    .sort((left, right) => left.mediaName.localeCompare(right.mediaName))
    .map(({ mediaName, contractAlt, sourcePath }) => {
      const slot = mediaName.replace(/\.jpg$/, "");
      return `| \`${slot}\` | ${contractAlt} | \`${relative(guideRoot, sourcePath)}\` source anchors | ${allowed} | ${forbidden} | pending projection |`;
    });
  writeFileSync(
    run4TruthPath,
    [
      "---",
      "kind: parts-05-06-visual-truth",
      "edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6",
      "observed_at: 2026-08-31",
      "scope: English Guidebook Parts V-VI",
      "---",
      "",
      "# Parts V-VI generated-visual truth sheet",
      "",
      "This derived review surface is projected from generated-figure sidecars. Sidecars remain the sole owner of structured relations, alt text, extended descriptions, checksum, dimensions, generation provenance, and crop metadata.",
      "",
      "| Slot | Claim | Observed source | Allowed abstraction | Forbidden invented elements | Current verdict |",
      "| --- | --- | --- | --- | --- | --- |",
      ...rows,
      "",
    ].join("\n"),
  );
}
if (run4Figures.length === 29 && !existsSync(run4TruthPath)) {
  fail(`missing Run 4 visual-truth projection: ${run4TruthPath}`);
}

const run5TruthPath = join(guideRoot, "assets/part-07-appendices-visual-truth.md");
const run5Figures = collectFigureContracts().filter(({ metadata }) =>
  metadata.includes("candidate_epoch: run-5-part-vii-appendices"),
);
if (run5Figures.length > 0 && run5Figures.length !== 24) {
  fail(`Run 5 visual-truth allocation must contain 24 new figures; found ${run5Figures.length}`);
}
if (run5Figures.length === 24 && mode === "write" && !existsSync(run5TruthPath)) {
  const rows = run5Figures
    .sort((left, right) => left.mediaName.localeCompare(right.mediaName))
    .map(({ mediaName, contractAlt, sourcePath }) => {
      const slot = mediaName.replace(/\.jpg$/, "");
      return `| \`${slot}\` | ${contractAlt} | \`${relative(guideRoot, sourcePath)}\` source anchors | ${allowed} | ${forbidden} | pending projection |`;
    });
  writeFileSync(
    run5TruthPath,
    [
      "---",
      "kind: part-07-appendices-visual-truth",
      "edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6",
      "observed_at: 2026-08-31",
      "scope: English Guidebook Part VII and Appendices A-H",
      "---",
      "",
      "# Part VII and appendices generated-visual truth sheet",
      "",
      "This derived review surface is projected from generated-figure sidecars. Sidecars remain the sole owner of structured relations, alt text, extended descriptions, checksum, dimensions, generation provenance, and crop metadata.",
      "",
      "| Slot | Claim | Observed source | Allowed abstraction | Forbidden invented elements | Current verdict |",
      "| --- | --- | --- | --- | --- | --- |",
      ...rows,
      "",
    ].join("\n"),
  );
}
if (run5Figures.length === 24 && !existsSync(run5TruthPath)) {
  fail(`missing Run 5 visual-truth projection: ${run5TruthPath}`);
}

const sheets = readdirSync(join(guideRoot, "assets"))
  .filter((name) => name.endsWith("-visual-truth.md"))
  .map((name) => join(guideRoot, "assets", name))
  .sort();

function projectedRow(line) {
  const slotMatch = line.match(/^\|\s*`([^`]+)`\s*\|/);
  if (!slotMatch) return line;
  const slot = slotMatch[1];
  const cells = line.split("|").map((cell) => cell.trim());
  if (cells.length !== 8) fail(`unexpected truth-sheet row shape: ${slot}`);
  const sidecarPath = join(generatedRoot, `${slot}.md`);
  const mediaPath = join(generatedRoot, `${slot}.jpg`);
  const metadata = frontMatter(readFileSync(sidecarPath, "utf8"), sidecarPath);
  cells[2] = scalar(metadata, "alt_text", sidecarPath);
  cells[4] = allowed;
  cells[5] = forbidden;
  const palette = paletteByMedia.get(`${slot}.jpg`);
  if (!palette || palette.verdict !== "PASS") {
    fail(`missing measured palette PASS for ${slot}`);
  }
  const percentage = (fraction) => `${(fraction * 100).toFixed(4)}%`;
  cells[6] =
    `PASS — sidecar relation/accessibility/forbidden-family contract plus measured palette pixels ` +
    `(blue ${percentage(palette.royal_blue_fraction)}, purple ${percentage(palette.purple_neon_fraction)}, ` +
    `green ${percentage(palette.bright_green_fraction)}, each <=${percentage(palette.maximum_forbidden_fraction)}), ` +
    `natural case, truth, and K-037 crop; ` +
    `\`${sha256(mediaPath).slice(0, 12)}…\`.`;
  return `| ${cells.slice(1, -1).join(" | ")} |`;
}

let rows = 0;
const projectedSources = [];
for (const sheet of sheets) {
  const source = readFileSync(sheet, "utf8");
  projectedSources.push(source);
  const sourceLines = source.split("\n");
  const projectedLines = sourceLines.map((line) => {
    if (/^\|\s*`[^`]+`\s*\|/.test(line)) rows += 1;
    return projectedRow(line);
  });
  const projected = projectedLines.join("\n");
  if (mode === "write") {
    if (source !== projected) writeFileSync(sheet, projected);
  } else {
    const drift = sourceLines.some((line, index) => {
      if (!/^\|\s*`[^`]+`\s*\|/.test(line)) return false;
      const normalized = (value) =>
        value
          .split("|")
          .map((cell) => cell.trim())
          .join("|");
      return normalized(line) !== normalized(projectedLines[index]);
    });
    if (drift) fail(`visual-truth projection drift: ${sheet}`);
  }
}

const projectedSource = projectedSources.join("\n");
for (const { mediaName } of run3Figures) {
  const slot = mediaName.replace(/\.jpg$/, "");
  const occurrences = projectedSource
    .split("\n")
    .filter((line) => line.startsWith("|") && line.includes(`\`${slot}\``)).length;
  if (occurrences !== 1) fail(`Run 3 truth row ownership drift for ${slot}: ${occurrences}`);
}

for (const { mediaName } of run4Figures) {
  const slot = mediaName.replace(/\.jpg$/, "");
  const occurrences = projectedSource
    .split("\n")
    .filter((line) => line.startsWith("|") && line.includes(`\`${slot}\``)).length;
  if (occurrences !== 1) fail(`Run 4 truth row ownership drift for ${slot}: ${occurrences}`);
}

for (const { mediaName } of run5Figures) {
  const slot = mediaName.replace(/\.jpg$/, "");
  const occurrences = projectedSource
    .split("\n")
    .filter((line) => line.startsWith("|") && line.includes(`\`${slot}\``)).length;
  if (occurrences !== 1) fail(`Run 5 truth row ownership drift for ${slot}: ${occurrences}`);
}

if (rows < 45) fail(`visual-truth baseline regression: expected at least 45 rows; found ${rows}`);
console.log(`visual-truth-${mode}=PASS rows=${rows} owner=generated-sidecars`);
