import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export function repositoryFiles(root) {
  const result = spawnSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error("cannot enumerate repository files");
  }

  return [...new Set(result.stdout.split("\0").filter(Boolean))]
    .filter((relativePath) => existsSync(path.join(root, relativePath)))
    .sort();
}
