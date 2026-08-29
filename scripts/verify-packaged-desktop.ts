#!/usr/bin/env node
// FILE: verify-packaged-desktop.ts
// Purpose: Proves a packaged desktop payload from an isolated temporary tree before upload.
// Layer: Packaged verification script

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
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
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { extractFile } from "@electron/asar";
import type { CommandId, ProjectId, ThreadId } from "@harnessos/contracts";

import {
  connectPackagedRendererCdp,
  type PackagedProofCdpSession,
} from "./lib/packaged-proof-cdp.ts";
import { connectPackagedProofRpc, type PackagedProofRpcSession } from "./lib/packaged-proof-rpc.ts";
import { redactPackagedProofSecrets } from "./lib/packaged-proof-secrets.ts";

export type PackagedDesktopPlatform = "linux" | "mac" | "win";

export type PackagedDesktopProof = "startup" | "journey";

export interface PackagedDesktopProofOptions {
  readonly assetsDirectory: string;
  readonly platform: PackagedDesktopPlatform;
  readonly arch: string;
  readonly version: string;
  readonly sourceCommit: string;
  readonly proof: PackagedDesktopProof;
  readonly timeoutMs: number;
}

interface PackagedProofLeaseOwner {
  readonly pid: number;
  readonly sourceCommit: string;
  readonly token: string;
}

export interface PackagedProofLease {
  readonly release: () => void;
}

const PACKAGED_PROOF_LEASE_DIRECTORY = "harnessos-packaged-proof.lock";
const PACKAGED_PROOF_LEASE_OWNER_FILE = "owner.json";

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "EPERM";
  }
}

function readPackagedProofLeaseOwner(leaseDirectory: string): PackagedProofLeaseOwner | null {
  try {
    const parsed = JSON.parse(
      readFileSync(join(leaseDirectory, PACKAGED_PROOF_LEASE_OWNER_FILE), "utf8"),
    ) as Partial<PackagedProofLeaseOwner>;
    if (
      !Number.isInteger(parsed.pid) ||
      typeof parsed.sourceCommit !== "string" ||
      typeof parsed.token !== "string"
    ) {
      return null;
    }
    return parsed as PackagedProofLeaseOwner;
  } catch {
    return null;
  }
}

export function acquirePackagedProofLease(
  sourceCommit: string,
  leaseParentDirectory = tmpdir(),
): PackagedProofLease {
  const leaseDirectory = join(leaseParentDirectory, PACKAGED_PROOF_LEASE_DIRECTORY);
  const owner: PackagedProofLeaseOwner = {
    pid: process.pid,
    sourceCommit,
    token: randomUUID(),
  };

  const acquire = (): boolean => {
    try {
      mkdirSync(leaseDirectory);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "EEXIST") {
        return false;
      }
      throw error;
    }
    try {
      writeFileSync(
        join(leaseDirectory, PACKAGED_PROOF_LEASE_OWNER_FILE),
        `${JSON.stringify(owner)}\n`,
        { flag: "wx" },
      );
      return true;
    } catch (error) {
      rmSync(leaseDirectory, { recursive: true, force: true });
      throw error;
    }
  };

  if (!acquire()) {
    const existingOwner = readPackagedProofLeaseOwner(leaseDirectory);
    if (!existingOwner || isProcessAlive(existingOwner.pid)) {
      const ownerDescription = existingOwner
        ? `pid=${existingOwner.pid}, source=${existingOwner.sourceCommit.slice(0, 12)}`
        : "owner metadata is not yet available";
      throw new Error(
        `Another HarnessOS packaged proof owns this host (${ownerDescription}). Wait for it to finish; do not terminate unrelated HarnessOS processes.`,
      );
    }

    const staleDirectory = `${leaseDirectory}.stale-${randomUUID()}`;
    try {
      // Renaming first prevents stale-owner cleanup from deleting a lease that
      // another process acquired concurrently.
      renameSync(leaseDirectory, staleDirectory);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
    rmSync(staleDirectory, { recursive: true, force: true });
    if (!acquire()) {
      throw new Error("Another HarnessOS packaged proof acquired this host concurrently.");
    }
  }

  return {
    release: () => {
      const currentOwner = readPackagedProofLeaseOwner(leaseDirectory);
      if (currentOwner?.token === owner.token) {
        rmSync(leaseDirectory, { recursive: true, force: true });
      }
    },
  };
}

function removePackagedProofTemporaryRoot(temporaryRoot: string): void {
  try {
    rmSync(temporaryRoot, {
      recursive: true,
      force: true,
      maxRetries: process.platform === "win32" ? 20 : 0,
      retryDelay: process.platform === "win32" ? 250 : 100,
    });
  } catch (error) {
    if (
      process.platform !== "win32" ||
      !(error instanceof Error && "code" in error && error.code === "EPERM")
    ) {
      throw error;
    }
    console.warn(
      `Could not remove Windows smoke temp directory; leaving it for runner cleanup: ${temporaryRoot}`,
    );
  }
}

function releasePackagedProofResources(
  temporaryRoot: string | undefined,
  proofLease: PackagedProofLease,
): void {
  try {
    if (temporaryRoot) removePackagedProofTemporaryRoot(temporaryRoot);
  } finally {
    proofLease.release();
  }
}

