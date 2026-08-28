// FILE: oaRuntime.ts
// Purpose: Owns the bundled OA Engine runtime loader and fixed HarnessOS-private state root.
// Layer: Server provider runtime

import { constants as fsConstants, lstatSync, realpathSync } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelConfigReader } from "@harnessos/oa-runtime";

import { lazyModule } from "../lazyModule.ts";

export type OARuntimeModule = typeof import("@harnessos/oa-runtime");

// Keep this lazy because the SDK includes native modules that should not load at
// Server startup. The package is rebuilt from the same pinned source; this
// product-owned package now publishes its exact enhanced types, so this loader
// does not cast through the stock module or maintain a parallel API description.
export const loadOARuntimeModule: () => Promise<OARuntimeModule> = lazyModule(
  () => import("@harnessos/oa-runtime"),
);

const MAX_PRIVATE_RUNTIME_FILE_BYTES = 4 * 1024 * 1024;
const PRIVATE_RUNTIME_READ_CHUNK_BYTES = 64 * 1024;
export type OAPrivateRuntimeFilename = "auth.json" | "models.json" | "models-store.json";

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
    throw new Error("OA state isolation could not be verified");
  }
}

export function resolveOAAgentDir(serverBaseDir: string): string {
  const resolvedBaseDir = path.resolve(serverBaseDir);
  const canonicalHomeDir = realpathSync.native(os.homedir());
  const lexicalStockPiDir = path.join(canonicalHomeDir, ".pi");
  if (isWithinPhysicalRoot(resolvedBaseDir, lexicalStockPiDir)) {
    throw new Error("OA state must be physically separate from stock Pi state");
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
    throw new Error("OA state must be physically separate from stock Pi state");
  }

  try {
    const metadata = lstatSync(agentDir);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new Error("OA state root is not a private directory");
    }
    const canonicalAgentDir = realpathSync.native(agentDir);
    if (
      canonicalAgentDir !== agentDir ||
      !canonicalAgentDir.startsWith(`${canonicalBaseDir}${path.sep}`)
    ) {
      throw new Error("OA state root escapes its private directory");
    }
    for (const filename of ["auth.json", "models.json", "models-store.json"]) {
      const filePath = path.join(canonicalAgentDir, filename);
      try {
        const fileMetadata = lstatSync(filePath);
        if (fileMetadata.isSymbolicLink() || !fileMetadata.isFile() || fileMetadata.nlink !== 1) {
          throw new Error("OA state contains a non-private runtime file");
        }
        if (path.dirname(realpathSync.native(filePath)) !== canonicalAgentDir) {
          throw new Error("OA runtime file escapes its private directory");
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

function sameFileIdentity(
  left: Pick<Awaited<ReturnType<typeof lstat>>, "dev" | "ino">,
  right: Pick<Awaited<ReturnType<typeof lstat>>, "dev" | "ino">,
): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

type OAPrivateFileIdentity = Pick<Awaited<ReturnType<typeof lstat>>, "dev" | "ino">;

async function readOAPrivateTextFileWithIdentity(input: {
  readonly agentDir: string;
  readonly filename: OAPrivateRuntimeFilename;
  readonly signal?: AbortSignal;
}): Promise<{ readonly content: string; readonly identity: OAPrivateFileIdentity }> {
  input.signal?.throwIfAborted();
  const expectedAgentDir = path.resolve(input.agentDir);
  const rootBefore = await lstat(expectedAgentDir);
  if (rootBefore.isSymbolicLink() || !rootBefore.isDirectory()) {
    throw new Error("OA state root is not a private directory");
  }
  const physicalAgentDir = await realpath(expectedAgentDir);

  const filePath = path.join(expectedAgentDir, input.filename);
  if (path.dirname(filePath) !== expectedAgentDir) {
    throw new Error("OA state read escaped its private directory");
  }
  const leafBefore = await lstat(filePath);
  if (leafBefore.isSymbolicLink() || !leafBefore.isFile() || leafBefore.nlink !== 1) {
    throw new Error("OA state is not a private regular file");
  }
  const physicalPath = await realpath(filePath);
  if (
    canonicalPathForComparison(path.dirname(physicalPath)) !==
    canonicalPathForComparison(physicalAgentDir)
  ) {
    throw new Error("OA state escaped its private directory");
  }

  const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
  const handle = await open(filePath, flags);
  try {
    const handleMetadata = await handle.stat();
    if (
      !handleMetadata.isFile() ||
      !sameFileIdentity(handleMetadata, leafBefore) ||
      handleMetadata.nlink !== 1 ||
      handleMetadata.size > MAX_PRIVATE_RUNTIME_FILE_BYTES
    ) {
      throw new Error("OA state changed or exceeds the safe read boundary");
    }

    const chunks: Uint8Array[] = [];
    let bytesRead = 0;
    while (bytesRead <= MAX_PRIVATE_RUNTIME_FILE_BYTES) {
      input.signal?.throwIfAborted();
      const remaining = MAX_PRIVATE_RUNTIME_FILE_BYTES + 1 - bytesRead;
      const chunk = new Uint8Array(Math.min(PRIVATE_RUNTIME_READ_CHUNK_BYTES, remaining));
      const read = await handle.read(chunk, 0, chunk.byteLength, bytesRead);
      if (read.bytesRead === 0) break;
      chunks.push(chunk.subarray(0, read.bytesRead));
      bytesRead += read.bytesRead;
    }
    if (bytesRead > MAX_PRIVATE_RUNTIME_FILE_BYTES) {
      throw new Error("OA state exceeds the safe read boundary");
    }
    input.signal?.throwIfAborted();

    const leafAfter = await lstat(filePath);
    const rootAfter = await lstat(expectedAgentDir);
    if (
      leafAfter.isSymbolicLink() ||
      !leafAfter.isFile() ||
      leafAfter.nlink !== 1 ||
      !sameFileIdentity(leafAfter, handleMetadata) ||
      rootAfter.isSymbolicLink() ||
      !rootAfter.isDirectory() ||
      !sameFileIdentity(rootAfter, rootBefore) ||
      canonicalPathForComparison(await realpath(expectedAgentDir)) !==
        canonicalPathForComparison(physicalAgentDir) ||
      canonicalPathForComparison(path.dirname(await realpath(filePath))) !==
        canonicalPathForComparison(physicalAgentDir)
    ) {
      throw new Error("OA state changed during the safe read");
    }

    const content = new Uint8Array(bytesRead);
    let offset = 0;
    for (const chunk of chunks) {
      content.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      content: new TextDecoder("utf-8", { fatal: true }).decode(content),
      identity: { dev: handleMetadata.dev, ino: handleMetadata.ino },
    };
  } finally {
    await handle.close();
  }
}

/**
 * Reads one fixed OA state leaf without following links or copying
 * secret-bearing bytes to a second path. Parsing remains the caller's owner.
 */
export async function readOAPrivateTextFile(input: {
  readonly agentDir: string;
  readonly filename: OAPrivateRuntimeFilename;
  readonly signal?: AbortSignal;
}): Promise<string> {
  return (await readOAPrivateTextFileWithIdentity(input)).content;
}

export function createOAModelsConfigReader(agentDir: string): ModelConfigReader {
  let observedIdentity: OAPrivateFileIdentity | undefined;
  return async ({ signal }) => {
    signal?.throwIfAborted();
    const modelsPath = path.join(path.resolve(agentDir), "models.json");
    try {
      const currentIdentity = await lstat(modelsPath);
      if (observedIdentity && !sameFileIdentity(currentIdentity, observedIdentity)) {
        throw new Error("OA state changed during the safe read");
      }
    } catch (error) {
      if (isMissingPathError(error) && !observedIdentity) return undefined;
      if (isMissingPathError(error)) {
        throw new Error("OA state changed during the safe read");
      }
      throw error;
    }

    try {
      const result = await readOAPrivateTextFileWithIdentity({
        agentDir,
        filename: "models.json",
        ...(signal ? { signal } : {}),
      });
      if (observedIdentity && !sameFileIdentity(result.identity, observedIdentity)) {
        throw new Error("OA state changed during the safe read");
      }
      observedIdentity ??= result.identity;
      return result.content;
    } catch (error) {
      if (isMissingPathError(error)) {
        throw new Error("OA state changed during the safe read");
      }
      throw error;
    }
  };
}
