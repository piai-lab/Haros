#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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

function tesseract(path) {
  const result = spawnSync(
    "tesseract",
    [path, "stdout", "-l", "eng", "--oem", "1", "--psm", "11"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) fail(`Tesseract failed for ${path}`);
  return result.stdout;
}

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const defaultGuideRoot = resolve(scriptRoot, "..");
const guideRoot = resolve(argument("--guide-root", defaultGuideRoot));
const repositoryRoot = resolve(argument("--repository-root", resolve(defaultGuideRoot, "../..")));
const recipe = JSON.parse(
  readFileSync(join(guideRoot, "assets/generated/sources/cover-01-composition.json"), "utf8"),
);
const tempRoot = mkdtempSync(join(tmpdir(), "haros-guidebook-cover-validate."));
try {
  const recomposed = join(tempRoot, "cover-01.jpg");
  const composed = spawnSync(
    "node",
    [
      join(scriptRoot, "compose-cover.mjs"),
      "--guide-root",
      guideRoot,
      "--repository-root",
      repositoryRoot,
      "--output",
      recomposed,
    ],
    { encoding: "utf8" },
  );
  if (composed.status !== 0) {
    process.stderr.write(composed.stdout);
    process.stderr.write(composed.stderr);
    fail("cover composition script failed");
  }
  const canonicalFinal = join(guideRoot, recipe.final.path);
  if (
    sha256(recomposed) !== recipe.final.sha256 ||
    sha256(canonicalFinal) !== recipe.final.sha256 ||
    !readFileSync(recomposed).equals(readFileSync(canonicalFinal))
  ) {
    fail("cover recomposition is not byte-identical to canonical final");
  }

  const fieldPath = join(guideRoot, recipe.generatedField.path);
  const fieldOcrPath = join(tempRoot, "field.png");
  copyFileSync(fieldPath, fieldOcrPath);
  const fieldOcr = tesseract(fieldOcrPath);
  const finalOcr = tesseract(recomposed);
  for (const text of recipe.generatedField.exactText) {
    if (fieldOcr.split(text).length !== 2) fail(`generated field OCR text drift: ${text}`);
  }
  for (const forbidden of recipe.generatedField.forbiddenText) {
    if (new RegExp(`\\b${forbidden}\\b`, "i").test(fieldOcr)) {
      fail(`generated field contains forbidden brand text: ${forbidden}`);
    }
  }
  for (const text of recipe.final.exactText) {
    if (finalOcr.split(text).length !== 2) fail(`final cover OCR text drift: ${text}`);
  }
  const proof = JSON.parse(composed.stdout.trim());
  if (proof.markPixelDifference !== 0 || proof.finalSha256 !== recipe.final.sha256) {
    fail("cover composition proof drift");
  }
  console.log(
    `cover-composition=PASS field=${proof.fieldSha256} canonical-mark=${proof.canonicalMarkSha256} mark-layer=${proof.markLayerSha256} wordmark-layer=${proof.wordmarkLayerSha256} geometry=${proof.markGeometry} mark-AE=0 final=${proof.finalSha256} OCR=field-subtitle-edition-only+final-Haros-Guidebook`,
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
