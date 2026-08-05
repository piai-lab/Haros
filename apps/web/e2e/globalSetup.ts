import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = resolve(WEB_DIR, ".playwright/electron-e2e");
const OUTPUT_PATH = resolve(OUTPUT_DIR, "visibleBrowserMain.cjs");
const BROWSER_PANEL_PRELOAD_OUTPUT_PATH = resolve(OUTPUT_DIR, "browserPanelPreload.cjs");
const BROWSER_PANEL_RENDERER_OUTPUT_PATH = resolve(OUTPUT_DIR, "browserPanelRenderer.js");
const ANNOTATION_PRELOAD_OUTPUT_PATH = resolve(OUTPUT_DIR, "browserAnnotationGuestPreload.cjs");

export default function globalSetup(): () => void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  execFileSync(
    "bun",
    [
      "build",
      "e2e/fixtures/visibleBrowserMain.ts",
      "--target=node",
      "--format=cjs",
      `--outfile=${OUTPUT_PATH}`,
      "--external=electron",
    ],
    { cwd: WEB_DIR, stdio: "inherit" },
  );
  execFileSync(
    "bun",
    [
      "build",
      "e2e/fixtures/browserPanelPreload.ts",
      "--target=node",
      "--format=cjs",
      `--outfile=${BROWSER_PANEL_PRELOAD_OUTPUT_PATH}`,
      "--external=electron",
    ],
    { cwd: WEB_DIR, stdio: "inherit" },
  );
  execFileSync(
    "bun",
    [
      "build",
      "e2e/fixtures/browserPanelRenderer.tsx",
      "--target=browser",
      "--format=esm",
      '--define=import.meta.env={"DEV":false,"PROD":false,"APP_VERSION":"0.0.0"}',
      `--outfile=${BROWSER_PANEL_RENDERER_OUTPUT_PATH}`,
    ],
    { cwd: WEB_DIR, stdio: "inherit" },
  );
  execFileSync(
    "bun",
    [
      "build",
      "../desktop/src/browserAnnotations/guestPreload.ts",
      "--target=node",
      "--format=cjs",
      `--outfile=${ANNOTATION_PRELOAD_OUTPUT_PATH}`,
      "--external=electron",
    ],
    { cwd: WEB_DIR, stdio: "inherit" },
  );
  process.env.OMNIMIND_E2E_ELECTRON_MAIN = OUTPUT_PATH;
  process.env.OMNIMIND_E2E_BROWSER_PANEL_PRELOAD = BROWSER_PANEL_PRELOAD_OUTPUT_PATH;
  process.env.OMNIMIND_E2E_BROWSER_ANNOTATION_PRELOAD = ANNOTATION_PRELOAD_OUTPUT_PATH;
  return () => rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
