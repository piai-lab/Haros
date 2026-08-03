import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { discoverGeneratedFiles } from "../scripts/check-identity.mjs";
import { parseDenylist, parseStructurePolicy, scanIdentity } from "../scripts/identity.mjs";
import { parseSourceAdoptions, validateSourceAdoptions } from "../scripts/sources.mjs";
import { repositoryFiles } from "../scripts/repository-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const governingReadme = await import("node:fs/promises").then(({ readFile }) =>
  readFile(path.join(root, "README.md"), "utf8"),
);
const rules = parseDenylist(governingReadme);
const structurePolicy = parseStructurePolicy(governingReadme);
const structurePolicyBlock = governingReadme.match(/```structure-policy\s*\n[\s\S]*?```/)[0];

function policyReadme(rule) {
  return `\`\`\`identity-denylist\n${rule}\n\`\`\`\n${structurePolicyBlock}\n`;
}

test("identity scan detects separated variants without printing source text", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "identity-check-"));
  const compoundRule = rules.find((rule) => /[-_ ]/.test(rule));
  assert.ok(compoundRule);
  const variant = compoundRule.replace(/[-_ ]+/g, " ");
  await writeFile(path.join(temporaryRoot, "README.md"), policyReadme(compoundRule));
  await writeFile(path.join(temporaryRoot, "sample.txt"), `prefix ${variant} suffix\n`);

  const result = await scanIdentity({
    root: temporaryRoot,
    trackedFiles: ["README.md", "sample.txt"],
  });

  assert.equal(result.findings.length, 1);
  assert.deepEqual(
    {
      path: result.findings[0].path,
      surface: result.findings[0].surface,
      rule: result.findings[0].rule,
    },
    { path: "sample.txt", surface: "source", rule: compoundRule },
  );
});

test("identity scan permits only explicitly injected runtime fixtures", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "identity-fixture-"));
  const rule = rules[0];
  await writeFile(path.join(temporaryRoot, "README.md"), policyReadme(rule));
  await mkdir(path.join(temporaryRoot, "test"));
  await writeFile(path.join(temporaryRoot, "test", "runtime.txt"), `${rule}\n`);

  const blocked = await scanIdentity({
    root: temporaryRoot,
    trackedFiles: ["README.md", "test/runtime.txt"],
  });
  const allowed = await scanIdentity({
    root: temporaryRoot,
    trackedFiles: ["README.md", "test/runtime.txt"],
    runtimeFixtures: ["test/runtime.txt"],
  });

  assert.equal(blocked.findings.length, 1);
  assert.equal(allowed.findings.length, 0);
});

test("identity scan covers paths, source text, and generated output separately", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "identity-surfaces-"));
  const rule = rules[0];
  await writeFile(path.join(temporaryRoot, "README.md"), policyReadme(rule));
  await mkdir(path.join(temporaryRoot, "packages", `${rule}-path`), { recursive: true });
  await mkdir(path.join(temporaryRoot, "dist"));
  await writeFile(path.join(temporaryRoot, "packages", `${rule}-path`, "clean.mjs"), "export {};\n");
  await writeFile(path.join(temporaryRoot, "packages", "source.mjs"), `export const value = ${JSON.stringify(rule)};\n`);
  await writeFile(path.join(temporaryRoot, "dist", "bundle.js"), `globalThis.name = ${JSON.stringify(rule)};\n`);

  const result = await scanIdentity({
    root: temporaryRoot,
    sourceFiles: ["README.md", `packages/${rule}-path/clean.mjs`, "packages/source.mjs"],
    generatedFiles: ["dist/bundle.js"],
  });

  assert.deepEqual(
    new Set(result.findings.map((finding) => finding.surface)),
    new Set(["path", "source", "generated-output"]),
  );
});

