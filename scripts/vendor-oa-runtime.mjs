#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFile, cp, mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PI_REVISION = "b8b873b9872db04a938fb4357b5e8e824ddc051c";
const PI_VERSION = "0.84.4";
const PI_AI_INTEGRITY =
  "sha512-AClAZxf5+c4RRu44NJPS6wyQy+Nmq+Mzyyrdvm4ZVMNuixelO02RZX4G4Aq1F145Yzp43wnM5S+hLlSI7ypfVw==";
const PATCH_SHA256 = "414962fee6a6021cc43154a42ed279facc367299524b63f856ef7a03ed1bb3b8";
const STOCK_PATCH_SHA256 = "330b06f6fe4474953102ada8eb4e8326067c05108a9795625e5d399d05ea6a45";
const PRODUCT_ARCHIVE_NAME = `oa-runtime-${PI_VERSION}.tgz`;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
const PATCH_PATH = path.join(
  REPOSITORY_ROOT,
  "patches",
  "pi-coding-agent",
  `${PI_VERSION}-model-config-reader.patch`,
);
const STOCK_PATCH_PATH = path.join(
  REPOSITORY_ROOT,
  "patches",
  `@earendil-works%2Fpi-coding-agent@${PI_VERSION}.patch`,
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
  if (!source) fail("Usage: node scripts/vendor-oa-runtime.mjs --source <clean-pi-checkout>");
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

export function assertStockPatchDigest(patchBytes) {
  const observed = sha256(patchBytes);
  if (observed !== STOCK_PATCH_SHA256) {
    fail(`Stock Pi dependency patch digest must be ${STOCK_PATCH_SHA256}; observed ${observed}`);
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
    {
      cwd: worktree,
      // The exact artifact is already revision/integrity pinned by this generator.
      // Do not let the upstream checkout's floating release-age policy hide it.
      env: { npm_config_min_release_age: "0" },
    },
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
  manifest.name = "@harnessos/oa-runtime";
  manifest.description = `Haros OA runtime derived from Pi ${PI_VERSION}`;
  manifest.piConfig = { configDir: ".harnessos", name: "oa" };
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
  assertStockPatchDigest(await readFile(STOCK_PATCH_PATH));
  const source = await realpath(requestedSource);
  const revision = run("git", ["rev-parse", "HEAD"], { cwd: source });
  if (revision !== PI_REVISION) {
    fail(`Pi source revision must be ${PI_REVISION}; observed ${revision}`);
  }
  if (run("git", ["status", "--porcelain"], { cwd: source }) !== "") {
    fail("Pi source checkout must be clean");
  }

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "harnessos-oa-runtime-"));
  const worktree = path.join(temporaryRoot, "pi");
  try {
    run("git", ["clone", "--quiet", "--no-hardlinks", source, worktree]);
    run("git", ["checkout", "--quiet", PI_REVISION], { cwd: worktree });
    run("git", ["apply", "--check", PATCH_PATH], { cwd: worktree });
    run("git", ["apply", PATCH_PATH], { cwd: worktree });
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
        "test/model-session-prompt-outcome.test.ts",
        "test/default-tools-setting.test.ts",
        "test/suite/agent-session-prompt.test.ts",
        "test/package-manager.test.ts",
        "test/resource-loader.test.ts",
        "test/system-prompt.test.ts",
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
