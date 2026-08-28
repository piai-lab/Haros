import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const requestedPaths = process.argv.slice(2).map((input) => path.resolve(repoRoot, input));

if (requestedPaths.length === 0) {
  console.error("Usage: bun run test:related -- <changed-source-paths...>");
  process.exit(2);
}

const workspaceConsumers = {
  "apps/desktop": ["apps/desktop"],
  "apps/server": ["apps/server"],
  "apps/web": ["apps/web"],
  "packages/contracts": [
    "packages/contracts",
    "apps/desktop",
    "apps/server",
    "apps/web",
    "scripts",
  ],
  "packages/oa-ask": ["packages/oa-ask", "apps/server"],
  "packages/oa-web-access": ["packages/oa-web-access", "apps/server"],
  "packages/shared": ["packages/shared", "apps/desktop", "apps/server", "apps/web", "scripts"],
  scripts: ["scripts"],
};

const targets = new Set();
for (const absolutePath of requestedPaths) {
  const relativePath = path.relative(repoRoot, absolutePath).split(path.sep).join("/");
  const owner = Object.keys(workspaceConsumers).find(
    (workspace) => relativePath === workspace || relativePath.startsWith(`${workspace}/`),
  );
  const consumers = owner ? workspaceConsumers[owner] : Object.keys(workspaceConsumers);
  for (const consumer of consumers) targets.add(consumer);
}

const runTarget = (workspace) =>
  new Promise((resolve, reject) => {
    const passPaths = workspace !== "packages/oa-web-access";
    const child = spawn(
      "bun",
      ["run", "--cwd", workspace, "test:related", ...(passPaths ? ["--", ...requestedPaths] : [])],
      { cwd: repoRoot, stdio: "inherit" },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`${workspace} related tests exited with ${code ?? signal ?? "unknown status"}`),
        );
    });
  });

const queue = [...targets];
let cursor = 0;
const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
  while (cursor < queue.length) {
    const target = queue[cursor];
    cursor += 1;
    await runTarget(target);
  }
});

await Promise.all(workers);
