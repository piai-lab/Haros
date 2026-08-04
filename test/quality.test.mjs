import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { discoverGeneratedFiles } from "../scripts/check-identity.mjs";
import { assertDispositionClosure } from "../scripts/check-source-closure.mjs";
import {
  parseDenylist,
  parsePublicSurfaceDenylist,
  parseStructurePolicy,
  scanIdentity,
} from "../scripts/identity.mjs";
import {
  ignoredVendorSourceFiles,
  parseSourceAdoptions,
  trackedRepositoryFiles,
  validateSourceAdoptions,
  validateSourceRepository,
} from "../scripts/sources.mjs";
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

function runGit(repositoryRoot, args) {
  const result = spawnSync("git", args, { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function sourceAdoption(overrides = {}) {
  return {
    id: "source-one",
    url: "https://example.com/source.git",
    revision: "a".repeat(40),
    paths: ["vendor/source"],
    rights: "MIT",
    mode: "adapt",
    changes: "none",
    updatePolicy: "manual",
    licenseFiles: ["LICENSES/source.txt"],
    ...overrides,
  };
}

async function exactSourceRepository(t) {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "exact-source-"));
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
  await mkdir(path.join(temporaryRoot, "vendor", "source"), { recursive: true });
  await mkdir(path.join(temporaryRoot, "LICENSES"));
  await writeFile(path.join(temporaryRoot, "vendor", "source", "value.txt"), "fixed\n");
  await writeFile(path.join(temporaryRoot, "LICENSES", "source.txt"), "MIT\n");
  runGit(temporaryRoot, ["init", "--quiet"]);
  runGit(temporaryRoot, ["add", "."]);
  runGit(temporaryRoot, [
    "-c",
    "user.name=Quality Fixture",
    "-c",
    "user.email=quality@localhost",
    "commit",
    "--quiet",
    "-m",
    "fixed source",
  ]);
  const commit = runGit(temporaryRoot, ["rev-parse", "HEAD"]);
  const tree = runGit(temporaryRoot, ["rev-parse", "HEAD:vendor/source"]);
  const adoption = sourceAdoption({
    provenance: { repositoryCommit: commit, trees: { "vendor/source": tree } },
  });
  const inventoryFiles = ["LICENSES/source.txt", "vendor/source/value.txt"];
  return { adoption, commit, inventoryFiles, temporaryRoot, tree };
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

test("identity scan permits donor identity only in the root disclosure", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "identity-research-"));
  const rule = rules[0];
  await writeFile(path.join(temporaryRoot, "README.md"), policyReadme(rule));
  await mkdir(path.join(temporaryRoot, "LICENSES"));
  await mkdir(path.join(temporaryRoot, "research"));
  await writeFile(path.join(temporaryRoot, "LICENSES", "source.txt"), `${rule}\n`);
  await writeFile(path.join(temporaryRoot, "research", "source-review.md"), `${rule}\n`);

  const result = await scanIdentity({
    root: temporaryRoot,
    trackedFiles: ["README.md", "LICENSES/source.txt", "research/source-review.md"],
  });

  assert.deepEqual(
    result.findings.map((finding) => [finding.path, finding.surface]),
    [
      ["LICENSES/source.txt", "source"],
      ["research/source-review.md", "source"],
    ],
  );
});

test("identity scan covers paths, source text, and generated output separately", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "identity-surfaces-"));
  const rule = rules[0];
  await writeFile(path.join(temporaryRoot, "README.md"), policyReadme(rule));
  await mkdir(path.join(temporaryRoot, "packages", `${rule}-path`), { recursive: true });
  await mkdir(path.join(temporaryRoot, "dist"));
  await writeFile(
    path.join(temporaryRoot, "packages", `${rule}-path`, "clean.mjs"),
    "export {};\n",
  );
  await writeFile(
    path.join(temporaryRoot, "packages", "source.mjs"),
    `export const value = ${JSON.stringify(rule)};\n`,
  );
  await writeFile(
    path.join(temporaryRoot, "dist", "bundle.js"),
    `globalThis.name = ${JSON.stringify(rule)};\n`,
  );

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

