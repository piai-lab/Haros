import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const desktopDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const electronExecutable = resolve(desktopDirectory, "node_modules/.bin/electron");
const desktopEntry = resolve(desktopDirectory, "dist-electron/main.js");
const inheritedEnvironmentKeys = ["PATH", "LANG", "LANGUAGE", "LC_ALL", "LC_CTYPE", "TZ"] as const;

interface ProcessDescription {
  readonly pid: number;
  readonly command: string;
}

let desktopProcess: ChildProcess | null = null;
let desktopProcessGroupId: number | null = null;
let disposableRoot: string | null = null;

function processGroup(groupId: number): ReadonlyArray<ProcessDescription> {
  const result = spawnSync("ps", ["-axo", "pid=,pgid=,command="], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Unable to inspect process group ${groupId}.`);
  return result.stdout
    .split("\n")
    .map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(.+)$/u))
    .filter((match): match is RegExpMatchArray => match !== null)
    .filter((match) => Number(match[2]) === groupId)
    .map((match) => ({ pid: Number(match[1]), command: match[3]! }));
}

function findOnlyProcess(
  processes: ReadonlyArray<ProcessDescription>,
  description: string,
  predicate: (process: ProcessDescription) => boolean,
): ProcessDescription {
  const matches = processes.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(
      `Expected one ${description}, found ${matches.length}: ${matches
        .map((process) => `${process.pid} ${process.command}`)
        .join("\n")}`,
    );
  }
  return matches[0]!;
}

function processTree(groupId: number): {
  readonly renderer: ProcessDescription;
  readonly service: ProcessDescription;
  readonly nativeHost: ProcessDescription;
} {
  const processes = processGroup(groupId);
  return {
    renderer: findOnlyProcess(processes, "renderer", (process) =>
      process.command.includes("--type=renderer"),
    ),
    service: findOnlyProcess(processes, "Product Service", (process) =>
      process.command.includes("/apps/service/dist/index.mjs"),
    ),
    nativeHost: findOnlyProcess(processes, "Native Host", (process) =>
      process.command.includes("/apps/native-host/dist/index.mjs"),
    ),
  };
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ESRCH") {
      return false;
    }
    throw error;
  }
}

function signalProcessGroup(groupId: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-groupId, signal);
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ESRCH")) {
      throw error;
    }
  }
}

async function waitFor<T>(
  description: string,
  probe: () => T | null,
  timeoutMs = 15_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = probe();
    if (result !== null) return result;
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${description}.`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
}

function occurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}

function disposableEnvironment(root: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const key of inheritedEnvironmentKeys) {
    const value = process.env[key];
    if (value) environment[key] = value;
  }
  const disposableUserHome = join(root, "home");
  const productHome = join(root, "omnimind");
  const temporaryDirectory = join(root, "tmp");
  Object.assign(environment, {
    HOME: disposableUserHome,
    USERPROFILE: disposableUserHome,
    APPDATA: join(root, "appdata"),
    LOCALAPPDATA: join(root, "localappdata"),
    XDG_CONFIG_HOME: join(root, "xdg", "config"),
    XDG_CACHE_HOME: join(root, "xdg", "cache"),
    XDG_DATA_HOME: join(root, "xdg", "data"),
    XDG_STATE_HOME: join(root, "xdg", "state"),
    CODEX_HOME: join(root, "providers", "codex"),
    CLAUDE_CONFIG_DIR: join(root, "providers", "claude"),
    PI_CODING_AGENT_DIR: join(root, "providers", "pi"),
    PI_CODING_AGENT_SESSION_DIR: join(root, "providers", "pi", "sessions"),
    OMNIMIND_HOME: productHome,
    TMPDIR: temporaryDirectory,
    TMP: temporaryDirectory,
    TEMP: temporaryDirectory,
    OMNIMIND_DISABLE_AUTO_UPDATE: "1",
    OMNIMIND_DISPOSABLE_SMOKE_ROOT: root,
    OMNIMIND_PATH_HYDRATED: "1",
  });
  return environment;
}

afterEach(async () => {
  if (desktopProcessGroupId !== null) {
    signalProcessGroup(desktopProcessGroupId, "SIGTERM");
    await waitFor(
      "Desktop process tree shutdown",
      () => (processGroup(desktopProcessGroupId as number).length === 0 ? true : null),
      8_000,
    ).catch(() => {
      signalProcessGroup(desktopProcessGroupId as number, "SIGKILL");
    });
  }
  desktopProcess = null;
  desktopProcessGroupId = null;
  if (disposableRoot !== null) await rm(disposableRoot, { recursive: true, force: true });
  disposableRoot = null;
});

