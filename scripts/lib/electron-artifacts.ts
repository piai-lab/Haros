import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, join } from "node:path";

import { resolveHarosBuildCacheRoot } from "./build-cache-path.ts";

export type ElectronBuildPlatform = "mac" | "linux" | "win";
export type ElectronBuildArch = "arm64" | "x64" | "universal";

const PROXY_ENV_KEYS = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"] as const;
const ALL_PROXY_ENV_KEYS = ["ALL_PROXY", "all_proxy"] as const;

export interface MacSystemProxy {
  readonly url: string;
  readonly kind: "https" | "http";
}

export type ElectronProxySource = "explicit" | "all-proxy" | "macos-system" | "direct";

export interface ElectronDownloadEnvironment {
  readonly environment: NodeJS.ProcessEnv;
  readonly proxySource: ElectronProxySource;
}

export interface AcquireElectronDistributionOptions {
  readonly version: string;
  readonly platform: ElectronBuildPlatform;
  readonly arch: ElectronBuildArch;
  readonly checksums: Readonly<Record<string, string>>;
  readonly repositoryRoot: string;
  readonly stageRoot: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly macSystemProxyOutput?: string;
  readonly spawn?: typeof spawnSync;
  readonly cacheRoot?: string;
}

export interface AcquiredElectronDistribution {
  readonly directory: string;
  readonly files: ReadonlyArray<string>;
  readonly proxySource: ElectronProxySource;
}

export function electronPlatformName(platform: ElectronBuildPlatform): NodeJS.Platform {
  switch (platform) {
    case "mac":
      return "darwin";
    case "win":
      return "win32";
    case "linux":
      return "linux";
  }
}

export function requiredElectronArchitectures(
  platform: ElectronBuildPlatform,
  arch: ElectronBuildArch,
): ReadonlyArray<Exclude<ElectronBuildArch, "universal">> {
  if (arch === "universal") {
    if (platform !== "mac") {
      throw new Error(`Universal Electron artifacts are only supported on macOS, not ${platform}.`);
    }
    return ["arm64", "x64"];
  }
  return [arch];
}

export function electronArtifactFileName(
  version: string,
  platform: ElectronBuildPlatform,
  arch: Exclude<ElectronBuildArch, "universal">,
): string {
  return `electron-v${version}-${electronPlatformName(platform)}-${arch}.zip`;
}

export function parseMacSystemProxy(output: string): MacSystemProxy | undefined {
  const values = new Map<string, string>();
  for (const line of output.split(/\r?\n/u)) {
    const match = /^\s*([A-Za-z]+)\s*:\s*(.*?)\s*$/u.exec(line);
    if (match?.[1] && match[2]) values.set(match[1], match[2]);
  }

  for (const candidate of [
    { enabled: "HTTPSEnable", host: "HTTPSProxy", port: "HTTPSPort", kind: "https" as const },
    { enabled: "HTTPEnable", host: "HTTPProxy", port: "HTTPPort", kind: "http" as const },
  ]) {
    if (values.get(candidate.enabled) !== "1") continue;
    const host = values.get(candidate.host)?.trim();
    const port = Number(values.get(candidate.port));
    if (!host || !Number.isInteger(port) || port < 1 || port > 65_535) continue;
    const normalizedHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
    return { url: `http://${normalizedHost}:${port}`, kind: candidate.kind };
  }
  return undefined;
}

export function resolveElectronDownloadEnvironment(
  environment: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
  macSystemProxyOutput?: string,
): ElectronDownloadEnvironment {
  const resolved = { ...environment };
  if (PROXY_ENV_KEYS.some((key) => Boolean(resolved[key]?.trim()))) {
    resolved.ELECTRON_GET_USE_PROXY = "1";
    resolved.ELECTRON_GET_NO_PROGRESS = "1";
    return { environment: resolved, proxySource: "explicit" };
  }

  const allProxy = ALL_PROXY_ENV_KEYS.map((key) => resolved[key]?.trim()).find(Boolean);
  if (allProxy) {
    let parsed: URL;
    try {
      parsed = new URL(allProxy);
    } catch {
      throw new Error("ALL_PROXY must be a valid HTTP(S) URL for Electron downloads.");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(
        `Electron downloads do not support ${parsed.protocol} ALL_PROXY endpoints; configure HTTP_PROXY or HTTPS_PROXY.`,
      );
    }
    resolved.HTTPS_PROXY = allProxy;
    resolved.HTTP_PROXY = allProxy;
    resolved.ELECTRON_GET_USE_PROXY = "1";
    resolved.ELECTRON_GET_NO_PROGRESS = "1";
    return { environment: resolved, proxySource: "all-proxy" };
  }

  const systemProxy =
    platform === "darwin" && macSystemProxyOutput
      ? parseMacSystemProxy(macSystemProxyOutput)
      : undefined;
  if (systemProxy) {
    resolved.HTTPS_PROXY = systemProxy.url;
    resolved.HTTP_PROXY = systemProxy.url;
    resolved.ELECTRON_GET_USE_PROXY = "1";
    resolved.ELECTRON_GET_NO_PROGRESS = "1";
    return { environment: resolved, proxySource: "macos-system" };
  }

  resolved.ELECTRON_GET_NO_PROGRESS = "1";
  return { environment: resolved, proxySource: "direct" };
}

