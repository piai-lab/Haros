#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveHarosBuildCacheRoot } from "../../../scripts/lib/build-cache-path.ts";

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDirectory = dirname(scriptPath);
const desktopDirectory = resolve(scriptsDirectory, "..");
const sourceDirectory = join(desktopDirectory, "native", "appsnap");
const deploymentTarget = "12.3";
const signingMode = "adhoc";

export const defaultAppSnapHelperPath = join(
  desktopDirectory,
  ".electron-runtime",
  "appsnap",
  "harnessos-appsnap-helper",
);

const frameworkArguments = [
  "-framework",
  "AppKit",
  "-framework",
  "CoreGraphics",
  "-framework",
  "CoreImage",
  "-framework",
  "CoreMedia",
  "-framework",
  "CoreVideo",
  "-framework",
  "ScreenCaptureKit",
];

export function swiftTargetsForArch(arch) {
  switch (arch) {
    case "arm64":
      return [{ arch: "arm64", target: `arm64-apple-macos${deploymentTarget}` }];
    case "x64":
      return [{ arch: "x64", target: `x86_64-apple-macos${deploymentTarget}` }];
    case "universal":
      return [
        { arch: "arm64", target: `arm64-apple-macos${deploymentTarget}` },
        { arch: "x64", target: `x86_64-apple-macos${deploymentTarget}` },
      ];
    default:
      throw new Error(`Unsupported AppSnap helper architecture: ${arch}`);
  }
}

function commandFailure(command, arguments_, result, purpose) {
  const details = [result.stdout, result.stderr]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .join("\n")
    .trim();
  return new Error(
    `${purpose} (${command} ${arguments_.join(" ")}): ${details || result.status || "unknown"}`,
  );
}

function run(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    cwd: desktopDirectory,
    encoding: "utf8",
    env: options.env ?? process.env,
  });
  if (result.status !== 0) {
    throw commandFailure(command, arguments_, result, "AppSnap helper command failed");
  }
}

function capture(command, arguments_) {
  const result = spawnSync(command, arguments_, {
    cwd: desktopDirectory,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    throw commandFailure(command, arguments_, result, "Could not inspect AppSnap toolchain");
  }
  return result.stdout.trim();
}

export function resolveAppSnapToolchainIdentity() {
  const swiftcPath = capture("xcrun", ["--find", "swiftc"]);
  return {
    swiftcPath,
    swiftcVersion: capture(swiftcPath, ["--version"]),
    xcodePath: capture("xcode-select", ["-p"]),
    xcodeVersion: capture("xcodebuild", ["-version"]),
    sdkPath: capture("xcrun", ["--sdk", "macosx", "--show-sdk-path"]),
    sdkVersion: capture("xcrun", ["--sdk", "macosx", "--show-sdk-version"]),
  };
}

export function buildFingerprint({ arch, release, sources, targets, toolchain }) {
  const hash = createHash("sha256");
  hash.update("harnessos-appsnap-helper-build-v3\0");
  hash.update(
    JSON.stringify({
      arch,
      release,
      targets,
      deploymentTarget,
      frameworkArguments,
      signingMode,
      toolchain,
    }),
  );
  hash.update("\0");
  hash.update(readFileSync(scriptPath));
  for (const source of sources) {
    hash.update("\0");
    hash.update(relative(sourceDirectory, source));
    hash.update("\0");
    hash.update(readFileSync(source));
  }
  return hash.digest("hex");
}

function architecturesForTargets(targets) {
  return targets.map((target) => target.arch).toSorted();
}

function isUsableCachedBuild(outputPath, metadataPath, fingerprint, expectedArchitectures) {
  if (!existsSync(outputPath) || !existsSync(metadataPath)) return false;
  try {
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    if (metadata.fingerprint !== fingerprint) return false;
    if (spawnSync("codesign", ["--verify", "--strict", outputPath]).status !== 0) return false;
    const signatureProbe = spawnSync("codesign", ["-dv", "--verbose=4", outputPath], {
      encoding: "utf8",
    });
    if (signatureProbe.status !== 0) return false;
    const signatureDetails = `${signatureProbe.stdout ?? ""}\n${signatureProbe.stderr ?? ""}`;
    if (!/Signature=adhoc|TeamIdentifier=not set/u.test(signatureDetails)) return false;
    const architectureProbe = spawnSync("xcrun", ["lipo", "-archs", outputPath], {
      encoding: "utf8",
    });
    if (architectureProbe.status !== 0) return false;
    const actualArchitectures = architectureProbe.stdout
      .trim()
      .split(/\s+/u)
      .filter(Boolean)
      .toSorted();
    return JSON.stringify(actualArchitectures) === JSON.stringify(expectedArchitectures);
  } catch {
    return false;
  }
}

function publishBuild(sourcePath, outputPath, metadataPath, fingerprint) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const nonce = `${process.pid}-${Date.now()}`;
  const pendingOutputPath = `${outputPath}.tmp-${nonce}`;
  const pendingMetadataPath = `${metadataPath}.tmp-${nonce}`;
  try {
    copyFileSync(sourcePath, pendingOutputPath);
    chmodSync(pendingOutputPath, 0o755);
    writeFileSync(pendingMetadataPath, `${JSON.stringify({ fingerprint })}\n`, { mode: 0o600 });
    rmSync(outputPath, { force: true });
    rmSync(metadataPath, { force: true });
    renameSync(pendingOutputPath, outputPath);
    renameSync(pendingMetadataPath, metadataPath);
  } finally {
    rmSync(pendingOutputPath, { force: true });
    rmSync(pendingMetadataPath, { force: true });
  }
}