// A release smoke must not become an ambient credential consumer. Keep only
// operating-system/session values required to start a GUI process; product and
// provider authority is deliberately absent.
const PACKAGED_PROOF_INHERITED_ENV_ALLOWLIST = [
  "PATH",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "SHELL",
  "USER",
  "LOGNAME",
  "USERNAME",
  "SystemRoot",
  "windir",
  "ComSpec",
  "PATHEXT",
  "DISPLAY",
  "WAYLAND_DISPLAY",
  "XAUTHORITY",
  "XDG_RUNTIME_DIR",
  "DBUS_SESSION_BUS_ADDRESS",
  "PULSE_SERVER",
] as const;

function selectPackagedProofInheritedEnvironment(
  inheritedEnvironment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const selected: NodeJS.ProcessEnv = {};
  for (const name of PACKAGED_PROOF_INHERITED_ENV_ALLOWLIST) {
    const value = inheritedEnvironment[name];
    if (value) selected[name] = value;
  }
  return selected;
}

export function parsePackagedDesktopArgs(argv: ReadonlyArray<string>): PackagedDesktopProofOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith("--") || value === undefined || values.has(name)) {
      throw new Error(`Invalid packaged proof argument near ${name ?? "<end>"}.`);
    }
    values.set(name, value);
  }
  const known = new Set([
    "--assets-dir",
    "--platform",
    "--arch",
    "--version",
    "--source-commit",
    "--proof",
    "--timeout-ms",
  ]);
  for (const name of values.keys()) {
    if (!known.has(name)) throw new Error(`Unknown packaged proof argument: ${name}.`);
  }
  const required = (name: string): string => {
    const value = values.get(name)?.trim();
    if (!value) throw new Error(`Missing packaged proof argument: ${name}.`);
    return value;
  };
  const platform = required("--platform");
  if (platform !== "linux" && platform !== "mac" && platform !== "win") {
    throw new Error(`Unsupported packaged proof platform: ${platform}.`);
  }
  const proof = required("--proof");
  if (proof !== "startup" && proof !== "journey") {
    throw new Error(`Unsupported packaged proof: ${proof}.`);
  }
  if (proof === "journey" && platform !== "mac") {
    throw new Error("The packaged interaction journey is currently owned by the macOS lane.");
  }
  const timeoutMs = Number(values.get("--timeout-ms") ?? "60000");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 5_000 || timeoutMs > 180_000) {
    throw new Error("--timeout-ms must be an integer between 5000 and 180000.");
  }
  const sourceCommit = required("--source-commit").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new Error("--source-commit must be a full 40-character Git SHA.");
  }
  return {
    assetsDirectory: resolve(required("--assets-dir")),
    platform,
    arch: required("--arch"),
    version: required("--version"),
    sourceCommit,
    proof,
    timeoutMs,
  };
}

function runCommand(command: string, args: ReadonlyArray<string>, cwd?: string): void {
  const result = spawnSync(command, [...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(`${command} could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status ?? "unknown"}.`);
  }
}

function findFiles(root: string, predicate: (path: string) => boolean): string[] {
  const matches: string[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.shift();
    if (!current) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const candidate = join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(candidate);
      } else if (entry.isFile() && predicate(candidate)) {
        matches.push(candidate);
      }
    }
  }
  return matches.toSorted((left, right) => left.localeCompare(right));
}

function requireSingleAsset(directory: string, suffix: string): string {
  const matches = readdirSync(directory)
    .map((entry) => join(directory, entry))
    .filter((candidate) => statSync(candidate).isFile() && candidate.endsWith(suffix));
  if (matches.length !== 1) {
    throw new Error(`Expected one ${suffix} release asset, found ${matches.length}.`);
  }
  return matches[0]!;
}

interface LaunchCommand {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd: string;
  readonly appArchivePath: string;
}

export function selectMacPackagedPayload(assetPaths: ReadonlyArray<string>): {
  readonly kind: "dmg" | "zip";
  readonly path: string;
} {
  const zipAssets = assetPaths.filter((path) => path.endsWith(".zip"));
  const dmgAssets = assetPaths.filter((path) => path.endsWith(".dmg"));
  if (zipAssets.length > 1 || dmgAssets.length > 1) {
    throw new Error(
      `Expected at most one macOS ZIP and one DMG release asset, found ${zipAssets.length} ZIP and ${dmgAssets.length} DMG.`,
    );
  }
  if (zipAssets[0]) return { kind: "zip", path: zipAssets[0] };
  if (dmgAssets[0]) return { kind: "dmg", path: dmgAssets[0] };
  throw new Error("Expected one packaged macOS ZIP or DMG release asset, found none.");
}

function prepareMacLaunch(assetsDirectory: string, extractionRoot: string): LaunchCommand {
  const payload = selectMacPackagedPayload(
    readdirSync(assetsDirectory)
      .map((entry) => join(assetsDirectory, entry))
      .filter((candidate) => statSync(candidate).isFile()),
  );
  if (payload.kind === "zip") {
    runCommand("ditto", ["-x", "-k", payload.path, extractionRoot]);
  } else {
    const mountPoint = join(extractionRoot, "mounted-dmg");
    mkdirSync(mountPoint);
    runCommand("hdiutil", [
      "attach",
      "-readonly",
      "-nobrowse",
      "-mountpoint",
      mountPoint,
      payload.path,
    ]);
    try {
      const mountedApps = readdirSync(mountPoint).filter((entry) => entry.endsWith(".app"));
      if (mountedApps.length !== 1) {
        throw new Error(
          `Expected one packaged macOS app in ${basename(payload.path)}, found ${mountedApps.length}.`,
        );
      }
      runCommand("ditto", [
        join(mountPoint, mountedApps[0]!),
        join(extractionRoot, mountedApps[0]!),
      ]);
    } finally {
      runCommand("hdiutil", ["detach", mountPoint]);
    }
  }
  const appBundles = readdirSync(extractionRoot).filter((entry) => entry.endsWith(".app"));
  if (appBundles.length !== 1) {
    throw new Error(`Expected one packaged macOS app in ${basename(payload.path)}.`);
  }
  const appBundle = join(extractionRoot, appBundles[0]!);
  const executables = findFiles(join(appBundle, "Contents", "MacOS"), (candidate) =>
    statSync(candidate).isFile(),
  );
  if (executables.length !== 1) {
    throw new Error(`Expected one macOS main executable, found ${executables.length}.`);
  }
  return {
    command: executables[0]!,
    args: [],
    cwd: appBundle,
    appArchivePath: join(appBundle, "Contents", "Resources", "app.asar"),
  };
}

