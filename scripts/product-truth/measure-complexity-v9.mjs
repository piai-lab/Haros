#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, extname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const FORMAT = "product-truth-complexity-v9";
const REPORT_SCHEMA = "omp-flow-product-truth-complexity-v9-report-v1";
const BUNDLE_ROOT = ".omp-flow/tasks/08-07-product-truth-consolidation";
const INTERFACE_PATH = `${BUNDLE_ROOT}/interfaces/product-truth-complexity-v9.md`;
const DESIGN_PATH = `${BUNDLE_ROOT}/design.md`;
const V7_BOOTSTRAP_EVIDENCE = "5632f63603e6ae8b3fb95f759c793a09b16a1e44";
const historicalArtifactPath = (path) =>
  /^scripts\/product-truth\/(?:measure-complexity(?:-v[2-8])?(?:\.test)?\.(?:mjs|ts)|complexity-universe-v[1-8]\.json)$/.test(
    path,
  ) ||
  /^scripts\/product-truth\/fixtures\/complexity-v(?:[2-8])\//.test(path) ||
  new RegExp(
    `^${BUNDLE_ROOT.replaceAll(".", "\\.")}\/(?:handoffs|reviews)\/product-truth-complexity-v[2-8]\\.md$`,
  ).test(path);
const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = dirname(scriptPath);
const repositoryRoot = resolve(scriptDirectory, "../..");
const configPath = resolve(scriptDirectory, "complexity-universe-v9.json");
const scriptBytes = readFileSync(scriptPath);
const configBytes = readFileSync(configPath);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};
const compareUtf8 = (left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right));
const sortedStrings = (values) => [...values].sort(compareUtf8);
const sortByJcsBytes = (values) =>
  [...values].sort((left, right) =>
    Buffer.compare(Buffer.from(canonicalJson(left)), Buffer.from(canonicalJson(right))),
  );
const decodeUtf8 = (bytes, identity) => {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (text.includes("\u0000")) throw new Error(`TEXT_AUTHORITY_INVALID:${identity}`);
  return text;
};
const assertNoDuplicateJsonKeys = (text, identity) => {
  const parsed = ts.parseJsonText(identity, text);
  if (parsed.parseDiagnostics.length) throw new Error(`JSON_INVALID:${identity}`);
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const names = new Set();
      for (const property of node.properties) {
        if (
          !property.name ||
          (!ts.isStringLiteralLike(property.name) && !ts.isIdentifier(property.name))
        )
          continue;
        if (names.has(property.name.text))
          throw new Error(`JSON_DUPLICATE_KEY:${identity}:${property.name.text}`);
        names.add(property.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
};
const parseJsonStrict = (text, identity) => {
  assertNoDuplicateJsonKeys(text, identity);
  return JSON.parse(text);
};

const parseArguments = (argv) => {
  const values = new Map();
  const allowed = new Set(["--ref", "--predecessor-evidence", "--work", "--fixture"]);
  if (argv.length % 2 !== 0)
    throw new Error("OFFICIAL_INVOCATION_INVALID:paired-arguments-required");
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(flag) || value.startsWith("--") || values.has(flag)) {
      throw new Error("OFFICIAL_INVOCATION_INVALID:unknown-missing-or-duplicate-argument");
    }
    values.set(flag, value);
  }
  if (!values.has("--ref") || !values.has("--predecessor-evidence")) {
    throw new Error("OFFICIAL_EVIDENCE_INPUT_INVALID:missing");
  }
  const commit = values.get("--ref");
  const evidenceCommit = values.get("--predecessor-evidence");
  const candidateWorkId = values.get("--work") ?? null;
  const fixtureName = values.get("--fixture") ?? null;
  if (!/^[0-9a-f]{40}$/.test(commit))
    throw new Error("CANDIDATE_REF_INVALID:full-lowercase-sha-required");
  if (!/^[0-9a-f]{40}$/.test(evidenceCommit)) {
    throw new Error("OFFICIAL_EVIDENCE_INPUT_INVALID:full-lowercase-sha-required");
  }
  if (candidateWorkId !== null && !/^[a-z0-9-]+$/.test(candidateWorkId))
    throw new Error("CANDIDATE_WORK_INVALID");
  if (fixtureName !== null && !/^[a-z0-9-]+$/.test(fixtureName))
    throw new Error("FIXTURE_NAME_INVALID");
  return { commit, evidenceCommit, candidateWorkId, fixtureName };
};

const { commit, evidenceCommit, candidateWorkId, fixtureName } = parseArguments(
  process.argv.slice(2),
);
const configText = decodeUtf8(configBytes, "complexity-universe-v9.json");
const config = parseJsonStrict(configText, "complexity-universe-v9.json");
if (config.format !== "product-truth-complexity-universe-v9")
  throw new Error("CONFIG_FORMAT_INVALID");
const configKeys = [
  "acceptedTreeInputsJcsSha256",
  "acceptedTreeRecordCount",
  "acceptedTreeRecordsRawJcsSha256",
  "approvedStateCommit",
  "authorityDesignCommit",
  "authoritySha256",
  "baselineCommit",
  "boundaryAndVerificationRecordsRawJcsSha256",
  "boundaryStateRecordsRawJcsSha256",
  "dependencyAuthoritySha256",
  "format",
  "historicalArtifactsSha256",
  "verificationRowsJcsSha256",
  "workBoundarySha256",
].sort();
if (
  canonicalJson(Object.keys(config).sort()) !== canonicalJson(configKeys) ||
  Object.keys(config.workBoundarySha256 ?? {}).length !== 5
) {
  throw new Error("CONFIG_AUTHORITY_SURFACE_INVALID");
}

const mergeFixture = (parent, child) => ({
  ...parent,
  ...child,
  virtualFiles: { ...(parent.virtualFiles ?? {}), ...(child.virtualFiles ?? {}) },
  appendToFiles: { ...(parent.appendToFiles ?? {}), ...(child.appendToFiles ?? {}) },
  textReplacements: { ...(parent.textReplacements ?? {}), ...(child.textReplacements ?? {}) },
  moveFiles: { ...(parent.moveFiles ?? {}), ...(child.moveFiles ?? {}) },
  modeChanges: { ...(parent.modeChanges ?? {}), ...(child.modeChanges ?? {}) },
  evidenceMutation: { ...(parent.evidenceMutation ?? {}), ...(child.evidenceMutation ?? {}) },
  laterEvidenceMutation: {
    ...(parent.laterEvidenceMutation ?? {}),
    ...(child.laterEvidenceMutation ?? {}),
  },
});
const loadFixture = (name, stack = []) => {
  if (stack.includes(name)) throw new Error("FIXTURE_INHERITANCE_CYCLE");
  const path = resolve(scriptDirectory, "fixtures/complexity-v9", `${name}.json`);
  const text = readFileSync(path, "utf8");
  const own = parseJsonStrict(text, path);
  if (!own.extends) return own;
  if (!/^[a-z0-9-]+$/.test(own.extends)) throw new Error("FIXTURE_PARENT_INVALID");
  const parent = loadFixture(own.extends, [...stack, name]);
  delete own.extends;
  return mergeFixture(parent, own);
};
const fixture = fixtureName === null ? null : loadFixture(fixtureName);

