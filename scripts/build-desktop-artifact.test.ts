import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildScript = join(repoRoot, "scripts/build-desktop-artifact.ts");
const platform =
  process.platform === "darwin" ? "mac" : process.platform === "win32" ? "win" : "linux";
const arch = process.arch === "arm64" ? "arm64" : "x64";
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function runBuildScript(args: ReadonlyArray<string>) {
  return spawnSync(
    process.execPath,
    [buildScript, "--platform", platform, "--arch", arch, ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 10_000,
    },
  );
}

describe("desktop artifact candidate ownership", () => {
  it("rejects a candidate with a non-exact source commit", () => {
    const result = runBuildScript(["--source-commit", "deadbeef"]);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "Expected a full 40-character source commit",
    );
  });

  it("refuses to overwrite an existing artifact directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "harnessos-artifact-output-test-"));
    temporaryRoots.push(outputDirectory);
    writeFileSync(join(outputDirectory, "existing-artifact.zip"), "immutable");

    const result = runBuildScript(["--output-dir", outputDirectory]);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "Desktop artifact output directory is not empty",
    );
    expect(`${result.stdout}\n${result.stderr}`).toContain("candidate artifacts are immutable");
  });
});
