import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DOCUMENT_CONTRACT_PATHS,
  validateDocumentContract,
} from "../scripts/document-contract.mjs";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");

async function createFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "omnimind-document-contract-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const relativePath of DOCUMENT_CONTRACT_PATHS) {
    const destination = path.join(root, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, await readFile(path.join(REPOSITORY_ROOT, relativePath), "utf8"));
  }
  return root;
}

async function replaceText(root, relativePath, before, after, { all = false } = {}) {
  const filePath = path.join(root, relativePath);
  const content = await readFile(filePath, "utf8");
  assert.ok(content.includes(before), `${relativePath} must contain ${before}`);
  await writeFile(
    filePath,
    all ? content.replaceAll(before, after) : content.replace(before, after),
  );
}

function assertFinding(findings, rule, relativePath) {
  assert.ok(
    findings.some((finding) => finding.rule === rule && finding.path === relativePath),
    `expected ${rule} for ${relativePath}; received ${JSON.stringify(findings, null, 2)}`,
  );
}

test("repository satisfies the bounded structural document contract", async () => {
  assert.deepEqual(await validateDocumentContract({ root: REPOSITORY_ROOT }), []);
});

test("validator reads only fixed inputs and does not mutate them", async () => {
  const reads = [];
  const before = new Map();
  for (const relativePath of DOCUMENT_CONTRACT_PATHS) {
    before.set(relativePath, await readFile(path.join(REPOSITORY_ROOT, relativePath), "utf8"));
  }
  assert.deepEqual(
    await validateDocumentContract({
      root: REPOSITORY_ROOT,
      read: async (filePath, encoding) => {
        reads.push(path.relative(REPOSITORY_ROOT, filePath));
        return readFile(filePath, encoding);
      },
    }),
    [],
  );
  assert.deepEqual(reads, DOCUMENT_CONTRACT_PATHS);
  for (const [relativePath, content] of before) {
    assert.equal(await readFile(path.join(REPOSITORY_ROOT, relativePath), "utf8"), content);
  }
});

test("missing owner is a path-specific failure", async (t) => {
  const root = await createFixture(t);
  await unlink(path.join(root, "architecture/execution.md"));
  assertFinding(
    await validateDocumentContract({ root }),
    "document.required",
    "architecture/execution.md",
  );
});

test("broken owner route fails without interpreting architecture prose", async (t) => {
  const root = await createFixture(t);
  await replaceText(root, "README.md", "architecture/workbench.md", "architecture/ui.md", {
    all: true,
  });
  assertFinding(await validateDocumentContract({ root }), "route.required", "README.md");
});

test("source intake routes cannot bypass the common owner or source profiles", async (t) => {
  const root = await createFixture(t);
  await replaceText(root, "AGENTS.md", "SOURCE-INTAKE.md", "research/README.md", {
    all: true,
  });
  await replaceText(root, "AGENTS.md", "SYNARA-INTAKE.md", "research/source-review.md", {
    all: true,
  });
  await replaceText(root, "AGENTS.md", "PI-ECOSYSTEM-INTAKE.md", "research/README.md", {
    all: true,
  });
  const findings = await validateDocumentContract({ root });
  assertFinding(findings, "route.required", "AGENTS.md");
});

test("mandatory read route order is structural", async (t) => {
  const root = await createFixture(t);
  const agentsPath = path.join(root, "AGENTS.md");
  const content = await readFile(agentsPath, "utf8");
  await writeFile(
    agentsPath,
    content
      .replace("1. `README.md`；", "1. `architecture/README.md`；")
      .replace("3. `architecture/README.md`，", "3. `README.md`，"),
  );
  assertFinding(await validateDocumentContract({ root }), "route.read-order", "AGENTS.md");
});

test("duplicate machine owner block fails", async (t) => {
  const root = await createFixture(t);
  const readmePath = path.join(root, "README.md");
  const content = await readFile(readmePath, "utf8");
  await writeFile(readmePath, `${content}\n\n\`\`\`identity-denylist\nextra\n\`\`\`\n`);
  assertFinding(await validateDocumentContract({ root }), "machine-block.cardinality", "README.md");
});

test("malformed architecture machine JSON fails", async (t) => {
  const root = await createFixture(t);
  await replaceText(root, "README.md", '"maxDirectoryDepth": 7', '"maxDirectoryDepth": nope');
  assertFinding(await validateDocumentContract({ root }), "machine-block.invalid", "README.md");
});

test("source adoption manifest is the sole structured source owner", async (t) => {
  const root = await createFixture(t);
  await writeFile(path.join(root, "source-adoptions.json"), "{ nope");
  assertFinding(
    await validateDocumentContract({ root }),
    "source-adoptions.invalid",
    "source-adoptions.json",
  );
});

test("source adoption manifest requires its canonical version", async (t) => {
  const root = await createFixture(t);
  const manifestPath = path.join(root, "source-adoptions.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  delete manifest.version;
  await writeFile(manifestPath, JSON.stringify(manifest));
  assertFinding(
    await validateDocumentContract({ root }),
    "source-adoptions.structure",
    "source-adoptions.json",
  );
});

test("source adoption entries require unique identity and exact revision", async (t) => {
  const root = await createFixture(t);
  const manifestPath = path.join(root, "source-adoptions.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.adopted[1].id = manifest.adopted[0].id;
  manifest.adopted[0].revision = "main";
  await writeFile(manifestPath, JSON.stringify(manifest));
  const findings = await validateDocumentContract({ root });
  assertFinding(findings, "source-adoptions.identity", "source-adoptions.json");
  assertFinding(findings, "source-adoptions.revision", "source-adoptions.json");
});

test("source adoption paths and digests fail closed", async (t) => {
  const root = await createFixture(t);
  const manifestPath = path.join(root, "source-adoptions.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.adopted[0].paths = ["../outside"];
  const digestOwner = manifest.adopted.find((entry) => entry.archiveSha256);
  assert.ok(digestOwner);
  digestOwner.archiveSha256 = "not-a-digest";
  await writeFile(manifestPath, JSON.stringify(manifest));
  const findings = await validateDocumentContract({ root });
  assertFinding(findings, "source-adoptions.paths", "source-adoptions.json");
  assertFinding(findings, "source-adoptions.digest", "source-adoptions.json");
});

test("Campaign canonical identity is structural", async (t) => {
  const root = await createFixture(t);
  await replaceText(root, "missions/independent-omnimind-v1.md", "Status: active", "Status: done");
  assertFinding(
    await validateDocumentContract({ root }),
    "campaign.structure",
    "missions/independent-omnimind-v1.md",
  );
});