export function withBuildLock(lockDirectory, work, options = {}) {
  const timeoutAt = Date.now() + (options.timeoutMs ?? 240_000);
  const staleMs = options.staleMs ?? 300_000;
  const waitMs = options.waitMs ?? 100;
  for (;;) {
    try {
      mkdirSync(lockDirectory, { recursive: false, mode: 0o700 });
      break;
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
      try {
        if (Date.now() - statSync(lockDirectory).mtimeMs > staleMs) {
          rmSync(lockDirectory, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() >= timeoutAt) {
        throw new Error("Timed out waiting for the AppSnap build cache lock.", { cause: error });
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
    }
  }
  try {
    return work();
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
}

export function buildAppSnapHelper({
  arch = process.arch,
  outputPath = defaultAppSnapHelperPath,
  release = false,
  quiet = false,
} = {}) {
  if (process.platform !== "darwin")
    throw new Error("The AppSnap helper can only be built on macOS.");

  const targets = swiftTargetsForArch(arch);
  const sources = readdirSync(sourceDirectory)
    .filter((name) => name.endsWith(".swift"))
    .toSorted()
    .map((name) => join(sourceDirectory, name));
  if (sources.length === 0) throw new Error(`No Swift sources found in ${sourceDirectory}.`);

  const resolvedOutputPath = resolve(outputPath);
  const metadataPath = `${resolvedOutputPath}.build.json`;
  const toolchain = resolveAppSnapToolchainIdentity();
  const fingerprint = buildFingerprint({ arch, release, sources, targets, toolchain });
  const expectedArchitectures = architecturesForTargets(targets);
  if (isUsableCachedBuild(resolvedOutputPath, metadataPath, fingerprint, expectedArchitectures)) {
    if (!quiet) console.error(`[appsnap] Reusing ${arch} Swift helper at ${resolvedOutputPath}`);
    return resolvedOutputPath;
  }

  const cacheRoot = join(resolveHarosBuildCacheRoot(), "appsnap");
  const sharedCacheDirectory = join(cacheRoot, fingerprint);
  const sharedCachePath = join(sharedCacheDirectory, "harnessos-appsnap-helper");
  const sharedMetadataPath = `${sharedCachePath}.build.json`;
  const lockDirectory = join(cacheRoot, "locks", `${fingerprint}.lock`);
  mkdirSync(dirname(lockDirectory), { recursive: true });

  return withBuildLock(lockDirectory, () => {
    if (
      isUsableCachedBuild(sharedCachePath, sharedMetadataPath, fingerprint, expectedArchitectures)
    ) {
      publishBuild(sharedCachePath, resolvedOutputPath, metadataPath, fingerprint);
      if (!quiet) console.error(`[appsnap] Restored ${arch} Swift helper from build cache`);
      return resolvedOutputPath;
    }

    const temporaryDirectory = mkdtempSync(join(tmpdir(), "harnessos-appsnap-helper-"));
    const moduleCacheDirectory = join(temporaryDirectory, "module-cache");
    const buildEnvironment = {
      ...process.env,
      CLANG_MODULE_CACHE_PATH: moduleCacheDirectory,
      SWIFT_MODULECACHE_PATH: moduleCacheDirectory,
    };

    try {
      const thinBinaries = [];
      for (const target of targets) {
        const thinBinary = join(temporaryDirectory, `harnessos-appsnap-helper-${target.arch}`);
        run(
          "xcrun",
          [
            "swiftc",
            ...(release ? ["-O", "-whole-module-optimization"] : ["-Onone", "-g"]),
            "-module-name",
            "HarosAppSnapHelper",
            "-target",
            target.target,
            ...frameworkArguments,
            ...sources,
            "-o",
            thinBinary,
          ],
          { env: buildEnvironment },
        );
        thinBinaries.push(thinBinary);
      }

      const unsignedBinary = join(temporaryDirectory, "harnessos-appsnap-helper");
      if (thinBinaries.length === 1) copyFileSync(thinBinaries[0], unsignedBinary);
      else run("xcrun", ["lipo", "-create", ...thinBinaries, "-output", unsignedBinary]);
      run("codesign", ["--force", "--sign", "-", "--timestamp=none", unsignedBinary]);

      mkdirSync(sharedCacheDirectory, { recursive: true });
      publishBuild(unsignedBinary, sharedCachePath, sharedMetadataPath, fingerprint);
      if (
        !isUsableCachedBuild(
          sharedCachePath,
          sharedMetadataPath,
          fingerprint,
          expectedArchitectures,
        )
      ) {
        throw new Error("Published AppSnap build failed codesign or architecture verification.");
      }
      publishBuild(sharedCachePath, resolvedOutputPath, metadataPath, fingerprint);
      if (
        !isUsableCachedBuild(resolvedOutputPath, metadataPath, fingerprint, expectedArchitectures)
      ) {
        throw new Error("Staged AppSnap build failed codesign or architecture verification.");
      }

      if (!quiet) {
        console.error(
          `[appsnap] Built ${arch} Swift helper for macOS ${deploymentTarget}+ at ${resolvedOutputPath}`,
        );
      }
      return resolvedOutputPath;
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
}

function parseCommandLine(arguments_) {
  let arch = process.arch;
  let outputPath = defaultAppSnapHelperPath;
  let release = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    switch (arguments_[index]) {
      case "--arch":
        arch = arguments_[++index];
        if (!arch) throw new Error("--arch requires arm64, x64, or universal.");
        break;
      case "--output":
        outputPath = arguments_[++index];
        if (!outputPath) throw new Error("--output requires a path.");
        break;
      case "--release":
        release = true;
        break;
      default:
        throw new Error(`Unknown AppSnap helper build argument: ${arguments_[index]}`);
    }
  }
  return { arch, outputPath, release };
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  try {
    buildAppSnapHelper(parseCommandLine(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