test("generated output discovery includes ignored-style build roots but excludes dependencies", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "generated-surface-"));
  await mkdir(path.join(temporaryRoot, "apps", "desktop", "dist"), { recursive: true });
  await mkdir(path.join(temporaryRoot, "node_modules", "package", "dist"), { recursive: true });
  await writeFile(path.join(temporaryRoot, "apps", "desktop", "dist", "bundle.js"), "export {};\n");
  await writeFile(
    path.join(temporaryRoot, "node_modules", "package", "dist", "dependency.js"),
    "export {};\n",
  );

  const generated = await discoverGeneratedFiles(temporaryRoot, structurePolicy);

  assert.deepEqual(generated, ["apps/desktop/dist/bundle.js"]);
});

test("structure policy rejects garbage containers and excessive nesting", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "structure-policy-"));
  const rule = rules[0];
  await writeFile(path.join(temporaryRoot, "README.md"), policyReadme(rule));
  const paths = [
    "packages/common/value.mjs",
    "packages/a/b/c/d/e/f/g/too-deep.mjs",
    "foreign/feature.mjs",
  ];
  for (const relativePath of paths) {
    await mkdir(path.dirname(path.join(temporaryRoot, relativePath)), { recursive: true });
    await writeFile(path.join(temporaryRoot, relativePath), "export {};\n");
  }

  const result = await scanIdentity({ root: temporaryRoot, sourceFiles: ["README.md", ...paths] });
  const structureRules = result.findings
    .filter((finding) => finding.surface === "structure")
    .map((finding) => finding.rule);

  assert.ok(structureRules.includes('forbidden name token "common"'));
  assert.ok(structureRules.some((finding) => finding.startsWith("directory depth")));
  assert.ok(structureRules.includes('unapproved author root "foreign"'));
});

test("source inventory accepts an empty adoption set", () => {
  const document = `\`\`\`source-adoptions\n{"adopted":[]}\n\`\`\``;
  const adoptions = parseSourceAdoptions(document);
  assert.deepEqual(adoptions, []);
  assert.deepEqual(validateSourceAdoptions(adoptions, []), []);
});

test("source inventory requires complete adoption and tracked legal text", () => {
  const errors = validateSourceAdoptions([{ id: "source-one", licenseFiles: ["outside.txt"] }], []);
  assert.ok(errors.some((error) => error.includes("revision")));
  assert.ok(errors.some((error) => error.includes("LICENSES/")));
});

test("source inventory validates exact repository paths, mode, URL, and legal text", () => {
  const adoption = {
    id: "source-one",
    url: "https://example.com/source.git",
    revision: "a".repeat(40),
    paths: ["vendor/source"],
    rights: "MIT",
    mode: "adapt",
    changes: "none",
    updatePolicy: "manual",
    licenseFiles: ["LICENSES/source.txt"],
  };
  const tracked = ["vendor/source/index.ts", "LICENSES/source.txt"];

  assert.deepEqual(validateSourceAdoptions([adoption], tracked), []);
  assert.ok(
    validateSourceAdoptions(
      [{ ...adoption, url: "git@example.com:source.git", mode: "copy", paths: ["../source"] }],
      tracked,
    ).length >= 3,
  );
  assert.ok(
    validateSourceAdoptions([{ ...adoption, paths: ["vendor/missing"] }], tracked).some((error) =>
      error.includes("no tracked files"),
    ),
  );
});

test("repository inventory excludes tracked paths deleted from the working tree", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "repository-files-"));
  await writeFile(path.join(temporaryRoot, "kept.txt"), "kept\n");
  await writeFile(path.join(temporaryRoot, "deleted.txt"), "deleted\n");
  await writeFile(path.join(temporaryRoot, "untracked.txt"), "untracked\n");

  assert.equal(spawnSync("git", ["init", "--quiet"], { cwd: temporaryRoot }).status, 0);
  assert.equal(
    spawnSync("git", ["add", "kept.txt", "deleted.txt"], { cwd: temporaryRoot }).status,
    0,
  );
  await unlink(path.join(temporaryRoot, "deleted.txt"));

  assert.deepEqual(repositoryFiles(temporaryRoot), ["kept.txt", "untracked.txt"]);
});
