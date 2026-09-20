// FILE: unsigned-github-distribution-smoke.ts
// Purpose: Verifies the independent unsigned GitHub download path without signing or updater authority.
// Layer: Build verification script

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8").replaceAll("\r\n", "\n");
}

function assertContains(haystack: string, needle: string, message: string): void {
  if (!haystack.includes(needle)) throw new Error(message);
}

function assertNotContains(haystack: string, needle: string, message: string): void {
  if (haystack.includes(needle)) throw new Error(message);
}

function assertPinnedActions(source: string, label: string): void {
  for (const actionReference of source.matchAll(/uses:\s+([^\s#]+)/g)) {
    if (!/@[0-9a-f]{40}$/iu.test(actionReference[1] ?? "")) {
      throw new Error(
        `${label} expected a 40-character action SHA pin, got ${actionReference[1]}.`,
      );
    }
  }
}

function verifyDistributionWorkflow(): void {
  const workflow = read(".github/workflows/unsigned-github-distribution.yml");
  const proofWorkflow = read(".github/workflows/packaged-proof.yml");
  const ciWorkflow = read(".github/workflows/ci.yml");
  const rootPackage = JSON.parse(read("package.json")) as {
    name?: string;
    version?: string;
    scripts?: Record<string, string>;
  };

  if (rootPackage.name !== "@harnessos/monorepo" || rootPackage.version !== "0.1.0") {
    throw new Error("Expected the canonical Haros root identity and packaged baseline version.");
  }
  if (
    rootPackage.scripts?.["proof:distribution:smoke"] !==
    "node scripts/unsigned-github-distribution-smoke.ts"
  ) {
    throw new Error("Expected a dedicated unsigned GitHub distribution smoke entry point.");
  }

  assertContains(
    workflow,
    "name: Unsigned GitHub Distribution",
    "Expected an independent distribution workflow name.",
  );
  assertContains(
    workflow,
    "publish_github_release:",
    "GitHub Release creation must be an explicit opt-in.",
  );
  assertContains(workflow, "default: false", "GitHub Release creation must default off.");
  const onIndex = workflow.search(/(?:^|\n)on:/u);
  const permissionsIndex = workflow.search(/(?:^|\n)permissions:/u);
  const onBlock =
    onIndex >= 0 && permissionsIndex > onIndex ? workflow.slice(onIndex, permissionsIndex) : "";
  if (!onBlock.includes("workflow_dispatch:")) {
    throw new Error("Distribution must be explicit and manual.");
  }
  if (/\ntags:/u.test(onBlock) || /\npush:/u.test(onBlock)) {
    throw new Error("Distribution must not trigger from a tag push or ordinary push.");
  }
  assertContains(
    workflow,
    "permissions:\n  contents: read",
    "The default distribution authority is read-only.",
  );
  assertContains(
    workflow,
    "if: needs.source.outputs.publish_github_release == 'true'",
    "Publication must stay gated on the explicit opt-in.",
  );
  assertContains(
    workflow,
    "permissions:\n      contents: write",
    "Write authority belongs only to the opt-in publish job.",
  );
  assertNotContains(
    workflow,
    "id-token: write",
    "Distribution must not request publication identity.",
  );
  assertNotContains(workflow, "secrets.", "Unsigned distribution must not read signing secrets.");
  assertNotContains(
    workflow,
    "CSC_LINK",
    "Unsigned distribution must not consume code-signing material.",
  );
  assertNotContains(workflow, "APPLE_API_KEY", "Unsigned distribution must not notarize.");
  assertNotContains(
    workflow,
    "action-gh-release",
    "Publication must use gh, not a third-party release action.",
  );
  assertContains(
    workflow,
    'HARNESSOS_PUBLISH_RELEASE: "false"',
    "Packager publication must stay denied.",
  );
  assertNotContains(
    workflow,
    "write-release-artifact-provenance",
    "Distribution must not invent a second provenance control plane.",
  );
  assertContains(
    workflow,
    "platform: mac\n            target: dmg",
    "Expected an unsigned macOS DMG lane.",
  );
  assertContains(
    workflow,
    "platform: win\n            target: nsis",
    "Expected an unsigned Windows NSIS lane.",
  );
  assertNotContains(workflow, "platform: linux", "This distribution path is Mac and Windows only.");
  assertContains(workflow, "proof: journey", "macOS must run the isolated packaged journey.");
  assertContains(workflow, "proof: startup", "Windows must run startup smoke.");
  assertContains(
    workflow,
    "retention-days: 14",
    "Unsigned distribution artifacts may outlive proof artifacts.",
  );
  assertContains(workflow, "gh release create", "Opt-in publication creates a GitHub Release.");
  assertContains(workflow, "--prerelease", "An unsigned download must remain a prerelease.");
  assertContains(workflow, "--verify-tag", "Publication must bind an existing tag.");
  assertContains(
    workflow,
    "These files are not Developer ID signed or notarized",
    "Release notes must refuse signed-release claims.",
  );
  assertContains(
    workflow,
    "do not create an update feed",
    "Release notes must refuse updater claims.",
  );
  assertContains(
    workflow,
    "latest(-mac|-linux)?\\.yml$",
    "Distribution must refuse updater metadata files.",
  );
  assertContains(
    ciWorkflow,
    "node scripts/unsigned-github-distribution-smoke.ts",
    "Canonical CI must verify the distribution control plane.",
  );
  assertNotContains(
    proofWorkflow,
    "unsigned-github-distribution",
    "Unsigned packaged proof must remain independent of GitHub distribution.",
  );
  assertNotContains(
    proofWorkflow,
    "gh release create",
    "Unsigned packaged proof must not create GitHub Releases.",
  );

  const buildScript = read("scripts/build-desktop-artifact.ts");
  assertContains(buildScript, "publish: null", "Packager publication must stay disabled.");
  assertContains(buildScript, "--publish never", "electron-builder publication must stay denied.");
  assertContains(
    buildScript,
    "delete buildEnv.GITHUB_TOKEN",
    "Packager must discard ambient GitHub publication authority.",
  );

  assertPinnedActions(workflow, "Unsigned GitHub Distribution");
  assertPinnedActions(ciWorkflow, "CI");
}

verifyDistributionWorkflow();
console.log("Unsigned GitHub distribution smoke checks passed.");