function prepareLinuxLaunch(assetsDirectory: string, extractionRoot: string): LaunchCommand {
  const collectedAppImage = requireSingleAsset(assetsDirectory, ".AppImage");
  const appImage = join(extractionRoot, basename(collectedAppImage));
  copyFileSync(collectedAppImage, appImage);
  chmodSync(appImage, 0o755);
  runCommand(appImage, ["--appimage-extract"], extractionRoot);
  const appRun = join(extractionRoot, "squashfs-root", "AppRun");
  if (!existsSync(appRun)) {
    throw new Error(`${basename(appImage)} did not extract a runnable AppRun payload.`);
  }
  chmodSync(appRun, 0o755);
  return {
    command: "xvfb-run",
    args: ["-a", appRun, "--no-sandbox", "--disable-gpu"],
    cwd: join(extractionRoot, "squashfs-root"),
    appArchivePath: join(extractionRoot, "squashfs-root", "resources", "app.asar"),
  };
}

function prepareWindowsLaunch(assetsDirectory: string, extractionRoot: string): LaunchCommand {
  const installer = requireSingleAsset(assetsDirectory, ".exe");
  const installerRoot = join(extractionRoot, "installer");
  const applicationRoot = join(extractionRoot, "application");
  mkdirSync(installerRoot, { recursive: true });
  mkdirSync(applicationRoot, { recursive: true });
  runCommand("7z", ["x", "-y", `-o${installerRoot}`, installer]);
  const applicationArchives = findFiles(installerRoot, (candidate) =>
    /[/\\]app-(?:32|64|arm64)\.7z$/i.test(candidate),
  );
  if (applicationArchives.length !== 1) {
    throw new Error(
      `Expected one embedded NSIS application archive, found ${applicationArchives.length}.`,
    );
  }
  runCommand("7z", ["x", "-y", `-o${applicationRoot}`, applicationArchives[0]!]);
  const executables = findFiles(applicationRoot, (candidate) =>
    /[/\\]Haros\.exe$/i.test(candidate),
  );
  if (executables.length !== 1) {
    throw new Error(`Expected one extracted Haros.exe, found ${executables.length}.`);
  }
  return {
    command: executables[0]!,
    args: [],
    cwd: dirname(executables[0]!),
    appArchivePath: join(applicationRoot, "resources", "app.asar"),
  };
}

export function assertPackagedSourceCommit(
  packageJsonContents: string,
  expectedSourceCommit: string,
): void {
  const packageJson = JSON.parse(packageJsonContents) as {
    harnessosCommitHash?: unknown;
  };
  if (packageJson.harnessosCommitHash !== expectedSourceCommit) {
    throw new Error(
      `Packaged source commit mismatch: expected ${expectedSourceCommit}, got ${String(packageJson.harnessosCommitHash ?? "missing")}.`,
    );
  }
}

function prepareLaunch(
  options: PackagedDesktopProofOptions,
  extractionRoot: string,
): LaunchCommand {
  if (options.platform === "mac") {
    return prepareMacLaunch(options.assetsDirectory, extractionRoot);
  }
  if (options.platform === "linux") {
    return prepareLinuxLaunch(options.assetsDirectory, extractionRoot);
  }
  return prepareWindowsLaunch(options.assetsDirectory, extractionRoot);
}

export function createPackagedDesktopEnvironment(
  root: string,
  options: Pick<PackagedDesktopProofOptions, "platform" | "version">,
  inheritedEnvironment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const isolatedTemp = join(root, "tmp");
  const env: NodeJS.ProcessEnv = {
    ...selectPackagedProofInheritedEnvironment(inheritedEnvironment),
    HOME: join(root, "home"),
    USERPROFILE: join(root, "home"),
    APPDATA: join(root, "appdata"),
    LOCALAPPDATA: join(root, "localappdata"),
    XDG_CONFIG_HOME: join(root, "xdg-config"),
    XDG_CACHE_HOME: join(root, "xdg-cache"),
    XDG_DATA_HOME: join(root, "xdg-data"),
    HARNESSOS_HOME: join(root, "harnessos-home"),
    CODEX_HOME: join(root, "provider-home", "codex"),
    CLAUDE_CONFIG_DIR: join(root, "provider-home", "claude"),
    TEMP: isolatedTemp,
    TMP: isolatedTemp,
    TMPDIR: isolatedTemp,
    HARNESSOS_DISABLE_AUTO_UPDATE: "1",
    ELECTRON_ENABLE_LOGGING: "1",
  };
  for (const path of [
    env.HOME,
    env.APPDATA,
    env.LOCALAPPDATA,
    env.XDG_CONFIG_HOME,
    env.XDG_CACHE_HOME,
    env.XDG_DATA_HOME,
    env.HARNESSOS_HOME,
    env.CODEX_HOME,
    env.CLAUDE_CONFIG_DIR,
    env.TMPDIR,
  ]) {
    if (path) mkdirSync(path, { recursive: true });
  }
  if (options.platform === "mac") {
    const userDataPath = resolvePackagedProofUserDataPath(env);
    mkdirSync(userDataPath, { recursive: true });
    // Prevent the packaged app's update-only icon repair from registering this
    // temporary bundle in the runner's normal Launch Services database.
    const launchVersionPath = join(userDataPath, "last-launch-version.json");
    writeFileSync(launchVersionPath, `${JSON.stringify({ version: options.version }, null, 2)}\n`);
  }
  return env;
}

