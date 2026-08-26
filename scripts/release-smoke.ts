// FILE: release-smoke.ts
// Purpose: Smoke-tests release version alignment and merged macOS updater manifests.
// Layer: Release verification script
// Depends on: update-release-package-versions.ts and merge-mac-update-manifests.ts.

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { OMNIMIND_PRODUCTION_BUNDLE_ID } from "@omnimind/shared/desktopIdentity";

import {
  OMNIMIND_PI_RUNTIME_PACKAGE_PATH,
  RELEASE_LOCKFILE_PATH,
  RELEASE_PATCHES_PATH,
  RELEASE_WORKSPACE_MANIFEST_PATHS,
} from "./lib/release-workspace-manifests.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function copyWorkspaceManifestFixture(targetRoot: string): void {
  for (const relativePath of RELEASE_WORKSPACE_MANIFEST_PATHS) {
    const sourcePath = resolve(repoRoot, relativePath);
    const destinationPath = resolve(targetRoot, relativePath);
    mkdirSync(dirname(destinationPath), { recursive: true });
    cpSync(sourcePath, destinationPath);
  }
  cpSync(resolve(repoRoot, RELEASE_LOCKFILE_PATH), resolve(targetRoot, RELEASE_LOCKFILE_PATH));
  cpSync(resolve(repoRoot, RELEASE_PATCHES_PATH), resolve(targetRoot, RELEASE_PATCHES_PATH), {
    recursive: true,
  });
  const runtimePackageDestination = resolve(targetRoot, OMNIMIND_PI_RUNTIME_PACKAGE_PATH);
  mkdirSync(dirname(runtimePackageDestination), { recursive: true });
  cpSync(resolve(repoRoot, OMNIMIND_PI_RUNTIME_PACKAGE_PATH), runtimePackageDestination);
}

function writeMacManifestFixtures(targetRoot: string): { arm64Path: string; x64Path: string } {
  const assetDirectory = resolve(targetRoot, "release-assets");
  mkdirSync(assetDirectory, { recursive: true });

  const arm64Path = resolve(assetDirectory, "latest-mac.yml");
  const x64Path = resolve(assetDirectory, "latest-mac-x64.yml");

  writeFileSync(
    arm64Path,
    `version: 9.9.9-smoke.0
files:
  - url: OmniMind-9.9.9-smoke.0-arm64.zip
    sha512: arm64zip
    size: 125621344
path: OmniMind-9.9.9-smoke.0-arm64.zip
sha512: arm64zip
releaseDate: '2026-03-08T10:32:14.587Z'
`,
  );

  writeFileSync(
    x64Path,
    `version: 9.9.9-smoke.0
files:
  - url: OmniMind-9.9.9-smoke.0-x64.zip
    sha512: x64zip
    size: 132000112
path: OmniMind-9.9.9-smoke.0-x64.zip
sha512: x64zip
releaseDate: '2026-03-08T10:36:07.540Z'
`,
  );

  return { arm64Path, x64Path };
}