const git = (gitArgs, input) => {
  const result = spawnSync("git", gitArgs, {
    cwd: repositoryRoot,
    input,
    encoding: null,
    maxBuffer: 512 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`GIT_OBJECT_INVALID:${gitArgs[0]}`);
  return result.stdout;
};
const requireCommit = (ref, diagnostic) => {
  try {
    if (
      git(["cat-file", "-t", `${ref}^{commit}`])
        .toString("ascii")
        .trim() !== "commit"
    )
      throw new Error();
  } catch {
    throw new Error(diagnostic);
  }
};
requireCommit(commit, "CANDIDATE_REF_INVALID:nonexistent-or-noncommit");
requireCommit(evidenceCommit, "OFFICIAL_EVIDENCE_INPUT_INVALID:nonexistent-or-noncommit");
requireCommit(config.authorityDesignCommit, "DESIGN_REF_INVALID");
requireCommit(config.approvedStateCommit, "APPROVED_STATE_REF_INVALID");

const loadTree = (ref) => {
  const output = git(["ls-tree", "-rz", "--full-tree", ref]);
  const tree = new Map();
  for (const raw of output.subarray(0, -1).toString("utf8").split("\0")) {
    const match = /^(\d+) (\w+) ([0-9a-f]{40})\t([\s\S]+)$/.exec(raw);
    if (!match) throw new Error("GIT_TREE_ENTRY_INVALID");
    tree.set(match[4], { mode: match[1], type: match[2], object: match[3] });
  }
  const objectIds = [
    ...new Set(
      [...tree.values()].filter((entry) => entry.type === "blob").map((entry) => entry.object),
    ),
  ];
  const batch = git(["cat-file", "--batch"], Buffer.from(`${objectIds.join("\n")}\n`));
  const blobs = new Map();
  let offset = 0;
  for (const requested of objectIds) {
    const headerEnd = batch.indexOf(10, offset);
    const header = batch.subarray(offset, headerEnd).toString("ascii");
    const match = /^([0-9a-f]{40}) blob (\d+)$/.exec(header);
    if (!match || match[1] !== requested) throw new Error("GIT_BLOB_BATCH_INVALID");
    const start = headerEnd + 1;
    const end = start + Number(match[2]);
    if (batch[end] !== 10) throw new Error("GIT_BLOB_BATCH_TRUNCATED");
    blobs.set(requested, batch.subarray(start, end));
    offset = end + 1;
  }
  const bytesAt = (path) => {
    const entry = tree.get(path);
    if (!entry) return null;
    if (
      entry.type !== "blob" ||
      !["100644", "100755"].includes(entry.mode) ||
      !blobs.has(entry.object)
    ) {
      throw new Error(`TREE_MEMBER_NOT_REGULAR:${path}`);
    }
    return blobs.get(entry.object);
  };
  const textAt = (path) => {
    const bytes = bytesAt(path);
    if (bytes === null) throw new Error(`TREE_MEMBER_MISSING:${path}`);
    return decodeUtf8(bytes, path);
  };
  const install = (path, bytes, mode = "100644", salt = "candidate") => {
    if (!["100644", "100755"].includes(mode)) throw new Error(`FIXTURE_MODE_INVALID:${path}`);
    const object = createHash("sha1")
      .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
      .digest("hex");
    tree.set(path, { mode, type: "blob", object });
    blobs.set(object, bytes);
  };
  return { tree, blobs, bytesAt, textAt, install };
};

const authorityTree = loadTree(config.authorityDesignCommit);
const approvedState = loadTree(config.approvedStateCommit);
const fixtureUsesBootstrapCandidate = fixture?.useBootstrapCandidateSnapshot === true;
const fixtureUsesApprovedStateCandidate = fixture?.useApprovedStateCandidateSnapshot === true;
const candidate = loadTree(
  fixtureUsesBootstrapCandidate
    ? config.baselineCommit
    : fixtureUsesApprovedStateCandidate
      ? config.approvedStateCommit
      : commit,
);
const evidence = loadTree(
  fixture?.syntheticProductEvidence === true && fixtureUsesApprovedStateCandidate
    ? config.approvedStateCommit
    : evidenceCommit,
);
const applySnapshotMutation = (snapshot, mutation, salt) => {
  for (const [from, to] of Object.entries(mutation?.moveFiles ?? {})) {
    const bytes = snapshot.bytesAt(from);
    const entry = snapshot.tree.get(from);
    if (bytes === null || !entry) throw new Error(`FIXTURE_MOVE_SOURCE_MISSING:${from}`);
    snapshot.tree.delete(from);
    snapshot.install(to, bytes, entry.mode, salt);
  }
  for (const path of mutation?.removeFiles ?? []) snapshot.tree.delete(path);
  for (const [path, value] of Object.entries(mutation?.virtualFiles ?? {})) {
    snapshot.install(path, Buffer.from(value), "100644", salt);
  }
  for (const [path, suffix] of Object.entries(mutation?.appendToFiles ?? {})) {
    const bytes = snapshot.bytesAt(path);
    const entry = snapshot.tree.get(path);
    if (bytes === null || !entry) throw new Error(`FIXTURE_APPEND_TARGET_MISSING:${path}`);
    snapshot.install(path, Buffer.concat([bytes, Buffer.from(suffix)]), entry.mode, salt);
  }
  for (const [path, replacements] of Object.entries(mutation?.textReplacements ?? {})) {
    let text = snapshot.textAt(path);
    for (const replacement of replacements) {
      if (
        !Array.isArray(replacement) ||
        replacement.length !== 2 ||
        !text.includes(replacement[0])
      ) {
        throw new Error(`FIXTURE_REPLACEMENT_TARGET_MISSING:${path}`);
      }
      text = text.replace(replacement[0], replacement[1]);
    }
    const mode = snapshot.tree.get(path)?.mode ?? "100644";
    snapshot.install(path, Buffer.from(text), mode, salt);
  }
  for (const [path, mode] of Object.entries(mutation?.modeChanges ?? {})) {
    const entry = snapshot.tree.get(path);
    if (!entry || !["100644", "100755"].includes(mode))
      throw new Error(`FIXTURE_MODE_TARGET_INVALID:${path}`);
    snapshot.tree.set(path, { ...entry, mode });
  }
};
applySnapshotMutation(candidate, fixture, `candidate-${fixtureName ?? "official"}`);
applySnapshotMutation(evidence, fixture?.evidenceMutation, `evidence-${fixtureName ?? "official"}`);
const extractMachineBlock = (text, tag, identity) => {
  const matches = [...text.matchAll(new RegExp("```" + tag + "\\n([\\s\\S]*?)\\n```", "g"))];
  if (matches.length !== 1) throw new Error(`MACHINE_BLOCK_CARDINALITY_INVALID:${identity}:${tag}`);
  return parseJsonStrict(matches[0][1], `${identity}:${tag}`);
};
const assertMachineBlockJsonKeys = (text, tag, identity) => {
  const matches = [...text.matchAll(new RegExp("```" + tag + "\\n([\\s\\S]*?)\\n```", "g"))];
  for (const [index, match] of matches.entries())
    assertNoDuplicateJsonKeys(match[1], `${identity}:${tag}:${index + 1}`);
};
const setAtPointer = (root, pointer, action, value) => {
  const parts = pointer
    .split("/")
    .slice(1)
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  if (!parts.length) throw new Error("FIXTURE_POINTER_INVALID");
  let owner = root;
  for (const part of parts.slice(0, -1)) {
    if (!(part in owner)) throw new Error(`FIXTURE_POINTER_MISSING:${pointer}`);
    owner = owner[part];
  }
  const key = parts.at(-1);
  if (action === "add") {
    if (Array.isArray(owner)) owner.splice(key === "-" ? owner.length : Number(key), 0, value);
    else if (key in owner) throw new Error(`FIXTURE_POINTER_ALREADY_PRESENT:${pointer}`);
    else owner[key] = value;
  } else {
    if (!(key in owner)) throw new Error(`FIXTURE_POINTER_MISSING:${pointer}`);
    if (action === "remove")
      Array.isArray(owner) ? owner.splice(Number(key), 1) : delete owner[key];
    else if (action === "replace") owner[key] = value;
    else throw new Error(`FIXTURE_POINTER_ACTION_INVALID:${action}`);
  }
};

const interfaceText = authorityTree.textAt(INTERFACE_PATH);
const authority = extractMachineBlock(
  interfaceText,
  "omp-flow-product-truth-complexity-v9-authority-v1",
  INTERFACE_PATH,
);
if (fixture?.authorityMutation?.block === "v9") {
  setAtPointer(
    authority,
    fixture.authorityMutation.pointer,
    fixture.authorityMutation.action,
    fixture.authorityMutation.value,
  );
}
const authoritySha256 = sha256(Buffer.from(canonicalJson(authority)));
if (
  authoritySha256 !== config.authoritySha256 ||
  authority.authority !== "omp-flow-product-truth-complexity-v9-authority-v1"
) {
  throw new Error("V9_AUTHORITY_CHANGED");
}

const workBlocks = [];
for (const work of sortedStrings(Object.keys(config.workBoundarySha256))) {
  const path = `${BUNDLE_ROOT}/work/${work}.md`;
  const block = extractMachineBlock(
    authorityTree.textAt(path),
    "omp-flow-production-boundary-v1",
    path,
  );
  if (fixture?.authorityMutation?.block === `work:${work}`) {
    setAtPointer(
      block,
      fixture.authorityMutation.pointer,
      fixture.authorityMutation.action,
      fixture.authorityMutation.value,
    );
  }
  if (
    block.work !== work ||
    sha256(Buffer.from(canonicalJson(block))) !== config.workBoundarySha256[work]
  ) {
    throw new Error(`WORK_AUTHORITY_CHANGED:${work}`);
  }
  for (const family of ["production", "measurement", "dependency"]) {
    if (
      !Array.isArray(block[family]) ||
      block[family].some(
        (entry) =>
          Object.keys(entry).sort().join(",") !== "kind,path" ||
          entry.kind !== "exact" ||
          typeof entry.path !== "string",
      )
    ) {
      throw new Error(`WORK_AUTHORITY_INVALID:${work}:${family}`);
    }
  }
  workBlocks.push(block);
}

if (workBlocks.length !== 5 || authority.capabilityDeclarations?.rows?.length !== 11) {
  throw new Error("V9_AUTHORITY_CARDINALITY_INVALID");
}
const worksById = new Map(workBlocks.map((block) => [block.work, block]));
for (const row of authority.capabilityDeclarations.rows) {
  const keys = Object.keys(row).sort();
  const expectedKeys = [
    "b0Presence",
    "declarationKind",
    "dispositionWhenPresent",
    "firstMaterializationWork",
    "path",
    "symbol",
  ].sort();
  if (
    canonicalJson(keys) !== canonicalJson(expectedKeys) ||
    !["present", "absent"].includes(row.b0Presence) ||
    !["exported", "module-private"].includes(row.dispositionWhenPresent) ||
    !["named-function-declaration", "const-arrow-function"].includes(row.declarationKind)
  ) {
    throw new Error(
      `DECLARATION_AUTHORITY_INVALID:${row.path ?? "unknown"}#${row.symbol ?? "unknown"}`,
    );
  }
  if (row.b0Presence === "present" && row.firstMaterializationWork !== null) {
    throw new Error(
      `DECLARATION_AUTHORITY_INVALID:${row.path}#${row.symbol}:present-materialization`,
    );
  }
  if (row.b0Presence === "absent") {
    const owningWork = worksById.get(row.firstMaterializationWork);
    if (!owningWork?.production.some((entry) => entry.path === row.path)) {
      throw new Error(
        `DECLARATION_AUTHORITY_INVALID:${row.path}#${row.symbol}:materialization-work`,
      );
    }
  }
}

const sourceUniverse = sortedStrings(
  new Set(workBlocks.flatMap((block) => block.production.map((entry) => entry.path))),
);
const frozenBoundaryUniverse = sortedStrings(
  new Set(
    workBlocks.flatMap((block) =>
      ["production", "measurement", "dependency"].flatMap((family) =>
        block[family].map((entry) => entry.path),
      ),
    ),
  ),
);
const sourceUniverseSha256 = sha256(Buffer.from(canonicalJson(sourceUniverse)));
const graphAuthority = authority.literalImportExportGraph;
if (
  sourceUniverse.length !== graphAuthority.sourceUniverseMemberCount ||
  sourceUniverseSha256 !== graphAuthority.sourceUniverseJcsSha256
) {
  throw new Error(`SOURCE_UNIVERSE_CHANGED:${sourceUniverse.length}:${sourceUniverseSha256}`);
}

const verificationAuthority = extractMachineBlock(
  authorityTree.textAt(DESIGN_PATH),
  "omp-flow-product-verification-paths-v1",
  DESIGN_PATH,
);
if (fixture?.authorityMutation?.block === "verification") {
  setAtPointer(
    verificationAuthority,
    fixture.authorityMutation.pointer,
    fixture.authorityMutation.action,
    fixture.authorityMutation.value,
  );
}
const verificationRows = verificationAuthority.verificationPathRows;
const verificationRowKeys = [
  "allowedLifecycle",
  "approvedGitBlob",
  "approvedMode",
  "approvedPresence",
  "approvedSha256",
  "firstMaterializationMode",
  "firstMaterializationWork",
  "path",
  "purpose",
  "work",
].sort();
if (
  verificationAuthority.authority !== "omp-flow-product-verification-paths-v1" ||
  verificationAuthority.approvedCommit !== config.approvedStateCommit ||
  !Array.isArray(verificationRows) ||
  verificationRows.length !== authority.designInputs.verificationPathRows.rowCount ||
  verificationRows.some(
    (row) =>
      canonicalJson(Object.keys(row).sort()) !== canonicalJson(verificationRowKeys) ||
      !worksById.has(row.work) ||
      typeof row.path !== "string",
  )
) {
  throw new Error("VERIFICATION_PATH_AUTHORITY_INVALID");
}
const verificationRowsJcsSha256 = sha256(
  Buffer.from(canonicalJson(sortByJcsBytes(verificationRows))),
);
if (
  verificationRowsJcsSha256 !== config.verificationRowsJcsSha256 ||
  verificationRowsJcsSha256 !== verificationAuthority.verificationPathRowsJcsSha256 ||
  verificationRowsJcsSha256 !== authority.designInputs.verificationPathRows.rowsJcsSha256
) {
  throw new Error(`VERIFICATION_PATH_ROWS_CHANGED:${verificationRowsJcsSha256}`);
}
const verificationRowsPerWork = Object.fromEntries(
  sortedStrings([...worksById.keys()]).map((work) => [
    work,
    verificationRows.filter((row) => row.work === work).length,
  ]),
);
if (
  canonicalJson(verificationRowsPerWork) !==
  canonicalJson(authority.designInputs.verificationPathRows.rowsPerWork)
) {
  throw new Error("VERIFICATION_PATH_WORK_COUNTS_CHANGED");
}
const verificationRowsByWork = new Map(
  [...worksById.keys()].map((work) => [work, verificationRows.filter((row) => row.work === work)]),
);
const verificationPaths = sortedStrings(new Set(verificationRows.map((row) => row.path)));
if (verificationPaths.length !== authority.designInputs.verificationPathRows.uniquePathCount) {
  throw new Error(`VERIFICATION_PATH_UNIQUE_COUNT_CHANGED:${verificationPaths.length}`);
}

const stateRecordAt = (snapshot, path) => {
  const entry = snapshot.tree.get(path) ?? null;
  const bytes = snapshot.bytesAt(path);
  if (!entry || bytes === null) {
    return { path, presence: "absent", mode: null, gitBlob: null, sha256: null };
  }
  return {
    path,
    presence: "present",
    mode: entry.mode,
    gitBlob: entry.object,
    sha256: sha256(bytes),
  };
};
const approvedProductionStateRecords = sortByJcsBytes(
  sourceUniverse.map((path) => stateRecordAt(approvedState, path)),
);
const approvedProductionStateSha256 = sha256(
  Buffer.from(canonicalJson(approvedProductionStateRecords)),
);
if (
  config.approvedStateCommit !== authority.selectedWork.approvedBoundaryState.commit ||
  approvedProductionStateRecords.length !==
    authority.selectedWork.approvedBoundaryState.recordCount ||
  approvedProductionStateSha256 !== config.boundaryStateRecordsRawJcsSha256 ||
  approvedProductionStateSha256 !== authority.selectedWork.approvedBoundaryState.recordsRawJcsSha256
) {
  throw new Error(`APPROVED_PRODUCTION_STATE_CHANGED:${approvedProductionStateSha256}`);
}
const approvedProductionStateByPath = new Map(
  approvedProductionStateRecords.map((record) => [record.path, record]),
);
for (const row of verificationRows) {
  const approved = stateRecordAt(approvedState, row.path);
  if (
    approved.presence !== row.approvedPresence ||
    approved.mode !== row.approvedMode ||
    approved.gitBlob !== row.approvedGitBlob ||
    approved.sha256 !== row.approvedSha256
  ) {
    throw new Error(`VERIFICATION_PATH_APPROVED_STATE_CHANGED:${row.work}:${row.path}`);
  }
  const allowed =
    row.approvedPresence === "present"
      ? row.allowedLifecycle === "modify-blob-preserve-presence-and-mode" &&
        row.firstMaterializationMode === null &&
        row.firstMaterializationWork === null
      : [
          "first-materialize-then-modify-preserve-presence-and-mode",
          "modify-after-required-prior-materialization-preserve-presence-and-mode",
        ].includes(row.allowedLifecycle) &&
        row.firstMaterializationMode === "100644" &&
        worksById.has(row.firstMaterializationWork);
  if (!allowed) throw new Error(`VERIFICATION_PATH_LIFECYCLE_INVALID:${row.work}:${row.path}`);
}
const boundaryAndVerificationPaths = sortedStrings(
  new Set([...sourceUniverse, ...verificationPaths]),
);
const approvedBoundaryAndVerificationRecords = sortByJcsBytes(
  boundaryAndVerificationPaths.map((path) => stateRecordAt(approvedState, path)),
);
const approvedBoundaryAndVerificationSha256 = sha256(
  Buffer.from(canonicalJson(approvedBoundaryAndVerificationRecords)),
);
const approvedBoundaryAndVerificationAuthority =
  authority.selectedWork.approvedBoundaryAndVerificationState;
if (
  approvedBoundaryAndVerificationRecords.length !==
    approvedBoundaryAndVerificationAuthority.recordCount ||
  approvedBoundaryAndVerificationRecords.filter((row) => row.presence === "present").length !==
    approvedBoundaryAndVerificationAuthority.presentCount ||
  approvedBoundaryAndVerificationRecords.filter((row) => row.presence === "absent").length !==
    approvedBoundaryAndVerificationAuthority.absentCount ||
  approvedBoundaryAndVerificationSha256 !== config.boundaryAndVerificationRecordsRawJcsSha256 ||
  approvedBoundaryAndVerificationSha256 !==
    approvedBoundaryAndVerificationAuthority.recordsRawJcsSha256
) {
  throw new Error(
    `APPROVED_BOUNDARY_AND_VERIFICATION_STATE_CHANGED:${approvedBoundaryAndVerificationSha256}`,
  );
}

const productionMaterializations = authority.selectedWork.productionAllowedMaterializations;
if (!Array.isArray(productionMaterializations) || productionMaterializations.length !== 4) {
  throw new Error("PRODUCTION_MATERIALIZATION_AUTHORITY_INVALID");
}
const productionMaterializationByIdentity = new Map();
for (const row of productionMaterializations) {
  const identity = `${row.work}\0${row.path}`;
  const block = worksById.get(row.work);
  const approved = approvedProductionStateByPath.get(row.path);
  if (
    productionMaterializationByIdentity.has(identity) ||
    row.mode !== "100644" ||
    !block?.production.some((entry) => entry.path === row.path) ||
    approved?.presence !== "absent"
  ) {
    throw new Error(`PRODUCTION_MATERIALIZATION_AUTHORITY_INVALID:${identity}`);
  }
  productionMaterializationByIdentity.set(identity, row);
}
const verificationFirstMaterializations = new Map();
for (const row of verificationRows.filter((entry) => entry.approvedPresence === "absent")) {
  const prior = verificationFirstMaterializations.get(row.path);
  if (
    prior &&
    (prior.firstMaterializationWork !== row.firstMaterializationWork ||
      prior.firstMaterializationMode !== row.firstMaterializationMode)
  ) {
    throw new Error(`VERIFICATION_MATERIALIZATION_CONFLICT:${row.path}`);
  }
  verificationFirstMaterializations.set(row.path, row);
}
if (
  verificationFirstMaterializations.size !==
    authority.selectedWork.verificationAllowedMaterializations.uniquePathCount ||
  canonicalJson(sortedStrings(verificationFirstMaterializations.keys())) !==
    canonicalJson(sortedStrings(authority.selectedWork.verificationAllowedMaterializations.paths))
) {
  throw new Error("VERIFICATION_MATERIALIZATION_AUTHORITY_INVALID");
}

const sourceAdoptions = extractMachineBlock(
  approvedState.textAt(authority.acceptedTreeByteAuthority.sourceAdoptions.documentPath),
  authority.acceptedTreeByteAuthority.sourceAdoptions.block,
  authority.acceptedTreeByteAuthority.sourceAdoptions.documentPath,
);
const sourceAdoptionsSha256 = sha256(Buffer.from(canonicalJson(sourceAdoptions)));
if (sourceAdoptionsSha256 !== authority.acceptedTreeByteAuthority.sourceAdoptions.blockJcsSha256) {
  throw new Error(`SOURCE_ADOPTIONS_AUTHORITY_CHANGED:${sourceAdoptionsSha256}`);
}
const acceptedTreeInputs = authority.acceptedTreeByteAuthority.inputs;
const acceptedTreeInputsSha256 = sha256(Buffer.from(canonicalJson(acceptedTreeInputs)));
if (
  acceptedTreeInputsSha256 !== config.acceptedTreeInputsJcsSha256 ||
  acceptedTreeInputsSha256 !== authority.acceptedTreeByteAuthority.inputsJcsSha256
) {
  throw new Error(`ACCEPTED_TREE_INPUTS_CHANGED:${acceptedTreeInputsSha256}`);
}
const adoptionsById = new Map((sourceAdoptions.adopted ?? []).map((entry) => [entry.id, entry]));
for (const row of [...acceptedTreeInputs.patchRoots, ...acceptedTreeInputs.adoptedSourceRoots]) {
  if (!adoptionsById.get(row.adoptionId)?.paths?.includes(row.path)) {
    throw new Error(`ACCEPTED_TREE_ADOPTION_INPUT_INVALID:${row.adoptionId}:${row.path}`);
  }
}
for (const row of acceptedTreeInputs.licensePaths) {
  if (!adoptionsById.get(row.adoptionId)?.licenseFiles?.includes(row.path)) {
    throw new Error(`ACCEPTED_TREE_LICENSE_INPUT_INVALID:${row.adoptionId}:${row.path}`);
  }
}
const acceptedInputPaths = [
  ...acceptedTreeInputs.manifestPaths,
  ...acceptedTreeInputs.lockfilePaths,
  ...acceptedTreeInputs.patchRoots.map((row) => row.path),
  ...acceptedTreeInputs.adoptedSourceRoots.map((row) => row.path),
  ...acceptedTreeInputs.licensePaths.map((row) => row.path),
];
const acceptedTreeDerivations = [];
for (const inputPath of acceptedInputPaths) {
  if (approvedState.tree.has(inputPath)) {
    acceptedTreeDerivations.push(inputPath);
    continue;
  }
  const descendants = [...approvedState.tree.keys()].filter((path) =>
    path.startsWith(`${inputPath}/`),
  );
  if (!descendants.length) throw new Error(`ACCEPTED_TREE_INPUT_MISSING:${inputPath}`);
  acceptedTreeDerivations.push(...descendants);
}
const acceptedTreePathObjects = new Map();
for (const path of acceptedTreeDerivations) {
  const entry = approvedState.tree.get(path);
  if (!entry || entry.type !== "blob" || !["100644", "100755"].includes(entry.mode)) {
    throw new Error(`ACCEPTED_TREE_MEMBER_NOT_REGULAR:${path}`);
  }
  const prior = acceptedTreePathObjects.get(path);
  if (prior && prior !== entry.object)
    throw new Error(`ACCEPTED_TREE_DUPLICATE_OBJECT_CONFLICT:${path}`);
  acceptedTreePathObjects.set(path, entry.object);
}
const acceptedTreeRecords = sortByJcsBytes(
  [...acceptedTreePathObjects.keys()].map((path) => stateRecordAt(approvedState, path)),
);
const acceptedTreeRecordsSha256 = sha256(Buffer.from(canonicalJson(acceptedTreeRecords)));
if (
  acceptedTreeRecords.length !== config.acceptedTreeRecordCount ||
  acceptedTreeRecords.length !== authority.acceptedTreeByteAuthority.acceptedRecords.recordCount ||
  acceptedTreeRecordsSha256 !== config.acceptedTreeRecordsRawJcsSha256 ||
  acceptedTreeRecordsSha256 !==
    authority.acceptedTreeByteAuthority.acceptedRecords.recordsRawJcsSha256
) {
  throw new Error(
    `ACCEPTED_TREE_RECORDS_CHANGED:${acceptedTreeRecords.length}:${acceptedTreeRecordsSha256}`,
  );
}
const acceptedTreePaths = acceptedTreeRecords.map((record) => record.path);

const materializedProductionBytes = (path) =>
  path === "apps/service/src/product/productStateStore.ts"
    ? Buffer.from("export function makeProductStateStore() { return null; }\n")
    : Buffer.from("export {};\n");
const exerciseAuthorizedRows = (snapshot, work, phase) => {
  const block = worksById.get(work);
  if (!block) throw new Error(`FIXTURE_AUTHORIZED_WORK_INVALID:${work}`);
  for (const entry of block.production) {
    const approved = approvedProductionStateByPath.get(entry.path);
    if (approved?.presence === "present") {
      const current = snapshot.bytesAt(entry.path);
      const mode = snapshot.tree.get(entry.path)?.mode;
      if (current === null || mode !== approved.mode)
        throw new Error(`FIXTURE_AUTHORIZED_BASE_INVALID:${entry.path}`);
      snapshot.install(
        entry.path,
        Buffer.concat([
          current,
          Buffer.from(
            entry.path.endsWith(".json") ? "\n " : `\n// v9-authorized-${work}-${phase}\n`,
          ),
        ]),
        mode,
        `authorized-${work}-${phase}`,
      );
    } else if (productionMaterializationByIdentity.has(`${work}\0${entry.path}`)) {
      snapshot.install(
        entry.path,
        materializedProductionBytes(entry.path),
        "100644",
        `authorized-${work}-${phase}`,
      );
    }
  }
  for (const row of verificationRowsByWork.get(work) ?? []) {
    if (row.approvedPresence === "present") {
      const current = snapshot.bytesAt(row.path);
      if (current === null || snapshot.tree.get(row.path)?.mode !== row.approvedMode)
        throw new Error(`FIXTURE_AUTHORIZED_BASE_INVALID:${row.path}`);
      snapshot.install(
        row.path,
        Buffer.concat([current, Buffer.from(`\n// v9-verification-${work}-${phase}\n`)]),
        row.approvedMode,
        `authorized-${work}-${phase}`,
      );
    } else if (
      row.firstMaterializationWork === work ||
      row.allowedLifecycle ===
        "modify-after-required-prior-materialization-preserve-presence-and-mode"
    ) {
      snapshot.install(
        row.path,
        Buffer.from(`export {};\n// v9-verification-${work}-${phase}\n`),
        row.firstMaterializationMode,
        `authorized-${work}-${phase}`,
      );
    }
  }
};
if (fixture?.exerciseAuthorizedRows === true) {
  if (!candidateWorkId) throw new Error("FIXTURE_AUTHORIZED_WORK_REQUIRED");
  exerciseAuthorizedRows(candidate, candidateWorkId, "candidate");
}

const sourceExtensions = new Set([".ts", ".tsx", ".mjs", ".js", ".cjs"]);
const parsedSources = sourceUniverse.filter(
  (path) => candidate.tree.has(path) && sourceExtensions.has(extname(path)),
);
const literalRecords = [];
for (const path of parsedSources) {
  const source = candidate.textAt(path);
  const file = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : path.endsWith(".ts")
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS,
  );
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      literalRecords.push({
        form: "import-declaration",
        source: path,
        specifier: node.moduleSpecifier.text,
      });
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      literalRecords.push({
        form: "export-declaration",
        source: path,
        specifier: node.moduleSpecifier.text,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
const sortedLiteralRecords = sortByJcsBytes(literalRecords);
const recordMultisetJcsSha256 = sha256(Buffer.from(canonicalJson(sortedLiteralRecords)));
const officialB0 = commit === config.baselineCommit && candidateWorkId === null;

const exportNames = (file) => {
  const names = new Set();
  for (const statement of file.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      !statement.moduleSpecifier &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        if (!element.isTypeOnly) names.add(element.propertyName?.text ?? element.name.text);
      }
    }
    if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression))
      names.add(statement.expression.text);
  }
  return names;
};
const observeDeclaration = (snapshot, row) => {
  const pathPresent = snapshot.tree.has(row.path);
  const matches = [];
  if (pathPresent) {
    const file = ts.createSourceFile(
      row.path,
      snapshot.textAt(row.path),
      ts.ScriptTarget.Latest,
      true,
      row.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const separatelyExported = exportNames(file);
    for (const statement of file.statements) {
      const modifiers = new Set((statement.modifiers ?? []).map((modifier) => modifier.kind));
      if (ts.isFunctionDeclaration(statement) && statement.name?.text === row.symbol) {
        matches.push({
          declarationKind: "named-function-declaration",
          disposition:
            modifiers.has(ts.SyntaxKind.ExportKeyword) || separatelyExported.has(row.symbol)
              ? "exported"
              : "module-private",
          signatureObservationSha256: sha256(Buffer.from(statement.getText(file))),
        });
      }
      if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations) {
          if (
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === row.symbol &&
            declaration.initializer
          ) {
            matches.push({
              declarationKind:
                ts.isArrowFunction(declaration.initializer) &&
                (statement.declarationList.flags & ts.NodeFlags.Const) !== 0
                  ? "const-arrow-function"
                  : "other-module-declaration",
              disposition:
                modifiers.has(ts.SyntaxKind.ExportKeyword) || separatelyExported.has(row.symbol)
                  ? "exported"
                  : "module-private",
              signatureObservationSha256: sha256(Buffer.from(statement.getText(file))),
            });
          }
        }
    }
  }
  if (matches.length > 1)
    throw new Error(`DECLARATION_CARDINALITY_INVALID:${row.path}#${row.symbol}`);
  const actual = matches[0] ?? null;
  return { pathPresent, actual };
};
const declarationRows = authority.capabilityDeclarations.rows.map((row) => {
  const { pathPresent, actual } = observeDeclaration(candidate, row);
  if (officialB0) {
    const expectedPresent = row.b0Presence === "present";
    if (Boolean(actual) !== expectedPresent)
      throw new Error(`DECLARATION_B0_PRESENCE_DRIFT:${row.path}#${row.symbol}`);
    if (
      actual &&
      (actual.declarationKind !== row.declarationKind ||
        actual.disposition !== row.dispositionWhenPresent)
    ) {
      throw new Error(`DECLARATION_B0_DISPOSITION_DRIFT:${row.path}#${row.symbol}`);
    }
  }
  return {
    path: row.path,
    symbol: row.symbol,
    declarationKind: row.declarationKind,
    b0Presence: row.b0Presence,
    dispositionWhenPresent: row.dispositionWhenPresent,
    firstMaterializationWork: row.firstMaterializationWork,
    pathPresent,
    present: Boolean(actual),
    actualDeclarationKind: actual?.declarationKind ?? null,
    actualDisposition: actual?.disposition ?? null,
    emittedSignature: actual
      ? { disposition: "observational", sha256: actual.signatureObservationSha256 }
      : null,
  };
});
if (
  officialB0 &&
  (parsedSources.length !== graphAuthority.baseline.presentParsedSourceCount ||
    sortedLiteralRecords.length !== graphAuthority.baseline.recordCount ||
    recordMultisetJcsSha256 !== graphAuthority.baseline.recordMultisetJcsSha256)
) {
  throw new Error(
    `B0_LITERAL_GRAPH_CHANGED:${parsedSources.length}:${sortedLiteralRecords.length}:${recordMultisetJcsSha256}`,
  );
}

