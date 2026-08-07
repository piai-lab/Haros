#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, extname, isAbsolute, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const FORMAT = "product-truth-complexity-v3";
const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = dirname(scriptPath);
const repositoryRoot = resolve(scriptDirectory, "../..");
const repositoryPathForFileName = (fileName) => {
  const normalized = fileName.replaceAll("\\", "/");
  return isAbsolute(fileName) ? relative(repositoryRoot, fileName).replaceAll("\\", "/") : normalized;
};
const configPath = resolve(scriptDirectory, "complexity-universe-v3.json");
const scriptBytes = readFileSync(scriptPath);
const configBytes = readFileSync(configPath);
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
const configText = new TextDecoder("utf-8", { fatal: true }).decode(configBytes);
assertNoDuplicateJsonKeys(configText, "complexity-universe-v3.json");
const config = JSON.parse(configText);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const instrument = { scriptSha256: sha256(scriptBytes), configSha256: sha256(configBytes) };

const args = process.argv.slice(2);
const fixtureMode = args.length === 4 && args[0] === "--negative-fixture" && args[2] === "--ref";
const fixtureName = fixtureMode ? args[1] : null;
const commitArgument = fixtureMode ? args[3] : args[1];
if (
  (!fixtureMode && (args.length !== 2 || args[0] !== "--ref")) ||
  (fixtureMode && !/^[a-z0-9-]+$/.test(fixtureName)) ||
  !/^[0-9a-f]{40}$/.test(commitArgument)
) {
  throw new Error("Usage: measure-complexity-v3.mjs [--negative-fixture <name>] --ref <lowercase-full-40-hex-commit>");
}
const commit = commitArgument;
const negativeFixture = fixtureMode
  ? JSON.parse(readFileSync(resolve(scriptDirectory, "fixtures/complexity-v3", `${fixtureName}.json`), "utf8"))
  : null;
if (negativeFixture?.authorityMutation) {
  const mutation = negativeFixture.authorityMutation;
  if (mutation.kind === "omit-membership") {
    config.authority.frozenPathMembership = config.authority.frozenPathMembership.filter((path) => path !== mutation.path);
    config.authority.membershipSha256 = sha256(Buffer.from(JSON.stringify(config.authority.frozenPathMembership)));
  } else if (mutation.kind === "omit-work-rule") {
    const block = config.authority.normalizedWorkBlocks.find(({ work }) => work === mutation.work);
    if (!block) throw new Error("Malformed authority fixture Work.");
    block.production = block.production.filter((rule) => rule.path !== mutation.path);
    const normalized = { work: block.work, production: block.production, measurement: block.measurement, dependency: block.dependency };
    block.sha256 = sha256(Buffer.from(JSON.stringify(normalized)));
  } else if (mutation.kind === "change-design-sha") {
    config.authority.acceptedDesignCommit = mutation.sha;
  } else if (mutation.kind === "change-boundary-digest") {
    config.authority.boundarySetSha256 = "0".repeat(64);
  } else if (mutation.kind === "overlap-class") {
    const block = config.authority.normalizedWorkBlocks.find(({ work }) => work === mutation.work);
    block.measurement.push({ kind: "exact", path: mutation.path });
  } else {
    throw new Error("Unknown authority fixture mutation.");
  }
}
const git = (gitArgs, input) => {
  const result = spawnSync("git", gitArgs, {
    cwd: repositoryRoot,
    input,
    maxBuffer: 256 * 1024 * 1024,
    encoding: null,
  });
  if (result.status !== 0) {
    throw new Error(`git ${gitArgs[0]} failed (${result.status ?? "signal"})`);
  }
  return result.stdout;
};
git(["cat-file", "-e", `${commit}^{commit}`]);

const decodeUtf8 = (bytes, identity) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`Non-UTF-8 source blob in complexity universe: ${identity}`);
  }
};
const treeOutput = git(["ls-tree", "-rz", "--full-tree", commit]);
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
  if (headerEnd < 0) throw new Error("Truncated git cat-file header.");
  const header = batch.subarray(offset, headerEnd).toString("ascii");
  const match = /^([0-9a-f]{40}) blob (\d+)$/.exec(header);
  if (!match || match[1] !== requested) throw new Error("Unexpected git cat-file response.");
  const size = Number(match[2]);
  const start = headerEnd + 1;
  const end = start + size;
  if (batch[end] !== 10) throw new Error("Truncated git cat-file blob.");
  blobs.set(requested, batch.subarray(start, end));
  offset = end + 1;
}
for (const [path, content] of Object.entries(negativeFixture?.virtualFiles ?? {})) {
  const object = sha256(Buffer.from(`fixture\0${path}`)).slice(0, 40);
  tree.set(path, { mode: "100644", type: "blob", object });
  blobs.set(object, Buffer.from(content));
}
for (const [path, suffix] of Object.entries(negativeFixture?.appendToFiles ?? {})) {
  const existing = tree.get(path);
  if (!existing || existing.type !== "blob") throw new Error("Negative fixture append target is missing.");
  const object = sha256(Buffer.from(`fixture-append\0${path}`)).slice(0, 40);
  tree.set(path, { ...existing, object });
  blobs.set(object, Buffer.concat([blobs.get(existing.object), Buffer.from(suffix)]));
}
const bytesAt = (path) => {
  const entry = tree.get(path);
  if (!entry) return null;
  if (entry.mode === "120000" || entry.mode === "160000" || entry.type !== "blob") {
    throw new Error(`Non-regular tree identity in complexity universe: ${path}`);
  }
  if (entry.mode !== "100644" && entry.mode !== "100755") {
    throw new Error(`Unexpected git mode in complexity universe: ${path}`);
  }
  return blobs.get(entry.object);
};
const textAt = (path) => {
  const bytes = bytesAt(path);
  if (bytes === null) throw new Error(`Missing source blob: ${path}`);
  return decodeUtf8(bytes, path);
};

const stableJson = (value) => JSON.stringify(value);
const REQUIRED_WORK_CONCEPT_PATHS = [
  ".omp-flow/tasks/08-07-product-truth-consolidation/work/direct-first-public-b1.md",
  ".omp-flow/tasks/08-07-product-truth-consolidation/work/native-host-package-root-binding.md",
  ".omp-flow/tasks/08-07-product-truth-consolidation/work/product-execution-leaf.md",
  ".omp-flow/tasks/08-07-product-truth-consolidation/work/product-state-store.md",
  ".omp-flow/tasks/08-07-product-truth-consolidation/work/product-execution-coordinator-facade.md",
];
const boundaryGlobPattern = (pattern) => new RegExp(`^${pattern
  .replace(/[.+^${}()|[\]\\]/g, "\\$&")
  .replace(/\*\*/g, "\0")
  .replace(/\*/g, "[^/]*")
  .replace(/\0/g, ".*")}$`);
const safeRepositoryPath = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  !value.startsWith("/") &&
  !value.includes("\\") &&
  value.split("/").every((segment) => segment && segment !== "." && segment !== "..");
