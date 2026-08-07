#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, extname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const FORMAT = "product-truth-complexity-v7";
const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = dirname(scriptPath);
const repositoryRoot = resolve(scriptDirectory, "../..");
const configPath = resolve(scriptDirectory, "complexity-universe-v7.json");
const scriptBytes = readFileSync(scriptPath);
const configBytes = readFileSync(configPath);
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
const configText = decodeUtf8(configBytes, "complexity-universe-v7.json");
assertNoDuplicateJsonKeys(configText, "complexity-universe-v7.json");
const config = JSON.parse(configText);

const args = process.argv.slice(2);
const fixtureMode = args.length === 4 && args[0] === "--fixture" && args[2] === "--ref";
const fixtureName = fixtureMode ? args[1] : null;
const commit = fixtureMode ? args[3] : args.length === 2 && args[0] === "--ref" ? args[1] : null;
if (!commit || !/^[0-9a-f]{40}$/.test(commit) || (fixtureMode && !/^[a-z0-9-]+$/.test(fixtureName))) {
  throw new Error("Usage: measure-complexity-v7.mjs [--fixture <name>] --ref <lowercase-full-40-hex-commit>");
}
const fixture = fixtureMode
  ? JSON.parse(readFileSync(resolve(scriptDirectory, "fixtures/complexity-v7", `${fixtureName}.json`), "utf8"))
  : null;

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
git(["cat-file", "-e", `${commit}^{commit}`]);
git(["cat-file", "-e", `${config.acceptedDesignCommit}^{commit}`]);

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
const dependencyAuthoritySnapshot = commit === config.baselineCommit ? loadTree(config.baselineCommit) : accepted;
const installVirtualFile = (path, bytes) => {
  const object = sha256(Buffer.concat([Buffer.from(`v7-fixture\0${path}\0`), bytes])).slice(0, 40);
  candidate.tree.set(path, { mode: "100644", type: "blob", object });
  candidate.blobs.set(object, bytes);
};
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
const measurementPathPattern = /^(?:scripts\/check-source-closure\.mjs|scripts\/product-truth\/(?:measure-complexity(?:-v[1-7])?\.mjs|complexity-universe-v[1-7]\.json|measure-complexity-v[2-7]\.test\.ts))$/;
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
    const literals = [];
    const computed = [];
    const visit = (node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
        ts.isStringLiteralLike(node.moduleSpecifier) ? literals.push(node.moduleSpecifier.text) : computed.push(node.getText(sourceFile(path)));
      } else if (ts.isImportEqualsDeclaration(node)) {
        const reference = node.moduleReference;
        if (ts.isExternalModuleReference(reference) && reference.expression && ts.isStringLiteralLike(reference.expression)) literals.push(reference.expression.text);
        else computed.push(node.getText(sourceFile(path)));
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const argument = node.arguments[0];
        ts.isStringLiteralLike(argument) ? literals.push(argument.text) : computed.push(node.getText(sourceFile(path)));
      } else if (ts.isImportTypeNode(node)) {
        const argument = node.argument;
        if (ts.isLiteralTypeNode(argument) && ts.isStringLiteralLike(argument.literal)) literals.push(argument.literal.text);
        else computed.push(node.getText(sourceFile(path)));
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile(path));
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
const collectDeclaredNames = (file) => {
  const names = new Set();
  const visit = (node) => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name && ts.isIdentifier(node.name)) names.add(node.name.text);
    if (ts.isImportClause(node) && node.name) names.add(node.name.text);
    if (ts.isImportSpecifier(node) || ts.isNamespaceImport(node)) names.add(node.name.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return names;
};
const normalizedGlobal = (node, declaredNames) => {
  const chain = expressionChain(node);
  if (!chain) return null;
  const wrappers = new Set(rawUniverse.globalAliasGrammar.wrappers);
  let { root } = chain;
  const members = [...chain.members];
  if (wrappers.has(root)) {
    const first = members.shift();
    if (!first || first.value === null || wrappers.has(first.value)) return { error: "invalid-global-wrapper" };
    const possibleReserved = rawUniverse.defaultDisposition.reservedRoots.some((reserved) => reserved === first.value || reserved.startsWith(`${first.value}.`));
    if (!possibleReserved) return null;
    if (declaredNames.has(root)) return { error: "shadowed-global-alias" };
    root = first.value;
  } else if (declaredNames.has(root)) {
    return null;
  }
  const possibleReserved = rawUniverse.defaultDisposition.reservedRoots.some((reserved) => reserved === root || reserved.startsWith(`${root}.`));
  if (!possibleReserved) return null;
  const firstUnknown = members.findIndex((member) => member.value === null);
  if (firstUnknown === 0) return { root, members, error: "computed-effect-selector" };
  if (firstUnknown > 0) return null;
  const reservedRoots = [...rawUniverse.defaultDisposition.reservedRoots].sort((left, right) => right.split(".").length - left.split(".").length);
  for (const reserved of reservedRoots) {
    const parts = reserved.split(".");
    const chainParts = [root, ...members.map((member) => member.value)];
    if (parts.every((part, index) => chainParts[index] === part)) {
      const terminalIndex = parts.length - 1;
      return { root: reserved, member: chainParts[terminalIndex + 1] ?? null, members, form: members.some((member) => member.form === "computed-literal") ? "computed-literal-member" : "global-member" };
    }
  }
  if (wrappers.has(chain.root)) return { error: "unresolved-global-alias" };
  return null;
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

const rawInventoryPaths = new Set(declaredProductionPaths.filter((path) => candidate.tree.has(path) && isProductionSource(path)));
for (const path of candidateGraph.paths.filter((candidatePath) => rawInventoryPaths.has(candidatePath))) {
  const file = candidateGraph.sourceFile(path);
  const declaredNames = collectDeclaredNames(file);
  const bindings = new Map();
  const declarationNodes = new Set();
  const bind = (name, identity, node) => {
    if (!identity?.classes?.length) return;
    bindings.set(name, identity);
    declarationNodes.add(node);
  };
  const collectBindings = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (node.importClause?.name) {
        const classes = classesForModuleExport(specifier, "default");
        if (acceptedEffectPackages.has(packageRoot(specifier)) && !classes) addViolation("UNKNOWN_DEPENDENCY_EFFECT_EXPORT", path, node.importClause.name, `${specifier}#default`);
        bind(node.importClause.name.text, { specifier, exported: "default", classes }, node.importClause.name);
      }
      const named = node.importClause?.namedBindings;
      if (named && ts.isNamespaceImport(named)) bind(named.name.text, { specifier, exported: "*", classes: moduleRootClasses.get(specifier), namespace: true }, named.name);
      if (named && ts.isNamedImports(named)) for (const element of named.elements) {
        const exported = element.propertyName?.text ?? element.name.text;
        const classes = classesForModuleExport(specifier, exported);
        if (acceptedEffectPackages.has(packageRoot(specifier)) && !classes) addViolation("UNKNOWN_DEPENDENCY_EFFECT_EXPORT", path, element, `${specifier}#${exported}`);
        bind(element.name.text, { specifier, exported, classes }, element.name);
      }
      if (specifier.endsWith(".node")) addViolation("UNKNOWN_NATIVE_ADDON", path, node, specifier);
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
      const specifier = node.moduleReference.expression.text;
      bind(node.name.text, { specifier, exported: "*", classes: moduleRootClasses.get(specifier), namespace: true }, node.name);
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
      if (specifier && ts.isIdentifier(node.name)) bind(node.name.text, { specifier, exported: "*", classes: moduleRootClasses.get(specifier), namespace: true }, node.name);
      if (specifier && ts.isObjectBindingPattern(node.name)) for (const element of node.name.elements) {
        if (!ts.isIdentifier(element.name)) continue;
        const exported = element.propertyName && (ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName)) ? element.propertyName.text : element.name.text;
        bind(element.name.text, { specifier, exported, classes: classesForModuleExport(specifier, exported) }, element.name);
      }
      if (ts.isIdentifier(node.name) && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression)) {
        const creator = bindings.get(node.initializer.expression.text);
        if (creator?.exported === "createRequire") bind(node.name.text, { specifier: "createRequire", exported: "result", classes: ["ambient-loader"], loader: true }, node.name);
      }
    }
    ts.forEachChild(node, collectBindings);
  };
  collectBindings(file);
  let aliasChanged = true;
  while (aliasChanged) {
    aliasChanged = false;
    const visit = (node) => {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isIdentifier(node.name) && ts.isIdentifier(node.initializer) && bindings.has(node.initializer.text) && !bindings.has(node.name.text)) {
          bind(node.name.text, bindings.get(node.initializer.text), node.name); aliasChanged = true;
        }
        if (ts.isIdentifier(node.name) && (ts.isPropertyAccessExpression(node.initializer) || ts.isElementAccessExpression(node.initializer)) &&
            ts.isIdentifier(node.initializer.expression) && bindings.get(node.initializer.expression.text)?.namespace) {
          const member = staticMember(node.initializer);
          if (member.value === null) addViolation("COMPUTED_EFFECT_SELECTOR", path, node.initializer, node.initializer.getText(file));
          else if (!bindings.has(node.name.text)) {
            const base = bindings.get(node.initializer.expression.text);
            bind(node.name.text, { specifier: base.specifier, exported: member.value, classes: classesForModuleExport(base.specifier, member.value), form: member.form }, node.name);
            aliasChanged = true;
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  const exportedNames = new Set();
  const collectExports = (node) => {
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) exportedNames.add(element.propertyName?.text ?? element.name.text);
    }
    if ((ts.isVariableStatement(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
        ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations) if (ts.isIdentifier(declaration.name)) exportedNames.add(declaration.name.text);
      else if (node.name) exportedNames.add(node.name.text);
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
  for (const name of exportedNames) if (bindings.has(name)) addViolation("RAW_BINDING_EXPORTED", path, file, name);
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
    if (!allowed || invalidClasses.length) addViolation("RAW_EFFECT_OWNER_INVALID", path, node, site);
  };
  const visitUses = (node) => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (!argument || !ts.isStringLiteralLike(argument)) addViolation("COMPUTED_LOADER_TARGET", path, node, node.getText(file));
      else record(node, { specifier: "import", exported: argument.text, classes: ["ambient-loader"] }, "dynamic-import-call");
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["eval", "Function"].includes(node.expression.text) && !declaredNames.has(node.expression.text)) {
      addViolation("FORBIDDEN_AMBIENT_LOADER", path, node, node.expression.text);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "process" && node.expression.name.text === "getBuiltinModule") {
      if (!node.arguments[0] || !ts.isStringLiteralLike(node.arguments[0])) addViolation("COMPUTED_LOADER_TARGET", path, node, node.getText(file));
      record(node, { specifier: "process", exported: "getBuiltinModule", classes: ["ambient-loader"] }, "process-get-builtin-module-call");
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && bindings.get(node.expression.text)?.loader) {
      const argument = node.arguments[0];
      if (!argument || !ts.isStringLiteralLike(argument)) addViolation("COMPUTED_LOADER_TARGET", path, node, node.getText(file));
      else {
        const targetClasses = moduleRootClasses.get(argument.text) ?? [];
        record(node, { specifier: "createRequire", exported: argument.text, classes: [...new Set(["ambient-loader", ...targetClasses])] }, "create-require-result-call");
      }
    }
    if (ts.isIdentifier(node) && bindings.has(node.text) && !declarationNodes.has(node)) {
      const parent = node.parent;
      if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
        const base = bindings.get(node.text);
        if (base.namespace) {
          const classes = classesForModuleExport(base.specifier, parent.name.text);
          record(parent, { specifier: base.specifier, exported: parent.name.text, classes }, "namespace-member");
        } else record(node, base, base.form ?? "import-declaration");
      } else if (ts.isElementAccessExpression(parent) && parent.expression === node) {
        const member = staticMember(parent);
        if (member.value === null) addViolation("COMPUTED_EFFECT_SELECTOR", path, parent, parent.getText(file));
        else {
          const base = bindings.get(node.text);
          record(parent, { specifier: base.specifier, exported: member.value, classes: classesForModuleExport(base.specifier, member.value) }, "computed-literal-member");
        }
      } else if (!(ts.isImportSpecifier(parent) || ts.isNamespaceImport(parent) || ts.isVariableDeclaration(parent))) {
        record(node, bindings.get(node.text), bindings.get(node.text).form ?? "destructure-binding");
      }
    }
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
      const normalized = normalizedGlobal(node.expression, declaredNames);
      if (normalized?.error) addViolation(normalized.error === "computed-effect-selector" ? "COMPUTED_EFFECT_SELECTOR" : "GLOBAL_ALIAS_INVALID", path, node.expression, normalized.error);
      else {
        const classes = classifyGlobal(normalized);
        if (classes) record(node.expression, { specifier: normalized.root, exported: normalized.member ?? "*", classes }, normalized.form ?? "global-identifier");
        else if (normalized?.root && normalized.member && ["eval", "Function", "_load", "binding", "_linkedBinding", "dlopen"].includes(normalized.member)) addViolation("UNKNOWN_RESERVED_SELECTOR", path, node.expression, normalized);
      }
    }
    ts.forEachChild(node, visitUses);
  };
  visitUses(file);
}
rawIngress.sort((left, right) => `${left.path}\0${String(left.line).padStart(8, "0")}\0${left.resolvedSymbol}`.localeCompare(`${right.path}\0${String(right.line).padStart(8, "0")}\0${right.resolvedSymbol}`));
const cFromPath = cMove.from.split("#")[0];
const cToPath = cMove.to.split("#")[0];
const cFromIngressCount = rawIngress.filter((entry) => entry.path === cFromPath && entry.classes.some((classId) => cMove.classes.includes(classId))).length;
const cToIngressCount = rawIngress.filter((entry) => entry.path === cToPath && entry.classes.some((classId) => cMove.classes.includes(classId))).length;
if (cFromIngressCount > 0 && cToIngressCount > 0) addViolation("RAW_OWNER_MOVE_OVERLAP", cToPath, null, { from: cMove.from, to: cMove.to });
rawViolations.sort((left, right) => `${left.code}\0${left.path}\0${String(left.line).padStart(8, "0")}`.localeCompare(`${right.code}\0${right.path}\0${String(right.line).padStart(8, "0")}`));
const rawIngressSha256 = sha256(Buffer.from(canonicalJson(rawIngress)));
const rawViolationSha256 = sha256(Buffer.from(canonicalJson(rawViolations)));
if (commit === config.baselineCommit &&
    (rawIngressSha256 !== config.baselineRawEffectInventory.ingressSha256 || rawViolationSha256 !== config.baselineRawEffectInventory.violationSha256)) {
  throw new Error(`B0_RAW_EFFECT_INVENTORY_CHANGED:${rawIngressSha256}:${rawViolationSha256}`);
}
if (commit !== config.baselineCommit && rawViolations.length) {
  throw new Error(`RAW_EFFECT_INGRESS_INVALID:${JSON.stringify(rawViolations.slice(0, 30))}`);
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
if (commit === config.baselineCommit) for (const [name, expected] of Object.entries(baselineExpected)) {
  if (anchors[name] !== expected) throw new Error(`B0_STABLE_COUNT_CHANGED:${name}:${anchors[name]}:${expected}`);
}

const reportBase = {
  format: FORMAT,
  commit,
  observationalBaseline: commit === config.baselineCommit,
  instrument: { scriptSha256: sha256(scriptBytes), configSha256: sha256(configBytes) },
  authority: {
    acceptedDesignCommit: config.acceptedDesignCommit,
    workBoundarySha256: Object.fromEntries(config.workBoundaries.map((entry) => [entry.work, entry.canonicalSha256])),
    rawEffectUniverseSha256: config.authorityBlocks["omp-flow-raw-effect-universe-v1"],
    effectIngressAuthoritySha256: config.authorityBlocks["omp-flow-effect-ingress-authority-v1"],
    b1VerifierUniverseSha256: config.authorityBlocks["omp-flow-b1-verifier-universe-v1"],
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
    ingressSha256: rawIngressSha256,
    ingress: rawIngress,
    violationSha256: rawViolationSha256,
    violations: rawViolations,
    ownerCounts: Object.fromEntries([...new Set(rawIngress.map((entry) => entry.path))].sort().map((path) => [path, rawIngress.filter((entry) => entry.path === path).length])),
    cOwnerMove: { from: cMove.from, to: cMove.to, fromIngressCount: cFromIngressCount, toIngressCount: cToIngressCount, exclusive: !(cFromIngressCount > 0 && cToIngressCount > 0) },
  },
  lines,
  anchors,
  imports: {
    edgeCount: importEdges.length,
    edges: importEdges,
    external: candidateGraph.external.filter((entry) => frozenMembership.has(entry.source)),
    stronglyConnectedComponents: graphComponents.filter((component) => component.length > 1),
  },
};

process.stdout.write(`${JSON.stringify(reportBase, null, 2)}\n`);
