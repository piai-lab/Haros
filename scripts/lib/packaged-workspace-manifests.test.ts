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

  it("keeps the Curator browser renderer on the package version that exports its local asset", async () => {
    const server = await readPackage("apps/server/package.json");
    const webAccess = await readPackage("packages/oa-web-access/package.json");

    expect(server.dependencies?.marked).toBe(webAccess.dependencies?.marked);
    expect(server.dependencies?.marked).toBe("15.0.12");
  });

  it("ships the Ask fork through the Server bundle without creating a second Desktop dependency", async () => {
    expect(PACKAGED_WORKSPACE_MANIFEST_PATHS).toContain("packages/oa-ask/package.json");
    const desktop = await readPackage("apps/desktop/package.json");
    const server = await readPackage("apps/server/package.json");
    expect(desktop.dependencies?.["@harnessos/oa-ask"]).toBeUndefined();
    expect(server.dependencies?.["@harnessos/oa-ask"]).toBe("workspace:*");
  });

  it("omits only the exact workspace package proven to be bundled into the Server", () => {
    expect(
      omitBundledServerWorkspaceDependencies({
        "@harnessos/oa-ask": "workspace:*",
        "@harnessos/oa-web-access": "workspace:*",
        marked: "15.0.12",
      }),
    ).toEqual({ marked: "15.0.12" });
    expect(() =>
      omitBundledServerWorkspaceDependencies({ "@harnessos/future-runtime": "workspace:*" }),
    ).toThrow("not proven to be bundled");
  });
});