test("public-surface destination rules reject authored and built product leakage", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "public-surface-identity-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const blockedRules = [
    ["try", "omnimind.com"].join(""),
    ["try", "sy", "nara.com"].join(""),
    ["@try", "Sy", "nara"].join(""),
  ];
  await writeFile(path.join(temporaryRoot, "README.md"), policyReadme(rules[0]));
  await mkdir(path.join(temporaryRoot, "apps", "web", "dist"), { recursive: true });
  await writeFile(
    path.join(temporaryRoot, "apps", "web", "source.ts"),
    `export const destination = ${JSON.stringify(blockedRules[0])};\n`,
  );
  await writeFile(
    path.join(temporaryRoot, "apps", "web", "dist", "bundle.js"),
    `globalThis.destinations = ${JSON.stringify(blockedRules.slice(1))};\n`,
  );

  const result = await scanIdentity({
    root: temporaryRoot,
    sourceFiles: ["README.md", "apps/web/source.ts"],
    generatedFiles: ["apps/web/dist/bundle.js"],
    restrictedRules: blockedRules,
    restrictedRoots: ["apps"],
  });

  assert.deepEqual(
    result.findings
      .filter((finding) => finding.surface.startsWith("public-surface-"))
      .map((finding) => finding.rule)
      .toSorted((left, right) => left.localeCompare(right)),
    blockedRules.toSorted((left, right) => left.localeCompare(right)),
  );
});

test("public-surface denylist requires one unique owner block", () => {
  const rules = parsePublicSurfaceDenylist(
    `\`\`\`public-surface-denylist\nfirst.example\nsecond.example\n\`\`\``,
  );
  assert.deepEqual(rules, ["first.example", "second.example"]);
  assert.throws(() => parsePublicSurfaceDenylist(""), /expected one/u);
});

test("generated output discovery includes ignored-style build roots but excludes dependencies", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "generated-surface-"));
  await mkdir(path.join(temporaryRoot, "apps", "desktop", "dist"), { recursive: true });
  await mkdir(path.join(temporaryRoot, "node_modules", "package", "dist"), { recursive: true });
  await mkdir(path.join(temporaryRoot, "vendor", "ui", "dist"), { recursive: true });
  await mkdir(path.join(temporaryRoot, ".omp-flow", "dist"), { recursive: true });
  await writeFile(path.join(temporaryRoot, "apps", "desktop", "dist", "bundle.js"), "export {};\n");
  await writeFile(
    path.join(temporaryRoot, "node_modules", "package", "dist", "dependency.js"),
    "export {};\n",
  );
  await writeFile(path.join(temporaryRoot, "vendor", "ui", "dist", "bundle.js"), "export {};\n");
  await writeFile(path.join(temporaryRoot, ".omp-flow", "dist", "bundle.js"), "export {};\n");

  const generated = await discoverGeneratedFiles(
    temporaryRoot,
    structurePolicy,
    [],
    ["vendor/ui", ".omp-flow"],
  );

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

test("structure policy keeps installed workflow tooling outside production naming rules", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "structure-tooling-"));
  const rule = rules[0];
  await writeFile(path.join(temporaryRoot, "README.md"), policyReadme(rule));
  await mkdir(path.join(temporaryRoot, ".omp-flow", "scripts", "common"), { recursive: true });
  await writeFile(
    path.join(temporaryRoot, ".omp-flow", "scripts", "common", "runtime.py"),
    "pass\n",
  );

  const result = await scanIdentity({
    root: temporaryRoot,
    sourceFiles: ["README.md", ".omp-flow/scripts/common/runtime.py"],
  });

  assert.equal(result.findings.length, 0);
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
  assert.ok(errors.some((error) => error.includes("rights")));
  assert.ok(errors.some((error) => error.includes("changes")));
  assert.ok(errors.some((error) => error.includes("updatePolicy")));
});

test("source inventory validates exact repository paths, mode, URL, and legal text", () => {
  const adoption = sourceAdoption();
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
  assert.ok(
    validateSourceAdoptions([{ ...adoption, paths: ["."] }], tracked).some((error) =>
      error.includes("invalid adopted path"),
    ),
  );
});

