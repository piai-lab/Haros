#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function fail(message) {
  throw new Error(message);
}

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function run(args, { allowDifference = false } = {}) {
  const result = spawnSync("magick", args, { encoding: "utf8" });
  if (result.status !== 0 && !(allowDifference && result.status === 1)) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    fail(`magick ${args.join(" ")} failed with status ${result.status}`);
  }
  return result;
}

function assertHash(path, expected, label) {
  const actual = sha256(path);
  if (actual !== expected) fail(`${label} hash drift: expected=${expected} actual=${actual}`);
  return actual;
}

function alphaBbox(path) {
  return run([path, "-alpha", "extract", "-format", "%@", "info:"]).stdout.trim();
}

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const defaultGuideRoot = resolve(scriptRoot, "..");
const guideRoot = resolve(argument("--guide-root", defaultGuideRoot));
const repositoryRoot = resolve(argument("--repository-root", resolve(defaultGuideRoot, "../..")));
const outputArgument = argument("--output");
if (!outputArgument) fail("usage: compose-cover.mjs --output <path> [--guide-root <path>]");
const outputPath = resolve(outputArgument);
const recipePath = join(guideRoot, "assets/generated/sources/cover-01-composition.json");
const recipe = JSON.parse(readFileSync(recipePath, "utf8"));
if (recipe.schema !== "haros-guidebook-cover-composition-v1") fail("cover recipe schema drift");

const fieldPath = join(guideRoot, recipe.generatedField.path);
const markLayerPath = join(guideRoot, recipe.markLayer.path);
const wordmarkLayerPath = join(guideRoot, recipe.wordmarkLayer.path);
const canonicalMarkPath = join(repositoryRoot, recipe.canonicalMark.path);
assertHash(fieldPath, recipe.generatedField.sha256, "generated field");
assertHash(markLayerPath, recipe.markLayer.sha256, "mark layer");
assertHash(wordmarkLayerPath, recipe.wordmarkLayer.sha256, "wordmark layer");
assertHash(canonicalMarkPath, recipe.canonicalMark.sha256, "canonical mark");
if (alphaBbox(markLayerPath) !== recipe.markLayer.alphaBbox) fail("mark layer bbox drift");
if (alphaBbox(wordmarkLayerPath) !== recipe.wordmarkLayer.alphaBbox)
  fail("wordmark layer bbox drift");
if (recipe.wordmarkLayer.runtimeFontDependency !== false)
  fail("cover composition must not require an ambient font");

const version = run(["-version"]).stdout.split("\n", 1)[0];
if (!version.startsWith(recipe.encoding.verifiedVersionPrefix)) {
  fail(`unsupported ImageMagick encoder: ${version}`);
}

const workRoot = mkdtempSync(join(tmpdir(), "haros-guidebook-cover-compose."));
try {
  const markFromSvg = join(workRoot, "mark-from-svg.png");
  const markFromLayer = join(workRoot, "mark-from-layer.png");
  const recomposedPng = join(workRoot, "cover-recomposed.png");
  run([
    fieldPath,
    "(",
    canonicalMarkPath,
    "-resize",
    recipe.canonicalMark.resize,
    ")",
    "-geometry",
    recipe.canonicalMark.geometry,
    "-composite",
    "-strip",
    markFromSvg,
  ]);
  run([fieldPath, markLayerPath, "-composite", "-strip", markFromLayer]);
  const comparison = run(["compare", "-metric", "AE", markFromSvg, markFromLayer, "null:"], {
    allowDifference: true,
  });
  const markPixelDifference = comparison.stderr.trim().split(/\s+/, 1)[0];
  if (markPixelDifference !== "0") {
    fail(`canonical SVG to mark-layer pixel drift: AE=${markPixelDifference}`);
  }
  run([
    fieldPath,
    markLayerPath,
    "-composite",
    wordmarkLayerPath,
    "-composite",
    "-strip",
    recomposedPng,
  ]);
  mkdirSync(dirname(outputPath), { recursive: true });
  run([recomposedPng, "-strip", "-quality", String(recipe.encoding.jpegQuality), outputPath]);
  const finalHash = assertHash(outputPath, recipe.final.sha256, "recomposed cover");
  process.stdout.write(
    `${JSON.stringify({
      result: "PASS",
      fieldSha256: recipe.generatedField.sha256,
      canonicalMarkSha256: recipe.canonicalMark.sha256,
      markLayerSha256: recipe.markLayer.sha256,
      wordmarkLayerSha256: recipe.wordmarkLayer.sha256,
      markGeometry: recipe.canonicalMark.geometry,
      markPixelDifference: 0,
      jpegQuality: recipe.encoding.jpegQuality,
      imageMagick: version,
      finalSha256: finalHash,
    })}\n`,
  );
} finally {
  rmSync(workRoot, { recursive: true, force: true });
}
