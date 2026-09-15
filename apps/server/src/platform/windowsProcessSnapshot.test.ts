import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import { createPowerShellProcessSnapshotWorker } from "./windowsProcessSnapshot";

function createWorkerHarness() {
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: vi.fn(() => true),
  });
  const worker = createPowerShellProcessSnapshotWorker({
    spawnProcess: () => child as unknown as ChildProcessWithoutNullStreams,
  });
  return { child, worker };
}

function row(pid: number, ppid: number, command: string): string {
  return `${pid}\t${ppid}\t20260901090000\t${Buffer.from(command).toString("base64")}`;
}

describe("Windows process snapshot worker", () => {
  it("excludes System Idle Process without discarding real processes or poisoning later snapshots", async () => {
    const { child, worker } = createWorkerHarness();
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const captured = worker.capture();
        child.stdout.write(
          [
            "@snapshot",
            row(0, 0, "System Idle Process"),
            row(4, 0, "System"),
            row(123, 4, "codex.exe\t--测试"),
            "@end",
            "",
          ].join("\r\n"),
        );
        await expect(captured).resolves.toEqual(
          new Map([
            [0, [{ pid: 4, command: "System", startedAt: "20260901090000" }]],
            [4, [{ pid: 123, command: "codex.exe\t--测试", startedAt: "20260901090000" }]],
          ]),
        );
      }
      expect(child.kill).not.toHaveBeenCalled();
    } finally {
      worker.dispose();
    }
  });

  it.each([
    row(-1, 0, "invalid"),
    row(1, -1, "invalid"),
    row(0, 4, "invalid"),
    "0\t0\t!invalid-base64!",
    "\t0\tU3lzdGVt",
  ])(
    "rejects malformed process rows instead of proving an incomplete tree: %s",
    async (invalid) => {
      const { child, worker } = createWorkerHarness();
      try {
        const captured = worker.capture();
        child.stdout.write(`@snapshot\n${invalid}\n@end\n`);
        await expect(captured).rejects.toThrow("malformed process row");
        expect(child.kill).toHaveBeenCalledOnce();
      } finally {
        worker.dispose();
      }
    },
  );
});
