#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, extname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const FORMAT = "product-truth-complexity-v8";
const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = dirname(scriptPath);
const repositoryRoot = resolve(scriptDirectory, "../..");
const configPath = resolve(scriptDirectory, "complexity-universe-v8.json");
const scriptBytes = readFileSync(scriptPath);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const decodeUtf8 = (bytes, identity) => {
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (decoded.includes("\u0000")) throw new Error(`NUL byte in text authority: ${identity}`);
  return decoded;
};
const INVALID_STRUCTURAL_LITERAL = Symbol("invalid-structural-literal");
const isFiniteTransparentExpressionWrapper = (node) =>
  ts.isParenthesizedExpression(node) || ts.isAsExpression(node) ||
  ts.isSatisfiesExpression(node) || ts.isTypeAssertionExpression(node) ||
  ts.isNonNullExpression(node);
const structuralLiteralValue = (node) => {
  if (isFiniteTransparentExpressionWrapper(node)) {
    return structuralLiteralValue(node.expression);
  }
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
    return -Number(node.operand.text);
  }
  if (ts.isArrayLiteralExpression(node)) {
    const values = [];
    for (const element of node.elements) {
      if (ts.isOmittedExpression(element) || ts.isSpreadElement(element)) return INVALID_STRUCTURAL_LITERAL;
      const value = structuralLiteralValue(element);
      if (value === INVALID_STRUCTURAL_LITERAL) return value;
      values.push(value);
    }
    return values;
  }
  if (ts.isObjectLiteralExpression(node)) {
    const value = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name) ||
          !(ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name) || ts.isNumericLiteral(property.name))) {
        return INVALID_STRUCTURAL_LITERAL;
      }
      const key = property.name.text;
      if (Object.hasOwn(value, key)) return INVALID_STRUCTURAL_LITERAL;
      const propertyValue = structuralLiteralValue(property.initializer);
      if (propertyValue === INVALID_STRUCTURAL_LITERAL) return propertyValue;
      value[key] = propertyValue;
    }
    return value;
  }
  return INVALID_STRUCTURAL_LITERAL;
};
const normalizedStructuralLiteral = (bytes, identity) => {
  const text = decodeUtf8(bytes, identity);
  try {
    return canonicalJson(JSON.parse(text));
  } catch {
    const file = ts.createSourceFile(identity, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    if (file.parseDiagnostics.length || file.statements.length !== 1) return null;
    const statement = file.statements[0];
    if (!ts.isVariableStatement(statement) ||
        !declarationModifiers(statement).has(ts.SyntaxKind.ExportKeyword) ||
        (statement.declarationList.flags & ts.NodeFlags.Const) === 0 ||
        statement.declarationList.declarations.length !== 1) return null;
    const declaration = statement.declarationList.declarations[0];
    if (!ts.isIdentifier(declaration.name) || !declaration.initializer) return null;
    const value = structuralLiteralValue(declaration.initializer);
    return value === INVALID_STRUCTURAL_LITERAL ? null : canonicalJson(value);
  }
};
const assertNoDuplicateJsonKeys = (text, identity) => {
  const parsed = ts.parseJsonText(identity, text);
  if (parsed.parseDiagnostics.length) throw new Error(`Invalid JSON in ${identity}.`);
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const seen = new Set();
      for (const property of node.properties) {
        if (!property.name || (!ts.isStringLiteralLike(property.name) && !ts.isIdentifier(property.name))) continue;
        const name = property.name.text;
        if (seen.has(name)) throw new Error(`Duplicate JSON key ${name} in ${identity}.`);
        seen.add(name);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
};
const parseArguments = (argv) => {
  const values = new Map();
  const allowed = new Set(["--ref", "--predecessor-evidence", "--work", "--fixture"]);
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(flag) || value === undefined || value.startsWith("--") || values.has(flag)) {
      throw new Error("OFFICIAL_INVOCATION_INVALID:unknown-missing-or-duplicate-argument");
    }
    values.set(flag, value);
  }
  if (values.size < 2 || !values.has("--ref") || !values.has("--predecessor-evidence")) {
    throw new Error("OFFICIAL_EVIDENCE_INPUT_INVALID:missing");
  }
  const candidate = values.get("--ref");
  const predecessorEvidence = values.get("--predecessor-evidence");
  const work = values.get("--work") ?? null;
  const fixture = values.get("--fixture") ?? null;
  if (!/^[0-9a-f]{40}$/.test(candidate)) throw new Error("CANDIDATE_REF_INVALID:full-lowercase-sha-required");
  if (!/^[0-9a-f]{40}$/.test(predecessorEvidence)) {
    throw new Error("OFFICIAL_EVIDENCE_INPUT_INVALID:full-lowercase-sha-required");
  }
  if (fixture !== null && !/^[a-z0-9-]+$/.test(fixture)) throw new Error("FIXTURE_NAME_INVALID");
  if (work !== null && !/^[a-z0-9-]+$/.test(work)) throw new Error("CANDIDATE_WORK_INVALID");
  return { commit: candidate, predecessorEvidenceCommit: predecessorEvidence, candidateWorkId: work, fixtureName: fixture };
};
const { commit, predecessorEvidenceCommit, candidateWorkId, fixtureName } = parseArguments(process.argv.slice(2));
const fixtureMode = fixtureName !== null;

const configBytes = readFileSync(configPath);
const configText = decodeUtf8(configBytes, "complexity-universe-v8.json");
assertNoDuplicateJsonKeys(configText, "complexity-universe-v8.json");
const config = JSON.parse(configText);

const git = (gitArgs, input) => {
  const result = spawnSync("git", gitArgs, {
    cwd: repositoryRoot,
    input,
    encoding: null,
    maxBuffer: 512 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`git ${gitArgs[0]} failed (${result.status ?? "signal"})`);
  return result.stdout;
};
const requireCommit = (ref, diagnostic) => {
  try {
    const type = git(["cat-file", "-t", `${ref}^{commit}`]).toString("ascii").trim();
    if (type !== "commit") throw new Error("not-commit");
  } catch {
    throw new Error(diagnostic);
  }
};
requireCommit(commit, "CANDIDATE_REF_INVALID:nonexistent-or-noncommit");
requireCommit(predecessorEvidenceCommit, "OFFICIAL_EVIDENCE_INPUT_INVALID:nonexistent-or-noncommit");
git(["cat-file", "-e", `${config.acceptedDesignCommit}^{commit}`]);

const loadFixture = (name, stack = []) => {
  if (stack.includes(name)) throw new Error("FIXTURE_INHERITANCE_CYCLE");
  const path = resolve(scriptDirectory, "fixtures/complexity-v8", `${name}.json`);
  const text = readFileSync(path, "utf8");
  assertNoDuplicateJsonKeys(text, path);
  const own = JSON.parse(text);
  if (!own.extends) return own;
  if (!/^[a-z0-9-]+$/.test(own.extends)) throw new Error("FIXTURE_PARENT_INVALID");
  const parent = loadFixture(own.extends, [...stack, name]);
  delete own.extends;
  return {
    ...parent,
    ...own,
    virtualFiles: { ...(parent.virtualFiles ?? {}), ...(own.virtualFiles ?? {}) },
    appendToFiles: { ...(parent.appendToFiles ?? {}), ...(own.appendToFiles ?? {}) },
    textReplacements: { ...(parent.textReplacements ?? {}), ...(own.textReplacements ?? {}) },
    moveFiles: { ...(parent.moveFiles ?? {}), ...(own.moveFiles ?? {}) },
    modeChanges: { ...(parent.modeChanges ?? {}), ...(own.modeChanges ?? {}) },
    evidenceMutation: own.evidenceMutation ?? parent.evidenceMutation,
  };
};
const fixture = fixtureMode ? loadFixture(fixtureName) : null;

const loadTree = (ref) => {
  const treeOutput = git(["ls-tree", "-rz", "--full-tree", ref]);
  const tree = new Map();
  for (const rawEntry of treeOutput.subarray(0, -1).toString("utf8").split("\0")) {
    const match = /^(\d+) (\w+) ([0-9a-f]{40})\t([\s\S]+)$/.exec(rawEntry);
    if (!match) throw new Error("Malformed git tree entry.");
    tree.set(match[4], { mode: match[1], type: match[2], object: match[3] });
  }
  const objectIds = [...new Set([...tree.values()].filter((entry) => entry.type === "blob").map((entry) => entry.object))];
  const batch = git(["cat-file", "--batch"], Buffer.from(`${objectIds.join("\n")}\n`));
  const blobs = new Map();
  let offset = 0;
  for (const requested of objectIds) {
    const headerEnd = batch.indexOf(10, offset);
    const header = batch.subarray(offset, headerEnd).toString("ascii");
    const match = /^([0-9a-f]{40}) blob (\d+)$/.exec(header);
    if (!match || match[1] !== requested) throw new Error("Unexpected git cat-file response.");
    const start = headerEnd + 1;
    const end = start + Number(match[2]);
    if (batch[end] !== 10) throw new Error("Truncated git cat-file blob.");
    blobs.set(requested, batch.subarray(start, end));
    offset = end + 1;
  }
  const bytesAt = (path) => {
    const entry = tree.get(path);
    if (!entry) return null;
    if (!blobs.has(entry.object) || !["100644", "100755"].includes(entry.mode) || entry.type !== "blob") {
      throw new Error(`Non-regular tree identity: ${path}`);
    }
    return blobs.get(entry.object);
  };
  const textAt = (path) => {
    const bytes = bytesAt(path);
    if (bytes === null) throw new Error(`Missing source blob: ${path}`);
    return decodeUtf8(bytes, path);
  };
  return { tree, blobs, bytesAt, textAt };
};

const accepted = loadTree(config.acceptedDesignCommit);
const candidate = loadTree(commit);
const predecessorEvidence = loadTree(predecessorEvidenceCommit);
const dependencyAuthoritySnapshot = commit === config.baselineCommit ? loadTree(config.baselineCommit) : accepted;
const installVirtualFile = (path, bytes) => {
  const object = sha256(Buffer.concat([Buffer.from(`v8-fixture\0${path}\0`), bytes])).slice(0, 40);
  candidate.tree.set(path, { mode: "100644", type: "blob", object });
  candidate.blobs.set(object, bytes);
};
for (const [from, to] of Object.entries(fixture?.moveFiles ?? {})) {
  const bytes = candidate.bytesAt(from);
  if (bytes === null) throw new Error(`Fixture move source missing: ${from}`);
  candidate.tree.delete(from);
  installVirtualFile(to, bytes);
}
for (const path of fixture?.removeFiles ?? []) candidate.tree.delete(path);
for (const [path, value] of Object.entries(fixture?.virtualFiles ?? {})) installVirtualFile(path, Buffer.from(value));
for (const [path, suffix] of Object.entries(fixture?.appendToFiles ?? {})) {
  const current = candidate.bytesAt(path);
  if (current === null) throw new Error(`Fixture append target missing: ${path}`);
  installVirtualFile(path, Buffer.concat([current, Buffer.from(suffix)]));
}
for (const [path, replacements] of Object.entries(fixture?.textReplacements ?? {})) {
  let text = candidate.textAt(path);
  for (const replacement of replacements) {
    if (!Array.isArray(replacement) || replacement.length !== 2 || !text.includes(replacement[0])) {
      throw new Error(`Fixture replacement target missing: ${path}`);
    }
    text = text.replace(replacement[0], replacement[1]);
  }
  installVirtualFile(path, Buffer.from(text));
}
for (const [path, mode] of Object.entries(fixture?.modeChanges ?? {})) {
  const entry = candidate.tree.get(path);
  if (!entry || !["100644", "100755"].includes(mode)) throw new Error(`Fixture mode target invalid: ${path}`);
  candidate.tree.set(path, { ...entry, mode });
}

const installEvidenceVirtualFile = (path, bytes) => {
  const object = sha256(Buffer.concat([Buffer.from(`v8-evidence-fixture\0${path}\0`), bytes])).slice(0, 40);
  predecessorEvidence.tree.set(path, { mode: "100644", type: "blob", object });
  predecessorEvidence.blobs.set(object, bytes);
};
for (const path of fixture?.evidenceMutation?.removeFiles ?? []) predecessorEvidence.tree.delete(path);
for (const [path, value] of Object.entries(fixture?.evidenceMutation?.virtualFiles ?? {})) {
  installEvidenceVirtualFile(path, Buffer.from(value));
}
for (const [path, replacements] of Object.entries(fixture?.evidenceMutation?.textReplacements ?? {})) {
  let text = predecessorEvidence.textAt(path);
  for (const replacement of replacements) {
    if (!Array.isArray(replacement) || replacement.length !== 2 || !text.includes(replacement[0])) {
      throw new Error(`Evidence fixture replacement target missing: ${path}`);
    }
    text = text.replace(replacement[0], replacement[1]);
  }
  installEvidenceVirtualFile(path, Buffer.from(text));
}

const extractMachineBlock = (text, tag, identity) => {
  const matches = [...text.matchAll(new RegExp("```" + tag + "\\n([\\s\\S]*?)\\n```", "g"))];
  if (matches.length !== 1) throw new Error(`Expected exactly one ${tag} block in ${identity}.`);
  assertNoDuplicateJsonKeys(matches[0][1], `${identity}:${tag}`);
  return JSON.parse(matches[0][1]);
};
const setAtPointer = (root, pointer, action, value) => {
  const parts = pointer.split("/").slice(1).map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  if (!parts.length) throw new Error("Fixture pointer cannot replace a root.");
  let owner = root;
  for (const part of parts.slice(0, -1)) {
    if (!(part in owner)) throw new Error(`Fixture pointer missing: ${pointer}`);
    owner = owner[part];
  }
  const key = parts.at(-1);
  if (!(key in owner)) throw new Error(`Fixture pointer missing: ${pointer}`);
  if (action === "remove") Array.isArray(owner) ? owner.splice(Number(key), 1) : delete owner[key];
  else if (action === "replace") owner[key] = value;
  else throw new Error(`Unsupported fixture mutation action: ${action}`);
};

const workBlocks = [];
for (const pin of config.workBoundaries) {
  const path = `${config.bundleRoot}/work/${pin.work}.md`;
  const block = extractMachineBlock(accepted.textAt(path), "omp-flow-production-boundary-v1", path);
  if (fixture?.authorityMutation?.block === `work:${pin.work}`) {
    setAtPointer(block, fixture.authorityMutation.pointer, fixture.authorityMutation.action, fixture.authorityMutation.value);
  }
  if (block.work !== pin.work || sha256(Buffer.from(canonicalJson(block))) !== pin.canonicalSha256) {
    throw new Error(`WORK_AUTHORITY_CHANGED:${pin.work}`);
  }
  workBlocks.push(block);
}
const interfaceText = accepted.textAt(config.interfacePath);
const authority = {};
for (const [tag, digest] of Object.entries(config.authorityBlocks)) {
  const block = extractMachineBlock(interfaceText, tag, config.interfacePath);
  if (fixture?.authorityMutation?.block === tag) {
    setAtPointer(block, fixture.authorityMutation.pointer, fixture.authorityMutation.action, fixture.authorityMutation.value);
  }
  if (sha256(Buffer.from(canonicalJson(block))) !== digest) throw new Error(`AUTHORITY_BLOCK_CHANGED:${tag}`);
  authority[tag] = block;
}
const rawUniverse = authority["omp-flow-raw-effect-universe-v1"];
const ingressAuthority = authority["omp-flow-effect-ingress-authority-v1"];
const verifierUniverse = authority["omp-flow-b1-verifier-universe-v1"];
const predecessorInterfaceText = accepted.textAt(config.predecessorInterfacePath);
const predecessorAuthority = extractMachineBlock(
  predecessorInterfaceText,
  "omp-flow-work-predecessor-delta-authority-v1",
  config.predecessorInterfacePath,
);
if (sha256(Buffer.from(canonicalJson(predecessorAuthority))) !== config.predecessorAuthoritySha256) {
  throw new Error("PREDECESSOR_AUTHORITY_CHANGED");
}
if (predecessorAuthority.authority !== "omp-flow-work-predecessor-delta-authority-v1" ||
    predecessorAuthority.workPredecessorEvidenceTable?.length !== 5) {
  throw new Error("PREDECESSOR_AUTHORITY_INVALID");
}

const V7_MEASUREMENT_BOOTSTRAP = Object.freeze({
  evidenceCommitSha: "5632f63603e6ae8b3fb95f759c793a09b16a1e44",
  reviewedCandidateSha: "5c3e61999e1d406873c957dd9dbb6847cc2487b9",
  handoffCommitSha: "3d84708749ebeb1784b3243e2898de5623a89720",
  handoffPath: ".omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v7.md",
  reviewPath: ".omp-flow/tasks/08-07-product-truth-consolidation/reviews/product-truth-complexity-v7.md",
  handoffBlobId: "fd31a236709a8e2482571423ac1e414cd7d84b40",
  reviewBlobId: "fa047d2bf3c62ce87483cea86f6e0b1ed2362eea",
  reportSha256: "aa114aeb6239dffdc10ef8023ea3399bb9e8705f5960560e5766d80abe06b16c",
  implementerActorId: "product_truth_meter_v7_r5",
  reviewerActorId: "product_truth_meter_v7_review_r5",
  implementationReceipt: "10dd37a4714e4fed913d3863fe0166d1",
  reviewReceipt: "ac877c8dbc3a425b91129f153deb61f9",
});
const parseFrontMatter = (text, identity) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) throw new Error(`EVIDENCE_FRONT_MATTER_INVALID:${identity}`);
  const fields = new Map();
  for (const line of match[1].split("\n")) {
    const field = /^([a-z_]+):\s*(?:"([^"]*)"|([^\s].*))$/.exec(line);
    if (!field || fields.has(field[1])) throw new Error(`EVIDENCE_FRONT_MATTER_INVALID:${identity}`);
    fields.set(field[1], field[2] ?? field[3]);
  }
  return fields;
};
const isAncestor = (ancestor, descendant) => {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
    cwd: repositoryRoot,
    encoding: null,
  });
  return result.status === 0;
};
const validateMeasurementBootstrap = () => {
  const expected = V7_MEASUREMENT_BOOTSTRAP;
  if (predecessorEvidenceCommit !== expected.evidenceCommitSha) {
    throw new Error("OFFICIAL_EVIDENCE_SHA_NOT_ACCEPTED_V7_BOOTSTRAP");
  }
  const handoffEntry = predecessorEvidence.tree.get(expected.handoffPath);
  const reviewEntry = predecessorEvidence.tree.get(expected.reviewPath);
  if (!handoffEntry || handoffEntry.mode !== "100644" || handoffEntry.type !== "blob" ||
      handoffEntry.object !== expected.handoffBlobId) throw new Error("EVIDENCE_HANDOFF_BLOB_MISMATCH");
  if (!reviewEntry || reviewEntry.mode !== "100644" || reviewEntry.type !== "blob" ||
      reviewEntry.object !== expected.reviewBlobId) throw new Error("EVIDENCE_REVIEW_BLOB_MISMATCH");
  const handoffText = predecessorEvidence.textAt(expected.handoffPath);
  const reviewText = predecessorEvidence.textAt(expected.reviewPath);
  const handoff = parseFrontMatter(handoffText, expected.handoffPath);
  const review = parseFrontMatter(reviewText, expected.reviewPath);
  const exactHandoff = {
    type: "Handoff",
    work: "../work/product-truth-complexity-v7.md",
    status: "DONE",
    actor_id: expected.implementerActorId,
    dispatch_receipt: expected.implementationReceipt,
  };
  const exactReview = {
    type: "Implementation Review",
    work: "../work/product-truth-complexity-v7.md",
    handoff: "../handoffs/product-truth-complexity-v7.md",
    verdict: "PASS",
    actor_id: expected.reviewerActorId,
    dispatch_receipt: expected.reviewReceipt,
    predecessor_receipt: expected.implementationReceipt,
    predecessor_output: "../handoffs/product-truth-complexity-v7.md",
    reviewed_candidate: expected.reviewedCandidateSha,
    reviewed_handoff_commit: expected.handoffCommitSha,
  };
  for (const [field, value] of Object.entries(exactHandoff)) {
    if (handoff.get(field) !== value) throw new Error(`EVIDENCE_HANDOFF_FIELD_MISMATCH:${field}`);
  }
  for (const [field, value] of Object.entries(exactReview)) {
    if (review.get(field) !== value) throw new Error(`EVIDENCE_REVIEW_FIELD_MISMATCH:${field}`);
  }
  if (handoff.get("actor_id") === review.get("actor_id")) throw new Error("EVIDENCE_ACTOR_SEPARATION_INVALID");
  if (!isAncestor(expected.reviewedCandidateSha, predecessorEvidenceCommit) ||
      expected.reviewedCandidateSha === predecessorEvidenceCommit) {
    throw new Error("EVIDENCE_ANCESTRY_INVALID");
  }
  const handoffReportDigests = [...handoffText.matchAll(/B0 JSON SHA-256\s+([0-9a-f]{64})/g)].map((match) => match[1]);
  const reviewReportDigests = [...reviewText.matchAll(/full JSON SHA-256\s+`([0-9a-f]{64})`/g)].map((match) => match[1]);
  if (handoffReportDigests.length !== 1 || reviewReportDigests.length !== 1 ||
      handoffReportDigests[0] !== expected.reportSha256 || reviewReportDigests[0] !== expected.reportSha256) {
    throw new Error("EVIDENCE_REPORT_DIGEST_MISMATCH");
  }
  return {
    kind: "accepted-v7-measurement-bootstrap",
    candidateWorkId: "product-truth-complexity-v8",
    candidateUnderTestSha: commit,
    officialPredecessorEvidenceSha: predecessorEvidenceCommit,
    reviewedCandidateSha: expected.reviewedCandidateSha,
    handoffPath: expected.handoffPath,
    reviewPath: expected.reviewPath,
    handoffBlobId: handoffEntry.object,
    reviewBlobId: reviewEntry.object,
    predecessorReportSha256: expected.reportSha256,
    implementerActorId: handoff.get("actor_id"),
    reviewerActorId: review.get("actor_id"),
    reviewReceipt: review.get("dispatch_receipt"),
    identityAuthenticationClaimed: false,
  };
};
const blobIdAt = (snapshot, path, diagnostic) => {
  const entry = snapshot.tree.get(path);
  if (!entry || entry.mode !== "100644" || entry.type !== "blob") throw new Error(diagnostic);
  return entry.object;
};
const firstParentRange = (ancestor, descendant) => {
  const commits = git(["rev-list", "--first-parent", "--reverse", `${ancestor}..${descendant}`])
    .toString("ascii").trim().split("\n").filter(Boolean);
  if (!commits.length || commits.at(-1) !== descendant) throw new Error("EVIDENCE_FIRST_PARENT_ANCESTRY_INVALID");
  const firstParentAncestors = new Set(git(["rev-list", "--first-parent", descendant]).toString("ascii").trim().split("\n"));
  if (!firstParentAncestors.has(ancestor)) throw new Error("EVIDENCE_FIRST_PARENT_ANCESTRY_INVALID");
  return commits;
};
const relativeConceptPath = (kind, workId) => `../${kind}/${workId}.md`;
const validateProductPredecessorEvidence = () => {
  const row = predecessorAuthority.workPredecessorEvidenceTable.find((entry) => entry.candidateWorkId === candidateWorkId);
  if (!row || predecessorAuthority.workPredecessorEvidenceTable.filter((entry) => entry.candidateWorkId === candidateWorkId).length !== 1) {
    throw new Error("CANDIDATE_WORK_INVALID:not-one-authority-row");
  }
  if (predecessorEvidenceCommit === V7_MEASUREMENT_BOOTSTRAP.evidenceCommitSha ||
      predecessorEvidenceCommit === "50deefc1f8e904805c5c990756f3048de33c7ad5") {
    throw new Error("CANDIDATE_CHOSEN_PREDECESSOR_FORBIDDEN");
  }
  const handoffBlobId = blobIdAt(predecessorEvidence, row.handoffPath, "EVIDENCE_HANDOFF_BLOB_MISSING");
  const reviewBlobId = blobIdAt(predecessorEvidence, row.reviewPath, "EVIDENCE_REVIEW_BLOB_MISSING");
  const handoffText = predecessorEvidence.textAt(row.handoffPath);
  const reviewText = predecessorEvidence.textAt(row.reviewPath);
  const handoff = parseFrontMatter(handoffText, row.handoffPath);
  const review = parseFrontMatter(reviewText, row.reviewPath);
  const predecessorHandoffRelative = relativeConceptPath("handoffs", row.predecessorWorkId);
  const predecessorWorkRelative = relativeConceptPath("work", row.predecessorWorkId);
  if (handoff.get("type") !== "Handoff" || handoff.get("status") !== "DONE" ||
      handoff.get("work") !== predecessorWorkRelative) throw new Error("EVIDENCE_HANDOFF_WORK_MISMATCH");
  if (review.get("type") !== "Implementation Review" || review.get("verdict") !== "PASS" ||
      review.get("work") !== predecessorWorkRelative || review.get("handoff") !== predecessorHandoffRelative ||
      review.get("predecessor_output") !== predecessorHandoffRelative) throw new Error("EVIDENCE_REVIEW_BINDING_MISMATCH");
  const reviewedCandidateSha = review.get("reviewed_candidate");
  if (!reviewedCandidateSha || !/^[0-9a-f]{40}$/.test(reviewedCandidateSha) ||
      handoff.get("reviewed_candidate") !== reviewedCandidateSha) throw new Error("EVIDENCE_REVIEWED_CANDIDATE_MISMATCH");
  const implementerActorId = handoff.get("actor_id");
  const reviewerActorId = review.get("actor_id");
  if (!implementerActorId || !reviewerActorId || implementerActorId === reviewerActorId) {
    throw new Error("EVIDENCE_ACTOR_SEPARATION_INVALID");
  }
  if (!handoff.get("dispatch_receipt") || review.get("predecessor_receipt") !== handoff.get("dispatch_receipt") ||
      !review.get("dispatch_receipt")) throw new Error("EVIDENCE_RECEIPT_CORRELATION_MISMATCH");
  if (!isAncestor(reviewedCandidateSha, predecessorEvidenceCommit) || reviewedCandidateSha === predecessorEvidenceCommit ||
      !isAncestor(predecessorEvidenceCommit, commit) || predecessorEvidenceCommit === commit) {
    throw new Error("EVIDENCE_ANCESTRY_INVALID");
  }
  const laterCommits = firstParentRange(predecessorEvidenceCommit, commit);
  for (const laterCommit of laterCommits) {
    const laterTree = loadTree(laterCommit);
    if (blobIdAt(laterTree, row.handoffPath, "EVIDENCE_HANDOFF_LATER_MISSING") !== handoffBlobId ||
        blobIdAt(laterTree, row.reviewPath, "EVIDENCE_REVIEW_LATER_MISSING") !== reviewBlobId) {
      throw new Error("EVIDENCE_BLOB_MUTATED_AFTER_SELECTION");
    }
  }
  const report = extractMachineBlock(handoffText, "omp-flow-product-truth-complexity-v8-report-v1", row.handoffPath);
  if (report.format !== FORMAT) throw new Error("EVIDENCE_REPORT_FORMAT_MISMATCH");
  const evidenceInstrument = predecessorEvidence.bytesAt("scripts/product-truth/measure-complexity-v8.mjs");
  const evidenceConfig = predecessorEvidence.bytesAt("scripts/product-truth/complexity-universe-v8.json");
  if (!evidenceInstrument?.equals(scriptBytes) || !evidenceConfig?.equals(configBytes) ||
      report.instrument?.scriptSha256 !== sha256(scriptBytes) || report.instrument?.configSha256 !== sha256(configBytes)) {
    throw new Error("EVIDENCE_V8_INSTRUMENT_MISMATCH");
  }
  if (report.officialInvocation?.fixtureMode !== false || report.officialInvocation?.official !== true) {
    throw new Error("EVIDENCE_REPORT_NOT_OFFICIAL_INVOCATION");
  }
  const expectedReportCommit = row.comparisonRef === config.baselineCommit ? config.baselineCommit : reviewedCandidateSha;
  if (report.commit !== expectedReportCommit) throw new Error("EVIDENCE_REPORT_CANDIDATE_MISMATCH");
  if (row.comparisonRef !== config.baselineCommit && report.comparison?.candidateWorkId !== row.predecessorWorkId) {
    throw new Error("EVIDENCE_REPORT_WORK_MISMATCH");
  }
  const predecessorReportSha256 = sha256(Buffer.from(canonicalJson(report)));
  if (review.get("report_sha256") !== predecessorReportSha256 || handoff.get("report_sha256") !== predecessorReportSha256) {
    throw new Error("EVIDENCE_REPORT_DIGEST_MISMATCH");
  }
  return {
    kind: "accepted-product-predecessor",
    candidateWorkId: row.candidateWorkId,
    predecessorWorkId: row.predecessorWorkId,
    candidateUnderTestSha: commit,
    officialPredecessorEvidenceSha: predecessorEvidenceCommit,
    reviewedCandidateSha,
    handoffPath: row.handoffPath,
    reviewPath: row.reviewPath,
    handoffBlobId,
    reviewBlobId,
    predecessorReportSha256,
    implementerActorId,
    reviewerActorId,
    reviewReceipt: review.get("dispatch_receipt"),
    identityAuthenticationClaimed: false,
    predecessorReport: report,
  };
};
const verificationOnlyHistoricalB1 = fixture?.verificationOnlyHistoricalB1 === true &&
  commit === "50deefc1f8e904805c5c990756f3048de33c7ad5" && candidateWorkId === "direct-first-public-b1";
