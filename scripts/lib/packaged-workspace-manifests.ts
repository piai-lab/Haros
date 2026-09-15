// FILE: packaged-workspace-manifests.ts
// Purpose: Single source for workspace importers copied into packaged verification/staging roots.
// Layer: Desktop packaging helper

export const PACKAGED_WORKSPACE_MANIFEST_PATHS = [
  "package.json",
  "apps/server/package.json",
  "apps/desktop/package.json",
  "apps/web/package.json",
  "packages/contracts/package.json",
  "packages/shared/package.json",
  "scripts/package.json",
] as const;

export const PACKAGED_LOCKFILE_PATH = "bun.lock";
export const PACKAGED_PATCHES_PATH = "patches";

export interface BundledWorkspaceComponent {
  readonly name: string;
  readonly manifestPath: string;
  readonly runtimePath: string;
  readonly includeInLegalClosure: boolean;
}

export const SERVER_BUNDLED_WORKSPACE_COMPONENTS: readonly BundledWorkspaceComponent[] = [];

const SERVER_BUNDLED_WORKSPACE_DEPENDENCY_NAMES = new Set<string>(
  SERVER_BUNDLED_WORKSPACE_COMPONENTS.map((component) => component.name),
);

export function omitBundledServerWorkspaceDependencies(
  dependencies: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(dependencies).filter(([name, version]) => {
      if (typeof version !== "string" || !version.startsWith("workspace:")) return true;
      if (!SERVER_BUNDLED_WORKSPACE_DEPENDENCY_NAMES.has(name)) {
        throw new Error(`Server workspace dependency '${name}' is not proven to be bundled.`);
      }
      return false;
    }),
  );
}
