#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { completeReadingOrder } from "./sync-navigation.mjs";

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const canonicalGuideRoot = resolve(scriptRoot, "..");
const guideRoot = process.env.GUIDEBOOK_ROOT_OVERRIDE
  ? resolve(process.env.GUIDEBOOK_ROOT_OVERRIDE)
  : canonicalGuideRoot;
const repositoryRoot = resolve(canonicalGuideRoot, "../..");

function fail(message) {
  throw new Error(message);
}

function section(source, heading) {
  const marker = `## ${heading}`;
  const start = source.indexOf(marker);
  if (start === -1) return null;
  const bodyStart = source.indexOf("\n", start + marker.length);
  if (bodyStart === -1) return "";
  const remainder = source.slice(bodyStart + 1);
  const nextHeading = remainder.search(/^## /m);
  return nextHeading === -1 ? remainder : remainder.slice(0, nextHeading);
}

function listItemCount(source) {
  return (source.match(/^(?:\d+\.|[-*])\s+/gm) ?? []).length;
}

function frontMatter(source, path) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) fail(`missing front matter: ${relative(repositoryRoot, path)}`);
  return match[1];
}

function list(metadata, key) {
  const lines = metadata.split("\n");
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start === -1) return [];
  const values = [];
  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^\s+-\s+(.+)$/);
    if (!match) break;
    values.push(match[1].trim().replace(/^['"]|['"]$/g, ""));
  }
  return values;
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

const order = completeReadingOrder();
if (order.length !== 59) fail(`reading order drift: ${order.length}`);
const chapters = order.slice(1, 51);
const appendices = order.slice(51);
if (chapters.length !== 50 || appendices.length !== 8) {
  fail(`whole-guide partition drift: chapters=${chapters.length} appendices=${appendices.length}`);
}

let modelChecks = 0;
let safeExercises = 0;
const chapterSources = [];
for (const [index, item] of chapters.entries()) {
  const chapterNumber = index + 1;
  const path = join(guideRoot, item.path);
  if (!existsSync(path)) fail(`missing Chapter ${chapterNumber}: ${item.path}`);
  const source = readFileSync(path, "utf8");
  chapterSources.push(source);
  if (!source.includes(`# Chapter ${chapterNumber} —`)) {
    fail(`Chapter ${chapterNumber} heading drift`);
  }
  for (const required of ["The question", "Check your model", "Source trail"]) {
    if (section(source, required) === null) {
      fail(`Chapter ${chapterNumber} missing ${required}`);
    }
  }
  const check = section(source, "Check your model");
  if (listItemCount(check) < 2) {
    fail(`Chapter ${chapterNumber} has fewer than two model checks`);
  }
  modelChecks += 1;
  safeExercises += (source.match(/^## (?:Try it|Exercise:)/gm) ?? []).length;
}
if (modelChecks !== 50 || safeExercises < 30 || safeExercises > 40) {
  fail(`junior-learning contract drift: model_checks=${modelChecks} exercises=${safeExercises}`);
}

const readme = readFileSync(join(guideRoot, "README.md"), "utf8");
const preface = readFileSync(join(guideRoot, "00-preface.md"), "utf8");
const narrativeSpine = [readme, preface, chapterSources[0], chapterSources[1], chapterSources[39]];
const narrativeTerms = [
  /local-first/i,
  /durable (?:product )?work/i,
  /Product Thread/i,
  /native (?:Engine )?Session/i,
];
for (const term of narrativeTerms) {
  if (!narrativeSpine.some((source) => term.test(source))) {
    fail(`narrative spine missing ${term}`);
  }
}
if (
  !readme.includes("05-the-vocabulary-of-haros.md") ||
  !readme.includes("appendix-a-glossary.md")
) {
  fail("glossary route drift");
}

const lifecycleChapters = [9, 14, 18, 22, 24, 34, 38, 42, 43, 44, 45, 46];
for (const chapterNumber of lifecycleChapters) {
  const source = chapterSources[chapterNumber - 1];
  if (!/^## .*?(?:failure|wrong|recover|cancel|timeout|restart|shutdown)/im.test(source)) {
    fail(`Chapter ${chapterNumber} missing explicit lifecycle failure/recovery treatment`);
  }
  const lifecycleTerms = ["preserv", "settle", "recover", "cancel", "restart", "shutdown"];
  if (lifecycleTerms.filter((term) => source.toLowerCase().includes(term)).length < 2) {
    fail(`Chapter ${chapterNumber} lifecycle semantics are too narrow`);
  }
}

const publicationSources = [
  readme,
  preface,
  ...chapterSources,
  ...appendices.map(({ path }) => readFileSync(join(guideRoot, path), "utf8")),
].join("\n");

let localSourceAnchors = 0;
let codeSymbolFragments = 0;
let markdownHeadingFragments = 0;
const sourceDocuments = [
  join(guideRoot, "README.md"),
  ...order.map(({ path }) => join(guideRoot, path)),
];
for (const documentPath of sourceDocuments) {
  const documentSource = readFileSync(documentPath, "utf8");
  const metadata = frontMatter(documentSource, documentPath);
  for (const anchor of list(metadata, "source_anchors")) {
    if (/^https?:/.test(anchor)) continue;
    localSourceAnchors += 1;
    const [owner, fragment] = anchor.split("#", 2);
    const ownerPath = join(repositoryRoot, owner);
    if (!existsSync(ownerPath)) {
      fail(`missing source owner ${anchor}: ${relative(guideRoot, documentPath)}`);
    }
    if (!fragment) continue;
    const ownerSource = readFileSync(ownerPath, "utf8");
    const extension = extname(ownerPath);
    if (extension === ".md") {
      markdownHeadingFragments += 1;
      const explicitIds = new Set(
        [...ownerSource.matchAll(/\{#([^}]+)\}/g)].map((match) => match[1]),
      );
      const headingSlugs = new Set(
        ownerSource
          .split("\n")
          .filter((line) => /^#{1,6}\s+/.test(line))
          .map((line) => markdownHeadingSlug(line.replace(/^#{1,6}\s+/, ""))),
      );
      if (!explicitIds.has(fragment) && !headingSlugs.has(fragment)) {
        fail(`missing Markdown heading fragment ${anchor}: ${relative(guideRoot, documentPath)}`);
      }
    } else if ([".ts", ".tsx", ".js", ".mjs", ".json"].includes(extension)) {
      codeSymbolFragments += 1;
      if (!ownerSource.includes(fragment)) {
        fail(`missing code symbol fragment ${anchor}: ${relative(guideRoot, documentPath)}`);
      }
    } else {
      fail(`unclassified source fragment extension ${anchor}: ${extension || "<none>"}`);
    }
  }
}
const sensitivePatterns = [
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//,
  /C:\\Users\\[A-Za-z0-9._-]+\\/i,
  /\bsk-[A-Za-z0-9_-]{12,}\b/,
  /\bBearer\s+(?!(?:authentication|token|credential|header)\b)[A-Za-z0-9._-]{12,}\b/i,
  /\b(?:api[_-]?key|access[_-]?token)\s*[:=]\s*\S+/i,
];
for (const pattern of sensitivePatterns) {
  if (pattern.test(publicationSources)) fail(`sensitive publication text matched ${pattern}`);
}
if (/\b(?:HarnessOS|Piai)\b/.test(publicationSources)) {
  fail("second normal product identity found in publication prose");
}

for (const source of [
  readme,
  preface,
  chapterSources[49],
  ...appendices.slice(7).map(({ path }) => readFileSync(join(guideRoot, path), "utf8")),
]) {
  if (!/source[- ]alpha/i.test(source)) fail("edition/release honesty drift");
}

console.log(
  "run6-whole-guide=PASS " +
    `chapters=${chapters.length} appendices=${appendices.length} ` +
    `model_checks=${modelChecks} safe_exercises=${safeExercises} ` +
    `lifecycle_chapters=${lifecycleChapters.length} narrative_spine=PASS ` +
    `source_anchors=${localSourceAnchors} code_fragments=${codeSymbolFragments} ` +
    `markdown_fragments=${markdownHeadingFragments} ` +
    "glossary_routes=PASS identity=PASS security=PASS edition_honesty=PASS",
);