const evidenceBinding = commit === config.baselineCommit || verificationOnlyHistoricalB1
  ? validateMeasurementBootstrap()
  : validateProductPredecessorEvidence();
const measurementBootstrap = evidenceBinding.kind === "accepted-v7-measurement-bootstrap" ? evidenceBinding : null;

const validateVerifierUniverse = (value) => {
  if (value.version !== 1 || value.owners.length !== 10 || value.fixtureStateCatalog.length !== 10) {
    throw new Error("B1_VERIFIER_UNIVERSE_INVALID:owner-count");
  }
  const operationCount = value.owners.reduce((count, owner) => count + owner.operations.length, 0);
  const barrierCount = value.owners.reduce((count, owner) => count + owner.barriers.length, 0);
  const killIdentityCount = value.owners.reduce((count, owner) => count + owner.killAfter.length, 0);
  const stateIds = value.fixtureStateCatalog.flatMap((entry) => entry.states.map((state) => state.id));
  const operationIds = value.owners.flatMap((owner) => owner.operations.map((operation) => operation.id));
  const barrierIds = value.owners.flatMap((owner) => owner.barriers.map((barrier) => barrier.id));
  const convergenceIds = value.convergenceStateCatalog.map((entry) => entry.id);
  for (const [name, ids, expected] of [
    ["operation", operationIds, 146], ["state", stateIds, 87], ["barrier", barrierIds, 34],
    ["kill", value.killCaseCatalog.map((entry) => `${entry.operationId}\0${entry.stateId}`), 29],
    ["convergence", convergenceIds, 24],
  ]) {
    if (ids.length !== expected || new Set(ids).size !== ids.length) throw new Error(`B1_VERIFIER_UNIVERSE_INVALID:${name}`);
  }
  if (operationCount !== 146 || barrierCount !== 34 || killIdentityCount !== 29 ||
      value.raceCaseCatalog.length !== 34 || value.killCaseCatalog.length !== 29 ||
      !stateIds.includes("apply.package-empty")) {
    throw new Error("B1_VERIFIER_UNIVERSE_INVALID:cardinality");
  }
  const fixtureLines = [];
  for (const entry of value.fixtureStateCatalog) {
    const definition = clone(entry);
    delete definition.definitionSha256;
    const digest = sha256(Buffer.from(canonicalJson(definition)));
    if (digest !== entry.definitionSha256) throw new Error(`B1_VERIFIER_UNIVERSE_INVALID:owner-digest:${entry.owner}`);
    fixtureLines.push(`${entry.owner}\t${entry.definitionSha256}\n`);
    if (JSON.stringify(entry.normalStateIds) !== JSON.stringify(entry.states.map((state) => state.id))) {
      throw new Error(`B1_VERIFIER_UNIVERSE_INVALID:state-order:${entry.owner}`);
    }
    for (const selected of [entry.faultStateId, entry.raceStateId, entry.killStateId]) {
      if (!entry.states.some((state) => state.id === selected)) throw new Error(`B1_VERIFIER_UNIVERSE_INVALID:selected-state:${entry.owner}`);
    }
  }
  if (sha256(Buffer.from(fixtureLines.join(""))) !== value.fixtureCatalogSha256) {
    throw new Error("B1_VERIFIER_UNIVERSE_INVALID:catalog-digest");
  }
  const ownerByOperation = new Map();
  for (const owner of value.owners) for (const operation of owner.operations) {
    if (ownerByOperation.has(operation.id)) throw new Error(`B1_VERIFIER_UNIVERSE_INVALID:operation-duplicate:${operation.id}`);
    ownerByOperation.set(operation.id, owner.owner);
  }
  const fixtureByOwner = new Map(value.fixtureStateCatalog.map((entry) => [entry.owner, entry]));
  const deriveCount = (fixtureEntry, state, operationId) => {
    const binding = fixtureEntry.iterationBindings.find((entry) =>
      entry.operationId === operationId || entry.operationIds?.includes(operationId));
    if (!binding) return null;
    const resources = { ...(fixtureEntry.stateDefaults?.resources ?? {}), ...(state.resources ?? {}) };
    const derive = binding.derive;
    if (derive === "ancestorCount" || derive === "databaseMemberCount" || derive === "exactLegacyKeyCount" ||
        derive === "legacyFileCount" || derive === "orderedLockPathCount" || derive === "packageTransitionCount" ||
        derive === "processProbeCount" || derive === "protectedAggregateQueryCount" || derive === "sourceDataChunkCount") return resources[derive];
    if (derive === "exactKeyOrder.length" || derive === "orderedEntryKinds.length" || derive === "targetDataChunkCounts.length" ||
        derive === "protectedExclusionChunkCounts.length") return resources[derive.split(".")[0]].length;
    if (derive === "sum-entryDataChunkCounts") return resources.entryDataChunkCounts.reduce((sum, count) => sum + count, 0);
    if (derive === "sourceDataChunkCount-plus-one-terminal-eof") return resources.sourceDataChunkCount + 1;
    if (derive === "sum-entryDataChunkCounts-plus-orderedEntryKinds.length-terminal-eofs") {
      return resources.entryDataChunkCounts.reduce((sum, count) => sum + count, 0) + resources.orderedEntryKinds.length;
    }
    if (derive === "sum-protectedExclusionChunkCounts-plus-protectedExclusionChunkCounts.length-terminal-eofs") {
      return resources.protectedExclusionChunkCounts.reduce((sum, count) => sum + count, 0) + resources.protectedExclusionChunkCounts.length;
    }
    if (derive === "sum-targetDataChunkCounts-plus-targetDataChunkCounts.length-terminal-eofs") {
      return resources.targetDataChunkCounts.reduce((sum, count) => sum + count, 0) + resources.targetDataChunkCounts.length;
    }
    if (derive === "existingRecordKinds.length-when-the-selected-record-kind-reaches-the-operation-otherwise-zero") {
      return resources.existingRecordKinds.length;
    }
    if (derive.includes("schemaStatementCount-only-for-")) return state.id.endsWith("clean-absence") ? resources.schemaStatementCount : 0;
    if (derive.includes("validationQueryCount-only-when-current-is-exact-g1-or-clean-create-committed-otherwise-zero")) {
      return state.current === "exact-g1" || state.id.endsWith("clean-absence") ? resources.validationQueryCount : 0;
    }
    throw new Error(`B1_VERIFIER_UNIVERSE_INVALID:unknown-derive:${derive}`);
  };
  const ordinalIdentities = (owner, stateId, operationId) => {
    const fixtureEntry = fixtureByOwner.get(owner);
    const state = fixtureEntry?.states.find((candidateState) => candidateState.id === stateId);
    if (!fixtureEntry || !state) throw new Error(`B1_VERIFIER_UNIVERSE_INVALID:case-state:${stateId}`);
    const count = deriveCount(fixtureEntry, state, operationId);
    if (count === null) return ["single"];
    if (!Number.isInteger(count) || count < 1) throw new Error(`B1_VERIFIER_UNIVERSE_INVALID:ordinal-count:${operationId}`);
    return Array.from({ length: count }, (_, index) => String(index));
  };
  const raceIds = [];
  for (const entry of value.raceCaseCatalog) {
    const owner = ownerByOperation.get(entry.ordinalOperationId);
    const ownerEntry = value.owners.find((candidateOwner) => candidateOwner.owner === owner);
    const barrier = ownerEntry?.barriers.find((candidateBarrier) => candidateBarrier.id === entry.barrierId);
    if (!barrier || ![barrier.from, barrier.to].includes(entry.ordinalOperationId)) {
      throw new Error(`B1_VERIFIER_UNIVERSE_INVALID:race-binding:${entry.barrierId}`);
    }
    for (const ordinal of ordinalIdentities(owner, entry.stateId, entry.ordinalOperationId)) {
      raceIds.push(`${owner}::race::${entry.stateId}::${entry.barrierId}::race::${ordinal}::none`);
    }
  }
  const killIds = [];
  for (const entry of value.killCaseCatalog) {
    const owner = ownerByOperation.get(entry.operationId);
    const ownerEntry = value.owners.find((candidateOwner) => candidateOwner.owner === owner);
    if (!ownerEntry?.killAfter.includes(entry.operationId) || !convergenceIds.includes(entry.convergenceStateId)) {
      throw new Error(`B1_VERIFIER_UNIVERSE_INVALID:kill-binding:${entry.operationId}`);
    }
    for (const ordinal of ordinalIdentities(owner, entry.stateId, entry.operationId)) {
      killIds.push(`${owner}::kill::${entry.stateId}::${entry.operationId}::kill-after::${ordinal}::${entry.convergenceStateId}`);
    }
  }
  raceIds.sort();
  killIds.sort();
  const caseDigest = sha256(Buffer.from(canonicalJson([...raceIds, ...killIds])));
  const caseRule = value.caseIdentityCanonicalization;
  if (raceIds.length !== 85 || killIds.length !== 65 || caseRule.expandedRaceCaseCount !== 85 ||
      caseRule.expandedKillCaseCount !== 65 || caseDigest !== caseRule.raceKillCaseIdentitySha256) {
    throw new Error(`B1_VERIFIER_UNIVERSE_INVALID:case-identity:${raceIds.length}:${killIds.length}:${caseDigest}`);
  }
  return {
    ownerCount: value.owners.length,
    operationCount,
    barrierIdentityCount: barrierCount,
    killIdentityCount,
    fixtureStateCount: stateIds.length,
    convergenceStateCount: convergenceIds.length,
    expandedRaceCaseCount: raceIds.length,
    expandedKillCaseCount: killIds.length,
    fixtureCatalogSha256: value.fixtureCatalogSha256,
    raceKillCaseIdentitySha256: caseDigest,
    stateIdsSha256: sha256(Buffer.from(canonicalJson(stateIds))),
    operationIdsSha256: sha256(Buffer.from(canonicalJson(operationIds))),
  };
};
const verifier = validateVerifierUniverse(verifierUniverse);

