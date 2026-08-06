import { randomUUID } from "node:crypto";
import { lstat, mkdir, readdir, realpath, rm } from "node:fs/promises";
import path from "node:path";

export class OpenCodeScratchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenCodeScratchError";
  }
}

const OPEN_CODE_CHAT_SCRATCH_DIRECTORY = "opencode-chat";
const OPEN_CODE_CHAT_LEAF =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

const assertOwnedPrivateDirectory = async (directory: string): Promise<void> => {
  const metadata = await lstat(directory);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    throw new OpenCodeScratchError("OpenCode scratch path is not a real directory.");
  }
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) {
    throw new OpenCodeScratchError("OpenCode scratch path has a different owner.");
  }
  if ((metadata.mode & 0o777) !== 0o700) {
    throw new OpenCodeScratchError("OpenCode scratch path is not private.");
  }
};

const assertPrivateLeaf = async (directory: string, base: string): Promise<void> => {
  if (!OPEN_CODE_CHAT_LEAF.test(path.basename(directory))) {
    throw new OpenCodeScratchError("OpenCode scratch base contains a foreign entry.");
  }
  await assertOwnedPrivateDirectory(directory);
  const [resolved, parent] = await Promise.all([realpath(directory), realpath(base)]);
  if (path.dirname(resolved) !== parent) {
    throw new OpenCodeScratchError("OpenCode scratch path escaped its private base.");
  }
};

const assertDedicatedBase = async (stateDir: string, base: string): Promise<void> => {
  const expectedBase = path.join(path.resolve(stateDir), OPEN_CODE_CHAT_SCRATCH_DIRECTORY);
  if (path.resolve(base) !== expectedBase) {
    throw new OpenCodeScratchError("OpenCode scratch base is outside its dedicated state path.");
  }
  await assertOwnedPrivateDirectory(base);
  const [resolvedBase, resolvedStateDir] = await Promise.all([realpath(base), realpath(stateDir)]);
  if (
    path.dirname(resolvedBase) !== resolvedStateDir ||
    path.basename(resolvedBase) !== OPEN_CODE_CHAT_SCRATCH_DIRECTORY
  ) {
    throw new OpenCodeScratchError("OpenCode scratch base escaped its dedicated state path.");
  }
};

/**
 * Creates and validates the dedicated base, then removes only validated direct-child orphans.
 * This runs before OpenCode can own a live leaf and is lifecycle hygiene, not a sandbox.
 */
export async function initializeOpenCodeChatScratchBase(stateDir: string): Promise<string> {
  const base = path.join(path.resolve(stateDir), OPEN_CODE_CHAT_SCRATCH_DIRECTORY);
  await mkdir(base, { recursive: true, mode: 0o700 });
  await assertDedicatedBase(stateDir, base);
  const children = await readdir(base);
  const leaves = children.map((child) => path.join(base, child));

  // Validate the complete direct-child set before deleting anything. An unsafe entry leaves the
  // base untouched and prevents the external boundary from starting.
  for (const leaf of leaves) await assertPrivateLeaf(leaf, base);
  for (const leaf of leaves) {
    await assertPrivateLeaf(leaf, base);
    await rm(leaf, { recursive: true });
  }
  return base;
}

export type OpenCodeChatScratch = {
  readonly directory: string;
  readonly close: () => Promise<void>;
};

/** Creates a per-preparation private Chat cwd. This is lifecycle hygiene, not a sandbox. */
export async function createOpenCodeChatScratch(base: string): Promise<OpenCodeChatScratch> {
  await mkdir(base, { recursive: true, mode: 0o700 });
  await assertOwnedPrivateDirectory(base);
  const directory = path.join(base, randomUUID());
  await mkdir(directory, { mode: 0o700 });
  await assertPrivateLeaf(directory, base);
  let closed = false;
  return {
    directory,
    close: async () => {
      if (closed) return;
      closed = true;
      await assertPrivateLeaf(directory, base);
      await rm(directory, { recursive: true });
    },
  };
}