test("real exact-source entry rejects empty-host HTTPS and moving revisions before privilege", () => {
  const inventoryFiles = repositoryFiles(root);
  const trackedFiles = trackedRepositoryFiles(root);
  const [adoption] = parseSourceAdoptions(governingReadme);
  const cases = [
    {
      adoption: { ...adoption, url: "https://" },
      message: "parsed https URL with a host",
    },
    {
      adoption: { ...adoption, revision: "main" },
      message: "revision must be immutable",
    },
  ];

  for (const entry of cases) {
    const result = validateSourceRepository({
      root,
      adoptions: [entry.adoption],
      trackedFiles,
      inventoryFiles,
      toolRoots: structurePolicy.toolRoots,
    });
    assert.deepEqual(result.exactRoots, []);
    assert.ok(result.errors.some((error) => error.includes(entry.message)));
  }
});

test("source inventory requires complete path-bound provenance metadata", () => {
  const tracked = ["vendor/source/index.ts", "LICENSES/source.txt"];
  const valid = sourceAdoption({
    provenance: {
      repositoryCommit: "b".repeat(40),
      trees: { "vendor/source": "c".repeat(40) },
    },
  });
  assert.deepEqual(validateSourceAdoptions([valid], tracked), []);

  const incomplete = {
    ...valid,
    provenance: { repositoryCommit: "short", trees: { "vendor/other": "bad" } },
  };
  const errors = validateSourceAdoptions([incomplete], tracked);
  assert.ok(errors.some((error) => error.includes("repositoryCommit")));
  assert.ok(errors.some((error) => error.includes("missing adopted path vendor/source")));
  assert.ok(errors.some((error) => error.includes("not adopted vendor/other")));

  const duplicateTreePath = {
    ...valid,
    provenance: {
      ...valid.provenance,
      trees: {
        "vendor/source": "c".repeat(40),
        "vendor\\source": "c".repeat(40),
      },
    },
  };
  assert.ok(
    validateSourceAdoptions([duplicateTreePath], tracked).some((error) =>
      error.includes("duplicate provenance tree path vendor/source"),
    ),
  );
});

test("source inventory binds adapted roots to immutable historical Git origins", () => {
  const tracked = ["apps/web/index.ts", "apps/service/index.ts", "LICENSES/source.txt"];
  const valid = sourceAdoption({
    paths: ["apps/web", "apps/service"],
    provenance: {
      repositoryCommit: "b".repeat(40),
      historicalTrees: { "vendor/source": "c".repeat(40) },
      origins: {
        "apps/web": {
          sourcePath: "vendor/source/apps/web",
          changes: "adapted product identity",
        },
        "apps/service": {
          sourcePath: "vendor/source/apps/server",
          changes: "renamed stable responsibility",
        },
      },
    },
  });

  assert.deepEqual(validateSourceAdoptions([valid], tracked), []);

  const invalid = {
    ...valid,
    provenance: {
      ...valid.provenance,
      origins: {
        "apps/web": {
          sourcePath: "outside/source",
          changes: "adapted",
        },
      },
    },
  };
  const errors = validateSourceAdoptions([invalid], tracked);
  assert.ok(errors.some((error) => error.includes("outside historical trees")));
  assert.ok(errors.some((error) => error.includes("missing adopted path apps/service")));
});

test("exact provenance roots and tool roots must be ancestry-disjoint", () => {
  const adoption = sourceAdoption({
    provenance: {
      repositoryCommit: "b".repeat(40),
      trees: { "vendor/source": "c".repeat(40) },
    },
  });
  const tracked = ["vendor/source/index.ts", "LICENSES/source.txt"];

  const equal = validateSourceAdoptions([adoption], tracked, { toolRoots: ["vendor/source"] });
  const exactBelowTool = validateSourceAdoptions([adoption], tracked, { toolRoots: ["vendor"] });
  const toolBelowExact = validateSourceAdoptions([adoption], tracked, {
    toolRoots: ["vendor/source/tools"],
  });
  const disjoint = validateSourceAdoptions([adoption], tracked, { toolRoots: [".omp-flow"] });

  assert.ok(equal.some((error) => error.includes("vendor/source and vendor/source")));
  assert.ok(exactBelowTool.some((error) => error.includes("vendor/source and vendor")));
  assert.ok(
    toolBelowExact.some((error) => error.includes("vendor/source and vendor/source/tools")),
  );
  assert.deepEqual(disjoint, []);
});

