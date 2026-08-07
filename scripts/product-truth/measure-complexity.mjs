#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, extname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const FORMAT = "product-truth-complexity-v1";
const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = dirname(scriptPath);
const repositoryRoot = resolve(scriptDirectory, "../..");
const configPath = resolve(scriptDirectory, "complexity-universe-v1.json");
const scriptBytes = readFileSync(scriptPath);
const configBytes = readFileSync(configPath);
const config = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(configBytes));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const instrument = { scriptSha256: sha256(scriptBytes), configSha256: sha256(configBytes) };

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--ref" || !/^[0-9a-f]{40}$/.test(args[1])) {
  throw new Error("Usage: measure-complexity.mjs --ref <lowercase-full-40-hex-commit>");
}
const commit = args[1];

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

for (const [path, expected] of [
  ["scripts/product-truth/measure-complexity.mjs", scriptBytes],
  ["scripts/product-truth/complexity-universe-v1.json", configBytes],
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
const inUniverse = (path) =>
  config.extensions.includes(extname(path)) &&
  (config.roots.some((root) => inRoot(path, root)) || config.exactFiles.includes(path));
const universePaths = [...tree.keys()].filter(inUniverse).sort();
const physicalLines = (text) => text === "" ? 0 : text.split(/\r?\n/).length - (text.endsWith("\n") ? 1 : 0);
const universeFiles = universePaths.map((path) => {
  const content = textAt(path);
  return { path, category: classification(path), lines: physicalLines(content), content };
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
  if (file.category === "test") lines.tests += file.lines;
  else if (file.category === "browser-test") lines.browserTests += file.lines;
  else if (file.category === "fixture") lines.fixtures += file.lines;
  else if (file.category === "measurement") lines.measurement += file.lines;
  else if (file.category === "direct-tool") {
    lines.production += file.lines;
    lines.directRebuildTool += file.lines;
  } else if (file.category === "production") {
    lines.production += file.lines;
    lines.steadyStateRuntime += file.lines;
  }
}

const sourceExtensions = config.sourceExtensions;
const isSource = (path) => sourceExtensions.includes(extname(path));
const productionSourcePaths = [...tree.keys()].filter(
  (path) => isSource(path) && classification(path) === "production" && !path.startsWith("vendor/"),
);
const sourceText = new Map(productionSourcePaths.map((path) => [path, textAt(path)]));
const parsedSourceFiles = new Map();
const sourceFile = (path) => {
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
const edges = [];
const allInternalEdges = [];
const externalImports = [];
const forbiddenExternalImports = [];
const unresolvedInUniverse = [];
const computedInUniverse = [];
const monolithImporters = new Set();
const monolithPath = config.anchors.productControlPlane;
for (const source of productionSourcePaths) {
  const parsed = importsFor(source);
  if (inUniverse(source) && parsed.computed.length) computedInUniverse.push({ source, count: parsed.computed.length });
  for (const specifier of parsed.imports) {
    const resolved = resolveSpecifier(source, specifier);
    if (resolved.kind === "external") {
      if (inUniverse(source)) {
        const permitted = config.externalImports.exact.includes(specifier) ||
          config.externalImports.prefixes.some((prefix) => specifier.startsWith(prefix));
        (permitted ? externalImports : forbiddenExternalImports).push({ source, specifier });
      }
      continue;
    }
    const target = resolved.target;
    if (!target) {
      if (inUniverse(source) || resolved.kind === "unresolved-workspace") {
        unresolvedInUniverse.push({ source, specifier });
      }
      continue;
    }
    if (target === monolithPath && source !== monolithPath) monolithImporters.add(source);
    allInternalEdges.push({ source, target });
    if (inUniverse(source) || inUniverse(target)) edges.push({ source, target });
  }
}
const uniqueEdges = [...new Map(edges.map((edge) => [`${edge.source}\0${edge.target}`, edge])).values()]
  .sort((left, right) => `${left.source}\0${left.target}`.localeCompare(`${right.source}\0${right.target}`));
const uniqueInternalEdges = [...new Map(allInternalEdges.map((edge) => [`${edge.source}\0${edge.target}`, edge])).values()];
if (computedInUniverse.length || unresolvedInUniverse.length || forbiddenExternalImports.length) {
  throw new Error("Computed, unresolved, or non-allowlisted external import exists in the frozen complexity universe.");
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
const productionText = [...sourceText.entries()];
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
if (commit === config.baselineCommit) {
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
for (const [path] of productionText) {
  const file = sourceFile(path);
  const initializers = new Map();
  const imports = new Map();
  const semanticBindings = [];
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
  if (imported) return imported;
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

const report = {
  format: FORMAT,
  commit,
  instrument,
  universe: { configFormat: config.format, files: universeFiles.map(({ path, category, lines }) => ({ path, category, lines })) },
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
  },
  extractionSurface,
  semanticGates,
  legacyRuntime,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
