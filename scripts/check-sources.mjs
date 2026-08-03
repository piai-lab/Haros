#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseStructurePolicy } from "./identity.mjs";
import { repositoryFiles } from "./repository-files.mjs";
import {
  ignoredVendorSourceFiles,
  parseSourceAdoptions,
  trackedRepositoryFiles,
  validateSourceRepository,
} from "./sources.mjs";

function parseArguments(argv) {
  let candidate = "HEAD";
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--candidate" && argv[index + 1]) {
      candidate = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`unknown or incomplete argument: ${argv[index]}`);
  }
  return { candidate };
}

export async function main(argv = process.argv.slice(2)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { candidate } = parseArguments(argv);
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const inventoryFiles = repositoryFiles(root);
  const trackedFiles = trackedRepositoryFiles(root);
  const adoptions = parseSourceAdoptions(readme);
  const structurePolicy = parseStructurePolicy(readme);
  const ignoredVendorFiles = ignoredVendorSourceFiles(
    root,
    structurePolicy.generatedDirectoryNames,
  );
  const result = validateSourceRepository({
    root,
    adoptions,
    trackedFiles,
    inventoryFiles,
    ignoredVendorFiles,
    toolRoots: structurePolicy.toolRoots,
    candidate,
  });

  if (result.errors.length > 0) {
    for (const error of result.errors) process.stderr.write(`${error}\n`);
    process.stderr.write(`source check failed with ${result.errors.length} finding(s)\n`);
    return 1;
  }

  process.stdout.write(
    `source check passed: ${adoptions.length} adopted source(s), ` +
      `${result.exactRoots.length} exact provenance root(s)\n`,
  );
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