test("ordinary adoption paths and tool roots reject equality and both ancestry directions", async (t) => {
  const fixture = await exactSourceRepository(t);
  const ordinaryAdoption = { ...fixture.adoption };
  delete ordinaryAdoption.provenance;
  const cases = [
    ["vendor/source", "vendor/source"],
    ["vendor", "vendor/source"],
    ["vendor/source/tools", "vendor/source"],
  ];

  for (const [toolRoot, adoptedPath] of cases) {
    const adoption = { ...ordinaryAdoption, paths: [adoptedPath] };
    const trackedFiles =
      adoptedPath === "vendor/source"
        ? fixture.inventoryFiles
        : [...fixture.inventoryFiles, `${adoptedPath}/declared.txt`];
    const result = validateSourceRepository({
      root: fixture.temporaryRoot,
      adoptions: [adoption],
      trackedFiles,
      inventoryFiles: trackedFiles,
      toolRoots: [toolRoot],
    });

    assert.deepEqual(result.exactRoots, []);
    assert.ok(
      result.errors.some(
        (error) =>
          error.includes("adopted source path and tool root overlap") &&
          error.includes(adoptedPath) &&
          error.includes(toolRoot),
      ),
    );
  }
});

test("exact provenance roots cannot duplicate, overlap, or nest", () => {
  const first = sourceAdoption({
    paths: ["vendor/source", "vendor/source/nested"],
    provenance: {
      repositoryCommit: "b".repeat(40),
      trees: {
        "vendor/source": "c".repeat(40),
        "vendor/source/nested": "d".repeat(40),
      },
    },
  });
  const second = sourceAdoption({
    id: "source-two",
    provenance: {
      repositoryCommit: "b".repeat(40),
      trees: { "vendor/source": "c".repeat(40) },
    },
  });
  const tracked = [
    "vendor/source/index.ts",
    "vendor/source/nested/index.ts",
    "LICENSES/source.txt",
  ];
  const errors = validateSourceAdoptions([first, second], tracked, { toolRoots: [".omp-flow"] });

  assert.ok(errors.filter((error) => error.includes("exact provenance roots overlap")).length >= 2);

  const disjoint = sourceAdoption({
    id: "source-three",
    paths: ["vendor/other"],
    provenance: {
      repositoryCommit: "b".repeat(40),
      trees: { "vendor/other": "e".repeat(40) },
    },
  });
  assert.deepEqual(
    validateSourceAdoptions([second, disjoint], [...tracked, "vendor/other/index.ts"], {
      toolRoots: [".omp-flow"],
    }),
    [],
  );
});

test("exact provenance validation detects working modification, addition, and deletion", async (t) => {
  const fixture = await exactSourceRepository(t);
  const validate = () =>
    validateSourceRepository({
      root: fixture.temporaryRoot,
      adoptions: [fixture.adoption],
      trackedFiles: fixture.inventoryFiles,
      inventoryFiles: fixture.inventoryFiles,
      toolRoots: [".omp-flow"],
    });

  assert.deepEqual(validate(), { errors: [], exactRoots: ["vendor/source"] });

  const fixedFile = path.join(fixture.temporaryRoot, "vendor", "source", "value.txt");
  await writeFile(fixedFile, "modified\n");
  assert.ok(validate().errors.some((error) => error.includes('M "vendor/source/value.txt"')));
  await writeFile(fixedFile, "fixed\n");

  const addedFile = path.join(fixture.temporaryRoot, "vendor", "source", "added.txt");
  await writeFile(addedFile, "added\n");
  assert.ok(validate().errors.some((error) => error.includes('A "vendor/source/added.txt"')));
  await unlink(addedFile);

  await unlink(fixedFile);
  assert.ok(validate().errors.some((error) => error.includes('D "vendor/source/value.txt"')));
  await writeFile(fixedFile, "fixed\n");
  assert.deepEqual(validate(), { errors: [], exactRoots: ["vendor/source"] });
});

