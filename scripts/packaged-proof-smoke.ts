// FILE: packaged-proof-smoke.ts
// Purpose: Rejects publication authority and mutable inputs in the unsigned packaged proof path.
// Layer: Build verification script

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { HARNESSOS_PRODUCTION_BUNDLE_ID } from "@harnessos/shared/desktopIdentity";
import {
  RELEASE_LOCKFILE_PATH,
  RELEASE_WORKSPACE_MANIFEST_PATHS,
} from "./lib/release-workspace-manifests.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function assertContains(haystack: string, needle: string, message: string): void {
  if (!haystack.includes(needle)) throw new Error(message);
}

function assertNotContains(haystack: string, needle: string, message: string): void {
  if (haystack.includes(needle)) throw new Error(message);
}

function verifyCanonicalIdentity(): void {
  const rootPackage = JSON.parse(read("package.json")) as { name?: string; version?: string };
  const serverPackage = JSON.parse(read("apps/server/package.json")) as {
    name?: string;
    bin?: Record<string, string>;
  };
  if (rootPackage.name !== "@harnessos/monorepo" || rootPackage.version !== "0.1.0-alpha.0") {
    throw new Error("Expected the canonical HarnessOS root identity and alpha baseline version.");
  }
  if (serverPackage.name !== "@harnessos/server") {
    throw new Error("Expected the canonical HarnessOS server package.");
  }
  if (
    JSON.stringify(serverPackage.bin ?? {}) !==
    JSON.stringify({
      harnessos: "dist/index.mjs",
      "harnessos-restore-migration-backup": "dist/restoreMigrationBackup.mjs",
    })
  ) {
    throw new Error("Expected only canonical HarnessOS CLI entry points.");
  }
  if (HARNESSOS_PRODUCTION_BUNDLE_ID !== "ai.piai.harnessos") {
    throw new Error(`Unexpected production bundle ID: ${HARNESSOS_PRODUCTION_BUNDLE_ID}.`);
  }
}

function verifyWorkflow(): void {
  const workflow = read(".github/workflows/packaged-proof.yml");
  const ciWorkflow = read(".github/workflows/ci.yml");

  assertContains(
    workflow,
    "name: Unsigned Packaged Proof",
    "Expected an explicit proof-only name.",
  );
  assertContains(workflow, "workflow_dispatch:", "Expected a manual proof entry point.");
  assertContains(workflow, "branches:\n      - main", "Expected proof on canonical main.");
  assertNotContains(workflow, "tags:", "Unsigned proof must never be triggered as a release tag.");
  assertContains(workflow, "permissions:\n  contents: read", "Proof needs read-only authority.");
  assertNotContains(workflow, "contents: write", "Proof must not write repository contents.");
  assertNotContains(workflow, "id-token: write", "Proof must not request publication identity.");
  assertNotContains(workflow, "secrets.", "Unsigned proof must not read signing secrets.");
  assertNotContains(workflow, "action-gh-release", "Proof must not create GitHub Releases.");
  assertNotContains(workflow, "latest.yml", "Proof must not collect updater feeds.");
  assertContains(workflow, 'HARNESSOS_PUBLISH_RELEASE: "false"', "Publishing must be denied.");
  assertNotContains(
    workflow,
    "write-release-artifact-provenance",
    "Proof must not carry a release-publication control plane.",
  );
  assertContains(
    workflow,
    '--source-commit "${{ needs.source.outputs.source_commit }}"',
    "Packaged verification must bind the frozen source SHA.",
  );
  assertContains(
    workflow,
    '--lockfile-sha256 "$LOCKFILE_SHA256"',
    "Packaging must bind the frozen lockfile digest.",
  );
  assertContains(workflow, "platform: mac\n            target: dmg", "Expected macOS proof.");
  assertContains(
    workflow,
    "platform: linux\n            target: AppImage",
    "Expected Linux proof.",
  );
  assertContains(workflow, "platform: win\n            target: nsis", "Expected Windows proof.");
  assertContains(workflow, "proof: journey", "macOS must run the isolated packaged journey.");
  assertContains(workflow, "proof: startup", "Linux and Windows must run startup smoke.");
  assertContains(workflow, "retention-days: 3", "Unsigned artifacts must expire quickly.");

  assertContains(
    ciWorkflow,
    "node scripts/packaged-proof-smoke.ts",
    "Canonical CI must verify the proof control plane.",
  );
  assertNotContains(
    ciWorkflow,
    "node scripts/release-smoke.ts",
    "Legacy release smoke must be gone.",
  );

  for (const source of [workflow, ciWorkflow]) {
    for (const actionReference of source.matchAll(/uses:\s+([^\s#]+)/g)) {
      if (!/@[0-9a-f]{40}$/iu.test(actionReference[1] ?? "")) {
        throw new Error(`Expected a 40-character action SHA pin, got ${actionReference[1]}.`);
      }
    }
  }
}

function verifyPackagerDeniesAmbientPublication(): void {
  const buildScript = read("scripts/build-desktop-artifact.ts");
  assertContains(
    buildScript,
    "bun install --frozen-lockfile --ignore-scripts --linker hoisted",
    "Packaging must install immutable dependencies without lifecycle scripts.",
  );
  assertContains(buildScript, "publish: null", "Packager publication must be disabled.");
  assertContains(
    buildScript,
    "delete buildEnv.GITHUB_TOKEN",
    "Packager must discard ambient GitHub publication authority.",
  );

  const lockfile = read(RELEASE_LOCKFILE_PATH);
  const packagesSectionOffset = lockfile.indexOf('\n  "packages": {');
  if (packagesSectionOffset < 0) throw new Error("Expected bun.lock packages section.");
  const workspaceImporters = lockfile.slice(0, packagesSectionOffset);
  for (const manifestPath of RELEASE_WORKSPACE_MANIFEST_PATHS) {
    const workspacePath = manifestPath === "package.json" ? "" : dirname(manifestPath);
    if (workspaceImporters.indexOf(`${JSON.stringify(workspacePath)}: {`) < 0) {
      throw new Error(`Expected ${manifestPath} to have a matching bun.lock importer.`);
    }
  }
}

verifyCanonicalIdentity();
verifyWorkflow();
verifyPackagerDeniesAmbientPublication();
console.log("Unsigned packaged proof smoke checks passed.");
