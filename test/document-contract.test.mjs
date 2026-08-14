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

test("validator reads only fixed document inputs and does not mutate them", async () => {
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

test("Synara intake instructions cannot bypass the root handbook", async (t) => {
  const root = await createFixture(t);
  await replaceText(root, "AGENTS.md", "SYNARA-INTAKE.md", "research/source-update-intake.md", {
    all: true,
  });

  assertFinding(await validateDocumentContract({ root }), "route.required", "AGENTS.md");
});

test("mandatory read route order is structural", async (t) => {
  const root = await createFixture(t);
  const agentsPath = path.join(root, "AGENTS.md");
  const content = await readFile(agentsPath, "utf8");
  await writeFile(
    agentsPath,
    content.replace(
      "1. `README.md`；\n2. 任务涉及审查、借鉴、吸收、同步或更新 Synara 时，完整读取 `SYNARA-INTAKE.md`；\n3. `architecture/README.md`",
      "1. `architecture/README.md`；\n2. 任务涉及审查、借鉴、吸收、同步或更新 Synara 时，完整读取 `SYNARA-INTAKE.md`；\n3. `README.md`",
    ),
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

test("malformed JSON machine owner block fails", async (t) => {
  const root = await createFixture(t);
  await replaceText(root, "README.md", '"maxDirectoryDepth": 7', '"maxDirectoryDepth": nope');

  assertFinding(await validateDocumentContract({ root }), "machine-block.invalid", "README.md");
});

test("historical decision cannot silently regain authority", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "research/decision-record.md",
    "Status: superseded in full",
    "Status: current",
  );

  assertFinding(
    await validateDocumentContract({ root }),
    "history.superseded",
    "research/decision-record.md",
  );
});

test("authority reset remains before production source reset", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "execution-brief.md",
    "| 0    | Authority reset",
    "| 7    | Authority reset",
  );

  assertFinding(
    await validateDocumentContract({ root }),
    "execution.stage-order",
    "execution-brief.md",
  );
});

test("Engine native ecosystem cannot be redefined as replaced", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "architecture/execution.md",
    '"nativeEcosystemDisposition": "preserve"',
    '"nativeEcosystemDisposition": "replace"',
  );

  assertFinding(
    await validateDocumentContract({ root }),
    "execution.engine-capability-composition",
    "architecture/execution.md",
  );
});

test("bundled Pi runtime adoption cannot lose its exact artifact identity", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "README.md",
    "cd468c4665a173b7edc6f54b4c4b4d362c64de385c1fa8d6b1b41a3b215c4004",
    "0".repeat(64),
  );

  assertFinding(
    await validateDocumentContract({ root }),
    "source-adoption.bundled-pi-runtime",
    "README.md",
  );
});

test("Kanban remains the Agent domain's secondary console", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "architecture/workbench.md",
    '"kanbanPrimaryMode": "Agent"',
    '"kanbanPrimaryMode": "Chat"',
  );

  assertFinding(
    await validateDocumentContract({ root }),
    "workbench.work-surface-ia",
    "architecture/workbench.md",
  );
});

test("Groups remain many-to-many conversation labels below complete Projects", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "architecture/workbench.md",
    '"groupTarget": "conversation-thread"',
    '"groupTarget": "project"',
  );

  assertFinding(
    await validateDocumentContract({ root }),
    "workbench.work-surface-ia",
    "architecture/workbench.md",
  );
});

test("blank conversations cannot regain placeholder or Provider header identity", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "architecture/workbench.md",
    '"emptyAgentOrChat": "hidden"',
    '"emptyAgentOrChat": "provider-icon-and-placeholder"',
  );

  assertFinding(
    await validateDocumentContract({ root }),
    "workbench.work-surface-ia",
    "architecture/workbench.md",
  );
});

test("generic Terminal titles remain localized presentation, not migrated state", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "architecture/workbench.md",
    '"genericTerminalTitle": "localized-ui-only"',
    '"genericTerminalTitle": "rewrite-persisted-title"',
  );

  assertFinding(
    await validateDocumentContract({ root }),
    "workbench.work-surface-ia",
    "architecture/workbench.md",
  );
});

test("Model services keeps API-address setup below runtime service discovery", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "architecture/workbench.md",
    '"secondaryPlacement": "list-tail-lower-emphasis"',
    '"secondaryPlacement": "equal-primary-card"',
  );

  assertFinding(
    await validateDocumentContract({ root }),
    "workbench.model-services-ia",
    "architecture/workbench.md",
  );
});

test("Model services cannot regain a static OmniMind model default", async (t) => {
  const root = await createFixture(t);
  await replaceText(
    root,
    "architecture/workbench.md",
    '"omnimindDefaultModel": "none-runtime-catalog-only"',
    '"omnimindDefaultModel": "deepseek/deepseek-chat"',
  );

  assertFinding(
    await validateDocumentContract({ root }),
    "workbench.model-services-ia",
    "architecture/workbench.md",
  );
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
