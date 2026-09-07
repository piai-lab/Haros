import { describe, expect, it } from "vitest";

import { createWindowsProcessSnapshotObserver } from "./windowsProcessSnapshot";

describe.skipIf(process.platform !== "win32")("native Windows process snapshots", () => {
  it("reads and reuses the CIM worker while excluding the system idle record", async () => {
    const observer = createWindowsProcessSnapshotObserver({ probeTimeoutMs: 10_000 });
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const snapshot = await observer.capture();
        expect(snapshot).not.toBeNull();
        const processes = [...snapshot!.values()].flat();
        expect(processes.some((entry) => entry.pid === process.pid)).toBe(true);
        expect(processes.every((entry) => entry.pid > 0)).toBe(true);
        expect(observer.retryDelayMs()).toBe(0);
      }
    } finally {
      observer.dispose();
    }
  });
});