const memberRecords = sourceUniverse.map((path) => {
  const entry = candidate.tree.get(path);
  return entry
    ? { path, present: true, mode: entry.mode, blobId: entry.object }
    : { path, present: false, mode: null, blobId: null };
});
const boundaryMemberRecords = frozenBoundaryUniverse.map((path) => {
  const entry = candidate.tree.get(path);
  return entry
    ? { path, present: true, mode: entry.mode, blobId: entry.object }
    : { path, present: false, mode: null, blobId: null };
});

const parseFrontMatter = (text, identity) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) throw new Error(`EVIDENCE_FRONT_MATTER_INVALID:${identity}`);
  const fields = new Map();
  for (const line of match[1].split("\n")) {
    const field = /^([a-z0-9_]+):\s*(?:"([^"]*)"|([^\s].*))$/.exec(line);
    if (!field || fields.has(field[1]))
      throw new Error(`EVIDENCE_FRONT_MATTER_INVALID:${identity}`);
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
const firstParentRange = (ancestor, descendant) => {
  const values = git(["rev-list", "--first-parent", "--reverse", `${ancestor}..${descendant}`])
    .toString("ascii")
    .trim()
    .split("\n")
    .filter(Boolean);
  const lineage = new Set(
    git(["rev-list", "--first-parent", descendant]).toString("ascii").trim().split("\n"),
  );
  if (!values.length || values.at(-1) !== descendant || !lineage.has(ancestor)) {
    throw new Error("EVIDENCE_FIRST_PARENT_ANCESTRY_INVALID");
  }
  return values;
};
const blobIdAt = (snapshot, path, diagnostic) => {
  const entry = snapshot.tree.get(path);
  if (!entry || entry.mode !== "100644" || entry.type !== "blob") throw new Error(diagnostic);
  return entry.object;
};
const transitionRows = [
  ...interfaceText.matchAll(
    /^\| `([^`]+)` \| accepted `([^`]+)` (?:meter )?candidate \| `handoffs\/([^`]+)\.md` \| `reviews\/([^`]+)\.md` \| ([^|]+) \|$/gm,
  ),
].map((match) => ({
  candidateWorkId: match[1],
  predecessorWorkId: match[2],
  handoffPath: `${BUNDLE_ROOT}/handoffs/${match[3]}.md`,
  reviewPath: `${BUNDLE_ROOT}/reviews/${match[4]}.md`,
  reportLabel: match[5].trim(),
}));
if (
  transitionRows.length !== 5 ||
  canonicalJson(transitionRows.map((row) => row.candidateWorkId)) !==
    canonicalJson([
      "direct-first-public-b1",
      "native-host-package-root-binding",
      "product-execution-leaf",
      "product-state-store",
      "product-execution-coordinator-facade",
    ]) ||
  transitionRows.some((row) => !worksById.has(row.candidateWorkId))
) {
  throw new Error("PREDECESSOR_AUTHORITY_INVALID");
}

