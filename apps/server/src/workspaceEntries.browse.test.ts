import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { WINDOWS_COMPUTER_ROOT } from "@harnessos/shared/path";

import { browseWorkspaceEntries, windowsDriveExists } from "./workspaceEntries";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

describe("browseWorkspaceEntries", () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("lists directories under a trailing-separator path", async () => {
    const cwd = makeTempDir("harnessos-browse-");
    fs.mkdirSync(path.join(cwd, "alpha"));
    fs.mkdirSync(path.join(cwd, "beta"));
    const partialPath = cwd.endsWith(path.sep) ? cwd : `${cwd}${path.sep}`;

    const result = await browseWorkspaceEntries({ partialPath });

    expect(result.entries.map((entry) => entry.name)).toEqual(["alpha", "beta"]);
  });

  it("lists Windows drives from This PC, and refuses that target elsewhere", async () => {
    if (process.platform !== "win32") {
      await expect(browseWorkspaceEntries({ partialPath: WINDOWS_COMPUTER_ROOT })).rejects.toThrow(
        "Windows-style paths are only supported on Windows.",
      );
      return;
    }

    const result = await browseWorkspaceEntries({ partialPath: WINDOWS_COMPUTER_ROOT });
    expect(result.parentPath).toBe(WINDOWS_COMPUTER_ROOT);
    expect(result.entries.some((entry) => entry.name === "C:" && entry.fullPath === "C:\\")).toBe(
      true,
    );
  });

  it("times out a hung Windows drive probe", async () => {
    const probe = () => new Promise<unknown>(() => {});
    await expect(windowsDriveExists("Z:\\", { timeoutMs: 20, probe })).resolves.toBe(false);
  });

  it("swallows a late Windows drive probe rejection after timeout", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);
    let lateReject!: (reason: Error) => void;
    try {
      const probe = () =>
        new Promise<unknown>((_resolve, reject) => {
          lateReject = reject;
        });
      await expect(windowsDriveExists("Z:\\", { timeoutMs: 5, probe })).resolves.toBe(false);
      lateReject(new Error("drive went away"));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