const sourceExtensions = new Set(config.sourceExtensions);
const isSource = (path) => sourceExtensions.has(extname(path));
const isTestPath = (path) => /\.test\.|\.browser\.|(?:^|\/)(?:fixtures|test-fixtures|testSupport|snapshots|__snapshots__|e2e)(?:\/|$)/.test(path);
const isGeneratedPath = (path) => /(?:^|\/)(?:build|coverage|dist|out|release)(?:\/|$)/.test(path) || /(?:^|\/)routeTree\.gen\./.test(path);
const measurementPathPattern = /^(?:scripts\/check-source-closure\.mjs|scripts\/product-truth\/(?:measure-complexity(?:-v[1-8])?\.mjs|complexity-universe-v[1-8]\.json|measure-complexity-v[2-8]\.test\.ts))$/;
const isMeasurementPath = (path) => measurementPathPattern.test(path);
const isProductionSource = (path) => isSource(path) && !isTestPath(path) && !isGeneratedPath(path) &&
  !isMeasurementPath(path) && !path.startsWith("vendor/");
const physicalLines = (text) => text === "" ? 0 : text.split(/\r?\n/).length - (text.endsWith("\n") ? 1 : 0);

const createSourceGraph = (snapshot) => {
  const paths = [...snapshot.tree.keys()].filter(isProductionSource).sort();
  const texts = new Map(paths.map((path) => [path, snapshot.textAt(path)]));
  const files = new Map();
  const sourceFile = (path) => {
    if (!files.has(path)) {
      const text = texts.get(path);
      files.set(path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true,
        path.endsWith(".tsx") ? ts.ScriptKind.TSX : path.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS));
    }
    return files.get(path);
  };
  const workspacePackages = new Map();
  for (const path of [...snapshot.tree.keys()].filter((candidatePath) => /^(?:apps|packages)\/[^/]+\/package\.json$|^scripts\/package\.json$/.test(candidatePath))) {
    const manifest = JSON.parse(snapshot.textAt(path));
    if (typeof manifest.name === "string") workspacePackages.set(manifest.name, { root: posix.dirname(path), manifest });
  }
  const resolveRelative = (from, specifier) => {
    const base = posix.normalize(posix.join(posix.dirname(from), specifier));
    const candidates = sourceExtensions.has(extname(base)) ? [base] : [
      base, ...config.sourceExtensions.map((extension) => `${base}${extension}`),
      ...config.sourceExtensions.map((extension) => `${base}/index${extension}`),
    ];
    return candidates.find((candidatePath) => snapshot.tree.has(candidatePath));
  };
  const exportedTarget = (entry) => {
    if (typeof entry === "string") return entry;
    if (!entry || typeof entry !== "object") return null;
    for (const key of ["types", "import", "default", "require"]) {
      const target = exportedTarget(entry[key]);
      if (target) return target;
    }
    return null;
  };
  const resolveSpecifier = (from, specifier) => {
    if (specifier.startsWith(".")) return { kind: "internal", target: resolveRelative(from, specifier) };
    if (specifier.startsWith("~/")) {
      return { kind: "internal", target: from.startsWith("apps/web/") ? resolveRelative("apps/web/src/index.ts", `./${specifier.slice(2)}`) : undefined };
    }
    if (/^(?:apps|packages|scripts)\//.test(specifier)) {
      return { kind: "internal", target: resolveRelative("package.json", `./${specifier}`) };
    }
    const packageName = [...workspacePackages.keys()].sort((left, right) => right.length - left.length)
      .find((name) => specifier === name || specifier.startsWith(`${name}/`));
    if (!packageName) return { kind: "external" };
    const workspacePackage = workspacePackages.get(packageName);
    const subpath = specifier === packageName ? "." : `.${specifier.slice(packageName.length)}`;
    const exportsMap = workspacePackage.manifest.exports;
    const entry = exportsMap && typeof exportsMap === "object" ? exportsMap[subpath] : null;
    const declared = exportedTarget(entry) ?? (subpath === "." ? workspacePackage.manifest.types : null);
    return typeof declared === "string"
      ? { kind: "internal", target: resolveRelative(`${workspacePackage.root}/package.json`, declared) }
      : { kind: "unresolved-workspace" };
  };
  const importsFor = (path) => {
    const file = sourceFile(path);
    const literals = [];
    const computed = [];
    const moduleSpecifiers = new Set(["module", "node:module"]);
    const moduleNamespaces = new Set();
    const createRequireFactories = new Set();
    const createRequireResults = new Set();
    const declarations = [];
    const staticSelector = (expression) => {
      if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
      if (ts.isElementAccessExpression(expression) && expression.argumentExpression &&
          (ts.isStringLiteralLike(expression.argumentExpression) || ts.isNoSubstitutionTemplateLiteral(expression.argumentExpression))) {
        return expression.argumentExpression.text;
      }
      return null;
    };
    const isModuleRequireCall = (node) => ts.isCallExpression(node) &&
      (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) &&
      ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "module" &&
      staticSelector(node.expression) === "require";
    const isBareRequireCall = (node) => ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) && node.expression.text === "require";
    const literalCallTarget = (node) => node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])
      ? node.arguments[0].text
      : null;
    const seedBindings = (node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier) && moduleSpecifiers.has(node.moduleSpecifier.text)) {
        const named = node.importClause?.namedBindings;
        if (named && ts.isNamespaceImport(named)) moduleNamespaces.add(named.name.text);
        if (named && ts.isNamedImports(named)) for (const element of named.elements) {
          if ((element.propertyName?.text ?? element.name.text) === "createRequire") createRequireFactories.add(element.name.text);
        }
      }
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) &&
          node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression) &&
          moduleSpecifiers.has(node.moduleReference.expression.text)) moduleNamespaces.add(node.name.text);
      if (ts.isVariableDeclaration(node) && node.initializer) declarations.push(node);
      ts.forEachChild(node, seedBindings);
    };
    seedBindings(file);
    let bindingsChanged = true;
    while (bindingsChanged) {
      bindingsChanged = false;
      const add = (set, name) => {
        if (!set.has(name)) { set.add(name); bindingsChanged = true; }
      };
      for (const declaration of declarations) {
        const { initializer, name } = declaration;
        if (ts.isIdentifier(name) && ts.isIdentifier(initializer)) {
          if (moduleNamespaces.has(initializer.text)) add(moduleNamespaces, name.text);
          if (createRequireFactories.has(initializer.text)) add(createRequireFactories, name.text);
          if (createRequireResults.has(initializer.text)) add(createRequireResults, name.text);
        }
        const loaderSpecifier = (isBareRequireCall(initializer) || isModuleRequireCall(initializer))
          ? literalCallTarget(initializer)
          : null;
        if (loaderSpecifier && moduleSpecifiers.has(loaderSpecifier)) {
          if (ts.isIdentifier(name)) add(moduleNamespaces, name.text);
          if (ts.isObjectBindingPattern(name)) for (const element of name.elements) {
            const imported = element.propertyName && (ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName))
              ? element.propertyName.text
              : ts.isIdentifier(element.name) ? element.name.text : null;
            if (imported === "createRequire" && ts.isIdentifier(element.name)) add(createRequireFactories, element.name.text);
          }
        }
        if (ts.isIdentifier(name) && (ts.isPropertyAccessExpression(initializer) || ts.isElementAccessExpression(initializer)) &&
            staticSelector(initializer) === "createRequire") {
          const base = initializer.expression;
          if (ts.isIdentifier(base) && moduleNamespaces.has(base.text)) add(createRequireFactories, name.text);
          if (ts.isCallExpression(base) && (isBareRequireCall(base) || isModuleRequireCall(base)) &&
              moduleSpecifiers.has(literalCallTarget(base))) add(createRequireFactories, name.text);
        }
        if (ts.isIdentifier(name) && ts.isCallExpression(initializer)) {
          const callee = initializer.expression;
          if ((ts.isIdentifier(callee) && createRequireFactories.has(callee.text)) ||
              ((ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) &&
               ts.isIdentifier(callee.expression) && moduleNamespaces.has(callee.expression.text) && staticSelector(callee) === "createRequire")) {
            add(createRequireResults, name.text);
          }
        }
        if (ts.isObjectBindingPattern(name) && ts.isIdentifier(initializer) && moduleNamespaces.has(initializer.text)) {
          for (const element of name.elements) {
            const imported = element.propertyName && (ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName))
              ? element.propertyName.text
              : ts.isIdentifier(element.name) ? element.name.text : null;
            if (imported === "createRequire" && ts.isIdentifier(element.name)) add(createRequireFactories, element.name.text);
          }
        }
      }
    }
    const visit = (node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
        ts.isStringLiteralLike(node.moduleSpecifier) ? literals.push(node.moduleSpecifier.text) : computed.push(node.getText(file));
      } else if (ts.isImportEqualsDeclaration(node)) {
        const reference = node.moduleReference;
        if (ts.isExternalModuleReference(reference) && reference.expression && ts.isStringLiteralLike(reference.expression)) literals.push(reference.expression.text);
        else computed.push(node.getText(file));
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const argument = node.arguments[0];
        ts.isStringLiteralLike(argument) ? literals.push(argument.text) : computed.push(node.getText(file));
      } else if (isBareRequireCall(node) || isModuleRequireCall(node) ||
          (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && createRequireResults.has(node.expression.text))) {
        const target = literalCallTarget(node);
        target === null ? computed.push(node.getText(file)) : literals.push(target);
      } else if (ts.isImportTypeNode(node)) {
        const argument = node.argument;
        if (ts.isLiteralTypeNode(argument) && ts.isStringLiteralLike(argument.literal)) literals.push(argument.literal.text);
        else computed.push(node.getText(file));
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    return { literals, computed };
  };
  const edges = [];
  const external = [];
  const unresolved = [];
  const computed = [];
  for (const source of paths) {
    const imports = importsFor(source);
    if (imports.computed.length) computed.push({ source, forms: imports.computed });
    for (const specifier of imports.literals) {
      const resolved = resolveSpecifier(source, specifier);
      if (resolved.kind === "external") external.push({ source, specifier });
      else if (!resolved.target) unresolved.push({ source, specifier, kind: resolved.kind });
      else edges.push({ source, target: resolved.target, specifier });
    }
  }
  const uniqueEdges = [...new Map(edges.map((edge) => [`${edge.source}\0${edge.target}`, edge])).values()]
    .sort((left, right) => `${left.source}\0${left.target}`.localeCompare(`${right.source}\0${right.target}`));
  return { paths, texts, sourceFile, resolveSpecifier, edges: uniqueEdges, external, unresolved, computed };
};

const acceptedGraph = createSourceGraph(accepted);
const candidateGraph = createSourceGraph(candidate);
const declaredProductionPaths = [...new Set(workBlocks.flatMap((block) => block.production.map((entry) => entry.path)))].sort();
const declaredMeasurementPaths = [...new Set([
  ...workBlocks.flatMap((block) => block.measurement.map((entry) => entry.path)),
  ...[...accepted.tree.keys()].filter((path) => measurementPathPattern.test(path)),
  "scripts/product-truth/measure-complexity-v7.mjs",
  "scripts/product-truth/complexity-universe-v7.json",
  "scripts/product-truth/measure-complexity-v7.test.ts",
  "scripts/product-truth/measure-complexity-v8.mjs",
  "scripts/product-truth/complexity-universe-v8.json",
  "scripts/product-truth/measure-complexity-v8.test.ts",
])].sort();
const declaredDependencyPaths = [...new Set(workBlocks.flatMap((block) => block.dependency.map((entry) => entry.path)))].sort();
for (const block of workBlocks) {
  for (const group of ["production", "measurement", "dependency"]) {
    if (!Array.isArray(block[group]) || block[group].some((entry) => Object.keys(entry).sort().join(",") !== "kind,path" || entry.kind !== "exact" || !entry.path)) {
      throw new Error(`WORK_AUTHORITY_INVALID:${block.work}:${group}`);
    }
  }
}
const acceptedSeeds = new Set(declaredProductionPaths.filter((path) => accepted.tree.has(path) && isProductionSource(path)));
const acceptedClosure = new Set(acceptedSeeds);
let closureChanged = true;
while (closureChanged) {
  closureChanged = false;
  for (const edge of acceptedGraph.edges) {
    if ((acceptedClosure.has(edge.source) || acceptedClosure.has(edge.target)) &&
        (!acceptedClosure.has(edge.source) || !acceptedClosure.has(edge.target))) {
      acceptedClosure.add(edge.source);
      acceptedClosure.add(edge.target);
      closureChanged = true;
    }
  }
}
const frozenMembership = new Set([
  ...acceptedClosure,
  ...declaredProductionPaths,
  ...declaredMeasurementPaths,
  ...declaredDependencyPaths,
]);
const boundaryCrossings = candidateGraph.edges.filter((edge) => frozenMembership.has(edge.source) !== frozenMembership.has(edge.target));
const frozenComputed = candidateGraph.computed.filter((entry) => frozenMembership.has(entry.source));
const frozenUnresolved = candidateGraph.unresolved.filter((entry) => frozenMembership.has(entry.source));
if (boundaryCrossings.length) throw new Error(`FROZEN_MEMBERSHIP_EDGE_ESCAPE:${JSON.stringify(boundaryCrossings)}`);
if (frozenComputed.length) throw new Error(`COMPUTED_IMPORT_FORBIDDEN:${JSON.stringify(frozenComputed)}`);
if (frozenUnresolved.length) throw new Error(`UNRESOLVED_IMPORT_FORBIDDEN:${JSON.stringify(frozenUnresolved)}`);

const dependencyBytes = [];
const selectedDependencyPins = commit === config.baselineCommit ? config.baselineDependencyBytes : config.dependencyBytes;
for (const [path, expectedSha256] of Object.entries(selectedDependencyPins)) {
  const bytes = candidate.bytesAt(path);
  const actualSha256 = bytes === null ? null : sha256(bytes);
  if (actualSha256 !== expectedSha256) throw new Error(`DEPENDENCY_BYTES_CHANGED:${path}`);
  dependencyBytes.push({ path, sha256: actualSha256 });
}
const workspaceManifestPaths = [...dependencyAuthoritySnapshot.tree.keys()]
  .filter((path) => path === "package.json" || /^(?:apps|packages)\/[^/]+\/package\.json$|^scripts\/package\.json$/.test(path))
  .sort();
