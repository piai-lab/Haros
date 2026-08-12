// FILE: omnimindAgentRuntime.ts
// Purpose: Owns the bundled OmniMind Agent package loader and fixed private state root.
// Layer: Server provider runtime

import { lstatSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { lazyModule } from "../lazyModule.ts";

export type OmniMindCodingAgentModule = typeof import("@earendil-works/pi-coding-agent");

// The product package is API-compatible with the pinned Pi package. Keep this
// lazy because the SDK includes native modules that should not load at Server startup.
export const loadOmniMindCodingAgentModule: () => Promise<OmniMindCodingAgentModule> = lazyModule(
  () => import("@omnimind/pi-coding-agent") as unknown as Promise<OmniMindCodingAgentModule>,
);

function isMissingPathError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function canonicalPathForComparison(value: string): string {
  return process.platform === "win32" ? value.toLocaleLowerCase("en-US") : value;
}

function isWithinPhysicalRoot(candidate: string, root: string): boolean {
  const comparableCandidate = canonicalPathForComparison(candidate);
  const comparableRoot = canonicalPathForComparison(root);
  const relative = path.relative(comparableRoot, comparableCandidate);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

function physicalRootsOverlap(left: string, right: string): boolean {
  return isWithinPhysicalRoot(left, right) || isWithinPhysicalRoot(right, left);
}

function resolveExistingPhysicalPath(value: string): string | null {
  try {
    return realpathSync.native(value);
  } catch (error) {
    if (isMissingPathError(error)) {
      return null;
    }
    throw new Error("OmniMind Agent state isolation could not be verified");
  }
}

export function resolveOmniMindAgentDir(serverBaseDir: string): string {
  const resolvedBaseDir = path.resolve(serverBaseDir);
  const canonicalHomeDir = realpathSync.native(os.homedir());
  const lexicalStockPiDir = path.join(canonicalHomeDir, ".pi");
  if (isWithinPhysicalRoot(resolvedBaseDir, lexicalStockPiDir)) {
    throw new Error("OmniMind Agent state must be physically separate from stock Pi state");
  }
  const canonicalBaseDir = realpathSync.native(resolvedBaseDir);
  const physicalStockPiDir = resolveExistingPhysicalPath(lexicalStockPiDir);
  const agentDir = path.join(canonicalBaseDir, "agent");
  if (
    isWithinPhysicalRoot(canonicalBaseDir, lexicalStockPiDir) ||
    (physicalStockPiDir !== null &&
      (isWithinPhysicalRoot(canonicalBaseDir, physicalStockPiDir) ||
        physicalRootsOverlap(agentDir, physicalStockPiDir)))
  ) {
    throw new Error("OmniMind Agent state must be physically separate from stock Pi state");
  }

  try {
    const metadata = lstatSync(agentDir);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new Error("OmniMind Agent state root is not a private directory");
    }
    const canonicalAgentDir = realpathSync.native(agentDir);
    if (
      canonicalAgentDir !== agentDir ||
      !canonicalAgentDir.startsWith(`${canonicalBaseDir}${path.sep}`)
    ) {
      throw new Error("OmniMind Agent state root escapes its private directory");
    }
    for (const filename of ["auth.json", "models.json", "models-store.json"]) {
      const filePath = path.join(canonicalAgentDir, filename);
      try {
        const fileMetadata = lstatSync(filePath);
        if (fileMetadata.isSymbolicLink() || !fileMetadata.isFile() || fileMetadata.nlink !== 1) {
          throw new Error("OmniMind Agent state contains a non-private runtime file");
        }
        if (path.dirname(realpathSync.native(filePath)) !== canonicalAgentDir) {
          throw new Error("OmniMind Agent runtime file escapes its private directory");
        }
      } catch (error) {
        if (!isMissingPathError(error)) {
          throw error;
        }
      }
    }
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }
  }
  return agentDir;
}
