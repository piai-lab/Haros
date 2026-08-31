#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateSourceFigureContracts } from "./figure-contracts.mjs";
import { completeReadingOrder, synchronizeNavigation } from "./sync-navigation.mjs";

const guideRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(guideRoot, "../..");
const planPath = join(repositoryRoot, "docs/haros-guidebook-plan.md");
const editionCommit = "17b578d3c65d72113accc17200b9b290f80139f6";
const verifiedPilotGenerated = new Set([
  "part-01-opener.jpg",
  "ch-03-primary.jpg",
  "ch-03-secondary.jpg",
  "ch-14-primary.jpg",
  "ch-14-secondary.jpg",
  "ch-14-extra-01.jpg",
  "part-05-opener.jpg",
  "ch-37-primary.jpg",
]);
const judgeReopenedGenerated = new Set([
  "part-01-opener.jpg",
  "ch-03-primary.jpg",
  "ch-03-secondary.jpg",
  "ch-06-primary.jpg",
  "ch-09-primary.jpg",
  "ch-14-secondary.jpg",
  "ch-37-secondary.jpg",
]);
const run3AnchorOwners = new Map([
  ["ch-18-primary.jpg", "G11"],
  ["ch-22-primary.jpg", "G12"],
  ["ch-24-primary.jpg", "G13"],
  ["part-04-opener.jpg", "G14"],
  ["ch-33-primary.jpg", "G15"],
  ["ch-34-primary.jpg", "G16"],
]);
const run3RenderedOutputWaivers = new Map([
  ["ch-18-primary.jpg", "PASS-WITH-ROOT-AUTHORIZED-ONE-TIME-WAIVER"],
]);
function numericArgument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  if (!value) return fallback;
  const parsed = Number.parseInt(value.slice(prefix.length), 10);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`invalid ${prefix} argument`);
  return parsed;
}

const throughChapter = numericArgument("through", 15);
const expectedGenerated = numericArgument("expected-generated", 36);
const expectedCaptures = numericArgument("expected-captures", 6);
const scope =
  process.argv.find((argument) => argument.startsWith("--scope="))?.slice("--scope=".length) ??
  "run2";
const chapterSources = completeReadingOrder()
  .slice(1, throughChapter + 1)
  .map(({ path }) => path);
const read = (path) => readFileSync(path, "utf8");
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fail = (message) => {
  throw new Error(message);
};

if (process.argv.includes("--print-sources")) {
  if (chapterSources.length !== throughChapter) {
    fail(
      `README has ${chapterSources.length} linked chapters through requested Chapter ${throughChapter}`,
    );
  }
  process.stdout.write(`${chapterSources.join("\n")}\n`);
  process.exit(0);
}

