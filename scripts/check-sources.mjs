#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseSourceAdoptions, validateSourceAdoptions } from "./sources.mjs";
import { repositoryFiles } from "./repository-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readme = await readFile(path.join(root, "README.md"), "utf8");
const trackedFiles = repositoryFiles(root);
const adoptions = parseSourceAdoptions(readme);
const errors = validateSourceAdoptions(adoptions, trackedFiles);

if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`${error}\n`);
  process.stderr.write(`source check failed with ${errors.length} finding(s)\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`source check passed: ${adoptions.length} adopted source(s)\n`);
}
