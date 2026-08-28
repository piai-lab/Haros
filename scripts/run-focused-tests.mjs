import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const vitestBin = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));

const vitestWorkspaces = new Set([
  "apps/desktop",
  "apps/server",
  "packages/contracts",
  "packages/oa-ask",
  "packages/shared",
  "scripts",
]);

const supportedWorkspaces = [
  "apps/desktop",
  "apps/server",
  "apps/web",
  "packages/contracts",
  "packages/oa-ask",
  "packages/oa-web-access",
  "packages/shared",
  "scripts",
];

const isExplicitTestFile = (filePath) => /(?:\.test|\.browser)\.[cm]?[jt]sx?$/.test(filePath);

function normalizeRequestedFile(input, root) {
  const absolutePath = path.resolve(root, input);
  const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
  if (relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
    throw new Error(`Focused test file is outside the repository: ${input}`);
  }
  if (!isExplicitTestFile(relativePath)) {
    throw new Error(`Focused tests require explicit test files: ${input}`);
  }
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new Error(`Focused test file does not exist: ${input}`);
  }
  const workspace = supportedWorkspaces.find((candidate) =>
    relativePath.startsWith(`${candidate}/`),
  );
  if (!workspace) {
    throw new Error(`Focused test file has no supported workspace owner: ${relativePath}`);
  }
  return { absolutePath, relativePath, workspace };
}

export function planFocusedTestRuns(inputs, root = repoRoot) {
  if (inputs.length === 0) {
    throw new Error("Usage: bun run test:focused -- <explicit-test-files...>");
  }

  const grouped = new Map();
  for (const input of inputs) {
    const requested = normalizeRequestedFile(input, root);
    const existing = grouped.get(requested.workspace) ?? [];
    existing.push(requested);
    grouped.set(requested.workspace, existing);
  }

  return [...grouped.entries()].map(([workspace, files]) => {
    const workspaceRoot = path.join(root, workspace);
    const workspaceFiles = files.map((file) => path.relative(workspaceRoot, file.absolutePath));
    if (workspace === "apps/web") {
      return {
        workspace,
        command: process.execPath,
        args: [
          path.join(workspaceRoot, "scripts/run-selected-tests.mjs"),
          "focused",
          ...workspaceFiles,
        ],
        cwd: workspaceRoot,
        files: files.map((file) => file.relativePath),
      };
    }
    if (workspace === "packages/oa-web-access") {
      return {
        workspace,
        command: process.execPath,
        args: ["--test", "--test-concurrency=4", ...workspaceFiles],
        cwd: workspaceRoot,
        files: files.map((file) => file.relativePath),
      };
    }
    if (vitestWorkspaces.has(workspace)) {
      return {
        workspace,
        command: process.execPath,
        args: [vitestBin, "run", ...workspaceFiles],
        cwd: workspaceRoot,
        files: files.map((file) => file.relativePath),
      };
    }
    throw new Error(`Focused test workspace is not routed: ${workspace}`);
  });
}

function runFocusedTarget(run) {
  console.log(`[test:focused] ${run.workspace}: ${run.files.join(", ")}`);
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(run.command, run.args, { cwd: run.cwd, stdio: "inherit" });
    child.once("error", rejectRun);
    child.once("exit", (code, signal) => {
      if (code === 0) resolveRun();
      else {
        rejectRun(
          new Error(
            `${run.workspace} focused tests exited with ${code ?? signal ?? "unknown status"}`,
          ),
        );
      }
    });
  });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const inputs = process.argv.slice(2).filter((input) => input !== "--");
    await Promise.all(planFocusedTestRuns(inputs).map(runFocusedTarget));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
