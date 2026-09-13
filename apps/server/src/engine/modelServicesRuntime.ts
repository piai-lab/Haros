// FILE: modelServicesRuntime.ts
// Purpose: Loads the existing Pi model SDK and bounds model-service configuration reads.
// Layer: Server engine runtime

import { constants as fsConstants, lstatSync, realpathSync } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

import type { ModelConfigReader } from "@earendil-works/pi-coding-agent";

import { lazyModule } from "../lazyModule.ts";

export type ModelServicesSdk = typeof import("@earendil-works/pi-coding-agent");

// Keep this lazy because the SDK includes native modules that should not load at
// Server startup. Model-service configuration uses the same pinned SDK and
// exact types as the Pi adapter; no separate Engine runtime is loaded.
export const loadModelServicesSdk: () => Promise<ModelServicesSdk> = lazyModule(
  () => import("@earendil-works/pi-coding-agent"),
);

const MAX_PRIVATE_RUNTIME_FILE_BYTES = 4 * 1024 * 1024;
const PRIVATE_RUNTIME_READ_CHUNK_BYTES = 64 * 1024;
export type ModelServicesPrivateRuntimeFilename = "auth.json" | "models.json" | "models-store.json";

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
    throw new Error("Model-service configuration isolation could not be verified");
  }
}

function resolvePhysicalPath(value: string): string {
  const existing = resolveExistingPhysicalPath(value);
  if (existing !== null) return existing;
  const parent = path.dirname(value);
  if (parent === value) throw new Error("Model-service configuration root is unavailable");
  return path.join(resolvePhysicalPath(parent), path.basename(value));
}

export function resolveModelServicesAgentDir(requestedDir: string, serverBaseDir: string): string {
  const agentDir = path.resolve(requestedDir);
  const physicalDir = resolvePhysicalPath(agentDir);
  const retiredDir = path.join(path.resolve(serverBaseDir), "agent");
  const physicalRetiredDir = resolvePhysicalPath(retiredDir);
  if (physicalRootsOverlap(physicalDir, physicalRetiredDir)) {
    throw new Error("Model services cannot use retired OA Engine state");
  }
  for (const filename of ["auth.json", "models.json", "models-store.json"]) {
    try {
      const metadata = lstatSync(path.join(physicalDir, filename));
      if (metadata.isSymbolicLink() || !metadata.isFile() || metadata.nlink !== 1) {
        throw new Error("Model-service configuration must use private regular files");
      }
    } catch (error) {
      if (!isMissingPathError(error)) throw error;
    }
  }
  return physicalDir;
}

function sameFileIdentity(
  left: Pick<Awaited<ReturnType<typeof lstat>>, "dev" | "ino">,
  right: Pick<Awaited<ReturnType<typeof lstat>>, "dev" | "ino">,
): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

type ModelServicesPrivateFileIdentity = Pick<Awaited<ReturnType<typeof lstat>>, "dev" | "ino">;

async function readModelServicesPrivateTextFileWithIdentity(input: {
  readonly agentDir: string;
  readonly filename: ModelServicesPrivateRuntimeFilename;
  readonly signal?: AbortSignal;
}): Promise<{ readonly content: string; readonly identity: ModelServicesPrivateFileIdentity }> {
  input.signal?.throwIfAborted();
  const expectedAgentDir = path.resolve(input.agentDir);
  const rootBefore = await lstat(expectedAgentDir);
  if (rootBefore.isSymbolicLink() || !rootBefore.isDirectory()) {
    throw new Error("Model-service configuration root is not a private directory");
  }
  const physicalAgentDir = await realpath(expectedAgentDir);

  const filePath = path.join(expectedAgentDir, input.filename);
  if (path.dirname(filePath) !== expectedAgentDir) {
    throw new Error("Model-service configuration read escaped its private directory");
  }
  const leafBefore = await lstat(filePath);
  if (leafBefore.isSymbolicLink() || !leafBefore.isFile() || leafBefore.nlink !== 1) {
    throw new Error("Model-service configuration is not a private regular file");
  }
  const physicalPath = await realpath(filePath);
  if (
    canonicalPathForComparison(path.dirname(physicalPath)) !==
    canonicalPathForComparison(physicalAgentDir)
  ) {
    throw new Error("Model-service configuration escaped its private directory");
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
      throw new Error("Model-service configuration changed or exceeds the safe read boundary");
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
      throw new Error("Model-service configuration exceeds the safe read boundary");
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
      throw new Error("Model-service configuration changed during the safe read");
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
 * Reads one fixed Model-service configuration leaf without following links or copying
 * secret-bearing bytes to a second path. Parsing remains the caller's owner.
 */
export async function readModelServicesPrivateTextFile(input: {
  readonly agentDir: string;
  readonly filename: ModelServicesPrivateRuntimeFilename;
  readonly signal?: AbortSignal;
}): Promise<string> {
  return (await readModelServicesPrivateTextFileWithIdentity(input)).content;
}

export function createHarosModelsConfigReader(agentDir: string): ModelConfigReader {
  let observedIdentity: ModelServicesPrivateFileIdentity | undefined;
  return async ({ signal }) => {
    signal?.throwIfAborted();
    const modelsPath = path.join(path.resolve(agentDir), "models.json");
    try {
      const currentIdentity = await lstat(modelsPath);
      if (observedIdentity && !sameFileIdentity(currentIdentity, observedIdentity)) {
        throw new Error("Model-service configuration changed during the safe read");
      }
    } catch (error) {
      if (isMissingPathError(error) && !observedIdentity) return undefined;
      if (isMissingPathError(error)) {
        throw new Error("Model-service configuration changed during the safe read");
      }
      throw error;
    }

    try {
      const result = await readModelServicesPrivateTextFileWithIdentity({
        agentDir,
        filename: "models.json",
        ...(signal ? { signal } : {}),
      });
      if (observedIdentity && !sameFileIdentity(result.identity, observedIdentity)) {
        throw new Error("Model-service configuration changed during the safe read");
      }
      observedIdentity ??= result.identity;
      return result.content;
    } catch (error) {
      if (isMissingPathError(error)) {
        throw new Error("Model-service configuration changed during the safe read");
      }
      throw error;
    }
  };
}