export function resolvePackagedProofUserDataPath(env: NodeJS.ProcessEnv): string {
  const productHome = env.HARNESSOS_HOME;
  if (!productHome) throw new Error("Packaged proof environment has no isolated product home.");
  return join(productHome, "electron", "harnessos");
}

export function withPackagedJourneyDebugging(launch: LaunchCommand): LaunchCommand {
  return {
    ...launch,
    args: [
      ...launch.args,
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      // The endpoint is still loopback-only and exists only for this isolated
      // proof process. Chromium otherwise rejects Node's CDP WebSocket Origin.
      "--remote-allow-origins=*",
    ],
  };
}

interface BundledServerRuntimeState {
  readonly version?: unknown;
  readonly pid?: unknown;
  readonly port?: unknown;
  readonly origin?: unknown;
}

type ProcessParentMap = ReadonlyMap<number, number>;

function readProcessParentMap(): ProcessParentMap {
  const result =
    process.platform === "win32"
      ? spawnSync(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress",
          ],
          { encoding: "utf8", shell: false, windowsHide: true },
        )
      : spawnSync("ps", ["-axo", "pid=,ppid="], {
          encoding: "utf8",
          shell: false,
        });
  if (result.status !== 0) {
    throw new Error("Packaged proof could not inspect its process tree.");
  }
  const parents = new Map<number, number>();
  if (process.platform === "win32") {
    const parsed = JSON.parse(result.stdout) as
      | { readonly ProcessId?: unknown; readonly ParentProcessId?: unknown }
      | ReadonlyArray<{ readonly ProcessId?: unknown; readonly ParentProcessId?: unknown }>;
    for (const processEntry of Array.isArray(parsed) ? parsed : [parsed]) {
      const pid = Number(processEntry.ProcessId);
      const parentPid = Number(processEntry.ParentProcessId);
      if (Number.isInteger(pid) && pid > 0 && Number.isInteger(parentPid) && parentPid >= 0) {
        parents.set(pid, parentPid);
      }
    }
  } else {
    for (const line of result.stdout.split(/\r?\n/u)) {
      const match = /^\s*(\d+)\s+(\d+)\s*$/u.exec(line);
      if (match) parents.set(Number(match[1]), Number(match[2]));
    }
  }
  return parents;
}

function processHasAncestor(
  parents: ProcessParentMap,
  pid: number,
  expectedAncestorPid: number,
): boolean {
  let currentPid = pid;
  for (let depth = 0; depth < 16 && currentPid > 1; depth += 1) {
    if (currentPid === expectedAncestorPid) return true;
    const parentPid = parents.get(currentPid);
    if (parentPid === undefined || parentPid === currentPid) return false;
    currentPid = parentPid;
  }
  return false;
}

function collectProcessTree(parents: ProcessParentMap, rootPid: number): ReadonlyArray<number> {
  const owned = new Set([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [pid, parentPid] of parents) {
      if (!owned.has(pid) && owned.has(parentPid)) {
        owned.add(pid);
        changed = true;
      }
    }
  }
  return [...owned];
}

async function waitForProcessesExit(
  processIds: ReadonlyArray<number>,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (processIds.every((pid) => !isProcessAlive(pid))) return true;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  return processIds.every((pid) => !isProcessAlive(pid));
}

interface PackagedRuntimeProcessTree {
  readonly mainPid: number;
  readonly serverPid: number;
  readonly processIds: ReadonlyArray<number>;
}

function assertBundledServerRuntime(
  harnessosHome: string,
  launchPid: number,
  platform: PackagedDesktopPlatform,
): PackagedRuntimeProcessTree {
  const runtimeStatePath = join(harnessosHome, "userdata", "server-runtime.json");
  let state: BundledServerRuntimeState;
  try {
    state = JSON.parse(readFileSync(runtimeStatePath, "utf8")) as BundledServerRuntimeState;
  } catch {
    throw new Error("Bundled Server runtime state was not available in the isolated profile.");
  }
  if (
    state.version !== 1 ||
    !Number.isInteger(state.pid) ||
    !Number.isInteger(state.port) ||
    typeof state.origin !== "string"
  ) {
    throw new Error("Bundled Server runtime state was malformed.");
  }
  const origin = new URL(state.origin);
  if (
    origin.protocol !== "http:" ||
    (origin.hostname !== "127.0.0.1" && origin.hostname !== "localhost") ||
    Number(origin.port) !== state.port
  ) {
    throw new Error("Bundled Server runtime state did not describe its loopback endpoint.");
  }
  const parents = readProcessParentMap();
  if (!processHasAncestor(parents, state.pid as number, launchPid)) {
    throw new Error("Bundled Server process was not owned by the packaged Main process.");
  }
  const serverParentPid = parents.get(state.pid as number);
  if (serverParentPid === undefined || !processHasAncestor(parents, serverParentPid, launchPid)) {
    throw new Error("Packaged proof could not resolve the bundled Server's Main owner.");
  }
  // macOS and Windows launch the packaged executable directly. Linux owns an
  // xvfb-run wrapper, so its direct Server parent is the narrowest Main PID
  // available without parsing process names or product internals.
  const runtimeMainPid = platform === "linux" ? serverParentPid : launchPid;
  return {
    mainPid: runtimeMainPid,
    serverPid: state.pid as number,
    processIds: collectProcessTree(parents, runtimeMainPid),
  };
}