test("exact provenance validation rejects candidate drift and missing Git objects", async (t) => {
  const fixture = await exactSourceRepository(t);
  await writeFile(
    path.join(fixture.temporaryRoot, "vendor", "source", "value.txt"),
    "next candidate\n",
  );
  runGit(fixture.temporaryRoot, ["add", "vendor/source/value.txt"]);
  runGit(fixture.temporaryRoot, [
    "-c",
    "user.name=Quality Fixture",
    "-c",
    "user.email=quality@localhost",
    "commit",
    "--quiet",
    "-m",
    "candidate drift",
  ]);

  const drifted = validateSourceRepository({
    root: fixture.temporaryRoot,
    adoptions: [fixture.adoption],
    trackedFiles: fixture.inventoryFiles,
    inventoryFiles: fixture.inventoryFiles,
    toolRoots: [".omp-flow"],
  });
  assert.ok(drifted.errors.some((error) => error.includes("candidate tree mismatch")));

  const missingCommit = sourceAdoption({
    provenance: {
      repositoryCommit: "f".repeat(40),
      trees: { "vendor/source": fixture.tree },
    },
  });
  const missing = validateSourceRepository({
    root: fixture.temporaryRoot,
    adoptions: [missingCommit],
    trackedFiles: fixture.inventoryFiles,
    inventoryFiles: fixture.inventoryFiles,
    toolRoots: [".omp-flow"],
  });
  assert.ok(missing.errors.some((error) => error.includes("missing provenance commit")));

  const wrongBaselineTree = sourceAdoption({
    provenance: {
      repositoryCommit: fixture.commit,
      trees: { "vendor/source": "e".repeat(40) },
    },
  });
  const wrongTree = validateSourceRepository({
    root: fixture.temporaryRoot,
    adoptions: [wrongBaselineTree],
    trackedFiles: fixture.inventoryFiles,
    inventoryFiles: fixture.inventoryFiles,
    toolRoots: [".omp-flow"],
    candidate: fixture.commit,
  });
  assert.ok(wrongTree.errors.some((error) => error.includes("provenance tree mismatch")));

  const missingPath = sourceAdoption({
    paths: ["vendor/missing"],
    provenance: {
      repositoryCommit: fixture.commit,
      trees: { "vendor/missing": fixture.tree },
    },
  });
  const missingTree = validateSourceRepository({
    root: fixture.temporaryRoot,
    adoptions: [missingPath],
    trackedFiles: ["LICENSES/source.txt", "vendor/missing/declared.txt"],
    inventoryFiles: ["LICENSES/source.txt", "vendor/missing/declared.txt"],
    toolRoots: [".omp-flow"],
    candidate: fixture.commit,
  });
  assert.ok(missingTree.errors.some((error) => error.includes("provenance path is not a tree")));
});

test("vendor content without a complete exact declaration is rejected", async (t) => {
  const fixture = await exactSourceRepository(t);
  const unbound = sourceAdoption();
  const result = validateSourceRepository({
    root: fixture.temporaryRoot,
    adoptions: [unbound],
    trackedFiles: fixture.inventoryFiles,
    inventoryFiles: [...fixture.inventoryFiles, "vendor/other/file.txt"],
    toolRoots: [".omp-flow"],
  });

  assert.deepEqual(result.exactRoots, []);
  assert.ok(
    result.errors.some((error) => error.includes("undeclared vendor content vendor/source")),
  );
  assert.ok(
    result.errors.some((error) => error.includes("undeclared vendor content vendor/other")),
  );
});