export function readMacSystemProxyOutput(): string | undefined {
  if (process.platform !== "darwin") return undefined;
  const result = spawnSync("/usr/sbin/scutil", ["--proxy"], {
    encoding: "utf8",
    timeout: 5_000,
  });
  return result.status === 0 ? result.stdout : undefined;
}

function parseWorkerResult(result: SpawnSyncReturns<string>): string {
  if (result.error) {
    throw new Error(`Electron artifact resolver failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr]
      .filter((value) => value.trim().length > 0)
      .join("\n")
      .trim();
    throw new Error(
      `Electron artifact resolver failed with exit code ${result.status ?? "unknown"}${details ? `: ${details}` : ""}`,
    );
  }
  const payload = JSON.parse(result.stdout.trim().split(/\r?\n/u).at(-1) ?? "{}") as {
    artifactPath?: unknown;
  };
  if (typeof payload.artifactPath !== "string" || payload.artifactPath.length === 0) {
    throw new Error("Electron artifact resolver returned no artifact path.");
  }
  return payload.artifactPath;
}

export function sha256File(filePath: string): string {
  const descriptor = openSync(filePath, "r");
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (;;) {
      const bytesRead = readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    closeSync(descriptor);
  }
  return hash.digest("hex");
}

export function acquireElectronDistribution(
  options: AcquireElectronDistributionOptions,
): AcquiredElectronDistribution {
  const architectures = requiredElectronArchitectures(options.platform, options.arch);
  const downloadEnvironment = resolveElectronDownloadEnvironment(
    options.environment ?? process.env,
    process.platform,
    options.macSystemProxyOutput ?? readMacSystemProxyOutput(),
  );
  const directory = join(options.stageRoot, "electron-dist");
  const lockRoot = join(options.cacheRoot ?? resolveHarosBuildCacheRoot(), "electron-locks");
  const workerPath = join(options.repositoryRoot, "scripts", "download-electron-artifact.mjs");
  const run = options.spawn ?? spawnSync;
  mkdirSync(directory, { recursive: true });
  mkdirSync(lockRoot, { recursive: true });

  const files: string[] = [];
  for (const architecture of architectures) {
    const filename = electronArtifactFileName(options.version, options.platform, architecture);
    const checksum = options.checksums[filename]?.toLowerCase();
    if (!checksum || !/^[0-9a-f]{64}$/u.test(checksum)) {
      throw new Error(`Electron package does not provide a valid checksum for ${filename}.`);
    }
    const result = run(
      process.execPath,
      [
        workerPath,
        "--version",
        options.version,
        "--platform",
        electronPlatformName(options.platform),
        "--arch",
        architecture,
        "--filename",
        filename,
        "--checksum",
        checksum,
        "--lock-root",
        lockRoot,
      ],
      {
        cwd: options.repositoryRoot,
        encoding: "utf8",
        env: downloadEnvironment.environment,
        timeout: 240_000,
      },
    );
    const artifactPath = parseWorkerResult(result);
    if (!existsSync(artifactPath) || basename(artifactPath) !== filename) {
      throw new Error(`Electron artifact resolver returned an invalid path for ${filename}.`);
    }
    if (sha256File(artifactPath) !== checksum) {
      throw new Error(`Electron artifact resolver returned a checksum mismatch for ${filename}.`);
    }
    const destination = join(directory, filename);
    copyFileSync(artifactPath, destination);
    if (sha256File(destination) !== checksum) {
      throw new Error(`Staged Electron artifact failed checksum verification for ${filename}.`);
    }
    files.push(destination);
  }

  return { directory, files, proxySource: downloadEnvironment.proxySource };
}
