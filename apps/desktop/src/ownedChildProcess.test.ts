import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

const childProcess = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: childProcess.spawn }));
vi.mock("@harnessos/shared/windowsProcess", () => ({
  prepareWindowsSafeProcess: (command: string, args: readonly string[]) => ({
    command,
    args,
    shell: false,
    windowsHide: true,
    windowsVerbatimArguments: false,
  }),
  resolveWindowsSystemRoot: () => "C:\\Windows",
}));

import { terminateDesktopOwnedChild } from "./ownedChildProcess";

describe("terminateDesktopOwnedChild", () => {
  let killer: EventEmitter & { unref: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    killer = Object.assign(new EventEmitter(), { unref: vi.fn() });
    childProcess.spawn.mockReturnValue(killer);
  });

  it("uses direct child signaling outside Windows", () => {
    const child = { pid: 42, kill: vi.fn() };

    terminateDesktopOwnedChild(child as never, "SIGTERM", "darwin");

    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(childProcess.spawn).not.toHaveBeenCalled();
  });

  it("uses shell-free taskkill for the live Windows process tree", () => {
    const child = { pid: 42, kill: vi.fn() };

    terminateDesktopOwnedChild(child as never, "SIGKILL", "win32");

    expect(childProcess.spawn).toHaveBeenCalledWith(
      "C:\\Windows\\System32\\taskkill.exe",
      ["/pid", "42", "/t", "/f"],
      expect.objectContaining({ shell: false, windowsHide: true }),
    );
    expect(child.kill).not.toHaveBeenCalled();
    expect(killer.unref).toHaveBeenCalledOnce();
  });

  it("falls back to the owned child handle when taskkill cannot run", () => {
    const child = { pid: 42, kill: vi.fn() };

    terminateDesktopOwnedChild(child as never, "SIGTERM", "win32");
    killer.emit("exit", 1);
    killer.emit("error", new Error("spawn failed"));

    expect(child.kill).toHaveBeenCalledOnce();
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });
});
