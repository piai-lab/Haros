import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXPECTED_WORKSPACE_PACKAGES = new Map([
  ["package.json", "@omnimind/monorepo"],
  ["apps/desktop/package.json", "@omnimind/desktop"],
  ["apps/server/package.json", "@omnimind/server"],
  ["apps/web/package.json", "@omnimind/web"],
  ["packages/contracts/package.json", "@omnimind/contracts"],
  ["packages/shared/package.json", "@omnimind/shared"],
  ["scripts/package.json", "@omnimind/scripts"],
]);

async function readAdoptedDonorIdentity() {
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const block = /```source-adoptions\s*\n([\s\S]*?)^```\s*$/gmu.exec(readme);
  assert.ok(block, "README source-adoptions block is required");
  const record = JSON.parse(block[1]);
  const adoption = record.adopted.find((entry) => entry.id === "ui-mother");
  assert.ok(adoption, "ui-mother adoption is required");
  const pathname = new URL(adoption.url).pathname;
  const repositoryName = path.posix.basename(pathname, ".git");
  assert.match(repositoryName, /^[a-z][a-z0-9-]+$/u);
  return repositoryName;
}

test("private workspace packages use the OmniMind namespace without aliases", async () => {
  for (const [relativePath, expectedName] of EXPECTED_WORKSPACE_PACKAGES) {
    const manifest = JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
    assert.equal(manifest.name, expectedName, relativePath);
  }
});

test("production engineering roots do not regain retired donor identities", async () => {
  const donorIdentity = await readAdoptedDonorIdentity();
  const escapedIdentity = donorIdentity.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const retiredEngineeringIdentities = [
    {
      label: "workspace package scope",
      pattern: new RegExp(`@${escapedIdentity}(?:/|(?=["']))`, "iu"),
    },
    {
      label: "private environment prefix",
      pattern: new RegExp(`\\b${escapedIdentity.toUpperCase()}_[A-Z0-9_]+\\b`, "iu"),
    },
    {
      label: "private dotfile prefix",
      pattern: new RegExp(`(^|[/'"])\\.${escapedIdentity}-`, "imu"),
    },
  ];
  const tracked = execFileSync(
    "git",
    [
      "ls-files",
      "-z",
      "--",
      "apps",
      "packages",
      "scripts",
      ".github",
      ".oxlintrc.json",
      "bun.lock",
      "package.json",
      "vitest.config.ts",
    ],
    { cwd: root, encoding: "buffer" },
  )
    .toString("utf8")
    .split("\0")
    .filter(Boolean);

  const findings = [];
  for (const relativePath of tracked) {
    const bytes = await readFile(path.join(root, relativePath));
    if (bytes.includes(0)) continue;
    const text = bytes.toString("utf8");
    for (const identity of retiredEngineeringIdentities) {
      const match = identity.pattern.exec(text);
      if (!match) continue;
      findings.push({
        identity: identity.label,
        line: text.slice(0, match.index).split("\n").length,
        path: relativePath,
      });
    }
  }

  assert.deepEqual(findings, []);
});