const exactObjectKeys = (value, expected, identity) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Malformed ${identity}.`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (stableJson(actual) !== stableJson(wanted)) {
    throw new Error(`Unknown or missing keys in ${identity}.`);
  }
};
const normalizeBoundaryRule = (rule, category, identity) => {
  if (rule?.kind === "exact") {
    exactObjectKeys(rule, ["kind", "path"], identity);
    if (!safeRepositoryPath(rule.path) || /[*?{}[\]]/.test(rule.path)) {
      throw new Error(`Unsafe exact path in ${identity}.`);
    }
    return { kind: "exact", path: rule.path };
  }
  if (rule?.kind === "design-glob" && category === "production") {
    exactObjectKeys(rule, ["kind", "pattern"], identity);
    if (!safeRepositoryPath(rule.pattern) || /[?{}[\]]/.test(rule.pattern)) {
      throw new Error(`Unsafe or unsupported glob in ${identity}.`);
    }
    return { kind: "design-glob", pattern: rule.pattern };
  }
  throw new Error(`Unsupported rule kind in ${identity}.`);
};
const extractBoundaryBlock = (conceptPath, expectedWork) => {
  const concept = decodeUtf8(git(["show", `${config.authority.acceptedDesignCommit}:${conceptPath}`]), conceptPath);
  const matches = [...concept.matchAll(/```omp-flow-production-boundary-v1\n([\s\S]*?)\n```/g)];
  if (matches.length !== 1) throw new Error(`Expected one machine boundary block in ${conceptPath}.`);
  let parsed;
  try {
    assertNoDuplicateJsonKeys(matches[0][1], conceptPath);
    parsed = JSON.parse(matches[0][1]);
  } catch {
    throw new Error(`Invalid machine boundary JSON in ${conceptPath}.`);
  }
  exactObjectKeys(parsed, ["work", "production", "measurement", "dependency"], `${conceptPath} block`);
  if (parsed.work !== expectedWork) throw new Error(`Work identity mismatch in ${conceptPath}.`);
  for (const category of ["production", "measurement", "dependency"]) {
    if (!Array.isArray(parsed[category])) throw new Error(`Malformed ${category} boundary in ${conceptPath}.`);
  }
  const normalized = {
    work: parsed.work,
    production: parsed.production.map((rule, index) => normalizeBoundaryRule(rule, "production", `${conceptPath}:production:${index}`)),
    measurement: parsed.measurement.map((rule, index) => normalizeBoundaryRule(rule, "measurement", `${conceptPath}:measurement:${index}`)),
    dependency: parsed.dependency.map((rule, index) => normalizeBoundaryRule(rule, "dependency", `${conceptPath}:dependency:${index}`)),
  };
  const seen = new Map();
  for (const category of ["production", "measurement", "dependency"]) {
    for (const rule of normalized[category]) {
      const identity = rule.kind === "exact" ? rule.path : `glob:${rule.pattern}`;
      if (seen.has(identity)) throw new Error(`Duplicate or overlapping boundary rule ${identity}.`);
      seen.set(identity, category);
    }
  }
  return normalized;
};
if (!/^[0-9a-f]{40}$/.test(config.authority?.acceptedDesignCommit ?? "")) {
  throw new Error("The accepted Design commit must be one immutable lowercase full SHA.");
}
git(["cat-file", "-e", `${config.authority.acceptedDesignCommit}^{commit}`]);
const expectedWorkPaths = config.authority.workConceptPaths;
if (!Array.isArray(expectedWorkPaths) || stableJson(expectedWorkPaths) !== stableJson(REQUIRED_WORK_CONCEPT_PATHS)) {
  throw new Error("The v3 authority must name exactly five unique Work Concepts.");
}
const extractedWorkBlocks = expectedWorkPaths.map((conceptPath) => {
  if (!safeRepositoryPath(conceptPath)) throw new Error("Unsafe Work Concept path in v3 authority.");
  const expectedWork = posix.basename(conceptPath, ".md");
  const normalized = extractBoundaryBlock(conceptPath, expectedWork);
  return { ...normalized, sha256: sha256(Buffer.from(stableJson(normalized))) };
});
if (stableJson(extractedWorkBlocks) !== stableJson(config.authority.normalizedWorkBlocks)) {
  throw new Error("The frozen config does not exactly match the accepted Design Work blocks.");
}
const boundarySetSha256 = sha256(Buffer.from(stableJson(extractedWorkBlocks.map(({ sha256: _digest, ...block }) => block))));
if (boundarySetSha256 !== config.authority.boundarySetSha256) {
  throw new Error("The frozen Work boundary-set digest is invalid.");
}
const designTreeOutput = git(["ls-tree", "-rz", "--full-tree", config.authority.acceptedDesignCommit]);
const designTreePaths = designTreeOutput.subarray(0, -1).toString("utf8").split("\0").map((entry) => entry.slice(entry.indexOf("\t") + 1));
const expandedDesignGlobs = extractedWorkBlocks.flatMap((block) =>
  block.production
    .filter((rule) => rule.kind === "design-glob")
    .map((rule) => ({
      work: block.work,
      pattern: rule.pattern,
      paths: designTreePaths.filter((path) => boundaryGlobPattern(rule.pattern).test(path)).sort(),
    })),
);
if (stableJson(expandedDesignGlobs) !== stableJson(config.authority.designTimeGlobExpansion)) {
  throw new Error("The frozen design-time glob expansion is invalid.");
}
const frozenPathMembership = config.authority.frozenPathMembership;
if (
  !Array.isArray(frozenPathMembership) ||
  stableJson(frozenPathMembership) !== stableJson([...new Set(frozenPathMembership)].sort()) ||
  frozenPathMembership.some((path) => !safeRepositoryPath(path)) ||
  sha256(Buffer.from(stableJson(frozenPathMembership))) !== config.authority.membershipSha256
) {
  throw new Error("The frozen v3 path membership is malformed or has the wrong digest.");
}
const dependencyIntegrity = (config.authority.dependencySnapshots ?? []).map((snapshot) => {
  exactObjectKeys(snapshot, ["path", "sha256"], `dependency snapshot ${snapshot?.path ?? "unknown"}`);
  const acceptedBytes = git(["show", `${config.authority.acceptedDesignCommit}:${snapshot.path}`]);
  if (sha256(acceptedBytes) !== snapshot.sha256) throw new Error(`The accepted dependency snapshot is invalid: ${snapshot.path}`);
  const candidateBytes = bytesAt(snapshot.path);
  return {
    path: snapshot.path,
    expectedSha256: snapshot.sha256,
    actualSha256: candidateBytes === null ? null : sha256(candidateBytes),
    status: candidateBytes !== null && sha256(candidateBytes) === snapshot.sha256 ? "exact" : "mismatch",
  };
});
if ((commit !== config.baselineCommit || negativeFixture?.enforceDependencyGate) && dependencyIntegrity.some(({ status }) => status !== "exact")) {
  throw new Error(`DEPENDENCY_INTEGRITY_INVALID: ${JSON.stringify(dependencyIntegrity)}`);
}

for (const [path, expected] of [
  ["scripts/product-truth/measure-complexity-v3.mjs", scriptBytes],
  ["scripts/product-truth/complexity-universe-v3.json", configBytes],
]) {
  const committed = bytesAt(path);
  if (committed !== null && !committed.equals(expected)) {
    throw new Error(`Frozen instrument differs from measured tree: ${path}`);
  }
}

const pathSegments = (path) => path.split("/");
const classification = (path) => {
  const rules = config.classification;
  if (new RegExp(rules.testNamePattern).test(path)) return "test";
  if (new RegExp(rules.browserTestNamePattern).test(path)) return "browser-test";
  if (pathSegments(path).some((segment) => rules.fixtureDirectorySegments.includes(segment))) return "fixture";
  if (
    pathSegments(path).some((segment) => rules.generatedDirectorySegments.includes(segment)) ||
    new RegExp(rules.generatedNamePattern).test(path)
  ) return "generated";
  if (rules.measurementFiles.includes(path)) return "measurement";
  if (path === rules.directToolRoot || path.startsWith(`${rules.directToolRoot}/`)) return "direct-tool";
  return "production";
};
const inRoot = (path, root) => path === root || path.startsWith(`${root}/`);
const globPattern = (pattern) => new RegExp(`^${pattern
  .replace(/[.+^${}()|[\]\\]/g, "\\$&")
  .replace(/\*\*/g, "\0")
  .replace(/\*/g, "[^/]*")
  .replace(/\0/g, ".*")}$`);
const physicalLines = (text) => text === "" ? 0 : text.split(/\r?\n/).length - (text.endsWith("\n") ? 1 : 0);
const requiredWorkIds = extractedWorkBlocks.map(({ work }) => work);
const measuredCategories = new Set(["production", "direct-tool"]);

const sourceExtensions = config.sourceExtensions;
const isSource = (path) => sourceExtensions.includes(extname(path));
const productionSourcePaths = [...tree.keys()].filter(
  (path) => isSource(path) && measuredCategories.has(classification(path)) && !path.startsWith("vendor/"),
);
const sourceText = new Map(productionSourcePaths.map((path) => [path, textAt(path)]));
const parsedSourceFiles = new Map();
let semanticProgramFiles = null;
let semanticTypeChecker = null;
const sourceFile = (path) => {
  const semantic = semanticProgramFiles?.get(path);
  if (semantic) return semantic;
  const existing = parsedSourceFiles.get(path);
  if (existing) return existing;
  const parsed = ts.createSourceFile(
    path,
    sourceText.get(path),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : path.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );
  parsedSourceFiles.set(path, parsed);
  return parsed;
};
const resolveRelative = (from, specifier) => {
  const base = posix.normalize(posix.join(posix.dirname(from), specifier));
  const candidates = sourceExtensions.includes(extname(base))
    ? [base]
    : [base, ...sourceExtensions.map((extension) => `${base}${extension}`), ...sourceExtensions.map((extension) => `${base}/index${extension}`)];
  return candidates.find((candidate) => tree.has(candidate));
};
const workspacePackages = new Map();
for (const path of [...tree.keys()].filter((candidate) => /^(?:apps|packages)\/[^/]+\/package\.json$|^scripts\/package\.json$/.test(candidate))) {
  const manifest = JSON.parse(textAt(path));
  if (typeof manifest.name === "string") {
    workspacePackages.set(manifest.name, { root: posix.dirname(path), manifest });
  }
}
const exportedTarget = (entry) => {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return null;
  for (const key of ["types", "import", "default", "require"]) {
    const candidate = exportedTarget(entry[key]);
    if (candidate) return candidate;
  }
  return null;
};
const resolveSpecifier = (from, specifier) => {
  if (specifier.startsWith(".")) {
    return { kind: "internal", target: resolveRelative(from, specifier) };
  }
  if (specifier.startsWith("~/")) {
    const target = from.startsWith("apps/web/")
      ? resolveRelative("apps/web/src/index.ts", `./${specifier.slice(2)}`)
      : undefined;
    return { kind: "internal", target };
  }
  const packageName = [...workspacePackages.keys()]
    .sort((left, right) => right.length - left.length)
    .find((name) => specifier === name || specifier.startsWith(`${name}/`));
  if (!packageName) return { kind: "external" };
  const workspacePackage = workspacePackages.get(packageName);
  const subpath = specifier === packageName ? "." : `.${specifier.slice(packageName.length)}`;
  const exportsMap = workspacePackage.manifest.exports;
  const entry = exportsMap && typeof exportsMap === "object" ? exportsMap[subpath] : null;
  const declared = exportedTarget(entry) ?? (subpath === "." ? workspacePackage.manifest.types : null);
  if (typeof declared !== "string") return { kind: "unresolved-workspace" };
  return {
    kind: "internal",
    target: resolveRelative(`${workspacePackage.root}/package.json`, declared),
  };
};
const importsFor = (path) => {
  const imports = [];
  const computed = [];
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (ts.isStringLiteralLike(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      else computed.push(node.getText());
    } else if (ts.isImportEqualsDeclaration(node)) {
      const reference = node.moduleReference;
      if (ts.isExternalModuleReference(reference) && reference.expression && ts.isStringLiteralLike(reference.expression)) imports.push(reference.expression.text);
      else computed.push(node.getText());
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument)) imports.push(argument.text);
      else computed.push(node.getText());
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require") {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument)) imports.push(argument.text);
      else computed.push(node.getText());
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      if (ts.isLiteralTypeNode(argument) && ts.isStringLiteralLike(argument.literal)) imports.push(argument.literal.text);
      else computed.push(node.getText());
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile(path));
  return { imports, computed };
};
const allInternalEdges = [];
const allExternalImports = [];
const allUnresolvedImports = [];
const allComputedImports = [];
const monolithImporters = new Set();
const monolithPath = config.anchors.productControlPlane;
for (const source of productionSourcePaths) {
  const parsed = importsFor(source);
  if (parsed.computed.length) allComputedImports.push({ source, count: parsed.computed.length });
  for (const specifier of parsed.imports) {
    const resolved = resolveSpecifier(source, specifier);
    if (resolved.kind === "external") {
      allExternalImports.push({ source, specifier });
      continue;
    }
    const target = resolved.target;
    if (!target) {
      allUnresolvedImports.push({ source, specifier, kind: resolved.kind });
      continue;
    }
    if (target === monolithPath && source !== monolithPath) monolithImporters.add(source);
    allInternalEdges.push({ source, target });
  }
}
const uniqueInternalEdges = [...new Map(allInternalEdges.map((edge) => [`${edge.source}\0${edge.target}`, edge])).values()];
const forbiddenProductAbstractionName = (name) =>
  /(?:Repository|Manager|Registry|MigrationPlatform)$/.test(name) ||
  /^(?:Pi|OpenCode).*Product.*(?:Plane|Store|Coordinator)$/.test(name);
const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowJs: true,
  checkJs: false,
  jsx: ts.JsxEmit.ReactJSX,
  resolveJsonModule: true,
  skipLibCheck: true,
  noEmit: true,
};
const compilerSourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const programRootPaths = productionSourcePaths.filter((path) => compilerSourceExtensions.has(extname(path)));
const defaultCompilerHost = ts.createCompilerHost(compilerOptions, true);
const candidateCompilerHost = {
  ...defaultCompilerHost,
  fileExists(fileName) {
    const normalized = repositoryPathForFileName(fileName);
    return sourceText.has(normalized) || tree.has(normalized) || defaultCompilerHost.fileExists(fileName);
  },
  readFile(fileName) {
    const normalized = repositoryPathForFileName(fileName);
    return sourceText.get(normalized) ?? (tree.has(normalized) ? textAt(normalized) : defaultCompilerHost.readFile(fileName));
  },
  getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile) {
    const normalized = repositoryPathForFileName(fileName);
    const content = sourceText.get(normalized);
    if (content !== undefined) {
      return ts.createSourceFile(
        normalized,
        content,
        languageVersion,
        true,
        normalized.endsWith(".tsx")
          ? ts.ScriptKind.TSX
          : normalized.endsWith(".ts")
            ? ts.ScriptKind.TS
            : normalized.endsWith(".json")
              ? ts.ScriptKind.JSON
              : ts.ScriptKind.JS,
      );
    }
    return defaultCompilerHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  },
  resolveModuleNames(moduleNames, containingFile) {
    const normalizedContaining = repositoryPathForFileName(containingFile);
    return moduleNames.map((specifier) => {
      const resolved = resolveSpecifier(normalizedContaining, specifier);
      if (resolved.kind === "internal" && resolved.target && (compilerSourceExtensions.has(extname(resolved.target)) || resolved.target.endsWith(".json"))) {
        const extension = resolved.target.endsWith(".tsx")
          ? ts.Extension.Tsx
          : resolved.target.endsWith(".ts")
            ? ts.Extension.Ts
            : resolved.target.endsWith(".json")
              ? ts.Extension.Json
              : ts.Extension.Js;
        return { resolvedFileName: resolved.target, extension, isExternalLibraryImport: false };
      }
      const fallback = ts.resolveModuleName(specifier, containingFile, compilerOptions, defaultCompilerHost).resolvedModule;
      return fallback;
    });
  },
};
const semanticProgram = ts.createProgram({ rootNames: programRootPaths, options: compilerOptions, host: candidateCompilerHost });
semanticProgramFiles = new Map(
  semanticProgram.getSourceFiles()
    .map((file) => [repositoryPathForFileName(file.fileName), file])
    .filter(([path]) => sourceText.has(path) && compilerSourceExtensions.has(extname(path))),
);
semanticTypeChecker = semanticProgram.getTypeChecker();
const semanticProgramSyntacticDiagnostics = semanticProgram.getSyntacticDiagnostics()
  .filter((diagnostic) =>
    diagnostic.file &&
    compilerSourceExtensions.has(extname(repositoryPathForFileName(diagnostic.file.fileName))) &&
    frozenPathMembership.includes(repositoryPathForFileName(diagnostic.file.fileName)),
  )
  .map((diagnostic) => ({
    path: repositoryPathForFileName(diagnostic.file.fileName),
    start: diagnostic.start ?? null,
    code: diagnostic.code,
  }));
if (semanticProgramSyntacticDiagnostics.length) {
  throw new Error(`SYNTACTIC_SOURCE_INVALID: ${JSON.stringify(semanticProgramSyntacticDiagnostics)}`);
}
const checkerSymbolIdentity = (node) => {
  const location = ts.isPropertyAccessExpression(node) ? node.name : node;
  let symbol = semanticTypeChecker.getSymbolAtLocation(location);
  if (!symbol) return null;
  if (symbol.flags & ts.SymbolFlags.Alias) {
    try { symbol = semanticTypeChecker.getAliasedSymbol(symbol); } catch { return null; }
  }
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (!declaration) return null;
  const source = repositoryPathForFileName(declaration.getSourceFile().fileName);
  if (!sourceText.has(source)) return null;
  return { kind: "symbol", module: null, path: source, symbol: symbol.getName() };
};
const loadGitTreeSnapshot = (treeCommit) => {
  const output = git(["ls-tree", "-rz", "--full-tree", treeCommit]);
  const entries = new Map();
  for (const rawEntry of output.subarray(0, -1).toString("utf8").split("\0")) {
    const match = /^(\d+) (\w+) ([0-9a-f]{40})\t([\s\S]+)$/.exec(rawEntry);
    if (!match) throw new Error("Malformed accepted Design tree entry.");
    entries.set(match[4], { mode: match[1], type: match[2], object: match[3] });
  }
  const ids = [...new Set([...entries.values()].filter((entry) => entry.type === "blob").map((entry) => entry.object))];
  const outputBatch = git(["cat-file", "--batch"], Buffer.from(`${ids.join("\n")}\n`));
  const contents = new Map();
  let cursor = 0;
  for (const requested of ids) {
    const headerEnd = outputBatch.indexOf(10, cursor);
    const header = outputBatch.subarray(cursor, headerEnd).toString("ascii");
    const match = /^([0-9a-f]{40}) blob (\d+)$/.exec(header);
    if (!match || match[1] !== requested) throw new Error("Unexpected accepted Design cat-file response.");
    const size = Number(match[2]);
    const start = headerEnd + 1;
    contents.set(requested, outputBatch.subarray(start, start + size));
    cursor = start + size + 1;
  }
  return {
    entries,
    text(path) {
      const entry = entries.get(path);
      if (!entry || entry.type !== "blob" || !["100644", "100755"].includes(entry.mode)) return null;
      return decodeUtf8(contents.get(entry.object), `${treeCommit}:${path}`);
    },
  };
};
const deriveAcceptedDesignMembership = () => {
  const snapshot = loadGitTreeSnapshot(config.authority.acceptedDesignCommit);
  const designSourcePaths = [...snapshot.entries.keys()].filter(
    (path) => isSource(path) && measuredCategories.has(classification(path)) && !path.startsWith("vendor/"),
  );
  const designSourceSet = new Set(designSourcePaths);
  const designWorkspacePackages = new Map();
  for (const path of [...snapshot.entries.keys()].filter((candidate) => /^(?:apps|packages)\/[^/]+\/package\.json$|^scripts\/package\.json$/.test(candidate))) {
    const text = snapshot.text(path);
    if (!text) continue;
    const manifest = JSON.parse(text);
    if (typeof manifest.name === "string") designWorkspacePackages.set(manifest.name, { root: posix.dirname(path), manifest });
  }
  const resolveDesignRelative = (from, specifier) => {
    const base = posix.normalize(posix.join(posix.dirname(from), specifier));
    const candidates = sourceExtensions.includes(extname(base))
      ? [base]
      : [base, ...sourceExtensions.map((extension) => `${base}${extension}`), ...sourceExtensions.map((extension) => `${base}/index${extension}`)];
    return candidates.find((candidate) => snapshot.entries.has(candidate));
  };
  const resolveDesignSpecifier = (from, specifier) => {
    if (specifier.startsWith(".")) return resolveDesignRelative(from, specifier);
    if (specifier.startsWith("~/")) {
      return from.startsWith("apps/web/") ? resolveDesignRelative("apps/web/src/index.ts", `./${specifier.slice(2)}`) : undefined;
    }
    const packageName = [...designWorkspacePackages.keys()]
      .sort((left, right) => right.length - left.length)
      .find((name) => specifier === name || specifier.startsWith(`${name}/`));
    if (!packageName) return null;
    const workspacePackage = designWorkspacePackages.get(packageName);
    const subpath = specifier === packageName ? "." : `.${specifier.slice(packageName.length)}`;
    const exportsMap = workspacePackage.manifest.exports;
    const entry = exportsMap && typeof exportsMap === "object" ? exportsMap[subpath] : null;
    const declared = exportedTarget(entry) ?? (subpath === "." ? workspacePackage.manifest.types : null);
    return typeof declared === "string" ? resolveDesignRelative(`${workspacePackage.root}/package.json`, declared) : undefined;
  };
  const designEdges = [];
  const designGenericAbstractionSites = [];
  for (const path of designSourcePaths) {
    const text = snapshot.text(path);
    const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith(".tsx") ? ts.ScriptKind.TSX : path.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    const specifiers = [];
    const visit = (node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
      else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) specifiers.push(node.arguments[0].text);
      else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require" && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) specifiers.push(node.arguments[0].text);
      else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteralLike(node.argument.literal)) specifiers.push(node.argument.literal.text);
      const declaredName =
        (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
        node.name && ts.isIdentifier(node.name)
          ? node.name.text
          : null;
      if (path.startsWith("apps/service/src/product/") && declaredName && forbiddenProductAbstractionName(declaredName)) {
        designGenericAbstractionSites.push({ path, symbol: declaredName });
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    for (const specifier of specifiers) {
      const target = resolveDesignSpecifier(path, specifier);
      if (target) designEdges.push({ source: path, target });
    }
  }
  const uniqueDesignEdges = [...new Map(designEdges.map((edge) => [`${edge.source}\0${edge.target}`, edge])).values()];
  const productionSeeds = extractedWorkBlocks.flatMap((block) => [
    ...block.production.filter((rule) => rule.kind === "exact").map((rule) => rule.path),
    ...expandedDesignGlobs.filter(({ work }) => work === block.work).flatMap(({ paths }) => paths),
  ]).filter((path) => snapshot.entries.has(path));
  const membership = new Set(productionSeeds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of uniqueDesignEdges) {
      if (membership.has(edge.source) && !membership.has(edge.target)) { membership.add(edge.target); changed = true; }
      if (membership.has(edge.target) && !membership.has(edge.source)) { membership.add(edge.source); changed = true; }
    }
  }
  for (const block of extractedWorkBlocks) {
    for (const rule of [...block.production, ...block.measurement, ...block.dependency]) {
      if (rule.kind === "exact") membership.add(rule.path);
    }
  }
  for (const path of config.classification.measurementFiles) membership.add(path);
  return {
    membership: [...membership].sort(),
    edges: uniqueDesignEdges.filter(({ source, target }) => membership.has(source) && membership.has(target))
      .sort((left, right) => `${left.source}\0${left.target}`.localeCompare(`${right.source}\0${right.target}`)),
    genericAbstractionSites: [...new Map(designGenericAbstractionSites.map((site) => [`${site.path}\0${site.symbol}`, site])).values()]
      .sort((left, right) => `${left.path}\0${left.symbol}`.localeCompare(`${right.path}\0${right.symbol}`)),
  };
};
const acceptedDesignAuthority = deriveAcceptedDesignMembership();
if (stableJson(acceptedDesignAuthority.membership) !== stableJson(frozenPathMembership)) {
  throw new Error("The frozen config path membership does not match the accepted Design-derived universe.");
}
const acceptedDesignEdgeSnapshot = {
  count: acceptedDesignAuthority.edges.length,
  sha256: sha256(Buffer.from(stableJson(acceptedDesignAuthority.edges))),
};
if (stableJson(acceptedDesignEdgeSnapshot) !== stableJson(config.authority.designTimeResolvedEdgeSnapshot)) {
  throw new Error("The accepted Design resolved-edge snapshot is invalid.");
}
const acceptedGenericSnapshot = {
  sites: acceptedDesignAuthority.genericAbstractionSites,
  sha256: sha256(Buffer.from(stableJson(acceptedDesignAuthority.genericAbstractionSites))),
};
if (stableJson(acceptedGenericSnapshot) !== stableJson(config.authority.genericAbstractionSnapshot)) {
  throw new Error("The accepted Design generic-abstraction snapshot is invalid.");
}
const materializedWorkCoverage = extractedWorkBlocks.map((block) => {
  const declaredPaths = block.production.filter((rule) => rule.kind === "exact").map((rule) => rule.path);
  const declaredGlobs = block.production.filter((rule) => rule.kind === "design-glob").map((rule) => rule.pattern);
  const frozenGlobPaths = expandedDesignGlobs.filter(({ work }) => work === block.work).flatMap(({ paths }) => paths);
  const candidateGlobMatches = [...tree.keys()].filter((path) => declaredGlobs.some((pattern) => globPattern(pattern).test(path)));
  const newlyMaterializedBoundedPaths = candidateGlobMatches.filter((path) => !frozenGlobPaths.includes(path)).sort();
  const materializedPaths = [...new Set([...declaredPaths.filter((path) => tree.has(path)), ...frozenGlobPaths.filter((path) => tree.has(path))])].sort();
  return {
    work: block.work,
    declaredPaths,
    declaredGlobs,
    materializedPaths,
    missingDeclaredPaths: declaredPaths.filter((path) => !tree.has(path)).sort(),
    globMatches: declaredGlobs.map((pattern) => ({
      pattern,
      paths: candidateGlobMatches.filter((path) => globPattern(pattern).test(path)).sort(),
    })),
    newlyMaterializedBoundedPaths,
  };
});
if (materializedWorkCoverage.some((entry) => entry.newlyMaterializedBoundedPaths.length)) {
  throw new Error(`A newly materialized bounded production path is not frozen: ${JSON.stringify(materializedWorkCoverage.flatMap((entry) => entry.newlyMaterializedBoundedPaths))}`);
}
if (negativeFixture?.designGlobProbe) {
  const probe = negativeFixture.designGlobProbe;
  const candidateMatches = [...tree.keys()].filter((path) => globPattern(probe.pattern).test(path));
  const createdMatches = candidateMatches.filter((path) => !probe.designTimePaths.includes(path));
  if (createdMatches.length) {
    throw new Error(`A candidate-created design-glob match is not frozen: ${JSON.stringify(createdMatches.sort())}`);
  }
}
const frozenMembership = new Set(frozenPathMembership);
for (const path of negativeFixture?.universeOmit ?? []) frozenMembership.delete(path);
const inUniverse = (path) => frozenMembership.has(path);
const candidateClosureGrowth = uniqueInternalEdges
  .filter(({ source, target }) => inUniverse(source) !== inUniverse(target))
  .sort((left, right) => `${left.source}\0${left.target}`.localeCompare(`${right.source}\0${right.target}`));
if (candidateClosureGrowth.length) {
  throw new Error(`CANDIDATE_CLOSURE_GROWTH: ${JSON.stringify(candidateClosureGrowth)}`);
}
const universePaths = frozenPathMembership.filter((path) => tree.has(path) && config.extensions.includes(extname(path))).sort();
const universeFiles = universePaths.map((path) => {
  const content = textAt(path);
  return { path, category: classification(path), lines: physicalLines(content), content };
});
const universeReportFiles = frozenPathMembership
  .filter((path) => config.extensions.includes(extname(path)))
  .map((path) => {
    const materialized = universeFiles.find((file) => file.path === path);
    return materialized
      ? { path, category: materialized.category, lines: materialized.lines, materialized: true }
      : { path, category: classification(path), lines: 0, materialized: false };
  });
const lines = {
  production: 0,
  steadyStateRuntime: 0,
  directRebuildTool: 0,
  tests: 0,
  browserTests: 0,
  fixtures: 0,
  measurement: 0,
};
for (const file of universeFiles) {
  if (file.category === "direct-tool") {
    lines.production += file.lines;
    lines.directRebuildTool += file.lines;
  } else if (file.category === "production") {
    lines.production += file.lines;
    lines.steadyStateRuntime += file.lines;
  }
}
const evidenceReportFiles = [...tree.keys()]
  .filter((path) => config.extensions.includes(extname(path)))
  .map((path) => ({ path, category: classification(path) }))
  .filter(({ category }) => ["test", "browser-test", "fixture", "measurement"].includes(category))
  .sort((left, right) => left.path.localeCompare(right.path))
  .map(({ path, category }) => ({ path, category, lines: physicalLines(textAt(path)) }));
for (const file of evidenceReportFiles) {
  if (file.category === "test") lines.tests += file.lines;
  else if (file.category === "browser-test") lines.browserTests += file.lines;
  else if (file.category === "fixture") lines.fixtures += file.lines;
  else if (file.category === "measurement") lines.measurement += file.lines;
}
const workOwnedProductionPaths = [...new Set(materializedWorkCoverage.flatMap(({ materializedPaths }) => materializedPaths))]
  .filter((path) => tree.has(path) && measuredCategories.has(classification(path)))
  .sort();
lines.workOwnedProduction = workOwnedProductionPaths.reduce((total, path) => total + physicalLines(textAt(path)), 0);
lines.workOwnedSteadyStateRuntime = workOwnedProductionPaths
  .filter((path) => classification(path) === "production")
  .reduce((total, path) => total + physicalLines(textAt(path)), 0);
const workCoverage = materializedWorkCoverage.map((report) => {
  const memberPaths = report.materializedPaths.filter((path) => inUniverse(path));
  const memberEdges = uniqueInternalEdges.filter(({ source, target }) => memberPaths.includes(source) || memberPaths.includes(target));
  return {
    ...report,
    uncoveredPaths: report.materializedPaths.filter((path) => !inUniverse(path)),
    resolvedInternalProductionImportClosure: {
      count: memberPaths.length,
      sha256: sha256(Buffer.from(`${memberPaths.join("\n")}\n`)),
      diagnosticEdgeCount: memberEdges.length,
      addedOutsideFrozenMembership: [],
    },
  };
});
if (workCoverage.some((entry) => entry.uncoveredPaths.length)) {
  throw new Error(`An allowed Work production path is omitted from the frozen universe: ${JSON.stringify(workCoverage.flatMap((entry) => entry.uncoveredPaths))}`);
}
const uniqueEdges = uniqueInternalEdges
  .filter((edge) => inUniverse(edge.source) && inUniverse(edge.target))
  .sort((left, right) => `${left.source}\0${left.target}`.localeCompare(`${right.source}\0${right.target}`));
const computedInUniverse = allComputedImports.filter(({ source }) => inUniverse(source));
const unresolvedInUniverse = allUnresolvedImports.filter(({ source }) => inUniverse(source));
const externalImports = allExternalImports.filter(({ source }) => inUniverse(source));
const forbiddenExternalImports = externalImports.filter(
  ({ specifier }) =>
    !config.externalImports.exact.includes(specifier) &&
    !config.externalImports.prefixes.some((prefix) => specifier.startsWith(prefix)),
);
if (computedInUniverse.length || unresolvedInUniverse.length || forbiddenExternalImports.length) {
  throw new Error(`Computed, unresolved, or non-allowlisted external import exists in the frozen complexity universe: ${JSON.stringify({ computedInUniverse, unresolvedInUniverse, forbiddenExternalImports })}`);
}
if (commit === config.authority.acceptedDesignCommit) {
  const snapshot = {
    count: uniqueEdges.length,
    sha256: sha256(Buffer.from(stableJson(uniqueEdges))),
  };
  if (stableJson(snapshot) !== stableJson(config.authority.designTimeResolvedEdgeSnapshot)) {
    throw new Error("The design-time resolved edge snapshot is invalid.");
  }
}
const boundedPrivateProductPaths = materializedWorkCoverage
  .find(({ work }) => work === "direct-first-public-b1")
  .materializedPaths.filter((path) => /\/(?:[^/]*FirstPublic[^/]*|[^/]*Fingerprint[^/]*)\.ts$/.test(path));
const boundedPrivateProductViolations = boundedPrivateProductPaths.filter(
  (path) => /Store|Coordinator/.test(posix.basename(path)) || /\b(?:ProductStateStore|ProductExecutionCoordinator)\b/.test(sourceText.get(path) ?? ""),
);
if (boundedPrivateProductViolations.length) {
  throw new Error(`A bounded first-public schema/fingerprint file exports a forbidden Store/Coordinator responsibility: ${JSON.stringify(boundedPrivateProductViolations)}`);
}
const outOfUniverseResponsibilitySites = [...sourceText.entries()]
  .filter(([path]) => classification(path) === "production" && !inUniverse(path))
  .flatMap(([path, content]) =>
    config.responsibilityMarkers
      .filter((marker) => new RegExp(`\\b${marker}\\b`).test(content))
      .map((marker) => ({ path, marker })),
  )
  .sort((left, right) => `${left.path}\0${left.marker}`.localeCompare(`${right.path}\0${right.marker}`));
if (outOfUniverseResponsibilitySites.length) {
  throw new Error(`An owned responsibility moved outside the frozen universe: ${JSON.stringify(outOfUniverseResponsibilitySites)}`);
}

const countCalls = (file, name, minimumPosition = 0) => {
  let count = 0;
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.getStart(file) >= minimumPosition && ts.isIdentifier(node.expression) && node.expression.text === name) count += 1;
    ts.forEachChild(node, visit);
  };
  visit(file);
  return count;
};
const productPath = config.anchors.productControlPlane;
const productFile = sourceFile(productPath);
const wsFile = sourceFile(config.anchors.wsRpc);
const productionText = [...sourceText.entries()].filter(([path]) => classification(path) === "production");
let facadeShapeMethods = 0;
let productTables = 0;
let volatileVariables = 0;
const productRpcMethods = new Set();
const visitAnchors = (node, owner) => {
  if (owner === "product" && ts.isInterfaceDeclaration(node) && node.name.text === config.anchors.facadeInterface) {
    facadeShapeMethods = node.members.filter((member) => ts.isPropertySignature(member) || ts.isMethodSignature(member)).length;
  }
  if (owner === "product" && ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    if (config.anchors.volatileSymbols.includes(node.name.text)) volatileVariables += 1;
    if (node.name.text === config.anchors.schemaVariable && node.initializer && ts.isNoSubstitutionTemplateLiteral(node.initializer)) {
      productTables = [...node.initializer.text.matchAll(/CREATE TABLE IF NOT EXISTS\s+(?:["`\[])?product_[A-Za-z0-9_]+(?:["`\]])?/g)].length;
    }
  }
  if (owner === "ws" && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "productRpcEffect") {
    const first = node.arguments[0];
    if (first && ts.isCallExpression(first) && ts.isPropertyAccessExpression(first.expression) && first.expression.expression.getText(wsFile) === "productControlPlane") {
      productRpcMethods.add(first.expression.name.text);
    }
  }
  ts.forEachChild(node, (child) => visitAnchors(child, owner));
};
visitAnchors(productFile, "product");
visitAnchors(wsFile, "ws");
productTables = new Set(
  productionText.flatMap(([, text]) =>
    [...text.matchAll(/CREATE TABLE IF NOT EXISTS\s+(?:["`\[])?(product_[A-Za-z0-9_]+)(?:["`\]])?/g)].map(
      (match) => match[1],
    ),
  ),
).size;
const anchors = {
  productControlPlaneLines: physicalLines(sourceText.get(productPath)),
  literalGatewayLines: physicalLines(sourceText.get(config.anchors.literalGateway)),
  facadeShapeMethods,
  uniqueProductRpcMethods: productRpcMethods.size,
  productTables,
  transactionWrapperCalls: countCalls(
    productFile,
    config.anchors.transactionFunction,
    sourceText.get(productPath).indexOf(config.anchors.transactionCountAfter),
  ),
  volatileVariables,
  productionMonolithImporters: monolithImporters.size,
};
if (commit === config.baselineCommit && !negativeFixture) {
  for (const [name, expected] of Object.entries(config.anchors.baselineExpected)) {
    if (anchors[name] !== expected) throw new Error(`B0 anchor mismatch for ${name}: ${anchors[name]} !== ${expected}`);
  }
}

const extractionSurface = {
  files: config.extractionSurface.forbiddenProductionFiles.filter((path) => tree.has(path)),
  symbols: config.extractionSurface.forbiddenProductionSymbols.flatMap((symbol) =>
    productionText.filter(([, text]) => new RegExp(`\\b${symbol}\\b`).test(text)).map(([path]) => ({ symbol, path })),
  ),
  imports: uniqueEdges.filter(({ target }) => config.extractionSurface.forbiddenImportBasenames.includes(posix.basename(target, extname(target)))),
};
const legacyRuntime = config.legacyRuntimeSymbols.flatMap((symbol) =>
  productionText.filter(([, text]) => text.includes(symbol)).map(([path]) => ({ symbol, path })),
);

const semanticConfiguration = config.semanticGates;
const databaseConstructionSites = [];
const durableStateMachineSites = [];
const literalGatewaySites = [];
const rawTransactionCallbackExports = [];
for (const [path] of productionText) {
  const file = sourceFile(path);
  const visit = (node) => {
    const declaredName =
      (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name && ts.isIdentifier(node.name)
        ? node.name.text
        : null;
    if (declaredName && semanticConfiguration.durableStateMachineSymbols.includes(declaredName)) {
      durableStateMachineSites.push({ path, symbol: declaredName });
    }
    if (declaredName && semanticConfiguration.literalGatewaySymbols.includes(declaredName)) {
      literalGatewaySites.push({ path, symbol: declaredName });
    }
    if (declaredName && semanticConfiguration.rawTransactionExportSymbols.includes(declaredName)) {
      const statement = ts.isVariableDeclaration(node) ? node.parent?.parent : node;
      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
      if (modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        rawTransactionCallbackExports.push({ path, symbol: declaredName });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

const localInitializers = new Map();
const importedBindings = new Map();
const localSemanticBindings = new Map();
const localIterableBindings = new Map();
for (const [path] of productionText) {
  const file = sourceFile(path);
  const initializers = new Map();
  const imports = new Map();
  const semanticBindings = [];
  const iterableBindings = new Map();
  const lexicalScope = (node) => {
    for (let current = node.parent; current; current = current.parent) {
      if (ts.isBlock(current) || ts.isSourceFile(current)) return current;
    }
    return file;
  };
  const collect = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      initializers.set(node.name.text, node.initializer);
      semanticBindings.push({
        name: node.name.text,
        value: node.initializer,
        position: node.getStart(file),
        scope: lexicalScope(node),
      });
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      !node.initializer &&
      ts.isVariableDeclarationList(node.parent) &&
      ts.isForOfStatement(node.parent.parent)
    ) {
      iterableBindings.set(node.name.text, node.parent.parent.expression);
    } else if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer) {
      for (const element of node.name.elements) {
        if (!ts.isIdentifier(element.name)) continue;
        const property = element.propertyName && (ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName))
          ? element.propertyName.text
          : element.name.text;
        semanticBindings.push({
          name: element.name.text,
          value: { kind: "property-alias", base: node.initializer, property },
          position: node.getStart(file),
          scope: lexicalScope(node),
        });
      }
    }
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const resolved = resolveSpecifier(path, node.moduleSpecifier.text);
      const target = resolved.kind === "internal" ? resolved.target : null;
      if (node.importClause?.name) {
        imports.set(node.importClause.name.text, {
          kind: "symbol",
          module: node.moduleSpecifier.text,
          path: target,
          symbol: "default",
        });
      }
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          imports.set(element.name.text, {
            kind: "symbol",
            module: node.moduleSpecifier.text,
            path: target,
            symbol: element.propertyName?.text ?? element.name.text,
          });
        }
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        imports.set(bindings.name.text, {
          kind: "namespace",
          module: node.moduleSpecifier.text,
          path: target,
        });
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(file);
  localInitializers.set(path, initializers);
  importedBindings.set(path, imports);
  localSemanticBindings.set(path, semanticBindings);
  localIterableBindings.set(path, iterableBindings);
}
const semanticBindingAt = (name, path, node) => {
  const file = sourceFile(path);
  const scopes = new Set();
  for (let current = node; current; current = current.parent) {
    if (ts.isBlock(current) || ts.isSourceFile(current)) scopes.add(current);
  }
  let selected = null;
  const position = node.getStart(file);
  for (const binding of localSemanticBindings.get(path) ?? []) {
    if (
      binding.name === name &&
      binding.position < position &&
      scopes.has(binding.scope) &&
      (!selected || binding.position > selected.position)
    ) selected = binding;
  }
  return selected?.value;
};
const semanticIdentity = (node, path, useNode = node, seen = new Set()) => {
  if (!node) return null;
  if (node.kind === "property-alias") {
    const base = semanticIdentity(node.base, path, useNode, seen);
    return base ? { kind: "property", base, symbol: node.property } : null;
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) {
    return semanticIdentity(node.expression, path, useNode, seen);
  }
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "bind") {
    return semanticIdentity(node.expression.expression, path, useNode, seen);
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require" && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
    return { kind: "namespace", module: node.arguments[0].text, path: null };
  }
  if (ts.isPropertyAccessExpression(node)) {
    const base = semanticIdentity(node.expression, path, useNode, seen);
    return base ? { kind: "property", base, symbol: node.name.text } : null;
  }
  if (!ts.isIdentifier(node)) return null;
  const identity = `${path}\0${node.text}`;
  if (seen.has(identity)) return null;
  const nextSeen = new Set(seen).add(identity);
  const local = semanticBindingAt(node.text, path, useNode);
  if (local && !ts.isArrowFunction(local) && !ts.isFunctionExpression(local)) {
    return semanticIdentity(local, path, useNode, nextSeen);
  }
  const imported = importedBindings.get(path)?.get(node.text);
  if (imported) return checkerSymbolIdentity(node) ?? imported;
  const checked = checkerSymbolIdentity(node);
  if (checked) return checked;
  return { kind: "symbol", module: null, path, symbol: node.text };
};
const terminalSemanticSymbol = (identity) => identity?.symbol ?? null;
const semanticCallTokens = [
  ...semanticConfiguration.databaseOpenerSymbols,
  ...semanticConfiguration.rawTransactionExportSymbols,
];
for (const [path] of productionText.filter(
  ([candidate, content]) =>
    semanticCallTokens.some((token) => content.includes(token)) ||
    semanticConfiguration.directProductDatabaseConstructionSites.some((site) => site.path === candidate),
)) {
  const file = sourceFile(path);
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const symbol = terminalSemanticSymbol(semanticIdentity(node.expression, path, node));
      if (semanticConfiguration.databaseOpenerSymbols.includes(symbol)) {
        databaseConstructionSites.push({
          path,
          line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
          kind: "opener-call",
          symbol,
        });
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const matched = semanticConfiguration.directProductDatabaseConstructionSites.find(
        (site) =>
          site.path === path &&
          site.constructor === terminalSemanticSymbol(semanticIdentity(node.expression, path, node)) &&
          node.arguments?.[0] &&
          new RegExp(site.argumentPattern).test(node.arguments[0].getText(file)),
      );
      if (matched) {
        databaseConstructionSites.push({
          path,
          line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
          kind: "direct-construction",
          symbol: matched.constructor,
        });
      }
    }
    if (ts.isVariableStatement(node) && node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        const target = terminalSemanticSymbol(semanticIdentity(declaration.initializer, path, declaration));
        if (semanticConfiguration.rawTransactionExportSymbols.includes(target)) {
          rawTransactionCallbackExports.push({ path, symbol: declaration.name.text, target });
        }
      }
    }
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      const resolved = node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)
        ? resolveSpecifier(path, node.moduleSpecifier.text)
        : null;
      for (const element of node.exportClause.elements) {
        const localName = element.propertyName?.text ?? element.name.text;
        const target = resolved?.kind === "internal" && resolved.target
          ? { kind: "symbol", path: resolved.target, symbol: localName }
          : semanticIdentity(element.propertyName ?? element.name, path, element);
        if (semanticConfiguration.rawTransactionExportSymbols.includes(terminalSemanticSymbol(target))) {
          rawTransactionCallbackExports.push({ path, symbol: element.name.text, target: terminalSemanticSymbol(target) });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
const staticString = (node, path, seen = new Set()) => {
  if (!node) return null;
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) {
    return staticString(node.expression, path, seen);
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticString(node.left, path, seen);
    const right = staticString(node.right, path, seen);
    return left === null || right === null ? null : `${left}${right}`;
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const expression = staticString(span.expression, path, seen);
      if (expression === null) return null;
      value += expression + span.literal.text;
    }
    return value;
  }
  if (!ts.isIdentifier(node)) return null;
  const identity = `${path}\0${node.text}`;
  if (seen.has(identity)) return null;
  const nextSeen = new Set(seen).add(identity);
  const local = localInitializers.get(path)?.get(node.text);
  if (local) return staticString(local, path, nextSeen);
  const imported = importedBindings.get(path)?.get(node.text);
  if (!imported) return null;
  const importedInitializer = localInitializers.get(imported.path)?.get(imported.symbol);
  return importedInitializer ? staticString(importedInitializer, imported.path, nextSeen) : null;
};
const possibleStaticStrings = (node, path, seen = new Set()) => {
  if (!node) return [];
  if (ts.isArrayLiteralExpression(node)) {
    return [...new Set(node.elements.flatMap((element) => possibleStaticStrings(element, path, seen)))];
  }
  if (
    ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)
  ) return possibleStaticStrings(node.expression, path, seen);
  if (ts.isIdentifier(node)) {
    const identity = `${path}\0${node.text}`;
    if (seen.has(identity)) return [];
    const nextSeen = new Set(seen).add(identity);
    const iterable = localIterableBindings.get(path)?.get(node.text);
    if (iterable) return possibleStaticStrings(iterable, path, nextSeen);
    const local = localInitializers.get(path)?.get(node.text);
    if (local) return possibleStaticStrings(local, path, nextSeen);
    const imported = importedBindings.get(path)?.get(node.text);
    const importedInitializer = imported && localInitializers.get(imported.path)?.get(imported.symbol);
    return importedInitializer ? possibleStaticStrings(importedInitializer, imported.path, nextSeen) : [];
  }
  const value = staticString(node, path, seen);
  return value === null ? [] : [value];
};
const productHint = (node, path, seen = new Set()) => {
  if (!node) return false;
  if (/product_/i.test(node.getText(sourceFile(path)))) return true;
  if (!ts.isIdentifier(node)) return false;
  const identity = `${path}\0${node.text}`;
  if (seen.has(identity)) return false;
  const nextSeen = new Set(seen).add(identity);
  const local = localInitializers.get(path)?.get(node.text);
  if (local && productHint(local, path, nextSeen)) return true;
  const imported = importedBindings.get(path)?.get(node.text);
  const importedInitializer = imported && localInitializers.get(imported.path)?.get(imported.symbol);
  return !!(importedInitializer && productHint(importedInitializer, imported.path, nextSeen));
};
const productWriteStatements = (sql) =>
  [...sql.matchAll(/\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|ALTER\s+TABLE)\s+(?:["`\[])?(product_[A-Za-z0-9_]+)(?:["`\]])?/gi)].map(
    (match) => ({ operation: match[1].replace(/\s+/g, " ").toUpperCase(), table: match[2] }),
  );
const functionSummaries = new Map();
for (const [path] of productionText) {
  const file = sourceFile(path);
  const candidates = [];
  const collect = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) candidates.push({ name: node.name.text, node, body: node.body });
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
      candidates.push({ name: node.name.text, node: node.initializer, body: node.initializer.body });
    }
    ts.forEachChild(node, collect);
  };
  collect(file);
  for (const candidate of candidates) {
    const parameters = candidate.node.parameters.map((parameter) => ts.isIdentifier(parameter.name) ? parameter.name.text : null);
    const matches = [];
    const inspect = (node) => {
      if (ts.isCallExpression(node)) {
        const symbol = terminalSemanticSymbol(semanticIdentity(node.expression, path, node));
        const argument = node.arguments[0];
        if (["exec", "prepare"].includes(symbol) && argument && ts.isIdentifier(argument)) {
          const parameterIndex = parameters.indexOf(argument.text);
          if (parameterIndex >= 0) matches.push({ kind: symbol, parameterIndex });
        }
      }
      if (
        node !== candidate.body &&
        (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node))
      ) return;
      ts.forEachChild(node, inspect);
    };
    inspect(candidate.body);
    const distinct = [...new Map(matches.map((match) => [`${match.kind}\0${match.parameterIndex}`, match])).values()];
    if (distinct.length === 1) functionSummaries.set(`${path}\0${candidate.name}`, distinct[0]);
  }
}
const callSqlExpression = (node, path, expectedKind) => {
  if (!node || !ts.isCallExpression(node)) return null;
  const identity = semanticIdentity(node.expression, path, node);
  if (terminalSemanticSymbol(identity) === expectedKind) return node.arguments[0] ?? null;
  const summary = identity?.path ? functionSummaries.get(`${identity.path}\0${identity.symbol}`) : null;
  if (summary?.kind === expectedKind) return node.arguments[summary.parameterIndex] ?? null;
  return null;
};
const productSqlWriterSites = [];
const unknownProductSqlWriterSites = [];
for (const [path] of productionText) {
  const file = sourceFile(path);
  const preparedBindings = [];
  const preparedRunBindings = [];
  const lexicalScope = (node) => {
    for (let current = node.parent; current; current = current.parent) {
      if (ts.isBlock(current) || ts.isSourceFile(current)) return current;
    }
    return file;
  };
  const collectPrepared = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const expression = callSqlExpression(node.initializer, path, "prepare");
      if (expression) preparedBindings.push({
        name: node.name.text,
        expression,
        position: node.getStart(file),
        scope: lexicalScope(node),
      });
      const runReceiver = node.initializer && ts.isPropertyAccessExpression(node.initializer) && node.initializer.name.text === "run"
        ? node.initializer.expression
        : node.initializer && ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression) && node.initializer.expression.name.text === "bind" && ts.isPropertyAccessExpression(node.initializer.expression.expression) && node.initializer.expression.expression.name.text === "run"
          ? node.initializer.expression.expression.expression
          : null;
      const runExpression = callSqlExpression(runReceiver, path, "prepare");
      if (runExpression) preparedRunBindings.push({
        name: node.name.text,
        expression: runExpression,
        position: node.getStart(file),
        scope: lexicalScope(node),
      });
    } else if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
      const run = node.name.elements.find((element) => (element.propertyName?.getText(file) ?? element.name.getText(file)) === "run");
      const runExpression = run ? callSqlExpression(node.initializer, path, "prepare") : null;
      if (run && ts.isIdentifier(run.name) && runExpression) preparedRunBindings.push({
        name: run.name.text,
        expression: runExpression,
        position: node.getStart(file),
        scope: lexicalScope(node),
      });
    }
    ts.forEachChild(node, collectPrepared);
  };
  collectPrepared(file);
  const preparedBindingAt = (name, node) => {
    const scopes = new Set();
    for (let current = node; current; current = current.parent) {
      if (ts.isBlock(current) || ts.isSourceFile(current)) scopes.add(current);
    }
    return preparedBindings
      .filter((binding) => binding.name === name && binding.position < node.getStart(file) && scopes.has(binding.scope))
      .sort((left, right) => right.position - left.position)[0]?.expression;
  };
  const preparedRunBindingAt = (name, node) => {
    const scopes = new Set();
    for (let current = node; current; current = current.parent) {
      if (ts.isBlock(current) || ts.isSourceFile(current)) scopes.add(current);
    }
    return preparedRunBindings
      .filter((binding) => binding.name === name && binding.position < node.getStart(file) && scopes.has(binding.scope))
      .sort((left, right) => right.position - left.position)[0]?.expression;
  };
  const recordSink = (node, expression, kind) => {
    const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
    const sql = staticString(expression, path);
    if (sql === null) {
      if (productHint(expression, path)) unknownProductSqlWriterSites.push({ path, line, kind });
      return;
    }
    const statements = productWriteStatements(sql);
    if (statements.length) productSqlWriterSites.push({ path, line, kind, statements });
  };
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const execExpression = callSqlExpression(node, path, "exec");
      if (execExpression) {
        recordSink(node, execExpression, "exec");
      } else if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "run") {
        const receiver = node.expression.expression;
        const expression = ts.isIdentifier(receiver)
          ? preparedBindingAt(receiver.text, node)
          : callSqlExpression(receiver, path, "prepare");
        if (expression) recordSink(node, expression, "prepare.run");
      } else if (ts.isIdentifier(node.expression)) {
        const expression = preparedRunBindingAt(node.expression.text, node);
        if (expression) recordSink(node, expression, "prepare.run-alias");
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
productSqlWriterSites.sort((a, b) => `${a.path}\0${String(a.line).padStart(8, "0")}\0${a.kind}`.localeCompare(`${b.path}\0${String(b.line).padStart(8, "0")}\0${b.kind}`));
unknownProductSqlWriterSites.sort((a, b) => `${a.path}\0${String(a.line).padStart(8, "0")}\0${a.kind}`.localeCompare(`${b.path}\0${String(b.line).padStart(8, "0")}\0${b.kind}`));
const productSqlWriterModules = [...new Set(productSqlWriterSites.map(({ path }) => path))].sort();
const productSqlViolationModules = [...new Set([...productSqlWriterSites, ...unknownProductSqlWriterSites].map(({ path }) => path))]
  .filter((path) => path !== semanticConfiguration.productStoreFile)
  .sort();
const productDatabaseNames = new Set(
  productionText.flatMap(([, text]) =>
    [...text.matchAll(/["']((?:product-state-v1|product)\.sqlite)["']/g)].map((match) => match[1]),
  ),
);
const durableStateMachineModules = [...new Set(durableStateMachineSites.map(({ path }) => path))].sort();
const declarationOwner = (node) => {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isConstructorDeclaration(current)) return "constructor";
    if ((ts.isMethodDeclaration(current) || ts.isFunctionDeclaration(current)) && current.name) return current.name.getText();
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && ts.isVariableDeclaration(current.parent) && ts.isIdentifier(current.parent.name)) return current.parent.name.text;
  }
  return "<module>";
};
const nativeHostClosure = new Set(
  productionSourcePaths.filter((path) => semanticConfiguration.nativeHostRoots.some((root) => inRoot(path, root))),
);
const nativeHostQueue = [...nativeHostClosure];
while (nativeHostQueue.length) {
  const source = nativeHostQueue.shift();
  for (const edge of uniqueInternalEdges.filter((candidate) => candidate.source === source)) {
    if (!nativeHostClosure.has(edge.target)) {
      nativeHostClosure.add(edge.target);
      nativeHostQueue.push(edge.target);
    }
  }
}
const semanticModule = (identity) => identity?.module ?? (identity?.base ? semanticModule(identity.base) : null);
const nativeHostFsMutationSites = [];
for (const [path] of productionText.filter(([candidate]) => nativeHostClosure.has(candidate))) {
  const file = sourceFile(path);
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const identity = semanticIdentity(node.expression, path, node);
      const callee = terminalSemanticSymbol(identity);
      if (["node:fs", "node:fs/promises"].includes(semanticModule(identity)) && semanticConfiguration.nativeHostFsMutators.includes(callee)) {
        const normalizedArguments = node.arguments.map((argument) => argument.getText(file).replace(/\s+/g, " ").trim());
        nativeHostFsMutationSites.push({
          path,
          line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
          owner: declarationOwner(node),
          callee,
          argumentDigest: sha256(Buffer.from(JSON.stringify(normalizedArguments))),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
nativeHostFsMutationSites.sort((a, b) => `${a.path}\0${a.owner}\0${a.callee}\0${a.argumentDigest}`.localeCompare(`${b.path}\0${b.owner}\0${b.callee}\0${b.argumentDigest}`));
const nativeHostMutationCounts = new Map();
for (const site of nativeHostFsMutationSites) {
  const key = `${site.path}\0${site.owner}\0${site.callee}\0${site.argumentDigest}`;
  nativeHostMutationCounts.set(key, (nativeHostMutationCounts.get(key) ?? 0) + 1);
}
const nativeHostPackageLifecycleWrites = nativeHostFsMutationSites.filter((site) => {
  const allowance = semanticConfiguration.nativeHostNonPackageWriteAllowlist.find(
    (entry) => entry.path === site.path && entry.owner === site.owner && entry.callee === site.callee && entry.argumentDigest === site.argumentDigest,
  );
  const key = `${site.path}\0${site.owner}\0${site.callee}\0${site.argumentDigest}`;
  return !allowance || nativeHostMutationCounts.get(key) > allowance.count;
});
const sortedDatabaseConstructionSites = databaseConstructionSites.sort((a, b) => `${a.path}\0${String(a.line).padStart(8, "0")}\0${a.symbol}`.localeCompare(`${b.path}\0${String(b.line).padStart(8, "0")}\0${b.symbol}`));
const sortedDurableStateMachineSites = durableStateMachineSites.sort((a, b) => `${a.path}\0${a.symbol}`.localeCompare(`${b.path}\0${b.symbol}`));
const sortedRawTransactionCallbackExports = rawTransactionCallbackExports.sort((a, b) => `${a.path}\0${a.symbol}`.localeCompare(`${b.path}\0${b.symbol}`));
const sortedProductDatabaseNames = [...productDatabaseNames].sort();
const sortedLiteralGatewaySites = literalGatewaySites.sort((a, b) => `${a.path}\0${a.symbol}`.localeCompare(`${b.path}\0${b.symbol}`));
const productTableNames = [...new Set(productionText.flatMap(([, text]) => [...text.matchAll(/CREATE TABLE IF NOT EXISTS\s+(?:["`\[])?(product_[A-Za-z0-9_]+)(?:["`\]])?/g)].map((match) => match[1])))].sort();
const semanticGates = {
  productDatabaseConstructionModuleCount: new Set(sortedDatabaseConstructionSites.map(({ path }) => path)).size,
  productDatabaseConstructionModules: [...new Set(sortedDatabaseConstructionSites.map(({ path }) => path))].sort(),
  productDatabaseConstructionSiteCount: sortedDatabaseConstructionSites.length,
  productDatabaseConstructionSites: sortedDatabaseConstructionSites,
  productSqlWriterModuleCount: productSqlWriterModules.length,
  productSqlWriterModules,
  productSqlWriterSiteCount: productSqlWriterSites.length,
  productSqlWriterSites,
  unknownProductSqlWriterSiteCount: unknownProductSqlWriterSites.length,
  unknownProductSqlWriterSites,
  productSqlWritersOutsideStore: productSqlViolationModules,
  productTableCount: productTableNames.length,
  productTableNames,
  durableStateMachineCount: sortedDurableStateMachineSites.length,
  durableStateMachineModules,
  durableStateMachineSites: sortedDurableStateMachineSites,
  nativeHostFsMutationSiteCount: nativeHostFsMutationSites.length,
  nativeHostFsMutationSites,
  nativeHostPackageLifecycleWriteCount: nativeHostPackageLifecycleWrites.length,
  nativeHostPackageLifecycleWrites,
  rawTransactionCallbackExportCount: sortedRawTransactionCallbackExports.length,
  rawTransactionCallbackExports: sortedRawTransactionCallbackExports,
  productDatabaseCount: sortedProductDatabaseNames.length,
  productDatabaseNames: sortedProductDatabaseNames,
  literalGatewayCount: sortedLiteralGatewaySites.length,
  literalGatewaySites: sortedLiteralGatewaySites,
};
const genericProductAbstractionSites = [];
for (const [path] of productionText.filter(([candidate]) => candidate.startsWith("apps/service/src/product/"))) {
  const file = sourceFile(path);
  const visit = (node) => {
    const declaredName =
      (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
      node.name && ts.isIdentifier(node.name)
        ? node.name.text
        : null;
    if (declaredName && forbiddenProductAbstractionName(declaredName)) {
      genericProductAbstractionSites.push({ path, symbol: declaredName });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
semanticGates.genericProductAbstractionSites = [...new Map(genericProductAbstractionSites.map((site) => [`${site.path}\0${site.symbol}`, site])).values()]
  .sort((left, right) => `${left.path}\0${left.symbol}`.localeCompare(`${right.path}\0${right.symbol}`));
const acceptedGenericKeys = new Set(config.authority.genericAbstractionSnapshot.sites.map((site) => `${site.path}\0${site.symbol}`));
const newGenericProductAbstractionSites = semanticGates.genericProductAbstractionSites.filter((site) => !acceptedGenericKeys.has(`${site.path}\0${site.symbol}`));
semanticGates.newGenericProductAbstractionSites = newGenericProductAbstractionSites;
if ((commit !== config.baselineCommit || negativeFixture?.enforceSemanticGates) && newGenericProductAbstractionSites.length) {
  throw new Error(`GENERIC_PRODUCT_ABSTRACTION_FORBIDDEN: ${JSON.stringify(newGenericProductAbstractionSites)}`);
}

const canonicalResolver = config.productDatabaseComposition.canonicalResolver;
const productIdentityTokens = config.productDatabaseComposition.databaseIdentityTokens;
const isCanonicalResolverIdentity = (identity) =>
  identity?.kind === "symbol" && identity.path === canonicalResolver.path && identity.symbol === canonicalResolver.symbol;
const functionDefinitions = new Map();
for (const [path] of productionText) {
  const file = sourceFile(path);
  const collect = (node) => {
    let name = null;
    let callable = null;
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      name = node.name.text;
      callable = node;
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      name = node.name.text;
      callable = node.initializer;
    }
    if (name && callable) {
      const returns = [];
      if (ts.isArrowFunction(callable) && !ts.isBlock(callable.body)) returns.push(callable.body);
      else {
        const findReturns = (candidate) => {
          if (candidate !== callable.body && ts.isFunctionLike(candidate)) return;
          if (ts.isReturnStatement(candidate) && candidate.expression) returns.push(candidate.expression);
          ts.forEachChild(candidate, findReturns);
        };
        findReturns(callable.body);
      }
      functionDefinitions.set(`${path}\0${name}`, {
        path,
        parameters: callable.parameters.map((parameter) => ts.isIdentifier(parameter.name) ? parameter.name.text : null),
        returns,
      });
    }
    ts.forEachChild(node, collect);
  };
  collect(file);
}
const functionCallArguments = new Map();
for (const [path] of productionText) {
  const file = sourceFile(path);
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const identity = semanticIdentity(node.expression, path, node);
      const key = identity?.path && identity?.symbol ? `${identity.path}\0${identity.symbol}` : null;
      if (key && functionDefinitions.has(key)) {
        const sites = functionCallArguments.get(key) ?? [];
        sites.push({ path, arguments: [...node.arguments] });
        functionCallArguments.set(key, sites);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
const enclosingFunctionParameter = (node, path) => {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionDeclaration(current) && current.name) {
      const index = current.parameters.findIndex((parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === node.text);
      if (index >= 0) return { key: `${path}\0${current.name.text}`, index };
      return null;
    }
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    ) {
      const index = current.parameters.findIndex((parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === node.text);
      if (index >= 0) return { key: `${path}\0${current.parent.name.text}`, index };
      return null;
    }
  }
  return null;
};
const canonicalResolverCalls = new Map();
const usedCanonicalResolverCalls = new Set();
const provenanceOf = (node, path, env = new Map(), seen = new Set()) => {
  if (!node) return new Set(["unknown"]);
  if (
    ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)
  ) return provenanceOf(node.expression, path, env, seen);
  if (ts.isConditionalExpression(node)) {
    return new Set([...provenanceOf(node.whenTrue, path, env, seen), ...provenanceOf(node.whenFalse, path, env, seen)]);
  }
  if (ts.isBinaryExpression(node)) {
    const merged = new Set([...provenanceOf(node.left, path, env, seen), ...provenanceOf(node.right, path, env, seen)]);
    if (node.operatorToken.kind === ts.SyntaxKind.PlusToken && productIdentityTokens.some((token) => node.getText(sourceFile(path)).includes(token))) {
      merged.add("raw-product-path");
    }
    return merged;
  }
  if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isStringLiteralLike(node)) {
    const value = staticString(node, path);
    const productLike =
      (value && productIdentityTokens.some((token) => value.includes(token))) ||
      productIdentityTokens.some((token) => node.getText(sourceFile(path)).includes(token));
    return new Set([productLike ? "raw-product-path" : "other"]);
  }
  if (ts.isIdentifier(node)) {
    const substitution = env.get(node.text);
    if (substitution) return provenanceOf(substitution.node, substitution.path, substitution.env, seen);
    const parameter = enclosingFunctionParameter(node, path);
    if (parameter) {
      const key = `parameter\0${parameter.key}\0${parameter.index}`;
      if (seen.has(key)) return new Set(["unknown"]);
      const calls = functionCallArguments.get(parameter.key) ?? [];
      if (!calls.length) return new Set(["unknown"]);
      return new Set(calls.flatMap((call) => {
        const argument = call.arguments[parameter.index];
        return argument ? [...provenanceOf(argument, call.path, new Map(), new Set(seen).add(key))] : ["unknown"];
      }));
    }
    const identity = `${path}\0${node.text}`;
    if (seen.has(identity)) return new Set(["unknown"]);
    const local = semanticBindingAt(node.text, path, node);
    return local ? provenanceOf(local, path, env, new Set(seen).add(identity)) : new Set(["unknown"]);
  }
  if (ts.isPropertyAccessExpression(node)) return provenanceOf(node.expression, path, env, seen);
  if (ts.isCallExpression(node)) {
    const identity = semanticIdentity(node.expression, path, node);
    if (isCanonicalResolverIdentity(identity)) {
      const key = `${path}:${node.getStart(sourceFile(path))}`;
      canonicalResolverCalls.set(key, {
        path,
        line: sourceFile(path).getLineAndCharacterOfPosition(node.getStart(sourceFile(path))).line + 1,
      });
      usedCanonicalResolverCalls.add(key);
      return new Set(["canonical-resolver"]);
    }
    const symbol = terminalSemanticSymbol(identity);
    if (["join", "resolve"].includes(symbol) && productIdentityTokens.some((token) => node.getText(sourceFile(path)).includes(token))) {
      return new Set(["raw-product-path"]);
    }
    const definition = identity?.path ? functionDefinitions.get(`${identity.path}\0${identity.symbol}`) : null;
    if (definition) {
      const callKey = `${definition.path}\0${identity.symbol}\0${path}\0${node.getStart(sourceFile(path))}`;
      if (seen.has(callKey)) return new Set(["unknown"]);
      const nextEnv = new Map();
      definition.parameters.forEach((parameter, index) => {
        if (parameter && node.arguments[index]) nextEnv.set(parameter, { node: node.arguments[index], path, env });
      });
      return new Set(definition.returns.flatMap((expression) => [...provenanceOf(expression, definition.path, nextEnv, new Set(seen).add(callKey))]));
    }
    return new Set(["unknown"]);
  }
  return new Set(["unknown"]);
};
const productDatabaseSinks = [];
for (const [path] of productionText) {
  const file = sourceFile(path);
  const recordSink = (node, argument, sinkKind, symbol) => {
    const provenance = [...provenanceOf(argument, path)].sort();
    productDatabaseSinks.push({
      path,
      line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
      sinkKind,
      symbol,
      provenance,
    });
  };
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const identity = semanticIdentity(node.expression, path, node);
      const symbol = terminalSemanticSymbol(identity);
      if (isCanonicalResolverIdentity(identity)) {
        const key = `${path}:${node.getStart(file)}`;
        canonicalResolverCalls.set(key, { path, line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1 });
      }
      const first = node.arguments[0];
      const text = first?.getText(file) ?? "";
      const isNamedProductOpener = symbol === "openProductDatabase";
      const isPortableProductOpener = symbol === "openPortableDatabase" && (/product/i.test(text) || /product/i.test(path));
      if ((isNamedProductOpener || isPortableProductOpener) && first) recordSink(node, first, "opener", symbol);
      if (config.productDatabaseComposition.sinkRules.lifecycleCallees.includes(symbol) && first) {
        let recorded = false;
        for (const argument of node.arguments) {
          const localObject = ts.isIdentifier(argument) ? semanticBindingAt(argument.text, path, argument) : argument;
          if (!localObject || !ts.isObjectLiteralExpression(localObject)) continue;
          for (const property of localObject.properties) {
            const propertyName =
              (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
              (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name))
                ? property.name.text
                : null;
            if (!propertyName || !config.productDatabaseComposition.sinkRules.receiverProperties.includes(propertyName)) continue;
            recordSink(
              node,
              ts.isPropertyAssignment(property) ? property.initializer : property.name,
              "receiver",
              `${symbol}.${propertyName}`,
            );
            recorded = true;
          }
        }
        if (!recorded) recordSink(node, first, "lifecycle", symbol);
      }
    } else if (ts.isNewExpression(node) && node.arguments?.[0]) {
      const symbol = terminalSemanticSymbol(semanticIdentity(node.expression, path, node));
      const argument = node.arguments[0];
      const text = argument.getText(file);
      if (config.productDatabaseComposition.sinkRules.constructors.includes(symbol) && /product/i.test(text)) {
        recordSink(node, argument, "constructor", symbol);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
productDatabaseSinks.sort((left, right) => `${left.path}\0${left.line}\0${left.symbol}`.localeCompare(`${right.path}\0${right.line}\0${right.symbol}`));
const canonicalProductDatabaseConsumers = productDatabaseSinks.filter(({ provenance }) => stableJson(provenance) === stableJson(["canonical-resolver"]));
const noncanonicalProductDatabaseResolutionSites = productDatabaseSinks.filter(({ provenance }) => stableJson(provenance) !== stableJson(["canonical-resolver"]));
const productDatabaseSinksOutsideFrozenMembership = productDatabaseSinks.filter(({ path }) => !inUniverse(path));
const ignoredCanonicalResolverCalls = [...canonicalResolverCalls.entries()]
  .filter(([key]) => !usedCanonicalResolverCalls.has(key))
  .map(([, site]) => site);
semanticGates.productDatabaseSinks = productDatabaseSinks;
semanticGates.canonicalProductDatabaseConsumers = canonicalProductDatabaseConsumers;
semanticGates.noncanonicalProductDatabaseResolutionSites = noncanonicalProductDatabaseResolutionSites;
semanticGates.productDatabaseSinksOutsideFrozenMembership = productDatabaseSinksOutsideFrozenMembership;
semanticGates.ignoredCanonicalResolverCalls = ignoredCanonicalResolverCalls;
const semanticFocusPaths = new Set(negativeFixture?.semanticFocusPaths ?? []);
const focusedProductSites = (sites) => semanticFocusPaths.size ? sites.filter(({ path }) => semanticFocusPaths.has(path)) : sites;
if (
  (commit !== config.baselineCommit || negativeFixture?.enforceSemanticGates) &&
  (
    focusedProductSites(noncanonicalProductDatabaseResolutionSites).length ||
    focusedProductSites(productDatabaseSinksOutsideFrozenMembership).length ||
    focusedProductSites(ignoredCanonicalResolverCalls).length
  )
) {
  throw new Error(`PRODUCT_DATABASE_PROVENANCE_INVALID: ${JSON.stringify({
    noncanonicalProductDatabaseResolutionSites: focusedProductSites(noncanonicalProductDatabaseResolutionSites),
    productDatabaseSinksOutsideFrozenMembership: focusedProductSites(productDatabaseSinksOutsideFrozenMembership),
    ignoredCanonicalResolverCalls: focusedProductSites(ignoredCanonicalResolverCalls),
  })}`);
}

const occurrenceCount = (text, value) => text.split(value).length - 1;
const destructiveToolIdentities = config.legacyClassification.toolOnlyDestructiveIdentities.map((identity) => ({
  identity,
  occurrences: universeFiles
    .filter((file) => file.category === "direct-tool" && file.content.includes(identity))
    .map((file) => ({ path: file.path, count: occurrenceCount(file.content, identity) })),
}));
const allowedLegacySourceKeys = new Set();
const staticSourceKeys = (node, path, seen = new Set()) => {
  if (!node) return [];
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap((element) => staticSourceKeys(element, path, seen));
  if (
    ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)
  ) return staticSourceKeys(node.expression, path, seen);
  if (ts.isIdentifier(node)) {
    const identity = `${path}\0${node.text}`;
    if (seen.has(identity)) return [];
    const iterable = localIterableBindings.get(path)?.get(node.text);
    if (iterable) return staticSourceKeys(iterable, path, new Set(seen).add(identity));
    const local = localInitializers.get(path)?.get(node.text);
    if (local) return staticSourceKeys(local, path, new Set(seen).add(identity));
    const imported = importedBindings.get(path)?.get(node.text);
    const importedInitializer = imported && localInitializers.get(imported.path)?.get(imported.symbol);
    return importedInitializer ? staticSourceKeys(importedInitializer, imported.path, new Set(seen).add(identity)) : [];
  }
  return [`${path}:${node.getStart(sourceFile(path))}`];
};
const callableName = (node, file) => {
  if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) return node.name.getText(file);
  if (
    (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    ts.isVariableDeclaration(node.parent) &&
    ts.isIdentifier(node.parent.name)
  ) return node.parent.name.text;
  return null;
};
const findCallable = (path, name) => {
  const file = sourceFile(path);
  let found = null;
  const visit = (node) => {
    if (callableName(node, file) === name) found = node;
    if (!found) ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
};
const requiredLegacyPresenceSentinels = config.legacyClassification.requiredLegacyPresenceSentinels.map((sentinel) => {
  const content = sourceText.get(sentinel.path);
  if (!content) return { ...sentinel, status: "absent", identitySites: [], operationSites: [], violations: [] };
  const file = sourceFile(sentinel.path);
  const owner = findCallable(sentinel.path, sentinel.owner);
  if (!owner) return { ...sentinel, status: "absent-owner", identitySites: [], operationSites: [], violations: [] };
  const identitySites = [];
  const operationSites = [];
  const violations = [];
  const sentinelResultVariables = new Set();
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = terminalSemanticSymbol(semanticIdentity(node.expression, sentinel.path, node));
      const identityArgument = node.arguments.find((argument) => possibleStaticStrings(argument, sentinel.path).includes(sentinel.literal));
      if (identityArgument) {
        identitySites.push(file.getLineAndCharacterOfPosition(identityArgument.getStart(file)).line + 1);
        if (callee === sentinel.operation) {
          for (const key of staticSourceKeys(identityArgument, sentinel.path)) allowedLegacySourceKeys.add(key);
          operationSites.push(file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1);
          if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) sentinelResultVariables.add(node.parent.name.text);
        } else {
          violations.push({ kind: "legacy-value-call", callee: callee ?? "unknown" });
        }
      }
    }
    if (ts.isReturnStatement(node) && node.expression && staticString(node.expression, sentinel.path) === sentinel.literal) {
      violations.push({ kind: "legacy-value-return" });
    }
    ts.forEachChild(node, visit);
  };
  visit(owner);
  const inspectResultFlow = (node) => {
    if (ts.isIdentifier(node) && sentinelResultVariables.has(node.text)) {
      const parent = node.parent;
      const declarationName = ts.isVariableDeclaration(parent) && parent.name === node;
      const safeComparison =
        ts.isBinaryExpression(parent) &&
        [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken]
          .includes(parent.operatorToken.kind) &&
        (parent.left.kind === ts.SyntaxKind.NullKeyword || parent.right.kind === ts.SyntaxKind.NullKeyword);
      const safeBoolean = ts.isPrefixUnaryExpression(parent) && parent.operator === ts.SyntaxKind.ExclamationToken;
      let guardingIf = null;
      for (let current = parent; current && current !== owner; current = current.parent) {
        if (ts.isIfStatement(current) && current.expression.getStart(file) <= node.getStart(file) && current.expression.end >= node.end) {
          guardingIf = current;
          break;
        }
      }
      const typedResetBranch = guardingIf && /\bthrow\b/.test(guardingIf.thenStatement.getText(file)) && guardingIf.thenStatement.getText(file).includes(sentinel.errorCode);
      if (!declarationName && (!(safeComparison || safeBoolean) || !typedResetBranch)) {
        violations.push({ kind: "legacy-result-escape", line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1 });
      }
    }
    ts.forEachChild(node, inspectResultFlow);
  };
  inspectResultFlow(owner);
  const ownerText = owner.getText(file);
  if (!ownerText.includes(sentinel.errorCode)) violations.push({ kind: "missing-typed-reset-error" });
  if (sentinel.operation === "getItem" && !sentinelResultVariables.size && operationSites.length) {
    const directSafe = operationSites.every((line) => {
      let safe = false;
      const inspect = (node) => {
        if (
          ts.isCallExpression(node) &&
          file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1 === line &&
          ts.isBinaryExpression(node.parent) &&
          (node.parent.left.kind === ts.SyntaxKind.NullKeyword || node.parent.right.kind === ts.SyntaxKind.NullKeyword)
        ) safe = true;
        ts.forEachChild(node, inspect);
      };
      inspect(owner);
      return safe;
    });
    if (!directSafe) violations.push({ kind: "legacy-result-not-presence-only" });
  }
  const status =
    identitySites.length === sentinel.count &&
    operationSites.length === sentinel.count &&
    violations.length === 0
      ? "exact"
      : "mismatch";
  return { ...sentinel, status, identitySites, operationSites, violations };
});
const requiredSentinelOwners = new Map(
  requiredLegacyPresenceSentinels.filter(({ status }) => status === "exact").map((sentinel) => [`${sentinel.path}\0${sentinel.owner}\0${sentinel.literal}`, sentinel]),
);
const forbiddenLegacyOccurrences = [];
for (const [path, content] of productionText) {
  const file = sourceFile(path);
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      for (const argument of node.arguments) {
        for (const identity of possibleStaticStrings(argument, path)) {
          if (!config.legacyClassification.toolOnlyDestructiveIdentities.includes(identity)) continue;
          let owner = null;
          for (let current = node.parent; current; current = current.parent) {
            owner = callableName(current, file);
            if (owner) break;
          }
          if (!requiredSentinelOwners.has(`${path}\0${owner}\0${identity}`)) {
            forbiddenLegacyOccurrences.push({ path, line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, identity, owner: owner ?? "<module>" });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  const inspectStaticLegacySources = (node) => {
    const sourceCandidate =
      ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node) ||
      (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken);
    if (sourceCandidate) {
      const identity = staticString(node, path);
      if (config.legacyClassification.toolOnlyDestructiveIdentities.includes(identity)) {
        const parentValue = node.parent && !ts.isSourceFile(node.parent) ? staticString(node.parent, path) : null;
        if (parentValue !== identity) {
          const key = `${path}:${node.getStart(file)}`;
          if (!allowedLegacySourceKeys.has(key)) {
            forbiddenLegacyOccurrences.push({
              path,
              line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
              identity,
              owner: "unclassified-static-source",
            });
          }
        }
      }
    }
    ts.forEachChild(node, inspectStaticLegacySources);
  };
  inspectStaticLegacySources(file);
  for (const identity of config.legacyClassification.toolOnlyDestructiveIdentities) {
    if (content.includes(identity) && !requiredLegacyPresenceSentinels.some((sentinel) => sentinel.path === path && sentinel.literal === identity && sentinel.status === "exact")) {
      if (!forbiddenLegacyOccurrences.some((site) => site.path === path && site.identity === identity)) {
        forbiddenLegacyOccurrences.push({ path, line: null, identity, owner: "unclassified-text" });
      }
    }
  }
}
const forbiddenCompatibility = config.legacyClassification.forbiddenCompatibility.map((identity) => ({
  identity,
  occurrences: productionText
    .filter(([, content]) => content.includes(identity))
    .map(([path, content]) => ({ path, count: occurrenceCount(content, identity) })),
}));
const uniqueForbiddenLegacyOccurrences = [...new Map(
  forbiddenLegacyOccurrences.map((site) => [`${site.path}\0${site.line ?? ""}\0${site.identity}\0${site.owner}`, site]),
).values()].sort((left, right) => `${left.path}\0${left.line ?? ""}\0${left.identity}\0${left.owner}`.localeCompare(`${right.path}\0${right.line ?? ""}\0${right.identity}\0${right.owner}`));
const legacyClassification = {
  destructiveToolIdentities,
  requiredLegacyPresenceSentinels,
  forbiddenCompatibility,
  forbiddenLegacyOccurrences: uniqueForbiddenLegacyOccurrences,
  unclassifiedOccurrences: uniqueForbiddenLegacyOccurrences.filter(({ owner }) => owner.startsWith("unclassified-")),
  disjoint: !uniqueForbiddenLegacyOccurrences.some((site) =>
    requiredLegacyPresenceSentinels.some((sentinel) =>
      sentinel.status === "exact" && sentinel.path === site.path && sentinel.literal === site.identity && sentinel.owner === site.owner),
  ),
};
const focusedLegacySentinels = requiredLegacyPresenceSentinels.filter((sentinel) =>
  (!semanticFocusPaths.size || semanticFocusPaths.has(sentinel.path)) &&
  (!negativeFixture?.legacyFocusLiterals || negativeFixture.legacyFocusLiterals.includes(sentinel.literal)),
);
const focusedForbiddenLegacyOccurrences = uniqueForbiddenLegacyOccurrences.filter(({ path, identity }) =>
  (!semanticFocusPaths.size || semanticFocusPaths.has(path)) &&
  (!negativeFixture?.legacyFocusLiterals || negativeFixture.legacyFocusLiterals.includes(identity)),
);
const focusedForbiddenCompatibility = forbiddenCompatibility.filter(({ identity }) =>
  !negativeFixture?.legacyFocusLiterals || negativeFixture.legacyFocusLiterals.includes(identity),
).map((entry) => ({
  ...entry,
  occurrences: semanticFocusPaths.size ? entry.occurrences.filter(({ path }) => semanticFocusPaths.has(path)) : entry.occurrences,
}));
if (
  (commit !== config.baselineCommit || negativeFixture?.enforceSemanticGates) &&
  (
    focusedLegacySentinels.some(({ status }) => status !== "exact") ||
    focusedForbiddenLegacyOccurrences.length ||
    focusedForbiddenCompatibility.some(({ occurrences }) => occurrences.length) ||
    !legacyClassification.disjoint
  )
) {
  throw new Error(`LEGACY_CLASSIFICATION_INVALID: ${JSON.stringify({
    requiredLegacyPresenceSentinels: focusedLegacySentinels,
    forbiddenLegacyOccurrences: focusedForbiddenLegacyOccurrences,
    forbiddenCompatibility: focusedForbiddenCompatibility,
  })}`);
}

const nodes = [...new Set(uniqueEdges.flatMap((edge) => [edge.source, edge.target]))].sort();
const adjacency = new Map(nodes.map((node) => [node, []]));
for (const edge of uniqueEdges) adjacency.get(edge.source)?.push(edge.target);
let nextIndex = 0;
const stack = [];
const onStack = new Set();
const indices = new Map();
const low = new Map();
const components = [];
const connect = (node) => {
  indices.set(node, nextIndex); low.set(node, nextIndex); nextIndex += 1; stack.push(node); onStack.add(node);
  for (const target of adjacency.get(node) ?? []) {
    if (!indices.has(target)) { connect(target); low.set(node, Math.min(low.get(node), low.get(target))); }
    else if (onStack.has(target)) low.set(node, Math.min(low.get(node), indices.get(target)));
  }
  if (low.get(node) === indices.get(node)) {
    const component = [];
    while (stack.length) { const member = stack.pop(); onStack.delete(member); component.push(member); if (member === node) break; }
    components.push(component.sort());
  }
};
for (const node of nodes) if (!indices.has(node)) connect(node);

const coreResponsibilityPaths = [
  "apps/service/src/product/ProductControlPlane.ts",
  "apps/service/src/product/productStateStore.ts",
  "apps/service/src/product/productExecutionCoordinator.ts",
  "apps/service/src/product/productExecutionBoundary.ts",
  "apps/service/src/product/productExecutionGateway.ts",
];
const coreResponsibilitySlice = {
  files: coreResponsibilityPaths.map((path) => ({
    path,
    materialized: tree.has(path),
    lines: tree.has(path) ? physicalLines(textAt(path)) : 0,
  })),
  totalLines: coreResponsibilityPaths.reduce((total, path) => total + (tree.has(path) ? physicalLines(textAt(path)) : 0), 0),
  internalEdges: uniqueEdges.filter(({ source, target }) => coreResponsibilityPaths.includes(source) && coreResponsibilityPaths.includes(target)),
};
const splitCorePaths = coreResponsibilityPaths.slice(0, 4);
const allowedCoreDirections = new Set([
  `${splitCorePaths[0]}\0${splitCorePaths[1]}`,
  `${splitCorePaths[0]}\0${splitCorePaths[2]}`,
  `${splitCorePaths[2]}\0${splitCorePaths[1]}`,
  `${splitCorePaths[2]}\0${splitCorePaths[3]}`,
]);
const coreImportGates = {
  allowedDirections: [...allowedCoreDirections].sort(),
  forbiddenCoreEdges: uniqueEdges.filter(({ source, target }) =>
    splitCorePaths.includes(source) && splitCorePaths.includes(target) && !allowedCoreDirections.has(`${source}\0${target}`),
  ),
  engineOrGatewayToFacadeOrStore: uniqueEdges.filter(({ source, target }) =>
    [
      "apps/service/src/product/productExecutionGateway.ts",
      "apps/service/src/native-host/executionBoundary.ts",
      "apps/service/src/opencode/productBoundary.ts",
    ].includes(source) && [splitCorePaths[0], splitCorePaths[1]].includes(target),
  ),
  wsRpcCoreImports: uniqueEdges.filter(({ source, target }) => source === "apps/service/src/wsRpc.ts" && splitCorePaths.includes(target)),
  wsRpcNonFacadeCoreImports: uniqueEdges.filter(({ source, target }) =>
    source === "apps/service/src/wsRpc.ts" && splitCorePaths.includes(target) && target !== splitCorePaths[0],
  ),
};

const report = {
  format: FORMAT,
  commit,
  instrument,
  universe: { configFormat: config.format, files: universeReportFiles, evidenceFiles: evidenceReportFiles },
  coverage: {
    source: "accepted-design-machine-blocks-and-frozen-design-time-path-membership",
    acceptedDesignCommit: config.authority.acceptedDesignCommit,
    boundarySetSha256: config.authority.boundarySetSha256,
    membershipSha256: config.authority.membershipSha256,
    candidateSelectedPathsUsed: false,
    workingTreeUsed: false,
    dependencyManifestSeedsUsed: false,
    dependencyPaths: extractedWorkBlocks.flatMap((block) => block.dependency.map((rule) => rule.path)).sort(),
    dependencyIntegrity,
    frozenPathMembership,
    missingFrozenPaths: frozenPathMembership.filter((path) => !tree.has(path)),
    candidateClosureGrowth,
    boundedPrivateProductViolations,
    outOfUniverseResponsibilitySites,
    workCoverage,
  },
  lines,
  anchors,
  imports: {
    edgeCount: uniqueEdges.length,
    edges: uniqueEdges,
    externalImports: externalImports.sort((a, b) => `${a.source}\0${a.specifier}`.localeCompare(`${b.source}\0${b.specifier}`)),
    forbiddenExternalImports,
    stronglyConnectedComponents: components.filter((component) => component.length > 1),
    unresolvedInUniverse,
    computedInUniverse,
    coreImportGates,
  },
  extractionSurface,
  coreResponsibilitySlice,
  semanticAnalysis: {
    typeScriptProgram: true,
    typeChecker: true,
    rootFileCount: programRootPaths.length,
    moduleResolution: "bundler-with-frozen-git-tree-internal-resolution",
    localInterproceduralDataflow: true,
    syntacticDiagnostics: semanticProgramSyntacticDiagnostics,
  },
  semanticGates,
  legacyClassification,
  legacyRuntime,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