test("source entry detects ignored vendor source while excluding first-level and nested dependency/build paths", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "ignored-vendor-source-"));
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
  for (const relativeDirectory of [
    "vendor/node_modules/package",
    "vendor/.pnpm/package",
    "vendor/.yarn/package",
    "vendor/dist",
  ]) {
    await mkdir(path.join(temporaryRoot, relativeDirectory), { recursive: true });
  }
  await mkdir(path.join(temporaryRoot, "vendor", "other", "node_modules", "package"), {
    recursive: true,
  });
  await mkdir(path.join(temporaryRoot, "vendor", "other", "dist"), { recursive: true });
  await writeFile(
    path.join(temporaryRoot, ".gitignore"),
    "vendor/other/\nvendor/node_modules/\nvendor/.pnpm/\nvendor/.yarn/\nvendor/dist/\n",
  );
  await writeFile(path.join(temporaryRoot, "vendor", "other", "copied.js"), "export {};\n");
  for (const relativeFile of [
    "vendor/node_modules/package/index.js",
    "vendor/.pnpm/package/index.js",
    "vendor/.yarn/package/index.js",
    "vendor/dist/bundle.js",
  ]) {
    await writeFile(path.join(temporaryRoot, relativeFile), "export {};\n");
  }
  await writeFile(
    path.join(temporaryRoot, "vendor", "other", "node_modules", "package", "index.js"),
    "export {};\n",
  );
  await writeFile(path.join(temporaryRoot, "vendor", "other", "dist", "bundle.js"), "export {};\n");
  runGit(temporaryRoot, ["init", "--quiet"]);
  runGit(temporaryRoot, ["add", ".gitignore"]);
  runGit(temporaryRoot, [
    "-c",
    "user.name=Quality Fixture",
    "-c",
    "user.email=quality@localhost",
    "commit",
    "--quiet",
    "-m",
    "ignored vendor fixture",
  ]);

  const inventoryFiles = repositoryFiles(temporaryRoot);
  const ignoredVendorFiles = ignoredVendorSourceFiles(temporaryRoot, ["dist"]);
  assert.deepEqual(inventoryFiles, [".gitignore"]);
  assert.deepEqual(ignoredVendorFiles, ["vendor/other/copied.js"]);

  const generatedFiles = await discoverGeneratedFiles(temporaryRoot, {
    ...structurePolicy,
    generatedDirectoryNames: ["dist"],
  });
  assert.deepEqual(generatedFiles, ["vendor/dist/bundle.js", "vendor/other/dist/bundle.js"]);

  const result = validateSourceRepository({
    root: temporaryRoot,
    adoptions: [],
    trackedFiles: trackedRepositoryFiles(temporaryRoot),
    inventoryFiles,
    ignoredVendorFiles,
    toolRoots: [".omp-flow"],
  });
  assert.deepEqual(result.exactRoots, []);
  assert.ok(
    result.errors.some((error) =>
      error.includes(
        "undeclared vendor content vendor/other; observed path vendor/other/copied.js",
      ),
    ),
  );
});

test("identity partitions exact, tool, evidence, author, and generated surfaces", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "identity-partitions-"));
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
  const rule = rules[0];
  await writeFile(path.join(temporaryRoot, "README.md"), policyReadme(rule));
  const files = [
    `vendor/source/${rule}.txt`,
    `.omp-flow/${rule}.txt`,
    `research/${rule}.md`,
    `apps/${rule}.txt`,
    `vendor/source/dist/${rule}.js`,
    `.omp-flow/dist/${rule}.js`,
    `apps/web/dist/${rule}.js`,
  ];
  for (const relativePath of files) {
    await mkdir(path.dirname(path.join(temporaryRoot, relativePath)), { recursive: true });
    await writeFile(path.join(temporaryRoot, relativePath), `${rule}\n`);
  }

  const result = await scanIdentity({
    root: temporaryRoot,
    sourceFiles: ["README.md", ...files.slice(0, 4)],
    generatedFiles: files.slice(4),
    exactRoots: ["vendor/source"],
  });

  assert.ok(result.findings.some((finding) => finding.path === `apps/${rule}.txt`));
  assert.ok(result.findings.some((finding) => finding.path === `apps/web/dist/${rule}.js`));
  assert.ok(result.findings.some((finding) => finding.path === `.omp-flow/${rule}.txt`));
  assert.ok(result.findings.some((finding) => finding.path === `.omp-flow/dist/${rule}.js`));
  assert.ok(result.findings.some((finding) => finding.path === `research/${rule}.md`));
  assert.ok(result.findings.every((finding) => !finding.path.startsWith("vendor/source/")));
});

