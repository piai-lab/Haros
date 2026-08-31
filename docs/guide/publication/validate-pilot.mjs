#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateSourceFigureContracts } from "./figure-contracts.mjs";
import { synchronizeNavigation } from "./sync-navigation.mjs";

const guideRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(guideRoot, "../..");
const editionCommit = "17b578d3c65d72113accc17200b9b290f80139f6";
const read = (path) => readFileSync(path, "utf8");
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const rejectedGeneratedShas = new Set([
  "ee29606699d3d6e449daf60ccc01b7611d55bdb2deb4c9e982e349c468eb36f3",
  "fd3b4df740903668ec7a0f6c2ef6a1852cbebee49310b63145e01e3dfc46c588",
  "d027c95bfb4472499c32b4f093beee31aa2d9b2d566510183b149f03e64d62ab",
  "f4f119ad7d33d1a61be0a4e0a45be76506c5e306249fea8d14697c2c6009a992",
  "51c43172170ac6e38a4fdd454a2a9a2e0a6153a958ad9e4f03657e53b98036eb",
  "5b2844ce781a9df505a58fdc70f43cbf4f12c382fdcc1eeb76a59d35d87326ba",
  "bf2fe41990a20633626225a7225eaea2a93461914c27afba78419ce7a6e2545f",
  "345c32e41c83df8a0f434b1ac37c09de144c91ee2bed114f4bdc04e02baf6fb8",
  "eb388a6f62b89af7ee3b423ec1ce660215c6d4ff746768972280861f2bc9788a",
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
const fail = (message) => {
  throw new Error(message);
};

function uniquePilotSources() {
  return [
    "part-01-meet-haros/03-agent-chat-studio.md",
    "part-02-workbench/14-queue-steer-interrupt.md",
    "part-05-architecture/37-product-orchestration.md",
  ];
}

if (process.argv.includes("--print-sources")) {
  process.stdout.write(`${uniquePilotSources().join("\n")}\n`);
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
  "JSON",
  "PDF",
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

function normalizedText(source) {
  return source.replace(/[`*_]/g, "").replace(/\s+/g, " ").trim();
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

function pngDimensions(path) {
  const buffer = readFileSync(path);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    fail(`invalid PNG: ${relative(repositoryRoot, path)}`);
  }
  return `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
}

const pilotSources = uniquePilotSources();
if (pilotSources.length !== 3) fail(`expected 3 Pilot chapters, found ${pilotSources.length}`);

const chapterPaths = pilotSources.map((source) => join(guideRoot, source));
const publicationSources = [
  join(guideRoot, "README.md"),
  join(guideRoot, "00-preface.md"),
  ...chapterPaths,
];
for (const path of publicationSources) {
  if (!existsSync(path)) fail(`missing publication source: ${relative(repositoryRoot, path)}`);
  const source = read(path);
  const metadata = frontMatter(source, path);
  if (scalar(metadata, "edition_commit", path) !== editionCommit) {
    fail(`edition commit mismatch: ${relative(repositoryRoot, path)}`);
  }
  for (const target of markdownTargets(source)) {
    if (/^(?:https?:|mailto:)/.test(target)) continue;
    const [targetPath, fragment] = target.split("#", 2);
    if (targetPath.length === 0) continue;
    const resolvedTarget = resolve(dirname(path), targetPath);
    if (!existsSync(resolvedTarget))
      fail(`broken local link ${target} in ${relative(repositoryRoot, path)}`);
    if (fragment && extname(resolvedTarget) === ".md") {
      const targetSource = read(resolvedTarget);
      if (!targetSource.includes(`{#${fragment}}`)) {
        fail(`missing explicit anchor #${fragment} in ${relative(repositoryRoot, resolvedTarget)}`);
      }
    }
  }
}

for (const path of chapterPaths) {
  const source = read(path);
  const words = wordCount(source);
  if (words < 2_500 || words > 3_500) {
    fail(`chapter word target failed (${words}): ${relative(repositoryRoot, path)}`);
  }
  const tables = (source.match(/^\| ---/gm) ?? []).length;
  if (tables < 3 || tables > 4) {
    fail(`chapter table target failed (${tables}): ${relative(repositoryRoot, path)}`);
  }
  if (!source.includes("## Check your model") || !source.includes("## Source trail")) {
    fail(`chapter anatomy incomplete: ${relative(repositoryRoot, path)}`);
  }
}

const allPublicationSource = publicationSources.map(read).join("\n");
const generatedRefs = [
  ...allPublicationSource.matchAll(/\]\((?:\.\.\/)*assets\/generated\/([^)]+\.jpg)\)/g),
]
  .map((match) => match[1])
  .filter((mediaName) => mediaName !== "cover-01.jpg");
const captureRefs = [
  ...allPublicationSource.matchAll(/\]\((?:\.\.\/)*assets\/captures\/([^)]+\.png)\)/g),
].map((match) => match[1]);
if (generatedRefs.length !== 9 || new Set(generatedRefs).size !== 9) {
  fail(
    `generated asset allocation mismatch: total=${generatedRefs.length}, unique=${new Set(generatedRefs).size}`,
  );
}
if (captureRefs.length !== 3 || new Set(captureRefs).size !== 3) {
  fail(
    `capture allocation mismatch: total=${captureRefs.length}, unique=${new Set(captureRefs).size}`,
  );
}

function validateSidecars(directory, mediaExtension, mediaRefs, identityKey) {
  const sidecars = mediaRefs.map((name) => name.replace(new RegExp(`${mediaExtension}$`), ".md"));
  const identities = new Set();
  let mediaBytes = 0;
  for (const name of sidecars) {
    const path = join(directory, name);
    const metadata = frontMatter(read(path), path);
    const identity = scalar(metadata, identityKey, path);
    if (identities.has(identity)) fail(`duplicate ${identityKey}: ${identity}`);
    identities.add(identity);
    const mediaName = scalar(metadata, "file", path);
    if (!mediaName.endsWith(mediaExtension)) fail(`wrong media type in ${name}`);
    const mediaPath = join(directory, mediaName);
    if (!existsSync(mediaPath)) fail(`missing media for ${name}`);
    const expectedSha = scalar(metadata, "sha256", path);
    const actualSha = sha256(mediaPath);
    if (expectedSha !== actualSha)
      fail(`checksum mismatch: ${relative(repositoryRoot, mediaPath)}`);
    if (mediaExtension === ".jpg" && rejectedGeneratedShas.has(actualSha)) {
      fail(`rejected generated family returned: ${relative(repositoryRoot, mediaPath)}`);
    }
    mediaBytes += statSync(mediaPath).size;
    if (
      read(path).includes("acceptance_exact_text:") &&
      !read(path).includes("acceptance_exact_text: PASS")
    ) {
      fail(`text acceptance is not PASS: ${name}`);
    }
    if (mediaExtension === ".jpg") {
      const sidecarSource = read(path);
      const model = scalar(metadata, "model", path);
      const generationTool = scalar(metadata, "generation_tool", path);
      const expectedTool = model === "imagegen-built-in" ? "built-in-imagegen" : model;
      if (!new Set(["imagegen-built-in", "gpt-image-2"]).has(model)) {
        fail(`unknown generation model '${model}': ${name}`);
      }
      if (generationTool !== expectedTool) {
        fail(`generation provenance mismatch: ${name}`);
      }
      for (const key of ["generation_budget_status", "size", "crop_rule", "crop_verdict"]) {
        scalar(metadata, key, path);
      }
      for (const value of exactTextValues(metadata, path)) {
        const token = forbiddenUppercaseToken(value);
        if (token) {
          fail(`non-acronym ALL-CAPS token '${token}' in exact_text: ${name}`);
        }
      }
      if (!sidecarSource.includes("Accessible equivalent:")) {
        fail(`generated sidecar missing accessible equivalent: ${name}`);
      }
      if (judgeReopenedGenerated.has(mediaName)) {
        const candidateCount = Number.parseInt(scalar(metadata, "candidate_count", path), 10);
        if (!Number.isInteger(candidateCount) || candidateCount < 1 || candidateCount > 2) {
          fail(`Judge rework rendered-output cap failed (${candidateCount}): ${name}`);
        }
      }
    } else {
      if (scalar(metadata, "edition_commit", path) !== editionCommit) {
        fail(`capture edition mismatch: ${name}`);
      }
      scalar(metadata, "viewport", path);
      const frameDimensions = scalar(metadata, "frame_dimensions", path);
      if (pngDimensions(mediaPath) !== frameDimensions) {
        fail(`capture frame dimensions drift: ${name}`);
      }
      const fixture = scalar(metadata, "fixture", path);
      if (!existsSync(join(repositoryRoot, fixture))) {
        fail(`capture fixture missing: ${name}`);
      }
      for (const key of ["capture_command", "replay_policy", "sanitization"]) {
        scalar(metadata, key, path);
      }
      const sidecarSource = read(path);
      if (!sidecarSource.includes("Caption:") || !sidecarSource.includes("Alt text:")) {
        fail(`capture sidecar missing caption or alt text: ${name}`);
      }
    }
  }
  return { identities, mediaBytes };
}

const generated = validateSidecars(
  join(guideRoot, "assets/generated"),
  ".jpg",
  generatedRefs,
  "canonical_slot",
);
const captures = validateSidecars(
  join(guideRoot, "assets/captures"),
  ".png",
  captureRefs,
  "capture_id",
);
const visualTruthPath = join(guideRoot, "assets/pilot-visual-truth.md");
if (!existsSync(visualTruthPath)) fail("missing Pilot visual-truth sheet");
const visualTruthSource = read(visualTruthPath);
for (const ref of generatedRefs) {
  const slot = ref.replace(/\.jpg$/, "");
  const row = visualTruthSource
    .split("\n")
    .find((line) => line.includes(`| \`${slot}\``) || line.includes(`| \`${slot}\` `));
  if (!row) fail(`visual-truth sheet missing slot: ${slot}`);
  const digestPrefix = sha256(join(guideRoot, "assets/generated", ref)).slice(0, 12);
  if (!row.includes("PASS") && !row.includes("ACCEPTED")) {
    fail(`visual-truth verdict drift: ${slot}`);
  }
  if (!row.includes(digestPrefix)) fail(`visual-truth hash drift: ${slot}`);
}
for (const ref of generatedRefs) {
  if (!existsSync(join(guideRoot, "assets/generated", ref)))
    fail(`unresolved generated ref: ${ref}`);
}
for (const ref of captureRefs) {
  if (!existsSync(join(guideRoot, "assets/captures", ref))) fail(`unresolved capture ref: ${ref}`);
}

const accessibleCount = (allPublicationSource.match(/\*\*Accessible equivalent\.\*\*/g) ?? [])
  .length;
if (accessibleCount < generatedRefs.length) {
  fail(`accessible equivalents missing: ${accessibleCount}/${generatedRefs.length}`);
}
validateSourceFigureContracts();
synchronizeNavigation("check");

const interruptSidecarPath = join(guideRoot, "assets/generated/ch-14-extra-01.md");
const interruptExactText = list(
  frontMatter(read(interruptSidecarPath), interruptSidecarPath),
  "exact_text",
  interruptSidecarPath,
);
if (interruptExactText.length !== 20) {
  fail(`interrupt matrix exact-text contract must contain 20 entries`);
}
const interruptHeaders = interruptExactText.slice(0, 3);
const interruptRowValues = interruptExactText.slice(3, -2);
const interruptInvariants = interruptExactText.slice(-2);
if (interruptRowValues.length !== 15) fail(`interrupt matrix must contain five three-value rows`);
const interruptRows = Array.from({ length: 5 }, (_, index) =>
  interruptRowValues.slice(index * 3, index * 3 + 3),
);
const chapter14Path = chapterPaths.find((path) => /\/14-/.test(path));
if (!chapter14Path) fail(`missing Chapter 14 source`);
const chapter14Source = read(chapter14Path);
const interruptImageMatch = chapter14Source.match(
  /!\[([^\]]*)\]\([^)]*assets\/generated\/ch-14-extra-01\.jpg\)/,
);
if (!interruptImageMatch) fail(`missing Figure 14.5 image reference`);
const interruptAlt = normalizedText(interruptImageMatch[1]);
const interruptRemainder = chapter14Source.slice(
  (interruptImageMatch.index ?? 0) + interruptImageMatch[0].length,
);
const interruptAccessibleMatch = interruptRemainder.match(
  /\*\*Accessible equivalent\.\*\*\s+([\s\S]*?)(?:\n\n|$)/,
);
if (!interruptAccessibleMatch) fail(`missing Figure 14.5 accessible equivalent`);
const interruptAccessible = normalizedText(interruptAccessibleMatch[1]);
for (const header of interruptHeaders) {
  if (!interruptAlt.includes(header) || !interruptAccessible.includes(header)) {
    fail(`Figure 14.5 accessibility missing matrix header: ${header}`);
  }
}
for (const [condition, handling, settlement] of interruptRows) {
  const altMapping = `${condition} to ${handling} to ${settlement}`;
  const accessibleMapping = `${condition} → ${handling} → ${settlement}`;
  if (!interruptAlt.includes(altMapping)) {
    fail(`Figure 14.5 alt mapping drift: ${altMapping}`);
  }
  if (!interruptAccessible.includes(accessibleMapping)) {
    fail(`Figure 14.5 accessible mapping drift: ${accessibleMapping}`);
  }
}
for (const invariant of interruptInvariants) {
  if (!interruptAlt.includes(invariant) || !interruptAccessible.includes(invariant)) {
    fail(`Figure 14.5 accessibility missing invariant: ${invariant}`);
  }
}
if (/\b(?:sk-[A-Za-z0-9]{16,}|api[_-]?key\s*[:=]|password\s*[:=])\b/i.test(allPublicationSource)) {
  fail("possible secret pattern in Guidebook Markdown");
}
if (/\b(?:TODO|TBD|lorem ipsum)\b/i.test(allPublicationSource)) fail("placeholder text found");

const totalRasterBytes = generated.mediaBytes + captures.mediaBytes;
if (totalRasterBytes >= 150 * 1024 * 1024) fail("150 MB raster review threshold reached");

console.log(
  `pilot-validation=PASS chapters=${chapterPaths.length} generated=${generatedRefs.length} captures=${captureRefs.length} raster_bytes=${totalRasterBytes}`,
);
