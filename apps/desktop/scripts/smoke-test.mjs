import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveElectronPath } from "./electron-launcher.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(__dirname, "..");
const mainJs = resolve(desktopDir, "dist-electron/main.js");

console.log("\nLaunching Electron smoke test...");

const child = spawn(resolveElectronPath(), [mainJs], {
  stdio: ["pipe", "pipe", "pipe"],
  detached: process.platform !== "win32",
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: "",
    ELECTRON_ENABLE_LOGGING: "1",
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
    process.exit(1);
  }

  console.log("Desktop smoke test passed.");
  process.exit(0);
});
