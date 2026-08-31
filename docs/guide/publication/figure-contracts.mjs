#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const guideRoot = process.env.GUIDEBOOK_ROOT_OVERRIDE
  ? resolve(process.env.GUIDEBOOK_ROOT_OVERRIDE)
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");

const generatedRoot = join(guideRoot, "assets/generated");
const excludedDirectories = new Set(["assets", "publication"]);

export function normalize(value) {
  return value.replace(/[`*]/g, "").replace(/\s+/g, " ").trim();
}

const relationStopwords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "in",
  "is",
  "it",
  "not",
  "of",
  "on",
  "one",
  "only",
  "or",
  "the",
  "this",
  "to",
  "when",
  "while",
  "with",
]);

function significantTokens(value) {
  return new Set(
    normalize(value)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1 && !relationStopwords.has(token)),
  );
}

function fail(message) {
  throw new Error(message);
}

function markdownSources(root = guideRoot) {
  const paths = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith(".md")) paths.push(path);
    }
  }
  walk(root);
  return paths.sort();
}

function paragraphAfter(label, source, path) {
  const index = source.indexOf(label);
  if (index === -1) fail(`missing '${label}' in ${relative(guideRoot, path)}`);
  const start = index + label.length;
  const tail = source.slice(start).replace(/^\s+/, "");
  const paragraph = tail.split(/\n\s*\n/, 1)[0];
  if (!normalize(paragraph)) fail(`empty '${label}' in ${relative(guideRoot, path)}`);
  return normalize(paragraph);
}

function frontMatter(source, path) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) fail(`missing front matter: ${relative(guideRoot, path)}`);
  return match[1];
}

function scalar(metadata, key) {
  const match = metadata.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return null;
  const value = match[1].trim();
  if (value.startsWith('"')) return JSON.parse(value);
  return value.replace(/^'|'$/g, "");
}

function list(metadata, key) {
  const lines = metadata.split("\n");
  const keyIndex = lines.findIndex((line) => line.trim() === `${key}:`);
  if (keyIndex === -1) return [];
  const values = [];
  for (const line of lines.slice(keyIndex + 1)) {
    const match = line.match(/^\s+-\s+(.+)$/);
    if (!match) break;
    const value = match[1].trim();
    values.push(value.startsWith('"') ? JSON.parse(value) : value.replace(/^'|'$/g, ""));
  }
  return values;
}

function relationStatements(extended) {
  return extended
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function sidecarContract(mediaName) {
  const path = join(generatedRoot, mediaName.replace(/\.jpg$/, ".md"));
  if (!existsSync(path)) fail(`missing sidecar for ${mediaName}`);
  const source = readFileSync(path, "utf8");
  const metadata = frontMatter(source, path);
  const bodyExtended = paragraphAfter("Accessible equivalent:", source, path);
  const extended = scalar(metadata, "extended_description") ?? bodyExtended;
  const relations = list(metadata, "relation_contract");
  return {
    sidecarPath: path,
    sidecarSource: source,
    metadata,
    contractAlt: scalar(metadata, "alt_text"),
    contractExtended: extended,
    bodyExtended,
    relations: (relations.length > 0 ? relations : relationStatements(extended))
      .map((statement, index) => ({
        id: `${mediaName.replace(/\.jpg$/, "")}-r${index + 1}`,
        statement,
      }))
      .filter(({ statement }) => statement.length > 0),
  };
}

function sourceFigure(path, source, mediaName) {
  const escaped = mediaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const image = new RegExp(`!\\[([^\\]]*)\\]\\(([^)]*assets/generated/${escaped})\\)`).exec(source);
  if (!image) return null;
  const afterImage = source.slice((image.index ?? 0) + image[0].length);
  const accessible = /\*\*Accessible equivalent\.\*\*\s+([\s\S]*?)(?=\n\s*\n)/.exec(afterImage);
  if (!accessible) fail(`missing adjacent accessible equivalent for ${mediaName} in ${path}`);
  const caption = /^\s*\n\s*_([\s\S]*?)_\s*\n\s*\n\*\*Accessible equivalent\.\*\*/.exec(afterImage);
  if (!caption) fail(`missing adjacent caption for ${mediaName} in ${path}`);
  return {
    sourcePath: path,
    source,
    image,
    sourceAlt: normalize(image[1]),
    sourceExtended: normalize(accessible[1]),
    caption: normalize(caption[1]),
    accessible,
    afterImageOffset: (image.index ?? 0) + image[0].length,
  };
}

export function collectFigureContracts() {
  const figures = [];
  const seen = new Set();
  for (const sourcePath of markdownSources()) {
    const source = readFileSync(sourcePath, "utf8");
    for (const match of source.matchAll(/!\[[^\]]*\]\([^)]*assets\/generated\/([^)]+\.jpg)\)/g)) {
      const mediaName = match[1];
      if (seen.has(mediaName)) fail(`generated figure referenced more than once: ${mediaName}`);
      seen.add(mediaName);
      const sourceData = sourceFigure(sourcePath, source, mediaName);
      const contract = sidecarContract(mediaName);
      figures.push({ mediaName, ...contract, ...sourceData });
    }
  }
  if (figures.length < 39)
    fail(
      `generated figure regression: expected at least 39 canonical figures; found ${figures.length}`,
    );
  return figures.sort((a, b) => a.mediaName.localeCompare(b.mediaName));
}

function seedAndSync() {
  const figures = collectFigureContracts();
  const bySource = new Map();
  for (const figure of figures) {
    let contractAlt = figure.contractAlt;
    contractAlt ??= figure.image ? normalize(figure.image[1]) : null;
    if (!contractAlt) fail(`cannot seed empty alt contract for ${figure.mediaName}`);
    let updatedSidecar = figure.sidecarSource;
    if (
      !scalar(figure.metadata, "alt_text") ||
      !scalar(figure.metadata, "extended_description") ||
      list(figure.metadata, "relation_contract").length === 0
    ) {
      const relations = relationStatements(figure.contractExtended).map((statement) => {
        const sentence = /^[a-z]/.test(statement)
          ? `${statement[0].toUpperCase()}${statement.slice(1)}`
          : statement;
        return `  - ${JSON.stringify(sentence)}`;
      });
      const fields = [
        "relation_contract:",
        ...relations,
        `alt_text: ${JSON.stringify(contractAlt)}`,
        `extended_description: ${JSON.stringify(figure.contractExtended)}`,
      ].join("\n");
      updatedSidecar = updatedSidecar.replace(/\n---\n/, `\n${fields}\n---\n`);
    }
    updatedSidecar = updatedSidecar.replace(
      /(Accessible equivalent:\s*)[\s\S]*?(?=\n\s*\n)/,
      `$1${figure.contractExtended}`,
    );
    if (updatedSidecar !== figure.sidecarSource) {
      writeFileSync(figure.sidecarPath, updatedSidecar);
    }
    const path = figure.sourcePath;
    const current = bySource.get(path) ?? readFileSync(path, "utf8");
    const mediaEscaped = figure.mediaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const withAlt = current.replace(
      new RegExp(`!\\[[^\\]]*\\](\\([^)]*assets/generated/${mediaEscaped}\\))`),
      `![${contractAlt}]$1`,
    );
    const imageIndex = withAlt.search(
      new RegExp(`!\\[[^\\]]*\\]\\([^)]*assets/generated/${mediaEscaped}\\)`),
    );
    if (imageIndex === -1) fail(`cannot locate ${figure.mediaName} while syncing`);
    const before = withAlt.slice(0, imageIndex);
    const tail = withAlt.slice(imageIndex);
    const syncedTail = tail.replace(
      /(\*\*Accessible equivalent\.\*\*\s+)[\s\S]*?(?=\n\s*\n)/,
      `$1${figure.contractExtended}`,
    );
    bySource.set(path, before + syncedTail);
  }
  for (const [path, source] of bySource) writeFileSync(path, source);
  console.log(`figure-contract-sync=PASS figures=${figures.length}`);
}

export function validateSourceFigureContracts({ quiet = false } = {}) {
  const figures = collectFigureContracts();
  for (const figure of figures) {
    if (!figure.contractAlt) fail(`sidecar missing Alt text contract: ${figure.mediaName}`);
    if (!/^[A-Z0-9]/.test(figure.contractAlt)) {
      fail(`sidecar alt must start in natural sentence case: ${figure.mediaName}`);
    }
    if (figure.contractAlt !== normalize(figure.image[1])) {
      fail(`source alt drift for ${figure.mediaName}`);
    }
    const sourceExtended = sourceFigure(
      figure.sourcePath,
      readFileSync(figure.sourcePath, "utf8"),
      figure.mediaName,
    ).sourceExtended;
    if (figure.contractExtended !== sourceExtended) {
      fail(`source extended-description relation drift for ${figure.mediaName}`);
    }
    if (figure.relations.length === 0) fail(`empty relation contract: ${figure.mediaName}`);
    if (figure.bodyExtended !== figure.contractExtended) {
      fail(`sidecar body/front-matter extended-description drift: ${figure.mediaName}`);
    }
    if (!/^[A-Z0-9]/.test(figure.contractExtended)) {
      fail(`relation contract must start in natural sentence case: ${figure.mediaName}`);
    }
    const extendedTokens = significantTokens(figure.contractExtended);
    const relationTokens = new Set();
    for (const relation of figure.relations) {
      const tokens = significantTokens(relation.statement);
      for (const token of tokens) relationTokens.add(token);
      const covered = [...tokens].filter((token) => extendedTokens.has(token)).length;
      if (tokens.size > 0 && covered / tokens.size < 0.55) {
        fail(`extended description does not cover ${relation.id}: ${figure.mediaName}`);
      }
    }
    const altTokens = significantTokens(figure.contractAlt);
    const altRelationOverlap = [...altTokens].filter((token) => relationTokens.has(token)).length;
    if (altRelationOverlap < 2) {
      fail(`alt is not associated with structured relations: ${figure.mediaName}`);
    }
    if (
      /still contains|does not explain|failed candidate|unlabeled (?:node|box)/i.test(
        figure.contractExtended,
      )
    ) {
      fail(`rejected-candidate language remains in relation contract: ${figure.mediaName}`);
    }
  }
  if (!quiet) console.log(`figure-contract-source=PASS figures=${figures.length}`);
  return figures;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--write")) seedAndSync();
  else if (process.argv.includes("--json")) {
    const figures = validateSourceFigureContracts({ quiet: true });
    process.stdout.write(
      `${JSON.stringify(
        figures.map(
          ({ mediaName, contractAlt, contractExtended, relations, sourcePath, caption }) => ({
            mediaName,
            alt: contractAlt,
            extended: contractExtended,
            caption,
            relations,
            source: relative(guideRoot, sourcePath),
          }),
        ),
      )}\n`,
    );
  } else validateSourceFigureContracts();
}
