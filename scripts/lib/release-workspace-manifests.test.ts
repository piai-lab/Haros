import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { RELEASE_WORKSPACE_MANIFEST_PATHS } from "./release-workspace-manifests";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

async function readPackage(relativePath: string): Promise<{
  readonly name?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
}> {
  return JSON.parse(await readFile(path.join(repositoryRoot, relativePath), "utf8"));
}

describe("release workspace manifests", () => {
  it("stages every production workspace dependency needed by Desktop and Server", async () => {
    const stagedPackageNames = new Set(
      (await Promise.all(RELEASE_WORKSPACE_MANIFEST_PATHS.map(readPackage)))
        .map(({ name }) => name)
        .filter((name): name is string => typeof name === "string"),
    );
    const importers = await Promise.all([
      readPackage("apps/desktop/package.json"),
      readPackage("apps/server/package.json"),
    ]);
    const requiredWorkspaceDependencies = importers.flatMap(({ dependencies = {} }) =>
      Object.entries(dependencies)
        .filter(([, version]) => version.startsWith("workspace:"))
        .map(([name]) => name),
    );

    expect([...new Set(requiredWorkspaceDependencies)].sort()).toEqual(
      [...new Set(requiredWorkspaceDependencies.filter((name) => stagedPackageNames.has(name)))].sort(),
    );
  });

  it("keeps the Curator browser renderer on the package version that exports its local asset", async () => {
    const server = await readPackage("apps/server/package.json");
    const webAccess = await readPackage("packages/om-web-access/package.json");

    expect(server.dependencies?.marked).toBe(webAccess.dependencies?.marked);
    expect(server.dependencies?.marked).toBe("15.0.12");
  });
});
