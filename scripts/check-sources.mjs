#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseSourceAdoptions, validateSourceAdoptions } from "./sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readme = await readFile(path.join(root, "README.md"), "utf8");
const trackedResult = spawnSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8" },
);

if (trackedResult.status !== 0) {
  throw new Error("cannot enumerate tracked files");
}

const trackedFiles = [...new Set(trackedResult.stdout.split("\0").filter(Boolean))];
const adoptions = parseSourceAdoptions(readme);
const errors = validateSourceAdoptions(adoptions, trackedFiles);

if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`${error}\n`);
  process.stderr.write(`source check failed with ${errors.length} finding(s)\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`source check passed: ${adoptions.length} adopted source(s)\n`);
}
