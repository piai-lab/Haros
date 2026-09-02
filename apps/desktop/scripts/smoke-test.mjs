import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { HARNESSOS_DESKTOP_SMOKE_USER_DATA_ENV } from "@harnessos/shared/desktopIdentity";
import { resolveElectronPath } from "./electron-launcher.mjs";
import { spawnSourceDesktop } from "./source-desktop-launch.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(__dirname, "..");
const smokeHome = mkdtempSync(join(tmpdir(), "haros-desktop-smoke-"));

console.log("\nLaunching Electron smoke test...");

const child = spawnSourceDesktop({
  desktopDirectory: desktopDir,
  electronPath: resolveElectronPath(),
  spawnProcess: spawn,
  stdio: ["pipe", "pipe", "pipe"],
  detached: process.platform !== "win32",
  environment: {
    ...process.env,
    VITE_DEV_SERVER_URL: "",
    ELECTRON_ENABLE_LOGGING: "1",
    HARNESSOS_HOME: smokeHome,
    [HARNESSOS_DESKTOP_SMOKE_USER_DATA_ENV]: join(smokeHome, "electron-user-data"),
  },
});

let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

function stopSmokeProcess(signal) {
  if (child.pid && process.platform !== "win32") {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // Fall back to the direct child if it left its launch process group.
    }
  }
  child.kill(signal);
}

let forceKillTimeout;
const timeout = setTimeout(() => {
  stopSmokeProcess("SIGTERM");
  forceKillTimeout = setTimeout(() => stopSmokeProcess("SIGKILL"), 2_000);
}, 8_000);

function finish(exitCode) {
  rmSync(smokeHome, { recursive: true, force: true });
  process.exit(exitCode);
}

child.on("error", (error) => {
  clearTimeout(timeout);
  clearTimeout(forceKillTimeout);
  console.error("Desktop smoke test failed to launch:", error);
  finish(1);
});

child.on("exit", () => {
  clearTimeout(timeout);
  clearTimeout(forceKillTimeout);

  const fatalPatterns = [
    "Cannot find module",
    "MODULE_NOT_FOUND",
    "Refused to execute",
    "Uncaught Error",
    "Uncaught TypeError",
    "Uncaught ReferenceError",
  ];
  const failures = fatalPatterns.filter((pattern) => output.includes(pattern));

  if (failures.length > 0) {
    console.error("\nDesktop smoke test failed:");
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    console.error("\nFull output:\n" + output);
    finish(1);
  }

  console.log("Desktop smoke test passed.");
  finish(0);
});
