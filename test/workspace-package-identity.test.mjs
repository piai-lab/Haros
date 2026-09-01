import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXPECTED_WORKSPACE_PACKAGES = new Map([
  ["package.json", "@harnessos/monorepo"],
  ["apps/desktop/package.json", "@harnessos/desktop"],
  ["apps/server/package.json", "@harnessos/server"],
  ["apps/web/package.json", "@harnessos/web"],
  ["packages/contracts/package.json", "@harnessos/contracts"],
  ["packages/shared/package.json", "@harnessos/shared"],
  ["scripts/package.json", "@harnessos/scripts"],
]);

async function readAdoptedDonorIdentity() {
  const record = JSON.parse(await readFile(path.join(root, "source-adoptions.json"), "utf8"));
  // The platform adoption is identified by shape, not by a donor name kept in
  // this repo: it is the only record whose paths cover the root manifest plus
  // the web and server workspaces.
  const platformAdoptions = record.adopted.filter(
    (entry) =>
      Array.isArray(entry.paths) &&
      entry.paths.includes("package.json") &&
      entry.paths.includes("apps/web") &&
      entry.paths.includes("apps/server"),
  );
  assert.equal(platformAdoptions.length, 1, "platform adoption record is required and unique");
  const pathname = new URL(platformAdoptions[0].url).pathname;
  const repositoryName = path.posix.basename(pathname, ".git");
  assert.match(repositoryName, /^[a-z][a-z0-9-]+$/u);
  return repositoryName;
}

test("private workspace packages use the stable @harnessos machine namespace without aliases", async () => {
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
