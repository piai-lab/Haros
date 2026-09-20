import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import {
  HARNESSOS_DESKTOP_SMOKE_USER_DATA_ENV,
  HARNESSOS_DESKTOP_ORIGIN,
} from "@harnessos/shared/desktopIdentity";
import { resolveElectronPath } from "./electron-launcher.mjs";
import { createSourceDesktopEnvironment } from "./source-desktop-launch.mjs";

// Playwright also exposes hidden WebContentsViews (for example the cookie backend).
// Only the canonical workbench origin is a startup candidate.
export function waitForWorkbench(application, signal) {
  return new Promise((resolve, reject) => {
    const pages = new Map();
    let settled = false;
    const cleanup = () => {
      settled = true;
      application.removeListener("window", observe);
      signal.removeEventListener("abort", abort);
      for (const [page, check] of pages) page.removeListener("framenavigated", check);
    };
    const abort = () => {
      cleanup();
      reject(new Error("Desktop startup verification stopped."));
    };
    const observe = (page) => {
      if (settled) return;
      const check = () => {
        if (page.url().startsWith(`${HARNESSOS_DESKTOP_ORIGIN}/`)) {
          cleanup();
          resolve(page);
        }
      };
      pages.set(page, check);
      page.on("framenavigated", check);
      check();
    };
    application.on("window", observe);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    for (const page of application.windows()) observe(page);
  });
}

/** Exit and renderer failures must race readiness, including exit(0) before readiness. */
export async function verifyDesktopSmoke(application, timeoutMs = 60_000) {
  let timer;
  let window;
  let finished = false;
  const selection = new AbortController();
  let onCrash;
  let onPageError;
  let onExit;
  const child = application.process();
  const failure = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Desktop startup timed out.")), timeoutMs);
    onExit = () => reject(new Error("Desktop exited before startup verification completed."));
    onCrash = () => reject(new Error("Desktop renderer crashed."));
    onPageError = () => reject(new Error("Desktop renderer raised an uncaught error."));
    child.once("exit", onExit);
    if (child.exitCode !== null || child.signalCode !== null) onExit();
  });
  try {
    await Promise.race([
      failure,
      (async () => {
        window = await waitForWorkbench(application, selection.signal);
        if (finished) return;
        window.on("crash", onCrash);
        window.on("pageerror", onPageError);
        await window
          .locator('html[data-shell-state="ready"]')
          .waitFor({ state: "attached", timeout: timeoutMs });
        await window.locator("#startup-splash").waitFor({ state: "detached", timeout: timeoutMs });
        await window.locator("#root").waitFor({ state: "visible", timeout: timeoutMs });
        // Accessibility excludes controls behind modal dialogs. Trial-click also checks
        // hit testing and stability: visible/enabled alone does not prove operability.
        await window
          .getByRole("button", { disabled: false })
          .first()
          .click({ trial: true, timeout: timeoutMs });
        await window.evaluate(
          () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
        );
      })(),
    ]);
  } finally {
    finished = true;
    selection.abort();
    clearTimeout(timer);
    child.removeListener("exit", onExit);
    window?.removeListener("crash", onCrash);
    window?.removeListener("pageerror", onPageError);
  }
}

async function main() {
  const { _electron } = await import("playwright");
  const desktopDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const smokeHome = mkdtempSync(join(tmpdir(), "haros-desktop-smoke-"));
  let application;
  let stage = "launch";
  try {
    // Do not inherit Engine homes, credentials or endpoints from the developer's shell.
    const environment = Object.fromEntries(
      Object.entries(process.env).filter(([key]) =>
        [
          "PATH",
          "SystemRoot",
          "WINDIR",
          "TEMP",
          "TMP",
          "TMPDIR",
          "DISPLAY",
          "WAYLAND_DISPLAY",
          "XDG_RUNTIME_DIR",
          "LANG",
          "LC_ALL",
        ].includes(key),
      ),
    );
    Object.assign(environment, {
      HOME: smokeHome,
      USERPROFILE: smokeHome,
      XDG_CONFIG_HOME: join(smokeHome, "config"),
      XDG_CACHE_HOME: join(smokeHome, "cache"),
      HARNESSOS_HOME: join(smokeHome, "haros"),
      [HARNESSOS_DESKTOP_SMOKE_USER_DATA_ENV]: join(smokeHome, "electron-user-data"),
    });
    application = await _electron.launch({
      executablePath: resolveElectronPath(),
      args: [join(desktopDirectory, "dist-electron/main.js")],
      cwd: desktopDirectory,
      env: createSourceDesktopEnvironment({ environment, homeDirectory: smokeHome }),
      timeout: 60_000,
    });
    stage = "verify";
    await verifyDesktopSmoke(application);
    console.log(
      "Desktop smoke passed: backend snapshots, rendered workbench and enabled control verified.",
    );
  } catch (error) {
    console.error(`Desktop smoke stage: ${stage}; category: ${error?.name ?? "unknown"}`);
    if (stage === "verify") console.error(error.message);
    // Raw application exceptions can contain private URLs or native environment details.
    console.error("Desktop smoke failed: startup did not produce a healthy interactive workbench.");
    process.exitCode = 1;
  } finally {
    if (application) {
      const child = application.process();
      let forced = false;
      const descendants = new Set();
      if (process.platform !== "win32" && child.pid) {
        descendants.add(child.pid);
        try {
          const rows = execFileSync("ps", ["-A", "-o", "pid=,ppid="], {
            encoding: "utf8",
            timeout: 2000,
          })
            .trim()
            .split("\n")
            .map((line) => line.trim().split(/\s+/).map(Number));
          descendants.add(child.pid);
          let grew = true;
          while (grew) {
            grew = false;
            for (const [pid, parent] of rows)
              if (descendants.has(parent) && !descendants.has(pid)) {
                descendants.add(pid);
                grew = true;
              }
          }
        } catch {
          process.exitCode = 1;
        }
      }
      const terminate = () => {
        if (process.platform === "win32" && child.pid) {
          try {
            execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
              stdio: "ignore",
              timeout: 5000,
            });
          } catch {}
        } else
          for (const pid of [...descendants].toReversed()) {
            try {
              process.kill(pid, "SIGKILL");
            } catch {}
          }
      };
      const deadline = setTimeout(() => {
        forced = true;
        terminate();
      }, 10_000);
      try {
        await application.close();
      } catch {
        process.exitCode = 1;
      }
      clearTimeout(deadline);
      if (forced) process.exitCode = 1;
      terminate();
    }
    rmSync(smokeHome, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main();
