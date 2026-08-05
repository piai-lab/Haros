#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { repositoryFiles } from "./repository-files.mjs";
import { parseSourceAdoptions, pathContains } from "./sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_PATH_COUNT = 6425;
const EXPECTED_GLYPH_COUNTS = { line: 1979, fill: 2035 };
const EXPECTED_DISPOSITION_COUNTS = {
  "adapted-present": 1499,
  "adapted-removed": 771,
  "authorized-fill-glyph": 2035,
  "authorized-line-glyph": 1979,
  "excluded-non-product": 127,
  "public-surface-lineage": 14,
};
const EXPECTED_DISPOSITION_DIGEST =
  "8bae0a85911e3eb3080763ddce2cbd4411a7a19777ca52d342897616be965166";
const FIXED_STYLE_TREES = {
  line: "08fd7dfc4631902bf6d9a2415573e4a4d0e02873",
  fill: "932c44605d556210fdfb1b663807a921f590d8f0",
};

const PUBLIC_SURFACE_LINEAGE_SOURCES = new Set([
  "apps/marketing/astro.config.mjs",
  "apps/marketing/package.json",
  "apps/marketing/public/apple-touch-icon.png",
  "apps/marketing/public/favicon-16x16.png",
  "apps/marketing/public/favicon-32x32.png",
  "apps/marketing/public/favicon.ico",
  "apps/marketing/public/icon.png",
  "apps/marketing/public/screenshot.jpeg",
  "apps/marketing/src/components/PlatformIcon.astro",
  "apps/marketing/src/layouts/Layout.astro",
  "apps/marketing/src/lib/releases.ts",
  "apps/marketing/src/pages/download.astro",
  "apps/marketing/src/pages/index.astro",
  "apps/marketing/tsconfig.json",
]);

function publicSurfaceReentryTarget() {
  return "architecture/public-surface.md";
}

function git(args, { encoding = "utf8" } = {}) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`Git evidence lookup failed: git ${args.join(" ")}`);
  return result.stdout;
}

function treePaths(tree) {
  return git(["ls-tree", "-r", "-z", "--name-only", tree]).split("\0").filter(Boolean).toSorted();
}

function findTreePrefix(sourceTree, expectedTree) {
  const records = git(["ls-tree", "-r", "-t", "-z", sourceTree]).split("\0").filter(Boolean);
  const match = records.find((record) => {
    const metadata = record.slice(0, record.indexOf("\t"));
    const [, type, oid] = metadata.split(" ");
    return type === "tree" && oid === expectedTree;
  });
  if (!match)
    throw new Error(`fixed child tree is not reachable from source tree: ${expectedTree}`);
  return match.slice(match.indexOf("\t") + 1);
}

