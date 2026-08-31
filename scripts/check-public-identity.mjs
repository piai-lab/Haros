import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const formerWorkingName = ["Harness", "OS"].join("");
const predecessorName = ["Omni", "Mind"].join("");

const historicalProvenancePath = "docs/provenance.md";
const persistedMigrationPaths = new Set([
  "apps/server/src/persistence/Migrations.ts",
  "apps/server/src/persistence/Migrations.integration.test.ts",
]);
const persistedMigrationToken = `${formerWorkingName}InitialSchema`;

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "buffer",
  })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function lineNumber(text, index) {
  return text.slice(0, index).split("\n").length;
}

function removePersistedMigrationToken(relativePath, text) {
  return persistedMigrationPaths.has(relativePath)
    ? text.replaceAll(persistedMigrationToken, "")
    : text;
}

const findings = [];
for (const relativePath of trackedFiles()) {
  const bytes = await readFile(path.join(repositoryRoot, relativePath));
  if (bytes.includes(0)) continue;

  const text = bytes.toString("utf8");
  if (relativePath !== historicalProvenancePath) {
    const productScan = removePersistedMigrationToken(relativePath, text);
    const formerIndex = productScan.indexOf(formerWorkingName);
    if (formerIndex >= 0) {
      findings.push({
        identity: "former product working name",
        line: lineNumber(productScan, formerIndex),
        path: relativePath,
      });
    }

    const predecessorIndex = text.toLowerCase().indexOf(predecessorName.toLowerCase());
    if (predecessorIndex >= 0) {
      findings.push({
        identity: "predecessor product name",
        line: lineNumber(text, predecessorIndex),
        path: relativePath,
      });
    }
  }
}

assert.deepEqual(findings, [], `Retired public identities remain:\n${JSON.stringify(findings)}`);

const desktopManifest = JSON.parse(
  await readFile(path.join(repositoryRoot, "apps/desktop/package.json"), "utf8"),
);
assert.equal(desktopManifest.productName, "Haros");

const webManifest = JSON.parse(
  await readFile(path.join(repositoryRoot, "apps/web/public/site.webmanifest"), "utf8"),
);
assert.equal(webManifest.name, "Haros");
assert.equal(webManifest.short_name, "Haros");

const readme = await readFile(path.join(repositoryRoot, "README.md"), "utf8");
const chineseReadme = await readFile(path.join(repositoryRoot, "docs/README.zh-CN.md"), "utf8");
const harosHeading = /(?:^# Haros$|<h1(?:\s+[^>]*)?>Haros<\/h1>)/mu;
assert.match(readme, harosHeading);
assert.match(chineseReadme, harosHeading);
assert.match(readme, /github\.com\/piai-lab\/Haros/u);
assert.match(readme, /docs\/README\.zh-CN\.md/u);
assert.match(chineseReadme, /\.\.\/README\.md/u);

console.log("Verified Haros public identity and retired-name absence.");