const workspaceManifestBytes = [];
const declaredPackages = new Set();
for (const path of workspaceManifestPaths) {
  const acceptedBytes = dependencyAuthoritySnapshot.bytesAt(path);
  const candidateBytes = candidate.bytesAt(path);
  if (candidateBytes === null || !candidateBytes.equals(acceptedBytes)) throw new Error(`DEPENDENCY_MANIFEST_CHANGED:${path}`);
  workspaceManifestBytes.push({ path, sha256: sha256(candidateBytes) });
  const manifest = JSON.parse(decodeUtf8(candidateBytes, path));
  for (const name of [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})]) declaredPackages.add(name);
}
const packageRoot = (specifier) => specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
const builtin = (specifier) => specifier.startsWith("node:") || specifier.startsWith("bun:") ||
  ["fs", "fs/promises", "child_process", "cluster", "worker_threads", "vm", "module", "bun", "original-fs"].includes(specifier);
const externalDependencyViolations = candidateGraph.external.filter(({ source, specifier }) =>
  frozenMembership.has(source) && !builtin(specifier) && !declaredPackages.has(packageRoot(specifier)) && !specifier.endsWith("?worker") && !specifier.endsWith("?url"));
if (externalDependencyViolations.length) throw new Error(`UNKNOWN_DEPENDENCY_EXPORT:${JSON.stringify(externalDependencyViolations)}`);
const acceptedDependencyEffects = rawUniverse.acceptedDependencyEffects.map((entry) => ({
  package: entry.package,
  locator: entry.locator,
  lockIdentity: entry.lockIntegrity ?? entry.lockedRevision,
  sourceClosureSha256: entry.sourceClosureSha256,
  exportsSha256: sha256(Buffer.from(canonicalJson(entry.exports))),
}));
const candidateLockText = candidate.textAt("bun.lock");
const dependencyEffectAvailability = rawUniverse.acceptedDependencyEffects.map((entry) => {
  const identities = [entry.locator, entry.lockIntegrity, entry.lockedRevision].filter(Boolean);
  return { package: entry.package, exactIdentityPresent: identities.every((identity) => candidateLockText.includes(identity)) };
});
if (commit !== config.baselineCommit && dependencyEffectAvailability.some((entry) => !entry.exactIdentityPresent)) {
  throw new Error(`DEPENDENCY_EFFECT_IDENTITY_UNAVAILABLE:${JSON.stringify(dependencyEffectAvailability)}`);
}

for (const [name, expected] of Object.entries(config.immutableInstruments)) {
  const path = `scripts/product-truth/${name}`;
  const bytes = candidate.bytesAt(path);
  if (bytes && sha256(bytes) !== expected) throw new Error(`REJECTED_INSTRUMENT_CHANGED:${name}`);
  const evidenceBytes = predecessorEvidence.bytesAt(path);
  if (evidenceBytes === null || sha256(evidenceBytes) !== expected) throw new Error(`V1_V7_EVIDENCE_CHANGED:${name}`);
}
if (config.format !== "product-truth-complexity-universe-v8") throw new Error("CONFIG_FORMAT_INVALID");
if (commit !== config.baselineCommit && !verificationOnlyHistoricalB1) {
  const candidateScript = candidate.bytesAt("scripts/product-truth/measure-complexity-v8.mjs");
  const candidateConfig = candidate.bytesAt("scripts/product-truth/complexity-universe-v8.json");
  if (!candidateScript?.equals(scriptBytes) || !candidateConfig?.equals(configBytes)) {
    throw new Error("V8_INSTRUMENT_NOT_IMMUTABLE_AT_CANDIDATE");
  }
}
const membershipPaths = [...frozenMembership].sort();
const presentMembers = membershipPaths.filter((path) => candidate.tree.has(path));
const categoryOf = (path) => isMeasurementPath(path) ? "measurement" : isTestPath(path) ? "test" :
  path.startsWith("scripts/product-truth/") ? "direct-tool" : "production";
const lines = { production: 0, steadyStateRuntime: 0, directRebuildTool: 0, tests: 0, measurement: 0 };
const files = [];
for (const path of presentMembers.filter((member) => config.lineExtensions.includes(extname(member)))) {
  const count = physicalLines(candidate.textAt(path));
  const category = categoryOf(path);
  files.push({ path, category, lines: count });
  if (category === "measurement") lines.measurement += count;
  else if (category === "test") lines.tests += count;
  else if (category === "direct-tool") { lines.production += count; lines.directRebuildTool += count; }
  else { lines.production += count; lines.steadyStateRuntime += count; }
}
const importEdges = candidateGraph.edges.filter((edge) => frozenMembership.has(edge.source) && frozenMembership.has(edge.target));
const nodes = [...new Set(importEdges.flatMap((edge) => [edge.source, edge.target]))].sort();
const adjacency = new Map(nodes.map((node) => [node, []]));
for (const edge of importEdges) adjacency.get(edge.source).push(edge.target);
let graphIndex = 0;
const graphStack = [];
const graphOnStack = new Set();
const graphIndices = new Map();
const graphLow = new Map();
const graphComponents = [];
const connect = (node) => {
  graphIndices.set(node, graphIndex); graphLow.set(node, graphIndex); graphIndex += 1;
  graphStack.push(node); graphOnStack.add(node);
  for (const target of adjacency.get(node)) {
    if (!graphIndices.has(target)) { connect(target); graphLow.set(node, Math.min(graphLow.get(node), graphLow.get(target))); }
    else if (graphOnStack.has(target)) graphLow.set(node, Math.min(graphLow.get(node), graphIndices.get(target)));
  }
  if (graphLow.get(node) === graphIndices.get(node)) {
    const component = [];
    while (graphStack.length) { const member = graphStack.pop(); graphOnStack.delete(member); component.push(member); if (member === node) break; }
    graphComponents.push(component.sort());
  }
};
for (const node of nodes) if (!graphIndices.has(node)) connect(node);

if (JSON.stringify(rawUniverse.classIds) !== JSON.stringify(ingressAuthority.classIds) ||
    new Set(rawUniverse.classIds).size !== 9 || ingressAuthority.rawEffectUniverse !== "omp-flow-raw-effect-universe-v1") {
  throw new Error("RAW_EFFECT_AUTHORITY_INVALID:class-set");
}
const moduleRootClasses = new Map();
for (const entry of rawUniverse.moduleRoots) for (const specifier of entry.specifiers) moduleRootClasses.set(specifier, entry.allExports);
const moduleSelectorClasses = new Map();
for (const entry of rawUniverse.moduleSelectors) {
  for (const exported of entry.exports) moduleSelectorClasses.set(`${entry.specifier}\0${exported}`, entry.classes);
}
const dependencyExportClasses = new Map();
const acceptedEffectPackages = new Set();
for (const entry of rawUniverse.acceptedDependencyEffects) {
  acceptedEffectPackages.add(entry.package);
  for (const exported of entry.exports) dependencyExportClasses.set(`${entry.package}\0${exported.name}`, exported.classes);
}
const allowedClassesByPath = new Map();
for (const entry of ingressAuthority.b1TracedOwners) {
  allowedClassesByPath.set(entry.path, new Set([...(allowedClassesByPath.get(entry.path) ?? []), ...entry.classes]));
}
for (const entry of ingressAuthority.closedUnrelatedOwners) {
  allowedClassesByPath.set(entry.path, new Set([...(allowedClassesByPath.get(entry.path) ?? []), ...entry.classes]));
}
const cMove = ingressAuthority.cOwnerMoves[0];
if (!cMove || ingressAuthority.cOwnerMoves.length !== 1) throw new Error("RAW_EFFECT_AUTHORITY_INVALID:c-owner-move");
allowedClassesByPath.set(cMove.to.split("#")[0], new Set(cMove.classes));