function assertContains(haystack: string, needle: string, message: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotContains(haystack: string, needle: string, message: string): void {
  if (haystack.includes(needle)) {
    throw new Error(message);
  }
}

function verifyCanonicalIdentity(): void {
  const serverPackage = JSON.parse(
    readFileSync(resolve(repoRoot, "apps/server/package.json"), "utf8"),
  ) as { name?: string; bin?: Record<string, string> };
  if (serverPackage.name !== "@omnimind/server") {
    throw new Error(
      `Expected CLI package @omnimind/server, got ${serverPackage.name ?? "<missing>"}.`,
    );
  }
  const expectedBinaries = {
    omnimind: "dist/index.mjs",
    "omnimind-restore-migration-backup": "dist/restoreMigrationBackup.mjs",
  };
  if (JSON.stringify(serverPackage.bin ?? {}) !== JSON.stringify(expectedBinaries)) {
    throw new Error(
      "Expected the CLI to expose only the OmniMind entry point and migration recovery binary.",
    );
  }
  if (OMNIMIND_PRODUCTION_BUNDLE_ID !== "app.omnimind.desktop") {
    throw new Error(`Unexpected production bundle ID: ${OMNIMIND_PRODUCTION_BUNDLE_ID}.`);
  }
}

function verifyReleaseWorkflowSafety(): void {
  const ciWorkflow = readFileSync(resolve(repoRoot, ".github/workflows/ci.yml"), "utf8");
  assertContains(
    ciWorkflow,
    "group: ci-${{ github.event.pull_request.number || github.ref }}",
    "Expected CI concurrency to be scoped to the pull request or ref.",
  );
  assertContains(
    ciWorkflow,
    "cancel-in-progress: true",
    "Expected a newer commit on the same CI ref to cancel the old run.",
  );
  assertContains(
    ciWorkflow,
    "runs-on: ubuntu-24.04",
    "Expected normal CI to use the Linux quality runner.",
  );
  assertNotContains(ciWorkflow, "windows-2022", "Normal CI must not spend Windows runner minutes.");
  assertNotContains(ciWorkflow, "macos-", "Normal CI must not spend macOS runner minutes.");
  assertContains(
    ciWorkflow,
    "node scripts/release-smoke.ts",
    "Expected release control-plane checks to share the existing Linux quality job.",
  );
  assertNotContains(
    ciWorkflow,
    "release_smoke:",
    "Release smoke must not regain a duplicate CI job.",
  );

  const workflow = readFileSync(resolve(repoRoot, ".github/workflows/release.yml"), "utf8");
  assertContains(
    workflow,
    "name: Desktop Build",
    "Expected the cross-platform workflow to remain build-only.",
  );
  assertContains(
    workflow,
    "workflow_dispatch:",
    "Expected an explicit manual cross-platform build entry point.",
  );
  assertContains(
    workflow,
    'tags:\n      - "v*.*.*"',
    "Expected formal version tags to run the build-only artifact workflow.",
  );
  assertContains(
    workflow,
    "permissions:\n  contents: read",
    "Build-only jobs need repository read permission only.",
  );
  assertContains(
    workflow,
    "group: desktop-build-${{ github.ref }}",
    "Expected build concurrency to be scoped to the exact ref.",
  );
  assertContains(
    workflow,
    "cancel-in-progress: true",
    "Expected a newer build request for the same ref to cancel the old run.",
  );
  assertNotContains(
    workflow,
    "publish_release",
    "Build-only workflow must not expose a publication switch.",
  );
  assertNotContains(
    workflow,
    "action-gh-release",
    "Build-only workflow must not create GitHub Releases.",
  );
  assertNotContains(
    workflow,
    "prepare-release-update-feed",
    "Build-only workflow must not mutate updater feed metadata.",
  );
  assertNotContains(
    workflow,
    "id-token: write",
    "Build-only workflow must not request OIDC publication authority.",
  );
  assertNotContains(
    workflow,
    "contents: write",
    "Build-only workflow must not request repository write authority.",
  );
  assertContains(
    workflow,
    "VITE_PUBLIC_SITE_ORIGIN: https://omnimind.wisdomeyes.cn",
    "Production desktop builds must retain the canonical public-site origin.",
  );
  assertContains(
    workflow,
    "VITE_FEEDBACK_ENDPOINT: https://omnimind.wisdomeyes.cn/api/v1/feedback",
    "Production desktop builds must retain the independently configured feedback endpoint.",
  );
  assertContains(
    workflow,
    "node scripts/verify-release-source-provenance.ts",
    "Expected preflight to bind release source provenance before artifact jobs.",
  );
  assertContains(
    workflow,
    "source_commit: ${{ steps.source_provenance.outputs.source_commit }}",
    "Expected the verified source commit to be a preflight output.",
  );
  assertContains(
    workflow,
    "lockfile_sha256: ${{ steps.source_provenance.outputs.lockfile_sha256 }}",
    "Expected the verified lockfile digest to be a preflight output.",
  );
  assertContains(
    workflow,
    '--source-commit "$SOURCE_COMMIT"',
    "Expected desktop packaging to revalidate the verified source commit.",
  );
  assertContains(
    workflow,
    '--lockfile-sha256 "$LOCKFILE_SHA256"',
    "Expected desktop packaging to revalidate the verified lockfile digest.",
  );
  assertNotContains(
    workflow,
    "Align package versions to release version",
    "Release jobs must not mutate package versions after source provenance is established.",
  );
  assertContains(
    workflow,
    "node scripts/write-release-artifact-provenance.ts",
    "Expected every platform lane to prove collected artifacts before upload.",
  );
  assertContains(
    workflow,
    "node scripts/verify-packaged-desktop-startup.ts",
    "Expected every native payload to pass isolated packaged startup before upload.",
  );
  assertContains(
    workflow,
    '--source-commit "${{ needs.preflight.outputs.source_commit }}"',
    "Expected packaged startup to verify the exact preflight source commit.",
  );
  assertContains(
    workflow,
    "retention-days: 5",
    "Expected temporary cross-platform artifacts to expire after five days.",
  );
  assertContains(
    workflow,
    "runner: macos-14",
    "Expected the formal build path to retain macOS arm64 coverage.",
  );
  assertContains(
    workflow,
    "runner: ubuntu-24.04",
    "Expected the formal build path to retain Linux x64 coverage.",
  );
  assertContains(
    workflow,
    "runner: windows-2022",
    "Expected the formal build path to retain Windows x64 coverage.",
  );
  assertNotContains(
    workflow,
    "macos-15-intel",
    "The build-only path must not restore the duplicate macOS x64 lane.",
  );
  for (const actionReference of workflow.matchAll(/uses:\s+([^\s#]+)/g)) {
    if (!/@[0-9a-f]{40}$/i.test(actionReference[1] ?? "")) {
      throw new Error(`Expected a 40-character action SHA pin, got ${actionReference[1]}.`);
    }
  }
  for (const actionReference of ciWorkflow.matchAll(/uses:\s+([^\s#]+)/g)) {
    if (!/@[0-9a-f]{40}$/i.test(actionReference[1] ?? "")) {
      throw new Error(`Expected a 40-character action SHA pin, got ${actionReference[1]}.`);
    }
  }
  assertContains(
    workflow,
    "--publication false",
    "Expected artifact provenance to record that this workflow cannot publish.",
  );
  assertNotContains(
    workflow,
    "secrets.",
    "Unsigned build-only workflow must not read signing or publication secrets.",
  );
}

function verifyDesktopStageLockAuthority(): void {
  const buildScript = readFileSync(resolve(repoRoot, "scripts/build-desktop-artifact.ts"), "utf8");
  const gitAttributes = readFileSync(resolve(repoRoot, ".gitattributes"), "utf8");
  assertContains(
    gitAttributes,
    "bun.lock text eol=lf",
    "Expected bun.lock to retain byte-identical LF endings on every release runner.",
  );
  assertContains(
    buildScript,
    "bun install --frozen-lockfile --ignore-scripts --linker hoisted",
    "Expected macOS and Linux desktop staging to install from the repository's frozen workspace lockfile.",
  );
  assertContains(
    buildScript,
    'if (platform === "win")',
    "Expected Windows staging to use its explicit Bun lockfile-workaround path.",
  );
  assertContains(
    buildScript,
    "bun install --omit=dev --ignore-scripts --linker hoisted",
    "Expected Windows staging to omit dev dependencies without Bun's implicitly frozen production mode.",
  );
  assertNotContains(
    buildScript,
    "--production --frozen-lockfile",
    "Desktop staging must avoid Bun's divergent frozen production-workspace lockfile resolution.",
  );
  assertNotContains(
    buildScript,
    "bun install --production",
    "Windows staging must not use Bun's production flag because it implicitly forces frozen mode.",
  );
  assertNotContains(
    buildScript,
    "--filter @omnimind/",
    "Desktop staging must not use Bun workspace filters because filtered hoisted installs can diverge from bun.lock.",
  );
  assertContains(
    buildScript,
    ")`npm rebuild node-pty --foreground-scripts`,",
    "Expected Linux desktop staging to build only node-pty after the script-free frozen install.",
  );
  assertNotContains(
    buildScript,
    "npm rebuild --foreground-scripts",
    "Desktop staging must never enable every dependency lifecycle script.",
  );
  assertNotContains(
    buildScript,
    "bun pm trust --all",
    "Desktop staging must never trust every dependency lifecycle script.",
  );
  assertContains(
    buildScript,
    'createRequire(new URL("./package.json", import.meta.url))',
    "Expected desktop packaging to resolve dependencies from the owning scripts workspace.",
  );
  assertContains(
    buildScript,
    'requireFromScriptsWorkspace.resolve("electron-builder/cli.js")',
    "Expected desktop packaging to resolve electron-builder across Bun hoisting layouts.",
  );
  assertContains(
    buildScript,
    "`${process.execPath} ${electronBuilderCliPath}",
    "Expected desktop packaging to invoke electron-builder through Node without platform-specific bin shims.",
  );
  assertNotContains(
    buildScript,
    "electron-builder.cmd",
    "Desktop packaging must not depend on a Windows bin shim that Bun may hoist elsewhere.",
  );
  assertContains(
    buildScript,
    "omnimindCommitHash: commitHash",
    "Expected the staged package to carry its exact source commit.",
  );
  assertContains(
    buildScript,
    "omnimindLockfileSha256: resolvedLockfileSha256",
    "Expected the staged package to carry its repository lockfile digest.",
  );
  assertContains(
    buildScript,
    "omnimindWindowsPublisherSubject: resolvedBuildConfig.windowsPublisherSubject",
    "Expected signed Windows packages to carry the independently configured certificate subject DN.",
  );
  assertContains(
    buildScript,
    "buildConfig.publish = null",
    "Expected build-only artifacts to deny ambient update-provider inference.",
  );
  assertContains(
    buildScript,
    "delete buildEnv.GITHUB_TOKEN",
    "Expected build-only artifacts to remove ambient publication authority from the packager.",
  );

  const lockfile = readFileSync(resolve(repoRoot, RELEASE_LOCKFILE_PATH), "utf8");
  const packagesSectionOffset = lockfile.indexOf('\n  "packages": {');
  if (packagesSectionOffset < 0) {
    throw new Error("Expected bun.lock to contain a packages section.");
  }
  const workspaceImporters = lockfile.slice(0, packagesSectionOffset);
  for (const manifestPath of RELEASE_WORKSPACE_MANIFEST_PATHS) {
    const workspacePath = manifestPath === "package.json" ? "" : dirname(manifestPath);
    if (!workspaceImporters.includes(`${JSON.stringify(workspacePath)}: {`)) {
      throw new Error(`Expected ${manifestPath} to have a matching importer in bun.lock.`);
    }
  }
}

const tempRoot = mkdtempSync(join(tmpdir(), "omnimind-release-smoke-"));

try {
  verifyCanonicalIdentity();
  verifyReleaseWorkflowSafety();
  verifyDesktopStageLockAuthority();
  copyWorkspaceManifestFixture(tempRoot);

  execFileSync(
    process.execPath,
    [
      resolve(repoRoot, "scripts/update-release-package-versions.ts"),
      "9.9.9-smoke.0",
      "--root",
      tempRoot,
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );

  execFileSync("bun", ["install", "--lockfile-only", "--ignore-scripts"], {
    cwd: tempRoot,
    stdio: "inherit",
  });

  const lockfile = readFileSync(resolve(tempRoot, "bun.lock"), "utf8");
  assertContains(
    lockfile,
    `"version": "9.9.9-smoke.0"`,
    "Expected bun.lock to contain the smoke version.",
  );

  const { arm64Path, x64Path } = writeMacManifestFixtures(tempRoot);
  execFileSync(
    process.execPath,
    [resolve(repoRoot, "scripts/merge-mac-update-manifests.ts"), arm64Path, x64Path],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );

  const mergedManifest = readFileSync(arm64Path, "utf8");
  assertContains(
    mergedManifest,
    "OmniMind-9.9.9-smoke.0-arm64.zip",
    "Merged manifest is missing the arm64 asset.",
  );
  assertContains(
    mergedManifest,
    "OmniMind-9.9.9-smoke.0-x64.zip",
    "Merged manifest is missing the x64 asset.",
  );
  assertNotContains(
    mergedManifest,
    ".dmg",
    "macOS updater manifests must describe only the finalized ZIP artifacts.",
  );

  console.log("Release smoke checks passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