describe.skipIf(process.platform !== "darwin")("real Desktop child-process fault isolation", () => {
  it("recovers Renderer, Native Host and Product Service independently", async () => {
    disposableRoot = await mkdtemp(join(tmpdir(), "omnimind-process-tree-"));
    const environment = disposableEnvironment(disposableRoot);
    await Promise.all(
      [
        environment.HOME,
        environment.APPDATA,
        environment.LOCALAPPDATA,
        environment.XDG_CONFIG_HOME,
        environment.XDG_CACHE_HOME,
        environment.XDG_DATA_HOME,
        environment.XDG_STATE_HOME,
        environment.CODEX_HOME,
        environment.CLAUDE_CONFIG_DIR,
        environment.PI_CODING_AGENT_DIR,
        environment.PI_CODING_AGENT_SESSION_DIR,
        environment.OMNIMIND_HOME,
        environment.TMPDIR,
      ]
        .filter((path): path is string => typeof path === "string")
        .map((path) => mkdir(path, { recursive: true })),
    );

    let output = "";
    desktopProcess = spawn(
      electronExecutable,
      [desktopEntry, `--user-data-dir=${join(disposableRoot, "electron")}`],
      {
        cwd: desktopDirectory,
        env: environment,
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      },
    );
    if (!desktopProcess.pid) throw new Error("Desktop started without a process id.");
    desktopProcessGroupId = desktopProcess.pid;
    const appendOutput = (chunk: Buffer) => {
      output = `${output}${chunk.toString("utf8")}`.slice(-128_000);
    };
    desktopProcess.stdout?.on("data", appendOutput);
    desktopProcess.stderr?.on("data", appendOutput);
    desktopProcess.once("exit", (code, signal) => {
      output += `\nDESKTOP_EXIT code=${String(code)} signal=${String(signal)}`;
    });

    try {
      await waitFor(
        "Desktop, Product Service and authenticated Native Host readiness",
        () =>
          output.includes("OmniMind running") &&
          output.includes("[desktop] renderer did finish load") &&
          output.includes("OMNIMIND_NATIVE_HOST_AUTHENTICATED protocol=1")
            ? true
            : null,
        30_000,
      );
    } catch (error) {
      const processes = processGroup(desktopProcessGroupId);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nProcesses:\n${processes
          .map((process) => `${process.pid} ${process.command}`)
          .join("\n")}\nOutput:\n${output}`,
      );
    }
    const initial = processTree(desktopProcessGroupId);

    const rendererReadyCount = occurrences(output, "[desktop] renderer did finish load");
    process.kill(initial.renderer.pid, "SIGABRT");
    const afterRenderer = await waitFor("renderer crash attribution and reload", () => {
      if (!output.includes("renderer process gone (reason=crashed")) return null;
      if (occurrences(output, "[desktop] renderer did finish load") <= rendererReadyCount) {
        return null;
      }
      const tree = processTree(desktopProcessGroupId as number);
      return tree.renderer.pid !== initial.renderer.pid ? tree : null;
    });
    expect(afterRenderer.service.pid).toBe(initial.service.pid);
    expect(afterRenderer.nativeHost.pid).toBe(initial.nativeHost.pid);

    const authenticatedReadyCount = occurrences(
      output,
      "OMNIMIND_NATIVE_HOST_AUTHENTICATED protocol=1",
    );
    process.kill(afterRenderer.nativeHost.pid, "SIGKILL");
    const afterHost = await waitFor("Native Host restart and re-authentication", () => {
      if (
        occurrences(output, "OMNIMIND_NATIVE_HOST_AUTHENTICATED protocol=1") <=
        authenticatedReadyCount
      ) {
        return null;
      }
      const tree = processTree(desktopProcessGroupId as number);
      return tree.nativeHost.pid !== afterRenderer.nativeHost.pid ? tree : null;
    });
    expect(afterHost.renderer.pid).toBe(afterRenderer.renderer.pid);
    expect(afterHost.service.pid).toBe(afterRenderer.service.pid);

    const serviceReadyCount = occurrences(output, "OmniMind running");
    process.kill(afterHost.service.pid, "SIGKILL");
    const afterService = await waitFor("Product Service restart", () => {
      if (occurrences(output, "OmniMind running") <= serviceReadyCount) return null;
      const tree = processTree(desktopProcessGroupId as number);
      return tree.service.pid !== afterHost.service.pid ? tree : null;
    });
    expect(afterService.renderer.pid).toBe(afterHost.renderer.pid);
    expect(afterService.nativeHost.pid).toBe(afterHost.nativeHost.pid);
    expect(processExists(desktopProcessGroupId)).toBe(true);
    expect(output).not.toContain("NATIVE_HOST_EXECUTION_ACCEPTED");
    expect(output).not.toContain("NATIVE_HOST_EXECUTION_INDETERMINATE");
  }, 60_000);
});
