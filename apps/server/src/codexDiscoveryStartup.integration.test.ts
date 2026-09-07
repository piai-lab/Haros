import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CodexAppServerManager } from "./codexAppServerManager";

// Exercise discovery startup and its real JSON-RPC transport without launching
// Codex or reading the user's private Engine configuration.
vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  spawn: vi.fn(),
}));
vi.mock("./codexProcessEnv.ts", () => ({
  buildCodexProcessEnv: vi.fn(async () => ({})),
}));

class FakeCodexChild extends EventEmitter {
  readonly pid = 42424;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  killed = false;
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();

  constructor(initializeError?: string) {
    super();
    this.stdin.setEncoding("utf8");
    this.stdin.on("data", (line: string) => {
      const request = JSON.parse(line) as { id?: number; method: string };
      if (request.id === undefined) return;
      const response =
        request.method === "initialize" && initializeError
          ? { id: request.id, error: { code: -32000, message: initializeError } }
          : { id: request.id, result: request.method === "model/list" ? { data: [] } : {} };
      queueMicrotask(() => this.stdout.write(`${JSON.stringify(response)}\n`));
    });
  }
}

afterEach(() => vi.restoreAllMocks());

describe("Codex model discovery startup failures", () => {
  it.each([false, true])(
    "preserves initialization diagnostics and recovers on retry (cleanup fails: %s)",
    async (cleanupFails) => {
      const diagnostic = "test Codex configuration could not initialize";
      const cleanupFailure = new Error("descendant state could not be verified");
      const teardownProcessTree = vi.fn(async () => ({ escalated: false, signalErrors: [] }));
      if (cleanupFails) teardownProcessTree.mockRejectedValueOnce(cleanupFailure);
      const manager = new CodexAppServerManager(undefined, { teardownProcessTree });
      const internals = manager as unknown as {
        assertSupportedCodexCliVersion: () => Promise<void>;
        registerHarosSkillsRoot: () => Promise<void>;
        discoverySessions: Map<string, { stopping: boolean }>;
        discoverySessionStartups: Map<string, unknown>;
      };
      vi.spyOn(internals, "assertSupportedCodexCliVersion").mockResolvedValue(undefined);
      vi.spyOn(internals, "registerHarosSkillsRoot").mockResolvedValue(undefined);
      vi.mocked(spawn)
        .mockReset()
        .mockReturnValueOnce(
          new FakeCodexChild(diagnostic) as unknown as ChildProcessWithoutNullStreams,
        )
        .mockImplementation(
          () => new FakeCodexChild() as unknown as ChildProcessWithoutNullStreams,
        );

      try {
        const failure: unknown = await manager.listModels().catch((error: unknown) => error);
        expect(failure).toBeInstanceOf(Error);
        expect((failure as Error).message).toContain(diagnostic);
        expect(internals.discoverySessionStartups.size).toBe(0);
        if (cleanupFails) {
          expect((failure as Error).message).toContain(cleanupFailure.message);
          const causes = (failure as Error).cause as AggregateError;
          expect(causes).toBeInstanceOf(AggregateError);
          expect(causes.errors[0].message).toContain(diagnostic);
          expect(causes.errors[1].cause).toBe(cleanupFailure);
          expect([...internals.discoverySessions.values()]).toEqual([
            expect.objectContaining({ stopping: true }),
          ]);

          // A still-unverified old process must block replacement, even on retry.
          teardownProcessTree.mockRejectedValueOnce(cleanupFailure);
          await expect(manager.listModels()).rejects.toThrow(cleanupFailure.message);
          expect(spawn).toHaveBeenCalledOnce();
        } else {
          expect(internals.discoverySessions.size).toBe(0);
        }

        await expect(manager.listModels()).resolves.toMatchObject({
          models: [],
          source: "codex-app-server",
          cached: false,
        });
        expect(spawn).toHaveBeenCalledTimes(2);
      } finally {
        await manager.stopAll();
      }
    },
  );
});