const bootstrap = Object.freeze({
  evidenceCommitSha: V7_BOOTSTRAP_EVIDENCE,
  reviewedCandidateSha: "5c3e61999e1d406873c957dd9dbb6847cc2487b9",
  handoffCommitSha: "3d84708749ebeb1784b3243e2898de5623a89720",
  handoffPath: `${BUNDLE_ROOT}/handoffs/product-truth-complexity-v7.md`,
  reviewPath: `${BUNDLE_ROOT}/reviews/product-truth-complexity-v7.md`,
  handoffBlobId: "fd31a236709a8e2482571423ac1e414cd7d84b40",
  reviewBlobId: "fa047d2bf3c62ce87483cea86f6e0b1ed2362eea",
  reportSha256: "aa114aeb6239dffdc10ef8023ea3399bb9e8705f5960560e5766d80abe06b16c",
  implementerActorId: "product_truth_meter_v7_r5",
  reviewerActorId: "product_truth_meter_v7_review_r5",
  implementationReceipt: "10dd37a4714e4fed913d3863fe0166d1",
  reviewReceipt: "ac877c8dbc3a425b91129f153deb61f9",
});
const validateBootstrapEvidence = () => {
  if (evidenceCommit !== bootstrap.evidenceCommitSha) {
    throw new Error("OFFICIAL_EVIDENCE_SHA_NOT_ACCEPTED_V7_BOOTSTRAP");
  }
  const handoffBlobId = blobIdAt(evidence, bootstrap.handoffPath, "EVIDENCE_HANDOFF_BLOB_MISMATCH");
  const reviewBlobId = blobIdAt(evidence, bootstrap.reviewPath, "EVIDENCE_REVIEW_BLOB_MISMATCH");
  if (handoffBlobId !== bootstrap.handoffBlobId) throw new Error("EVIDENCE_HANDOFF_BLOB_MISMATCH");
  if (reviewBlobId !== bootstrap.reviewBlobId) throw new Error("EVIDENCE_REVIEW_BLOB_MISMATCH");
  const handoffText = evidence.textAt(bootstrap.handoffPath);
  const reviewText = evidence.textAt(bootstrap.reviewPath);
  const handoff = parseFrontMatter(handoffText, bootstrap.handoffPath);
  const review = parseFrontMatter(reviewText, bootstrap.reviewPath);
  const exactHandoff = {
    type: "Handoff",
    work: "../work/product-truth-complexity-v7.md",
    status: "DONE",
    actor_id: bootstrap.implementerActorId,
    dispatch_receipt: bootstrap.implementationReceipt,
  };
  const exactReview = {
    type: "Implementation Review",
    work: "../work/product-truth-complexity-v7.md",
    handoff: "../handoffs/product-truth-complexity-v7.md",
    verdict: "PASS",
    actor_id: bootstrap.reviewerActorId,
    dispatch_receipt: bootstrap.reviewReceipt,
    predecessor_receipt: bootstrap.implementationReceipt,
    predecessor_output: "../handoffs/product-truth-complexity-v7.md",
    reviewed_candidate: bootstrap.reviewedCandidateSha,
    reviewed_handoff_commit: bootstrap.handoffCommitSha,
  };
  for (const [field, value] of Object.entries(exactHandoff)) {
    if (handoff.get(field) !== value) throw new Error(`EVIDENCE_HANDOFF_FIELD_MISMATCH:${field}`);
  }
  for (const [field, value] of Object.entries(exactReview)) {
    if (review.get(field) !== value) throw new Error(`EVIDENCE_REVIEW_FIELD_MISMATCH:${field}`);
  }
  if (handoff.get("actor_id") === review.get("actor_id"))
    throw new Error("EVIDENCE_ACTOR_SEPARATION_INVALID");
  if (
    !isAncestor(bootstrap.reviewedCandidateSha, evidenceCommit) ||
    bootstrap.reviewedCandidateSha === evidenceCommit
  ) {
    throw new Error("EVIDENCE_ANCESTRY_INVALID");
  }
  const handoffDigests = [...handoffText.matchAll(/B0 JSON SHA-256\s+([0-9a-f]{64})/g)].map(
    (match) => match[1],
  );
  const reviewDigests = [...reviewText.matchAll(/full JSON SHA-256\s+`([0-9a-f]{64})`/g)].map(
    (match) => match[1],
  );
  if (
    handoffDigests.length !== 1 ||
    reviewDigests.length !== 1 ||
    handoffDigests[0] !== bootstrap.reportSha256 ||
    reviewDigests[0] !== bootstrap.reportSha256
  ) {
    throw new Error("EVIDENCE_REPORT_DIGEST_MISMATCH");
  }
  return {
    kind: "accepted-v7-measurement-bootstrap",
    candidateWorkId: FORMAT,
    candidateUnderTestSha: commit,
    officialPredecessorEvidenceSha: evidenceCommit,
    reviewedCandidateSha: bootstrap.reviewedCandidateSha,
    handoffPath: bootstrap.handoffPath,
    reviewPath: bootstrap.reviewPath,
    handoffBlobId,
    reviewBlobId,
    predecessorReportSha256: bootstrap.reportSha256,
    implementerActorId: handoff.get("actor_id"),
    reviewerActorId: review.get("actor_id"),
    reviewReceipt: review.get("dispatch_receipt"),
    identityAuthenticationClaimed: false,
  };
};
const validateProductEvidence = () => {
  const rows = transitionRows.filter((entry) => entry.candidateWorkId === candidateWorkId);
  if (rows.length !== 1) throw new Error("CANDIDATE_WORK_INVALID:not-one-authority-row");
  const row = rows[0];
  let syntheticDocuments = null;
  if (fixture?.syntheticProductEvidence === true) {
    const predecessorReport = loadPristineBootstrapReport();
    const reportSha256 = sha256(Buffer.from(canonicalJson(predecessorReport)));
    const declaredReportSha256 =
      fixture.syntheticReportDigestMismatch === true ? "0".repeat(64) : reportSha256;
    const reviewedCandidate = bootstrap.reviewedCandidateSha;
    const handoffText = `---\ntype: "Handoff"\nwork: "../work/product-truth-complexity-v9.md"\nstatus: "DONE"\nactor_id: "v9_fixture_implementer"\ndispatch_receipt: "v9fixtureimplementationreceipt"\nreviewed_candidate: "${reviewedCandidate}"\nreport_sha256: "${declaredReportSha256}"\n---\n\n# Synthetic v9 evidence fixture\n\n\`\`\`${REPORT_SCHEMA}\n${JSON.stringify(predecessorReport, null, 2)}\n\`\`\`\n`;
    const reviewText = `---\ntype: "Implementation Review"\nwork: "../work/product-truth-complexity-v9.md"\nhandoff: "../handoffs/product-truth-complexity-v9.md"\nverdict: "PASS"\nactor_id: "v9_fixture_reviewer"\ndispatch_receipt: "v9fixturereviewreceipt"\npredecessor_receipt: "v9fixtureimplementationreceipt"\npredecessor_output: "../handoffs/product-truth-complexity-v9.md"\nreviewed_candidate: "${reviewedCandidate}"\nreport_sha256: "${declaredReportSha256}"\n---\n\n# Synthetic v9 Review fixture\n`;
    syntheticDocuments = {
      [row.handoffPath]: Buffer.from(handoffText),
      [row.reviewPath]: Buffer.from(reviewText),
    };
    for (const [path, bytes] of Object.entries(syntheticDocuments)) {
      evidence.install(path, bytes, "100644", "synthetic-product-evidence");
      candidate.install(path, bytes, "100644", "synthetic-product-candidate");
    }
    evidence.install(
      "scripts/product-truth/measure-complexity-v9.mjs",
      scriptBytes,
      "100755",
      "synthetic-product-evidence",
    );
    evidence.install(
      "scripts/product-truth/complexity-universe-v9.json",
      configBytes,
      "100644",
      "synthetic-product-evidence",
    );
    candidate.install(
      "scripts/product-truth/measure-complexity-v9.mjs",
      scriptBytes,
      "100755",
      "synthetic-product-candidate",
    );
    candidate.install(
      "scripts/product-truth/complexity-universe-v9.json",
      configBytes,
      "100644",
      "synthetic-product-candidate",
    );
    applySnapshotMutation(
      evidence,
      fixture.syntheticEvidenceMutation,
      "synthetic-product-evidence",
    );
  }
  if (
    (evidenceCommit === bootstrap.evidenceCommitSha &&
      fixture?.syntheticProductEvidence !== true) ||
    evidenceCommit === "50deefc1f8e904805c5c990756f3048de33c7ad5"
  ) {
    throw new Error("CANDIDATE_CHOSEN_PREDECESSOR_FORBIDDEN");
  }
  const handoffBlobId = blobIdAt(evidence, row.handoffPath, "EVIDENCE_HANDOFF_BLOB_MISSING");
  const reviewBlobId = blobIdAt(evidence, row.reviewPath, "EVIDENCE_REVIEW_BLOB_MISSING");
  const handoffText = evidence.textAt(row.handoffPath);
  const reviewText = evidence.textAt(row.reviewPath);
  assertMachineBlockJsonKeys(handoffText, REPORT_SCHEMA, row.handoffPath);
  assertMachineBlockJsonKeys(reviewText, REPORT_SCHEMA, row.reviewPath);
  const handoff = parseFrontMatter(handoffText, row.handoffPath);
  const review = parseFrontMatter(reviewText, row.reviewPath);
  const predecessorWork = `../work/${row.predecessorWorkId}.md`;
  const predecessorHandoff = `../handoffs/${row.predecessorWorkId}.md`;
  if (
    handoff.get("type") !== "Handoff" ||
    handoff.get("status") !== "DONE" ||
    handoff.get("work") !== predecessorWork
  ) {
    throw new Error("EVIDENCE_HANDOFF_WORK_MISMATCH");
  }
  if (
    review.get("type") !== "Implementation Review" ||
    review.get("verdict") !== "PASS" ||
    review.get("work") !== predecessorWork ||
    review.get("handoff") !== predecessorHandoff ||
    review.get("predecessor_output") !== predecessorHandoff
  ) {
    throw new Error("EVIDENCE_REVIEW_BINDING_MISMATCH");
  }
  const reviewedCandidateSha = review.get("reviewed_candidate");
  if (
    !/^[0-9a-f]{40}$/.test(reviewedCandidateSha ?? "") ||
    handoff.get("reviewed_candidate") !== reviewedCandidateSha
  ) {
    throw new Error("EVIDENCE_REVIEWED_CANDIDATE_MISMATCH");
  }
  const implementerActorId = handoff.get("actor_id");
  const reviewerActorId = review.get("actor_id");
  if (!implementerActorId || !reviewerActorId || implementerActorId === reviewerActorId) {
    throw new Error("EVIDENCE_ACTOR_SEPARATION_INVALID");
  }
  if (
    !handoff.get("dispatch_receipt") ||
    review.get("predecessor_receipt") !== handoff.get("dispatch_receipt") ||
    !review.get("dispatch_receipt")
  )
    throw new Error("EVIDENCE_RECEIPT_CORRELATION_MISMATCH");
  if (
    !isAncestor(reviewedCandidateSha, evidenceCommit) ||
    reviewedCandidateSha === evidenceCommit ||
    !isAncestor(evidenceCommit, commit) ||
    evidenceCommit === commit
  )
    throw new Error("EVIDENCE_ANCESTRY_INVALID");
  const laterCommits = firstParentRange(evidenceCommit, commit);
  const commitsToInspect = syntheticDocuments ? [laterCommits.at(-1)] : laterCommits;
  for (const laterCommit of commitsToInspect) {
    const later = loadTree(laterCommit);
    if (syntheticDocuments)
      for (const [path, bytes] of Object.entries(syntheticDocuments)) {
        later.install(path, bytes, "100644", "synthetic-product-evidence");
      }
    if (syntheticDocuments && laterCommit === commit) {
      applySnapshotMutation(
        later,
        fixture.laterEvidenceMutation,
        "synthetic-product-evidence-later",
      );
    }
    if (
      blobIdAt(later, row.handoffPath, "EVIDENCE_HANDOFF_LATER_MISSING") !== handoffBlobId ||
      blobIdAt(later, row.reviewPath, "EVIDENCE_REVIEW_LATER_MISSING") !== reviewBlobId
    ) {
      throw new Error("EVIDENCE_BLOB_MUTATED_AFTER_SELECTION");
    }
  }
  const predecessorReport = extractMachineBlock(handoffText, REPORT_SCHEMA, row.handoffPath);
  if (predecessorReport.format !== FORMAT || predecessorReport.schema !== REPORT_SCHEMA) {
    throw new Error("EVIDENCE_REPORT_FORMAT_MISMATCH");
  }
  const evidenceScript = evidence.bytesAt("scripts/product-truth/measure-complexity-v9.mjs");
  const evidenceConfig = evidence.bytesAt("scripts/product-truth/complexity-universe-v9.json");
  const candidateScript = candidate.bytesAt("scripts/product-truth/measure-complexity-v9.mjs");
  const candidateConfig = candidate.bytesAt("scripts/product-truth/complexity-universe-v9.json");
  if (
    !evidenceScript?.equals(scriptBytes) ||
    !evidenceConfig?.equals(configBytes) ||
    !candidateScript?.equals(scriptBytes) ||
    !candidateConfig?.equals(configBytes) ||
    predecessorReport.instrument?.scriptSha256 !== sha256(scriptBytes) ||
    predecessorReport.instrument?.configSha256 !== sha256(configBytes)
  ) {
    throw new Error("EVIDENCE_V9_INSTRUMENT_MISMATCH");
  }
  if (
    predecessorReport.officialInvocation?.fixtureMode !== false ||
    predecessorReport.officialInvocation?.official !== true
  ) {
    throw new Error("EVIDENCE_REPORT_NOT_OFFICIAL_INVOCATION");
  }
  const firstRow = row.candidateWorkId === "direct-first-public-b1";
  const expectedReportCommit = firstRow ? config.baselineCommit : reviewedCandidateSha;
  if (predecessorReport.commit !== expectedReportCommit)
    throw new Error("EVIDENCE_REPORT_CANDIDATE_MISMATCH");
  if (!firstRow && predecessorReport.comparison?.candidateWorkId !== row.predecessorWorkId) {
    throw new Error("EVIDENCE_REPORT_WORK_MISMATCH");
  }
  const predecessorReportSha256 = sha256(Buffer.from(canonicalJson(predecessorReport)));
  if (
    handoff.get("report_sha256") !== predecessorReportSha256 ||
    review.get("report_sha256") !== predecessorReportSha256
  ) {
    throw new Error("EVIDENCE_REPORT_DIGEST_MISMATCH");
  }
  return {
    kind: "accepted-product-predecessor",
    candidateWorkId: row.candidateWorkId,
    predecessorWorkId: row.predecessorWorkId,
    candidateUnderTestSha: commit,
    officialPredecessorEvidenceSha: evidenceCommit,
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
    predecessorReport,
  };
};

