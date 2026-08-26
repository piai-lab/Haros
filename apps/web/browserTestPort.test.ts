import { createServer } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { resolveBrowserTestPort } from "./browserTestPort";

const originalPort = process.env.VITEST_BROWSER_API_PORT;

afterEach(() => {
  if (originalPort === undefined) delete process.env.VITEST_BROWSER_API_PORT;
  else process.env.VITEST_BROWSER_API_PORT = originalPort;
});

describe("resolveBrowserTestPort", () => {
  it("derives a stable available port for one worktree and suite", async () => {
    delete process.env.VITEST_BROWSER_API_PORT;
    const first = await resolveBrowserTestPort({ host: "127.0.0.1", suite: "stable" });
    const second = await resolveBrowserTestPort({ host: "127.0.0.1", suite: "stable" });
    expect(second).toBe(first);
  });

  it("fails immediately when an explicit diagnostic port is occupied", async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("Expected a TCP address");
    process.env.VITEST_BROWSER_API_PORT = String(address.port);

    try {
      await expect(resolveBrowserTestPort({ host: "127.0.0.1", suite: "stable" })).rejects.toThrow(
        "already in use",
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });

  it("rejects malformed explicit ports without starting the browser harness", async () => {
    process.env.VITEST_BROWSER_API_PORT = "not-a-port";
    await expect(resolveBrowserTestPort({ host: "127.0.0.1", suite: "geometry" })).rejects.toThrow(
      "must be an integer",
    );
  });
});