function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolveExit) => {
    const finish = (exited: boolean) => {
      clearTimeout(timer);
      child.off("exit", onExit);
      resolveExit(exited);
    };
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    child.once("exit", onExit);
  });
}

async function terminateProcessTree(child: ChildProcess): Promise<void> {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    if (!(await waitForExit(child, 5_000))) {
      throw new Error(`Packaged process tree ${child.pid} did not exit after taskkill.`);
    }
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
  if (await waitForExit(child, 5_000)) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
  if (!(await waitForExit(child, 2_000))) {
    throw new Error(`Packaged process tree ${child.pid} did not exit after SIGKILL.`);
  }
}

function hasStartupProof(logPath: string, expectedLogDirectory: string): boolean {
  try {
    const log = readFileSync(logPath, "utf8");
    return (
      log.includes("app ready") &&
      log.includes("bootstrap main window created") &&
      log.includes("bootstrap backend ready source=") &&
      log.includes(`runtime log capture enabled logDir=${expectedLogDirectory}`)
    );
  } catch {
    return false;
  }
}

export function parseMacWindowCloseLifecycleProof(log: string): {
  readonly windowCloseShutdownStarted: boolean;
  readonly windowCloseShutdownCompleted: boolean;
} {
  return {
    windowCloseShutdownStarted: log.includes("window-close shutdown start"),
    windowCloseShutdownCompleted: log.includes("window-close shutdown complete"),
  };
}

function readMacWindowCloseLifecycleProof(
  logPath: string,
): ReturnType<typeof parseMacWindowCloseLifecycleProof> {
  try {
    return parseMacWindowCloseLifecycleProof(readFileSync(logPath, "utf8"));
  } catch {
    return {
      windowCloseShutdownStarted: false,
      windowCloseShutdownCompleted: false,
    };
  }
}

interface PackagedDesktopSession {
  readonly child: ChildProcess;
  readonly terminate: () => Promise<void>;
}

