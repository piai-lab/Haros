#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const guideRoot = resolve(scriptRoot, "..");
const repositoryRoot = resolve(guideRoot, "../..");
const generatedRoot = join(guideRoot, "assets/generated");
const capturesRoot = join(guideRoot, "assets/captures");

function fail(message) {
  throw new Error(message);
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repositoryRoot, encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    fail(`${command} ${args.join(" ")} failed`);
  }
  process.stdout.write(result.stdout);
}

function frontMatter(path) {
  const source = readFileSync(path, "utf8");
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) fail(`missing front matter: ${relative(repositoryRoot, path)}`);
  return { source, metadata: match[1] };
}

function scalar(metadata, key, path) {
  const match = metadata.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) fail(`missing ${key}: ${relative(repositoryRoot, path)}`);
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

function optionalScalar(metadata, key) {
  const match = metadata.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : null;
}

function assertExactSet(actual, expected, label) {
  const missing = [...expected].filter((value) => !actual.has(value)).sort();
  const unexpected = [...actual].filter((value) => !expected.has(value)).sort();
  if (missing.length || unexpected.length) {
    fail(`${label} drift: missing=${missing.join(",")} unexpected=${unexpected.join(",")}`);
  }
}

run("node", [
  join(scriptRoot, "validate-run2.mjs"),
  "--through=46",
  "--expected-generated=116",
  "--expected-captures=18",
  "--scope=run4-base",
]);
run("python3", [join(scriptRoot, "trim-generated-rasters.py"), "--check"]);
run("python3", [join(scriptRoot, "validate-run4-raster-text.py")]);
run("node", [join(scriptRoot, "sync-visual-truth.mjs")]);

const expectedRun4Slots = new Set([
  "part-06-opener.jpg",
  ...[35, 36].flatMap((chapter) => [`ch-${chapter}-primary.jpg`, `ch-${chapter}-secondary.jpg`]),
  ...[38, 42].flatMap((chapter) => [
    `ch-${chapter}-primary.jpg`,
    `ch-${chapter}-secondary.jpg`,
    `ch-${chapter}-extra.jpg`,
  ]),
  ...[39, 40, 41].flatMap((chapter) => [
    `ch-${chapter}-primary.jpg`,
    `ch-${chapter}-secondary.jpg`,
  ]),
  ...[43, 44, 45, 46].flatMap((chapter) => [
    `ch-${chapter}-primary.jpg`,
    `ch-${chapter}-secondary.jpg`,
    `ch-${chapter}-extra.jpg`,
  ]),
]);
if (expectedRun4Slots.size !== 29)
  fail(`internal Run 4 slot count drift: ${expectedRun4Slots.size}`);

const actualRun4Slots = new Set();
for (const name of readdirSync(generatedRoot).filter((name) => name.endsWith(".md"))) {
  const path = join(generatedRoot, name);
  const { source, metadata } = frontMatter(path);
  if (optionalScalar(metadata, "candidate_epoch") !== "run-4-parts-v-vi") continue;
  const mediaName = scalar(metadata, "file", path);
  actualRun4Slots.add(mediaName);
  const count = Number.parseInt(scalar(metadata, "candidate_count", path), 10);
  if (!Number.isInteger(count) || count < 1 || count > 3) {
    fail(`Run 4 rendered-output cap failed (${count}): ${name}`);
  }
  for (const key of [
    "accepted_attempt",
    "acceptance_exact_text",
    "acceptance_relationships",
    "acceptance_no_unrequested_text",
    "capitalization_verdict",
    "visual_truth_verdict",
    "forbidden_family_check",
  ]) {
    if (!scalar(metadata, key, path).startsWith("PASS") && key !== "accepted_attempt") {
      fail(`Run 4 ${key} is not PASS: ${name}`);
    }
  }
  if (!source.includes("Rejected candidates are not canonical assets.")) {
    fail(`Run 4 rejected-output boundary is missing: ${name}`);
  }
}
assertExactSet(actualRun4Slots, expectedRun4Slots, "Run 4 generated allocation");

const expectedCaptureIds = new Set([
  "capture-15-engine-settings",
  "capture-16-capability-settings",
  "capture-17-connection-settings",
  "capture-18-recovery-settings",
]);
const actualCaptureIds = new Set();
for (const id of expectedCaptureIds) {
  const path = join(capturesRoot, `${id}.md`);
  if (!existsSync(path)) fail(`missing Run 4 capture sidecar: ${id}`);
  const { metadata } = frontMatter(path);
  actualCaptureIds.add(scalar(metadata, "capture_id", path));
  if (
    scalar(metadata, "sanitization", path) !== "PASS-no-real-user-data-no-credentials-no-endpoints"
  ) {
    fail(`Run 4 capture sanitization drift: ${id}`);
  }
}
assertExactSet(actualCaptureIds, expectedCaptureIds, "Run 4 capture allocation");

const palette = spawnSync(
  "python3",
  [join(scriptRoot, "validate-generated-palette.py"), "--json"],
  { cwd: repositoryRoot, encoding: "utf8" },
);
if (palette.status !== 0) {
  process.stderr.write(palette.stderr);
  fail("Run 4 palette validation failed");
}
const metrics = JSON.parse(palette.stdout);
const run4Metrics = metrics.filter(({ file }) => expectedRun4Slots.has(file));
if (run4Metrics.length !== 29) fail(`Run 4 palette metric count drift: ${run4Metrics.length}`);
for (const metric of run4Metrics) {
  if (metric.semantic_red_fraction > metric.maximum_run4_red_fraction) {
    fail(`Run 4 semantic red cap drift: ${metric.file}`);
  }
}

const openerPath = join(generatedRoot, "part-06-opener.md");
const { metadata: opener } = frontMatter(openerPath);
for (const key of [
  "pre_normalization_sha256",
  "post_normalization_pre_crop_sha256",
  "normalization_rule",
  "normalization_pixels",
  "normalization_outside_bbox_diff_pixels",
  "red_fraction_before",
  "red_fraction_after",
  "amber_fraction_before",
  "amber_fraction_after",
])
  scalar(opener, key, openerPath);
if (scalar(opener, "normalization_outside_bbox_diff_pixels", openerPath) !== "0") {
  fail("Part VI opener palette normalization changed pixels outside the approved bbox");
}
if (Number.parseFloat(scalar(opener, "red_fraction_after", openerPath)) !== 0) {
  fail("Part VI opener palette normalization left measured semantic red");
}

const truthPath = join(guideRoot, "assets/parts-05-06-visual-truth.md");
const truth = readFileSync(truthPath, "utf8");
const truthRows = truth.split("\n").filter((line) => /^\|\s*`[^`]+`\s*\|/.test(line));
if (truthRows.length !== 29) fail(`Run 4 truth-sheet row count drift: ${truthRows.length}`);
for (const slot of expectedRun4Slots) {
  const name = slot.replace(/\.jpg$/, "");
  const row = truthRows.find((line) => line.includes(`\`${name}\``));
  if (!row || !row.includes("PASS")) fail(`Run 4 truth-sheet verdict missing: ${name}`);
  const digest = createHash("sha256")
    .update(readFileSync(join(generatedRoot, slot)))
    .digest("hex")
    .slice(0, 12);
  if (!row.includes(digest)) fail(`Run 4 truth-sheet hash drift: ${name}`);
}

console.log(
  "run4-validation=PASS chapters=46 run4_chapters=12 tables=168 generated_new=29 generated_total=116 captures_new=4 captures_total=18 red_cap=PASS truth_rows=29",
);
