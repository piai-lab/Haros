#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { repositoryFiles } from "./repository-files.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_ROOT = path.join(ROOT, "apps/web/public/icons");
const REGISTRY_JSON = path.join(SOURCE_ROOT, "registry.json");
const REGISTRY_TS = path.join(ROOT, "apps/web/src/ui/icons/registry.generated.ts");
const EXPECTED_COUNTS = { line: 1979, fill: 2035 };
const FIXED_STYLE_TREES = {
  line: "08fd7dfc4631902bf6d9a2415573e4a4d0e02873",
  fill: "932c44605d556210fdfb1b663807a921f590d8f0",
};
const STYLES = Object.keys(EXPECTED_COUNTS);
const SOURCE_SPECIFIC_ICON_PATTERNS = [
  ["legacy public component type", /\bLucideIcon\b/u],
  ["generic source-library name", /\b(?:tabler|lucide)\b/iu],
  ["generic source-library import family", /react-icons\/lu/u],
  ["source-specific optical variant", /\bchromeLu\b/u],
  ["former corpus-source semantics", /\bCentral(?:\/|\s+(?:icon|glyph|folder|pin|fill))/iu],
];

async function verifySourceNeutralApi() {
  const authoredFiles = repositoryFiles(ROOT).filter(
    (file) =>
      file === "apps/web/components.json" ||
      (/^apps\/web\/src\//u.test(file) && /\.(?:[cm]?[jt]sx?|json)$/u.test(file)),
  );
  for (const file of authoredFiles) {
    const contents = await readFile(path.join(ROOT, file), "utf8");
    for (const [label, pattern] of SOURCE_SPECIFIC_ICON_PATTERNS) {
      if (pattern.test(contents)) {
        throw new Error(`source-neutral glyph API violation (${label}): ${file}`);
      }
    }
  }
}

async function filesForStyle(root, style) {
  const directory = path.join(root, style);
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".svg"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function digest(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function buildRegistry(root) {
  const styles = {};
  for (const style of STYLES) {
    const files = await filesForStyle(root, style);
    styles[style] = {
      count: files.length,
      files: await Promise.all(
        files.map(async (file) => ({
          name: file.slice(0, -".svg".length),
          sha256: await digest(path.join(root, style, file)),
        })),
      ),
    };
  }
  return {
    schemaVersion: 1,
    algorithm: "sha256",
    total: Object.values(styles).reduce((sum, entry) => sum + entry.count, 0),
    styles,
  };
}

function git(root, args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    maxBuffer: 256 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`cannot read immutable glyph evidence: git ${args.join(" ")}`);
  }
  return result.stdout;
}

function fixedFiles(tree) {
  return git(ROOT, ["ls-tree", "-r", "-z", "--name-only", tree], { encoding: "utf8" })
    .split("\0")
    .filter((file) => file.endsWith(".svg"))
    .sort((left, right) => left.localeCompare(right));
}

function fixedDigests(tree, files) {
  if (files.some((file) => file.includes("\n"))) {
    throw new Error("immutable glyph filename contains an unsupported newline");
  }
  const input = `${files.map((file) => `${tree}:${file}`).join("\n")}\n`;
  const output = git(ROOT, ["cat-file", "--batch"], { input: Buffer.from(input) });
  const digests = [];
  let offset = 0;
  for (const file of files) {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) throw new Error(`missing Git object header for ${file}`);
    const header = output.subarray(offset, headerEnd).toString("utf8");
    const [, objectType, sizeText] = header.split(" ");
    const size = Number(sizeText);
    if (objectType !== "blob" || !Number.isSafeInteger(size)) {
      throw new Error(`invalid Git object header for ${file}: ${header}`);
    }
    const start = headerEnd + 1;
    const end = start + size;
    digests.push(createHash("sha256").update(output.subarray(start, end)).digest("hex"));
    if (output[end] !== 0x0a) throw new Error(`invalid Git object separator for ${file}`);
    offset = end + 1;
  }
  if (offset !== output.length) throw new Error("unexpected trailing immutable glyph evidence");
  return digests;
}