function targetFor(sourcePath, mappings) {
  const mapping = mappings.find(({ source }) => pathContains(source, sourcePath));
  if (!mapping) return null;
  const suffix = sourcePath.slice(mapping.source.length).replace(/^\//, "");
  return suffix ? `${mapping.target}/${suffix}` : mapping.target;
}

export function dispositionDigest(dispositions) {
  const records = dispositions
    .map(({ source, target, disposition }) => `${source}\0${target ?? ""}\0${disposition}`)
    .toSorted();
  return createHash("sha256").update(records.join("\n")).digest("hex");
}

export function assertDispositionClosure(dispositions) {
  if (dispositions.length !== EXPECTED_PATH_COUNT) {
    throw new Error(
      `expected ${EXPECTED_PATH_COUNT} disposition records, found ${dispositions.length}`,
    );
  }
  const counts = dispositions.reduce((result, entry) => {
    result[entry.disposition] = (result[entry.disposition] ?? 0) + 1;
    return result;
  }, {});
  const normalizedCounts = Object.fromEntries(Object.entries(counts).toSorted());
  if (JSON.stringify(normalizedCounts) !== JSON.stringify(EXPECTED_DISPOSITION_COUNTS)) {
    throw new Error(
      `source disposition counts drifted: expected ${JSON.stringify(EXPECTED_DISPOSITION_COUNTS)}, found ${JSON.stringify(normalizedCounts)}`,
    );
  }
  const digest = dispositionDigest(dispositions);
  if (digest !== EXPECTED_DISPOSITION_DIGEST) {
    throw new Error(
      `source disposition map drifted: expected ${EXPECTED_DISPOSITION_DIGEST}, found ${digest}`,
    );
  }
  return { counts: normalizedCounts, digest };
}

export async function main() {
  const readme = await readFile(path.join(ROOT, "README.md"), "utf8");
  const [adoption] = parseSourceAdoptions(readme);
  const historicalEntries = Object.entries(adoption?.provenance?.historicalTrees ?? {});
  if (historicalEntries.length !== 1) {
    throw new Error("source closure requires one immutable historical tree");
  }
  const [[historicalRoot, sourceTree]] = historicalEntries;
  const origins = adoption.provenance.origins ?? {};
  const mappings = Object.entries(origins)
    .map(([target, origin]) => {
      const prefix = `${historicalRoot}/`;
      if (!origin.sourcePath.startsWith(prefix)) {
        throw new Error(`adapted origin is outside the historical root: ${target}`);
      }
      return { target, source: origin.sourcePath.slice(prefix.length) };
    })
    .toSorted((left, right) => right.source.length - left.source.length);

  const sourcePaths = treePaths(sourceTree);
  if (sourcePaths.length !== EXPECTED_PATH_COUNT) {
    throw new Error(`expected ${EXPECTED_PATH_COUNT} immutable paths, found ${sourcePaths.length}`);
  }

  const stylePrefixes = Object.fromEntries(
    Object.entries(FIXED_STYLE_TREES).map(([style, tree]) => [
      style,
      findTreePrefix(sourceTree, tree),
    ]),
  );
  const dispositions = [];
  for (const source of sourcePaths) {
    if (PUBLIC_SURFACE_LINEAGE_SOURCES.has(source)) {
      const target = publicSurfaceReentryTarget(source, mappings);
      if (!existsSync(path.join(ROOT, target))) {
        throw new Error(`public-surface re-entry target is missing: ${source} -> ${target}`);
      }
      dispositions.push({ source, target, disposition: "public-surface-lineage" });
      continue;
    }

    const style = Object.keys(stylePrefixes).find((candidate) =>
      pathContains(stylePrefixes[candidate], source),
    );
    if (style) {
      const filename = source.slice(stylePrefixes[style].length).replace(/^\//, "");
      const target = `apps/web/public/icons/${style}/${filename}`;
      if (!existsSync(path.join(ROOT, target))) {
        throw new Error(`authorized glyph target is missing: ${target}`);
      }
      dispositions.push({ source, target, disposition: `authorized-${style}-glyph` });
      continue;
    }

    const target = targetFor(source, mappings);
    if (!target) {
      dispositions.push({ source, target: null, disposition: "excluded-non-product" });
      continue;
    }
    dispositions.push({
      source,
      target,
      disposition: existsSync(path.join(ROOT, target)) ? "adapted-present" : "adapted-removed",
    });
  }

  const { counts, digest: dispositionSha256 } = assertDispositionClosure(dispositions);
  for (const [style, expected] of Object.entries(EXPECTED_GLYPH_COUNTS)) {
    const actual = counts[`authorized-${style}-glyph`] ?? 0;
    if (actual !== expected) {
      throw new Error(`expected ${expected} ${style} glyph paths, found ${actual}`);
    }
  }

  const mirrorFiles = repositoryFiles(ROOT).filter((file) => pathContains(historicalRoot, file));
  if (mirrorFiles.length > 0) {
    throw new Error(
      `buildable historical source mirror still exists: ${historicalRoot}; ` +
        `observed ${mirrorFiles[0]}`,
    );
  }

  const output = {
    sourceTree,
    total: dispositions.length,
    dispositionSha256,
    counts,
    mappings,
    ...(process.argv.includes("--json") ? { dispositions } : {}),
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
