import { chmod, lstat, mkdtemp, mkdir, readdir, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createOpenCodeChatScratch, initializeOpenCodeChatScratchBase } from "./chatScratch";

describe("OpenCode Chat scratch", () => {
  it("creates an owned 0700 leaf and removes only that leaf", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-test-"));
    const base = path.join(root, "scratch");
    const scratch = await createOpenCodeChatScratch(base);
    expect((await stat(scratch.directory)).mode & 0o777).toBe(0o700);
    await scratch.close();
    await expect(stat(scratch.directory)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await stat(base)).isDirectory()).toBe(true);
  });

  it("rejects a pre-existing broad-permission base", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-test-"));
    const base = path.join(root, "scratch");
    await mkdir(base, { mode: 0o755 });
    await expect(createOpenCodeChatScratch(base)).rejects.toThrow("not private");
  });

  it("removes a file-backed crash orphan on startup and reopens with an empty base", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-reopen-"));
    const base = await initializeOpenCodeChatScratchBase(stateDir);
    const abandoned = await createOpenCodeChatScratch(base);
    await writeFile(path.join(abandoned.directory, "engine-private-state"), "private\n");

    const reopenedBase = await initializeOpenCodeChatScratchBase(stateDir);
    expect(reopenedBase).toBe(base);
    expect(await readdir(base)).toEqual([]);
    const replacement = await createOpenCodeChatScratch(reopenedBase);
    await replacement.close();
    expect(await readdir(base)).toEqual([]);
  });

  it("does not follow symlinks while removing a validated orphan", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-link-content-"));
    const base = await initializeOpenCodeChatScratchBase(stateDir);
    const abandoned = await createOpenCodeChatScratch(base);
    const outside = path.join(stateDir, "outside-private-state");
    await writeFile(outside, "must survive\n");
    await symlink(outside, path.join(abandoned.directory, "linked-state"));

    await initializeOpenCodeChatScratchBase(stateDir);
    expect(await stat(outside)).toMatchObject({ size: 13 });
    expect(await readdir(base)).toEqual([]);
  });

  it("fails closed on a direct-child symlink before removing a valid orphan", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-link-leaf-"));
    const base = await initializeOpenCodeChatScratchBase(stateDir);
    const abandoned = await createOpenCodeChatScratch(base);
    const outside = path.join(stateDir, "outside");
    await mkdir(outside, { mode: 0o700 });
    await symlink(outside, path.join(base, "00000000-0000-4000-8000-000000000000"));

    await expect(initializeOpenCodeChatScratchBase(stateDir)).rejects.toThrow(
      "not a real directory",
    );
    expect((await lstat(abandoned.directory)).isDirectory()).toBe(true);
    expect((await lstat(outside)).isDirectory()).toBe(true);
  });

  it("fails closed on a foreign direct-child name", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-foreign-"));
    const base = await initializeOpenCodeChatScratchBase(stateDir);
    const foreign = path.join(base, "unrelated-data");
    await mkdir(foreign, { mode: 0o700 });

    await expect(initializeOpenCodeChatScratchBase(stateDir)).rejects.toThrow("foreign entry");
    expect((await lstat(foreign)).isDirectory()).toBe(true);
  });

  it("fails closed on non-private leaf mode", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-mode-"));
    const base = await initializeOpenCodeChatScratchBase(stateDir);
    const abandoned = await createOpenCodeChatScratch(base);
    await chmod(abandoned.directory, 0o750);

    await expect(initializeOpenCodeChatScratchBase(stateDir)).rejects.toThrow("not private");
    expect((await lstat(abandoned.directory)).isDirectory()).toBe(true);
  });

  it("fails closed when the dedicated base resolves outside the state directory", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-base-path-"));
    const outside = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-outside-"));
    await symlink(outside, path.join(stateDir, "opencode-chat"));

    await expect(initializeOpenCodeChatScratchBase(stateDir)).rejects.toThrow(
      "not a real directory",
    );
    expect((await lstat(outside)).isDirectory()).toBe(true);
  });

  it("rejects scratch ownership that does not match the current Service uid", async () => {
    if (typeof process.getuid !== "function") return;
    const stateDir = await mkdtemp(path.join(tmpdir(), "omnimind-opencode-owner-"));
    const actualUid = process.getuid();
    await initializeOpenCodeChatScratchBase(stateDir);
    const uid = vi.spyOn(process, "getuid").mockReturnValue(actualUid + 1);
    try {
      await expect(initializeOpenCodeChatScratchBase(stateDir)).rejects.toThrow("different owner");
    } finally {
      uid.mockRestore();
    }
  });
});
