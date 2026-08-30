import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ORIGIN_REVISION = "29b2b39c49ebba20aa38f95d76acd2284e91b1cc";
const TYPECHECK_CONTRACT_PATHS = [
  "bun.lock",
  "package.json",
  "turbo.json",
  "tsconfig.base.json",
  ":(glob)**/package.json",
  ":(glob)**/tsconfig*.json",
];
const WORKSPACE_NODE_MODULES = [
  "apps/desktop/node_modules",
  "apps/server/node_modules",
  "apps/web/node_modules",
  "packages/contracts/node_modules",
  "packages/oa-ask/node_modules",
  "packages/oa-web-access/node_modules",
  "packages/shared/node_modules",
  "scripts/node_modules",
];
const MAX_BUFFER_BYTES = 512 * 1024 * 1024;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: null,
    maxBuffer: MAX_BUFFER_BYTES,
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  return result;
}

function text(result) {
  return Buffer.concat([
    result.stdout ?? Buffer.alloc(0),
    result.stderr ?? Buffer.alloc(0),
  ]).toString("utf8");
}

function requireSuccess(result, label) {
  if (result.status !== 0) {
    throw new Error(`${label} failed (${result.status ?? "signal"}): ${text(result).trim()}`);
  }
}

function archiveRevision(repositoryRoot, revision, targetDirectory) {
  const archive = run("git", ["archive", "--format=tar", revision], { cwd: repositoryRoot });
  requireSuccess(archive, `git archive ${revision}`);
  const extract = run("tar", ["-xf", "-", "-C", targetDirectory], {
    input: archive.stdout,
  });
  requireSuccess(extract, `extract ${revision}`);
}

function attachLockedDependencies(repositoryRoot, targetDirectory) {
  const rootNodeModules = path.join(repositoryRoot, "node_modules");
  if (!fs.existsSync(rootNodeModules)) {
    throw new Error(`locked dependency tree is missing: ${rootNodeModules}`);
  }
  fs.symlinkSync(rootNodeModules, path.join(targetDirectory, "node_modules"), "dir");

  for (const relativePath of WORKSPACE_NODE_MODULES) {
    const source = path.join(repositoryRoot, relativePath);
    if (!fs.existsSync(source)) {
      throw new Error(`workspace dependency links are missing: ${source}`);
    }
    const target = path.join(targetDirectory, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, {
      recursive: true,
      dereference: false,
      verbatimSymlinks: true,
    });
  }
}

function normalizeDiagnostics(output, treeRoot) {
  const normalizedRoot = `${treeRoot}${path.sep}`;
  return output
    .replaceAll(normalizedRoot, "<TREE>/")
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function runServerTypecheck(treeRoot) {
  const serverRoot = path.join(treeRoot, "apps/server");
  const executable = path.join(serverRoot, "node_modules/.bin/tsc");
  const result = run(executable, ["--noEmit", "--pretty", "false", "-p", "tsconfig.json"], {
    cwd: serverRoot,
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    status: result.status,
    diagnostics: normalizeDiagnostics(text(result), treeRoot),
  };
}

function firstDifference(originLines, candidateLines) {
  const length = Math.max(originLines.length, candidateLines.length);
  for (let index = 0; index < length; index += 1) {
    if (originLines[index] !== candidateLines[index]) {
      return {
        line: index + 1,
        origin: originLines[index] ?? "<missing>",
        candidate: candidateLines[index] ?? "<missing>",
      };
    }
  }
  return null;
}

const repositoryRootResult = run("git", ["rev-parse", "--show-toplevel"]);
requireSuccess(repositoryRootResult, "resolve repository root");
const repositoryRoot = text(repositoryRootResult).trim();
const candidateResult = run("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot });
requireSuccess(candidateResult, "resolve candidate revision");
const candidateRevision = text(candidateResult).trim();

const contractDiff = run(
  "git",
  ["diff", "--quiet", ORIGIN_REVISION, candidateRevision, "--", ...TYPECHECK_CONTRACT_PATHS],
  { cwd: repositoryRoot },
);
if (contractDiff.status !== 0) {
  throw new Error(
    "typecheck command, dependency lock, package manifests, or tsconfig changed from origin",
  );
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "haros-owner-typecheck-"));
try {
  const originRoot = path.join(temporaryRoot, "origin");
  const candidateRoot = path.join(temporaryRoot, "candidate");
  fs.mkdirSync(originRoot);
  fs.mkdirSync(candidateRoot);
  archiveRevision(repositoryRoot, ORIGIN_REVISION, originRoot);
  archiveRevision(repositoryRoot, candidateRevision, candidateRoot);
  attachLockedDependencies(repositoryRoot, originRoot);
  attachLockedDependencies(repositoryRoot, candidateRoot);

  const origin = runServerTypecheck(originRoot);
  const candidate = runServerTypecheck(candidateRoot);
  const matches =
    origin.status === candidate.status && origin.diagnostics === candidate.diagnostics;
  if (!matches) {
    const difference = firstDifference(
      origin.diagnostics.split("\n"),
      candidate.diagnostics.split("\n"),
    );
    console.error(
      JSON.stringify({
        result: "FAIL",
        originRevision: ORIGIN_REVISION,
        candidateRevision,
        originExitCode: origin.status,
        candidateExitCode: candidate.status,
        firstDifference: difference,
      }),
    );
    process.exitCode = 1;
  } else {
    const digest = createHash("sha256").update(candidate.diagnostics).digest("hex");
    console.log(
      JSON.stringify({
        result: "PASS",
        originRevision: ORIGIN_REVISION,
        candidateRevision,
        exitCode: candidate.status,
        diagnosticLines: candidate.diagnostics ? candidate.diagnostics.split("\n").length : 0,
        diagnosticsSha256: digest,
      }),
    );
  }
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