const comparisonFixture = fixture?.compareToApprovedState === true;
if (commit === config.baselineCommit && candidateWorkId !== null && !comparisonFixture) {
  throw new Error("CANDIDATE_WORK_INVALID:not-allowed-for-official-b0");
}
const evidenceBinding =
  officialB0 || comparisonFixture ? validateBootstrapEvidence() : validateProductEvidence();
function loadPristineBootstrapReport() {
  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--ref",
      config.baselineCommit,
      "--predecessor-evidence",
      bootstrap.evidenceCommitSha,
    ],
    { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
  );
  if (result.status !== 0)
    throw new Error(`BOOTSTRAP_PREDECESSOR_REPORT_FAILED:${result.stderr.trim()}`);
  return parseJsonStrict(result.stdout, "bootstrap-predecessor-report");
}
const productionSourcePath = (path) => {
  if (!sourceExtensions.has(extname(path)) || !/^(?:apps|packages|scripts)\//.test(path))
    return false;
  return (
    !/(?:^|\/)(?:fixtures|test-fixtures|testSupport|snapshots|__snapshots__|e2e)(?:\/|$)/.test(
      path,
    ) &&
    !/(?:\.test|\.browser|\.spec)\.[^/]+$/.test(path) &&
    !/^scripts\/product-truth\/(?:measure-complexity(?:-v\d+)?\.mjs|fixtures\/)/.test(path) &&
    path !== "scripts/check-source-closure.mjs"
  );
};
let comparison = {
  hardGate: true,
  enabled: false,
  candidateWorkId: null,
  predecessorKind: evidenceBinding.kind,
};
let literalGraphDelta = {
  disposition: "observational",
  hardGateEnabled: false,
  compared: false,
  addedRecords: [],
  removedRecords: [],
};
if (comparisonFixture || evidenceBinding.kind === "accepted-product-predecessor") {
  const selectedWork = worksById.get(candidateWorkId);
  if (!selectedWork) throw new Error("CANDIDATE_WORK_INVALID:not-one-frozen-work");
  const predecessorReport = comparisonFixture
    ? loadPristineBootstrapReport()
    : evidenceBinding.predecessorReport;
  if (
    predecessorReport.format !== FORMAT ||
    predecessorReport.schema !== REPORT_SCHEMA ||
    !Array.isArray(predecessorReport.universe?.members) ||
    !Array.isArray(predecessorReport.declarations?.rows)
  ) {
    throw new Error("PREDECESSOR_REPORT_STRUCTURAL_SNAPSHOT_MISSING");
  }
  const predecessorLiteralRecords =
    predecessorReport.observations?.literalImportExportGraph?.records;
  if (!Array.isArray(predecessorLiteralRecords)) {
    throw new Error("PREDECESSOR_REPORT_STRUCTURAL_SNAPSHOT_MISSING");
  }
  const multisetDifference = (left, right) => {
    const remaining = new Map();
    for (const value of right) {
      const identity = canonicalJson(value);
      remaining.set(identity, (remaining.get(identity) ?? 0) + 1);
    }
    const difference = [];
    for (const value of left) {
      const identity = canonicalJson(value);
      const count = remaining.get(identity) ?? 0;
      if (count > 0) remaining.set(identity, count - 1);
      else difference.push(value);
    }
    return sortByJcsBytes(difference);
  };
  literalGraphDelta = {
    disposition: "observational",
    hardGateEnabled: false,
    compared: true,
    addedRecords: multisetDifference(sortedLiteralRecords, predecessorLiteralRecords),
    removedRecords: multisetDifference(predecessorLiteralRecords, sortedLiteralRecords),
  };
  const comparisonBaseSnapshot = comparisonFixture
    ? loadTree(config.approvedStateCommit)
    : evidence;
  if (fixture?.exerciseAuthorizedRows === true) {
    for (const row of verificationRowsByWork.get(candidateWorkId) ?? []) {
      if (
        row.allowedLifecycle ===
        "modify-after-required-prior-materialization-preserve-presence-and-mode"
      ) {
        comparisonBaseSnapshot.install(
          row.path,
          Buffer.from(`export {};\n// v9-verification-${candidateWorkId}-predecessor\n`),
          row.firstMaterializationMode,
          `authorized-${candidateWorkId}-predecessor`,
        );
      }
    }
  }
  applySnapshotMutation(
    comparisonBaseSnapshot,
    fixture?.predecessorMutation,
    `predecessor-${fixtureName ?? "official"}`,
  );
  const selectedProductionPaths = new Set(selectedWork.production.map((entry) => entry.path));
  const selectedVerificationRows = verificationRowsByWork.get(candidateWorkId) ?? [];
  const selectedVerificationByPath = new Map(
    selectedVerificationRows.map((row) => [row.path, row]),
  );
  const selectedPaths = new Set([...selectedProductionPaths, ...selectedVerificationByPath.keys()]);

  for (const row of authority.capabilityDeclarations.rows) {
    const before = observeDeclaration(comparisonBaseSnapshot, row).actual;
    const after = observeDeclaration(candidate, row).actual;
    if (
      after &&
      (after.declarationKind !== row.declarationKind ||
        after.disposition !== row.dispositionWhenPresent)
    ) {
      throw new Error(`DECLARATION_DISPOSITION_DRIFT:${row.path}#${row.symbol}`);
    }
    if (!before && after && candidateWorkId !== row.firstMaterializationWork) {
      throw new Error(
        `DECLARATION_FIRST_MATERIALIZATION_INVALID:${row.path}#${row.symbol}:${candidateWorkId}`,
      );
    }
    if (before && !after) throw new Error(`DECLARATION_PRESENCE_DRIFT:${row.path}#${row.symbol}`);
  }

  for (const path of boundaryAndVerificationPaths.filter((value) => !selectedPaths.has(value))) {
    const before = comparisonBaseSnapshot.tree.get(path) ?? null;
    const after = candidate.tree.get(path) ?? null;
    if (Boolean(before) !== Boolean(after)) throw new Error(`OUTSIDE_WORK_PRESENCE_DRIFT:${path}`);
    if (before?.mode !== after?.mode) throw new Error(`OUTSIDE_WORK_MODE_DRIFT:${path}`);
    if (before?.object !== after?.object) throw new Error(`OUTSIDE_WORK_BLOB_DRIFT:${path}`);
  }

  for (const path of acceptedTreePaths.filter((value) => !selectedPaths.has(value))) {
    const before = stateRecordAt(comparisonBaseSnapshot, path);
    const after = stateRecordAt(candidate, path);
    if (canonicalJson(before) !== canonicalJson(after)) {
      throw new Error(`ACCEPTED_TREE_OUTSIDE_SELECTED_DRIFT:${path}`);
    }
  }

  const changedStatusRecordsForSnapshots = (beforeSnapshot, afterSnapshot) =>
    sortedStrings(new Set([...beforeSnapshot.tree.keys(), ...afterSnapshot.tree.keys()]))
      .filter((path) => {
        const before = beforeSnapshot.tree.get(path) ?? null;
        const after = afterSnapshot.tree.get(path) ?? null;
        return (
          before?.mode !== after?.mode ||
          before?.type !== after?.type ||
          before?.object !== after?.object
        );
      })
      .map((path) => ({
        status: beforeSnapshot.tree.has(path) ? (afterSnapshot.tree.has(path) ? "M" : "D") : "A",
        path,
      }));
  const changedStatusRecordsFromGit = () => {
    const output = git([
      "diff",
      "--name-status",
      "-z",
      "--no-renames",
      evidenceCommit,
      commit,
      "--",
    ]);
    const decoded = decodeUtf8(output, "git-diff-name-status");
    if (!decoded.length) return [];
    const fields = decoded.split("\0");
    if (fields.at(-1) !== "") throw new Error("GIT_CHANGED_PATH_RECORD_INVALID:unterminated");
    fields.pop();
    if (fields.length % 2 !== 0) throw new Error("GIT_CHANGED_PATH_RECORD_INVALID:cardinality");
    const records = [];
    for (let index = 0; index < fields.length; index += 2) {
      const status = fields[index];
      const path = fields[index + 1];
      if (!/^[ADMT]$/.test(status) || !path)
        throw new Error("GIT_CHANGED_PATH_RECORD_INVALID:status-or-path");
      records.push({ status, path });
    }
    return records;
  };
  const changedStatusRecords =
    fixtureName === null
      ? changedStatusRecordsFromGit()
      : changedStatusRecordsForSnapshots(comparisonBaseSnapshot, candidate);
  const changedPaths = changedStatusRecords.map((record) => record.path);
  if (new Set(changedPaths).size !== changedPaths.length)
    throw new Error("GIT_CHANGED_PATH_RECORD_INVALID:duplicate-path");

  const selectedAuthorityFor = (path) => {
    const verificationRow = selectedVerificationByPath.get(path) ?? null;
    const production = selectedProductionPaths.has(path);
    if (!production && !verificationRow) return null;
    return { approved: stateRecordAt(approvedState, path), production, verificationRow };
  };
  for (const { status, path } of changedStatusRecords) {
    const selectedAuthority = selectedAuthorityFor(path);
    const before = comparisonBaseSnapshot.tree.get(path) ?? null;
    const after = candidate.tree.get(path) ?? null;
    if (!selectedAuthority) {
      if (status === "A") throw new Error(`UNLISTED_PATH:${path}`);
      if (status === "D") throw new Error(`OUTSIDE_WORK_DELETION:${path}`);
      if (before?.mode !== after?.mode) throw new Error(`OUTSIDE_WORK_MODE_DRIFT:${path}`);
      throw new Error(`OUTSIDE_WORK_BLOB_DRIFT:${path}`);
    }
    if (!after) throw new Error(`SELECTED_WORK_DELETION_FORBIDDEN:${path}`);
    const { approved, production, verificationRow } = selectedAuthority;
    if (approved.presence === "present") {
      if (!before) throw new Error(`SELECTED_WORK_UNAUTHORED_MATERIALIZATION:${path}`);
      if (before.mode !== approved.mode || after.mode !== approved.mode)
        throw new Error(`SELECTED_WORK_MODE_DRIFT:${path}`);
      continue;
    }
    const productionMaterialization = productionMaterializationByIdentity.get(
      `${candidateWorkId}\0${path}`,
    );
    const firstVerificationMaterialization =
      verificationRow?.firstMaterializationWork === candidateWorkId &&
      verificationRow.allowedLifecycle ===
        "first-materialize-then-modify-preserve-presence-and-mode";
    const laterVerificationModification =
      verificationRow?.allowedLifecycle ===
      "modify-after-required-prior-materialization-preserve-presence-and-mode";
    if (productionMaterialization || firstVerificationMaterialization) {
      const mode = productionMaterialization?.mode ?? verificationRow.firstMaterializationMode;
      if (before || after.mode !== mode)
        throw new Error(`SELECTED_WORK_FIRST_MATERIALIZATION_INVALID:${path}`);
      continue;
    }
    if (laterVerificationModification) {
      if (
        !before ||
        before.mode !== verificationRow.firstMaterializationMode ||
        after.mode !== verificationRow.firstMaterializationMode
      ) {
        throw new Error(`SELECTED_WORK_PRIOR_MATERIALIZATION_INVALID:${path}`);
      }
      continue;
    }
    throw new Error(`SELECTED_WORK_UNAUTHORED_MATERIALIZATION:${path}`);
  }

  comparison = {
    hardGate: true,
    enabled: true,
    candidateWorkId,
    predecessorKind: comparisonFixture ? "approved-state-fixture" : evidenceBinding.kind,
    predecessorReportSha256: sha256(Buffer.from(canonicalJson(predecessorReport))),
    selectedMemberCount: selectedPaths.size,
    selectedProductionMemberCount: selectedProductionPaths.size,
    selectedVerificationRowCount: selectedVerificationRows.length,
    allGitChangedPathCount: changedStatusRecords.length,
    allGitChangedPaths: changedStatusRecords,
    changedPathCommand:
      fixtureName === null
        ? ["git", "diff", "--name-status", "-z", "--no-renames", evidenceCommit, commit, "--"]
        : null,
    changedPathDefault: "reject",
    authorityExemptions: [],
    outsideMemberCount: boundaryAndVerificationPaths.filter((path) => !selectedPaths.has(path))
      .length,
    exactOutsideEquality: true,
    acceptedTreeOutsideSelectedEquality: true,
    graphGateEnabled: false,
    observationPromotion: false,
  };
}

const selectedTuple = Object.fromEntries(
  Object.entries(evidenceBinding).filter(
    ([key]) =>
      key !== "predecessorReport" &&
      !["kind", "predecessorWorkId", "identityAuthenticationClaimed"].includes(key),
  ),
);

const V7_INTERFACE_PATH = `${BUNDLE_ROOT}/interfaces/product-truth-complexity-v7.md`;
const dependencyAuthority = extractMachineBlock(
  authorityTree.textAt(V7_INTERFACE_PATH),
  "omp-flow-raw-effect-universe-v1",
  V7_INTERFACE_PATH,
);
if (sha256(Buffer.from(canonicalJson(dependencyAuthority))) !== config.dependencyAuthoritySha256) {
  throw new Error("DEPENDENCY_SOURCE_AUTHORITY_CHANGED");
}
const manifestPath = (path) =>
  path === "package.json" ||
  /^(?:apps|packages)\/[^/]+\/package\.json$/.test(path) ||
  path === "scripts/package.json";
const dependencyEffectRecords = sortByJcsBytes(
  dependencyAuthority.acceptedDependencyEffects.map((entry) => ({
    kind: "adopted-dependency-source",
    package: entry.package,
    locator: entry.locator,
    lockIdentity: entry.lockIntegrity ?? entry.lockedRevision,
    resolvedExports: entry.exports.map((value) => value.name),
    sourceClosureSha256: entry.sourceClosureSha256,
  })),
);
const candidateAcceptedTreeRecords = sortByJcsBytes(
  acceptedTreePaths.map((path) => stateRecordAt(candidate, path)),
);
const candidateAcceptedTreeRecordsSha256 = sha256(
  Buffer.from(canonicalJson(candidateAcceptedTreeRecords)),
);
if (
  !officialB0 &&
  !comparisonFixture &&
  !fixtureUsesBootstrapCandidate &&
  !fixtureUsesApprovedStateCandidate
) {
  const lockText = candidate.textAt("bun.lock");
  const unavailable = dependencyEffectRecords.filter(
    (entry) => !lockText.includes(entry.locator) || !lockText.includes(entry.lockIdentity),
  );
  if (unavailable.length)
    throw new Error(`DEPENDENCY_SOURCE_IDENTITY_UNAVAILABLE:${unavailable[0].package}`);
}

const historicalRecords = sortByJcsBytes(
  [...approvedState.tree.keys()].filter(historicalArtifactPath).map((path) => {
    const entry = approvedState.tree.get(path);
    const bytes = approvedState.bytesAt(path);
    return { path, mode: entry.mode, blobId: entry.object, sha256: sha256(bytes) };
  }),
);
const historicalArtifactsSha256 = sha256(Buffer.from(canonicalJson(historicalRecords)));
if (historicalArtifactsSha256 !== config.historicalArtifactsSha256) {
  throw new Error(`HISTORICAL_ARTIFACT_CONFIG_CHANGED:${historicalArtifactsSha256}`);
}
if (!officialB0 && !comparisonFixture && !fixtureUsesBootstrapCandidate)
  for (const expected of historicalRecords) {
    const entry = candidate.tree.get(expected.path);
    const bytes = candidate.bytesAt(expected.path);
    if (
      !entry ||
      bytes === null ||
      entry.mode !== expected.mode ||
      entry.object !== expected.blobId ||
      sha256(bytes) !== expected.sha256
    ) {
      throw new Error(`V1_V8_ARTIFACT_CHANGED:${expected.path}`);
    }
  }

const physicalLines = (text) =>
  text.length === 0 ? 0 : text.split(/\r?\n/).length - (text.endsWith("\n") ? 1 : 0);
const candidateManifestPaths = sortedStrings([...candidate.tree.keys()].filter(manifestPath));
const workspaceRoots = new Map();
for (const path of candidateManifestPaths) {
  const manifestText = candidate.textAt(path);
  const manifest = parseJsonStrict(manifestText, path);
  if (typeof manifest.name === "string")
    workspaceRoots.set(manifest.name, { directory: posix.dirname(path), manifest });
}
const firstStringLeaf = (value) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  for (const key of sortedStrings(Object.keys(value))) {
    const selected = firstStringLeaf(value[key]);
    if (selected !== null) return selected;
  }
  return null;
};
const sourceCandidatePaths = (base) => {
  const values = [base];
  if (extname(base)) {
    const without = base.slice(0, -extname(base).length);
    values.push(
      ...[".ts", ".tsx", ".mjs", ".js", ".cjs"].map((extension) => `${without}${extension}`),
    );
  } else {
    values.push(
      ...[".ts", ".tsx", ".mjs", ".js", ".cjs"].map((extension) => `${base}${extension}`),
    );
    values.push(
      ...[".ts", ".tsx", ".mjs", ".js", ".cjs"].map((extension) => `${base}/index${extension}`),
    );
  }
  return [...new Set(values.map((value) => posix.normalize(value)))];
};
const resolveLiteralRecord = (record) => {
  let candidates = [];
  if (record.specifier.startsWith(".")) {
    candidates = sourceCandidatePaths(posix.join(posix.dirname(record.source), record.specifier));
  } else {
    const parts = record.specifier.split("/");
    const packageName = record.specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
    const workspace = workspaceRoots.get(packageName);
    if (!workspace) return { ...record, resolution: "external-or-unresolved", target: null };
    const suffix = parts.slice(packageName.startsWith("@") ? 2 : 1).join("/");
    const exportKey = suffix ? `./${suffix}` : ".";
    const exportValue =
      workspace.manifest.exports && typeof workspace.manifest.exports === "object"
        ? (workspace.manifest.exports[exportKey] ??
          (exportKey === "." ? workspace.manifest.exports : null))
        : null;
    const declared =
      firstStringLeaf(exportValue) ??
      (!suffix
        ? (workspace.manifest.module ??
          workspace.manifest.main ??
          workspace.manifest.types ??
          "src/index.ts")
        : suffix);
    candidates = sourceCandidatePaths(
      posix.join(workspace.directory === "." ? "" : workspace.directory, declared),
    );
  }
  const target =
    candidates.find((path) => candidate.tree.has(path) && sourceUniverse.includes(path)) ?? null;
  return {
    ...record,
    resolution: target ? "resolved-universe-member" : "unresolved-observation",
    target,
  };
};
const resolvedLiteralRecords = sortByJcsBytes(sortedLiteralRecords.map(resolveLiteralRecord));
const graphNodes = parsedSources;
const graphEdges = [
  ...new Set(
    resolvedLiteralRecords
      .filter((entry) => entry.target !== null)
      .map((entry) => `${entry.source}\0${entry.target}`),
  ),
].map((identity) => {
  const [source, target] = identity.split("\0");
  return { source, target };
});
const adjacency = new Map(graphNodes.map((path) => [path, []]));
for (const edge of graphEdges) adjacency.get(edge.source)?.push(edge.target);
for (const [path, targets] of adjacency) adjacency.set(path, sortedStrings(new Set(targets)));
const indices = new Map();
const low = new Map();
const active = new Set();
const stack = [];
const components = [];
let nextIndex = 0;
const visitGraph = (node) => {
  indices.set(node, nextIndex);
  low.set(node, nextIndex);
  nextIndex += 1;
  stack.push(node);
  active.add(node);
  for (const target of adjacency.get(node) ?? []) {
    if (!indices.has(target)) {
      visitGraph(target);
      low.set(node, Math.min(low.get(node), low.get(target)));
    } else if (active.has(target)) low.set(node, Math.min(low.get(node), indices.get(target)));
  }
  if (low.get(node) !== indices.get(node)) return;
  const component = [];
  while (stack.length) {
    const member = stack.pop();
    active.delete(member);
    component.push(member);
    if (member === node) break;
  }
  const sorted = sortedStrings(component);
  if (sorted.length > 1 || (adjacency.get(sorted[0]) ?? []).includes(sorted[0]))
    components.push(sorted);
};
for (const node of graphNodes) if (!indices.has(node)) visitGraph(node);
const stronglyConnectedComponents = sortByJcsBytes(
  components.map((members) => ({
    disposition: "observational",
    hardGateEnabled: false,
    members,
  })),
);

