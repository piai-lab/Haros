#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseStructurePolicy, scanIdentity } from "./identity.mjs";
import { repositoryFiles } from "./repository-files.mjs";
import {
  ignoredVendorSourceFiles,
  pathContains,
  parseSourceAdoptions,
  trackedRepositoryFiles,
  validateSourceRepository,
} from "./sources.mjs";

const WALK_EXCLUSIONS = new Set([".git", ".pnpm", ".yarn", "node_modules"]);

function parseArguments(argv) {
  const runtimeFixtures = [];
  const generatedRoots = [];
  let candidate = "HEAD";
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--runtime-fixture" && argv[index + 1]) {
      runtimeFixtures.push(argv[index + 1]);
      index += 1;
      continue;
    }
    if (argv[index] === "--candidate" && argv[index + 1]) {
      candidate = argv[index + 1];
      index += 1;
      continue;
    }
    if (argv[index] === "--generated-root" && argv[index + 1]) {
      generatedRoots.push(argv[index + 1]);
      index += 1;
      continue;
    }
    {
      throw new Error(`unknown or incomplete argument: ${argv[index]}`);
    }
  }
  return { candidate, generatedRoots, runtimeFixtures };
}

function withinRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function collectFiles(root, directory, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(root, absolute, files);
    } else if (entry.isFile()) {
      files.add(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
}

async function discoverGeneratedRoots(root, directoryNames, explicitRoots, excludedRoots) {
  const roots = new Set();
  const generatedNames = new Set(directoryNames);

  for (const requested of explicitRoots) {
    const absolute = path.resolve(root, requested);
    if (!withinRoot(root, absolute) || !(await stat(absolute)).isDirectory()) {
      throw new Error(`generated root must be an existing directory inside the repository: ${requested}`);
    }
    roots.add(absolute);
  }

  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || WALK_EXCLUSIONS.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (excludedRoots.some((excludedRoot) => pathContains(excludedRoot, relative))) continue;
      if (generatedNames.has(entry.name)) {
        roots.add(absolute);
      } else {
        await walk(absolute);
      }
    }
  }

  await walk(root);
  return [...roots];
}

export async function discoverGeneratedFiles(
  root,
  policy,
  explicitRoots = [],
  excludedRoots = [],
) {
  const files = new Set();
  const roots = await discoverGeneratedRoots(
    root,
    policy.generatedDirectoryNames,
    explicitRoots,
    excludedRoots,
  );
  for (const directory of roots) {
    await collectFiles(root, directory, files);
  }
  return [...files].sort();
}

export async function main(argv = process.argv.slice(2)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { candidate, generatedRoots, runtimeFixtures } = parseArguments(argv);
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const structurePolicy = parseStructurePolicy(readme);
  const inventoryFiles = repositoryFiles(root);
  const trackedFiles = trackedRepositoryFiles(root);
  const adoptions = parseSourceAdoptions(readme);
  const ignoredVendorFiles = ignoredVendorSourceFiles(
    root,
    structurePolicy.generatedDirectoryNames,
  );
  const sourcePolicy = validateSourceRepository({
    root,
    adoptions,
    trackedFiles,
    inventoryFiles,
    ignoredVendorFiles,
    toolRoots: structurePolicy.toolRoots,
    candidate,
  });
  if (sourcePolicy.errors.length > 0) {
    for (const error of sourcePolicy.errors) process.stderr.write(`${error}\n`);
    process.stderr.write(
      `identity/structure check stopped on ${sourcePolicy.errors.length} source finding(s)\n`,
    );
    return 1;
  }

  const excludedRoots = [...sourcePolicy.exactRoots, ...structurePolicy.toolRoots];
  const generated = await discoverGeneratedFiles(
    root,
    structurePolicy,
    generatedRoots,
    excludedRoots,
  );
  const generatedSet = new Set(generated);
  const source = inventoryFiles.filter((file) => !generatedSet.has(file));
  const result = await scanIdentity({
    root,
    sourceFiles: source,
    generatedFiles: generated,
    runtimeFixtures,
    exactRoots: sourcePolicy.exactRoots,
  });

  if (result.findings.length > 0) {
    for (const finding of result.findings) {
      process.stderr.write(
        `${finding.path}:${finding.line}:${finding.column} ` +
          `[${finding.category}/${finding.surface}] repository policy rule ` +
          `${JSON.stringify(finding.rule)}\n`,
      );
    }
    process.stderr.write(`identity check failed with ${result.findings.length} finding(s)\n`);
    return 1;
  }

  process.stdout.write(
    `identity/structure check passed: ${source.length} source file(s), ` +
      `${generated.length} generated file(s), ${result.rules.length} identity rule(s), ` +
      `max depth ${result.structurePolicy.maxDirectoryDepth}\n`,
  );
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