async function launchPackagedDesktopSession(input: {
  readonly launch: LaunchCommand;
  readonly env: NodeJS.ProcessEnv;
  readonly logPath: string;
  readonly timeoutMs: number;
  readonly attempt: number;
}): Promise<PackagedDesktopSession> {
  const child = spawn(input.launch.command, [...input.launch.args], {
    cwd: input.launch.cwd,
    env: input.env,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  try {
    const childOutcome: {
      exited: { code: number | null; signal: NodeJS.Signals | null } | null;
      launchError: Error | null;
    } = { exited: null, launchError: null };
    child.once("exit", (code, signal) => {
      childOutcome.exited = { code, signal };
    });
    child.once("error", (error) => {
      childOutcome.launchError = error;
    });
    child.stdout?.resume();
    child.stderr?.resume();

    const deadline = Date.now() + input.timeoutMs;
    const expectedLogDirectory = dirname(input.logPath);
    while (Date.now() < deadline) {
      if (hasStartupProof(input.logPath, expectedLogDirectory)) {
        console.log(`Packaged startup attempt ${input.attempt} reached backend and main window.`);
        return {
          child,
          terminate: () => terminateProcessTree(child),
        };
      }
      if (childOutcome.launchError) {
        throw new Error(`Packaged app could not start: ${childOutcome.launchError.message}`);
      }
      if (childOutcome.exited) {
        throw new Error(
          `Packaged app exited before startup proof (code=${childOutcome.exited.code ?? "null"}, signal=${childOutcome.exited.signal ?? "null"}).`,
        );
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
    }
    throw new Error(`Packaged startup proof timed out after ${input.timeoutMs}ms.`);
  } catch (error) {
    await terminateProcessTree(child);
    throw error;
  }
}

async function closePackagedStartupSession(input: {
  readonly platform: PackagedDesktopPlatform;
  readonly runtimeState: PackagedRuntimeProcessTree;
}): Promise<void> {
  if (input.platform === "win") {
    const result = spawnSync("taskkill", ["/pid", String(input.runtimeState.mainPid), "/t"], {
      stdio: "ignore",
      windowsHide: true,
    });
    if (result.status !== 0) {
      throw new Error("Packaged Main rejected the native graceful close request.");
    }
  } else {
    process.kill(input.runtimeState.mainPid, "SIGTERM");
  }
  if (!(await waitForProcessesExit(input.runtimeState.processIds, 10_000))) {
    throw new Error("Packaged process tree did not finish graceful shutdown within 10 seconds.");
  }
}

const JOURNEY_THREAD_TITLE_PREFIX = "Packaged proof task";
const JOURNEY_DRAFT_PREFIX = "Packaged proof draft";

interface PackagedJourneyFixture {
  readonly projectId: ProjectId;
  readonly threadId: ThreadId;
  readonly threadTitle: string;
  readonly draft: string;
}

function fixtureExpressionValue(value: string): string {
  return JSON.stringify(value);
}

async function waitForRendererCondition(input: {
  readonly cdp: PackagedProofCdpSession;
  readonly expression: string;
  readonly description: string;
  readonly timeoutMs?: number;
}): Promise<void> {
  const deadline = Date.now() + (input.timeoutMs ?? 10_000);
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      if (await input.cdp.evaluate<boolean>(input.expression)) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  const suffix = lastError
    ? `: ${redactPackagedProofSecrets(lastError instanceof Error ? lastError.message : String(lastError))}`
    : "";
  throw new Error(`Packaged journey timed out waiting for ${input.description}${suffix}`);
}

async function createPackagedJourneyFixture(input: {
  readonly rpc: PackagedProofRpcSession;
  readonly workspaceRoot: string;
}): Promise<PackagedJourneyFixture> {
  const suffix = randomUUID();
  const projectId = `packaged-proof-project-${suffix}` as ProjectId;
  const threadId = `packaged-proof-thread-${suffix}` as ThreadId;
  const threadTitle = `${JOURNEY_THREAD_TITLE_PREFIX} ${suffix.slice(0, 8)}`;
  const draft = `${JOURNEY_DRAFT_PREFIX} ${suffix.slice(0, 8)}`;
  const createdAt = new Date().toISOString();

  await input.rpc.dispatchCommand({
    type: "project.create",
    commandId: randomUUID() as CommandId,
    projectId,
    kind: "project",
    title: "Packaged proof project",
    workspaceRoot: input.workspaceRoot,
    createWorkspaceRootIfMissing: true,
    defaultEngineSelection: null,
    isPinned: true,
    createdAt,
  });
  await input.rpc.dispatchCommand({
    type: "thread.create",
    commandId: randomUUID() as CommandId,
    threadId,
    projectId,
    title: threadTitle,
    engineSelection: { engine: "oa", model: "packaged-proof-offline" },
    runtimeMode: "full-access",
    interactionMode: "default",
    envMode: "local",
    branch: null,
    worktreePath: null,
    workingDirectory: input.workspaceRoot,
    createBranchFlowCompleted: false,
    isPinned: true,
    parentThreadId: null,
    creationSource: "engine_native",
    createdAt,
  });
  return { projectId, threadId, threadTitle, draft };
}

async function openFixtureThread(
  cdp: PackagedProofCdpSession,
  fixture: PackagedJourneyFixture,
): Promise<void> {
  const title = fixtureExpressionValue(fixture.threadTitle);
  const findThreadRow = `Array.from(document.querySelectorAll('[data-thread-item]')).find((candidate) => candidate.textContent?.includes(${title}))`;
  await waitForRendererCondition({
    cdp,
    expression: `Boolean(${findThreadRow})`,
    description: "the canonical Thread shell projection",
  });
  const activated = await cdp.evaluate<boolean>(`(() => {
    const row = ${findThreadRow};
    const target = row?.matches('[role="button"]') ? row : row?.querySelector('[role="button"]');
    if (!(target instanceof HTMLElement)) return false;
    target.click();
    return true;
  })()`);
  if (!activated) throw new Error("Packaged journey could not activate its projected Thread.");
}

async function deferFirstRunIfPresent(cdp: PackagedProofCdpSession): Promise<void> {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  const dialogPresent = await cdp.evaluate<boolean>(
    `Boolean(document.querySelector('[data-testid="first-run-readiness-dialog"]'))`,
  );
  if (!dialogPresent) return;
  const deferred = await cdp.evaluate<boolean>(`(() => {
    const dialog = document.querySelector('[data-testid="first-run-readiness-dialog"]');
    const close = Array.from(dialog?.querySelectorAll('button') ?? []).find(
      (candidate) => candidate.textContent?.trim() === '×'
    );
    if (!(close instanceof HTMLButtonElement)) return false;
    close.click();
    return true;
  })()`);
  if (!deferred) throw new Error("Packaged journey could not defer first-run setup.");
  await waitForRendererCondition({
    cdp,
    expression: `!document.querySelector('[data-testid="first-run-readiness-dialog"]')`,
    description: "first-run setup to close",
  });
}

async function deferAppSnapWelcomeIfPresent(cdp: PackagedProofCdpSession): Promise<void> {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  const dialogPresent = await cdp.evaluate<boolean>(
    `Boolean(document.querySelector('[data-testid="appsnap-welcome-dialog"]'))`,
  );
  if (!dialogPresent) return;
  const deferred = await cdp.evaluate<boolean>(`(() => {
    const dialog = document.querySelector('[data-testid="appsnap-welcome-dialog"]');
    const notNow = dialog?.querySelector('button');
    if (!(notNow instanceof HTMLButtonElement)) return false;
    notNow.click();
    return true;
  })()`);
  if (!deferred) throw new Error("Packaged journey could not defer AppSnap setup.");
  await waitForRendererCondition({
    cdp,
    expression: `!document.querySelector('[data-testid="appsnap-welcome-dialog"]')`,
    description: "AppSnap welcome to close",
  });
}

async function writeAndVerifyJourneyDraft(
  cdp: PackagedProofCdpSession,
  fixture: PackagedJourneyFixture,
): Promise<void> {
  await cdp.bringToFront();
  await waitForRendererCondition({
    cdp,
    expression: `(() => {
      const editor = document.querySelector('[data-testid="composer-editor"]');
      return editor instanceof HTMLElement && editor.getClientRects().length > 0;
    })()`,
    description: "the visible Composer",
  });
  const focusState = await cdp.evaluate<{
    readonly activeElement: string;
    readonly activeClass: string;
    readonly activeEditable: boolean;
    readonly activeRole: string;
    readonly activeTestId: string;
    readonly activeIsComposer: boolean;
    readonly contentEditable: string;
    readonly editorCount: number;
    readonly focused: boolean;
  }>(`(() => {
    const editors = Array.from(document.querySelectorAll('[data-testid="composer-editor"]'));
    const editor = editors.find((candidate) => candidate instanceof HTMLElement && candidate.getClientRects().length > 0);
    if (!(editor instanceof HTMLElement)) {
      return { activeElement: 'missing', activeClass: 'missing', activeEditable: false, activeRole: 'missing', activeTestId: 'missing', activeIsComposer: false, contentEditable: 'missing', editorCount: editors.length, focused: false };
    }
    editor.click();
    editor.focus({ preventScroll: true });
    const active = document.activeElement;
    return {
      activeElement: active instanceof HTMLElement
        ? active.tagName.toLowerCase()
        : 'none',
      activeClass: active instanceof HTMLElement ? active.className.slice(0, 120) : 'none',
      activeEditable: active instanceof HTMLElement && active.getAttribute('contenteditable') === 'true',
      activeRole: active instanceof HTMLElement ? active.getAttribute('role') ?? 'none' : 'none',
      activeTestId: active instanceof HTMLElement ? active.getAttribute('data-testid') ?? 'none' : 'none',
      activeIsComposer: active instanceof HTMLElement && active.matches('[data-testid="composer-editor"]'),
      contentEditable: editor.getAttribute('contenteditable') ?? 'missing',
      editorCount: editors.length,
      focused: active === editor || editor.contains(active) || (active instanceof HTMLElement && active.getAttribute('contenteditable') === 'true'),
    };
  })()`);
  if (!focusState.focused) {
    throw new Error(
      `Packaged journey could not focus an editable Composer target (contenteditable=${focusState.contentEditable}, active=${focusState.activeElement}, class=${focusState.activeClass}, activeEditable=${String(focusState.activeEditable)}, role=${focusState.activeRole}, testid=${focusState.activeTestId}, activeIsComposer=${String(focusState.activeIsComposer)}, editors=${String(focusState.editorCount)}).`,
    );
  }
  await cdp.insertText(fixture.draft);
  const draft = fixtureExpressionValue(fixture.draft);
  await waitForRendererCondition({
    cdp,
    expression: `document.querySelector('[data-testid="composer-editor"]')?.textContent?.includes(${draft}) === true`,
    description: "the Composer draft",
  });
  // The production owner debounces persistence by 300 ms. Wait beyond that
  // boundary instead of reading or duplicating its localStorage schema.
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 600));
}

async function verifyRestoredJourneyDraft(
  cdp: PackagedProofCdpSession,
  fixture: PackagedJourneyFixture,
): Promise<void> {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 700));
  if (
    await cdp.evaluate<boolean>(
      `Boolean(document.querySelector('[data-testid="first-run-readiness-dialog"]'))`,
    )
  ) {
    throw new Error("Packaged first-run defer preference did not survive reopen.");
  }
  if (
    await cdp.evaluate<boolean>(
      `Boolean(document.querySelector('[data-testid="appsnap-welcome-dialog"]'))`,
    )
  ) {
    throw new Error("Packaged AppSnap defer preference did not survive reopen.");
  }
  const draft = fixtureExpressionValue(fixture.draft);
  await waitForRendererCondition({
    cdp,
    expression: `document.querySelector('[data-testid="composer-editor"]')?.textContent?.includes(${draft}) === true`,
    description: "the persisted Composer draft after reopen",
  });
}

