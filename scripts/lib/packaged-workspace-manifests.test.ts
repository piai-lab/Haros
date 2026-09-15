import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  omitBundledServerWorkspaceDependencies,
  PACKAGED_WORKSPACE_MANIFEST_PATHS,
} from "./packaged-workspace-manifests";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

async function readPackage(relativePath: string): Promise<{
  readonly name?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
}> {
  return JSON.parse(await readFile(path.join(repositoryRoot, relativePath), "utf8"));
}

describe("packaged workspace manifests", () => {
  it("stages every production workspace dependency needed by Desktop and Server", async () => {
    const stagedPackageNames = new Set(
      (await Promise.all(PACKAGED_WORKSPACE_MANIFEST_PATHS.map(readPackage)))
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

    expect([...new Set(requiredWorkspaceDependencies)].toSorted()).toEqual(
      [
        ...new Set(requiredWorkspaceDependencies.filter((name) => stagedPackageNames.has(name))),
      ].toSorted(),
    );
  });

  it("has no bundled OA workspace packages after first-party Engine deletion", () => {
    expect(PACKAGED_WORKSPACE_MANIFEST_PATHS).not.toContain("packages/oa-ask/package.json");
    expect(PACKAGED_WORKSPACE_MANIFEST_PATHS).not.toContain("packages/oa-web-access/package.json");
    const omitted = omitBundledServerWorkspaceDependencies({ marked: "15.0.12" });
    expect(omitted).toEqual({ marked: "15.0.12" });
    expect(() =>
      omitBundledServerWorkspaceDependencies({ "@harnessos/future-runtime": "workspace:*" }),
    ).toThrow("not proven to be bundled");
  });
});
