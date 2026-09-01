#!/usr/bin/env node

import { downloadArtifact } from "@electron/get";
import lockfile from "proper-lockfile";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const OFFICIAL_ELECTRON_MIRROR = "https://github.com/electron/electron/releases/download/";

function parseArguments(arguments_) {
  const result = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid Electron artifact argument: ${key ?? "<missing>"}`);
    }
    result[key.slice(2)] = value;
  }
  for (const key of ["version", "platform", "arch", "filename", "checksum", "lock-root"]) {
    if (!result[key]) throw new Error(`Missing required Electron artifact argument: --${key}`);
  }
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  mkdirSync(options["lock-root"], { recursive: true });
  const lockTarget = join(
    options["lock-root"],
    `${options.version}-${options.platform}-${options.arch}.lock-target`,
  );
  if (!existsSync(lockTarget)) {
    mkdirSync(dirname(lockTarget), { recursive: true });
    writeFileSync(lockTarget, "", { flag: "a", mode: 0o600 });
  }

  const release = await lockfile.lock(lockTarget, {
    realpath: false,
    stale: 300_000,
    update: 10_000,
    retries: { retries: 40, factor: 1.2, minTimeout: 100, maxTimeout: 1_000, randomize: true },
  });

  try {
    const artifactPath = await downloadArtifact({
      version: options.version,
      platform: options.platform,
      arch: options.arch,
      artifactName: "electron",
      checksums: { [options.filename]: options.checksum },
      mirrorOptions: { mirror: OFFICIAL_ELECTRON_MIRROR },
      downloadOptions: { quiet: true, signal: AbortSignal.timeout(180_000) },
    });
    process.stdout.write(`${JSON.stringify({ artifactPath })}\n`);
  } finally {
    await release();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