async function closePackagedJourneySession(input: {
  readonly cdp: PackagedProofCdpSession;
  readonly runtimeState: PackagedRuntimeProcessTree;
  readonly logPath: string;
}): Promise<void> {
  let closeRequested = false;
  try {
    closeRequested = await input.cdp.evaluate<boolean>(`(() => {
      const close = window.desktopBridge?.windowControls?.close;
      if (typeof close !== 'function') return false;
      setTimeout(() => void close(), 0);
      return true;
    })()`);
  } finally {
    input.cdp.close();
  }
  if (!closeRequested) {
    throw new Error("Packaged Renderer exposed no canonical window close control.");
  }

  // macOS window close is presentation-only. Give Chromium time to tear down
  // the renderer, then prove that the Desktop owner and bundled Server remain.
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  const closeProof = readMacWindowCloseLifecycleProof(input.logPath);
  if (
    !isProcessAlive(input.runtimeState.mainPid) ||
    !isProcessAlive(input.runtimeState.serverPid)
  ) {
    throw new Error(
      `Packaged macOS window close terminated the app or bundled Server (mainAlive=${isProcessAlive(input.runtimeState.mainPid)}, serverAlive=${isProcessAlive(input.runtimeState.serverPid)}).`,
    );
  }
  if (closeProof.windowCloseShutdownStarted || closeProof.windowCloseShutdownCompleted) {
    throw new Error("Packaged macOS window close incorrectly entered Desktop shutdown.");
  }
}

