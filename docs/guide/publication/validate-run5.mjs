#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { completeReadingOrder, synchronizeNavigation } from "./sync-navigation.mjs";

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const canonicalGuideRoot = resolve(scriptRoot, "..");
const guideRoot = process.env.GUIDEBOOK_ROOT_OVERRIDE
  ? resolve(process.env.GUIDEBOOK_ROOT_OVERRIDE)
  : canonicalGuideRoot;
const repositoryRoot = resolve(canonicalGuideRoot, "../..");
const generatedRoot = join(guideRoot, "assets/generated");
const capturesRoot = join(guideRoot, "assets/captures");
const fixtureMode = guideRoot !== canonicalGuideRoot;
const epoch = "run-5-part-vii-appendices";

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

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
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

function list(metadata, key, path) {
  const lines = metadata.split("\n");
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start === -1) fail(`missing ${key}: ${relative(repositoryRoot, path)}`);
  const values = [];
  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^\s+-\s+(.+)$/);
    if (!match) break;
    values.push(match[1].trim().replace(/^['"]|['"]$/g, ""));
  }
  return values;
}

function wordCount(source) {
  return source
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/[`*_>#|[\](){}]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function tableCount(source) {
  return (source.match(/^\|.*-{3}/gm) ?? []).length;
}

function assertExactSet(actual, expected, label) {
  const missing = [...expected].filter((value) => !actual.has(value)).sort();
  const unexpected = [...actual].filter((value) => !expected.has(value)).sort();
  if (missing.length || unexpected.length) {
    fail(`${label} drift: missing=${missing.join(",")} unexpected=${unexpected.join(",")}`);
  }
}

const order = completeReadingOrder();
if (order.length !== 59 || order[0].path !== "00-preface.md") {
  fail(
    `complete reading order drift: expected Preface plus 50 chapters and 8 appendices, found ${order.length}`,
  );
}
const chapterItems = order.slice(1, 51);
const appendixItems = order.slice(51);
if (chapterItems.length !== 50 || appendixItems.length !== 8)
  fail("chapter/appendix partition drift");
if (process.argv.includes("--print-sources")) {
  process.stdout.write(`${order.map(({ path }) => path).join("\n")}\n`);
  process.exit(0);
}
if (!fixtureMode) {
  run("node", [join(scriptRoot, "validate-run4.mjs")]);
  run("node", [
    join(scriptRoot, "validate-run2.mjs"),
    "--through=50",
    "--expected-generated=126",
    "--expected-captures=18",
    "--scope=run5-base",
  ]);
  run("python3", [join(scriptRoot, "trim-generated-rasters.py"), "--check"]);
  run("python3", [join(scriptRoot, "validate-run5-raster-text.py")]);
  run("node", [join(scriptRoot, "sync-visual-truth.mjs")]);
}
const appendixLetters = "ABCDEFGH";
for (const [index, item] of appendixItems.entries()) {
  if (!item.title.startsWith(`Appendix ${appendixLetters[index]} —`)) {
    fail(`appendix order drift at ${appendixLetters[index]}`);
  }
}

const sourcePaths = [
  join(guideRoot, "README.md"),
  ...order.map(({ path }) => join(guideRoot, path)),
];
for (const [sourceIndex, path] of sourcePaths.entries()) {
  if (!existsSync(path)) fail(`missing publication source: ${relative(guideRoot, path)}`);
  const { source, metadata } = frontMatter(path);
  if (scalar(metadata, "edition_commit", path) !== "17b578d3c65d72113accc17200b9b290f80139f6") {
    fail(`edition commit drift: ${relative(guideRoot, path)}`);
  }
  if (/\p{Script=Han}/u.test(source))
    fail(`English-only source contains Han text: ${relative(guideRoot, path)}`);
  if (sourceIndex >= 2) {
    for (const anchor of list(metadata, "source_anchors", path)) {
      if (/^https?:/.test(anchor)) continue;
      const owner = anchor.split("#", 1)[0];
      if (!existsSync(join(repositoryRoot, owner)))
        fail(`missing source anchor ${anchor}: ${relative(guideRoot, path)}`);
    }
  }
}

let chapterTables = 0;
let partSevenTables = 0;
for (const [index, item] of chapterItems.entries()) {
  const path = join(guideRoot, item.path);
  const { source } = frontMatter(path);
  const words = wordCount(source);
  const tables = tableCount(source);
  if (words < 2500 || words > 3500) fail(`Chapter ${index + 1} word target failed: ${words}`);
  if (tables < 3 || tables > 4) fail(`Chapter ${index + 1} table target failed: ${tables}`);
  chapterTables += tables;
  if (index >= 46) partSevenTables += tables;
}
if (chapterTables !== 181 || partSevenTables !== 13) {
  fail(`chapter table count drift: all=${chapterTables} part-vii=${partSevenTables}`);
}

let appendixTables = 0;
const appendixFigureCounts = new Map();
for (const [index, item] of appendixItems.entries()) {
  const path = join(guideRoot, item.path);
  const { source, metadata } = frontMatter(path);
  const letter = appendixLetters[index];
  if (scalar(metadata, "appendix", path) !== letter || /^chapter:/m.test(metadata)) {
    fail(`appendix identity drift: ${item.path}`);
  }
  appendixTables += tableCount(source);
  appendixFigureCounts.set(
    letter,
    new Set(
      [...source.matchAll(/assets\/generated\/(appendix-[A-H]-\d\d\.jpg)/g)].map(
        (match) => match[1],
      ),
    ).size,
  );
}
if (appendixTables !== 18) fail(`appendix purposeful table count drift: ${appendixTables}`);
const expectedAppendixFigures = new Map([
  ["A", 2],
  ["B", 3],
  ["C", 2],
  ["D", 2],
  ["E", 1],
  ["F", 2],
  ["G", 1],
  ["H", 1],
]);
for (const [letter, count] of expectedAppendixFigures) {
  if (appendixFigureCounts.get(letter) !== count)
    fail(`Appendix ${letter} figure allocation drift`);
}
const readmeTables = tableCount(readFileSync(join(guideRoot, "README.md"), "utf8"));
const prefaceTables = tableCount(readFileSync(join(guideRoot, "00-preface.md"), "utf8"));
const sourceTables = chapterTables + appendixTables + readmeTables + prefaceTables;
if (sourceTables !== 200 || sourceTables < 160 || sourceTables > 220) {
  fail(`whole-book source table count drift: ${sourceTables}`);
}

const expectedRun5Slots = new Set([
  "cover-01.jpg",
  "part-07-opener.jpg",
  ...[47, 48, 49, 50].flatMap((chapter) => [
    `ch-${chapter}-primary.jpg`,
    `ch-${chapter}-secondary.jpg`,
  ]),
  "appendix-A-01.jpg",
  "appendix-A-02.jpg",
  "appendix-B-01.jpg",
  "appendix-B-02.jpg",
  "appendix-B-03.jpg",
  "appendix-C-01.jpg",
  "appendix-C-02.jpg",
  "appendix-D-01.jpg",
  "appendix-D-02.jpg",
  "appendix-E-01.jpg",
  "appendix-F-01.jpg",
  "appendix-F-02.jpg",
  "appendix-G-01.jpg",
  "appendix-H-01.jpg",
]);
if (expectedRun5Slots.size !== 24) fail("internal Run 5 slot contract drift");

const actualRun5Slots = new Set();
let renderedOutputs = 0;
let rejectedOutputs = 0;
const anchorOwners = new Map();
for (const name of readdirSync(generatedRoot).filter((entry) => entry.endsWith(".md"))) {
  const path = join(generatedRoot, name);
  const { source, metadata } = frontMatter(path);
  if (optionalScalar(metadata, "candidate_epoch") !== epoch) continue;
  const file = scalar(metadata, "file", path);
  actualRun5Slots.add(file);
  const raster = join(generatedRoot, file);
  if (!existsSync(raster) || sha256(raster) !== scalar(metadata, "sha256", path)) {
    fail(`Run 5 raster checksum drift: ${file}`);
  }
  const count = Number.parseInt(scalar(metadata, "candidate_count", path), 10);
  const accepted = Number.parseInt(scalar(metadata, "accepted_attempt", path), 10);
  if (!Number.isInteger(count) || count < 1 || count > 3 || accepted !== count) {
    fail(`Run 5 attempt contract drift: ${file}`);
  }
  renderedOutputs += count;
  rejectedOutputs += count - 1;
  for (const key of [
    "acceptance_exact_text",
    "acceptance_relationships",
    "acceptance_no_unrequested_text",
    "capitalization_verdict",
    "visual_truth_verdict",
    "density_style_verdict",
    "forbidden_family_check",
    "crop_verdict",
  ]) {
    if (!scalar(metadata, key, path).startsWith("PASS")) fail(`Run 5 ${key} drift: ${file}`);
  }
  if (!source.includes("Rejected candidates are not canonical assets.")) {
    fail(`Run 5 rejected-candidate boundary missing: ${file}`);
  }
  const anchor = optionalScalar(metadata, "anchor_id");
  if (anchor && anchor !== "null") anchorOwners.set(anchor, file);
}
assertExactSet(actualRun5Slots, expectedRun5Slots, "Run 5 generated allocation");
if (renderedOutputs !== 28 || rejectedOutputs !== 4) {
  fail(`Run 5 attempt history drift: outputs=${renderedOutputs} rejected=${rejectedOutputs}`);
}
assertExactSet(
  new Set([...anchorOwners].map(([anchor, file]) => `${anchor}:${file}`)),
  new Set([
    "G01:cover-01.jpg",
    "G24:ch-49-primary.jpg",
    "G25:ch-50-primary.jpg",
    "G26:appendix-H-01.jpg",
  ]),
  "Run 5 figure anchor ownership",
);

const generatedJpegs = new Set(readdirSync(generatedRoot).filter((name) => name.endsWith(".jpg")));
const generatedSidecars = new Set(
  readdirSync(generatedRoot).filter((name) => name.endsWith(".md")),
);
if (generatedJpegs.size !== 140 || generatedSidecars.size !== 140) {
  fail(
    `canonical generated inventory drift: jpg=${generatedJpegs.size} sidecars=${generatedSidecars.size}`,
  );
}
const allSource = sourcePaths.map((path) => readFileSync(path, "utf8")).join("\n");
const generatedRefs = new Set(
  [...allSource.matchAll(/assets\/generated\/([^\s)]+\.jpg)/g)].map((match) => match[1]),
);
assertExactSet(generatedRefs, generatedJpegs, "source/canonical generated references");
const capturePngs = new Set(readdirSync(capturesRoot).filter((name) => name.endsWith(".png")));
const captureRefs = new Set(
  [...allSource.matchAll(/assets\/captures\/([^\s)]+\.png)/g)].map((match) => match[1]),
);
if (capturePngs.size !== 18) fail(`capture inventory drift: ${capturePngs.size}`);
assertExactSet(captureRefs, capturePngs, "source/canonical capture references");

const coverPath = join(generatedRoot, "cover-01.md");
const { metadata: cover } = frontMatter(coverPath);
const coverRaster = join(generatedRoot, "cover-01.jpg");
const brandPath = join(repositoryRoot, scalar(cover, "canonical_brand_asset", coverPath));
if (
  scalar(cover, "reserved_region", coverPath) !== "upper-third" ||
  scalar(cover, "generated_field_sha256", coverPath) !==
    "18e8efcd54da10fd10f7fbebd1622129e2a11838b92b85d90582f90db2b076fc" ||
  scalar(cover, "generated_field_path", coverPath) !==
    "assets/generated/sources/cover-01-field.png" ||
  scalar(cover, "composition_recipe", coverPath) !==
    "assets/generated/sources/cover-01-composition.json" ||
  scalar(cover, "composition_script", coverPath) !== "publication/compose-cover.mjs" ||
  scalar(cover, "mark_layer_sha256", coverPath) !==
    "9baa4d5888ee1ed38a512934edadb5c2cab349b72bb8a0b1678c7e4a51380376" ||
  scalar(cover, "wordmark_layer_sha256", coverPath) !==
    "d3cd39baa49a6da3c494e358ac32ada0e44171e7425add5bbc923ac1231b4264" ||
  scalar(cover, "runtime_font_dependency", coverPath) !==
    "none-repo-bound-transparent-wordmark-layer" ||
  !existsSync(brandPath) ||
  sha256(brandPath) !== scalar(cover, "canonical_brand_sha256", coverPath) ||
  sha256(coverRaster) !== "c073234de73ff85ae972cdd46ded9e5bf89d0c5f76ae3d3f63f9976b9bc02779"
)
  fail("cover deterministic composition contract drift");
const requestedCoverText = list(cover, "pre_generation_requested_text", coverPath);
const exactCoverText = list(cover, "exact_text", coverPath);
if (
  requestedCoverText.join("|") !==
    "A Visual Guide from First Task to Runtime Architecture|Source alpha edition" ||
  exactCoverText.join("|") !==
    "Haros Guidebook|A Visual Guide from First Task to Runtime Architecture|Source alpha edition"
)
  fail("cover generated-field/final-pixel text boundary drift");
run("node", [
  join(scriptRoot, "validate-cover-composition.mjs"),
  "--guide-root",
  guideRoot,
  "--repository-root",
  repositoryRoot,
]);

const descriptorSource = readFileSync(
  join(repositoryRoot, "packages/shared/src/engineMetadata.ts"),
  "utf8",
);
const descriptorBlock = descriptorSource.match(
  /ENGINE_DESCRIPTORS\s*=\s*defineEngineDescriptors\(\[([\s\S]*?)\]\s+as const/,
);
if (!descriptorBlock) fail("cannot derive ENGINE_DESCRIPTORS");
const descriptors = [
  ...descriptorBlock[1].matchAll(/kind:\s*"([^"]+)"[\s\S]*?displayName:\s*"([^"]+)"/g),
].map(([, kind, display]) => ({ kind, display }));
if (descriptors.length !== 10) fail(`descriptor derivation count drift: ${descriptors.length}`);
const appendixC = readFileSync(join(guideRoot, appendixItems[2].path), "utf8");
const matrixRows = [
  ...appendixC.matchAll(/^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/gm),
].map(([, orderValue, kind, display]) => ({
  order: Number(orderValue),
  kind,
  display: display.trim(),
}));
if (
  matrixRows.length !== descriptors.length ||
  matrixRows.some(
    (row, index) =>
      row.order !== index + 1 ||
      row.kind !== descriptors[index].kind ||
      row.display !== descriptors[index].display,
  )
)
  fail("Appendix C descriptor-derived identity rows drift");

const appendixD = readFileSync(join(guideRoot, appendixItems[3].path), "utf8");
function tableTokensAfterHeading(heading) {
  const start = appendixD.indexOf(heading);
  if (start === -1) fail(`Appendix D heading missing: ${heading}`);
  const lines = appendixD.slice(start).split("\n").slice(1);
  const table = [];
  let started = false;
  for (const line of lines) {
    if (line.startsWith("|")) {
      started = true;
      table.push(line);
    } else if (started) break;
  }
  return new Set(
    [...table.join("\n").matchAll(/`([a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+)`/g)].map(
      (match) => match[1],
    ),
  );
}
const commandCount = tableTokensAfterHeading("## Public Product Orchestration commands").size;
const productEventCount = tableTokensAfterHeading("## Durable Product event types").size;
const runtimeEventCount = tableTokensAfterHeading("## Normalized native Engine events").size;
if (commandCount !== 34 || productEventCount !== 41 || runtimeEventCount !== 51) {
  fail(
    `Appendix D contract index drift: commands=${commandCount} product=${productEventCount} runtime=${runtimeEventCount}`,
  );
}

const appendixE = readFileSync(join(guideRoot, appendixItems[4].path), "utf8");
const sourceRows = [
  ...appendixE.matchAll(/^\|\s*(\d+)\s*\|[^\n]*?`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/gm),
];
if (sourceRows.length !== 50 || sourceRows.some((match, index) => Number(match[1]) !== index + 1)) {
  fail(`Appendix E chapter/source row drift: ${sourceRows.length}`);
}
for (const row of sourceRows) {
  for (const path of [row[2], row[3]]) {
    if (!existsSync(join(repositoryRoot, path))) fail(`Appendix E source path missing: ${path}`);
  }
  if (/\.test\.[cm]?[jt]sx?$|\.integration\.test\.[cm]?[jt]sx?$/.test(row[2])) {
    fail(`Appendix E test-as-owner drift: Chapter ${row[1]} owner=${row[2]}`);
  }
}
const chapter15Row = sourceRows[14];
if (
  chapter15Row[2] !== "packages/contracts/src/orchestration.ts" ||
  chapter15Row[2].includes("workLog")
) {
  fail("Appendix E Chapter 15 canonical owner drift");
}
const chapter15Section = appendixE.match(
  /### Chapter 15 owner set and presentation consumer([\s\S]*?)### Chapter 47 four-subdomain routes/,
)?.[1];
for (const required of [
  "packages/contracts/src/orchestration.ts",
  "packages/contracts/src/orchestration.test.ts",
  "apps/server/src/orchestration/decider.ts",
  "apps/server/src/orchestration/decider.projectScripts.test.ts",
  "apps/server/src/orchestration/projector.ts",
  "apps/server/src/orchestration/projector.test.ts",
  "apps/web/src/workLog.ts",
  "apps/web/src/workLog.test.ts",
  "Read-only presentation consumer",
  "never a second event model",
]) {
  if (!chapter15Section?.includes(required))
    fail(`Appendix E Chapter 15 route missing: ${required}`);
}
const chapter47Section = appendixE.match(
  /### Chapter 47 four-subdomain routes([\s\S]*?)## How to follow a source anchor/,
)?.[1];
for (const required of [
  "apps/server/src/diagnostics/Layers/ThreadDiagnosticsQuery.ts",
  "apps/server/src/diagnostics/Layers/ThreadDiagnosticsQuery.integration.test.ts",
  "apps/server/src/engineUsage/registry.ts",
  "apps/server/src/engineUsage/registry.test.ts",
  "apps/server/src/usageHistory/UsageHistory.ts",
  "apps/server/src/usageHistory/UsageHistory.integration.test.ts",
  "apps/server/src/profileStats.ts",
  "apps/server/src/profileStats.integration.test.ts",
  "apps/server/src/profileStatsArchive.ts",
  "apps/server/src/profileStatsArchive.integration.test.ts",
  "apps/server/src/threadRetention.ts",
  "apps/server/src/threadRetention.test.ts",
  "apps/server/src/managedWorktrees.integration.test.ts",
  "apps/server/src/engine/engineMaintenance.ts",
  "apps/server/src/engine/engineMaintenanceCommandCoordinator.ts",
  "apps/server/src/engine/engineMaintenance.integration.test.ts",
]) {
  if (!chapter47Section?.includes(required))
    fail(`Appendix E Chapter 47 route missing: ${required}`);
}

const appendixB = readFileSync(join(guideRoot, appendixItems[1].path), "utf8");
const pendingInteractionRecovery =
  "Recovery must preserve the lifecycle generation and response command identity. The `Uncertain`\n" +
  "  branch points to `Reconcile` before any new side effect, never to `Assume success` or\n" +
  "  `Repeat effect`.";
if (
  !appendixB.includes(pendingInteractionRecovery) ||
  /command<code>\. The<\/code>Uncertain|TheUncertainbranch|command`\. The `Uncertain`branch/.test(
    appendixB,
  )
) {
  fail("Appendix B pending-interaction formatted-text drift");
}

const readme = readFileSync(join(guideRoot, "README.md"), "utf8");
if (!readme.includes("Preface → Chapters 1–50 → Appendices A–H"))
  fail("README sole-order statement drift");
const chapter46 = readFileSync(join(guideRoot, chapterItems[45].path), "utf8");
if (
  !chapter46.includes(
    "[Next: Diagnostics, Usage, Retention, and Maintenance](../part-07-contributing/47-diagnostics-usage-retention-maintenance.md)",
  )
) {
  fail("Chapter 46 to Chapter 47 navigation drift");
}

if (fixtureMode) synchronizeNavigation("check");

console.log(
  `run5-validation=PASS chapters=50 appendices=8 source_tables=${sourceTables} chapter_tables=${chapterTables} appendix_tables=${appendixTables} readme_tables=${readmeTables} generated_new=24 generated_total=140 captures_total=18 outputs=28 rejected=4 commands=34 product_events=41 runtime_events=51`,
);