function frontMatter(source, path) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) fail(`missing front matter: ${relative(repositoryRoot, path)}`);
  return match[1];
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
  const keyIndex = lines.findIndex((line) => line.trim() === `${key}:`);
  if (keyIndex === -1) fail(`missing ${key}: ${relative(repositoryRoot, path)}`);
  const values = [];
  for (const line of lines.slice(keyIndex + 1)) {
    const match = line.match(/^\s+-\s+(.+)$/);
    if (!match) break;
    values.push(match[1].trim().replace(/^['"]|['"]$/g, ""));
  }
  if (values.length === 0) fail(`empty ${key}: ${relative(repositoryRoot, path)}`);
  return values;
}

const uppercaseAllowlist = new Set([
  "API",
  "CLI",
  "CPU",
  "ENGINE_DESCRIPTORS",
  "EPUB",
  "GPU",
  "HARNESSOS_HOME",
  "HTML",
  "HTTP",
  "HTTPS",
  "ID",
  "IPC",
  "JSON",
  "MCP",
  "PDF",
  "PTY",
  "RPC",
  "SDK",
  "UI",
  "URL",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
]);

function exactTextValues(metadata, path) {
  const inline = metadata.match(/^exact_text:\s*\[([^\]]*)\]\s*$/m);
  if (inline) {
    return inline[1]
      .split(",")
      .map((value) => value.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return list(metadata, "exact_text", path);
}

function forbiddenUppercaseToken(value) {
  return value
    .split(/[^A-Za-z0-9_]+/)
    .filter(Boolean)
    .find(
      (token) =>
        /[A-Za-z]/.test(token) &&
        token.length >= 3 &&
        token === token.toUpperCase() &&
        !uppercaseAllowlist.has(token),
    );
}

function normalize(value) {
  return value
    .replace(/[`*_>#|[\](){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function markdownTargets(source) {
  return [...source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]);
}

function markdownHeadingSlug(value) {
  return value
    .replace(/\{#[^}]+\}\s*$/, "")
    .replace(/[`*_~]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function validateRun3ReviewedSources(sidecarSource, sidecarName) {
  if (/^accepted_source_path:/m.test(sidecarSource)) {
    fail(`deprecated accepted_source_path field returned: ${sidecarName}`);
  }
  const reviewedLine = sidecarSource
    .split("\n")
    .find((line) => line.startsWith("Reviewed sources:"));
  if (!reviewedLine) fail(`Run 3 sidecar missing Reviewed sources: ${sidecarName}`);
  if (reviewedLine.includes("\\`")) {
    fail(`Run 3 Reviewed sources contains escaped-backtick drift: ${sidecarName}`);
  }
  const references = reviewedLine.match(
    /[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+(?:#[A-Za-z0-9_.-]+)?/g,
  );
  if (!references || references.length === 0) {
    fail(`Run 3 sidecar has no repository source locator: ${sidecarName}`);
  }
  for (const reference of references) {
    const [sourcePath, fragment] = reference.split("#", 2);
    const absolutePath = join(repositoryRoot, sourcePath);
    if (!existsSync(absolutePath)) {
      fail(`Run 3 sidecar source owner is missing (${reference}): ${sidecarName}`);
    }
    if (fragment && extname(absolutePath) === ".md") {
      const source = read(absolutePath);
      const hasFragment =
        source.includes(`{#${fragment}}`) ||
        source
          .split("\n")
          .filter((line) => /^#{1,6}\s+/.test(line))
          .some((line) => markdownHeadingSlug(line.replace(/^#{1,6}\s+/, "")) === fragment);
      if (!hasFragment) {
        fail(`Run 3 sidecar source fragment is missing (${reference}): ${sidecarName}`);
      }
    }
  }
}

function expectedRun3GeneratedSlots() {
  const plan = read(planPath);
  const allocation = plan.match(
    /The 18 additional failure and boundary figures are assigned to Chapters ([\s\S]*?)\./,
  );
  if (!allocation) fail("plan is missing the additional failure/boundary allocation");
  const extras = new Set((allocation[1].match(/\d+/g) ?? []).map(Number));
  const slots = new Set(["part-03-opener.jpg", "part-04-opener.jpg"]);
  for (let chapter = 16; chapter <= 34; chapter += 1) {
    const number = String(chapter).padStart(2, "0");
    slots.add(`ch-${number}-primary.jpg`);
    slots.add(`ch-${number}-secondary.jpg`);
    if (extras.has(chapter)) slots.add(`ch-${number}-extra-01.jpg`);
  }
  return slots;
}

function assertExactSet(actual, expected, label) {
  const missing = [...expected].filter((value) => !actual.has(value)).sort();
  const unexpected = [...actual].filter((value) => !expected.has(value)).sort();
  if (missing.length > 0 || unexpected.length > 0) {
    fail(
      `${label} allocation drift: missing=${missing.join(",")} unexpected=${unexpected.join(",")}`,
    );
  }
}

function pngDimensions(path) {
  const buffer = readFileSync(path);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    fail(`invalid PNG: ${relative(repositoryRoot, path)}`);
  }
  return `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
}

const chapterPaths = chapterSources.map((source) => join(guideRoot, source));
if (chapterPaths.length !== throughChapter) {
  fail(
    `README has ${chapterPaths.length} linked chapters through requested Chapter ${throughChapter}`,
  );
}
const publicationPaths = [
  join(guideRoot, "README.md"),
  join(guideRoot, "00-preface.md"),
  ...chapterPaths,
];

for (const path of publicationPaths) {
  if (!existsSync(path))
    fail(`missing Run 2 publication source: ${relative(repositoryRoot, path)}`);
  const source = read(path);
  const metadata = frontMatter(source, path);
  if (scalar(metadata, "edition_commit", path) !== editionCommit) {
    fail(`edition commit mismatch: ${relative(repositoryRoot, path)}`);
  }
  if (/\p{Script=Han}/u.test(source)) {
    fail(`English-only publication contains Han text: ${relative(repositoryRoot, path)}`);
  }
  for (const target of markdownTargets(source)) {
    if (/^(?:https?:|mailto:)/.test(target)) continue;
    const [targetPath, fragment] = target.split("#", 2);
    const resolvedTarget = targetPath.length > 0 ? resolve(dirname(path), targetPath) : path;
    if (!existsSync(resolvedTarget)) {
      fail(`broken local link ${target} in ${relative(repositoryRoot, path)}`);
    }
    if (fragment && extname(resolvedTarget) === ".md") {
      const targetSource = read(resolvedTarget);
      if (!targetSource.includes(`{#${fragment}}`)) {
        fail(`missing explicit anchor #${fragment} in ${relative(repositoryRoot, resolvedTarget)}`);
      }
    }
  }
}

let totalTables = 0;
for (const path of chapterPaths) {
  const source = read(path);
  const metadata = frontMatter(source, path);
  const words = wordCount(source);
  if (words < 2_500 || words > 3_500) {
    fail(`chapter word target failed (${words}): ${relative(repositoryRoot, path)}`);
  }
  const tables = (source.match(/^\| ---/gm) ?? []).length;
  totalTables += tables;
  if (tables < 3 || tables > 4) {
    fail(`chapter table target failed (${tables}): ${relative(repositoryRoot, path)}`);
  }
  for (const heading of ["## The question", "## Check your model", "## Source trail"]) {
    if (!source.includes(heading)) {
      fail(`chapter anatomy missing '${heading}': ${relative(repositoryRoot, path)}`);
    }
  }
  for (const paragraph of source
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<!-- guide-navigation:start -->[\s\S]*?<!-- guide-navigation:end -->/g, "")
    .split(/\n\s*\n/)) {
    const firstLine = paragraph.trim().split("\n", 1)[0];
    if (
      !firstLine ||
      /^(?:#{1,6}\s|\||[-*+]\s|\d+[.)]\s|`|!\[|_Figure|\*\*Accessible equivalent)/.test(firstLine)
    ) {
      continue;
    }
    const visibleStart = firstLine.replace(/^[`*_>(\[]+/, "").trimStart();
    if (/^[a-z]/.test(visibleStart)) {
      fail(`lowercase paragraph start: ${relative(repositoryRoot, path)}: ${firstLine}`);
    }
  }
  const anchors = list(metadata, "source_anchors", path);
  for (const anchor of anchors) {
    if (/^https?:/.test(anchor)) continue;
    const ownerPath = anchor.split("#", 1)[0];
    if (!ownerPath || !existsSync(join(repositoryRoot, ownerPath))) {
      fail(`missing source owner '${anchor}': ${relative(repositoryRoot, path)}`);
    }
  }
}

const longParagraphOwners = new Map();
for (const path of chapterPaths) {
  const source = read(path);
  if (/^## Reading the evidence in practice\s*$/m.test(source)) {
    fail(`Judge-rejected prose template returned: ${relative(repositoryRoot, path)}`);
  }
  const sourceTrailIndex = source.indexOf("## Source trail");
  if (sourceTrailIndex === -1)
    fail(`missing final Source trail: ${relative(repositoryRoot, path)}`);
  const afterSourceTrail = source
    .slice(sourceTrailIndex)
    .replace(/<!-- guide-navigation:start -->[\s\S]*?<!-- guide-navigation:end -->/g, "")
    .trim();
  if (/\n##\s+/.test(afterSourceTrail)) {
    fail(`authored section appears after Source trail: ${relative(repositoryRoot, path)}`);
  }
  for (const paragraph of source
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .split(/\n\s*\n/)
    .map((value) => normalize(value))
    .filter((value) => value.length >= 400)) {
    const previous = longParagraphOwners.get(paragraph);
    if (previous && previous !== path) {
      fail(
        `repeated long prose block across ${relative(repositoryRoot, previous)} and ${relative(repositoryRoot, path)}`,
      );
    }
    longParagraphOwners.set(paragraph, path);
  }
}

const allPublicationSource = publicationPaths.map(read).join("\n");
const generatedMediaInScope = (mediaName) =>
  mediaName !== "cover-01.jpg" || scope.startsWith("run5");
const generatedRefs = [
  ...allPublicationSource.matchAll(/\]\((?:\.\.\/)*assets\/generated\/([^)]+\.jpg)\)/g),
]
  .map((match) => match[1])
  .filter(generatedMediaInScope);
const captureRefs = [
  ...allPublicationSource.matchAll(/\]\((?:\.\.\/)*assets\/captures\/([^)]+\.png)\)/g),
].map((match) => match[1]);

if (
  generatedRefs.length !== expectedGenerated ||
  new Set(generatedRefs).size !== expectedGenerated
) {
  fail(
    `${scope} generated allocation mismatch: total=${generatedRefs.length}, unique=${new Set(generatedRefs).size}, expected=${expectedGenerated}`,
  );
}
if (captureRefs.length !== expectedCaptures || new Set(captureRefs).size !== expectedCaptures) {
  fail(
    `${scope} capture allocation mismatch: total=${captureRefs.length}, unique=${new Set(captureRefs).size}, expected=${expectedCaptures}`,
  );
}
if (throughChapter >= 34) {
  const run3Generated = new Set(
    generatedRefs.filter((mediaName) => {
      const chapter = /^ch-(\d+)-/.exec(mediaName)?.[1];
      const chapterNumber = chapter ? Number.parseInt(chapter, 10) : null;
      return (
        mediaName === "part-03-opener.jpg" ||
        mediaName === "part-04-opener.jpg" ||
        (chapterNumber !== null && chapterNumber >= 16 && chapterNumber <= 34)
      );
    }),
  );
  assertExactSet(run3Generated, expectedRun3GeneratedSlots(), "Run 3 generated");
  const captureNumbers = new Set(
    captureRefs.map((mediaName) =>
      Number.parseInt(/^capture-(\d+)-/.exec(mediaName)?.[1] ?? "", 10),
    ),
  );
  const expectedCaptureNumbers = new Set(
    Array.from({ length: expectedCaptures }, (_, index) => index + 1),
  );
  assertExactSet(captureNumbers, expectedCaptureNumbers, "Run 3 capture index");
}

function validateReferencedSidecars(directory, extension, mediaRefs, identityKey) {
  const identities = new Set();
  let mediaBytes = 0;
  for (const mediaName of mediaRefs) {
    const sidecarName = mediaName.replace(new RegExp(`${extension}$`), ".md");
    const sidecarPath = join(directory, sidecarName);
    const mediaPath = join(directory, mediaName);
    if (!existsSync(sidecarPath)) fail(`missing sidecar: ${relative(repositoryRoot, sidecarPath)}`);
    if (!existsSync(mediaPath)) fail(`missing media: ${relative(repositoryRoot, mediaPath)}`);
    const sidecarSource = read(sidecarPath);
    const metadata = frontMatter(sidecarSource, sidecarPath);
    const identity = scalar(metadata, identityKey, sidecarPath);
    if (identities.has(identity)) fail(`duplicate ${identityKey}: ${identity}`);
    identities.add(identity);
    if (scalar(metadata, "file", sidecarPath) !== mediaName) {
      fail(`sidecar file mismatch: ${relative(repositoryRoot, sidecarPath)}`);
    }
    if (scalar(metadata, "sha256", sidecarPath) !== sha256(mediaPath)) {
      fail(`checksum mismatch: ${relative(repositoryRoot, mediaPath)}`);
    }
    if (extension === ".jpg") {
      const model = scalar(metadata, "model", sidecarPath);
      const generationTool = scalar(metadata, "generation_tool", sidecarPath);
      const expectedTool = model === "imagegen-built-in" ? "built-in-imagegen" : model;
      if (!new Set(["imagegen-built-in", "gpt-image-2"]).has(model)) {
        fail(`unknown generation model '${model}': ${sidecarName}`);
      }
      if (generationTool !== expectedTool) {
        fail(`generation provenance mismatch: ${sidecarName}`);
      }
      for (const key of ["generation_budget_status", "size", "crop_rule", "crop_verdict"]) {
        scalar(metadata, key, sidecarPath);
      }
      const visualFamily = scalar(metadata, "visual_family", sidecarPath);
      if (
        visualFamily !== "haros-grounded-editorial-anatomy" &&
        visualFamily !== "haros-technical-editorial-diagram"
      ) {
        fail(`unknown visual family '${visualFamily}': ${sidecarName}`);
      }
      for (const value of exactTextValues(metadata, sidecarPath)) {
        const token = forbiddenUppercaseToken(value);
        if (token) {
          fail(`non-acronym ALL-CAPS token '${token}' in exact_text: ${sidecarName}`);
        }
      }
      if (statSync(mediaPath).size > 2 * 1024 * 1024) {
        fail(`generated asset exceeds 2 MB: ${relative(repositoryRoot, mediaPath)}`);
      }
      if (!sidecarSource.includes("Accessible equivalent:")) {
        fail(`generated sidecar missing accessible equivalent: ${sidecarName}`);
      }
      if ((optionalScalar(metadata, "candidate_epoch") ?? "").startsWith("run-3")) {
        validateRun3ReviewedSources(sidecarSource, sidecarName);
      }
      const expectedAnchor = run3AnchorOwners.get(mediaName);
      if (expectedAnchor && scalar(metadata, "anchor_id", sidecarPath) !== expectedAnchor) {
        fail(`Run 3 anchor owner drift (${expectedAnchor}): ${sidecarName}`);
      }
      if (!verifiedPilotGenerated.has(mediaName)) {
        const candidateCount = Number.parseInt(
          scalar(metadata, "candidate_count", sidecarPath),
          10,
        );
        const waiverStatus = run3RenderedOutputWaivers.get(mediaName);
        const maximumCandidateCount = waiverStatus ? 4 : 3;
        if (
          waiverStatus &&
          scalar(metadata, "generation_budget_status", sidecarPath) !== waiverStatus
        ) {
          fail(`Run 3 rendered-output waiver provenance drift: ${sidecarName}`);
        }
        if (
          !Number.isInteger(candidateCount) ||
          candidateCount < 1 ||
          candidateCount > maximumCandidateCount
        ) {
          fail(`generated rendered-output cap failed (${candidateCount}): ${sidecarName}`);
        }
      }
      if (judgeReopenedGenerated.has(mediaName)) {
        const candidateCount = Number.parseInt(
          scalar(metadata, "candidate_count", sidecarPath),
          10,
        );
        if (!Number.isInteger(candidateCount) || candidateCount < 1 || candidateCount > 2) {
          fail(`Judge rework rendered-output cap failed (${candidateCount}): ${sidecarName}`);
        }
      }
    } else {
      if (scalar(metadata, "edition_commit", sidecarPath) !== editionCommit) {
        fail(`capture edition mismatch: ${sidecarName}`);
      }
      scalar(metadata, "viewport", sidecarPath);
      const frameDimensions = scalar(metadata, "frame_dimensions", sidecarPath);
      if (pngDimensions(mediaPath) !== frameDimensions) {
        fail(`capture frame dimensions drift: ${sidecarName}`);
      }
      const fixture = scalar(metadata, "fixture", sidecarPath);
      if (!existsSync(join(repositoryRoot, fixture))) {
        fail(`capture fixture missing: ${sidecarName}`);
      }
      for (const key of ["capture_command", "replay_policy", "sanitization"]) {
        scalar(metadata, key, sidecarPath);
      }
      if (!sidecarSource.includes("Caption:") || !sidecarSource.includes("Alt text:")) {
        fail(`capture sidecar missing caption or alt text: ${sidecarName}`);
      }
    }
    mediaBytes += statSync(mediaPath).size;
  }
  return mediaBytes;
}

const generatedBytes = validateReferencedSidecars(
  join(guideRoot, "assets/generated"),
  ".jpg",
  generatedRefs,
  "canonical_slot",
);
const captureBytes = validateReferencedSidecars(
  join(guideRoot, "assets/captures"),
  ".png",
  captureRefs,
  "capture_id",
);

const truthPaths = [
  join(guideRoot, "assets/pilot-visual-truth.md"),
  join(guideRoot, "assets/parts-01-02-visual-truth.md"),
  join(guideRoot, "assets/parts-03-04-visual-truth.md"),
  join(guideRoot, "assets/parts-05-06-visual-truth.md"),
  join(guideRoot, "assets/part-07-appendices-visual-truth.md"),
].filter(existsSync);
const truthSources = truthPaths.map(read);
for (const mediaName of generatedRefs) {
  const slot = mediaName.replace(/\.jpg$/, "");
  const row = truthSources
    .flatMap((source) => source.split("\n"))
    .find((line) => line.includes(`| \`${slot}\``) || line.includes(`| \`${slot}\` `));
  if (!row) fail(`visual-truth sheet missing slot: ${slot}`);
  const digestPrefix = sha256(join(guideRoot, "assets/generated", mediaName)).slice(0, 12);
  if (!row.includes("PASS") || !row.includes(digestPrefix)) {
    fail(`visual-truth verdict or hash drift: ${slot}`);
  }
}

const generatedAlts = [
  ...allPublicationSource.matchAll(/!\[([^\]]+)\]\((?:\.\.\/)*assets\/generated\/[^)]+\.jpg\)/g),
].filter((match) =>
  generatedMediaInScope(/assets\/generated\/([^)]+\.jpg)/.exec(match[0])?.[1] ?? ""),
);
if (
  generatedAlts.length !== generatedRefs.length ||
  generatedAlts.some((match) => !match[1].trim())
) {
  fail("generated image alt-text coverage mismatch");
}
const accessibleCount = (allPublicationSource.match(/\*\*Accessible equivalent\.\*\*/g) ?? [])
  .length;
if (accessibleCount < generatedRefs.length) {
  fail(`accessible equivalents missing: ${accessibleCount}/${generatedRefs.length}`);
}
validateSourceFigureContracts();
synchronizeNavigation("check");

if (/\b(?:sk-[A-Za-z0-9]{16,}|api[_-]?key\s*[:=]|password\s*[:=])\b/i.test(allPublicationSource)) {
  fail("possible secret pattern in Guidebook Markdown");
}
if (/\b(?:TODO|TBD|lorem ipsum)\b/i.test(allPublicationSource)) fail("placeholder text found");

const totalRasterBytes = generatedBytes + captureBytes;
if (totalRasterBytes >= 150 * 1024 * 1024) fail("150 MB raster review threshold reached");

console.log(
  `${scope}-validation=PASS chapters=${chapterPaths.length} tables=${totalTables} generated=${generatedRefs.length} captures=${captureRefs.length} raster_bytes=${totalRasterBytes}`,
);