test("identity rejects undeclared vendor source and generated paths", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "identity-vendor-"));
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
  const rule = rules[0];
  await writeFile(path.join(temporaryRoot, "README.md"), policyReadme(rule));
  await mkdir(path.join(temporaryRoot, "vendor", "other", "dist"), { recursive: true });
  await writeFile(path.join(temporaryRoot, "vendor", "other", "source.txt"), "clean\n");
  await writeFile(path.join(temporaryRoot, "vendor", "other", "dist", "bundle.js"), "clean\n");

  const result = await scanIdentity({
    root: temporaryRoot,
    sourceFiles: ["README.md", "vendor/other/source.txt"],
    generatedFiles: ["vendor/other/dist/bundle.js"],
  });

  assert.ok(
    result.findings.some(
      (finding) =>
        finding.path === "vendor/other/source.txt" &&
        finding.rule.includes("unapproved author root"),
    ),
  );
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.path === "vendor/other/dist/bundle.js" &&
        finding.rule === "undeclared vendor generated content",
    ),
  );
});

test("real repository adapted adoption resolves historical origins without exact roots", () => {
  const inventoryFiles = repositoryFiles(root);
  const trackedFiles = trackedRepositoryFiles(root);
  const adoptions = parseSourceAdoptions(governingReadme);
  const ignoredVendorFiles = ignoredVendorSourceFiles(
    root,
    structurePolicy.generatedDirectoryNames,
  );
  const result = validateSourceRepository({
    root,
    adoptions,
    trackedFiles,
    inventoryFiles,
    ignoredVendorFiles,
    toolRoots: structurePolicy.toolRoots,
  });

  assert.deepEqual(result, { errors: [], exactRoots: [] });
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

test("source closure rejects target loss, origin loss, and unapproved exclusion", () => {
  const result = spawnSync(process.execPath, ["scripts/check-source-closure.mjs", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr);
  const baseline = JSON.parse(result.stdout).dispositions;
  assert.doesNotThrow(() => assertDispositionClosure(baseline));

  const missingTarget = structuredClone(baseline);
  const present = missingTarget.find((entry) => entry.disposition === "adapted-present");
  present.disposition = "adapted-removed";
  assert.throws(() => assertDispositionClosure(missingTarget), /disposition counts drifted/u);

  const missingOrigin = baseline.map((entry) =>
    entry.source.startsWith("apps/web/") && entry.disposition.startsWith("adapted-")
      ? { source: entry.source, target: null, disposition: "excluded-non-product" }
      : { ...entry },
  );
  assert.throws(() => assertDispositionClosure(missingOrigin), /disposition counts drifted/u);

  const unapprovedExclusion = structuredClone(baseline);
  const excluded = unapprovedExclusion.find((entry) => entry.disposition === "adapted-present");
  excluded.target = null;
  excluded.disposition = "excluded-non-product";
  assert.throws(() => assertDispositionClosure(unapprovedExclusion), /disposition counts drifted/u);

  const retargeted = structuredClone(baseline);
  retargeted.find((entry) => entry.disposition === "adapted-present").target += ".moved";
  assert.throws(() => assertDispositionClosure(retargeted), /disposition map drifted/u);

  const publicSurfaceLineage = baseline.filter(
    (entry) => entry.disposition === "public-surface-lineage",
  );
  assert.equal(publicSurfaceLineage.length, 14);
  assert.ok(publicSurfaceLineage.every((entry) => entry.source.startsWith("apps/marketing/")));
  assert.ok(
    publicSurfaceLineage.every((entry) => entry.target === "architecture/public-surface.md"),
  );

  const washedLineage = structuredClone(baseline);
  washedLineage.find((entry) => entry.disposition === "public-surface-lineage").disposition =
    "excluded-non-product";
  assert.throws(() => assertDispositionClosure(washedLineage), /disposition counts drifted/u);

  const extraLineage = structuredClone(baseline);
  extraLineage.find((entry) => entry.disposition === "adapted-present").disposition =
    "public-surface-lineage";
  assert.throws(() => assertDispositionClosure(extraLineage), /disposition counts drifted/u);
});