const rawIngress = [];
const rawViolations = [];
const canonicalIngress = [];
const addViolation = (code, path, node, detail) => {
  const file = candidateGraph.sourceFile(path);
  rawViolations.push({
    code,
    path,
    line: node ? file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1 : 0,
    detail,
  });
};
const ownerName = (node, file) => {
  for (let current = node; current; current = current.parent) {
    if ((ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current)) && current.name) return current.name.getText(file);
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && ts.isVariableDeclaration(current.parent) && ts.isIdentifier(current.parent.name)) return current.parent.name.text;
    if (ts.isConstructorDeclaration(current)) return "constructor";
  }
  return "<module>";
};
const directChildren = (node) => {
  const children = [];
  ts.forEachChild(node, (child) => children.push(child));
  return children;
};
const normalizedNodeText = (node, file) => node.getText(file).replace(/\s+/g, " ").trim();
const childRolePath = (node, file) => {
  const roles = [];
  for (let current = node; current.parent; current = current.parent) {
    const siblings = directChildren(current.parent);
    const index = siblings.indexOf(current);
    roles.unshift(`${ts.SyntaxKind[current.parent.kind]}[${index}]:${ts.SyntaxKind[current.kind]}`);
    if (ts.isSourceFile(current.parent)) break;
  }
  return roles;
};
const declarationModifiers = (node) => new Set((node.modifiers ?? []).map((modifier) => modifier.kind));
const containingClassName = (node) => {
  for (let current = node.parent; current; current = current.parent) {
    if ((ts.isClassDeclaration(current) || ts.isClassExpression(current)) && current.name) return current.name.text;
  }
  return "<anonymous-class>";
};
const qualifiedOwner = (node, file, path) => {
  const anonymousCallbackAstRoles = [];
  const ancestry = [];
  for (let current = node; current && !ts.isSourceFile(current); current = current.parent) {
    if (ts.isConstructorDeclaration(current)) {
      const className = containingClassName(current);
      ancestry.unshift(`class:${className}`, "constructor");
      return {
        symbol: "constructor",
        declarationKind: "class-constructor",
        qualifiedDeclarationId: `module:${path}::class:${className}#constructor`,
        qualifiedNamedLexicalAncestry: ancestry,
        anonymousCallbackAstRoles,
        declarationNode: current,
        defaultExport: false,
      };
    }
    if (ts.isMethodDeclaration(current) || ts.isGetAccessorDeclaration(current) || ts.isSetAccessorDeclaration(current)) {
      const className = containingClassName(current);
      const symbol = current.name?.getText(file) ?? "<anonymous-member>";
      const kind = ts.isMethodDeclaration(current) ? "class-method" : "class-accessor";
      ancestry.unshift(`class:${className}`, `${kind}:${symbol}`);
      return {
        symbol,
        declarationKind: kind,
        qualifiedDeclarationId: `module:${path}::class:${className}#${kind}:${symbol}`,
        qualifiedNamedLexicalAncestry: ancestry,
        anonymousCallbackAstRoles,
        declarationNode: current,
        defaultExport: false,
      };
    }
    if (ts.isFunctionDeclaration(current) && current.name) {
      const symbol = current.name.text;
      const moduleScope = ts.isSourceFile(current.parent);
      const modifiers = declarationModifiers(current);
      ancestry.unshift(`${moduleScope ? "function" : "nested-function"}:${symbol}`);
      return {
        symbol,
        declarationKind: moduleScope ? "named-function-declaration" : "nested-named-function-declaration",
        qualifiedDeclarationId: moduleScope
          ? `module:${path}::function:${symbol}`
          : `module:${path}::${ancestry.join("/")}`,
        qualifiedNamedLexicalAncestry: ancestry,
        anonymousCallbackAstRoles,
        declarationNode: current,
        defaultExport: modifiers.has(ts.SyntaxKind.DefaultKeyword),
      };
    }
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
        ts.isVariableDeclaration(current.parent) && ts.isIdentifier(current.parent.name)) {
      const declaration = current.parent;
      const declarationList = declaration.parent;
      const statement = declarationList.parent;
      const moduleScope = ts.isVariableDeclarationList(declarationList) && ts.isVariableStatement(statement) && ts.isSourceFile(statement.parent);
      const isConstArrow = ts.isArrowFunction(current) && (declarationList.flags & ts.NodeFlags.Const) !== 0;
      const symbol = declaration.name.text;
      const declarationKind = moduleScope && isConstArrow
        ? "const-arrow-function"
        : moduleScope ? "module-function-expression" : "nested-variable-function";
      ancestry.unshift(`${declarationKind}:${symbol}`);
      return {
        symbol,
        declarationKind,
        qualifiedDeclarationId: moduleScope
          ? `module:${path}::${isConstArrow ? "const-arrow" : "function-expression"}:${symbol}`
          : `module:${path}::${ancestry.join("/")}`,
        qualifiedNamedLexicalAncestry: ancestry,
        anonymousCallbackAstRoles,
        declarationNode: current,
        defaultExport: false,
      };
    }
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
        (ts.isPropertyDeclaration(current.parent) || ts.isPropertyAssignment(current.parent))) {
      const className = containingClassName(current);
      const symbol = current.parent.name?.getText(file) ?? "<anonymous-member>";
      return {
        symbol,
        declarationKind: "class-property-function",
        qualifiedDeclarationId: `module:${path}::class:${className}#property:${symbol}`,
        qualifiedNamedLexicalAncestry: [`class:${className}`, `property:${symbol}`],
        anonymousCallbackAstRoles,
        declarationNode: current,
        defaultExport: false,
      };
    }
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      anonymousCallbackAstRoles.unshift(childRolePath(current, file).join("/"));
    }
  }
  return {
    symbol: "<module>",
    declarationKind: "module",
    qualifiedDeclarationId: `module:${path}`,
    qualifiedNamedLexicalAncestry: [],
    anonymousCallbackAstRoles,
    declarationNode: file,
    defaultExport: false,
  };
};
const enclosingStatement = (node, file) => {
  for (let current = node; current && current !== file; current = current.parent) {
    if (ts.isStatement(current) || ts.isVariableDeclaration(current) || ts.isPropertyDeclaration(current)) return current;
  }
  return file;
};
const structuralSiteRecord = (node, file, path, identity, form, classes) => {
  const owner = qualifiedOwner(node, file, path);
  const siblings = directChildren(node.parent);
  const siblingIndex = siblings.indexOf(node);
  const siblingDigest = (sibling) => sibling ? sha256(Buffer.from(normalizedNodeText(sibling, file))) : null;
  const statement = enclosingStatement(node, file);
  const record = {
    path,
    qualifiedLexicalOwnerId: owner.qualifiedDeclarationId,
    declarationKind: owner.declarationKind,
    qualifiedNamedLexicalAncestry: owner.qualifiedNamedLexicalAncestry,
    anonymousCallbackAstRoles: owner.anonymousCallbackAstRoles,
    resolvedTerminal: `${identity.specifier ?? "global"}#${identity.exported ?? identity.member ?? "*"}`,
    sourceForm: form,
    classes,
    rawExpressionNormalizedTokenSha256: sha256(Buffer.from(normalizedNodeText(node, file))),
    enclosingStatementSkeletonSha256: sha256(Buffer.from(normalizedNodeText(statement, file))),
    predecessorAnchoredAstChildRolePath: childRolePath(node, file),
    siblingAnchors: {
      preceding: siblingDigest(siblings[siblingIndex - 1]),
      following: siblingDigest(siblings[siblingIndex + 1]),
    },
  };
  return { ...record, siteId: sha256(Buffer.from(canonicalJson(record))), owner };
};
const classesForModuleExport = (specifier, exported) => {
  if (moduleRootClasses.has(specifier)) return moduleRootClasses.get(specifier);
  if (moduleSelectorClasses.has(`${specifier}\0${exported}`)) return moduleSelectorClasses.get(`${specifier}\0${exported}`);
  const root = packageRoot(specifier);
  if (exported === "*" && acceptedEffectPackages.has(root)) {
    return [...new Set([...dependencyExportClasses.entries()].filter(([key]) => key.startsWith(`${root}\0`)).flatMap(([, classes]) => classes))];
  }
  return dependencyExportClasses.get(`${root}\0${exported}`) ?? null;
};
const staticMember = (node) => {
  if (ts.isPropertyAccessExpression(node)) return { value: node.name.text, form: "dot" };
  if (!ts.isElementAccessExpression(node)) return null;
  const argument = node.argumentExpression;
  if (ts.isStringLiteralLike(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
    return { value: argument.text, form: "computed-literal" };
  }
  return { value: null, form: "computed-nonliteral" };
};
const expressionChain = (node) => {
  const members = [];
  let current = node;
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    members.unshift(staticMember(current));
    current = current.expression;
  }
  return ts.isIdentifier(current) ? { root: current.text, rootNode: current, members } : null;
};
const makeLexicalBindings = (file) => {
  const scopeBindings = new Map();
  const scopeDeclarations = new Map();
  const declarationScope = new WeakMap();
  const isFunctionScope = (node) => ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node);
  const isLexicalScope = (node) => ts.isSourceFile(node) || isFunctionScope(node) ||
    ts.isBlock(node) || ts.isCaseBlock(node) || ts.isCatchClause(node) || ts.isForStatement(node) ||
    ts.isForInStatement(node) || ts.isForOfStatement(node);
  const containingScope = (node, functionScoped = false) => {
    for (let current = node.parent; current; current = current.parent) {
      if (functionScoped ? (isFunctionScope(current) || ts.isSourceFile(current)) : isLexicalScope(current)) return current;
    }
    return file;
  };
  const addName = (name, scope) => {
    if (ts.isIdentifier(name)) {
      if (!scopeBindings.has(scope)) scopeBindings.set(scope, new Set());
      scopeBindings.get(scope).add(name.text);
      if (!scopeDeclarations.has(scope)) scopeDeclarations.set(scope, new Map());
      const declarations = scopeDeclarations.get(scope);
      if (!declarations.has(name.text)) declarations.set(name.text, new Set());
      declarations.get(name.text).add(name);
      declarationScope.set(name, scope);
      return;
    }
    if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) if (ts.isBindingElement(element)) addName(element.name, scope);
    }
  };
  const visit = (node) => {
    if (ts.isVariableDeclaration(node)) {
      if (ts.isCatchClause(node.parent)) addName(node.name, node.parent);
      else {
        const blockScoped = ts.isVariableDeclarationList(node.parent) && (node.parent.flags & ts.NodeFlags.BlockScoped) !== 0;
        addName(node.name, containingScope(node, !blockScoped));
      }
    } else if (ts.isParameter(node)) {
      addName(node.name, containingScope(node, true));
    } else if (ts.isFunctionDeclaration(node) && node.name) {
      addName(node.name, containingScope(node));
    } else if (ts.isFunctionExpression(node) && node.name) {
      addName(node.name, node);
    } else if (ts.isClassDeclaration(node) && node.name) {
      addName(node.name, containingScope(node));
    } else if (ts.isImportClause(node) && node.name) {
      addName(node.name, file);
    } else if (ts.isImportSpecifier(node) || ts.isNamespaceImport(node) || ts.isImportEqualsDeclaration(node)) {
      addName(node.name, file);
    } else if (ts.isCatchClause(node) && node.variableDeclaration) {
      addName(node.variableDeclaration.name, node);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  const isShadowedAt = (node, name) => {
    for (let current = node.parent; current; current = current.parent) {
      if (scopeBindings.get(current)?.has(name)) return true;
    }
    return false;
  };
  const declarationsAt = (node, name) => {
    for (let current = node.parent; current; current = current.parent) {
      const declarations = scopeDeclarations.get(current)?.get(name);
      if (declarations?.size) return declarations;
    }
    return null;
  };
  return { scopeBindings, declarationScope, isShadowedAt, containingScope, declarationsAt };
};
const normalizeGlobalParts = (root, members, wrapperUsed) => {
  const possibleReserved = rawUniverse.defaultDisposition.reservedRoots.some((reserved) =>
    reserved === root || reserved.startsWith(`${root}.`));
  if (!possibleReserved) return null;
  const reservedRoots = [...rawUniverse.defaultDisposition.reservedRoots]
    .sort((left, right) => right.split(".").length - left.split(".").length);
  const chainParts = [root, ...members.map((member) => member.value)];
  for (const reserved of reservedRoots) {
    const parts = reserved.split(".");
    if (!parts.every((part, index) => chainParts[index] === part)) continue;
    const hasTerminal = chainParts.length > parts.length;
    if (hasTerminal && chainParts[parts.length] === null) return { root: reserved, members, error: "computed-effect-selector" };
    return {
      root: reserved,
      member: hasTerminal ? chainParts[parts.length] : null,
      extraMemberCount: Math.max(0, chainParts.length - parts.length - 1),
      members,
      form: members.some((member) => member.form === "computed-literal") ? "computed-literal-member" : "global-member",
    };
  }
  if (members.some((member) => member.value === null)) return { root, members, error: "computed-effect-selector" };
  return wrapperUsed ? { error: "unresolved-global-alias" } : null;
};
const normalizedGlobal = (node, isShadowedAt) => {
  const chain = expressionChain(node);
  if (!chain) return null;
  const wrappers = new Set(rawUniverse.globalAliasGrammar.wrappers);
  let { root } = chain;
  const members = [...chain.members];
  if (wrappers.has(root)) {
    const first = members.shift();
    if (!first || first.value === null || wrappers.has(first.value)) return { error: "invalid-global-wrapper" };
    if (!rawUniverse.defaultDisposition.reservedRoots.some((reserved) =>
        reserved === first.value || reserved.startsWith(`${first.value}.`))) return null;
    if (isShadowedAt(chain.rootNode, root)) return { error: "shadowed-global-alias" };
    root = first.value;
  } else if (isShadowedAt(chain.rootNode, root)) {
    return null;
  }
  return normalizeGlobalParts(root, members, wrappers.has(chain.root));
};
const classifyGlobal = (normalized) => {
  if (!normalized || normalized.error) return null;
  for (const entry of rawUniverse.globalMembers) {
    if (entry.root !== normalized.root || !normalized.member || !entry.members.includes(normalized.member)) continue;
    return entry.memberClasses?.[normalized.member] ?? entry.classes;
  }
  for (const entry of rawUniverse.globalRoots) {
    if (!entry.roots.includes(normalized.root)) continue;
    return entry.anyAccess ?? entry.constructOrCall ?? entry.call;
  }
  return null;
};

const rawInventoryPaths = new Set(presentMembers.filter((path) =>
  ["production", "direct-tool"].includes(categoryOf(path)) && candidateGraph.texts.has(path)));
const assignmentPredecessorSnapshot = candidateWorkId === null
  ? null
  : loadTree(evidenceBinding.predecessorReport?.commit ?? config.baselineCommit);
for (const path of candidateGraph.paths.filter((candidatePath) => rawInventoryPaths.has(candidatePath))) {
  const file = candidateGraph.sourceFile(path);
  if (file.parseDiagnostics.length) throw new Error(`UNPARSED_FROZEN_SOURCE:${path}`);
  const assignmentComparisonNodes = new WeakSet();
  const aliasInitializerComparisonNodes = new WeakSet();
  const assignmentComparisonPath = workBlocks
    .find((block) => block.work === candidateWorkId)
    ?.production.some((entry) => entry.path === path) === true;
  if (assignmentComparisonPath) {
    const predecessorBytes = assignmentPredecessorSnapshot?.bytesAt(path);
    const candidateBytes = candidate.bytesAt(path);
    if (!predecessorBytes?.equals(candidateBytes)) {
      const predecessorCounts = new Map();
      const predecessorAliasInitializerCounts = new Map();
      const localRolePathFor = (node, owner) => {
        const localRolePath = [];
        for (let current = node; current.parent && current !== owner.declarationNode; current = current.parent) {
          const siblings = directChildren(current.parent);
          localRolePath.unshift(
            `${ts.SyntaxKind[current.parent.kind]}[${siblings.indexOf(current)}]:${ts.SyntaxKind[current.kind]}`);
          if (current.parent === owner.declarationNode) break;
        }
        return localRolePath;
      };
      const assignmentKey = (node, sourceFile) => {
        const owner = qualifiedOwner(node, sourceFile, path);
        return canonicalJson({
          operator: node.operatorToken.kind,
          owner: owner.qualifiedDeclarationId,
          localRolePath: localRolePathFor(node, owner),
          normalizedText: normalizedNodeText(node, sourceFile),
        });
      };
      const aliasInitializerKey = (node, sourceFile) => {
        const owner = qualifiedOwner(node, sourceFile, path);
        return canonicalJson({
          kind: "variable-initializer",
          owner: owner.qualifiedDeclarationId,
          localRolePath: localRolePathFor(node, owner),
          normalizedText: normalizedNodeText(node, sourceFile),
        });
      };
      const collectPredecessorAssignments = (node, sourceFile) => {
        if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
          const key = assignmentKey(node, sourceFile);
          predecessorCounts.set(key, (predecessorCounts.get(key) ?? 0) + 1);
        }
        if (ts.isVariableDeclaration(node) && node.initializer) {
          const key = aliasInitializerKey(node, sourceFile);
          predecessorAliasInitializerCounts.set(key, (predecessorAliasInitializerCounts.get(key) ?? 0) + 1);
        }
        ts.forEachChild(node, (child) => collectPredecessorAssignments(child, sourceFile));
      };
      if (predecessorBytes) {
        const predecessorFile = ts.createSourceFile(path, decodeUtf8(predecessorBytes, path), ts.ScriptTarget.Latest, true,
          path.endsWith(".tsx") ? ts.ScriptKind.TSX : path.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS);
        if (predecessorFile.parseDiagnostics.length) throw new Error(`UNPARSED_PREDECESSOR_SOURCE:${path}`);
        collectPredecessorAssignments(predecessorFile, predecessorFile);
      }
      const classifyCandidateAssignments = (node) => {
        if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
          const key = assignmentKey(node, file);
          const remaining = predecessorCounts.get(key) ?? 0;
          if (remaining > 0) predecessorCounts.set(key, remaining - 1);
          else assignmentComparisonNodes.add(node);
        }
        if (ts.isVariableDeclaration(node) && node.initializer) {
          const key = aliasInitializerKey(node, file);
          const remaining = predecessorAliasInitializerCounts.get(key) ?? 0;
          if (remaining > 0) predecessorAliasInitializerCounts.set(key, remaining - 1);
          else aliasInitializerComparisonNodes.add(node);
        }
        ts.forEachChild(node, classifyCandidateAssignments);
      };
      classifyCandidateAssignments(file);
    }
  }
  const lexical = makeLexicalBindings(file);
  const bindingIdentityByDeclaration = new WeakMap();
  const declarationNodes = new Set();
  const bind = (identity, node) => {
    if (!identity?.classes?.length) return;
    bindingIdentityByDeclaration.set(node, identity);
    declarationNodes.add(node);
  };
  const resolvedBindingAt = (identifier) => {
    const declarations = lexical.declarationsAt(identifier, identifier.text);
    if (!declarations) return null;
    for (const declaration of declarations) {
      const identity = bindingIdentityByDeclaration.get(declaration);
      if (identity) return identity;
    }
    return null;
  };
  const commonJsLoader = (node) => {
    if (!ts.isCallExpression(node)) return null;
    let form = null;
    if (ts.isIdentifier(node.expression) && node.expression.text === "require" &&
        !lexical.isShadowedAt(node.expression, "require")) form = "require-call";
    if ((ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) &&
        ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "module" &&
        staticMember(node.expression)?.value === "require" &&
        !lexical.isShadowedAt(node.expression.expression, "module")) form = "module-require-call";
    if (!form || !node.arguments[0] || !ts.isStringLiteralLike(node.arguments[0])) return null;
    return { specifier: node.arguments[0].text, form };
  };
  const collectBindings = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (node.importClause?.name) {
        const classes = classesForModuleExport(specifier, "default");
        if (acceptedEffectPackages.has(packageRoot(specifier)) && !classes) addViolation("UNKNOWN_DEPENDENCY_EFFECT_EXPORT", path, node.importClause.name, `${specifier}#default`);
        bind({ specifier, exported: "default", classes }, node.importClause.name);
      }
      const named = node.importClause?.namedBindings;
      if (named && ts.isNamespaceImport(named)) bind({ specifier, exported: "*", classes: moduleRootClasses.get(specifier), namespace: true }, named.name);
      if (named && ts.isNamedImports(named)) for (const element of named.elements) {
        const exported = element.propertyName?.text ?? element.name.text;
        const classes = classesForModuleExport(specifier, exported);
        if (acceptedEffectPackages.has(packageRoot(specifier)) && !classes) addViolation("UNKNOWN_DEPENDENCY_EFFECT_EXPORT", path, element, `${specifier}#${exported}`);
        bind({ specifier, exported, classes }, element.name);
      }
      if (specifier.endsWith(".node")) addViolation("UNKNOWN_NATIVE_ADDON", path, node, specifier);
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
      const specifier = node.moduleReference.expression.text;
      bind({ specifier, exported: "*", classes: moduleRootClasses.get(specifier), namespace: true }, node.name);
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (!node.exportClause && moduleRootClasses.has(specifier)) addViolation("RAW_BINDING_EXPORTED", path, node, specifier);
      if (node.exportClause && ts.isNamedExports(node.exportClause)) for (const element of node.exportClause.elements) {
        const exported = element.propertyName?.text ?? element.name.text;
        if (classesForModuleExport(specifier, exported)?.length) addViolation("RAW_BINDING_EXPORTED", path, element, `${specifier}#${exported}`);
      }
    }
    if (ts.isVariableDeclaration(node) && node.initializer) {
      let specifier = null;
      if (ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === "require" && node.initializer.arguments[0] && ts.isStringLiteralLike(node.initializer.arguments[0])) specifier = node.initializer.arguments[0].text;
      if (ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression) &&
          ts.isIdentifier(node.initializer.expression.expression) && node.initializer.expression.expression.text === "module" &&
          node.initializer.expression.name.text === "require" && node.initializer.arguments[0] && ts.isStringLiteralLike(node.initializer.arguments[0])) specifier = node.initializer.arguments[0].text;
      if (ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) &&
          resolvedBindingAt(node.initializer.expression)?.loader && node.initializer.arguments[0] &&
          ts.isStringLiteralLike(node.initializer.arguments[0])) specifier = node.initializer.arguments[0].text;
      if (specifier && ts.isIdentifier(node.name)) bind({ specifier, exported: "*", classes: moduleRootClasses.get(specifier), namespace: true }, node.name);
      if (specifier && ts.isObjectBindingPattern(node.name)) for (const element of node.name.elements) {
        if (!ts.isIdentifier(element.name)) continue;
        const exported = element.propertyName && (ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName)) ? element.propertyName.text : element.name.text;
        const classes = classesForModuleExport(specifier, exported);
        if ((acceptedEffectPackages.has(packageRoot(specifier)) || rawUniverse.moduleSelectors.some((entry) => entry.specifier === specifier)) && !classes) {
          addViolation("UNKNOWN_MODULE_EFFECT_EXPORT", path, element, `${specifier}#${exported}`);
        }
        bind({ specifier, exported, classes }, element.name);
      }
      if (ts.isIdentifier(node.name) && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression)) {
        const creator = resolvedBindingAt(node.initializer.expression);
        if (creator?.exported === "createRequire") bind({ specifier: "createRequire", exported: "result", classes: ["ambient-loader"], loader: true }, node.name);
      }
    }
    ts.forEachChild(node, collectBindings);
  };
  collectBindings(file);
  const rawPatternDiagnostics = new WeakSet();
  const addRawPatternViolation = (code, node, detail) => {
    if (rawPatternDiagnostics.has(node)) return;
    rawPatternDiagnostics.add(node);
    addViolation(code, path, node, detail);
  };
  const bindResolvedRawPattern = (base, name) => {
    if (!base?.classes?.length) return false;
    if (ts.isArrayBindingPattern(name)) {
      addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", name, {
        specifier: base.specifier,
        reason: "array-raw-destructure",
      });
      return false;
    }
    if (!ts.isObjectBindingPattern(name)) return false;
    if (name.elements.length === 0) {
      addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", name, {
        specifier: base.specifier,
        reason: "empty-raw-destructure",
      });
      return false;
    }
    let changed = false;
    for (const element of name.elements) {
      if (element.dotDotDotToken) {
        addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", element, {
          specifier: base.specifier,
          reason: "rest-raw-destructure",
        });
        continue;
      }
      let member = null;
      let form = "destructure-binding";
      if (!element.propertyName && ts.isIdentifier(element.name)) member = element.name.text;
      else if (element.propertyName && (ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName))) {
        member = element.propertyName.text;
      } else if (element.propertyName && ts.isComputedPropertyName(element.propertyName) &&
          (ts.isStringLiteralLike(element.propertyName.expression) || ts.isNoSubstitutionTemplateLiteral(element.propertyName.expression))) {
        member = element.propertyName.expression.text;
        form = "computed-literal-member";
      } else if (element.propertyName && ts.isComputedPropertyName(element.propertyName)) {
        addRawPatternViolation("COMPUTED_EFFECT_SELECTOR", element.propertyName, element.propertyName.getText(file));
        continue;
      } else {
        addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", element, {
          specifier: base.specifier,
          reason: "nested-raw-destructure-without-selector",
        });
        continue;
      }
      if (!ts.isIdentifier(element.name)) {
        addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", element.name, {
          specifier: base.specifier,
          exported: member,
          reason: "nested-raw-destructure",
        });
        continue;
      }
      if (element.initializer && !base.namespace) {
        addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", element, {
          specifier: base.specifier,
          exported: base.exported,
          reason: "default-non-namespace-raw-destructure",
        });
        continue;
      }
      let identity = { ...base, form };
      if (base.namespace) {
        const classes = classesForModuleExport(base.specifier, member);
        if (!classes) {
          addRawPatternViolation("UNKNOWN_MODULE_EFFECT_EXPORT", element, `${base.specifier}#${member}`);
          continue;
        }
        identity = { specifier: base.specifier, exported: member, classes, form };
      }
      if (bindingIdentityByDeclaration.has(element.name)) continue;
      bind(identity, element.name);
      changed = true;
    }
    return changed;
  };
  const declarationIdentifiers = (name, identifiers = []) => {
    if (ts.isIdentifier(name)) identifiers.push(name);
    else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) declarationIdentifiers(element.name, identifiers);
      }
    }
    return identifiers;
  };
  const assignmentTargetIdentifiers = (node, identifiers = []) => {
    if (ts.isParenthesizedExpression(node)) return assignmentTargetIdentifiers(node.expression, identifiers);
    if (ts.isIdentifier(node)) identifiers.push(node);
    else if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property)) assignmentTargetIdentifiers(property.initializer, identifiers);
        else if (ts.isShorthandPropertyAssignment(property)) identifiers.push(property.name);
        else if (ts.isSpreadAssignment(property)) assignmentTargetIdentifiers(property.expression, identifiers);
      }
    } else if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) if (!ts.isOmittedExpression(element)) assignmentTargetIdentifiers(element, identifiers);
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      assignmentTargetIdentifiers(node.left, identifiers);
    }
    return identifiers;
  };
  const assignmentWritesByDeclaration = new Map();
  const recordAssignmentWrite = (identifier, node, kind, declaration = null) => {
    const declarations = declaration ? new Set([declaration]) : lexical.declarationsAt(identifier, identifier.text);
    if (!declarations || declarations.size !== 1) return;
    const target = [...declarations][0];
    if (!assignmentWritesByDeclaration.has(target)) assignmentWritesByDeclaration.set(target, []);
    assignmentWritesByDeclaration.get(target).push({ node, kind });
  };
  const collectAssignmentWrites = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      for (const identifier of declarationIdentifiers(node.name)) recordAssignmentWrite(identifier, node, "declaration", identifier);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const kind = node.operatorToken.kind === ts.SyntaxKind.EqualsToken ? "equals" : "compound";
      for (const identifier of assignmentTargetIdentifiers(node.left)) recordAssignmentWrite(identifier, node, kind);
    }
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
        [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) {
      for (const identifier of assignmentTargetIdentifiers(node.operand)) recordAssignmentWrite(identifier, node, "update");
    }
    ts.forEachChild(node, collectAssignmentWrites);
  };
  collectAssignmentWrites(file);
  let assignmentScopedIdentityForExpression = () => null;
  const rawIdentityForGlobalAssignmentAtom = (expression) => {
    const normalized = normalizedGlobal(expression, lexical.isShadowedAt);
    const normalizedClasses = classifyGlobal(normalized);
    if (normalizedClasses) return {
      specifier: normalized.root,
      exported: normalized.member ?? "*",
      classes: normalizedClasses,
      form: normalized.form ?? "global-identifier",
    };
    if (!ts.isIdentifier(expression) || lexical.isShadowedAt(expression, expression.text)) return null;
    const directRoot = rawUniverse.globalRoots.find((entry) => entry.roots.includes(expression.text));
    const classes = directRoot?.anyAccess ?? directRoot?.constructOrCall ?? directRoot?.call;
    return classes ? {
      specifier: expression.text,
      exported: "*",
      classes,
      form: "global-identifier",
    } : null;
  };
  const rawIdentityForAssignmentAtom = (expression) => {
    if (ts.isIdentifier(expression)) {
      const binding = resolvedBindingAt(expression);
      if (binding) return binding;
    }
    if ((ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) &&
        ts.isIdentifier(expression.expression)) {
      const base = resolvedBindingAt(expression.expression);
      if (base) {
        const member = staticMember(expression);
        if (!member || member.value === null) return null;
        if (!base.namespace) return { ...base, form: member.form };
        const classes = classesForModuleExport(base.specifier, member.value);
        return classes ? { specifier: base.specifier, exported: member.value, classes, form: member.form } : null;
      }
    }
    const directLoader = commonJsLoader(expression);
    if (directLoader) {
      const classes = classesForModuleExport(directLoader.specifier, "*") ?? moduleRootClasses.get(directLoader.specifier);
      return classes ? { ...directLoader, exported: "*", classes, namespace: true } : null;
    }
    if ((ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) &&
        ts.isCallExpression(expression.expression)) {
      const loader = commonJsLoader(expression.expression);
      const member = staticMember(expression);
      if (!loader || !member || member.value === null) return null;
      const classes = classesForModuleExport(loader.specifier, member.value);
      return classes ? { specifier: loader.specifier, exported: member.value, classes, form: member.form } : null;
    }
    const scoped = assignmentScopedIdentityForExpression(expression);
    if (scoped?.kind === "terminal") return {
      specifier: scoped.specifier,
      exported: scoped.exported,
      classes: scoped.classes,
      form: scoped.form,
    };
    if (scoped?.kind === "global-root") {
      const classes = classifyGlobal({ root: scoped.root, member: null });
      if (classes) return {
        specifier: scoped.root,
        exported: "*",
        classes,
        form: "global-identifier",
      };
    }
    return rawIdentityForGlobalAssignmentAtom(expression);
  };
  const isFiniteRawExpressionAtom = (expression) => ts.isIdentifier(expression) ||
    ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression) ||
    ts.isCallExpression(expression);
  const expressionContainsRaw = (expression, extensionsEnabled, identityForAtom) => {
    if (extensionsEnabled && isFiniteTransparentExpressionWrapper(expression)) {
      return expressionContainsRaw(expression.expression, extensionsEnabled, identityForAtom);
    }
    if (isFiniteRawExpressionAtom(expression) && identityForAtom(expression)) return true;
    let containsRaw = false;
    ts.forEachChild(expression, (child) => {
      if (!containsRaw && !ts.isTypeNode(child) &&
          expressionContainsRaw(child, extensionsEnabled, identityForAtom)) containsRaw = true;
    });
    return containsRaw;
  };
  const finiteRawExpressionResult = (expression, extensionsEnabled, identityForAtom) => {
    if (ts.isParenthesizedExpression(expression) ||
        (extensionsEnabled && isFiniteTransparentExpressionWrapper(expression))) {
      return finiteRawExpressionResult(expression.expression, extensionsEnabled, identityForAtom);
    }
    if (extensionsEnabled && ts.isConditionalExpression(expression)) {
      const whenTrue = finiteRawExpressionResult(expression.whenTrue, extensionsEnabled, identityForAtom);
      const whenFalse = finiteRawExpressionResult(expression.whenFalse, extensionsEnabled, identityForAtom);
      const conditionContainsRaw = expressionContainsRaw(expression.condition, extensionsEnabled, identityForAtom);
      if (!conditionContainsRaw && whenTrue.identity && whenFalse.identity &&
          canonicalJson(whenTrue.identity) === canonicalJson(whenFalse.identity)) {
        return { identity: whenTrue.identity, containsRaw: true };
      }
      return {
        identity: null,
        containsRaw: conditionContainsRaw || whenTrue.containsRaw || whenFalse.containsRaw,
      };
    }
    if (isFiniteRawExpressionAtom(expression)) {
      const directIdentity = identityForAtom(expression);
      if (directIdentity) return { identity: directIdentity, containsRaw: true };
    }
    return {
      identity: null,
      containsRaw: extensionsEnabled && expressionContainsRaw(expression, extensionsEnabled, identityForAtom),
    };
  };
  const rawAssignmentExpressionResult = (expression, extensionsEnabled) =>
    finiteRawExpressionResult(expression, extensionsEnabled, rawIdentityForAssignmentAtom);
  const containingVariableDeclaration = (declaration) => {
    for (let current = declaration.parent; current; current = current.parent) {
      if (ts.isVariableDeclaration(current)) return current;
      if (ts.isStatement(current) || ts.isFunctionLike(current)) return null;
    }
    return null;
  };
  const assignmentTargetDeclaration = (identifier, witness) => {
    const declarations = lexical.declarationsAt(identifier, identifier.text);
    if (!declarations || declarations.size !== 1) {
      addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", witness, {
        name: identifier.text,
        reason: "unresolved-assignment-target",
      });
      return null;
    }
    const declaration = [...declarations][0];
    const variableDeclaration = containingVariableDeclaration(declaration);
    if (!variableDeclaration || !ts.isVariableDeclarationList(variableDeclaration.parent) ||
        !ts.isVariableStatement(variableDeclaration.parent.parent)) {
      addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", witness, {
        name: identifier.text,
        reason: "unsupported-assignment-target-declaration",
      });
      return null;
    }
    const writes = assignmentWritesByDeclaration.get(declaration) ?? [];
    if (writes.length !== 1 || writes[0].kind !== "equals" || writes[0].node !== witness) {
      addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", witness, {
        name: identifier.text,
        reason: "non-single-assignment-target",
        writeKinds: writes.map((write) => write.kind),
      });
      return null;
    }
    return declaration;
  };
  const assignmentProperty = (property) => {
    if (ts.isShorthandPropertyAssignment(property)) {
      if (property.objectAssignmentInitializer) return null;
      return { member: property.name.text, target: property.name, form: "destructure-assignment" };
    }
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.initializer)) return null;
    if (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)) {
      return { member: property.name.text, target: property.initializer, form: "destructure-assignment" };
    }
    if (ts.isComputedPropertyName(property.name) &&
        (ts.isStringLiteralLike(property.name.expression) || ts.isNoSubstitutionTemplateLiteral(property.name.expression))) {
      return { member: property.name.expression.text, target: property.initializer, form: "computed-literal-member" };
    }
    return null;
  };
  const bindResolvedRawAssignment = (left, base, witness) => {
    if (ts.isParenthesizedExpression(left)) return bindResolvedRawAssignment(left.expression, base, witness);
    if (ts.isIdentifier(left)) {
      const declaration = assignmentTargetDeclaration(left, witness);
      if (!declaration || bindingIdentityByDeclaration.has(declaration)) return false;
      bind(base, declaration);
      return true;
    }
    if (!ts.isObjectLiteralExpression(left) || left.properties.length === 0) {
      addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", witness, {
        reason: "unsupported-raw-assignment-target",
      });
      return false;
    }
    let changed = false;
    for (const property of left.properties) {
      const selected = assignmentProperty(property);
      if (!selected) {
        addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", property, {
          reason: "unsupported-raw-assignment-pattern",
        });
        continue;
      }
      let identity = { ...base, form: selected.form };
      if (base.namespace) {
        const classes = classesForModuleExport(base.specifier, selected.member);
        if (!classes) {
          addRawPatternViolation("UNKNOWN_MODULE_EFFECT_EXPORT", property, `${base.specifier}#${selected.member}`);
          continue;
        }
        identity = { specifier: base.specifier, exported: selected.member, classes, form: selected.form };
      }
      const declaration = assignmentTargetDeclaration(selected.target, witness);
      if (!declaration || bindingIdentityByDeclaration.has(declaration)) continue;
      bind(identity, declaration);
      changed = true;
    }
    return changed;
  };
  const propagateRawAssignments = () => {
    let aliasChanged = true;
    while (aliasChanged) {
      aliasChanged = false;
      const visit = (node) => {
        if (ts.isVariableDeclaration(node) && node.initializer) {
          const initializerBinding = ts.isIdentifier(node.initializer) ? resolvedBindingAt(node.initializer) : null;
          if (ts.isIdentifier(node.name) && initializerBinding && !bindingIdentityByDeclaration.has(node.name)) {
            bind(initializerBinding, node.name); aliasChanged = true;
          }
          if ((ts.isObjectBindingPattern(node.name) || ts.isArrayBindingPattern(node.name)) &&
              initializerBinding && bindResolvedRawPattern(initializerBinding, node.name)) aliasChanged = true;
          if (ts.isIdentifier(node.name) && (ts.isPropertyAccessExpression(node.initializer) || ts.isElementAccessExpression(node.initializer)) &&
              ts.isIdentifier(node.initializer.expression) && resolvedBindingAt(node.initializer.expression)?.namespace) {
            const member = staticMember(node.initializer);
            if (member.value === null) addViolation("COMPUTED_EFFECT_SELECTOR", path, node.initializer, node.initializer.getText(file));
            else if (!bindingIdentityByDeclaration.has(node.name)) {
              const base = resolvedBindingAt(node.initializer.expression);
              bind({ specifier: base.specifier, exported: member.value, classes: classesForModuleExport(base.specifier, member.value), form: member.form }, node.name);
              aliasChanged = true;
            }
          }
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
          const extensionsEnabled = assignmentComparisonNodes.has(node);
          const rawAssignment = rawAssignmentExpressionResult(node.right, extensionsEnabled);
          if (rawAssignment.identity) {
            if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
              if (bindResolvedRawAssignment(node.left, rawAssignment.identity, node)) aliasChanged = true;
            } else {
              addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", node, {
                reason: "compound-raw-assignment",
              });
            }
          } else if (rawAssignment.containsRaw) {
            addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", node, {
              reason: "unsupported-raw-assignment-rhs",
              rhsKind: ts.SyntaxKind[node.right.kind],
            });
          } else if (!extensionsEnabled && ts.isBinaryExpression(node.right) &&
              node.right.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
              rawAssignmentExpressionResult(node.right.right, extensionsEnabled).identity) {
            addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", node, {
              reason: "nested-raw-assignment-rhs",
            });
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(file);
    }
    for (const [declaration, writes] of assignmentWritesByDeclaration) {
      if (!bindingIdentityByDeclaration.has(declaration) || writes.length === 0) continue;
      const variableDeclaration = containingVariableDeclaration(declaration);
      const validDeclarationWrite = writes.length === 1 && writes[0].kind === "declaration" &&
        variableDeclaration?.initializer;
      const validAssignmentWrite = writes.length === 1 && writes[0].kind === "equals" &&
        variableDeclaration && !variableDeclaration.initializer;
      if (!validDeclarationWrite && !validAssignmentWrite) {
        const witness = writes.find((write) => !["declaration", "equals"].includes(write.kind)) ?? writes[1] ?? writes[0];
        addRawPatternViolation("RAW_ALIAS_WRITE_UNKNOWN", witness.node, {
          name: declaration.text,
          reason: "raw-declaration-write-cardinality",
          writeKinds: writes.map((write) => write.kind),
        });
      }
    }
  };
  const scopedAliases = new Map();
  const scopedAliasDeclarations = new Set();
  const wrappers = new Set(rawUniverse.globalAliasGrammar.wrappers);
  const reservedRoots = new Set(rawUniverse.defaultDisposition.reservedRoots);
  const reservedPrefix = (value) => [...reservedRoots].some((reserved) =>
    reserved === value || reserved.startsWith(`${value}.`));
  const bindingScopeFor = (identifier) => {
    for (let current = identifier.parent; current; current = current.parent) {
      if (lexical.scopeBindings.get(current)?.has(identifier.text)) return current;
    }
    return null;
  };
  const bindScopedAliasAt = (scope, name, identity, node) => {
    if (!scope || !identity) return false;
    if (!scopedAliases.has(scope)) scopedAliases.set(scope, new Map());
    const aliases = scopedAliases.get(scope);
    if (aliases.has(name)) return false;
    aliases.set(name, identity);
    scopedAliasDeclarations.add(node);
    return true;
  };
  const bindScopedAlias = (nameNode, identity) => ts.isIdentifier(nameNode) &&
    bindScopedAliasAt(lexical.declarationScope.get(nameNode), nameNode.text, identity, nameNode);
  const resolveScopedAlias = (identifier) => {
    const scope = bindingScopeFor(identifier);
    return scope ? scopedAliases.get(scope)?.get(identifier.text) ?? null : null;
  };
  const normalizedScopedGlobal = (node) => {
    const chain = expressionChain(node);
    if (!chain) return null;
    const identity = resolveScopedAlias(chain.rootNode);
    if (!identity || identity.kind === "terminal") return null;
    const members = [...chain.members];
    if (identity.kind === "wrapper") {
      const first = members.shift();
      if (!first || first.value === null || wrappers.has(first.value)) return { error: "invalid-global-wrapper" };
      return normalizeGlobalParts(first.value, members, true);
    }
    return normalizeGlobalParts(identity.root, members, false);
  };
  const identityForNormalizedGlobal = (normalized) => {
    if (!normalized || normalized.error || normalized.extraMemberCount > 0) return null;
    if (!normalized.member) return { kind: "global-root", root: normalized.root };
    const classes = classifyGlobal(normalized);
    return classes ? {
      kind: "terminal",
      specifier: normalized.root,
      exported: normalized.member,
      classes,
      form: normalized.form ?? "global-member",
    } : null;
  };
  let identityForExpression = () => null;
  const identityForExpressionAtom = (expression) => {
    if (ts.isIdentifier(expression)) {
      const scoped = resolveScopedAlias(expression);
      if (scoped) return scoped;
      if (wrappers.has(expression.text) && !lexical.isShadowedAt(expression, expression.text)) return { kind: "wrapper" };
    }
    if (ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      const normalized = normalizedScopedGlobal(expression) ?? normalizedGlobal(expression, lexical.isShadowedAt);
      const identity = identityForNormalizedGlobal(normalized);
      if (identity) return identity;
      const directGlobal = rawIdentityForGlobalAssignmentAtom(expression);
      return directGlobal ? { kind: "terminal", ...directGlobal } : null;
    }
    return null;
  };
  const scopedAliasExpressionResult = (expression, extensionsEnabled = false) =>
    finiteRawExpressionResult(expression, extensionsEnabled,
      (atom) => identityForExpressionAtom(atom));
  identityForExpression = (expression, extensionsEnabled = false) =>
    scopedAliasExpressionResult(expression, extensionsEnabled).identity;
  const identityForMember = (base, member, form) => {
    if (!base || member === null || base.kind === "terminal") return null;
    if (base.kind === "wrapper") {
      if (!reservedPrefix(member) || wrappers.has(member)) return null;
      return { kind: "global-root", root: member };
    }
    const combined = `${base.root}.${member}`;
    if (reservedPrefix(combined)) return { kind: "global-root", root: combined };
    const classes = classifyGlobal({ root: base.root, member });
    return classes ? { kind: "terminal", specifier: base.root, exported: member, classes, form } : null;
  };
  const aliasDeclarations = [];
  const aliasWrites = [];
  const targetIdentifiers = (node, identifiers = []) => {
    if (ts.isIdentifier(node)) identifiers.push(node);
    else if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const chain = expressionChain(node);
      if (chain) identifiers.push(chain.rootNode);
    } else if (ts.isParenthesizedExpression(node)) targetIdentifiers(node.expression, identifiers);
    else if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) if (!ts.isOmittedExpression(element)) targetIdentifiers(element, identifiers);
    } else if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property)) targetIdentifiers(property.initializer, identifiers);
        else if (ts.isShorthandPropertyAssignment(property)) identifiers.push(property.name);
        else if (ts.isSpreadAssignment(property)) targetIdentifiers(property.expression, identifiers);
      }
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      targetIdentifiers(node.left, identifiers);
    }
    return identifiers;
  };
  const addAliasWrite = (identifier, node, kind, rhs = null) => {
    const scope = bindingScopeFor(identifier) ?? lexical.declarationScope.get(identifier);
    aliasWrites.push({ scope, name: identifier.text, node, kind, rhs });
  };
  const collectAliasDeclarations = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      aliasDeclarations.push(node);
      for (const identifier of targetIdentifiers(node.name)) addAliasWrite(identifier, node, "declaration", node.initializer);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const simple = node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left);
      for (const identifier of targetIdentifiers(node.left)) {
        addAliasWrite(identifier, node, simple ? "assignment" :
          ts.isIdentifier(node.left) ? "compound" :
          (ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left)) ? "property" : "destructure",
        node.right);
      }
    }
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
        [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) {
      for (const identifier of targetIdentifiers(node.operand)) addAliasWrite(identifier, node, "update");
    }
    ts.forEachChild(node, collectAliasDeclarations);
  };
  collectAliasDeclarations(file);
  const aliasWriteExtensionsEnabled = (write) => ts.isVariableDeclaration(write.node)
    ? aliasInitializerComparisonNodes.has(write.node)
    : assignmentComparisonNodes.has(write.node);
  let scopedAliasesChanged = true;
  while (scopedAliasesChanged) {
    scopedAliasesChanged = false;
    for (const declaration of aliasDeclarations) {
      const base = identityForExpression(declaration.initializer,
        aliasInitializerComparisonNodes.has(declaration));
      if (!base) continue;
      if (ts.isIdentifier(declaration.name)) {
        if (bindScopedAlias(declaration.name, base)) scopedAliasesChanged = true;
        continue;
      }
      if (!ts.isObjectBindingPattern(declaration.name)) continue;
      for (const element of declaration.name.elements) {
        if (!ts.isIdentifier(element.name)) continue;
        let member = element.name.text;
        let form = "destructure-binding";
        if (element.propertyName) {
          if (ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName)) member = element.propertyName.text;
          else if (ts.isComputedPropertyName(element.propertyName) &&
              (ts.isStringLiteralLike(element.propertyName.expression) || ts.isNoSubstitutionTemplateLiteral(element.propertyName.expression))) {
            member = element.propertyName.expression.text;
            form = "computed-literal-member";
          } else continue;
        }
        if (bindScopedAlias(element.name, identityForMember(base, member, form))) scopedAliasesChanged = true;
      }
    }
    for (const write of aliasWrites) {
      if (write.kind !== "assignment") continue;
      const identity = identityForExpression(write.rhs, aliasWriteExtensionsEnabled(write));
      if (identity && bindScopedAliasAt(write.scope, write.name, identity, write.node.left)) scopedAliasesChanged = true;
    }
  }
  assignmentScopedIdentityForExpression = identityForExpression;
  propagateRawAssignments();
  const aliasWriteViolations = new Set();
  const rejectAliasWrite = (write, detail) => {
    const key = `${write.node.pos}\0${write.name}`;
    if (aliasWriteViolations.has(key)) return;
    aliasWriteViolations.add(key);
    addViolation("RAW_ALIAS_WRITE_UNKNOWN", path, write.node, detail);
  };
  for (const write of aliasWrites) {
    const rhsResult = write.rhs
      ? scopedAliasExpressionResult(write.rhs, aliasWriteExtensionsEnabled(write))
      : { identity: null, containsRaw: false };
    if (["declaration", "assignment"].includes(write.kind) && rhsResult.containsRaw && !rhsResult.identity) {
      rejectAliasWrite(write, {
        name: write.name,
        writeKinds: [write.kind],
        reason: "unsupported-raw-alias-initializer",
      });
      continue;
    }
    if (!write.scope && ["declaration", "assignment"].includes(write.kind) && rhsResult.identity) {
      rejectAliasWrite(write, { name: write.name, writeKinds: [write.kind], unresolvedBinding: true });
      continue;
    }
    if (["declaration", "assignment"].includes(write.kind) || !rhsResult.identity) continue;
    rejectAliasWrite(write, { name: write.name, writeKinds: [write.kind] });
  }
  for (const [scope, aliases] of scopedAliases) for (const [name] of aliases) {
    const writes = aliasWrites.filter((write) => write.scope === scope && write.name === name);
    const validSingleWrite = writes.length === 1 && ["declaration", "assignment"].includes(writes[0].kind) &&
      identityForExpression(writes[0].rhs, aliasWriteExtensionsEnabled(writes[0]));
    if (!validSingleWrite) {
      const witness = writes.find((write) => !["declaration", "assignment"].includes(write.kind) ||
        !write.rhs || !identityForExpression(write.rhs, aliasWriteExtensionsEnabled(write))) ?? writes[1] ?? writes[0];
      if (witness) rejectAliasWrite(witness, { name, writeKinds: writes.map((write) => write.kind) });
      else addViolation("RAW_ALIAS_WRITE_UNKNOWN", path, file, { name, writeKinds: [] });
    }
  }
  const rejectExportedRawDeclaration = (declaration, witness, detail) => {
    if (bindingIdentityByDeclaration.has(declaration)) addViolation("RAW_BINDING_EXPORTED", path, witness, detail);
  };
  const bindingPatternIdentifiers = (name, identifiers = []) => {
    if (ts.isIdentifier(name)) identifiers.push(name);
    else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) bindingPatternIdentifiers(element.name, identifiers);
      }
    }
    return identifiers;
  };
  const collectExports = (node) => {
    if (ts.isExportDeclaration(node) && !node.moduleSpecifier && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        const localName = element.propertyName?.text ?? element.name.text;
        const declarations = lexical.declarationsAt(element, localName);
        if (declarations) for (const declaration of declarations) {
          rejectExportedRawDeclaration(declaration, element, element.name.text);
        }
      }
    }
    if ((ts.isVariableStatement(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
        ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          for (const identifier of bindingPatternIdentifiers(declaration.name)) {
            rejectExportedRawDeclaration(identifier, identifier, identifier.text);
          }
        }
      } else if (node.name) {
        rejectExportedRawDeclaration(node.name, node.name, node.name.text);
      }
      const inspectType = (typeNode) => {
        if (ts.isImportTypeNode(typeNode) && ts.isLiteralTypeNode(typeNode.argument) && ts.isStringLiteralLike(typeNode.argument.literal)) {
          const specifier = typeNode.argument.literal.text;
          if (moduleRootClasses.has(specifier) || acceptedEffectPackages.has(packageRoot(specifier))) addViolation("RAW_PUBLIC_TYPE_EXPORTED", path, typeNode, specifier);
        }
        ts.forEachChild(typeNode, inspectType);
      };
      inspectType(node);
    }
    ts.forEachChild(node, collectExports);
  };
  collectExports(file);
  const record = (node, identity, form) => {
    if (!identity?.classes?.length) return;
    const classes = [...new Set(identity.classes)].sort();
    const allowed = allowedClassesByPath.get(path);
    const invalidClasses = classes.filter((classId) => !allowed?.has(classId));
    const site = {
      path,
      line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
      owner: ownerName(node, file),
      resolvedSymbol: `${identity.specifier ?? "global"}#${identity.exported ?? identity.member ?? "*"}`,
      form,
      classes,
    };
    rawIngress.push(site);
    const structural = structuralSiteRecord(node, file, path, identity, form, classes);
    canonicalIngress.push({
      path,
      line: site.line,
      qualifiedLexicalOwnerId: structural.qualifiedLexicalOwnerId,
      declarationKind: structural.declarationKind,
      ownerSymbol: structural.owner.symbol,
      ownerDefaultExport: structural.owner.defaultExport,
      resolvedTerminal: structural.resolvedTerminal,
      sourceForm: structural.sourceForm,
      classes,
      siteId: structural.siteId,
      siteRecord: Object.fromEntries(Object.entries(structural).filter(([key]) => !["siteId", "owner"].includes(key))),
    });
    if (!allowed || invalidClasses.length) addViolation("RAW_EFFECT_OWNER_INVALID", path, node, site);
  };
  const knownEffectModule = (specifier) => moduleRootClasses.has(specifier) ||
    rawUniverse.moduleSelectors.some((entry) => entry.specifier === specifier) ||
    acceptedEffectPackages.has(packageRoot(specifier));
  const recordDirectCommonJs = (node, loader) => {
    const parent = node.parent;
    if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node) {
      const member = staticMember(parent);
      if (!member || member.value === null) {
        addViolation("COMPUTED_EFFECT_SELECTOR", path, parent, parent.getText(file));
        return;
      }
      const classes = classesForModuleExport(loader.specifier, member.value);
      if (!classes && knownEffectModule(loader.specifier)) {
        addViolation("UNKNOWN_MODULE_EFFECT_EXPORT", path, parent, `${loader.specifier}#${member.value}`);
        return;
      }
      record(parent, { specifier: loader.specifier, exported: member.value, classes }, loader.form);
      return;
    }
    if (ts.isVariableDeclaration(parent) && parent.initializer === node) return;
    const classes = classesForModuleExport(loader.specifier, "*") ?? moduleRootClasses.get(loader.specifier);
    if (!classes && knownEffectModule(loader.specifier)) {
      addViolation("UNKNOWN_MODULE_EFFECT_EXPORT", path, node, `${loader.specifier}#*`);
      return;
    }
    record(node, { specifier: loader.specifier, exported: "*", classes }, loader.form);
  };
  const visitUses = (node) => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (!argument || !ts.isStringLiteralLike(argument)) addViolation("COMPUTED_LOADER_TARGET", path, node, node.getText(file));
      else record(node, { specifier: "import", exported: argument.text, classes: ["ambient-loader"] }, "dynamic-import-call");
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["eval", "Function"].includes(node.expression.text) &&
        !lexical.isShadowedAt(node.expression, node.expression.text)) {
      addViolation("FORBIDDEN_AMBIENT_LOADER", path, node, node.expression.text);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "process" && node.expression.name.text === "getBuiltinModule" &&
        !lexical.isShadowedAt(node.expression.expression, "process")) {
      if (!node.arguments[0] || !ts.isStringLiteralLike(node.arguments[0])) addViolation("COMPUTED_LOADER_TARGET", path, node, node.getText(file));
      record(node, { specifier: "process", exported: "getBuiltinModule", classes: ["ambient-loader"] }, "process-get-builtin-module-call");
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && resolvedBindingAt(node.expression)?.loader) {
      const argument = node.arguments[0];
      if (!argument || !ts.isStringLiteralLike(argument)) addViolation("COMPUTED_LOADER_TARGET", path, node, node.getText(file));
      else {
        const targetClasses = moduleRootClasses.get(argument.text) ?? [];
        record(node, { specifier: "createRequire", exported: argument.text, classes: [...new Set(["ambient-loader", ...targetClasses])] }, "create-require-result-call");
      }
    }
    const directCommonJs = commonJsLoader(node);
    if (directCommonJs) recordDirectCommonJs(node, directCommonJs);
    const resolvedBinding = ts.isIdentifier(node) && !declarationNodes.has(node) ? resolvedBindingAt(node) : null;
    if (ts.isIdentifier(node) && resolvedBinding) {
      const parent = node.parent;
      if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
        const base = resolvedBinding;
        if (base.namespace) {
          const classes = classesForModuleExport(base.specifier, parent.name.text);
          record(parent, { specifier: base.specifier, exported: parent.name.text, classes }, "namespace-member");
        } else record(node, base, base.form ?? "import-declaration");
      } else if (ts.isElementAccessExpression(parent) && parent.expression === node) {
        const member = staticMember(parent);
        if (member.value === null) addViolation("COMPUTED_EFFECT_SELECTOR", path, parent, parent.getText(file));
        else {
          const base = resolvedBinding;
          record(parent, { specifier: base.specifier, exported: member.value, classes: classesForModuleExport(base.specifier, member.value) }, "computed-literal-member");
        }
      } else if (!(ts.isImportSpecifier(parent) || ts.isNamespaceImport(parent) || ts.isVariableDeclaration(parent))) {
        record(node, resolvedBinding, resolvedBinding.form ?? "destructure-binding");
      }
    }
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && ts.isIdentifier(node.expression)) {
      const identity = resolveScopedAlias(node.expression);
      if (identity?.kind === "terminal" && !scopedAliasDeclarations.has(node.expression)) {
        record(node.expression, identity, identity.form ?? "destructure-binding");
      }
    }
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
      const normalized = normalizedScopedGlobal(node.expression) ?? normalizedGlobal(node.expression, lexical.isShadowedAt);
      if (normalized?.error) addViolation(normalized.error === "computed-effect-selector" ? "COMPUTED_EFFECT_SELECTOR" : "GLOBAL_ALIAS_INVALID", path, node.expression, normalized.error);
      else {
        const classes = classifyGlobal(normalized);
        if (classes && normalized.extraMemberCount > 0) addViolation("GLOBAL_ALIAS_INVALID", path, node.expression, "selector-after-terminal");
        else if (classes) record(node.expression, { specifier: normalized.root, exported: normalized.member ?? "*", classes }, normalized.form ?? "global-identifier");
        else if (normalized?.root && normalized.member && ["eval", "Function", "_load", "binding", "_linkedBinding", "dlopen"].includes(normalized.member)) addViolation("UNKNOWN_RESERVED_SELECTOR", path, node.expression, normalized);
      }
    }
    ts.forEachChild(node, visitUses);
  };
  visitUses(file);
}
rawIngress.sort((left, right) => `${left.path}\0${String(left.line).padStart(8, "0")}\0${left.resolvedSymbol}`.localeCompare(`${right.path}\0${String(right.line).padStart(8, "0")}\0${right.resolvedSymbol}`));
const uniqueCanonicalIngress = [...new Map(canonicalIngress.map((entry) => [entry.siteId, entry])).values()];
canonicalIngress.splice(0, canonicalIngress.length, ...uniqueCanonicalIngress);
canonicalIngress.sort((left, right) => `${left.path}\0${String(left.line).padStart(8, "0")}\0${left.siteId}`.localeCompare(`${right.path}\0${String(right.line).padStart(8, "0")}\0${right.siteId}`));
const cFromPath = cMove.from.split("#")[0];
const cToPath = cMove.to.split("#")[0];
const cFromIngressCount = rawIngress.filter((entry) => entry.path === cFromPath && entry.classes.some((classId) => cMove.classes.includes(classId))).length;
const cToIngressCount = rawIngress.filter((entry) => entry.path === cToPath && entry.classes.some((classId) => cMove.classes.includes(classId))).length;
if (cFromIngressCount > 0 && cToIngressCount > 0) addViolation("RAW_OWNER_MOVE_OVERLAP", cToPath, null, { from: cMove.from, to: cMove.to });
rawViolations.sort((left, right) => `${left.code}\0${left.path}\0${String(left.line).padStart(8, "0")}`.localeCompare(`${right.code}\0${right.path}\0${String(right.line).padStart(8, "0")}`));
const rawIngressSha256 = sha256(Buffer.from(canonicalJson(rawIngress)));
const rawViolationSha256 = sha256(Buffer.from(canonicalJson(rawViolations)));
const canonicalIdentity = (entry) => ({
  path: entry.path,
  qualifiedLexicalOwnerId: entry.qualifiedLexicalOwnerId,
  declarationKind: entry.declarationKind,
  resolvedTerminal: entry.resolvedTerminal,
  sourceForm: entry.sourceForm,
  classes: entry.classes,
  predecessorAnchoredStructuralSiteId: entry.siteId,
});
const canonicalViolations = rawViolations.map((violation) => {
  const matchingIngress = canonicalIngress.filter((entry) => entry.path === violation.path && entry.line === violation.line &&
    (!violation.detail?.resolvedSymbol || entry.resolvedTerminal === violation.detail.resolvedSymbol));
  return {
    violationCode: violation.code,
    canonicalIngressIdentity: matchingIngress.length === 1 ? canonicalIdentity(matchingIngress[0]) : null,
    normalizedDetail: canonicalJson(violation.detail),
  };
}).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
const canonicalIngressSha256 = sha256(Buffer.from(canonicalJson(canonicalIngress.map(canonicalIdentity))));
const canonicalViolationSha256 = sha256(Buffer.from(canonicalJson(canonicalViolations)));
const comparisonFixture = fixture?.compareToBootstrapBaseline === true;
const enforceHistoricalB0Snapshot = commit === config.baselineCommit && !comparisonFixture;
const ingressPathCount = new Set(rawIngress.map((entry) => entry.path)).size;
const ownerViolationPathCount = new Set(rawViolations.filter((entry) => entry.code === "RAW_EFFECT_OWNER_INVALID").map((entry) => entry.path)).size;
if (enforceHistoricalB0Snapshot &&
    (rawIngress.length !== config.baselineRawEffectInventory.ingressCount ||
     ingressPathCount !== config.baselineRawEffectInventory.ingressPathCount ||
     rawViolations.filter((entry) => entry.code === "RAW_EFFECT_OWNER_INVALID").length !== config.baselineRawEffectInventory.ownerViolationCount ||
     ownerViolationPathCount !== config.baselineRawEffectInventory.ownerViolationPathCount ||
     rawIngressSha256 !== config.baselineRawEffectInventory.ingressSha256 ||
     rawViolationSha256 !== config.baselineRawEffectInventory.violationSha256)) {
  throw new Error(`B0_RAW_EFFECT_INVENTORY_CHANGED:${rawIngressSha256}:${rawViolationSha256}`);
}