const lineExtensions = new Set([...sourceExtensions, ".json", ".ps1"]);
const lineRecords = sourceUniverse
  .filter((path) => candidate.tree.has(path) && lineExtensions.has(extname(path)))
  .map((path) => ({
    path,
    lines: physicalLines(candidate.textAt(path)),
    category:
      path.startsWith("apps/") || path.startsWith("packages/")
        ? "steady-state-runtime"
        : "direct-rebuild-or-configuration",
  }));
const responsibilityPaths = [
  "apps/service/src/product/ProductControlPlane.ts",
  "apps/service/src/product/productStateStore.ts",
  "apps/service/src/product/productExecutionCoordinator.ts",
  "apps/service/src/product/productExecutionBoundary.ts",
  "apps/service/src/product/productExecutionGateway.ts",
];
const observationLines = {
  disposition: "observational",
  hardGateEnabled: false,
  changedScopeProduction: lineRecords.reduce((sum, entry) => sum + entry.lines, 0),
  steadyStateRuntime: lineRecords
    .filter((entry) => entry.category === "steady-state-runtime")
    .reduce((sum, entry) => sum + entry.lines, 0),
  responsibilitySlice: lineRecords
    .filter((entry) => responsibilityPaths.includes(entry.path))
    .reduce((sum, entry) => sum + entry.lines, 0),
  files: lineRecords,
};
const occurrenceCount = (text, value) => text.split(value).length - 1;
const productPath = "apps/service/src/product/ProductControlPlane.ts";
const gatewayPath = "apps/service/src/product/productExecutionGateway.ts";
const productText = candidate.tree.has(productPath) ? candidate.textAt(productPath) : "";
const productFile = ts.createSourceFile(
  productPath,
  productText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
let facadeOperationCount = 0;
let transactionCallCount = 0;
let volatileVariableCount = 0;
const transactionCountStart = productText.indexOf("const createWorkspace:");
const visitPhysical = (node) => {
  if (ts.isInterfaceDeclaration(node) && node.name.text === "ProductControlPlaneShape") {
    facadeOperationCount = node.members.filter(
      (member) => ts.isPropertySignature(member) || ts.isMethodSignature(member),
    ).length;
  }
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    ["runtimeCatalog", "preparedExecutions", "lastRuntimeCatalogObservationAt"].includes(
      node.name.text,
    )
  ) {
    volatileVariableCount += 1;
  }
  if (
    ts.isCallExpression(node) &&
    node.getStart(productFile) >= Math.max(0, transactionCountStart) &&
    ((ts.isIdentifier(node.expression) && node.expression.text === "withTransaction") ||
      (ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "withTransaction"))
  )
    transactionCallCount += 1;
  ts.forEachChild(node, visitPhysical);
};
visitPhysical(productFile);
const wsPath = "apps/service/src/wsRpc.ts";
const rpcOperations = new Set();
if (candidate.tree.has(wsPath)) {
  const wsFile = ts.createSourceFile(
    wsPath,
    candidate.textAt(wsPath),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const visitRpc = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "productRpcEffect"
    ) {
      const first = node.arguments[0];
      if (
        first &&
        ts.isCallExpression(first) &&
        ts.isPropertyAccessExpression(first.expression) &&
        first.expression.expression.getText(wsFile) === "productControlPlane"
      )
        rpcOperations.add(first.expression.name.text);
    }
    ts.forEachChild(node, visitRpc);
  };
  visitRpc(wsFile);
}
const monolithImporters = new Set();
for (const path of [...candidate.tree.keys()].filter(productionSourcePath)) {
  const text = candidate.textAt(path);
  const file = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : path.endsWith(".ts")
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS,
  );
  for (const statement of file.statements) {
    if (
      (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.startsWith(".")
    )
      continue;
    const base = posix.join(posix.dirname(path), statement.moduleSpecifier.text);
    if (sourceCandidatePaths(base).includes(productPath)) monolithImporters.add(path);
  }
}
const physicalObservations = {
  disposition: "observational",
  hardGateEnabled: false,
  productControlPlaneLines: physicalLines(productText),
  literalGatewayLines: candidate.tree.has(gatewayPath)
    ? physicalLines(candidate.textAt(gatewayPath))
    : 0,
  facadeOperationCount,
  uniqueProductRpcOperationCount: rpcOperations.size,
  productTableLiteralCount: new Set(
    [...sourceUniverse].flatMap((path) =>
      candidate.tree.has(path)
        ? [
            ...candidate
              .textAt(path)
              .matchAll(/CREATE TABLE IF NOT EXISTS\s+(?:["`\[])?(product_[A-Za-z0-9_]+)/g),
          ].map((match) => match[1])
        : [],
    ),
  ).size,
  transactionCallCount,
  volatileVariableCount,
  productionMonolithImporterCount: monolithImporters.size,
  productDatabaseConstructionTokenCount: occurrenceCount(productText, "SqliteClient"),
  productDurableStateTokenCount: occurrenceCount(productText, "durable"),
  nativeHostPackageLifecycleLiteralRecordCount: sortedLiteralRecords.filter(
    (entry) => entry.source.includes("native-host") && entry.specifier.includes("packageLifecycle"),
  ).length,
  compatibilityIdentityPresence: [
    "apps/web/src/composerDraftV2Transcode.ts",
    "apps/web/src/storageOriginUpgrade.ts",
    "apps/desktop/src/desktopStorageUpgrade.ts",
  ].map((path) => ({ path, present: candidate.tree.has(path) })),
};
const report = {
  format: FORMAT,
  schema: REPORT_SCHEMA,
  commit,
  observationalBaseline: officialB0,
  instrument: { scriptSha256: sha256(scriptBytes), configSha256: sha256(configBytes) },
  officialInvocation: {
    argv: [
      "node",
      "scripts/product-truth/measure-complexity-v9.mjs",
      ...(fixtureName ? ["--fixture", fixtureName] : []),
      ...(candidateWorkId ? ["--work", candidateWorkId] : []),
      "--ref",
      commit,
      "--predecessor-evidence",
      evidenceCommit,
    ],
    predecessorEvidenceArgumentCount: 1,
    fixtureMode: fixtureName !== null,
    official: fixtureName === null,
    environmentFallbackUsed: false,
    identityAuthenticationClaimed: false,
  },
  authority: {
    hardGate: true,
    authorityDesignCommit: config.authorityDesignCommit,
    approvedStateCommit: config.approvedStateCommit,
    authoritySha256,
    configSha256: sha256(configBytes),
    workBoundarySha256: config.workBoundarySha256,
    verificationRows: {
      rowCount: verificationRows.length,
      uniquePathCount: verificationPaths.length,
      rowsPerWork: verificationRowsPerWork,
      rowsJcsSha256: verificationRowsJcsSha256,
      rows: sortByJcsBytes(verificationRows),
    },
    hardFacts: authority.report.hardFacts,
    observationalFacts: authority.report.observationalFacts,
    explicitNonAuthority: authority.explicitNonAuthority,
    observationsPromoted: false,
  },
  evidence: {
    hardGate: true,
    transitionRows,
    selectedTuple,
    identityAuthenticationClaimed: false,
  },
  universe: {
    hardGate: true,
    source: "five-design-frozen-production-boundaries",
    candidateSelectedPathsUsed: false,
    workingTreeUsed: false,
    sourceUniverseMemberCount: sourceUniverse.length,
    sourceUniverseJcsSha256: sourceUniverseSha256,
    members: memberRecords,
    frozenBoundaryMemberCount: frozenBoundaryUniverse.length,
    frozenBoundaryMembers: boundaryMemberRecords,
    approvedProductionState: {
      recordCount: approvedProductionStateRecords.length,
      recordsRawJcsSha256: approvedProductionStateSha256,
      records: approvedProductionStateRecords,
    },
    approvedBoundaryAndVerificationState: {
      recordCount: approvedBoundaryAndVerificationRecords.length,
      presentCount: approvedBoundaryAndVerificationRecords.filter(
        (row) => row.presence === "present",
      ).length,
      absentCount: approvedBoundaryAndVerificationRecords.filter((row) => row.presence === "absent")
        .length,
      recordsRawJcsSha256: approvedBoundaryAndVerificationSha256,
      records: approvedBoundaryAndVerificationRecords,
    },
  },
  dependencies: {
    hardGate: true,
    hardGateScope: "accepted-tree-byte-and-external-tuple-authority",
    sourceAdoptionsJcsSha256: sourceAdoptionsSha256,
    inputsJcsSha256: acceptedTreeInputsSha256,
    acceptedTreeDerivationCount: acceptedTreeDerivations.length,
    acceptedTreeRecordCount: acceptedTreeRecords.length,
    acceptedTreeRecordsRawJcsSha256: acceptedTreeRecordsSha256,
    acceptedTreeRecords,
    candidateTreeRecordCount: candidateAcceptedTreeRecords.length,
    candidateTreeRecordsRawJcsSha256: candidateAcceptedTreeRecordsSha256,
    externalDependencyRecords: dependencyEffectRecords,
    semanticCapabilityVerdict: false,
  },
  immutableHistory: {
    hardGate: true,
    acceptedTreeManifestCount: historicalRecords.length,
    acceptedTreeManifestSha256: historicalArtifactsSha256,
    candidateChecked:
      !officialB0 &&
      !comparisonFixture &&
      !fixtureUsesBootstrapCandidate &&
      !fixtureUsesApprovedStateCandidate,
  },
  declarations: {
    hardGate: "identity-presence-disposition-first-materialization-only",
    rows: declarationRows,
  },
  observations: {
    disposition: "observational",
    literalImportExportGraph: {
      disposition: "observational",
      hardGateEnabled: false,
      presentParsedSourceCount: parsedSources.length,
      recordCount: sortedLiteralRecords.length,
      recordMultisetJcsSha256,
      records: sortedLiteralRecords,
      resolvedRecordCount: resolvedLiteralRecords.filter((entry) => entry.target !== null).length,
      resolvedRecordObservationSha256: sha256(Buffer.from(canonicalJson(resolvedLiteralRecords))),
      stronglyConnectedComponents,
      delta: literalGraphDelta,
    },
    lines: observationLines,
    physical: physicalObservations,
  },
  comparison,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
