import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  processGroupCommands,
  runBoundedSmokeProcess,
  signalProcessTree,
} from "./smoke-process.mjs";
import {
  createDisposableDesktopEnvironment,
  disposableDesktopEnvironmentDirectories,
} from "./smoke-environment.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(__dirname, "..");
const electronBin = resolve(desktopDir, "node_modules/.bin/electron");
const mainJs = resolve(desktopDir, "dist-electron/main.js");
const profileRoot = await mkdtemp(join(tmpdir(), "omnimind-desktop-smoke-"));
const electronProfile = join(profileRoot, "electron");
const desktopLog = join(profileRoot, "home", "userdata", "logs", "desktop-main.log");

async function rendererReady(output) {
  if (output.includes("[desktop] renderer did finish load")) return true;
  try {
    const log = await readFile(desktopLog, "utf8");
    return (
      log.includes("bootstrap main window created") && log.includes("renderer did finish load")
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function verifyElectronProfiles(pid) {
  if (process.platform === "win32") return;
  const electronProcesses = processGroupCommands(pid).filter(
    (process) =>
      /Electron(?: Helper)?/u.test(process.command) &&
      !process.command.includes("/apps/service/dist/index.mjs"),
  );
  if (electronProcesses.length === 0) {
    throw new Error("no Electron process was present after renderer readiness");
  }
  const expectedSwitch = `--user-data-dir=${electronProfile}`;
  const mismatches = electronProcesses.filter(
    (process) => !process.command.includes(expectedSwitch),
  );
  if (mismatches.length > 0) {
    throw new Error(
      `Electron process escaped disposable profile: ${mismatches.map((process) => process.pid).join(", ")}`,
    );
  }
}

console.log("\nLaunching bounded Electron smoke test...");

let activePid;
const hardDeadline = setTimeout(() => {
  if (activePid) signalProcessTree(activePid, "SIGKILL");
  console.error("Desktop smoke parent deadline expired after 45s.");
  process.exit(1);
}, 45_000);

try {
  const environment = createDisposableDesktopEnvironment(profileRoot);
  await Promise.all(
    disposableDesktopEnvironmentDirectories(environment).map((path) =>
      mkdir(path, { recursive: true }),
    ),
  );
  const result = await runBoundedSmokeProcess({
    command: electronBin,
    args: [mainJs, `--user-data-dir=${electronProfile}`],
    cwd: desktopDir,
    env: environment,
    readinessText: "OmniMind running",
    readinessProbe: rendererReady,
    verifyReadiness: ({ pid }) => verifyElectronProfiles(pid),
    readinessTimeoutMs: 30_000,
    termGraceMs: 2_000,
    killGraceMs: 5_000,
    onSpawn: (pid) => {
      activePid = pid;
    },
  });

  const fatalPatterns = [
    "Cannot find module",
    "MODULE_NOT_FOUND",
    "Refused to execute",
    "Uncaught Error",
    "Uncaught TypeError",
    "Uncaught ReferenceError",
  ];
  const failures = fatalPatterns.filter((pattern) => result.output.includes(pattern));
  if (failures.length > 0) {
    throw new Error(`Fatal startup output: ${failures.join(", ")}\n${result.output}`);
  }

  console.log(
    `Desktop smoke test passed in ${result.durationMs}ms; process tree stopped${result.forced ? " with SIGKILL fallback" : " after SIGTERM"}.`,
  );
} finally {
  clearTimeout(hardDeadline);
  await rm(profileRoot, { recursive: true, force: true });
}
