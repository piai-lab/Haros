import { readdirSync } from "node:fs";
import { join } from "node:path";

import type { ElectronBuildPlatform } from "./electron-artifacts.ts";

const BUILDER_DIAGNOSTIC_FILES = new Set(["builder-debug.yml", "builder-effective-config.yaml"]);

export function isBuilderDiagnosticFile(fileName: string): boolean {
  return BUILDER_DIAGNOSTIC_FILES.has(fileName);
}

export function findMacAppBundles(outputDirectory: string): ReadonlyArray<string> {
  const appBundles: string[] = [];
  for (const entry of readdirSync(outputDirectory, { withFileTypes: true })) {
    const candidatePath = join(outputDirectory, entry.name);
    if (entry.isDirectory() && entry.name.endsWith(".app")) {
      appBundles.push(candidatePath);
      continue;
    }
    if (!entry.isDirectory()) continue;
    for (const child of readdirSync(candidatePath, { withFileTypes: true })) {
      if (child.isDirectory() && child.name.endsWith(".app")) {
        appBundles.push(join(candidatePath, child.name));
      }
    }
  }
  return appBundles.toSorted();
}

export function expectedPrimaryArtifactSuffix(
  platform: ElectronBuildPlatform,
  target: string,
): ".dmg" | ".AppImage" | ".exe" | ".app" {
  if (platform === "mac" && target === "dmg") return ".dmg";
  if (platform === "mac" && target === "dir") return ".app";
  if (platform === "linux" && target === "AppImage") return ".AppImage";
  if (platform === "win" && target === "nsis") return ".exe";
  throw new Error(`Unsupported primary desktop artifact target: ${platform}/${target}.`);
}

export function findPrimaryDesktopArtifacts(input: {
  readonly outputDirectory: string;
  readonly platform: ElectronBuildPlatform;
  readonly target: string;
}): ReadonlyArray<string> {
  const suffix = expectedPrimaryArtifactSuffix(input.platform, input.target);
  if (suffix === ".app") return findMacAppBundles(input.outputDirectory);
  return readdirSync(input.outputDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => join(input.outputDirectory, entry.name))
    .toSorted();
}
