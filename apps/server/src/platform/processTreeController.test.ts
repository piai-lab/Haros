import { describe, expect, it } from "vitest";

import {
  captureProcessTree,
  createProcessTreeKiller,
  inspectProcessTree,
  terminateProcessTree,
  type ProcessChildrenMap,
} from "./processTreeController";

function windowsTree(): ProcessChildrenMap {
  return new Map([
    [
      100,
      [{ pid: 101, command: "owned-child.exe --serve", startedAt: "20260901100000.000000+000" }],
    ],
    [101, [{ pid: 102, command: "owned-grandchild.exe", startedAt: "20260901100001.000000+000" }]],
  ]);
}

describe("Windows process-tree controller", () => {
  it("captures child and grandchild identities from one platform snapshot", async () => {
    await expect(
      captureProcessTree(100, {
        platform: "win32",
        captureWindowsChildren: async () => windowsTree(),
      }),
    ).resolves.toEqual({
      captureComplete: true,
      descendants: [
        { pid: 101, command: "owned-child.exe --serve", startedAt: "20260901100000.000000+000" },
        { pid: 102, command: "owned-grandchild.exe", startedAt: "20260901100001.000000+000" },
      ],
    });
  });

  it("captures process trees larger than the former traversal cap", async () => {
    const childrenByParentPid: ProcessChildrenMap = new Map();
    for (let pid = 100; pid < 400; pid += 1) {
      childrenByParentPid.set(pid, [{ pid: pid + 1, command: `worker-${pid + 1}` }]);
    }

    const captured = await captureProcessTree(100, {
      platform: "win32",
      captureWindowsChildren: async () => childrenByParentPid,
    });

    expect(captured.captureComplete).toBe(true);
    expect(captured.descendants).toHaveLength(300);
    expect(captured.descendants.at(-1)).toEqual({ pid: 400, command: "worker-400" });
  });

  it("treats a failed Windows snapshot as unknown, never an empty proven tree", async () => {
    const captured = await captureProcessTree(100, {
      platform: "win32",
      captureWindowsChildren: async () => null,
    });

    expect(captured).toEqual({ descendants: [], captureComplete: false });
    await expect(
      inspectProcessTree(captured, {
        platform: "win32",
        captureWindowsChildren: async () => new Map(),
      }),
    ).resolves.toEqual({ verified: false, survivors: [] });
  });

  it("rejects a reused Windows PID when the creation identity changed", async () => {
    const tree = await captureProcessTree(100, {
      platform: "win32",
      captureWindowsChildren: async () => windowsTree(),
    });
    const reused: ProcessChildrenMap = new Map([
      [
        900,
        [
          {
            pid: 101,
            command: "owned-child.exe --serve",
            startedAt: "20260901110000.000000+000",
          },
        ],
      ],
    ]);

    await expect(
      inspectProcessTree(tree, {
        platform: "win32",
        captureWindowsChildren: async () => reused,
      }),
    ).resolves.toEqual({ verified: true, survivors: [] });
  });

  it("reports only descendants whose command and creation identity still match", async () => {
    const tree = await captureProcessTree(100, {
      platform: "win32",
      captureWindowsChildren: async () => windowsTree(),
    });
    const current: ProcessChildrenMap = new Map([
      [
        900,
        [{ pid: 102, command: "owned-grandchild.exe", startedAt: "20260901100001.000000+000" }],
      ],
    ]);

    await expect(
      inspectProcessTree(tree, {
        platform: "win32",
        captureWindowsChildren: async () => current,
      }),
    ).resolves.toEqual({
      verified: true,
      survivors: [
        { pid: 102, command: "owned-grandchild.exe", startedAt: "20260901100001.000000+000" },
      ],
    });
  });

  it("force-signals identity-verified descendants without a POSIX command lookup", () => {
    const signalled: Array<{ pid: number; signal: "SIGTERM" | "SIGKILL" }> = [];
    let commandLookups = 0;
    const killer = createProcessTreeKiller({
      captureChildrenMap: () => new Map(),
      readCurrentCommands: () => {
        commandLookups += 1;
        return null;
      },
      signalPid: (pid, signal) => {
        signalled.push({ pid, signal });
        return null;
      },
      signalTree: (_rootPid, _signal, callback) => callback(),
    });

    killer.signal({
      rootPid: 100,
      signal: "SIGKILL",
      tree: {
        captureComplete: true,
        descendants: [
          { pid: 101, command: "owned-child.exe", startedAt: "20260901100000.000000+000" },
          { pid: 102, command: "owned-grandchild.exe", startedAt: "20260901100001.000000+000" },
        ],
      },
      verifiedDescendants: true,
      includeRootTree: false,
      onError: () => undefined,
    });

    expect(commandLookups).toBe(0);
    expect(signalled).toEqual([
      { pid: 102, signal: "SIGKILL" },
      { pid: 101, signal: "SIGKILL" },
    ]);
  });

  it("does not force unverified descendants when identity lookup is unavailable", () => {
    const signalled: number[] = [];
    let commandLookups = 0;
    const killer = createProcessTreeKiller({
      captureChildrenMap: () => new Map(),
      readCurrentCommands: () => {
        commandLookups += 1;
        return null;
      },
      signalPid: (pid) => {
        signalled.push(pid);
        return null;
      },
      signalTree: (_rootPid, _signal, callback) => callback(),
    });

    killer.signal({
      rootPid: 100,
      signal: "SIGKILL",
      tree: {
        captureComplete: true,
        descendants: [{ pid: 101, command: "owned-child.exe" }],
      },
      includeRootTree: false,
      onError: () => undefined,
    });

    expect(commandLookups).toBe(1);
    expect(signalled).toEqual([]);
  });

  it("does not finish Windows teardown on root exit while an owned descendant survives", async () => {
    const signalled: Array<{ pid: number; signal: "SIGTERM" | "SIGKILL" }> = [];
    const treeSignals: Array<{ pid: number; signal: "SIGTERM" | "SIGKILL" }> = [];
    const snapshots = [windowsTree(), windowsTree(), new Map()] as const;
    let snapshotIndex = 0;
    let rootExited = false;
    const killer = createProcessTreeKiller({
      signalPid: (pid, signal) => {
        signalled.push({ pid, signal });
        return null;
      },
      signalTree: (pid, signal, callback) => {
        treeSignals.push({ pid, signal });
        callback();
      },
    });

    const result = await terminateProcessTree(100, {
      platform: "win32",
      captureWindowsChildren: async () => snapshots[Math.min(snapshotIndex++, 2)]!,
      processTreeKiller: killer,
      rootExited: () => rootExited,
      signalRoot: (signal) => {
        if (signal === "SIGTERM") rootExited = true;
      },
      graceMs: 0,
      timeoutMs: 100,
      pollIntervalMs: 10,
    });

    expect(result).toEqual({ verified: true, survivors: [], rootExited: true, forced: true });
    expect(treeSignals).toEqual([{ pid: 100, signal: "SIGTERM" }]);
    expect(signalled).toContainEqual({ pid: 102, signal: "SIGKILL" });
    expect(signalled).toContainEqual({ pid: 101, signal: "SIGKILL" });
  });

  it("reports snapshot failure as unverified even after the root exits", async () => {
    let rootExited = false;
    const killer = createProcessTreeKiller({
      signalTree: (_pid, _signal, callback) => callback(),
    });

    const result = await terminateProcessTree(100, {
      platform: "win32",
      captureWindowsChildren: async () => null,
      processTreeKiller: killer,
      rootExited: () => rootExited,
      signalRoot: () => {
        rootExited = true;
      },
      graceMs: 0,
      timeoutMs: 20,
      pollIntervalMs: 10,
    });

    expect(result).toMatchObject({ verified: false, rootExited: true });
  });
});
