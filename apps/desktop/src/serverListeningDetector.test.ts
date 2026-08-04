import { describe, expect, it } from "vitest";

import { ServerListeningDetector } from "./serverListeningDetector";

describe("ServerListeningDetector", () => {
  it("resolves when the backend logs its listening line", async () => {
    const detector = new ServerListeningDetector();

    detector.push("OmniMind running { port: 3773 }\n");

    await expect(detector.promise).resolves.toBeUndefined();
  });

  it("resolves when the listening line arrives across multiple chunks", async () => {
    const detector = new ServerListeningDetector();

    detector.push("OmniMind run");
    detector.push("ning { port: 3773 }\n");

    await expect(detector.promise).resolves.toBeUndefined();
  });

  it("rejects when the detector is failed before readiness", async () => {
    const detector = new ServerListeningDetector();

    detector.fail(new Error("backend exited"));

    await expect(detector.promise).rejects.toThrow("backend exited");
  });
});
