#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFile, cp, mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PI_REVISION = "53fa77ccd8a279eb87e92294ef3687b03ff80112";
const PI_VERSION = "0.84.1";
const PI_AI_INTEGRITY =
  "sha512-wMsAdJMxuNri08vLqTyYVI201DQQezGhPSTkzYsHdw5dYX3rCNwEmSvpaAwhi7ELKI/2tE/CEgSWg/6iRxSgdQ==";
const PATCH_SHA256 = "b4ae9fc5fcf82d59a95d69a39e9dcea95537d11e319ac09acdd18935769d4ca5";
const PRODUCT_ARCHIVE_NAME = `omnimind-pi-coding-agent-${PI_VERSION}.tgz`;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
const PATCH_PATH = path.join(
  REPOSITORY_ROOT,
  "patches",
  "pi-coding-agent",
  `${PI_VERSION}-model-config-reader.patch`,
);

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ? { ...process.env, ...options.env } : process.env,
    encoding: options.encoding ?? "utf8",
    input: options.input,
    maxBuffer: 64 * 1024 * 1024,
    stdio: options.capture === false ? "inherit" : "pipe",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
    fail(`${command} ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`);
  }
  return typeof result.stdout === "string" ? result.stdout.trim() : "";
}

function parseArguments(argv) {
  let source;
  let output = path.join(REPOSITORY_ROOT, "vendor", PRODUCT_ARCHIVE_NAME);
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--source") {
      source = argv[++index];
    } else if (argument === "--output") {
      output = path.resolve(argv[++index] ?? "");
    } else {
      fail(`Unknown argument: ${argument}`);
    }
  }
  if (!source)
    fail("Usage: node scripts/vendor-omnimind-pi-runtime.mjs --source <clean-pi-checkout>");
  return { source: path.resolve(source), output };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha512Integrity(bytes) {
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}

export function assertPatchDigest(patchBytes) {
  const observed = sha256(patchBytes);
  if (observed !== PATCH_SHA256) {
    fail(`Pi source patch digest must be ${PATCH_SHA256}; observed ${observed}`);
  }
  return observed;
}

async function prepareGeneratedModelData(worktree, temporaryRoot) {
  const artifacts = path.join(temporaryRoot, "artifacts");
  const extracted = path.join(temporaryRoot, "pi-ai-package");
  await mkdir(artifacts, { recursive: true });
  await mkdir(extracted, { recursive: true });
  const archiveName = run(
    "npm",
    ["pack", `@earendil-works/pi-ai@${PI_VERSION}`, "--pack-destination", artifacts, "--silent"],
    { cwd: worktree },
  )
    .split("\n")
    .at(-1);
  if (!archiveName) fail("npm did not produce the pinned pi-ai archive");
  const archivePath = path.join(artifacts, archiveName);
  const archiveBytes = await readFile(archivePath);
  if (sha512Integrity(archiveBytes) !== PI_AI_INTEGRITY) {
    fail("Pinned pi-ai archive integrity did not match the adoption record");
  }
  run("tar", ["-xzf", archivePath, "-C", extracted]);
  await cp(
    path.join(extracted, "package", "dist", "providers", "data"),
    path.join(worktree, "packages", "ai", "src", "providers", "data"),
    { recursive: true, force: true },
  );
}

async function writeProductManifest(worktree) {
  const manifestPath = path.join(worktree, "packages", "coding-agent", "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.name = "@omnimind/pi-coding-agent";
  manifest.description = `OmniMind product-owned Pi ${PI_VERSION} runtime`;
  manifest.piConfig = { configDir: ".omnimind", name: "omnimind" };
  manifest.files = ["dist", "LICENSE"];
  delete manifest.bin;
  delete manifest.scripts;
  delete manifest.devDependencies;
  for (const dependency of [
    "@earendil-works/pi-agent-core",
    "@earendil-works/pi-ai",
    "@earendil-works/pi-client",
    "@earendil-works/pi-protocol",
    "@earendil-works/pi-tui",
  ]) {
    if (!(dependency in manifest.dependencies))
      fail(`Missing expected Pi-family dependency: ${dependency}`);
    manifest.dependencies[dependency] = PI_VERSION;
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, "\t")}\n`, "utf8");
  await copyFile(
    path.join(worktree, "LICENSE"),
    path.join(worktree, "packages", "coding-agent", "LICENSE"),
  );
}

async function packProductArchive(worktree, destination) {
  await mkdir(destination, { recursive: true });
  const packageDir = path.join(worktree, "packages", "coding-agent");
  const archiveName = run("npm", ["pack", "--pack-destination", destination, "--silent"], {
    cwd: packageDir,
  })
    .split("\n")
    .at(-1);
  if (!archiveName) fail("npm did not produce the product runtime archive");
  return path.join(destination, archiveName);
}

async function main() {
  const { source: requestedSource, output } = parseArguments(process.argv.slice(2));
  const patchBytes = await readFile(PATCH_PATH);
  const patchSha256 = assertPatchDigest(patchBytes);
  const source = await realpath(requestedSource);
  const revision = run("git", ["rev-parse", "HEAD"], { cwd: source });
  if (revision !== PI_REVISION) {
    fail(`Pi source revision must be ${PI_REVISION}; observed ${revision}`);
  }
  if (run("git", ["status", "--porcelain"], { cwd: source }) !== "") {
    fail("Pi source checkout must be clean");
  }

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "omnimind-pi-vendor-"));
  const worktree = path.join(temporaryRoot, "pi");
  try {
    run("git", ["clone", "--quiet", "--no-hardlinks", source, worktree]);
    run("git", ["checkout", "--quiet", PI_REVISION], { cwd: worktree });
    run("git", ["apply", "--unidiff-zero", "--check", PATCH_PATH], { cwd: worktree });
    run("git", ["apply", "--unidiff-zero", PATCH_PATH], { cwd: worktree });
    run("npm", ["ci", "--ignore-scripts"], { cwd: worktree, capture: false });
    await prepareGeneratedModelData(worktree, temporaryRoot);
    run("npm", ["run", "build:offline"], { cwd: worktree, capture: false });
    run(
      "npx",
      [
        "vitest",
        "run",
        "test/model-config-mutation.test.ts",
        "test/model-runtime-config-reader.test.ts",
        "test/model-registry.test.ts",
        "test/model-runtime-modify-models-compat.test.ts",
        "test/package-manager.test.ts",
        "test/resource-loader.test.ts",
      ],
      {
        cwd: path.join(worktree, "packages", "coding-agent"),
        capture: false,
        env: { PI_OFFLINE: "1" },
      },
    );
    await writeProductManifest(worktree);

    const firstArchive = await packProductArchive(worktree, path.join(temporaryRoot, "pack-one"));
    const secondArchive = await packProductArchive(worktree, path.join(temporaryRoot, "pack-two"));
    const firstBytes = await readFile(firstArchive);
    const secondBytes = await readFile(secondArchive);
    if (!firstBytes.equals(secondBytes))
      fail("Product runtime archive generation is not deterministic");

    await mkdir(path.dirname(output), { recursive: true });
    await copyFile(firstArchive, output);
    console.log(
      JSON.stringify(
        {
          revision: PI_REVISION,
          patch: path.relative(REPOSITORY_ROOT, PATCH_PATH),
          patchSha256,
          output,
          bytes: firstBytes.byteLength,
          sha256: sha256(firstBytes),
          integrity: sha512Integrity(firstBytes),
        },
        null,
        2,
      ),
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