function buildFixedRegistry() {
  const styles = {};
  for (const style of STYLES) {
    const files = fixedFiles(FIXED_STYLE_TREES[style]);
    const digests = fixedDigests(FIXED_STYLE_TREES[style], files);
    styles[style] = {
      count: files.length,
      files: files.map((file, index) => ({
        name: file.slice(0, -".svg".length),
        sha256: digests[index],
      })),
    };
  }
  return {
    schemaVersion: 1,
    algorithm: "sha256",
    total: Object.values(styles).reduce((sum, entry) => sum + entry.count, 0),
    styles,
  };
}

function renderJson(registry) {
  return `${JSON.stringify(registry, null, 2)}\n`;
}

function renderTypeScript(registry) {
  const line = registry.styles.line.files.map((entry) => entry.name);
  const fill = registry.styles.fill.files.map((entry) => entry.name);
  return `// Generated by scripts/check-glyph-corpus.mjs --write. Do not edit.\n` +
    `export const glyphRegistry = ${JSON.stringify({ line, fill }, null, 2)} as const;\n\n` +
    `export type RegisteredGlyphStyle = keyof typeof glyphRegistry;\n` +
    `export type RegisteredGlyphName = (typeof glyphRegistry)[RegisteredGlyphStyle][number];\n\n` +
    `const glyphNames = {\n` +
    `  line: new Set<string>(glyphRegistry.line),\n` +
    `  fill: new Set<string>(glyphRegistry.fill),\n` +
    `} satisfies Record<RegisteredGlyphStyle, ReadonlySet<string>>;\n\n` +
    `export function hasGlyph(style: RegisteredGlyphStyle, name: string): boolean {\n` +
    `  return glyphNames[style].has(name);\n` +
    `}\n`;
}

function assertCounts(registry, label) {
  for (const style of STYLES) {
    const actual = registry.styles[style]?.count;
    const expected = EXPECTED_COUNTS[style];
    if (actual !== expected) {
      throw new Error(`${label}: expected ${expected} ${style} glyphs, found ${actual}`);
    }
  }
  if (registry.total !== 4014) {
    throw new Error(`${label}: expected 4014 total glyphs, found ${registry.total}`);
  }
}

async function verifyArtifact(registry, artifactRoot) {
  const artifact = await buildRegistry(artifactRoot);
  assertCounts(artifact, "artifact");
  if (renderJson(artifact) !== renderJson(registry)) {
    throw new Error(`artifact glyph registry differs from authored source: ${artifactRoot}`);
  }
}

const write = process.argv.includes("--write");
const artifactFlag = process.argv.indexOf("--artifact");
const sourceRegistry = await buildRegistry(SOURCE_ROOT);
const fixedRegistry = buildFixedRegistry();
await verifySourceNeutralApi();
assertCounts(sourceRegistry, "source");
assertCounts(fixedRegistry, "immutable source");
if (renderJson(sourceRegistry) !== renderJson(fixedRegistry)) {
  throw new Error("authored glyph filenames or bytes differ from immutable source evidence");
}

if (write) {
  await writeFile(REGISTRY_JSON, renderJson(sourceRegistry));
  await writeFile(REGISTRY_TS, renderTypeScript(sourceRegistry));
  console.log("wrote complete glyph registry: line=1979 fill=2035 total=4014");
} else {
  const [recordedJson, recordedTs] = await Promise.all([
    readFile(REGISTRY_JSON, "utf8"),
    readFile(REGISTRY_TS, "utf8"),
  ]);
  if (recordedJson !== renderJson(sourceRegistry)) {
    throw new Error("apps/web/public/icons/registry.json is stale or the glyph corpus changed");
  }
  if (recordedTs !== renderTypeScript(sourceRegistry)) {
    throw new Error("apps/web/src/ui/icons/registry.generated.ts is stale");
  }
}

if (artifactFlag >= 0) {
  const requested = process.argv[artifactFlag + 1];
  if (!requested) throw new Error("--artifact requires an icon root");
  await verifyArtifact(sourceRegistry, path.resolve(ROOT, requested));
}

console.log("glyph corpus verified: line=1979 fill=2035 total=4014");
