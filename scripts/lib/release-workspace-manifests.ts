// FILE: release-workspace-manifests.ts
// Purpose: Single source for workspace importers copied into release verification/staging roots.
// Layer: Release/build helper

export const RELEASE_WORKSPACE_MANIFEST_PATHS = [
  "package.json",
  "apps/server/package.json",
  "apps/desktop/package.json",
  "apps/web/package.json",
  "packages/contracts/package.json",
  // Keep the Ask fork importer available while Bun reconstructs the frozen
  // workspace. Server tsdown owns the shipped runtime bytes via noExternal.
  "packages/om-ask/package.json",
  "packages/om-web-access/package.json",
  "packages/shared/package.json",
  "scripts/package.json",
] as const;

export const RELEASE_LOCKFILE_PATH = "bun.lock";
export const RELEASE_PATCHES_PATH = "patches";
export const OMNIMIND_PI_RUNTIME_PACKAGE_PATH =
  "vendor/omnimind-pi-coding-agent-0.84.2.tgz";

const SERVER_BUNDLED_WORKSPACE_DEPENDENCIES = new Set([
  "@omnimind/om-ask",
  "@omnimind/om-web-access",
]);

export function omitBundledServerWorkspaceDependencies(
  dependencies: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(dependencies).filter(([name, version]) => {
      if (typeof version !== "string" || !version.startsWith("workspace:")) return true;
      if (!SERVER_BUNDLED_WORKSPACE_DEPENDENCIES.has(name)) {
        throw new Error(`Server workspace dependency '${name}' is not proven to be bundled.`);
      }
      return false;
    }),
  );
}
