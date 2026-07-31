#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { scanIdentity } from "./identity.mjs";

function parseArguments(argv) {
  const runtimeFixtures = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--runtime-fixture" || !argv[index + 1]) {
      throw new Error(`unknown or incomplete argument: ${argv[index]}`);
    }
    runtimeFixtures.push(argv[index + 1]);
    index += 1;
  }
  return runtimeFixtures;
}

function candidateFiles(root) {
  const result = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error("cannot enumerate tracked files");
  }
  return [...new Set(result.stdout.split("\0").filter(Boolean))];
}

export async function main(argv = process.argv.slice(2)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const runtimeFixtures = parseArguments(argv);
  const files = candidateFiles(root);
  const result = await scanIdentity({
    root,
    trackedFiles: files,
    runtimeFixtures,
  });

  if (result.findings.length > 0) {
    for (const finding of result.findings) {
      process.stderr.write(
        `${finding.path}:${finding.line}:${finding.column} ` +
          `[${finding.category}/${finding.surface}] forbidden identity rule ${JSON.stringify(finding.rule)}\n`,
      );
    }
    process.stderr.write(`identity check failed with ${result.findings.length} finding(s)\n`);
    return 1;
  }

  process.stdout.write(
    `identity check passed: ${files.length} candidate file(s), ${result.rules.length} rule(s)\n`,
  );
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
