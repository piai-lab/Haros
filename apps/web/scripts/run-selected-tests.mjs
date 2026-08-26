import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const mode = process.argv[2];
const paths = process.argv.slice(3);
const vitestBin = fileURLToPath(
  new URL("../../../node_modules/vitest/vitest.mjs", import.meta.url),
);

if ((mode !== "focused" && mode !== "related") || paths.length === 0) {
  console.error(
    mode === "focused"
      ? "Usage: bun run test:focused -- <explicit-test-files...>"
      : "Usage: bun run test:related -- <changed-source-paths...>",
  );
  process.exit(2);
}

const runVitest = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [vitestBin, ...args], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Vitest exited with ${code ?? signal ?? "unknown status"}`));
    });
  });

if (mode === "related") {
  const explicitBrowserFiles = paths.every((path) => path.includes(".browser."));
  const relatedRuns = [];
  if (!explicitBrowserFiles) {
    relatedRuns.push(runVitest(["related", ...paths, "--passWithNoTests"]));
  }
  if (!explicitBrowserFiles || paths.some((path) => !path.includes(".geometry.browser."))) {
    relatedRuns.push(
      runVitest([
        "related",
        ...paths.filter((path) => !path.includes(".geometry.browser.")),
        "--config",
        "vitest.browser.stable.config.ts",
        "--passWithNoTests",
      ]),
    );
  }
  if (paths.some((path) => path.includes(".geometry.browser."))) {
    relatedRuns.push(
      runVitest([
        "related",
        ...paths.filter((path) => path.includes(".geometry.browser.")),
        "--config",
        "vitest.browser.geometry.config.ts",
        "--passWithNoTests",
      ]),
    );
  }
  await Promise.all(relatedRuns);
  process.exit(0);
}

const isTestFile = (path) => /(?:\.test|\.browser)\.[cm]?[jt]sx?$/.test(path);
const invalidPaths = paths.filter((path) => !isTestFile(path));
if (invalidPaths.length > 0) {
  console.error(`Focused tests require explicit test files: ${invalidPaths.join(", ")}`);
  process.exit(2);
}

const geometryFiles = paths.filter((path) => path.includes(".geometry.browser."));
const stableBrowserFiles = paths.filter(
  (path) => path.includes(".browser.") && !path.includes(".geometry.browser."),
);
const unitFiles = paths.filter((path) => !path.includes(".browser."));

const focusedRuns = [];
if (unitFiles.length > 0) {
  focusedRuns.push(runVitest(["run", ...unitFiles, "--passWithNoTests"]));
}
if (stableBrowserFiles.length > 0) {
  focusedRuns.push(
    runVitest(["run", ...stableBrowserFiles, "--config", "vitest.browser.stable.config.ts"]),
  );
}
if (geometryFiles.length > 0) {
  focusedRuns.push(
    runVitest(["run", ...geometryFiles, "--config", "vitest.browser.geometry.config.ts"]),
  );
}
await Promise.all(focusedRuns);
