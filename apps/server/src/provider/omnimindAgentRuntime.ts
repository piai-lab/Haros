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

export function resolveOmniMindAgentDir(serverBaseDir: string): string {
  const resolvedBaseDir = path.resolve(serverBaseDir);
  const canonicalHomeDir = realpathSync.native(os.homedir());
  const stockPiDir = path.join(canonicalHomeDir, ".pi");
  if (resolvedBaseDir === stockPiDir || resolvedBaseDir.startsWith(`${stockPiDir}${path.sep}`)) {
    throw new Error("OmniMind Agent state must be physically separate from stock Pi state");
  }
  const canonicalBaseDir = realpathSync.native(resolvedBaseDir);
  if (canonicalBaseDir === stockPiDir || canonicalBaseDir.startsWith(`${stockPiDir}${path.sep}`)) {
    throw new Error("OmniMind Agent state must be physically separate from stock Pi state");
  }

  const agentDir = path.join(canonicalBaseDir, "agent");
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
        if (
          typeof error !== "object" ||
          error === null ||
          !("code" in error) ||
          error.code !== "ENOENT"
        ) {
          throw error;
        }
      }
    }
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
  return agentDir;
}