async function runPackagedJourney(input: {
  readonly launch: LaunchCommand;
  readonly env: NodeJS.ProcessEnv;
  readonly logPath: string;
  readonly timeoutMs: number;
  readonly version: string;
  readonly temporaryRoot: string;
}): Promise<void> {
  let fixture: PackagedJourneyFixture | null = null;
  const userDataPath = resolvePackagedProofUserDataPath(input.env);
  const journeyLaunch = withPackagedJourneyDebugging(input.launch);

  for (const attempt of [1, 2]) {
    rmSync(input.logPath, { force: true });
    rmSync(join(userDataPath, "DevToolsActivePort"), { force: true });
    const session = await launchPackagedDesktopSession({
      launch: journeyLaunch,
      env: input.env,
      logPath: input.logPath,
      timeoutMs: input.timeoutMs,
      attempt,
    });
    let cdp: PackagedProofCdpSession | null = null;
    let rpc: PackagedProofRpcSession | null = null;
    try {
      if (!session.child.pid) throw new Error("Packaged Main process has no PID.");
      const runtimeState = assertBundledServerRuntime(
        input.env.HARNESSOS_HOME!,
        session.child.pid,
        "mac",
      );
      cdp = await connectPackagedRendererCdp({
        userDataPath,
        timeoutMs: 10_000,
      });
      if (attempt === 1) {
        const rawWsUrl = await cdp.evaluate<string>(`window.desktopBridge?.getWsUrl?.() ?? ''`);
        if (!rawWsUrl) throw new Error("Packaged Renderer exposed no bundled Server URL.");
        rpc = await connectPackagedProofRpc({
          rawWsUrl,
          clientBuild: input.version,
        });
        fixture = await createPackagedJourneyFixture({
          rpc,
          workspaceRoot: join(input.temporaryRoot, "workspace"),
        });
        await rpc.close();
        rpc = null;
      }
      if (!fixture) throw new Error("Packaged journey fixture was not created.");
      await openFixtureThread(cdp, fixture);
      if (attempt === 1) {
        await deferFirstRunIfPresent(cdp);
        await deferAppSnapWelcomeIfPresent(cdp);
        await writeAndVerifyJourneyDraft(cdp, fixture);
      } else {
        await verifyRestoredJourneyDraft(cdp, fixture);
      }
      await closePackagedJourneySession({
        cdp,
        runtimeState,
        logPath: input.logPath,
      });
      cdp = null;
      // The window-close claim is already proven above. End this isolated
      // attempt through failure cleanup so process termination cannot add
      // evidence to, or race, the product-owned close lifecycle.
      await session.terminate();
      console.log(
        `Packaged journey attempt ${attempt} proved ${attempt === 1 ? "fixture persistence and macOS window-close isolation" : "state restoration after isolated relaunch"}.`,
      );
    } catch (error) {
      await rpc?.close();
      cdp?.close();
      await session.terminate();
      throw error;
    }
  }
}

export function resolveNativePackagedDesktopPlatform(
  platform: NodeJS.Platform,
): PackagedDesktopPlatform {
  if (platform === "darwin") return "mac";
  if (platform === "win32") return "win";
  return "linux";
}

export async function verifyPackagedDesktop(options: PackagedDesktopProofOptions): Promise<void> {
  const nativePlatform = resolveNativePackagedDesktopPlatform(process.platform);
  if (nativePlatform !== options.platform) {
    throw new Error(
      `Packaged ${options.platform} proof must run on its native host, not ${process.platform}.`,
    );
  }
  const proofLease = acquirePackagedProofLease(options.sourceCommit);
  let temporaryRoot: string | undefined;

  try {
    temporaryRoot = mkdtempSync(join(tmpdir(), `harnessos-packaged-proof-${options.platform}-`));
    const extractionRoot = join(temporaryRoot, "payload");
    mkdirSync(extractionRoot, { recursive: true });
    const launch = prepareLaunch(options, extractionRoot);
    if (!existsSync(launch.appArchivePath)) {
      throw new Error(`Packaged application archive was not found at ${launch.appArchivePath}.`);
    }
    assertPackagedSourceCommit(
      extractFile(launch.appArchivePath, "package.json").toString("utf8"),
      options.sourceCommit,
    );
    const env = createPackagedDesktopEnvironment(join(temporaryRoot, "state"), options);
    const logPath = join(env.HARNESSOS_HOME!, "userdata", "logs", "desktop-main.log");
    if (options.proof === "journey") {
      await runPackagedJourney({
        launch,
        env,
        logPath,
        timeoutMs: options.timeoutMs,
        version: options.version,
        temporaryRoot,
      });
    } else {
      for (const attempt of [1, 2]) {
        rmSync(logPath, { force: true });
        const session = await launchPackagedDesktopSession({
          launch,
          env,
          logPath,
          timeoutMs: options.timeoutMs,
          attempt,
        });
        try {
          if (!session.child.pid) throw new Error("Packaged Main process has no PID.");
          const runtimeState = assertBundledServerRuntime(
            env.HARNESSOS_HOME!,
            session.child.pid,
            options.platform,
          );
          await closePackagedStartupSession({
            platform: options.platform,
            runtimeState,
          });
        } catch (error) {
          await session.terminate();
          throw error;
        }
      }
    }
    console.log(
      `Packaged ${options.platform}/${options.arch} ${options.proof} and isolated relaunch passed from isolated state at ${options.sourceCommit.slice(0, 12)}.`,
    );
  } finally {
    releasePackagedProofResources(temporaryRoot, proofLease);
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await verifyPackagedDesktop(parsePackagedDesktopArgs(process.argv.slice(2)));
}