const countCalls = (file, name, minimumPosition = 0) => {
  let count = 0;
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.getStart(file) >= minimumPosition &&
        ((ts.isIdentifier(node.expression) && node.expression.text === name) ||
         (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === name))) count += 1;
    ts.forEachChild(node, visit);
  };
  visit(file);
  return count;
};
const occurrenceCount = (text, value) => text ? text.split(value).length - 1 : 0;
const productPath = "apps/service/src/product/ProductControlPlane.ts";
const gatewayPath = "apps/service/src/product/productExecutionGateway.ts";
const wsPath = "apps/service/src/wsRpc.ts";
const productText = candidateGraph.texts.get(productPath) ?? "";
const productFile = candidateGraph.sourceFile(productPath);
const wsFile = candidateGraph.sourceFile(wsPath);
let facadeShapeMethods = 0;
let volatileVariables = 0;
const rpcMethods = new Set();
const visitStable = (node, owner) => {
  if (owner === "product" && ts.isInterfaceDeclaration(node) && node.name.text === "ProductControlPlaneShape") {
    facadeShapeMethods = node.members.filter((member) => ts.isPropertySignature(member) || ts.isMethodSignature(member)).length;
  }
  if (owner === "product" && ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
      ["runtimeCatalog", "preparedExecutions", "lastRuntimeCatalogObservationAt"].includes(node.name.text)) volatileVariables += 1;
  if (owner === "ws" && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "productRpcEffect") {
    const first = node.arguments[0];
    if (first && ts.isCallExpression(first) && ts.isPropertyAccessExpression(first.expression) && first.expression.expression.getText(wsFile) === "productControlPlane") rpcMethods.add(first.expression.name.text);
  }
  ts.forEachChild(node, (child) => visitStable(child, owner));
};
visitStable(productFile, "product");
visitStable(wsFile, "ws");
const productTables = new Set([...candidateGraph.texts.values()].flatMap((text) =>
  [...text.matchAll(/CREATE TABLE IF NOT EXISTS\s+(?:["`\[])?(product_[A-Za-z0-9_]+)(?:["`\]])?/g)].map((match) => match[1]))).size;
const monolithImporters = new Set(importEdges.filter((edge) => edge.target === productPath && edge.source !== productPath).map((edge) => edge.source));
const anchors = {
  productControlPlaneLines: physicalLines(productText),
  literalGatewayLines: physicalLines(candidateGraph.texts.get(gatewayPath) ?? ""),
  facadeShapeMethods,
  uniqueProductRpcMethods: rpcMethods.size,
  productTables,
  transactionWrapperCalls: countCalls(productFile, "withTransaction", productText.indexOf("const createWorkspace:")),
  volatileVariables,
  productionMonolithImporters: monolithImporters.size,
};
const baselineExpected = {
  productControlPlaneLines: 5036, literalGatewayLines: 115, facadeShapeMethods: 42,
  uniqueProductRpcMethods: 36, productTables: 21, transactionWrapperCalls: 44,
  volatileVariables: 3, productionMonolithImporters: 10,
};
if (enforceHistoricalB0Snapshot) for (const [name, expected] of Object.entries(baselineExpected)) {
  if (anchors[name] !== expected) throw new Error(`B0_STABLE_COUNT_CHANGED:${name}:${anchors[name]}:${expected}`);
}

const memberRecords = membershipPaths.map((path) => {
  const entry = candidate.tree.get(path);
  return entry
    ? { path, present: true, mode: entry.mode, blobId: entry.object, category: categoryOf(path) }
    : { path, present: false, mode: null, blobId: null, category: categoryOf(path) };
});
const allProductionPaths = candidateGraph.paths.filter((path) => isProductionSource(path)).sort();
const declarationCandidates = (path, declaration) => {
  const file = candidateGraph.sourceFile(path);
  const matches = [];
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === declaration.symbol) {
      matches.push({
        kind: "named-function-declaration",
        qualifiedDeclarationId: `module:${path}::function:${declaration.symbol}`,
        defaultExport: declarationModifiers(statement).has(ts.SyntaxKind.DefaultKeyword),
        hasBody: Boolean(statement.body),
      });
    }
    if (ts.isVariableStatement(statement)) {
      for (const item of statement.declarationList.declarations) {
        if (!ts.isIdentifier(item.name) || item.name.text !== declaration.symbol || !item.initializer) continue;
        matches.push({
          kind: ts.isArrowFunction(item.initializer) && (statement.declarationList.flags & ts.NodeFlags.Const) !== 0
            ? "const-arrow-function" : "module-function-expression",
          qualifiedDeclarationId: `module:${path}::${ts.isArrowFunction(item.initializer) ? "const-arrow" : "function-expression"}:${declaration.symbol}`,
          defaultExport: false,
          hasBody: true,
        });
      }
    }
  }
  return matches;
};
const loadPristineBootstrapReport = () => {
  const result = spawnSync(process.execPath, [
    scriptPath,
    "--ref", config.baselineCommit,
    "--predecessor-evidence", V7_MEASUREMENT_BOOTSTRAP.evidenceCommitSha,
  ], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    env: {},
  });
  if (result.status !== 0) throw new Error(`BOOTSTRAP_PREDECESSOR_REPORT_FAILED:${result.stderr.trim()}`);
  return JSON.parse(result.stdout);
};
const compareCanonical = (left, right) => canonicalJson(left) === canonicalJson(right);
const entriesAtPath = (entries, path) => entries.filter((entry) => entry.path === path);
const importEdgesAtPath = (edges, path) => edges.filter((edge) => edge.source === path);
const classCounts = (entries) => {
  const counts = new Map();
  for (const entry of entries) for (const classId of entry.classes) counts.set(classId, (counts.get(classId) ?? 0) + 1);
  return counts;
};
const comparisonEnabled = comparisonFixture || verificationOnlyHistoricalB1 || evidenceBinding.kind === "accepted-product-predecessor";
let comparison = {
  enabled: false,
  candidateWorkId: null,
  predecessorKind: "accepted-v7-measurement-bootstrap",
  externalPathCount: 0,
  tracedPathCount: 0,
  nontracedPathCount: 0,
};
if (commit === config.baselineCommit && candidateWorkId !== null && !comparisonFixture) {
  throw new Error("CANDIDATE_WORK_INVALID:not-allowed-for-official-b0");
}
if (comparisonEnabled) {
  const selectedWork = workBlocks.find((block) => block.work === candidateWorkId);
  if (!selectedWork) throw new Error("CANDIDATE_WORK_INVALID:not-one-frozen-work");
  const predecessorReport = evidenceBinding.predecessorReport ?? loadPristineBootstrapReport();
  if (predecessorReport.format !== FORMAT || !Array.isArray(predecessorReport.universe?.members) ||
      !Array.isArray(predecessorReport.rawEffects?.canonicalIngress) ||
      !Array.isArray(predecessorReport.rawEffects?.canonicalViolations)) {
    throw new Error("PREDECESSOR_REPORT_STRUCTURAL_SNAPSHOT_MISSING");
  }
  const selectedPaths = new Set(selectedWork.production.map((entry) => entry.path));
  const selectedBoundaryPaths = new Set([
    ...selectedWork.production,
    ...selectedWork.measurement,
    ...selectedWork.dependency,
  ].map((entry) => entry.path));
  const predecessorMembers = new Map(predecessorReport.universe.members.map((entry) => [entry.path, entry]));
  const candidateMembers = new Map(memberRecords.map((entry) => [entry.path, entry]));
  const externalPaths = membershipPaths.filter((path) => !selectedBoundaryPaths.has(path) &&
    ["production", "direct-tool", "dependency", "measurement"].includes(categoryOf(path)));
  for (const path of externalPaths) {
    const before = predecessorMembers.get(path);
    const after = candidateMembers.get(path);
    if (!before || !after || before.present !== after.present || before.mode !== after.mode || before.blobId !== after.blobId) {
      throw new Error(`OUTSIDE_WORK_BLOB_DRIFT:${path}`);
    }
    if (!compareCanonical(importEdgesAtPath(predecessorReport.imports.edges, path), importEdgesAtPath(importEdges, path))) {
      throw new Error(`OUTSIDE_WORK_IMPORT_EDGE_DRIFT:${path}`);
    }
    if (!compareCanonical(entriesAtPath(predecessorReport.rawEffects.canonicalIngress, path), entriesAtPath(canonicalIngress, path))) {
      throw new Error(`OUTSIDE_WORK_INGRESS_DRIFT:${path}`);
    }
    const beforeViolations = predecessorReport.rawEffects.canonicalViolations.filter((entry) =>
      entry.canonicalIngressIdentity?.path === path || (!entry.canonicalIngressIdentity && entry.normalizedDetail.includes(`\"path\":\"${path}\"`)));
    const afterViolations = canonicalViolations.filter((entry) =>
      entry.canonicalIngressIdentity?.path === path || (!entry.canonicalIngressIdentity && entry.normalizedDetail.includes(`\"path\":\"${path}\"`)));
    if (!compareCanonical(beforeViolations, afterViolations)) throw new Error(`OUTSIDE_WORK_VIOLATION_DRIFT:${path}`);
  }

  const predecessorProductionPaths = new Set(predecessorReport.universe.allProductionPaths);
  const candidateProductionPaths = new Set(allProductionPaths);
  for (const path of candidateProductionPaths) {
    if (!predecessorProductionPaths.has(path) && !selectedPaths.has(path)) throw new Error(`UNLISTED_PATH:${path}`);
  }
  for (const path of predecessorProductionPaths) {
    if (!candidateProductionPaths.has(path) && !selectedPaths.has(path)) throw new Error(`OUTSIDE_WORK_DELETION:${path}`);
  }

  const tracedDeclarations = new Map();
  for (const entry of predecessorAuthority.lexicalOwnerModel.tracedOwnerDeclarations) {
    if (!tracedDeclarations.has(entry.path)) tracedDeclarations.set(entry.path, []);
    tracedDeclarations.get(entry.path).push(entry);
  }
  const tracedClassAuthority = new Map(ingressAuthority.b1TracedOwners.map((entry) => [`${entry.path}\0${entry.symbol}`, new Set(entry.classes)]));
  tracedClassAuthority.set(cMove.to, new Set(cMove.classes));
  let tracedPathCount = 0;
  let nontracedPathCount = 0;
  for (const path of selectedPaths) {
    const beforeSites = entriesAtPath(predecessorReport.rawEffects.canonicalIngress, path);
    const afterSites = entriesAtPath(canonicalIngress, path);
    const traced = tracedDeclarations.get(path) ?? [];
    if (traced.length) {
      tracedPathCount += 1;
      if (candidate.tree.has(path)) {
        for (const expectedDeclaration of traced) {
          const declarations = declarationCandidates(path, expectedDeclaration);
          if (declarations.length !== 1 || declarations[0].kind !== expectedDeclaration.declarationKind ||
              declarations[0].qualifiedDeclarationId !== expectedDeclaration.qualifiedDeclarationId ||
              declarations[0].defaultExport || !declarations[0].hasBody) {
            throw new Error(`TRACED_DECLARATION_INVALID:${path}#${expectedDeclaration.symbol}`);
          }
        }
      }
      for (const site of afterSites) {
        const expectedDeclaration = traced.find((entry) => entry.qualifiedDeclarationId === site.qualifiedLexicalOwnerId &&
          entry.declarationKind === site.declarationKind && entry.symbol === site.ownerSymbol);
        const allowedClasses = expectedDeclaration &&
          (tracedClassAuthority.get(`${path}\0${expectedDeclaration.symbol}`) ?? tracedClassAuthority.get(`${path}#${expectedDeclaration.symbol}`));
        if (!expectedDeclaration || site.ownerDefaultExport || site.classes.some((classId) => !allowedClasses?.has(classId))) {
          throw new Error(`TRACED_OWNER_IDENTITY_INVALID:${path}:${site.siteId}`);
        }
      }
      if (beforeSites.length) {
        const beforeCounts = classCounts(beforeSites);
        const afterCounts = classCounts(afterSites);
        for (const [classId, count] of afterCounts) {
          if (count > (beforeCounts.get(classId) ?? 0)) throw new Error(`TRACED_CLASS_GROWTH:${path}:${classId}`);
        }
      }
    } else {
      nontracedPathCount += 1;
      const predecessorSiteIds = beforeSites.map((entry) => entry.siteId);
      const candidateSiteIds = afterSites.map((entry) => entry.siteId);
      const tupleMultiset = (sites) => sites.map((site) => canonicalJson({
        path: site.path,
        ownerSymbol: site.ownerSymbol,
        resolvedTerminal: site.resolvedTerminal,
        sourceForm: site.sourceForm,
        classes: site.classes,
      })).sort();
      const tupleMultisetEqual = compareCanonical(tupleMultiset(beforeSites), tupleMultiset(afterSites));
      if (new Set(candidateSiteIds).size !== candidateSiteIds.length ||
          candidateSiteIds.some((siteId) => !predecessorSiteIds.includes(siteId))) {
        throw new Error(`NONTRACED_SITE_RELOCATED_REPLACED_OR_ADDED:${path}:tuple-multiset-equal=${tupleMultisetEqual}`);
      }
      const preservedOrder = predecessorSiteIds.filter((siteId) => candidateSiteIds.includes(siteId));
      if (!compareCanonical(preservedOrder, candidateSiteIds)) throw new Error(`NONTRACED_SITE_REORDERED:${path}`);
    }
  }

  const hardGlobalViolations = rawViolations.filter((entry) => entry.code !== "RAW_EFFECT_OWNER_INVALID");
  if (hardGlobalViolations.length) throw new Error(`RAW_EFFECT_INGRESS_INVALID:${JSON.stringify(hardGlobalViolations.slice(0, 30))}`);
  const deletedPaths = [...selectedPaths].filter((path) => predecessorMembers.get(path)?.present && !candidateMembers.get(path)?.present);
  const materializedPaths = [...selectedPaths].filter((path) => !predecessorMembers.get(path)?.present && candidateMembers.get(path)?.present);
  const moveWitness = (deleted, materialized) => {
    const predecessorBlobId = predecessorMembers.get(deleted)?.blobId;
    const materializedBytes = candidate.bytesAt(materialized);
    if (!/^[0-9a-f]{40}$/.test(predecessorBlobId ?? "") || materializedBytes === null) return null;
    const predecessorBytes = git(["cat-file", "blob", predecessorBlobId]);
    if (sha256(predecessorBytes) === sha256(materializedBytes)) return "exact-content";
    const predecessorStructure = normalizedStructuralLiteral(predecessorBytes, deleted);
    const materializedStructure = normalizedStructuralLiteral(materializedBytes, materialized);
    return predecessorStructure !== null && predecessorStructure === materializedStructure
      ? "normalized-literal-structure" : null;
  };
  const undeclaredMoves = deletedPaths.flatMap((deleted) => materializedPaths.map((materialized) => ({
    deleted,
    materialized,
    witness: deleted === cMove.from.split("#")[0] && materialized === cMove.to.split("#")[0]
      ? null : moveWitness(deleted, materialized),
  }))).filter((entry) => entry.witness !== null)
    .sort((left, right) => `${left.deleted}\0${left.materialized}`.localeCompare(`${right.deleted}\0${right.materialized}`));
  if (undeclaredMoves.length) {
    const { deleted, materialized, witness } = undeclaredMoves[0];
    throw new Error(`UNDECLARED_WORK_PATH_MOVE:${deleted}:${materialized}:${witness}`);
  }
  comparison = {
    enabled: true,
    candidateWorkId,
    predecessorKind: evidenceBinding.kind,
    predecessorReportSha256: sha256(Buffer.from(canonicalJson(predecessorReport))),
    externalPathCount: externalPaths.length,
    tracedPathCount,
    nontracedPathCount,
    exactOutsideEquality: true,
    candidateSelectedPredecessor: false,
    verificationOnly: verificationOnlyHistoricalB1,
  };
}
const selectedEvidence = Object.fromEntries(Object.entries(evidenceBinding).filter(([key]) => key !== "predecessorReport"));
const selectedEvidenceTuple = {
  candidateWorkId: evidenceBinding.candidateWorkId,
  candidateUnderTestSha: evidenceBinding.candidateUnderTestSha,
  officialPredecessorEvidenceSha: evidenceBinding.officialPredecessorEvidenceSha,
  reviewedCandidateSha: evidenceBinding.reviewedCandidateSha,
  handoffBlobId: evidenceBinding.handoffBlobId,
  reviewBlobId: evidenceBinding.reviewBlobId,
  predecessorReportSha256: evidenceBinding.predecessorReportSha256,
  implementerActorId: evidenceBinding.implementerActorId,
  reviewerActorId: evidenceBinding.reviewerActorId,
  reviewReceipt: evidenceBinding.reviewReceipt,
};

const reportBase = {
  format: FORMAT,
  commit,
  observationalBaseline: commit === config.baselineCommit && !comparisonEnabled,
  instrument: { scriptSha256: sha256(scriptBytes), configSha256: sha256(configBytes) },
  officialInvocation: {
    argv: [
      "node",
      "scripts/product-truth/measure-complexity-v8.mjs",
      ...(fixtureName ? ["--fixture", fixtureName] : []),
      ...(candidateWorkId ? ["--work", candidateWorkId] : []),
      "--ref", commit,
      "--predecessor-evidence", predecessorEvidenceCommit,
    ],
    predecessorEvidenceArgumentCount: 1,
    fixtureMode,
    official: !fixtureMode,
    environmentFallbackUsed: false,
    identityAuthenticationClaimed: false,
  },
  evidence: {
    measurementBootstrap,
    transitionRows: predecessorAuthority.workPredecessorEvidenceTable,
    selectedEvidence,
    selectedTuple: selectedEvidenceTuple,
  },
  authority: {
    acceptedDesignCommit: config.acceptedDesignCommit,
    workBoundarySha256: Object.fromEntries(config.workBoundaries.map((entry) => [entry.work, entry.canonicalSha256])),
    rawEffectUniverseSha256: config.authorityBlocks["omp-flow-raw-effect-universe-v1"],
    effectIngressAuthoritySha256: config.authorityBlocks["omp-flow-effect-ingress-authority-v1"],
    b1VerifierUniverseSha256: config.authorityBlocks["omp-flow-b1-verifier-universe-v1"],
    predecessorDeltaAuthoritySha256: config.predecessorAuthoritySha256,
    verifier,
  },
  universe: {
    source: "accepted-design-work-boundaries-plus-accepted-tree-bidirectional-static-import-closure",
    candidateSelectedPathsUsed: false,
    workingTreeUsed: false,
    membershipSha256: sha256(Buffer.from(canonicalJson(membershipPaths))),
    frozenMemberCount: membershipPaths.length,
    presentMemberCount: presentMembers.length,
    absentMembers: membershipPaths.filter((path) => !candidate.tree.has(path)),
    members: memberRecords,
    allProductionPaths,
    files,
    workCoverage: workBlocks.map((block) => ({
      work: block.work,
      production: block.production.map((entry) => entry.path),
      present: block.production.map((entry) => entry.path).filter((path) => candidate.tree.has(path)),
      absent: block.production.map((entry) => entry.path).filter((path) => !candidate.tree.has(path)),
    })),
  },
  dependencies: { bytes: dependencyBytes, workspaceManifests: workspaceManifestBytes, acceptedEffects: acceptedDependencyEffects, effectAvailability: dependencyEffectAvailability },
  rawEffects: {
    classIds: rawUniverse.classIds,
    sourceForms: rawUniverse.sourceForms,
    ingressCount: rawIngress.length,
    ingressPathCount,
    ingressSha256: rawIngressSha256,
    ingress: rawIngress,
    violationSha256: rawViolationSha256,
    violations: rawViolations,
    ownerViolationCount: rawViolations.filter((entry) => entry.code === "RAW_EFFECT_OWNER_INVALID").length,
    ownerViolationPathCount,
    canonicalIngressSha256,
    canonicalIngress,
    canonicalViolationSha256,
    canonicalViolations,
    ownerCounts: Object.fromEntries([...new Set(rawIngress.map((entry) => entry.path))].sort().map((path) => [path, rawIngress.filter((entry) => entry.path === path).length])),
    cOwnerMove: { from: cMove.from, to: cMove.to, fromIngressCount: cFromIngressCount, toIngressCount: cToIngressCount, exclusive: !(cFromIngressCount > 0 && cToIngressCount > 0) },
  },
  lines,
  anchors,
  comparison,
  imports: {
    edgeCount: importEdges.length,
    edges: importEdges,
    external: candidateGraph.external.filter((entry) => frozenMembership.has(entry.source)),
    stronglyConnectedComponents: graphComponents.filter((component) => component.length > 1),
  },
};

process.stdout.write(`${JSON.stringify(reportBase, null, 2)}\n`);
